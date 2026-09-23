/**
 * Erdos-Renyi random graphs: Gilbert's G(n, p) (every pair independently with probability p) and
 * Erdos-Renyi's G(n, m) (m pairs uniformly without replacement).
 */

import { detLog } from "../random/log.js";
import { checkSeed, RandomStream } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { bernoulliSegment, binomialBuffer, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";

/** Options of {@link erdosRenyiGraph}. */
export interface ErdosRenyiOptions {
    /** The node count, >= 0. */
    n: number;
    /** The probability of each pair, in [0, 1]. */
    p: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * Rows [start, end) of G(n, p): row u draws from stream (seed, "gnp", u) and holds the pairs
 * (u, v), v = u + 1 .. n - 1, in ascending v. Concatenating any split of [0, n) into consecutive
 * ranges gives exactly the whole graph's edge list.
 * @param options - the generator's options (already checked)
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function erdosRenyiRows(options: ErdosRenyiOptions, start: number, end: number, out: EdgeBuffer): void {
    const { n, p, seed } = options;
    const logQ = detLog(1 - p);
    const stream = new RandomStream(seed, "gnp", 0);
    for (let u = start; u < end; u++) {
        stream.reset(u);
        bernoulliSegment(stream, p, logQ, u, u + 1, n, out);
    }
}

/**
 * Gilbert's G(n, p) in O(n + m) by geometric skipping (Batagelj and Brandes 2005). Edges are the
 * pairs (u, v), u < v, in row-major order; row u draws from its own stream, so the graph does not
 * depend on how the rows are split between workers.
 * @param options - n, p and seed
 * @returns the undirected graph
 */
export function erdosRenyiGraph(options: ErdosRenyiOptions): SampleGraph {
    const { n, p } = options;
    checkInt("n", n, 0);
    checkProbability("p", p);
    checkSeed(options.seed);
    const pairs = (n * (n - 1)) / 2;
    const out = binomialBuffer(pairs, p);
    erdosRenyiRows(options, 0, n, out);
    return toGraph(n, out, false);
}

/** Options of {@link erdosRenyiGnmGraph}. */
export interface ErdosRenyiGnmOptions {
    /** The node count, >= 0. */
    n: number;
    /** The edge count, in [0, n (n - 1) / 2]. */
    m: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * An open-addressing set of non-negative integers below 2^53, sized for `capacity` entries.
 */
class NumberSet {
    private readonly slots: Float64Array;
    private readonly mask: number;

    /**
     * An empty set.
     * @param capacity - the maximum number of entries
     */
    constructor(capacity: number) {
        let size = 16;
        while (size < capacity * 2) {
            size *= 2;
        }
        this.slots = new Float64Array(size).fill(-1);
        this.mask = size - 1;
    }

    /**
     * Insert `x`.
     * @param x - the value
     * @returns false when it was already present
     */
    add(x: number): boolean {
        let i = Math.imul((x >>> 0) ^ Math.floor(x / 4294967296), 0x9e3779b1) & this.mask;
        for (;;) {
            const slot = this.slots[i];
            if (slot === -1) {
                this.slots[i] = x;
                return true;
            }
            if (slot === x) {
                return false;
            }
            i = (i + 1) & this.mask;
        }
    }
}

/**
 * Erdos-Renyi's G(n, m): m distinct pairs chosen uniformly, by Floyd's sampling over the pair
 * indices 0 .. n (n - 1) / 2 - 1 (exactly m draws from stream (seed, "gnm", 0), no rejection
 * loop), in O(m log m). Edges are the pairs (u, v), u < v, in row-major order.
 * @param options - n, m and seed
 * @returns the undirected graph
 */
export function erdosRenyiGnmGraph(options: ErdosRenyiGnmOptions): SampleGraph {
    const { n, m, seed } = options;
    // the pair indices must stay below 2^53 to be exact doubles
    checkInt("n", n, 0, 2 ** 27);
    const total = (n * (n - 1)) / 2;
    checkInt("m", m, 0, Math.min(total, 2 ** 32 - 2));
    const stream = new RandomStream(seed, "gnm", 0);
    const chosen = new Float64Array(m);
    const set = new NumberSet(m);
    for (let k = 0, j = total - m; j < total; j++, k++) {
        const t = stream.nextBelow(j + 1);
        if (set.add(t)) {
            chosen[k] = t;
        } else {
            set.add(j);
            chosen[k] = j;
        }
    }
    chosen.sort();
    const out = new EdgeBuffer(m);
    // walk the sorted pair indices row by row: row u holds indices [rowStart, rowStart + n - u - 1)
    let u = 0;
    let rowStart = 0;
    for (let k = 0; k < m; k++) {
        const index = chosen[k];
        while (index >= rowStart + (n - u - 1)) {
            rowStart += n - u - 1;
            u++;
        }
        out.push(u, u + 1 + (index - rowStart));
    }
    return toGraph(n, out, false);
}
