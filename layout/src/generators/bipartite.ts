/**
 * Bipartite graph generation function: a deprecated alias of @graphty/graph-samples/generators.
 */

import { randomBipartiteGraph } from "@graphty/graph-samples/generators";

import { type Graph, type Node } from "../types";
import { sampleCount, sampleProbability, sampleSeed, toLayoutGraph } from "./sample";

/**
 * Create a bipartite graph with two sets of nodes, "A0" .. and "B0" .., each A-B pair joined with
 * probability p; edges run from set A to set B, row by row. Seeds behave as in `randomGraph`: the
 * same seed gives the same graph, no seed a different graph per call, and a negative, fractional or
 * non-finite seed maps to a valid one. p is clamped to [0, 1].
 * @deprecated Use `randomBipartiteGraph({ n1, n2, p, seed })` from
 * `@graphty/graph-samples/generators` (node i there is "A" + i below n1, else "B" + (i - n1));
 * removed in layout's next major.
 * @param n1 - Number of nodes in first set
 * @param n2 - Number of nodes in second set
 * @param p - Probability of edge between nodes in different sets
 * @param seed - Random seed for reproducibility
 * @returns Graph object with bipartite structure and setA/setB properties
 */
export function bipartiteGraph(
    n1: number,
    n2: number,
    p: number,
    seed?: number,
): Graph & { setA: Node[]; setB: Node[] } {
    const a = sampleCount(n1);
    const graph = toLayoutGraph(
        randomBipartiteGraph({ n1: a, n2: sampleCount(n2), p: sampleProbability(p), seed: sampleSeed(seed) }),
        (i) => (i < a ? `A${i}` : `B${i - a}`),
    );
    const nodes = graph.nodes();
    return { ...graph, setA: nodes.slice(0, a), setB: nodes.slice(a) };
}
