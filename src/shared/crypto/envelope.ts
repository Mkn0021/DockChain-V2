import { bytesFromBase64, type Bytes } from "@dockchain/verify";

import { env } from "../../config";

const decodeKey = (base64: string): Bytes => {
  const bytes = bytesFromBase64(base64);
  if (bytes.length !== 32) {
    throw new Error(`Encryption key must be 32 bytes, got ${bytes.length}`);
  }
  return bytes;
};

export const getActiveKek = (): { id: string; key: Bytes } => {
  const id = env.DOCUMENT_ENCRYPTION_ACTIVE_KEY_ID;
  const base64 = env.DOCUMENT_ENCRYPTION_KEYS[id];
  if (!base64) {
    throw new Error(`Active KEK "${id}" not found in DOCUMENT_ENCRYPTION_KEYS`);
  }
  return { id, key: decodeKey(base64) };
};

export const getKek = (id: string): Bytes => {
  const base64 = env.DOCUMENT_ENCRYPTION_KEYS[id];
  if (!base64) {
    throw new Error(`KEK "${id}" not found in DOCUMENT_ENCRYPTION_KEYS`);
  }
  return decodeKey(base64);
};
