# The working graph: one view of what is shown, read by every reader

Issue #6201. It builds the design the owner agreed on 2026-11-07 and nothing more; every choice
he has not seen is in the last section.

## 1. The model (agreed points 1 to 4)

- **The original graph is the only graph.** Edits, undo, history and the project file act on it;
  nothing copies it.
- **The working graph is a view**: exactly the session's visible masks (filter plus time window),
  built with graph-format's `inducedSubgraph({ mask })`, then `filterEdges(mask)` when an edge
  filter hides more than the hidden nodes' edges. The result is a compact graph plus a map from
  its rows back to the original's. graph-format needs nothing new.
- **Built once per state, cached, shared.** The state is the store's snapshot plus the visible
  masks' versions, so the view is rebuilt only on a filter change, a window step, a data edit, or
  an undo or redo of one; drawing options and style previews never move it. It is one entry of the
  existing derived-input cache (`algorithms/input/derivedInputs.ts`), bounded by bytes, so undo
  then redo usually finds it again. With nothing hidden it is the store's snapshot itself.
- **Hidden nodes keep everything**: positions, styles, run results and notes stay keyed by
  original ids, so nothing syncs when a filter clears. The selection is the exception (decision B).
- **Ghosts** (outside the time window) are not visible, so not in the view: they take no part in a
  layout and keep their last positions (decision D).

## 2. The public API

All of it is additive. With the option off, every reader keeps today's behavior.

**The option.** A boolean, `workingGraph`, default `false`: the element's `workingGraph` property
and `working-graph` attribute, `createGraphSession({ workingGraph: true })`, read back as
`session.workingGraph`. On, every reader that names no scope reads the working graph. The graphty
app turns it on; the default flips in the next major (#6124).

**Reading the whole graph by name.** Every reader that reads nodes or edges takes a scope. Each
keeps its existing whole-graph word: `"graph"` (`data.nodePage`, `find`, `neighbors`, union
leaves) or `"all"` (`data.statistics`, `time.bins`). A reader with no scope option today gains an
optional `scope?: "graph" | "visible"`; the list is in section 4.

**Top-N and percentile rules (owner decision C).** The threshold leaf gains
`within?: "graph" | "visible"`, default `"graph"`, so ranking keeps the whole column unless the
consumer asks. The graphty app writes `within: "visible"` on its style rules.

**The canonical example:**

```html
<graphty-element working-graph></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    const { session } = graph;
    await session.data.loadSample("graph-samples-karate");
    await session.visibility.addCondition({
        effect: "keep",
        rule: { kind: "categories", attribute: "data.club", values: ["Officer"] },
    });
    await graph.waitForSettled(); // the shown faction is laid out again on its own
    console.log(session.data.statistics().nodeCount); // the shown faction
    console.log(session.data.statistics({ scope: "all" }).nodeCount); // all 34
    await session.runs.start("pagerank"); // ranks what is shown
    await graph.applyCameraView("fitToGraph"); // frames what is shown
</script>
```

The advanced path needs no new accessor. An algorithm defined with `defineAlgorithm` already
reads its graph through `input()`, which hands it the view (section 6).

## 3. The filter editor in the selection workspace, and Done

The first build failed because each editor tick was a recorded filter change the layout followed
under faint removed nodes (`hold`) at old positions; Done only let go of the hold, which counted
as no change; and the preview and the reopened editor drew hidden nodes at stale positions.

**The rule: never draw two layouts on one canvas.** Everything drawn while editing shares the
current layout. The filter changes once, at Done.

- **While editing, nothing moves.** The editor's edits are a draft held by the app.
  `FilterSelection.tsx` stops writing the condition on each tick. The canvas preview is
  `styles.showBranches` over the draft rule, with `base: "visible"` and no `hold`. The draft's
  members show in their card colors. Shown nodes the draft would remove show faint. All of them
  are in the current layout, because the working graph has not changed.
- **The counts still read the full graph** ("49 of 115"), because a filter's own conditions read
  the whole graph. They come from the rule, as they already do for a style selection.
- **Nodes the draft would bring back** (hidden now, kept by the draft) are counted but not drawn
  until Done. They have no place in the current layout. Drawing them where some earlier layout
  left them is exactly the mess the owner reported.
- **Done is the filter change.** The app writes the condition once (`addCondition` or
  `updateCondition`), which is one history step. The visible masks move, so the view is rebuilt,
  and the layout lays the shown nodes out once over the new view with an animated transition. The
  element's existing auto-framing then frames what is shown.
- **Cancel writes nothing**, so nothing moves.

Why the bugs cannot repeat: the working graph cannot change while editing, so no layout runs
under the preview (bug 1); Done is the only write, so it is an ordinary filter change the layout
follows, with no separate settle signal (bug 2); a layout cannot read a hidden node (section 7)
and the reopened editor draws over `base: "visible"` (bug 3).

**Other views that draw hidden nodes.** Time-window ghosts keep their last positions while the
shown graph lays out alone (decision D). Turning a filter off is a filter change: hidden nodes
reappear where they were and the layout then lays out everything with the transition. `hold` and
`base: "full"` keep their meaning; their docs gain one line saying that with `workingGraph` on a
hidden node sits where the last layout that held it left it.

## 4. Every reader from the audit

**View** means it reads the working graph when it names no scope (option on). **Whole** means it
reads the original by name. **Neither** means the row is about something other than which graph is
read (naming, painting, rerun plumbing), so this design leaves it to its own issue.

- **Algorithms, View:** built-in and GPU runs, cost estimate, refusals and plan; the "largest
  connected piece" suggestion (of the view); defineAlgorithm runs and legacy plugins; timeline
  'keep' and 'rerun' (a view change marks a run out of date); run staleness; the path form's From
  and To search; `catalog.optionsFor` for layouts; AI runAlgorithm.
- **Algorithms, Whole by name:** a filter card's own measure (`within: "graph"`); Results fields
  offered to a filter.
- **Algorithms, Neither:** "Update X layer", run names, Inspector Rerun, Runs "Show", legend
  out-of-date names, the "Add X layer" label, suggested styles, cytoscape-extensions, and the docs
  line on the default run scope (gains "includes the time window").
- **Layout and camera, View:** every layout and engine (Graphviz, third-party, custom); a node
  added after a filter, an edge filter, time-window re-layout, scoped layouts (section 7); the
  estimate and refusals, force driver choice, clusterBy; group boxes, location-map extent,
  curved-edge support points; Fit, standard views, `applyCameraView` with no scope, zoomToFit,
  auto-framing (decision A); Frame selection (selected nodes in the view); AI zoomToNodes with no
  ids; the screenshot `fitToGraph` preset.
- **Layout and camera, Whole:** `zoomToNodes(ids)` with ids given (a lookup by id); pins replay.
- **Styling, View:** the Which head "N of M"; `styles.categories`, `styles.groups` counts and
  "Select these N"; legend category rows; the property row "on N" and "Matched nodes";
  `styles.agreement`; label declutter and counts.
- **Styling, Whole:** Top-N and percentile rules by default, the app passing `within: "visible"`
  (decision C); the automatic color domain (unchanged); `styles.preview` bins; the legend's painted
  count and category cap.
- **Styling, Neither:** layers from a run's result, Why this look, state looks, the workspace
  preview (section 3).
- **Data views, View:** the matches strip Degree; find box value rows and counts; node inspector
  Degree and neighbors; multi-select summary; attribute inspector; table header hover, issue
  warnings and members chip; time dock bar labels; layer Values histogram; card Top-N bound and
  dates; "Nothing is drawn"; filter chip and time readout; table rows on Shown.
- **Data views, Whole by name:** the Overview's "Full graph" section; table rows on All and Export
  All; data filter cards; a selection card on the full graph; the export dialog's All; source rows;
  find hits when hidden items are allowed (`scope: "graph"`, existing `excludedBy` flag).
- **Selection and sets, View:** Select all; Neighborhood (G); "Select what it paints"; Covered by;
  filter card, source row, style group and binding "Select N"; invert; the reference picker and
  "Selected (N)"; hops or touching from a hidden reference (0, with a reason code); number card
  ranges and bars; category checklists on a visible base; the selection itself (section 5).
- **Selection and sets, Whole by name:** "Largest component" select; filters built on filters
  (each card reads the graph); Save as set (frozen members); the base label "Full graph".
- **Project file, AI, export and API, View:** AI queryGraph counts, schema prompt facts and
  findNodes; the defaults of `data.statistics`, `data.nodes`, `valueCounts`, `histogram`,
  `nodePage`, `find`, `neighbors`, `recommendLayout`, `selection.apply` (where or text) and
  `time.bins`.
- **Project file, AI, export and API, Whole:** the project file, autosave write and recovery, the
  recipe; export (its own `ExportScope`, default the whole graph); load notices, expand and
  collapse, samples, undo and redo.
- **Project file, AI, export and API, Neither:** journaling a run's resolved scope and restoring
  visibility before runs on open (each its own issue). XR picking and captureScreenshot read what
  is drawn, unchanged.

**Readers that gain `scope`:** `data.structureValue`, `selection.statistics`, `data.attributes`,
`valueCounts`, `histogram`, `issues`, `styles.groups`, `styles.categories`, `styles.counts`,
`styles.agreement`, the `neighborsOf`, `layer` and `invert` targets, and `catalog.optionsFor`.

## 5. Owner decisions A to E

- **A, Fit.** With the option on, `boundsToFrame` with no ids measures the view, so Fit, the
  standard views, AI framing and the screenshot presets agree with `zoomToFit`.
- **B, Selection.** A filter change that hides selected nodes removes them from the selection in
  the same history step: undoing the filter brings them back, clearing it later does not. The time
  window never drops ids.
- **C, Top-N:** threshold `within` (section 2). **D, Ghosts:** not in the view (section 1). **E:**
  the view is not a layer; every behavior is a consumer's value; all API here is additive.

## 6. Algorithms (agreed points 5 and 6)

- **Today:** each run resolves its scope to bitmaps, and `ScopedInput` derives a subgraph through
  the derived-input cache. Classes without `scopeInput = "subgraph"` compute over the whole graph,
  and `maskBack` masks their values.
- **With the option on, a run whose scope is `"visible"` takes the view.** It does not resolve or
  derive again; it holds the view's cache entry while it runs. Every class computes over it,
  `defineAlgorithm` definitions and legacy plugins (a legacy graph built from the view) included.
  Results map back onto original ids; hidden nodes get no value. A run is out of date once its
  view is not the current one (today's scope-digest staleness).
- **GPU** runs and the GPU force driver receive the view's compact snapshot like any other graph.
  A test proves the device sees the compact node count.

## 7. Layouts (agreed point 7)

Layouts read the view, not the original rows. `LayoutManager` decides what every engine is given:

- **Simulations** (ngraph, d3, ForceAtlas2, custom live engines) and **third-party engines** get
  only the shown nodes and edges through `addNodes` and `addEdges`. Hidden nodes are not in the
  engine, so they exert no force and never move.
- **Snapshot layouts** (circle, grid, Graphviz, spectral and the rest) get the view's compact
  snapshot as `graph` and `stored`, with `fixed` and `scope` in view rows, and their answers map
  back through the row map: one slot per shown node, and no invalid rows for Graphviz to trip on.
- **Following the view.** On a view change the manager hands the engine the new view: nodes that
  left are removed, nodes that came back enter at their last positions, a simulation restarts, a
  one-pass layout runs again, and filter changes and undo animate with the existing transition.
- **A named layout scope** is intersected with the view, so nothing can lay out a hidden node, and
  a carried or saved `"graph"` scope cannot switch shown-only layouts off.
- **Estimates, refusals, `optionsFor`, the driver choice, group boxes and the location-map frame**
  read the same view.

## 8. Time window (agreed point 8)

- Each window step (slider move, playback step) moves the visible masks, so the view is rebuilt
  and the layout follows it.
- Step 2 of the plan measures a rebuild at 50,000 nodes. If it takes more than one frame (16 ms),
  dragging rebuilds only when the slider pauses (no move for 200 ms), and playback steps rebuild as
  they land.
- Drawing and live counts during a drag answer from the masks, as they do today.

## 9. The honesty check (agreed point 10)

- **`graphty-element/test/contracts/working-graph-readers.test.ts`** finds every reader itself: the
  session's public API from the API reports, every catalog layout and every catalog algorithm.
  With the option on and a filter hiding a known node, a reader naming no scope answers as on the
  graph without it and, with its whole-graph word, over the whole graph; a layout leaves it
  unmoved and gives the shown nodes their count of slots; an algorithm gives it no value. A reader
  it cannot classify fails.
- **`graphty-element/working-graph-baseline.json`** lists readers still failing, each with a reason
  and #6201. The test fails on a stale row. **`tools/check-working-graph.mjs`** (in
  `check:quick` and CI's Checks job) fails when the list gains a row against the merge base or a row
  is malformed. The list only shrinks; a new reader that must read everything takes a scope.
- Reused from the first attempt: the shape of its `tools/check-working-graph.mjs`, without the
  "Whole-Graph-Reader" trailer escape.

## 10. Implementation plan

1. **The view.** A node-safe module, `session/working/view.ts`. It builds from the store snapshot
   and the visible masks with `ScopedInput`'s existing `intermediateOf`, holds one cache entry per
   state, and counts its builds.
   Plumb the option. Tests, each failing first, count builds: one per state; a rebuild on a filter
   change, a window step, an edit and an undo; none on drawing options.
2. **Measure** a view rebuild at 50,000 nodes in a `bench*` project, and decide the slider-pause
   rule (section 8).
3. **Runs.** `"visible"` runs take the view; all classes compute over it under the option; legacy
   graph from the view. Add the GPU test.
4. **Layouts.** Change `LayoutManager` as section 7 says, and test every catalog layout.
5. **Framing and selection** (decisions A and B), with real-input tests (keys F and Fit, a filter
   hiding a selected node).
6. **Session readers.** Each reader defaults to the view under the option; add the `scope`
   options from section 4 and threshold `within`. Run `npm run api:report` and add the
   cost-coverage classification.
7. **The honesty check**: the test, the baseline, the script, and the `check:quick` entry.
8. **App.** Set `working-graph`; make the filter editor a draft (section 3) with `base: "visible"`
   and no `hold`; write `within: "visible"` on style threshold rules; pass the whole-graph word on
   readers labeled "Full graph" or "All".
9. **The owner's path, end to end**, a Playwright acceptance script in `graphty/acceptance/`
   (College football, Data > Add filter, Louvain groups 1, 4, 5 and 7), checking screenshots and
   node positions: nothing moves while ticking; only current-layout nodes are drawn; Done moves the
   shown nodes and no hidden node; Circle and Grid place 49 nodes; reopening draws no hidden node;
   clearing the filter ends in one layout. Look at every screenshot.
10. **Docs.** A guide page with the canonical example, the hold and `base: "full"` doc lines, and
    the default flip recorded on #6124.

## 11. Decisions the owner has not seen

Each is the simplest choice consistent with the agreement.

1. **The option is a boolean `workingGraph`** (attribute `working-graph`, read as
   `session.workingGraph`), not saved in the project file and not undoable: one switch whose
   default flips in the major, and the consumer's choice rather than the project's.
2. **No new event and no `data.working()` accessor.** The view changes exactly when visibility or
   data change, which `visibility:changed` and `project:derived` report; `defineAlgorithm`'s
   `input()` already hands algorithms their graph.
3. **No new whole-graph spelling, no deprecation.** Readers keep `"graph"` or `"all"`; readers
   without a scope gain `"graph" | "visible"`. Settling the two words is breaking (#6124).
4. **The filter editor is a draft**: nothing is written until Done, Done is one history step,
   Cancel writes nothing. Only then does the filter change exactly when the reader applies it, as
   point 3 and "Done must apply the layout" need.
5. **The preview draws over `base: "visible"`**: nodes the draft would bring back are counted, not
   drawn, until Done. Drawing them at stale positions is the reported bug; laying them out before
   Done would move nodes while editing.
6. **`hold` and `base: "full"` keep their meaning**, documented. The app stops using them for
   filters; changing them is not needed for the owner's path.
7. **The layout follows every view change** (filter, window step, edit, undo, redo), animating
   filter changes and undo with the existing transition: one rule, the one #6117's description gave.
8. **Framing after a filter re-layout** is the element's existing auto-framing; nothing new.
9. **Simulations drop hidden nodes** rather than holding them inert in the original rows: point 7
   says layouts read the view.
10. **A named layout scope is intersected with the view**; there is no whole-graph layout under the
    option. No agreed reader needs one, and it closes the saved-`"graph"`-scope hole.
11. **Context nodes (`showContext`) are not in the view**, like ghosts; drawn, they sit at their last
    positions. The view is exactly the visible masks; only ghosts were decided (D).
12. **The slider-pause rule**, only if a 50,000-node rebuild exceeds one frame (16 ms): rebuild when
    the slider has not moved for 200 ms, which reads as a pause without feeling late.
13. **Every algorithm class computes over the view under the option**, hidden nodes getting no
    value: points 5 and 6 name defineAlgorithm and legacy plugins.
14. **Dropped selection ids are in the filter's history step**, so undo restores them; ids outside
    the time window stay; Frame selection frames the selected nodes in the view.
15. **Threshold `within` takes `"graph" | "visible"`, default `"graph"`**, the union leaf's words.
    The automatic color domain stays the whole column; C covers ranking only.
16. **A search allowed to find hidden items** is `find({ scope: "graph" })` with its existing
    `excludedBy` flag; how a hidden hit looks is the app's choice.
17. **The honesty baseline can only shrink**, with no trailer escape: the approved wording.
18. **Audit rows about naming, painting, rerun plumbing and restore order are out of scope**: they
    are not about which graph is read; each goes to its own issue.
19. **The view lives in the existing derived-input cache**, one entry per state, and is the store's
    snapshot when nothing is hidden: it reuses what runs share and costs nothing with no filter.
