/**
 * The LFR community-detection benchmark: power-law degrees, power-law community sizes and a
 * mixing parameter, with the planted communities as ground truth.
 */

import { RandomStream, resolveSeed } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { makeSumEven, pairStubs, powerLawSampler, shuffle, stubList } from "./degree-sequence.js";
import { checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** The largest LFR graph. */
const MAX_LFR_NODES = 1_000_000;

/** Options of {@link lfrGraph}. */
export interface LfrOptions extends WeightOptions {
    /** The node count, in [1, 1,000,000]. */
    n: number;
    /** The smallest degree, >= 1. */
    minDegree: number;
    /** The largest degree, in [minDegree, n - 1]. */
    maxDegree: number;
    /** The degree power-law exponent (tau1), a finite number >= 0, typically 2 to 3. */
    degreeExponent: number;
    /** The smallest community, >= 1. */
    minCommunity: number;
    /** The largest community, in [minCommunity, n]. */
    maxCommunity: number;
    /** The community-size power-law exponent (tau2), a finite number >= 0, typically 1 to 2. */
    communityExponent: number;
    /** The mixing parameter mu in [0, 1]: the share of each node's edges that leave its community. */
    mixing: number;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/**
 * Community sizes from the power law on [min, max] summing to exactly n: draw sizes from stream
 * (seed, "lfr-sizes", 0) until their sum reaches n; if k sizes of at least `min` no longer fit n,
 * drop the last draw and grow sizes from the last one backwards (each up to max) to close the gap,
 * otherwise shrink them from the last one backwards (each down to min) to remove the excess.
 * @param n - the node count
 * @param min - the smallest size
 * @param max - the largest size
 * @param sample - the power-law sampler
 * @param seed - the seed
 * @returns the sizes
 */
function communitySizes(
    n: number,
    min: number,
    max: number,
    sample: (stream: RandomStream) => number,
    seed: number,
): number[] {
    if (Math.ceil(n / max) * min > n) {
        throw new RangeError(`there is no partition of ${n} nodes into communities of ${min} to ${max} nodes`);
    }
    const stream = new RandomStream(seed, "lfr-sizes", 0);
    const sizes: number[] = [];
    let excess = -n;
    while (excess < 0) {
        const s = sample(stream);
        sizes.push(s);
        excess += s;
    }
    if (sizes.length * min > n) {
        excess -= sizes[sizes.length - 1];
        sizes.pop();
    }
    // the feasibility check above guarantees these loops close the gap exactly
    for (let i = sizes.length - 1; i >= 0 && excess !== 0; i--) {
        const change = excess > 0 ? -Math.min(excess, sizes[i] - min) : Math.min(-excess, max - sizes[i]);
        sizes[i] += change;
        excess += change;
    }
    return sizes;
}

/**
 * Assign every node a community larger than its internal degree: nodes by internal degree
 * descending (ties by index), each to a uniform choice (nextBelow of stream (seed, "lfr-assign", 0))
 * among the communities with room whose size exceeds its internal degree. The communities that fit
 * only grow as the internal degree falls, so this fails exactly when no assignment exists.
 * @param internal - the internal degree of every node
 * @param sizes - the community sizes (summing to the node count)
 * @param seed - the seed
 * @returns the community of every node
 */
function assignCommunities(internal: Uint32Array, sizes: readonly number[], seed: number): Uint32Array<ArrayBuffer> {
    const n = internal.length;
    const nodes = Uint32Array.from({ length: n }, (_, i) => i).sort((a, b) => internal[b] - internal[a] || a - b);
    const bySize = Uint32Array.from(sizes, (_, i) => i).sort((a, b) => sizes[b] - sizes[a] || a - b);
    const room = sizes.slice();
    const open: number[] = [];
    const community = new Uint32Array(n);
    const stream = new RandomStream(seed, "lfr-assign", 0);
    let next = 0;
    for (const node of nodes) {
        while (next < bySize.length && sizes[bySize[next]] > internal[node]) {
            open.push(bySize[next++]);
        }
        if (open.length === 0) {
            throw new RangeError(
                `could not assign communities: node ${node} needs a community of more than ${internal[node]} nodes; ` +
                    `raise maxCommunity or mixing, or lower maxDegree`,
            );
        }
        const j = stream.nextBelow(open.length);
        const c = open[j];
        community[node] = c;
        if (--room[c] === 0) {
            open[j] = open[open.length - 1];
            open.pop();
        }
    }
    return community;
}

/**
 * The LFR benchmark (A. Lancichinetti, S. Fortunato and F. Radicchi, "Benchmark graphs for testing
 * community detection algorithms", Phys. Rev. E 78, 046110, 2008,
 * doi:10.1103/PhysRevE.78.046110), built with configuration models:
 *
 * 1. Degrees: node i's degree is the i-th power-law draw on [minDegree, maxDegree] from stream
 *    (seed, "lfr-degrees", 0); an odd sum is fixed on the last node as in powerLawDegreeSequence.
 * 2. Community sizes: power law on [minCommunity, maxCommunity] summing to exactly n (stream
 *    "lfr-sizes"); community ids are the draw order.
 * 3. Internal degree round((1 - mu) d); assignment of nodes to communities larger than their
 *    internal degree (stream "lfr-assign"); a RangeError when none exists.
 * 4. Inside each community c, ascending: when its internal degrees sum to an odd number the member
 *    with the largest (lowest index on ties) moves one stub to the outside; then a configuration
 *    model on the members' ascending stub list shuffled with stream (seed, "lfr-internal", c).
 * 5. Outside: a configuration model on the remaining degrees d - internal, stream
 *    (seed, "lfr-external", 0).
 *
 * Self-loops and repeated pairs are erased, and so are external pairs that land inside one
 * community, so degrees and the mixing come out approximate: the mean degree drops by up to about
 * 10% (repeated pairs inside small communities), and the measured mixing lands within about 0.02 of
 * mu for thousands of nodes. No edge switching repairs this. Edges: every community's internal
 * edges (communities ascending, pair order), then the external edges. Node column `community` (u32).
 * O(n log n + m); n at most 1,000,000.
 * @param options - n, degree and community power laws, mixing and seed
 * @returns the undirected graph
 */
export function lfrGraph(options: LfrOptions): SampleGraph {
    const { n, minDegree, maxDegree, minCommunity, maxCommunity, mixing } = options;
    const seed = resolveSeed(options.seed);
    checkInt("n", n, 1, MAX_LFR_NODES);
    checkInt("maxDegree", maxDegree, 1, n - 1);
    checkProbability("mixing", mixing);
    checkInt("maxCommunity", maxCommunity, 1, n);
    const degreeOf = powerLawSampler(
        ["degreeExponent", "minDegree", "maxDegree"],
        options.degreeExponent,
        minDegree,
        maxDegree,
    );
    const sizeOf = powerLawSampler(
        ["communityExponent", "minCommunity", "maxCommunity"],
        options.communityExponent,
        minCommunity,
        maxCommunity,
    );

    const degree = new Uint32Array(n);
    const degreeStream = new RandomStream(seed, "lfr-degrees", 0);
    for (let i = 0; i < n; i++) {
        degree[i] = degreeOf(degreeStream);
    }
    makeSumEven(degree, minDegree, maxDegree);
    const sizes = communitySizes(n, minCommunity, maxCommunity, sizeOf, seed);
    const internal = Uint32Array.from(degree, (d) => Math.round((1 - mixing) * d));
    const community = assignCommunities(internal, sizes, seed);

    // members of every community, ascending, by a counting sort
    const start = new Uint32Array(sizes.length + 1);
    for (let c = 0; c < sizes.length; c++) {
        start[c + 1] = start[c] + sizes[c];
    }
    const fill = start.slice(0, sizes.length);
    const members = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        members[fill[community[i]]++] = i;
    }

    let total = 0;
    for (const d of degree) {
        total += d;
    }
    const out = new EdgeBuffer(total / 2);
    const stream = new RandomStream(seed, "lfr-internal", 0);
    for (let c = 0; c < sizes.length; c++) {
        const group = members.subarray(start[c], start[c + 1]);
        const k = Uint32Array.from(group, (i) => internal[i]);
        let sum = 0;
        let largest = 0;
        for (let j = 0; j < k.length; j++) {
            sum += k[j];
            if (k[j] > k[largest]) {
                largest = j;
            }
        }
        if (sum % 2 === 1) {
            k[largest]--;
            internal[group[largest]]--;
            sum--;
        }
        const stubs = stubList(k, sum);
        for (let j = 0; j < stubs.length; j++) {
            stubs[j] = group[stubs[j]];
        }
        stream.reset(c);
        shuffle(stubs, stream);
        pairStubs(n, stubs, false, false, out);
    }

    const external = Uint32Array.from(degree, (d, i) => d - internal[i]);
    let externalTotal = 0;
    for (const d of external) {
        externalTotal += d;
    }
    const stubs = stubList(external, externalTotal);
    shuffle(stubs, new RandomStream(seed, "lfr-external", 0));
    pairStubs(n, stubs, false, false, out, community);
    return applyWeights(toGraph(n, out, false, { community }), options);
}
