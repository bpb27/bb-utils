import { createEnum } from "../enum/create-enum";
import type { Infer } from "../schema/infer";
import { createQueryParamsSchema, SchemaError } from "./query-params";
import { describe, test, expect, expectTypeOf } from "vite-plus/test";

describe("Human written createQueryParamsSchema test", () => {
  test("it works", () => {
    const MODE = createEnum("dense", "loose");
    const FILTER = createEnum("finance", "performance", "users");

    type Schema = Infer<typeof schema>;

    const schema = createQueryParamsSchema({
      search: { type: "string" },
      tags: { type: "strings" },
      age: { type: "number" },
      productIds: { type: "numbers" },
      active: { type: "boolean" },
      mode: { type: "enum", enum: MODE },
      filter: { type: "enums", enum: FILTER },
    });

    const str = [
      "search=hello",
      "tags=tag1,tag2",
      "age=30",
      "productIds=1,2",
      "active=true",
      "mode=dense",
      "filter=finance,users",
    ].join("&");

    const expectedParsed: Schema = {
      search: "hello",
      tags: ["tag1", "tag2"],
      age: 30,
      productIds: [1, 2],
      active: true,
      mode: "dense",
      filter: ["finance", "users"],
    };

    const parsed = schema.parse(str);
    expect(parsed).toEqual<Schema>(expectedParsed);

    const safeParsed = schema.safeParse(str);
    if (safeParsed.success) expect(safeParsed.data).toEqual<Schema>(expectedParsed);

    const serialized = schema.serialize(parsed);
    expect(serialized).toEqual<string>(str.replaceAll(",", "%2C"));

    const partialParsed = schema.parse("search=hi");
    expect(partialParsed).toEqual<Schema>({ search: "hi" });

    const partialSerialized = schema.serialize(partialParsed);
    expect(partialSerialized).toEqual<string>("search=hi");

    expect(() => schema.parse("age=nope")).toThrow(SchemaError);
    expect(() => schema.parse("productIds=nope")).toThrow(SchemaError);
    expect(() => schema.parse("productIds=1,nope")).toThrow(SchemaError);
    expect(() => schema.parse("active=nope")).toThrow(SchemaError);
    expect(() => schema.parse("mode=nope")).toThrow(SchemaError);
    expect(() => schema.parse("filter=nope")).toThrow(SchemaError);
    expect(() => schema.parse("filter=users,nope")).toThrow(SchemaError);

    expect(schema.safeParse("age=nope").success).toEqual(false);
    expect(schema.safeParse("productIds=nope").success).toEqual(false);
    expect(schema.safeParse("productIds=1,nope").success).toEqual(false);
    expect(schema.safeParse("active=nope").success).toEqual(false);
    expect(schema.safeParse("mode=nope").success).toEqual(false);
    expect(schema.safeParse("filter=nope").success).toEqual(false);
    expect(schema.safeParse("filter=users,nope").success).toEqual(false);

    expect(() =>
      schema.serialize({
        // @ts-expect-error - invalid type
        search: 1,
        // @ts-expect-error - invalid type
        tags: 1,
        // @ts-expect-error - invalid type
        age: "1",
        // @ts-expect-error - invalid type
        productIds: "1",
        // @ts-expect-error - invalid type
        active: 1,
        // @ts-expect-error - invalid type
        mode: 1,
        // @ts-expect-error - invalid type
        filter: 1,
      }),
    ).toThrow();
  });

  test("modes", () => {
    const withDefault = createQueryParamsSchema({
      search: { type: "string", default: "" },
    });

    expect(withDefault.parse("")).toEqual({ search: "" });
    expectTypeOf(withDefault.parse("")).toEqualTypeOf<{ search: string }>();
    expect(() => withDefault.serialize({})).not.toThrow();

    const withRequired = createQueryParamsSchema({
      search: { type: "string", required: true },
    });

    expect(() => withRequired.parse("")).toThrow(SchemaError);
    expectTypeOf(withRequired.parse("search=a")).toEqualTypeOf<{ search: string }>();
    expect(() =>
      // @ts-expect-error - search is required
      withRequired.serialize({}),
    ).toThrow(SchemaError);
    expect(withRequired.serialize({ search: "a" })).toEqual<string>("search=a");

    const withCatch = createQueryParamsSchema({
      search: { type: "string", catch: true },
    });

    expect(withCatch.parse("")).toEqual({ search: undefined });
    expectTypeOf(withCatch.parse("search=a")).toEqualTypeOf<{ search?: string }>();

    const withDefaultAndCatch = createQueryParamsSchema({
      search: { type: "string", catch: true, default: "" },
    });

    expect(withDefaultAndCatch.parse("")).toEqual({ search: "" });
    expectTypeOf(withDefaultAndCatch.parse("")).toEqualTypeOf<{ search: string }>();
  });
});
