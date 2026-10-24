export interface SniffedImage {
  ext: "jpeg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
}

export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] as const;
const JPEG_SIGNATURE = [0xFF, 0xD8, 0xFF] as const;
const RIFF_PREFIX = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP_PREFIX = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP" at offset 8

const startsWithSignature = (
  buf: Uint8Array,
  signature: readonly number[],
  offset = 0
): boolean => {
  for (let i = 0; i < signature.length; i += 1) {
    if (buf[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
};

export const sniffImage = (buf: Uint8Array): SniffedImage | null => {
  if (buf.length < 12) {
    return null;
  }

  if (startsWithSignature(buf, PNG_SIGNATURE)) {
    return { ext: "png", mime: "image/png" };
  }

  if (startsWithSignature(buf, JPEG_SIGNATURE)) {
    return { ext: "jpeg", mime: "image/jpeg" };
  }

  if (
    startsWithSignature(buf, RIFF_PREFIX) &&
    startsWithSignature(buf, WEBP_PREFIX, 8)
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
};
