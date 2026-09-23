/**
 * Random graph generation function: a deprecated alias of @graphty/graph-samples/generators.
 */

import { erdosRenyiGraph } from "@graphty/graph-samples/generators";

import { type Graph } from "../types";
import { sampleCount, sampleProbability, sampleSeed, toLayoutGraph } from "./sample";

/**
 * Create a random graph with n nodes and given edge probability: the Erdos-Renyi G(n, p) of
 * graph-samples, edges (i, j) with i < j in row order. The same seed gives the same graph on every
 * platform. Without a seed each call draws one from Math.random, so each call gives a different
 * graph; a negative, fractional or oversized seed maps to |trunc(seed)| mod 2^53, a non-finite one
 * to 0. p is clamped to [0, 1].
 * @deprecated Use `erdosRenyiGraph({ n, p, seed })` from `@graphty/graph-samples/generators`;
 * removed in layout's next major.
 * @param n - Number of nodes
 * @param p - Probability of edge between any two nodes (0-1)
 * @param seed - Random seed for reproducibility
 * @returns Graph object with random edges
 */
export function randomGraph(n: number, p: number, seed?: number): Graph {
    return toLayoutGraph(
        erdosRenyiGraph({ n: sampleCount(n), p: sampleProbability(p), seed: sampleSeed(seed) }),
    );
}
