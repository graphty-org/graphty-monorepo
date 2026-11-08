# The working graph: one view of what is shown, read by every reader

Issue #6201. It builds the design the owner agreed on 2026-11-07 and nothing more; every choice
he has not seen is in the last section.

## 1. The model (agreed points 1 to 4)

- **The original graph is the only graph.** Edits, undo, history and the project file act on it;
  nothing copies it.
- **The working graph is a view**: the session's visible masks (filter plus time window), built
  with graph-format's `inducedSubgraph({ mask })`, then `filterEdges(mask)` when an edge filter
  hides more than the hidden nodes' edges: a compact graph plus a map from its rows back to the
  original's. graph-format needs nothing new.
- **Built once per state, cached, shared.** The state (the cache key) is the store's snapshot
  plus the masks' versions, so the view is rebuilt only on a filter change, a window step, a data
  edit, or an undo or redo of one; drawing options and style previews never move it. The session
  pins the current state's view, outside the byte-bounded derived-input cache, and never evicts
  it, so every reader of one state gets the same object. A view is dropped only once its state is
  replaced and no run still holds it. With nothing hidden it is the store's snapshot itself.
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
`"all"` (`data.statistics`, `time.bins`). A reader with no scope today gains
`scope?: "graph" | "visible"`: `data.structureValue`, `selection.statistics`, `data.attributes`,
`valueCounts`, `histogram`, `issues`, `styles.groups`, `styles.categories`, `styles.counts`,
`styles.agreement`, `styles.preview`, the `neighborsOf`, `layer` and `invert` targets, and
`catalog.optionsFor`.

**Top-N and percentile rules (decision C).** The threshold leaf gains
`within?: "graph" | "visible"`, default `"graph"`. The graphty app writes `within: "visible"`.

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

- **While editing, nothing moves.** The edits are a draft held by the app; `FilterSelection.tsx`
  stops writing the condition on each tick. The preview is `styles.showBranches` over the draft
  rule with `base: "visible"` and no `hold`: draft members in their card colors, shown nodes the
  draft would remove faint, all in the current layout.
- **The counts read the full graph** ("49 of 115"), as a filter's own conditions; nodes the draft
  would bring back are counted but not drawn until Done (decision 33).
- **Done is the filter change**: one `addCondition` or `updateCondition`, one history step. The
  masks move, the view is rebuilt, the layout runs once over it with the animated transition, and
  the existing auto-framing frames what is shown. **Cancel writes nothing.**

So no layout runs under the preview, Done is an ordinary change the layout follows, and no
layout reads a hidden node (section 7).

Turning a filter off is a filter change (decision 38). `hold` and `base: "full"` docs gain one
line: with `workingGraph` on, a hidden node sits where the last layout that held it left it.

## 4. Every reader from the audit

**View** means it reads the view when it names no scope (option on). **Whole** means it reads the
original, and is one of the agreement's named cases unless decision 24 says otherwise.

- **Algorithms, View:** built-in and GPU runs, cost estimate, refusals and plan; the "largest
  connected piece" suggestion; defineAlgorithm runs and legacy plugins; timeline 'keep' and
  'rerun'; run staleness; the path form's From and To search; `catalog.optionsFor`; AI
  runAlgorithm; Inspector Rerun and "Update X layer" (a re-run reads the current view, decision 25).
- **Algorithms, Whole:** a filter card's own measure (`within: "graph"`); Results fields offered to
  a filter (both a filter's own conditions).
- **Layout and camera, View:** every layout and engine (Graphviz, third-party, custom); a node
  added after a filter, an edge filter, time-window re-layout, scoped layouts (section 7); estimate
  and refusals, force driver choice, clusterBy; group boxes, location-map extent, curved-edge
  support points; Fit, standard views, `applyCameraView` with no scope, zoomToFit, auto-framing
  (decision A); Frame selection and `zoomToNodes(ids)` (the given nodes that are in the view); AI
  zoomToNodes; the screenshot `fitToGraph` preset; pins replay (only shown pinned nodes).
- **Styling, View:** the Which head "N of M"; `styles.categories`, `styles.groups` counts and
  "Select these N"; legend category rows, painted count and category cap; the property row "on N"
  and "Matched nodes"; `styles.agreement`; `styles.preview` bins; the automatic color domain; label
  declutter and counts.
- **Styling, Whole:** Top-N and percentile ranking by default (decision C).
- **Data views, View:** matches strip Degree; find box rows and counts; node inspector Degree and
  neighbors; multi-select summary; attribute inspector; table header hover, issue warnings and
  members chip; time dock bar labels; layer Values histogram; card Top-N bound and dates; "Nothing
  is drawn"; filter chip and time readout; table rows on Shown; source rows.
- **Data views, Whole:** the Overview's "Full graph" section; table rows on All and Export All; data
  filter cards; a selection card on the full graph; find hits when hidden items are allowed.
- **Selection and sets, View:** Select all; Neighborhood (G); "Select what it paints"; Covered by;
  "Select N" on filter cards, source rows, style groups and bindings; invert; the reference picker
  and "Selected (N)"; hops or touching from a hidden reference (0, with a reason code); number card
  ranges and bars; category checklists on a visible base; "Largest component" select; Save as set
  (freezes the selection, which holds only shown nodes); the selection itself (decision B).
- **Selection and sets, Whole:** filters built on filters (each card is a filter's own condition);
  the base labeled "Full graph".
- **Project file, AI, export and API, View:** AI queryGraph counts, schema prompt facts and
  findNodes; the defaults of `data.statistics`, `data.nodes`, `valueCounts`, `histogram`,
  `nodePage`, `find`, `neighbors`, `recommendLayout`, `selection.apply` (where or text),
  `time.bins`; export with no scope (decision 26).
- **Project file, AI, export and API, Whole:** the project file, autosave write and recovery, the
  recipe; export All; load notices, expand and collapse, samples, undo and redo (decision 24).
- **On open**, visibility is restored before any run computes, so a run on open reads the view
  (decision 27). Journaling a run records `"visible"`, not a resolved mask, so it re-reads the
  current view.
- **Not readers** (they name or paint, or read what is drawn): run names, Runs "Show", legend
  out-of-date names, the "Add X layer" label, and the items of decision 34.

## 5. Owner decisions A to E

Each applies only with the option on; with it off, today's behavior holds.

- **A, Fit.** `boundsToFrame` with no ids measures the view, so Fit, the standard views, AI
  framing and the screenshot presets agree with `zoomToFit`.
- **B, Selection.** A filter change that hides selected nodes removes them from the selection in
  the same history step: undoing the filter brings them back, clearing it later does not. The time
  window never drops ids.
- **C, Top-N:** threshold `within` (section 2). **D, Ghosts:** not in the view (section 1). **E:**
  the view is not a layer; every behavior is a consumer's value; all API here is additive.

## 6. Algorithms (agreed points 5 and 6)

- **Today** each run resolves its scope to bitmaps and `ScopedInput` derives a subgraph through the
  derived-input cache; classes without `scopeInput = "subgraph"` compute over the whole graph and
  `maskBack` masks their values.
- **With the option on, a `"visible"` run takes the pinned view** without deriving again, and
  keeps that view until it ends. Every class computes over it, `defineAlgorithm` and legacy plugins (a
  legacy graph built from the view) included. Results map back to original ids; hidden nodes get
  no value. A run is out of date once its view is not current (today's scope-digest staleness).
- **GPU** runs and the GPU force driver receive the view's compact snapshot; a test proves the
  device sees the compact node count.

## 7. Layouts (agreed point 7)

`LayoutManager` decides what every engine is given:

- **Simulations** (ngraph, d3, ForceAtlas2, custom live engines) and **third-party engines** get
  only the shown nodes and edges through `addNodes` and `addEdges`; hidden nodes exert no force and
  never move.
- **Snapshot layouts** (circle, grid, Graphviz, spectral and the rest) get the view's compact
  snapshot as `graph` and `stored`, `fixed` and `scope` in view rows, and answers map back through
  the row map: one slot per shown node, no invalid rows for Graphviz.
- **Following the view.** On a view change, nodes that left are removed, nodes that came back enter
  at their last positions, a simulation restarts, a one-pass layout runs again; filter changes and
  undo animate with the existing transition.
- **A named layout scope** is intersected with the view, so a carried or saved `"graph"` scope
  cannot lay out a hidden node.

## 8. Time window (agreed point 8)

Each window step moves the masks, so the view is rebuilt and the layout follows (decision 36).
Plan step 2 measures a 50,000-node rebuild; the pause rule and drag behavior are decisions 13
and 14.

## 9. The honesty check (agreed point 10)

- **`graphty-element/test/contracts/working-graph-readers.test.ts`** finds every reader itself: the
  session's public API from the API reports, every catalog layout and algorithm. With the option on
  and a filter hiding a known node, a reader naming no scope answers as on the graph without it,
  and with its whole-graph word over the whole graph; a layout leaves the node unmoved and gives
  the shown nodes their count of slots; an algorithm gives it no value. A reader it cannot classify
  fails, and so does any reader that fails the view: there is no list of failing readers.
- **`graphty-element/working-graph-whole-readers.json`** lists the readers that read the whole graph
  with no scope named, each naming the agreed case it belongs to (section 4's Whole rows). The test
  fails on a stale row. **`tools/check-working-graph.mjs`** (in `check:quick` and CI's Checks job)
  fails when the list gains a row against the merge base or a row is malformed. The list only
  shrinks, with no trailer escape; a new reader that must read everything takes a scope.

## 10. Implementation plan

1. **The view**: node-safe `session/working/view.ts`, built from the store snapshot and the masks
   with `ScopedInput`'s `intermediateOf`, pinned per state, counting its builds. Plumb the option.
   Tests, each failing first: one build per state, also under derived-input cache pressure; one
   object for every reader of a state; a rebuild on a filter change, a window step, an edit and an
   undo; none on drawing options.
2. **Measure** a rebuild at 50,000 nodes in a `bench*` project; decide the pause rule (section 8).
3. **Runs**: `"visible"` runs take the view; all classes over it; legacy graph from the view; the
   GPU test; restore visibility before runs on open; journal `"visible"`.
4. **Layouts**: `LayoutManager` as section 7; test every catalog layout.
5. **Framing and selection** (A and B), real-input tests (keys F and Fit, a filter hiding a
   selected node, the same with the option off changing nothing).
6. **Session readers**: view defaults, the `scope` options, threshold `within`, export's view
   default. `npm run api:report`; cost-coverage classification.
7. **The honesty check**: the test, the whole-readers list, the script, the `check:quick` entry.
   It lands with no failing reader.
8. **App**: set `working-graph`; the filter editor as a draft (section 3); `within: "visible"` on
   threshold rules; the whole-graph word on readers labeled "Full graph" or "All".
9. **The owner's path** (decision 39), checking screenshots and positions: nothing moves while
   ticking; only current-layout nodes drawn; Done moves the shown nodes and no hidden node; Circle
   and Grid place 49 nodes; reopening draws no hidden node; clearing ends in one layout.
10. **Docs**: a guide page with the canonical example, the hold and `base: "full"` lines, and the
    default flip recorded on #6124.

## 11. Decisions the owner has not seen

Each is the simplest choice consistent with the agreement.

1. **The option is a boolean `workingGraph`** (attribute `working-graph`, `session.workingGraph`),
   default `false`, not saved in the project file and not undoable: the consumer's choice.
2. **No `data.working()` accessor and no new event**: `visibility:changed` and `project:derived`
   already report every view change.
3. **No new whole-graph word, no deprecation.** Readers keep `"graph"` or `"all"`; readers without a
   scope gain `"graph" | "visible"` (the list in section 2). Settling the two words is breaking.
4. **The filter editor is a draft** (section 3): nothing written until Done; Done is one history
   step; Cancel writes nothing.
5. **The preview** is `styles.showBranches` over the draft, `base: "visible"`, no `hold`.
6. **Nodes the draft would bring back are counted, not drawn**, until Done.
7. **`hold` and `base: "full"` keep their meaning** with a doc line; the app stops using them.
8. **The layout follows every view change** (filter, window step, edit, undo, redo); filter changes
   and undo animate with the existing transition.
9. **Framing after a filter re-layout** is the existing auto-framing.
10. **Simulations drop hidden nodes** rather than holding them inert in the original rows.
11. **A named layout scope is intersected with the view**; no whole-graph layout under the option.
12. **Context nodes (`showContext`) are not in the view**; drawn, they sit faint at their last
    positions, so a consumer who turns them on sees old positions beside a new layout.
13. **The pause rule** applies only if a 50,000-node rebuild exceeds 16 ms; a pause is 200 ms
    without movement; playback steps rebuild as they land.
14. **During a drag, drawing and live counts answer from the masks**, not the view.
15. **Every algorithm class computes over the view**, including those that today compute over the
    whole graph and mask back; legacy plugins get a legacy graph built from the view.
16. **A run keeps the view it started on** until it ends, even if the state is replaced.
17. **Dropped selection ids are in the filter's history step**, so undo restores them; the drop
    happens only with the option on; Frame selection and `zoomToNodes(ids)` frame the given nodes
    in the view.
18. **Threshold `within` takes `"graph" | "visible"`, default `"graph"`.** The automatic color
    domain, the legend's painted count and category cap and `styles.preview` bins read the view.
19. **A search allowed to find hidden items** is `find({ scope: "graph" })`, whose existing
    `excludedBy` flag marks the hidden hits.
20. **The honesty check**: readers found from the API reports and catalogs; an unclassifiable or
    failing reader fails; a whole-graph reader list tied to agreed cases, failing on a stale row
    and only shrinking; `tools/check-working-graph.mjs` in `check:quick` and CI's Checks job; no
    trailer escape.
21. **The session pins the current view outside the derived-input cache** and never evicts it; a
    replaced view is dropped once no run holds it; with nothing hidden it is the store's snapshot.
22. **`filterEdges` runs only when an edge filter hides more than the hidden nodes' edges.**
23. **The view is rebuilt on undo or redo** of a filter or data change, like the change itself.
24. **Whole-graph readers the agreement does not name**: load notices, expand and collapse,
    samples, and undo and redo.
25. **A re-run (Inspector Rerun, "Update X layer", timeline rerun) reads the current view**, not the
    view of the first run.
26. **Export with no scope reads the view** under the option; export All reads the whole graph.
27. **On open, visibility is restored before any run computes**, and a run's journal records
    `"visible"` rather than a resolved mask.
28. **Pins replay, source rows, "Largest component" and Save as set read the view** (Save as set
    freezes the selection, which holds only shown nodes).
29. **Hops or touching from a hidden reference return 0 with a reason code.**
30. **A filter card's own measure uses `within: "graph"`, and Results fields offered to a filter read
    the whole graph**, as a filter's own conditions.
31. **Snapshot layouts get the view's compact snapshot** with `stored`, `fixed` and `scope` in view
    rows (section 7); returning nodes re-enter at their last positions.
32. **The canonical example's shapes**: `visibility.addCondition` with effect `"keep"` and a
    categories rule, `data.statistics({ scope: "all" })`, `applyCameraView("fitToGraph")`.
33. **The editor's counts and picture use different bases**: "49 of 115" reads the full graph, the
    preview draws over `base: "visible"`, so returning nodes are counted but never drawn.
34. **Not readers** (section 4): XR picking, captureScreenshot, cytoscape-extensions, suggested
    styles, layers from a run's result, Why this look and state looks are outside the view and the
    honesty check.
35. **The cache key is the store snapshot plus the mask versions**; drawing options and style
    previews never rebuild the view.
36. **Every time-window step re-runs the layout** (point 7 promised it only on a filter change);
    window steps get no animated transition.
37. **The default run scope's docs line gains "includes the time window".**
38. **Turning a filter off** shows the hidden nodes where they were first, then lays out the whole
    shown set with the transition.
39. **The owner's path becomes an acceptance script** in `graphty/acceptance/` (College football,
    Louvain groups 1, 4, 5, 7) asserting Circle and Grid place 49 nodes.
