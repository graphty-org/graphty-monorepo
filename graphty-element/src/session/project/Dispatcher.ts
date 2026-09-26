/**
 * @file The one path every change to project state takes.
 *
 * A command is looked up by its op, its arguments are copied and frozen, and it joins a group: a
 * plain dispatch is a group of its own, and a dispatch through a transaction's `tx` joins that
 * transaction's group. An undoable command writes through the group's draft; an exempt command
 * gets no draft at all. When a group seals, its patch becomes one step in the history. When it
 * fails, its writes are reverted through the same `applyBackward` that undo uses, and nothing is
 * recorded. See design/undo/undo-design.md sections 4.1, 4.2, 4.4, 4.8 and 5.1.
 *
 * Only the immediate lane exists so far: every command executes synchronously inside `dispatch`,
 * so a write is visible to a getter as soon as `dispatch` returns.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import {
    createProjectStore,
    deepFreezeArgs,
    type Draft,
    mergePatches,
    type Patch,
    type ProjectStore,
    type ValueSlice,
} from "./draft";
import { History } from "./History";
import { createProjectState, type ProjectState } from "./state";

/** The part of a command the dispatcher reads: its op. */
interface CommandLike {
    readonly op: string;
}

/** A key a command writes: a whole slice (`styles`) or one key of one (`config/background`). */
type SliceKey = string;

/** What an undoable command executes with: the state to read, and the draft that writes it. */
interface UndoableContext {
    readonly state: ProjectState;
    readonly draft: Draft;
}

/** What an exempt command executes with. No draft, so it cannot write project state. */
interface ExemptContext {
    readonly state: ProjectState;
}

/** What every definition declares, whether or not it is undoable. */
interface DefinitionBase<C extends CommandLike> {
    readonly op: C["op"];
    /** Sets coordinates on purpose, so it seals an arrangement capture when it starts. */
    readonly moves: boolean;
    /** The keys it will write, known before it runs. */
    keys(command: C, state: ProjectState): readonly SliceKey[];
    /** Executes synchronously at dispatch. */
    readonly lane: { readonly kind: "immediate" };
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
type CommandDefinition<C extends CommandLike> = UndoableDefinition<C> | ExemptDefinition<C>;

/**
 * A command, or a function from state to one, called when the command executes. The late form is
 * for doors whose meaning depends on state at that moment; history records the concrete command.
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

/** A change to live project state, for the events a later layer publishes. */
interface ProjectChange {
    readonly slices: readonly ValueSlice[];
    readonly cause: "command" | "rollback";
}

interface DispatcherOptions {
    // Each definition's `execute` is checked against its own command type where it is written
    // (method parameters are bivariant), and the dispatcher only hands a definition its own op.
    readonly definitions: readonly CommandDefinition<CommandLike>[];
    /** The baseline; an empty project when absent. */
    readonly state?: ProjectState;
    /** The clock of the coalescing window. */
    readonly now?: () => number;
    /** Told after a group's writes are recorded, or after live writes are reverted. */
    readonly publish?: (change: ProjectChange) => void;
}

/** Commands that become one step. */
interface Group {
    readonly label: string;
    readonly key: string | null;
    readonly provenance: Readonly<Record<string, string>>;
    readonly draft: Draft;
    readonly ops: string[];
}

/** A transaction's group. */
interface TransactionGroup extends Group {
    /** Open until `fn` settles; aborted when it rolled back. */
    status: "open" | "closed" | "aborted";
    readonly controller: AbortController;
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
 * Run `work` now and hand back a promise of its result, rejected when it throws.
 * @param work - The synchronous work.
 * @returns Its result, or its throw as a rejection.
 */
function settle<T>(work: () => T): Promise<Awaited<T>> {
    return new Promise((resolve) => {
        resolve(work() as Awaited<T>);
    });
}

/** The one mutation path: groups, drafts, rollback and transactions over one project state. */
export class Dispatcher {
    readonly history: History<Patch>;
    private readonly store: ProjectStore;
    private readonly definitions = new Map<string, CommandDefinition<CommandLike>>();
    private readonly publish: (change: ProjectChange) => void;
    private readonly groups = new WeakMap<TransactionScope, TransactionGroup>();

    /**
     * Create a dispatcher over a state it alone will write.
     * @param options - The definitions, the baseline, the clock and the change listener.
     */
    constructor(options: DispatcherOptions) {
        for (const definition of options.definitions) {
            this.definitions.set(definition.op, definition);
        }

        this.store = createProjectStore(options.state ?? createProjectState());
        this.publish = options.publish ?? (() => undefined);
        this.history = new History<Patch>({
            forward: (patch) => {
                this.store.applyForward(patch);
            },
            backward: (patch) => {
                this.store.applyBackward(patch);
            },
            merge: mergePatches,
            now: options.now,
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
     * Dispatch one command as its own step. It executes before this returns.
     * @param command - The command, or a function from state to one.
     * @returns What `execute` returned; rejects with what it threw, after reverting its writes.
     */
    dispatch<C extends CommandLike>(command: Dispatchable<C>): Promise<unknown> {
        return settle(() => this.execute(command, null));
    }

    /**
     * Run `fn`, and record every command it dispatches through `tx` as one step once it settles.
     *
     * Membership is by origin: a dispatch made any other way while `fn` runs is its own step. If
     * such a dispatch writes a key the transaction wrote, it takes the key over, so the
     * transaction's rollback leaves it alone. If `fn` throws, or the transaction is aborted,
     * everything it wrote is reverted, nothing is recorded, and the error is rethrown; until `fn`
     * settles, and after, `tx` dispatches reject with an `AbortError`. After a clean settle they
     * reject with `E_TRANSACTION_CLOSED`. A transaction that wrote nothing records nothing.
     * @param label - The step's label.
     * @param fn - The body. `signal` fires when the transaction is aborted.
     * @param options - The provenance stamped on the step.
     * @returns What `fn` returned.
     */
    transaction<T>(label: string, fn: TransactionBody<T>, options: TransactionOptions = {}): Promise<T> {
        const group: TransactionGroup = {
            label,
            key: null,
            provenance: Object.freeze({ ...options.provenance }),
            draft: this.store.open(),
            ops: [],
            status: "open",
            controller: new AbortController(),
        };
        const tx = this.scope(group);
        const { signal } = group.controller;

        const settled = settle(() => fn(tx, signal)).then(
            (value) => {
                if (group.status === "open") {
                    group.status = "closed";
                    this.seal(group);
                }

                return value;
            },
            (error: unknown) => {
                this.abortGroup(group, error);
                throw error;
            },
        );
        const aborted = new Promise<never>((_, reject) => {
            signal.addEventListener(
                "abort",
                () => {
                    reject(signal.reason as Error);
                },
                { once: true },
            );
        });

        return Promise.race([settled, aborted]);
    }

    /**
     * Abort an open transaction: revert what it wrote now, fire its signal, and reject it. Its
     * `fn` keeps running until it notices, and every `tx` dispatch meanwhile rejects.
     * @param tx - The transaction's scope.
     */
    abort(tx: TransactionScope): void {
        const group = this.groups.get(tx);
        if (group !== undefined) {
            this.abortGroup(group, abortError(group.label));
        }
    }

    /**
     * The scope a transaction's `fn` dispatches through.
     * @param group - The transaction's group.
     * @returns The scope.
     */
    private scope(group: TransactionGroup): TransactionScope {
        const refused = (): void => {
            if (group.status === "aborted") {
                throw abortError(group.label);
            }

            if (group.status === "closed") {
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
                    return this.execute(command, group);
                }),
            transaction: <T>(_label: string, fn: TransactionBody<T>) =>
                settle(() => {
                    refused();
                    return fn(tx, group.controller.signal);
                }),
        };
        this.groups.set(tx, group);
        return tx;
    }

    /**
     * Resolve, freeze and execute one command, in its own group or in `group`.
     * @param command - The command, or a function from state to one.
     * @param group - The transaction it joins, or null for a group of its own.
     * @returns What `execute` returned.
     */
    private execute(command: Dispatchable, group: TransactionGroup | null): unknown {
        const { state } = this.store;
        const concrete = deepFreezeArgs(typeof command === "function" ? command(state) : command);
        const definition = this.definitions.get(concrete.op);
        if (definition === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `There is no command "${concrete.op}".`,
                source: "history",
                details: { op: concrete.op },
            });
        }

        if (definition.undo.kind === "exempt") {
            return (definition as ExemptDefinition<CommandLike>).execute(concrete, { state });
        }

        const undoable = definition as UndoableDefinition<CommandLike>;
        if (group !== null) {
            // A failing member reverts only its own writes; the transaction goes on.
            const revert = group.draft.checkpoint();
            let result: unknown;
            try {
                result = undoable.execute(concrete, { state, draft: group.draft });
            } catch (error) {
                const slices = revert();
                if (slices.length > 0) {
                    this.publish({ slices, cause: "rollback" });
                }

                throw error;
            }

            group.ops.push(concrete.op);
            return result;
        }

        const own: Group = {
            label: undoable.undo.label(concrete, state),
            key: undoable.undo.coalesce?.(concrete) ?? null,
            provenance: Object.freeze({}),
            draft: this.store.open(),
            ops: [concrete.op],
        };
        let result: unknown;
        try {
            result = undoable.execute(concrete, { state, draft: own.draft });
        } catch (error) {
            this.rollback(own);
            throw error;
        }

        this.seal(own);
        return result;
    }

    /**
     * Record a group's patch as one step, or nothing when it wrote nothing.
     * @param group - The group.
     */
    private seal(group: Group): void {
        const patch = group.draft.seal();
        if (patch.entries.length === 0) {
            return;
        }

        const slices = slicesOf(patch);
        this.history.record({
            label: group.label,
            patch,
            key: group.key,
            ops: group.ops,
            slices,
            provenance: group.provenance,
        });
        this.publish({ slices, cause: "command" });
    }

    /**
     * Revert everything a group still holds, and say so when anything live changed.
     * @param group - The group.
     */
    private rollback(group: Group): void {
        const patch = group.draft.rollback();
        if (patch.entries.length > 0) {
            this.publish({ slices: slicesOf(patch), cause: "rollback" });
        }
    }

    /**
     * Abort an open transaction's group: roll it back, mark it aborted and fire its signal.
     * @param group - The group.
     * @param reason - What the signal and the transaction reject with.
     */
    private abortGroup(group: TransactionGroup, reason: unknown): void {
        if (group.status !== "open") {
            return;
        }

        group.status = "aborted";
        this.rollback(group);
        group.controller.abort(reason);
    }
}
