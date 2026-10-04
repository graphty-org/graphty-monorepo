# Layout reference

Every graphty layout is a Cytoscape layout: pass its name to `cy.layout({ name })` and call `run()`. There are 16,
each listed below with every option, its type and its default.

The example below runs ForceAtlas2 headless and makes the hub node heavier, so the other nodes move around it.
`nodeMass` names the node data field that holds each node's mass; a node without one gets the default.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
cy.add([
    { data: { id: "hub", mass: 10 } },
    { data: { id: "a" } },
    { data: { id: "b" } },
    { data: { id: "c" } },
    { data: { source: "hub", target: "a" } },
    { data: { source: "hub", target: "b" } },
    { data: { source: "hub", target: "c" } },
]);

const layout = cy.layout({
    name: "graphty-forceatlas2",
    boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
    maxIter: 300,
    nodeMass: "mass",
    seed: 1,
});
layout.one("layoutstop", () => {
    console.log(layout.backend.ran); // "cpu" on a machine without WebGPU
});
layout.run();
```

A headless core has a 1 x 1 pixel viewport, so the example passes a `boundingBox`. ForceAtlas2 is a simulation:
with the default `gpu: "auto"` it first checks for a WebGPU device, so the positions are ready on `layoutstop`,
not when `run()` returns.

## How to read the tables

There are two kinds of layout. A static layout computes positions once, on the CPU. With `animate: false` (the
default), the nodes are placed when `run()` returns. With a tween (`animate: true` or `"end"`), the nodes move over
`animationDuration`, so read positions in a `layoutstop` handler. A simulation steps a force model, can run on the
GPU, and can draw every frame with `animate: true`.

The first table lists the options every layout takes: the box, fitting, animation, events, `seed`, `weight` and
the GPU options. Each layout then has a table of its own options. An option you pass that no table lists goes to
the @graphty/layout function of the same name unchanged. An empty Default cell means there is no fixed value: the
Meaning cell says what happens when you leave the option out.

The type `NodeSelection` (in `nlist`, `subsets`, `top` and `root`) is a Cytoscape selector string such as `"#a"` or
`"[group = 1]"`, or a collection. Either one is matched against the nodes being laid out only, so a node outside them
is ignored. Where one node is expected (`root`), the first match is used, and a selection that matches no node
throws `graphty layout: root matches no node of the collection`.

## How the result fits the box

Every layout keeps the shape it computed and fits it to `boundingBox` the same way: the centroid of the nodes goes
to the center of the box, and the result is scaled so the node farthest from the centroid is half the box's shorter
side away. The result therefore fits a circle inside the box and does not stretch to fill a wide or tall box. For
example, `graphty-grid` with `columns: 3` places 6 nodes in a 300 x 200 box at x 60.6, 150 and 239.4 and y 55.3
and 144.7. `spacingFactor` then scales the positions about the center of their bounding box, as Cytoscape does, not
about the centroid. A value above 1 can push nodes outside the box, and on a lopsided result the centroid moves off
the box's center.

## Per-node arrays

Some options take one value per node as an array: `nodeMass` and `nodeSize` on `graphty-forceatlas2` (which also
take a node data field name or an object keyed by node id), the `n * n` distance matrix `dist` on
`graphty-kamada-kawai`, and the `dim * n` starting positions `pos` on `graphty-kamada-kawai` and `graphty-arf`. Index `i` belongs to `nodes[i]` of `toSnapshot(cy.elements().not(":parent"))`. When you lay out a subset with
`eles.layout()`, take the snapshot of that subset instead.
[Feeding a layout per-node data](../guide/snapshot#feeding-a-layout-per-node-data) explains the order.

<!-- generated:layouts:begin (by scripts/reference.ts; run npm run docs:reference) -->

## Options every layout takes

| Option              | Type                                                   | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `animate`           | `boolean \| "end"`                                     | `false`      | false: jump; "end" or any truthy value on a static layout: tween to the result; true on a simulation: draw every frame.                                                                                                                                                                                                                                                                                                                                                                    |
| `animationDuration` | `number`                                               | `500`        | Length of the tween, in milliseconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `animationEasing`   | `string`                                               |              | Easing of the tween, as Cytoscape's built-in layouts take it (for example "ease-out").                                                                                                                                                                                                                                                                                                                                                                                                     |
| `animateFilter`     | `(node: NodeSingular, i: number) => boolean`           |              | Tween only the nodes for which this returns true; the others jump to their positions.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `fit`               | `boolean`                                              | `true`       | Fit the viewport to the result.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `padding`           | `number`                                               | `30`         | Space around the result when `fit` is true, in pixels.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `boundingBox`       | `BoundingBox12 \| BoundingBoxWH`                       | the viewport | Where to place the result. Default: the viewport, which is 1 x 1 pixel on a headless core. The result keeps its shape: its centroid goes to the center of the box, and it is scaled so the node farthest from the centroid is half the box's shorter side away. A box wider than it is tall is therefore not filled from side to side. A simulation with locked nodes keeps them in place and scales the free nodes around them instead.                                                   |
| `spacingFactor`     | `number`                                               |              | Expands (above 1) or compresses (below 1) the result after it is fitted to `boundingBox`, about the center of the nodes' bounding box, as Cytoscape does. A value above 1 can put nodes outside the box, and on a lopsided result the centroid moves off the box's center. Absent: no scaling.                                                                                                                                                                                             |
| `transform`         | `(node: NodeSingular, position: Position) => Position` |              | Changes each final position: called with the node and its computed position, returns the position to use.                                                                                                                                                                                                                                                                                                                                                                                  |
| `ready`             | `LayoutHandler`                                        |              | Called on layoutready.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `stop`              | `LayoutHandler`                                        |              | Called on layoutstop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `dim`               | `2 \| 3`                                               | `2`          | 2 (default) or 3. With 3, graphty-circular puts the nodes on a sphere, and graphty-random, graphty-kamada-kawai, graphty-arf and the simulations place them in 3D; z is then dropped, so the drawing is that 3D result seen from above and no longer looks like the 2D layout (circular is no longer a circle). The other layouts ignore it. Cytoscape draws in 2D, so 3 only gives a different flattened drawing; it is there because the underlying layout functions take it.            |
| `seed`              | `number`                                               |              | Seed of the layouts that draw random numbers: graphty-random, graphty-spectral, graphty-planar, graphty-arf and the three simulations. The same seed gives the same positions; without one, positions that depend on random numbers differ from run to run. The other layouts ignore it.                                                                                                                                                                                                   |
| `weight`            | `string`                                               | unweighted   | Edge data field holding the weight; a function of the edge also works at runtime. An edge without a number counts as 1. Only graphty-forceatlas2 and graphty-kamada-kawai read it, in opposite directions: forceatlas2 treats it as attraction (higher pulls the ends closer), kamada-kawai as edge length (higher pushes them apart).                                                                                                                                                     |
| `randomize`         | `boolean`                                              | `true`       | Simulations: start from random positions (true, default) or from the current ones. Locked nodes never move.                                                                                                                                                                                                                                                                                                                                                                                |
| `refresh`           | `number`                                               | `1`          | Simulations with `animate: true`: iterations per frame.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `gpu`               | `"auto" \| "off" \| "require"`                         | `"auto"`     | Simulations: "auto" (default) runs on the core's GPU when the runtime has a usable WebGPU device, else on the CPU. In Node or a browser with `navigator.gpu`, a run that has to look for a device finishes after `run()` returns, whichever it picks, so listen for layoutstop. "off" runs on the CPU, synchronously when `animate` is false; "require" emits layouterror instead of running on the CPU. `layout.backend` says which ran. Any other value makes `run()` throw a TypeError. |
| `accelerator`       | `LayoutAccelerator`                                    |              | Simulations: an accelerator the caller built and owns (for example the `createAccelerator` of `@graphty/webgpu-graph-algorithms`); overrides `gpu`. null forces the CPU.                                                                                                                                                                                                                                                                                                                   |

## Every layout

### `graphty-random` (static)

No options of its own.

### `graphty-circular` (static)

No options of its own.

### `graphty-spiral` (static)

| Option        | Type      | Default | Meaning                                                                                                                                                                                                                                     |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolution`  | `number`  | `0.35`  | The angle between consecutive nodes, in radians. With `equidistant: true` it is instead the angle the spiral starts at, and since the spiral's radius grows with its angle, it changes the shape of the inner turns, not only the rotation. |
| `equidistant` | `boolean` | `false` | Space consecutive nodes the same distance apart along the spiral, instead of by equal angles.                                                                                                                                               |

### `graphty-grid` (static)

| Option    | Type     | Default         | Meaning                                |
| --------- | -------- | --------------- | -------------------------------------- |
| `columns` | `number` | `ceil(sqrt(n))` | Number of columns, a positive integer. |

### `graphty-spectral` (static)

Starts its eigenvector solver from random values: pass `seed` for the same positions on every run.

No options of its own.

### `graphty-planar` (static)

Places one cycle of the graph on a circle and every other node at the average position of its already placed neighbors, plus a small random offset. It does not guarantee a drawing without crossings: on a 3 x 3 grid, edges cross and two nodes can land on the same point. Only the nodes off that cycle get the random offset: pass `seed` for the same positions on every run. When the cycle covers every node (a ring), there is nothing random and `seed` has no effect. On a graph that is not planar, `run()` throws `G is not planar.` and emits no events ([failures before the run](../guide/layouts#events)).

No options of its own.

### `graphty-arf` (static)

| Option    | Type           | Default | Meaning                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pos`     | `Float32Array` |         | The starting positions, `dim * n` values in node order (see Per-node arrays). The result is fitted to `boundingBox` afterwards. Absent: the layout's own start.                                                                                                                                                                                                                              |
| `scaling` | `number`       | `1`     | The strength of the repulsion between every pair: scaling \* sqrt(n) / distance. It sets the size the forces settle at, and the fit to `boundingBox` removes that size, so a higher value does not spread the drawing. What it changes is where the run starts relative to that size and how far it gets in `maxIter` steps, so the drawing differs but is not predictably wider or tighter. |
| `a`       | `number`       | `1.1`   | The spring strength between linked nodes; every other pair attracts with strength 1. A higher value pulls neighbors closer relative to the rest. A value of 1 or less throws `The parameter a should be larger than 1`.                                                                                                                                                                      |
| `maxIter` | `number`       | `1000`  | The iteration cap. The run also stops once the summed force falls to 1e-6.                                                                                                                                                                                                                                                                                                                   |

### `graphty-kamada-kawai` (static)

| Option | Type                           | Default | Meaning                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist` | `Float64Array \| Float32Array` |         | The ideal distance of every pair, `n * n` values row by row (for example `allPairsShortestPath(s).dist` from `@graphty/algorithms`). The diagonal is read as 0 and a non-finite entry as unreachable (1e6). Absent: the shortest paths of the graph, with its weights read as distances. |
| `pos`  | `Float32Array`                 |         | The starting positions, `dim * n` values in node order (see Per-node arrays). The result is fitted to `boundingBox` afterwards. Absent: the layout's own start.                                                                                                                          |

### `graphty-shell` (static)

| Option  | Type                       | Default | Meaning                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nlist` | `readonly NodeSelection[]` |         | The shells, innermost first. They are evenly spaced out to the edge of the fitted result, and a first shell of exactly one node goes at the center of the drawing. The fit then moves the centroid of all nodes to the center of `boundingBox`, so that node is at the box's center only when the drawing is symmetric. Absent: every node on one circle. A node in no shell is not placed and keeps its position. |

### `graphty-multipartite` (static)

| Option    | Type                                 | Default      | Meaning                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subsets` | `string \| readonly NodeSelection[]` | `"subset"`   | A node data field whose value names the layer, or the layers in order. Layers named by a field are ordered by value, numbers ascending and other values alphabetically. A node with no value in the field is not placed and keeps its position, so on a graph where no node has the field nothing moves. |
| `align`   | `"vertical" \| "horizontal"`         | `"vertical"` | `"vertical"`: each layer is a column whose nodes share one x, and the layers run left to right. `"horizontal"`: each layer is a row whose nodes share one y, and the layers run top to bottom.                                                                                                           |

### `graphty-bipartite` (static)

| Option        | Type                         | Default      | Meaning                                                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `top`         | `NodeSelection`              |              | The nodes of the first line, the left column when `align` is "vertical" and the top row when it is "horizontal". Absent: the first, third, fifth and so on of the laid-out nodes.                                                                                                         |
| `align`       | `"vertical" \| "horizontal"` | `"vertical"` | `"vertical"`: the two lines are columns, the first on the left. `"horizontal"`: they are rows, the first on top.                                                                                                                                                                          |
| `aspectRatio` | `number`                     | `4 / 3`      | The gap between the two lines, where a line is 1 long before the result is scaled into `boundingBox`. A line of k nodes covers (k - 1) / k of that length, so with 3 nodes a line the default gives a result twice as wide as it is tall. With `align: "horizontal"` the gap is vertical. |

### `graphty-bfs` (static)

When a node cannot be reached from `root`, `run()` throws `bfs_layout didn't include all nodes. Graph may be disconnected.` and emits no events ([failures before the run](../guide/layouts#events)).

| Option  | Type                         | Default        | Meaning                                                                                                                                                                                        |
| ------- | ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`  | `NodeSelection`              | the first node | The start node.                                                                                                                                                                                |
| `align` | `"vertical" \| "horizontal"` | `"vertical"`   | `"vertical"`: each layer is a column whose nodes share one x, and the layers run left to right. `"horizontal"`: each layer is a row whose nodes share one y, and the layers run top to bottom. |

### `graphty-radial` (static)

The nodes `root` cannot reach go on one extra ring outside the others.

| Option | Type            | Default                          | Meaning                                                                                                                                                                           |
| ------ | --------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root` | `NodeSelection` | the node with the most neighbors | The node the rings are drawn around. The fit moves the centroid of all nodes to the center of `boundingBox`, so `root` is at the box's center only when the drawing is symmetric. |

### `graphty-forceatlas2` (simulation)

| Option              | Type                                                              | Default    | Meaning                                                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodeMass`          | `string \| ArrayLike<number> \| Readonly<Record<string, number>>` | degree + 1 | Each node's mass: the name of a node data field (a node without a number there gets the default), an object keyed by node id, or one number per node in node order, as an array or a typed array (see Per-node arrays). Default: the node's degree + 1. |
| `nodeSize`          | `string \| ArrayLike<number> \| Readonly<Record<string, number>>` |            | Accepted for compatibility with Gephi's options and not used yet: nodes are treated as points.                                                                                                                                                          |
| `maxIter`           | `number`                                                          | `100`      | Iteration cap. The run also ends once it settles (see `settleThreshold`).                                                                                                                                                                               |
| `jitterTolerance`   | `number`                                                          | `1`        | How much swinging a node may show before its speed is cut; higher is faster and less precise.                                                                                                                                                           |
| `scalingRatio`      | `number`                                                          | `2`        | Strength of the repulsion between every pair of nodes; higher spreads the graph out.                                                                                                                                                                    |
| `gravity`           | `number`                                                          | `1`        | Pull toward the center, which keeps disconnected parts from drifting apart.                                                                                                                                                                             |
| `strongGravity`     | `boolean`                                                         | `false`    | Gravity that grows with the distance from the center instead of staying constant.                                                                                                                                                                       |
| `distributedAction` | `boolean`                                                         | `false`    | Divide each node's attraction by its mass, so well-connected nodes move less.                                                                                                                                                                           |
| `linlog`            | `boolean`                                                         | `false`    | Logarithmic attraction (LinLog mode), which draws clusters tighter.                                                                                                                                                                                     |
| `dissuadeHubs`      | `boolean`                                                         |            | Accepted for compatibility with Gephi's options and not used yet.                                                                                                                                                                                       |
| `settleThreshold`   | `number`                                                          | `0.001`    | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations.                                                                                                                                        |
| `settleWindow`      | `number`                                                          | `10`       | How many quiet iterations in a row (see `settleThreshold`) count as settled.                                                                                                                                                                            |
| `maxInFlight`       | `number`                                                          | `2`        | GPU only: how many batches of steps may wait on the GPU before the next step waits for the oldest to finish. A higher value keeps the GPU busier and shows each frame later. The CPU ignores it.                                                        |

### `graphty-fruchterman-reingold` (simulation)

| Option            | Type                     | Default       | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `k`               | `number`                 | `1 / sqrt(n)` | The ideal distance between neighbors, in layout units: the graph spans about 1 unit before it is scaled into `boundingBox`, so a value in pixels does not apply.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `iterations`      | `number`                 | `50`          | Iteration budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `cooling`         | `"linear" \| "adaptive"` | `"linear"`    | The cooling schedule. "linear": the temperature falls from 0.1 to 0 over `iterations` steps, and the run lasts the whole budget unless it settles first (see `settleThreshold`), which at the default threshold is rare. "adaptive": Yifan Hu's step control -- the temperature grows by 1 / 0.9 after five consecutive iterations whose total force energy fell and shrinks by 0.9 whenever it rose, so the run settles on its own, usually in a few hundred iterations whatever the graph size; `iterations` is then only a cap. GPU only; the CPU ignores it. |
| `settleThreshold` | `number`                 | `0.001`       | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `settleWindow`    | `number`                 | `10`          | How many quiet iterations in a row (see `settleThreshold`) count as settled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `maxInFlight`     | `number`                 | `2`           | GPU only: how many batches of steps may wait on the GPU before the next step waits for the oldest to finish. A higher value keeps the GPU busier and shows each frame later. The CPU ignores it.                                                                                                                                                                                                                                                                                                                                                                 |

### `graphty-spring-electrical` (simulation)

Runs only on the GPU. When the CPU is known before the run (`gpu: "off"`, `accelerator: null`, a browser with no `navigator.gpu`), `run()` throws and emits no events; otherwise, with no usable device, it emits `layouterror` and then `layoutstop`. `layout.backend` stays undefined either way. It has no iteration cap: it runs until it settles (see `settleThreshold` and `settleWindow`) or until you call `layout.stop()`.

| Option              | Type     | Default | Meaning                                                                                                                                                                                          |
| ------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `springLength`      | `number` | `10`    | The rest length of every edge's spring.                                                                                                                                                          |
| `springCoefficient` | `number` |         | Hooke's constant; null or absent: ngraph's 0.8 scaled down on graphs over a few hundred nodes (the GPU simulation's size rule).                                                                  |
| `gravity`           | `number` |         | ngraph's Coulomb constant (negative repels); null or absent: ngraph's -12 scaled down the same way.                                                                                              |
| `dragCoefficient`   | `number` | `0.9`   | Friction: the share of its velocity a node loses each iteration.                                                                                                                                 |
| `timeStep`          | `number` | `0.5`   | Integration step; larger moves faster and less stably.                                                                                                                                           |
| `settleThreshold`   | `number` | `0.001` | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations.                                                                                 |
| `settleWindow`      | `number` | `10`    | How many quiet iterations in a row (see `settleThreshold`) count as settled.                                                                                                                     |
| `maxInFlight`       | `number` | `2`     | GPU only: how many batches of steps may wait on the GPU before the next step waits for the oldest to finish. A higher value keeps the GPU busier and shows each frame later. The CPU ignores it. |

<!-- generated:layouts:end -->

## Try it

The [layout gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--layouts) runs every
layout in a tile of its own, each on a small graph that suits it.
