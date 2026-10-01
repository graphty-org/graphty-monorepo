# The grid tier aggregates outside nodes per orthant, not into one pseudo-cell

Date: 2026-09-24
Decided by: the implementer (a reversible choice; issue #90)
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.7 G1 / G4 / G6 / G7 and the traversal that
`2026-09-20-far-field-levels-are-a-uniform.md` quotes as normative. That record's loop-bound
decision stands; only its "plus the outside pseudo-cell" term is replaced.

## The decision

The grid tier's extent is `min(bounding box, extentFactor x rms radius)`, so outlying nodes can fall
outside the grid. They used to share ONE pseudo-cell (key `G^dim`), and every inside node felt that
cell as one mass at its centroid. They now get one pseudo-cell per orthant about the grid centre:
key `G^dim + orthant`, bit `a` of the orthant set when the node's (clamped) cell coordinate on axis
`a` is at least `G / 2` -- 4 pseudo-cells in 2D, 8 in 3D.

- G1 writes the orthant key; the histogram, the scan and the sort cover `G^dim + 2^dim + 1` words.
- G4 / G4b sum every pseudo-cell like any other cell (a pseudo-cell above the hub size takes the hub
  path unchanged); level 0 of the pyramid holds `G^dim + 2^dim` cells, the pseudo-cells last, and
  none is ever downsampled.
- G6 adds one far-field term per orthant pseudo-cell for an inside node (an empty one adds zero).
  An outside node still takes the coarsest level in full and no pseudo-cell term.
- G7 sums an outside node's near field over all `2^dim` pseudo-cells, so outside nodes still repel
  each other pair by pair, as they did over the single pseudo-cell.
- K1's `outsideGrid` is the sum of the pseudo-cell counts.

## Why

With outliers on opposite sides, the single centroid landed near the middle of the grid, where no
node is: the core was pushed away from an empty point instead of feeling two roughly cancelling
pushes. On a 2,000-node core with 50 outliers at x = +100 and 50 at x = -100 the grid tier's
floored per-node RMS error against the exact tier was 0.80 (cap 0.05); per orthant it is 4.9e-3
(`test/layouts/grid-exact.test.ts` case 6, `test/oracle/grid-field-accuracy.test.ts`).

Separate keys, rather than extra orthant sums inside the one pseudo-cell's G4 thread, keep every
existing path generic: the hub path, the deterministic sums, the near-field sampling and the
inspect() buffers need no special case.

## What would reverse this

A graph whose outliers sit in one orthant but far apart (a thin shell around the grid) still merges
them into one centroid per orthant. If a measured fixture of that shape misses the grid-exact caps,
the next step is finer outside aggregation (per face, or border cells), recorded as its own
decision.
