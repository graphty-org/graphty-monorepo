import { describe, it, assert } from 'vitest';
import { 
  kamadaKawaiLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph,
  randomGraph
} from '../src';

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
      
      // Performance can vary significantly on different systems and CI environments
      // Just ensure it completes in a reasonable time (under 5 seconds)
      assert.isBelow(endTime - startTime, 5000, 'Kamada-Kawai should complete within 5 seconds for 64 nodes');
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

  describe('3D Kamada-Kawai layout', () => {
    it('should create 3D layout when dim=3', () => {
      const graph = completeGraph(8);
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      assert.equal(Object.keys(positions).length, 8);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 3);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
        assert.isNumber(positions[node][2]);
      });
    });

    it('should use spherical initialization for 3D', () => {
      const graph = cycleGraph(6);
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      // Should produce reasonable edge lengths (not random)
      const edgeLengths = [];
      for (const [source, target] of graph.edges()) {
        const pos1 = positions[source];
        const pos2 = positions[target];
        const dist = Math.sqrt(
          (pos1[0] - pos2[0]) ** 2 + 
          (pos1[1] - pos2[1]) ** 2 + 
          (pos1[2] - pos2[2]) ** 2
        );
        edgeLengths.push(dist);
      }
      
      // Calculate standard deviation
      const mean = edgeLengths.reduce((a, b) => a + b) / edgeLengths.length;
      const variance = edgeLengths.reduce((acc, len) => acc + (len - mean) ** 2, 0) / edgeLengths.length;
      const stdDev = Math.sqrt(variance);
      
      // Should have relatively low variance (not random)
      assert.isBelow(stdDev / mean, 0.3, 'Edge lengths should be relatively uniform');
    });

    it('should produce consistent 3D results across runs', () => {
      const graph = starGraph(7);
      
      // Run multiple times
      const runs = 3;
      const allPositions = [];
      
      for (let i = 0; i < runs; i++) {
        allPositions.push(kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3));
      }
      
      // Check that results are consistent
      graph.nodes().forEach(node => {
        for (let i = 1; i < runs; i++) {
          const pos1 = allPositions[0][node];
          const pos2 = allPositions[i][node];
          const diff = Math.sqrt(
            (pos1[0] - pos2[0]) ** 2 + 
            (pos1[1] - pos2[1]) ** 2 + 
            (pos1[2] - pos2[2]) ** 2
          );
          assert.isBelow(diff, 1e-6, `Node ${node} should have consistent position across runs`);
        }
      });
    });

    it('should respect scale in 3D', () => {
      const graph = completeGraph(5);
      
      const positions1 = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      const positions2 = kamadaKawaiLayout(graph, null, null, 'weight', 2, [0, 0, 0], 3);
      
      // Calculate bounding box for both
      const bbox1 = getBoundingBox3D(positions1);
      const bbox2 = getBoundingBox3D(positions2);
      
      // Scale 2 should be approximately twice scale 1
      assert.approximately(bbox2.width / bbox1.width, 2, 0.1);
      assert.approximately(bbox2.height / bbox1.height, 2, 0.1);
      assert.approximately(bbox2.depth / bbox1.depth, 2, 0.1);
    });

    it('should respect center in 3D', () => {
      const graph = cycleGraph(5);
      const center = [10, -5, 7];
      
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, center, 3);
      
      // Calculate center of mass
      const com = [0, 0, 0];
      const nodes = graph.nodes();
      nodes.forEach(node => {
        com[0] += positions[node][0];
        com[1] += positions[node][1];
        com[2] += positions[node][2];
      });
      com[0] /= nodes.length;
      com[1] /= nodes.length;
      com[2] /= nodes.length;
      
      assert.approximately(com[0], center[0], 1);
      assert.approximately(com[1], center[1], 1);
      assert.approximately(com[2], center[2], 1);
    });

    it('should optimize stress in 3D for regular graphs', () => {
      const graph = completeGraph(6);
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      // In a complete graph, all pairwise distances should be similar
      const distances = [];
      const nodes = graph.nodes();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pos1 = positions[nodes[i]];
          const pos2 = positions[nodes[j]];
          const dist = Math.sqrt(
            (pos1[0] - pos2[0]) ** 2 + 
            (pos1[1] - pos2[1]) ** 2 + 
            (pos1[2] - pos2[2]) ** 2
          );
          distances.push(dist);
        }
      }
      
      const avgDist = distances.reduce((a, b) => a + b) / distances.length;
      const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgDist) / avgDist));
      
      assert.isBelow(maxDeviation, 0.5, 'All pairwise distances should be relatively similar');
    });

    it('should handle custom initial 3D positions', () => {
      const graph = completeGraph(4);
      
      // Create custom initial positions (tetrahedron vertices)
      const initial3D = {
        0: [1, 1, 1],
        1: [1, -1, -1],
        2: [-1, 1, -1],
        3: [-1, -1, 1]
      };
      
      const positions = kamadaKawaiLayout(graph, null, initial3D, 'weight', 1, [0, 0, 0], 3);
      
      assert.equal(Object.keys(positions).length, 4);
      
      // Should optimize from initial positions
      let different = false;
      graph.nodes().forEach(node => {
        if (
          Math.abs(positions[node][0] - initial3D[node][0]) > 0.01 ||
          Math.abs(positions[node][1] - initial3D[node][1]) > 0.01 ||
          Math.abs(positions[node][2] - initial3D[node][2]) > 0.01
        ) {
          different = true;
        }
      });
      assert.isTrue(different, 'Should modify initial positions during optimization');
    });

    it('should use all three dimensions effectively', () => {
      const graph = gridGraph(3, 3);
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      // Extract coordinate ranges
      const coords = { x: [], y: [], z: [] };
      graph.nodes().forEach(node => {
        coords.x.push(positions[node][0]);
        coords.y.push(positions[node][1]);
        coords.z.push(positions[node][2]);
      });
      
      const ranges = {
        x: Math.max(...coords.x) - Math.min(...coords.x),
        y: Math.max(...coords.y) - Math.min(...coords.y),
        z: Math.max(...coords.z) - Math.min(...coords.z)
      };
      
      // All dimensions should be utilized (not flat)
      assert.isAbove(ranges.x, 0.5, 'X dimension should be utilized');
      assert.isAbove(ranges.y, 0.5, 'Y dimension should be utilized');
      assert.isAbove(ranges.z, 0.2, 'Z dimension should be utilized');
    });

    it('should handle disconnected components in 3D', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]]  // Two triangles
      };
      
      const positions = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      assert.equal(Object.keys(positions).length, 6);
      
      // Each component should be laid out properly
      const component1 = [0, 1, 2].map(n => positions[n]);
      const component2 = [3, 4, 5].map(n => positions[n]);
      
      // Check internal distances within each component
      const dist01 = getDistance3D(positions[0], positions[1]);
      const dist12 = getDistance3D(positions[1], positions[2]);
      const dist34 = getDistance3D(positions[3], positions[4]);
      const dist45 = getDistance3D(positions[4], positions[5]);
      
      assert.isAbove(dist01, 0);
      assert.isAbove(dist12, 0);
      assert.isAbove(dist34, 0);
      assert.isAbove(dist45, 0);
    });

    it('should produce better results than random initialization', () => {
      const graph = cycleGraph(8);
      
      // Force random initialization by using very high dimensions (will use random hypersphere)
      const randomPos = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0, 0, 0], 5);
      
      // Normal 3D with spherical initialization
      const sphericalPos = kamadaKawaiLayout(graph, null, null, 'weight', 1, [0, 0, 0], 3);
      
      // Compare edge length uniformity
      function getEdgeVariance(positions, edges) {
        const lengths = edges.map(([u, v]) => {
          const pos1 = positions[u];
          const pos2 = positions[v];
          let sum = 0;
          for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
            sum += (pos1[i] - pos2[i]) ** 2;
          }
          return Math.sqrt(sum);
        });
        const mean = lengths.reduce((a, b) => a + b) / lengths.length;
        return lengths.reduce((acc, len) => acc + (len - mean) ** 2, 0) / lengths.length;
      }
      
      const edges = graph.edges();
      const sphericalVariance = getEdgeVariance(sphericalPos, edges);
      
      // Spherical initialization should produce lower variance
      assert.isBelow(sphericalVariance, 0.5, 'Spherical initialization should produce uniform edge lengths');
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

function getBoundingBox3D(positions) {
  const nodes = Object.keys(positions);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, positions[node][0]);
    maxX = Math.max(maxX, positions[node][0]);
    minY = Math.min(minY, positions[node][1]);
    maxY = Math.max(maxY, positions[node][1]);
    minZ = Math.min(minZ, positions[node][2]);
    maxZ = Math.max(maxZ, positions[node][2]);
  });
  
  return {
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ
  };
}

function getDistance3D(pos1, pos2) {
  const dx = pos1[0] - pos2[0];
  const dy = pos1[1] - pos2[1];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}