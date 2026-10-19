import { describe, expect, it } from "bun:test";

import { canonicalJson } from "../src/shared/crypto/canonical";
import {
  decryptWithKey,
  encryptWithKey,
} from "../src/shared/crypto/encryption";
import { computeLeaf } from "../src/shared/crypto/leaf";
import { randomHolderKey, randomSalt } from "../src/shared/crypto/random";

describe("canonicalJson", () => {
  it("sorts top-level keys", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("sorts nested object keys", () => {
    expect(canonicalJson({ a: { d: 4, c: 3 }, b: 1 })).toBe(
      '{"a":{"c":3,"d":4},"b":1}'
    );
  });

  it("preserves array order", () => {
    expect(canonicalJson({ x: [3, 1, 2] })).toBe('{"x":[3,1,2]}');
  });

  it("handles null", () => {
    expect(canonicalJson({ x: null })).toBe('{"x":null}');
  });
});

describe("encryptWithKey / decryptWithKey", () => {
  it("round-trips a payload", async () => {
    const key = randomHolderKey();
    const message = "hello world";

    const encrypted = await encryptWithKey(
      key,
      new TextEncoder().encode(message)
    );
    const decrypted = await decryptWithKey(key, encrypted);

    expect(new TextDecoder().decode(decrypted)).toBe(message);
  });

  it("uses a fresh IV each time", async () => {
    const key = randomHolderKey();
    const bytes = new TextEncoder().encode("same message");

    const a = await encryptWithKey(key, bytes);
    const b = await encryptWithKey(key, bytes);

    expect(Buffer.from(a).toString("base64")).not.toBe(
      Buffer.from(b).toString("base64")
    );
  });

  it("fails on tampered ciphertext", async () => {
    const key = randomHolderKey();
    const encrypted = await encryptWithKey(
      key,
      new TextEncoder().encode("data")
    );

    // Flip a byte in the ciphertext (skip version + IV prefix)
    const tampered = new Uint8Array(encrypted);
    tampered[tampered.length - 1]! ^= 0xff;

    await expect(decryptWithKey(key, tampered)).rejects.toThrow();
  });

  it("fails with the wrong key", async () => {
    const keyA = randomHolderKey();
    const keyB = randomHolderKey();

    const encrypted = await encryptWithKey(
      keyA,
      new TextEncoder().encode("data")
    );

    await expect(decryptWithKey(keyB, encrypted)).rejects.toThrow();
  });
});

describe("computeLeaf", () => {
  const base = {
    chainId: 84532,
    claimedIssuedAt: 1_700_000_000,
    expiresAt: 0,
    fields: { course_title: "CS", recipient_name: "Alice" },
    issuerAddress:
      "0x0000000000000000000000000000000000000001" as `0x${string}`,
    registryAddress:
      "0x0000000000000000000000000000000000000002" as `0x${string}`,
    salt: randomSalt(),
    schemaHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`,
  };

  it("produces a 32-byte hex hash", () => {
    const leaf = computeLeaf(base);
    expect(leaf).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    const a = computeLeaf(base);
    const b = computeLeaf(base);
    expect(a).toBe(b);
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
    const b = computeLeaf({ ...base, salt: randomSalt() });
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
