/**
 * Scale-free graph generation function
 */

import { Graph, Node, Edge } from '../types';

/**
 * Create a scale-free graph using Barabási-Albert model
 * @param n - Total number of nodes
 * @param m - Number of edges to attach from new node
 * @param seed - Random seed for reproducibility
 * @returns Graph object with scale-free properties
 */
export function scaleFreeGraph(n: number, m: number, seed?: number): Graph {
  if (m >= n) {
    throw new Error('m must be less than n');
  }
  
  const nodes: Node[] = Array.from({ length: n }, (_, i) => i);
  const edges: Edge[] = [];
  const degrees = new Array(n).fill(0);
  
  // Simple deterministic pseudo-random if seed provided
  let currentSeed = seed;
  let random = seed !== undefined 
    ? () => {
        currentSeed = (currentSeed! * 9301 + 49297) % 233280;
        return currentSeed / 233280;
      }
    : Math.random;
  
  // Start with complete graph of m+1 nodes
  for (let i = 0; i <= m; i++) {
    for (let j = i + 1; j <= m; j++) {
      edges.push([i, j]);
      degrees[i]++;
      degrees[j]++;
    }
  }
  
  // Add remaining nodes
  for (let i = m + 1; i < n; i++) {
    const targets = new Set<number>();
    const totalDegree = degrees.reduce((sum, d) => sum + d, 0);
    
    // Choose m targets based on preferential attachment
    while (targets.size < m) {
      let r = random() * totalDegree;
      let cumSum = 0;
      
      for (let j = 0; j < i; j++) {
        cumSum += degrees[j];
        if (r <= cumSum && !targets.has(j)) {
          targets.add(j);
          break;
        }
      }
    }
    
    // Add edges to targets
    for (const target of targets) {
      edges.push([i, target]);
      degrees[i]++;
      degrees[target]++;
    }
  }
  
  return {
    nodes: () => nodes,
    edges: () => edges
  };
}