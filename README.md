# bb-utils

A collection of utility functions for **browser** and **Node** environments.

## Install

```bash
pnpm install bb-utils
```

## Usage

### Enum

Better than TS Enum and const objects.

```ts
import { createEnum, createEnumWithMeta, EnumApi } from "bb-utils";

const STATUS = createEnum("pending", "success", "error");
type Status = EnumValues<typeof STATUS>; // "pending" | "success" | "error"

STATUS.ref.pending; // "pending"
STATUS.contains("pending"); // true (+ narrowed)
STATUS.assert("fake"); // throws or narrows
STATUS.keys; // ["pending", "success", "error"]

const labels = STATUS.remap({ pending: "yellow", success: "green", error: "red" });
labels.pending; // "yellow"

for (const status of STATUS) {
  // status == "pending" | "success" | "error"
}

// or upgrade to createEnumWithMeta (extended interface)

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
import { is } from "bb-utils";

is.number(12); // => true (excludes NaN)
is.plainObject({ a: 1 }); // => true (not arrays or class instances)
is.date(new Date("nope")); // => false (excludes Invalid Date)

const nums = [1, null, 2, undefined].filter(is.defined); // number[]

// also: string, boolean, bigint, symbol, integer, null, undefined,
// nullish, array, function, error, promiseLike
```

### Object

Typed `Object.*` — no casting `Object.keys(x)` to `(keyof x)[]` yourself.

```ts
import { object } from "bb-utils";

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
import { createQueryParamsSchema } from "bb-utils";

const STATUS = createEnum("pending", "success", "error");
const MODE = createEnum("dense", "compact");

const qpSchema = createQueryParamsSchema({
  search: { type: "string" },
  tags: { type: "strings" },
  page: { type: "number", default: 1 },
  status: { type: "enums", enum: STATUS },
  mode: { type: "enum", enum: MODE },
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
```

## Form data

Schema-first `FormData` parsing + serialization — the query-params API, with file fields.

```ts
import { createFormDataSchema } from "bb-utils";

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
import { createEnum, createMachine } from "bb-utils";

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
