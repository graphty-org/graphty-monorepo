# @graphty/layout

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty-org.github.io/docs/layout/)
[![Examples](https://img.shields.io/badge/demo-github%20pages-blue)](https://graphty-org.github.io/layout/examples/index.html)

**[View Interactive Examples →](https://graphty-org.github.io/layout/examples/index.html)**

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

Additionally, the library includes:

**Graph Generators** for creating common graph types:

- **Complete Graph** - All nodes connected to each other
- **Cycle Graph** - Nodes connected in a circular path
- **Star Graph** - Central hub connected to all other nodes
- **Wheel Graph** - Hub connected to nodes arranged in a rim cycle
- **Grid Graph** - 2D grid with nodes connected to neighbors
- **Random Graph** - Erdős–Rényi random graph model
- **Bipartite Graph** - Graph with two disjoint node sets
- **Scale-Free Graph** - Barabási–Albert preferential attachment model

**Layout Helpers** for intelligent graph analysis and layout optimization:

- **groupNodes** - Universal node grouping by degree, distance, k-core, or community
- **detectBipartite** - Automatic bipartite graph detection
- **findBestRoot** - Optimal root selection for tree layouts
- **autoConfigureForce** - Smart parameter configuration for force layouts
- **layoutQuality** - Layout quality measurement
- **combineLayouts** - Blend multiple layout algorithms
- **interpolateLayouts** - Smooth animation between layouts

## Installation

```bash
npm install @graphty/layout
```

## How to Use

Import the library in your TypeScript/JavaScript project:

```typescript
import {
    // Layout algorithms
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
    rescaleLayout,

    // Graph generators
    completeGraph,
    cycleGraph,
    starGraph,
    wheelGraph,
    gridGraph,
    randomGraph,
    bipartiteGraph,
    scaleFreeGraph,

    // Layout helpers
    groupNodes,
    detectBipartite,
    findBestRoot,
    autoConfigureForce,
    layoutQuality,
    combineLayouts,
    interpolateLayouts,
} from "@graphty/layout";
```

## Quick Start

```typescript
// Generate a graph
const graph = scaleFreeGraph(30, 2, 42);

// Auto-configure and layout
const config = autoConfigureForce(graph);
const positions = springLayout(graph, config.k, null, null, config.iterations);

// Or use specialized layouts
const bipartite = detectBipartite(graph);
if (bipartite) {
    const positions = bipartiteLayout(graph, bipartite.setA);
}

// Or use shell layout with automatic grouping
const shells = groupNodes(graph, "degree", 3);
const positions = shellLayout(graph, shells);
```

## Graph Structure

The module accepts graphs in two formats:

### 1. Graph Object with methods (preferred)

```typescript
const graph = {
    nodes: () => [0, 1, 2, 3],
    edges: () => [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
    ],
    getEdgeData: (source, target, attr) => number, // optional for edge weights
};
```

### 2. Simple array of nodes

```typescript
const nodes = [0, 1, 2, 3];
```

## Graph Generation

The library includes utilities to generate common graph types for testing and demonstration:

### Complete Graph

Creates a complete graph with all possible edges between nodes.

```typescript
const graph = completeGraph(5);
// Creates a graph with 5 nodes (0-4) and 10 edges (all pairs connected)
```

### Cycle Graph

Creates a cycle graph where nodes form a closed loop.

```typescript
const graph = cycleGraph(6);
// Creates a graph with 6 nodes (0-5) connected in a cycle: 0-1-2-3-4-5-0
```

### Star Graph

Creates a star graph with one central hub connected to all other nodes.

```typescript
const graph = starGraph(7);
// Creates a graph with 7 nodes where node 0 is connected to all others (1-6)
```

### Wheel Graph

Creates a wheel graph - a hub connected to all nodes of a rim cycle.

```typescript
const graph = wheelGraph(6);
// Creates a graph with 6 nodes: hub (0) connected to rim cycle (1-2-3-4-5-1)
```

### Grid Graph

Creates a 2D grid graph with specified rows and columns.

```typescript
const graph = gridGraph(3, 4);
// Creates a 3x4 grid with nodes named "row,col" (e.g., "0,0", "0,1", etc.)
// Nodes are connected to their horizontal and vertical neighbors
```

### Random Graph

Creates a random graph with specified edge probability.

```typescript
const graph = randomGraph(10, 0.3, 42);
// Creates a graph with 10 nodes (0-9)
// Each possible edge has 30% chance of existing
// Seed 42 ensures reproducible results
```

### Bipartite Graph

Creates a bipartite graph with two sets of nodes.

```typescript
const graph = bipartiteGraph(3, 4, 0.5, 123);
// Creates two sets: A0,A1,A2 and B0,B1,B2,B3
// Each edge between sets has 50% chance of existing
// Returns graph with additional setA and setB properties
```

### Scale-Free Graph

Creates a scale-free graph using the Barabási-Albert preferential attachment model.

```typescript
const graph = scaleFreeGraph(20, 2, 456);
// Creates a graph with 20 nodes
// Each new node connects to 2 existing nodes (preferential attachment)
// Results in a power-law degree distribution with some high-degree hubs
```

### Using Generated Graphs with Layouts

All generated graphs work seamlessly with the layout algorithms:

```typescript
// Generate a complete graph and apply circular layout
const graph = completeGraph(8);
const positions = circularLayout(graph);

// Generate a grid with auto-configured spring layout
const grid = gridGraph(5, 5);
const config = autoConfigureForce(grid);
const gridPositions = springLayout(grid, config.k, null, null, config.iterations);

// Generate a scale-free network with optimized ForceAtlas2
const network = scaleFreeGraph(50, 3, 42);
const networkConfig = autoConfigureForce(network);
const networkPositions = forceatlas2Layout(
    network,
    null,
    networkConfig.iterations,
    1.0,
    networkConfig.scalingRatio,
    networkConfig.gravity,
);

// Use bipartite graph with automatic detection
const bipartite = bipartiteGraph(5, 7, 0.4, 123);
const bipartitePositions = bipartiteLayout(bipartite, bipartite.setA);
```

## Layout Helpers

The library includes helper functions to simplify working with complex layouts:

### `groupNodes()` - Universal Node Grouping

Groups nodes for shell, multipartite, or custom layouts based on various metrics:

```typescript
// Group by degree (connectivity) - great for shell layouts
const shells = groupNodes(graph, "degree", 3);
const positions = shellLayout(graph, shells);

// Group by distance from root - perfect for hierarchical layouts
const layers = groupNodes(graph, "bfs", 0, { root: "A" });
const positions = multipartiteLayout(graph, layers);

// Group by k-core (dense subgraphs) - ideal for social networks
const cores = groupNodes(graph, "k-core");
const positions = shellLayout(graph, cores);

// Group by community detection - useful for modular networks
const communities = groupNodes(graph, "community", 5);
```

### `detectBipartite()` - Automatic Bipartite Detection

Automatically detects if a graph is bipartite and finds the two sets:

```typescript
const result = detectBipartite(graph);
if (result) {
    // Graph is bipartite! Use specialized layout
    const positions = bipartiteLayout(graph, result.setA);
} else {
    // Not bipartite, use general layout
    const positions = springLayout(graph);
}
```

### `findBestRoot()` - Optimal Root Node Selection

Finds the best starting node for tree-like layouts (BFS, hierarchical):

```typescript
const root = findBestRoot(graph);
const positions = bfsLayout(graph, root);
```

### `autoConfigureForce()` - Smart Force Layout Configuration

Automatically configures parameters based on graph properties:

```typescript
const config = autoConfigureForce(graph);

// Use with Fruchterman-Reingold
const positions = springLayout(graph, config.k, null, null, config.iterations);

// Use with ForceAtlas2
const positions = forceatlas2Layout(graph, null, config.iterations, 1.0, config.scalingRatio, config.gravity);
```

### `layoutQuality()` - Layout Quality Metrics

Measure and compare layout quality:

```typescript
const circular = circularLayout(graph);
const spring = springLayout(graph);

const metricsC = layoutQuality(graph, circular);
const metricsS = layoutQuality(graph, spring);

console.log("Circular layout - avg edge length:", metricsC.avgEdgeLength);
console.log("Spring layout - avg edge length:", metricsS.avgEdgeLength);
console.log("Spring layout - min node distance:", metricsS.minNodeDistance);
```

### `combineLayouts()` - Blend Multiple Layouts

Create hybrid layouts by combining different algorithms:

```typescript
const circular = circularLayout(graph);
const spring = springLayout(graph);

// 30% circular structure, 70% force-directed
const hybrid = combineLayouts([circular, spring], [0.3, 0.7]);
```

### `interpolateLayouts()` - Smooth Layout Transitions

Create animation frames between different layouts:

```typescript
const startLayout = circularLayout(graph);
const endLayout = springLayout(graph);

// Generate 30 frames for smooth animation
const frames = interpolateLayouts(startLayout, endLayout, 30);
// Use frames[0] through frames[30] for animation
```

### Helper Usage Patterns

#### Smart Shell Layout

```typescript
// Automatically choose best grouping method based on graph density
const n = graph.nodes().length;
const m = graph.edges().length;
const density = (2 * m) / (n * (n - 1));

const method = density < 0.1 ? "bfs" : density > 0.5 ? "k-core" : "degree";
const shells = groupNodes(graph, method);
const positions = shellLayout(graph, shells);
```

#### Adaptive Layout Selection

```typescript
// Choose layout based on graph properties
let positions;

if (detectBipartite(graph)) {
    const { setA } = detectBipartite(graph);
    positions = bipartiteLayout(graph, setA);
} else if (graph.nodes().length > 100) {
    // Large graph - use fast layout
    positions = circularLayout(graph);
} else {
    // Default to auto-configured force layout
    const config = autoConfigureForce(graph);
    positions = springLayout(graph, config.k, null, null, config.iterations);
}
```

#### Progressive Layout Refinement

```typescript
// Start with fast layout, progressively refine
const initial = circularLayout(graph);
const refined = springLayout(graph, null, initial, null, 50);
const final = kamadaKawaiLayout(graph, null, refined);
```

### Layout Helper Quick Reference

| Helper Function                  | Purpose                         | Best Use Case                         |
| -------------------------------- | ------------------------------- | ------------------------------------- |
| `groupNodes(graph, 'degree')`    | Group by connectivity           | Shell layouts for scale-free networks |
| `groupNodes(graph, 'bfs')`       | Group by distance from root     | Hierarchical/tree layouts             |
| `groupNodes(graph, 'k-core')`    | Group by subgraph density       | Social network analysis               |
| `groupNodes(graph, 'community')` | Group by detected communities   | Modular network visualization         |
| `detectBipartite(graph)`         | Check if graph is bipartite     | Matching problems, assignments        |
| `findBestRoot(graph)`            | Find optimal tree root          | BFS layout, hierarchical layout       |
| `autoConfigureForce(graph)`      | Auto-configure force parameters | Any force-directed layout             |
| `layoutQuality(graph, pos)`      | Measure layout quality          | Comparing different layouts           |
| `combineLayouts([...], [...])`   | Blend multiple layouts          | Custom hybrid visualizations          |
| `interpolateLayouts(from, to)`   | Create animation frames         | Interactive transitions               |

## Usage Examples

### Circular Layout

```typescript
// Use our graph generator instead of manual construction
const graph = cycleGraph(8);

const positions = circularLayout(graph);
// Nodes arranged in a perfect circle
```

### Spring Layout (Fruchterman-Reingold)

```typescript
// Generate a grid and apply force-directed layout with auto-configured parameters
const graph = gridGraph(5, 5);
const config = autoConfigureForce(graph);

const positions = springLayout(
    graph,
    config.k, // optimal distance
    null, // initial positions
    null, // fixed nodes
    config.iterations, // iterations
);

// Or use fruchtermanReingoldLayout (same function)
const positions2 = fruchtermanReingoldLayout(graph, config.k);
```

### Bipartite graph layout

```typescript
// Generate a bipartite graph and detect sets automatically
const graph = bipartiteGraph(4, 6, 0.5, 42);

// Option 1: Use the built-in sets
const positions = bipartiteLayout(graph, graph.setA, "vertical");

// Option 2: Auto-detect bipartite structure
const detected = detectBipartite(graph);
if (detected) {
    const positions2 = bipartiteLayout(graph, detected.setA, "horizontal");
}
```

## 3D Support

All layout algorithms support 3D positioning by setting the `dim` parameter to 3:

```typescript
// Any layout algorithm in 3D
const positions3D = springLayout(graph, null, null, null, 50, 1, [0, 0, 0], 3);
// Returns: { node1: [x, y, z], node2: [x, y, z], ... }

// ForceAtlas2 in 3D
const fa3D = forceatlas2Layout(graph, null, 100, 1, 2, 1, false, false, null, null, null, false, false, 42, 3);

// Circular layout in 3D (creates a sphere)
const circular3D = circularLayout(graph, 1, [0, 0, 0], 3);
```

When using 3D layouts, positions will have three coordinates `[x, y, z]` instead of two.

## Common Parameters

Most layout functions share these parameters:

- **scale** (number): Scale factor for positions (default: 1)
- **center** (number[]): Center coordinates around which to center the layout (default: [0, 0] for 2D, [0, 0, 0] for 3D)
- **dim** (number): Layout dimension - 2D or 3D (default: 2)
- **seed** (number): Seed for random generation (for reproducible layouts)

## TypeScript Types

```typescript
type Node = string | number;
type Edge = [Node, Node];
type PositionMap = Record<Node, number[]>;

interface Graph {
    nodes?: () => Node[];
    edges?: () => Edge[];
    getEdgeData?: (source: Node, target: Node, attr: string) => any;
}
```

## Utilities

### Layout Rescaling

```typescript
import { rescaleLayout } from "./layout.js";

// Rescale existing positions
const scaledPositions = rescaleLayout(positions, 2.0, [10, 10]);
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
// Generate any graph and apply random layout
const graph = completeGraph(10);
const positions = randomLayout(graph, [0, 0], 2, 42);
// Nodes randomly placed in unit square with seed 42
```

### Circular Layout

```typescript
// Perfect for cyclic or complete graphs
const graph = cycleGraph(12);
const positions = circularLayout(graph);
// 12 nodes evenly spaced on a circle
```

### Shell Layout

```typescript
// Use automatic node grouping for shell layout
const graph = scaleFreeGraph(30, 2, 42);

// Group nodes by degree (hubs in center)
const shells = groupNodes(graph, "degree", 3);
const positions = shellLayout(graph, shells);

// Or group by k-core for social networks
const kCoreShells = groupNodes(graph, "k-core");
const positions2 = shellLayout(graph, kCoreShells);
```

### Spring Layout (Fruchterman-Reingold)

```typescript
// Auto-configure parameters based on graph size
const graph = randomGraph(20, 0.2, 42);
const config = autoConfigureForce(graph);

const positions = springLayout(
    graph,
    config.k, // optimal distance
    null, // initial positions
    null, // fixed nodes
    config.iterations, // iterations
);
```

### Spectral Layout

```typescript
// Great for revealing graph structure
const graph = gridGraph(6, 6);
const positions = spectralLayout(graph);
// Grid structure preserved in spectral embedding
```

### Spiral Layout

```typescript
// Perfect for sequential or time-based data
const graph = cycleGraph(50);
const positions = spiralLayout(
    graph,
    1, // scale
    [0, 0], // center
    2, // dim
    0.35, // resolution
    true, // equidistant points
);
```

### Bipartite Layout

```typescript
// Generate bipartite graph and layout automatically
const graph = bipartiteGraph(5, 7, 0.4, 42);
const positions = bipartiteLayout(
    graph,
    graph.setA, // first group nodes (auto-generated)
    "vertical", // align: 'vertical' or 'horizontal'
    1, // scale
    [0, 0], // center
    4 / 3, // aspectRatio
);
```

### Multipartite Layout

```typescript
// Use automatic layer detection with groupNodes
const graph = scaleFreeGraph(20, 2, 42);
const layers = groupNodes(graph, "bfs", 0, { root: findBestRoot(graph) });

// Convert to multipartite format
const layerMap = {};
layers.forEach((nodes, i) => {
    layerMap[i] = nodes;
});

const positions = multipartiteLayout(
    graph,
    layerMap, // subsetKey: layer mapping
    "vertical", // align
    1, // scale
    [0, 0], // center
);
```

### BFS Layout

```typescript
// Use automatic root detection for tree-like graphs
const graph = starGraph(10);
const root = findBestRoot(graph); // Automatically finds node 0 (hub)

const positions = bfsLayout(
    graph,
    root, // start: best root node
    "vertical", // align
    1, // scale
    [0, 0], // center
);
```

### Planar Layout

```typescript
// Create a planar graph (grid is always planar)
const graph = gridGraph(4, 4);
const positions = planarLayout(graph, 1, [0, 0], 2);
// Note: throws error if graph is not planar

// For unknown graphs, check planarity first
if (isPlanar(graph)) {
    const positions = planarLayout(graph);
} else {
    // Fall back to non-planar layout
    const positions = springLayout(graph);
}
```

### Kamada-Kawai Layout

```typescript
// Great for small to medium graphs
const graph = wheelGraph(8);
const positions = kamadaKawaiLayout(
    graph,
    null, // dist: distance matrix (auto)
    null, // pos: initial positions (auto)
    "weight", // weight: edge weight attribute
    1, // scale
    [0, 0], // center
    2, // dim
);
```

### ForceAtlas2 Layout

```typescript
// Auto-configure for your graph type
const graph = scaleFreeGraph(50, 3, 42);
const config = autoConfigureForce(graph);

const positions = forceatlas2Layout(
    graph,
    null, // pos: initial positions
    config.iterations, // maxIter: auto-configured
    1.0, // jitterTolerance
    config.scalingRatio, // scalingRatio: auto-configured
    config.gravity, // gravity: auto-configured
    false, // distributedAction
    false, // strongGravity
    null, // nodeMass: node masses
    null, // nodeSize: node sizes
    null, // weight: weight attribute
    true, // dissuadeHubs: good for scale-free
    false, // linlog: logarithmic attraction
    42, // seed
    2, // dim: 2 for 2D, 3 for 3D
);

// 3D layout example
const positions3D = forceatlas2Layout(
    graph,
    null,
    100,
    1.0,
    2.0,
    1.0,
    false,
    false,
    null,
    null,
    null,
    false,
    false,
    42,
    3, // 3D mode - returns [x, y, z] coordinates
);
```

### ARF Layout

```typescript
// Layout with attractive and repulsive forces
const graph = completeGraph(10);
const positions = arfLayout(
    graph,
    null, // pos: initial positions
    1, // scaling
    1.1, // a: spring force (must be > 1)
    1000, // maxIter
    42, // seed
);
```

## Advanced Examples: Combining Generators and Helpers

### Example 1: Community-Based Visualization

```typescript
// Generate a scale-free network (hubs and communities)
const graph = scaleFreeGraph(100, 3, 42);

// Detect communities and use them for shell layout
const communities = groupNodes(graph, "community", 4);
const positions = shellLayout(graph, communities);

// Or use communities for coloring in your visualization
const communityMap = new Map();
communities.forEach((nodes, idx) => {
    nodes.forEach((node) => communityMap.set(node, idx));
});
```

### Example 2: Adaptive Layout Selection

```typescript
function chooseOptimalLayout(graph) {
    const n = graph.nodes().length;
    const m = graph.edges().length;
    const density = (2 * m) / (n * (n - 1));

    // Check for special graph types
    const bipartite = detectBipartite(graph);
    if (bipartite) {
        return bipartiteLayout(graph, bipartite.setA);
    }

    // Choose based on graph properties
    if (n > 100) {
        // Large graph - use fast circular layout
        return circularLayout(graph);
    } else if (density < 0.1) {
        // Sparse graph - use spring layout
        const config = autoConfigureForce(graph);
        return springLayout(graph, config.k, null, null, config.iterations);
    } else {
        // Dense graph - use spectral or kamada-kawai
        return n < 50 ? kamadaKawaiLayout(graph) : spectralLayout(graph);
    }
}

// Usage
const graph = randomGraph(30, 0.3, 42);
const positions = chooseOptimalLayout(graph);
```

### Example 3: Animated Layout Transitions

```typescript
// Start with circular layout
const graph = completeGraph(15);
const startLayout = circularLayout(graph);

// Optimize with force-directed
const config = autoConfigureForce(graph);
const endLayout = springLayout(graph, config.k, null, null, config.iterations);

// Create smooth animation frames
const frames = interpolateLayouts(startLayout, endLayout, 60);

// Use frames[0] through frames[60] for animation
function animate(frameIndex) {
    const positions = frames[frameIndex];
    // Update your visualization with these positions
}
```

### Example 4: Hierarchical Network Analysis

```typescript
// Generate a preferential attachment network
const graph = scaleFreeGraph(50, 2, 42);

// Find natural hierarchy using k-core decomposition
const kCores = groupNodes(graph, "k-core");

// Layout with most connected nodes in center
const positions = shellLayout(graph, kCores);

// Or create a tree-like view
const root = findBestRoot(graph);
const bfsPositions = bfsLayout(graph, root);
```

### Example 5: Quality-Driven Layout

```typescript
// Try multiple layouts and pick the best
function findBestLayout(graph) {
    const candidates = [
        { name: "circular", positions: circularLayout(graph) },
        { name: "spectral", positions: spectralLayout(graph) },
        { name: "spring", positions: springLayout(graph) },
    ];

    let best = candidates[0];
    let bestScore = Infinity;

    candidates.forEach((candidate) => {
        const quality = layoutQuality(graph, candidate.positions);
        const score = quality.edgeLengthStdDev / quality.avgEdgeLength;

        if (score < bestScore) {
            bestScore = score;
            best = candidate;
        }
    });

    console.log(`Best layout: ${best.name} (score: ${bestScore.toFixed(3)})`);
    return best.positions;
}
```

### Example 6: Hybrid Layouts

```typescript
// Create a graph with clear structure
const graph = gridGraph(6, 6);

// Get geometric and force-based layouts
const grid = circularLayout(graph);
const force = springLayout(graph);

// Blend them: 40% geometric structure, 60% force optimization
const hybrid = combineLayouts([grid, force], [0.4, 0.6]);

// The result preserves some grid structure while optimizing edge lengths
```

## Error Handling

```typescript
try {
    const positions = planarLayout(nonPlanarGraph);
} catch (error) {
    console.error("Graph is not planar:", error.message);
}

try {
    const positions = arfLayout(graph, null, 1, 0.5); // a <= 1
} catch (error) {
    console.error("Invalid parameter a:", error.message);
}
```

## Installation

```bash
npm install @graphty/layout
```

## Building from Source

If you want to build the TypeScript module from source:

1. **Clone the repository:**

    ```bash
    git clone https://github.com/graphty-org/layout.git
    cd layout
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Compile TypeScript to JavaScript:**

    ```bash
    npm run build
    ```

    This will compile the `layout.ts` file to JavaScript and generate type declarations in the `dist/` directory.

4. **For development with automatic compilation:**

    ```bash
    npm run dev
    ```

    This will watch for changes and automatically recompile the TypeScript files.

## Development Server

The project includes a Vite development server for testing and viewing examples.

### Starting the Development Server

```bash
npm run serve
```

This will:

- Start a development server on port 3000
- Automatically open your browser to `/examples/`
- Provide hot module reloading for development

### Configuring the Development Server

You can customize the server configuration using environment variables:

1. **Create a `.env` file** (copy from `.env.example`):

    ```bash
    cp .env.example .env
    ```

2. **Configure server options in `.env`:**

    ```bash
    # Server host (defaults to true for network exposure)
    HOST=localhost    # For local-only access
    HOST=0.0.0.0     # For network access
    HOST=my.server.com # For custom domain

    # Server port (defaults to 3000)
    PORT=3000
    PORT=8080        # Custom port
    ```

3. **Start the server with your configuration:**
    ```bash
    npm run serve
    ```

### Alternative: Build and Serve

To build the project and then serve the examples:

```bash
npm run examples
```

This command:

1. Builds the TypeScript files to JavaScript
2. Starts the Vite development server

**Note:** The compiled JavaScript files will be available in the `dist/` directory. You can import from the compiled JavaScript files or directly use the TypeScript source files in a TypeScript project.

## Implementation

The module includes complete implementations of:

- **Random Number Generator** with seed support for reproducible results
- **Mathematical utilities** similar to NumPy for multidimensional array operations
- **Force-directed algorithms** with L-BFGS optimization for Kamada-Kawai
- **Planarity algorithms** including Left-Right test for planar graphs
- **Auto-scaling system** to automatically normalize positions

## Performance Tips

1. **Large Graphs (>1000 nodes)**:

    ```typescript
    // Use fast layouts first
    const initial = circularLayout(graph);
    // Then refine with limited iterations
    const refined = springLayout(graph, null, initial, null, 50);
    ```

2. **Dense Graphs**:

    ```typescript
    // Use spectral layout for dense graphs
    const density = (2 * m) / (n * (n - 1));
    if (density > 0.5) {
        const positions = spectralLayout(graph);
    }
    ```

3. **Real-time Updates**:

    ```typescript
    // Pre-calculate layout quality
    const quality = layoutQuality(graph, positions);
    // Use interpolation for smooth updates
    const frames = interpolateLayouts(oldPositions, newPositions, 30);
    ```

4. **Memory Optimization**:
    ```typescript
    // For very large graphs, use generators
    function* layoutInChunks(graph, chunkSize = 100) {
        const nodes = graph.nodes();
        for (let i = 0; i < nodes.length; i += chunkSize) {
            const chunk = nodes.slice(i, i + chunkSize);
            // Process chunk...
            yield chunk;
        }
    }
    ```

## Development

### Building the Project

The project uses a unified build system:

```bash
# Build TypeScript to JavaScript
npm run build

# Build the bundled ES module (dist/layout.js)
npm run build:bundle

# Build everything
npm run build:all
```

### Running Examples Locally

```bash
# Start development server with examples
npm run examples
# or
npm run serve
```

This will:

1. Build the bundled `dist/layout.js`
2. Start a Vite dev server at http://localhost:3000
3. Automatically redirect imports to use the bundled version

### Building for GitHub Pages

To build a static site for GitHub Pages deployment:

```bash
# Build static site in gh-pages/ directory
npm run build:gh-pages
```

This creates a `gh-pages/` directory with:

- All example HTML files
- The bundled `layout.js`
- All necessary assets

To deploy to GitHub Pages, see `gh-pages/DEPLOY.md` after building.

### Development Workflow

1. **Make changes** to TypeScript source files in `src/`
2. **Test locally** with `npm run examples`
3. **Run tests** with `npm test`
4. **Build for production** with `npm run build:all`
5. **Deploy examples** with `npm run build:gh-pages`

## Recent Updates

### Version 1.2.7 (Latest)

- **Fixed**: ForceAtlas2 now correctly returns numeric Z coordinates in 3D mode (previously returned NaN)
- **Fixed**: NPM package now uses the correct bundled entry point (`dist/layout.js`)
- **Added**: Full 3D support documentation and examples

## Contributing

This project is a TypeScript port of the NetworkX Python library. For contributions and issues, visit the [GitHub repository](https://github.com/graphty-org/layout).

## License

MIT License - see LICENSE file for details.
