# Force-Directed and Spectral Layouts

These layouts place connected nodes close together and push unconnected ones apart, so clusters and bridges become
visible. Each one is a single call that runs to the end and returns the final positions. To watch ForceAtlas2 or
Fruchterman-Reingold move frame by frame, or let the reader drag nodes while it runs, use the
[steppable simulations](./simulations.md) instead.

## ForceAtlas2

ForceAtlas2 (Jacomy et al., 2014, the layout of Gephi) is a good default for large and scale-free graphs. It runs for
`maxIter` iterations (default 100), then rescales the result to `scale` around `center`.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { forceAtlas2 } from "@graphty/layout";

const graph = fromEdgeArrays(barabasiAlbertGraph({ n: 200, m: 2, seed: 42 }));
const result = forceAtlas2(graph, {
    maxIter: 200,
    scalingRatio: 2, // repulsion between every pair; higher spreads the graph out
    gravity: 1, // pull toward the center, which keeps disconnected parts together
    linlog: false, // true: logarithmic attraction, tighter clusters
    seed: 42,
});
console.log(result.n); // 200
```

Other options: `strongGravity` (gravity that grows with the distance from the center), `distributedAction` (divide a
node's attraction by its mass, so hubs move less), `jitterTolerance` (higher is faster and less precise), `nodeMass` (a
mass per node, or the name of a node column; default the node's degree plus one), and `weight` (`true` for the
snapshot's edge weights, or the name of a numeric edge column).

## Fruchterman-Reingold

The spring layout of NetworkX's `spring_layout`: neighbors attract, every pair repels, and a cooling temperature caps
how far a node moves per iteration. `k` is the ideal distance between neighbors (default `1 / sqrt(n)`), and
`iterations` the number of iterations (default 50).

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { fruchtermanReingold } from "@graphty/layout";

const graph = fromEdgeArrays(erdosRenyiGraph({ n: 20, p: 0.2, seed: 42 }));
const result = fruchtermanReingold(graph, { iterations: 50, seed: 42 });
console.log(result.n); // 20
```

`fixed` pins nodes where `pos` puts them. It takes a node mask, which `resolveNodeMask` from graph-format builds from
ids, or the name of a `bool` node column.

<!-- doc-check -->

```typescript
import { GraphBuilder, resolveNodeMask } from "@graphty/graph-format";
import { fruchtermanReingold } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("anchor", "a");
builder.addEdge("a", "b");
builder.addEdge("b", "anchor");
const graph = builder.freeze();

const pos = Float32Array.of(0, 0, NaN, NaN, NaN, NaN); // the anchor at the origin, the rest drawn from the seed
const result = fruchtermanReingold(graph, { pos, fixed: resolveNodeMask(graph, { ids: ["anchor"] }), seed: 1 });
console.log(result.positions[0], result.positions[1]); // 0 0
```

## Kamada-Kawai

Kamada-Kawai places nodes so that their distance in the drawing matches their shortest-path distance in the graph. It
gives clean drawings of small and medium graphs, and it is deterministic: the same graph gives the same drawing.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { wheelGraph } from "@graphty/graph-samples/generators";
import { kamadaKawai } from "@graphty/layout";

const graph = fromEdgeArrays(wheelGraph({ n: 8 }));
const result = kamadaKawai(graph);
console.log(result.n); // 8
```

It builds a matrix of every pair's distance, about 24 bytes per pair, so memory grows with the square of the node
count. `maxNodes` refuses a graph that is too big before allocating anything, with a `RangeError` whose `code` is
`E_TOO_LARGE`:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { pathGraph } from "@graphty/graph-samples/generators";
import { kamadaKawai } from "@graphty/layout";

const graph = fromEdgeArrays(pathGraph({ n: 5000 }));
try {
    kamadaKawai(graph, { maxNodes: 2000 });
} catch (error) {
    console.log((error as RangeError & { code: string }).code); // E_TOO_LARGE
}
```

`dist` replaces the shortest-path distances with your own ideal distances (`n * n` numbers, row by row), and `weight`
chooses which edge weights count as distances (default the snapshot's own).

## ARF

ARF (attractive and repulsive forces) pulls neighbors together with a spring of strength `a` (which must be larger than

1. and pushes every pair apart. It stops after `maxIter` iterations (default 1000) or once the forces balance.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { arf } from "@graphty/layout";

const graph = fromEdgeArrays(completeGraph({ n: 10 }));
const result = arf(graph, { a: 1.1, scaling: 1, maxIter: 1000, seed: 42, scale: 1 });
console.log(result.n); // 10
```

Unlike the other layouts, `arf` keeps the size its forces settle at (set by `scaling`) unless you pass `scale` or
`center`; with either, the farthest node ends `scale` from `center`.

## Spectral

Spectral layout places each node by the eigenvectors of the graph's Laplacian matrix: the coordinates that change least
across edges. It needs no iterations to tune and shows the overall shape of grids, meshes and dense graphs, though nodes
in tight clusters can land on top of one another.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { spectral } from "@graphty/layout";

const graph = fromEdgeArrays(gridGraph({ rows: 6, cols: 6 }));
const result = spectral(graph, { seed: 1 }); // the grid's rows and columns survive in the embedding
console.log(result.n); // 36
```

## When to Use Which

| Layout                | Good for                                                              | Cost per run                    |
| --------------------- | --------------------------------------------------------------------- | ------------------------------- |
| `forceAtlas2`         | large, scale-free and clustered graphs                                | every pair, every iteration     |
| `fruchtermanReingold` | general graphs of up to a few thousand nodes; matches NetworkX        | every pair, every iteration     |
| `kamadaKawai`         | graphs of up to a few hundred nodes, where distances should mean hops | memory grows with nodes squared |
| `arf`                 | small, dense graphs                                                   | every pair, every iteration     |
| `spectral`            | grids, meshes, dense graphs; a quick look at the overall structure    | repeated passes over the edges  |

See [Performance](./performance.md) for running them on large graphs.
