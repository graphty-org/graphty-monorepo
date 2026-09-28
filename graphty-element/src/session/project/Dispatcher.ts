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

import type { NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { OperationCategory } from "../../managers/OperationQueueManager";
import type { LegacyService, RunService } from "../commands/algo";
import type { DataService } from "../commands/data";
import type { LayoutAdvice, LayoutService } from "../commands/layout";
import type { SetService } from "../commands/sets";
import type { StyleService } from "../commands/style";
import type { CameraService } from "../commands/view";
import type { VisibilityService } from "../commands/visibility";
import type { ProjectConfig } from "../types";
import { Arrangement, type ArrangementOp } from "./arrangement";
import { DerivationLane } from "./derive";
import {
    createProjectStore,
    deepFreezeArgs,
    type Draft,
    isEmptyPatch,
    mergePatches,
    type Patch,
    patchBytes,
    patchCharge,
    type ProjectStore,
    type Slice,
    touchedBy,
    withoutNoOps,
} from "./draft";
import { GraphOps, nodeKey, reshapes, restoresNodes, TouchedIds } from "./graphOps";
import { History, type HistoryChangeReason, type OpenArrangement } from "./History";
import { createProjectState, type ProjectState } from "./state";
import { checkInlineKey, checkSoleHolder, strictStateEnabled, verifyRetainedArrays } from "./strict";

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
    data?: DataService;
    /** The arrangement: where `positions.*` write. Always present. */
    positions?: Arrangement;
    runs?: RunService;
    /** A renderer's: constructs a plugin algorithm that has no descriptor, for `algo.legacy`. */
    legacy?: LegacyService;
    styles?: StyleService;
    visibility?: VisibilityService;
    sets?: SetService;
    camera?: CameraService;
    /** The renderer's layout engine and scene: what `layout.set` and `view.dimension` build. */
    layout?: LayoutService;
    /** Which layout suits the graph held now, for an import that asks for one. */
    layoutAdvice?: LayoutAdvice;
    /** The project settings in effect, with every unset key at its default. */
    config?: () => ProjectConfig;
}

/** What the queue hands a queued command when its slot comes up. */
interface SlotContext {
    /** Where the queue's own progress events are written, when the queue publishes any. */
    readonly progress?: {
        setProgress(percent: number): void;
        setMessage(message: string): void;
        setPhase(phase: string): void;
    };
    /** The queue's id for the slot. */
    readonly id?: string;
}

/** How one dispatch is made, beyond the command itself. */
interface DispatchOptions {
    /** Aborting it withdraws the command: off the queue if it waits, stopped if it runs. */
    readonly signal?: AbortSignal;
    /** A queued command that starts at once, beside the queue, instead of taking a slot. */
    readonly beside?: boolean;
}

/** Dispatch one command, as a transaction's scope or a deferred member's origin does. */
export type DispatchFunction = <C extends CommandLike>(
    command: Dispatchable<C>,
    options?: DispatchOptions,
) => Promise<unknown>;

/** What an undoable command executes with: the state to read, and the draft that writes it. */
export interface UndoableContext {
    readonly state: ProjectState;
    readonly services: CommandServices;
    /** The group's draft. Read it when writing, after any await: it can change underneath. */
    readonly draft: Draft;
    /** Fires when the command is cancelled or made obsolete; a queued command stops on it. */
    readonly signal: AbortSignal;
    /** What the queue handed the slot; empty for an immediate command or one started beside it. */
    readonly slot: SlotContext;
    /** Settles, never rejecting, once the command has finished and the pass drawing it has run. */
    readonly done: Promise<void>;
    /**
     * Start work on behalf of this command once its group has been recorded, as deferred members
     * of its step: each merges into the step while it is on top. Registered once per key and
     * group, so a batch of two adding commands starts it once. Dropped when the group rolls back.
     * Its arguments: what the work is, so a second registration of it is ignored, and what starts
     * it through the dispatch it is handed.
     */
    readonly after: (key: string, start: (dispatch: DispatchFunction) => void) => void;
    /**
     * Dispatch into this command's own group, now, whatever the dispatched command's lane: what
     * `algo.legacy` hands the plugin it runs, through the graph facade (design section 4.5). The
     * command writes only keys that are free or this group's own; one another group holds fails.
     */
    readonly inline: DispatchFunction;
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
          /** For an op whose commands differ (an add, an update, a removal): each one's category. */
          categoryOf?(command: C): OperationCategory;
          /** Two commands with one key collapse into one slot while the first has not started. */
          coalesce?(command: C): string | null;
      };

/** What every definition declares, whether or not it is undoable. */
interface DefinitionBase<C extends CommandLike> {
    readonly op: C["op"];
    /**
     * Takes a before-arrangement when it starts (design section 6.4): it sets coordinates on
     * purpose, or holds its slot while a layout can move the lane (a chunked import).
     */
    readonly moves: boolean;
    /** For an op only some of whose commands take one (`clear` among the data mutations). */
    movesWhen?(command: C): boolean;
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
    /**
     * For a compound op (`batch`): the commands it is made of. It runs as a transaction of
     * them, one step, and its own `execute` is never called.
     */
    members?(command: C): { readonly label: string; readonly steps: readonly CommandLike[] };
    /** Settling, whether it commits or fails, closes the baseline window (an import). */
    readonly closesBaseline?: boolean;
    /**
     * Carried out only on a renderer, which registers the service it needs: a headless session
     * refuses it, so its round trip is checked on a renderer only.
     */
    readonly renderer?: boolean;
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
    dispatch<C extends CommandLike>(command: Dispatchable<C>, options?: DispatchOptions): Promise<unknown>;
    /** Nested transactions flatten into the outermost one: `fn` runs with this same scope. */
    transaction<T>(label: string, fn: TransactionBody<T>, options?: TransactionOptions): Promise<T>;
}

type TransactionBody<T> = (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>;

interface TransactionOptions {
    /** Stamped on the recorded step, e.g. `{ via: "assistant" }`. */
    readonly provenance?: Readonly<Record<string, string>>;
    /** Declared at construction: while the baseline window is open it commits into the baseline. */
    readonly setup?: boolean;
    /**
     * A batch's transaction: its members are known when it opens and it settles by itself, so a
     * command needing a key it holds waits for it instead of being refused.
     */
    readonly compound?: boolean;
    /**
     * Takes its before-arrangement when it opens, not at its first graph write: a node drag, whose
     * pointer moves write the lane before anything is dispatched (design section 5.3).
     */
    readonly moves?: boolean;
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
    /**
     * After an undo, a redo or a restore that touched node or edge ids: the session selects them
     * (design section 8). Not called when the steps touched none, or {@link TouchedIds.skip}.
     */
    touched?: {
        /** The most ids worth selecting. */
        readonly cap: () => number;
        select(ids: TouchedIds): void;
    };
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
    enqueue(
        category: OperationCategory,
        onTurn: (context?: SlotContext) => Promise<void>,
        description?: string,
    ): ScheduledSlot;
}

/** The part of the element's `OperationQueueManager` a scheduler needs. */
interface OperationQueue {
    queueOperation(
        category: OperationCategory,
        execute: (context: SlotContext) => Promise<void>,
        options?: { description?: string },
    ): string;
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
        enqueue(category, onTurn, description) {
            const id = queue.queueOperation(category, onTurn, description === undefined ? undefined : { description });
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

/** The part of a session's run queue a scheduler needs. */
interface RunQueueLike {
    queueOperation(
        category: "algorithm-run",
        execute: (context: SlotContext & { readonly signal: AbortSignal }) => Promise<void> | void,
        options?: { description?: string },
    ): string;
    cancelOperation(operationId: string): boolean;
}

/**
 * The scheduler over a headless session's run queue, which has no categories and no
 * obsolescence: a queued command takes its turn among the runs, in the order it was dispatched.
 * @param queue - The queue.
 * @returns The scheduler.
 */
export function runQueueScheduler(queue: RunQueueLike): Scheduler {
    return {
        enqueue(_category, onTurn, description) {
            const controller = new AbortController();
            const id = queue.queueOperation(
                "algorithm-run",
                (context) => {
                    context.signal.addEventListener(
                        "abort",
                        () => {
                            controller.abort(context.signal.reason);
                        },
                        { once: true },
                    );
                    return onTurn({
                        ...(context.progress === undefined ? {} : { progress: context.progress }),
                        id: context.id,
                    });
                },
                description === undefined ? undefined : { description },
            );

            return {
                signal: controller.signal,
                cancel: () => {
                    controller.abort();
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

/** Where a cancellation's error carries its reason. */
const CANCEL_REASON: unique symbol = Symbol("cancel reason");

/**
 * Why pending work was cancelled, read from the error its signal was aborted with.
 * @param error - The abort reason.
 * @returns The reason, or undefined when the error is not a cancellation of the dispatcher's.
 */
export function cancelReasonOf(error: unknown): CancelReason | undefined {
    return (error as { readonly [CANCEL_REASON]?: CancelReason } | null)?.[CANCEL_REASON];
}

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
    /**
     * Open the baseline window (design section 3.3): until the first graph write records or the
     * first import settles, what commits becomes the baseline instead of a step. A renderer's
     * session opens it, so what the page declared is not undoable.
     */
    readonly baselineWindow?: boolean;
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
    /** Dispatched inline by a running member of its group: it neither seals nor rolls back the group. */
    readonly inline: boolean;
    readonly controller: AbortController;
    slot: ScheduledSlot | null;
    /** The group whose hold it is waiting on. */
    blockedBy: Group | null;
    /** A transaction member's revert of its own writes. */
    revert: (() => readonly Slice[]) | null;
    /** What the queue handed its slot. */
    slotContext: SlotContext;
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
    /** Declared at construction: commits into the baseline while the window is open. */
    readonly setup: boolean;
    /** A batch's transaction, which a command needing its keys waits for. */
    readonly compound: boolean;
    /** Work to start once it is recorded, by key; see `UndoableContext.after`. */
    readonly onSeal: Map<string, (dispatch: DispatchFunction) => void>;
    /** Its before-arrangement, once a member that needs one has started; see `History.open`. */
    arrangement: OpenArrangement | null;
    /** The graph epoch when it took its before-arrangement. */
    epoch: number;
}

/** The step a deferred member's work belongs to, and whether its origin was declared at construction. */
interface DeferredOrigin {
    readonly step: string | null;
    readonly setup: boolean;
}

/** When a step was recorded and undone, and the op-log keys its group held. */
interface StepMeta {
    recorded: number;
    undone: number;
    oplog: SliceKey[];
    /**
     * It removed nodes while a layout had moved the lane since the last rest point, so undoing it
     * puts them back where they were in flight rather than where the step below came to rest.
     */
    removedInFlight: boolean;
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
function slicesOf(patch: Patch): readonly Slice[] {
    return [
        ...new Set<Slice>([
            ...patch.entries.map((entry) => entry.slice),
            ...patch.log.map((entry) => entry.slice),
            ...(patch.rows === null ? [] : ["arrangement" as const]),
        ]),
    ];
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
    return Object.assign(new DOMException(`"${label}" was cancelled (${reason}).`, "AbortError"), {
        [CANCEL_REASON]: reason,
    });
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
 * Whether a group refuses a command needing a key it holds, rather than making it wait: an open
 * transaction whose caller is still dispatching into it. A batch settles by itself, so it waits.
 * @param group - The holder.
 * @returns True when the command fails at once with `E_HELD_BY_TRANSACTION`.
 */
function refuses(group: Group): boolean {
    return group.tx !== null && !group.compound;
}

/**
 * Whether a command was declared at construction: `setup: true` among its arguments.
 * @param command - The command.
 * @returns True for a setup command.
 */
function isSetup(command: CommandLike): boolean {
    return (command as { readonly setup?: unknown }).setup === true;
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
    /** The graph primitives over this dispatcher's `graph` and `pins` slices. */
    readonly graph: GraphOps;
    /** Node coordinates at rest: captures, the `arrangement` and `pins` hooks, rest points. */
    readonly arrangement: Arrangement;
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
    /** The ids the steps passed by the history call under way touched; null outside one. */
    private touching: TouchedIds | null = null;
    /** What an immediate command threw synchronously, for {@link Dispatcher.dispatchNow}. */
    private syncFailure: { error: unknown } | null = null;
    /** Whether commits still become the baseline rather than steps (design section 3.3). */
    private baselineOpen: boolean;
    /** Where an untagged dispatch goes during a call through a group-tagged facade; see {@link Dispatcher.routed}. */
    private route: DispatchFunction | null = null;
    /**
     * Stamped on every step as it is recorded, under the step's own provenance: the renderer
     * stamps `xr` while an immersive session is active (design section 5.3).
     */
    ambientProvenance: (() => Readonly<Record<string, string>>) | null = null;

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
        const state = this.store.state as { graph: ProjectState["graph"] };
        // The store's own set (`createProjectState`), typed read-only for every other reader.
        const pins = this.store.state.pins as Set<NodeId>;
        this.graph = new GraphOps({
            read: () => state.graph,
            write: (slice) => {
                state.graph = slice;
            },
            touch: (key) => {
                this.lane.touch("graph", key);
            },
            pins: () => pins,
            touchPin: (id) => {
                this.lane.touch("pins", nodeKey(id));
            },
            strict: this.strict,
            session: true,
        });
        this.events = { ...options.events };
        this.scheduler = options.scheduler ?? NO_SCHEDULER;
        this.baselineOpen = options.baselineWindow === true;
        this.history = new History<Patch>({
            forward: (patch) => {
                this.store.applyForward(patch);
                this.collect(patch);
            },
            backward: (patch) => {
                this.store.applyBackward(patch);
                this.collect(patch);
            },
            merge: mergePatches,
            now: options.now,
            onChange: (reason) => {
                this.note(reason);
            },
            rows: (patch) => patch.rows,
            restoresRows: (id) => this.steps.get(id)?.removedInFlight === true,
            reshapes: (patch) => reshapes(patch.log),
        });
        this.arrangement = new Arrangement(this.store.state, this.lane, this.history, this.graph);
        this.services.positions = this.arrangement;
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
     * @param options - Its signal, and whether a queued command starts beside the queue.
     * @returns What `execute` returned; rejects with what it threw, after reverting its writes,
     * or with an `AbortError` when it was cancelled.
     */
    dispatch<C extends CommandLike>(command: Dispatchable<C>, options: DispatchOptions = {}): Promise<unknown> {
        if (this.route !== null) {
            return this.route(command, options);
        }

        return settle(() => this.submit(command, null, options));
    }

    /**
     * A dispatch that goes where one made now would -- to the transaction or running command a
     * routed verb is inside, or to this dispatcher -- for a verb that dispatches after an await,
     * when the routing, which lasts for the synchronous part of the call only, has ended.
     * @returns The dispatch.
     */
    capturedDispatch(): <C extends CommandLike>(command: Dispatchable<C>) => Promise<unknown> {
        const via = this.route;
        return via === null ? (command) => this.dispatch(command) : (command) => via(command, {});
    }

    /**
     * Whether no group is open: nothing is executing, and no transaction or queued command is
     * waiting to seal. What a minted id not yet sealed is told apart from one a rollback dropped by.
     * @returns True when none is.
     */
    get idle(): boolean {
        return this.open.size === 0;
    }

    /**
     * Whether a call through a group-tagged facade is on the stack, so a door that would take a
     * turn on the operation queue dispatches at once instead: the queue's slot is the running
     * command's own, and waiting for it would never end.
     * @returns True during such a call.
     */
    get routing(): boolean {
        return this.route !== null;
    }

    /**
     * Run `fn` with every untagged dispatch, transaction and immediate dispatch it makes routed
     * to `via`. Membership is by origin: the routing lasts for the synchronous part of `fn` only,
     * which is where a door dispatches, so nothing dispatched from anywhere else joins.
     * @param via - Where the dispatches go: a running command's `inline`.
     * @param fn - The call.
     * @returns What `fn` returned.
     */
    routed<T>(via: DispatchFunction, fn: () => T): T {
        const previous = this.route;
        this.route = via;
        try {
            return fn();
        } finally {
            this.route = previous;
        }
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
        const via = this.route;
        if (via !== null) {
            // Already inside one command's group: the transaction's members join it.
            const scope: TransactionScope = {
                dispatch: (command, dispatched) => via(command, dispatched),
                transaction: (_label, body) => settle(() => body(scope, new AbortController().signal)),
            };
            return settle(() => fn(scope, new AbortController().signal));
        }

        const controller = new AbortController();
        const group = this.group(
            label,
            null,
            options.provenance ?? {},
            null,
            this.tick++,
            {
                status: "open",
                controller,
            },
            options.setup === true,
            options.compound === true,
        );
        this.enter(group);
        if (options.moves === true) {
            this.takeBefore(group);
        }

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
        this.arrangement.flush();
        this.history.clear(this.arrangement.capture());
        this.steps.clear();
        this.flushHistory();
    }

    /**
     * The command of the newest pending work queued under a queued coalesce key, until it
     * commits: what a door assigned and its getter reads back while the slot waits.
     * @param key - The queued coalesce key.
     * @returns The command, or undefined when nothing under that key is pending.
     */
    pendingCommand(key: string): CommandLike | undefined {
        let found: Job | undefined;
        for (const group of this.open) {
            for (const job of group.jobs) {
                if (job.queuedKey === key && (found === undefined || job.seq > found.seq)) {
                    found = job;
                }
            }
        }

        return found?.command;
    }

    /**
     * Do one command now, and throw what it throws, for a synchronous door. A queued command
     * starts beside the queue rather than waiting for a turn, as `skipQueue` always did. Routed
     * into a transaction, an immediate command that is refused throws here too, having reverted
     * only its own writes; the transaction goes on.
     * @param command - The command.
     * @returns What `execute` returned.
     */
    dispatchNow<C extends CommandLike>(command: Dispatchable<C>): unknown {
        this.syncFailure = null;
        const promise = (
            this.route === null ? this.submit(command, null, { beside: true }) : this.route(command)
        ) as Promise<unknown>;
        const failure = this.syncFailure as { error: unknown } | null;
        this.syncFailure = null;
        if (failure !== null) {
            // Thrown here instead; the same failure must not also surface as an unhandled rejection.
            if (isThenable(promise)) {
                promise.then(undefined, () => undefined);
            }

            throw failure.error;
        }

        return promise;
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
     * Whether a job's group takes a before-arrangement as it starts: the job's command moves, or
     * it is a transaction's first graph write.
     * @param job - The job starting.
     * @returns True when it does.
     */
    private takesBefore(job: Job): boolean {
        const { definition, command } = job;
        if (definition.moves || definition.movesWhen?.(command) === true) {
            return true;
        }

        return job.group.tx !== null && job.keys.some((key) => sliceOf(key) === "graph");
    }

    /**
     * Give a group its before-arrangement: where the lane is now (design section 6.4).
     * @param group - The group.
     */
    private takeBefore(group: Group): void {
        const before = this.arrangement.before();
        if (before !== null) {
            group.arrangement = this.history.open(before);
            group.epoch = this.store.state.graph.epoch;
        }
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

        return this.lane.settled().then(() => {
            // Strict state: once the picture has caught up, the pin bytes are what the pins slice
            // at this history position says.
            this.arrangement.checkPins();
            return outcome;
        });
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

        const step = this.history.moveAs(() => {
            // Sealed before the cursor moves, so an arrangement in flight is not given to the
            // step below (design section 6.2).
            this.arrangement.seal();
            this.lane.restore(direction);
            this.arrangement.stop();
            this.touching = this.startTouching();
            const moved = direction === "undo" ? this.history.undo() : this.history.redo();
            if (moved !== null) {
                this.arrangement.restore(this.history.takeArrangement());
            }

            return moved;
        });
        if (step === null) {
            this.touching = null;
            return { kind: "nothing" };
        }

        this.markUndone(direction, [step]);
        const change = { slices: step.slices, cause: direction };
        this.emit(change, [change]);
        this.selectTouched();
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

        const passed = this.history.moveAs(() => {
            this.arrangement.seal();
            this.lane.restore();
            this.arrangement.stop();
            this.touching = this.startTouching();
            const steps = this.history.restoreTo(id);
            this.arrangement.restore(this.history.takeArrangement());
            return steps;
        });
        this.markUndone(target < position ? "undo" : "redo", passed);
        const slices = [...new Set(passed.flatMap((step) => step.slices))];
        this.emit(
            { slices, cause: "restore" },
            passed.map((step) => ({ slices: step.slices, cause: "restore" as const })),
        );
        this.selectTouched();
        return { kind: "restored", steps: passed };
    }

    /**
     * A collection for the history call starting, when anyone selects what it touched.
     * @returns The collection, or null.
     */
    private startTouching(): TouchedIds | null {
        const { touched } = this.events;
        return touched === undefined ? null : new TouchedIds(touched.cap());
    }

    /**
     * Report what a patch the history just applied touched, during a history call.
     * @param patch - The patch.
     */
    private collect(patch: Patch): void {
        if (this.touching !== null && !this.touching.skip) {
            touchedBy(patch, this.touching);
        }
    }

    /**
     * Stop collecting, and hand what the history call touched to the session to select once the
     * pass that derives the change has run.
     */
    private selectTouched(): void {
        const ids = this.touching;
        this.touching = null;
        if (ids !== null && !ids.skip && ids.nodes.size + ids.edges.size > 0) {
            void this.lane.settled().then(() => {
                this.notify(() => this.events.touched?.select(ids));
            });
        }
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
        if (change.slices.includes("graph") || change.slices.includes("runs") || change.slices.includes("sets")) {
            // What run results and their id indexes cost depends on which snapshot is resident.
            const { token } = this.store.state.graph;
            const seen = new WeakSet();
            this.history.recharge((patch) => patchCharge(patch, token, seen));
        }

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
            dispatch: (command, options) =>
                settle(() => {
                    refused();
                    return this.submit(command, group, options);
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
     * @param options - Its signal, and whether a queued command starts beside the queue.
     * @param origin - For a deferred member, the step it belongs to.
     * @returns What an exempt command returned, or the undoable command's promise.
     */
    private submit(
        command: Dispatchable,
        tx: Group | null,
        options: DispatchOptions = {},
        origin: DeferredOrigin | null = null,
    ): unknown {
        this.checkStrict();
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

        const compound = definition.members?.(concrete);
        if (compound !== undefined) {
            return this.compound(compound.label, compound.steps, tx, isSetup(concrete), options.beside === true);
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
            if (blocker !== null && refuses(blocker.group)) {
                throw heldError(concrete.op, blocker.key, blocker.group);
            }
        }

        const group =
            tx ??
            this.group(
                undoable.undo.label(concrete, state),
                origin === null ? (undoable.undo.coalesce?.(concrete) ?? null) : null,
                {},
                origin?.step ?? null,
                this.tick,
                null,
                isSetup(concrete) || origin?.setup === true,
            );
        const job = this.job(concrete, keys, undoable, group, queuedKey);
        for (const key of keys) {
            group.keys.add(key);
        }

        options.signal?.addEventListener(
            "abort",
            () => {
                this.obsolete(job, "cancel");
            },
            { once: true },
        );
        if (lane.kind === "queued" && options.beside === true) {
            // Beside the queue: pending from now, and started at once rather than given a slot.
            job.status = "queued";
            group.jobs.add(job);
            this.enter(group);
            this.admit(job);
        } else if (lane.kind === "queued") {
            job.slot = this.scheduler.enqueue(
                lane.categoryOf?.(concrete) ?? lane.category,
                (context) => this.turn(job, context),
                undoable.undo.label(concrete, state),
            );
            job.status = "queued";
            group.jobs.add(job);
            this.enter(group);
            job.slot.signal.addEventListener(
                "abort",
                () => {
                    this.obsolete(job, "obsolete");
                },
                { once: true },
            );
        } else {
            this.admit(job);
        }

        if (options.signal?.aborted === true) {
            this.obsolete(job, "cancel");
        }

        return job.promise;
    }

    /**
     * Run a compound command's members as one transaction, or inside the one dispatching it.
     * Every member is dispatched before any is awaited, so immediate members run now, in order.
     * @param label - The step's label.
     * @param steps - The members.
     * @param tx - The transaction it was dispatched in, or null.
     * @param setup - Whether it was declared at construction.
     * @param beside - Whether its queued members start at once, beside the queue, as a
     *     synchronous door's must.
     * @returns Settles when every member has.
     */
    private compound(
        label: string,
        steps: readonly CommandLike[],
        tx: Group | null,
        setup: boolean,
        beside: boolean,
    ): Promise<unknown> {
        const options = beside ? { beside } : {};
        if (tx !== null) {
            return Promise.all(steps.map((step) => settle(() => this.submit(step, tx, options))));
        }

        const done = this.transaction(
            label,
            (scope) => Promise.all(steps.map((step) => scope.dispatch(step, options))),
            {
                setup,
                compound: true,
            },
        );
        // As a single command's promise is: a batch nobody awaited, cancelled, is not an unhandled
        // rejection.
        done.catch(() => undefined);
        return done;
    }

    /**
     * Execute one command now in a running job's group, whatever its lane: `UndoableContext.inline`.
     * It seals nothing and rolls back only its own writes when it fails; the group seals when the
     * job that dispatched it does.
     * @param command - The command, or a function from state to one.
     * @param parent - The running job.
     * @returns What an exempt command returned, or the command's promise.
     */
    private inline(command: Dispatchable, parent: Job): unknown {
        if (parent.status !== "running") {
            throw cancelledError(parent.group.label, "cancel");
        }

        this.checkStrict();
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

        const compound = definition.members?.(concrete);
        if (compound !== undefined) {
            return Promise.all(compound.steps.map((step) => settle(() => this.inline(step, parent))));
        }

        const undoable = definition as UndoableDefinition<CommandLike>;
        const keys = undoable.keys(concrete, state);
        const { group } = parent;
        const blocker = this.blocker(opLogKeys(keys), group);
        if (blocker !== null) {
            if (this.strict) {
                checkInlineKey(concrete.op, blocker.key, blocker.group.label);
            }

            throw heldError(concrete.op, blocker.key, blocker.group);
        }

        const job = this.job(concrete, keys, undoable, group, null, true);
        for (const key of keys) {
            group.keys.add(key);
        }

        group.jobs.add(job);
        this.start(job);
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
     * @param context - What the queue handed the slot.
     * @returns Settles when the slot can be given up.
     */
    private turn(job: Job, context: SlotContext = {}): Promise<void> {
        if (job.status !== "queued") {
            return Promise.resolve();
        }

        job.slotContext = context;
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

        if (refuses(blocker.group)) {
            const error = heldError(job.command.op, blocker.key, blocker.group);
            // A synchronous door starting a queued command beside the queue throws it.
            this.syncFailure = { error };
            this.fail(job, error);
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
        if (group.arrangement === null && this.takesBefore(job)) {
            this.takeBefore(group);
        }

        if (job.inline) {
            // Its own writes, reverted when it fails; the job that dispatched it goes on.
            job.revert = group.draft.checkpoint();
        } else if (group.tx === null && group.after === null) {
            group.label = definition.undo.label(command, state);
            group.key = definition.undo.coalesce?.(command) ?? null;
            if (this.open.has(group)) {
                group.view = undefined;
                this.changed();
            }
        } else if (group.tx !== null && !job.run) {
            // A failing member reverts only its own writes; the transaction goes on. A run writes
            // only in its synchronous commit tail, which reverts itself, so a long run in a batch
            // never takes back what the members beside it wrote meanwhile.
            job.revert = group.draft.checkpoint();
        }

        const ctx: UndoableContext = {
            state,
            services: this.services,
            signal: job.controller.signal,
            slot: job.slotContext,
            done: job.promise.then(
                () => undefined,
                () => undefined,
            ),
            get draft() {
                if (job.status !== "running") {
                    throw cancelledError(job.group.label, "cancel");
                }

                return job.group.draft;
            },
            after: (key, start) => {
                if (!job.group.onSeal.has(key)) {
                    job.group.onSeal.set(key, start);
                }
            },
            inline: (inner) => settle(() => this.inline(inner, job)),
        };
        let out: unknown;
        try {
            out = definition.execute(command, ctx);
        } catch (error) {
            this.syncFailure = { error };
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
        if (group.tx === null && !job.inline) {
            this.seal(group);
        }

        this.graphWriteEnded(job);

        if (job.definition.closesBaseline === true) {
            this.baselineOpen = false;
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
        if (group.tx === null && !job.inline) {
            this.rollback(group);
        } else {
            this.reverted(job.revert?.() ?? []);
        }

        this.graphWriteEnded(job);

        if (job.definition.closesBaseline === true) {
            this.baselineOpen = false;
        }

        job.reject(error);
    }

    /**
     * The queue dropped or stopped a job's slot (reason "obsolete"), or its dispatcher withdrew
     * it (reason "cancel"). The job's group rolls back, or for a transaction member only the
     * member's own writes.
     * @param job - The job.
     * @param reason - Why.
     */
    private obsolete(job: Job, reason: CancelReason): void {
        if (job.status !== "queued" && job.status !== "running" && job.status !== "waiting") {
            return;
        }

        const error = cancelledError(job.group.label, reason);
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
     * Strict: nothing wrote state around the dispatcher since the last check -- the builder
     * behind the `graph` slice, and every typed array state still keeps (design section 12.1).
     */
    private checkStrict(): void {
        if (this.strict) {
            this.graph.checkStore();
            verifyRetainedArrays([this.arrangement]);
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
        const open = group.arrangement;
        // A group that took a before-arrangement records even when it wrote the value it found: a
        // `layout.set` of the current layout runs it again, and where it lands is the step.
        const sealed = group.draft.seal();
        const patch = open === null ? withoutNoOps(sealed) : sealed;
        this.checkStrict();
        const oplog = [...group.holds.keys()];
        if (open !== null) {
            this.history.close(open);
        }

        // A replacing import or a clear began a new dataset: its step ends at the new graph's
        // seeded coordinates, so no later restore maps the dataset it replaced onto it.
        const newEpoch =
            open !== null && this.store.state.graph.epoch !== group.epoch ? this.arrangement.settledCapture() : null;
        let id: string | null = null;
        const baseline = !isEmptyPatch(patch) && this.intoBaseline(group, slicesOf(patch));
        if (isEmptyPatch(patch) || baseline) {
            // No step of its own: where the lane came to rest while it was open is the seal
            // target's now. Rows the baseline itself wrote are where it ends, so undoing
            // everything returns them there, not to wherever a later step left them.
            const rows = baseline && slicesOf(patch).includes("graph") ? this.arrangement.settledCapture() : null;
            const rest = newEpoch ?? open?.provisional ?? rows;
            if (rest !== null) {
                this.history.seal(rest);
            }
        }

        if (baseline) {
            const change = { slices: slicesOf(patch), cause: "command" as const };
            this.emit(change, [change]);
            this.release(group, true);
            this.startDeferred(group, null);
            return null;
        }

        if (!isEmptyPatch(patch)) {
            const slices = slicesOf(patch);
            const removedInFlight = this.arrangement.moved && restoresNodes(patch.log);
            // A `positions.set` over more than a third of the rows keeps a capture instead of its
            // row patch: the capture holds every row it wrote, so the step keeps the one, not both.
            const captured = newEpoch === null && patch.rows !== null && this.arrangement.wantsCapture(patch.rows);
            const kept = captured ? Object.freeze({ ...patch, rows: null }) : patch;
            const bytes = patchBytes(kept);
            const input = {
                label: group.label,
                patch: kept,
                key: group.key,
                ops: group.ops,
                slices,
                bytes: { done: bytes, undone: bytes },
                after: newEpoch ?? (captured ? this.arrangement.capture() : (open?.provisional ?? null)),
                before: open?.before ?? null,
            };
            if (group.after !== null && this.history.amend(group.after, input)) {
                id = group.after;
            } else {
                const provenance = {
                    ...this.ambientProvenance?.(),
                    ...group.provenance,
                    ...(group.after === null ? {} : { after: group.after }),
                };
                // Work dispatched after the top step and still pending keeps a coalescing edit
                // out of that step: merged, the step would be newer than the work and older at
                // once (design section 5.2).
                const top = this.adjacent("undo");
                const since = top === undefined ? undefined : this.steps.get(top.id)?.recorded;
                const pendingSinceTop =
                    since !== undefined && [...this.open].some((other) => other !== group && other.seq > since);
                id = this.history.record({ ...input, provenance, pendingSinceTop });
            }

            const meta = this.steps.get(id);
            const recorded = this.tick++;
            if (meta === undefined) {
                this.steps.set(id, { recorded, undone: -1, oplog, removedInFlight });
            } else {
                meta.recorded = recorded;
                meta.oplog.push(...oplog);
                meta.removedInFlight ||= removedInFlight;
            }

            this.prune();
            // Every commit, not only one that wrote the pins slice: a pin byte changed by anything
            // else is a pin no step records.
            this.arrangement.checkPins();

            const change = { slices, cause: "command" as const };
            this.emit(change, [change]);
        }

        this.release(group, true);
        this.startDeferred(group, id);
        return id;
    }

    /**
     * Start the work a sealed group registered with `after`, as deferred members of its step.
     * @param group - The group, sealed.
     * @param step - The step it recorded, or null when it recorded none.
     */
    private startDeferred(group: Group, step: string | null): void {
        const origin: DeferredOrigin = { step, setup: group.setup };
        const starts = [...group.onSeal.values()];
        group.onSeal.clear();
        for (const start of starts) {
            start((command, options) => settle(() => this.submit(command, null, options, origin)));
        }
    }

    /**
     * Whether a group's writes become the baseline rather than a step (design section 3.3), and
     * close the baseline window at the first graph write. What the page declared at construction
     * is baseline for as long as nothing has been recorded; anything else is while the window is
     * open and it does not write the graph. The first graph write that is not declared is the
     * first step.
     * @param group - The group sealing.
     * @param slices - The slices it wrote.
     * @returns True when it records no step.
     */
    private intoBaseline(group: Group, slices: readonly string[]): boolean {
        const graph = slices.includes("graph");
        const open = this.baselineOpen;
        if (graph) {
            this.baselineOpen = false;
        }

        if (group.setup) {
            return this.history.steps.length === 0;
        }

        return open && !graph;
    }

    /**
     * Revert everything a group still holds, and say so when anything live changed.
     * @param group - The group.
     */
    private rollback(group: Group): void {
        this.leave(group);
        const patch = group.draft.rollback();
        const slices = slicesOf(patch);
        const open = group.arrangement;
        if (open !== null) {
            this.history.close(open);
        }

        if (slices.length > 0 || open !== null) {
            // Where things were when the group began, not where a half-run layout pushed them;
            // written in restore mode, and not a rest point (design section 6.4). A group that
            // took a before-arrangement and wrote nothing is written back too: an aborted drag
            // has moved the lane without dispatching anything.
            let ops: ArrangementOp[] = [];
            if (open !== null) {
                ops = [{ capture: open.before }];
            } else if (patch.rows !== null) {
                ops = [{ patch: patch.rows, forward: false }];
            }

            if (slices.length === 0) {
                this.lane.restore("rollback");
            }

            this.arrangement.restore(ops);
        }

        this.reverted(slices);
        this.release(group, false);
    }

    /**
     * Live writes were reverted: derive them in restore mode, and say so.
     * @param slices - The slices reverted; nothing happens when empty.
     */
    private reverted(slices: readonly string[]): void {
        if (slices.length > 0) {
            this.lane.restore("rollback");
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
        this.graphWriteEnded(job);
    }

    /**
     * A graph-writing job has ended, however it ended. When a pass left its paint to a later one
     * while this was waiting or running (`paintOwed`) and nothing is waiting now, the lane is told,
     * so a pass paints what the run wrote -- even when this one wrote nothing.
     * @param job - The job.
     */
    private graphWriteEnded(job: Job): void {
        if (this.paintOwed && job.keys.some((key) => sliceOf(key) === "graph") && !this.graphWritesWaiting) {
            this.paintOwed = false;
            this.graph.touch("paint");
        }
    }

    /**
     * Set by the renderer's `graph` hook when a pass left its whole-graph repaint to a later one
     * because a graph write was waiting (`graphWritesWaiting`); cleared once one is scheduled.
     */
    paintOwed = false;

    /**
     * Whether a command that writes the graph is dispatched and not finished. The pass deriving a
     * graph write leaves the whole-graph repaint to a pass once none is, so a run of queued adds
     * -- `addEdge` in a loop -- repaints once rather than once per add; the last such command to
     * end, however it ends, schedules that pass (`paintOwed`).
     * @returns True while one is.
     */
    get graphWritesWaiting(): boolean {
        for (const group of this.open) {
            for (const job of group.jobs) {
                if (
                    job.status !== "done" &&
                    job.status !== "cancelled" &&
                    job.keys.some((key) => sliceOf(key) === "graph")
                ) {
                    return true;
                }
            }
        }

        return false;
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
     * @param setup - Declared at construction.
     * @param compound - A batch's transaction.
     * @returns The group.
     */
    private group(
        label: string,
        key: string | null,
        provenance: Readonly<Record<string, string>>,
        after: string | null,
        seq: number,
        tx: Group["tx"],
        setup = false,
        compound = false,
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
            setup,
            compound,
            onSeal: new Map(),
            arrangement: null,
            epoch: 0,
        };
    }

    /**
     * A new job, not yet on any lane.
     * @param command - The concrete command.
     * @param keys - Its declared keys.
     * @param definition - Its definition.
     * @param group - The group it writes into.
     * @param queuedKey - Its queued coalesce key.
     * @param inline - Dispatched inline by a running job of its group.
     * @returns The job.
     */
    private job(
        command: CommandLike,
        keys: readonly SliceKey[],
        definition: UndoableDefinition<CommandLike>,
        group: Group,
        queuedKey: string | null,
        inline = false,
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
            run: !inline && definition.lane.kind === "queued" && definition.lane.category === RUN_CATEGORY,
            inline,
            controller: new AbortController(),
            slot: null,
            blockedBy: null,
            revert: null,
            slotContext: {},
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
