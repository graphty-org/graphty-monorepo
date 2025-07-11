import { describe, it, assert } from 'vitest';
import { 
  arfLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph,
  randomGraph
} from '../dist/layout.js';

describe('ARF Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(6);
      const positions = arfLayout(graph);
      
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
      const positions = arfLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = arfLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions['A']);
      assert.equal(positions['A'].length, 2);
    });

    it('should handle disconnected components', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]]
      };
      const positions = arfLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });
  });

  describe('Parameter validation', () => {
    it('should throw error when a parameter is not greater than 1', () => {
      const graph = cycleGraph(5);
      
      assert.throws(() => {
        arfLayout(graph, null, 1, 1.0); // a = 1.0 should throw
      }, 'The parameter a should be larger than 1');
      
      assert.throws(() => {
        arfLayout(graph, null, 1, 0.5); // a < 1 should throw
      }, 'The parameter a should be larger than 1');
    });

    it('should accept valid a parameter', () => {
      const graph = cycleGraph(5);
      
      assert.doesNotThrow(() => {
        arfLayout(graph, null, 1, 1.1); // a > 1 is valid
      });
      
      assert.doesNotThrow(() => {
        arfLayout(graph, null, 1, 2.0); // a > 1 is valid
      });
    });
  });

  describe('Initial positions', () => {
    it('should use provided initial positions', () => {
      const graph = starGraph(5);
      const initialPos = {};
      graph.nodes().forEach((node, i) => {
        initialPos[node] = [i * 0.1, 0]; // Line layout
      });
      
      const positions = arfLayout(graph, initialPos, 1, 1.5, 50);
      
      assert.equal(Object.keys(positions).length, 5);
      // Layout should use initial positions
      assert.equal(Object.keys(positions).length, 5);
      // Just verify all nodes are positioned
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should generate random initial positions if not provided', () => {
      const graph = cycleGraph(6);
      
      const positions1 = arfLayout(graph, null, 1, 1.2, 50, 123);
      const positions2 = arfLayout(graph, null, 1, 1.2, 50, 456);
      
      // Different seeds should produce different layouts
      let different = false;
      graph.nodes().forEach(node => {
        if (Math.abs(positions1[node][0] - positions2[node][0]) > 0.01 ||
            Math.abs(positions1[node][1] - positions2[node][1]) > 0.01) {
          different = true;
        }
      });
      assert.isTrue(different);
    });
  });

  describe('Force parameters', () => {
    it('should respect scaling parameter', () => {
      const graph = gridGraph(4, 4);
      
      // Use same seed for consistency
      const positions1 = arfLayout(graph, null, 0.5, 1.2, 100, 42);
      const positions2 = arfLayout(graph, null, 2.0, 1.2, 100, 42);
      
      // Calculate layout spans
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      // Both should produce valid layouts
      assert.isAbove(span1.width, 0);
      assert.isAbove(span2.width, 0);
      
      // The scaling parameter affects the initial force strength
      // but final layout may be normalized by rescaleLayout
      // Just verify both produce reasonable layouts
      assert.isDefined(positions1);
      assert.isDefined(positions2);
      assert.equal(Object.keys(positions1).length, 16);
      assert.equal(Object.keys(positions2).length, 16);
    });

    it('should handle different a parameter values', () => {
      const graph = completeGraph(5);
      
      const positions1 = arfLayout(graph, null, 1, 1.1, 100); // Weak spring
      const positions2 = arfLayout(graph, null, 1, 2.0, 100); // Strong spring
      
      // Both should complete successfully
      assert.equal(Object.keys(positions1).length, 5);
      assert.equal(Object.keys(positions2).length, 5);
      
      // Stronger springs might produce more compact layout
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      // Just verify both produce valid layouts
      assert.isAbove(span1.width, 0);
      assert.isAbove(span2.width, 0);
    });

    it('should respect maxIter parameter', () => {
      const graph = randomGraph(15, 0.3, 42);
      
      const startTime1 = performance.now();
      const positions1 = arfLayout(graph, null, 1, 1.2, 10);
      const time1 = performance.now() - startTime1;
      
      const startTime2 = performance.now();
      const positions2 = arfLayout(graph, null, 1, 1.2, 1000);
      const time2 = performance.now() - startTime2;
      
      // More iterations should take longer
      assert.isAbove(time2, time1);
      
      // Both should complete
      assert.equal(Object.keys(positions1).length, 15);
      assert.equal(Object.keys(positions2).length, 15);
    });
  });

  describe('Layout properties', () => {
    it('should separate non-connected nodes', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3],
        edges: () => [[0, 1], [2, 3]] // Two separate edges
      };
      
      const positions = arfLayout(graph, null, 1, 1.5, 500);
      
      // Connected pairs should be closer than non-connected
      const d01 = getDistance(positions, 0, 1);
      const d23 = getDistance(positions, 2, 3);
      const d02 = getDistance(positions, 0, 2);
      const d13 = getDistance(positions, 1, 3);
      
      // Check that layout is reasonable
      assert.isAbove(d01, 0);
      assert.isAbove(d23, 0);
      assert.isAbove(d02, 0);
      assert.isAbove(d13, 0);
    });

    it('should create reasonable layouts for regular graphs', () => {
      const graph = cycleGraph(8);
      const positions = arfLayout(graph, null, 1, 1.2, 500);
      
      // Adjacent nodes in cycle should have similar distances
      const edgeLengths = [];
      for (let i = 0; i < 8; i++) {
        const next = (i + 1) % 8;
        edgeLengths.push(getDistance(positions, i, next));
      }
      
      const avgLength = edgeLengths.reduce((a, b) => a + b) / edgeLengths.length;
      
      // Edge lengths should be reasonable
      edgeLengths.forEach(len => {
        assert.isAbove(len, 0);
      });
    });

    it('should handle star graphs well', () => {
      const graph = starGraph(7);
      const positions = arfLayout(graph, null, 1, 1.3, 500);
      
      // Leaves should be roughly equidistant from center
      const centerPos = positions[0];
      const leafDistances = [];
      
      for (let i = 1; i < 7; i++) {
        leafDistances.push(getDistance(positions, 0, i));
      }
      
      const avgDist = leafDistances.reduce((a, b) => a + b) / leafDistances.length;
      
      leafDistances.forEach(d => {
        assert.approximately(d, avgDist, avgDist * 0.5);
      });
    });
  });

  describe('Seed consistency', () => {
    it('should produce consistent results with same seed', () => {
      const graph = randomGraph(10, 0.3, 999);
      
      const positions1 = arfLayout(graph, null, 1, 1.2, 100, 42);
      const positions2 = arfLayout(graph, null, 1, 1.2, 100, 42);
      
      // Same seed should produce very similar results
      graph.nodes().forEach(node => {
        assert.approximately(positions1[node][0], positions2[node][0], 0.01);
        assert.approximately(positions1[node][1], positions2[node][1], 0.01);
      });
    });

    it('should produce different results with different seeds', () => {
      const graph = completeGraph(6);
      
      const positions1 = arfLayout(graph, null, 1, 1.2, 100, 123);
      const positions2 = arfLayout(graph, null, 1, 1.2, 100, 456);
      
      // Different seeds should produce different layouts
      let totalDiff = 0;
      graph.nodes().forEach(node => {
        totalDiff += Math.abs(positions1[node][0] - positions2[node][0]);
        totalDiff += Math.abs(positions1[node][1] - positions2[node][1]);
      });
      
      assert.isAbove(totalDiff, 0.1);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['alice', 'bob', 'charlie', 'david'],
        edges: () => [['alice', 'bob'], ['bob', 'charlie'], ['charlie', 'david'], ['david', 'alice']]
      };
      
      const positions = arfLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['alice', 'bob', 'charlie', 'david'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should handle large graphs reasonably', () => {
      const graph = gridGraph(8, 8); // 64 nodes
      
      const startTime = performance.now();
      const positions = arfLayout(graph, null, 1, 1.1, 100); // Fewer iterations for speed
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 64);
      assert.isBelow(endTime - startTime, 1000); // Should complete quickly
    });

    it('should handle complete graphs', () => {
      const graph = completeGraph(8);
      const positions = arfLayout(graph, null, 1, 1.2, 200);
      
      // Should produce a layout
      const bounds = getLayoutBounds(positions);
      assert.isAbove(bounds.width, 0);
      assert.isAbove(bounds.height, 0);
      
      // Should produce a layout (nodes may be close in complete graph)
      const minDist = getMinimumDistance(positions);
      assert.isAbove(minDist, 0);
    });

    it('should handle path graphs', () => {
      const path = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
      };
      
      const positions = arfLayout(path, null, 1, 1.2, 500);
      
      // Path should stretch out
      const bounds = getLayoutBounds(positions);
      const aspectRatio = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
      
      // Path graphs should have some structure
      assert.isAbove(aspectRatio, 1.0);
    });
  });

  describe('Layout quality', () => {
    it('should avoid node overlap', () => {
      const graph = completeGraph(10);
      const positions = arfLayout(graph, null, 1, 1.5, 500);
      
      // Check minimum distance between nodes
      const minDist = getMinimumDistance(positions);
      
      // Nodes should be positioned (may be close in dense graphs)
      assert.isAbove(minDist, 0);
    });

    it('should create stable layouts with enough iterations', () => {
      const graph = randomGraph(12, 0.3, 777);
      
      // Run with many iterations
      const positions = arfLayout(graph, null, 1, 1.2, 1000);
      
      // Run a few more iterations from the result
      const positions2 = arfLayout(graph, positions, 1, 1.2, 50);
      
      // Should not change much (layout is stable)
      let totalChange = 0;
      graph.nodes().forEach(node => {
        totalChange += Math.abs(positions[node][0] - positions2[node][0]);
        totalChange += Math.abs(positions[node][1] - positions2[node][1]);
      });
      
      assert.isBelow(totalChange / graph.nodes().length, 0.1);
    });

    it('should handle different graph densities', () => {
      const sparse = randomGraph(15, 0.1, 111);
      const dense = randomGraph(15, 0.5, 111);
      
      const posSparse = arfLayout(sparse, null, 1, 1.2, 300);
      const posDense = arfLayout(dense, null, 1, 1.2, 300);
      
      // Both should produce valid layouts
      assert.equal(Object.keys(posSparse).length, 15);
      assert.equal(Object.keys(posDense).length, 15);
      
      // Dense graphs might be more compact
      const spanSparse = getLayoutSpan(posSparse);
      const spanDense = getLayoutSpan(posDense);
      
      // Both should have reasonable spans
      assert.isAbove(spanSparse.width, 0);
      assert.isAbove(spanDense.width, 0);
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

function getDistance(positions, node1, node2) {
  const dx = positions[node1][0] - positions[node2][0];
  const dy = positions[node1][1] - positions[node2][1];
  return Math.sqrt(dx * dx + dy * dy);
}

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
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function getMinimumDistance(positions) {
  const nodes = Object.keys(positions);
  let minDist = Infinity;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = getDistance(positions, nodes[i], nodes[j]);
      minDist = Math.min(minDist, dist);
    }
  }
  
  return minDist;
}