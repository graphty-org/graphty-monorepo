/**
 * The random bipartite graph G(n1, n2, p), optionally with a planted perfect matching.
 */

import { type U32 } from "@graphty/graph-format";

import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { binomialBuffer, checkInt, checkProbability, type EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** Options of {@link randomBipartiteGraph}. */
export interface RandomBipartiteOptions extends WeightOptions {
    /** The left side's size, >= 0. */
    n1: number;
    /** The right side's size, >= 0. */
    n2: number;
    /** The probability of each left-right pair, in [0, 1]. */
    p: number;
    /**
     * Plant a perfect matching: left node i is always joined to right node `matching[i]` of a
     * uniformly random permutation, so a perfect matching is guaranteed. Needs n1 === n2.
     */
    perfectMatching?: boolean | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The planted matching: a Fisher-Yates shuffle of 0 .. n - 1 from stream (seed,
 * "bipartite-matching", 0), drawing nextBelow(i + 1) for i = n - 1 down to 1.
 * @param n - the side size
 * @param seed - the seed
 * @returns match[i] = the right-side offset joined to left node i
 */
export function plantedMatching(n: number, seed: number): U32 {
    const stream = new RandomStream(seed, "bipartite-matching", 0);
    const match = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        match[i] = i;
    }
    for (let i = n - 1; i > 0; i--) {
        const j = stream.nextBelow(i + 1);
        const t = match[i];
        match[i] = match[j];
        match[j] = t;
    }
    return match;
}

/**
 * Rows [start, end) of the bipartite graph: left node u draws from stream (seed, "bipartite", u)
 * and holds (u, n1 + j) for the chosen right offsets j in ascending order, with the planted match
 * merged in at its place (never twice).
 * @param options - the checked options
 * @param match - the planted matching, or null
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function bipartiteRows(
    options: RandomBipartiteOptions,
    match: U32 | null,
    start: number,
    end: number,
    out: EdgeBuffer,
): void {
    const { n1, n2, p } = options;
    const seed = resolveSeed(options.seed);
    const logQ = detLog(1 - p);
    const stream = new RandomStream(seed, "bipartite", 0);
    for (let u = start; u < end; u++) {
        stream.reset(u);
        let pending = match === null ? -1 : match[u];
        const emit = (j: number): void => {
            if (pending >= 0 && pending < j) {
                out.push(u, n1 + pending);
            }
            if (pending >= 0 && pending <= j) {
                pending = -1;
            }
            out.push(u, n1 + j);
        };
        if (p === 1) {
            for (let j = 0; j < n2; j++) {
                emit(j);
            }
        } else if (p > 0) {
            let j = stream.nextSkip(logQ);
            while (j < n2) {
                emit(j);
                j += 1 + stream.nextSkip(logQ);
            }
        }
        if (pending >= 0) {
            out.push(u, n1 + pending);
        }
    }
}

/**
 * The random bipartite graph G(n1, n2, p) in O(n + m): left nodes 0 .. n1 - 1, right nodes
 * n1 .. n1 + n2 - 1, each left-right pair independently with probability p; edges row by row from
 * the left side, right ends ascending. Node column `side` (u8): 0 left, 1 right.
 * @param options - n1, n2, p, perfectMatching and seed
 * @returns the undirected graph
 */
export function randomBipartiteGraph(options: RandomBipartiteOptions): SampleGraph {
    const { n1, n2, p } = options;
    checkInt("n1", n1, 0);
    checkInt("n2", n2, 0);
    checkInt("n1 + n2", n1 + n2, 0);
    checkProbability("p", p);
    const seed = resolveSeed(options.seed);
    let match: U32 | null = null;
    if (options.perfectMatching === true) {
        if (n1 !== n2) {
            throw new RangeError(`perfectMatching needs n1 === n2, got ${n1} and ${n2}`);
        }
        match = plantedMatching(n1, seed);
    }
    const out = binomialBuffer(n1 * n2, p);
    bipartiteRows(options, match, 0, n1, out);
    const side = new Uint8Array(n1 + n2).fill(1, n1);
    return applyWeights(toGraph(n1 + n2, out, false, { side }), options);
}
