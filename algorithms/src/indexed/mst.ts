import type { GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

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
