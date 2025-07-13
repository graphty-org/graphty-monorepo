import { describe, it, assert } from 'vitest';
import { 
  multipartiteLayout,
  completeGraph,
  cycleGraph,
  randomGraph
} from '../src';

describe('Multipartite Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(12);
      const subsets = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9, 10, 11]
      ];
      const positions = multipartiteLayout(graph, subsets);
      
      assert.equal(Object.keys(positions).length, 12);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
      });
    });

    it('should handle empty graph', () => {
      const emptyGraph = { nodes: () => [], edges: () => [] };
      const positions = multipartiteLayout(emptyGraph, []);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = multipartiteLayout(singleNode, [['A']]);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.deepEqual(positions['A'], [0, 0]);
    });

    it('should handle disconnected multipartite graph', () => {
      const graph = {
        nodes: () => ['A0', 'A1', 'B0', 'B1', 'C0', 'C1'],
        edges: () => [['A0', 'B0'], ['A1', 'B1']] // C nodes disconnected
      };
      const subsets = [['A0', 'A1'], ['B0', 'B1'], ['C0', 'C1']];
      
      const positions = multipartiteLayout(graph, subsets);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });
  });

  describe('Multipartite arrangement', () => {
    it('should arrange subsets in layers for vertical alignment', () => {
      const graph = completeGraph(9);
      const subsets = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8]
      ];
      
      const positions = multipartiteLayout(graph, subsets, 'vertical');
      
      // Calculate average x-coordinate for each subset
      const avgX0 = subsets[0].reduce((sum, n) => sum + positions[n][0], 0) / 3;
      const avgX1 = subsets[1].reduce((sum, n) => sum + positions[n][0], 0) / 3;
      const avgX2 = subsets[2].reduce((sum, n) => sum + positions[n][0], 0) / 3;
      
      // Subsets should be separated horizontally
      assert.notEqual(avgX0, avgX1);
      assert.notEqual(avgX1, avgX2);
      assert.notEqual(avgX0, avgX2);
      
      // Should be evenly spaced
      const spacing1 = Math.abs(avgX1 - avgX0);
      const spacing2 = Math.abs(avgX2 - avgX1);
      assert.approximately(spacing1, spacing2, 0.1);
    });

    it('should arrange subsets in layers for horizontal alignment', () => {
      const graph = completeGraph(8);
      const subsets = [
        [0, 1],
        [2, 3, 4],
        [5, 6, 7]
      ];
      
      const positions = multipartiteLayout(graph, subsets, 'horizontal');
      
      // Calculate average y-coordinate for each subset
      const avgY0 = subsets[0].reduce((sum, n) => sum + positions[n][1], 0) / subsets[0].length;
      const avgY1 = subsets[1].reduce((sum, n) => sum + positions[n][1], 0) / subsets[1].length;
      const avgY2 = subsets[2].reduce((sum, n) => sum + positions[n][1], 0) / subsets[2].length;
      
      // Subsets should be separated vertically
      assert.notEqual(avgY0, avgY1);
      assert.notEqual(avgY1, avgY2);
      assert.notEqual(avgY0, avgY2);
    });

    it('should evenly space nodes within each subset', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        edges: () => [[0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 8]]
      };
      const subsets = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8, 9]
      ];
      
      const positions = multipartiteLayout(graph, subsets, 'vertical');
      
      // Check spacing within first subset
      const subset0Y = subsets[0].map(n => positions[n][1]).sort((a, b) => a - b);
      const spacings0 = [];
      for (let i = 1; i < subset0Y.length; i++) {
        spacings0.push(subset0Y[i] - subset0Y[i-1]);
      }
      
      // All spacings should be equal
      if (spacings0.length > 0) {
        const avgSpacing = spacings0.reduce((a, b) => a + b) / spacings0.length;
        spacings0.forEach(s => assert.approximately(s, avgSpacing, 1e-10));
      }
    });

    it('should handle subsets of different sizes', () => {
      const graph = {
        nodes: () => ['A', 'B0', 'B1', 'C0', 'C1', 'C2', 'C3'],
        edges: () => [['A', 'B0'], ['A', 'B1'], ['B0', 'C0'], ['B1', 'C2']]
      };
      const subsets = [['A'], ['B0', 'B1'], ['C0', 'C1', 'C2', 'C3']];
      
      const positions = multipartiteLayout(graph, subsets);
      
      // Single node should be centered
      assert.equal(positions['A'][1], 0);
      
      // Larger subsets should still be evenly spaced
      const cPositions = ['C0', 'C1', 'C2', 'C3'].map(n => positions[n][1]).sort((a, b) => a - b);
      const span = cPositions[cPositions.length - 1] - cPositions[0];
      assert.isAbove(span, 0);
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = completeGraph(12);
      const subsets = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11]];
      
      const positions1 = multipartiteLayout(graph, subsets, 'vertical', 1);
      const positions2 = multipartiteLayout(graph, subsets, 'vertical', 2);
      
      // Calculate layout spans
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      assert.approximately(span2.width / span1.width, 2, 0.1);
      assert.approximately(span2.height / span1.height, 2, 0.1);
    });

    it('should respect center parameter', () => {
      const graph = completeGraph(6);
      const subsets = [[0, 1], [2, 3], [4, 5]];
      const center = [10, -5];
      
      const positions = multipartiteLayout(graph, subsets, 'vertical', 1, center);
      
      // Calculate center of mass
      const com = getCenterOfMass(positions);
      
      assert.approximately(com[0], center[0], 0.5);
      assert.approximately(com[1], center[1], 0.5);
    });

    it('should respect alignment parameter', () => {
      const graph = completeGraph(9);
      const subsets = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
      
      const verticalPos = multipartiteLayout(graph, subsets, 'vertical');
      const horizontalPos = multipartiteLayout(graph, subsets, 'horizontal');
      
      // In vertical, subsets differ in x; in horizontal, subsets differ in y
      const vDiffX = Math.abs(verticalPos[0][0] - verticalPos[3][0]);
      const vDiffY = Math.abs(verticalPos[0][1] - verticalPos[3][1]);
      
      const hDiffX = Math.abs(horizontalPos[0][0] - horizontalPos[3][0]);
      const hDiffY = Math.abs(horizontalPos[0][1] - horizontalPos[3][1]);
      
      // Vertical: large X difference, potentially small Y difference
      assert.isAbove(vDiffX, 0.5);
      
      // Horizontal: potentially small X difference, large Y difference
      assert.isAbove(hDiffY, 0.5);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['red1', 'red2', 'green1', 'green2', 'blue1', 'blue2'],
        edges: () => [['red1', 'green1'], ['red2', 'green2'], ['green1', 'blue1'], ['green2', 'blue2']]
      };
      const subsets = [['red1', 'red2'], ['green1', 'green2'], ['blue1', 'blue2']];
      
      const positions = multipartiteLayout(graph, subsets);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should handle nodes not in any subset', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 2], [1, 3], [2, 4]]
      };
      const subsets = [[0, 1], [2, 3]]; // Nodes 4, 5 not in subsets
      
      const positions = multipartiteLayout(graph, subsets);
      
      // Only nodes in subsets should be positioned
      assert.equal(Object.keys(positions).length, 4);
      assert.isUndefined(positions[4]);
      assert.isUndefined(positions[5]);
    });

    it('should handle empty subsets', () => {
      const graph = completeGraph(6);
      const subsets = [
        [0, 1],
        [],  // Empty subset
        [2, 3, 4, 5]
      ];
      
      const positions = multipartiteLayout(graph, subsets);
      
      // Should position nodes from non-empty subsets
      assert.equal(Object.keys(positions).length, 6);
    });

    it('should produce consistent results', () => {
      const graph = randomGraph(15, 0.3, 42);
      const subsets = [
        graph.nodes().slice(0, 5),
        graph.nodes().slice(5, 10),
        graph.nodes().slice(10, 15)
      ];
      
      const positions1 = multipartiteLayout(graph, subsets);
      const positions2 = multipartiteLayout(graph, subsets);
      
      // Multipartite layout is deterministic
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });

    it('should handle complete k-partite graphs', () => {
      // Complete 3-partite graph K(2,3,4)
      const graph = {
        nodes: () => ['A0', 'A1', 'B0', 'B1', 'B2', 'C0', 'C1', 'C2', 'C3'],
        edges: () => []
      };
      
      // Add all edges between different subsets
      const subsets = [['A0', 'A1'], ['B0', 'B1', 'B2'], ['C0', 'C1', 'C2', 'C3']];
      for (let i = 0; i < subsets.length; i++) {
        for (let j = i + 1; j < subsets.length; j++) {
          for (const u of subsets[i]) {
            for (const v of subsets[j]) {
              graph.edges().push([u, v]);
            }
          }
        }
      }
      
      const positions = multipartiteLayout(graph, subsets);
      
      assert.equal(Object.keys(positions).length, 9);
      
      // Check that subsets are well-separated
      const avgX = subsets.map(subset => 
        subset.reduce((sum, n) => sum + positions[n][0], 0) / subset.length
      );
      
      assert.notEqual(avgX[0], avgX[1]);
      assert.notEqual(avgX[1], avgX[2]);
    });

    it('should handle large multipartite graphs efficiently', () => {
      const n = 60; // 20 nodes per subset
      const nodes = Array.from({ length: n }, (_, i) => i);
      const graph = {
        nodes: () => nodes,
        edges: () => []
      };
      
      const subsets = [
        nodes.slice(0, 20),
        nodes.slice(20, 40),
        nodes.slice(40, 60)
      ];
      
      const startTime = performance.now();
      const positions = multipartiteLayout(graph, subsets);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 60);
      assert.isBelow(endTime - startTime, 100); // Should be very fast
    });
  });

  describe('Layout quality', () => {
    it('should minimize edge crossings between adjacent layers', () => {
      // Create a graph with clear layer structure
      const graph = {
        nodes: () => ['A0', 'A1', 'A2', 'B0', 'B1', 'B2', 'C0', 'C1', 'C2'],
        edges: () => [
          ['A0', 'B0'], ['A1', 'B1'], ['A2', 'B2'],  // Parallel edges
          ['B0', 'C0'], ['B1', 'C1'], ['B2', 'C2']   // Parallel edges
        ]
      };
      const subsets = [['A0', 'A1', 'A2'], ['B0', 'B1', 'B2'], ['C0', 'C1', 'C2']];
      
      const positions = multipartiteLayout(graph, subsets, 'vertical');
      
      // Check that connected nodes have similar y-coordinates
      graph.edges().forEach(([u, v]) => {
        const yDiff = Math.abs(positions[u][1] - positions[v][1]);
        assert.isBelow(yDiff, 2); // Connected nodes should be roughly aligned
      });
    });

    it('should create clear visual separation between layers', () => {
      const graph = completeGraph(15);
      const subsets = [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14]
      ];
      
      const positions = multipartiteLayout(graph, subsets, 'vertical');
      
      // Calculate min distance between layers
      let minInterLayerDist = Infinity;
      for (let i = 0; i < subsets.length - 1; i++) {
        for (const u of subsets[i]) {
          for (const v of subsets[i + 1]) {
            const dist = Math.abs(positions[u][0] - positions[v][0]);
            minInterLayerDist = Math.min(minInterLayerDist, dist);
          }
        }
      }
      
      // Layers should be clearly separated
      assert.isAbove(minInterLayerDist, 0.4); // Allow slightly closer layers
    });
  });
});

// Helper functions
function getLayoutSpan(positions) {
  const nodes = Object.keys(positions);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, positions[node][0]);
    maxX = Math.max(maxX, positions[node][0]);
    minY = Math.min(minY, positions[node][1]);
    maxY = Math.max(maxY, positions[node][1]);
  });
  
  return {
    width: maxX - minX,
    height: maxY - minY
  };
}

function getCenterOfMass(positions) {
  const nodes = Object.keys(positions);
  const com = [0, 0];
  
  nodes.forEach(node => {
    com[0] += positions[node][0];
    com[1] += positions[node][1];
  });
  
  com[0] /= nodes.length;
  com[1] /= nodes.length;
  return com;
}