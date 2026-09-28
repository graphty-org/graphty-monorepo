# @graphty/layout

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/layout/api/generated/)
[![Storybook](https://img.shields.io/badge/storybook-interactive%20demos-ff4785)](https://graphty.app/storybook/layout/)
[![Examples](https://img.shields.io/badge/demo-github%20pages-blue)](https://graphty.app/layout/examples/index.html)

**[View Interactive Storybook →](https://graphty.app/storybook/layout/)** | **[Legacy Examples →](https://graphty.app/layout/examples/index.html)**

Layout is a TypeScript library for positioning nodes in graphs. It's a TypeScript port of the [layout algorithms](https://networkx.org/documentation/stable/reference/drawing.html) from the Python [NetworkX](https://networkx.org/documentation/stable/) library.

## Features

Every layout takes a frozen [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot and
an options object, and returns a `LayoutResult`: a flat `Float32Array` with `dim` (2 or 3) values per node, row `i`
belonging to node index `i`. They are reached through the `indexed` namespace:

- `indexed.random` - Places nodes randomly in a unit square
- `indexed.circular` - Places nodes on a circle
- `indexed.shell` - Places nodes in concentric circles (shells)
- `indexed.fruchtermanReingold` - The Fruchterman-Reingold spring layout, with attractions and repulsions
- `indexed.forceAtlas2` - ForceAtlas2, a force-directed layout for large and scale-free graphs
- `indexed.arf` - Attractive and repulsive forces
- `indexed.kamadaKawai` - Minimises a cost based on shortest-path lengths
- `indexed.spectral` - Uses eigenvectors of the graph's Laplacian matrix
- `indexed.spiral` - Places nodes along a spiral
- `indexed.grid` - Rows and columns on an evenly spaced lattice, in node order
- `indexed.radial` - Concentric rings by hop distance from a root node
- `indexed.bipartite` - Two straight lines, for bipartite graphs
- `indexed.multipartite` - One line per layer
- `indexed.bfs` - One line per breadth-first-search level
- `indexed.planar` - No edge crossings, for planar graphs

Additionally, the library includes steppable force simulations (`createSimulation`, `ForceAtlas2Simulation`,
`FruchtermanReingoldSimulation`) that a host can advance frame by frame, and helpers that convert a layout result to
an id-keyed map or to a scene position column.

The id-keyed functions (`circularLayout`, `springLayout`, `forceatlas2Layout` and the rest, which take a
`nodes()` / `edges()` object and positional parameters) and the graph generators exported beside them are the
previous API. They are deprecated and will be removed in layout's next major version; new code uses the snapshot
layouts shown here, and [`@graphty/graph-samples/generators`](../graph-samples/README.md) for generated graphs.

## Installation

```bash
npm install @graphty/layout @graphty/graph-format
```

## Quick Start

Build a snapshot, lay it out, and map the rows back to your node ids:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed, toPositionMap } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "a");
builder.addEdge("c", "d");
const s = builder.freeze();

const result = indexed.circular(s, { scale: 100 });
console.log(result.dim, result.n); // 2 4
console.log(result.positions); // Float32Array [x0, y0, x1, y1, ...] in node-index order

const byId = toPositionMap(result, s.ids);
console.log(byId.a); // [100, 0]: node "a" as [x, y]
```

## The graph

A layout reads a `GraphSnapshot` from `@graphty/graph-format`. Build one with `GraphBuilder` (ids are strings or
numbers; node indices follow first appearance), load one from typed arrays with `fromEdgeArrays`, or import a file with
[`@graphty/graph-io`](https://www.npmjs.com/package/@graphty/graph-io).

A layout treats a directed snapshot as undirected. Edge weights, when a layout reads them, are the snapshot's own
(`weight: true`) or a numeric edge column named in the options.

Code that still holds a `nodes()` / `edges()` object or a plain node list converts it once with `toLayoutSnapshot`:

<!-- doc-check -->

```typescript
import { indexed, toLayoutSnapshot } from "@graphty/layout";

const graph = {
    nodes: () => [0, 1, 2, 3],
    edges: (): [number, number][] => [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
    ],
};
const s = toLayoutSnapshot(graph); // the undirected snapshot of the object
const result = indexed.spectral(s);
console.log(result.n); // 4
```

## Generated graphs

[`@graphty/graph-samples/generators`](../graph-samples/README.md) produces seeded graphs as typed arrays that
`fromEdgeArrays` freezes in one call. Their ground-truth columns (a community, a layer, a bipartite side) arrive as node
columns that a layout can name:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph, gridGraph, randomDagGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const grid = fromEdgeArrays(gridGraph({ rows: 5, cols: 5 }));
const springs = indexed.fruchtermanReingold(grid, { iterations: 100, seed: 42 });

const hubs = fromEdgeArrays(barabasiAlbertGraph({ n: 200, m: 2, seed: 42 }));
const fa2 = indexed.forceAtlas2(hubs, { maxIter: 200, scalingRatio: 2, gravity: 1, dissuadeHubs: true, seed: 42 });

const dag = fromEdgeArrays(randomDagGraph({ layers: [3, 4, 3], p: 0.5, seed: 1 }));
const layered = indexed.multipartite(dag, { subsets: "layer" }); // one column per value of the u32 "layer" column

console.log(springs.n, fa2.n, layered.n); // 25 200 10
```

## Layouts

Every example below builds its graph with a graph-samples generator; any snapshot works the same way.

### Random

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 10 }));
const result = indexed.random(s, { seed: 42 });
// each node in [0, 1) x [0, 1); for random, `center` is the lowest corner of that cell
console.log(result.positions.length); // 20
```

### Circular

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 12 }));
const result = indexed.circular(s, { scale: 2, center: [10, 10] });
console.log(result.n); // 12 nodes evenly spaced on a circle of radius 2 around (10, 10)
```

### Shell

Shells are listed innermost first, as arrays of node indices or as the name of a `u32` node column whose equal values
form one shell:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { plantedPartitionGraph, starGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

// the hub alone in the centre, the rim around it
const star = fromEdgeArrays(starGraph({ n: 8 }));
const hubFirst = indexed.shell(star, { nlist: [[0], [1, 2, 3, 4, 5, 6, 7]] });

// one shell per planted community
const groups = fromEdgeArrays(plantedPartitionGraph({ groups: 3, groupSize: 10, pIn: 0.5, pOut: 0.02, seed: 7 }));
const byCommunity = indexed.shell(groups, { nlist: "community" });

console.log(hubFirst.n, byCommunity.n); // 8 30
```

### Fruchterman-Reingold (spring)

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(erdosRenyiGraph({ n: 20, p: 0.2, seed: 42 }));
const result = indexed.fruchtermanReingold(s, {
    k: null, // optimal distance between nodes; default 1 / sqrt(n)
    iterations: 50,
    seed: 42,
});
console.log(result.n); // 20
```

### ForceAtlas2

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(barabasiAlbertGraph({ n: 50, m: 3, seed: 42 }));
const result = indexed.forceAtlas2(s, {
    maxIter: 100,
    jitterTolerance: 1,
    scalingRatio: 2,
    gravity: 1,
    strongGravity: false,
    distributedAction: false,
    dissuadeHubs: true, // good for scale-free graphs
    linlog: false, // logarithmic attraction
    weight: null, // true for the snapshot's weights, or an edge column name
    seed: 42,
});
console.log(result.n); // 50
```

### ARF

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 10 }));
const result = indexed.arf(s, {
    scaling: 1,
    a: 1.1, // spring force; must be larger than 1
    maxIter: 1000,
    seed: 42,
});
console.log(result.n); // 10
```

### Kamada-Kawai

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { wheelGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(wheelGraph({ n: 8 }));
const result = indexed.kamadaKawai(s, {
    dist: null, // node-to-node target distances; default the shortest-path lengths
    pos: null, // start positions, `dim` values per node; default a circular layout
    weight: null, // true for the snapshot's weights, or an edge column name
});
console.log(result.n); // 8
```

### Spectral

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(gridGraph({ rows: 6, cols: 6 }));
const result = indexed.spectral(s); // the grid's structure survives in the spectral embedding
console.log(result.n); // 36
```

### Spiral

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 50 }));
const result = indexed.spiral(s, { resolution: 0.35, equidistant: true });
console.log(result.n); // 50
```

### Grid and radial

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { balancedTreeGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(balancedTreeGraph({ branching: 2, height: 3 }));
const lattice = indexed.grid(s, { columns: 5 }); // node order, five per row
const rings = indexed.radial(s, { root: 0 }); // rings by hop distance from node index 0; default the busiest node
console.log(lattice.n, rings.n); // 15 15
```

### Bipartite

`top` names the nodes of the first line, as a node mask (bit `i` of word `i >> 5` set means node `i`) or as the name of
a `bool` node column. The default is the even node indices.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeBipartiteGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(completeBipartiteGraph({ a: 4, b: 6 })); // node indices 0-3 are the first set
const top = new Uint32Array(Math.ceil(s.nodeCount / 32));
for (let i = 0; i < 4; i++) {
    top[i >> 5] |= 1 << (i & 31);
}
const result = indexed.bipartite(s, { top, align: "vertical", aspectRatio: 4 / 3 });
console.log(result.n); // 10
```

### Multipartite

Layers are arrays of node indices, or the name of a `u32` node column; the default is the column `"subset"`.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { pathGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(pathGraph({ n: 6 }));
const result = indexed.multipartite(s, {
    subsets: [
        [0, 1],
        [2, 3],
        [4, 5],
    ],
    align: "horizontal",
});
console.log(result.n); // 6
```

### BFS

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { starGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(starGraph({ n: 10 }));
const result = indexed.bfs(s, { start: 0, align: "vertical" }); // node index 0 is the hub
console.log(result.n); // 10
```

### Planar

`indexed.planar` throws `G is not planar.` when its check rejects the graph:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph, gridGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const grid = fromEdgeArrays(gridGraph({ rows: 4, cols: 4 }));
const result = indexed.planar(grid);
console.log(result.n); // 16

try {
    indexed.planar(fromEdgeArrays(completeGraph({ n: 5 })));
} catch (error) {
    console.log((error as Error).message); // "G is not planar."
}
```

## Common options

Every layout takes these options besides its own:

- **dim** (`2 | 3`): values per node; default 2
- **scale** (number): size of the layout around its centre; default 1
- **center** (numbers): the centre; missing components are 0; default the origin
- **seed** (number): seed of a layout that draws random numbers, for reproducible layouts

## 3D

Pass `dim: 3` and every row holds `x, y, z`:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 20 }));
const springs3D = indexed.fruchtermanReingold(s, { dim: 3, iterations: 50, seed: 42 });
const fa3D = indexed.forceAtlas2(s, { dim: 3, maxIter: 100, seed: 42 });
const sphere = indexed.circular(s, { dim: 3 });
console.log(springs3D.positions.length, fa3D.dim, sphere.dim); // 60 3 3
```

## TypeScript Types

```text
LayoutResult   { positions: Float32Array; dim: 2 | 3; n: number }   row i = node index i
PositionMap    Record<NodeId, number[]>                            the id-keyed form (toPositionMap)
NodeId         string | number
```

## Position helpers

A `LayoutResult` converts to the other forms a host needs:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import {
    fromPositionColumn,
    fromPositionMap,
    indexed,
    rescaleInPlace,
    toPositionColumn,
    toPositionMap,
} from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const s = builder.freeze();
const result = indexed.circular(s);

const map = toPositionMap(result, s.ids); // { a: [x, y], b: [x, y], c: [x, y] }
// id-keyed map -> flat array; the fill callback writes the row of every node the map does not give
const flat = fromPositionMap(map, s.ids, 2, (i, out) => out.set([0, 0], 2 * i));
rescaleInPlace(flat, 2, 1); // rescale and recentre the flat array in place
const column = toPositionColumn(result, 100, [0, 0, 0]); // stride 3, scene units: v * scale + center
const again = fromPositionColumn(column, 2, 100, [0, 0, 0]); // the inverse
console.log(flat.length, column.length, again.length); // 6 9 6
```

## Steppable simulations

Besides the one-shot layouts, the package exports steppable force simulations that run over a snapshot and a
`Float32Array` you own: three floats per node (`x, y, z` in your scene units), read once at `load()` and updated in
place by every `step()`. That is the contract a host needs to animate a layout frame by frame, pin nodes and drag them
while the forces keep running.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { createSimulation, seedPositions } from "@graphty/layout";

const s = fromEdgeArrays(barabasiAlbertGraph({ n: 100, m: 2, seed: 42 })); // an undirected snapshot
const positions = new Float32Array(3 * s.nodeCount).fill(NaN); // the array you own: stride 3, scene units
seedPositions(s, positions, 42, 2, 100, null, "fa2"); // draws every NaN row from seed 42 into [-100, 100)
const sim = createSimulation("forceatlas2", { scale: 100, maxIter: 300 });
sim.load(s, positions);
while (!sim.settled) {
    sim.step(); // one iteration; positions holds the new scene coordinates after every call
}
sim.dispose();
```

- **Types**: `"forceatlas2"` runs `ForceAtlas2Simulation` (the published ForceAtlas2 laws;
  `new ForceAtlas2Simulation({ compat: "networkx" })` reproduces NetworkX's variant); `"fruchtermanReingold"` and its
  alias `"spring"` run `FruchtermanReingoldSimulation`; `"spring-electrical"` has no CPU simulation and needs an
  accelerator.
- **Snapshot**: `load()` requires an undirected snapshot; `toLayoutSnapshot(s)` returns the undirected copy of a
  directed one.
- **Options**: the layout's own parameters (`maxIter`, `gravity`, `linlog`, ... for ForceAtlas2; `k`, `iterations`,
  `fixed` for Fruchterman-Reingold) plus `dim`, `scale`, `center` and the settle rule `settleThreshold` /
  `settleWindow`: `settled` becomes true at the iteration budget or once the mean free-node displacement has stayed
  at or below `settleThreshold` times the layout's RMS radius for `settleWindow` iterations.
- **Units**: the simulation runs in layout units and maps them to your array with `scale` and `center`, so pass the same
  `scale` / `center` to `seedPositions` and to the simulation. Nothing is rescaled per step: a pinned or dragged node
  stays where you put it.
- **Pins and drags**: `setFixed(mask)` takes a bitmask in graph-format's `NodeMask` layout (one bit per node index);
  `setPosition(index, x, y, z)` writes a node's scene position immediately and reheats the simulation.
- **Accelerators**: `createSimulation(type, options, accelerator)` returns the accelerator's simulation when it
  implements the type (`@graphty/webgpu-graph-algorithms` provides one) and the CPU class otherwise. A GPU
  simulation's `step()` returns a `Promise`, so `await sim.step()` when the simulation may come from either.

## Error Handling

Invalid input throws an `Error` whose message names the problem:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 5 }));
try {
    indexed.arf(s, { a: 0.5 });
} catch (error) {
    console.log((error as Error).message); // "The parameter a should be larger than 1"
}
```

## Performance Tips

- **Large graphs**: `indexed.circular`, `indexed.random` and `indexed.grid` are linear; start a force layout from one of
  them through `pos` and give it fewer iterations, or animate `createSimulation` and stop when `settled`.
- **Dense graphs**: `indexed.spectral` is often clearer than a force layout.
- **Workers**: a snapshot and a `LayoutResult` are typed arrays, so both transfer to and from a Web Worker without
  copying.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { indexed } from "@graphty/layout";

const s = fromEdgeArrays(erdosRenyiGraph({ n: 2000, p: 0.002, seed: 3 }));
const start = indexed.circular(s);
const refined = indexed.fruchtermanReingold(s, { pos: start.positions, iterations: 20 });
console.log(refined.n); // 2000
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

- Start a development server on the port in `PORT` (required, e.g. `PORT=3000 npm run serve`)
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
    ```

3. **Start the server with your configuration** (the port is required and comes from `PORT`):
    ```bash
    PORT=3000 npm run serve
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
2. Start a Vite dev server on the port in `PORT`
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

This project is a TypeScript port of the NetworkX Python library. For contributions and issues, visit the [GitHub repository](https://github.com/graphty-org/graphty-monorepo/tree/master/layout).

## License

MIT License - see LICENSE file for details.
