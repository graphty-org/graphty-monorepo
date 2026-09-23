# @graphty/webgpu-graph-algorithms

WebGPU-accelerated graph algorithms and layouts over the `@graphty/graph-format` snapshot, for Node
(Dawn, through the `webgpu` npm package) and browsers (Chromium). One code base, three entry points:

| Entry                                      | Import        | What it gives you                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@graphty/webgpu-graph-algorithms`         | the core      | the layouts (`createForceAtlas2`, `createFruchtermanReingold`, `createSpringElectrical`, `seedPositions`), the algorithms (`pageRank`, `personalizedPageRank`, `hits`, `eigenvectorCentrality`, `katzCentrality`, `connectedComponents`, `degree`), `createAccelerator`, `calibrateLayout`, `verifyDevice`, `GpuContext`, `WebGpuGraphError`, `isSoftwareAdapter`, the constants (`EXACT_MAX_NODES`, `FA2_DEFAULTS`, `FR_DEFAULTS`, `SE_DEFAULTS`, `LAYOUT_TUNING_DEFAULTS`, ...) and the option / stats / accelerator types |
| `@graphty/webgpu-graph-algorithms/node`    | Node only     | `createNodeGpuContext`, `probeNodeWebGpu`, `createNodeGpu` (Dawn), `dawnFlags`                                                                                                                                                                                                                                                                                                                                                                                                            |
| `@graphty/webgpu-graph-algorithms/browser` | browsers only | `probeBrowserWebGpu`, `requestGpuContext`                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Status: three force layouts and six algorithms, on the exact and the grid repulsion tiers.**
ForceAtlas2, Fruchterman-Reingold and ngraph's spring-electrical preset run from Node (`run()`) and from a
browser frame loop (`step()` once per frame) at any size: the default `repulsion: "auto"` runs the exact tier
up to `exactMaxNodes` = 32768 nodes (owner decision G4-D1 in `docs/decisions/G4.md`) and the grid tier above
it; `repulsion: "exact"` forces all pairs at any size (O(n^2) per iteration: 18.971 ms per iteration at 100k
nodes / 1M edges on an RTX 4070 SUPER) and `repulsion: "grid"` forces the grid tier. PageRank, personalized
PageRank, HITS, eigenvector centrality, Katz centrality and weakly connected components run as plain async
calls on the same context. The phases follow the phase plan of
`design/webgpu/webgpu-acceleration-plan.md` (monorepo root) section 13 and the interface contract
`design/webgpu/plans/2026-09-14-webgpu-p0-p3-interfaces.md`; the gate records are `docs/decisions/G<n>.md`.
There is no CPU fallback anywhere in this package: when no adapter or device exists it throws
`WebGpuGraphError`.

## Install

```bash
npm install @graphty/webgpu-graph-algorithms @graphty/graph-format
# Node only: Dawn is an OPTIONAL peer dependency (browser consumers never install it)
npm install webgpu@0.4.0
```

`webgpu@0.4.0` is the last Linux binary linking against glibc <= 2.34 (Ubuntu 22.04 ships 2.35;
`webgpu@0.6.x` needs glibc 2.38). The peer range `>=0.4.0 <1.0.0` admits the newer builds on a newer
glibc; a Node consumer that forgets the package gets `E_NO_WEBGPU` with the message
"install the optional peer dependency webgpu@0.4.0". `@graphty/algorithms` and `@graphty/layout` are
optional peer dependencies too, on different footings since W1b: the layout interfaces and option types
are `import type`d from `@graphty/layout` and re-exported, so they ARE its declarations, while the
`@graphty/algorithms` accelerator types are still structural mirrors until A2. Either way a consumer that
type-checks against the accelerator types (without `skipLibCheck`) installs the package it names; a
consumer that never touches them does not need it.

## ForceAtlas2 from Node

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { createForceAtlas2 } from "@graphty/webgpu-graph-algorithms";
import { createNodeGpuContext } from "@graphty/webgpu-graph-algorithms/node";

const ctx = await createNodeGpuContext(); // Dawn; { adapter: "llvmpipe" } selects Mesa's software adapter
const snapshot = fromEdgeArrays({ directed: false, nodeCount, src, dst, weights }); // undirected: pass toUndirected().snapshot otherwise

// The owner's stride-3 array: x, y, z per node in scene units. NaN rows are seeded by the CPU port's LCG
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

Above `exactMaxNodes` the default `"auto"` picks the grid tier (spec 7.8: by n alone); `repulsion: "exact"`
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

| Option                            | Default          | Meaning                                                                                                                                                                   |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dim`                             | `2`              | `2` or `3`; in 2D every readback writes `z = center[2]` whatever was uploaded                                                                                             |
| `scale`, `center`                 | `1`, `[0, 0, 0]` | scene units = layout units x `scale` + `center`                                                                                                                           |
| `seed`                            | `null`           | the LCG seed of the NaN rows (the CPU port's generator, bit for bit); `0` / `null` draws a random seed                                                                    |
| `maxIter`                         | `100`            | `run()` stops and `settled` turns true after this many iterations since `load()` / `reheat()`                                                                             |
| `jitterTolerance`                 | `1`              | the speed controller's tolerance                                                                                                                                          |
| `scalingRatio`                    | `2`              | the repulsion constant                                                                                                                                                    |
| `gravity`                         | `1`              | toward the centroid (`compat: "paper"`) or the origin (`compat: "networkx"`)                                                                                              |
| `strongGravity`                   | `false`          | gravity proportional to the distance                                                                                                                                      |
| `distributedAction`               | `false`          | attraction divided by the source's mass                                                                                                                                   |
| `linlog`                          | `false`          | logarithmic attraction                                                                                                                                                    |
| `nodeMass`                        | `null`           | `null`: the node column with the role `mass` when present, else `outDegree + 1`; a `Float32Array` of length n; a numeric node column name (a `Record` is `E_UNSUPPORTED`) |
| `nodeSize`                        | `null`           | `E_UNSUPPORTED` when non-null (no overlap prevention)                                                                                                                     |
| `weight`                          | unset            | `true`: the snapshot's arc weights; an edge column name: that numeric column; unset / `false` / `null`: every edge weighs 1                                               |
| `dissuadeHubs`                    | `false`          | accepted and ignored                                                                                                                                                      |
| `settleThreshold`, `settleWindow` | `0.001`, `10`    | settled when the mean displacement stayed below the threshold for `settleWindow` iterations                                                                               |
| `iterationsPerStep`               | `1`              | iterations per `step()` (the Node `run()` uses its own `batch`)                                                                                                           |
| `maxInFlight`                     | `2`              | batches in flight before `step()` coalesces; `1` for the strictest freshness                                                                                              |

GPU tuning (`GpuLayoutTuning`; also the `layout` field of `createAccelerator`'s options, inherited by every
simulation the accelerator creates):

| Option                                              | Default                 | Meaning                                                                                                                                                                                                                    |
| --------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repulsion`                                         | `"auto"`                | `"exact"` at any n; `"auto"` = exact iff n <= `exactMaxNodes`, else grid; `"grid"` at any n                                                                                                                                |
| `exactMaxNodes`                                     | `32768`                 | the G3 value, kept by owner decision G4-D1 while the accuracy work G4-F1 leaves is open (`docs/decisions/G4.md`; the section 7.8 rule computes 1024 on the RTX 4070 SUPER); pass your own (`calibrateLayout` measures it). |
| `deterministic`                                     | `true`                  | fixed summation order (the exact tier is always deterministic)                                                                                                                                                             |
| `compat`                                            | `"paper"`               | `"networkx"` reproduces NetworkX 3.4's `forceatlas2_layout` (gravity toward the origin, its accumulated swing / traction)                                                                                                  |
| `nearMax`, `gridMax2D`, `gridMax3D`, `extentFactor` | `64`, `512`, `128`, `6` | stored for the grid tier (P4)                                                                                                                                                                                              |

Every range error is `E_INVALID_ARGUMENT` (`gravity < 0`, `scalingRatio <= 0`, `jitterTolerance <= 0`,
`maxIter < 1`, `settleWindow < 1`, `maxInFlight < 1`, `iterationsPerStep < 1`, `dim` not 2 or 3,
`scale <= 0`). `setParams(patch)` changes the options of a live simulation; a force-law change (`linlog`,
`strongGravity`, `distributedAction`) recompiles and resets the speed controller, a numeric tweak only changes
the next batch's parameters; `dim` and `maxInFlight` cannot change after creation.

## Stats

`sim.stats` (`ForceAtlas2Stats`) after every completed batch: `iteration`, `swing`, `traction`, `speed`,
`speedEfficiency`, `meanDisplacement`, `rmsRadius`, `layoutRadius` (max |p - centroid|), `centroid`,
`repulsionTier` (`"exact"`), `msPerIteration` (the GPU time per iteration when `timestamp-query` was granted,
else the batch's wall time divided by its iteration count), the grid fields (`null` on the exact tier) and
`trace`: one `{ swing, traction, speed, speedEfficiency, meanDisplacement, settledCount }` record per
iteration of the last batch.

## Fruchterman-Reingold and the spring-electrical preset

Two more force layouts ship beside ForceAtlas2, on the same exact repulsion tier and with exactly the
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
- `positions` is the owner's stride-3 scene-unit `Float32Array` of length `3 * nodeCount`, over a plain
  `ArrayBuffer`; any other length is `E_INVALID_ARGUMENT`. Rows holding a non-finite component are seeded in
  place at `load()` (see `seedPositions` below), finite rows are the starting layout
- an empty snapshot (`nodeCount: 0`) loads without touching the GPU and is `settled` on arrival; `step()`
  resolves immediately and the positions array is left alone
- a graph the device cannot hold is refused at `load()`, before any GPU work:
  `E_TOO_LARGE { path: "positions" }` when `16 * nodeCount` bytes exceed the device's `maxBufferSize`,
  `{ path: "windowed" }` when the arc arrays need more than one storage binding, and `{ path: "partials" }`
  above 16,776,960 nodes
- above `exactMaxNodes` with the default `repulsion: "auto"`, `load()` throws
  `E_UNSUPPORTED { feature: "repulsion.grid" }`, as ForceAtlas2 does; `repulsion: "exact"` runs all pairs at
  any size

The GPU tuning table above applies to both, with one exception: `compat` is read by ForceAtlas2 alone and
changes nothing here.

### Fruchterman-Reingold

The spring model of the original paper: every pair of nodes repels with `k^2 / d`, every edge pulls with
`d^2 / k`, where `k` is the ideal edge length, and a falling temperature caps how far a node may move in a
single iteration.

```ts
import { createFruchtermanReingold } from "@graphty/webgpu-graph-algorithms";

// positions: the owner's stride-3 scene-unit array; NaN rows are seeded at load(), finite rows are kept
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

This model has no iteration-count option, so `run()` without `maxIter` has no budget at all and returns only
when the layout settles. Pass `run({ maxIter })` unless that is what you want.

`sim.stats` is `SpringElectricalStats`: `LayoutStatsBase` plus `kineticEnergy`, and a `trace` of
`{ kineticEnergy, meanDisplacement, settledCount }`. The energy lags the positions by one iteration -- the
iteration that follows an integrate is the one that folds its energy -- so the first record after `load()`
carries `0` and record i carries the energy of iteration i - 1.

Both models appear in the Performance section below as row T-14 and in the `layout-fr` benchmark group.

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

The arguments are positional and all required: the snapshot, the owner's stride-3 scene-unit array (modified
in place, length `3 * nodeCount`), the LCG seed (`0` or `null` draws a random one, the CPU port's quirk kept
bit for bit), `dim` (`2` or `3`), the scene `scale` (> 0), the scene `center` (an `ArrayLike<number>`, or
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
or `"4070"`), `backend` (`"vulkan"` | `"null"` | ...), `dawnFeatures` (Dawn toggles), `software` (shorthand
for `adapter=llvmpipe`, Linux / Mesa specific), `installGlobals` (default `true`: `GPUBufferUsage` and friends
on `globalThis`), plus the `GpuContext.create` options (`powerPreference`, `rejectSoftware`, `limits`
(`"raise"` by default), `optionalFeatures` (`["subgroups", "timestamp-query"]` by default), `label`,
`onError`).

On a machine where the NVIDIA Vulkan driver cannot find `libEGL.so.1` (a container without `libegl1`),
Dawn silently lists only llvmpipe; see `docs/HEADLESS_GPU_REPORT.md` appendix D for the `LD_LIBRARY_PATH`
recipe.

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

## Centrality and components

Six algorithm functions run on the device. Every one has the same shape -- `await fn(ctx, snapshot, options?)`
-- and every array that comes back is indexed by the snapshot's NODE INDEX (`0 .. nodeCount - 1`), never by
node id; the snapshot's id map turns an index back into the id it was built from. Every score result carries
`precision: "f32"`, so a reader can label what it is looking at.

The context uploads what an algorithm needs the first time it sees a snapshot and keeps it until
`ctx.release(snapshot)`: the CSR core for PageRank, HITS, eigenvector centrality and connected components,
the reverse adjacency for PageRank, HITS and Katz, the edge list for connected components. A second call on
the same snapshot pays no upload.

Each one is also a method of the object `createAccelerator(ctx)` returns -- `acc.pageRank(s, options)` and so
on, with `connectedComponents` answering to `weaklyConnectedComponents` as well -- which is how
`@graphty/algorithms` reaches them when a GPU accelerator is injected into it.

The PageRank example below is complete; the examples after it reuse its context `ctx` and its snapshot `s`
rather than repeating the setup.

Options every one of them accepts on top of its own (`GpuRunOptions`):

| Option       | Default | Meaning                                                                                                                                                                                                                                         |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dest`       | unset   | a preallocated result of exactly `nodeCount` elements over a plain `ArrayBuffer`: a `Float32Array` for scores, a `Uint32Array` for labels. Any other type or length is `E_INVALID_ARGUMENT { argument: "dest" }`; `hits` fills it with the hubs |
| `signal`     | unset   | an `AbortSignal`, checked before the first submit and after every batch; `E_ABORTED { batchId }`                                                                                                                                                |
| `onProgress` | unset   | `(done, total)` after every batch. `total` is `maxIterations`, `2 * maxIterations` for `hits` (it runs two chains) and `1` for `connectedComponents`, which reports once when it finishes                                                       |

A graph too large for the device is refused before any GPU work: when the arc arrays need more than one
storage binding they would need a windowed upload, which only `degree` executes, and each of these six throws
`E_TOO_LARGE { needed, limit, path: "windowed" }` instead. A node count whose dispatch does not fit
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
| `dampingFactor` | `0.85`  | the probability of following an arc; the rest teleports                                                              |
| `maxIterations` | `100`   | an integer >= 1; anything else is `E_INVALID_ARGUMENT`                                                               |
| `tolerance`     | `1e-6`  | converged when the L1 change of the whole vector falls below `tolerance * nodeCount` (NetworkX's rule)               |
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

The options are `maxIterations` (`100`), `tolerance` (`1e-6`) and `weighted` (`true`), with PageRank's
meanings. `GpuHitsResult` carries `hubs` and `authorities` (both f32, index-aligned, each summing to 1),
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

The options are `maxIterations` (`100`), `tolerance` (`1e-6`) and `weighted` (`true`); convergence is
PageRank's L1 rule, a delta below `tolerance * nodeCount`. It returns `GpuScoresResult` -- `scores`,
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

A non-finite `alpha` or `beta` is `E_INVALID_ARGUMENT`. The result is `GpuScoresResult`, L2-normalised on the
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
a refusal mechanism, not a certificate of correctness; `docs/decisions/device-self-check.md` records what it
covers, what it does not, and why the package refuses such a device rather than computing around it.

## Benchmarks

```bash
pnpm run bench                                                 # every group; appends to benchmarks/out/<runner-class>.json
pnpm exec tsx benchmarks/run.ts upload roundtrip layout-exact  # selected groups; --no-save, --runs N, --allow-software
pnpm exec tsx benchmarks/layout-run.ts --nodes 100000 --edges 1000000   # the end-to-end layout driver (exit 1 on a bad result)
pnpm run gpu:report > gpu-report.json                          # the adapter report with a 10 s nvidia-smi sample
pnpm run bench:compare                                         # the last out session vs benchmarks/results/<runner-class>.json (> 3x fails)
```

The runner class is `<vendor>-<architecture>-driver<major>` (`scripts/runner-class.js`; `GRAPHTY_RUNNER_CLASS` overrides it,
which the GPU lane sets to `gpu-linux-t4`). Software adapters never time anything: `pnpm run bench` prints
`software adapter: nothing timed` on lavapipe unless `--allow-software` is given, and a software session is never a
baseline. The checked-in baselines under `benchmarks/results/` are written by the owner on the dev box (the RTX 4070 SUPER,
runner class `nvidia-lovelace-driver580` -- Dawn spells the architecture `lovelace`) and, for the GPU lane, from the
lane's own artifact; `bench:compare` skips when the card was not quiet during the report's sample. Groups: `upload` (T-1),
`roundtrip` (T-2, T-3), `layout-exact` (T-4 and the Node side of T-5: `step(1)` on the exact ladder 1k / 4k / 8k / 16k /
32k / 65k and at 10k, two rows per rung -- the wall time of one iteration with its readback, and the GPU time per iteration
the profiler reports; every rung starts with an untimed clock warm-up burst, because NVIDIA's power management leaves the
SM clock at its idle 210 MHz under sparse sub-millisecond dispatches and the kernels then measure 4-15x slower),
`pagerank` (T-8), `wcc` (T-9), `layout-fr` (T-14: `step(1)` of `createFruchtermanReingold` and `createSpringElectrical`
at 10k and at 100k with `repulsion: "exact"`, the same two rows per model and rung as `layout-exact`, tagged `fr` /
`se`), `layout-grid` (T-6 and T-7: `step(1)` of the grid tier on the grid ladder 32k / 65k / 100k / 262k / 1M in 2D
and in 3D, the same two rows per rung tagged `grid` with the dimension, plus the `fa2-attraction` pass of the 1M 2D
iteration from the profiler, and the exact ladder's 1k / 4k / 8k / 16k rungs in 2D for the crossover re-check). The Chromium numbers of T-5 (10k on the exact tier, 100k on the grid tier) come from the
`bench`-tagged browser test (`GRAPHTY_BROWSER_GPU=nvidia node scripts/run-browser-project.js`), which appends its
session through the Vitest commands bridge. `exactMaxNodes` is re-fixed from the ladder by the rule of plan section 7.8
(the largest rung under 4 ms per iteration and not slower than the grid tier at the same n -- the `layout-grid` 2D rows,
which the group also records at the exact ladder's 1k / 4k / 8k / 16k rungs so the clause has a row at every rung --
rounded down to a power of two; `benchmarks/layout-exact.bench.ts` `exactMaxNodesFromLadder`); `calibrateLayout(ctx)`
measures the same crossover on a consumer's own device.

## Performance

Regenerated from the last session of each baseline under `benchmarks/results/` (`nvidia-lovelace-driver580.json`, the
dev box; `gpu-linux-t4.json`, the CI lane) by the procedure recorded in `docs/decisions/G3.md` appendix A; the targets
are the T-table of plan section 10.4. A missed target is re-fixed by a recorded owner decision in
`docs/decisions/G<n>.md`, never relaxed silently.

### The dev box (nvidia-lovelace-driver580)

Measured on nvidia-lovelace-driver580 (NVIDIA: 580.173.02 580.173.2.0), session 2026-09-20T01:06:48.656Z, medians of 5 runs; Chromium: nvidia / lovelace (nvidia-lovelace-driver0, the description is redacted by Chromium), session 2026-09-16T02:18:11.896Z. The T-5 (100k), T-6 and T-7 rows are from the later session 2026-09-21T06:15:17.027Z (the file's last session, the current baseline, the one the crossover re-check reads; its Chromium session 2026-09-21T05:48:14.190Z), whose other rows are within 1.25x of this table's.

| Id   | What                                                                                                                                     | Target                        | Measured                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------- |
| T-1  | Upload of the 100k / 1M weighted hot prefix (16.4 MB); 1M / 10M (164 MB)                                                                 | <= 10 ms; <= 100 ms           | 5.980 ms; 125.738 ms         |
| T-2  | `degree` + 400 KB readback at 100k (core resident), Node                                                                                 | <= 2 ms                       | 0.870 ms                     |
| T-3  | Empty submit + 4-byte `readU32` round trip, Dawn                                                                                         | <= 0.1 ms                     | 0.181 ms                     |
| T-4  | ForceAtlas2 exact tier, GPU time per iteration (profiler) at 10k; at 16k                                                                 | <= 1 ms; <= 2 ms              | 0.586 ms; 1.053 ms           |
| T-5  | ForceAtlas2 per-frame cost, `step(1)` + the 12n readback at 10k, Chromium (Node in brackets)                                             | <= 6 ms                       | 2.400 ms (0.726 ms)          |
| T-5  | ForceAtlas2 per-frame cost, `step(1)` + the 12n readback at 100k on the grid tier, Chromium (Node in brackets)                           | <= 12 ms                      | 3.700 ms (2.087 ms)          |
| T-6  | ForceAtlas2 grid tier, GPU time per iteration (profiler) at 100k 2D; at 1M 2D; at 100k 3D                                                | <= 10 ms; <= 100 ms; <= 20 ms | 0.634 ms; 5.414 ms; 1.306 ms |
| T-7  | Attraction gather (the `fa2-attraction` pass of the grid tier), GPU time per iteration (profiler) at 1M / 10M                            | <= 15 ms                      | 1.493 ms                     |
| T-8  | PageRank, 100 iterations, wall end to end including the upload, at 100k / 1M; at 1M / 10M                                                | <= 150 ms; <= 1.5 s           | 17.204 ms; 198.645 ms        |
| T-9  | Weakly connected components (Afforest), wall end to end including the upload and the label readback, at 1M / 10M (100k / 1M in brackets) | <= 100 ms                     | 145.970 ms (12.613 ms)       |
| T-14 | Fruchterman-Reingold exact tier, GPU time per iteration (profiler) at 10k; at 100k (`repulsion: "exact"`)                                | recorded                      | 0.617 ms; 16.367 ms          |

Three rows miss their target in this session: the 1M / 10M upload (125.7 ms against 100 ms, the open owner decision of
`docs/decisions/G1.md` section 7), the empty-submit round trip (0.181 ms against 0.1 ms: the row is measured after the
`upload` group, whose CPU-heavy setup lets the SM clock fall to its idle state; the same row measures 0.041-0.075 ms at
the working clock -- finding G3-F2 of `docs/decisions/G3.md` section 10), and WCC at 1M / 10M (146.0 ms against
100 ms: the row is wall end to end from a released core, so it carries the same 164 MB upload T-1 times at 125.7 ms;
with the core resident the same call takes 11-16 ms). The T-9 target is therefore below
the T-1 upload it includes, an owner decision for `docs/decisions/G7.md`. The `pagerank` rows run all 100 iterations
(`tolerance: 0`): at the NetworkX tolerance of 1e-6 the seeded G(n, m) input converges from the uniform start in one to
four iterations, which would time one pull and call it a hundred. The T-14 row is the `layout-fr` group of the later
session 2026-09-20T19:25:37.311Z (the file's last session, the current baseline), whose other rows are within 1.08x of
this table's; the spring-electrical preset measures 0.648 ms at 10k and 18.154 ms at 100k in the same session.

The exact curve (the `layout-exact` group: 2D, E = 10n, seeded G(n, m), one simulation per rung; ms / iteration from the profiler):

| n     | ms / iteration | step(1) wall (ms) | pairs / s |
| ----- | -------------- | ----------------- | --------- |
| 1024  | 0.087          | 0.224             | 1.20e+10  |
| 4096  | 0.255          | 0.381             | 6.58e+10  |
| 8192  | 0.478          | 0.612             | 1.40e+11  |
| 10000 | 0.586          | 0.726             | 1.71e+11  |
| 16384 | 1.053          | 1.207             | 2.55e+11  |
| 32768 | 2.561          | 2.757             | 4.19e+11  |
| 65536 | 8.402          | 8.705             | 5.11e+11  |

The end-to-end run of `benchmarks/layout-run.ts --nodes 100000 --edges 1000000` (the exact tier at 100k, 100
iterations, batches of 8) takes 18.971 ms per iteration on the same card, uploads and readbacks included (16.975 ms of
GPU time per iteration in the last batch).

### The CI lane (gpu-linux-t4)

The first run of the GPU lane (`gpu.yml`, graphty-monorepo run 35316416067, 2026-09-18) on a machine.dev T4 -- one Tesla
T4 (16 GB), 4 vCPU of a Xeon Platinum 8259CL, driver 580.126.20 -- wrote this baseline; `scripts/bench-compare.js` fails
a later run of the lane whose median AND minimum both exceed 1.35x the best figures this file has ever held, by at
least 2.5 ms. The T-table targets were set on the dev box; the T4 meets
T-4, T-5 and T-6 and misses T-1 (both uploads), T-2, T-3 and T-7 (the 1M attraction pass of the grid tier, 18.165 ms
against 15 ms), which is the class difference of a datacentre card behind a cloud vCPU (host-side copies and submit
latency), not a regression: the exact tier's `ms / iteration` is 1.7x the RTX 4070 SUPER's at 10k and 3.0x at 65k, and
the grid tier's is 2.8x at 100k 2D and 5.7x at 1M 2D while the attraction pass alone is 12.2x.

Measured on gpu-linux-t4 (NVIDIA: 580.126.20 580.126.20.0), session 2026-09-20T02:29:33.210Z (run 35483512705), medians of 5 runs; Chromium: nvidia / turing (nvidia-turing-driver0, the description is redacted by Chromium), session 2026-09-20T02:28:10.676Z. The T-5 (100k), T-6 and T-7 rows are from the later session 2026-09-22T20:21:53.814Z (GPU lane run 35775999450 on commit 1d2d4dcf, the file's last session and the current baseline of this class; its Chromium session 2026-09-22T20:19:30.117Z).

| Id   | What                                                                                                                                     | Target                        | Measured                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T-1  | Upload of the 100k / 1M weighted hot prefix (16.4 MB); 1M / 10M (164 MB)                                                                 | <= 10 ms; <= 100 ms           | 14.338 ms; 256.418 ms                                                                                            |
| T-2  | `degree` + 400 KB readback at 100k (core resident), Node                                                                                 | <= 2 ms                       | 2.957 ms                                                                                                         |
| T-3  | Empty submit + 4-byte `readU32` round trip, Dawn                                                                                         | <= 0.1 ms                     | 1.296 ms                                                                                                         |
| T-4  | ForceAtlas2 exact tier, GPU time per iteration (profiler) at 10k; at 16k                                                                 | <= 1 ms; <= 2 ms              | 0.972 ms; 1.953 ms                                                                                               |
| T-5  | ForceAtlas2 per-frame cost, `step(1)` + the 12n readback at 10k, Chromium (Node in brackets)                                             | <= 6 ms                       | 2.600 ms (1.359 ms)                                                                                              |
| T-5  | ForceAtlas2 per-frame cost, `step(1)` + the 12n readback at 100k on the grid tier, Chromium (Node in brackets)                           | <= 12 ms                      | 8.100 ms (5.314 ms)                                                                                              |
| T-6  | ForceAtlas2 grid tier, GPU time per iteration (profiler) at 100k 2D; at 1M 2D; at 100k 3D                                                | <= 10 ms; <= 100 ms; <= 20 ms | 1.790 ms; 31.057 ms; 3.954 ms                                                                                    |
| T-7  | Attraction gather (the `fa2-attraction` pass of the grid tier), GPU time per iteration (profiler) at 1M / 10M                            | <= 15 ms                      | 18.165 ms -- MISSED: 21 % over the target on this card (1.493 ms on the dev box; G4-F16 of docs/decisions/G4.md) |
| T-8  | PageRank, 100 iterations, wall end to end including the upload, at 100k / 1M; at 1M / 10M                                                | <= 150 ms; <= 1.5 s           | 45.461 ms; 1092.799 ms                                                                                           |
| T-9  | Weakly connected components (Afforest), wall end to end including the upload and the label readback, at 1M / 10M (100k / 1M in brackets) | <= 100 ms                     | 293.079 ms (28.544 ms)                                                                                           |
| T-14 | Fruchterman-Reingold exact tier, GPU time per iteration (profiler) at 10k; at 100k (`repulsion: "exact"`)                                | recorded                      | 0.942 ms; 54.232 ms (the spring preset 1.051 ms; 60.706 ms)                                                      |

The exact curve (the `layout-exact` group: 2D, E = 10n, seeded G(n, m), one simulation per rung; ms / iteration from the profiler):

| n     | ms / iteration | step(1) wall (ms) | pairs / s |
| ----- | -------------- | ----------------- | --------- |
| 1024  | 0.340          | 0.711             | 3.08e+9   |
| 4096  | 0.431          | 0.814             | 3.90e+10  |
| 8192  | 0.797          | 1.172             | 8.42e+10  |
| 10000 | 0.972          | 1.359             | 1.03e+11  |
| 16384 | 1.953          | 2.383             | 1.37e+11  |
| 32768 | 6.861          | 7.394             | 1.57e+11  |
| 65536 | 25.236         | 26.366            | 1.70e+11  |

## Development

```bash
pnpm install                                      # at the monorepo root
cd webgpu-graph-algorithms
pnpm run build:all                                # tsc + the vite bundle + the d.ts shims
pnpm run lint                                     # eslint + tsc --noEmit + the strict-consumer compile
pnpm exec vitest run --project=node               # the node suite on the default adapter
pnpm run coverage                                 # the node suite with the 80 / 80 / 75 / 80 thresholds
node scripts/run-browser-project.js               # the browser smoke suite (SwiftShader by default)
node scripts/gpu-report.js                        # the adapter report and the policy verdict (after build)
cd .. && pnpm exec knip                           # unused files / exports / dependencies
```

Environment variables of the test harness (plan section 12.2):

| Variable                                  | Default lane (GitHub, software) | GPU lane (NVIDIA T4) | Local (dev box)                                                     |
| ----------------------------------------- | ------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `GRAPHTY_GPU_ADAPTER`                     | `llvmpipe`                      | unset                | unset (NVIDIA) or `llvmpipe` to mirror CI                           |
| `GRAPHTY_GPU_REQUIRE`                     | `any`                           | `nvidia`             | unset (skip with a printed reason) or `hardware`                    |
| `GRAPHTY_BROWSER_GPU`                     | `swiftshader`                   | `nvidia`             | `nvidia` (needs the libEGL tree)                                    |
| `GRAPHTY_GPU_NO_SUBGROUPS`                | `1` in a second pass            | `1` in a second pass | unset                                                               |
| `GRAPHTY_GPU_INSPECT`                     | unset                           | unset                | `1` to enable `sim.inspect(name)` / `debugRunStages` in test builds |
| `GRAPHTY_NOISE_FLOOR_WRITE`               | unset                           | unset                | `1` to (re)write this adapter's noise fixtures                      |
| `GRAPHTY_DAWN_FEATURES`                   | unset                           | unset                | optional Dawn toggles                                               |
| `GRAPHTY_EGL_LIB_DIR` / `LD_LIBRARY_PATH` | --                              | unset                | the extracted libEGL tree                                           |
| `VK_DRIVER_FILES`                         | the lavapipe ICD                | unset                | unset                                                               |
| `XDG_RUNTIME_DIR`                         | `/tmp`                          | `/tmp`               | `/tmp`                                                              |

`GRAPHTY_GPU_REQUIRE` is the one policy switch: unset skips tests that need an adapter (with the reason
printed), `any` fails when no adapter exists, `hardware` additionally rejects lavapipe / SwiftShader, a
vendor name (`nvidia`) additionally requires that vendor. A wrong result is never a skip. Every f32 tolerance
of the layout tests is derived from `benchmarks/results/noise-floor.json` (the measured summation noise across
the subgroup twins, lavapipe, SwiftShader and NVIDIA; a tolerance is at most 10x its floor), every kernel ships
with sabotage mutations that must fail its test by 10x that tolerance, and every kernel result is compared
twice for bitwise determinism before it is compared to an oracle (plan section 11.9).

## License

MIT
