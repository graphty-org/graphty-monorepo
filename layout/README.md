# @graphty/layout

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/layout/api/generated/)
[![Storybook](https://img.shields.io/badge/storybook-interactive%20demos-ff4785)](https://graphty.app/storybook/layout/)

**[View Interactive Storybook ->](https://graphty.app/storybook/layout/)**

Layout is a TypeScript library for positioning nodes in graphs. It's a TypeScript port of the [layout algorithms](https://networkx.org/documentation/stable/reference/drawing.html) from the Python [NetworkX](https://networkx.org/documentation/stable/) library.

## Features

Every layout takes a frozen [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot and
an options object, and returns a `LayoutResult`: a flat `Float32Array` with `dim` (2 or 3) values per node, row `i`
belonging to node index `i`. Each is a top-level export:

- `random` - Places nodes randomly in a unit square
- `circular` - Places nodes on a circle
- `shell` - Places nodes in concentric circles (shells)
- `fruchtermanReingold` - The Fruchterman-Reingold spring layout, with attractions and repulsions
- `forceAtlas2` - ForceAtlas2, a force-directed layout for large and scale-free graphs
- `arf` - Attractive and repulsive forces
- `kamadaKawai` - Minimises a cost based on shortest-path lengths
- `spectral` - Uses eigenvectors of the graph's Laplacian matrix
- `spiral` - Places nodes along a spiral
- `grid` - Rows and columns on an evenly spaced lattice, in node order
- `radial` - Concentric rings by hop distance from a root node
- `bipartite` - Two straight lines, for bipartite graphs
- `multipartite` - One line per layer
- `bfs` - One line per breadth-first-search level
- `planar` - No edge crossings, for planar graphs

Additionally, the library includes steppable force simulations (`createSimulation`, `ForceAtlas2Simulation`,
`FruchtermanReingoldSimulation`) that a host can advance frame by frame, and helpers that convert a layout result to
an id-keyed map or to a scene position column.

Layout 2.0.0 removed the id-keyed functions (`circularLayout`, `springLayout`, `forceatlas2Layout` and the rest)
and the graph generators; see [Migrating from 1.x](#migrating-from-1x). `indexed` is a deprecated alias of the
snapshot layouts, kept until 3.0.0.

## Installation

```bash
npm install @graphty/layout @graphty/graph-format
```

## Quick Start

Build a snapshot, lay it out, and map the rows back to your node ids:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { circular, toPositionMap } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "a");
builder.addEdge("c", "d");
const s = builder.freeze();

const result = circular(s, { scale: 100 });
console.log(result.dim, result.n); // 2 4
// A Float32Array [x0, y0, x1, y1, ...] in node-index order
console.log(result.positions);

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
import { spectral, toLayoutSnapshot } from "@graphty/layout";

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
const result = spectral(s);
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
import { forceAtlas2, fruchtermanReingold, multipartite } from "@graphty/layout";

const grid = fromEdgeArrays(gridGraph({ rows: 5, cols: 5 }));
const springs = fruchtermanReingold(grid, { iterations: 100, seed: 42 });

const hubs = fromEdgeArrays(barabasiAlbertGraph({ n: 200, m: 2, seed: 42 }));
const fa2 = forceAtlas2(hubs, { maxIter: 200, scalingRatio: 2, gravity: 1, dissuadeHubs: true, seed: 42 });

const dag = fromEdgeArrays(randomDagGraph({ layers: [3, 4, 3], p: 0.5, seed: 1 }));
const layered = multipartite(dag, { subsets: "layer" }); // one column per value of the u32 "layer" column

console.log(springs.n, fa2.n, layered.n); // 25 200 10
```

## Layouts

Every example below builds its graph with a graph-samples generator; any snapshot works the same way.

### Random

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { random } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 10 }));
const result = random(s, { seed: 42 });
// each node in [0, 1) x [0, 1); for random, `center` is the lowest corner of that cell
console.log(result.positions.length); // 20
```

### Circular

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 12 }));
const result = circular(s, { scale: 2, center: [10, 10] });
console.log(result.n); // 12 nodes evenly spaced on a circle of radius 2 around (10, 10)
```

### Shell

Shells are listed innermost first, as arrays of node indices or as the name of a `u32` node column whose equal values
form one shell:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { plantedPartitionGraph, starGraph } from "@graphty/graph-samples/generators";
import { shell } from "@graphty/layout";

// the hub alone in the centre, the rim around it
const star = fromEdgeArrays(starGraph({ n: 8 }));
const hubFirst = shell(star, { nlist: [[0], [1, 2, 3, 4, 5, 6, 7]] });

// one shell per planted community
const groups = fromEdgeArrays(plantedPartitionGraph({ groups: 3, groupSize: 10, pIn: 0.5, pOut: 0.02, seed: 7 }));
const byCommunity = shell(groups, { nlist: "community" });

console.log(hubFirst.n, byCommunity.n); // 8 30
```

### Fruchterman-Reingold (spring)

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { fruchtermanReingold } from "@graphty/layout";

const s = fromEdgeArrays(erdosRenyiGraph({ n: 20, p: 0.2, seed: 42 }));
const result = fruchtermanReingold(s, {
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
import { forceAtlas2 } from "@graphty/layout";

const s = fromEdgeArrays(barabasiAlbertGraph({ n: 50, m: 3, seed: 42 }));
const result = forceAtlas2(s, {
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
import { arf } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 10 }));
const result = arf(s, {
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
import { kamadaKawai } from "@graphty/layout";

const s = fromEdgeArrays(wheelGraph({ n: 8 }));
const result = kamadaKawai(s, {
    dist: null, // node-to-node target distances; default the shortest-path lengths
    pos: null, // start positions, `dim` values per node; default a circle in 2D, a seeded random cube in 3D
    weight: null, // true for the snapshot's weights, or an edge column name
});
console.log(result.n); // 8
```

### Spectral

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { spectral } from "@graphty/layout";

const s = fromEdgeArrays(gridGraph({ rows: 6, cols: 6 }));
const result = spectral(s); // the grid's structure survives in the spectral embedding
console.log(result.n); // 36
```

### Spiral

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { spiral } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 50 }));
const result = spiral(s, { resolution: 0.35, equidistant: true });
console.log(result.n); // 50
```

### Grid and radial

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { balancedTreeGraph } from "@graphty/graph-samples/generators";
import { grid, radial } from "@graphty/layout";

const s = fromEdgeArrays(balancedTreeGraph({ branching: 2, height: 3 }));
const lattice = grid(s, { columns: 5 }); // node order, five per row
const rings = radial(s, { root: 0 }); // rings by hop distance from node index 0; default the busiest node
console.log(lattice.n, rings.n); // 15 15
```

### Bipartite

`top` names the nodes of the first line, as a node mask (bit `i` of word `i >> 5` set means node `i`) or as the name of
a `bool` node column. The default is the even node indices.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeBipartiteGraph } from "@graphty/graph-samples/generators";
import { bipartite } from "@graphty/layout";

const s = fromEdgeArrays(completeBipartiteGraph({ a: 4, b: 6 })); // node indices 0-3 are the first set
const top = new Uint32Array(Math.ceil(s.nodeCount / 32));
for (let i = 0; i < 4; i++) {
    top[i >> 5] |= 1 << (i & 31);
}
const result = bipartite(s, { top, align: "vertical", aspectRatio: 4 / 3 });
console.log(result.n); // 10
```

### Multipartite

Layers are arrays of node indices, or the name of a `u32` node column; the default is the column `"subset"`.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { pathGraph } from "@graphty/graph-samples/generators";
import { multipartite } from "@graphty/layout";

const s = fromEdgeArrays(pathGraph({ n: 6 }));
const result = multipartite(s, {
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
import { bfs } from "@graphty/layout";

const s = fromEdgeArrays(starGraph({ n: 10 }));
const result = bfs(s, { start: 0, align: "vertical" }); // node index 0 is the hub
console.log(result.n); // 10
```

### Planar

`planar` throws `G is not planar.` when its check rejects the graph:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph, gridGraph } from "@graphty/graph-samples/generators";
import { planar } from "@graphty/layout";

const grid = fromEdgeArrays(gridGraph({ rows: 4, cols: 4 }));
const result = planar(grid);
console.log(result.n); // 16

try {
    planar(fromEdgeArrays(completeGraph({ n: 5 })));
} catch (error) {
    console.log((error as Error).message); // "G is not planar."
}
```

## Common options

Every layout except `arf` takes these options besides its own. `arf` takes only `dim` and `seed` of them, and its
result is not rescaled: the forces settle at their own size, which its `scaling` option sets.

- **dim** (`2 | 3`): values per node; default 2
- **scale** (number): size of the layout around its centre; default 1
- **center** (numbers): the centre; missing components are 0; default the origin
- **seed** (number): seed of a layout that draws random numbers, for reproducible layouts

- **Nodes are indices.** Options that name nodes (`root`, `start`, `top`, `subsets`, `nlist`) take node indices,
  a node mask or the name of a node column of the snapshot, never node ids. Use `s.ids.indexOf(id)` to find one;
  for an id that is not in the graph it returns `INVALID_INDEX` (0xffffffff), not -1.
- **Start positions** (`pos`) are a `Float32Array` of `dim` values per node in index order. For the force layouts
  and `arf` each `NaN` component is drawn from `seed` and the finite components of the same row are kept;
  `kamadaKawai` reads `NaN` as 0.
- **Unplaced nodes**: `shell` and `multipartite` leave the row of a node in no shell or layer as `NaN`, and
  `toPositionMap` leaves such a node out of its map.

## 3D

Pass `dim: 3` and every row holds `x, y, z`:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular, forceAtlas2, fruchtermanReingold } from "@graphty/layout";

const s = fromEdgeArrays(cycleGraph({ n: 20 }));
const springs3D = fruchtermanReingold(s, { dim: 3, iterations: 50, seed: 42 });
const fa3D = forceAtlas2(s, { dim: 3, maxIter: 100, seed: 42 });
const sphere = circular(s, { dim: 3 });
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
    circular,
    fromPositionColumn,
    fromPositionMap,
    rescaleInPlace,
    toPositionColumn,
    toPositionMap,
} from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const s = builder.freeze();
const result = circular(s);

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

## The catalog

`LAYOUTS` describes every layout, keyed by name, so an integration can register them all without keeping its own
table.

<!-- doc-check -->

```typescript
import { LAYOUTS } from "@graphty/layout";

const fa2 = LAYOUTS.forceAtlas2;
console.log(fa2.simulation, fa2.weights, fa2.accelerator); // forceatlas2 on-request forceAtlas2

const gpuOnly = Object.values(LAYOUTS).filter((l) => l.requiresAccelerator);
console.log(gpuOnly.map((l) => l.simulation).join(", ")); // spring-electrical
```

- `fn`: the one-shot function, `fn(snapshot, options)`, or null for a layout that only runs as a simulation.
- `simulation`: the `createSimulation` type that steps it, or null.
- `direction`: the graphs it accepts; every layout takes directed and undirected snapshots.
- `weights`: `"never"`, `"by-default"` (read unless `weight: false`) or `"on-request"` (read only with `weight: true`
  or a weight column name).
- `requiredOptions`: options it cannot run without (`multipartite`'s `subsets`, unless the snapshot has a `subset`
  node column).
- `accelerator` and `requiresAccelerator`: the `LayoutAccelerator` method that can run the simulation, and whether
  there is no CPU implementation.

A test runs every layout to check its entry, so the catalog changes when a layout does.

## Error Handling

Invalid input throws an `Error` whose message names the problem:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { arf } from "@graphty/layout";

const s = fromEdgeArrays(completeGraph({ n: 5 }));
try {
    arf(s, { a: 0.5 });
} catch (error) {
    console.log((error as Error).message); // "The parameter a should be larger than 1"
}
```

## Performance Tips

- **Large graphs**: `circular`, `random` and `grid` are linear; start a force layout from one of
  them through `pos` and give it fewer iterations, or animate `createSimulation` and stop when `settled`.
- **Dense graphs**: `spectral` is often clearer than a force layout.
- **Workers**: a snapshot and a `LayoutResult` are typed arrays, so both transfer to and from a Web Worker without
  copying.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { circular, fruchtermanReingold } from "@graphty/layout";

const s = fromEdgeArrays(erdosRenyiGraph({ n: 2000, p: 0.002, seed: 3 }));
const start = circular(s);
const refined = fruchtermanReingold(s, { pos: start.positions, iterations: 20 });
console.log(refined.n); // 2000
```

## Migrating from 1.x

Layout 2.0.0 removed the positional, id-keyed layout functions and the graph generators. Each layout is now the
function that 1.x exported under the `indexed` namespace, at the top level; `indexed` stays as a deprecated alias
until 3.0.0. To keep 1.x's id-keyed output, convert: `toPositionMap(circular(s, options), s.ids)`, with
`s = toLayoutSnapshot(graph)` for a 1.x graph object.

| 1.x                                                                                 | 2.x                                                                          |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `randomLayout(G, center, dim, seed)`                                                | `random(s, { center, dim, seed })`                                           |
| `circularLayout(G, scale, center, dim)`                                             | `circular(s, { scale, center, dim })`                                        |
| `gridLayout(G, columns, scale, center)`                                             | `grid(s, { columns, scale, center })`                                        |
| `shellLayout(G, nlist, scale, center, dim)`                                         | `shell(s, { nlist, scale, center, dim })`, `nlist` as node indices           |
| `spiralLayout(G, scale, center, dim, resolution, equid.)`                           | `spiral(s, { scale, center, dim, resolution, equidistant })`                 |
| `spectralLayout(G, scale, center, dim, seed)`                                       | `spectral(s, { scale, center, dim, seed })`                                  |
| `planarLayout(G, scale, center, dim, seed)`                                         | `planar(s, { scale, center, dim, seed })`                                    |
| `radialLayout(G, root, scale, center)`                                              | `radial(s, { root, scale, center })`, `root` as a node index                 |
| `bfsLayout(G, start, align, scale, center)`                                         | `bfs(s, { start, align, scale, center })`, `start` as a node index           |
| `bipartiteLayout(G, nodes, align, scale, center, aspect)`                           | `bipartite(s, { top, align, scale, center, aspectRatio })`, `top` a mask     |
| `multipartiteLayout(G, subsetKey, align, scale, center)`                            | `multipartite(s, { subsets, align, scale, center })`                         |
| `kamadaKawaiLayout(G, dist, pos, weight, scale, center, dim)`                       | `kamadaKawai(s, { dist, pos, weight, scale, center, dim })`                  |
| `forceatlas2Layout(G, pos, maxIter, ...)`                                           | `forceAtlas2(s, { pos, maxIter, ... })`                                      |
| `fruchtermanReingoldLayout(G, k, pos, fixed, iterations, ...)`, `springLayout(...)` | `fruchtermanReingold(s, { k, pos, fixed, iterations, ... })`, `fixed` a mask |
| `arfLayout(G, pos, scaling, a, maxIter, seed)`                                      | `arf(s, { pos, scaling, a, maxIter, seed })`                                 |

The graph generators (`completeGraph(n)`, `cycleGraph`, `starGraph`, `wheelGraph`, `gridGraph`, `randomGraph`,
`bipartiteGraph`, `scaleFreeGraph`) are in `@graphty/graph-samples/generators`: `completeGraph({ n })` and the
others under their own names, `randomGraph` as `erdosRenyiGraph`, `bipartiteGraph` as `randomBipartiteGraph` and
`scaleFreeGraph` as `barabasiAlbertGraph`. Their `SampleGraph` becomes a snapshot with `fromEdgeArrays`.

Where the results differ from 1.x:

- `kamadaKawai` reads a zero weight as a zero distance, gives an unreachable pair the ideal distance 1e6 instead of
  Infinity, rejects a negative or NaN weight, and starts a 2D layout from the unit circle about the origin, so its
  positions differ from `kamadaKawaiLayout`'s.
- The layouts take `dim` 2 or 3 only; 1.x's `circularLayout`, `fruchtermanReingoldLayout`, `springLayout` and
  `kamadaKawaiLayout` also accepted other dimensions.
- `fruchtermanReingold` rejects a negative or infinite `k`, which `fruchtermanReingoldLayout` ran through its older
  loop, and leaves a pinned single node where `pos` put it (1.x moved it to `center`).
- `bfs`, `bipartite` and `multipartite` centre a horizontal layout on `center`; 1.x's functions centred it on
  `[center[1], center[0]]`. With the default centre (the origin) nothing moves.
- `multipartite` without `subsets` reads the node column `subset` and throws when the snapshot has none, as a
  snapshot from `toLayoutSnapshot` does not; 1.x's `multipartiteLayout(G)` put every node in one layer. Pass the
  layers as `subsets`.
- Positions are `Float32Array` values; 1.x returned f64 numbers.

## Development

```bash
npm run build            # Build TypeScript to dist/
npm run build:bundle     # Build the bundled ES module (dist/layout.js)
npm run build:all        # Both
npm run test:run         # Run the tests once
npm run lint             # ESLint and type checking
npm run storybook        # The stories (start it through servherd, which sets PORT)
```

## Contributing

This project is a TypeScript port of the NetworkX Python library. For contributions and issues, visit the
[GitHub repository](https://github.com/graphty-org/graphty-monorepo/tree/master/layout).

## License

MIT License - see LICENSE file for details.
