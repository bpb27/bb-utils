import { describe, it, expect, expectTypeOf } from "vite-plus/test";
import { createEnum, createEnumWithMeta } from "../enum/create-enum.js";
import type { Infer, InferInput } from "../schema/infer.js";
import { createQueryParamsSchema, SchemaError } from "./query-params.js";

const status = createEnum("active", "inactive");

const qp = createQueryParamsSchema({
  q: { type: "string" },
  page: { type: "number", default: 1 },
  tags: { type: "strings" },
  active: { type: "boolean", default: false },
  status: { type: "enum", enum: status },
  roles: { type: "enums", enum: status },
});

describe("createQueryParamsSchema", () => {
  describe("parse", () => {
    it("applies defaults for missing fields and omits the rest", () => {
      expect(qp.parse("q=shoes")).toEqual({ q: "shoes", page: 1, active: false });
    });

    it("decodes every field type", () => {
      expect(
        qp.parse("q=shoes&page=2&active=true&status=active&tags=a,b&roles=active,inactive"),
      ).toEqual({
        q: "shoes",
        page: 2,
        active: true,
        status: "active",
        tags: ["a", "b"],
        roles: ["active", "inactive"],
      });
    });

    it('tolerates a leading "?"', () => {
      expect(qp.parse("?page=5")).toEqual({ page: 5, active: false });
    });

    it("accepts URLSearchParams", () => {
      expect(qp.parse(new URLSearchParams("page=7"))).toEqual({ page: 7, active: false });
    });

    it("throws a SchemaError on a value that fails to decode", () => {
      expect(() => qp.parse("page=abc")).toThrow(SchemaError);
      expect(() => qp.parse("status=nope")).toThrow(SchemaError);
    });
  });

  describe("serialize", () => {
    it("encodes provided fields in schema order", () => {
      expect(qp.serialize({ q: "shoes", page: 2 })).toBe("q=shoes&page=2");
    });

    it("skips undefined fields", () => {
      expect(qp.serialize({ q: "x", page: undefined })).toBe("q=x");
    });

    it("round-trips a full value object", () => {
      const values: Parameters<typeof qp.serialize>[0] = {
        q: "shoes",
        page: 2,
        active: true,
        status: "active",
        tags: ["a", "b"],
        roles: ["active", "inactive"],
      };
      expect(qp.parse(qp.serialize(values))).toEqual(values);
    });
  });

  it("supports createEnumWithMeta enums and still infers their keys", () => {
    const priority = createEnumWithMeta({ low: { weight: 1 }, high: { weight: 2 } });
    const withMeta = createQueryParamsSchema({ p: { type: "enum", enum: priority } });

    expect(withMeta.parse("p=low")).toEqual({ p: "low" });
    expect(() => withMeta.parse("p=nope")).toThrow(SchemaError);

    const parsed = withMeta.parse("p=low");
    expectTypeOf(parsed.p).toEqualTypeOf<"low" | "high" | undefined>();
  });

  it("accepts an enum default as a raw key or a ref member", () => {
    const raw = createQueryParamsSchema({
      s: { type: "enum", enum: status, default: "active" },
    });
    const viaRef = createQueryParamsSchema({
      s: { type: "enum", enum: status, default: status.ref.inactive },
    });
    const list = createQueryParamsSchema({
      s: { type: "enums", enum: status, default: ["active"] },
    });

    expect(raw.parse("")).toEqual({ s: "active" });
    expect(viaRef.parse("")).toEqual({ s: "inactive" });
    expect(list.parse("")).toEqual({ s: ["active"] });
  });

  it("throws at construction when an enum default is not one of the keys", () => {
    expect(() =>
      createQueryParamsSchema({ s: { type: "enum", enum: status, default: "nope" } }),
    ).toThrow(/not a member/);
    expect(() =>
      createQueryParamsSchema({ roles: { type: "enums", enum: status, default: ["nope"] } }),
    ).toThrow(/not a member/);
  });

  it("exposes the source schema and is frozen", () => {
    expect(qp.schema.page).toEqual({ type: "number", default: 1 });
    expect(Object.isFrozen(qp)).toBe(true);
  });

  describe("required fields", () => {
    const sso = createQueryParamsSchema({
      code: { type: "string", required: true },
      state: { type: "string", required: true },
    });

    it("parses when required fields are present", () => {
      expect(sso.parse("code=abc&state=xyz")).toEqual({ code: "abc", state: "xyz" });
    });

    it('reports a "missing" issue for an absent required field', () => {
      const result = sso.safeParse("code=abc");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual([
          { field: "state", value: null, code: "missing", message: expect.any(String) },
        ]);
      }
    });
  });

  describe("catch", () => {
    const lenient = createQueryParamsSchema({
      filter: { type: "enum", enum: status, default: "active", catch: true },
      sort: { type: "string", catch: true },
    });

    it("falls back to the default on an invalid value", () => {
      expect(lenient.parse("filter=deprecated")).toEqual({ filter: "active" });
    });

    it("omits a caught field with no default", () => {
      // `sort` is a string, which can never fail to decode, so force a failure
      // via an enum instead to prove "caught + no default => omitted".
      const s = createQueryParamsSchema({
        f: { type: "enum", enum: status, catch: true },
      });
      expect(s.parse("f=nope")).toEqual({});
    });

    it("never throws for caught fields", () => {
      expect(() => lenient.parse("filter=nope&sort=anything")).not.toThrow();
    });
  });

  describe("dropInvalid arrays", () => {
    const schema = createQueryParamsSchema({
      roles: { type: "enums", enum: status, dropInvalid: true },
      ids: { type: "numbers", dropInvalid: true },
    });

    it("keeps valid elements and drops invalid ones", () => {
      expect(schema.parse("roles=active,nope,inactive&ids=1,x,3")).toEqual({
        roles: ["active", "inactive"],
        ids: [1, 3],
      });
    });

    it("yields an empty array when every element is invalid", () => {
      expect(schema.parse("roles=nope,bad")).toEqual({ roles: [] });
    });
  });

  describe("safeParse", () => {
    it("returns success with data when valid", () => {
      const result = qp.safeParse("q=x&page=2");
      expect(result).toEqual({ success: true, data: { q: "x", page: 2, active: false } });
    });

    it("returns failure with a SchemaError when invalid", () => {
      const result = qp.safeParse("page=abc");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SchemaError);
        expect(result.error.issues[0]).toMatchObject({ field: "page", code: "invalid" });
      }
    });
  });

  describe("validate", () => {
    const v = createQueryParamsSchema({
      age: { type: "number", validate: (n) => n >= 18 },
      email: { type: "string", validate: (s) => /@/.test(s) || "must be an email" },
    });

    it("passes when the validator returns true", () => {
      expect(v.parse("age=20&email=a@b.com")).toEqual({ age: 20, email: "a@b.com" });
    });

    it("fails with a generic message when the validator returns false", () => {
      const result = v.safeParse("age=10&email=a@b.com");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({ field: "age", code: "invalid" });
      }
    });

    it("uses a returned string as the failure message", () => {
      const result = v.safeParse("age=20&email=nope");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          field: "email",
          message: "must be an email",
        });
      }
    });

    it("treats a thrown error as invalid", () => {
      const s = createQueryParamsSchema({
        n: {
          type: "number",
          validate: (n) => {
            if (n < 0) throw new Error("must be non-negative");
            return true;
          },
        },
      });
      const result = s.safeParse("n=-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("must be non-negative");
      }
    });

    it("routes a validation failure through catch", () => {
      const s = createQueryParamsSchema({
        n: { type: "number", default: 0, catch: true, validate: (n) => n >= 1 },
      });
      expect(s.parse("n=-5")).toEqual({ n: 0 });
    });

    it("types the validate argument per field (checked by tsc)", () => {
      createQueryParamsSchema({
        age: {
          type: "number",
          validate: (n) => {
            expectTypeOf(n).toEqualTypeOf<number>();
            return true;
          },
        },
        tags: {
          type: "strings",
          validate: (t) => {
            expectTypeOf(t).toEqualTypeOf<string[]>();
            return true;
          },
        },
      });
    });
  });

  it("Infer / InferInput extract the schema types (checked by tsc)", () => {
    // Infer resolves to the concrete parsed shape
    expectTypeOf<Infer<typeof qp>>().toEqualTypeOf<{
      page: number;
      active: boolean;
      q?: string;
      tags?: string[];
      status?: "active" | "inactive";
      roles?: ("active" | "inactive")[];
    }>();

    // ...and the helpers match what parse returns / serialize accepts
    expectTypeOf<Infer<typeof qp>>().toEqualTypeOf<ReturnType<typeof qp.parse>>();
    expectTypeOf<InferInput<typeof qp>>().toEqualTypeOf<Parameters<typeof qp.serialize>[0]>();
  });

  it("infers required fields as present (checked by tsc)", () => {
    const s = createQueryParamsSchema({
      code: { type: "string", required: true },
      opt: { type: "string" },
    });
    const parsed = s.parse("code=x");
    expectTypeOf(parsed).toEqualTypeOf<{ code: string; opt?: string }>();
  });

  it("infers the parsed shape (checked by tsc)", () => {
    const parsed = qp.parse("q=x");

    // defaults => required; no default => optional
    expectTypeOf(parsed).toEqualTypeOf<{
      page: number;
      active: boolean;
      q?: string;
      tags?: string[];
      status?: "active" | "inactive";
      roles?: ("active" | "inactive")[];
    }>();

    // enum keys are inferred, not widened to string
    expectTypeOf(parsed.status).toEqualTypeOf<"active" | "inactive" | undefined>();
    expectTypeOf(parsed.roles).toEqualTypeOf<("active" | "inactive")[] | undefined>();
  });
});
