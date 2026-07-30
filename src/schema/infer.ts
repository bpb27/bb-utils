import type { EnumApi } from '../enum/create-enum.js';
import type { AnyEnum } from './codecs.js';

/**
 * One field of a schema: a discriminated union keyed by `type`, optionally
 * carrying a `default`. Shared by every schema-driven (de)serializer.
 */
export type SchemaInput =
  | { type: 'string'; default?: string }
  | { type: 'strings'; default?: string[] }
  | { type: 'number'; default?: number }
  | { type: 'numbers'; default?: number[] }
  | { type: 'boolean'; default?: boolean }
  | { type: 'enum'; enum: AnyEnum; default?: string }
  | { type: 'enums'; enum: AnyEnum; default?: string[] };

/** A whole schema: field name → {@link SchemaInput}. */
export type Schema = Record<string, SchemaInput>;

/**
 * Constrains each enum field's `default` to that enum's own key union, leaving
 * every other field untouched. Applied to the schema parameter of a builder so
 * that an out-of-range default is a compile error, while both the raw key
 * (`'active'`) and a ref member (`status.ref.active`) are accepted.
 */
export type ValidateDefaults<T extends Schema> = {
  [K in keyof T]: T[K] extends { type: 'enum'; enum: EnumApi<infer E> }
    ? T[K] & { default?: E }
    : T[K] extends { type: 'enums'; enum: EnumApi<infer E> }
      ? T[K] & { default?: E[] }
      : T[K];
};

/** The decoded value type for a single field. */
export type ValueType<S extends SchemaInput> = S extends { type: 'string' }
  ? string
  : S extends { type: 'strings' }
    ? string[]
    : S extends { type: 'number' }
      ? number
      : S extends { type: 'numbers' }
        ? number[]
        : S extends { type: 'boolean' }
          ? boolean
          : S extends { type: 'enum'; enum: EnumApi<infer K> }
            ? K
            : S extends { type: 'enums'; enum: EnumApi<infer K> }
              ? K[]
              : never;

/** Flatten an intersection into a single object type for readable hovers. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

type DefaultedKeys<T extends Schema> = {
  [K in keyof T]: T[K] extends { default: unknown } ? K : never;
}[keyof T];

type UndefaultedKeys<T extends Schema> = Exclude<keyof T, DefaultedKeys<T>>;

/**
 * The object type produced by parsing: fields with a `default` are always
 * present; fields without one are optional (absent when the input omits them).
 */
export type ParsedValues<T extends Schema> = Prettify<
  { [K in DefaultedKeys<T>]-?: ValueType<T[K]> } & {
    [K in UndefaultedKeys<T>]?: ValueType<T[K]>;
  }
>;

/**
 * The object type accepted by serializing: every field optional (omit a field
 * to leave it out of the output).
 */
export type InputValues<T extends Schema> = Prettify<{
  [K in keyof T]?: ValueType<T[K]>;
}>;
