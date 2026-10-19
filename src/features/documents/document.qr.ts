import QRCode from "qrcode";

import { env } from "../../config";

interface BundleForQr {
  chainId: number;
  registry: string;
  issuer: string;
  leaf: string;
  holderKey: string;
}

const toBase64Url = (value: string): string =>
  Buffer.from(value, "base64")
    .toString("base64")
    .replaceAll(/\+/g, "-")
    .replaceAll(/\//g, "_")
    .replace(/=+$/, "");

export const buildVerifyUrl = (bundle: BundleForQr): string => {
  const params = new URLSearchParams({
    c: String(bundle.chainId),
    i: bundle.issuer,
    l: bundle.leaf,
    r: bundle.registry,
  });
  return `${env.APP_PUBLIC_URL}/verify?${params.toString()}#k=${toBase64Url(bundle.holderKey)}`;
};

export const renderQrPng = (url: string): Promise<Buffer> =>
  QRCode.toBuffer(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "png",
    width: 512,
  });

export const renderQrSvg = (url: string): Promise<string> =>
  QRCode.toString(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "svg",
  });
