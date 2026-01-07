/**
 * Seeded random number generator and graph generation utilities for Storybook stories.
 * Uses Mulberry32 PRNG for deterministic, reproducible graph generation.
 */

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
export type GraphType = "tree" | "random" | "grid" | "cycle" | "complete" | "star" | "path" | "clusters";

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
            return generateComplete(nodeCount, rng, width, height);
        case "star":
            return generateStar(nodeCount, width, height);
        case "path":
            return generatePath(nodeCount, width, height);
        case "clusters":
            return generateClusters(nodeCount, rng, width, height);
        default:
            return generateTree(nodeCount, rng, width, height);
    }
}

/**
 * Generate a tree graph using BFS-tree structure (good for traversal demos).
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
 * Generate a random Erdős-Rényi graph with force-directed layout.
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

    // Create nodes with placeholder positions (will be set by force-directed layout)
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: i,
            label: String(i),
            x: 0,
            y: 0,
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

    const graph = { nodes, edges };

    // Apply force-directed layout for optimal node positioning
    applyForceDirectedLayout(graph, width, height, 50, rng.nextInt(0, 10000));

    return graph;
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
function generateComplete(
    nodeCount: number,
    rng: SeededRandom,
    width: number,
    height: number,
): GeneratedGraph {
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
            edges.push({
                source: i,
                target: j,
                weight: rng.nextInt(1, 10),
            });
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
 * Generate a graph with distinct clusters connected by sparse bridge edges.
 * Ideal for community detection algorithm demos.
 *
 * Creates 2-4 clusters arranged in a visually clear layout, where nodes
 * within clusters are densely connected but clusters have only 1-2 bridge edges.
 */
function generateClusters(
    nodeCount: number,
    rng: SeededRandom,
    width: number,
    height: number,
): GeneratedGraph {
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

/**
 * Apply Fruchterman-Reingold force-directed layout to improve node positions.
 * This is a simplified implementation ported from @graphty/layout for use in stories
 * without adding a package dependency.
 *
 * @param graph - The graph to layout
 * @param width - Canvas width
 * @param height - Canvas height
 * @param iterations - Number of simulation iterations (default: 50)
 * @param seed - Random seed for initial positions
 */
export function applyForceDirectedLayout(
    graph: GeneratedGraph,
    width: number,
    height: number,
    iterations: number = 50,
    seed: number = 42,
): void {
    const { nodes, edges } = graph;
    const n = nodes.length;

    if (n <= 1) {
        // Single node - just center it
        if (n === 1) {
            const [node] = nodes;
            node.x = width / 2;
            node.y = height / 2;
        }
        return;
    }

    // Use seeded random for reproducibility
    const rng = new SeededRandom(seed);

    // Initialize positions randomly within canvas (with padding)
    const padding = 40;
    const positions: Array<{ x: number; y: number }> = nodes.map(() => ({
        x: padding + rng.next() * (width - 2 * padding),
        y: padding + rng.next() * (height - 2 * padding),
    }));

    // Build adjacency lookup for faster edge access
    const nodeIndexMap = new Map<number, number>();
    for (let i = 0; i < n; i++) {
        nodeIndexMap.set(nodes[i].id, i);
    }

    // Optimal distance between nodes (area / nodes)
    const area = (width - 2 * padding) * (height - 2 * padding);
    const k = Math.sqrt(area / n);

    // Repulsive force: k^2 / distance
    function repulsiveForce(distance: number): number {
        return (k * k) / Math.max(distance, 0.1);
    }

    // Attractive force: distance^2 / k
    function attractiveForce(distance: number): number {
        return (distance * distance) / k;
    }

    // Temperature for simulated annealing (starts high, cools down)
    let temperature = Math.min(width, height) / 10;
    const coolingRate = temperature / (iterations + 1);

    // Run simulation iterations
    for (let iter = 0; iter < iterations; iter++) {
        // Calculate displacements
        const displacement: Array<{ dx: number; dy: number }> = positions.map(() => ({
            dx: 0,
            dy: 0,
        }));

        // Calculate repulsive forces between all node pairs
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = positions[i].x - positions[j].x;
                const dy = positions[i].y - positions[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;

                const force = repulsiveForce(distance);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                displacement[i].dx += fx;
                displacement[i].dy += fy;
                displacement[j].dx -= fx;
                displacement[j].dy -= fy;
            }
        }

        // Calculate attractive forces along edges
        for (const edge of edges) {
            const sourceIdx = nodeIndexMap.get(edge.source);
            const targetIdx = nodeIndexMap.get(edge.target);

            if (sourceIdx === undefined || targetIdx === undefined) {
                continue;
            }

            const dx = positions[sourceIdx].x - positions[targetIdx].x;
            const dy = positions[sourceIdx].y - positions[targetIdx].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;

            const force = attractiveForce(distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            displacement[sourceIdx].dx -= fx;
            displacement[sourceIdx].dy -= fy;
            displacement[targetIdx].dx += fx;
            displacement[targetIdx].dy += fy;
        }

        // Apply displacements (limited by temperature)
        for (let i = 0; i < n; i++) {
            const { dx, dy } = displacement[i];
            const magnitude = Math.sqrt(dx * dx + dy * dy) || 0.1;

            // Limit displacement by temperature
            const limitedMagnitude = Math.min(magnitude, temperature);
            const scale = limitedMagnitude / magnitude;

            positions[i].x += dx * scale;
            positions[i].y += dy * scale;

            // Keep nodes within bounds
            positions[i].x = Math.max(padding, Math.min(width - padding, positions[i].x));
            positions[i].y = Math.max(padding, Math.min(height - padding, positions[i].y));
        }

        // Cool down temperature
        temperature -= coolingRate;
    }

    // Apply final positions to nodes
    for (let i = 0; i < n; i++) {
        nodes[i].x = positions[i].x;
        nodes[i].y = positions[i].y;
    }
}
