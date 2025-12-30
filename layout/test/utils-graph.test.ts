/**
 * Tests for graph utility functions
 */

import { describe, it, expect } from 'vitest';
import { 
  getNodesFromGraph, 
  getEdgesFromGraph, 
  getNodeDegree, 
  getNeighbors 
} from '../src/utils/graph';
import { createTestGraph } from './test-utils';

describe('Graph Utils', () => {
  describe('getNodesFromGraph', () => {
    it('should return array as-is when given array of nodes', () => {
      const nodes = [1, 2, 3, 'a', 'b'];
      const result = getNodesFromGraph(nodes);
      expect(result).toEqual(nodes);
      expect(result).toBe(nodes); // same reference
    });

    it('should call nodes() method when given graph object', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2], [2, 3]]);
      const result = getNodesFromGraph(graph);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      const result = getNodesFromGraph([]);
      expect(result).toEqual([]);
    });

    it('should handle empty graph', () => {
      const graph = createTestGraph([], []);
      const result = getNodesFromGraph(graph);
      expect(result).toEqual([]);
    });
  });

  describe('getEdgesFromGraph', () => {
    it('should return empty array when given array of nodes', () => {
      const nodes = [1, 2, 3, 'a', 'b'];
      const result = getEdgesFromGraph(nodes);
      expect(result).toEqual([]);
    });

    it('should call edges() method when given graph object', () => {
      const edges = [[1, 2], [2, 3], [3, 1]];
      const graph = createTestGraph([1, 2, 3], edges);
      const result = getEdgesFromGraph(graph);
      expect(result).toEqual(edges);
    });

    it('should handle empty array', () => {
      const result = getEdgesFromGraph([]);
      expect(result).toEqual([]);
    });

    it('should handle graph with no edges', () => {
      const graph = createTestGraph([1, 2, 3], []);
      const result = getEdgesFromGraph(graph);
      expect(result).toEqual([]);
    });
  });

  describe('getNodeDegree', () => {
    it('should return 0 for graph without edges method', () => {
      const graph = { nodes: () => [1, 2, 3] } as any;
      const result = getNodeDegree(graph, 1);
      expect(result).toBe(0);
    });

    it('should calculate degree correctly for connected node', () => {
      const graph = createTestGraph([1, 2, 3, 4], [[1, 2], [1, 3], [1, 4], [2, 3]]);
      expect(getNodeDegree(graph, 1)).toBe(3); // connected to 2, 3, 4
      expect(getNodeDegree(graph, 2)).toBe(2); // connected to 1, 3
      expect(getNodeDegree(graph, 3)).toBe(2); // connected to 1, 2
      expect(getNodeDegree(graph, 4)).toBe(1); // connected to 1
    });

    it('should return 0 for isolated node', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2]]);
      expect(getNodeDegree(graph, 3)).toBe(0);
    });

    it('should handle self-loops correctly', () => {
      const graph = createTestGraph([1, 2], [[1, 1], [1, 2]]);
      expect(getNodeDegree(graph, 1)).toBe(2); // self-loop + edge to 2
    });

    it('should handle node not in graph', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2]]);
      expect(getNodeDegree(graph, 999)).toBe(0);
    });

    it('should handle empty graph', () => {
      const graph = createTestGraph([], []);
      expect(getNodeDegree(graph, 1)).toBe(0);
    });
  });

  describe('getNeighbors', () => {
    it('should return empty array for graph without edges method', () => {
      const graph = { nodes: () => [1, 2, 3] } as any;
      const result = getNeighbors(graph, 1);
      expect(result).toEqual([]);
    });

    it('should return neighbors correctly', () => {
      const graph = createTestGraph([1, 2, 3, 4], [[1, 2], [1, 3], [2, 4], [3, 4]]);
      
      const neighbors1 = getNeighbors(graph, 1);
      expect(neighbors1.sort()).toEqual([2, 3]);
      
      const neighbors2 = getNeighbors(graph, 2);
      expect(neighbors2.sort()).toEqual([1, 4]);
      
      const neighbors4 = getNeighbors(graph, 4);
      expect(neighbors4.sort()).toEqual([2, 3]);
    });

    it('should return empty array for isolated node', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2]]);
      expect(getNeighbors(graph, 3)).toEqual([]);
    });

    it('should handle self-loops correctly', () => {
      const graph = createTestGraph([1, 2], [[1, 1], [1, 2]]);
      const neighbors = getNeighbors(graph, 1);
      expect(neighbors.sort()).toEqual([1, 2]); // includes self and neighbor
    });

    it('should not duplicate neighbors in undirected edges', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2], [2, 1], [1, 3]]); // bidirectional edge
      const neighbors = getNeighbors(graph, 1);
      expect(neighbors.sort()).toEqual([2, 3]); // should not duplicate node 2
    });

    it('should handle node not in graph', () => {
      const graph = createTestGraph([1, 2, 3], [[1, 2]]);
      expect(getNeighbors(graph, 999)).toEqual([]);
    });

    it('should handle empty graph', () => {
      const graph = createTestGraph([], []);
      expect(getNeighbors(graph, 1)).toEqual([]);
    });

    it('should work with string node IDs', () => {
      const graph = createTestGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
      expect(getNeighbors(graph, 'b').sort()).toEqual(['a', 'c']);
    });
  });
});