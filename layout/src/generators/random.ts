/**
 * Random graph generation function
 */

import { Edge,Graph, Node } from "../types";

/**
 * Create a random graph with n nodes and given edge probability
 * @param n - Number of nodes
 * @param p - Probability of edge between any two nodes (0-1)
 * @param seed - Random seed for reproducibility
 * @returns Graph object with random edges
 */
export function randomGraph(n: number, p: number, seed?: number): Graph {
    const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
    const edges: Edge[] = [];

    // Simple deterministic pseudo-random if seed provided
    let currentSeed = seed;
    const random =
        seed !== undefined
            ? () => {
                  currentSeed = (currentSeed! * 9301 + 49297) % 233280;
                  return currentSeed / 233280;
              }
            : Math.random;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (random() < p) {
                edges.push([i, j]);
            }
        }
    }

    return {
        nodes: () => nodes,
        edges: () => edges,
    };
}
