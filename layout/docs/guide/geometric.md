# Geometric Layouts

Geometric layouts place nodes on a fixed shape: a circle, concentric rings, a spiral, a grid, or at random. They are
fast (one pass over the nodes), predictable, and except for `shell`'s groups they ignore the edges. Use them for small
graphs where the shape itself carries meaning, or as the start of a force-directed layout.

Every example builds its graph with a [graph-samples](https://www.npmjs.com/package/@graphty/graph-samples) generator;
any snapshot works the same way. The [Storybook](https://graphty.app/storybook/layout/) draws each layout with its
options as controls.

## Circular

Nodes evenly spaced on a circle, in node order, starting on the positive x axis. `scale` is the radius.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 12 }));
const result = circular(graph, { scale: 2, center: [10, 10] });
console.log(result.positions[0], result.positions[1]); // 12 10
```

In 3D, `circular` spreads the nodes evenly over a sphere instead (see [2D and 3D](./dimensions.md)).

## Shell

Concentric circles, innermost first. `nlist` lists the shells, each as node numbers or `{ ids }`, or names a node
column whose equal values form one shell. A shell with a single node sits on the center.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { plantedPartitionGraph, starGraph } from "@graphty/graph-samples/generators";
import { shell } from "@graphty/layout";

// the hub alone in the center, the rim around it
const star = fromEdgeArrays(starGraph({ n: 8 }));
const hubFirst = shell(star, { nlist: [[0], [1, 2, 3, 4, 5, 6, 7]] });
console.log(hubFirst.positions[0], hubFirst.positions[1]); // 0 0

// one shell per value of the generator's "community" node column
const groups = fromEdgeArrays(plantedPartitionGraph({ groups: 3, groupSize: 10, pIn: 0.5, pOut: 0.02, seed: 7 }));
const byCommunity = shell(groups, { nlist: "community" });
console.log(byCommunity.n); // 30
```

Every shell starts on the positive x axis, so the first node of each shell lines up. `rotate` turns shell `k` by
`(k + 1) * rotate` radians; `rotate: "networkx"` is NetworkX's default, pi divided by the number of shells.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { starGraph } from "@graphty/graph-samples/generators";
import { shell } from "@graphty/layout";

const star = fromEdgeArrays(starGraph({ n: 8 }));
const turned = shell(star, { nlist: [[0], [1, 2, 3, 4, 5, 6, 7]], rotate: "networkx" });
const quarter = shell(star, { nlist: [[0], [1, 2, 3, 4, 5, 6, 7]], rotate: Math.PI / 4 });
console.log(turned.n, quarter.n); // 8 8
```

A node in no shell is left out: its coordinates are `NaN`.

## Spiral

Nodes along an Archimedean spiral from the center outward, in node order; the farthest node ends `scale` from the
center. `resolution` is the angle between consecutive nodes in radians (default 0.35), and `equidistant: true` instead
spaces consecutive nodes the same distance apart along the curve.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { pathGraph } from "@graphty/graph-samples/generators";
import { spiral } from "@graphty/layout";

const graph = fromEdgeArrays(pathGraph({ n: 50 }));
const result = spiral(graph, { resolution: 0.35, equidistant: true });
const last = Math.hypot(result.positions[98], result.positions[99]);
console.log(last.toFixed(2)); // 1.00
```

## Grid

Rows and columns of an evenly spaced lattice, row by row in node order, centered, with the longer side spanning
`scale` on each side of the center. `columns` sets the row length; the default is the smallest square that holds every
node.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { balancedTreeGraph } from "@graphty/graph-samples/generators";
import { grid } from "@graphty/layout";

const graph = fromEdgeArrays(balancedTreeGraph({ branching: 2, height: 3 }));
const lattice = grid(graph, { columns: 5 });
console.log(lattice.n); // 15
```

## Random

Each node uniformly at random in the cell from `center` to `center + scale` on every axis (the unit square by
default). Unlike the other layouts, `center` here is the cell's lowest corner, as in NetworkX. The same `seed` gives
the same positions.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { random } from "@graphty/layout";

const graph = fromEdgeArrays(completeGraph({ n: 10 }));
const result = random(graph, { seed: 42 });
console.log(result.positions.every((v) => v >= 0 && v < 1)); // true
```

## When to Use Which

| Layout     | Reads edges | Good for                                                        |
| ---------- | ----------- | --------------------------------------------------------------- |
| `circular` | no          | cycles, small graphs, showing every node with equal weight      |
| `shell`    | no          | groups you already know: a hub and its rim, communities, levels |
| `spiral`   | no          | long sequences, ordered nodes                                   |
| `grid`     | no          | tables of nodes, a quick overview of a large node set           |
| `random`   | no          | the start of a force-directed layout, tests                     |

For layouts that follow the edges, see [Structural Layouts](./structural.md) and
[Force-Directed and Spectral](./force-directed.md).
