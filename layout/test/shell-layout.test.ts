import { describe, it, assert } from 'vitest';
import { 
  shellLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  wheelGraph,
  gridGraph,
  randomGraph
} from '../src';

describe('Shell Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(8);
      const positions = shellLayout(graph);
      
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
      const positions = shellLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['node1'], edges: () => [] };
      const positions = shellLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.deepEqual(positions['node1'], [0, 0]);
    });

    it('should default to single shell when no shells specified', () => {
      const graph = cycleGraph(6);
      const positions = shellLayout(graph);
      
      // All nodes should be on a circle (single shell)
      const distances = graph.nodes().map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      
      const firstDist = distances[0];
      distances.forEach(d => {
        assert.approximately(d, firstDist, 1e-10);
      });
    });
  });

  describe('Multi-shell arrangements', () => {
    it('should arrange nodes in specified shells', () => {
      const graph = completeGraph(9);
      const shells = [
        [0],           // Center node
        [1, 2, 3],     // Inner shell
        [4, 5, 6, 7, 8] // Outer shell
      ];
      
      const positions = shellLayout(graph, shells);
      
      // Center node at origin
      assert.deepEqual(positions[0], [0, 0]);
      
      // Inner shell at same radius
      const innerRadii = [1, 2, 3].map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      const innerRadius = innerRadii[0];
      innerRadii.forEach(r => {
        assert.approximately(r, innerRadius, 1e-10);
      });
      
      // Outer shell at larger radius
      const outerRadii = [4, 5, 6, 7, 8].map(node => {
        const [x, y] = positions[node];
        return Math.sqrt(x * x + y * y);
      });
      const outerRadius = outerRadii[0];
      outerRadii.forEach(r => {
        assert.approximately(r, outerRadius, 1e-10);
      });
      
      // Outer radius should be larger than inner
      assert.isAbove(outerRadius, innerRadius);
    });

    it('should space shells evenly', () => {
      const graph = starGraph(13); // 1 center + 12 leaves
      const shells = [
        [0],        // Center
        [1, 2, 3, 4], // Shell 1
        [5, 6, 7, 8], // Shell 2
        [9, 10, 11, 12] // Shell 3
      ];
      
      const positions = shellLayout(graph, shells);
      
      // Calculate radii for each shell
      const radii = shells.map((shell, idx) => {
        if (idx === 0) return 0; // Center
        const [x, y] = positions[shell[0]];
        return Math.sqrt(x * x + y * y);
      });
      
      // Check spacing between consecutive shells
      const spacing1 = radii[2] - radii[1];
      const spacing2 = radii[3] - radii[2];
      
      assert.approximately(spacing1, spacing2, 1e-5);
    });

    it('should arrange nodes evenly within each shell', () => {
      const graph = wheelGraph(9); // 1 center + 8 rim
      const shells = [
        [0],
        [1, 2, 3, 4, 5, 6, 7, 8]
      ];
      
      const positions = shellLayout(graph, shells);
      
      // Calculate angles for outer shell nodes
      const angles = shells[1].map(node => {
        const [x, y] = positions[node];
        return Math.atan2(y, x);
      }).sort((a, b) => a - b);
      
      // Check angle differences
      const expectedAngle = 2 * Math.PI / 8;
      for (let i = 0; i < angles.length; i++) {
        const diff = i < angles.length - 1 
          ? angles[i + 1] - angles[i]
          : angles[0] + 2 * Math.PI - angles[i];
        assert.approximately(diff, expectedAngle, 1e-5);
      }
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = completeGraph(7);
      const shells = [[0, 1, 2], [3, 4, 5, 6]];
      
      const positions1 = shellLayout(graph, shells, 1);
      const positions2 = shellLayout(graph, shells, 2);
      
      // All distances should be scaled
      shells[1].forEach(node => {
        const r1 = Math.sqrt(positions1[node][0] ** 2 + positions1[node][1] ** 2);
        const r2 = Math.sqrt(positions2[node][0] ** 2 + positions2[node][1] ** 2);
        assert.approximately(r2 / r1, 2, 1e-5);
      });
    });

    it('should respect center parameter', () => {
      const graph = cycleGraph(5);
      const shells = [[0, 1, 2, 3, 4]];
      const center = [5, -3];
      
      const positions = shellLayout(graph, shells, 1, center);
      
      // Calculate center of mass
      const com = graph.nodes().reduce((acc, node) => {
        return [acc[0] + positions[node][0], acc[1] + positions[node][1]];
      }, [0, 0]).map(v => v / 5);
      
      assert.approximately(com[0], center[0], 1e-10);
      assert.approximately(com[1], center[1], 1e-10);
    });

    it('should only support 2D layouts', () => {
      const graph = completeGraph(6);
      const shells = [[0, 1], [2, 3, 4, 5]];
      
      // 2D layout works
      const positions2D = shellLayout(graph, shells, 1, [0, 0], 2);
      assert.equal(Object.keys(positions2D).length, 6);
      
      // 3D layout should throw error
      assert.throws(() => {
        shellLayout(graph, shells, 1, [0, 0, 0], 3);
      }, 'can only handle 2 dimensions');
    });

    it('should handle empty shells gracefully', () => {
      const graph = cycleGraph(5);
      const shells = [
        [0, 1],
        [],  // Empty shell
        [2, 3, 4]
      ];
      
      const positions = shellLayout(graph, shells);
      
      // Should still position all nodes
      assert.equal(Object.keys(positions).length, 5);
      
      // First and last shell should have different radii
      const r1 = Math.sqrt(positions[0][0] ** 2 + positions[0][1] ** 2);
      const r3 = Math.sqrt(positions[2][0] ** 2 + positions[2][1] ** 2);
      assert.isAbove(r3, r1);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['center', 'a', 'b', 'c', 'd'],
        edges: () => [['center', 'a'], ['center', 'b'], ['center', 'c'], ['center', 'd']]
      };
      const shells = [['center'], ['a', 'b', 'c', 'd']];
      
      const positions = shellLayout(graph, shells);
      
      assert.deepEqual(positions['center'], [0, 0]);
      ['a', 'b', 'c', 'd'].forEach(node => {
        const [x, y] = positions[node];
        const r = Math.sqrt(x * x + y * y);
        assert.isAbove(r, 0);
        assert.approximately(r, 0.5, 1e-10); // Second shell at radius 0.5 (scale=1, 2 shells)
      });
    });

    it('should handle nodes not in any shell', () => {
      const graph = completeGraph(6);
      const shells = [[0, 1], [2, 3]]; // Nodes 4, 5 not included
      
      const positions = shellLayout(graph, shells);
      
      // Only nodes in shells should be positioned
      assert.equal(Object.keys(positions).length, 4);
      
      // Nodes not in shells won't be positioned
      assert.isUndefined(positions[4]);
      assert.isUndefined(positions[5]);
    });

    it('should handle duplicate nodes in shells', () => {
      const graph = cycleGraph(4);
      const shells = [[0, 1], [1, 2, 3]]; // Node 1 in two shells
      
      const positions = shellLayout(graph, shells);
      
      // Should handle gracefully
      assert.equal(Object.keys(positions).length, 4);
      
      // Check node positions
      const r0 = Math.sqrt(positions[0][0] ** 2 + positions[0][1] ** 2);
      const r1 = Math.sqrt(positions[1][0] ** 2 + positions[1][1] ** 2);
      const r2 = Math.sqrt(positions[2][0] ** 2 + positions[2][1] ** 2);
      const r3 = Math.sqrt(positions[3][0] ** 2 + positions[3][1] ** 2);
      
      // Node 0 in first shell at radius 0.5
      assert.approximately(r0, 0.5, 1e-10);
      
      // Nodes 1, 2, 3 in second shell at radius 1.0
      // (Node 1 appears in second shell, not first)
      assert.approximately(r1, 1.0, 1e-10);
      assert.approximately(r2, 1.0, 1e-10);
      assert.approximately(r3, 1.0, 1e-10);
    });

    it('should produce consistent results', () => {
      const graph = randomGraph(10, 0.3, 42);
      const shells = [
        graph.nodes().slice(0, 3),
        graph.nodes().slice(3, 7),
        graph.nodes().slice(7)
      ];
      
      const positions1 = shellLayout(graph, shells);
      const positions2 = shellLayout(graph, shells);
      
      // Shell layout is deterministic
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });

    it('should handle very large shells efficiently', () => {
      const graph = gridGraph(10, 10); // 100 nodes
      const shells = [
        graph.nodes().slice(0, 1),    // 1 node
        graph.nodes().slice(1, 10),   // 9 nodes
        graph.nodes().slice(10, 30),  // 20 nodes
        graph.nodes().slice(30)       // 70 nodes
      ];
      
      const startTime = performance.now();
      const positions = shellLayout(graph, shells);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 100);
      assert.isBelow(endTime - startTime, 100);
    });
  });

  describe('Layout patterns', () => {
    it('should create concentric circles for appropriate graphs', () => {
      // Create a graph with natural shell structure
      const nodes = Array.from({ length: 13 }, (_, i) => i);
      const edges: [number, number][] = [];
      
      // Connect center to inner ring
      for (let i = 1; i <= 4; i++) {
        edges.push([0, i]);
      }
      
      // Connect inner ring to outer ring
      for (let i = 1; i <= 4; i++) {
        edges.push([i, i + 4]);
        edges.push([i, i + 8]);
      }
      
      const graph = { nodes: () => nodes, edges: () => edges };
      const shells = [
        [0],
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12]
      ];
      
      const positions = shellLayout(graph, shells);
      
      // Verify concentric structure
      const radii = shells.map(shell => {
        if (shell.length === 0) return 0;
        const [x, y] = positions[shell[0]];
        return Math.sqrt(x * x + y * y);
      });
      
      assert.equal(radii[0], 0); // Center
      assert.isAbove(radii[1], 0);
      assert.isAbove(radii[2], radii[1]);
      assert.isAbove(radii[3], radii[2]);
    });
  });
});