import { describe, it, expect, expectTypeOf } from "vitest";
import { typedKeys } from "./typed-keys.js";

describe("typedKeys", () => {
  const point = { x: 1, y: 2, label: "p" };

  it("returns the object keys", () => {
    expect(typedKeys(point)).toEqual(["x", "y", "label"]);
  });

  it("types the result as the key union (checked by tsc)", () => {
    expectTypeOf(typedKeys(point)).toEqualTypeOf<("x" | "y" | "label")[]>();
  });
});
