# Graph Analysis: Questions, Terms, the Analysis Loop, and What Analysts Keep

This is the research base for graphty's design framework. It summarizes what the visualization
and network-science literature says about how people analyze graphs, so that decisions about the
conceptual model, the vocabulary and the information architecture can cite evidence instead of
preference.

It answers six questions:

1. What questions do graph analysts actually ask, and how do they group?
2. What is the standard term for each concept?
3. What does the analysis loop look like, and where in it do results, notes and views appear?
4. Which analysis outputs does an analyst keep and return to, and which are transient?
5. How do the kept things behave: what a set is measured by, whether it keeps its members when
   the data changes, what a note points at, what a community or path result looks like, what the
   project file stores, and which display (2D or 3D, table or canvas) serves the top tasks?
6. How do kept results live over time: what a parameter change does to a measure and its style
   layers, what a run computes over while a filter is active, what makes a result out of date,
   whether history must branch, how many kept objects accumulate, and what text the element
   should publish about a result? (Sections 6.13 to 6.24.)
7. What do readers do to a measure and to one community as a whole, how many style layers
   accumulate, what happens to named communities on a re-run, what rules, types, time windows and
   parallel edges mean for a run, whether a working network is a graph or a set, and what a
   comparison keeps? (Sections 6.25 to 6.34.)

Each section ends with the implications for graphty. Findings are marked as either **evidence**
(what a source says) or **recommendation** (what this document concludes from the evidence). The
full source list is at the end; every source listed was read for this document.

A note on names used below. **graphty-element** is the standalone web component that owns all
graph functionality: data, style layers, algorithms, layouts, selection, the tree of analysis
results and the project file. The **graphty app** is the user interface around it. A
**style layer** is graphty-element's unit of visual styling: a selector plus the style it applies,
stacked bottom to top.

---

## 1. The frameworks, in brief

Eleven bodies of work carry most of the weight. Each is summarized with what it contributes to
graphty. Later sections draw on them.

### 1.1 Lee, Plaisant, Parr, Fekete and Henry -- Task Taxonomy for Graph Visualization (2006)

The standard graph task taxonomy. Its contribution is twofold.

**Graph-specific objects** (evidence, section 2 of the paper): nodes, links, paths, graphs,
connected components, clusters and groups. Two definitions matter a great deal for graphty's
ontology:

- "A **cluster** is a set of objects that are spatially close together. For graphs, this is a
  subgraph ... whose nodes have high connectivity ... clusters are based solely on link
  information, in contrast to groups."
- "A **group** can be defined as a set of related nodes, such as nodes with common attribute
  values or nodes of interest to users. Thus, a group may be composed of several clusters."

So the taxonomy already separates a set the *topology* produced (cluster, component) from a set
the *user or an attribute* defined (group). Graph objects also carry computed attributes: degree
(in- and out-degree when directed), centrality (betweenness, closeness), and special roles
(articulation point for a node, bridge for a link). Graphs themselves are objects "as users might
want to compare graphs or see how a graph changes over time", with computed attributes such as
node and link counts.

**Tasks** (evidence, section 4): every graph task is a compound of Amar, Eagan and Stasko's ten
low-level analytic tasks (retrieve value, filter, compute derived value, find extremum, sort,
determine range, characterize distribution, find anomalies, cluster, correlate) applied to graph
objects, plus three the authors added: *find adjacent nodes*, *scan*, and *set operation*
(intersect, union of node sets). The tasks fall into four groups:

| Group | Tasks | Example from the paper |
|---|---|---|
| Topology -- adjacency | nodes adjacent to a node; how many; which node has the most | "Who is the most popular person?" |
| Topology -- accessibility | nodes reachable from a node, optionally within distance n | "To what cities can we go from Seoul by changing planes only once?" |
| Topology -- common connection | nodes connected to all of a given set | "Find all the people who know both John and Jack." |
| Topology -- connectivity | shortest path; clusters; connected components; bridges; articulation points | "Count the number of connected components." |
| Attribute-based | nodes with a given attribute value; nodes connected only by certain link types; extremum on link attributes | "Find the nodes connected by is-a relationships from Biological Process." |
| Browsing | follow a path; revisit a previously visited node | "After following a path, see A's other friends." |
| Overview | estimate size, see clusters and components, find patterns and outliers -- "sometimes it is more important to be able to estimate the answer than to get an accurate one" | "Estimate the size of the social network." |
| High-level | compare two graphs; detect duplicate nodes for the same entity; name a group or find its representative; how the graph changed over time | "Identify whether two or more nodes represent the same person." |

**For graphty:** the taxonomy is object-centred -- every task is an operation on a node, an
edge, a path, a set of nodes, or the whole graph. That is direct support for an object-first
model whose primary objects are graph objects. It also shows that *set operations* and *revisit*
are first-class analyst tasks, not power-user extras.

### 1.2 Saket, Simonetto and Kobourov -- Group-Level Graph Visualization Taxonomy (2014)

Extends Lee et al. with 29 tasks about groups, in four categories by the information needed:
group-only (group neighbours, groups reachable from a group, how many groups), group-node (which
group contains node X; are X and Y in the same group; largest group), group-link (links inside a
group; most sparsely or densely connected group), and group-network (group containing the node
with the highest degree; smallest number of groups visited on a path). The authors note their
tasks assume non-overlapping groups and that "overlapping groups are common in many" real
settings, which would need further tasks (evidence).

**For graphty:** a set of nodes is an object analysts ask questions *about* -- its size, its
internal density, its members' extremes, its neighbours -- not just a filter. Whatever the
ontology calls these sets, they need an inspector of their own. Overlap must be allowed, because
a node can be in a community, a user-defined group and a path at once.

### 1.3 Brehmer and Munzner -- A Multi-Level Typology of Abstract Visualization Tasks (2013), and Munzner's what-why-how (2014)

Separates *why* a task is performed from *how* and *what* (evidence):

- **Why -- analyze:** *consume* (discover, present, enjoy) or *produce* (annotate, record,
  derive). Munzner calls derive "a crucial design choice".
- **Why -- search:** by what the user knows. Target and location known: *lookup*; target known,
  location unknown: *locate* (Munzner's example: "node in network"); target unknown, location
  known: *browse*; neither known: *explore*.
- **Why -- query:** by how much of the data matters. One: *identify*; some: *compare*; all:
  *summarize*.
- **Targets:** for all data -- trends, outliers, features; for attributes -- distribution and
  extremes (one attribute), dependency, correlation, similarity (many); for network data --
  *topology* and *paths*.
- **How:** encode; manipulate (select, navigate, arrange, change, filter, aggregate); introduce
  (annotate, import, derive, record).

**For graphty:** three consequences. First, *produce* is a peer of *consume*: annotating,
recording and deriving are core analysis actions, not an export afterthought. This supports the
owner's correction that taking notes is a common task. Second, *derive* -- computing new
attributes from existing data, which is what every graph algorithm does -- is named as the key
design choice; the design of algorithm results is central, not peripheral. Third, the
lookup / locate / browse / explore split predicts three different entry points: a search box
(lookup, locate), neighbourhood expansion (browse), and overview plus distributions (explore).
Present and discover are distinct *why*s, which supports treating "present" as producing an
artifact for others, i.e. export.

### 1.4 Munzner -- the nested model (2009)

Four nested levels -- domain problem characterization, data and operation abstraction, encoding
and interaction technique, algorithm -- each with its own threat to validity: "wrong problem",
"wrong abstraction: you're showing them the wrong thing", "wrong idiom", "wrong algorithm: your
code is too slow". Output of each level is input to the next (evidence).

**For graphty:** the framework work now under way (ontology, vocabulary, information
architecture) sits at the *abstraction* level. The nested model's warning is that no amount of
good screen design recovers from a wrong abstraction, which is the argument for settling the
ontology before mocks.

### 1.5 Shneiderman -- The Eyes Have It (1996)

The mantra "overview first, zoom and filter, then details-on-demand", and seven tasks: overview,
zoom, filter, details-on-demand, **relate** (view relationships among items), **history** (keep a
history of actions to support undo, replay and progressive refinement) and **extract** (allow
extraction of sub-collections and of the query parameters). Network is one of the seven data
types (evidence).

**For graphty:** history and extract are in the original seven, not later additions. Undo and
"take this subset out" have been part of the definition of a usable visual-information tool for
thirty years. "Extract ... the query parameters" is an early statement that the *recipe* is
worth keeping, not just the result.

### 1.6 van Ham and Perer -- Search, Show Context, Expand on Demand (2009)

Argues against overview-first for large graphs, for two reasons (evidence): analysts usually
arrive with a specific item ("financial fraud analysts typically try to understand the pattern
of connections associated with a specific fraudulent bank account"), and the full graph may be
too large or too restricted to overview at all. Proposed model: the user picks a data point, the
system computes "an optimal relevant context" with a degree-of-interest function combining
topology, attributes and the user's own recorded actions, and the user expands that context "in
a direction he or she deems interesting".

**For graphty:** there are two legitimate entry paths into a graph and the information
architecture must support both at equal weight: *overview-first* (Lee's overview tasks; the
"First Exploration - Quick Data Assessment" and "Visual Exploration - Overview to Detail"
workflows) and *search-first* (the "Fraud Ring Investigation", "Hub Investigation",
"Threat Hunting" and "Gene List to Interaction Network with Expression Overlay" workflows all
start from a known entity or list). Search and neighbourhood expansion are primary navigation,
not a utility.

### 1.7 Heer and Shneiderman -- Interactive Dynamics for Visual Analysis (2012)

Twelve task types in three groups (evidence):

- **Data and view specification:** visualize, filter, sort, derive.
- **View manipulation:** select, navigate, coordinate, organize.
- **Process and provenance:** record, annotate, share, guide.

Key statements from the process-and-provenance section:

- "Tools should preserve analytic provenance by keeping a record of user actions and insights so
  that the history of work can be reviewed and refined."
- "At a minimum, applications should provide basic undo and redo support ... histories become
  much more valuable when they record high-level semantic actions." Histories show "hierarchical
  patterns of branching".
- Annotations are "data-aware when realized as selections ... represented by a set of selected
  elements, a declarative query, or both. Data-aware annotations allow a pointing intention to be
  reapplied to different views of the same data". Freeform annotations that are not data-aware
  "may become meaningless in the face of operations such as filtering or drill-down".
- "At minimum, tools must be able to export views (png, jpg, ppt, etc.) or data subsets (csv,
  json, xls, etc.) ... An important capability is to export the settings for the control panels,
  so other analysts can see the same visualization."

**For graphty:** graphty-element owning the record of the analysis (its results, their
parameters, and undo) is squarely in this tradition. Whether that record must *branch* is a
separate question, answered in section 6.16: the evidence supports linear undo plus kept, named
results side by side, not a navigable tree of data versions. The data-aware annotation finding is the most
important one for notes: a note should be anchored to graph objects or to a set (by membership,
by query, or both), not to screen coordinates, so it survives relayout, filtering and a change of
view.

### 1.8 Pirolli and Card -- the sensemaking loop (2005)

From cognitive task analysis of intelligence analysts. Two nested loops (evidence, as summarized
by the sources listed): an **information foraging loop** -- search and filter external sources,
read and extract into a "shoebox", then an "evidence file" -- and a **sensemaking loop** --
schematize the evidence, build a case into hypotheses, and tell the story as a presentation.
Work flows bottom-up (data to theory) and top-down (theory back to data: search for support,
re-evaluate), "in an opportunistic mix".

**For graphty:** the intermediate artifacts in the loop -- the shoebox (things that looked
relevant), the evidence file (things kept as evidence), the schema (how the pieces relate) --
map onto graph work as *selections and sets* (shoebox), *named sets and marked results with
notes* (evidence file), and *the arrangement of the graph plus its style layers* (schema). The
loop is not linear, so the design must let an analyst go from a hypothesis back to raw data at
any point, which argues for cheap undo and for keeping earlier results available beside new
ones. (Section 6.16 finds that keeping results side by side, not a branching history of data
versions, is what that return trip needs.)

### 1.9 Ragan, Endert, Sanyal and Chen -- Characterizing Provenance (2016)

Organizes provenance by **type** -- data, visualization, interaction, insight, rationale -- and
by **purpose** -- recall, replication, action recovery, collaborative communication,
presentation, meta-analysis (evidence). Relevant statements:

- Action recovery "involves maintaining an action history that allows undo/redo operations and
  branching actions ... critical for enabling exploratory analyses".
- Replication "can provide a basis for branching investigations or revised analyses with
  modification of parameters".
- Visualization provenance capture: "save either an image of the visualization or the state and
  settings needed to recreate it later".
- Insight provenance is "not directly observable"; systems capture it "through annotations to
  record important findings".
- Presentation is communication "with those who are not directly involved with the analysis".

**For graphty:** this gives the vocabulary for what the project file must hold. Data provenance
(what was loaded and derived, with parameters) enables replication. Visualization provenance
(views) enables recall and presentation. Interaction provenance (undo history) enables action
recovery. Insight provenance exists *only* if the user writes it down -- which is why notes must
be cheap and common. Presentation is for people outside the analysis, which matches the owner's
ruling that "present" and "export" are the same thing.

### 1.10 Ahn, Plaisant and Shneiderman -- Task Taxonomy for Network Evolution Analysis (2014)

Surveying 53 temporal network visualization systems, it describes temporal tasks by **entities**
(node or link, group, network), **properties** (structural and domain) and **temporal features**
(evidence, from the abstract). For example: when did this node appear; did this community grow,
split or merge; how did density change.

**For graphty:** temporal analysis reuses the same entity hierarchy (element, set, whole graph),
adding time as a dimension of their properties. The ontology does not need separate temporal
objects; it needs graph objects whose properties can have a history. This keeps "watching a
graph over time" possible without making it a primary concept for the average user.

### 1.11 Network-science practice: Newman, Barabasi, Gephi, Cytoscape

Newman's *Networks* (2nd ed., 2018) and Barabasi's *Network Science* (2016) define the standard
measures. Barabasi's chapters run graph theory, random networks, the scale-free property, the
Barabasi-Albert model, evolving networks, degree correlations, network robustness, communities
and spreading phenomena; the book "emphasizes degree-based notions" throughout (evidence, per the
Physics Today review). Newman has a dedicated "Measures and metrics" chapter.

The two established desktop tools present these measures the same way (evidence):

- **Gephi's Statistics panel** computes graph-level values (average degree, graph density,
  network diameter, average path length, average clustering coefficient, modularity, connected
  components) and node-level values (degree, betweenness, closeness, eigenvector, PageRank, HITS,
  eccentricity). Node-level results appear as **new columns** in the Data Laboratory table; users
  then sort by them, size and label nodes by them, and filter on them.
- **Cytoscape's NetworkAnalyzer** computes "number of nodes, edges and connected components",
  "network diameter, radius and clustering coefficient, as well as the characteristic path
  length", plus per-node betweenness, closeness, stress, topological coefficient, neighbourhood
  connectivity and degree distributions. "Several additional columns are added to the Node Table
  (and an EdgeBetweenness column is added to the Edge Table)." Any column can be plotted as a
  histogram or scatter, and "within either of these charts it is possible to select a section of
  the data, and select the nodes (edges) in the main graph window".

**For graphty:** the industry has converged on one pattern: *an algorithm's node-level result is
a new attribute on each node; a graph-level result is a number about the graph; both are then
used for encoding, sorting, filtering and selecting*. A distribution chart of any attribute is
also a selection instrument. This is the paved path for results, and graphty-element's model of
algorithm results as data on graph objects, painted through style layers, already follows it.

---

## 2. The questions graph analysts ask

The questions below are grouped by the *object the question is about*, following Lee et al.'s
object-centred structure and Munzner's query scope (one, some, all). Each group lists the typical
questions, the standard analysis that answers them, the task categories they come from, and the
graphty workflows (by title) that depend on them.

### 2.1 About the whole graph -- "What is this graph?"

The first questions after loading, and the ones an analyst returns to after every filter or
change. Munzner: *summarize* over all data. Lee: overview tasks. This is the owner's "understand
the overall graph" task.

| Question | Standard analysis |
|---|---|
| How big is it? | node count, edge count |
| Is it directed? Weighted? Multi-edged? Self-looped? | directedness, weightedness, parallel-edge and self-loop counts |
| How sparse or dense is it? | density; average (mean) degree |
| Is it one piece or many? | number of connected components; size of the largest (giant) component and its share of nodes; isolates (degree 0) |
| What is the degree distribution? Heavy-tailed, bell-shaped, bimodal? | degree distribution / degree histogram, usually on log-log axes when heavy-tailed |
| How clustered is it locally? | global clustering coefficient (transitivity) and average local clustering coefficient |
| How far apart are things? | diameter; average shortest path length (Cytoscape: characteristic path length) |
| Do hubs connect to hubs? | degree assortativity |
| In a directed graph, are ties returned? | reciprocity |
| Is there community structure? | modularity of the best partition found |
| Is the data clean? | isolates, self-loops, duplicate edges, missing attribute values, suspected duplicate nodes |

Workflows: "First Exploration - Quick Data Assessment" (explicitly lists node and edge counts and
their ratio, connectivity status, degree distribution shape and attribute completeness as its
information needs), "Data Import and Validation", "Visual Exploration - Overview to Detail",
"First-Time User Onboarding" ("basic statistics after loading").

### 2.2 About one element -- "What is this node (or edge)?"

Munzner: *identify* one item. Lee: retrieve value, find adjacent nodes, adjacency.

- What are its attributes?
- What is its degree (in and out)? Its value on each computed measure, and where that value sits
  in the distribution (rank, percentile)?
- Who are its neighbours? Which edges connect it, and of what type?
- Which sets is it in (component, community, user groups, paths)?
- For an edge: its endpoints, direction, weight, type; is it a bridge?

Workflows: "Hub Investigation", "Fraud Ring Investigation", "Hub Gene Identification and Ranking"
("full attribute row for a clicked node, all columns").

### 2.3 About a neighbourhood -- "What is around this?"

Lee: accessibility; browsing (follow path, revisit). van Ham and Perer: show context, expand on
demand.

- What is within 1, 2, n hops (the ego network / k-hop neighbourhood)?
- What can this node reach, and what can reach it (directed)?
- Starting here, follow a chain of connections; then go back and take another branch.

Workflows: "Fraud Ring Investigation" ("how far should I expand: 1-hop, 2-hop, community?"),
"Hub Investigation" ("ego network visualization"), "Criminal Network Analysis", "Threat Hunting".

### 2.4 About the connection between elements -- "How are these related?"

Lee: common connection, connectivity. Munzner target: paths.

- Are A and B connected? How far apart?
- What is the shortest path, weighted or unweighted? What are the alternatives up to length n?
- Which nodes do A and B share (common neighbours)?
- Which intermediate nodes lie on many of the paths (bottlenecks)?
- Which single node or edge would disconnect them (articulation point, bridge, minimum cut)?
- How much can flow from A to B (maximum flow)?

Workflows: "Path Investigation" (path length, each step's edge type, alternative paths, common
intermediate nodes), "Fraud Ring Investigation" ("paths to known fraud cases"), "Supply Chain
Risk Assessment".

### 2.5 About importance -- "Which elements matter most, and in what sense?"

Lee: find extremum, sort. Munzner: distribution and extremes of one attribute; correlation of
many.

- Which nodes have the highest degree, betweenness, closeness, eigenvector centrality, PageRank,
  Katz centrality, hub or authority score?
- What does the distribution of that measure look like? Where is the cutoff for "top"?
- Do the measures agree? What is the overlap between their top-N lists?
- Is this node important because of topology, or because of an attribute (e.g. it also changed
  in the experiment)?

Each centrality answers a different question, and analysts are expected to know which: degree
counts direct ties; betweenness measures how often a node lies on shortest paths between others
(control over flow); closeness measures how near a node is to all others; eigenvector, Katz and
PageRank reward connections to well-connected nodes; HITS separates hubs (point to good
authorities) from authorities (pointed to by good hubs). Workflows state this choice as a
decision point: "What type of influence is most relevant to my goal?" ("Influencer
Identification"); "Which methods to trust for this network type?" and "Do the hubs agree across
methods?" ("Hub Gene Identification and Ranking").

Workflows: "Influencer Identification", "Hub Investigation", "Hub Gene Identification and
Ranking", "Drug Target Discovery", "Criminal Network Analysis", "Iterative Analysis Cycle".

### 2.6 About structure and sets -- "What are the groups?"

Lee: connectivity (clusters, connected components), set operation. Saket et al.: group-level
tasks. Barabasi: communities.

- How many connected components (strongly and weakly connected, if directed), and of what sizes?
- What communities does community detection find? How many, what size distribution, what
  modularity? Are they stable across algorithms, resolutions and random seeds?
- What is the dense core (k-core), and are there cliques or dense triangles?
- For one set: how many members, how many internal edges, how dense, which member has the
  highest degree, which sets does it border, what attribute values do members share?
- Which nodes bridge between sets (high betweenness, edges between communities)?
- Set operations: intersect, union, difference of two sets.

Workflows: "Community Analysis" (number of communities, modularity, "community size distribution
-- one giant community is suspicious", top nodes per community, community attribute profiles,
bridge nodes), "Cluster and Functionally Annotate a Molecular Network", "Enrichment Map -
Pathway Similarity Network", "Condition Comparison - Disease vs Control Networks" ("membership
counts: nodes and edges in A only, B only, both").

### 2.7 About attributes against topology -- "Does what a node is relate to where it sits?"

Lee: attribute-based tasks. Munzner: correlation, dependency.

- Which nodes have a given attribute value? Which edges have a given type?
- Do nodes with similar attributes connect to each other (attribute assortativity, homophily)?
- Does a measure correlate with an attribute (e.g. degree against revenue, betweenness against
  expression change)?
- Is a set over-represented in some attribute value (enrichment)?

Workflows: "Gene List to Interaction Network with Expression Overlay" ("histogram of the encoded
column so gradient endpoints can be set sensibly"), "Cluster and Functionally Annotate a
Molecular Network", "Influencer Identification" ("does influencer's audience align with target demographic?").

### 2.8 About anomalies and patterns -- "What is unusual, and what repeats?"

Lee: find anomalies; overview (patterns and outliers). Munzner: outliers, features.

- Which elements are outliers on a measure, relative to the whole graph or to their neighbours?
- Where does a known pattern occur (a ring, a star, a shared identifier, a small motif)?
- Which nodes are probably duplicates of the same entity?

Workflows: "Anomaly Detection", "Fraud Ring Investigation" ("shared identifiers with other
entities"), "Threat Hunting" ("translate TTP into a graph pattern"), "Knowledge Graph
Construction" ("duplicate candidate pairs for resolution").

### 2.9 About comparison -- "How does this differ from that?"

Munzner: compare. Lee: high-level tasks (compare two graphs).

- Two graphs or two conditions: which nodes and edges are in one only, both? Which measures
  changed?
- Two algorithm runs: do two community detections or two centralities agree?
- Before and after a filter or a removal: what disappeared, did important nodes go?

Workflows: "Condition Comparison - Disease vs Control Networks", "Community Analysis" ("stable
across algorithms"), "Hub Gene Identification and Ranking", "Visual Exploration - Overview to
Detail" ("did important nodes disappear?").

### 2.10 About change over time -- "How did it evolve?"

Ahn et al. Lee: high-level tasks.

- When did nodes and edges appear and disappear? How did density, component count, degree
  distribution change?
- Did communities grow, shrink, split or merge?
- Did a node's centrality change suddenly?

Workflows: "Network Evolution Analysis", plus temporal questions inside "Criminal Network
Analysis", "Anomaly Detection" and "Hub Investigation". Per the owner, a key use case for the
owner but not for the average user.

### 2.11 About what-if and prediction -- "What would happen, and what is missing?"

Barabasi: network robustness. Link prediction literature.

- If this node or edge is removed, how many components result, how much does the largest
  component shrink, how do paths lengthen?
- Which unconnected pairs are most likely to be connected (common neighbours, Jaccard,
  Adamic-Adar)?

Workflows: "Supply Chain Risk Assessment", "Criminal Network Analysis" ("where would
intervention be most effective?"), "Graph-Based Recommendation".

### 2.12 How the groups distribute

Three patterns stand out across the twenty-five workflows (recommendation, from reading their
decision points and information needs):

1. **Whole-graph, one-element, neighbourhood, importance and sets (2.1-2.6) appear in nearly
   every workflow.** They are the intermediate user's core. Paths (2.4) and comparison (2.9) are
   common but not universal. Change over time (2.10) and prediction (2.11) belong to a minority
   of workflows.
2. **Almost every workflow contains a "how do I choose / how confident am I" decision point** --
   which algorithm, which threshold, which resolution, do methods agree. Analysts need the
   parameters of a result and a way to compare two results, not only the result.
3. **Almost every workflow ends in something kept or communicated** -- an evidence summary, a
   case, a figure, a ranked list, a session file. Record and annotate are in the main flow.

---

## 3. Standard terms

The owner's rules: use industry-standard terms for graph concepts; keep common technical terms
(betweenness, components, degree, PageRank); never invent friendly substitutes. This table gives
the standard term for each concept, the common synonyms, which sources use which, and a
recommendation where the sources disagree. Terms are grouped by the ontology level they belong
to.

Source abbreviations in the table: **Lee** (Lee et al. 2006), **Newman** (Networks, 2018),
**Barabasi** (Network Science, 2016), **Gephi**, **Cytoscape** (their documentation),
**Munzner** (VAD).

### 3.1 The graph and its elements

| Concept | Standard term | Synonyms seen | Recommendation and notes |
|---|---|---|---|
| The whole structure | **graph** | network (Barabasi, Newman, Cytoscape, Gephi) | "Graph" is the mathematical and product term (graphty, graphty-element); "network" is the domain term. Use "graph" in the UI; accept "network" in search and docs. |
| A vertex | **node** | vertex (graph theory), actor (SNA), entity | "Node" is universal across Lee, Gephi, Cytoscape and graphty-element. |
| A connection | **edge** | link (Lee, Barabasi), arc (directed, Pajek), tie (SNA), relationship (property graphs) | Use "edge": Gephi, Cytoscape, Newman and graphty-element all use it. "Arc" is not needed; say "directed edge". |
| Edge orientation | **directed / undirected** | -- | Graph-level fact; a directed edge has a **source** and a **target**. |
| Edge value | **weight** | strength (of an edge), capacity (flow), cost / length (paths) | Say "weight". Note that shortest-path algorithms treat weight as a *cost* while centralities often treat it as a *strength*; the direction of meaning must be stated where it is used. |
| Edge from a node to itself | **self-loop** | loop | Standard. |
| Several edges between one pair | **parallel edges** / **multi-edges**; the graph is a **multigraph** | repeated edges | graphty-element's statistics call these "repeated edges"; "parallel edges" is the more standard term. |
| Data on an element | **attribute** | property (property graphs), column (Gephi, Cytoscape tables), field | Use "attribute". Tables show attributes as columns. |
| Nodes one edge away | **neighbours** (the **neighbourhood**) | adjacent nodes (Lee) | Standard. |
| A node plus its neighbours, to distance k | **ego network** (k = 1) / **k-hop neighbourhood** | egonet, first-degree network | Standard in SNA and in the "Hub Investigation" workflow. |
| Node with degree 0 | **isolate** | singleton | Standard. |
| Node with very high degree | **hub** | -- | Barabasi's term; informal but standard. Not a measure; it is a label for the tail of the degree distribution. |

### 3.2 Walks through the graph

| Concept | Standard term | Synonyms | Notes |
|---|---|---|---|
| Sequence of nodes joined by edges | **path** | walk (if repeats allowed), route, chain | Lee: "an alternating sequence of nodes and links". A path is an object with length, endpoints and members. |
| Minimum-length path | **shortest path** | geodesic | "Shortest path" in UI; "geodesic" only in docs. |
| Number of edges (or total weight) on the shortest path | **distance** | path length, hop count | -- |
| Path that returns to its start | **cycle** | loop (avoid: collides with self-loop) | -- |
| Largest distance between any pair | **diameter** | -- | Gephi "Network Diameter". |
| Mean distance between pairs | **average path length** | characteristic path length (Cytoscape), mean geodesic distance | Use "average path length". |
| Node whose removal disconnects the graph | **articulation point** | cut vertex | Lee uses "articulation point". |
| Edge whose removal disconnects the graph | **bridge** | cut edge | Beware: "bridge node" in community analysis means a node linking communities, a different concept. Reserve "bridge" for the cut edge; describe the other as "nodes connecting communities" or by its measure (high betweenness). |
| Smallest set of edges separating two nodes | **minimum cut** | min-cut | -- |
| Most that can move from source to sink | **maximum flow** | max-flow | -- |
| Tree connecting all nodes at least total weight | **minimum spanning tree** | MST | -- |

### 3.3 Sets of nodes (and edges)

This is the area where terms collide most and where the ontology must be careful.

| Concept | Standard term | Synonyms | Notes |
|---|---|---|---|
| Any subset of nodes and edges | **subgraph** | -- | An **induced subgraph** has all the edges among the chosen nodes. |
| Maximal set where every pair is joined by a path | **connected component** | component | Keep "component" (owner's ruling). Directed graphs have **strongly** and **weakly** connected components. |
| The largest component | **largest connected component** | giant component (Barabasi, Newman; strictly an asymptotic concept) | Use "largest component" in UI; "giant component" in docs if needed. |
| Densely connected set found by an algorithm | **community** | cluster, module (biology), partition class (Gephi "Partition"), group | Use "community" for the output of community detection (Louvain, Leiden, label propagation, Girvan-Newman). This is Barabasi's and Newman's term and what the algorithms are named for. |
| Set of objects close together, topologically | **cluster** (Lee: "based solely on link information") | community | "Cluster" is overloaded: Lee means topological density, statistics means any clustering algorithm (MCL, spectral, hierarchical), and everyday speech means a visual clump. Recommendation: use "cluster" only as the name of clustering-method outputs where the method is named that way (MCL, spectral, hierarchical clustering), and "community" for community detection. Do not use "cluster" for user-defined sets. |
| Set defined by the user or by shared attribute values | **group** (Lee: "a set of related nodes, such as nodes with common attribute values or nodes of interest to users") | selection set, named selection, tag, collection | Lee's definition makes "group" the standard for user- or attribute-defined sets. Cytoscape also uses "group" (a collapsible node group). A candidate for graphty's user-defined set; the vocabulary document decides. |
| Current, transient set of chosen objects | **selection** | -- | Universal. Transient by nature (see section 5). |
| Set where every pair is adjacent | **clique** | complete subgraph | -- |
| Maximal subgraph where every node has degree at least k | **k-core** | core | "K-core decomposition" assigns every node a **core number** (coreness). |
| Three mutually adjacent nodes | **triangle** | -- | Basis of the clustering coefficient. |
| Small recurring subgraph pattern | **motif** | graphlet (induced, in biology) | -- |
| Graph whose nodes split into two sets with edges only between them | **bipartite graph** | two-mode network (SNA) | -- |

### 3.4 Measures on nodes and edges

| Concept | Standard term | Notes |
|---|---|---|
| Number of edges at a node | **degree**; **in-degree**, **out-degree** when directed | Keep "degree" (owner's ruling). |
| Sum of edge weights at a node | **weighted degree** | Newman and Barabasi call it **strength**; Gephi calls it "weighted degree". Use "weighted degree", which is self-explanatory. |
| Importance measures | **centrality**: **degree centrality**, **betweenness centrality**, **closeness centrality**, **eigenvector centrality**, **PageRank**, **Katz centrality**, **HITS** (**hub score**, **authority score**) | Keep every name as-is (owner's ruling). "Betweenness" alone is acceptable shorthand. Never substitute "broker", "influencer" or "connector" for a measure; those are interpretations, not measures. |
| Edge betweenness | **edge betweenness** | The basis of Girvan-Newman; Cytoscape stores it on the edge table. |
| Fraction of a node's neighbour pairs that are connected | **local clustering coefficient** | -- |
| Maximum distance from a node to any other | **eccentricity** | Gephi reports it. |
| Node's community | **community** (as a node attribute: community ID) | -- |
| Node's core number | **core number** | -- |
| Likelihood two unconnected nodes should connect | **link prediction score**: **common neighbours**, **Jaccard coefficient**, **Adamic-Adar index** | -- |

### 3.5 Measures on the whole graph

| Concept | Standard term | Notes |
|---|---|---|
| Counts | **node count**, **edge count** | Also called **order** and **size** in graph theory; avoid those, since "size" is ambiguous. |
| Edges present over edges possible | **density** | Gephi "Graph Density". |
| Mean degree | **average degree** | Gephi "Average Degree". graphty-element: `meanDegree`. |
| How degree values are spread | **degree distribution** | Shown as a **degree histogram**, often on log-log axes; "power law" / "scale-free" / "heavy-tailed" are descriptions of its shape. Gephi reports "Degree Power Law". |
| Global triangle closure | **global clustering coefficient** (**transitivity**) and **average clustering coefficient** | These are two different numbers; both are standard and must be labelled distinctly. |
| Longest shortest path | **diameter** | -- |
| Mean shortest path | **average path length** | -- |
| Quality of a community partition | **modularity** | Keep. Depends on a **resolution** parameter for Louvain and Leiden. |
| Tendency of similar nodes to connect | **assortativity** (**degree assortativity**; **attribute assortativity**) | "Homophily" is the SNA term for the attribute case. Barabasi's "degree correlations" chapter. |
| Fraction of directed edges that are returned | **reciprocity** | -- |
| Number of components | **number of connected components** | -- |

### 3.6 Time

| Concept | Standard term | Notes |
|---|---|---|
| A graph whose elements have times | **temporal network** / **dynamic graph** | Newman and Barabasi use "temporal network"; visualization literature uses "dynamic graph". |
| The graph at one time or interval | **snapshot** | Also "time slice". |
| Element events | **appearance / disappearance** (birth / death) | Ahn et al. temporal features. |
| Set events | **growth, shrinkage, split, merge** | For communities over time. |

### 3.7 Analysis-process terms

These come from the visualization and provenance literature and name secondary objects, not
graph objects.

| Concept | Standard term | Source | Notes |
|---|---|---|---|
| Computing a new value from data | **derive** | Munzner, Heer | Algorithms derive attributes. |
| A value computed by an algorithm | **result** | Gephi and Cytoscape present these as columns | graphty-element models algorithm results as data on graph objects. |
| Text attached to data or a state | **annotation** / **note** | Heer ("annotate"), Brehmer ("annotate") | "Note" is plainer; "annotation" is the research term and also means on-canvas callouts. |
| Stored recreatable state of the display | **view** / **bookmark** | Heer (bookmark trail), Ragan (visualization provenance) | -- |
| Record of actions | **history** | Shneiderman, Heer | -- |
| Reversing an action | **undo / redo** | Heer ("at a minimum") | -- |
| Where results came from and how | **provenance** | Ragan, Heer | Mostly a docs term; the UI shows its content (parameters, inputs) without the word. |
| Hiding elements that fail a condition | **filter** | Shneiderman, Munzner, Gephi | -- |
| Mapping data to visual channels | **encoding** / **mapping** | Munzner (encode), Cytoscape ("mapping") | graphty's unit is the style layer. |

---

## 4. The analysis loop

### 4.1 The loop, assembled from the literature

No single source gives a graph-specific loop, but the sources agree closely enough to assemble
one (recommendation). Each step names its sources.

1. **Load and check.** Import the data; confirm it was read as intended (directedness, weights,
   attribute types, missing values). Sources: Heer (import is part of "introduce"); the "Data
   Import and Validation" and "First Exploration - Quick Data Assessment" workflows.
2. **Characterize the whole graph.** Size, density, components, degree distribution, clustering.
   Decide whether the data can answer the question at all. Sources: Lee (overview tasks),
   Shneiderman (overview first), Munzner (summarize), Gephi and Cytoscape (statistics first).
3. **Focus.** Either explore from the overview, or search for a known entity and show its
   context. Sources: Shneiderman (zoom and filter), van Ham and Perer (search, show context),
   Munzner (lookup, locate, browse, explore).
4. **Derive.** Run an algorithm; its output becomes new attributes on nodes and edges, sets
   (components, communities, paths), or a number about the graph. Sources: Munzner and Heer
   (derive), Gephi and Cytoscape (results as columns).
5. **Encode and inspect.** Map a result onto colour, size or edge style; look at its
   distribution; sort by it; select from its histogram; open details on demand. Sources:
   Shneiderman (details-on-demand, relate), Cytoscape (select from a histogram), Munzner
   (distribution, extremes, correlation).
6. **Interpret and note.** Form or test a hypothesis; write down what was seen and why it
   matters, anchored to the objects it is about. Sources: Pirolli and Card (schema, hypotheses),
   Heer (annotate; data-aware annotation), Ragan (insight provenance exists only if recorded).
7. **Keep.** Name the set, save the view, keep the result and its parameters. Sources: Pirolli
   and Card (evidence file), Shneiderman (extract), Ragan (recall, replication).
8. **Compare and iterate.** Try another algorithm, another parameter, another subset; compare
   with an earlier result; branch; undo. Sources: Heer (branching history), Ragan (action
   recovery, replication with modified parameters), Pirolli and Card (top-down re-evaluation).
9. **Communicate.** Export an image, a data subset, a report, or the project itself for someone
   outside the analysis. Sources: Heer (share: export views, data subsets, settings), Ragan
   (presentation), Brehmer and Munzner (present).

Steps 3 to 8 repeat many times per session; steps 1-2 recur after any change to the data or a
large filter (the whole-graph questions must be re-answerable for the *current* subgraph, as the
"Visual Exploration - Overview to Detail" workflow asks: "what percentage of data remains, did
important nodes disappear?"). Step 9 happens a few times per project.

### 4.2 Where results, notes and views appear

| Artifact | Created at step | Used at steps | What it is (in the literature's terms) |
|---|---|---|---|
| **Graph statistics** (counts, density, components, degree distribution) | 2, recomputed after changes | 2, 3, 9 | Derived data at the graph level; summarize over all |
| **Selection** | 3, 5 | 4 (as algorithm input), 5, 6, 7 | Transient set; Pirolli and Card's shoebox |
| **Algorithm result** (per-node or per-edge values; sets; graph-level numbers) | 4 | 5, 6, 8, 9 | Derived data plus data provenance (its parameters) |
| **Style layer** painting a result | 5 | 5, 6, 8, 9 | Encoding; visualization provenance |
| **Filter** | 3, 5 | 3-8 | View specification; recipe is "extractable" (Shneiderman) |
| **Note** | 6 | 7, 8, 9 | Insight provenance; data-aware annotation |
| **Named set** (a kept group, path or community) | 7 | 4, 5, 6, 8, 9 | Evidence; target of notes and set operations |
| **View** (camera, filter, visible layers) | 7 | 8, 9 | Visualization provenance; bookmark |
| **History** (undo stack; the kept results with their parameters) | continuously | 8 | Interaction and data provenance; action recovery |
| **Export** (image, data, report, project file) | 9 | outside the tool | Presentation artifact |

### 4.3 What the loop implies

(Recommendation.)

1. **Results are on graph objects, not beside them.** Across Gephi, Cytoscape and the task
   literature, a node-level result is an attribute of each node. The primary way to *read* a
   result is to look at a node, an edge, or the distribution over all nodes. A separate "results
   object" in the user's model would duplicate the graph objects. What the user needs in
   addition is the result's *provenance*: which algorithm, which parameters, which subgraph, when
   -- visible wherever the value is shown. Workflows ask for exactly this: "the exact creation
   parameters, always retrievable" ("Enrichment Map - Pathway Similarity Network"); "complete
   parameter record per analysis, copyable as text" ("Reproducible Session and Network
   Publication"); "which edges were used (weight attribute, direction) for each run" ("Hub Gene
   Identification and Ranking"). Section 6.4 refines this item: there is no second copy of the
   values, but the measure as a whole is one object per run, because analysts compare, name and
   qualify measures as units.
2. **Sets are the hinge of the loop.** A set is the output of focus (selection), of derivation
   (component, community, path, k-core) and of keeping (named group), and the input to
   derivation (run on this subgraph), encoding (style this set), comparison (set operations) and
   notes (this note is about these nodes). One set concept that all these share keeps the loop
   coherent. This matches the owner's decision on one vocabulary for sets across the session
   contract.
3. **Notes are secondary objects that point at primary ones.** Heer's data-aware annotation and
   Ragan's insight provenance both describe a note as *about* graph objects. A note is never
   itself a node or a set. It carries a reference to a set (by membership, by query, or both), to
   a result, or to a view. (Section 6.7 settles "both": the note stores the members it was
   written about, which are authoritative, and links to the set, through which the rule is
   reachable.)
4. **Views are secondary objects that recreate a display.** A view stores what is needed to
   recreate what the analyst saw (Ragan). It references filters, visible style layers and the
   camera; it never owns graph data.
5. **Overview is not a one-time step.** Whole-graph questions recur on the current subgraph and
   after each derivation. The graph itself needs an inspector that is always one click away, not
   an import-time dialog.
6. **Undo is how novices explore safely, and kept results side by side are how experts
   compare.** Heer lists undo as the minimum; Ragan ties action recovery to exploratory analysis;
   the owner's brief makes undo the primary support for novices. Comparison is served by keeping
   several results of one kind at once (section 6.13), not by navigating branches of a history
   (section 6.16).

---

## 5. What analysts keep versus what is transient

### 5.1 Criteria

An output should be **kept** (persist in the project file and be returnable to) when one or more
of these holds; otherwise it is **transient** (recomputed or discarded) (recommendation, from
Ragan's purposes and Heer's record and share):

- **It carries human judgment** -- a name, a note, a chosen threshold, a hand-picked set. Cannot
  be recomputed, because the judgment is not in the data. (Ragan: insight and rationale
  provenance.)
- **It is not reproducible by recomputation** -- randomized algorithms (Louvain, Leiden, label
  propagation depend on seeds and order), force-directed layouts, anything computed on data
  that has since changed.
- **It is expensive to recompute** -- betweenness and all-pairs paths on large graphs, community
  detection on 1000+ nodes (the "Cluster and Functionally Annotate a Molecular Network" workflow
  asks for running state and cancel for exactly this reason).
- **Something else refers to it** -- a note about a set, a style layer painting a result, a view
  showing a filter.
- **It is needed to replicate or present** -- parameters, provenance, the final figure's state.

### 5.2 Classification

| Output | Kept or transient | Reason |
|---|---|---|
| Algorithm result values on nodes and edges | **Kept, as values and as a recipe** | Referenced by style layers, filters, notes; often randomized or expensive. No tool guarantees the same output from a seed across machines and versions, so values are stored, not regenerated (section 6.11). Cheap deterministic results may be stored as recipe only |
| Algorithm parameters and inputs (which subgraph, weight attribute, direction, seed) | **Kept, with the result** | Replication; workflows require it explicitly |
| Graph-level result numbers (modularity, number of communities) | **Kept, with the result** | Part of the result; cited in reports |
| Result sets (components, communities, paths) | **Kept, with the result** | Referenced by notes, style layers, set operations |
| The list of kept results, each with its parameters and the data revision it ran on | **Kept** | Replication and comparison; no workflow needs a branching history of data versions (section 6.16) |
| Named sets (user groups, kept communities and paths, rule sets) | **Kept.** A fixed set stores its members; a rule set stores its definition, its member count and a membership digest, and stores members only when frozen (section 6.19) | Human judgment; a fixed set keeps its members, a rule set recomputes and can be stale (section 6.2) |
| Notes | **Kept** | Human judgment; the only record of insight |
| Views (camera, filters, visible layers) | **Kept** | Recall and presentation |
| Style layers | **Kept** | Encoding is part of the analysis state and of every figure |
| Filters | **Kept when named or used by a view; otherwise transient** | A named filter inside a project is a rule set whose outcome is "hide" (section 6.18); an ad hoc filter is working state. A library of queries reused across projects is the reader's own, outside the project file |
| Layout positions | **Kept** | Force layouts are not reproducible; a mental map depends on them |
| Linear graph statistics (counts, density, components, degree distribution, reciprocity, attribute completeness) | **Transient, recomputed and cached** | Deterministic, linear in the graph's size and derived from the current graph; the numbers shown in a report are captured by the export, not stored separately. graphty-element already caches them per snapshot revision |
| Costly graph measures (clustering coefficient, diameter, average path length, assortativity) | **Kept, as values with provenance, shown as properties of the graph or set they describe** | Expensive on the larger personas' graphs, defined only on the largest component, often sampled; the caveats matter (sections 6.5 and 6.20) |
| Distributions and histograms of an attribute | **Transient display of kept data** | The chart is a view of an attribute; the brush on it becomes a selection |
| Selection | **Transient** until named; then it becomes a kept set | Pirolli and Card's shoebox |
| Hover, tooltip, details-on-demand | **Transient** | -- |
| Search query | **Transient**; its result is a selection | -- |
| Undo stack | **Session-scoped** | Action recovery during work; kept results and notes cover long-term recall (section 6.16) |
| Exports (images, data subsets, reports) | **Leave the tool** | Presentation artifacts; not part of the project |

### 5.3 What this means for the ontology

(Recommendation.) The things a user keeps fall into two families, which should not be conflated:

- **Graph objects and their data** -- nodes, edges, paths, sets (components, communities, named
  groups) and the graph itself, each carrying attributes including algorithm results. These are
  what questions are asked *about* (section 2) and what the object-first model is *for*.
- **Analysis objects** -- notes, views, style layers, filters, and the history of results with
  their provenance. These are *about* graph objects: they point at them, paint them, hide them,
  or record how their values came to be.

The literature consistently puts the first family at the centre and describes the second as
process support (Heer's "process and provenance"; Ragan's provenance types; Munzner's
"produce"). This supports the owner's instruction that notes and views must not be conflated
with primary objects.

---

## 6. Sets, measures, notes and kept results: how they behave

Sections 2 to 5 establish that sets, measures, notes and kept results are central to graph
analysis. This section settles how each of them behaves: what a set is measured by, whether it
keeps its members or recomputes them, how big it gets, what a note points at, what a community
result looks like, what the project file must store, and which display (2D, 3D, the attribute
table) serves the analyst's top tasks. Each subsection states the question, the evidence, and a
recommendation. Where a recommendation corrects an earlier statement in this document or in the
other research notes, it says so.

Four element facts recur below, all from graphty-element's session source:

- A **saved scope** is graphty-element's only named, saved set today. It stores a specification:
  either a literal list of node ids (`{ nodes }`) or a rule (`{ where: Query }`, a saved set, the
  selection, the largest component), plus a `bound` flag that is false when what the rule refers
  to is gone (`graphty-element/src/session/scope/ScopeApi.ts`, `SavedScope`). It has no edge arm.
- The **selection** holds nodes and edges, is capped at 5,000 elements (`DEFAULT_SELECTION_CAP`),
  truncates past the cap in index order and reports `truncated`. `selection.promote(name)` saves
  it as a scope over its **node** ids only; the selected edges are dropped
  (`graphty-element/src/session/selection/SelectionApi.ts`).
- A **run** keeps the values it computed and, when the scope it ran on now resolves differently,
  reports a `StaleNote { ranOn, nowVisible, scopeSpec }` instead of recomputing. Its record
  carries the seed, direction, weight, precision and engine versions
  (`graphty-element/src/session/runs/types.ts`, `RunsApi.ts`).
- `selection.statistics()` already returns `inducedEdges` (both endpoints selected) and
  `cutEdges` (exactly one endpoint selected), the two quantities every set-level measure in 6.1 is
  built from.

### 6.1 Are the measures for a subset the same as for the whole graph?

**Question.** For an induced subgraph, a community or the visible graph, do analysts want the
same measures as for the whole graph, or different ones?

**Evidence.**

- Yang and Leskovec collected the 13 standard functions that score how community-like a node set
  S is. Every one is defined from three counts: the members n_S, the edges inside m_S, and "the
  number of edges on the boundary of S", c_S. They fall into four classes: **internal
  connectivity only** (internal density, edges inside, average internal degree, fraction over
  median degree, triangle participation ratio); **external connectivity only** (expansion,
  c_S / n_S; cut ratio, the fraction of possible outgoing edges that exist); **internal and
  external combined** (conductance, c_S / (2 m_S + c_S), "the fraction of total edge volume that
  points outside the cluster"; normalized cut; maximum, average and Flake out-degree fraction);
  and **a network model** (modularity). Conductance and triangle participation ratio "consistently
  give the best performance in identifying ground-truth communities".
- Leskovec, Lang, Dasgupta and Mahoney define the network community profile by "the 'best'
  possible community -- according to the conductance measure -- over a wide range of size
  scales". Conductance is the field's standard single number for "how separate is this set".
- NetworkX ships these as a module of their own (`cuts`): `conductance`, `cut_size`,
  `normalized_cut_size`, `edge_expansion`, `node_expansion`, `boundary_expansion`,
  `mixing_expansion`, `volume`. None of them has a whole-graph meaning; each takes a set and its
  complement.
- Saket et al.'s group-link tasks (links inside a group; the most sparsely or densely connected
  group) and group-network tasks are about a group relative to the rest of the graph (section 1.2).
- The workflows ask for both kinds. "Community Analysis" wants, per community, "size, density,
  common attributes, internal hubs" (the set as a graph) and "bridge nodes" and "how communities
  relate to each other" (the boundary). "Cluster and Functionally Annotate a Molecular Network"
  wants "cluster count, sizes, internal density". "Hub Investigation" wants "attribute profiles
  (hub vs. neighbors vs. network average)", a comparison of a set against its parent. "Condition
  Comparison - Disease vs Control Networks" wants "membership counts: nodes and edges in A only,
  B only, both".
- Cytoscape's NetworkAnalyzer no longer analyses a selected subset; the user must first make a
  subnetwork "From Selected Nodes, All Edges" and analyse that. That route answers the "set as a
  graph" questions and loses every boundary question, because the subnetwork has no outside.

**Answer.** A set is read in two ways, and analysts use both:

1. **The set as a graph in its own right** (its induced subgraph): node and edge counts, density,
   average degree, components, degree distribution, its extremes on any measure. These are
   exactly the whole-graph measures of section 2.1, computed on fewer elements.
2. **The set as a part of its parent**: edges on the boundary (cut edges), conductance, expansion,
   the neighbouring nodes outside it (the node boundary), its share of the parent's nodes and
   edges, and its attribute profile compared with the parent's (the enrichment question of
   section 2.7).

**Recommendation.** The graph inspector and the set inspector are one template, with the whole
graph as the set that contains everything. The template has the "as a graph" sections for every
set, and adds two sections only when the set is a proper subset of its parent: **Boundary** (cut
edges, conductance, outside neighbours, share of the parent) and **Compared with the graph**
(each attribute's distribution in the set against the parent). For the whole graph those two
sections have nothing to say and do not appear. The **visible graph** is a set whose parent is
the loaded graph; its Boundary section is what answers "what did the filter cut" (6.5). All of
this is graph computation and belongs in graphty-element (a statistics call over any scope),
not in the app; `selection.statistics()` already computes the two counts it needs, but only for
the selection.

In a directed graph the boundary splits into edges leaving and edges entering the set; the
standard definitions above are for undirected graphs, and the directed reading is an in and out
pair of each count.

### 6.2 When the data changes, does a kept set keep its members or recompute them?

**Question.** When data, a filter or a run changes, should a saved community, path, query-defined
set or hand-picked set keep its original members (a snapshot) or recompute them (a live rule)?
One concept with a flag, or two concepts? How should a stale result be shown?

**Evidence.**

- **Tableau treats it as one concept, "set", with two types.** "The members of a dynamic set
  change when the underlying data changes"; "the members of a fixed set do not change, even if
  the underlying data changes." Both are sets in one list; the type follows from how the set was
  made.
- **Heer and Shneiderman** describe a data-aware annotation target as "a set of selected
  elements, a declarative query, or both" (section 1.7). "Both" is the point: the members say
  what was pointed at, the query says why.
- **The W3C Web Annotation Data Model** stores several descriptions of one target on purpose:
  "Multiple Selectors can be given to describe the same Segment in different ways in order to
  maximize the chances that it will be discoverable later." It also records a **State**, "the
  time at which the resource is appropriate for the Annotation, typically the time that the
  Annotation was created", because the resource changes afterwards.
- **Cytoscape filters are live rules**, re-applied as the filter changes ("Apply when filter
  changes") and exportable for reuse; its groups and subnetworks are fixed member lists.
- **Sandve et al.'s ten rules for reproducible computational research** include "Record All
  Intermediate Results" and "Connect Textual Statements to Underlying Results". A statement about
  a set is a statement about the members it had when the statement was made.
- **graphty-element already has both behaviours, unnamed.** A saved scope holding `{ nodes }` is
  fixed; one holding `{ where }` is a rule. A run keeps its old values and reports itself stale
  rather than recomputing silently. The object model drafted earlier for graphty
  (`design/ui/object-first-ux/object-model.md` section 5) proposes that a stale object keeps
  painting its old values with a marker and a re-run button, and that an object whose input was
  deleted is "frozen": its members kept as a fixed list.
- The literature read for this document says little about **how** to show staleness. The
  consistent rule across the sources that do touch it (Heer's freeform annotations becoming
  "meaningless" after a filter; Figma keeping a disconnected style "rendering [its] last state"
  per `figma.md` section 2.7) is that the dependent thing keeps its last value and says it is out
  of date; it is never blanked or silently replaced.

**Answer.** Analysts need both behaviours, and which one a set has follows from **what the
analyst expressed** when making it:

| How the set was made | What the analyst expressed | Behaviour |
|---|---|---|
| Hand-picked, or a selection promoted to a set | these members | **fixed**: keeps its members |
| A query or filter rule ("degree > 10", "type = account") | this rule | **rule**: recomputes when the data or the rule's inputs change |
| Kept from a run result ("keep community 3", "keep this path") | these members, which the algorithm happened to produce | **fixed**, with its origin recorded (run and group) |
| The largest component, the visible graph, the selection | this rule | **rule** |

Keeping a community or a path is fixed by default because it is evidence (Pirolli and Card's
evidence file): "community 3 is the ring" is a claim about twelve accounts, and a re-run that
renumbers or reshapes the communities must not quietly change which twelve. The origin lets the
element answer the question the analyst actually has after a re-run: "10 of these 12 are still
together, now in community 5".

**Recommendation.**

- **One concept, "set", with a definition that is either a member list or a rule.** Fixed and
  rule are two values of one field, as in Tableau, not two object kinds. Every other part of the
  system (scope, selector, style layer, note anchor, set operation) takes a set without caring
  which.
- **The project file stores both, always:** the definition (member list or rule) and the member
  list as last evaluated, stamped with the data revision it was evaluated on. For a fixed set the
  two coincide. For a rule set the stored members let the file reopen without recomputing, let a
  note say what the set was when it was written (6.7), and let the element report what changed.
  This is the W3C "multiple selectors plus State" pattern applied to graph sets.
  **Section 6.19 narrows this for rule sets:** once every note stores the members it was written
  about, no workflow needs a rule set's own member list in the file; a rule set stores its
  definition, its member count and a membership digest, and stores members only when frozen.
- **States.** *Current*: a rule set whose stored members match its rule on the current data.
  *Stale*: the data or an input changed and the set has not been re-evaluated; it keeps its old
  members and paint, shows how it differs ("ran on 34 nodes, now 40", as `StaleNote` already
  says), and offers re-evaluation with a cost. *Frozen*: a rule that can no longer be evaluated
  because something it names is gone (`bound: false` today); it keeps its members and says why.
  A fixed set is never stale, but can have **missing members** (ids no longer in the graph after
  a reload or a delete), which it reports as a count rather than dropping silently.
- **Re-evaluate immediately when cheap, mark stale when not.** A query over attributes is
  linear and can follow the data live; a set that depends on a community run cannot, because
  re-running the community detection is the expensive and randomized step (6.11). The cost rule
  belongs to graphty-element, which already estimates run cost.
- **"Freeze"** converts a rule set to a fixed one with its current members. The reverse is not
  offered for sets kept from results, since the members are the only definition they have.

This is published element behaviour and a project-file format: a one-way door that should be
settled before the file ships.

### 6.3 Are kept sets mostly promoted selections or rules, and how big are they?

**Question.** In the investigation workflows, is a set kept mainly by promoting a hand selection
or mainly by rule (a query or a run result)? How large are the kept sets compared with the
5,000-element selection cap?

**Evidence (from the workflows, by what they keep and the graph sizes they state).**

| Workflow | Graph size stated | Sets kept | Made by | Typical size of a kept set |
|---|---|---|---|---|
| Fraud Ring Investigation | 10,000 to 1,000,000 nodes | the flagged entity's ring; related suspicious entities | expansion (1 to 2 hops), then hand judgment | tens |
| Criminal Network Analysis | 100 to 10,000 | key players; cells | ranking and hand judgment; community run | a handful to tens |
| Path Investigation | any | a path; alternative paths | run result | a handful of nodes and edges |
| Hub Investigation | any | hubs; a hub's ego network | threshold rule; neighbourhood rule | 1 to 10 hubs; an ego network up to the hub's degree |
| Community Analysis | 10 to 100,000 | communities worth deeper investigation | run result | tens to tens of thousands |
| Cluster and Functionally Annotate a Molecular Network | 100 to 2,000 | clusters (about 15), minus those under 3 or 4 nodes | run result | 3 to a few hundred |
| Hub Gene Identification and Ranking | 50 to 2,000 | top 10 per method; their intersection | rule (top N) and set operation | 10 |
| Gene List to Interaction Network with Expression Overlay | 100 to 600 | the largest component; a few driver genes | rule; hand | up to 600; a few |
| Condition Comparison - Disease vs Control Networks | 100 to 5,000 each | A only, B only, both | rule (set operation) | up to 5,000 |
| Threat Hunting | 100,000 and more | query results; "successful queries saved for future hunts" | rule | unbounded |
| Anomaly Detection | 1,000 and more | anomalies above a threshold | rule | tens to thousands |
| Influencer Identification | 10,000 to 1,000,000 | ranked influencers; the audiences (communities) they reach | rule; run result | tens; up to hundreds of thousands |
| Drug Target Discovery | 1,000 to 20,000 | the disease module; the ranked target list | rule | hundreds; tens |

For community sizes on large graphs: on a 2.6-million-node phone network, Louvain found "261
communities that have more than 100 customers", covering about 75 percent of all customers, and
"36 communities with more than 10000 customers" (Blondel et al. 2008).

**Answer.**

- **By count, rules dominate.** Eleven of the thirteen workflows keep at least one set made by a
  rule or a run result. Hand promotion dominates only in the alert-driven investigation
  workflows (Fraud Ring Investigation, Criminal Network Analysis), and even there the hand
  selection is usually a trimmed result of a neighbourhood expansion.
- **Hand-made sets are small** (a handful to a few hundred) and sit far below 5,000. **Rule sets
  routinely exceed it**: a community, an audience, a largest component or a query result on the
  10,000-to-1,000,000-node graphs that five personas describe.

**Recommendation.**

- **Both routes are the same verb, "Keep", at depth zero, applied to whatever is in hand**: the
  selection (fixed), a group or path in a result (fixed, with origin), a query or filter (rule).
  Keeping a community or a query result must **not** route through the selection, because the
  selection truncates at 5,000 and a truncated set would silently be a different set.
- **The 5,000 cap is acceptable for the selection and not for sets.** Nobody hand-curates more
  than 5,000 elements, so the cap protects the render path without costing an analyst anything;
  but a set's membership has no cap. When a rule-made selection is truncated (for example "select
  the top 10 percent" on a million nodes), promoting it must refuse or offer "Keep as a rule"
  instead; today `promote` keeps the truncated members without a word, which is an element
  defect.

### 6.4 Is a per-node measure a unit that analysts name, annotate and compare?

**Question.** Do analysts treat a measure such as PageRank or betweenness as a unit -- naming it,
annotating it, comparing it with another measure -- independently of the nodes it scores?

**Evidence.**

- **Compare as a unit.** "Hub Gene Identification and Ranking": "Do the hubs agree across
  methods", "Overlap between top-N lists of different methods", "keep the per-method ranks as
  columns", "Running five algorithms one at a time and copying results into a spreadsheet to
  compare". "Influencer Identification": "How to weight different centrality measures?".
  "Condition Comparison": "Compute degree or betweenness in each condition, build a custom score
  for the difference". "Community Analysis": "Are communities stable across different
  algorithms/parameters?". In each case the thing compared is the whole measure, not a node.
- **Name and cite as a unit.** "Hub Gene Identification and Ranking" asks "which edges were used
  (weight attribute, direction) for each run": two betweenness runs, weighted and unweighted, must
  be told apart by name. "Reproducible Session and Network Publication" wants a "complete
  parameter record per analysis, copyable as text" and a methods paragraph; "Enrichment Map"
  wants "the exact creation parameters, always retrievable". Sandve et al.: "For Every Result,
  Keep Track of How It Was Produced".
- **Annotate as a unit.** Weaker, but present: "Iterative Analysis Cycle" ends in "documented
  findings with confidence levels and limitations", and a limitation is usually about a method
  (betweenness approximated on a sample; eigenvector centrality meaningless on a disconnected
  graph). graphty-element already attaches such caveats to a run (`Caveats.notes`, `exact`,
  `sampleSize`, `converged`).
- **Tools.** Gephi and Cytoscape give a measure identity only as a named column. igraph returns a
  community result as an object (`VertexClustering`) that carries its own quality score
  (`graph-tools.md`, section 18, item 6). graphty-element gives every run an id, a label that
  disambiguates siblings, parameters, caveats, a histogram and a summary.

**Answer.** Yes. A measure is compared, combined, named, cited and qualified as a whole, apart from
any node it scores.

**Recommendation.** A measure needs identity, a row and a note anchor, and it already has an
object for them: the **run's result**. No new object kind is needed beyond the result the
analysis tree already holds. The per-node value is still read as an attribute of the node
(section 4.3, item 1), with the run's provenance shown wherever the value appears; the measure
as a unit is the result row, whose inspector shows the distribution, the parameters, the caveats
and the notes about the measure. "Compare" (top-N overlap, rank correlation, difference) takes two
such results.

**This corrects section 4.3, item 1**, which said the user's model "should not add a parallel
'result object'", and reconciles it with `graph-tools.md` section 18, item 6, which models a
result as an object. Both are right about different things: the **values** live on the nodes (no
parallel copy of them), and the **measure** is one object per run.

### 6.5 Which whole-graph measures belong at rest, and which on demand?

**Question.** Which whole-graph measures should be shown without asking, and which are costly
enough to be results the analyst runs, with provenance, at the graph sizes the personas
describe? After a filter, do analysts need the loaded and visible numbers side by side?

**Evidence.**

- **What is asked for first.** "First Exploration - Quick Data Assessment" lists "node/edge
  counts and their ratio", "connectivity status (single component or fragmented?)", "degree
  distribution shape (normal, power-law, bimodal)" and "attribute completeness percentages", with
  a 15-minute target. "First-Time User Onboarding" asks for "basic statistics after loading".
  Neither asks for diameter, path length, clustering or assortativity at the start; "Anomaly
  Detection" and "Hub Gene Identification and Ranking" ask for clustering later, as a method.
- **Cost, by standard complexity** (n nodes, m edges; the same figures graphty-element's catalogue
  publishes for its own algorithms in `graphty-element/src/catalog/algorithms.ts`):

| Measure | Cost | At 1,000,000 nodes, 5,000,000 edges |
|---|---|---|
| counts, density, self-loops, parallel edges, degree range and mean | O(n + m) | instant |
| connected components, largest share, isolates | O(n + m) | instant |
| degree distribution (a histogram of the degree vector) | O(n) | instant |
| reciprocity (directed) | O(m) | instant |
| degree assortativity | O(m) | instant |
| attribute completeness | O(n x attributes) | instant |
| global and average clustering coefficient | triangle counting, about O(m x maximum degree) | seconds to minutes, dominated by hubs |
| diameter, average path length (exact) | a traversal from every node, O(n x m) | infeasible exactly (about 5 x 10^12 steps); a sampled estimate is needed |

- **Diameter and average path length are undefined on a disconnected graph.** NetworkX raises an
  error unless the graph is connected, and for a directed graph unless it is strongly connected.
  Every reported value is therefore "on the largest component", often "estimated from a sample":
  exactly the provenance a result carries.
- **Loaded against visible.** "Visual Exploration - Overview to Detail": "what percentage of data
  remains, did important nodes disappear?". "Enrichment Map": "Node count and edge count after each
  cutoff change, live". "Condition Comparison": counts, density and component count "for each
  network and for the merged one", side by side.
- graphty-element's `data.statistics()` returns the O(n + m) set above, except the degree
  distribution, reciprocity, assortativity and attribute completeness, and it describes the loaded
  snapshot only. `scope.statistics(spec)` for an arbitrary scope is proposed in the design record
  but not built (`graphty-today.md`, section 3).

**Recommendation.**

- **At rest** (in the inspector with nothing selected, recomputed on every change, never stored
  as a result): node and edge counts, density, directedness and weightedness, self-loops and
  parallel edges, mean degree and range, component count with the largest component's share and
  the isolate count, the degree distribution as a small histogram, reciprocity for a directed
  graph, and attribute completeness. All are linear and all answer the first-exploration
  questions.
- **On demand, as results with provenance** (kept in the project file, stale when the data
  changes; section 6.20 places them as rows of the graph or set inspector with a provenance
  popover, not as rows of the result list): clustering coefficient (global and average, labelled
  distinctly), diameter, average path length, and degree assortativity. Assortativity is cheap but
  rarely read at first, and it needs an explanation; the others are costly and carry
  "largest component" and "sampled" caveats. **This refines section 5.2**, which classed all graph
  statistics as transient: the linear ones are; the costly, scope-qualified ones are kept results.
- **Loaded and visible side by side.** Whenever a filter is active, each at-rest number shows both,
  with the percentage ("visible 1,204 of 5,830 nodes, 21 percent"). "Did important nodes
  disappear?" is the visible set's Boundary section from 6.1 applied to kept measures: for each
  measure result, how many of its top N are hidden. This needs statistics over any scope in
  graphty-element.

### 6.6 Are edge weight meaning and edge direction set once, or per run?

**Question.** Is the meaning of an edge weight (a cost or a strength) and the treatment of
direction set once for the graph or chosen for each run?

**Evidence.**

- **The same attribute means opposite things to different algorithms.** NetworkX's betweenness:
  "Weights are used to calculate weighted shortest paths, so they are interpreted as distances."
  NetworkX's PageRank takes the same `weight` key as the strength of a link. Opsahl, Agneessens and
  Skvoretz (2010): for shortest-path centralities, strength weights must be inverted to become
  costs, as "Newman (2001) transformed the positive weights in a collaboration network into costs
  by inverting them". A tool that passes a strength (a STRING confidence, a correlation, a
  transaction volume) straight to betweenness routes paths through the weakest ties.
- **Libraries choose per call; tools choose per run.** NetworkX and igraph take the weight
  attribute on every call and take direction from the graph type. Cytoscape's NetworkAnalyzer
  opens a dialog on every run "where you can specify if the network should be analyzed as a
  directed graph".
- **The workflows put the choice in each run, and require it recorded.** "Path Investigation":
  "Should edge weights be considered (weighted vs unweighted)?". "Hub Gene Identification and
  Ranking": "Weighted or unweighted (STRING combined score, correlation)?" and "which edges were
  used (weight attribute, direction) for each run".
- **graphty-element** holds directedness as a fact about the graph with its source
  (`GraphStatistics.directedness`, `directednessSource`) and records each run's `direction`
  (`directed`, `undirected`, `as-loaded`) and `weight` in its caveats. It has no field saying
  whether a weight is a cost or a strength.

**Answer.** Both, at two levels. What an attribute *means* (this column is a strength; these edges
are directed) is a fact about the data and is stated once. Whether to *use* it (ignore weights,
treat as undirected) is an analysis choice and is made per run.

**Recommendation.**

- **The graph inspector declares the facts once**: directed or undirected, which attribute is the
  weight, and for each weight attribute whether it is a **cost** (distance, time, price) or a
  **strength** (confidence, volume, frequency).
- **Each run defaults to those facts and may override them** (use another weight attribute,
  ignore weights, treat as undirected). The run's parameters show the choice, and its caveats
  record what was used, as they already do.
- **graphty-element converts per algorithm** using the declared meaning: a strength becomes a cost
  for path-based measures, and the conversion is stated in the run's caveats. A weighted run whose
  weight meaning was never declared says so in its caveats rather than guessing. This is
  graphty-element's job; an app that inverted weights before handing them over would be working
  around the element.

### 6.7 What are notes about, and what happens to a note when its targets change?

**Question.** Are notes mostly about a specific node, edge or set, about a whole finding or
picture, or about a result and its parameters? What should a note show when its elements are
filtered out, deleted, merged or missing after a reload? When its set's membership changes,
should it follow the rule or keep the members it was written about?

**Evidence.**

- **What notes contain.** Mahyar, Sarvghad and Tory's observational study of collaborative visual
  analysis found record-keeping to be one of the main activities, with notes and annotations
  that "externalize user insights, findings, hypotheses", characterized "according to their
  content, scope, usage". The W3C model's list of annotation motivations includes assessing,
  bookmarking, classifying, commenting, describing, identifying, linking, questioning and tagging.
- **What the tools anchor notes to.** Notes split into notes about an element (Kumu descriptions,
  comments on an item) and notes on the picture (Cytoscape canvas annotations, export arrows)
  (`graph-tools.md`, section 18, item 8). Figma pins comments to a frame or a canvas point
  (`figma.md`, section 2.7).
- **What the workflows annotate**, by target:

| Target | Workflows and their words |
|---|---|
| a node, an edge or a set | Fraud Ring Investigation ("evidence chain for each finding"); Criminal Network Analysis ("entity relationships with evidence documentation", edges as well as nodes); Path Investigation ("path(s) with annotations"); Cluster and Functionally Annotate ("label clusters by term ... or by manual name"); Enrichment Map ("name the themes"); Anomaly Detection ("label as error, threat, or discovery"); Hub Investigation ("hub classification + explanation of role"); Knowledge Graph Construction (resolution decisions on duplicate pairs) |
| a finding or a picture | Findings Communication ("highlight key findings, add annotations"); Reproducible Session ("add text annotations and a legend to the canvas"); Iterative Analysis Cycle ("evidence summary, confidence level, limitations") |
| a result and its parameters | Iterative Analysis Cycle (limitations of a method); Threat Hunting ("document negative hunt", a note about a query that found nothing); Reproducible Session (the methods paragraph); Hub Gene Identification and Ranking (why methods disagree) |

- **Anchoring that survives change.** Heer: data-aware annotations are "a set of selected
  elements, a declarative query, or both", and non-data-aware ones "may become meaningless in the
  face of operations such as filtering". W3C: several selectors per target to "maximize the chances
  that it will be discoverable later", plus a State recording the version the annotation was made
  on. Figma's rule: "a reference outlives its target"; its weakness is that orphaned comments
  cannot be re-anchored (`figma.md`, section 2.7).

**Answer.**

- **Most notes are about specific nodes, edges or sets** (eight of the thirteen workflows that
  annotate), then about a finding or a picture (three), then about a result and its parameters
  (four; some workflows appear in more than one row). A finding note usually cites several
  targets at once.
- **A note keeps the members it was written about.** A note is a record of what the analyst saw
  (insight provenance, section 1.9); Sandve et al.'s "Connect Textual Statements to Underlying
  Results" requires the statement to stay tied to the results it described. A note that followed
  a rule would silently change what it claims.

**Recommendation.**

- **One note object with a list of targets**, each a node, an edge, a set, a result or a view;
  zero targets makes a free note on the project. Its homes follow from its targets: a **Notes
  section** in the inspector of every target, a **Notes list** that collects all of them, and a
  **canvas pin** when a target has a position. A note targeting a view is the "note on the
  picture". No note is a graph object, and no note is only a canvas mark.
- **What an anchor stores in the project file:** for each target, its id; for a set target, the
  set id **and** the member list as it was when the note was written, with the data revision; the
  display labels of the targets, so the note stays readable if the ids never come back. The query
  is not stored in the note; it lives in the set.
- **When targets change:**

| Change | What the note shows |
|---|---|
| target hidden by a filter | unchanged in the list and the inspector; the canvas pin hides with the element; the list marks "target hidden" |
| target deleted, or missing after a reload | kept, marked "2 of 5 targets no longer in the graph", listing the stored labels; re-anchors by id if they return |
| targets merged | follows the merge to the surviving node, and says so |
| the set it names changed membership | keeps its stored members and shows the difference: "written about 12 members; the set now has 14 (2 added)" with a way to see both |

  A note never disappears because its target did, and it can be re-pointed by hand, which is
  the repair Figma lacks. Tracking merges and re-anchoring by id is graph logic and belongs in
  graphty-element; what the note says and how it looks is the app's.

**This sharpens section 4.3, item 3**, which allowed an anchor "by membership, by query, or both":
the anchor stores membership (authoritative for what the note is about) and a link to the set
(through which the query is reachable).

### 6.8 Do community questions act on the partition or on individual communities?

**Question.** Do analysts' questions about community detection act mostly on the partition as a
whole (modularity, count, size distribution) or on individual communities (members, density, top
node, bridge nodes)? Are results with hundreds of communities common?

**Evidence.**

- **Saket et al.** span both: group-only tasks ("how many groups") act on the partition;
  group-node tasks ("which group contains node X", "the largest group"), group-link tasks ("the
  most densely connected group") and group-network tasks act on individual groups, usually by
  comparing them with each other.
- **"Community Analysis"** asks at the partition level for "number of communities detected",
  "modularity score", "community size distribution (one giant community is suspicious)" and
  stability "across different algorithms/parameters", and at the community level for "for each
  community: size, density, common attributes, internal hubs", "top nodes per community" and
  "which communities warrant deeper investigation".
- **"Cluster and Functionally Annotate a Molecular Network"** wants a "table of clusters by size;
  click a row to select and center its members", drops clusters "below 3 or 4 nodes", annotates
  about 15, and notes that "cluster colors run out or collide past 8 to 12 clusters".
  **"Enrichment Map"** collapses clusters into named themes. **"Condition Comparison"** asks
  "which communities split or merged" (partition against partition). **"Fraud Ring
  Investigation"** asks "is entity in a suspicious cluster?" (one community).
- **Hundreds are common on large graphs.** Louvain on a 2.6-million-node network found 261
  communities with more than 100 members covering about 75 percent of the nodes, with the rest in
  smaller ones (Blondel et al. 2008). Leskovec et al. find the tightest communities at small size
  scales, with larger ones blending "into the expander-like core", which means long tails of small
  communities. Five personas work on 10,000-to-1,000,000-node graphs.

**Answer.** Both, in sequence: the partition is judged first (is it any good, how many, what size
spread), then a few communities are examined one at a time and a handful kept. Hundreds of
communities are normal on the larger graphs; only a few are ever looked at individually.

**Recommendation.**

- **A community result is one row** in the analysis tree, carrying the partition-level numbers
  (count, modularity, size distribution, parameters, seed).
- **Its communities are rows of a sortable table inside the result's inspector** (size, internal
  density, conductance, top node by a chosen measure, dominant attribute value), not one row each
  in the tree. Clicking a table row selects and frames the community; the table handles
  thousands of rows where a tree would not.
- **A community becomes a tree row of its own only when kept** (6.2, 6.3): a fixed set with its
  origin.
- **Encoding** gives distinct colours to the 8 to 12 largest communities and one "other" colour to
  the rest (graphty-element's binding already has `other` and `overflow`).
- **In the project file**, the partition is a run with a membership column; a community is
  identified by its group number within that run, and a kept community is a set that records that
  origin.
- Section 6.26 adds that one community is addressable (inspect, select, label, note, scope
  "within each group") without being kept; it is still not a row of the left panel.

### 6.9 Are path tracing, cluster finding and value reading more accurate in 2D or 3D?

**Question.** What does the evidence say about accuracy on path tracing, cluster identification and
reading attribute values in 3D versus 2D? graphty-element defaults to 3D.

**Evidence.**

- **Path tracing improves in 3D only with depth cues beyond perspective.** Ware and Franck (1996):
  "head-coupled stereo viewing can increase the size of an abstract graph that can be understood by
  a factor of three; using stereo alone provided an increase by a factor of 1.6 and head coupling
  alone produced an increase by a factor of 2.2"; structured motion of any kind (head-guided or
  automatic rotation) helped and mattered more than stereo. Ware and Mitchell (2008), on a very
  high-resolution stereo display: "with both motion and stereoscopic depth cues, unskilled
  observers could see paths between nodes in 333 node graphs with less than a 10% error rate",
  skilled observers up to 1,000 nodes, "an order of magnitude increase over 2D display".
- **Cluster identification.** Greffard, Picarougne and Kuntz (2014), on community detection:
  "stereoscopic 3D outperforms both 2D and monoscopic 3D in task resolution. The 2D condition
  always yields the lower response times." Monoscopic 3D (perspective on a flat screen) showed no
  accuracy advantage over 2D in that summary.
- **Immersive headsets.** Kwon, Muelder, Lee and Ma (2016): participants in an immersive
  head-mounted display "answered significantly faster with a fewer number of interactions ...
  especially for more difficult tasks"; "overall correctness rates are not significantly
  different", with more correct answers on the larger graphs.
- **Reading values.** Munzner's rules: "perspective distortion ... interferes with all size channel
  encodings"; "occlusion hides information", resolved by interaction only "at cost of time and
  cognitive load"; text "far worse when tilted from image plane"; "3D needs very careful
  justification for abstract data -- be especially careful with 3D for point clouds or networks";
  "resolution beats immersion". Size-encoded measures and labels, the main ways an analyst reads a
  value on the canvas, are the channels 3D damages most.

**Answer.** On a flat desktop monitor, which is where the intermediate analyst works, graphty's 3D
mode is monoscopic perspective with motion only while the user orbits. For that setting the
evidence favours 2D for reading values (size, colour, labels) and for speed on cluster finding, and
gives monoscopic 3D no accuracy advantage on cluster finding. The 3D gains in path tracing and
cluster finding come from stereo and head-coupled or continuous motion, which a headset provides.

**Recommendation.** Analysis should open in 2D, with a layout computed in 2D (a flat layout viewed
in perspective is not a 3D layout); 3D, VR and AR are choices, with VR and AR the justified 3D
settings for tracing paths and seeing structure in large graphs. graphty-element's default view
mode (`DEFAULT_VIEW_MODE = "3d"`) is published behaviour, so changing it is a decision for the
element's owner rather than something the app should override quietly; the app setting 2D through
element configuration is consuming the element and is allowed. If the element keeps 3D as its
default, the reason should be written down (for example, that the component's first impression is
a showcase rather than an analysis). Section 6.24 adds the evidence on automatic rotation.

### 6.10 Where does the attribute table live, and what is it used for?

**Question.** Which workflows need the attribute table and the canvas visible and linked at once,
and at what width? Is the table used to read one node's full row, or to sort and compare many rows?

**Evidence.**

| Workflow | What the table is used for | Linked to the canvas | Width needed |
|---|---|---|---|
| Hub Gene Identification and Ranking | "ranked table with all metrics side by side, sortable, with the node's data columns alongside"; then "look at the hubs in context" | yes | five or more measure columns plus data columns |
| Cluster and Functionally Annotate a Molecular Network | "table of clusters by size; click a row to select and center its members" | yes | a few columns |
| Enrichment Map | "sort the node table by FDR or NES"; search a gene and highlight its pathways | yes | several columns |
| Condition Comparison | the rewired-gene table; "select a gene in one and see it highlighted in the other" | yes | per-condition columns side by side |
| Anomaly Detection | "prioritized anomaly list", triage | yes | score plus context columns |
| Influencer Identification, Drug Target Discovery | ranked lists with several scores | yes | several columns |
| Gene List to Interaction Network | "full attribute row for a clicked node, all columns, not a five-row preview", from a 10-to-40-column table | yes | one row, many fields |
| Data Import and Validation, Knowledge Graph Construction | preview, rejected rows, duplicate pairs | not necessarily | wide |

Cytoscape docks its Table Panel below the network, with the selection synchronised between them
and a mode that shows only selected rows (`graph-tools.md`, section 1).

**Answer.** The table is used overwhelmingly to **sort and compare many rows** while the canvas
shows where those rows are (seven workflows). Reading one node's full row is one workflow's need,
and it is better served by the inspector, provided the inspector lists every attribute rather
than a preview. The comparing workflows need width: several measures plus the data columns do not
fit in a side panel.

**Recommendation.** The table lives in a **full-width dock below the canvas**, linked both ways
with the selection, resizable, and reachable from anywhere with one key; "Show in table" on any set
or result opens it filtered to those members, with that result's columns first. A full-screen table
is a mode for data cleaning and import review, where the canvas is not needed. The table is an
everyday analysis surface, so it deserves an always-available handle rather than only a door from
an attribute row. A side rail panel would be the wrong shape for it, because a rail panel is
narrow. The inspector must show a node's complete attribute list.

### 6.11 For randomized results, should the project file store values or the recipe?

**Question.** For Louvain, Leiden, label propagation and force-directed positions, do
reproducibility practices archive result values, or the algorithm, parameters and seed? Does any
tool guarantee identical output from a seed across machines and versions?

**Evidence.**

- **The practice is both.** Sandve et al.'s ten rules include "For Analyses That Include
  Randomness, Note Underlying Random Seeds", "Record All Intermediate Results, When Possible in
  Standardized Formats", "Always Store Raw Data behind Plots" and "Archive the Exact Versions of All
  External Programs Used". The seed is necessary; it is not sufficient.
- **No guarantee across versions or machines was found, and one major library explicitly
  withdrew it.** NumPy's NEP 19 dropped its seed-stream compatibility policy, saying the old policy
  "overpromises compatibility. The same version of numpy built on different platforms, or just in
  a different way could cause changes in the stream", and that "the standard practice now for
  bit-for-bit reproducible research is to pin all of the versions of code of your software stack".
  NetworkX's Louvain: "The order in which the nodes are considered can affect the final output. In
  the algorithm the ordering happens using a random shuffle"; a seed makes a run repeatable, and
  its documentation promises nothing across versions. Blondel et al. (2008): "the output of the
  algorithm depends on the order in which the nodes are considered".
- **graphty-element.** Leiden and label propagation use a seeded generator (default seed 42,
  `algorithms/src/algorithms/community/leiden.ts`, `label-propagation.ts`). A run records its seed,
  engine versions and arithmetic precision (f32 on the GPU, f64 on the CPU). The node visiting order
  also depends on the order the data was loaded in, so the same seed on a re-ordered file can give
  a different partition.
- **The workflows need the values to stay put.** "Reproducible Session and Network Publication":
  reopen "in six months ... sealed so it does not drift". Notes and kept sets refer to community
  numbers (6.7, 6.8).

**Answer.** Archive both. No tool guarantees identical output from a seed across machines and
versions, and the most-used numeric library explicitly says it cannot.

**Recommendation.**

- **The project file stores the recipe for every result** (algorithm, parameters, seed, scope,
  direction, weight, engine versions, precision) **and the values for every result that is
  randomized, expensive, or referred to** by a note, a set or a style layer. Deterministic cheap
  results (degree, components) may be stored as recipe only and recomputed on open.
- **Cost of the values:** 4 bytes per node per column for a membership column or a single-precision
  measure (about 4 MB per million nodes), 8 bytes for double precision (about 8 MB per million), and
  positions at 2 or 3 numbers per node. Against a data file of the same graph this is modest, and
  it is the only way the next item can hold.
- **On reopening, stored values are shown as stored**, not recomputed. "Re-run" makes a new run
  that can be compared with the stored one. Notes can then promise to point at the same communities
  after reopening, because the communities are stored, not regenerated.
- Force-directed positions follow the same rule; section 5.2 already keeps them.

### 6.12 Are edge sets kept as often as node sets, and must a set hold both?

**Question.** Do analysts keep, name and annotate edge sets as often as node sets? Must a saved set
hold nodes and edges together, and are alternative paths compared as a family?

**Evidence.**

- **Node sets are kept far more often.** Every set in the table in 6.3 is a node set except paths
  and the condition-membership edges. The task taxonomies are node-centred (section 8).
- **Edge sets are kept in a minority of workflows, and there they are essential.** "Condition
  Comparison": "encode edges by 'in A only / in B only / both'" and "export the merged edge list
  with a membership column". "Criminal Network Analysis": "entity relationships with evidence
  documentation" (notes on edges). Minimum cuts, bridges, spanning trees and edge betweenness
  (Girvan-Newman) all produce edge sets or edge values (sections 2.4, 3.2).
- **Paths are mixed sets and are ordered.** Lee et al. define a path as "an alternating sequence of
  nodes and links". "Path Investigation" needs "each step with edge type/label", which the node
  list alone cannot give when two nodes are joined by several edges, and a path's nodes induce
  edges (chords) that are not on the path. Cytoscape.js returns algorithm results, including paths,
  as one collection of nodes and edges (`graph-tools.md`, section 2).
- **Paths are compared as a family.** "Path Investigation": "alternative paths count and their
  lengths", "common intermediate nodes across paths (bottlenecks/brokers)", "hard to compare
  multiple paths visually". "Fraud Ring Investigation": "paths to known fraud cases" (several).
- **graphty-element** publishes result shapes for `path` (nodes with `onPath` and `order`, edges with
  `onPath`), `node-set` and `edge-set`, and the selection holds nodes and edges. But `Scope` has no
  edge arm, and `selection.promote` drops the selected edges (`graphty-today.md`, section 1.7). A
  path or a spanning tree therefore cannot be kept as a set today.

**Answer.** Edge sets are kept less often than node sets, but paths, cuts and condition-membership
edges cannot be represented without them. A set must be able to hold nodes and edges together.

**Recommendation.**

- **One set concept with two member arms, nodes and edges, either of which may be empty.**
  Node-only and edge-only are cases, not kinds, so the published vocabulary needs no second word.
  This requires an edge arm in graphty-element's scope and a `promote` that keeps the edges it was
  given; both are element changes to make before the set vocabulary is published.
- **A path is a set with an order** (the element's `order` field): a path is kept, named and noted
  like any set, and its inspector lists the steps with each edge's type.
- **A path family is a result** (all paths, or the k shortest), whose inspector shows the count,
  the lengths, and the intermediate nodes shared by many or all paths (their intersection, a set
  operation). Individual paths are rows of its table, as communities are in a community result
  (6.8), and one becomes a tree row only when kept.

### 6.13 When a parameter changes, is it the same measure revised or a new one?

**Question.** When an analyst changes a parameter of a measure that already exists (the Louvain
resolution, the weight attribute of a betweenness run), do they treat the result as the same
measure, revised, or as a new measure to compare beside the old one? And what should happen to
the style layers painted from the old run?

**What graphty-element does today.** A run's id is derived from the algorithm, its canonical
parameters and the scope specification (`graphty-element/src/session/runs/runId.ts`), so a changed
parameter is a different run with a new id; the old run stays in `runs.list()`. The new run paints
itself on first completion, and because an encoding replaces only a layer bound to the same run,
the new layer stacks on the old one for the same channel (`graphty-today.md`, section 7.1). Every
tweak therefore adds a result row and a style layer, and nothing marks the old run as replaced.

**Evidence.**

- **Tools with one column per measure treat a re-run as a revision, and users rename to keep the
  old one.** Gephi's Graph Distance statistic reuses its columns and Modularity re-creates
  `modularity_class`, so a second run overwrites the first (`graph-tools.md`, Gephi). Kumu: "Each
  time you run the metric the previous values are overwritten"; the documented way to keep an
  earlier run is to rename its field first ("2014 betweenness"). Kumu's community detection goes
  further toward "same measure": a re-run by default "uses the existing communities to seed the
  algorithm", keeping the communities stable, unless the user chooses to "throw away the current
  communities" (`graph-tools.md`, Kumu). The Gephi FAQ's advice to duplicate a column before
  re-running (`design-method.md`, section 3.5) is the same workaround.
- **Code-first analysts keep variants side by side, by hand.** Kery, Horvath and Myers
  interviewed and surveyed data scientists: they "frequently code new analysis ideas by building
  off their code from a previous idea" and rely on "informal versioning interactions like copying
  code, keeping unused code, and commenting out code to repurpose older analysis while attempting
  to keep those analyses intact", which allows "quick comparisons by interchanging which versions
  are run" but forces them to "maintain a strong mental map of their code in order to distinguish
  versions, leading to errors and confusion" (Variolite, CHI 2017, abstract).
- **Most abandoned variants are never revisited.** In Tableau usage logs (20,192 actions from 36
  users), "undo was ~12.5 times more common than redo. Thus, most undone actions were never
  revisited" (Heer, Mackinlay, Stolte and Agrawala 2008, section 4.3.1).
- **The workflows show both intents, and they are distinguishable by purpose.**
  - *Tuning* (searching for the right value; only the last one matters): "Cluster and Functionally
    Annotate a Molecular Network" ("Which clustering method and granularity (inflation,
    resolution) gives clusters that match known complexes?"); "Enrichment Map" (slide the q-value
    and similarity cutoffs, "Node count and edge count after each cutoff change, live");
    "Anomaly Detection" ("Should I adjust the baseline definition?"); "Gene List to Interaction
    Network" (the confidence cutoff).
  - *Comparing* (both results are kept and read together): "Community Analysis" ("Are communities
    stable across different algorithms/parameters?"); "Hub Gene Identification and Ranking"
    ("Weighted or unweighted", "which edges were used (weight attribute, direction) for each
    run", "keep the per-method ranks as columns"); "Condition Comparison" (the same measure in
    each condition).
  Tuning is the more frequent act (every cutoff drag, every resolution step); comparing is the
  deliberate one, and it keeps a handful of variants, not every step.

**Answer.** Both, and the default is revision. An analyst editing a parameter is usually tuning
one measure, and expects the paint and every reference to follow the new value, as they do in
Gephi and Kumu. Keeping the old result beside the new one is a deliberate act that users perform
today by renaming or copying, and it is what the comparison decision points need.

**Recommendation.**

- **A measure has an identity above the run.** Call it the measure (the object the analyst names,
  paints and notes); its runs are its versions. Editing a parameter starts a new run *of the same
  measure*, which becomes its current run. The replaced run is kept in the measure's own history,
  so undo restores it and "compare with previous" can read it. This is the rule the earlier object
  design already settled ("a parameter edit starts a new run that replaces the old under the same
  object id and keeps the replaced result in the journal", `graphty-today.md`, section 7.1), and
  it needs a stable measure id in the project file, distinct from `RunId`. `RunId` keeps its
  "same definition, same id" rule; the measure id is what style layers, notes, kept sets and
  views reference.
- **"Keep as a separate measure"** (a duplicate, or "run again as new") is the explicit verb for
  comparison. It creates a second measure with its own name ("Louvain, resolution 1.5"), which
  the label rule already produces by naming the parameter that differs.
- **Style layers follow the measure, not the run.** A layer painted from a measure repaints from
  its current run when the parameter changes; no layer is added. A separately kept measure does
  not auto-paint a channel that a sibling measure of the same algorithm already paints; it offers
  "Paint instead" (replace the sibling's layer) or "Paint as well". So the style stack grows only
  when the analyst asks it to, which keeps the Algorithm Styles rule (stacking is deliberate)
  meaningful.
- **Kept sets and notes are not moved.** A community kept from the old run is a fixed set with its
  origin (section 6.2); a note keeps the members it was written about (section 6.7). After a
  revision, the element can report "10 of these 12 are still together, now in community 5" from
  the origin.
- **One-way door:** the measure id and "layers reference the measure" are project-file format.
- **Section 6.28 narrows the revision default for partitions**: once a partition carries group
  labels, group notes or kept groups, a parameter edit creates a new partition beside it.

### 6.14 With a filter or a set active, what does a run compute over?

**Question.** When a filter is active or a subset is named and the analyst runs betweenness,
PageRank or community detection, is the measure computed on the induced subgraph (what remains),
or computed on the whole graph and read for the subset's members? Is there documented harm from
Gephi's silent filtered statistics?

**What graphty-element does today.** A run that names no scope "Defaults to the visible graph"
and records that scope, but the executor never reads it: the algorithms read the whole loaded
snapshot (`graphty-element/src/managers/AlgorithmManager.ts`, `execute`; `graphty-today.md`,
section 7.2). The record says "visible, 120 nodes" while the values describe every node, and every
visible-scoped run is flagged stale when the filter changes although its values did not depend on
it.

**Evidence.**

- **The code-first libraries never scope implicitly.** NetworkX and igraph compute on the graph
  object they are given; a subset is computed on only after the analyst builds it explicitly
  (NetworkX `subgraph`, "the subgraph induced on nodes in nbunch"; igraph `induced_subgraph`), and
  reading whole-graph values for a subset is a lookup the analyst writes. Both choices are visible
  in the code (`graph-tools.md`, sections on NetworkX and igraph).
- **Cytoscape makes the subset its own network.** NetworkAnalyzer analyses the current network;
  a subset must first become a subnetwork with its own name (`graph-tools.md`, section 20.7).
- **Gephi and Kumu scope silently.** Gephi's statistics start from `getUndirectedGraphVisible()`
  or `getDirectedGraphVisible()`; Kumu: "Metrics will not be calculated for elements that are
  filtered out of the map" (`graph-tools.md`, section 20.7).
- **Documented harm from Gephi's silent scoping.**
  - Gephi issue 636 (2012): with a filter active, weighted degree was computed only for the nodes
    that passed the filter, while "Previously computed weighted degrees for entities not passing
    the filter ... are unaffected", so one column held values from two different computations with
    nothing to tell them apart. The reporter had a paper deadline and said they would "have to
    report this as a limitation of Gephi in the paper". The same thread shows the opposite intent
    is real: the reporter *wanted* the value within each of 234 modularity classes, and the
    advised workaround was to export each filtered graph to a new workspace, or compute in R.
  - Gephi issue 541: the ranking (the size and colour mapping) "uses only the visible graph for
    calculating the bounds. That makes comparaison between views difficult because the scale is
    modified"; Gephi added a local / global switch in response. The silent scope broke
    comparison, and the fix was to make the scope a visible choice.
- **Path-based measures change on a subgraph, and the change is not small.** Betweenness,
  closeness and every shortest-path measure depend on nodes outside the subset, because the
  shortest path between two visible nodes may run through a hidden one. The network-sampling
  literature measures this: Costenbader and Valente (2003) found, by bootstrap sampling, that
  the stability of eleven centrality measures under sampling varies by measure and by network
  (summary as indexed by Semantic Scholar); Borgatti, Carley and Krackhardt (2006) studied
  centrality under missing nodes and edges and found dense networks most robust except to edge
  deletion (same source). A filter that hides nodes is, for these measures, a missing-data
  condition imposed by the display.
- **The workflows mostly filter to declutter, and ask a question that presumes whole-graph
  values.** "Visual Exploration - Overview to Detail": the filter phase is "Remove uninteresting
  elements to reduce cognitive load", and its information need is "did important nodes
  disappear?", which is only answerable if importance was measured on the whole graph. The
  workflows that analyse a subset *as its own graph* say so explicitly: "Community Analysis"
  ("Input: Connected graph (typically giant component)"), "Gene List to Interaction Network"
  ("Select the largest connected component and make it the working network"), "Drug Target
  Discovery" ("Define the disease-relevant subnetwork"), "Condition Comparison" ("Union,
  intersection, or difference as the working network?").

**Answer.** Code-first analysts (NetworkX, igraph) and Cytoscape users expect whole-graph values
unless they built a subgraph on purpose; the induced-subgraph computation is always an explicit,
named step in those tools. Silent scoping by the display filter is documented to cause a mixed
column and broken comparisons in Gephi. Both intents are real, and the difference that matters is
whether the analyst chose the scope.

**Recommendation.**

- **An unscoped run computes over the whole loaded graph**, and while a filter is active the
  values are read for the visible members (ranked among the visible, if asked). Filtering the
  display never changes what a result means, so filter changes never make a run stale.
- **Computing within a subset is an explicit scope, named in the result**: "Betweenness within
  Visible", "Louvain within Largest component", "Degree within Community 3". The run dialog offers
  the scopes that apply (whole graph, visible, selection, a kept set, the largest component) with
  the whole graph preselected. "Within each community" (issue 636's need) is a later extension of
  the same scope, not a different mechanism.
- **The element must compute over the scope it records.** Recording "visible" while computing the
  whole graph is a defect, whichever default is chosen.
- **This contradicts `graph-tools.md` section 20.7**, which recommends that "the graph",
  unqualified, mean what is visible "for the resting summary and for an unscoped run alike". The
  two are reconciled by splitting them. The resting counts (section 6.5) describe the display and
  are cheap, so they show visible and loaded side by side and follow the filter live. A measure is
  a claim about entities, and its denominator must not move with a display filter; its default is
  the whole graph. Section 20.7 also assumed the element's runs compute over the visible graph,
  which the code does not do.
- **One-way door:** the default scope of an unscoped run is published element behaviour and
  decides what every stored result means. It is the owner's call; this is the evidence for it.

### 6.15 Which inputs must mark a result stale?

**Question.** Today a result is stale only when the node and edge membership of its scope changes.
Should edits to attribute columns and weights it read, the declared meaning of a weight, the
treatment of direction, and node merges also mark it stale? Can the element know what each
algorithm read?

**What graphty-element does today.** Staleness compares a digest of the scope's node and edge ids
(`graphty-element/src/session/runs/RunsApi.ts`, `staleOf`). "An attribute edit or a weight change
does NOT flag anything stale ... A betweenness run computed with the old weights looks current"
(`graphty-today.md`, section 7.1). Merging nodes does not exist as an operation.

**Evidence.**

- **A result depends on every value it read, not only on membership.** Sandve et al.: "For Every
  Result, Keep Track of How It Was Produced". Jupyter is the documented failure when this is not
  tracked: outputs go stale silently, and research tools exist only to detect which cells need
  re-running (`design-method.md`, section 3.5).
- **The element already knows the reads of its built-in algorithms.** Each algorithm that uses a
  weight declares it in its caveats with the attribute and its meaning (for example
  `weight: { attribute: "weight", meaning: "distance" }` in `graphty-element/src/algorithms/DijkstraAlgorithm.ts`,
  `meaning: "strength"` in `LouvainAlgorithm.ts`); every other built-in reads topology only. A run
  also records its direction treatment (`RunDirection`) and, for a multigraph, a note that
  parallel edges were merged with weights summed (`AlgorithmManager.ts`). A registered plugin
  algorithm can read any attribute, and nothing declares which.
- **Workflows that change inputs after measures have run:**

| Workflow | Edit after measures | Input it changes |
|---|---|---|
| Data Import and Validation | fix a mis-typed column ("type mismatches") after load | attribute values, possibly the weight |
| Hub Gene Identification and Ranking | switch weighted and unweighted; choose the STRING score or a correlation as weight | weight attribute, weight meaning |
| Drug Target Discovery | change the PPI confidence threshold | edge membership, and the weight when confidence is the weight |
| Enrichment Map | move the similarity cutoff | edge membership |
| Criminal Network Analysis | "resolve duplicates" and merge records from new sources as they arrive | node merges, attributes, edges |
| Knowledge Graph Construction | entity resolution; "Keeping the KG up-to-date as source data changes" | node merges, attributes |
| Condition Comparison | merge two networks, choose the identifier column | node identity, attributes |
| Gene List to Interaction Network | join a data table | attributes only (topology measures unaffected) |

  Only the last row changes nothing a topology measure read; every other row changes an input of
  a result that already exists, and none of these workflows would accept a weighted result that
  silently looks current after its weights changed.

**Answer.** A result is out of date when any input it read has changed: the membership of its
scope (today), the values of each attribute it read (the weight column, or a plugin's declared
columns), the declared meaning of a weight it used (section 6.6), the graph's declared
directedness when the run took direction "as loaded", and the identity of its elements (a merge
or a split). An edit to a column it did not read (a label, a joined expression column) must not
mark it stale.

**Recommendation.**

- **Every algorithm declares what it reads**: topology, and a list of attribute columns. Built-in
  algorithms already know theirs; the catalogue entry should publish it. A plugin that declares
  nothing is treated as reading every attribute, so it is flagged stale conservatively rather
  than never.
- **The snapshot keeps a revision counter per attribute column, plus one for topology and one for
  element identity (merges).** A run records the counters of what it read; staleness compares
  them. A per-column counter, rather than one content revision for the whole graph, is what keeps
  a label edit from marking betweenness stale.
- **The stale state says which input moved**: "the weight column changed since this ran", "2
  nodes were merged", beside today's "ran on 34 nodes, now 40".
- **The project file stores the counters** with the data and with each result, so a reopened
  file knows which results are current. This is a small, additive part of the file format, but
  it is format: settle it before the file ships.

### 6.16 Must history branch past data edits, or do linear undo and kept results suffice?

**Question.** Which workflows need to go back past a data edit (a merge, a deletion, a join, a
cleaning step) while keeping analysis done after it, as opposed to only keeping runs with
different parameters side by side? Is there usage evidence that analysts navigate branches of a
history created by data edits?

**Evidence.**

- **Usage logs: undone work is rarely revisited.** In Tableau, "undo was ~12.5 times more common
  than redo. Thus, most undone actions were never revisited", which the authors used to justify
  hiding undone states from their history view ("undo-as-delete"), while "preserving the
  capability for branching histories" for the rare case (Heer et al. 2008, sections 3.4.3 and
  4.3.1, and the conclusion). The same study logged a median of 350 actions per user, and its history-management rules
  culled 61.7 percent of history items as noise; a raw history is too long to be a working surface.
- **Analysts keep alternatives as side-by-side copies, not as branches.** Data scientists keep
  variants by copying and commenting out code and compare "by interchanging which versions are
  run" (Kery et al. 2017). Kumu and Gephi users rename or duplicate a column to keep an earlier
  result (section 6.13).
- **Tools that hold data edits keep them linear.** OpenRefine's history is the data edits and is
  linear: a new operation after undo erases the later steps. Power Query's applied steps are a
  linear recipe edited in place. Cytoscape keeps structural derivations as separate networks under
  the network they came from, and in-place edits as ten short-lived undo steps
  (`design-method.md`, section 3.5). VisTrails is the one branching model; no source read here
  reports how often its users navigate branches.
- **What the workflows need.** No workflow asks to return to a pre-edit state *and* keep analysis
  made after the edit. The workflows that make data edits want one of two things:
  - **Several working graphs side by side**, each derived from a common source: "Condition
    Comparison" ("Union, intersection, or difference as the working network?", "Which network is
    currently active and which it was derived from"), "Drug Target Discovery" (a disease module
    from a larger network), "Gene List to Interaction Network" (the largest component as the
    working network), "Enrichment Map" ("Whether to build a sub-map for one theme of interest").
    This is Cytoscape's derived network, an object, not a branch of history; "Condition
    Comparison" and "Reproducible Session" record it as network collections, deferred work.
  - **Recovery from a bad edit**: "Knowledge Graph Construction" ("Entity resolution errors
    propagate through the graph") and "Criminal Network Analysis" ("How to handle uncertain or
    conflicting information?"). Here the analyst undoes the merge and re-runs what depended on it;
    analysis made on the wrong merge is not wanted, it is wrong.
  Every other workflow keeps variants of *results* (section 6.13), not of data.

**Answer.** Linear undo, plus kept results stamped with the data revision they ran on, plus
derived graphs as objects of their own, covers recovery and replication in every workflow. No
workflow needs to navigate branches of data versions, and the one usage study found that even
undone states are rarely revisited.

**Recommendation.**

- **History is linear.** A new action after undo discards the undone steps, as in OpenRefine,
  Tableau and the history design graphty-element already has (`graphty-today.md`, section 7.11).
  Undo and redo need no visible place beyond their commands; a history list is optional.
- **The analysis tree is a list of kept outputs** (measures, sets, paths, notes, views), each
  stamped with the data revision it was made on (section 6.15). A result made before a data edit
  stays, marked out of date with the reason, and "re-run" makes it current.
- **Derived graphs are objects**, the way Cytoscape shows a subnetwork under its parent: a working
  subgraph, a union or an intersection has a name, a source and its own results. This is where the
  "go back and try the other way" need lives. **Section 6.33 corrects this**: a working subgraph
  made from one graph is a set used as scope and filter, never a graph; only a graph merged from
  two sources (a union or intersection of two conditions) is a graph, and the file's top level is
  a list of graphs.
- **The project file holds one current graph** (plus derived graphs when network collections
  arrive), not an operation log or a set of snapshots for navigation. This avoids the one-way door
  of storing several data versions. An operation log for *provenance* (what edits were made, for
  the methods paragraph) is still valuable and is text, not state.
- **This contradicts `design-method.md` section 3.5 and its finding 16**, which recommend a
  VisTrails-style tree whose nodes are complete graph states with results attached, and "undo
  walks the current branch; a new action after undo starts a branch". It agrees with the parts
  that matter for trust: one history for cleaning and analysis, and a result bound to the state it
  was computed on and never silently recomputed or overwritten. It disagrees on branching, for
  three reasons: no workflow needs it; the only usage evidence found says undone paths are rarely
  revisited; and branching forces the project file to hold several data versions. It also
  corrects this document's own earlier statements (sections 1.7, 4.3 and 7, now amended) that a
  branching result tree had been decided; `graphty-today.md` section 7.16 already notes that no
  design or code describes one.

### 6.17 How many kept objects does one project accumulate?

**Question.** Across the investigation and genomics workflows, how many kept objects (sets, paths,
measures, notes, views) does an analyst accumulate in one project: around ten, a hundred, or more?
This decides whether the left panel can be a flat list. Dan Brown's growth principle says a
structure must hold about ten times its current content (`design-method.md`, section 1).

**Evidence (estimated from what each workflow says it keeps; no survey of saved projects was
found).**

| Workflow | Measures | Sets and paths | Notes | Views | Rough total |
|---|---|---|---|---|---|
| Community Analysis | 2 to 4 partitions (algorithms and resolutions compared), betweenness | a few to 10 communities "worth deeper investigation", bridge nodes | a label or profile per kept community | 1 to 3 | 15 to 30 |
| Cluster and Functionally Annotate | 1 to 3 clusterings (inflation) | about 15 annotated clusters | a term label per cluster | 1 to 2 | 20 to 40 |
| Enrichment Map | 1 clustering | a handful to 20 named themes | theme names, the parameter record | 1 to 2 | 15 to 30 |
| Hub Gene Identification and Ranking | 5 to 6 centralities and a combined score | top 10 per method, their intersection, hub neighbourhoods | why methods disagree | 1 to 2 | 15 to 25 |
| Gene List to Interaction Network | 0 to 2 | the largest component, driver genes | few | 1 | 5 to 10 |
| Condition Comparison | 2 to 4 per condition, a difference score | A only, B only, both, the rewired genes | few | 2 | 12 to 20 |
| Drug Target Discovery | 3 or more centralities | the disease module, the ranked targets | an evidence profile per candidate (tens) | 1 to 2 | 20 to 50 |
| Fraud Ring Investigation (per alert) | 1 to 2 | the ring, related entities, paths to known fraud cases | "evidence chain for each finding" | 1 | 10 to 20 per alert; more if one project serves many alerts |
| Criminal Network Analysis | 3 centralities, communities | key players, cells | "entity relationships with evidence documentation" on nodes and edges | several briefings | 50 to a few hundred, dominated by notes |
| Threat Hunting | few | query results per hunt | "document negative hunt" | several | tens per hunt; the reusable query library grows across hunts (section 6.18) |

The capability records set their own ceilings in the same range: 50 saved filters, 20 bookmarks
per graph, 50 annotations per view (`design/designloom/capabilities/saved-filters.yaml`,
`view-bookmarks.yaml`, `annotation.yaml`). Tableau users produced a median of 350 history actions
(Heer et al. 2008), which is history, not kept objects, but shows the scale a raw log reaches.

**Answer.** A typical analysis project keeps 10 to 50 objects. Long investigations (criminal
network analysis, a fraud desk working one dataset over many alerts) reach a few hundred, and notes
are the kind that grows. Measures stay few (2 to 10). Applying the growth principle, the panel must
be designed for hundreds.

**Recommendation.**

- **Not one flat mixed list.** Group by kind (measures, sets and paths, notes, views), each group
  collapsible and sorted by most recent use, with a type-in filter at the top from the start;
  Brown's growth test fails a flat list at a few hundred.
- **Measures can share the panel as their own group**; there are few, they are read often, and
  they are what sets and layers come from. They should not be interleaved with sets.
- **Notes need their own list with search and a "by target" grouping**, since they are the kind
  that reaches hundreds; the note list also lives in each target's inspector (section 6.7).
- **Folders are not needed at first.** No workflow names a grouping of its kept objects other than
  by kind or by target; add user folders when a project routinely exceeds a few hundred objects.

### 6.18 Is a saved filter ever something other than a rule set?

**Question.** In the workflows, is a "saved filter" ever used differently from a rule-defined set,
or referenced by a note, a view or a comparison without being used as a set? If a filter is only a
rule set whose outcome is "hide", filtering needs no home of its own.

**Evidence.**

- **Inside one project, the tools treat a filter as a rule with an outcome.** Gephi's queries
  have two outcomes, Filter (hide) and Select (mark), for the same query; Kumu's filters,
  decorations and focus all use one selector language; Linkurious filters hide or grey
  (`graph-tools.md`, sections on Gephi, Kumu and Linkurious). A Cytoscape filter is a live rule,
  saved in the session and exportable (section 6.2).
- **Views reference filters**: the view bookmark stores "active filter configuration at time of
  bookmark" (`view-bookmarks.yaml`); a view holding a rule set with outcome "hide" is the same
  thing.
- **Combination is set algebra**: the saved-filters record asks for "Apply Filter A AND Filter B"
  (`saved-filters.yaml`), which is intersection of two rule sets.
- **The one different use is reuse across projects.** "Threat Hunting": "Successful queries saved
  for future hunts" and "Historical hunt results (what worked before?)", run against new data. The
  saved-filters record reflects this: it persists filters per user ("Persist saved filters in
  browser localStorage"), exports and imports them as JSON, and must "Validate imported filters
  against current graph schema; warn on incompatible attributes" (`saved-filters.yaml`). A query
  meant for next month's data is not a set in this project; it is a recipe the analyst owns.
- No workflow has a note or a comparison that references a filter without meaning its members.

**Answer.** Inside a project, a saved filter is a rule set whose outcome is "hide" (or "dim").
The only distinct use is a personal library of queries reused across projects and datasets.

**Recommendation.**

- **Filtering has no object kind of its own.** Applying a filter applies a rule; naming it keeps
  it as a rule set in the sets group (section 6.17), where it can also be used as a scope, a style
  selector or a note target. The live filter state (what is hidden now) is shown where visibility
  is controlled, as removable chips, and "Keep as set" turns it into a named rule set.
- **The cross-project query library is the reader's own**, persisted by the app like any other
  preference, which the architectural principles allow. graphty-element supplies what makes it
  work for every consumer: a serialisable rule definition and a validation of a definition against
  a graph's attributes that reports what does not bind (the element already reports unbound paths
  for style templates).

### 6.19 If notes store their own members, do rule sets need stored members?

**Question.** Section 6.7 has every note store the members it was written about. Does any workflow
still need a rule set to store the members it last evaluated to, or can a rule set store only its
definition? A rule set can hold hundreds of thousands of members.

**Evidence.** Section 6.2 gave three reasons to store a rule set's members: reopening without
recomputing, letting a note say what the set was when written, and reporting what changed.

- **The note reason is now covered by the note itself** (section 6.7).
- **Reopening is deterministic.** A rule over attributes of stored data evaluates to the same
  members when the file reopens, because the data is in the file. A rule that reads a result
  (such as "community = 3") reads the stored values of that result (section 6.11), so it too
  evaluates identically. Nothing is recomputed that could drift.
- **"What changed" needs the old members only across a data edit**, and within a session the
  element holds them in memory (and in the undo step). Across sessions, a stored member count and a
  membership digest are enough to say *that* the set changed and by how many; *which* members
  changed would need the old list.
- **Where stored members are genuinely needed**: a set frozen because its rule can no longer be
  evaluated (section 6.2, "frozen"), and a run whose scope was a rule set, whose own values are
  already keyed by the elements it measured (`graphty-today.md`, section 7.1). No workflow asks,
  after reopening, "which members did this rule set have last month"; "Threat Hunting" compares
  a hunt's results over time by re-running and noting, and "Anomaly Detection" asks whether an
  entity "just changed or was it always anomalous", which is a question about the entity's values
  over time, not about a stored member list.
- **Cost:** at 4 bytes per member, a rule set over a million-node graph costs about 4 MB per set;
  ten such sets double a typical file.

**Answer.** No workflow needs a rule set's last-evaluated member list once notes store their own
members and results store their values.

**Recommendation.** A rule set stores its definition, its member count, a membership digest and
the data revision it was evaluated on. It stores its members only when frozen. A fixed set stores
its members, as before. The count and digest let a reopened file say "this set now has 14 members,
it had 12", and a note written about it still lists the 12. **This narrows section 6.2**, which
stored both for every set.

### 6.20 Whole-graph measures: properties of the graph, or runs to compare?

**Question.** How often do workflows re-read or cite whole-graph measures (clustering coefficient,
diameter, average path length, assortativity) after computing them, and are they read as
properties of the graph or compared as runs?

**Evidence (the workflows).**

| Workflow | How the whole-graph measure is used |
|---|---|
| First Exploration - Quick Data Assessment | read once, as a property ("connectivity status", "degree distribution shape") |
| Condition Comparison | "Node and edge counts, density, component count and community count for each network and for the merged one": compared across graphs |
| Network Evolution Analysis | "Time-series of key network metrics": compared across time windows |
| Anomaly Detection | "Baseline metrics (mean, std dev of key measures)": re-read as the reference for every anomaly |
| Community Analysis | modularity "> 0.3?": a property of one partition, read with that result |
| Reproducible Session and Network Publication | cited in the methods paragraph |
| Hub Gene Identification and Ranking | clustering coefficient used *per node* as a ranking, which is a node measure, not a graph property |

No workflow compares two runs of the same whole-graph measure with different parameters. The
comparisons are always across scopes: two conditions, two time windows, the merged against each
half, a set against its parent (section 6.1).

**Answer.** Whole-graph measures are re-read as reference values and cited, and are compared
across graphs, subgraphs and time windows, never across parameter variants. They are properties
of the graph or set they describe.

**Recommendation.**

- **Their single home is a row in the inspector of the graph or set they describe**, beside the
  resting counts: "Average clustering coefficient 0.31 (i)". The (i) popover carries the
  provenance: exact or sampled with the sample size, "largest component only", the data revision,
  the engine, and "Recompute". Before it is computed, the row shows "Compute (about 4 s)".
- **They are not rows of the result list.** Recomputing (for example, exactly instead of
  sampled) revises the property in place, the same-measure rule of section 6.13.
- **Comparison is by scope**: the set inspector's "Compared with the graph" section (section 6.1)
  and a two-scope comparison table, not a comparison of runs.
- **Modularity stays with its partition**, because it describes a result, not the graph.
- **This refines section 6.5**, which placed the costly graph measures as rows in the analysis
  tree. Their value is still stored with provenance and can still be stale; only their home
  changes.

### 6.21 Should a note carry structured judgment?

**Question.** Should a note carry structured fields, such as a status (hypothesis, supported,
refuted) or a confidence, or only free text plus targets? Is there evidence from sensemaking and
provenance work, or from Kumu and Linkurious, of structured status being used? Structured fields
are project-file schema; free text can be extended later.

**Evidence.**

- **The workflows do record judgments, but each domain has its own vocabulary, and each judgment
  is about the target, not about the note.** "Iterative Analysis Cycle": "Is my hypothesis
  confirmed, refuted, or inconclusive?" and "Documented findings with confidence levels and
  limitations". "Fraud Ring Investigation": "Confirm fraud, clear alert, or escalate". "Anomaly
  Detection": "Label as error, threat, or genuine discovery". "Threat Hunting": "Confidence scores
  for matches". "Hub Investigation": "Hub classification ... anomaly flag if warranted".
- **Linkurious puts the status on the thing judged.** An alert case (defined as "a subgraph built
  from all occurrences relating to an entity") has a status, In progress, Confirmed or Dismissed;
  changing it prompts for "an optional note, to document the decision for future reference", and
  comments are free text with mentions (Linkurious user manual, alerts). Kumu's notes are a
  free-text description field and threaded comments (`graph-tools.md`, Kumu).
- **The structured analytic technique keeps hypotheses separate from notes.** Heuer's Analysis of
  Competing Hypotheses lists hypotheses, lists evidence, and builds "a matrix with hypotheses
  across the top and evidence down the side", judging the "diagnosticity" of each item; a
  hypothesis is its own item and support is a relation between evidence and a hypothesis
  (Heuer, *Psychology of Intelligence Analysis*, chapter 8). Structuring judgment means a matrix of
  two object kinds, not a status field on a note.
- **Annotation standards structure the purpose, not the verdict.** The W3C model's motivations
  (assessing, classifying, commenting, questioning, tagging and others; section 6.7) say what an
  annotation is for.

**Answer.** Structured status is used, but on the object being judged (a case, an entity, a set),
in a vocabulary specific to the domain. No source read here puts a status or confidence field on
a free note, and the one structured technique for hypotheses (ACH) needs two object kinds and a
matrix, which no workflow asks graphty to provide.

**Recommendation.**

- **A note is free text, its targets, its author, its time and the data revision** (section 6.7).
  No status or confidence field now, and no "finding" object kind.
- **A judgment about an element or a set is data on that element or set**: a classification
  attribute the analyst adds ("determination = confirmed"), which the element already stores,
  filters, and paints through a style layer, and which takes any domain's vocabulary. A note
  explains the judgment; the attribute records it where it can be counted and shown.
- **Keep the door open cheaply:** the project-file format should require readers to preserve
  optional fields they do not understand. Then a later structured field (a W3C-style purpose, or a
  status) is an addition, not a breaking change, and the one-way part of this decision is only
  that tolerance rule.

### 6.22 What does a run do by default on a graph with mixed directedness?

**Question.** For a graph whose directedness is "mixed" (some edges directed, some not), how do
graphology and other tools handle algorithms that assume one kind of edge: in and out degree,
strongly connected components, reciprocity, HITS, shortest paths?

**What graphty-element does today.** `GraphStatistics.directedness` can be `"mixed"` because a
format can report it, but "the element does not produce it today, because a snapshot carries one
flag for the whole graph" (`graphty-element/src/session/types.ts`). A run records direction as
`"directed"`, `"undirected"` or `"as-loaded"`.

**Evidence.**

- **graphology supports mixed graphs and names both readings.** Its neighbour methods come in
  pairs: `outNeighbors` and `inNeighbors` follow directed edges only, while `outboundNeighbors`
  and `inboundNeighbors` follow directed edges plus undirected ones in both directions (the
  descriptor table in graphology's `iteration/neighbors.js`). Its algorithms default to the
  second reading: unweighted shortest paths call `outboundNeighbors`, and the neighbourhood index
  behind PageRank defaults to `method = method || 'outbound'`, sizing it as "directedSize +
  undirectedSize * 2", so each undirected edge counts as two opposite arcs (graphology source,
  `shortest-path/unweighted.js`, `indices/neighborhood.js`). Louvain refuses a truly mixed graph:
  it "won't work with mixed graph as it is not trivial to adapt modularity to this case", and
  tells the user to cast the graph to directed or undirected first (graphology Louvain
  documentation).
- **NetworkX and igraph have no mixed graphs**; a graph is directed or not, and conversion makes
  the reading explicit. NetworkX `to_directed` replaces each undirected edge with "two directed
  edges (u, v, data) and (v, u, data)". igraph offers `mutual` ("Two directed edges are created for
  each undirected edge, one in each direction"), `arbitrary`, `random` and `acyclic`, and back to
  undirected by `collapse`, `each` or `mutual` (igraph R reference, `as_directed`).
- **graphology's operators use the same default**: `toDirected` means "any undirected edge will be
  now considered as mutual".

**Answer.** The shared convention is that an undirected edge in a mixed graph is a mutual pair of
arcs for direction-aware algorithms, and community detection either refuses or requires an
explicit cast.

**Recommendation.** For a mixed graph, each run's default direction treatment and its caveat:

| Algorithm | Default on a mixed graph | Caveat the run states |
|---|---|---|
| Shortest paths, BFS, reachability | undirected edges traversable both ways | "N undirected edges were followed in both directions" |
| In- and out-degree | report directed in, directed out and undirected degree separately; total degree counts each edge once | the three counts, so no edge is double-counted silently |
| Strongly connected components | undirected edge as a mutual pair (it joins its endpoints) | the count of undirected edges treated as mutual |
| Reciprocity | computed over directed edges only | "undirected edges are excluded; counting them as mutual would make reciprocity 1 for them by construction" |
| HITS, PageRank | undirected edge as a mutual pair | as for components |
| Community detection | run as undirected | "direction was ignored" |

Each default is overridable per run (section 6.6). The element must first represent per-edge
direction for "mixed" to exist; until it does, a file that declares mixed edges should load with
a caveat saying which single direction was applied.

### 6.23 Does the plain-language reading help, or does its interpretation mislead?

**Question.** graphty-element publishes a one-sentence reading of each result, such as "X has the
highest bridging, at 0.4" (`graphty-element/src/session/results/reading.ts`). Does that help an
intermediate analyst understand the measure correctly, or does its interpretation mislead? Is
there evidence for readings that use only the technical term, with interpretation moved to the
(i) note?

**What the element publishes.** The sentence restates published numbers only; the file's header
explains that "a reading is a claim about the reader's data". The interpretation enters through
the field's plain name: betweenness is "Bridging", PageRank "influence", closeness "reach"
(`graphty-element/src/catalog/algorithms.ts`; `graphty-today.md`, section 7.10). With
`{ audience: "technical" }` the same sentence uses the technical name. The graphty app goes further
with its own headlines such as "Main bridge" and "Most influential" (`graphty-today.md`, section
7.10).

**Evidence.**

- **The words around a chart change what readers conclude from it.** Kong, Liu and Karahalios
  (CHI 2018) found that "the slant of the title influenced the perceived main message of
  visualizations, with viewers deriving opposing messages from identical visualizations", and
  warn of "subtle statistics in viewers' unwarranted conviction of neutrality" (abstract). A
  reading sentence sits exactly where a title does.
- **The interpretive names assume a model of flow that often does not hold.** Bringmann et al.
  (2019) examined degree, betweenness and closeness and found that their core assumptions, "such
  as information flowing via shortest paths", may not match how the variables actually relate,
  that betweenness and closeness "appear particularly problematic as importance indicators", and
  that researchers "must explicitly articulate what 'central' signifies" (abstract, as indexed by
  OpenAlex).
- **"Influence" names a claim that measurement contradicts.** Kitsak et al. (2010) found that the
  most efficient spreaders are not necessarily the best-connected nodes but those in the network
  core identified by k-shell decomposition (abstract). Calling PageRank "influence" states as fact
  what spreading studies dispute.
- **"Bridging" collides with a different published measure.** "Bridge centrality" is a separate
  measure for nodes that connect communities (Jones, Ma and McNally, *Multivariate Behavioral
  Research*, 2019), and section 3.2 of this document already reserves "bridge" for the cut edge.
  A reader who looks up "bridging" finds a different computation.
- **The number alone does not carry a scale.** "at 0.4" does not say whether betweenness was
  normalised or what the next value is, so the sentence invites a reading the number cannot
  support.
- **Analysts do want explanation.** "Hub Gene Identification and Ranking" lists as a pain point
  "Names like 'eigenvector centrality' with no plain-language reading". The need is to know what
  the measure computes, not to be told what it means for the data.
- No study was found that compares technical-term readings with interpretive ones directly.

**Answer.** The sentence's numbers help; its interpretive nouns mislead in three documented ways:
they present a modelling assumption as a finding, one of them contradicts published measurements,
and one collides with a different measure's name. The workflows' request is for a plain
explanation of *what is computed*, which a definition answers without an interpretation.

**Recommendation.**

- **The published reading uses the technical term and gives the number its scale**, for example "X has the
  highest betweenness centrality, 0.40 (normalised), 3.2 times the median; 12 of 34 nodes are
  0." That is the element's `technical` audience made the default, plus rank context.
- **The (i) note carries a plain operational definition and the assumption, in conditional
  form**: "Betweenness counts how many shortest paths between other nodes pass through this node.
  If things travel along shortest paths in this network, a high value means control over that
  flow." Interpretation is offered as a condition the analyst checks, never as the result.
- **Plain names ("Bridging", "Influence", "Reach") are removed from the result's field names**,
  or kept only as search synonyms that lead to the technical name. The owner's rule already says
  "Never substitute 'broker', 'influencer' or 'connector' for a measure" (section 3.4); the
  element's own plain names break that rule.
- The app's "Main bridge" and "Most influential" headlines should be deleted with the element's
  change, since they are app copy duplicating an element capability.

### 6.24 Does 3D with automatic rotation help analysis on a desktop monitor?

**Question.** Is there graph-specific evidence that 3D with automatic rotation helps analysis on a
flat desktop monitor, compared with 2D, for reading sizes, colours and labels? graphty-element
publishes 3D as its default view mode (`graphty-element/src/config/ViewMode.ts`,
`DEFAULT_VIEW_MODE = "3d"`); it does not rotate the scene automatically (no auto-rotation exists
in its camera controllers).

**Evidence.**

- **Rotation helps path tracing on a flat display.** Sollenberger and Milgram (1993), on a 3D
  path-tracing task resembling cerebral angiograms: "performance improved using either technique
  relative to viewing two-dimensional (2D) displays. However, rotational displays were superior to
  stereoscopic displays, and performance was best when both techniques were combined";
  continuously rotating displays did as well as user-controlled rotation, and "Performance
  declined at faster rotation rates" (abstract). Ware and Franck (1996) found the same for
  abstract graphs: motion cues, including automatic rotation, increased the size of graph that
  could be understood (section 6.9). Ware and Mitchell (2005), on a very high resolution display:
  "with both motion and depth cues, unskilled observers could see paths between nodes in 333 node
  graphs" at under 10 percent error (abstract).
- **The benefit is for seeing connectivity, and it is measured with stereo or motion on
  specialised displays.** Greffard et al. (2014) found no accuracy advantage of monoscopic 3D over
  2D for community detection, with 2D fastest (section 6.9).
- **Reading values and labels is what 3D damages.** Munzner: perspective distortion "interferes
  with all size channel encodings", occlusion hides information, and text is "far worse when
  tilted from image plane" (section 6.9). Continuous rotation adds to this: sizes and label
  positions change every frame, so reading a value or clicking a node means stopping the motion
  first.
- No study was found that measures reading of size, colour or labels under automatic rotation, or
  that tests automatic rotation for any graph task other than path tracing.

**Answer.** Automatic rotation is a real aid for one task, tracing connections in a dense 3D
layout, and the evidence for it comes from path tracing only. For the tasks the intermediate
analyst does most (reading measures through size and colour, reading labels, selecting nodes,
finding clusters) no evidence favours 3D on a flat monitor, and the perceptual rules predict it
hurts, more so while the scene moves.

**Recommendation.** Unchanged from section 6.9: analysis opens in 2D with a layout computed in
2D. Automatic rotation, if added, belongs to 3D as a temporary aid for tracing connections, off by
default and stopped by any pointer or keyboard input. Changing the element's published default
from 3D is the owner's call; the app choosing 2D through the element's configuration is consuming
the element and needs no element change.

### 6.25 What does a reader do to a measure as a whole, and where do tools list measures?

**Question.** Besides painting with a measure (PageRank, betweenness) and comparing it with
another, which verbs do the workflows apply to the measure as a whole: select it, rename it, note
it, hide it, delete it, scope another run to it? Where do Gephi, Cytoscape and Kumu list the
measures a user has computed, and how does a user read a measure's parameters afterwards? The
answer decides whether a measure is a definition applied from property rows (like a Figma style
or variable) or a row of its own in the left panel, and whether a measure identity above `RunId`
must be published.

**Evidence (the workflows, by verb).**

| Verb on the whole measure | Workflows that ask for it, in their words |
|---|---|
| paint with it | nearly every analysis workflow ("Encode size or color by the combined score", Hub Gene Identification and Ranking) |
| compare it with another | Hub Gene Identification and Ranking ("Do the hubs agree across methods"); Community Analysis ("stable across different algorithms/parameters"); Condition Comparison ("Per-node metric values in each condition and their difference"); Iterative Analysis Cycle ("comparison to null models/baselines") |
| combine it with others into a score | Hub Gene Identification and Ranking ("Build a custom score"); Influencer Identification ("How to weight different centrality measures?"); Drug Target Discovery ("How to weight different prioritization criteria"); Condition Comparison ("build a custom score for the difference") |
| cut it into a set (threshold or top N) | Hub Gene Identification and Ranking ("Top 10, top 5 percent, or a score threshold?"); Hub Investigation ("What degree threshold defines a hub?"); Anomaly Detection ("How many standard deviations makes something anomalous?"); Influencer Identification ("minimum audience size threshold"); Drug Target Discovery (candidate selection) |
| read its distribution | Hub Gene Identification and Ranking ("Read the distributions"); First Exploration ("Degree distribution shape"); Anomaly Detection ("Baseline metrics (mean, std dev of key measures)") |
| rank a table by it, export it as a column | Hub Gene Identification and Ranking ("export the ranked table with every metric as a column"); Drug Target Discovery; Influencer Identification; Anomaly Detection; Reproducible Session ("node and edge tables with all computed columns") |
| cite its parameters | Hub Gene Identification and Ranking ("Weight attribute, direction and parameters for each run recorded"); Cluster and Functionally Annotate ("Clustering method and parameters recorded in analysis history and exportable"); Enrichment Map; Reproducible Session |
| note it (a limitation, a disagreement, a negative result) | Iterative Analysis Cycle ("limitations"); Hub Gene Identification and Ranking ("what to do when they do not" agree); Threat Hunting ("documented negative hunt", about a query); Reproducible Session (the methods paragraph) |
| tune it (re-run with a new parameter) | Cluster and Functionally Annotate; Enrichment Map; Anomaly Detection; Gene List to Interaction Network (section 6.13) |
| delete it | Reproducible Session only ("delete dead ends") |
| rename it | none. Reproducible Session renames networks and styles, not measures. Hub Gene Identification and Ranking needs a weighted and an unweighted run told apart, which a label naming the differing parameter already does |
| hide it | none. What a reader hides is the paint, which is a style layer's enable switch |
| scope another run to it | never to the continuous values; always to a set cut from it or to its groups: Community Analysis ("internal hubs" per community); the community-profiling capability ("top-3 nodes by internal degree within each community"); Drug Target Discovery (rank within the disease module) |
| select it as an object | never asked for as such; it is implied as the operand of compare, note and cite |

**Evidence (the tools).**

- **Gephi.** The measure is a column. Its display title is fixed by the statistic ("Betweenness
  Centrality", "Modularity Class") and a second run writes the same column (`GraphDistance.java`,
  `Modularity.java`). The list of computed measures is therefore the column list of the Data
  Laboratory. Parameters are readable only in the statistic's HTML report, which prints them for
  the latest run: Modularity prints "Parameters:" with "Randomize", "Use edge weights" and
  "Resolution"; Graph Distance prints "Network Interpretation: directed" or "undirected". The
  column header carries no parameter.
- **Cytoscape.** NetworkAnalyzer opens a "Set Parameters" dialog before each run ("where you can
  specify if the network should be analyzed as a directed graph"), shows results in a Results
  Panel with tabs per measure, and adds columns to the Node Table; the manual does not say that
  the parameters are shown again afterwards. clusterMaker2 lets the user type the column name per
  run: "Changing this values allows multiple clustering runs using the same algorithm to record
  multiple clustering assignments". The name the user typed is the only record of which run is
  which.
- **Kumu.** "all metrics are saved to a field with the name of the metric", "Each time you run
  the metric the previous values are overwritten", and the documented way to keep a run is to
  "rename the field". The metrics page describes no list of computed metrics and no parameter
  record; the field list is the list.
- **The column name is a stable identity across re-runs in all three**, and every appearance
  rule, decoration or filter that names the column follows the new values. That is exactly the
  "identity above the run" that section 6.13 proposes, and the tools' one failure is the one 6.13
  fixes: the old values are lost unless the user renames first.

**Answer.** A measure is used in two ways. As a **source**, its values feed style layers, rule
conditions, table columns, scores and cut sets; this is where a picker from a property row is the
right shape. As a **record**, it has content of its own that no property row can host: its
distribution, parameters, caveats, notes, its comparison with another measure and its history of
tuning. No workflow hides or renames a measure on its own, and only one deletes one. The tools
list measures only as columns and keep parameters, when at all, in a report about the latest run.

**Recommendation.**

- **Both homes, as Figma does for variables** (a list of their own, and a picker from any property
  row; `figma.md` section 2.5). A measure is a row in the left panel's measures group (section
  6.17) with an inspector for the record, and it is a choice in the pickers of layer bindings,
  rule conditions and table columns. It is not interleaved with kept sets.
- **Publish the measure identity above `RunId`**, as section 6.13 recommends. Seven of the verbs
  above (paint, cut into a set by a rule, table column, export column, note, cite, compare with
  previous) must keep pointing at the same measure through a tuning re-run, and the tools'
  stable column name is the precedent.
- **Verbs on the measure row:** inspect, compare, combine, keep top N or threshold as a set, show
  in table, note, re-run with new parameters, keep as a separate measure, delete. Delete reports
  its dependents first (layers, rule sets, notes), as `runs.remove` already counts layers. Hide
  and rename are not verbs of the measure: hide is the layer's switch, and the name is generated
  from the parameter that differs, editable but never required.
- **"Scope another run to it" is always through a set or a group**, so it needs no scope kind
  that takes a measure; section 6.26 adds "within each group" for partitions.

### 6.26 Must one community be addressable before it is kept?

**Question.** Do the group-level tasks and the community workflows need to inspect one community
before it is kept (size, internal density, conductance, top node, bordering communities), scope a
run to it, or write a note on it? If they do, one group of a partition (the run plus the group
value) must be addressable, or every community-level action forces a Keep first.

**Evidence.**

- **Inspection precedes choosing.** Community Analysis: "Characterization - For each community:
  size, density, common attributes, internal hubs", then the decision "Which communities warrant
  deeper investigation?". The community-profiling capability, which that workflow requires, asks
  for a "community summary card with: size, density, top attributes, internal hubs", "top-3
  nodes by internal degree within each community", "bridge nodes as those with >30% of edges
  connecting to other communities", an "inter-community edge counts ... matrix" and profiles
  "sortable by size, density, or external connectivity". Fraud Ring Investigation asks "is entity
  in a suspicious cluster?" about the one community the flagged entity sits in. Saket et al.'s
  group-node, group-link and group-network tasks (section 1.2) are all about individual groups
  compared with each other.
- **Naming and noting happen to many groups, not one.** Cluster and Functionally Annotate
  annotates about 15 clusters ("Label clusters by term, by top hub gene, or by manual name?"),
  and lists "Re-running enrichment per cluster by hand for 15 clusters" and "Copying members out
  of a cluster one node at a time" as pain points. Enrichment Map: "auto-label each cluster ...
  rename by hand, collapse clusters". Community Analysis: "Hard to label/name communities
  meaningfully".
- **Runs over a group are per group.** "Top-3 nodes by internal degree within each community" is
  a measure computed within every group at once. Cluster and Functionally Annotate: "optionally
  lay out each cluster as its own subnetwork". Gephi issue 636 wanted weighted degree within each
  of 234 modularity classes (section 6.14). No workflow runs a measure within one hand-picked
  community.
- **Kumu names communities inside the result**: "we provide an easy way to override the community
  name and replace it with a descriptive one", and saving writes "the best match for each element
  to the 'Community' field", so the name is the value, with no separate object per community.
- **graphty-element today** addresses a group only by writing an expression
  (``results.<runId>.group == `3` ``), and `RunResult` has no accessor for one group's members
  (`graphty-today.md`, section 7.4).

**Answer.** Yes. Every workflow that uses communities inspects many of them before keeping a few,
names or notes about 15 of them, and runs measures within every group at once. If each of these
required a Keep, Cluster and Functionally Annotate would put 15 kept sets per clustering into the
left panel just to write 15 labels.

**Recommendation.**

- **A group is addressable without Keep**, by the address "partition result plus group value"
  (the measure id of section 6.13 plus the value). That address is a selection target, a table
  row, a note target, a style-selector arm and an inspector: the set inspector of section 6.1
  applied to the group, including the Boundary section (conductance, bordering groups). It is
  not a row of the left panel (section 6.8 stands).
- **Group labels belong to the partition result**: one label per group value, shown in the
  legend, the group table and the inspector, as in Kumu. Labelling does not create a set.
- **A note on a group stores the group's members** (section 6.7), so it survives a re-run without
  a Keep.
- **Keep remains the step for what must outlive the partition**: a set operand, a scope reused
  across runs, a membership to cite.
- **"Within each group" is a scope kind** (section 6.14 foresaw it): one run, values computed
  inside every group, recorded as such ("Degree within each group of Louvain 1").
- **Element work:** a group accessor on the result (members, counts, induced and cut edges), the
  group address in the selector, note and selection grammars, and a labels map on the result.
  The address and the labels field are published format: a one-way door.

### 6.27 How many style layers does an analysis project accumulate?

**Question.** Counted per workflow, as measures, sets, notes and views were counted in section
6.17, how many style layers (encodings, highlights, per-element overrides, user layers) does a
typical project hold? The count decides whether the style stack fits a section of the resting
inspector (where `figma.md` section 5 places it) or needs a place of its own.

**Evidence (estimated from what each workflow says it paints; the element's two locked default
layers are not counted).**

| Workflow | Layers the workflow describes | Count |
|---|---|---|
| Gene List to Interaction Network | colour by logFC (diverging), size by a second column, label by display name, "thicker borders for a few genes of interest", and the same style rebuilt "for the down-regulated list" | 4 to 5 |
| Enrichment Map | size by gene-set size, colour by direction or FDR, edge width by overlap, searched-gene highlight, theme labels | 4 to 5 |
| Hub Gene Identification and Ranking | combined-score size or colour, top-10 labels, hub highlight; 5 or 6 measure runs, each of which auto-paints on first completion today | 3 to 4 by intent; 8 to 10 if every run paints |
| Community Analysis | partition colour, betweenness size for bridge nodes, one community highlighted; a second partition when comparing | 3 to 5 |
| Cluster and Functionally Annotate | cluster colour, cluster labels, optional term pie charts | 2 to 3 |
| Condition Comparison | edge colour by "in A only / in B only / both", per-condition logFC, rewired-score size | 3 to 4 |
| Fraud Ring Investigation | neighbourhood highlight, community colour, risk-score colour or size, paths to known fraud cases | 3 to 5 |
| Criminal Network Analysis | a centrality size, community colour, key-player highlight, edge type colour | 4 to 5 |
| Path Investigation | the path, alternative paths, context | 1 to 3 |
| Findings Communication | key-finding highlight, dimming of the rest, labels on the few named nodes | 3 |
| Supply Chain Risk Assessment | tier colour, betweenness size, removal-impact highlight | 3 |
| Knowledge Graph Construction | node type colour, edge type colour or line style, duplicate-candidate highlight | 2 to 3 |
| Anomaly Detection, Hub Investigation, Influencer Identification, Threat Hunting | a score encoding, a threshold highlight, a classification or type colour | 2 to 4 |
| First Exploration, Data Import, First-Time User Onboarding | none to one | 0 to 1 |

- **What bounds the count is the channels read at once**, not the length of the investigation.
  Every layer above writes one or two of colour, size, shape, label, edge colour and edge width,
  and no workflow describes more than about five data encodings in one picture. Unlike notes
  (section 6.17), layers do not accumulate per alert or per finding; an old encoding is replaced
  or switched off.
- **Three things inflate the count, and each is a design choice, not a need.** Tuning that adds a
  layer per re-run (section 6.13 stops it). Auto-painting every run in a multi-measure workflow
  (Hub Gene Identification and Ranking: 8 to 10 layers of which the reader reads 3). Per-element
  overrides stored as one layer per element (Gene List's "few genes of interest").
- **Two workflows need several highlights at once**, which graphty-element's exclusive
  `highlight()` forbids (`graphty-today.md`, section 1.8): Path Investigation compares
  alternative paths, and Hub Gene Identification and Ranking shows which hubs are in the top 10 of
  more than one method.

**Answer.** A typical project holds 3 to 6 style layers besides the two locked defaults, with
about 10 at the worst, and the count does not grow with the size of the investigation. Brown's
growth test (ten times the typical content) gives 30 to 60, which is reached only through the
three inflations above.

**Recommendation.**

- **The resting inspector can hold the stack**, provided the element keeps the count bounded:
  tuning revises the measure's layer (section 6.13); a run in a batch of several measures does
  not auto-paint a channel another run already paints (6.13's "Paint instead / Paint as well");
  per-element overrides of one channel are one layer holding a list of elements, not a layer per
  element.
- **The section shows every row up to about eight and then a "show all" door** to the same list
  in a panel of its own, so the growth case has a place without making it the default. This is a
  two-way door.
- **Highlights of different results may coexist**; exclusivity should apply within one result
  (a second route of the same path search replaces the first), not across results. That is an
  element change.

### 6.28 What happens to named communities when clustering is re-run?

**Question.** After an analyst has named and annotated about 15 communities and re-runs
clustering with a new resolution (Cluster and Functionally Annotate; Community Analysis), what do
the workflows expect for the names and colours? Does any tool carry names across re-runs, and what
does it show on a split or a merge? The answer decides whether Keep stores a fixed member list with
its origin or a rule that follows re-runs, and whether a re-run of a partition should default to a
new result beside the old one.

**Evidence.**

- **The workflows tune before they name.** Cluster and Functionally Annotate runs "Cluster (2
  min)", then "Inspect clusters (5 min)", then "Annotate each cluster (10 min)"; its granularity
  decision ("Which clustering method and granularity ... gives clusters that match known
  complexes?") belongs to the first phase. No workflow describes re-running after naming and
  expecting the names to follow.
- **When a partition is re-run after it has been read, the workflows want the difference.**
  Community Analysis: "Are communities stable across different algorithms/parameters?". Condition
  Comparison: "Community assignments in each condition and which communities split or merged".
  Network Evolution Analysis: "Community evolution mapping (which communities merged/split?)".
- **Kumu is the only tool that keeps communities across re-runs, by seeding**: "When you rerun
  community detection, we'll use the existing communities to seed the algorithm by default. This
  keeps the communities more stable", unless the user chooses to "throw away the current
  communities". Because renamed communities are stored as the Community field's values, seeding
  plausibly carries the names; the documentation says nothing about what a split or a merge does
  to a name. Gephi numbers communities arbitrarily, and clusterMaker2 writes each run to its own
  column (section 6.25; `graph-tools.md`, section 20.3).
- **Matching communities across partitions is a research method with explicit events.** Greene,
  Doyle and Cunningham track communities through a series of "significant evolutionary events"
  with "a community-matching strategy"; Palla, Barabasi and Vicsek track groups over time and find
  that larger groups persist when their membership changes while small ones persist when it does
  not. Rosvall and Bergstrom draw "the significant structural changes with alluvial diagrams".
  None of these carries a user's name automatically; each reports continuation, split, merge,
  birth and death as findings.
- **`graph-tools.md` section 20.17** concludes that the element must never promise that a new
  community IS an old one, and that a report of how a kept set's members are distributed across
  the new partition is a legitimate query.

**Answer.** The workflows expect names to stay with the partition they were written on, and they
expect a re-run after naming to be read as a comparison: which named communities continued,
split or merged. No tool documents carrying names through a split or merge; Kumu avoids the
question by seeding.

**Recommendation.**

- **Keep stores a fixed member list with its origin** (confirming section 6.2). A rule that
  follows re-runs ("group == 3 of the current run") would point at a different community after a
  renumbering, silently.
- **A partition that carries labels, group notes or kept groups is not revised in place by a
  parameter edit**: the edit creates a new partition beside the old one, and the old keeps its
  labels and colours. This refines section 6.13, whose revision default still holds for a
  partition nobody has labelled, and it resolves the disagreement with `graph-tools.md` section
  20.2 (which adds every re-run beside the old): revise while tuning, add beside once the result
  carries the reader's work.
- **The element offers a carry-over table, never an automatic carry-over.** For each labelled
  group of the old partition it lists the new groups holding its members, with shares, and
  classifies the row as continues, split, merged or dissolved; the reader copies labels from the
  rows they accept. This is a query over two stored partitions (the alluvial reading), consistent
  with `graph-tools.md` section 20.17.
- **"Start from the previous communities"** (Leiden's initial membership, igraph's precedent) is
  the way to make a re-run land close to the named partition; it is an addition, not a contract
  change.
- **One-way door:** Keep's stored form (members plus origin) and the labels map on a partition
  are project-file format.

### 6.29 Should a rule that reads a result follow the measure or stay bound to its run?

**Question.** Does any workflow need a rule that reads a result (for example "PageRank above
0.01") to follow the measure's current run after a parameter edit, or to stay bound to the run it
was written against? This decides whether stored rules and selectors reference a measure id or a
`RunId`, which is a one-way door in rule serialisation.

**Evidence.**

- **Follow the current run (tuning).** Anomaly Detection's anomalies are "a threshold rule" on a
  score, and the workflow asks "Should I adjust the baseline definition?": the anomaly set must
  follow the revised score. Drug Target Discovery changes "the PPI confidence threshold", after
  which the ranked target list must be ranked by the new centralities. Hub Investigation's "degree
  threshold defines a hub" is re-read after data corrections. Threat Hunting reuses "Successful
  queries ... for future hunts", which by definition read whatever the current data and results
  say.
- **Stay bound (comparing).** Hub Gene Identification and Ranking keeps a top 10 per method and
  intersects them; the weighted and unweighted runs are compared, not replaced. In every such case
  the two variants are two measures, created by "Keep as a separate measure" (section 6.13), so a
  rule written against each already names a different measure.
- **No workflow asks for a rule that stays on an old run of the same measure** while that measure
  moves on. The need to remember "what the set was before the revision" is met by the stored
  members of any note written about it (section 6.7) and by Freeze (section 6.2).
- **The tools bind by column name**, which is the measure, not the run (section 6.25).

**Answer.** Rules follow the measure. Every "stay bound" case in the workflows is a comparison
between two measures, which the separate-measure verb already models.

**Recommendation.**

- **Stored rules and style selectors reference the measure id**
  (``results.<measureId>.pagerank > `0.01` `` in place of today's `results.<runId>.<field>`).
  After a revision a rule set re-evaluates at once when that is cheap, since reading stored values
  is linear (section 6.2), and records the run it was last evaluated against so it can report what
  changed.
- **Pinning is Freeze** (the members as they are now) or "Keep as a separate measure" before the
  edit; no run-pinned reference form is published.
- **One-way door:** the path grammar of selectors and rules. The file-format tolerance rule of
  section 6.21 keeps a later optional run pin possible as an addition.

### 6.30 Is node or edge type a declared role?

**Question.** How many workflows need node or edge type as a declared role (filter by type,
per-type style default, select all of type, per-type counts, traversal limited to types, bipartite
projection, meta-paths)? Is the role declared once, like weight and direction, or chosen per run?

**Evidence (the workflows and capability records).**

| Workflow | What it does with type |
|---|---|
| Knowledge Graph Construction | "Define entity types, relationship types, and constraints (ontology)"; quality "coverage" per type |
| Threat Hunting | a graph of "users, endpoints, processes, connections"; patterns with type constraints (the pattern-search capability: "this node must be type Person", "this edge must be type KNOWS") |
| Fraud Ring Investigation | "Shared identifiers with other entities (device, address, payment method)"; "Which shared identifiers are suspicious vs. coincidental?" |
| Criminal Network Analysis | records from "communications, financial, travel, surveillance"; "Entity resolution" across identities |
| Path Investigation | "Each step with edge type/label" |
| Hub Investigation | "Is this hub's centrality legitimate for its type?"; "Comparison to similar entity types" |
| Anomaly Detection | "'Normal' is hard to define in heterogeneous networks" (a baseline per type) |
| Graph-Based Recommendation | "Build user-item bipartite graph"; user-user and item-item similarity (projection) |
| Drug Target Discovery | a network from "disease genes, PPIs, pathways, drug-target data" |
| Supply Chain Risk Assessment | "tier information" (an ordered category used like a type) |

Capability records that name type: neighbourhood-expansion ("Filter expansion by edge type", "by
node type", and "Too many nodes. Try filtering by type."), ego-network (filter the extracted
network by node and edge type), filtering ("by edge type"), pattern-search, visual-encoding-edges
("Map categorical edge type to color", "to line style"), legend-display, and search
("'type:person'").

- **Formats declare type once, as data.** Neo4j: nodes "May be assigned zero or more labels";
  relationships "Must always have ... exactly one type".
- **Libraries take the partition per call.** NetworkX's convention is "a node attribute named
  `bipartite` with values 0 or 1", but "This convention is not enforced", and most bipartite
  functions "require, as an argument, a container with all the nodes that belong to one set".
- **graphty-element has no type role** (`graphty-today.md`, section 7.3); issue #299 asks for
  node-type and edge-type roles at import with per-type counts, and the app's "Filter to type" and
  "Select all of type" are no-ops waiting on it.

**Answer.** Ten of the 25 workflows and seven capability records need type. Their uses are:
filter by type (five), traversal or pattern limited to types (four), per-type style and legend
(three), per-type baseline or comparison (two), bipartite projection (one). Meta-paths are
implied only by Graph-Based Recommendation and Knowledge Graph Construction. Type is a fact about
the data, declared by the formats that carry it; the per-call choice is which types a traversal or
projection uses.

**Recommendation.**

- **Type is a declared data role**, like weight and direction (section 6.6): which attribute is
  the node type and which is the edge type, declared once in the graph inspector and in the
  published data configuration, detected from formats that declare it. A node's type may hold
  several values (Neo4j labels); an edge's holds one.
- **At rest, the graph inspector shows per-type counts** (linear, section 6.5), and each type is
  a set address usable for select, filter, scope and note.
- **Styling starts from a per-type default**: when a type role is declared, a categorical
  encoding on it is offered as the first user layer, editable and removable, not locked.
- **Neighbourhood expansion, path search and pattern search take a `types` option**, defaulting
  to all. Bipartite projection reads the node type role instead of asking for a node container.
  Meta-paths are deferred until a workflow beyond these two needs them.
- **One-way door:** the role names in the published data configuration and the project file.

### 6.31 With a time window active, what does an unscoped run compute over?

**Question.** When a time window is active, what should a run with no scope compute over in
Network Evolution Analysis, Anomaly Detection and Criminal Network Analysis: the aggregated graph,
the window's snapshot, or a series per window? Does any tool besides Gephi treat the window as
analysis scope rather than a display filter?

**Evidence.**

- **The temporal workflows mostly want a series.** Network Evolution Analysis: "Compute key metrics
  per time period", "Time-series of key network metrics", "Community evolution mapping". Anomaly
  Detection: "did this just change or was it always anomalous?", a question about one entity's
  values across windows, against a "Baseline" over the whole period. Hub Investigation: "Did the
  hub grow organically or suddenly?". The temporal-analysis capability: "Create time-window
  snapshots", sliding windows, "Track metric evolution for computed metrics: modularity, average
  centrality", "within 10 seconds ... up to 100 time windows".
- **One workflow wants the window as the case boundary.** Criminal Network Analysis: "establish
  time frame" at case initialization, and "What time window is relevant?". That is a scope chosen
  once for the whole analysis, not a display that moves.
- **The playback window is a display.** The temporal-navigation capability: a slider, "Play",
  "Step Forward", "Maintain node positions during temporal navigation", fade in and out.
- **Tools.** Gephi's dynamic statistics take a window and a tick and write time-varying values, so
  moving the timeline selects a value rather than invalidating one (`graph-tools.md`, section
  20.20). Raphtory, a temporal graph library, runs algorithms over rolling windows ("for
  graph_view in graph.rolling(window=1):") to produce node metrics "across the history of your
  graph". No tool read here recomputes a measure because the display window moved. graphty-element
  records only whether a window narrowed a run (`Caveats.windowScope`), and its runs compute over
  the whole loaded graph anyway (section 6.14).
- **Aggregating a timestamped graph makes a multigraph.** Repeated transactions or messages
  between one pair become parallel edges, so the aggregate reading depends on section 6.32.

**Answer.** A series per window is what the evolution and anomaly questions need; the aggregated
graph is what the baseline and every ordinary measure need; the window snapshot is needed only as
an explicit case boundary. No tool treats the moving display window as the scope of a finished
measure.

**Recommendation.**

- **The time window is visibility, like a filter.** An unscoped run computes over the whole
  loaded period (the aggregate), as section 6.14 sets for filters; moving the window never makes
  a result stale.
- **A window can be a named scope** ("Betweenness within 2019 to 2020"), for the case boundary.
  This is where the label `graph-tools.md` section 20.20 proposes ("PageRank, 2019 to 2020")
  belongs: on an explicitly window-scoped run, not on every run while a window is showing.
- **"Series" is a result kind**: one run over windows of a given size and step, holding a value
  per element (and per whole graph) per window; playback selects the value for the current window.
  This is new ontology and project-file content: a one-way door to settle before the file ships.

### 6.32 What do libraries and graphty-element do with parallel edges?

**Question.** On a multigraph, what do NetworkX and igraph do by default with parallel edges for
degree, PageRank, betweenness and community detection, and what does each graphty-element
built-in do? The answer sets the default reading each run's caveats publish and whether "degree"
at rest counts edges or neighbours.

**Evidence.**

| Measure | NetworkX | igraph | graphty-element today |
|---|---|---|---|
| Degree | counts edges: "The node degree is the number of edges adjacent to the node" (`MultiGraph.degree`) | "the number of its adjacent edges" (R `degree`; the page does not discuss multi-edges) | the at-rest summary counts edges (`snapshot.degree()` sums arcs); the Degree algorithm counts distinct neighbours, because it runs on the simplified graph |
| PageRank | parallel weights summed: "For multigraphs the weight between two nodes is set to be the sum of all edge weights", default `weight="weight"`, missing weights count 1, so unweighted parallels count as multiplicity | each edge becomes its own arc in PRPACK, with no merging in `prpack_igraph_graph.cpp`, so multiplicity counts | simplified with weights summed; when no weight attribute is chosen (the default) the merged edge counts once and the multiplicity is lost |
| Betweenness, unweighted | parallels ignored: the breadth-first search iterates `for w in G[v]`, the distinct neighbours | parallels multiply path counts: the adjacency list is built with `IGRAPH_MULTIPLE`, and `nrgeo[neighbor] += nrgeo[actnode]` runs once per parallel edge; the R page warns that `edge_betweenness()` "might give false values for graphs with multiple edges" | simplified; parallels ignored (as NetworkX) |
| Shortest paths, weighted as cost | "the minimum edge weight over all parallel edges is returned" (`_weight_function`) | weights "are interpreted as distances" | simplified with weights SUMMED, so two parallel roads of length 5 become one of length 10 (Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal all read the simplified graph) |
| Louvain | weights summed: `G[u][v]["weight"] += wt` | weights summed when multi-edges are removed; undirected only ("works for undirected graphs only") | simplified with weights summed (as both) |

- Source for graphty-element: every built-in obtains its graph through `toAlgorithmGraph`, which
  simplifies a multigraph with `weights: "sum"` because `@graphty/algorithms` "cannot represent a
  multigraph" (`graphty-element/src/algorithms/utils/snapshotGraph.ts`), and every run on a
  multigraph appends the caveat "N parallel edges were merged, with weights summed"
  (`graphty-element/src/managers/AlgorithmManager.ts`). The Degree result's own caveat note says
  "Counted over the graph as the records declared it", which is not what it computes on a
  multigraph (`graphty-element/src/algorithms/DegreeAlgorithm.ts`).

**Answer.** The two reference libraries agree on degree (edges), PageRank (multiplicity counts)
and Louvain (weights summed), and disagree on unweighted betweenness (NetworkX ignores
multiplicity, igraph multiplies paths). NetworkX reads parallel costs by their minimum. graphty-
element's single rule, sum before every algorithm, matches both libraries for Louvain and
weighted PageRank, and departs from both in three places: unweighted PageRank loses multiplicity,
the Degree algorithm counts neighbours while the at-rest summary counts edges, and cost-reading
algorithms add parallel costs instead of taking the cheapest.

**Recommendation.**

- **The reduction follows the declared weight meaning (section 6.6), not one rule for all.**
  Strength or multiplicity: sum, and with no weight chosen, the multiplicity is the weight (as
  both libraries). Cost: minimum (as NetworkX). Unweighted path counts: each pair once (as
  NetworkX), stated in the caveat, because igraph's reading differs.
- **At rest, "degree" counts edges** (both libraries and the snapshot agree), and on a multigraph
  the inspector also shows "distinct neighbours", named as such. The Degree algorithm must give
  the same number as the at-rest summary, and its caveat must say what it counted.
- **Each run's caveat names the reduction used** ("parallel edges: 312 merged, weights summed"
  or "cheapest of parallel costs"), which the element already does for the sum.
- These are element defects to file: the summed costs, the lost PageRank multiplicity, and the
  Degree disagreement.

### 6.33 Is a working network a graph of its own, or a kept set used as scope and filter?

**Question.** In the workflows that want a "working network" (the largest component, a disease
module, a sub-map, a union or an intersection of two conditions), is the working network ever
edited structurally, laid out, filtered, styled or measured as a graph separate from its source?
Or is a kept set used as scope plus a filter enough? This decides whether the project file's top
level is one graph with sets or a list of graphs, and whether the information architecture needs a
graph switcher. The research notes disagree: section 6.16 says "one current graph (plus derived
graphs when network collections arrive)"; `graph-tools.md` section 20.24 says a list of graphs.

**Evidence, working network by working network.**

| Workflow | Working network | What is done to it | Covered by a set plus scope, filter and scoped layout? |
|---|---|---|---|
| Gene List to Interaction Network | "Select the largest connected component and make it the working network; unconnected genes are noted but dropped" | laid out, encoded, exported as figure and node table | yes: a rule set, the rest hidden, layout over the visible, export of the visible |
| Community Analysis | "Connected graph (typically giant component)" | community detection | yes: a scoped run (section 6.14) |
| Drug Target Discovery | "Define the disease-relevant subnetwork" | ranked by centrality within it | yes: scoped runs |
| Cluster and Functionally Annotate | "optionally lay out each cluster as its own subnetwork" | laid out per cluster | yes, if a layout can be scoped to a set; the per-cluster positions then replace or sit beside the whole-graph positions, which is a question of where positions live, not of a second graph |
| Enrichment Map | "Whether to build a sub-map for one theme of interest" | laid out, perhaps re-clustered | yes, as above |
| Supply Chain Risk Assessment; Hub Gene Identification and Ranking | "What if supplier X fails?"; "optionally simulate removing one" | measured without some nodes, compared with the whole; the removal-impact capability says "Do not modify actual graph data; operate on simulated copy" and "Support batch simulation comparing multiple removal scenarios side-by-side" | yes: a run scoped to the complement of the removed set; removing edges needs the edge arm of section 6.12 |
| Condition Comparison | two networks loaded separately, then "Union, intersection, or difference as the working network", keeping "per-condition attributes side by side" and exporting "the merged edge list with a membership column" | a new graph built from two sources, measured, exported | **no**: the union holds edges neither source holds alone, and the two inputs are separate graphs with their own identity rules |
| Reproducible Session | "Rename networks and subnetworks", "One file that holds every network in the collection" | kept | follows Cytoscape's model; it needs whatever the other rows need |

- **No workflow edits a subset structurally apart from its source.** Every subset-derived working
  network is read, measured, laid out and exported, and each of those is a set used as scope and
  filter, given two element capabilities: a layout that can run over a scope, and positions that
  can be kept per view or per layout when two arrangements of the same nodes are wanted.

**Answer.** A kept set used as scope plus a filter covers every working network made from one
graph, including what-if removals. Only Condition Comparison needs more than one graph: two
independently loaded conditions and the merged graph built from them.

**Recommendation.**

- **Subsets are never graphs.** The largest component, a module, a sub-map and a removal scenario
  are sets, and the verbs that act on them are scoped runs, filters and scoped layouts. This
  corrects section 6.16's "derived graphs are objects" for subset-derived networks.
- **The project file's top level is a list of graphs**, as `graph-tools.md` section 20.24
  recommends, because Condition Comparison needs two sources and a merged third, and turning one
  graph into a list after the file ships is a breaking change. A list of one is the normal case.
- **The information architecture needs no graph switcher until the list holds more than one
  graph**; the switcher belongs to comparison, not to everyday analysis.
- **Element work:** layout over a scope, and positions stored per view when a scoped layout must
  not overwrite the whole-graph arrangement.

### 6.34 Which comparisons of measures and partitions do analysts trust, and do they keep them?

**Question.** When analysts compare two measures or two partitions (Hub Gene Identification and
Ranking; Community Analysis), which forms do they trust and cite (top-N overlap, rank
correlation, scatter, normalised mutual information), and do they keep and cite the comparison
itself? This decides whether Compare produces a kept result with provenance or is a transient view
over two selected results.

**Evidence.**

- **Measures: top-N overlap is the form the workflow names.** Hub Gene Identification and Ranking:
  "Overlap between top-N lists of different methods", "take the intersection of the top-10 lists
  across methods; keep the per-method ranks as columns", success when "User can see which hubs
  appear in the top 10 of more than one method", and the pain point "there is no built-in
  intersection". Its convention comes from cytoHubba, which ranks nodes by 11 methods "in one
  integrated environment" (Chin et al. 2014).
- **But the analyses the workflow cites used one method.** The head and neck carcinoma study took
  "the genes with the top 10 MCC values" as hub genes; the coronary artery disease study used
  MCODE alone. Multi-method agreement is the workflow's stated need; how often published analyses
  actually intersect lists was not established by any source read here.
- **Rank correlation is the research form.** Valente, Coronges, Lakon and Costenbader (2008) asked
  "Are these centrality measures correlated?" across 58 networks, and answered by correlating
  degree, betweenness, closeness and eigenvector.
- **Scatter of two columns** is Cytoscape's paved path (`graph-tools.md`, section 20.2).
- **Partitions: a similarity score.** igraph's `compare` "assesses the distance between two
  community structures" by variation of information, normalised mutual information, split-join
  distance, Rand index or adjusted Rand index. Condition Comparison and Network Evolution Analysis
  want which communities "split or merged" (section 6.28), which is the per-group table, not a
  score.
- **What is kept and cited is the output, not the view.** Hub Gene Identification and Ranking
  exports "the ranked table with every metric as a column" and puts the list "into a figure and a
  table in the paper"; its intersection is a set. Condition Comparison exports the rewired-gene
  table, a per-node difference. Community Analysis's stability is a judgment for which a score is
  the citable evidence. No workflow keeps a scatter plot or a side-by-side view as such.

**Answer.** For measures, analysts use top-N overlap to decide and per-method rank columns to
report; rank correlation and scatter are the research and exploration forms. For partitions, a
similarity score to judge and a split-and-merge table to explain. What is kept is always an output
of an existing kind: a set (the overlap), a node measure (a difference, a combined score, a rank),
or a number (a similarity score) that must be citable with its inputs.

**Recommendation.**

- **Compare is a transient view over two selected results**: overlap at a chosen N with a
  Venn-style count, rank correlation, a scatter, and for partitions the similarity score plus the
  carry-over table of section 6.28.
- **Keeping from it makes a derived result whose inputs are the two results**, of an ordinary
  kind: the overlap as a set with its recipe (measures, N); a difference or a combined score as a
  node measure; a similarity score as a single number held by a kept comparison result. Each
  records its inputs by measure id and run, the method and N, so the methods paragraph can cite it.
- **One-way door:** a result's recipe must be able to name other results as inputs. That is a
  project-file field to settle with the measure id.

---

## 7. Decision-relevant findings for the framework

(Recommendations. Each cites the evidence above.)

1. **Ontology levels are set by the literature.** Element (node, edge), path, set, whole graph
   -- that is Lee's object list, Saket's group level and Ahn's entity hierarchy. Every analyst
   question in section 2 is about one of these four. The ontology can adopt them directly.
2. **"Community", "component", "cluster" and "group" are four different things.** Component:
   connected component. Community: output of community detection. Cluster: output of a
   clustering method, or Lee's topological cluster. Group: a user- or attribute-defined set
   (Lee's definition). The vocabulary must keep them apart; "cluster" is the one most at risk of
   overload.
3. **Use node and edge, degree, betweenness, PageRank, components, modularity, density,
   clustering coefficient, diameter, average path length, assortativity, k-core -- unchanged.**
   Where two standard names exist, prefer the one Gephi and Cytoscape show their users (edge
   over link; weighted degree over strength; average path length over characteristic path
   length).
4. **Results are attributes on graph objects plus provenance.** This is the paved path (Gephi,
   Cytoscape) and what graphty-element already does. The user's model should not add a parallel
   copy of the values; it should show each value's provenance wherever the value appears, and
   make the result's own sets and graph-level numbers reachable from the result's entry in the
   history. The measure as a whole is that entry, which is what analysts compare, name, cite and
   annotate (section 6.4). It is one object per measure, not per run: its runs are its versions,
   and its id sits above `RunId` (sections 6.13 and 6.25).
5. **The graph itself is an inspectable object with a standing summary.** Whole-graph questions
   are the first task and a recurring one. graphty-element already publishes node and edge
   counts, density, directedness, weightedness, self-loop and parallel-edge counts, degree range,
   mean degree and component statistics on its session (`graphty-element/src/session/types.ts`,
   `GraphStatistics`). Missing relative to Gephi's and Cytoscape's standard summary: the **degree
   distribution** itself (for a histogram), **global and average clustering coefficient**,
   **diameter** and **average path length**, **degree assortativity** and **reciprocity**. The
   `@graphty/algorithms` package has no function for clustering coefficient, assortativity or
   reciprocity either. Per the architectural principles, these belong in graphty-element, not
   the app. Section 6.5 splits them: the degree distribution and reciprocity are linear and
   belong at rest; clustering coefficient, diameter, average path length and assortativity are
   results the analyst runs, kept with their provenance. When a filter is active, every at-rest
   number shows loaded and visible side by side.
6. **Every numeric attribute needs a distribution view that is also a selection tool.**
   Characterize distribution, find extremum and find anomalies are three of Amar and Stasko's ten
   primitives; Cytoscape's select-from-histogram is the paved path; five workflows name a
   histogram or distribution as an information need.
7. **Search-first and overview-first are equal entry paths.** van Ham and Perer, and the
   investigation workflows, start from an entity; the assessment workflows start from the whole.
   Search and neighbourhood expansion (k-hop, follow path, revisit) are primary navigation.
8. **Sets need set operations and a set inspector.** Lee adds set operation to the primitive
   tasks; Saket's group-level tasks ask about a set's size, density, extremes and neighbours; the
   comparison workflow asks for A-only / B-only / both counts. Sets may overlap. The set
   inspector is the graph inspector's template plus a Boundary section (cut edges, conductance,
   outside neighbours) and a comparison with the parent (section 6.1).
9. **Notes are common, cheap, and anchored to graph objects.** Brehmer and Munzner put annotate
   in the main analysis vocabulary; Heer requires data-aware annotation so a note survives a
   change of view; Ragan observes that insight is lost unless the user records it. A note
   references a set, a result or a view; it is never a graph object itself. It keeps the members
   it was written about, and outlives its targets (section 6.7).
10. **Views recreate a display and own no data.** Ragan's visualization provenance; Heer's
    bookmark trail.
11. **Comparison is a primary action on results.** "Do the methods agree?", "are communities
    stable across algorithms?", "which measure defines rewired?" appear as decision points in
    many workflows. Two results of the same kind, side by side or as a set difference, is a core
    capability rather than a specialist one.
12. **Parameters are part of the result, not a settings dialog that disappears.** Workflow
    decision points are overwhelmingly about thresholds, resolutions, weights and methods; three
    workflows explicitly require the parameters to be retrievable later.
13. **Present equals export.** Ragan defines presentation as communication with people outside
    the analysis; Heer's minimum is exporting views, data subsets and settings. This supports the
    owner's ruling and places presentation in the export path, not in an in-app mode.
14. **Time is a property dimension, not a new object type.** Ahn et al. describe temporal tasks
    on the same entities (element, group, network). Temporal support can be added to graph
    objects' properties without a new primary concept, matching its lower priority for the
    average user.
15. **Undo is the safety net; kept results are its long-term form.** Shneiderman (history),
    Heer (undo at a minimum) and Ragan (action recovery is critical to exploration) all
    converge; this is the evidence behind using undo instead of wizards to support novices. The
    long-term record is the list of kept results, sets and notes, each stamped with the data
    revision it was made on, not a branching tree of data versions (section 6.16).
16. **"Set" is one concept whose definition is a member list (fixed) or a rule.** A hand-picked
    set and a set kept from a result are fixed; a query or filter set is a rule and can be
    current, stale or frozen. The project file stores the definition and the members as last
    evaluated (section 6.2).
17. **"Keep" works on whatever is in hand, and does not pass through the selection.** Rule-made
    sets routinely exceed the 5,000-element selection cap; hand-made sets never approach it. The
    cap stays on the selection and never applies to a set (section 6.3).
18. **A set holds nodes and edges together.** Paths, cuts and condition-membership edges need
    edges; a path is a set with an order; a path family is a result (section 6.12).
19. **Weight meaning and direction are declared once and overridable per run.** Whether a weight
    is a cost or a strength is a fact about the data; graphty-element converts it per algorithm
    and records what it used (section 6.6).
20. **A community result is one row with a table of communities.** Only a kept community becomes
    a row of its own (section 6.8).
21. **Randomized and expensive results are stored as values and as a recipe.** No tool
    guarantees the same output from a seed across machines and versions (section 6.11).
22. **Analysis opens in 2D on a desktop.** The accuracy gains of 3D come from stereo and motion
    cues that VR and AR provide and a flat monitor does not (section 6.9).
23. **The attribute table is a full-width dock linked to the canvas.** It is used to sort and
    compare many rows alongside the canvas; one node's full row belongs in the inspector
    (section 6.10).
24. **A parameter edit revises the measure; keeping both is an explicit act.** A measure has an
    id above `RunId` that style layers, notes and views reference; its layers repaint from its
    current run, so tuning never grows the style stack (section 6.13).
25. **An unscoped run computes over the whole graph; computing within a subset is a named
    scope.** Code-first libraries and Cytoscape never scope implicitly; Gephi's silent scoping is
    documented to mix values from two computations in one column and to break comparison. The
    element must compute over the scope it records (section 6.14).
26. **A result is stale when anything it read changed**: membership, a column it read, a declared
    weight meaning, directedness, or element identity. Algorithms declare their reads, and the
    snapshot keeps a revision counter per column (section 6.15).
27. **History is linear; the analysis tree is a list of kept outputs.** No workflow needs to
    navigate branches of data versions; the project file holds one current graph and results
    stamped with the revision they ran on. Derived graphs are objects of their own (section 6.16).
28. **The left panel must hold hundreds of objects**, grouped by kind with a filter field, with
    notes the fastest-growing kind (section 6.17).
29. **A saved filter is a rule set with outcome "hide".** Only a cross-project query library is
    different, and it is the reader's own (section 6.18).
30. **A rule set stores its definition, count and digest, not its members**, unless frozen
    (section 6.19).
31. **Whole-graph measures are properties in the graph or set inspector**, with provenance in a
    popover, compared across scopes, not as runs (section 6.20).
32. **A note is free text plus targets.** A judgment about an element or a set is an attribute
    on it; the file format tolerates unknown optional fields so structure can be added later
    (section 6.21).
33. **On a mixed graph, an undirected edge is a mutual pair for direction-aware algorithms**,
    reciprocity counts directed edges only, and community detection runs undirected, each stated
    in the run's caveats (section 6.22).
34. **The published reading uses the technical term and gives the number its scale; the (i) note
    defines what is computed and states the assumption conditionally.** Interpretive names
    ("Bridging", "Influence") are removed (section 6.23).
35. **Automatic rotation aids only path tracing in 3D**; it does not change the case for opening
    analysis in 2D (section 6.24).
36. **A measure has two homes**: a row in the left panel's measures group, for its record
    (distribution, parameters, caveats, notes, comparisons), and a choice in the pickers of layer
    bindings, rule conditions and table columns. Readers compare, combine, cut, cite, note, tune
    and delete measures; they never hide or rename one apart from its paint (section 6.25).
37. **One community is addressable without Keep** by partition plus group value: inspected,
    selected, labelled, noted and used as "within each group" scope. Group labels belong to the
    partition result (section 6.26).
38. **A project holds 3 to 6 style layers, about 10 at worst**, bounded by the channels read at
    once. The resting inspector can hold the stack if tuning, batch runs and per-element overrides
    do not add layers, with a "show all" door for growth; highlights of different results may
    coexist (section 6.27).
39. **Names stay with the partition they were written on.** A labelled partition is re-run as a
    new result beside the old; the element offers a carry-over table (continues, split, merged,
    dissolved) and never carries names automatically; Keep stores members plus origin (section
    6.28).
40. **Rules and selectors reference the measure id**, not the run; pinning is Freeze or a
    separate measure (section 6.29).
41. **Node and edge type are declared data roles**, with per-type counts at rest, a per-type
    default layer, and a `types` option on neighbourhood, path and pattern search (section 6.30).
42. **The time window is visibility**; an unscoped run computes over the whole period, a window
    can be a named scope, and "series" is a result kind (section 6.31).
43. **Parallel edges are reduced by weight meaning**: summed for strength and multiplicity,
    minimum for cost, counted once for unweighted paths. At-rest degree counts edges. The element
    today sums costs, drops PageRank multiplicity and disagrees with itself on degree (section
    6.32).
44. **A working network made from one graph is a set, never a graph**; the file's top level is
    nevertheless a list of graphs, for Condition Comparison's two sources and merged third, and a
    graph switcher appears only when there is more than one (section 6.33).
45. **Compare is transient; what it keeps is a derived result naming its two inputs**: an overlap
    set, a difference or combined measure, or a similarity score (section 6.34).

---

## 8. Where the evidence is thin

- **Overlapping sets.** Saket et al. explicitly exclude overlapping groups; there is no standard
  task list for them, though graphty will need them (a node in a community, a user group and a
  path at once).
- **Edge-centred analysis.** The taxonomies are node-centred. Edge betweenness, edge types,
  bridges and edge-level results appear, but few tasks treat edge sets as first-class. The
  owner's decision that highlights stack as edge style layers goes beyond the literature here.
  Section 6.12 rests on the workflows, not on an edge-set task literature, and no source read
  here studies how analysts compare a family of alternative paths.
- **3D and immersive graph analysis.** The task taxonomies are not specific to 3D; the
  perception studies in section 6.9 are. They cover path tracing and community detection;
  evidence on reading attribute values in 3D comes from Munzner's design rules rather than from
  a graph-specific experiment. The Greffard et al. 2011 study of the same question (Graph
  Drawing 2011, doi:10.1007/978-3-642-25878-7_21) could not be read; only their 2014 abstract was.
- **How to show a stale result.** No source read here studies it directly. Section 6.2 follows
  the convergent rule of Heer, the W3C annotation model and Figma (keep the last value, say it is
  out of date, never blank or silently replace it).
- **What proportion of notes is about what.** Mahyar et al. characterise notes by content, scope
  and usage, but only their abstract was read; the tally in section 6.7 counts the workflows,
  not observed analysts.
- **Set sizes** in section 6.3 are read from the graph sizes the workflows state and from one
  published Louvain run, not from a survey of what analysts save.
- **Pirolli and Card's primary text** was not retrievable for this document; the summary in 1.8
  relies on the secondary sources listed. The loop's structure (two loops, bottom-up and
  top-down, shoebox and evidence file) is consistent across them.
- **Kept-object counts** in section 6.17 are estimates read from the workflows and the capability
  records' own limits; no survey or log of saved analysis projects was found.
- **Branch navigation.** The only usage data found is Tableau's undo and redo ratio (section
  6.16); no study of how often VisTrails users, or any analysts, navigate branches of a history
  was found.
- **Default scope.** The harm from silent scoping is documented in two Gephi issues, not in a
  study; the sampling-robustness papers in section 6.14 were read only as indexed summaries
  (Semantic Scholar), not in full.
- **Interpretive readings.** No study compares technical-term readings with interpretive ones for
  graph measures; section 6.23 combines title-framing evidence, a critique of centrality measures
  and a spreading study, each read at abstract level.
- **Automatic rotation** has been tested for path tracing only; no study of reading values or
  labels under rotation was found (section 6.24).
- **Mixed directedness** in section 6.22 is taken from graphology's source code and NetworkX and
  igraph documentation; Gephi's and Cytoscape's handling of mixed graphs was not checked.
- **Style-layer counts** in section 6.27 are read from what the workflows say they paint; no
  survey of saved styles was found.
- **Names across re-runs.** Kumu's documentation does not say what a split or merge does to a
  community name; section 6.28's inference that seeding carries names is not confirmed.
- **igraph and multi-edges.** igraph's degree and PageRank pages do not discuss multi-edges;
  section 6.32 reads the betweenness and PageRank behaviour from igraph's C source, not from
  documentation.
- **Multi-method hub agreement in practice.** The two published analyses the hub workflow cites
  used a single method; how often analysts intersect top-N lists across methods was not
  measured by any source read here (section 6.34). The Valente et al. text was read only as an
  indexed abstract.
- **Newman's and Barabasi's full chapter contents** were confirmed only at the table-of-contents
  and review level; the term definitions in section 3 follow common usage in the tools and task
  literature cited, which agree with those books.

---

## Sources

Every source below was read (in full or in the part cited) for this document. Where only an
abstract was read, the entry says so.

Task taxonomies and visualization theory:

- Lee, B., Plaisant, C., Parr, C. S., Fekete, J.-D., Henry, N. "Task Taxonomy for Graph
  Visualization." BELIV 2006. https://datavis2020.github.io/pdfs/lee-beliv06.pdf (ACM:
  https://dl.acm.org/doi/10.1145/1168149.1168168). Includes Amar, Eagan and Stasko's ten
  low-level analytic tasks (Table 1).
- Saket, B., Simonetto, P., Kobourov, S. "Group-Level Graph Visualization Taxonomy." 2014.
  https://arxiv.org/abs/1403.7421
- Brehmer, M., Munzner, T. "A Multi-Level Typology of Abstract Visualization Tasks." IEEE TVCG
  19(12), 2013. https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/brehmer_infovis13.pdf
- Munzner, T. "Visualization Analysis and Design, Chapter 3: Task Abstraction" (lecture slides
  for the 2014 book). https://www.cs.ubc.ca/~tmm/talks/vad/VAD-tasks-4x4.pdf ; book page:
  https://www.cs.ubc.ca/~tmm/vadbook/
- Munzner, T. "A Nested Model for Visualization Design and Validation." IEEE TVCG 15(6), 2009.
  https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/NestedModel.pdf
- Shneiderman, B. "The Eyes Have It: A Task by Data Type Taxonomy for Information
  Visualizations." 1996. https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf
- van Ham, F., Perer, A. "Search, Show Context, Expand on Demand: Supporting Large Graph
  Exploration with Degree-of-Interest." IEEE TVCG 15(6), 2009.
  https://aviz.fr/wiki/uploads/Teaching2014/SearchShowContext.pdf
- Heer, J., Shneiderman, B. "Interactive Dynamics for Visual Analysis." Communications of the
  ACM 55(4), 2012. https://idl.cs.washington.edu/files/2012-InteractiveDynamics-CACM.pdf ;
  extended draft quoted above: https://homes.cs.washington.edu/~jheer/files/idfva-draft.pdf
- Ahn, J.-w., Plaisant, C., Shneiderman, B. "A Task Taxonomy for Network Evolution Analysis."
  IEEE TVCG 20(3), 2014. Abstract as indexed at
  https://www.semanticscholar.org/paper/A-Task-Taxonomy-for-Network-Evolution-Analysis-Ahn-Plaisant/da3f8baa3e063d267c7c0abbcf2930b9255b807a

Sensemaking and provenance:

- Pirolli, P., Card, S. "The Sensemaking Process and Leverage Points for Analyst Technology as
  Identified Through Cognitive Task Analysis." International Conference on Intelligence
  Analysis, 2005. Summaries read:
  https://www.semanticscholar.org/paper/The-Sensemaking-Process-and-Leverage-Points-for-as-Pirolli-Card/f6b54379043d0ee28bea45555f481af1a693c16c
  and https://publish.obsidian.md/joelchan-notes/discourse-graph/sources/@pirolliSensemakingProcessLeverage2005
- Ragan, E. D., Endert, A., Sanyal, J., Chen, J. "Characterizing Provenance in Visualization and
  Data Analysis: An Organizational Framework of Provenance Types and Purposes." IEEE TVCG 22(1),
  2016. https://www.osti.gov/servlets/purl/1286885

Network science and tools:

- Newman, M. "Networks," 2nd edition. Oxford University Press, 2018.
  https://global.oup.com/academic/product/networks-9780198805090
- Barabasi, A.-L. "Network Science." Cambridge University Press, 2016.
  http://networksciencebook.com/ ; chapter contents per the review at
  https://physicstoday.aip.org/reviews/network-science
- Gephi network statistics: https://jveerbeek.gitlab.io/gephi/docs/network_statistics.html
- Cytoscape NetworkAnalyzer: https://manual.cytoscape.org/en/stable/Network_Analyzer.html

Sets, communities and their measures:

- Yang, J., Leskovec, J. "Defining and Evaluating Network Communities based on Ground-truth."
  2012. https://arxiv.org/abs/1205.6233 (section 2 read for the 13 scoring functions)
- Leskovec, J., Lang, K. J., Dasgupta, A., Mahoney, M. W. "Community Structure in Large Networks:
  Natural Cluster Sizes and the Absence of Large Well-Defined Clusters." 2008. Abstract:
  https://arxiv.org/abs/0810.1355
- Blondel, V. D., Guillaume, J.-L., Lambiotte, R., Lefebvre, E. "Fast unfolding of communities in
  large networks." 2008. https://arxiv.org/abs/0803.0476 (full text read)
- NetworkX `cuts` module: https://networkx.org/documentation/stable/reference/algorithms/cuts.html
- Tableau, "Create Sets" (fixed and dynamic sets):
  https://help.tableau.com/current/pro/desktop/en-us/sortgroup_sets_create.htm
- Cytoscape, "Finding and Filtering Nodes and Edges":
  https://manual.cytoscape.org/en/stable/Finding_and_Filtering_Nodes_and_Edges.html

Weights, direction and path measures:

- Opsahl, T., Agneessens, F., Skvoretz, J. "Node centrality in weighted networks: Generalizing
  degree and shortest paths." Social Networks 32(3), 2010, as summarised by its first author at
  https://toreopsahl.com/tnet/weighted-networks/node-centrality/
- NetworkX `betweenness_centrality`:
  https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.centrality.betweenness_centrality.html
- NetworkX `pagerank`:
  https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_analysis.pagerank_alg.pagerank.html
- NetworkX `average_shortest_path_length`:
  https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.generic.average_shortest_path_length.html

Annotation:

- W3C. "Web Annotation Data Model." Recommendation, 2017. https://www.w3.org/TR/annotation-model/
- Hypothesis, "Fuzzy Anchoring" (multiple selectors per annotation):
  https://web.hypothes.is/blog/fuzzy-anchoring/
- Mahyar, N., Sarvghad, A., Tory, M. "Note-taking in co-located collaborative visual analytics:
  Analysis of an observational study." Information Visualization, 2012.
  doi:10.1177/1473871611433713 (abstract only, via https://api.openalex.org)

Reproducibility:

- Sandve, G. K., Nekrutenko, A., Taylor, J., Hovig, E. "Ten Simple Rules for Reproducible
  Computational Research." PLoS Computational Biology 9(10), 2013.
  https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1003285
- NumPy NEP 19, "Random number generator policy":
  https://numpy.org/neps/nep-0019-rng-policy.html
- NetworkX, "Randomness": https://networkx.org/documentation/stable/reference/randomness.html
- NetworkX `louvain_communities`:
  https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html

2D, 3D and immersive display:

- Munzner, T. "Visualization Analysis and Design, Chapter 6: Rules of Thumb" (lecture slides).
  https://www.cs.ubc.ca/~tmm/talks/vad/VAD-rules-4x4.pdf
- Ware, C., Franck, G. "Evaluating stereo and motion cues for visualizing information nets in
  three dimensions." ACM Transactions on Graphics 15(2), 1996. doi:10.1145/234972.234975
  (abstract only, via https://api.crossref.org)
- Ware, C., Mitchell, P. "Visualizing graphs in three dimensions." ACM Transactions on Applied
  Perception 5(1), 2008. doi:10.1145/1279640.1279642 (abstract only, via
  https://api.crossref.org)
- Greffard, N., Picarougne, F., Kuntz, P. "Beyond the classical monoscopic 3D in graph analytics:
  An experimental study of the impact of stereoscopy." IEEE VIS 3DVis workshop, 2014.
  doi:10.1109/3dvis.2014.7160095 (abstract only, via https://api.openalex.org)
- Kwon, O.-H., Muelder, C., Lee, K., Ma, K.-L. "A Study of Layout, Rendering, and Interaction
  Methods for Immersive Graph Visualization." IEEE TVCG 22(7), 2016. doi:10.1109/tvcg.2016.2520921
  (abstract only, via https://api.openalex.org)

History, versions and exploratory analysis:

- Heer, J., Mackinlay, J., Stolte, C., Agrawala, M. "Graphical Histories for Visualization:
  Supporting Analysis, Communication, and Evaluation." IEEE TVCG 14(6), 2008.
  https://idl.cs.washington.edu/files/2008-GraphicalHistories-InfoVis.pdf (full text read;
  sections 2.1.2, 3.4 and 4.3 quoted)
- Kery, M. B., Horvath, A., Myers, B. "Variolite: Supporting Exploratory Programming by Data
  Scientists." CHI 2017. doi:10.1145/3025453.3025626 (abstract only, via https://api.openalex.org)

Filtered and sampled measurement:

- Gephi issue 636, "Weighted degree computation fails (all values 0) when a filter is applied":
  https://github.com/gephi/gephi/issues/636
- Gephi issue 541, "Add a local/global scale button to Ranking":
  https://github.com/gephi/gephi/issues/541
- Costenbader, E., Valente, T. W. "The stability of centrality measures when networks are
  sampled." Social Networks 25(4), 2003. doi:10.1016/s0378-8733(03)00012-1 (summary only, via
  https://api.semanticscholar.org)
- Borgatti, S. P., Carley, K. M., Krackhardt, D. "On the robustness of centrality measures under
  conditions of imperfect data." Social Networks 28(2), 2006. doi:10.1016/j.socnet.2005.05.001
  (summary only, via https://api.semanticscholar.org)
- NetworkX `Graph.to_directed`:
  https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.to_directed.html

Mixed directedness:

- graphology neighbour iteration (descriptor table):
  https://raw.githubusercontent.com/graphology/graphology/master/src/graphology/src/iteration/neighbors.js
- graphology unweighted shortest paths:
  https://raw.githubusercontent.com/graphology/graphology/master/src/shortest-path/unweighted.js
- graphology neighbourhood index:
  https://raw.githubusercontent.com/graphology/graphology/master/src/indices/neighborhood.js
- graphology Louvain: https://graphology.github.io/standard-library/communities-louvain.html
- graphology operators: https://graphology.github.io/standard-library/operators.html
- igraph (R) `as_directed` and `as_undirected`: https://r.igraph.org/reference/as_directed.html

Judgment and hypotheses:

- Linkurious Enterprise user manual, investigating alert cases and the alerts lexicon:
  https://doc.linkurious.com/user-manual/latest/alert-investigate/ and
  https://doc.linkurious.com/user-manual/latest/alert-lexicon/
- Heuer, R. J. "Psychology of Intelligence Analysis," chapter 8, Analysis of Competing
  Hypotheses. Center for the Study of Intelligence, 1999.
  https://www.cia.gov/resources/csi/static/Pyschology-of-Intelligence-Analysis.pdf

Readings and the meaning of measures:

- Kong, H.-K., Liu, Z., Karahalios, K. "Frames and Slants in Titles of Visualizations on
  Controversial Topics." CHI 2018. doi:10.1145/3173574.3174012 (abstract only, via
  https://api.openalex.org)
- Bringmann, L. F., Elmer, T., Epskamp, S., et al. "What do centrality measures measure in
  psychological networks?" Journal of Abnormal Psychology 128(8), 2019. doi:10.1037/abn0000446
  (abstract only, via https://api.openalex.org)
- Kitsak, M., Gallos, L. K., Havlin, S., Liljeros, F., Muchnik, L., Stanley, H. E., Makse, H. A.
  "Identification of influential spreaders in complex networks." Nature Physics 6, 2010.
  https://arxiv.org/abs/1001.5285 (abstract only)
- Jones, P. J., Ma, R., McNally, R. J. "Bridge Centrality: A Network Approach to Understanding
  Comorbidity." Multivariate Behavioral Research, 2019. doi:10.1080/00273171.2019.1614898 (title
  and record only, via https://api.openalex.org)

Rotation and depth cues:

- Sollenberger, R. L., Milgram, P. "Effects of Stereoscopic and Rotational Displays in a
  Three-Dimensional Path-Tracing Task." Human Factors 35(3), 1993. doi:10.1177/001872089303500306
  (abstract only, via https://api.openalex.org)
- Ware, C., Mitchell, P. "Reevaluating stereo and motion cues for visualizing graphs in three
  dimensions." APGV 2005. doi:10.1145/1080402.1080411 (abstract only, via
  https://api.openalex.org)

Measures in the tools, and community identity across runs:

- Gephi statistics source: `Modularity.java` (report parameters, "Modularity Class" column) and
  `GraphDistance.java` ("Network Interpretation", column titles):
  https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/Modularity.java
  and https://raw.githubusercontent.com/gephi/gephi/master/modules/StatisticsPlugin/src/main/java/org/gephi/statistics/plugin/GraphDistance.java
- Cytoscape NetworkAnalyzer: https://manual.cytoscape.org/en/stable/Network_Analyzer.html
- clusterMaker2 ("Cluster Attribute" per run): https://www.rbvi.ucsf.edu/cytoscape/clusterMaker2/
- Kumu metrics and community detection: https://docs.kumu.io/guides/metrics.md
- Greene, D., Doyle, D., Cunningham, P. "Tracking the Evolution of Communities in Dynamic Social
  Networks." ASONAM 2010. doi:10.1109/asonam.2010.17 (abstract only, via https://api.openalex.org)
- Palla, G., Barabasi, A.-L., Vicsek, T. "Quantifying social group evolution." Nature 446, 2007.
  https://arxiv.org/abs/0704.0744 (abstract only)
- Rosvall, M., Bergstrom, C. T. "Mapping change in large networks." 2010.
  https://arxiv.org/abs/0812.1242 (abstract only)

Types, time and parallel edges:

- Neo4j, "What is a graph database" (labels and relationship types):
  https://neo4j.com/docs/getting-started/graph-database/
- NetworkX bipartite conventions: https://networkx.org/documentation/stable/reference/algorithms/bipartite.html
- Raphtory README (rolling windows, algorithms over windows):
  https://raw.githubusercontent.com/Pometry/Raphtory/master/README.md
- NetworkX source: PageRank
  https://raw.githubusercontent.com/networkx/networkx/main/networkx/algorithms/link_analysis/pagerank_alg.py ;
  Louvain https://raw.githubusercontent.com/networkx/networkx/main/networkx/algorithms/community/louvain.py ;
  weighted shortest paths
  https://raw.githubusercontent.com/networkx/networkx/main/networkx/algorithms/shortest_paths/weighted.py ;
  betweenness https://raw.githubusercontent.com/networkx/networkx/main/networkx/algorithms/centrality/betweenness.py
- NetworkX `MultiGraph.degree`:
  https://networkx.org/documentation/stable/reference/classes/generated/networkx.MultiGraph.degree.html
- igraph (R) reference: `degree` https://r.igraph.org/reference/degree.html ; `betweenness`
  https://r.igraph.org/reference/betweenness.html ; `page_rank`
  https://r.igraph.org/reference/page_rank.html ; `cluster_louvain`
  https://r.igraph.org/reference/cluster_louvain.html ; `compare`
  https://r.igraph.org/reference/compare.html
- igraph C source: betweenness https://raw.githubusercontent.com/igraph/igraph/master/src/centrality/betweenness.c ;
  PRPACK graph https://raw.githubusercontent.com/igraph/igraph/master/src/centrality/prpack/prpack_igraph_graph.cpp ;
  Louvain https://raw.githubusercontent.com/igraph/igraph/master/src/community/louvain.c

Comparing measures:

- Chin, C.-H., et al. "cytoHubba: identifying hub objects and sub-networks from complex
  interactome." BMC Systems Biology 8(S4), 2014. doi:10.1186/1752-0509-8-s4-s11 (abstract only, via
  https://api.openalex.org)
- "Identification of hub genes in head and neck squamous cell carcinoma by integrated
  bioinformatics analysis." Frontiers in Oncology, 2020.
  https://www.frontiersin.org/journals/oncology/articles/10.3389/fonc.2020.00681/full (methods and
  results read for the hub selection)
- "Weighted gene co-expression network analysis identifies specific modules and hub genes related
  to coronary artery disease." https://pmc.ncbi.nlm.nih.gov/articles/PMC7988178/ (methods read for
  the hub selection)
- Valente, T. W., Coronges, K., Lakon, C., Costenbader, E. "How Correlated Are Network Centrality
  Measures?" Connections 28(1), 2008 (abstract only, via https://api.openalex.org)

Other research notes in this folder, cited by section: `graph-tools.md`, `graphty-today.md`,
`figma.md`; and the earlier object model, `design/ui/object-first-ux/object-model.md`.

Repository sources:

- Workflows: `design/designloom/workflows/*.yaml` (cited above by title)
- graphty-element graph statistics: `graphty-element/src/session/types.ts` (`GraphStatistics`)
- graphty-element algorithms: `graphty-element/src/algorithms/`; algorithm catalogue with cost
  classes and complexities: `graphty-element/src/catalog/algorithms.ts`
- graphty-element saved scopes: `graphty-element/src/session/scope/ScopeApi.ts` (`SavedScope`)
- graphty-element selection, its cap, `promote` and `statistics`:
  `graphty-element/src/session/selection/SelectionApi.ts`
- graphty-element runs and staleness: `graphty-element/src/session/runs/types.ts` (`StaleNote`,
  `Caveats`), `graphty-element/src/session/runs/RunsApi.ts`
- graphty-element default view mode: `graphty-element/src/config/ViewMode.ts`
- Seeded community detection: `algorithms/src/algorithms/community/leiden.ts`,
  `algorithms/src/algorithms/community/label-propagation.ts`
- `@graphty/algorithms` package: `algorithms/src/`
- graphty-element run identity: `graphty-element/src/session/runs/runId.ts`; run executor, which
  does not read the scope: `graphty-element/src/managers/AlgorithmManager.ts`
- graphty-element per-algorithm weight declarations: `graphty-element/src/algorithms/*Algorithm.ts`
  (for example `DijkstraAlgorithm.ts`, `LouvainAlgorithm.ts`)
- graphty-element reading sentences: `graphty-element/src/session/results/reading.ts`; field plain
  names: `graphty-element/src/catalog/algorithms.ts`
- Capability records: `design/designloom/capabilities/saved-filters.yaml`, `view-bookmarks.yaml`,
  `annotation.yaml`, `analysis-history.yaml`, `node-merging.yaml`, `community-profiling.yaml`,
  `removal-impact-analysis.yaml`, `comparison-view.yaml`, `temporal-analysis.yaml`,
  `temporal-navigation.yaml`, `neighborhood-expansion.yaml`, `ego-network.yaml`, `filtering.yaml`,
  `pattern-search.yaml`, `visual-encoding-edges.yaml`, `legend-display.yaml`, `search.yaml`
- graphty-element multigraph handling: `graphty-element/src/algorithms/utils/snapshotGraph.ts`
  (`toAlgorithmGraph`, `mergedParallelEdges`), `graphty-element/src/managers/AlgorithmManager.ts`
  (the merge caveat), `graphty-element/src/algorithms/DegreeAlgorithm.ts`,
  `graphty-element/src/session/statistics.ts` and `graph-format/src/snapshot/graph-snapshot.ts`
  (`degree()`)

## Follow-up: after a restriction, which numbers the analyst reads

Question: in the filter-then-summary phases of "Visual Exploration - Overview to Detail" and
"Gene List to Interaction Network with Expression Overlay", does the analyst read numbers for the
loaded graph, for the restricted graph, or both side by side?

**Evidence from the two workflows.**
- Visual Exploration lists its information need for the Filter phase as "What percentage of data
  remains, did important nodes disappear?". A percentage is a ratio of the restricted count to the
  loaded count, so both numbers are needed at once; "did important nodes disappear" asks what is
  in the loaded graph and not in the restricted one. The Overview phase reads "Overall network
  size, density, presence of clusters/outliers" over the loaded graph before any filter.
- Gene List to Interaction Network trims in phase 2: "Select the largest connected component and
  make it the working network; unconnected genes are noted but dropped". Its information needs are
  "Count of query genes found vs not found" and "Component sizes so the largest can be selected in
  one click" -- both read over the loaded graph -- and every later phase (join, encode, lay out,
  export) works on the component alone. "Noted but dropped" means the loaded-graph count survives
  as a single remembered fact, not a live second column.
- `graphty-today.md` ("reduce to a subgraph, then read the overview again") coded all 25
  workflows: in 6 of the 7 clear cases the reduced graph is what later work computes over; Visual
  Exploration is the one that reduces only to draw.
- graphty-element already reports both counts: `session.status.counts` carries `nodes` and
  `visibleNodes` (`graphty-element/src/session/GraphSession.ts`), and the element's own usage
  example renders "`visibleNodes` of `nodes`" (`graphty-element/src/graphty-element.ts`).
- Tools: Gephi computes statistics over the visible graph and Cytoscape over a named subnetwork
  (`graph-tools.md`, the follow-up on scope statistics and section 20.7). Neither shows both
  values side by side.

**Answer.** Both, but not symmetrically. The counts (nodes, edges, share remaining) are read side
by side, as "restricted of loaded". Measures (density, components, centralities) are read for ONE
scope at a time: the loaded graph before restricting, the restricted graph after, when the
restriction is a working scope as in the gene-list component. No phase in either workflow asks for
a measure computed over both scopes in adjacent columns.

**Implication.** A summary shows the loaded-graph counts with the restricted counts beside them
whenever a restriction is active (the element already has the numbers), and shows each measure
labelled with the one scope it was computed over. A two-column measure comparison is a comparison
task (Condition Comparison), not the resting summary.

## Follow-up: whether community evolution needs communities matched across windows

Question: "Network Evolution Analysis" computes metrics per time window. If its community-evolution
phase needs a community in one window to be identified with a community in the next, a per-window
scope is not enough and time needs an object of its own.

**Evidence.**
- The workflow's phase 5 is "Community Evolution - Track how communities form, merge, split over
  time"; its information need is "Community evolution mapping (which communities merged/split?)".
  Merge, split and form are relations between a community at one time and communities at another.
  They cannot be read from any single window.
- Greene, Doyle and Cunningham define the object this needs: "each community is characterised by a
  series of significant evolutionary events", and they "motivate a community-matching strategy for
  efficiently identifying and tracking dynamic communities". A dynamic community is distinct from
  the per-step communities it links: it is a chain across time steps, found by matching.
  (Greene, D., Doyle, D., Cunningham, P., "Tracking the Evolution of Communities in Dynamic Social
  Networks", ASONAM 2010, doi:10.1109/asonam.2010.17; abstract read via
  https://api.openalex.org/works/doi:10.1109/asonam.2010.17)
- Palla, Barabasi and Vicsek track overlapping groups "for the first time ... on a large scale"
  and report that large groups persist by changing membership (https://arxiv.org/abs/0704.0744,
  abstract only; the matching mechanism is not in the abstract).
- Rosvall and Bergstrom draw the change between partitions as an alluvial diagram, which relates
  modules by shared members without declaring identity (https://arxiv.org/abs/0812.1242, abstract
  only; `graph-tools.md` section 20.17).
- This note's section on re-runs and names, and `graph-tools.md` section 20.17, already rule that
  the element never promises that a new community IS an old one, and that a carry-over table
  (continues, split, merged, dissolved, with member shares) is a legitimate query over two stored
  partitions.

**Answer.** Yes, community evolution needs matching. But the matching is a RESULT about a series
of partitions, not an identity baked into the time model. What is required:
1. a series result: one partition per window, all from one run with one recipe (the stored form
   in `graph-tools.md` section 20.30);
2. a matching result computed over that series: for each adjacent pair of windows, the
   member-overlap table classified as continues, split, merged, born or died, and from the chains,
   the dynamic communities.

**Implication for "time as scope".** Per-window scope is enough for the metric series (phases 2
to 4). It is not enough for phase 5, but the missing piece is not a Time object on the canvas; it
is a result kind whose rows span windows (a dynamic community, with the windows it lives in and
its events). That is an analysis output, owned by graphty-element beside its other runs. The
window itself stays a scope parameter of the run. If later work needs the same windows reused by
several runs (metrics and communities on identical windows so they line up), the recipe's window
length, step and bounds are the shared value; naming that recipe is cheap and reversible, and the
evidence does not yet require it.

## Follow-up: whether a triage label is an attribute value or a note

Question: in the triage phases of "Anomaly Detection" and "Threat Hunting", is the label the
analyst gives later filtered on, styled by, or exported as a column? If so, it is an attribute
value, not a note.

**Evidence.**
- Anomaly Detection, phase 6: "Classification - Label as error, threat, or genuine discovery".
  Its output is a "Prioritized anomaly list with classification and evidence", and its success
  criterion is "Anomalies correctly labeled as error/threat/discovery" -- a criterion that is
  counted over the set of labelled nodes, so the label must be queryable as a closed set of values.
  Phase 4, "Triage - Rank anomalies by severity, group similar ones", groups by a value.
- The anomaly-detection capability already stores its machine output as attributes: "Store
  anomaly score as node attribute named 'anomaly_score'", "Store anomaly type as node attribute
  named 'anomaly_type'", and "Support filtering to show only nodes above anomaly score threshold"
  (`design/designloom/capabilities/anomaly-detection.yaml`). The human classification is the
  next column beside those two.
- Threat Hunting, phase 4: "Result Triage - Review matches, investigate promising ones, filter
  noise"; phase 6: "if not, document hunt"; output "Threat findings or documented negative hunt".
  Filtering noise needs a per-match value (true positive, false positive); documenting the hunt is
  prose. The cybersecurity persona "Creates timeline visualizations showing attack progression for
  incident reports", which is styling and export of the found set.
- Tools: Cytoscape makes user-added values columns ("A new column can be created using the Create
  New column button, and must be one of four types - integer, string, real number (floating
  point), or boolean"), and the table exports whole ("Export Table to File")
  (https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html). Linkurious puts a
  status (In progress, Confirmed, Dismissed) on the alert case and a free-text note beside it
  (this note's section on structured judgment).

**Answer.** Yes on all three counts. The triage label is filtered on (show only threats, hide
false positives), grouped and styled by (colour by classification), and exported (the prioritized
list with its classification). It is an attribute value on the node or edge, with a small closed
set of values the analyst defines, and it lives in the same place as `anomaly_score` and
`anomaly_type`. The reasoning ("why I called this a threat") is a note attached to the element.
The two travel together, as in Linkurious, but they are two things: the value is data the
selector, style and export grammars can read; the note is text they cannot.

**Implication.** Setting an attribute value on the current selection is an element operation
(write a user column, undoable, saved in the project file), reachable from the inspector's
attribute rows the way any value is edited. No separate "label" object is needed.

## Follow-up: which filter and scoping steps read topology, and when step order matters

Question: in the 25 workflows, which steps narrow or scope the graph, and which of them read
topology (a component, a k-core, degree or a neighbourhood computed after an earlier step)? This
decides whether the steps of a filter are always shown numbered, or only once order starts to
matter.

Every filter or scoping step in the task phases of `design/designloom/workflows/*.yaml`:

| Workflow | Step, quoted or close paraphrase | Reads | Topology after an earlier step? |
|---|---|---|---|
| First Exploration - Quick Data Assessment | "does it require sampling/filtering?" | size only | no |
| Visual Exploration - Overview to Detail | "Filter - Remove uninteresting elements" | attributes (unspecified) | no |
| Community Analysis | input "typically giant component" | component | only if made in-app after a cutoff |
| Path Investigation | "Show path in context of surrounding network" | neighbourhood of a path result | yes (after path finding) |
| Fraud Ring Investigation | "1-2 hop neighborhood" of the flagged entity, then "Expand investigation to find all connected suspicious entities" | neighbourhood, then component restricted to suspicious nodes | yes (expansion over the attribute-filtered graph) |
| Threat Hunting | "filter noise"; "expand or narrow scope" | pattern matches, then neighbourhood | yes |
| Drug Target Discovery | "Define the disease-relevant subnetwork (proteins close to disease genes)" | distance from a seed set | yes (after network construction and merge) |
| Criminal Network Analysis | "Define scope, identify seed entities, establish time frame" | seeds, time attribute | no |
| Influencer Identification | "Segment" by centrality type | computed metrics | metric, not topology |
| Supply Chain Risk Assessment | "What if supplier X fails?" (removal, then recompute) | removal of named nodes, then centrality over the rest | yes (recompute after removal) |
| Anomaly Detection | "z-score outliers, distribution tails" | computed metric | metric, not topology |
| Findings Communication | "Filter to relevant subset" | unspecified, for drawing | no |
| Graph-Based Recommendation | restrict to one node type (bipartite projection, per the top-task list) | node-type attribute | no |
| Hub Investigation | hubs by degree, then "View the hub's immediate neighborhood" | degree, then neighbourhood | yes |
| Network Evolution Analysis | "Define time windows" | time attribute | no |
| Gene List to Interaction Network | "confidence cutoff (0.4 default...)", then "Select the largest connected component and make it the working network" | edge attribute, then component | **yes -- the clearest case** |
| Cluster and Functionally Annotate | "drop clusters below 3 or 4 nodes" after clustering | community size | yes (a result computed after an earlier step) |
| Enrichment Map | "Slide the node q-value and edge similarity cutoffs to thin the map" | two attributes | no (both are attribute cutoffs) |
| Hub Gene Identification and Ranking | "Select the top N, expand one step around them" | computed rank, then neighbourhood | yes |
| Condition Comparison | union, intersection or difference; then "filter to the largest changes" | set operation, then a score computed on the merge | metric after a set operation |
| Reproducible Session | records "filters" among the saved state | -- | -- |

No workflow names a k-core. Iterative Analysis Cycle, Knowledge Graph Construction, First-Time
User Onboarding and Data Import and Validation have no filter step.

**Count.** 20 workflows scope the graph. 10 contain a step that reads topology over the output of
an earlier step (Path Investigation, Fraud Ring, Threat Hunting, Drug Target Discovery, Supply
Chain, Hub Investigation, Gene List, Cluster and Annotate, Hub Gene, and Community Analysis if
its giant-component input is made in-app after a cutoff). 7 use attribute cutoffs only
(First Exploration, Visual Exploration, Criminal Network, Findings Communication, Recommendation,
Network Evolution, Enrichment Map). 3 cut on a computed metric (Influencer Identification,
Anomaly Detection, Condition Comparison). In 8 of the 10 topology workflows the topology step
comes second or later; Fraud Ring and Hub Investigation open with one.

**Why order matters only there.** Attribute cutoffs are a conjunction: "confidence > 0.4 AND
q < 0.05" selects the same elements in either order, so a numbered list would promise an order
that means nothing. A topology step does not commute: the largest component after a confidence
cutoff is a different node set from the cutoff applied to the largest component of the raw graph
(the first can split a component the second kept whole). Cytoscape draws exactly this line: its
narrowing filters are combined by "Match all/any" -- "By default, nodes and edges need to satisfy
the constraints of all your filters" -- while its transformers (Node Adjacency, Edge Interaction)
form an ordered chain: "Chainable filters are combined in an ordered list. The nodes and edges in
the output of a transformer become the input of the next transformer in the chain"
(https://manual.cytoscape.org/en/stable/Finding_and_Filtering_Nodes_and_Edges.html).

**One trap.** Cytoscape's Degree filter is a narrowing filter because it reads degree on the whole
network, so it commutes. The top-task list states that "Always-available properties (degree,
component membership, core number) follow the filter in force". Under that rule a degree
cutoff is order-dependent, exactly like a component step. So the trigger for numbering is not
"a topology column appears" but "a step reads a value computed over the output of an earlier
step" -- degree, component, core number, neighbourhood, or a run whose scope is the filter.

**Answer.** Show steps unnumbered (an AND list, as Cytoscape and Gephi's top-level query list do)
while every step is an attribute cutoff, and switch to a numbered, reorderable list from the first
step that reads a value computed over the steps above it. On today's workflows that is 10 of 20
scoping workflows, from step two onward in 8 of them.

## Follow-up: whether link-prediction pairs need a place in the ontology

Question: link prediction returns scored pairs of nodes that are not connected. Does such a
pair-list result need an object of its own in the ontology, or only a table and an export?

What the requirements ask for (`design/designloom/capabilities/link-prediction.yaml`, status
"planned", used only by "Graph-Based Recommendation"):

- "Rank unconnected node pairs by selected prediction score descending"; "Display top-N predicted
  links with configurable N from 10 to 1000 (default 50)".
- "Filter predictions to specific node type pairs"; "Filter predictions to nodes within N hops of
  specified seed node".
- "Display predicted link with source, target, score, and common neighbor count".
- "Allow clicking predicted link to visualize the two nodes and their common neighbors".
- "Export predictions as CSV with columns: source, target, score, algorithm".

The workflow itself ("Graph-Based Recommendation", persona the ML engineer building recommender
systems, starting at 10,000 to 10,000,000 nodes) ends in "Deployment - Integrate into
production system" and measures "Precision@10 > baseline". Its output is "Top-N recommendations
per user + evaluation metrics" -- a table that leaves graphty.

What graphty-element provides: the `pair-list` shape publishes one graph-level field, `pairs`
("One row per scored pair of elements, best first"), no node field and no edge field, and its
layer role is `"none"` ("read as tables and numbers and drive no layer at all")
(`graphty-element/src/session/results/types.ts`). No registered algorithm has this shape:
`link-prediction` is one of four `KNOWN_ALGORITHMS` the catalogue says "are not registered by
this package and therefore have no descriptor here" (`graphty-element/src/catalog/algorithms.ts`),
although `@graphty/algorithms` ships common-neighbours and Adamic-Adar
(`algorithms/src/link-prediction/`). The cost gate already refuses a pair list over 2^32 - 1
candidate pairs (`session/cost/estimate.ts`, `MAX_COLUMN_LENGTH`).

Precedents:
- NetworkX returns "An iterator of 3-tuples in the form (u, v, p)"
  (https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_prediction.adamic_adar_index.html)
  -- a table, nothing on the graph.
- Gephi's Link Prediction plugin goes the other way: "n new edges are added to the graph
  iteratively", each carrying the algorithm, "Added in run" and "Last link prediction value",
  and the plugin's filter then shows the first n added edges
  (https://github.com/gephi/gephi-plugins/blob/link-prediction-plugin/modules/LinkPrediction/README.md).
  That mutates the data: predicted edges then feed degree, communities and paths unless filtered
  out, which is the silent contamination graphty's principles forbid.

**Answer.** No new object. A pair list is a result (one record, like any run) whose values are a
table rather than a column, so it takes the pattern already set for a partition's groups and a
path family's paths: rows of a sortable table reached from the result's inspector. Every
requirement maps onto existing parts: top-N and "within N hops of a seed" are the run's
parameters and scope; filtering by node-type pair is a table filter; clicking a row is an
ordinary selection of the two endpoints plus their common neighbours; Keep on that selection
makes a set; export is the table's CSV export. A row is addressed by "result plus row", like a
community. The one thing to rule out is Gephi's move of writing predictions as edges into the
graph: if a reader wants to draw predicted links, they should be a display of the table (dashed,
never in the data), not edges every other algorithm would count. A single workflow, marked
"planned", with an expert persona and an output that leaves the tool, does not justify a
primary object.

## Follow-up: re-evaluation and silent staleness in three walks, and finding last week's Louvain resolution

Question: walk "Iterative Analysis Cycle", "Community Analysis" and the top task "Re-run an
analysis on new data" through the model as recorded in `key-insights.md` (sections 1.4 to 1.16)
and the requirements in `top-tasks.md`. Count (a) points where the analyst must remember to
re-evaluate something, and (b) points where a list goes silently stale. Then time the path to
"the Louvain resolution I used last week".

The rules applied: a measure is revised in place on a tuning re-run, the earlier run kept as
history; a labelled partition is not revised in place, a re-run lands beside it; counts, degree,
components, rule sets and style layers follow the data; centrality, communities, paths and
layouts hold and are marked out of date where their values are read; fixed sets and notes never
go out of date, only lose members; a scoped result carries a neutral label, not a warning;
Replace data replays rules and parameters and matches communities by overlap.

**Iterative Analysis Cycle**

| Phase | Event | Remember to re-evaluate | Silent stale list |
|---|---|---|---|
| Explore | narrow the filter after running betweenness and Louvain | no: the scoped label says "over 5,310 nodes; 1,204 shown" | -- |
| Hypothesize | Keep "top 20 by betweenness" as a fixed set | -- | -- |
| Test | tune betweenness (sample size, weight) -- revised in place | **yes**: the kept top-20 set is not rebuilt, and nothing prompts it | **yes**: the set's origin still reads "top 20 by betweenness" while the measure now ranks a different top 20 |
| Test | same tuning | -- | **yes**: a named filter (a rule) reading `betweenness > x` changes members with no notice; it follows by design, but "follows" is invisible |
| Refine | fix a weight or merge duplicates | **yes**: re-run every held result (one action each); they are marked out of date | **yes, today only**: the element's staleness digest covers node and edge ids, not weights or attributes (`graphty-today.md` 7.1), so a weighted betweenness stays "current" |
| Conclude | export | **yes**: nothing stops an export of out-of-date values | -- |

Totals: 3 remember points, 3 silent stale lists (one of them an element defect, not the model).

**Community Analysis**

| Phase | Event | Remember | Silent stale |
|---|---|---|---|
| Detection, Validation | Louvain, read modularity | -- | -- |
| Validation | tune resolution before labelling -- revised in place | -- | **yes**: "within each group" profiles (density, internal hubs) computed on the old partition. Staleness tracks data, not results, so a result that depends on another result is not flagged |
| Characterization | label 15 communities | -- | -- |
| Validation | tune resolution after labelling -- re-run lands beside | **yes**: which partition carries the paint and the labels; the analyst must move them by choice | -- |
| Boundary Analysis | bridge nodes as a rule (betweenness plus neighbours in two or more groups) | -- | **yes**: the rule reads whichever partition the stable id names; after a re-run beside it, it silently still reads the old one (or the new one, if the id was rebound) |
| Inter-community map | collapsed display of the partition | -- | -- (a display follows its partition) |

Totals: 1 remember point, 2 silent stale lists. Both silent cases have the same cause: a result
computed from another result (within-group profiles, a bridge rule) has no dependency record, so
the model's "out of date where read" cannot fire.

**Re-run an analysis on new data (Replace data)**

| Event | Remember | Silent stale |
|---|---|---|
| rules, filters, runs and bound style layers replay | -- | -- |
| layout | **yes**: positions hold; new nodes need placing | -- |
| communities matched by overlap | **yes**: review weak matches, and relabel new communities | **yes** unless each match shows its overlap: a 40 per cent match carries last week's label as confidently as a 95 per cent one |
| fixed sets carried by node id ("top 20 hubs", "confirmed ring") | **yes** for sets that came from a ranking | **yes**: this week's new hub is not in last week's top-20 set, and a missing-members count does not reveal a missing newcomer |
| notes pinned to nodes | -- | no: a note on a removed node shows "missing" |

Totals: 3 remember points, 2 silent stale lists.

**Overall.** 7 remember points and 7 silent stale lists across the three walks. Three
model changes would remove 5 of the 7 silent cases: (1) a fixed set that came from a ranking or a
result records that origin and shows "origin revised" when the measure moves; (2) a result
computed from another result (a within-group run, a rule reading a partition) records that
dependency and goes out of date with it; (3) every overlap match shows its overlap. The
remaining remember points (re-run after a data fix, relabel, lay out new nodes) are intended:
the principle that the app never acts unasked puts them on the analyst.

**Finding last week's Louvain resolution.** Timed with the keystroke-level model (Card, Moran and
Newell, "The keystroke-level model for user performance time with interactive systems",
Communications of the ACM 23(7), 1980: mental preparation 1.35 s, point 1.1 s, click 0.2 s,
keystroke about 0.28 s for an average typist). Opening the project is not counted.

| Route to the result record | Steps | Time if last week's run is still current | Time if it was tuned since |
|---|---|---|---|
| Left panel: select the Louvain partition, read its parameters in the inspector | M, point-click panel, point-click row | about 4.0 s | plus open the run list, scan, click: about 7.0 s |
| Canvas: click a community-coloured node, open (i) on its community value | M, point-click node, point-click (i) | about 4.0 s, only if a Louvain layer is painted | not reachable: the canvas shows only the current run |
| Command palette: type "louvain", Enter | M, two keys, seven keys, Enter | about 4.2 s | plus the run list: about 7.2 s |

All three routes need the earlier run's **record** to still exist. Today it does not: an
author-assigned id is rebound only by remove-then-start, which "deletes the old result, with no
way back (there is no history)" (`graphty-today.md` 7.22), and `key-insights.md` 1.5 keeps the
earlier run only as an undo step, which does not survive closing the project. So under the
recorded model the answer to "what resolution did I use last week" after a tuning re-run is
"unrecoverable" in every route, unless the project file keeps each measure's run records. A
run record is parameters and provenance -- a few hundred bytes -- so keeping every record is free;
the cost question is only whether the previous run's values are kept too (see the follow-up on
column size in `graphty-today.md`). The top-task list's wording ("the earlier run stays in the
tree") and `key-insights.md` 1.5 ("reachable by undo") disagree here, and the ontology should
settle it in favour of the tree.

## Follow-up: whether a threshold feeds a later computation or only thins the display

Question: in the nine workflows that name a threshold, a pruning cutoff or a backbone, does the
cut feed a computation that comes after it, or is it applied to values already computed, for
reading and reporting? This decides what a new run reads by default while a filter is on.

Read from the task phases, decision points and success criteria in
`design/designloom/workflows/`:

| Workflow | The cutoff, quoted | What it cuts on | What comes after it |
|---|---|---|---|
| Drug Target Discovery | "What confidence threshold for PPI data?"; "Define the disease-relevant subnetwork" | imported edge confidence, then distance to disease genes | "Rank proteins by centrality" over that module: **feeds** |
| Gene List to Interaction Network with Expression Overlay | "choose ... a confidence cutoff (0.4 default, 0.7 or 0.9 for high confidence)", then "Select the largest connected component and make it the working network" | imported edge confidence, then component | layout and every later reading use the working network: **feeds** |
| Enrichment Map - Pathway Similarity Network | "Slide the node q-value and edge similarity cutoffs to thin the map; re-run layout", then "Cluster the map" | imported q-value and similarity | layout and clustering run on the thinned map; success needs "q-value and similarity cutoffs appear in the exported report": **feeds** |
| Knowledge Graph Construction | "What confidence threshold for entity resolution matches?" | match confidence | merges nodes, so it changes the graph itself (a data edit, not a filter): **feeds** |
| Influencer Identification | "What's the minimum audience size threshold?" | a computed or imported score, after "Compute Metrics" | ranking and selection only: **display** |
| Hub Investigation | "What degree threshold defines a 'hub'?" | degree, computed | picks hubs to inspect; the ego network is read around them, no metric is recomputed on the cut: **display** |
| Network Evolution Analysis | "What constitutes a 'significant' change?" | a change score, computed per window | flags events; the windows themselves (a scope) feed the per-window metrics, the significance cut does not: **display** |
| Hub Gene Identification and Ranking | "Top 10, top 5 percent, or a score threshold?" | combined rank, computed | selection, labels and the exported table; success is "Top-10 hubs with at least three metrics each": **display** |
| Condition Comparison - Disease vs Control Networks | "Which metric defines 'rewired', and what threshold?"; "filter to the largest changes" | a difference score, computed | the rewired-gene table: **display** |

**Count.** 4 of 9 feed a later computation and 5 are display or selection only. The split is
clean along one line: every cut that feeds is on **imported data** (edge confidence, q-value,
similarity, match confidence) and comes first, as part of building the network; every cut that
is display-only is on a **value the analysis computed** and comes after that computation. No
workflow computes a new measure over the survivors of a cut on a computed score. (The hub gene
protocol cited by Hub Gene Identification thresholds a co-expression edge list at correlation
above 0.1 before computing degree -- again an imported-edge cut feeding the computation,
https://pmc.ncbi.nlm.nih.gov/articles/PMC12457846/ as summarised in the workflow's sources.)

EnrichmentMap confirms the building reading for its own cutoffs: "For a gene set to be included
in the enrichment map it needs to pass both p-value and q-value thresholds", and "Edge specific
parameters control the number of edges that are created in the enrichment map"
(https://enrichmentmap.readthedocs.io/en/latest/Parameters.html). Gene List to Interaction
Network uses Cytoscape's explicit step for the same thing, "make it the working network".

**What it means for the default scope of a new run.**
- If a new run read the whole filtered graph, the display cuts would corrupt the next number:
  in Hub Gene Identification, a "top 10" filter left on while a fourth centrality is added would
  compute that centrality over 10 nodes. That is the case the analyst meets most (5 of 9).
- If a new run always read the loaded graph, the building cuts would be ignored: in Enrichment
  Map the clustering would run on the unthinned map, and in Gene List the layout would include the
  dropped isolates.
- A rule that satisfies all nine: a new run reads the graph after the filter steps that cut on
  imported data, and not after steps that cut on a computed value; a step on a computed value is
  display-only unless the analyst turns it into a working set. The run's record line names the
  steps it honoured. This agrees with the model's "no cycles" rule (a scope may not read the value
  being computed) and generalises it from "the same result" to "any result".
- graphty-element cannot express either default today: every run computes over the whole loaded
  graph whatever scope it records (`graphty-today.md` 7.7).

## Follow-up: what analysts compare -- two runs of one measure, two measures, or two graphs

Question: is a comparison between two runs of one measure, between different measures, or between
two graphs? This decides whether the app needs a list of each result's runs, or whether a run
record in the column's popover is enough.

**The capability.** `design/designloom/capabilities/comparison-view.yaml` names three kinds:
"temporal comparison (before/after), algorithm comparison (Louvain vs Infomap), or scenario
analysis (what-if)", and its requirements load "different temporal snapshots" or "different
algorithm results" into two synchronized canvases. Two runs of one algorithm with different
parameters are not among its examples.

**The workflows**, every comparison found in steps, decision points and success criteria:

| Workflow | What is compared | Kind |
|---|---|---|
| Iterative Analysis Cycle | "Test -- Apply appropriate algorithms, validate against baselines"; needs "comparison to null models/baselines"; explore phase needs "Multiple centrality measures" | result against a null-model baseline; several measures |
| Condition Comparison - Disease vs Control Networks | two condition networks: union, intersection, difference, "Per-node metric values in each condition and their difference", two synchronized views | two graphs, same measure on each |
| Network Evolution Analysis | metrics per time window, "which communities merged/split" | two or more graphs (windows) |
| Supply Chain Risk Assessment | what-if removal against the intact network | two graphs (with and without) |
| Hub Gene Identification and Ranking | "Overlap between top-N lists of different methods"; success "User can see which hubs appear in the top 10 of more than one method" | different measures |
| Community Analysis | decision point "Are communities stable across different algorithms/parameters?" | different algorithms; runs of one algorithm |
| Cluster and Functionally Annotate a Molecular Network | decision point "Which clustering method and granularity (inflation, resolution)" | runs of one algorithm |
| Anomaly Detection | deviation from a baseline of normal | value against a baseline statistic |

**Count.** Different measures: 3 workflows, one with a success criterion. Two graphs (conditions,
windows, what-if): 3, two with success criteria. Against a baseline or null model: 2. Two runs of
one measure: 2, and in both only as a **decision point** (choosing a resolution or checking
stability), never as a step or a success criterion.

**Reading.**
- The dominant comparison is between **columns on the same elements** (two measures) or between
  **two graphs**. Neither needs a list of one result's runs: the first is two attribute columns
  side by side (Hub Gene's "ranked table with all metrics side by side"), the second is the
  comparison surface over two graphs.
- Run against run appears only while tuning, and what the analyst needs then is "which resolution
  gave this" and "did the groups move" -- a record per run plus one "Compare with earlier run"
  action. A popover on the column listing its runs (parameters, scope, when) with that action
  covers it; a standing list of runs in the tree is not required by any workflow.
- The finding that does need an object is the baseline: a null-model comparison produces a
  z-score and a distribution that must be citable in the Iterative Analysis Cycle's "Evidence
  summary, confidence level". That is a result of its own (the model's comparison result), not a
  run list.

## Follow-up: when analysts read notes, and whether a note must record what it was written against

Question: do analysts read notes while working on a selected object, or when reviewing all notes
together; and must a note automatically record the results and the scope it was written against?

**Reproducible Session and Network Publication.** Notes are written and read at the END:
"Tidy the session -- Rename networks ..., delete dead ends, add text annotations and a legend to
the canvas", then "Record parameters -- For every algorithm and import, collect the parameters
(species, confidence cutoff, clustering inflation, FDR cutoff, similarity cutoff, weight
attribute) into a methods paragraph". The pain point is "Hunting through dialogs to recover the
parameters used weeks ago"; the success criterion is "All parameters for every analysis available
as copyable text".

**Iterative Analysis Cycle.** Documentation happens at "Refine -- Document findings, generate
follow-up questions", and the output is "Documented findings with confidence levels and
limitations". Pain point: "Difficulty documenting analysis path for reproducibility"; success:
"Analysis steps documented for replication". Nothing in either workflow reads a note while
inspecting one object.

**The per-object case exists elsewhere.** Fraud Ring Investigation's "Evidence Documentation --
Capture the evidence chain for each finding" (success: "Complete documentation for each
determination") and the Intelligence Analyst's pain "Difficulty documenting evidence for links"
(`personas/intelligence-analyst.yaml`) write notes against one node or edge and need to see them
when that object is selected again.

**Figma splits the two readings the same way** (`figma.md` 4.11): the list of all comments is a
mode that replaces the inspector, with search, sort and filter, and "a selected layer's
inspector has no comment section"; the note that travels with an object is the Dev Mode
annotation, stored on the node and drawn beside it.

**Answer.**
- Reading together is the primary route: both workflows that are about notes review them all at
  the end, turning them into a methods paragraph and findings. A notes list (filterable by target
  and by the result cited) is required.
- Reading at the object is secondary but real for the investigative personas: the selected
  object's inspector should show a count of notes on it and open them, not list their text.
- Yes, a note must record automatically what it rests on, and that is MORE than the run: the
  parameters the methods paragraph must report include the confidence, FDR and similarity cutoffs,
  which are filter steps (scope), not algorithm parameters, and Enrichment Map's success criterion
  is that the "q-value and similarity cutoffs appear in the exported report". A note that cites
  only its runs would lose them; it should cite the runs and the scope in force (the filter steps
  with their values) at the moment of writing. The run record already carries its own scope, so
  the extra case is a note written with no run in context.

## Follow-up: whether any workflow acts on a kept path's order, length or cost, or on which tie it is

Question: once a path has been kept (Create path turns a found path into a path object,
`conceptual-model.md` 2.5), does any workflow step read or act on its order, its length or its
total cost, or tell equal-length shortest paths apart? This decides which of those a path object
must carry and which can stay on the search result.

**Supply Chain Risk Assessment and Hub Investigation: no.** Neither names a path in its task
phases, decision points or information needs (`design/designloom/workflows/W11.yaml`,
`W17.yaml`). Supply Chain's paths are implicit in "Find high-betweenness nodes (bottlenecks)" and
"What if supplier X fails?", both of which read shortest paths in aggregate and never one path.
Hub Investigation reads the ego network, which is a neighbourhood, not a path. The supply-chain
persona "Identifies alternative paths and backup suppliers for critical components"
(`personas/supply-chain-analyst.yaml`), which is a k-shortest or all-paths query answered at
search time.

**Across all 25 workflows**, every step that reads a path, and when it reads it:

| Workflow or capability | Step, quoted | Reads | When |
|---|---|---|---|
| Path Investigation | "Path length (number of hops)"; "Each step with edge type/label (how are consecutive nodes related?)"; success: "User can explain what each step means" | length; order | on the found path; the explanation is the reading of a kept or found path in order |
| Path Investigation | "If multiple paths exist, compare lengths and intermediates"; "Alternative paths count and their lengths"; "Common intermediate nodes across paths" | the set of ties, and the nodes they share | on the search result, before keeping |
| Fraud Ring Investigation | "Paths to known fraud cases"; the persona "Traces multi-hop paths to follow money through layering schemes (A->B->C->D)" | order | a hand-built trail, extended hop by hop, so order is its content |
| Removal Impact Analysis (used by Supply Chain and Criminal Network Analysis) | "Identify paths between specific node pairs that become broken after removal" | whether a path between a pair still exists | after a scenario; a question about the pair, not about one kept path |
| Shortest Path Finding | "Return path length as hop count for unweighted, total weight for weighted"; "Find all shortest paths when multiple paths of equal length exist"; "Report count of shortest paths found"; "Allow stepping through path nodes one at a time" | length or total weight; tie count; order | on the result |
| All Paths Finding | "Export path list as CSV with columns: path_id, length, node_sequence" | order and length, per path | on the result's list |
| Path Highlighting | "Number path nodes sequentially"; "'Path length: N hops' or 'Weight: X.XX'" | order; length or weight | on whatever path is drawn |

(Sources: `design/designloom/workflows/W05.yaml`, `W06.yaml`, `W09.yaml`, `W11.yaml`, `W17.yaml`;
`design/designloom/capabilities/shortest-path.yaml`, `all-paths-finding.yaml`,
`path-highlighting.yaml`, `removal-impact-analysis.yaml`; `personas/fraud-analyst.yaml`.)

**Answers.**
- **Order: yes, after keeping.** Explaining "what each step means" and tracing A->B->C->D read a
  path in order, and the fraud trail is built by hand, so it is a kept object from its first hop.
  The model already stores order (a start node plus an ordered edge sequence).
- **Length: yes, as a read-only property.** It is displayed and exported. It is derivable from the
  edge sequence, so it is a property row, not stored state.
- **Total cost: no workflow reads it after keeping.** Weighted cost appears only in the
  capability files, on the result ("total weight for weighted") and on the highlight label. The
  one workflow decision about weights ("Should edge weights be considered?", Path Investigation)
  is made before the search. A kept path's cost is derivable from its edges and the weight
  attribute; the only thing a path object must keep is which attribute and role the search read,
  which the result record already holds (`conceptual-model.md` 2.5).
- **Telling equal-length shortest paths apart: only before keeping.** Every tie step (count,
  compare, common intermediates) acts on the set of ties on the search result. No step keeps two
  ties and then acts on which is which. Keeping one tie turns it into an ordinary path; the fact
  that it was "one of 4 shortest paths" is a record fact, readable under Details.
- **After a scenario, the question is about the pair, not the kept path.** Removal Impact asks
  whether a pair is still connected; that is a re-query over "the graph without S". A kept path
  whose edges are removed is covered by the existing freshness rules (missing members, or
  Detached).

## Follow-up: whether an analyst can predict a run's default scope from the filter steps on screen

Question: the proposed default is that filter steps that cut on imported data apply to later runs
and steps that cut on computed values do not (the follow-up above, "whether a threshold feeds a
later computation or only thins the display"). Tested against the nine workflows that apply a
threshold: is the rule right for each, and can the analyst tell from the filter list which steps a
new run will honour?

| Workflow | The step as it would read in the filter list | Origin of what it reads | The rule says | The workflow needs | Match |
|---|---|---|---|---|---|
| Drug Target Discovery | "confidence >= 0.7" | imported | feeds | feeds | yes |
| Drug Target Discovery | "within 2 hops of disease genes" | topology, computed on the fly | display | feeds ("Rank proteins by centrality" over that module) | **no** |
| Gene List to Interaction Network | "confidence >= 0.4" | imported | feeds | feeds | yes |
| Gene List to Interaction Network | "largest connected component" | topology, always available | display | feeds ("make it the working network") | **no** |
| Enrichment Map | "q-value <= 0.05", "similarity >= <cutoff>" | imported | feeds | feeds | yes |
| Knowledge Graph Construction | "match confidence >= 0.9" | a merge, which edits the data | outside the rule | a data edit, not a filter | n/a |
| Influencer Identification | "audience >= 10,000" | imported follower count, or a computed reach score (the workflow allows both) | feeds if imported, display if computed | display (ranking and selection) | **only if computed** |
| Hub Investigation | "degree >= 50" | always available, computed live | display | display; a later "network average" profile must not shrink to the hubs | yes, if degree counts as computed |
| Network Evolution Analysis | "change > 2 sd" | computed | display | display | yes |
| Hub Gene Identification | "top 10 by mean rank" | computed (an expression over results) | display | display | yes |
| Condition Comparison | "abs(logFC difference) >= 1" | computed | display | display | yes |

(Workflow steps from `design/designloom/workflows/W08.yaml`, `W20.yaml`, `W22.yaml`, `W13.yaml`,
`W10.yaml`, `W17.yaml`, `W19.yaml`, `W23.yaml`, `W24.yaml`; the attribute origins from
`conceptual-model.md` 3.1. The predicates are illustrative forms of the quoted steps in the
previous follow-up; the cutoff values are examples.)

**The rule as stated fails three ways.**
1. **Topology steps feed, but they are computed.** A component, a k-core or a distance-to-seeds
   step is a value computed from the graph, and in both workflows that use one it builds the
   network the later runs must read. So "computed" has to mean a value an analysis produced (an
   attribute of origin result or computed), not "anything that is not in the file".
2. **Degree sits on the fence.** It is an always-available metric like component membership, yet
   Hub Investigation needs a degree cut to be display-only, and Gene List needs a component cut to
   feed. No origin-based rule separates them; what separates them is intent -- building the
   network versus picking what to look at.
3. **An imported score can be a display cut.** An imported follower count or an imported
   centrality from another tool is origin imported, but "audience >= 10,000" in Influencer
   Identification only picks whom to read. Under the rule the next centrality would compute over
   the survivors, which is the Hub Gene "top 10" corruption the rule was written to prevent.

**Can the analyst predict it from the screen? Not from the predicate alone.** A step row shows an
attribute name and a comparison ("degree >= 50", "audience >= 10,000"). Nothing in the name tells
the analyst the attribute's origin, and origin is exactly what the rule turns on. The analyst would
have to know that "audience" came from the file and "reach" from a run, and that "degree" counts as
computed while "largest connected component" does not. That is the silent-scoping hazard the
model exists to avoid: Gephi's defect was a scope the reader could not see
(`graph-tools.md`, "Follow-up: what scope statistics are computed over in Gephi and Cytoscape").

**What would make it predictable.** Make whether a step feeds runs a visible, switchable property
of the step, defaulted by the rule, as the working-set kind already is (`conceptual-model.md` 5.2:
the kind is visible on the row and switched by one checkable menu item):
- The default by what the step reads: imported, joined or authored attributes, and topology
  steps (component, k-core, neighbourhood, distance to a set) feed; attributes of origin result or
  computed, and every relative cut (top N, percentile, z-score, which read a population), do not.
- A step that runs do not read looks different on its row (for example a muted row with "Display
  only" as its one-word tag), and its menu has one checkable item to switch it. Degree cuts and
  imported scores are the two places the default is wrong for some workflows, and the switch is
  one click from the row that shows the problem.
- The run's record line names the scope as a fact ("on: 1,204 of 5,310 nodes, 2 of 3 filters"),
  and the ignored step is named under Details, so the number states what it was computed over.

With that, the analyst predicts the scope from the filter list itself: every row without the tag
feeds the next run. Without it, the rule is right for five of the nine workflows (six if the influencer score is
computed; Knowledge Graph Construction is a data edit, not a filter), and predictable in none.

## Follow-up: whether betweenness on a 2-hop expansion ranks like betweenness on the full graph

**Question.** An investigator in "Fraud Ring Investigation" expands a flagged entity two hops
into a working set and runs betweenness there. A run on a working set carries no scope mark today
(`conceptual-model.md` 5.3: "the run goes ahead and carries no mark"). If the ten highest values
inside the expansion rank almost as they would on the full graph (Spearman rho above about 0.9),
a mark saying "computed inside the expansion" adds nothing and can go.

**No Fraud Ring sample exists to run it on.** `graphty/src/data/sampleManifest.ts` states that the
fraud ring sample was never made and that shipping one "would mean fabricating a dataset". The
test was therefore run on the two real samples graphty ships (`graphty/public/samples/karate.gml`,
`football.gml`), NetworkX's Les Miserables graph, and four synthetic sparse graphs of the size
the workflow names (10,000 to 1,000,000 nodes, sparse): a heavy-tailed clustered graph
(`powerlaw_cluster_graph(n, 2, 0.1)`) and a random graph with average degree 3, at 2,000 and
10,000 nodes. Synthetic graphs are a stand-in for transaction structure, not evidence about real
fraud data.

**Method.** For 30 random seeds per graph: take the 2-hop ego graph (NetworkX `ego_graph`,
radius 2), compute betweenness inside it, take its ten highest nodes, and correlate those ten
values with the same nodes' betweenness on the full graph (SciPy `spearmanr`). Full-graph
betweenness on the 10,000-node graphs used 500 sampled pivots. Expansions under 12 nodes were
skipped. Also recorded: how many of the expansion's top ten are also the top ten of the
expansion's nodes by full-graph betweenness, and how often the seed itself ranks first inside its
own expansion.

| Graph | Expansions | Median size | Median rho (IQR) | Share with rho > 0.9 | Median top-10 overlap | Seed ranks first inside |
|---|---|---|---|---|---|---|
| Karate club, 34 nodes | 27 | 22 | 0.71 (0.66 to 0.79) | 15% | 7 of 10 | 7% |
| Les Miserables, 77 nodes | 27 | 38 | 0.50 (0.25 to 0.72) | 19% | 7 of 10 | 0% |
| College football, 115 nodes | 30 | 52 | 0.53 (0.22 to 0.62) | 0% | 2 of 10 | 43% |
| Heavy-tailed, 2,000 nodes | 26 | 28 | 0.19 (-0.05 to 0.43) | 4% | 4 of 10 | 19% |
| Random, avg degree 3, 1,875 nodes (largest component) | 17 | 18 | 0.28 (0.08 to 0.53) | 0% | 6 of 10 | 71% |
| Heavy-tailed, 10,000 nodes | 28 | 33 | 0.23 (0.04 to 0.35) | 0% | 4 of 10 | 32% |
| Random, avg degree 3, 9,403 nodes (largest component) | 13 | 15 | 0.08 (-0.03 to 0.34) | 0% | 7 of 10 | 85% |

**Result: rho is far below 0.9, and falls as the graph grows and gets sparser.** At the
workflow's size the median is 0.1 to 0.25; no 10,000-node expansion reached 0.9. The mechanism is
structural, not noise: every node on the second ring has lost all of its outward edges, so its
betweenness inside the expansion is near zero, and the seed sits at the centre of every path in a
star-shaped expansion, so it ranks first inside its own expansion in up to 85% of cases whatever
its real brokerage. For a fraud investigator this is the worst direction: the flagged entity
looks like the broker because it was chosen as the centre. This matches the sampling literature
already cited in this file: path-based measures change on a subgraph (Costenbader and Valente
2003; Borgatti, Carley and Krackhardt 2006, section on path-based measures above).

**Recommendation: keep the boundary mark.** A betweenness, closeness or other path-based value
computed inside a working set should say so at the value, and "Run on full graph" should stay one
click away. Degree and other local measures do not have this problem and can stay unmarked, so
the mark can be tied to the result kind (path-based) rather than to every run on a working set.

Sources: `graphty/src/data/sampleManifest.ts`; `graphty/public/samples/karate.gml`,
`football.gml`; NetworkX `ego_graph`, `betweenness_centrality`, `powerlaw_cluster_graph`,
`gnm_random_graph` (NetworkX 3.1); SciPy `spearmanr` (SciPy 1.15.3); Costenbader and Valente
2003 and Borgatti, Carley and Krackhardt 2006 as listed in this file's sources.

## Follow-up: how stable community labels are across Louvain and Leiden seeds, and what threshold a carried label needs

**Question.** When a community run is repeated (a new seed, a retune, next week's export), how
often does matching each old community to its best new community by member overlap carry the
label to the right place, and at what Jaccard threshold should a carry be published?

**Method.** The matching rule follows Greene, Doyle and Cunningham (2010): an old community is
matched to the new community with which it shares the largest Jaccard overlap (shared members
divided by members of either), and the match counts only above a threshold. The paper's full text
could not be read (the repository link returned HTTP 500); its abstract confirms the model of
per-step communities linked by "a community-matching strategy". Its recommended threshold value
is therefore not quoted here.

- Code: the graphty algorithms package (`algorithms/dist`), `louvain()` with default options and
  `leiden()` with `randomSeed` 1 to 5.
- `louvain()` has no seed option (`LouvainOptions` in `algorithms/src/types/index.ts` is
  resolution, maxIterations, tolerance, useOptimized). It visits nodes in insertion order, so a
  "seed" was emulated by shuffling node and edge insertion order with seeds 1 to 5 -- which is
  what a seed changes in implementations that have one. The graphty-element wrappers
  (`graphty-element/src/algorithms/LouvainAlgorithm.ts`, `LeidenAlgorithm.ts`) expose resolution
  but no seed, so Leiden in the element always runs with its default seed of 42.
- Datasets: Zachary karate club (34 nodes, 78 edges) and NCAA football 2000 (115 nodes, 613
  edges), the two graphty samples. No real weekly exports exist in the repository, so two were
  generated: week 1 is a planted-partition graph of 1000 nodes, 5000 edges and 25 groups of
  heavy-tailed size (12 to 150), with 35 percent of edges between groups; week 2 drops 3 percent
  of nodes, adds 30 nodes to existing groups, drops 5 percent of the surviving edges and redraws
  the same number. Treat the weekly figures as a plausible churn level, not a measured one.
- Scoring, per old community of 3 or more members, at thresholds 0.3, 0.5 and 0.7:
  "carried cleanly" when the best match passes the threshold, is mutual (the new community's own
  best match is this old one) and no other new community also passes; "wrong" when the carry is
  not mutual or two old communities carry to the same new one; "ambiguous" when two new
  communities both pass; "not carried" when the best match is below the threshold (the community
  gets a new label). Seed-vs-seed pools all 20 ordered pairs of 5 runs; week-vs-week pools 25 run
  pairs.

**Results.**

| Comparison | Groups per run | Best-match Jaccard p10 / median | t=0.3 wrong+ambiguous / not carried | t=0.5 wrong+ambiguous / not carried | t=0.7 wrong+ambiguous / not carried |
|---|---|---|---|---|---|
| Louvain, seed vs seed, karate | 5-6 (5 distinct partitions of 5) | 0.40 / 0.90 | 21.4% / 5.4% | 2.7% / 20.5% | 0% / 42.9% |
| Louvain, seed vs seed, football | 9-10 (4 distinct) | 0.67 / 1.00 | 9.4% / 0% | 0% / 3.1% | 0% / 15.6% |
| Louvain, seed vs seed, week 1 | 20-21 (5 distinct) | 0.84 / 0.97 | 4.4% / 1.0% | 0% / 2.5% | 0% / 7.4% |
| Louvain, week 1 vs week 2 | 20-21 | 0.32 / 0.89 | 9.5-9.8% / 6.9% | 0% / 13.5-14.7% | 0% / 23.3-23.5% |
| Leiden, seed vs seed, karate | 4 (1 distinct) | 1.00 / 1.00 | 0% / 0% | 0% / 0% | 0% / 0% |
| Leiden, seed vs seed, football | 10 (1 distinct) | 1.00 / 1.00 | 0% / 0% | 0% / 0% | 0% / 0% |
| Leiden, seed vs seed, week 1 | 19-21 (5 distinct) | 0.50 / 1.00 | 8.0% / 2.0% | 0% / 10.0% | 0% / 16.0% |
| Leiden, week 1 vs week 2 | 19-21 | 0.33 / 0.91 | 13.0-15.3% / 6.8-8.0% | 0% / 16.5-18.0% | 0% / 26.0-28.0% |

Week-vs-week results were the same whether the two runs shared a seed or not: churn, not seed,
drives the loss.

**What this means.**

- **A threshold of 0.5 or above makes wrong and ambiguous carries structurally impossible**
  for a flat partition. Communities in one run are disjoint, so a community can share more than
  half its union with at most one of them; the only exception is an exact tie at 0.5 (the 2.7
  percent on karate). Every wrong or ambiguous carry measured sat in the 0.3 to 0.5 band, at rates
  of 4 to 21 percent. 0.3 is not a safe published default.
- **0.5 is the cheapest safe default.** It keeps wrong carries at zero and loses 2.5 to 18 percent
  of labels (they reappear as new labels) on graphs of 100 or more nodes; 0.7 roughly doubles the
  loss (7 to 28 percent) for no gain in correctness. Small graphs are the exception: on the
  34-node karate club Louvain alone loses one label in five at 0.5.
- **Seed noise is the floor for a retune.** Even with nothing changed, Louvain gives a different
  partition on almost every run (4 or 5 distinct partitions in 5 runs on every dataset), and 2.5 to
  20.5 percent of labels fail to carry at 0.5. A retune (new resolution) or a new week can only move
  more. Automatic carry at 0.5 is safe in the sense that it never mislabels, so it can be
  automatic; what must be shown is the not-carried remainder, because it is never empty
  (13 to 18 percent week to week here).
- **A fixed seed hides the variation rather than removing it.** Leiden with its fixed default
  seed returned identical partitions on the two small samples, and still produced 5 distinct
  partitions for 5 seeds on the 1000-node graph. The element's Louvain is deterministic only
  for a given node order, so reloading the same data in a different order changes the result.

Sources: `algorithms/src/algorithms/community/louvain.ts`, `leiden.ts`,
`algorithms/src/types/index.ts`; `graphty-element/src/algorithms/LouvainAlgorithm.ts`,
`LeidenAlgorithm.ts`; karate edge list in `tmp/fix-nts/karate.mjs`; football in
`design/ui/object-first-ux/gen/football.json`; Greene, D., Doyle, D., Cunningham, P., "Tracking the Evolution
of Communities in Dynamic Social Networks", ASONAM 2010, doi:10.1109/asonam.2010.17 (abstract via
https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/ASONAM.2010.17; full text at
http://hdl.handle.net/10197/12399 was unreachable).

## Follow-up: hop counts, expansions across a filter, k-shells and single components in the 25 workflows

**Question.** Does the Fraud Ring Investigation workflow ask for a 1-2 hop neighborhood; does any
workflow expand more than 3 hops across a filter; does any workflow keep a k-shell or a single
connected component across filter changes?

**Findings** (grep of `design/designloom/workflows/*.yaml` for hop, neighbor, expand, k-core,
k-shell, coreness, component, ego):

- **Fraud Ring Investigation reads "1-2 hop".** Line 65: "Alert Contextualization - View flagged
  entity in its network context (1-2 hop neighborhood)". Its decision points ask "How far should
  I expand the investigation (1-hop? 2-hop? community?)" (line 82), and its pain points include
  "Losing context when expanding to large neighborhoods" (line 110). The next step up from 2 hops
  is the community, not a third hop.
- **No workflow expands more than 2 hops, and none states a hop count across a filter.** The only
  other stated radius is Hub Gene Identification and Ranking, "expand one step around them"
  (line 59). Hub Investigation (ego network, "the hub's immediate neighborhood") and Criminal
  Network Analysis and Path Investigation (the `neighborhood-expansion` capability) give no
  count. Path Investigation's "number of hops" (line 76) is a path length, not an expansion.
- **No workflow mentions a k-core, k-shell or coreness at all.**
- **Two workflows work on a single connected component, neither across filter changes.**
  Gene List to Interaction Network with Expression Overlay: "Trim to the connected part - Select
  the largest connected component and make it the working network; unconnected genes are noted
  but dropped" (line 56) -- a one-time trim before analysis, not a style and not re-derived when a
  filter changes. Community Analysis lists its input as "Connected graph (typically giant
  component)" (line 100) -- a precondition, not a step. No workflow styles a component.

Sources: `design/designloom/workflows/W06.yaml` (Fraud Ring Investigation), `W23.yaml`,
`W17.yaml`, `W09.yaml`, `W05.yaml`, `W20.yaml`, `W04.yaml`.
