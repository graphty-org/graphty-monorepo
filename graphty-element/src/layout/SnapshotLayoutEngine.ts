import { type F32, type GraphSnapshot, makeMask, maskSet, maskTest, type NodeMask } from "@graphty/graph-format";
import type { LayoutResult } from "@graphty/layout";

import type { AuthoredLayoutDescriptor } from "../catalog/types";
import type { ElementPositions } from "../data/positions";
import { GraphtyError } from "../errors";
import type { Node } from "../Node";
import { readSeedPosition } from "../session/project/ingest";
import { layoutDim, LayoutEngine, simpleLayoutInternals,StaticLayoutEngine } from "./LayoutEngine";

/** How far an arrangement has got, as a layout reports it. */
export interface SnapshotLayoutProgress {
    /** Between 0 and 1, or null when the layout cannot say. */
    readonly fraction: number | null;
    /** What it is doing, in a reader's words. */
    readonly message?: string;
}

/**
 * What a layout on the snapshot contract is handed each time the element asks for an arrangement.
 *
 * Every coordinate array here and in the answer is in SCENE UNITS, `dimensions` numbers per row,
 * and row `i` is the node whose `index` is `i`. A row with no coordinate is NaN.
 */
export interface SnapshotLayoutInput {
    /** The graph to arrange, undirected: one edge per connected pair, in the element's node rows. */
    readonly graph: GraphSnapshot;
    /**
     * The same graph as the element stores it: directed or not, every parallel and reciprocal edge,
     * and the edge weights (`stored.edges.byRole("weight")`, or `stored.edgeList().weights`). Read
     * it for what making the graph undirected loses.
     */
    readonly stored: GraphSnapshot;
    /** 2 or 3, from the element's view mode or the consumer's `dim` option. */
    readonly dimensions: 2 | 3;
    /** The consumer's options, validated and defaulted against the descriptor's options. */
    readonly options: Readonly<Record<string, unknown>>;
    /**
     * For a scoped layout run over a set of nodes, the rows it places; null for the whole graph.
     * The rows outside it are in `fixed`.
     */
    readonly scope: NodeMask | null;
    /**
     * The rows the layout cannot move, with their current coordinates: pinned nodes, nodes outside
     * the scope, and after an add every node that was already laid out. The element keeps them
     * where they are whatever the answer says.
     */
    readonly fixed: { readonly rows: NodeMask; readonly positions: F32 };
    /** Every row's current coordinates; NaN for a node nothing has placed yet. */
    readonly initial: F32;
    /**
     * When the graph only grew since the last arrangement: the new rows. Every other row is kept
     * where it is (it is in `fixed`), so a layout that can start from `initial` places the newcomers
     * among their neighbours. Null for a fresh arrangement.
     */
    readonly added: NodeMask | null;
    /**
     * The values of the node attribute an option names, one per row, `undefined` where a node has
     * none. The option's value is a path into the node's data, dot separated (`"geo.lat"`).
     * @param optionName - the option naming the attribute
     * @returns the values, or null when the option is not set to a path
     */
    column(optionName: string): readonly unknown[] | null;
    /**
     * Where each node's own data places it: its `position` field (`{ x, y, z }` or `[x, y, z]`),
     * scaled by the element's `positionScale`. NaN for a node whose data gives none.
     * @returns the coordinates
     */
    dataPositions(): F32;
    /** Aborted when the answer is no longer wanted: the graph changed, the layout was replaced or the element was disposed. */
    readonly signal: AbortSignal;
    /** Tell the consumer how far the arrangement has got; the element emits it as `layout-progress`. */
    report(progress: SnapshotLayoutProgress): void;
}

/**
 * The answer: `dimensions` numbers per row of `input.graph`, in scene units; NaN leaves a row
 * unplaced. Returned directly, the element places the nodes in the same frame; returned as a
 * promise, the layout stays unsettled until it resolves.
 */
export type SnapshotLayoutAnswer = F32 | Promise<F32>;

/** A layout on the snapshot contract: a descriptor, and a function from the graph to coordinates. */
export interface SnapshotLayoutRegistration {
    /**
     * What the catalogue publishes. `honoursWeights` and `scoped` are declared here, since there is
     * no class to carry them as statics.
     */
    readonly descriptor: AuthoredLayoutDescriptor & { readonly honoursWeights?: boolean; readonly scoped?: boolean };
    /** Arrange the graph. */
    readonly compute: (input: SnapshotLayoutInput) => SnapshotLayoutAnswer;
}

/** Where a snapshot layout's progress and asynchronous failures go: the element's layout manager. */
interface SnapshotLayoutHost {
    progress(progress: SnapshotLayoutProgress): void;
    /** The answer failed after the call that started it had returned. */
    fail(error: unknown): void;
    /** An asynchronous answer has arrived and wants a frame to be published in. */
    arrived(): void;
}

/** The element's reach into a snapshot engine. No entry point exports it. */
export const snapshotLayoutInternals = {} as {
    connect(engine: SnapshotLayoutEngine, host: SnapshotLayoutHost): void;
};

/**
 * Resolve a dotted path in a node's data.
 * @param data - the node's data
 * @param path - the path
 * @returns the value, or undefined
 */
function atPath(data: unknown, path: string): unknown {
    let value = data;
    for (const key of path.split(".")) {
        if (value === null || typeof value !== "object") {
            return undefined;
        }

        value = (value as Record<string, unknown>)[key];
    }

    return value;
}

/**
 * The static engine every layout on the snapshot contract runs in, the element's own and a third
 * party's alike: it hands the layout a {@link SnapshotLayoutInput} and publishes the answer through
 * `StaticLayoutEngine`, which keeps pinned rows, holds existing rows after an add and carries the
 * newcomers into their frame.
 */
export abstract class SnapshotLayoutEngine extends StaticLayoutEngine {
    static {
        snapshotLayoutInternals.connect = (engine, host) => {
            engine.#host = host;
        };
    }

    /** The contract speaks scene units, so nothing is scaled on the way out. */
    override scalingFactor = 1;

    #host: SnapshotLayoutHost | null = null;
    /** The answer being computed, and how to call it off. */
    #pending: { readonly controller: AbortController; readonly stored: GraphSnapshot } | null = null;
    /** An asynchronous answer that has arrived and not been published yet. */
    #ready: { readonly stored: GraphSnapshot; readonly positions: F32 } | null = null;

    /** How many coordinates a row has, in the input and in the answer. */
    protected abstract readonly dimensions: 2 | 3;

    /** The options handed to the layout. */
    protected abstract readonly options: Readonly<Record<string, unknown>>;

    /**
     * Arrange the graph.
     * @param input - the graph and everything the element knows about where its nodes are
     * @returns the coordinates
     */
    protected abstract compute(input: SnapshotLayoutInput): SnapshotLayoutAnswer;

    /**
     * Unsettled while an asynchronous answer is being computed or has not been published yet.
     * @returns whether the arrangement is final
     */
    override get isSettled(): boolean {
        return this.#pending === null && this.#ready === null;
    }

    /** Run the layout, or publish the asynchronous answer that has arrived for this graph. */
    doLayout(): void {
        this.stale = false;
        const { graph } = this;
        const stored = this.sourceGraph;

        const ready = this.#ready;
        this.#ready = null;
        if (ready !== null && ready.stored === stored) {
            this.result = this.#resultOf(ready.positions, graph);
            return;
        }

        this.#abort();
        const controller = new AbortController();
        const answer = this.compute(this.#input(graph, stored, controller));
        if (!(answer instanceof Promise)) {
            this.result = this.#resultOf(answer, graph);
            return;
        }

        this.#pending = { controller, stored };
        simpleLayoutInternals.waiting.add(this);
        answer.then(
            (positions) => {
                if (this.#pending?.controller !== controller) {
                    return;
                }

                this.#settle();
                try {
                    this.#resultOf(positions, graph);
                } catch (error) {
                    this.#host?.fail(error);
                    return;
                }

                this.#ready = { stored, positions };
                this.stale = true;
                this.#host?.arrived();
            },
            (error: unknown) => {
                if (this.#pending?.controller !== controller) {
                    return;
                }

                this.#settle();
                this.#host?.fail(error);
            },
        );
    }

    /** Call off an answer still being computed, which aborts its signal. */
    override dispose(): void {
        this.#abort();
        super.dispose();
    }

    /** Call off the answer being computed, if any. */
    #abort(): void {
        const pending = this.#pending;
        this.#settle();
        pending?.controller.abort();
    }

    /** Forget the answer being computed without calling it off. */
    #settle(): void {
        this.#pending = null;
        simpleLayoutInternals.waiting.delete(this);
    }

    /**
     * Check an answer's shape and hand it to `StaticLayoutEngine` as a layout result.
     * @param positions - the answer
     * @param graph - the graph it arranges
     * @returns the result
     */
    #resultOf(positions: F32, graph: GraphSnapshot): LayoutResult {
        const expected = this.dimensions * graph.nodeCount;
        if (!(positions instanceof Float32Array) || positions.length !== expected) {
            throw new GraphtyError({
                code: "E_INTERNAL",
                message:
                    `the layout "${this.type}" answered with ${positions instanceof Float32Array ? `${positions.length} numbers` : "something other than a Float32Array"}; ` +
                    `it must answer with a Float32Array of ${expected} (${this.dimensions} per node)`,
                source: "layout",
                details: { layout: this.type, expected },
            });
        }

        return { positions, dim: this.dimensions, n: graph.nodeCount };
    }

    /**
     * Assemble what the layout is handed.
     * @param graph - the undirected graph
     * @param stored - the graph as stored
     * @param controller - the run's abort controller
     * @returns the input
     */
    #input(graph: GraphSnapshot, stored: GraphSnapshot, controller: AbortController): SnapshotLayoutInput {
        const n = graph.nodeCount;
        const dim = this.dimensions;
        const positions = simpleLayoutInternals.positions(this);
        const initial = positions === null ? new Float32Array(dim * n).fill(Number.NaN) : this.#current(positions, n);

        const kept = simpleLayoutInternals.kept(this);
        const held = this.holdMask !== null;
        const scope = held ? makeMask(n) : null;
        const rows = makeMask(n);
        const fixedAt = new Float32Array(dim * n).fill(Number.NaN);
        for (let row = 0; row < n; row++) {
            const isHeld = held && this.isHeld(row);
            if (scope !== null && !isHeld) {
                maskSet(scope, row, true);
            }

            if (isHeld || (kept !== null && maskTest(kept, row)) || positions?.isPinned(row) === true) {
                maskSet(rows, row, true);
                fixedAt.set(initial.subarray(dim * row, dim * row + dim), dim * row);
            }
        }

        let added: NodeMask | null = null;
        if (kept !== null) {
            added = makeMask(n);
            for (let row = 0; row < n; row++) {
                maskSet(added, row, !maskTest(kept, row));
            }
        }

        const nodes = this.#nodesByRow(n);
        const { options } = this;
        return {
            graph,
            stored,
            dimensions: dim,
            options,
            scope,
            fixed: { rows, positions: fixedAt },
            initial,
            added,
            column: (optionName) => {
                const path = options[optionName];
                return typeof path === "string" && path !== ""
                    ? nodes.map((node) => (node === undefined ? undefined : atPath(node.data, path)))
                    : null;
            },
            dataPositions: () => {
                const out = new Float32Array(dim * n).fill(Number.NaN);
                nodes.forEach((node, row) => {
                    const seed = node === undefined ? null : readSeedPosition(node.data as Record<string, unknown>);
                    if (seed !== null) {
                        const scale =
                            node?.parentGraph?.getStyles?.().config.data.knownFields.positionScale ?? 1;
                        for (let k = 0; k < dim; k++) {
                            out[dim * row + k] = seed[k] * scale;
                        }
                    }
                });
                return out;
            },
            signal: controller.signal,
            report: (progress) => {
                if (!controller.signal.aborted) {
                    this.#host?.progress(progress);
                }
            },
        };
    }

    /**
     * Every row's coordinates in the element's array, `dimensions` per row.
     * @param positions - the array
     * @param n - the number of rows
     * @returns the coordinates
     */
    #current(positions: ElementPositions, n: number): F32 {
        const dim = this.dimensions;
        const out = new Float32Array(dim * n).fill(Number.NaN);
        const at = { x: 0, y: 0, z: 0 };
        for (let row = 0; row < n && row < positions.count; row++) {
            if (positions.isPlaced(row)) {
                positions.read(row, at);
                out.set(dim === 3 ? [at.x, at.y, at.z] : [at.x, at.y], dim * row);
            }
        }

        return out;
    }

    /**
     * The engine's nodes by row of the graph being arranged.
     * @param n - the number of rows
     * @returns the node of each row, or undefined for a row no node answers
     */
    #nodesByRow(n: number): (Node | undefined)[] {
        const out = new Array<Node | undefined>(n);
        const { ids } = this.graph;
        for (const node of this._nodes) {
            const row = ids.indexOf(node.id);
            if (row >= 0 && row < n) {
                out[row] = node;
            }
        }

        return out;
    }
}

/**
 * Register a layout on the snapshot contract: the element builds its engine from the
 * registration, publishes the descriptor to the catalogue and answers `setLayout(descriptor.id)`.
 * @param registration - the descriptor and the compute function
 * @throws what `LayoutEngine.register` throws for a missing, mismatched or taken name
 */
export function registerSnapshotLayout(registration: SnapshotLayoutRegistration): void {
    const { honoursWeights = false, scoped = false, ...descriptor } = registration.descriptor;
    const { compute } = registration;

    class RegisteredSnapshotLayout extends SnapshotLayoutEngine {
        static override type = descriptor.id;
        static maxDimensions = descriptor.maxDimensions;
        static override honoursWeights = honoursWeights;
        static override scoped = scoped;
        static override descriptor: AuthoredLayoutDescriptor = descriptor;

        protected readonly dimensions: 2 | 3;
        protected readonly options: Readonly<Record<string, unknown>>;

        /**
         * Build the engine for one `setLayout`.
         * @param opts - the consumer's options, validated against the descriptor, and `dim`
         */
        constructor(opts: object = {}) {
            super({});
            const { dim, ...rest } = opts as Record<string, unknown>;
            this.dimensions = Math.min(layoutDim(Number(dim ?? 2)), descriptor.maxDimensions) as 2 | 3;
            this.options = rest;
        }

        protected compute(input: SnapshotLayoutInput): SnapshotLayoutAnswer {
            return compute(input);
        }
    }

    LayoutEngine.register(RegisteredSnapshotLayout);
}

/**
 * A `@graphty/layout` result in scene units: the answer a layout on the snapshot contract returns.
 * @param result - the result, in layout units
 * @param scale - scene units per layout unit
 * @returns the coordinates, `result.dim` per row
 */
export function sceneUnits(result: LayoutResult, scale: number): F32 {
    return Float32Array.from(result.positions, (v) => v * scale);
}

/**
 * The start positions a `@graphty/layout` layout takes, in layout units: every row's current
 * coordinates when the run follows an add (`input.added`), otherwise null.
 * @param input - the run's input
 * @param dim - components per row the layout reads; must be `input.dimensions`
 * @param scale - scene units per layout unit
 * @returns the rows, or null
 */
export function startFrom(input: SnapshotLayoutInput, dim: 2 | 3, scale: number): F32 | null {
    return input.added === null || dim !== input.dimensions ? null : Float32Array.from(input.initial, (v) => v / scale);
}
