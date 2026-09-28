# Feature fit 3: algorithms and results

Every algorithm graphty-element ships or has been asked for, and every part of its run model
(starting, watching, cancelling, costing, reading, styling a result), placed in the object-first
model of `design/ui/object-first-ux/object-model.md`. One row per capability. The inventory the
rows come from is `design/ui/object-first-ux/inventory/element-capabilities.md`, section 3 and
section 10.3; the app's current algorithm surfaces are in
`design/ui/object-first-ux/inventory/app-today-and-personas.md`, section 3.5.

Written for an engineer who is not a designer. Terms are defined in section 1. File paths are
under `/home/apowers/Projects/graphty-monorepo/`. `session.x` is a member of the element's
session API in `graphty-element/src/session/`. `#NNN` is an open issue in
graphty-org/graphty-monorepo. Nothing here changes code.

## 1. Terms, and the columns of every table

- **Object**: a row in the left-hand tree. The reader edits objects and nothing else. Kinds:
  Dataset (the root), Set (a collection of elements, one look), Group (one label of a
  Grouping), Measure (one value per element, painted with a scale), Grouping (one label per
  element, which is also a folder of Groups). See object-model section 2.
- **Element**: one node or one edge. Material, not an object.
- **Tool**: a toolbar verb that creates an object. The five that make algorithm objects are
  Filter (F), Neighbours (E), Path (P), Groups (G) and Rank (R). A tool's **flyout** is the
  dark menu behind its chevron listing its variants.
- **Inspector**: the right panel, showing the selected object's sections: Definition (how it is
  made), Values or Members or Groups (what it holds), Fill (how it looks), Findings (results with
  no members computed on it), Made by (the record), Export, Notes.
- **Fill**: an object's appearance: the style layer that paints its members. A Measure's Fill
  is an encoding (a scale and a palette on a channel); a Set's Fill is a highlight (one colour).
- **Precedence**: when two objects paint the same channel of the same element, the one nearer
  the top of the tree wins. New objects go to the top of their scope.
- **State**: current, computing, waiting (created but not run because it would take too long to
  start unasked), stale, failed, frozen. Object-model section 5.
- **Scope**: the elements a tool is allowed to look at: what is showing (the mask), or the
  focused Set. A child object is one computed within its parent's members.
- **Linked object**: an object whose Definition points at another (Top 10 by Bridges points at
  Bridges). It sits immediately above its first input and is not nested under it.
- **Findings**: a section of an object's inspector holding results that have no members (a fact
  such as diameter, a pair list, a time series). A Finding is never a tree row.
- **Result shape**: the element's own typing of what a run produces
  (`graphty-element/src/catalog/types.ts`, `ResultShape`): `node-metric`, `edge-metric`,
  `community`, `layered-grouping`, `category-table`, `path`, `node-set`, `edge-set`,
  `pair-list`, `temporal`, `fact`.
- **Run**: one execution of an algorithm, kept by the element with its parameters, status,
  progress, result and caveats (`session.runs`).
- **Caveat**: a qualification the run attaches to its numbers (approximate, sampled, not
  converged, single precision on the GPU). One line each in Made by; never a state.
- **Cost gate**: the element's refusal to start a run unasked above a time or memory budget
  (`session.estimate`, `gateRun` in `graphty-element/src/session/cost/`).

The columns:

| Column | Meaning |
|---|---|
| Home | where the capability lives: the object kind it yields, the tool and flyout row that creates it, the inspector section and row that shows it, a menu or Ctrl+K command, the table dock, or "not on the everyday screen" (a Settings row, a consumer setting, or an API with no reader-facing surface) |
| Fit | **natural**: the model expresses it without a special case. **awkward**: it fits, but only with a rule stated in section 5. **no**: the model has no honest place for it; section 6 |
| Element API | the session members it uses today, and the gaps it needs, named |
| Tree, precedence, state | what creating or using it does to the tree order, to which Fill wins, and to object states |

## 2. The placement rules

Six rules place every row below. They are the object model's rules restated for this area, plus
two that this area forced.

1. **The result shape decides the object kind and the flyout.** `node-metric` and `edge-metric`
   make a Measure and live under Rank. `community`, `layered-grouping` and `category-table`
   make a Grouping with Group children and live under Groups. `path`, `node-set` and `edge-set`
   make a Set and live under Path. `fact`, `pair-list` and `temporal` make no object: they are
   Findings, created from the Findings section's "+" of the Dataset (or of the focused Set) and
   from Ctrl+K. One override: an algorithm whose options include a pair of node picks (max flow,
   min cut between two nodes) lives under Path whatever its shape, because the gesture is the
   Path gesture. A plugin algorithm registered in the catalogue lands in the right place with no
   app change (`session.catalog.algorithms()`).
2. **A run's suggested layers are its rows.** The tree is the style stack linearised, so every
   layer the element derives for a run (`graphty-element/src/session/styles/derive.ts`) is one
   object row, and a run that suggests two layers (a pairing's edges and its two sides) makes
   two rows linked to the one run. A run that suggests nothing makes a Finding.
3. **A field becomes an object on request.** A run often publishes more fields than its primary
   one: HITS publishes hub and authority; degree publishes in and out; a shortest route publishes
   the distance from the source for every reachable node; a flow publishes each node's role. Any
   published per-element field can be promoted with "Make an object from field..." in the
   object's overflow (a Measure for a numeric field, a Grouping for a label field, a Set for a
   boolean field). The new row is linked to the same run, placed immediately above its source,
   and re-runs with it. This is one mechanism, so the flyouts stay one row per algorithm.
4. **A run's graph-level fields show on the object it made.** Modularity sits in a Grouping's
   Groups section header; diameter and radius sit in the eccentricity Measure's Values header;
   total weight sits in the spanning network Set's Members header. Only a run that made no
   object puts its graph fields in Findings.
5. **Parameters come after creation.** A tool runs with defaults; every option from the
   catalogue's option descriptors is a row in the new object's Definition, rendered generically
   (a number field, a switch, a select, a node pick). The only parameters asked for before the
   run are node picks, and those are asked on the canvas.
6. **Cost decides everything about timing, kind decides nothing.** Under one second: the row
   appears and fills in. Over the gate: the row appears in the waiting state with "Run (about
   4 min)" and "Approximate instead". A Definition edit re-runs at once when cheap and marks
   the object stale when not.

## 3. The catalogue, entry by entry

### 3.1 Shipped entries (`graphty-element/src/catalog/algorithms.ts`)

| Capability (key) | Home | Fit | Element API | Tree, precedence, state |
|---|---|---|---|---|
| Connections (`degree`) | Measure. Rank > Connections. Values: Field [Total v] with In and Out on directed data; Definition: Direction [Total v] once #161 lands. Instant, so it never waits | natural | `session.runs.start("degree")`, `RunResult.ranking/histogram`, `session.styles.encode`. Gap #161: no direction option, in/out split on undirected data is record order | new row at the top of the scope; default Fill avoids a channel a visible object above already writes (Size when Colour is taken, a small element gap: `suggestStyles` always suggests colour today); current within milliseconds |
| Bridges (`betweenness`) | Measure. Rank > Bridges. Heavy: the flyout row shows "about 4 min" from `session.estimate`; above the gate the row is created waiting | natural | `runs.start`, `estimate`; caveats `exact`, `sampleSize`, `precision`. Gap #313: no weight or direction option. Gap: no built-in declares `approximable`, so "Approximate instead" has nothing to call today | row waiting until Run; stale when the mask or data changes (`run.stale`); "~" before the count when approximate |
| Reach (`closeness`) | Measure. Rank > Reach | natural | as Bridges. Caveat `componentScope` says whether a disconnected graph was scored per part | as Bridges |
| Influence (`pagerank`) | Measure. Rank > Influence. Definition: Damping, Iterations, Tolerance, Weights [switch]; useDelta under an "Advanced" disclosure. Made by: "converged in 41 iterations" or the not-converged caveat | natural | `runs.start("pagerank", {dampingFactor, ...})`; caveats `converged`, `iterations`. Gap: the personalisation vector (`PageRankAlgorithm.ts:78`) is "programmatic only, not in schema", so Personalised PageRank, which takes a Set of seed nodes as input, has no door (section 5, note 4) | current or, on a data change, stale; edits to Damping re-run at once (iterative, sub-second on small graphs) |
| Influence by association (`eigenvector`) | Measure. Rank > Influence by association. Definition: Direction [In/Out/Total] from `mode`; Iterations, Tolerance; normalized and endpoints under Advanced | natural | `runs.start("eigenvector")`; `ConvergenceError` becomes the failed state with Retry. Gap #61: no edge weights | as Influence |
| Influence at a distance (`katz`) | Measure. Rank > Influence at a distance. Definition: Alpha, Beta, Direction, Iterations, Tolerance | natural | `runs.start("katz")` | as Influence |
| Hubs and authorities (`hits`) | Two Measures from one run: "Hubs (HITS)" and "Authorities (HITS)". Rank > Hubs and authorities. The combined `value` field is reachable through Values > Field but makes no row of its own | awkward | one run, two objects (rule 3 above). Gap: the objects API must key a Measure by (run, field), not by run; `runs.remove` removes every layer of the run, so deleting one of the two rows must keep the run while the other exists | two rows, Authorities above Hubs, both linked to one run; re-run either and both update; delete both and the run goes |
| Communities (`louvain`) | Grouping with Group children. Groups > Communities. Definition: Resolution, Iterations, Tolerance, Seed (from `StartOptions.seed`); useOptimized under Advanced. Groups header: Groups 6 \| Modularity 0.36 | natural | `runs.start("louvain")`, `RunResult.summary().groups`, `styles.encode` (categorical, overflow "Other"). Gaps #191 (group names), #192 (hide groups under N, filter on `groupSize`), #193 (per-group profile) | row plus children; each Group inherits the Grouping's palette entry and may override; a re-run re-matches groups by overlap so names and overrides follow (element work, object-model 5) |
| Communities, refined (`leiden`) | Grouping. Groups > Communities, refined. Definition adds Threshold and Seed (`randomSeed`) | natural | as Louvain | as Louvain |
| Communities, fast (`label-propagation`) | Grouping. Groups > Communities, fast. No modularity row (the run publishes none) | natural | as Louvain | as Louvain |
| Communities by cutting bridges (`girvan-newman`) | Grouping. Groups > Communities by cutting bridges. Definition: Max groups, Min group size, Iterations. Heavy: waits above the gate | natural | as Louvain; `estimate` for the gate | as Louvain, often created waiting |
| Separate pieces (`components`) | Grouping. Groups > Separate pieces. Definition: Kind [Weak v] (Strong only on directed data, from `strength`). Instant | natural, with one duplicate door noted | `runs.start("components")`. Also `session.data.statistics().components` gives the count and sizes without a run: the Dataset Summary row "Parts 3" is that fact, and Filter > Largest connected part is a Set from `{scope: "largest-component"}`. Three doors, three different kinds (a fact, a Set, a Grouping), so none is a duplicate | row plus one Group per part; the Summary's "Parts 3" row gets a "Show as groups" action that is exactly this run |
| Shortest route (`shortest-path`) | Set (ordered). Path > Shortest route: two canvas picks. Definition: From [node] \| To [node], Method [Dijkstra v] (Bellman-Ford), Weighted [switch]; bidirectional under Advanced. Members: hop order. Members header: 4 hops \| cost 3.0 | natural | `runs.start("shortest-path", {source, target, method})`, `styles.highlight`. The per-node `distance` field (every reachable node's distance from the source) is promoted with "Make an object from field" into a linked Measure "Distance from node 1" (rule 3). `hasNegativeCycle` is a Made-by caveat | row at the top; wins on the path's nodes and edges. No route: the Set exists with 0 members, state current, Made by "No route: they are in different parts" (section 5, note 2) |
| How far from everything else (`all-pairs-distance`) | Measure (eccentricity). Rank > How far from everything. Values header: Widest 5 \| Narrowest 3 (diameter, radius, rule 4). Cubic: almost always created waiting | natural | `runs.start("all-pairs-distance")`; graph fields `diameter`, `radius`. #310 would replace it with a BFS-based run under the same flyout row | row waiting; on Run, current |
| Steps away (`bfs`) | Grouping (ordered). Groups > Steps away from a node: one canvas pick. Definition: From [node], Within [any v] steps (#160), Stop at [node] (optional pick, from `targetNode`). Groups: "0 steps", "1 step", ... in order | awkward (overlaps the Neighbours tool) | `runs.start("bfs", {source})`. Gap #160: no `maxDepth`. Gap: `layered-grouping` gets a categorical palette from `planEncoding`; an ordered grouping should default to a sequential ramp so "further" reads as "darker" | row plus one Group per level. Neighbours (E) hands back a Set of the same nodes with no per-node depth (a selection target or a `neighborhood` filter); section 5, note 5, says how the two become one run |
| Exploration order (`dfs`) | Measure (discovery time). Rank > Exploration order: one canvas pick | natural mechanically; a teaching algorithm nobody will colour by. It sits last in the Rank flyout, sorted by cost then name | `runs.start("dfs", {source})` | row at the top; a Measure whose Fill nobody wants: the reader hides its eye or deletes it |
| Cheapest connecting network (`kruskal`) | Set of edges. Path > Cheapest connecting network: no picks. Members header: 33 edges \| total cost 41.0. Unavailable on directed data, with the reason in the flyout row's tooltip | natural | `runs.start("kruskal")`, `session.catalog.metrics()` for `requires: {directed: false}`, `styles.highlight` on edges | row at the top; wins edge colour on its edges. Selecting the row halos its edges (edge selection exists; edge picking on the canvas is #319) |
| Cheapest network from one node (`prim`) | Set of edges. Path > Cheapest network from a node: one pick. Definition: Start [node] | natural | `runs.start("prim", {startNode})` | as Kruskal |
| Best pairing (`bipartite-matching`) | Two rows from one run (rule 2): a Set of edges "Best pairing" and a Grouping "Sides (Best pairing)" with two Groups. Path > Best pairing: no picks. Members header: 17 pairs. The per-node `matched` boolean is promotable to a Set "Paired nodes" | awkward (one run, two rows, one of them a Grouping from the Path tool) | `runs.start("bipartite-matching")`; `suggestStyles` already derives both layers (`derive.ts`, the string-field grouping rule). Not two-sided: the Set is empty and Made by says "The graph has no two sides" | two rows, the Grouping above the Set (the grouping layer is derived second, so it is higher); both linked to one run |
| Most that can flow (`max-flow`) | Measure on edges (flow). Path > Most that can flow: two picks (the pair-input override). Definition: Source \| Sink, Capacity from [weight v]. Fill: edge width. Values header: Most that can flow 12.0. Node fields `netFlow` and `role` promotable (a Measure, a Grouping of source/sink) | awkward (the Path tool hands back a Measure) | `runs.start("max-flow", {source, sink})`; `styles.encode` on `edge.width`. Gap #313: which attribute is the capacity is not a declared option with a meaning | row at the top; wins edge width, which nothing else writes by default |
| Weakest link (`min-cut`) | Set of edges "Weakest link" plus a Grouping "Sides (Weakest link)" (rule 2). Path > Weakest link between two nodes (two picks) and Path > Weakest link anywhere (no picks, `useGlobalMinCut`): two rows in one flyout for one key. Members header: 3 edges \| cost 5.0. Karger and its iteration count under Advanced | awkward (two flyout rows preset different options; a Grouping from the Path tool) | `runs.start("min-cut", {source, sink})` or `{useGlobalMinCut: true}`. Gap: nothing in an option descriptor says "this option is a canvas pick"; #336 (`optionsFor`) resolves node ids but a pick role is still needed | two rows, both linked to one run |

### 3.2 Declared but unregistered, and proposed algorithms

| Capability | Home | Fit | Element API | Tree, precedence, state |
|---|---|---|---|---|
| Clustering coefficient (#330) | Measure. Rank > Clustering. Values header: Average 0.57 \| Transitivity 0.26 (rule 4) | natural | catalogue entry; GPU `triangleCount` when routed | row at the top |
| All simple routes (#329) | One Set "All routes 1 -> 34" whose members are every node and edge on any route; a Routes list in Members (each route a row: hops, click selects it); "Make a set from this route" per row. Path > All routes: two picks; Definition: Max steps, Max routes | awkward (a set of overlapping sets) | catalogue entry with `isOnAnyPath` and a per-path index; the per-route promotion is rule 3 over a path index field | one row; per-route Sets are linked rows above it on request |
| Densest shells (`k-core`) | Grouping (ordered). Groups > Densest shells. Groups: "Shell 1" ... "Shell 5". Values header "+" offers "Shell N and above set..." (an Above cut on the level field) | natural | register the key; GPU `kCoreDecomposition` exists in the accelerator contract; the sequential-palette gap noted for BFS applies | row plus one Group per shell |
| Likely missing links (`link-prediction`, pair list) | A Finding, not an object: Dataset > Findings "+" > Likely missing links, or Ctrl+K. The row reads "312 pairs" with "Open in table" (a pairs table in the dock: source, target, score, common neighbours) and Export. "Highlight pair" selects the two nodes | awkward (no members, so no row, no Fill, no eye) | register the key; `RunResult` for a `pair-list`. Gap: no table-dock source for a pair list (the dock lists nodes and edges) | no tree change; a Finding has its own state glyph and Re-run |
| Markov, spectral, hierarchical clustering (#55) | Groupings. Groups flyout, three rows. Hierarchical: Definition "Groups [k]" re-cuts the dendrogram; cheap, so it re-runs live | natural | register from `@graphty/algorithms`; hierarchical needs a "cut at k" option or the run keeps the dendrogram and re-cuts | as Louvain |
| A* (#55) | Not a flyout row: Method [A* v] on a Shortest route's Definition, with Heuristic [Layout positions v] | awkward (a run that reads positions goes stale when the layout moves, and the state model has no positions trigger; section 5, note 8) | register; the heuristic option | no tree change |
| Edge betweenness (#55) | Measure on edges. Rank > Bridges (edges). Fill: edge width. The Rank secondary bar reads "Rank what is showing (78 edges)" | natural | register | row at the top |
| Cut points and bridge edges (#311) | One Set holding both halves: "Cut points and bridges", 4 nodes, 3 edges. Path > Bridge edges and cut points: no picks | natural | catalogue entry publishing a node boolean and an edge boolean; `styles.highlight` paints both halves | row at the top |
| What breaks if removed (#311, #180): removal impact | A linked Set "Removing node 3: 12 nodes affected", created from a node inspector's overflow ("What breaks if removed") or a Set's overflow. Definition: Removing [node 3] (clickable). Findings on that Set: Parts before 1 \| after 3, Nodes disconnected 12, Lose every path 4. No tool: the input is a node or a Set, not a scope | awkward (created from an inspector verb, not a tool; a what-if, not a measurement of the data as it is) | catalogue entry taking a node set as input and publishing an affected-node boolean plus facts; the graph is unchanged (#180 acceptance) | linked row above its input Set, or at the top when the input is a node; deleting the input freezes it |
| Scenarios (batch removal impact) | A Findings table on the Dataset: "Scenarios: 6", one row per scenario with its deltas and severity; "Make a set" per row creates the affected-node Set for that scenario; Compare with [View] shows two | no (a table of what-ifs is not an object; see section 6) | `runs.batch` of removal-impact runs plus a per-row summary | none unless a row is promoted |
| Diameter, radius, eccentricity, average path length (#310) | Eccentricity: Measure, Rank > How far from everything (replacing the cubic run under the same row). Diameter, radius, average path length: Findings on the Dataset (or focused Set), from Findings "+" > Distances, cost-gated like any run; once computed they also show in the Dataset Summary | natural | catalogue entry with node field eccentricity and graph fields | a Measure row when the reader asked for one; Findings otherwise |
| Unusual nodes (anomaly detection) | Measure (anomaly score). Rank > Unusual nodes. Values header "+" > Above threshold set... is the threshold slider. The `type` label field (degree outlier, structural, attribute) promotes to a Grouping. The per-node "why" (factors with z-scores) shows in the node inspector's Values row for this Measure, expanded on click | natural, with one new field type | catalogue entry; a text-per-node field type for the "why" (the `FieldDescriptor` types are numeric, boolean, string, table; a structured per-node explanation is new) | row at the top |
| Temporal analysis (`temporal` shape) | A Finding on the Dataset: "Over time: Communities, 12 steps" with a small series chart in the expanded row, a change-event list, "Go to this time" (sets Dataset > Showing > Time window), Export. "Biggest movers" promotes to a Measure (delta per node) by rule 3 | awkward (no members; a chart in a Findings row is the first chart in the inspector) | the `temporal` shape is declared; time role #333; playback #300 | none, unless movers are promoted |
| Per-group profile and over-represented values (#193) | A Profile section on each Group's inspector: "Mostly conference 7 (83%)", then rows "value, count, expected, adjusted p", with the correction method named. Not an object | natural | element computes it per group; the app renders rows | none |
| Group names (#191) | Rename in a Group's header; Grouping > Groups > Names from [attribute v]. The legend and exports read the same name | natural; required for rename to survive a re-run | element holds names with the run | none |
| Parameter sweep (#194) | A Findings table on the Dataset: "Resolution sweep (Louvain): 6 values", one row per value with groups and modularity; "Make an object" on a row binds a layer to that run and creates the Grouping row. Created from Groups > Communities > "Sweep..." (a popover: parameter, from, to, steps, Create) or Ctrl+K | awkward (N runs exist, only promoted ones are rows; section 5, note 6) | a sweep API over `runs.batch` with a per-value summary; sweep member runs must be marked so the tree does not draw one row per run | none until a row is promoted; a promoted row is linked to the sweep's run |
| Weight and direction options everywhere (#313) | Definition rows on every Measure and Grouping: Weights [switch] and Direction [As loaded v] (Undirected, Reversed), rendered from the option descriptors; caveats report what was used | natural | consistent option names in the catalogue (a one-way door, per the issue) | an edit marks the object stale or re-runs it, by cost |
| Custom algorithm plugin (`docs/guide/extending/custom-algorithms.md`) | Its flyout row by result shape, its Definition rows from its option descriptors, its cost from `session.estimate`. No app change | natural | `session.catalog.algorithms()` lists it; parity rules in `graphty-element/CLAUDE.md` | as its shape |

## 4. The run model: starting, watching, costing, reading, styling

| Capability | Home | Fit | Element API | Tree, precedence, state |
|---|---|---|---|---|
| Start a run (`session.runs.start`) | Every tool click and every flyout row; every Filter popover Create; Ctrl+K under both names. Options: `scope` is the mask or the focused Set; `seed` kept on re-run; `as` is the object's name; `style` is the auto-applied Fill | natural | `runs.start(key, params, {scope, seed, as, style})`. Gap: the objects API (object-model section 11) so the row, the run and the layer are one thing the element owns | a row appears instantly, computing or waiting |
| Run on load (`el.algorithmsOnLoad`) | Not on the everyday screen. The app does nothing unasked after a load (object-model section 9). A reader who wants "always run Groups" saves a recipe and runs it from the file menu; a consumer sets the property | no as an app feature; fine as a consumer setting | `el.algorithmsOnLoad`; recipes (proposed, design 4.11) | rows appear after load only when a recipe ran |
| Batch (`session.runs.batch`) | Rank > Several... (a checklist popover, one Create) and Groups > Several...; "Re-run all stale" on the Dataset overflow; "Run all" of a question (#195) is the same checklist pre-ticked | awkward (the auto-apply policy coalesces suggestions per channel, which would leave five of six rows without a Fill; section 5, note 3) | `runs.batch(specs)`; one `cancel()` for the batch from the status-bar computing chip | one row per member, all computing; each member's Fill created hidden except the first (proposed policy change) |
| Watch a run (status, progress, phase, ETA, queue position) | The row's computing state: a progress ring replacing the count, "42%" filling in; the inspector header "Computing 42% [Cancel]" with the phase in secondary text; the status-bar computing chip while anything computes | natural | `run.status`, `run.progress`, `session.on("run:changed")` | state computing |
| Cancel | The row's Cancel; Ctrl+Z right after creation removes the row and cancels; the status-bar chip cancels a batch | natural, with one honesty rule | `run.cancel()`. `CostEstimate.cancellable` and `blocksFrame`: a run that blocks the frame cannot draw its ring or take a click, so its Cancel is not drawn and its tooltip says "cannot be stopped once started"; the gate should be stricter for such runs (section 5, note 7) | computing to canceled: the row is removed (a cancelled creation) or returns to its previous state (a cancelled re-run) |
| Re-run | Definition > Re-run (with the estimate) when stale; the row's overflow; "Re-run all stale" bottom-up in tree order | natural | `run.rerun()` keeps the id, so the auto-apply policy never repaints (it paints on first completion only); the Fill stays as edited | stale to computing to current; children and linked objects re-run after it |
| Queue policy (append, replace, now) | Not on the everyday screen. The app's rule: a Definition edit uses replace (abort the same object's in-flight run), a new object appends | natural as an API | `RunOptions.queue` | none |
| Cost estimate (`session.estimate`) | The right-hand text of every flyout row ("instant", "about 4 min", "at least 4 min" when confidence is modelled, "unavailable" with the reason in the tooltip); the waiting state's Run button label; the re-run-now-or-stale rule | natural | `estimate(command)` is synchronous; `confidence` chooses "about" or "at least"; `session.catalog.metrics()` for availability and "already ran" | decides waiting versus computing, and stale versus live re-run |
| Plan (`session.plan`) | Not on the everyday screen; it feeds the secondary bar's Create button (disabled with the reason when `blocked`) | natural as an API | `plan(command)`; #337 for the other command kinds | none |
| Cost gate and the exact-computation cap | The waiting state, with Run and Approximate instead. The caps themselves: Settings > Performance ("Run at once under [1 s]; ask above [30 s]"), not the everyday screen | natural | `SessionRunsOptions.limits`, `gateRun`. Gaps #159, #146: the ceiling is fixed, `session.calibrate()` is missing, so Settings > Performance > "Measure this machine" has nothing to call | waiting |
| Exact versus approximate | Definition > Exact [switch] (off means the element may sample above 2,000 nodes); the waiting state's Approximate instead; a "~" before the count in the tree; the Made by caveat | natural | `StartOptions.exact`, `.sample`, caveats `exact`, `sampleSize`, `seed`. Gap: no built-in sets `AlgorithmDescriptor.approximable`, so nothing can be approximated today | "~" on the row; re-running exact replaces it |
| Caveats | Made by: one line each (approximate, sampled N, seed 42, converged in 41, largest part only, direction as loaded, weights as distance, single precision, method); the "~" glyph is the only caveat the tree shows | natural | `run.caveats` | none |
| Stale note | The stale state: amber dot, name dimmed, old paint kept; header "Stale: ran on 34 nodes, now 40 [Re-run (about 3 s)]" | natural, with one gap | `run.stale` covers the visible set changing only. The design also needs stale on a data change, a parameter edit and a scope edit, and propagation to children and linked objects: objects API work | stale, propagating down and along links only |
| Engine versions and precision | Made by: "algorithms 2.0.1, on the GPU (single precision)" | natural | `run.engine`, caveat `precision` | none |
| Run record | Made by, collapsed; "Copy as methods text"; Share > Copy methods text concatenates in tree order; Share > Export recipe writes every object's creation command | natural | `run.record`. Gap #177: the serialisers (methods text, command text, TSV at full precision) belong in the element | none |
| List, get, remove runs | The tree is the list. Delete on a row is `runs.remove` when no other row shares the run | natural, with one rule | `runs.list/get/remove`. `remove` drops every layer of the run at once, so a run shared by two rows (HITS, a pairing) or referenced by a linked Set (Top 10 by Bridges) must be removed only when its last row goes; the referencing objects freeze (object-model section 6.1) | row removed; linked rows frozen |
| Read a result (node value, column, ranking, histogram, summary, reading) | Values section: Field select, Min/Max/Mean/Median, the 208 x 40 histogram with linear/log, Top [10 v] rows; Groups section: sizes; the "?" in Made by reveals `reading()`; the node inspector's Values row per Measure and Grouping | natural | `session.results.get(run)` and `RunResult.node/column/ranking/histogram/summary/reading` | none |
| Column to ids (#148) | The table dock: one column per Measure and Grouping in tree order; sort by it; "See all in table" from any Values section | natural | gap #148 | none |
| Result path and term | Filter > By rule's autocompletion offers result fields by object name ("Bridges > 0.05"); the Top N and Above cuts are `{top}` and `{above}` selection targets and filters | natural; the reader never sees a dotted path | `results.path/term`; the one-set-vocabulary gap (object-model section 11) so a cut is a Set | a cut is a linked row above its Measure |
| Metric availability (`catalog.metrics`) | The flyout: "unavailable" rows with the reason in the tooltip (needs weights, needs a directed graph, needs WebGPU); "in tree" in secondary text when the same algorithm already ran, and running it again makes a second row (Figma allows two identical shapes) | natural | `catalog.metrics()`; `applicable()` #334 | none |
| Options for a form (#336) | Every Definition row: bounds, defaults, real node ids in pick fields, k bounded by the node count | natural | gap #336 | none |
| Results as attributes (origin `result`) | The table dock's Measure and Grouping columns. NOT the Dataset > Attributes section, which lists imported and joined columns only: a result column is already a row in the tree | natural | `session.data.attributes()` with `origin` | none |
| Suggested styles (`suggestStyles`, the auto-apply policy) | The default Fill of every new object: a ramp for a Measure, a palette for a Grouping, one colour for a Set; edited in the Fill section | natural, with two policy changes | `run.suggestEncodings()`, `StartOptions.style`. Two element changes: (1) suggest a free channel rather than the taken one (Size when Colour is taken above); today a suggestion on a taken channel is dropped, which would create a row with an empty Fill; (2) a batch's members after the first are created with the eye off rather than coalesced away | the new row's Fill wins on its channel because it is on top |
| Analysis history and undo (#145) | Made by on every object; Share > Copy methods text; Ctrl+Z as one step per creation, edit, reorder, delete; a History dock later | natural | journal #145; the undo stack is the app's (design 9.2) | undo removes or restores rows |
| Advanced parameters on a card (#196) | Definition rows after creation (rule 5); an object whose parameters differ from the defaults shows "edited" beside the method name | natural, solved by the model | option descriptors | none |
| Run all of a question (#195) | Rank > Several... pre-ticked; Groups > Several... | natural, solved | `runs.batch` | as Batch |
| Select top N, filter above, histogram brush, export groups (#178) | Values header "+" > Top N set..., Above threshold set... (linked Sets); dragging across histogram bars selects those nodes (element selection; Ctrl+G makes it a Set); Grouping > Export > Membership CSV | natural, solved | `{top}` and `{above}` targets; exporters (small gap) | a cut adds a linked row above the Measure |
| Run again with changes, Pin to report, Combine into a score, Copy menu (#177) | Duplicate then edit the Definition; Export > Report (issue #187) and Share; a formula Measure (computed attributes, proposed) with the inputs as linked rows; Made by > Copy as methods text and Export | natural once computed attributes exist | serialisers #177; formula Measure (design 4.3.4) | a formula Measure is a linked row above its first input |
| Question-first picker (#320), one result at a time (#176), layers grouped per run (#171), Insights cards | Solved by the model: the flyouts are the questions (Groups is "what groups exist", Rank is "who matters", Path is "how are these joined"); the tree holds every result; a Grouping owns its Groups; the empty tree's three suggestion rows replace the cards | natural | none new | none |
| WebGPU acceleration | Made by: "on the GPU (NVIDIA, single precision)"; the flyout cost reflects it; a run that needs it reads "unavailable: needs WebGPU" when absent. Settings > Performance: Acceleration [Auto v] (Off, Required) and the capabilities state (probing, active, unavailable with reason). Nothing else on the everyday screen | natural (the reader sees a faster estimate and one Made-by line) | `session.config.acceleration.policy`, `.minNodes`, `session.capabilities.acceleration`, `graphty-capabilities-change`. Note: the element's algorithm classes call the Graph-based CPU functions of `@graphty/algorithms` directly (`graphty-element/src/algorithms/*.ts`); the accelerator seam (`accelerated()` in `algorithms/src/indexed/accelerator.ts`, the element's `AccelerationController`) is reached by the layouts. Routing algorithm runs through it is element work the design does not depend on | none |
| Never fall back silently | The failed state: the error and Retry, plus "Retry without acceleration" as an explicit second button (an explicit choice is not a silent fallback) | natural | `GraphtyError` codes; a per-run acceleration override (gap: `acceleration.policy` is session-wide) | failed to computing |
| Cost model calibration (#146, #159) | Settings > Performance > "Measure this machine (about 10 s)"; the confidence word in every flyout row | not on the everyday screen | `session.calibrate()` missing | none |
| Large-graph limits (#302) | The secondary bar's scope count and the estimate; "Filter above threshold" opening at a drawable count is a Values > Above threshold default | natural | `DEFAULT_LIMITS`; enforcement #302 | none |

## 5. Notes on the awkward ones

**1. One run, several rows (HITS, Best pairing, Weakest link, "Make an object from field").**
The element keys a run once and derives one or two layers from it. The tree needs an object per
layer, and the reader needs more objects from the fields a run publishes but does not paint.
The rule: a row is (run, field, layer). Rows sharing a run re-run together, and the run is
removed when its last row goes. This is the objects API's job (object-model section 11); the
app must not keep the join itself. Until the objects API exists, HITS, a pairing and a cut make
one row each with a Field select in Values, which loses nothing but the two-Fill picture.

**2. An empty result is an object.** A shortest route with no route, a pairing on a graph with no
two sides, a cut that found nothing. The row is created, current, with 0 members, and Made by
carries the sentence ("No route from 1 to 34: they are in different parts", and on directed data
"following edge direction", with a "Try ignoring direction" re-run). Figma lets an empty frame
exist; deleting the row is one keystroke, and the negative result stays citable in the methods
text until then. A Set with 0 members has an empty Fill preview and no halo.

**3. A batch and the auto-apply policy disagree.** The policy in
`graphty-element/src/session/styles/autoApply.ts` holds a batch's suggestions and keeps one per
channel, so six ranked metrics make one colour layer. In the tree every one of the six is a
Measure row, and a row with no Fill is a row whose eye cannot mean anything. The proposal:
members after the first are given their Fill with the eye off, so the picture is identical to
today (one visible ramp) and the tree is honest (six rows, five dimmed). Same for the second
policy rule, "a layer somebody wrote by hand wins, the suggestion is dropped": in the tree, drop
becomes "suggest a free channel; if none is free, create the Fill hidden". Both are element
changes to one file.

**4. A Set as a parameter (Personalised PageRank, removal impact, Combine into a score).** Every
tool today takes its inputs from the canvas: a scope and up to two picks. Three capabilities
take an object as input: PageRank personalised from a seed Set, removal impact of a Set, and a
formula over Measures. The Definition already shows linked inputs as clickable rows (the Top N
cut, a Combination), so the shape exists; what is missing is a creation door. The door is the
input object's own overflow ("Influence from these...", "What breaks if removed", "Combine into
a score...") rather than a tool, because a tool cannot ask for an object on the canvas. The
result is a linked row immediately above its input. PageRank's personalisation vector is not in
its option schema (`PageRankAlgorithm.ts:78`), which is the API gap.

**5. Neighbours (E) and Groups > Steps away are two doors to one walk.** E hands back a Set (the
seeds and everything within k steps); Steps away hands back a Grouping by distance. The
recommendation: the Neighbours tool runs `bfs` with `maxDepth` (#160) rather than the
`neighborhood` filter, so its Set and a promoted "Steps away" Grouping (rule 3 on the `level`
field) are one run, one re-run and one Made by. Steps away stays in the Groups flyout for the
reader who wants levels first.

**6. Sweeps and scenarios are tables of runs.** A parameter sweep (#194) makes six Groupings and
a comparison; a Scenarios batch makes twenty affected-node Sets. Twenty rows for one question
is the flood the model avoids for attributes, so both are Findings tables with a "Make an
object" per row that promotes one run to a tree row. The sweep's member runs must be marked by
the element so the tree does not draw them all (`session.runs.list()` returns every run today).
This is the one place the model's "one row per run that produced members" rule is bent, and
the bend is stated on the Finding ("6 runs, none shown; make an object from a row to see one").

**7. A run that blocks the frame has no honest progress.** `CostEstimate.blocksFrame` says the
run will freeze the tab. The row's progress ring cannot animate and Cancel cannot be clicked. The
rule: such a run is never started unasked (the waiting state applies at a lower threshold than
the 30 s cap), its Cancel is not drawn, and the waiting row's Run button carries "will pause the
page for about 8 s". Today the app's confirm dialog and the element's `blocksFrame` already
agree on this; the design keeps it and removes the dialog.

**8. A run that depends on positions (A* with a layout heuristic).** Every other object depends
on the data, the scope and its parameters; A* with a position heuristic also depends on where the
layout put the nodes, and the state model has no "positions changed" trigger. The result is a
valid shortest route either way (the heuristic changes speed, not the answer, when admissible),
so the simplest rule is: the route is not marked stale by layout motion; Made by records
"heuristic from the layout at 14:02". If a non-admissible heuristic is ever offered, this note
becomes a gap.

**9. Where a Finding is made.** No tool yields a fact, a pair list or a series, so the toolbar
has no verb for them. The door is the Findings section's "+" on the Dataset (or on the focused
Set, which scopes the computation), listing the catalogue entries whose shape yields no members,
each with its cost; and Ctrl+K under both names. This keeps "every algorithm has exactly one
flyout" true by making the Findings "+" the sixth flyout.

## 6. Capabilities that do not fit

Each of these has no honest home as an object, and forcing one would break a rule the model
depends on. Where they went instead is stated.

- **Run on load (`el.algorithmsOnLoad`) as an app behaviour.** The model's rule is that nothing
  is computed unasked after a load. It stays a consumer property of the element and a recipe
  the reader runs from the file menu.
- **Scenarios (batch removal impact) as tree rows.** Twenty what-ifs are a table, not twenty
  Sets. A Findings table with per-row promotion (section 5, note 6).
- **A parameter sweep as tree rows.** Same reason, same home.
- **"Show as dashed edges" for a pair list.** It would paint edges that do not exist, and the
  layer model paints only elements. The pair list is a table; "Highlight pair" selects the two
  nodes; "Add as edges" is a data edit (a Cleaning step in the old design), which is outside this
  area and outside the object model (object-model section 10 lists data edits as a rough edge).
- **"Replace graph with projection" (bipartite projection).** A data edit that makes a new
  graph; not an object of this graph.
- **Per-time-step re-runs shown as N stale Measures (temporal analysis, playback #300).** A
  series is a Findings row with a chart; only "biggest movers" becomes a Measure.
- **Queue policy, plan, calibration, the acceleration policy.** Not reader-facing; Settings rows
  or API. Listed so nobody looks for them on the everyday screen.

## 7. Element gaps this area names

Beyond the object-model section 11 list, in the order the tables above met them:

| Gap | Needed by | Issue |
|---|---|---|
| Objects keyed by (run, field, layer); a run removed only with its last row | HITS, pairings, cuts, "Make an object from field" | objects API, new |
| Suggest a free channel instead of dropping a suggestion; batch members created hidden | every second Measure; Rank > Several... | new, `autoApply.ts` and `derive.ts` |
| Sequential palette for ordered groupings (`layered-grouping`) | Steps away, Densest shells | new, `planEncoding` |
| An `approximable` declaration on the heavy built-ins | Approximate instead | new; #159 and #146 for the ceiling |
| A "canvas pick" role on node-id options | every Path variant, Prim, BFS, DFS | with #336 |
| Personalisation vector in PageRank's schema | Influence from a Set | new |
| Stale on data, parameter and scope changes, propagating down and along links | every object | objects API; `run.stale` today covers the mask only |
| Per-run acceleration override | Retry without acceleration | new |
| Sweep member runs marked as such; a sweep summary | parameter sweep | #194 |
| A text-per-node field type | Unusual nodes' "why" | new |
| A pair-list source for the table dock | Likely missing links | new |
| Serialisers for a run (methods text, command, TSV) | Made by > Copy | #177 |
| Direction on degree; maxDepth on BFS; weights and direction everywhere | Definition rows | #161, #160, #313 |
| Group names, group-size filters, group profiles | Grouping and Group inspectors | #191, #192, #193 |
| Registration of the declared and implemented algorithms | flyout rows | #55, #329, #330, #310, #311 |
