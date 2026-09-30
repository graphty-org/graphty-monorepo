import {
    type AdjacencyView,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskTest,
    type NodeMask,
    type U32,
} from "@graphty/graph-format";

import { isBipartite } from "./bipartite.js";

/** Options of {@link maximumBipartiteMatching} and {@link greedyBipartiteMatching}. @public */
export interface BipartiteMatchingOptions {
    /**
     * The left side. Given together with `right`, the two sides are used as they are and the graph
     * is not tested for bipartiteness; a node on neither side is never matched. When either is
     * missing both come from `isBipartite`: its first side is the left one.
     */
    readonly left?: NodeMask | undefined;
    /** The right side; see `left`. */
    readonly right?: NodeMask | undefined;
    /**
     * Which arcs of a directed snapshot join a left node to a right one. "both" (default) ignores
     * direction, as a matching does. "out" follows out-arcs of left nodes only, as the legacy
     * functions do, and is also passed to `isBipartite` when the sides are inferred. Ignored on an
     * undirected snapshot.
     */
    readonly arcs?: "both" | "out" | undefined;
}

/** Result of the index-based bipartite matchings. @public */
export interface BipartiteMatchingResult {
    /**
     * The right partner of every matched left node; INVALID_INDEX for an unmatched left node and
     * for every node that is not on the left side.
     */
    readonly matching: U32;
    /** The number of matched pairs. */
    readonly size: number;
}

interface Sides {
    readonly left: NodeMask;
    readonly right: NodeMask;
    readonly views: readonly AdjacencyView[];
}

function resolveSides(s: GraphSnapshot, options: BipartiteMatchingOptions): Sides {
    const views: AdjacencyView[] = s.directed && options.arcs !== "out" ? [s, s.reverse()] : [s];
    if (options.left !== undefined && options.right !== undefined) {
        return { left: options.left, right: options.right, views };
    }
    const { sides } = isBipartite(s, { arcs: options.arcs });
    if (sides === null) {
        throw new Error("Graph is not bipartite");
    }
    const left = makeMask(s.nodeCount);
    for (let w = 0; w < left.length; w++) {
        left[w] = ~sides[w];
    }
    // Clear the padding bits past nodeCount so the mask stays well formed.
    const tail = s.nodeCount % 32;
    if (tail !== 0) {
        left[left.length - 1] &= (1 << tail) - 1;
    }
    return { left, right: sides, views };
}

/**
 * Maximum matching of a bipartite graph by augmenting paths (Kuhn's algorithm, O(V E)): every left
 * node in index order searches depth-first, iteratively, for an augmenting path. Parallel arcs and
 * arc direction (by default) make no difference to the matching size.
 * @param s - The snapshot
 * @param options - The two sides, and which arcs to follow on a directed snapshot
 * @returns The partner of every matched left node and the number of pairs
 * @throws Error when the sides are inferred and the graph is not bipartite
 * @public
 */
export function maximumBipartiteMatching(
    s: GraphSnapshot,
    options: BipartiteMatchingOptions = {},
): BipartiteMatchingResult {
    // ponytail: Kuhn is O(V E) like the legacy function; Hopcroft-Karp (O(sqrt(V) E)) if a caller
    // needs large graphs with long augmenting paths.
    const { left, right, views } = resolveSides(s, options);
    const { nodeCount } = s;
    const matching = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const mateOfRight = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const seen = new Uint32Array(nodeCount);
    // The DFS stack of left nodes; view and arc cursors per stacked node; the right node taken to
    // descend from each stacked node.
    const stack = new Uint32Array(nodeCount);
    const viewAt = new Uint8Array(nodeCount);
    const arcAt = new Uint32Array(nodeCount);
    const via = new Uint32Array(nodeCount);
    let size = 0;
    for (let root = 0; root < nodeCount; root++) {
        if (!maskTest(left, root)) {
            continue;
        }
        const stamp = root + 1;
        let top = 0;
        stack[top++] = root;
        viewAt[root] = 0;
        arcAt[root] = 0;
        let free = INVALID_INDEX;
        search: while (top > 0) {
            const x = stack[top - 1];
            for (; viewAt[x] < views.length; viewAt[x]++) {
                const { rowPtr, colIdx } = views[viewAt[x]];
                const end = rowPtr[x + 1];
                // A cursor of 0 means "not started in this view".
                if (arcAt[x] < rowPtr[x]) {
                    arcAt[x] = rowPtr[x];
                }
                while (arcAt[x] < end) {
                    const v = colIdx[arcAt[x]++];
                    if (seen[v] === stamp || !maskTest(right, v)) {
                        continue;
                    }
                    seen[v] = stamp;
                    const next = mateOfRight[v];
                    if (next === INVALID_INDEX) {
                        free = v;
                        break search;
                    }
                    via[x] = v;
                    stack[top++] = next;
                    viewAt[next] = 0;
                    arcAt[next] = 0;
                    continue search;
                }
                arcAt[x] = 0;
            }
            top--;
        }
        if (free === INVALID_INDEX) {
            continue;
        }
        // Flip the path: the top node takes the free right node, every node below takes the right
        // node it descended through.
        for (let k = top - 1; k >= 0; k--) {
            const x = stack[k];
            const v = k === top - 1 ? free : via[x];
            matching[x] = v;
            mateOfRight[v] = x;
        }
        size++;
    }
    return { matching, size };
}

/**
 * Greedy maximal bipartite matching: every left node in index order takes its first unmatched
 * right neighbour in row order (the lowest index; out-arcs before in-arcs). The size depends on
 * those orders, so it can differ from the legacy function, which visits left nodes in its
 * colouring BFS order and neighbours in insertion order; it is at least half the maximum.
 * @param s - The snapshot
 * @param options - The two sides, and which arcs to follow on a directed snapshot
 * @returns The partner of every matched left node and the number of pairs
 * @throws Error when the sides are inferred and the graph is not bipartite
 * @public
 */
export function greedyBipartiteMatching(
    s: GraphSnapshot,
    options: BipartiteMatchingOptions = {},
): BipartiteMatchingResult {
    const { left, right, views } = resolveSides(s, options);
    const { nodeCount } = s;
    const matching = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const taken = new Uint8Array(nodeCount);
    let size = 0;
    for (let u = 0; u < nodeCount; u++) {
        if (!maskTest(left, u)) {
            continue;
        }
        pick: for (const { rowPtr, colIdx } of views) {
            const end = rowPtr[u + 1];
            for (let a = rowPtr[u]; a < end; a++) {
                const v = colIdx[a];
                if (taken[v] === 0 && maskTest(right, v)) {
                    taken[v] = 1;
                    matching[u] = v;
                    size++;
                    break pick;
                }
            }
        }
    }
    return { matching, size };
}
