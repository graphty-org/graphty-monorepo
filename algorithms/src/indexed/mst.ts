import {
    type GraphSnapshot,
    INVALID_INDEX,
    type NodeRef,
    type NumericVector,
    resolveNode,
    type U32,
} from "@graphty/graph-format";

import { withCode } from "../errors.js";
import { IndexedMinHeap } from "./structures/min-heap.js";
import { IntUnionFind } from "./structures/union-find.js";

/** Options of the index-based MST. @public */
export interface MstOptions {
    /** Per-arc weight override, arcCount long; gathered back to per-edge through `edgeToArc`. */
    readonly weights?: NumericVector | undefined;
}

/** Result of the index-based MST (graph-format design 14.2's result table, line 3745). @public */
export interface MstResult {
    /** Logical edge indices of the spanning forest, in the order they were accepted. */
    readonly edges: U32;
    /** Sum of the accepted edges' weights. */
    readonly totalWeight: number;
}

/**
 * Kruskal's minimum spanning forest over logical edges.
 *
 * The sort is a comparator over an f64 key array, tie-broken by edge index, rather than the
 * design's radix sort on the f32 bit pattern (plan departure DEP-8A-D): the tie-break makes it
 * stable by construction and it has to serve both the f32 arc array and an f64 override.
 * @param s - The snapshot
 * @param o - The optional per-arc weight override
 * @returns The accepted edge indices and their total weight
 * @public
 */
export function kruskalMST(s: GraphSnapshot, o: MstOptions = {}): MstResult {
    const el = s.edgeList();
    const m = s.edgeCount;
    const keys = new Float64Array(m);
    if (o.weights !== undefined) {
        // The override is per ARC; edgeList().arc holds the arc of each edge's declared orientation.
        for (let e = 0; e < m; e++) {
            keys[e] = o.weights[el.arc[e]];
        }
    } else if (el.weights !== null) {
        for (let e = 0; e < m; e++) {
            keys[e] = el.weights[e];
        }
    } else {
        keys.fill(1);
    }
    const order: number[] = new Array<number>(m);
    for (let e = 0; e < m; e++) {
        order[e] = e;
    }
    order.sort((a, b) => keys[a] - keys[b] || a - b);
    const uf = new IntUnionFind(s.nodeCount);
    const accepted = new Uint32Array(Math.max(s.nodeCount - 1, 0));
    let taken = 0;
    let totalWeight = 0;
    for (const e of order) {
        if (uf.union(el.src[e], el.dst[e])) {
            accepted[taken++] = e;
            totalWeight += keys[e];
        }
    }
    return { edges: accepted.subarray(0, taken), totalWeight };
}

/** Options of the index-based Prim. @public */
export interface PrimOptions extends MstOptions {
    /** The node the (first) tree grows from: its index, or `{ id }`; default 0. */
    readonly start?: NodeRef | undefined;
    /**
     * Grow a tree in every component, rooted at `start` and then at each component's lowest node
     * index, instead of throwing on a disconnected graph. Default false, as legacy `primMST`.
     */
    readonly forest?: boolean | undefined;
}

/** Result of the index-based Prim: the MST result plus each node's discovery arc. @public */
export interface PrimResult extends MstResult {
    /** The tree arc that reached each node, pointing at it; INVALID_INDEX for every root. */
    readonly predArc: U32;
}

/**
 * Prim's minimum spanning tree, grown from a start node by always taking the cheapest arc from the
 * tree to a node outside it (an indexed heap keyed per node, so of several parallel edges the
 * cheapest, and of equal ones the lowest-indexed, is the one taken). `edges` lists the logical
 * edges in the order they joined the tree and `totalWeight` sums them in that order, as legacy
 * `primMST` does. The start index is checked: one outside the graph throws a RangeError.
 * @param s - An undirected snapshot
 * @param o - Per-arc weight override, start node and the spanning-forest switch
 * @returns The accepted edges, their total weight and the discovery arc per node
 * @throws Error on a directed snapshot, and on a disconnected one unless `forest` is set
 * @public
 */
export function primMST(s: GraphSnapshot, o: PrimOptions = {}): PrimResult {
    if (s.directed) {
        throw withCode(new Error("Prim's algorithm requires an undirected graph"), "E_NEEDS_UNDIRECTED");
    }
    const { nodeCount: n, rowPtr, colIdx } = s;
    const weights: NumericVector | null = o.weights ?? s.weights;
    const key = new Float64Array(n).fill(Infinity);
    const predArc = new Uint32Array(n).fill(INVALID_INDEX);
    const inTree = new Uint8Array(n);
    const heap = new IndexedMinHeap(n);
    const accepted = new Uint32Array(Math.max(n - 1, 0));
    let taken = 0;
    let totalWeight = 0;
    const grow = (root: number): void => {
        heap.push(root, 0);
        while (!heap.isEmpty()) {
            const u = heap.pop();
            inTree[u] = 1;
            if (predArc[u] !== INVALID_INDEX) {
                accepted[taken++] = s.arcToEdge[predArc[u]];
                totalWeight += key[u];
            }
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                const w = weights === null ? 1 : weights[a];
                if (inTree[v] === 0 && w < key[v]) {
                    key[v] = w;
                    predArc[v] = a;
                    heap.pushOrDecrease(v, w);
                }
            }
        }
    };
    if (n > 0) {
        grow(o.start === undefined ? 0 : resolveNode(s, o.start));
    }
    if (o.forest === true) {
        for (let root = 0; root < n; root++) {
            if (inTree[root] === 0) {
                grow(root);
            }
        }
    } else if (taken < n - 1) {
        throw withCode(new Error("Graph is not connected"), "E_NOT_CONNECTED");
    }
    return { edges: accepted.subarray(0, taken), totalWeight, predArc };
}
