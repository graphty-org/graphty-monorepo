/**
 * @file The working graph (design/working-graph/design.md): one view of the original graph, what
 * the visibility filter and the time window leave shown, built at most once per state and shared by
 * every reader.
 *
 * TWO KINDS OF READ. Counts, `has` and the id lists answer from the visibility masks and build
 * nothing, so a slide or a held condition that moves the masks every frame costs no derivation.
 * `snapshot()` and the row maps are topology reads: the first one after the state moved derives
 * the compact graph through graph-format's `inducedSubgraph` (and `filterEdges` when an edge
 * filter hides more than the hidden nodes' edges), in the SAME `DerivedInputs` entry a run over
 * the `"visible"` scope reads, so a run and the view share one derivation.
 *
 * THE KEY is the store's snapshot and the masks' read-only copies, which are the same objects
 * until a mask's version moves. A filter change, a window move, an undo of either, a data edit and
 * a streaming load all change it; drawing options (ghosts, context) never do, because ghosts and
 * context nodes are drawn but never in the visible masks.
 *
 * NOTHING HIDDEN COSTS NOTHING: when the masks cover the whole graph, the compact graph is the
 * store's snapshot with identity row maps, and nothing is derived.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { DerivedInput, DerivedInputs } from "../../algorithms/input/derivedInputs";
import { declaredInput } from "../../algorithms/input/ScopedInput";
import type { EdgeId, NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { ElementMask } from "../scope/ElementMask";
import type { Resolution } from "../sets/resolve";
import { WORKING_GRAPH_MODES, type WorkingGraph, type WorkingGraphMode } from "../types";

/** What the view reads. Every member is read on use, so the parts may be built after the view. */
export interface WorkingViewSources {
    /**
     * The store's snapshot: the original graph.
     * @returns The snapshot.
     */
    snapshot(): GraphSnapshot;
    /**
     * The original graph as a consumer may hold it (coordinate columns copied).
     * @returns The snapshot.
     */
    consumerSnapshot(): GraphSnapshot;
    /**
     * The visible node mask: a read-only copy, the same object until it changes.
     * @returns The mask.
     */
    nodes(): ElementMask<NodeId>;
    /**
     * The visible edge mask: a read-only copy, the same object until it changes.
     * @returns The mask.
     */
    edges(): ElementMask<EdgeId>;
    /**
     * The `"visible"` scope resolved through the session's resolution cache.
     * @returns The resolution and the snapshot it covers.
     */
    resolveVisible(): { readonly resolution: Resolution; readonly graph: GraphSnapshot };
    /**
     * The derived-input cache runs read through.
     * @returns The cache.
     */
    inputs(): DerivedInputs;
}

/** The session's working graph, with what the element itself reads. */
export interface WorkingView {
    /** The mode readers that name no scope follow. */
    mode: WorkingGraphMode;
    /**
     * The view of the current state: the same object until the state moves.
     * @returns The view.
     */
    current(): WorkingGraph;
    /**
     * The compact input of the current state, held by the view until the state moves.
     * @returns The input, and whether it is the whole graph.
     */
    input(): DerivedInput & { readonly whole: boolean };
    /** Let go of what the view holds. */
    dispose(): void;
}

/**
 * The inverse of a row map, INVALID_INDEX where nothing maps.
 * @param forward - Row -> target row, INVALID_INDEX for none.
 * @param size - How many target rows there are.
 * @returns Target row -> row.
 */
function inverse(forward: U32, size: number): U32 {
    const back = new Uint32Array(size).fill(INVALID_INDEX);
    for (let row = 0; row < forward.length; row++) {
        const target = forward[row];
        if (target !== INVALID_INDEX && target < size) {
            back[target] = row;
        }
    }

    return back;
}

/**
 * Refuse a compact row outside the view.
 * @param row - The row.
 * @param count - How many rows the view has.
 * @param what - "node" or "edge".
 * @throws A `RangeError` when the row is not one of the view's.
 */
function requireRow(row: number, count: number, what: string): void {
    if (!Number.isInteger(row) || row < 0 || row >= count) {
        throw new RangeError(`${what} row ${String(row)} is outside the working graph's ${String(count)} ${what}s`);
    }
}

/**
 * Look a row up in a map, or pass it through when there is none.
 * @param map - The map, or null for identity.
 * @param row - The row.
 * @param size - How many rows the source space has.
 * @returns The mapped row, INVALID_INDEX outside the source space.
 */
function through(map: U32 | null, row: number, size: number): number {
    if (!Number.isInteger(row) || row < 0 || row >= size) {
        return INVALID_INDEX;
    }

    return map === null ? row : map[row];
}

/**
 * Refuse a working-graph mode this release does not know.
 * @param mode - The mode as given.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when it is not a {@link WorkingGraphMode}.
 */
export function requireWorkingGraphMode(mode: unknown): asserts mode is WorkingGraphMode {
    if (!(WORKING_GRAPH_MODES as readonly unknown[]).includes(mode)) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `workingGraph must be one of ${WORKING_GRAPH_MODES.map((m) => `"${m}"`).join(", ")}, not ${JSON.stringify(mode)}.`,
            source: "config",
            details: { option: "workingGraph", value: mode, allowed: [...WORKING_GRAPH_MODES] },
        });
    }
}

/**
 * Build the session's working graph.
 * @param sources - What it reads.
 * @param mode - The mode it starts in.
 * @returns The view.
 */
export function createWorkingView(sources: WorkingViewSources, mode: WorkingGraphMode = "documented"): WorkingView {
    let state: {
        readonly graph: GraphSnapshot;
        readonly nodes: ElementMask<NodeId>;
        readonly edges: ElementMask<EdgeId>;
        readonly holder: object;
        readonly view: WorkingGraph;
        input: (DerivedInput & { readonly whole: boolean }) | null;
        /** The consumer's copy of the whole graph, when nothing is hidden. */
        consumer: GraphSnapshot | null;
        /** Original node row -> compact row. */
        nodeRemap: U32 | null;
        /** Compact edge row -> original row. */
        edgeOrigin: U32 | null;
    } | null = null;

    const release = (): void => {
        if (state !== null) {
            sources.inputs().releaseHolder(state.holder);
            state = null;
        }
    };

    const now = (): NonNullable<typeof state> => {
        // The snapshot first: reading the masks brings them up to date with it.
        const graph = sources.snapshot();
        const nodes = sources.nodes();
        const edges = sources.edges();
        if (state?.graph === graph && state.nodes === nodes && state.edges === edges) {
            return state;
        }

        release();
        const holder = {};
        const fresh: NonNullable<typeof state> = {
            graph,
            nodes,
            edges,
            holder,
            view: viewOfNow(),
            input: null,
            consumer: null,
            nodeRemap: null,
            edgeOrigin: null,
        };
        state = fresh;

        return fresh;
    };

    /**
     * The compact input of the state, derived on first use.
     * @param held - The state.
     * @returns The input.
     */
    const inputOf = (held: NonNullable<typeof state>): DerivedInput & { readonly whole: boolean } => {
        if (held.input !== null) {
            return held.input;
        }

        const { resolution, graph } = sources.resolveVisible();
        const whole = resolution.nodeCount === graph.nodeCount && resolution.edgeCount === graph.edgeCount;
        held.input = whole
            ? { snapshot: graph, edgeRemap: null, nodeOrigin: null, whole }
            : { ...declaredInput(sources.inputs(), held.holder, resolution, graph), whole };

        return held.input;
    };

    /**
     * One state's public view. Every member reads the CURRENT state through `now()`, so a view held
     * past a change answers for the graph as it is now rather than for a graph that has gone; a new
     * object per state lets a consumer tell that the state moved.
     * @returns The view.
     */
    function viewOfNow(): WorkingGraph {
        const input = (): DerivedInput & { readonly whole: boolean } => inputOf(now());

        return Object.freeze({
            get nodeCount(): number {
                return now().nodes.size;
            },
            get edgeCount(): number {
                return now().edges.size;
            },
            has(id: NodeId | EdgeId): boolean {
                const { nodes, edges } = now();
                const node = nodes.indexOf(id);
                if (node !== INVALID_INDEX) {
                    return nodes.has(node);
                }

                // An edge id is text; the number it spells names the same edge.
                return edges.hasId(String(id));
            },
            nodeIds: (): readonly NodeId[] => now().nodes.ids(),
            edgeIds: (): readonly EdgeId[] => now().edges.ids(),
            snapshot(): GraphSnapshot {
                const held = input();
                if (!held.whole) {
                    return held.snapshot;
                }

                // The store's own snapshot holds the live coordinates; a consumer gets a copy, once.
                const current = now();
                current.consumer ??= sources.consumerSnapshot();
                return current.consumer;
            },
            originalNodeRow(row: number): number {
                const { snapshot, nodeOrigin } = input();
                requireRow(row, snapshot.nodeCount, "node");
                return nodeOrigin === null ? row : nodeOrigin[row];
            },
            originalEdgeRow(row: number): number {
                const held = input();
                requireRow(row, held.snapshot.edgeCount, "edge");
                if (held.edgeRemap === null) {
                    return row;
                }

                const current = now();
                current.edgeOrigin ??= inverse(held.edgeRemap, held.snapshot.edgeCount);
                return current.edgeOrigin[row];
            },
            compactNodeRow(originalRow: number): number {
                const held = input();
                const current = now();
                const size = current.graph.nodeCount;
                if (held.nodeOrigin === null) {
                    return through(null, originalRow, size);
                }

                current.nodeRemap ??= inverse(held.nodeOrigin, size);
                return through(current.nodeRemap, originalRow, size);
            },
            compactEdgeRow(originalRow: number): number {
                const held = input();
                return through(held.edgeRemap, originalRow, now().graph.edgeCount);
            },
        });
    }

    return {
        mode,
        current: () => now().view,
        input: () => inputOf(now()),
        dispose: release,
    };
}
