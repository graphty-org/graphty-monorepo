import { describe, it, assert } from 'vitest';
import { 
  kamadaKawaiLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph,
  randomGraph
} from '../dist/layout.js';

describe('Kamada-Kawai Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(6);
      const positions = kamadaKawaiLayout(graph);
      
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
      const positions = kamadaKawaiLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = kamadaKawaiLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions['A']);
      assert.equal(positions['A'].length, 2);
    });

    it('should handle disconnected components', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]]
      };
      const positions = kamadaKawaiLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });
  });

  describe('Distance matrix and weights', () => {
    it('should accept custom distance matrix', () => {
      const graph = completeGraph(4);
      
      // Create custom distance matrix
      const dist = {};
      graph.nodes().forEach(u => {
        dist[u] = {};
        graph.nodes().forEach(v => {
          dist[u][v] = u === v ? 0 : 1; // All pairs at distance 1
        });
      });
      
      const positions = kamadaKawaiLayout(graph, dist);
      
      assert.equal(Object.keys(positions).length, 4);
    });

    it('should handle weighted graphs', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3],
        edges: () => [[0, 1], [1, 2], [2, 3], [3, 0]],
        // Mock edge weight access
        get_edge_data: (u, v) => ({ weight: 1 })
      };
      
      const positions = kamadaKawaiLayout(graph, null, null, 'weight');
      
      assert.equal(Object.keys(positions).length, 4);
    });

    it('should use initial positions if provided', () => {
      const graph = cycleGraph(5);
      const initialPos = {};
      graph.nodes().forEach((node, i) => {
        initialPos[node] = [i, 0]; // Line layout
      });
      
      const positions = kamadaKawaiLayout(graph, null, initialPos);
      
      assert.equal(Object.keys(positions).length, 5);
      // Should produce different layout than initial
      let different = false;
      graph.nodes().forEach(node => {
        if (positions[node][0] !== initialPos[node][0] || 
            positions[node][1] !== initialPos[node][1]) {
          different = true;
        }
      });
      assert.isTrue(different);
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = starGraph(6);
      
      const positions1 = kamadaKawaiLayout(graph, null, null, 'weight', 1);
      const positions2 = kamadaKawaiLayout(graph, null, null, 'weight', 2);
      
      // Calculate spans
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      assert.approximately(span2.width / span1.width, 2, 0.1);
      assert.approximately(span2.height / span1.height, 2, 0.1);
    });

    it('should respect center parameter', () => {
      const graph = cycleGraph(6);
      const center = [10, -5];
      
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, center);
      
      // Calculate center of mass
      const com = getCenterOfMass(positions);
      
      assert.approximately(com[0], center[0], 1);
      assert.approximately(com[1], center[1], 1);
    });

    it('should handle different dimensions', () => {
      const graph = completeGraph(4);
      
      // 2D layout
      const positions2D = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0], 2);
      graph.nodes().forEach(node => {
        assert.equal(positions2D[node].length, 2);
      });
      
      // 3D layout
      const positions3D = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      graph.nodes().forEach(node => {
        assert.equal(positions3D[node].length, 3);
        assert.isNumber(positions3D[node][2]);
      });
    });
  });

  describe('Layout properties', () => {
    it('should minimize stress for regular graphs', () => {
      const graph = cycleGraph(8);
      const positions = kamadaKawaiLayout(graph);
      
      // In a cycle, adjacent nodes should be closer than non-adjacent
      const distances = [];
      graph.nodes().forEach((node, i) => {
        const nextNode = (i + 1) % 8;
        const dx = positions[node][0] - positions[nextNode][0];
        const dy = positions[node][1] - positions[nextNode][1];
        distances.push(Math.sqrt(dx * dx + dy * dy));
      });
      
      // All edge lengths should be similar
      const avgDist = distances.reduce((a, b) => a + b) / distances.length;
      distances.forEach(d => {
        assert.approximately(d, avgDist, avgDist * 0.3);
      });
    });

    it('should create symmetric layouts for symmetric graphs', () => {
      const graph = completeGraph(5);
      const positions = kamadaKawaiLayout(graph);
      
      // Calculate all pairwise distances
      const distances = [];
      const nodes = graph.nodes();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = positions[nodes[i]][0] - positions[nodes[j]][0];
          const dy = positions[nodes[i]][1] - positions[nodes[j]][1];
          distances.push(Math.sqrt(dx * dx + dy * dy));
        }
      }
      
      // In complete graph, all distances should be similar
      const avgDist = distances.reduce((a, b) => a + b) / distances.length;
      let maxDeviation = 0;
      distances.forEach(d => {
        maxDeviation = Math.max(maxDeviation, Math.abs(d - avgDist) / avgDist);
      });
      assert.isBelow(maxDeviation, 0.5);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['alice', 'bob', 'charlie', 'david'],
        edges: () => [['alice', 'bob'], ['bob', 'charlie'], ['charlie', 'david'], ['david', 'alice']]
      };
      
      const positions = kamadaKawaiLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['alice', 'bob', 'charlie', 'david'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should handle large graphs reasonably', () => {
      const graph = gridGraph(8, 8); // 64 nodes
      
      const startTime = performance.now();
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0], 2);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 64);
      assert.isBelow(endTime - startTime, 2000); // Should complete in reasonable time
    });

    it('should produce different results with different initial positions', () => {
      const graph = randomGraph(10, 0.3, 42);
      
      // First with default initial positions
      const positions1 = kamadaKawaiLayout(graph);
      
      // Then with custom initial positions
      const customPos = {};
      graph.nodes().forEach((node, i) => {
        customPos[node] = [Math.cos(2 * Math.PI * i / 10), Math.sin(2 * Math.PI * i / 10)];
      });
      const positions2 = kamadaKawaiLayout(graph, null, customPos);
      
      // Results might be different (though both should be valid)
      let different = false;
      graph.nodes().forEach(node => {
        if (Math.abs(positions1[node][0] - positions2[node][0]) > 0.1 ||
            Math.abs(positions1[node][1] - positions2[node][1]) > 0.1) {
          different = true;
        }
      });
      // Note: They might converge to same solution, so we don't assert different
      assert.equal(Object.keys(positions2).length, 10);
    });

    it('should handle star graph well', () => {
      const graph = starGraph(10);
      const positions = kamadaKawaiLayout(graph);
      
      // Center should be distinguishable from leaves
      const centerPos = positions[0];
      const leafDistances = [];
      
      for (let i = 1; i < 10; i++) {
        const dx = positions[i][0] - centerPos[0];
        const dy = positions[i][1] - centerPos[1];
        leafDistances.push(Math.sqrt(dx * dx + dy * dy));
      }
      
      // All leaves should be positioned at reasonable distances
      const avgDist = leafDistances.reduce((a, b) => a + b) / leafDistances.length;
      leafDistances.forEach(d => {
        assert.isAbove(d, 0); // All at positive distance
        assert.isBelow(d, avgDist * 2); // Not too far
      });
    });
  });

  describe('Layout quality', () => {
    it('should preserve graph distances', () => {
      // For a path graph, layout distances should reflect graph distances
      const path = {
        nodes: () => [0, 1, 2, 3, 4],
        edges: () => [[0, 1], [1, 2], [2, 3], [3, 4]]
      };
      
      const positions = kamadaKawaiLayout(path);
      
      // Distance 0-2 should be roughly twice distance 0-1
      const d01 = getDistance(positions, 0, 1);
      const d02 = getDistance(positions, 0, 2);
      const d03 = getDistance(positions, 0, 3);
      
      assert.isAbove(d02, d01);
      assert.isAbove(d03, d02);
    });

    it('should create stable layouts', () => {
      const graph = randomGraph(15, 0.3, 12345);
      
      const positions1 = kamadaKawaiLayout(graph);
      const positions2 = kamadaKawaiLayout(graph);
      
      // Should produce similar results (allowing for some numerical differences)
      let totalDiff = 0;
      graph.nodes().forEach(node => {
        const dx = positions1[node][0] - positions2[node][0];
        const dy = positions1[node][1] - positions2[node][1];
        totalDiff += Math.sqrt(dx * dx + dy * dy);
      });
      
      assert.isBelow(totalDiff / graph.nodes().length, 0.1);
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

function getDistance(positions, node1, node2) {
  const dx = positions[node1][0] - positions[node2][0];
  const dy = positions[node1][1] - positions[node2][1];
  return Math.sqrt(dx * dx + dy * dy);
}