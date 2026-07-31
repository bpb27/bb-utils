import type { EnumApi } from "../enum/create-enum.js";

/**
 * A bidirectional string codec: `encode` turns a typed value into its string
 * form, `decode` parses it back. Used by schema-driven (de)serializers such as
 * {@link createQueryParamsSchema} — and, later, a form-data equivalent — so the
 * per-type conversion logic lives in one place.
 *
 * @typeParam T - The decoded (typed) value.
 */
export interface Codec<T> {
  /** Turn a typed value into its string representation. */
  encode: (value: T) => string;
  /**
   * Parse a string back into its typed value.
   *
   * @throws {TypeError} If the string is not valid for this codec.
   */
  decode: (value: string) => T;
}

/**
 * A {@link Codec} for a list value, built over an element codec. Adds
 * {@link ArrayCodec.decodeLenient} for dropping invalid elements instead of
 * failing the whole field.
 */
export interface ArrayCodec<T> extends Codec<T[]> {
  /** Decode, silently dropping elements that fail rather than throwing. */
  decodeLenient: (value: string) => T[];
}

/** Any enum produced by `createEnum` / `createEnumWithMeta`. */
type AnyEnum = EnumApi<string>;

const SEPARATOR = ",";

/** Lift a scalar codec into a comma-separated list codec. */
function arrayOf<T>(element: Codec<T>): ArrayCodec<T> {
  return {
    encode: (values) => values.map(element.encode).join(SEPARATOR),
    decode: (value) => (value === "" ? [] : value.split(SEPARATOR).map(element.decode)),
    decodeLenient: (value) => {
      if (value === "") return [];
      const out: T[] = [];
      for (const part of value.split(SEPARATOR)) {
        try {
          out.push(element.decode(part));
        } catch {
          // drop invalid element
        }
      }
      return out;
    },
  };
}

const stringCodec: Codec<string> = {
  encode: (value) => value,
  decode: (value) => value,
};

const numberCodec: Codec<number> = {
  encode: (value) => value.toString(),
  decode: (value) => {
    const num = Number(value);
    if (value.trim() === "" || Number.isNaN(num)) {
      throw new TypeError(`Invalid number: ${value}`);
    }
    return num;
  },
};

const booleanCodec: Codec<boolean> = {
  encode: (value) => {
    if (value === true) return "true";
    if (value === false) return "false";
    throw new TypeError(`Invalid boolean: ${String(value)}`);
  },
  decode: (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new TypeError(`Invalid boolean: ${value}`);
  },
};

const enumCodec = <K extends string>(enumApi: EnumApi<K>): Codec<K> => ({
  encode: (value) => {
    if (!enumApi.contains(value)) {
      throw new TypeError(`Invalid enum value: ${String(value)}`);
    }
    return value;
  },
  decode: (value) => {
    if (!enumApi.contains(value)) {
      throw new TypeError(`Invalid enum value: ${value}`);
    }
    return value;
  },
});

/**
 * The registry of built-in string codecs, keyed by schema `type`. Scalar codecs
 * are nullary factories; `enum`/`enums` take the enum to validate against.
 */
export const codecs = Object.freeze({
  string: (): Codec<string> => stringCodec,
  strings: (): ArrayCodec<string> => arrayOf(stringCodec),
  number: (): Codec<number> => numberCodec,
  numbers: (): ArrayCodec<number> => arrayOf(numberCodec),
  boolean: (): Codec<boolean> => booleanCodec,
  enum: <K extends string>(enumApi: EnumApi<K>): Codec<K> => enumCodec(enumApi),
  enums: <K extends string>(enumApi: EnumApi<K>): ArrayCodec<K> => arrayOf(enumCodec(enumApi)),
});

export type { AnyEnum };
