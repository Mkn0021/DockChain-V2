import { describe, expect, it } from "bun:test";

import {
  REVOKE_TYPES,
  buildRevokeTypedData,
} from "../src/shared/chain/revoke-typed-data";

describe("buildRevokeTypedData", () => {
  it("builds the payload with the fixed domain", () => {
    const data = buildRevokeTypedData({
      chainId: 84532,
      issuer: "0x0000000000000000000000000000000000000001",
      leaf: "0x1111111111111111111111111111111111111111111111111111111111111111",
      reason: 2,
      registryAddress: "0x0000000000000000000000000000000000000002",
      root: "0x2222222222222222222222222222222222222222222222222222222222222222",
    });

    expect(data.domain.name).toBe("DockChainRegistry");
    expect(data.domain.version).toBe("1");
    expect(data.domain.chainId).toBe(84532);
    expect(data.domain.verifyingContract).toBe(
      "0x0000000000000000000000000000000000000002"
    );
    expect(data.primaryType).toBe("Revoke");
    expect(data.message.reason).toBe(2);
    expect(data.types.Revoke).toEqual([...REVOKE_TYPES.Revoke]);
  });

  it("preserves the issuer", () => {
    const data = buildRevokeTypedData({
      chainId: 84532,
      issuer: "0x0000000000000000000000000000000000000001",
      leaf: "0x1111111111111111111111111111111111111111111111111111111111111111",
      reason: 0,
      registryAddress: "0x0000000000000000000000000000000000000002",
      root: "0x2222222222222222222222222222222222222222222222222222222222222222",
    });

    expect(data.message.issuer).toBe(
      "0x0000000000000000000000000000000000000001"
    );
  });
});
