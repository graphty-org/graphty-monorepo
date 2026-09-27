import type { F64, GraphSnapshot } from "@graphty/graph-format";

/** Options of the index-based HITS, matching the legacy `hits`. @public */
export interface HitsOptions {
    /** Iteration cap; default 100. */
    readonly maxIterations?: number | undefined;
    /** Convergence tolerance on the largest single-node change; default 1e-6. */
    readonly tolerance?: number | undefined;
    /**
     * `false` rescales both vectors so their largest entry is 1, which is what the legacy function
     * does when normalization is switched OFF -- the iteration itself always divides by the L2
     * norm. Default true, i.e. the L2-normalized vectors are returned unchanged.
     */
    readonly normalized?: boolean | undefined;
    /** Weight a neighbour's contribution by the arc weight; default false. */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based HITS. @public */
export interface HitsResult {
    /** Hub score per node index. */
    readonly hubs: F64;
    /** Authority score per node index. */
    readonly authorities: F64;
    /** Iterations actually run. */
    readonly iterations: number;
    /** Whether the largest single-node change fell below the tolerance. */
    readonly converged: boolean;
}

/**
 * Divide a vector by its L2 norm, in place; a zero vector is left alone.
 * @param v - The vector to scale
 */
function l2Normalize(v: Float64Array): void {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    const norm = Math.sqrt(sum);
    if (norm > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] /= norm;
        }
    }
}

/**
 * Divide a vector by its largest entry, in place; left alone when that entry is not positive.
 * @param v - The vector to scale
 */
function maxNormalize(v: Float64Array): void {
    let max = 0;
    for (let i = 0; i < v.length; i++) {
        if (v[i] > max) {
            max = v[i];
        }
    }
    if (max > 0) {
        for (let i = 0; i < v.length; i++) {
            v[i] /= max;
        }
    }
}

/**
 * HITS by alternating power iteration: an authority sums the hub scores of the nodes pointing at
 * it, a hub sums the authority scores of the nodes it points at, and both vectors are
 * L2-normalized every round. On an undirected snapshot the two adjacencies are the same array, so
 * the hubs and the authorities coincide.
 * @param s - The snapshot
 * @param o - Algorithm options
 * @returns The two score vectors, the iteration count and the convergence flag
 * @public
 */
export function hits(s: GraphSnapshot, o: HitsOptions = {}): HitsResult {
    const n = s.nodeCount;
    const maxIter = o.maxIterations ?? 100;
    const tol = o.tolerance ?? 1e-6;
    const rev = s.reverse();
    const fwdW = o.weighted === true ? s.weights : null;
    const revW = o.weighted === true ? rev.weights : null;
    let hubs = new Float64Array(n).fill(n === 0 ? 0 : 1 / Math.sqrt(n));
    let authorities = new Float64Array(n).fill(n === 0 ? 0 : 1 / Math.sqrt(n));
    let nextHubs = new Float64Array(n);
    let nextAuthorities = new Float64Array(n);
    let it = 0;
    let converged = false;
    for (; it < maxIter && !converged; it++) {
        for (let v = 0; v < n; v++) {
            let auth = 0;
            const inEnd = rev.rowPtr[v + 1];
            for (let a = rev.rowPtr[v]; a < inEnd; a++) {
                auth += hubs[rev.colIdx[a]] * (revW === null ? 1 : revW[a]);
            }
            nextAuthorities[v] = auth;
            let hub = 0;
            const outEnd = s.rowPtr[v + 1];
            for (let a = s.rowPtr[v]; a < outEnd; a++) {
                hub += authorities[s.colIdx[a]] * (fwdW === null ? 1 : fwdW[a]);
            }
            nextHubs[v] = hub;
        }
        l2Normalize(nextAuthorities);
        l2Normalize(nextHubs);
        let maxDiff = 0;
        for (let v = 0; v < n; v++) {
            const dh = Math.abs(nextHubs[v] - hubs[v]);
            if (dh > maxDiff) {
                maxDiff = dh;
            }
            const da = Math.abs(nextAuthorities[v] - authorities[v]);
            if (da > maxDiff) {
                maxDiff = da;
            }
        }
        [hubs, nextHubs] = [nextHubs, hubs];
        [authorities, nextAuthorities] = [nextAuthorities, authorities];
        converged = maxDiff < tol;
    }
    if (o.normalized === false) {
        maxNormalize(hubs);
        maxNormalize(authorities);
    }
    return { hubs, authorities, iterations: it, converged };
}
