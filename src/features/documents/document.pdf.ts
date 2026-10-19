import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import sharp from "sharp";

import type { ProofBundle } from "./document.bundle";

import { buildVerifyUrl, renderQrPng } from "./document.qr";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 48;

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

export interface PdfRenderInput {
  bundle: ProofBundle;
  preview: boolean;
}

export const renderPdf = async (input: PdfRenderInput): Promise<Uint8Array> => {
  const { bundle, preview } = input;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const documentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBorder(documentPage);

  documentPage.drawText("Certificate of Issuance", {
    color: rgb(0.1, 0.1, 0.1),
    font: bold,
    size: 28,
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 32,
  });

  let y = PAGE_HEIGHT - MARGIN - 100;
  for (const [key, value] of Object.entries(bundle.fields)) {
    documentPage.drawText(`${key}:`, {
      color: rgb(0.4, 0.4, 0.4),
      font: regular,
      size: 10,
      x: MARGIN,
      y,
    });
    documentPage.drawText(safeText(value), {
      color: rgb(0.1, 0.1, 0.1),
      font: regular,
      size: 14,
      x: MARGIN,
      y: y - 16,
    });
    y -= 48;
  }

  if (preview) {
    documentPage.drawText("NOT YET VALID", {
      color: rgb(1, 0.2, 0.2),
      font: bold,
      opacity: 0.3,
      rotate: degrees(-30),
      size: 72,
      x: PAGE_WIDTH / 4,
      y: PAGE_HEIGHT / 2 - 36,
    });
  }

  const verifyPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBorder(verifyPage);

  verifyPage.drawText("Verification", {
    color: rgb(0.1, 0.1, 0.1),
    font: bold,
    size: 22,
    x: MARGIN,
    y: PAGE_HEIGHT - MARGIN - 24,
  });

  const verifyUrl = buildVerifyUrl({
    chainId: bundle.chainId,
    holderKey: bundle.holderKey,
    issuer: bundle.issuer,
    leaf: bundle.leaf,
    registry: bundle.registry,
  });

  const qrPng = await renderQrPng(verifyUrl);
  const qrAsPng = await sharp(qrPng).png().toBuffer();
  const qrImage = await pdf.embedPng(qrAsPng);
  verifyPage.drawImage(qrImage, {
    height: 200,
    width: 200,
    x: PAGE_WIDTH - MARGIN - 200,
    y: PAGE_HEIGHT - MARGIN - 220,
  });

  const lines = [
    `Issuer: ${bundle.issuer}`,
    `Chain ID: ${bundle.chainId}`,
    `Registry: ${bundle.registry}`,
    `Root: ${bundle.root}`,
    `Leaf: ${bundle.leaf}`,
    `Leaf index: ${bundle.leafIndex}`,
    bundle.txHash ? `Tx: ${bundle.txHash}` : "Tx: not yet anchored",
    bundle.blockNumber ? `Block: ${bundle.blockNumber}` : "Block: pending",
    `Issued at: ${new Date(bundle.claimedIssuedAt * 1000).toISOString()}`,
    bundle.expiresAt
      ? `Expires at: ${new Date(bundle.expiresAt * 1000).toISOString()}`
      : "Expires at: never",
  ];

  let ly = PAGE_HEIGHT - MARGIN - 80;
  for (const line of lines) {
    verifyPage.drawText(line, {
      color: rgb(0.1, 0.1, 0.1),
      font: regular,
      size: 10,
      x: MARGIN,
      y: ly,
    });
    ly -= 20;
  }

  verifyPage.drawText(
    "Scan the QR code or visit the URL to verify this document independently.",
    {
      color: rgb(0.4, 0.4, 0.4),
      font: regular,
      size: 9,
      x: MARGIN,
      y: MARGIN + 20,
    }
  );

  return pdf.save();
};

const drawBorder = (page: ReturnType<PDFDocument["addPage"]>) => {
  page.drawRectangle({
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
    color: rgb(1, 1, 1),
    height: PAGE_HEIGHT - MARGIN * 2,
    width: PAGE_WIDTH - MARGIN * 2,
    x: MARGIN,
    y: MARGIN,
  });
};
