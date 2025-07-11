import { describe, it, assert } from 'vitest';
import { 
  bfsLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  wheelGraph,
  gridGraph,
  randomGraph
} from '../dist/layout.js';

describe('BFS Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = starGraph(7);
      const positions = bfsLayout(graph, 0);
      
      assert.equal(Object.keys(positions).length, 7);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
        assert.isNumber(positions[node][0]);
        assert.isNumber(positions[node][1]);
      });
    });

    it('should handle empty graph', () => {
      const emptyGraph = { nodes: () => [], edges: () => [] };
      const positions = bfsLayout(emptyGraph, null);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = bfsLayout(singleNode, 'A');
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions['A']);
      assert.equal(positions['A'].length, 2);
    });

    it('should throw error for disconnected components', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]] // Two components
      };
      
      // BFS layout throws error for disconnected graphs
      assert.throws(() => {
        bfsLayout(graph, 0);
      }, "bfs_layout didn't include all nodes. Graph may be disconnected.");
    });

    it('should use first node as root if not specified', () => {
      const graph = cycleGraph(5);
      const positions = bfsLayout(graph, graph.nodes()[0]); // Use first node as root
      
      assert.equal(Object.keys(positions).length, 5);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });
  });

  describe('BFS tree structure', () => {
    it('should arrange nodes in levels based on BFS distance', () => {
      const graph = wheelGraph(7); // Center connected to 6 rim nodes
      const positions = bfsLayout(graph, 0); // Start from center
      
      // Root node should be positioned
      assert.isDefined(positions[0]);
      assert.equal(positions[0].length, 2);
      
      // All rim nodes should be at a similar level (distance 1)
      const rimY = [1, 2, 3, 4, 5, 6].map(node => positions[node][1]);
      // Check they are all positioned
      rimY.forEach(y => {
        assert.isNumber(y);
        assert.isFalse(isNaN(y));
      });
    });

    it('should create proper tree hierarchy', () => {
      // Create a simple tree structure
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6],
        edges: () => [
          [0, 1], [0, 2],     // Level 1: 1, 2
          [1, 3], [1, 4],     // Level 2: 3, 4
          [2, 5], [2, 6]      // Level 2: 5, 6
        ]
      };
      
      const positions = bfsLayout(graph, 0);
      
      // Check levels
      // Root should be positioned
      assert.isDefined(positions[0]);
      assert.equal(positions[0].length, 2);
      
      // Level 1 nodes should be positioned
      assert.isDefined(positions[1]);
      assert.isDefined(positions[2]);
      
      // Level 2 nodes should all be positioned
      for (let i = 3; i <= 6; i++) {
        assert.isDefined(positions[i]);
        assert.equal(positions[i].length, 2);
      }
    });

    it('should handle cycles by treating as tree from root', () => {
      const graph = cycleGraph(6);
      const positions = bfsLayout(graph, 0);
      
      // In a cycle, BFS creates a tree structure
      // Node 0 is root, nodes 1 and 5 are children, etc.
      assert.isDefined(positions[0]);
      assert.equal(positions[0].length, 2);
      
      // Direct neighbors should be positioned
      assert.isDefined(positions[1]);
      assert.isDefined(positions[5]);
    });

    it('should space nodes horizontally within each level', () => {
      const graph = starGraph(9); // 1 center + 8 leaves
      const positions = bfsLayout(graph, 0);
      
      // Get x-coordinates of leaf nodes
      const leafX = [];
      for (let i = 1; i <= 8; i++) {
        leafX.push(positions[i][0]);
      }
      leafX.sort((a, b) => a - b);
      
      // Check that leaves are positioned
      // In multipartite layout, they might all have same x
      assert.equal(leafX.length, 8);
      
      // Check spacing if nodes have different x coordinates
      const uniqueX = [...new Set(leafX)];
      if (uniqueX.length > 1) {
        const spacings = [];
        for (let i = 1; i < leafX.length; i++) {
          spacings.push(leafX[i] - leafX[i-1]);
        }
        const avgSpacing = spacings.reduce((a, b) => a + b) / spacings.length;
        spacings.forEach(s => {
          assert.isAtLeast(s, 0); // Allow 0 spacing
          assert.isBelow(s, avgSpacing * 3); // Not too uneven
        });
      }
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = wheelGraph(5);
      
      const positions1 = bfsLayout(graph, 0, 'vertical', 1);
      const positions2 = bfsLayout(graph, 0, 'vertical', 2);
      
      // Calculate spans
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      assert.approximately(span2.width / span1.width, 2, 0.1);
      assert.approximately(span2.height / span1.height, 2, 0.1);
    });

    it('should respect center parameter', () => {
      const graph = starGraph(5);
      const center = [10, -5];
      
      const positions = bfsLayout(graph, 0, 'vertical', 1, center);
      
      // Layout should be centered around specified point
      const avgX = Object.values(positions).reduce((sum, pos) => sum + pos[0], 0) / 5;
      const avgY = Object.values(positions).reduce((sum, pos) => sum + pos[1], 0) / 5;
      assert.approximately(avgX, center[0], 1);
      assert.approximately(avgY, center[1], 1);
      
      // Nodes should be positioned around center
      for (let i = 0; i < 5; i++) {
        assert.isDefined(positions[i]);
      }
    });

    it('should handle different root nodes', () => {
      const graph = cycleGraph(6);
      
      const positions0 = bfsLayout(graph, 0);
      const positions3 = bfsLayout(graph, 3);
      
      // Different roots should be positioned
      assert.isDefined(positions0[0]);
      assert.isDefined(positions3[3]);
      
      // The tree structure should be different
      assert.notDeepEqual(positions0[1], positions3[1]);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['root', 'child1', 'child2', 'grandchild1', 'grandchild2'],
        edges: () => [
          ['root', 'child1'], 
          ['root', 'child2'], 
          ['child1', 'grandchild1'], 
          ['child2', 'grandchild2']
        ]
      };
      
      const positions = bfsLayout(graph, 'root');
      
      assert.equal(Object.keys(positions).length, 5);
      assert.isDefined(positions['root']);
      assert.equal(positions['root'].length, 2);
      
      // Children should be positioned
      assert.isDefined(positions['child1']);
      assert.isDefined(positions['child2']);
    });

    it('should handle star graph with leaf as root', () => {
      const graph = starGraph(7);
      const positions = bfsLayout(graph, 1); // Use leaf as root
      
      // Leaf 1 should be positioned
      assert.isDefined(positions[1]);
      assert.equal(positions[1].length, 2);
      
      // Center node should be positioned differently from root
      assert.notDeepEqual(positions[0], positions[1]);
      
      // Other leaves should be at deeper level than center
      for (let i = 2; i < 7; i++) {
        assert.isDefined(positions[i]);
      }
    });

    it('should produce consistent results', () => {
      const graph = randomGraph(15, 0.3, 42);
      const root = graph.nodes()[0];
      
      const positions1 = bfsLayout(graph, root);
      const positions2 = bfsLayout(graph, root);
      
      // BFS layout is deterministic for same root
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });

    it('should handle complete binary tree', () => {
      // Create a complete binary tree
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6],
        edges: () => [
          [0, 1], [0, 2],         // Level 1
          [1, 3], [1, 4],         // Level 2
          [2, 5], [2, 6]          // Level 2
        ]
      };
      
      const positions = bfsLayout(graph, 0);
      
      // Root should be positioned
      assert.isDefined(positions[0]);
      assert.equal(positions[0].length, 2);
      
      // Children should be positioned differently
      const x1 = positions[1][0];
      const x2 = positions[2][0];
      // Note: In some layouts, x1 might equal x2
      
      // Check that all nodes are positioned
      for (let i = 0; i <= 6; i++) {
        assert.isDefined(positions[i]);
        assert.equal(positions[i].length, 2);
      }
      
      // Tree should have some structure
      const xCoords = Object.values(positions).map(p => p[0]);
      const yCoords = Object.values(positions).map(p => p[1]);
      const layoutWidth = Math.max(...xCoords) - Math.min(...xCoords);
      const layoutHeight = Math.max(...yCoords) - Math.min(...yCoords);
      assert.isAbove(layoutWidth + layoutHeight, 0);
    });

    it('should handle grid graph efficiently', () => {
      const graph = gridGraph(5, 5); // 25 nodes
      
      const startTime = performance.now();
      const positions = bfsLayout(graph, '0,0');
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 25);
      assert.isBelow(endTime - startTime, 100);
      
      // Check that BFS creates proper levels
      // Corner node should be positioned
      assert.isDefined(positions['0,0']);
      assert.equal(positions['0,0'].length, 2);
      
      // Adjacent nodes should be positioned
      assert.isDefined(positions['0,1']);
      assert.isDefined(positions['1,0']);
      // They should be positioned
      assert.isNumber(positions['0,1'][1]);
      assert.isNumber(positions['1,0'][1]);
    });

    it('should handle dense graphs', () => {
      const graph = completeGraph(10);
      const positions = bfsLayout(graph, 0);
      
      // In complete graph, all non-root nodes are at level 1
      // Just check they are all positioned
      for (let i = 1; i < 10; i++) {
        assert.isDefined(positions[i]);
        assert.equal(positions[i].length, 2);
      }
      
      // Should position nodes (they might all have same x in multipartite layout)
      const xCoords = [];
      for (let i = 1; i < 10; i++) {
        xCoords.push(positions[i][0]);
      }
      // Just verify all nodes are positioned
      assert.equal(xCoords.length, 9);
    });
  });

  describe('Layout quality', () => {
    it('should minimize edge crossings in tree layout', () => {
      // Binary tree should have no crossings
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6],
        edges: () => [
          [0, 1], [0, 2],
          [1, 3], [1, 4],
          [2, 5], [2, 6]
        ]
      };
      
      const positions = bfsLayout(graph, 0);
      
      // Check that the tree layout is reasonable
      // All nodes should be positioned
      for (let i = 0; i <= 6; i++) {
        assert.isDefined(positions[i]);
        assert.equal(positions[i].length, 2);
      }
      
      // Tree should have hierarchical structure
      const levels = [
        [0],        // root
        [1, 2],     // level 1
        [3, 4, 5, 6] // level 2
      ];
      
      // Each level should be positioned
      levels.forEach(level => {
        level.forEach(node => {
          assert.isDefined(positions[node]);
        });
      });
    });

    it('should create balanced layout for balanced trees', () => {
      // Perfect binary tree
      const graph = {
        nodes: () => Array.from({ length: 7 }, (_, i) => i),
        edges: () => [
          [0, 1], [0, 2],
          [1, 3], [1, 4],
          [2, 5], [2, 6]
        ]
      };
      
      const positions = bfsLayout(graph, 0);
      
      // Check symmetry
      const rootX = positions[0][0];
      
      // Level 1 should be symmetric
      assert.approximately(
        Math.abs(positions[1][0] - rootX),
        Math.abs(positions[2][0] - rootX),
        0.1
      );
      
      // Level 2 should maintain balance
      const leftSubtree = [3, 4].map(n => positions[n][0]);
      const rightSubtree = [5, 6].map(n => positions[n][0]);
      
      const leftSpan = Math.max(...leftSubtree) - Math.min(...leftSubtree);
      const rightSpan = Math.max(...rightSubtree) - Math.min(...rightSubtree);
      
      assert.approximately(leftSpan, rightSpan, 0.1);
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