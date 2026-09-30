# graphty-element capabilities: the raw material for an object-first UX

This is an inventory of everything graphty-element can do today and everything it is proposed
to do, gathered so that a UX design can be checked against it. Every row answers the same five
questions: what the capability is called, what it does for a reader, whether it ships, which API
it lives behind, and what KIND of thing it produces or acts on. The last column is the one the
object-first design cares about, because the design's central idea is that the objects a reader
manipulates are the things the element MAKES from the data (sets, measures, positions, pictures),
not the raw nodes and edges.

Sources read for this inventory, all under `/home/apowers/Projects/graphty-monorepo/`:

- the session API: `graphty-element/src/session/` (`types.ts`, `GraphSession.ts`, `runs/`,
  `results/`, `scope/`, `selection/`, `visibility/`, `styles/`, `cost/`, `layout.ts`,
  `planning.ts`, `limits.ts`)
- the catalogues: `graphty-element/src/catalog/` (`types.ts`, `algorithms.ts`, `layouts.ts`,
  `cameras.ts`, `formats.ts`, `palettes.ts`, `scales.ts`, `unreachable.ts`)
- the configuration schemas: `graphty-element/src/config/` (`DataConfig.ts`, `GraphBehavior.ts`,
  `GraphStyle.ts`, `NodeStyle.ts`, `EdgeStyle.ts`, `RichTextStyle.ts`, `StyleTemplate.ts`,
  `ViewMode.ts`, `XRConfig.ts`)
- the element surface: `graphty-element/src/graphty-element.ts`, `graphty-element/src/events.ts`,
  `graphty-element/src/screenshot/types.ts`, `graphty-element/src/video/VideoCapture.ts`,
  `graphty-element/src/ai/`, `graphty-element/src/xr/`, `graphty-element/src/cameras/`
- the guides: `graphty-element/docs/guide/*.md` and `graphty-element/docs/guide/extending/*.md`
- the stories: `graphty-element/stories/` (165 stories listed in `story-roster.json`)
- the open enhancement issues (`gh issue list --label enhancement`, 92 open on 2026-09-25)
- the design documents: `design/element-api/element-api-design.md` (the version 2 API design,
  which several unbuilt members still follow), `design/ui/app-shell-progressive-disclosure-design.md`
  (the app design whose result-shape table names features the element does not yet have),
  `design/designloom/capabilities/*.yaml` (the requirements base), `design/webgpu/`, `design/ai/`,
  `design/xr/`.

## How to read the tables

**Status** uses three words:

- **shipped**: it works on master and a consumer can reach it through a public, documented API.
- **partial**: some of it works; the rest is missing, unreachable or undocumented. The row says
  which part.
- **proposed**: it does not work today. The row names the issue number (`#NNN`) or the design
  document that describes it.

**API** names the door a consumer goes through. `el.` is the `<graphty-element>` DOM element;
`session.` is `el.session`, the headless model (the graph with no screen attached, which is why a
Node test and a rendered view can share it). Paths like `session.runs.start()` are real members.

**Produces / acts on** is the design vocabulary. Each term is defined once here:

- **set**: a collection of node ids and/or edge ids. A selection, a filter result, a path, a
  spanning tree and a community group are all sets. Sets can overlap.
- **measure**: one value per node (or per edge), such as a degree, a PageRank score or a rank.
  A measure is what a colour ramp or a size scale paints. Under the object-first model this is
  the second kind of object, beside a set.
- **partition**: a measure whose value is a group label (community 3, level 2, category "hub").
  A partition is both a measure (one label per node) and a family of sets (the members of each
  label), which is why community results become a tree of groups in the design.
- **fact**: a single graph-level number or verdict (density, modularity, "no path exists").
- **table**: rows that are not attached to any drawn element (a pair list, a time series).
- **position**: the x, y, z coordinate of each node. Written by a layout, a drag, an import or
  the GPU.
- **camera state**: where the viewer stands and looks; a property of the view, not of the graph.
- **style**: a style layer, or a channel value inside one. The design's Fill property is a style.
- **data load**: nodes and edges entering or leaving the graph.
- **export**: a file, blob or clipboard payload leaving the element.
- **event**: something a consumer subscribes to.
- **AI action**: something an assistant does on the reader's behalf through the element's own
  commands.
- **XR interaction**: a gesture or session state in a headset.
- **config**: a setting the element reads, changeable but not an object the reader creates.

A **channel** is one visual property a style can set (`node.color`, `edge.width`). A **layer**
is one rule that writes channels to the elements its selector matches; layers stack, later wins.
A **scope** is "which elements a piece of work may look at": the whole graph, what is visible,
the selection, the largest connected component, a saved set, an expression, or a list of ids.
A **run** is one execution of an algorithm, kept as an object with an id, parameters, status,
result and caveats.

---

## 1. Data in and out

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Inline data | Hand the element arrays of node and edge records | shipped | `el.nodeData`, `el.edgeData`, `el.setData({nodes, edges})` | data load |
| Load from a URL | Fetch a file and import it, format sniffed from content or named | shipped | `el.loadFromUrl(url, {format?, nodeIdPath?, ...})` | data load |
| Load from a File | Import a dropped or picked file | shipped | `el.loadFromFile(file, options)` | data load |
| Load from a named source | Import through a registered data source by type name | shipped | `el.addDataFromSource(type, opts)`, `el.dataSource` / `el.dataSourceConfig` attributes | data load |
| Import formats | JSON (native, plus Cytoscape.js, D3, NetworkX, Sigma, vis.js shapes), CSV (edge list, node list, paired files, adjacency list, Gephi, Cytoscape and Neo4j dialects), GraphML (incl. yFiles), GEXF, GML, DOT, Pajek NET | shipped; `session.catalog.formats()` lists 7 importers, all `canExport: false` | `session.catalog.formats()`, `graphty-element/src/catalog/formats.ts` | data load |
| Import options per format | Column separator, file shape (variant), id column, edge start/end field, node id field | shipped | `FormatDescriptor.options` | config |
| Known-field mapping | Tell the element which record keys hold node id, label, weight, time, edge source/target/id, edge weight, edge time | shipped | `el.nodeIdPath`, `el.edgeSrcIdPath`, `el.edgeDstIdPath`, `el.edgeIdPath`, `el.nodeLabelPath`, `el.edgeWeightPath`; `DataConfig.knownFields` | config |
| Endpoint spelling detection | Accepts `source`/`target`, `src`/`dst`, `from`/`to` and says which it used | shipped | `session.data.lastImport().endpoints` | fact |
| Direction | Directed, undirected or `auto` (settled by the file); provenance says whether a file or the configuration decided | shipped | `el.directed`, `session.data.statistics().directedness` + `directednessSource` | fact |
| Mixed direction per edge | A file with both directed and undirected edges | proposed #309 (graph-format holds one flag) | -- | data load |
| Repeated-edge policy | keep / error / first / last / sum / min / max when two edges join the same pair | shipped | `el.repeatedEdges`; report in `lastImport().repeated` | config, fact |
| Id coercion | `canonical` or `keep` (whether 1 and "1" are one node) | shipped | `DataConfig.knownFields.idCoercion` | config |
| Position scale and seeded positions | Coordinates in the file are honoured and scaled; the element reports how many nodes the file placed | shipped | `el.positionScale`, `session.seededNodeCount` | position |
| Import report | Format used, records seen vs kept vs rejected, repeats, weight attribute resolved | shipped | `session.data.lastImport()` | fact |
| Load progress | Percentage and bytes during a load | partial: bytes are estimated, percentage only when a size is passed; not cancellable (#296) | `data-loading-progress` event | event |
| Cancel a load | Stop a large load half-way | proposed #296 | -- | data load |
| Incremental add / remove / update | Add nodes and edges to a loaded graph, remove nodes, update node records | shipped | `el.addNode(s)`, `el.addEdge(s)`, `el.removeNodes`, `el.updateNodes` | data load |
| Update attributes after load | Change a node's or edge's data fields in place and have styles repaint | proposed #297 | -- | data load |
| List edges | Read every edge as a consumer | partial: `el.getNodes()` exists, `getEdges()` does not (#297); per-edge read via `session.data.edge(id)` | `session.data.node(id)`, `session.data.edge(id)`, `el.getNodes()` | data (read) |
| Clear | Empty the graph | shipped | `el.clearData()` | data load |
| Expand a node's neighbourhood from a server | Double-click a node to fetch and add its neighbours (lazy loading of a graph too big to load whole) | shipped | `el.layoutBehavior = { fetchNodes, fetchEdges }` | data load |
| Attribute catalogue | Every attribute the records carry: type (string, number, integer, boolean, time, category, mixed), completeness, unique count, min/max, sample values, origin (imported, joined, computed, result) | shipped | `session.data.attributes()` (`AttributeDescriptor`) | fact / table |
| Graph statistics | Node and edge counts, density, directedness, weighted, self-loops, repeated edges, degree range, mean degree, connected-component count and size distribution, which component a node is in | shipped, cached per snapshot | `session.data.statistics()` (`GraphStatistics`, `ComponentStatistics`) | fact |
| Status counts | nodes, edges, visible nodes, visible edges, O(1) | shipped | `session.status.counts` | fact |
| Topology fingerprint | A stable id for "same graph" | shipped | `session.fingerprint()` | fact |
| Node type / edge type role | A column marked as the type (person, device) so "colour by type" and "filter to type" can default; per-type counts | proposed #299 | -- | partition |
| Time role | A column marked as time, so a time window and a time slider know what to read | partial: `nodeTimePath` / `edgeTimePath` exist in `DataConfig.knownFields`; `session.catalog.timeAttributes()` unimplemented (#333) | `DataConfig.knownFields`, `visibility.setWindow` | config |
| Join an attribute table by key | Load a CSV of node attributes and attach columns by id, with a match report | proposed #298 | -- | data load |
| Computed attributes (formula) | Define a new attribute from a formula over existing ones | proposed (design 4.3.4, command `data.compute`; designloom `computed-attributes`) | -- | measure |
| Node merging | Combine selected nodes into one | proposed (designloom `node-merging`) | -- | data load |
| Data export | Write the graph back out as GraphML, GEXF, CSV, JSON, CX2, ... | proposed: every format descriptor is `canExport: false` in the element; graph-io has exporters; design 4.3.6 | -- | export |
| SIF, CX2, STRING, BioGRID, Neo4j APOC readers | More bioinformatics and Neo4j formats | proposed #306, #307, #308, #303, #304 | -- | data load |
| Project file | Save and reopen a whole session: data, layers, runs, positions, filters, camera | proposed #301 (needs-decision: the file format is a one-way door) | -- | export / data load |
| Sample datasets | Built-in example graphs | app-side today (`graphty/src/data/sampleManifest.ts`); design 4.11 lists a `data.sample` command | -- | data load |
| Custom data source / format plugin | A third party registers a new importer | shipped | `docs/guide/extending/custom-data-sources.md`, `formatRegistry` | data load |
| Large-graph limits | Render ceiling 200,000 nodes, 500,000 edges drawn, large-graph threshold 10,000, approximate above 2,000 | partial: published in `session/limits.ts` but not enforced (#302); the threshold only feeds the layout recommendation | `DEFAULT_LIMITS` | config |
| Progressive / viewport-first loading | Show part of a huge graph first | proposed (design 9.3, designloom `progressive-loading`) | -- | data load |

## 2. Selection, query and visibility

Selection is one set for the whole session: the canvas, a data table, an inspector and a
headset all read and write the same one. Visibility is a second, independent set: what the
filters and the time window have left showing. Scope is the parameter that tells a run or a
count which elements to look at. Saved scopes are the element's nearest thing to a named,
reusable set object today.

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Select by click | Click a node to select it; a gold halo marks it | shipped (nodes only; edges are unpickable, so there is deliberately no edge click, `events.ts:406`) | pointer; `el.selectNode(id)`, `el.getSelectedNode()` | set |
| Selection halo style | Colour, scale and opacity of the halo; configuration, not a layer | shipped | `el.selectionStyle` | config |
| Multi-element selection | Hold many nodes and edges at once, capped at 5,000 by default | shipped | `session.selection.nodes`, `.edges`, `.size`, `.cap`, `.truncated` | set |
| Set operations on the selection | replace, add, remove, toggle, intersect (the design's boolean operations) | shipped | `session.selection.apply(target, op)`, `el.select(target, op)` | set |
| Select by ids | A list of node and/or edge ids | shipped | target `{nodes, edges}` or `{ids}` | set |
| Select neighbours | Neighbours of given nodes at depth 1, 2 or 3, following in / out / all directions | shipped | target `{neighborsOf, depth, direction}` | set |
| Select by scope | Everything in a scope (visible, graph, largest component, a saved set) | shipped | target `{scope}` | set |
| Select the top N of a result | The N best nodes by a run's field | shipped | target `{top: {run, field, n}}` | set |
| Select above a threshold | Every element whose result value exceeds a threshold | shipped | target `{above: {run, field, threshold}}` | set |
| Select edges between selected nodes | Add the induced edges | shipped | target `{edgesBetween: true}` | set |
| Invert the selection | Everything not selected | shipped | target `{invert: true}` | set |
| Select by expression | `degree > 10 and data.type == "person"` | proposed #149: the query engine is never attached, so `{where}` throws `E_UNSUPPORTED` | target `{where}` | set |
| Select by text search | Substring, exact, regex or attribute search over labels | proposed #149: `{text, mode}` throws `E_UNSUPPORTED`; no `find` source is attached | target `{text, mode}` | set |
| Clear | Empty the selection | shipped | `session.selection.clear()`, `el.deselectNode()` | set |
| Promote the selection to a saved set | Name the current selection and keep it as a scope | shipped | `session.selection.promote(name)` -> `ScopeId` | set (named) |
| Selection statistics | Node and edge counts, induced and cut edges, per-attribute mean/median/min/max against the whole graph, categorical distributions | shipped (the app still marks it Coming, #322) | `session.selection.statistics()` | fact / table |
| Selection change event | Who joined and left, with a cause (user, api, command) | shipped | `session.on("selection:changed")`, DOM `selection-changed` | event |
| Saved scopes | Save a scope specification under a name, list, remove; a saved scope may reference another | shipped | `session.scope.save(name, spec)`, `.list()`, `.remove(id)` | set (named) |
| Resolve or count a scope | Turn a scope into ids, or count it (exactly or by sampling) before running anything | shipped | `session.scope.resolve(spec)`, `.count(spec, {approximate})` | set, fact |
| Filter: expression | Hide everything that fails a query | proposed #149 (needs the query engine) | `visibility.set({kind: "expression", where})` | set (visible) |
| Filter: range | Hide nodes whose numeric attribute is outside min..max | shipped for data attributes; result fields such as group size are not reachable (#192) | `{kind: "range", attribute, min, max}` | set (visible) |
| Filter: categories | Keep nodes whose attribute is one of a list of values | shipped | `{kind: "categories", attribute, values}` | set (visible) |
| Filter: degree | Keep nodes by degree band and direction | shipped | `{kind: "degree", ...}` | set (visible) |
| Filter: component | Keep one connected component | shipped | `{kind: "component", id}` | set (visible) |
| Filter: neighbourhood (ego network) | Keep seeds and everything within a depth | shipped (the app's Ego network action is not wired, #314) | `{kind: "neighborhood", seeds, depth}` | set (visible) |
| Filter: edges by expression | Hide edges that fail a query | proposed #149 | `{kind: "edges", where}` | set (visible) |
| Filter combinators | all / any / not over filters | shipped | `{kind: "all" or "any" or "not", of}` | set (visible) |
| Time window | Show only elements whose time attribute is within from..to, with an optional step unit | shipped | `visibility.setWindow({attribute, from, to, step})` | set (visible) |
| Time-series playback | Precomputed steps, play / pause / step / speed, sliding or cumulative window, per-step summary, optional re-run per step | proposed #300 | -- | set (visible), event, table |
| Visibility summary and masks | Counts, sets and byte masks of what is showing | shipped | `visibility.summary`, `.nodes`, `.edges`, `.nodeMask()` | set, fact |
| Visibility change event | What changed and how long the pass took | shipped | `session.on("visibility:changed")` | event |
| Visible count vs render set | "showing 1,204 of 50,000" counts the DATA scope, never what happened to be drawn | shipped | `session.status.counts.visibleNodes` | fact |
| Hover | A `node-hover` event fires; a node tooltip channel draws on hover | partial: no hover HIGHLIGHT of a node's neighbours (designloom `hover-highlight`); `LayerSource` reserves `reason: "hover"` for a future element layer | DOM `node-hover`; channels `node.tooltip`, `node.tooltipStyle` | event, style |
| Pick what is under the pointer | Hit-test for a context menu | partial: nodes pick; edges never pick (#319 notes the app must not compute this) | `node-click` | event |
| Pattern (motif) search | Find every occurrence of a small template graph | proposed (design command `data.match`; designloom `pattern-search`) | -- | set |
| Query validation and autocomplete | Check an expression before running it; list attribute paths and functions | proposed #335, #332 | `session.catalog.validate()`, `.functions()` (declared, unimplemented) | fact |

## 3. Algorithms and their results

Every algorithm is a catalogue entry (`graphty-element/src/catalog/algorithms.ts`) with a plain
name, a technical name, a description, a category, a result shape, its fields, its options, a
cost class and a complexity string. Running one makes a **run**. A run's result is addressed by
path (`results.<runId>.<field>`) so a style layer, a selection target or a filter can read it.
Result shapes are the element's own typing of what a run produces, and they map directly onto
the design's two kinds of object:

| Result shape | Node fields | Graph fields | Design kind | Suggested layer |
|---|---|---|---|---|
| `node-metric` | value, rank, percentile | min, max, median, mean, measured, normalization, tiedAtMin | measure | encoding (colour ramp or size scale) |
| `edge-metric` | (edges) value, rank, percentile | same | measure on edges | encoding |
| `community` | group, groupSize | groupCount, sizes, modularity | partition (a tree of sets) | encoding (one colour per group) |
| `layered-grouping` | level, levelSize | levelCount, sizes | partition (ordered) | encoding |
| `category-table` | category, score, rank | categories | partition | encoding |
| `path` | onPath, order (edges: onPath) | length, cost, hops | set (ordered) | highlight |
| `node-set` | in | count + one headline scalar | set | highlight |
| `edge-set` | (edges) in | count + one headline scalar | set | highlight |
| `pair-list` | -- | pairs | table | none |
| `temporal` | -- | steps, series, rates, changeThreshold | table | none |
| `fact` | -- | (own fields) | fact | none |

### 3.1 Catalogue entries (shipped)

Plain names are the ones the element publishes; the technical name is in parentheses.
Options come from each algorithm class in `graphty-element/src/algorithms/`.

| Key | Plain name (technical) | What it answers | Shape | Cost class | Options | Produces |
|---|---|---|---|---|---|---|
| `degree` | Connections (Degree centrality) | How many edges each node has; in, out and total | node-metric (+ inDegree, outDegree fields) | instant | none (always directed, #161) | measure |
| `betweenness` | Bridges (Betweenness centrality) | How often a node sits on shortest paths between others | node-metric | heavy | none (no weight/direction, #313) | measure |
| `closeness` | Reach (Closeness centrality) | How quickly a node reaches everything else | node-metric | heavy | none | measure |
| `pagerank` | Influence (PageRank) | Influence flowing in from nodes that point at it | node-metric | iterative | dampingFactor, maxIterations, tolerance, weight, useDelta | measure |
| `eigenvector` | Influence by association (Eigenvector centrality) | Importance from the importance of neighbours | node-metric | iterative | maxIterations, tolerance, normalized, mode (in/out/total), endpoints | measure |
| `katz` | Influence at a distance (Katz centrality) | Every path that reaches a node, longer counting less | node-metric | iterative | alpha, beta, maxIterations, tolerance, normalized, mode, endpoints | measure |
| `hits` | Hubs and authorities (HITS) | Two scores: points at good things / is pointed at | node-metric (+ authority, hub fields) | iterative | maxIterations, tolerance, normalized, mode, endpoints | measure (two) |
| `louvain` | Communities (Louvain) | Densely connected groups | community | iterative | resolution, maxIterations, tolerance, useOptimized | partition |
| `leiden` | Communities, refined (Leiden) | Louvain with guaranteed well-connected groups | community | iterative | resolution, randomSeed, maxIterations, threshold | partition |
| `label-propagation` | Communities, fast (Label propagation) | Groups by majority vote of neighbours | community | iterative | maxIterations, randomSeed | partition |
| `girvan-newman` | Communities by cutting bridges (Girvan-Newman) | Groups revealed by removing the most-between edges | community | heavy | maxCommunities, minCommunitySize, maxIterations | partition |
| `components` | Separate pieces (Connected components) | Which disconnected part each node is in; `{strength: "strong"}` for strongly connected | community | instant | strength (legacy key `scc`) | partition |
| `shortest-path` | Shortest route (Shortest path) | The cheapest route from A to B; `method` dijkstra or bellman-ford | path (+ hasNegativeCycle) | instant | source, target, method, bidirectional | set (ordered) |
| `all-pairs-distance` | How far from everything else (All-pairs shortest paths, Floyd-Warshall) | Eccentricity per node, plus diameter and radius | node-metric (+ diameter, radius, hasNegativeCycle) | cubic | none | measure, fact |
| `bfs` | Steps away (Breadth-first search) | How many steps each node is from a start | layered-grouping (+ targetFound) | instant | source, targetNode (no maxDepth, #160) | partition (ordered) |
| `dfs` | Exploration order (Depth-first search) | The order a depth-first walk visits nodes | node-metric (+ visited) | instant | source, targetNode, recursive, preOrder | measure |
| `kruskal` | Cheapest connecting network (Kruskal MST) | The lightest set of edges joining everything | edge-set (+ totalWeight) | instant | none; requires undirected | set (edges) |
| `prim` | Cheapest network from one node (Prim MST) | Same, grown from a start node | edge-set (+ totalWeight) | instant | startNode; requires undirected | set (edges) |
| `bipartite-matching` | Best pairing (Maximum bipartite matching) | The largest set of non-overlapping pairs across two sides | edge-set (+ bipartite, matched, side) | heavy | none; requires undirected | set (edges), partition (side) |
| `max-flow` | Most that can flow (Maximum flow) | How much can travel from a source to a sink; per-edge flow and utilisation | edge-metric (+ capacity, maxFlow, netFlow, role, utilization) | heavy | source, sink | measure (edges), fact |
| `min-cut` | Weakest link (Minimum cut) | The cheapest edges to remove to split the graph | edge-set (+ cutValue, side) | heavy | source, sink, useGlobalMinCut, useKarger, kargerIterations | set (edges), partition (side) |

### 3.2 Declared but not shipped, and proposed algorithms

| Key or name | What it would answer | Status | Produces |
|---|---|---|---|
| `clustering-coefficient` | How tightly a node's neighbours are joined to each other | proposed #330 (in `KNOWN_ALGORITHMS`, no implementation) | measure |
| `all-paths` | Every simple route from A to B up to a length cap | proposed #329 | set (many, ordered) |
| `k-core` | The densest shells of the graph | in `KNOWN_ALGORITHMS`; unregistered; the GPU package has `kCoreDecomposition` | partition (ordered) |
| `link-prediction` | Which unconnected pairs are likely to connect | in `KNOWN_ALGORITHMS`; unregistered (designloom `link-prediction`) | table (pair-list) |
| Markov, spectral, hierarchical clustering; A*; edge betweenness | More groupings, a heuristic route, a per-edge bridge score | proposed #55 (implemented in `@graphty/algorithms`, not registered) | partition, set, measure (edges) |
| Articulation points, bridge edges, removal impact | What breaks if a node or edge is removed | proposed #311 and #180 (app "Simulate removing"; design result shapes "Removal impact" and "Scenarios") | set, fact |
| Diameter, radius, eccentricity, average path length | Descriptive statistics without the cubic all-pairs run | proposed #310 | fact, measure |
| Anomaly detection | Unusual nodes with a why (design shape "Anomaly") | proposed (designloom `anomaly-detection`) | measure |
| Temporal analysis | Metric evolution and change events over time | proposed (shape `temporal` is declared; designloom `temporal-analysis`) | table |
| Community profiling and over-represented values | Per-group attribute profile with corrected p values | proposed #193 | table |
| Group names | A display name per community group, optionally proposed from the group's dominant attribute | proposed #191 | partition |
| Parameter sweep | One algorithm across a range of a parameter, summarised per value | proposed #194 | table (of runs) |
| Weight and direction options everywhere | Per-run "use weights" and "treat as undirected" | proposed #313 | config (per run) |
| Custom algorithm plugin | A third party defines and registers an algorithm with a descriptor and suggested styles | shipped | `docs/guide/extending/custom-algorithms.md` | measure / set / partition |

### 3.3 Running and reading (the run model)

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Start a run | Run an algorithm with params over a scope, optionally seeded, named (`as`), approximate (`sample`) or exact, with a style request | shipped | `session.runs.start(key, params, options)`, `el.run(...)`, `session.run({op: "algo.run", ...})` | run |
| Run on load | A list of algorithms to run every time data loads | shipped | `el.algorithmsOnLoad`, `el.runAlgorithmsOnLoad` | run |
| Batch | Several runs as one labelled job with per-step success | shipped | `session.runs.batch(specs)` | run (batch) |
| Watch a run | queued, running, succeeded, failed, canceled; progress with phase, fraction and ETA; queue position | shipped | `run.status`, `run.progress`, `session.on("run:changed")`, `onProgress` | event |
| Cancel | Stop a run, with a reason | shipped where the algorithm is cancellable | `run.cancel()`, `AbortSignal` | run |
| Re-run | Repeat a run with its own parameters | shipped | `run.rerun()` | run |
| Queue policy | append, replace (abort the same op in flight), now | shipped | `RunOptions.queue` | config |
| Cost estimate | Seconds, confidence (measured / calibrated / modelled / unknown), cost class, whether it blocks the frame, whether it is available and why not; synchronous so a button can be drawn from it | shipped | `session.estimate(command)`, `session.catalog.metrics()` | fact |
| Plan | What a command would do (match, mutate, write fields, bytes, image), its cost, whether it would be blocked | shipped for `algo.run`; the other command kinds are not yet commands (#337) | `session.plan(command)` | fact |
| Cost gate | Refuse or approximate a run over the exact-computation cap (30 s) or the memory budget | shipped; the ceiling is fixed rather than measured (#159, #146) | `SessionRunsOptions.limits`, `gateRun` | config |
| Caveats | What qualifies the numbers: exact or sampled, seed, converged, iterations, component / filter / window scope, direction, weight meaning, precision, method, partial reason | shipped | `run.caveats` | fact |
| Stale note | The visible set changed since the run; ran on N, now M | shipped | `run.stale` | fact |
| Engine versions | Which element, algorithms and layout versions produced the numbers | shipped | `run.engine` | fact |
| Run record | A serialisable record of the run for a journal or a report | shipped | `run.record` | fact |
| List, get, remove | Find runs again; removing one removes the layers it created | shipped | `session.runs.list()`, `.get(id)`, `.remove(id)`, `.bindings(id)` | run |
| Read a result | Per-node and per-edge values, graph fields, a numeric column with min/max/mean/median, a ranking (top N), a histogram (linear or log, banded), a summary (top entries, groups), a plain-language reading | shipped | `session.results.get(run)` -> `RunResult.node()`, `.column()`, `.ranking()`, `.histogram()`, `.summary()`, `.reading({audience})` | measure, table, fact |
| Column to ids | Which node each column position belongs to | proposed #148 | -- | table |
| Result path and term | The dotted path a layer selector or filter uses to read a result | shipped | `session.results.path(run, field)`, `.term()`, `.roots` | style (input) |
| Metric availability | For each algorithm: can it run on this graph, why not, estimated seconds, whether it already ran | shipped | `session.catalog.metrics()`; `applicable()` proposed #334 | fact |
| Options for a form | Option descriptors with bounds resolved for a scope (real node ids, k bounded by node count) | proposed #336 | `session.catalog.optionsFor()` | config |
| Results as attributes | A result field appears in `data.attributes()` with origin `result` | shipped | `AttributeDescriptor.origin` | measure |
| Suggested styles | Each run knows how it should look; applied automatically on first completion unless told not to | shipped | `run.suggestEncodings()`, `el.applySuggestedStyles()`, `StartOptions.style`, auto-apply policy | style |
| Analysis history / undo | The record of what was run, replayable | proposed #145 (journal); design 9.3 says the undo stack itself is the consumer's | -- | event, table |

## 4. Layouts

A **layout** computes positions. A **live** layout is a simulation that keeps running (the
positions move every frame until it settles); a **batch** layout places every node once. The
size rating says how many nodes it handles well. Structural inputs say what a layout needs
beyond the graph: a root node, a partition (a community result), or an ordering.

| Id | Plain name (technical) | Family | Live / batch | Max dims | Size rating | Needs | Status |
|---|---|---|---|---|---|---|---|
| `force` | Spread Out (Force-directed; engines ngraph, d3-force-3d) | force | live | 3 | any | -- | shipped |
| `force-2d` | Spread Out, Flat | force | batch | 2 | 2,000 | -- | shipped |
| (engine) ForceAtlas2 | ForceAtlas2 (Gephi), CPU and WebGPU | force | batch | 3 | -- | -- | shipped; GPU path through the accelerator |
| (engine) Spring | Fruchterman-Reingold | force | batch | 3 | -- | -- | shipped |
| (engine) Kamada-Kawai | Stress majorisation | force | batch | 3 | -- | -- | shipped |
| (engine) ARF | Attractive and repulsive forces | force | batch | 2 | -- | -- | shipped |
| `circular` | Ring | geometric | batch | 3 | any | -- | shipped |
| `shell` | Concentric Rings | geometric | batch | 2 | any | partition | shipped |
| `spiral` | Spiral | geometric | batch | 2 | any | -- | shipped |
| `spectral` | Natural Grouping (Laplacian eigenvectors) | geometric | batch | 2 | 2,000 | -- | shipped |
| `planar` | No Crossings (Planar embedding) | geometric | batch | 2 | 2,000 | -- | shipped |
| `random` | Scattered | geometric | batch | 3 | any | -- | shipped |
| `hierarchical` | Tree (Layered; BFS tree engine) | hierarchical | batch | 2 | any | root node | shipped |
| `bipartite` | Two Columns | hierarchical | batch | 2 | any | partition | shipped |
| `layers` | Columns by Group (Multipartite) | hierarchical | batch | 2 | any | partition | shipped |
| `fixed` | Keep Positions | special | batch | 3 | any | -- | shipped |
| `radial` | Rings by distance from a chosen node | -- | -- | -- | -- | root node | declared, unserved (`UNSERVED_LAYOUT_IDS`; designloom `layout-radial`; design 9.3 "ego-radial") |
| `grid` | Regular lattice | -- | -- | -- | -- | -- | declared, unserved |
| Sugiyama | Layered layout with crossing reduction | -- | -- | -- | -- | -- | proposed (design 9.3) |

Layout control:

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Choose a layout and its options | Set the layout by id with engine options | shipped (the name is settable in three places with different defaults, design 4.7) | `el.layout`, `el.layoutConfig`, `el.setLayout(type, opts)` | position |
| Recommend a layout | The element picks a layout from the graph's shape and size, with a reason | shipped | `recommendLayout(statistics, options)` from `./session` | fact |
| Pace the simulation | pre-steps before the first frame, steps per frame, stop delta, camera re-frame interval | shipped | `el.layoutBehavior.layout` | config |
| Wait for settle | A promise that resolves when the layout stops | shipped | `el.waitForSettled()`, `graph-settled` event | event |
| Pin / unpin nodes | A dragged node stays put; pins survive a layout change, a 2D/3D switch and a template | shipped | `el.pin(ids)`, `el.unpin(ids)`, `el.isPinned`, `el.pinnedNodes`, `layoutBehavior.node.pinOnDrag` | position |
| Drag a node | Move a node by hand, negotiating with the simulation | shipped | pointer; `node-drag-start` / `node-drag-end` events | position |
| Edge weights honoured | Force layouts read the weight attribute | shipped | `LayoutDescriptor.honoursWeights` | position |
| Play / pause / step / stop a live layout | A transport for the simulation | proposed #144 (design 4.7 `LayoutApi`): the manager has `step()` but no public transport | -- | position |
| Layout over a scope | Lay out only the selection, the rest keeps its positions | proposed #144 | -- | position |
| Positions API | Read a node's position by id, set positions, snapshot and restore, a version-stamped buffer | partial: `session.positions` is the raw stride-3 Float32Array; the typed verbs are #144 | `session.positions`, `el.getNode(id).position` | position |
| Layout change event | Know when the layout id, state or dimensions changed | proposed #144 | `layout-initialized` DOM event only | event |
| Layout dimension | 2D layouts flattened in a 3D view, and say so | shipped | `LayoutManager.updateLayoutDimension` via `viewMode` | position |
| GPU layout | ForceAtlas2, Fruchterman-Reingold and spring-electrical on WebGPU, above `minNodes` | shipped when `@graphty/webgpu-graph-algorithms` is installed | acceleration policy (section 10) | position |
| Custom layout plugin | A third party registers a single-pass or live layout | shipped | `docs/guide/extending/custom-layouts.md` | position |
| Animated transitions | Nodes glide from old to new positions on a layout change | shipped for layout transitions (`docs/guide/layouts.md` "Layout Transitions"); `RunOptions.transitionMs` | config | position |

## 5. Styling: channels and layers

Everything a node or edge looks like comes from the **style stack**: a list of layers read
bottom first, later wins. The bottom two layers are the element's own defaults (`source.by ==
"element"`, locked). A layer has a **selector** (which elements), a **target** (node or edge),
either static values (`set`) or bound values (`encode`: a data path or result field, through a
scale and a palette, onto a channel), a **kind** (base, encoding, highlight, custom), a
**source** (element, run, user, template, plugin), an enabled flag and free user data.

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| List / get layers | Read the stack in order | shipped | `session.styles.list()`, `.get(id)` | style |
| Add / update / remove / move | Edit the stack; every edit is a run with a repaint report and one `style:changed` event | shipped (the app's "+" sends an empty spec, which is rightly refused: issue #380) | `session.styles.add(spec, at)`, `.update(id, patch)`, `.remove(id)`, `.move(id, before)`, `.removeBySource(pred)` | style |
| Validate a spec | Errors with position and candidates before adding | shipped | `session.styles.validate(spec)` | fact |
| Selector: expression | A query in the expression language (`data.type == "person"`) | partial: selectors compile inside the style engine; the standalone query engine for scope/selection/filter is #149 | `{match: "expression", where}` | set (implicit) |
| Selector: has | Elements that carry a path (every node with a result value) | shipped | `{match: "has", path}` | set |
| Selector: ids | An explicit list | shipped | `{match: "ids", nodes, edges}` | set |
| Selector: everything | The whole graph | shipped | `{match: "everything"}` | set |
| Encode a result | One call from a run to a picture: field, channel, scale, palette, domain, clamp, range, missing value, reverse, overflow (other / shape / extend) | shipped | `session.styles.encode({run, field, channel, ...})` | style (encoding layer) |
| Encode a data attribute | Bind a channel to an imported attribute (colour by conference) | shipped in the element (`encode: {by: path, ...}`); no UI in the app (#190) | `LayerSpec.encode` | style |
| Highlight a set result | Paint only the members of a path or set result | shipped | `session.styles.highlight({run, field, name, set})` | style (highlight layer) |
| Scales | linear (Even Steps), log (By Order of Magnitude), neglog10 (By Significance), sqrt (By Area), pow (Curved), bins (Equal Ranges), quantile (Equal Counts), ordinal (One Colour per Value), passthrough | shipped | `session.catalog.scales()` | config |
| Palettes | Sequential: viridis, ylorbr, plasma, inferno, blues, greens, oranges. Categorical: okabe-ito, tol-vibrant, tol-muted, pastel, carbon. Diverging: purple-green, blue-orange, red-blue. Highlight: blue-, green-, orange-highlight. Each with colour-blind safety flags and capacity | shipped | `session.catalog.palettes()` | config |
| Custom palette plugin | Register a palette; saved documents carry it | shipped | `docs/guide/extending/custom-palettes.md` | config |
| More groups than colours | Overflow policy paints the largest groups and the rest "Other" | shipped | `EncodingSpec.overflow` | style |
| Legend model | Blocks per channel: kind (sequential, diverging, categorical, highlight, literal), field words, scale, domain, palette, swatches with counts, overflow, departures | shipped as data; nothing draws it (#292) | `session.styles.legend()` | table |
| Explain an element's look | Which layers contributed which channels to one node, and whether each is editable | shipped | `session.styles.explain({node})` | fact |
| Resolve to static | Turn a bound channel into a literal for one element (the "make this one red" door) | shipped | `session.styles.resolveToStatic(id, channel, at)` | style |
| Style templates / documents | Save the whole stack (with palettes) and apply it later; unbound layers reported | shipped | `session.styles.toDocument()`, `.applyTemplate(doc)`; `StyleTemplate` config with metadata | export / style |
| Style change event and problems | One event per edit with the repaint size; a separate event when the element's own painting was refused | shipped | `session.on("style:changed")`, `session.on("style:problem")`, DOM `style-changed` | event |
| Settled | Wait for pending repaints | shipped | `session.styles.settled()` | event |
| Layer groups | Name a group of layers and set a per-group opacity (the run's layers under one parent) | proposed (design 9.3; app #171) | -- | style |
| Theme (light / dark canvas) | Background follows the page's colour scheme | proposed #291, #331 (`catalog.themes()`) | `el.background` today (`color` or `skybox`) | config |
| Style presets | Built-in looks a reader can pick | proposed (designloom `style-presets`); templates are the mechanism | -- | style |

### 5.1 Channels

The channel list is `Channel` in `graphty-element/src/catalog/types.ts`. A channel's value may be
literal or bound.

| Channel | What it changes | Status |
|---|---|---|
| `node.color`, `node.opacity` | Fill colour and transparency | shipped |
| `node.size` | Size (the size scale for a measure) | shipped |
| `node.shape` | One of 25 meshes: box, sphere, cylinder, cone, capsule, torus, torus-knot, tetrahedron, octahedron, dodecahedron, icosahedron, rhombicuboctahedron, three prisms, two pyramids, five dipyramids and cupolas, goldberg, icosphere, geodesic | shipped |
| `node.outline`, `node.glow`, `node.glowStrength`, `node.wireframe`, `node.flat` | Edge line, glow halo, wireframe and flat shading | shipped |
| `node.label`, `node.labelStyle` | Label text and its rich-text style | shipped |
| `node.tooltip`, `node.tooltipStyle` | A hover tooltip and its style | shipped (draws only on hover; listed in `unreachable.ts` because the resting-frame test cannot see it) |
| `node.marker` | An image, icon or note marker on the node | proposed #295 (declared, `renderable: false`; design reserves it for notes) |
| `edge.color`, `edge.opacity`, `edge.width` | Line colour, transparency, thickness | shipped |
| `edge.style`, `edge.patternCount` | Line pattern: solid, dot, star, box, dash, diamond, dash-dot, sinewave, zigzag; how many repeats | shipped |
| `edge.curvature` | Bezier curve amount | shipped |
| `edge.arrowHead`, `edge.arrowTail` and their `Size`, `Color`, `Opacity`, `Text`, `TextStyle` | Arrow shapes at each end: normal, inverted, dot, sphere-dot, open-dot, none, tee, open-normal, diamond, open-diamond, crow, box, half-open, vee; with text at the ends | shipped |
| `edge.animationSpeed` | Animated flow along the edge | shipped |
| `edge.label`, `edge.labelStyle` | Edge label and style | shipped |
| edge tooltip | -- | withdrawn: edges are unpickable |

## 6. Labels

Labels are rich-text canvases (`graphty-element/src/config/RichTextStyle.ts`) attached to a node
or edge.

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Label text from a path | The label comes from a record key | shipped | `el.nodeLabelPath`, channel `node.label` | style |
| Rich text | Font, size, weight, line height, colour, gradient (linear / radial; vertical / horizontal / diagonal), outline, shadow, background with padding and corner radius, borders | shipped | `LabelStyle` (`node.labelStyle`) | style |
| Placement | Attach at top, top-left, ..., center, ..., bottom-right, with an offset | shipped | `attachPosition`, `attachOffset` | style |
| Billboarding | Labels face the camera | shipped | `billboardMode` | config |
| Depth fade | Labels fade with distance | shipped | `depthFadeEnabled`, near / far | style |
| Badges | notification, label, label-success/-warning/-danger, count, icon, progress, dot | shipped | `BadgeType`, `BadgeStyleManager` | style |
| Animation | none, pulse, bounce, shake, glow, fill | shipped | `AnimationType` | style |
| Text on arrow heads and tails | Words at the ends of an edge | shipped | `edge.arrowHeadText`, `edge.arrowTailText` | style |
| Wrap to a width | Break long labels at word boundaries with a line cap | proposed #294 | -- | style |
| Label overlap avoidance | Keep labels from covering each other | proposed (issue #5 referenced by #294) | -- | style |

## 7. Camera and view modes

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| View modes | 2d, 3d, vr, ar | shipped | `el.viewMode`, `el.setViewMode()`, `el.getViewMode()` | config |
| 3D orbit camera | Left-drag orbits; pinch zooms on touch; keyboard keys zoom | shipped; no wheel zoom and no drag-to-pan in 3D (#290) | pointer, `OrbitInputController` | camera state |
| 2D camera | Wheel zooms, drag pans | shipped; zoom is about the centre, not the cursor (#290) | `TwoDInputController` | camera state |
| Camera state | Read and set position, target, up (and ortho bounds in 2D), animated with easing | shipped | `el.getCameraState()`, `el.setCameraState(state, {animate, duration, easing})`, `setCameraPosition`, `setCameraTarget`, `setCameraZoom`, `setCameraPan` | camera state |
| Fit to graph | Frame every element | shipped | `el.zoomToFit()`, `zoom-to-fit-complete` event, camera view `fitToGraph` | camera state |
| Built-in views | Fit to graph, From above, From the side, From the front, Isometric; each says which modes it works in | shipped | `session.catalog.cameras()`, `el.applyCameraView(id)`, `el.resolveCameraPreset` | camera state |
| Saved views (presets) | Save the current camera under a name, load, list, export and import | shipped | `el.saveCameraPreset(name)`, `loadCameraPreset`, `getCameraPresets`, `exportCameraPresets`, `importCameraPresets` | camera state |
| Reset | Back to the starting camera | shipped | `el.resetCamera()` | camera state |
| Starting distance | How far the camera starts | shipped | `el.startingCameraDistance` | config |
| Focus on a node / zoom to nodes | Animate to one node or a set | partial: the guide shows it done by hand from `node.position`; design 4.8 `zoomToNodes(ids)` and `fit(scope)`; an AI command `zoomToNodes` exists | `el.setCameraState` | camera state |
| Follow a node | Camera tracks a moving node | proposed (design 4.8 `followNode`; app #183) | -- | camera state |
| Linked cameras | Two views share pan / zoom / rotate (Compare mode) | proposed (design 4.8 `linkTo`; app #186) | -- | camera state |
| Camera change event | Know when the camera moved | shipped | `camera-state-changed` | event |
| Coordinate transforms | World to screen and back (for overlays and minimaps) | shipped | `el.worldToScreen()`, `el.screenToWorld()` | fact |
| Minimap / overview | A small map with the viewport rectangle; click to centre | proposed #293 | -- | camera state |
| Custom camera view plugin | Register a named framing | shipped | `docs/guide/extending/custom-cameras.md` | camera state |
| Background | A colour or a skybox image | shipped | `el.background` | config |
| Input enable | Turn pointer input off (for an overlay) | shipped | `el.setInputEnabled(false)` | config |
| Wheel zoom toward the cursor, right-drag pan | Standard navigation | proposed #290 | -- | camera state |

## 8. XR (VR and AR)

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Enter VR / AR | An immersive session on a headset; `vr` and `ar` are view modes | shipped (tested on an emulated headset in the `xr` test project) | `el.viewMode = "vr"`, `el.setViewMode("ar")`, `el.exitXR()` | XR interaction |
| Support check | Is VR / AR available here | shipped | `el.isVRSupported()`, `el.isARSupported()`; `Capabilities.xr` in the design | fact |
| XR button and availability warning | A built-in enter button, positioned in a corner | shipped | `xr.ui` config (`XRUIManager`) | config |
| Reference space and optional features | local-floor and friends; hit-test for AR | shipped | `xr.vr`, `xr.ar` config | config |
| Hand tracking, controllers, near interaction | Which inputs are on | shipped | `xr.input` | config |
| Grab and drag a node in XR | Trigger or pinch to pick a node and move it; a movement threshold stops tremor from dragging; velocity for release | shipped | `XRInputHandler` (`graphty-element/src/cameras/XRInputHandler.ts`) | position |
| Thumbstick camera | Move and turn the view with thumbsticks; a pivot camera in XR | shipped | `XRPivotCameraController`, `PivotController` | camera state |
| Z-axis amplification | Depth movement of a hand is scaled (research in `design/xr/xr-control-techniques.md`) | shipped | `xr.input.zAxisAmplification` | config |
| Teleportation | Jump to a floor point | shipped, off by default | `xr.teleportation` | XR interaction |
| Selection in XR | The same session selection, from a headset | shipped (`Selection.stories.ts` ModeVR / ModeAR) | `session.selection` | set |
| World-space panels, forearm anchoring, grab-and-scale the graph, ray / pinch / gaze selection, snap turn, AR passthrough framing | Working inside the headset without a desktop | proposed (design 9.3, deferred to 2.1) | -- | XR interaction |
| AI in XR | Voice commands in a headset | partial: voice input exists (section 9) | `el.getVoiceAdapter()` | AI action |

## 9. AI assistant

The assistant lives inside the element (`graphty-element/src/ai/`). It turns a text or voice
message into calls to the element's own commands, through an LLM provider.

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Enable with a provider | OpenAI, Anthropic or Google through the Vercel AI SDK, an in-browser WebLLM model, or a mock | shipped | `el.enableAiControl({provider, apiKey, model, keyPersistence})`, `el.disableAiControl()` | config |
| Send a command | Natural-language request executed as tool calls; result with success and message | shipped | `el.aiCommand(text)`, `el.cancelAiCommand()`, `el.retryLastAiCommand()` | AI action |
| Status and streaming | idle / thinking / calling tools; stream chunks, tool calls and results as events | shipped | `el.getAiStatus()`, `el.onAiStatusChange()`, events `ai-command-start/complete/error/cancelled`, `ai-status-change`, `ai-stream-chunk`, `ai-stream-tool-call`, `ai-stream-tool-result` | event |
| Voice input | Speech to text, with start / end / transcript events | shipped | `el.getVoiceAdapter()`, events `ai-voice-start/end/transcript` | AI action |
| Key persistence | Encrypted API key in local or session storage | shipped | `KeyPersistenceConfig`, `el.getApiKeyManager()`, `createApiKeyManager()` | config |
| Built-in tools | captureScreenshot, captureVideo, clearStyles, describeProperty, findAndStyleEdges, findAndStyleNodes, findNodes, getSchema, listAlgorithms, queryGraph, runAlgorithm, sampleData, setCameraPosition, setDimension, setImmersiveMode, setLayout, zoomToNodes | shipped (`graphty-element/src/ai/commands/`) | `CommandRegistry` | AI action producing style, run, camera state, export, data (read) |
| Schema extraction | The assistant is told the graph's attributes so it can write queries | shipped | `graphty-element/src/ai/schema/` | fact |
| Multi-turn tool use | Follow-up turns after a tool result (sample data, then act) | partial: `design/ai/ai-multi-turn.md` describes the gap and the plan | -- | AI action |
| Session commands as the tool vocabulary | Every session verb as a serialisable command, with a JSON schema an agent reads | proposed #337 (the `./commands` entry point is empty; design 4.11.1) | `session.run(command)` accepts `algo.run` only today | AI action |
| Say what data leaves the browser | The app's panel does not disclose what is sent | app issue #326; the element's schema extractor decides | -- | fact |

## 10. Events, session model, performance and acceleration

### 10.1 Events

| Event | Where | What it carries | Status |
|---|---|---|---|
| `run:changed` | session | run record and phase (queued, start, progress, end) | shipped |
| `selection:changed` | session; DOM `selection-changed` | added, removed, counts, truncated, unmatched, cause | shipped |
| `visibility:changed` | session | visible and total counts, filter kind, duration | shipped |
| `style:changed`, `style:problem` | session; DOM `style-changed` | layers touched, repaint size; a refused element painting | shipped |
| `data-loaded`, `data-loading-complete`, `data-loading-progress`, `data-loading-error`, `data-loading-error-summary`, `data-added`, `elements-removed`, `snapshot-replaced`, `node-add-before`, `edge-add-before`, `node-update-after`, `edge-update-after` | DOM / graph | load lifecycle and per-record hooks | shipped |
| `node-click`, `node-hover`, `node-drag-start`, `node-drag-end` (DOM: `graphty-node-*`) | DOM | node id | shipped (no edge events) |
| `layout-initialized`, `graph-settled`, `zoom-to-fit-complete`, `camera-state-changed` | DOM | layout and camera lifecycle | shipped |
| `operation-queue-active/idle`, `operation-start/complete/progress/obsoleted`, `operation-batch-complete` | DOM | the operation queue that serialises loads, layouts, runs and repaints | shipped |
| `animation-progress`, `animation-cancelled`, `screenshot-enhancing`, `screenshot-ready` | DOM | capture lifecycle | shipped |
| `graph-frame-stable`, `render-initialized`, `manager-initialized`, `lifecycle-initialized/disposed`, `skybox-loaded`, `error` | DOM | rendering lifecycle | shipped |
| `ai-*` (eleven) | DOM | assistant lifecycle (section 9) | shipped |
| `data:loading`, `data:changed`, `layout:changed`, `journal:appended` | session | designed session events | proposed #147, #144, #145 |

### 10.2 Session model

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Headless session | The whole model with no renderer, for a Node test, a worker or a second view | shipped; a standalone session has no attribute columns and cannot run algorithms without an executor (#147) | `createGraphSession()` from `@graphty/graphty-element/session` | -- |
| Two views of one dataset | Two renderers on one session (the basis of Compare mode) | designed (`session/types.ts` header); no second-view binding shipped; app #186 | -- | -- |
| Commands | Do one thing as data (`{op: "algo.run", ...}`), so a recipe, a journal and an agent share one door | partial: only `algo.run` (#337 lists the full union: data.*, style.*, select, visibility.*, layout.*, view.*, report, batch) | `session.run(cmd)`, `session.estimate(cmd)`, `session.plan(cmd)` | event |
| Journal | The record of commands run, replayable; each run carries a `journalId` | proposed #145 (design 4.11.2) | -- | table |
| Recipes | A saved list of commands to replay on another graph | proposed (design 4.11) | -- | table |
| Notes and annotations | A note pinned to a node, edge or point; tags, author, orphaning when the target leaves; marker clustering; an annotation document | proposed #145 (design 4.15.3 `NotesApi`); the app holds its own notes today | -- | table, style (marker) |
| Undo / redo | Reverse an edit | not the element's (design 9.2 / 9.3): every session edit returns an inverse-able record; the stack is the consumer's | style and run edits return runs with results | -- |
| Batch operations | Group several element edits so they repaint once | shipped | `el.batchOperations(fn)` | config |
| Configuration document | Every setting in one document: data mapping, behaviour, graph style, layers | shipped as the style template document | `StyleTemplate` (`graphtyTemplate: true`, `majorVersion: "1"`) | export |
| Logging | Console and remote log sinks, with a plugin for more | shipped | `session.catalog.logSinks()`, `docs/guide/extending/custom-log-destinations.md` | config |
| Errors | Every refusal is a `GraphtyError` with a code (`E_UNSUPPORTED`, `E_BAD_COMMAND`, `E_UNKNOWN_OPTION`, `E_DUPLICATE_ID`, `E_OPTION_RANGE`, `E_DISPOSED`, ...), a source and details | shipped | `graphty-element/src/errors/` | fact |
| Extension points | Six registries a third party may add to: algorithms, layouts, formats (data sources), palettes, cameras, log sinks; plus accelerators | shipped | `docs/guide/extending/index.md`, `pluginRegistry` | -- |
| Framework wrappers | React JSX types and wrappers | proposed #40 | -- | -- |

### 10.3 Performance and acceleration

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| WebGPU acceleration | When `@graphty/webgpu-graph-algorithms` is installed, PageRank, personalised PageRank, HITS, eigenvector, Katz, connected components, BFS, single-source shortest paths, Bellman-Ford, closeness, betweenness, all-pairs, k-core, triangle count, label propagation, MST and Louvain may run on the GPU; ForceAtlas2, Fruchterman-Reingold and spring-electrical layouts too | shipped for the layouts and the algorithms the accelerator seam covers; the element owns detection, construction and device loss | `session.config.acceleration.policy` (`auto`, `off`, `required`), `.minNodes`; `session.capabilities.acceleration` (state: probing, active, idle, unavailable, error, off; backend, vendor, device, reason) | run, position, fact |
| Never fall back silently | A GPU failure mid-run is an error, not a quiet CPU finish | shipped by rule (root `CLAUDE.md` "WebGPU") | -- | fact |
| Cost model and calibration | Estimates from rates (linear, iterative, heavy pairs, cubic); measured timings replace the model; `calibrate()` to measure this machine | partial: measurements and rates ship; `session.calibrate()` is missing (#146, #159) | `CostEstimate.confidence`, `MachineCalibration` | fact |
| Exact vs approximate | Above 2,000 nodes a heavy run may sample; the caveats say so | shipped | `StartOptions.exact`, `.sample`; `AlgorithmDescriptor.approximable` | config |
| Render settings | Engine-level rendering options | shipped, loosely typed | `el.setRenderSettings(settings)` | config |
| WebGPU rendering (Babylon WebGPUEngine) | Draw with WebGPU when available | proposed #36 | -- | config |
| Profiling and stats | Frame profiling, blocking report, measurements, performance snapshot | shipped | `el.enableDetailedProfiling`, `el.getStatsManager()` | fact |
| Frame stability | Know when the picture has stopped changing (for a screenshot or a test) | shipped | `el.waitForStableFrame()`, `el.isFrameStable`, `graph-frame-stable` | event |
| Large graphs | Mesh instancing; a 250-node physics story; the render ceiling is published but not enforced | partial (#302) | `DEFAULT_LIMITS` | config |
| Worker-hosted session | The model in a Web Worker | proposed (design 9.3) | -- | -- |

## 11. Screenshots, video, export

| Capability | What it does for a reader | Status | API | Produces / acts on |
|---|---|---|---|---|
| Screenshot | PNG, JPEG or WebP at a multiplier or exact size, transparent background, quality enhancement (supersample, MSAA, FXAA), presets (print, web-share, thumbnail, documentation), a chosen camera or preset, wait for settle | shipped | `el.captureScreenshot(options)`, `el.canCaptureScreenshot()` | export |
| Destinations | Blob, download with filename, clipboard (with a status: success, not-supported, permission-denied, not-secure-context, failed) | shipped | `ScreenshotOptions.destination` | export |
| Video | WebM or MP4 at an fps and bitrate, stationary camera or a path of waypoints with easing, transparent background, download | shipped | `el.captureAnimation(options)`, `cancelAnimationCapture`, `isAnimationCapturing`, `estimateAnimationCapture` | export |
| Legend in the picture | The legend drawn into the capture | proposed #292 (design 4.9 `legend: true`) | -- | export |
| SVG and PDF capture | Vector output | proposed (design 4.9; `CaptureCapability.svg/pdf` declared) | -- | export |
| Capture plan | Pixel size, nodes in frame, legend channels and bytes before rendering | proposed (design 4.9 `view.capture` plan; `PlanEffect.image` type exists) | -- | fact |
| Report | HTML, Markdown or PDF with statistics, rankings, communities, image, legend, a generated methods paragraph, notes | proposed (design 4.9; app #187) | -- | export |
| Evidence bundle | A ZIP of CSVs, image, journal and recipe | proposed (design 4.9) | -- | export |
| Export a result | Ranked list or groups as CSV | proposed (app #178; design result-shape table); readable today through `RunResult.ranking()` | -- | export |
| Export data | The graph in a file format | proposed (section 1) | -- | export |
| Export camera presets | Saved views as JSON | shipped | `el.exportCameraPresets()` | export |
| Export styles | The stack as a document | shipped | `session.styles.toDocument()` | export |

---

## 12. Reading the inventory as objects

Collapsing the tables above by the "produces" column gives the design its object vocabulary.
The counts are of shipped capabilities unless marked.

- **Sets** (things a reader can name, colour, hide, combine): the selection (one, shared); saved
  scopes (named, nestable); filter results (one visible set, from eight filter kinds); path,
  node-set and edge-set results (shortest path, MST, matching, min-cut); the members of each
  group in a partition; neighbourhoods at depth 1-3; the top-N and above-threshold of a measure.
  Set operations exist on the selection only (replace, add, remove, toggle, intersect); saved
  scopes can reference one another but cannot be combined.
- **Measures** (one value per element): every centrality (7 shipped), DFS order, all-pairs
  eccentricity, max-flow per edge, plus any imported numeric attribute. Their Fill is an
  encoding layer with a scale and a palette; the legend model describes it.
- **Partitions** (a label per element, which is also a family of sets): four community
  detectors, components (weak and strong), BFS levels, bipartite sides, min-cut sides, and the
  proposed node-type role. Groups have numbers, not names (#191), and cannot be filtered by size
  (#192).
- **Facts and tables**: graph statistics, selection statistics, result summaries, histograms,
  rankings, the legend model, the import report, cost estimates and plans, run records and
  caveats. None is drawn by the element; all are data for a panel.
- **Positions**: sixteen layout engines, pinning, dragging; no public transport (#144).
- **Camera states**: five built-in views, saved presets, animation; no follow, link or minimap.
- **Styles**: the layer stack, 40 channels, 9 scales, 18 palettes, templates, explain and legend.
- **Live objects with a state**: a run (queued / running / succeeded / failed / canceled, with
  progress, stale and caveats), a filter pass, a style edit and a layout are all runs or
  run-like, so the design's "objects are live and take time" requirement is already the
  element's model.

The gaps that matter most to an object-first UX, all recorded as issues: no query engine for
expressions and text search (#149), no layout transport or positions verbs (#144), no notes or
journal (#145), no group names (#191), no result-field filters (#192), no data export, no
on-canvas legend (#292) or minimap (#293), and only one command kind exposed as data (#337).
