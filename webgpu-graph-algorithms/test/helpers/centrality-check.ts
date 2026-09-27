/**
 * The checks every betweenness test composes: the CPU package's host convention applied to the reference's raw sums
 * (halved on an undirected snapshot for vertices, never for folded edges, normalised by `(n - 1)(n - 2)` directed
 * or half that undirected), the score error the tolerance is stated in, Spearman's rank correlation, the top-k
 * agreement, and the equality of an undirected edge's two arcs before folding.
 */

import { type F64, foldArcs, type GraphSnapshot } from "@graphty/graph-format";

/**
 * The CPU normalisation divisor (1 when not normalising or when the factor is not positive).
 * @param s - the snapshot
 * @param normalized - the option
 * @returns the divisor
 */
function divisorOf(s: GraphSnapshot, normalized: boolean): number {
    const n = s.nodeCount;
    const factor = s.directed ? (n - 1) * (n - 2) : ((n - 1) * (n - 2)) / 2;
    return normalized && factor > 0 ? factor : 1;
}

/**
 * The published vertex scores of raw sums: halved on an undirected snapshot, then normalised.
 * @param s - the snapshot
 * @param raw - the unhalved sums
 * @param normalized - the option
 * @returns the scores
 */
export function vertexConvention(s: GraphSnapshot, raw: ArrayLike<number>, normalized = false): Float64Array {
    const divisor = (s.directed ? 1 : 2) * divisorOf(s, normalized);
    return Float64Array.from(raw, (x) => x / divisor);
}

/**
 * The published edge scores of raw per-arc sums: folded with "first" (NOT halved), then normalised.
 * @param s - the snapshot
 * @param perArc - the per-arc sums
 * @param normalized - the option
 * @returns the per-edge scores
 */
export function edgeConvention(s: GraphSnapshot, perArc: F64, normalized = false): Float64Array {
    const divisor = divisorOf(s, normalized);
    return Float64Array.from(foldArcs(s, perArc, "first"), (x) => x / divisor);
}

/**
 * The largest error of a score vector: `|got - want| / max(|want|, 1e-3 x max |want|)`, i.e. relative, with the
 * floor that keeps a near-zero entry from being judged on its own scale. NaN and a length mismatch are Infinity.
 * @param got - the scores
 * @param want - the reference
 * @returns the error
 */
export function scoreError(got: ArrayLike<number>, want: ArrayLike<number>): number {
    if (got.length !== want.length) {
        return Infinity;
    }
    let top = 0;
    for (let i = 0; i < want.length; i++) {
        top = Math.max(top, Math.abs(want[i]));
    }
    const floor = Math.max(1e-3 * top, Number.MIN_VALUE);
    let worst = 0;
    for (let i = 0; i < want.length; i++) {
        const err = Math.abs(got[i] - want[i]) / Math.max(Math.abs(want[i]), floor);
        worst = Math.max(worst, Number.isNaN(err) ? Infinity : err);
    }
    return worst;
}

/**
 * Ranks with ties averaged (1-based).
 * @param a - the values
 * @returns the ranks
 */
function ranks(a: ArrayLike<number>): Float64Array {
    const order = Array.from({ length: a.length }, (_, i) => i).sort((x, y) => a[x] - a[y]);
    const out = new Float64Array(a.length);
    for (let i = 0; i < order.length; ) {
        let j = i;
        while (j + 1 < order.length && a[order[j + 1]] === a[order[i]]) {
            j++;
        }
        for (let t = i; t <= j; t++) {
            out[order[t]] = (i + j) / 2 + 1;
        }
        i = j + 1;
    }
    return out;
}

/**
 * Spearman's rank correlation of two score vectors (ties averaged).
 * @param a - the first
 * @param b - the second
 * @returns rho in [-1, 1]
 */
export function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
    const ra = ranks(a);
    const rb = ranks(b);
    const n = ra.length;
    const mean = (n + 1) / 2;
    let cov = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < n; i++) {
        cov += (ra[i] - mean) * (rb[i] - mean);
        va += (ra[i] - mean) ** 2;
        vb += (rb[i] - mean) ** 2;
    }
    return cov / Math.sqrt(va * vb);
}

/**
 * The top-k indices of both vectors agree as a set and the first agrees exactly (design 9.7), judged on the
 * reference's order; ties at the cut are allowed to fall either way.
 * @param got - the scores
 * @param want - the reference
 * @param k - how many
 * @returns true when they agree
 */
export function topKAgrees(got: ArrayLike<number>, want: ArrayLike<number>, k: number): boolean {
    const order = (v: ArrayLike<number>): number[] =>
        Array.from({ length: v.length }, (_, i) => i).sort((x, y) => v[y] - v[x] || x - y);
    const g = order(got).slice(0, k);
    const w = order(want);
    const cut = want[w[Math.min(k, w.length) - 1]];
    const tolerance = 1e-4 * Math.abs(want[w[0]]);
    return Math.abs(want[g[0]] - want[w[0]]) <= tolerance && g.every((i) => want[i] >= cut - tolerance);
}

/**
 * On an undirected snapshot the two arcs of every edge carry the same score before folding: the largest relative gap
 * between an edge's arcs (0 on a directed snapshot, which has one arc per edge).
 * @param s - the snapshot
 * @param perArc - the per-arc scores
 * @returns the gap
 */
export function arcPairGap(s: GraphSnapshot, perArc: ArrayLike<number>): number {
    if (s.directed) {
        return 0;
    }
    const { arcToEdge, edgeToArc } = s;
    let worst = 0;
    for (let a = 0; a < s.arcCount; a++) {
        const twin = perArc[edgeToArc[arcToEdge[a]]];
        const gap = Math.abs(perArc[a] - twin) / Math.max(Math.abs(twin), 1);
        worst = Math.max(worst, gap);
    }
    return worst;
}
