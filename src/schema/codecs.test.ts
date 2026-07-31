import { describe, it, expect } from "vitest";
import { createEnum } from "../enum/create-enum.js";
import { codecs } from "./codecs.js";

describe("codecs", () => {
  describe("scalar codecs round-trip", () => {
    it("number", () => {
      const c = codecs.number();
      expect(c.encode(42)).toBe("42");
      expect(c.decode("42")).toBe(42);
      expect(() => c.decode("nope")).toThrow(TypeError);
      expect(() => c.decode("")).toThrow(TypeError);
    });

    it("boolean", () => {
      const c = codecs.boolean();
      expect(c.encode(true)).toBe("true");
      expect(c.decode("false")).toBe(false);
      expect(() => c.decode("yes")).toThrow(TypeError);
    });

    it("enum", () => {
      const c = codecs.enum(createEnum("a", "b"));
      expect(c.decode("a")).toBe("a");
      expect(() => c.decode("z")).toThrow(TypeError);
    });
  });

  describe("array codecs", () => {
    it("encode/decode a list", () => {
      const c = codecs.numbers();
      expect(c.encode([1, 2, 3])).toBe("1,2,3");
      expect(c.decode("1,2,3")).toEqual([1, 2, 3]);
    });

    it("decodes an empty string to an empty array", () => {
      expect(codecs.strings().decode("")).toEqual([]);
      expect(codecs.numbers().decode("")).toEqual([]);
    });

    it("decode throws on any invalid element", () => {
      expect(() => codecs.numbers().decode("1,x,3")).toThrow(TypeError);
    });

    it("decodeLenient drops invalid elements", () => {
      expect(codecs.numbers().decodeLenient("1,x,3")).toEqual([1, 3]);
      expect(codecs.enums(createEnum("a", "b")).decodeLenient("a,z,b")).toEqual(["a", "b"]);
      expect(codecs.numbers().decodeLenient("x,y")).toEqual([]);
    });
  });
});
