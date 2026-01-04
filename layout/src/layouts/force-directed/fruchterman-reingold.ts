/**
 * Fruchterman-Reingold force-directed layout algorithm
 */

import { Graph, Node, PositionMap } from "../../types";
import { getEdgesFromGraph,getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { RandomNumberGenerator } from "../../utils/random";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 * @param G - Graph or list of nodes
 * @param k - Optimal distance between nodes
 * @param pos - Initial positions for nodes
 * @param fixed - Nodes to keep fixed at initial position
 * @param iterations - Maximum number of iterations
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for initial positions
 * @returns Positions dictionary keyed by node
 */
export function fruchtermanReingoldLayout(
    G: Graph,
    k: number | null = null,
    pos: PositionMap | null = null,
    fixed: Node[] | null = null,
    iterations: number = 50,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    seed: number | null = null,
): PositionMap {
    const processed = _processParams(G, center, dim);
    const graph = processed.G;
    ({ center } = processed);

    const nodes = getNodesFromGraph(graph);
    const edges = getEdgesFromGraph(graph);

    if (nodes.length === 0) {
        return {};
    }

    if (nodes.length === 1) {
        const singlePos: PositionMap = {};
        singlePos[nodes[0]] = center;
        return singlePos;
    }

    // Set up initial positions
    let positions: PositionMap = {};
    if (pos) {
        // Use provided positions
        for (const node of nodes) {
            if (pos[node]) {
                positions[node] = [...pos[node]];
            } else {
                const rng = new RandomNumberGenerator(seed ?? undefined);
                positions[node] = rng.rand(dim) as number[];
            }
        }
    } else {
        // Random initial positions
        const rng = new RandomNumberGenerator(seed ?? undefined);
        for (const node of nodes) {
            positions[node] = rng.rand(dim) as number[];
        }
    }

    // Set up fixed nodes
    const fixedNodes = new Set(fixed || []);

    // Optimal distance between nodes
    if (!k) {
        k = 1.0 / Math.sqrt(nodes.length);
    }

    // Initialize temperature
    let t = 0.1;
    // Calculate temperature reduction
    const dt = t / (iterations + 1);

    // Simple cooling schedule
    for (let i = 0; i < iterations; i++) {
        // Calculate repulsive forces
        const displacement: Record<Node, number[]> = {};
        for (const node of nodes) {
            displacement[node] = Array(dim).fill(0);
        }

        // Repulsive forces between nodes
        for (let v1i = 0; v1i < nodes.length; v1i++) {
            const v1 = nodes[v1i];
            for (let v2i = v1i + 1; v2i < nodes.length; v2i++) {
                const v2 = nodes[v2i];

                // Difference vector
                const delta = positions[v1].map((p, i) => p - positions[v2][i]);

                // Distance
                const distance = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0)) || 0.1;

                // Force
                const force = (k * k) / distance;

                // Add force to displacement
                for (let j = 0; j < dim; j++) {
                    const direction = delta[j] / distance;
                    displacement[v1][j] += direction * force;
                    displacement[v2][j] -= direction * force;
                }
            }
        }

        // Attractive forces between connected nodes
        for (const [source, target] of edges) {
            // Difference vector
            const delta = positions[source].map((p, i) => p - positions[target][i]);

            // Distance
            const distance = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0)) || 0.1;

            // Force
            const force = (distance * distance) / k;

            // Add force to displacement
            for (let j = 0; j < dim; j++) {
                const direction = delta[j] / distance;
                displacement[source][j] -= direction * force;
                displacement[target][j] += direction * force;
            }
        }

        // Update positions
        for (const node of nodes) {
            if (fixedNodes.has(node)) {continue;}

            // Calculate displacement magnitude
            const magnitude = Math.sqrt(displacement[node].reduce((sum, d) => sum + d * d, 0));

            // Limit maximum displacement by temperature
            const limitedMagnitude = Math.min(magnitude, t);

            // Update position
            for (let j = 0; j < dim; j++) {
                const direction = magnitude === 0 ? 0 : displacement[node][j] / magnitude;
                positions[node][j] += direction * limitedMagnitude;
            }
        }

        // Cool temperature
        t -= dt;
    }

    // Rescale positions
    if (!fixed) {
        positions = rescaleLayout(positions, scale, center) as PositionMap;
    }

    return positions;
}
