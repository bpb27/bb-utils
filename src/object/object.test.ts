import { describe, it, expect } from "vitest";
import { object } from "./index.js";
import { typedKeys } from "./typed-keys.js";
import { typedValues } from "./typed-values.js";
import { typedEntries } from "./typed-entries.js";
import { typedFromEntries } from "./typed-from-entries.js";
import { fromKeys } from "./from-keys.js";

describe("object namespace", () => {
  it("exposes every util under one namespace", () => {
    expect(object.typedKeys).toBe(typedKeys);
    expect(object.typedValues).toBe(typedValues);
    expect(object.typedEntries).toBe(typedEntries);
    expect(object.typedFromEntries).toBe(typedFromEntries);
    expect(object.fromKeys).toBe(fromKeys);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(object)).toBe(true);
  });

  it("routes calls through to the utils", () => {
    expect(object.typedKeys({ x: 1, y: 2 })).toEqual(["x", "y"]);
    expect(object.fromKeys(["a", "bb"], (k) => k.length)).toEqual({ a: 1, bb: 2 });
  });
});
