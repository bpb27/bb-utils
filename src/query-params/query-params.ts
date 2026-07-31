import { is } from "../is/index.js";
import { codecs, type ArrayCodec, type Codec } from "../schema/codecs.js";
import { SchemaError, type SafeParseResult, type SchemaIssue } from "../schema/errors.js";
import { assertEnumDefaults, checkValidator } from "../schema/validate.js";
import type { InputValues, ParsedValues, Schema, SchemaInput } from "../schema/infer.js";

export { SchemaError } from "../schema/errors.js";
export type { SafeParseResult, SchemaIssue } from "../schema/errors.js";
export type { Schema, SchemaInput } from "../schema/infer.js";
export type { Validator } from "../schema/validate.js";

/**
 * Resolve the codec for a single schema field. Typed `Codec<any>` because this
 * bridges the discriminated `SchemaInput` union to a value-agnostic codec; the
 * public `parse`/`serialize` signatures re-impose the precise types.
 */
function codecFor(input: SchemaInput): Codec<any> {
  switch (input.type) {
    case "string":
      return codecs.string();
    case "strings":
      return codecs.strings();
    case "number":
      return codecs.number();
    case "numbers":
      return codecs.numbers();
    case "boolean":
      return codecs.boolean();
    case "enum":
      return codecs.enum(input.enum);
    case "enums":
      return codecs.enums(input.enum);
  }
}

/** Normalize parse input into `URLSearchParams`, tolerating a leading `?`. */
function toSearchParams(input: string | URLSearchParams): URLSearchParams {
  return is.string(input) ? new URLSearchParams(input.replace(/^\?/, "")) : input;
}

/**
 * A query-params schema: the source definition plus type-safe parsing and
 * serializing bound to it.
 *
 * @typeParam T - The schema shape.
 */
export interface QueryParamsSchema<T extends Schema> {
  /** The schema this was built from. */
  readonly schema: T;

  /**
   * Parse a query string (or `URLSearchParams`) into a typed object, throwing
   * if any field fails. Fields with a `default` or `required: true` are always
   * present; the rest are omitted when absent.
   *
   * @param input - A query string (a leading `?` is tolerated) or
   *   `URLSearchParams`.
   * @returns The decoded, typed values.
   * @throws {SchemaError} If any non-`catch` field is missing (when `required`)
   *   or fails to decode.
   */
  parse(input: string | URLSearchParams): ParsedValues<T>;

  /**
   * Like {@link QueryParamsSchema.parse}, but never throws: returns a
   * discriminated result so callers can branch on `success`.
   *
   * @param input - A query string or `URLSearchParams`.
   * @returns `{ success: true, data }` or `{ success: false, error }`.
   */
  safeParse(input: string | URLSearchParams): SafeParseResult<ParsedValues<T>>;

  /**
   * Serialize a typed object into a query string. Fields set to `undefined`
   * are skipped.
   *
   * @param values - The values to encode.
   * @returns The encoded query string (no leading `?`).
   */
  serialize(values: InputValues<T>): string;
}

/**
 * Build a type-safe query-params (de)serializer from a schema.
 *
 * Runs identically in browser and Node. The returned object is frozen.
 *
 * Per-field error handling: fields are strict by default (a missing `required`
 * field or an undecodable value fails the parse). Set `catch: true` to fall
 * back to `default` (or omit) instead, or `dropInvalid: true` on a list field
 * to keep only its valid elements.
 *
 * @param schema - A map of param name to {@link SchemaInput}.
 * @returns A {@link QueryParamsSchema} with `parse`, `safeParse`, `serialize`.
 *
 * @example
 * ```ts
 * const status = createEnum('active', 'inactive');
 * const qp = createQueryParamsSchema({
 *   code: { type: 'string', required: true },
 *   page: { type: 'number', default: 1 },
 *   status: { type: 'enum', enum: status, default: 'active', catch: true },
 * });
 *
 * qp.parse('?code=abc&page=2');        // { code: 'abc', page: 2, status: 'active' }
 * qp.safeParse('page=nope');           // { success: false, error: SchemaError }
 * ```
 */
export function createQueryParamsSchema<const T extends Schema>(schema: T): QueryParamsSchema<T> {
  const entries = Object.entries(schema) as [string, SchemaInput][];
  assertEnumDefaults(entries, "createQueryParamsSchema");

  const run = (
    input: string | URLSearchParams,
  ): { data: Record<string, unknown>; issues: SchemaIssue[] } => {
    const params = toSearchParams(input);
    const data: Record<string, unknown> = {};
    const issues: SchemaIssue[] = [];

    const reportInvalid = (
      key: string,
      def: SchemaInput,
      value: string | null,
      message: string,
    ) => {
      if (def.catch) {
        if (def.default !== undefined) data[key] = def.default;
      } else {
        issues.push({ field: key, value, code: "invalid", message });
      }
    };

    // Decode succeeded — run the field's validator (if any), then assign or
    // report the failure through the same catch/issue path as a decode error.
    const assignChecked = (key: string, def: SchemaInput, raw: string, decoded: unknown) => {
      const message = checkValidator(def.validate, decoded);
      if (message === null) data[key] = decoded;
      else reportInvalid(key, def, raw, message);
    };

    for (const [key, def] of entries) {
      const raw = params.get(key);

      if (raw === null) {
        if (def.default !== undefined) {
          data[key] = def.default;
        } else if (def.required && !def.catch) {
          issues.push({
            field: key,
            value: null,
            code: "missing",
            message: `Missing required param "${key}"`,
          });
        }
        continue;
      }

      const codec = codecFor(def);

      if (
        (def.type === "strings" || def.type === "numbers" || def.type === "enums") &&
        def.dropInvalid
      ) {
        assignChecked(key, def, raw, (codec as ArrayCodec<unknown>).decodeLenient(raw));
        continue;
      }

      try {
        assignChecked(key, def, raw, codec.decode(raw));
      } catch (error) {
        reportInvalid(key, def, raw, error instanceof Error ? error.message : String(error));
      }
    }

    return { data, issues };
  };

  const parse = (input: string | URLSearchParams): ParsedValues<T> => {
    const { data, issues } = run(input);
    if (issues.length > 0) throw new SchemaError(issues);
    return data as ParsedValues<T>;
  };

  const safeParse = (input: string | URLSearchParams): SafeParseResult<ParsedValues<T>> => {
    const { data, issues } = run(input);
    if (issues.length > 0) return { success: false, error: new SchemaError(issues) };
    return { success: true, data: data as ParsedValues<T> };
  };

  const serialize = (values: InputValues<T>): string => {
    const params = new URLSearchParams();
    const provided = values as Record<string, unknown>;

    for (const [key, def] of entries) {
      const value = provided[key];
      if (value === undefined) continue;
      params.set(key, codecFor(def).encode(value));
    }

    return params.toString();
  };

  return Object.freeze({ schema, parse, safeParse, serialize });
}
