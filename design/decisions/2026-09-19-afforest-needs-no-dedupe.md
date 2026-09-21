# Afforest WCC needs no `dedupe`

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 13 row P7, which lists "Afforest WCC (with
the two-dispatch atomic dedupe)" among the deliverables; 8.8 row 3, whose "New primitive it
pulls in" cell ends with "`compact`"; and 6 row 4, whose Phase cell assigns `compact` / `dedupe`
to "P4 (grid hub cells), P7 (WCC), P8" -- the P7 (WCC) assignment is withdrawn. None of the three
is edited. Design 8.3, the description of the algorithm, stands unchanged, as does the rest of
6 row 4.

## The decision

M8b builds the Afforest of design 8.3 and nothing more: `comp[v] = v`, two sampled link rounds
over the r-th neighbour of every vertex (`wcc-link-sample`), pointer-jumping compress through
`atomicLoad` (`wcc-compress`), a 1,024-word sample readback whose mode is the giant component
(`wcc-sample`), then link rounds over `edgeList()` for edges with an endpoint outside the giant
component until the changed flag stays 0 (`wcc-link-edges`). Every link is a
`atomicCompareExchangeWeak` hook of the larger root onto the smaller. There is no `compact`, no
`dedupe`, no `owner` array and no second dispatch to read one back.

Nothing else moves: `compact` and `dedupe` stay design 6 row 4 with their signature and the
two-dispatch ownership trick exactly as that row describes them; only the row's phase list loses
P7, leaving P4 (grid hub cells) and P8 (frontier queues).

## Why

Afforest's link is idempotent. Hooking the same edge twice, or hooking it from both endpoints,
performs the same CAS against the same pair of roots and either succeeds once or fails harmlessly;
there is nothing a duplicate can corrupt and no counter a duplicate can inflate. `dedupe` exists
for frontier queues, where a vertex enqueued twice is visited twice, doubles the next level's work
and breaks the queue count. Afforest has no queue: its edge round visits `edgeList()`, which holds
each edge once by construction, and its sample rounds visit each vertex once.

Design 8.3 is the normative description of the algorithm and does not mention `dedupe`; the P7
cell of 13 is a deliverables list written before the kernels were enumerated. Where the two
disagree, 8.3 wins because G7 tests the partition 8.3 produces.

## What we are giving up, and why it is acceptable

The rejected argument was to build `compact` and `dedupe` in P7 because the P7 row names them.
That would land a primitive with no caller in the phase, no algorithm exercising its oracle path,
and sabotage mutations only a primitive-level test could catch -- exactly what design 13 rule (b)
exists to prevent. The P7 cell reads:

> Afforest WCC (with the two-dispatch atomic dedupe)

and 6 row 4's Phase cell, which agrees with it, reads:

> P4 (grid hub cells), P7 (WCC), P8

Read charitably, it is pointing at the round after sampling: "link the remaining edges of
vertices not in it". A compacted list of the edges with an endpoint outside the giant component
would make each post-sample round O(E') instead of O(E), and on a graph where the giant component
holds most edges E' is small. That is a real saving and the cell is right to want it.

It is acceptable to forgo because the post-sample rounds are few (GAP reports one to three on
its graphs, and the changed flag is checked every four), the edge kernel skips an in-giant edge
with one branch after two `atomicLoad`s, and a compaction pass is itself O(E) plus the scan it
needs. The saving is a constant factor on the tail of the algorithm, and `compact` is coming in
P4 regardless.

## What would reverse this

Two conditions, counted:

- The `wcc` benchmark shows the post-sample rounds dominating on a fixture with a small giant
  component (many mid-sized components, so most edges survive the skip), where compaction would
  pay. The number has to be measured; the fixture set of G7 does not contain such a graph.
- P4 lands `compact`, at which point compacting the surviving edge list once before the edge
  rounds is one call and its own small decision, not this one reopened.
