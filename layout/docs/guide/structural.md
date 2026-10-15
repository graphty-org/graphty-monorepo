# Structural Layouts

Structural layouts place nodes by a property of the graph: their distance from a start node, which side of a bipartite
graph they belong to, which layer they are in, or an embedding with no crossing edges. They are deterministic and fast,
and they suit trees, hierarchies and layered graphs, where a force-directed layout would hide the structure.

## BFS

One line per breadth-first level from `start` (a node number or `{ id }`; default node 0). Each level is a column with
`align: "vertical"` (the default) or a row with `align: "horizontal"`.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { balancedTreeGraph } from "@graphty/graph-samples/generators";
import { bfs } from "@graphty/layout";

const tree = fromEdgeArrays(balancedTreeGraph({ branching: 2, height: 2 }));
const result = bfs(tree, { start: 0, align: "horizontal" });
// the root's row, then its two children's row, then the four leaves' row
const rows = new Set(Array.from({ length: result.n }, (_, i) => result.positions[2 * i + 1].toFixed(3)));
console.log(rows.size); // 3
```

## Radial

Concentric rings by hop distance from `root`: the root in the center, its neighbors on the first ring, and so on. The
default root is the node with the most neighbors.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { balancedTreeGraph } from "@graphty/graph-samples/generators";
import { radial } from "@graphty/layout";

const tree = fromEdgeArrays(balancedTreeGraph({ branching: 3, height: 2 }));
const result = radial(tree, { root: 0 });
console.log(result.positions[0], result.positions[1]); // 0 0
```

By default each ring's nodes are evenly spaced in breadth-first order, and `rotate` turns the rings as it does for
[`shell`](./geometric.md#shell). `arrangement: "sectors"` instead keeps each node inside its parent's slice of the
circle, so the edges of the breadth-first tree never cross, at the price of crowding: on a large tree many nodes end up
almost on top of one another.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { randomTreeGraph } from "@graphty/graph-samples/generators";
import { radial } from "@graphty/layout";

const tree = fromEdgeArrays(randomTreeGraph({ n: 200, seed: 42 }));
const even = radial(tree, { rotate: "networkx" });
const sectors = radial(tree, { arrangement: "sectors" });
console.log(even.n, sectors.n); // 200 200
```

## Bipartite

Two parallel lines, for graphs whose nodes split into two sets with edges only between them. `top` names the nodes of
the first line: `{ ids: [...] }`, an array of node numbers, or the name of a `bool` node column. The default is the
even-numbered nodes. `aspectRatio` sets the width of the drawing against its height.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeBipartiteGraph } from "@graphty/graph-samples/generators";
import { bipartite } from "@graphty/layout";

const graph = fromEdgeArrays(completeBipartiteGraph({ a: 4, b: 6 })); // nodes 0 to 3 are the first set
const result = bipartite(graph, { top: [0, 1, 2, 3], align: "vertical", aspectRatio: 4 / 3 });
const firstX = result.positions[0];
const lastX = result.positions[2 * 9];
console.log(firstX < 0, lastX > 0); // true true
```

## Multipartite

One line per layer, layers in order. `subsets` lists the layers (each as node numbers or `{ ids }`) or names a `u32`
node column whose values number the layers. Without `subsets` the layout reads the node column `"subset"` and throws
if the graph has none.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { randomDagGraph } from "@graphty/graph-samples/generators";
import { multipartite } from "@graphty/layout";

// the generator records each node's layer in a "layer" node column
const dag = fromEdgeArrays(randomDagGraph({ layers: [3, 4, 3], p: 0.5, seed: 1 }));
const byColumn = multipartite(dag, { subsets: "layer" });

const byList = multipartite(dag, {
    subsets: [
        [0, 1, 2],
        [3, 4, 5, 6],
        [7, 8, 9],
    ],
    align: "horizontal",
});
console.log(byColumn.n, byList.n); // 10 10
```

A node in no layer is left out: its coordinates are `NaN`.

## Planar

Integer grid positions with no two edges crossing, for planar graphs. `planar` throws `G is not planar.` when the
graph cannot be drawn without crossings.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph, gridGraph } from "@graphty/graph-samples/generators";
import { planar } from "@graphty/layout";

const result = planar(fromEdgeArrays(gridGraph({ rows: 4, cols: 4 })));
console.log(result.n); // 16

try {
    planar(fromEdgeArrays(completeGraph({ n: 5 })));
} catch (error) {
    console.log((error as Error).message); // "G is not planar."
}
```

## When to Use Which

| Layout         | Good for                                                               |
| -------------- | ---------------------------------------------------------------------- |
| `bfs`          | trees and hierarchies drawn as levels, distances from one node         |
| `radial`       | the neighborhood of one node, trees drawn around their root            |
| `bipartite`    | two kinds of node: users and items, authors and papers                 |
| `multipartite` | pipelines, layered DAGs, any graph whose layers you already know       |
| `planar`       | road and mesh networks, any planar graph where crossings would mislead |
