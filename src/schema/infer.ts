import type { EnumApi } from "../enum/create-enum.js";
import type { AnyEnum } from "./codecs.js";
import type { Validator } from "./validate.js";

/** Options common to every field. */
type FieldOptions = {
  /** Require a present, valid value; otherwise the parse reports an error. */
  required?: boolean;
  /**
   * On a missing or invalid value, fall back to `default` (or omit the field)
   * instead of reporting an error. The field never fails the parse.
   */
  catch?: boolean;
};

/** Extra options for list-valued fields. */
type ArrayOptions = {
  /** Drop invalid elements instead of failing the whole field. */
  dropInvalid?: boolean;
};

/**
 * One field of a string-serializable schema: a discriminated union keyed by
 * `type`, optionally carrying a `default` plus per-field options (`required`,
 * `catch`, and `dropInvalid` for lists). Shared by query-params and form-data.
 */
export type SchemaInput =
  | ({ type: "string"; default?: string; validate?: Validator<string> } & FieldOptions)
  | ({ type: "strings"; default?: string[]; validate?: Validator<string[]> } & FieldOptions &
      ArrayOptions)
  | ({ type: "number"; default?: number; validate?: Validator<number> } & FieldOptions)
  | ({ type: "numbers"; default?: number[]; validate?: Validator<number[]> } & FieldOptions &
      ArrayOptions)
  | ({ type: "boolean"; default?: boolean; validate?: Validator<boolean> } & FieldOptions)
  | ({ type: "enum"; enum: AnyEnum; default?: string; validate?: Validator<string> } & FieldOptions)
  | ({
      type: "enums";
      enum: AnyEnum;
      default?: string[];
      validate?: Validator<string[]>;
    } & FieldOptions &
      ArrayOptions);

/** File-valued fields, available only where the container carries files. */
export type FileInput =
  | ({ type: "file"; validate?: Validator<File> } & FieldOptions)
  | ({ type: "files"; validate?: Validator<File[]> } & FieldOptions & ArrayOptions);

/** A field of a form-data schema: any {@link SchemaInput} plus file fields. */
export type FormSchemaInput = SchemaInput | FileInput;

/** The minimal shape every field input satisfies (the generic base). */
export type FieldInput = { type: string } & FieldOptions & Partial<ArrayOptions>;

/** A whole string-serializable schema: field name → {@link SchemaInput}. */
export type Schema = Record<string, SchemaInput>;

/** A whole form-data schema: field name → {@link FormSchemaInput}. */
export type FormSchema = Record<string, FormSchemaInput>;

/** The decoded value type for a single field. */
export type ValueType<S extends FieldInput> = S extends { type: "string" }
  ? string
  : S extends { type: "strings" }
    ? string[]
    : S extends { type: "number" }
      ? number
      : S extends { type: "numbers" }
        ? number[]
        : S extends { type: "boolean" }
          ? boolean
          : S extends { type: "file" }
            ? File
            : S extends { type: "files" }
              ? File[]
              : S extends { type: "enum"; enum: EnumApi<infer K> }
                ? K
                : S extends { type: "enums"; enum: EnumApi<infer K> }
                  ? K[]
                  : never;

/** Flatten an intersection into a single object type for readable hovers. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Fields guaranteed to be present after a successful parse. */
type PresentKeys<T extends Record<string, FieldInput>> = {
  [K in keyof T]: T[K] extends { default: unknown }
    ? K
    : T[K] extends { required: true }
      ? K
      : never;
}[keyof T];

type OptionalKeys<T extends Record<string, FieldInput>> = Exclude<keyof T, PresentKeys<T>>;

/**
 * The object type produced by parsing: fields with a `default` or `required:
 * true` are always present; the rest are optional (absent when the input omits
 * them).
 */
export type ParsedValues<T extends Record<string, FieldInput>> = Prettify<
  { [K in PresentKeys<T>]-?: ValueType<T[K]> } & {
    [K in OptionalKeys<T>]?: ValueType<T[K]>;
  }
>;

/** Fields that declare a `default`. */
type DefaultedKeys<T extends Record<string, FieldInput>> = {
  [K in keyof T]: T[K] extends { default: unknown } ? K : never;
}[keyof T];

/**
 * The default values a schema provides — the fields that declare a `default`,
 * mapped to those values. Returned by `schema.defaults()` for seeding inputs.
 */
export type Defaults<T extends Record<string, FieldInput>> = Prettify<{
  [K in DefaultedKeys<T>]: ValueType<T[K]>;
}>;

/** Fields the caller must supply when serializing (those marked `required`). */
type RequiredInputKeys<T extends Record<string, FieldInput>> = {
  [K in keyof T]: T[K] extends { required: true } ? K : never;
}[keyof T];

/**
 * The object type accepted by serializing: `required` fields must be supplied;
 * every other field is optional (omit it to leave it out of the output).
 */
export type InputValues<T extends Record<string, FieldInput>> = Prettify<
  { [K in RequiredInputKeys<T>]-?: ValueType<T[K]> } & {
    [K in Exclude<keyof T, RequiredInputKeys<T>>]?: ValueType<T[K]>;
  }
>;

/**
 * Extract the parsed result type of a schema built by `createQueryParamsSchema`
 * or `createFormDataSchema` — the analogue of Zod's `z.infer`.
 *
 * @typeParam S - The schema object (e.g. `typeof qp`).
 *
 * @example
 * ```ts
 * const qp = createQueryParamsSchema({ page: { type: 'number', default: 1 } });
 * type QueryParams = Infer<typeof qp>; // { page: number }
 * ```
 */
export type Infer<S extends { parse: (...args: any[]) => any }> = ReturnType<S["parse"]>;

/**
 * Extract the value type a schema's `serialize` accepts (every field optional).
 *
 * @typeParam S - The schema object (e.g. `typeof qp`).
 */
export type InferInput<S extends { serialize: (...args: any[]) => any }> = Parameters<
  S["serialize"]
>[0];
