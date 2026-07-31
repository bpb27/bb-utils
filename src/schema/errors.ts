/** A single problem encountered while parsing one field. */
export interface SchemaIssue {
  /** The field (param) name. */
  field: string;
  /** The raw string value, or `null` if the field was missing entirely. */
  value: string | null;
  /** Whether the field was missing or present-but-undecodable. */
  code: "missing" | "invalid";
  /** Human-readable explanation. */
  message: string;
}

/**
 * Raised by a schema `parse` (and returned by `safeParse`) when one or more
 * fields fail. Shared across schema-driven parsers so callers can handle a
 * single error type. Inspect {@link SchemaError.issues} to act per field.
 */
export class SchemaError extends Error {
  readonly issues: readonly SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    const fields = issues.map((issue) => issue.field).join(", ");
    super(`Failed to parse field(s): ${fields}`);
    this.name = "SchemaError";
    this.issues = issues;
  }
}

/** The result of a non-throwing `safeParse`: check `success` before `data`. */
export type SafeParseResult<Data> =
  | { success: true; data: Data }
  | { success: false; error: SchemaError };
