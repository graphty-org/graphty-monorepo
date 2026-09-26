# An edge-queue overflow is recovered by a fused retry of the level, not a chunked re-dispatch

Date: 2026-09-24
Decided by: the owner, through the P8 plan (`design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`,
departure DEP-P8-G and decision PD-23)
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 6 row 7 (line 1583), whose overflow
rule has `finalizeArgs` record "`chunkStart` on the device and re-dispatch `expand` for the
remaining source range (one indirect slot per chunk, at most `ceil(A / capacity)` chunks per
level, all recorded in the batch)"; section 8.4's sentence (lines 2670-2675) that the edge
frontier is "chunked with the overflow rule of 6 row 7"; section 8.10's "BFS expand" row (line
2851), whose seventh binding is `chunk`, "the overflow bookkeeping of 6 row 7"; and design 13 row
P8's gate clause "(the chunked overflow rule)" (line 4268). None of those lines is edited. The
detection half of the rule -- the unclamped total compared with the capacity on the device, and
a faked 4,096-entry capacity in the gate -- is kept exactly as the design wrote it; this record
replaces the recovery half.

## The decision

`advance-expand` appends to the edge queue with a workgroup-granular `atomicAdd` on `edgeCount`,
clamps its writes to `edgeCapacity` (a lane whose position is at or past the capacity writes
nothing) and adds the same aggregate into a second word, `edgeCountUnclamped`. `frontier-finalize`
in its edge-queue role compares the two. When the unclamped total is larger, the level's edge
queue is incomplete: the role writes `(0, 0, 1, 0)` into the contract slot, real arguments
sized from `frontierCount` into the fused-retry slot, and adds one to `overflowLevels`. The
fused kernel then claims the whole level directly from the vertex frontier, exactly as it does
for a small frontier, and the partial edge queue is never read. `edgeCount` keeps the clamped
value for the record. There is no `chunkStart`, no `chunk` binding and no second expansion; the
counters block's `edgeCountUnclamped` word is the detector and `overflowLevels` the witness a
test reads back.

## Why

The design's recovery assumes the queue is filled in frontier order, so that a clamped write
leaves "the remaining source range" as a range of frontier indices starting at `chunkStart`. It
is not. The reservation is a workgroup-granular `atomicAdd`, and workgroups reach it in whatever
order the device schedules them: after a clamp, some higher-indexed workgroups have their arcs in
the queue and some lower-indexed ones do not. The set of frontier vertices whose arcs are
missing is not a range, and no device word can name it. An exact chunked re-dispatch would need
a per-level exclusive scan of the frontier's degrees to give every vertex a deterministic
position, which is a scan dispatch and a scratch pass on every level to serve the rare one that
overflows.

The fused kernel already exists for small frontiers, claims from the frontier directly, needs no
queue, and is exact on any frontier size. Selecting it for the overflowing level is one slot
write in the selector that already writes seven slots a level, and the device counters it needs
(`frontierCount`, both edge counts) are the ones the expansion already produces.

## What we are giving up, and why it is acceptable

The rejected argument was the design's: the two-phase form exists because a fused kernel is
workgroup-per-row and load-imbalanced on a level with a wide degree spread, and a chunked
re-expansion keeps that balance on the levels large enough to overflow, which are exactly the
levels where balance matters most. A peak RMAT level carries 50-70% of `A`.

It is right about the cost on the level that overflows: the fused retry walks that level's rows
one workgroup each, and the expansion already done into the clamped queue is thrown away.

It is acceptable, for three reasons. The queue is sized to `A` entries whenever `4A` fits the
binding limit, and at that size no level can overflow (a level's degree sum is at most `A`), so
on every tier below the windowed one the rule never fires. Above it the queue is capped at the
binding limit -- 33.5M entries under 50M arcs on the 200 MB `node-limits` fixture -- and the
retry ran inside that traversal in 318-408 ms for 2.5M nodes, bitwise against the CPU oracle.
And the benchmark group prints `overflow=` beside every T-10 row from the counters block: it
reads 0 at 100k / 1M and 1M / 10M on both adapters, so the levels the target measures never pay
the retry. The design's own G8 clause, a level whose degree sum exceeds a faked 4,096-entry
capacity giving exact depths, is met under a test that forces the two-phase path on every
level: the undirected star from its hub overflows on both levels, the directed one once, and
every depth is exact.

One consequence is recorded rather than guarded: on a retry level `frontierDegreeSum` holds
twice the level's degree sum, because `advance-expand` and `bfs-fused` both add it, and the
direction test after such a level sees the doubled value. It is said in the fused kernel's
JSDoc and in the overflow test, which pins `direction: "top-down"` for that reason.

## What would reverse this

One condition, counted:

- A T-10 row on the reference card misses with `overflowLevels > 0` in its record, on a fixture
  whose capacity the binding limit caps. Then the chunked re-dispatch lands with the per-level
  degree scan it needs, `advance-expand` gains the `chunk` binding of the design's 8.10 row, and
  this record is superseded by the one that adds it. Until a real traversal pays the retry
  measurably, the fused path is exact, tested and free on every tier that matters.
