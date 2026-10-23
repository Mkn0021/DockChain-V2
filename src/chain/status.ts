export type VerificationStatus =
  | "not-found"
  | "pending"
  | "invalid"
  | "issuer-compromised"
  | "revoked"
  | "expired"
  | "unverified-issuer"
  | "valid";

export interface ComputeVerificationStatusInput {
  anchorTimestamp: number;
  claimedIssuedAt: number;
  domainVerified: boolean;
  expiresAt: number;
  now: number;
  revokedAt: number;
  compromisedFrom: number;
}

export const computeVerificationStatus = (
  input: ComputeVerificationStatusInput
): VerificationStatus => {
  if (input.anchorTimestamp === 0) {
    return "pending";
  }

  if (input.claimedIssuedAt > input.anchorTimestamp) {
    return "invalid";
  }

  if (
    input.compromisedFrom > 0 &&
    input.anchorTimestamp >= input.compromisedFrom
  ) {
    return "issuer-compromised";
  }

  if (input.revokedAt > 0) {
    return "revoked";
  }

  if (input.expiresAt > 0 && input.expiresAt < input.now) {
    return "expired";
  }

  if (!input.domainVerified) {
    return "unverified-issuer";
  }

  return "valid";
};
