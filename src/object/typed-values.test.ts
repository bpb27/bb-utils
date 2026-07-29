import { describe, it, expect, expectTypeOf } from 'vitest';
import { typedValues } from './typed-values.js';

describe('typedValues', () => {
  const point = { x: 1, y: 2, label: 'p' };

  it('returns the object values', () => {
    expect(typedValues(point)).toEqual([1, 2, 'p']);
  });

  it('types the result as the value union (checked by tsc)', () => {
    expectTypeOf(typedValues(point)).toEqualTypeOf<(number | string)[]>();
  });
});
