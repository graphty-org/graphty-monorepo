# Steppable Simulations

The one-shot [`forceAtlas2` and `fruchtermanReingold`](./force-directed.md) run to the end and return the final
drawing. Their steppable versions run one iteration at a time, so you can draw every frame, let the reader drag and pin
nodes while the forces keep running, and stop as soon as the drawing has settled.

## A Simulation in Five Calls

Create the simulation, hand it the graph and a position array, call `step()` until `settled`, then `dispose()`:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(barabasiAlbertGraph({ n: 100, m: 2, seed: 42 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN); // x, y, z per node

const sim = createSimulation("forceatlas2", { scale: 100, maxIter: 300, seed: 42 });
sim.load(graph, positions); // fills every NaN from the seed
while (!sim.settled) {
    sim.step(); // one iteration; `positions` now holds the new coordinates
}
sim.dispose();
console.log(Number.isFinite(positions[0])); // true
```

In a browser, call `step()` once per animation frame instead of in a loop, and redraw from `positions` after each call:

```text
function frame() {
    sim.step();
    draw(positions);
    if (!sim.settled) requestAnimationFrame(frame);
}
```

## The Position Array

The simulation does not return positions: it writes them into the `Float32Array` you pass to `load()`, three numbers
per node (`x, y, z`) in node order, on every `step()`. In 2D the third number is the center's z. Because the array is
yours, your renderer can read it directly, with no copy per frame.

Positions are in your scene's units: the simulation maps its own units onto the array with `scale` and `center`, and
never rescales between steps, so a node you pin or drag stays exactly where you put it.

Rows you fill before `load()` are kept as the start; rows holding `NaN` are drawn from `seed`. Read a node's position
by its id the same way as any result:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { createSimulation } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("c", "a");
const graph = builder.freeze();

const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
positions.set([0, 0, 0], 0); // start "a" at the origin; "b" and "c" come from the seed
const sim = createSimulation("fruchtermanReingold", { seed: 1, scale: 10 });
sim.load(graph, positions);
sim.step(10); // ten iterations in one call

const b = graph.ids.requireIndex("b");
console.log(positions.subarray(3 * b, 3 * b + 3).length); // 3
```

## The Two Simulations

`createSimulation(type, options)` takes the simulation type and that layout's options:

| Type                                  | Simulation           | Iteration budget         |
| ------------------------------------- | -------------------- | ------------------------ |
| `"forceatlas2"`                       | ForceAtlas2          | `maxIter`, default 100   |
| `"fruchtermanReingold"` or `"spring"` | Fruchterman-Reingold | `iterations`, default 50 |

The options are those of the one-shot layouts (`gravity`, `linlog`, `scalingRatio`, ... for ForceAtlas2; `k`, `fixed`
for Fruchterman-Reingold), plus `dim`, `scale`, `center`, `seed` and the stepping options below. You can also construct
the classes directly: `new ForceAtlas2Simulation(options)` and `new FruchtermanReingoldSimulation(options)`.
`new ForceAtlas2Simulation({ compat: "networkx" })` reproduces NetworkX's `forceatlas2_layout` instead of the
published algorithm.

## Stepping

- `step()` runs `iterationsPerStep` iterations (default 1); `step(k)` runs `k`. Running more iterations per frame
  settles a large graph in fewer frames, at a slower frame rate.
- `step()` does nothing once the simulation has settled, and stops in the middle of a batch when it settles.

## Stopping

`settled` becomes true at the iteration budget, or earlier once the layout has stopped moving: when the average
movement of the free nodes has stayed at or below `settleThreshold` times the layout's radius for `settleWindow`
iterations in a row (defaults 0.001 and 10).

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { ForceAtlas2Simulation } from "@graphty/layout";

const graph = fromEdgeArrays(gridGraph({ rows: 8, cols: 8 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);

// stop early once nodes move less than 1% of the layout's radius for 5 iterations
const sim = new ForceAtlas2Simulation({ maxIter: 5000, settleThreshold: 0.01, settleWindow: 5, seed: 3 });
sim.load(graph, positions);
while (!sim.settled) {
    sim.step();
}
console.log(sim.iterationsDone < 5000); // true
sim.dispose();
```

To stop on your own terms (a time budget, a reader's click), simply stop calling `step()`. `positions` already holds the
latest drawing. Call `dispose()` when you no longer need the simulation.

Fruchterman-Reingold cools on a fixed schedule by default, so it always runs its whole `iterations` budget.
`cooling: "adaptive"` lets it speed up while the layout improves and settle on its own, usually within a few hundred
iterations whatever the graph's size; `iterations` is then only a cap (default 10,000):

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(gridGraph({ rows: 8, cols: 8 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
const sim = createSimulation("spring", { cooling: "adaptive", seed: 3 });
sim.load(graph, positions);
let steps = 0;
while (!sim.settled) {
    sim.step();
    steps++;
}
console.log(steps < 10000); // true
sim.dispose();
```

## Seeds

The simulations are deterministic: the same graph, options, seed and start positions give the same drawing, step for
step, in every browser and in Node (the layouts use only arithmetic that JavaScript defines to the last bit). Without a
`seed`, the `NaN` rows are drawn from a random seed and every run starts differently.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 20 }));

function run(seed: number): Float32Array {
    const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
    const sim = createSimulation("forceatlas2", { seed, maxIter: 50 });
    sim.load(graph, positions);
    sim.step(50);
    sim.dispose();
    return positions;
}

const first = run(7);
const again = run(7);
console.log(first.every((v, i) => v === again[i])); // true
```

## Pinning and Dragging

- `setFixed(mask)` pins the nodes of a node mask: they stay where they are and still pull on their neighbors.
  `resolveNodeMask` from graph-format builds the mask from ids. Unpinning a node restarts the cooling so the layout
  can adjust; pinning more nodes does not.
- `setPosition(index, x, y, z)` moves one node at once (a drag) and restarts the cooling so its neighbors follow.

<!-- doc-check -->

```typescript
import { GraphBuilder, resolveNodeMask } from "@graphty/graph-format";
import { createSimulation } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
for (const leaf of ["a", "b", "c", "d", "e"]) {
    builder.addEdge("hub", leaf);
}
const graph = builder.freeze();
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
const sim = createSimulation("forceatlas2", { scale: 100, seed: 5 });
sim.load(graph, positions);

const hub = graph.ids.requireIndex("hub");
sim.setPosition(hub, 0, 0, 0); // the reader dropped the hub at the origin
sim.setFixed(resolveNodeMask(graph, { ids: ["hub"] })); // and pinned it there
while (!sim.settled) {
    sim.step();
}
console.log(positions[3 * hub], positions[3 * hub + 1]); // 0 0
sim.dispose();
```

## Directed Graphs

`load()` requires an undirected snapshot and throws on a directed one. `toLayoutSnapshot` returns the undirected copy:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { createSimulation, toLayoutSnapshot } from "@graphty/layout";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const graph = toLayoutSnapshot(builder.freeze());
const sim = createSimulation("forceatlas2", { seed: 1 });
sim.load(graph, new Float32Array(3 * graph.nodeCount).fill(NaN));
console.log(graph.directed); // false
sim.dispose();
```

The node numbers and ids of the copy are those of the original.

## GPU Acceleration

`createSimulation` takes an accelerator as its third argument. Given one from
[`@graphty/webgpu-graph-algorithms`](https://www.npmjs.com/package/@graphty/webgpu-graph-algorithms), it returns a
WebGPU simulation for the types the accelerator implements (and the CPU simulation otherwise). A GPU simulation's
`step()` returns a `Promise`, so `await sim.step()` in code that may receive either. The GPU package also adds a third
type, `"spring-electrical"`, which has no CPU simulation: `createSimulation` throws for it without an accelerator.
See [Performance](./performance.md) for when the GPU pays off.
