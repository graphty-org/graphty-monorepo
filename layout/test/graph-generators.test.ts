import { describe, it, assert } from 'vitest';
import { 
  completeGraph,
  cycleGraph,
  starGraph,
  wheelGraph,
  gridGraph,
  randomGraph,
  bipartiteGraph,
  scaleFreeGraph,
  circularLayout
} from '../src';

describe('Graph Generators', () => {
  describe('completeGraph', () => {
    it('should create complete graph with correct number of nodes and edges', () => {
      const graph = completeGraph(5);
      
      assert.equal(graph.nodes().length, 5);
      // Complete graph has n*(n-1)/2 edges
      assert.equal(graph.edges().length, 10);
      
      // Check nodes are numbered 0 to n-1
      assert.deepEqual(graph.nodes(), [0, 1, 2, 3, 4]);
    });

    it('should connect every pair of nodes', () => {
      const graph = completeGraph(4);
      const edges = graph.edges();
      
      // Should have edges: [0,1], [0,2], [0,3], [1,2], [1,3], [2,3]
      assert.equal(edges.length, 6);
      
      // Check all pairs are connected
      const edgeSet = new Set(edges.map(e => `${Math.min(e[0], e[1])},${Math.max(e[0], e[1])}`));
      assert.isTrue(edgeSet.has('0,1'));
      assert.isTrue(edgeSet.has('0,2'));
      assert.isTrue(edgeSet.has('0,3'));
      assert.isTrue(edgeSet.has('1,2'));
      assert.isTrue(edgeSet.has('1,3'));
      assert.isTrue(edgeSet.has('2,3'));
    });

    it('should handle edge cases', () => {
      // Single node
      const g1 = completeGraph(1);
      assert.equal(g1.nodes().length, 1);
      assert.equal(g1.edges().length, 0);
      
      // Two nodes
      const g2 = completeGraph(2);
      assert.equal(g2.nodes().length, 2);
      assert.equal(g2.edges().length, 1);
      
      // Large graph
      const g10 = completeGraph(10);
      assert.equal(g10.nodes().length, 10);
      assert.equal(g10.edges().length, 45);
    });
  });

  describe('cycleGraph', () => {
    it('should create cycle with correct number of nodes and edges', () => {
      const graph = cycleGraph(6);
      
      assert.equal(graph.nodes().length, 6);
      assert.equal(graph.edges().length, 6); // Cycle has n edges
      
      assert.deepEqual(graph.nodes(), [0, 1, 2, 3, 4, 5]);
    });

    it('should connect nodes in a cycle', () => {
      const graph = cycleGraph(5);
      const edges = graph.edges();
      
      // Check cycle connectivity
      const edgeSet = new Set(edges.map(e => `${Math.min(e[0], e[1])},${Math.max(e[0], e[1])}`));
      assert.isTrue(edgeSet.has('0,1'));
      assert.isTrue(edgeSet.has('1,2'));
      assert.isTrue(edgeSet.has('2,3'));
      assert.isTrue(edgeSet.has('3,4'));
      assert.isTrue(edgeSet.has('0,4')); // Closing the cycle
    });

    it('should handle small cycles', () => {
      // Triangle
      const g3 = cycleGraph(3);
      assert.equal(g3.nodes().length, 3);
      assert.equal(g3.edges().length, 3);
      
      // Square
      const g4 = cycleGraph(4);
      assert.equal(g4.nodes().length, 4);
      assert.equal(g4.edges().length, 4);
    });
  });

  describe('starGraph', () => {
    it('should create star with correct structure', () => {
      const graph = starGraph(5);
      
      assert.equal(graph.nodes().length, 5);
      assert.equal(graph.edges().length, 4); // Star has n-1 edges
      
      // Center is node 0
      const edges = graph.edges();
      edges.forEach(edge => {
        assert.isTrue(edge[0] === 0 || edge[1] === 0);
      });
    });

    it('should connect all nodes to center', () => {
      const graph = starGraph(6);
      const edges = graph.edges();
      
      // Check all leaves connected to center
      const connectedToCenter = new Set();
      edges.forEach(edge => {
        if (edge[0] === 0) connectedToCenter.add(edge[1]);
        if (edge[1] === 0) connectedToCenter.add(edge[0]);
      });
      
      assert.equal(connectedToCenter.size, 5);
      assert.deepEqual([...connectedToCenter].sort(), [1, 2, 3, 4, 5]);
    });

    it('should handle edge cases', () => {
      // Single node
      const g1 = starGraph(1);
      assert.equal(g1.nodes().length, 1);
      assert.equal(g1.edges().length, 0);
      
      // Two nodes
      const g2 = starGraph(2);
      assert.equal(g2.nodes().length, 2);
      assert.equal(g2.edges().length, 1);
    });
  });

  describe('wheelGraph', () => {
    it('should create wheel with correct structure', () => {
      const graph = wheelGraph(6);
      
      assert.equal(graph.nodes().length, 6);
      // Wheel has 2*(n-1) edges: n-1 spokes + n-1 rim edges
      assert.equal(graph.edges().length, 10);
    });

    it('should have hub connected to all rim nodes', () => {
      const graph = wheelGraph(5);
      const edges = graph.edges();
      
      // Node 0 is the hub
      const hubEdges = edges.filter(e => e[0] === 0 || e[1] === 0);
      assert.equal(hubEdges.length, 4); // Connected to all 4 rim nodes
      
      // Check rim forms a cycle
      const rimEdges = edges.filter(e => e[0] !== 0 && e[1] !== 0);
      assert.equal(rimEdges.length, 4); // 4 edges in the rim cycle
    });

    it('should handle small wheels', () => {
      // Smallest wheel (triangle with center)
      const g4 = wheelGraph(4);
      assert.equal(g4.nodes().length, 4);
      assert.equal(g4.edges().length, 6);
    });
  });

  describe('gridGraph', () => {
    it('should create grid with correct dimensions', () => {
      const graph = gridGraph(3, 4);
      
      assert.equal(graph.nodes().length, 12); // 3*4 nodes
      // Grid edges: (m-1)*n + m*(n-1)
      assert.equal(graph.edges().length, 17);
    });

    it('should use coordinate naming for nodes', () => {
      const graph = gridGraph(2, 3);
      const nodes = graph.nodes();
      
      assert.deepEqual(nodes.sort(), ['0,0', '0,1', '0,2', '1,0', '1,1', '1,2']);
    });

    it('should connect grid neighbors correctly', () => {
      const graph = gridGraph(3, 3);
      const edges = graph.edges();
      
      // Check some specific connections
      const edgeStrings = edges.map(e => `${e[0]}-${e[1]}`);
      
      // Horizontal connections
      assert.isTrue(edgeStrings.includes('0,0-0,1') || edgeStrings.includes('0,1-0,0'));
      assert.isTrue(edgeStrings.includes('0,1-0,2') || edgeStrings.includes('0,2-0,1'));
      
      // Vertical connections
      assert.isTrue(edgeStrings.includes('0,0-1,0') || edgeStrings.includes('1,0-0,0'));
      assert.isTrue(edgeStrings.includes('1,0-2,0') || edgeStrings.includes('2,0-1,0'));
    });

    it('should handle edge cases', () => {
      // 1x1 grid
      const g1 = gridGraph(1, 1);
      assert.equal(g1.nodes().length, 1);
      assert.equal(g1.edges().length, 0);
      
      // Line graphs
      const line = gridGraph(1, 5);
      assert.equal(line.nodes().length, 5);
      assert.equal(line.edges().length, 4);
      
      const vline = gridGraph(5, 1);
      assert.equal(vline.nodes().length, 5);
      assert.equal(vline.edges().length, 4);
    });
  });

  describe('randomGraph', () => {
    it('should create graph with specified number of nodes', () => {
      const graph = randomGraph(10, 0.3, 123);
      
      assert.equal(graph.nodes().length, 10);
      assert.deepEqual(graph.nodes(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should respect edge probability', () => {
      // With p=0, no edges
      const g0 = randomGraph(10, 0, 123);
      assert.equal(g0.edges().length, 0);
      
      // With p=1, complete graph
      const g1 = randomGraph(10, 1, 123);
      assert.equal(g1.edges().length, 45); // 10*9/2
      
      // With p=0.5, roughly half of possible edges
      const g05 = randomGraph(20, 0.5, 123);
      const edgeCount = g05.edges().length;
      const maxEdges = 20 * 19 / 2;
      assert.isAbove(edgeCount, maxEdges * 0.3);
      assert.isBelow(edgeCount, maxEdges * 0.7);
    });

    it('should produce consistent results with same seed', () => {
      const g1 = randomGraph(15, 0.3, 42);
      const g2 = randomGraph(15, 0.3, 42);
      
      assert.equal(g1.edges().length, g2.edges().length);
      
      const edges1 = g1.edges().map(e => `${e[0]},${e[1]}`).sort();
      const edges2 = g2.edges().map(e => `${e[0]},${e[1]}`).sort();
      assert.deepEqual(edges1, edges2);
    });

    it('should produce different results with different seeds', () => {
      const g1 = randomGraph(15, 0.5, 123);
      const g2 = randomGraph(15, 0.5, 456);
      
      // Very unlikely to have same edge count
      assert.notEqual(g1.edges().length, g2.edges().length);
    });
  });

  describe('bipartiteGraph', () => {
    it('should create bipartite graph with two sets', () => {
      const graph = bipartiteGraph(3, 4, 0.5, 123);
      
      assert.equal(graph.nodes().length, 7); // 3 + 4
      assert.deepEqual(graph.setA, ['A0', 'A1', 'A2']);
      assert.deepEqual(graph.setB, ['B0', 'B1', 'B2', 'B3']);
    });

    it('should only connect nodes between sets', () => {
      const graph = bipartiteGraph(3, 3, 1.0, 123); // Complete bipartite
      const edges = graph.edges();
      
      assert.equal(edges.length, 9); // 3*3
      
      // Check all edges go between sets
      edges.forEach(edge => {
        const hasA = edge.some(node => (node as string).startsWith('A'));
        const hasB = edge.some(node => (node as string).startsWith('B'));
        assert.isTrue(hasA && hasB);
      });
    });

    it('should respect edge probability', () => {
      // No edges
      const g0 = bipartiteGraph(5, 5, 0, 123);
      assert.equal(g0.edges().length, 0);
      
      // All possible edges
      const g1 = bipartiteGraph(4, 6, 1, 123);
      assert.equal(g1.edges().length, 24); // 4*6
      
      // Partial edges
      const g05 = bipartiteGraph(10, 10, 0.5, 123);
      const edgeCount = g05.edges().length;
      assert.isAbove(edgeCount, 30); // Should have some edges
      assert.isBelow(edgeCount, 70); // But not all 100
    });

    it('should produce consistent results with seed', () => {
      const g1 = bipartiteGraph(5, 7, 0.4, 42);
      const g2 = bipartiteGraph(5, 7, 0.4, 42);
      
      const edges1 = g1.edges().map(e => `${e[0]}-${e[1]}`).sort();
      const edges2 = g2.edges().map(e => `${e[0]}-${e[1]}`).sort();
      
      assert.deepEqual(edges1, edges2);
    });
  });

  describe('scaleFreeGraph', () => {
    it('should create scale-free graph with preferential attachment', () => {
      const graph = scaleFreeGraph(20, 2, 123);
      
      assert.equal(graph.nodes().length, 20);
      // Each new node adds m edges
      assert.isAtLeast(graph.edges().length, 35); // Initial complete graph + added edges
    });

    it('should start with complete graph of m+1 nodes', () => {
      const graph = scaleFreeGraph(10, 3, 123);
      const edges = graph.edges();
      
      // First 4 nodes (0,1,2,3) should form complete graph
      const initialEdges = edges.filter(e => 
        e[0] <= 3 && e[1] <= 3
      );
      
      assert.equal(initialEdges.length, 6); // 4*3/2
    });

    it('should throw error if m >= n', () => {
      assert.throws(() => {
        scaleFreeGraph(5, 5);
      }, 'm must be less than n');
      
      assert.throws(() => {
        scaleFreeGraph(5, 6);
      }, 'm must be less than n');
    });

    it('should create graphs with power-law degree distribution', () => {
      const graph = scaleFreeGraph(100, 2, 123);
      
      // Calculate degree distribution
      const degrees = new Map();
      graph.nodes().forEach(node => {
        degrees.set(node, 0);
      });
      
      graph.edges().forEach(edge => {
        degrees.set(edge[0], degrees.get(edge[0]) + 1);
        degrees.set(edge[1], degrees.get(edge[1]) + 1);
      });
      
      // Should have some high-degree nodes (hubs)
      const degreeValues = Array.from(degrees.values());
      const maxDegree = Math.max(...degreeValues);
      const avgDegree = degreeValues.reduce((a, b) => a + b) / degreeValues.length;
      
      assert.isAbove(maxDegree, avgDegree * 2); // Should have hubs
    });

    it('should produce consistent results with seed', () => {
      const g1 = scaleFreeGraph(15, 2, 42);
      const g2 = scaleFreeGraph(15, 2, 42);
      
      assert.equal(g1.edges().length, g2.edges().length);
      
      const edges1 = g1.edges().map(e => `${Math.min(e[0], e[1])},${Math.max(e[0], e[1])}`).sort();
      const edges2 = g2.edges().map(e => `${Math.min(e[0], e[1])},${Math.max(e[0], e[1])}`).sort();
      
      assert.deepEqual(edges1, edges2);
    });

    it('should handle different m values', () => {
      const g1 = scaleFreeGraph(20, 1, 123);
      const g2 = scaleFreeGraph(20, 3, 123);
      const g3 = scaleFreeGraph(20, 5, 123);
      
      // More connections per new node means more edges
      assert.isBelow(g1.edges().length, g2.edges().length);
      assert.isBelow(g2.edges().length, g3.edges().length);
    });
  });

  describe('Graph generator integration', () => {
    it('should work with layout algorithms', () => {
      // Test each generator with a layout
      const generators = [
        () => completeGraph(5),
        () => cycleGraph(6),
        () => starGraph(7),
        () => wheelGraph(5),
        () => gridGraph(3, 3),
        () => randomGraph(10, 0.3, 123),
        () => bipartiteGraph(3, 4, 0.5, 123),
        () => scaleFreeGraph(15, 2, 123)
      ];
      
      generators.forEach(gen => {
        const graph = gen();
        const positions = circularLayout(graph);
        
        // Should position all nodes
        assert.equal(Object.keys(positions).length, graph.nodes().length);
        graph.nodes().forEach(node => {
          assert.isDefined(positions[node]);
          assert.equal(positions[node].length, 2);
        });
      });
    });

    it('should produce valid graph structure', () => {
      const generators = [
        () => completeGraph(5),
        () => cycleGraph(6),
        () => starGraph(7),
        () => wheelGraph(5),
        () => gridGraph(3, 3),
        () => randomGraph(10, 0.3, 123),
        () => bipartiteGraph(3, 4, 0.5, 123),
        () => scaleFreeGraph(15, 2, 123)
      ];
      
      generators.forEach(gen => {
        const graph = gen();
        
        // Should have nodes() and edges() methods
        assert.isFunction(graph.nodes);
        assert.isFunction(graph.edges);
        
        // Should return arrays
        assert.isArray(graph.nodes());
        assert.isArray(graph.edges());
        
        // Each edge should connect valid nodes
        const nodeSet = new Set(graph.nodes());
        graph.edges().forEach(edge => {
          assert.equal(edge.length, 2);
          assert.isTrue(nodeSet.has(edge[0]));
          assert.isTrue(nodeSet.has(edge[1]));
        });
      });
    });
  });
});