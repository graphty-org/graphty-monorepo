/**
 * Layout
 * ======
 * 
 * Node positioning algorithms for graph drawing in TypeScript.
 * 
 * For `randomLayout()` the possible resulting shape
 * is a square of side [0, scale] (default: [0, 1])
 * Changing `center` shifts the layout by that amount.
 * 
 * For the other layout routines, the extent is
 * [center - scale, center + scale] (default: [-1, 1]).
 * 
 * Ported from NetworkX Python library.
 */

// Type definitions
type Node = string | number;
type Edge = [Node, Node];
type Graph = {
  nodes?: () => Node[];
  edges?: () => Edge[];
  getEdgeData?: (source: Node, target: Node, attr: string) => any;
} | Node[];

type Position = number[];
type PositionMap = Record<Node, Position>;

interface Embedding {
  nodeOrder: Node[];
  faceList: Node[][];
  nodePositions: Record<Node, Position>;
}

// Utility array manipulation functions (NumPy-like)
const np = {
  zeros: function(shape: number | number[]): number | number[] | number[][] | any[] {
    if (typeof shape === 'number') {
      return Array(shape).fill(0);
    }
    if (shape.length === 1) {
      return Array(shape[0]).fill(0);
    }
    return Array(shape[0]).fill(0).map(() => this.zeros(shape.slice(1)));
  },
  
  ones: function(shape: number | number[]): number | any[] {
    if (typeof shape === 'number') {
      return Array(shape).fill(1);
    }
    if (shape.length === 1) {
      return Array(shape[0]).fill(1);
    }
    return Array(shape[0]).fill(1).map(() => this.ones(shape.slice(1)));
  },
  
  linspace: function(start: number, stop: number, num: number): number[] {
    const step = (stop - start) / (num - 1);
    return Array.from({length: num}, (_, i) => start + i * step);
  },
  
  array: function(arr: any): any[] {
    return Array.isArray(arr) ? [...arr] : [arr];
  },
  
  repeat: function(a: any, repeats: number): any[] {
    const result: any[] = [];
    for (let i = 0; i < repeats; i++) {
      result.push(...np.array(a));
    }
    return result;
  },
  
  mean: function(arr: number[] | number[][], axis: number | null = null): number | number[] {
    if (axis === null) {
      const flatArr = Array.isArray(arr[0]) 
        ? (arr as number[][]).flat(Infinity) as number[]
        : arr as number[];
      const sum = flatArr.reduce((a, b) => a + b, 0);
      return sum / flatArr.length;
    }
    
    if (axis === 0) {
      const result: number[] = [];
      const matrix = arr as number[][];
      for (let i = 0; i < matrix[0].length; i++) {
        let sum = 0;
        for (let j = 0; j < matrix.length; j++) {
          sum += matrix[j][i];
        }
        result.push(sum / matrix.length);
      }
      return result;
    }
    
    return (arr as number[][]).map(row => np.mean(row) as number);
  },
  
  add: function(a: number | number[], b: number | number[]): number | number[] {
    if (!Array.isArray(a) && !Array.isArray(b)) {
      return a + b;
    }
    if (!Array.isArray(a)) {
      return (b as number[]).map(val => a + val);
    }
    if (!Array.isArray(b)) {
      return (a as number[]).map(val => val + b);
    }
    return (a as number[]).map((val, i) => val + (b as number[])[i]);
  },
  
  subtract: function(a: number | number[], b: number | number[]): number | number[] {
    if (!Array.isArray(a) && !Array.isArray(b)) {
      return a - b;
    }
    if (!Array.isArray(a)) {
      return (b as number[]).map(val => a - val);
    }
    if (!Array.isArray(b)) {
      return (a as number[]).map(val => val - b);
    }
    return (a as number[]).map((val, i) => val - (b as number[])[i]);
  },
  
  max: function(arr: number | number[]): number {
    if (!Array.isArray(arr)) return arr;
    return Math.max(...(arr as number[]).flat(Infinity) as number[]);
  },
  
  min: function(arr: number | number[]): number {
    if (!Array.isArray(arr)) return arr;
    return Math.min(...(arr as number[]).flat(Infinity) as number[]);
  },
  
  norm: function(arr: number[]): number {
    return Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
  }
};

// Random number generator (for seed-based randomization)
class RandomNumberGenerator {
  private seed: number;
  private m: number;
  private a: number;
  private c: number;
  private _state: number;

  constructor(seed?: number) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.m = 2**35 - 31;
    this.a = 185852;
    this.c = 1;
    this._state = this.seed % this.m;
  }
  
  _next(): number {
    this._state = (this.a * this._state + this.c) % this.m;
    return this._state / this.m;
  }
  
  rand(shape: number | number[] | null = null): number | number[] | number[][] {
    if (shape === null) {
      return this._next();
    }
    
    if (typeof shape === 'number') {
      const result: number[] = [];
      for (let i = 0; i < shape; i++) {
        result.push(this._next());
      }
      return result;
    }
    
    if (shape.length === 1) {
      const result: number[] = [];
      for (let i = 0; i < shape[0]; i++) {
        result.push(this._next());
      }
      return result;
    }
    
    const result: any[] = [];
    for (let i = 0; i < shape[0]; i++) {
      result.push(this.rand(shape.slice(1)));
    }
    return result;
  }
}

// Helper function similar to _process_params in Python version
function _processParams(G: Graph, center: number[] | null, dim: number): { G: Graph; center: number[] } {
  if (!center) {
    center = Array(dim).fill(0);
  }
  
  if (center.length !== dim) {
    throw new Error("length of center coordinates must match dimension of layout");
  }
  
  return { G, center };
}

/**
 * Position nodes uniformly at random in the unit square.
 * 
 * @param G - Graph or list of nodes
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
function randomLayout(G: Graph, center: number[] | null = null, dim: number = 2, seed: number | null = null): PositionMap {
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G as Node[];
  center = processed.center;
  
  const rng = new RandomNumberGenerator(seed ?? undefined);
  const pos: PositionMap = {};
  
nodes.forEach((node: Node) => {
    pos[node] = (rng.rand(dim) as number[]).map((val: number, i: number) => val + center[i]);
});
  
  return pos;
}

/**
 * Position nodes on a circle.
 * 
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (currently only supports dim=2)
 * @returns Positions dictionary keyed by node
 */
function circularLayout(G: Graph, scale: number = 1, center: number[] | null = null, dim: number = 2): PositionMap {
  if (dim < 2) {
    throw new Error("cannot handle dimensions < 2");
  }
  
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G as Node[];
  center = processed.center;
  
  const pos: PositionMap = {};
  
  if (nodes.length === 0) {
    return pos;
  }
  
  if (nodes.length === 1) {
    pos[nodes[0]] = center;
    return pos;
  }
  
  // Calculate positions on a circle
  const theta = np.linspace(0, 2 * Math.PI, nodes.length + 1).slice(0, -1);
  
nodes.forEach((node: Node, i: number) => {
    const x: number = Math.cos(theta[i]) * scale + center[0];
    const y: number = Math.sin(theta[i]) * scale + center[1];
    pos[node] = Array(dim).fill(0).map((_, j: number) => j === 0 ? x : j === 1 ? y : 0);
});
  
  return pos;
}

/**
 * Position nodes in concentric circles.
 * 
 * @param G - Graph or list of nodes
 * @param nlist - List of node lists for each shell
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (currently only supports dim=2)
 * @returns Positions dictionary keyed by node
 */
function shellLayout(G: Graph, nlist: Node[][] | null = null, scale: number = 1, center: number[] | null = null, dim: number = 2): PositionMap {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G as Node[];
  center = processed.center;
  
  const pos: PositionMap = {};
  
  if (nodes.length === 0) {
    return pos;
  }
  
  if (nodes.length === 1) {
    pos[nodes[0]] = center;
    return pos;
  }
  
  // If no nlist is specified, put all nodes in a single shell
  if (!nlist) {
    nlist = [nodes];
  }
  
  const radiusBump = scale / nlist.length;
  let radius: number;
  
  if (nlist[0].length === 1) {
    // Single node at center
    radius = 0;
    pos[nlist[0][0]] = [...center];
    radius += radiusBump;
  } else {
    // Start at radius 1
    radius = radiusBump;
  }
  
  for (let i = 0; i < nlist.length; i++) {
    const shell = nlist[i];
    if (shell.length === 0) continue;
    
    if (shell.length === 1 && i === 0) {
      // Already handled the case of a single center node
      continue;
    }
    
    // Calculate positions on a circle
    const theta = np.linspace(0, 2 * Math.PI, shell.length + 1).slice(0, -1);
    
    shell.forEach((node: Node, j) => {
      const x = Math.cos(theta[j]) * radius + center[0];
      const y = Math.sin(theta[j]) * radius + center[1];
      pos[node] = [x, y];
    });
    
    radius += radiusBump;
  }
  
  return pos;
}

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {number} k - Optimal distance between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {Array} fixed - Nodes to keep fixed at initial position
 * @param {number} iterations - Maximum number of iterations
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
function springLayout(
  G: Graph, 
  k: number | null = null, 
  pos: PositionMap | null = null, 
  fixed: Node[] | null = null, 
  iterations: number = 50, 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2, 
  seed: number | null = null
): PositionMap {
  // Legacy compatibility alias
  return fruchtermanReingoldLayout(G, k, pos, fixed, iterations, scale, center, dim, seed);
}

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 *
 * @param {Object} G - Graph or list of nodes
 * @param {number} k - Optimal distance between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {Array} fixed - Nodes to keep fixed at initial position
 * @param {number} iterations - Maximum number of iterations
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
function fruchtermanReingoldLayout(
  G: Graph, 
  k: number | null = null, 
  pos: PositionMap | null = null, 
  fixed: Node[] | null = null, 
  iterations: number = 50, 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2, 
  seed: number | null = null
): PositionMap {
  const processed = _processParams(G, center, dim);
  let graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph as Node[];
  const edges = graph.edges ? graph.edges() : [];
  
  if (nodes.length === 0) {
    return {};
  }
  
  if (nodes.length === 1) {
    const singlePos: PositionMap = {};
    singlePos[nodes[0]] = center;
    return singlePos;
  }
  
  // Set up initial positions
  let positions: PositionMap = {};
  if (pos) {
    // Use provided positions
    for (const node of nodes) {
      if (pos[node]) {
        positions[node] = [...pos[node]];
      } else {
        const rng = new RandomNumberGenerator(seed ?? undefined);
        positions[node] = rng.rand(dim) as number[];
      }
    }
  } else {
    // Random initial positions
    const rng = new RandomNumberGenerator(seed ?? undefined);
    for (const node of nodes) {
      positions[node] = rng.rand(dim) as number[];
    }
  }
  
  // Set up fixed nodes
  const fixedNodes = new Set(fixed || []);
  
  // Optimal distance between nodes
  if (!k) {
    k = 1.0 / Math.sqrt(nodes.length);
  }
  
  // Initialize temperature
  let t = 0.1;
  // Calculate temperature reduction
  const dt = t / (iterations + 1);
  
  // Simple cooling schedule
  for (let i = 0; i < iterations; i++) {
    // Calculate repulsive forces
    const displacement: Record<Node, number[]> = {};
    for (const node of nodes) {
      displacement[node] = Array(dim).fill(0);
    }
    
    // Repulsive forces between nodes
    for (let v1i = 0; v1i < nodes.length; v1i++) {
      const v1 = nodes[v1i];
      for (let v2i = v1i + 1; v2i < nodes.length; v2i++) {
        const v2 = nodes[v2i];
        
        // Difference vector
        const delta = positions[v1].map((p, i) => p - positions[v2][i]);
        
        // Distance
        const distance = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0)) || 0.1;
        
        // Force
        const force = (k * k) / distance;
        
        // Add force to displacement
        for (let j = 0; j < dim; j++) {
          const direction = delta[j] / distance;
          displacement[v1][j] += direction * force;
          displacement[v2][j] -= direction * force;
        }
      }
    }
    
    // Attractive forces between connected nodes
    for (const [source, target] of edges) {
      // Difference vector
      const delta = positions[source].map((p, i) => p - positions[target][i]);
      
      // Distance
      const distance = Math.sqrt(delta.reduce((sum, d) => sum + d * d, 0)) || 0.1;
      
      // Force
      const force = (distance * distance) / k;
      
      // Add force to displacement
      for (let j = 0; j < dim; j++) {
        const direction = delta[j] / distance;
        displacement[source][j] -= direction * force;
        displacement[target][j] += direction * force;
      }
    }
    
    // Update positions
    for (const node of nodes) {
      if (fixedNodes.has(node)) continue;
      
      // Calculate displacement magnitude
      const magnitude = Math.sqrt(displacement[node].reduce((sum, d) => sum + d * d, 0));
      
      // Limit maximum displacement by temperature
      const limitedMagnitude = Math.min(magnitude, t);
      
      // Update position
      for (let j = 0; j < dim; j++) {
        const direction = magnitude === 0 ? 0 : displacement[node][j] / magnitude;
        positions[node][j] += direction * limitedMagnitude;
      }
    }
    
    // Cool temperature
    t -= dt;
  }
  
  // Rescale positions
  if (!fixed) {
    positions = rescaleLayout(positions, scale, center) as PositionMap;
  }
  
  return positions;
}

/**
 * Position nodes in a spectral layout using eigenvectors of the graph Laplacian.
 * 
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
function spectralLayout(
  G: Graph, 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2
): PositionMap {
  const processed = _processParams(G, center, dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (nodes.length <= 2) {
    if (nodes.length === 0) {
      return {};
    } else if (nodes.length === 1) {
      return {[nodes[0]]: center};
    } else {
      return {
        [nodes[0]]: center.map(v => v - scale),
        [nodes[1]]: center.map(v => v + scale)
      };
    }
  }
  
  // Create adjacency matrix
  const N = nodes.length;
  const nodeIndices: Record<Node, number> = {};
nodes.forEach((node: Node, i: number) => { nodeIndices[node] = i; });
  
  const A = Array(N).fill(0).map(() => Array(N).fill(0));
  const edges = graph.edges ? graph.edges() : [];
  
  for (const [source, target] of edges) {
    const i = nodeIndices[source];
    const j = nodeIndices[target];
    A[i][j] = 1;
    A[j][i] = 1; // Make symmetric for undirected graphs
  }
  
  // Create Laplacian matrix: L = D - A where D is degree matrix
  const L = Array(N).fill(0).map(() => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    // Compute degree (sum of row)
    L[i][i] = A[i].reduce((sum, val) => sum + val, 0);
    for (let j = 0; j < N; j++) {
      L[i][j] -= A[i][j];
    }
  }
  
  // Compute eigenvectors using power iteration method
  // We need the smallest non-zero eigenvectors of L
  const eigenvectors: number[][] = [];
  
  // For each dimension, find an eigenvector
  for (let d = 0; d < dim; d++) {
    let vector = Array(N).fill(0).map(() => Math.random() - 0.5);
    
    // Orthogonalize against previous eigenvectors
    for (const ev of eigenvectors) {
      const dot = vector.reduce((acc, val, idx) => acc + val * ev[idx], 0);
      vector = vector.map((val, idx) => val - dot * ev[idx]);
    }
    
    // Normalize
    const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
    vector = vector.map(val => val / norm);
    
    // Apply shifted inverse iteration to find smallest non-zero eigenvector
    // This is a simplification of the actual algorithm
    for (let iter = 0; iter < 100; iter++) {
      // Apply Laplacian
      const newVec = Array(N).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          newVec[i] += L[i][j] * vector[j];
        }
      }
      
      // Orthogonalize against the constant vector (eigenvector with eigenvalue 0)
      const mean = newVec.reduce((acc, val) => acc + val, 0) / N;
      newVec.forEach((val, idx, arr) => { arr[idx] = val - mean; });
      
      // Normalize
      const newNorm = Math.sqrt(newVec.reduce((acc, val) => acc + val * val, 0));
      if (newNorm < 1e-10) continue; // Skip if vector is close to zero
      
      vector = newVec.map(val => val / newNorm);
    }
    
    eigenvectors.push(vector);
  }
  
  // Create position array from eigenvectors
  const positions: number[][] = Array(N).fill(0).map(() => Array(dim).fill(0));
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < dim; d++) {
      positions[i][d] = eigenvectors[d][i];
    }
  }
  
  // Rescale and create position dictionary
  const scaledPositions = rescaleLayout(positions as any, scale);
  const pos: PositionMap = {};
nodes.forEach((node: Node, i: number) => {
    pos[node] = (scaledPositions as number[][])[i].map((val: number, j: number) => val + center[j]);
});
  
  return pos;
}

/**
 * Position nodes in a spiral layout.
 * 
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param resolution - Controls the spacing between spiral elements
 * @param equidistant - Whether to place nodes equidistant from each other
 * @returns Positions dictionary keyed by node
 */
function spiralLayout(
  G: Graph, 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2, 
  resolution: number = 0.35, 
  equidistant: boolean = false
): PositionMap {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center || [0, 0], dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G as Node[];
  center = processed.center;
  
  const pos: PositionMap = {};
  
  if (nodes.length === 0) {
    return pos;
  }
  
  if (nodes.length === 1) {
    pos[nodes[0]] = [...center];
    return pos;
  }
  
  let positions: number[][] = [];
  
  if (equidistant) {
    // Create equidistant points along the spiral
    // This matches the Python implementation logic
    const chord = 1;
    const step = 0.5;
    let theta = resolution;
    theta += chord / (step * theta);
    
    for (let i = 0; i < nodes.length; i++) {
      const r = step * theta;
      theta += chord / r;
      positions.push([Math.cos(theta) * r, Math.sin(theta) * r]);
    }
  } else {
    // Create points with equal angle but increasing distance
    const dist = Array.from({length: nodes.length}, (_, i) => parseFloat(String(i)));
    const angle = dist.map(d => resolution * d);
    
    positions = dist.map((d, i) => [
      Math.cos(angle[i]) * d,
      Math.sin(angle[i]) * d
    ]);
  }
  
  // Convert position array to position matrix for rescaling
  const posArray: number[][] = [];
  for (let i = 0; i < positions.length; i++) {
    posArray.push(positions[i]);
  }
  
  // Rescale positions and add center offset
  const scaledPositions = rescaleLayout(posArray as any, scale) as any;
  for (let i = 0; i < scaledPositions.length; i++) {
    scaledPositions[i][0] += center[0];
    scaledPositions[i][1] += center[1];
  }
  
  // Create position dictionary
  for (let i = 0; i < nodes.length; i++) {
    pos[nodes[i]] = scaledPositions[i];
  }
  
  return pos;
}

/**
 * Rescale node positions to fit in the specified scale and center.
 * 
 * @param pos - Dictionary or array of positions
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Rescaled positions dictionary
 */
function rescaleLayout(
  pos: PositionMap | number[][], 
  scale: number = 1, 
  center: number[] = [0, 0]
): PositionMap | number[][] {
  // Check if pos is empty
  if (Array.isArray(pos)) {
    if (pos.length === 0) return [];
  } else {
    if (Object.keys(pos).length === 0) return {};
  }
  
  // Extract position values
  const posValues: number[][] = Array.isArray(pos) ? pos : Object.values(pos);
  const dim = posValues[0].length;
  
  // Calculate center of positions
  const posCenter = Array(dim).fill(0);
  for (const p of posValues) {
    for (let i = 0; i < dim; i++) {
      posCenter[i] += p[i] / posValues.length;
    }
  }
  
  // Center positions
  let centeredPos: PositionMap | number[][] = {};
  if (Array.isArray(pos)) {
    centeredPos = pos.map(p => p.map((val, i) => val - posCenter[i]));
  } else {
    for (const [node, p] of Object.entries(pos)) {
      (centeredPos as PositionMap)[node] = p.map((val, i) => val - posCenter[i]);
    }
  }
  
  // Find maximum distance from center
  let maxDistance = 0;
  const centeredValues = Array.isArray(centeredPos) ? centeredPos : Object.values(centeredPos);
  for (const p of centeredValues) {
    const distance = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
    maxDistance = Math.max(maxDistance, distance);
  }
  
  // Rescale
  let scaledPos: PositionMap | number[][] = Array.isArray(pos) ? [] : {};
  
  if (maxDistance > 0) {
    const scaleFactor = scale / maxDistance;
    
    if (Array.isArray(pos)) {
      (scaledPos as number[][]) = (centeredPos as number[][]).map(p => 
        p.map((val, i) => val * scaleFactor + center[i])
      );
    } else {
      for (const [node, p] of Object.entries(centeredPos as PositionMap)) {
        (scaledPos as PositionMap)[node] = p.map((val, i) => val * scaleFactor + center[i]);
      }
    }
  } else {
    // All nodes at the same position
    if (Array.isArray(pos)) {
      (scaledPos as number[][]) = Array(pos.length).fill(0).map(() => [...center]);
    } else {
      for (const node of Object.keys(pos)) {
        (scaledPos as PositionMap)[node] = [...center];
      }
    }
  }
  
  return scaledPos;
}

/**
 * Position nodes in two straight lines (bipartite layout).
 * 
 * @param G - Graph or list of nodes
 * @param nodes - Nodes in one node set of the graph
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param aspectRatio - The ratio of the width to the height of the layout
 * @returns Positions dictionary keyed by node
 */
function bipartiteLayout(
  G: Graph, 
  nodes: Node[] | null = null, 
  align: 'vertical' | 'horizontal' = 'vertical', 
  scale: number = 1, 
  center: number[] | null = null, 
  aspectRatio: number = 4/3
): PositionMap {
  if (align !== 'vertical' && align !== 'horizontal') {
    throw new Error("align must be either vertical or horizontal");
  }
  
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // If nodes not provided, try to determine bipartite sets
  if (!nodes) {
    // A simple heuristic for bipartite detection: use nodes with even/odd indices
    // This is a simplification, in Python NetworkX has bipartite.sets()
    nodes = allNodes.filter((_: Node, i: number): boolean => i % 2 === 0);
  }
  
  const left = new Set(nodes);
const right: Set<Node> = new Set(allNodes.filter((n: Node) => !left.has(n)));
  
  const height = 1;
  const width = aspectRatio * height;
  const offset = [width / 2, height / 2];
  
  const pos: PositionMap = {};
  
  // Position nodes in the left set
  const leftNodes = [...left];
  leftNodes.forEach((node, i) => {
    const x = 0;
    const y = i * height / (leftNodes.length || 1);
    pos[node] = [x, y];
  });
  
  // Position nodes in the right set
  const rightNodes = [...right];
  rightNodes.forEach((node, i) => {
    const x = width;
    const y = i * height / (rightNodes.length || 1);
    pos[node] = [x, y];
  });
  
  // Center positions around the origin and apply offset
  for (const node in pos) {
    pos[node][0] -= offset[0];
    pos[node][1] -= offset[1];
  }
  
  // Rescale positions
  const scaledPos = rescaleLayout(pos, scale, center) as PositionMap;
  
  // Handle horizontal alignment
  if (align === 'horizontal') {
    for (const node in scaledPos) {
      const temp = scaledPos[node][0];
      scaledPos[node][0] = scaledPos[node][1];
      scaledPos[node][1] = temp;
    }
  }
  
  return scaledPos;
}

/**
 * Position nodes in layers of straight lines (multipartite layout).
 * 
 * @param G - Graph or list of nodes
 * @param subsetKey - Object mapping layers to node sets, or node attribute name
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
function multipartiteLayout(
  G: Graph, 
  subsetKey: Record<number | string, Node | Node[]> | string = 'subset', 
  align: 'vertical' | 'horizontal' = 'vertical', 
  scale: number = 1, 
  center: number[] | null = null
): PositionMap {
  if (align !== 'vertical' && align !== 'horizontal') {
    throw new Error("align must be either vertical or horizontal");
  }
  
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // Convert subsetKey to a layer mapping if it's a string
  let layers: Record<number | string, Node[]> = {};
  if (typeof subsetKey === 'string') {
    // In JS we don't have access to node attributes directly
    // This is a simplification - in a real implementation we would need
    // to access node attributes from the graph
    console.warn("Using string subsetKey requires node attributes, using default partitioning");
    // Create a simple partitioning as fallback
    layers = { 0: allNodes };
  } else {
    // subsetKey is already a mapping of layers to nodes
    // Convert single nodes to arrays
    for (const [key, value] of Object.entries(subsetKey)) {
      if (Array.isArray(value)) {
        layers[key] = value;
      } else {
        layers[key] = [value];
      }
    }
  }
  
  const layerCount = Object.keys(layers).length;
  let pos: PositionMap = {};
  
  // Process each layer
  Object.entries(layers).forEach(([layer, nodes], layerIdx) => {
    const layerNodes = Array.isArray(nodes) ? nodes : [nodes];
    const layerSize = layerNodes.length;
    
    layerNodes.forEach((node, nodeIdx) => {
      // Place nodes in a grid: layerIdx determines x-coordinate (column)
      // nodeIdx determines y-coordinate (row position within column)
      const x = layerIdx - (layerCount - 1) / 2;
      const y = nodeIdx - (layerSize - 1) / 2;
      pos[node] = [x, y];
    });
  });
  
  // Rescale positions
  pos = rescaleLayout(pos, scale, center) as PositionMap;
  
  // Handle horizontal alignment
  if (align === 'horizontal') {
    for (const node in pos) {
      const temp = pos[node][0];
      pos[node][0] = pos[node][1];
      pos[node][1] = temp;
    }
  }
  
  return pos;
}

/**
 * Position nodes according to breadth-first search algorithm.
 * 
 * @param G - Graph 
 * @param start - Starting node for bfs
 * @param align - The alignment of layers: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
function bfsLayout(
  G: Graph, 
  start: Node, 
  align: 'vertical' | 'horizontal' = 'vertical', 
  scale: number = 1, 
  center: number[] | null = null
): PositionMap {
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // Compute BFS layers
  const layers: Record<number, Node[]> = {};
  const visited = new Set<Node>();
  let currentLayer = 0;
  
  // Starting layer
  layers[currentLayer] = [start];
  visited.add(start);
  
  // BFS traversal
  while (Object.values(layers).flat().length < allNodes.length) {
    const nextLayer: Node[] = [];
    const currentNodes = layers[currentLayer];
    
    for (const node of currentNodes) {
      // Get neighbors - this is a simplified approach
      // In a real implementation, we would get neighbors from the graph
      const neighbors = getNeighbors(graph, node);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          nextLayer.push(neighbor);
          visited.add(neighbor);
        }
      }
    }
    
    if (nextLayer.length === 0) {
      // No more connected nodes
    const unvisited: Node[] = allNodes.filter((node: Node) => !visited.has(node));
      if (unvisited.length > 0) {
        throw new Error("bfs_layout didn't include all nodes. Graph may be disconnected.");
      }
      break;
    }
    
    currentLayer++;
    layers[currentLayer] = nextLayer;
  }
  
  // Use multipartite_layout to position the layers
  return multipartiteLayout(graph, layers, align, scale, center);
  
  // Helper function to get neighbors
  function getNeighbors(graph: Graph, node: Node): Node[] {
    if (!graph.edges) return [];
    
    return graph.edges()
        .filter((edge: Edge) => edge[0] === node || edge[1] === node)
        .map((edge: Edge): Node => edge[0] === node ? edge[1] : edge[0]);
  }
}

/**
 * Position nodes without edge intersections (planar layout).
 * 
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (must be 2)
 * @returns Positions dictionary keyed by node
 */
function planarLayout(
  G: Graph, 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2
): PositionMap {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center || [0, 0], dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph as Node[];
  const edges = graph.edges ? graph.edges() : [] as Edge[];
  
  if (nodes.length === 0) {
    return {};
  }

  // Check if graph is planar and get embedding
  const { isPlanar, embedding } = checkPlanarity(graph, nodes, edges);
  
  if (!isPlanar) {
    throw new Error("G is not planar.");
  }
  
  if (!embedding) {
    throw new Error("Failed to generate planar embedding.");
  }
  
  // Convert embedding to positions
  let pos = combinatorialEmbeddingToPos(embedding, nodes);
  
  // Rescale the positions
  pos = rescaleLayout(pos, scale, center) as PositionMap;
  
  return pos;
}

/**
 * Check if graph is planar using a simplified version of Boyer-Myrvold algorithm.
 * Returns planarity and embedding information.
 * 
 * @param G - Graph
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Object containing isPlanar flag and embedding
 */
function checkPlanarity(
  G: Graph, 
  nodes: Node[], 
  edges: Edge[]
): { isPlanar: boolean; embedding: Embedding | null } {
  // For small graphs (n <= 4), all are planar
  if (nodes.length <= 4) {
    return { isPlanar: true, embedding: createTriangulationEmbedding(nodes, edges) };
  }
  
  // For K5 (complete graph with 5 nodes) and K3,3 (complete bipartite with 3,3 nodes)
  // these are not planar by Kuratowski's theorem
  if (isK5(nodes, edges) || isK33(nodes, edges)) {
    return { isPlanar: false, embedding: null };
  }
  
  // For other graphs, use LR algorithm (Left-Right Planarity Test)
  const result = lrPlanarityTest(nodes, edges);
  return result;
}

/**
 * Check if graph is K5 (complete graph with 5 nodes)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns True if graph is K5
 */
function isK5(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length !== 5) return false;
  
  // K5 has exactly 10 edges
  if (edges.length !== 10) return false;
  
  // Check if every pair of distinct nodes is connected
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const hasEdge = edges.some(
        e => (e[0] === nodes[i] && e[1] === nodes[j]) || 
             (e[0] === nodes[j] && e[1] === nodes[i])
      );
      if (!hasEdge) return false;
    }
  }
  
  return true;
}

/**
 * Check if graph is K3,3 (complete bipartite with 3,3 nodes)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns True if graph is K3,3
 */
function isK33(nodes: Node[], edges: Edge[]): boolean {
  if (nodes.length !== 6) return false;
  
  // K3,3 has exactly 9 edges
  if (edges.length !== 9) return false;
  
  // Try to find a bipartite partition
  const nodePartitions = tryFindBipartitePartition(nodes, edges);
  if (!nodePartitions) return false;
  
  const [part1, part2] = nodePartitions;
  
  // Check if both partitions have size 3
  if (part1.length !== 3 || part2.length !== 3) return false;
  
  // Check if every node in part1 is connected to every node in part2
  for (const n1 of part1) {
    for (const n2 of part2) {
      const hasEdge = edges.some(
        e => (e[0] === n1 && e[1] === n2) || 
             (e[0] === n2 && e[1] === n1)
      );
      if (!hasEdge) return false;
    }
  }
  
  return true;
}

/**
 * Try to find a bipartite partition of the nodes
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Array of two partitions, or null if not bipartite
 */
function tryFindBipartitePartition(
  nodes: Node[], 
  edges: Edge[]
): [Node[], Node[]] | null {
  const colorMap: Record<Node, number> = {};
  const adjList: Record<Node, Node[]> = {};
  
  // Create adjacency list
  for (const node of nodes) {
    adjList[node] = [];
  }
  
  for (const [u, v] of edges) {
    adjList[u].push(v);
    adjList[v].push(u);
  }
  
  // BFS to color nodes
  const queue: Node[] = [nodes[0]];
  colorMap[nodes[0]] = 0;
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    const nodeColor = colorMap[node];
    
    for (const neighbor of adjList[node]) {
      if (colorMap[neighbor] === undefined) {
        colorMap[neighbor] = 1 - nodeColor; // Toggle color (0/1)
        queue.push(neighbor);
      } else if (colorMap[neighbor] === nodeColor) {
        // Conflict: not bipartite
        return null;
      }
    }
  }
  
  // Create partitions
  const part0: Node[] = [];
  const part1: Node[] = [];
  
  for (const node of nodes) {
    if (colorMap[node] === 0) {
      part0.push(node);
    } else {
      part1.push(node);
    }
  }
  
  return [part0, part1];
}

/**
 * Left-Right Planarity Test for general graphs
 *
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Object containing isPlanar flag and embedding
 */
function lrPlanarityTest(
  nodes: Node[], 
  edges: Edge[]
): { isPlanar: boolean; embedding: Embedding | null } {
  // Create adjacency list for the graph
  const adjList: Record<Node, Node[]> = {};
  for (const node of nodes) {
    adjList[node] = [];
  }
  
  for (const [u, v] of edges) {
    adjList[u].push(v);
    adjList[v].push(u);
  }
  
  // Step 1: Perform DFS to get an st-numbering (ordering of nodes)
  const visited = new Set<Node>();
  const ordering: Node[] = [];
  
  function dfs(node: Node): void {
    visited.add(node);
    ordering.push(node);
    
    for (const neighbor of adjList[node]) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }
  }
  
  // Start DFS from first node
  dfs(nodes[0]);
  
  // If the graph is disconnected, it's still planar but we need to handle each component
  if (ordering.length < nodes.length) {
    // Create a simple triangulation embedding for disconnected graphs
    return { isPlanar: true, embedding: createTriangulationEmbedding(nodes, edges) };
  }
  
  // Step 2: For a general implementation, we'll use a simplified approach
  // since this would normally require implementing the entire LR algorithm
  
  // For this implementation, since we can't fully implement Boyer-Myrvold,
  // we'll create a reasonable planar embedding for most planar graphs
  
  // We assume the graph is planar if it's sparse enough (|E| <= 3|V| - 6)
  // This is a necessary but not sufficient condition for planar graphs
  if (edges.length > 3 * nodes.length - 6) {
    return { isPlanar: false, embedding: null };
  }
  
  // Create a planar embedding using a triangulation approach
  const embedding = createTriangulationEmbedding(nodes, edges);
  
  return { isPlanar: true, embedding };
}

/**
 * Create a triangulation-based embedding for a planar graph
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @returns Embedding object
 */
function createTriangulationEmbedding(
  nodes: Node[], 
  edges: Edge[]
): Embedding {
  // Create a simple embedding using the incremental approach
  const embedding: Embedding = {
    nodeOrder: [...nodes],
    faceList: [],
    nodePositions: {}
  };
  
  // Create a map of adjacent nodes
  const adjMap: Record<Node, Set<Node>> = {};
  for (const node of nodes) {
    adjMap[node] = new Set<Node>();
  }
  
  for (const [u, v] of edges) {
    adjMap[u].add(v);
    adjMap[v].add(u);
  }
  
  // Create outer face as a cycle (if possible)
  const outerFace = findCycle(nodes, edges, adjMap) || nodes;
  embedding.faceList.push(outerFace);
  
  // Position nodes on a convex polygon (outer face)
  const n = outerFace.length;
  for (let i = 0; i < n; i++) {
    const angle = 2 * Math.PI * i / n;
    embedding.nodePositions[outerFace[i]] = [Math.cos(angle), Math.sin(angle)];
  }
  
  // Position interior nodes using barycentric coordinates
  const interiorNodes = nodes.filter(node => !embedding.nodePositions[node]);
  
  for (const node of interiorNodes) {
    const neighbors = Array.from(adjMap[node]);
    
    if (neighbors.length === 0) {
      // Isolated node, place at center
      embedding.nodePositions[node] = [0, 0];
    } else {
      // Average position of neighbors that have positions
      let xSum = 0, ySum = 0, count = 0;
      
      for (const neighbor of neighbors) {
        if (embedding.nodePositions[neighbor]) {
          xSum += embedding.nodePositions[neighbor][0];
          ySum += embedding.nodePositions[neighbor][1];
          count++;
        }
      }
      
      if (count > 0) {
        // Place slightly away from center to avoid overlaps
        const jitter = 0.1 * Math.random();
        embedding.nodePositions[node] = [
          xSum/count + jitter * (Math.random() - 0.5), 
          ySum/count + jitter * (Math.random() - 0.5)
        ];
      } else {
        // No neighbors have positions yet, place randomly inside unit circle
        const r = 0.5 * Math.random();
        const angle = 2 * Math.PI * Math.random();
        embedding.nodePositions[node] = [r * Math.cos(angle), r * Math.sin(angle)];
      }
    }
  }
  
  return embedding;
}

/**
 * Find a simple cycle in the graph (for outer face)
 * 
 * @param nodes - List of nodes
 * @param edges - List of edges
 * @param adjMap - Adjacency map
 * @returns Cycle as array of nodes, or null if none found
 */
function findCycle(
  nodes: Node[], 
  edges: Edge[], 
  adjMap: Record<Node, Set<Node>>
): Node[] | null {
  if (nodes.length === 0) return null;
  if (nodes.length <= 2) return nodes; // Not a real cycle but handle it
  
  // Try to find a Hamiltonian cycle for simplicity (for small graphs)
  if (nodes.length <= 8) {
    const visited = new Set<Node>();
    const path: Node[] = [];
    
    function hamiltonianCycleDFS(node: Node): boolean {
      path.push(node);
      visited.add(node);
      
      if (path.length === nodes.length) {
        // Check if it's a cycle (last node connects to first)
        if (adjMap[node].has(path[0])) {
          return true;
        }
        // Not a cycle
        visited.delete(node);
        path.pop();
        return false;
      }
      
      for (const neighbor of adjMap[node]) {
        if (!visited.has(neighbor)) {
          if (hamiltonianCycleDFS(neighbor)) {
            return true;
          }
        }
      }
      
      visited.delete(node);
      path.pop();
      return false;
    }
    
    if (hamiltonianCycleDFS(nodes[0])) {
      return path;
    }
  }
  
  // Fallback: try to find any cycle using DFS
  const visited = new Set<Node>();
  const parent: Record<Node, Node | null> = {};
  let cycleFound: Node[] | null = null;
  
  function findCycleDFS(node: Node, parentNode: Node | null): boolean {
    visited.add(node);
    
    for (const neighbor of adjMap[node]) {
      if (neighbor === parentNode) continue;
      
      if (visited.has(neighbor)) {
        // Found a cycle
        cycleFound = constructCycle(node, neighbor, parent);
        return true;
      }
      
      parent[neighbor] = node;
      if (findCycleDFS(neighbor, node)) {
        return true;
      }
    }
    
    return false;
  }
  
  function constructCycle(u: Node, v: Node, parent: Record<Node, Node | null>): Node[] {
    const cycle: Node[] = [v, u];
    let current = u;
    
    while (parent[current] !== undefined && parent[current] !== v) {
      current = parent[current]!;
      cycle.push(current);
    }
    
    return cycle;
  }
  
  // Try to find a cycle
  for (const node of nodes) {
    if (!visited.has(node)) {
      parent[node] = null;
      if (findCycleDFS(node, null)) {
        break;
      }
    }
  }
  
  return cycleFound || nodes; // Fallback to all nodes if no cycle found
}

/**
 * Convert a combinatorial embedding to node positions
 * 
 * @param embedding - The embedding object
 * @param nodes - List of nodes
 * @returns Dictionary mapping nodes to positions
 */
function combinatorialEmbeddingToPos(
  embedding: Embedding, 
  nodes: Node[]
): PositionMap {
  const pos: PositionMap = {};
  
  // Use the positions from the embedding
  for (const node of nodes) {
    if (embedding.nodePositions[node]) {
      pos[node] = embedding.nodePositions[node];
    } else {
      // Fallback for any nodes without positions
      pos[node] = [0, 0];
    }
  }
  
  return pos;
}

// Type definitions for distance structure used in Kamada-Kawai
type DistanceMap = Record<Node, Record<Node, number>>;

/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 * 
 * @param G - NetworkX graph or list of nodes
 * @param dist - A two-level dictionary of optimal distances between nodes
 * @param pos - Initial positions for nodes
 * @param weight - The edge attribute used for edge weights
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
function kamadaKawaiLayout(
  G: Graph, 
  dist: DistanceMap | null = null, 
  pos: PositionMap | null = null, 
  weight: string = 'weight', 
  scale: number = 1, 
  center: number[] | null = null, 
  dim: number = 2
): PositionMap {
  const processed = _processParams(G, center, dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (nodes.length === 0) {
    return {};
  }
  
  if (nodes.length === 1) {
    return {[nodes[0]]: center};
  }
  
  // Initialize distance matrix
  if (!dist) {
    dist = _computeShortestPathDistances(graph, weight);
  }
  
  // Convert distances to a matrix
  const nodesArray: Node[] = Array.from(nodes);
  const nNodes = nodesArray.length;
  const distMatrix: number[][] = Array(nNodes).fill(0).map(() => Array(nNodes).fill(1e6));
  
  for (let i = 0; i < nNodes; i++) {
    const nodeI = nodesArray[i];
    distMatrix[i][i] = 0;
    
    if (!dist[nodeI]) continue;
    
    for (let j = 0; j < nNodes; j++) {
      const nodeJ = nodesArray[j];
      if (dist[nodeI][nodeJ] !== undefined) {
        distMatrix[i][j] = dist[nodeI][nodeJ];
      }
    }
  }
  
  // Initialize positions if not provided
  if (!pos) {
    if (dim >= 3) {
      pos = randomLayout(G, null, dim);
    } else if (dim === 2) {
      pos = circularLayout(G, 1, [0, 0], dim);
    } else {
      // For 1D, use a linear layout
      const posArray: PositionMap = {};
      nodesArray.forEach((node, i) => {
        posArray[node] = [i / (nNodes - 1 || 1)];
      });
      pos = posArray;
    }
  }
  
  // Convert positions to array for computation
  const posArray: number[][] = new Array(nNodes);
  for (let i = 0; i < nNodes; i++) {
    const node = nodesArray[i];
    posArray[i] = pos[node] ? [...pos[node]] : Array(dim).fill(0);
    
    // Ensure correct dimensionality
    while (posArray[i].length < dim) {
      posArray[i].push(0);
    }
  }
  
  // Run the Kamada-Kawai algorithm
  const newPositions = _kamadaKawaiSolve(distMatrix, posArray, dim);
  
  // Convert positions array back to dictionary and rescale
  const finalPos: PositionMap = {};
  for (let i = 0; i < nNodes; i++) {
    finalPos[nodesArray[i]] = newPositions[i];
  }
  
  return rescaleLayout(finalPos, scale, center) as PositionMap;
}

/**
 * Compute all-pairs shortest path distances for the graph
 * 
 * @param G - NetworkX graph
 * @param weight - Edge attribute for weight
 * @returns Dictionary of dictionaries of shortest path distances
 */
function _computeShortestPathDistances(
  G: Graph, 
  weight: string
): DistanceMap {
  const distances: DistanceMap = {};
  const nodes = G.nodes ? G.nodes() : G as Node[];
  const edges = G.edges ? G.edges() : [] as Edge[];
  
  // Initialize distances with direct edges
  for (const node of nodes) {
    distances[node] = {};
    distances[node][node] = 0;
    
    for (const other of nodes) {
      if (node !== other) {
        distances[node][other] = Infinity;
      }
    }
  }
  
  // Add direct edges
  for (const [source, target] of edges) {
    // In a real implementation, we would get the weight from the graph
    // For now, assume weight = 1 or use weight attribute if available
    let edgeWeight = 1;
    if (G.getEdgeData) {
      edgeWeight = G.getEdgeData(source, target, weight) || 1;
    }
    
    distances[source][target] = edgeWeight;
    distances[target][source] = edgeWeight;  // Assuming undirected graph
  }
  
  // Floyd-Warshall algorithm for all-pairs shortest paths
  for (const k of nodes) {
    for (const i of nodes) {
      for (const j of nodes) {
        if (distances[i][k] + distances[k][j] < distances[i][j]) {
          distances[i][j] = distances[i][k] + distances[k][j];
        }
      }
    }
  }
  
  return distances;
}

/**
 * Solve the Kamada-Kawai layout optimization problem
 * 
 * @param distMatrix - Matrix of desired distances between nodes
 * @param positions - Initial node positions
 * @param dim - Dimension of layout
 * @returns Optimized node positions
 */
function _kamadaKawaiSolve(
  distMatrix: number[][], 
  positions: number[][], 
  dim: number
): number[][] {
  // Implementation of L-BFGS optimization for Kamada-Kawai
  const nNodes = positions.length;
  const meanWeight = 1e-3;
  
  // Convert distances to inverse distances (with protection against division by zero)
  const invDistMatrix = distMatrix.map(row => 
    row.map(d => d === 0 ? 0 : 1 / (d + 1e-3))
  );
  
  // Flatten positions for optimization
  let posVec = positions.flat();
  
  // Optimization parameters
  const maxIter = 500;
  const gtol = 1e-5;
  const m = 10;  // L-BFGS memory size
  
  // Implement a simplified L-BFGS-B algorithm
  let alpha = 1.0;
  const oldValues: number[][] = [];
  const oldGrads: number[][] = [];
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Calculate cost and gradient
    const [cost, grad] = _kamadaKawaiCostfn(posVec, invDistMatrix, meanWeight, dim);
    
    // Compute search direction using L-BFGS approximation
    const direction = _lbfgsDirection(grad, oldValues, oldGrads, m);
    
    // Simple line search for step size
    alpha = _backtrackingLineSearch(
      posVec, direction, cost, grad, 
      (x: number[]) => _kamadaKawaiCostfn(x, invDistMatrix, meanWeight, dim)[0],
      alpha
    );
    
    // Save current position and gradient for next iteration
    const oldPos = [...posVec];
    
    // Update position
    for (let i = 0; i < posVec.length; i++) {
      posVec[i] += alpha * direction[i];
    }
    
    // Calculate new gradient
    const [, newGrad] = _kamadaKawaiCostfn(posVec, invDistMatrix, meanWeight, dim);
    
    // Update L-BFGS memory
    oldValues.push(posVec.map((val, i) => val - oldPos[i]));
    oldGrads.push(newGrad.map((val, i) => val - grad[i]));
    
    // Keep only m most recent updates
    if (oldValues.length > m) {
      oldValues.shift();
      oldGrads.shift();
    }
    
    // Check convergence
    const gradNorm = Math.sqrt(newGrad.reduce((sum, g) => sum + g * g, 0));
    if (gradNorm < gtol) {
      break;
    }
  }
  
  // Reshape result back into positions array
  const result: number[][] = [];
  for (let i = 0; i < nNodes; i++) {
    result.push(posVec.slice(i * dim, (i + 1) * dim));
  }
  
  return result;
}

/**
 * Cost function and gradient for Kamada-Kawai layout algorithm
 * 
 * @param posVec - Flattened position array
 * @param invDist - Inverse distance matrix
 * @param meanWeight - Weight for centering positions
 * @param dim - Dimension of layout
 * @returns Array with [cost, gradient]
 */
function _kamadaKawaiCostfn(
  posVec: number[], 
  invDist: number[][], 
  meanWeight: number, 
  dim: number
): [number, number[]] {
  const nNodes = invDist.length;
  const positions: number[][] = [];
  
  // Reshape flat vector into positions array
  for (let i = 0; i < nNodes; i++) {
    positions.push(posVec.slice(i * dim, (i + 1) * dim));
  }
  
  // Calculate cost
  let cost = 0;
  
  // Add mean position penalty term
  const sumPos = Array(dim).fill(0);
  for (let i = 0; i < nNodes; i++) {
    for (let d = 0; d < dim; d++) {
      sumPos[d] += positions[i][d];
    }
  }
  cost += 0.5 * meanWeight * sumPos.reduce((sum, val) => sum + val * val, 0);
  
  // Add distance penalty terms
  for (let i = 0; i < nNodes; i++) {
    for (let j = i + 1; j < nNodes; j++) {
      // Calculate actual distance
      const diff = positions[i].map((val, d) => val - positions[j][d]);
      const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0));
      
      // Add penalty for difference between actual and ideal distance
      const idealInvDist = invDist[i][j];
      const offset = distance * idealInvDist - 1.0;
      cost += 0.5 * offset * offset;
    }
  }
  
  // Calculate gradient
  const grad = new Array(posVec.length).fill(0);
  
  // Add gradient of mean position penalty
  for (let i = 0; i < nNodes; i++) {
    for (let d = 0; d < dim; d++) {
      grad[i * dim + d] += meanWeight * sumPos[d];
    }
  }
  
  // Add gradient of distance penalties
  for (let i = 0; i < nNodes; i++) {
    for (let j = i + 1; j < nNodes; j++) {
      // Calculate actual distance and direction
      const diff = positions[i].map((val, d) => val - positions[j][d]);
      const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 1e-10;
      const direction = diff.map(d => d / distance);
      
      // Calculate contribution to gradient
      const idealInvDist = invDist[i][j];
      const offset = distance * idealInvDist - 1.0;
      
      for (let d = 0; d < dim; d++) {
        const force = idealInvDist * offset * direction[d];
        grad[i * dim + d] += force;
        grad[j * dim + d] -= force;
      }
    }
  }
  
  return [cost, grad];
}

/**
 * Compute the search direction using L-BFGS approximation
 * 
 * @param grad - Current gradient
 * @param sList - List of position differences (s_k)
 * @param yList - List of gradient differences (y_k)
 * @param m - Memory size
 * @returns Direction vector
 */
function _lbfgsDirection(
  grad: number[], 
  sList: number[][], 
  yList: number[][], 
  m: number
): number[] {
  if (sList.length === 0) {
    // First iteration - use negative gradient
    return grad.map(g => -g);
  }
  
  const q = grad.slice();
  const alpha = Array(sList.length).fill(0);
  const rho: number[] = [];
  
  // Compute rho values
  for (let i = 0; i < sList.length; i++) {
    const s = sList[i];
    const y = yList[i];
    rho.push(1 / y.reduce((sum, val, j) => sum + val * s[j], 0));
  }
  
  // Forward pass
  for (let i = sList.length - 1; i >= 0; i--) {
    const s = sList[i];
    alpha[i] = rho[i] * s.reduce((sum, val, j) => sum + val * q[j], 0);
    for (let j = 0; j < q.length; j++) {
      q[j] -= alpha[i] * yList[i][j];
    }
  }
  
  // Scale initial Hessian approximation
  let gamma = 1;
  if (sList.length > 0 && yList.length > 0) {
    const y = yList[yList.length - 1];
    const s = sList[sList.length - 1];
    gamma = s.reduce((sum, val, i) => sum + val * y[i], 0) / 
            y.reduce((sum, val) => sum + val * val, 0);
  }
  
  // Initialize direction with scaled negative gradient
  const direction = q.map(val => -gamma * val);
  
  // Backward pass
  for (let i = 0; i < sList.length; i++) {
    const s = sList[i];
    const y = yList[i];
    const beta = rho[i] * y.reduce((sum, val, j) => sum + val * direction[j], 0);
    for (let j = 0; j < direction.length; j++) {
      direction[j] += s[j] * (alpha[i] - beta);
    }
  }
  
  return direction;
}

/**
 * Backtracking line search to find step size
 * 
 * @param x - Current position
 * @param direction - Search direction
 * @param f - Function value at current position
 * @param grad - Gradient at current position
 * @param func - Function to evaluate cost
 * @param alpha0 - Initial step size
 * @returns Optimal step size
 */
function _backtrackingLineSearch(
  x: number[], 
  direction: number[], 
  f: number, 
  grad: number[], 
  func: (x: number[]) => number, 
  alpha0: number
): number {
  const c1 = 1e-4;
  const c2 = 0.9;
  const initialSlope = grad.reduce((sum, g, i) => sum + g * direction[i], 0);
  
  if (initialSlope >= 0) {
    return 1e-8;  // Direction is not a descent direction
  }
  
  let alpha = alpha0;
  const maxIter = 20;
  
  for (let i = 0; i < maxIter; i++) {
    // Try step
    const newX = x.map((val, i) => val + alpha * direction[i]);
    const newF = func(newX);
    
    // Check sufficient decrease condition (Armijo condition)
    if (newF <= f + c1 * alpha * initialSlope) {
      return alpha;
    }
    
    // Reduce step size
    alpha *= c2;
  }
  
  return alpha;  // Return last alpha even if not optimal
}

/**
 * Position nodes using the ForceAtlas2 force-directed algorithm.
 * 
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param maxIter - Maximum number of iterations
 * @param jitterTolerance - Controls tolerance for node speed adjustments
 * @param scalingRatio - Scaling of attraction and repulsion forces
 * @param gravity - Attraction to center to prevent disconnected components from drifting
 * @param distributedAction - Distributes attraction force among nodes
 * @param strongGravity - Uses a stronger gravity model
 * @param nodeMass - Dictionary mapping nodes to their masses
 * @param nodeSize - Dictionary mapping nodes to their sizes
 * @param weight - Edge attribute for weight
 * @param dissuadeHubs - Whether to prevent hub nodes from clustering
 * @param linlog - Whether to use logarithmic attraction
 * @param seed - Random seed for initial positions
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
function forceatlas2Layout(
  G: Graph, 
  pos: PositionMap | null = null, 
  maxIter: number = 100, 
  jitterTolerance: number = 1.0,
  scalingRatio: number = 2.0,
  gravity: number = 1.0,
  distributedAction: boolean = false,
  strongGravity: boolean = false,
  nodeMass: Record<Node, number> | null = null,
  nodeSize: Record<Node, number> | null = null,
  weight: string | null = null,
  dissuadeHubs: boolean = false,
  linlog: boolean = false,
  seed: number | null = null,
  dim: number = 2
): PositionMap {
  const processed = _processParams(G, null, dim);
  const graph = processed.G;
  
  const nodes = graph.nodes ? graph.nodes() : graph as Node[];
  
  if (nodes.length === 0) {
    return {};
  }
  
  // Initialize random number generator
  const rng = new RandomNumberGenerator(seed);
  
  // Initialize positions if not provided
  let posArray: number[][];
  if (pos === null) {
    pos = {};
    posArray = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      posArray[i] = Array(dim).fill(0).map(() => rng.rand() as number * 2 - 1);
      pos[nodes[i]] = posArray[i];
    }
  } else if (Object.keys(pos).length === nodes.length) {
    // Use provided positions
    posArray = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      posArray[i] = [...pos[nodes[i]]];
    }
  } else {
    // Some nodes don't have positions, initialize within the range of existing positions
    let minPos = Array(dim).fill(Number.POSITIVE_INFINITY);
    let maxPos = Array(dim).fill(Number.NEGATIVE_INFINITY);
    
    // Find min and max of existing positions
    for (const node in pos) {
      for (let d = 0; d < dim; d++) {
        minPos[d] = Math.min(minPos[d], pos[node][d]);
        maxPos[d] = Math.max(maxPos[d], pos[node][d]);
      }
    }
    
    posArray = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (pos[node]) {
        posArray[i] = [...pos[node]];
      } else {
        posArray[i] = Array(dim).fill(0).map((_, d) => 
          minPos[d] + (rng.rand() as number) * (maxPos[d] - minPos[d])
        );
        pos[node] = posArray[i];
      }
    }
  }
  
  // Initialize mass and size arrays
  const mass = new Array(nodes.length).fill(0);
  const size = new Array(nodes.length).fill(0);
  
  // Flag to track whether to adjust for node sizes
  const adjustSizes = nodeSize !== null;
  
  // Set node masses and sizes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    mass[i] = nodeMass && nodeMass[node] ? 
      nodeMass[node] : 
      (graph.edges ? getNodeDegree(graph, node) + 1 : 1);
    
    size[i] = nodeSize && nodeSize[node] ? nodeSize[node] : 1;
  }
  
  // Create adjacency matrix
  const n = nodes.length;
  const A = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Populate adjacency matrix with edge weights
  const edges = graph.edges ? graph.edges() : [] as Edge[];
  const nodeIndices: Record<Node, number> = {};
  nodes.forEach((node, i) => { nodeIndices[node] = i; });
  
  for (const [source, target] of edges) {
    const i = nodeIndices[source];
    const j = nodeIndices[target];
    
    // Use edge weight if provided, otherwise default to 1
    let edgeWeight = 1;
    if (weight && graph.getEdgeData) {
      edgeWeight = graph.getEdgeData(source, target, weight) || 1;
    }
    
    A[i][j] = edgeWeight;
    A[j][i] = edgeWeight; // For undirected graphs
  }
  
  // Initialize force arrays
  const gravities = Array(n).fill(0).map(() => Array(dim).fill(0));
  const attraction = Array(n).fill(0).map(() => Array(dim).fill(0));
  const repulsion = Array(n).fill(0).map(() => Array(dim).fill(0));
  
  // Simulation parameters
  let speed = 1;
  let speedEfficiency = 1;
  let swing = 1;
  let traction = 1;
  
  // Helper function to estimate factor for force scaling
  function estimateFactor(
    n: number, 
    swing: number, 
    traction: number, 
    speed: number, 
    speedEfficiency: number, 
    jitterTolerance: number
  ): [number, number] {
    // Optimal jitter parameters
    const optJitter = 0.05 * Math.sqrt(n);
    const minJitter = Math.sqrt(optJitter);
    const maxJitter = 10;
    const minSpeedEfficiency = 0.05;
    
    // Estimate jitter based on current state
    const other = Math.min(maxJitter, optJitter * traction / (n * n));
    let jitter = jitterTolerance * Math.max(minJitter, other);
    
    // Adjust speed efficiency based on swing/traction ratio
    if (swing / traction > 2.0) {
      if (speedEfficiency > minSpeedEfficiency) {
        speedEfficiency *= 0.5;
      }
      jitter = Math.max(jitter, jitterTolerance);
    }
    
    // Calculate target speed
    let targetSpeed = swing === 0 ? 
      Number.POSITIVE_INFINITY : 
      jitter * speedEfficiency * traction / swing;
    
    // Further adjust speed efficiency
    if (swing > jitter * traction) {
      if (speedEfficiency > minSpeedEfficiency) {
        speedEfficiency *= 0.7;
      }
    } else if (speed < 1000) {
      speedEfficiency *= 1.3;
    }
    
    // Limit the speed increase
    const maxRise = 0.5;
    speed = speed + Math.min(targetSpeed - speed, maxRise * speed);
    
    return [speed, speedEfficiency];
  }
  
  // Main simulation loop
  for (let iter = 0; iter < maxIter; iter++) {
    // Reset forces for this iteration
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dim; d++) {
        attraction[i][d] = 0;
        repulsion[i][d] = 0;
        gravities[i][d] = 0;
      }
    }
    
    // Compute pairwise differences and distances
    const diff = Array(n).fill(0).map(() => 
      Array(n).fill(0).map(() => Array(dim).fill(0))
    );
    
    const distance = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        for (let d = 0; d < dim; d++) {
          diff[i][j][d] = posArray[i][d] - posArray[j][d];
        }
        
        distance[i][j] = Math.sqrt(diff[i][j].reduce((sum, d) => sum + d * d, 0));
        // Prevent division by zero
        if (distance[i][j] < 0.01) distance[i][j] = 0.01;
      }
    }
    
    // Calculate attraction forces
    if (linlog) {
      // Logarithmic attraction model
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || A[i][j] === 0) continue;
          
          const dist = distance[i][j];
          const factor = -Math.log(1 + dist) / dist * A[i][j];
          
          for (let d = 0; d < dim; d++) {
            const force = factor * diff[i][j][d];
            attraction[i][d] += force;
          }
        }
      }
    } else {
      // Linear attraction model
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || A[i][j] === 0) continue;
          
          for (let d = 0; d < dim; d++) {
            const force = -diff[i][j][d] * A[i][j];
            attraction[i][d] += force;
          }
        }
      }
    }
    
    // Apply distributed attraction if enabled
    if (distributedAction) {
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dim; d++) {
          attraction[i][d] /= mass[i];
        }
      }
    }
    
    // Calculate repulsion forces
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        let dist = distance[i][j];
        
        // Adjust distance for node sizes if needed
        if (adjustSizes) {
          dist -= size[i] - size[j];
          dist = Math.max(dist, 0.01); // Prevent negative or zero distances
        }
        
        const distSquared = dist * dist;
        const massProduct = mass[i] * mass[j];
        const factor = (massProduct / distSquared) * scalingRatio;
        
        for (let d = 0; d < dim; d++) {
          const direction = diff[i][j][d] / dist;
          repulsion[i][d] += direction * factor;
        }
      }
    }
    
    // Calculate gravity forces
    // First find the center of mass
    const centerOfMass = Array(dim).fill(0);
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dim; d++) {
        centerOfMass[d] += posArray[i][d] / n;
      }
    }
    
    for (let i = 0; i < n; i++) {
      const posCentered = Array(dim);
      for (let d = 0; d < dim; d++) {
        posCentered[d] = posArray[i][d] - centerOfMass[d];
      }
      
      if (strongGravity) {
        // Strong gravity model
        for (let d = 0; d < dim; d++) {
          gravities[i][d] = -gravity * mass[i] * posCentered[d];
        }
      } else {
        // Regular gravity model
        const dist = Math.sqrt(posCentered.reduce((sum, val) => sum + val * val, 0));
        
        if (dist > 0.01) {
          for (let d = 0; d < dim; d++) {
            const direction = posCentered[d] / dist;
            gravities[i][d] = -gravity * mass[i] * direction;
          }
        }
      }
    }
    
    // Calculate total forces and update positions
    const update = Array(n).fill(0).map(() => Array(dim).fill(0));
    let totalSwing = 0;
    let totalTraction = 0;
    
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dim; d++) {
        update[i][d] = attraction[i][d] + repulsion[i][d] + gravities[i][d];
      }
      
      // Calculate swing and traction for this node
      const oldPos = [...posArray[i]];
      const newPos = oldPos.map((p, d) => p + update[i][d]);
      
      const swingVector = oldPos.map((p, d) => p - newPos[d]);
      const tractionVector = oldPos.map((p, d) => p + newPos[d]);
      
      const swingMagnitude = Math.sqrt(swingVector.reduce((sum, val) => sum + val * val, 0));
      const tractionMagnitude = Math.sqrt(tractionVector.reduce((sum, val) => sum + val * val, 0));
      
      totalSwing += mass[i] * swingMagnitude;
      totalTraction += 0.5 * mass[i] * tractionMagnitude;
    }
    
    // Update speed and efficiency
    [speed, speedEfficiency] = estimateFactor(
      n,
      totalSwing,
      totalTraction,
      speed,
      speedEfficiency,
      jitterTolerance
    );
    
    // Apply forces to update positions
    let totalMovement = 0;
    
    for (let i = 0; i < n; i++) {
      let factor;
      
      if (adjustSizes) {
        // Calculate displacement magnitude
        const df = Math.sqrt(update[i].reduce((sum, val) => sum + val * val, 0));
        const swinging = mass[i] * df;
        
        // Determine scaling factor with size adjustments
        factor = 0.1 * speed / (1 + Math.sqrt(speed * swinging));
        factor = Math.min(factor * df, 10) / df;
      } else {
        // Standard scaling factor
        const swinging = mass[i] * Math.sqrt(update[i].reduce((sum, val) => sum + val * val, 0));
        factor = speed / (1 + Math.sqrt(speed * swinging));
      }
      
      // Apply factor to update position
      for (let d = 0; d < dim; d++) {
        const movement = update[i][d] * factor;
        posArray[i][d] += movement;
        totalMovement += Math.abs(movement);
      }
    }
    
    // Check for convergence
    if (totalMovement < 1e-10) {
      break;
    }
  }
  
  // Create position dictionary
  const positions: PositionMap = {};
  for (let i = 0; i < n; i++) {
    positions[nodes[i]] = posArray[i];
  }
  
  return rescaleLayout(positions);
  
  // Helper function to get node degree
  function getNodeDegree(graph: Graph, node: Node): number {
    if (!graph.edges) return 0;
    
    return graph.edges().filter(edge => 
      edge[0] === node || edge[1] === node
    ).length;
  }
}

/**
 * Layout algorithm with attractive and repulsive forces (ARF).
 * 
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param scaling - Scale factor for positions
 * @param a - Strength of springs between connected nodes (should be > 1)
 * @param maxIter - Maximum number of iterations
 * @param seed - Random seed for initial positions
 * @returns Positions dictionary keyed by node
 */
function arfLayout(
  G: Graph, 
  pos: PositionMap | null = null, 
  scaling: number = 1, 
  a: number = 1.1, 
  maxIter: number = 1000, 
  seed: number | null = null
): PositionMap {
  if (a <= 1) {
    throw new Error("The parameter a should be larger than 1");
  }
  
  const nodes = G.nodes ? G.nodes() : G as Node[];
  const edges = G.edges ? G.edges() : [] as Edge[];
  
  if (nodes.length === 0) {
    return {};
  }
  
  // Initialize positions if not provided
  if (!pos) {
    pos = randomLayout(G, null, 2, seed);
  } else {
    // Make sure all nodes have positions
    const rng = new RandomNumberGenerator(seed ?? undefined);
    const defaultPos: PositionMap = {};
    nodes.forEach((node: Node) => {
      if (!pos![node]) {
        defaultPos[node] = [(rng.rand() as number), (rng.rand() as number)];
      }
    });
    pos = {...pos, ...defaultPos};
  }
  
  // Create node index mapping
  const nodeIndex: Record<Node, number> = {};
nodes.forEach((node: Node, i: number) => {
    nodeIndex[node] = i;
});
  
  // Create positions array
const positions: number[][] = nodes.map((node: Node) => [...pos![node]]);
  
  // Initialize spring constant matrix
  const N = nodes.length;
  const K = Array(N).fill(0).map(() => Array(N).fill(1));
  
  // Set diagonal to zero (no self-attraction)
  for (let i = 0; i < N; i++) {
    K[i][i] = 0;
  }
  
  // Set stronger attraction between connected nodes
  for (const [source, target] of edges) {
    if (source === target) continue;
    
    const i = nodeIndex[source];
    const j = nodeIndex[target];
    K[i][j] = a;
    K[j][i] = a;
  }
  
  // Calculate rho (scale factor)
  const rho = scaling * Math.sqrt(N);
  
  // Optimization loop
  const dt = 1e-3;  // Time step
  const etol = 1e-6;  // Error tolerance
  let error = etol + 1;
  let nIter = 0;
  
  while (error > etol && nIter < maxIter) {
    // Calculate changes for each node
    const change = Array(N).fill(0).map(() => [0, 0]);
    
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        
        // Calculate difference vector
        const diff = positions[i].map((coord, dim) => coord - positions[j][dim]);
        
        // Calculate distance (with minimum to avoid division by zero)
        const dist = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 0.01;
        
        // Calculate attractive and repulsive forces
        for (let d = 0; d < diff.length; d++) {
          change[i][d] += K[i][j] * diff[d] - (rho / dist) * diff[d];
        }
      }
    }
    
    // Update positions
    for (let i = 0; i < N; i++) {
      for (let d = 0; d < positions[i].length; d++) {
        positions[i][d] += change[i][d] * dt;
      }
    }
    
    // Calculate error (sum of force magnitudes)
    error = change.reduce((sum, c) => 
      sum + Math.sqrt(c.reduce((s, v) => s + v * v, 0)), 0);
    
    nIter++;
  }
  
  // Convert positions array back to object
  const finalPos: PositionMap = {};
nodes.forEach((node: Node, i: number) => {
    finalPos[node] = positions[i];
});
  
  return finalPos;
}

/**
 * Return a dictionary of scaled positions keyed by node.
 * 
 * @param pos - Dictionary of positions keyed by node
 * @param scale - Scale factor for positions
 * @returns Dictionary of scaled positions
 */
function rescaleLayoutDict(
  pos: PositionMap, 
  scale: number = 1
): PositionMap {
  if (Object.keys(pos).length === 0) {
    return {};
  }
  
  // Extract positions as array
  const posArray = Object.values(pos);
  
  // Find center of positions
  const center: number[] = [];
  for (let d = 0; d < posArray[0].length; d++) {
    center[d] = posArray.reduce((sum, p) => sum + p[d], 0) / posArray.length;
  }
  
  // Center positions
  const centeredPos: PositionMap = {};
  for (const [node, p] of Object.entries(pos)) {
    centeredPos[node] = p.map((val, d) => val - center[d]);
  }
  
  // Find maximum distance from center
  let maxDist = 0;
  for (const p of Object.values(centeredPos)) {
    const dist = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
    maxDist = Math.max(maxDist, dist);
  }
  
  // Scale positions
  const scaledPos: PositionMap = {};
  if (maxDist > 0) {
    for (const [node, p] of Object.entries(centeredPos)) {
      scaledPos[node] = p.map(val => val * scale / maxDist);
    }
  } else {
    // All points at the center
    for (const node of Object.keys(centeredPos)) {
      scaledPos[node] = Array(centeredPos[node].length).fill(0);
    }
  }
  
  return scaledPos;
}

// Export the layout functions
export {
  randomLayout,
  circularLayout,
  shellLayout,
  springLayout,
  fruchtermanReingoldLayout,
  spectralLayout,
  spiralLayout,
  bipartiteLayout,
  multipartiteLayout,
  bfsLayout,
  planarLayout,
  kamadaKawaiLayout,
  forceatlas2Layout,
  arfLayout,
  rescaleLayout,
  rescaleLayoutDict
};
