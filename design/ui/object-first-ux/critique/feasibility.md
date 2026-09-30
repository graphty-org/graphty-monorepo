# Feasibility of the object-first mocks against graphty-element as it stands

Written as the graphty-element maintainer. For every one of the eight mocks in
`design/ui/object-first-ux/mocks/` (screens.md and screen-1.png to screen-8.png), and for
every row of every inspector they draw, this names the element API that backs it today or the
gap. It then checks the mocks against the three rules in the root `CLAUDE.md` (the app must not
compute over the graph; appearance goes only through style layers; an algorithm's suggested
styles paint only its own results), lists where the mocks quietly assume the app computes
something, and sizes the element work the paradigm needs.

Everything below was checked against the source on 2026-09-25, chiefly
`graphty-element/src/session/` and `graphty-element/src/catalog/types.ts`, not against the two
inventories, which in three places turned out to be more optimistic or more pessimistic than
the code. Where this document disagrees with `object-model.md` section 11 or a feature-fit
file, it says so and the code is the reason.

Nothing here changes code. It is a design check.

## 0. Terms

The object model's words (Object, Element, Member, Tree, Inspector, Fill, Channel, Precedence,
Scope, Mask, Focus, State, Row, Section) are defined in `object-model.md` section 0 and are
used unchanged. The element's words this file needs:

- **Session**: `el.session`, the graph with no screen attached (`GraphSession` in
  `graphty-element/src/session/types.ts`). Every API written `session.xxx` is a member of it.
- **Run**: one execution of an algorithm, kept as an object with an id, parameters, status,
  progress, result and caveats (`Run` in `session/runs/types.ts`). A run's id is derived from
  the algorithm, its canonical parameters and the scope; the same request returns the same run.
- **Result**: what a run produced (`RunResult` in `session/results/types.ts`): per-node and
  per-edge fields, graph-level fields, a ranking, a histogram, a summary and a one-sentence
  reading.
- **Scope**: what a piece of work may look at (`Scope` in `catalog/types.ts`): `"visible"`,
  `"graph"`, `"selection"`, `"largest-component"`, a saved set `{set: id}`, an expression
  `{where}`, or a node list `{nodes}`. `session.scope.resolve` turns one into ids,
  `session.scope.count` counts one, `session.scope.save` keeps one under a name.
- **Filter**: what is showing (`Filter` in `session/visibility/filter.ts`): expression, range,
  categories, degree, component, neighbourhood, edges, and the combinators all / any / not.
  `session.visibility.set(filter)` applies one; there is exactly one in force.
- **Selection target**: what `session.selection.apply(target, op)` may select
  (`SelectionTarget` in `session/selection/targets.ts`): ids, a neighbourhood, an expression,
  a text search, a scope, the top N of a run, everything above a threshold, the edges between
  selected nodes, the inverse.
- **Layer**: one rule of appearance (`LayerSpec` in `catalog/types.ts`): a selector, a target
  (node or edge), fixed values (`set`) or bindings (`encode`), a source, an enabled flag. The
  stack is read bottom first. `session.styles.add / update / remove / move / encode /
  highlight / explain / legend` are the verbs.
- **Selector**: the part of a layer that says which elements it paints: an expression, a
  presence test (`has` a path), an id list, or everything.
- **The query engine**: the evaluator behind `{where}` scopes, `{where}` selection targets and
  expression filters. It is a **source the session is handed**, and today nothing hands it one
  (`ScopeSources.match`, `SelectionSources.match`, `FilterSources` are all absent in
  `session/GraphSession.ts`), so all three throw `E_UNSUPPORTED` (issue #149). The style
  engine is different: it compiles its own expression subset (`session/styles/predicate.ts`),
  so an expression **selector on a layer works today**. This one asymmetry decides most of
  section 1.

Sizes: **small** is a day or two inside one module; **medium** is a week touching several
modules and their tests; **large** is a new subsystem or a change to a published contract.

## 1. The one-paragraph verdict

The paradigm is a good fit for the element's model: runs, results, scopes, saved scopes,
layers, the selection and the visibility mask are already the six things the tree is made of,
and every Fill in the mocks is a layer the element can hold today. Three things stand between
the mocks and a build, and none is a UI problem. First, the query engine is not attached, so
a rule set ("Degree > 8", "value = 7") can be **painted** but cannot be **counted, selected,
focused or computed within**; screens 3 and 7 both depend on that. Second, the vocabulary for
"a set" is split three ways (a saved scope, a selection target, a filter) with no form that all
three accept, so a path cannot become the mask, a Group cannot be selected, and a Set's Fill
cannot name its members without expanding them to ids. Third, the tree itself (order, nesting,
names, states, links, locks) exists nowhere in the element, and the root `CLAUDE.md` forbids
the app from owning it. Those three are the work; the rest is a list of small and medium gaps,
most already recorded as issues, plus two element policies (exclusive highlights, "an authored
layer wins") that the mocks contradict and that should change.

## 2. Mock by mock

For each screen: the chrome first, then every inspector section row by row. "Today" names the
API that backs the row now. "Gap" names what is missing, with a size. A row with no gap column
entry is buildable as drawn.

### 2.1 Screen 1: first run, nothing loaded

| What is drawn | Today | Gap |
|---|---|---|
| Welcome sheet: drop zone, Choose a file | `el.loadFromFile(file, options)`; format sniffed from content (`session.catalog.formats()`) | none |
| "Open a file / Paste data / From a URL" rows | `loadFromFile`, `setData`, `loadFromUrl` | none |
| Sample list with counts and blurbs | app-side manifest today (`graphty/src/data/sampleManifest.ts`); the counts are the manifest's | none for the mock; a `data.sample` command is design 4.11 and would move the list into the element (small, optional) |
| Toolbar with every tool but Select and Hand disabled | app state | none |
| Zoom readout "100%" | `el.getCameraState()`; no fit-extent so the percentage is app arithmetic over the camera state (see 3.1) | small: publish a zoom fraction or the fit extent |

Buildable today.

### 2.2 Screen 2: loaded, nothing selected (the Dataset inspector)

Left panel and canvas:

| What is drawn | Today | Gap |
|---|---|---|
| "Karate Club  34 / 78" root row with a locked chip | `session.status.counts`; the two element-owned base layers (`source.by == "element"`, `locked`) in `session.styles.list()` | none |
| Views > "Overview" (camera, mode and mask saved together) | `el.saveCameraPreset(name)` saves the camera only; the mode and the mask are app state | small: a View is camera plus mode plus the mask; until a project file (#301) exists it lives in the app and is lost on reload |
| Three suggestion rows | app | none |
| 34 grey nodes, no labels | the element's defaults | none |
| Status bar "Spread out: settled" with a pause glyph | `el.waitForSettled()`, `graph-settled` event; **no pause, step or state** | medium: the layout transport, issue #144 |

Dataset inspector, section by section:

| Section | Row | Today | Gap |
|---|---|---|---|
| Header | "Karate Club", "karate.gml, GML", rename, "+" Add data, overflow | `session.data.lastImport()` gives the format; Add data is `addDataFromSource` / `loadFromFile` with the add policy | small: the app's "add to current" is refused today (app issue #198); the dataset name is app state |
| Summary | "34 nodes joined by 78 edges in one connected part" | no dataset-level reading; `session.data.statistics()` gives every number | small: `session.data.reading()`, the template sentence the element already writes per run; otherwise the app templates it, which is formatting, not computing (3.10) |
| Summary | Nodes, Edges, Density, Mean links, Parts, Weighted, Self-loops | `statistics()`: `nodeCount`, `edgeCount`, `density`, `meanDegree`, `components.count`, `weighted`, `selfLoopCount` | none |
| Summary | Direction [Undirected v] "(from file)" | `statistics().directedness` and `directednessSource.by / statedBy`; setting is `el.directed` | none |
| Summary | Import report (kept, rejected, repeated) | `lastImport()` (`ImportReport`) | none |
| Arrangement | Layout [Spread out v] with a gear | `el.layout`, `el.layoutConfig`, `el.setLayout(type, opts)`; `session.catalog.layouts()` for the list and options | none for the select; the gear's option form wants bounds resolved for the graph, issue #336 (small) |
| Arrangement | Dimensions [2D / 3D] | `el.viewMode` | none |
| Arrangement | Transport row [pause] [step] [re-run] "Settled" | nothing public; `LayoutManager` has an internal `step()` | medium: #144 |
| Arrangement | Group by / Root (only for layouts that need them) | layouts declare structural inputs (`LayoutDescriptor`); the app must pass a partition or a root as raw ids | small: accept a run id or result path as the structural input (feature-fit 4 section 9) |
| Arrangement | Pinned N, Unpin all | `el.pinnedNodes`, `el.unpin(ids)` | none; a pin-change event and a `pinned` scope would make the "Pinned" system Set live (small) |
| Showing | Show [Everything v] listing every Set; "34 of 34" | `session.status.counts.visibleNodes`; `session.visibility.set(filter)` | **medium**: `Filter` has no `{set}`, `{ids}` or result-field kind, so a Set cannot be applied as the mask unless it is a rule the query engine can run, which it cannot (#149). See 4.2 |
| Showing | Time window | `visibility.setWindow`; the time role is `DataConfig.knownFields`; `catalog.timeAttributes()` unimplemented | medium: #333, and playback #300 |
| Canvas | Background [chit] | `el.background` | none; theme-following is #291 |
| Canvas | Labels [None v] / [Top 6 by Connections v] | a layer with an expression selector over the run's `rank` field (`session.results.term(run, "rank")`) binding `node.label`; expression selectors compile in the style engine | none today; cleaner with a `{match: "scope", scope: {top: ...}}` selector (4.2) so the run id never appears in a rule |
| Canvas | Legend switch, Minimap switch, Notes switch | legend: `session.styles.legend()` and the app draws it (#292 for the element to draw); minimap: #293; notes: #145 and the marker channel #295 | medium each, none blocking the mock |
| Canvas | Default look: locked mini paint rows for Node and Edge | the two element base layers; `update` on them rejects `E_PROTECTED` | none; the mock draws them locked, which is right |
| Attributes | one row per column with type and completeness; "..." with Colour by, Size by, Filter by, Group by, Label by, Set as time, Set as type | `session.data.attributes()` (`AttributeDescriptor`: type, completeness, uniqueCount, origin). Colour by / Size by: `session.styles.add` with `{match: "has", path: "data.value"}` and `encode: {"node.color": {by: "data.value", scale: "ordinal"}}` works today. Filter by: `visibility.set({kind: "categories" | "range"})` works. Label by: a `node.label` binding with `passthrough` | Set as time: #333; Set as type: #299. `session.styles.encode()` takes only a run, so an attribute encoding goes through the raw `add` (works; a one-call verb is small and optional) |
| Attributes | "+" Join a table, New from formula | none | #298 (medium); computed attributes (medium, design 4.3.4) |
| Findings | facts computed on the whole graph | `session.runs.list()` filtered by shape `fact` / `pair-list`; `RunResult.graph` | none |
| Made by | the load record | `lastImport()`, `DataConfig.knownFields` | none |
| Export | Image [PNG v] [2x v] | `el.captureScreenshot(options)`: format, multiplier, transparent, destination | none; legend-in-picture is #292 |
| Export | Data [GraphML v] | every `FormatDescriptor` is `canExport: false`; graph-io has the exporters | medium: wire graph-io's exporters behind the catalogue (inventory section 1) |
| Export | Report, Methods text, Recipe | none | #187 (report); methods text needs run serialisers (#177, small); recipes need commands (#337, large) |
| Notes | every note, grouped by anchor | none | #145 (large) |

### 2.3 Screen 3: the tree after two runs and a filter, a Group selected

This is the screen that decides feasibility. Row by row on the left:

| Tree row | Today | Gap |
|---|---|---|
| "Degree > 8  5 nodes", outline Fill | **Painting** works: a layer `{match: "expression", where: "degree > 8"}` writing `node.outline` compiles in the style engine. **Counting** ("5 nodes") does not: `session.scope.count({where})` throws `E_UNSUPPORTED` because no `match` source is attached (#149). Selecting its members, focusing on it, and running Louvain within it are the same call and the same throw | **large**: the query engine (#149). Until it lands a rule set has a Fill and nothing else |
| "Connections (Degree)  34 values", Size fill and no colour "because colour was taken" | `session.runs.start("degree")` then `styles.encode({run, channel: "node.size", range})`. The **default** the mock relies on is the opposite of the element's: `autoApply.ts` drops a suggestion when an authored layer holds the channel, and paints colour over a run-made layer otherwise. Neither yields "Size because Colour was taken" | small: the suggestion picks the first channel no enabled layer above writes (Colour, then Size, then Outline), and never drops itself. Feature-fit 5 note A3 |
| "Communities (Louvain)  4 groups", strip chip | `runs.start("louvain")`; `styles.encode({run, channel: "node.color"})`; the strip's four colours from `session.styles.legend()` swatches | none |
| Group 1 to Group 4 rows with counts and chips | `RunResult.summary().groups` (group, size); swatch colour per group from the legend block | none for the rows. **Selecting one** (the halo) has no target: `SelectionTarget` has `top` and `above` but no "run field equals value"; `{where: "results.x.group == 2"}` throws (#149) | medium: a `{group: {run, field, value}}` target and scope form, or the query engine; see 4.2 |
| Group 2's override chip (#d55e00 beats the inherited #56b4e9) | a second layer `{match: "expression", where: "<term>.group == `2`"}` writing `node.color`, placed above the Louvain layer by `styles.move`; expression selectors compile | none for the paint. The order rule "children above their parent" is nobody's today (4.3) |
| Eye and lock on the row | eye: `styles.update(id, {enabled: false})` on every layer of the object. Lock: nothing; `Layer.locked` is true only for element layers | lock is objects-API state (4.3); picking that skips locked members is small |
| Gold halo on the eleven members | the element's own selection layer, once the members are in `session.selection` | blocked by the Group target above |

Group inspector:

| Section | Row | Today | Gap |
|---|---|---|---|
| Header | "Group", "Group 2", rename, eye, lock, overflow | `Run.label` for the Grouping; a Group's name is nowhere: groups are numbers (#191) | medium: #191, and re-matching across re-runs (object-model section 5) |
| Definition | Of [Communities (Louvain)] (clickable) | `Layer.source.runId` on the Fill layer; `session.runs.get(id)` | none |
| Definition | Label 2; "11 nodes, 32% of the scope" | `summary().groups[i].size`; `RunResult.measured.nodes` for the scope size | none |
| Definition | Within  Everything | `Run.scope.spec` (a `ResolvedScope` carries its spec) | none |
| Members | Nodes 11 / Edges 20; Inside edges 20 / Cut edges 9 | `session.selection.statistics()` gives `nodes`, `edges`, `inducedEdges`, `cutEdges`, but **over the live selection only**. Picking the row replaces the selection with the members (object-model section 8), so it is right on this screen | small: `session.scope.statistics(spec)` so the numbers do not depend on what is selected, and are right above the 5,000 selection cap (`selection.truncated`) |
| Members | eight member rows, "See all 11 in table" | ids from `session.scope.resolve` once a group is a scope; labels from `session.data.node(id)` | the Group scope form (4.2) |
| Members | header actions Select, Focus | Select: the Group target (4.2). Focus: `visibility.set` has no filter kind for "this group" (4.2) | medium, same item |
| Fill | "[chit] D55E00 100% [eye] [-]" | `styles.update(id, {set: {"node.color": ...}})`; opacity is `node.opacity`; eye is `enabled`; minus removes the layer | none |
| Fill | "Inherited from Communities" read-only row with a lock | `session.styles.explain({node: <any member>})` reports the Louvain layer's contribution and `editable: false` with a reason | none |
| Fill | "+" adds a channel | `styles.update` with another key in `set`; the channel list is `CHANNELS` in the catalogue | none |
| Made by | "Louvain, 34 nodes, 80 ms, seed 42" | `Run.record`, `Run.caveats` (seed, converged, iterations), `Run.engine`, `Run.durationMs` | none; "5 of 6 groups matched" needs #191 |
| Export | Members [CSV v]; Image framed on members | members: `scope.resolve` then the app writes a CSV (formatting, allowed); image: `el.captureScreenshot` with a camera view over a scope, `el.applyCameraView("fitToGraph", {scope})` | none; a result exporter (#177/#178 family) would be tidier (small) |
| Notes | | #145 | large |

Legend overlay (bottom right): `session.styles.legend()` gives one block per bound channel
bottom first, with swatches, counts and a size range, and it already omits a block whose
channel is fully covered by a layer above (`coveredBy` in `session/styles/legend.ts`). The
app draws it; the element drawing it is #292.

### 2.4 Screen 4: a node selected (College football)

| Tree and canvas | Today | Gap |
|---|---|---|
| "Top 10 by Bridges" Set, linked to the measure below | `session.selection.apply({top: {run, field, n: 10}})` selects them; `session.selection.promote(name)` saves the **resolved ids** as a scope, which freezes them: re-running Bridges does not move the set | medium: a `{top: {run, field, n}}` **scope** form (4.2), so the set stays linked and goes stale with its run |
| "Bridges (Betweenness)" with a Size fill | `runs.start("betweenness")`, `encode({channel: "node.size"})` | none; weights and direction on betweenness are #313 |
| "Conference" Grouping from the `value` attribute, 12 groups | a layer with `{match: "has", path: "data.value"}` and an ordinal `node.color` binding with `overflow` | none for the Fill. Its **Group children** need per-value membership: `visibility.set({kind: "categories", attribute, values: ["7"]})` can focus one; selecting one needs `{where}` (#149) or a `{categories}` selection target (small) |
| "Communities (Louvain)" 10 groups, chip at 50% "because every group is covered" | `legend()` omits the covered block; "fully covered" as a **count** needs `explain` over every member | small: coverage counts over a scope (4.3) |
| Three tree rows tinted because FloridaState is a member | run-based objects: `session.results.get(run).node(id)` answers instantly. Set objects: `session.scope.resolve(spec)` then `nodes.has(id)`, one resolve per set per click | small: `objects.containing(nodeId)` in the objects API (4.3); acceptable app-side for a handful of sets, wrong at scale |
| Label on FloridaState only | a `node.label` layer with an `{match: "ids"}` selector, or the element's selection layer | none |

Node inspector:

| Section | Row | Today | Gap |
|---|---|---|---|
| Header | "Node  id 1", "FloridaState", Locate, Pin, overflow | `session.data.node(id)`; Locate: `el.applyCameraView("fitToGraph", {scope: {nodes: [id]}, animate: true})` (this exists; object-model section 11 lists it as a gap and is wrong); Pin: `el.pin(ids)`; Copy as JSON: the record; Expand from server: `layoutBehavior.fetchNodes` | none |
| Attributes | label, value | `session.data.node(id)` | none |
| Values | "Bridges 0.031 rank 3 of 115" | `results.get(run).node(id)` gives `value`, `rank`, `percentile`; `measured.nodes` is the 115 | none. (screens.md says "rank 12", the PNG says "rank 3"; the PNG is consistent with the node being in the Top 10) |
| Values | "Conference 0", "Communities Group 3" | attribute: the record; Louvain: `results.get(run).node(id).group` | none |
| Member of | one chip per Set containing the node | as the tinted rows above | small, same item |
| Neighbours | "Neighbours 12", eight rows with the edge label "played", Select, the Neighbours tool | `session.selection.apply({neighborsOf: [id], depth: 1})` gives the **ids** and nothing else; there is no per-node neighbour listing and no edge listing (`getEdges` does not exist, #297). The app today walks edge records itself (inventory section 5), which the root rule forbids | **small**: `session.data.neighbours(id, {direction, page})` returning neighbour and edge records; and `getEdges()` (#297) |
| Neighbours | In 9 / Out 8 on directed data | `statistics().degreeRange` is graph-wide; per-node in/out is the degree run's `inDegree` / `outDegree` fields, so it needs a run | small: fold per-node degree into the neighbours call |
| Look | "Colour from Conference", "Size 2.3 from Bridges", "Outline 2 px from Top 10 by Bridges", each clickable | `session.styles.explain({node})`: `channels[]` with the winning `layerId`, `merged` values, `mode`, `editable`; the layer's `source.runId` or the object that owns the layer leads to the row | none |
| Look | "Colour this node..." (a one-node fixed Set with one Colour row) | `styles.add({selector: {match: "ids", nodes: [id]}, set: {"node.color": ...}})` at the top of the stack | none |
| Notes | | #145 | large |

### 2.5 Screen 5: the Path tool mid-flow

| What is drawn | Today | Gap |
|---|---|---|
| Tool state, "Pick the end node" bar, Cancel | app state | none |
| Node 1's blue "picked" ring | a transient layer `{match: "ids", nodes: [1]}` writing `node.outline`; a layer, so it is legal | none |
| The rubber-band line from node 1 to the pointer | `el.worldToScreen(position)` for node 1 (`el.getNode(id).position`); the app draws an SVG line over the canvas. Presentation, not computation | none |
| Hover outline on node 27 | `node-hover` event fires; there is no element hover layer (`LayerSource.reason: "hover"` is reserved and unused) | medium: the hover layer, also needed for the two-way hover link |
| Status bar "Path: pick the end node" | app | none |
| What happens on the second click: "Path: 1 -> 34  3 nodes 2 edges" at the top, blue nodes and edges, width 3 | `runs.start("shortest-path", {source: 1, target: 34})`; the count from `result.graph.hops`; `styles.highlight({run, set: {...}})` adds one node layer and one edge layer | **small, but a policy change**: `highlight()` is **exclusive** (it removes every other highlight layer first, `StylesApi.ts`), so the second path in the tree deletes the first; and every highlight is `blue-highlight`, so two paths look alike. Feature-fit 5 notes A2 and A6 |
| Dataset inspector on the right | as screen 2 | as screen 2 |

### 2.6 Screen 6: a Measure (PageRank) selected

| Section | Row | Today | Gap |
|---|---|---|---|
| Header | "Measure", "Influence (PageRank)", eye, lock, overflow | `Run.label`; eye is `enabled` on both encoding layers | lock: objects API |
| Definition | Method with an info circle | `session.catalog.algorithms()` entry: plain name, technical name, description | none |
| Definition | Damping [0.85] / Iterations [100] / Tolerance / Weights / Direction / Exact | option descriptors from the catalogue (`AlgorithmDescriptor.options`, from `optionsFromZod`); PageRank has dampingFactor, maxIterations, tolerance, weight. **Editing one in place** has no verb: `run.rerun()` reruns with the same params, and a run's id is derived from its params, so `runs.start` with new params is a **different run** and every layer bound to the old id dangles | **medium, and a design decision**: either `run.restart(params)` keeps the id (the id stops being a pure function of the params), or the objects API re-binds the object's layers to the new run and removes the old one. Section 4.3 |
| Definition | Direction [As loaded v] | not on PageRank; #313 | medium: #313 |
| Definition | Exact [switch] | `StartOptions.exact` / `sample`; changing it is the same "edit in place" problem | same item |
| Definition | Within  Everything | `Run.scope.spec` | none |
| Definition | [Re-run (about 3 s)] when stale | `Run.stale` (`ranOn`, `nowVisible`, `scopeSpec`) covers the **visible set** changing; `session.estimate({op: "algo.run", ...})` for the seconds | stale on a data change and on a parameter or scope change is not tracked: the objects API must (4.3). `run.stale` alone under-reports |
| Values | Min / Max / Mean / Median | `RunResult.summary()`: min, max, median, mean, measured, count | none |
| Values | 208 x 40 histogram, linear / log | `RunResult.histogram(field, {bins, scale: "linear" | "log" | "auto"})` | none |
| Values | Top [10 v] ranked rows; click selects | `RunResult.ranking(field, 10)`; `session.selection.apply({nodes: [id]})` | none |
| Values | "+" Top N set / Above threshold set | `selection.apply({top})` then `promote` freezes ids (as screen 4) | the `{top}` / `{above}` scope forms (4.2) |
| Values | "See all in table" | the table dock (2.7) | see 2.7 |
| Fill | Channel [Colour v], Scale [Even steps v], Palette ramp, Domain from / to, Reverse, Reset, Missing | `styles.encode({run, channel, scale, palette, domain, reverse, missing})` **replaces in place**, keeping the layer's id and position, which is exactly what a form wants; plain names from `session.catalog.scales()` and `palettes()` (with colour-blind flags) | none |
| Fill | second block Channel [Size v], Range [0.8] / [2.2], own eye and minus | a second `encode({run, channel: "node.size", range})` layer | none |
| Made by | "PageRank, 34 nodes, 1.2 s, exact, converged in 41 iterations, algorithms 2.0.1"; "?" reading; Copy as methods text | `Run.record`, `caveats`, `engine`, `durationMs`; `RunResult.reading({audience})` | methods text: a serialiser (small, #177) |
| Export | Ranked list [CSV v] | `ranking()` then the app formats | none |
| Not on screen: the covered Communities row's "Covered by Influence on 34 of 34 members" | `explain` per node; the legend already knows the block is covered but not the count | small: coverage counts (4.3) |

### 2.7 Screen 7: the Filter popover and the table dock

| What is drawn | Today | Gap |
|---|---|---|
| Filter popover "By values": Attribute [value v], Values [7] | attribute list from `session.data.attributes()`; the value list from `AttributeDescriptor` samples (capped at 5) or the table | small: distinct values of a category column with counts (the descriptor caps `uniqueCount` at 256 and samples at 5) |
| "Matches 8 nodes", live | **nothing**. A categories rule is a `Filter`, and `Scope` has no filter form, so `session.scope.count` cannot count it; `session.plan({op: "visibility.set", filter})` is mentioned in `VisibilityApi.ts` but `SessionCommand` has only `algo.run`; `visibility.set` would count it by **applying** it, hiding everything else, which is not what the mock shows | **medium**: `Scope` accepts `{filter: Filter}` (the set-vocabulary unification, 4.2), or `plan` grows `visibility.set` (#337). Without one of these the app evaluates `value == 7` over `getNodes()` itself, which the root rule forbids (3.1) |
| Dashed preview rings on the eight matches | a transient `{match: "ids"}` layer, once the ids exist | same item |
| Select / Create | Select: `selection.apply({scope})` once a filter is a scope. Create: `scope.save(name, spec)` plus a layer | same item |
| Table dock: Nodes 115 / Edges 613 tabs | nodes: `el.getNodes()` returns render-bound `Node` objects (Babylon meshes behind them), not records; edges: **no listing** (#297) | small: `getEdges()` (#297), and record-shaped listings |
| Sorted by label; search field; "Showing [Everything v]" | the app sorts, searches and filters the rows. At 115 rows harmless; at 200,000 (`DEFAULT_LIMITS`) it is the app computing over the graph, and app issue #170 already records sorts blocking the page | **medium**: a paged row source on the session: rows over a scope, sorted by an attribute or a result field, filtered by text, with result and membership columns; `SessionDataApi`'s own header says id listings over a scope are "not part of this surface yet" |
| Columns: attributes, then one per Measure and Grouping, then membership columns | `session.data.attributes()` (origin `result` marks run columns); values from `results.get(run).node(id)`; membership from a resolved scope per set | part of the row source |
| Row selection is the element selection; tinted preview rows | `session.selection` and `selection:changed` | none |
| Attributes section with "..." menu, Group by checked | as 2.2 | as 2.2 |

### 2.8 Screen 8: dark variant of screen 3

Everything is CSS on the app side except two canvas facts: the background colour
(`el.background`, set by the app on theme change; following the page theme automatically is
#291, small) and the default node and edge greys (the element's base layers; the mock changes
them from #b3b3b3 to #757575 and #5a5a5a, which the app cannot do because the base layers are
locked). Gap: **small**, either the element's defaults follow `el.background` luminance, or
`catalog.themes()` (#331) ships a dark look that replaces the base values. Otherwise as
screen 3.

## 3. The three rules, checked

### 3.1 "The app must not compute over the graph": where the mocks quietly assume it does

Each of these is a number or a list the mock draws, for which there is no element call today.
Building the mock as drawn means the app computes it, and every one is therefore an element
gap rather than app work.

| Where | What the app would compute | Element answer needed | Size |
|---|---|---|---|
| Screen 7, "Matches 8 nodes" and the preview rings | evaluate a rule over every node | count and resolve a `Filter` as a scope without applying it | medium (4.2) |
| Screen 3, "Degree > 8  5 nodes" and its Select / Focus | evaluate an expression | the query engine (#149) | large |
| Screen 3, the halo on Group 2; Members rows; Select / Focus on a Group | find every node whose `group == 2` from the result | a group target and scope form | medium (4.2) |
| Screen 4, Neighbours rows with edge labels; In / Out counts | walk the edge list (the app does this today) | `session.data.neighbours(id)`, `getEdges()` | small |
| Screen 4, tinted rows and Member of chips | membership of one node in every Set | `objects.containing(id)` | small, in the objects API |
| Screen 4 and 6, "Covered by X on N of M" and the 50% chip | `explain` in a loop over every member | coverage counts over a scope | small |
| Screen 7, the table sorted, searched and filtered by an object | sort, search, filter 200,000 rows | a paged row source | medium |
| Screen 3, "Inside edges / Cut edges" on a Set that is not the selection, or above 5,000 members | induced and cut edges over an id list | `scope.statistics(spec)` | small |
| Screen 3, Groups re-matched by overlap after a re-run (object-model section 5) | overlap matrix between two partitions | stable group identity, #191 | medium |
| Screen 1, 2, the zoom readout "100%" | a percentage from the camera state and the fit extent | a zoom fraction on the camera state | small |
| Screen 2, the Summary sentence | template counts into a sentence | `data.reading()` | small; not a violation (formatting facts the element gives), listed for completeness |
| Every screen, the marquee (object-model section 8) | rectangle or frustum hit-test over positions | a screen-region selection target | medium |

Not violations, and worth saying so: the rubber-band line (screen 5), the legend card drawn
from `legend()`, the "32% of the scope" arithmetic, the CSV formatting of a ranking, and the
tree chip colours read from legend swatches are all presentation of facts the element hands
over.

### 3.2 "Appearance only through style layers"

Every Fill in the mocks is a layer or an `encode` / `highlight` call, and every transient mark
(the picked ring, the preview rings) is a layer with an `{match: "ids"}` selector. The gold
halo and the hover outline are the element's own layers. The mocks comply. Two places need
care in the build:

- The Group override (screen 3) must be a layer above the Grouping's layer, not a `map` entry
  edited into the Grouping's binding. `Binding.map` exists and would work, but it would make
  the override invisible to precedence, which is the failure the rule exists to prevent.
- The dark theme's default greys (screen 8) cannot be written by the app because the base
  layers are locked; the element must own that change (2.8).

### 3.3 "Suggested styles paint only their own results"

The element's derivation (`session/styles/derive.ts`) and `encode()` scope every suggested
layer to the elements carrying the run's value, so the rule holds by construction. The model's
"Dim the rest" (feature-fit 5 note A10) is a reader-created linked Set with an opacity Fill,
which is compliant, and it needs the `not` combinator over scopes (4.2). Two element policies
in `autoApply.ts` and `StylesApi.ts` are the other way round from the mocks and should be
retired, not worked around:

- "A layer somebody wrote by hand wins" drops a new run's suggestion when a user layer holds
  the channel. In the tree a new object appears at the top and wins by position; a Measure that
  appears with no Fill and no explanation is worse than one that covers something visibly.
- "A highlight is exclusive" deletes the previous route when a second is highlighted. Two Path
  objects in the tree are two objects.

Both are small changes with one test each; both are recorded as findings.

## 4. What the element must grow, in order

### 4.1 The three things nothing can be built without

1. **The query engine attached** (#149; large). `ScopeSources.match`, `SelectionSources.match`
   and the filter's expression source are declared and never supplied. Until they are, a rule
   Set is paint-only. The style engine's own expression compiler (`styles/predicate.ts`) is a
   declared JMESPath subset with error positions; the fastest route is to lift that evaluator
   out of the style engine and hand it to the three sources, then grow it for text search.
   Screens 3 and 7 depend on it.

2. **One set vocabulary** (medium). Today the same idea is spelled three ways: `Scope` for
   runs and counting, `SelectionTarget` for selecting, `Filter` for the mask, with no form all
   three accept. The unification `object-model.md` section 11 asks for, restated against the
   code:
   - `Scope` gains `{filter: Filter}`, `{top: {run, field, n}}`, `{above: {run, field,
     threshold}}`, `{group: {run, field, value}}`, and `{not | all | any}` over scopes.
   - `Filter` gains `{kind: "scope", scope}` (which brings `{set}`, `{nodes}` and the four
     above into the mask, so Focus on any object is one call).
   - `SelectionTarget` already has `scope`, so it inherits everything.
   - `Selector` gains `{match: "scope", scope}`, and for an edge-target layer it resolves to
     the induced edges of a node scope (feature-fit 5 note A1).
   - `SavedScope` keeps referencing other saved scopes, which gives linked objects and
     Combine for free; `bound: false` is the model's "frozen" state.
   Every resolver already exists; this is one dispatcher and a type change on a published
   entry point (`./session`), so it is a contract change and should land in one release.

3. **The objects API on the session** (large). The tree as data: id, kind, name, parent,
   order, definition (the tool spec), state, member count, layer ids, links, locked, visible;
   `create`, `move`, `rename`, `setVisible`, `setLocked`, `setScope`, `rerun`, `remove`,
   `focus`, `containing(nodeId)`, `coverage(objectId)`; an `objects:changed` event. Built over
   runs, saved scopes and layers so nothing is duplicated: a Set is a saved scope plus layers;
   a Measure is a run plus encoding layers; a Group is a `{group}` scope. It keeps the layer
   order equal to the tree order (parent below children) and owns the six states, including
   the two the run model does not have: **waiting** (an object created but not started, which
   `runs.start` cannot express because it gates and starts in one call) and **stale on a
   parameter, scope or data change** (`Run.stale` covers only the visible set). The shape of
   this tree in a saved file (#301) is the one true one-way door in the whole proposal, and it
   is the reason the app must not ship its own tree even as a tracked workaround.

### 4.2 Sized list, everything else

Ordered by what the mocks need first. "New" means no issue exists yet.

| Gap | Screens | Size | Issue |
|---|---|---|---|
| Suggested encoding picks a free channel and never drops itself | 3, 5, 6 | small | new (autoApply.ts) |
| `highlight()` exclusivity off for the objects API; highlight colour cycles per set | 5 | small | new (StylesApi.ts) |
| Editing a run's parameters in place: `run.restart(params)` keeping the id, or re-binding | 6 | medium, decision | new |
| `session.data.neighbours(id, {direction, page})` with edge records; `getEdges()` | 4 | small | #297 |
| `scope.statistics(spec)`: induced and cut edges and attribute statistics over any scope | 3 | small | new |
| Coverage counts: `explain` aggregated over a scope | 3, 4, 6 | small | new |
| A paged, sorted, filtered row source over a scope with result and membership columns | 7 | medium | new (#168, #170 are the app symptoms) |
| Distinct values with counts for a category column | 7 | small | new |
| Hover layer, element-owned (`LayerSource.reason: "hover"`) | 3, 5 | medium | designloom `hover-highlight` |
| Layout transport and state; `layout:changed` | 2 | medium | #144 |
| Marquee: screen rectangle or frustum to a selection target | all | medium | new |
| Canvas picking skips a lock mask; a context-menu pick event | 3, 4 | small; small | new; #319 |
| Edge picking | 4 | medium | #319 |
| Zoom fraction on the camera state | 1, 2 | small | #290 family |
| `data.reading()` for the Dataset summary | 2 | small | new |
| Group names and stable identity across re-runs | 3 | medium | #191 |
| Result-field filters (group size) | 3 | small, falls out of 4.1.2 | #192 |
| Weights and direction on every algorithm; degree direction; BFS depth | 6 | medium | #313, #161, #160 |
| Option bounds resolved for a form | 2, 6 | small | #336 |
| Data exporters behind the catalogue | 2 | medium | inventory section 1 |
| Run serialisers (methods text, TSV) | 3, 6 | small | #177 |
| Legend drawn by the element and in captures; minimap | 3, 4, 6 | medium each | #292, #293 |
| Theme-following background and dark base greys | 8 | small | #291, #331 |
| Time role, type role, playback | 2, 7 | medium | #333, #299, #300 |
| Cancellable loads | 2 | small | #296 |
| Node marker channel | 2 | medium | #295 |
| Notes and the journal | all | large | #145 |
| Commands as data (assistant, recipes, undo inverses) | all | large | #337 |
| Project file carrying the tree | all | large, one-way door | #301 |

### 4.3 Corrections to the object model's own gap list

- "Fit the camera to a scope (small, design 4.8)" is not a gap: `el.applyCameraView(id,
  {scope, animate})` frames any scope today, including `{nodes: [id]}` for Locate.
- "Layer selector by scope" is small only for nodes; the edge half (induced edges of a node
  scope) is the part a node Set's "Edge colour" row needs and is not free.
- "Cost estimate exposed per catalogue entry (exists as `session.estimate`)" is right, and it
  is synchronous, so a flyout can call it once per row on open with no visible cost.
- The list does not mention the "edit a Definition in place" problem (2.6), the exclusive
  highlight, the free-channel default, the table row source, or the neighbour listing. Each is
  a row in 4.2.
- `session.selection.statistics()` exists and the model uses it correctly; it is bounded by
  the 5,000-element selection cap, which the model does not mention.

## 5. Findings

Severity: **blocker** means a mock cannot be built without it; **major** means a mock can be
built but a drawn row or a stated rule is wrong or forces the app to compute; **minor** is a
correction or a small gap with a workaround that does not break a rule.

| # | Severity | What | Where |
|---|---|---|---|
| 1 | blocker | The query engine is declared and never attached, so a rule Set can be painted but not counted, selected, focused or computed within. Screen 3's "Degree > 8  5 nodes" and screen 7's "Matches 8 nodes" both depend on it | `graphty-element/src/session/GraphSession.ts` (no `match` source supplied); `scope/ScopeApi.ts:243-250`, `selection/targets.ts:180,214`, `visibility/VisibilityApi.ts:669`; issue #149 |
| 2 | blocker | No shared set vocabulary: a Set cannot be the mask (`Filter` has no set, ids or result-field kind), a Group cannot be selected (`SelectionTarget` has no "field equals value"), a Top N set freezes to ids on `promote`. Focus, the Showing select, the Group halo and linked sets all wait on this | `catalog/types.ts:710` (`Scope`), `session/visibility/filter.ts:62` (`Filter`), `session/selection/targets.ts:99` (`SelectionTarget`), `catalog/types.ts:461` (`Selector`) |
| 3 | blocker | The tree (order, nesting, names, states, links, locks, waiting objects, stale on parameter or data change) exists nowhere in the element; the root rule forbids the app from owning it, and its saved shape is a one-way door | `object-model.md` section 11; root `CLAUDE.md` "The app MUST NOT work around graphty-element"; issue #301 |
| 4 | major | The auto-apply policy contradicts screen 3: it drops a suggestion when a user layer holds the channel and otherwise paints colour over a run-made layer; the mock's "Connections got Size because Colour was taken" cannot occur today | `graphty-element/src/session/styles/autoApply.ts` ("A layer somebody wrote by hand wins") |
| 5 | major | `highlight()` is exclusive and always blue: creating the second Path object deletes the first's layers, and two sets are indistinguishable | `graphty-element/src/session/styles/StylesApi.ts` (`highlight`, "EXCLUSIVE"); `HighlightSpec.set` |
| 6 | major | Editing a Measure's Damping or Iterations in place (screen 6) has no verb: run ids are derived from the parameters, `rerun()` keeps the old parameters, and a new `start` is a new run whose layers, name and links must be re-bound | `graphty-element/src/session/runs/types.ts` (`Run.rerun`, `RunsApi.start` "Ids are therefore deterministic") |
| 7 | major | Screen 7's live count and preview for a By values / By range rule have no non-mutating API: a `Filter` is not a `Scope`, and `plan()` accepts only `algo.run`; the app would have to evaluate the rule itself | `graphty-element/src/session/planning.ts:67` (`SessionCommand`); `VisibilityApi.set` docs mention a `visibility.set` plan that does not exist |
| 8 | major | Screen 4's Neighbours section (rows with the edge label, In / Out counts) has no element source; the app walks edge records today, which the root rule forbids; `getEdges()` does not exist | `graphty-element/src/session/types.ts` (`SessionDataApi`, "neighbour pages ... are not part of this surface yet"); issue #297; `inventory/app-today-and-personas.md` section 5 |
| 9 | major | The table dock's sort, search and "Showing [object]" over 200,000 rows is app-side computation; `el.getNodes()` returns render objects, not records, and there is no paged row source | `graphty-element/src/graphty-element.ts:2214` (`getNodes`); `DEFAULT_LIMITS` in `session/limits.ts`; app issues #168, #170 |
| 10 | major | "Covered by X on N of M" and the 50% chip need `explain` run over every member; no aggregate exists, so the app loops | `graphty-element/src/session/styles/explain.ts:80` (`StyleExplanation`, one element at a time); `legend.ts:575` (`coveredBy` knows the layer, not the count) |
| 11 | major | Marquee selection (object-model section 8) needs a screen-region hit-test the element does not offer; the app must not do it from positions | `graphty-element/src/session/selection/targets.ts:99` (no region target); `el.screenToWorld` exists but is not a selection |
| 12 | minor | "Inside edges / Cut edges" comes from `selection.statistics()`, which reads the live selection and is capped at 5,000 elements; right on screen 3 only because picking a row replaces the selection, wrong for a larger Set | `graphty-element/src/session/selection/SelectionApi.ts:142,233` |
| 13 | minor | Membership of one node in every Set (the tinted rows and Member of chips on screen 4) is one `scope.resolve` per Set per click; fine for a handful, wrong at scale; belongs in the objects API as `containing(id)` | `graphty-element/src/session/scope/ScopeApi.ts:294` |
| 14 | minor | The object model lists "fit the camera to a scope" as a gap; `el.applyCameraView(id, {scope, animate})` already does it, including Locate on one node | `graphty-element/src/graphty-element.ts:2661`; `object-model.md` section 11 |
| 15 | minor | The layout transport row (screen 2) and the status-bar chip have no element API; `waitForSettled` exists, pause / step / state do not | issue #144; `graphty-element/src/session/types.ts` ("What is deliberately NOT here yet: the layout transport") |
| 16 | minor | The hover outline on screen 5 and the two-way hover link need an element-owned hover layer; `reason: "hover"` is reserved and unused | `graphty-element/src/catalog/types.ts` (`LayerSource`); `events.ts:308` (`node-hover` fires, nothing paints) |
| 17 | minor | Screen 8 changes the default node and edge greys for dark; the base layers are locked, so only the element can do this | `graphty-element/src/session/GraphSession.ts:698-706` (the two element base layers); issues #291, #331 |
| 18 | minor | A View (screen 2) is a camera plus a mode plus the mask; `saveCameraPreset` keeps the camera only, and nothing persists the rest until #301 | `graphty-element/src/graphty-element.ts:1866`; issue #301 |
| 19 | minor | screens.md says FloridaState is "rank 12 of 115"; the PNG says "rank 3 of 115"; the PNG is the consistent one (the node is in Top 10) | `design/ui/object-first-ux/mocks/screens.md` screen 4; `mocks/screen-4.png` |
| 20 | minor | The Dataset summary sentence has no element reading; the app would template it from `statistics()`, which is formatting rather than computing, but `data.reading()` would keep one voice with the per-run readings | `graphty-element/src/session/results/types.ts` (`RunResult.reading`), no dataset equivalent |
