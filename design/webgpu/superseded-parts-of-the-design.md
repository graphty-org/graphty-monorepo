# What in the WebGPU design has been superseded

`webgpu-acceleration-plan.md` in this directory is the accepted design for
`@graphty/webgpu-graph-algorithms`, approved on 2026-09-14. Since then, decision records under
`design/decisions/` have reversed fifty-three passages of it. None of those passages were
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
against is not listed. Where an entry says the record named the passage in an amendment, the
record's original list did not reach that far and was completed later; the decision itself is the
one the record always made.

**Line numbers.** The numbers here are for the design as it stands today. The note added at the
top of it on 2026-09-23 pushed the body down by eight lines, so a line number quoted inside a
decision record -- all of which were written earlier -- is eight lower than the line that text
sits on now.

Sections with superseded text, in order: 1.4 (D16), 2.4, 3.3, 4.6, 5.4, 6, 7.3, 7.7, 7.19, 7.20, 8.2,
8.4, 8.8, 8.10, 9.1, 9.4, 9.5, 9.8, 10.4 (targets T-12 and T-13), 12.1, 12.2, 12.3, 12.6, 13 (the
phase table), 14.1 (the risk register), 16.2 and the Review log's applied-findings table.

**Two things here were open and are now decided**, both by
`design/decisions/2026-09-23-what-stands-in-for-the-nightly-lane.md`. Both fell out of one
earlier decision -- the GPU lane lost its nightly cron -- which left a gate nobody could meet and
a measurement with nowhere to run. The nightly is not coming back; neither decision reintroduces
a schedule trigger.

1. **The dead clause in gate G12.** The gate on the final element-polish phase required "nightly
   GPU lane green for a week", and no nightly lane exists. It now asks for the GPU lane green on
   three consecutive runs on master with the benchmark comparison included in each -- three
   different commits rather than one commit judged seven times, and a comparison against the
   pinned baseline rather than a bare pass, because a bare pass let a doubling of PageRank's cost
   through in September while every suite stayed green. Full entry: section 13, row P12, gate G12.
2. **Where the 1M exact-versus-grid comparison runs.** The 1M-node, 200-iteration comparison of
   11.4 is excluded from the default CI lane on time budget and was sent to a nightly benchmark
   job that no longer exists. It now runs as a deliberate dispatch of `gpu.yml` that runs the
   comparison instead of the suites, and it is required by the gate of any phase that changes the
   grid tier, the exact tier or the crossover between them. Between phases nothing measures that
   size; the record says so plainly rather than implying otherwise. Full entries: section 10.4
   target T-12, section 14.1 risk row R-5, and the Review log's row PERF-10.

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

## Section 2.4, the first and last rows of the who-answers table (lines 443 and 448)

**The design says:** the first row answers "Is WebGPU present, is the adapter hardware, is it
worth using?" with "The APP (graphty) at start-up, or a Node script", which probes, creates and
then calls `element.setAccelerator(gpu)`. The last row gives the app the decision whether to
inject a software adapter such as lavapipe or SwiftShader.

**What is true instead:** graphty-element answers both, once the `@graphty/graphty-element/webgpu`
entry point is imported.

**Read the rest of the section anyway.** Every other row of that table is still exactly right, and
together they are the no-silent-degradation rule: the dispatcher choosing the CPU only when no
accelerator was injected, the missing-method branch, an error propagating rather than falling
back, `E_TOO_LARGE` thrown before allocation. The root `CLAUDE.md` cites 2.4 for that rule. This
section is half-live, not dead, which is the worse state -- a reader who is right to trust it for
the rule gets no signal that its first and last rows are gone.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md) (named in its amendment of 2026-09-23, not in its original list)

## Section 3.3, the `bellmanFord` and `closenessCentrality` signatures (lines 809-810)

**The design says:** `bellmanFord` takes `BellmanFordOptions & GpuRunOptions` and
`closenessCentrality` takes `ClosenessOptions & GpuRunOptions`; section 9.2's accelerator
interface (lines 2954-2955) repeats the two names. The design defines neither type.

**What is true instead:** `bellmanFord` takes `SsspOptions` (`cutoff`, `weights`), the same type
as `sssp`, and `closenessCentrality` takes `HitsOptionsLike` (`maxIterations`, `tolerance`,
`weighted`), because those are the types the published seam in `@graphty/algorithms` declares
and the GPU member must be assignable to it. `maxIterations` and `tolerance` are refused with
`E_UNSUPPORTED { option }` when defined, never silently dropped; `weighted` is honoured. The
`breadthFirstSearch` and `sssp` signatures on lines 807-808 stand, with one value decided
against the CPU port: `cutoff: NaN` is `E_INVALID_ARGUMENT { argument: "cutoff" }` on the GPU,
where the CPU port returns the source alone. The result types on lines 830-832 stand.

**Decided by:** [2026-09-24-frontier-members-conform-to-the-seam.md](../decisions/2026-09-24-frontier-members-conform-to-the-seam.md)

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

## Section 4.6, the frontier row of the dispatch-limits table (line 1301) and the paragraph above the table (lines 1176-1180)

**The design says:** the "frontier advance / compaction" row gives "Windowed bindings (arc
ranges): no (v1: `E_TOO_LARGE`)" because the advance "needs the whole `colIdx` bound", and the
paragraph above the table says "the frontier family and sort-based algorithms throw
`E_TOO_LARGE` with `{ path: "windowed", algorithm }` until they are extended". Risk R-9 of
section 14.1 (line 4321) repeats it.

**What is true instead:** `advance-expand`, both `bfs-fused` dispatches, `bfs-bottom-up` and
`sssp-pred` execute a windowed core, one dispatch per window over the window's owned arc range
(`coreWindows`, an exact partition of the overlapping P4 windows), so `breadthFirstSearch` runs
above the binding limit; the row's own note, "window-aware advance lands with P8", is what
happened. `sssp-relax`, `bf-relax` and `closeness-sweep` keep the refusal, so weighted `sssp`,
`bellmanFord` and `closenessCentrality` still throw, and so does `sssp`'s unit-weight route.
One limit remains inside BFS: the reverse view is never windowed (section 4.3), so a DIRECTED
snapshot whose reverse adjacency exceeds one binding is refused with `E_TOO_LARGE { path:
"windowed", algorithm: "breadthFirstSearch" }`; an undirected one runs, because its reverse is
the forward core.

**Decided by:** [2026-09-24-advance-is-window-aware.md](../decisions/2026-09-24-advance-is-window-aware.md)

## Section 5.4, the selector paragraph (lines 1483-1493)

**The design says:** when a round has several candidate pipelines, every candidate is recorded
for every round, one `INDIRECT | STORAGE | COPY_DST` buffer holds one 16-byte slot per (round,
candidate), and the finalize kernel writes real args into exactly one slot per round and
`(0, 0, 1)` into the others, so the unchosen candidates dispatch nothing.

**What is true instead:** the selector still chooses on the device, but it writes the choice
into a `path` word of the counters block, and every candidate kernel is a DIRECT grid-stride
dispatch that reads that word and loops to its count. An indirect dispatch costs about 0.4 ms of
device time under Dawn's validation whether or not it dispatches anything, in Node and Chromium
alike, and seven of them per recorded level were 97 % of a traversal's wall time. The slots are
still written and read back by the selector's tests; nothing dispatches from them. The grid
pyramid's hub dispatch (`indirect-finalize`, once per iteration) is unchanged.

**Decided by:** [2026-09-25-frontier-kernels-dispatch-directly.md](../decisions/2026-09-25-frontier-kernels-dispatch-directly.md)

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

## Section 6, rows 4, 7 and 8, the API spellings of `compact` / `dedupe`, `Frontier` and `advance` (lines 1579, 1583, 1584)

**The design says:** the primitives are free functions over a batch: `compact(batch, flags,
count, out, outCount)`, `dedupe(batch, queue, count, owner, out, outCount)`, `advance(batch,
graph, frontier, functor: { visit, filter }, tiers?)`; `Frontier` carries two four-byte `count`
bindings and `reset(batch, seed: number[])`.

**What is true instead:** each is an async planner over a scope with a synchronous `record`,
the shape every primitive since the design has used: `prepareCompact(scope)` returning
`record` / `recordDedupe` / `recordDedupeIndirect`, `prepareFrontier(scope, n, arcCount,
edgeCapacity?)` returning the `Frontier` and `recordFinalize`, and `prepareAdvance(scope,
core)` returning `record(pass, frontier, level)` over its windows. `Frontier` keeps its name and
its two vertex queues, but its counters are one 24-word block and `reset` takes named words.
`advance` takes no functor: it expands into the edge queue and the claim is a separate kernel.
The rows' "How", cost and oracle cells stand.

**Decided by:** [2026-09-24-frontier-primitives-are-planners.md](../decisions/2026-09-24-frontier-primitives-are-planners.md)

## Section 6, row 7, the overflow rule of the edge frontier (line 1583)

**The design says:** when the unclamped append total exceeds the capacity, `finalizeArgs`
"records `chunkStart` on the device and re-dispatches `expand` for the remaining source range
(one indirect slot per chunk, at most `ceil(A / capacity)` chunks per level, all recorded in the
batch)". Section 8.4 (lines 2670-2675) calls the queue "chunked with the overflow rule of 6 row
7", section 8.10's BFS expand row (line 2851) binds a `chunk` word for it, and design 13 row P8's
gate clause reads "(the chunked overflow rule)".

**What is true instead:** the detection is the design's -- `advance-expand` clamps its writes
and adds the unclamped aggregate into `edgeCountUnclamped`, and `frontier-finalize` compares
that word with the capacity -- but the recovery is a FUSED RETRY: the selector zeroes the
contract slot, sizes the fused-kernel slot from the vertex frontier, and adds one to
`overflowLevels`; the fused kernel claims the whole level from the frontier and the partial edge
queue is never read. There is no `chunkStart` and no `chunk` binding, because the workgroup-
granular reservation does not fill the queue in frontier order, so "the remaining source range"
is not a range. The faked-capacity gate test stands and passes.

**Decided by:** [2026-09-24-edge-queue-overflow-is-a-fused-retry.md](../decisions/2026-09-24-edge-queue-overflow-is-a-fused-retry.md)

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

**The design says:** the trailing comment reads "FR: iteration = floor(0.7 \* iterations)".

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

## Section 8.4, the BFS dedupe sentence (lines 2647-2648), and section 16.2 (lines 5027-5044)

**The design says:** BFS uses "Davidson's ownership dedupe (6 row 4: `atomicStore` in one
dispatch, `atomicLoad` in the next) as the exact safety net behind any workgroup hash culling";
section 8.8 row 4 (line 2801) lists `dedupe` among BFS's primitives; section 8.10's BFS contract
row (line 2852) binds `owner (atomic)`; and section 16.2 has the contract phase switch on the
device between "the existing ownership dedupe" below `n / 8` emitted entries and a bitmap
compaction above it.

**What is true instead:** the BFS contract is one path with no dedupe of any kind: the
`atomicMin` claim on `depth` admits exactly one winner per vertex per level, so the next vertex
frontier is duplicate-free by construction and an ownership pass would remove nothing. No hash
culling runs on the edge queue, `bfs-contract` binds four storage buffers with no `owner`, and
no density threshold exists. `dedupe` ships in this phase for the near-far queue of the weighted
shortest-path driver, which is its one caller. The bitmap and `compact` that this phase does
build serve the direction-optimizing path's unvisited list, not the contraction. The rest of
8.4 stands.

**Decided by:** [2026-09-24-bfs-claims-instead-of-culling.md](../decisions/2026-09-24-bfs-claims-instead-of-culling.md)

## Section 8.4, the BFS host loop (line 2667) and the near-empty SSSP test (line 2689)

**The design says:** "Host loop: 32 levels per submit with indirect args (5.4), one 4-byte
readback", and for the near-far loop "the near-empty test is a device flag turned into a zero
indirect dispatch so extra queued rounds are no-ops".

**What is true instead:** 32 levels (rounds) per submit and one 4-byte readback stand; the
kernels of a level are direct dispatches gated by the block's `path` word, and a queued round
past the end is a no-op because the word is 0 and every count word it would read is 0, not
because a zero-workgroup indirect dispatch runs.

**Decided by:** [2026-09-25-frontier-kernels-dispatch-directly.md](../decisions/2026-09-25-frontier-kernels-dispatch-directly.md)

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

## Section 8.8, row 4, BFS's primitive list (line 2801)

**The design says:** the row lists "`Frontier`, `advance`, `dedupe`, bitset, indirect dispatch"
among what BFS builds on.

**What is true instead:** `dedupe` is not in the list (the entry for section 8.4's dedupe
sentence, above) and neither is indirect dispatch: BFS dispatches directly.

**Decided by:** [2026-09-25-frontier-kernels-dispatch-directly.md](../decisions/2026-09-25-frontier-kernels-dispatch-directly.md)

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

## Section 10.4, target T-12 (line 3425)

**The design says:** T-12 holds the default CI lane to 15 minutes, and does it by excluding the
1M-node, 200-iteration exact-versus-grid comparison of 11.4 from the lane: that run "runs in the
nightly benchmark job".

**What is true instead:** there is no nightly benchmark job. The run is still excluded from the
lane, so it currently happens nowhere, and the largest size the grid tier is designed for goes
unmeasured with nothing failing to say so. Where it should run is open; see the open questions at
the top of this file. The 15-minute lane budget itself is unchanged.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

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

## Section 12.2, two of the cost and security controls (lines 3840-3844)

**The design says:** among the controls applied to the hosted GPU lane are "the nightly run is
skipped when `master` has not moved since the last green GPU run" and, as the reason workflow
permissions can stay read-only, "the nightly tracking-issue job is a SEPARATE `ubuntu-latest` job
with `issues: write`".

**What is true instead:** neither job exists, so neither control is doing anything. Every other
control in that paragraph stands unchanged: the same-repo clause, the `gpu` label, the $50
org-level spending limit, `concurrency: gpu-lane` with `cancel-in-progress`, the 45-minute
timeout, read-only workflow permissions and no secrets in the GPU job.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## Section 12.3, the `gpu.yml` listing (lines 3949-4027)

**The design says:** the workflow is printed in full, and the listing contains
`schedule: [{ cron: "17 6 * * *" }]`, the `changed` job that skips the cron when master has not
moved, and the `gpu-nightly-report` job that opens a tracking issue after two consecutive nightly
failures.

**What is true instead:** all three are gone and the lane is one job. This is the one place in the
design where the dead lane could be copied verbatim, which is why it is worth knowing before
reading the listing rather than after.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

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

## Section 13, the phase table, row P6 (line 4221)

**The design says:** the deliverables cell ends "app: 9.5 `attachAccelerator`", and the row's
outcome column reads "the GPU layout 'detected' in the app".

**What is true instead:** detection, the context request and construction are graphty-element's,
behind the `@graphty/graphty-element/webgpu` import; the app consumes the element like any other
consumer. The rest of the row -- the algorithms, layout and graphty-element deliverables, and the
G6 gate with its fake-accelerator tests -- is unchanged.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md) (named in its amendment of 2026-09-23, not in its original list)

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

## Section 13, the phase table, row P8, the closeness deliverable (line 4268)

**The design says:** the deliverables cell lists "closeness / harmonic / eccentricity", and
section 8.4's closeness paragraph (lines 2695-2698) reduces "(sum, sum of 1/d, max)" per source
on the device.

**What is true instead:** closeness alone. `closeness-reduce` accumulates the distance sum and
the reached count per source and nothing else; no harmonic score, no eccentricity, no source
list and no Wasserman-Faust switch ships, because neither the seam nor the element's capability
list can call them. The score is the legacy default the element already publishes as
`normalization: "none"`: `1 / sumOfDistances`, `0` when nothing is reached. The rest of the
row -- the frontier machinery, BFS in its three forms, SSSP, Bellman-Ford, window-aware
advance, the oracles, the benchmarks -- stands, with the overflow rule and the dedupe read
through the two entries above.

**Decided by:** [2026-09-24-frontier-members-conform-to-the-seam.md](../decisions/2026-09-24-frontier-members-conform-to-the-seam.md)

## Section 13, the phase table, row P12, the deliverables cell (line 4227)

**The design says:** the app gets "`calibrateLayout()` + `createAccelerator` defaults wiring in
the app" and "device-loss UX (toast + the CPU simulation taking over the running layout)".

**What is true instead:** calibration, construction and device-loss recovery are inside
graphty-element; the CPU simulation taking over a running layout is something the element does for
every consumer. What is left for the app is the toast, if it wants one, the real-GPU stories and
the status it renders. The `gpuMinNodes` default measured from 7.21 is still wanted -- it is the
element's setting, and gate G12 is the thing that measures it.

**Decided by:** [2026-09-19-graphty-element-owns-webgpu.md](../decisions/2026-09-19-graphty-element-owns-webgpu.md) (named in its amendment of 2026-09-23, not in its original list)

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

## Section 14.1, risk row R-5 (line 4272)

**The design says:** the mitigation for lavapipe being slow enough to blow the default lane's
budget ends with "the 1M 200-iteration exact-vs-grid run only in the nightly benchmark job".

**What is true instead:** there is no nightly benchmark job, so that part of the mitigation is not
in place and the run happens nowhere; where it should run is open, see the open questions at the
top of this file. R-5's other mitigations -- `gpuScale` fixture scaling, the two-minute per-file
budget, sharding the node project, heavy sizes only in the benchmarks and `node-limits` -- stand.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## Section 14.1, risk row R-6 (line 4273)

**The design says:** among the mitigations for the hosted GPU lane becoming unavailable or drifting
in cost is "nightly skipped on quiet days".

**What is true instead:** there is no nightly to skip; removing it is why the cost risk is smaller
than the row assumes. Every other mitigation in the row stands: the lane in its own workflow so it
can never delay a release or a coverage publish, label and same-repo gating, the spending limit,
fork PRs never reaching it, `machine.dev` as the escape hatch.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## Section 14.1, risk row R-25 (line 4292)

**The design says:** the risk is that a shared-tenant T4 makes benchmark medians vary and "a
nightly that opens tracking issues for noise trains people to ignore it"; one mitigation is "an
issue only after two consecutive nightly failures".

**What is true instead:** no nightly runs and no job opens an issue, so the training-people-to-
ignore-it risk is gone rather than mitigated. The other mitigations stand and are what actually
hold the noise down: medians of 5 runs, the 3x threshold against the T4's own baseline,
`gpu-report.js` recording clocks and utilisation, and the T-table targets measured by hand on the
dev box rather than on the T4.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## The Review log's applied-findings table, row PERF-10 (line 4516)

**The design says:** the row records how finding PERF-10 was closed -- "1M runs only the
one-iteration and unbiasedness checks in the lane; 200-iteration comparison at <= 262k; nightly
for 1M".

**What is true instead:** the first two clauses hold; the third does not, because there is no
nightly. The finding is therefore only partly closed: the 1M 200-iteration comparison has no lane.
Where it runs is open, see the open questions at the top of this file.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## The Review log's applied-findings table, row VERIFY-14 (line 4615)

**The design says:** the row records the change that closed finding VERIFY-14 as a
"`gpu-nightly-report` job with `issues: write` on `ubuntu-latest`".

**What is true instead:** that job was removed with the cron, so the row describes something that
is no longer in the repository.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

## The Review log's applied-findings table, row VERIFY-20 (line 4621)

**The design says:** the row records three changes -- a utilisation sample, a skip on a busy GPU,
and "two nightly failures before an issue".

**What is true instead:** the first two are in place and unchanged; the third is not, because
nothing runs nightly and no job opens an issue.

**Decided by:** [2026-09-19-no-nightly-gpu-lane.md](../decisions/2026-09-19-no-nightly-gpu-lane.md) (named in its amendment of 2026-09-23, not in its original list)

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

## Outside the design: guidance that is narrower than the decision it points at

The root `CLAUDE.md` names design 9.1 as superseded by the ownership decision and does not
mention 9.4, 9.5 or 9.8. The guidance written to warn people about that decision therefore covers
one of the four places it reaches. Nothing here changes that file; it is noted so that a reader
who arrives from `CLAUDE.md` knows the warning is partial.
