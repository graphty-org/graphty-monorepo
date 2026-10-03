import {
    type AdjacencyView,
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeRef,
    resolveNode,
    type ReverseView,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { walkPredArcs, walkPredEdges } from "./dijkstra.js";

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
    /**
     * The ARC each node was discovered through (`colIdx[predArc[v]] === v`), INVALID_INDEX for the start node and
     * for unvisited nodes. `arcToEdge[predArc[v]]` is the tree edge, the exact one among parallel edges.
     */
    readonly predArc: U32;
    /**
     * Node indices along the tree from the start to `target` inclusive; empty when `target` was not visited.
     * @param target - The node to walk back from: its index, or `{ id }`
     */
    pathTo(target: NodeRef): U32;
    /**
     * LOGICAL EDGE indices of the tree edges along that path, one fewer than `pathTo`; empty when `target` was not
     * visited.
     * @param target - The node to walk back from: its index, or `{ id }`
     */
    pathEdges(target: NodeRef): U32;
}

/**
 * The path accessors of a traversal tree recorded as predecessor arcs.
 * @param g - The adjacency the traversal ran on
 * @param start - The traversal's start node
 * @param predArc - The arc each node was discovered through
 * @returns `pathTo` and `pathEdges`
 */
export function treePaths(
    g: AdjacencyView,
    start: number,
    predArc: U32,
): { pathTo(target: NodeRef): U32; pathEdges(target: NodeRef): U32 } {
    return {
        pathTo: (target) => walkPredArcs(g, predArc, start, target),
        pathEdges: (target) => walkPredEdges(g, predArc, start, target),
    };
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
     * Stop when this node (an index, or `{ id }`) is taken off the queue, before its neighbours are
     * expanded. Every node discovered by then stays in `order`; the target's own position in
     * `order` ends the prefix of nodes that were expanded.
     * @throws RangeError when it is not a node index
     */
    readonly target?: NodeRef | undefined;
}

/**
 * Resolve and check a start (or target) node: an index, or `{ id }` looked up in the snapshot's id map.
 * @param g - The adjacency
 * @param start - The node index, or `{ id }`
 * @param what - What the node is, for the error message
 * @returns The node index
 * @throws RangeError when `start` is not a node index of `g`; GraphFormatError E_UNKNOWN_NODE for an unknown id
 */
export function checkStart(g: AdjacencyView, start: NodeRef, what = "start"): number {
    const index = resolveNode(g, start);
    if (!Number.isInteger(index) || index < 0 || index >= g.nodeCount) {
        throw withCode(
            new RangeError(`${what} node index ${String(index)} is out of range for ${String(g.nodeCount)} nodes`),
            "E_BAD_NODE",
        );
    }
    return index;
}

/**
 * Check an optional target node index.
 * @param g - The adjacency
 * @param target - The option, or undefined
 * @returns The target, or INVALID_INDEX for none
 * @throws RangeError when `target` is set and is not a node index of `g`
 */
export function checkTarget(g: AdjacencyView, target: NodeRef | undefined): number {
    if (target === undefined) {
        return INVALID_INDEX;
    }
    return checkStart(g, target, "target");
}

/**
 * Check an `arcOrder` option: `arcCount` entries, and every row's slice a permutation of that row's
 * arcs.
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
        throw withCode(
            new RangeError(`arcOrder has ${String(arcOrder.length)} entries, expected ${String(g.arcCount)}`),
            "E_BAD_OPTION",
        );
    }
    const seen = new Uint8Array(arcOrder.length);
    for (let u = 0; u < nodeCount; u++) {
        const begin = rowPtr[u];
        const end = rowPtr[u + 1];
        for (let a = begin; a < end; a++) {
            if (arcOrder[a] < begin || arcOrder[a] >= end) {
                throw withCode(
                    new RangeError(
                        `arcOrder[${String(a)}] = ${String(arcOrder[a])} is not an arc of node ${String(u)}`,
                    ),
                    "E_BAD_OPTION",
                );
            }
            if (seen[arcOrder[a]] === 1) {
                throw withCode(
                    new RangeError(
                        `arcOrder[${String(a)}] = ${String(arcOrder[a])} repeats an arc of node ${String(u)}`,
                    ),
                    "E_BAD_OPTION",
                );
            }
            seen[arcOrder[a]] = 1;
        }
    }
    return arcOrder;
}

/**
 * Breadth-first search over out-neighbours. Takes any `AdjacencyView`, so `s.reverse()` gives an
 * in-neighbour BFS with no extra code.
 * @param g - The adjacency to traverse
 * @param startNode - The node to start from: its index, or `{ id }`
 * @param options - Traversal options
 * @returns The visit order, the parent array, the depth array and the visited count
 * @public
 */
export function breadthFirstSearch(g: AdjacencyView, startNode: NodeRef, options: BfsOptions = {}): BfsResult {
    const start = checkStart(g, startNode);
    const { nodeCount, rowPtr, colIdx } = g;
    const arcOrder = checkArcOrder(g, options.arcOrder);
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const depth = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const order = new Uint32Array(nodeCount);
    const maxDepth = options.maxDepth ?? INVALID_INDEX;
    const target = checkTarget(g, options.target);
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
        for (let i = rowPtr[u]; i < end; i++) {
            const a = arcOrder === null ? i : arcOrder[i];
            const v = colIdx[a];
            if (depth[v] === INVALID_INDEX) {
                depth[v] = d + 1;
                parent[v] = u;
                predArc[v] = a;
                order[tail++] = v;
            }
        }
    }
    return {
        order: order.subarray(0, tail),
        parent,
        depth,
        visitedCount: tail,
        predArc,
        ...treePaths(g, start, predArc),
    };
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
 * On an undirected snapshot, the arc `u -> v` of the same logical edge as arc `a` (`v -> u`): the row of `u` is
 * sorted by neighbour, so a binary search finds `v`'s run of parallel arcs and the one carrying the same edge.
 * @param s - An undirected snapshot
 * @param a - An arc out of `v`
 * @param u - The arc's target
 * @param v - The arc's source
 * @returns The twin arc, out of `u`
 */
function twinArc(s: GraphSnapshot, a: number, u: number, v: number): number {
    const { rowPtr, colIdx, arcToEdge } = s;
    let lo = rowPtr[u];
    let hi = rowPtr[u + 1];
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (colIdx[mid] < v) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    const end = rowPtr[u + 1];
    while (lo < end && colIdx[lo] === v && arcToEdge[lo] !== arcToEdge[a]) {
        lo++;
    }
    return lo;
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
 * @param sourceNode - The node to start from: its index, or `{ id }`
 * @param options - The switching thresholds
 * @returns The visit order, the parent array, the depth array and the visited count
 * @public
 */
export function directionOptimizedBfs(
    s: GraphSnapshot,
    sourceNode: NodeRef,
    options: DirectionOptimizedBfsOptions = {},
): BfsResult {
    const source = checkStart(s, sourceNode);
    const { nodeCount, rowPtr, colIdx } = s;
    const alpha = options.alpha ?? 15;
    const beta = options.beta ?? 18;
    let reverse: ReverseView | null = null;
    const parent = new Uint32Array(nodeCount).fill(INVALID_INDEX);
    const predArc = new Uint32Array(nodeCount).fill(INVALID_INDEX);
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
                        predArc[v] = s.directed ? reverse.fwdArc[a] : twinArc(s, a, u, v);
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
                        predArc[v] = a;
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
    return {
        order: order.subarray(0, tail),
        parent,
        depth,
        visitedCount: tail,
        predArc,
        ...treePaths(s, source, predArc),
    };
}
