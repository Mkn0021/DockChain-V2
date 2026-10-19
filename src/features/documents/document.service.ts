import { and, eq } from "drizzle-orm";

import type { FieldSchemaJson } from "../templates/template.types";
import type {
  DocumentBulkCreateType,
  DocumentCreateType,
  DocumentUpdateType,
} from "./document.model";

import { env } from "../../config";
import { db } from "../../db";
import { documents } from "../../db/schema/document.schema";
import { organizationSettings } from "../../db/schema/settings.schema";
import { templateVersions } from "../../db/schema/template.schema";
import { issuerWallets } from "../../db/schema/wallet.schema";
import { computeLeaf, randomHolderKey, randomSalt } from "../../shared/crypto";
import { fromUnixSeconds, toDate, toUnixSeconds } from "../../shared/db/date";
import { AppError, isPgUniqueViolation } from "../../shared/errors";
import { AuditService } from "../audit/audit.service";
import { parseCsv, splitCsvRow } from "./document.import";
import {
  createDraftPayload,
  decryptPayload,
  encryptPayload,
  type DocumentPayload,
} from "./document.payload";
import { DocumentRepository } from "./document.repository";
import {
  normalizeFields,
  validateFieldsAgainstSchema,
} from "./document.validation";

interface ResolvedContext {
  fieldSchema: FieldSchemaJson;
  schemaHash: string;
  templateId: string;
  walletId: string;
  walletAddress: string;
}

const resolveContext = async (
  organizationId: string,
  templateVersionId: string,
  walletId?: string
): Promise<ResolvedContext> => {
  const [version] = await db
    .select({
      fieldSchema: templateVersions.fieldSchema,
      id: templateVersions.id,
      schemaHash: templateVersions.schemaHash,
      status: templateVersions.status,
      templateId: templateVersions.templateId,
    })
    .from(templateVersions)
    .where(eq(templateVersions.id, templateVersionId))
    .limit(1);

  if (!version) {
    throw AppError.notFound("Template version not found");
  }
  if (version.status !== "published") {
    throw AppError.conflict(
      "Only published template versions can be used to create documents"
    );
  }
  if (!version.schemaHash) {
    throw AppError.internal("Published version is missing a schema hash");
  }

  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .limit(1);

  const chosenWalletId = walletId ?? settings?.defaultWalletId ?? null;
  if (!chosenWalletId) {
    throw AppError.validation(
      "No issuer wallet provided and no default wallet is configured"
    );
  }

  const [wallet] = await db
    .select()
    .from(issuerWallets)
    .where(
      and(
        eq(issuerWallets.id, chosenWalletId),
        eq(issuerWallets.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!wallet) {
    throw AppError.notFound("Issuer wallet not found");
  }
  if (wallet.status !== "active") {
    throw AppError.validation("Issuer wallet must be active");
  }
  if (settings?.requireVerifiedDomain && !wallet.domainVerifiedAt) {
    throw AppError.validation(
      "This organization requires a verified wallet domain"
    );
  }

  return {
    fieldSchema: version.fieldSchema as FieldSchemaJson,
    schemaHash: version.schemaHash,
    templateId: version.templateId,
    walletAddress: wallet.address,
    walletId: chosenWalletId,
  };
};

const computeLeafForPayload = (
  payload: DocumentPayload,
  schemaHash: string,
  walletAddress: string,
  claimedIssuedAt: number,
  expiresAt: number
): `0x${string}` =>
  computeLeaf({
    chainId: env.CHAIN_ID,
    claimedIssuedAt,
    expiresAt,
    fields: payload.fields,
    issuerAddress: walletAddress as `0x${string}`,
    registryAddress: env.REGISTRY_ADDRESS as `0x${string}`,
    salt: new Uint8Array(Buffer.from(payload.salt, "base64")),
    schemaHash: schemaHash as `0x${string}`,
  });

const buildDocument = async (input: {
  context: ResolvedContext;
  createdBy: string;
  data: DocumentCreateType;
  organizationId: string;
}) => {
  const { context, data } = input;

  validateFieldsAgainstSchema(data.fields, context.fieldSchema);
  const normalized = normalizeFields(data.fields, context.fieldSchema);

  const isReady = data.mode === "ready";
  const claimedIssuedAt = isReady ? Math.floor(Date.now() / 1000) : 0;
  const expiresAtDate = toDate(data.expiresAt);
  const expiresAt = toUnixSeconds(expiresAtDate);

  const built = createDraftPayload({
    fields: normalized,
    recipient: data.recipient ?? null,
    withKeys: isReady,
  });

  const leaf = isReady
    ? computeLeafForPayload(
        built.payload,
        context.schemaHash,
        context.walletAddress,
        claimedIssuedAt,
        expiresAt
      )
    : null;

  const encrypted = await encryptPayload(built.payload);

  return {
    values: {
      batchId: null,
      claimedIssuedAt: fromUnixSeconds(claimedIssuedAt),
      createdBy: input.createdBy,
      expiresAt: expiresAtDate,
      externalRef: data.externalRef ?? null,
      issuerWalletId: context.walletId,
      kekId: encrypted.kekId,
      leaf,
      leafIndex: null,
      merkleProof: null,
      organizationId: input.organizationId,
      payloadEnc: encrypted.payloadEnc,
      status: data.mode,
      templateVersionId: data.templateVersionId,
    },
  };
};

export const DocumentService = {
  async bulkCreate(
    organizationId: string,
    createdBy: string,
    data: DocumentBulkCreateType
  ) {
    const context = await resolveContext(
      organizationId,
      data.templateVersionId,
      data.issuerWalletId
    );

    const errors: { index: number; message: string }[] = [];
    const rowsToInsert: (typeof documents.$inferInsert)[] = [];

    for (const [index, item] of data.items.entries()) {
      try {
        const { values } = await buildDocument({
          context,
          createdBy,
          data: {
            ...item,
            mode: data.mode,
            templateVersionId: data.templateVersionId,
          },
          organizationId,
        });
        rowsToInsert.push(values);
      } catch (error) {
        errors.push({
          index,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (errors.length > 0) {
      throw AppError.validation(
        `Bulk create rejected ${errors.length} item(s): ${JSON.stringify(errors.slice(0, 5))}`
      );
    }

    const created = await db.transaction((tx) =>
      tx.insert(documents).values(rowsToInsert).returning()
    );

    await AuditService.record({
      action: "document.bulk_created",
      actorId: createdBy,
      actorType: "user",
      metadata: { count: created.length },
      organizationId,
      targetType: "document",
    });

    return { created: created.length, documents: created };
  },

  async create(
    organizationId: string,
    createdBy: string,
    data: DocumentCreateType
  ) {
    const context = await resolveContext(
      organizationId,
      data.templateVersionId,
      data.issuerWalletId
    );

    const { values } = await buildDocument({
      context,
      createdBy,
      data,
      organizationId,
    });

    let doc;
    try {
      [doc] = await DocumentRepository.insert(values);
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        throw AppError.conflict(
          "A document with this externalRef already exists"
        );
      }
      throw error;
    }
    if (!doc) {
      throw AppError.internal("Failed to insert document");
    }

    await AuditService.record({
      action: "document.created",
      actorId: createdBy,
      actorType: "user",
      metadata: { mode: data.mode },
      organizationId,
      targetId: doc.id,
      targetType: "document",
    });

    return doc;
  },

  async delete(organizationId: string, documentId: string) {
    const existing = await DocumentRepository.findById(
      organizationId,
      documentId
    );
    if (!existing) {
      throw AppError.notFound("Document not found");
    }
    if (
      existing.status === "batched" ||
      existing.status === "issued" ||
      existing.status === "revoked"
    ) {
      throw AppError.conflict(
        "Documents cannot be deleted once they are batched or issued"
      );
    }

    const deleted = await DocumentRepository.delete(organizationId, documentId);

    await AuditService.record({
      action: "document.deleted",
      actorType: "system",
      organizationId,
      targetId: documentId,
      targetType: "document",
    });

    return deleted;
  },

  async getById(organizationId: string, documentId: string) {
    const doc = await DocumentRepository.findById(organizationId, documentId);
    if (!doc) {
      throw AppError.notFound("Document not found");
    }
    const payload = await decryptPayload(doc.payloadEnc, doc.kekId);
    return { ...doc, fields: payload.fields, recipient: payload.recipient };
  },

  async importCsv(
    organizationId: string,
    createdBy: string,
    input: {
      csv: string;
      issuerWalletId?: string;
      templateVersionId: string;
    }
  ) {
    const context = await resolveContext(
      organizationId,
      input.templateVersionId,
      input.issuerWalletId
    );

    const fieldKeys = new Set(context.fieldSchema.fields.map((f) => f.key));
    const rawRows = parseCsv(input.csv);

    const items = rawRows.map((row) => splitCsvRow(row, fieldKeys));

    const rowsToInsert: (typeof documents.$inferInsert)[] = [];
    const errors: { index: number; message: string }[] = [];

    for (const [index, item] of items.entries()) {
      try {
        const { values } = await buildDocument({
          context,
          createdBy,
          data: {
            expiresAt: item.expiresAt,
            externalRef: item.externalRef,
            fields: item.fields,
            mode: "ready",
            recipient: item.recipient,
            templateVersionId: input.templateVersionId,
          },
          organizationId,
        });
        rowsToInsert.push(values);
      } catch (error) {
        errors.push({
          index,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (errors.length > 0) {
      throw AppError.validation(
        `CSV import rejected ${errors.length} row(s): ${JSON.stringify(errors.slice(0, 5))}`
      );
    }

    const created = await db.transaction((tx) =>
      tx.insert(documents).values(rowsToInsert).returning()
    );

    await AuditService.record({
      action: "document.imported",
      actorId: createdBy,
      actorType: "user",
      metadata: { count: created.length },
      organizationId,
      targetType: "document",
    });

    return { created: created.length, documents: created };
  },

  async list(
    organizationId: string,
    filters: Parameters<typeof DocumentRepository.list>[1]
  ) {
    const { rows, total } = await DocumentRepository.list(
      organizationId,
      filters
    );
    return {
      data: rows,
      meta: { limit: filters.limit, offset: filters.offset, total },
    };
  },

  async update(
    organizationId: string,
    documentId: string,
    data: DocumentUpdateType
  ) {
    const existing = await DocumentRepository.findById(
      organizationId,
      documentId
    );
    if (!existing) {
      throw AppError.notFound("Document not found");
    }
    if (existing.status !== "draft") {
      throw AppError.conflict("Only draft documents can be modified");
    }

    const [version] = await db
      .select({
        fieldSchema: templateVersions.fieldSchema,
        schemaHash: templateVersions.schemaHash,
      })
      .from(templateVersions)
      .where(eq(templateVersions.id, existing.templateVersionId))
      .limit(1);

    if (!version?.schemaHash) {
      throw AppError.internal("Template version is missing a schema hash");
    }

    const fieldSchema = version.fieldSchema as FieldSchemaJson;
    const payload = await decryptPayload(existing.payloadEnc, existing.kekId);

    const nextFields = data.fields
      ? normalizeFields(data.fields, fieldSchema)
      : payload.fields;
    if (data.fields) {
      validateFieldsAgainstSchema(data.fields, fieldSchema);
    }

    const nextRecipient =
      data.recipient === undefined ? payload.recipient : data.recipient;

    const finalize = data.finalize === true;
    const claimedIssuedAt = finalize ? Math.floor(Date.now() / 1000) : 0;

    const nextExpiresAtDate =
      data.expiresAt === undefined
        ? existing.expiresAt
        : toDate(data.expiresAt);

    const expiresAt = toUnixSeconds(nextExpiresAtDate);

    const nextPayload: DocumentPayload = {
      fields: nextFields,
      holderKey: finalize
        ? Buffer.from(randomHolderKey()).toString("base64")
        : payload.holderKey,
      recipient: nextRecipient,
      salt: finalize
        ? Buffer.from(randomSalt()).toString("base64")
        : payload.salt,
    };

    const [wallet] = await db
      .select({ address: issuerWallets.address })
      .from(issuerWallets)
      .where(eq(issuerWallets.id, existing.issuerWalletId))
      .limit(1);
    if (!wallet) {
      throw AppError.internal("Issuer wallet missing");
    }

    const leaf = finalize
      ? computeLeafForPayload(
          nextPayload,
          version.schemaHash,
          wallet.address,
          claimedIssuedAt,
          expiresAt
        )
      : null;

    const encrypted = await encryptPayload(nextPayload);

    const [updated] = await db
      .update(documents)
      .set({
        claimedIssuedAt: finalize
          ? fromUnixSeconds(claimedIssuedAt)
          : existing.claimedIssuedAt,
        expiresAt: nextExpiresAtDate,
        kekId: encrypted.kekId,
        leaf: finalize ? leaf : existing.leaf,
        payloadEnc: encrypted.payloadEnc,
        status: finalize ? "ready" : existing.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      throw AppError.internal("Failed to update document");
    }

    await AuditService.record({
      action: finalize ? "document.finalized" : "document.updated",
      actorId: existing.createdBy ?? undefined,
      actorType: "user",
      organizationId,
      targetId: documentId,
      targetType: "document",
    });

    return updated;
  },
};
