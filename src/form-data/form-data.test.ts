import { describe, it, expect, expectTypeOf } from "vite-plus/test";
import { createEnum } from "../enum/create-enum.js";
import type { Infer } from "../schema/infer.js";
import { createFormDataSchema, SchemaError } from "./form-data.js";

const status = createEnum("active", "inactive");

const fd = createFormDataSchema({
  title: { type: "string", required: true },
  count: { type: "number", default: 0 },
  tags: { type: "strings" },
  status: { type: "enum", enum: status },
  avatar: { type: "file" },
  docs: { type: "files" },
});

function fullForm(): FormData {
  const form = new FormData();
  form.set("title", "Hello");
  form.set("count", "3");
  form.append("tags", "a");
  form.append("tags", "b");
  form.set("status", "active");
  form.set("avatar", new File(["x"], "a.png", { type: "image/png" }));
  form.append("docs", new File(["1"], "one.txt"));
  form.append("docs", new File(["2"], "two.txt"));
  return form;
}

describe("createFormDataSchema", () => {
  describe("parse", () => {
    it("decodes scalars, repeated-entry lists, and files", () => {
      const parsed = fd.parse(fullForm());
      expect(parsed.title).toBe("Hello");
      expect(parsed.count).toBe(3);
      expect(parsed.tags).toEqual(["a", "b"]);
      expect(parsed.status).toBe("active");
      expect(parsed.avatar).toBeInstanceOf(File);
      expect(parsed.avatar?.name).toBe("a.png");
      expect(parsed.docs?.map((f) => f.name)).toEqual(["one.txt", "two.txt"]);
    });

    it("applies defaults and omits absent optional fields", () => {
      const form = new FormData();
      form.set("title", "x");
      expect(fd.parse(form)).toEqual({ title: "x", count: 0 });
    });

    it("throws a SchemaError listing a missing required field", () => {
      const form = new FormData();
      form.set("count", "2");
      expect(() => fd.parse(form)).toThrow(SchemaError);
      const result = fd.safeParse(form);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual([
          { field: "title", value: null, code: "missing", message: expect.any(String) },
        ]);
      }
    });

    it("reports a file supplied where text is expected", () => {
      const form = new FormData();
      form.set("title", new File(["x"], "x.txt"));
      const result = fd.safeParse(form);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({ field: "title", code: "invalid" });
      }
    });

    it("reports text supplied where a file is expected", () => {
      const form = new FormData();
      form.set("title", "x");
      form.set("avatar", "not-a-file");
      const result = fd.safeParse(form);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({ field: "avatar", code: "invalid" });
      }
    });
  });

  describe("dropInvalid lists", () => {
    const schema = createFormDataSchema({
      nums: { type: "numbers", dropInvalid: true },
    });

    it("keeps valid entries and drops invalid ones", () => {
      const form = new FormData();
      form.append("nums", "1");
      form.append("nums", "x");
      form.append("nums", "3");
      expect(schema.parse(form)).toEqual({ nums: [1, 3] });
    });
  });

  describe("serialize", () => {
    it("appends one entry per list element and round-trips", () => {
      const form = fd.serialize({
        title: "Hello",
        count: 3,
        tags: ["a", "b"],
        status: "active",
      });
      expect(form.getAll("tags")).toEqual(["a", "b"]);
      expect(form.get("count")).toBe("3");

      const parsed = fd.parse(form);
      expect(parsed).toMatchObject({
        title: "Hello",
        count: 3,
        tags: ["a", "b"],
        status: "active",
      });
    });

    it("skips undefined fields", () => {
      const form = fd.serialize({ title: "x" });
      expect(form.has("count")).toBe(false);
      expect(form.get("title")).toBe("x");
    });
  });

  describe("validate", () => {
    const schema = createFormDataSchema({
      avatar: { type: "file", validate: (f) => f.name.endsWith(".png") || "must be a .png" },
    });

    it("validates a decoded File and uses the returned message", () => {
      const form = new FormData();
      form.set("avatar", new File(["x"], "doc.txt"));
      const result = schema.safeParse(form);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          field: "avatar",
          message: "must be a .png",
        });
      }
    });

    it("passes a valid File", () => {
      const form = new FormData();
      form.set("avatar", new File(["x"], "pic.png"));
      expect(schema.parse(form).avatar?.name).toBe("pic.png");
    });

    it("types the validate argument as File (checked by tsc)", () => {
      createFormDataSchema({
        avatar: {
          type: "file",
          validate: (f) => {
            expectTypeOf(f).toEqualTypeOf<File>();
            return true;
          },
        },
      });
    });
  });

  it("infers the parsed shape, including File values (checked by tsc)", () => {
    const parsed = fd.parse(fullForm());
    expectTypeOf(parsed).toEqualTypeOf<{
      title: string;
      count: number;
      tags?: string[];
      status?: "active" | "inactive";
      avatar?: File;
      docs?: File[];
    }>();
  });

  it("Infer works on a form-data schema too (checked by tsc)", () => {
    expectTypeOf<Infer<typeof fd>>().toEqualTypeOf<{
      title: string;
      count: number;
      tags?: string[];
      status?: "active" | "inactive";
      avatar?: File;
      docs?: File[];
    }>();
  });
});
