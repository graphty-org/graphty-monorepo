/**
 * Test utilities and helper functions
 */

import { Graph, Node, Edge } from '../src/types';

/**
 * Create a simple test graph for testing
 */
export function createTestGraph(nodes: Node[], edges: Edge[]): Graph {
  return {
    nodes: () => nodes,
    edges: () => edges,
    adjacency: function() {
      const adj = new Map<Node, Map<Node, number>>();
      
      // Initialize adjacency for all nodes
      for (const node of nodes) {
        adj.set(node, new Map());
      }
      
      // Add edges
      for (const [source, target] of edges) {
        if (!adj.has(source)) adj.set(source, new Map());
        if (!adj.has(target)) adj.set(target, new Map());
        
        adj.get(source)!.set(target, 1);
        adj.get(target)!.set(source, 1);
      }
      
      return adj;
    }
  };
}