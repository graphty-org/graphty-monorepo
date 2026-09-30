/**
 * The CPU references of the P11 graph build (design 6 row 10, the P11 plan's PD-4). `csrOfArcs` is the counting
 * build `cooToCsr` promises in its order-preserving mode: rows in arc order, so arcs sorted by (source, target) give
 * rows sorted by target. `simpleSymmetricOracle` is the simple symmetric graph written from its definition -- every
 * logical edge in both directions, self-loops dropped, parallel arcs merged by summing their weights in edge order
 * (f32 sums, the order the device's segmented sum uses) -- independent of the kernels: a Map per row, no sort
 * network and no scan.
 */

import { type F32, type GraphSnapshot, type U32 } from "@graphty/graph-format";

/** A CSR on the host. */
export interface HostCsr {
    readonly n: number;
    readonly rowPtr: U32;
    readonly colIdx: U32;
    /** One f32 per arc, or null. */
    readonly weights: F32 | null;
}

/**
 * The CSR of `count` arcs whose sources are non-decreasing, each row in arc order (the counting build).
 * @param n - the node count
 * @param src - the sources
 * @param dst - the targets
 * @param weights - the weights, or null
 * @returns the CSR
 */
export function csrOfArcs(
    n: number,
    src: ArrayLike<number>,
    dst: ArrayLike<number>,
    weights: ArrayLike<number> | null,
): HostCsr {
    const count = src.length;
    const rowPtr = new Uint32Array(n + 1);
    for (let i = 0; i < count; i++) {
        rowPtr[src[i] + 1]++;
    }
    for (let v = 0; v < n; v++) {
        rowPtr[v + 1] += rowPtr[v];
    }
    const cursor = rowPtr.slice(0, n);
    const colIdx = new Uint32Array(count);
    const w = weights === null ? null : new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const slot = cursor[src[i]]++;
        colIdx[slot] = dst[i];
        if (w !== null && weights !== null) {
            w[slot] = weights[i];
        }
    }
    return { n, rowPtr, colIdx, weights: w };
}

/**
 * The simple symmetric graph of a snapshot, from its definition (see the file header).
 * @param s - the snapshot
 * @returns the CSR, rows sorted by target, weights the f32 sums of the merged arcs (1 per edge when unweighted)
 */
export function simpleSymmetricOracle(s: GraphSnapshot): HostCsr {
    const n = s.nodeCount;
    const rows: Map<number, number>[] = Array.from({ length: n }, () => new Map<number, number>());
    if (s.edgeCount > 0) {
        const { src, dst, weights } = s.edgeList();
        for (let e = 0; e < src.length; e++) {
            const u = src[e];
            const v = dst[e];
            if (u === v) {
                continue;
            }
            const w = weights === null ? 1 : weights[e];
            // arcs 2e (u, v) and 2e + 1 (v, u): each pair's sum grows in edge order
            rows[u].set(v, Math.fround((rows[u].get(v) ?? 0) + w));
            rows[v].set(u, Math.fround((rows[v].get(u) ?? 0) + w));
        }
    }
    const src: number[] = [];
    const dst: number[] = [];
    const weights: number[] = [];
    for (let u = 0; u < n; u++) {
        for (const v of [...rows[u].keys()].sort((a, b) => a - b)) {
            src.push(u);
            dst.push(v);
            weights.push(rows[u].get(v) ?? 0);
        }
    }
    return csrOfArcs(n, src, dst, weights);
}
