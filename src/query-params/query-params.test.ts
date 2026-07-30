import { describe, it, expect, expectTypeOf } from 'vitest';
import { createEnum, createEnumWithMeta } from '../enum/create-enum.js';
import { createQueryParamsSchema } from './query-params.js';

const status = createEnum('active', 'inactive');

const qp = createQueryParamsSchema({
  q: { type: 'string' },
  page: { type: 'number', default: 1 },
  tags: { type: 'strings' },
  active: { type: 'boolean', default: false },
  status: { type: 'enum', enum: status },
  roles: { type: 'enums', enum: status },
});

describe('createQueryParamsSchema', () => {
  describe('parse', () => {
    it('applies defaults for missing fields and omits the rest', () => {
      expect(qp.parse('q=shoes')).toEqual({ q: 'shoes', page: 1, active: false });
    });

    it('decodes every field type', () => {
      expect(
        qp.parse('q=shoes&page=2&active=true&status=active&tags=a,b&roles=active,inactive'),
      ).toEqual({
        q: 'shoes',
        page: 2,
        active: true,
        status: 'active',
        tags: ['a', 'b'],
        roles: ['active', 'inactive'],
      });
    });

    it('tolerates a leading "?"', () => {
      expect(qp.parse('?page=5')).toEqual({ page: 5, active: false });
    });

    it('accepts URLSearchParams', () => {
      expect(qp.parse(new URLSearchParams('page=7'))).toEqual({ page: 7, active: false });
    });

    it('throws on a value that fails to decode', () => {
      expect(() => qp.parse('page=abc')).toThrow(TypeError);
      expect(() => qp.parse('status=nope')).toThrow(TypeError);
    });
  });

  describe('serialize', () => {
    it('encodes provided fields in schema order', () => {
      expect(qp.serialize({ q: 'shoes', page: 2 })).toBe('q=shoes&page=2');
    });

    it('skips undefined fields', () => {
      expect(qp.serialize({ q: 'x', page: undefined })).toBe('q=x');
    });

    it('round-trips a full value object', () => {
      const values: Parameters<typeof qp.serialize>[0] = {
        q: 'shoes',
        page: 2,
        active: true,
        status: 'active',
        tags: ['a', 'b'],
        roles: ['active', 'inactive'],
      };
      expect(qp.parse(qp.serialize(values))).toEqual(values);
    });
  });

  it('supports createEnumWithMeta enums and still infers their keys', () => {
    const priority = createEnumWithMeta({ low: { weight: 1 }, high: { weight: 2 } });
    const withMeta = createQueryParamsSchema({ p: { type: 'enum', enum: priority } });

    expect(withMeta.parse('p=low')).toEqual({ p: 'low' });
    expect(() => withMeta.parse('p=nope')).toThrow(TypeError);

    const parsed = withMeta.parse('p=low');
    expectTypeOf(parsed.p).toEqualTypeOf<'low' | 'high' | undefined>();
  });

  it('accepts an enum default as a raw key or a ref member', () => {
    const raw = createQueryParamsSchema({
      s: { type: 'enum', enum: status, default: 'active' },
    });
    const viaRef = createQueryParamsSchema({
      s: { type: 'enum', enum: status, default: status.ref.inactive },
    });
    const list = createQueryParamsSchema({
      s: { type: 'enums', enum: status, default: ['active'] },
    });

    expect(raw.parse('')).toEqual({ s: 'active' });
    expect(viaRef.parse('')).toEqual({ s: 'inactive' });
    expect(list.parse('')).toEqual({ s: ['active'] });
  });

  it('rejects an enum default that is not one of the keys (checked by tsc)', () => {
    createQueryParamsSchema({
      // @ts-expect-error 'nope' is not a key of the status enum
      s: { type: 'enum', enum: status, default: 'nope' },
    });
    createQueryParamsSchema({
      // @ts-expect-error 'nope' is not a key of the status enum
      roles: { type: 'enums', enum: status, default: ['nope'] },
    });
  });

  it('exposes the source schema and is frozen', () => {
    expect(qp.schema.page).toEqual({ type: 'number', default: 1 });
    expect(Object.isFrozen(qp)).toBe(true);
  });

  it('infers the parsed shape (checked by tsc)', () => {
    const parsed = qp.parse('q=x');

    // defaults => required; no default => optional
    expectTypeOf(parsed).toEqualTypeOf<{
      page: number;
      active: boolean;
      q?: string;
      tags?: string[];
      status?: 'active' | 'inactive';
      roles?: ('active' | 'inactive')[];
    }>();

    // enum keys are inferred, not widened to string
    expectTypeOf(parsed.status).toEqualTypeOf<'active' | 'inactive' | undefined>();
    expectTypeOf(parsed.roles).toEqualTypeOf<('active' | 'inactive')[] | undefined>();
  });
});
