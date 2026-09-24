# The cell histogram is zeroed by a `fill` dispatch, not by `clearBuffer`

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.7 G3 (line 1972), which begins "after
`encoder.clearBuffer(cellHist)` (no dispatch)". The line is not edited; this record changes how
`cellHist` is zeroed and leaves the histogram's atomic increment and the `exclusiveScan` over
`cells + 2` entries as written.

## The decision

`cellHist` is zeroed by a `fill` dispatch over `cells + 2` words recorded inside the iteration's
compute pass, after K1 has read the previous iteration's `cellHist[cells]` (the outside
pseudo-cell's count, which feeds the extent) and before the histogram's `atomicAdd`. The grid
tier keeps its passes as PD-16 lays them out, and `CommandBatch` gains no clear method. The cost
is one dispatch of `ceil((cells + 2) / WG)` workgroups per iteration.

## Why

The zero has to sit between two dispatches of the same iteration: K1 at the top of the pass
reads last iteration's count, and G3 later in the pass adds this iteration's. `clearBuffer` is a
command-encoder command, not a pass command; recording it between K1 and G3 means ending the
pass, clearing, and beginning a new pass, which splits the iteration's grid pass around the
clear. Every pass boundary is a barrier and a re-bind on the GPU timeline, and the profiler
reports per pass, so the split would also break the T-7 row the grid pass exists to report.

A `fill` dispatch is a pass command like any other, is already a registered kernel with its
sabotage rows and noise row, and costs one launch over a buffer that is small next to the arcs
the same iteration walks.

## What we are giving up, and why it is acceptable

The rejected argument was to use the design's clear:

> after `encoder.clearBuffer(cellHist)` (no dispatch): `atomicAdd(&cellHist[key], 1u)` over the
> keys (order-independent, hence deterministic), then `cellStart = exclusiveScan(cellHist)` over
> `cells + 2` entries

It is right that `clearBuffer` is the cheapest zero WebGPU offers: no pipeline, no bind group,
no workgroup launch, and a driver that can implement it as a DMA fill or a memset outside the
compute queue's shader occupancy. It is also right that a dispatch that writes zeros is one
more entry in the `inspect()` timeline for a reader to account for.

It is acceptable because the clear's cheapness is a per-command cost while the pass split it
would force is a per-iteration cost on the hot path, and because the design's own sequence
(K1 reads the count, then G3 counts again) makes the zero a mid-pass operation whichever command
performs it. The `fill` over `cells + 2` words is 1 MB at G = 512 in 2D and 8 MB at G = 128 in 3D,
a fraction of a millisecond beside the sort.

## What would reverse this

One condition, counted:

- `CommandBatch` gains a clear that records inside a pass without splitting it (a future WebGPU
  pass-level clear, or a batch that reorders the K1 read so the clear can sit at the pass
  boundary), and a profiler row at 1M shows it cheaper than the `fill` dispatch. Then the fill
  goes, and this record is superseded by the one that removes it.
