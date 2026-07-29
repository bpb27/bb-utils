/**
 * Like {@link Object.keys}, but typed as the object's own key union instead of
 * `string[]`.
 *
 * ⚠️ **Deliberately unsound.** TypeScript types `Object.keys` as `string[]` on
 * purpose: structural typing lets a value carry extra properties at runtime
 * beyond its declared type. Prefer this on objects you own (literals, frozen
 * records) rather than on function parameters. Numeric keys are returned as
 * strings at runtime but typed here in their `keyof` form.
 *
 * @param obj - The object to read keys from.
 * @returns The object's own enumerable keys, typed as `(keyof T)[]`.
 *
 * @example
 * ```ts
 * const point = { x: 1, y: 2 };
 * typedKeys(point); // ('x' | 'y')[]   — not string[]
 * ```
 */
export function typedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}
