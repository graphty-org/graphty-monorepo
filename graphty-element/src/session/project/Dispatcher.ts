/**
 * @file The one path every change to project state takes.
 *
 * A command is looked up by its op, its arguments are copied and frozen, and it joins a group: a
 * plain dispatch is a group of its own, and a dispatch through a transaction's `tx` joins that
 * transaction's group. An undoable command writes through the group's draft; an exempt command
 * gets no draft at all. When a group seals, its patch becomes one step in the history. When it
 * fails or is cancelled, its writes are reverted through the same `applyBackward` that undo uses,
 * and nothing is recorded. See design/undo/undo-design.md sections 4 to 6.1.
 *
 * Two lanes. An immediate command executes synchronously inside `dispatch`, so a write is visible
 * to a getter as soon as `dispatch` returns. A queued command takes a slot on the session's queue
 * (through a {@link Scheduler}) and executes when its turn comes; until it has committed it is
 * pending work, listed in `pending` and cancellable.
 *
 * Op-log keys (node and edge ids, or a whole `graph` or `pins` slice) cannot be handed from one
 * open group to another the way value keys are, so a group holds the op-log keys it touched until
 * it seals. A command needing a key an open transaction holds fails at once with
 * `E_HELD_BY_TRANSACTION`; one needing a key any other open group holds waits for it, and runs
 * when that group commits or is dropped when it rolls back.
 *
 * Every change reaches the screen through the derivation lane (`./derive.ts`), and is published
 * in one order (design section 9.3): the state changes and a pass is scheduled; `project` and
 * `history` events fire synchronously; the pass runs; the `derived` events (the per-domain
 * events) fire; the caller's promise settles last. Undo, redo and restore act at call time, and
 * one called from inside a listener runs after the current call has returned.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { OperationCategory } from "../../managers/OperationQueueManager";
import type { StyleService } from "../commands/style";
import type { VisibilityService } from "../commands/visibility";
import { DerivationLane } from "./derive";
import {
    createProjectStore,
    deepFreezeArgs,
    type Draft,
    mergePatches,
    type Patch,
    type ProjectStore,
    type ValueSlice,
} from "./draft";
import { History, type HistoryChangeReason } from "./History";
import { createProjectState, type ProjectState } from "./state";
import { checkSoleHolder, strictStateEnabled } from "./strict";

/** The part of a command the dispatcher reads: its op. */
interface CommandLike {
    readonly op: string;
}

/** A key a command writes: a whole slice (`styles`, `graph`) or one key of one (`graph/n1`). */
type SliceKey = string;

/** The slices written as op-logs, whose keys are held rather than handed over. */
const OP_LOG_SLICES: ReadonlySet<string> = new Set(["graph", "pins"]);

/** Above this many ids in one slice, a command holds the whole slice instead of each id. */
const MAX_HELD_IDS = 1024;

/** The queue category of a run, whose work may outlive its transaction as a deferred member. */
const RUN_CATEGORY: OperationCategory = "algorithm-run";

/**
 * The per-session parts a definition's `execute` reaches, such as the style compiler. Each
 * slice's API sets its own part when it is built.
 */
interface CommandServices {
    styles?: StyleService;
    visibility?: VisibilityService;
}

/** What an undoable command executes with: the state to read, and the draft that writes it. */
interface UndoableContext {
    readonly state: ProjectState;
    readonly services: CommandServices;
    /** The group's draft. Read it when writing, after any await: it can change underneath. */
    readonly draft: Draft;
    /** Fires when the command is cancelled or made obsolete; a queued command stops on it. */
    readonly signal: AbortSignal;
}

/** What an exempt command executes with. No draft, so it cannot write project state. */
interface ExemptContext {
    readonly state: ProjectState;
    readonly services: CommandServices;
}

/** Which lane a command runs on. */
type Lane<C extends CommandLike> =
    | { readonly kind: "immediate" }
    | {
          readonly kind: "queued";
          /** The queue category, which decides the queue's obsolescence rules for it. */
          readonly category: OperationCategory;
          /** Two commands with one key collapse into one slot while the first has not started. */
          coalesce?(command: C): string | null;
      };

/** What every definition declares, whether or not it is undoable. */
interface DefinitionBase<C extends CommandLike> {
    readonly op: C["op"];
    /** Sets coordinates on purpose, so it seals an arrangement capture when it starts. */
    readonly moves: boolean;
    /** The keys it will write, known before it runs. */
    keys(command: C, state: ProjectState): readonly SliceKey[];
    readonly lane: Lane<C>;
    /** Changes what is drawn, so its round trip is checked on a renderer as well. */
    readonly draws?: boolean;
    /**
     * The values of its argument's discriminant (each `style.patch` action, each `data.apply`
     * kind), each of which needs its own round-trip fixture. Absent when it has none.
     */
    readonly variants?: readonly string[];
    /**
     * Argument keys kept as the caller's own objects wherever they appear, never copied or
     * frozen (a style layer's `userData`). Everything else is copied and frozen at dispatch.
     */
    readonly byReference?: readonly string[];
}

/** A command that changes project state: one step, labelled. */
export interface UndoableDefinition<C extends CommandLike> extends DefinitionBase<C> {
    readonly undo: {
        readonly kind: "undoable";
        /** What the step is called in the history ("Changed colour of Hubs"). */
        label(command: C, state: ProjectState): string;
        /** Steps with equal keys recorded close together become one step. */
        coalesce?(command: C): string | null;
    };
    /** Compute first, write last. */
    execute(command: C, ctx: UndoableContext): unknown;
}

/** A command that changes nothing a project file saves, and why. */
export interface ExemptDefinition<C extends CommandLike> extends DefinitionBase<C> {
    readonly undo: { readonly kind: "exempt"; readonly reason: string };
    execute(command: C, ctx: ExemptContext): unknown;
}

/**
 * How one op behaves under undo, and what it does. Write a definition against
 * `UndoableDefinition` or `ExemptDefinition`, so `execute` gets the context of its kind.
 */
export type CommandDefinition<C extends CommandLike> = UndoableDefinition<C> | ExemptDefinition<C>;

/**
 * A command, or a function from state to one, called at dispatch. The late form is for doors
 * whose meaning depends on state at that moment; history records the concrete command.
 */
type Dispatchable<C extends CommandLike = CommandLike> = C | ((state: ProjectState) => C);

/** The handle a transaction's callback dispatches through; what it dispatches joins the step. */
export interface TransactionScope {
    dispatch<C extends CommandLike>(command: Dispatchable<C>): Promise<unknown>;
    /** Nested transactions flatten into the outermost one: `fn` runs with this same scope. */
    transaction<T>(label: string, fn: TransactionBody<T>, options?: TransactionOptions): Promise<T>;
}

type TransactionBody<T> = (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>;

interface TransactionOptions {
    /** Stamped on the recorded step, e.g. `{ via: "assistant" }`. */
    readonly provenance?: Readonly<Record<string, string>>;
}

/** What moved live project state. */
type HistoryCause = "command" | "undo" | "redo" | "restore" | "rollback";

/** A change to live project state. */
interface ProjectChange {
    readonly slices: readonly string[];
    readonly cause: HistoryCause;
}

/** Why the history, or what the next undo will do, changed. */
type HistoryReason = HistoryChangeReason | "pending";

/** Where the dispatcher publishes; the session turns these into its events. */
interface DispatcherEvents {
    /** `project:changed`: synchronously, as soon as the state has changed. */
    project?: (change: ProjectChange) => void;
    /** `history:changed`: synchronously, after `project`. */
    history?: (reason: HistoryReason) => void;
    /** After the derivation pass: the per-domain events. One per step an undo or restore passes. */
    derived?: (change: ProjectChange) => void;
    /** Every command dispatched, as it arrives, before it runs; the doors test spies here. */
    dispatched?: (command: CommandLike) => void;
}

/** One slot a queued command holds on the queue. */
interface ScheduledSlot {
    /** Fires when the queue drops or stops the slot, including when `cancel` is called. */
    readonly signal: AbortSignal;
    /** Give the slot up: removed when it has not started, aborted when it has. */
    cancel(): void;
}

/** The queue queued commands take their turn on. */
export interface Scheduler {
    /**
     * Take a slot. The slot is held from the start of `onTurn` until the promise it returns
     * settles. `onTurn` is never called from inside `enqueue`.
     * @param category - The queue category, for the queue's ordering and obsolescence rules.
     * @param onTurn - Called when the slot comes up.
     * @returns The slot.
     */
    enqueue(category: OperationCategory, onTurn: () => Promise<void>): ScheduledSlot;
}

/** The part of the element's `OperationQueueManager` a scheduler needs. */
interface OperationQueue {
    queueOperation(category: OperationCategory, execute: () => Promise<void>): string;
    getOperationController(operationId: string): AbortController | undefined;
    cancelOperation(operationId: string): boolean;
}

/**
 * The scheduler over the session's `OperationQueueManager`: a queued command takes its turn
 * among the loads, layouts and runs already on it, and the queue's obsolescence rules reach it
 * as a cancellation with reason "obsolete".
 * @param queue - The queue.
 * @returns The scheduler.
 */
export function queueScheduler(queue: OperationQueue): Scheduler {
    return {
        enqueue(category, onTurn) {
            const id = queue.queueOperation(category, onTurn);
            const controller = queue.getOperationController(id) ?? new AbortController();

            return {
                signal: controller.signal,
                cancel: () => {
                    queue.cancelOperation(id);
                },
            };
        },
    };
}

/**
 * The scheduler of a dispatcher handed none: every queued command fails, naming what is missing.
 */
const NO_SCHEDULER: Scheduler = {
    enqueue() {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "This dispatcher was created without a queue, so it cannot run a queued command.",
            source: "history",
        });
    },
};

/** Pending undoable work, as the history lists it. Frozen. */
interface PendingStep {
    readonly id: string;
    readonly label: string;
    /** ISO 8601 of the dispatch. */
    readonly since: string;
    readonly runIds: readonly string[];
}

/** What the next undo will do. */
type NextUndo =
    | { readonly kind: "cancel"; readonly pending: readonly PendingStep[] }
    | { readonly kind: "undo"; readonly step: HistoryStepView }
    | null;

/** A recorded step as the history publishes it. */
type HistoryStepView = History<Patch>["steps"][number];

/** What an undo, a redo or a restore did. */
type HistoryOutcome =
    | { readonly kind: "undone" | "redone" | "restored"; readonly steps: readonly HistoryStepView[] }
    | { readonly kind: "cancelled"; readonly pending: readonly PendingStep[] }
    | { readonly kind: "nothing" };

/** Why pending work stopped without committing. */
type CancelReason = "undo" | "redo" | "cancel" | "obsolete" | "rollback";

interface DispatcherOptions {
    // Each definition's `execute` is checked against its own command type where it is written
    // (method parameters are bivariant), and the dispatcher only hands a definition its own op.
    readonly definitions: readonly CommandDefinition<CommandLike>[];
    /** The baseline; an empty project when absent. */
    readonly state?: ProjectState;
    /** The clock of the coalescing window. */
    readonly now?: () => number;
    /** Where changes are published; replaceable later through `events`. */
    readonly events?: DispatcherEvents;
    /** The queue of queued commands: the session's, through {@link queueScheduler}. */
    readonly scheduler?: Scheduler;
}

/** One execution of one undoable command. */
interface Job {
    /** Dispatch order. */
    readonly seq: number;
    /** Replaced by a later command coalescing into the slot while it is queued. */
    command: CommandLike;
    keys: readonly SliceKey[];
    readonly definition: UndoableDefinition<CommandLike>;
    /** The group it writes into; a run outliving its transaction moves to a group of its own. */
    group: Group;
    status: "new" | "queued" | "waiting" | "running" | "done" | "cancelled";
    readonly queuedKey: string | null;
    /** A run, which a transaction does not wait for. */
    readonly run: boolean;
    readonly controller: AbortController;
    slot: ScheduledSlot | null;
    /** The group whose hold it is waiting on. */
    blockedBy: Group | null;
    /** A transaction member's revert of its own writes. */
    revert: (() => readonly ValueSlice[]) | null;
    readonly promise: Promise<unknown>;
    resolve(value: unknown): void;
    reject(error: unknown): void;
}

/** Commands that become one step. */
interface Group {
    /** Dispatch order. */
    readonly seq: number;
    /** Its id in `pending`. */
    readonly id: string;
    readonly since: string;
    label: string;
    key: string | null;
    readonly provenance: Readonly<Record<string, string>>;
    readonly draft: Draft;
    readonly ops: string[];
    /** Every key its members declared, for the cancellation cascade. */
    readonly keys: Set<SliceKey>;
    /** The op-log keys it holds, each with the tick it was acquired at. */
    readonly holds: Map<SliceKey, number>;
    /** Members queued, waiting on a key, or running. */
    readonly jobs: Set<Job>;
    /** A deferred member's transaction step, which it merges into when that step is still on top. */
    readonly after: string | null;
    /** Set on a transaction's group. Open until `fn` settles; aborted when it rolled back. */
    readonly tx: { status: "open" | "closed" | "aborted"; readonly controller: AbortController } | null;
    /** Sealed or rolled back. */
    done: boolean;
    view: PendingStep | undefined;
}

/** When a step was recorded and undone, and the op-log keys its group held. */
interface StepMeta {
    recorded: number;
    undone: number;
    oplog: SliceKey[];
}

/**
 * The slice of a key: `graph` for `graph/n1`.
 * @param key - The key.
 * @returns The slice.
 */
function sliceOf(key: SliceKey): string {
    const slash = key.indexOf("/");
    return slash === -1 ? key : key.slice(0, slash);
}

/**
 * Whether two keys can touch the same thing. Conservative for op-logs: any two keys of one
 * op-log slice do, because a later graph writer may depend on an earlier one's rows.
 * @param a - A key.
 * @param b - Another.
 * @returns True when they may conflict.
 */
function conflicts(a: SliceKey, b: SliceKey): boolean {
    const slice = sliceOf(a);
    if (slice !== sliceOf(b)) {
        return false;
    }

    return OP_LOG_SLICES.has(slice) || a === b || a === slice || b === slice;
}

/**
 * Whether two op-log keys name the same id, or one is the whole slice holding the other.
 * @param a - A held key.
 * @param b - Another.
 * @returns True when they overlap.
 */
function overlaps(a: SliceKey, b: SliceKey): boolean {
    const slice = sliceOf(a);
    return slice === sliceOf(b) && (a === b || a === slice || b === slice);
}

/**
 * The op-log keys among a command's keys, with more than {@link MAX_HELD_IDS} ids of one slice
 * coarsened to the whole slice.
 * @param keys - The declared keys.
 * @returns The keys to hold.
 */
function opLogKeys(keys: readonly SliceKey[]): SliceKey[] {
    const bySlice = new Map<string, SliceKey[]>();
    for (const key of keys) {
        const slice = sliceOf(key);
        if (OP_LOG_SLICES.has(slice)) {
            const list = bySlice.get(slice) ?? [];
            list.push(key);
            bySlice.set(slice, list);
        }
    }

    return [...bySlice].flatMap(([slice, list]) =>
        list.length > MAX_HELD_IDS || list.includes(slice) ? [slice] : list,
    );
}

/**
 * The slices a patch touches, each once, in the order first written.
 * @param patch - The patch.
 * @returns The slices.
 */
function slicesOf(patch: Patch): readonly ValueSlice[] {
    return [...new Set(patch.entries.map((entry) => entry.slice))];
}

/**
 * The error a `tx` dispatch gets once its transaction has been aborted or has failed.
 * @param label - The transaction.
 * @returns An `AbortError`.
 */
function abortError(label: string): DOMException {
    return new DOMException(`The transaction "${label}" was aborted and rolled back.`, "AbortError");
}

/**
 * What pending work that stopped without committing settles with.
 * @param label - The work.
 * @param reason - Why it stopped.
 * @returns An `AbortError` naming the reason.
 */
function cancelledError(label: string, reason: CancelReason): DOMException {
    return new DOMException(`"${label}" was cancelled (${reason}).`, "AbortError");
}

/**
 * The error of a command needing a key an open transaction holds.
 * @param op - The command's op.
 * @param key - The held key.
 * @param holder - The transaction.
 * @returns The error.
 */
function heldError(op: string, key: SliceKey, holder: Group): GraphtyError {
    return new GraphtyError({
        code: "E_HELD_BY_TRANSACTION",
        message:
            `"${op}" needs ${key}, which the open transaction "${holder.label}" holds until it is recorded. ` +
            "Dispatch it through that transaction's tx, or again once the transaction has settled.",
        source: "history",
        details: { transaction: holder.label, key },
    });
}

/**
 * Run `work` now and hand back a promise of its result, rejected when it throws.
 * @param work - The synchronous work.
 * @returns Its result, or its throw as a rejection.
 */
function settle<T>(work: () => T): Promise<Awaited<T>> {
    return new Promise((resolve) => {
        resolve(work() as Awaited<T>);
    });
}

/**
 * Whether a value is a promise or another thenable.
 * @param value - The value.
 * @returns True when it has a `then` method.
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
    return typeof (value as { then?: unknown } | null)?.then === "function";
}

/** The one mutation path: groups, drafts, rollback, transactions and pending work. */
export class Dispatcher {
    readonly history: History<Patch>;
    /** Where every change is derived to the picture; hooks register here. */
    readonly lane: DerivationLane;
    /** The listeners; the session sets them. */
    readonly events: DispatcherEvents;
    /** What definitions reach besides state; see {@link CommandServices}. */
    readonly services: CommandServices = {};
    private readonly store: ProjectStore;
    private readonly definitions = new Map<string, CommandDefinition<CommandLike>>();
    private readonly scheduler: Scheduler;
    private readonly strict = strictStateEnabled();
    private readonly scopes = new WeakMap<TransactionScope, Group>();
    /** Pending groups: queued, waiting, running, open transactions and deferred members. */
    private readonly open = new Set<Group>();
    /** Which group holds each op-log key. */
    private readonly holders = new Map<SliceKey, Group>();
    /** The groups holding any key of each op-log slice. */
    private readonly bySlice = new Map<string, Set<Group>>();
    /** Jobs waiting on a key another group holds. */
    private readonly waiters = new Set<Job>();
    private readonly steps = new Map<string, StepMeta>();
    /** Orders dispatches, records, undos and hold acquisitions against each other. */
    private tick = 0;
    /** Moves whenever the pending list changes. */
    private changes = 0;
    /** Moves whenever a hold is taken, which can change what the next undo does. */
    private holdChanges = 0;
    private pendingCache: { key: number; value: readonly PendingStep[] } | undefined;
    private nextCache: { key: string; value: NextUndo } | undefined;
    /** `history` reasons not yet published. */
    private readonly reasons: HistoryReason[] = [];
    /** Above zero while a listener runs: a history call made then waits for a microtask. */
    private emitting = 0;

    /**
     * Create a dispatcher over a state it alone will write.
     * @param options - The definitions, the baseline, the clock, the change listener and the queue.
     */
    constructor(options: DispatcherOptions) {
        for (const definition of options.definitions) {
            this.definitions.set(definition.op, definition);
        }

        this.store = createProjectStore(options.state ?? createProjectState(), (slice, key) => {
            this.lane.touch(slice, key);
        });
        this.lane = new DerivationLane(this.store.state);
        this.events = { ...options.events };
        this.scheduler = options.scheduler ?? NO_SCHEDULER;
        this.history = new History<Patch>({
            forward: (patch) => {
                this.store.applyForward(patch);
            },
            backward: (patch) => {
                this.store.applyBackward(patch);
            },
            merge: mergePatches,
            now: options.now,
            onChange: (reason) => {
                this.note(reason);
            },
        });
    }

    /**
     * The live project state. Read-only; only commands write it.
     * @returns The state.
     */
    get state(): ProjectState {
        return this.store.state;
    }

    /**
     * Undoable work dispatched and not yet committed, oldest first: queued commands, commands
     * waiting on a key, open transactions and deferred members. The identical array between
     * changes.
     * @returns The frozen list.
     */
    get pending(): readonly PendingStep[] {
        if (this.pendingCache?.key !== this.changes) {
            this.pendingCache = {
                key: this.changes,
                value: Object.freeze(this.ordered().map((group) => this.view(group))),
            };
        }

        return this.pendingCache.value;
    }

    /**
     * What the next {@link Dispatcher.undo} will do: cancel pending work, undo a step, or nothing.
     * @returns The frozen answer, identical between changes.
     */
    get nextUndo(): NextUndo {
        const key = `${this.history.version}/${this.changes}/${this.holdChanges}`;
        if (this.nextCache?.key !== key) {
            const plan = this.plan("undo");
            let value: NextUndo = null;
            if (plan !== null) {
                value =
                    "step" in plan
                        ? Object.freeze({ kind: "undo", step: plan.step })
                        : Object.freeze({
                              kind: "cancel",
                              pending: Object.freeze(plan.cancel.map((g) => this.view(g))),
                          });
            }

            this.nextCache = { key, value };
        }

        return this.nextCache.value;
    }

    /**
     * Dispatch one command as its own step. An immediate command executes before this returns; a
     * queued one when its turn comes.
     * @param command - The command, or a function from state to one.
     * @returns What `execute` returned; rejects with what it threw, after reverting its writes,
     * or with an `AbortError` when it was cancelled.
     */
    dispatch<C extends CommandLike>(command: Dispatchable<C>): Promise<unknown> {
        return settle(() => this.submit(command, null));
    }

    /**
     * Run `fn`, and record every command it dispatches through `tx` as one step once it settles
     * and every non-run command it dispatched has executed. Runs still going then are deferred
     * members: each merges into the step when it commits while the step is on top, and records
     * as its own step otherwise.
     *
     * Membership is by origin: a dispatch made any other way while `fn` runs is its own step. If
     * such a dispatch writes a value key the transaction wrote, it takes the key over, so the
     * transaction's rollback leaves it alone; if it needs an op-log key the transaction holds, it
     * fails at once with `E_HELD_BY_TRANSACTION`. If `fn` throws, or the transaction is aborted,
     * everything it wrote is reverted, its pending members are cancelled, nothing is recorded,
     * and the error is rethrown; until `fn` settles, and after, `tx` dispatches reject with an
     * `AbortError`. After a clean settle they reject with `E_TRANSACTION_CLOSED`. A transaction
     * that wrote nothing records nothing.
     * @param label - The step's label.
     * @param fn - The body. `signal` fires when the transaction is aborted.
     * @param options - The provenance stamped on the step.
     * @returns What `fn` returned.
     */
    transaction<T>(label: string, fn: TransactionBody<T>, options: TransactionOptions = {}): Promise<T> {
        const controller = new AbortController();
        const group = this.group(label, null, options.provenance ?? {}, null, this.tick++, {
            status: "open",
            controller,
        });
        this.enter(group);
        const tx = this.scope(group);
        const { signal } = controller;

        const settled = settle(() => fn(tx, signal)).then(
            async (value) => {
                if (group.tx?.status === "open") {
                    group.tx.status = "closed";
                    await this.drain(group);
                    if (!group.done) {
                        this.sealTransaction(group);
                    }
                }

                await this.lane.settled();
                return value;
            },
            async (error: unknown) => {
                this.cancelGroup(group, error);
                await this.lane.settled();
                throw error;
            },
        );
        const aborted = new Promise<never>((_, reject) => {
            signal.addEventListener(
                "abort",
                () => {
                    void this.lane.settled().then(() => {
                        reject(signal.reason as Error);
                    });
                },
                { once: true },
            );
        });

        return Promise.race([settled, aborted]);
    }

    /**
     * Abort an open transaction: revert what it wrote now, cancel its pending members, fire its
     * signal, and reject it. Its `fn` keeps running until it notices, and every `tx` dispatch
     * meanwhile rejects.
     * @param tx - The transaction's scope.
     */
    abort(tx: TransactionScope): void {
        const group = this.scopes.get(tx);
        if (group !== undefined) {
            this.cancelGroup(group, abortError(group.label));
        }
    }

    /**
     * Undo, acting on the first of these that applies (design section 6.1):
     * 0. an open group holding an op-log key the top step touched, or holding graph keys taken
     *    since the top step was recorded, is aborted, with its dependents;
     * 1. otherwise the newest pending work dispatched after the top step, or deferred from it, is
     *    cancelled, with every later-dispatched pending item that shares a key with it;
     * 2. otherwise the top step is undone. Pending work dispatched before it keeps running.
     *
     * Acts at call time; called from inside a listener, it acts after the current call returns.
     * @returns What was done, once the picture has caught up.
     */
    undo(): Promise<HistoryOutcome> {
        return this.historyCall(() => this.move("undo"));
    }

    /**
     * Redo, by the rules of {@link Dispatcher.undo} checked against the step being redone: only
     * pending work dispatched after that step was undone is cancelled first.
     * @returns What was done, once the picture has caught up.
     */
    redo(): Promise<HistoryOutcome> {
        return this.historyCall(() => this.move("redo"));
    }

    /**
     * Move to the state just after a step, or to the baseline, as the equivalent sequence of undos
     * or redos: their cancellation rules apply for each step passed, the state changes all at
     * once. Back to the baseline (null) cancels all pending work and aborts every open
     * transaction.
     * @param id - The step, or null for the baseline.
     * @returns What was done, once the picture has caught up.
     */
    restoreTo(id: string | null): Promise<HistoryOutcome> {
        return this.historyCall(() => this.restore(id));
    }

    /**
     * Write the baseline: what `write` sets is the state history starts from, recorded as no step
     * and published as no change. Only before anything has been recorded or is pending.
     * @param write - Writes through a draft of its own.
     */
    seed(write: (draft: Draft) => void): void {
        if (this.history.steps.length > 0 || this.open.size > 0) {
            throw new GraphtyError({
                code: "E_INTERNAL",
                message: "The baseline can only be written before anything is recorded or pending.",
                source: "history",
            });
        }

        const draft = this.store.open();
        write(draft);
        draft.seal();
        this.lane.adoptBaseline();
    }

    /**
     * Drop every step, cancelling all pending work and aborting every open transaction: the
     * current state becomes the baseline.
     */
    clear(): void {
        this.cancelAll(this.cascade(this.ordered()), "cancel");
        this.history.clear();
        this.steps.clear();
        this.flushHistory();
    }

    /**
     * Cancel one pending item, and every later-dispatched pending item that shares a key with it.
     * @param id - The item's id in `pending`.
     * @returns Every item cancelled; empty when the id is not pending.
     */
    cancel(id: string): readonly PendingStep[] {
        const group = [...this.open].find((open) => open.id === id);
        return group === undefined ? Object.freeze([]) : this.cancelAll(this.cascade([group]), "cancel");
    }

    /**
     * Act now, or after the current call when called from inside a listener, and settle once the
     * pass that derives the change has run.
     * @param act - The history call.
     * @returns Its outcome.
     */
    private historyCall(act: () => HistoryOutcome): Promise<HistoryOutcome> {
        if (this.emitting > 0) {
            return new Promise((resolve) => {
                queueMicrotask(() => {
                    resolve(this.historyCall(act));
                });
            });
        }

        let outcome: HistoryOutcome;
        try {
            outcome = act();
        } catch (error) {
            return Promise.reject(error as Error);
        }

        return this.lane.settled().then(() => outcome);
    }

    /**
     * One undo or redo, now.
     * @param direction - Which.
     * @returns What was done.
     */
    private move(direction: "undo" | "redo"): HistoryOutcome {
        const plan = this.plan(direction);
        if (plan === null) {
            return { kind: "nothing" };
        }

        if ("cancel" in plan) {
            return { kind: "cancelled", pending: this.cancelAll(plan.cancel, direction) };
        }

        this.lane.restore();
        const step = direction === "undo" ? this.history.undo() : this.history.redo();
        if (step === null) {
            return { kind: "nothing" };
        }

        this.markUndone(direction, [step]);
        const change = { slices: step.slices, cause: direction };
        this.emit(change, [change]);
        return { kind: direction === "undo" ? "undone" : "redone", steps: Object.freeze([step]) };
    }

    /**
     * One restore, now.
     * @param id - The step, or null for the baseline.
     * @returns What was done.
     */
    private restore(id: string | null): HistoryOutcome {
        const { steps, position } = this.history;
        const target = id === null ? 0 : steps.findIndex((step) => step.id === id) + 1;
        if (id !== null && target === 0) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The history has no step "${id}".`,
                source: "history",
                details: { step: id },
            });
        }

        const cancelled: PendingStep[] = [];
        if (id === null) {
            cancelled.push(...this.cancelAll(this.cascade(this.ordered()), "undo"));
        } else {
            const direction = target < position ? "undo" : "redo";
            const passing = target < position ? steps.slice(target, position).reverse() : steps.slice(position, target);
            for (const step of passing) {
                for (let plan = this.plan(direction, step); plan !== null && "cancel" in plan; ) {
                    cancelled.push(...this.cancelAll(plan.cancel, direction));
                    plan = this.plan(direction, step);
                }
            }
        }

        if (target === position) {
            return cancelled.length > 0
                ? { kind: "cancelled", pending: Object.freeze(cancelled) }
                : { kind: "nothing" };
        }

        this.lane.restore();
        const passed = this.history.restoreTo(id);
        this.markUndone(target < position ? "undo" : "redo", passed);
        const slices = [...new Set(passed.flatMap((step) => step.slices))];
        this.emit(
            { slices, cause: "restore" },
            passed.map((step) => ({ slices: step.slices, cause: "restore" as const })),
        );
        return { kind: "restored", steps: passed };
    }

    /**
     * Remember when steps were undone, for the redo rules.
     * @param direction - How they were passed.
     * @param steps - The steps.
     */
    private markUndone(direction: "undo" | "redo", steps: readonly HistoryStepView[]): void {
        if (direction !== "undo") {
            return;
        }

        for (const step of steps) {
            const meta = this.steps.get(step.id);
            if (meta !== undefined) {
                meta.undone = this.tick++;
            }
        }
    }

    /**
     * Publish a change: `project` and the pending `history` reasons now, the `derived` events
     * once the pass has run.
     * @param change - What changed, for `project`.
     * @param derived - The per-domain changes, one per step.
     */
    private emit(change: ProjectChange, derived: readonly ProjectChange[]): void {
        this.notify(() => this.events.project?.(change));
        this.flushHistory();
        void this.lane.settled().then(() => {
            for (const each of derived) {
                this.notify(() => this.events.derived?.(each));
            }
        });
    }

    /**
     * Queue a `history` reason, published at the next emit or in a microtask, whichever is first.
     * @param reason - Why.
     */
    private note(reason: HistoryReason): void {
        if (reason === "pending" && this.reasons.at(-1) === "pending") {
            return;
        }

        if (this.reasons.length === 0) {
            queueMicrotask(() => {
                this.flushHistory();
            });
        }

        this.reasons.push(reason);
    }

    /** Publish every queued `history` reason, in order. */
    private flushHistory(): void {
        for (const reason of this.reasons.splice(0)) {
            this.notify(() => this.events.history?.(reason));
        }
    }

    /**
     * Call a listener. A history call it makes waits; what it throws is rethrown unhandled, so
     * it cannot leave the dispatcher half way through a change.
     * @param listener - The call.
     */
    private notify(listener: () => void): void {
        this.emitting++;
        try {
            listener();
        } catch (error) {
            queueMicrotask(() => {
                throw error;
            });
        } finally {
            this.emitting--;
        }
    }

    /**
     * The scope a transaction's `fn` dispatches through.
     * @param group - The transaction's group.
     * @returns The scope.
     */
    private scope(group: Group): TransactionScope {
        const refused = (): void => {
            if (group.tx?.status === "aborted") {
                throw abortError(group.label);
            }

            if (group.tx?.status === "closed") {
                throw new GraphtyError({
                    code: "E_TRANSACTION_CLOSED",
                    message:
                        `The transaction "${group.label}" has already been recorded; dispatch through its tx ` +
                        "before its callback returns, or through the session as a step of its own.",
                    source: "history",
                    details: { transaction: group.label },
                });
            }
        };

        const tx: TransactionScope = {
            dispatch: (command) =>
                settle(() => {
                    refused();
                    return this.submit(command, group);
                }),
            transaction: <T>(_label: string, fn: TransactionBody<T>) =>
                settle(() => {
                    refused();
                    return fn(tx, group.tx?.controller.signal ?? new AbortController().signal);
                }),
        };
        this.scopes.set(tx, group);
        return tx;
    }

    /**
     * Resolve and freeze one command and send it down its lane, in its own group or in `tx`'s.
     * @param command - The command, or a function from state to one.
     * @param tx - The transaction it joins, or null for a group of its own.
     * @returns What an exempt command returned, or the undoable command's promise.
     */
    private submit(command: Dispatchable, tx: Group | null): unknown {
        const { state } = this.store;
        const raw = typeof command === "function" ? command(state) : command;
        const definition = this.definitions.get(raw.op);
        const concrete = deepFreezeArgs(raw, definition?.byReference);
        this.events.dispatched?.(concrete);
        if (definition === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `There is no command "${concrete.op}".`,
                source: "history",
                details: { op: concrete.op },
            });
        }

        if (definition.undo.kind === "exempt") {
            return (definition as ExemptDefinition<CommandLike>).execute(concrete, { state, services: this.services });
        }

        const undoable = definition as UndoableDefinition<CommandLike>;
        const keys = undoable.keys(concrete, state);
        const { lane } = undoable;
        const queuedKey = lane.kind === "queued" ? (lane.coalesce?.(concrete) ?? null) : null;

        if (queuedKey !== null) {
            const slot = this.queuedWith(queuedKey, tx);
            if (slot !== undefined) {
                // Coalesce while queued: the new arguments take over the slot not yet started.
                slot.command = concrete;
                slot.keys = keys;
                for (const key of keys) {
                    slot.group.keys.add(key);
                }

                this.changed();
                return slot.promise;
            }
        }

        if (lane.kind === "immediate") {
            // A key held by a transaction fails before anything is opened.
            const blocker = this.blocker(opLogKeys(keys), tx);
            if (blocker !== null && blocker.group.tx !== null) {
                throw heldError(concrete.op, blocker.key, blocker.group);
            }
        }

        const group =
            tx ??
            this.group(
                undoable.undo.label(concrete, state),
                undoable.undo.coalesce?.(concrete) ?? null,
                {},
                null,
                this.tick,
                null,
            );
        const job = this.job(concrete, keys, undoable, group, queuedKey);
        for (const key of keys) {
            group.keys.add(key);
        }

        if (lane.kind === "queued") {
            job.slot = this.scheduler.enqueue(lane.category, () => this.turn(job));
            job.status = "queued";
            group.jobs.add(job);
            this.enter(group);
            job.slot.signal.addEventListener(
                "abort",
                () => {
                    this.obsolete(job);
                },
                { once: true },
            );
        } else {
            this.admit(job);
        }

        return job.promise;
    }

    /**
     * A queued job whose slot is not yet started and whose queued coalesce key is `key`.
     * @param key - The queued coalesce key.
     * @param tx - The transaction dispatching, or null.
     * @returns The job, or undefined.
     */
    private queuedWith(key: string, tx: Group | null): Job | undefined {
        for (const group of this.open) {
            for (const job of group.jobs) {
                if (job.status === "queued" && job.queuedKey === key && (job.group === tx || job.group.tx === null)) {
                    return job;
                }
            }
        }

        return undefined;
    }

    /**
     * A queued job's turn has come: start it, or put it on the wait list off the queue.
     * @param job - The job.
     * @returns Settles when the slot can be given up.
     */
    private turn(job: Job): Promise<void> {
        if (job.status !== "queued") {
            return Promise.resolve();
        }

        // Waiting on a key, the job gives the slot up; it runs off the queue when the key frees.
        return this.admit(job) === "waiting"
            ? Promise.resolve()
            : job.promise.then(
                  () => undefined,
                  () => undefined,
              );
    }

    /**
     * Start a job whose keys are free; make it wait when another group holds one; fail it when a
     * transaction holds one.
     * @param job - The job.
     * @returns Whether it started, failed or waits.
     */
    private admit(job: Job): "started" | "failed" | "waiting" {
        const blocker = this.blocker(opLogKeys(job.keys), job.group);
        if (blocker === null) {
            this.start(job);
            return "started";
        }

        if (blocker.group.tx !== null) {
            this.fail(job, heldError(job.command.op, blocker.key, blocker.group));
            return "failed";
        }

        job.status = "waiting";
        job.blockedBy = blocker.group;
        job.group.jobs.add(job);
        this.waiters.add(job);
        this.enter(job.group);
        return "waiting";
    }

    /**
     * Execute a job with its keys held. Its result settles through `finish` or `fail`.
     * @param job - The job.
     */
    private start(job: Job): void {
        const { state } = this.store;
        const { command, definition } = job;
        const { group } = job;
        job.status = "running";
        job.blockedBy = null;
        this.acquire(group, opLogKeys(job.keys));
        if (group.tx === null && group.after === null) {
            group.label = definition.undo.label(command, state);
            group.key = definition.undo.coalesce?.(command) ?? null;
            if (this.open.has(group)) {
                group.view = undefined;
                this.changed();
            }
        } else if (group.tx !== null) {
            // A failing member reverts only its own writes; the transaction goes on.
            job.revert = group.draft.checkpoint();
        }

        const ctx: UndoableContext = {
            state,
            services: this.services,
            signal: job.controller.signal,
            get draft() {
                if (job.status !== "running") {
                    throw cancelledError(job.group.label, "cancel");
                }

                return job.group.draft;
            },
        };
        let out: unknown;
        try {
            out = definition.execute(command, ctx);
        } catch (error) {
            this.fail(job, error);
            return;
        }

        if (isThenable(out)) {
            out.then(
                (value) => {
                    this.finish(job, value);
                },
                (error: unknown) => {
                    this.fail(job, error);
                },
            );
        } else {
            this.finish(job, out);
        }
    }

    /**
     * A job has executed. A transaction member stays in the transaction's draft; any other group
     * seals. A job cancelled meanwhile is ignored: its late value is discarded.
     * @param job - The job.
     * @param value - What `execute` returned.
     */
    private finish(job: Job, value: unknown): void {
        if (job.status !== "running") {
            return;
        }

        job.status = "done";
        const { group } = job;
        group.jobs.delete(job);
        group.ops.push(job.command.op);
        if (group.tx === null) {
            this.seal(group);
        }

        job.resolve(value);
    }

    /**
     * A job threw, or could not start. A transaction member reverts its own writes; any other
     * group rolls back.
     * @param job - The job.
     * @param error - Why.
     */
    private fail(job: Job, error: unknown): void {
        if (job.status === "done" || job.status === "cancelled") {
            return;
        }

        job.status = "done";
        const { group } = job;
        group.jobs.delete(job);
        this.waiters.delete(job);
        if (group.tx === null) {
            this.rollback(group);
        } else {
            this.reverted(job.revert?.() ?? []);
        }

        job.reject(error);
    }

    /**
     * The queue dropped or stopped a job's slot: a cancellation with reason "obsolete". The job's
     * group rolls back, or for a transaction member only the member's own writes.
     * @param job - The job.
     */
    private obsolete(job: Job): void {
        if (job.status !== "queued" && job.status !== "running") {
            return;
        }

        const error = cancelledError(job.group.label, "obsolete");
        if (job.group.tx === null) {
            this.cancelGroup(job.group, error);
            return;
        }

        this.reverted(job.status === "running" ? (job.revert?.() ?? []) : []);

        this.stop(job, error);
    }

    /**
     * Wait for every non-run member of a closed transaction, including ones dispatched while
     * waiting.
     * @param group - The transaction's group.
     */
    private async drain(group: Group): Promise<void> {
        for (;;) {
            const members = [...group.jobs].filter((job) => !job.run);
            if (members.length === 0 || group.done) {
                return;
            }

            await Promise.allSettled(members.map((job) => job.promise));
        }
    }

    /**
     * Record a transaction, and give each run still going a group of its own: a deferred member
     * of the transaction's step.
     * @param group - The transaction's group.
     */
    private sealTransaction(group: Group): void {
        const runs = [...group.jobs];
        group.jobs.clear();
        const stepId = this.seal(group);
        for (const job of runs) {
            const deferred = this.group(
                job.definition.undo.label(job.command, this.store.state),
                null,
                {},
                stepId,
                job.seq,
                null,
            );
            job.group = deferred;
            deferred.jobs.add(job);
            for (const key of job.keys) {
                deferred.keys.add(key);
            }

            this.enter(deferred);
        }
    }

    /**
     * Record a group's patch as one step, or nothing when it wrote nothing, then release its
     * holds. A deferred member merges into its transaction's step while that step is on top.
     * @param group - The group.
     * @returns The step the patch is in, or null.
     */
    private seal(group: Group): string | null {
        this.leave(group);
        const patch = group.draft.seal();
        const oplog = [...group.holds.keys()];
        let id: string | null = null;
        if (patch.entries.length > 0) {
            const slices = slicesOf(patch);
            const input = { label: group.label, patch, key: group.key, ops: group.ops, slices };
            if (group.after !== null && this.history.amend(group.after, input)) {
                id = group.after;
            } else {
                const provenance =
                    group.after === null ? group.provenance : { ...group.provenance, after: group.after };
                id = this.history.record({ ...input, provenance });
            }

            const meta = this.steps.get(id);
            const recorded = this.tick++;
            if (meta === undefined) {
                this.steps.set(id, { recorded, undone: -1, oplog });
            } else {
                meta.recorded = recorded;
                meta.oplog.push(...oplog);
            }

            this.prune();
            const change = { slices, cause: "command" as const };
            this.emit(change, [change]);
        }

        this.release(group, true);
        return id;
    }

    /**
     * Revert everything a group still holds, and say so when anything live changed.
     * @param group - The group.
     */
    private rollback(group: Group): void {
        this.leave(group);
        this.reverted(slicesOf(group.draft.rollback()));
        this.release(group, false);
    }

    /**
     * Live writes were reverted: derive them in restore mode, and say so.
     * @param slices - The slices reverted; nothing happens when empty.
     */
    private reverted(slices: readonly string[]): void {
        if (slices.length > 0) {
            this.lane.restore();
            const change = { slices, cause: "rollback" as const };
            this.emit(change, [change]);
        }
    }

    /**
     * Cancel a group: stop its members, roll it back, and for a transaction, mark it aborted and
     * fire its signal.
     * @param group - The group.
     * @param reason - What the group's caller rejects with: a plain group's job, or the transaction.
     * @param why - Why a transaction's members were stopped, for their own rejections.
     */
    private cancelGroup(group: Group, reason: unknown, why: CancelReason = "rollback"): void {
        if (group.done) {
            return;
        }

        if (group.tx !== null) {
            group.tx.status = "aborted";
        }

        for (const job of [...group.jobs]) {
            this.stop(job, group.tx === null ? reason : cancelledError(job.command.op, why));
        }

        this.rollback(group);
        group.tx?.controller.abort(reason);
    }

    /**
     * Stop one job: off the queue, off the wait list, its signal fired, its caller rejected. Its
     * writes are its group's to revert.
     * @param job - The job.
     * @param reason - What its caller's promise rejects with.
     */
    private stop(job: Job, reason: unknown): void {
        if (job.status === "done" || job.status === "cancelled") {
            return;
        }

        job.status = "cancelled";
        job.group.jobs.delete(job);
        this.waiters.delete(job);
        job.controller.abort(reason);
        job.slot?.cancel();
        job.reject(reason);
    }

    /**
     * Cancel groups, newest first.
     * @param groups - The groups, in dispatch order.
     * @param reason - Why.
     * @returns Their pending views, in dispatch order.
     */
    private cancelAll(groups: readonly Group[], reason: CancelReason): readonly PendingStep[] {
        const views = Object.freeze(groups.map((group) => this.view(group)));
        for (const group of [...groups].reverse()) {
            this.cancelGroup(
                group,
                group.tx === null ? cancelledError(group.label, reason) : abortError(group.label),
                reason,
            );
        }

        return views;
    }

    /**
     * What an undo or a redo will act on (design section 6.1).
     * @param direction - Which.
     * @param target - The step it would pass; by default the one next to the cursor.
     * @returns The groups to cancel, the step to move over, or null for nothing.
     */
    private plan(
        direction: "undo" | "redo",
        target: HistoryStepView | undefined = this.adjacent(direction),
    ): { cancel: readonly Group[] } | { step: HistoryStepView } | null {
        if (direction === "redo" && target === undefined) {
            return null;
        }

        const meta = target === undefined ? undefined : this.steps.get(target.id);
        const since = (direction === "undo" ? meta?.recorded : meta?.undone) ?? -1;
        const open = this.ordered();

        // Rule 0: an open group in the way of the step.
        if (meta !== undefined && meta.oplog.length > 0) {
            const touchesGraph = meta.oplog.some((key) => sliceOf(key) === "graph");
            const inWay = open.filter((group) =>
                [...group.holds].some(
                    ([key, at]) =>
                        meta.oplog.some((touched) => overlaps(key, touched)) ||
                        (touchesGraph && sliceOf(key) === "graph" && at > since),
                ),
            );
            if (inWay.length > 0) {
                return { cancel: this.cascade(inWay) };
            }
        }

        // Rule 1: pending work newer than the step.
        const newer = open.filter(
            (group) => group.seq > since || (direction === "undo" && target !== undefined && group.after === target.id),
        );
        const newest = newer.at(-1);
        if (newest !== undefined) {
            return { cancel: this.cascade([newest]) };
        }

        // Rule 2.
        return target === undefined ? null : { step: target };
    }

    /**
     * The step next to the cursor.
     * @param direction - Which side: the top done step, or the next undone one.
     * @returns The step, or undefined at the end of the history.
     */
    private adjacent(direction: "undo" | "redo"): HistoryStepView | undefined {
        const { steps, position } = this.history;
        if (direction === "redo") {
            return steps[position];
        }

        return position === 0 ? undefined : steps[position - 1];
    }

    /**
     * The groups to cancel with `roots`: every later-dispatched pending group sharing a key with
     * one of them, transitively.
     * @param roots - The groups being cancelled.
     * @returns Them and their dependents, in dispatch order.
     */
    private cascade(roots: readonly Group[]): readonly Group[] {
        const out = new Set(roots);
        const keysOf = (group: Group): SliceKey[] => [...group.keys, ...group.holds.keys()];
        for (const group of this.ordered()) {
            if (out.has(group)) {
                continue;
            }

            const mine = keysOf(group);
            for (const earlier of out) {
                if (earlier.seq < group.seq && keysOf(earlier).some((a) => mine.some((b) => conflicts(a, b)))) {
                    out.add(group);
                    break;
                }
            }
        }

        return [...out].sort((a, b) => a.seq - b.seq);
    }

    /**
     * The group holding one of `keys`, other than `self`.
     * @param keys - Op-log keys.
     * @param self - The group asking, whose own holds do not block it.
     * @returns The holder and the key, or null when every key is free.
     */
    private blocker(keys: readonly SliceKey[], self: Group | null): { group: Group; key: SliceKey } | null {
        for (const key of keys) {
            const slice = sliceOf(key);
            if (key === slice) {
                for (const group of this.bySlice.get(slice) ?? []) {
                    if (group !== self) {
                        return { group, key };
                    }
                }
            } else {
                const group = this.holders.get(key) ?? this.holders.get(slice);
                if (group !== undefined && group !== self) {
                    return { group, key };
                }
            }
        }

        return null;
    }

    /**
     * Hold op-log keys for a group until it seals or rolls back.
     * @param group - The group.
     * @param keys - The keys.
     */
    private acquire(group: Group, keys: readonly SliceKey[]): void {
        for (const key of keys) {
            if (group.holds.has(key)) {
                continue;
            }

            if (this.strict) {
                checkSoleHolder(key, this.blocker([key], group)?.group.label ?? null);
            }

            group.holds.set(key, this.tick++);
            this.holders.set(key, group);
            const slice = sliceOf(key);
            const holding = this.bySlice.get(slice) ?? new Set();
            holding.add(group);
            this.bySlice.set(slice, holding);
        }

        if (keys.length > 0) {
            this.holdChanges++;
        }
    }

    /**
     * Release a group's holds, and wake what waited on them: on commit it runs, on rollback it is
     * dropped.
     * @param group - The group.
     * @param committed - Whether the group sealed rather than rolled back.
     */
    private release(group: Group, committed: boolean): void {
        for (const key of group.holds.keys()) {
            if (this.holders.get(key) === group) {
                this.holders.delete(key);
            }

            this.bySlice.get(sliceOf(key))?.delete(group);
        }

        group.holds.clear();
        for (const job of [...this.waiters]) {
            if (job.blockedBy !== group) {
                continue;
            }

            this.waiters.delete(job);
            if (committed) {
                this.admit(job);
            } else if (job.group.tx === null) {
                this.cancelGroup(job.group, cancelledError(job.group.label, "rollback"));
            } else {
                this.stop(job, cancelledError(job.command.op, "rollback"));
            }
        }
    }

    /**
     * A new group, with its draft open.
     * @param label - Its label.
     * @param key - Its history coalesce key.
     * @param provenance - Stamped on its step.
     * @param after - The step it is a deferred member of, or null.
     * @param seq - Its dispatch order.
     * @param tx - Its transaction state, for a transaction's group.
     * @returns The group.
     */
    private group(
        label: string,
        key: string | null,
        provenance: Readonly<Record<string, string>>,
        after: string | null,
        seq: number,
        tx: Group["tx"],
    ): Group {
        return {
            seq,
            id: `pending-${seq}`,
            since: new Date().toISOString(),
            label,
            key,
            provenance: Object.freeze({ ...provenance }),
            draft: this.store.open(),
            ops: [],
            keys: new Set(),
            holds: new Map(),
            jobs: new Set(),
            after,
            tx,
            done: false,
            view: undefined,
        };
    }

    /**
     * A new job, not yet on any lane.
     * @param command - The concrete command.
     * @param keys - Its declared keys.
     * @param definition - Its definition.
     * @param group - The group it writes into.
     * @param queuedKey - Its queued coalesce key.
     * @returns The job.
     */
    private job(
        command: CommandLike,
        keys: readonly SliceKey[],
        definition: UndoableDefinition<CommandLike>,
        group: Group,
        queuedKey: string | null,
    ): Job {
        let yes: (value: unknown) => void = () => undefined;
        let no: (error: unknown) => void = () => undefined;
        const promise = new Promise<unknown>((resolve, reject) => {
            yes = resolve;
            no = reject;
        });
        // A cancelled job nobody awaited must not surface as an unhandled rejection.
        promise.catch(() => undefined);

        return {
            seq: this.tick++,
            command,
            keys,
            definition,
            group,
            status: "new",
            queuedKey,
            run: definition.lane.kind === "queued" && definition.lane.category === RUN_CATEGORY,
            controller: new AbortController(),
            slot: null,
            blockedBy: null,
            revert: null,
            promise,
            // The caller hears last, after the pass and the events it publishes.
            resolve: (value) => {
                this.afterPass(() => {
                    yes(value);
                });
            },
            reject: (error) => {
                this.afterPass(() => {
                    no(error);
                });
            },
        };
    }

    /**
     * List a group as pending.
     * @param group - The group.
     */
    private enter(group: Group): void {
        if (!this.open.has(group)) {
            this.open.add(group);
            this.changed();
        }
    }

    /**
     * Stop listing a group as pending, and mark it done.
     * @param group - The group.
     */
    private leave(group: Group): void {
        group.done = true;
        if (this.open.delete(group)) {
            this.changed();
        }
    }

    /**
     * The pending groups in dispatch order.
     * @returns The groups.
     */
    private ordered(): Group[] {
        return [...this.open].sort((a, b) => a.seq - b.seq);
    }

    /**
     * A group as `pending` lists it.
     * @param group - The group.
     * @returns The frozen view.
     */
    private view(group: Group): PendingStep {
        group.view ??= Object.freeze({
            id: group.id,
            label: group.label,
            since: group.since,
            runIds: Object.freeze([]),
        });
        return group.view;
    }

    /**
     * Run `settle` once the change being made now has been derived. The lane is asked at the end
     * of the current synchronous work, when every write of it has been marked.
     * @param settle - What to run.
     */
    private afterPass(settle: () => void): void {
        queueMicrotask(() => {
            void this.lane.settled().then(settle);
        });
    }

    /** The pending list changed. */
    private changed(): void {
        this.changes++;
        this.note("pending");
    }

    /** Forget the record times of steps the history no longer has. */
    private prune(): void {
        if (this.steps.size <= this.history.steps.length * 2) {
            return;
        }

        const kept = new Set(this.history.steps.map((step) => step.id));
        for (const id of this.steps.keys()) {
            if (!kept.has(id)) {
                this.steps.delete(id);
            }
        }
    }
}
