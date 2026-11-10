import {
    type EdgeMask,
    type F32,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskTest,
    type NodeMask,
    type U32,
} from "@graphty/graph-format";
import type { LayoutResult } from "@graphty/layout";

import type { AuthoredLayoutDescriptor } from "../catalog/types";
import type { ElementPositions } from "../data/positions";
import { readSeedPosition } from "../data/seedPosition";
import type { Edge } from "../Edge";
import { GraphtyError } from "../errors";
import type { GraphtyWarningCode } from "../errors/codes";
import type { Node } from "../Node";
import {
    type EdgePosition,
    layoutDim,
    LayoutEngine,
    type Position,
    simpleLayoutInternals,
    StaticLayoutEngine,
} from "./LayoutEngine";

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
    /**
     * True until an answer of this layout has been published since it was chosen with `setLayout`:
     * the run that turns the graph into this layout's arrangement, rather than one that keeps it up
     * to date after a change.
     */
    readonly firstRun: boolean;
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
     * none. The option's value is a path into the node's data, dot separated (`"geo.lat"`), an
     * attribute as `data.<key>`, or a run's result field as `results.<run>.<field>`.
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
    /**
     * How wide the element draws each node, in scene units: the largest extent of its mesh. NaN
     * for a row no node answers. A layout that keeps nodes from overlapping reads it.
     * @returns one size per row
     * @since 3.29.0
     */
    nodeSizes?(): F32;
    /**
     * How wide and how tall the element draws each node, in scene units: its mesh's extent along
     * x and along y, two per row. NaN for a row no node answers. A layout that spaces nodes by
     * their boxes rather than by one size reads it.
     * @returns two sizes per row
     * @since 3.30.0
     */
    nodeExtents?(): F32;
    /**
     * What the stored edge weights mean, for a layout that reads them: `"strength"` (a larger
     * weight is a stronger connection, drawn shorter), `"distance"` (a larger weight is a longer
     * edge), or null to leave them unread. Read from `data.knownFields.edgeWeightMeaning`; an
     * unstated meaning reads as a strength. When the meaning was assumed or cannot be read, the
     * element emits a `layout-warning` (`W_WEIGHT_MEANING_ASSUMED`, `W_WEIGHT_MEANING_MISMATCH`).
     * @returns the meaning
     * @since 3.34.0
     */
    weightMeaning?(): "strength" | "distance" | null;
    /** Aborted when the answer is no longer wanted: the graph changed, the layout was replaced or the element was disposed. */
    readonly signal: AbortSignal;
    /** Tell the consumer how far the arrangement has got; the element emits it as `layout-progress`. */
    report(progress: SnapshotLayoutProgress): void;
    /**
     * Tell the consumer the data kept the layout from placing every node as asked, as a code and
     * its parameters; the element emits it as `layout-warning`.
     */
    warn(warning: SnapshotLayoutWarning): void;
}

/** What a layout reports through `warn`: a warning code and its parameters, never a sentence. */
export interface SnapshotLayoutWarning {
    readonly code: GraphtyWarningCode;
    readonly params: Readonly<Record<string, unknown>>;
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
    warn(warning: SnapshotLayoutWarning): void;
    /** The answer failed after the call that started it had returned. */
    fail(error: unknown): void;
    /** An asynchronous answer has arrived and wants a frame to be published in. */
    arrived(): void;
    /**
     * The values at a `data.<key>` or `results.<run>.<field>` path, by row of `graph`.
     * @returns the values, or null when nothing carries the path
     */
    column?(graph: GraphSnapshot, path: string): readonly unknown[] | null;
    /** Draw the style paint that has arrived, so the node sizes read next are the painted ones. */
    drawPaint(): void;
    /** What the stored edge weights mean; see {@link SnapshotLayoutInput.weightMeaning}. */
    weightMeaning?(): "strength" | "distance" | null;
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
export function atPath(data: unknown, path: string): unknown {
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
    /** Whether an answer has been published. */
    #published = false;
    /**
     * The part of the graph the run in progress arranges when the layout leaves rows out (see
     * `LayoutEngine.setLeftOut`): `graph`, `sourceGraph` and `followerGroups` answer in its rows
     * from the moment `compute` is called until the next run starts.
     */
    #part: KeptPart | null = null;

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
        this.#part = null;
        const { graph } = this;
        const stored = this.sourceGraph;

        const ready = this.#ready;
        this.#ready = null;
        if (ready !== null && ready.stored === stored) {
            this.result = this.#resultOf(ready.positions, graph);
            this.#published = true;
            return;
        }

        this.#abort();
        const controller = new AbortController();
        const answer = this.#computeKept(this.#input(graph, stored, controller));
        if (!(answer instanceof Promise)) {
            this.result = this.#resultOf(answer, graph);
            this.#published = true;
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

    /**
     * The graph being arranged; while a run that leaves rows out is computing, only the rows it lays out.
     * @returns the undirected graph
     */
    protected override get graph(): GraphSnapshot {
        return this.#part?.input.graph ?? super.graph;
    }

    /**
     * The graph being arranged as it is stored; see {@link SnapshotLayoutEngine.graph}.
     * @returns the stored graph
     */
    protected override get sourceGraph(): GraphSnapshot {
        return this.#part?.input.stored ?? super.sourceGraph;
    }

    /**
     * The groups following their members, in the rows of the graph being arranged: a group or a
     * member the layout leaves out is not in it.
     * @returns the groups by row
     */
    protected override get followerGroups(): ReadonlyMap<number, readonly number[]> {
        const groups = super.followerGroups;
        const part = this.#part;
        if (part === null) {
            return groups;
        }

        const out = new Map<number, readonly number[]>();
        for (const [row, members] of groups) {
            const at = part.remap[row];
            if (at !== INVALID_INDEX) {
                out.set(
                    at,
                    members.map((member) => part.remap[member]).filter((member) => member !== INVALID_INDEX),
                );
            }
        }

        return out;
    }

    /**
     * Compute the answer, over only the rows the layout keeps when it leaves any out: those rows
     * are handed to the layout as a graph of their own, so a left-out node takes no slot and pulls
     * on nothing, and the answer is spread back to the element's rows with the left-out rows NaN,
     * which leaves them where they are.
     * @param input - the input over every row
     * @returns the answer over every row
     */
    #computeKept(input: SnapshotLayoutInput): SnapshotLayoutAnswer {
        const part = this.#keptPartOf(input);
        if (part === null) {
            return this.compute(input);
        }

        this.#part = part;
        const answer = this.compute(part.input);
        const spread = (positions: F32): F32 => spreadRows(positions, part.origin, input);
        return answer instanceof Promise ? answer.then(spread) : spread(answer);
    }

    /**
     * The part of an input the layout keeps, when it leaves rows or edges out.
     * @param input - the input over every row
     * @returns the part, or null when it keeps everything
     */
    #keptPartOf(input: SnapshotLayoutInput): KeptPart | null {
        const rows = this.keptRows(input.graph.nodeCount);
        const edges = this.keptEdges(input.graph);
        if (rows === null && edges === null) {
            return null;
        }

        return keptPart(input, rows ?? makeMask(input.graph.nodeCount, true), {
            graph: edges,
            stored: edges === null ? null : this.keptEdges(input.stored),
        });
    }

    /**
     * Read something about the graph being arranged in the part the layout keeps, outside a run:
     * what a run would have arranged had it run now (see `LayoutEngine.setLeftOut`). Inside a run,
     * or when the layout keeps everything, `graph` already answers that.
     * @param read - what to read, through `graph`, `sourceGraph` and `_nodes`
     * @returns what it read
     */
    protected inKeptPart<T>(read: () => T): T {
        if (this.#part !== null) {
            return read();
        }

        const part = this.#keptPartOf(this.#input(this.graph, this.sourceGraph, new AbortController()));
        if (part === null) {
            return read();
        }

        this.#part = part;
        try {
            return read();
        } finally {
            this.#part = null;
        }
    }

    /** An emptied graph has nothing to arrange, so an answer still being computed for it is called off. */
    protected override refresh(): void {
        if (this.stale && simpleLayoutInternals.empty(this)) {
            this.#abort();
            this.#ready = null;
        }

        super.refresh();
    }

    /**
     * A node's coordinates, for the frame drawing it; see {@link SnapshotLayoutEngine.refreshForFrame}.
     * @param n - The node.
     * @returns Its coordinates.
     */
    override getNodePosition(n: Node): Position {
        this.refreshForFrame();
        return super.getNodePosition(n);
    }

    /**
     * An edge's endpoints, for the frame drawing it; see {@link SnapshotLayoutEngine.refreshForFrame}.
     * @param e - The edge.
     * @returns Its endpoints' coordinates.
     */
    override getEdgePosition(e: Edge): EdgePosition {
        this.refreshForFrame();
        return super.getEdgePosition(e);
    }

    /**
     * Recompute a stale layout for a frame's node or edge update, reporting a refusal instead of
     * throwing it. A frame that reads a node or an edge of a graph the layout refuses (planar over
     * an edge that made it K5) would otherwise abort its whole update pass with the layout
     * package's uncoded error, which never reached the error event. Reported through the layout
     * manager, it arrives as the coded refusal; the refused run places nothing, so every node is
     * then read where it already was. An engine nobody connected throws, as before.
     */
    private refreshForFrame(): void {
        const host = this.#host;
        if (host === null || !this.stale) {
            return;
        }

        try {
            this.refresh();
        } catch (error) {
            host.fail(error);
        }
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
            const answered =
                positions instanceof Float32Array
                    ? `${positions.length} numbers`
                    : "something other than a Float32Array";
            throw new GraphtyError({
                code: "E_INTERNAL",
                message:
                    `the layout "${this.type}" answered with ${answered}; ` +
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
        // A scope's hold, or a group that follows its members: either way the row is not arranged.
        const held = this.holdsAny;
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
            firstRun: !this.#published,
            weightMeaning: () => {
                const host = this.#host;
                return host?.weightMeaning === undefined ? "strength" : host.weightMeaning();
            },
            dimensions: dim,
            options,
            scope,
            fixed: { rows, positions: fixedAt },
            initial,
            added,
            column: (optionName) => {
                const path = options[optionName];
                if (typeof path !== "string" || path === "") {
                    return null;
                }

                // A run's result, or an attribute named the way an algorithm's option names one,
                // is read through the session; a bare path is read from each node's own data.
                if (path.startsWith("results.") || path.startsWith("data.")) {
                    const read = this.#host?.column?.(graph, path);
                    if (read !== undefined) {
                        return read;
                    }
                }

                return nodes.map((node) => (node === undefined ? undefined : atPath(node.data, path)));
            },
            dataPositions: () => {
                const out = new Float32Array(dim * n).fill(Number.NaN);
                nodes.forEach((node, row) => {
                    const seed = node === undefined ? null : readSeedPosition(node.data as Record<string, unknown>);
                    if (seed !== null) {
                        const scale = node?.parentGraph?.getStyles?.().config.data.knownFields.positionScale ?? 1;
                        for (let k = 0; k < dim; k++) {
                            out[dim * row + k] = seed[k] * scale;
                        }
                    }
                });
                return out;
            },
            // The sizes as the nodes are about to be drawn: paint that has arrived is drawn first.
            // ponytail: a style pass still running is not waited for; its sizes are read as drawn
            // now. Wait for it here if a layout is ever seen starting mid-pass.
            nodeSizes: () => {
                this.#host?.drawPaint();
                return Float32Array.from(nodes, (node) => (node === undefined ? Number.NaN : 2 * node.layoutRadius));
            },
            nodeExtents: () => {
                this.#host?.drawPaint();
                const out = new Float32Array(2 * n).fill(Number.NaN);
                nodes.forEach((node, row) => {
                    if (node !== undefined) {
                        const { x, y } = node.drawnHalfExtents;
                        out[2 * row] = 2 * x;
                        out[2 * row + 1] = 2 * y;
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
            warn: (warning) => {
                if (!controller.signal.aborted) {
                    this.#host?.warn(warning);
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

/** The rows a run that leaves rows out arranges, as their own input. */
interface KeptPart {
    /** The input over the kept rows only. */
    readonly input: SnapshotLayoutInput;
    /** Each kept row's row in the whole graph. */
    readonly origin: U32;
    /** Each row of the whole graph's kept row, or `INVALID_INDEX` for a row left out. */
    readonly remap: U32;
}

/**
 * The input over only the kept rows and edges: the induced subgraph of the kept rows less the
 * edges left out, and every per-row array and mask gathered to its rows.
 * @param input - the input over every row
 * @param kept - the rows to keep
 * @param edges - the edges to keep, of `input.graph` and of `input.stored`; null keeps every edge
 * @param edges.graph - those of `input.graph`
 * @param edges.stored - those of `input.stored`
 * @returns the part
 */
function keptPart(
    input: SnapshotLayoutInput,
    kept: NodeMask,
    edges: { readonly graph: EdgeMask | null; readonly stored: EdgeMask | null },
): KeptPart {
    const withEdges = (graph: GraphSnapshot, mask: EdgeMask | null): GraphSnapshot =>
        mask === null ? graph : graph.filterEdges(mask).snapshot;
    const derived = withEdges(input.graph, edges.graph).inducedSubgraph({ mask: kept });
    const n = input.graph.nodeCount;
    const origin = derived.nodeOrigin ?? Uint32Array.from({ length: n }, (_, row) => row);
    const remap = derived.nodeRemap ?? origin;

    const m = origin.length;
    const dim = input.dimensions;
    const rows = (all: F32, per: number): F32 => {
        const out = new Float32Array(per * m);
        origin.forEach((from, row) => {
            out.set(all.subarray(per * from, per * from + per), per * row);
        });
        return out;
    };
    const mask = (all: NodeMask): NodeMask => {
        const out = makeMask(m);
        origin.forEach((from, row) => {
            maskSet(out, row, maskTest(all, from));
        });
        return out;
    };
    // The left-out rows were the only rows outside the scope when every kept row is in it.
    const scope = input.scope === null ? null : mask(input.scope);
    const whole = scope !== null && origin.every((_from, row) => maskTest(scope, row));

    return {
        origin,
        remap,
        input: {
            ...input,
            graph: derived.snapshot,
            stored: withEdges(input.stored, edges.stored).inducedSubgraph({ mask: kept }).snapshot,
            scope: whole ? null : scope,
            fixed: { rows: mask(input.fixed.rows), positions: rows(input.fixed.positions, dim) },
            initial: rows(input.initial, dim),
            added: input.added === null ? null : mask(input.added),
            column: (optionName) => {
                const all = input.column(optionName);
                return all === null ? null : Array.from(origin, (from) => all[from]);
            },
            dataPositions: () => rows(input.dataPositions(), dim),
            ...(input.nodeSizes === undefined
                ? {}
                : { nodeSizes: () => rows(input.nodeSizes?.() ?? new Float32Array(0), 1) }),
            ...(input.nodeExtents === undefined
                ? {}
                : { nodeExtents: () => rows(input.nodeExtents?.() ?? new Float32Array(0), 2) }),
        },
    };
}

/**
 * Spread an answer over the kept rows back to every row: a left-out row is NaN, which places nothing.
 * @param positions - the answer, `input.dimensions` per kept row
 * @param origin - each kept row's row in the whole graph
 * @param input - the input over every row
 * @returns the answer over every row; `positions` itself when it is not the kept rows' length,
 *     so the length check refuses it as it would any malformed answer
 */
function spreadRows(positions: F32, origin: U32, input: SnapshotLayoutInput): F32 {
    const dim = input.dimensions;
    if (!(positions instanceof Float32Array) || positions.length !== dim * origin.length) {
        return positions;
    }

    const out = new Float32Array(dim * input.graph.nodeCount).fill(Number.NaN);
    origin.forEach((to, row) => {
        out.set(positions.subarray(dim * row, dim * row + dim), dim * to);
    });
    return out;
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
        static override readonly type = descriptor.id;
        static readonly maxDimensions = descriptor.maxDimensions;
        static override readonly honoursWeights = honoursWeights;
        static override readonly scoped = scoped;
        static override readonly descriptor: AuthoredLayoutDescriptor = descriptor;

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
