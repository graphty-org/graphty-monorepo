/**
 * Layout
 * ======
 * 
 * Node positioning algorithms for graph drawing in JavaScript.
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

// Utility array manipulation functions (NumPy-like)
const np = {
  zeros: function(shape) {
    if (typeof shape === 'number') {
      return Array(shape).fill(0);
    }
    if (shape.length === 1) {
      return Array(shape[0]).fill(0);
    }
    return Array(shape[0]).fill().map(() => this.zeros(shape.slice(1)));
  },
  
  ones: function(shape) {
    if (typeof shape === 'number') {
      return Array(shape).fill(1);
    }
    if (shape.length === 1) {
      return Array(shape[0]).fill(1);
    }
    return Array(shape[0]).fill().map(() => this.ones(shape.slice(1)));
  },
  
  linspace: function(start, stop, num) {
    const step = (stop - start) / (num - 1);
    return Array.from({length: num}, (_, i) => start + i * step);
  },
  
  array: function(arr) {
    return Array.isArray(arr) ? [...arr] : [arr];
  },
  
  repeat: function(a, repeats) {
    const result = [];
    for (let i = 0; i < repeats; i++) {
      result.push(...np.array(a));
    }
    return result;
  },
  
  mean: function(arr, axis = null) {
    if (axis === null) {
      const sum = arr.flat(Infinity).reduce((a, b) => a + b, 0);
      return sum / arr.flat(Infinity).length;
    }
    
    if (axis === 0) {
      const result = [];
      for (let i = 0; i < arr[0].length; i++) {
        let sum = 0;
        for (let j = 0; j < arr.length; j++) {
          sum += arr[j][i];
        }
        result.push(sum / arr.length);
      }
      return result;
    }
    
    return arr.map(row => np.mean(row));
  },
  
  add: function(a, b) {
    if (!Array.isArray(a) && !Array.isArray(b)) {
      return a + b;
    }
    if (!Array.isArray(a)) {
      return b.map(val => a + val);
    }
    if (!Array.isArray(b)) {
      return a.map(val => val + b);
    }
    return a.map((val, i) => val + b[i]);
  },
  
  subtract: function(a, b) {
    if (!Array.isArray(a) && !Array.isArray(b)) {
      return a - b;
    }
    if (!Array.isArray(a)) {
      return b.map(val => a - val);
    }
    if (!Array.isArray(b)) {
      return a.map(val => val - b);
    }
    return a.map((val, i) => val - b[i]);
  },
  
  max: function(arr) {
    if (!Array.isArray(arr)) return arr;
    return Math.max(...arr.flat(Infinity));
  },
  
  min: function(arr) {
    if (!Array.isArray(arr)) return arr;
    return Math.min(...arr.flat(Infinity));
  },
  
  norm: function(arr) {
    return Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
  }
};

// Random number generator (for seed-based randomization)
class RandomNumberGenerator {
  constructor(seed) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.m = 2**35 - 31;
    this.a = 185852;
    this.c = 1;
    this._state = this.seed % this.m;
  }
  
  _next() {
    this._state = (this.a * this._state + this.c) % this.m;
    return this._state / this.m;
  }
  
  rand(shape = null) {
    if (shape === null) {
      return this._next();
    }
    
    if (typeof shape === 'number') {
      const result = [];
      for (let i = 0; i < shape; i++) {
        result.push(this._next());
      }
      return result;
    }
    
    if (shape.length === 1) {
      const result = [];
      for (let i = 0; i < shape[0]; i++) {
        result.push(this._next());
      }
      return result;
    }
    
    const result = [];
    for (let i = 0; i < shape[0]; i++) {
      result.push(this.rand(shape.slice(1)));
    }
    return result;
  }
}

// Helper function similar to _process_params in Python version
function _processParams(G, center, dim) {
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
 * @param {Object} G - Graph or list of nodes
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number|null} seed - Random seed for reproducible layouts
 * @returns {Object} Positions dictionary keyed by node
 */
function randomLayout(G, center = null, dim = 2, seed = null) {
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G;
  center = processed.center;
  
  const rng = new RandomNumberGenerator(seed);
  const pos = {};
  
  nodes.forEach(node => {
    pos[node] = rng.rand(dim).map((val, i) => val + center[i]);
  });
  
  return pos;
}

/**
 * Position nodes on a circle.
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout (currently only supports dim=2)
 * @returns {Object} Positions dictionary keyed by node
 */
function circularLayout(G, scale = 1, center = null, dim = 2) {
  if (dim < 2) {
    throw new Error("cannot handle dimensions < 2");
  }
  
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G;
  center = processed.center;
  
  const pos = {};
  
  if (nodes.length === 0) {
    return pos;
  }
  
  if (nodes.length === 1) {
    pos[nodes[0]] = center;
    return pos;
  }
  
  // Calculate positions on a circle
  const theta = np.linspace(0, 2 * Math.PI, nodes.length + 1).slice(0, -1);
  
  nodes.forEach((node, i) => {
    const x = Math.cos(theta[i]) * scale + center[0];
    const y = Math.sin(theta[i]) * scale + center[1];
    pos[node] = Array(dim).fill(0).map((_, j) => j === 0 ? x : j === 1 ? y : 0);
  });
  
  return pos;
}

/**
 * Position nodes in concentric circles.
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {Array|null} nlist - List of node lists for each shell
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout (currently only supports dim=2)
 * @returns {Object} Positions dictionary keyed by node
 */
function shellLayout(G, nlist = null, scale = 1, center = null, dim = 2) {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G;
  center = processed.center;
  
  const pos = {};
  
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
  let radius;
  
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
    
    shell.forEach((node, j) => {
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
function springLayout(G, k = null, pos = null, fixed = null, iterations = 50, 
                     scale = 1, center = null, dim = 2, seed = null) {
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
function fruchtermanReingoldLayout(G, k = null, pos = null, fixed = null, iterations = 50, 
                                  scale = 1, center = null, dim = 2, seed = null) {
  const processed = _processParams(G, center, dim);
  let graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph;
  const edges = graph.edges ? graph.edges() : [];
  
  if (nodes.length === 0) {
    return {};
  }
  
  if (nodes.length === 1) {
    const singlePos = {};
    singlePos[nodes[0]] = center;
    return singlePos;
  }
  
  // Set up initial positions
  let positions = {};
  if (pos) {
    // Use provided positions
    for (const node of nodes) {
      if (pos[node]) {
        positions[node] = [...pos[node]];
      } else {
        const rng = new RandomNumberGenerator(seed);
        positions[node] = rng.rand(dim);
      }
    }
  } else {
    // Random initial positions
    const rng = new RandomNumberGenerator(seed);
    for (const node of nodes) {
      positions[node] = rng.rand(dim);
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
    const displacement = {};
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
    positions = rescaleLayout(positions, scale, center);
  }
  
  return positions;
}

/**
 * Position nodes in a spectral layout using eigenvectors of the graph Laplacian.
 * 
 * @param {Object} G - Graph
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @returns {Object} Positions dictionary keyed by node
 */
function spectralLayout(G, scale = 1, center = null, dim = 2) {
  const processed = _processParams(G, center, dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph;
  
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
  const nodeIndices = {};
  nodes.forEach((node, i) => { nodeIndices[node] = i; });
  
  const A = Array(N).fill().map(() => Array(N).fill(0));
  const edges = graph.edges ? graph.edges() : [];
  
  for (const [source, target] of edges) {
    const i = nodeIndices[source];
    const j = nodeIndices[target];
    A[i][j] = 1;
    A[j][i] = 1; // Make symmetric for undirected graphs
  }
  
  // Create Laplacian matrix: L = D - A where D is degree matrix
  const L = Array(N).fill().map(() => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    // Compute degree (sum of row)
    L[i][i] = A[i].reduce((sum, val) => sum + val, 0);
    for (let j = 0; j < N; j++) {
      L[i][j] -= A[i][j];
    }
  }
  
  // Compute eigenvectors using power iteration method
  // We need the smallest non-zero eigenvectors of L
  const eigenvectors = [];
  
  // For each dimension, find an eigenvector
  for (let d = 0; d < dim; d++) {
    let vector = Array(N).fill().map(() => Math.random() - 0.5);
    
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
  const positions = Array(N).fill().map(() => Array(dim).fill(0));
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < dim; d++) {
      positions[i][d] = eigenvectors[d][i];
    }
  }
  
  // Rescale and create position dictionary
  const scaledPositions = rescaleLayout(positions, scale);
  const pos = {};
  nodes.forEach((node, i) => {
    pos[node] = scaledPositions[i].map((val, j) => val + center[j]);
  });
  
  return pos;
}

/**
 * Position nodes in a spiral layout.
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} resolution - Controls the spacing between spiral elements
 * @returns {Object} Positions dictionary keyed by node
 */
function spiralLayout(G, scale = 1, center = null, dim = 2, resolution = 0.35) {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center, dim);
  const nodes = processed.G.nodes ? processed.G.nodes() : processed.G;
  center = processed.center;
  
  const pos = {};
  
  if (nodes.length === 0) {
    return pos;
  }
  
  if (nodes.length === 1) {
    pos[nodes[0]] = [...center];
    return pos;
  }
  
  // Calculate positions along a spiral
  const theta = resolution * np.linspace(0, nodes.length - 1, nodes.length);
  const distances = np.linspace(0, scale, nodes.length);
  
  nodes.forEach((node, i) => {
    const x = Math.cos(theta[i]) * distances[i] + center[0];
    const y = Math.sin(theta[i]) * distances[i] + center[1];
    pos[node] = [x, y];
  });
  
  return rescaleLayout(pos, scale, center);
}

/**
 * Rescale node positions to fit in the specified scale and center.
 * 
 * @param {Object} pos - Dictionary of positions keyed by node
 * @param {number} scale - Scale factor for positions
 * @param {Array} center - Coordinate pair around which to center the layout
 * @returns {Object} Rescaled positions dictionary
 */
function rescaleLayout(pos, scale = 1, center = [0, 0]) {
  if (Object.keys(pos).length === 0) {
    return {};
  }
  
  // Extract position values
  const posValues = Object.values(pos);
  const dim = posValues[0].length;
  
  // Calculate center of positions
  const posCenter = Array(dim).fill(0);
  for (const p of posValues) {
    for (let i = 0; i < dim; i++) {
      posCenter[i] += p[i] / posValues.length;
    }
  }
  
  // Center positions
  const centeredPos = {};
  for (const [node, p] of Object.entries(pos)) {
    centeredPos[node] = p.map((val, i) => val - posCenter[i]);
  }
  
  // Find maximum distance from center
  let maxDistance = 0;
  for (const p of Object.values(centeredPos)) {
    const distance = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
    maxDistance = Math.max(maxDistance, distance);
  }
  
  // Rescale
  const scaledPos = {};
  if (maxDistance > 0) {
    const scaleFactor = scale / maxDistance;
    for (const [node, p] of Object.entries(centeredPos)) {
      scaledPos[node] = p.map((val, i) => val * scaleFactor + center[i]);
    }
  } else {
    // All nodes at the same position
    for (const node of Object.keys(centeredPos)) {
      scaledPos[node] = [...center];
    }
  }
  
  return scaledPos;
}

/**
 * Position nodes in two straight lines (bipartite layout).
 * 
 * @param {Object} G - Graph or list of nodes
 * @param {Array} nodes - Nodes in one node set of the graph
 * @param {string} align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} aspectRatio - The ratio of the width to the height of the layout
 * @returns {Object} Positions dictionary keyed by node
 */
function bipartiteLayout(G, nodes = null, align = 'vertical', scale = 1, center = null, aspectRatio = 4/3) {
  if (align !== 'vertical' && align !== 'horizontal') {
    throw new Error("align must be either vertical or horizontal");
  }
  
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph;
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // If nodes not provided, try to determine bipartite sets
  if (!nodes) {
    // A simple heuristic for bipartite detection: use nodes with even/odd indices
    // This is a simplification, in Python NetworkX has bipartite.sets()
    nodes = allNodes.filter((_, i) => i % 2 === 0);
  }
  
  const left = new Set(nodes);
  const right = new Set(allNodes.filter(n => !left.has(n)));
  
  const height = 1;
  const width = aspectRatio * height;
  const offset = [width / 2, height / 2];
  
  const pos = {};
  
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
  const scaledPos = rescaleLayout(pos, scale, center);
  
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
 * @param {Object} G - Graph or list of nodes
 * @param {Object|string} subsetKey - Object mapping layers to node sets, or node attribute name
 * @param {string} align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @returns {Object} Positions dictionary keyed by node
 */
function multipartiteLayout(G, subsetKey = 'subset', align = 'vertical', scale = 1, center = null) {
  if (align !== 'vertical' && align !== 'horizontal') {
    throw new Error("align must be either vertical or horizontal");
  }
  
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph;
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // Convert subsetKey to a layer mapping if it's a string
  let layers = {};
  if (typeof subsetKey === 'string') {
    // In JS we don't have access to node attributes directly
    // This is a simplification - in a real implementation we would need
    // to access node attributes from the graph
    console.warn("Using string subsetKey requires node attributes, using default partitioning");
    // Create a simple partitioning as fallback
    layers = { 0: allNodes };
  } else {
    // subsetKey is already a mapping of layers to nodes
    layers = subsetKey;
  }
  
  const layerCount = Object.keys(layers).length;
  let pos = {};
  
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
  pos = rescaleLayout(pos, scale, center);
  
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
 * @param {Object} G - Graph 
 * @param {any} start - Starting node for bfs
 * @param {string} align - The alignment of layers: 'vertical' or 'horizontal'
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @returns {Object} Positions dictionary keyed by node
 */
function bfsLayout(G, start, align = 'vertical', scale = 1, center = null) {
  const processed = _processParams(G, center || [0, 0], 2);
  const graph = processed.G;
  center = processed.center;
  
  const allNodes = graph.nodes ? graph.nodes() : graph;
  
  if (allNodes.length === 0) {
    return {};
  }
  
  // Compute BFS layers
  const layers = {};
  const visited = new Set();
  let currentLayer = 0;
  
  // Starting layer
  layers[currentLayer] = [start];
  visited.add(start);
  
  // BFS traversal
  while (Object.values(layers).flat().length < allNodes.length) {
    const nextLayer = [];
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
      const unvisited = allNodes.filter(node => !visited.has(node));
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
  function getNeighbors(graph, node) {
    if (!graph.edges) return [];
    
    return graph.edges()
      .filter(edge => edge[0] === node || edge[1] === node)
      .map(edge => edge[0] === node ? edge[1] : edge[0]);
  }
}

/**
 * Position nodes without edge intersections (planar layout).
 * 
 * @param {Object} G - Graph
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout (must be 2)
 * @returns {Object} Positions dictionary keyed by node
 */
function planarLayout(G, scale = 1, center = null, dim = 2) {
  if (dim !== 2) {
    throw new Error("can only handle 2 dimensions");
  }
  
  const processed = _processParams(G, center || [0, 0], dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph;
  
  if (nodes.length === 0) {
    return {};
  }
  
  // Simplified planar layout - this is a basic circular layout with noise
  // A true planar embedding would require much more complex algorithms
  console.warn("JavaScript planarLayout is a simplified approximation, not a true planar embedding");
  
  // Start with a circular layout
  let pos = circularLayout(graph, scale, center, dim);
  
  // Add some noise to avoid perfect circle
  for (const node in pos) {
    pos[node][0] += (Math.random() - 0.5) * 0.2 * scale;
    pos[node][1] += (Math.random() - 0.5) * 0.2 * scale;
  }
  
  return pos;
}

/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 * 
 * @param {Object} G - NetworkX graph or list of nodes
 * @param {Object} dist - A two-level dictionary of optimal distances between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {string} weight - The edge attribute used for edge weights
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @returns {Object} Positions dictionary keyed by node
 */
function kamadaKawaiLayout(G, dist = null, pos = null, weight = 'weight', scale = 1, center = null, dim = 2) {
  const processed = _processParams(G, center, dim);
  const graph = processed.G;
  center = processed.center;
  
  const nodes = graph.nodes ? graph.nodes() : graph;
  
  if (nodes.length === 0) {
    return {};
  }
  
  if (nodes.length === 1) {
    return {[nodes[0]]: center};
  }
  
  // Initialize distance matrix
  if (!dist) {
    dist = _compute_shortest_path_distances(graph, weight);
  }
  
  // Convert distances to a matrix
  const nodesArray = Array.from(nodes);
  const nNodes = nodesArray.length;
  const distMatrix = Array(nNodes).fill().map(() => Array(nNodes).fill(1e6));
  
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
      const posArray = {};
      nodesArray.forEach((node, i) => {
        posArray[node] = [i / (nNodes - 1 || 1)];
      });
      pos = posArray;
    }
  }
  
  // Convert positions to array for computation
  const posArray = new Array(nNodes);
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
  const finalPos = {};
  for (let i = 0; i < nNodes; i++) {
    finalPos[nodesArray[i]] = newPositions[i];
  }
  
  return rescaleLayout(finalPos, scale, center);
}

/**
 * Compute all-pairs shortest path distances for the graph
 * 
 * @param {Object} G - NetworkX graph
 * @param {string} weight - Edge attribute for weight
 * @returns {Object} Dictionary of dictionaries of shortest path distances
 */
function _compute_shortest_path_distances(G, weight) {
  const distances = {};
  const nodes = G.nodes ? G.nodes() : G;
  const edges = G.edges ? G.edges() : [];
  
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
    // For now, assume weight = 1
    distances[source][target] = 1;
    distances[target][source] = 1;  // Assuming undirected graph
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
 * @param {Array} distMatrix - Matrix of desired distances between nodes
 * @param {Array} positions - Initial node positions
 * @param {number} dim - Dimension of layout
 * @returns {Array} Optimized node positions
 */
function _kamadaKawaiSolve(distMatrix, positions, dim) {
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
  const oldValues = [];
  const oldGrads = [];
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Calculate cost and gradient
    const [cost, grad] = _kamadaKawaiCostfn(posVec, invDistMatrix, meanWeight, dim);
    
    // Compute search direction using L-BFGS approximation
    const direction = _lbfgsDirection(grad, oldValues, oldGrads, m);
    
    // Simple line search for step size
    alpha = _backtrackingLineSearch(
      posVec, direction, cost, grad, 
      (x) => _kamadaKawaiCostfn(x, invDistMatrix, meanWeight, dim)[0],
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
  const result = [];
  for (let i = 0; i < nNodes; i++) {
    result.push(posVec.slice(i * dim, (i + 1) * dim));
  }
  
  return result;
}

/**
 * Cost function and gradient for Kamada-Kawai layout algorithm
 * 
 * @param {Array} posVec - Flattened position array
 * @param {Array} invDist - Inverse distance matrix
 * @param {number} meanWeight - Weight for centering positions
 * @param {number} dim - Dimension of layout
 * @returns {Array} Array with [cost, gradient]
 */
function _kamadaKawaiCostfn(posVec, invDist, meanWeight, dim) {
  const nNodes = invDist.length;
  const positions = [];
  
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
 * @param {Array} grad - Current gradient
 * @param {Array} sList - List of position differences (s_k)
 * @param {Array} yList - List of gradient differences (y_k)
 * @param {number} m - Memory size
 * @returns {Array} Direction vector
 */
function _lbfgsDirection(grad, sList, yList, m) {
  if (sList.length === 0) {
    // First iteration - use negative gradient
    return grad.map(g => -g);
  }
  
  const q = grad.slice();
  const alpha = Array(sList.length).fill(0);
  const rho = [];
  
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
 * @param {Array} x - Current position
 * @param {Array} direction - Search direction
 * @param {number} f - Function value at current position
 * @param {Array} grad - Gradient at current position
 * @param {Function} func - Function to evaluate cost
 * @param {number} alpha0 - Initial step size
 * @returns {number} Optimal step size
 */
function _backtrackingLineSearch(x, direction, f, grad, func, alpha0) {
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
 * @param {Object} G - Graph
 * @param {Object} pos - Initial positions for nodes
 * @param {number} maxIter - Maximum number of iterations
 * @param {number} jitterTolerance - Controls tolerance for node speed adjustments
 * @param {number} scalingRatio - Scaling of attraction and repulsion forces
 * @param {number} gravity - Attraction to center to prevent disconnected components from drifting
 * @param {boolean} distributedAction - Distributes attraction force among nodes
 * @param {boolean} strongGravity - Uses a stronger gravity model
 * @param {Object} nodeMass - Dictionary mapping nodes to their masses
 * @param {Object} nodeSize - Dictionary mapping nodes to their sizes
 * @param {string} weight - Edge attribute for weight
 * @param {boolean} dissuadeHubs - Whether to prevent hub nodes from clustering
 * @param {boolean} linlog - Whether to use logarithmic attraction
 * @param {number} seed - Random seed for initial positions
 * @param {number} dim - Dimension of layout
 * @returns {Object} Positions dictionary keyed by node
 */
function forceatlas2Layout(
  G, 
  pos = null, 
  maxIter = 100, 
  jitterTolerance = 1.0,
  scalingRatio = 2.0,
  gravity = 1.0,
  distributedAction = false,
  strongGravity = false,
  nodeMass = null,
  nodeSize = null,
  weight = null,
  dissuadeHubs = false,
  linlog = false,
  seed = null,
  dim = 2
) {
  const processed = _processParams(G, null, dim);
  const graph = processed.G;
  
  const nodes = graph.nodes ? graph.nodes() : graph;
  
  if (nodes.length === 0) {
    return {};
  }
  
  // Initialize random number generator
  const rng = new RandomNumberGenerator(seed);
  
  // Initialize positions if not provided
  let pos_arr;
  if (pos === null) {
    pos = {};
    pos_arr = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      pos_arr[i] = Array(dim).fill(0).map(() => rng.rand() * 2 - 1);
      pos[nodes[i]] = pos_arr[i];
    }
  } else if (Object.keys(pos).length === nodes.length) {
    // Use provided positions
    pos_arr = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      pos_arr[i] = [...pos[nodes[i]]];
    }
  } else {
    // Some nodes don't have positions, initialize within the range of existing positions
    let min_pos = Array(dim).fill(Number.POSITIVE_INFINITY);
    let max_pos = Array(dim).fill(Number.NEGATIVE_INFINITY);
    
    // Find min and max of existing positions
    for (const node in pos) {
      for (let d = 0; d < dim; d++) {
        min_pos[d] = Math.min(min_pos[d], pos[node][d]);
        max_pos[d] = Math.max(max_pos[d], pos[node][d]);
      }
    }
    
    pos_arr = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (pos[node]) {
        pos_arr[i] = [...pos[node]];
      } else {
        pos_arr[i] = Array(dim).fill(0).map((_, d) => 
          min_pos[d] + rng.rand() * (max_pos[d] - min_pos[d])
        );
        pos[node] = pos_arr[i];
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
  const A = Array(n).fill().map(() => Array(n).fill(0));
  
  // Populate adjacency matrix with edge weights
  const edges = graph.edges ? graph.edges() : [];
  const nodeIndices = {};
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
  const gravities = Array(n).fill().map(() => Array(dim).fill(0));
  const attraction = Array(n).fill().map(() => Array(dim).fill(0));
  const repulsion = Array(n).fill().map(() => Array(dim).fill(0));
  
  // Simulation parameters
  let speed = 1;
  let speedEfficiency = 1;
  let swing = 1;
  let traction = 1;
  
  // Helper function to estimate factor for force scaling
  function estimateFactor(n, swing, traction, speed, speedEfficiency, jitterTolerance) {
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
    const diff = Array(n).fill().map(() => 
      Array(n).fill().map(() => Array(dim).fill(0))
    );
    
    const distance = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        for (let d = 0; d < dim; d++) {
          diff[i][j][d] = pos_arr[i][d] - pos_arr[j][d];
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
        centerOfMass[d] += pos_arr[i][d] / n;
      }
    }
    
    for (let i = 0; i < n; i++) {
      const posCentered = Array(dim);
      for (let d = 0; d < dim; d++) {
        posCentered[d] = pos_arr[i][d] - centerOfMass[d];
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
    const update = Array(n).fill().map(() => Array(dim).fill(0));
    let totalSwing = 0;
    let totalTraction = 0;
    
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dim; d++) {
        update[i][d] = attraction[i][d] + repulsion[i][d] + gravities[i][d];
      }
      
      // Calculate swing and traction for this node
      const oldPos = [...pos_arr[i]];
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
        pos_arr[i][d] += movement;
        totalMovement += Math.abs(movement);
      }
    }
    
    // Check for convergence
    if (totalMovement < 1e-10) {
      break;
    }
  }
  
  // Create position dictionary
  const positions = {};
  for (let i = 0; i < n; i++) {
    positions[nodes[i]] = pos_arr[i];
  }
  
  return rescaleLayout(positions);
  
  // Helper function to get node degree
  function getNodeDegree(graph, node) {
    if (!graph.edges) return 0;
    
    return graph.edges().filter(edge => 
      edge[0] === node || edge[1] === node
    ).length;
  }
}

/**
 * Layout algorithm with attractive and repulsive forces (ARF).
 * 
 * @param {Object} G - Graph
 * @param {Object} pos - Initial positions for nodes
 * @param {number} scaling - Scale factor for positions
 * @param {number} a - Strength of springs between connected nodes (should be > 1)
 * @param {number} maxIter - Maximum number of iterations
 * @param {number|null} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
function arfLayout(G, pos = null, scaling = 1, a = 1.1, maxIter = 1000, seed = null) {
  if (a <= 1) {
    throw new Error("The parameter a should be larger than 1");
  }
  
  const nodes = G.nodes ? G.nodes() : G;
  const edges = G.edges ? G.edges() : [];
  
  if (nodes.length === 0) {
    return {};
  }
  
  // Initialize positions if not provided
  if (!pos) {
    pos = randomLayout(G, null, 2, seed);
  } else {
    // Make sure all nodes have positions
    const rng = new RandomNumberGenerator(seed);
    const defaultPos = nodes.reduce((acc, node) => {
      if (!pos[node]) {
        acc[node] = [rng.rand(), rng.rand()];
      }
      return acc;
    }, {});
    pos = {...pos, ...defaultPos};
  }
  
  // Create node index mapping
  const nodeIndex = {};
  nodes.forEach((node, i) => {
    nodeIndex[node] = i;
  });
  
  // Create positions array
  const positions = nodes.map(node => [...pos[node]]);
  
  // Initialize spring constant matrix
  const N = nodes.length;
  const K = Array(N).fill().map(() => Array(N).fill(1));
  
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
    const change = Array(N).fill().map(() => [0, 0]);
    
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
  const finalPos = {};
  nodes.forEach((node, i) => {
    finalPos[node] = positions[i];
  });
  
  return finalPos;
}

/**
 * Return a dictionary of scaled positions keyed by node.
 * 
 * @param {Object} pos - Dictionary of positions keyed by node
 * @param {number} scale - Scale factor for positions
 * @returns {Object} Dictionary of scaled positions
 */
function rescaleLayoutDict(pos, scale = 1) {
  if (Object.keys(pos).length === 0) {
    return {};
  }
  
  // Extract positions as array
  const posArray = Object.values(pos);
  
  // Find center of positions
  const center = [];
  for (let d = 0; d < posArray[0].length; d++) {
    center[d] = posArray.reduce((sum, p) => sum + p[d], 0) / posArray.length;
  }
  
  // Center positions
  const centeredPos = {};
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
  const scaledPos = {};
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
