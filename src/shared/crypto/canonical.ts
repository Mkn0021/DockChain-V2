import canonicalize from "canonicalize";

export const canonicalJson = (value: unknown): string => {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("canonicalize returned undefined");
  }
  return result;
};

export const canonicalBytes = (value: unknown): Uint8Array =>
  new TextEncoder().encode(canonicalJson(value));
