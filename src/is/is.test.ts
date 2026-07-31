import { describe, it, expect, expectTypeOf } from "vite-plus/test";
import { is } from "./index.js";

describe("is", () => {
  it("string", () => {
    expect(is.string("a")).toBe(true);
    expect(is.string(1)).toBe(false);
  });

  it("number (excludes NaN)", () => {
    expect(is.number(1)).toBe(true);
    expect(is.number(NaN)).toBe(false);
    expect(is.number("1")).toBe(false);
  });

  it("integer", () => {
    expect(is.integer(3)).toBe(true);
    expect(is.integer(3.5)).toBe(false);
    expect(is.integer("3")).toBe(false);
  });

  it("boolean / bigint / symbol", () => {
    expect(is.boolean(true)).toBe(true);
    expect(is.boolean(0)).toBe(false);
    expect(is.bigint(1n)).toBe(true);
    expect(is.bigint(1)).toBe(false);
    expect(is.symbol(Symbol("x"))).toBe(true);
    expect(is.symbol("x")).toBe(false);
  });

  it("null / undefined / nullish", () => {
    expect(is.null(null)).toBe(true);
    expect(is.null(undefined)).toBe(false);
    expect(is.undefined(undefined)).toBe(true);
    expect(is.undefined(null)).toBe(false);
    expect(is.nullish(null)).toBe(true);
    expect(is.nullish(undefined)).toBe(true);
    expect(is.nullish(0)).toBe(false);
  });

  it("defined narrows away null and undefined", () => {
    const values: Array<number | null | undefined> = [1, null, 2, undefined, 3];
    const defined = values.filter(is.defined);
    expect(defined).toEqual([1, 2, 3]);
    expectTypeOf(defined).toEqualTypeOf<number[]>();
  });

  it("array", () => {
    expect(is.array([])).toBe(true);
    expect(is.array({})).toBe(false);
    const value: unknown = [1, 2];
    if (is.array(value)) expectTypeOf(value).toEqualTypeOf<unknown[]>();
  });

  it("plainObject", () => {
    expect(is.plainObject({ a: 1 })).toBe(true);
    expect(is.plainObject(Object.create(null))).toBe(true);
    expect(is.plainObject([])).toBe(false);
    expect(is.plainObject(new Date())).toBe(false);
    expect(is.plainObject(null)).toBe(false);
    const value: unknown = { a: 1 };
    if (is.plainObject(value)) expectTypeOf(value).toEqualTypeOf<Record<string, unknown>>();
  });

  it("function", () => {
    expect(is.function(() => {})).toBe(true);
    expect(is.function(class {})).toBe(true);
    expect(is.function({})).toBe(false);
  });

  it("date (excludes Invalid Date)", () => {
    expect(is.date(new Date())).toBe(true);
    expect(is.date(new Date("nope"))).toBe(false);
    expect(is.date("2020-01-01")).toBe(false);
  });

  it("error", () => {
    expect(is.error(new Error("x"))).toBe(true);
    expect(is.error(new TypeError("x"))).toBe(true);
    expect(is.error({ message: "x" })).toBe(false);
  });

  it("promiseLike", () => {
    expect(is.promiseLike(Promise.resolve())).toBe(true);
    // oxlint-disable-next-line unicorn/no-thenable
    expect(is.promiseLike({ then: () => {} })).toBe(true);
    expect(is.promiseLike({})).toBe(false);
    expect(is.promiseLike(null)).toBe(false);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(is)).toBe(true);
  });
});
