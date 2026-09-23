/**
 * Stochastic block models (P. W. Holland, K. B. Laskey and S. Leinhardt, "Stochastic blockmodels:
 * first steps", Social Networks 5, 109-137, 1983) and the planted partition model (A. Condon and
 * R. M. Karp, Random Structures and Algorithms 18, 116-140, 2001), with the planted blocks emitted
 * as ground truth.
 */

import { type U32 } from "@graphty/graph-format";

import { detLog } from "../random/log.js";
import { checkSeed, RandomStream } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { bernoulliSegment, binomialBuffer, checkInt, checkProbability, type EdgeBuffer, toGraph } from "./util.js";

/** Options of {@link stochasticBlockModelGraph}. */
export interface StochasticBlockModelOptions {
    /** The size of every block; block b holds the next `sizes[b]` node indices. */
    sizes: readonly number[];
    /** The symmetric B x B matrix of edge probabilities between blocks. */
    probabilities: readonly (readonly number[])[];
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/** The checked and precomputed form of the options. */
interface BlockPlan {
    readonly n: number;
    readonly seed: number;
    /** starts[b] = first node of block b; starts[B] = n. */
    readonly starts: readonly number[];
    readonly block: U32;
    readonly p: readonly (readonly number[])[];
    readonly logQ: readonly (readonly number[])[];
}

/**
 * Check the options and precompute block boundaries and detLog(1 - p).
 * @param options - the options
 * @returns the plan
 */
export function planBlocks(options: StochasticBlockModelOptions): BlockPlan {
    const { sizes, probabilities, seed } = options;
    checkSeed(seed);
    const count = sizes.length;
    checkInt("sizes.length", count, 1);
    if (probabilities.length !== count) {
        throw new RangeError(`probabilities must be ${count} x ${count}`);
    }
    const starts = [0];
    for (let b = 0; b < count; b++) {
        checkInt(`sizes[${b}]`, sizes[b], 0);
        starts.push(starts[b] + sizes[b]);
        if (probabilities[b].length !== count) {
            throw new RangeError(`probabilities must be ${count} x ${count}`);
        }
        for (let c = 0; c < count; c++) {
            checkProbability(`probabilities[${b}][${c}]`, probabilities[b][c]);
            if (probabilities[b][c] !== probabilities[c][b]) {
                throw new RangeError(`probabilities must be symmetric: [${b}][${c}] differs from [${c}][${b}]`);
            }
        }
    }
    const n = starts[count];
    checkInt("the total size", n, 0);
    const block = new Uint32Array(n);
    for (let b = 0; b < count; b++) {
        block.fill(b, starts[b], starts[b + 1]);
    }
    return {
        n,
        seed,
        starts,
        block,
        p: probabilities,
        logQ: probabilities.map((row) => row.map((p) => detLog(1 - p))),
    };
}

/**
 * Rows [start, end) of the block model: row u (in block b) draws from stream (seed, "sbm", u) and
 * walks blocks c = b .. B - 1 in order, holding the pairs (u, v) for v > u in block c with
 * probability p[b][c], ascending v. Concatenating consecutive row ranges gives the whole graph.
 * @param plan - the checked options
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function blockModelRows(plan: BlockPlan, start: number, end: number, out: EdgeBuffer): void {
    const { starts, block, p, logQ } = plan;
    const stream = new RandomStream(plan.seed, "sbm", 0);
    const count = starts.length - 1;
    for (let u = start; u < end; u++) {
        stream.reset(u);
        const b = block[u];
        // ponytail: O(B) per row, fine to n * B ~ 1e8; iterate only non-zero blocks if B grows large
        for (let c = b; c < count; c++) {
            bernoulliSegment(stream, p[b][c], logQ[b][c], u, c === b ? u + 1 : starts[c], starts[c + 1], out);
        }
    }
}

/**
 * The stochastic block model in O(n B + m): node pairs are joined independently with the
 * probability of their blocks, by geometric skipping inside each row's block segments. Edges are
 * the pairs (u, v), u < v, row-major. Node column `community` (u32): the block.
 * @param options - sizes, probabilities and seed
 * @returns the undirected graph
 */
export function stochasticBlockModelGraph(options: StochasticBlockModelOptions): SampleGraph {
    const plan = planBlocks(options);
    let expected = 0;
    let pairs = 0;
    for (let b = 0; b < plan.starts.length - 1; b++) {
        for (let c = b; c < plan.starts.length - 1; c++) {
            const sb = plan.starts[b + 1] - plan.starts[b];
            const sc = plan.starts[c + 1] - plan.starts[c];
            const blockPairs = b === c ? (sb * (sb - 1)) / 2 : sb * sc;
            expected += blockPairs * plan.p[b][c];
            pairs += blockPairs;
        }
    }
    const out = binomialBuffer(pairs, pairs === 0 ? 0 : expected / pairs);
    blockModelRows(plan, 0, plan.n, out);
    return toGraph(plan.n, out, false, { community: plan.block });
}

/** Options of {@link plantedPartitionGraph}. */
export interface PlantedPartitionOptions {
    /** The number of groups, >= 1. */
    groups: number;
    /** The size of every group, >= 1. */
    groupSize: number;
    /** The edge probability inside a group. */
    pIn: number;
    /** The edge probability between groups. */
    pOut: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * The planted partition model: `groups` equal blocks, `pIn` inside, `pOut` between. Exactly the
 * stochastic block model with that matrix (same seed, same graph). Node column `community` (u32).
 * @param options - groups, groupSize, pIn, pOut and seed
 * @returns the undirected graph
 */
export function plantedPartitionGraph(options: PlantedPartitionOptions): SampleGraph {
    const { groups, groupSize, pIn, pOut, seed } = options;
    checkInt("groups", groups, 1);
    checkInt("groupSize", groupSize, 1);
    return stochasticBlockModelGraph({
        sizes: new Array<number>(groups).fill(groupSize),
        probabilities: Array.from({ length: groups }, (_, b) =>
            Array.from({ length: groups }, (_2, c) => (b === c ? pIn : pOut)),
        ),
        seed,
    });
}
