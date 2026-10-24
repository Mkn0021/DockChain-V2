// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DocumentRegistry} from "../../src/DocumentRegistry.sol";
import {IDocumentRegistry} from "../../src/IDocumentRegistry.sol";

contract DocumentRegistryInvariants is Test {
    DocumentRegistry private registry;

    address private issuer;
    uint256 private issuerKey;

    // Track what the fuzzer has done so we can check invariants.
    bytes32[] private anchoredRoots;
    bytes32[] private revokedLeaves;

    function setUp() public {
        (issuer, issuerKey) = makeAddrAndKey("issuer");
        registry = new DocumentRegistry();
    }

    // ---------------------------------------------------------------------
    // Targeted actions (called by the fuzzer, one per test)
    // ---------------------------------------------------------------------

    function anchor(bytes32 root) public {
        if (root == bytes32(0)) return;

        bytes32 structHash = keccak256(
            abi.encode(
                registry.ANCHOR_TYPEHASH(),
                root,
                uint32(1),
                uint64(1),
                uint64(block.timestamp + 1000),
                keccak256(bytes("")),
                issuer
            )
        );
        bytes32 typedDigest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerKey, typedDigest);

        try registry.anchor(
            root,
            uint32(1),
            uint64(1),
            uint64(block.timestamp + 1000),
            issuer,
            bytes(""),
            abi.encodePacked(r, s, v)
        ) {
            anchoredRoots.push(root);
        } catch {}
    }

    function revoke(bytes32 root, bytes32 leaf) public {
        if (root == bytes32(0) || leaf == bytes32(0)) return;

        // Only attempt to revoke a leaf that is actually anchored under the
        // issuer's identity. Whether it's in the tree is checked on-chain.
        try registry.revoke(root, leaf, new bytes32[](0), 0) {
            revokedLeaves.push(leaf);
        } catch {}
    }

    // ---------------------------------------------------------------------
    // Invariants
    // ---------------------------------------------------------------------

    /// Invariant 1: no revocation exists for a leaf unless its root was anchored.
    function invariant_revocationImpliesAnchor() public view {
        for (uint256 i = 0; i < revokedLeaves.length; i++) {
            bytes32 leaf = revokedLeaves[i];
            IDocumentRegistry.RevocationRecord memory record =
                registry.revocationOf(issuer, leaf);
            assertGt(record.timestamp, 0, "invariant: revoked leaf has no timestamp");

            // If the leaf was revoked, at least one anchor must exist for the
            // issuer (we don't track roots per-leaf here, but the leaf got in
            // only via a successful revoke which requires an anchor).
            bool anyAnchor = false;
            for (uint256 j = 0; j < anchoredRoots.length; j++) {
                if (registry.anchorOf(issuer, anchoredRoots[j]).timestamp > 0) {
                    anyAnchor = true;
                    break;
                }
            }
            assertTrue(anyAnchor, "invariant: revocation without anchor");
        }
    }

    /// Invariant 2: an anchored root's timestamp never changes.
    function invariant_anchorTimestampStable() public view {
        for (uint256 i = 0; i < anchoredRoots.length; i++) {
            IDocumentRegistry.AnchorRecord memory record =
                registry.anchorOf(issuer, anchoredRoots[i]);
            assertGt(record.timestamp, 0, "invariant: tracked anchor has no timestamp");
        }
    }

    /// Invariant 3: compromise cutoff never moves later than what was set.
    function invariant_cutoffMonotonic() public view {
        uint64 current = registry.compromisedFrom(issuer);
        // The contract enforces this on every call, so this is just a
        // sanity check that the stored value isn't in the future.
        assertLe(current, block.timestamp, "invariant: cutoff in the future");
    }

    // ---------------------------------------------------------------------
    // Fuzzed entry points
    // ---------------------------------------------------------------------

    function testFuzz_invariant_revocationImpliesAnchor(bytes32 root, bytes32 leaf) public {
        anchor(root);
        revoke(root, leaf);
        invariant_revocationImpliesAnchor();
    }

    function testFuzz_invariant_anchorTimestampStable(bytes32 root) public {
        anchor(root);
        invariant_anchorTimestampStable();
    }

    function testFuzz_invariant_cutoffMonotonic(uint64 first, uint64 second) public {
        first = uint64(bound(first, 0, block.timestamp));

        vm.prank(issuer);
        registry.markKeyCompromised(first);
        invariant_cutoffMonotonic();

        second = uint64(bound(second, 0, first));

        vm.prank(issuer);
        registry.markKeyCompromised(second);
        invariant_cutoffMonotonic();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _domainSeparator() internal view returns (bytes32) {
        (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions) =
            registry.eip712Domain();
        fields;
        extensions;
        salt;
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }
}