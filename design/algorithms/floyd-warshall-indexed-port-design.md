# All-pairs shortest paths over graph-format snapshots -- design

Status: proposed, 2026-09-27. Branch `feat/algorithms-indexed-floyd-warshall`.
Implementation steps: `design/algorithms/floyd-warshall-indexed-port-plan.md`.

## 1. The problem

`@graphty/algorithms` ships all-pairs shortest paths as `floydWarshall(graph)`
(`algorithms/src/algorithms/shortest-path/floyd-warshall.ts`), a Floyd-Warshall triple loop over a
`Map<NodeId, Map<NodeId, number>>` distance table and a matching predecessor table. Every inner
step does four `Map.get` calls and up to two `Map.set` calls.

It is about 30 times slower than it needs to be. When the GPU all-pairs kernel was measured (pull
request #549, `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md` on branch
`feat/webgpu-all-pairs-shortest-paths`, section "All-pairs measured, not modelled (2026-09-27)"),
a throwaway port -- one row-major `Float64Array`, swept in k-i-j order -- was written as the CPU
arm. On seeded graphs with 10 n undirected edges and integer weights 1-100, medians in Node on the
i9-14900:

| nodes | shipped `floydWarshall` | typed-array Floyd-Warshall | ratio |
| ----: | ----------------------: | -------------------------: | ----: |
|   128 |                 62.7 ms |                    2.84 ms |   22x |
|   256 |                  511 ms |                    18.9 ms |   27x |
|   512 |                4,218 ms |                     139 ms |   30x |
| 1,024 |                      -- |                   1,040 ms |       |
| 2,048 |                      -- |                   8,357 ms |       |

The typed-array loop runs at about 1.0 ns per inner step (8.36 s for 8.6 billion steps at 2,048
nodes). An independent scratch benchmark written for this design (Node 22.22.1, same machine,
load average 5-11) reproduced it at 0.74-1.1 ns per step: 18 ms at 256 nodes, 123-150 ms at 512,
795-1,082 ms at 1,024, 9.0 s at 2,048.

There is also no CPU implementation behind the accelerator seam. `AlgorithmAccelerator` already
declares `allPairsShortestPath?(s, options?): Promise<ApspResultLike>`
(`algorithms/src/indexed/accelerator.ts`), but the `accelerated()` dispatcher has no
`allPairsShortestPath` method, because there is no `indexed.*` port for it to run when no
accelerator is injected.

This design adds that port.

## 2. What the research found, and the decision it drives

Three findings decide the shape of the port. Each was measured on this machine and agrees with a
production library.

**Floyd-Warshall is the wrong algorithm for most graphs graphty draws.** Floyd-Warshall costs
n^3 steps whatever the edge count. Repeated single-source Dijkstra costs about n (m + n) log n. At
10 n edges the scratch benchmark measured Dijkstra from every source, writing one row per source
into the same n x n matrix, against the typed-array Floyd-Warshall: 51 vs 150 ms at 512 nodes
(3x), 224 vs 1,082 ms at 1,024 (4.8x), 908 vs 9,034 ms at 2,048 (10x). Every cell matched exactly
on integer weights. Varying the density at 512 nodes: average degree 20 gave 54 vs 123 ms, 128
gave 115 vs 134, 256 gave 168 vs 127, 480 gave 254 vs 126. At 1,024 nodes: degree 128 gave 499 vs
916, degree 512 gave 1,094 vs 907. The crossover sits at an average out-degree of about n/4 to
n/3.

Two libraries switch on the same fact:

- SciPy's `shortest_path(method='auto')` runs Dijkstra per source (Johnson when a weight is
  negative) when the stored entry count is below N^2/4, and Floyd-Warshall otherwise
  (`scipy/sparse/csgraph/_shortest_path.pyx`, lines 240-265).
- igraph's `igraph_distances` runs BFS when unweighted, Floyd-Warshall when the edge count exceeds
  max(250, 0.1 n^2), and Dijkstra per source otherwise ("Based on experiments, this is faster than
  Dijkstra for densities above 0.1", `igraph/src/paths/unweighted.c` lines 273-325, igraph issue
  #2822). graph-tool makes Floyd-Warshall an explicit `dense=True` opt-in for the same reason
  (`graph_tool.topology.shortest_distance` documentation).

**Unweighted input should always be one BFS per source.** At 10 n edges the scratch benchmark
measured 7.3 vs 150 ms at 512 nodes (20x), 40 vs 1,082 ms at 1,024 (27x), 159 vs 9,034 ms at
2,048 (57x). BFS won at every density measured, including near-complete graphs: 70 vs 126 ms at
512 nodes with average degree 480, 774 vs 906 ms at 1,024 with degree 1,000. The matrices were
identical cell for cell. The GPU plan makes the same routing decision for its own kernel
(`design/webgpu/plans/2026-09-23-webgpu-p9-betweenness-and-all-pairs.md`, decision PD-19).

**Floyd-Warshall is still needed** for dense graphs, and for graphs with negative weights, where
per-source Dijkstra is incorrect.

**Decision.** The port is ONE function, `indexed.allPairsShortestPath`, that picks one of three
strategies by the rule in section 4. Floyd-Warshall is one of them. The function is named after
the accelerator-seam member it implements, not after one of its strategies, because on a sparse
graph it deliberately does not run Floyd-Warshall. A caller who wants the Floyd-Warshall sweep
regardless can ask for it with `method: "floyd-warshall"`.

Where the research disagreed: one researcher recommended a pure Floyd-Warshall port, on the
grounds that Floyd-Warshall is what is being replaced; another recommended the dispatching entry
point. This design takes the dispatcher. The measured 3-10x on sparse weighted graphs and 20-57x
on unweighted ones is larger than the whole 30x the port gains over the shipped code, and the two
extra strategies reuse code that already ships (`indexed.dijkstra`, and a loop of the shape of
`indexed.breadthFirstSearch`).

## 3. The Floyd-Warshall kernel

### 3.1 The algorithm and its variant

The recurrence is Floyd's (Algorithm 97, CACM 5(6):345, 1962; the loop is reproduced as Fig. 1 of
Hougardy 2010): for each k, `d[i][j] = min(d[i][j], d[i][k] + d[k][j])`, with k as the outermost
loop. The i and j loops may be exchanged; k may not (Han, Franchetti, Pueschel, PACT 2006, section
2). One matrix updated in place is correct: during round k, row k and column k do not change while
`d[k][k] >= 0`, so no second buffer is needed.

The variant is the textbook one: k-i-j over a row-major `Float64Array(n * n)`, with the row offsets
`k * n` and `i * n` hoisted, `d[i][k]` loaded once per row, and the whole row skipped when
`d[i][k]` is `+Infinity`. The skip is Floyd's own and appears in SciPy's kernel (`if
dist_matrix[i,k] == INFINITY: continue`, `_shortest_path.pyx` `_floyd_warshall`) and in Boost's
(`floyd_warshall_shortest.hpp`, lines 91-139). k-i-j is the order in which the inner loop walks
contiguous memory for a row-major array; igraph, whose matrices are column-major, uses k-j-i for
the same reason (`igraph/src/paths/floyd_warshall.c`, lines 27-57: "Iteration order matters for
performance!"). The comparison is a strict `<`, so the earliest k that reaches a minimum wins,
which is deterministic.

### 3.2 Optimisations chosen and rejected

| optimisation | decision | reason |
| --- | --- | --- |
| Skip row i when `d[i][k]` is `+Infinity` | chosen | Free, and removes whole rows on disconnected or directed graphs. SciPy, Boost and Floyd's original all do it. |
| `Float64Array`, not `Float32Array` | chosen | A `Float32Array` sweep measured 1.17-1.39x SLOWER in V8: 186 vs 150 ms at 512, 1,380 vs 1,082 ms at 1,024, 10.6 vs 9.0 s at 2,048 (scratch benchmark). V8 does arithmetic in doubles, so every f32 load and store converts. f32 also loses integer exactness above 2^24 and cannot reproduce the shipped function's f64 sums. It would only halve the memory. |
| Cache blocking (three-phase tiled order) | rejected | Tiles of 32 and 64 measured 5-30 percent SLOWER than plain k-i-j at 256-2,048 nodes; a tile of 128 was within noise (7.96 vs 9.03 s at 2,048; scratch benchmark). The published gains come from small caches and from blocking that enables SIMD: Venkataraman, Sahni, Mukhopadhyaya (ACM JEA 8, 2003) report 1.6-1.9x on a Sun Ultra Enterprise 4000/5000 and bound scalar tiling at about 2x; Han et al. (PACT 2006) report 1.3-1.8x from scalar tiling and unrolling and a further 3.0-5.7x from 4-way SIMD; Rucci, De Giusti, Naiouf (2018, arXiv 1811.01201, Table 1) saved 5 percent from scalar blocking on KNL at n = 4,096, with the 15.5x coming from AVX-512. |
| Recursive or Morton / block data layout (Park, Penner, Prasanna, IEEE TPDS 15(9), 2004) | rejected | Same reason: the layout pays through cache reuse and vector units that scalar JavaScript does not use. |
| Brodnik-Grgurovic-Pozar "Tree" variant (Ars Math. Contemp. 22(1), 2022) | deferred | igraph's default and one of NetworkX's four entry points; expected O(n^2 log^2 n) on complete graphs with uniform random weights. It is the next speedup to try if dense Floyd-Warshall ever becomes the bottleneck, and the benchmark in section 9 is the place to measure it. |
| WASM SIMD | deferred | The only lever the literature shows paying beyond the plain loop (3-15x, above). Not worth a WASM build step until dense Floyd-Warshall is a measured bottleneck. |
| Symmetric half-matrix sweep on undirected graphs | rejected | About 2x at most, and it complicates the predecessor matrix. The snapshot's CSR already stores both arcs of an undirected edge, so no symmetrising step is needed either. |
| Johnson reweighting for sparse graphs with negative weights | deferred | SciPy's choice for that case. Floyd-Warshall already handles negative weights correctly; add Johnson only if sparse negative-weight graphs turn out to be common. |

### 3.3 Negative cycles

A negative cycle makes plain Floyd-Warshall produce exponentially large numbers: entries can grow
by a factor of 6 per round and reach -2 * 6^(n-1) * cmax. In float64 that loses integer exactness
after about 20 rounds, overflows to `-Infinity` after about 396, and `-Infinity + Infinity` is then
`NaN` (Hougardy, "The Floyd-Warshall algorithm on graphs with negative cycles", IPL 110 (2010)
279-281, Proposition 1, Theorem 2 and the conclusion). Without a negative cycle every finite entry
stays within n * cmax.

So the sweep scans the diagonal after every round k (O(n) per round, O(n^2) in total) and stops at
the first `d[i][i] < 0`, as igraph does inside its sweep (`IGRAPH_ENEGCYCLE`,
`floyd_warshall.c`). Two cases are caught before the sweep, from the weights alone:

- a negative self-loop is a negative cycle (NetworkX raises `NetworkXUnbounded` on it in
  `_init_pred_dist`; SciPy silently discards it by writing the diagonal to 0 first, a defect not
  to copy);
- on an undirected graph, ANY negative edge is a negative cycle, u-v-u (NetworkX documents this;
  igraph refuses such input up front).

## 4. The strategy rule

Let `w` be the weights in use (section 5.2) and `A` the snapshot's arc count (both directions of an
undirected edge count, as SciPy's stored-entry count does for a symmetric matrix).

1. `w` is absent, or every value is 1, or `options.weighted === false`: **BFS**, one per source,
   hop counts.
2. Some weight is negative: **Floyd-Warshall**.
3. `A < n * n / 4`: **Dijkstra**, one per source.
4. Otherwise: **Floyd-Warshall**.

Rule 3 is SciPy's threshold. igraph's is lower (0.1 n^2 edges, about 0.2 n^2 arcs undirected). The
measured crossover in section 2 (average out-degree n/4 to n/3) agrees with SciPy's, so this design
takes SciPy's.

`options.method` overrides the rule: `"floyd-warshall"` always sweeps (with unit weights when rule
1 would have applied); `"per-source"` runs BFS under rule 1 and Dijkstra otherwise, and throws when
a weight is negative, because Dijkstra is incorrect there. The result reports which strategy ran
(`method: "bfs" | "dijkstra" | "floyd-warshall"`), so a test can pin both sides of the switch and a
benchmark can say what it timed.

## 5. Result semantics

### 5.1 The matrix

- `dist[i * n + j]` is the shortest distance FROM node index i TO node index j (row-major, the
  direction `ApspResultLike` declares and the GPU kernel writes).
- `+Infinity` when j is unreachable from i.
- `0` on the diagonal, always. A positive self-loop never replaces it.
- Parallel arcs contribute their cheapest weight (`Math.min`).
- The matrix is a `Float64Array` of length n * n; n = 0 gives an empty array.

These are exactly the GPU kernel's semantics (`webgpu-graph-algorithms/src/algorithms/all-pairs.ts`
on the PR #549 branch: `+Infinity` fill, cheapest parallel arc, diagonal 0 written after the arcs)
and its CPU reference's (`webgpu-graph-algorithms/test/oracle/all-pairs.ts`: "a self-loop
ignored"). They also match NetworkX (`floyd_warshall_numpy` uses `multigraph_weight=min`; a
positive self-loop is ignored), SciPy (duplicate entries reduced by minimum) and Boost (minimum
over parallel edges). The per-source strategies meet them with no extra code: a self-loop cannot
improve `dist[source] = 0`, and a relaxation keeps the cheaper of two parallel arcs.

### 5.2 Weights

The weights in use are `options.weights` when given (one per arc, `arcCount` long), else the
snapshot's `s.weights`, where `null` means 1 per arc -- the rule every weighted `indexed.*` port
follows (`indexed.dijkstra`, `indexed.kruskalMST`). `options.weighted === false` ignores both and
counts hops.

The port scans the weights once, O(A), before allocating anything. It throws a `RangeError` on a
`NaN` or infinite weight (the GPU kernel refuses them too) and on an override whose length is not
`arcCount`. It does not trust the snapshot's `flags` for this, because an override has no flags,
and one O(A) scan is negligible next to the O(n^2) matrix.

`toSnapshot` stores legacy weights as f32 in `s.weights` and keeps exact f64 values in a shadow
column (`s.edges.byRole("weight")`). A caller who needs the shipped function's exact f64 distances
passes `weights: expandEdges(s, shadow.data)`, as the `indexed.dijkstra` tests already do.

### 5.3 Negative cycles

When the graph has a negative cycle the result has `hasNegativeCycle: true`, every cell of `dist`
is `NaN`, and `pathTo` / `pathEdges` throw `PathWalkError` (reason `"cycle"`). The sweep stops at
the round that exposes the cycle (section 3.3), so no `-Infinity` or runaway value is ever
computed.

Where the research disagreed: NetworkX, SciPy and igraph raise on a negative cycle; Boost returns
`false`; the shipped function returns the corrupted matrix with a flag. This design returns a flag
because the only consumer, graphty-element's `FloydWarshallAlgorithm`, publishes
`hasNegativeCycle` as a result rather than treating it as a failure, and the seam already carries
the flag form (`BellmanFordResultLike.hasNegativeCycle`). It fills `dist` with `NaN` rather than
leaving partial values, so a caller who ignores the flag gets an obviously unusable matrix instead
of numbers that look like distances. The shipped function's behaviour -- a matrix and paths that
disagree with each other (A->B 1, B->C 1, C->A -10 gives `A->C = -6` while `floydWarshallPath`
returns the path A, B, C, which weighs 2) -- is what this avoids.

### 5.4 Paths

Paths are opt-in (`paths: true`), because they add 4 n^2 bytes. The result then carries
`predArc: Uint32Array(n * n)`: `predArc[i * n + j]` is the ARC that ends the shortest i-to-j path,
`INVALID_INDEX` on the diagonal and for unreachable pairs. This is the predecessor convention of
the shipped function, NetworkX (`pred[u][v] = pred[w][v]`) and SciPy (`predecessor_matrix[i, j] =
predecessor_matrix[k, j]`), generalised from a node to an arc. Floyd-Warshall updates it as
`predArc[i][j] = predArc[k][j]` on each strict improvement; a Dijkstra row is exactly the
`SsspResult.predArc` that `indexed.dijkstra` already returns; a BFS row records the arc that
discovered each node.

Row i of `predArc` is therefore a single-source predecessor-arc array, and `pathTo(i, j)` /
`pathEdges(i, j)` are `walkPredArcs` / `walkPredEdges` (`algorithms/src/indexed/dijkstra.ts`)
applied to that row. They return node indices and LOGICAL edge indices, identify the exact parallel
edge taken (as cytoscape.js's `edgeNext` does), are bounded, and throw `PathWalkError` on a gap or
a cycle rather than looping. Tracking predecessors measured no slower than not tracking them:
17.2 / 123 / 1,026 / 7,571 ms against 18.3 / 150 / 1,082 / 9,034 ms at 256 / 512 / 1,024 / 2,048
nodes, within noise on a loaded machine (scratch benchmark).

Without `paths: true`, `predArc` is `null` and the two accessors throw an `Error` that says to pass
`paths: true`.

### 5.5 Ties and floating point

With a strict `<`, Floyd-Warshall keeps the path found at the smallest pivot k, and Dijkstra keeps
whichever relaxation its heap reached first, so two strategies can return DIFFERENT paths of equal
length. Their distances are bit-identical on integer weights (verified cell by cell at every size
measured). On non-integer weights Floyd-Warshall adds `(i..k) + (k..j)` while Dijkstra adds left to
right along the path, so the two can differ in the last few ULPs, and on an undirected graph
`d[i][j]` and `d[j][i]` are not guaranteed bit-identical (IEEE-754 addition is not associative).
SciPy documents the same: "If multiple valid solutions are possible, output may vary".

### 5.6 The size bound

The port refuses more than `maxNodes` nodes, default **5,792**, with a `RangeError` raised before
anything is allocated. The message names the node count, the bound, the bytes the call would
allocate (8 n^2, plus 4 n^2 with `paths: true`) and the option that changes it. `maxNodes` may be
set lower or higher per call.

5,792 is the GPU kernel's ceiling at the WebGPU spec-default 128 MiB storage binding
(`floor(sqrt(2^27 / 4))`, PR #549 `all-pairs.ts`), so the CPU and GPU paths refuse at the same size
by default. On the CPU it means 256 MiB of `Float64Array` (268,378,112 bytes), plus 128 MiB with
paths.

Where the research disagreed: one researcher proposed a default of 4,096 on the grounds of run
time (a dense Floyd-Warshall at 4,096 nodes is about 69 s at 1.0 ns per step). This design takes
5,792 because the strategy rule makes run time depend on density, not on n: at 10 n edges the
Dijkstra strategy takes about 0.9 s at 2,048 nodes and, extrapolating by n^2 log n, about 8 s at
5,792, and BFS less. A node bound cannot express a time budget, so the bound only protects memory,
and the JSDoc states the time: about n^3 ns when Floyd-Warshall runs (69 s at 4,096, 194 s at
5,792). Node allows typed arrays up to 2^53 - 1 bytes (`buffer.constants.MAX_LENGTH`), so the
bound is a choice, not a platform limit there; the plan checks the default allocation in Chromium.

## 6. Public API

These are all new exports of `@graphty/algorithms`. None of them exists today, and none changes an
existing export. They need the owner's approval before they ship (section 10).

In `algorithms/src/indexed/all-pairs.ts`, reached as `indexed.allPairsShortestPath`:

```typescript
import type { F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";

/** Options of the index-based all-pairs shortest paths. @public */
export interface ApspOptions {
    /** Per-arc weight override, arcCount long; defaults to `s.weights` (null = 1 per arc). */
    readonly weights?: NumericVector | undefined;
    /** `false` counts hops and ignores every weight. Default true. */
    readonly weighted?: boolean | undefined;
    /** Strategy override; `"auto"` (the default) applies the rule of design section 4. */
    readonly method?: "auto" | "floyd-warshall" | "per-source" | undefined;
    /** Record `predArc` so `pathTo` / `pathEdges` work; adds 4 n^2 bytes. Default false. */
    readonly paths?: boolean | undefined;
    /** Refuse larger graphs before allocating. Default 5,792. */
    readonly maxNodes?: number | undefined;
}

/** All-pairs shortest paths as a dense row-major matrix. @public */
export interface ApspResult {
    /** dist[i * n + j] = distance from i to j; +Infinity unreachable, 0 on the diagonal, NaN under a negative cycle. */
    readonly dist: F64;
    /** The side of the matrix, s.nodeCount. */
    readonly n: number;
    /** True when a negative cycle exists; dist is then all NaN and the path accessors throw. */
    readonly hasNegativeCycle: boolean;
    /** The strategy that ran. */
    readonly method: "bfs" | "dijkstra" | "floyd-warshall";
    /** The arc ending each shortest path, row-major; INVALID_INDEX on the diagonal and when unreachable. Null unless `paths: true`. */
    readonly predArc: U32 | null;
    /** Node indices from `source` to `target` inclusive; empty when unreachable. */
    pathTo(source: number, target: number): U32;
    /** Logical edge indices along that path; empty when unreachable or when source === target. */
    pathEdges(source: number, target: number): U32;
}

export function allPairsShortestPath(s: GraphSnapshot, options?: ApspOptions): ApspResult;
```

Thrown errors: `RangeError` for more than `maxNodes` nodes, a `NaN` or infinite weight, or a
`weights` override of the wrong length; `Error` for `method: "per-source"` with a negative weight;
`Error` from `pathTo` / `pathEdges` without `paths: true`; `PathWalkError` from them under a
negative cycle or on a corrupt `predArc`.

`dist` is declared `F64`, not `NumericVector` as `SsspResult.dist` is. `SsspResult` needs the wider
type because the dispatcher decorates an accelerator's f32 result into an `SsspResult`. The
all-pairs dispatcher method returns `ApspResultLike` instead (below), so `ApspResult` is only ever
built by the CPU port and can promise what it holds. It satisfies `ApspResultLike` structurally
(`F64` is a `NumericVector`), with no adapter.

In `algorithms/src/index.ts`, flat type exports `ApspOptions` and `ApspResult`. Neither name is
taken in the flat namespace (the `Indexed` prefix is only used where a legacy type already owns the
name, as for `IndexedHitsOptions`).

In `algorithms/src/indexed/accelerator.ts`, one dispatcher method:

```typescript
interface AcceleratedAlgorithms {
    // ...the ten existing methods...
    allPairsShortestPath(s: GraphSnapshot, options?: ApspOptions): Promise<ApspResultLike>;
}
// in accelerated():
allPairsShortestPath: (s, options) =>
    acc?.allPairsShortestPath !== undefined
        ? acc.allPairsShortestPath(s, options)
        : Promise.resolve(indexed.allPairsShortestPath(s, options)),
```

It takes the port's own option type, which is wider than the `SsspOptions` the accelerator member
declares -- the precedent the Katz and Louvain methods already set, and documented in the
`AcceleratedAlgorithms` JSDoc. `ApspOptions` is assignable to `SsspOptions` (they share `weights`),
so no cast is needed. It has no try/catch, like every other method: the GPU kernel refuses a
`weights` override and negative weights (`E_UNSUPPORTED`), and that refusal propagates. The
`AlgorithmAccelerator` interface is not changed.

There is no `cutoff`. The accelerator member's `SsspOptions` has one, the GPU kernel refuses it,
nothing asks for it, and on a graph with negative weights a post-filtered cutoff would leave path
walks with gaps. It can be added when a caller needs it.

## 7. How the shipped functions relate to the port

The shipped `floydWarshall`, `floydWarshallPath` and `transitiveClosure` are NOT changed and do
NOT dispatch to the port. That is what pull request #507 did when it landed the indexed k-core,
Katz, HITS and Louvain: each port was added under `src/indexed/`, wired into the namespace, the
flat type exports and the dispatcher, and the legacy function was left alone. No file under
`algorithms/src` outside `src/indexed` imports the indexed code today.

Rerouting the shipped functions onto the port would change what they return, which is a separate
decision for the owner (section 10). The differences, all intended in the port:

| input | shipped `floydWarshall` | port | why the port differs |
| --- | --- | --- | --- |
| parallel edges | the LAST edge wins (`sourceDistances.set` with no minimum, `floyd-warshall.ts` lines 42-61) | the cheapest arc wins | a shortest path takes the cheapest edge; NetworkX, SciPy, Boost, igraph, cytoscape.js and the GPU kernel all take the minimum; only dagrejs/graphlib shares the shipped behaviour |
| positive self-loop | overwrites the diagonal 0 (A->A weight 5 gives `distances A->A = 5` and a one-node path of length 5 from `floydWarshallPath`) | diagonal stays 0 | the empty path has length 0; NetworkX, SciPy, Boost and the GPU kernel keep 0 |
| negative cycle | flag, plus a matrix and paths that disagree | flag, `dist` all `NaN`, path accessors throw | section 5.3 |
| negative undirected edge | flag (correct) and a meaningless matrix (A-B weight -1 gives A->B = -3) | flag, all `NaN`, no sweep | section 3.3 |
| everything else | f64 distances, `+Infinity` unreachable, 0 diagonal, k-i-j with strict `<` | identical | -- |

On graphs with no parallel edge, no self-loop and no negative cycle, the Floyd-Warshall strategy
performs the same additions in the same order as the shipped function (both sweep k-i-j in node
insertion order, and `toSnapshot` numbers nodes in insertion order), so with the f64 weight
override its distances are bit-identical. The other two strategies agree exactly on integer
weights and within a relative 1e-12 on real weights (section 5.5).

The shipped `transitiveClosure` could be rebuilt on BFS rows (reachable means `dist < Infinity`)
rather than on the full Floyd-Warshall matrix; Warshall's Boolean form (JACM 9(1):11-12, 1962) is
the special case. That is part of the rerouting decision, not of this port.

## 8. Testing

All new tests target the new code. `algorithms/CLAUDE.md` forbids increasing test coverage of the
legacy `floyd-warshall` module, because its O(n^3) Map-of-Maps loop hangs vitest on large graphs.
The legacy function appears in exactly one new test, as the reference of the differential below,
on fixtures of at most 90 nodes (about 0.7 million inner steps, milliseconds). Its own suite
already executes every line of it, so its coverage figure does not move; the plan checks that.

**Reference implementations.** An independent Floyd-Warshall reference and a BFS-per-source
reference go in `algorithms/test/helpers/all-pairs-oracle.ts`, copied from the GPU branch's
`webgpu-graph-algorithms/test/oracle/all-pairs.ts` and cut down to the textbook f64 order (no tile,
no f32 mode), with its two invariants: `expectMatrixTriangleInequality` (for every arc (u, v, w)
with finite `d[i][u]`, `d[i][v] <= d[i][u] + w`) and `expectSymmetric` (`d[i][j] === d[j][i]` on an
undirected graph). The reference shares no code with the port. The legacy function is not the
primary reference because it disagrees with the port on multigraphs and self-loops by design.

**Fixtures.** Every case builds a legacy `Graph`, freezes it with `checksummedSnapshot(g)`
(`test/helpers/snapshot-differential.ts`), and ends with `s.validate({ checksum: true })`, so a
port that writes into a shared snapshot array fails. The shared fixtures of
`test/unit/indexed/port-fixtures.ts` (eight undirected graphs including a weighted star, a weighted
random graph and Zachary's karate club; four directed ones) carry no self-loop and no parallel
edge, deliberately; this suite adds its own cases for those.

| case | what it pins |
| --- | --- |
| empty graph (n = 0) | `dist.length === 0`, `n === 0`, no throw |
| single node, with and without a self-loop | `dist = [0]` |
| positive self-loop | the diagonal stays 0, on every strategy |
| negative self-loop | `hasNegativeCycle`, `dist` all `NaN`, path accessors throw |
| parallel edges of weights 5 and 2 | distance 2, and `pathEdges` names the weight-2 edge |
| disconnected graph (two components, an isolated node) | `+Infinity` across components, `predArc` `INVALID_INDEX` |
| directed graph with a one-way chain | asymmetric matrix, `+Infinity` against the arcs |
| undirected graph | `expectSymmetric` on integer weights |
| unweighted, and weighted with `weighted: false` | hop counts equal the BFS-per-source reference |
| real weights (0.1, 0.2, ...) through the f64 override | Floyd-Warshall strategy exact against the reference; others within relative 1e-12 |
| ties (a square with two equal-length routes) | every strategy reports the same distance; each path's weight sum equals `dist` and every step is an arc |
| directed negative weights, no cycle | correct distances via Floyd-Warshall; `method: "per-source"` throws |
| directed negative cycle (A->B 1, B->C 1, C->A -10) | `hasNegativeCycle`, all `NaN` |
| Hougardy's graph (every edge weight -1), directed and undirected | `hasNegativeCycle`, no `-Infinity` computed, returns promptly |
| undirected graph with one negative edge | `hasNegativeCycle` before the sweep |
| `NaN`, `+Infinity` weight; override of the wrong length | `RangeError` |
| `maxNodes: 2` on three nodes | `RangeError` naming 3, 2 and the bytes; nothing allocated |
| a 20-node graph on each side of `A = n^2 / 4` | `auto` reports `dijkstra` below and `floyd-warshall` at or above |
| every fixture, each of the three strategies forced | the reference matrix, exactly on integer weights, and the triangle inequality |
| every fixture, `paths: true` | for every reachable pair the weight sum along `pathEdges` equals `dist`, `pathTo` starts at i and ends at j, consecutive nodes are joined by the named edges |
| every fixture, Floyd-Warshall strategy, f64 override | bit-identical to the shipped `floydWarshall` distances, mapped through the snapshot's id map |

A browser-project test allocates the default bound's worst case (an edgeless 5,792-node snapshot
with `paths: true`, 384 MiB) in Chromium, answering the open question of whether a browser accepts
it; an edgeless graph takes the BFS strategy, so the run is a fill, not a sweep.

The dispatcher gains a CPU case and a delegation case in `test/unit/indexed/accelerated.test.ts`,
whose "carries exactly the ten methods" test becomes eleven, and
`test/types/accelerator.test-d.ts` pins `indexed.allPairsShortestPath(s)` against
`ApspResultLike`.

No test asserts a time.

## 9. The benchmark

A new script, `algorithms/benchmarks/all-pairs-bench.ts`, run with `npx tsx
benchmarks/all-pairs-bench.ts` from `algorithms/`. It does not extend `benchmarks/port-bench.ts`,
whose 1k / 10k / 100k ladder cannot hold an n^2 matrix (800 MB at 10k, 80 GB at 100k).

Graphs follow the GPU cost record's generator: seeded, 10 n unique undirected edges, integer
weights 1-100, plus an unweighted copy for the BFS strategy.

| sizes | arms |
| --- | --- |
| 64, 128, 256, 512 | shipped `floydWarshall`, port forced to `floyd-warshall`, port `auto` (Dijkstra), port unweighted (BFS) |
| 1,024, 2,048 | the three port arms |
| 4,096, 5,792 | port `auto` and unweighted only; Floyd-Warshall would take about 69 s and 194 s |
| density at 512 nodes: average degree 20, 64, 128, 256, 480 | port forced to `floyd-warshall` against forced `per-source`, to check that the switch sits at the crossover |

Rules, because the machine is shared: `uptime` load average printed before the first size and
after the last; the arms run INTERLEAVED within each pass after one discarded warm-up each, so a
burst of background load hits every arm alike and the ratios survive it; each size reports the
MEDIAN and the MINIMUM of N passes (15 up to 256 nodes, 5 at 512-1,024, 3 at 2,048 and above),
never a mean; before anything is timed, each port arm's matrix is compared cell by cell with the
first port arm's (and with the shipped function's where it runs). The shipped arm stops at 512
(4.2 s per call).

The measured table is added to this document as section 12 when the plan's benchmark step runs.

## 10. Needs the owner's decision

1. **Approve the new public API** of section 6: `indexed.allPairsShortestPath`, the flat types
   `ApspOptions` and `ApspResult`, and the dispatcher method `allPairsShortestPath`. These are
   published contracts.
2. **Whether to reroute the shipped `floydWarshall`, `floydWarshallPath` and `transitiveClosure`
   onto the port.** Doing so fixes the two initialisation bugs of section 7 for existing callers,
   changes what they return on multigraphs, self-loops and negative cycles, and needs a changelog
   entry. This design leaves them alone, as pull request #507 did.

## 11. Follow-up work outside this port

- graphty-element's `FloydWarshallAlgorithm` runs the shipped function on the object graph and
  reads only eccentricity, diameter, radius and `hasNegativeCycle`. Moving it onto
  `this.accelerated("allPairsShortestPath", "undirected")` needs `allPairsShortestPath` added to
  `ALGORITHM_MEMBERS` in `graphty-element/src/acceleration/narrow.ts` and a routing floor in
  `ACCELERATION_MIN_NODES_BY_CAPABILITY`. It also declares no `static parallelEdges`, so its input
  merges parallel edges by the default `"sum"` policy and two parallel A-B edges of weight 1 become
  one of weight 2 (`graphty-element/src/algorithms/Algorithm.ts`; `DijkstraAlgorithm` declares
  `"min"` for this reason). That is an element defect independent of this port.
- The GPU cost record priced the GPU against a Floyd-Warshall port. Against this port's `auto`
  strategy on sparse graphs the CPU is 3-10x faster than that, so the GPU's advantage and its
  routing floor should be re-derived from section 12's table once pull request #549 merges.
- The Tree variant and WASM SIMD (section 3.2), if dense Floyd-Warshall becomes a bottleneck.
