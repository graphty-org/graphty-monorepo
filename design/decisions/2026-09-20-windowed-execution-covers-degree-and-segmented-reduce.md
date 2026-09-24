# Windowed execution covers `degree` and `segmentedReduce`; the layout and the pull keep their refusal

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 4.6, the "per-row gather" row of the
dispatch-limits table (line 1290), which reads "Windowed bindings (arc ranges): yes (v1)" for the
whole family "(attraction, SpMV, segmented reduce, degree)". The line is not edited; this record
narrows v1's window EXECUTION to `degree` and `segmentedReduce` and leaves the windowed UPLOAD of
4.2 (per-array buffers, the `ArcWindow` list, the rebase uniform) exactly as written for all four.

## The decision

P4 executes windows for the two row-walking primitives whose output accumulates: `degree` and
`segmentedReduce`. Each runs a fill of the identity element and then one dispatch per window
with `arcBase = window.start` and `accumulate = 1`, so a row split across windows folds its
contribution across dispatches. The layout kernels keep `E_TOO_LARGE { path: "windowed" }`
(`force-simulation.ts`, "a windowed core cannot be walked by the layout kernels until P4"; the
message stays as written) and `spmvPull`
keeps `E_UNSUPPORTED { feature: "spmvPull.windowed" }`.

The attraction kernel K2 takes the rebase uniform and clamps its row walk to
`[max(rowPtr[u], arcBase), min(rowPtr[u+1], arcEnd))`, so it is window-READY at the kernel level
and the kernel-level test proves it with the degree-check pattern; what P4 does not build is the
loop that would drive it.

## Why

A windowed core needs more than 33,554,432 arcs at the 128 MiB default binding limit (4.2), which
is the 10M / 100M tier -- the tier 7.21 lists as "Node batch only" and no G4 item measures. The
two primitives that get the loop get it because their loop is cheap and their correctness item
(the FAKED 1 MiB binding limit with a hub row longer than a window, equal to `outDegree()`) is in
the gate.

The two that do not get it each need a piece of machinery the gate does not pay for:

- The layout's uniform ring holds ONE `Fa2Params` record per iteration. A window loop inside
  `ForceSimulation` needs one record per (iteration, window), which is a ring redesign, and every
  model's `recordIteration` would carry the loop.
- The pull's epilogue is affine: `rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)))`
  (`spmv-pull.wgsl.ts` line 47). It cannot accumulate across windows in place; a windowed pull
  needs a plain-sum kernel per window and a second finalize dispatch that applies the epilogue
  once, which is a second body to sabotage and record for a tier no algorithm test loads.

## What we are giving up, and why it is acceptable

The rejected argument was to put the window loop inside `ForceSimulation` and `spmvPull` now,
because 4.6 promises it for the whole family in v1:

> | per-row gather (attraction, SpMV, segmented reduce, degree) | yes | yes (v1) | window loop on
> the host: one dispatch per window, accumulating into the same output |

It is right that the four kernels share one shape -- a row walk over `[rowPtr[u], rowPtr[u+1])`
-- and that a loop written once for `segmentedReduce` is most of the loop the others need. It is
also right that a consumer who loads a 40M-arc snapshot today gets a thrown error from the
layout where the design promised a slower run.

It is acceptable because the error is loud, typed and immediate (`E_TOO_LARGE` with
`path: "windowed"`, before any GPU work), because the kernel side of the work is done (K2's
rebase and clamp are in and tested, so the loop is host code only), and because the tier this
serves has no gate item, no benchmark row and no fixture in P4. Landing the loop without a
measurement would land it untested against the thing it exists for.

## What would reverse this

Two conditions, counted:

- A consumer loads a snapshot above 33,554,432 arcs at the default limits and asks for a layout
  or a PageRank on it. Then the loop lands in the phase that carries that consumer, with the ring
  and the finalize the two kernels need.
- The 10M / 100M tier enters a gate (a benchmark row at that size, or a `node-limits` item that
  runs the layout windowed). Then the loop is that gate's deliverable.
