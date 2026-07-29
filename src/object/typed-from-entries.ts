/**
 * Like {@link Object.fromEntries}, but preserves the key and value types from
 * the entries instead of widening to `{ [k: string]: T }`.
 *
 * @param entries - An iterable of `[key, value]` pairs.
 * @returns An object typed as `Record<K, V>`.
 *
 * @example
 * ```ts
 * const obj = typedFromEntries([['a', 1], ['b', 2]] as const);
 * obj; // Record<'a' | 'b', 1 | 2>
 * ```
 */
export function typedFromEntries<K extends PropertyKey, V>(
  entries: Iterable<readonly [K, V]>,
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
