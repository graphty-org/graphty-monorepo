/**
 * Seeded random number generator and graph generation utilities for Storybook stories.
 * Uses Mulberry32 PRNG for deterministic, reproducible graph generation.
 */

import type { Graph, Node, PositionMap } from "@graphty/layout";

/**
 * Mulberry32 seeded random number generator.
 * Produces deterministic pseudo-random numbers from a given seed.
 */
export class SeededRandom {
    private state: number;

    constructor(seed: number = 42) {
        this.state = seed;
    }

    /**
     * Generate next random number between 0 and 1.
     */
    next(): number {
        this.state |= 0;
        this.state = (this.state + 0x6d2b79f5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Generate random integer in range [min, max] (inclusive).
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Reset generator to a new seed.
     */
    reset(seed: number): void {
        this.state = seed;
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
export type GraphType =
    | "tree"
    | "random"
    | "grid"
    | "cycle"
    | "complete"
    | "star"
    | "path"
    | "bipartite"
    | "multipartite";

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
    const rng = new SeededRandom(seed);

    switch (type) {
        case "tree":
            return generateTree(nodeCount, rng, width, height);
        case "random":
            return generateRandom(nodeCount, 0.3, rng, width, height);
        case "grid":
            return generateGrid(nodeCount, width, height);
        case "cycle":
            return generateCycle(nodeCount, width, height);
        case "complete":
            return generateComplete(nodeCount, width, height);
        case "star":
            return generateStar(nodeCount, width, height);
        case "path":
            return generatePath(nodeCount, width, height);
        case "bipartite":
            return generateBipartite(nodeCount, width, height);
        case "multipartite":
            return generateMultipartite(nodeCount, width, height);
        default:
            return generateTree(nodeCount, rng, width, height);
    }
}

/**
 * Generate a tree graph using BFS-tree structure.
 */
function generateTree(
    nodeCount: number,
    rng: SeededRandom,
    width: number,
    height: number,
): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Calculate tree structure
    const branchingFactor = 2;
    const levels = Math.ceil(Math.log2(nodeCount + 1));
    const levelHeight = height / (levels + 1);

    for (let i = 0; i < nodeCount; i++) {
        // Calculate level (0-indexed)
        const level = Math.floor(Math.log2(i + 1));
        // Position within level
        const nodesInLevel = Math.pow(2, level);
        const positionInLevel = i - (Math.pow(2, level) - 1);
        // Calculate x position with proper spacing
        const levelWidth = width / (nodesInLevel + 1);
        const x = (positionInLevel + 1) * levelWidth;
        const y = (level + 1) * levelHeight;

        nodes.push({
            id: i,
            label: String(i),
            x,
            y,
        });

        // Connect to parent (except root)
        if (i > 0) {
            const parent = Math.floor((i - 1) / branchingFactor);
            edges.push({
                source: parent,
                target: i,
                weight: rng.nextInt(1, 10),
            });
        }
    }

    return { nodes, edges };
}

/**
 * Generate a random Erdős-Rényi graph.
 */
function generateRandom(
    nodeCount: number,
    probability: number,
    rng: SeededRandom,
    width: number,
    height: number,
): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create nodes with random positions
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: i,
            label: String(i),
            x: rng.next() * (width - 80) + 40,
            y: rng.next() * (height - 80) + 40,
        });
    }

    // Track existing edges to avoid duplicates
    const existingEdges = new Set<string>();

    // Add edges based on probability
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            if (rng.next() < probability) {
                const edgeKey = `${i}-${j}`;
                existingEdges.add(edgeKey);
                edges.push({
                    source: i,
                    target: j,
                    weight: rng.nextInt(1, 10),
                });
            }
        }
    }

    // Ensure connectivity by adding MST-like edges if needed
    const connected = new Set<number>([0]);
    for (let i = 1; i < nodeCount; i++) {
        if (!connected.has(i)) {
            // Connect to a random connected node
            const connectedNodes = Array.from(connected);
            const target = connectedNodes[rng.nextInt(0, connectedNodes.length - 1)];
            const source = Math.min(i, target);
            const dest = Math.max(i, target);
            const edgeKey = `${source}-${dest}`;

            // Only add if edge doesn't already exist
            if (!existingEdges.has(edgeKey)) {
                existingEdges.add(edgeKey);
                edges.push({
                    source,
                    target: dest,
                    weight: rng.nextInt(1, 10),
                });
            }
        }
        connected.add(i);
    }

    return { nodes, edges };
}

/**
 * Generate a grid graph.
 */
function generateGrid(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const gridSize = Math.ceil(Math.sqrt(nodeCount));
    const cellWidth = width / (gridSize + 1);
    const cellHeight = height / (gridSize + 1);

    let id = 0;
    for (let row = 0; row < gridSize && id < nodeCount; row++) {
        for (let col = 0; col < gridSize && id < nodeCount; col++) {
            nodes.push({
                id,
                label: String(id),
                x: (col + 1) * cellWidth,
                y: (row + 1) * cellHeight,
            });

            // Connect to right neighbor
            if (col < gridSize - 1 && id + 1 < nodeCount) {
                edges.push({ source: id, target: id + 1 });
            }

            // Connect to bottom neighbor
            if (row < gridSize - 1 && id + gridSize < nodeCount) {
                edges.push({ source: id, target: id + gridSize });
            }

            id++;
        }
    }

    return { nodes, edges };
}

/**
 * Generate a cycle graph.
 */
function generateCycle(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
        nodes.push({
            id: i,
            label: String(i),
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });

        // Connect to next node
        edges.push({
            source: i,
            target: (i + 1) % nodeCount,
        });
    }

    return { nodes, edges };
}

/**
 * Generate a complete graph.
 */
function generateComplete(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
        nodes.push({
            id: i,
            label: String(i),
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    }

    // Connect all pairs
    for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
            edges.push({ source: i, target: j });
        }
    }

    return { nodes, edges };
}

/**
 * Generate a star graph.
 */
function generateStar(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Center node
    nodes.push({
        id: 0,
        label: "0",
        x: centerX,
        y: centerY,
    });

    // Surrounding nodes
    for (let i = 1; i < nodeCount; i++) {
        const angle = (2 * Math.PI * (i - 1)) / (nodeCount - 1) - Math.PI / 2;
        nodes.push({
            id: i,
            label: String(i),
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });

        // Connect to center
        edges.push({ source: 0, target: i });
    }

    return { nodes, edges };
}

/**
 * Generate a path graph.
 */
function generatePath(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const spacing = width / (nodeCount + 1);
    const centerY = height / 2;

    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: i,
            label: String(i),
            x: (i + 1) * spacing,
            y: centerY,
        });

        if (i < nodeCount - 1) {
            edges.push({ source: i, target: i + 1 });
        }
    }

    return { nodes, edges };
}

/**
 * Generate a bipartite graph with two sets of nodes.
 */
function generateBipartite(nodeCount: number, width: number, height: number): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Split nodes into two roughly equal sets
    const setACount = Math.ceil(nodeCount / 2);
    const setBCount = nodeCount - setACount;

    const leftX = width * 0.25;
    const rightX = width * 0.75;

    // Create set A nodes (left side)
    for (let i = 0; i < setACount; i++) {
        const spacing = height / (setACount + 1);
        nodes.push({
            id: i,
            label: String(i),
            x: leftX,
            y: (i + 1) * spacing,
        });
    }

    // Create set B nodes (right side)
    for (let i = 0; i < setBCount; i++) {
        const spacing = height / (setBCount + 1);
        nodes.push({
            id: setACount + i,
            label: String(setACount + i),
            x: rightX,
            y: (i + 1) * spacing,
        });
    }

    // Create edges between sets (connect each node in A to some nodes in B)
    for (let i = 0; i < setACount; i++) {
        // Connect each A node to a few B nodes
        const connectionCount = Math.min(setBCount, Math.max(1, Math.floor(setBCount / 2)));
        for (let j = 0; j < connectionCount; j++) {
            const bIndex = (i + j) % setBCount;
            edges.push({
                source: i,
                target: setACount + bIndex,
            });
        }
    }

    return { nodes, edges };
}

/**
 * Generate a multipartite graph with 3-4 sets of nodes.
 */
function generateMultipartite(
    nodeCount: number,
    width: number,
    height: number,
): GeneratedGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create 3 partitions
    const partitionCount = 3;
    const nodesPerPartition = Math.floor(nodeCount / partitionCount);
    const remainder = nodeCount % partitionCount;

    const partitions: number[][] = [];
    let nodeId = 0;

    for (let p = 0; p < partitionCount; p++) {
        const count = nodesPerPartition + (p < remainder ? 1 : 0);
        const partition: number[] = [];
        const x = (width / (partitionCount + 1)) * (p + 1);

        for (let i = 0; i < count; i++) {
            const spacing = height / (count + 1);
            nodes.push({
                id: nodeId,
                label: String(nodeId),
                x,
                y: (i + 1) * spacing,
            });
            partition.push(nodeId);
            nodeId++;
        }
        partitions.push(partition);
    }

    // Create edges between adjacent partitions
    for (let p = 0; p < partitionCount - 1; p++) {
        const currPartition = partitions[p];
        const nextPartition = partitions[p + 1];

        for (const source of currPartition) {
            // Connect to 1-2 nodes in next partition
            const connections = Math.min(nextPartition.length, 2);
            for (let c = 0; c < connections; c++) {
                const target = nextPartition[(source + c) % nextPartition.length];
                edges.push({ source, target });
            }
        }
    }

    return { nodes, edges };
}

/**
 * Convert GeneratedGraph to @graphty/layout Graph interface.
 */
export function toLayoutGraph(generatedGraph: GeneratedGraph): Graph {
    return {
        nodes: () => generatedGraph.nodes.map((n) => n.id),
        edges: () => generatedGraph.edges.map((e) => [e.source, e.target] as [Node, Node]),
    };
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
        positions[node.id] = [
            rng.next() * (width - 80) + 40,
            rng.next() * (height - 80) + 40,
        ];
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
