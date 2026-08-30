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
  type EnumValues,
  type EnumWithMeta,
} from "./enum/create-enum.js";
export { object } from "./object/index.js";
export { is } from "./is/index.js";
export {
  createQueryParamsSchema,
  SchemaError,
  type CoerceResult,
  type Defaults,
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
export {
  createMachine,
  type Machine,
  type MachineConfig,
  type MachineListener,
  type SendResult,
  type Transition,
  type TransitionResult,
} from "./state-machine/state-machine.js";
export type { Infer, InferInput } from "./schema/infer.js";
