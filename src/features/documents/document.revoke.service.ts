import { and, eq, inArray } from "drizzle-orm";

import type {
  RevokePrepareInput,
  RevokeSubmitInput,
} from "./document.revoke.model";

import { createChainClient } from "../../chain/client";
import { RegistryClient } from "../../chain/registry.client";
import { reasonCodeToUint8 } from "../../chain/revocations";
import { env } from "../../config";
import { db } from "../../db";
import { batches } from "../../db/schema/batch.schema";
import { revocations } from "../../db/schema/chain.schema";
import { documents } from "../../db/schema/document.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { revocationRelayQueue } from "../../queues/queues/revocation-relay.queue";
import {
  REVOKE_TYPES,
  buildRevokeTypedData,
} from "../../shared/chain/revoke-typed-data";
import { AppError } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface RevokeSubmitResult {
  revocationId: string;
  status: "submitted";
}

type RevokePrepareResult =
  | {
      chainId: number;
      data: `0x${string}`;
      from: string;
      mode: "direct";
      revocationId: string;
      to: string;
    }
  | {
      mode: "signature";
      revocationId: string;
      typedData: ReturnType<typeof buildRevokeTypedData>;
    };

const loadContext = async (
  organizationId: string,
  documentId: string,
  checkExisting = true
) => {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!doc) {
    throw AppError.notFound("Document not found");
  }
  if (doc.status !== "issued") {
    throw AppError.conflict("Only issued documents can be revoked");
  }
  if (!doc.batchId) {
    throw AppError.conflict("Document is not attached to a batch");
  }

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, doc.batchId))
    .limit(1);

  if (!batch || batch.status !== "confirmed") {
    throw AppError.conflict("Batch is not confirmed on-chain");
  }

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(eq(issuerWallets.id, doc.issuerWalletId))
    .limit(1);

  if (!wallet) {
    throw AppError.internal("Issuer wallet missing");
  }

  if (checkExisting) {
    const existing = await db
      .select()
      .from(revocations)
      .where(
        and(
          eq(revocations.documentId, documentId),
          inArray(revocations.status, ["prepared", "submitted", "confirmed"])
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw AppError.conflict(
        "A revocation is already in progress for this document"
      );
    }
  }

  if (!doc.leaf || !doc.merkleProof || !batch.root) {
    throw AppError.internal("Document or batch is missing leaf or root");
  }

  return { batch, doc, wallet };
};

const loadPreparedRevocation = async (
  documentId: string,
  revocationId: string
) => {
  const [revocation] = await db
    .select()
    .from(revocations)
    .where(
      and(
        eq(revocations.id, revocationId),
        eq(revocations.documentId, documentId),
        eq(revocations.status, "prepared")
      )
    )
    .limit(1);

  if (!revocation) {
    throw AppError.notFound("Prepared revocation not found");
  }

  return revocation;
};

const submitDirectTransaction = async (input: {
  chainClient: ReturnType<typeof createChainClient>;
  doc: typeof documents.$inferSelect;
  documentId: string;
  organizationId: string;
  registryAddress: `0x${string}`;
  revocation: typeof revocations.$inferSelect;
  txHash: string;
}): Promise<RevokeSubmitResult> => {
  const registry = new RegistryClient({
    address: input.registryAddress,
    publicClient: input.chainClient.publicClient,
  });

  let receipt;

  try {
    receipt = await registry.getReceipt(input.txHash as `0x${string}`);
  } catch {
    throw AppError.validation("Transaction hash not found on-chain");
  }

  if (receipt.status !== "success") {
    throw AppError.validation("Transaction reverted");
  }

  if (receipt.to?.toLowerCase() !== input.registryAddress.toLowerCase()) {
    throw AppError.validation("Transaction does not target the registry");
  }

  await db
    .update(revocations)
    .set({
      blockNumber: String(receipt.blockNumber),
      status: "submitted",
      txHash: input.txHash,
      updatedAt: new Date(),
    })
    .where(eq(revocations.id, input.revocation.id));

  await AuditService.record({
    action: "document.revoke_submitted",
    actorType: "user",
    metadata: { txHash: input.txHash },
    organizationId: input.organizationId,
    targetId: input.documentId,
    targetType: "document",
  });

  return { revocationId: input.revocation.id, status: "submitted" };
};

const submitSignedRevocation = async (input: {
  batch: typeof batches.$inferSelect;
  chainClient: ReturnType<typeof createChainClient>;
  doc: typeof documents.$inferSelect;
  documentId: string;
  organizationId: string;
  revocation: typeof revocations.$inferSelect;
  signature: string;
  wallet: typeof issuerWallets.$inferSelect;
}): Promise<RevokeSubmitResult> => {
  if (!input.batch.root) {
    throw AppError.internal("Batch is missing root");
  }

  const typedData = buildRevokeTypedData({
    chainId: env.CHAIN_ID,
    issuer: input.wallet.address as `0x${string}`,
    leaf: input.doc.leaf as `0x${string}`,
    reason: reasonCodeToUint8(input.revocation.reasonCode),
    registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
    root: input.batch.root as `0x${string}`,
  });

  const valid = await input.chainClient.publicClient
    .verifyTypedData({
      address: input.wallet.address as `0x${string}`,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: "Revoke",
      signature: input.signature as `0x${string}`,
      types: REVOKE_TYPES,
    })
    .catch(() => false);

  if (!valid) {
    throw AppError.validation("Invalid revocation signature");
  }

  await revocationRelayQueue.add("submit", {
    documentId: input.documentId,
    organizationId: input.organizationId,
    revocationId: input.revocation.id,
    signature: input.signature,
  });

  return { revocationId: input.revocation.id, status: "submitted" };
};

export const DocumentRevokeService = {
  async prepare(
    organizationId: string,
    documentId: string,
    input: RevokePrepareInput
  ): Promise<RevokePrepareResult> {
    if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
      throw AppError.internal("Chain is not configured");
    }

    const { batch, doc, wallet } = await loadContext(
      organizationId,
      documentId
    );
    const reasonUint8 = reasonCodeToUint8(input.reasonCode);

    const [inserted] = await db
      .insert(revocations)
      .values({
        documentId,
        note: input.note ?? null,
        reasonCode: input.reasonCode,
        source: input.mode === "direct" ? "wallet" : "platform",
        status: "prepared",
      })
      .returning();

    if (!inserted) {
      throw AppError.internal("Failed to create revocation");
    }

    if (input.mode === "direct") {
      const chainClient = createChainClient();
      const registry = new RegistryClient({
        address: env.REGISTRY_ADDRESS as `0x${string}`,
        publicClient: chainClient.publicClient,
      });

      const data = registry.encodeRevoke({
        leaf: doc.leaf as `0x${string}`,
        proof: doc.merkleProof as string[] as `0x${string}`[],
        reason: reasonUint8,
        root: batch.root as `0x${string}`,
      });

      return {
        chainId: env.CHAIN_ID,
        data,
        from: wallet.address,
        mode: "direct",
        revocationId: inserted.id,
        to: env.REGISTRY_ADDRESS,
      };
    }

    const typedData = buildRevokeTypedData({
      chainId: env.CHAIN_ID,
      issuer: wallet.address as `0x${string}`,
      leaf: doc.leaf as `0x${string}`,
      reason: reasonUint8,
      registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
      root: batch.root as `0x${string}`,
    });

    return {
      mode: "signature",
      revocationId: inserted.id,
      typedData,
    };
  },

  async submit(
    organizationId: string,
    documentId: string,
    input: RevokeSubmitInput
  ): Promise<RevokeSubmitResult> {
    if (env.REGISTRY_ADDRESS === ZERO_ADDRESS) {
      throw AppError.internal("Chain is not configured");
    }

    const { batch, doc, wallet } = await loadContext(
      organizationId,
      documentId,
      false
    );
    const revocation = await loadPreparedRevocation(
      documentId,
      input.revocationId
    );

    if (input.txHash) {
      return submitDirectTransaction({
        chainClient: createChainClient(),
        doc,
        documentId,
        organizationId,
        registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
        revocation,
        txHash: input.txHash,
      });
    }

    if (input.signature) {
      return submitSignedRevocation({
        batch,
        chainClient: createChainClient(),
        doc,
        documentId,
        organizationId,
        revocation,
        signature: input.signature,
        wallet,
      });
    }

    throw AppError.validation("Either signature or txHash must be provided");
  },
};
