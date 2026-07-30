import { is } from '../is/index.js';
import { codecs, type Codec } from '../schema/codecs.js';
import type {
  InputValues,
  ParsedValues,
  Schema,
  SchemaInput,
  ValidateDefaults,
} from '../schema/infer.js';

/**
 * Resolve the codec for a single schema field. Typed `Codec<any>` because this
 * bridges the discriminated `SchemaInput` union to a value-agnostic codec; the
 * public `parse`/`serialize` signatures re-impose the precise types.
 */
function codecFor(input: SchemaInput): Codec<any> {
  switch (input.type) {
    case 'string':
      return codecs.string();
    case 'strings':
      return codecs.strings();
    case 'number':
      return codecs.number();
    case 'numbers':
      return codecs.numbers();
    case 'boolean':
      return codecs.boolean();
    case 'enum':
      return codecs.enum(input.enum);
    case 'enums':
      return codecs.enums(input.enum);
  }
}

/** Normalize parse input into `URLSearchParams`, tolerating a leading `?`. */
function toSearchParams(input: string | URLSearchParams): URLSearchParams {
  return is.string(input)
    ? new URLSearchParams(input.replace(/^\?/, ''))
    : input;
}

/**
 * A query-params schema: the source definition plus type-safe `parse` and
 * `serialize` bound to it.
 *
 * @typeParam T - The schema shape.
 */
export interface QueryParamsSchema<T extends Schema> {
  /** The schema this was built from. */
  readonly schema: T;

  /**
   * Parse a query string (or `URLSearchParams`) into a typed object. Fields
   * with a `default` are always present; missing fields without a default are
   * omitted.
   *
   * @param input - A query string (a leading `?` is tolerated) or
   *   `URLSearchParams`.
   * @returns The decoded, typed values.
   * @throws {TypeError} If a present value fails to decode (e.g. a bad number).
   */
  parse(input: string | URLSearchParams): ParsedValues<T>;

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
 * @param schema - A map of param name to {@link SchemaInput}.
 * @returns A {@link QueryParamsSchema} with `parse` and `serialize`.
 *
 * @example
 * ```ts
 * const status = createEnum('active', 'inactive');
 * const qp = createQueryParamsSchema({
 *   q: { type: 'string' },
 *   page: { type: 'number', default: 1 },
 *   status: { type: 'enum', enum: status },
 * });
 *
 * qp.parse('?q=shoes&page=2&status=active');
 * // { q: 'shoes', page: 2, status: 'active' }
 *
 * qp.serialize({ q: 'shoes', page: 2 });
 * // "q=shoes&page=2"
 * ```
 */
export function createQueryParamsSchema<const T extends Schema>(
  schema: T & ValidateDefaults<T>,
): QueryParamsSchema<T> {
  const entries = Object.entries(schema) as [string, SchemaInput][];

  const parse = (input: string | URLSearchParams): ParsedValues<T> => {
    const params = toSearchParams(input);
    const result: Record<string, unknown> = {};

    for (const [key, def] of entries) {
      const raw = params.get(key);
      if (raw === null) {
        if (def.default !== undefined) {
          result[key] = def.default;
        }
        continue;
      }
      result[key] = codecFor(def).decode(raw);
    }

    return result as ParsedValues<T>;
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

  return Object.freeze({ schema, parse, serialize });
}
