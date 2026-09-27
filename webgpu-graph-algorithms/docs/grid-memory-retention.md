# Native memory growth across grid-tier simulations (issue #162)

## What was seen

A Node process that created, ran and disposed ForceAtlas2 simulations on the grid tier kept growing. On Mesa's
software rasteriser (lavapipe) it grew by roughly 0.5-0.7 MB per simulation while the JavaScript heap looked flat,
and neither disposing the simulation nor destroying the device gave the memory back. The 4,096-seed unbiasedness
check in `test/layouts/grid-unbiased.test.ts` creates one simulation per seed, so it pushed a CI worker past the
runner's memory, and the software lane was cut to 128 printed seeds.

It was blamed on the driver. It was ours.

## The mechanism

A `Kernel` (`src/kernel/kernel.ts`) caches the bind groups it creates, keyed by the identity, offset and size of
every buffer bound. Kernels themselves are cached by the context's `PipelineCache` for the life of the context. The
bind-group cache had no bound and nothing removed an entry when the buffers behind it went away, so every
simulation's bind groups stayed reachable from the context after the simulation was disposed. A bind group holds
native objects (on lavapipe, a Vulkan descriptor set and references to the buffers), so the growth showed up in the
process RSS, not in the JavaScript heap.

The layout models cleared some kernels on dispose (`invalidate()` on K1, K5, the attraction kernels and the grid's
far and near field), but not the grid build's scan, radix sort, histogram, cell-key and pyramid kernels. A heap
snapshot after 200 grid simulations counted 16,800 more live `GPUBindGroup` objects than after 50: 84 per disposed
simulation. The same applied to any algorithm whose scratch buffers the pool had trimmed and recreated.

The exact tier kept its memory flat because the kernels it binds are the ones its model invalidates.

## The fix

`Kernel`'s cache is now least-recently-bound with at most `BIND_GROUP_CACHE_LIMIT` (32) buffer sets per kernel.
Binding one more forgets the oldest. A caller keeps the `BoundKernel` it was given, so eviction never invalidates a
live simulation; it only means a later `bind()` of the same buffers creates the bind group again. One simulation
binds at most about a dozen sets per kernel (the scan's levels), so a working simulation still reuses its bind
groups. The fix sits in the one class every model and algorithm binds through, so no caller has to remember to
invalidate.

The bound is a count, not a lifetime: up to 32 stale sets per kernel can outlive their buffers. That is a few
megabytes in the worst case and no longer grows.

## Measurements

`scripts/grid-memory.mjs` (run after `pnpm run build:all`) prints the process RSS beside the JavaScript heap every
`--every` iterations for three loops: `fresh` (a new grid simulation per iteration: load, one step, dispose -- the
pattern of the unbiasedness test; `--inspect` uses the test-only inspect() path instead of `step(1)`), `one` (one
simulation stepped repeatedly) and `raw` (Dawn alone, no graphty code: a buffer, a bind group, a dispatch and a
`mapAsync` readback per iteration, every buffer destroyed). 1,025 nodes, 2D.

| Loop, adapter                            | Before the fix                                             | After the fix                                     |
| ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `raw`, lavapipe (400 iterations)         | 161 MB to 190 MB, flat after warm-up                       | (no graphty code)                                 |
| `raw`, RTX 4070 SUPER (2,000 iterations) | 222 MB to 239 MB, flat                                     | (no graphty code)                                 |
| `fresh`, lavapipe                        | 324 MB at 100, 470 MB at 400: about 0.47 MB per simulation | 311 MB at 250, 317 MB at 1,000                    |
| `fresh --inspect --gc`, lavapipe         | not run on its own (the test run below covers this path)   | 311 MB at 250, 314 MB at 1,000                    |
| `fresh --gc`, RTX 4070 SUPER             | 378 MB at 500, 693 MB at 2,000; heap 6 MB to 45 MB         | 361 MB at 500, 398 MB at 2,000; heap flat at 8 MB |
| `one`, lavapipe (2,000 steps)            | rises to 611 MB by step 750, then flat                     | unchanged (never leaked)                          |
| `one --repulsion exact`, either adapter  | flat                                                       | unchanged                                         |

The unbiasedness test at the full 4,096 seeds on lavapipe (both fixtures, 8,194 grid simulations in one worker):
peak worker RSS 3.99 GB and 217 s before the fix, 497 MB and 115 s after. Both cases pass their 5 % tolerance at
4,096 seeds (2.415e-2 on hubcell, 2.323e-2 on onecell1025).

So the growth was neither Mesa's nor Dawn's: the raw Dawn loop is flat on both adapters, and the NVIDIA card showed
the same growth as lavapipe (smaller per object). No upstream report is needed.

## What was not measured

- Dawn 0.6.1 (the version the Ubuntu 24.04 move takes the package to) does not load on this Ubuntu 22.04 host: its
  `dawn.node` needs `GLIBCXX_3.4.32`. The cause was in this package, not in Dawn, so the Dawn version does not
  change the result; the script runs unchanged against a newer build through `WEBGPU_MODULE=<path>` for the `raw`
  loop once a host can load it.
- The browser. The cache is in the runtime-agnostic core, so a browser session had the same growth: graphty-element
  creates a GPU simulation for each layout run through `@graphty/layout`'s `createSimulation`, and each disposed
  grid-tier simulation left its bind groups behind in the GPU process, where `performance.memory` cannot see them.
  The fix applies there unchanged.

## For consumers

Creating and disposing simulations, and calling the GPU algorithms repeatedly, on one context no longer grows
memory. Keep one `GpuContext` for the session and dispose each simulation when its layout ends.
