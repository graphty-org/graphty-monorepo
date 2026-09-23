# What in the WebGPU design has been superseded

`webgpu-acceleration-plan.md` in this directory is the accepted design for
`@graphty/webgpu-graph-algorithms`, approved on 2026-09-14. Since then, decision records under
`design/decisions/` have reversed about thirty passages of it. None of those passages were
edited: the convention in this repository is that a decision record names the lines it
overrules and the design keeps its original text, because deleting the argument that was
rejected is how a decision gets quietly reversed a year later. `design/decisions/README.md`
sets out that rule and why it is worth its cost.

The cost is that the design reads as current everywhere, and the only way to know a given
sentence is dead is to have read all of the records. This file pays that cost back once. Every
entry below gives the location in the design, what the design says there, what is true instead,
and the record that decided it.

**How to use it.** Find the section number you are reading in the design, look for it here, and
if it is absent the design stands. Entries are in design order and each one is self-contained;
where two entries share a location they cover different clauses of it, so read both. The list
is derived from the records, not from re-reading the design, so a passage nobody decided
against is not listed -- see the last section for the passages that look superseded but that no
record covers.

**Line numbers.** The numbers here are for the design as it stands today. The note added at the
top of it on 2026-09-23 pushed the body down by eight lines, so a line number quoted inside a
decision record -- all of which were written earlier -- is eight lower than the line that text
sits on now.

Sections with superseded text, in order: 1.4 (D16), 2.4\*, 4.6, 6, 7.3, 7.7, 7.19, 7.20, 8.2,
8.8, 8.10, 9.1, 9.4, 9.5, 9.8, 10.4 (T-13), 12.1, 12.2\*, 12.3\*, 12.6, 13 (the phase table).
An asterisk means no record names it; those are in the last section.

**One item needs a decision, not a lookup.** Gate G12 in the phase table requires a nightly GPU
lane to be green for a week, and the nightly lane was removed. The gate cannot be met by
anyone, in any circumstance, as written. It is the entry for section 13, row P12, gate G12.

The design also carries its own Review log (section "Review log", near the end), which records
corrections made before this directory of decision records existed -- the GPU runner that was
actually provisioned, the benchmark baseline path, the lavapipe driver path, and the CI
workflow diff of 12.5. Those are not repeated here; read that log too.

---

## Section 1.4, decision D16 (line 221)

**The design says:** D16 states the runtime-subgroup-size rule for "every subgroup kernel" and
names none, so the rule reads as covering `exclusiveScan` along with the rest.

**What is true instead:** `exclusiveScan` has no subgroup variant at all, so D16's rule does not
apply to it. The rule itself, and the four kernels that do have a subgroup twin, are unchanged.

**Decided by:** [2026-09-20-scan-has-no-subgroup-variant.md](../decisions/2026-09-20-scan-has-no-subgroup-variant.md)

## Section 4.6, the per-row gather row of the dispatch-limits table (line 1298)

**The design says:** the row covers the family "attraction, SpMV, segmented reduce, degree" and
gives all four "Windowed bindings (arc ranges): yes (v1)", meaning all four execute a host loop
of one dispatch per window in the first version.

**What is true instead:** only `degree` and `segmentedReduce` execute windows in v1. The layout
kernels still refuse a windowed core with `E_TOO_LARGE { path: "windowed" }` and `spmvPull`
still refuses with `E_UNSUPPORTED { feature: "spmvPull.windowed" }`. The windowed UPLOAD of
section 4.2 -- per-array buffers, the `ArcWindow` list, the rebase uniform -- is unchanged and
still applies to all four.

**Decided by:** [2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md](../decisions/2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md)

## Section 6, row 3, `segmentedReduce` (line 1578)

**The design says:** the "How" cell ends "Kahan compensation in the workgroup-per-row loop".

**What is true instead:** the workgroup-per-row tier of `segmented-reduce`, `fa2-attraction` and
`spmv-pull` folds plainly in f32, with no compensation term. Accuracy is held by a derived
noise-floor tolerance measured per adapter (11.9, `noiseFloorFor(id)`) rather than by
compensated summation. The tier ranges, the permutation and the value snippet of that row are
unchanged.

**Decided by:** [2026-09-20-workgroup-row-tiers-fold-without-kahan.md](../decisions/2026-09-20-workgroup-row-tiers-fold-without-kahan.md)

## Section 6, row 4, `compact` and `dedupe` (line 1579)

**The design says:** the phase cell reads "P4 (grid hub cells), P7 (WCC), P8", so the two
primitives arrive with the grid work and are used by connected components.

**What is true instead:** the cell is P8 alone. Two records reach that together, and neither
gets there on its own: Afforest connected components needs no `dedupe`, which withdraws P7, and
the grid fills its hub list with an `atomicAdd` append inside kernel G4 instead of a
flag-scan-scatter, which withdraws P4. The primitives themselves are unchanged -- same
signatures, same two-dispatch ownership trick -- only their first consumer moved.

**Decided by:** [2026-09-19-afforest-needs-no-dedupe.md](../decisions/2026-09-19-afforest-needs-no-dedupe.md)
and [2026-09-20-compact-lands-with-the-frontier-phase.md](../decisions/2026-09-20-compact-lands-with-the-frontier-phase.md)

## Section 6, row 9, how `spmvPull` is built (line 1584)

**The design says:** the "How" cell opens "`segmentedReduce` specialised", meaning the pull is a
value snippet composed into the segmented-reduce kernel.

**What is true instead:** `spmv-pull` is its own registry entry with its own WGSL body
(`src/wgsl/spmv-pull.wgsl.ts`, prepared by `prepareSpmvPull`). It copies segmented-reduce's
thread-per-row loop structure rather than composing into it, and `segmented-reduce` keeps its
own five bindings and snippet vocabulary. The rest of the row -- the pull formula, the
pre-scaled `xNorm`, the `perm` slot -- stands.

**Decided by:** [2026-09-19-spmv-pull-is-its-own-kernel.md](../decisions/2026-09-19-spmv-pull-is-its-own-kernel.md)

## Section 6, row 9, which tiers `spmvPull` ships (line 1584)

**The design says:** the row describes the pull as "tiered by IN-degree
(`degreeOrder({ of: "reverse" })`, whose `perm` occupies group 0 slot 3 even when identity)".

**What is true instead:** `spmv-pull` ships one pipeline, `TIER` 0, one thread per row over
`[0, n)`. The `perm` slot is still bound (a dummy when the permutation is the identity) and the
`reverseDegreeOrder` view still uploads, but a caller who passes non-null `tiers` gets
`E_UNSUPPORTED { feature: "spmvPull.tiers" }`. The upper tiers move to the phase that builds the
degree tiers.

**Decided by:** [2026-09-19-spmv-tier-zero-only.md](../decisions/2026-09-19-spmv-tier-zero-only.md)

## Section 6, the subgroup-variants paragraph after the primitive table (lines 1589-1591)

**The design says:** "reduce, scan, segmentedReduce, advance and the FA2 repulsion / near-field
epilogue have a `needs: ["subgroups"]` variant".

**What is true instead:** `scan` is not in that list. `exclusiveScan` is one body -- Hillis-Steele
in workgroup memory, recursive block sums, an add-back pass -- with `needs: []`, no twin and no
`GRAPHTY_GPU_NO_SUBGROUPS=1` test. The other four kernels keep their variants.

**Decided by:** [2026-09-20-scan-has-no-subgroup-variant.md](../decisions/2026-09-20-scan-has-no-subgroup-variant.md)

## Section 7.3, the memory table row "grid tier only: sort scratch" (line 1749)

**The design says:** the ownership cell reads "pool lease per batch".

**What is true instead:** the sort scratch pair (`sortedKey`, `sortedIdx`), the radix histogram
table and the scan's block sums are allocated by the layout model at `load()` and freed at
`dispose()`, beside the pyramid. Nothing in the grid pipeline leases from the pool per batch.
The row's size, usage class and "keys + values ping-pong" note are unchanged; the cost is 16
bytes per node resident on the grid tier.

**Decided by:** [2026-09-20-sort-scratch-is-model-owned.md](../decisions/2026-09-20-sort-scratch-is-model-owned.md)

## Section 7.7, grid kernel G3 (line 1980)

**The design says:** the row begins "after `encoder.clearBuffer(cellHist)` (no dispatch)".

**What is true instead:** `cellHist` is zeroed by a `fill` dispatch over `cells + 2` words,
recorded inside the iteration's compute pass -- after kernel K1 has read the previous
iteration's outside-pseudo-cell count and before the histogram's `atomicAdd`. `CommandBatch`
gains no clear method. The histogram's atomic increment and the `exclusiveScan` over
`cells + 2` entries are unchanged.

**Decided by:** [2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md](../decisions/2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md)

## Section 7.7, grid kernel G6 (line 1985)

**The design says:** the row's last clause reads "loop bounds are compile-time per
`override LEVELS`".

**What is true instead:** `grid-far-field` reads its level count and grid size from the grid
uniform (`P.levels`, `P.gridMax`) and loops over a runtime bound. It declares no `LEVELS`
override, so its override set is `LAW` alone and its compile matrix is one pipeline per law. The
kernel's traversal -- the 3x3 exclusion, the 6x6 block per level, the outside pseudo-cell's term
-- is unchanged.

**Decided by:** [2026-09-20-far-field-levels-are-a-uniform.md](../decisions/2026-09-20-far-field-levels-are-a-uniform.md)

## Section 7.19, the `onReheat` comment in the `ForceModel` interface (line 2331)

**The design says:** the trailing comment reads "FR: iteration = floor(0.7 * iterations)".

**What is true instead:** a Fruchterman-Reingold reheat restarts the TEMPERATURE index at
`floor(0.7 * iterations)` and the iteration BUDGET at 0. The two were one number in the design
and are two now. The hook's signature is unchanged.

**Decided by:** [2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md](../decisions/2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md)

## Section 7.20, the temperature row of the Fruchterman-Reingold table (line 2452)

**The design says:** "`reheat()` sets the iteration to `floor(0.7 * iterations)` so a drag gets
a small temperature".

**What is true instead:** the same 70% fraction, applied to the temperature index only. The
model keeps a `tempOrigin` and `ForceSimulation.reheat()` still zeroes `iterationsDone` for every
model, so a reheated run does not stop when the budget counts out: the temperature reaches 0,
the integrate kernel moves nothing, and the settle window closes the run. The small temperature
after a drag is unchanged, and the CPU Fruchterman-Reingold simulation in `@graphty/layout` still
sets its own iteration counter and stops at the budget.

**Decided by:** [2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md](../decisions/2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md)

## Section 7.20, the spring-electrical integrator (line 2471)

**The design says:** the preset uses "a `velocityVerlet` integrate variant with a 12n velocity
buffer".

**What is true instead:** the preset integrates the way ngraph does, in ngraph's order:
subtract the drag from the accumulated force, add `(timeStep / mass) * F` to the velocity, clamp
the velocity to unit speed, move by `timeStep * v`, skip a pinned node. It is a branch of the
shared integrate kernel (`APPLY = 2`). The velocity buffer, the option names, the defaults and
the force laws of that paragraph are unchanged.

**Decided by:** [2026-09-20-spring-electrical-integrates-like-ngraph.md](../decisions/2026-09-20-spring-electrical-integrates-like-ngraph.md)

## Section 7.20, the spring-electrical settle rule (line 2474)

**The design says:** the preset uses "ngraph's settle rule (total kinetic energy below a
threshold)".

**What is true instead:** the preset settles by the rule every GPU layout shares (7.17):
`meanDisplacement <= settleThreshold * rmsRadius` held for `settleWindow` consecutive
iterations, or the budget spent. Kinetic energy is still computed every iteration and reported
through `SpringElectricalStats.kineticEnergy`, so a caller who wants ngraph's absolute stop can
read the number and stop the loop itself. ngraph's option names and defaults stay.

**Decided by:** [2026-09-20-spring-electrical-settles-by-the-shared-rule.md](../decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md)

## Section 8.2, the `outWeightSum` residency sentence (lines 2616-2617)

**The design says:** "The `outWeightSum` buffer is registered against the snapshot in the
residency so a second PageRank call on the same snapshot reuses it."

**What is true instead:** `outWeightSum` is leased from the call's scratch, filled by one
`segmentedReduce` pass, and released with the lease when the call ends. A second PageRank call
on the same snapshot recomputes it. `GraphResidency.array()` keeps its signature and the
`reverse()` view stays memoised per snapshot.

**Decided by:** [2026-09-19-outweightsum-is-call-scratch.md](../decisions/2026-09-19-outweightsum-is-call-scratch.md)

## Section 8.8, row 1, PageRank's new primitive (line 2797)

**The design says:** the primitive is "`spmvPull` (tiered segmented reduce by in-degree)".

**What is true instead:** `spmvPull` ships the thread-per-row tier only; passing `tiers` returns
`E_UNSUPPORTED`. The in-degree tiers arrive with the phase that builds the degree tiers. Nothing
else in the row changes.

**Decided by:** [2026-09-19-spmv-tier-zero-only.md](../decisions/2026-09-19-spmv-tier-zero-only.md)

## Section 8.8, row 3, connected components' new primitives (line 2799)

**The design says:** the "New primitive it pulls in" cell ends with "`compact`".

**What is true instead:** Afforest connected components uses no `compact`, no `dedupe`, no
`owner` array and no second dispatch to read one back. It is the algorithm of 8.3 and nothing
more: sampled link rounds, pointer-jumping compress, a sample readback for the giant component,
then link rounds over the remaining edges. The edge map with compare-and-swap, the compress and
the histogram sample stay in the cell.

**Decided by:** [2026-09-19-afforest-needs-no-dedupe.md](../decisions/2026-09-19-afforest-needs-no-dedupe.md)

## Section 8.10, the ping-pong sentence (line 2841)

**The design says:** "Ping-pong pairs are one buffer with two bind groups".

**What is true instead:** for PageRank's rank pair, and for the power iterations built on the
same driver (HITS, eigenvector, Katz), it is two buffers -- `rankA` and `rankB`, `n` f32 each --
with every binding a whole buffer at offset 0. Two bind groups as the design wants, two buffers
as it does not. The BFS bitset rows of the same table are not covered by this record. The rest
of 8.10 -- counters and flags sharing one `u32` block, PageRank's scalars sharing `partials` --
is unchanged.

**Decided by:** [2026-09-19-pagerank-ping-pong-is-two-buffers.md](../decisions/2026-09-19-pagerank-ping-pong-is-two-buffers.md)

## Section 9.1, the dependency diagram and the paragraph under it (lines 2878-2907)

**The design says:** the GPU package reaches graphty-element as an "injected object (no
import)"; graphty-element imports nothing new at runtime and gains no devDependency; the app is
the only importer of the GPU package; and a registry mechanism -- self-registration through a
side-effect module -- is explicitly rejected as an inverted dependency with global state.

**What is true instead:** `@graphty/webgpu-graph-algorithms` is an optional peer dependency of
`@graphty/graphty-element`, and the rejected mechanism is the one that shipped. graphty-element
publishes a second entry point, `@graphty/graphty-element/webgpu`, a side-effect module that
statically imports the GPU package and registers an accelerator factory with a registry inside
the element. A consumer writes one import line and no integration code. The core entry still
references the GPU package nowhere, so a consumer who does not install the peer pays nothing and
no bundler resolves it.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md)

## Section 9.4, item 1 (lines 3083-3104)

**The design says:** the element's `accelerator` property is set from outside -- "an accelerator
injected AFTER the layout was set (the app's `attachAccelerator` is async ...)" -- and
`setAccelerator(null)` after a GPU failure is "the user's 'disable acceleration' action, which
the element never takes by itself".

**What is true instead:** graphty-element does the probing, the context request, the
construction, the device-loss recovery and the `gpuMinNodes` policy itself, once the `./webgpu`
entry point is imported. `Graph.setAccelerator()` stays public -- it is how tests inject a fake
accelerator, which gate G6 is defined in terms of, and how a third party could supply a
different implementation -- but it is no longer how acceleration normally arrives. Everything
the item says about what happens WHEN the accelerator changes (the layout re-created through
`createSimulation`, coordinates surviving on the element-owned array, the pin mask re-applied,
algorithm runs reading `graph.accelerator` per call) is unchanged.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md)

## Section 9.5, "The graphty app: detection", in full (lines 3240-3261)

**The design says:** the app owns a `graphty/src/gpu/accelerator.ts` with an
`attachAccelerator(element, prefs)` that imports `probeBrowserWebGpu` and `requestGpuContext`
from the GPU package, applies an `"auto" | "off" | "required"` policy, calls `calibrateLayout`,
constructs the accelerator with `createAccelerator` and hands it to the element, and registers
the `ctx.lost` handler that takes the element off the GPU.

**What is true instead:** none of that lives in the app. Probing, the context request,
construction, the policy and device-loss recovery are all inside graphty-element, behind the
`@graphty/graphty-element/webgpu` import. The app keeps only what is presentation: a Settings
control that writes the element's acceleration policy into its config, and a status chip that
renders the status the element publishes. The measured cost of the design's arrangement was
several engineer-days of integration code that every third-party consumer would have had to
rebuild or never discover, including two parts that are not obvious to rebuild: WebGPU needs a
secure context, so a consumer on plain http gets a silent "off" with no diagnostic, and
`gpuMinNodes` has no defensible default without the measurement harness gate G12 requires.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md)

## Section 9.8, the W2 row of the timeline table (line 3303)

**The design says:** the W2 step gives the graphty app "`attachAccelerator` with
`createAccelerator` / `calibrateLayout` wiring (9.5)", the GPU indicator, the real-GPU stories
and the measured `gpuMinNodes` default.

**What is true instead:** the wiring half of that row belongs to graphty-element. What remains
for the app is the Settings control, the status chip and the stories. The rest of the table --
the W0, A2, L1, E1, W1 and D1 rows -- is unchanged.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md)

## Section 10.4, target T-13 (line 3426)

**The design says:** T-13 ends "a nightly tracking issue is opened only after two consecutive
failures (12.6)".

**What is true instead:** there is no nightly run and no tracking-issue job; the
`gpu-nightly-report` job was removed with the cron. The first half of T-13 stands unchanged: a
tracked median more than 3x its checked-in baseline fails the GPU lane's `bench:compare` step,
and `bench:compare` skips rather than fails when `nvidia-smi` shows the GPU is busy.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)

## Section 12.1, the "Runs" cell of the GPU lane row (line 3795)

**The design says:** the GPU lane runs on "push to `master`, nightly (skipped when `master` has
not moved since the last green run, 12.6), `workflow_dispatch`, and same-repo PRs labelled
`gpu`".

**What is true instead:** push to master, `workflow_dispatch`, and same-repo pull requests
labelled `gpu`. There is no `schedule` trigger, and with it went the `changed` job that existed
only to skip the cron on a quiet master. The workflow is one job, not three. Everything else in
the row -- the adapter policy, and the long argument for why the lane is not a job of `CI` --
stands.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)

## Section 12.1, the cost model (lines 3804-3806)

**The design says:** "a 20-minute nightly is ~$1.04, ~$32 per month, plus the labelled PR runs".

**What is true instead:** the $32 a month of nightly runs is not spent. What remains is a run
per push to master, per dispatch and per labelled pull request. Removing the nightly was the
point of the decision: it re-ran a commit the lane had already judged, and the release gate
already blocks a publish on that commit's result.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)

## Section 12.6, the nightly row of the budget table (line 4174)

**The design says:** a row for "nightly `test-gpu` + `gpu-nightly-report`", 45 minutes, skipped
by the `changed` job on a quiet master, with the report job opening or refreshing a tracking
issue after two consecutive failures.

**What is true instead:** neither job exists. The two rows above it -- the default `ci.yml` test
job and the `test-gpu` job on `gpu.yml` -- are unchanged.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)

## Section 12.6, the drift paragraph (lines 4178-4182)

**The design says:** environment drift is handled because "Playwright bumps change the bundled
Chromium (139 today) -- the nightly GPU lane catches a broken flag set".

**What is true instead:** nothing catches it on a schedule. The decision accepts this
explicitly: drift that arrives without a commit -- a runner image driver update, a Mesa bump, a
Chromium change under code nobody touched -- now surfaces at the next push instead of the next
morning, and will look like that push broke something it did not. It is contained rather than
shipped, because the release gate blocks a publish on the lane's result, and every job still
prints its adapter description first, so the diagnosis is one line of log. Two things reverse
this: master going quiet for a week or more, or the confusion costing more than $32 a month
twice.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)

## Section 13, the phase table, row P4 (line 4219)

**The design says:** the deliverables cell lists `compact` among the phase's primitives.

**What is true instead:** the grid phase builds neither `compact` nor `dedupe`. The hub list is
filled by an `atomicAdd` append inside kernel G4 and turned into indirect dispatch arguments by
the finalize kernel of 5.4; no flag-scan-scatter runs anywhere in the grid pipeline. The rest of
the cell -- `scan`, `histogram`, `radixSort`, the indirect finalize, windowed upload, the grid
kernels, the tier work -- is unchanged.

**Decided by:** [2026-09-20-compact-lands-with-the-frontier-phase.md](../decisions/2026-09-20-compact-lands-with-the-frontier-phase.md)

## Section 13, the phase table, row P5 (line 4220)

**The design says:** `createSpringElectrical` delivers "ngraph's option names and settle rule".

**What is true instead:** ngraph's option names, and the shared settle rule of 7.17. Kinetic
energy is reported, not used to stop. The G5 gate's "settles within 1,000 steps" is measured
under the shared rule, and the comparison against ngraph lets each side stop by its own rule, so
the layouts are compared rather than the stop counters.

**Decided by:** [2026-09-20-spring-electrical-settles-by-the-shared-rule.md](../decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md)

## Section 13, the phase table, row P7, the connected-components deliverable (line 4222)

**The design says:** the deliverables cell lists "Afforest WCC (with the two-dispatch atomic
dedupe)".

**What is true instead:** Afforest with no dedupe of any kind -- no `owner` array and no second
dispatch. Every link is a `atomicCompareExchangeWeak` hook of the larger root onto the smaller,
which makes duplicate queue entries harmless.

**Decided by:** [2026-09-19-afforest-needs-no-dedupe.md](../decisions/2026-09-19-afforest-needs-no-dedupe.md)

## Section 13, the phase table, row P7, the degree-tier deliverable (line 4222)

**The design says:** the deliverables cell lists "`degreeOrder({ of: "reverse" })` tiers".

**What is true instead:** the phase ships `spmvPull` with the thread-per-row tier only. The
`reverseDegreeOrder` view and the `perm` binding slot are complete and in place, so the tier work
has no host-side prerequisite left, but the tiers themselves belong to the phase that builds the
degree tiers.

**Decided by:** [2026-09-19-spmv-tier-zero-only.md](../decisions/2026-09-19-spmv-tier-zero-only.md)

## Section 13, the phase table, row P12, gate G12 -- this gate cannot be satisfied (line 4227)

**The design says:** gate G12, the gate on the final element-polish phase, is "stories green;
nightly GPU lane green for a week; README numbers regenerated from `benchmarks/results/`".

**What is true instead:** there is no nightly GPU lane. `gpu.yml` runs on a push to master, on
`workflow_dispatch`, and on a same-repo pull request labelled `gpu`, and the decision that
removed the cron also removed the `changed` job and the `gpu-nightly-report` job. The middle
clause of G12 therefore cannot be met by anyone, ever, however the work goes -- there is no run
that could be green for a week.

That decision record does not name this gate, so nothing in the repository currently says the
gate is unmeetable. It needs one of two things, and both are the owner's call, not a reader's:
a replacement clause that says what evidence stands in for a week of nightly green -- for
example some number of consecutive green master runs of `gpu.yml`, which is the closest
equivalent the lane still produces -- or a decision that the clause is dropped and G12 is the
other two clauses.

Two related sentences elsewhere lean on the same lane and no record names them either: target
T-12 (line 3425) and risk R-5 (line 4272) both send the 1M-node, 200-iteration exact-vs-grid
comparison to "the nightly benchmark job", and the verification row PERF-10 (line 4516) repeats
it. That run is excluded from the ordinary lane on time budget, so with no nightly it currently
has nowhere to run. Whatever replaces G12's clause should say where it goes.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md)
removed the lane; no record addresses this gate.

---

## Superseded text in the plan documents

The phase plans under `plans/` are records of what was decided at the time, and three of them
carry superseded text that a reader could act on.

**`plans/2026-09-14-webgpu-p0-p3-interfaces.md`, contract 6.8, rule 4 of `bench-compare.js`
(line 4568).** The contract says a result whose `medianMs` exceeds 3x its baseline's `medianMs`
is listed as a regression. The median alone no longer decides it: the minimum has to confirm,
because the median of a shared-tenant run drifts.
Decided by [2026-09-19-bench-compare-min-confirms-median.md](../decisions/2026-09-19-bench-compare-min-confirms-median.md).

**`plans/2026-09-16-graphty-monorepo-integration.md`.** Two cells were overruled after it was
written; the banner at the top of that file names them, and the whole document is otherwise
still the plan of record.

**`plans/2026-09-19-webgpu-m6-graphty-element.md` and
`plans/2026-09-19-webgpu-m7-graphty-app.md`.** Both were retired in full on 2026-09-21 and
re-planned against the version 2 element API. Each carries its own banner, and `README.md` in
this directory marks them superseded.

One record also overrules text outside this directory: the landing-order rows for the A1 step in
`design/graph-format/graph-format-design.md` section 14.6 (lines 4250, 4252, 4253), per
[2026-09-19-a1-lands-inside-m8a.md](../decisions/2026-09-19-a1-lands-inside-m8a.md).

One record overrules nothing anywhere:
[2026-09-19-pagerank-options-shadowing.md](../decisions/2026-09-19-pagerank-options-shadowing.md)
records a fact about the code of `@graphty/algorithms` -- a duplicated `PageRankOptions` that
stays until 2.0 -- so that the next reader who finds the duplicate does not "fix" it. That
accounts for all twenty records.

---

## Superseded in practice, with no record

These passages contradict a decision that was made, but no decision record names them, so they
are not part of the derived list above. They are recorded here as findings, not as decisions.

**Section 2.4, the first row of the who-answers table (line 443), and its last row (line 448).**
The first row says that whether WebGPU is present, whether the adapter is hardware and whether
it is worth using are answered by "The APP (graphty) at start-up, or a Node script", which then
calls `element.setAccelerator(gpu)`; the last row says the app decides whether to inject a
software adapter. graphty-element answers all of that now. The rest of the table is important
and is NOT superseded -- the dispatcher choosing the CPU only when no accelerator was injected,
the missing-method branch, errors propagating rather than falling back, and `E_TOO_LARGE` before
allocation are the no-silent-degradation rule and are still exactly right. The root `CLAUDE.md`
cites this section for that rule.

**Section 13, the phase table, row P6 (line 4221).** The deliverables cell ends "app: 9.5
`attachAccelerator`" and the outcome column reads "the GPU layout 'detected' in the app". Both
describe work the ownership decision moved into the element.

**Section 13, the phase table, row P12 (line 4227), the deliverables cell.** It gives the app
"`calibrateLayout()` + `createAccelerator` defaults wiring" and "device-loss UX (toast + the CPU
simulation taking over the running layout)". Construction and device-loss recovery are the
element's; what is left for the app is the toast, if it wants one.

**Section 12.3, the `gpu.yml` listing (lines 3949-4027).** The workflow is printed in full and
still contains `schedule: [{ cron: "17 6 * * *" }]`, the `changed` cost-guard job and the
`gpu-nightly-report` job. The no-nightly decision describes removing all three and gives the
resulting line count, but its list of superseded sections does not include 12.3, so the listing
reads as current.

**Section 12.2 (lines 3840-3844).** Two of the cost and security controls are the nightly skip
on a quiet master and the separate tracking-issue job with `issues: write`. Neither exists.

**Risk rows R-6 (line 4273) and R-25 (line 4292), and verification rows VERIFY-14 (line 4615)
and VERIFY-20 (line 4621).** Each cites the nightly skip or the two-consecutive-failures
tracking issue as a mitigation or as something to verify.

The root `CLAUDE.md` names section 9.1 as superseded by the ownership decision and does not
mention 9.4, 9.5 or 9.8, so the guidance that exists to warn people is narrower than the
decision it points at.
