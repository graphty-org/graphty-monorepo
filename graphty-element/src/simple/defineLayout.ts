/**
 * @file `defineLayout`: the simple tier's layout verb.
 *
 * A definition is an id, options in short form and `place(graph, context)`, which returns a map
 * from node id to `[x, y]` or `[x, y, z]` in scene units. `defineLayout` checks the definition,
 * fills in every catalogue member, and files an ordinary layout engine through the one layout
 * registration there is, `LayoutEngine.register` -- so a simple layout IS an advanced one once
 * registered: same catalogue entry shape, same option checks, same registry, same `setLayout`.
 *
 * What the element does for the author, so the definition never has to:
 * - hands `place` the graph view over the whole graph and checks "attribute" and "node" options
 *   against it first, so a misspelt column is refused with the columns the nodes do carry;
 * - positions are scene units, with no hidden multiplier; a 2D position in a 3D view gets z = 0 and
 *   a 3D position in a 2D view loses its z;
 * - a node left out of the map, or given null or a non-finite number, is left unplaced;
 * - a pinned or held node stays where it is (the element's position array refuses the write), and
 *   `context.fixed(id)` says where it is;
 * - `context.random()` is seeded; `random: true` declares a "seed" option and draws one when the
 *   reader gives none;
 * - `context.progress()` yields to the page and rejects once the layout is replaced;
 * - a throw from `place` is `E_EXTENSION_FAILED`, and a map keyed by the wrong kind of id is
 *   refused instead of silently placing nothing.
 */

// INTERNAL ADAPTER. The advanced contract this is meant to compile to -- the snapshot layout
// registration of design/extensions/layout.md (`SnapshotLayoutRegistration`) -- is not built yet.
// Until it is, the definition compiles to a `SimpleLayoutEngine` subclass that fills the
// engine's own `positions` record, the one route every static engine publishes through. The class
// is never exported; replace it with a `SnapshotLayoutRegistration` when that contract lands.

import type { RegisterOptions } from "../catalog/pluginRegistry";
import type { AuthoredLayoutDescriptor, LayoutDescriptor, OptionDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { LayoutEngine, SimpleLayoutEngine, type SimpleLayoutOpts } from "../layout/LayoutEngine";
import { GraphtyLogger } from "../logging/GraphtyLogger.js";
import type { Node } from "../Node";
import {
    callAuthorAsync,
    checkDefinition,
    describeValue,
    displayName,
    optionalOneOf,
    requireFunction,
} from "./definition";
import { checkViewOptions, expandOptions } from "./options";
import { viewSourceOf } from "./source";
import type { GraphView, LayoutContext, LayoutDefinition, NodeId, OptionsShorthand, Point } from "./types";
import { createGraphView, quoteId, viewWarnings } from "./view";

const VERB = "defineLayout";

/** A function that holds the page longer than this at a time gets one warning per layout id. */
const LONG_TASK_MS = 200;

/** The seed `context.random()` starts from when the definition does not ask for randomness. */
const FIXED_SEED = 1;

/** How many unknown keys a warning lists. */
const LISTED_KEYS = 5;

const logger = GraphtyLogger.getLogger(["graphty", "layout", "simple"]);

/** The layout ids already warned about blocking the page. */
const warnedLongTask = new Set<string>();

/** What a definition compiles to: everything the engine needs, checked. */
interface Plan {
    readonly id: string;
    readonly options: readonly OptionDescriptor[];
    readonly random: boolean;
    readonly place: (graph: GraphView, context: LayoutContext<Record<string, unknown>>) => unknown;
}

/**
 * The engine each id was last filed with, the function it came from and the rest of the definition
 * it was built from: the sameness rule. A changed member files a new engine, which replaces it.
 */
const filed = new Map<
    string,
    { readonly place: unknown; readonly signature: string; readonly engine: DefinedEngine }
>();

/** A definition with no options, the default of the verb's generic. */
type NoOptions = Readonly<Record<never, never>>;

/**
 * Say something a layout's author must hear. The log is off by default, so a warning that went
 * only there would reach no one: while the log's own console is not showing it, it goes to the
 * console directly.
 * @param id - The layout's id.
 * @param message - The sentence, starting with the id.
 * @param data - The facts, for the log.
 */
function warn(id: string, message: string, data: Record<string, unknown> = {}): void {
    logger.warn(message, { layout: id, ...data });
    if (!GraphtyLogger.isEnabled() || !GraphtyLogger.getSinks().some((sink) => sink.name === "console")) {
        console.warn(`[graphty] ${message}`);
    }
}

/** The engine class a definition compiles to. */
type DefinedEngine = new (opts: object) => LayoutEngine;

/** A computed layout, keyed as the engine's `positions` record is, in scene units. */
type Positions = Record<string, number[]>;

/**
 * Seeded random numbers in [0, 1) (mulberry32).
 * @param seed - The seed.
 * @returns The generator.
 */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Let the page draw a frame.
 * @returns A promise that resolves on the next task.
 */
function yieldNow(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * The refusal of what `place` returned: the author's mistake, coded as their extension's failure.
 * @param id - The layout's id.
 * @param message - The sentence, starting with the id.
 * @returns The error.
 */
function placeRefused(id: string, message: string): GraphtyError {
    return new GraphtyError({
        code: "E_EXTENSION_FAILED",
        message,
        source: "layout",
        details: { extension: id, member: "place" },
    });
}

/**
 * A map key as a message quotes it.
 * @param key - The key.
 * @returns `"1"` for a string, `1` for a number, a description otherwise.
 */
function quoteKey(key: unknown): string {
    return typeof key === "string" || typeof key === "number" ? quoteId(key) : describeValue(key);
}

/**
 * What kind of ids the graph's nodes have, for the wrong-key refusal.
 * @param graph - The view.
 * @returns "strings", "numbers" or "strings and numbers".
 */
function idKinds(graph: GraphView): string {
    const kinds = new Set(graph.nodes().map((node) => typeof node.id));
    if (kinds.size > 1) {
        return "strings and numbers";
    }

    return kinds.has("number") ? "numbers" : "strings";
}

/**
 * Turn what `place` returned into the engine's positions record, refusing a malformed result.
 * @param id - The layout's id.
 * @param returned - What `place` returned.
 * @param graph - The view it read.
 * @param twoD - Whether the view is 2D, which drops z.
 * @returns The positions, in scene units.
 */
function positionsOf(id: string, returned: unknown, graph: GraphView, twoD: boolean): Positions {
    if (!(returned instanceof Map)) {
        throw placeRefused(
            id,
            `${id}: place() must return a Map from node id to [x, y] or [x, y, z]; got ${describeValue(returned)}.`,
        );
    }

    const positions: Positions = {};
    const unknown: unknown[] = [];
    let matched = 0;
    for (const [key, point] of returned as Map<unknown, unknown>) {
        const node = typeof key === "string" || typeof key === "number" ? graph.node(key) : undefined;
        if (node === undefined) {
            unknown.push(key);
            continue;
        }

        matched++;
        if (point === null || point === undefined) {
            continue;
        }

        if (
            !Array.isArray(point) ||
            (point.length !== 2 && point.length !== 3) ||
            !point.every((coordinate) => typeof coordinate === "number")
        ) {
            const shown = Array.isArray(point) ? `[${point.map(String).join(", ")}]` : describeValue(point);
            throw placeRefused(
                id,
                `${id}: place() returned ${shown} for node ${quoteId(node.id)}. A position is two or three ` +
                    "numbers; leave the node out to leave it unplaced.",
            );
        }

        const [x, y] = point;
        // In 2D the z is dropped before it is judged: a position the view never uses cannot unplace a node.
        const z = point.length === 3 && !twoD ? point[2] : 0;
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            positions[String(node.id)] = [x, y, z];
        }
    }

    if (matched === 0 && returned.size > 0) {
        throw placeRefused(
            id,
            `${id}: place() returned ${returned.size} positions but no key matches a node id ` +
                `(got ${quoteKey(unknown[0])}; node ids here are ${idKinds(graph)}). Key the map by node.id.`,
        );
    }

    if (unknown.length > 0) {
        const keys = unknown.slice(0, LISTED_KEYS).map(quoteKey);
        warn(
            id,
            `${id}: place() returned positions for ${String(unknown.length)} keys that are not nodes ` +
                `(${keys.join(", ")}); they were left out.`,
            { count: unknown.length, keys },
        );
    }

    return positions;
}

/**
 * Build the layout engine class a definition compiles to.
 * @param plan - The checked definition.
 * @param descriptor - Its catalogue entry.
 * @param maxDimensions - The most dimensions it uses.
 * @returns The class, ready for `LayoutEngine.register`.
 */
function engineFor(plan: Plan, descriptor: AuthoredLayoutDescriptor, maxDimensions: 2 | 3): DefinedEngine {
    const { id } = plan;

    return class DefinedLayout extends SimpleLayoutEngine {
        static override type = id;
        static override maxDimensions = maxDimensions;
        static override scoped = true;
        static override descriptor = descriptor;

        /** The resolved option values `place` receives. */
        readonly #values: Record<string, unknown>;
        /** The run in progress, aborted when a newer one starts or the engine is disposed. */
        #run: AbortController | null = null;
        /** A finished layout waiting for the next `doLayout` to adopt it, and the change count it saw. */
        #ready: { readonly positions: Positions; readonly seen: number } | null = null;
        /** Bumped by every node or edge change, so a layout computed over an older graph is redone. */
        #changes = 0;
        /** The change count the background run in flight saw, or null when none is. */
        #pending: number | null = null;
        #disposed = false;

        constructor(opts: SimpleLayoutOpts = {}) {
            super(opts);
            // Scene units: no hidden multiplier.
            this.scalingFactor = 1;
            const given = opts as Record<string, unknown>;
            this.#values = Object.fromEntries(
                plan.options.map((option) => [option.name, given[option.name] ?? option.default]),
            );
            if (plan.random && typeof this.#values.seed !== "number") {
                this.#values.seed = Math.floor(Math.random() * 2 ** 32);
                logger.info(`${id}: drew a layout seed`, { layout: id, seed: this.#values.seed });
            }

            // Recorded where an engine keeps what it was built with.
            this.config = { ...this.#values };
        }

        /**
         * Compute the first layout before the element starts drawing, so a refusal or a throw from
         * `place` reaches the `setLayout` call that caused it.
         */
        override async init(): Promise<void> {
            const seen = this.#changes;
            this.#ready = { positions: await this.#place(), seen };
        }

        /** Adopt a finished layout; when the graph has changed since it started, place again. */
        doLayout(): void {
            this.stale = false;
            const ready = this.#ready;
            if (ready !== null) {
                this.positions = ready.positions;
                this.#ready = null;
                if (ready.seen === this.#changes) {
                    return;
                }
            }

            if (this.#pending !== this.#changes) {
                this.#replace();
            }
        }

        override addNode(n: Node): void {
            super.addNode(n);
            this.#changes++;
        }

        override addEdge(...args: Parameters<SimpleLayoutEngine["addEdge"]>): void {
            super.addEdge(...args);
            this.#changes++;
        }

        override removeNode(n: Node): void {
            super.removeNode(n);
            this.#changes++;
        }

        override removeEdge(...args: Parameters<SimpleLayoutEngine["removeEdge"]>): void {
            super.removeEdge(...args);
            this.#changes++;
        }

        override dispose(): void {
            this.#disposed = true;
            this.#run?.abort();
            super.dispose();
        }

        /** Place again in the background, off this frame, and draw the result when it arrives. */
        #replace(): void {
            const seen = this.#changes;
            this.#pending = seen;
            // A run superseded by a newer one, or by disposal, is dropped whatever it produced.
            const current = (): boolean => this.#pending === seen && !this.#disposed;
            this.#place().then(
                (positions) => {
                    if (!current()) {
                        return;
                    }

                    this.#pending = null;
                    this.#ready = { positions, seen };
                    this.stale = true;
                    // The element's own restart, so the next frame draws it; a reader's pause still
                    // refuses it.
                    const graph = this._nodes[0]?.parentGraph;
                    if (graph) {
                        graph.getLayoutManager().running = true;
                    }
                },
                (error: unknown) => {
                    if (!current()) {
                        return;
                    }

                    this.#pending = null;
                    const thrown = error instanceof Error ? error : new Error(String(error));
                    logger.error(`${id}: the layout could not be recomputed`, thrown, { layout: id });
                    const graph = this._nodes[0]?.parentGraph;
                    graph?.getEventManager?.()?.emitGraphError(graph, thrown, "layout", { layoutType: id });
                },
            );
        }

        /**
         * One run of `place` over the graph as it stands.
         * @returns The positions it produced.
         */
        async #place(): Promise<Positions> {
            this.#run?.abort();
            const run = new AbortController();
            this.#run = run;

            const graph = this._nodes[0]?.parentGraph;
            // Only the element's own Graph has a session; a bare GraphContext (a test harness) does not.
            const session = graph !== undefined && "getSession" in graph ? graph.getSession() : undefined;
            if (graph === undefined || session === undefined) {
                // No nodes yet, or an engine driven without an element: nothing to place.
                return {};
            }

            const twoD = graph.getStyles().config.graph.viewMode === "2d";
            const view = createGraphView(viewSourceOf(session), { id, directed: false, source: "layout" });
            checkViewOptions(view, id, plan.options, this.#values, "layout");

            const byId = new Map<NodeId, Node>(this._nodes.map((node) => [node.id, node]));
            let resumed = 0;
            let longest = 0;
            const context: LayoutContext<Record<string, unknown>> = {
                options: this.#values,
                dimensions: twoD ? 2 : 3,
                fixed: (nodeId) => this.#fixed(byId.get(nodeId), twoD),
                random: seededRandom(plan.random ? (this.#values.seed as number) : FIXED_SEED),
                signal: run.signal,
                progress: async () => {
                    longest = Math.max(longest, performance.now() - resumed);
                    run.signal.throwIfAborted();
                    await yieldNow();
                    run.signal.throwIfAborted();
                    resumed = performance.now();
                },
            };

            run.signal.throwIfAborted();
            const returned = await callAuthorAsync({ id, member: "place", source: "layout" }, () => {
                resumed = performance.now();
                const result = plan.place(view, context);
                longest = Math.max(longest, performance.now() - resumed);
                return result;
            });
            run.signal.throwIfAborted();

            if (longest > LONG_TASK_MS && !warnedLongTask.has(id)) {
                warnedLongTask.add(id);
                const advice = `${id}: place() held the page for over ${LONG_TASK_MS} ms at a time; await context.progress(i / n) inside its loop.`;
                warn(id, advice);
            }

            for (const warning of viewWarnings(view)) {
                warn(id, warning);
            }

            return positionsOf(id, returned, view, twoD);
        }

        /**
         * Where a pinned or held node is.
         * @param node - The node, when the graph has it.
         * @param twoD - Whether the view is 2D.
         * @returns Its position, or null for a node the layout may place.
         */
        #fixed(node: Node | undefined, twoD: boolean): Point | null {
            if (node === undefined || !(node.isPinned() || this.isHeld(node.index))) {
                return null;
            }

            const at = { x: 0, y: 0, z: 0 };
            if (!this.readNodePosition(node, at)) {
                return null;
            }

            return twoD ? [at.x, at.y] : [at.x, at.y, at.z];
        }
    };
}

/**
 * The structural inputs a layout's options read, derived from their types.
 * @param options - The declared options.
 * @returns The inputs, in a stable order.
 */
function structuralInputsOf(options: readonly OptionDescriptor[]): LayoutDescriptor["structuralInputs"] {
    const types = new Set(options.map((option) => option.type));
    const inputs: ("node" | "partition" | "ordering")[] = [];
    if (types.has("node-id") || types.has("node-set")) {
        inputs.push("node");
    }

    if (types.has("partition")) {
        inputs.push("partition");
    }

    if (types.has("ordering")) {
        inputs.push("ordering");
    }

    return inputs;
}

/**
 * Register a layout from a plain definition object.
 * @param definition - The id, the options in short form, and `place`.
 * @param options - How to register it; `strict` refuses replacing a different layout under the id.
 * @throws A GraphtyError E_BAD_COMMAND for a malformed definition, before anything is registered.
 */
export function defineLayout<const O extends OptionsShorthand = NoOptions>(
    definition: LayoutDefinition<O>,
    options?: RegisterOptions,
): void {
    const checked = checkDefinition(VERB, definition);
    const { id } = checked;
    requireFunction(VERB, checked, "place");
    optionalOneOf(VERB, checked, "dimensions", [2, 3]);
    optionalOneOf(VERB, checked, "random", [true, false]);
    const declared = expandOptions(VERB, id, checked.options);
    const random = checked.random === true;
    if (random && !declared.some((option) => option.name === "seed")) {
        declared.push({ name: "seed", plainName: "Seed", type: "seed" } as OptionDescriptor);
    }

    const maxDimensions = checked.dimensions === 2 ? 2 : 3;
    const name = displayName(checked);
    const description = typeof checked.description === "string" ? checked.description : "";
    const signature = JSON.stringify([name, description, maxDimensions, random, declared]);

    // The same definition registered again is a no-op; a changed one replaces the old.
    const previous = filed.get(id);
    if (
        previous !== undefined &&
        previous.place === checked.place &&
        previous.signature === signature &&
        LayoutEngine.getClass(id) === previous.engine
    ) {
        return;
    }

    const descriptor: AuthoredLayoutDescriptor = {
        id,
        plainName: name,
        technicalName: name,
        description,
        family: "custom",
        kind: "batch",
        maxDimensions,
        sizeRating: "any",
        structuralInputs: structuralInputsOf(declared),
        options: declared,
        engine: id,
    };
    const engine = engineFor(
        { id, options: declared, random, place: checked.place as Plan["place"] },
        descriptor,
        maxDimensions,
    );
    LayoutEngine.register(engine, options);
    filed.set(id, { place: checked.place, signature, engine });
}
