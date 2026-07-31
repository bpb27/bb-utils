import {
  isArray,
  isBigInt,
  isBoolean,
  isDate,
  isDefined,
  isError,
  isFunction,
  isInteger,
  isNull,
  isNullish,
  isNumber,
  isPlainObject,
  isPromiseLike,
  isString,
  isSymbol,
  isUndefined,
} from "./is.js";

/**
 * Namespaced type guards: `is.string(x)`, `is.plainObject(x)`, etc. Grouped
 * under one frozen namespace for discoverability — type `is.` and autocomplete
 * lists them all. Each narrows its argument.
 *
 * @example
 * ```ts
 * import { is } from 'bb-utils';
 *
 * if (is.string(value)) value.toUpperCase();
 * const nums = mixed.filter(is.defined); // drops null | undefined
 * ```
 */
export const is = {
  /** Whether `value` is a string. */
  string: isString,
  /** Whether `value` is a number — excluding `NaN`. */
  number: isNumber,
  /** Whether `value` is an integer (and a number). */
  integer: isInteger,
  /** Whether `value` is a boolean. */
  boolean: isBoolean,
  /** Whether `value` is a bigint. */
  bigint: isBigInt,
  /** Whether `value` is a symbol. */
  symbol: isSymbol,
  /** Whether `value` is exactly `null`. */
  null: isNull,
  /** Whether `value` is exactly `undefined`. */
  undefined: isUndefined,
  /** Whether `value` is `null` or `undefined`. */
  nullish: isNullish,
  /** Whether `value` is neither `null` nor `undefined` (narrows arrays via `filter`). */
  defined: isDefined,
  /** Whether `value` is an array (of unknown elements). */
  array: isArray,
  /** Whether `value` is a plain object (excludes arrays, class instances, built-ins). */
  plainObject: isPlainObject,
  /** Whether `value` is callable. */
  function: isFunction,
  /** Whether `value` is a valid `Date` (excludes `Invalid Date`). */
  date: isDate,
  /** Whether `value` is an `Error` (or subclass). */
  error: isError,
  /** Whether `value` is thenable (a `Promise` or any object with a `then` method). */
  promiseLike: isPromiseLike,
};

Object.freeze(is);
