# `exclusiveScan` has no subgroup variant

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 6, the subgroup-variants paragraph after
the primitive table (lines 1581-1583), which lists "reduce, scan, segmentedReduce, advance and
the FA2 repulsion / near-field epilogue" as the kernels with a `needs: ["subgroups"]` variant,
and D16 (line 213), which states the runtime-subgroup-size rule for "every subgroup kernel" and
names none. Neither line is edited; this record removes `scan` from the list and leaves the rule
and the other four kernels as written.

## The decision

`exclusiveScan` is one body: Hillis-Steele in workgroup memory over a block, recursive block sums
for the next level, and an add-back pass. Its registry entry has `needs: []`, no twin, and no
`GRAPHTY_GPU_NO_SUBGROUPS=1` test. The primitive's cost is one extra barrier round per level
against a subgroup prefix sum.

## Why

The scan's element is `u32` and its operator is addition. Unsigned addition is exact and
associative on every device, so a subgroup `subgroupExclusiveAdd` variant and the
workgroup-memory body produce bitwise the same output on every input. The in-process twin test
of 11.3 -- the feature variant and the twin on the same context, compared -- exists to catch a
variant whose lane mapping or reduction order differs from its twin. Two bodies that cannot
differ make that test prove nothing, and a body that is never distinguishable from its twin is
a second body to sabotage, pin and record (rule (f)) with no failure it could expose.

The kernels that keep their variant reduce `f32` (reduce, segmentedReduce, the near-field
epilogue) or ballot a frontier (advance), where the order or the lane mapping does change the
result and the twin test has something to catch.

## What we are giving up, and why it is acceptable

The rejected argument was to write the subgroup scan because design 6 lists it:

> Subgroup variants (D16): reduce, scan, segmentedReduce, advance and the FA2 repulsion /
> near-field epilogue (7.10) have a `needs: ["subgroups"]` variant using `subgroupAdd`,
> `subgroupExclusiveAdd`, `subgroupBallot`,

It is right about the cost of the workgroup-memory body: a Hillis-Steele block scan is
`log2(WG)` barrier rounds, a subgroup scan is one `subgroupExclusiveAdd` plus one barrier for the
cross-subgroup carry, and on NVIDIA at subgroup size 32 that is eight barriers against two per
block. The scan runs once per radix pass (three per grid iteration) and once for `cellStart`, so
the grid pays that difference four times an iteration.

It is acceptable because the scan is over `cells + 2` entries and over 256 block histograms per
radix pass, not over arcs: at G = 512 in 2D that is 262,146 entries, two block-sum levels
above the base (1,025 block sums, then 5, whose single sums word is the total), and a few dispatches whose runtime is
dominated by launch cost rather than by barrier count. The
`radixSort` and grid rows of T-6 measure the whole iteration, and the scan is not the row that
moves them.

## What would reverse this

One condition, counted:

- The T-6 profile (`inspect()` rows on the grid ladder at 1M) shows the scan dispatches above
  10 % of the grid iteration on any adapter. Then the subgroup body lands with its twin test, the
  registry entry gains `needs: ["subgroups"]`, and this record is superseded by the one that
  adds it.
