import type { EnumApi } from '../enum/create-enum.js';

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

/** Any enum produced by `createEnum` / `createEnumWithMeta`. */
type AnyEnum = EnumApi<string>;

const string = (): Codec<string> => ({
  encode: (value) => value,
  decode: (value) => value,
});

const strings = (): Codec<string[]> => ({
  encode: (values) => values.join(','),
  decode: (value) => value.split(','),
});

const number = (): Codec<number> => ({
  encode: (value) => value.toString(),
  decode: (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new TypeError(`Invalid number: ${value}`);
    }
    return num;
  },
});

const numbers = (): Codec<number[]> => ({
  encode: (values) => values.join(','),
  decode: (value) => {
    const nums = value.split(',').map(Number);
    if (nums.some(Number.isNaN)) {
      throw new TypeError(`Invalid numbers: ${value}`);
    }
    return nums;
  },
});

const boolean = (): Codec<boolean> => ({
  encode: (value) => (value ? 'true' : 'false'),
  decode: (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new TypeError(`Invalid boolean: ${value}`);
  },
});

const enumOf = <K extends string>(enumApi: EnumApi<K>): Codec<K> => ({
  encode: (value) => {
    if (!enumApi.contains(value)) {
      throw new TypeError(`Invalid enum value: ${value}`);
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

const enumsOf = <K extends string>(enumApi: EnumApi<K>): Codec<K[]> => ({
  encode: (values) => {
    for (const value of values) {
      if (!enumApi.contains(value)) {
        throw new TypeError(`Invalid enum value: ${value}`);
      }
    }
    return values.join(',');
  },
  decode: (value) => {
    const parts = value.split(',');
    for (const part of parts) {
      if (!enumApi.contains(part)) {
        throw new TypeError(`Invalid enum value: ${part}`);
      }
    }
    return parts as K[];
  },
});

/**
 * The registry of built-in string codecs, keyed by schema `type`. Scalar codecs
 * are nullary factories; `enum`/`enums` take the enum to validate against.
 */
export const codecs = Object.freeze({
  string,
  strings,
  number,
  numbers,
  boolean,
  enum: enumOf,
  enums: enumsOf,
});

export type { AnyEnum };
