import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

export type MerkleTree = StandardMerkleTree<[string]>;
export type MerkleProofEntry = string;

export const buildTree = (leaves: `0x${string}`[]): MerkleTree => {
  if (leaves.length === 0) {
    throw new Error("Cannot build a Merkle tree with no leaves");
  }

  const sorted = [...leaves];
  sorted.sort((a, b) => {
    const left = a.toLowerCase();
    const right = b.toLowerCase();
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });

  // Each leaf is a single bytes32 value
  const values = sorted.map((leaf) => [leaf] as [string]);
  return StandardMerkleTree.of(values, ["bytes32"]);
};

export const getProof = (
  tree: MerkleTree,
  leaf: `0x${string}`
): MerkleProofEntry[] => {
  for (const [index, value] of tree.entries()) {
    if (value[0].toLowerCase() === leaf.toLowerCase()) {
      return tree.getProof(index) as MerkleProofEntry[];
    }
  }
  throw new Error(`Leaf not found in tree: ${leaf}`);
};

export const verifyProof = (
  root: `0x${string}`,
  leaf: `0x${string}`,
  proof: MerkleProofEntry[]
): boolean => StandardMerkleTree.verify(root, ["bytes32"], [leaf], proof);

export const serializeTree = (tree: MerkleTree) => tree.dump();

export const deserializeTree = (
  data: ReturnType<MerkleTree["dump"]>
): MerkleTree => StandardMerkleTree.load(data);

export const getRoot = (tree: MerkleTree): `0x${string}` =>
  tree.root as `0x${string}`;
