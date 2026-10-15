import canonicalize from "canonicalize";
import { keccak256, toHex } from "viem";

export const canonicalJson = (value: unknown): string => {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("canonicalize returned undefined");
  }
  return result;
};

export const sha256Hex = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const computeSchemaHash = async (
  fieldSchema: unknown,
  layout: string
): Promise<string> => {
  const layoutSha256 = await sha256Hex(layout);
  const canonical = canonicalJson({ fieldSchema, layoutSha256 });
  return keccak256(toHex(canonical));
};
