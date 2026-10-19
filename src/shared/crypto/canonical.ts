import canonicalize from "canonicalize";

import { bytesFromUtf8, type Bytes } from "./bytes";

export const canonicalJson = (value: unknown): string => {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("canonicalize returned undefined");
  }
  return result;
};

export const canonicalBytes = (value: unknown): Bytes =>
  bytesFromUtf8(canonicalJson(value));
