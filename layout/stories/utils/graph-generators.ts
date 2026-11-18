/**
 * Graph generation for the layout stories, from @graphty/graph-samples' seeded generators. Every story lays its graph
 * out itself, so a generated node has no position.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import {
    balancedTreeGraph,
    barabasiAlbertGraph,
    completeBipartiteGraph,
    completeGraph,
    completeMultipartiteGraph,
    cycleGraph,
    gridGraph,
    pathGraph,
    plantedPartitionGraph,
    type SampleGraph,
    starGraph,
} from "@graphty/graph-samples/generators";
import { Lcg, type Node, type PositionMap, toLayoutSnapshot } from "@graphty/layout";

/** A node of a generated graph; the stories place it themselves. */
export interface GraphNode {
    id: number;
    label: string;
}

/** An edge of a generated graph. */
export interface GraphEdge {
    source: number;
    target: number;
}

/** A generated graph. */
export interface GeneratedGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/** The graph types the stories offer. */
export type GraphType =
    "tree" | "random" | "grid" | "cycle" | "complete" | "star" | "path" | "bipartite" | "multipartite";

/**
 * The graph-samples graph of a type, with at least `n` nodes (the tree and the grid are generated whole).
 */
function sample(type: GraphType, n: number, seed: number): SampleGraph {
    const side = Math.ceil(Math.sqrt(n));
    switch (type) {
        case "tree":
            return balancedTreeGraph({ branching: 2, height: Math.ceil(Math.log2(n + 1)) - 1 });
        case "random":
            // preferential attachment, two edges per new node: random, and always connected
            return barabasiAlbertGraph({ n, m: 2, seed });
        case "grid":
            return gridGraph({ rows: side, cols: side });
        case "cycle":
            return cycleGraph({ n });
        case "complete":
            return completeGraph({ n });
        case "star":
            return starGraph({ n });
        case "bipartite":
            return completeBipartiteGraph({ a: Math.ceil(n / 2), b: Math.floor(n / 2) });
        case "multipartite":
            return completeMultipartiteGraph({ sizes: [0, 1, 2].map((p) => Math.floor((n + 2 - p) / 3)) });
        default:
            return pathGraph({ n });
    }
}

/**
 * Generate a graph of the specified type with `nodeCount` labeled nodes.
 */
export function generateGraph(type: GraphType, nodeCount: number, seed: number = 42): GeneratedGraph {
    const g = sample(type, nodeCount, seed);
    const edges: GraphEdge[] = [];
    g.src.forEach((s, e) => {
        if (s < nodeCount && g.dst[e] < nodeCount) {
            edges.push({ source: Math.min(s, g.dst[e]), target: Math.max(s, g.dst[e]) });
        }
    });
    return { nodes: Array.from({ length: nodeCount }, (_, id) => ({ id, label: String(id) })), edges };
}

/**
 * A graph-samples graph in the shape the story renderer draws, with unlabeled nodes (the graphs are too big for
 * labels).
 * @param g - the generated graph
 * @returns its nodes and edges
 */
function fromSample(g: SampleGraph): GeneratedGraph {
    return {
        nodes: Array.from({ length: g.nodeCount }, (_, i) => ({ id: i, label: "" })),
        edges: Array.from(g.src, (s, e) => ({ source: s, target: g.dst[e] })),
    };
}

/** What {@link plantedGroups} draws, for a story's caption. */
export const PLANTED_GROUPS = "100 nodes in 4 planted groups (colors): about 6 edges inside each group, a few between.";

/**
 * 100 nodes in 4 planted groups of 25: about 6 neighbors inside a node's group and 0.5 outside, the graph the
 * cytoscape-extensions gallery draws force and spectral layouts on.
 * @param seed - the seed
 * @returns the graph and each node's group
 */
export function plantedGroups(seed: number): { graph: GeneratedGraph; groups: ArrayLike<number> } {
    const g = plantedPartitionGraph({ groups: 4, groupSize: 25, pIn: 6 / 25, pOut: 0.5 / 100, seed });
    return { graph: fromSample(g), groups: g.nodeColumns?.community as ArrayLike<number> };
}

/**
 * The rows x cols grid graph, node (r, c) at index r * cols + c.
 * @param rows - the row count
 * @param cols - the column count
 * @returns the graph
 */
export function grid(rows: number, cols: number): GeneratedGraph {
    return fromSample(gridGraph({ rows, cols }));
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
    const rng = new Lcg(seed);
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
    const rng = new Lcg(seed);
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
