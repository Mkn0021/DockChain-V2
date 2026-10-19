import type { BatchStatus } from "./batch.model";

const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  awaiting_signature: ["signed", "cancelled"],
  cancelled: [],
  confirmed: [],
  failed: ["signed"],
  open: ["awaiting_signature", "cancelled"],
  signed: ["submitted", "failed"],
  submitted: ["confirmed", "failed"],
};

export const canTransition = (from: BatchStatus, to: BatchStatus): boolean =>
  TRANSITIONS[from].includes(to);

export const assertTransition = (from: BatchStatus, to: BatchStatus): void => {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid batch transition: ${from} → ${to}`);
  }
};
