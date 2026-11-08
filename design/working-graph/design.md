# The working graph: one view of what is shown, read by every reader

Issue #6201. It builds the design the owner agreed on 2026-11-07 and nothing more; every choice
he has not seen is in the last section.

## 1. The model (agreed points 1 to 4)

- **The original graph is the only graph.** Edits, undo, history, loading a sample and the
  project file act on it; nothing copies it. These are writers, not readers of the view.
- **The working graph is a view**: the session's visible masks (filter plus time window), built
  with graph-format's `inducedSubgraph({ mask })`, then `filterEdges(mask)` when an edge filter
  hides more than the hidden nodes' edges: a compact graph plus a map from its rows back to the
  original's. graph-format needs nothing new.
- **Built once per state, cached, shared.** The state (the cache key) is the store's snapshot
  plus the masks' versions, so the view is rebuilt only on a filter change, a window step, a data
  edit, or an undo or redo of one; drawing options and style previews never move it. The session
  pins the current state's view outside the byte-bounded derived-input cache, so every reader of
  one state gets the same object. A replaced view is dropped once no run holds it. With nothing
  hidden it is the store's snapshot itself.
- **Hidden nodes keep everything**: positions, styles, run results and notes stay keyed by
  original ids, so nothing syncs when a filter clears. The selection is the exception (decision B).
- **Ghosts** (outside the time window) are not in the view: they take no part in a layout and keep
  their last positions (decision D).

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

**`within?: "graph" | "visible"`, default `"graph"` (decision C and resolution 4)** on the
threshold leaf (Top-N, percentile), on a color binding's automatic domain, and on the legend's
counts (painted count, category cap). The graphty app sets `"visible"` on all three.

**The time window's own readers.** `time.bins` is the window's own condition, so with no
scope it reads the whole graph in every mode, and its `"visible"` scope keeps today's meaning,
the filter without the window: the dock's track and extent never shrink to the window
(decision 41).

**The filter draft.** `visibility.draft(condition)`, or `draft(id)` on an existing condition
(decision 42), returns a `FilterDraft` with `update(rule)`, `counts()`, `commit()` and `cancel()`;
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
  `update` per edit; it holds no draft rule. The element draws the preview in the current layout:
  draft members in their card colors, shown nodes the draft would remove faint, returning nodes
  not drawn (decision 43).
- **The counts** come from `draft.counts()` over the full graph, time window ignored ("49 of
  115"), as a filter's own conditions (decision 44).
- **Done is `commit()`**, one history step: the masks move, the view is rebuilt, the layout runs
  once over it with the animated transition, and the existing auto-framing frames what is shown.
  **Cancel is `cancel()`** and writes nothing.

Turning a filter off is a filter change (decision 37). The `hold` and `base: "full"` docs gain
one line: a hidden node sits where the last layout that held it left it.

## 4. Every reader from the audit

**View** means it reads the view when it names no scope (option on). **Whole** means it reads the
original and is one of the agreement's named cases: a filter's own conditions, "Full graph" or
"All", export All, the project file, a search allowed to find hidden items.

- **Algorithms, View:** built-in and GPU runs, cost estimate, refusals and plan; the "largest
  connected piece" suggestion; defineAlgorithm runs and legacy plugins; timeline 'keep' and
  'rerun'; run staleness; the path form's From and To search; `catalog.optionsFor`; AI
  runAlgorithm; Inspector Rerun and "Update X layer" (decision 25).
- **Algorithms, Whole:** a filter card's own measure; Results fields offered to a filter.
- **Layout and camera, View:** every layout and engine (Graphviz, third-party, custom); edge
  filters, time-window re-layout, scoped layouts (section 7); estimate and refusals, force driver
  choice, clusterBy; group boxes (a group whose members are all hidden draws no box), location-map
  extent, curved-edge support points; Fit, standard views, `applyCameraView` with no scope,
  zoomToFit, auto-framing (decision A); Frame selection and `zoomToNodes(ids)` (the given nodes in
  the view); AI zoomToNodes; the screenshot `fitToGraph` preset; pins replay.
- **Styling, View:** the Which head "N of M"; `styles.categories`, `styles.groups` counts and
  "Select these N"; legend category rows; the property row "on N" and "Matched nodes";
  `styles.agreement`; `styles.preview` bins; label declutter and its counts.
- **Styling, Whole by default, `within` sets the view:** Top-N and percentile ranking, the
  automatic color domain, the legend's painted count and category cap.
- **Data views, View:** matches strip Degree; find box rows and counts; node inspector Degree and
  neighbors; multi-select summary; attribute inspector; table header hover, issue warnings and
  members chip; layer Values histogram; a selection card's Top-N bound and dates; "Nothing
  is drawn"; filter chip and time readout; table rows on Shown; source rows; load notices
  (counts); expand and collapse (neighbor lookups).
- **Data views, Whole:** the Overview's "Full graph" section; table rows on All and Export All; data
  filter cards, their Top-N bounds and dates; a selection card on the full graph; find hits when
  hidden items are allowed; the time dock's track, extent and bins (`time.bins`).
- **Selection and sets, View:** Select all; Neighborhood (G); "Select what it paints"; Covered by;
  "Select N" on filter cards, source rows, style groups and bindings; invert; the reference picker
  and "Selected (N)"; hops or touching from a hidden reference (decision 29); number card ranges
  and bars; category checklists on a visible base; "Largest component" select; Save as set; the
  selection itself (decision B).
- **Selection and sets, Whole:** filters built on filters; the base labeled "Full graph".
- **AI, export and API, View:** AI queryGraph counts, schema prompt facts and findNodes; the
  defaults of `data.statistics`, `data.nodes`, `valueCounts`, `histogram`, `nodePage`, `find`,
  `neighbors`, `recommendLayout`, `selection.apply` (where or text) (decision 45); export with
  no scope (decision 26).
- **Project file and export, Whole:** the project file, autosave write and recovery, the recipe;
  export All.
- **On open**, visibility is restored before any run computes, in every mode (a bug fix). With the
  option on, a run's journal records `"visible"`, not a resolved mask (decision 27).
- **Not readers**: run names, Runs "Show", legend out-of-date names, the "Add X layer" label,
  and decision 34's items.

## 5. Owner decisions A to E

Each applies only with the option on; with it off, today's behavior holds.

- **A, Fit.** `boundsToFrame` with no ids measures the view, so Fit, the standard views, AI
  framing and the screenshot presets agree with `zoomToFit`.
- **B, Selection.** A filter change that hides selected nodes removes them from the selection in
  the same history step. Clearing or turning off the filter does not bring them back; undoing that
  step does, because undo reverses the whole step (decision 17). The time window never drops ids.
- **C, Top-N:** `within` (section 2). **D, Ghosts:** not in the view (section 1). **E:** the view
  is not a layer; every behavior is a consumer's value; all API here is additive.

## 6. Algorithms (agreed points 5 and 6)

- **Today** `ScopedInput` derives a subgraph per run; classes without `scopeInput = "subgraph"`
  compute over the whole graph and `maskBack` masks their values.
- **With the option on, a `"visible"` run takes the pinned view** without deriving again, and
  keeps it until it ends. Every class computes over it, `defineAlgorithm` and legacy plugins (a
  legacy graph built from the view) included. Results map back to original ids; hidden nodes get
  no value. A run is out of date once its view is not current (today's scope-digest staleness).
- **GPU** runs and the GPU force driver get the view's compact snapshot.

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
(decision 35). Plan step 2 measures a 50,000-node rebuild; only if it exceeds 16 ms does the
view rebuild on a 200 ms pause instead, and the counts update then (decisions 13 and 14).

## 9. The honesty check (agreed point 10)

- **`graphty-element/test/contracts/working-graph-readers.test.ts`** finds every reader itself: the
  session's public API from the API reports, every catalog layout and algorithm. With the option on
  and a filter hiding a known node, a reader naming no scope answers as on the graph without it,
  and with its whole-graph word over the whole graph; a layout leaves the node unmoved and gives
  the shown nodes their count of slots; an algorithm gives it no value. A reader it cannot classify
  fails, and so does any reader that fails the view: there is no list of failing readers.
- **`graphty-element/working-graph-whole-readers.json`** lists the readers that read the whole graph
  with no scope named, each naming its agreed case (section 4's Whole rows, `time.bins` included); `within` defaults and
  the `"graph"` layout scope are named, not listed. The test fails on a stale row.
  **`tools/check-working-graph.mjs`** (in `check:quick` and CI's Checks job) fails when the list
  gains a row against the merge base or a row is malformed. The list only shrinks.

## 10. Implementation plan

1. **The view**: node-safe `session/working/view.ts`, built from the store snapshot and the masks
   with `ScopedInput`'s `intermediateOf`, pinned per state, counting its builds. Plumb the option.
   Tests (each failing first): one build per state, shared, none on drawing options.
2. **Measure** a rebuild at 50,000 nodes in a `bench*` project; decide the pause rule (section 8).
3. **Runs** as section 6; restore visibility before runs on open; journal `"visible"`.
4. **Layouts**: `LayoutManager` as section 7; test every catalog layout; `waitForSettled()`.
5. **Framing and selection** (A, B): real-input tests, and the option off changes nothing.
6. **Session readers**: view defaults, the `scope` options, `within`, `visibility.draft`, export's
   view default. `npm run api:report`; cost-coverage classification; counted-work tests for draft.
7. **The honesty check**: the test, the whole-readers list, the script, the `check:quick` entry.
   It lands with no failing reader.
8. **App**: set `working-graph`; the filter editor on `FilterDraft` (section 3); `within:
"visible"`; the whole-graph word on readers labeled "Full graph" or "All"; the dock unchanged.
9. **The owner's path** (decision 38): nothing moves while editing; Circle and Grid place 49.
10. **Docs**: a guide page with the canonical example; the hold lines; the flip on #6124.

## 11. Decisions the owner has not seen

Each is the simplest choice consistent with the agreement and the main session's resolutions.

1. **The option is a boolean `workingGraph`** (attribute `working-graph`, `session.workingGraph`),
   default `false`, not saved in the project file and not undoable.
2. **No `data.working()` and no new event**: `visibility:changed` and `project:derived` suffice.
3. **No new whole-graph word, no deprecation.** Readers keep `"graph"` or `"all"`; readers without a
   scope gain `"graph" | "visible"` (section 2). Settling the two words is breaking.
4. **The filter preview is an element API, `visibility.draft`** (`update`, `counts`, `commit`,
   `cancel`): commit is one history step, cancel writes nothing; the app holds no draft state.
5. **The element draws the draft preview** in the current layout; the app no longer uses
   `styles.showBranches` with `hold` for it.
6. **Nodes the draft would bring back are counted, not drawn**, until commit.
7. **`hold` and `base: "full"` keep their meaning** with a doc line; the app stops using them.
8. **The layout re-runs on a filter or window change** or its undo, never on a data edit; filter
   changes animate.
9. **Framing after a filter re-layout** is today's auto-framing.
10. **Simulations drop hidden nodes**, not hold them inert.
11. **Layout scope `"graph"` lays out the whole graph even with the option on**; other named scopes
    are intersected with the view. A saved `"graph"` scope therefore moves hidden nodes; the app
    names none.
12. **Context nodes (`showContext`) are not in the view**; drawn, they sit faint at old positions
    beside a new layout: two layouts on one canvas, the picture the owner called a mess. The
    app leaves `showContext` off; the owner should see this.
13. **The pause rule** (section 8); playback steps rebuild as they land.
14. **During a drag, counts read the view**, updating on the pause under the pause rule.
15. **Every algorithm class computes over the view**, including today's mask-back classes; legacy
    plugins get a legacy graph built from the view.
16. **A run keeps the view it started on** until it ends.
17. **Undo of a filter step restores the dropped selection ids**; clearing or turning off the
    filter does not. Frame selection and `zoomToNodes(ids)` frame the given nodes in the view.
18. **`within` covers Top-N, percentile, the color domain and the legend's counts**; the app
    sets `"visible"`. `styles.preview` bins read the view.
19. **A search allowed to find hidden items** is `find({ scope: "graph" })`; `excludedBy` marks
    hidden hits.
20. **The honesty check's shape** (section 9). 31, 32: section 7's inputs, section 2's example.
21. **The view is pinned outside the cache** and is the store's snapshot when nothing is hidden.
22. **`filterEdges` runs only when needed** (section 1).
23. **The cache key is the store snapshot plus the mask versions.**
24. **Undo, redo and loading a sample are writers**; load notices and expand and collapse read
    the view.
25. **A re-run reads the current view**, not the first run's.
26. **Export with no scope reads the view** under the option; export All reads the whole graph.
27. **On open, visibility is restored before runs, in every mode** (a bug fix); runs journal
    `"visible"` only with the option on.
28. **Pins replay, source rows, "Largest component" and Save as set read the view.**
29. **Hops or touching from a hidden reference return 0 with a reason code.**
30. **A filter card's own measure uses `within: "graph"`, and Results fields offered to a filter read
    the whole graph**, as a filter's own conditions.
31. **The draft counts over the full graph but draws over what is shown.**
32. **Not readers**: XR picking, captureScreenshot, cytoscape-extensions, suggested styles, layers
    from a run's result, Why this look and state looks stay outside the view and the check.
33. **Every time-window step re-runs the layout** with no animated transition.
34. **The default run scope's docs line gains "includes the time window".**
35. **Turning a filter off** shows hidden nodes where they were, then lays out with the transition.
36. **The owner's path becomes an acceptance script** in `graphty/acceptance/` (College football,
    Louvain groups 1, 4, 5, 7) asserting Circle and Grid place 49 nodes.
37. **Group boxes, the map extent, curve supports, label declutter and the AI tools read the
    view**; an all-hidden group draws no box.
38. **`waitForSettled()` resolves after the re-layout a filter or window change starts.**
39. **`time.bins` reads the whole graph with no scope, and `"visible"` stays filter-only**, so the
    time window never reads its own output; the dock is unchanged.
40. **`visibility.draft(id)` opens a draft on an existing condition.**
41. **The preview's look is fixed**: card colors and today's faint look, no new option (one can be
    added later, additively).
42. **The draft's "of M" is the full graph and ignores an active time window.**
43. **`recommendLayout`, `selection.apply` (where or text) and `data.nodes` read the view.**
44. **Returning nodes enter at their last positions** and a simulation restarts from them.
45. **Layout estimates, refusals and the force driver choice use the view**, so a layout refused on
    the whole graph may run on a filtered one.
46. **Autosave write and recovery and the recipe read the whole graph**, as the project file.
47. **The selection drop is inside the filter change's own history step.**
48. **The screenshot `fitToGraph` preset and AI framing frame the view.**
49. **Timeline 'keep' and 'rerun', run staleness and `clusterBy` read the view.**
