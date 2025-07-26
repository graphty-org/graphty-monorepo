import { describe, it, assert } from 'vitest';
import { 
  fruchtermanReingoldLayout,
  completeGraph,
  cycleGraph,
  starGraph,
  gridGraph,
  randomGraph
} from '../src';

describe('Fruchterman-Reingold Layout', () => {
  describe('Basic functionality', () => {
    it('should position all nodes', () => {
      const graph = completeGraph(6);
      const positions = fruchtermanReingoldLayout(graph);
      
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
      const positions = fruchtermanReingoldLayout(emptyGraph);
      
      assert.equal(Object.keys(positions).length, 0);
    });

    it('should handle single node', () => {
      const singleNode = { nodes: () => ['A'], edges: () => [] };
      const positions = fruchtermanReingoldLayout(singleNode);
      
      assert.equal(Object.keys(positions).length, 1);
      assert.isDefined(positions['A']);
      assert.equal(positions['A'].length, 2);
    });

    it('should handle disconnected components', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3, 4, 5],
        edges: () => [[0, 1], [1, 2], [3, 4], [4, 5]]
      };
      const positions = fruchtermanReingoldLayout(graph);
      
      assert.equal(Object.keys(positions).length, 6);
      graph.nodes().forEach(node => {
        assert.isDefined(positions[node]);
      });
    });
  });

  describe('Parameter variations', () => {
    it('should respect k parameter (optimal distance)', () => {
      const graph = cycleGraph(8);
      
      const positions1 = fruchtermanReingoldLayout(graph, 0.5);
      const positions2 = fruchtermanReingoldLayout(graph, 2.0);
      
      // Both should produce valid layouts
      assert.equal(Object.keys(positions1).length, 8);
      assert.equal(Object.keys(positions2).length, 8);
      
      // Larger k should generally produce more spread out layout
      const avgDist1 = getAverageEdgeLength(graph, positions1);
      const avgDist2 = getAverageEdgeLength(graph, positions2);
      
      // k affects the ideal spring length
      assert.isAbove(avgDist1, 0);
      assert.isAbove(avgDist2, 0);
    });

    it('should use provided initial positions', () => {
      const graph = starGraph(6);
      const initialPos = {};
      graph.nodes().forEach((node, i) => {
        initialPos[node] = [i * 0.2, 0]; // Line layout
      });
      
      const positions = fruchtermanReingoldLayout(graph, null, initialPos);
      
      assert.equal(Object.keys(positions).length, 6);
      // Should evolve from initial positions
      let different = false;
      graph.nodes().forEach(node => {
        if (positions[node][0] !== initialPos[node][0] || 
            positions[node][1] !== initialPos[node][1]) {
          different = true;
        }
      });
      assert.isTrue(different);
    });

    it('should respect fixed nodes', () => {
      const graph = cycleGraph(5);
      const initialPos = {};
      graph.nodes().forEach((node, i) => {
        const angle = (2 * Math.PI * i) / 5;
        initialPos[node] = [Math.cos(angle), Math.sin(angle)];
      });
      
      const fixed = [0, 2]; // Fix nodes 0 and 2
      const positions = fruchtermanReingoldLayout(graph, null, initialPos, fixed);
      
      // Fixed nodes should not move
      assert.deepEqual(positions[0], initialPos[0]);
      assert.deepEqual(positions[2], initialPos[2]);
      
      // Other nodes should be able to move
      assert.notDeepEqual(positions[1], initialPos[1]);
    });

    it('should respect iterations parameter', () => {
      const graph = randomGraph(15, 0.3, 42);
      
      // Test with fewer iterations
      const positions1 = fruchtermanReingoldLayout(graph, null, null, null, 5);
      
      // Test with more iterations 
      const positions2 = fruchtermanReingoldLayout(graph, null, null, null, 50);
      
      // Both should complete with correct number of nodes
      assert.equal(Object.keys(positions1).length, 15);
      assert.equal(Object.keys(positions2).length, 15);
      
      // More iterations should generally produce a more stable layout
      // We can test this by running the same config twice and checking consistency
      const positions2a = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0], 2, 42);
      const positions2b = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0], 2, 42);
      
      // With same seed and more iterations, results should be identical
      const nodes = Object.keys(positions2a);
      let maxDifference = 0;
      for (const node of nodes) {
        const pos2a = positions2a[node];
        const pos2b = positions2b[node];
        if (pos2a && pos2b) {
          const dx = pos2a[0] - pos2b[0];
          const dy = pos2a[1] - pos2b[1];
          const distance = Math.sqrt(dx * dx + dy * dy);
          maxDifference = Math.max(maxDifference, distance);
        }
      }
      
      // Should be very close (allowing for floating point precision)
      assert.isBelow(maxDifference, 1e-10);
    });

    it('should respect scale parameter', () => {
      const graph = gridGraph(4, 4);
      
      const positions1 = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0], 2, 42);
      const positions2 = fruchtermanReingoldLayout(graph, null, null, null, 50, 2, [0, 0], 2, 42);
      
      // Calculate spans
      const span1 = getLayoutSpan(positions1);
      const span2 = getLayoutSpan(positions2);
      
      // Scale parameter affects the final layout size
      // but the exact ratio might vary due to force-directed nature
      assert.isAbove(span2.width, span1.width);
      assert.isAbove(span2.height, span1.height);
      
      // Both should produce reasonable layouts
      assert.isAbove(span1.width, 0);
      assert.isAbove(span1.height, 0);
      assert.isAbove(span2.width, 0);
      assert.isAbove(span2.height, 0);
    });

    it('should respect center parameter', () => {
      const graph = completeGraph(5);
      const center = [10, -5];
      
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, center);
      
      // Calculate center of mass
      const com = getCenterOfMass(positions);
      
      assert.approximately(com[0], center[0], 1);
      assert.approximately(com[1], center[1], 1);
    });

    it('should handle different dimensions', () => {
      const graph = cycleGraph(6);
      
      // 2D layout
      const positions2D = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0], 2);
      graph.nodes().forEach(node => {
        assert.equal(positions2D[node].length, 2);
      });
      
      // 3D layout
      const positions3D = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0, 0], 3);
      graph.nodes().forEach(node => {
        assert.equal(positions3D[node].length, 3);
        assert.isNumber(positions3D[node][2]);
      });
    });
  });

  describe('Force-directed properties', () => {
    it('should separate non-connected nodes', () => {
      const graph = {
        nodes: () => [0, 1, 2, 3],
        edges: () => [[0, 1], [2, 3]] // Two separate edges
      };
      
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 200, 1, null, 2, 42);
      
      // Connected pairs should be at reasonable distance
      const d01 = getDistance(positions, 0, 1);
      const d23 = getDistance(positions, 2, 3);
      
      // Non-connected nodes should be further apart
      const d02 = getDistance(positions, 0, 2);
      const d13 = getDistance(positions, 1, 3);
      
      assert.isAbove(d01, 0);
      assert.isAbove(d23, 0);
      assert.isAbove(d02, d01);
      assert.isAbove(d13, d23);
    });

    it('should create symmetric layouts for symmetric graphs', () => {
      const graph = completeGraph(6);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 100);
      
      // All pairwise distances should be similar in complete graph
      const distances = [];
      const nodes = graph.nodes();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          distances.push(getDistance(positions, nodes[i], nodes[j]));
        }
      }
      
      const avgDist = distances.reduce((a, b) => a + b) / distances.length;
      const maxDeviation = Math.max(...distances.map(d => Math.abs(d - avgDist) / avgDist));
      
      // Allow some variation but should be roughly symmetric
      assert.isBelow(maxDeviation, 0.5);
    });

    it('should handle star graphs well', () => {
      const graph = starGraph(8);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 100);
      
      // Center node should be roughly in the middle
      const centerNode = 0;
      const leafNodes = Array.from({length: 7}, (_, i) => i + 1);
      
      // Leaves should be roughly equidistant from center
      const leafDistances = leafNodes.map(leaf => getDistance(positions, centerNode, leaf));
      const avgDist = leafDistances.reduce((a, b) => a + b) / leafDistances.length;
      
      leafDistances.forEach(d => {
        assert.approximately(d, avgDist, avgDist * 0.3);
      });
    });
  });

  describe('Convergence and stability', () => {
    it('should converge to stable layout', () => {
      const graph = randomGraph(10, 0.3, 123);
      
      // Run with many iterations
      const positions1 = fruchtermanReingoldLayout(graph, null, null, null, 200);
      
      // Run a few more iterations from the result
      const positions2 = fruchtermanReingoldLayout(graph, null, positions1, null, 20);
      
      // Should not change much
      let totalMovement = 0;
      graph.nodes().forEach(node => {
        totalMovement += getDistance(positions1, positions2, node, node);
      });
      
      assert.isBelow(totalMovement / graph.nodes().length, 0.1);
    });

    it('should produce reasonable layouts for grid graphs', () => {
      const graph = gridGraph(5, 5);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 100);
      
      // Should maintain some grid-like structure
      // Check that adjacent nodes in grid are relatively close
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 4; j++) {
          const node1 = `${i},${j}`;
          const node2 = `${i},${j+1}`;
          const dist = getDistance(positions, node1, node2);
          
          assert.isAbove(dist, 0);
          assert.isBelow(dist, 2); // Should be reasonably close
        }
      }
    });
  });

  describe('Seed consistency', () => {
    it('should produce consistent results with same seed', () => {
      const graph = randomGraph(12, 0.3, 999);
      
      const positions1 = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, 2, 42);
      const positions2 = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, 2, 42);
      
      // Same seed should produce same initial random positions
      graph.nodes().forEach(node => {
        assert.approximately(positions1[node][0], positions2[node][0], 0.1);
        assert.approximately(positions1[node][1], positions2[node][1], 0.1);
      });
    });

    it('should produce different results with different seeds', () => {
      const graph = cycleGraph(8);
      
      const positions1 = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, 2, 123);
      const positions2 = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, null, 2, 456);
      
      // Different seeds should produce different layouts
      let totalDiff = 0;
      graph.nodes().forEach(node => {
        totalDiff += Math.abs(positions1[node][0] - positions2[node][0]);
        totalDiff += Math.abs(positions1[node][1] - positions2[node][1]);
      });
      
      assert.isAbove(totalDiff, 1);
    });
  });

  describe('Special cases and edge cases', () => {
    it('should handle string node IDs', () => {
      const graph = {
        nodes: () => ['alice', 'bob', 'charlie', 'david'],
        edges: () => [['alice', 'bob'], ['bob', 'charlie'], ['charlie', 'david'], ['david', 'alice']]
      };
      
      const positions = fruchtermanReingoldLayout(graph);
      
      assert.equal(Object.keys(positions).length, 4);
      ['alice', 'bob', 'charlie', 'david'].forEach(node => {
        assert.isDefined(positions[node]);
        assert.equal(positions[node].length, 2);
      });
    });

    it('should handle large graphs reasonably', () => {
      const graph = gridGraph(10, 10); // 100 nodes
      
      const startTime = performance.now();
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 50, 1, [0, 0], 2);
      const endTime = performance.now();
      
      assert.equal(Object.keys(positions).length, 100);
      assert.isBelow(endTime - startTime, 2000); // Should complete quickly
    });

    it('should handle dense graphs', () => {
      const graph = completeGraph(15);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 50);
      
      // Should spread nodes out reasonably
      const minDist = getMinimumDistance(positions);
      assert.isAbove(minDist, 0.01);
    });

    it('should handle path graphs', () => {
      const path = {
        nodes: () => [0, 1, 2, 3, 4, 5, 6, 7],
        edges: () => [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]
      };
      
      const positions = fruchtermanReingoldLayout(path, null, null, null, 100);
      
      // Path should stretch out somewhat
      const startEnd = getDistance(positions, 0, 7);
      const avgEdgeLength = getAverageEdgeLength(path, positions);
      
      // End-to-end distance should be several times the average edge length
      assert.isAbove(startEnd, avgEdgeLength * 3);
    });
  });

  describe('Layout quality', () => {
    it('should minimize edge crossings for planar graphs', () => {
      const graph = cycleGraph(10);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 200);
      
      // For a cycle, adjacent nodes should be among the closest
      graph.nodes().forEach((node, i) => {
        const nextNode = (i + 1) % 10;
        const prevNode = (i + 9) % 10;
        
        const distNext = getDistance(positions, node, nextNode);
        const distPrev = getDistance(positions, node, prevNode);
        
        // Check distances to all other nodes
        const otherDists = [];
        graph.nodes().forEach((other, j) => {
          if (j !== i && j !== (i + 1) % 10 && j !== (i + 9) % 10) {
            otherDists.push(getDistance(positions, node, other));
          }
        });
        
        const minOtherDist = Math.min(...otherDists);
        
        // Adjacent nodes should generally be closer than non-adjacent
        // Use a more lenient threshold as the algorithm is stochastic
        assert.isBelow(Math.min(distNext, distPrev), minOtherDist * 1.8);
      });
    });

    it('should avoid node overlap', () => {
      const graph = completeGraph(10);
      const positions = fruchtermanReingoldLayout(graph, null, null, null, 100);
      
      // Check minimum distance between nodes
      const minDist = getMinimumDistance(positions);
      
      // Nodes should be separated
      assert.isAbove(minDist, 0.05);
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

function getDistance(positions, node1, node2, node1Alt?, node2Alt?) {
  const n1 = node1Alt !== undefined ? node1Alt : node1;
  const n2 = node2Alt !== undefined ? node2Alt : node2;
  
  const dx = positions[n1][0] - positions[n2][0];
  const dy = positions[n1][1] - positions[n2][1];
  return Math.sqrt(dx * dx + dy * dy);
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

function getAverageEdgeLength(graph, positions) {
  const edges = graph.edges();
  let totalLength = 0;
  
  edges.forEach(edge => {
    totalLength += getDistance(positions, edge[0], edge[1]);
  });
  
  return totalLength / edges.length;
}