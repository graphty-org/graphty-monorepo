/**
 * @file The run ops: `algo.run`, `algo.legacy` and `algo.remove`.
 *
 * `algo.run` takes a slot on the queue under `algorithm-run`, computes, and then, in one
 * synchronous commit tail, writes the finished run into the `runs` slice together with the style
 * layers it paints: its first-completion layers, and the suggested layers it was asked to apply.
 * So a run, its result, its layers and its legend are one step, and undoing it keeps the result
 * in history instead of recomputing it. A run cancelled before it commits, whether by undo, by
 * the queue or by its own `cancel()`, writes nothing.
 *
 * `algo.remove` takes a run out of the `runs` slice and removes the layers bound to it, in one
 * draft, so one undo brings both back.
 *
 * `algo.legacy` runs a plugin algorithm that declares no catalogue descriptor, and so has no run:
 * it writes onto node and edge records and `graphResults` as it goes, and may call the graph's
 * own doors. It is one step all the same. The plugin is handed a facade of the graph whose doors
 * dispatch into the command's own group ({@link legacyFacade}), and while it runs the records it
 * reads are copy-on-write views ({@link LegacyWrites}) whose written paths become one attribute
 * write when it finishes. See design/undo/undo-design.md sections 4.5 and 4.9.
 *
 * What a run computes, and which handle a consumer holds for it, is the runs API's work: it
 * registers the {@link RunService} these ops call. See design/undo/undo-design.md sections 4.7,
 * 4.8 and 6.3.
 */

import type { RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { AlgorithmRunCommand } from "../planning";
import type { Dispatcher, DispatchFunction, UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import { deepFreeze, type Draft } from "../project/draft";
import type { RowUpdate } from "../types";

/** `algo.remove`: take a finished run, and every layer bound to it, out of the project. */
export interface AlgoRemoveCommand {
    readonly op: "algo.remove";
    /** The run. */
    readonly runId: RunId;
}

/**
 * `algo.legacy`: run a plugin algorithm that declares no catalogue descriptor, addressed the 1.10
 * way, as one step with everything it writes.
 */
export interface AlgoLegacyCommand {
    readonly op: "algo.legacy";
    /** The registry namespace. */
    readonly namespace: string;
    /** The registry type. */
    readonly type: string;
    /** What the plugin is constructed with. */
    readonly options?: Readonly<Record<string, unknown>>;
    /** Also apply the layers its finished runs suggest, in the same step. */
    readonly applySuggestedStyles?: boolean;
}

/** How a renderer carries out `algo.legacy`: it constructs the plugin, which needs a `Graph`. */
export interface LegacyService {
    /**
     * Construct the plugin with a facade of the graph, run it, and write what it wrote.
     * @param command - The command.
     * @param ctx - The command's context; `ctx.inline` is what the facade dispatches through.
     * @returns Settles once everything it wrote is in the command's draft.
     */
    run(command: AlgoLegacyCommand, ctx: UndoableContext): Promise<void>;
}

/** How a session carries out the run ops; registered by its runs API. */
export interface RunService {
    /**
     * Compute a run, then write it and the layers it paints through the command's draft.
     * @param command - The run.
     * @param ctx - The command's context: its draft, its signal and its slot.
     * @returns Settles once the run is written; rejects when it failed or was cancelled first.
     */
    run(command: AlgorithmRunCommand, ctx: UndoableContext): Promise<unknown>;
    /**
     * Remove a run and the layers bound to it through `draft`, and stop it if it is still going.
     * @param command - The removal.
     * @param draft - The command's draft.
     * @returns What went with it.
     */
    remove(command: AlgoRemoveCommand, draft: Draft): unknown;
}

/**
 * The session's run service, or the refusal of a dispatcher that has none.
 * @param service - The registered service.
 * @returns It.
 */
function required(service: RunService | undefined): RunService {
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This dispatcher has no runs API registered, so it cannot run an algorithm.",
            source: "run",
        });
    }

    return service;
}

const algoRun: UndoableDefinition<AlgorithmRunCommand> = {
    op: "algo.run",
    undo: { kind: "undoable", label: (command) => `Ran ${command.algorithm}` },
    moves: false,
    draws: true,
    // Written only in the commit tail, which is synchronous, so a run holds nothing while it
    // computes and never blocks a style edit.
    keys: () => ["runs", "styles"],
    lane: { kind: "queued", category: "algorithm-run" },
    execute: (command, ctx) => required(ctx.services.runs).run(command, ctx),
};

const algoLegacy: UndoableDefinition<AlgoLegacyCommand> = {
    op: "algo.legacy",
    undo: { kind: "undoable", label: (command) => `Ran ${command.namespace}:${command.type}` },
    moves: false,
    draws: true,
    renderer: true,
    // The whole graph: a plugin may write any record, and add or remove rows through the facade.
    keys: () => ["graph", "styles"],
    lane: { kind: "queued", category: "algorithm-run" },
    execute: (command, ctx) => {
        if (ctx.services.legacy === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `"${command.namespace}:${command.type}" declares no catalogue descriptor, so it runs only on a renderer, which constructs it with a Graph.`,
                source: "run",
            });
        }

        return ctx.services.legacy.run(command, ctx);
    },
};

const algoRemove: UndoableDefinition<AlgoRemoveCommand> = {
    op: "algo.remove",
    undo: {
        kind: "undoable",
        label: (command, state) =>
            `Removed ${state.runs.get(command.runId)?.command.algorithm ?? `run ${command.runId}`}`,
    },
    moves: false,
    draws: true,
    keys: () => ["runs", "styles"],
    lane: { kind: "immediate" },
    execute: (command, ctx) => required(ctx.services.runs).remove(command, ctx.draft),
};

/** The run ops' definitions. */
export const ALGO_DEFINITIONS = [algoRun, algoLegacy, algoRemove] as const;

// ---------------------------------------------------------------------------------------------
// Copy-on-write records
// ---------------------------------------------------------------------------------------------

/** What a record belongs to: a node, an edge, or the graph's own values. */
type WriteTarget = "node" | "edge" | "graph";

/** One record a plugin has read, and the top-level keys it has written, copied. */
interface Entry {
    readonly target: WriteTarget;
    readonly id: string | number;
    readonly record: object;
    /** The written top-level keys, each holding its own copy of that subtree. */
    readonly overlay: Record<PropertyKey, unknown>;
    /** The scope it was read in: once that has closed, a write through the view throws. */
    readonly scope: LegacyWrites;
}

/**
 * The error a write through a copy-on-write view throws once its command has ended: a plugin kept
 * a record it read while it ran and wrote to it later, which would change nothing and be lost.
 * @param entry - The record written.
 * @param key - The key written.
 * @returns The error, naming the command to use instead.
 */
function lateWrite(entry: Entry, key: PropertyKey): GraphtyError {
    const use =
        entry.target === "graph"
            ? "write graphResults while the algorithm runs"
            : `use session.data.${entry.target === "node" ? "updateNodes" : "updateEdges"}([{ id, values }])`;
    const what = entry.target === "graph" ? "the graph's values" : `${entry.target} ${JSON.stringify(entry.id)}`;
    return new GraphtyError({
        code: "E_READONLY",
        message:
            `A plugin algorithm wrote "${String(key)}" of ${what} after its run ended. Records are ` +
            `read-only outside the algorithm's own run; to change one, ${use}.`,
        source: "run",
        details: { target: entry.target, id: entry.id, key: String(key) },
    });
}

/**
 * Walk a path of keys from a value.
 * @param from - The value.
 * @param path - The keys.
 * @returns What is there, or undefined.
 */
function walk(from: unknown, path: readonly PropertyKey[]): unknown {
    let at = from;
    for (const key of path) {
        at = (at as Record<PropertyKey, unknown> | null | undefined)?.[key];
    }

    return at;
}

/**
 * The copy-on-write records of one `algo.legacy` command: reads pass through to the record the
 * graph holds, and the first write under a top-level key copies that key's subtree with
 * `structuredClone` and writes the copy. The record itself is never touched, so a write that is
 * never committed (the command failed or was undone while the plugin ran) changes nothing.
 *
 * One view per record, cached for the command's duration, so a record read twice allocates once.
 */
export class LegacyWrites {
    /** The views by the record they read. */
    readonly #views = new WeakMap<object, object>();
    /** Every record written, in the order first read. */
    readonly #entries: Entry[] = [];
    /** The graph's values as they were when first read. */
    #graph: object | undefined;
    /** Set when the command ends: from then on every view refuses writes. */
    #closed = false;

    /**
     * Open no scope yet: {@link openLegacyScope} does.
     * @param owner - What the scope is looked up by: the session's dispatcher.
     * @param owns - Whether a node or edge render object is one of this graph's.
     */
    constructor(
        readonly owner: object,
        readonly owns: (element: object) => boolean,
    ) {}

    /**
     * The copy-on-write view of one record.
     * @param target - Node, edge, or the graph's values.
     * @param id - The node or edge id; ignored for the graph.
     * @param record - The record the graph holds.
     * @returns The view.
     */
    view(target: WriteTarget, id: string | number, record: object): object {
        let view = this.#views.get(record);
        if (view === undefined) {
            const entry: Entry = { target, id, record, overlay: {}, scope: this };
            this.#entries.push(entry);
            view = nested(entry, []);
            this.#views.set(record, view);
        }

        return view;
    }

    /**
     * The copy-on-write view of the graph's values, the same object each time.
     * @param values - The graph's values as the graph holds them.
     * @returns The view, by name.
     */
    graph(values: ReadonlyMap<string, unknown>): Record<string, unknown> {
        this.#graph ??= Object.fromEntries(values);
        return this.view("graph", "", this.#graph) as Record<string, unknown>;
    }

    /**
     * Whether the command has ended.
     * @returns True once {@link LegacyWrites.close} ran.
     */
    get closed(): boolean {
        return this.#closed;
    }

    /**
     * End the command: a view kept past it throws on the next write, and a copied subtree handed
     * out while it ran is frozen, so a write to that throws too.
     */
    close(): void {
        this.#closed = true;
        for (const entry of this.#entries) {
            deepFreeze(entry.overlay);
        }
    }

    /**
     * What was written, as the rows and graph values a draft takes.
     * @returns The written top-level keys of each record, and of the graph's values.
     */
    writes(): {
        readonly nodes: RowUpdate<string | number>[];
        readonly edges: RowUpdate<string | number>[];
        readonly graph: Readonly<Record<string, unknown>> | null;
    } {
        const nodes: RowUpdate<string | number>[] = [];
        const edges: RowUpdate<string | number>[] = [];
        let graph: Record<string, unknown> | null = null;
        for (const entry of this.#entries) {
            if (Reflect.ownKeys(entry.overlay).length === 0) {
                continue;
            }

            const values = { ...entry.overlay } as Record<string, unknown>;
            if (entry.target === "graph") {
                graph = values;
            } else {
                (entry.target === "node" ? nodes : edges).push({ id: entry.id, values });
            }
        }

        return { nodes, edges, graph };
    }
}

/**
 * A view of one path inside a copy-on-write record. The proxy's own target is an empty stand-in,
 * never the record, so the record may be frozen without breaking a proxy invariant.
 * @param entry - The record.
 * @param path - The keys from the record's root; empty for the root.
 * @returns The view.
 */
function nested(entry: Entry, path: readonly PropertyKey[]): object {
    const record = entry.record as Record<PropertyKey, unknown>;
    // Whether the top-level key a read or write lands under has been copied.
    const copied = (key: PropertyKey): boolean => Object.hasOwn(entry.overlay, path[0] ?? key);
    // The object holding `key` now: the copy once its top-level key was written.
    const holder = (key: PropertyKey): unknown => walk(copied(key) ? entry.overlay : record, path);
    const read = (key: PropertyKey): unknown => {
        const value = (holder(key) as Record<PropertyKey, unknown> | undefined)?.[key];
        // A copied subtree is this command's own, so it is handed out as it is -- until the command
        // ends, after which every read is a view again, so a late write names what to do instead.
        return typeof value === "object" && value !== null && (!copied(key) || entry.scope.closed)
            ? nested(entry, [...path, key])
            : value;
    };
    const copy = (key: PropertyKey): void => {
        const name = path[0] ?? key;
        if (!Object.hasOwn(entry.overlay, name)) {
            entry.overlay[name] = structuredClone(record[name]);
        }
    };

    return new Proxy(Array.isArray(walk(record, path)) ? [] : {}, {
        get: (_stand, key) => read(key),
        set: (_stand, key, value) => {
            if (entry.scope.closed) {
                throw lateWrite(entry, key);
            }

            if (path.length === 0) {
                entry.overlay[key] = value;
            } else {
                copy(key);
                (walk(entry.overlay, path) as Record<PropertyKey, unknown>)[key] = value;
            }

            return true;
        },
        deleteProperty: (_stand, key) => {
            if (entry.scope.closed) {
                throw lateWrite(entry, key);
            }

            if (path.length === 0) {
                // A record's key is written, never removed: undefined is what the draft takes.
                entry.overlay[key] = undefined;
                return true;
            }

            copy(key);
            return Reflect.deleteProperty(walk(entry.overlay, path) as object, key);
        },
        has: (_stand, key) =>
            path.length === 0
                ? key in record || key in entry.overlay
                : key in ((holder(key) as object | undefined) ?? {}),
        ownKeys: (stand) => {
            const keys = new Set<string | symbol>(
                path.length === 0
                    ? [...Reflect.ownKeys(record), ...Reflect.ownKeys(entry.overlay)]
                    : Reflect.ownKeys((holder("") as object | undefined) ?? {}),
            );
            // An array stand-in's `length` is its own and cannot be hidden.
            for (const key of Reflect.ownKeys(stand)) {
                keys.add(key);
            }

            return [...keys];
        },
        getOwnPropertyDescriptor: (stand, key) => {
            const owner = holder(key) as object | undefined;
            if (key === "length" && Array.isArray(stand)) {
                const length = (owner as unknown[] | undefined)?.length ?? 0;
                return { value: length, writable: true, enumerable: false, configurable: false };
            }

            const own = path.length === 0 && Object.hasOwn(entry.overlay, key);
            if (!own && (owner === undefined || !Object.hasOwn(owner, key))) {
                return undefined;
            }

            return { value: read(key), writable: true, enumerable: true, configurable: true };
        },
    });
}

/** The copy-on-write scopes open now, one per `algo.legacy` running, usually none. */
const open = new Set<LegacyWrites>();

/**
 * The scope an element's records are read through, while an `algo.legacy` of its graph runs.
 * @param element - A node or edge render object.
 * @returns The scope, or undefined when none of its graph's commands is running a plugin.
 */
function legacyScopeFor(element: object): LegacyWrites | undefined {
    for (const scope of open) {
        if (scope.owns(element)) {
            return scope;
        }
    }

    return undefined;
}

/**
 * The scope open for a dispatcher.
 * @param owner - The dispatcher.
 * @returns The scope, or undefined when no `algo.legacy` of its graph is running.
 */
export function legacyScopeOf(owner: Dispatcher | null): LegacyWrites | undefined {
    for (const scope of open) {
        if (scope.owner === owner) {
            return scope;
        }
    }

    return undefined;
}

/** A prototype whose `data` getter is swapped while a scope is open. */
interface DataPrototype {
    readonly prototype: object;
    readonly target: "node" | "edge";
}

/** The original getters of the swapped prototypes, while any scope is open. */
const swapped = new Map<object, PropertyDescriptor>();

/**
 * Open a copy-on-write scope: until it is closed, reading `data` on a node or edge of this graph
 * hands back a copy-on-write view. The getters are swapped on the prototypes, not branched on
 * every read, and put back when the last scope closes.
 * @param scope - The scope.
 * @param prototypes - The render object prototypes whose `data` getter reads a record.
 * @returns Closes it.
 */
export function openLegacyScope(scope: LegacyWrites, prototypes: readonly DataPrototype[]): () => void {
    if (open.size === 0) {
        for (const { prototype, target } of prototypes) {
            const original = Object.getOwnPropertyDescriptor(prototype, "data");
            if (original?.get === undefined) {
                continue;
            }

            swapped.set(prototype, original);
            Object.defineProperty(prototype, "data", {
                configurable: true,
                enumerable: original.enumerable ?? false,
                get(this: { readonly id: string | number }) {
                    const record = original.get?.call(this) as object;
                    return legacyScopeFor(this)?.view(target, this.id, record) ?? record;
                },
            });
        }
    }

    open.add(scope);
    return () => {
        scope.close();
        if (!open.delete(scope) || open.size > 0) {
            return;
        }

        for (const [prototype, original] of swapped) {
            Object.defineProperty(prototype, "data", original);
        }

        swapped.clear();
    };
}

// ---------------------------------------------------------------------------------------------
// The facade
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value is one the facade hands out as it is: data (a plain object with no methods), a
 * promise, or a built-in whose methods need their own receiver.
 * @param value - The value.
 * @returns True when it is not wrapped.
 */
function unwrapped(value: unknown): boolean {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
        return true;
    }

    const proto: unknown = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
        // A plain object is data unless it has methods: a session's parts are object literals.
        return !Object.values(Object.getOwnPropertyDescriptors(value)).some(
            (descriptor) => typeof descriptor.value === "function",
        );
    }

    return (
        Array.isArray(value) ||
        ArrayBuffer.isView(value) ||
        typeof (value as { then?: unknown }).then === "function" ||
        value instanceof Map ||
        value instanceof Set ||
        value instanceof WeakMap ||
        value instanceof WeakSet ||
        value instanceof Date ||
        value instanceof RegExp ||
        value instanceof Error ||
        typeof (value as { next?: unknown }).next === "function"
    );
}

/**
 * A group-tagged facade of `root`: the same members, but every call made through it, and through
 * every object it hands back, runs with the dispatcher routed to `inline`, so a door reached
 * through it dispatches into the running command's own group instead of a step of its own. The
 * routing lasts for the synchronous part of each call only, which is where every door dispatches,
 * so a dispatch made anywhere else while the plugin runs is still a step of its own.
 *
 * Calls are made on the real objects, with any facade among the arguments unwrapped, so private
 * fields and identity checks see the originals.
 * @param root - The graph.
 * @param dispatcher - Its session's dispatcher.
 * @param inline - Dispatches into the running command's group.
 * @returns The facade.
 */
export function legacyFacade<T extends object>(root: T, dispatcher: Dispatcher, inline: DispatchFunction): T {
    const facades = new WeakMap<object, object>();
    const originals = new WeakMap<object, object>();
    const unwrap = (value: unknown): unknown =>
        typeof value === "object" && value !== null ? (originals.get(value) ?? value) : value;
    const wrap = (value: unknown, root = false): unknown => {
        if (!root && unwrapped(value)) {
            return value;
        }

        const target = value as object;
        let facade = facades.get(target);
        if (facade === undefined) {
            facade = new Proxy(target, {
                get(object, key) {
                    const member: unknown = Reflect.get(object, key);
                    if (typeof member !== "function") {
                        return wrap(member);
                    }

                    return (...args: unknown[]): unknown =>
                        wrap(
                            dispatcher.routed(inline, () =>
                                Reflect.apply(member as (...values: unknown[]) => unknown, object, args.map(unwrap)),
                            ),
                        );
                },
                set(object, key, value) {
                    return dispatcher.routed(inline, () => Reflect.set(object, key, unwrap(value)));
                },
            });
            facades.set(target, facade);
            originals.set(facade, target);
        }

        return facade;
    };

    return wrap(root, true) as T;
}
