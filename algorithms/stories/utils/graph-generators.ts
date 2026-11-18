/**
 * Graph generation for the algorithms stories: the structure comes from @graphty/graph-samples' seeded generators,
 * and each type is drawn in its textbook shape (the random, cycle and complete graphs on a circle); the "clusters"
 * graph is local, its positions being its planted groups.
 */

import { mulberry32 } from "@graphty/algorithms";
import {
    balancedTreeGraph,
    barabasiAlbertGraph,
    completeGraph,
    cycleGraph,
    gridGraph,
    pathGraph,
    type SampleGraph,
    starGraph,
} from "@graphty/graph-samples/generators";

/**
 * Seeded random numbers for the stories (mulberry32).
 */
export class SeededRandom {
    /** The next number in [0, 1). */
    readonly next: () => number;

    constructor(seed: number = 42) {
        this.next = mulberry32(seed);
    }

    /**
     * Generate random integer in range [min, max] (inclusive).
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}

/**
 * Graph node with position information for visualization.
 */
export interface GraphNode {
    id: number;
    label: string;
    x: number;
    y: number;
}

/**
 * Graph edge with optional weight.
 */
export interface GraphEdge {
    source: number;
    target: number;
    weight?: number;
}

/**
 * Graph structure with nodes and edges.
 */
export interface GeneratedGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/**
 * Available graph types for generation.
 */
export type GraphType = "tree" | "random" | "grid" | "cycle" | "complete" | "star" | "path" | "clusters";

/**
 * The graph-samples graph of a type: the first `n` nodes of it, since the tree and the grid are generated whole.
 * The tree, random and complete graphs carry integer weights 1 to 10.
 */
function sample(type: Exclude<GraphType, "clusters">, n: number, seed: number): SampleGraph {
    const weighted = { weights: { kind: "integer", min: 1, max: 10 }, seed } as const;
    const side = Math.ceil(Math.sqrt(n));
    switch (type) {
        case "tree":
            return balancedTreeGraph({ branching: 2, height: Math.ceil(Math.log2(n + 1)) - 1, ...weighted });
        case "random":
            // preferential attachment, two edges per new node: random, and always connected
            return barabasiAlbertGraph({ n, m: 2, ...weighted });
        case "grid":
            return gridGraph({ rows: side, cols: side });
        case "cycle":
            return cycleGraph({ n });
        case "complete":
            return completeGraph({ n, ...weighted });
        case "star":
            return starGraph({ n });
        default:
            return pathGraph({ n });
    }
}

/**
 * Where node `i` of `n` goes in a `width` x `height` canvas: a heap-ordered binary tree in levels, a row-major grid, a
 * horizontal line, or a circle (the star's hub at the centre).
 */
function place(
    type: Exclude<GraphType, "clusters">,
    i: number,
    n: number,
    width: number,
    height: number,
): [number, number] {
    const side = Math.ceil(Math.sqrt(n));
    const radius = Math.min(width, height) / 2 - 40;
    switch (type) {
        case "tree": {
            const level = Math.floor(Math.log2(i + 1));
            const levels = Math.ceil(Math.log2(n + 1));
            return [((i - 2 ** level + 2) * width) / (2 ** level + 1), ((level + 1) * height) / (levels + 1)];
        }
        case "grid":
            return [(((i % side) + 1) * width) / (side + 1), ((Math.floor(i / side) + 1) * height) / (side + 1)];
        case "path":
            return [((i + 1) * width) / (n + 1), height / 2];
        default: {
            const star = type === "star";
            if (star && i === 0) {
                return [width / 2, height / 2];
            }
            const angle = (2 * Math.PI * (star ? i - 1 : i)) / (star ? n - 1 : n) - Math.PI / 2;
            return [width / 2 + radius * Math.cos(angle), height / 2 + radius * Math.sin(angle)];
        }
    }
}

/**
 * Generate a graph of the specified type with deterministic layout.
 */
export function generateGraph(
    type: GraphType,
    nodeCount: number,
    seed: number = 42,
    width: number = 500,
    height: number = 500,
): GeneratedGraph {
    if (type === "clusters") {
        return generateClusters(nodeCount, new SeededRandom(seed), width, height);
    }
    const g = sample(type, nodeCount, seed);
    const graph: GeneratedGraph = { nodes: [], edges: [] };
    for (let e = 0; e < g.src.length; e++) {
        const [source, target] = [Math.min(g.src[e], g.dst[e]), Math.max(g.src[e], g.dst[e])];
        if (target < nodeCount) {
            graph.edges.push({ source, target, weight: g.weights?.[e] });
        }
    }
    graph.nodes = Array.from({ length: nodeCount }, (_, id) => {
        const [x, y] = place(type, id, nodeCount, width, height);
        return { id, label: String(id), x, y };
    });
    return graph;
}

/**
 * Generate a graph with distinct clusters connected by sparse bridge edges.
 * Ideal for community detection algorithm demos.
 *
 * Creates 2-4 clusters arranged in a visually clear layout, where nodes
 * within clusters are densely connected but clusters have only 1-2 bridge edges.
 */
function generateClusters(nodeCount: number, rng: SeededRandom, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Determine number of clusters based on node count
    let numClusters = 4;
    if (nodeCount <= 8) {
        numClusters = 2;
    } else if (nodeCount <= 15) {
        numClusters = 3;
    }
    const nodesPerCluster = Math.floor(nodeCount / numClusters);
    const extraNodes = nodeCount % numClusters;

    // Calculate cluster positions (arranged in a circle pattern)
    const centerX = width / 2;
    const centerY = height / 2;
    const clusterRadius = Math.min(width, height) / 3.5;
    const nodeRadius = clusterRadius / 2.5;

    // Define cluster centers
    const clusterCenters: Array<{ x: number; y: number }> = [];
    for (let c = 0; c < numClusters; c++) {
        const angle = (2 * Math.PI * c) / numClusters - Math.PI / 2;
        clusterCenters.push({
            x: centerX + clusterRadius * Math.cos(angle),
            y: centerY + clusterRadius * Math.sin(angle),
        });
    }

    // Track which nodes belong to which cluster
    const clusterAssignments: number[][] = Array.from({ length: numClusters }, () => []);

    let nodeId = 0;

    // Create nodes for each cluster
    for (let c = 0; c < numClusters; c++) {
        const clusterSize = nodesPerCluster + (c < extraNodes ? 1 : 0);
        const clusterCenter = clusterCenters[c];

        for (let i = 0; i < clusterSize; i++) {
            // Position nodes in a tight circular pattern within the cluster
            const angle = (2 * Math.PI * i) / clusterSize - Math.PI / 2;
            const distance = clusterSize <= 3 ? 0 : nodeRadius * (0.5 + 0.5 * (i % 2));

            nodes.push({
                id: nodeId,
                label: String(nodeId),
                x: clusterCenter.x + distance * Math.cos(angle),
                y: clusterCenter.y + distance * Math.sin(angle),
            });

            clusterAssignments[c].push(nodeId);
            nodeId++;
        }
    }

    // Create dense intra-cluster edges (high connectivity within clusters)
    for (let c = 0; c < numClusters; c++) {
        const clusterNodes = clusterAssignments[c];

        // Connect all pairs within cluster (with some randomness for larger clusters)
        for (let i = 0; i < clusterNodes.length; i++) {
            for (let j = i + 1; j < clusterNodes.length; j++) {
                // For smaller clusters, connect all pairs; for larger clusters, use probability
                const connectProb = clusterNodes.length <= 4 ? 1.0 : 0.7;
                if (rng.next() < connectProb) {
                    edges.push({
                        source: clusterNodes[i],
                        target: clusterNodes[j],
                        weight: rng.nextInt(1, 5),
                    });
                }
            }
        }

        // Ensure at least a minimum spanning tree within cluster
        for (let i = 1; i < clusterNodes.length; i++) {
            const hasConnection = edges.some(
                (e) =>
                    (e.source === clusterNodes[i] && clusterNodes.slice(0, i).includes(e.target)) ||
                    (e.target === clusterNodes[i] && clusterNodes.slice(0, i).includes(e.source)),
            );
            if (!hasConnection) {
                const target = clusterNodes[rng.nextInt(0, i - 1)];
                edges.push({
                    source: clusterNodes[i],
                    target,
                    weight: rng.nextInt(1, 5),
                });
            }
        }
    }

    // Create sparse inter-cluster bridge edges (1 edge between adjacent clusters)
    for (let c = 0; c < numClusters; c++) {
        const nextC = (c + 1) % numClusters;
        const sourceCluster = clusterAssignments[c];
        const targetCluster = clusterAssignments[nextC];

        // Pick one node from each cluster to form a bridge
        const sourceNode = sourceCluster[rng.nextInt(0, sourceCluster.length - 1)];
        const targetNode = targetCluster[rng.nextInt(0, targetCluster.length - 1)];

        edges.push({
            source: sourceNode,
            target: targetNode,
            weight: rng.nextInt(1, 3),
        });
    }

    return { nodes, edges };
}
