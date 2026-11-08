# The working graph: one view of what is shown, read by every reader

Issue #6201. It builds the design the owner agreed on 2026-11-07 and nothing more; every choice
he has not seen is in the last section.

## 1. The model (agreed points 1 to 4)

- **The original graph is the only graph.** Edits, undo, history, loading a sample and the
  project file act on it; nothing copies it (decision 24).
- **The working graph is a view**: the session's visible masks (filter plus time window), built
  with graph-format's `inducedSubgraph({ mask })`, then `filterEdges(mask)` when an edge filter
  hides more than the hidden nodes' edges: a compact graph plus a map from its rows back to the
  original's. graph-format needs nothing new.
- **Built once per state, cached, shared.** The state (the cache key) is the store's snapshot
  plus the masks' versions, so the view is rebuilt only on a filter change, a window step, a data
  edit, or an undo or redo of one; drawing options and style previews never move it. The session
  pins the current state's view outside the byte-bounded derived-input cache, so every reader of
  one state gets the same object, dropped once no run holds it (decision 57); with nothing hidden
  it is the store's snapshot.
- **Hidden nodes keep everything** (positions, styles, run results, notes) keyed by original ids;
  nothing syncs when a filter clears. The selection is the exception (decision B).
- **Ghosts** (outside the time window) are not in the view and keep their positions (decision D).

## 2. The public API

All of it is additive. With the option off, every reader keeps today's behavior.

**The option.** A boolean, `workingGraph`, default `false`: the element's `workingGraph` property
and `working-graph` attribute, `createGraphSession({ workingGraph: true })`, read back as
`session.workingGraph`. On, every reader that names no scope reads the view. The graphty app turns
it on; the default flips in the next major (#6124).

**Reading the whole graph by name.** Every reader of nodes or edges takes a scope and keeps its
existing whole-graph word: `"graph"` (`data.nodePage`, `find`, `neighbors`, union leaves) or
`"all"` (`data.statistics`). A reader with no scope today gains
`scope?: "graph" | "visible"`: `data.structureValue`, `selection.statistics`, `data.attributes`,
`valueCounts`, `histogram`, `issues`, `styles.groups`, `styles.categories`, `styles.counts`,
`styles.agreement`, `styles.preview`, the `neighborsOf`, `layer` and `invert` targets, and
`catalog.optionsFor`.

**`within?: "graph" | "visible"`, default `"graph"` (decisions C, 50)** on the
threshold leaf (Top-N, percentile), on a color binding's automatic domain, and on the legend's
counts (painted count, category cap). The graphty app sets `"visible"` on all three.

**The time window's own readers.** `time.bins` with no scope reads the whole graph in every
mode; its `"visible"` scope stays the filter without the window (decisions 39, 59).

**The filter draft.** `visibility.draft(condition)`, or `draft(id)` on an existing condition
(decision 40), returns a `FilterDraft` (decision 51) with `update(rule)`, `counts()`, `commit()` and `cancel()`;
`commit()` is one history step, `cancel()` writes nothing.

**`waitForSettled()`** resolves after the re-layout that a filter or time-window change starts.

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

The advanced path needs no new accessor: `defineAlgorithm`'s `input()` hands it the view.

## 3. The filter editor in the selection workspace, and Done

**The rule: never draw two layouts on one canvas.** The filter changes once, at Done.

- **While editing, nothing moves.** `FilterSelection.tsx` opens a `FilterDraft` and calls
  `update` per edit. Opening it pauses a running simulation (decision 61). The element draws the
  preview in the current layout: draft members in card colors, shown nodes it would remove faint,
  returning nodes not drawn (decision 6).
- **The counts** come from `draft.counts()` over the full graph, time window ignored ("49 of
  115"), as a filter's own conditions (decision 42).
- **Done is `commit()`**, one history step: the masks move, the view is rebuilt, the layout runs
  once over it with the animated transition, and the existing auto-framing frames what is shown.
  **Cancel is `cancel()`** and writes nothing.

Turning a filter off is a filter change (decision 35). The `hold` and `base: "full"` docs gain
a line: a hidden node sits where the last layout that held it left it.

## 4. Every reader from the audit

**View** means it reads the view when it names no scope (option on). **Whole** means it reads the
original and is one of the agreement's named cases: a filter's own conditions, "Full graph" or
"All", export All, the project file, a search allowed to find hidden items.

- **Algorithms, View:** built-in and GPU runs; cost estimate, refusals and plan (decision 52);
  the "largest connected piece" suggestion (54); defineAlgorithm runs and legacy plugins; timeline
  'keep' and 'rerun'; run staleness; the path form's From and To search (53);
  `catalog.optionsFor`; AI runAlgorithm; Inspector Rerun and "Update X layer" (25).
- **Algorithms, Whole:** a filter card's own measure; Results fields offered to a filter.
- **Layout and camera, View:** every layout and engine (Graphviz, third-party, custom); edge
  filters, time-window re-layout, scoped layouts (section 7); estimate and refusals, force driver
  choice, clusterBy; group boxes, location-map extent, curved-edge supports (decision 37); Fit,
  standard views, `applyCameraView` with no scope, zoomToFit, auto-framing (A); Frame selection
  and `zoomToNodes(ids)` (17); AI zoomToNodes; the screenshot `fitToGraph` preset; pins replay.
- **Styling, View:** the Which head "N of M"; `styles.categories`, `styles.groups` counts and
  "Select these N"; legend category rows; the property row "on N" and "Matched nodes";
  `styles.agreement`; `styles.preview` bins; label declutter and its counts.
- **Styling, Whole by default, `within` sets the view:** Top-N and percentile ranking, the
  automatic color domain, the legend's painted count and category cap.
- **Data views, View:** matches strip Degree; find box rows and counts; node inspector Degree and
  neighbors; decision 55's items; layer Values histogram; a selection card's Top-N bound and
  dates; table rows on Shown; source rows; load notices; expand and collapse.
- **Data views, Whole:** the Overview's "Full graph" section; table rows on All and Export All; data
  filter cards, their Top-N bounds and dates; a selection card on the full graph; find hits when
  hidden items are allowed; the time dock's track, extent and bins (decision 59).
- **Selection and sets, View:** Select all; Neighborhood (G); "Select what it paints"; Covered by;
  "Select N" on filter cards, source rows, style groups and bindings; invert; the reference picker
  and "Selected (N)"; hops or touching from a hidden reference (29); number card ranges and bars;
  category checklists on a visible base; "Largest component"; Save as set; the selection (B).
- **Selection and sets, Whole:** filters built on filters; the base labeled "Full graph".
- **AI, export and API, View:** AI queryGraph counts, schema prompt facts and findNodes; the
  defaults of `data.statistics`, `data.nodes`, `valueCounts`, `histogram`, `nodePage`, `find`,
  `neighbors`, `recommendLayout`, `selection.apply` (where or text) (decision 43); export with
  no scope (decision 26).
- **Project file and export, Whole:** the project file, autosave write and recovery, the recipe;
  export All.
- **On open**, visibility is restored before runs in every mode; with the option on, runs journal
  `"visible"`, not a resolved mask (decision 27).
- **Not readers**: run names, Runs "Show", legend out-of-date names, the "Add X layer" label,
  and decision 32's items.

## 5. Owner decisions A to E

Each applies only with the option on; with it off, today's behavior holds.

- **A, Fit.** `boundsToFrame` with no ids measures the view, so Fit, the standard views, AI
  framing and the screenshot presets agree with `zoomToFit`.
- **B, Selection.** A filter change that hides selected nodes removes them from the selection in
  the same history step. Clearing or turning off the filter does not bring them back; undoing that
  step does (decision 17). The time window never drops ids. Selecting a hidden id through the API
  drops it (decision 60).
- **C, Top-N:** `within` (section 2). **D, Ghosts:** not in the view (section 1). **E:** the view
  is not a layer; every behavior is a consumer's value; all API here is additive.

## 6. Algorithms (agreed points 5 and 6)

- **Today** `ScopedInput` derives a subgraph per run; classes without `scopeInput = "subgraph"`
  compute over the whole graph and `maskBack` masks their values.
- **With the option on, a `"visible"` run takes the pinned view** without deriving again, and
  keeps it until it ends. Every class computes over it, `defineAlgorithm` and legacy plugins (a
  legacy graph built from the view) included. Results map back to original ids; hidden nodes get
  no value. A run is out of date once its view is not current (today's scope-digest staleness).
  With the option off, runs derive per run as today (decision 56).
- **GPU** runs and the GPU force driver get the view's compact snapshot; section 9 tests both.

## 7. Layouts (agreed point 7)

`LayoutManager` decides what every engine is given:

- **Simulations** (ngraph, d3, ForceAtlas2, custom live engines) and **third-party engines** get
  only the shown nodes and edges through `addNodes` and `addEdges`; hidden nodes exert no force and
  never move.
- **Snapshot layouts** (circle, grid, Graphviz, spectral and the rest) get the view's compact
  snapshot as `graph` and `stored`, `fixed` and `scope` in view rows; answers map back through the
  row map: one slot per shown node, no invalid rows for Graphviz.
- **Following the view.** A filter change, a window step, or an undo or redo of either re-runs the
  layout: nodes that left are removed, nodes that came back enter at their last positions, a
  simulation restarts, a one-pass layout runs again. A data edit does not re-lay out the graph: an
  added node is placed as today.
- **Named layout scopes.** `"graph"` lays out the whole graph even with the option on (it names
  the whole graph); every other named scope is intersected with the view.

## 8. Time window (agreed point 8)

Each slider step moves the masks and rebuilds the view; counts read it and the layout follows
(decision 33). Plan step 2 measures a 50,000-node rebuild; only if it exceeds 16 ms does the
view rebuild on a 200 ms pause instead, and the counts update then (decisions 13 and 14).

## 9. The honesty check (agreed point 10)

- **`graphty-element/test/contracts/working-graph-readers.test.ts`** finds every reader itself:
  the session's public API from the API reports, every catalog layout and algorithm. With the
  option on and a filter hiding a known node, a reader naming no scope answers as on the graph
  without it, and with its whole-graph word over the whole graph; a layout leaves the node
  unmoved and gives one slot per shown node; an algorithm gives it no value. An unclassified
  reader fails, as does any reader that fails the view.
- **`graphty-element/test/browser/working-graph-gpu.test.ts`** (the browser project, WebGPU as in
  `webgpu-layout.test.ts`) runs a GPU algorithm and the GPU force driver with a filter on: the
  hidden node gets no value and does not move.
- **`graphty-element/working-graph-whole-readers.json`** lists the readers that read the whole graph
  with no scope named, each naming its agreed case (section 4's Whole rows); `within` defaults and
  the `"graph"` layout scope are named, not listed. The test fails on a stale row.
  **`tools/check-working-graph.mjs`** (in `check:quick` and CI's Checks job) fails when the list
  gains a row against the merge base or a row is malformed. The list only shrinks.

## 10. Implementation plan

1. **The view**: node-safe `session/working/view.ts`, built from the store snapshot and the masks
   with `ScopedInput`'s `intermediateOf`, pinned per state, counting its builds. Plumb the option.
   Tests (each failing first): one build per state, shared, none on drawing options.
2. **Measure** a rebuild at 50,000 nodes in a `bench*` project; decide the pause rule (section 8).
3. **Runs** as section 6; restore visibility before runs on open; journal `"visible"`.
4. **Layouts**: `LayoutManager` as section 7; test every catalog layout; `waitForSettled()`; the
   GPU test (section 9).
5. **Framing and selection** (A, B): real-input tests, and the option off changes nothing.
6. **Session readers**: view defaults, the `scope` options, `within`, `visibility.draft`, export's
   view default; `npm run api:report`; cost-coverage classes; counted-work tests for draft.
7. **The honesty check**: the test, the whole-readers list, the script, the `check:quick` entry.
   It lands with no failing reader.
8. **App**: set `working-graph`; the filter editor on `FilterDraft` (section 3); `within:
"visible"`; the whole-graph word on readers labeled "Full graph" or "All"; the dock unchanged.
9. **The owner's path** (decision 36): nothing moves while editing; Circle and Grid place 49.
10. **Docs**: a guide page with the canonical example; the hold lines; the flip on #6124.

## 11. Decisions the owner has not seen

Each is the simplest choice consistent with the agreement and the main session's resolutions.

1. **Boolean `workingGraph`** (attribute `working-graph`, `session.workingGraph`), default `false`,
   not saved in the project file, not undoable.
2. **No `data.working()`, no new event**: `visibility:changed` and `project:derived` suffice.
3. **No new whole-graph word, no deprecation**: readers keep `"graph"` or `"all"`; scope-less
   readers gain `"graph" | "visible"`.
4. **The preview is an element API, `visibility.draft`** (`update`, `counts`, `commit`,
   `cancel`); the app holds no draft state.
5. **The element draws the preview**; the app stops using `styles.showBranches` with `hold`.
6. **Nodes the draft would bring back are counted, not drawn**, until commit.
7. **`hold` and `base: "full"` keep their meaning**, with a doc line.
8. **The layout re-runs on a filter or window change** or its undo, never on a data edit; filter
   changes animate.
9. **Framing after a filter re-layout** is today's auto-framing.
10. **Simulations drop hidden nodes**, not hold them inert.
11. **Layout scope `"graph"` lays out the whole graph** with the option on, so a saved `"graph"`
    scope moves hidden nodes; the app names none.
12. **Context nodes (`showContext`) are not in the view**: drawn, they sit faint at old positions
    beside a new layout, the two-layouts picture the owner called a mess. The app leaves it off.
13. **The pause rule** (section 8); playback steps rebuild as they land.
14. **During a drag, counts read the view**, on the pause under the pause rule.
15. **Every algorithm class computes over the view**, mask-back classes included; legacy plugins
    get a legacy graph built from it.
16. **A run keeps the view it started on** until it ends.
17. **Undo of a filter step restores the dropped selection ids**; clearing or turning off the
    filter does not. `zoomToNodes(ids)` frames the given ids in the view.
18. **`within` covers Top-N, percentile, the color domain and legend counts**; `styles.preview`
    bins read the view.
19. **A search allowed to find hidden items** is `find({ scope: "graph" })`; `excludedBy` marks
    hidden hits.
20. **The honesty check's shape** (section 9).
21. **The view is pinned outside the cache**, and is the store's snapshot when nothing is hidden.
22. **`filterEdges` runs only when needed.**
23. **The cache key is the store snapshot plus the mask versions.**
24. **Undo, redo and loading a sample are writers**; load notices and expand and collapse read
    the view.
25. **A re-run reads the current view**, not the first run's.
26. **Export with no scope reads the view**; export All reads the whole graph.
27. **On open, visibility is restored before runs in every mode** (a bug fix); runs journal
    `"visible"` only with the option on.
28. **Pins replay, source rows, "Largest component" and Save as set read the view.**
29. **Hops or touching from a hidden reference return 0 with a reason code.**
30. **A filter card's measure uses `within: "graph"`; Results fields offered to a filter read the
    whole graph.**
31. **The draft counts over the full graph but draws over what is shown.**
32. **Not readers**: XR picking, captureScreenshot, cytoscape-extensions, suggested styles, layers
    from a run's result, Why this look and state looks.
33. **Every time-window step re-lays out** with no animated transition.
34. **The default run scope's docs line gains "includes the time window".**
35. **Turning a filter off** shows hidden nodes where they were, then lays out with the transition.
36. **The owner's path is an acceptance script** in `graphty/acceptance/` (College football,
    Louvain groups 1, 4, 5, 7): Circle and Grid place 49 nodes.
37. **Group boxes, the map extent, curve supports, label declutter and the AI tools read the
    view**; an all-hidden group draws no box.
38. **`waitForSettled()` resolves after the re-layout a filter or window change starts.**
39. **`time.bins` reads the whole graph with no scope; its `"visible"` stays filter-only.**
40. **`visibility.draft(id)` opens a draft on an existing condition.**
41. **The preview's look is fixed** (card colors, today's faint look), no option yet.
42. **The draft's "of M" is the full graph, ignoring the time window.**
43. **`recommendLayout`, `selection.apply` (where or text) and `data.nodes` read the view.**
44. **Returning nodes enter at their last positions**; a simulation restarts from them.
45. **Layout estimates, refusals and the force driver choice use the view.**
46. **Autosave write and recovery and the recipe read the whole graph.**
47. **The selection drop is inside the filter change's history step.**
48. **The screenshot `fitToGraph` preset and AI framing frame the view.**
49. **Timeline 'keep' and 'rerun', run staleness and `clusterBy` read the view.**
50. **`within` takes `"graph" | "visible"`**, the scope options' words; only the name was approved.
51. **The draft's type is named `FilterDraft`.**
52. **Algorithm cost estimates, refusals and plan read the view**: one refused on the whole graph
    may run on a filtered one; so may a layout (45).
53. **The path form's From and To search reads the view**: a hidden node cannot be an endpoint.
54. **The "largest connected piece" suggestion reads the view.**
55. **The filter chip, time readout, "Nothing is drawn", multi-select summary, attribute
    inspector, table header hover, issue warnings and members chip read the view.**
56. **With the option off, runs keep deriving their own subgraph per run.**
57. **A replaced view is dropped once no run holds it.**
58. **Where the check lives and runs**: section 9's files, the script in `check:quick` and CI's
    Checks job.
59. **The time dock's track, extent and bins count as a filter's own conditions** (the window is a
    filter), so they read the whole graph.
60. **Selecting a hidden id through the API, with the option on, drops it**, as a filter step does:
    nothing hidden is ever selected.
61. **Opening a draft pauses a running simulation**, so nothing moves while editing; cancel
    resumes it, commit re-lays out.
