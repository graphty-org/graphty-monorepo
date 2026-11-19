# Layouts

Three force layouts run on the device: ForceAtlas2, Fruchterman-Reingold and the spring-electrical model of
ngraph.forcelayout. Each is a simulation with the same life cycle: create it, `load()` a graph and a positions array,
then either `run()` it to the end from a script or `step()` it once per animation frame.

## From a script

<<< ../examples/layout.ts

`createFruchtermanReingold(ctx, options)` and `createSpringElectrical(ctx, options)` work the same way, and so do the
accelerator's `acc.forceAtlas2(options)`, `acc.fruchtermanReingold(options)` and `acc.springElectrical(options)`,
which also apply the accelerator's layout tuning.

## What the simulations ask of the graph

- An **undirected** snapshot. A directed one is `E_SNAPSHOT`; pass `toUndirected().snapshot`.
- A **positions array** of `3 * nodeCount` floats: x, y and z per node, in scene units. Rows holding `NaN` are
  placed from the `seed` when the simulation loads; finite rows are kept as the starting layout. The simulation writes
  the layout back into the same array after every batch.
- In 2D, z is set to `center[2]` on every readback.

## In a browser frame loop

`step()` never blocks a frame. It submits one batch and returns a promise that resolves when that batch's positions
have been copied into your array. Draw whatever the array holds; it lags the GPU by at most one batch.

```ts
import { createAccelerator } from "@graphty/webgpu-graph-algorithms";
import { requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

const ctx = await requestGpuContext();
const sim = createAccelerator(ctx).forceAtlas2({ seed: 1, iterationsPerStep: 1, maxInFlight: 2 });
sim.load(snapshot, positions);

function frame(): void {
    if (!sim.settled) {
        sim.step().catch((error: unknown) => console.error(error)); // E_DEVICE_LOST, ...
    }
    draw(positions);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

While `maxInFlight` batches are in flight, `step()` queues nothing and returns the oldest pending promise. Interaction
goes through the simulation:

- `sim.setPosition(i, x, y, z)`: move one node (a drag); the layout reheats
- `sim.setFixed(mask)`: pin nodes, with a graph-format `NodeMask`
- `sim.reheat()`: start moving again after the layout settled
- `await sim.flush()`: wait until every submitted batch has landed in `positions`
- `sim.load(next, positions)`: switch to a new graph on the same simulation
- `sim.dispose()`: stop; then `ctx.release(snapshot)` when the graph goes away

## Options

All three take the shared options:

| Option                             | Default         | Meaning                                                                  |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------ |
| `dim`                              | `2`             | `2` or `3`                                                               |
| `scale`, `center`                  | `1`, the origin | scene units = layout units x `scale` + `center`                          |
| `seed`                             | none            | the seed of the `NaN` rows; the same seed gives the same start           |
| `settleThreshold`, `settleWindow`  | `0.001`, `10`   | settled when nodes barely moved for `settleWindow` iterations in a row   |
| `iterationsPerStep`, `maxInFlight` | `1`, `2`        | iterations per `step()`, and batches in flight before `step()` coalesces |

ForceAtlas2 adds the options of `@graphty/layout`'s CPU ForceAtlas2, with the same names and defaults (`maxIter`,
`scalingRatio`, `gravity`, `strongGravity`, `linlog`, `distributedAction`, `nodeMass`, `weight`, ...).
Fruchterman-Reingold adds `k` (the ideal edge length), `iterations` and `cooling` (`"linear"` or `"adaptive"`).
Spring-electrical adds `springLength`, `springCoefficient`, `gravity` (negative repels), `dragCoefficient`,
`timeStep` and `maxIter`. `FA2_DEFAULTS`, `FR_DEFAULTS` and `SE_DEFAULTS` hold the defaults.

`sim.setParams(patch)` changes options on a live simulation; `dim` and `maxInFlight` cannot change after creation.

## Large graphs: the repulsion tiers

Repulsion between every pair of nodes is the expensive part of a force layout. The GPU tuning (`GpuLayoutTuning`,
passed as `createAccelerator(ctx, { layout })` or alongside the layout options) picks how it is computed:

- `repulsion: "auto"` (the default) computes all pairs exactly up to `exactMaxNodes` (32768) nodes and uses a grid
  approximation above that
- `repulsion: "exact"` computes all pairs at any size: O(n^2) per iteration
- `repulsion: "grid"` uses the grid at any size

`calibrateLayout(ctx)` measures both tiers on the actual device and suggests an `exactMaxNodes` for it.

## Statistics

`sim.stats` describes the last completed batch: `iteration`, `meanDisplacement`, `rmsRadius`, `layoutRadius`,
`centroid`, `repulsionTier`, `msPerIteration`, and a `trace` with one record per iteration of the batch. ForceAtlas2
adds its speed controller's `swing`, `traction`, `speed` and `speedEfficiency`; Fruchterman-Reingold its
`temperature`; spring-electrical its `kineticEnergy`.

## Starting positions without a simulation

`seedPositions(snapshot, positions, seed, dim, scale, center, range)` fills the `NaN` rows of a positions array
exactly as a simulation does at `load()`: for drawing a graph before the first frame lands, or placing a subgraph the
same way twice.
