/**
 * Like {@link Object.values}, but typed as the object's value union instead of
 * `any[]`.
 *
 * ⚠️ **Deliberately unsound** in the same way as {@link typedKeys}: a value may
 * carry extra properties at runtime. Prefer it on objects you own.
 *
 * @param obj - The object to read values from.
 * @returns The object's own enumerable values, typed as `T[keyof T][]`.
 *
 * @example
 * ```ts
 * const point = { x: 1, y: 2, label: 'p' };
 * typedValues(point); // (number | string)[]
 * ```
 */
export function typedValues<T extends object>(obj: T): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
}
