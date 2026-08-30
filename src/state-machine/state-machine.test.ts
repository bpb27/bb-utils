import { describe, it, expect, expectTypeOf, vi } from "vite-plus/test";
import { createEnum } from "../enum/create-enum.js";
import { createMachine } from "./state-machine.js";

const states = createEnum("idle", "loading", "ready", "error");

function makeMachine() {
  return createMachine(
    states,
    {
      idle: {
        FETCH: { to: "loading" },
      },
      loading: {
        RESOLVE: { to: "ready" },
        REJECT: { to: "error" },
      },
      ready: {
        SET_COUNT: { to: "ready", after: (count: number) => count },
        RESET: { to: "idle" },
      },
      error: {
        RETRY: { to: "loading" },
      },
    },
    { initial: "idle" },
  );
}

describe("createMachine", () => {
  describe("transitions", () => {
    it("starts in the initial state", () => {
      expect(makeMachine().state).toBe("idle");
    });

    it("transitions on a handled event", () => {
      const machine = makeMachine();
      const result = machine.send("FETCH");
      expect(result).toEqual({ transitioned: true, state: "loading" });
      expect(machine.state).toBe("loading");
    });

    it("ignores an event the current state doesn't handle", () => {
      const machine = makeMachine();
      const result = machine.send("RESOLVE"); // only valid from `loading`
      expect(result).toEqual({ transitioned: false, state: "idle" });
      expect(machine.state).toBe("idle");
    });
  });

  describe("hooks", () => {
    it("runs before then after around the commit", () => {
      const calls: string[] = [];
      const machine = createMachine(
        states,
        {
          idle: {
            FETCH: {
              before: () => {
                calls.push(`before:${machine.state}`);
              },
              to: "loading",
              after: () => {
                calls.push(`after:${machine.state}`);
              },
            },
          },
          loading: {},
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      machine.send("FETCH");
      // `before` sees the old state, `after` the committed one.
      expect(calls).toEqual(["before:idle", "after:loading"]);
    });

    it("cancels the transition when before returns false", () => {
      const after = vi.fn();
      const machine = createMachine(
        states,
        {
          idle: { FETCH: { before: () => false, to: "loading", after } },
          loading: {},
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      const result = machine.send("FETCH");
      expect(result).toEqual({ transitioned: false, state: "idle" });
      expect(machine.state).toBe("idle");
      expect(after).not.toHaveBeenCalled();
    });

    it("redirects when before returns a different state", () => {
      const machine = createMachine(
        states,
        {
          idle: { FETCH: { before: () => "error" as const, to: "loading" } },
          loading: {},
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      const result = machine.send("FETCH");
      expect(result).toEqual({ transitioned: true, state: "error" });
    });

    it("lets after send a synchronous follow-up (transient transition)", () => {
      const machine = createMachine(
        states,
        {
          idle: {
            // Fall straight through `loading` to `ready`.
            FETCH: { to: "loading", after: () => machine.send("RESOLVE") },
          },
          loading: { RESOLVE: { to: "ready" } },
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      const result = machine.send("FETCH");
      // The result reports this event's own landing (`loading`)…
      expect(result).toEqual({ transitioned: true, state: "loading" });
      // …while the cascade has already moved the machine on to `ready`.
      expect(machine.state).toBe("ready");
    });
  });

  describe("async (modeled with an in-flight state)", () => {
    it("commits the in-flight state synchronously, settles on a follow-up event", async () => {
      const load = () => Promise.resolve(42);
      const machine = createMachine(
        states,
        {
          idle: {
            FETCH: { to: "loading", after: () => load().then((n) => machine.send("RESOLVE", n)) },
          },
          loading: { RESOLVE: { to: "ready", after: (count: number) => count } },
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      machine.send("FETCH");
      expect(machine.state).toBe("loading"); // observable immediately
      await Promise.resolve(); // let the microtask flush
      await Promise.resolve();
      expect(machine.state).toBe("ready");
    });
  });

  describe("payloads", () => {
    it("threads a payload into after", () => {
      const seen: number[] = [];
      const machine = createMachine(
        states,
        {
          idle: { FETCH: { to: "ready" } },
          loading: {},
          ready: { SET_COUNT: { to: "ready", after: (count: number) => seen.push(count) } },
          error: {},
        },
        { initial: "idle" },
      );

      machine.send("FETCH");
      machine.send("SET_COUNT", 7);
      expect(seen).toEqual([7]);
    });
  });

  describe("can", () => {
    it("reports whether the current state handles an event", () => {
      const machine = makeMachine();
      expect(machine.can("FETCH")).toBe(true);
      expect(machine.can("RESOLVE")).toBe(false);
    });

    it("runs the before guard and reflects a cancel", () => {
      let allow = false;
      const machine = createMachine(
        states,
        {
          idle: { FETCH: { before: () => allow, to: "loading" } },
          loading: {},
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );

      expect(machine.can("FETCH")).toBe(false); // guard returns false → blocked
      allow = true;
      expect(machine.can("FETCH")).toBe(true);
    });

    it("uses the payload when the guard needs it", () => {
      const machine = createMachine(
        states,
        {
          idle: {},
          loading: {},
          ready: {
            SET_COUNT: { before: (count: number) => count > 0, to: "ready" },
          },
          error: {},
        },
        { initial: "ready" },
      );

      expect(machine.can("SET_COUNT", 5)).toBe(true);
      expect(machine.can("SET_COUNT", 0)).toBe(false);
    });
  });

  describe("subscribe", () => {
    it("notifies listeners on each commit and stops after unsubscribe", () => {
      const machine = makeMachine();
      const seen: string[] = [];
      const unsubscribe = machine.subscribe((state) => seen.push(state));

      machine.send("FETCH"); // → loading
      machine.send("RESOLVE"); // → ready
      unsubscribe();
      machine.send("RESET"); // → idle, but no longer listening

      expect(seen).toEqual(["loading", "ready"]);
    });

    it("does not notify on a cancelled or unhandled event", () => {
      const machine = createMachine(
        states,
        {
          idle: { FETCH: { before: () => false, to: "loading" } },
          loading: {},
          ready: {},
          error: {},
        },
        { initial: "idle" },
      );
      const listener = vi.fn();
      machine.subscribe(listener);

      machine.send("FETCH"); // cancelled by guard → no commit, no notify
      expect(listener).not.toHaveBeenCalled();
    });

    it("exposes a snapshot matching state", () => {
      const machine = makeMachine();
      expect(machine.getSnapshot()).toBe("idle");
      machine.send("FETCH");
      expect(machine.getSnapshot()).toBe(machine.state);
    });
  });

  describe("types", () => {
    const machine = makeMachine();

    it("types state as the enum union", () => {
      expectTypeOf(machine.state).toEqualTypeOf<"idle" | "loading" | "ready" | "error">();
    });

    it("types send result state as the enum union", () => {
      const result = machine.send("FETCH");
      expectTypeOf(result.state).toEqualTypeOf<"idle" | "loading" | "ready" | "error">();
    });

    it("requires a payload for events that declare one", () => {
      // SET_COUNT's after takes a number, so the payload is required.
      // (`send` is a closure, never invoked here — just a type-level assertion.)
      // oxlint-disable-next-line typescript/unbound-method
      expectTypeOf(machine.send).toBeCallableWith("SET_COUNT", 3);
      // Payloadless events take no second arg.
      // oxlint-disable-next-line typescript/unbound-method
      expectTypeOf(machine.send).toBeCallableWith("FETCH");
    });

    it("rejects unknown event names", () => {
      // @ts-expect-error "NOPE" is not an event on any state
      machine.send("NOPE");
    });

    it("rejects an out-of-enum initial state", () => {
      createMachine(
        states,
        { idle: {}, loading: {}, ready: {}, error: {} },
        // @ts-expect-error "boot" is not a state key
        { initial: "boot" },
      );
    });
  });
});
