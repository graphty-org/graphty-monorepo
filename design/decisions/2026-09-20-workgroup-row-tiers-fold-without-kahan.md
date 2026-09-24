# The workgroup-per-row tiers fold plainly, without Kahan compensation

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 6 row 3 (line 1570), whose last clause of
the `segmentedReduce` cell reads "Kahan compensation in the workgroup-per-row loop". The line is
not edited; this record removes the compensation from the three TIER 2 loops (`segmented-reduce`,
`fa2-attraction`, `spmv-pull`) and leaves the tier ranges, the permutation and the value snippet
as written.

## The decision

The workgroup-per-row tier of each of the three row-walking kernels is a plain strided fold: each
lane sums its stride of the row's arcs in `f32`, and `wg_reduce_*` folds the lanes. No running
compensation term, no `select` to keep one alive. Every tier bound is a derived noise-floor
tolerance (11.9, `noiseFloorFor(id)`), so the tier's precision is measured per adapter and
recorded, not asserted.

## Why

`docs/decisions/G7.md` lines 121-124 record what happened to the last Kahan loop this package
shipped. The pull's compensated sum, kept alive with a `select` that lavapipe and NVIDIA
honoured, was folded away by Metal's compiler on the hosts lane: the macOS job failed
`eigenvectorCentrality` and `katzCentrality` on hub10k at 2.07e-5 and 1.1e-5 relative, the
naive-sum error, on the first run of PR #13. One kernel, two floors on two adapters, and a
tolerance derived on one that the other could not meet.

A plain fold has no algebraic identity a compiler can simplify: `a + b` is `a + b` on every
backend, and the fold's rounding is the fold's rounding. That makes the recorded floor of each
adapter the floor the kernel actually runs at there, which is the property the noise-floor
machinery depends on. The chunked fold the pull switched to (chunks of 64 terms, then the
chunks) holds the 1e-5 gate on every adapter, and the tier loops inherit its shape.

## What we are giving up, and why it is acceptable

The rejected argument was to keep the design's compensation:

> [...] the value snippet is Gunrock's `neighborreduce` functor (note 04 section 2.2) and may
> reference only `(row, arc, target, weight)`; Kahan compensation in the workgroup-per-row loop

It is right about the arithmetic. A row of 10,000 arcs summed in `f32` carries a rounding error
that grows with the row length, a compensated sum bounds it independent of length, and the rows
that reach TIER 2 are exactly the long ones. On an adapter that honours the compensation, the
hub row's floor is lower by an order of magnitude.

It is acceptable because a floor that depends on the compiler is not a floor: the noise-floor
rows are recorded per adapter and a tolerance derived from one adapter's compensated floor
fails on an adapter that folds the compensation away, which is what G7 saw. The plain fold's
floor is higher and the same everywhere, and the caps the tiers are held to (1e-4 for
`segmented-reduce.tiers` and `tiers-inspect.attraction`, 1e-5 for `spmv-pull.tiers`, against the
`f64` oracle) sit above the plain fold's measured floor with room, on lavapipe and
NVIDIA alike.

## What would reverse this

One condition, counted:

- A tier's recorded `oracle-f64` floor (`test/fixtures/noise/`) lands above its recorded cap on any
  adapter the lanes run. Then that tier gets a chunked fold in the shape of `spmv-pull.wgsl.ts`
  (never a compensated one, for the reason above), and this record is superseded by the one that
  adds it.
