# bb-utils

A collection of utility functions for **browser** and **Node** environments.

## Install

```bash
pnpm add @bb-utils/utils
```

## Usage

### Enum

Better than TS Enum and const objects.

```ts
import { createEnum, createEnumWithMeta, type EnumValues } from "@bb-utils/utils";

const STATUS = createEnum("pending", "success", "error");
type Status = EnumValues<typeof STATUS>; // "pending" | "success" | "error"

STATUS.contains(user.status); // boolean (narrows)
STATUS.assert(user.status); // undefined (throws or narrows)
STATUS.keys; // ["pending", "success", "error"]
STATUS.ref.pending; // "pending"

// exhaustive check
const labels = STATUS.remap({
  pending: "yellow",
  success: "green",
  error: "red",
});
const userLabel = label[user.status]; // string

STATUS.keys.forEach(someFunction); // Array.forEach
STATUS.keys.map(someFunction); // Array.map

// or upgrade to createEnumWithMeta (extended interface)
// useful for centralizing all metadata coupled to enum values

const MEMBERSHIP = createEnumWithMeta({
  free: { label: "Free", color: "green" },
  premium: { label: "Premium", color: "teal" },
  ultimate: { label: "Ultimate", color: "platinum" },
});

const color = MEMBERSHIP.meta(user.membership).color; // string
```

### Is

More convenient than `typeof` + `&&` chaining for type narrowing.

```ts
import { is } from "@bb-utils/utils";

is.string("yep") // => true
is.number(1); // => true (false for NaN)
is.integer(1); // => true
is.boolean(false); // => true (false for non-boolean truthy and falsey values)
is.null(null); // => true
is.undefined(undefined); // => true
is.nullish(undefined); // true (true for null)
is.defined(null); // false (false for undefined)
is.plainObject({ a: 1 }); // => true (false for arrays, null, class instances, functions)
is.array([]); // => true
is.error(new Error("Oops")); // => true
is.date(new Date())); // => true (false for Invalid Date)
is.function((function noop(){})); // => true
is.promiseLike(new Promise(noop, noop)); // => true (true for thenable)
is.symbol(Symbol('wingding')); // => true
is.bigint(BigInt("9007199254740991")); // true


const nums = [1, null, 2, undefined].filter(is.defined); // number[]
```

### Object

Typed `Object.*` — no casting `Object.keys(x)` to `(keyof x)[]` yourself.

```ts
import { object } from "@bb-utils/utils";

object.typedKeys({ a: 1, b: 2 }); // ("a" | "b")[]  — not string[]
object.typedValues({ a: 1, b: 2 }); // number[]
object.typedEntries({ a: 1, b: "x" }); // (["a", number] | ["b", string])[]
object.typedFromEntries([
  ["a", 1],
  ["b", 2],
] as const); // Record<"a" | "b", 1 | 2>
object.fromKeys(["a", "bb"], (k) => k.length); // { a: 1, bb: 2 }
```

## Query params

Schema-first QP parsing + serialization. Better than `URLSearchParams.get('myParam')`.

```ts
import { createQueryParamsSchema, createEnum } from "@bb-utils/utils";

const STATUS = createEnum("pending", "success", "error");
const MODE = createEnum("dense", "compact");

// each type can optionally provide a default value, required boolean, and catch fallback value
const qpSchema = createQueryParamsSchema({
  search: { type: "string" },
  tags: { type: "strings" },
  page: { type: "number", default: 1 },
  status: { type: "enums", enum: STATUS },
  mode: { type: "enum", enum: MODE, required: true },
  productIds: { type: "numbers" },
  active: { type: "boolean" },
});

const qps = qpSchema.parse(location.search);
qps.search; // string | undefined
qps.tags; // string[] | undefined
qps.page; // => number
qps.status; // ("pending" | "success" | "error")[]
qps.mode; // "dense" | "compact"
qps.productIds; // number[] | undefined
qps.active; // boolean | undefined

const newQpStr = qps.serialize({ mode: "dense", tags: ["cool"] });
```

## Form data

Schema-first `FormData` parsing + serialization. Better than `FormDate.get('myField')`.

```ts
import { createFormDataSchema } from "@bb-utils/utils";

const fdSchema = createFormDataSchema({
  title: { type: "string", required: true },
  tags: { type: "strings" }, // one entry per value (append / getAll)
  avatar: { type: "file" },
  docs: { type: "files" },
});

const values = fdSchema.parse(new FormData(formEl));
values.title; // string (required)
values.tags; // string[] | undefined
values.avatar; // File | undefined
values.docs; // File[] | undefined

fdSchema.serialize({ title: "Hi", tags: ["a", "b"] }); // FormData
```

Both schema builders share the same options — `default`, `required`, `catch`, `dropInvalid`, `validate` — plus `.safeParse()` (`{ success, data | error }`), `.coerce()` (best-effort `{ data, issues }`, never throws), `.defaults()`, and `Infer<typeof schema>` for the parsed type. `serialize` preserves params outside the schema when given the current ones as a base.

## State machine

A tiny typed finite state machine — states from an enum, transitions with
`before`/`after` hooks, per-event payloads inferred from those hooks. Fully
synchronous: transitions commit before `send` returns.

```ts
import { createEnum, createMachine } from "@bb-utils/utils";

const states = createEnum("idle", "loading", "ready");

const machine = createMachine(
  states,
  {
    idle: {
      FETCH: { to: "loading" },
    },
    loading: {
      RESOLVE: { to: "ready", after: (count: number) => render(count) }, // typed payload
      REJECT: { before: () => "idle" as const, to: "loading" }, // redirect: return a state
    },
    ready: {
      RESET: { to: "idle" },
    },
  },
  { initial: "idle" },
);

machine.send("FETCH"); // machine.state === "loading" (immediately)
machine.send("RESOLVE", 42); // payload required (after takes a number)
machine.state; // "ready"
machine.can("RESET"); // true — would a send transition from here? (runs the guard)
machine.send("RESOLVE"); // { transitioned: false } — unhandled from "ready", no throw
```

`before` is a synchronous guard: return `false` to cancel, `true`/nothing to
proceed, or a state key to redirect. `send` returns `{ transitioned, state }`,
and `can(event)` runs the guard so `disabled={!machine.can("SAVE")}` just works.
For React, `subscribe` + `getSnapshot` drop into `useSyncExternalStore` — see
[react-usage.md](src/state-machine/react-usage.md).

### Async work

The machine stays synchronous — model async as an **in-flight state**:
transition into it, start the work in `after`, and `send` a follow-up event when
it settles. The pending state is observable (`machine.state === "loading"`
drives your spinner):

```ts
idle: {
  FETCH: { to: "loading", after: () => load().then((n) => machine.send("RESOLVE", n)) },
},
loading: {
  RESOLVE: { to: "ready", after: (count: number) => render(count) },
  REJECT: { to: "error" },
},
```

## License

MIT
