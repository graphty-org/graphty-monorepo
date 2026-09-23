/**
 * Scale-free graph generation function: a deprecated alias of @graphty/graph-samples/generators.
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";

import { type Graph } from "../types";
import { listGraph, sampleCount, sampleSeed, toLayoutGraph } from "./sample";

/**
 * Create a scale-free graph using the Barabasi-Albert model of graph-samples: m isolated seed
 * nodes, then each new node joins m distinct existing nodes by preferential attachment, giving
 * (n - m) * m edges. Seeds behave as in `randomGraph`. m = 0 gives n isolated nodes.
 * @deprecated Use `barabasiAlbertGraph({ n, m, seed })` from `@graphty/graph-samples/generators`;
 * removed in layout's next major.
 * @param n - Total number of nodes
 * @param m - Number of edges to attach from new node
 * @param seed - Random seed for reproducibility
 * @returns Graph object with scale-free properties
 * @throws Error when m >= n
 */
export function scaleFreeGraph(n: number, m: number, seed?: number): Graph {
    if (m >= n) {
        throw new Error("m must be less than n");
    }
    const size = sampleCount(n);
    const edgesPerNode = sampleCount(m);
    if (edgesPerNode === 0) {
        return listGraph(Array.from({ length: size }, (_, i) => i), []);
    }
    return toLayoutGraph(barabasiAlbertGraph({ n: size, m: edgesPerNode, seed: sampleSeed(seed) }));
}
