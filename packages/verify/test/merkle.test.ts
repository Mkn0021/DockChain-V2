import { describe, expect, it } from "bun:test";

import { buildTree, getProof, getRoot, verifyProof } from "../src/merkle";

const leafA =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`;
const leafB =
  "0x2222222222222222222222222222222222222222222222222222222222222222" as `0x${string}`;
const leafC =
  "0x3333333333333333333333333333333333333333333333333333333333333333" as `0x${string}`;
const leafD =
  "0x4444444444444444444444444444444444444444444444444444444444444444" as `0x${string}`;

describe("Merkle tree", () => {
  it("produces a proof that verifies for each leaf", () => {
    const tree = buildTree([leafA, leafB, leafC, leafD]);
    const root = getRoot(tree);

    for (const leaf of [leafA, leafB, leafC, leafD]) {
      const proof = getProof(tree, leaf);
      expect(verifyProof(root, leaf, proof)).toBe(true);
    }
  });

  it("is deterministic regardless of input order", () => {
    const forward = buildTree([leafA, leafB, leafC]);
    const reverse = buildTree([leafC, leafB, leafA]);
    const shuffled = buildTree([leafB, leafA, leafC]);

    expect(getRoot(forward)).toBe(getRoot(reverse));
    expect(getRoot(forward)).toBe(getRoot(shuffled));
  });

  it("rejects a tampered proof", () => {
    const tree = buildTree([leafA, leafB]);
    const root = getRoot(tree);
    const proof = getProof(tree, leafA);

    const tampered = [...proof];
    tampered[0] =
      "0x9999999999999999999999999999999999999999999999999999999999999999";

    expect(verifyProof(root, leafA, tampered)).toBe(false);
  });

  it("rejects a wrong leaf against a valid proof", () => {
    const tree = buildTree([leafA, leafB]);
    const root = getRoot(tree);
    const proof = getProof(tree, leafA);

    expect(verifyProof(root, leafC, proof)).toBe(false);
  });

  it("throws when building a tree with no leaves", () => {
    expect(() => buildTree([])).toThrow();
  });

  it("throws when requesting a proof for a leaf not in the tree", () => {
    const tree = buildTree([leafA, leafB]);
    expect(() => getProof(tree, leafC)).toThrow();
  });

  it("works with a single-leaf tree", () => {
    const tree = buildTree([leafA]);
    const root = getRoot(tree);
    const proof = getProof(tree, leafA);
    expect(verifyProof(root, leafA, proof)).toBe(true);
  });
});
