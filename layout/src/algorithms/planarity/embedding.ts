/**
 * Embedding functions for planar graphs
 */

import { Node, Edge, Embedding, PositionMap } from '../../types';

/**
 * Create a triangulation-based embedding for a planar graph
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Embedding object
 */
export function createTriangulationEmbedding(
  nodes: Node[],
  edges: Edge[]
): Embedding {
  // Create a simple embedding using the incremental approach
  const embedding: Embedding = {
    nodeOrder: [...nodes],
    faceList: [],
    nodePositions: {}
  };

  // Create a map of adjacent nodes
  const adjMap: Record<Node, Set<Node>> = {};
  for (const node of nodes) {
    adjMap[node] = new Set<Node>();
  }

  for (const [u, v] of edges) {
    adjMap[u].add(v);
    adjMap[v].add(u);
  }

  // Create outer face as a cycle (if possible)
  const outerFace = findCycle(nodes, edges, adjMap) || nodes;
  embedding.faceList.push(outerFace);

  // Position nodes on a convex polygon (outer face)
  const n = outerFace.length;
  for (let i = 0; i < n; i++) {
    const angle = 2 * Math.PI * i / n;
    embedding.nodePositions[outerFace[i]] = [Math.cos(angle), Math.sin(angle)];
  }

  // Position interior nodes using barycentric coordinates
  const interiorNodes = nodes.filter(node => !embedding.nodePositions[node]);

  for (const node of interiorNodes) {
    const neighbors = Array.from(adjMap[node]);

    if (neighbors.length === 0) {
      // Isolated node, place at center
      embedding.nodePositions[node] = [0, 0];
    } else {
      // Average position of neighbors that have positions
      let xSum = 0, ySum = 0, count = 0;

      for (const neighbor of neighbors) {
        if (embedding.nodePositions[neighbor]) {
          xSum += embedding.nodePositions[neighbor][0];
          ySum += embedding.nodePositions[neighbor][1];
          count++;
        }
      }

      if (count > 0) {
        // Place slightly away from center to avoid overlaps
        const jitter = 0.1 * Math.random();
        embedding.nodePositions[node] = [
          xSum / count + jitter * (Math.random() - 0.5),
          ySum / count + jitter * (Math.random() - 0.5)
        ];
      } else {
        // No neighbors have positions yet, place randomly inside unit circle
        const r = 0.5 * Math.random();
        const angle = 2 * Math.PI * Math.random();
        embedding.nodePositions[node] = [r * Math.cos(angle), r * Math.sin(angle)];
      }
    }
  }

  return embedding;
}

/**
 * Find a simple cycle in the graph (for outer face)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @param adjMap - Adjacency map
 * @returns Cycle as array of nodes, or null if none found
 */
export function findCycle(
  nodes: Node[],
  edges: Edge[],
  adjMap: Record<Node, Set<Node>>
): Node[] | null {
  if (nodes.length === 0) return null;
  if (nodes.length <= 2) return nodes; // Not a real cycle but handle it

  // Try to find a Hamiltonian cycle for simplicity (for small graphs)
  if (nodes.length <= 8) {
    const visited = new Set<Node>();
    const path: Node[] = [];

    function hamiltonianCycleDFS(node: Node): boolean {
      path.push(node);
      visited.add(node);

      if (path.length === nodes.length) {
        // Check if it's a cycle (last node connects to first)
        if (adjMap[node].has(path[0])) {
          return true;
        }
        // Not a cycle
        visited.delete(node);
        path.pop();
        return false;
      }

      for (const neighbor of adjMap[node]) {
        if (!visited.has(neighbor)) {
          if (hamiltonianCycleDFS(neighbor)) {
            return true;
          }
        }
      }

      visited.delete(node);
      path.pop();
      return false;
    }

    if (hamiltonianCycleDFS(nodes[0])) {
      return path;
    }
  }

  // Fallback: try to find any cycle using DFS
  const visited = new Set<Node>();
  const parent: Record<Node, Node | null> = {};
  let cycleFound: Node[] | null = null;

  function findCycleDFS(node: Node, parentNode: Node | null): boolean {
    visited.add(node);

    for (const neighbor of adjMap[node]) {
      if (neighbor === parentNode) continue;

      if (visited.has(neighbor)) {
        // Found a cycle
        cycleFound = constructCycle(node, neighbor, parent);
        return true;
      }

      parent[neighbor] = node;
      if (findCycleDFS(neighbor, node)) {
        return true;
      }
    }

    return false;
  }

  function constructCycle(u: Node, v: Node, parent: Record<Node, Node | null>): Node[] {
    const cycle: Node[] = [v, u];
    let current = u;

    while (parent[current] !== undefined && parent[current] !== v) {
      current = parent[current]!;
      cycle.push(current);
    }

    return cycle;
  }

  // Try to find a cycle
  for (const node of nodes) {
    if (!visited.has(node)) {
      parent[node] = null;
      if (findCycleDFS(node, null)) {
        break;
      }
    }
  }

  return cycleFound || nodes; // Fallback to all nodes if no cycle found
}

/**
 * Convert a combinatorial embedding to node positions
 * 
 * @param embedding - The embedding object
 * @param nodes - List of nodes
 * @returns Dictionary mapping nodes to positions
 */
export function combinatorialEmbeddingToPos(
  embedding: Embedding,
  nodes: Node[]
): PositionMap {
  const pos: PositionMap = {};

  // Use the positions from the embedding
  for (const node of nodes) {
    if (embedding.nodePositions[node]) {
      pos[node] = embedding.nodePositions[node];
    } else {
      // Fallback for any nodes without positions
      pos[node] = [0, 0];
    }
  }

  return pos;
}