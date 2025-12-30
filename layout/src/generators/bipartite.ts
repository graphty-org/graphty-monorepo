/**
 * Bipartite graph generation function
 */

import { Graph, Node, Edge } from '../types';

/**
 * Create a bipartite graph with two sets of nodes
 * @param n1 - Number of nodes in first set
 * @param n2 - Number of nodes in second set
 * @param p - Probability of edge between nodes in different sets
 * @param seed - Random seed for reproducibility
 * @returns Graph object with bipartite structure and setA/setB properties
 */
export function bipartiteGraph(n1: number, n2: number, p: number, seed?: number): Graph & { setA: Node[], setB: Node[] } {
  const setA: Node[] = Array.from({ length: n1 }, (_, i) => `A${i}`);
  const setB: Node[] = Array.from({ length: n2 }, (_, i) => `B${i}`);
  const nodes = [...setA, ...setB];
  const edges: Edge[] = [];
  
  // Simple deterministic pseudo-random if seed provided
  let currentSeed = seed;
  let random = seed !== undefined 
    ? () => {
        currentSeed = (currentSeed! * 9301 + 49297) % 233280;
        return currentSeed / 233280;
      }
    : Math.random;
  
  // Only connect nodes between sets
  for (const a of setA) {
    for (const b of setB) {
      if (random() < p) {
        edges.push([a, b]);
      }
    }
  }
  
  return {
    nodes: () => nodes,
    edges: () => edges,
    setA,
    setB
  };
}