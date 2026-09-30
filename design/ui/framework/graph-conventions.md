# Graph conventions

**Job.** State how every analysis reads a graph: what each declared property does to an
algorithm, which measured facts are algorithm preconditions, and how the standard statistics are
defined. Every run's record cites these conventions, so a methods paragraph can point to one place.

**Not here.** What the objects are (`conceptual-model.md`); what the words are (`glossary.md`,
sections 11 and 12); published field names (`element-contract.md`). **Owner:** network scientist,
with the graphty-element API steward. **Ceiling:** the README's table. **Validated by:** each row
names the NetworkX or igraph behavior it matches or departs from, and a test in graphty-element or
`algorithms/` exercises it.

## 1. Declared properties and detected properties

| | Declared | Detected |
|---|---|---|
| **What** | direction; parallel edges kept or merged; self-loops kept or ignored; the default attribute for each role (node type, edge type, weight, time), while the roles themselves belong to attributes; **two-mode**, declared as a pair of values of the node-type attribute | has self-loops; has parallel edges (a multigraph); connected, weakly or strongly; acyclic (a DAG on a directed graph, a forest on an undirected one); a tree; **two-colorable** |
| **Where it lives** | on the graph, set on import, overridable per run | a reading of a scope: the full graph, the filtered graph, a set |
| **How it changes** | an undoable edit with a record | never set; recomputed when read, because a filter can change it |
| **What reads it** | every run, which records the value it used | Statistics, and the precondition check before a run over that scope |

Direction and the parallel-edge policy match NetworkX's four classes: `Graph` (undirected, one
edge per pair), `DiGraph`, `MultiGraph` and `MultiDiGraph`, and igraph's `is_directed()`. All four
classes allow self-loops, so the self-loop policy is graphty's own. Two-mode is declared because a
disconnected graph has no unique two-coloring, so "project onto the people side" needs named node
sets; projection, bipartite density and Hopcroft-Karp read the declared form or a side chosen for
the run. With more than two node types (a gene-disease-drug graph), a projection names its two
types, and edges touching other types are left out and counted; a k-partite reading (every edge
crosses types) is detected over the declared node types.

**A DAG precondition unlocks a layered layout** (Sugiyama-style; `element-needs.md`, "A
layered (Sugiyama-style) layout"), since a BFS layout from one root misplaces a DAG with several
sources.

**Preconditions.** Each catalog algorithm declares the detected properties it needs, checked
against the scope the run will use, never the full graph by default. Examples: a topological sort
needs an acyclic directed graph; Hopcroft-Karp matching needs a two-mode graph; core number
ignores self-loops; eigenvector centrality on an acyclic or disconnected directed graph, or on a
disconnected undirected one, is degenerate, so its precondition mark offers PageRank. Closeness on
a disconnected graph is not a violated precondition: it uses the Wasserman-Faust correction, a
variant named in its label (below). A violated precondition shows on the run control before the
run, checked by the element's detected-properties read.

**"Weighted" is not a property.** A graph is weighted for a run when a weight attribute is
declared and the algorithm reads one. graphty-element publishes `GraphStatistics.weighted`, guessed
from edge values other than 1, which contradicts this; replacing it is door 14, Published names that mislead.

**Weight roles on the attribute.** The role (distance, similarity, capacity, or unknown until
declared) belongs to the attribute, set once, and every run records the role it read.
graphty-element 2.x records the meaning on the run only, as `WeightMeaning` with the values
`"distance" | "strength"` (`graphty-element/src/session/runs/types.ts:169-173`); moving it to the
attribute is `one-way-doors.md` 21. **This is the one list of which catalog entries read which role**, kept against the catalog's
descriptors once the option-typing audit types them: distance is read by shortest path,
all-pairs distance, weighted betweenness, edge betweenness and closeness, Kruskal and Prim;
similarity by Louvain, Leiden, label propagation, weighted degree, weighted PageRank, eigenvector,
Katz and HITS; capacity by max flow and min cut.
A spanning tree reads a similarity as a maximum spanning tree (correlation networks, Chow-Liu
trees) only by an explicit choice the run records. **Girvan-Newman reads one weight two ways**: its edge-betweenness step
reads it as a distance and its modularity step, which chooses the level, as a similarity, so it
converts a similarity once by the declared conversion and names both readings in its record. No
algorithm needs a fourth value. Defects in the flow algorithms' weights are a row of
`element-needs.md` ("Defects in flow weights").

**Direction: the one list of which catalog entries read it**, beside the weight-role list, so a run
never reports a method other than the one that ran (principle 2). Each entry reads direction,
**reads as undirected** (symmetrizing reciprocal edges by the declared reduction, with the variant
words "read as undirected" at the result's name, `glossary.md` 10), or refuses a directed scope:

| Reading | Entries |
|---|---|
| reads direction | degree (in, out, total), betweenness, closeness, PageRank, eigenvector, Katz, HITS, shortest path, all-pairs distance, BFS, DFS, components (weak, or strong by name), max flow, min cut, k-core (total degree unless in or out is chosen) |
| reads as undirected, said in its label | Louvain and Leiden unless the run chooses directed modularity (Leicht-Newman), which the engine must support before it is offered; label propagation; Girvan-Newman; link prediction, whose NetworkX scores are defined on undirected graphs |
| refuses a directed scope, offering "read as undirected" | Kruskal and Prim (a directed graph needs an arborescence, which is not in the catalog); bipartite matching |

This list is the target; the element declares each entry's reading in its descriptor
(`element-needs.md`, "A per-entry direction declaration"), and until it does, a run on a directed
graph states the reading this list gives, never a guess.

## 2. Conventions


These are fixed once, stated in the (i) text, and recorded in every run's record. None adds a
control unless a run would otherwise be silently wrong. Where NetworkX is the reference, graphty
matches its default.

| Convention | Rule |
|---|---|
| Weight roles | An edge attribute can be declared a **distance** (a cost), a **similarity** (a similarity score, a co-occurrence count or a tie strength) or a **capacity**; which algorithm reads which is section 1's list. Each algorithm states the role it reads. A run may map any attribute to its role, as NetworkX takes `weight=` per call. "Strength" is not a role name, because it means weighted degree and graphty-element's components run already uses it for weak and strong connectivity; the published `WeightMeaning.meaning: "strength"` must become "similarity" (`glossary.md` 11) |
| Which attribute is read | By default only the **weight attribute** is read: the one the analyst declared, or an attribute named "weight" on import. No other numeric attribute (a `distance_km`, a timestamp) is read unless it is mapped to a role |
| Unknown role | A weight attribute of unknown role is read unweighted by distance algorithms and as a similarity by similarity algorithms, and a variant mark at the result's name says so |
| Similarity as distance | The conversion is part of the similarity's declared role, set once: 1/w, 1 - w for scores in [0, 1], or -log w for probabilities in (0, 1]. It is chosen in the import report, or inline the first time a distance algorithm meets the attribute; every later run uses it and shows it by exception. A zero similarity becomes an infinite distance (no edge), and the record counts those edges. A similarity is never fed to a distance algorithm silently |
| Negative weights | Read against the role. **A negative distance is allowed on a directed graph** and read by Bellman-Ford or Johnson, as NetworkX's `bellman_ford_path` reads it (log-returns, gains and losses, potentials); a negative cycle is a typed error that names the cycle; on an undirected graph it is refused, because any negative edge is a two-step negative cycle; Dijkstra-only entries declare non-negative weights as a precondition. A negative capacity is refused. A similarity declared **signed** (correlation, co-expression) is legitimate: an algorithm with a signed variant uses it, one without refuses with a typed error, and taking the absolute value is only an explicit transform the record names, because it merges anti-correlation into correlation. The 1/w, 1 - w and -log w conversions are undefined for negative values and refuse. The overview floor reports negative weights against the role, so a signed similarity is not a broken import |
| Reductions | Each weight attribute has a declared reduction for combining edges, overridable per run: sum for counts and capacities, max for bounded similarities (two correlations of 0.8 do not make 1.6), minimum for distances. Merged nodes, merged parallel edges and reciprocal pairs all use it |
| Direction | Declared on the graph, overridable per run. An imported per-edge "directed" attribute is kept: read as directed, its undirected edges become reciprocal pairs; read as undirected, directed edges merge with the attribute's reduction; the record counts both |
| Parallel edges | Kept, or merged into one with the reduction; each algorithm states which it needs, and the record says which was used |
| Self-loops | Kept or ignored, recorded. Degree counts a self-loop twice. Core number ignores self-loops, a departure from NetworkX, which refuses graphs that have them |
| Degree | In-, out- and total degree are separate, and all count parallel edges, as a multigraph degree does; **neighbor count** counts distinct neighbors. **Weighted degree** is the sum of a chosen edge weight over incident edges, split into in and out on a directed graph. By default it reads the similarity-role attribute, else a weight attribute of unknown role read as a similarity; capacity may be chosen, and distance is allowed with a caveat. Details names the attribute and its role |
| Density | Simple-graph density, m / n(n-1) directed or 2m / n(n-1) undirected, after merging parallel edges and ignoring self-loops, with each count beside it when non-zero; NetworkX's `density` counts both in m, so the methods text names the departure. When node types are declared and every edge crosses between two types, Statistics reports **bipartite density**, m / (n1 * n2), and names it |
| Clustering | **Transitivity** (the global ratio of triangles to connected triples) and **average clustering** (the mean of local coefficients) are reported separately by name, never as "clustering coefficient" alone, because they can differ several-fold on heavy-tailed graphs. A directed graph is read as undirected unless a directed variant (Fagiolo's, as NetworkX) is chosen and named; parallel edges are merged first; the unweighted form is the default, a weighted one chosen by name (Onnela, as NetworkX); **nodes of degree below 2 count as 0 in the average**, as NetworkX's `average_clustering` does, and the methods text says so, because igraph's `transitivity_avglocal_undirected` excludes them by default and the number moves several-fold on sparse graphs |
| Diameter and average path length | Computed on the largest connected component: on a directed graph the largest strongly connected component, because distances are undefined across a weak one; Statistics says which. Global efficiency is offered for the whole graph |
| Modularity | A property of a partition over a scope; the resolution gamma defaults to 1; a directed graph uses the directed (Leicht-Newman) form and a weighted graph the weighted form, as NetworkX `modularity` does, and the form is named |
| Shortest-path ties | A shortest-path query reports how many equally short paths exist and how the returned one was chosen, a deterministic tie-break the run records, and offers them all as a path family (`element-needs.md`, "A shortest-path query that reports") |
| Stochastic methods | The seed is always recorded, given or drawn; a method that takes no seed is marked unrepeatable in its record, and its stability is read across seeds (section 4) |
| Mean degree | 2m / n on an undirected graph; on a directed graph m / n, which is both the mean in-degree and the mean out-degree, labeled so, never 2m / n |
| Reciprocity | The share of directed edges whose reverse edge also exists, as NetworkX `overall_reciprocity`; the Garlaschelli-Loffredo rho is offered by name only. Filled at Load on a directed graph (`files-and-recipes.md` 2) |
| Eccentricity and radius | As diameter: on the largest connected component, the largest strongly connected one on a directed graph, and Statistics says which |
| PageRank | Damping 0.85; a dangling node's rank is spread uniformly over all nodes; both as NetworkX, named in the record |
| Betweenness | Normalized as NetworkX by default (1 / ((n-1)(n-2)) directed, 2 / ((n-1)(n-2)) undirected), endpoints excluded; the normalization is named on the result |
| Assortativity | On a directed graph, states which degrees it pairs, defaulting to NetworkX's (out-degree of the source against in-degree of the target) |
| Closeness and harmonic centrality | Direction as NetworkX (distances to the node). On a disconnected graph closeness uses NetworkX's default Wasserman-Faust correction, so a node in a two-node component scores about 1/(n-1), not 1.0; the label names the variant, "closeness (WF-corrected)", and the variant word offers harmonic centrality (`principles.md` 1). No prompt before the run. Where the element differs is `element-needs.md`, "Readings the overview and the tasks promise" |
| Core number on a directed graph | Total degree, unless the run chooses in or out |
| Components on a directed graph | Weak by default, strong as a second always-available attribute; the kind is always named ("3 weakly connected components") |
| Normalization | Stated on every result; n is the size of the run's scope, or of each item for a list of scopes. "Compare with..." warns when normalized attributes come from scopes of different sizes |
| Missing values | Excluded from every statistic and counted; a categorical attribute's "(none)" group is excluded from partition statistics, which say so |
| Partition levels and covers | A hierarchical method such as Louvain exposes its levels; an item's key is level plus group, and the level the method returns as its answer (Louvain's last pass, as NetworkX `louvain_communities` returns it) is read by default. An overlapping method (clique percolation) writes a cover: a list-valued result attribute, one item per group |
| Neighborhood direction | Select neighbors, Filter to neighbors and the within-k-hops leaf follow out-edges, in-edges or all on a directed graph; default all, as Cytoscape's first-neighbor selection and graphty-element's published neighborhood leaf. NetworkX's `ego_graph` follows successors only, so the methods text names the direction |
| Time windows | Half-open. When only edges carry times, a window's nodes are the ends of its edges; when both carry times, the leaf's `nodes` field decides (`element-contract.md` 9). A window is an aggregated static graph: paths found in it are not time-respecting |
| Node type and edge type | Declared roles on categorical attributes, so they read as partitions |


## 3. Comparison statistics and the null model

The statistic follows the attribute types, each with an (i): Spearman rank correlation or Kendall's tau and top-k overlap for
two numeric attributes; adjusted mutual information (AMI) and the adjusted Rand index (ARI) for two
categorical ones, with plain NMI available by name to match published figures, because plain NMI
rises with the number of clusters; for numeric against categorical, the distribution within each
group with a Kruskal-Wallis test, or AUC when the categorical attribute is binary; Jaccard overlap of
node and edge sets for two graphs, with a per-element "A only", "B only", "both" attribute. A
per-element difference is written as a result attribute. Missing values are left out and counted;
when the two sides cover different elements, the comparison covers the shared ones and says how
many are unmatched on each side; when two normalized attributes come from scopes of different sizes,
it warns.

**A null model is a baseline, not a graph.** "Compare with randomized baseline..." takes a result, a
graph statistic or a statistic of one set (its internal edges, density or conductance, recomputed on
each sample for the same nodes), a null model, a sample count and a seed. It is one run over a list of samples
regenerated from the seed and never stored, so nothing enters the list of graphs. It keeps the null
distribution (mean, standard deviation) and reports a z-score and an empirical p-value, never a
single random difference, because one random graph says nothing about whether a modularity of 0.4
is meaningful. The default null model is the configuration model (every node's degree kept, in and out
separately on a directed graph), sampled by double-edge swap; stub matching is available by name
and is never the unnamed default, because it creates parallel edges and self-loops that skew clustering.

The sampler follows the graph's declared properties, and the run record names the one that ran; a
combination with no valid sampler is refused before the run:

| Declared | Sampler | Note |
|---|---|---|
| undirected, simple | double-edge swap | degree sequence kept |
| directed | directed edge swap (NetworkX `directed_edge_swap`) | in- and out-degree kept |
| two-mode | swaps within the two sides only | each side's degrees kept; no edge inside a side |
| weighted | swap the topology, then either keep each weight on its edge or shuffle weights over the rewired edges, the choice named | swapping keeps degree but not strength, which the record says |
| multigraph | swaps may or may not create parallel edges, per the declared parallel-edge policy | named on the record |

**A baseline is valid only for a statistic the set was not chosen by.** A set kept because it looked
dense, or found by community detection, always beats a configuration-model baseline on density,
because it was selected for exactly that. So a set's baseline record states how the set was chosen
(its Created from), and when the set came from a partition or a threshold on the same statistic, the
result carries the precondition phrase "set chosen by this statistic".

**Transforms.** A bipartite or set-collection projection names its edge weighting on the record:
shared-neighbor count (the default), Newman's collaboration weight, or the Jaccard or overlap
coefficient with a cutoff, the cutoff recorded. A quotient drops intra-group edges unless asked to
keep them as self-loops, and sums weights by the attribute's declared reduction. A line graph keeps
edge attributes as node attributes.

**A power-law reading** is deferred until a fit is specified by Clauset, Shalizi and Newman's method:
the exponent with x_min, the tail size, a goodness-of-fit p-value and the likelihood ratio against a
log-normal, refused below a stated tail size (`output-homes.md` 5).


**Enrichment against a set collection.** A cluster's or set's overlap with each set of a loaded set
collection (a gene-set library) is an over-representation test: a one-sided hypergeometric test
(Fisher's exact), with the background population named on the record (the full graph, the filtered
graph or a declared universe), and the p-values adjusted as one family below. Fetching an outside
library is outside the model; a library loaded as a set collection is in it.

**A family of tests is counted.** When one act produces many p-values (a comparison over a list of
scopes, a sweep, a null-model test per group), the record counts the tests, the p-values shown are
Benjamini-Hochberg adjusted, and the raw values are under Details.

## 4. Small samples and partition stability

**Small samples.** "Tiny" is not a size class of the graph: a degree histogram over 12 values
means little while a shortest path over 12 nodes is exact, so smallness is a caution per measure.
A measure below its entry's minimum sample carries a caution in the precondition slot, counted in
the unit the measure depends on, never in nodes alone (`element-needs.md`, "`minMeaningfulNodes`
on catalog algorithm entries"): a degree-tail fit needs about 50 values in the tail, about 100 to
tell a power law from a log-normal and about 1,000 to place the cutoff (Clauset, Shalizi and Newman
2009, `research/scale-measurements.md` 2); a local clustering value is undefined below degree 2 and
moves in steps of 2/(k(k-1)), while transitivity pools every node's triples and holds up on small
graphs. No app constant stands in. Below about 20 values a histogram is a dot strip. A power-law
fit is deferred (section 3). The state cell is `scale-levels.md` 3.

**Partition stability.** A stochastic partition (Leiden, Louvain) mixes real structure with
run-to-run variation, and the variation can grow with size: on one hard planted-partition case,
agreement between five seeds fell from an ARI of 0.94 at 2,000 nodes to 0.13 at 200,000 while
modularity stayed level (`research/scale-measurements.md` 4, which still owes agreement against the
planted truth). That fixture's 100-node blocks sit below modularity's resolution limit at 200,000
nodes, so the falling agreement mostly signals a flat, degenerate optimum (Good, de Montjoye and
Clauset 2010), not seed noise alone; resolution (gamma) is the parameter to explore, and these
numbers are cited as a rule only after agreement with the planted blocks is measured at two mixing
levels. So stability is reported, never hidden, and never loaded onto every reader:

- Where the element's combined estimate for five seeded runs falls under the live line
  (`interaction-patterns.md` 3.3), they run with the result, and the agreement shows in the
  result's precondition slot **only when it is low**, as a caution; otherwise it is one row of the
  result's Details.
- Above the live line, agreement is offered on request with its band word.
- The measure and the multi-seed run are element needs (`element-needs.md`, "A partition-similarity
  measure"); until they exist the reading is absent, never estimated by the app.

## Sources

- `research/archive/conceptual-model-long-form.md`, sections 4, 7.5 and 9, and their sources
- graphty-element: `src/session/runs/types.ts:169-173`, `src/algorithms/MinCutAlgorithm.ts`,
  `src/algorithms/MaxFlowAlgorithm.ts`; the flow and community
  implementations as cited above
- graph-format: `src/types/columns.ts:156-157`
- NetworkX: graph classes, `is_directed_acyclic_graph`, `is_bipartite`, `is_connected`,
  `closeness_centrality` (Wasserman-Faust), `degree_assortativity_coefficient`,
  `configuration_model`, `double_edge_swap`
- Clauset, Shalizi and Newman, "Power-law distributions in empirical data" (2009),
  arXiv:0706.1062, through `research/scale-measurements.md` 2
- Good, de Montjoye and Clauset, "The performance of modularity maximization in practical
  contexts", Physical Review E 81, 046106 (2010), https://arxiv.org/abs/0910.0165
- Fosdick, Larremore, Nishimura and Ugander, "Configuring Random Graph Models with Fixed Degree
  Sequences": https://arxiv.org/abs/1608.00607
- Open decisions cited (`one-way-doors.md`): 21, The weight role on the attribute
