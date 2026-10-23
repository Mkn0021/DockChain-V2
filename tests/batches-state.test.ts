import { describe, expect, it } from "bun:test";

import { canTransition } from "../src/features/batches/batch.state";

describe("batch state machine", () => {
  it("allows signed → submitted", () => {
    expect(canTransition("signed", "submitted")).toBe(true);
  });

  it("allows signed → confirmed", () => {
    expect(canTransition("signed", "confirmed")).toBe(true);
  });

  it("allows signed → failed", () => {
    expect(canTransition("signed", "failed")).toBe(true);
  });

  it("allows submitted → confirmed", () => {
    expect(canTransition("submitted", "confirmed")).toBe(true);
  });

  it("allows failed → signed", () => {
    expect(canTransition("failed", "signed")).toBe(true);
  });

  it("allows failed → confirmed", () => {
    expect(canTransition("failed", "confirmed")).toBe(true);
  });

  it("rejects confirmed → anything", () => {
    expect(canTransition("confirmed", "signed")).toBe(false);
    expect(canTransition("confirmed", "submitted")).toBe(false);
    expect(canTransition("confirmed", "failed")).toBe(false);
  });

  it("rejects cancelled → anything", () => {
    expect(canTransition("cancelled", "signed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });

  it("rejects awaiting_signature → confirmed", () => {
    expect(canTransition("awaiting_signature", "confirmed")).toBe(false);
  });
});
