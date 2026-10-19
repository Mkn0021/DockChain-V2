import {
  bytesFromLength,
  bytesToArrayBuffer,
  bytesFrom,
  type Bytes,
} from "./bytes";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION = 1;

const importKey = (key: Bytes): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(key),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

export const encryptWithKey = async (
  key: Bytes,
  plaintext: Bytes
): Promise<Bytes> => {
  const iv = bytesFromLength(IV_LENGTH);
  crypto.getRandomValues(iv);

  const cryptoKey = await importKey(key);
  const ciphertext = bytesFrom(
    await crypto.subtle.encrypt(
      { iv, name: "AES-GCM" },
      cryptoKey,
      bytesToArrayBuffer(plaintext)
    )
  );

  const out = bytesFromLength(1 + IV_LENGTH + ciphertext.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ciphertext, 1 + IV_LENGTH);
  return out;
};

export const decryptWithKey = async (
  key: Bytes,
  payload: Bytes
): Promise<Bytes> => {
  if (payload.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short");
  }
  if (payload[0] !== VERSION) {
    throw new Error(`Unsupported ciphertext version: ${payload[0]}`);
  }

  const iv = bytesFrom(payload.subarray(1, 1 + IV_LENGTH));
  const ciphertext = bytesFrom(payload.subarray(1 + IV_LENGTH));

  const cryptoKey = await importKey(key);
  return bytesFrom(
    await crypto.subtle.decrypt(
      { iv, name: "AES-GCM" },
      cryptoKey,
      bytesToArrayBuffer(ciphertext)
    )
  );
};
