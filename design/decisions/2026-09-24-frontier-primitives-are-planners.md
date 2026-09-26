# The frontier primitives are planners over a scope, not free functions over a batch

Date: 2026-09-24
Decided by: the owner, through the P8 plan (`design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`,
departure DEP-P8-A and decision PD-1)
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 6, the "API" cells of rows 4, 7 and 8
(lines 1579, 1583, 1584), which spell `compact(batch, flags, count, out, outCount)`,
`dedupe(batch, queue, count, owner, out, outCount)`, `advance(batch, graph, frontier, functor: {
visit, filter }, tiers?)`, and give `Frontier` two four-byte `count` bindings and a
`reset(batch, seed: number[])`. None of those lines is edited; this record replaces the
spellings and leaves the rows' "How", cost and oracle cells as written.

## The decision

The three primitives ship the way every primitive that landed after the design was written
ships: an async `prepareX(scope, ...)` that compiles the pipelines once and returns an object
whose `record(pass, ...)` is synchronous and records into an open compute pass.

- `prepareCompact(scope)` returns `{ record(pass, { queue, flags, count, out, outCount, ... }),
  recordDedupe(pass, { queue, count, owner, out, outCount, ... }), recordDedupeIndirect(pass,
  record, args, claimSlot, filterSlot) }` (`src/primitives/compact.ts`). The count may be a
  host number or a device word, and the indirect form takes both dispatch sizes from an args
  buffer, which is what a level recorded before its size is known needs.
- `prepareFrontier(scope, n, arcCount, edgeCapacity?)` returns `{ frontier, recordFinalize(pass,
  role, level, fields) }` (`src/primitives/frontier.ts`). The `Frontier` class keeps the design's
  name and its two vertex queues, but its counters are ONE 96-byte block of 24 words
  (`FrontierCounters`, PD-8) rather than two four-byte counters, and `reset(queue, source, seed)`
  takes a record of named words (`{ nextFrontierCount: 1, level: U32_MAX }`) rather than a
  positional `number[]`, because the block has 24 words and a caller seeds two of them.
- `prepareAdvance(scope, core)` returns `{ kernel, windows, record(pass, frontier, level) }`
  (`src/primitives/advance.ts`). There is no functor parameter: the design's `visit` / `filter`
  snippets are not composed into the expansion. `advance` expands the frontier into the edge
  queue and the per-algorithm work -- the depth claim, the distance relax -- is its own kernel
  over that queue (`bfs-contract`, `sssp-relax`), which is the two-phase shape design 8.4 names as
  the workhorse anyway.

The design's argument order (`batch` first) is gone with the batch: the pass is the first
argument of `record`, exactly as `prepareScan`, `prepareHistogram`, `prepareCountingSort` and
`prepareRadixSort` take it.

## Why

Pipeline creation is asynchronous on WebGPU and compilation must happen once per scope, never
per level: a traversal records up to 32 levels into one command buffer and a road network has
thousands of levels. A free function that takes a `CommandBatch` has nowhere to keep a compiled
pipeline between calls and nowhere to await one, so every primitive that landed after the design
-- the scan, the histogram, the counting sort, the radix sort, the segmented reduce -- resolved
this the same way: prepare once over a `ReduceScope`, record many times. `src/primitives/**`
never imports `src/context.ts` (the layer rule of design 3.2, enforced by
`test/layers.test.ts`), so a planner over a scope is the only shape that compiles there.

The functor is dropped for a reason the design already gives: the two-phase form separates the
expansion from the claim so that the claim kernel can be the one that differs per algorithm.
Composing `visit` / `filter` snippets into one body would give every algorithm its own compiled
copy of the block-mapped expansion, each with its own sabotage rows, noise row and compile
matrix case. One expansion body with two callers is what design 13 rule (f) can afford.

## What we are giving up, and why it is acceptable

The rejected argument was the design's: a free function over a batch reads like the algorithm
it implements (`advance(batch, graph, frontier, ...)` is one line in a driver), and a functor lets
a driver express its claim without a second WGSL body.

It is right that the planner shape is two calls where the design had one, and that a driver
now holds a planner object for the life of its scope. It is right that the functor would have
let `bfs-contract` and the near-far relax share the expansion's code at the source level.

It is acceptable because the two calls are the same two every other primitive already makes, so
a driver author meets no second convention; because the planner object is where the compiled
pipelines and the leased scratch live, and both must outlive one call; and because the claim
kernels are small (the contract is a claim line and a scan) while the expansion is the body with
the binary search, the subgroup twin and the window clipping, which is the one that must not be
duplicated. The `Frontier` class, its two queues, its args buffer and its `swap()` are the
design's; only the spellings that could not compile changed.

## What would reverse this

One condition, counted:

- A primitive whose pipeline can be compiled synchronously and whose scratch is per call. None
  exists in this package (the kernel layer compiles every pipeline through
  `createComputePipelineAsync`, `src/kernel/pipeline-cache.ts`, so a compile never stalls the
  device), so nothing here is expected to reverse. If a later phase needs the functor -- P9's
  betweenness forward pass tags the expansion with a source index -- it lands as a second
  registered body or an override on the one expansion body, never as a snippet composed per
  algorithm.
