import { describe, it, assert } from 'vitest';
import { 
  circularLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  wheelGraph,
  gridGraph,
  randomGraph
} from '../src';

describe('Circular Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(6);
      const positions = circularLayout(graph);
      
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
      const positions = circularLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = circularLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.deepEqual(positions['A'], [0, 0]);
    });

    it('should handle disconnected components', () => {
      const disconnected = {
        nodes: () => ['A', 'B', 'C', 'D'],
        edges: () => [['A', 'B'], ['C', 'D']]
      };
      const positions = circularLayout(disconnected);
      
      assert.equal(Object.keys(positions).length, 4);
      ['A', 'B', 'C', 'D'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });
  });

  describe('Circular arrangement properties', () => {
    it('should arrange nodes in a circle with equal distances from center', () => {
      const n = 8;
      const graph = cycleGraph(n);
      const positions = circularLayout(graph);
      
      // Calculate distances from origin (default center)
      const distances = graph.nodes().map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      
      // All distances should be equal
      const firstDistance = distances[0];
      distances.forEach(d => {
        assert.approximately(d, firstDistance, 1e-10);
      });
      
      // Distance should be 1 (default scale)
      assert.approximately(firstDistance, 1, 1e-10);
    });

    it('should space nodes evenly around the circle', () => {
      const n = 6;
      const graph = completeGraph(n);
      const positions = circularLayout(graph);
      
      // Calculate angles from center
      const angles = graph.nodes().map(node => {
        const [x, y] = positions[node];
        return Math.atan2(y, x);
      }).sort((a, b) => a - b);
      
      // Calculate angle differences
      const angleDiffs: number[] = [];
      for (let i = 0; i < n; i++) {
        const diff = i < n - 1 
          ? angles[i + 1] - angles[i]
          : angles[0] + 2 * Math.PI - angles[i];
        angleDiffs.push(diff);
      }
      
      // All angle differences should be equal (2π/n)
      const expectedAngle = 2 * Math.PI / n;
      angleDiffs.forEach(diff => {
        assert.approximately(diff, expectedAngle, 1e-5);
      });
    });

    it('should maintain circular arrangement for different graph types', () => {
      const graphs = [
        completeGraph(5),
        cycleGraph(5),
        starGraph(5),
        wheelGraph(5)
      ];
      
      graphs.forEach(graph => {
        const positions = circularLayout(graph);
        
        // Check all nodes are on a circle
        const distances = graph.nodes().map(node => {
          const [x, y] = positions[node];
          return Math.sqrt(x * x + y * y);
        });
        
        const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
        distances.forEach(d => {
          assert.isBelow(Math.abs(d - avgDistance), 0.001);
        });
      });
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = cycleGraph(4);
      const scale1 = 1;
      const scale2 = 2.5;
      
      const positions1 = circularLayout(graph, scale1);
      const positions2 = circularLayout(graph, scale2);
      
      // Calculate radii
      const radius1 = Math.sqrt(positions1[0][0] ** 2 + positions1[0][1] ** 2);
      const radius2 = Math.sqrt(positions2[0][0] ** 2 + positions2[0][1] ** 2);
      
      assert.approximately(radius2 / radius1, scale2 / scale1, 1e-5);
    });

    it('should respect center parameter', () => {
      const graph = starGraph(5);
      const center1 = [0, 0];
      const center2 = [3, 4];
      
      const positions1 = circularLayout(graph, 1, center1);
      const positions2 = circularLayout(graph, 1, center2);
      
      // Check that all positions are shifted by the center difference
      graph.nodes().forEach(node => {
        assert.approximately(positions2[node][0] - positions1[node][0], 3, 1e-10);
        assert.approximately(positions2[node][1] - positions1[node][1], 4, 1e-10);
      });
    });

    it('should handle different dimensions', () => {
      const graph = completeGraph(4);
      
      // 2D layout (default)
      const positions2D = circularLayout(graph, 1, [0, 0], 2);
      graph.nodes().forEach(node => {
        assert.equal(positions2D[node].length, 2);
      });
      
      // 3D layout
      const positions3D = circularLayout(graph, 1, [0, 0, 0], 3);
      graph.nodes().forEach(node => {
        assert.equal(positions3D[node].length, 3);
        // In 3D spherical layout, z-coordinates should vary
        assert.isNumber(positions3D[node][2]);
      });
    });

    it('should produce same layout for same inputs', () => {
      const graph = randomGraph(10, 0.3, 12345);
      
      const positions1 = circularLayout(graph, 1.5, [2, 3]);
      const positions2 = circularLayout(graph, 1.5, [2, 3]);
      
      // Circular layout is deterministic
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle graphs with string node IDs', () => {
      const graph = {
        nodes: () => ['alice', 'bob', 'charlie', 'david'],
        edges: () => [['alice', 'bob'], ['bob', 'charlie'], ['charlie', 'david'], ['david', 'alice']]
      };
      
      const positions = circularLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['alice', 'bob', 'charlie', 'david'].forEach(node => {
        assert.isDefined(positions[node]);
        const [x, y] = positions[node];
        const radius = Math.sqrt(x * x + y * y);
        assert.approximately(radius, 1, 1e-10);
      });
    });

    it('should handle large graphs efficiently', () => {
      const n = 100;
      const graph = cycleGraph(n);
      
      const startTime = performance.now();
      const positions = circularLayout(graph);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, n);
      assert.isBelow(endTime - startTime, 100); // Should complete quickly
    });

    it('should produce visually pleasing layout for grid graphs', () => {
      const graph = gridGraph(3, 3);
      const positions = circularLayout(graph);
      
      // All 9 nodes should be on a circle
      assert.equal(Object.keys(positions).length, 9);
      
      const distances = graph.nodes().map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      
      // All should be at same distance
      const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
      distances.forEach(d => {
        assert.isBelow(Math.abs(d - avgDistance), 0.001);
      });
    });

    it('should handle negative scale gracefully', () => {
      const graph = completeGraph(4);
      const positions = circularLayout(graph, -1);
      
      // Should still produce valid layout with absolute value of scale
      graph.nodes().forEach(node => {
        const [x, y] = positions[node];
        const radius = Math.sqrt(x * x + y * y);
        assert.approximately(radius, 1, 1e-10);
      });
    });
  });

  describe('Comparison with other layouts', () => {
    it('should produce perfect circle unlike force-directed layouts', () => {
      const graph = cycleGraph(8);
      const positions = circularLayout(graph);
      
      // Calculate variance in radii
      const radii = graph.nodes().map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      
      const avgRadius = radii.reduce((a, b) => a + b) / radii.length;
      const variance = radii.reduce((sum, r) => sum + Math.pow(r - avgRadius, 2), 0) / radii.length;
      
      // Variance should be essentially zero for perfect circle
      assert.isBelow(variance, 1e-20);
    });

    it('should maintain node order in layout', () => {
      const nodes = [0, 1, 2, 3, 4, 5];
      const graph = {
        nodes: () => nodes,
        edges: () => [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
      };
      
      const positions = circularLayout(graph);
      
      // Calculate angles and check they increase monotonically
      const angles = nodes.map(node => {
        const [x, y] = positions[node];
        let angle = Math.atan2(y, x);
        if (angle < 0) angle += 2 * Math.PI;
        return angle;
      });
      
      // First node should be at angle 0 (positioned at (1, 0))
      assert.approximately(positions[0][0], 1, 1e-10);
      assert.approximately(positions[0][1], 0, 1e-10);
      
      // Angles should increase in order
      for (let i = 1; i < angles.length; i++) {
        assert.isAbove(angles[i], angles[i - 1]);
      }
    });
  });

  describe('3D spherical layout', () => {
    it('should create spherical layout for dim=3', () => {
      const graph = completeGraph(8);
      const positions = circularLayout(graph, 1, [0, 0, 0], 3);
      
      assert.equal(Object.keys(positions).length, 8);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 3);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
        assert.isNumber(positions[node][2]);
      });
    });

    it('should place all nodes on unit sphere', () => {
      const graph = cycleGraph(12);
      const positions = circularLayout(graph, 1, [0, 0, 0], 3);
      
      graph.nodes().forEach(node => {
        const [x, y, z] = positions[node];
        const radius = Math.sqrt(x * x + y * y + z * z);
        assert.approximately(radius, 1, 1e-10, `Node ${node} should be on unit sphere`);
      });
    });

    it('should respect scale in 3D', () => {
      const graph = starGraph(6);
      const scale = 2.5;
      const positions = circularLayout(graph, scale, [0, 0, 0], 3);
      
      graph.nodes().forEach(node => {
        const [x, y, z] = positions[node];
        const radius = Math.sqrt(x * x + y * y + z * z);
        assert.approximately(radius, scale, 1e-10);
      });
    });

    it('should respect center in 3D', () => {
      const graph = completeGraph(4);
      const center = [10, -5, 7];
      const positions = circularLayout(graph, 1, center, 3);
      
      graph.nodes().forEach(node => {
        const [x, y, z] = positions[node];
        const dx = x - center[0];
        const dy = y - center[1];
        const dz = z - center[2];
        const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        assert.approximately(radius, 1, 1e-10);
      });
    });

    it('should distribute nodes evenly on sphere using Fibonacci spiral', () => {
      const graph = completeGraph(20);
      const positions = circularLayout(graph, 1, [0, 0, 0], 3);
      
      // Check that no two nodes are too close together
      const nodes = graph.nodes();
      const minDistance = 0.3; // Reasonable minimum distance for 20 nodes on unit sphere
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pos1 = positions[nodes[i]];
          const pos2 = positions[nodes[j]];
          const dx = pos1[0] - pos2[0];
          const dy = pos1[1] - pos2[1];
          const dz = pos1[2] - pos2[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          assert.isAbove(distance, minDistance, `Nodes ${i} and ${j} are too close`);
        }
      }
    });

    it('should handle single node in 3D', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const center = [1, 2, 3];
      const positions = circularLayout(singleNode, 1, center, 3);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.deepEqual(positions['A'], center);
    });

    it('should produce deterministic results in 3D', () => {
      const graph = cycleGraph(10);
      
      const positions1 = circularLayout(graph, 1, [0, 0, 0], 3);
      const positions2 = circularLayout(graph, 1, [0, 0, 0], 3);
      
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });

    it('should handle higher dimensions gracefully', () => {
      const graph = completeGraph(5);
      const positions = circularLayout(graph, 1, [0, 0, 0, 0], 4);
      
      assert.equal(Object.keys(positions).length, 5);
      graph.nodes().forEach(node => {
        assert.equal(positions[node].length, 4);
        // Should be on unit hypersphere
        const radius = Math.sqrt(positions[node].reduce((sum, coord) => sum + coord * coord, 0));
        assert.approximately(radius, 1, 0.1); // Allow some tolerance for random hypersphere
      });
    });

    it('should use all three dimensions meaningfully', () => {
      const graph = completeGraph(30);
      const positions = circularLayout(graph, 1, [0, 0, 0], 3);
      
      // Extract all z-coordinates
      const zCoords = graph.nodes().map(node => positions[node][2]);
      
      // Check that z-coordinates have meaningful variation
      const minZ = Math.min(...zCoords);
      const maxZ = Math.max(...zCoords);
      const zRange = maxZ - minZ;
      
      assert.isAbove(zRange, 1.5, 'Z-coordinates should have significant variation');
      assert.approximately(maxZ, 1, 0.1, 'Max Z should be near 1');
      assert.approximately(minZ, -1, 0.1, 'Min Z should be near -1');
    });

    it('should produce valid 3D layout for string node IDs', () => {
      const graph = {
        nodes: () => ['alice', 'bob', 'charlie', 'david', 'eve'],
        edges: () => [['alice', 'bob'], ['bob', 'charlie'], ['charlie', 'david'], 
                      ['david', 'eve'], ['eve', 'alice']]
      };
      
      const positions = circularLayout(graph, 1, [0, 0, 0], 3);
      
      assert.equal(Object.keys(positions).length, 5);
      graph.nodes().forEach(node => {
        const [x, y, z] = positions[node];
        const radius = Math.sqrt(x * x + y * y + z * z);
        assert.approximately(radius, 1, 1e-10);
      });
    });
  });
});