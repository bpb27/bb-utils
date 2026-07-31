import { describe, it, expect, expectTypeOf } from "vitest";
import { fromKeys } from "./from-keys.js";

describe("fromKeys", () => {
  it("builds an object keyed by the given keys", () => {
    const lengths = fromKeys(["a", "bb", "ccc"], (key) => key.length);
    expect(lengths).toEqual({ a: 1, bb: 2, ccc: 3 });
  });

  it("passes each key to the value factory", () => {
    const upper = fromKeys(["a", "b"], (key) => key.toUpperCase());
    expect(upper).toEqual({ a: "A", b: "B" });
  });

  it("types the result as a record of keys to the value type (checked by tsc)", () => {
    const lengths = fromKeys(["a", "bb"] as const, (key) => key.length);
    expectTypeOf(lengths).toEqualTypeOf<Record<"a" | "bb", number>>();
  });
});
