# Getting Started

`@graphty/layout` positions the nodes of a graph. It is a TypeScript port of the
[NetworkX layouts](https://networkx.org/documentation/stable/reference/drawing.html), with 15 layouts in 2D and 3D and
two force simulations you can step frame by frame.

## Installation

::: code-group

```bash [npm]
npm install @graphty/layout @graphty/graph-format
```

```bash [pnpm]
pnpm add @graphty/layout @graphty/graph-format
```

```bash [yarn]
yarn add @graphty/layout @graphty/graph-format
```

:::

[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) builds the graph every layout reads. See
[Installation](./installation.md) for a CDN import and the supported runtimes.

## Your First Layout

Build a graph, run a layout, and read each node's position by its id:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { circular, toPositionMap } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "a");
builder.addEdge("c", "d");
const graph = builder.freeze();

const result = circular(graph, { scale: 100 });
const byId = toPositionMap(result, graph.ids);
console.log(byId.a); // [100, 0]
```

`builder.freeze()` returns a read-only graph snapshot. `circular` places the four nodes on a circle of radius 100, and
`toPositionMap` turns the result into an object keyed by node id, each value an `[x, y]` array.

## The Result

Every layout returns the same shape, a `LayoutResult`:

- `positions`: a `Float32Array` holding `dim` numbers per node, node after node
- `dim`: 2 or 3, the numbers per node
- `n`: the number of nodes

Nodes are numbered in the order their ids first appeared in the builder, so `"a"` is node 0, `"b"` node 1 and so on.
Node `i`'s coordinates start at `positions[i * dim]`. `graph.ids` converts between ids and those numbers:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { circular } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "a");
builder.addEdge("c", "d");
const graph = builder.freeze();

const result = circular(graph, { scale: 100 });
console.log(result.dim, result.n, result.positions.length); // 2 4 8

const i = graph.ids.requireIndex("b");
const x = result.positions[i * result.dim];
const y = result.positions[i * result.dim + 1];
console.log(Math.round(x), Math.round(y)); // 0 100
console.log(graph.ids.idOf(3)); // d
```

Reading the array directly avoids building an object per node, which matters for large graphs; `toPositionMap` is the
convenient form for small ones.

## Choosing a Layout

| You want                                              | Use                                                        | Guide                                 |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| a quick, predictable placement that ignores the edges | `circular`, `grid`, `spiral`, `random`                     | [Geometric](./geometric.md)           |
| nodes grouped in rings you choose                     | `shell`                                                    | [Geometric](./geometric.md)           |
| layers, levels or two sides                           | `bfs`, `radial`, `bipartite`, `multipartite`               | [Structural](./structural.md)         |
| a drawing with no crossing edges                      | `planar`                                                   | [Structural](./structural.md)         |
| connected nodes close together, clusters visible      | `forceAtlas2`, `fruchtermanReingold`, `kamadaKawai`, `arf` | [Force-directed](./force-directed.md) |
| a quick overview of a graph's overall structure       | `spectral`                                                 | [Force-directed](./force-directed.md) |
| an animated layout the reader can drag                | `createSimulation`                                         | [Simulations](./simulations.md)       |

The [Storybook](https://graphty.app/storybook/layout/) draws every layout on sample graphs, with its options as
controls.

## Graphs You Already Have

A graph held as arrays of source and target node numbers becomes a snapshot in one call with `fromEdgeArrays`:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { grid } from "@graphty/layout";

const graph = fromEdgeArrays({
    directed: false,
    ids: ["x", "y", "z"],
    src: Uint32Array.of(0, 1),
    dst: Uint32Array.of(1, 2),
});
console.log(grid(graph).n); // 3
```

To read a file (GraphML, GEXF, GML, CSV and more), use [`@graphty/graph-io`](https://graphty.app/docs/graph-io/), which
returns the same snapshot. Code written against layout 1.x, which took an object with `nodes()` and `edges()` methods,
converts it with `toLayoutSnapshot`; see [Results and Options](./results.md#graphs-from-layout-1-x).

## Next Steps

- [Results and Options](./results.md): the options every layout shares, naming nodes by id, and converting results
- [Steppable Simulations](./simulations.md): animate a force layout
- [API Reference](../api/): every function and type
