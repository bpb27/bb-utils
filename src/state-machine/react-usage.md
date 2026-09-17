# State machine in React

`createMachine` is framework-agnostic — it exposes `subscribe` + `getSnapshot`,
which are exactly what React's `useSyncExternalStore` wants. Wrap it in a small
hook that re-renders on every transition and hands back the machine to drive.

## The hook

```tsx
import { useSyncExternalStore } from "react";
import type { Machine, MachineConfig } from "@bb-utils/utils";

export function useMachine<State extends string, TConfig extends MachineConfig<State>>(
  machine: Machine<State, TConfig>,
) {
  // `state` is a primitive string, so getSnapshot is Object.is-stable — no
  // extra memoization, no tearing, no re-render loops.
  const state = useSyncExternalStore(machine.subscribe, machine.getSnapshot);
  return [state, machine] as const;
}
```

`machine.subscribe` and `machine.getSnapshot` are stable (the machine is frozen),
so they satisfy `useSyncExternalStore` without wrapping in `useCallback`.

## In a component

Create the machine once per component with a lazy `useState` initializer (or
module scope for a shared singleton), then subscribe to it with the hook.

```tsx
import { useState } from "react";
import { createEnum, createMachine } from "@bb-utils/utils";
import { useMachine } from "./use-machine";

const states = createEnum("idle", "saving", "saved", "error");

function useSaveMachine(save: (draft: string) => Promise<void>) {
  // Built once; `save` is captured at creation.
  const [machine] = useState(() =>
    createMachine(
      states,
      {
        idle: {
          SAVE: {
            // Guard: nothing to save → stay put (can() reflects this).
            before: (draft: string) => draft.trim().length > 0,
            to: "saving",
            after: (draft: string) =>
              save(draft).then(
                () => machine.send("OK"),
                () => machine.send("FAIL"),
              ),
          },
        },
        saving: {
          OK: { to: "saved" },
          FAIL: { to: "error" },
        },
        saved: { EDIT: { to: "idle" } },
        error: { RETRY: { to: "idle" } },
      },
      { initial: "idle" },
    ),
  );
  return machine;
}

function DraftEditor({ save }: { save: (draft: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [state, machine] = useMachine(useSaveMachine(save));

  return (
    <div>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />

      {/* can() runs the guard, so an empty draft or an in-flight save disables it */}
      <button disabled={!machine.can("SAVE", draft)} onClick={() => machine.send("SAVE", draft)}>
        {state === "saving" ? "Saving…" : "Save"}
      </button>

      {state === "saved" && <small>Saved ✓</small>}
      {state === "error" && <button onClick={() => machine.send("RETRY")}>Retry</button>}
    </div>
  );
}
```

The `saving` state is observable the instant `SAVE` commits, so the button label
and `disabled` flag update immediately — the async work runs in `after` and
reports back with `OK` / `FAIL`.

## Notes

- **Shared vs per-component.** The lazy `useState(() => createMachine(...))`
  above gives each mounted component its own machine. For state shared across a
  route or the whole app, create the machine at module scope (or in a context)
  and pass it to `useMachine` — every subscriber re-renders together.
- **Guards must stay pure.** `can` evaluates `before`, and React may call it on
  every render, so keep `before` a side-effect-free predicate. Commit side
  effects (network, logging) in `after`.
- **Server rendering.** `useSyncExternalStore` calls `getSnapshot` on the server
  too; since it just returns the initial state, SSR renders the starting state
  with no extra work.
