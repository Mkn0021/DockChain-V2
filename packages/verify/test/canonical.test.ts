import { describe, expect, it } from "bun:test";

import { canonicalJson } from "../src/canonical";

describe("canonicalJson", () => {
  it("sorts top-level keys", () => {
    expect(canonicalJson({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });

  it("sorts nested object keys", () => {
    expect(canonicalJson({ a: { c: 3, d: 4 }, b: 1 })).toBe(
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
