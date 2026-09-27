# Label propagation over a graph-format snapshot: design

Status: proposed, 2026-09-27. The new exports listed under "Public API" need the owner's approval
before they ship.

Implementation plan: `design/algorithms/label-propagation-indexed-port-plan.md`.

## 1. The problem

`@graphty/algorithms` ships label propagation community detection as three functions in
`algorithms/src/algorithms/community/label-propagation.ts`: `labelPropagation`,
`labelPropagationAsync` and `labelPropagationSemiSupervised`. All three convert a legacy `Graph`
into a `Map<string, Map<string, number>>` with `graphToMap`
(`algorithms/src/utils/graph-converters.ts:10-39`) and, for every node they visit, build a fresh
`Map<number, number>` of label weights. Every arc therefore costs a string-keyed `Map.get` for the
neighbour's label plus a `Map.get` / `Map.set` on the per-node counter.

The package already has index-based ports of ten other algorithms under `algorithms/src/indexed/`,
reached as the `indexed` namespace. They read a `GraphSnapshot` from `@graphty/graph-format`
(CSR typed arrays) and allocate nothing per arc. Label propagation has no such port.

The cost of that gap is measured. The GPU cost record
(`design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`, lines 72-77) puts the GPU at
31x / 337x / 508x over the shipped `labelPropagation` at 10k / 100k / 1M nodes on the minima
(35x / 400x / 603x on loaded medians), and attributes 17-31x of each of those gaps at 100k to the
missing CPU port rather than to the GPU. The 1M figures are extrapolated from 100k: the shipped
function was never run at 1M (same record, lines 553-558). Its "label propagation vs a port" row
(line 68) was derived from an ESTIMATED port -- three times an indexed PageRank of 100 iterations
(`tmp/gpu-cost-model/final-model.md` of the main checkout, line 111) -- not a measured one; the record re-derived the rows of the four ports that
landed in PR #507 and those moved in both directions (Louvain's assumed 20x measured 1.8x). So the
record's label propagation verdict is waiting on a real port too.

A second, independent part of the gap is semantic, not per-arc overhead: the shipped
`labelPropagation` stops only after a sweep in which no label changed, while still drawing ties at
random. On tie-rich graphs (paths, trees, road networks) it therefore never stops. Measured against
`algorithms/dist`: a 1,000-node path ran all 100 iterations and returned `converged: false` on seeds
1, 2 and 3, and planted-partition graphs took 8-35 iterations (research probe run for this design).
The cost record's own bench graphs (random, 10 edges per node) show the same thing: the shipped
function ran to its cap of 100 passes on every size (`final-model.md` line 97, "label propagation
100 (the cap it hit)"), and the GPU model is costed at 100 passes. A port that fixes the stop rule
is faster on those graphs for a reason unrelated to typed arrays, and the benchmark in section 9
keeps the two effects apart.

## 2. What the port computes

### 2.1 Algorithm: fast label propagation (FLPA)

The port implements FLPA, Traag and Subelj, "Large network community detection by fast label
propagation", Sci. Rep. 13:2701 (2023), Algorithm 3 (https://arxiv.org/pdf/2209.13338). It is the
asynchronous label propagation of Raghavan, Albert and Kumara 2007 (https://arxiv.org/pdf/0709.2938)
with the full sweeps replaced by a queue:

1. Every node starts with its own index as its label.
2. The queue starts as a seeded random shuffle of all nodes.
3. Pop a node. Sum the weight of its arcs per neighbour label. The dominant labels are those at the
   maximum sum. Draw one uniformly at random -- including when the node's current label is among
   them.
4. If the label changed, push every neighbour whose label differs from the new one and that is not
   already queued.
5. Stop when the queue is empty.

At termination every node's label is dominant among its neighbours -- the same guarantee as
Raghavan's stop criterion (Raghavan section III; Traag and Subelj prove it for Algorithm 3: a node
leaves the queue only while its label is dominant, and a neighbour switching to that label can only
strengthen it). On 100k-node synthetic graphs FLPA ran 3-10x faster than the original and on
empirical graphs of 1-69M edges 30-700x faster, with partition quality on par (Traag and Subelj,
Table II and Results). NetworkX ships the same algorithm as `fast_label_propagation_communities`
(https://github.com/networkx/networkx/blob/9094b639455aca34109f0c167f8efd12778d6ccf/networkx/algorithms/community/label_propagation.py#L19-L139)
and igraph as `IGRAPH_LPA_FAST`
(https://github.com/igraph/igraph/blob/ba6adddc7e286dcce3a0c38446d8eac94ef216fb/src/community/label_propagation.c#L255-L420).

### 2.2 Why FLPA, and not the alternatives the research proposed

The three research reports disagreed on the semantics. The choices, and why this design takes the
first:

| Candidate                                                                                                                                    | Proposed by                        | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FLPA: asynchronous, seeded random order, uniform random tie among dominant labels                                                            | papers and implementations reviews | **Chosen.** It is the algorithm the shipped `labelPropagation` claims to be (Raghavan, seeded order, random ties) with its stop rule done correctly, so `randomSeed` keeps its meaning for graphty-element, whose options schema publishes it (`graphty-element/src/algorithms/LabelPropagationAlgorithm.ts:21-46`). It skips nodes whose neighbourhood did not change, which is the largest single-thread win available.                                                                                                                                                                                                                                                                                                  |
| Synchronous passes, lowest-label tie, cuGraph's alternating up/down move rule, stop after two quiet passes -- the GPU's semantics on PR #550 | repository review                  | Rejected as the default. It gives bitwise CPU/GPU agreement, but (a) it makes `randomSeed` a published option with no effect, (b) on PR #550 it ran to the 100-pass cap on the random 100k and 1M graphs, where an asynchronous run converges, and (c) the up/down rule exists only because synchronous updates make neighbours swap labels forever (cuGraph `cpp/src/community/detail/common_methods.cuh#L117-L152`); a sequential in-place update does not oscillate. The GPU plan already judges CPU/GPU parity by planted-partition recovery (adjusted Rand index >= 0.9), never bitwise (`design/webgpu/plans/2026-09-23-webgpu-p11-structure-and-community.md` lines 529-535), so bitwise agreement is not required. |
| Retention (keep the current label when it is dominant) with the lowest tied label otherwise, over a queue                                    | implementations review             | Rejected as the default. It is deterministic and provably stops after at most m label changes on unweighted graphs (Cordasco and Gargano, https://arxiv.org/pdf/1103.4550, Theorem 1), but it changes the answer: on Erdos-Renyi graphs it stops almost at once with a near-singleton partition and on stochastic block models it splits each planted group into many small clusters, where the original and FLPA recover the planted partition (Traag and Subelj, Retention strategy section; Subelj review https://arxiv.org/pdf/1709.05634 section 1.1.4). On the Power grid network Barber and Clark's retention rule gave modularity about 0.6 against about 0.8 for random ties (Cordasco and Gargano, Results).     |

Not implemented, and why:

- **A synchronous CPU mode for bitwise GPU parity.** Parity is by adjusted Rand index today. Add it
  only if someone needs bitwise comparison; the kernel's group-by would be reused unchanged.
- **Semi-synchronous colouring (Cordasco and Gargano; NetworkX `label_propagation_communities`).**
  Its benefit is parallelism inside a colour class, which single-threaded JavaScript does not have,
  and it needs a greedy colouring first.
- **GVE-LPA's tolerance stop (changed/N <= 0.05, 20 iterations) and strict first-maximum tie**
  (Sahu 2023, https://arxiv.org/pdf/2312.08140 section 4.1;
  https://github.com/puzzlef/rak-communities-openmp/blob/main/inc/rak.hxx#L25-L46). The tolerance
  gives up the guarantee that every label is dominant. The strict tie is deterministic but is the
  first maximum in adjacency order, which on this snapshot means the lowest neighbour index -- a
  bias, not a rule. Both trade the guarantee for speed and neither is needed once the queue exists.
- **Label inclusion, hop attenuation, node preference** (Leung et al. 2009,
  https://arxiv.org/pdf/0808.2633 sections III-IV). Extra parameters that change results; not part
  of the shipped API.
- **LPAm, the modularity-penalised rule** (Barber and Clark 2009, https://arxiv.org/pdf/0903.3138
  Appendix A). A cheap follow-up on the same kernel (one extra `Float64Array(n)` of label volumes),
  out of scope for a port.
- **SLPA and LabelRank** (https://arxiv.org/pdf/1109.5720, https://arxiv.org/pdf/1303.0868). They
  keep several labels per node; they are different algorithms, not deterministic variants of this
  one.
- **A post-pass splitting a label that covers several disconnected groups** (Raghavan section V).
  It changes the result shape relative to the shipped function; add it as an option when asked.
- **Semi-supervised input (fixed and initial labels, igraph's `initial` / `fixed`).** The same queue
  kernel supports it -- fixed nodes simply never enter the queue -- but nothing in graphty-element
  calls `labelPropagationSemiSupervised`. A later change can add it without touching this one.

cuGraph ships no label propagation to port: its community module has Louvain, Leiden, ECG, spectral
clustering, triangle count and k-truss only
(https://github.com/rapidsai/cugraph/blob/8443253f867df7b19126e46c34d8f4c94895d034/python/cugraph/cugraph/community/__init__.py,
lines 4-18), and nx-cugraph falls back to NetworkX for label propagation. What carries over from
cuGraph's Louvain move phase is the lowest-id tie in its reduce operator and the flat array layout;
its sort-based key aggregation, per-vertex hash regions and the up/down rule are GPU machinery that
loses to a dense accumulator on one CPU thread. graphology and graph-tool have no label propagation
either.

### 2.3 Graph conventions

The port runs on the **simple symmetric view** of the snapshot, the same graph the GPU kernel on
PR #550 prepares (`webgpu-graph-algorithms/src/algorithms/simple-symmetric.ts` on branch
`feat/webgpu-structure-substrates`), so the two paths see identical input:

- **Undirected snapshot:** the snapshot already stores both arcs of every edge (graph-format
  invariant I7).
- **Directed snapshot:** a node's neighbours are its out-arcs AND its in-arcs, the in-arcs read
  through `s.reverse()`. A reciprocal pair u->v, v->u therefore counts twice (weight 2 on an
  unweighted snapshot), as on the GPU. This is what NetworkX FLPA (`all_neighbors`) does and what
  igraph advises (mode ALL; its docs warn that directed labels circulate only inside strongly
  connected components). `s.toUndirected()` is NOT used: it collapses a reciprocal pair into one
  edge (keep-first, `graph-format/src/snapshot/graph-snapshot.ts:832-844`), which the GPU does not.
- **Requeue on a directed snapshot** walks the same two lists, so the nodes that READ a changed node
  are requeued. igraph's FLPA appears to requeue the nodes the changed node reads from instead,
  which in directed mode can leave a no-longer-dominant node out of the queue (reading of
  `community_fast_label_propagation` in igraph's `src/community/label_propagation.c`, not
  verified). Symmetrising both sides avoids the question.
- **Parallel arcs are summed.** Rows are sorted by target (invariant I4), and the dense accumulator
  sums every arc it sees, so two parallel edges of weight 1 vote with weight 2.
- **Self-loops are skipped.** A self-loop does not vote for the node's own label. The GPU kernel
  and GVE-LPA (`rak.hxx` line 221, `SELF=false`) do the same; igraph counts a self-loop once. The
  choice matters -- counting the node's own label is Leung's "label inclusion", which changes
  results and can create ties at a hub (Subelj review section 1.1.1) -- and skipping keeps the CPU
  and GPU on the same graph.
- **Weights.** `weighted` defaults to `true`. With `s.weights === null` every arc weighs 1. F32 arc
  weights are accumulated in F64. A weight that is negative, NaN or infinite throws a `RangeError`
  before any work (igraph rejects negative and NaN weights, `label_propagation.c#L570-L654`). With
  `weighted: false` each distinct neighbour votes once, whatever the multiplicity or direction of
  the arcs joining them -- the GPU's unweighted rule.
- **A node with no positive-weight neighbour keeps its label.** That covers isolated nodes (as in
  NetworkX and igraph) and nodes whose only arcs weigh 0.

### 2.4 Randomness

The shipped `SeededRandom` (`algorithms/src/utils/math-utilities.ts:4-43`) computes
`(1103515245 * seed + 12345) % 2^31` in float64. The product reaches about 2.4e18, above 2^53, so
the low bits are rounded away and the stream is not the intended linear congruential generator; and
`next()` can return exactly 1.0, one past the end of a candidate array (the shipped code hides this
behind an `undefined` check). The port uses mulberry32 (32-bit state, `Math.imul`, output in
[0, 1)) seeded with `randomSeed` (default 42, as shipped). It is private to the port file; no
second caller needs it.

The RNG is used in exactly two places: the initial Fisher-Yates shuffle, and the tie draw. A tie is
drawn by reservoir sampling in a second pass over the node's touched labels (the k-th label at the
maximum replaces the pick with probability 1/k), so a node with one dominant label draws nothing and
no candidate array is built. That also removes the shipped duplicate-candidate bias (section 3).

One seed gives one result, bit for bit, on every run and platform: the arithmetic is integer except
the F64 weight sums, and those are summed in a fixed arc order.

### 2.5 Termination and the work cap

FLPA terminates with probability 1 but not after a bounded number of steps: a random tie draw can
flip a node between two dominant labels. The port therefore caps the work at `maxIterations * n`
node visits (default `maxIterations` 100, as shipped), the same cap shape as the indexed Louvain's
`maxVisitsPerNode` (`algorithms/src/indexed/louvain.ts:139-214`).

- `converged` is `true` exactly when the queue emptied, i.e. every label is dominant.
- `iterations` is `ceil(visits / n)`, the number of full-sweep equivalents, so the figure stays
  comparable with the shipped function's sweep count. It is 0 when `n` is 0.
- `maxIterations: 0` returns the identity labelling (every node its own community) with
  `converged: n === 0`, matching the GPU's `maxIterations: 0` identity.
- `maxIterations` must be a non-negative integer, otherwise `RangeError`.

## 3. Result semantics against the shipped function

The shipped functions stay exactly as they are (section 6). This table is what a caller moving from
`labelPropagation(graph, options)` to `indexed.labelPropagation(toSnapshot(graph), options)` sees.

| Aspect                           | Shipped `labelPropagation`                                                                                                                                                                     | Port                                                                   | Why it differs                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update order                     | Seeded shuffle, full sweep every iteration                                                                                                                                                     | Seeded shuffle once, then a queue of nodes whose neighbourhood changed | FLPA; same fixed-point guarantee, far fewer visits                                                                                                                                                               |
| Stop rule                        | A sweep with no label change                                                                                                                                                                   | Queue empty (every label dominant), or the visit cap                   | The shipped rule never fires on tie-rich graphs because ties are redrawn every sweep (section 1); Raghavan's stop criterion is dominance, not "no change"                                                        |
| Tie draw                         | Uniform over a candidate list in which the current label appears twice when it ties (label-propagation.ts:88-109), so it is kept with probability 2/(k+1); zero-weight arcs can add duplicates | Uniform over the dominant labels (reservoir sampling)                  | Shipped bias is a defect                                                                                                                                                                                         |
| Random stream                    | `SeededRandom` (section 2.4)                                                                                                                                                                   | mulberry32                                                             | Shipped generator is not the LCG it claims; for the same `randomSeed` the two return different partitions on any graph with more than one valid answer                                                           |
| Parallel edges                   | Last weight wins (`graphToMap` uses `Map.set`)                                                                                                                                                 | Summed                                                                 | Shipped behaviour is a defect; graphty-element already merges parallel edges with summed weights before it dispatches (`graphty-element/src/algorithms/Algorithm.ts:419-445`), so the element sees no difference |
| Self-loops                       | Vote for the node's own label                                                                                                                                                                  | Ignored                                                                | Same graph as the GPU (section 2.3)                                                                                                                                                                              |
| Directed graph                   | Out-neighbours only                                                                                                                                                                            | Out- and in-neighbours                                                 | NetworkX FLPA, igraph advice, the GPU; out-only labels circulate only within strongly connected components                                                                                                       |
| Negative / NaN / infinite weight | Accepted silently                                                                                                                                                                              | `RangeError`                                                           | igraph's rule; a negative vote has no meaning here                                                                                                                                                               |
| Label numbering                  | Dense, first-seen in node order                                                                                                                                                                | Dense, first-seen in node index order (`renumberPartition`)            | Same convention; `toSnapshot` keeps node order                                                                                                                                                                   |
| `iterations`                     | Sweeps run                                                                                                                                                                                     | `ceil(visits / n)`                                                     | Comparable scale                                                                                                                                                                                                 |
| Empty graph                      | `{ communities: empty, iterations: 0, converged: true }`                                                                                                                                       | `{ count: 0, iterations: 0, converged: true }`                         | Identical                                                                                                                                                                                                        |
| Single node, isolated nodes      | Own community; `iterations: 1`, `converged: true` for an edgeless graph                                                                                                                        | Same                                                                   | Identical                                                                                                                                                                                                        |

**Identical** results are guaranteed only where the partition is determined by the graph: disjoint
cliques (one community per clique), a complete graph (one community), isolated nodes (singletons).
Everywhere else both functions are randomised heuristics and the comparison is by quality
(section 8).

## 4. Data layout

All scratch space is allocated once per call; nothing is allocated per node or per arc.

| Array     | Type, length                                 | Role                                                                              |
| --------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `label`   | `Uint32Array(n)`                             | Current label per node, starts as the identity                                    |
| `acc`     | `Float64Array(n)`                            | Summed weight per label for the node being visited                                |
| `stamp`   | `Int32Array(n)`, filled with -1              | Visit number that last wrote `acc[c]`; replaces a clearing pass                   |
| `touched` | `Uint32Array(n)`                             | Labels written during the current visit                                           |
| `seen`    | `Int32Array(n)`, only when `weighted: false` | Visit number that last counted neighbour v, so each distinct neighbour votes once |
| `queue`   | `Uint32Array(n + 1)` ring                    | Nodes waiting; `queued` keeps a node in it at most once, so n + 1 slots suffice   |
| `queued`  | `Uint8Array(n)`                              | In-queue flag                                                                     |

This is the stamp / accumulator / touched-list idiom of the indexed Louvain's local move
(`algorithms/src/indexed/louvain.ts:139-214`), igraph's dense `label_weights` with its
`nonzero_labels` list (`label_propagation.c#L255-L420`) and GVE-LPA's "collision-free hashtable" of
a key list plus a full-size value array (`rak.hxx#L118-L139`, reported 15.8x faster than a map in
Sahu 2023 section 4.1). A label is a node index, so `acc` is indexed directly with no hashing.

The stamp is a signed `Int32Array` initialised to -1 and the visit counter starts at 0, so label 0
is an ordinary label. GVE-LPA uses community id 0 as "none" (`if (c && c != d)`, `rak.hxx` line 298),
which means no vertex can ever adopt vertex 0's label; the port must not copy that.

The visit counter is bounded by the cap `maxIterations * n`. It is stored in a plain number and
compared against `Int32Array` entries, so the cap must stay below 2^31: with the default cap of 100
that allows n up to about 21 million, and the port throws a `RangeError` for a larger
`maxIterations * n` rather than wrapping.

The result is `renumberPartition(label)` from `@graphty/graph-format`
(`graph-format/src/snapshot/derived.ts:1155`) wrapped by `withGroups` from
`algorithms/src/indexed/components.ts`, the same pair the indexed Louvain and the GPU kernel use.

## 5. Optimisations

Chosen:

- **The queue (FLPA)** instead of full sweeps. The largest win on one thread: after the first pass
  only nodes near a change are revisited (Traag and Subelj; the implementations review names it the
  single largest algorithmic win).
- **Dense accumulator with a stamp.** O(degree) per visit, no clearing pass, no `Map`.
- **Two-pass tie draw.** Pass 1 over `touched` finds the maximum, pass 2 draws. A node with one
  dominant label (most visits once labels settle) consumes no random number.
- **Requeue filter.** Only neighbours whose label differs from the new one are pushed; a neighbour
  already holding the new label can only have had it strengthened.
- **Reverse view read, not copied.** `s.reverse()` is cached on the snapshot; the port walks it in
  place and never materialises a symmetrised CSR.

Rejected:

- **Tracking the maximum while scanning** (igraph's `dominant_labels`). Correct only with care:
  with zero or equal weights a label reaches the running maximum more than once and is listed
  twice -- the shipped bias. The second pass over `touched` is cheap (at most the degree).
- **Active-vertex flags over full sweeps** (GVE-LPA, credited with 17%). The queue subsumes them.
- **Per-vertex open-addressing tables, sort-based key aggregation, up/down and Pick-Less** (nu-LPA,
  https://arxiv.org/html/2411.11468 sections 4-4.5; cuGraph). They exist for GPU memory limits and
  synchronous updates.
- **A random start offset instead of a shuffle** (graphology Louvain's `randomWalk`). The shuffle is
  one O(n) pass, done once; the saving is not worth a weaker order.
- **An `Int32Array` accumulator for unweighted input.** Counts up to 2^53 are exact in F64 and one
  code path is simpler; revisit only if the benchmark shows the F64 adds measurable time.

## 6. How the shipped functions relate to the port

The pattern is PR #507's (k-core, Katz, HITS, Louvain): the port lands alongside the legacy
function, and **no legacy function dispatches to it**. `labelPropagation`,
`labelPropagationAsync` and `labelPropagationSemiSupervised` keep their code, signatures and
results. Delegating would change the partitions existing callers see (section 3), which is a
behaviour change a 2.x minor release must not make silently.

graphty-element is not changed here either. `LabelPropagationAlgorithm` calls the legacy function
on the object-graph route (`graphty-element/src/algorithms/LabelPropagationAlgorithm.ts:98-107`).
Moving it onto the ported route (`this.accelerated("labelPropagation", "undirected")`, adding
`labelPropagation` to `ALGORITHM_MEMBERS` in `graphty-element/src/acceleration/narrow.ts` and a
routing floor in `graphty-element/src/acceleration/types.ts`) changes the partitions users see and
means the GPU path ignores `randomSeed` (the GPU kernel has none), so it is a separate change that
needs the owner's decision.

Defects in the shipped functions, to be filed as separate issues (none is fixed here):

1. `labelPropagation` stops on "no label changed" while redrawing ties, so it spins to
   `maxIterations` on tie-rich graphs (section 1).
2. `labelPropagation` adds the current label to the tie candidates a second time
   (label-propagation.ts:88-109).
3. The names are inverted relative to the literature: `labelPropagation` is asynchronous,
   `labelPropagationAsync` is synchronous (it writes `newLabels` and applies them after the pass,
   lines 158-236; its JSDoc even says "updates all nodes simultaneously").
4. `labelPropagationAsync` has no swap guard: on a single edge a-b the two labels trade places every
   pass until `maxIterations`, returning `converged: false`.
5. `labelPropagationSemiSupervised` computes `Math.max(...seedLabels.values())` (line 283): with an
   empty map every unseeded node gets label `-Infinity` and the whole graph becomes one community;
   with about 100k or more seeds the spread throws `RangeError`. It also returns labels without
   renumbering.
6. `graphToMap` lets the last parallel edge's weight win instead of summing.
7. `SeededRandom` loses precision above 2^53 and can return 1.0 (section 2.4).

## 7. Public API

New exports. These need the owner's approval; nothing existing changes.

```ts
// algorithms/src/indexed/label-propagation.ts

/** Options of the index-based label propagation. @public */
export interface LabelPropagationOptions {
    /** Work cap, in node visits per node (full-sweep equivalents); default 100. */
    readonly maxIterations?: number | undefined;
    /** Seed of the visit order and of the tie draws; default 42. */
    readonly randomSeed?: number | undefined;
    /** Sum arc weights (true, the default) or count each distinct neighbour once (false). */
    readonly weighted?: boolean | undefined;
}

/** Result of the index-based label propagation. @public */
export interface LabelPropagationResult extends LabelResult {
    /** Node visits divided by the node count, rounded up. */
    readonly iterations: number;
    /** True when every node's label is dominant among its neighbours. */
    readonly converged: boolean;
}

export function labelPropagation(s: GraphSnapshot, o?: LabelPropagationOptions): LabelPropagationResult;
```

Reached as:

- `indexed.labelPropagation`, `indexed.LabelPropagationOptions`, `indexed.LabelPropagationResult`
  (a line in `algorithms/src/indexed/index.ts`).
- Flat, with the `Indexed` prefix because the flat `LabelPropagationOptions` and
  `LabelPropagationResult` already name the legacy types: `IndexedLabelPropagationOptions` and
  `IndexedLabelPropagationResult` (`algorithms/src/index.ts`, next to `IndexedLouvainOptions`).
- The dispatcher: `AcceleratedAlgorithms.labelPropagation(s, options?: LabelPropagationOptions):
Promise<LabelResultLike>`, implemented in `accelerated()` by the house rule
  `acc?.labelPropagation !== undefined ? acc.labelPropagation(s, options) :
Promise.resolve(indexed.labelPropagation(s, options))`, with no try/catch
  (`algorithms/src/indexed/accelerator.ts:211-249`).

The dispatcher returns `LabelResultLike`, the shape both paths share; `iterations` and `converged`
are present on the CPU path only (the GPU result has neither), so a caller that needs them calls
`indexed.labelPropagation` directly.

**The accelerator seam is not changed.** `AlgorithmAccelerator.labelPropagation` keeps
`options?: HitsOptionsLike`. `LabelPropagationOptions` is a structural superset of the members an
accelerator reads (`maxIterations`, `weighted`), so the dispatcher can pass it through, exactly as
the Katz and Louvain methods pass their wider option types today (accelerator.ts:163-170).
Narrowing the seam would change the interface the GPU package implements and would break PR #550's
conformance type test (`webgpu-graph-algorithms/test/types/conformance.test-d.ts:131` on that
branch); it belongs to whichever change needs it. An accelerator ignores `randomSeed` -- the GPU
kernel is deterministic -- and the dispatcher's doc comment says so.

## 8. Testing

All tests are new files or new cases for the new code; nothing adds coverage to the legacy
floyd-warshall. Tests count and compare results; none measures time. Every test that builds a
snapshot uses `checksummedSnapshot(graph)` (`algorithms/test/helpers/snapshot-differential.ts`) or
`GraphBuilder(...).freeze({ checksum: true })` and ends with `s.validate({ checksum: true })`, so a
port that writes into a shared view fails.

File: `algorithms/test/unit/indexed/label-propagation.test.ts`.

### 8.1 Independent reference: the dominance oracle

A test helper recomputes, from `s.edgeList()` (a different view than the CSR rows the port reads)
and plain arrays, each node's summed weight per neighbour label under the conventions of section
2.3, and asserts that the node's final label is at the maximum. Every `converged: true` result on
every fixture must pass it. This is the paper's own correctness criterion (Raghavan section III;
Traag and Subelj's maximality proof) and it does not depend on the RNG.

### 8.2 Fixtures and what each pins

| Fixture                                                                                                                            | Pins                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty snapshot                                                                                                                     | `count` 0, `iterations` 0, `converged` true, `groups()` empty                                                                                   |
| Single node; edgeless graph of 5                                                                                                   | Singletons, `iterations` 1, `converged` true                                                                                                    |
| Two triangles plus an isolated node                                                                                                | Labels exactly `[0,0,0,1,1,1,2]`                                                                                                                |
| Complete graph K6; two disjoint five-cliques                                                                                       | One community per clique, for seeds 1..10                                                                                                       |
| Self-loop on a node of a triangle; a self-loop-only node                                                                           | Result equals the same graph without the loop (same seed)                                                                                       |
| Parallel edges: a node joined to A by two edges and to B by one                                                                    | Weighted: joins A on every seed. `weighted: false`: A and B tie                                                                                 |
| Weighted: a node with arcs 3 to A, 1+1 to B                                                                                        | Joins A                                                                                                                                         |
| Directed: two triangles T1 and T2 (arcs both ways), plus node x with a reciprocal pair to A in T1 and a single arc x->B to B in T2 | x counts A twice and B once, so it lands in T1's community on every seed; the dominance oracle, run on the symmetrised view, passes             |
| Directed: two directed triangles, one arc per edge, one direction each                                                             | Same partition as the undirected triangles (in-arcs are read, so each node sees both neighbours)                                                |
| Directed, `weighted: false`, reciprocal pair                                                                                       | Counts the pair once                                                                                                                            |
| Zero-weight arcs only                                                                                                              | Node keeps its own label                                                                                                                        |
| Negative, NaN, infinite weight                                                                                                     | `RangeError`; nothing written                                                                                                                   |
| Even path of 1,000; star; complete bipartite K(3,4) (tie-heavy)                                                                    | `converged: true` on seeds 1..10 under the default cap, and the dominance oracle passes -- the case where the shipped function spins to its cap |
| `maxIterations: 0`                                                                                                                 | Identity labelling, `converged: false` (n > 0)                                                                                                  |
| `maxIterations: 1` on a 1,000-node random graph                                                                                    | Stops at `iterations` <= 1 with `converged: false`, and the cap is honoured exactly                                                             |
| `maxIterations` negative or fractional; `maxIterations * n` >= 2^31                                                                | `RangeError`                                                                                                                                    |
| Same seed twice; different seeds                                                                                                   | Bitwise identical labels; at least one differing partition across seeds 1..10 on the karate club                                                |

### 8.3 Differential against the shipped function

On the shared `undirectedFixtures()` list (`algorithms/test/unit/indexed/port-fixtures.ts`, no
self-loops or parallel edges by design):

- On the fixtures whose partition is determined (the two triangles plus an isolated node, the two
  disconnected five-cliques), the port's labels equal the shipped function's communities mapped
  through `s.ids`, for seeds 1..10.
- On every fixture, both results pass the dominance oracle whenever both report `converged`.
- **Planted partition, the same bar the GPU plan uses:** `plantedPartitionGraph` from
  `@graphty/graph-samples/generators` (`graph-samples/src/generators/block-model.ts:148`; 4 groups
  of 50, `pIn` 0.3, `pOut` 0.01, whose `community` node column is the ground truth) over seeds
  1..10. The port's mean
  adjusted Rand index against the planted groups is >= 0.9, and not lower than the shipped
  function's mean minus 0.05. The ARI helper (about 20 lines, pair counting over a contingency
  table) lives in the test file; the repository has none. `@graphty/graph-samples` becomes a
  workspace devDependency of algorithms (tests and benchmark only; it depends on graph-format
  alone, so no cycle), and a ten-line test helper turns a `SampleGraph` into the legacy `Graph`
  that both sides are then built from.

### 8.4 Dispatcher tests

In `algorithms/test/unit/indexed/accelerated.test.ts`: the CPU path of
`accelerated(null).labelPropagation` equals `indexed.labelPropagation` on the same snapshot and
options; an accelerator that has `labelPropagation` receives the call with the same options object;
a throwing accelerator propagates its throw; and the "carries exactly the N methods" list gains
`labelPropagation` (ten becomes eleven). `algorithms/test/unit/indexed/package-wiring.test.ts`
checks the namespace and the flat type exports resolve.

## 9. Benchmark

New script `algorithms/benchmarks/label-propagation-bench.ts`, run from `algorithms/` with
`npx tsx benchmarks/label-propagation-bench.ts`. It is separate from `benchmarks/port-bench.ts`
because that harness takes the minimum of consecutive runs of one side, while this one must
interleave the two sides so the ratio survives background load on a shared machine.

- **Size ladder:** 1k, 10k, 100k and 1M nodes, undirected, 10 edges per node from the seeded LCG
  `port-bench.ts` uses -- the graphs the GPU cost record measured. The shipped function runs at
  1M once, and is skipped when its 100k median times 10 exceeds a 600 s budget.
- **Tie-heavy tier:** `pathGraph({ n: 100000 })` from graph-samples, where the shipped function
  runs to its cap.
- **Structured tier:** `plantedPartitionGraph` with 100 groups of 1,000 nodes, average degree
  about 10 (`pIn` 0.008, `pOut` 0.00001).
- **Protocol:** `uptime` load average printed at start and end. Runs alternate shipped, port,
  shipped, port: 7 pairs up to 10k, 3 pairs at 100k, 1 at 1M. Each row reports the median and the
  minimum of each side, the ratio of medians, and each side's `iterations` and `converged` -- the
  pass counts differ (the port visits only what changed), so a wall-time ratio alone would hide
  where the time went. No means.
- **What it establishes:** the measured "vs shipped" ratio at each size, split into the tie-heavy
  and structured tiers so the stop-rule effect is visible separately from the per-arc cost; and the
  measured CPU port baseline that replaces the cost record's estimate. The record's GPU ratios
  compare against a synchronous, lowest-label kernel that does a different amount of work per
  answer (the GPU plan's rule for label propagation); the benchmark states which semantics each
  side ran.
- **Follow-up in the same pull request:** re-derive the cost record's "label propagation vs a port"
  row from the measured port, through the appendix B script of `tmp/gpu-cost-model/final-model.md`
  with only the label propagation port baseline replaced, as PR #507 did for its four ports
  (record lines 81-107). The re-derived row must say that the GPU model costs 100 synchronous
  passes while the measured port ran to convergence in the sweep-equivalents the benchmark
  reports, so the ratio compares a converged CPU answer with a capped GPU run.
