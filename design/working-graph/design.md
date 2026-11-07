# The working graph: one filtered view of the graph that every reader uses

Issue: #6201. Breaking follow-up: #6124.

## 1. The problem

graphty-element hides part of a graph without deleting it, with a visibility filter and a time
window. Every operation then reads either the whole graph or what is shown. An
audit of every operation in graphty-element and the graphty app (129 operations,
`tmp/graph-version-audit/report.md`) found 71 that read the wrong one: "6 of 4 nodes" in the Style
tab, Fit framing empty space, G selecting hidden nodes, a layout spreading the shown nodes over
the space of the whole graph.

Fixing operations one by one fails, because every new one makes the choice again. This design
makes it once.

## 2. The model

- **The original graph** is the only graph and the source of truth: every edit, the project file,
  undo and history act on it. Nothing copies it.
- **The working graph** is a view of the original: the nodes and edges the filter and the time
  window leave shown. graph-format derives it as a compact graph
  (`inducedSubgraph(nodeMask)`, then `filterEdges(edgeMask)` when an edge filter hides more than
  the hidden nodes' edges), with a map from each of its rows back to the original's row. It is
  built at most once per filter state, cached and shared by every reader.
- **Hidden things keep everything.** Positions, styles, run results, notes and the stored
  selection are keyed by original ids, so a hidden node keeps its place, look, values and notes,
  and gets them back the moment it is shown. Nothing needs syncing, because nothing was copied.
- **Every reader reads the working graph by default.** A count, a list, a search, a run, a layout,
  a frame, a ranking. A reader that must see the whole graph asks for it by name, with
  `scope: "graph"`: a filter's own conditions (a filter that read its own output would change its
  own input), anything labeled "Full graph" or "All", export, the project file, and a search the
  reader allows to find hidden items.
- **Lookups by id are not readers.** `data.node(id)`, `data.edge(id)`, `data.name(id)`,
  `sourcesOf`, notes and positions answer for shown and hidden nodes alike.

**What invalidates the view.** Its cache key is (store, snapshot serial, node mask version, edge
mask version). A new snapshot (any edit), a filter change, a window change and an undo or redo of
either bump one of them. Drawing options (show context, ghosts, labels) never do.

**Ghosts and context.** A ghost (an element outside the time window drawn faintly while playback
says `outside: "ghost"`) and a context node (`showContext`) are drawn but not shown. They are not
in the working graph: no run, layout, count or frame includes them. A held condition (`hold`, the
reader editing a condition) draws what it would remove as ghosts; the view follows the filter as
recorded, not the held one.

**The time window** is part of "shown", exactly as the masks already compose it. While a reader
drags the window slider (`slideWindow`, uncommitted), the masks move every frame but nothing builds
the view: drawing and the counts read the masks and `visibility.summary`, which cost nothing. The
view is built the first time a reader asks after the move. A shown-only layout re-runs when the
window is committed (`commitWindow`, the end of a drag) and when playback pauses or ends, the same
rule for smooth and stepped play.

**Edits while filtered** go to the original. The filter re-evaluates over the new snapshot, so an
added node the filter shows is in the next view and is laid out. Editing a hidden node by id works.

**Undo.** The view is derived and never in history. Undoing a filter restores its masks, which
keys a new view; the cache keeps the last two views, confirmed by bitmap, so undo then redo
rebuilds nothing.

**The selection.** The stored selection keeps its ids. With the option on, every reader of the
selection (`selection.nodes`, counts, Frame selection, "Selected (N)", Save as set) reads its
shown members only. Clearing the filter brings the hidden members back selected. #6124 asks that
clearing the filter does NOT bring them back; this design follows the owner's later rule that
hidden nodes keep their selection, and section 12 records the difference for the major.

## 3. The public API

All of it is additive. Today's behavior is the default; the graphty app turns the view on.

**The option.** `WorkingGraphMode = "legacy" | "shown"` (open union; more members may be added in
a minor release).

- `"legacy"` (default): every reader keeps the default it documents today (runs read what is
  shown, `data.nodePage` reads the whole graph, Fit frames every node, and so on).
- `"shown"`: every reader that names no scope reads the working graph.

Where a consumer sets it:

- the element: the `workingGraph` property and the `working-graph` attribute;
- a headless session: `createGraphSession({ workingGraph: "shown" })`;
- at any time: `session.config.setWorkingGraph(mode)`, read back as `session.config.workingGraph`.
  It is a consumer setting, like `layoutBehavior`: not a project setting, not an undoable step and
  not saved in the project file, so a project opened in another consumer keeps that consumer's
  choice. Changing it emits `working-graph:changed` with `{ mode }` and re-runs a shown-only
  layout when the working graph differs from the whole graph.

**Reading the whole graph by name.** Every reader takes `scope: "graph"` (the scope token that
already exists). Readers that take no options today gain an optional `{ scope }` (section 5).

**The advanced path.** `session.data.working()` returns the view for authors who need speed:

```ts
interface WorkingGraph {
    readonly mode: WorkingGraphMode; // the option
    readonly nodeCount: number;
    readonly edgeCount: number;
    has(id: NodeId | EdgeId): boolean; // shown?
    nodes(): readonly NodeId[]; // identity-stable while the view is unchanged
    snapshot(): GraphSnapshot; // the compact graph-format snapshot (built on first call)
    originalNodeRow(row: number): number; // compact row -> original row
    originalEdgeRow(row: number): number;
}
```

In `"legacy"` mode it still answers for what is shown, so an extension can opt in on its own.

**The canonical example** (no snapshot rows, CSR or masks):

```html
<graphty-element working-graph="shown"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    const { session } = graph;
    await session.data.loadSample("graph-samples-karate");

    // Show one faction. Everything below reads what is shown.
    await session.visibility.addCondition({
        effect: "keep",
        rule: { kind: "categories", attribute: "data.club", values: ["Officer"] },
    });

    console.log(session.data.nodes().length); // that faction's members
    console.log(session.data.nodes({ scope: "graph" }).length); // all 34, asked for by name
    const rank = await session.runs.start("pagerank"); // ranks the shown graph
    graph.zoomToFit(); // frames the shown graph; layouts re-run over it
</script>
```

## 4. Every reader with the option on

Plan sections: S1 core, S2 session readers, S3 algorithms, S4 layouts, S5 framing, S6 selection,
S7 styling, S8 AI tools, S9 project file and journal, S10 runs and timeline fixes the audit found
that are not about which graph is read, S11 the graphty app, S12 the contract test, S13 docs.
"unchanged" means it already reads the right graph, or reads the whole graph by name.

### Algorithms

| Operation                                    | With the option on                             | Plan      |
| -------------------------------------------- | ---------------------------------------------- | --------- |
| Built-in run with no scope                   | shown (already)                                | unchanged |
| GPU-accelerated run                          | the same scoped input                          | unchanged |
| Cost estimate, refusal, plan                 | the run's scope                                | unchanged |
| Refusal suggestion "largest connected piece" | largest piece of the refused scope             | S3        |
| defineAlgorithm runs                         | its graph view is built from the working graph | S3        |
| Legacy plugin                                | whole graph, masked back, caveat; new accessor | S3        |
| Timeline 'keep' when a filter is cleared     | out of date                                    | S10       |
| Timeline 'rerun' on add and clear            | one rule                                       | S10       |
| Run staleness                                | scope digests                                  | unchanged |
| "Update X layer" after a filter change       | updates the existing run                       | S10, S11  |
| Names of runs differing only by filter       | told apart                                     | S10       |
| Inspector "Settings changed" Rerun           | keeps the scope                                | S11       |
| Inspector stale Rerun                        | saved scope                                    | unchanged |
| Runs list "Show"                             | paints the stored run (`runs.paint`)           | S10, S11  |
| Legend row name when the scope moved         | "out of date"                                  | S11       |
| Path form From/To search                     | shown (find default)                           | S2        |
| Workspace card measure on its base           | its base                                       | unchanged |
| Card Results picker                          | as today                                       | unchanged |
| "Add X layer" label                          | matches what happens                           | S11       |
| Suggested styles of a scoped run             | the scope                                      | unchanged |
| AI runAlgorithm                              | shown                                          | unchanged |
| `catalog.optionsFor` for layouts             | the working graph                              | S4        |
| cytoscape-extensions algorithms              | their collection                               | unchanged |
| Docs on the default run scope                | names the time window                          | S13       |

### Layout and camera

| Operation                               | With the option on                          | Plan      |
| --------------------------------------- | ------------------------------------------- | --------- |
| Fit, standard views, applyCameraView    | shown                                       | S5        |
| zoomToFit and auto-framing              | shown                                       | unchanged |
| Layout run                              | the working graph                           | S4        |
| Graphviz phantom node                   | gone: the compact graph has no invalid rows | S4        |
| Node added after a filter that shows it | laid out                                    | S4        |
| Edge filter                             | hidden edges pull nothing                   | S4        |
| Third-party StaticLayoutEngine          | handed the working graph                    | S4        |
| Re-layout when the window moves         | on commit and on pause, both play modes     | S4        |
| Ghosts                                  | take no part                                | S4        |
| Scoped layout with scope 'visible'      | follows the filter                          | S4        |
| Layout estimate and refusals            | the working graph                           | S4        |
| Force driver choice (CPU or GPU)        | working graph's node count                  | S4        |
| clusterBy reading a run                 | the layout's set                            | S4        |
| Group boxes following members           | shown members                               | S4        |
| Frame selection (F)                     | shown selected nodes                        | S5        |
| zoomToNodes(ids), nodesInRect           | as given; drawn                             | unchanged |
| Location map extent after an undo       | the working graph                           | S4        |
| Curved-edge support points              | drawn nodes                                 | S4        |
| Pins replay                             | all nodes                                   | unchanged |

### Styling

| Operation                                | With the option on                           | Plan      |
| ---------------------------------------- | -------------------------------------------- | --------- |
| Style tab Which head "N of M"            | both shown                                   | S7, S11   |
| `styles.categories` counts               | the layer's shown elements                   | S7        |
| Automatic domain, quantile cuts          | whole column by default; `domainFrom` option | S7        |
| Legend category rows                     | values the layer selects that are shown      | S7        |
| `styles.groups` counts, "Select these N" | shown                                        | S7        |
| Property row "on N", "Matched nodes"     | shown                                        | S7        |
| `styles.counts` docs                     | `visible` documented                         | S13       |
| Top N or percentile rule                 | whole column (owner); `within` option        | S7, S11   |
| `styles.agreement` for "Mixed"           | shown                                        | S7        |
| `styles.preview` bins                    | whole, as the domain                         | unchanged |
| Layers built from a run                  | the run's members                            | unchanged |
| Why this look                            | one element                                  | unchanged |
| Label declutter and counts               | drawn                                        | unchanged |
| State looks                              | members                                      | unchanged |
| Selection workspace preview              | the branch's base                            | unchanged |
| Legend painted count, category cap       | stable across filtering                      | unchanged |

### Data views

| Operation                                | With the option on                        | Plan      |
| ---------------------------------------- | ----------------------------------------- | --------- |
| Matches strip Degree vs the Degree step  | shown degree on both                      | S2        |
| Find box value rows and counts           | shown                                     | S2        |
| Find box hits                            | shown; "include hidden" marks hidden hits | S2, S11   |
| Node inspector Degree and neighbor list  | shown; accurate row name                  | S2, S11   |
| Multi-select summary                     | shown                                     | S2        |
| Overview Degree section                  | labeled                                   | S11       |
| Overview vs table "something is hidden"  | one test (`summary`)                      | S11       |
| Attribute inspector summary              | shown                                     | S2        |
| Table header hover and issue warnings    | shown                                     | S2        |
| Table members chip                       | shown; All by name                        | S11       |
| Table Export...                          | preselects Shown                          | S11       |
| Time dock bar labels                     | "N of M"                                  | S11       |
| Layer Values histogram                   | shown                                     | S2        |
| Card Top-N bound, positions, suggestions | the card's base                           | S11       |
| Note target "Not in the current graph"   | says hidden                               | S11       |
| Toolbar "Nothing is drawn"               | shown count                               | S11       |
| Table rows, sorting, paging              | Shown or All, named                       | unchanged |
| Overview counts                          | as labeled                                | unchanged |
| Data filter cards                        | whole graph by name (rule of section 2)   | unchanged |
| Selection card histograms, checklists    | the base                                  | unchanged |
| Filter chip and time readout             | shown                                     | unchanged |
| Export dialog scope list, source rows    | as labeled                                | unchanged |

### Selection and sets

| Operation                                | With the option on                       | Plan      |
| ---------------------------------------- | ---------------------------------------- | --------- |
| Select all                               | shown                                    | unchanged |
| Neighborhood (G), inspector neighborhood | shown neighbors                          | S6        |
| Select what it paints, Covered by        | shown                                    | S6        |
| Filter card "Select N"                   | shown                                    | S6        |
| Source row "Select nodes"                | shown                                    | S6        |
| Style group and binding row select       | shown                                    | S6        |
| Largest component select                 | whole, labeled                           | unchanged |
| Selection holding ids a filter hides     | read as its shown members                | S6        |
| invert target                            | within the working graph                 | S6        |
| Workspace counts, Done "N of M"          | the base                                 | unchanged |
| Base label Full graph / Filtered graph   | from `summary`                           | S11       |
| Reference picker list and heading        | the base                                 | S2, S11   |
| Hops or touching from a hidden reference | a reason code                            | S6        |
| Shortest path bound to a hidden node     | not offered (find default)               | S2        |
| Reference "Selected (N)"                 | shown                                    | S6        |
| Number card range vs bars                | one base                                 | S11       |
| Category checklist counts                | the base                                 | unchanged |
| Results fields offered to a filter       | whole-graph runs                         | unchanged |
| Save as set                              | the selection as read                    | unchanged |
| Filters on filters; window plus filter   | whole graph per card                     | unchanged |
| Keyboard node walk                       | not built; contract covers it when it is | unchanged |

### Project file, AI, export and API

| Operation                                  | With the option on                            | Plan      |
| ------------------------------------------ | --------------------------------------------- | --------- |
| Project open: runs before the filter       | the set it was computed on                    | S9        |
| Autosave recovery                          | same path as open                             | S9        |
| Layout scope in the project file           | saved                                         | S9        |
| Filter, steps, window, sets: save and open | as saved                                      | unchanged |
| Autosave write                             | whole project                                 | unchanged |
| Undo and redo of a filter with a run       | staleness follows                             | unchanged |
| AI queryGraph counts                       | shown, and the whole count                    | S8        |
| AI schema and system prompt                | says a filter is on                           | S8        |
| AI findNodes                               | shown; hidden marked when asked               | S8        |
| AI zoomToNodes                             | shown                                         | S5, S8    |
| Screenshot preset fitToGraph, export image | shown                                         | S5        |
| captureScreenshot                          | drawn                                         | unchanged |
| Export dialog                              | All, labeled                                  | unchanged |
| Journal entry of a run with no scope       | the resolved scope                            | S9        |
| Recipe                                     | filter and styles                             | unchanged |
| Load more and Refresh notices              | load counts                                   | unchanged |
| Expand and Collapse                        | the selected node                             | unchanged |
| Samples add and open                       | as chosen                                     | unchanged |
| XR picking                                 | drawn                                         | unchanged |
| runs.start default scope                   | shown                                         | unchanged |
| `data.statistics`, `recommendLayout`       | the working graph                             | S2, S4    |
| nodePage, find, neighbors defaults         | the working graph                             | S2        |
| data.nodes, valueCounts, histogram         | the working graph                             | S2        |
| time.bins, scope.histogram, within options | as documented                                 | unchanged |
| selection.apply with where or text         | within the working graph                      | S6        |
| exportGraph with no scope                  | whole graph: an export is a file of the graph | unchanged |

## 5. Session readers (S2)

One function decides every default: `readerScope(asked, documented)` returns `asked` when the
caller named a scope, `"visible"` when the mode is `"shown"`, and the reader's documented default
otherwise. Every reader calls it, so the rule lives in one place.

Readers that already take a scope (`nodePage`, `edgePage`, `neighbors`, `find`, `statistics`,
`histogram`, `scope.histogram`) only change their default. Readers that take none gain an optional
one: `data.nodes({ scope })`, `data.edges({ scope })`, `data.attributes({ scope })`,
`valueCounts(path, { scope })`, `issues({ scope })`, `structureValue(id, path, { within })`,
`structureValues({ within })`, `selection.statistics({ scope })`, a per-group shown count in
`styles.groups`, `counts().visible.painted`. Under `"shown"`, `find` reads the working graph; an app
that lets the reader find hidden items passes `scope: "graph"`, and each hidden hit carries
`excludedBy` as today. Neighbor and degree readers count over the working graph.

## 6. Algorithms (S3)

- **Built-in algorithms** declare `scopeInput: "subgraph"` and default to "visible". A run's
  scoped input for "visible" (declared orientation, no merge) IS the working graph: S1 builds the
  view through the same `DerivedInputs` cache (`algorithms/input/derivedInputs.ts`), keyed by the
  same bitmaps, so runs and readers share one snapshot and a GPU accelerator hits its upload cache.
- **defineAlgorithm**: with the option on, the graph view an author reads (`simple/view.ts`) is
  built from the working graph, so `node.neighbors()` and degree see only shown nodes. Off, it stays
  as today (whole graph, masked back), which is the #6124 decision still open.
- **Legacy plugins** read the data manager, which is the whole graph. They keep doing so; their
  values are masked back to the scope and the run carries the `scope.whole-graph` caveat (both
  exist). They gain `this.workingGraph()` (the S1 accessor) to read the view if they want it.
- **GPU**: no change; it reads the scoped input. The force driver's CPU/GPU choice counts the
  working graph.
- **Refusal suggestion**: "largest connected piece" is computed over the refused scope.

## 7. Layouts (S4): the view replaces #6117's leave-out

PR #6117 (`behavior.layout.visibleOnly`, not merged) kept every node in the engine and marked
hidden rows "left out" (`LayoutEngine.setLeftOut`), with per-engine code. The audit found four
paths that missed the mark: Graphviz's phantom row, edges under an edge filter, third-party static
engines, nodes added later.

With the view, the engine is given the working graph and nothing else:

- `LayoutManager` adds only shown nodes and edges to an incremental engine (D3, NGraph,
  ForceAtlas2) and hands a snapshot engine the compact snapshot. Answers come back in compact rows
  and are written to the original rows through `originalNodeRow`.
- A hidden node is not in the engine, so it exerts nothing and keeps its position in
  `ElementPositions`, which is keyed by original row.
- A `StaticLayoutEngine` from a third party gets the same input; it cannot get it wrong.
- Estimates, refusals (not planar, too large), `optionsFor`, the location map's frame, `clusterBy`
  and group boxes read the working graph; group boxes skip hidden members.
- A layout scope still holds the nodes outside it; "visible" means the working graph and follows
  the filter.
- Re-layout happens on a settled change: a filter change, a committed window, playback pausing or
  ending, an edit that changes the working graph, and switching the option. Never per frame.
- Ghosts and context nodes take no part (owner decision).
- A reader who wants the whole graph laid out under a filter sets the layout scope to
  `"graph"`.

None of #6117's API ships. #6117 is closed unmerged; its tests move to this branch, retargeted from `layout.visibleOnly: true`
to `workingGraph: "shown"`: `test/browser/layout-visible-only.test.ts` (becomes
`working-graph-layout.test.ts`), the scaling counted-work test, and the app's
`ShownOnly.real-element.test.tsx`. Each keeps its assertions (hidden nodes do not move, shown nodes
fill the space, a node added later is laid out) and gains the four audit cases above.

**The app's "Shown nodes only" checkbox** does not come back. The app turns the view on, so every
layout already runs over what is shown. If the owner later wants a whole-graph layout under a
filter, that is a layout-scope choice ("Full graph") in the layout form writing `layoutScope`, not a
second mechanism.

## 8. Framing, counts, styling, find, selection, AI, project file

- **Framing (S5)**: `boundsToFrame` with no nodes reads the working graph when the option is on.
  Fit, the standard views, `applyCameraView`, the screenshot presets and AI `zoomToNodes` then agree
  with `zoomToFit`. Frame selection frames the shown selected nodes. `applyCameraView(view, { scope:
"graph" })` frames everything.
- **Counts (S2, S7)**: `statistics`, `counts` and the `styles.*` counts default to shown.
- **Styling (S7)**: painting matches over the whole graph, because a hidden node draws nothing.
  Rankings and counts read shown. Two choices keep their owner-decided defaults: Top-N and
  percentile rules rank the whole column (`within: "visible"` is the option, which the app sets),
  and an encoded style's automatic domain comes from the whole column so colors stay stable
  (`domainFrom: "shown"` is the new option). The legend lists values the layer selects; with the
  option on, only shown ones within its row cap, so the app's `heldRows` workaround is deleted.
- **Find**: section 5.
- **Selection (S6)**: readers read the shown members (section 2). The neighborhood walk, `invert`,
  the `{ layer }` and `{ neighborsOf }` targets and `selection.apply({ where | text })` work within
  the working graph unless the call names `scope: "graph"`. A hops or touching reference that lies
  outside the base returns a reason code (`reference.hidden`) instead of 0.
- **AI tools (S8)**: `queryGraph` gives shown and whole counts; the schema prompt says a filter is
  on and how much it hides; `findNodes` reads shown and marks hidden hits when asked for them;
  `zoomToNodes` frames shown nodes.
- **Project file and journal (S9)**: the option is not saved. Opening a project restores
  visibility before runs, so a run with the default scope resolves to the set it was computed on;
  autosave recovery takes the same path. The layout scope is saved as an optional field. A run
  started with no scope journals the scope it resolved to.

## 9. Performance

Measured with graph-format's `inducedSubgraph` and `filterEdges` on this machine
(`tmp/working-graph/design/bench.mjs`, 50,000 nodes, string ids):

| Edges   | Shown share | inducedSubgraph | filterEdges |
| ------- | ----------- | --------------- | ----------- |
| 100,000 | 90%         | 8.3 ms          | 5.6 ms      |
| 100,000 | 50%         | 6.1 ms          | 1.7 ms      |
| 100,000 | 10%         | 3.2 ms          | 0.1 ms      |
| 500,000 | 90%         | 36.7 ms         | 25.5 ms     |
| 500,000 | 50%         | 29.7 ms         | 7.5 ms      |

`filterEdges` runs only under an edge filter. At 50,000 nodes and 100,000 edges a build fits in a
frame; at 500,000 edges it does not.

That is acceptable because nothing builds the view per frame:

- **Lazy.** The view is built on the first read after a mask move. A slider drag moves masks only;
  the canvas reads the masks and the counts read `visibility.summary`, both free.
- **Once per state**, shared by every reader; undo and redo hit the cache.
- **Layouts follow settled changes** (section 7), so a drag re-runs a layout once, at its end.
- **Memory**: one compact copy at most the original's size, counted in `DerivedInputs`' byte bound.

If a reader must re-read per frame during a drag, the plan is, in order: a mask-based answer (no
view); then an incremental view from the slide's entered and left rows (a graph-format addition);
only then a capped rate of view builds. The counted-work test (S12) pins one build per
filter state, so a regression to a build per reader or per frame fails.

## 10. Keeping new readers honest (S12)

A reader added next year must not read the whole graph by accident. Three checks:

1. **A contract test,** `graphty-element/test/contracts/working-graph-readers.test.ts`, in the
   spirit of `tools/check-special-layers.mjs`. It reads every public method from
   `graphty-element/api/*.api.md` (as `test/cost-coverage/api-methods.ts` already does) and requires
   each to be listed in `test/contracts/working-graph-readers.ts` as one of:
    - `working`: returns something about the graph. The test loads a graph, hides one node with a
      filter, sets `"shown"`, calls the method with no scope, and asserts the hidden node is absent
      from the answer and from every count; then calls it with `scope: "graph"` and asserts it is
      present. One fixture call per method, written beside the classification.
    - `whole-by-name`: labeled as the whole graph (filter conditions, export, project file). The test
      asserts the hidden node is present with the option on.
    - `by-id`: a lookup by id (`node`, `edge`, `name`, notes, positions).
    - `not-a-reader`: reads no graph content (camera, logging, registries).
      An unlisted method fails the test, so a new public method is classified when it is added.
2. **A ratchet,** `tools/check-working-graph.mjs`, over a baseline
   `graphty-element/working-graph-baseline.json` of methods that do not yet pass their `working`
   check, each with a reason and `Refs #6201`. The baseline may only shrink (compared with the merge
   base), as the special-layers baseline does. It starts with whatever S2-S8 have not reached and
   is empty when this work is done.
3. **App lint,** `graphty/eslint-rules/no-scope-visible.js`: the app may not pass `scope:
"visible"` or intersect ids with `visibility.nodes`; that would hide a reader the contract missed.

## 11. Implementation plan

Each step lands with its tests; each new test fails before its change. Builds and tests run through
`tools/low-priority.sh`; only touched test files run locally.

1. **S1 core (Node-safe).** New `graphty-element/src/session/working/WorkingGraph.ts`: the cached
   view, built through `derivedInputs.ts` and `intermediateOf` in
   `algorithms/input/ScopedInput.ts` (moved to a shared helper), keyed on snapshot serial and the
   masks' versions from `session/visibility/VisibilityApi.ts`. `session/types.ts`
   (`WorkingGraphMode`, `CreateGraphSessionOptions.workingGraph`, `SessionConfig.workingGraph` and
   `setWorkingGraph`, `SessionDataApi.working`, the event), `session/GraphSession.ts` (wiring and
   `readerScope`), `Graph.ts` and `graphty-element.ts` (property and attribute). Counted-work test:
   one build per filter state however many readers; cost coverage classifies `setWorkingGraph`
   MUTATING (it re-runs a layout) and `working` READ_ONLY.
2. **S12 contract test and ratchet**, before the readers move, with every failing reader in the
   baseline. Files: `test/contracts/working-graph-readers.{ts,test.ts}`,
   `tools/check-working-graph.mjs` (with `--self-test`), `graphty-element/working-graph-baseline.json`.
3. **S2 session readers.** `session/data.ts`, `session/query.ts`, `session/adjacency.ts`,
   `session/statistics.ts`, `session/attributes.ts`, `session/issues.ts`, `session/columns.ts`,
   `session/selection/SelectionApi.ts` (statistics), `session/scope/ScopeApi.ts`. Rows leave the
   baseline.
4. **S3 algorithms.** `simple/defineAlgorithm.ts`, `simple/view.ts`, `simple/source.ts`,
   `algorithms/input/maskBack.ts` (legacy accessor), the refusal suggestion in
   `session/runs/` (cost gate).
5. **S4 layouts.** `managers/LayoutManager.ts` (feed the working graph, settled re-layout),
   `layout/SnapshotLayoutEngine.ts`, `layout/LayoutEngine.ts` (`StaticLayoutEngine` input),
   `layout/graphviz/structure.ts` and `GraphvizLayoutEngine.ts` (`!== INVALID_INDEX`),
   `layout/LocationMapLayoutEngine.ts`, `layout/groupSizing.ts`, `session/optionsFor.ts`,
   `session/layout.ts`. Port #6117's tests (section 7).
6. **S5 framing.** `Graph.ts` (`boundsToFrame`, `selectionToFrame`), `screenshot/`,
   `ai/commands/CameraCommands.ts`.
7. **S6 selection.** `session/selection/SelectionApi.ts`, `session/selection/targets.ts`,
   `session/sets/resolve.ts` (reason code).
8. **S7 styling.** `session/styles/StylesApi.ts`, `legend.ts`, `rows.ts`, `scales.ts`
   (`domainFrom`), `selector.ts` (`within`).
9. **S8 AI tools.** `ai/commands/QueryCommands.ts`, `SchemaCommands.ts`, `selectors.ts`,
   `ai/prompt/`.
10. **S9 project file and journal.** `session/projectFile.ts`, `session/project/`,
    `autosave/`, `session/journal.ts`.
11. **S10 runs and timeline.** `session/runs/RunsApi.ts` (`runs.paint`, `siblingsDifferBy` scope),
    `session/time/` (keep and rerun decided by window keys).
12. **S13 docs.** New `docs/guide/working-graph.md` with the canonical example; `algorithms.md`,
    `layouts.md`, `filter-conditions.md`, `find.md`, `layer-counts.md` point to it.
    `npm run api:report` in graphty-element, report committed.
13. **S11 the graphty app.** `workspace/frame/ElementHost.tsx` sets `workingGraph="shown"`. Then
    delete what the element now does: the `heldRows` legend workaround, explicit `scope: "visible"`
    and visible-id intersections in select actions, counts and find. Fix the app rows of
    section 4 marked S11, starting with `inspector/RunValues.tsx`, `analyze/AnalyzePopover.tsx`,
    `canvas/legendWords.ts`, `graph-place/FindBox.tsx` and `inspector/NodeValues.tsx`. UI tests
    drive real input against the real element. Then the lint rule of section 10.
14. **Close #6117** unmerged with a pointer to this branch; record the major's flips on #6124.

## 12. What flips in the next major (#6124)

- `workingGraph` defaults to `"shown"`; `"legacy"` stays one major as an escape, then goes. This
  single flip carries the two approved changes: Fit and the standard views frame what is shown, and
  the selection is read as its shown members.
- The selection difference: #6124 says a filter that hides a selected node removes it for good;
  this design keeps the stored ids and shows them again when the filter clears. The major either
  keeps that or adds the drop; the owner decides it on #6124.
- `defineAlgorithm` computing over the run's scope and layout `optionsFor` measuring the layout's
  set, still open on #6124, become simply what `"shown"` does.
