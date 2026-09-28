# @graphty/layout

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/layout.svg)](https://www.npmjs.com/package/@graphty/layout)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-vitepress-blue)](https://graphty.app/docs/layout/api/generated/)
[![Storybook](https://img.shields.io/badge/storybook-interactive%20demos-ff4785)](https://graphty.app/storybook/layout/)

**[View Interactive Storybook ->](https://graphty.app/storybook/layout/)**

Layout is a TypeScript library for positioning the nodes of a graph. Its layouts are ports of the
[layout algorithms](https://networkx.org/documentation/stable/reference/drawing.html) of the Python
[NetworkX](https://networkx.org/documentation/stable/) library, plus ForceAtlas2 and steppable force simulations.
Every layout runs over a [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot
and returns a flat `Float32Array`, in 2D or 3D.

## Installation

```bash
npm install @graphty/layout @graphty/graph-format
```

## Quick start

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { forceAtlas2, toPositionMap } from "@graphty/layout";

// a 4-cycle: node i is index i
const s = fromEdgeArrays({
    directed: false,
    nodeCount: 4,
    src: Uint32Array.of(0, 1, 2, 3),
    dst: Uint32Array.of(1, 2, 3, 0),
});

const r = forceAtlas2(s, { maxIter: 200, seed: 42 });
r.positions; // Float32Array of r.n * r.dim values: row i is node i
const byId = toPositionMap(r, s.ids); // { 0: [x, y], 1: [x, y], ... }
```

Any `GraphSnapshot` works: one built with graph-format's `GraphBuilder` or `fromEdgeArrays`, one read by a
[`@graphty/graph-io`](https://www.npmjs.com/package/@graphty/graph-io) importer, or one of the sample graphs of
[`@graphty/graph-samples`](https://www.npmjs.com/package/@graphty/graph-samples) (`fromEdgeArrays(gridGraph({ rows:
3, cols: 4 }))`). A graph you already hold as an object with `nodes()` and `edges()` methods becomes a snapshot with
`toLayoutSnapshot(graph)`.

## Layouts

Every layout has the same shape, `(snapshot, options?) => LayoutResult`. A `LayoutResult` is
`{ positions: Float32Array; dim: 2 | 3; n: number }`: `dim` components per node, row `i` for node index `i`.

| Layout                | What it does                                                   | Its own options (besides `dim`, `scale`, `center`, `seed`)              |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `random`              | Uniformly at random in the unit cell from `center`             | --                                                                      |
| `circular`            | On a circle (2D) or a Fibonacci sphere (3D)                    | --                                                                      |
| `grid`                | Rows and columns of an even lattice, in node order             | `columns`                                                               |
| `shell`               | Concentric circles                                             | `nlist`: node-index lists or a node column name                         |
| `spiral`              | Along a spiral                                                 | `resolution`, `equidistant`                                             |
| `spectral`            | By the eigenvectors of the graph Laplacian                     | --                                                                      |
| `planar`              | Without edge crossings; throws for a non-planar graph          | --                                                                      |
| `radial`              | On rings by hop distance from a root (the busiest node)        | `root` (a node index)                                                   |
| `bfs`                 | In layers by breadth-first distance from a start node          | `start` (a node index), `align`                                         |
| `bipartite`           | Two sets on two lines                                          | `top`: a node mask or a `bool` node column name; `align`, `aspectRatio` |
| `multipartite`        | Layers on parallel lines                                       | `subsets`: node-index lists or a node column name; `align`              |
| `kamadaKawai`         | Drawn distances follow shortest-path distances                 | `dist` (an `n * n` distance matrix), `pos`, `weight`                    |
| `forceAtlas2`         | ForceAtlas2 force-directed layout                              | the ForceAtlas2 simulation's options, `maxIter`, `pos`                  |
| `fruchtermanReingold` | Fruchterman-Reingold force-directed layout (the spring layout) | the Fruchterman-Reingold simulation's options, `pos`                    |
| `arf`                 | Attractive and repulsive forces                                | `pos`, `scaling`, `a`, `maxIter` (no `scale` or `center`)               |

- **Common options**: `dim` (2 or 3, default 2), `scale` (default 1), `center` (default the origin) and `seed` (for
  the layouts that draw random numbers; the same seed gives the same layout).
- **Nodes are indices.** Options that name nodes (`root`, `start`, `top`, `subsets`, `nlist`) take node indices,
  a node mask or the name of a node column of the snapshot, never node ids. Use `s.ids.indexOf(id)` to find one;
  for an id that is not in the graph it returns `INVALID_INDEX` (0xffffffff), not -1.
- **Weights** come from the snapshot: `weight: true` reads its edge weights and a string names a numeric edge column.
  `kamadaKawai` reads weights as distances.
- **Start positions** (`pos`) are a `Float32Array` of `dim` values per node in index order. For the force layouts
  and `arf` each `NaN` component is drawn from `seed` and the finite components of the same row are kept;
  `kamadaKawai` reads `NaN` as 0.
- **Unplaced nodes**: `shell` and `multipartite` leave the row of a node in no shell or layer as `NaN`.
- **Directed snapshots** are laid out as their undirected copy by every layout that reads edges.

```typescript
import { bipartite, kamadaKawai, shell } from "@graphty/layout";

const rings = shell(s, { nlist: [[0], [1, 2, 3]], scale: 2 });
const sphere = kamadaKawai(s, { dim: 3 });
const twoSides = bipartite(s, { top: "isTop", align: "horizontal" }); // "isTop": a bool node column of s
```

## Position helpers

Index-based code keeps positions as a flat `Float32Array` of `dim` components per node, in the node-index order of a
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot. A `LayoutResult` is that
array with its `dim` (2 or 3) and node count `n`. These helpers convert between it and the other forms:

```typescript
import {
    fromPositionColumn,
    fromPositionMap,
    rescaleInPlace,
    toLayoutSnapshot,
    toPositionColumn,
    toPositionMap,
} from "@graphty/layout";

const s = toLayoutSnapshot(graph);
// id-keyed PositionMap -> flat array; fill writes the row of every node the map does not give
const flat = fromPositionMap(pos, s.ids, 2, (i, out) => out.set([0, 0], 2 * i));
rescaleInPlace(flat, 2, 1); // rescaleLayout on the flat array, in place
const result = { positions: flat, dim: 2 as const, n: s.nodeCount };
const map = toPositionMap(result, s.ids); // back to { [id]: [x, y] }
const column = toPositionColumn(result, 100, [0, 0, 0]); // stride-3 scene units: v * scale + center
const again = fromPositionColumn(column, 2, 100, [0, 0, 0]); // the inverse
```

Plain `number[][]` or id-keyed positions rescale with `rescaleLayout(positions, scale, center)`.

## Steppable simulations

Besides the one-shot layout functions, the package exports steppable force simulations that run over a
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) snapshot and a `Float32Array` you own:
three floats per node (`x, y, z` in your scene units), read once at `load()` and updated in place by every `step()`.
That is the contract a host needs to animate a layout frame by frame, pin nodes and drag them while the forces keep
running (graphty-element adopts it in design 9.4).

```typescript
import { createSimulation, seedPositions, toLayoutSnapshot } from "@graphty/layout";

const s = toLayoutSnapshot(graph); // a nodes()/edges() graph, a node list or a GraphSnapshot -> undirected snapshot
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
  `new ForceAtlas2Simulation({ compat: "networkx" })` reproduces NetworkX's variant); `"fruchtermanReingold"` and its alias `"spring"` run `FruchtermanReingoldSimulation`;
  `"spring-electrical"` has no CPU simulation and needs an accelerator.
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
  `[center[1], center[0]]`.
- Positions are `Float32Array` values; 1.x returned f64 numbers.

## Error handling

```typescript
try {
    planar(s);
} catch (error) {
    console.error("Graph is not planar:", (error as Error).message);
}
```

`arf` throws when `a <= 1`, `bfs` for a disconnected graph or a start outside it, and every layout for a `dim` other
than 2 or 3.

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
