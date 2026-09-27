# The choices made while building betweenness on the GPU

Date: 2026-09-27. Scope: `webgpu-graph-algorithms/src/algorithms/betweenness.ts` and its six `bc-*` kernels, which
implement the betweenness half of `design/webgpu/plans/2026-09-23-webgpu-p9-betweenness-and-all-pairs.md`. That plan
was written before the frontier phase settled; each item below is a place where the plan was silent, contradicted
something decided since, or could not pass as written. Every item is reversible by an edit to the driver or a kernel,
except the published-type item, which the owner should confirm before the package is released.

## Decisions

1. **A claim-log entry is one u32, the packed index `s * n + v`.** The plan (PD-6, PD-9) stores a two-word
   `(vertex, source)` pair and budgets 20 bytes per (node, source). Every `n x k` array is one storage binding, so
   `n k < 2^30` and the packed index always fits; a kernel recovers the pair with one `%` and one subtraction. The
   batch therefore holds 16 bytes per (node, source) and `planBatchSize` plans
   `min(floor(maxStorageBufferBindingSize / 4n), floor(0.25 x maxBufferSize / 16n), 64)`, at least 1. Rejected: the
   two-word entry, which doubles the largest array and lowers k for nothing. The plan's point against design 4.7
   (whose 12 bytes forgets the log) still stands; the log costs 4 bytes, not 8.

2. **`bc-finalize` writes no dispatch arguments.** The forward kernels are direct grid-stride dispatches that read
   their level's range from `ends`, as every frontier kernel has since
   `2026-09-25-frontier-kernels-dispatch-directly.md`. The plan's three-way `(x, y)` anti-drift test has nothing left to
   test and is not written. `bc-finalize` also seeds a batch (depth 0 and one path for each source), so it binds five
   buffers rather than three.

3. **The options are the CPU seam's `BetweennessAcceleratorOptions`; the forward-body switch is not public.** The plan
   (P9-T10 Step 3) adds `forward?: "frontier" | "edge" | "auto"` to the published options so tests can pin the body.
   It lives instead on the `@internal` `betweennessWithTuning` seam, the way `bfsWithTuning` carries BFS's direction.
   Rejected: a test knob in a published type, which would have to be supported forever.

4. **`GpuEdgeScoresResult` carries `sourcesUsed` and `sigmaOverflow`** beside design 3.3's `scores` and `precision`.
   Edge scores computed from wrapped path counts are as wrong as vertex scores, and the plan's rule that overflow is
   never silent needs the flag on both results. The extra fields still satisfy the seam's `EdgeScoresResultLike`.
   This is a published type: the owner confirms it before release.

5. **`gridEdges(30, 30)` is not a differential fixture.** Its corner-to-corner shortest-path count is C(58, 29),
   about 3e16, so u32 counts wrap and the scores are wrong by construction; the plan's fixture list could not pass on
   any correct implementation. The suite uses `gridEdges(15, 15)` (C(28, 14), about 4e7) and asserts that
   `gridEdges(30, 30)` raises `sigmaOverflow`.

6. **`k` without `sources` draws with a fixed-seed mulberry32 partial Fisher-Yates in the driver.** The plan names the
   layouts' LCG, which `src/algorithms` may not import under the layer rule.

7. **`bc-edge-gather` is arc-parallel.** Each invocation finds its arc's row by an upper-bound search over `rowPtr`.
   The row-parallel form lost the last arcs of a 1,000-arc hub on llvmpipe, which caps one invocation at 65,535 loop
   iterations over all its loops (a 1,000-arc row times 64 sources passes it). `bc-backward` stays one lane per
   `(vertex, source)` and has the same ceiling for a vertex of degree above 65,535 on llvmpipe only.

8. **Edge scores fold both arcs with `"sum"` and halve on an undirected snapshot.** The plan and the research drafts
   fold with `"first"` and do not halve, reasoning that both arcs of an edge carry the same sum over every source.
   That is true of an exact run only. Over a sample the two arcs differ, because an arc collects the pairs that cross
   the edge in its own direction: on the path 0-1-2 with the one source 2, arc 1->0 holds 1 and arc 0->1 holds 0, and
   `"first"` scored edge {0, 1} as 0. Summing and halving gives the same numbers as `"first"` on an exact run and the
   right ones on a sample. The suite compares sampled edge scores against the reference on the same sources.

9. **Parallel edges are distinct shortest paths.** Each arc adds its source's path count to `sigma`, so two parallel
   edges double the paths through them. The CPU package refuses parallel edges, and with `allowParallelEdges: true`
   collapses them to one neighbour. On edges `[0,1], [0,1], [1,2], [0,3], [3,2]` the GPU scores the vertices
   `[0.667, 0.667, 0.333, 0.333]` and the CPU `[0.5, 0.5, 0.5, 0.5]`. Matching the CPU would need the forward pass to
   deduplicate neighbours per row. Rejected for now: the multigraph count is the standard one for a multigraph, and no
   caller routes a multigraph here yet. The element's routing floor must either keep multigraphs on the CPU or accept
   this difference. Self-loops and directed graphs match the CPU.

10. **The forward-form rule uses the previous batch's maximum depth, not design 8.4's median.** The host has the
    level count (the maximum depth over the batch's sources) and no per-source depths; a median would cost a
    reduction whose only consumer is this choice. The maximum over-estimates depth, so the rule errs toward the
    frontier form. This is the plan's own rule; it departs from the design.

11. **The forward-pass test is smaller than the plan's.** It runs `depthK` and `sigmaK` exactly against the reference
    on four graphs (karate, `gridEdges(15, 15)`, a directed random graph and one with self-loops and parallel arcs) at
    k = 1, k = 2 and the planner's k, in both forward forms, rather than the plan's eight. The plan's separate
    run-twice bitwise check on `depthK`, `sigmaK` and the counters is not written: an exact integer match against the
    reference on every run already implies it. The plan's synthetic batch test with a hand-fed counters buffer is not
    written either; the planner's faked-limits table lives in `test/algorithms/betweenness.test.ts`.

12. **The accelerator's `algorithms.betweenness` defaults are fitted to each graph.** A default `sources` list keeps
    only the indices the graph has, and a default `k` at or above the graph's node count runs every vertex. Applied
    as given, a default meant for large graphs refused every call on a smaller one with `E_INVALID_ARGUMENT`. A
    call's own `sources` or `k` is still checked strictly.

## Two findings about the CPU package

- `betweennessCentrality` and `edgeBetweennessCentrality` in `algorithms/src/algorithms/centrality/betweenness.ts`
  skip a stack entry with `if (!w) continue`, which drops the node whose id is the number 0: karate's vertex 0 scores
  0 instead of 231.07. The GPU's parity test builds the CPU graph with string ids so it compares numbers, not this
  defect. The fix belongs in the CPU package.
- The plan's DEP-P9-F says the CPU "sums both traversal directions into one edge key and then halves". It does not:
  it keys an undirected edge under both orientations (`"a-b"` and `"b-a"`), each halved, so the path 0-1-2 reports
  `0-1 = 1` and `1-0 = 1`. The GPU's halved `"sum"` fold gives 2, which equals the sum of the two CPU keys and
  NetworkX's value. The parity test compares the GPU against that sum.
