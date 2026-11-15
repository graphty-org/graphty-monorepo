# Anomaly detection: which methods graphty offers

Status: recommendation (2026-11-11). Issue #312.

Readers want to find "unusual" nodes: a node that is far more connected than anything like it, a
neighborhood that is almost a clique where everything else is sparse, a node whose edges carry
far more weight than its neighbors'. Neither algorithms nor graphty-element computes anything of
the kind today. This note picks the methods, says what each costs and returns, and how a reader
is told why a node was flagged.

## Recommendation

Offer two methods, in this order, and defer a third.

| Method                                                        | What it flags                                                                                           | Cost                                              | Ships in                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Robust outlier on a metric (modified z-score)                 | nodes whose value of any measured metric is extreme                                                     | O(n log n) over an existing metric column         | graphty-element only                                 |
| Egonet outliers (OddBall)                                     | nodes whose neighborhood breaks the graph's own size law: near-stars, near-cliques, heavy neighborhoods | O(m^1.5) (one triangle count) plus O(n)           | algorithms (kernel) + graphty-element (registration) |
| Embedding-based outliers (node2vec + LOF or isolation forest) | nodes unlike their structural peers                                                                     | O(n d walks) + O(n log n) neighbor search, seeded | deferred                                             |

Both chosen methods are deterministic, need no seed and no training, give the same answer on the
CPU every run, and explain each flag with numbers the reader already understands (a count, a
value, an expected value). The deferred method fails all of those.

## 1. Robust outlier on a metric

**What it does.** Take one node metric a run already published (degree, PageRank, betweenness,
clustering coefficient, coreness, or a numeric data column) and score each node by the modified
z-score of Iglewicz and Hoaglin:

```
M(v) = 0.6745 * (x(v) - median(x)) / MAD(x)
```

where MAD is the median absolute deviation. Median and MAD, not mean and standard deviation,
because the outliers this is meant to find would otherwise drag the mean and inflate the spread
until nothing stands out -- the usual failure on heavy-tailed graph metrics. A node is flagged
when `|M(v)|` exceeds the threshold (3.5 is the published convention, exposed as an option). An
option chooses the side: `high`, `low` or `both` (default `both`, the neutral reading of the
statistic). When MAD is 0 (more than half the nodes share one value, common for degree on sparse
graphs) the method falls back to the mean absolute deviation, `M(v) = (x(v) - median) / (1.2533

- MeanAD)`, and says so in a caveat; if that is also 0, every node scores 0.

**Cost.** One sort of the metric column for the medians: O(n log n), well under a second at a
million nodes. The metric it reads costs what that metric costs; the outlier run itself never
touches the edges.

**Result shape.** The standard node-metric shape (`value` = M(v), plus `rank` and `percentile`
and the graph-level statistics every metric publishes), plus:

- `flagged` -- boolean per node, `|M(v)|` past the threshold on the chosen side;
- `observed` -- the input metric's value at the node;
- `expected` -- the median the score is measured from (a graph-level field);
- `flaggedCount` -- how many nodes were flagged (graph-level).

**Explaining it.** A flag reads as "this node's PageRank is 0.042; the typical node's is 0.0011":
observed against expected, in the input metric's own units. The run's caveats carry
`{ code, params }` facts such as the input metric and its run, the threshold, the side, and the
MAD-was-zero fallback; the application words them.

**Why first.** It reuses every metric graphty already computes, so its coverage grows with the
catalog, and it answers the most common form of the request ("which nodes are unusually central
/ connected / clustered?") with no new graph kernel.

## 2. Egonet outliers (OddBall)

**What it does.** OddBall (Akoglu, McGlohon and Faloutsos, PAKDD 2010) looks at each node's
egonet -- the node, its neighbors and the edges among them -- and two numbers about it:

- `N(v)`, the node's distinct neighbors;
- `E(v)`, the egonet's edges: `N(v)` plus the triangles through `v`.

On real graphs these follow a power law, `E ~ C * N^a` with `1 <= a <= 2`, fitted by least
squares on log-log axes over the nodes with `N >= 2`. A node far from the line is anomalous:

```
score(v) = (max(E, C N^a) / min(E, C N^a)) * log(|E - C N^a| + 1)
```

Above the line (`a` near 2 locally) the neighborhood is a near-clique, which is the shape of a
collusion ring or a duplicated record; below it (`E` near `N`) it is a near-star, a hub whose
neighbors do not know each other, the shape of a spammer or a scanning host. With edge weights
present the same fit runs on `W(v)` (total egonet weight) against `E(v)` -- the "heavy vicinity"
law -- as a second, opt-in variant.

**Cost.** One triangle count, which algorithms already has (`algorithms/src/indexed/triangles.ts`,
O(m^1.5) on the simple undirected graph), plus O(n) for the fit and the scores. Comparable to the
clustering-coefficient run graphty-element already offers; the same cost estimate applies.

**Result shape.** The standard node-metric shape with `value` = score, plus:

- `flagged` -- boolean per node, past a threshold on the score (an option; by default the top
  1 % of scored nodes, the cut the paper reports, since the score has no fixed scale);
- `kind` -- a category per node: `near-clique` (above the line) or `near-star` (below), unset for
  nodes with fewer than two neighbors, which the fit does not score;
- `neighborCount` (`N`), `egonetEdges` (`E`) and `expectedEdges` (`C N^a`) per node;
- `exponent` (`a`) and `coefficient` (`C`) of the fitted law (graph-level).

**Explaining it.** "This node has 40 neighbors whose egonet holds 41 edges; a node with 40
neighbors here typically has 160" -- observed against expected again, plus the kind. The fitted
law (`a`, `C`) is a graph-level fact an application can plot as the line the node falls off.
Caveats carry `{ code, params }` facts for the nodes left unscored, the variant (edge count or
weight), and parallel edges merged.

**Why second.** It finds the structural anomalies a single metric cannot: a near-clique node can
have an ordinary degree and an ordinary clustering coefficient for its size, and only the joint
law exposes it. It needs a new kernel in algorithms, so it costs more to ship than method 1.

## 3. Deferred: embedding-based outliers

Embedding nodes (node2vec, DeepWalk, spectral) and running Local Outlier Factor or an isolation
forest on the vectors finds subtler anomalies, but:

- it needs a seed and does not reproduce across runs without one, and two seeds can flag
  different nodes;
- a flag has no explanation a reader can check: "far from its neighbors in a 64-dimensional
  embedding" is not something an application can show;
- it costs random walks plus a nearest-neighbor search, far above the other two, and has two
  new dependencies' worth of code (an embedding and an outlier model) with no existing piece in
  algorithms to build on.

Revisit when graphty ships node embeddings for another reason (similarity search, layout); the
outlier step on top of them is then cheap to add.

## Also considered

- **Plain z-scores on centrality.** Rejected in favor of the modified z-score: on heavy-tailed
  metrics the mean and standard deviation are dominated by the very outliers being sought.
- **Suspicious subgraphs (dense-subgraph detection such as Fraudar).** A different question --
  "which group of nodes is unusual" rather than "which node" -- and its result is a set, not a
  per-node score. Worth its own research issue if readers ask for it; OddBall's near-clique flag
  covers the single-node version.
- **Temporal anomalies (edges appearing in bursts).** Graphty has no time-sliced graph model to
  run it on.

## How it fits graphty-element

Both methods are node metrics (`MetricAlgorithm`), so they inherit the metric result shape, the
catalog entry, the cost gate and the style templates every metric already has. The `flagged`
column lets a suggested style layer select exactly the flagged nodes (a selector on the result),
as the algorithm-style rules require; dimming the rest stays the reader's choice. Method 1 takes
its input metric as an option that names a published result field, so it works for any metric,
including one an extension registers. Nothing here writes a sentence: every explanation above is
built by the application from the published fields and caveat codes.

## Follow-up issues

- #6684 -- robust outlier on a metric (modified z-score), in graphty-element.
- #6685 -- egonet outliers (OddBall), kernel in algorithms and registration in graphty-element.
