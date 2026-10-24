// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DocumentRegistry} from "../../src/DocumentRegistry.sol";
import {IDocumentRegistry} from "../../src/IDocumentRegistry.sol";

contract DocumentRegistryTest is Test {
    DocumentRegistry private registry;

    address private issuer;
    uint256 private issuerKey;
    address private other;

    function setUp() public {
        (issuer, issuerKey) = makeAddrAndKey("issuer");
        other = makeAddr("other");
        registry = new DocumentRegistry();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /// Anchors a single-leaf batch for `leaf` under `who` and returns the root.
    /// For a single-leaf Merkle tree, root == keccak256(bytes.concat(keccak256(abi.encode(leaf)))),
    /// which is exactly what DocumentRegistry._revoke recomputes.
    function _anchorSingleLeafBatch(
        bytes32 leaf,
        address who,
        uint256 whoKey
    ) internal returns (bytes32 root) {
        root = keccak256(bytes.concat(keccak256(abi.encode(leaf))));

        bytes32 structHash = keccak256(
            abi.encode(
                registry.ANCHOR_TYPEHASH(),
                root,
                uint32(1),
                uint64(1),
                uint64(block.timestamp + 1000),
                keccak256(bytes("")),
                who
            )
        );
        bytes32 typedDigest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(whoKey, typedDigest);
        bytes memory signature = abi.encodePacked(r, s, v);

        registry.anchor(
            root,
            uint32(1),
            uint64(1),
            uint64(block.timestamp + 1000),
            who,
            bytes(""),
            signature
        );
    }

    function _domainSeparator() internal view returns (bytes32) {
        (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        ) = registry.eip712Domain();
        fields;
        extensions;
        salt;
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }

    function _signRevoke(
        bytes32 root,
        bytes32 leaf,
        uint8 reason,
        uint256 whoKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                registry.REVOKE_TYPEHASH(),
                root,
                leaf,
                reason,
                vm.addr(whoKey)
            )
        );
        bytes32 typedDigest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparator(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(whoKey, typedDigest);
        return abi.encodePacked(r, s, v);
    }

    // ---------------------------------------------------------------------
    // Revoked leaf never becomes valid again
    // ---------------------------------------------------------------------

    function testFuzz_revokedLeafNeverBecomesValid(bytes32 leaf) public {
        bytes32 root = _anchorSingleLeafBatch(leaf, issuer, issuerKey);

        vm.prank(issuer);
        registry.revoke(root, leaf, new bytes32[](0), 0);

        IDocumentRegistry.RevocationRecord memory record =
            registry.revocationOf(issuer, leaf);
        assertGt(record.timestamp, 0, "revocation should be recorded");

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IDocumentRegistry.AlreadyRevoked.selector,
                issuer,
                leaf
            )
        );
        registry.revoke(root, leaf, new bytes32[](0), 0);

        IDocumentRegistry.RevocationRecord memory afterRecord =
            registry.revocationOf(issuer, leaf);
        assertEq(afterRecord.timestamp, record.timestamp);
    }

    // ---------------------------------------------------------------------
    // Anchor never changes
    // ---------------------------------------------------------------------

    function testFuzz_anchorNeverChanges(bytes32 leaf) public {
        bytes32 root = _anchorSingleLeafBatch(leaf, issuer, issuerKey);

        IDocumentRegistry.AnchorRecord memory before =
            registry.anchorOf(issuer, root);
        assertGt(before.timestamp, 0, "anchor should exist");

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IDocumentRegistry.AlreadyAnchored.selector,
                issuer,
                root
            )
        );
        registry.anchor(
            root,
            uint32(1),
            uint64(1),
            uint64(block.timestamp + 1000),
            issuer,
            bytes(""),
            bytes("")
        );

        IDocumentRegistry.AnchorRecord memory afterAnchor =
            registry.anchorOf(issuer, root);
        assertEq(afterAnchor.timestamp, before.timestamp);
        assertEq(afterAnchor.count, before.count);
    }

    // ---------------------------------------------------------------------
    // Compromise cutoff only moves earlier
    // ---------------------------------------------------------------------

    function testFuzz_compromiseCutoffOnlyMovesEarlier(
        uint64 first,
        uint64 second
    ) public {
        // Leave room for first + 1 to still be in the past.
        vm.warp(1_700_000_000);
        first = uint64(bound(uint256(first), 1, block.timestamp - 1));
        second = uint64(bound(uint256(second), 0, uint256(first) - 1));

        vm.prank(issuer);
        registry.markKeyCompromised(first);
        assertEq(registry.compromisedFrom(issuer), first);

        // Moving it later must revert. Use first + 1 (guaranteed <= block.timestamp).
        vm.prank(issuer);
        vm.expectRevert(IDocumentRegistry.CutoffMustDecrease.selector);
        registry.markKeyCompromised(first + 1);

        // Moving it earlier is accepted.
        vm.prank(issuer);
        registry.markKeyCompromised(second);
        assertEq(registry.compromisedFrom(issuer), second);
    }

    // ---------------------------------------------------------------------
    // Only the issuer can revoke their own leaves
    // ---------------------------------------------------------------------

    function testFuzz_onlyIssuerCanRevokeOwnLeaves(bytes32 leaf) public {
        bytes32 root = _anchorSingleLeafBatch(leaf, issuer, issuerKey);

        vm.prank(other);
        vm.expectRevert(
            abi.encodeWithSelector(
                IDocumentRegistry.AnchorNotFound.selector,
                other,
                root
            )
        );
        registry.revoke(root, leaf, new bytes32[](0), 0);

        bytes memory wrongSig = _signRevoke(
            root,
            leaf,
            0,
            uint256(keccak256("some-other-key"))
        );
        vm.expectRevert(IDocumentRegistry.InvalidSignature.selector);
        registry.revokeBySig(issuer, root, leaf, new bytes32[](0), 0, wrongSig);

        IDocumentRegistry.RevocationRecord memory record =
            registry.revocationOf(issuer, leaf);
        assertEq(record.timestamp, 0);
    }
}