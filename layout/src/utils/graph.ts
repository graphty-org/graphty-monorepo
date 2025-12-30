/**
 * Graph utility functions
 */

import { Graph, Node, Edge } from '../types';

/**
 * Extract nodes from a graph object
 * 
 * @param G - Graph or list of nodes
 * @returns Array of nodes
 */
export function getNodesFromGraph(G: Graph | Node[]): Node[] {
  if (Array.isArray(G)) {
    return G;
  }
  return G.nodes();
}

/**
 * Extract edges from a graph object
 * 
 * @param G - Graph or list of nodes
 * @returns Array of edges
 */
export function getEdgesFromGraph(G: Graph | Node[]): Edge[] {
  if (Array.isArray(G)) {
    return [];
  }
  return G.edges();
}

/**
 * Get the degree of a node in the graph
 * 
 * @param graph - Graph object
 * @param node - Node to get degree for
 * @returns Degree of the node
 */
export function getNodeDegree(graph: Graph, node: Node): number {
  if (!graph.edges) return 0;
  
  const edges = graph.edges();
  let degree = 0;
  
  for (const [source, target] of edges) {
    if (source === node || target === node) {
      degree++;
    }
  }
  
  return degree;
}

/**
 * Get the neighbors of a node in the graph
 * 
 * @param graph - Graph object
 * @param node - Node to get neighbors for
 * @returns Array of neighbor nodes
 */
export function getNeighbors(graph: Graph, node: Node): Node[] {
  if (!graph.edges) return [];

  const neighbors = new Set<Node>();
  const edges = graph.edges();

  for (const [source, target] of edges) {
    if (source === node) {
      neighbors.add(target);
    } else if (target === node) {
      neighbors.add(source);
    }
  }

  return Array.from(neighbors);
}