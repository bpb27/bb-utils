import { describe, it, expect, expectTypeOf } from "vite-plus/test";
import {
  createEnum,
  createEnumWithMeta,
  type EnumValues,
  type EnumWithMeta,
} from "./create-enum.js";

describe("createEnumWithMeta", () => {
  type StatusMeta = { label: string; color: string };

  const STATUS = {
    active: { label: "Active", color: "green" },
    inactive: { label: "Inactive", color: "red" },
    pending: { label: "Pending", color: "yellow" },
  };
  // Annotated explicitly so the `assert` narrowing test below is allowed
  // (assertion calls require an explicitly-typed call target — TS2775).
  const status: EnumWithMeta<typeof STATUS> = createEnumWithMeta(STATUS);
  type StatusKey = EnumValues<typeof status>;

  it("exposes each key as its own literal via ref", () => {
    expect(status.ref.active).toBe("active");
    expect(status.ref.active === "active").toBe(true);
    // @ts-expect-error ref values are narrowed to their key literal
    expect(status.ref.active === "fake").toBe(false);
  });

  it("exposes the source metadata via meta, strictly typed", () => {
    expect(status.meta.active.label).toBe("Active");
    expect(status.meta.active.label === "Active").toBe(true);
    // @ts-expect-error meta values are narrowed to their value type
    expect(status.meta.active.label === 1).toBe(false);
    // @ts-expect-error unknown keys are a compile error on strict meta
    expect(status.meta.fake).toBeUndefined();
  });

  it("does not alias or expose mutation of the source record", () => {
    expect(status.meta).not.toBe(STATUS);
    expect(Object.isFrozen(status.meta)).toBe(true);
    expect(Object.isFrozen(status.keys)).toBe(true);
    expect(Object.isFrozen(status.ref)).toBe(true);
  });

  it("looks up metadata for dynamic keys via get", () => {
    expect(status.get("active")).toEqual({ label: "Active", color: "green" });
    expect(status.get("fake")).toBeUndefined();
  });

  it("lists keys and values in definition order", () => {
    expect(status.keys).toEqual(["active", "inactive", "pending"]);
    expect(status.values).toEqual([
      { label: "Active", color: "green" },
      { label: "Inactive", color: "red" },
      { label: "Pending", color: "yellow" },
    ]);
  });

  it("guards known keys with contains", () => {
    expect(status.contains("active")).toBe(true);
    expect(status.contains("fake")).toBe(false);
  });

  it("asserts membership, throwing for unknown keys", () => {
    expect(() => status.assert("active")).not.toThrow();
    expect(() => status.assert("fake")).toThrow(RangeError);
  });

  it("builds a new, frozen lookup from a full mapping via remap", () => {
    const remapped = status.remap({
      active: "RUNNING",
      inactive: "STOPPED",
      pending: "WAITING",
    });
    expect(remapped.active).toBe("RUNNING");
    expect(Object.isFrozen(remapped)).toBe(true);
    // @ts-expect-error remap is strict: unknown keys are not on the result
    expect(remapped.sad).toBeUndefined();
  });

  it("narrows types (checked by tsc)", () => {
    expectTypeOf(status.ref.active).toEqualTypeOf<"active">();
    expectTypeOf(status.meta.active).toEqualTypeOf<StatusMeta>();
    expectTypeOf(status.keys).toEqualTypeOf<readonly StatusKey[]>();
    expectTypeOf(status.values).items.toEqualTypeOf<StatusMeta>();
    expectTypeOf(status.get("active")).toEqualTypeOf<StatusMeta | undefined>();

    // contains is a type guard
    const maybeKey: string = "active";
    if (status.contains(maybeKey)) {
      expectTypeOf(maybeKey).toEqualTypeOf<StatusKey>();
    }

    // assert narrows in place
    const asserted: string = "active";
    status.assert(asserted);
    expectTypeOf(asserted).toEqualTypeOf<StatusKey>();

    // remap preserves the mapping's value types
    const remapped = status.remap({
      active: "RUNNING",
      inactive: "STOPPED",
      pending: "WAITING",
    });
    expectTypeOf(remapped.active).toEqualTypeOf<string>();
  });
});

describe("createEnum", () => {
  // Variadic — the key literals are captured without `as const`.
  const mood = createEnum("happy", "sad", "neutral");
  type MoodKey = EnumValues<typeof mood>;

  it("exposes each key as its own literal via ref", () => {
    expect(mood.ref.happy).toBe("happy");
    // @ts-expect-error ref values are narrowed to their key literal
    expect(mood.ref.happy === "fake").toBe(false);
  });

  it("lists the keys, narrowed to the key union", () => {
    expect(mood.keys).toEqual(["happy", "sad", "neutral"]);
    // @ts-expect-error key elements are narrowed, so 'fake' is not assignable
    expect(mood.keys.includes("fake")).toBe(false);
  });

  it("guards and asserts membership", () => {
    expect(mood.contains("happy")).toBe(true);
    expect(mood.contains("fake")).toBe(false);
    expect(() => mood.assert("fake")).toThrow(RangeError);
  });

  it("captures literals from a spread tuple", () => {
    const arr = ["a", "b"] as const;
    const letters = createEnum(...arr);
    expect(letters.keys).toEqual(["a", "b"]);
    expectTypeOf(letters.keys).toEqualTypeOf<readonly ("a" | "b")[]>();
  });

  it("narrows types (checked by tsc)", () => {
    expectTypeOf(mood.ref.happy).toEqualTypeOf<"happy">();
    expectTypeOf(mood.keys).toEqualTypeOf<readonly MoodKey[]>();

    const maybeKey: string = "happy";
    if (mood.contains(maybeKey)) {
      expectTypeOf(maybeKey).toEqualTypeOf<MoodKey>();
    }
  });
});
