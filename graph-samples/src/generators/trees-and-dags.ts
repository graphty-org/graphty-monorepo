/**
 * Random trees and random directed acyclic graphs.
 */

import { type U32 } from "@graphty/graph-format";

import { detLog } from "../random/log.js";
import { checkSeed, RandomStream } from "../random/stream.js";
import { type SampleGraph } from "../types.js";
import { bernoulliSegment, binomialBuffer, checkInt, checkProbability, EdgeBuffer, toGraph } from "./util.js";

/** Options of {@link randomTreeGraph}. */
export interface RandomTreeOptions {
    /** The node count, >= 1. */
    n: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * A uniformly random labelled tree: a uniformly random Pruefer sequence (H. Pruefer, Archiv der
 * Mathematik und Physik 27, 142-144, 1918) of n - 2 draws nextBelow(n) from stream (seed,
 * "prufer", 0), decoded in O(n). Edge k joins the k-th removed leaf to its neighbour; the last
 * edge is (leaf, n - 1).
 * @param options - n and seed
 * @returns the undirected tree
 */
export function randomTreeGraph(options: RandomTreeOptions): SampleGraph {
    const { n, seed } = options;
    checkInt("n", n, 1);
    checkSeed(seed);
    const out = new EdgeBuffer(n);
    if (n === 1) {
        return toGraph(1, out, false);
    }
    const stream = new RandomStream(seed, "prufer", 0);
    const code = new Uint32Array(n - 2);
    const degree = new Uint32Array(n).fill(1);
    for (let i = 0; i < n - 2; i++) {
        code[i] = stream.nextBelow(n);
        degree[code[i]]++;
    }
    let ptr = 0;
    while (degree[ptr] !== 1) {
        ptr++;
    }
    let leaf = ptr;
    for (let i = 0; i < n - 2; i++) {
        const v = code[i];
        out.push(leaf, v);
        degree[v]--;
        if (degree[v] === 1 && v < ptr) {
            leaf = v;
        } else {
            ptr++;
            while (degree[ptr] !== 1) {
                ptr++;
            }
            leaf = ptr;
        }
    }
    out.push(leaf, n - 1);
    return toGraph(n, out, false);
}

/** Options of {@link randomDagGraph}. */
export interface RandomDagOptions {
    /** The width of every layer, top to bottom; layer i holds the next `layers[i]` node indices. */
    layers: readonly number[];
    /** The probability of each arc from a node to a node of the next layer. */
    p: number;
    /** The seed, an integer in [0, 2^53). */
    seed: number;
}

/**
 * Rows [start, end) of the layered DAG: node u of layer i < L - 1 draws from stream (seed,
 * "layered-dag", u) and holds the arcs to the chosen nodes of layer i + 1, ascending.
 * @param starts - starts[i] = first node of layer i; starts[L] = n
 * @param layerOf - the layer of every node
 * @param p - the probability
 * @param seed - the seed
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the arcs
 */
export function dagRows(
    starts: readonly number[],
    layerOf: U32,
    p: number,
    seed: number,
    start: number,
    end: number,
    out: EdgeBuffer,
): void {
    const logQ = detLog(1 - p);
    const stream = new RandomStream(seed, "layered-dag", 0);
    const last = starts.length - 2;
    for (let u = start; u < end; u++) {
        const layer = layerOf[u];
        if (layer < last) {
            stream.reset(u);
            bernoulliSegment(stream, p, logQ, u, starts[layer + 1], starts[layer + 2], out);
        }
    }
}

/**
 * A random layered DAG: arcs only from layer i to layer i + 1, each independently with
 * probability p, O(n + m). The standard input for layered (Sugiyama) drawing, topological sort
 * and longest path. Arcs are listed by source node, targets ascending. Node column `layer` (u32).
 * @param options - layers, p and seed
 * @returns the directed graph
 */
export function randomDagGraph(options: RandomDagOptions): SampleGraph {
    const { layers, p, seed } = options;
    checkInt("layers.length", layers.length, 1);
    checkProbability("p", p);
    checkSeed(seed);
    const starts = [0];
    let pairs = 0;
    for (let i = 0; i < layers.length; i++) {
        checkInt(`layers[${i}]`, layers[i], 0);
        starts.push(starts[i] + layers[i]);
        if (i > 0) {
            pairs += layers[i - 1] * layers[i];
        }
    }
    const n = starts[layers.length];
    checkInt("the total size", n, 0);
    const layerOf = new Uint32Array(n);
    for (let i = 0; i < layers.length; i++) {
        layerOf.fill(i, starts[i], starts[i + 1]);
    }
    const out = binomialBuffer(pairs, p);
    dagRows(starts, layerOf, p, seed, 0, n, out);
    return toGraph(n, out, true, { layer: layerOf });
}
