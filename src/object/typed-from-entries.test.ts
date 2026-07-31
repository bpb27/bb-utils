import { describe, it, expect, expectTypeOf } from "vite-plus/test";
import { typedFromEntries } from "./typed-from-entries.js";

describe("typedFromEntries", () => {
  it("builds an object from entries", () => {
    const obj = typedFromEntries([
      ["a", 1],
      ["b", 2],
    ] as const);
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it("types the result as a record of the key/value unions (checked by tsc)", () => {
    const obj = typedFromEntries([
      ["a", 1],
      ["b", 2],
    ] as const);
    expectTypeOf(obj).toEqualTypeOf<Record<"a" | "b", 1 | 2>>();
  });
});
