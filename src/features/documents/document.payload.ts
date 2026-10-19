import {
  decryptWithKey,
  encryptWithKey,
  getActiveKek,
  getKek,
  randomHolderKey,
  randomSalt,
} from "../../shared/crypto";

export interface DocumentPayload {
  fields: Record<string, unknown>;
  holderKey: string; // base64
  recipient: { email: string; name: string } | null;
  salt: string; // base64
}

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");

const fromBase64 = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

export const createDraftPayload = (input: {
  fields: Record<string, unknown>;
  recipient: DocumentPayload["recipient"];
  withKeys: boolean;
}): {
  payloadEnc: string;
  kekId: string;
  holderKey?: Uint8Array;
  salt?: Uint8Array;
  payload: DocumentPayload;
} => {
  const salt = input.withKeys ? randomSalt() : undefined;
  const holderKey = input.withKeys ? randomHolderKey() : undefined;

  const payload: DocumentPayload = {
    fields: input.fields,
    holderKey: holderKey ? toBase64(holderKey) : "",
    recipient: input.recipient,
    salt: salt ? toBase64(salt) : "",
  };

  const { id: kekId } = getActiveKek();
  return {
    holderKey,
    kekId,
    payload,
    payloadEnc: "",
    salt,
  };
};

export const encryptPayload = async (
  payload: DocumentPayload
): Promise<{ payloadEnc: string; kekId: string }> => {
  const { id: kekId, key: kek } = getActiveKek();
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await encryptWithKey(kek, bytes);
  return { kekId, payloadEnc: toBase64(encrypted) };
};

export const decryptPayload = async (
  payloadEnc: string,
  kekId: string
): Promise<DocumentPayload> => {
  const kek = getKek(kekId);
  const encrypted = fromBase64(payloadEnc);
  const decrypted = await decryptWithKey(kek, encrypted);
  return JSON.parse(new TextDecoder().decode(decrypted)) as DocumentPayload;
};
