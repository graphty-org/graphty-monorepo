/**
 * The Brandes reference for betweenness (design 11.3's oracle rule: independent, index-based, written from the
 * algorithm and never from a kernel). One breadth-first search per source over the CSR arcs recording `depth` and
 * `sigma`, then the reverse-order accumulation of the dependencies. It returns the per-vertex sums AND the per-arc
 * terms, both UNHALVED and UNNORMALISED (the tests compose the host convention themselves, so a wrong halving cannot
 * hide inside the reference), plus each source's `depth` and `sigma` so the forward pass can be judged on its own.
 * `precision: "f32"` rounds every term and every sum through Math.fround, which is what one f32 operation in a kernel
 * does. Parallel arcs count as distinct paths, as on the GPU; the CPU package refuses parallel edges or collapses
 * them to one, so on a multigraph this reference and the CPU differ (design/decisions/
 * 2026-09-27-betweenness-implementation-choices.md). Weights are ignored.
 */

import { type F64, type GraphSnapshot } from "@graphty/graph-format";

/** One source's forward state. */
interface BrandesSource {
    readonly depth: Int32Array;
    readonly sigma: Float64Array;
}

/** The reference's output. */
interface BrandesResult {
    /** Sum over the sources of each vertex's dependency (the source's own excluded), unhalved. */
    readonly vertex: Float64Array;
    /** Sum over the sources of each arc's term `sigma[w] / sigma[v] * (1 + delta[v])`, unhalved. */
    readonly perArc: F64;
    /** Per source, in the order given. */
    readonly perSource: readonly BrandesSource[];
}

/**
 * Brandes over the given sources.
 * @param s - the snapshot (its rowPtr / colIdx)
 * @param options - `sources` (default every vertex) and `precision` (default f64)
 * @param options.sources - the sources
 * @param options.precision - "f64" or "f32"
 * @returns the sums and the per-source state
 */
export function brandesOracle(
    s: GraphSnapshot,
    options: { readonly sources?: readonly number[]; readonly precision?: "f32" | "f64" } = {},
): BrandesResult {
    const n = s.nodeCount;
    const { rowPtr, colIdx } = s;
    const round = options.precision === "f32" ? Math.fround : (x: number): number => x;
    const sources = options.sources ?? Array.from({ length: n }, (_, i) => i);
    const vertex = new Float64Array(n);
    const perArc = new Float64Array(s.arcCount);
    const perSource: BrandesSource[] = [];
    for (const source of sources) {
        const depth = new Int32Array(n).fill(-1);
        const sigma = new Float64Array(n);
        const delta = new Float64Array(n);
        const stack: number[] = [];
        depth[source] = 0;
        sigma[source] = 1;
        const queue = [source];
        for (let head = 0; head < queue.length; head++) {
            const w = queue[head];
            stack.push(w);
            for (let a = rowPtr[w]; a < rowPtr[w + 1]; a++) {
                const v = colIdx[a];
                if (depth[v] < 0) {
                    depth[v] = depth[w] + 1;
                    queue.push(v);
                }
                if (depth[v] === depth[w] + 1) {
                    sigma[v] += sigma[w];
                }
            }
        }
        for (let i = stack.length - 1; i >= 0; i--) {
            const w = stack[i];
            let acc = 0;
            for (let a = rowPtr[w]; a < rowPtr[w + 1]; a++) {
                const v = colIdx[a];
                if (depth[v] === depth[w] + 1) {
                    const term = round(round(round(sigma[w]) / round(sigma[v])) * round(1 + delta[v]));
                    acc = round(acc + term);
                    perArc[a] = round(perArc[a] + term);
                }
            }
            delta[w] = acc;
            if (w !== source) {
                vertex[w] = round(vertex[w] + acc);
            }
        }
        perSource.push({ depth, sigma });
    }
    return { vertex, perArc, perSource };
}
