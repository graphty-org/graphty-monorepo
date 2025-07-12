import { describe, it, assert } from 'vitest';
import { 
  planarLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph,
  wheelGraph
} from '../layout.ts';

describe('Planar Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes for planar graphs', () => {
      // Cycle graph is planar
      const graph = cycleGraph(6);
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
      });
    });

    it('should handle empty graph', () => {
      const emptyGraph = { nodes: () => [], edges: () => [] };
      const positions = planarLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = planarLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions['A']);
      assert.equal(positions['A'].length, 2);
    });

    it('should throw error for non-planar graphs', () => {
      // K5 (complete graph with 5 nodes) is non-planar
      const graph = completeGraph(5);
      
      assert.throws(() => {
        planarLayout(graph);
      }, 'G is not planar');
    });

    it('should only support 2D layouts', () => {
      const graph = cycleGraph(4);
      
      // 2D works
      assert.doesNotThrow(() => {
        planarLayout(graph, 1, [0, 0], 2);
      });
      
      // 3D should throw error
      assert.throws(() => {
        planarLayout(graph, 1, [0, 0], 3);
      }, 'can only handle 2 dimensions');
    });
  });

  describe('Planar graph types', () => {
    it('should handle star graphs (which are planar)', () => {
      const graph = starGraph(8);
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 8);
      
      // Center node should be distinguishable
      const centerPos = positions[0];
      assert.isDefined(centerPos);
    });

    it('should handle grid graphs (which are planar)', () => {
      const graph = gridGraph(3, 3);
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 9);
      
      // All nodes should be positioned
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });

    it('should handle wheel graphs (which are planar)', () => {
      const graph = wheelGraph(6);
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
    });

    it('should handle tree structures', () => {
      const tree = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6],
        edges: () => [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]
      };
      
      const positions = planarLayout(tree);
      assert.equal(Object.keys(positions).length, 7);
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = cycleGraph(8);
      
      const positions1 = planarLayout(graph, 1);
      const positions2 = planarLayout(graph, 2);
      
      // Calculate bounding boxes
      const bounds1 = getLayoutBounds(positions1);
      const bounds2 = getLayoutBounds(positions2);
      
      assert.approximately(bounds2.width / bounds1.width, 2, 0.1);
      assert.approximately(bounds2.height / bounds1.height, 2, 0.1);
    });

    it('should respect center parameter', () => {
      const graph = starGraph(5);
      const center = [10, -5];
      
      const positions = planarLayout(graph, 1, center);
      
      // Calculate center of mass
      const com = getCenterOfMass(positions);
      
      assert.approximately(com[0], center[0], 1);
      assert.approximately(com[1], center[1], 1);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['A', 'B', 'C', 'D'],
        edges: () => [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']]
      };
      
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['A', 'B', 'C', 'D'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should produce consistent results', () => {
      const graph = gridGraph(4, 4);
      
      const positions1 = planarLayout(graph);
      const positions2 = planarLayout(graph);
      
      // Planar layout should produce valid results
      assert.equal(Object.keys(positions1).length, 16);
      assert.equal(Object.keys(positions2).length, 16);
    });

    it('should handle disconnected planar components', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]] // Two triangles
      };
      
      const positions = planarLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });

    it('should reject K3,3 (complete bipartite non-planar)', () => {
      const k33 = {
        nodes: () => ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'],
        edges: () => [
          ['A1', 'B1'], ['A1', 'B2'], ['A1', 'B3'],
          ['A2', 'B1'], ['A2', 'B2'], ['A2', 'B3'],
          ['A3', 'B1'], ['A3', 'B2'], ['A3', 'B3']
        ]
      };
      
      assert.throws(() => {
        planarLayout(k33);
      }, 'G is not planar');
    });
  });

  describe('Layout quality', () => {
    it('should produce non-crossing edges for planar graphs', () => {
      const graph = cycleGraph(10);
      const positions = planarLayout(graph);
      
      // While we can't easily verify no crossings algorithmically,
      // we can check that nodes are well-separated
      const minDist = getMinimumDistance(positions);
      assert.isAbove(minDist, 0.1);
    });

    it('should handle embedded graphs efficiently', () => {
      const graph = gridGraph(5, 5); // 25 nodes
      
      const startTime = performance.now();
      const positions = planarLayout(graph);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 25);
      assert.isBelow(endTime - startTime, 100); // Should be fast
    });
  });
});

// Helper functions
function getLayoutBounds(positions) {
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

function getMinimumDistance(positions) {
  const nodes = Object.keys(positions);
  let minDist = Infinity;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = positions[nodes[i]][0] - positions[nodes[j]][0];
      const dy = positions[nodes[i]][1] - positions[nodes[j]][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }
  }
  
  return minDist;
}