import { describe, expect, it } from "bun:test";

import { computeLeaf } from "../src/leaf";

const base = {
  chainId: 84_532,
  claimedIssuedAt: 1_700_000_000,
  expiresAt: 0,
  fields: { course_title: "CS", recipient_name: "Alice" },
  issuerAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  registryAddress:
    "0x0000000000000000000000000000000000000002" as `0x${string}`,
  salt: new Uint8Array(new ArrayBuffer(32)),
  schemaHash:
    "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
};

describe("computeLeaf", () => {
  it("produces a 32-byte hex hash", () => {
    const leaf = computeLeaf(base);
    expect(leaf).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    expect(computeLeaf(base)).toBe(computeLeaf(base));
  });

  it("changes when a field changes", () => {
    const a = computeLeaf(base);
    const b = computeLeaf({
      ...base,
      fields: { course_title: "CS", recipient_name: "Bob" },
    });
    expect(a).not.toBe(b);
  });

  it("changes when the salt changes", () => {
    const a = computeLeaf(base);
    const salt = new Uint8Array(new ArrayBuffer(32));
    salt.fill(1);
    const b = computeLeaf({ ...base, salt });
    expect(a).not.toBe(b);
  });

  it("changes when the issuer changes", () => {
    const a = computeLeaf(base);
    const b = computeLeaf({
      ...base,
      issuerAddress:
        "0x0000000000000000000000000000000000000003" as `0x${string}`,
    });
    expect(a).not.toBe(b);
  });

  it("changes when the chain changes", () => {
    const a = computeLeaf(base);
    const b = computeLeaf({ ...base, chainId: 8453 });
    expect(a).not.toBe(b);
  });

  it("changes when claimedIssuedAt changes", () => {
    const a = computeLeaf(base);
    const b = computeLeaf({
      ...base,
      claimedIssuedAt: base.claimedIssuedAt + 1,
    });
    expect(a).not.toBe(b);
  });

  it("changes when expiresAt changes", () => {
    const a = computeLeaf(base);
    const b = computeLeaf({ ...base, expiresAt: base.expiresAt + 1 });
    expect(a).not.toBe(b);
  });
});
