import type { GraphSnapshot, U32 } from "@graphty/graph-format";

import { withCode } from "../errors.js";

/** A set of nodes, as ascending node indices. @public */
export interface NodeSetResult {
    /** The nodes in the set, ascending. */
    readonly nodes: U32;
}

/** A set of edges, as ascending edge indices. @public */
export interface EdgeSetResult {
    /** The edges in the set, ascending. */
    readonly edges: U32;
}

/** What one Tarjan pass finds: a flag per node and per edge. */
interface Cuts {
    readonly cutNode: Uint8Array;
    readonly bridge: Uint8Array;
}

const NONE = 0xffffffff;

/** The working state of one Tarjan pass over a snapshot. */
class TarjanWalk {
    readonly disc: Uint32Array;
    readonly low: Uint32Array;
    /** The edge each node was reached by, NONE for a root. */
    readonly viaEdge: Uint32Array;
    readonly parent: Uint32Array;
    /** The next arc each node on the stack will look at. */
    readonly next: Uint32Array;
    readonly stack: Uint32Array;
    readonly cutNode: Uint8Array;
    readonly bridge: Uint8Array;
    time = 0;

    constructor(private readonly s: GraphSnapshot) {
        const n = s.nodeCount;
        this.disc = new Uint32Array(n).fill(NONE);
        this.low = new Uint32Array(n);
        this.viaEdge = new Uint32Array(n).fill(NONE);
        this.parent = new Uint32Array(n).fill(NONE);
        this.next = new Uint32Array(n);
        this.stack = new Uint32Array(n);
        this.cutNode = new Uint8Array(n);
        this.bridge = new Uint8Array(s.edgeCount);
    }

    /**
     * Number a node and give it its first arc.
     * @param v - The node
     */
    private enter(v: number): void {
        this.disc[v] = this.low[v] = this.time++;
        this.next[v] = this.s.rowPtr[v];
    }

    /**
     * Hand a finished node's low value up to its parent, flagging the edge between them as a bridge
     * and the parent as a cut point when nothing below climbs past them.
     * @param u - The finished node
     * @param root - The root of the current tree, which is a cut point by its child count instead
     */
    private finish(u: number, root: number): void {
        const p = this.parent[u];
        if (p === NONE) {
            return;
        }
        const { low, disc } = this;
        low[p] = Math.min(low[p], low[u]);
        if (low[u] > disc[p]) {
            this.bridge[this.viaEdge[u]] = 1;
        }
        if (p !== root && low[u] >= disc[p]) {
            this.cutNode[p] = 1;
        }
    }

    /**
     * Walk the tree from one unvisited root, iteratively so a long path cannot overflow the stack.
     * @param root - The root
     */
    walk(root: number): void {
        const { rowPtr, colIdx, arcToEdge } = this.s;
        const { disc, low, next, stack, viaEdge } = this;
        let rootChildren = 0;
        let top = 0;
        stack[0] = root;
        this.enter(root);
        while (top >= 0) {
            const u = stack[top];
            if (next[u] === rowPtr[u + 1]) {
                top--;
                this.finish(u, root);
                continue;
            }
            const a = next[u]++;
            const v = colIdx[a];
            const e = arcToEdge[a];
            if (e === viaEdge[u]) {
                continue;
            }
            if (disc[v] !== NONE) {
                low[u] = Math.min(low[u], disc[v]);
                continue;
            }
            this.parent[v] = u;
            viaEdge[v] = e;
            this.enter(v);
            stack[++top] = v;
            rootChildren += u === root ? 1 : 0;
        }
        if (rootChildren > 1) {
            this.cutNode[root] = 1;
        }
    }
}

/**
 * One Tarjan depth-first pass over an undirected snapshot: O(nodes + arcs).
 *
 * The walk skips the arc it arrived by by its EDGE, not by its parent node, so a second edge between
 * the same two nodes is a back edge: two parallel edges are never bridges. A self-loop changes
 * nothing.
 * @param s - An undirected snapshot
 * @param name - The algorithm's name, for the direction error
 * @returns The flags
 */
function tarjan(s: GraphSnapshot, name: string): Cuts {
    if (s.directed) {
        throw withCode(
            new Error(`${name} requires an undirected graph. Pass s.toUndirected().snapshot.`),
            "E_NEEDS_UNDIRECTED",
        );
    }
    const walk = new TarjanWalk(s);
    for (let root = 0; root < s.nodeCount; root++) {
        if (walk.disc[root] === NONE) {
            walk.walk(root);
        }
    }
    return { cutNode: walk.cutNode, bridge: walk.bridge };
}

/**
 * The indices whose flag is set, ascending.
 * @param flags - One flag per index
 * @returns The set indices
 */
function flagged(flags: Uint8Array): U32 {
    let count = 0;
    for (const f of flags) {
        count += f;
    }
    const out = new Uint32Array(count);
    let i = 0;
    for (let k = 0; k < flags.length; k++) {
        if (flags[k] === 1) {
            out[i++] = k;
        }
    }
    return out;
}

/**
 * Articulation points (cut vertices): the nodes whose removal, with their edges, splits the piece of
 * the graph they are in into more pieces. Tarjan's linear-time depth-first search, O(nodes + arcs).
 * Matches networkx's `articulation_points`.
 * @param s - An undirected snapshot
 * @returns The articulation points, ascending
 * @public
 */
export function articulationPoints(s: GraphSnapshot): NodeSetResult {
    return { nodes: flagged(tarjan(s, "Articulation points").cutNode) };
}

/**
 * Bridges (cut edges): the edges whose removal splits the piece of the graph they are in in two.
 * Tarjan's linear-time depth-first search, O(nodes + arcs). An edge with a parallel twin is never a
 * bridge, and neither is a self-loop. Matches networkx's `bridges`.
 * @param s - An undirected snapshot
 * @returns The bridges, as ascending edge indices
 * @public
 */
export function bridges(s: GraphSnapshot): EdgeSetResult {
    return { edges: flagged(tarjan(s, "Bridges").bridge) };
}
