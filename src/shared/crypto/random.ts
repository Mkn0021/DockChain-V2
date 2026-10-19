export const randomBytes = (size: number): Uint8Array => {
  const buffer = new Uint8Array(size);
  crypto.getRandomValues(buffer);
  return buffer;
};

export const randomSalt = (): Uint8Array => randomBytes(32);

export const randomHolderKey = (): Uint8Array => randomBytes(32);
