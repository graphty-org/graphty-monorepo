# API Reference

Complete API documentation for `@graphty/layout`. Every layout takes a frozen `GraphSnapshot` from
`@graphty/graph-format` first and an options object second, and returns a `LayoutResult`: `{ positions, dim, n }`,
with `dim` numbers per node in node order. See [Results and Options](../guide/results.md) for the options every layout
shares and for reading positions by node id.

[Every function and type in the generated TypeDoc](./generated/)

## Geometric Layouts

- `circular()` - Nodes evenly spaced on a circle; over a sphere in 3D
- `shell()` - Concentric circles, one per group of nodes
- `spiral()` - Nodes along an Archimedean spiral
- `grid()` - Rows and columns of a lattice, in node order
- `random()` - Uniformly random positions, seeded

See [Geometric Layouts](../guide/geometric.md).

## Structural Layouts

- `bfs()` - One line per breadth-first level from a start node
- `radial()` - Rings by hop distance from a root node
- `bipartite()` - Two parallel lines for the two sides of a bipartite graph
- `multipartite()` - One line per layer
- `planar()` - No crossing edges, for planar graphs

See [Structural Layouts](../guide/structural.md).

## Force-Directed and Spectral Layouts

- `forceAtlas2()` - ForceAtlas2, for large and scale-free graphs
- `fruchtermanReingold()` - The Fruchterman-Reingold spring layout
- `kamadaKawai()` - Drawing distances matched to shortest-path distances
- `arf()` - Attractive and repulsive forces
- `spectral()` - Eigenvectors of the graph Laplacian

See [Force-Directed and Spectral](../guide/force-directed.md).

## Steppable Simulations

- `createSimulation()` - A simulation by type (`"forceatlas2"`, `"fruchtermanReingold"`, `"spring"`), on the GPU
  when given an accelerator that implements it
- `ForceAtlas2Simulation`, `FruchtermanReingoldSimulation` - The CPU simulations
- `LayoutSimulation` - What every simulation implements: `load()`, `step()`, `settled`, `setFixed()`,
  `setPosition()`, `dispose()`
- `LayoutAccelerator` - What a GPU accelerator implements
- `seedPositions()` - Fills the `NaN` rows of a position array from a seed, as the simulations do

See [Steppable Simulations](../guide/simulations.md).

## Results and Positions

- `LayoutResult` - `{ positions, dim, n }`
- `toPositionMap()`, `fromPositionMap()` - To and from an object keyed by node id
- `toPositionColumn()`, `fromPositionColumn()` - To and from three numbers per node in scene units
- `fitToBox()` - Into a rectangle, keeping proportions
- `rescaleInPlace()` - Rescale and recenter a flat array in place
- `toLayoutSnapshot()` - The undirected snapshot of a snapshot, a layout 1.x graph object or a node list

## Catalog

- `LAYOUTS` - Every layout by name, with its one-shot function, its simulation type, the graphs and weights it
  accepts, its required options and its accelerator method

## Deprecated

- `indexed` - The namespace layout 1.x offered these layouts under; `indexed.circular` is `circular`. Removed in 3.0.
- `rescaleLayout()`, `rescaleLayoutDict()` - Use `rescaleInPlace()`.
