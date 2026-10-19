const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION = 1;

const importKey = (key: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    "raw",
    Uint8Array.from(key),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

export const encryptWithKey = async (
  key: Uint8Array,
  bytes: Uint8Array
): Promise<Uint8Array> => {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);

  const cryptoKey = await importKey(key);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { iv, name: "AES-GCM" },
      cryptoKey,
      Uint8Array.from(bytes)
    )
  );

  // Layout: version(1) | iv(12) | ciphertext+tag
  const out = new Uint8Array(1 + IV_LENGTH + ciphertext.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ciphertext, 1 + IV_LENGTH);
  return out;
};

export const decryptWithKey = async (
  key: Uint8Array,
  payload: Uint8Array
): Promise<Uint8Array> => {
  if (payload.length < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Ciphertext too short");
  }
  if (payload[0] !== VERSION) {
    throw new Error(`Unsupported ciphertext version: ${payload[0]}`);
  }

  const iv = payload.slice(1, 1 + IV_LENGTH);
  const ciphertext = payload.slice(1 + IV_LENGTH);

  const cryptoKey = await importKey(key);
  const plaintext = await crypto.subtle.decrypt(
    { iv, name: "AES-GCM" },
    cryptoKey,
    ciphertext
  );

  return new Uint8Array(plaintext);
};
