import { render } from "@react-email/components";
import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";

import type { EmailDeliveryJobDataType } from "../queues/email-delivery.queue";

import { env } from "../../config";
import { db } from "../../db";
import { documents } from "../../db/schema/document.schema";
import { emailService } from "../../email";
import { DocumentIssuedEmail } from "../../email/templates/document-issued";
import { DeliveryService } from "../../features/documents/document.delivery";
import { buildVerifyUrl } from "../../features/documents/document.qr";
import { DocumentService } from "../../features/documents/document.service";
import { AppError } from "../../shared/errors";
import { createBullMQConnection } from "../connection";

const processEmailDelivery = async (job: Job<EmailDeliveryJobDataType>) => {
  const { deliveryId } = job.data;

  const delivery = await DeliveryService.getById(deliveryId);

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, delivery.documentId))
    .limit(1);

  if (!doc) {
    throw AppError.notFound(`Document ${delivery.documentId} not found`);
  }

  if (doc.status !== "issued") {
    throw AppError.conflict(
      `Document ${doc.id} is in status "${doc.status}", expected "issued"`
    );
  }

  const bundle = await DocumentService.getBundle(doc.organizationId, doc.id);

  if (!bundle.recipient) {
    throw AppError.validation(`Document ${doc.id} has no recipient email`);
  }

  const pdfUrlResult = await DocumentService.getPdfUrl(
    doc.organizationId,
    doc.id,
    false
  );

  if (
    !("url" in pdfUrlResult) ||
    typeof pdfUrlResult.url !== "string" ||
    !URL.canParse(pdfUrlResult.url)
  ) {
    throw AppError.internal("Failed to obtain a valid signed PDF URL");
  }

  const verifyUrl = buildVerifyUrl({
    chainId: bundle.chainId,
    holderKey: bundle.holderKey,
    issuer: bundle.issuer,
    leaf: bundle.leaf,
    registry: bundle.registry,
  });

  const html = await render(
    DocumentIssuedEmail({
      documentId: doc.id,
      issuerName: "DockChain",
      recipientName: bundle.recipient.name,
      verifyUrl,
    })
  );

  const pdfResponse = await fetch(pdfUrlResult.url);
  if (!pdfResponse.ok) {
    throw AppError.internal(
      `Failed to download PDF: ${pdfResponse.status} ${pdfResponse.statusText}`
    );
  }
  const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

  const bundleJson = JSON.stringify(bundle, null, 2);

  await emailService.send({
    attachments: [
      {
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
        filename: `${doc.id}.pdf`,
      },
      {
        content: Buffer.from(bundleJson, "utf8"),
        contentType: "application/json",
        filename: `${doc.id}.bundle.json`,
      },
    ],
    from: env.RESEND_FROM_EMAIL,
    html,
    subject: "Your document is ready",
    to: bundle.recipient.email,
  });

  await DeliveryService.markSent(deliveryId);

  return { deliveryId, sent: true };
};

export const emailDeliveryWorker = new Worker<EmailDeliveryJobDataType>(
  "email-delivery",
  processEmailDelivery,
  {
    concurrency: 5,
    connection: createBullMQConnection(),
  }
);

emailDeliveryWorker.on("failed", async (job, error) => {
  if (!job) {
    return;
  }
  await DeliveryService.markFailed(job.data.deliveryId, error.message);
});

emailDeliveryWorker.on("error", (error) => {
  console.error("[email-delivery] worker error:", error.message);
});
