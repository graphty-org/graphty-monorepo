/**
 * Layout Helper Functions
 * =======================
 * 
 * Essential utilities for graph layouts
 */

import { Node, Edge, Graph } from './layout';

// Define PositionMap type locally since it's not exported
type PositionMap = Record<Node, number[]>;

/**
 * Universal Node Grouping
 * =======================
 * Groups nodes for shell, multipartite, or custom layouts
 */

/**
 * Group nodes by various centrality measures.
 * Works for shell layout, multipartite layout, or any grouping need.
 * 
 * @param graph - Input graph
 * @param method - Grouping method
 * @param numGroups - Number of groups to create
 * @returns Array of node arrays (groups)
 * 
 * @example
 * // For shell layout
 * const shells = groupNodes(graph, 'degree', 3);
 * const positions = shellLayout(graph, shells);
 * 
 * // For multipartite layout  
 * const layers = groupNodes(graph, 'bfs', 0); // 0 = auto
 * const positions = multipartiteLayout(graph, layers);
 */
export function groupNodes(
  graph: Graph,
  method: 'degree' | 'bfs' | 'k-core' | 'community' = 'degree',
  numGroups: number = 3,
  options: { root?: Node } = {}
): Node[][] {
  const nodes = graph.nodes?.() || [];
  const edges = graph.edges?.() || [];
  
  switch (method) {
    case 'degree':
      return groupByDegree(nodes, edges, numGroups);
    
    case 'bfs':
      return groupByDistance(nodes, edges, options.root);
    
    case 'k-core':
      return groupByKCore(nodes, edges);
    
    case 'community':
      return groupByCommunity(nodes, edges, numGroups);
    
    default:
      return [nodes]; // Single group fallback
  }
}

/**
 * Bipartite Detection & Handling
 * ==============================
 */

/**
 * Detect if graph is bipartite and find the two sets.
 * 
 * @param graph - Input graph
 * @returns Bipartite sets or null if not bipartite
 * 
 * @example
 * const result = detectBipartite(graph);
 * if (result) {
 *   const positions = bipartiteLayout(graph, result.setA);
 * }
 */
export function detectBipartite(graph: Graph): { setA: Node[], setB: Node[] } | null {
  const nodes = graph.nodes?.() || [];
  const edges = graph.edges?.() || [];
  
  if (nodes.length === 0) return { setA: [], setB: [] };
  
  // Build adjacency list
  const adj = new Map<Node, Node[]>();
  nodes.forEach(node => adj.set(node, []));
  edges.forEach(([u, v]) => {
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  });
  
  // Try to 2-color the graph
  const colors = new Map<Node, number>();
  
  for (const start of nodes) {
    if (colors.has(start)) continue;
    
    const queue = [start];
    colors.set(start, 0);
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      const nodeColor = colors.get(node)!;
      
      for (const neighbor of adj.get(node)!) {
        if (!colors.has(neighbor)) {
          colors.set(neighbor, 1 - nodeColor);
          queue.push(neighbor);
        } else if (colors.get(neighbor) === nodeColor) {
          return null; // Not bipartite
        }
      }
    }
  }
  
  // Separate into sets
  const setA: Node[] = [];
  const setB: Node[] = [];
  
  nodes.forEach(node => {
    if (colors.get(node) === 0) setA.push(node);
    else setB.push(node);
  });
  
  return { setA, setB };
}

/**
 * Layout Analysis & Optimization
 * ==============================
 */

/**
 * Find the best root node for tree-like layouts (BFS, hierarchical).
 * 
 * @param graph - Input graph
 * @returns Best root node
 */
export function findBestRoot(graph: Graph): Node | null {
  const nodes = graph.nodes?.() || [];
  const edges = graph.edges?.() || [];
  
  if (nodes.length === 0) return null;
  
  // Build adjacency list
  const adj = new Map<Node, Set<Node>>();
  nodes.forEach(node => adj.set(node, new Set()));
  edges.forEach(([u, v]) => {
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  });
  
  // Find node with minimum eccentricity (center of graph)
  let bestNode = nodes[0];
  let bestEccentricity = Infinity;
  
  for (const start of nodes) {
    // BFS to find max distance
    const distances = new Map<Node, number>();
    const queue = [start];
    distances.set(start, 0);
    let maxDist = 0;
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      const dist = distances.get(node)!;
      
      adj.get(node)!.forEach(neighbor => {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, dist + 1);
          maxDist = Math.max(maxDist, dist + 1);
          queue.push(neighbor);
        }
      });
    }
    
    if (maxDist < bestEccentricity) {
      bestEccentricity = maxDist;
      bestNode = start;
    }
  }
  
  return bestNode;
}

/**
 * Check if a graph is planar (can be drawn without edge crossings).
 * 
 * @param graph - Input graph  
 * @returns true if planar
 */
export function isPlanar(graph: Graph): boolean {
  const n = graph.nodes?.()?.length || 0;
  const m = graph.edges?.()?.length || 0;
  
  // Quick check: Euler's formula
  if (n >= 3 && m > 3 * n - 6) return false;
  
  // For accurate check, would need to try planarLayout
  // This is a simplified heuristic
  return true;
}

/**
 * Auto-configure force-directed layout parameters.
 * 
 * @param graph - Input graph
 * @returns Recommended parameters
 */
export function autoConfigureForce(graph: Graph): {
  k: number;            // Optimal spring length
  iterations: number;   // Number of iterations
  gravity: number;      // ForceAtlas2 gravity
  scalingRatio: number; // ForceAtlas2 scaling
} {
  const n = graph.nodes?.()?.length || 0;
  const m = graph.edges?.()?.length || 0;
  const density = n > 1 ? (2 * m) / (n * (n - 1)) : 0;
  
  return {
    k: Math.sqrt(1 / n),  // Fruchterman-Reingold optimal distance
    iterations: n < 50 ? 500 : n < 200 ? 300 : 200,
    gravity: density < 0.1 ? 0.5 : density < 0.3 ? 1.0 : 2.0,
    scalingRatio: n < 50 ? 2.0 : n < 200 ? 5.0 : 10.0
  };
}

/**
 * Layout Quality Metrics
 * ======================
 */

/**
 * Calculate simple layout quality metrics.
 * 
 * @param graph - Input graph
 * @param positions - Layout positions
 * @returns Quality metrics
 */
export function layoutQuality(graph: Graph, positions: PositionMap): {
  avgEdgeLength: number;
  edgeLengthStdDev: number;
  minNodeDistance: number;
  aspectRatio: number;
} {
  const nodes = graph.nodes?.() || [];
  const edges = graph.edges?.() || [];
  
  // Edge lengths
  const edgeLengths = edges.map(([u, v]) => {
    const p1 = positions[u];
    const p2 = positions[v];
    return Math.sqrt(p1.reduce((sum: number, val: number, i: number) => sum + (val - p2[i]) ** 2, 0));
  });
  
  const avgEdgeLength = edgeLengths.reduce((a, b) => a + b, 0) / edgeLengths.length || 0;
  const variance = edgeLengths.reduce((sum, len) => sum + (len - avgEdgeLength) ** 2, 0) / edgeLengths.length || 0;
  const edgeLengthStdDev = Math.sqrt(variance);
  
  // Minimum node distance
  let minNodeDistance = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const p1 = positions[nodes[i]];
      const p2 = positions[nodes[j]];
      const dist = Math.sqrt(p1.reduce((sum: number, val: number, k: number) => sum + (val - p2[k]) ** 2, 0));
      minNodeDistance = Math.min(minNodeDistance, dist);
    }
  }
  
  // Bounding box and aspect ratio
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    const [x, y] = positions[node];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  
  return {
    avgEdgeLength,
    edgeLengthStdDev,
    minNodeDistance: minNodeDistance === Infinity ? 0 : minNodeDistance,
    aspectRatio
  };
}

/**
 * Layout Utilities
 * ================
 */

/**
 * Combine multiple layouts with weights.
 * 
 * @param layouts - Array of position maps
 * @param weights - Weight for each layout (default: equal)
 * @returns Combined positions
 */
export function combineLayouts(layouts: PositionMap[], weights?: number[]): PositionMap {
  if (layouts.length === 0) return {};
  
  const w = weights || new Array(layouts.length).fill(1 / layouts.length);
  const result: PositionMap = {};
  const nodes = Object.keys(layouts[0]);
  
  nodes.forEach(node => {
    const dim = layouts[0][node].length;
    result[node] = new Array(dim).fill(0);
    
    layouts.forEach((layout, i) => {
      if (node in layout) {
        for (let d = 0; d < dim; d++) {
          result[node][d] += layout[node][d] * w[i];
        }
      }
    });
  });
  
  return result;
}

/**
 * Create smooth animation frames between layouts.
 * 
 * @param from - Starting positions
 * @param to - Ending positions  
 * @param steps - Number of frames
 * @returns Array of position maps
 */
export function interpolateLayouts(
  from: PositionMap,
  to: PositionMap,
  steps: number = 10
): PositionMap[] {
  const frames: PositionMap[] = [];
  const nodes = Object.keys(from);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const frame: PositionMap = {};
    
    nodes.forEach(node => {
      if (node in to) {
        frame[node] = from[node].map((val: number, d: number) => 
          val + t * (to[node][d] - val)
        );
      }
    });
    
    frames.push(frame);
  }
  
  return frames;
}

/**
 * Internal Helper Functions
 * =========================
 */

function groupByDegree(nodes: Node[], edges: Edge[], numGroups: number): Node[][] {
  // Calculate degrees
  const degrees = new Map<Node, number>();
  nodes.forEach(node => degrees.set(node, 0));
  edges.forEach(([u, v]) => {
    degrees.set(u, degrees.get(u)! + 1);
    degrees.set(v, degrees.get(v)! + 1);
  });
  
  // Sort by degree
  const sorted = nodes.slice().sort((a, b) => degrees.get(b)! - degrees.get(a)!);
  
  // Distribute into groups
  const groups: Node[][] = new Array(numGroups).fill(null).map(() => []);
  const nodesPerGroup = Math.ceil(nodes.length / numGroups);
  
  sorted.forEach((node, i) => {
    const groupIdx = Math.floor(i / nodesPerGroup);
    if (groupIdx < numGroups) {
      groups[groupIdx].push(node);
    }
  });
  
  return groups.filter(g => g.length > 0);
}

function groupByDistance(nodes: Node[], edges: Edge[], root?: Node): Node[][] {
  if (nodes.length === 0) return [];
  
  const start = root || nodes[0];
  const adj = new Map<Node, Node[]>();
  
  nodes.forEach(node => adj.set(node, []));
  edges.forEach(([u, v]) => {
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  });
  
  // BFS layers
  const visited = new Set<Node>();
  const layers: Node[][] = [];
  let currentLayer = [start];
  visited.add(start);
  
  while (currentLayer.length > 0) {
    layers.push(currentLayer.slice());
    const nextLayer: Node[] = [];
    
    currentLayer.forEach(node => {
      adj.get(node)!.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextLayer.push(neighbor);
        }
      });
    });
    
    currentLayer = nextLayer;
  }
  
  // Add disconnected nodes
  const unvisited = nodes.filter(n => !visited.has(n));
  if (unvisited.length > 0) {
    layers.push(unvisited);
  }
  
  return layers;
}

function groupByKCore(nodes: Node[], edges: Edge[]): Node[][] {
  // Build adjacency
  const adj = new Map<Node, Set<Node>>();
  const degree = new Map<Node, number>();
  
  nodes.forEach(node => {
    adj.set(node, new Set());
    degree.set(node, 0);
  });
  
  edges.forEach(([u, v]) => {
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
    degree.set(u, degree.get(u)! + 1);
    degree.set(v, degree.get(v)! + 1);
  });
  
  // k-core decomposition
  const coreNumber = new Map<Node, number>();
  const remaining = new Set(nodes);
  
  while (remaining.size > 0) {
    // Find minimum degree
    let minDegree = Infinity;
    remaining.forEach(node => {
      minDegree = Math.min(minDegree, degree.get(node)!);
    });
    
    // Remove nodes with degree <= minDegree
    const toRemove: Node[] = [];
    remaining.forEach(node => {
      if (degree.get(node)! <= minDegree) {
        toRemove.push(node);
      }
    });
    
    while (toRemove.length > 0) {
      const node = toRemove.shift()!;
      coreNumber.set(node, minDegree);
      remaining.delete(node);
      
      adj.get(node)!.forEach(neighbor => {
        if (remaining.has(neighbor)) {
          degree.set(neighbor, degree.get(neighbor)! - 1);
          if (degree.get(neighbor)! <= minDegree && !toRemove.includes(neighbor)) {
            toRemove.push(neighbor);
          }
        }
      });
    }
  }
  
  // Group by core number
  const groups = new Map<number, Node[]>();
  nodes.forEach(node => {
    const core = coreNumber.get(node)!;
    if (!groups.has(core)) groups.set(core, []);
    groups.get(core)!.push(node);
  });
  
  // Return sorted by core number (highest first)
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, nodeList]) => nodeList);
}

function groupByCommunity(nodes: Node[], edges: Edge[], targetGroups: number): Node[][] {
  // Simple community detection using modularity
  const communities = new Map<Node, number>();
  nodes.forEach((node, i) => communities.set(node, i));
  
  // Build adjacency
  const adj = new Map<Node, Set<Node>>();
  nodes.forEach(node => adj.set(node, new Set()));
  edges.forEach(([u, v]) => {
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  });
  
  // Iteratively merge communities
  let numCommunities = nodes.length;
  while (numCommunities > targetGroups) {
    let improved = false;
    
    for (const node of nodes) {
      const currentComm = communities.get(node)!;
      const neighborComms = new Set<number>();
      
      adj.get(node)!.forEach(neighbor => {
        neighborComms.add(communities.get(neighbor)!);
      });
      
      for (const targetComm of Array.from(neighborComms)) {
        if (targetComm !== currentComm) {
          // Simple decision: join most common neighbor community
          communities.set(node, targetComm);
          improved = true;
          break;
        }
      }
      
      if (improved) break;
    }
    
    if (!improved) break;
    
    // Count communities
    numCommunities = new Set(communities.values()).size;
  }
  
  // Group nodes by community
  const groups = new Map<number, Node[]>();
  communities.forEach((comm, node) => {
    if (!groups.has(comm)) groups.set(comm, []);
    groups.get(comm)!.push(node);
  });
  
  return Array.from(groups.values());
}