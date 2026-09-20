# PageRank's `outWeightSum` is per-call scratch, not a residency entry

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 8.2, the sentence "The `outWeightSum`
buffer is registered against the snapshot in the residency so a second PageRank call on the
same snapshot reuses it". That section is NOT edited; this record supersedes that one sentence.

## The decision

`src/algorithms/pagerank.ts` leases `outWeightSum` (`n` f32) from the call's scratch, fills it
with one `segmentedReduce` pass over the forward graph (the sum of each row's out-weights, or the
out-degree when unweighted), reads it through `pr-scale` for every iteration, and releases it
with the lease when the call ends. A second PageRank call on the same snapshot recomputes it.

Nothing else moves: `GraphResidency.array(key, label, owner)` keeps its signature and its
CPU-array key, the `reverse()` view stays memoised per snapshot record, and the pool sees one
more `n`-word lease per call.

## Why

The residency keys uploads on the CPU typed-array object: `array(key, ...)` looks `key` up in a
`WeakMap` of residents, and a view is memoised on the snapshot's record by name. A device-computed
array has no CPU object to key on and no view name to memoise under. Registering it means a new
residency surface -- a snapshot-keyed derived slot with its own release, invalidation and memory
accounting -- that the memory spec (4.1-4.3) does not describe and that P7 has no second use for.

The saving it would buy is one O(A) pass per call against the O(A) pass every iteration already
costs: at the default `maxIterations` of 100 the normaliser is about one percent of a call, and
with `tolerance` typically met earlier, a few percent.

## What we are giving up, and why it is acceptable

The rejected argument was to add a derived-array API to the residency (`residency.derived(s,
"outWeightSum", build)` or a view name for it) so that the pass runs once per snapshot. Design
8.2 reads:

> The `outWeightSum` buffer is registered against the snapshot in the residency so a second
> PageRank call on the same snapshot reuses it.

It is right that a caller who runs PageRank repeatedly on one snapshot -- a damping-factor sweep,
or personalized PageRank once per seed -- pays the pass every time, and that the array is a
function of the snapshot alone. Between calls it is a pure cache miss.

It is acceptable because the pass is a few percent of one call, because a residency entry holds
`4n` bytes for the snapshot's lifetime whether or not a second call ever comes, and because a
residency API added for one caller is the kind of surface that is hard to remove once a second
caller assumes it. If a second caller appears, the API can be designed for both.

## What would reverse this

Two conditions, counted:

- A measured `pagerank` benchmark in which the normaliser pass is more than ten percent of a call:
  in practice a personalized run that converges in a handful of iterations and is repeated per
  seed. The number comes from `inspect()` on the real fixture, not from this estimate.
- A second algorithm wants a device-computed per-snapshot array shared across calls, at which point
  a derived-array residency slot has two callers and earns its accounting.
