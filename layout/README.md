# Layout

Layout is a TypeScript library for positioning nodes in graphs. It's a TypeScript port of the [layout algorithms](https://networkx.org/documentation/stable/reference/drawing.html) from the Python [NetworkX](https://networkx.org/documentation/stable/) library.

## Features

The library offers various graph layout algorithms, including:

- **Random Layout** - Places nodes randomly in a unit square
- **Circular Layout** - Places nodes on a circle
- **Shell Layout** - Places nodes in concentric circles (shells)
- **Spring Layout (Fruchterman-Reingold)** - Force-directed layout with attractions and repulsions
- **Spectral Layout** - Uses eigenvectors of the graph's Laplacian matrix
- **Spiral Layout** - Places nodes along a spiral
- **Bipartite Layout** - Layout for bipartite graphs in two straight lines
- **Multipartite Layout** - Layout for multipartite graphs in levels
- **BFS Layout** - Layout based on breadth-first search algorithm
- **Planar Layout** - Planar layout without edge crossings
- **Kamada-Kawai Layout** - Layout based on path-length cost functions
- **ForceAtlas2 Layout** - Advanced force-directed algorithm
- **ARF Layout** - Layout with attractive and repulsive forces

## How to Use

Import the library in your TypeScript/JavaScript project:

```typescript
import {
  randomLayout,
  circularLayout,
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
  rescaleLayout
} from './layout.js'
```

## Graph Structure

The module accepts graphs in two formats:

### 1. Graph Object with methods (preferred)
```typescript
const graph = {
  nodes: () => [0, 1, 2, 3],
  edges: () => [[0, 1], [1, 2], [2, 3], [3, 0]],
  getEdgeData?: (source, target, attr) => number // optional for edge weights
}
```

### 2. Simple array of nodes
```typescript
const nodes = [0, 1, 2, 3]
```

## Usage Examples

### Circular Layout
```typescript
const graph = {
  nodes: () => ['A', 'B', 'C', 'D'],
  edges: () => [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']]
}

const positions = circularLayout(graph, 1, [0, 0], 2)
// Output: { A: [1, 0], B: [0, 1], C: [-1, 0], D: [0, -1] }
```

### Spring Layout (Fruchterman-Reingold)
```typescript
// Force-directed layout with custom parameters
const positions = springLayout(
  graph,                    // graph
  null,                    // k: optimal distance (auto)
  null,                    // pos: initial positions (auto)
  ['A'],                   // fixed: fixed nodes
  100,                     // iterations: iterations
  1,                       // scale: scale
  [0, 0],                  // center: center
  2,                       // dim: dimensions
  42                       // seed: random seed
)

// or (same function)
const positions = fruchtermanReingoldLayout(
  graph,
  null,    // k: optimal distance
  null,    // pos: initial positions
  null,    // fixed: fixed nodes
  50,      // iterations
  1,       // scale
  [0, 0],  // center
  2,       // dim
  42       // seed
)
```

### Bipartite graph layout
```typescript
const bipartiteGraph = {
  nodes: () => ['A1', 'A2', 'B1', 'B2', 'B3'],
  edges: () => [['A1', 'B1'], ['A1', 'B2'], ['A2', 'B2'], ['A2', 'B3']]
}

const leftNodes = ['A1', 'A2']
const positions = bipartiteLayout(bipartiteGraph, leftNodes, 'vertical')
```

## Common Parameters

Most layout functions share these parameters:

- **scale** (number): Scale factor for positions (default: 1)
- **center** (number[]): Center coordinates around which to center the layout (default: [0, 0])
- **dim** (number): Layout dimension - 2D or 3D (default: 2)
- **seed** (number): Seed for random generation (for reproducible layouts)

## TypeScript Types

```typescript
type Node = string | number
type Edge = [Node, Node]
type PositionMap = Record<Node, number[]>

interface Graph {
  nodes?: () => Node[]
  edges?: () => Edge[]
  getEdgeData?: (source: Node, target: Node, attr: string) => any
}
```

## Utilities

### Layout Rescaling
```typescript
import { rescaleLayout } from './layout.js'

// Rescale existing positions
const scaledPositions = rescaleLayout(positions, 2.0, [10, 10])
```

## Available Algorithms

### Force-Directed Layouts
- `springLayout()` / `fruchtermanReingoldLayout()` - Classic force-directed algorithm
- `forceatlas2Layout()` - Advanced algorithm with many configuration options  
- `arfLayout()` - Attractive and repulsive forces
- `kamadaKawaiLayout()` - Based on shortest-path distances

### Geometric Layouts
- `randomLayout()` - Random placement
- `circularLayout()` - Circular arrangement
- `shellLayout()` - Concentric circles
- `spiralLayout()` - Spiral arrangement

### Specialized Layouts
- `spectralLayout()` - Based on eigenvectors of the Laplacian matrix
- `bipartiteLayout()` - For bipartite graphs
- `multipartiteLayout()` - For multi-level graphs
- `bfsLayout()` - Based on breadth-first search  
- `planarLayout()` - For planar graphs without crossings

### Utilities
- `rescaleLayout()` - Rescale and recenter positions
- `rescaleLayoutDict()` - Rescale a dictionary of positions

## Detailed Examples for each Algorithm

### Random Layout
```typescript
// Random placement in a unit square [0,1]
const positions = randomLayout(graph, [0, 0], 2, 42)
// center: [0, 0], dim: 2, seed: 42
```

### Circular Layout  
```typescript
// Nodes arranged on a circle
const positions = circularLayout(graph, 1, [0, 0], 2)
// scale: 1, center: [0, 0], dim: 2
```

### Shell Layout
```typescript
// Nodes in concentric circles
const shells = [['A'], ['B', 'C'], ['D', 'E', 'F']]
const positions = shellLayout(graph, shells, 1, [0, 0], 2)
// nlist: shells, scale: 1, center: [0, 0], dim: 2
```

### Spring Layout (Fruchterman-Reingold)
```typescript
// Force layout with custom parameters
const positions = springLayout(
  graph,                    // graph
  null,                    // k: optimal distance (auto)
  null,                    // pos: initial positions (auto)
  ['A'],                   // fixed: fixed nodes
  100,                     // iterations: iterations
  1,                       // scale: scale
  [0, 0],                  // center: center
  2,                       // dim: dimensions
  42                       // seed: random seed
)
```

### Spectral Layout
```typescript
// Layout based on eigenvectors of the Laplacian matrix
const positions = spectralLayout(graph, 1, [0, 0], 2)
```

### Spiral Layout
```typescript
// Spiral arrangement
const positions = spiralLayout(
  graph,
  1,          // scale
  [0, 0],     // center  
  2,          // dim
  0.35,       // resolution: spacing control
  false       // equidistant: equidistant points
)
```

### Bipartite Layout
```typescript
// For bipartite graphs
const leftNodes = ['A1', 'A2']
const positions = bipartiteLayout(
  graph,
  leftNodes,     // first group nodes
  'vertical',    // align: 'vertical' or 'horizontal'
  1,            // scale
  [0, 0],       // center
  4/3           // aspectRatio
)
```

### Multipartite Layout
```typescript
// For multi-level graphs
const layers = {
  0: ['A1', 'A2'],
  1: ['B1', 'B2', 'B3'],
  2: ['C1']
}
const positions = multipartiteLayout(
  graph,
  layers,       // subsetKey: layer mapping
  'vertical',   // align
  1,           // scale
  [0, 0]       // center
)
```

### BFS Layout
```typescript
// Layout based on breadth-first search
const positions = bfsLayout(
  graph,
  'A',         // start: starting node
  'vertical',  // align
  1,          // scale
  [0, 0]      // center
)
```

### Planar Layout
```typescript
// Planar layout (for planar graphs)
const positions = planarLayout(graph, 1, [0, 0], 2)
// Note: throws error if graph is not planar
```

### Kamada-Kawai Layout
```typescript
// Layout based on shortest path distances
const positions = kamadaKawaiLayout(
  graph,
  null,        // dist: distance matrix (auto)
  null,        // pos: initial positions (auto)
  'weight',    // weight: edge weight attribute
  1,          // scale
  [0, 0],     // center
  2           // dim
)
```

### ForceAtlas2 Layout
```typescript
// Advanced force algorithm
const positions = forceatlas2Layout(
  graph,
  null,        // pos: initial positions
  100,         // maxIter: maximum iterations
  1.0,         // jitterTolerance
  2.0,         // scalingRatio
  1.0,         // gravity: attraction towards center
  false,       // distributedAction
  false,       // strongGravity
  null,        // nodeMass: node masses
  null,        // nodeSize: node sizes
  null,        // weight: weight attribute
  false,       // dissuadeHubs
  false,       // linlog: logarithmic attraction
  42,          // seed
  2            // dim
)
```

### ARF Layout  
```typescript
// Layout with attractive and repulsive forces
const positions = arfLayout(
  graph,
  null,        // pos: initial positions
  1,          // scaling
  1.1,        // a: spring force (must be > 1)
  1000,       // maxIter
  42          // seed
)
```

## Error Handling

```typescript
try {
  const positions = planarLayout(nonPlanarGraph)
} catch (error) {
  console.error('Graph is not planar:', error.message)
}

try {
  const positions = arfLayout(graph, null, 1, 0.5) // a <= 1
} catch (error) {
  console.error('Invalid parameter a:', error.message)
}
```

## Installation

```bash
npm install @graphty/layout
```

## Implementation

The module includes complete implementations of:

- **Random Number Generator** with seed support for reproducible results
- **Mathematical utilities** similar to NumPy for multidimensional array operations
- **Force-directed algorithms** with L-BFGS optimization for Kamada-Kawai
- **Planarity algorithms** including Left-Right test for planar graphs
- **Auto-scaling system** to automatically normalize positions

## Contributing

This project is a TypeScript port of the NetworkX Python library. For contributions and issues, visit the [GitHub repository](https://github.com/graphty-org/layout).

## License

MIT License - see LICENSE file for details.
