# The working graph: one view of what is shown, read by every reader

Issue #6201. The binding agreement is quoted in the owner's words in the "Agreed points" of the
working-graph agreement (2026-11-07). This document builds that agreement and nothing beyond it;
every choice it had to make on its own is listed in the last section.

## 1. The problem

When a Data filter or the time window hides part of a graph, 71 of 129 operations in
graphty-element and the graphty app read a different set of nodes than the one on the canvas: a
layout spreads the graph over room kept for hidden nodes, Fit frames empty space, the Style tab
says "6 of 4 nodes". The owner chose one fix for the whole class instead of 71 small ones: one
working graph that every reader uses by default.

## 2. The model (agreed points 1 to 4)

- **The original graph is the only graph.** Edits, undo, history and the project file act on it.
  Nothing copies it.
- **The working graph is a view of it**: the nodes and edges the filter and the time window leave
  shown, which are exactly the session's visible masks. It is built with graph-format's
  `inducedSubgraph({ mask })` on the visible node mask, then `filterEdges(mask)` when an edge
  filter hides more than the hidden nodes' edges. The result is a compact graph plus a map from
  each of its rows back to the original's rows. graph-format needs nothing new.
- **Built once per state, cached, shared.** The state is the store's snapshot plus the versions of
  the visible node and edge masks. The view is rebuilt only when one of them moves: a filter
  change, a time-window step, a data edit, or an undo or redo of one of these. Drawing options
  (labels, ghost drawing, context drawing, a style preview) never move it. The view is held as one
  entry of the existing derived-input cache (`algorithms/input/derivedInputs.ts`). The cache is
  bounded by bytes, so undo then redo usually finds the earlier view still there. When nothing is
  hidden, the view is the store's snapshot itself, with no derivation.
- **Hidden nodes keep everything.** Positions, styles, run results and notes stay keyed by
  original ids in the original's storage. The view holds only structure, so nothing syncs when a
  filter clears. The selection is the exception (owner decision B, section 6).
- **Ghosts.** A node outside the time window is not visible, so it is not in the view. It takes
  no part in a layout and keeps its last position (owner decision D).

## 3. The public API

All of it is additive. With the option off, every reader keeps today's behavior.

**The option.** One boolean session option, `workingGraph`, default `false`.

- Element: the `workingGraph` property and the `working-graph` boolean attribute.
- Headless session: `createGraphSession({ workingGraph: true })`.
- Read it back as `session.workingGraph`.

With it on, every reader that names no scope reads the working graph. The graphty app turns it
on. The default flips to `true` in the next major (#6124).

**Reading the whole graph by name.** Every reader that reads nodes or edges takes a scope. Each
keeps its existing whole-graph word: `"graph"` (`data.nodePage`, `find`, `neighbors`, union
leaves) or `"all"` (`data.statistics`, `time.bins`). A reader with no scope option today gains an
optional `scope?: "graph" | "visible"`; the list is in section 5.

**Top-N and percentile rules (owner decision C).** The threshold leaf gains
`within?: "graph" | "visible"`, default `"graph"`, so ranking keeps the whole column unless the
consumer asks. The graphty app writes `within: "visible"` on its style rules.

**The canonical example** (names no internal concept):

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
reads its graph through `input()`, which hands it the view (section 7).

## 4. The filter editor in the selection workspace, and Done

The owner's report on the first build, and why each part happened:

- "It keeps the transparent old nodes and lays out the new ones over the top." Each tick in the
  editor was a real recorded filter change, so the layout followed every tick. The removed nodes
  were drawn faint (the editor's `hold`) at their old positions.
- "When I click Done it doesn't apply the layout." The layout had already followed the last tick.
  Done only let go of the hold, which counted as no change.
- "Subsequent layouts seem to be using invisible nodes." Every view that draws hidden nodes drew
  them at stale positions from another layout: the editor preview, and the reopened editor, which
  drew the full graph.

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

Why this cannot repeat the bugs:

- Bug 1: the working graph cannot change while editing, so no layout runs under the preview, and
  only nodes in the current layout are drawn.
- Bug 2: Done is the only write, so it is a real filter change, and the layout follows it through
  the same path as any other filter change. There is no separate settle signal to get wrong.
- Bug 3: section 8 gives a layout no way to read a hidden node. The reopened editor draws over
  `base: "visible"`, so it draws no hidden node at a stale position.

**Other views that draw hidden nodes.**

- **Time-window ghosts** keep their last positions while the shown graph lays out alone, by owner
  decision D.
- **Turning a filter off** is a filter change. Hidden nodes reappear where they were (point 4),
  and the layout then lays out everything with the transition, so the final picture is one
  layout.
- **`hold` and `base: "full"`** keep their documented meaning for other consumers. Their docs gain
  one line: with `workingGraph` on, a hidden node sits where the last layout that held it left it.

## 5. Every reader from the audit

**View** means it reads the working graph when it names no scope (option on). **Whole** means it
reads the original by name. **Neither** means the row is about something other than which graph is
read (naming, painting, rerun plumbing), so this design leaves it to its own issue.

- **Algorithms, View:**
    - built-in runs, GPU runs, the cost estimate, refusals and the plan
    - the "largest connected piece" suggestion (the largest piece of the view)
    - defineAlgorithm runs and legacy plugins
    - timeline 'keep' and 'rerun' (a view change marks a run out of date, as a scope change does
      today)
    - run staleness
    - the path form's From and To search
    - `catalog.optionsFor` for layouts
    - AI runAlgorithm
- **Algorithms, Whole by name:** a filter card's own measure (`within: "graph"`) and the Results
  fields offered to a filter.
- **Algorithms, Neither:** "Update X layer", run names, Inspector Rerun, Runs "Show", legend
  out-of-date names, the "Add X layer" label, suggested styles, cytoscape-extensions, and the
  docs line on the default run scope (gains "includes the time window").
- **Layout and camera, View:**
    - every layout and every engine, including Graphviz, third-party and custom engines
    - a node added after a filter, an edge filter, time-window re-layout, and scoped layouts
      (section 8)
    - the estimate and refusals, the force driver choice, and clusterBy
    - group boxes, the location-map extent, and curved-edge support points
    - Fit, the standard views, `applyCameraView` with no scope, zoomToFit and auto-framing (owner
      decision A)
    - Frame selection: the selected nodes that are in the view
    - AI zoomToNodes with no ids, and the screenshot `fitToGraph` preset
- **Layout and camera, Whole:** `zoomToNodes(ids)` with ids given (a lookup by id, not a reader)
  and the pins replay.
- **Styling, View:**
    - the Which head "N of M"
    - `styles.categories`, `styles.groups` counts and "Select these N"
    - legend category rows
    - the property row "on N" and the inspector's "Matched nodes"
    - `styles.agreement`
    - label declutter and label counts
- **Styling, Whole:**
    - Top-N and percentile rules by default; the app passes `within: "visible"` (owner decision C)
    - the automatic color domain, which stays the whole column, unchanged
    - `styles.preview` bins (documented)
    - the legend's painted count and category cap
- **Styling, Neither:** layers from a run's result, Why this look, state looks, the workspace
  preview (section 4).
- **Data views, View:**
    - the matches strip Degree, the find box value rows and counts
    - the node inspector Degree and neighbor list, and the multi-select summary
    - the attribute inspector, table header hover and issue warnings, the table members chip
    - the time dock bar labels, the layer Values histogram, and the card Top-N bound and dates
    - "Nothing is drawn", the filter chip and time readout
    - table rows on Shown
- **Data views, Whole by name:**
    - the Overview's "Full graph" section, table rows on All, and table Export All
    - data filter cards, and the selection card base when it is the full graph
    - the export dialog's All, and source rows
    - find hits when the reader allows hidden items (`scope: "graph"`, with the existing
      `excludedBy` flag)
- **Selection and sets, View:**
    - Select all, Neighborhood (G), "Select what it paints", Covered by
    - filter card, source row, style group and binding "Select N"
    - invert, the reference picker and the reference's "Selected (N)"
    - hops or touching from a hidden reference: 0, with a reason code
    - number card ranges and bars, and the category checklist on a visible base
    - the selection itself: a filter drops hidden ids (section 6)
- **Selection and sets, Whole by name:** largest-component select ("Largest component" reads the
  graph, as labeled), filters built on filters (each card reads the graph), Save as set (frozen
  members), and the base label "Full graph".
- **Project file, AI, export and API, View:**
    - AI queryGraph counts, the schema prompt facts, and findNodes
    - `data.statistics`, `data.nodes`, `valueCounts`, `histogram`, `nodePage`, `find` and
      `neighbors` defaults
    - `recommendLayout`, `selection.apply` with where or text, and `time.bins`
- **Project file, AI, export and API, Whole:**
    - the project file, autosave write and recovery, and the recipe
    - export (keeps its own `ExportScope`, default the whole graph)
    - load notices, expand and collapse, samples, undo and redo
- **Project file, AI, export and API, Neither:** the journal's resolved scope (additive, its own
  issue), and project open restoring visibility before runs (a restore-order fix, its own issue).
  XR picking and captureScreenshot read what is drawn, unchanged.

**Readers that gain `scope`:** `data.structureValue`, `selection.statistics`, `data.attributes`,
`valueCounts`, `histogram`, `issues`, `styles.groups`, `styles.categories`, `styles.counts`,
`styles.agreement`, the `neighborsOf`, `layer` and `invert` targets, and `catalog.optionsFor`.

## 6. Owner decisions A to E

- **A, Fit.** `boundsToFrame` with no ids measures the view's nodes when the option is on. Fit, the
  standard views, AI framing and the screenshot presets then agree with `zoomToFit`.
- **B, Selection.** When a filter change hides selected nodes, the element removes them from the
  selection. The removal is recorded in the same history step, so undoing the filter brings them
  back, and clearing the filter later does not. Only filter conditions drop ids; the time window
  never does.
- **C, Top-N.** `within` on the threshold leaf (section 3).
- **D, Ghosts.** Not visible, so not in the view (section 2).
- **E, No special layers.** The view is not a layer. Every behavior is a value the consumer sets,
  and all API here is additive.

## 7. Algorithms (agreed points 5 and 6)

- **Today:** each run resolves its scope to bitmaps, and `ScopedInput` derives a subgraph through
  the derived-input cache. Classes without `scopeInput = "subgraph"` compute over the whole graph,
  and `maskBack` masks their values.
- **With the option on, a run whose scope is `"visible"` takes the view.** It does not resolve or
  derive again: it holds the view's cache entry for its lifetime, as runs hold entries now. Every
  class computes over it, including `defineAlgorithm` definitions and legacy plugins, whose legacy
  graph is built from the view's compact graph. Results map back through the row map onto
  original ids, and hidden nodes get no value. A run is out of date when the view it ran on is no
  longer the current one, which is today's scope-digest staleness.
- **GPU** runs and the GPU force driver receive the view's compact snapshot like any other graph.
  A test proves the device sees the compact node count.

## 8. Layouts (agreed point 7)

Layouts read the view, not the original rows. `LayoutManager` is the one place that decides what
an engine is given, so all engines get it from there:

- **Simulations** (ngraph, d3, ForceAtlas2, any custom live engine) are given only the shown nodes
  and edges. Hidden nodes are not in the simulation, so they exert no force and are never moved.
- **One-pass and snapshot layouts** (circle, grid, Graphviz, spectral and the rest) are given the
  view's compact snapshot as `graph` and `stored`. `fixed` and `scope` are in view rows, and their
  answers map back through the row map. A circle or grid has one slot per shown node. Graphviz's
  phantom-row bug cannot arise, because a compact graph has no invalid rows.
- **Third-party engines** get the shown nodes through `addNodes` and `addEdges`.
- **Following the view.** When the view changes, the manager gives the engine the new view.
  Nodes that left are removed, and nodes that came back enter at their last positions. A
  simulation restarts; a one-pass layout runs again; filter changes and undo animate with the
  existing transition. Every layout follows, and so does a node added by an edit.
- **A named layout scope** is intersected with the view, so with the option on, nothing can lay
  out a hidden node. A carried or saved `"graph"` scope cannot turn shown-only layouts off.
- **Estimates, refusals, `optionsFor`, the driver choice, group boxes and the location-map frame**
  read the same view.

## 9. Time window (agreed point 8)

- Each window step (slider move, playback step) moves the visible masks, so the view is rebuilt
  and the layout follows it.
- Step 2 of the plan measures a rebuild at 50,000 nodes. If it takes more than one frame (16 ms),
  dragging rebuilds only when the slider pauses (no move for 200 ms), and playback steps rebuild as
  they land.
- Drawing and live counts during a drag answer from the masks, as they do today.

## 10. The honesty check (agreed point 10)

- **`graphty-element/test/contracts/working-graph-readers.test.ts`** finds every reader by itself.
  It walks the session's public API from the API reports, every layout in the layout catalog and
  every algorithm in the algorithm catalog. With the option on and a filter hiding a known node:
    - each reader that names no scope answers as it would on the graph without that node;
    - asked with its whole-graph word, it answers over the whole graph;
    - each layout leaves the hidden node unmoved and gives the shown nodes their count of slots;
    - each algorithm gives the hidden node no value.

    A reader it cannot classify fails the test.

- **`graphty-element/working-graph-baseline.json`** lists the readers that still fail, each with
  its reason and #6201.
- **`tools/check-working-graph.mjs`** fails when the list gains a row compared with the merge base,
  when a row is malformed, and when a row is stale. Stale rows are caught by the test, since only
  running the element can tell. It runs in `pnpm run check:quick` and in CI's Checks job.
- The list can only shrink. A new reader that must read everything takes a scope instead.
- The shape comes from the first attempt's `tools/check-working-graph.mjs`. Its "Whole-Graph-Reader"
  trailer is dropped, because the approved text says the list can only shrink.

## 11. Implementation plan

1. **The view.** A node-safe module, `session/working/view.ts`. It builds from the store snapshot
   and the visible masks with `ScopedInput`'s existing `intermediateOf`, holds one cache entry per
   state, and counts its builds.
    - Plumb the option through `createGraphSession`, `session.workingGraph` and the element
      property.
    - Tests, each failing first, assert counted builds: one build per state; a rebuild on a filter
      change, a window step, an edit and an undo; none on drawing options.
2. **Measure** a view rebuild at 50,000 nodes in a `bench*` project, and decide the slider-pause
   rule (section 9).
3. **Runs.** `"visible"` runs take the view; all classes compute over it under the option; legacy
   graph from the view. Add the GPU test.
4. **Layouts.** Change `LayoutManager` as section 8 says, and test every catalog layout.
5. **Framing and selection** (decisions A and B), with real-input tests (keys F and Fit, a filter
   hiding a selected node).
6. **Session readers.** Each reader defaults to the view under the option; add the `scope`
   options from section 5 and threshold `within`. Run `npm run api:report` and add the
   cost-coverage classification.
7. **The honesty check**: the test, the baseline, the script, and the `check:quick` entry.
8. **App.**
    - Set `working-graph`.
    - Make the filter editor a draft (section 4) with `base: "visible"` and no `hold`.
    - Write `within: "visible"` on style threshold rules.
    - Pass the whole-graph word on the readers labeled "Full graph" or "All".
9. **The owner's path, end to end.** A Playwright acceptance script in `graphty/acceptance/`: load
   College football, Data > Add filter, Louvain groups 1, 4, 5 and 7, then check each step with a
   screenshot and node positions:
    - nothing moves while ticking;
    - only current-layout nodes are drawn;
    - Done moves the shown nodes and no hidden node;
    - Circle and Grid place 49 nodes;
    - reopening the editor draws no hidden node;
    - clearing the filter ends in one layout.
      Look at every screenshot.
10. **Docs.** A guide page with the canonical example, the hold and `base: "full"` doc lines, and
    the default flip recorded on #6124.

## 12. Decisions the owner has not seen

Each is the simplest choice consistent with the agreement, with its reason.

1. **The option is a boolean `workingGraph`** (attribute `working-graph`), read back as
   `session.workingGraph`. It is not saved in the project file and not undoable. One switch whose
   default flips in the major needs no more values. It is the consumer's choice, not the
   project's.
2. **No new event and no `data.working()` accessor.** The view changes exactly when visibility or
   data change, which `visibility:changed` and `project:derived` already report. `defineAlgorithm`'s
   `input()` already hands algorithms their graph.
3. **No new whole-graph spelling and no deprecation.** Each reader keeps `"graph"` or `"all"` as it
   has them; readers without a scope gain `"graph" | "visible"`. Settling the two words is breaking
   and belongs to #6124.
4. **The filter editor is a draft.** Nothing is written until Done, Done is one history step, and
   Cancel writes nothing. This is the only design under which the filter changes exactly when the
   reader applies it, which agreed point 3 and the owner's "Done must apply the layout" both need.
5. **The preview draws over `base: "visible"`**, so nodes the draft would bring back are counted
   but not drawn until Done. Drawing them at stale positions is the reported bug, and laying them
   out before Done would move nodes while editing.
6. **`hold` and `base: "full"` keep their meaning under the option**, documented. The app no longer
   uses them for filters, and changing them is not needed to fix the owner's path.
7. **The layout follows every view change**: a filter change, a window step, an edit, an undo or a
   redo. Filter changes and undo animate with the existing transition. One rule for every cause,
   and it is the rule #6117's description gave him.
8. **Framing after a filter-driven re-layout** follows the element's existing auto-framing; there is
   no new behavior.
9. **Simulations do not hold hidden nodes.** They are removed from the engine, not held inert in
   the original rows. Agreed point 7 says layouts read the view.
10. **A named layout scope is intersected with the view**, and there is no whole-graph layout while
    the option is on. No agreed reader needs one, and it closes the saved-`"graph"`-scope hole.
11. **Context nodes (`showContext`) are not in the view**, as ghosts are not. The view is exactly
    the visible masks. With context drawing on, they sit at their last positions. Only ghosts were
    decided (D); including context nodes would make the view more than "what is shown".
12. **The slider-pause rule** is used only if a rebuild at 50,000 nodes takes more than 16 ms: a
    rebuild when the slider has not moved for 200 ms. One frame is the budget for a per-step
    rebuild, and 200 ms reads as a pause without feeling late.
13. **Every algorithm class computes over the view under the option**, and hidden nodes get no
    value. Agreed points 5 and 6 name defineAlgorithm and legacy plugins.
14. **Dropped selection ids are part of the filter's history step**, so undoing the filter restores
    them. Selected ids outside the time window stay selected, and Frame selection frames the
    selected nodes that are in the view. This keeps undo whole, and B exempts the window.
15. **The threshold leaf's `within` takes `"graph" | "visible"`, default `"graph"`.** It is the same
    words as a union leaf's base. The automatic color domain is left as the whole column. C
    covers ranking only.
16. **A search allowed to find hidden items** is `find({ scope: "graph" })` with its existing
    `excludedBy` flag. How a hidden hit is shown is the app's choice.
17. **The honesty check's baseline can only shrink**, with no trailer escape. That is the approved
    wording.
18. **Audit rows about naming, painting, rerun plumbing and restore order are out of this
    design.** They are not about which graph is read; each goes to its own issue.
19. **The view lives in the existing derived-input cache**, one entry per state. When nothing is
    hidden it is the store's snapshot. That reuses the cache runs already share, and costs nothing
    when no filter is on.
