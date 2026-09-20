# `spmvPull` ships the thread-per-row tier only

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 8.8 row 1, which names the primitive
"`spmvPull` (tiered segmented reduce by in-degree)"; 6 row 9, "tiered by IN-degree
(`degreeOrder({ of: "reverse" })`, ...)"; and the P7 cell of 13, which lists
"`degreeOrder({ of: "reverse" })` tiers" among the deliverables. None of those is edited; this
record moves the tiers out of P7 and leaves everything else in those cells where it is.

## The decision

`spmv-pull` is one pipeline with `TIER` 0: one thread per row over `[0, n)` of the reverse graph.
The `perm` slot is bound (a dummy when the permutation is the identity, per design 8.2: "the slot
exists whether or not the permutation is the identity"), `USE_PERM` is false, and the
`reverseDegreeOrder` view the tiers will need already uploads through the residency. A caller who
passes non-null `tiers` gets `E_UNSUPPORTED { feature: "spmvPull.tiers" }`, the same answer
`prepareSegmentedReduce` gives today under `feature: "segmentedReduce.tiers"`.

Nothing else moves: the eight-binding layout is the final one, `reverse()` and
`reverseDegreeOrder` residency are complete, and the P4 tier work has no host-side prerequisite
left to build.

## Why

The two upper tiers are a P4 deliverable, gated at G4. Design 6 row 3 assigns "the two upper
tiers, gated at G4" to P4 by name, and design 13 rule (b) says a phase adds only the primitives
its slice needs. P7's gate is parity: `<= 1e-5` against the NetworkX-semantics oracle on every
fixture, `iterations` within one, `converged` identical. A hub row computed on one thread gives
the same numbers as a hub row computed by a workgroup; it is slower, and G7 does not measure
speed on hub-heavy fixtures.

Building the tiers here would also build them twice. `segmented-reduce` throws for non-null
`tiers` today, and P4 owns making it stop; a P7 tier implementation inside `spmv-pull` would
either be a second copy of what P4 writes or force P7 to write P4's shared machinery a phase
early, against a gate that does not test it.

## What we are giving up, and why it is acceptable

The rejected argument was to implement the subgroup-per-row and workgroup-per-row tiers inside
P7, since `spmvPull` is the first kernel that visibly needs them. Design 6 row 9 reads:

> tiered by IN-degree (`degreeOrder({ of: "reverse" })`, whose `perm` occupies group 0 slot 3
> even when identity)

It is right about the cost. On a power-law graph the highest in-degree row has tens of thousands
of in-arcs, one thread walks every one of them per iteration, and that thread is the long pole of
every PageRank iteration on such a graph. That is a real throughput ceiling and this record does
not argue it away.

It is acceptable because it is a throughput ceiling and not a correctness one, because P7 records
its T-8 / T-9 numbers against the fixtures the design names and not against a hub-heavy one, and
because the tiers slot in later without an API change: the `tiers` parameter exists, the `perm`
slot is bound, the reverse degree order is in the residency, and the only thing that changes when
P4 lands is that the throw goes away.

## What would reverse this

Two conditions, counted:

- G4 closes, which lands the tiers in `segmented-reduce`; the same change then removes the
  `spmv-pull` throw. This is the expected path and needs no new decision.
- Before G4, the `pagerank` benchmark on a hub-heavy fixture shows the thread-per-row hub row
  dominating the iteration (measured with `inspect()`, not assumed). Then the tier work moves
  forward and this record is superseded by the one that moves it.
