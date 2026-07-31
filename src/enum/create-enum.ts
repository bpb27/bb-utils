import { fromKeys } from "../object/from-keys.js";
import { typedKeys } from "../object/typed-keys.js";
import { typedValues } from "../object/typed-values.js";

/**
 * The core enum helper produced by {@link createEnum}, and the base of
 * {@link createEnumWithMeta}'s result.
 *
 * @typeParam Key - The union of enum key literals.
 */
export interface EnumApi<Key extends string> extends Iterable<Key> {
  /** The enum keys, in definition order, narrowed to the key union. */
  keys: readonly Key[];

  /**
   * An object whose values echo their own key, each narrowed to its key
   * literal — a frozen, type-safe replacement for magic strings.
   *
   * @example
   * ```ts
   * status.ref.active; // type & value: "active"
   * ```
   */
  ref: Readonly<{ [K in Key]: K }>;

  /**
   * Type guard reporting whether an arbitrary string is one of the enum keys.
   *
   * @param value - The string to test.
   * @returns `true` (narrowing `value` to `Key`) if it is a known key.
   */
  contains(value: string): value is Key;

  /**
   * Assert that an arbitrary string is one of the enum keys, narrowing it in
   * place. Throws if it is not.
   *
   * @param value - The string to check.
   * @throws {RangeError} If `value` is not a known key.
   */
  assert(value: string): asserts value is Key;

  /**
   * Build a new, frozen lookup object by supplying a value for every key.
   * Exhaustive — omitting a key is a compile error.
   *
   * @param mapping - A value for each enum key.
   * @returns The frozen mapping, typed exactly as supplied.
   */
  remap<M extends Record<Key, unknown>>(mapping: M): Readonly<M>;

  /** Iterate the enum keys, in definition order. */
  [Symbol.iterator](): IterableIterator<Key>;
}

/**
 * An {@link EnumApi} augmented with metadata access, produced by
 * {@link createEnumWithMeta}.
 *
 * @typeParam T - The source record type.
 */
export interface EnumWithMeta<T extends Record<string, unknown>> extends EnumApi<
  Extract<keyof T, string>
> {
  /**
   * The source record, frozen. Access is strict — reading a key that does not
   * exist is a compile error; use {@link EnumWithMeta.get} for dynamic keys.
   */
  meta: Readonly<T>;

  /** The metadata values, in key-definition order. */
  values: readonly T[keyof T][];

  /**
   * Look up metadata by an arbitrary (possibly unknown) key.
   *
   * @param key - The key to look up.
   * @returns The metadata, or `undefined` if the key is not in the enum.
   */
  get(key: string): T[keyof T] | undefined;
}

/**
 * Shared core builder — the key-only machinery reused by both public helpers.
 */
function buildEnum<Key extends string>(keys: readonly Key[]): EnumApi<Key> {
  const frozenKeys = Object.freeze([...keys]);
  const keySet = new Set<string>(frozenKeys);
  const ref = Object.freeze(fromKeys(frozenKeys, (key) => key)) as Readonly<{
    [K in Key]: K;
  }>;

  return {
    keys: frozenKeys,
    ref,
    contains: (value): value is Key => keySet.has(value),
    assert: (value): asserts value is Key => {
      if (!keySet.has(value)) {
        throw new RangeError(`createEnum: "${value}" is not a member of the enum`);
      }
    },
    // The public generic return type is enforced by the signature; the freeze
    // clone loses the generic binding, so we assert it back.
    remap: (mapping) => Object.freeze({ ...mapping }) as never,
    [Symbol.iterator]: () => frozenKeys[Symbol.iterator](),
  };
}

/**
 * Create a small, type-safe, immutable enum helper from a list of keys.
 *
 * Runs identically in browser and Node — it has no runtime dependencies. All
 * returned objects and arrays are frozen. Pass the keys as arguments so their
 * literals are captured without needing `as const`.
 *
 * @param keys - The enum keys.
 * @returns An {@link EnumApi} for the given keys.
 *
 * @example
 * ```ts
 * const mood = createEnum('happy', 'sad', 'neutral');
 * mood.keys;             // readonly ('happy' | 'sad' | 'neutral')[]
 * mood.ref.happy;        // "happy"
 * mood.contains('sad');  // true
 * for (const key of mood) { ... }
 *
 * // Spread an existing tuple:
 * const arr = ['a', 'b'] as const;
 * const letters = createEnum(...arr);
 * ```
 */
export function createEnum<const T extends readonly string[]>(...keys: T): EnumApi<T[number]> {
  return buildEnum<T[number]>(keys);
}

/**
 * Create a small, type-safe, immutable enum helper from a record of keys to
 * metadata.
 *
 * Everything {@link createEnum} provides, plus strict `meta` access, a
 * `values` list, and a dynamic `get`. All returned objects and arrays are
 * frozen, and the source record is cloned (never aliased).
 *
 * @param meta - A record mapping each key to arbitrary metadata.
 * @returns An {@link EnumWithMeta} exposing the metadata.
 *
 * @example
 * ```ts
 * const status = createEnumWithMeta({
 *   active: { label: 'Active', color: 'green' },
 *   inactive: { label: 'Inactive', color: 'red' },
 * });
 * status.meta.active.label; // "Active"
 * status.get('nope');       // undefined
 * status.values;            // readonly [{ label, color }, ...]
 * ```
 */
export function createEnumWithMeta<T extends Record<string, unknown>>(meta: T): EnumWithMeta<T> {
  const frozenMeta = Object.freeze({ ...meta }) as Readonly<T>;
  const core = buildEnum(typedKeys(frozenMeta) as Extract<keyof T, string>[]);

  return {
    // oxlint-disable-next-line typescript/no-misused-spread
    ...core,
    meta: frozenMeta,
    values: Object.freeze(typedValues(frozenMeta)),
    get: (key) => (frozenMeta as Record<string, unknown>)[key] as T[keyof T] | undefined,
  };
}
