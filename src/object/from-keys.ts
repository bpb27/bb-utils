/**
 * Build an object from a list of keys, computing each value from its key.
 *
 * The inverse mental model of {@link typedKeys}: instead of pulling keys out of
 * an object, you fold keys into one — handy for lookup tables and indexes.
 *
 * @param keys - The keys to build the object from.
 * @param valueFor - Produces the value for a given key.
 * @returns An object typed as `Record<K, V>`.
 *
 * @example
 * ```ts
 * fromKeys(['a', 'bb', 'ccc'], (key) => key.length);
 * // { a: 1, bb: 2, ccc: 3 }  typed Record<'a' | 'bb' | 'ccc', number>
 * ```
 */
export function fromKeys<K extends PropertyKey, V>(
  keys: Iterable<K>,
  valueFor: (key: K) => V,
): Record<K, V> {
  const result = {} as Record<K, V>;
  for (const key of keys) {
    result[key] = valueFor(key);
  }
  return result;
}
