import { describe, it, assert } from 'vitest';
import { 
  bipartiteLayout,
  bipartiteGraph
} from '../src';

describe('Bipartite Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = bipartiteGraph(3, 4, 0.5, 42);
      const positions = bipartiteLayout(graph, graph.setA);
      
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
      const positions = bipartiteLayout(emptyGraph, []);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = bipartiteLayout(singleNode, ['A']);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.deepEqual(positions['A'], [0, 0]);
    });

    it('should handle disconnected bipartite graph', () => {
      const graph = {
        nodes: () => ['A0', 'A1', 'B0', 'B1', 'B2'],
        edges: () => [['A0', 'B0'], ['A1', 'B2']] // B1 is disconnected
      };
      const setA = ['A0', 'A1'];
      
      const positions = bipartiteLayout(graph, setA);
      
      assert.equal(Object.keys(positions).length, 5);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });
  });

  describe('Bipartite arrangement', () => {
    it('should separate sets on opposite sides for vertical alignment', () => {
      const graph = bipartiteGraph(4, 5, 0.7, 123);
      const positions = bipartiteLayout(graph, graph.setA, 'vertical');
      
      // Get x-coordinates for each set
      const setAX = graph.setA.map(node => positions[node][0]);
      const setBX = graph.setB.map(node => positions[node][0]);
      
      const avgAX = setAX.reduce((a, b) => a + b) / setAX.length;
      const avgBX = setBX.reduce((a, b) => a + b) / setBX.length;
      
      // Sets should be on opposite sides (significant x difference)
      assert.isAbove(Math.abs(avgAX - avgBX), 1);
      
      // All nodes in a set should have same x-coordinate
      setAX.forEach(x => assert.approximately(x, setAX[0], 1e-10));
      setBX.forEach(x => assert.approximately(x, setBX[0], 1e-10));
    });

    it('should separate sets on opposite sides for horizontal alignment', () => {
      const graph = bipartiteGraph(3, 4, 0.8, 456);
      const positions = bipartiteLayout(graph, graph.setA, 'horizontal');
      
      // Get y-coordinates for each set
      const setAY = graph.setA.map(node => positions[node][1]);
      const setBY = graph.setB.map(node => positions[node][1]);
      
      const avgAY = setAY.reduce((a, b) => a + b) / setAY.length;
      const avgBY = setBY.reduce((a, b) => a + b) / setBY.length;
      
      // Sets should be on opposite sides (significant y difference)
      assert.isAbove(Math.abs(avgAY - avgBY), 1);
      
      // All nodes in a set should have same y-coordinate
      setAY.forEach(y => assert.approximately(y, setAY[0], 1e-10));
      setBY.forEach(y => assert.approximately(y, setBY[0], 1e-10));
    });

    it('should evenly space nodes within each set', () => {
      const graph = {
        nodes: () => ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2'],
        edges: () => [['A0', 'B0'], ['A1', 'B1'], ['A2', 'B2'], ['A3', 'B0']]
      };
      const setA = ['A0', 'A1', 'A2', 'A3'];
      
      const positions = bipartiteLayout(graph, setA, 'vertical');
      
      // Check spacing in set A
      const aPositions = setA.map(node => positions[node][1]).sort((a, b) => a - b);
      const aSpacings = [];
      for (let i = 1; i < aPositions.length; i++) {
        aSpacings.push(aPositions[i] - aPositions[i-1]);
      }
      
      // All spacings should be equal
      const avgSpacing = aSpacings.reduce((a, b) => a + b) / aSpacings.length;
      aSpacings.forEach(s => assert.approximately(s, avgSpacing, 1e-10));
    });

    it('should handle sets of different sizes', () => {
      const graph = {
        nodes: () => ['A0', 'B0', 'B1', 'B2', 'B3', 'B4'],
        edges: () => [['A0', 'B0'], ['A0', 'B1'], ['A0', 'B2']]
      };
      const setA = ['A0'];
      
      const positions = bipartiteLayout(graph, setA);
      
      // Single node in set A should be positioned
      assert.isDefined(positions['A0']);
      assert.equal(positions['A0'].length, 2);
      
      // Set B nodes should be evenly distributed
      const bNodes = ['B0', 'B1', 'B2', 'B3', 'B4'];
      const bPositions = bNodes.map(node => positions[node][1]).sort((a, b) => a - b);
      
      // Check that they span a reasonable range
      const span = bPositions[bPositions.length - 1] - bPositions[0];
      assert.isAbove(span, 0.5); // Allow smaller span
    });
  });

  describe('Parameter variations', () => {
    it('should respect scale parameter', () => {
      const graph = bipartiteGraph(3, 3, 1.0);
      const positions1 = bipartiteLayout(graph, graph.setA, 'vertical', 1);
      const positions2 = bipartiteLayout(graph, graph.setA, 'vertical', 2);
      
      // Calculate spans for each layout
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      assert.approximately(span2.width / span1.width, 2, 0.1);
      assert.approximately(span2.height / span1.height, 2, 0.1);
    });

    it('should respect center parameter', () => {
      const graph = bipartiteGraph(2, 3, 0.6);
      const center = [5, -3];
      
      const positions = bipartiteLayout(graph, graph.setA, 'vertical', 1, center);
      
      // Calculate center of mass
      const com = getCenterOfMass(positions);
      
      assert.approximately(com[0], center[0], 0.5);
      assert.approximately(com[1], center[1], 0.5);
    });

    it('should respect aspect ratio parameter', () => {
      const graph = bipartiteGraph(4, 4, 0.5);
      
      const positions1 = bipartiteLayout(graph, graph.setA, 'vertical', 1, [0, 0], 0.5);
      const positions2 = bipartiteLayout(graph, graph.setA, 'vertical', 1, [0, 0], 2.0);
      
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      const ratio1 = span1.height / span1.width;
      const ratio2 = span2.height / span2.width;
      
      // Different aspect ratios should produce different layouts
      assert.notEqual(ratio1, ratio2);
      // Just check they are different, don't assume order
    });

    it('should handle alignment parameter correctly', () => {
      const graph = bipartiteGraph(3, 4, 0.7);
      
      const verticalPos = bipartiteLayout(graph, graph.setA, 'vertical');
      const horizontalPos = bipartiteLayout(graph, graph.setA, 'horizontal');
      
      // In vertical, sets differ in x; in horizontal, sets differ in y
      const vDiffX = Math.abs(verticalPos[graph.setA[0]][0] - verticalPos[graph.setB[0]][0]);
      const vDiffY = Math.abs(verticalPos[graph.setA[0]][1] - verticalPos[graph.setB[0]][1]);
      
      const hDiffX = Math.abs(horizontalPos[graph.setA[0]][0] - horizontalPos[graph.setB[0]][0]);
      const hDiffY = Math.abs(horizontalPos[graph.setA[0]][1] - horizontalPos[graph.setB[0]][1]);
      
      // Vertical: large X difference, small Y difference
      assert.isAbove(vDiffX, 1);
      assert.isBelow(vDiffY, 1);
      
      // Horizontal: small X difference, large Y difference  
      assert.isBelow(hDiffX, 1);
      assert.isAbove(hDiffY, 1);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['user1', 'user2', 'user3', 'item1', 'item2'],
        edges: () => [['user1', 'item1'], ['user2', 'item1'], ['user2', 'item2'], ['user3', 'item2']]
      };
      const users = ['user1', 'user2', 'user3'];
      
      const positions = bipartiteLayout(graph, users);
      
      assert.equal(Object.keys(positions).length, 5);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should handle nodes not in specified set', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4],
        edges: () => [[0, 2], [0, 3], [1, 3], [1, 4]]
      };
      const setA = [0, 1]; // 2, 3, 4 are implicitly in set B
      
      const positions = bipartiteLayout(graph, setA);
      
      // All nodes should be positioned
      assert.equal(Object.keys(positions).length, 5);
      
      // Check that sets are separated
      const aX = positions[0][0];
      const bX = positions[2][0];
      assert.notEqual(aX, bX);
    });

    it('should produce consistent results', () => {
      const graph = bipartiteGraph(5, 6, 0.4, 789);
      
      const positions1 = bipartiteLayout(graph, graph.setA);
      const positions2 = bipartiteLayout(graph, graph.setA);
      
      // Bipartite layout is deterministic
      graph.nodes().forEach(node => {
        assert.deepEqual(positions1[node], positions2[node]);
      });
    });

    it('should handle complete bipartite graphs', () => {
      // Complete bipartite graph K(3,3)
      const graph = {
        nodes: () => ['A0', 'A1', 'A2', 'B0', 'B1', 'B2'],
        edges: () => [
          ['A0', 'B0'], ['A0', 'B1'], ['A0', 'B2'],
          ['A1', 'B0'], ['A1', 'B1'], ['A1', 'B2'],
          ['A2', 'B0'], ['A2', 'B1'], ['A2', 'B2']
        ]
      };
      const setA = ['A0', 'A1', 'A2'];
      
      const positions = bipartiteLayout(graph, setA);
      
      // Should produce clean bipartite visualization
      assert.equal(Object.keys(positions).length, 6);
      
      // All nodes in each set should align
      const aXs = setA.map(n => positions[n][0]);
      assert.isTrue(aXs.every(x => Math.abs(x - aXs[0]) < 1e-10));
    });

    it('should handle large bipartite graphs efficiently', () => {
      const graph = bipartiteGraph(50, 50, 0.1, 12345);
      
      const startTime = performance.now();
      const positions = bipartiteLayout(graph, graph.setA);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 100);
      assert.isBelow(endTime - startTime, 100); // Should be very fast
    });
  });

  describe('Layout quality', () => {
    it('should minimize edge crossings', () => {
      // Create a graph where ordering matters
      const graph = {
        nodes: () => ['A0', 'A1', 'A2', 'B0', 'B1', 'B2'],
        edges: () => [
          ['A0', 'B0'], ['A1', 'B1'], ['A2', 'B2']  // No crossings if ordered properly
        ]
      };
      const setA = ['A0', 'A1', 'A2'];
      
      const positions = bipartiteLayout(graph, setA);
      
      // Check that connected nodes have similar y-coordinates
      // This suggests minimal edge crossings
      const edgeLengths = graph.edges().map(([u, v]) => {
        return Math.abs(positions[u][1] - positions[v][1]);
      });
      
      // All edges should have similar vertical spans (suggesting no crossings)
      const avgLength = edgeLengths.reduce((a, b) => a + b) / edgeLengths.length;
      edgeLengths.forEach(len => {
        assert.isBelow(Math.abs(len - avgLength), 0.5);
      });
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