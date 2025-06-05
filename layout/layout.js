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
 * @param {Object} G - Graph or list of nodes
 * @param {Object} dist - A two-level dictionary of optimal distances between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {string} weight - The edge attribute used for edge weights
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @returns {Object} Positions dictionary keyed by node
 */
function kamadaKawaiLayout(G, dist = null, pos = null, weight = 'weight', scale = 1, center = null, dim = 2) {
  const processed = _processParams(G, center || [0, 0], dim);
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
    // This is a simplified approach - in a real implementation we would compute
    // shortest paths between all pairs of nodes
    dist = {};
    nodes.forEach(u => {
      dist[u] = {};
      nodes.forEach(v => {
        dist[u][v] = u === v ? 0 : 1; // Default distance of 1 between different nodes
      });
    });
    
    // Update distances based on edges
    const edges = graph.edges ? graph.edges() : [];
    for (const [u, v] of edges) {
      dist[u][v] = 1;
      dist[v][u] = 1;
    }
  }
  
  // Initialize positions if not provided
  if (!pos) {
    if (dim >= 3) {
      pos = randomLayout(graph, null, dim);
    } else {
      pos = circularLayout(graph, 1, [0, 0], dim);
    }
  }
  
  // This is a simplified optimization - a full Kamada-Kawai would require
  // more complex numerical optimization
  console.warn("JavaScript kamadaKawaiLayout is a simplified approximation");
  
  // Perform a simplified force-directed layout using the distance matrix
  const iterations = 50;
  const tolerance = 1e-4;
  
  // Convert positions to array for easier manipulation
  const posArray = nodes.map(node => pos[node] ? [...pos[node]] : Array(dim).fill(0));
  
  for (let iter = 0; iter < iterations; iter++) {
    let maxDelta = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const displacement = Array(dim).fill(0);
      
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        
        const otherNode = nodes[j];
        const targetDist = dist[node][otherNode];
        
        // Calculate actual distance
        const actualDist = Math.sqrt(
          posArray[i].reduce((sum, coord, idx) => {
            return sum + Math.pow(coord - posArray[j][idx], 2);
          }, 0)
        ) || 0.1; // Avoid division by zero
        
        // Calculate direction unit vector
        const direction = posArray[i].map((coord, idx) => {
          return (coord - posArray[j][idx]) / actualDist;
        });
        
        // Calculate attractive/repulsive force
        const force = (actualDist - targetDist) / targetDist;
        
        // Update displacement
        direction.forEach((dir, idx) => {
          displacement[idx] += dir * force;
        });
      }
      
      // Update position
      const delta = Math.sqrt(displacement.reduce((sum, d) => sum + d * d, 0));
      maxDelta = Math.max(maxDelta, delta);
      
      for (let dim = 0; dim < posArray[i].length; dim++) {
        posArray[i][dim] += displacement[dim] * 0.1; // Scale factor to control update magnitude
      }
    }
    
    // Check for convergence
    if (maxDelta < tolerance) {
      break;
    }
  }
  
  // Convert positions back to dictionary
  const finalPos = {};
  nodes.forEach((node, i) => {
    finalPos[node] = posArray[i];
  });
  
  // Rescale positions
  return rescaleLayout(finalPos, scale, center);
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
  if (!pos) {
    pos = {};
    nodes.forEach(node => {
      pos[node] = Array(dim).fill(0).map(() => rng.rand() * 2 - 1);
    });
  } else {
    // Make sure all nodes have positions
    nodes.forEach(node => {
      if (!pos[node]) {
        pos[node] = Array(dim).fill(0).map(() => rng.rand() * 2 - 1);
      }
    });
  }
  
  // Initialize node masses and sizes
  const mass = {};
  const size = {};
  
  nodes.forEach(node => {
    // Default mass is degree + 1
    mass[node] = nodeMass && nodeMass[node] ? 
      nodeMass[node] : 
      (graph.edges ? 
        getNodeDegree(graph, node) + 1 : 
        1
      );
    
    // Default size is 1
    size[node] = nodeSize && nodeSize[node] ? nodeSize[node] : 1;
  });
  
  // Get edge weights
  const edges = graph.edges ? graph.edges() : [];
  const edgeWeights = {};
  
  edges.forEach(edge => {
    const [source, target] = edge;
    edgeWeights[`${source}-${target}`] = 1; // Default weight
    // In a real implementation, we would get edge weights from the graph
  });
  
  // Initialize speed and temperature
  let speed = 1;
  let speedEfficiency = 1;
  
  // Main layout loop
  for (let iter = 0; iter < maxIter; iter++) {
    // Calculate repulsive forces
    const repulsion = {};
    nodes.forEach(node => {
      repulsion[node] = Array(dim).fill(0);
    });
    
    // Calculate attractive forces
    const attraction = {};
    nodes.forEach(node => {
      attraction[node] = Array(dim).fill(0);
    });
    
    // Calculate gravity forces
    const gravityForces = {};
    nodes.forEach(node => {
      gravityForces[node] = Array(dim).fill(0);
    });
    
    // Calculate repulsive forces between all pairs of nodes
    for (let i = 0; i < nodes.length; i++) {
      const node1 = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const node2 = nodes[j];
        
        // Calculate distance vector
        const diff = pos[node1].map((coord, dim) => coord - pos[node2][dim]);
        
        // Calculate Euclidean distance with size adjustment
        let distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0));
        
        if (nodeSize) {
          distance -= size[node1] - size[node2];
        }
        
        distance = Math.max(distance, 0.01); // Prevent division by zero
        
        // Calculate repulsion (inverse square law)
        const repulsiveForce = (mass[node1] * mass[node2] * scalingRatio) / (distance * distance);
        
        // Apply force along the distance vector
        for (let d = 0; d < dim; d++) {
          const direction = diff[d] / distance;
          repulsion[node1][d] += direction * repulsiveForce;
          repulsion[node2][d] -= direction * repulsiveForce;
        }
      }
    }
    
    // Calculate attractive forces along edges
    for (const [source, target] of edges) {
      // Calculate distance vector
      const diff = pos[source].map((coord, dim) => coord - pos[target][dim]);
      
      // Calculate Euclidean distance
      const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 0.01;
      
      // Calculate attraction
      let attractiveForce;
      
      if (linlog) {
        attractiveForce = -Math.log(1 + distance) / distance;
      } else {
        attractiveForce = -distance;
      }
      
      // Weight by edge weight
      const edgeKey = `${source}-${target}`;
      attractiveForce *= edgeWeights[edgeKey] || 1;
      
      // Distribute attraction force if enabled
      if (distributedAction) {
        attractiveForce /= mass[source];
        attractiveForce /= mass[target];
      }
      
      // Apply force along the distance vector
      for (let d = 0; d < dim; d++) {
        const direction = diff[d] / distance;
        attraction[source][d] += direction * attractiveForce;
        attraction[target][d] -= direction * attractiveForce;
      }
    }
    
    // Calculate gravitational forces to center
    const center = Array(dim).fill(0);
    
    // Calculate current center of mass
    nodes.forEach(node => {
      for (let d = 0; d < dim; d++) {
        center[d] += pos[node][d] / nodes.length;
      }
    });
    
    nodes.forEach(node => {
      // Vector from center to node
      const diff = pos[node].map((coord, dim) => coord - center[dim]);
      
      // Distance from center
      const distance = Math.sqrt(diff.reduce((sum, d) => sum + d * d, 0)) || 0.01;
      
      // Gravitational force
      let gravForce;
      
      if (strongGravity) {
        gravForce = -gravity * mass[node];
      } else {
        gravForce = -gravity * mass[node] / distance;
      }
      
      // Apply force along the direction to center
      for (let d = 0; d < dim; d++) {
        const direction = diff[d] / distance;
        gravityForces[node][d] = direction * gravForce;
      }
    });
    
    // Calculate total forces and update positions
    let swinging = 0;
    let traction = 0;
    const forces = {};
    
    nodes.forEach(node => {
      forces[node] = Array(dim).fill(0);
      
      // Combine all forces
      for (let d = 0; d < dim; d++) {
        forces[node][d] = repulsion[node][d] + attraction[node][d] + gravityForces[node][d];
      }
      
      // Calculate swinging and traction
      const forceMagnitude = Math.sqrt(forces[node].reduce((sum, f) => sum + f * f, 0));
      swinging += mass[node] * forceMagnitude;
      traction += 0.5 * mass[node] * forceMagnitude;
    });
    
    // Update speed and cooling parameters
    // This is a simplified version of the original algorithm
    if (swinging > 0) {
      speed = 0.1 * speed + 0.9 * Math.min(speedEfficiency * traction / swinging, 2);
    }
    
    // Update positions
    nodes.forEach(node => {
      const forceMagnitude = Math.sqrt(forces[node].reduce((sum, f) => sum + f * f, 0));
      const scaleFactor = Math.min(speed / (1 + speed * Math.sqrt(mass[node] * forceMagnitude)), 10);
      
      for (let d = 0; d < dim; d++) {
        pos[node][d] += forces[node][d] * scaleFactor;
      }
    });
  }
  
  return rescaleLayout(pos);
  
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
