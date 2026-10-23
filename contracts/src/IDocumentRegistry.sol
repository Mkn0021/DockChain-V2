// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IDocumentRegistry {
    struct AnchorRecord {
        uint64 timestamp;
        uint32 count;
    }

    struct RevocationRecord {
        uint64 timestamp;
        uint8 reason;
    }

    error AlreadyAnchored(address issuer, bytes32 root);
    error InvalidSignature();
    error InvalidCount();
    error InvalidWindow();
    error AnchorNotFound(address issuer, bytes32 root);
    error InvalidProof();
    error AlreadyRevoked(address issuer, bytes32 leaf);
    error InvalidReason();
    error InvalidCutoff();
    error CutoffMustDecrease();

    event Anchored(
        address indexed issuer,
        bytes32 indexed root,
        uint32 count,
        uint64 windowStart,
        uint64 windowEnd,
        bytes32 dataHash
    );

    event Revoked(
        address indexed issuer,
        bytes32 indexed root,
        bytes32 indexed leaf,
        uint8 reason
    );

    event KeyCompromised(address indexed issuer, uint64 cutoff);

    function anchor(
        bytes32 root,
        uint32 count,
        uint64 windowStart,
        uint64 windowEnd,
        address issuer,
        bytes calldata data,
        bytes calldata signature
    ) external;

    function revoke(
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8 reason
    ) external;

    function revokeBySig(
        address issuer,
        bytes32 root,
        bytes32 leaf,
        bytes32[] calldata proof,
        uint8 reason,
        bytes calldata signature
    ) external;

    function markKeyCompromised(uint64 cutoff) external;

    function anchorOf(address issuer, bytes32 root)
        external
        view
        returns (AnchorRecord memory);

    function revocationOf(address issuer, bytes32 leaf)
        external
        view
        returns (RevocationRecord memory);

    function compromisedFrom(address issuer) external view returns (uint64);
}