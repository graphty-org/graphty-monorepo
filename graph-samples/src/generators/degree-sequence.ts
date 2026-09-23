/**
 * Degree-sequence models: power-law degree sequences, the configuration model (undirected,
 * directed and bipartite), Chung-Lu expected-degree graphs, the degree-corrected stochastic block
 * model and random regular graphs.
 */

import { MAX_COUNT, type U32 } from "@graphty/graph-format";

import { detPow } from "../random/exp.js";
import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { checkEdgeCount, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/**
 * What a generator does with self-loops or repeated pairs: keep them, or erase all but the first
 * occurrence in edge order.
 */
export type EdgePolicy = "keep" | "erase";

/** The largest power-law support (maxDegree - minDegree + 1): the size of the cumulative table. */
const MAX_POWER_LAW_SUPPORT = 2 ** 24;

/**
 * Throw unless `exponent` is a finite number >= 0.
 * @param name - the option name
 * @param exponent - the value
 */
function checkExponent(name: string, exponent: number): void {
    if (!(Number.isFinite(exponent) && exponent >= 0)) {
        throw new RangeError(`${name} must be a finite number >= 0, got ${String(exponent)}`);
    }
}

/**
 * A sampler of the discrete power law P(d) ~ d^-exponent on [min, max]: a cumulative table of
 * detPow(d, -exponent), and per draw one nextFloat u and a binary search for the first entry
 * above u times the total. Checks its arguments.
 * @param names - the option names of [exponent, min, max], for the messages
 * @param exponent - the exponent, >= 0
 * @param min - the smallest value, >= 1
 * @param max - the largest value, >= min
 * @returns the sampler
 */
export function powerLawSampler(
    names: readonly [string, string, string],
    exponent: number,
    min: number,
    max: number,
): (stream: RandomStream) => number {
    checkExponent(names[0], exponent);
    checkInt(names[1], min, 1);
    checkInt(names[2], max, min, Math.min(MAX_COUNT, min + MAX_POWER_LAW_SUPPORT - 1));
    const count = max - min + 1;
    const cdf = new Float64Array(count);
    let total = 0;
    for (let k = 0; k < count; k++) {
        total += detPow(min + k, -exponent);
        cdf[k] = total;
    }
    return (stream) => {
        const u = stream.nextFloat() * total;
        let lo = 0;
        let hi = count - 1;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (cdf[mid] > u) {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
        return min + lo;
    };
}

/**
 * Make the sum of `seq` even by changing its LAST entry: +1 when it is below `max`, else -1 when
 * it is above `min`; a RangeError when neither is possible.
 * @param seq - the sequence, changed in place
 * @param min - the smallest allowed value
 * @param max - the largest allowed value
 */
export function makeSumEven(seq: U32, min: number, max: number): void {
    let total = 0;
    for (const d of seq) {
        total += d;
    }
    if (total % 2 === 0) {
        return;
    }
    const last = seq.length - 1;
    if (seq[last] < max) {
        seq[last]++;
    } else if (seq[last] > min) {
        seq[last]--;
    } else {
        throw new RangeError(`cannot make the degree sum even: every degree is ${min} and n is odd`);
    }
}

/** Options of {@link powerLawDegreeSequence}. */
export interface PowerLawDegreeSequenceOptions {
    /** The sequence length, >= 0. */
    n: number;
    /** The exponent of P(d) ~ d^-exponent, a finite number >= 0 (typically 2 to 3). */
    exponent: number;
    /** The smallest degree, >= 1. */
    minDegree: number;
    /** The largest degree, >= minDegree, and at most minDegree + 2^24 - 1. */
    maxDegree: number;
    /** Make the sum even (so a configuration model can pair it); default true. */
    evenSum?: boolean | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * A sequence of n integers drawn independently from the discrete power law
 * P(d) ~ d^-exponent on [minDegree, maxDegree], by inversion of a cumulative table built with
 * detPow: entry i is one nextFloat of stream (seed, "power-law", 0), in index order. With
 * `evenSum` (the default) an odd sum is fixed by changing the last entry: +1 when it is below
 * maxDegree, else -1. O(n log(maxDegree - minDegree) + maxDegree - minDegree).
 * @param options - n, exponent, minDegree, maxDegree, evenSum and seed
 * @returns the sequence
 */
export function powerLawDegreeSequence(options: PowerLawDegreeSequenceOptions): Uint32Array<ArrayBuffer> {
    const { n, exponent, minDegree, maxDegree } = options;
    const seed = resolveSeed(options.seed);
    checkInt("n", n, 0);
    const sample = powerLawSampler(["exponent", "minDegree", "maxDegree"], exponent, minDegree, maxDegree);
    const stream = new RandomStream(seed, "power-law", 0);
    const seq = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        seq[i] = sample(stream);
    }
    if ((options.evenSum ?? true) && n > 0) {
        makeSumEven(seq, minDegree, maxDegree);
    }
    return seq;
}

/**
 * Check a degree sequence and return its sum.
 * @param name - the option name
 * @param degrees - the degrees
 * @returns the sum
 */
function degreeSum(name: string, degrees: ArrayLike<number>): number {
    checkInt(`${name}.length`, degrees.length, 0);
    let total = 0;
    for (let i = 0; i < degrees.length; i++) {
        const d = degrees[i];
        if (!(Number.isInteger(d) && d >= 0 && d <= MAX_COUNT)) {
            checkInt(`${name}[${i}]`, d, 0);
        }
        total += d;
    }
    checkEdgeCount(total / 2);
    return total;
}

/**
 * The option value of a keep / erase policy, checked.
 * @param name - the option name
 * @param value - the value (default "erase")
 * @returns true for keep
 */
function keeps(name: string, value: EdgePolicy | undefined): boolean {
    if (value !== undefined && value !== "keep" && value !== "erase") {
        throw new RangeError(`${name} must be "keep" or "erase", got ${String(value)}`);
    }
    return value === "keep";
}

/**
 * The stub list: node i + offset repeated degrees[i] times, ascending.
 * @param degrees - the degrees
 * @param total - their sum
 * @param offset - added to every node index
 * @returns the stubs
 */
export function stubList(degrees: ArrayLike<number>, total: number, offset = 0): Uint32Array<ArrayBuffer> {
    const stubs = new Uint32Array(total);
    let k = 0;
    for (let i = 0; i < degrees.length; i++) {
        stubs.fill(i + offset, k, k + degrees[i]);
        k += degrees[i];
    }
    return stubs;
}

/**
 * Fisher-Yates shuffle in place: for i = length - 1 down to 1, swap entries i and nextBelow(i + 1).
 * @param a - the array
 * @param stream - the stream
 */
export function shuffle(a: U32, stream: RandomStream): void {
    for (let i = a.length - 1; i > 0; i--) {
        const j = stream.nextBelow(i + 1);
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
}

/**
 * Filter an edge list, keeping edge order: drop self-loops unless `keepLoops`, drop edges whose
 * endpoints share a `group` value when `group` is given, and drop every repeat of a pair (ordered
 * when directed, unordered otherwise) after its first kept occurrence unless `keepMulti`. O(n + m)
 * by a counting sort on the smaller endpoint and a last-seen mark per node, no hashing.
 * @param n - the node count
 * @param src - the sources
 * @param dst - the targets
 * @param directed - whether pairs are ordered
 * @param keepLoops - keep self-loops
 * @param keepMulti - keep repeated pairs
 * @param out - receives the kept edges
 * @param group - a node column; edges inside one group are dropped
 */
function eraseEdges(
    n: number,
    src: U32,
    dst: U32,
    directed: boolean,
    keepLoops: boolean,
    keepMulti: boolean,
    out: EdgeBuffer,
    group?: U32,
): void {
    const m = src.length;
    const keep = new Uint8Array(m).fill(1);
    for (let e = 0; e < m; e++) {
        const u = src[e];
        const v = dst[e];
        if ((!keepLoops && u === v) || (group !== undefined && group[u] === group[v])) {
            keep[e] = 0;
        }
    }
    if (!keepMulti) {
        const lo = (e: number): number => (directed ? src[e] : Math.min(src[e], dst[e]));
        const start = new Uint32Array(n + 1);
        for (let e = 0; e < m; e++) {
            start[lo(e) + 1]++;
        }
        for (let i = 0; i < n; i++) {
            start[i + 1] += start[i];
        }
        const fill = start.slice(0, n);
        const order = new Uint32Array(m);
        for (let e = 0; e < m; e++) {
            order[fill[lo(e)]++] = e;
        }
        // mark[v] = u + 1 when the pair (u, v) has been seen in u's bucket
        const mark = new Uint32Array(n);
        for (let k = 0; k < m; k++) {
            const e = order[k];
            if (keep[e] === 0) {
                continue;
            }
            const u = lo(e);
            const v = directed ? dst[e] : Math.max(src[e], dst[e]);
            if (mark[v] === u + 1) {
                keep[e] = 0;
            } else {
                mark[v] = u + 1;
            }
        }
    }
    for (let e = 0; e < m; e++) {
        if (keep[e] === 1) {
            out.push(src[e], dst[e]);
        }
    }
}

/**
 * Pair consecutive stubs of a shuffled undirected stub list into edges (stubs[2k], stubs[2k + 1])
 * and erase as asked.
 * @param n - the node count
 * @param stubs - the shuffled stubs (even length)
 * @param keepLoops - keep self-loops
 * @param keepMulti - keep repeated pairs
 * @param out - receives the edges
 * @param group - a node column; edges inside one group are dropped
 */
export function pairStubs(
    n: number,
    stubs: U32,
    keepLoops: boolean,
    keepMulti: boolean,
    out: EdgeBuffer,
    group?: U32,
): void {
    const m = stubs.length / 2;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let k = 0; k < m; k++) {
        src[k] = stubs[2 * k];
        dst[k] = stubs[2 * k + 1];
    }
    eraseEdges(n, src, dst, false, keepLoops, keepMulti, out, group);
}

/** Options of {@link configurationModelGraph}. */
export interface ConfigurationModelOptions extends WeightOptions {
    /** The degree of every node; the sum must be even. */
    degrees: ArrayLike<number>;
    /** Keep or erase self-loops; default "erase". */
    selfLoops?: EdgePolicy | undefined;
    /** Keep or erase repeated pairs (the first occurrence in edge order stays); default "erase". */
    multiEdges?: EdgePolicy | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The configuration model (E. A. Bender and E. R. Canfield, "The asymptotic number of labeled
 * graphs with given degree sequences", J. Combin. Theory A 24, 296-307, 1978,
 * doi:10.1016/0097-3165(78)90059-6; M. Molloy and B. Reed, "A critical point for random graphs with
 * a given degree sequence", Random Struct. Algorithms 6, 161-179, 1995, doi:10.1002/rsa.3240060204;
 * M. E. J. Newman, S. H. Strogatz and D. J. Watts, "Random graphs with arbitrary degree
 * distributions and their applications", Phys. Rev. E 64, 026118, 2001,
 * doi:10.1103/PhysRevE.64.026118). The stub list (node i repeated degrees[i] times, ascending) is
 * Fisher-Yates shuffled with stream (seed, "configuration", 0) and consecutive stubs are paired:
 * edge k is (stubs[2k], stubs[2k + 1]), in that order. With keep / keep the degrees are exact (a
 * multigraph); erasing drops self-loops and every repeat of a pair after its first occurrence, so
 * degrees can only go down. An odd degree sum is a RangeError. O(n + m).
 * @param options - degrees, selfLoops, multiEdges and seed
 * @returns the undirected graph
 */
export function configurationModelGraph(options: ConfigurationModelOptions): SampleGraph {
    const { degrees } = options;
    const seed = resolveSeed(options.seed);
    const keepLoops = keeps("selfLoops", options.selfLoops);
    const keepMulti = keeps("multiEdges", options.multiEdges);
    const total = degreeSum("degrees", degrees);
    if (total % 2 !== 0) {
        throw new RangeError(`the degree sum must be even, got ${total}`);
    }
    const n = degrees.length;
    const stubs = stubList(degrees, total);
    shuffle(stubs, new RandomStream(seed, "configuration", 0));
    const out = new EdgeBuffer(total / 2);
    pairStubs(n, stubs, keepLoops, keepMulti, out);
    return applyWeights(toGraph(n, out, false), options);
}

/** Options of {@link directedConfigurationModelGraph}. */
export interface DirectedConfigurationModelOptions extends WeightOptions {
    /** The out-degree of every node. */
    outDegrees: ArrayLike<number>;
    /** The in-degree of every node; same length and same sum as outDegrees. */
    inDegrees: ArrayLike<number>;
    /** Keep or erase self-loops; default "erase". */
    selfLoops?: EdgePolicy | undefined;
    /** Keep or erase repeated ordered pairs (the first occurrence stays); default "erase". */
    multiEdges?: EdgePolicy | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The directed configuration model (Newman, Strogatz and Watts 2001, section on directed graphs):
 * the in-stub list (node i repeated inDegrees[i] times, ascending) is Fisher-Yates shuffled with
 * stream (seed, "configuration-directed", 0) and paired in order with the ascending out-stub list,
 * so edge k runs from the k-th out-stub to the k-th shuffled in-stub (edges come grouped by
 * source, ascending). Erasing works as in {@link configurationModelGraph} on ordered pairs.
 * O(n + m).
 * @param options - outDegrees, inDegrees, selfLoops, multiEdges and seed
 * @returns the directed graph
 */
export function directedConfigurationModelGraph(options: DirectedConfigurationModelOptions): SampleGraph {
    const { outDegrees, inDegrees } = options;
    const seed = resolveSeed(options.seed);
    const keepLoops = keeps("selfLoops", options.selfLoops);
    const keepMulti = keeps("multiEdges", options.multiEdges);
    const outTotal = degreeSum("outDegrees", outDegrees);
    const inTotal = degreeSum("inDegrees", inDegrees);
    if (outDegrees.length !== inDegrees.length) {
        throw new RangeError(`outDegrees and inDegrees must have the same length`);
    }
    if (outTotal !== inTotal) {
        throw new RangeError(`the out-degree sum (${outTotal}) must equal the in-degree sum (${inTotal})`);
    }
    const n = outDegrees.length;
    const dst = stubList(inDegrees, inTotal);
    shuffle(dst, new RandomStream(seed, "configuration-directed", 0));
    const out = new EdgeBuffer(outTotal);
    eraseEdges(n, stubList(outDegrees, outTotal), dst, true, keepLoops, keepMulti, out);
    return applyWeights(toGraph(n, out, true), options);
}

/** Options of {@link bipartiteConfigurationModelGraph}. */
export interface BipartiteConfigurationModelOptions extends WeightOptions {
    /** The degree of every left node (nodes 0 .. L - 1). */
    leftDegrees: ArrayLike<number>;
    /** The degree of every right node (nodes L .. L + R - 1); same sum as leftDegrees. */
    rightDegrees: ArrayLike<number>;
    /** Keep or erase repeated pairs (the first occurrence stays); default "erase". */
    multiEdges?: EdgePolicy | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * The bipartite configuration model (Newman, Strogatz and Watts 2001, section on bipartite
 * graphs): left nodes are 0 .. L - 1, right nodes L .. L + R - 1. The right stub list (ascending)
 * is Fisher-Yates shuffled with stream (seed, "bipartite-configuration", 0) and paired in order with
 * the ascending left stub list; edge k is (k-th left stub, k-th shuffled right stub). Node column
 * `side` (u8): 0 left, 1 right. O(n + m).
 * @param options - leftDegrees, rightDegrees, multiEdges and seed
 * @returns the undirected bipartite graph
 */
export function bipartiteConfigurationModelGraph(options: BipartiteConfigurationModelOptions): SampleGraph {
    const { leftDegrees, rightDegrees } = options;
    const seed = resolveSeed(options.seed);
    const keepMulti = keeps("multiEdges", options.multiEdges);
    const leftTotal = degreeSum("leftDegrees", leftDegrees);
    const rightTotal = degreeSum("rightDegrees", rightDegrees);
    if (leftTotal !== rightTotal) {
        throw new RangeError(`the left degree sum (${leftTotal}) must equal the right degree sum (${rightTotal})`);
    }
    const left = leftDegrees.length;
    const n = left + rightDegrees.length;
    checkInt("the node count", n, 0);
    const dst = stubList(rightDegrees, rightTotal, left);
    shuffle(dst, new RandomStream(seed, "bipartite-configuration", 0));
    const out = new EdgeBuffer(leftTotal);
    eraseEdges(n, stubList(leftDegrees, leftTotal), dst, false, true, keepMulti, out);
    const side = new Uint8Array(n).fill(1, left);
    return applyWeights(toGraph(n, out, false, { side }), options);
}

/** The checked and precomputed form of an expected-degree model (Chung-Lu or the DC-SBM). */
interface ExpectedDegreePlan {
    readonly n: number;
    readonly seed: number;
    readonly domain: string;
    /** order[row] = the node of that row. */
    readonly order: U32;
    /** The weight of every row. */
    readonly weight: Float64Array;
    /** The block of every row. */
    readonly rowBlock: U32;
    /** starts[b] = the first row of block b; starts[B] = n. */
    readonly starts: readonly number[];
    /** P(u, v) = min(1, factor[r][s] w_u w_v) for u in block r, v in block s. */
    readonly factor: readonly (readonly number[])[];
    /** The sum of the weights. */
    readonly total: number;
}

/**
 * Check weights (finite, >= 0) and return their sum.
 * @param weights - the weights
 * @returns the sum
 */
function weightSum(weights: ArrayLike<number>): number {
    checkInt("expectedDegrees.length", weights.length, 0);
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
        if (!(Number.isFinite(weights[i]) && weights[i] >= 0)) {
            throw new RangeError(`expectedDegrees[${i}] must be a finite number >= 0, got ${String(weights[i])}`);
        }
        total += weights[i];
    }
    return total;
}

/**
 * Build the rows of an expected-degree model: nodes of each block (consecutive index ranges) sorted
 * by weight descending, ties by index ascending.
 * @param weights - the node weights
 * @param nodeStarts - block boundaries in node indices
 * @param factor - the block-pair factors
 * @param seed - the seed
 * @param domain - the stream domain
 * @param total - the weight sum
 * @returns the plan
 */
function planRows(
    weights: ArrayLike<number>,
    nodeStarts: readonly number[],
    factor: readonly (readonly number[])[],
    seed: number,
    domain: string,
    total: number,
): ExpectedDegreePlan {
    const n = weights.length;
    const order = new Uint32Array(n);
    const rowBlock = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        order[i] = i;
    }
    for (let b = 0; b + 1 < nodeStarts.length; b++) {
        order.subarray(nodeStarts[b], nodeStarts[b + 1]).sort((x, y) => weights[y] - weights[x] || x - y);
        rowBlock.fill(b, nodeStarts[b], nodeStarts[b + 1]);
    }
    const weight = Float64Array.from(order, (i) => weights[i]);
    return { n, seed, domain, order, weight, rowBlock, starts: nodeStarts, factor, total };
}

/** Options of {@link chungLuGraph}. */
export interface ChungLuOptions extends WeightOptions {
    /** The expected degree (weight) of every node, finite and >= 0. */
    expectedDegrees: ArrayLike<number>;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Check Chung-Lu options and build the plan: one block, factor 1 / S.
 * @param options - the options
 * @returns the plan
 */
export function planChungLu(options: ChungLuOptions): ExpectedDegreePlan {
    const seed = resolveSeed(options.seed);
    const total = weightSum(options.expectedDegrees);
    const n = options.expectedDegrees.length;
    return planRows(options.expectedDegrees, [0, n], [[total > 0 ? 1 / total : 0]], seed, "chung-lu", total);
}

/**
 * Rows [start, end) of an expected-degree model (Chung-Lu, or the DC-SBM with its own plan and
 * domain) by the skipping of Miller and Hagberg: row `row` (in block r) draws from stream
 * (seed, domain, row) and walks blocks s = r .. B - 1 in order; inside block s it visits the later
 * rows v (all rows of s when s > r) in row order, whose weights never increase, skipping with the
 * previous probability p (nextSkip(detLog(1 - p)) unless p = 1) and accepting the landing v with
 * probability q / p (one nextFloat), q = min(1, factor[r][s] w_row w_v). Edges are
 * (order[row], order[v]) in original node indices. Concatenating consecutive row ranges gives
 * the whole graph.
 * @param plan - the checked options
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function chungLuRows(plan: ExpectedDegreePlan, start: number, end: number, out: EdgeBuffer): void {
    const { order, weight, rowBlock, starts, factor } = plan;
    const stream = new RandomStream(plan.seed, plan.domain, 0);
    const count = starts.length - 1;
    for (let row = start; row < end; row++) {
        stream.reset(row);
        const r = rowBlock[row];
        // ponytail: O(B) per row like the block model; iterate non-zero blocks if B grows large
        for (let s = r; s < count; s++) {
            const cu = factor[r][s] * weight[row];
            let v = s === r ? row + 1 : starts[s];
            const hi = starts[s + 1];
            if (cu === 0 || v >= hi) {
                continue;
            }
            let p = Math.min(1, cu * weight[v]);
            while (v < hi && p > 0) {
                if (p !== 1) {
                    const logQ = detLog(1 - p);
                    // p below 2^-53 rounds 1 - p to 1: no further edge in this segment
                    if (logQ === 0) {
                        break;
                    }
                    v += stream.nextSkip(logQ);
                    if (v >= hi) {
                        break;
                    }
                }
                const q = Math.min(1, cu * weight[v]);
                if (stream.nextFloat() < q / p) {
                    out.push(order[row], order[v]);
                }
                p = q;
                v++;
            }
        }
    }
}

/**
 * Run a plan over all its rows.
 * @param plan - the plan
 * @param nodeColumns - ground-truth columns
 * @param options - for the weights option
 * @returns the graph
 */
function runPlan(plan: ExpectedDegreePlan, nodeColumns: SampleGraph["nodeColumns"], options: WeightOptions): SampleGraph {
    const mean = plan.total / 2;
    checkEdgeCount(mean);
    const out = new EdgeBuffer(Math.ceil(mean + 6 * Math.sqrt(mean) + 16));
    chungLuRows(plan, 0, plan.n, out);
    return applyWeights(toGraph(plan.n, out, false, nodeColumns), options);
}

/**
 * The Chung-Lu expected-degree graph (F. Chung and L. Lu, "The average distances in random graphs
 * with given expected degrees", PNAS 99, 15879-15882, 2002, doi:10.1073/pnas.252631999): every
 * pair u != v is joined independently with probability min(1, w_u w_v / S), S the weight sum, so
 * node u's expected degree is about w_u when every w_u w_v is below S. Linear time by the skipping
 * of J. C. Miller and A. Hagberg, "Efficient generation of networks with given expected degrees",
 * WAW 2011, LNCS 6732, 115-126, doi:10.1007/978-3-642-21286-4_10. Rows are the nodes sorted by
 * weight descending (ties by index ascending); row i draws from stream (seed, "chung-lu", i) (see
 * {@link chungLuRows}). Edges are listed by row, each (row node, later node) in original indices.
 * Simple, undirected. O(n log n + m).
 * @param options - expectedDegrees and seed
 * @returns the undirected graph
 */
export function chungLuGraph(options: ChungLuOptions): SampleGraph {
    return runPlan(planChungLu(options), undefined, options);
}

/** Options of {@link degreeCorrectedSbmGraph}. */
export interface DegreeCorrectedSbmOptions extends WeightOptions {
    /** The size of every block; block b holds the next `sizes[b]` node indices. */
    sizes: readonly number[];
    /** The target degree of every node, finite and >= 0; length = the sum of sizes. */
    expectedDegrees: ArrayLike<number>;
    /** The mixing parameter mu in [0, 1]: the share of each node's edges that leave its block. */
    mixing: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Check DC-SBM options and build the plan.
 * @param options - the options
 * @returns the plan
 */
export function planDegreeCorrectedSbm(options: DegreeCorrectedSbmOptions): ExpectedDegreePlan {
    const { sizes, expectedDegrees, mixing } = options;
    const seed = resolveSeed(options.seed);
    checkInt("sizes.length", sizes.length, 1);
    checkProbability("mixing", mixing);
    const total = weightSum(expectedDegrees);
    const starts = [0];
    for (let b = 0; b < sizes.length; b++) {
        checkInt(`sizes[${b}]`, sizes[b], 0);
        starts.push(starts[b] + sizes[b]);
    }
    if (starts[sizes.length] !== expectedDegrees.length) {
        throw new RangeError(
            `the sizes sum to ${starts[sizes.length]}, but expectedDegrees has ${expectedDegrees.length} entries`,
        );
    }
    const kappa = sizes.map((_, b) => {
        let k = 0;
        for (let i = starts[b]; i < starts[b + 1]; i++) {
            k += expectedDegrees[i];
        }
        return k;
    });
    const between = total > 0 ? mixing / total : 0;
    const inside = kappa.map((kr) => (kr > 0 ? (1 - mixing) / kr : 0));
    const factor = kappa.map((_, r) => kappa.map((_2, s) => (r === s ? inside[r] : between)));
    return planRows(expectedDegrees, starts, factor, seed, "dcsbm", total);
}

/**
 * The degree-corrected stochastic block model (B. Karrer and M. E. J. Newman, "Stochastic
 * blockmodels and community structure in networks", Phys. Rev. E 83, 016107, 2011,
 * doi:10.1103/PhysRevE.83.016107), sampled as a simple graph with Bernoulli edges:
 * P(uv) = min(1, theta_u theta_v omega_rs) with theta_u = d_u / kappa_r (kappa_r the degree total of
 * u's block r, K the grand total), omega_rr = (1 - mu) kappa_r and omega_rs = mu kappa_r kappa_s / K
 * for r != s. So node u's expected degree is about d_u (1 - mu kappa_r / K): the inside share is
 * 1 - mu, but the outside share misses the mu kappa_r / K that would land in u's own block.
 * Rows: block by block, inside a block the nodes sorted by d descending (ties by index); row i
 * draws from stream (seed, "dcsbm", i) and walks its own block's later rows, then every later
 * block (see {@link chungLuRows}). Edges are listed by row in original node indices. Node column
 * `community` (u32). With one block and mu = 0 it is Chung-Lu. O(n log n + n B + m).
 * @param options - sizes, expectedDegrees, mixing and seed
 * @returns the undirected graph
 */
export function degreeCorrectedSbmGraph(options: DegreeCorrectedSbmOptions): SampleGraph {
    const plan = planDegreeCorrectedSbm(options);
    const community = new Uint32Array(plan.n);
    for (let b = 0; b + 1 < plan.starts.length; b++) {
        community.fill(b, plan.starts[b], plan.starts[b + 1]);
    }
    return runPlan(plan, { community }, options);
}

/** Options of {@link randomRegularGraph}. */
export interface RandomRegularOptions extends WeightOptions {
    /** The node count, >= 0. */
    n: number;
    /** The degree of every node, in [0, n - 1]; n d must be even. */
    d: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/** Attempts before randomRegularGraph gives up. */
const REGULAR_ATTEMPTS = 100;
/** Re-pairing rounds inside one attempt before it counts as failed. */
const REGULAR_ROUNDS = 1000;

/**
 * One attempt of the Steger-Wormald pairing; fills `adj` (d slots per node) and `deg`.
 * @param n - the node count
 * @param d - the degree
 * @param stream - the attempt's stream
 * @param adj - the adjacency slots
 * @param deg - the filled slot count per node
 * @returns true on success
 */
function regularAttempt(n: number, d: number, stream: RandomStream, adj: U32, deg: U32): boolean {
    deg.fill(0);
    const has = (u: number, v: number): boolean => {
        const base = u * d;
        for (let k = base; k < base + deg[u]; k++) {
            if (adj[k] === v) {
                return true;
            }
        }
        return false;
    };
    const potential = new Uint32Array(n);
    let stubs: U32 = stubList(new Uint32Array(n).fill(d), n * d);
    for (let round = 0; round < REGULAR_ROUNDS && stubs.length > 0; round++) {
        shuffle(stubs, stream);
        const touched: number[] = [];
        for (let k = 0; k < stubs.length; k += 2) {
            const u = Math.min(stubs[k], stubs[k + 1]);
            const v = Math.max(stubs[k], stubs[k + 1]);
            if (u !== v && !has(u, v)) {
                adj[u * d + deg[u]++] = v;
                adj[v * d + deg[v]++] = u;
            } else {
                for (const x of [u, v]) {
                    if (potential[x]++ === 0) {
                        touched.push(x);
                    }
                }
            }
        }
        touched.sort((a, b) => a - b);
        // suitable: some pair of distinct leftover nodes is not yet an edge
        let suitable = touched.length === 0;
        for (let i = 0; i < touched.length && !suitable; i++) {
            for (let j = i + 1; j < touched.length && !suitable; j++) {
                suitable = !has(touched[i], touched[j]);
            }
        }
        if (!suitable) {
            return false;
        }
        let total = 0;
        for (const x of touched) {
            total += potential[x];
        }
        const next = new Uint32Array(total);
        let k = 0;
        for (const x of touched) {
            next.fill(x, k, k + potential[x]);
            k += potential[x];
            potential[x] = 0;
        }
        stubs = next;
    }
    return stubs.length === 0;
}

/**
 * A uniformly-ish random d-regular simple graph by the pairing algorithm of A. Steger and
 * N. C. Wormald, "Generating random regular graphs quickly", Combin. Probab. Comput. 8, 377-396,
 * 1999, doi:10.1017/S0963548399003867, structured like networkx's `random_regular_graph`: attempt
 * a (a = 0, 1, ...) draws from stream (seed, "random-regular", a); it Fisher-Yates shuffles the
 * stub list (node i repeated d times, ascending), keeps each consecutive pair that is not a loop
 * and not yet an edge, and re-pairs the leftover stubs (ascending node order) while some leftover
 * pair could still be joined; otherwise it restarts. At most 100 attempts of at most 1000 rounds,
 * then a RangeError. Edges (u, v), u < v, in lexicographic order. Expected O(n d^2) for small d.
 * @param options - n, d and seed
 * @returns the undirected graph
 */
export function randomRegularGraph(options: RandomRegularOptions): SampleGraph {
    const { n, d } = options;
    const seed = resolveSeed(options.seed);
    checkInt("n", n, 0);
    checkInt("d", d, 0, Math.max(0, n - 1));
    if ((n * d) % 2 !== 0) {
        throw new RangeError(`n * d must be even, got ${n} * ${d}`);
    }
    checkEdgeCount((n * d) / 2);
    const out = new EdgeBuffer((n * d) / 2);
    if (d > 0) {
        const adj = new Uint32Array(n * d);
        const deg = new Uint32Array(n);
        const stream = new RandomStream(seed, "random-regular", 0);
        let attempt = 0;
        for (; attempt < REGULAR_ATTEMPTS; attempt++) {
            stream.reset(attempt);
            if (regularAttempt(n, d, stream, adj, deg)) {
                break;
            }
        }
        if (attempt === REGULAR_ATTEMPTS) {
            throw new RangeError(`randomRegularGraph found no ${d}-regular graph on ${n} nodes in ${REGULAR_ATTEMPTS} attempts`);
        }
        for (let u = 0; u < n; u++) {
            const row = adj.subarray(u * d, u * d + d).sort();
            for (const v of row) {
                if (v > u) {
                    out.push(u, v);
                }
            }
        }
    }
    return applyWeights(toGraph(n, out, false), options);
}
