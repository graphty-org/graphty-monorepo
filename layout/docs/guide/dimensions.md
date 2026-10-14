# 2D and 3D

Every layout takes `dim: 2` (the default) or `dim: 3`. The result's `dim` says which one you got, and each node's row
in `positions` holds `x, y` or `x, y, z`.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { forceAtlas2 } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 20 }));
const flat = forceAtlas2(graph, { seed: 42 });
const deep = forceAtlas2(graph, { dim: 3, seed: 42 });
console.log(flat.dim, flat.positions.length); // 2 40
console.log(deep.dim, deep.positions.length); // 3 60
```

## Which Layouts Use the Third Axis

Some layouts spread nodes through space in 3D. The others are drawings of a plane: in 3D they return the same `x, y`
as in 2D, with every `z` set to the center's z, so you can show them in a 3D scene without converting.

| Uses all three axes                                                    | Flat in 3D (z is the center's z)                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `forceAtlas2`, `fruchtermanReingold`, `kamadaKawai`, `arf`, `spectral` | `shell`, `spiral`, `grid`, `bfs`, `radial`, `bipartite`, `multipartite`, `planar` |
| `random` (a cube instead of a square)                                  |                                                                                   |
| `circular` (evenly over a sphere instead of around a circle)           |                                                                                   |

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular, grid } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 12 }));

// a sphere: every node at distance 1 from the center
const sphere = circular(graph, { dim: 3 });
const r = Math.hypot(sphere.positions[0], sphere.positions[1], sphere.positions[2]);
console.log(r.toFixed(3)); // 1.000

// a flat grid lifted to z = 5
const plane = grid(graph, { dim: 3, center: [0, 0, 5] });
console.log(plane.positions[2], plane.positions[35]); // 5 5
```

## Simulations

The [steppable simulations](./simulations.md) always use three numbers per node in their position array, whatever
`dim` is. With `dim: 2` (the default) the simulation moves only `x` and `y` and writes the center's z as every `z`;
with `dim: 3` it moves all three.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 10 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
const sim = createSimulation("fruchtermanReingold", { dim: 3, seed: 1 });
sim.load(graph, positions);
sim.step(50);
const zs = new Set(Array.from({ length: graph.nodeCount }, (_, i) => positions[3 * i + 2]));
console.log(zs.size > 1); // true
sim.dispose();
```

## Converting Between 2D and a 3D Scene

A renderer that always works in 3D can take a 2D result as three numbers per node with `toPositionColumn`, which
writes `0` (or the center's z) as every `z` and maps layout units to scene units:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular, toPositionColumn } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 4 }));
const column = toPositionColumn(circular(graph), 50, [0, 0, 0]); // one layout unit is 50 scene units
console.log(column.subarray(0, 3)); // [50, 0, 0]
```
