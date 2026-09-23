/**
 * Basic graph generation functions: deprecated aliases of @graphty/graph-samples/generators.
 */

import {
    completeGraph as sampleCompleteGraph,
    cycleGraph as sampleCycleGraph,
    starGraph as sampleStarGraph,
    wheelGraph as sampleWheelGraph,
} from "@graphty/graph-samples/generators";

import { type Edge, type Graph } from "../types";
import { listGraph, sampleCount, toLayoutGraph } from "./sample";

/**
 * Create a complete graph with n nodes
 * @deprecated Use `completeGraph({ n })` from `@graphty/graph-samples/generators`; removed in
 * layout's next major.
 * @param n - Number of nodes
 * @returns Graph object with all nodes connected to all other nodes
 */
export function completeGraph(n: number): Graph {
    return toLayoutGraph(sampleCompleteGraph({ n: sampleCount(n) }));
}

/**
 * Create a cycle graph with n nodes. Below 3 nodes it keeps its historical edges (i, (i + 1) mod n):
 * a self-loop at n = 1 and the edge twice at n = 2.
 * @deprecated Use `cycleGraph({ n })` from `@graphty/graph-samples/generators`; removed in layout's
 * next major.
 * @param n - Number of nodes
 * @returns Graph object with nodes connected in a cycle
 */
export function cycleGraph(n: number): Graph {
    const size = sampleCount(n);
    if (size < 3) {
        const edges = Array.from({ length: size }, (_, i): Edge => [i, (i + 1) % size]);
        return listGraph(Array.from({ length: size }, (_, i) => i), edges);
    }
    return toLayoutGraph(sampleCycleGraph({ n: size }));
}

/**
 * Create a star graph with n nodes (1 center + n-1 leaves)
 * @deprecated Use `starGraph({ n })` from `@graphty/graph-samples/generators`; removed in layout's
 * next major.
 * @param n - Total number of nodes
 * @returns Graph object with star topology
 */
export function starGraph(n: number): Graph {
    const size = sampleCount(n);
    return size === 0 ? listGraph([], []) : toLayoutGraph(sampleStarGraph({ n: size }));
}

/**
 * Create a wheel graph with n nodes (1 center + n-1 rim nodes). Below 4 nodes it keeps its
 * historical edges: the star's spokes, then at n = 3 the rim edge (1, 2) and its repeat (2, 1).
 * @deprecated Use `wheelGraph({ n })` from `@graphty/graph-samples/generators`; removed in layout's
 * next major.
 * @param n - Total number of nodes
 * @returns Graph object with wheel topology
 */
export function wheelGraph(n: number): Graph {
    const size = sampleCount(n);
    if (size < 4) {
        const edges = Array.from({ length: Math.max(0, size - 1) }, (_, i): Edge => [0, i + 1]);
        if (size === 3) {
            edges.push([1, 2], [2, 1]);
        }
        return listGraph(Array.from({ length: size }, (_, i) => i), edges);
    }
    return toLayoutGraph(sampleWheelGraph({ n: size }));
}
