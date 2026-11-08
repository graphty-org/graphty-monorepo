/**
 * @file The working graph (design/working-graph/design.md sections 1 and 6): one view of what the
 * visibility filter and the time window leave shown, which every reader reads when it names no
 * scope and the session's `workingGraph` option is on.
 *
 * A VIEW, NOT A COPY. The original snapshot stays the only graph: edits, undo and the project file
 * act on it, and positions, styles, run results and notes stay keyed by its ids. The view holds only
 * structure -- graph-format's `inducedSubgraph` over the visible node mask, then `filterEdges` when
 * an edge filter hides more than the hidden nodes' edges -- plus the row maps both ways.
 *
 * BUILT ONCE PER STATE. The state is the store's snapshot and the two visible masks' read-only
 * copies, which the visibility API replaces exactly when the membership changes: a filter change, a
 * time-window step, a data edit, or an undo or redo of one. A selection, a style or a drawing option
 * never touches them, so it never rebuilds the view. Nothing hidden, the view is the snapshot itself.
 * The view is built on its first read in a state, held outside the run cache, and shared: a run over
 * the same membership takes it through `shareInputs` instead of deriving its own.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask, type U32 } from "@graphty/graph-format";

import type { DerivedInput, InputMembership } from "../../algorithms/input/derivedInputs";
import { intermediateOf, type SharedInputLookup } from "../../algorithms/input/ScopedInput";
import type { ScopeVisibilitySource } from "../scope/ScopeApi";

/** Counts the view tests read: one per derivation of a view, never for the whole graph. */
export const workingViewCounters = { builds: 0 };

/** Which graph a reader asks for: what is shown, or the whole graph by name. */
export type WorkingScope = "visible" | "graph";

/** One view of the graph: its structure, and the maps between its rows and the original's. */
export interface WorkingView {
    /** The original snapshot the view covers. */
    readonly graph: GraphSnapshot;
    /** The view's compact snapshot; `graph` itself when the view is whole. */
    readonly snapshot: GraphSnapshot;
    /** True when nothing is hidden, or the whole graph was asked for by name. */
    readonly whole: boolean;
    /** The shown nodes, as a graph-format bitmap over `graph`'s rows. */
    readonly nodes: U32;
    /** The shown edges, as a graph-format bitmap over `graph`'s rows. */
    readonly edges: U32;
    /** How many nodes are shown. */
    readonly nodeCount: number;
    /** How many edges are shown. */
    readonly edgeCount: number;
    /** View node row -> `graph` node row; null when whole. */
    readonly nodeOrigin: U32 | null;
    /** `graph` node row -> view node row, INVALID_INDEX for a hidden node; null when whole. */
    readonly nodeRows: U32 | null;
    /** View edge row -> `graph` edge row; null when whole. */
    readonly edgeOrigin: U32 | null;
    /** `graph` edge row -> view edge row, INVALID_INDEX for a hidden edge; null when whole. */
    readonly edgeRows: U32 | null;
}

/** The session's working graph. */
export interface WorkingGraph {
    /** Whether a reader naming no scope reads what is shown; off, it reads the whole graph. */
    enabled: boolean;
    /**
     * The view a reader reads.
     * @param scope - `"visible"` for what is shown, `"graph"` for the whole graph; absent, what
     *   `enabled` says.
     * @returns The view, the same object until the state changes.
     */
    view(scope?: WorkingScope): WorkingView;
    /** What a run over the visible membership takes instead of deriving, while `enabled`. */
    readonly shared: SharedInputLookup;
}

/** What the working graph reads. */
export interface WorkingGraphSources {
    /** The store's current snapshot. */
    readonly snapshot: () => GraphSnapshot;
    /** The visible masks; each read returns the same copy until its membership changes. */
    readonly masks: ScopeVisibilitySource;
    /** The store, which a run's membership names. */
    readonly store: object;
}

/** One state's masks, packed, and its view once built. */
interface State {
    readonly graph: GraphSnapshot;
    readonly nodeKey: object;
    readonly edgeKey: object;
    readonly nodes: U32;
    readonly edges: U32;
    readonly nodeCount: number;
    readonly edgeCount: number;
    view: (WorkingView & { readonly input: DerivedInput }) | null;
}

/**
 * The inverse of an origin map: for each of `length` rows, its row in the map's space.
 * @param origin - Derived row -> original row.
 * @param length - The original row count.
 * @returns Original row -> derived row, INVALID_INDEX where dropped.
 */
function inverseOf(origin: U32, length: number): U32 {
    const rows = new Uint32Array(length).fill(INVALID_INDEX);
    for (let row = 0; row < origin.length; row++) {
        rows[origin[row]] = row;
    }

    return rows;
}

/**
 * An edge remap's inverse: for each derived edge, its original row.
 * @param remap - Original edge row -> derived row, INVALID_INDEX where dropped.
 * @param length - The derived edge count.
 * @returns Derived edge row -> original row.
 */
function originOf(remap: U32, length: number): U32 {
    const origin = new Uint32Array(length);
    for (let row = 0; row < remap.length; row++) {
        const target = remap[row];
        if (target !== INVALID_INDEX) {
            origin[target] = row;
        }
    }

    return origin;
}

/**
 * Whether two bitmaps hold the same words.
 * @param left - One.
 * @param right - The other.
 * @returns True when equal.
 */
function sameWords(left: U32, right: U32): boolean {
    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) {
            return false;
        }
    }

    return true;
}

/**
 * The whole graph as a view, with no derivation.
 * @param graph - The snapshot.
 * @returns The view.
 */
function wholeView(graph: GraphSnapshot): WorkingView {
    return {
        graph,
        snapshot: graph,
        whole: true,
        nodes: makeMask(graph.nodeCount, true),
        edges: makeMask(graph.edgeCount, true),
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        nodeOrigin: null,
        nodeRows: null,
        edgeOrigin: null,
        edgeRows: null,
    };
}

/**
 * Build a session's working graph.
 * @param sources - The snapshot, the visible masks and the store.
 * @param enabled - Whether it starts on.
 * @returns The working graph.
 */
export function createWorkingGraph(sources: WorkingGraphSources, enabled = false): WorkingGraph {
    let state: State | null = null;
    let whole: WorkingView | null = null;

    /**
     * The current state, packed again only when the snapshot or a mask copy changed.
     * @returns The state.
     */
    const current = (): State => {
        const graph = sources.snapshot();
        const nodeMask = sources.masks.nodes();
        const edgeMask = sources.masks.edges();
        if (state?.graph !== graph || state.nodeKey !== nodeMask || state.edgeKey !== edgeMask) {
            state = {
                graph,
                nodeKey: nodeMask,
                edgeKey: edgeMask,
                nodes: nodeMask.pack(graph.nodeCount),
                edges: edgeMask.pack(graph.edgeCount),
                nodeCount: nodeMask.size,
                edgeCount: edgeMask.size,
                view: null,
            };
        }

        return state;
    };

    /**
     * The whole graph's view, kept per snapshot.
     * @param graph - The snapshot.
     * @returns The view.
     */
    const wholeOf = (graph: GraphSnapshot): WorkingView => {
        if (whole?.graph !== graph) {
            whole = wholeView(graph);
        }

        return whole;
    };

    /**
     * A state's view, built on its first read.
     * @param at - The state.
     * @returns The view and its declared intermediate.
     */
    const built = (at: State): WorkingView & { readonly input: DerivedInput } => {
        if (at.view !== null) {
            return at.view;
        }

        workingViewCounters.builds++;
        const membership: InputMembership = { nodes: at.nodes, edges: at.edges, serial: 0, store: sources.store };
        const input = intermediateOf(membership, at.graph);
        const { snapshot, nodeOrigin, edgeRemap } = input;
        at.view = {
            graph: at.graph,
            snapshot,
            whole: false,
            nodes: at.nodes,
            edges: at.edges,
            nodeCount: at.nodeCount,
            edgeCount: at.edgeCount,
            nodeOrigin,
            nodeRows: nodeOrigin === null ? null : inverseOf(nodeOrigin, at.graph.nodeCount),
            edgeOrigin: edgeRemap === null ? null : originOf(edgeRemap, snapshot.edgeCount),
            edgeRows: edgeRemap,
            input,
        };

        return at.view;
    };

    const working: WorkingGraph = {
        enabled,
        view(scope?: WorkingScope): WorkingView {
            const asked = scope ?? (working.enabled ? "visible" : "graph");
            const at = current();
            if (asked === "graph" || (at.nodeCount === at.graph.nodeCount && at.edgeCount === at.graph.edgeCount)) {
                return wholeOf(at.graph);
            }

            return built(at);
        },
        shared(membership: InputMembership, declared: GraphSnapshot): DerivedInput | undefined {
            if (!working.enabled || membership.store !== sources.store) {
                return undefined;
            }

            const at = current();
            if (
                at.graph !== declared ||
                !sameWords(at.nodes, membership.nodes) ||
                !sameWords(at.edges, membership.edges)
            ) {
                return undefined;
            }

            return built(at).input;
        },
    };

    return working;
}
