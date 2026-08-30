import type { EnumValues } from "../enum/create-enum.js";
import type { AnyEnum } from "../schema/codecs.js";

/**
 * What a transition's {@link Transition.before} hook may return:
 *
 * - `void` / `undefined` / `true` — proceed to the transition's declared `to`.
 * - `false` — cancel: stay in the current state, skip `after`.
 * - a state key — redirect: transition there instead of `to`.
 *
 * Allowing `boolean` lets a guard read as a plain predicate (`() => count > 0`).
 *
 * @typeParam State - The union of state keys.
 */
export type TransitionResult<State extends string> = void | boolean | State;

/**
 * A single event's transition: the target state plus optional lifecycle hooks.
 *
 * `before` runs first as a synchronous guard — it may cancel (return `false`)
 * or redirect (return another state) before the state changes. `after` is a
 * fire-and-forget side effect run once the transition commits; kick off async
 * work here and `send` a follow-up event when it settles.
 *
 * @typeParam State - The union of state keys.
 * @typeParam Payload - The payload type passed to `send`, threaded to both hooks.
 */
export interface Transition<State extends string, Payload = void> {
  /** The state to move to (unless `before` redirects or cancels). */
  to: State;
  /** Synchronous guard run before the transition commits. */
  before?: (payload: Payload) => TransitionResult<State>;
  /** Side effect run after the transition commits. Must not return a value. */
  after?: (payload: Payload) => void;
}

/** The event map for one state: event name → its {@link Transition}. */
type StateConfig<State extends string> = Record<string, Transition<State, any>>;

/**
 * A machine definition: every state key mapped to the events it handles. Keys
 * must match the enum's values exactly — a missing state or an unknown key is a
 * compile error.
 *
 * @typeParam State - The union of state keys.
 */
export type MachineConfig<State extends string> = Record<State, StateConfig<State>>;

/** The union of every event name across all states in a config. */
type EventOf<TConfig> = { [S in keyof TConfig]: keyof TConfig[S] }[keyof TConfig];

/** The first parameter of an arg tuple, or `void` when the hook takes none. */
type FirstArg<A extends any[]> = A extends [infer P, ...any[]] ? P : void;

/** The payload a single hook declares (`void` if the hook is absent or nullary). */
type HookArg<T, K extends "before" | "after"> =
  T extends Record<K, (...args: infer A) => any> ? FirstArg<A> : void;

/**
 * Recover a transition's payload type from whichever hook declares one,
 * preferring `before`. A nullary hook (`() => …`) contributes no payload, so an
 * event with no typed hook argument takes no `send` payload.
 */
type PayloadOf<T> = HookArg<T, "before"> extends void ? HookArg<T, "after"> : HookArg<T, "before">;

/** The payload type for one event, unioned across every state that handles it. */
type PayloadForEvent<TConfig, E> = {
  [S in keyof TConfig]: E extends keyof TConfig[S] ? PayloadOf<TConfig[S][E]> : never;
}[keyof TConfig];

/**
 * The trailing `send` arguments for an event: no payload arg when the event
 * takes none, otherwise a single required `payload`.
 */
type SendArgs<TConfig, E> = [PayloadForEvent<TConfig, E>] extends [void]
  ? []
  : [payload: PayloadForEvent<TConfig, E>];

/** The outcome of a {@link Machine.send} call. */
export interface SendResult<State extends string> {
  /** Whether the event caused a state change (`false` if unhandled or cancelled). */
  transitioned: boolean;
  /** The state this event transitioned to — or the unchanged current one. */
  state: State;
}

/** A {@link Machine.subscribe} listener, called with the new state on each commit. */
export type MachineListener<State extends string> = (state: State) => void;

/**
 * A running state machine: read {@link Machine.state}, drive it with
 * {@link Machine.send}, and gate UI with {@link Machine.can}.
 *
 * @typeParam State - The union of state keys.
 * @typeParam TConfig - The machine definition, for per-event payload typing.
 */
export interface Machine<State extends string, TConfig extends MachineConfig<State>> {
  /** The current state. */
  readonly state: State;

  /**
   * Send an event. If the current state handles it, its `before` guard runs,
   * then the state commits and `after` runs — all synchronously, so
   * {@link Machine.state} is correct the moment `send` returns. Events the
   * current state doesn't handle are ignored (no throw).
   *
   * @param event - The event name.
   * @param args - The event's payload, when it declares one.
   * @returns The {@link SendResult} for this transition.
   */
  send<E extends EventOf<TConfig>>(event: E, ...args: SendArgs<TConfig, E>): SendResult<State>;

  /**
   * Whether a `send` right now would transition: the current state handles
   * `event` *and* its `before` guard (if any) doesn't cancel. Evaluates the
   * guard by running `before`, so keep guards free of committing side effects —
   * put those in `after`. Great for gating UI (`disabled={!machine.can('SAVE')}`).
   *
   * @param event - The event name to test.
   * @param args - The event's payload, when it declares one (the guard may use it).
   */
  can<E extends EventOf<TConfig>>(event: E, ...args: SendArgs<TConfig, E>): boolean;

  /**
   * Subscribe to state changes: `listener` fires with the new state after every
   * committed transition (not on subscribe). Returns an unsubscribe function.
   *
   * Pairs with {@link Machine.getSnapshot} for React's `useSyncExternalStore`.
   *
   * @param listener - Called with the new state on each commit.
   * @returns A function that removes the listener.
   */
  subscribe(listener: MachineListener<State>): () => void;

  /** The current state — a stable snapshot for `useSyncExternalStore`. */
  getSnapshot(): State;
}

/**
 * Create a type-safe finite state machine from a states enum and a transition
 * map.
 *
 * Runs identically in browser and Node, with no runtime dependencies. The
 * machine is synchronous: transitions commit before `send` returns. Model async
 * work as an in-flight state — transition into it, start the work in `after`,
 * and `send` a follow-up event when it settles. Each event's payload type is
 * inferred from its `before`/`after` hooks, so `send` is typed per event. The
 * returned machine is frozen.
 *
 * @param states - The states enum (from {@link createEnum}); its values are the
 *   valid state keys.
 * @param config - A map of state → event → {@link Transition}. Must cover every
 *   state; use `{}` for a state with no outgoing events.
 * @param options - Startup options; `initial` is the state to begin in.
 * @returns A running {@link Machine}.
 *
 * @example
 * ```ts
 * const states = createEnum('idle', 'loading', 'ready');
 * const machine = createMachine(
 *   states,
 *   {
 *     idle: {
 *       // Commit to `loading` now, do the async work in `after`, then report
 *       // back with a follow-up event — the in-flight state is observable.
 *       FETCH: {
 *         to: 'loading',
 *         after: () => load().then((n) => machine.send('RESOLVE', n)),
 *       },
 *     },
 *     loading: {
 *       RESOLVE: { to: 'ready', after: (count: number) => render(count) },
 *     },
 *     ready: {
 *       RESET: { to: 'idle' },
 *     },
 *   },
 *   { initial: 'idle' },
 * );
 *
 * machine.send('FETCH');      // machine.state === 'loading' immediately
 * machine.can('RESET');       // false
 * ```
 */
export function createMachine<
  TState extends AnyEnum,
  const TConfig extends MachineConfig<EnumValues<TState>>,
>(
  states: TState,
  config: TConfig,
  options: { initial: EnumValues<TState> },
): Machine<EnumValues<TState>, TConfig> {
  type State = EnumValues<TState>;

  // The definition, widened to a string-indexable shape for dynamic lookup by
  // the current state / incoming event name.
  const map = config as MachineConfig<State>;

  let current: State = options.initial;
  const listeners = new Set<MachineListener<State>>();
  const notify = () => {
    for (const listener of listeners) listener(current);
  };

  const send = (event: string, payload?: unknown): SendResult<State> => {
    const transition = map[current]?.[event];
    if (!transition) return { transitioned: false, state: current };

    let target = transition.to;
    if (transition.before) {
      const result = transition.before(payload);
      if (result === false) return { transitioned: false, state: current };
      if (typeof result === "string") {
        // A string return is a redirect target; `before`'s type constrains it to
        // a state key, and the runtime assert guards against `any` leaking through.
        states.assert(result);
        target = result;
      }
      // `void` / `true` fall through to the declared `to`.
    }
    current = target;

    // Capture this transition's result before `after`, so it reports where
    // *this* event landed even if `after` synchronously sends a follow-up.
    const settled: SendResult<State> = { transitioned: true, state: current };
    notify();
    transition.after?.(payload);
    return settled;
  };

  const can = (event: string, payload?: unknown): boolean => {
    const transition = map[current]?.[event];
    if (!transition) return false;
    // No guard → always allowed; otherwise the guard must not cancel. A redirect
    // still counts as "would transition", so only an explicit `false` blocks.
    return !transition.before || transition.before(payload) !== false;
  };

  const subscribe = (listener: MachineListener<State>): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return Object.freeze({
    get state() {
      return current;
    },
    send,
    can,
    subscribe,
    getSnapshot: () => current,
  }) as Machine<State, TConfig>;
}
