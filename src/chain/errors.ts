import { BaseError, ContractFunctionRevertedError } from "viem";

import { AppError } from "../shared/errors";

const RETRYABLE_PATTERNS = [
  "timeout",
  "replacement underpriced",
  "nonce too low",
  "already known",
  "rate limit",
  "connection",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "fetch failed",
];

export const isRetryableChainError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
};

const errorNameToAppError = (name: string | undefined): AppError | null => {
  switch (name) {
    case "AlreadyAnchored": {
      return AppError.conflict("Root already anchored for this issuer");
    }
    case "InvalidSignature": {
      return AppError.validation("Invalid signature");
    }
    case "InvalidCount": {
      return AppError.validation("Count must be greater than zero");
    }
    case "InvalidWindow": {
      return AppError.validation("windowStart must be <= windowEnd");
    }
    case "AnchorNotFound": {
      return AppError.notFound("Anchor not found");
    }
    case "InvalidProof": {
      return AppError.validation("Merkle proof is invalid");
    }
    case "AlreadyRevoked": {
      return AppError.conflict("Leaf already revoked");
    }
    case "InvalidReason": {
      return AppError.validation("Reason code must be 0-4");
    }
    case "InvalidCutoff": {
      return AppError.validation("Cutoff must not be in the future");
    }
    case "CutoffMustDecrease": {
      return AppError.conflict("Cutoff can only move earlier");
    }
    default: {
      return null;
    }
  }
};

const isContractFunctionRevertedError = (value: unknown): boolean =>
  value instanceof ContractFunctionRevertedError;

export const decodeRegistryError = (error: unknown): AppError => {
  if (error instanceof BaseError) {
    const revert = error.walk(isContractFunctionRevertedError);

    if (revert instanceof ContractFunctionRevertedError) {
      const mapped = errorNameToAppError(revert.data?.errorName);
      if (mapped) {
        return mapped;
      }
    }
  }

  if (isRetryableChainError(error)) {
    return AppError.internal(
      `Retryable chain error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return AppError.internal(
    error instanceof Error ? error.message : "Unknown chain error"
  );
};
