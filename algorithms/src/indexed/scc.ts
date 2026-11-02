import {
    type AdjacencyView,
    type DerivedGraph,
    type GraphSnapshot,
    INVALID_INDEX,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { type ArcOrderOption, checkArcOrder } from "./bfs.js";
import { type LabelResult, withGroups } from "./components.js";

/** Result of {@link condensation}. @public */
export interface CondensationResult {
    /** The strongly connected components, labelled in Tarjan completion order. */
    readonly components: LabelResult;
    /**
     * The condensed DAG from `contract(components.labels)`: node `c` is component `c`, one edge per
     * connected ordered pair of components, no self-loops. Its weights are those of the first source
     * edge of each pair; its `nodeRemap` equals `components.labels`.
     */
    readonly condensed: DerivedGraph;
}

/**
 * Strongly connected components by an iterative Tarjan: roots in index order, neighbours in row
 * order unless `options.arcOrder` gives another, and component `c` is the `c`-th to complete -- the numbering the legacy
 * `stronglyConnectedComponents` gives its result array. Completion order is a reverse topological
 * order of the condensation.
 * @param g - A directed adjacency
 * @param options - The neighbour order
 * @returns The partition, labels in completion order
 * @throws Error when the graph is undirected
 * @public
 */
export function stronglyConnectedComponents(g: AdjacencyView, options: ArcOrderOption = {}): LabelResult {
    const { labels, count } = tarjan(g, options);
    return withGroups(labels, count);
}

/** The state of one Tarjan walk, built once per call. */
interface TarjanState {
    readonly rowPtr: U32;
    readonly colIdx: U32;
    readonly arcOrder: U32 | null;
    readonly index: Uint32Array;
    readonly low: Uint32Array;
    readonly cursor: Uint32Array;
    readonly onStack: Uint8Array;
    readonly callStack: Uint32Array;
    readonly sccStack: Uint32Array;
    readonly labels: U32;
    readonly popped: U32;
    poppedCount: number;
    next: number;
    count: number;
    sp: number;
    top: number;
}

/**
 * The body of the recursive call before its loop over neighbours.
 * @param st - The run state, updated in place
 * @param u - The node entered
 */
function enter(st: TarjanState, u: number): void {
    st.index[u] = st.next;
    st.low[u] = st.next;
    st.next++;
    st.cursor[u] = st.rowPtr[u];
    st.sccStack[st.sp++] = u;
    st.onStack[u] = 1;
    st.callStack[st.top++] = u;
}

/**
 * Tries the next arc of the stacked node `x`: descends into an unvisited head or lowers `x`'s link.
 * @param st - The run state, updated in place
 * @param x - The stacked node
 */
function tryNextArc(st: TarjanState, x: number): void {
    const { index, low, onStack } = st;
    const a = st.cursor[x]++;
    const v = st.colIdx[st.arcOrder === null ? a : st.arcOrder[a]];
    if (index[v] === INVALID_INDEX) {
        enter(st, v);
    } else if (onStack[v] === 1 && index[v] < low[x]) {
        low[x] = index[v];
    }
}

/**
 * `x` returns: close its component if it is a root, then pass its low link to the caller.
 * @param st - The run state, updated in place
 * @param x - The returning node
 */
function leave(st: TarjanState, x: number): void {
    const { low, index, callStack } = st;
    st.top--;
    if (low[x] === index[x]) {
        let w: number;
        do {
            w = st.sccStack[--st.sp];
            st.onStack[w] = 0;
            st.labels[w] = st.count;
            st.popped[st.poppedCount++] = w;
        } while (w !== x);
        st.count++;
    }
    if (st.top > 0 && low[x] < low[callStack[st.top - 1]]) {
        low[callStack[st.top - 1]] = low[x];
    }
}

/**
 * The Tarjan walk behind {@link stronglyConnectedComponents}, also returning every node in the
 * order it left the component stack. Each component leaves as one run, in label order, its members
 * in reverse discovery order -- the order the legacy `stronglyConnectedComponents` lists them in.
 * @param g - A directed adjacency
 * @param options - The neighbour order
 * @returns The labels, their count and the pop order
 * @throws Error when the graph is undirected
 */
function tarjan(g: AdjacencyView, options: ArcOrderOption = {}): { labels: U32; count: number; popped: U32 } {
    if (!g.directed) {
        throw withCode(
            new Error(
                "Strongly connected components require a directed graph. Use connectedComponents for an undirected one.",
            ),
            "E_NEEDS_DIRECTED",
        );
    }
    const { nodeCount, rowPtr, colIdx } = g;
    const st: TarjanState = {
        rowPtr,
        colIdx,
        arcOrder: checkArcOrder(g, options.arcOrder),
        index: new Uint32Array(nodeCount).fill(INVALID_INDEX),
        low: new Uint32Array(nodeCount),
        cursor: new Uint32Array(nodeCount),
        onStack: new Uint8Array(nodeCount),
        callStack: new Uint32Array(nodeCount),
        sccStack: new Uint32Array(nodeCount),
        labels: new Uint32Array(nodeCount),
        popped: new Uint32Array(nodeCount),
        poppedCount: 0,
        next: 0,
        count: 0,
        sp: 0,
        top: 0,
    };
    for (let r = 0; r < nodeCount; r++) {
        if (st.index[r] !== INVALID_INDEX) {
            continue;
        }
        enter(st, r);
        while (st.top > 0) {
            const x = st.callStack[st.top - 1];
            if (st.cursor[x] < rowPtr[x + 1]) {
                tryNextArc(st, x);
            } else {
                leave(st, x);
            }
        }
    }
    return { labels: st.labels, count: st.count, popped: st.popped };
}

/**
 * The condensation of a directed graph: its strongly connected components, and the DAG with one
 * node per component that `contract()` builds from their labels. The labels already run `0..k-1`,
 * so contract keeps them as block indices and the condensed node numbering is the component
 * numbering.
 * @param s - A directed snapshot
 * @param options - The neighbour order Tarjan tries arcs in, which fixes the component numbering
 * @returns The components and the condensed graph
 * @throws Error when the snapshot is undirected
 * @public
 */
export function condensation(s: GraphSnapshot, options: ArcOrderOption = {}): CondensationResult {
    const components = stronglyConnectedComponents(s, options);
    const condensed = s.contract(components.labels, { selfLoops: "drop", parallel: "merge", weights: "first" });
    return { components, condensed };
}
