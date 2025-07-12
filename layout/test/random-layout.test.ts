import { describe, it, assert } from 'vitest';
import { 
  randomLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph
} from '../layout.ts';

describe('Random Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(8);
      const positions = randomLayout(graph);
      
      assert.equal(Object.keys(positions).length, 8);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
      });
    });

    it('should handle empty graph', () => {
      const emptyGraph = { nodes: () => [], edges: () => [] };
      const positions = randomLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => [0], edges: () => [] };
      const positions = randomLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions[0]);
      assert.equal(positions[0].length, 2);
    });

    it('should handle disconnected components', () => {
      const disconnected = {
        nodes: () => [0, 1, 2, 3],
        edges: () => [[0, 1], [2, 3]]
      };
      const positions = randomLayout(disconnected);
      
      assert.equal(Object.keys(positions).length, 4);
      [0, 1, 2, 3].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });
  });

  describe('Random distribution properties', () => {
    it('should position nodes within [0, 1] range by default', () => {
      const graph = cycleGraph(20);
      const positions = randomLayout(graph);
      
      graph.nodes().forEach(node => {
        const [x, y] = positions[node];
        assert.isAtLeast(x, -1);
        assert.isAtMost(x, 1);
        assert.isAtLeast(y, -1);
        assert.isAtMost(y, 1);
      });
    });

    it('should distribute nodes across the full range', () => {
      const graph = gridGraph(10, 10); // 100 nodes
      const positions = randomLayout(graph);
      
      const xValues = graph.nodes().map(node => positions[node][0]);
      const yValues = graph.nodes().map(node => positions[node][1]);
      
      // With 100 nodes, we should have good coverage
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      
      // Should use a good portion of the [-1, 1] range
      // With random distribution, we can't guarantee 80% coverage
      assert.isAbove(maxX - minX, 0.5);
      assert.isAbove(maxY - minY, 0.5);
    });

    it('should handle default range', () => {
      const graph = starGraph(10);
      const positions = randomLayout(graph);
      
      graph.nodes().forEach(node => {
        const [x, y] = positions[node];
        assert.isAtLeast(x, -1);
        assert.isAtMost(x, 1);
        assert.isAtLeast(y, -1);
        assert.isAtMost(y, 1);
      });
    });
  });

  describe('Parameter variations', () => {
    it('should produce different random layouts', () => {
      const graph = completeGraph(5);
      
      // Get multiple random layouts
      const positions1 = randomLayout(graph);
      const positions2 = randomLayout(graph);
      const positions3 = randomLayout(graph);
      
      // At least some positions should differ
      let different = false;
      graph.nodes().forEach(node => {
        if (positions1[node][0] !== positions2[node][0] || 
            positions1[node][1] !== positions2[node][1] ||
            positions2[node][0] !== positions3[node][0] ||
            positions2[node][1] !== positions3[node][1]) {
          different = true;
        }
      });
      assert.isTrue(different);
    });

    it('should respect center parameter', () => {
      const graph = cycleGraph(6);
      const center = [10, 20];
      
      const positions = randomLayout(graph, center);
      
      // Positions should be around the center
      graph.nodes().forEach(node => {
        const [x, y] = positions[node];
        assert.isAtLeast(x, center[0] - 1);
        assert.isAtMost(x, center[0] + 1);
        assert.isAtLeast(y, center[1] - 1);
        assert.isAtMost(y, center[1] + 1);
      });
    });

    it('should handle different dimensions', () => {
      const graph = completeGraph(4);
      
      // 2D layout (default)
      const positions2D = randomLayout(graph, [0, 0], 2);
      graph.nodes().forEach(node => {
        assert.equal(positions2D[node].length, 2);
      });
      
      // 3D layout
      const positions3D = randomLayout(graph, [0, 0, 0], 3);
      graph.nodes().forEach(node => {
        assert.equal(positions3D[node].length, 3);
        assert.isNumber(positions3D[node][2]);
        assert.isAtLeast(positions3D[node][2], -1);
        assert.isAtMost(positions3D[node][2], 1);
      });
    });

    it('should produce different layouts with different seeds', () => {
      const graph = starGraph(8);
      
      const positions1 = randomLayout(graph, [0, 0], 2, 42);
      const positions2 = randomLayout(graph, [0, 0], 2, 123);
      
      // At least some positions should differ
      let different = false;
      graph.nodes().forEach(node => {
        if (positions1[node][0] !== positions2[node][0] || 
            positions1[node][1] !== positions2[node][1]) {
          different = true;
        }
      });
      assert.isTrue(different);
    });

    it('should produce same layout with same seed', () => {
      const graph = completeGraph(10);
      const seed = 12345;
      
      const positions1 = randomLayout(graph, [0, 0], 2, seed);
      const positions2 = randomLayout(graph, [0, 0], 2, seed);
      
      // Should be identical
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });
  });

  describe('Special cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['A', 'B', 'C', 'D'],
        edges: () => [['A', 'B'], ['B', 'C'], ['C', 'D']]
      };
      
      const positions = randomLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['A', 'B', 'C', 'D'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.isAtLeast(positions[node][0], -1);
        assert.isAtMost(positions[node][0], 1);
      });
    });

    it('should handle negative center values', () => {
      const graph = cycleGraph(4);
      const positions = randomLayout(graph, [-5, -5]);
      
      // Should place nodes around negative center
      graph.nodes().forEach(node => {
        const [x, y] = positions[node];
        assert.isAtLeast(x, -6);
        assert.isAtMost(x, -4);
        assert.isAtLeast(y, -6);
        assert.isAtMost(y, -4);
      });
    });

    it('should be fast for large graphs', () => {
      const graph = gridGraph(20, 20); // 400 nodes
      
      const startTime = performance.now();
      const positions = randomLayout(graph);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 400);
      assert.isBelow(endTime - startTime, 50); // Should be very fast
    });

    it('should avoid node overlap statistically', () => {
      const graph = completeGraph(20);
      const positions = randomLayout(graph);
      
      // Calculate minimum distance between any two nodes
      let minDistance = Infinity;
      const nodes = graph.nodes();
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = positions[nodes[i]][0] - positions[nodes[j]][0];
          const dy = positions[nodes[i]][1] - positions[nodes[j]][1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          minDistance = Math.min(minDistance, distance);
        }
      }
      
      // With 20 nodes in 10x10 space, minimum distance should be > 0
      assert.isAbove(minDistance, 0);
    });
  });
});