import {
    type AdjacencyView,
    type DerivedGraph,
    type GraphSnapshot,
    INVALID_INDEX,
    type U32,
} from "@graphty/graph-format";

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
        throw new Error(
            "Strongly connected components require a directed graph. Use connectedComponents for an undirected one.",
        );
    }
    const { nodeCount, rowPtr, colIdx } = g;
    const arcOrder = checkArcOrder(g, options.arcOrder);
    const index = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const low = new Uint32Array(nodeCount);
    const cursor = new Uint32Array(nodeCount);
    const onStack = new Uint8Array(nodeCount);
    const callStack = new Uint32Array(nodeCount);
    const sccStack = new Uint32Array(nodeCount);
    const labels = new Uint32Array(nodeCount);
    const popped = new Uint32Array(nodeCount);
    let poppedCount = 0;
    let next = 0;
    let count = 0;
    let sp = 0;
    let top = 0;
    // The body of the recursive call before its loop over neighbours.
    const enter = (u: number): void => {
        index[u] = next;
        low[u] = next;
        next++;
        cursor[u] = rowPtr[u];
        sccStack[sp++] = u;
        onStack[u] = 1;
        callStack[top++] = u;
    };
    for (let r = 0; r < nodeCount; r++) {
        if (index[r] !== INVALID_INDEX) {
            continue;
        }
        enter(r);
        while (top > 0) {
            const x = callStack[top - 1];
            if (cursor[x] < rowPtr[x + 1]) {
                const a = cursor[x]++;
                const v = colIdx[arcOrder === null ? a : arcOrder[a]];
                if (index[v] === INVALID_INDEX) {
                    enter(v);
                } else if (onStack[v] === 1 && index[v] < low[x]) {
                    low[x] = index[v];
                }
                continue;
            }
            // x returns: close its component if it is a root, then pass its low link to the caller.
            top--;
            if (low[x] === index[x]) {
                let w: number;
                do {
                    w = sccStack[--sp];
                    onStack[w] = 0;
                    labels[w] = count;
                    popped[poppedCount++] = w;
                } while (w !== x);
                count++;
            }
            if (top > 0 && low[x] < low[callStack[top - 1]]) {
                low[callStack[top - 1]] = low[x];
            }
        }
    }
    return { labels, count, popped };
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
