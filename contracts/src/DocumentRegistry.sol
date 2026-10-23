// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IDocumentRegistry} from "./IDocumentRegistry.sol";

contract DocumentRegistry is IDocumentRegistry, EIP712 {
    bytes32 public constant ANCHOR_TYPEHASH = keccak256(
        "Anchor(bytes32 root,uint32 count,uint64 windowStart,uint64 windowEnd,bytes32 dataHash,address issuer)"
    );

    bytes32 public constant REVOKE_TYPEHASH = keccak256(
        "Revoke(bytes32 root,bytes32 leaf,uint8 reason,address issuer)"
    );

    mapping(address => mapping(bytes32 => AnchorRecord)) private _anchors;
    mapping(address => mapping(bytes32 => RevocationRecord)) private _revocations;
    mapping(address => uint64) private _compromisedFrom;

    constructor() EIP712("DockChainRegistry", "1") {}

    function anchor(
        bytes32 root,
        uint32 count,
        uint64 windowStart,
        uint64 windowEnd,
        address issuer,
        bytes calldata data,
        bytes calldata signature
    ) external override {
        if (count == 0) revert InvalidCount();
        if (windowStart > windowEnd) revert InvalidWindow();
        if (_anchors[issuer][root].timestamp != 0) {
            revert AlreadyAnchored(issuer, root);
        }

        bytes32 dataHash = keccak256(data);
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ANCHOR_TYPEHASH,
                    root,
                    count,
                    windowStart,
                    windowEnd,
                    dataHash,
                    issuer
                )
            )
        );

        if (!SignatureChecker.isValidSignatureNow(issuer, digest, signature)) {
            revert InvalidSignature();
        }

        _anchors[issuer][root] = AnchorRecord({
            timestamp: uint64(block.timestamp),
            count: count
        });

        emit Anchored(issuer, root, count, windowStart, windowEnd, dataHash);
    }

    function revoke(
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8 reason
    ) external override {
        _revoke(msg.sender, root, leaf, proof, reason);
    }

    function revokeBySig(
        address issuer,
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8 reason,
        bytes calldata signature
    ) external override {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(REVOKE_TYPEHASH, root, leaf, reason, issuer))
        );

        if (!SignatureChecker.isValidSignatureNow(issuer, digest, signature)) {
            revert InvalidSignature();
        }

        _revoke(issuer, root, leaf, proof, reason);
    }

    function _revoke(
        address issuer,
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8 reason
    ) internal {
        if (_anchors[issuer][root].timestamp == 0) {
            revert AnchorNotFound(issuer, root);
        }
        if (reason > 4) revert InvalidReason();
        if (_revocations[issuer][leaf].timestamp != 0) {
            revert AlreadyRevoked(issuer, leaf);
        }

        bytes32 computedLeaf = keccak256(
            bytes.concat(keccak256(abi.encode(leaf)))
        );
        if (!MerkleProof.verify(proof, root, computedLeaf)) {
            revert InvalidProof();
        }

        _revocations[issuer][leaf] = RevocationRecord({
            timestamp: uint64(block.timestamp),
            reason: reason
        });

        emit Revoked(issuer, root, leaf, reason);
    }

    function markKeyCompromised(uint64 cutoff) external override {
        if (cutoff > block.timestamp) revert InvalidCutoff();

        uint64 current = _compromisedFrom[msg.sender];

        if (current != 0 && cutoff > current) {
            revert CutoffMustDecrease();
        }

        _compromisedFrom[msg.sender] = cutoff;

        emit KeyCompromised(msg.sender, cutoff);
    }

    function anchorOf(address issuer, bytes32 root)
        external
        view
        override
        returns (AnchorRecord memory)
    {
        return _anchors[issuer][root];
    }

    function revocationOf(address issuer, bytes32 leaf)
        external
        view
        override
        returns (RevocationRecord memory)
    {
        return _revocations[issuer][leaf];
    }

    function compromisedFrom(address issuer)
        external
        view
        override
        returns (uint64)
    {
        return _compromisedFrom[issuer];
    }
}