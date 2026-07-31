/**
 * A per-field validation function, run after a value is decoded, for refined
 * checks the built-in types can't express (an email regex, `n >= 1`, a file
 * size limit, …).
 *
 * Return `true` (or nothing) for valid; return `false` or an error-message
 * string for invalid. Throwing is also treated as invalid, using the thrown
 * message.
 *
 * @typeParam T - The decoded value type of the field.
 *
 * @example
 * ```ts
 * { type: 'string', validate: (s) => /@/.test(s) || 'must be an email' }
 * { type: 'number', validate: (n) => n >= 1 }
 * ```
 */
export type Validator<T> = (value: T) => boolean | string | void;

/**
 * Run a field's validator, if present.
 *
 * @param validate - The validator, or `undefined` if the field has none.
 * @param value - The decoded value to check.
 * @returns `null` if valid, otherwise the failure message.
 */
export function checkValidator(
  validate: ((value: any) => boolean | string | void) | undefined,
  value: unknown,
): string | null {
  if (!validate) return null;
  let result: boolean | string | void;
  try {
    result = validate(value);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  if (result === false) return "Validation failed";
  if (typeof result === "string") return result || "Validation failed";
  return null;
}

/** The minimal field shape needed to check an enum field's default. */
interface EnumDefaultCheckable {
  type: string;
  enum?: { contains(value: string): boolean };
  default?: unknown;
}

/**
 * Assert, at schema-construction time, that every enum field's `default` is a
 * member of its enum. Throws a clear error otherwise — the type system can't
 * cleanly constrain this without breaking `validate`'s contextual typing, so we
 * verify it at build time (i.e. at startup for module-level schemas).
 *
 * @param entries - `[fieldName, field]` pairs of the schema.
 * @param label - Builder name, used in the error message.
 * @throws {Error} If any enum default is not a valid key.
 */
export function assertEnumDefaults(
  entries: Iterable<readonly [string, EnumDefaultCheckable]>,
  label: string,
): void {
  for (const [key, def] of entries) {
    if ((def.type !== "enum" && def.type !== "enums") || def.default == null || !def.enum) {
      continue;
    }
    const values = Array.isArray(def.default) ? def.default : [def.default];
    for (const value of values) {
      if (typeof value === "string" && !def.enum.contains(value)) {
        throw new Error(
          `${label}: invalid default ${JSON.stringify(value)} for enum field "${key}" — not a member of the enum`,
        );
      }
    }
  }
}
