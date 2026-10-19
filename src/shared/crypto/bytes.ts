export type Bytes = Uint8Array<ArrayBuffer>;

export const emptyBytes = (): Bytes => new Uint8Array(new ArrayBuffer(0));

export const bytesFromLength = (length: number): Bytes =>
  new Uint8Array(new ArrayBuffer(length));

export const bytesFrom = (value: ArrayBuffer | ArrayBufferView): Bytes => {
  const source =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  const out = new Uint8Array(new ArrayBuffer(source.length));
  out.set(source);
  return out;
};

export const bytesFromUtf8 = (value: string): Bytes =>
  bytesFrom(new TextEncoder().encode(value));

export const bytesToUtf8 = (value: Bytes): string =>
  new TextDecoder().decode(value);

export const bytesFromBase64 = (value: string): Bytes => {
  const buf = Buffer.from(value, "base64");
  const out = new Uint8Array(new ArrayBuffer(buf.length));
  out.set(buf);
  return out;
};

export const bytesToBase64 = (value: Bytes): string =>
  Buffer.from(value).toString("base64");

export const bytesToArrayBuffer = (value: Bytes): ArrayBuffer =>
  value.buffer as ArrayBuffer;
