export const REVOCATION_REASON_CODES = [
  "error",
  "fraud",
  "superseded",
  "holder_request",
  "other",
] as const;

export type RevocationReasonCode = (typeof REVOCATION_REASON_CODES)[number];

export const reasonCodeToUint8 = (code: RevocationReasonCode): number =>
  REVOCATION_REASON_CODES.indexOf(code);

export const uint8ToReasonCode = (value: number): RevocationReasonCode => {
  const code = REVOCATION_REASON_CODES[value];
  if (!code) {
    throw new Error(`Unknown revocation reason code: ${value}`);
  }
  return code;
};
