import { describe, it, expect, expectTypeOf } from 'vitest';
import { typedEntries } from './typed-entries.js';

describe('typedEntries', () => {
  const item = { id: 1, label: 'a' };

  it('returns the object entries', () => {
    expect(typedEntries(item)).toEqual([
      ['id', 1],
      ['label', 'a'],
    ]);
  });

  it('types entries as correlated tuples (checked by tsc)', () => {
    expectTypeOf(typedEntries(item)).toEqualTypeOf<
      (['id', number] | ['label', string])[]
    >();
  });
});
