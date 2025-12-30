/**
 * Special graph detection functions for planarity testing
 */

import { Node, Edge } from '../../types';

/**
 * Check if graph is K5 (complete graph with 5 nodes)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns True if graph is K5
 */
export function isK5(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length !== 5) return false;

  // K5 has exactly 10 edges
  if (edges.length !== 10) return false;

  // Check if every pair of distinct nodes is connected
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const hasEdge = edges.some(
        e => (e[0] === nodes[i] && e[1] === nodes[j]) ||
          (e[0] === nodes[j] && e[1] === nodes[i])
      );
      if (!hasEdge) return false;
    }
  }

  return true;
}

/**
 * Check if graph is K3,3 (complete bipartite with 3,3 nodes)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns True if graph is K3,3
 */
export function isK33(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length !== 6) return false;

  // K3,3 has exactly 9 edges
  if (edges.length !== 9) return false;

  // Try to find a bipartite partition
  const nodePartitions = tryFindBipartitePartition(nodes, edges);
  if (!nodePartitions) return false;

  const [part1, part2] = nodePartitions;

  // Check if both partitions have size 3
  if (part1.length !== 3 || part2.length !== 3) return false;

  // Check if every node in part1 is connected to every node in part2
  for (const n1 of part1) {
    for (const n2 of part2) {
      const hasEdge = edges.some(
        e => (e[0] === n1 && e[1] === n2) ||
          (e[0] === n2 && e[1] === n1)
      );
      if (!hasEdge) return false;
    }
  }

  return true;
}

/**
 * Try to find a bipartite partition of the nodes
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Array of two partitions, or null if not bipartite
 */
export function tryFindBipartitePartition(
  nodes: Node[],
  edges: Edge[]
): [Node[], Node[]] | null {
  const colorMap: Record<Node, number> = {};
  const adjList: Record<Node, Node[]> = {};

  // Create adjacency list
  for (const node of nodes) {
    adjList[node] = [];
  }

  for (const [u, v] of edges) {
    adjList[u].push(v);
    adjList[v].push(u);
  }

  // BFS to color nodes
  const queue: Node[] = [nodes[0]];
  colorMap[nodes[0]] = 0;

  while (queue.length > 0) {
    const node = queue.shift()!;
    const nodeColor = colorMap[node];

    for (const neighbor of adjList[node]) {
      if (colorMap[neighbor] === undefined) {
        colorMap[neighbor] = 1 - nodeColor; // Toggle color (0/1)
        queue.push(neighbor);
      } else if (colorMap[neighbor] === nodeColor) {
        // Conflict: not bipartite
        return null;
      }
    }
  }

  // Create partitions
  const part0: Node[] = [];
  const part1: Node[] = [];

  for (const node of nodes) {
    if (colorMap[node] === 0) {
      part0.push(node);
    } else {
      part1.push(node);
    }
  }

  return [part0, part1];
}