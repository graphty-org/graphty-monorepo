# The working graph: one filtered view of the graph that every reader uses

Issue: #6201. Breaking follow-up: #6124.

## 1. The problem

graphty-element hides part of a graph without deleting it, with a visibility filter and a time
window. Every operation then reads either the whole graph or what is shown. An audit of every
operation in graphty-element and the graphty app (129 operations,
`tmp/graph-version-audit/report.md`) found 71 that read the wrong one: "6 of 4 nodes" in the Style
tab, Fit framing empty space, G selecting hidden nodes, a layout spreading the shown nodes over the
space of the whole graph.

## 2. The model

- **The original graph** is the only graph and the source of truth: every edit, the project file,
  undo and history act on it. Nothing copies it.
- **The working graph** is a view of the original: the nodes and edges the filter and the time
  window leave shown. graph-format derives it as a compact graph (`inducedSubgraph(nodeMask)`,
  then `filterEdges(edgeMask)` when an edge filter hides more than the hidden nodes' edges), with
  maps between its rows and the original's rows. It is built at most once per filter state, cached
  and shared by every reader. When nothing is hidden, the working graph IS the store's snapshot,
  with identity row maps and no derivation, as `ScopedInput`'s whole-graph shortcut already does.
- **Hidden things keep everything.** Positions, styles, run results, notes and the stored
  selection are keyed by original ids, so a hidden node keeps its place, look, values and notes.
- **Every reader reads the working graph by default.** A reader that must see the whole graph asks
  for it by name, always spelled `scope: "graph"`: a filter's own conditions (a filter that read
  its own output would change its own input), anything labeled "Full graph" or "All", export, the
  project file, and a search the reader allows to find hidden items.
- **Lookups by id are not readers.** `data.node(id)`, `data.edge(id)`, `data.name(id)`,
  `sourcesOf`, notes and positions answer for shown and hidden nodes alike.

**Cache and lifetime.** The view is a `DerivedInputs` entry (`algorithms/input/derivedInputs.ts`),
keyed by the packed node and edge bitmaps of the `"visible"` scope's resolution, in the same cache
the renderer's runs read through (the element hands `derivedInputsOf(graph)` to its session; a
headless session keeps its own). The view object is keyed by the store's snapshot and the
visibility masks' read-only copies, which stay the same objects until a mask's version moves, so an
unchanged state costs three identity comparisons. A new snapshot (any edit), a filter change, a
window change and an undo or redo of either change the key. Drawing options (show context, ghosts,
labels) never do. `DerivedInputs` is a least-recently-used cache bounded by bytes whose entries are
kept alive by holders. The view holds the entry of its current state, with one holder per state,
and lets go when the state moves, so unheld views stay cached until byte pressure and an undo or
redo finds them again. A layout holds no entry: a one-pass engine reads the compact graph on the
processor, and a simulation keeps the original's rows (section 7), so nothing a layout steps on is
ever on the device as a cached view. Readers look up without holding.

**Ghosts and context.** A ghost (outside the time window, drawn faintly while playback says
`outside: "ghost"`) and a context node (`showContext`) are drawn but not shown, so no run, layout,
count or frame includes them.

**Settled changes.** While a reader drags the window slider (`slideWindow`) or edits a condition
(`visibility.hold`), the masks move every frame but nothing builds the view: drawing and every live
count answer from the masks (section 9). The view is built at the first topology read after the
move. Settle points are `commitWindow`, releasing `hold`, playback pausing or ending, a filter
change, an edit and switching the option.

**Edits while filtered** go to the original. The filter re-evaluates over the new snapshot, so an
added node the filter shows is in the next view. Editing a hidden node by id works.

**Undo.** The view is derived and never in history. Undoing a filter restores its masks; the byte
bound keeps many recent views (about 25 at 7-11 MB each), so undo then redo usually rebuilds
nothing. Undo re-lays out a shown-only layout like any filter change; with the unseeded default
force layout the drawing may differ, and a consumer wanting the same drawing sets a seed.

## 3. The public API

Option-gated, with today's behavior as the default; the graphty app turns the view on. Section 4
says which changes apply in every mode.

**The option.** `WorkingGraphMode = "documented" | "visible"` (open union).

- `"documented"` (default): every reader keeps the default it documents today (runs read what is
  shown, `data.nodePage` reads the whole graph, Fit frames every node, and so on).
- `"visible"`: every reader that names no scope reads the working graph. The word is the existing
  scope token, used everywhere this design means "what is shown" (mode, scope, `within`,
  `domainFrom`, docs).

Where a consumer sets it: the element's `workingGraph` property and `working-graph` attribute;
`createGraphSession({ workingGraph })`; and `session.config.setWorkingGraph(mode)` (returns
nothing; a re-layout it starts is finished when `graph.waitForSettled()` resolves), read back as
`session.config.workingGraph`. `WORKING_GRAPH_MODES` lists the modes this release knows. It is the
one config value outside `ProjectConfig`, which is why it has its own setter rather than
`config.set(patch)`: it is not undoable and not saved in the project file, so a project opened in
another consumer keeps that consumer's choice. An unknown value is handled as the element's other
enumerated attributes (`acceleration`, `renderer`) are: the attribute reports it on the console
and keeps the mode it had; `setWorkingGraph` and `createGraphSession` refuse it with
`E_BAD_COMMAND`. `Graph` gains no property: it is reached through `graph.getSession().config`.

**Reading the whole graph by name.** The whole graph is always `scope: "graph"`. Readers whose
union is `"all" | "visible"` today (`data.statistics`, `time.bins`) gain `"graph"` as an additive
member; `"all"` stays as a documented alias marked `@deprecated`, removed in the #6124 major.
Readers that take no options gain an optional `{ scope }` (section 5). Export keeps its own
`ExportScope` vocabulary and defaults to the whole graph.

**Events.** `working-graph:changed` fires whenever the view's key or the mode changes, with
`{ mode, nodeCount, edgeCount, settled }` (counts from the masks, no build; `settled` false during
an uncommitted slide or hold). It is told from the visibility change, the slide, the mode setter
and the data pass (`project:derived` with the `graph` slice), and told once: a repeat of the last
detail for the same view is not published, and nothing is computed while nobody listens. It is the re-read signal for a consumer that caches counts. An
automatic re-layout is finished when `graph.waitForSettled()` resolves.

**The advanced path.** `session.data.working()`, the one accessor for sessions, algorithms and
plugins:

```ts
interface WorkingGraph {
    readonly nodeCount: number;
    readonly edgeCount: number;
    has(id: NodeId | EdgeId): boolean; // shown?
    nodeIds(): readonly NodeId[]; // identity-stable while the view is unchanged
    edgeIds(): readonly EdgeId[];
    snapshot(): GraphSnapshot; // the compact graph-format snapshot (built on first call)
    originalNodeRow(row: number): number; // compact row -> original row
    originalEdgeRow(row: number): number;
    compactNodeRow(originalRow: number): number; // INVALID_INDEX when hidden
    compactEdgeRow(originalRow: number): number;
}
```

It answers for what is shown in either mode, so an extension can opt in on its own. `has` looks a
node id up first and then an edge id, as `visibility.isVisible` does. When nothing is hidden,
`snapshot()` is a copy of the original graph made once per state (the store's own snapshot holds
the live coordinates), while the element's internal readers take the store's snapshot itself.
`session.data.snapshot()` stays the original graph and is documented as such; row-indexed readers
(`visibility.nodeMask()`, positions by row) stay indexed by original row. To compute over what is
shown, read `data.working().snapshot()` and map rows back with `originalNodeRow`.

**The canonical example** (no rows, CSR or masks):

```html
<graphty-element working-graph="visible"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    const { session } = graph;
    await session.data.loadSample("graph-samples-karate");
    await session.visibility.addCondition({
        effect: "keep",
        rule: { kind: "categories", attribute: "data.club", values: ["Officer"] },
    });
    await session.layout.set("circular"); // lays out the shown nodes only
    console.log(session.data.statistics().nodeCount); // that faction
    console.log(session.data.statistics({ scope: "graph" }).nodeCount); // all 34
    await session.runs.start("pagerank"); // ranks the shown graph
    await graph.applyCameraView("fitToGraph"); // frames the shown graph
</script>
```

## 4. Every reader

Plan steps: S1 core, S2 session readers, S3 algorithms, S4 layouts, S5 framing, S6 selection, S7
styling, S8 AI tools, S9 project file and journal, S10 runs and timeline, S11 the graphty app, S12
the contract test, S13 docs. Rows are the audit's, in its words; the audit holds the evidence.

**Which mode a change applies in.**

- **(a) Fixes, every mode** (the API matches its own docs): timeline keep/rerun decided by window
  keys; the refusal suggestion "largest connected piece" computed over the refused scope; rerun
  keeping its scope; the Graphviz phantom row; `styles.categories` counting by the layer's
  selector; project open restoring visibility before runs.
- **(b) Additive, every mode**: the `"graph"` token, new `{ scope }`, `within` and `domainFrom`
  options, new fields and events, `runs.paint`, `run.rerun({ options })`, the journal's resolved
  scope, the reason code `reference.outsideBase` added beside a hops or touching reference's
  existing value of 0.
- **(c) Default changes, `"visible"` only**: everything else below, including the legend listing
  only shown values the layer selects (the audit's verifier marked it breaking).

**Unchanged** (already right, or whole graph by name): built-in runs with no scope, GPU runs, cost
estimate and plan, run staleness, stale Rerun, workspace card measures, card Results picker,
suggested styles of a scoped run, AI runAlgorithm, cytoscape-extensions, zoomToFit and
auto-framing, `zoomToNodes(ids)`, `nodesInRect`, pins replay, `styles.preview` bins, layers from a
run, Why this look, label declutter, state looks, selection workspace preview, legend painted count
and cap, table rows and paging, filter chip and time readout, selection card histograms and
checklists, Select all, workspace counts, category checklist counts, Results fields offered to a
filter, filters on filters, keyboard walk (contract covers it when built), filter/steps/window/sets
save and open, autosave write, undo of a filter with a run, captureScreenshot, recipe, Load more,
Expand and Collapse, samples, XR picking, `runs.start` default, `exportGraph`. Whole graph by name,
made explicit in S11 before the app turns the option on: data filter cards, Overview "Full graph"
counts, Export dialog All and its counts, Largest component select.

**Changed, by step.**

- **S2** (`"visible"`): `data.statistics`, `nodePage`, `edgePage`, `find`, `neighbors`,
  `data.nodes`, `valueCounts`, `histogram`, `attributes`, `issues`, `structureValues`; Matches
  strip and Degree step agree on shown degree; Find box rows, counts and hits ("include hidden"
  passes `scope: "graph"` and marks hidden hits); inspector Degree and neighbor list; multi-select
  summary; attribute inspector summary; table header hover and issue warnings; layer Values
  histogram; path form From/To and shortest-path bounds offer shown nodes; card Number range and
  Top-N bound read element facts for the card's base (`scope.histogram`, `statistics`).
- **S3**: defineAlgorithm and legacy plugins (section 6); refusal suggestion (a).
- **S4**: layout run; edge filter; third-party `StaticLayoutEngine`; nodes added later; window
  re-layout; ghosts; scoped layouts; estimate, refusals, `optionsFor`, `recommendLayout`, force
  driver choice, `clusterBy`, group boxes and the location map frame read the layout's resolved
  set (section 7); Graphviz phantom row (a).
- **S5**: Fit, standard views, `applyCameraView`, screenshot preset fitToGraph and image export,
  Frame selection, AI zoomToNodes.
- **S6**: neighborhood (G and inspector), Select what it paints, Covered by, filter card "Select N",
  source row "Select nodes", style group and binding row select, selection readers and writes
  (section 8), `invert`, `selection.apply({ where | text })`, Reference "Selected (N)", Save as
  set, hops or touching reference (b).
- **S7**: Style tab "N of M", `styles.groups` counts and "Select these N", property row "on N",
  `styles.agreement`, legend rows; Top-N and percentile keep ranking the whole column (owner) with
  `within: "visible"`; automatic domain stays the whole column with `domainFrom: "visible"`.
- **S8**: queryGraph gives shown and whole counts; the schema prompt says a filter is on;
  findNodes marks hidden hits when asked.
- **S9**: project open and autosave recovery restore visibility before runs (a); the layout scope
  is saved as an optional field; a run with no scope journals the scope it resolved to (b).
- **S10**: `runs.paint` (Runs list "Show"); "Update X layer" updates the existing run; names of runs
  differing only by filter are told apart; `run.rerun({ options })` keeps the stored scope (the
  inspector "Settings changed" Rerun uses it).
- **S11**: base label and "something is hidden" from `visibility.summary`; Overview Degree label;
  table members chip and Export preselecting Shown; time dock "N of M"; note target says hidden;
  toolbar "Nothing is drawn"; "Add X layer" label; legend "out of date" name; the path form's "not
  shown now" wording for an outside-scope refusal.
- **S13**: the default run scope names the time window; `styles.counts` documents `visible`.
- **Curved-edge support points** (`meshes/supportPoints.ts`, S4): read the drawn set (the masks
  plus ghosts and context), not the working graph.

## 5. Session readers (S2)

One function decides every default: `readerScope(asked, documented)` returns `asked` when the
caller named a scope, `"visible"` when the mode is `"visible"`, and the reader's documented default
otherwise. Every reader calls it. It lands with the first reader that calls it (S2), beside the
view's `mode`.

Readers that already take a scope (`nodePage`, `edgePage`, `neighbors`, `find`, `statistics`,
`histogram`) only change their default. `scope.histogram` with no `within` keeps meaning the whole
graph in every mode: it is a base selector, classified `whole-by-name`. Readers that take none gain
an optional one: `data.nodes({ scope })`, `data.edges({ scope })`, `data.attributes({ scope })`,
`valueCounts(path, { scope })`, `issues({ scope })`, `structureValue(id, path, { within })`,
`structureValues({ within })`, `selection.statistics({ scope })`, a per-group shown count in
`styles.groups`, `counts().visible.painted`.

**Live readers answer from the masks, never from the view**: counts, membership and `has()`,
shown degree and the neighbor list of one node (O(degree) over the mask bytes), category counts.
The compact snapshot is reserved for topology readers: statistics, components, runs, layouts.

## 6. Algorithms (S3)

- **Built-in algorithms** declare `scopeInput: "subgraph"` and default to "visible". The scoped
  input for "visible" is built by the same `intermediateOf` path (declared orientation, parallel
  edges kept) and the same `DerivedInputs` entry as the view, so runs and readers share one
  `inducedSubgraph`. A GPU run still derives its own final snapshot (undirected, merged), so
  sharing saves only the induced-subgraph step.
- **defineAlgorithm**: with the option on, the author's graph view (`simple/view.ts`) is built from
  the run's own scoped input, the entry a built-in gets for that scope. For the default "visible"
  that is the working graph; `scope: "graph"`, a set or a selection gets its own subgraph. Off, it
  stays as today (whole graph, masked back). The generated class says so with an internal
  `static followsWorkingGraph = true`, which `Algorithm.register` records by catalogue key
  (`catalog/registry.ts`), so the planner prices, refuses and points such a run at a smaller scope
  over its scope exactly when the run will compute over it; a run decides once, as it starts.
- **Legacy plugins**: with the option on, the plugin is handed a graph whose data manager holds
  only what is shown (`nodes`, `edges`, and `getSnapshot()` returning the working graph's
  snapshot); everything else is the graph's own. A legacy plugin has no run, so its scope is the
  working graph. In `"documented"` mode it keeps reading the whole graph; it publishes no result,
  so there is nothing to mask back and no caveat. Not covered, and recorded on #6124: the
  row-indexed `nodesByIndex` and `edgesByIndex`, and a `Node`'s own edge lists.
- **Refusal suggestion**: the gate points a refused run at the largest connected piece of the
  run's own scope, as a `{ nodes }` scope of that piece's ids, counted, computed only on a
  refusal (`planning.ts` `largestPieceIn`). `"largest-component"` names the whole graph's piece,
  which says nothing about a smaller scope, so a run over less than the whole graph is never
  pointed at it.
- **Runs (S10, done here)**: `runs.paint(id)` puts a run's suggested layers on the stack from the
  result it holds, as one step, without running it, also when it is out of date (the run's own
  command again with `applySuggestedStyles` and re-execution held off). `run.rerun({ options })`
  goes again with those option values over the scope, seed, sample and exactness it was started
  with. Two runs over `"visible"` that differ only by what was shown are named by the shown count
  ("PageRank (40 showing)"), in the element's deprecated label and the app's own words alike. The
  timeline's `keep` and `rerun` act only when the window key moved, never on a filter change
  (which is also announced as `"none"`).
- **Force driver**: the CPU/GPU choice counts the layout's resolved set.

## 7. Layouts (S4): the view replaces #6117's leave-out

PR #6117 (`behavior.layout.visibleOnly`, not merged) kept every node in the engine and marked
hidden rows "left out", with per-engine code. The audit found four paths that missed: Graphviz's
phantom row, edges under an edge filter, third-party static engines, nodes added later.

With the view, each engine is given the layout's set and nothing else:

The engine is handed a `LayoutPart` (`layout/LayoutEngine.ts`, internal): the original snapshot
it was cut from, a bitmap of the rows it leaves out, a bitmap of the edges it keeps, and the
working graph's compact snapshot with its row maps. The engine's internal doors (`addNode`,
`addEdge`, `setNodePosition`, `pin`, and the position reads `Node` and `Edge` draw from) refuse
anything outside the part, so no engine, the element's or a third party's, ever meets a node it
was not handed; a ghost or context node is drawn from the shared array.

- **Incremental engines** (D3, NGraph, a third party's `LayoutEngine`) get only the set's nodes
  and edges through `addNode`, including a node added later: it reaches the engine only if the
  next settled change finds it shown.
- **Simulation engines** (ForceAtlas2, Spring, SpringElectrical, and GPU ForceAtlas2;
  `layout/SimulationLayoutEngine.ts`) keep the original's rows. A node outside the set is held and
  inert (`setInert`, which every simulation implements: it weighs nothing, repels nothing, and its
  edges pull nothing), and the simulation is loaded with `filterEdges` of the original over the
  shown edges, so an edge an edge filter hides between two shown nodes pulls nothing either. No row
  map is needed: pins, the drag hold, follower rows, the hold mask, published positions and the GPU
  upload keep reading original rows. Each part derives one filtered snapshot, so each filter change
  re-uploads the graph to the GPU (section 9). This replaces an earlier plan for a compact position
  array gathered and scattered through `originalNodeRow`, which would have touched every row-indexed
  path of the bridge for the same forces.
- **Snapshot and static engines**, third party included, read the compact snapshot as their
  `graph` (`StaticLayoutEngine`), with the shared array and the hold read through its row maps;
  `defineLayout` places the same compact graph; Graphviz's phantom row cannot occur, and its
  `INVALID_INDEX` guard is fixed in every mode.
- A node outside the set exerts nothing and keeps its position in `ElementPositions` (original
  row).

**The layout scope with the option on.**

- Unset: the working graph. `"visible"` is the same.
- `"graph"`: the whole graph, read back as `"graph"` (not `undefined`). Not built yet: the layout
  slice stores `"graph"` as no scope, so it cannot be told from unset. It needs `"graph"` kept in the
  slice, which is the saved layout scope field (S9), so it lands there.
- A set or query scope: its members are captured at start, as today, and intersected with the
  working graph at each settled change. Nodes outside the working graph are not in the engine;
  shown nodes outside the scope are held.
- `"graph"` and `"visible"` choose the input graph and hold nothing, so every layout accepts them;
  `E_UNSUPPORTED` applies only to partial scopes. The layouts guide is updated to match (S13).

Estimates, refusals (not planar, too large), `optionsFor`, the location map's frame, `clusterBy`
and group boxes read that resolved set, so the picker and the estimate measure the set the layout
runs on. Built so far: group boxes skip members outside the part, the location map and `clusterBy`
of a one-pass layout read the compact graph, and the force driver's CPU or GPU choice counts the
working graph. The estimate, the refusals, `optionsFor` and `recommendLayout` still read the whole
graph; they move with the session readers.

**When it re-runs.** On `working-graph:changed` with `settled` true, when the shown node or edge
ids differ from the ones the engine was built over (`LayoutManager.followWorkingGraph`): a filter
change, released hold, committed window, an undo or redo of either (after the arrangement lands),
playback pausing or ending (`time:pause`, `time:end`; a step while `time:play` holds it is not a
settle point), switching the option, and an edit that adds or removes a shown node: one full
re-layout, queued behind any build already asked for. With nothing hidden there is no part, and a
load streams in exactly as it does without the option: no view is derived and nothing is laid out
again. Not built yet, and recorded on #6201: an edit that only grows a filtered set is laid out in
full rather than placed incrementally (kept rows carried through their original rows, new rows
"added"), and a node entering the window during playback keeps its last place (or none) until the
playback stops rather than being placed at its shown neighbors' mean.

**Tests.** #6117's tests move here, retargeted from `layout.visibleOnly: true` to
`workingGraph: "visible"`: `test/browser/layout-visible-only.test.ts` (becomes
`working-graph-layout.test.ts`), the scaling counted-work test and the app's
`ShownOnly.real-element.test.tsx`, keeping their assertions. Added: the scaling test on
ForceAtlas2 CPU and GPU; an edge-filter case where a hidden edge must not shorten the distance
between its shown ends; the four audit cases; `layoutScope: "graph"` under a filter; a chunked load
with the option on and no filter asserting zero view derivations and zero full re-layouts. Still to
add: the GPU scaling case (a real device runs only when a run asks for hardware with
`GRAPHTY_BROWSER_GPU`; it belongs beside
`test/browser/webgpu-working-graph.test.ts`) and `layoutScope: "graph"`, with the S9 field.

None of #6117's API ships, and the app's "Shown nodes only" checkbox does not come back: a
whole-graph layout under a filter is the layout scope `"graph"`. #6117's app test
(`ShownOnly.real-element.test.tsx`) moves to S11, when the app turns the option on; its first half
(a filter lays out only what it shows, hidden nodes stay put) is the app's case then.

## 8. Framing, styling, selection, AI, project file

- **Framing (S5)**: `boundsToFrame` with no nodes reads the working graph when the option is on.
  Fit, the standard views, `applyCameraView`, the screenshot presets and AI `zoomToNodes` then agree
  with `zoomToFit`. `applyCameraView(view, { scope: "graph" })` frames everything (it already names
  every node). Frame selection and `scope: "selection"` drop selected nodes the working graph hides;
  AI `zoomToNodes` drops matches it hides. `zoomToNodes(ids)` frames the ids it is given.
- **Styling (S7)**: painting matches over the whole graph, because a hidden node draws nothing.
  Rankings and counts read shown. The legend returns only rows the layer holds that are shown, each
  with its count, in no promised order; the app keeps its own sort and deletes only the filtering
  and the row-cap workaround in `heldRows`.
- **AI tools (S8)**: `queryGraph` gives shown and whole counts; the schema prompt says a filter is
  on and how much it hides.
- **Project file and journal (S9)**: the option is not saved; see section 4.

**The selection (S6).** The stored selection keeps its ids. With the option on, its readers
(`selection.nodes`, counts, Frame selection, "Selected (N)", Save as set) read the members the
filter shows. The time window is exempt: members outside it stay selected and counted, as
`design/ui/framework/interaction-patterns.md` requires. Clearing the filter brings hidden members
back selected. `selection:changed` reports the members as read, plus an additive `storedCount`.
Save as set saves the members as read. Writes:

- replace, `apply({ nodes })` replacing, clear: act on the whole stored selection, so hidden ids go
  (the reader stated what the selection is now);
- add, remove, toggle: touch only the named ids; hidden stored ids stay;
- invert, the neighborhood walk, `{ layer }`, `{ neighborsOf }`, `apply({ where | text })`: within
  the working graph; hidden stored ids stay; `scope: "graph"` widens them.

Undo restores the stored selection exactly. Contract cases cover replace and clear with a hidden
selected node.

## 9. Performance

Measured with graph-format's `inducedSubgraph` and `filterEdges` alone, 50,000 nodes, string ids
(`tmp/working-graph/design/bench.mjs`; `tmp/working-graph/review-implementability/bench.mjs`):

| Edges   | Shown share | inducedSubgraph | filterEdges |
| ------- | ----------- | --------------- | ----------- |
| 100,000 | 90%         | 8.3 ms          | 5.6 ms      |
| 100,000 | 50%         | 6.1 ms          | 1.7 ms      |
| 250,000 | 90%         | 23-25 ms        | 14-15 ms    |
| 250,000 | 100%        | 14-17 ms        | -           |
| 500,000 | 90%         | 36.7 ms         | 25.5 ms     |

Through the session (`graphty-element/test/session/working/working-graph.bench.test.ts`, the
`bench` project, medians of seven rounds on the development machine), the store's snapshot carries
the element's bookkeeping columns (five on edges, three on nodes), and a build costs more:

| Edges   | Shown share | View build | Nothing hidden (copy) | Mask readers |
| ------- | ----------- | ---------- | --------------------- | ------------ |
| 100,000 | 90%         | 34 ms      | 4.6 ms                | 2.2 ms       |
| 250,000 | 90%         | 65 ms      | 6.3 ms                | 2.0 ms       |

A scrub frame (an uncommitted `time.seek` plus the mask readers) is 0.4 ms at 250,000 edges and
builds nothing; the first build after `time.commit()` is about 61 ms. Almost all of a build is
graph-format's `inducedSubgraph` over the columns; making it cheaper is graph-format's work, not
this design's. The derived-input cache's byte walk skips primitives, so an id map costs about 3 ms
per walk at this size rather than 27 ms.

A build at 250,000 edges misses a 16 ms frame, and graph-format has no shortcut for an all-ones
mask. That is acceptable because:

- **Nothing hidden costs nothing**: the identity fast path (section 2).
- **No build per frame**: live readers answer from the masks (section 5); slides and holds build
  nothing until they settle.
- **Once per state**, shared by every reader, through the bounded cache; one 90% view keeps about
  7 MB (11 MB with five attribute columns).
- **Layouts follow settled changes**, placing growth incrementally (section 7). Each filter change
  re-uploads a GPU layout's graph.

## 10. Keeping new readers honest (S12)

1. **A contract test,** `graphty-element/test/contracts/working-graph-readers.test.ts`. It reads
   every public method from `graphty-element/api/*.api.md` (as `test/cost-coverage/api-methods.ts`
   does) and requires each to be listed in `test/contracts/working-graph-readers.ts` as one of:
    - `working`: the test hides one node with a filter, sets `"visible"`, calls with no scope and
      asserts the hidden node is absent from the answer and every count; then calls with exactly
      `scope: "graph"` and asserts it is present.
    - `whole-by-name`: the whole graph by label (filter conditions, `scope.histogram` with no
      `within`, export, project file, `data.snapshot()`, `visibility.nodeMask()`); the hidden node is
      present with the option on.
    - `by-id`: a lookup by id (`node`, `edge`, `name`, notes, positions).
    - `writer-over-a-set`: a writer fed a target set (`removeNodes` from the selection, pin or group
      over a selector, `selection.apply` targets); the fixture asserts a hidden member is untouched
      under `"visible"` unless the call names `scope: "graph"`.
    - `not-a-reader`: camera, logging, registries.

    `data.working()` is listed explicitly. Extra cases: a defined algorithm run with
    `scope: "graph"` sees the hidden node; selection replace and clear. An unlisted method fails.
    Counted-work cases: one build per filter state however many readers; 100 `slideWindow` steps
    with the app's live readers subscribed build 0 views before `commitWindow` and exactly 1 after.

2. **A ratchet,** `tools/check-working-graph.mjs`, over `graphty-element/working-graph-baseline.json`
   of methods not yet passing, each with a reason and `Refs #6201`. It may only shrink (compared
   with the merge base) and is empty when this work is done.
3. **App lint,** `graphty/eslint-rules/no-scope-visible.js`: the app may not pass
   `scope: "visible"`, intersect ids with `visibility.nodes`, or call a scoped reader with no scope
   (an unscoped call would silently change meaning with the mode).

## 11. Implementation plan

Each step lands with its tests; each new test fails before its change. Builds and tests run
through `tools/low-priority.sh`; only touched test files run locally.

1. **S1 core (Node-safe).** New `graphty-element/src/session/working/WorkingGraph.ts`: the cached
   view through `derivedInputs.ts` and `declaredInput` (exported from
   `algorithms/input/ScopedInput.ts`, the one helper a run and the view share), the identity fast
   path, per-state holders. `session/types.ts` (`WorkingGraphMode`, `WORKING_GRAPH_MODES`, the
   option, `setWorkingGraph`, `SessionDataApi.working`, the event), `session/GraphSession.ts`,
   `Graph.ts` (hands its derived-input cache to the session) and `graphty-element.ts` (property and
   attribute). Cost coverage: `setWorkingGraph` MUTATING (it re-runs a layout), `working` READ_ONLY.
2. **S12 contract test and ratchet**, before the readers move, every failing reader in the
   baseline: `test/contracts/working-graph-readers.{ts,test.ts}`, `tools/check-working-graph.mjs`
   (with `--self-test`), the baseline file.
3. **S2.** `session/data.ts`, `query.ts`, `adjacency.ts`, `statistics.ts`, `attributes.ts`,
   `issues.ts`, `columns.ts`, `selection/SelectionApi.ts` (statistics), `scope/ScopeApi.ts`,
   `time/TimeApi.ts` (`"graph"` token).
4. **S3.** `simple/defineAlgorithm.ts`, `simple/view.ts`, `simple/source.ts`, the legacy facade
   beside `algorithms/input/maskBack.ts`, the refusal suggestion in `session/runs/`.
5. **S4.** Settle the simulation bridge and holder rules first, since they fix the row-mapping API
   every layout uses. `managers/LayoutManager.ts`, `layout/SimulationLayoutEngine.ts`,
   `layout/SnapshotLayoutEngine.ts`, `layout/LayoutEngine.ts`, `layout/graphviz/structure.ts` and
   `GraphvizLayoutEngine.ts`, `layout/LocationMapLayoutEngine.ts`, `layout/groupSizing.ts`,
   `meshes/supportPoints.ts`, `session/optionsFor.ts`, `session/layout.ts`.
6. **S5.** `Graph.ts` (`boundsToFrame`, `selectionToFrame`), `screenshot/`,
   `ai/commands/CameraCommands.ts`.
7. **S6.** `session/selection/SelectionApi.ts`, `targets.ts`, `session/sets/resolve.ts`.
8. **S7.** `session/styles/StylesApi.ts`, `legend.ts`, `rows.ts`, `scales.ts`, `selector.ts`.
9. **S8.** `ai/commands/QueryCommands.ts`, `SchemaCommands.ts`, `selectors.ts`, `ai/prompt/`.
10. **S9.** `session/projectFile.ts`, `session/project/`, `autosave/`, `session/journal.ts`.
11. **S10.** `session/runs/RunsApi.ts`, `Run.ts` (`rerun({ options })`), `session/time/`.
12. **S13.** New `docs/guide/working-graph.md` with the canonical example and the vocabulary;
    `algorithms.md` (legacy plugin caveat in `"documented"` mode), `layouts.md` (layout scope),
    `filter-conditions.md`, `find.md`, `layer-counts.md` point to it. `npm run api:report`, report
    committed.
13. **S11 the graphty app.** First give every app call meant to read the whole graph an explicit
    `scope: "graph"` or `within` (filter cards in `selection/StepPane.tsx` and `values.ts`, steps
    based on the Full graph, `inspector/GraphValues.tsx`, `export/DataOutput.tsx`, Largest
    component), each with a test. Then `workspace/frame/ElementHost.tsx` sets
    `workingGraph="visible"` and the app deletes what the element now does: `heldRows`' filtering,
    explicit `scope: "visible"` and visible-id intersections. Fix the rows marked S11. UI tests drive
    real input against the real element. Then the lint rule.
14. **Close #6117** unmerged with a pointer to this branch; record the major's flips on #6124.

## 12. What flips in the next major (#6124)

- `workingGraph` defaults to `"visible"`. `"documented"` stays one major, then is replaced by an
  additive `"graph"` member for a consumer that wants every reader on the whole graph (for example
  a tool that filters only the drawing). The `"all"` alias goes.
- Fit and the standard views frame what is shown (approved).
- The selection: the approved change drops ids a filter hides. This design instead keeps them and
  reads the selection as its filter-shown members. The owner decides on #6124 between the two.

## Review

Fixed: the simulation-engine layout bridge; the nothing-hidden fast path and incremental
placement; no view build while scrubbing (mask readers, counted test); placing nodes that enter
during playback; cache holders and memoized bitmaps; defineAlgorithm and legacy plugins reading
the run's scope; app calls that mean "whole graph" by omitting a scope; `scope.histogram` kept
whole; which mode each change applies in; one vocabulary (`"visible"`, `"graph"`,
`"documented"`); the layout scope under the option; `data.snapshot()` classified; selection writes
and the window exemption; legend order left to the app; rerun keeping scope and card ranges in the
element; accessor names and a content-change event; the example; a writer contract category;
`reference.outsideBase` made additive; minor wording.

Rejected: a layout set ignoring the window during playback (the window is part of what is shown;
entering nodes are placed instead); an arrangement stored per view for undo (set a seed); per-row
tables in section 4 (grouped lists keep the size budget).
