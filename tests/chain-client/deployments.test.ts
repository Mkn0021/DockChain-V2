import { describe, expect, it } from "bun:test";

import { readDeploymentFile, verifyAbiHash } from "../../src/chain/deployments";
import { AppError } from "../../src/shared/errors";

describe("deployments", () => {
  it("readDeploymentFile loads the local deployment", async () => {
    const file = await readDeploymentFile(31_337);
    expect(file.chainId).toBe(31_337);
    expect(file.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(file.local).toBe(true);
  });

  it("readDeploymentFile throws for unknown chain", async () => {
    await expect(readDeploymentFile(999_999)).rejects.toBeInstanceOf(AppError);
  });

  it("verifyAbiHash passes on the committed ABI", async () => {
    const file = await readDeploymentFile(31_337);
    await expect(verifyAbiHash(file.abiHash)).resolves.toBeUndefined();
  });

  it("verifyAbiHash rejects a wrong hash", async () => {
    await expect(
      verifyAbiHash(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      )
    ).rejects.toBeInstanceOf(AppError);
  });
});
