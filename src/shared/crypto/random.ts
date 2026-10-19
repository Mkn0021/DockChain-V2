import { bytesFromLength, type Bytes } from "./bytes";

export const randomBytes = (size: number): Bytes => {
  const out = bytesFromLength(size);
  crypto.getRandomValues(out);
  return out;
};

export const randomSalt = (): Bytes => randomBytes(32);

export const randomHolderKey = (): Bytes => randomBytes(32);
