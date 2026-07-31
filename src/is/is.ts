/** Whether `value` is a string. */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Whether `value` is a number — excluding `NaN`. */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/** Whether `value` is an integer (and a number). */
export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

/** Whether `value` is a boolean. */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Whether `value` is a bigint. */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === "bigint";
}

/** Whether `value` is a symbol. */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === "symbol";
}

/** Whether `value` is exactly `null`. */
export function isNull(value: unknown): value is null {
  return value === null;
}

/** Whether `value` is exactly `undefined`. */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/** Whether `value` is `null` or `undefined`. */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Whether `value` is neither `null` nor `undefined` — the inverse of
 * {@link isNullish}. Handy for narrowing arrays.
 *
 * @example
 * ```ts
 * const nums = [1, null, 2, undefined].filter(isDefined); // number[]
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Whether `value` is an array (of unknown elements). */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Whether `value` is a plain object — created via an object literal or
 * `Object.create(null)`. Excludes arrays, class instances, and other built-ins.
 *
 * @example
 * ```ts
 * isPlainObject({ a: 1 });        // true
 * isPlainObject([]);              // false
 * isPlainObject(new Date());      // false
 * ```
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Whether `value` is callable. */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/** Whether `value` is a valid `Date` (excludes `Invalid Date`). */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Whether `value` is an `Error` (or subclass). */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/** Whether `value` is thenable (a native `Promise` or any object with a `then` method). */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
