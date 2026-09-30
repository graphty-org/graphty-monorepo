# top-tasks, long form (superseded 2026-09-27)

This is the long form of `top-tasks.md` as it stood before it was split by the document architecture. It is kept read-only as the record of the reasoning, and its section numbers are the ones older citations use. Where it disagrees with the current `top-tasks.md` or with the documents that received its sections, those documents win. The ranked tasks, frequencies and evidence stay in `top-tasks.md`. Inspector contents per selection and the rows at rest moved to `interface-specification.md`; filter-step behaviour and the weight-role rules to `conceptual-model.md` and `graph-conventions.md`; the paint and "covered" rules to `conceptual-model.md` 4.1, where the covered states are withdrawn; the per-task reasons for contested rankings are kept here and summarized in `top-tasks.md`.

---

# Top tasks

This document lists what analysts come to graphty to do, ranked by how often they do it. The
ranking is written for the **weekly analyst**: someone comfortable with data, who has used Gephi
or NetworkX, is not a graph theorist, and opens graphty about once a week with a question already
in mind. Analyst Alex (`design/designloom/personas/analyst-alex.yaml`) is the clearest example.
His stated goals are "quick access to common operations", "reproducible analyses" and "regular
analysis tasks like centrality and communities". His stated frustrations are "too many clicks for
common tasks" and "no way to save analysis patterns".

Task names state the analyst's goal in standard graph terms (betweenness, PageRank, connected
components, k-core). They never name a panel, a button or an object kind, and they carry no domain
words: "hub gene", "fraud ring" and "influencer" are the same generic tasks in different clothing.
The quoted user-voice lines keep the personas' own words.

Four words recur and must not be confused. A **selection** is what the analyst is pointing at
right now; it is temporary. A **set** is a named collection of members, either a fixed list or a
rule that follows the data. **Filters** are the ordered list of steps that decide what is in the
**filtered graph**, the graph being worked on; the **full graph** is the graph after data edits, before any filter. A
result's **scope** is the graph it was computed over. Their full definitions are in
`conceptual-model.md`, and every term used here is defined in `glossary.md`.

## How the information architecture uses this ranking

**Rank decides prominence.** A higher-ranked task must cost fewer steps and sit closer to where
the analyst's attention already is. When two capabilities compete for the same place, the one
serving the higher-ranked task wins.

**Cost of error can override rank.** A few steps are rare but change every conclusion that
follows: checking that the import read correctly (column types, direction), deciding what an edge
weight means (a distance or a similarity), choosing an edge weight cutoff, and knowing how a result
read the edges. These must stay visible where the analyst's attention already is, even though
their rank alone would bury them.

**Rank does not decide whether a task gets a control of its own.** Most top tasks are questions
asked of things that already exist (the graph, a node, a result), so their natural home is on that
thing -- in the inspector for the current selection, or as a command on the object -- not on the
toolbar. A task can be ranked first and have no dedicated chrome. Any proposal that gives a
toolbar slot or a panel to a task must show which ranked task it serves; twelve tasks must not
become twelve panels.

## Frequency scale

| Label | Meaning for the weekly analyst |
|---|---|
| Every session | Happens in nearly every sitting, usually more than once |
| Most sessions | Happens in most sittings, or most weeks |
| Bookend | Happens once per session, at its start or end; short, but always reached |
| Tail | A few times per project or rarer |

## The ranked tasks

### Every session: the design is judged here

**1. Characterize the whole graph.**
- *In the user's words:* "What have I got? How big is it, is it connected, what does the degree
  distribution look like -- and did it load right?"
- *Frequency:* every session, first; then again after every filter.
- *Serves:* "First Exploration - Quick Data Assessment", "Data Import and Validation", "Visual
  Exploration - Overview to Detail", "Anomaly Detection", "Gene List to Interaction Network with
  Expression Overlay".
- *Success looks like:* with nothing computed first, the analyst reads node and edge counts,
  directed or undirected, weighted or not, density with parallel edges and self-loops counted beside it
  when non-zero, connected components (how many, and the
  largest one's share), isolates, and the degree distribution as a histogram. On a directed graph
  that means weak and strong components and in-degree and out-degree histograms. The
  analyst also reads every attribute with its detected type and a one-line profile of its
  values (a categorical node-type attribute therefore shows the count of each type). Each of these
  is at most one step from the graph's inspector at rest; which six sit at rest (nodes, directed or
  undirected edges, density, weakly and strongly connected components with the isolate count, the
  degree histogram) and which sit behind "N more"
  or in the table is fixed by `principles.md` (worked conflict: the graph's inspector at rest). A broken import
  (wrong direction, a weight read as text, negative weights that Louvain and Dijkstra cannot use,
  a flood of isolates) is visible here before any algorithm runs.
- **The import report is correctable where it is shown.** Each attribute's detected type, and each
  edge weight attribute's meaning (distance, similarity, capacity or unknown; see "What an edge
  weight means"), is one inline control at that attribute's column header; the weight's role is
  also the control on the overview's "weight: unknown" row while its role is unset. Bulk cleaning stays in the tail.
- The overview describes the filtered graph; the filter chip carries the full node count
  ("Filtered: 1,204 of 5,310 nodes") and the edges row its full edge count.
- One level down, each with an (i) icon: transitivity and average clustering (named separately), the
  log-log degree plot, degree assortativity, reciprocity (directed graphs only), and diameter and
  average path length. The last two cost all-pairs shortest paths, so they run on request, exact at
  every size, with their cost word shown first and a sampled method as their variant. This list is capped
  at what fits one screen; further whole-graph statistics are commands, not rows. Attribute
  assortativity ("do similar nodes connect?") is a command on a categorical attribute.
- The first level follows the filtered graph. The second-level statistics are computed results,
  so they hold the scope they were computed on; after a filter change each one states its scope
  ("on: 5,310 nodes") and offers one action, "Run on filtered graph". They are never rerun
  silently.

**What the inspector shows follows what is selected.** The overview above is the **Statistics**
section of the graph. Every scope has the same Statistics component (`conceptual-model.md` 5.4):

| Selected | The inspector shows | Origin |
|---|---|---|
| Nothing (on open, or after Esc) | the graph's inspector: the Statistics of the filtered graph | Figma: with nothing selected the inspector is the page's; its density at rest is a departure (`principles.md`) |
| One node or edge | that element (task 4) | Figma: the selected object's properties |
| Several elements selected by hand | their shared attributes, then one "N differ" row that opens the table on the rest; then the Statistics of the selection | Figma for the shared attributes; the Statistics are graphty's own |
| A set, a path or a community, selected as one object | its Statistics, with a boundary section | graphty's own |

The Statistics of a set profile it as a subgraph: size, internal density, edges leaving the set
and conductance, and a profile of each attribute (the mean of a numeric attribute, the most
common value of a categorical one). It states whether degree means degree in the graph or within
the set. The same Statistics are how a community is characterized (task 3) and how a named set is
read (task 9).

**2. Rank nodes by a centrality metric and read the ranking.**
- *In the user's words:* "Who matters most here?"
- *Frequency:* every session, often several times.
- *Serves:* "Influencer Identification", "Hub Gene Identification and Ranking", "Hub
  Investigation", "Drug Target Discovery", "Iterative Analysis Cycle"; with task 9, "Anomaly
  Detection" (read a metric against its distribution, cut the outliers, keep them as a set).
- *Success looks like:* the analyst picks betweenness, closeness, PageRank or eigenvector
  centrality, reads the top of the ranking against the metric's distribution, and sees the result
  painted on the graph without asking. Degree needs no run.
- **A metric that does not fit the graph says so before it runs.** Task 1 already detects every
  condition involved. Closeness on a disconnected graph uses NetworkX's default Wasserman-Faust
  correction and says so with a precondition mark on the run control, whose one verb is harmonic centrality; eigenvector centrality on a directed acyclic or disconnected graph is degenerate, so
  its mark's verb is PageRank (`principles.md` 1). A metric whose estimated cost (from node and edge counts) exceeds a
  threshold shows its band word (`principles.md` 2) and offers a sampled method as its variant, such as betweenness from k
  pivots. The substitute is always offered, never swapped in silently.

**3. Detect communities and characterize them.**
- *In the user's words:* "What are the groups, and what is each one like?"
- *Frequency:* every session, once or twice; repeated while tuning resolution or seed.
- *Serves:* "Community Analysis", "Cluster and Functionally Annotate a Molecular Network",
  "Enrichment Map - Pathway Similarity Network".
- *Success looks like:* Louvain or Leiden runs, and the analyst reads the number of communities,
  their sizes, the modularity score and the edges between communities. Each community is a group of
  the partition and is read with its Statistics (size, internal density, the profile of each
  attribute),
  which is what "characterize" means in the molecular-network workflow. Singletons are listed. A
  minimum-size cut is available, and the nodes it leaves unassigned are reported, not dropped. An
  (i) icon on the resolution explains the resolution limit: at 1.0, small real communities merge.

**4. Find a node, inspect it, and explore its neighborhood.**
- *In the user's words:* "Show me this account -- what is it, and who is around it?"
- *Frequency:* every session, many times. For search-first investigators it is the first task.
- *Serves:* "Path Investigation", "Fraud Ring Investigation", "Criminal Network Analysis",
  "Threat Hunting" (the first phase of all four), "Hub Investigation".
- *Success looks like:* the analyst types a name or an attribute value, lands on the node, and
  reads its attributes, degree, computed metrics with their rank, and its kept sets and groups ("Louvain: community 4").
  A rank states its denominator ("rank 3 of 5,310"). Exploring its neighborhood is the same task
  continued: Select neighbors grows the selection by one, two or k hops, crossing a working set but not
  the analyst's other filters, as one undoable step, and keeping, filtering to or highlighting what it grew are the next ordinary commands.

**5. Take a note.**
- *In the user's words:* "Write down what I just found, and what it is about."
- *Frequency:* every session, several times.
- *Serves:* "Iterative Analysis Cycle" (document findings), "Threat Hunting" (document the hunt),
  "Fraud Ring Investigation" and "Criminal Network Analysis" (evidence documentation), "Cluster and
  Functionally Annotate a Molecular Network" (what each cluster means), "Reproducible Session and
  Network Publication" (the analyst's own methods commentary).
- *Success looks like:* a note is as cheap as selecting. It is the analyst's own record of
  reasoning, attached to the nodes, sets, paths or communities it is about and citing the results
  it rests on, not a picture of the canvas. Next week the analyst can find out why "set 3" was
  kept.
- A note targets graph objects (nodes, edges, sets, paths, communities, the graph) and cites the
  results it rests on. When a cited run is superseded or belongs to an earlier data version, the
  citation says so, so old reasoning is never read as true of new data.
- A note is not the record: how a result was produced is recorded automatically (see "Every
  result records how it was produced"). A note carries its author and times. On a figure, the
  notes a saved view shows are drawn as callouts anchored to their targets, beside the view's
  title and caption; there is no separate callout object. A panel label ("Figure 2A") is the
  view's title, and a label on a region of the drawing is a note on the set or community that
  forms the region, or a label drawn from a community attribute.

**6. Filter to a subgraph, then characterize what is left.**
- *In the user's words:* "Just the part that matters -- now what does it look like?"
- *Frequency:* every session for about half of frequent users; most sessions for the rest. The
  filtering capability is required by 18 of the 25 workflows, more than any other.
- *Serves:* "Visual Exploration - Overview to Detail", "Gene List to Interaction Network with
  Expression Overlay", "Threat Hunting", "Anomaly Detection", "Supply Chain Risk Assessment",
  "Findings Communication", "Drug Target Discovery".
- *Success looks like:* the analyst filters by a node attribute or metric, by an edge attribute
  (a weight or confidence cutoff, usually the first decision on a correlation or confidence
  network), to the largest connected component, or to a k-core. Core number is computed on first
  use; like degree it needs no run.
- **Filter steps apply in order, each to the output of the one before.** Degree, component
  membership and core number used by a step are recomputed on what the previous step left, or a
  k-core filter after an edge cutoff is simply wrong. An edge filter keeps the nodes it isolates
  unless the analyst adds a "drop isolates" step, and the overview counts them.
- **One filter, no mode.** What is hidden is out of scope for computation: the drawing and the
  next computed number agree, which is what Gephi users expect. Searches (find, Select neighbors, paths
  between named endpoints) cross one kind of step: a working set, made by "Filter to selection" or "Filter to neighbors" (or by the Working set check on a Filter to step), is lifted, the analyst's other filters
  still apply, and what a search finds beyond it is offered with "Include found nodes". That step has its
  own icon in the filter list and one (i), and the command that made it decides which kind it is. Results already computed keep their own scope, so
  filtering out nodes for a figure changes no number already on screen: a betweenness value stays the
  full-graph value, and filtering out nodes only filters its rows. Such a result states its scope as a
  fact, not a warning (see "A different scope is not out of date"). Dimming is not filtering; it is an encoding
  (task 8).

**7. Make the layout readable.**
- *In the user's words:* "Untangle this" or "spread the clusters out".
- *Frequency:* every session. A default layout runs on load; the task is re-running or tuning it
  after a filter, a new encoding, or on a hairball.
- *Serves:* "Visual Exploration - Overview to Detail", "Community Analysis", "Hub Investigation",
  "Supply Chain Risk Assessment", "Findings Communication", "Gene List to Interaction Network with
  Expression Overlay", "Cluster and Functionally Annotate a Molecular Network", "Enrichment Map -
  Pathway Similarity Network".
- *Success looks like:* reached from the graph, a set or a partition, not from a panel; it runs on
  the filtered graph by default. Nodes stay near their previous positions unless the analyst
  chooses a fresh layout, so the mental map
  survives. Separating components and laying out per community are this task, and so is placing
  nodes from attributes (longitude and latitude, a tier). A layout run has a record (algorithm,
  parameters, random seed, scope, pins) and is one undoable step, but positions are not a result:
  they are never compared or read as a metric, because distance in a force-directed drawing means
  little. A saved view keeps its own positions, so re-laying out never changes a saved figure.
  Choosing among layout algorithms is in the tail.

### Bookends: every session reaches them

Bookends are short and sit at the edges of a session. They need an obvious, stable home, not
prominence.

**Load a graph.**
- *In the user's words:* "Open this week's export" (or a sample, or a recent project).
- *Serves:* ten workflows, led by "Data Import and Validation" and "First Exploration - Quick
  Data Assessment".
- *Success looks like:* the file opens with node id, source, target and attribute fields mapped
  with little effort, and the import report (rows dropped, missing endpoints, duplicates,
  completeness per attribute) is reached from task 1: its counts show in the graph's Statistics as
  mark rows when they depart, and a Last import row under "N more" opens the whole report. Opening a file or a sample starts a new project.
  **Replace data** (task 12), **Add data** (append another source into the same graph) and **add
  as another graph** are explicit commands on an open project.

**Export.**
- *In the user's words:* "Get this out: a figure for Friday, the numbers for my spreadsheet, the
  project for my colleague."
- *Serves:* eleven workflows, including "Findings Communication", "Reproducible Session and
  Network Publication", "Gene List to Interaction Network with Expression Overlay".
- *Success looks like:* an object's Export section exports what is selected, or the graph when
  nothing is, exactly as it looks now, with no view needed, and its button names what it exports
  ("Export selection"); the header's "Export..." opens one dialog over everything in the project,
  as Figma's does; several saved views export as pages. Outputs are a figure
  with its legend, a table of values (a CSV per node with the chosen metrics and community ids),
  the methods text, and the project file. Presenting and sharing are this task; people rarely present from the browser. The scope
  and edge reading of every exported metric go into the CSV header and the export's methods text,
  and a legend's title always carries its scope when it differs from the full graph; whether the
  figure caption repeats them is the analyst's choice. Copying one value copies the bare number,
  as Figma does, so it pastes into a spreadsheet cell.

### Most sessions: reached from the object, not from chrome

**8. Color or size by a value.**
- *In the user's words:* "Color it by log fold change" or "size it by PageRank".
- *Serves:* the figure phase of twenty of the twenty-five workflows; "Gene List to Interaction
  Network with Expression Overlay" is the canonical imported-attribute case.
- *Success looks like:* reached first from the result it encodes (fifteen of those twenty encode an
  algorithm's result) and equally from an imported attribute (five encode one), producing a legend.
  It is a style layer, so it can be reordered or removed; a saved style preset is a saved style
  layer, not a separate thing.

**9. Create a named set, and combine sets.**
- *In the user's words:* "Keep these ten", "keep community 4", "which are in both lists?"
- *Serves:* "Hub Gene Identification and Ranking", "Fraud Ring Investigation", "Iterative
  Analysis Cycle", "Anomaly Detection", "Criminal Network Analysis".
- *Success looks like:* the top of a ranking, one community or a hand selection becomes a named set
  in one step (Create set, Ctrl+G), and sets combine with Union, Intersect, Subtract and Exclude.
  Creating a set always keeps the current members as a fixed set; a rule (the top 20 by a metric, a find)
  is kept with Save as rule set where the rule is still on screen, on the histogram band or the query. A
  set is read in its Statistics and can be styled, noted, compared or used as a filter step. A triage status
  ("error", "threat", "discovery") is a value in a status attribute the analyst writes, which colors,
  filters and exports like any attribute; one status value can still be kept as a set.
- **A set is fixed or a rule, and says which.** A saved filter step is a rule set: it is re-evaluated
  on replay and on new data. Making a fixed set from a rule set's current members is the same
  command as making a set from a selection.

**10. Compare with...**
- *In the user's words:* "Does betweenness agree with PageRank?" "Did the split change at the
  higher resolution?"
- *Serves:* "Iterative Analysis Cycle", "Community Analysis", "Supply Chain Risk Assessment",
  "Network Evolution Analysis", "Condition Comparison - Disease vs Control Networks" (the five
  workflows that require a comparison view).
- *Success looks like:* a "Compare with..." command on a result compares it with exactly one other
  result, in two steps. Every comparison is this one task applied to a different pair: two
  metrics, two runs, the same metric over two filters (what-if removal, a subgraph against the
  whole graph), a window against the next window (time), or two graphs. The command picks the
  standard statistic for the kind of result, each with an (i) icon:
  - rankings: Spearman rank correlation or Kendall's tau, and top-k overlap;
  - partitions: adjusted mutual information (AMI) and ARI, with plain NMI by name;
  - two graphs: Jaccard overlap of the node sets and of the edge sets, and a per-edge label
    ("A only", "B only", "both") written as an edge attribute that can be styled and filtered;
  - per-node change: the difference written as an attribute.
- Whenever the two node sets differ (two filters, two windows, two graphs), the comparison states
  that it covers the shared nodes and how many are unmatched on each side. This is where a result
  gets validated. Two selected things are compared from the inspector; two whole states (two
  graphs, two data versions, two windows) open one temporary comparison surface, as Figma's branch
  review does, led by the list of differences. A comparison is transient until the analyst runs
  Save comparison; a saved comparison can be cited and exported.

**11. Find the shortest path.**
- *In the user's words:* "How is this account connected to that one -- or to any known fraud
  account?"
- *Serves:* "Path Investigation", "Fraud Ring Investigation", "Criminal Network Analysis", "Drug
  Target Discovery", "Graph-Based Recommendation".
- *Success looks like:* from the selected node, the analyst names a second node or a set as the
  target and sees the path(s) drawn as a highlight that stacks with other styling. Each query is
  listed under one shortest-path result, even when the filter changed between queries, because
  each query records its own scope; the latest and any kept paths are drawn, and an earlier
  query is one click from being drawn again. A path follows the attribute's weight role: a similarity
  attribute is converted to a distance by the conversion declared with its role, and an unknown one
  gives an unweighted path that says so.

**12. Re-run an analysis on new data.**
- *In the user's words:* "Do last week's analysis again on this week's export."
- *Serves:* Analyst Alex's stated goal ("use specific workflows repeatedly") and frustration ("no
  way to save analysis patterns"); the weekly rhythm of every multi-session workflow.
- *Success looks like:* the analyst opens last week's project and runs **Replace data**. Steps
  defined by rules and parameters (filters, rule sets, algorithm runs, style layers bound to a
  value) replay. Hand-made sets and notes on nodes carry over by node id; communities are
  matched to last week's by overlap, because community numbers are arbitrary. Matching follows
  "Matching across data versions".
- Replace data adds a data version and keeps last week's runs under their results, so "what
  changed since last week?" is task 10. Watching the graph over time (tail) uses the same
  matching; it differs only in that every window can be drawn.

### The tail: reachable through search, the command palette and the object, never in the way

- **Watch the graph change over time** (per-window metrics, community evolution). Shown only
  when the data has a time attribute; absent otherwise, at zero cost. A per-window metric is one
  series result whose values are read per window; consecutive windows are compared with task 10, and communities are matched across
  windows as in task 12. Serves "Network Evolution Analysis" and the temporal phase of "Hub
  Investigation".
- **Combine two graphs**: union, intersection or difference over a shared node id, giving one
  graph with a membership attribute ("A only", "B only", "both") on nodes and edges, and both
  source files and the combine step in its record. Combine is its own operation, not Add data:
  edges match by their ends (ordered on a directed graph), after each input's parallel edges are
  merged, so the edge "both" count is the number of node pairs linked in both graphs. Serves "Condition Comparison - Disease vs
  Control Networks", whose success target is A-only, B-only and shared counts visible after the
  merge.
- **Project a bipartite graph onto one node set**, reached from a node-type attribute. A projection
  makes edges that are in no data (weighted by shared count, Jaccard, overlap coefficient or Newman's collaboration weighting), so it
  produces a new graph in the project with a record, never a filter step. Restricting to one node
  type without projecting is an ordinary filter (task 6). Serves "Graph-Based Recommendation".
- **Choose a layout algorithm** (Force-directed methods such as ForceAtlas2, BFS, Multipartite,
  per-community, from attributes).
- **Test a result against a null model**: "Compare with randomized baseline..." regenerates
  degree-preserving randomizations from a seed, stores none of them, and reports a z-score and an
  empirical p-value for modularity or a motif count. Reached from the result.
- **Check a partition's stability across seeds** (consensus over many runs; "Compare with..."
  across two seeds is the quick check).
- **Clean and edit data in bulk**: remove junk elements named by a set, correct imported values,
  and merge duplicate nodes (not the same as combining two graphs), singly or over a list of
  scored candidate pairs; references to a merged node follow it to the survivor. Cleaning changes
  the full graph; filtering does not. Joining a second table is Join, its own data operation. Serves "Knowledge Graph Construction", "Criminal Network Analysis".
- **Structural roles**: bridges and articulation points.
- **Motifs, pattern search and link prediction** ("Graph-Based Recommendation").
- **The rest of the algorithm catalogue**, all reachable through one door.
- **Save a view** (a camera position and what is shown). A view is a secondary object, not a
  graph object; it serves "Visual Exploration - Overview to Detail", "Iterative Analysis Cycle",
  "Threat Hunting" and "Reproducible Session and Network Publication".
- **Switch the view mode between 2D, 3D, VR and AR** (kept on the toolbar by an existing owner decision, not by
  rank).

## Requirements that are not tasks

Nobody arrives with these as a goal, but each binds the design.

- **Every attribute is a sortable column.** Every node and edge attribute, imported or computed,
  can be read as a sortable table column. A ranking (task 2) is that table sorted; task 3's
  members, task 4's attributes, Export's CSV and task 1's import report all read it.
- **Every result records how it was produced.** The record holds every input: the data version,
  the scope (the ordered filter steps), the source nodes it read as arguments, the edge reading
  (which weight attribute filled which role, any conversion applied, whether edges were read as
  directed, and how parallel edges and self-loops were treated), the parameters and random seed,
  the normalization, whether the value is exact or approximate (with the sample size), who ran it
  and when, and which earlier run it re-runs, if any. Each field has a stored default. Loads,
  layouts, transforms and comparisons write a record of the same shape.
- **The record is shown by exception.** Only what differs from what the analyst would assume is
  shown, each in the one place `principles.md` 1 gives it: freshness and a scope that differs from
  the filter chip's go on the state line beside the result; a sample, and a weight read other than
  as its declared role, are variant words in the result's name ("Betweenness (sampled)"); an
  estimate is "~" at each value. When everything is as expected nothing is shown, and the full
  record is one level down under Details. A line that always shows every field becomes wallpaper,
  and the analyst stops reading it.
- **What an edge weight means is a declared role of the attribute**, set once in task 1's import
  report and overridable per run. Distance-based algorithms (betweenness, closeness, shortest path)
  read a distance; similarity-based ones (Louvain, Leiden, PageRank) read a similarity; max flow and
  min cut read a capacity. The role is inferred only from unambiguous names:

  | Attribute name | Default meaning |
  |---|---|
  | distance, cost, length, time | distance |
  | confidence, similarity, correlation | similarity |
  | capacity | capacity |
  | weight, score, anything else | unknown |

  "weight" is unknown because it means a similarity in biology and social data but a cost in
  routing and supply-chain data; "score" can be a p-value. An attribute named "weight" is still the
  weight attribute; no other numeric attribute is read unless mapped to a role. A similarity declares
  its distance form once, with its role: 1/w, 1 - w for scores in [0, 1], or -log w for
  probabilities in (0, 1]; a zero similarity means no edge, and the record counts those edges.
  Negative weights (correlations) need a cutoff or an absolute value first. While the meaning is
  unknown, distance-based algorithms run unweighted and similarity-based ones read the weight as an
  similarity, and a variant word at the result's name says so. A similarity is never fed to a distance algorithm
  silently: on a confidence network that ranks the strongest links as the longest.
- **A different scope is not out of date.** A run records its scope as a frozen copy of the filter
  steps that applied when it started. When the current filters differ from that copy, the result
  is normal, not in error: its state line states its scope as a fact ("on: 5,310 nodes"; the
  filtered graph now has 1,204), and "Run on filtered graph" is an ordinary command that creates
  a sibling result, never a prompt. The screen never says "scoped" or "stale". A result is **out of date** only when its recorded scope would now give
  different members (the data was edited), or another input changed (an attribute it read, the edge
  reading). It carries a warning and a re-run action. Values are never silently recomputed or
  re-denominated.
- **Which graph a number comes from.** Every number is computed over a scope frozen when it was
  computed or bound, and says which. Binding degree, component membership or core number to a
  style layer, table column or export binds it over the filtered graph at that moment, so size
  by degree and color by betweenness bound together describe the same graph, and a later filter
  never resizes nodes or moves a legend. The inspector shows the live value; a bound layer or
  column marks its scope on its own state line when a later filter makes it differ.
  An element outside a result's scope has no value ("not computed"), never 0, and a cut such as
  "top 10%" is measured only over the elements that have one.
- **Degree, connected-component membership and core number are always available**, never
  something the analyst has to run.
- **A long run shows progress and can be canceled.** A run that takes more than about a second
  shows progress, can be canceled, and canceling leaves no partial result. Eight workflows,
  including "First Exploration - Quick Data Assessment", require it. Layout differs only in that
  stopping it keeps the positions it reached, as one undoable step.
- **Going back to an earlier result is not undo.** graphty-element owns the tree of analysis
  results; the analyst must be able to find any earlier result in it, to note it (task 5), compare
  with it (task 10) or replay it (task 12). Seven workflows require this history. Undo stays for
  reverting an edit, and cannot reach last week's Louvain run. The information architecture must
  give the result tree a findable home.
- **Three things that look alike are kept apart.** Only Replace data and data edits create data
  versions, which are version history kept off the working screen. A time window is a scope, never an object; it becomes a set only through Create set, as any rule does. A
  second graph is an entry in the project's list of graphs.
- **Matching across data versions is one mechanism.** Replace data, time windows and two-graph
  comparison match nodes and edges by id and partition groups by overlap, report unmatched elements
  on both sides, and never drop anything silently.
- **A result paints through one automatic style layer; highlights stack.** Tuning a parameter
  (Louvain resolution) adds a run under the result and moves its paint to the new run, so tuning
  does not pile up layers; the earlier run stays under the result for "Compare with...". Running
  over a different scope, or "Run as new result", creates a sibling result with its own layer, and the
  baseline stays current. Repeated queries (a second shortest path) collect as items under one
  result per algorithm whatever their scope, which each query records; the latest and the kept
  ones are drawn as highlights that stack, and each query can be shown again. A result's
  automatic layer always sits below the layers the analyst made. A new whole-graph paint switches
  off, never removes, an earlier automatic layer it fully covers on the same channel, and marks
  it "covered". Coverage is decided when that paint is made or edited, never by a later filter
  change; if a filter change brings in elements the paint does not cover, its row says "partly
  covered" and nothing switches back on by itself. Every layer can be switched
  on or off, reordered or removed, and undo reverts the paint.
- **Resuming work costs nothing.** There is no Save task; the project autosaves.
- **One run mechanism serves tasks 2, 3, 6, 10 and 11.** There is no "Run" task, and no task is
  built as an algorithm launcher.
- **Safe exploration.** Undo makes tasks 2, 3, 6, 7 and 8 cheap to try. Novices are served by
  samples, defaults, (i) icons, tooltips and the command palette. "First-Time User Onboarding" is
  served by the Load bookend (samples), task 1, task 3 and those aids; its wizard and guided-tour
  phases are rejected.

## Decisions for the owner

The one-way doors these tasks depend on -- the shape of a result's record, the project file's
top level and its graph and session parts, one graph or a list of graphs, edge identity, and the
rest -- are listed with a recommendation in `one-way-doors.md`.

## Why the contested rankings came out this way

**"Run an algorithm" is not a task.** Coding every phase of the twenty-five workflows put "run"
first, at 16 to 18 percent. But nobody opens graphty to run something; they open it to learn who
matters or what the groups are. Ranking "run" would build a 98-entry algorithm launcher, which is
Gephi's Statistics panel. Its weight is split across the questions it answers.

**The overview is first, above loading.** It is the only task in the first minutes of every
workflow, the owner named it as key, and "overview first" is the field's standard entry. It is
also a return task: after every filter the analyst asks again how much is left and whether it is
still connected. The degree histogram is in by default because whether the distribution is
heavy-tailed decides how to read every centrality ranking that follows.

**The overview describes the active filter, not the graph as loaded.** After filtering to the
largest connected component, the density and histogram the analyst needs are the component's. Both
workflows that filter and then re-read ask for full-graph and filtered counts side by side. The
computed statistics one level down are the exception by kind, not by cost: they are results, so
they keep their scope, state it, and offer one action to rerun, rather than being recomputed
behind the analyst's back.

**The overview is not what a selection shows.** Clicking one node, the most frequent selection,
must show that node, not a one-node subgraph. The overview therefore sits in the graph's
inspector, shown when nothing is selected, as Figma's page inspector is; it is denser than Figma's
thin page panel, a departure recorded in `principles.md`. Figma's inspector shows the selected object's properties; for several objects it shows shared properties
with "Mixed" values and never aggregate statistics. graphty follows that, with one "N differ"
row in place of per-row "Mixed" (a departures row in `principles.md`), and adds Statistics as
its own extension, because a set of nodes has structure a set of rectangles does not. The same
Statistics then characterize the graph, communities and named sets, so one component serves three
tasks.

**Filtering has one meaning.** A filter that could either hide or restrict would be a mode, and the
weekly analyst would get it wrong. Every step removes its elements from computation. The only
distinction is what searches cross, and it is not hidden: searches keep the analyst's other
filters and cross only a working set, which is a visibly different step made by "Filter to selection" or "Filter to
neighbors"; every other way of adding a step makes a data step, and a Filter to step's Working
set check switches its kind. An investigator can therefore look at 40 nodes and still
find the 41st. Gephi's real defect was never that hiding changes computation;
it was that the scope a statistic used was not recorded. Recording it on every result, and
keeping earlier results on their own scope, removes the defect without a toggle. The figure case
in "Findings Communication" was the test: filtering out nodes for a figure leaves every computed value
at its full-graph scope with a neutral label, not an out-of-date warning, so the figure is neither
flagged nor silently recomputed on a graph trimmed for looks. Cytoscape's alternative, copying the
subset into a new network first, costs a step every time.

**Weight meaning is never guessed from "weight".** Guessing "similarity" for an attribute named weight
fixes biology and social data and silently inverts routing and supply-chain data. An unknown
meaning costs one inline control in the import report; a wrong guess costs a wrong ranking nobody
notices.

**Layout is every-session.** Position is the most effective visual channel, and layout is how a
node-link drawing gets it; eight workflows name layout as a working step, not a figure finish.
The default layout covers the first look, so what ranks is re-running and tuning it. Choosing
among algorithms happens a few times per project, so it stays in the tail.

**Notes are in the every-session band.** By share of phases they rank lower, but notes are written
inside other phases, so the share undercounts them. The stronger reason is provenance of
reasoning: the weekly analyst returns after seven days having forgotten why a set was kept.

**Coloring by a value is most-sessions, not every-session.** Fifteen of the twenty
figure-producing workflows encode an algorithm's result, which paints itself. Five encode an
imported attribute, which no default can anticipate, so the control must also be reachable from the
data.

**Creating a set and comparing results are two tasks.** Creating a set builds the evidence file;
comparing tests a claim. Comparing two Louvain partitions is not an intersection of sets.

**Comparison is one command for every pair.** What-if removal, time windows and two graphs each
looked like a separate feature, and together would have grown three comparison surfaces. As pairs
under one command, with one comparison surface for two whole states, they cost nothing extra, and
task 10 then serves five workflows.

**Shortest path is most-sessions and has a toolbar tool.** Five workflows require a path; three
of them (fraud, cybersecurity and intelligence investigation) need it in most sessions. The
command on the selected node, "Find path from...", takes two steps and can take a set as the
target. The toolbar's Path tool (P) serves task 11 for the case the node command cannot: the
start is not yet selected, and the input is pointing at two things on the canvas, the shape of
Figma's Comment tool. The node command arms the same tool with its start filled in, so there is
one path search with two routes. A usage check decides whether the slot stays: over the
investigation workflows, count how often the first endpoint is not already selected; if rarely,
the slot goes and P and "Find path from..." remain (`information-architecture.md` 10, 14).

**Re-running and watching over time stay apart.** They share the matching mechanism but not the
intent or the frequency: re-running replaces the data weekly, time keeps every window and applies
only to data with a time attribute. Re-running is ranked on Analyst Alex's goals and frustrations
rather than on a workflow phase, because each workflow describes a single session. Time is a key
use case for the owner but appears in two of twenty-five workflows, so it is in the tail, gated by
a fact about the data rather than by who the user is.

**Node types get no feature of their own.** A node-type attribute is a categorical attribute, so task 1
already shows its counts, and restricting to one type is a filter. Only bipartite projection is
new, and it is in the tail.

**Save, validate and "run degree" left the list.** Save is replaced by autosave; validate is how
results are shown plus task 10; degree is a property of every node.

## Limits of this evidence

- Every workflow and persona file is marked `validated: false`. They describe imagined use, not
  observed use, and the phase coding is one reader's judgement.
- The order of tasks 2 to 7 is the least certain part. A top-task vote or first-click test with
  even five real weekly analysts would settle it better. Until then, the design should make tasks
  2 to 7 about equally reachable.
- Frequencies are estimates from persona and workflow text; there is no usage data.

## Sources

- `design/designloom/personas/*.yaml`, `design/designloom/workflows/*.yaml`,
  `design/designloom/capabilities/*.yaml` (notably `filtering`, `comparison-view`,
  `analysis-history`, `annotation`, `view-bookmarks`, `saved-filters`, `style-presets`,
  `algorithm-progress`)
- `design/ui/framework/glossary.md` (every term used here)
- `design/ui/framework/research/design-method.md`, section 6.6 (phase coding) and the follow-up on
  a top-task vote
- `design/ui/framework/research/graphty-today.md`, follow-ups on figure-producing phases, shortest
  path, comparison, subgraph restriction and autosave cost
- `design/ui/framework/research/graph-analysis.md`, section 4.1 (the analysis loop) and follow-ups
  on scope, time and triage status
- `design/ui/framework/research/graph-tools.md` (Gephi and Cytoscape behaviour)
- `design/ui/framework/research/figma.md`, section 1.2 ("Selection drives the inspector"), the
  create-and-change table ("Mixed" values), and "Follow-up: How Figma reads
  existing objects"
- Gephi, `Degree.java`:
  https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Degree.java
- Cytoscape Network Analyzer manual: https://manual.cytoscape.org/en/stable/Network_Analyzer.html
- NetworkX `betweenness_centrality` reading the weight as a distance, as cited in
  `design/ui/framework/research/graph-analysis.md`
