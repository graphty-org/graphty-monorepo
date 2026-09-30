# Scale measurements

Evidence behind the size rules in `state-matrix.md`. It is research, not authority: where it and a
framework document disagree, the framework document wins.

## 1. Neighborhood expansion sizes

**Question.** How large does a 2- or 3-hop neighborhood get, and does it depend on the start
node's degree or on the graph's density?

**Method.** Seeded Barabasi-Albert graphs of 100,000 nodes, walking CSR arrays as graphty-element's
`walkNeighborhood` does (`graphty-element/src/session/selection/targets.ts`, `MAX_NEIGHBOR_DEPTH`
3), on one desktop (Intel i9-14900). **The script was not kept.** These figures were reported in an
earlier draft of the state matrix; they must be reproduced by a committed script (seed, generator,
machine) before any rule treats them as measured.

| Graph | Start | Depth 2 reached | Depth 3 reached |
|---|---|---|---|
| average degree 4 | the largest hub | 8% | 43% |
| average degree 4 | a 99th-percentile node | 155 nodes | 1,459 nodes |
| average degree 60 | a median node | 3,938 nodes | 98% |
| average degree 60 | the largest hub | 96% | 100% |

At degree 60, 73% of all nodes had a 2-hop set larger than the 5,000-element selection cap; at
degree 4, none did. A count that stops at the cap took at most 0.16 ms.

**Reading.** Expansion size follows density, not hubs, so a degree-percentile rule would be wrong.
A count that stops at a cap is cheap enough to show before every neighborhood command commits.

## 2. How many values a distribution needs

From Clauset, Shalizi and Newman, "Power-law distributions in empirical data", SIAM Review 51(4),
2009 (arXiv:0706.1062):

- below about 50 values at or above the lower cutoff, the fitted exponent is unreliable (section
  3.2);
- below about 100, the goodness-of-fit test cannot tell a power law from a log-normal or an
  exponential, so a passing p-value says nothing (section 4.2);
- the lower cutoff itself needs about 1,000 tail values to estimate well (section 3.4).

The count that matters is the tail, not the node total, so a large graph can still be a small
sample.

**Histograms.** graphty-element's `DEFAULT_HISTOGRAM_BINS` is 20
(`graphty-element/src/session/results/statistics.ts`); with fewer than about 20 values a histogram
has no shape, and a dot strip of named values (Wilkinson's dot plot) reads better.

## 3. Style-layer stack depth

**Question.** Does the number of style layers cost time per edit, or does something else?

**Method.** On 2026-09-27, on one desktop (Intel i9-14900): in headless Chromium with edges and
meshes drawn, 1 to 40 layers were added and the style work per edit timed; in Node, a low
whole-graph edit was timed at 50,000 nodes as layers were added. **The script was not kept**, so,
as in section 1, these figures must be reproduced by a committed benchmark (graph generator, seed,
layer mix, machine) before any rule treats them as measured.

| Setting | Result |
|---|---|
| Chromium, 1 to 40 layers | under 5 ms of style work per edit at every depth |
| Node, 50,000 nodes | about 0.65 ms more per edit for each added layer |

**Reading.** Stack depth was not the cost. The cost is distinct values of mesh channels (size,
shape, outline, glow, edge width, line style, curvature, arrows): size bound to a continuous value
adds a mesh per distinct size (`graphty-element/src/session/styles/intern.ts`). The provisional
"no cap on layers" in `options-and-encodings.md` 8 rests on this section, and is marked unmeasured
there until a committed benchmark reproduces it.

## 4. How stable Leiden's communities are across seeds

**Question.** Does a community partition change between runs that differ only in the seed, and
does that grow with size?

**Method.** `research/scripts/leiden-seed-stability.mjs`, run with Node 22 on one desktop (Intel
i9-14900) against the built algorithms package (`algorithms/dist`): `node
design/ui/framework/research/scripts/leiden-seed-stability.mjs 2000 10000 50000 200000`. Each graph
is a planted partition built with a fixed seed: blocks of 100 nodes, 2.5 edges per node (mean
degree 5, the ratio of the declared 200,000-node and 500,000-edge drawing defaults), 80% of edges
inside a block, no self-loops or parallel edges. Leiden runs with seeds 1 to 5; every pair of
partitions is compared by the adjusted Rand index (ARI). Rerun on 2026-09-27:

| Nodes | Edges | Median run | Five runs | Communities | Modularity | ARI, mean of pairs |
|---|---|---|---|---|---|---|
| 2,000 | 5,000 | 32 ms | 0.18 s | 40 | 0.760 to 0.762 | 0.94 |
| 10,000 | 25,000 | 0.19 s | 1.0 s | 115 to 121 | 0.786 to 0.787 | 0.54 |
| 50,000 | 125,000 | 3.2 s | 16 s | 463 to 468 | 0.797 to 0.798 | 0.25 |
| 200,000 | 500,000 | 26 s | 117 s | 1,463 to 1,467 | 0.799 | 0.13 |

**Reading.** Modularity is flat while agreement between seeds falls, so a modularity reading cannot
show instability. This is one hard planted case (mean degree 5 with 20% of edges crossing blocks,
where Leiden finds about 1,465 groups against 2,000 planted blocks), so it shows that seed-to-seed
agreement **can** fall with size, not that it does on real graphs. The measurement still owes
agreement against the planted truth (NMI or ARI against the blocks) beside the seed-to-seed ARI, on
at least two mixing levels; until then `graph-conventions.md` 4 words its rule as "can". One machine,
one run each.

## 5. Collapse and the quotient graph on the Cliff and Huge fixtures

**Question.** What does an aggregate view past the drawing limit cost: the component quotient, and a
partition's groups collapsed into single nodes?

**Method.** `research/scripts/quotient-bench.mjs`, Node 22, one desktop (Intel i9-14900), against
the built algorithms package, on 2026-09-27. graphty-element has no Collapse or quotient feature
yet, so this measures the computation only: a seeded preferential-attachment generator (each new
node attaches m distinct edges), connected components, Louvain, and building the quotient.

| Fixture | Nodes and edges | Build graph | Components | Component quotient | Louvain | Communities (largest) | Community quotient |
|---|---|---|---|---|---|---|---|
| Cliff | 25,000 and 99,990 | 41 ms | 31 ms, 1 component | 1 node, 0.9 ms | 177 ms, modularity 0.299 | 33 (1,608) | 33 nodes and 528 edges, 2.6 ms |
| Huge | 250,000 and 2,499,945 | 2.3 s | 0.65 to 0.76 s, 1 component | 1 node, 7 ms | 6.5 s, modularity 0.184 | 26 (29,717) | 26 nodes and 325 edges, 53 ms |

**Reading.** Building a quotient costs almost nothing next to the partition that feeds it, so a
collapsed view is priced by its partition, which the analyst runs and pays for knowingly; the
collapsed drawing is tiny. A preferential-attachment graph is connected by construction, so these
fixtures cannot test a component-based view: that needs the fragmented variant of the fixture
generator. Huge cannot be loaded into graphty-element today: it is past the enforced load ceilings
of 50,000 nodes and 100,000 edges (`src/session/limits.ts`, master), and Cliff sits just under the
edge ceiling.

## 6. Where the drawing ceilings come from

**Question.** Which values do `renderCeiling` and `edgesDrawn` carry, and what were they measured
against?

**Record.** On `origin/master` the two load ceilings are 50,000 nodes and 100,000 edges, from
commit b5abe279, "decline a load past the render ceiling instead of freezing"; the refusal is
`refuseAboveCeiling` in `graphty-element/src/managers/DataManager.ts`. The measurement is recorded
in the header of `src/session/limits.ts`: 2026-09-26, headless Chromium on an RTX 4070 SUPER,
random layout, ten edges per node, default style. 50,000 nodes with 100,000 edges held 74% of the
heap limit and loaded in 8.0 s; the heap wall came at about 15,000 nodes with 150,000 edges, about
20 KB of heap per edge and 10 KB per node. The wall is V8's 3.5 GB heap, not the GPU; the renderer
died at 18,000 nodes with 180,000 edges, and 200,000 nodes with no edges used 2.0 GB. No frame time
was recorded.

A checkout older than that commit still shows the earlier declared figures, 200,000 nodes and
500,000 edges, which nothing read and past which the page froze at about 17,000 to 18,000 nodes
(issue #405); the main checkout of this repository was one such on 2026-09-27. The unmerged branch
`fix/element-instanced-edges` (commit 342a6dec) raises the ceilings to 100,000 nodes and 1,000,000
edges. This is why `state-matrix.md` cites the limits by name and defines its boundary fixtures
from them.

## 7. The next measurements

Two protocols the state matrix's limits wait on (`state-matrix.md` 9; `scale-levels.md` 1).

- **Calibration.** Desktop, a mid-range laptop and the software renderer, over the Cliff,
  NodeHeavy and EdgeHeavy fixtures, with arrows and labels on and off (the arrow material is the
  per-edge cost), and over Cliff with 1 and 19 layers for style cost. Record the median frame delta
  over about 300 frames after the layout settles, the used heap, the machine, the Chromium version
  and the seed. A concern's limit is the size where the median frame passes about 100 ms. If node
  and edge concerns cross at different sizes on both machines, per-concern levels are confirmed.
  The software renderer already fails that line at 20,000 nodes (2.4 s median frame,
  `document-set-trials.md`).
- **Legibility.** The shipped palettes at 6 and 8 hues (a 12-hue condition tests the past-palette
  rule), and a ramp for comparison, at mark sizes of 3, 5, 7 and 10 px, which bracket both proposed
  boundaries (color at about 4 px, mark size at about 8 px), on the light and the dark theme. Record
  errors per color pair, not only the mean: Healey (1996) found 3 and 5 colors fast and accurate for
  every target and 7 and 9 mixed.

## Sources

- Clauset, Shalizi and Newman (2009), as above
- Wilkinson, "Dot plots", The American Statistician 53(3), 1999
- `graphty-element/src/session/selection/targets.ts`, `src/session/results/statistics.ts`
- Lancichinetti and Fortunato, "Consensus clustering in complex networks", Scientific Reports
  2, 336 (2012), https://arxiv.org/abs/1203.6093
- `research/scripts/leiden-seed-stability.mjs`; `research/scripts/quotient-bench.mjs`;
  `algorithms/src/algorithms/community/leiden.ts`; graphty-element `src/session/limits.ts` (master)
- Healey, "Choosing effective colours for data visualization" (1996),
  https://vis.cs.brown.edu/docs/pdf/Healey-1996-CEC.pdf
