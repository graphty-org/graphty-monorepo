# Decision records

One decision per file, named `YYYY-MM-DD-<slug>.md`, never edited after it lands.
A later decision that changes an earlier one gets its own file and links back.

One exception, and only this one: a record is amended in place to complete ITS OWN list, when
the decision turns out to reach a place its author did not enumerate. The amendment is a dated
section at the end that says what it adds and changes nothing that was decided. Anything that
changes the decision itself still gets its own file. Two records carry such a section, both
dated 2026-09-23.

## Why these are separate files

The design documents in this directory tree are plans of record: they say what was
decided and why, and they are long. When a decision changes, editing the design in
place destroys the thing that stops the decision being reversed six months later --
the record that somebody already considered this and said no. A deleted rationale
gets rediscovered and re-implemented.

The older practice was to append the record to a "Review log" at the end of the
design document itself. That works until two branches append at once: on 2026-09-19
three branches were appending to the end of `webgpu/webgpu-acceleration-plan.md`
and every merge needed a hand-resolved concatenation. One file per decision has no
shared end to collide over, so a branch that records a decision merges cleanly.

Decisions already written into a design document's Review log or decision log stay
where they are. This directory is for new ones.

## What a record contains

The decision, the date, who made it, what it changes, and -- the part that matters --
the argument that was rejected. A record that only says what we do now is a worse
version of the code.

| Record                                                                                                                                     | Decision                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [2026-09-19-no-nightly-gpu-lane.md](2026-09-19-no-nightly-gpu-lane.md)                                                                     | The GPU lane has no nightly cron                                                                                                                 |
| [2026-09-19-bench-compare-min-confirms-median.md](2026-09-19-bench-compare-min-confirms-median.md)                                         | A benchmark regression needs the minimum to confirm the median                                                                                   |
| [2026-09-19-graphty-element-owns-webgpu.md](2026-09-19-graphty-element-owns-webgpu.md)                                                     | graphty-element owns WebGPU detection; the GPU package is an optional peer                                                                       |
| [2026-09-19-a1-lands-inside-m8a.md](2026-09-19-a1-lands-inside-m8a.md)                                                                     | A1 lands inside phase M8a, together with the first six indexed ports                                                                             |
| [2026-09-19-afforest-needs-no-dedupe.md](2026-09-19-afforest-needs-no-dedupe.md)                                                           | Afforest WCC needs no `dedupe`                                                                                                                   |
| [2026-09-19-land-element-graph-store.md](2026-09-19-land-element-graph-store.md)                                                           | The element graph store lands now; the rest of its refactor is respecified                                                                       |
| [2026-09-19-outweightsum-is-call-scratch.md](2026-09-19-outweightsum-is-call-scratch.md)                                                   | PageRank's `outWeightSum` is per-call scratch, not a residency entry                                                                             |
| [2026-09-19-pagerank-options-shadowing.md](2026-09-19-pagerank-options-shadowing.md)                                                       | The shadowed PageRankOptions stays until 2.0                                                                                                     |
| [2026-09-19-pagerank-ping-pong-is-two-buffers.md](2026-09-19-pagerank-ping-pong-is-two-buffers.md)                                         | PageRank ping-pongs two buffers, not two ranges of one                                                                                           |
| [2026-09-19-spmv-pull-is-its-own-kernel.md](2026-09-19-spmv-pull-is-its-own-kernel.md)                                                     | `spmvPull` is its own kernel, not a `segmentedReduce` snippet                                                                                    |
| [2026-09-19-spmv-tier-zero-only.md](2026-09-19-spmv-tier-zero-only.md)                                                                     | `spmvPull` ships the thread-per-row tier only                                                                                                    |
| [2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md](2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md)         | A Fruchterman-Reingold reheat restarts the temperature at 70% of the budget, not the iteration count                                             |
| [2026-09-20-spring-electrical-integrates-like-ngraph.md](2026-09-20-spring-electrical-integrates-like-ngraph.md)                           | The spring-electrical preset integrates like ngraph: semi-implicit Euler with a unit speed clamp                                                 |
| [2026-09-20-spring-electrical-settles-by-the-shared-rule.md](2026-09-20-spring-electrical-settles-by-the-shared-rule.md)                   | The spring-electrical preset settles by the shared rule, not by ngraph's absolute one                                                            |
| [2026-09-20-compact-lands-with-the-frontier-phase.md](2026-09-20-compact-lands-with-the-frontier-phase.md)                                 | `compact` and `dedupe` land with the frontier phase, not with the grid                                                                           |
| [2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md](2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md) | Windowed execution covers `degree` and `segmentedReduce`; the layout and the pull keep their refusal                                             |
| [2026-09-20-sort-scratch-is-model-owned.md](2026-09-20-sort-scratch-is-model-owned.md)                                                     | The grid's sort scratch is model-owned, not a pool lease per batch                                                                               |
| [2026-09-20-scan-has-no-subgroup-variant.md](2026-09-20-scan-has-no-subgroup-variant.md)                                                   | `exclusiveScan` has no subgroup variant                                                                                                          |
| [2026-09-20-far-field-levels-are-a-uniform.md](2026-09-20-far-field-levels-are-a-uniform.md)                                               | The far field's level count is a uniform, not an override                                                                                        |
| [2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md](2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md)                     | The cell histogram is zeroed by a `fill` dispatch, not by `clearBuffer`                                                                          |
| [2026-09-20-workgroup-row-tiers-fold-without-kahan.md](2026-09-20-workgroup-row-tiers-fold-without-kahan.md)                               | The workgroup-per-row tiers fold plainly, without Kahan compensation                                                                             |
| [2026-09-21-m6-bridge-is-a-layout-engine.md](2026-09-21-m6-bridge-is-a-layout-engine.md)                                                   | The accelerated layout is a `LayoutEngine` subclass, not a layout factory                                                                        |
| [2026-09-21-node-mass-is-resolved-per-load.md](2026-09-21-node-mass-is-resolved-per-load.md)                                               | A reader's `nodeMass` record is resolved to an array at every load; `nodeSize` is not offered                                                    |
| [2026-09-21-spring-electrical-fails-loudly-on-set.md](2026-09-21-spring-electrical-fails-loudly-on-set.md)                                 | `spring-electrical` is always offered and fails loudly without an accelerator                                                                    |
| [2026-09-21-power-iteration-family-waits-for-its-ports.md](2026-09-21-power-iteration-family-waits-for-its-ports.md)                       | HITS, eigenvector, Katz and personalized PageRank wait for their CPU ports                                                                       |
| [2026-09-21-acceleration-knobs-and-their-homes.md](2026-09-21-acceleration-knobs-and-their-homes.md)                                       | The two layout knobs live on `behavior.layout`; the threshold keeps one spelling                                                                 |
| [2026-09-21-g12-without-the-nightly-clause.md](2026-09-21-g12-without-the-nightly-clause.md)                                               | G12 is gated on the GPU lane green on master, not on a nightly week                                                                              |
| [2026-09-21-app-stories-draw-the-chip-not-the-gpu.md](2026-09-21-app-stories-draw-the-chip-not-the-gpu.md)                                 | The app's acceleration stories draw the chip from a fixed status; the real GPU is the element's story                                            |
| [2026-09-24-frontier-primitives-are-planners.md](2026-09-24-frontier-primitives-are-planners.md)                                           | `compact` / `dedupe`, `Frontier` and `advance` are planners over a scope, not free functions over a batch                                        |
| [2026-09-24-bfs-claims-instead-of-culling.md](2026-09-24-bfs-claims-instead-of-culling.md)                                                 | BFS dedupes by the atomic claim alone; no hash culling and no ownership pass in the contract                                                     |
| [2026-09-24-advance-is-window-aware.md](2026-09-24-advance-is-window-aware.md)                                                             | `advance` and the BFS kernels execute arc windows; the relax and sweep kernels keep `E_TOO_LARGE`                                                |
| [2026-09-24-frontier-members-conform-to-the-seam.md](2026-09-24-frontier-members-conform-to-the-seam.md)                                   | The four frontier members take the seam's option types; no harmonic / eccentricity; `maxIterations` / `tolerance` refused; `cutoff: NaN` refused |
| [2026-09-24-edge-queue-overflow-is-a-fused-retry.md](2026-09-24-edge-queue-overflow-is-a-fused-retry.md)                                   | An edge-queue overflow is recovered by a fused retry of the level, not a chunked re-dispatch                                                     |
| [2026-09-25-frontier-kernels-dispatch-directly.md](2026-09-25-frontier-kernels-dispatch-directly.md)                                       | The frontier kernels are direct grid-stride dispatches gated by a path word; Dawn's per-indirect-dispatch validation was 97 % of a traversal     |
