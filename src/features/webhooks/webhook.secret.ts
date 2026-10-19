import {
  bytesFrom,
  bytesFromBase64,
  bytesToBase64,
  decryptWithKey,
  encryptWithKey,
  getActiveKek,
  getKek,
} from "../../shared/crypto";

const SECRET_BYTES = 32;

const randomSecret = (): Uint8Array => {
  const out = new Uint8Array(new ArrayBuffer(SECRET_BYTES));
  crypto.getRandomValues(out);
  return out;
};

export const generateWebhookSecret = (): string =>
  `whsec_${Buffer.from(randomSecret()).toString("hex")}`;

export const encryptSecret = async (
  secret: string
): Promise<{ ciphertext: string; kekId: string }> => {
  const { id: kekId, key } = getActiveKek();
  const plaintext = bytesFrom(new TextEncoder().encode(secret));
  const ciphertext = await encryptWithKey(key, plaintext);
  return { ciphertext: bytesToBase64(ciphertext), kekId };
};

export const decryptSecret = async (
  ciphertext: string,
  kekId: string
): Promise<string> => {
  const key = getKek(kekId);
  const bytes = bytesFromBase64(ciphertext);
  const plaintext = await decryptWithKey(key, bytes);
  return new TextDecoder().decode(plaintext);
};

export const parseSecretCiphertext = (
  value: string
): { ciphertext: string; kekId: string } => {
  const [kekId, ciphertext] = value.split("::");
  if (!kekId || !ciphertext) {
    throw new Error("Invalid encrypted secret format");
  }
  return { ciphertext, kekId };
};

export const serializeSecretCiphertext = (
  ciphertext: string,
  kekId: string
): string => `${kekId}::${ciphertext}`;
