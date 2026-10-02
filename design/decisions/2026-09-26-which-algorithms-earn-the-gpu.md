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

| algorithm                                        | crossover, Chromium (T4), loaded median | crossover, minimum of N       | speedup 4070, 10k / 100k / 1M, loaded median                                              | speedup 4070, minimum of N                                                                   | speedup T4, 10k / 100k / 1M, loaded median | speedup T4, minimum of N      | class                                                                                                |
| ------------------------------------------------ | --------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| PageRank, converged                              | 19k (40k)                               | 29k (50k)                     | 0.64x / 3.1x / 65x                                                                        | 0.39x / 3.0x / 38x                                                                           | 0.38x / 1.8x / 19x                         | 0.24x / 1.7x / 11x            | earns above 29k, and only just: 3.02x at 100k; marginal on a T4                                      |
| PageRank, 100 iterations                         | 12k (19k)                               | 13k (21k)                     | 0.86x / 8.5x / 133x                                                                       | 0.80x / 8.1x / 100x                                                                          | 0.53x / 4.9x / 27x                         | 0.49x / 4.6x / 20x            | earns                                                                                                |
| eigenvector, Katz (100 it.) vs a port            | 6.0k (10k)                              | 6.6k (10k)                    | 1.7x / 16x / 188x                                                                         | 1.6x / 15x / 142x                                                                            | 1.0x / 8.4x / 24x                          | 0.95x / 8.0x / 18x            | earns (as decided on an estimated port; Katz re-derived below, eigenvector was not ported)           |
| HITS (100 it.) vs a port                         | 3.6k (6.0k)                             | 4.0k (6.6k)                   | 3.0x / 24x / 218x                                                                         | 2.7x / 23x / 164x                                                                            | 1.7x / 12x / 24x                           | 1.6x / 11x / 18x              | earns (as decided on an estimated port; re-derived below)                                            |
| connected components (Afforest)                  | 72k (138k)                              | 132k (229k)                   | 0.22x / 1.3x / 6.1x                                                                       | 0.09x / 0.77x / 5.7x                                                                         | 0.14x / 0.77x / 3.3x                       | 0.05x / 0.46x / 3.0x          | does not earn in Chromium below ~130k and is marginal above; in Node 1.9x at 100k, 3x from 166k      |
| BFS, single source                               | 151k (400k)                             | 191k (501k)                   | 0.03x / 0.69x / 3.2x                                                                      | 0.03x / 0.50x / 3.1x                                                                         | 0.01x / 0.33x / 1.4x                       | 0.01x / 0.24x / 1.4x          | marginal; does not earn on high-diameter graphs                                                      |
| SSSP, near-far                                   | 69k (190k)                              | 79k (229k)                    | 0.11x / 1.4x / 6.7x                                                                       | 0.11x / 1.2x / 5.7x                                                                          | 0.05x / 0.62x / 2.9x                       | 0.05x / 0.55x / 2.4x          | marginal (3x from ~350k)                                                                             |
| Bellman-Ford vs indexed Dijkstra                 | 55k [72k] (110k [290k])                 | 58k [83k] (132k [398k])       | 0.11x / 2.0x / 13x [0.11x / 1.3x / 4.7x]                                                  | 0.11x / 1.8x / 11x [0.10x / 1.1x / 4.0x]                                                     | 0.05x / 0.93x / 1.9x                       | 0.05x / 0.82x / 1.6x          | earns for negative weights only; marginal as an SSSP                                                 |
| closeness, 100 sampled sources                   | ~100 (~300)                             | ~5.8k (11k)                   | 1.9x / 38x / 71x                                                                          | 1.8x / 27x / 69x                                                                             | ~1x / 15x / 28x                            | ~0.9x / 13x / 29x             | earns, as a sampled algorithm                                                                        |
| closeness, exact, every source                   | ~100-250 (~320-400)                     | ~1.0k-2.8k (4.6k-5.0k)        | vs a port 4.4x / 80x / 101x [3.6x / 32x / 101x]                                           | vs a port 4.4x / 58x / 99x [3.6x / 23x / 99x]                                                | 2.4x / 38x / 41x                           | 2.4x / 27x / 40x              | earns per unit of work; unusable above ~30k (see text)                                               |
| betweenness, 100 sampled sources                 | 1.5k [2.3k] (3.0k [9.5k])               | 1.6k [2.8k] (3.5k [30k])      | 7.0x / 13.7x / 8.1x [2.5x / 3.2x / 8.1x]                                                  | 5.2x / 13.1x / 7.8x [1.9x / 3.1x / 7.8x]                                                     | 3.1x / 5.7x / 3.2x                         | 2.3x / 5.4x / 3.1x            | earns; MEASURED 2026-09-27 (see below): crossover 500-1k, 31x at 100k in Chromium, 38x at 1M in Node |
| all-pairs shortest paths, blocked Floyd-Warshall | ~50 vs legacy, ~130 vs a port           | 72 vs a port, Node (below)    | n = 1,000: 2,500x vs legacy, 89x vs a port; n = 5,792: 11,300x / 290x                     | unchanged (2,420x and 10,500x vs legacy, within 10 percent)                                  | n = 5,792: 124x vs a port                  | unchanged                     | earns inside the binding bound; cannot address 100k                                                  |
| k-core vs a port                                 | 132k (380k)                             | 209k (501k)                   | 0.15x / 0.82x / 4.0x                                                                      | 0.06x / 0.49x / 3.7x                                                                         | 0.07x / 0.37x / 1.8x                       | 0.03x / 0.22x / 1.7x          | marginal; earns only against the unported code (as decided on an estimated port; re-derived below)   |
| triangle count, clustering coefficient           | 3.0k (4.8k)                             | 6.6k (15k)                    | 7.2x / 12.7x / 26x [4.4x / 3.0x / 4.1x]                                                   | 1.6x / 9.7x / 23x [0.94x / 2.3x / 3.6x]                                                      | 3.2x / 5.4x / 9.9x                         | 0.69x / 4.1x / 8.8x           | earns at 100k on the assumed merge rate, unverified; the bracket earns at no browser size            |
| k-truss, support recomputed per round            | 4.2k at 10 rounds                       | 13k at 10 rounds              | 10 rounds 4.0x / 4.8x / 7.8x; 30 rounds 1.5x / 1.8x / 2.9x; 50 rounds 0.91x / 1.1x / 1.8x | 10 rounds 0.85x / 3.7x / 6.9x; 30 rounds 0.32x / 1.4x / 2.5x; 50 rounds 0.20x / 0.83x / 1.6x | 10 rounds 2.1x / 2.0x / 2.8x               | 10 rounds 0.44x / 1.5x / 2.5x | marginal; the round count is unbounded                                                               |
| label propagation (100 passes) vs a port         | 2.3k (4.0k)                             | 2.5k (4.2k)                   | 4.4x / 21x / 97x [3.0x / 6.8x / 24x]                                                      | 4.0x / 20x / 73x [2.7x / 6.5x / 18x]                                                         | 2.4x / 8.8x / 36x                          | 2.2x / 8.4x / 27x             | earns, if the changed-count readback is batched                                                      |
| Louvain (Leiden and ECG inherit it) vs a port    | 33k (72k); never on the bound           | 38k (79k); never on the bound | 0.31x / 2.5x / 18x [0.29x / 1.8x / 10x; bound 0.09x / 0.16x / 0.62x]                      | 0.26x / 2.3x / 15x [0.25x / 1.7x / 8.4x; bound 0.08x / 0.15x / 0.51x]                        | 0.18x / 1.25x / 7.1x                       | 0.15x / 1.2x / 5.9x           | loses inside the element's ceiling (measured 2026-09-30, below)                                      |
| minimum spanning tree, Boruvka vs Kruskal        | 6.0k (11k)                              | 11k (21k)                     | 1.8x / 10.4x / 43x [1.7x / 8.0x / 18x]                                                    | 0.93x / 7.6x / 43x [0.91x / 5.8x / 18x]                                                      | 0.95x / 5.3x / 7.3x                        | 0.50x / 3.9x / 7.3x           | earns (3x from 38k); loses at 10k                                                                    |

"vs a port" rows also have a "vs shipped" figure, which is much larger and is not the GPU's to
claim: against the shipped legacy code Katz is 20x / 434x / 7,538x, HITS 27x / 721x / 2,085x,
label propagation 31x / 337x / 508x and Louvain 5.3x / 47x / 294x on the minima (23x / 507x /
7,538x, 32x / 980x / 2,835x, 35x / 400x / 603x and 6.2x / 50x / 357x on the loaded medians),
and 17-31x of each of those gaps at 100k belongs to the missing CPU port (Louvain's 20x was
assumed; the port, once built, measured 1.8x at 100k -- see the re-derivation below).

### All-pairs measured, not modelled (2026-09-27)

The all-pairs row above was modelled. It has now been measured, in Node on Dawn on the reference
card (the RTX 4070 SUPER, driver 580.173.02), not in Chromium. The GPU arm is
`allPairsShortestPath` of `@graphty/webgpu-graph-algorithms`, timed end to end INCLUDING the upload
and the `4 n^2`-byte readback of the matrix. The CPU arms are the two this row was modelled
against: the shipped `floydWarshall` of `@graphty/algorithms` (the Map-of-Maps legacy code), and
an indexed port -- a row-major `Float64Array` swept k-i-j, the port the model priced at 1.5 ns per
inner step. No such port ships, so it was written for the measurement. Graphs are this record's
generator: seeded, 10 n unique undirected edges (fewer below 21 nodes, where 10 n do not exist),
integer weights 1-100. In every pass the arms ran interleaved -- GPU, port, legacy -- after one
discarded warm-up of each, and the GPU matrix was checked cell by cell against the port's before
anything was timed. Medians of 15 passes up to 256 nodes, 5 at 512 and 1,024, 3 at 2,048; the
legacy arm stops at 512, where one call takes 4.2 s. The one-minute load average was 1.5 before the
first size and 2.3 after the last. Times in ms:

| nodes |  edges |   GPU |  port | legacy | GPU vs port | GPU vs legacy |
| ----: | -----: | ----: | ----: | -----: | ----------: | ------------: |
|    16 |     60 | 0.334 | 0.010 |  0.455 |       0.03x |          1.4x |
|    32 |    248 | 0.258 | 0.064 |   1.44 |       0.25x |          5.6x |
|    48 |    480 | 0.346 | 0.182 |   3.32 |       0.52x |          9.6x |
|    64 |    640 | 0.463 | 0.398 |   8.55 |       0.86x |           18x |
|    96 |    960 | 0.613 |  1.31 |   26.9 |        2.1x |           44x |
|   128 |  1,280 | 0.688 |  2.84 |   62.7 |        4.1x |           91x |
|   256 |  2,560 |  3.16 |  18.9 |    511 |        6.0x |          162x |
|   512 |  5,120 |  7.82 |   139 |  4,218 |         18x |          540x |
| 1,024 | 10,240 |  25.9 | 1,040 |     -- |         40x |            -- |
| 2,048 | 20,480 |   139 | 8,357 |     -- |         60x |            -- |

THE CROSSOVER AGAINST THE PORT IS 64-72 NODES IN NODE. Three further passes over 56-96 nodes at the
same load put the device ahead at 64 in three of four passes (0.86x, 1.20x, 1.18x, 1.13x), ahead at
72 in all three (1.44x, 1.39x, 1.37x) and behind at 56 in all three (0.71x, 0.61x, 0.60x).
Against the legacy code the device won at every size measured, 16 nodes included, so that crossover
is below 16. Chromium was not measured. The model charges Chromium a 2.0 ms round trip that Node
does not pay, and the port reaches 2 ms at about 115 nodes (1.3 ms at 96, 2.8 at 128), so the
modelled Chromium crossover of about 130 is consistent with this row, but it is still modelled.

Two findings move the large-n speedups, in opposite directions. The port is FASTER than the model
assumed: 1.0 ns per inner step at 2,048 nodes (8.36 s for 8.6 billion steps), not 1.5. And the
device is SLOWER when the arms are interleaved than when it runs back to back: the `apsp` benchmark
group, which calls the device repeatedly with nothing in between, read 1.47 / 4.19 / 18.3 ms at 512
/ 1,024 / 2,048 nodes on the same card minutes later (appended to
`webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json`), and the interleaving
script run with its CPU arms switched off reproduced those figures (1.47 / 4.49 / 18.5 ms). So the
5-7x gap is the device answering slowly on the first call after an idle spell of 0.1-8 s while the
CPU arm runs, not background load; whether a clock or a power state is the cause was not isolated.
A consumer who runs all-pairs once sees the interleaved figure, 18x / 40x / 60x over the port at 512
/ 1,024 / 2,048 nodes; a consumer who runs it repeatedly sees 95x / 248x / 458x. The class is
unchanged: earns, inside the binding bound.

graphty-element does not route all-pairs to the accelerator yet -- its `floydWarshall` algorithm
runs the CPU code, and `ACCELERATION_MIN_NODES_BY_CAPABILITY` in
`graphty-element/src/acceleration/types.ts` has no `allPairsShortestPath` entry -- so no routing
floor is set from this measurement. When the element routes it, 72 nodes is the Node floor; the
Chromium floor has to be measured through the element, as the other floors there were.

### Re-derived against the measured ports (2026-09-27)

The four "vs a port" rows above were decided against an ESTIMATED port, because none existed:
Katz as twice an indexed PageRank-100, HITS as four times, k-core as the indexed
connected-components cost, and Louvain as the shipped code divided by twenty. Issue #423 built all
four. They were timed on a quiet box -- one-minute load average 4.7 at the start and 4.3 at the
end, minimum of three runs, `algorithms/benchmarks/port-bench.ts` -- and fed back through the appendix B
script of `final-model.md` with only those four port baselines replaced and nothing else changed.
The unchanged script reproduces the table above exactly, which is what makes the comparison fair.
Speedups on the reference card in Chromium, at 10k / 100k / 1M nodes:

| algorithm                      | against the estimated port | against the measured port | class                               |
| ------------------------------ | -------------------------- | ------------------------- | ----------------------------------- |
| Katz, 100 iterations           | 1.71x / 15.7x / 188x       | 0.36x / 3.66x / 43.8x     | earns (3.7x at 100k); loses at 10k  |
| HITS, 100 iterations           | 2.96x / 24.3x / 218x       | 0.72x / 5.71x / 51.2x     | earns (5.7x at 100k); loses at 10k  |
| k-core                         | 0.15x / 0.82x / 4.02x      | 0.04x / 0.44x / 2.16x     | marginal, and further from the line |
| Louvain, primitive model       | 0.31x / 2.50x / 17.8x      | 0.65x / 14.6x / 105x      | earns on this model                 |
| Louvain, cuGraph-derived bound | 0.09x / 0.16x / 0.62x      | 0.20x / 0.94x / 3.61x     | loses on this bound                 |
| label propagation, 100 passes  | 4.37x / 20.8x / 97.3x      | 6.57x / 37.4x / 126x      | earns per pass; 4.2x to an answer   |

The 10k and 100k columns are measured. The 1M column is not, except on the label propagation row: it is the old estimate scaled by that
algorithm's measured-to-estimated ratio at 100k, which assumes the estimate's error holds from 100k
to 1M. Every class in this record is decided at 100k and below, so the classes above rest on
measurement alone. "Loses at 10k" follows the precedent of the minimum spanning tree row, which is
classed as earning although it loses at 10k; this record never defines how long a CPU call must be
to count as "long enough to notice", and the Katz and HITS classes are the first to hinge on it.

The label propagation row was added the same way on 2026-09-27, after the port landed
(`indexed.labelPropagation`, design `design/algorithms/label-propagation-indexed-port-design.md`).
Its port baseline is 100 times the port's one-sweep minimum -- 0.3 ms, 2.8 ms and 36.5 ms at 1k,
10k and 100k from `port-bench.ts` (the 1k rows after 20 warm-up calls; load average 6.4 at the
start and at the end), and 815 ms at 1M, the minimum of 7 interleaved runs at load 7 -- because
the GPU is costed at 100 synchronous passes. All four points are measured; an earlier version of
this row scaled the old 1M estimate by the 100k ratio and put the CPU at 118.8 s, about 1.5 times
the measured 81.5 s, because the port's per-arc cost grows faster than linearly past 100k (label
reads become cache misses). The unchanged script reproduced the old row (4.37x / 20.8x / 97.3x)
before the baseline was replaced; the other label propagation rows move with it (group-by at 1.3
ns: 4.47x / 12.3x / 30.8x; readback every pass: 1.29x / 13.4x / 99.3x).

**The per-pass figure is not the time to answer.** A first sweep touches the most distinct labels,
so 100 of them overstate the CPU side, and the port never runs 100: it stops when its queue
empties. At its defaults it converges on the bench graphs in 6, 13 and 24 sweep-equivalents --
11.3 ms at 10k and 405 ms at 100k (`port-bench.ts`), 15.7 s at 1M (minimum of 7) -- against the
model's 42.6 ms, 97.5 ms and 647 ms for the GPU's 100 passes on the reference card in Chromium.
So the GPU answers first by 4.2x at 100k and 24x at 1M, and loses at 10k (0.27x). The class says
both: the GPU earns its place on large graphs, by about four times at 100k, not the 37x of the
per-pass column.

THE PORTS MOVED IN OPPOSITE DIRECTIONS, and that is the finding. The Katz, HITS and k-core ports
came in two to four times FASTER than estimated, so the GPU's advantage against each shrank by the
same factor: Katz now clears the 3x bar by a hair, and both it and HITS lose at 10k. Louvain's port
came in nearly six times SLOWER than the twenty-fold estimate at 100k -- 1.8x over the shipped code
there, not 20x -- so the GPU's advantage against it grew by that factor, and on the primitive model
it now earns. On the cuGraph-derived bound it still loses. So Louvain is no longer marginal on the
model this record was decided on, but it is not settled either: which of the two models holds is
exactly the per-row group-by rate that section 3.7 says has no WebGPU measurement behind it.

### Sampled betweenness, measured rather than modelled (2026-09-27)

The betweenness rows above are the model's. Once `betweennessCentrality` existed in
`@graphty/webgpu-graph-algorithms` (pull request #552) the crossover was measured directly, on
the reference card, against the same CPU baseline the model used: the CSR Brandes reference in
`cpu-bench.ts` (the algorithms package still has no sampled CPU betweenness and no indexed port
of it), on the same seeded graphs (n nodes, 10 n unique undirected edges, seed 12345 + n) with
the same 100 sources spread by stride (every vertex below 100 nodes). Each pass ran the device
arm and the CPU arm back to back in one process, so both arms saw the same interference; one
discarded pass of each arm came first; figures are MEDIANS of 15 passes (9 at 100k, 3 at 1M).
"Resident" is a call with the graph already uploaded; "cold" releases the graph first, so the
upload is inside the number. Every size's device scores matched the reference within 1e-6
relative. The box was quiet: one-minute load average 4.9 at the start of the first Chromium sweep
and 3.9 at its end, 3.6 and 3.5 for the second, 5.7 and 5.5 for the Node sweep, on 32 hardware
threads.

Headless Chromium through ANGLE's Vulkan backend on the RTX 4070 SUPER, the CPU arm in the
same page. Two sweeps; the ratio is given for both, the milliseconds for the second:

| nodes / edges       | CPU ms | GPU resident ms | GPU cold ms | resident speedup, sweep 1 / 2 | cold speedup, sweep 2 |
| ------------------- | -----: | --------------: | ----------: | ----------------------------- | --------------------: |
| 25 / 250            |    0.1 |             5.1 |         5.2 | 0.02x / 0.02x                 |                 0.02x |
| 100 / 1,000         |    1.1 |             7.2 |         7.3 | 0.15x / 0.15x                 |                 0.15x |
| 200 / 2,000         |    2.5 |             7.4 |         7.6 | 0.34x / 0.34x                 |                 0.33x |
| 500 / 5,000         |    7.8 |             7.1 |         7.2 | 1.05x / 1.10x                 |                 1.08x |
| 1,000 / 10,000      |   12.9 |             7.5 |         7.8 | 1.72x / 1.72x                 |                 1.65x |
| 2,000 / 20,000      |   22.4 |             7.6 |         7.9 | 2.79x / 2.95x                 |                 2.84x |
| 5,000 / 50,000      |   75.7 |             7.5 |         8.3 | 9.0x / 10.1x                  |                  9.1x |
| 10,000 / 100,000    |  173.5 |             9.1 |        11.2 | 10.0x / 19.1x                 |                 15.5x |
| 20,000 / 200,000    |  308.5 |            12.6 |        15.9 | 24.5x / 24.5x                 |                 19.4x |
| 50,000 / 500,000    |    770 |            25.0 |        31.5 | 31.7x / 30.8x                 |                 24.4x |
| 100,000 / 1,000,000 |  2,184 |            69.9 |        87.9 | 30.7x / 31.3x                 |                 24.9x |

Node on Dawn, the same card, one sweep:

| nodes / edges          | CPU ms | GPU resident ms | GPU cold ms | resident speedup | cold speedup |
| ---------------------- | -----: | --------------: | ----------: | ---------------: | -----------: |
| 100 / 1,000            |   1.16 |            1.91 |        1.95 |            0.61x |        0.60x |
| 200 / 2,000            |   2.63 |            1.83 |        2.01 |            1.44x |        1.31x |
| 500 / 5,000            |   8.30 |            2.15 |        2.08 |            3.86x |        3.99x |
| 1,000 / 10,000         |   13.9 |            2.23 |        2.24 |            6.25x |        6.22x |
| 10,000 / 100,000       |  185.9 |            5.12 |        7.43 |            36.3x |        25.0x |
| 100,000 / 1,000,000    |  2,430 |            68.4 |        82.3 |            35.5x |        29.5x |
| 1,000,000 / 10,000,000 | 67,225 |           1,787 |       2,130 |            37.6x |        31.6x |

What this settles:

- **The crossover in Chromium is 500 nodes, and the route-above figure is 1,000.** At 500 the
  device's median was ahead by 5-10 percent in both sweeps but behind in some individual passes;
  from 1,000 it was ahead in every pass of both sweeps. Below 500 the device call costs its fixed
  4.5-7.5 ms whatever the size, which is the whole difference: at 200 nodes the CPU is done in
  2.5 ms. The model's 1.5k (1.6k on the minima) was three times too high. In Node the fixed cost
  is under 2 ms, and the crossover falls between 100 and 200 nodes.
- **3x in Chromium from just above 2,000 nodes** (2.8-2.95x at 2,000, 9-10x at 5,000), against the
  model's 4.2k-5.0k.
- **31x at 100k in Chromium, and 38x at 1M in Node**, against the model's 13.1x (3.1x on the
  pessimistic traversal rate) and 7.8x. The pessimistic bracket is ruled out, and so is the
  point estimate: the model priced each source's forward and backward pass at the single-source
  BFS rate of 0.5 ns per arc, and the batched kernel, which runs up to 64 sources in each
  dispatch, came in at 0.17 ns per arc per pass per source with the whole call included (69.9 ms
  for 100 sources x 2 passes x 2M arcs). The CPU arm was also faster here than in the model's
  runs (2.18 s at 100k in Chromium and 2.43 s in Node, against the 3.12 s minimum the model
  used), because this box was at load 4-6 rather than 17-64; that makes these ratios smaller,
  not larger, than the model's CPU figure would give.
- **The upload is not what decides it.** A cold call costs 0.1-0.8 ms more than a resident one up
  to 5,000 nodes and about 18 ms more at 100k in Chromium, so cold and resident cross at the same
  size and the cold call is still 25x at 100k.
- **The Tesla T4 columns are still the model's.** The T4 lane was not run for this record.

One figure in the first sweep is interference, not a property of the kernel: the device's median
at 10,000 nodes was 17.9 ms against 9.1 ms in the second sweep and 12.4 ms at 20,000 in the same
sweep. The two sweeps agree within 12 percent at every other size.

The design's T-11 target was also met, in Node on the same card, in the package's own benchmark
group: 256 sampled sources at 100k / 1M in 216 ms and 3.76 s against the 5 s target (the R-MAT
rungs of `benchmarks/betweenness.bench.ts`, median of 5, appended to
`webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json` as the session of
2026-09-27T22:50:29Z at load 3.4 before and 5.1 after), and exact karate in 0.82 ms against 20 ms.

The scripts, both sweeps' raw rows and the logs are in
`tmp/feat-webgpu-sampled-betweenness/` of the `feat/webgpu-sampled-betweenness` worktree:
`bc-crossover-node.ts` (Node), `zz-bc-crossover.test.ts` (the Chromium sweep, run from
`test/browser/` of the package and not committed) and `bc-shared.ts` (the generator and the CPU
reference, copied from `cpu-bench.ts` unchanged).

### Measured: triangle counting and label propagation (2026-09-27)

Issue #422 built both on the device, so their rows no longer rest on the model. The crossovers
below are MEASURED, not modelled: both arms ran on the same graph in the same process, in headless
Chromium 143 on the RTX 4070 SUPER (the NVIDIA adapter, not SwiftShader -- the run required it) and
in Node on Dawn, with the CPU and device passes interleaved (the order reversed every round, so
background load lands on both) and the MEDIAN of 11 rounds up to 10k nodes, 7 at 20k-50k and 5 at
100k-1M. The graphs are this record's: seeded unique-pair undirected graphs of n nodes and 10 n
edges, weights 1-100. The device time is the whole call with the edge list already resident
("resident", the definition of the table above), which still includes the device build of the
simple symmetric graph and the result readback; "cold" releases the snapshot first, so it adds the
upload. Load average (1, 5, 15 minutes) on 32 hardware threads: Chromium 4.3 / 6.8 / 8.9 before
and 4.4 / 5.1 / 7.5 after the run tabled here, and 6.4 / 7.5 / 9.2 to 4.7 / 7.0 / 9.0 for a first
Chromium run whose speedups are given in brackets; Node 7.3 / 11.1 / 10.7 to 7.5 / 7.8 / 9.3.

The CPU baselines are the ones this record used. Triangles: the CSR sorted-intersection reference
of `cpu-measurements.md` (the package has no CPU triangle count), verbatim. Label propagation: the
package has no indexed port, so two baselines are timed. "port" is a typed-array CSR label
propagation with exactly the device's rules (weighted mode of the neighbours' labels, lowest label
on a tie, synchronous, down-only on even passes and up-only on odd ones, stop after two still
passes); its labels were IDENTICAL to the device's at every size, so both arms do the same work.
"model" is this record's estimate of a port, six indexed PageRank-100 calls, measured and scaled
to the passes the device ran. Both algorithms converge in a data-dependent number of passes (the
device checks every 8), so the pass count is printed; a size that ran to the 100-pass cap costs
three times one that converged in 27.

Chromium, the run tabled (ms, medians):

| nodes | triangles cpu | triangles gpu resident / cold | speedup resident [first run] | lpa passes cpu / gpu | lpa port | lpa model | lpa gpu resident | speedup vs port [first run] | speedup vs model |
| ----: | ------------: | ----------------------------: | ---------------------------: | -------------------: | -------: | --------: | ---------------: | --------------------------: | ---------------: |
|  1.0k |           1.0 |                     5.9 / 5.9 |                0.17x [0.16x] |              20 / 24 |      2.1 |       4.6 |             11.5 |               0.18x [0.17x] |            0.40x |
|  2.0k |           1.8 |                     5.6 / 5.7 |                0.32x [0.33x] |              29 / 32 |      4.9 |       7.9 |             14.7 |               0.33x [0.37x] |            0.54x |
|  3.0k |           2.7 |                     5.5 / 5.7 |                0.49x [0.47x] |              27 / 32 |      6.6 |      12.5 |             13.2 |               0.50x [0.50x] |            0.95x |
|  4.0k |           3.6 |                     5.8 / 6.0 |                        0.62x |              35 / 40 |     11.6 |      21.1 |             15.7 |                       0.74x |            1.35x |
|  5.0k |           4.6 |                     5.8 / 6.0 |                0.79x [0.74x] |            100 / 100 |     42.0 |      69.6 |             35.4 |               1.19x [1.15x] |            1.97x |
|  7.0k |           6.4 |                     6.0 / 6.3 |                1.07x [1.02x] |              27 / 32 |     16.5 |      44.0 |             14.8 |               1.11x [1.19x] |            2.97x |
|   10k |           9.2 |                     6.2 / 6.5 |                1.48x [1.42x] |            100 / 100 |     90.1 |     141.0 |             35.2 |               2.56x [2.55x] |            4.01x |
|   20k |          18.6 |                    7.3 / 11.0 |                2.55x [2.12x] |            100 / 100 |    188.9 |     300.0 |             37.9 |               4.98x [5.09x] |            7.92x |
|   50k |          50.2 |                   14.2 / 23.5 |                3.54x [3.82x] |            100 / 100 |    494.7 |   1,069.8 |             85.3 |               5.80x [5.71x] |           12.54x |
|  100k |         100.5 |                   22.5 / 51.9 |                4.47x [4.83x] |            100 / 100 |  1,016.4 |   1,539.0 |            192.4 |               5.28x [4.08x] |            8.00x |
|    1M |       1,653.7 |                 409.6 / 535.6 |                        4.04x |            100 / 100 | 20,721.8 |  56,646.6 |          2,829.1 |                       7.32x |           20.02x |

Node on Dawn, the same card, speedups at 1k / 1.5k / 2k / 3k / 5k / 10k / 20k / 50k / 100k / 1M:
triangles resident 0.49x / 0.74x / 0.89x / 1.35x / 1.62x / 2.42x / 3.07x / 4.05x / 3.02x / 3.84x;
label propagation against the port 0.59x / 1.16x / 1.27x / 1.79x / 4.15x / 4.54x / 6.55x / 7.99x /
4.44x / 7.54x. A Node call has a floor of about 2.2 ms for triangles and 4.5 ms for a converging
label propagation, against about 5.5 ms and 11.5-15 ms in Chromium, which is the readback round
trip this record charges at 2 ms.

What the measurement says, in Chromium on the reference card:

- **Triangle counting earns, by half the modelled margin.** Crossover 7k nodes (0.79x at 5k,
  1.02-1.07x at 7k; 7k-10k cold), against 6.6k modelled on the CPU minima. 4.5-4.8x at 100k and
  4.0x at 1M, against 9.7x and 23x modelled; the 3x point lies between 20k (2.1-2.6x) and 50k
  (3.5-3.8x). The two halves of the gap are about equal: the device call at 100k is 22.5 ms
  where the model predicted 14.7 ms, and the CPU reference ran in 100.5 ms where the record's
  minimum was 142 ms (a quieter box). The record gated triangles on a merge step at or under
  1.9 ns; the measured 100k row sits between the model's assumed rate (9.7x) and its pessimistic
  bracket (2.3x) and above the 3x line, so the class stands. In Node the crossover is between 2k
  and 3k.
- **Label propagation earns, by a quarter of the modelled margin.** Against the measured port the
  crossover is between 4k (0.74x at 35 passes) and 5k (1.15-1.19x at 100 passes), against 2.5k
  modelled; 2.6x at 10k, 4.1-5.3x at 100k and 7.3x at 1M, against 4.0x / 20x / 73x modelled; the
  3x point lies between 10k and 20k. Against this record's own estimate of a port (6 x
  PageRank-100) the crossover is between 3k and 4k and the speedups 4.0x / 8.0x / 20x. The gap to
  the model has two roughly equal halves: the measured port at 100k (1,016 ms) is 1.9x faster
  than the record's estimate of one (6 x 321 ms = 1,929 ms), and the device's 100-pass call
  (192 ms) is 2.0x slower than the model's 96 ms at a 0.30 ns/arc group-by, though inside its
  297 ms at the 1.3 ns/arc bracket. In Node the crossover is
  between 1k and 1.5k.

Both are routed nowhere yet: graphty-element has no triangle-count algorithm, and its label
propagation calls `@graphty/algorithms`' seeded randomised implementation with no accelerator, so
there is no element floor to set. When the element routes either, these crossovers -- 7,000 nodes
for triangles, 5,000 for label propagation -- are the floors, and label propagation also needs
the element to accept the device's deterministic rule in place of the seeded one.

### The element's floors re-measured against the 3.0 ports (2026-09-30)

The earlier floors in graphty-element were set against the CPU code the element ran before the
algorithms 3.0 migration (pull request #607). That code ran on a Map-based object graph. The new
CPU ports run on the typed-array snapshot and are much faster: PageRank on 10,000 nodes now takes
3 to 5 ms. This section re-measures every floor the element carries against those ports. It also
measures the four capabilities the element routes for the first time: betweenness, all-pairs
shortest paths, triangle counting and label propagation.

**Method.** The runs used headless Chromium on the RTX 4070 SUPER, through ANGLE's Vulkan
backend with the extracted libEGL on `LD_LIBRARY_PATH`. The browser project required the NVIDIA
adapter, so SwiftShader could not stand in for the card. Both arms go through
`@graphty/algorithms`' dispatcher with the element's default options. The CPU arm is
`accelerated(null)`, the index-based port. The device arm is `accelerated(createAccelerator(ctx))`.
So each arm includes what the element's run includes on that path, including the dispatcher's
post-processing of an accelerator's result. The graphs are seeded random graphs of n nodes. Up to
50,000 nodes they have ten edges a node, capped at the 100,000 edges the element holds. Past that
they have ten edges a node, to find the kernel's own crossover. Every graph is undirected except
PageRank's and HITS's, which are directed, as the element runs them. Katz was also run on graphs
with one edge a node and on a 200-wide grid. At the default `alpha` the dispatcher sends Katz to
the device only where the series provably converges (`alpha` squared times the largest product of
two neighbours' degrees below 1) and the in-degrees are uneven: sparse and bounded-degree graphs,
such as those two. On ten edges a node it stayed on the CPU at every size, marked "(CPU)" below.

Each size ran the arms interleaved, flipping the order every round. One discarded pass of each arm
came first; it also uploads the graph. The table gives medians of 15 rounds. Sizes above 20,000
nodes had 9 rounds, and sizes where one CPU pass took over a second had 5. "GPU" is the call with
the graph already resident, which is what a second run in the element sees. "Cold" releases the
graph first, so the upload is inside the number.

There were three full sweeps. The one-minute load average read 3.4 before and 9.6 after the first,
12.6 and 8.8 around the second, and 7.5 and 8.2 around the third, on 32 hardware threads. Two
things were competing for the machine. Other sessions were running browser test suites, one of
them with a Chromium GPU process at 256 percent CPU, sharing both the processor and the card. A
long-running `rerun` server held one core. A CPU median moved by up to 2x between sweeps
(PageRank at 50,000 nodes: 17.9, 39.2 and 18.0 ms). The interleaved ratio mostly held, because
both arms of a round ran under the same interference. The script, the three logs and the table
generator are in `tmp/feat-element-route-new-gpu/` of the main checkout (`zz-floors.test.ts`,
`sweep1.log` to `sweep3.log`, `floors.py`).

**The floor rule.** A floor is the smallest measured node count from which the device's median
beat the CPU port's at every measured size, graph shape and sweep at or above it. Only graphs the
element can hold count: at most 100,000 edges up to 50,000 nodes. A single size that won under
one load and lost under another is below the floor. So is a size that won at one density and lost
at another. The shapes are few -- uniform random graphs, plus the sparse and grid Katz graphs -- so
a graph unlike them can cross over elsewhere.

| capability                     | floor   | was     | the bracket                                                                                         |
| ------------------------------ | ------- | ------- | --------------------------------------------------------------------------------------------------- |
| all-pairs shortest paths       | 300     | --      | 0.88x to 1.30x at 256, 1.19x to 1.90x at 300; 3.8x at the 5,792-node bound                          |
| betweenness, exact and sampled | 400     | --      | exact 0.95x to 1.07x at 300, 1.38x to 1.40x at 400; also 500,000 source-edges (below)               |
| closeness, exact and sampled   | 4,000   | 5,800   | sampled 0.96x at 3,000; both 1.3x to 1.7x at 4,000; also 1,000,000 source-edges (below)             |
| PageRank                       | 10,000  | 50,000  | 0.56x to 0.86x at 5,000, 1.04x to 1.55x at 10,000                                                   |
| HITS                           | 15,000  | 15,000  | 0.59x to 0.78x at 10,000, 1.10x at 15,000                                                           |
| Katz                           | 100,000 | 28,000  | one edge a node: 1.23x to 1.46x at 50,000; 200-wide grid: 0.51x to 0.79x at 50,000, 1.4x at 100,000 |
| eigenvector                    | 100,000 | 28,000  | loses at every size the element holds (0.74x at best); 1.4x to 1.6x at 50,000 on ten edges a node   |
| BFS                            | 100,000 | 141,000 | 0.25x to 0.34x at 50,000 / 100,000, 0.68x to 0.74x at 50,000 / 500,000; 1.02x to 1.63x at 100,000   |
| SSSP                           | 100,000 | 107,000 | 0.74x to 1.47x at 50,000; 1.76x to 2.73x at 100,000                                                 |
| connected components           | 100,000 | 132,000 | 0.29x to 0.55x at 50,000 / 100,000; 1.59x to 3.92x at 100,000                                       |
| triangle count                 | 100,000 | --      | 1.15x to 1.34x at 10,000, but 0.81x to 0.92x at 50,000 / 100,000; 2.61x to 4.27x at 100,000         |
| label propagation              | 100,000 | --      | 1.1x to 2.8x at 5,000 to 20,000, but 0.51x to 0.59x at 50,000 / 100,000; 3.0x to 4.3x at 100,000    |

What this settles:

- **Betweenness and all-pairs shortest paths route inside the element, from a few hundred
  nodes.** Both cost enough CPU work per node that the device's fixed cost is paid back early.
  Exact betweenness at 5,000 nodes is 4.1 to 4.4 s on the CPU port and 0.2 to 0.4 s on the device.
  Chromium's readback round trip lifts the all-pairs crossover from the 64 to 72 measured in Node
  to about 300.
- **PageRank's floor falls from 50,000 to 10,000, and closeness's from 5,800 to 4,000.** The ports
  are faster, but the device gained more. On these graphs PageRank converges in a few iterations,
  and the device call stays flat at about 3 ms up to 50,000 nodes.
- **Eigenvector and Katz floors rise.** Eigenvector loses at every size the element holds. Katz
  crosses at 50,000 on one edge a node, but on a grid, which the dispatcher also sends to the
  device, it still loses at 50,000 (0.51x to 0.79x) and wins from 100,000 (1.36x to 1.45x, 2.2x at
  200,000). So its floor is 100,000, above the ceiling. The old figures were interpolated from
  kernel timings against an estimated port.
- **A sampled betweenness or closeness is floored on sources times edges as well.** The node
  floors above were measured with 100 sources. The device's cost of a sampled run is a few
  milliseconds almost whatever the size, while the CPU port's grows with the sources times the
  edges, so with ten sources the device lost where with a hundred it won. A second sweep ran 1, 3,
  10, 30 and 100 sources on 400 to 50,000 nodes (element shape, two sweeps, load averages 4.3 to
  6.1). Betweenness won in every run of 500,000 source-edges or more (1.5x to 9x); below that it
  lost everywhere except 300,000 to 400,000 on 10,000 nodes or more. Closeness, on 4,000 nodes or
  more, won in every run of 1,000,000 or more (1.2x to 7x) and lost below it except three sources
  on 50,000 nodes. So a run must clear the node floor and the source-edge floor, and an exact run
  counts every node as a source. The script and logs are `zz-sampled-floors.test.ts`,
  `sampled1.log` and `sampled2.log`, beside the others; the Katz grid runs are
  `zz-katz-floors.test.ts`, `katz1.log` and `katz2.log`.
- **BFS, SSSP and connected components still cross only above the 50,000-node ceiling**, between
  50,000 and 100,000 nodes, a little lower than before. The cold call, which pays the upload,
  still loses at every measured size up to 500,000 nodes for BFS and connected components: the
  upload costs more than the traversal. So the resident floor is the best case, reached on the
  second run over a graph.
- **Triangle counting and label propagation earn on dense graphs and lose on sparse ones inside
  the ceiling, so they are floored above it.** At 10,000 to 20,000 nodes on ten edges a node,
  the device wins. At 50,000 nodes on the element's 100,000-edge limit, two edges a node, it loses.
  The triangle count loses because the CPU port finishes in 6 ms and the device call costs 7 to
  8 ms. Label propagation loses because the CPU port converged in 10 passes (22 ms) while the
  device call took 38 to 42 ms, two to three times its time at 10,000 to 20,000 nodes on the same
  edge count. The device's result carries no pass count, so how many passes it ran is inferred from
  its time, not measured. A floor keyed on the node count alone cannot separate those shapes.
  One keyed on the edge count, or on edges per node, could, and it would route both inside the
  ceiling on dense graphs. Until then they reach the device only above 100,000 nodes, or through
  `acceleration.minNodes` or `acceleration="required"`.
  Superseded for the triangle count on 2026-10-01: it is now floored on edges times edges per
  node; label propagation keeps its node floor. See "Edge-aware floors (2026-10-01)" below.
- **Katz on a released snapshot throws.** The cold arm found it: after `release(s)`, the
  device's `katzCentrality` fails with `E_RELEASED` where every other algorithm uploads the graph
  again. Issue #623. The Katz rows below have no cold column.

**Label propagation's two definitions.** The element now defaults to no seed, which runs
synchronous passes: every node takes the lowest of its neighbours' best-voted labels, all at once,
with passes alternating between moving labels only up and only down. That is the device's rule.
Below the floor, and with no accelerator, the CPU runs the same rule through the dispatcher's new
`labelPropagationSynchronous`, which calls the port of that name. The two differ in three details:
which direction the first pass moves, whether a node keeps a label tied for the lead, and when a
run that never settles stops. The CPU port notices when a pass returns the labels of two passes
before, stops there and reports `converged: false`; the device runs to `maxIterations` and returns
whichever half of the cycle that lands on, with no `converged` flag, so the element cannot report
the non-convergence on that path. On tied votes they can therefore settle on different, equally
valid partitions. On planted partitions they
agree (adjusted Rand index at least 0.9, webgpu-graph-algorithms' own differential). A caller who
sets `randomSeed` gets the seeded asynchronous (FLPA) partition. No GPU kernel implements that, so
it always runs on the CPU and is refused under `acceleration="required"`.

**Triangle counting's CPU side** did not exist before this change. It is `triangleCount` in
`@graphty/algorithms`: orient each edge up the (degree, index) order and intersect the oriented
rows. It returns the per-node counts, the local clustering coefficient and the transitivity,
matching networkx on karate (45 triangles, transitivity 0.2557, average clustering 0.5706). The
dispatcher routes it to the device and keeps the device's coefficient and transitivity when the
device returns them. The element publishes it as the `clustering-coefficient` algorithm, the key
issue #330 reserved.

The full measurements:

| algorithm                      | nodes / edges       | CPU ms | GPU ms | GPU cold ms | speedup, sweeps 1 / 2 / 3               |
| ------------------------------ | ------------------- | -----: | -----: | ----------: | --------------------------------------- |
| betweenness, exact             | 100 / 1,000         |    1.7 |    7.5 |         7.5 | 0.17x / 0.18x / 0.23x                   |
| betweenness, exact             | 200 / 2,000         |    5.8 |   12.2 |        12.2 | 0.43x / 0.47x / 0.48x                   |
| betweenness, exact             | 300 / 3,000         |   16.1 |   15.1 |        14.8 | -- / 0.95x / 1.07x                      |
| betweenness, exact             | 400 / 4,000         |   28.6 |   20.7 |        19.6 | -- / 1.40x / 1.38x                      |
| betweenness, exact             | 500 / 5,000         |   47.8 |   22.9 |        22.3 | 1.85x / 1.95x / 2.09x                   |
| betweenness, exact             | 1,000 / 10,000      |  147.2 |   41.0 |        40.3 | 3.31x / 3.39x / 3.59x                   |
| betweenness, exact             | 2,000 / 20,000      |  553.0 |   81.3 |        81.4 | 6.19x / 6.71x / 6.80x                   |
| betweenness, exact             | 5,000 / 50,000      |  4,375 |  219.2 |       198.6 | 11.09x / 11.73x / 19.96x                |
| betweenness, 100 sources       | 200 / 2,000         |    3.0 |    7.1 |         7.2 | 0.37x / 0.47x / 0.42x                   |
| betweenness, 100 sources       | 300 / 3,000         |    5.0 |    7.3 |         7.2 | -- / 0.76x / 0.68x                      |
| betweenness, 100 sources       | 400 / 4,000         |    7.4 |    7.3 |         7.3 | -- / 1.47x / 1.01x                      |
| betweenness, 100 sources       | 500 / 5,000         |   10.1 |    7.4 |         7.4 | 1.11x / 1.43x / 1.36x                   |
| betweenness, 100 sources       | 1,000 / 10,000      |   17.5 |    7.4 |         7.3 | 1.72x / 2.25x / 2.36x                   |
| betweenness, 100 sources       | 2,000 / 20,000      |   27.3 |    7.5 |         7.3 | 2.92x / 3.41x / 3.64x                   |
| betweenness, 100 sources       | 5,000 / 50,000      |   85.6 |    7.8 |         7.9 | 9.73x / 10.11x / 10.97x                 |
| betweenness, 100 sources       | 10,000 / 100,000    |  198.0 |   10.9 |        13.4 | 8.68x / 8.81x / 18.17x                  |
| betweenness, 100 sources       | 20,000 / 100,000    |  227.5 |    9.3 |        10.8 | 8.92x / 9.86x / 24.46x                  |
| betweenness, 100 sources       | 50,000 / 100,000    |  359.6 |   12.7 |        15.0 | 14.29x / 26.21x / 28.31x                |
| betweenness, 100 sources       | 20,000 / 200,000    |  351.2 |   20.0 |        22.6 | -- / 13.80x / 17.56x                    |
| betweenness, 100 sources       | 50,000 / 500,000    |  916.4 |   30.5 |        61.3 | -- / 12.06x / 30.05x                    |
| all-pairs shortest paths       | 16 / 60             |    0.0 |    2.3 |         2.3 | 0.00x / 0.00x / 0.00x                   |
| all-pairs shortest paths       | 32 / 248            |    0.0 |    2.3 |         2.2 | 0.04x / 0.33x / 0.00x                   |
| all-pairs shortest paths       | 64 / 640            |    0.2 |    2.3 |         2.3 | 0.08x / 0.12x / 0.09x                   |
| all-pairs shortest paths       | 100 / 1,000         |    0.3 |    2.4 |         2.4 | 0.20x / 0.19x / 0.12x                   |
| all-pairs shortest paths       | 128 / 1,280         |    0.7 |    2.5 |         2.4 | 0.33x / 0.23x / 0.28x                   |
| all-pairs shortest paths       | 200 / 2,000         |    1.4 |    2.7 |         2.6 | 0.62x / 0.89x / 0.52x                   |
| all-pairs shortest paths       | 256 / 2,560         |    2.3 |    2.5 |         2.5 | 1.30x / 1.04x / 0.92x                   |
| all-pairs shortest paths       | 300 / 3,000         |    3.1 |    2.6 |         2.5 | 1.30x / 1.90x / 1.19x                   |
| all-pairs shortest paths       | 350 / 3,500         |    4.3 |    2.8 |         2.6 | 1.53x / 2.37x / 1.54x                   |
| all-pairs shortest paths       | 400 / 4,000         |    5.6 |    3.0 |         2.8 | 1.93x / 2.49x / 1.87x                   |
| all-pairs shortest paths       | 450 / 4,500         |    6.8 |    3.1 |         2.9 | 2.03x / 1.97x / 2.19x                   |
| all-pairs shortest paths       | 500 / 5,000         |    8.6 |    3.2 |         2.9 | 2.35x / 2.42x / 2.69x                   |
| all-pairs shortest paths       | 1,000 / 10,000      |   35.7 |    5.1 |         4.4 | 6.77x / 6.85x / 7.00x                   |
| all-pairs shortest paths       | 2,000 / 20,000      |  156.7 |   27.9 |        26.5 | 4.21x / 4.02x / 5.62x                   |
| all-pairs shortest paths       | 4,000 / 40,000      |  634.1 |  135.0 |       137.0 | 4.39x / 4.50x / 4.70x                   |
| all-pairs shortest paths       | 5,792 / 57,920      |  1,307 |  324.8 |       321.7 | 3.76x / 3.79x / 4.02x                   |
| triangle count                 | 500 / 5,000         |    0.5 |    5.8 |         5.5 | 0.09x / 0.09x / 0.09x                   |
| triangle count                 | 1,000 / 10,000      |    1.0 |    5.7 |         5.6 | 0.16x / 0.15x / 0.18x                   |
| triangle count                 | 2,000 / 20,000      |    1.9 |    5.5 |         5.6 | 0.30x / 0.31x / 0.35x                   |
| triangle count                 | 5,000 / 50,000      |    5.5 |    7.1 |         7.5 | 0.69x / 0.72x / 0.77x                   |
| triangle count                 | 10,000 / 100,000    |    9.5 |    7.1 |         7.1 | 1.15x / 1.31x / 1.34x                   |
| triangle count                 | 20,000 / 100,000    |    6.7 |    7.1 |         7.1 | 0.96x / 1.05x / 0.94x                   |
| triangle count                 | 50,000 / 100,000    |    6.5 |    7.1 |         7.0 | 0.91x / 0.81x / 0.92x                   |
| triangle count                 | 20,000 / 200,000    |   18.6 |    7.4 |         7.6 | -- / 2.51x / 2.51x                      |
| triangle count                 | 50,000 / 500,000    |   48.1 |   13.5 |        18.4 | -- / 2.68x / 3.56x                      |
| triangle count                 | 100,000 / 1,000,000 |  103.6 |   32.3 |        42.4 | 4.27x / 2.61x / 3.21x                   |
| triangle count                 | 200,000 / 2,000,000 |  231.7 |   47.3 |        80.5 | 3.43x / 5.28x / 4.90x                   |
| triangle count                 | 500,000 / 5,000,000 |  661.4 |  120.7 |       218.3 | 5.83x / 4.66x / 5.48x                   |
| label propagation, synchronous | 500 / 5,000         |    0.9 |    8.0 |         7.9 | 0.10x / 0.11x / 0.11x                   |
| label propagation, synchronous | 1,000 / 10,000      |    1.9 |    8.2 |         8.1 | 0.28x / 0.24x / 0.23x                   |
| label propagation, synchronous | 2,000 / 20,000      |    3.6 |    8.2 |         8.2 | 0.42x / 0.42x / 0.44x                   |
| label propagation, synchronous | 3,000 / 30,000      |    8.1 |    8.3 |         8.5 | -- / 0.87x / 0.98x                      |
| label propagation, synchronous | 4,000 / 40,000      |   10.4 |   12.0 |        11.9 | -- / 0.81x / 0.87x                      |
| label propagation, synchronous | 5,000 / 50,000      |   14.4 |    9.5 |         8.8 | 1.56x / 1.26x / 1.52x                   |
| label propagation, synchronous | 10,000 / 100,000    |   35.8 |   12.6 |        12.6 | 2.45x / 2.61x / 2.84x                   |
| label propagation, synchronous | 20,000 / 100,000    |   19.4 |   15.5 |        15.9 | 1.17x / 1.12x / 1.25x                   |
| label propagation, synchronous | 50,000 / 100,000    |   21.9 |   37.6 |        37.5 | 0.51x / 0.59x / 0.58x                   |
| label propagation, synchronous | 20,000 / 200,000    |   90.6 |   23.0 |        23.1 | -- / 3.41x / 3.94x                      |
| label propagation, synchronous | 50,000 / 500,000    |  278.0 |   28.9 |        39.7 | -- / 5.17x / 9.62x                      |
| label propagation, synchronous | 100,000 / 1,000,000 |  198.8 |   46.8 |        64.8 | -- / 3.03x / 4.25x                      |
| label propagation, synchronous | 200,000 / 2,000,000 |  392.2 |   86.6 |       118.7 | -- / 4.45x / 4.53x                      |
| PageRank                       | 500 / 5,000         |    0.3 |    2.7 |         2.7 | 0.11x / 0.10x / 0.11x                   |
| PageRank                       | 1,000 / 10,000      |    0.2 |    2.4 |         2.4 | 0.11x / 0.16x / 0.08x                   |
| PageRank                       | 2,000 / 20,000      |    0.5 |    2.5 |         2.5 | 0.30x / 0.28x / 0.20x                   |
| PageRank                       | 5,000 / 50,000      |    1.4 |    2.5 |         2.6 | 0.86x / 0.76x / 0.56x                   |
| PageRank                       | 10,000 / 100,000    |    3.0 |    2.7 |         2.6 | 1.04x / 1.55x / 1.11x                   |
| PageRank                       | 15,000 / 100,000    |    4.4 |    2.8 |         2.7 | -- / 2.94x / 1.57x                      |
| PageRank                       | 20,000 / 100,000    |    6.0 |    2.9 |         2.8 | 2.10x / 2.92x / 2.07x                   |
| PageRank                       | 50,000 / 100,000    |   18.0 |    3.4 |         3.2 | 5.11x / 10.05x / 5.29x                  |
| PageRank                       | 20,000 / 200,000    |    5.7 |    3.3 |         3.4 | -- / 2.55x / 1.73x                      |
| PageRank                       | 50,000 / 500,000    |   15.1 |    3.7 |         9.0 | -- / 5.46x / 4.08x                      |
| PageRank                       | 100,000 / 1,000,000 |   32.2 |    3.9 |         8.8 | 8.41x / 12.11x / 8.26x                  |
| PageRank                       | 200,000 / 2,000,000 |   82.9 |    3.9 |        14.0 | 18.70x / 16.02x / 21.26x                |
| PageRank                       | 500,000 / 5,000,000 |  260.2 |    7.2 |        55.7 | 10.55x / 21.46x / 36.14x                |
| HITS                           | 500 / 5,000         |    0.5 |   10.3 |        10.1 | 0.06x / 0.03x / 0.05x                   |
| HITS                           | 1,000 / 10,000      |    0.7 |   10.4 |        10.5 | 0.12x / 0.08x / 0.07x                   |
| HITS                           | 2,000 / 20,000      |    1.4 |   10.5 |        10.5 | 0.12x / 0.14x / 0.13x                   |
| HITS                           | 5,000 / 50,000      |    3.3 |   10.3 |        10.7 | 0.30x / 0.42x / 0.32x                   |
| HITS                           | 10,000 / 100,000    |    6.3 |   10.7 |        10.5 | 0.65x / 0.78x / 0.59x                   |
| HITS                           | 15,000 / 100,000    |   11.8 |   10.7 |        10.8 | -- / 1.11x / 1.10x                      |
| HITS                           | 20,000 / 100,000    |   30.6 |   11.5 |        11.0 | 2.24x / 2.22x / 2.66x                   |
| HITS                           | 50,000 / 100,000    |  122.8 |   68.6 |        70.2 | 2.65x / 1.72x / 1.79x                   |
| HITS                           | 20,000 / 200,000    |   12.4 |   12.6 |        12.0 | -- / 1.01x / 0.98x                      |
| HITS                           | 50,000 / 500,000    |   33.8 |    8.3 |        16.6 | -- / 3.57x / 4.07x                      |
| HITS                           | 100,000 / 1,000,000 |   61.5 |    9.6 |        15.5 | -- / 4.38x / 6.41x                      |
| Katz                           | 500 / 5,000         |    2.1 |    2.2 |         2.2 | 0.95x (CPU) / -- / --                   |
| Katz                           | 1,000 / 10,000      |    1.4 |    1.4 |         1.5 | 0.98x (CPU) / 0.93x (CPU) / 1.00x (CPU) |
| Katz                           | 2,000 / 20,000      |    8.7 |    8.9 |         8.9 | 0.98x (CPU) / -- / --                   |
| Katz                           | 5,000 / 50,000      |   10.6 |   11.0 |        11.2 | 0.96x (CPU) / -- / --                   |
| Katz                           | 10,000 / 100,000    |   18.7 |   19.8 |        20.0 | 0.93x (CPU) / 0.95x (CPU) / 0.94x (CPU) |
| Katz                           | 20,000 / 100,000    |   31.3 |   33.4 |        33.3 | 0.94x (CPU) / -- / --                   |
| Katz                           | 50,000 / 100,000    |   15.3 |   17.0 |        16.8 | 0.90x (CPU) / -- / --                   |
| Katz, one edge a node          | 500 / 500           |    0.1 |    4.8 |          -- | -- / 0.00x / 0.02x                      |
| Katz, one edge a node          | 1,000 / 1,000       |    0.1 |    4.7 |          -- | -- / 0.02x / 0.02x                      |
| Katz, one edge a node          | 2,000 / 2,000       |    0.2 |    4.7 |          -- | -- / 0.04x / 0.04x                      |
| Katz, one edge a node          | 5,000 / 5,000       |    1.0 |    5.4 |          -- | -- / 0.14x / 0.19x                      |
| Katz, one edge a node          | 10,000 / 10,000     |    1.6 |    5.6 |          -- | -- / 0.32x / 0.29x                      |
| Katz, one edge a node          | 20,000 / 20,000     |    3.5 |    5.6 |          -- | -- / 0.57x / 0.62x                      |
| Katz, one edge a node          | 50,000 / 50,000     |    9.2 |    7.2 |          -- | -- / 1.23x / 1.28x                      |
| Katz, one edge a node          | 100,000 / 100,000   |   19.5 |    9.4 |          -- | -- / 1.97x / 2.07x                      |
| Katz, one edge a node          | 200,000 / 200,000   |   39.1 |   14.6 |          -- | -- / 2.81x / 2.68x                      |
| eigenvector                    | 500 / 5,000         |    0.2 |    4.9 |         4.8 | 0.04x / 0.04x / 0.04x                   |
| eigenvector                    | 1,000 / 10,000      |    0.3 |    4.8 |         4.8 | 0.06x / 0.08x / 0.06x                   |
| eigenvector                    | 2,000 / 20,000      |    0.6 |    5.0 |         5.0 | 0.12x / 0.12x / 0.12x                   |
| eigenvector                    | 5,000 / 50,000      |    1.7 |    5.3 |         5.2 | 0.30x / 0.32x / 0.32x                   |
| eigenvector                    | 10,000 / 100,000    |    3.2 |    6.3 |         6.1 | 0.50x / 0.52x / 0.51x                   |
| eigenvector                    | 20,000 / 100,000    |    6.7 |    9.1 |         8.8 | 0.68x / 0.73x / 0.74x                   |
| eigenvector                    | 50,000 / 100,000    |   29.4 |   29.7 |        29.6 | 0.94x (CPU) / 0.96x (CPU) / 0.99x (CPU) |
| eigenvector                    | 20,000 / 200,000    |    6.8 |    7.3 |         7.4 | -- / 0.85x / 0.93x                      |
| eigenvector                    | 50,000 / 500,000    |   16.1 |   10.0 |        13.2 | -- / 1.37x / 1.61x                      |
| eigenvector                    | 100,000 / 1,000,000 |   31.1 |   16.9 |        23.8 | -- / 1.80x / 1.84x                      |
| eigenvector                    | 200,000 / 2,000,000 |   64.7 |   36.4 |        60.5 | -- / 1.32x / 1.78x                      |
| eigenvector                    | 500,000 / 5,000,000 |  172.7 |   92.4 |       150.9 | -- / 1.20x / 1.87x                      |
| BFS                            | 500 / 5,000         |    0.0 |    5.7 |         5.9 | 0.01x / 0.00x / 0.00x                   |
| BFS                            | 1,000 / 10,000      |    0.0 |    6.2 |         6.0 | 0.01x / 0.02x / 0.00x                   |
| BFS                            | 2,000 / 20,000      |    0.2 |    6.1 |         6.2 | 0.03x / 0.02x / 0.03x                   |
| BFS                            | 5,000 / 50,000      |    0.3 |    6.1 |         6.2 | 0.07x / 0.05x / 0.05x                   |
| BFS                            | 10,000 / 100,000    |    0.6 |    6.4 |         6.4 | 0.14x / 0.10x / 0.09x                   |
| BFS                            | 20,000 / 100,000    |    0.9 |    6.5 |         6.5 | 0.19x / 0.13x / 0.14x                   |
| BFS                            | 50,000 / 100,000    |    2.0 |    6.9 |         7.0 | 0.34x / 0.25x / 0.29x                   |
| BFS                            | 20,000 / 200,000    |    1.3 |    6.1 |         6.1 | -- / 0.20x / 0.21x                      |
| BFS                            | 50,000 / 500,000    |    6.2 |    9.1 |        15.5 | -- / 0.74x / 0.68x                      |
| BFS                            | 100,000 / 1,000,000 |    8.2 |    8.0 |        11.5 | 1.04x / 1.63x / 1.02x                   |
| BFS                            | 200,000 / 2,000,000 |   20.3 |    9.5 |        31.9 | 2.11x / 2.29x / 2.14x                   |
| BFS                            | 500,000 / 5,000,000 |  102.1 |   13.4 |        72.3 | 3.27x / 2.81x / 7.62x                   |
| SSSP                           | 500 / 5,000         |    0.1 |    6.1 |         6.2 | 0.02x / 0.01x / 0.02x                   |
| SSSP                           | 1,000 / 10,000      |    0.1 |    6.3 |         6.5 | 0.02x / 0.01x / 0.02x                   |
| SSSP                           | 2,000 / 20,000      |    0.2 |    5.8 |         6.2 | 0.04x / 0.05x / 0.03x                   |
| SSSP                           | 5,000 / 50,000      |    0.6 |    6.0 |         6.2 | 0.09x / 0.10x / 0.10x                   |
| SSSP                           | 10,000 / 100,000    |    1.2 |    5.9 |         6.0 | 0.24x / 0.18x / 0.20x                   |
| SSSP                           | 20,000 / 100,000    |    1.9 |    6.2 |         6.5 | 0.38x / 0.28x / 0.31x                   |
| SSSP                           | 50,000 / 100,000    |    5.1 |    6.9 |         7.0 | 0.99x / 1.47x / 0.74x                   |
| SSSP                           | 20,000 / 200,000    |    2.5 |    6.9 |         7.2 | -- / 0.47x / 0.36x                      |
| SSSP                           | 50,000 / 500,000    |    6.7 |    8.9 |        15.3 | -- / 1.02x / 0.75x                      |
| SSSP                           | 100,000 / 1,000,000 |   15.8 |    9.0 |        12.5 | 2.73x / 2.24x / 1.76x                   |
| SSSP                           | 200,000 / 2,000,000 |   42.7 |   10.1 |        31.5 | 7.16x / 3.23x / 4.23x                   |
| SSSP                           | 500,000 / 5,000,000 |  133.3 |   14.7 |        62.7 | 4.33x / 11.49x / 9.07x                  |
| connected components           | 500 / 5,000         |    0.1 |    6.8 |         6.8 | 0.00x / 0.03x / 0.01x                   |
| connected components           | 1,000 / 10,000      |    0.3 |    4.6 |         4.8 | 0.04x / 0.43x / 0.07x                   |
| connected components           | 2,000 / 20,000      |    0.4 |    2.7 |         2.8 | 0.19x / 0.21x / 0.15x                   |
| connected components           | 5,000 / 50,000      |    0.6 |    2.6 |         4.9 | 0.22x / 0.43x / 0.23x                   |
| connected components           | 10,000 / 100,000    |    1.3 |    4.6 |         5.0 | 0.48x / 0.84x / 0.28x                   |
| connected components           | 20,000 / 100,000    |    1.5 |    6.9 |         7.1 | 0.56x / 0.82x / 0.22x                   |
| connected components           | 50,000 / 100,000    |    2.2 |    7.6 |         7.8 | 0.51x / 0.55x / 0.29x                   |
| connected components           | 20,000 / 200,000    |    2.6 |    5.2 |         5.7 | -- / 1.26x / 0.50x                      |
| connected components           | 50,000 / 500,000    |    7.4 |    7.7 |        13.8 | -- / 2.03x / 0.96x                      |
| connected components           | 100,000 / 1,000,000 |   14.3 |    9.0 |        19.7 | 3.92x / 3.01x / 1.59x                   |
| connected components           | 200,000 / 2,000,000 |   29.4 |    8.9 |        46.4 | 3.06x / 5.05x / 3.30x                   |
| connected components           | 500,000 / 5,000,000 |   84.0 |   22.1 |       145.6 | 2.66x / 2.97x / 3.80x                   |
| closeness, exact               | 200 / 2,000         |    1.4 |   19.7 |        20.2 | 0.10x / 0.10x / 0.07x                   |
| closeness, exact               | 500 / 5,000         |    9.4 |   49.2 |        48.7 | 0.26x / 0.22x / 0.19x                   |
| closeness, exact               | 1,000 / 10,000      |   36.6 |   94.5 |        97.5 | 0.38x / 0.45x / 0.39x                   |
| closeness, exact               | 2,000 / 20,000      |  159.2 |  187.1 |       189.7 | 0.81x / 0.88x / 0.85x                   |
| closeness, exact               | 3,000 / 30,000      |  375.7 |  301.3 |       296.5 | -- / 1.29x / 1.25x                      |
| closeness, exact               | 4,000 / 40,000      |  677.9 |  400.7 |       398.5 | -- / 1.72x / 1.69x                      |
| closeness, exact               | 5,000 / 50,000      |  1,036 |  465.6 |       462.8 | 2.22x / 2.10x / 2.23x                   |
| closeness, exact               | 10,000 / 100,000    |  4,615 |  968.0 |       983.1 | 4.31x / 3.96x / 4.77x                   |
| closeness, 100 sources         | 500 / 5,000         |    2.1 |   13.0 |        12.8 | 0.21x / 0.15x / 0.16x                   |
| closeness, 100 sources         | 1,000 / 10,000      |    3.9 |   13.0 |        12.7 | 0.33x / 0.30x / 0.30x                   |
| closeness, 100 sources         | 2,000 / 20,000      |   10.5 |   13.7 |        13.0 | 0.74x / 0.66x / 0.77x                   |
| closeness, 100 sources         | 3,000 / 30,000      |   12.1 |   12.5 |        12.5 | -- / 0.96x / 0.97x                      |
| closeness, 100 sources         | 4,000 / 40,000      |   16.5 |   12.5 |        12.6 | -- / 1.33x / 1.32x                      |
| closeness, 100 sources         | 5,000 / 50,000      |   20.5 |   13.8 |        14.4 | 1.52x / 1.81x / 1.49x                   |
| closeness, 100 sources         | 10,000 / 100,000    |   44.0 |   12.5 |        12.5 | 3.35x / 3.67x / 3.52x                   |
| closeness, 100 sources         | 20,000 / 100,000    |   69.7 |   13.8 |        14.1 | 4.81x / 4.09x / 5.05x                   |
| closeness, 100 sources         | 50,000 / 100,000    |  178.4 |   14.8 |        15.1 | 8.50x / 6.83x / 12.05x                  |

### Edge-aware floors (2026-10-01)

The 2026-09-30 floors left the triangle count (which the clustering coefficient runs on) and
label propagation at 100,000 nodes, above the element's 50,000-node ceiling, because both won on
dense graphs and lost on sparse ones and a node count cannot tell the two apart. This section
measures whether a floor that also reads the edge count can. Issue #678.

**Method.** The same as the 2026-09-30 sweep: headless Chromium on the RTX 4070 SUPER through
ANGLE's Vulkan backend (the NVIDIA adapter required, so SwiftShader could not stand in), both arms
through `@graphty/algorithms`' dispatcher with the element's options -- `accelerated(null)` for the
CPU port, `accelerated(createAccelerator(ctx))` for the device -- arms interleaved with the order
flipped every round, one discarded pass of each first, medians of 15 rounds (9 above 20,000
nodes). "Device" is the call with the graph resident; the cold call, which releases it first, read
within noise of it at every size here. The graphs stay inside what the element holds (at most
50,000 nodes and 100,000 edges): seeded uniform random graphs of 2, 3, 5, 10 and 20 edges a node at
500 to 50,000 nodes, 40 and 100 edges a node on 500 to 2,500 nodes, boundary shapes of 12, 15, 25,
30, 40 and 60 edges a node placed near the floor, and two R-MAT graphs (edge factors 4 and 8,
self-loops and repeats dropped) for skewed degrees. Seven sweeps of the triangle count, three of
label propagation and connected components. One-minute load averages on 32 threads were 10.6 to
29.1 around five of the sweeps; the fourth and fifth started at 28.4 and 28.9 and ended at 38.6
and 34.1, other sessions' pre-push gates having started meanwhile. The floor below does not depend
on those two: every loss it rests on also appears in a sweep that stayed under 30. The script,
logs and table generator are in `tmp/edge-aware-floors/` of the main checkout
(`zz-edge-floors.test.ts`, `sweep1.log` to `sweep7.log`, `analyze.py`).

**Triangle count: floored on edges times edges per node, 1,080,000.** The device call costs 6 to
15 ms almost whatever the graph inside the ceiling. The CPU port's cost grows with the edges and
with the neighbors each node intersects, so the measure that separates the two is edges times
edges per node (edges squared over nodes). The edge count alone does not: two edges a node at
100,000 edges is a toss-up (0.92x to 1.30x) while twenty a node wins at 60,000. A wedge count
from the degrees does not either: the R-MAT graphs win with fewer wedges than uniform graphs that
lose. Every graph at or above 1,080,000 won in every sweep (1.11x to 9.3x). Around 1,000,000 the
graphs won in most sweeps and lost in some (0.93x at 1,008,000, 0.96x at 1,000,000, 0.98x at
1,012,500), so the floor is 1,080,000: as for the node floors, the smallest measured value at and
above which every graph won, since nothing between it and those losses was measured. Because it
routes runs inside the ceiling, the first run on a freshly loaded graph (the cold call, which pays
the upload) matters too, and it holds there as well: 1.06x to 10.7x at and above the floor. That
routes a 100,000-edge graph of up to 9,259 nodes, a 40,000-edge graph of up to 1,481, and the
complete graph from 164 nodes. Skewed
graphs win below it (R-MAT 1.5x to 2x at 220,000 to 374,000); the floor leaves them on the CPU
port, a few milliseconds not saved rather than a slower run. Only the edge and node counts are
read, so the degree distribution is not needed. Rows from 170,000 up, ratios per sweep:

| shape                |  nodes |   edges | edges x edges per node | CPU port, ms | device, ms | device speedup, each sweep                     |
| -------------------- | -----: | ------: | ---------------------: | ------------ | ---------- | ---------------------------------------------- |
| R-MAT, edge factor 8 |  4,096 |  26,770 |                174,959 | 4.7-6.8      | 6.3-8.9    | 0.91 / 0.79 / 0.88 / 0.76 / 0.85 / 0.74 / 0.75 |
| 5 a node             |  7,000 |  35,000 |                175,000 | 2.7-4.2      | 6.5-8.9    | 0.42 / 0.40 / 0.46 / 0.42 / 0.43 / 0.51 / 0.45 |
| 3 a node             | 20,000 |  60,000 |                180,000 | 3.9-5.6      | 6.4-8.2    | 0.61 / 0.64 / 0.58 / 0.68 / 0.57 / 0.55 / 0.73 |
| 2 a node             | 50,000 | 100,000 |                200,000 | 7.1-18.6     | 7.3-14.3   | 0.97 / 0.92 / 1.18 / 0.94 / 1.30 / 1.07 / 1.24 |
| 10 a node            |  2,000 |  20,000 |                200,000 | 2.1-2.7      | 6.0-9.6    | 0.35 / 0.39 / 0.34 / 0.28 / 0.33 / 0.32 / 0.32 |
| 20 a node            |    500 |  10,000 |                200,000 | 1.6-2.7      | 5.5-8.7    | 0.29 / 0.29 / 0.30 / 0.26 / 0.30 / 0.31 / 0.30 |
| R-MAT, edge factor 4 | 16,384 |  59,979 |                219,573 | 10.5-18.2    | 6.7-11.4   | 1.57 / 1.19 / 1.64 / 1.60 / 1.48 / 1.43 / 1.60 |
| 5 a node             | 10,000 |  50,000 |                250,000 | 3.8-6.2      | 6.7-10.6   | 0.56 / 0.57 / 0.69 / 0.48 / 0.53 / 0.60 / 0.62 |
| 3 a node             | 30,000 |  90,000 |                270,000 | 6.0-9.3      | 7.2-9.9    | 0.83 / 1.05 / 1.05 / 0.94 / 0.94 / 0.82 / 0.83 |
| 10 a node            |  3,000 |  30,000 |                300,000 | 2.9-4.4      | 5.9-8.6    | 0.49 / 0.61 / 0.51 / 0.51 / 0.46 / 0.50 / 0.53 |
| R-MAT, edge factor 8 |  8,192 |  55,353 |                374,018 | 12.2-20.1    | 7.2-10.7   | 1.75 / 1.51 / 1.96 / 1.74 / 1.86 / 1.88 / 1.76 |
| 5 a node             | 15,000 |  75,000 |                375,000 | 5.8-8.3      | 7.5-10.6   | 0.83 / 0.77 / 0.78 / 0.74 / 0.77 / 0.84 / 0.95 |
| 20 a node            |  1,000 |  20,000 |                400,000 | 3.2-5.6      | 5.8-8.4    | 0.55 / 0.61 / 0.55 / 0.51 / 0.51 / 0.70 / 0.53 |
| 5 a node             | 20,000 | 100,000 |                500,000 | 7.1-11.8     | 7.0-10.5   | 1.01 / 0.96 / 0.92 / 1.05 / 1.00 / 1.16 / 1.26 |
| 10 a node            |  5,000 |  50,000 |                500,000 | 5.5-9.6      | 6.7-15.7   | 0.82 / 0.70 / 0.73 / 0.61 / 0.67 / 0.76 / 0.80 |
| 10 a node            |  7,000 |  70,000 |                700,000 | 6.7-9.8      | 6.5-12.1   | 1.03 / 0.98 / 1.06 / 0.81 / 0.88 / 1.07 / 1.09 |
| 20 a node            |  2,000 |  40,000 |                800,000 | 6.0-11.0     | 6.3-10.2   | 0.95 / 1.01 / 1.06 / 0.98 / 0.92 / 1.08 / 1.04 |
| 40 a node            |    500 |  20,000 |                800,000 | 6.3-10.8     | 6.4-9.8    | 1.17 / 0.86 / 1.21 / 0.96 / 0.81 / 1.12        |
| 30 a node            |  1,100 |  33,000 |                990,000 | 7.8-10.5     | 6.6-13.1   | 0.80 / 0.99 / 0.83 / 1.18                      |
| 10 a node            | 10,000 | 100,000 |              1,000,000 | 9.7-16.5     | 7.5-13.3   | 1.29 / 1.07 / 1.44 / 1.05 / 1.31 / 1.20 / 1.39 |
| 25 a node            |  1,600 |  40,000 |              1,000,000 | 9.5-10.8     | 7.1-10.5   | 1.11 / 1.05 / 0.96 / 1.34                      |
| 12 a node            |  7,000 |  84,000 |              1,008,000 | 11.7-16.7    | 7.8-13.5   | 1.27 / 1.00 / 0.93 / 1.50                      |
| 15 a node            |  4,500 |  67,500 |              1,012,500 | 9.0-20.8     | 7.6-15.7   | 1.32 / 1.10 / 0.98 / 1.18                      |
| 30 a node            |  1,200 |  36,000 |              1,080,000 | 10.2-15.8    | 7.9-11.3   | 1.40 / 1.47 / 1.24 / 1.29                      |
| 60 a node            |    300 |  18,000 |              1,080,000 | 11.0-12.2    | 7.0-10.4   | 1.36 / 1.22 / 1.11 / 1.57                      |
| 40 a node            |    700 |  28,000 |              1,120,000 | 9.1-16.1     | 6.8-10.8   | 1.77 / 1.63 / 1.31 / 1.34                      |
| 20 a node            |  3,000 |  60,000 |              1,200,000 | 9.4-15.3     | 6.6-10.7   | 1.42 / 1.13 / 1.70 / 1.24 / 1.26 / 1.35 / 1.40 |
| 40 a node            |  1,000 |  40,000 |              1,600,000 | 14.5-20.3    | 7.5-9.4    | 1.93 / 1.70 / 2.28 / 1.75 / 1.65 / 2.13        |
| 20 a node            |  5,000 | 100,000 |              2,000,000 | 16.8-22.0    | 6.8-11.7   | 2.47 / 1.88 / 2.22 / 2.16 / 1.80 / 2.15 / 2.14 |
| 40 a node            |  1,500 |  60,000 |              2,400,000 | 17.2-25.1    | 7.2-11.5   | 2.31 / 2.77 / 2.68 / 2.41 / 2.03 / 2.39        |
| 40 a node            |  2,000 |  80,000 |              3,200,000 | 22.9-39.4    | 8.3-11.6   | 2.68 / 3.46 / 3.40 / 3.28 / 3.86 / 2.76        |
| 40 a node            |  2,500 | 100,000 |              4,000,000 | 31.3-38.4    | 7.9-12.5   | 2.90 / 4.20 / 4.09 / 2.80 / 3.07 / 4.19        |
| 100 a node           |    500 |  50,000 |              5,000,000 | 41.0-59.8    | 7.3-11.6   | 4.41 / 7.67 / 5.45 / 4.69 / 4.53 / 5.62        |
| 100 a node           |    700 |  70,000 |              7,000,000 | 55.4-88.2    | 7.5-12.6   | 5.96 / 8.51 / 8.40 / 6.08 / 5.61 / 8.49        |
| 100 a node           |  1,000 | 100,000 |             10,000,000 | 77.3-110.4   | 8.3-15.9   | 7.18 / 8.48 / 8.90 / 7.25 / 6.87 / 9.31        |

**Label propagation: no edge floor holds; it keeps 100,000 nodes.** Its cost is arcs times passes,
and the passes, which nothing knows before the run, decide it. At the 100,000-edge limit the device
won in every sweep on 5 and 10 edges a node (1.43x to 4.13x) and on 40 (1.14x to 1.47x), and lost
in at least one sweep on 2 (0.87x to 1.06x) and 20 (0.94x to 1.93x). Below the limit, 40 edges a
node lost at 80,000 edges (0.93x), and a very dense graph settles in a few passes, so the CPU is
fast there: 100 edges a node lost at 50,000 edges (0.54x) and 70,000 (0.77x to 0.94x). No value of
the edge count, of edges times edges per node or of a wedge count has every measured graph above
it winning, short of the single 100,000-edge, 1,000-node row at 10,000,000. A floor that held would
be a band of densities at the edge limit, fitted to a few rows, so label propagation keeps its node
floor.

**Connected components: no change.** The device lost on every graph inside the ceiling, at every
density (0.79x at best, 30,000 nodes, 90,000 edges); its 100,000-node floor stands.

**Kruskal (minimum spanning tree) was not measured.** The accelerator on master does not implement
`minimumSpanningTree`, so the element runs it on the CPU at every size; the device version and
its floor are pull request #663.

### Louvain measured: it loses inside the element's ceiling (2026-09-30)

Issue #647 asked for one measurement before Louvain was built. The CPU port existed (issue #423), and
so did both device building blocks: the per-row group-by-key and the device graph build (issue
#422). The question was whether a device Louvain made of those two parts beats the CPU port on
realistic graphs at any size graphty-element holds. It does not, so Louvain was not built.

**What was timed.** Every part a device Louvain would pay was timed on the RTX 4070 SUPER. Headless
Chromium ran through ANGLE's Vulkan backend with the extracted libEGL. Node ran on Dawn. Both
required the NVIDIA adapter.

- **The CPU port.** `louvain` from `@graphty/algorithms` at its defaults. In Node: median of 9 runs
  (3 at 1M nodes). In Chromium: median of 9 runs in the same page as the device timings.
- **The pass count.** The device algorithm was simulated in f64 on the CPU, to count the passes
  and levels it needs. A pass is synchronous: every node picks its best community from the previous
  pass's partition, ties go to the lowest id, and the down/up alternating direction rule applies.
  The cluster weights are recomputed after every pass. A plain synchronous move pass never settled
  (100 passes on every level) and merged everything into a few giant communities, with modularity
  near 0. So the simulation uses cuGraph's stopping rule: keep a pass only while it raises
  modularity, and end the level at the first pass that does not. That converges in 36 to 102
  passes over 3 to 8 levels.
- **One pass.** The group-by-key over the level's graph, plus one node-wide apply dispatch (the
  label-propagation step). It was timed on every level's actual graph as the slope between a 1-pass
  and a 33-pass submit, so no submit cost is in it.
- **One contraction.** `buildSimpleSymmetric` on the level's graph, resident: the device graph
  build that the plan reuses for the contraction. It includes its own readback of the distinct arc
  count, and its final submit.
- **One round trip.** An empty submit with a 4-byte readback.

**The cost model.** A level costs one contraction, plus one round trip per 8 passes, plus 1.5 times
its passes. The 0.5 covers the passes' cluster-weight and modularity dispatches. Graphs: G(n, m)
with no community structure ("gnm"), and LFR benchmark graphs, which have power-law degrees and
planted communities ("lfr": mixing 0.3, community sizes 20 to 1,000, degree exponent 2.5). Load
averages: 5 to 11 for every row below. An earlier pass at load 20 to 113, while another session ran
a 25-core CPU burn, was discarded.

| graph, nodes / edges    | levels / passes | Q port / device | Node CPU ms | Node device est. ms | Node speedup | Chromium CPU ms | Chromium device est. ms | Chromium speedup |
| ----------------------- | --------------: | --------------: | ----------: | ------------------: | -----------: | --------------: | ----------------------: | ---------------: |
| lfr 10,000 / 101,905    |          4 / 36 |   0.646 / 0.646 |        10.8 |                 9.9 |        1.09x |            19.0 |                    42.8 |            0.44x |
| lfr 50,000 / 91,496     |         6 / 101 |   0.719 / 0.716 |        27.9 |                22.3 |        1.25x |            31.3 |                    48.9 |            0.64x |
| gnm 10,000 / 100,000    |          5 / 82 |   0.180 / 0.147 |        21.4 |                20.3 |        1.05x |            45.5 |                    37.4 |            1.22x |
| gnm 20,000 / 100,000    |          5 / 61 |   0.261 / 0.243 |        32.1 |                17.3 |        1.86x |            36.5 |                    45.8 |            0.80x |
| gnm 50,000 / 100,000    |          8 / 49 |   0.515 / 0.508 |        39.8 |                22.0 |        1.81x |            45.2 |                    68.8 |            0.66x |
| lfr 100,000 / 1,012,754 |          6 / 42 |   0.668 / 0.668 |       154.8 |                90.9 |        1.70x |           149.2 |                    87.5 |            1.70x |
| gnm 100,000 / 1,000,000 |         6 / 102 |   0.159 / 0.133 |       411.3 |               127.5 |        3.22x |           362.3 |                   116.7 |            3.11x |
| lfr 1,000,000 / 10.1M   |          3 / 65 |   0.670 / 0.670 |       3,402 |                 995 |        3.42x |              -- |                      -- |               -- |
| gnm 1,000,000 / 10M     |          6 / 77 |   0.141 / 0.119 |       7,985 |               1,943 |        4.11x |              -- |                      -- |               -- |

The 1M rows are Node only, because the browser project's 600 s limit does not fit a 1M-node graph
build plus its simulation.

What the measurement says:

- **The group-by-key is not the problem.** On the level-0 graphs, a pass runs at 0.13 to 0.75
  ns/arc in Chromium and 0.23 to 0.50 ns/arc in Node (0.86 at 1M). That is the optimistic 0.30
  ns/arc this record assumed, not the 1.3 ns/arc pessimistic bracket. Passes add up to 1.5 to 7 ms
  per run inside the ceiling.
- **The contraction is.** In Chromium a device graph build costs 5.6 ms even on a level of 272
  arcs, because it holds two submit round trips. Levels at 100,000 to 200,000 arcs cost 7 to 9 ms.
  Louvain contracts 4 to 8 times, so the builds alone are 27 to 57 ms against a CPU port that
  finishes the whole run in 19 to 45 ms. In Node the same builds are 1.0 to 4.4 ms, and there the
  device would win narrowly (1.05x to 1.86x).
- **On realistic graphs it loses at every size the element holds.** The element refuses a graph of
  more than 50,000 nodes or 100,000 edges (`DEFAULT_LIMITS`). In Chromium both LFR rows inside that
  ceiling lose: 0.44x and 0.64x. Of the uniform graphs, two lose. The one win, 1.22x at 10,000
  nodes, is on a graph with no community structure, where the synchronous partition is also
  worse: Q 0.147 against the port's 0.180.
- **Above the ceiling it earns, roughly as the old model said.** 1.7x on LFR and 3.1x on the
  uniform graph at 100,000 nodes in Chromium; 3.4x to 4.1x at 1M in Node. That is the 2.3x at 100k
  the model predicted, not the 14.6x of the primitive model's row against the measured port. The
  port was faster than that row assumed, at 149 to 411 ms at 100k.
- **A cheaper contraction would not change the verdict on realistic graphs by enough.** As a test,
  give each level one 2.0 ms round trip and only the build's device time, taken as the Node build
  minus its 1.0 ms per-build floor. That design does not exist: it would size every level's arrays
  from the level before instead of reading the count back. Even then, the rows inside the ceiling
  come to 1.18x (lfr 10k), 1.38x (lfr 50k), and 1.41x to 2.39x on the uniform graphs. That is a
  win of 3 to 26 ms, short of the 3x line, and only for a new contraction primitive.
- **Quality.** On LFR the synchronous partition's modularity is within 0.004 of the port's. On the
  uniform graphs it is 0.007 to 0.033 lower, so the device would also return a worse answer where
  it is closest to winning.

**Decision.** Louvain is not built. It stays demoted, now on measurement rather than on the
model. Leiden and ECG inherit the decision. Three things would reopen it:

- graphty-element holding graphs above 100,000 nodes (issue #419), where it earns 1.7x to 3x, or
- a Chromium submit round trip well under 2 ms, or
- a contraction that needs no readback of its own, which would bring the rows inside the ceiling
  to the 1.2x to 2.4x above.

None of these is a reason to build the algorithm before it happens. The measurement scripts are in
`tmp/louvain/` of the `feat-webgpu-louvain` worktree: `cpu-sim.ts` (the graphs, the port timing and
the synchronous simulation), `gpu-measure.ts` (the device parts), `node-step1.ts`, `model.py` and
`optimistic.py`. Their logs are beside them.

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

| algorithm                                 | route above (Chromium, 4070), loaded median                                                                                                                       | route above, minimum of N                                                      | (T4), loaded median | (T4), minimum of N | 3x point (Chromium, 4070), loaded median | 3x point, minimum of N | state                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------- | ------------------ | ---------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PageRank, converged                       | 19k                                                                                                                                                               | 29k                                                                            | 40k                 | 50k                | 95k                                      | 100k                   | built                                                                                                                                    |
| PageRank, fixed iterations / personalized | 12k                                                                                                                                                               | 13k                                                                            | 19k                 | 21k                | 35k                                      | 38k                    | built                                                                                                                                    |
| eigenvector, Katz                         | 6k                                                                                                                                                                | 6.6k                                                                           | 10k                 | 10k                | 18k                                      | 19k                    | built; against a port                                                                                                                    |
| HITS                                      | 3.6k                                                                                                                                                              | 4.0k                                                                           | 6k                  | 6.6k               | 10k                                      | 11k                    | built; against a port                                                                                                                    |
| connected components                      | 72k                                                                                                                                                               | 132k                                                                           | 138k                | 229k               | 302k                                     | 437k                   | built; 23k in Node on the medians, 52k on the minima                                                                                     |
| betweenness, sampled                      | 1.5k (2.3k pessimistic)                                                                                                                                           | 1.6k (2.8k pessimistic)                                                        | 3.0k                | 3.5k               | 4.2k (33k pessimistic)                   | 5.0k (83k pessimistic) | built (PR #552); MEASURED route above 1k, 3x from just above 2k (see "Sampled betweenness, measured"); the element does not route it yet |
| closeness, sampled                        | ~100                                                                                                                                                              | ~5.8k                                                                          | ~300                | 11k                | ~1k                                      | 16k                    | unbuilt at scale; needs a `sources` option; sample by default                                                                            |
| closeness, exact, every source            | ~100-250, and NOT above ~30k                                                                                                                                      | ~1.0k-2.8k, and NOT above ~30k                                                 | ~320-400            | 4.6k-5.0k          | --                                       | --                     | on the frontier branch                                                                                                                   |
| all-pairs shortest paths                  | every n <= 5,792 at the 128 MiB default binding (23,170 with a 2 GiB binding)                                                                                     | unchanged                                                                      | same                | same               | ~130                                     | unchanged              | unbuilt; refuse above the bound                                                                                                          |
| triangle count, clustering coefficient    | 3.0k                                                                                                                                                              | 6.6k                                                                           | 4.8k                | 15k                | 6.0k                                     | 21k                    | built; MEASURED crossover 7k, 3x point 20k-50k (2026-09-27, load 4.3-6.4)                                                                |
| minimum spanning tree                     | 6.0k (4.6k with 4 rounds per submit)                                                                                                                              | 11k (7.2k with 4 rounds per submit)                                            | 11k                 | 21k                | 19k (11k batched)                        | 38k (22k batched)      | unbuilt; buildable on master today                                                                                                       |
| label propagation                         | 2.3k at 8 passes per readback (12k at 1)                                                                                                                          | 2.5k at 8 passes per readback (13k at 1)                                       | 4.0k                | 4.2k               | 6.9k-10k                                 | 7.6k-12k               | built; MEASURED crossover 4k-5k, 3x point 10k-20k (2026-09-27, load 4.3-6.4)                                                             |
| Bellman-Ford, negative weights            | 2.1k                                                                                                                                                              | 3.3k                                                                           | 3.8k                | 6.3k               | 5.0k                                     | 8.3k                   | unbuilt; needs a round cap                                                                                                               |
| BFS, single source                        | 151k (316k against the low-load CPU row), and only when levels <= arcs / 14,000 (0.2 ms per level against 14 ns per CPU arc: 1,430 levels at 20M arcs, 140 at 2M) | 191k (316k against the low-load CPU row, which is unchanged), same levels rule | 400k                | 501k               | ~900k                                    | ~955k                  | on the frontier branch                                                                                                                   |
| SSSP, near-far                            | 69k (182k low-load)                                                                                                                                               | 79k (182k low-load, unchanged)                                                 | 190k                | 229k               | 275k                                     | 347k                   | on the frontier branch                                                                                                                   |
| k-core                                    | 132k against a port (8k against the shipped code)                                                                                                                 | 209k against a port (9.1k against the shipped code)                            | 380k                | 501k               | 575k                                     | 724k                   | unbuilt; port first                                                                                                                      |
| Louvain                                   | 33k against a port on the optimistic model; no floor exists on the bound                                                                                          | 38k against a port on the optimistic model; no floor exists on the bound       | 72k                 | 79k                | 120k                                     | 132k                   | not built: loses inside the ceiling (2026-09-30)                                                                                         |

The BFS floor has two parts because the per-level cost is what kills it: a level costs 0.2 ms on
the device however small the frontier is, and a road network or a grid has thousands of levels.

**What graphty-element ships, measured through the element on 2026-09-27.** The element now carries
a floor per capability in `ACCELERATION_MIN_NODES_BY_CAPABILITY`: PageRank 50,000 nodes, shortest
paths 107,000, connected components 132,000, breadth-first search 141,000. Only the first comes
from a measurement taken through the element, because the element refuses a graph past 50,000 nodes
or 100,000 edges with `E_TOO_LARGE` and the other three cross above that. Inside the band it can
hold, PageRank beats the CPU port by 1.24x at 50,000 nodes and loses at every smaller size,
20,000 included (0.81x); breadth-first search, shortest paths and connected components lose at every
size, the device's best showing being 0.54x, 0.69x and 0.46x on the medians. Measured at a one-minute
load average of 5.3 to 3.2 on 32 threads, fifteen interleaved passes per size; an earlier sweep at
load 55 to 74 read up to three times the absolute costs and reached the same crossovers, because
interleaving put both arms under the same interference. The three floors above the ceiling are
this record's resident crossovers, which the element can only exceed: an accelerated call through
the element never returned in under about 5.5 ms, because each traversal level and each convergence
test is a readback and a Chromium readback is about 2 ms of round trip, while the CPU port answered
a 5,000-node connected-components call in 1.3 ms. So the element declines the device for those three
at every size a consumer can reach today, and raising the render ceiling is what would let them be
measured here.

**Superseded on 2026-09-30.** The element's floors were re-measured against the algorithms 3.0 CPU
ports, and the four capabilities it routes for the first time were floored beside them; see "The
element's floors re-measured against the 3.0 ports (2026-09-30)" above.

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

| Quantity                                       | Predicted from physics | Measured                                              | Error               |
| ---------------------------------------------- | ---------------------- | ----------------------------------------------------- | ------------------- |
| CPU cost of one pairwise repulsion, JavaScript | 2-5 ns                 | 2.75 ns (ForceAtlas2), 1.96 ns (Fruchterman-Reingold) | in range            |
| CPU ForceAtlas2, one iteration at 10,000 nodes | 300 ms                 | 275.3 ms                                              | 9 %                 |
| CPU scaling of the exact tier                  | quadratic              | 2.889, 11.108, 44.218, 275.290 ms at 1k, 2k, 4k, 10k  | exact               |
| GPU ForceAtlas2, one iteration at 10,000       | 0.2-0.4 ms             | 0.593 ms kernel, 0.723 ms wall                        | 1.5-1.8x optimistic |
| GPU grid tier, one iteration at 1,000,000      | 5-10 ms                | 5.414 ms                                              | in range            |
| Layout speedup at 10,000 nodes                 | about 1,000x           | 464x on kernel time, 381x on the step's wall          | 2.2-2.6x optimistic |
| Layout crossover, Node                         | about 260 nodes        | 192 (kernel) to 290 (wall)                            | in range            |
| PageRank, 100 iterations at 1M / 10M, wall     | 330-630 ms             | 204.3 ms                                              | 1.6-3x pessimistic  |
| PageRank speedup at 1M / 10M                   | 25-45x                 | 38.7x against the measured CPU                        | in range            |
| Connected components speedup at 1M / 10M, wall | 1.5-2x                 | 1.5x (1.3x at 100k / 1M)                              | in range            |
| Breadth-first search crossover, resident       | 30,000-50,000 nodes    | about 141,000                                         | 3-5x optimistic     |
| Shortest paths crossover, resident             | 30,000-60,000 nodes    | about 107,000                                         | 2-4x optimistic     |

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

## What the shared machinery does and does not change about the list above (2026-09-26)

The section before this one says a model that ranks algorithms one at a time cannot see that some
are worth building for what they carry. That cuts both ways, and the cut has to be made precisely,
because "it is foundational" is how a roadmap stops ever saying no. Every entry above was re-read
against one question: does anything else need the machinery this would build?

**It rescues nothing that was dropped.** k-truss consumes triangle counting and the edge mask and
produces no primitive (the plan's own task says so). Girvan-Newman consumes edge betweenness.
The single-query algorithms consume the frontier and the near-far queue. Exact all-source
closeness is the kernel that already exists, run more times. Every one of them is a leaf, so every
drop stands on its own number.

**Two of the demotions are different in kind, and the record should not have spelled them the
same way.** k-core is a pure leaf: its task adds nothing under `src/primitives/` and calls the
traversal phase's frontier unchanged, so deferring it costs 1.5 days of nothing-downstream and is
a clean call. Louvain is also a leaf, but both of its substrates -- the device graph build and the
per-row group-by-key -- are already being built for triangle counting and for label propagation,
which this record keeps. So its 6.0 days carry no new primitive and no new correctness argument at
the primitive level. The verdict does not change (2.3x at 100k, 0.26x at 10k), but the reason
does: it is cheap and marginal rather than expensive and marginal, and those two deserve different
treatment when a schedule has slack.

**Three entries are routing decisions wearing a build decision's clothes.** Breadth-first search,
shortest paths and connected components are built and shipped; nothing about them is deferrable
any more. What the record decides for them is the size above which the element routes to them,
which is the floors table. Exact all-source closeness is the same: the kernel exists, the decision
is a cap, and the only thing genuinely blocked is a `sources` option on a published interface.
Calling these "demoted" and "dropped" invites a reader to think work is being saved, and none is.

**The ordering of the keep list is wrong, and this is the change that matters.** It is ordered by
speedup, which is a runtime property. Build order should be by what unblocks what:

| Build                                                           | Days | Unblocks                                          | Best consumer's number         |
| --------------------------------------------------------------- | ---: | ------------------------------------------------- | ------------------------------ |
| the device graph build (`cooToCsr`, the simple symmetric graph) |  2.5 | triangle counting, k-truss, Louvain's contraction | triangles, 12.7x at 100k       |
| the per-row group-by-key                                        |  2.5 | label propagation, Louvain's move pass            | label propagation, 20x at 100k |
| triangle counting                                               |  2.5 | -- (leaf)                                         | itself                         |
| label propagation                                               |  1.5 | -- (leaf)                                         | itself                         |
| all-pairs, minimum spanning tree, sampled betweenness           |   -- | -- (leaves)                                       | themselves                     |

Ordered by speedup, a phase cut short after two tasks has built two leaves and enabled nothing.
Ordered by what unblocks what, the same two tasks leave every later row cheap.

**The test that keeps this honest.** Before building a substrate, name its best consumer and its
number, in the plan, in a sentence. The device build passes it (triangle counting, 12.7x); the
group-by passes it (label propagation, 20x); machinery built for k-core would fail it, because
nothing consumes k-core. If nobody will write that sentence, what is being proposed is not a
substrate.

**And the bound this argument needs, which the frontier phase is currently outside of.** A
substrate justified by a consumer that is never built is pure loss. The frontier family is that
case today: it was defended by sampled betweenness, betweenness lives in the betweenness and
all-pairs phase, and that phase has not started. What the frontier machinery carries right now is
closeness, which the element may not route above 30,000 nodes, and two traversals the element
routes to the CPU below 141,000 and 107,000 nodes. So the shared-machinery defence of that phase
is a promissory note, and sampled betweenness is what pays it. That makes betweenness the highest
priority of the unbuilt work -- not for its own 14x, but because it is what settles a phase
already paid for. The rule that follows: a substrate and the consumer that justifies it belong in
the same phase, or neither belongs in the roadmap.

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

Stack note (added 2026-09-27, issue #425): every GPU constant above was measured on NVIDIA
hardware, on two runtimes. The Node constants (the 0.10 ms round trip, the 1 us dispatch, the
0.15 ms per MiB readback and the kernel rates of `nvidia-lovelace-driver580.json` and
`gpu-linux-t4.json`) ran under the `webgpu` npm package 0.4.0, on the RTX 4070 SUPER in the dev
container (Ubuntu 22.04.5, driver 580.173.02) and on the Tesla T4 of CI's GPU lane (Ubuntu
22.04.5, driver 580.126.20). The Chromium constants (the 2.0 ms round trip, the 10 us dispatch,
the 2.65 ms per MiB readback, the traversal floor) and therefore the table's crossovers, which
are Chromium figures, ran on the Dawn that Chromium bundles (the round-trip profile is Chromium
143), not on the npm package. None comes from lavapipe, so CI's default lane running Ubuntu
24.04 with Mesa 25.2.8 (LLVM 20.1.2) instead of the dev container's Mesa 23.2.1 (LLVM 15.0.7)
moves none of them. Two different changes would move them. The `webgpu` 0.6.x bump of pull
request #24, which is not merged, moves the Node constants: under Dawn 0.6.1 the dense-twin
PageRank ran about 2x slower. A Chromium or Playwright upgrade moves the Chromium constants and
the crossovers, whether or not #24 lands. A constant measured after either change is a new
measurement on a new runtime, and a crossover re-derived from it can shift with it; the figures
here stay as measured.
