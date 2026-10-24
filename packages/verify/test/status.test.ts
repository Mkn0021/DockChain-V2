import { describe, expect, it } from "bun:test";

import { computeVerificationStatus } from "../src/status";

const base = {
  anchorTimestamp: 1_700_000_000,
  claimedIssuedAt: 1_700_000_000,
  compromisedFrom: 0,
  domainVerified: true,
  expiresAt: 0,
  now: 1_700_000_500,
  revokedAt: 0,
};

describe("computeVerificationStatus", () => {
  it("returns pending when nothing is anchored", () => {
    expect(computeVerificationStatus({ ...base, anchorTimestamp: 0 })).toBe(
      "pending"
    );
  });

  it("returns invalid when claimedIssuedAt is after the anchor", () => {
    expect(
      computeVerificationStatus({
        ...base,
        claimedIssuedAt: base.anchorTimestamp + 1,
      })
    ).toBe("invalid");
  });

  it("returns issuer-compromised when the anchor is at or after the cutoff", () => {
    expect(
      computeVerificationStatus({
        ...base,
        compromisedFrom: base.anchorTimestamp,
      })
    ).toBe("issuer-compromised");
  });

  it("returns revoked when there is a revocation timestamp", () => {
    expect(computeVerificationStatus({ ...base, revokedAt: base.now })).toBe(
      "revoked"
    );
  });

  it("returns expired when expiresAt is in the past", () => {
    expect(
      computeVerificationStatus({ ...base, expiresAt: base.now - 1 })
    ).toBe("expired");
  });

  it("returns unverified-issuer when domain is not verified", () => {
    expect(computeVerificationStatus({ ...base, domainVerified: false })).toBe(
      "unverified-issuer"
    );
  });

  it("returns valid otherwise", () => {
    expect(computeVerificationStatus(base)).toBe("valid");
  });
});
