import type { Graph, Node, PositionMap } from "../../types";
import { getEdgesFromGraph,getNodesFromGraph } from "../../utils/graph";
import { RandomNumberGenerator } from "../../utils/random";
import { randomLayout } from "../basic/random";

/**
 * Layout algorithm with attractive and repulsive forces (ARF).
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param scaling - Scale factor for positions
 * @param a - Strength of springs between connected nodes (should be > 1)
 * @param maxIter - Maximum number of iterations
 * @param seed - Random seed for initial positions
 * @returns Positions dictionary keyed by node
 */
export function arfLayout(
    G: Graph,
    pos: PositionMap | null = null,
    scaling: number = 1,
    a: number = 1.1,
    maxIter: number = 1000,
    seed: number | null = null,
): PositionMap {
    if (a <= 1) {
        throw new Error("The parameter a should be larger than 1");
    }

    const nodes = getNodesFromGraph(G);
    const edges = getEdgesFromGraph(G);

    if (nodes.length === 0) {
        return {};
    }

    // Initialize positions if not provided
    if (!pos) {
        pos = randomLayout(G, null, 2, seed);
    } else {
        // Make sure all nodes have positions
        const rng = new RandomNumberGenerator(seed ?? undefined);
        const defaultPos: PositionMap = {};
        nodes.forEach((node: Node) => {
            if (!pos![node]) {
                defaultPos[node] = [rng.rand() as number, rng.rand() as number];
            }
        });
        pos = { ...pos, ...defaultPos };
    }

    // Create node index mapping
    const nodeIndex: Record<Node, number> = {};
    nodes.forEach((node: Node, i: number) => {
        nodeIndex[node] = i;
    });

    // Create positions array
    const positions: number[][] = nodes.map((node: Node) => [...pos[node]]);

    // Initialize spring constant matrix
    const N = nodes.length;
    const K = Array(N)
        .fill(0)
        .map(() => Array(N).fill(1));

    // Set diagonal to zero (no self-attraction)
    for (let i = 0; i < N; i++) {
        K[i][i] = 0;
    }

    // Set stronger attraction between connected nodes
    for (const [source, target] of edges) {
        if (source === target) {continue;}

        const i = nodeIndex[source];
        const j = nodeIndex[target];
        K[i][j] = a;
        K[j][i] = a;
    }

    // Calculate rho (scale factor)
    const rho = scaling * Math.sqrt(N);

    // Optimization loop
    const dt = 1e-3; // Time step
    const etol = 1e-6; // Error tolerance
    let error = etol + 1;
    let nIter = 0;

    while (error > etol && nIter < maxIter) {
        // Calculate changes for each node
        const change = Array(N)
            .fill(0)
            .map(() => [0, 0]);

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i === j) {continue;}

                // Calculate difference vector
                const diff = positions[i].map((coord, dim) => coord - positions[j][dim]);

                // Calculate distance (with minimum to avoid division by zero)
                const dist = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 0.01;

                // Calculate attractive and repulsive forces
                for (let d = 0; d < diff.length; d++) {
                    change[i][d] += K[i][j] * diff[d] - (rho / dist) * diff[d];
                }
            }
        }

        // Update positions
        for (let i = 0; i < N; i++) {
            for (let d = 0; d < positions[i].length; d++) {
                positions[i][d] += change[i][d] * dt;
            }
        }

        // Calculate error (sum of force magnitudes)
        error = change.reduce((sum, c) => sum + Math.sqrt(c.reduce((s, v) => s + v * v, 0)), 0);

        nIter++;
    }

    // Convert positions array back to object
    const finalPos: PositionMap = {};
    nodes.forEach((node: Node, i: number) => {
        finalPos[node] = positions[i];
    });

    return finalPos;
}
