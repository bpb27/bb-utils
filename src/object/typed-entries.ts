/**
 * Like {@link Object.entries}, but typed as a union of correlated `[key, value]`
 * tuples instead of `[string, any][]` — so each key stays paired with its own
 * value type.
 *
 * ⚠️ **Deliberately unsound** in the same way as {@link typedKeys}: a value may
 * carry extra properties at runtime. Prefer it on objects you own.
 *
 * @param obj - The object to read entries from.
 * @returns The object's own enumerable `[key, value]` pairs.
 *
 * @example
 * ```ts
 * const item = { id: 1, label: 'a' };
 * typedEntries(item); // (['id', number] | ['label', string])[]
 * ```
 */
export function typedEntries<T extends object>(
  obj: T,
): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]> {
  return Object.entries(obj) as Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;
}
