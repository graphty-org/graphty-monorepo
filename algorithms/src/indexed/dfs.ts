import { type AdjacencyView, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { type ArcOrderOption, checkArcOrder, checkStart, checkTarget, treePaths } from "./bfs.js";
import { IntUnionFind } from "./structures/union-find.js";

/** Result of the index-based DFS. @public */
export interface DfsResult {
    /** The visited nodes in pre-order or post-order (see `DfsOptions.order`); length `visitedCount`. */
    readonly order: U32;
    /** DFS-tree parent of every node, INVALID_INDEX for the start node and for unvisited nodes. */
    readonly parent: U32;
    /** DFS-tree depth of every node, INVALID_INDEX for unvisited nodes. */
    readonly depth: U32;
    /** How many nodes were visited. */
    readonly visitedCount: number;
    /**
     * The ARC each node was discovered through (`colIdx[predArc[v]] === v`), INVALID_INDEX for the start node and
     * for unvisited nodes. `arcToEdge[predArc[v]]` is the tree edge, the exact one among parallel edges.
     */
    readonly predArc: U32;
    /**
     * Node indices along the DFS tree from the start to `target` inclusive; empty when `target` was not visited.
     * @param target - The node index to walk back from
     */
    pathTo(target: number): U32;
    /**
     * LOGICAL EDGE indices of the tree edges along that path, one fewer than `pathTo`; empty when `target` was not
     * visited.
     * @param target - The node index to walk back from
     */
    pathEdges(target: number): U32;
}

/** Options of the index-based DFS. @public */
export interface DfsOptions extends ArcOrderOption {
    /**
     * Stop the whole walk as soon as this node index is visited. Pre-order only: a post-order walk
     * always runs to the end, since a node's post-order place is known only once its subtree is done.
     * @throws RangeError when it is not a node index
     */
    readonly target?: number | undefined;
    /** "pre" (default) lists a node when it is first reached, "post" when its subtree is finished. */
    readonly order?: "pre" | "post" | undefined;
}

const NEW = 0;
const OPEN = 1;
const DONE = 2;

/** The state one or more DFS walks share: a node visited by one walk is skipped by the next. */
interface Walk {
    readonly state: Uint8Array;
    readonly parent: U32;
    readonly predArc: U32;
    readonly depth: U32;
    readonly cursor: U32;
    readonly stack: U32;
    readonly pre: U32;
    readonly post: U32;
    preCount: number;
    postCount: number;
    /** Whether any arc reached a node whose subtree was still open: a directed cycle. */
    backArc: boolean;
}

function newWalk(nodeCount: number): Walk {
    return {
        state: new Uint8Array(nodeCount),
        parent: new Uint32Array(nodeCount).fill(INVALID_INDEX),
        predArc: new Uint32Array(nodeCount).fill(INVALID_INDEX),
        depth: new Uint32Array(nodeCount).fill(INVALID_INDEX),
        cursor: new Uint32Array(nodeCount),
        stack: new Uint32Array(nodeCount),
        pre: new Uint32Array(nodeCount),
        post: new Uint32Array(nodeCount),
        preCount: 0,
        postCount: 0,
        backArc: false,
    };
}

/**
 * Iterative DFS from `root` with an explicit arc cursor per node, so the walk tries neighbours in
 * row order (or `arcOrder`) exactly as a recursive DFS would and never overflows the call stack.
 * @param g - The adjacency to walk
 * @param root - An unvisited node index
 * @param w - The shared walk state
 * @param target - Stop the walk when this node is reached; INVALID_INDEX for none
 * @param arcOrder - The order to try each row's arcs in; null for row order
 */
function walkFrom(g: AdjacencyView, root: number, w: Walk, target: number, arcOrder: U32 | null): void {
    const { rowPtr, colIdx } = g;
    const { state, parent, predArc, depth, cursor, stack, pre, post } = w;
    let top = 0;
    state[root] = OPEN;
    depth[root] = 0;
    cursor[root] = rowPtr[root];
    pre[w.preCount++] = root;
    stack[top++] = root;
    if (root === target) {
        return;
    }
    while (top > 0) {
        const u = stack[top - 1];
        if (cursor[u] < rowPtr[u + 1]) {
            const i = cursor[u]++;
            const a = arcOrder === null ? i : arcOrder[i];
            const v = colIdx[a];
            if (state[v] === NEW) {
                state[v] = OPEN;
                parent[v] = u;
                predArc[v] = a;
                depth[v] = depth[u] + 1;
                cursor[v] = rowPtr[v];
                pre[w.preCount++] = v;
                stack[top++] = v;
                if (v === target) {
                    return;
                }
            } else if (state[v] === OPEN) {
                w.backArc = true;
            }
        } else {
            state[u] = DONE;
            post[w.postCount++] = u;
            top--;
        }
    }
}

/**
 * Depth-first search over out-neighbours, trying them in row (ascending index) order unless
 * `options.arcOrder` gives another. Takes any
 * `AdjacencyView`, so `s.reverse()` walks in-neighbours.
 * @param g - The adjacency to traverse
 * @param start - The node index to start from
 * @param options - Traversal options
 * @returns The visit order, the DFS tree as a parent array, the tree depths and the visited count
 * @public
 */
export function depthFirstSearch(g: AdjacencyView, start: number, options: DfsOptions = {}): DfsResult {
    checkStart(g, start);
    const arcOrder = checkArcOrder(g, options.arcOrder);
    const target = checkTarget(g, options.target);
    const w = newWalk(g.nodeCount);
    const postOrder = options.order === "post";
    walkFrom(g, start, w, postOrder ? INVALID_INDEX : target, arcOrder);
    const order = postOrder ? w.post.subarray(0, w.postCount) : w.pre.subarray(0, w.preCount);
    return {
        order,
        parent: w.parent,
        depth: w.depth,
        visitedCount: w.preCount,
        predArc: w.predArc,
        ...treePaths(g, start, w.predArc),
    };
}

/**
 * Whether the graph has a cycle. Directed: a DFS back arc. Undirected: an edge closing a loop in a
 * union-find forest. A self-loop is a cycle; a parallel pair is not -- the graph is read as simple,
 * the adjacent-skip idiom of graph-format design section 3.5.
 * @param g - The adjacency to test
 * @returns True when a cycle exists
 * @public
 */
export function hasCycle(g: AdjacencyView): boolean {
    const { nodeCount, rowPtr, colIdx } = g;
    if (g.directed) {
        const w = newWalk(nodeCount);
        for (let r = 0; r < nodeCount && !w.backArc; r++) {
            if (w.state[r] === NEW) {
                walkFrom(g, r, w, INVALID_INDEX, null);
            }
        }
        return w.backArc;
    }
    const uf = new IntUnionFind(nodeCount);
    for (let u = 0; u < nodeCount; u++) {
        const end = rowPtr[u + 1];
        for (let a = rowPtr[u]; a < end; a++) {
            const v = colIdx[a];
            if (v === u) {
                return true;
            }
            // Each undirected edge once (v > u), each parallel pair once (rows are sorted).
            if (v > u && (a === rowPtr[u] || colIdx[a - 1] !== v) && !uf.union(u, v)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Topological order of a directed graph: reverse DFS post-order, roots taken in index order and
 * neighbours in row order unless `options.arcOrder` gives another.
 * @param g - A directed adjacency
 * @param options - The neighbour order
 * @returns The node indices in topological order, or null when the graph has a cycle
 * @throws Error when the graph is undirected
 * @public
 */
export function topologicalSort(g: AdjacencyView, options: ArcOrderOption = {}): U32 | null {
    if (!g.directed) {
        throw withCode(new Error("Topological sort requires a directed graph"), "E_NEEDS_DIRECTED");
    }
    const arcOrder = checkArcOrder(g, options.arcOrder);
    const w = newWalk(g.nodeCount);
    for (let r = 0; r < g.nodeCount && !w.backArc; r++) {
        if (w.state[r] === NEW) {
            walkFrom(g, r, w, INVALID_INDEX, arcOrder);
        }
    }
    return w.backArc ? null : w.post.reverse();
}
