/**
 * bb-utils — a tree-shakeable collection of utility functions for browser and
 * Node environments.
 *
 * @packageDocumentation
 */

export {
  createEnum,
  createEnumWithMeta,
  type EnumApi,
  type EnumWithMeta,
} from "./enum/create-enum.js";
export { object } from "./object/index.js";
export { is } from "./is/index.js";
export {
  createQueryParamsSchema,
  SchemaError,
  type QueryParamsSchema,
  type SafeParseResult,
  type Schema,
  type SchemaInput,
  type SchemaIssue,
  type Validator,
} from "./query-params/query-params.js";
export {
  createFormDataSchema,
  type FormDataSchema,
  type FormSchema,
  type FormSchemaInput,
} from "./form-data/form-data.js";
export type { Infer, InferInput } from "./schema/infer.js";
