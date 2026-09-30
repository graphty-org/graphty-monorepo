import type { F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

/** Result of triangle counting. @public */
export interface TriangleCountResult {
    /** The triangles each node lies in. */
    readonly perNode: U32;
    /** The triangles of the graph, each counted once. */
    readonly total: number;
    /**
     * Each node's local clustering coefficient, `2 T(v) / (d(v) (d(v) - 1))` with `d(v)` its number of
     * distinct neighbours. 0 -- a defined value, not a missing one -- for a node with fewer than two
     * neighbours, so a star gives all zeros.
     */
    readonly coefficient: NumericVector;
    /** The graph's transitivity, `3 x triangles / connected triples`; 0 when there is no connected triple. */
    readonly transitivity: number;
}

/**
 * The simple undirected graph underlying a snapshot: every row sorted, each neighbour once, no
 * self-loop, and both directions of a directed arc.
 * @param s - Any snapshot
 * @returns The rows, as a CSR pair
 */
export function simpleUndirectedRows(s: GraphSnapshot): { rowPtr: U32; colIdx: U32 } {
    const n = s.nodeCount;
    const views = s.directed ? [s, s.reverse()] : [s];
    const rowPtr = new Uint32Array(n + 1);
    // An upper bound; trimmed below.
    const colIdx = new Uint32Array(views.reduce((sum, g) => sum + g.colIdx.length, 0));
    let out = 0;
    for (let u = 0; u < n; u++) {
        rowPtr[u] = out;
        const start = out;
        for (const g of views) {
            for (let a = g.rowPtr[u]; a < g.rowPtr[u + 1]; a++) {
                if (g.colIdx[a] !== u) {
                    colIdx[out++] = g.colIdx[a];
                }
            }
        }
        // Each view's row is sorted; two merged need a sort, then the duplicates go.
        const row = colIdx.subarray(start, out);
        if (views.length > 1) {
            row.sort();
        }
        let kept = start;
        for (let i = start; i < out; i++) {
            if (i === start || colIdx[i] !== colIdx[i - 1]) {
                colIdx[kept++] = colIdx[i];
            }
        }
        out = kept;
    }
    rowPtr[n] = out;
    return { rowPtr: rowPtr as U32, colIdx: colIdx.slice(0, out) as U32 };
}

/**
 * The clustering coefficient and transitivity from per-node triangle counts and the distinct
 * degrees of the simple undirected graph.
 * @param perNode - Triangles per node
 * @param total - Triangles in the graph
 * @param rowPtr - The simple graph's row offsets, whose differences are the distinct degrees
 * @returns The per-node coefficient and the transitivity
 */
export function clusteringFrom(
    perNode: ArrayLike<number>,
    total: number,
    rowPtr: ArrayLike<number>,
): { coefficient: F64; transitivity: number } {
    const n = perNode.length;
    const coefficient = new Float64Array(n);
    let triples = 0;
    for (let v = 0; v < n; v++) {
        const d = rowPtr[v + 1] - rowPtr[v];
        const pairs = (d * (d - 1)) / 2;
        triples += pairs;
        coefficient[v] = pairs > 0 ? perNode[v] / pairs : 0;
    }
    return { coefficient: coefficient as F64, transitivity: triples > 0 ? (3 * total) / triples : 0 };
}

/**
 * Triangle counting, with each node's clustering coefficient and the graph's transitivity, over
 * the simple undirected graph underlying the snapshot: arc directions are ignored, parallel edges
 * count once and self-loops not at all, so a directed snapshot and its undirected twin give the
 * same answer. Each edge is oriented from the lower to the higher node in (degree, index) order and
 * the two oriented rows of every oriented edge are intersected, so each triangle is found exactly
 * once: O(m^1.5).
 * @param s - Any snapshot
 * @returns The per-node and total triangles, the clustering coefficient and the transitivity
 * @public
 */
export function triangleCount(s: GraphSnapshot): TriangleCountResult {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = simpleUndirectedRows(s);
    const above = (u: number, v: number): boolean => {
        const du = rowPtr[u + 1] - rowPtr[u];
        const dv = rowPtr[v + 1] - rowPtr[v];
        return dv > du || (dv === du && v > u);
    };
    // The oriented rows keep the simple rows' order, so they stay sorted by index.
    const upPtr = new Uint32Array(n + 1);
    const up = new Uint32Array(colIdx.length / 2);
    let k = 0;
    for (let u = 0; u < n; u++) {
        upPtr[u] = k;
        for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
            if (above(u, colIdx[a])) {
                up[k++] = colIdx[a];
            }
        }
    }
    upPtr[n] = k;

    const perNode = new Uint32Array(n);
    let total = 0;
    for (let u = 0; u < n; u++) {
        const uEnd = upPtr[u + 1];
        for (let a = upPtr[u]; a < uEnd; a++) {
            const v = up[a];
            let i = upPtr[u];
            let j = upPtr[v];
            const vEnd = upPtr[v + 1];
            while (i < uEnd && j < vEnd) {
                if (up[i] < up[j]) {
                    i++;
                } else if (up[i] > up[j]) {
                    j++;
                } else {
                    perNode[u]++;
                    perNode[v]++;
                    perNode[up[i]]++;
                    total++;
                    i++;
                    j++;
                }
            }
        }
    }
    return { perNode: perNode as U32, total, ...clusteringFrom(perNode, total, rowPtr) };
}
