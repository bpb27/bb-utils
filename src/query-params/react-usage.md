# Query params in React (react-router)

Wrap `createQueryParamsSchema` in a hook so components read and write typed,
validated search params. Assumes react-router v7 (data mode).

## The hook

```tsx
import { useCallback, useMemo } from "react";
import { useSearchParams, type NavigateOptions } from "react-router";
import type { Infer, QueryParamsSchema, Schema } from "bb-utils";

export function useQueryParams<T extends Schema>(schema: QueryParamsSchema<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Re-parse only when the URL changes.
  const values = useMemo(() => schema.parse(searchParams), [schema, searchParams]);

  // Merge a partial update over the current values, then write the URL.
  // Passing `searchParams` as the base preserves any params outside the schema.
  const setValues = useCallback(
    (next: Partial<Infer<QueryParamsSchema<T>>>, options?: NavigateOptions) =>
      setSearchParams(schema.serialize({ ...values, ...next }, searchParams), options),
    [schema, values, searchParams, setSearchParams],
  );

  return [values, setValues] as const;
}
```

`schema.parse` throws on invalid params — swap in `schema.safeParse` if the URL
is untrusted and you'd rather fall back than throw.

## In a component

```tsx
import { createEnum, createQueryParamsSchema } from "bb-utils";
import { useQueryParams } from "./use-query-params";

const SORT = createEnum("newest", "oldest", "price");

const productFilters = createQueryParamsSchema({
  q: { type: "string" },
  page: { type: "number", default: 1 },
  sort: { type: "enum", enum: SORT, default: "newest" },
});

function ProductList() {
  const [filters, setFilters] = useQueryParams(productFilters);
  //      ^ { q?: string; page: number; sort: "newest" | "oldest" | "price" }

  return (
    <div>
      <input
        defaultValue={filters.q}
        onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
      />

      <select
        value={filters.sort}
        onChange={(e) => {
          // `contains` narrows the raw string to the enum union
          if (SORT.contains(e.target.value)) setFilters({ sort: e.target.value });
        }}
      >
        {SORT.keys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      <button disabled={filters.page <= 1} onClick={() => setFilters({ page: filters.page - 1 })}>
        Prev
      </button>
      <span>Page {filters.page}</span>
      <button onClick={() => setFilters({ page: filters.page + 1 })}>Next</button>
    </div>
  );
}
```

## In a loader (data mode)

The same schema parses the request URL before the component renders:

```tsx
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const filters = productFilters.parse(new URL(request.url).searchParams);
  return getProducts(filters);
}
```
