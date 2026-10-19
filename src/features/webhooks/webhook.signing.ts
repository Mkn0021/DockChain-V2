import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SECRET_PREFIX = "whsec_";

export const generateSecret = (): string =>
  `${SECRET_PREFIX}${randomBytes(32).toString("hex")}`;

export const signPayload = (
  secret: string,
  timestamp: number,
  body: string
): string => {
  const signed = `${timestamp}.${body}`;
  return `sha256=${createHmac("sha256", secret).update(signed).digest("hex")}`;
};

export const verifySignature = (
  secret: string,
  timestamp: number,
  body: string,
  signature: string
): boolean => {
  const expected = signPayload(secret, timestamp, body);
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, actualBuf);
};
