import { typedKeys } from "./typed-keys.js";
import { typedValues } from "./typed-values.js";
import { typedEntries } from "./typed-entries.js";
import { typedFromEntries } from "./typed-from-entries.js";
import { fromKeys } from "./from-keys.js";

/**
 * Namespaced object utilities — typed replacements for the `Object.*` built-ins
 * plus a couple of builders.
 *
 * Grouped under one frozen namespace for discoverability: type `object.` and
 * autocomplete lists them all. Importing `object` pulls in every helper (they
 * are tiny), so it does not tree-shake to individual functions — that trade is
 * intentional.
 *
 * @example
 * ```ts
 * import { object } from 'bb-utils';
 *
 * object.typedKeys({ x: 1, y: 2 }); // ('x' | 'y')[]
 * object.fromKeys(['a', 'bb'], (k) => k.length); // { a: 1, bb: 2 }
 * ```
 */
export const object = Object.freeze({
  typedKeys,
  typedValues,
  typedEntries,
  typedFromEntries,
  fromKeys,
});
