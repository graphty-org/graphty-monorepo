# BFS dedupes by the atomic claim alone; no hash culling and no ownership pass

Date: 2026-09-24
Decided by: the owner, through the P8 plan (`design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`,
departure DEP-P8-B and decision PD-5)
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 8.4, the BFS sentence (lines
2647-2648) that names "Davidson's ownership dedupe (6 row 4: `atomicStore` in one dispatch,
`atomicLoad` in the next) as the exact safety net behind any workgroup hash culling"; section
8.8 row 4 (line 2801), which lists `dedupe` among the primitives BFS pulls in; section 8.10's
"BFS contract" row (line 2852), which binds `owner (atomic)`; and section 16.2 (lines 5027-5044),
whose contraction rule runs "the existing ownership dedupe" below `n / 8` emitted entries and a
bitmap compaction above it. None of those lines is edited; this record removes the dedupe and
the density switch from the BFS contract and leaves the rest of each passage as written.

## The decision

The BFS contract phase is one path: every entry of the edge queue tries
`atomicMin(&depth[v], level + 1)`, the invocation that observes `INVALID_INDEX` is the winner,
and only the winner appends `v` to the next vertex frontier. No workgroup hash culls the edge
queue first, no `owner` array is written, no second dispatch reads one back, and no density
threshold picks a bitmap path. `bfs-contract` binds the edge queue, the counters block, `depth`
and the next frontier -- four storage buffers, not the design's seven -- and `bfs-fused` claims
the same way straight from the frontier.

`dedupe` itself ships in this phase (`prepareCompact(scope).recordDedupe`, two dispatches, the
design's ownership trick written race-free), because the near-far queue of the weighted
shortest-path driver needs it: a vertex whose distance improves twice in one round is appended
twice to the near pile, and the relax kernel has no claim that makes the second append a no-op.
BFS is the one caller that does not need it.

## Why

The atomic claim is already an exact filter. For one level, `depth[v]` holds `INVALID_INDEX`
until the first `atomicMin` lands, and every later `atomicMin` on that word observes a value
below `INVALID_INDEX` and loses. Exactly one invocation per vertex wins, so the next vertex
frontier carries no duplicate by construction, and an ownership pass over it would compare every
entry against itself and remove nothing. The safety net the design describes has nothing to
catch.

What the net was behind -- workgroup hash culling of the EDGE queue -- is a bandwidth
optimisation that removes some duplicate arcs before the claim, saving an atomic per removed
entry. It is exact only with the ownership pass behind it (a hash can drop a distinct vertex on a
collision), which is why the design pairs them. This phase does not attempt the culling, so it
does not need the net, and the atomics it would have saved are the ones the level pays anyway on
the levels that dominate a traversal.

Section 16.2's density switch is the same question from the other side: it chooses between the
ownership dedupe and a bitmap compaction as two ways of removing duplicates from the emitted
buffer, and both exist to serve a queue that holds them. The claim produces a queue that does
not. The bitmap, the flags kernel and `compact` that this phase does build serve the
direction-optimizing path (the unvisited list of the bottom-up sweep, rebuilt once per submit,
PD-18), not the contraction.

## What we are giving up, and why it is acceptable

The rejected argument was the design's: the edge queue holds a vertex once per frontier
neighbour, so a vertex with `k` neighbours in the frontier costs `k` atomic read-modify-writes at
the contract, and on a scale-free level the emitted buffer is a multiple of `n`. Culling before
the claim cuts those atomics, and 16.2's bitmap path cuts them to one `atomicOr` per set bit.

It is right about the count: on the peak level of an RMAT traversal most edge-queue entries lead
to a vertex that some earlier entry of the same level also leads to, and each one is an atomic.

It is acceptable because the traversal's peak levels do not run this path at all: Beamer's test
switches the peak levels to the bottom-up sweep, which claims from the unvisited side with one
plain store per newly reached vertex (the list holds each vertex once, so there is no race to
win), and the levels that stay top-down are the small ones
where the fused kernel runs and the edge queue is never materialised. The two-phase contract
runs on the levels between, whose duplicate ratio is modest. T-10 is the measurement that would
say otherwise, and it is recorded on the reference card with the choice counters beside it.

## What would reverse this

One condition, counted:

- A profile on a scale-free fixture (the `bfs` benchmark group's RMAT rungs, with the
  `fusedLevels` / `twoPhaseLevels` / `bottomUpLevels` counters read back) shows the two-phase
  contract's atomics dominating a level that the direction switch does not take. Then hash
  culling lands on the edge queue WITH the ownership pass behind it, and the pass is
  `recordDedupe`, already built and tested for the near-far queue; `bfs-contract` gains the
  `owner` binding the design's 8.10 row always gave it, and this record is superseded by the one
  that adds it.
