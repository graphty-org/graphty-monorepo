# Which algorithms earn the GPU, and from what size

Date: 2026-09-26
Decided by: the owner, who asked for the math instead of a guess, on the strength of two
independently built cost models reconciled against every GPU row this repository has measured
Changes: `design/webgpu/webgpu-acceleration-plan.md` sections 8.4, 8.5, 8.6, 8.7, 8.8 (the
priority order), 10.4 target T-15, 13 row P11 and one row of 17. None of those passages is
edited; this record supersedes them and
`design/webgpu/superseded-parts-of-the-design.md` indexes each one. The two phase plans it
reaches, `design/webgpu/plans/2026-09-23-webgpu-p9-betweenness-and-all-pairs.md` and
`design/webgpu/plans/2026-09-23-webgpu-p11-structure-and-community.md`, carry a dated banner and
a one-line note at each task this record drops or demotes.

## The decision

The design scheduled every graph algorithm it could name for the GPU and ranked them by a score
of demand and reuse (section 8.8). It never asked, per algorithm, whether the GPU call would be
faster than the CPU call a consumer actually has, at the sizes a browser holds. This record asks
that, from measurements, and answers it in three classes:

- **earns**: at least 3x faster than the CPU at 100,000 nodes or below in Chromium, and never
  slower at a size where the CPU call is long enough to notice;
- **marginal**: wins only above a million nodes, or by less than 3x;
- **does not earn**: the CPU wins at every size a browser holds, or the fixed cost of talking to
  the device dominates the call.

"The CPU" means one JavaScript thread of `@graphty/algorithms`. Where the shipped implementation
is the legacy Map-of-Maps code, the comparison is against an indexed typed-array port of it,
because that port is 10-100x faster per arc than the shipped code and is what the package will
have once the port lands; measuring the GPU against code that is 30x slower than it needs to be
would credit the GPU with a speedup that belongs to the port.

### The table

Crossover is the smallest node count at which the GPU call is no slower than the CPU call, in
Chromium on the reference card (an RTX 4070 SUPER), with the graph already resident on the
device. Speedups are CPU time divided by GPU time at 10k / 100k / 1M nodes, every graph with ten
undirected edges per node. Square brackets give the pessimistic figure where a constant is not
measured (the next section says which). The Tesla T4 column is the CI lane's class of card and
is a recorded figure, not a contract.

Each CPU-derived column appears twice. The first copy was computed from the loaded medians
of the first CPU run (5 runs, 3 at 1M, at load average 8-22) and is what this record was
decided on. The second, "minimum of N", is the same arithmetic on the minimum over every
individual run of both CPU passes (N = 14 at 1k-100k, 6-8 at 1M, 3 for the rows over a
minute, 1-2 where marked in the measurement file); interference only ever adds time, so the
minimum is the better estimate of the uninterfered CPU cost and is the figure to use. A
"minimum of N" cell is filled wherever any figure in the row moved by more than 10 percent.
The provenance section says why the minimum is still not a floor on this box.

| algorithm                                        | crossover, Chromium (T4), loaded median | crossover, minimum of N       | speedup 4070, 10k / 100k / 1M, loaded median                                              | speedup 4070, minimum of N                                                                  | speedup T4, 10k / 100k / 1M, loaded median | speedup T4, minimum of N     | class                                                                                       |
| ------------------------------------------------ | --------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------- |
| PageRank, converged                              | 19k (40k)                               | 29k (50k)                     | 0.64x / 3.1x / 65x                                                                        | 0.39x / 3.0x / 38x                                                                          | 0.38x / 1.8x / 19x                         | 0.24x / 1.7x / 11x           | earns above 29k, and only just: 3.02x at 100k; marginal on a T4                             |
| PageRank, 100 iterations                         | 12k (19k)                               | 13k (21k)                     | 0.86x / 8.5x / 133x                                                                       | 0.80x / 8.1x / 100x                                                                         | 0.53x / 4.9x / 27x                         | 0.49x / 4.6x / 20x           | earns                                                                                       |
| eigenvector, Katz (100 it.) vs a port            | 6.0k (10k)                              | 6.6k (10k)                    | 1.7x / 16x / 188x                                                                         | 1.6x / 15x / 142x                                                                           | 1.0x / 8.4x / 24x                          | 0.95x / 8.0x / 18x           | earns                                                                                       |
| HITS (100 it.) vs a port                         | 3.6k (6.0k)                             | 4.0k (6.6k)                   | 3.0x / 24x / 218x                                                                         | 2.7x / 23x / 164x                                                                           | 1.7x / 12x / 24x                           | 1.6x / 11x / 18x             | earns                                                                                       |
| connected components (Afforest)                  | 72k (138k)                              | 132k (229k)                   | 0.22x / 1.3x / 6.1x                                                                       | 0.09x / 0.77x / 5.7x                                                                        | 0.14x / 0.77x / 3.3x                       | 0.05x / 0.46x / 3.0x         | does not earn in Chromium below ~130k and is marginal above; in Node 1.9x at 100k, 3x from 166k |
| BFS, single source                               | 151k (400k)                             | 191k (501k)                   | 0.03x / 0.69x / 3.2x                                                                      | 0.03x / 0.50x / 3.1x                                                                        | 0.01x / 0.33x / 1.4x                       | 0.01x / 0.24x / 1.4x         | marginal; does not earn on high-diameter graphs                                             |
| SSSP, near-far                                   | 69k (190k)                              | 79k (229k)                    | 0.11x / 1.4x / 6.7x                                                                       | 0.11x / 1.2x / 5.7x                                                                         | 0.05x / 0.62x / 2.9x                       | 0.05x / 0.55x / 2.4x         | marginal (3x from ~350k)                                                                    |
| Bellman-Ford vs indexed Dijkstra                 | 55k [72k] (110k [290k])                 | 58k [83k] (132k [398k])       | 0.11x / 2.0x / 13x [0.11x / 1.3x / 4.7x]                                                  | 0.11x / 1.8x / 11x [0.10x / 1.1x / 4.0x]                                                    | 0.05x / 0.93x / 1.9x                       | 0.05x / 0.82x / 1.6x         | earns for negative weights only; marginal as an SSSP                                        |
| closeness, 100 sampled sources                   | ~100 (~300)                             | ~5.8k (11k)                   | 1.9x / 38x / 71x                                                                          | 1.8x / 27x / 69x                                                                            | ~1x / 15x / 28x                            | ~0.9x / 13x / 29x            | earns, as a sampled algorithm                                                               |
| closeness, exact, every source                   | ~100-250 (~320-400)                     | ~1.0k-2.8k (4.6k-5.0k)        | vs a port 4.4x / 80x / 101x [3.6x / 32x / 101x]                                           | vs a port 4.4x / 58x / 99x [3.6x / 23x / 99x]                                               | 2.4x / 38x / 41x                           | 2.4x / 27x / 40x             | earns per unit of work; unusable above ~30k (see text)                                      |
| betweenness, 100 sampled sources                 | 1.5k [2.3k] (3.0k [9.5k])               | 1.6k [2.8k] (3.5k [30k])      | 7.0x / 13.7x / 8.1x [2.5x / 3.2x / 8.1x]                                                  | 5.2x / 13.1x / 7.8x [1.9x / 3.1x / 7.8x]                                                    | 3.1x / 5.7x / 3.2x                         | 2.3x / 5.4x / 3.1x           | earns; the pessimistic bracket sits on the 3x line at 100k (3.06x)                          |
| all-pairs shortest paths, blocked Floyd-Warshall | ~50 vs legacy, ~130 vs a port           | unchanged                     | n = 1,000: 2,500x vs legacy, 89x vs a port; n = 5,792: 11,300x / 290x                     | unchanged (2,420x and 10,500x vs legacy, within 10 percent)                                 | n = 5,792: 124x vs a port                  | unchanged                    | earns inside the binding bound; cannot address 100k                                         |
| k-core vs a port                                 | 132k (380k)                             | 209k (501k)                   | 0.15x / 0.82x / 4.0x                                                                      | 0.06x / 0.49x / 3.7x                                                                        | 0.07x / 0.37x / 1.8x                       | 0.03x / 0.22x / 1.7x         | marginal; earns only against the unported code                                              |
| triangle count, clustering coefficient           | 3.0k (4.8k)                             | 6.6k (15k)                    | 7.2x / 12.7x / 26x [4.4x / 3.0x / 4.1x]                                                   | 1.6x / 9.7x / 23x [0.94x / 2.3x / 3.6x]                                                     | 3.2x / 5.4x / 9.9x                         | 0.69x / 4.1x / 8.8x          | earns at 100k on the assumed merge rate, unverified; the bracket earns at no browser size   |
| k-truss, support recomputed per round            | 4.2k at 10 rounds                       | 13k at 10 rounds              | 10 rounds 4.0x / 4.8x / 7.8x; 30 rounds 1.5x / 1.8x / 2.9x; 50 rounds 0.91x / 1.1x / 1.8x | 10 rounds 0.85x / 3.7x / 6.9x; 30 rounds 0.32x / 1.4x / 2.5x; 50 rounds 0.20x / 0.83x / 1.6x | 10 rounds 2.1x / 2.0x / 2.8x               | 10 rounds 0.44x / 1.5x / 2.5x | marginal; the round count is unbounded                                                      |
| label propagation (100 passes) vs a port         | 2.3k (4.0k)                             | 2.5k (4.2k)                   | 4.4x / 21x / 97x [3.0x / 6.8x / 24x]                                                      | 4.0x / 20x / 73x [2.7x / 6.5x / 18x]                                                        | 2.4x / 8.8x / 36x                          | 2.2x / 8.4x / 27x            | earns, if the changed-count readback is batched                                             |
| Louvain (Leiden and ECG inherit it) vs a port    | 33k (72k); never on the bound           | 38k (79k); never on the bound | 0.31x / 2.5x / 18x [0.29x / 1.8x / 10x; bound 0.09x / 0.16x / 0.62x]                      | 0.26x / 2.3x / 15x [0.25x / 1.7x / 8.4x; bound 0.08x / 0.15x / 0.51x]                       | 0.18x / 1.25x / 7.1x                       | 0.15x / 1.2x / 5.9x          | marginal                                                                                    |
| minimum spanning tree, Boruvka vs Kruskal        | 6.0k (11k)                              | 11k (21k)                     | 1.8x / 10.4x / 43x [1.7x / 8.0x / 18x]                                                    | 0.93x / 7.6x / 43x [0.91x / 5.8x / 18x]                                                     | 0.95x / 5.3x / 7.3x                        | 0.50x / 3.9x / 7.3x          | earns (3x from 38k); loses at 10k                                                            |

"vs a port" rows also have a "vs shipped" figure, which is much larger and is not the GPU's to
claim: against the shipped legacy code Katz is 20x / 434x / 7,538x, HITS 27x / 721x / 2,085x,
label propagation 31x / 337x / 508x and Louvain 5.3x / 47x / 294x on the minima (23x / 507x /
7,538x, 32x / 980x / 2,835x, 35x / 400x / 603x and 6.2x / 50x / 357x on the loaded medians),
and 17-31x of each of those gaps at 100k belongs to the missing CPU port (Louvain's 20x is
assumed, not measured).

### How the table was computed

Every GPU figure is a sum of five terms, each measured on this repository's own benchmarks or
derived from one by arithmetic shown in the model note:

- a per-call floor (0.5 ms for the SpMV family; 6.9 ms in Node for a traversal, from the
  resident karate / 1k / 10k BFS rows of 7.2 / 6.9 / 7.8 ms; the 9 ms Chromium traversal floor is
  ASSUMED, because no post-direct Chromium traversal row exists -- the empirical model brackets
  the whole Chromium floor, syncs included, at 12.9-17 ms);
- one host-device round trip per synchronisation point: 0.10 ms in Node, 2.0 ms in Chromium
  (one measurement inside a real Chromium traversal, cross-checked against the 2.5 ms WGLog
  reports, https://arxiv.org/html/2607.17571v1);
- one dispatch: 1 us in Node, 10 us in Chromium;
- the kernel: a measured per-arc rate for the kernel family (SpMV pull 0.033 ns/arc; the
  coalesced edge gather 0.045-0.074 ns/arc; the atomic scatter of the connected-components link
  kernel 0.34 ns/arc; the BFS traversal 0.5 ns/arc at 100k and 2.67 ns/arc at 1M) times the
  arcs it touches times the rounds it runs (round counts were counted on the benchmark graphs,
  not taken from bounds: Boruvka 6 / 7 / 8, Bellman-Ford 18 / 25 / 28, k-core peel 35 / 46 / 67);
- the readback: 2.65 ms per MiB in Chromium, 0.15 in Node.

Two worked rows show the shape. Betweenness at 100k nodes with 100 sampled sources in Chromium:
kernel = 100 sources x 2 passes x 2M arcs x 0.5 ns = 200 ms, plus floor 9 ms, plus round
boundaries 4 batches x 2 x 5 levels x 0.23 ms = 9.2 ms, plus syncs 9 x 2 ms = 18 ms, plus 132
dispatches x 10 us = 1.3 ms, plus readback 1 ms = 238 ms against the CPU's 3,119 ms (the
minimum of 14 runs; the loaded median was 3,272 ms): 13.1x (13.7x). At the pessimistic
traversal rate of 2.45 ns/arc the kernel is 980 ms and the whole call 1.02 s: 3.1x (3.2x).
Minimum spanning tree at 100k in Chromium: floor 6.2 ms + 8 syncs x 2 ms + 7 rounds x
(0.23 ms + 2 x 2M arcs x 0.045 ns) = 2.9 ms + readback 1.0 ms = 26 ms against Kruskal's 201 ms
(minimum of 14; loaded median 276 ms): 7.6x (10.4x).

The model was checked against the rows that ARE measured before it was trusted on the rows
that are not: resident BFS at 10k / 100k / 1M is modelled at 8.12 / 9.33 / 63.0 ms against
7.8 / 9.2 / 61.7 measured; SSSP at 10.2 / 25.6 / 136 ms against 8.7 / 24.3 / 133; PageRank for
100 iterations at 100k / 1M at 12.9 / 72.8 ms against 10.4 resident / 70-82 derived; the
1000 x 1000 grid BFS at 425 ms against 427 measured. Every reconciled figure is within 1.3x of
its measured row except the 10k SpMV row in Node (1.9x, because the Node round trip at the
working clock is 0.041 ms, not the 0.10 ms the model charges; Chromium is unaffected). Three of
those agreements are partly by construction: the 100k and 1M traversal rates were solved from
the 100k and 1M BFS rows, the SSSP rates from the SSSP rows and the per-level floor from the
grid row. The independent checks are the 10k BFS row (which is what fixes the 7 ms floor) and
the PageRank rows (whose SpMV fit came from the upload-subtracted benchmark rows, not from the
resident measurement).

Five constants have no measurement and are carried as brackets: the traversal rate at 100k
(0.5 ns/arc from a 1.0 ms residual of a 9.2 ms row, so 2.45 ns/arc is the pessimistic end);
the atomic scatter rate for a relax, a decrement or a per-component minimum (the gather rate,
or the connected-components link rate 0.34 ns/arc); the sorted-merge step rate for triangles
(0.30 ns assumed; 1.9 ns is the rate at which the 100k row stops earning on the CPU minima,
2.7 ns on the loaded medians); the per-row group-by rate
for label propagation and Louvain (0.30 ns assumed; 1.3 ns/arc is the nu-LPA rate on an A100,
https://arxiv.org/abs/2411.11468, discounted by the 4x bandwidth ratio to this card; the
cuGraph-derived 400 ns/arc whole-call ceiling is carried for Louvain alone,
https://docs.nvidia.com/cugraph/latest/nx_cugraph/benchmarks/); and the k-truss round count
(10, 30 and 50).

## What this drops, what it demotes, and what it keeps

Numbers are Chromium on the RTX 4070 SUPER unless stated.

### Dropped from the GPU roadmap

1. **Exact all-source closeness above roughly 30,000 nodes.** The GPU call is 17-42 s at 100k
   and 47 minutes at 1M (31,250 batches of 32 sources x 1.64 x 20M arcs x 2.67 ns = 2,737 s of
   kernel before a single sync). Per unit of work the GPU is 32-101x faster than the CPU, and it
   does not matter: nobody waits 47 minutes in a browser. Sampled closeness -- 100 sources in
   35 ms at 100k and 0.4 s at 1M, 27-69x over 100 CPU traversals (38-71x on the loaded
   medians) -- is the usable form and is
   to be the default above that size. Note that the seam's `closenessCentrality` takes no
   `sources` or `k` option today (the frontier plan's departure DEP-P8-F dropped them because
   the seam did not carry them); adding one is a change to a published interface of
   `@graphty/algorithms` and is the owner's call, not this record's. Until it exists, the
   element must not route all-source closeness to the GPU above ~30k.
2. **k-truss with the support recomputed every peeling round** (the P11 plan's decision
   PD-11). 3.7x at 10 rounds, 1.4x at 30, 0.83x at 50 at 100k on the CPU minima (4.8x / 1.8x /
   1.1x on the loaded medians), 0.85x at 10k even at 10 rounds, and the round count is unbounded
   (the plan's own risk RP-6 says so). Reinstate only with incremental support maintenance,
   at which point it inherits the triangle row.
3. **Girvan-Newman on the GPU.** One edge-betweenness call per removed edge: 1M edges x 0.24 s
   per 100-source call at 100k = 66 hours whatever the per-call speedup, and that is a floor:
   Girvan-Newman needs exact edge betweenness, not 100 sampled sources.
4. **The single-query algorithms of section 17** (A-star, bidirectional Dijkstra, DFS,
   topological order, Prim, max flow, hierarchical clustering): a 9-15 ms Chromium floor against
   CPU calls of microseconds to a few milliseconds. Section 17 already keeps them on the CPU;
   this record confirms it with a number.

### Demoted: behind a CPU port and a primitive measurement, or to a size gate

5. **Louvain, Leiden and ECG.** 2.3x at 100k and 0.26x at 10k against a typed-array port on the
   optimistic model (2.5x and 0.31x on the loaded medians); 0.15x on the cuGraph-derived bound; and the port alone is 20x over the
   shipped code. The 6.0 estimated days of the P11 plan's two Louvain tasks wait for the port
   and for a measured per-row group-by rate. Leiden adds a refinement pass per level and ECG
   multiplies the whole thing by its ensemble size; both inherit the class.
6. **k-core.** 0.49x at 100k against an indexed port (46 peel rounds x 0.23 ms = 10.6 ms of a
   28 ms call; 0.82x on the loaded medians), 1.9-3.7x at 1M; the port is 25-30x over the
   shipped code on its own. Port first.
7. **BFS as a routed single-source call.** 0.03x / 0.50x / 3.1x (0.69x at 100k on the loaded
   median); 3x only near 950k; on the 1000 x 1000 grid the CPU is 7.4x (Node) to 12x (Chromium)
   faster (57 ms against 425 / 684 ms; the 57 ms is the 1M random-graph CPU rate of 14.3 ns/arc
   applied to the grid's 4M arcs, not a measured grid row, and the Chromium 684 ms is modelled --
   only the Node 427 ms is measured).
   It stays as the primitive under betweenness and closeness, where its 7-9 ms floor is paid
   once per hundred traversals.
8. **SSSP near-far.** 0.11x / 1.2x / 5.7x (1.4x / 6.7x on the loaded medians); 3x from ~350k.
9. **Bellman-Ford as a general shortest-path.** 1.1-1.8x at 100k against Dijkstra (1.3-2.0x on
   the loaded medians). Keep it for negative weights only, where it is 26-41x over the shipped
   legacy code at 100k (30-48x). It also needs
   a round cap: the design's `n - 1` worst case is 125,000 syncs = 250 s at 1M in Chromium, so
   above the cap the call refuses rather than runs; what the caller does then is the caller's
   choice, never a silent CPU finish.
10. **Connected components in Chromium.** 0.77x at 100k on the CPU minimum (1.3x on the loaded
    median), because 5 syncs x 2 ms = 10 ms of an 18 ms call against a CPU call of 13.9 ms.
    Already built and kept, routed to the GPU only above 132k (52k in Node; the loaded medians
    said 72k and 23k). The fix is the sync count (2 syncs would give 1.2x; 1.9x on the loaded
    median), not the kernel (0.7 ms), and even then it does not reach 3x below ~440k.
11. **Katz and HITS.** The GPU earns (15-23x at 100k against a port), but roughly 30x of the
    shipped gap at 100k belongs to the CPU port. Port them regardless of the GPU, which is what
    `2026-09-21-power-iteration-family-waits-for-its-ports.md` already decided.

### Kept, in the order the numbers put them

After the frontier phase lands, on the CPU minima (loaded-median figures in parentheses):
sampled betweenness (crossover 1.6k, 3.1-13x at 100k, 7.8x at 1M; the strongest unbuilt row
after all-pairs); all-pairs shortest paths (three orders of magnitude inside the binding bound,
buildable today, refuses above the bound); minimum spanning tree (crossover 11k (6k), 7.6x
(10.4x) at 100k, below 1x at 10k, buildable on master today); triangle counting with the
clustering coefficient (crossover 6.6k (3k), 9.7x (12.7x) at 100k, provided the merge step
measures at or under 1.9 ns (2.7 ns)); label propagation (crossover 2.5k at 8 passes per
readback, 20x at 100k); Bellman-Ford for negative weights (crossover 3.3k (2.1k), with a round
cap). Then, after their ports and their primitive measurements: k-core and Louvain.

Two constants the plans do not name are load-bearing and must exist: a
`LABEL_PROP_PASSES_PER_SUBMIT` of at least 8 (at one readback per pass Chromium pays 101 x 2 ms
= 202 ms and the 10k call is 0.79x), and a rounds-per-submit constant for Boruvka (4 rounds per
submit moves the crossover from 11k to 7.2k and the 100k speedup from 7.6x to 12x; on the
loaded medians, from 6.0k to 4.6k and from 10.4x to 17x).

## The routing floors the element will need

graphty-element decides where a call runs (design 9.4 and
`2026-09-19-graphty-element-owns-webgpu.md`) and today it has one threshold for everything,
`acceleration.minNodes` (`2026-09-21-acceleration-knobs-and-their-homes.md`). The numbers below
are per algorithm, because the crossovers span three orders of magnitude and one threshold
cannot serve both PageRank (29k) and betweenness (1.6k). How the element grows a per-algorithm
floor is element work; the numbers are this record's. Each is the Chromium crossover on the
RTX 4070 SUPER; the T4 figure follows, and a T4-class card wants 2-3x higher thresholds. Below
the floor the CPU is faster, and in most rows the call is short enough not to matter. As in
the table above, each figure is given from the loaded medians of the first CPU run and then,
"minimum of N", from the minimum over both CPU passes; the minimum is the figure to ship on.

| algorithm                                 | route above (Chromium, 4070), loaded median                                                                                                                       | route above, minimum of N                                                                                                                          | (T4), loaded median | (T4), minimum of N | 3x point (Chromium, 4070), loaded median | 3x point, minimum of N  | state                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------ | ---------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| PageRank, converged                       | 19k                                                                                                                                                               | 29k                                                                                                                                                | 40k                 | 50k                | 95k                                      | 100k                    | built                                                         |
| PageRank, fixed iterations / personalized | 12k                                                                                                                                                               | 13k                                                                                                                                                | 19k                 | 21k                | 35k                                      | 38k                     | built                                                         |
| eigenvector, Katz                         | 6k                                                                                                                                                                | 6.6k                                                                                                                                               | 10k                 | 10k                | 18k                                      | 19k                     | built; against a port                                         |
| HITS                                      | 3.6k                                                                                                                                                              | 4.0k                                                                                                                                               | 6k                  | 6.6k               | 10k                                      | 11k                     | built; against a port                                         |
| connected components                      | 72k                                                                                                                                                               | 132k                                                                                                                                               | 138k                | 229k               | 302k                                     | 437k                    | built; 23k in Node on the medians, 52k on the minima          |
| betweenness, sampled                      | 1.5k (2.3k pessimistic)                                                                                                                                           | 1.6k (2.8k pessimistic)                                                                                                                            | 3.0k                | 3.5k               | 4.2k (33k pessimistic)                   | 5.0k (83k pessimistic)  | unbuilt                                                       |
| closeness, sampled                        | ~100                                                                                                                                                              | ~5.8k                                                                                                                                              | ~300                | 11k                | ~1k                                      | 16k                     | unbuilt at scale; needs a `sources` option; sample by default |
| closeness, exact, every source            | ~100-250, and NOT above ~30k                                                                                                                                      | ~1.0k-2.8k, and NOT above ~30k                                                                                                                     | ~320-400            | 4.6k-5.0k          | --                                       | --                      | on the frontier branch                                        |
| all-pairs shortest paths                  | every n <= 5,792 at the 128 MiB default binding (23,170 with a 2 GiB binding)                                                                                     | unchanged                                                                                                                                          | same                | same               | ~130                                     | unchanged               | unbuilt; refuse above the bound                               |
| triangle count, clustering coefficient    | 3.0k                                                                                                                                                              | 6.6k                                                                                                                                               | 4.8k                | 15k                | 6.0k                                     | 21k                     | unbuilt; earns if the merge step is <= 1.9 ns (2.7 ns on the medians) |
| minimum spanning tree                     | 6.0k (4.6k with 4 rounds per submit)                                                                                                                              | 11k (7.2k with 4 rounds per submit)                                                                                                                | 11k                 | 21k                | 19k (11k batched)                        | 38k (22k batched)       | unbuilt; buildable on master today                            |
| label propagation                         | 2.3k at 8 passes per readback (12k at 1)                                                                                                                          | 2.5k at 8 passes per readback (13k at 1)                                                                                                           | 4.0k                | 4.2k               | 6.9k-10k                                 | 7.6k-12k                | unbuilt; needs the cadence constant                           |
| Bellman-Ford, negative weights            | 2.1k                                                                                                                                                              | 3.3k                                                                                                                                               | 3.8k                | 6.3k               | 5.0k                                     | 8.3k                    | unbuilt; needs a round cap                                    |
| BFS, single source                        | 151k (316k against the low-load CPU row), and only when levels <= arcs / 14,000 (0.2 ms per level against 14 ns per CPU arc: 1,430 levels at 20M arcs, 140 at 2M) | 191k (316k against the low-load CPU row, which is unchanged), same levels rule                                                                     | 400k                | 501k               | ~900k                                    | ~955k                   | on the frontier branch                                        |
| SSSP, near-far                            | 69k (182k low-load)                                                                                                                                               | 79k (182k low-load, unchanged)                                                                                                                     | 190k                | 229k               | 275k                                     | 347k                    | on the frontier branch                                        |
| k-core                                    | 132k against a port (8k against the shipped code)                                                                                                                 | 209k against a port (9.1k against the shipped code)                                                                                                | 380k                | 501k               | 575k                                     | 724k                    | unbuilt; port first                                           |
| Louvain                                   | 33k against a port on the optimistic model; no floor exists on the bound                                                                                          | 38k against a port on the optimistic model; no floor exists on the bound                                                                           | 72k                 | 79k                | 120k                                     | 132k                    | unbuilt; not a threshold to ship on                           |

The BFS floor has two parts because the per-level cost is what kills it: a level costs 0.2 ms on
the device however small the frontier is, and a road network or a grid has thousands of levels.

## What in the design this overrules, and how

- **8.4, Bellman-Ford (lines 2690-2693).** The design runs it as an edge-parallel relax for
  `n - 1` rounds with a changed flag every 8, and 8.8 row 6 schedules it beside near-far SSSP as
  a general shortest-path. It is a negative-weights algorithm only, with a round cap above which
  the call refuses. Against Dijkstra, the code a consumer with non-negative weights runs, it is
  under 3x at 100k on either relax rate.
- **8.4, closeness (lines 2695-2698).** The design describes the all-source form and nothing
  else. Above roughly 30k nodes the only usable form is sampled, and sampling needs an option the
  seam does not carry. The batched multi-source machinery itself is right and stays.
- **8.4, the betweenness cost model (lines 2724-2732)** is NOT overruled: its "0.5-2 s for 256
  sampled sources at 100k / 1M" comes out at 0.58 s on the measured traversal rate and 2.6 s on
  the pessimistic one, both inside T-11's 5 s, against a CPU of 8.0 s (8.4 s on the loaded
  median).
- **8.5 (lines 2736-2750).** k-core is demoted behind its CPU port; k-truss with support
  recomputed per round is dropped; triangle counting stands but is unverified until the merge
  step is timed; the Boruvka description stands and gains a rounds-per-submit constant.
- **8.6, label propagation (lines 2754-2760).** "Changed-count reduce every k" stands, and k is
  now a named constant of at least 8; at k = 1 the Chromium call loses at 10k.
- **8.6, Louvain's expectation (lines 2773-2778).** "2-10x over the CPU at 1M edges" is
  overruled: 2.3x at 100k against a typed-array port on the optimistic model, 0.26x at 10k (2.5x
  and 0.31x on the loaded medians), and a loss at every size on the cuGraph-derived bound. The design's citation of nu-Louvain at
  1.03x over a 64-thread CPU cannot be converted to a single-thread figure without the paper's
  absolute throughput, which no note records. Louvain, Leiden and ECG are demoted. The rest of
  8.6 -- the move pass, the recomputed cluster weights, contraction on the device, no CPU handoff
  inside the package -- stands for whenever the row is built.
- **8.7, the windowed rows (lines 2789-2790).** Above the binding bound the rows are not
  windowed; the call refuses with `E_TOO_LARGE` and both numbers in the message, as the P9 plan's
  departure DEP-P9-A already argued and design 13 row P9's gate already asks. The GPU cannot
  address 100k or 1M nodes for this algorithm and no windowed form would change that.
- **8.8, rows 5, 6, 9 and 10 (lines 2802-2803 and 2806-2807).** Row 5 (closeness) is the
  sampled form; row 6's Bellman-Ford is negative weights only; row 9 splits -- MST, triangles and
  label propagation go, k-core is demoted and k-truss dropped; row 10 (Louvain, Leiden) is
  demoted behind a port and a group-by measurement. The order the numbers give is in the section
  above.
- **10.4, target T-15 (line 3473).** "Expected 2-10x" is withdrawn for the reason 8.6's
  paragraph is; the measurement itself, end to end with the CPU comparison on both runner
  classes, is still wanted and is the only thing that narrows the 1,000x bracket on Louvain's
  cost.
- **13, row P11 (line 4271).** The deliverables cell lists k-core, k-truss and Louvain, and
  "Leiden refinement if time allows". The phase's deliverables are the device graph build, MST,
  triangles with the clustering coefficient and label propagation; k-core and Louvain wait for
  their ports and their primitive measurement; k-truss and Leiden are out.
- **17, the Girvan-Newman row (line 5147).** "Dispatch each betweenness step through P9's
  kernel; no phase of its own" becomes "stays on the CPU": 66 hours at 100k nodes.

Section 17's other rows agree with the model and are not overruled: the similarity family
follows the triangle row (earns, unverified); strongly connected components are two BFS sweeps
per iteration (marginal at best); spectral clustering follows PageRank's row (earns; f32
precision is the risk); delta PageRank follows PageRank if the snapshot is resident; Markov
clustering cannot be modelled without a sparse-matrix product primitive.

## The argument that was rejected

That the design's ranking already accounts for this, because it scored each algorithm on demand
and on the primitives it pulls in, and because the package "runs the small levels on the GPU
too; the caller chooses the CPU package for small graphs" (8.6). The ranking measures value and
reuse, not speed, and "the caller chooses" is only a decision if the caller has a number to
choose with. Until this record no number existed for any unbuilt algorithm; the design's own
expectations (2-10x for Louvain; "strong: 10-100x at 1M edges" for triangles in 17) were
literature ratios applied without discounting for the card, the runtime or the comparator. The
one place the design did write a cost model, betweenness in 8.4, is the one place its
expectation survives.

A second rejected argument: measure first, plan later, since five constants are brackets. The
brackets are carried in the table and none of them moves a classification across the 3x line
except triangles (which the record marks unverified and gates on the measurement) and the
Louvain bound (which only makes the demotion firmer). On the CPU minima the triangle bracket
is under 3x at every browser size, so that gate is the row's whole case. Waiting for the measurement would have
left 6 days of Louvain on the P11 plan's critical path while the 2-day minimum spanning tree that
earns 10x is the one task that plan says can start today.

## What would reverse this

- **The Chromium round trip.** 2.0 ms is one measurement cross-checked against one paper; the
  bare headless figure is 0.10 ms. At 0.5 ms, on the CPU minima, PageRank at 10k goes from 0.39x
  to 0.93x and at 100k from 3.0x to 5.9x, connected components at 100k from 0.77x to 1.3x, MST
  at 10k from 0.93x to 1.8x (on the loaded medians: 0.64x to 1.5x, 3.1x to 6.1x, 1.3x to 2.2x
  and 1.8x to 3.4x). Every syncs-dominated cell in the table moves with it, the routing floors of the built
  rows most of all. Whether it is the scheduler tick (fixable by cadence)
  or intrinsic to `mapAsync` is the single most valuable browser measurement not taken.
- **The traversal floor on an idle box.** 7 ms was measured at load 23-31; the idle,
  pre-direct-dispatch proxy is 3 ms. Betweenness at 100k is 13.1x or 3.1x depending on which is
  right. A resident BFS at 1k / 10k / 100k / 1M on an idle box settles it.
- **The merge-step and group-by rates**, which no WebGPU number exists for. The P11 plan is
  amended to measure both primitives before writing any of its four algorithms that use them;
  a merge step above 1.9 ns (2.7 ns on the loaded medians) drops triangles to marginal; no
  group-by rate puts Louvain at 100k on the 3x line against a port on the CPU minima (2.3x at
  0.30 ns/arc and 2.6x at zero), so only a faster-than-assumed contraction or a slower port
  would.
- **A CPU measurement on an idle box.** Every CPU row here is a minimum over runs taken at
  load average 8-64 on a 32-thread box, and the only two rows with an idle-box twin are still
  1.6-2.1x above it (BFS at 100k: 9.6 ms against 5.9 ms at load ~2; Dijkstra at 100k: 45 ms
  against 22 ms). If that ratio holds across the rows, every speedup above is up to 2x too
  generous and PageRank converged (3.02x at 100k), betweenness on its pessimistic rate (3.06x)
  and HITS at 10k (2.7x) sit on or under the 3x line; the T4 crossovers would move most. The
  provenance section says what was tried.
- **A CPU port of Louvain or k-core that is not 20-30x over the shipped code.** The port
  baselines are assumptions (the midpoint of the measured 10-100x legacy-to-indexed spread);
  a slower port makes the GPU look better and a faster one worse, and only the port settles it.

## Validated against the algorithms that already exist (2026-09-26)

The model's method was re-applied, blind, to the WebGPU work already built, to find out how far
its predictions can be trusted for the work that is not. The predictions were written down from
device physics alone -- peak bandwidth, achievable fraction on a gather, fp32 throughput, the
per-call and per-dispatch floors measured independently of any algorithm, and nanoseconds per
element for an interpreted CPU loop -- before any benchmark row was read, and are in
`tmp/gpu-cost-model/blind-predictions.md`. The layouts were the genuinely blind target: nothing in
this repository had ever timed the CPU implementations they replace.

| Quantity | Predicted from physics | Measured | Error |
| --- | --- | --- | --- |
| CPU cost of one pairwise repulsion, JavaScript | 2-5 ns | 2.75 ns (ForceAtlas2), 1.96 ns (Fruchterman-Reingold) | in range |
| CPU ForceAtlas2, one iteration at 10,000 nodes | 300 ms | 275.3 ms | 9 % |
| CPU scaling of the exact tier | quadratic | 2.889, 11.108, 44.218, 275.290 ms at 1k, 2k, 4k, 10k | exact |
| GPU ForceAtlas2, one iteration at 10,000 | 0.2-0.4 ms | 0.593 ms kernel, 0.723 ms wall | 1.5-1.8x optimistic |
| GPU grid tier, one iteration at 1,000,000 | 5-10 ms | 5.414 ms | in range |
| Layout speedup at 10,000 nodes | about 1,000x | 464x on kernel time, 381x on the step's wall | 2.2-2.6x optimistic |
| Layout crossover, Node | about 260 nodes | 192 (kernel) to 290 (wall) | in range |
| PageRank, 100 iterations at 1M / 10M, wall | 330-630 ms | 204.3 ms | 1.6-3x pessimistic |
| PageRank speedup at 1M / 10M | 25-45x | 38.7x against the measured CPU | in range |
| Connected components speedup at 1M / 10M, wall | 1.5-2x | 1.5x (1.3x at 100k / 1M) | in range |
| Breadth-first search crossover, resident | 30,000-50,000 nodes | about 141,000 | 3-5x optimistic |
| Shortest paths crossover, resident | 30,000-60,000 nodes | about 107,000 | 2-4x optimistic |

Three conclusions, and the third is the one that changes how this record should be read.

**The physics half is reliable; the CPU half is where the error lives.** Every GPU-side prediction
landed within a factor of two of the measurement, and the quadratic layout curve was predicted to
the nanosecond per interaction. The misses are all on the other side: the CPU's cost per element
is a property of somebody's implementation, not of the hardware, and it varies by a factor of four
between two traversals of the same graph -- 30 ns per arc for breadth-first search against 116 ns
for Dijkstra, whose heap dominates it. A crossover carried across a family from one measured
member is therefore not evidence about the others. Every row of the table above this section rests
on a CPU measurement of that algorithm; none may be extrapolated from its family.

**A crossover computed against the GPU's floor alone comes out several times too low.** The first
attempt at scoring these predictions divided the fixed per-call floor by the CPU's cost per arc,
which assumes the GPU's cost stays flat until the crossover. It does not: at 100,000 nodes the
traversal kernels are already well above their floor, so the true crossing is at 141,000 nodes for
breadth-first search rather than the 24,000 that method gives. The crossovers in this record's main
table were computed from both cost curves and are the ones to use; the element's per-capability
floors, which were measured end to end rather than modelled, agree with them.

**The model scores an algorithm alone, and some algorithms are only worth building for what they
carry.** Applied before any of this existed, the method would have recommended against building
GPU breadth-first search, shortest paths and connected components for this product, because their
crossovers -- 141,000, 107,000 and a 1.5x wall ratio -- all sit above the 50,000 nodes the renderer
can hold. As a statement about each algorithm on its own that recommendation is correct, and the
element's shipped floors say so. It would still have been the wrong call, because the frontier
machinery those three paid for -- the queue, the compaction, the direction-optimizing sweep, the
device-side selector -- is what sampled closeness already runs on and what sampled betweenness, the
strongest unbuilt candidate in the table above at a crossover of 1,500 nodes and 14x at 100,000,
would have to be built on. There is no route to the algorithms that earn the GPU that does not pass
through ones that do not. A cost model that ranks algorithms one at a time cannot see that, and a
reader of this record should not let it decide a phase that builds shared machinery.

## Provenance

Nothing for this record ran on the GPU: the card was in use by another workflow, and every GPU
figure was read from what this repository had already recorded. The notes live outside the
repository, beside each other in `tmp/gpu-cost-model/` of the main checkout at
`/home/apowers/Projects/graphty-monorepo`, and the reconciliation script that produces every
figure in the table is reproduced in full in the final note's appendix B so the table can be
regenerated from that file alone.

- **`final-model.md`** (written 2026-09-25; the reconciliation arithmetic ran at load average
  7.45 / 6.60 / 9.85, which is irrelevant to arithmetic). Two models built independently from
  the same three gather notes -- one from first principles per kernel, one from empirical scaling
  of the measured rows -- reconciled row by row; where they disagreed by more than 2x the row was
  recomputed from the underlying measurements with a verdict on which erred and why. The table
  above is its section 1; the routing floors are its section 5.
- **`cpu-measurements.md`** (rewritten 2026-09-25 late evening from two passes; its header
  carries the UTC date `make-table.mjs` stamps). Node v22.22.1 on the Intel i9-14900KF, one
  JavaScript thread of `@graphty/algorithms`, seeded random graphs of n nodes and 10 n edges at
  n = 1,000 / 10,000 / 100,000 / 1,000,000, integer weights 1-100. The first pass (20:54 local)
  took the median of 5 runs (3 at 1M) unpinned with a 40 GB heap at 1-minute load average
  8.9-22; its runs of one row spread up to 2.8x under that load (BFS at 100k: 9.6 / 10.7 / 13.4
  / 17.1 / 27.1 ms; triangles at 10k: 31.8-71.5 ms; sampled betweenness at 10k: 226-541 ms;
  PageRank converged at 1M: 0.92-1.67 s), which is why a median at that load is not a cost. The
  second pass (22:19-22:53 local) re-ran every row with 9 runs (5 at 1M, 3 once a run exceeded a
  minute) pinned to one P-core hyperthread (`taskset -c 5`) with an 8 GB heap, recording the
  load average before and after each row: 17 to 64, with the sibling hyperthread of the pinned
  core 72 percent busy when sampled. At that load the second pass was mostly SLOWER than the
  first (Bellman-Ford at 1M: 60.5 s against 32.3 s), so it was stopped after the Bellman-Ford 1M
  row; the 1M rows from closeness on and the Floyd-Warshall rows have only the first pass.
  Every CPU figure this record now uses is the MINIMUM over every individual run of both passes
  ("minimum of N": N = 14 at 1k-100k, 8 for label propagation and HITS at 100k, 6-8 at 1M, 3
  for closeness / Louvain / k-core / eigenvector at 1M, 5 for Floyd-Warshall, 1-2 for the legacy
  Graph builds at 100k and 1M, exact betweenness at 10k and Katz at 1M; HITS and label
  propagation at 1M were not run in either pass, and their 1M CPU figures -- and so the 2,085x
  and 508x "vs shipped" figures above, 2,835x and 603x on the medians -- are extrapolated from
  the 100k rows). The loaded medians of the first pass are kept beside the minima in that file
  and in the two tables above. The minimum is not a floor: the only two rows with a low-load
  twin (BFS and Dijkstra at 100k, measured at load 1.8-2.5 for the frontier work) are still
  1.6-2.1x below the best run seen here, because the box never dropped under load 17 during
  either pass, so every crossover and speedup in the table is a point estimate with roughly a
  2x band around it, not a figure good to two digits. Its raw logs (`cpu-raw.log`,
  `cpu-raw-min.log`), raw JSON (`cpu-raw.json`, `cpu-raw-min.json`, joined in
  `cpu-raw-combined.json` by `combine.mjs`), the benchmark script and the table renderer sit
  beside it. Every figure in this record was regenerated from the combined minima by the
  appendix B script of `final-model.md` with its CPU table swapped, and nothing else changed.
- **`gpu-calibration.md`** (extracted 2026-09-25). Every GPU constant, read from:
  `webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json` (the RTX 4070
  SUPER, Dawn architecture `lovelace`, driver 580.173.02, `webgpu` npm 0.4.0, Node v22.22.1;
  six sessions on master, the last 2026-09-21, and a seventh in the `feat/gpu-p8` worktree dated
  2026-09-25T10:19Z); the traversal rows measured on that branch on 2026-09-25 after its
  direct-dispatch commit (resident BFS 7.8 / 9.2 / 61.7 ms and SSSP 8.7 / 24.3 / 133 ms at 10k / 100k / 1M,
  medians of 3 or 7 at load 23-31, in no baseline file);
  `webgpu-graph-algorithms/benchmarks/results/gpu-linux-t4.json` (the Tesla T4 lane, four
  sessions, the last 2026-09-22, `gpu.yml` run 35775999450); and the Chromium 143 round-trip
  profile in the `feat/gpu-p8` worktree's research notes. Its section 0 lists what no source
  supplies, and the brackets above are exactly those gaps.
- **`inventory.md`** (2026-09-25). Every algorithm the design plans, has built or names, with
  its family, primitive, rounds and what each plan says or is silent on; the source of the
  round-count and cadence facts above.

The Tesla T4 column is "a T4 next to this i9", a class figure at best (two rented instances of
the same class differed by 1.32x on identical work, `2026-09-24-performance-targets-belong-to-a-card-class.md`);
the CI lane's own 4-vCPU Xeon was never timed, and no T4 traversal row exists, so every T4
traversal figure is the 4070's kernel scaled by an assumed 2.5x.
