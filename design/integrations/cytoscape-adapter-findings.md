# What putting graphty inside Cytoscape.js taught us

Status: findings, 2026-10-02. Covers @graphty/graph-format 1.2.6, @graphty/layout 2.0.6,
@graphty/algorithms 3.1.5 and @graphty/webgpu-graph-algorithms 0.6.21.

## Background

Cytoscape.js is the most widely used JavaScript graph library. Its released line, version 3
(3.34.3), takes plug-ins through `cytoscape.use()`: a layout plug-in registers a named layout, and
an algorithm plug-in adds methods to collections. Version 4 is an unreleased rewrite that adds
WebGPU paths for some algorithms and for its force layout.

To test our packages against a real third-party host, we built `@graphty/cytoscape-extensions`
(`cytoscape-extensions/` in this repository, pull request #710). One call,
`cytoscape.use(graphtyCytoscape)`, registers 16 graphty layouts as `graphty-<name>` and all 63
algorithms of @graphty/algorithms as `graphty<Name>` methods. WebGPU, for the 17 algorithms our
GPU package implements and for the three force simulations, needs no second import: the extension
loads the GPU package on demand. cytoscape-extensions is about 2,800 lines of TypeScript with 155
tests.

Separately, a developer persona who had only the published npm packages and docs (no graphty
source) built a smaller version of the same integration and logged the time each step took.
Finally, both libraries' GPU code was benchmarked head to head against Cytoscape v4, and each
algorithm family's kernels were compared and independently checked.

"Measured" below means timed on this machine: NVIDIA RTX 4070 SUPER, Intel i9-14900KF, Linux,
Node 22 with Dawn (the `webgpu` npm package 0.4.0, Vulkan) unless Chromium is named. "Reasoned"
means derived from code reading or from other measurements, not timed directly.

## The three answers

### 1. Do our APIs offer the right flexibility?

The core shape is right, and every integrator said so: a frozen snapshot goes in, typed arrays
indexed by node come out, options come last in one object, unknown options are ignored, and one
accelerator object plugs into both @graphty/algorithms and @graphty/layout. All 13 static
layouts fit one Cytoscape extension because they share one signature. Paths (`pathTo`,
`pathEdges`) are exact even with parallel edges. Where Cytoscape has the same algorithm, our
answers matched it, or the difference traced to a Cytoscape defect.

The gaps are consistency and the last mile, not the core design:

- **GPU setup is left to the consumer.** There is no single "give me a working accelerator"
  call, so cytoscape-extensions repeats graphty-element's 300-line WebGPU lifecycle (probe, context,
  device check, loss recovery, release, disposal).
- **The same concept is spelled several ways.** Four weight rules, five encodings of a node set,
  four partition shapes, four position conventions, and CPU and GPU twins that disagree on
  defaults (`weighted`), on what `tolerance` means, and on seeding.
- **Nothing is keyed by id.** Every node input is an index, and edges have no id map at all.
- **No catalog.** Neither @graphty/layout nor @graphty/algorithms says which exports are
  layouts or algorithms, what they need, or what they return.
- **Missing capabilities a host wants:** pinned nodes in one-shot ForceAtlas2, harmonic closeness
  and path reconstruction on the GPU, a dispatcher that says why it ran on the CPU, and
  articulation points, bridges, biconnected components and Eulerian paths.

### 2. How much work would a person spend, and what would make it simpler?

About 17 to 23 hours (two and a half to three working days) for an adapter as complete as ours,
and about half of that is avoidable. The developer working only from the published packages
spent an estimated 9.5 hours on a third of that scope, of which 4.5 hours were avoidable. The six
changes at the top of the ranked list below remove roughly 8 to 11 of the 17 to 23 hours.

### 3. Can our WebGPU code borrow from Cytoscape v4, or donate to it?

Both, and donating has more to offer than borrowing.

- **Size:** our GPU paths are 1.5x to 6x faster from 32k nodes up, and on every triangle and
  all-pairs size (measured).
- **Correctness:** v4 silently returns wrong PageRank and Katz scores above 524,280 nodes, and
  its betweenness and closeness never finish above 65,535 nodes (measured). Both failures come
  from one-dimensional dispatches that exceed WebGPU's per-dimension limit, which our dispatch
  planner already avoids.
- **Small graphs:** v4 is faster on small graphs, because it does more work per trip to the GPU
  (measured, 1.3x to 6.4x at 1k to 8k nodes for closeness, PageRank and betweenness).

The biggest borrows:

- **Force layout:** one direct dispatch in place of an indirect one cuts our grid-tier time per
  iteration by up to 2.7x (measured).
- **Betweenness:** a wider source batch makes it 3.1x faster at 1k-2k nodes (measured).
- **Closeness:** a restructure that does fewer dispatches per level. A prototype ran 35x faster
  than our current closeness at 2k nodes (measured).

## Evidence 1: API changes, ranked

Ranked by the integration hours they would save. Hours come from the three logs kept while
building cytoscape-extensions (layouts, CPU algorithms, GPU) and from the published-packages developer.
They are reasoned estimates of a person's time, not measurements. "Breaking" means existing
callers would see different results or a removed name.

| #   | Change                                                                                                                                                                                                                                                                                                                                                                                                        | Friction it removes                                                                                                                                                                                                               | Hours saved                   | Breaking?                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| 1   | One managed GPU accelerator in @graphty/webgpu-graph-algorithms: `acquireAccelerator()` / a handle that probes, runs the device-correctness check, recovers after device loss, owns disposal, refuses software adapters by default, and has one import specifier for browser and Node (`node` and `browser` export conditions). graphty-element and cytoscape-extensions would then both be thin callers.     | Every consumer writes the same 300-line lifecycle. The device check is opt-in, so a bad driver fails the user's first call instead of selecting the CPU. Two subpaths must not meet in one bundle. Two software-adapter defaults. | 3 to 4.5                      | No (additive)                                                  |
| 2   | Element ids at the edges: an `edgeIds` field on `fromEdgeArrays`, a `fromElements(nodes, edges, {...})` helper that returns the snapshot plus the edge map, node ids accepted wherever a node or node set is accepted, one `NodeSet` input type (index array, mask, or ids), and id-keyed result views (`scoresById`, `groupsById`, `pathIds`).                                                               | Two hours of conversion code between element references and index arrays, a linear-scan edge lookup, and five set encodings.                                                                                                      | 2.5 to 3.5                    | No (inputs widen)                                              |
| 3   | One simulation contract: every `load()` seeds non-finite rows the same way (CPU ForceAtlas2 currently leaves them NaN), `seedPositions` pads a zero-width box, Fruchterman-Reingold gets the coincident-node kick, `run()` exists on CPU simulations too, a `driveSimulation` frame-loop helper, `load()` accepts a directed snapshot, and `fixed` on one-shot `forceAtlas2`.                                 | Silent NaN output, all nodes collapsing onto one locked node, a hand-written per-frame loop for a `step()` that is `void` on the CPU and a Promise on the GPU, and dropping to the simulation API just to pin nodes.              | 2 to 2.5                      | Seeding is a behavior change (a bug fix); the rest is additive |
| 4   | Consumer documentation: a 30-line GPU quick start, no internal design references in READMEs or TSDoc, published docs pages for graph-format and webgpu-graph-algorithms (both 404 today), one rolled-up `.d.ts` per entry point, the exact PageRank model stated, a routing table for when the dispatcher picks the CPU, and the headless-GPU recipe in the README.                                           | 40 minutes on a 911-line README full of unresolvable references, 35 minutes grepping scattered declarations, and 75 minutes proving our PageRank right and Cytoscape's wrong.                                                     | 2                             | No                                                             |
| 5   | Machine-readable `ALGORITHMS` and `LAYOUTS` catalogs: name, function, kind, required direction, whether weights are read, required inputs, result kind, whether it needs an accelerator.                                                                                                                                                                                                                      | Hand-kept tables of 63 algorithms and 16 layouts, plus side tables (directed-only, weight-ignoring) that go stale on every release. graphty-element's registry could be generated from the same data.                             | 1 to 1.5, plus ongoing upkeep | No                                                             |
| 6   | One rule per concept across CPU and GPU: weights read when the snapshot has them, with `weighted: false` to opt out, and an error when an algorithm cannot use weights; one convergence rule for every power iteration; the same `weighted` default for PageRank; `weighted` on CPU eigenvector.                                                                                                              | Four weight rules (betweenness silently ignores weights); CPU and GPU PageRank stopping at different iterations, so results differ by 4.7e-5 at the same options, above the GPU package's documented 1e-5.                        | 1.5                           | Yes: defaults and stopping points change results               |
| 7   | The dispatcher reports `backend: { ran, reason }` with stable reason codes, uses the CPU function names (keeping the old ones as aliases), and a synchronous CPU table is exported under the same keys.                                                                                                                                                                                                       | cytoscape-extensions cannot say why a call ran on the CPU; ordinary graphs (one isolated node, any bipartite part, `paths: true`) route to the CPU silently; `sssp` and `dijkstra` name the same thing.                           | 1 to 1.5                      | No (aliases)                                                   |
| 8   | Uniform result shapes: every partition extends `LabelResult`, `girvanNewman` returns its best level, `hierarchicalClustering` cuts by cluster count, BFS and DFS return the tree edge, results state their score scale, closeness `normalized` renamed to what it is (Wasserman-Faust) with NetworkX's form added, error codes such as `E_NEEDS_UNDIRECTED`, link prediction lists each undirected pair once. | Four partition shapes, guessing score conventions from option prose, tree edges looked up through the host (wrong on multigraphs), and error advice cytoscape-extensions cannot rewrite.                                          | 1.5 to 2                      | Partly: the closeness rename and the link-prediction change    |
| 9   | One position contract: after any one-shot layout the farthest node is `scale` from `center` (including `arf`, which ignores both today), plus a `fitToBox` helper.                                                                                                                                                                                                                                            | Four unit conventions; cytoscape-extensions ignores `scale` and rescales every result itself.                                                                                                                                     | 0.75 to 1                     | `arf` output changes                                           |
| 10  | GPU uploads released automatically (released when the snapshot is garbage-collected, or a byte budget with least-recently-used eviction).                                                                                                                                                                                                                                                                     | Device memory grows silently unless each consumer releases every snapshot itself.                                                                                                                                                 | 0.5 to 0.75                   | No                                                             |
| 11  | Small items: input types accept `Uint32Array<ArrayBufferLike>`; `astar`'s heuristic is optional; GPU label propagation reports `iterations` and `converged`; the GPU convergence error names the single-precision floor; the `GRAPHTY_GPU_REQUIRE` test helper is published as a `/testing` subpath.                                                                                                          | Compile errors about `SharedArrayBuffer`, an unhelpful error message, and a test helper imported by relative path into the monorepo.                                                                                              | 1                             | No                                                             |

Not friction but a gap: Cytoscape 3 ships articulation points and biconnected components
(Hopcroft-Tarjan) and Eulerian trails (Hierholzer), and we have neither. Bridges and articulation
points are one depth-first search and a common request.

Two questions here are one-way doors and need the owner. First, change 1 moves the GPU lifecycle
from graphty-element into the GPU package. The repository's principles say graphty-element owns
it for element consumers; a consumer that does not use graphty-element needs the same code.
Second, changes 6 and 8 alter published defaults and names.

### Defects found in our packages

The integration also found defects, each now covered by a test or documented in cytoscape-extensions:

- `seedPositions` with exactly one locked node places every other node on it, and
  Fruchterman-Reingold then never separates them.
- The CPU ForceAtlas2 simulation leaves NaN start positions as NaN; the GPU one fills them.
- `planar` puts two nodes on the same point on a 3x3 grid with seed 1.
- `PriorityDeltaPageRank` adds the teleport share twice, so its result is PageRank mixed with a
  uniform share.
- On an undirected graph, link prediction lists every pair twice, so `topK` counts both
  orientations.
- GPU eigenvector centrality at `tolerance: 1e-9` throws `ConvergenceError` (single precision
  cannot get there) while the CPU succeeds.
- **Betweenness overflow is silent.** GPU betweenness counts paths in u32. Grids of 19 x 19 and up
  overflow it (C(36,18) is about 9.1e9), and the kernel raises `sigmaOverflow`. The
  @graphty/algorithms dispatcher drops that flag, so consumers get wrong scores with no signal
  (on a 40 x 40 grid, off by up to 3.7e10; measured). Switching to f32 counts only moves the
  cliff: f32 overflows at a 68 x 68 grid. The fix is to surface the flag first, then rescale the
  path counts level by level (Brandes uses only their ratios).

## Evidence 2: the human-effort estimate, reconciled

| Source                       | Scope                                                                                                                    | Estimate                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Layout log                   | 13 static layouts and 3 simulations as Cytoscape layouts, snapshot cache, pinning                                        | 3.5 to 5 h, half of it reading graphty source                             |
| CPU algorithm log            | All 63 algorithms as Cytoscape methods with Cytoscape-shaped results                                                     | 6 to 8 h, about 2 h reading source and 2 h index/element conversion       |
| GPU log                      | Optional WebGPU for 17 algorithms and 3 simulations, device lifecycle, reporting which backend ran                       | 7 to 10 h, at least half reading source and graphty-element's `webgpu.ts` |
| Published-packages developer | All static layouts, ForceAtlas2 and Fruchterman-Reingold per frame, PageRank (CPU and GPU) and Dijkstra, about 170 lines | 9.5 h, 4.5 h avoidable                                                    |

The three logs total 16.5 to 23 hours for the full scope. The published-packages developer built
about a third of that scope in 9.5 hours. That is slower per feature, but it includes fixed costs
any integrator pays once: learning the snapshot model, building it from host elements, and
finding the GPU chain spread across three READMEs. It also includes an hour lost to the
environment, because Dawn could not see the NVIDIA card without an extracted libEGL tree. The two
sources agree on where the time goes:

- reading source or internal documents where the published docs are silent, about 40-50%;
- conversion between element references and index arrays;
- the simulation loop and seeding;
- the GPU lifecycle.

Reconciled: a person would spend about 17 to 23 hours on an adapter as complete as ours. Changes 1
to 6 above would bring that to about 9 to 12 hours. cytoscape-extensions would also lose its two largest
hand-kept parts, the GPU provider (about 320 lines) and the algorithm table with its side lists.

## Evidence 3: benchmark, Cytoscape v4 against ours

Both libraries ran in one Node process on one Dawn instance, each with its own device on the RTX
4070 SUPER, on the same graphs (Cytoscape v4's own generators) with matched parameters. Each call
is timed from the call to a result in host memory. Ours is shown with the graph upload included,
which matches v4, which builds and uploads on every call. Ratio = v4 time / our time, so above 1
means ours is faster. Medians, all measured. Outputs agree to f32 precision everywhere v4's GPU
path works.

| Family        | Fixture               | GPU ratio by size                               | CPU ratio by size                     | Notes                                                                                                           |
| ------------- | --------------------- | ----------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| PageRank      | sparse ring           | 0.66 at 1k, 1.55 at 32k, 2.91 at 131k           | 0.71 to 1.12                          | v4 wrong at 1M (71% off). v4 rebuilds and uploads the graph every call (9.3 ms fixed cost at 131k; ours 1.6 ms) |
| PageRank      | dense (~n^2/12 edges) | 0.76 at 512, 1.17 at 1k, 3.16 at 2k, 3.87 at 4k | 1.22 to 1.51                          | v4's per-call graph rebuild dominates                                                                           |
| Katz          | sparse ring           | 1.09 at 1k, 2.40 at 32k, 4.89 at 131k           | 1.34 to 2.04 from 32k                 | v4 wrong at 1M (100% off)                                                                                       |
| Betweenness   | ring                  | 0.78 at 1k, 1.16 at 2k, 1.99 at 8k, 4.24 at 32k | 2.8 to 4.3                            | v4 never finishes at 131k; ours 32 s                                                                            |
| Closeness     | ring                  | 0.16 at 1k, 0.25 at 2k, 0.46 at 8k, 1.71 at 32k | 0.76 to 0.86                          | v4 never finishes at 131k; ours 20 s                                                                            |
| Triangles     | dense                 | 1.45 at 512, 4.16 at 1k, 3.51 at 2k, 5.14 at 4k | 1.6 to 2.1                            | Totals identical                                                                                                |
| Triangles     | sparse ring           | 2.14 at 1k, 106 at 8k                           | 3.5                                   | v4 computes a dense n^3 product whatever the edge count                                                         |
| All-pairs     | ring                  | 4.5 at 512, 6.1 at 1k, 3.7 at 2k, 3.1 at 4k     | 23 to 171                             | Distances identical                                                                                             |
| Components    | m = n                 | v4 has no GPU version                           | 31 at 1k, 1,407 at 32k, 5,751 at 131k | v4's `components()` rescans every edge per component                                                            |
| BFS           | m = 4n                | v4 has no GPU version                           | 12 to 49                              | Ours on the GPU beats ours on the CPU only at 1M nodes                                                          |
| Dijkstra      | m = 4n                | v4 has no GPU version                           | 9 to 12                               | Distances identical                                                                                             |
| MST (Kruskal) | m = 4n                | neither has a GPU version                       | 1.7 to 3.2                            | Total weights identical                                                                                         |

Force layout. The two layouts use different models, so the comparison is time per iteration
(the slope between 50 and 300 iterations) plus a quality metric shared by both. All measured.

| Nodes   | v4 GPU ms / iteration | Ours, best GPU ms / iteration | v4 run of 50 iterations | Ours, run of 50 iterations | Stress (v4 / ours, lower is better) |
| ------- | --------------------- | ----------------------------- | ----------------------- | -------------------------- | ----------------------------------- |
| 2,000   | 0.038                 | 0.173                         | 188 ms                  | 11 ms                      | 0.192 / 0.178                       |
| 10,000  | 1.84                  | 0.78                          | 601 ms                  | 34 ms                      | 0.196 / 0.184                       |
| 25,000  | 2.67                  | 1.31                          | 1,541 ms                | 75 ms                      | 0.200 / 0.185                       |
| 100,000 | 11.9                  | 2.33                          | 13,560 ms               | 105 ms                     | 0.214 / 0.191                       |

At 2k nodes v4 is faster per iteration because it batches up to 64 iterations per readback;
ours with a batch of 64 reaches 0.072 ms. v4 also spends 0.19 to 13 seconds on fixed costs per
run (spectral seeding and post-passes).

Cytoscape v4's own GPU sweep, run in Chromium on this card, reproduces its published shape:

- **Dense n^3 families gain 10x to 536x** over its CPU: Markov clustering, heat kernel,
  random-walk proximity, SimRank, Floyd-Warshall.
- **PageRank and Katz lose to its CPU,** because every call costs 2 to 4 ms whatever its size.

## Evidence 4: what to borrow from Cytoscape v4

Only items that survived independent checking are listed. "Ours" means
@graphty/webgpu-graph-algorithms unless another package is named. None of these copies Cytoscape
code. Both projects are MIT-licensed.

| Change in our code                                                                                                                                                                                                                                                                                                                                              | Expected gain                                                                                                                                                                                                                                                    | Basis                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Force layout: dispatch the hub-cell centroid directly instead of indirectly (`src/primitives/grid-pyramid.ts`). Dawn validates each indirect dispatch at 0.3 to 0.9 ms of device time. This repeats our own earlier lesson from the frontier kernels, and v4 shows the direct form. After it lands, re-measure the exact-to-grid threshold (`EXACT_MAX_NODES`). | Grid tier per iteration: 1.40 to 0.52 ms at 10k nodes, 1.53 to 0.75 ms at 1k, 1.74 to 1.16 ms at 200k; run-to-run spread mostly gone                                                                                                                             | Measured                                                                        |
| Betweenness: raise the source-batch cap from 64 to 256 (`BC_MAX_BATCH`). Keep 32 forward levels per submit, because the uniform ring overflows above that.                                                                                                                                                                                                      | 3.1x at 1k and 2k nodes, 1.9x at 4k, bit-identical scores                                                                                                                                                                                                        | Measured (forward form pinned; the default chooses the same form on this graph) |
| Closeness: a pulled, bit-parallel step with several 32-bit words per node (128 or more sources per batch) and one dispatch per level, chosen per level against the current push sweep.                                                                                                                                                                          | Prototype: 3.6 ms at 2k nodes against ours at 127 ms and v4 at 59 ms. The prototype is undirected only, timed after setup, and tested on uniform degree; a version inside the package will gain less. Needs an early exit for high-degree nodes before adoption. | Measured (prototype)                                                            |
| Closeness: for small or dense unweighted graphs, compute all-pairs distances on the GPU and sum the rows as integers, instead of running the BFS sweep.                                                                                                                                                                                                         | Our all-pairs beats our closeness 10x to 24x on the dense fixture, 1.5x to 16x on the sparse ring up to 8k nodes                                                                                                                                                 | Measured                                                                        |
| Weighted closeness: same all-pairs-plus-row-sum route for exact runs, instead of one shortest-path call per source. Applies below the 5,792-node all-pairs cap; scores may change in the last bits.                                                                                                                                                             | 2,444 ms per call at 1k nodes today against 4 ms for the all-pairs sweep (the row-sum kernel is not written yet)                                                                                                                                                 | Measured                                                                        |
| Harmonic closeness on the GPU, from the per-level counts we already keep (exact per-source route).                                                                                                                                                                                                                                                              | Removes a forced CPU route                                                                                                                                                                                                                                       | Reasoned                                                                        |
| Power iteration (PageRank, Katz, eigenvector, HITS): read the result vector once per run, not once per batch of 8. Also skip work after convergence with a device-side guard; that makes the returned vector the converged one and saves about 3.5 iterations per run.                                                                                          | About 11% of a 100-iteration run at 1M nodes (1.9 ms per discarded 4 MB readback, measured)                                                                                                                                                                      | Reasoned                                                                        |
| PageRank at small sizes: stop re-binding three kernels every iteration; encode more iterations per submit.                                                                                                                                                                                                                                                      | Our PageRank costs 0.062 ms per iteration at 1k nodes against v4's 0.011 and our own Katz's 0.013                                                                                                                                                                | Measured cause, reasoned gain                                                   |
| Power iteration: turn on our existing high-degree row tiers (32 lanes, or a workgroup per row) when any row has in-degree 32 or more. PageRank's normaliser needs the out-degree order.                                                                                                                                                                         | v4's 32-lane shape beats our one-thread-per-row SpMV 3.7x to 6.3x on hub-heavy graphs; the gain of our own tiers was not timed                                                                                                                                   | Reasoned                                                                        |
| All-pairs: a finite sentinel instead of +Infinity inside kernels (WGSL lets compilers assume no infinities), guarded by a host check on weight magnitude.                                                                                                                                                                                                       | Portability insurance; no speed change                                                                                                                                                                                                                           | Reasoned                                                                        |
| All-pairs: accept negative weights and report a negative cycle from the diagonal.                                                                                                                                                                                                                                                                               | Such graphs stay on the GPU instead of an O(n^3) CPU run                                                                                                                                                                                                         | Reasoned                                                                        |
| Triangles: skip the simple-graph rebuild when the snapshot is already undirected with no multi-edges or self-loops, which saves one host round trip. Do not use indirect dispatch for this (0.4 ms each on Dawn).                                                                                                                                               | Up to a third of the 6 to 15 ms per-call cost in Chromium                                                                                                                                                                                                        | Reasoned                                                                        |
| Return the clustering coefficient as f64, like the CPU and like v4. Changes an exported type, so it needs a decision.                                                                                                                                                                                                                                           | GPU and CPU results identical                                                                                                                                                                                                                                    | Reasoned                                                                        |
| Overlap removal for sized nodes on the GPU; v4 does it every tick over its repulsion grid. Ours rejects node sizes with `E_UNSUPPORTED`.                                                                                                                                                                                                                        | New capability                                                                                                                                                                                                                                                   | Reasoned                                                                        |
| A dense GPU Markov clustering path for dense graphs only. It must be f32 (ours is f64 on the CPU), so parity has to be stated by invariants, and it is capped at 5,792 nodes under default limits.                                                                                                                                                              | On v4's dense fixture our sparse CPU code takes 2.8 s at 1k nodes; v4's dense GPU takes 30.7 ms at 512                                                                                                                                                           | Measured direction, reasoned gain                                               |

The comparison also turned up improvements to our own code that v4 does not do either:

- **Afforest components:** raise the "changed" flag only when a link walk runs out of steps. At
  1M nodes and 1.2M edges this cuts one batch of edge rounds (2 batches to 1, measured), and it
  enables two host round trips per call instead of five.
- **Label propagation:** a convergence latch on the device, as our shortest-path kernels already
  have. It removes up to 7 wasted passes, about 29 ms each at 1M nodes and 10M edges (reasoned).
- **Floyd-Warshall:** true register blocking in its min-plus phase. Neither side does it, although
  v4's comment says it does.
- **Batched weighted shortest paths:** run many weighted shortest-path sources per batch, for
  weighted closeness above the all-pairs cap.
- **Betweenness forward pass:** choose push or pull per level with the switching rule our BFS
  already uses.

Not worth acting on (measured or checked): fusing the force kernels, v4's alpha window and
adaptive batch size, not awaiting the backward betweenness submit (on Dawn in Node; it is worth
re-measuring in Chromium, where a readback costs about 2 ms), v4's dense matrix-multiply
triangle count, and f32 precision differences.

Minimum graph sizes for GPU routing are not a borrow: graphty-element already applies measured
floors per algorithm. Only callers of the @graphty/algorithms dispatcher who bypass the element
miss them.

## Evidence 5: what Cytoscape v4 could take from us

Recorded for our own reference. Nothing has been posted to any Cytoscape issue, pull request or
repository.

| Change in their code                                                                                                                                                                                          | Expected gain                                                                                                                                                                                                                           | Basis                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Plan dispatch grids from device limits (a 2D grid or a capped grid stride) and capture validation errors on the algorithm path. Their renderer already has a limit-fit helper and an error-scope ledger.      | Correct results instead of silent wrong ones: PageRank returns 1 and Katz 0 for every node above 524,280 nodes; betweenness and closeness never finish above 65,535 nodes, where ours returns correct scores (6.9 s on a 70k-node star) | Measured                                          |
| Reduce over n with every workgroup instead of one workgroup sweeping the whole vector (their PageRank and Katz epilogue).                                                                                     | 1.07 ms against 25 us per iteration at 1M nodes (ours timed on a simplified copy)                                                                                                                                                       | Measured                                          |
| Encode short batches with a 4-byte convergence flag instead of all 200 iterations up front.                                                                                                                   | More than half of their call at 2k nodes is no-op iterations after convergence (2.2 to 2.7 ms against 0.9 to 1.1 ms)                                                                                                                    | Measured                                          |
| Build the Floyd-Warshall distance matrix on the GPU from the sparse graph instead of in JavaScript loops. This also speeds up their weighted and dense closeness, which use the same path.                    | Their host loops take 13.7 / 39.1 / 141.8 ms of 29.6 / 76.9 / 332.5 ms calls at 1k / 2k / 4k nodes; our whole call takes 4.2 / 17.2 / 95.7 ms                                                                                           | Measured                                          |
| Our sparse, degree-oriented GPU triangle count (about 60 lines of WGSL) instead of a dense n x n matrix product.                                                                                              | 1.4x to 4x on their dense fixtures; 2,267 ms to 2.7 ms on a sparse 16k-node graph forced onto the GPU; no n^2 memory ceiling; exact counts                                                                                              | Measured                                          |
| Orient by (degree, id) in their CPU triangle walk.                                                                                                                                                            | 2x on dense graphs, up to 390x on hub graphs (1,727 ms to 4.4 ms at 65k nodes)                                                                                                                                                          | Measured                                          |
| Reuse staging buffers for readback instead of creating one per call.                                                                                                                                          | Median 0.74-1.42 ms to 0.03-0.14 ms per readback in Node + Dawn, and 19-37 ms tails removed; not measured in Chromium                                                                                                                   | Measured                                          |
| Force layout: widen the grid cell so a 256-cell grid covers the frame (`cellSize = max(cutoff, frame / 256)`), and cap near-field work in crowded cells by unbiased sampling.                                 | Their runtime: 20.5-22.5 ms per iteration at 50k nodes, down to 1.6-2.7 ms; 161-172 ms at 200k, down to 53-55 ms                                                                                                                        | Measured (cell widening); reasoned (sampling cap) |
| Force layout: process nodes in cell-sorted order, and store springs as a neighbour list with multi-lane rows for high-degree nodes.                                                                           | Coalesced loads; removes 3 of 4 dependent loads per edge                                                                                                                                                                                | Reasoned                                          |
| Linear-time connected components (their v3 walk or their own union-find) in place of the v4 regression that rescans every edge per component.                                                                 | 29 s at 80k nodes / 40k edges today                                                                                                                                                                                                     | Measured (the defect)                             |
| Sparse Markov clustering with pruning, routed by density.                                                                                                                                                     | Ours takes 17 ms at 1k nodes on their sparse fixture, below their dense GPU at 512 nodes on the same card                                                                                                                               | Measured direction                                |
| Distance-only Floyd-Warshall for closeness, 3 dispatches per panel instead of 5, and exact integer closeness sums (theirs lose exactness past 2^24).                                                          | Smaller uploads and fewer dispatches                                                                                                                                                                                                    | Reasoned                                          |
| Edge betweenness, sampled betweenness, and closeness without unused path counts.                                                                                                                              | New features; closeness memory cut from 8 to 0.5 bytes per (node, source)                                                                                                                                                               | Reasoned                                          |
| A device-correctness self-check before trusting an adapter, as ours does.                                                                                                                                     | Refuses drivers that miscompute multi-workgroup shaders                                                                                                                                                                                 | Reasoned                                          |
| GPU Boruvka minimum spanning forest (our branch `feat/webgpu-boruvka-mst`). It matches their Kruskal only when weights are exact in f32 and edge order is preserved; its speedups are modelled, not measured. | Unknown until timed against their Kruskal                                                                                                                                                                                               | Reasoned                                          |

A CPU finding with the same status: Cytoscape's `pageRank` (v3 and v4) does not scale the links
by the damping factor, so `dampingFactor: d` behaves like standard damping `1 / (2 - d)`.
Ours with damping `1 / 1.15` matches theirs at 0.85 to 1.94e-11 (measured).

See `cytoscape-extensions/README.md` for the API of cytoscape-extensions.
