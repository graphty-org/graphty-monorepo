import { type AdjacencyView, type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

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

/** The neighbour-order option the order-sensitive traversals share. @public */
export interface ArcOrderOption {
    /**
     * A permutation of the arc indices, `arcCount` long, whose slice `[rowPtr[u], rowPtr[u + 1])`
     * lists node `u`'s arcs in the order to try them. The default is row order (ascending neighbour
     * index). A caller that must reproduce a traversal over another neighbour order -- a legacy
     * `Graph` hands out neighbours in insertion order -- passes that order here.
     */
    readonly arcOrder?: U32 | undefined;
}

/** Options of the index-based BFS. @public */
export interface BfsOptions extends ArcOrderOption {
    /** Stop expanding at this depth; unbounded when omitted. */
    readonly maxDepth?: number | undefined;
    /**
     * Stop when this node index is taken off the queue, before its neighbours are expanded. Every
     * node discovered by then stays in `order`; the target's own position in `order` ends the
     * prefix of nodes that were expanded.
     */
    readonly target?: number | undefined;
}

/**
 * Check a start node index.
 * @param g - The adjacency
 * @param start - The start node index
 * @throws RangeError when `start` is not a node index of `g`
 */
export function checkStart(g: AdjacencyView, start: number): void {
    if (!Number.isInteger(start) || start < 0 || start >= g.nodeCount) {
        throw new RangeError(`start node index ${String(start)} is out of range for ${String(g.nodeCount)} nodes`);
    }
}

/**
 * Check an `arcOrder` option: `arcCount` entries, and every entry of a row's slice an arc of that
 * row.
 * @param g - The adjacency
 * @param arcOrder - The option, or undefined
 * @returns The order, or null for row order
 * @throws RangeError when the order does not fit the adjacency
 */
export function checkArcOrder(g: AdjacencyView, arcOrder: U32 | undefined): U32 | null {
    if (arcOrder === undefined) {
        return null;
    }
    const { rowPtr, nodeCount } = g;
    if (arcOrder.length !== g.arcCount) {
        throw new RangeError(`arcOrder has ${String(arcOrder.length)} entries, expected ${String(g.arcCount)}`);
    }
    for (let u = 0; u < nodeCount; u++) {
        const begin = rowPtr[u];
        const end = rowPtr[u + 1];
        for (let a = begin; a < end; a++) {
            if (arcOrder[a] < begin || arcOrder[a] >= end) {
                throw new RangeError(`arcOrder[${String(a)}] = ${String(arcOrder[a])} is not an arc of node ${String(u)}`);
            }
        }
    }
    return arcOrder;
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
    checkStart(g, start);
    const { nodeCount, rowPtr, colIdx } = g;
    const arcOrder = checkArcOrder(g, options.arcOrder);
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const order = new Uint32Array(nodeCount);
    const maxDepth = options.maxDepth ?? INVALID_INDEX;
    const target = options.target ?? INVALID_INDEX;
    let head = 0;
    let tail = 0;
    order[tail++] = start;
    depth[start] = 0;
    while (head < tail) {
        const u = order[head++];
        if (u === target) {
            break;
        }
        const d = depth[u];
        if (d >= maxDepth) {
            continue;
        }
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[arcOrder === null ? a : arcOrder[a]];
            if (depth[v] === INVALID_INDEX) {
                depth[v] = d + 1;
                parent[v] = u;
                order[tail++] = v;
            }
        }
    }
    return { order: order.subarray(0, tail), parent, depth, visitedCount: tail };
}

/** Options of {@link directionOptimizedBfs}. @public */
export interface DirectionOptimizedBfsOptions {
    /**
     * Switch from top-down to bottom-up once the frontier's out-arcs exceed the unvisited nodes'
     * out-arcs divided by `alpha`. Default 15.
     */
    readonly alpha?: number | undefined;
    /** Switch back to top-down once the frontier shrinks below `nodeCount / beta` nodes. Default 18. */
    readonly beta?: number | undefined;
}

/**
 * Direction-optimising breadth-first search (Beamer, Asanovic and Patterson, SC'12): a top-down
 * step expands the frontier's out-arcs, a bottom-up step has every unvisited node look for a
 * frontier node among its in-neighbours over `s.reverse()` (fetched only when a bottom-up step
 * runs), and the search switches between the two
 * by frontier size. Both steps give a node the LOWEST-index frontier node that reaches it as its
 * parent, so the result does not depend on which steps ran: `depth` equals `breadthFirstSearch`'s,
 * and `order` lists the visited nodes level by level, ascending within a level.
 * @param s - The snapshot to traverse
 * @param source - The node index to start from
 * @param options - The switching thresholds
 * @returns The visit order, the parent array, the depth array and the visited count
 * @public
 */
export function directionOptimizedBfs(
    s: GraphSnapshot,
    source: number,
    options: DirectionOptimizedBfsOptions = {},
): BfsResult {
    checkStart(s, source);
    const { nodeCount, rowPtr, colIdx } = s;
    const alpha = options.alpha ?? 15;
    const beta = options.beta ?? 18;
    let reverse: AdjacencyView | null = null;
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    // order[levelStart, tail) is the current frontier, sorted ascending.
    const order = new Uint32Array(nodeCount);
    order[0] = source;
    depth[source] = 0;
    let levelStart = 0;
    let tail = 1;
    let unexploredArcs = s.arcCount - (rowPtr[source + 1] - rowPtr[source]);
    let bottomUp = false;
    for (let d = 0; levelStart < tail; d++) {
        const frontierSize = tail - levelStart;
        if (bottomUp) {
            bottomUp = frontierSize >= nodeCount / beta;
        } else {
            let frontierArcs = 0;
            for (let i = levelStart; i < tail; i++) {
                frontierArcs += rowPtr[order[i] + 1] - rowPtr[order[i]];
            }
            bottomUp = frontierArcs > unexploredArcs / alpha;
        }
        const levelEnd = tail;
        if (bottomUp) {
            reverse ??= s.reverse();
            for (let v = 0; v < nodeCount; v++) {
                if (depth[v] !== INVALID_INDEX) {
                    continue;
                }
                const end = reverse.rowPtr[v + 1];
                for (let a = reverse.rowPtr[v]; a < end; a++) {
                    const u = reverse.colIdx[a];
                    if (depth[u] === d) {
                        parent[v] = u;
                        depth[v] = d + 1;
                        order[tail++] = v;
                        break;
                    }
                }
            }
        } else {
            for (let i = levelStart; i < levelEnd; i++) {
                const u = order[i];
                const end = rowPtr[u + 1];
                for (let a = rowPtr[u]; a < end; a++) {
                    const v = colIdx[a];
                    if (depth[v] === INVALID_INDEX) {
                        parent[v] = u;
                        depth[v] = d + 1;
                        order[tail++] = v;
                    }
                }
            }
            order.subarray(levelEnd, tail).sort();
        }
        for (let i = levelEnd; i < tail; i++) {
            unexploredArcs -= rowPtr[order[i] + 1] - rowPtr[order[i]];
        }
        levelStart = levelEnd;
    }
    return { order: order.subarray(0, tail), parent, depth, visitedCount: tail };
}
