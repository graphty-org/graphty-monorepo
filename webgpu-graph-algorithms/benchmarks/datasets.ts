/**
 * Synthetic inputs of the benchmarks (spec 11.7; contract 6.2): seeded edge arrays in the `fromEdgeArrays` input shape --
 * graph-format's G(n, m) generator (self-loops and parallels allowed, integer weights 1..10), an R-MAT-like hub graph, a
 * grid, and Zachary's karate club -- plus the design-15.3 tiers and a snapshot builder. Every generator is seeded, so the
 * inputs are identical across runs and hosts.
 */

import { type F32, fromEdgeArrays, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { KARATE_EDGES as KARATE_PAIRS } from "../test/helpers/graphs.js";
import { makeRandom } from "./harness.js";

/**
 * A graph as parallel typed arrays, the `fromEdgeArrays` input shape.
 * @public consumed by P3-T7's benchmarks/layout-exact.bench.ts and layout-run.ts (contract 6.3); referenced only
 * through the generators' return types inside this file at P1
 */
export interface EdgeArrays {
    /** Node count. */
    readonly nodeCount: number;
    /** Source node index of every edge. */
    readonly src: U32;
    /** Target node index of every edge. */
    readonly dst: U32;
    /** Weights; integers 1..10 from the random generators, 1 for the grid and karate. */
    readonly weights: F32;
}

/**
 * G(n, m) with self-loops and parallels, weights 1..10 (graph-format's).
 * @param nodeCount - the node count
 * @param edgeCount - the edge count
 * @param seed - the generator seed (default 12345, graph-format's)
 * @returns the edge arrays
 */
export function randomEdges(nodeCount: number, edgeCount: number, seed?: number | undefined): EdgeArrays {
    const random = makeRandom(seed ?? 12345);
    const src = new Uint32Array(edgeCount);
    const dst = new Uint32Array(edgeCount);
    const weights = new Float32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        src[e] = Math.floor(random() * nodeCount);
        dst[e] = Math.floor(random() * nodeCount);
        weights[e] = 1 + Math.floor(random() * 10);
    }
    return { nodeCount, src, dst, weights };
}

/**
 * R-MAT-like hub graph (0.57 / 0.19 / 0.19 / 0.05), no self-loops: 2^scale nodes, edgeFactor edges per node, each edge
 * placed by `scale` quadrant draws (the Chakrabarti / Zhan / Faloutsos recursion), a self-loop moved to (v + 1) % n as the
 * gpu-upload.test.ts generator does. Weights 1..10.
 * @public consumed by the P3-T7 layout-exact group and layout-run.ts (contract 6.3); test/benchmarks.test.ts pins it
 * @param scale - log2 of the node count
 * @param edgeFactor - edges per node
 * @param seed - the generator seed (default 12345)
 * @returns the edge arrays
 */
export function rmatEdges(scale: number, edgeFactor: number, seed?: number | undefined): EdgeArrays {
    const nodeCount = 2 ** scale;
    const edgeCount = nodeCount * edgeFactor;
    const random = makeRandom(seed ?? 12345);
    const src = new Uint32Array(edgeCount);
    const dst = new Uint32Array(edgeCount);
    const weights = new Float32Array(edgeCount);
    for (let e = 0; e < edgeCount; e++) {
        let u = 0;
        let v = 0;
        for (let level = 0; level < scale; level++) {
            const r = random();
            let bitU = 0;
            let bitV = 0;
            if (r < 0.57) {
                bitU = 0;
                bitV = 0;
            } else if (r < 0.76) {
                bitU = 0;
                bitV = 1;
            } else if (r < 0.95) {
                bitU = 1;
                bitV = 0;
            } else {
                bitU = 1;
                bitV = 1;
            }
            u = u * 2 + bitU;
            v = v * 2 + bitV;
        }
        if (u === v) {
            v = (v + 1) % nodeCount;
        }
        src[e] = u;
        dst[e] = v;
        weights[e] = 1 + Math.floor(random() * 10);
    }
    return { nodeCount, src, dst, weights };
}

/**
 * A w x h grid (4-neighbour), row-major node indices, in graph-format's edge order (right, then down, per node).
 * @public consumed by the P3-T7 layout-exact group (contract 6.3); test/benchmarks.test.ts pins it
 * @param w - columns
 * @param h - rows
 * @returns the edge arrays (unit weights)
 */
export function gridEdges(w: number, h: number): EdgeArrays {
    const pairs: number[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = y * w + x;
            if (x + 1 < w) {
                pairs.push(u, u + 1);
            }
            if (y + 1 < h) {
                pairs.push(u, u + w);
            }
        }
    }
    const edgeCount = pairs.length / 2;
    const src = new Uint32Array(edgeCount);
    const dst = new Uint32Array(edgeCount);
    const weights = new Float32Array(edgeCount).fill(1);
    for (let e = 0; e < edgeCount; e++) {
        src[e] = pairs[2 * e];
        dst[e] = pairs[2 * e + 1];
    }
    return { nodeCount: w * h, src, dst, weights };
}

/**
 * Zachary's karate club as EdgeArrays (unit weights), from the one copy of the 78 edges in test/helpers/graphs.ts.
 * @public consumed by the P3-T7 layout-exact group (contract 6.3); test/benchmarks.test.ts pins it
 */
export const KARATE_EDGES: EdgeArrays = {
    nodeCount: 34,
    src: Uint32Array.from(KARATE_PAIRS, (pair) => pair[0]),
    dst: Uint32Array.from(KARATE_PAIRS, (pair) => pair[1]),
    weights: new Float32Array(KARATE_PAIRS.length).fill(1),
};

/** The design-15.3 tiers as (nodes, edges) pairs: 10k/100k, 100k/1M, 1M/10M. */
export const TIERS: readonly { readonly name: string; readonly nodes: number; readonly edges: number }[] = [
    { name: "10k/100k", nodes: 10_000, edges: 100_000 },
    { name: "100k/1M", nodes: 100_000, edges: 1_000_000 },
    { name: "1M/10M", nodes: 1_000_000, edges: 10_000_000 },
];

/**
 * An undirected weighted fromEdgeArrays snapshot of an EdgeArrays.
 * @param edges - the edge arrays
 * @param options - `directed` (default false) and the snapshot label
 * @returns the snapshot (arena path: fromEdgeArrays freezes with `arena: true`)
 */
export function snapshotOf(
    edges: EdgeArrays,
    options?: { readonly directed?: boolean | undefined; readonly label?: string | undefined } | undefined,
): GraphSnapshot {
    return fromEdgeArrays(
        {
            directed: options?.directed ?? false,
            nodeCount: edges.nodeCount,
            src: edges.src,
            dst: edges.dst,
            weights: edges.weights,
        },
        options?.label === undefined ? {} : { label: options.label },
    );
}
