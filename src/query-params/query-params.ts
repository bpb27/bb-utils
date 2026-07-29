import type { EnumApi, EnumWithMeta } from "../enum/create-enum";
import { is } from "../is";

const serializers = {
  string: () => ({
    encode: (value: string) => value,
    decode: (value: string) => value,
  }),
  strings: () => ({
    encode: (values: string[]) => values.join(','),
    decode: (value: string) => value.split(','),
  }),
  number: () => ({
		encode: (value: number) => value.toString(),
		decode: (value: string) => {
			const num = Number(value);
			if (Number.isNaN(num)) {
				throw new Error(`Invalid number: ${value}`);
			}
			return num;
		},
	}),
  numbers: () => ({
		encode: (values: number[]) => values.join(","),
		decode: (value: string) => {
      const nums = value.split(",").map(Number);
			if (nums.some(Number.isNaN)) {
        throw new Error(`Invalid numbers: ${value}`);
      }
			return nums;
		},
	}),
  boolean: () =>  ({
		encode: (value: boolean) => (value ? "true" : "false"),
		decode: (value: string) => {
			if (value === "true") return true;
			if (value === "false") return false;
			throw new Error(`Invalid boolean: ${value}`);
		},
  }),
  enum: <T extends EnumApi<string> | EnumWithMeta<Record<string, unknown>>>(enumObj: T) => ({
    encode: (value: T['keys'][number]) => {
      if (enumObj.contains(value)) {
        return value as string;
      }
      // TODO: forgiving encoding? config option? or just allow TS to enforce?
      throw new Error(`Invalid enum value: ${value}`);
    },
    decode: (value: string) => {
      if (enumObj.contains(value)) {
        return value;
      }
      throw new Error(`Invalid enum value: ${value}`);
    },
  }),
  enums: <T extends EnumApi<string> | EnumWithMeta<Record<string, unknown>>>(enumObj: T) => ({
    encode: (value: T['keys']) => {
      if (value.every(enumObj.contains)) {
        return value.join(',');
      }
      throw new Error(`Invalid enum value: ${value}`);
    },
    decode: (value: string) => {
      const values = value.split(',');
      if (values.every(enumObj.contains)) {
        return values as T['keys'];
      }
      throw new Error(`Invalid enum value: ${value}`);
    },
  }),
};

const createQueryParamsSchema = <T extends Record<string, SchemaInput>>(schema: T) => {
  return schema;
};

type SchemaInput = {
  type: 'string';
  default?: string;
} | {
  type: 'strings';
  default?: string[];
} | {
  type: 'number';
  default?: number;
} | {
  type: 'numbers';
  default?: number[];
} | {
  type: 'boolean';
  default?: boolean;
} | {
  type: 'enum';
  enum: EnumApi<string> | EnumWithMeta<Record<string, unknown>>;
  default?: string;
} | {
  type: 'enums';
  enum: EnumApi<string> | EnumWithMeta<Record<string, unknown>>;
  default?: string[];
}

createQueryParamsSchema({
  name: { type: 'string' },
  age: { type: 'number' },
  tags: { type: 'strings' },
  isActive: { type: 'boolean' },
})

function parseQueryParams(input: string | URLSearchParams) {
  const str = is.string(input) ? input : input.toString();
}

function serializeQueryParams(params: Record<string, string | number | boolean | string[] | number[]>) {
  const searchParams = new URLSearchParams();
}
