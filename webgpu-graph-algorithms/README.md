<img src="https://raw.githubusercontent.com/graphty-org/brand/main/guide/on-white/png/graphty-webgpu-graph-algorithms-lockup-color-on-light-800w.png" alt="graphty webgpu-graph-algorithms" width="467">

# @graphty/webgpu-graph-algorithms

WebGPU-accelerated graph algorithms and layouts over the `@graphty/graph-format` snapshot, for Node
(Dawn, through the `webgpu` npm package) and browsers (Chromium). One code base, four entry points:

| Entry                                      | Import            | What it gives you                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@graphty/webgpu-graph-algorithms`         | the core          | the layouts (`createForceAtlas2`, `createFruchtermanReingold`, `createSpringElectrical`, `seedPositions`), the algorithms (`pageRank`, `personalizedPageRank`, `hits`, `eigenvectorCentrality`, `katzCentrality`, `connectedComponents`, `breadthFirstSearch`, `sssp`, `bellmanFord`, `allPairsShortestPath`, `betweennessCentrality`, `edgeBetweennessCentrality`, `closenessCentrality`, `labelPropagation`, `minimumSpanningTree`, `triangleCount`, `degree`), `createAccelerator`, `calibrateLayout`, `verifyDevice`, `GpuContext`, `WebGpuGraphError`, `isSoftwareAdapter`, the constants (`EXACT_MAX_NODES`, `FA2_DEFAULTS`, `FR_DEFAULTS`, `SE_DEFAULTS`, `LAYOUT_TUNING_DEFAULTS`, ...) and the option / stats / accelerator types |
| `@graphty/webgpu-graph-algorithms/node`    | Node only         | `createNodeGpuContext`, `probeNodeWebGpu`, `createNodeGpu` (Dawn), `dawnFlags`, `acquireAccelerator`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `@graphty/webgpu-graph-algorithms/browser` | browsers only     | `probeBrowserWebGpu`, `requestGpuContext`, `acquireAccelerator`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `@graphty/webgpu-graph-algorithms/acquire` | Node and browsers | `acquireAccelerator`: the managed accelerator. The `browser` export condition resolves it to the browser build and `node` to the Node build, so one import line serves both and the two builds never meet in one bundle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**Three force layouts and seventeen graph algorithms, all on the GPU.**
ForceAtlas2, Fruchterman-Reingold and ngraph's spring-electrical preset run from Node (`run()`) and from a
browser frame loop (`step()` once per frame) at any size: the default `repulsion: "auto"` computes every pair of
nodes exactly up to `exactMaxNodes` = 32768 nodes and switches to the faster, approximate grid tier above it;
`repulsion: "exact"` forces all pairs at any size (O(n^2) per iteration: 18.971 ms per iteration at 100k nodes /
1M edges on an RTX 4070 SUPER) and `repulsion: "grid"` forces the grid tier. The algorithms run as plain async
calls on the same context: PageRank, personalized PageRank, HITS, eigenvector, Katz, betweenness, edge
betweenness and closeness centrality; weakly connected components, label propagation, triangle counting and the
minimum spanning forest; breadth-first search, single-source shortest paths (non-negative weights and
Bellman-Ford) and all-pairs shortest paths; and the `degree` diagnostic.
There is no CPU fallback anywhere in this package: when no adapter or device exists it throws
`WebGpuGraphError`.

## Install

```bash
npm install @graphty/webgpu-graph-algorithms @graphty/graph-format
# Node only: Dawn is an OPTIONAL peer dependency (browser consumers never install it)
npm install webgpu@0.6.1
```

Which build a Linux consumer can run is decided by their distribution, and the two available builds do not
overlap. `webgpu@0.5.0` moved its Linux build base to Ubuntu 24.04, so `webgpu@0.6.x` needs `GLIBC_2.38` and
`GLIBCXX_3.4.32` -- Ubuntu 24.04 or newer, which ship glibc 2.39 and GLIBCXX_3.4.33. `webgpu@0.4.0` is the last
build that runs below that line: it needs no more than `GLIBC_2.34` and `GLIBCXX_3.4.30`, which Ubuntu 22.04
satisfies. Loading 0.6.x on 22.04 fails at `require` with
`libstdc++.so.6: version 'GLIBCXX_3.4.32' not found`, not at adapter acquisition. The peer range
`>=0.4.0 <1.0.0` admits both on purpose, so a consumer pins the one their distribution can load; a Node
consumer that forgets the package entirely gets `E_NO_WEBGPU` with the message
"install the optional peer dependency webgpu@0.6.1". `@graphty/algorithms` and `@graphty/layout` are optional
peer dependencies too: the accelerator interfaces and option types of both are `import type`d from those
packages and re-exported, so they are those packages' own declarations. A consumer that type-checks against the
accelerator types (without `skipLibCheck`) installs the package it names; a consumer that never touches them
does not need it.

## ForceAtlas2 from Node

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { createForceAtlas2 } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext(); // Dawn; { adapter: "llvmpipe" } selects Mesa's software adapter
const snapshot = fromEdgeArrays({ directed: false, nodeCount, src, dst, weights }); // undirected: pass toUndirected().snapshot otherwise

// Your stride-3 array: x, y, z per node in scene units. NaN rows are seeded by the CPU port's LCG
// (seed 42 here) inside [-1, 1) x scale + center; finite rows are kept as the starting layout.
const positions = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);

const sim = createForceAtlas2(ctx, { seed: 42, dim: 2, maxIter: 200, gravity: 1, scalingRatio: 2 });
sim.load(snapshot, positions); // uploads the CSR core, seeds the NaN rows, compiles the kernels
const stats = await sim.run({ batch: 8 }); // 8 iterations per submit until settled or maxIter
console.log(sim.iterationsDone, sim.settled, stats.speed, stats.rmsRadius, stats.layoutRadius);
// positions now holds the layout; stats.trace holds the last batch's per-iteration controller values

sim.dispose(); // destroys the simulation's buffers
ctx.release(snapshot); // destroys the snapshot's buffers (nothing is freed by GC)
ctx.dispose(); // destroys the device and lets the process exit
```

Above `exactMaxNodes` the default `"auto"` picks the grid tier (by the node count alone); `repulsion: "exact"`
keeps the all-pairs tier at any size and `repulsion: "grid"` picks the grid tier at any size. The same run
from the command line, with a verification of the result:

```bash
pnpm exec tsx benchmarks/layout-run.ts --nodes 100000 --edges 1000000 --iterations 100 --batch 8
```

## ForceAtlas2 in a browser frame loop

The simulation never blocks a frame: `step()` submits one batch and returns a promise that resolves when
that batch's positions have been copied into your array; while `maxInFlight` batches are in flight the call
coalesces (nothing is queued, the oldest pending batch's promise is returned). Attach `.catch` once per
distinct promise and draw whatever the array holds -- it lags the GPU by at most one batch.

```ts
import { createAccelerator } from "@graphty/webgpu-graph-algorithms";
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

const probe = await probeBrowserWebGpu(); // never throws: { ok, code, reason, adapter, summary }
if (!probe.ok) {
    throw new Error(`${probe.code}: ${probe.reason ?? ""}`); // E_NO_WEBGPU, E_NO_ADAPTER or E_SOFTWARE_ONLY
}
const ctx = await requestGpuContext({ adapter: probe.adapter ?? undefined });
const acc = createAccelerator(ctx, { layout: { exactMaxNodes: 4096 } }); // the tuning every simulation inherits
const sim = acc.forceAtlas2({ seed: 1, iterationsPerStep: 1, maxInFlight: 2 });
sim.load(snapshot, positions); // positions: your stride-3 Float32Array; NaN rows are seeded

let last: Promise<void> | null = null;
function frame(): void {
    if (!sim.settled) {
        const p = sim.step(); // never awaited
        if (p !== last) {
            last = p;
            p.catch((error: unknown) => {
                console.error(error); // E_DEVICE_LOST, E_VALIDATION, ...; the simulation is disposed on device loss
            });
        }
    }
    draw(positions);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// interaction
sim.setPosition(i, x, y, 0); // a drag: written to the device now, visible in the next readback, reheats
sim.setFixed(mask); // pins: a graph-format NodeMask (ceil(n / 32) words); an unpin reheats, a pin does not
sim.reheat(); // "play again" after the layout settled (nothing is reset but the counters)
await sim.flush(); // pause: resolves when every submitted batch has landed in `positions`
sim.dispose(); // stop; then ctx.release(snapshot) and ctx.dispose() when the graph goes away
```

`stats` and `settled` describe the last completed batch. Topology changes go through `load(next,
remappedPositions)` on the same simulation: in-flight readbacks of the old graph are discarded, new (NaN)
rows are seeded inside the current bounding box, the fixed mask and the position overrides are cleared (the
caller re-issues its pins with a mask over the new index space), and the simulation reheats.

## Options

`createForceAtlas2(ctx, options)` and `accelerator.forceAtlas2(options)` take `ForceAtlas2Options` (the same
names and defaults as the CPU port in `@graphty/layout`) plus the GPU tuning:

| Option                            | Default          | Meaning                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dim`                             | `2`              | `2` or `3`; in 2D every readback writes `z = center[2]` whatever was uploaded                                                                                                                                                                                                                            |
| `scale`, `center`                 | `1`, `[0, 0, 0]` | scene units = layout units x `scale` + `center`                                                                                                                                                                                                                                                          |
| `seed`                            | `null`           | the LCG seed of the NaN rows (the CPU port's generator, bit for bit); `0` / `null` draws a random seed                                                                                                                                                                                                   |
| `maxIter`                         | `100`            | `run()` stops and `settled` turns true after this many iterations since `load()` / `reheat()`                                                                                                                                                                                                            |
| `jitterTolerance`                 | `1`              | the speed controller's tolerance                                                                                                                                                                                                                                                                         |
| `scalingRatio`                    | `2`              | the repulsion constant                                                                                                                                                                                                                                                                                   |
| `gravity`                         | `1`              | toward the centroid (`compat: "paper"`) or the origin (`compat: "networkx"`)                                                                                                                                                                                                                             |
| `strongGravity`                   | `false`          | gravity proportional to the distance                                                                                                                                                                                                                                                                     |
| `distributedAction`               | `false`          | attraction divided by the source's mass                                                                                                                                                                                                                                                                  |
| `linlog`                          | `false`          | logarithmic attraction                                                                                                                                                                                                                                                                                   |
| `nodeMass`                        | `null`           | `null`: the node column with the role `mass` when present, else `outDegree + 1`; a `Float32Array` of length n; a numeric node column name (a `Record` is `E_UNSUPPORTED`)                                                                                                                                |
| `nodeSize`                        | `null`           | `E_UNSUPPORTED` when non-null (no overlap prevention)                                                                                                                                                                                                                                                    |
| `weight`                          | unset            | `true`: the snapshot's arc weights; an edge column name: that numeric column; unset / `false` / `null`: every edge weighs 1                                                                                                                                                                              |
| `dissuadeHubs`                    | `false`          | each node's attraction divided by its degree + 1 (on top of `distributedAction`)                                                                                                                                                                                                                         |
| `settleThreshold`, `settleWindow` | `0.001`, `10`    | settled when the mean displacement stayed below `settleThreshold x rmsRadius` AND below an absolute floor (a fraction of the model's length unit: 0.003 `springLength` x (2000 / n)^(1/4) for spring-electrical, 0.002 `k` for Fruchterman-Reingold; ForceAtlas2 has none) for `settleWindow` iterations |
| `iterationsPerStep`               | `1`              | iterations per `step()` (the Node `run()` uses its own `batch`)                                                                                                                                                                                                                                          |
| `maxInFlight`                     | `2`              | batches in flight before `step()` coalesces; `1` for the strictest freshness                                                                                                                                                                                                                             |

GPU tuning (`GpuLayoutTuning`; also the `layout` field of `createAccelerator`'s options, inherited by every
simulation the accelerator creates):

| Option                                              | Default                 | Meaning                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repulsion`                                         | `"auto"`                | `"exact"` at any n; `"auto"` = exact iff n <= `exactMaxNodes`, else grid; `"grid"` at any n                                                                                                                                                                                                                                     |
| `exactMaxNodes`                                     | `32768`                 | the largest node count `"auto"` runs on the exact tier. The exact tier is the more accurate one, so the default keeps it well past the size where the grid tier becomes faster (about 1024 nodes on an RTX 4070 SUPER); `calibrateLayout(ctx)` measures that crossover on your device                                           |
| `deterministic`                                     | `true`                  | fixed summation order (the exact tier is always deterministic)                                                                                                                                                                                                                                                                  |
| `compat`                                            | `"paper"`               | `"networkx"` reproduces NetworkX 3.4's `forceatlas2_layout` (gravity toward the origin, its accumulated swing / traction)                                                                                                                                                                                                       |
| `nearMax`, `gridMax2D`, `gridMax3D`, `extentFactor` | `64`, `512`, `128`, `6` | the grid tier's shape: a grid cell holding more than `nearMax` nodes is sampled by `nearMax` draws instead of summed exactly; the finest grid is at most `gridMax2D` cells a side in 2D and `gridMax3D` in 3D; the grid spans at most `extentFactor` times the layout's RMS radius, and nodes outside it are summed per orthant |

Every range error is `E_INVALID_ARGUMENT` (`gravity < 0`, `scalingRatio <= 0`, `jitterTolerance <= 0`,
`maxIter < 1`, `settleWindow < 1`, `maxInFlight < 1`, `iterationsPerStep < 1`, `dim` not 2 or 3,
`scale <= 0`). `setParams(patch)` changes the options of a live simulation; a force-law change (`linlog`,
`strongGravity`, `distributedAction`) recompiles and resets the speed controller, a numeric tweak only changes
the next batch's parameters; `dim` and `maxInFlight` cannot change after creation.

## Stats

`sim.stats` (`ForceAtlas2Stats`) after every completed batch: `iteration`, `swing`, `traction`, `speed`,
`speedEfficiency`, `meanDisplacement`, `rmsRadius`, `layoutRadius` (max |p - centroid|), `centroid`,
`repulsionTier` (`"exact"` or `"grid"`), `msPerIteration` (the GPU time per iteration when `timestamp-query` was
granted, else the batch's wall time divided by its iteration count), the grid fields `maxCellOccupancy` (the most
nodes in one grid cell) and `outsideGrid` (the nodes outside the grid's extent), both `null` on the exact tier, and
`trace`: one `{ swing, traction, speed, speedEfficiency, meanDisplacement, settledCount }` record per
iteration of the last batch.

## Fruchterman-Reingold and the spring-electrical preset

Two more force layouts ship beside ForceAtlas2, on the same exact and grid repulsion tiers and with exactly the
lifecycle the two ForceAtlas2 sections above describe: `load(snapshot, positions)`, then `run()` from Node or
`step()` once per frame, with `stats`, `settled`, `setPosition`, `setFixed`, `reheat`, `flush`, `setParams`,
`dispose` and the coalescing rule all unchanged. They differ in the force law, in their option records and in
what their trace carries. Both are also methods of an accelerator: `acc.fruchtermanReingold(options)` and
`acc.springElectrical(options)`, which pass the accelerator's `layout` tuning down the same way
`acc.forceAtlas2` does.

What they ask of the graph, and what they refuse, is ForceAtlas2's:

- an UNDIRECTED snapshot. `load()` throws `E_SNAPSHOT { reason: "directed" }` otherwise; pass
  `toUndirected().snapshot`
- edge weights are ignored by both models, and both give every node the same mass rule for its whole run --
  1 for Fruchterman-Reingold, `1 + degree / 3` for the spring preset -- so neither has a `weight` or
  `nodeMass` option to pass
- `positions` is your stride-3 scene-unit `Float32Array` of length `3 * nodeCount`, over a plain
  `ArrayBuffer`; any other length is `E_INVALID_ARGUMENT`. Rows holding a non-finite component are seeded in
  place at `load()` (see `seedPositions` below), finite rows are the starting layout
- an empty snapshot (`nodeCount: 0`) loads without touching the GPU and is `settled` on arrival; `step()`
  resolves immediately and the positions array is left alone
- a graph the device cannot hold is refused at `load()`, before any GPU work:
  `E_TOO_LARGE { path: "positions" }` when `16 * nodeCount` bytes exceed the device's `maxBufferSize`,
  `{ path: "windowed" }` when the arc arrays need more than one storage binding, and `{ path: "partials" }`
  above 16,776,960 nodes
- above `exactMaxNodes` the default `repulsion: "auto"` runs the grid tier, as ForceAtlas2 does;
  `repulsion: "exact"` runs all pairs at any size

The GPU tuning table above applies to both, with one exception: `compat` is read by ForceAtlas2 alone and
changes nothing here.

### Fruchterman-Reingold

The spring model of the original paper: every pair of nodes repels with `k^2 / d`, every edge pulls with
`d^2 / k`, where `k` is the ideal edge length, and a falling temperature caps how far a node may move in a
single iteration.

```ts
import { createFruchtermanReingold } from "@graphty/webgpu-graph-algorithms";

// positions: your stride-3 scene-unit array; NaN rows are seeded at load(), finite rows are kept
const positions = new Float32Array(3 * snapshot.nodeCount).fill(Number.NaN);

const sim = createFruchtermanReingold(ctx, { iterations: 50, cooling: "linear", seed: 42, dim: 2 });
sim.load(snapshot, positions); // an undirected snapshot
const stats = await sim.run({ batch: 8 }); // stops at `iterations` or when the layout settles
console.log(sim.iterationsDone, sim.settled, stats.temperature, stats.meanDisplacement);

sim.dispose(); // then ctx.release(snapshot) and ctx.dispose() when the graph goes away
```

| Option                                                                | Default                       | Meaning                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `k`                                                                   | `null`                        | the ideal edge length. `null` (and `0`, and `NaN`) means `1 / sqrt(nodeCount)`, resolved at `load()`; anything else must be a finite number > 0                                                                                                                                                                                                         |
| `iterations`                                                          | `50`                          | an integer >= 0 and the budget `run()` stops at (`0` is settled on arrival). Under `cooling: "adaptive"` it is only a cap, and an option record that never set it gets `10000` instead                                                                                                                                                                  |
| `cooling`                                                             | `"linear"`                    | `"linear"`: the temperature falls from `0.1` to `0` across `iterations`, so a run lasts the whole budget. `"adaptive"`: Yifan Hu's step control -- the temperature shrinks by `0.9` whenever the total force energy rose and grows by `1 / 0.9` after five consecutive falls -- so a run ends when the layout stops moving rather than at a fixed count |
| `fixed`                                                               | `null`                        | which nodes are pinned, applied at `load()`: a graph-format `NodeMask`, the name of a bool node column, or `null`, which takes the column with role `fixed` when the snapshot has one and pins nothing otherwise. Not a live option: `setParams({ fixed })` is `E_INVALID_ARGUMENT`, use `setFixed(mask)`                                               |
| `dim`, `scale`, `center`, `seed`                                      | `2`, `1`, `[0, 0, 0]`, `null` | as ForceAtlas2                                                                                                                                                                                                                                                                                                                                          |
| `settleThreshold`, `settleWindow`, `iterationsPerStep`, `maxInFlight` | `0.001`, `10`, `1`, `2`       | as ForceAtlas2                                                                                                                                                                                                                                                                                                                                          |

`FR_DEFAULTS` is the frozen record of those defaults (`center` and `seed` are the shared ones and are not in
it). Every range error is `E_INVALID_ARGUMENT`, and `maxInFlight` cannot change after creation.

`sim.stats` is `FruchtermanReingoldStats`: everything in `LayoutStatsBase` -- `iteration`,
`meanDisplacement`, `rmsRadius`, `layoutRadius`, `centroid`, `repulsionTier` (`"exact"`), `msPerIteration`
and the grid fields, which are `null` -- plus `temperature`, the schedule's value for the last completed
iteration, and `trace`: one `{ temperature, meanDisplacement, settledCount }` record per iteration of the
last batch.

### The spring-electrical preset

ngraph.forcelayout's model with ngraph's own constants: Hooke springs along the edges, Coulomb repulsion
between every pair, and a velocity integrated with drag. A node's mass is `1 + degree / 3`, as ngraph
assigns it.

```ts
import { createSpringElectrical } from "@graphty/webgpu-graph-algorithms";

const sim = createSpringElectrical(ctx, { springLength: 10, timeStep: 0.5, seed: 42 });
sim.load(snapshot, positions);
const stats = await sim.run({ maxIter: 1000, batch: 8 }); // pass maxIter: this model has no iteration count
console.log(sim.iterationsDone, sim.settled, stats.kineticEnergy);

sim.dispose();
```

| Option                                                                | Default                       | Meaning                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxIter`                                                             | `null`                        | the iteration cap; an integer >= 1, or `null` for none                                                                                                                                     |
| `springLength`                                                        | `10`                          | the rest length of an edge; a finite number > 0                                                                                                                                            |
| `springCoefficient`                                                   | `0.8`, size-scaled            | Hooke's constant. Left out or `null` it is ngraph's `0.8` times `min(1, 300 / nodeCount)`, applied once `nodeCount` is known at `load()`; a number you pass is used as given at every size |
| `gravity`                                                             | `-12`, size-scaled            | ngraph's Coulomb constant, where NEGATIVE repels -- this is not ForceAtlas2's centre gravity. Left out or `null` it is ngraph's `-12` times the same factor. Any finite number is accepted |
| `dragCoefficient`                                                     | `0.9`                         | velocity damping; a finite number >= 0                                                                                                                                                     |
| `timeStep`                                                            | `0.5`                         | the integrator's step; a finite number > 0                                                                                                                                                 |
| `dim`, `scale`, `center`, `seed`                                      | `2`, `1`, `[0, 0, 0]`, `null` | as ForceAtlas2                                                                                                                                                                             |
| `settleThreshold`, `settleWindow`, `iterationsPerStep`, `maxInFlight` | `0.001`, `10`, `1`, `2`       | as ForceAtlas2                                                                                                                                                                             |

The size scaling exists because ngraph's constants were tuned for graphs of a few hundred nodes: on tens of
thousands the per-node forces are large enough that every node moves at the unit speed clamp and the layout
never comes to rest. `SE_DEFAULTS` is the frozen record of the unscaled constants.

`maxIter` stops the run and turns `settled` true after that many iterations since `load()` / `reheat()`, as
ForceAtlas2's does. Without it, and without `run({ maxIter })`, `run()` returns only when the layout settles.

`sim.stats` is `SpringElectricalStats`: `LayoutStatsBase` plus `kineticEnergy`, and a `trace` of
`{ kineticEnergy, meanDisplacement, settledCount }`. The energy lags the positions by one iteration -- the
iteration that follows an integrate is the one that folds its energy -- so the first record after `load()`
carries `0` and record i carries the energy of iteration i - 1.

## The `seedPositions` helper

Every simulation seeds the unplaced rows of your positions array at `load()`, so you never have to call this.
It is public for the case where you want the same starting layout without a simulation -- to draw the graph
before the first frame lands, to reproduce a run on the CPU, or to place a subgraph the same way twice.

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { seedPositions } from "@graphty/webgpu-graph-algorithms";

const s = fromEdgeArrays({ directed: false, nodeCount: 3, src: new Uint32Array([0]), dst: new Uint32Array([1]) });
const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);

seedPositions(s, positions, 42, 2, 1, null, "fa2");
// every row now holds x and y in [-1, 1) and z = 0; seed 42 gives this same array every time
```

The arguments are positional and all required: the snapshot, your stride-3 scene-unit array (modified
in place, length `3 * nodeCount`), the LCG seed (an integer >= 0, or `null` for a random one; any other value
throws `E_INVALID_ARGUMENT`), `dim` (`2` or `3`), the scene `scale` (> 0), the scene `center` (an `ArrayLike<number>`, or
`null` for the origin), and the draw range: `"fa2"` is `[-1, 1)` in layout units, `"fr"` is `[0, 1)`.
ForceAtlas2 and the spring preset seed with `"fa2"`, Fruchterman-Reingold with `"fr"`.

A row counts as unseeded when ANY of its first `dim` components is not finite, and only its non-finite
components are written -- a finite component is never changed and a fully finite row is never touched. In 2D
the third component of a row being seeded is set to `center[2]`. The draw box depends on what is already
there: when no row is fully finite the draw is the plain range per axis, and otherwise it is the `[min, max]`
box of the finite components, per axis, so new nodes land among the ones already placed instead of around the
origin. No random number is drawn at all when nothing needs seeding. A bad `dim`, a `positions` length other
than `3 * nodeCount`, a non-positive `scale`
or a non-finite `center` component is `E_INVALID_ARGUMENT`; the function returns nothing.

## Acquisition

### One call: `acquireAccelerator`

Most applications want "a working GPU accelerator, or the reason there is none". `acquireAccelerator` is that
call, the same in Node and in a browser:

```ts
import { accelerated } from "@graphty/algorithms";
import { acquireAccelerator } from "@graphty/webgpu-graph-algorithms/acquire";

const gpu = acquireAccelerator(); // nothing is probed until the first current()

const result = await gpu.current();
if (!result.ok) {
    console.warn(`running on the CPU: ${result.reason}`, result.fix ?? "");
}
// the GPU when there is one, the CPU otherwise
const ranks = await accelerated(result.ok ? result.accelerator : null).pageRank(snapshot);

gpu.dispose(); // when you are done: releases the device
```

The first `current()` probes for an adapter, opens a context, runs the device self-check (below) and builds the
accelerator. Later calls return the same accelerator. After the device is lost, or after you dispose the
accelerator, the next `current()` acquires a new device; a run that was in flight when the device was lost still
fails with `E_DEVICE_LOST`, because finishing it somewhere else would hide the failure.

`result.ok === false` is a decision made before any work runs, so running a CPU implementation then is detection,
not a fallback. `result.code` says why:

| Code                 | Meaning                                                                      | `result.fix`                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `E_NO_WEBGPU`        | no WebGPU in this runtime; in Node, the optional `webgpu` package is missing | Node: the install command; a browser page that is not a secure context: serve it over https or from localhost |
| `E_NO_ADAPTER`       | WebGPU exists but no adapter answered                                        | null                                                                                                          |
| `E_SOFTWARE_ONLY`    | the adapter is a software renderer (llvmpipe, SwiftShader, WARP)             | pass `acceptSoftware: true`                                                                                   |
| `E_DEVICE_INCORRECT` | the device got a known prefix sum wrong; `result.check` says where           | null                                                                                                          |

Options: `acceptSoftware` (default `false`: a software adapter is usually slower than the CPU), `powerPreference`
(default `"high-performance"`), `accelerator` (passed to `createAccelerator`: layout tuning, betweenness
defaults), `warnUnreleasedSnapshots`, and in Node `adapter` (a substring of the Dawn adapter name, such as
`"4070"`; ignored in a browser). A decline is remembered for the life of the handle; create a new handle to ask
again. Any other failure (a device request that failed) rejects `current()`, and the next call tries again.

`@graphty/webgpu-graph-algorithms/acquire` has no build of its own: the `browser` export condition (and the
default) resolves it to the `./browser` build, `node` to the `./node` build. The `./browser` and `./node`
subpaths export the same `acquireAccelerator` for code that is only ever one or the other.

A browser application that already draws with WebGPU can run on its own device instead of opening a second one:

```ts
import { acquireAccelerator } from "@graphty/webgpu-graph-algorithms/browser";

const device = await adapter.requestDevice();
const result = await acquireAccelerator({ device }).current();
```

The device stays yours: disposing the accelerator does not destroy it, and it should go after the accelerator. Your own uncaptured
errors stay yours too, and a batch of the accelerator's that fails validation rejects that batch. After a loss, acquire again with the
new device. `GpuContext.from(device, info, { errorSink: false })` is the same adoption without the managed handle.

The lower-level calls below are what it is made of, for when you need a context without an accelerator, your own
device, or control over limits and features.

### Node

```ts
import { hasErrorCode } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpu, createNodeGpuContext, probeNodeWebGpu } from "@graphty/webgpu-graph-algorithms/node";

const probe = await probeNodeWebGpu(); // never throws; probe.summary has vendor / architecture / software / limits
console.log(probe.ok, probe.code, probe.summary?.software);
try {
    const ctx = await createNodeGpuContext({ rejectSoftware: true }); // Dawn + GpuContext.create
    console.log(ctx.caps.vendor, ctx.caps.architecture, ctx.caps.software ? "software" : "hardware");
    ctx.dispose();
} catch (error) {
    if (hasErrorCode(error, "E_NO_WEBGPU") || hasErrorCode(error, "E_SOFTWARE_ONLY")) {
        console.error((error as Error).message);
        process.exit(1);
    }
    throw error;
}
const handle = await createNodeGpu({ software: false }); // the bare Dawn handle: import("webgpu"), globals, create(flags)
handle.dispose();
```

Options of `createNodeGpu` / `createNodeGpuContext`: `adapter` (Dawn `adapter=<substring>`, e.g. `"llvmpipe"`
or `"4070"`), `backend` (`"vulkan"` | `"null"` | ...), `dawnFeatures` (Dawn toggles to turn on), `dawnDisableFeatures`
(Dawn toggles to turn off -- `"timestamp_quantization"` is the one to reach for, since Dawn 0.6.x rounds every
timestamp-query result to a 65,536 ns grid by default), `software` (shorthand
for `adapter=llvmpipe`, Linux / Mesa specific), `installGlobals` (default `true`: `GPUBufferUsage` and friends
on `globalThis`), plus the `GpuContext.create` options (`powerPreference`, `rejectSoftware`, `limits`
(`"raise"` by default), `optionalFeatures` (`["subgroups", "timestamp-query"]` by default), `label`,
`onError`).

On a machine where the NVIDIA Vulkan driver cannot find `libEGL.so.1` (a container without `libegl1`),
Dawn silently lists only llvmpipe. Install `libegl1`, or, without root, extract the library and put it on the
library path:

```bash
mkdir -p egl && cd egl
apt-get download libegl1 libglvnd0
dpkg -x libegl1_*.deb root && dpkg -x libglvnd0_*.deb root
export LD_LIBRARY_PATH="$PWD/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
```

Headless Chromium needs the same library, plus the flags `--enable-unsafe-webgpu --enable-features=Vulkan
--use-angle=vulkan --disable-vulkan-surface`, to reach an NVIDIA card instead of SwiftShader.

### Browser

```ts
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

const probe = await probeBrowserWebGpu(); // never throws: { ok, code, reason, adapter, summary }
if (probe.ok) {
    const ctx = await requestGpuContext({ adapter: probe.adapter ?? undefined });
    // ... createAccelerator(ctx), createForceAtlas2(ctx, ...), degree(ctx, snapshot)
    ctx.dispose();
}
```

Chromium only until Firefox / WebKit ship `subgroups` and `timestamp-query` on Linux CI. The `./node`
subpath is never reachable from browser code: nothing in the core or the browser entry imports it, and
`sideEffects: false` lets bundlers drop what you do not use.

## The `degree` diagnostic

`degree(ctx, snapshot)` is the walking-skeleton kernel kept public as a diagnostic: it runs the row-walking gather with the
package's dummy-binding pattern and returns a `Uint32Array` equal to `snapshot.outDegree()`. If it disagrees, nothing else
will work; if it agrees, the device, the upload path, the pipeline cache and the readback ring all do.

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { degree } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext(); // Dawn through the webgpu package; { adapter: "llvmpipe" } selects the software adapter
const s = fromEdgeArrays({ directed: false, nodeCount: 3, src: new Uint32Array([0, 1]), dst: new Uint32Array([1, 2]) });
const out = await degree(ctx, s); // Uint32Array [1, 2, 1] === s.outDegree()
ctx.release(s); // destroys the snapshot's buffers (nothing is freed by GC)
ctx.dispose(); // destroys the device and lets the process exit
```

In a browser, `import { requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser"` and `const ctx = await
requestGpuContext();` replace the first import and line; the rest is identical.

## Algorithms

Every algorithm function has the same shape -- `await fn(ctx, snapshot, options?)`, with a source node index
before the options for `breadthFirstSearch`, `sssp` and `bellmanFord` -- and every per-node array that comes back is indexed by the snapshot's NODE INDEX (`0 .. nodeCount - 1`), never by
node id; the snapshot's id map turns an index back into the id it was built from. Every score result carries
`precision: "f32"`, so a reader can label what it is looking at.

The context uploads what an algorithm needs the first time it sees a snapshot and keeps it until
`ctx.release(snapshot)`: the CSR core for PageRank, HITS, eigenvector centrality and connected components,
the reverse adjacency for PageRank, HITS and Katz, the edge list for connected components. A second call on
the same snapshot pays no upload.

Each one except `degree` is also a method of the object `createAccelerator(ctx)` returns -- `acc.pageRank(s,
options)` and so on, with `connectedComponents` answering to `weaklyConnectedComponents` as well -- which is how
`@graphty/algorithms` reaches them when a GPU accelerator is injected into it.

The PageRank example below is complete; the examples after it reuse its context `ctx` and its snapshot `s`
rather than repeating the setup.

Options every one of them accepts on top of its own (`GpuRunOptions`):

| Option       | Default | Meaning                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dest`       | unset   | a preallocated result of exactly `nodeCount` elements over a plain `ArrayBuffer`: a `Float32Array` for scores and distances, a `Uint32Array` for labels, depths and counts. Any other type or length is `E_INVALID_ARGUMENT { argument: "dest" }`; `hits` fills it with the hubs. Each section below says which array it fills when that is not obvious |
| `signal`     | unset   | an `AbortSignal`, checked before the first submit and after every batch; `E_ABORTED { batchId }`                                                                                                                                                                                                                                                        |
| `onProgress` | unset   | `(done, total)` after every batch. `total` is `maxIterations`, `2 * maxIterations` for `hits` (it runs two chains) and `1` for `connectedComponents`, which reports once when it finishes                                                                                                                                                               |

A graph too large for the device is refused before any GPU work. When the arc arrays need more than one
storage binding they need a windowed upload, which `degree` and `breadthFirstSearch` execute; PageRank,
personalized PageRank, HITS, eigenvector and Katz centrality and connected components throw
`E_TOO_LARGE { needed, limit, path: "windowed" }` instead. The other algorithms' own size limits are in their
sections below. A node count whose dispatch does not fit
the device's 2D workgroup grid is `E_TOO_LARGE { path: "dispatch" }`, and scratch that does not fit the
device's budget is `E_OUT_OF_MEMORY { requested, resident, label }`.

### PageRank

PageRank is the stationary distribution of a surfer who follows an out-arc with probability `dampingFactor`
and teleports to a uniformly random node otherwise. `pageRank` runs NetworkX's iteration on the device: rank
is pulled along the reverse adjacency, out-weights normalise the push, and the mass sitting on nodes with no
out-arcs is redistributed through the teleport vector every iteration.

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { pageRank } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext();
const s = fromEdgeArrays({
    directed: true,
    nodeCount: 4,
    src: new Uint32Array([0, 1, 2, 3]), // a tail into a 3-cycle: 0 -> 1 -> 2 -> 3 -> 1
    dst: new Uint32Array([1, 2, 3, 1]),
});

const r = await pageRank(ctx, s, { dampingFactor: 0.85, tolerance: 1e-6 });
console.log(r.scores); // Float32Array(4), index-aligned, summing to 1; node 0 scores lowest
console.log(r.iterations, r.converged, r.danglingMass);

ctx.release(s); // when the graph goes away; ctx.dispose() at the end of the program
```

| Option          | Default | Meaning                                                                                                              |
| --------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor` | `0.85`  | the probability of following an arc, in [0, 1]; the rest teleports. Anything else is `E_INVALID_ARGUMENT`            |
| `maxIterations` | `100`   | an integer >= 1; anything else is `E_INVALID_ARGUMENT`                                                               |
| `tolerance`     | `1e-6`  | a finite number >= 0; converged when the summed (L1) change of the scores falls below `tolerance`, at any node count |
| `weighted`      | `true`  | arc weights are the transition mass; `false` weighs every arc 1. A snapshot with no weights is unweighted either way |

`GpuPageRankResult` comes back: `scores` (one f32 per node, summing to 1 up to f32 rounding), `iterations`
(the FIRST iteration whose delta fell below the threshold, not the batch boundary the run stopped at, and
`maxIterations` when it never did), `converged`, `danglingMass` (the rank mass the last iteration found on
nodes with no positive out-weight and redistributed) and `precision`.

Directed or undirected both work: an undirected snapshot carries both directions, so the pull and the
normaliser see the same arcs, and the scores differ from the directed form's as they should. `nodeCount: 0`
returns an empty `scores` with `iterations: 0`, `converged: true` and does no GPU work. A graph with no arcs
at all makes every node dangling, so the teleport vector is already the fixed point: the call returns
`1 / nodeCount` everywhere with `iterations: 0` and `danglingMass: 1`. An isolated node inside a larger graph
is one dangling node -- it keeps its teleport share and its share of the redistributed mass -- and so is a
node whose out-arcs all weigh zero under `weighted: true`.

### Personalized PageRank

The same iteration with the uniform teleport vector replaced by yours, so the walk restarts where you say:

```ts
import { personalizedPageRank } from "@graphty/webgpu-graph-algorithms";

const bias = new Float32Array(s.nodeCount);
bias[0] = 1; // restart at node 0 only
const r = await personalizedPageRank(ctx, s, bias, { dampingFactor: 0.85 });
console.log(r.scores); // mass concentrated on what node 0 reaches
```

`personalization` is a `Float32Array` of one finite non-negative number per node, not all zero, and it is
normalised to sum 1 on the host before the run -- so unnormalised weights are fine. A wrong length, a
negative or non-finite entry, or a zero total is `E_INVALID_ARGUMENT { argument: "personalization" }`.
Options, result and edge cases are PageRank's, except that a graph with no arcs returns the normalised
personalization vector rather than `1 / nodeCount`.

### HITS

HITS scores each node twice: as a hub (it points at good authorities) and as an authority (good hubs point at
it). `hits` runs the CPU package's recurrence -- `a(i) = A^T norm(h(i-1))` and `h(i) = A norm(a(i-1))` from
uniform seeds -- as two interleaved chains on the device, then sum-normalises both vectors once on the host.

```ts
import { hits } from "@graphty/webgpu-graph-algorithms";

const cycle = fromEdgeArrays({
    directed: true,
    nodeCount: 2,
    src: new Uint32Array([0, 1]),
    dst: new Uint32Array([1, 0]),
});
const r = await hits(ctx, cycle);
console.log(r.hubs, r.authorities); // [0.5, 0.5] and [0.5, 0.5]
ctx.release(cycle);
```

The options are `maxIterations` (`100`), `tolerance` (`1e-6`) and `weighted` (`true`). A chain stops at the
first pass whose summed (L1) change is below `tolerance` times the summed size of the pass, as eigenvector
centrality does, so the error it leaves does not grow with the node count. `GpuHitsResult` carries `hubs` and `authorities` (both f32, index-aligned, each summing to 1),
`iterations` (the larger of the two chains'), `converged` (both chains) and `precision`. `dest` receives the
hubs; the authorities always come back in a fresh array.

Direction is the point of the algorithm: an undirected snapshot has a symmetric adjacency, so the two vectors
come out the same. `nodeCount: 0` returns two empty arrays with `iterations: 0` and `converged: true`; a graph
with no arcs returns all zeros in both, since there is nothing to be a hub of.

### Eigenvector centrality

A node is central when central nodes point at it. The scores are the principal eigenvector of the adjacency
matrix, found by power iteration over the forward adjacency and L2-normalised once at the end.

```ts
import { eigenvectorCentrality } from "@graphty/webgpu-graph-algorithms";

const r = await eigenvectorCentrality(ctx, s, { maxIterations: 100, tolerance: 1e-6 });
console.log(r.scores, r.converged); // f32, index-aligned, L2 norm 1
```

The options are `maxIterations` (`100`), `tolerance` (`1e-6`) and `weighted` (`true`). A run stops at the first
pass whose summed (L1) change is below `tolerance` times the summed size of the pass, so the error it leaves does
not grow with the node count. On an undirected graph each pass adds a multiple of the scores themselves (at least
1, larger around a hub), which leaves the eigenvector alone and lets stars and other bipartite graphs converge; it
stops at the same pass as `@graphty/algorithms`' `eigenvectorCentrality` on a graph without parallel edges. It returns `GpuScoresResult` -- `scores`,
`iterations`, `converged`, `precision` -- which is PageRank's result without `danglingMass`.

Directed or undirected both work. When a graph's components have different spectral radii the power iteration
converges on the dominant component's eigenvector and the others fall toward zero; that is a property of the
method, not of this implementation. `nodeCount: 0` is empty; a graph with no arcs, and an isolated node in a
larger graph, scores 0.

### Katz centrality

Katz counts every walk that ends at a node, discounted by its length: `x = alpha * A^T x + beta`, so a walk of
length L contributes `alpha^L`. Unlike eigenvector centrality it hands every node the floor `beta`, which
keeps a node with no incoming arcs from scoring zero.

```ts
import { katzCentrality } from "@graphty/webgpu-graph-algorithms";

const r = await katzCentrality(ctx, s, { alpha: 0.1, beta: 1 });
console.log(r.scores); // f32, index-aligned, L2-normalised
```

| Option          | Default | Meaning                                                                                                                                  |
| --------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `alpha`         | `0.1`   | the attenuation per step. Convergence needs it below the reciprocal of the largest eigenvalue; the package checks only that it is finite |
| `beta`          | `1`     | the constant every node is given each iteration                                                                                          |
| `maxIterations` | `100`   | as above                                                                                                                                 |
| `tolerance`     | `1e-6`  | as above                                                                                                                                 |
| `weighted`      | `true`  | as above                                                                                                                                 |

A run stops at the first pass whose summed (L1) change is below `tolerance` times the summed size of the pass,
as eigenvector centrality does. A non-finite `alpha` or `beta` is `E_INVALID_ARGUMENT`. The result is `GpuScoresResult`, L2-normalised on the
host with no per-iteration normaliser on the device. Walks arrive along the reverse adjacency, so direction
matters. `nodeCount: 0` is empty; with no arcs every node holds `beta` alone, which after normalisation is
`1 / sqrt(nodeCount)` each.

### Connected components

`connectedComponents` labels the WEAK components: it walks the edge list, so an edge joins its two endpoints
whether or not the snapshot is directed, and the directed and undirected forms of one edge set give identical
labels. The kernel is GAP's Afforest -- sampled link rounds, then each edge once, then a final compress.

```ts
import { connectedComponents } from "@graphty/webgpu-graph-algorithms";

const g = fromEdgeArrays({
    directed: false,
    nodeCount: 4,
    src: new Uint32Array([0, 1]), // the path 0 - 1 - 2, with node 3 on its own
    dst: new Uint32Array([1, 2]),
});
const r = await connectedComponents(ctx, g);
console.log(r.labels); // Uint32Array [0, 0, 0, 1]
console.log(r.count); // 2
console.log(r.groups()); // [Uint32Array [0, 1, 2], Uint32Array [3]]
ctx.release(g);
```

`labels` holds one label per node index. By default they are renumbered dense `0 .. count - 1` in first-seen
index order, which makes them identical to the labels `@graphty/algorithms` produces for the same graph;
`renumber: false` returns the raw root indices instead -- the same partition with arbitrary label values, and
the same `count`. `groups()` builds the member lists on the first call and caches them, index-aligned with
the labels in that same first-seen order.

`renumber` (default `true`) is the only option besides the shared three. `nodeCount: 0` gives empty labels,
`count: 0` and no GPU work; a graph with no arcs gives every node its own block, so `labels[v] === v` and
`count === nodeCount`, which is what an isolated node gets inside a larger graph too. Self-loops and repeated
edges change nothing: the link step is idempotent.

### Breadth-first search

`breadthFirstSearch(ctx, snapshot, source, options?)` walks out from one node along the arcs (both directions
of an undirected edge, the out-arcs of a directed one) and returns, for every node, how many hops away it is and
which node it was reached from.

```ts
import { breadthFirstSearch } from "@graphty/webgpu-graph-algorithms";

const r = await breadthFirstSearch(ctx, s, 0, { maxDepth: 2 });
console.log(r.depth); // Uint32Array: hops from node 0; 4294967295 for a node not reached
console.log(r.parent, r.order, r.visitedCount, r.levels);
```

`GpuBfsResult` carries `depth`, `parent` (the smallest node index one hop closer to the source with an arc to
the node; `4294967295` for the source and for an unreached node), `order` (the `visitedCount` reached nodes grouped
by depth and ascending by index within a depth), `visitedCount` (the source included), `levels` (the largest
depth plus one) and `switches` (how often the search changed between expanding the frontier and sweeping the
unvisited nodes). Every array is the same on every run.

`maxDepth` is the one option it reads: a node at that depth is reached but not expanded; leave it out for no cap.
`dest` receives `depth`. A source outside `[0, nodeCount)` is `E_INVALID_ARGUMENT`, so an empty graph refuses
every source. It also runs on a graph too large for one storage binding.

### Shortest paths from one source: `sssp` and `bellmanFord`

`sssp(ctx, snapshot, source, options?)` finds the shortest weighted distance from one node to every other, for
non-negative weights. `bellmanFord` takes the same arguments, also accepts negative weights, and reports a negative
cycle.

```ts
import { bellmanFord, sssp } from "@graphty/webgpu-graph-algorithms";

const r = await sssp(ctx, s, 0, { cutoff: 10 });
console.log(r.dist); // Float32Array: the distance from node 0; Infinity when not reached, or beyond the cutoff
console.log(r.predArc, r.reachedCount);

const bf = await bellmanFord(ctx, s, 0);
if (bf.hasNegativeCycle) {
    // dist and predArc hold the last round's values, not shortest paths
}
```

`GpuSsspResult` carries `dist` (f32), `predArc` (for each reached node, the index of the arc it was reached
along; follow the arcs' sources back to the source; `4294967295` for the source and for an unreached node) and
`reachedCount` (the nodes with a finite distance, the source included). `bellmanFord` adds `hasNegativeCycle`:
when true, a negative cycle is reachable from the source and `dist` and `predArc` are the last round's values. The
distances are the same on every run.

| Option    | Default | Meaning                                                                                                                                          |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cutoff`  | none    | stop at this distance: a node farther away is reported unreached. `NaN` is `E_INVALID_ARGUMENT`                                                  |
| `weights` | unset   | per-arc weights for this run, `arcCount` long, instead of the snapshot's weight column; without either, every arc weighs 1 and the call is a BFS |

`dest` receives `dist`. `sssp` refuses a negative weight with `E_UNSUPPORTED` (use `bellmanFord`), and both
refuse a NaN or infinite weight. On an undirected snapshot `bellmanFord` reads one weight per edge, so a `weights`
override that gives the two arcs of one edge different weights is `E_UNSUPPORTED`; use a directed snapshot for
that. `sssp` keeps its work queue in one storage binding and throws `E_TOO_LARGE { path: "sssp.queue" }` when the
graph's arcs do not fit it.

### All-pairs shortest paths

`allPairsShortestPath(ctx, snapshot, options?)` computes the distance between every ordered pair of nodes in one
`n x n` matrix.

```ts
import { allPairsShortestPath } from "@graphty/webgpu-graph-algorithms";

const r = await allPairsShortestPath(ctx, s);
const fromTo = (i: number, j: number): number => r.dist[i * r.n + j]; // Infinity when j is unreachable from i
```

`GpuApspResult` carries `dist` (f32, row-major: `dist[i * n + j]` is the distance from `i` to `j`, `0` on the
diagonal even when a self-loop has a weight, `Infinity` when unreachable) and `n`. The one option is `weighted`
(default: true when the snapshot has weights); `false` counts hops. `dest` is a `Float32Array` of length `n * n`.

The whole matrix must fit one storage binding, so the node count is capped at
`floor(sqrt(maxStorageBufferBindingSize / 4))`: 23,170 nodes on a typical hardware adapter under the context's
default `limits: "raise"`, 5,792 under `limits: "default"`. Above it the call throws
`E_TOO_LARGE { path: "allPairs.matrix" }`. A negative or non-finite weight is `E_UNSUPPORTED` unless
`weighted: false`.

### Betweenness and edge betweenness

`betweennessCentrality(ctx, snapshot, options?)` scores each node by how many shortest paths between other nodes
pass through it, by Brandes' algorithm; `edgeBetweennessCentrality` scores each edge the same way. Both count hops:
edge weights are ignored.

```ts
import { betweennessCentrality, edgeBetweennessCentrality } from "@graphty/webgpu-graph-algorithms";

const exact = await betweennessCentrality(ctx, s, { normalized: true });
const sampled = await betweennessCentrality(ctx, s, { k: 64 }); // 64 sources instead of every node
const estimate = sampled.scores.map((x) => (x * s.nodeCount) / sampled.sourcesUsed);
const edges = await edgeBetweennessCentrality(ctx, s); // one score per edge, by edge index
```

| Option       | Default | Meaning                                                                                                                        |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `normalized` | `false` | divide by `(n - 1)(n - 2)` on a directed snapshot, half that on an undirected one                                              |
| `k`          | unset   | run from `k` sources drawn by a fixed seed (the same sources every call) instead of every node; an integer in `[0, nodeCount]` |
| `sources`    | unset   | run from these node indices instead; `k`, when also given, must equal its length                                               |
| `endpoints`  | `false` | `true` is `E_UNSUPPORTED`                                                                                                      |

The node result, `GpuBetweennessResult`, carries `scores` (f32), `iterations` (the batches of sources run),
`converged` (always true), `precision`, `sourcesUsed` (`nodeCount` for an exact run, the number of sources for a
sampled one) and `sigmaOverflow`. A sampled run returns the plain sum over the sources it ran; multiply by
`nodeCount / sourcesUsed` for an estimate of the full scores. On an undirected snapshot the scores are halved, as
`@graphty/algorithms` does. `sigmaOverflow` is true when the numbers of shortest paths at one depth spread wider
than f32 can hold (from a corner of a 235 x 235 grid, for example): the scores are then wrong, and
`@graphty/algorithms` throws rather than return them.

The edge result, `GpuEdgeScoresResult`, carries `scores` (one per logical edge, `edgeCount` long, and `dest` must
be that length), `precision`, `sourcesUsed` and `sigmaOverflow`. `onProgress` reports sources done of sources to
run. One source's working arrays must fit one storage binding, which caps the node count at about
`maxStorageBufferBindingSize / 4`; above it the call throws `E_TOO_LARGE { path: "binding" }`.

### Closeness

`closenessCentrality(ctx, snapshot, options?)` scores each node by how near it is to the nodes it reaches:
`1 / (sum of the distances)` over every node reached, `0` when it reaches none -- the default of
`@graphty/algorithms`' `closenessCentrality`.

```ts
import { closenessCentrality } from "@graphty/webgpu-graph-algorithms";

const r = await closenessCentrality(ctx, s, { harmonic: true });
console.log(r.scores, r.sourcesUsed);
```

| Option     | Default                          | Meaning                                                                                                                                                                      |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weighted` | whether the snapshot has weights | sum the weights instead of counting hops. A negative or non-finite weight is then `E_UNSUPPORTED`                                                                            |
| `harmonic` | `false`                          | score with the sum of `1 / distance` instead                                                                                                                                 |
| `sources`  | unset                            | score every node by its distances to these node indices only (the sampled score of `@graphty/algorithms`, not scaled up); undirected snapshots only, and not with `harmonic` |

`GpuClosenessResult` carries `scores` (f32), `iterations` (the batches of sources run), `converged` (always true),
`precision` and `sourcesUsed` (`nodeCount` for an exact run, the length of `sources` for a sampled one). It is an
exact traversal, so `maxIterations` and `tolerance` are `E_UNSUPPORTED` when given. A sampled run on a directed
snapshot, or a sampled harmonic run, is `E_UNSUPPORTED`.

### Label propagation

`labelPropagation(ctx, snapshot, options?)` finds communities: every node repeatedly takes the label most common
among its neighbours until nothing changes. It follows the rules of `@graphty/algorithms`'
`labelPropagationSynchronous`, with ties broken by a fixed scramble of the labels rather than at random, so the
result is the same on every run and every device.

```ts
import { labelPropagation } from "@graphty/webgpu-graph-algorithms";

const r = await labelPropagation(ctx, s, { maxIterations: 100 });
console.log(r.labels, r.count, r.groups());
```

The options are `maxIterations` (default `100`, a non-negative integer) and `weighted` (default `true`: sum the
weights of the edges to each neighbour label, each copy of a parallel edge counting; `false` counts every distinct
neighbour once). The result is `GpuLabelResult`, as connected components return it: `labels` dense
`0 .. count - 1` in first-seen index order, `count` and `groups()`. Arc directions are ignored and self-loops do
not count. A run whose labels swap back and forth forever runs to `maxIterations`. More parallel edges between
one pair of nodes than a weighted sum can merge is `E_UNSUPPORTED`; run it unweighted or merge them first.

### Minimum spanning forest

`minimumSpanningTree(ctx, snapshot, options?)` picks the edges of a minimum-weight spanning tree of every
connected component, by Boruvka's algorithm. A directed snapshot is spanned as its underlying undirected graph.

```ts
import { minimumSpanningTree } from "@graphty/webgpu-graph-algorithms";

const r = await minimumSpanningTree(ctx, s);
console.log(r.edges); // Uint32Array of edge indices: nodeCount minus the number of components
console.log(r.totalWeight);
```

`GpuMstResult` carries `edges` (logical edge indices, `edgeCount`-indexed) and `totalWeight` (summed in f64; 1 per
edge on an unweighted snapshot). Ties between equal weights are broken by edge index, so the edge set is exactly
the one `@graphty/algorithms`' `kruskalMST` returns; only the order of `edges` differs. Negative weights are
fine. It takes `signal` and `onProgress`; `dest` is `E_UNSUPPORTED`, because the forest's size is not known
before the run.

### Triangle counting

`triangleCount(ctx, snapshot, options?)` counts the triangles of the simple undirected graph under the snapshot:
directions are ignored, parallel edges count once and self-loops not at all.

```ts
import { triangleCount } from "@graphty/webgpu-graph-algorithms";

const r = await triangleCount(ctx, s);
console.log(r.perNode, r.total, r.coefficient, r.transitivity);
```

`GpuTriangleResult` carries `perNode` (the triangles each node lies in), `total` (each triangle once),
`coefficient` (each node's local clustering coefficient, `0` for a node with fewer than two neighbours) and
`transitivity` (`3 x triangles / connected triples`, `0` when there is no connected triple). `dest` receives
`perNode`.

Label propagation and triangle counting first build the simple undirected graph on the device; when it needs
more than one storage binding they throw `E_TOO_LARGE`.

## Errors

Every condition the package detects itself is a `WebGpuGraphError` with a stable `code`
(`E_NO_WEBGPU`, `E_NO_ADAPTER`, `E_NO_DEVICE`, `E_SOFTWARE_ONLY`, `E_DEVICE_LOST`, `E_DEVICE_INCORRECT`, `E_DISPOSED`,
`E_VALIDATION`, `E_SHADER_COMPILE`, `E_OUT_OF_MEMORY`, `E_TOO_LARGE`, `E_UNSUPPORTED`,
`E_INVALID_ARGUMENT`, `E_SNAPSHOT`, `E_RELEASED`, `E_NOT_LOADED`, `E_ABORTED`) and frozen `details`.
`isWebGpuGraphError(x)` and `hasErrorCode(x, code)` are structural brand checks, so they survive two copies
of the package. The graph-format codes `E_GPU_INELIGIBLE`, `E_UNKNOWN_NODE`, `E_UNKNOWN_COLUMN` and
`E_COLUMN_LENGTH` pass through unchanged (`PASSTHROUGH_FORMAT_CODES`). A simulation whose snapshot was
released rejects its next `step()` with `E_RELEASED`; a lost device disposes every simulation and rejects
every pending `step()` with `E_DEVICE_LOST` (create a new context from a fresh adapter and `load()` again).

## The device self-check

Some GPU drivers return wrong answers rather than failing. On Windows over the Microsoft Basic Render Driver,
compute shaders that synchronise across a workgroup produce silently incorrect results, which would make every
number this package computes there unreliable with no error anywhere.

So the first algorithm or layout you run on a context asks the device for an answer this package already knows --
an exclusive scan across 33 workgroups of known numbers (8,193 words on a 256-lane device), verified word by word
on the host -- and refuses a device that gets it wrong with `E_DEVICE_INCORRECT`, naming the first wrong word,
what belonged there and the adapter's description string. It runs once per device and is remembered: 14-20 ms
the first time, nearly all of it compiling the two scan pipelines that any scan-using algorithm would compile
anyway, and 0.6-1.0 ms of work under that (measured on Dawn over lavapipe and over an RTX 4070 SUPER). It cannot be switched off: a flag for it would be off in
somebody's production build, which is the silent wrong answers walking back in.

Choosing the processor instead is your decision, not the package's, so nothing falls back. To ask before you
commit work to a device, call it yourself:

```ts
import { verifyDevice } from "@graphty/webgpu-graph-algorithms";

const check = await verifyDevice(ctx); // memoised: the algorithms below reuse this result
if (!check.ok) {
    // check.mismatch names the first wrong word; check.description is the adapter string that identifies the driver
    runOnTheCpuInstead();
}
```

It checks one property -- that values crossing a workgroup barrier, and block totals crossing dispatches of one
compute pass, survive. A device that gets that right and gets atomics or float rounding wrong still passes. It is
a refusal mechanism, not a certificate of correctness. The package refuses such a device rather than computing
around it: a second implementation for a device that is known to return wrong answers could never be verified on
that device, and its atomics and float rounding would be just as untrusted.

## License

MIT
