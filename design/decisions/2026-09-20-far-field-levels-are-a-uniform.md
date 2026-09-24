# The far field's level count is a uniform, not an override

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.7 G6 (line 1977), whose last clause reads
"loop bounds are compile-time per `override LEVELS`". The line is not edited; this record changes
where G6 reads its level count from and leaves the kernel's traversal (the 3x3 exclusion, the
6x6 block per level, the outside pseudo-cell's term) as written.

## The decision

`grid-far-field` reads `P.levels` and `P.gridMax` from the grid uniform and loops over a runtime
bound. It declares no `LEVELS` override; its override set is `LAW` alone (the dimension is
`P.dim` in the same uniform), so its compile matrix is one pipeline per law. The cost is one
uniform load per loop bound.

## Why

The level loop is a `for` over `[0, levels)` whose body does the same work at every level: a
block of cells at an offset the uniform carries. Nothing in it needs the trip count at compile
time -- no workgroup-memory array is sized by it, no unrolling changes its arithmetic, and G6
reaches no barrier at all (its body has no `workgroupBarrier`).

An override, on the other hand, is part of the pipeline key. `levels = log2(G / 4) + 1` is a
function of `G`, and `G` doubles whenever `n` crosses a power of `2^dim` (4 in 2D, 8 in 3D), whenever the
tuning's `gridMax` changes, and on every switch between 2D and 3D. Each of those would compile a
new G6 pipeline (a Tint compile on the main thread, tens of milliseconds) for a loop that runs
identically over a uniform bound. The `PipelineCache` would fill with one G6 per level count
the session had visited, and `warm()` would have to guess which counts to prebuild.

## What we are giving up, and why it is acceptable

The rejected argument was to keep the override the design names:

> [...] per cell `F += d * (k m_i M_cell / (\|d\|^2 + state.eps^2))` with `d = p_i -
> centroid_cell` (mass-weighted centroid, Gephi `Region` semantics); loop bounds are compile-time
> per `override LEVELS`

It is right that a compile-time bound lets the compiler unroll the level loop and hoist the
per-level offsets into constants, and that on a kernel whose inner loop is a 6x6 (6x6x6) block
walk, the outer loop's overhead is paid once per node per level. At eight levels in 2D
(G = 512) that is eight bound checks per node the unrolled form would drop.

It is acceptable because those eight checks sit beside a 6x6 (6x6x6) block minus its 3x3
(3x3x3) core per level, 27 (189) cell reads, each a 16-byte load and a division, so the loop
overhead is well under a percent of the kernel's work,
while a recompile on a `G` change is a stall a reader sees. The uniform bound also keeps the
kernel's compile matrix at one pipeline per `LAW` value and none per level count, whatever
figure `test/kernel/wgsl-compile.test.ts` pins for `grid-far-field` at the time.

## What would reverse this

One condition, counted:

- The T-6 profile (`inspect()` rows on the grid ladder at 1M) shows G6's loop overhead above
  10 % of the grid iteration on a level count the override would fix -- measured by comparing
  the uniform-bound body against an unrolled variant compiled by hand for that count. Then
  `LEVELS` joins the override set, the compile matrix grows by the level counts `warm()` prebuilds,
  and this record is superseded by the one that adds it.
