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
 * Every node's neighbours over `views`, each row in ascending order of the edge that joins them (a
 * counting sort of the arcs by edge, O(n + m)): the order in which the 2.x Graph listed a node's
 * neighbours, its edges' insertion order. Parallel arcs leave repeats, which the searches skip.
 * @param views - The adjacencies to merge
 * @param nodeCount - The number of nodes
 * @param edgeCount - The number of logical edges
 * @returns Row offsets and the neighbours of every row
 */
function edgeOrderedRows(
    views: readonly AdjacencyView[],
    nodeCount: number,
    edgeCount: number,
): { start: U32; nbr: U32 } {
    const start = new Uint32Array(nodeCount + 1);
    const byEdge = new Uint32Array(edgeCount + 1);
    for (const { rowPtr, arcToEdge } of views) {
        for (let u = 0; u < nodeCount; u++) {
            start[u + 1] += rowPtr[u + 1] - rowPtr[u];
        }
        for (const e of arcToEdge) {
            byEdge[e + 1]++;
        }
    }
    for (let u = 0; u < nodeCount; u++) {
        start[u + 1] += start[u];
    }
    for (let e = 0; e < edgeCount; e++) {
        byEdge[e + 1] += byEdge[e];
    }
    // The arcs as (row, target) pairs in edge order, then dealt into their rows in that order.
    const total = start[nodeCount];
    const arcRow = new Uint32Array(total);
    const arcCol = new Uint32Array(total);
    for (const { rowPtr, colIdx, arcToEdge } of views) {
        for (let u = 0; u < nodeCount; u++) {
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const k = byEdge[arcToEdge[a]]++;
                arcRow[k] = u;
                arcCol[k] = colIdx[a];
            }
        }
    }
    const fill = start.slice(0, nodeCount);
    const nbr = new Uint32Array(total);
    for (let k = 0; k < total; k++) {
        nbr[fill[arcRow[k]]++] = arcCol[k];
    }
    return { start, nbr };
}

/**
 * Maximum matching of a bipartite graph by augmenting paths (Kuhn's algorithm, O(V E)).
 *
 * Tie rule: among the equally large matchings it returns the one 2.x returned. Left nodes search
 * in the order a breadth-first walk first reaches them (roots in node order, as `isBipartite`
 * colours), and every node tries its neighbours in the order of the edge that joins them, the
 * earliest added first. The search is depth-first and iterative. Parallel arcs and arc direction
 * (by default) make no difference to the matching size.
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
    // needs large graphs with long augmenting paths -- it would break the 2.x tie rule.
    const { left, right, views } = resolveSides(s, options);
    const { nodeCount } = s;
    const { start, nbr } = edgeOrderedRows(views, nodeCount, s.edgeCount);
    // The breadth-first order the left nodes search in.
    const order = new Uint32Array(nodeCount);
    const reached = new Uint8Array(nodeCount);
    let tail = 0;
    for (let r = 0; r < nodeCount; r++) {
        if (reached[r] === 1) {
            continue;
        }
        reached[r] = 1;
        let head = tail;
        order[tail++] = r;
        while (head < tail) {
            const u = order[head++];
            for (let k = start[u]; k < start[u + 1]; k++) {
                if (reached[nbr[k]] === 0) {
                    reached[nbr[k]] = 1;
                    order[tail++] = nbr[k];
                }
            }
        }
    }
    const matching = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const mateOfRight = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const seen = new Uint32Array(nodeCount);
    // The DFS stack of left nodes; the neighbour cursor per stacked node; the right node taken to
    // descend from each stacked node.
    const stack = new Uint32Array(nodeCount);
    const cursor = new Uint32Array(nodeCount);
    const via = new Uint32Array(nodeCount);
    let size = 0;
    for (let i = 0; i < nodeCount; i++) {
        const root = order[i];
        if (!maskTest(left, root)) {
            continue;
        }
        const stamp = i + 1;
        let top = 0;
        stack[top++] = root;
        cursor[root] = start[root];
        let free = INVALID_INDEX;
        search: while (top > 0) {
            const x = stack[top - 1];
            while (cursor[x] < start[x + 1]) {
                const v = nbr[cursor[x]++];
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
                cursor[next] = start[next];
                continue search;
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
