/**
 * Graph generation for the layout stories. The generators themselves are the algorithms stories'
 * (algorithms/stories/utils/graph-generators.ts), shared by relative path so neither package takes a
 * dependency on the other; this file adds the layout-specific pieces on top.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { type Node, type PositionMap, toLayoutSnapshot } from "@graphty/layout";

import {
    type GeneratedGraph,
    generateGraph as generateSharedGraph,
    type GraphType,
    SeededRandom,
} from "../../../algorithms/stories/utils/graph-generators.js";

export type {
    GeneratedGraph,
    GraphEdge,
    GraphNode,
    GraphType,
} from "../../../algorithms/stories/utils/graph-generators.js";

/**
 * Generate a graph of the specified type. The "random" graph's nodes are scattered at random points,
 * since every layout story lays the graph out itself.
 */
export function generateGraph(
    type: GraphType,
    nodeCount: number,
    seed: number = 42,
    width: number = 500,
    height: number = 500,
): GeneratedGraph {
    return generateSharedGraph(type, nodeCount, seed, width, height, "scattered");
}

/**
 * The undirected snapshot the layouts run over: node index i is the i-th generated node.
 */
export function toSnapshot(generatedGraph: GeneratedGraph): GraphSnapshot {
    return toLayoutSnapshot({
        nodes: () => generatedGraph.nodes.map((n) => n.id),
        edges: () => generatedGraph.edges.map((e) => [e.source, e.target] as [Node, Node]),
    });
}

/**
 * Generate random initial positions for nodes.
 */
export function generateRandomPositions(
    generatedGraph: GeneratedGraph,
    width: number,
    height: number,
    seed: number = 42,
): PositionMap {
    const rng = new SeededRandom(seed);
    const positions: PositionMap = {};

    for (const node of generatedGraph.nodes) {
        positions[node.id] = [rng.next() * (width - 80) + 40, rng.next() * (height - 80) + 40];
    }

    return positions;
}

/**
 * Generate random 3D initial positions for nodes.
 * Positions are centered around origin within a bounding sphere.
 */
export function generateRandom3DPositions(
    generatedGraph: GeneratedGraph,
    radius: number = 200,
    seed: number = 42,
): PositionMap {
    const rng = new SeededRandom(seed);
    const positions: PositionMap = {};

    for (const node of generatedGraph.nodes) {
        // Generate random point within a sphere using rejection sampling
        let x, y, z;
        do {
            x = rng.next() * 2 - 1;
            y = rng.next() * 2 - 1;
            z = rng.next() * 2 - 1;
        } while (x * x + y * y + z * z > 1);

        positions[node.id] = [x * radius, y * radius, z * radius];
    }

    return positions;
}
