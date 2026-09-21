import { type AdjacencyView, INVALID_INDEX, type U32 } from "@graphty/graph-format";

/** Result of the index-based BFS (graph-format design 14.2 Port 1). @public */
export interface BfsResult {
    /** Visit order, one entry per visited node; a subarray of length `visitedCount`. */
    readonly order: U32;
    /** Parent of every node, INVALID_INDEX for the start node and for unvisited nodes. */
    readonly parent: U32;
    /** Hop depth of every node, INVALID_INDEX for unvisited nodes. */
    readonly depth: U32;
    /** How many nodes were visited. */
    readonly visitedCount: number;
}

/** Options of the index-based BFS. @public */
export interface BfsOptions {
    /** Stop expanding at this depth; unbounded when omitted. */
    readonly maxDepth?: number | undefined;
}

/**
 * Breadth-first search over out-neighbours. Takes any `AdjacencyView`, so `s.reverse()` gives an
 * in-neighbour BFS with no extra code.
 * @param g - The adjacency to traverse
 * @param start - The node index to start from
 * @param options - Traversal options
 * @returns The visit order, the parent array, the depth array and the visited count
 * @public
 */
export function breadthFirstSearch(g: AdjacencyView, start: number, options: BfsOptions = {}): BfsResult {
    const { nodeCount, rowPtr, colIdx } = g;
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const order = new Uint32Array(nodeCount);
    const maxDepth = options.maxDepth ?? INVALID_INDEX;
    let head = 0;
    let tail = 0;
    order[tail++] = start;
    depth[start] = 0;
    while (head < tail) {
        const u = order[head++];
        const d = depth[u];
        if (d >= maxDepth) {
            continue;
        }
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[a];
            if (depth[v] === INVALID_INDEX) {
                depth[v] = d + 1;
                parent[v] = u;
                order[tail++] = v;
            }
        }
    }
    return { order: order.subarray(0, tail), parent, depth, visitedCount: tail };
}
