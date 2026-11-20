/**
 * @file The working graph (design/working-graph/design.md sections 1 and 6): one view of what the
 * filters leave shown, which every reader reads when it names no scope and the session's
 * `workingGraph` option is on. The time window is never part of it: a window step hides by
 * drawing and never changes what layouts, counts or styles read (owner rule 2026-11-12).
 *
 * A VIEW, NOT A COPY. The original snapshot stays the only graph: edits, undo and the project file
 * act on it, and positions, styles, run results and notes stay keyed by its ids. The view holds only
 * structure -- graph-format's `inducedSubgraph` over the visible node mask, then `filterEdges` when
 * an edge filter hides more than the hidden nodes' edges -- plus the row maps both ways.
 *
 * BUILT ONCE PER STATE. The state is the store's snapshot and the two filter masks' read-only
 * copies (`visibility.keptMasks`), which the visibility API replaces exactly when the membership
 * changes: a filter change, a data edit, or an undo or redo of one. A selection, a style or a drawing option
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
import { asWorkingSnapshot, type WholeSnapshot, type WorkingSnapshot } from "./graphs";

/** Counts the view tests read: one per derivation of a view, never for the whole graph. */
export const workingViewCounters = { builds: 0 };

/** Which graph a reader asks for: what is shown, or the whole graph by name. */
export type WorkingScope = "visible" | "graph";

/** One view of the graph: its structure, and the maps between its rows and the original's. */
export interface WorkingView {
    /** The original snapshot the view covers, hidden nodes included: never what a reader reads. */
    readonly graph: WholeSnapshot;
    /** The view's compact snapshot, hidden nodes absent: what a reader reads; `graph` itself when the view is whole. */
    readonly snapshot: WorkingSnapshot;
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
    /** View node row -> `graph` node row (every row, even when only edges are hidden); null when whole. */
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
    /** Whether a reader naming no scope reads what the filters show; off, it reads the whole graph. */
    enabled: boolean;
    /**
     * The view a reader reads.
     * @param scope - `"visible"` for what the filters show (a time window hides by drawing and is
     *   never part of a view), `"graph"` for the whole graph; absent, the working graph (what the
     *   filters show) while `enabled`, else the whole graph.
     * @returns The view, the same object until the state changes.
     */
    view(scope?: WorkingScope): WorkingView;
    /**
     * What the filters show, the time window aside, whether or not `enabled`: what a layout over only
     * what is shown runs over.
     * @returns The view, the same object until the state changes.
     */
    filtered(): WorkingView;
    /** What a run over the visible membership takes instead of deriving, while `enabled`. */
    readonly shared: SharedInputLookup;
}

/** What the working graph reads. */
export interface WorkingGraphSources {
    /** The store's current snapshot, by name. */
    readonly snapshot: () => WholeSnapshot;
    /** What the filters show (a time window hides by drawing, never here); each read returns the same copy until its membership changes. */
    readonly masks: ScopeVisibilitySource;
    /** What the filters keep, the time window aside; the session passes the same copies as `masks`. */
    readonly kept: ScopeVisibilitySource;
    /** The store, which a run's membership names. */
    readonly store: object;
}

/** One state's masks, packed, and its view once built. */
interface State {
    readonly graph: WholeSnapshot;
    nodeKey: object;
    edgeKey: object;
    readonly nodes: U32;
    readonly edges: U32;
    readonly nodeCount: number;
    readonly edgeCount: number;
    view: (WorkingView & { readonly input: DerivedInput }) | null;
}

/**
 * A row map that keeps every row where it is.
 * @param length - The row count.
 * @returns Row -> the same row.
 */
function identityRows(length: number): U32 {
    return Uint32Array.from({ length }, (_value, row) => row);
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
function wholeView(graph: WholeSnapshot): WorkingView {
    return {
        graph,
        // Nothing hidden, or the whole graph asked for by name: the original is what is read.
        snapshot: asWorkingSnapshot(graph),
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
 * @param sources - The snapshot, the filter masks and the store.
 * @param enabled - Whether it starts on.
 * @returns The working graph.
 */
export function createWorkingGraph(sources: WorkingGraphSources, enabled = false): WorkingGraph {
    // One state per mask source: what the filters keep, and what is visible now. While no window is
    // in force both read the same copies, so they hold the same view.
    const states: { kept: State | null; visible: State | null } = { kept: null, visible: null };
    let whole: WorkingView | null = null;

    /**
     * A source's current state, packed again only when the snapshot or a mask copy changed.
     * @param which - The filters alone, or what is visible now.
     * @returns The state.
     */
    const current = (which: "kept" | "visible"): State => {
        const masks = which === "kept" ? sources.kept : sources.masks;
        const graph = sources.snapshot();
        const nodeMask = masks.nodes();
        const edgeMask = masks.edges();
        const state = states[which];
        if (state?.graph === graph && state.nodeKey === nodeMask && state.edgeKey === edgeMask) {
            return state;
        }

        // The other source's state, when it reads the same copies: its view is this one.
        const other = states[which === "kept" ? "visible" : "kept"];
        if (other?.graph === graph && other.nodeKey === nodeMask && other.edgeKey === edgeMask) {
            states[which] = other;
            return other;
        }

        const nodes = nodeMask.pack(graph.nodeCount);
        const edges = edgeMask.pack(graph.edgeCount);
        // New copies of the same membership (a window coming into force swaps the filter's copies
        // for its own) keep the view: nothing a reader reads changed.
        if (state?.graph === graph && sameWords(state.nodes, nodes) && sameWords(state.edges, edges)) {
            state.nodeKey = nodeMask;
            state.edgeKey = edgeMask;
            return state;
        }

        const next: State = {
            graph,
            nodeKey: nodeMask,
            edgeKey: edgeMask,
            nodes,
            edges,
            nodeCount: nodeMask.size,
            edgeCount: edgeMask.size,
            view: null,
        };
        states[which] = next;
        return next;
    };

    /**
     * The whole graph's view, kept per snapshot.
     * @param graph - The snapshot.
     * @returns The view.
     */
    const wholeOf = (graph: WholeSnapshot): WorkingView => {
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
        const { snapshot, edgeRemap } = input;
        // A filter that hides only edges keeps every node's row, which the derivation spells as no
        // map; the view spells it out, so a reader never takes "no map" for "nothing shown".
        const nodeOrigin = input.nodeOrigin ?? identityRows(at.graph.nodeCount);
        at.view = {
            graph: at.graph,
            snapshot: asWorkingSnapshot(snapshot),
            whole: false,
            nodes: at.nodes,
            edges: at.edges,
            nodeCount: at.nodeCount,
            edgeCount: at.edgeCount,
            nodeOrigin,
            nodeRows: inverseOf(nodeOrigin, at.graph.nodeCount),
            edgeOrigin: edgeRemap === null ? identityRows(snapshot.edgeCount) : originOf(edgeRemap, snapshot.edgeCount),
            edgeRows: edgeRemap ?? identityRows(at.graph.edgeCount),
            input,
        };

        return at.view;
    };

    /**
     * A state's view, or the whole graph's when it hides nothing.
     * @param at - The state.
     * @returns The view.
     */
    const viewOf = (at: State): WorkingView =>
        at.nodeCount === at.graph.nodeCount && at.edgeCount === at.graph.edgeCount ? wholeOf(at.graph) : built(at);

    /**
     * A state's derived input, when a run's membership is exactly that state's.
     * @param at - The state.
     * @param membership - The run's membership.
     * @param declared - The snapshot the run declared.
     * @returns The input, or undefined.
     */
    const sharedOf = (at: State, membership: InputMembership, declared: GraphSnapshot): DerivedInput | undefined =>
        at.graph !== declared ||
        (at.nodeCount === at.graph.nodeCount && at.edgeCount === at.graph.edgeCount) ||
        !sameWords(at.nodes, membership.nodes) ||
        !sameWords(at.edges, membership.edges)
            ? undefined
            : built(at).input;

    const working: WorkingGraph = {
        enabled,
        view(scope?: WorkingScope): WorkingView {
            if (scope === "graph" || (scope === undefined && !working.enabled)) {
                return wholeOf(sources.snapshot());
            }

            return viewOf(current(scope === "visible" ? "visible" : "kept"));
        },
        filtered(): WorkingView {
            return viewOf(current("kept"));
        },
        shared(membership: InputMembership, declared: GraphSnapshot): DerivedInput | undefined {
            if (!working.enabled || membership.store !== sources.store) {
                return undefined;
            }

            return (
                sharedOf(current("kept"), membership, declared) ?? sharedOf(current("visible"), membership, declared)
            );
        },
    };

    return working;
}
