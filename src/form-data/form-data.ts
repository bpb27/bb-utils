import { codecs, type Codec } from "../schema/codecs.js";
import { SchemaError, type SafeParseResult, type SchemaIssue } from "../schema/errors.js";
import { assertEnumDefaults, checkValidator } from "../schema/validate.js";
import type { FormSchema, FormSchemaInput, InputValues, ParsedValues } from "../schema/infer.js";

export { SchemaError } from "../schema/errors.js";
export type { SafeParseResult, SchemaIssue } from "../schema/errors.js";
export type { FormSchema, FormSchemaInput } from "../schema/infer.js";

/**
 * The element (scalar) codec for a field, or `null` for file fields, which are
 * passed through rather than string-encoded. Unlike query-params, form-data
 * represents lists as repeated entries, so it never needs the comma codecs —
 * only the underlying element codec.
 */
function elementCodecFor(def: FormSchemaInput): Codec<any> | null {
  switch (def.type) {
    case "string":
    case "strings":
      return codecs.string();
    case "number":
    case "numbers":
      return codecs.number();
    case "boolean":
      return codecs.boolean();
    case "enum":
    case "enums":
      return codecs.enum(def.enum);
    case "file":
    case "files":
      return null;
  }
}

/** Read the common options off any field (file fields lack `default`). */
function opts(def: FormSchemaInput): {
  default?: unknown;
  required?: boolean;
  catch?: boolean;
} {
  return def;
}

/**
 * A form-data schema: the source definition plus type-safe parsing and
 * serializing bound to it.
 *
 * @typeParam T - The schema shape.
 */
export interface FormDataSchema<T extends FormSchema> {
  /** The schema this was built from. */
  readonly schema: T;

  /**
   * Parse a `FormData` into a typed object, throwing if any field fails. List
   * fields read every entry for the key (`getAll`); file fields expect a
   * `File`.
   *
   * @param input - The `FormData` to read.
   * @returns The decoded, typed values.
   * @throws {SchemaError} If any non-`catch` field is missing (when `required`)
   *   or fails to decode.
   */
  parse(input: FormData): ParsedValues<T>;

  /**
   * Like {@link FormDataSchema.parse}, but never throws: returns a
   * discriminated result so callers can branch on `success`.
   *
   * @param input - The `FormData` to read.
   * @returns `{ success: true, data }` or `{ success: false, error }`.
   */
  safeParse(input: FormData): SafeParseResult<ParsedValues<T>>;

  /**
   * Serialize a typed object into `FormData`. List fields append one entry per
   * element; fields set to `undefined` are skipped.
   *
   * @param values - The values to encode.
   * @returns The populated `FormData`.
   */
  serialize(values: InputValues<T>): FormData;
}

/**
 * Build a type-safe form-data (de)serializer from a schema.
 *
 * Reuses the same field types, codecs, per-field error handling (`required`,
 * `catch`, `dropInvalid`), and {@link SchemaError} as `createQueryParamsSchema`,
 * adding `file`/`files` fields and reading lists as repeated `FormData` entries.
 * Runs in the browser and in Node (where `FormData`/`File` are global). The
 * returned object is frozen.
 *
 * @param schema - A map of field name to {@link FormSchemaInput}.
 * @returns A {@link FormDataSchema} with `parse`, `safeParse`, `serialize`.
 *
 * @example
 * ```ts
 * const fd = createFormDataSchema({
 *   title: { type: 'string', required: true },
 *   tags: { type: 'strings' },
 *   avatar: { type: 'file' },
 * });
 *
 * const values = fd.parse(formElementData); // { title: string; tags?: string[]; avatar?: File }
 * ```
 */
export function createFormDataSchema<const T extends FormSchema>(schema: T): FormDataSchema<T> {
  const entries = Object.entries(schema) as [string, FormSchemaInput][];
  assertEnumDefaults(entries, "createFormDataSchema");

  const run = (form: FormData): { data: Record<string, unknown>; issues: SchemaIssue[] } => {
    const data: Record<string, unknown> = {};
    const issues: SchemaIssue[] = [];

    const reportMissing = (key: string, def: FormSchemaInput) => {
      const o = opts(def);
      if (o.default !== undefined) {
        data[key] = o.default;
      } else if (o.required && !o.catch) {
        issues.push({
          field: key,
          value: null,
          code: "missing",
          message: `Missing required field "${key}"`,
        });
      }
    };

    const reportInvalid = (
      key: string,
      def: FormSchemaInput,
      value: string | null,
      message: string,
    ) => {
      const o = opts(def);
      if (o.catch) {
        if (o.default !== undefined) data[key] = o.default;
      } else {
        issues.push({ field: key, value, code: "invalid", message });
      }
    };

    // Decode succeeded — run the field's validator (if any), then assign or
    // report the failure through the same catch/issue path as a decode error.
    const assignChecked = (
      key: string,
      def: FormSchemaInput,
      value: string | null,
      decoded: unknown,
    ) => {
      const message = checkValidator(def.validate, decoded);
      if (message === null) data[key] = decoded;
      else reportInvalid(key, def, value, message);
    };

    for (const [key, def] of entries) {
      switch (def.type) {
        case "file": {
          const value = form.get(key);
          if (value === null) reportMissing(key, def);
          else if (typeof value === "string")
            reportInvalid(key, def, value, `Expected a file for "${key}"`);
          else assignChecked(key, def, null, value);
          break;
        }

        case "files": {
          const all = form.getAll(key);
          if (all.length === 0) {
            reportMissing(key, def);
            break;
          }
          const files = all.filter((v): v is File => typeof v !== "string");
          if (files.length !== all.length && !def.dropInvalid) {
            reportInvalid(key, def, null, `Expected files for "${key}"`);
            break;
          }
          assignChecked(key, def, null, files);
          break;
        }

        case "strings":
        case "numbers":
        case "enums": {
          const all = form.getAll(key);
          if (all.length === 0) {
            reportMissing(key, def);
            break;
          }
          const codec = elementCodecFor(def)!;
          const out: unknown[] = [];
          let bad: { value: string | null; message: string } | null = null;
          for (const entry of all) {
            if (typeof entry !== "string") {
              if (def.dropInvalid) continue;
              bad = { value: null, message: `Expected text for "${key}", received a file` };
              break;
            }
            try {
              out.push(codec.decode(entry));
            } catch (error) {
              if (def.dropInvalid) continue;
              bad = {
                value: entry,
                message: error instanceof Error ? error.message : String(error),
              };
              break;
            }
          }
          if (bad) reportInvalid(key, def, bad.value, bad.message);
          else assignChecked(key, def, null, out);
          break;
        }

        default: {
          const value = form.get(key);
          if (value === null) {
            reportMissing(key, def);
            break;
          }
          if (typeof value !== "string") {
            reportInvalid(key, def, null, `Expected text for "${key}", received a file`);
            break;
          }
          const codec = elementCodecFor(def)!;
          try {
            assignChecked(key, def, value, codec.decode(value));
          } catch (error) {
            reportInvalid(key, def, value, error instanceof Error ? error.message : String(error));
          }
        }
      }
    }

    return { data, issues };
  };

  const parse = (input: FormData): ParsedValues<T> => {
    const { data, issues } = run(input);
    if (issues.length > 0) throw new SchemaError(issues);
    return data as ParsedValues<T>;
  };

  const safeParse = (input: FormData): SafeParseResult<ParsedValues<T>> => {
    const { data, issues } = run(input);
    if (issues.length > 0) return { success: false, error: new SchemaError(issues) };
    return { success: true, data: data as ParsedValues<T> };
  };

  const serialize = (values: InputValues<T>): FormData => {
    const form = new FormData();
    const provided = values as Record<string, unknown>;
    const issues: SchemaIssue[] = [];

    for (const [key, def] of entries) {
      const value = provided[key];
      if (value === undefined) {
        if (def.required) {
          issues.push({
            field: key,
            value: null,
            code: "missing",
            message: `Missing required field "${key}"`,
          });
        }
        continue;
      }

      switch (def.type) {
        case "file":
          form.set(key, value as File);
          break;
        case "files":
          for (const file of value as File[]) form.append(key, file);
          break;
        case "strings":
        case "numbers":
        case "enums": {
          const codec = elementCodecFor(def)!;
          for (const element of value as unknown[]) form.append(key, codec.encode(element));
          break;
        }
        default: {
          const codec = elementCodecFor(def)!;
          form.set(key, codec.encode(value));
        }
      }
    }

    if (issues.length > 0) throw new SchemaError(issues);
    return form;
  };

  return Object.freeze({ schema, parse, safeParse, serialize });
}
