# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-08) **Filter steps show on/off and what they keep (compact-mantine + app, team door).**
  A step row's outcome ("77 to 26 nodes", "off") is a second line under the condition through the
  new shared `TreeNodeData.descriptionVisible` (row 44 tall); the count slot cut both in the
  240-wide list. Saving a step from the editor turns it on (Undo restores the old rule, off);
  status "Saved "x". The step is on."; header chip Tooltip names the steps on ("Turn it off in the
  Filters list", `chipTip`). Off-row dimming left as is: under the app's high-contrast theme
  tertiary == secondary (70% white, the AA floor), so the word "off" carries the state. Evidence
  `tmp/r1-dry2-filters/` (T17A/07-12, T17B/07-12). OPEN: once, T17B's "Attribute actions" click
  timed out with the button "visible, enabled and stable"; the rerun passed. Mechanism not found.
- (2026-10-08) **Focus after an action goes to the inspector's title (app + element, no API
  change).** A run or a find pick focuses the inspector title (`focusInspectorTitle`, id
  `INSPECTOR_TITLE_ID` in `frame/focus.ts`, `tabIndex -1`, shared ring class `cm-focus-outside`),
  never Degree or a "Nodes in order" row; Enter there opens nothing; n still opens a note.
  "Back to <name>" already returned focus to Degree (Enter reopens the list); after a pointer
  press Chrome shows no ring by design, Esc shows it. The canvas ring after a click on a line:
  the element's pointerdown prevents default and focuses the canvas from script, which Chrome
  marks focus-visible when a key was the last input; `focusVisible: false` is ignored by
  Chrome 143. Fix: graphty-element's container sets `data-pointer-focus` on a press (cleared by a
  key or focus leaving) and the shadow CSS hides the canvas ring then. Evidence
  `tmp/r1-dry2-focus-after-actions/` (T18B/07, T19A/02-03, T19B/02-03, T12RA/07-09, T24A/02).
- (2026-10-08) **Import page and Sources tell the truth (element + app + compact-mantine, team door).**
  An edge table whose load leaves rows out wears a warning ("23 rows, 1 left out", mark named "1
  row left out"), never the green check; the match report is one `sm` sentence; while the unmatched
  rows show only "Show all rows" is offered; a Sources child opens what it names (element
  `LoadedSource.tableRows` says which file held nodes or edges; the dock opens on it); leaving the
  Data place closes a source, attribute or filter-step row (`DATA_PLACE_KINDS`, Frame); `<main>` has
  no name. A replace under the seeded layout now draws as an open does (`Dispatcher.graphWritesQueued`).
  compact-mantine `Anchor` honors `size`. Evidence `tmp/r1-dry2-import-page-sources/` (T4A/06-12,
  T4B/04-13, T20A/05-06, T21A/06). OPEN: after Replace the legend loses "Size: PageRank" (T21A/06);
  parallel-edges shortest path test fails on HEAD (not this work).
- (2026-10-08) **Find confirms what it ran; selections list members (element + app, team door).**
  After Enter a rule stays in the box unselected (caret at end) and the line under it reads the
  live count ("3 edges selected", "Nothing matches this rule") while `selection.origin` is still
  that rule. The list groups Nodes then Edges (keyboard order follows); a layout effect cuts its
  height back to the last whole option row under 320 px (border counted). Inspector: "Selected
  edges" lists each edge by its ends' names (`edgeName` reads `session.data.name`, so every edge
  title names ends by name too) and, under a caption, each tested column's value, from the new
  element fact `selection.originPaths` (a bare rule name published as `data.<name>`). Evidence
  `tmp/r1-dry2-find-and-selection/` (T22A/03, T22B/03, T12RA/02, T12RB/02, T23B/03,
  T12RA-long/02-03). OPEN: `edgePage({ scope: "selection" })` is empty for an edge-only selection
  (the selection scope reads nodes only); changing it is behavior, an owner door.
- (2026-10-08) **Neighborhood list (app only, no API change).** Heading and status line
  "Javert's 17 connections" at every hop count (`neighborhoodWords`, inspector/words.ts), named by
  `session.data.name()` (the old "#895, named by id" note was stale). Every hop count lists by
  name (one hop: element `sort: { by: "name" }`; two or more: numeric `Intl.Collator` over the
  selection); a weighted one hop keeps its tie values. "Filter to neighbors": `default` Button at
  rest, `filled` when on, Tooltip says what it does and, on, "Press again to show every node".
  Evidence `tmp/r1-dry2-neighborhood-view/` (T23B/04-08, T12RA/04-06, T23A/04, 07, 08).
- (2026-10-08) **The key speaks the app's words for a run's highlight (app only).** One section per
  run color titled by the run ("Shortest path" / "On the path", `highlightEntry`), never the
  element's layer name; card and exported key share `keyNames`. Evidence `tmp/r1-dry2-key-words/`.

- (2026-10-08) **Shared rows, lists and menus (compact-mantine).** A tree row's count yields to its
  name; a selected expanded parent fills `bg-selected-hover`; unchosen segment label in `--cm-text`;
  only a keyboard open focuses a ContextMenu's first row; list fields consume their Escape (a
  Popover with `closeOnEscape` still wins). Evidence `tmp/r1-dry2-rows-shared-controls/`.
- (2026-10-08) **A run says which method it used (element + app, team door).** Unset `method` ->
  Dijkstra, Bellman-Ford on a negative read weight; option meta `choiceLabels`; Made with says
  "Dijkstra, chosen automatically". OPEN: explicit dijkstra over a negative undirected weight
  freezes the page (`algorithms/src/indexed/dijkstra.ts`). Evidence `tmp/r1-dry2-run-record-method/`.
- (2026-10-08) **Labels on top (element + app, team door).** `LabelStyle.onTop` (default depth
  sorted) draws a label after the graph; the app's `appLabelLook` sets it. Evidence
  `tmp/r1-dry2-labels-on-top/`.
- (2026-10-08) **Route color is black (element default, owner door).** Indigo passed swatch checks
  but read as ordinary on lit spheres. Judge node colors at shaded tones and screenshot pixels
  (`tmp/r1-dry2-path-color/measure.py`), never swatches. Cost: black is the 7th group color.
- (2026-10-08) **Which end is missing (element + app, team door).** `LeftOutEdge.missingEnds` /
  `DraftRow.missingEnds`; the app marks the cell, the caption and leads the inspector line with it.
  Evidence `tmp/r1-dry2-missing-end/`.
- (2026-10-08) **The drawing stays put (element + app).** View insets never move the camera
  (`OrbitCameraController.setViewInsets` shifts the pivot); the legend calls `zoomToFit()` only
  when `element.nodesInRect(cardBox)` is not empty; Find turns the camera only for an off-screen
  pick. Evidence `tmp/r1-dry1-view-stays-put/`.
- (2026-10-08) **Find and path form.** `FindOptions.edgeNameJoiner`; Made with rows Analysis, Ran,
  From, To, Weight. OPEN: Columns after "=" omit run results; label size is world-space;
  neighborhood filter has no `direction`; Dijkstra always undirected.

## Priorities and values

- (2026-10-07) Owner: no touch/tablet profile and no keyboard-only study in the tier 2 fix work.
- The core path works end to end on real wiring first (owner, 2026-10-02/03): a step that looks
  right but changes nothing visible is worse than a missing one.
- Fixes land in the package every consumer gets; an app workaround hides an element defect.
- Small diffs, root causes; one guard in the shared function, not a patch per caller.
- Evidence over taste: assert on element reports (`runs.painting()`, `styles.explain()`,
  `labelOf`, `nodeScreenPosition`), not on what a panel claims.
- Say early when a decision needs element API (owner door if breaking) vs cheap app chrome.
- Never blame timing or load; find the mechanism.

## Design criteria

- **Visible effect at commit** on canvas and legend (round 8's walk failed 21/21 on panel-only
  changes). **Live counts only**, read from the element at render time.
- **No promises:** nothing unbuilt is drawn (no "Coming", no disabled stand-ins).
- **One door, one command:** registered once, same words at every door, no two controls share an
  accessible name (also what the study tool clicks by).
- **Element owns facts, app owns words** (owner, 2026-10-03). **Easy things easy:** a new element
  API's first example fits in about 15 lines with no internal concept.
- **Style layers only;** suggested layers scoped to the result. **Exact by default;** cost
  estimates come from the element. **The app never starts work unasked.**
- **Accessible by default:** WCAG 2.2 AA; Esc closes the innermost thing; focus never falls to
  the page body; a ring never sits on a value row the reader did not pick.

## Decisions and reasons

- (2026-10-08) **A replace is laid out as an open is, not framed differently.** The "small graph"
  after Replace was a correct fit of a deep layout (z extent 37 vs x 23; an explicit `zoomToFit()`
  changed nothing). Mechanism: the seeded restart skipped while "another graph write waits", and
  the import being placed counted as waiting. Only not-started jobs count now. Rejected: re-arming
  the settle framing (the fit was already right), turning the camera to the thinnest axis (an
  opinion as a default).
- (2026-10-08) **Which file held nodes is the element's fact (`tableRows`).** The app cannot infer
  it: order of adding and "Each row is" both change it. Rejected: a record keyed by name (collides
  like `tables`). A table child shows only its own count; the left-out child only the rows.
- (2026-10-08) **A shared link follows its size prop.** `.cm-anchor` set the body font outright, so
  `size="xs"` links were 11 px in 9 px captions. Fixed once for every caller (inspector "from"
  line, usage card, import grid caption). The report itself moved to `sm`, the row size.
- (2026-10-08) **Neighbors in name order at every hop count, weighted one hop included.** Two or
  more hops list the selection, which has no single tie per node, so weight order is impossible
  there; one hop in weight order made the lists disagree (pilot T23B). Tie values still show at
  one hop. Filter to neighbors is outlined at rest because a subtle button read as a list row; the
  way back is in the pressed button's tooltip, not new chrome.

- (2026-10-08) **One key section per highlight color, titled by the run.** A node and an edge
  section with the same chip told a reader nothing the one does not; the property word ("Color",
  "Edge color") is dropped only when merged, since the one entry then covers both. Entry words
  live by result shape in analyze/words.ts beside the run names, so a new highlight shape gets
  "In the result" until it gets its own words. Rejected: renaming the element's layers (its English
  layer name is a default, the app replaces words by id).

- (2026-10-08) **The name wins the room fight, the count yields.** Reverses the earlier "count stays
  whole up to half the row": the name says which row it is, and two versions of a file differ at
  the end of the name. The tooltip still carries both. Rejected: moving the count under the name
  (rows are a fixed 32 px, virtualized), `min-width: 0` (the count vanished with no sign).
- (2026-10-08) **A pointer-opened menu has no keyboard position.** Rejected: highlighting row 1 for
  every open (read as the suggested choice, "Edit source..." in T21B).
- (2026-10-08) **The run record of a resolved option is the caveat that names it, not a new field.**
  `caveats.method` already said "dijkstra"; a `resolvedParams` record would state it twice. The app
  matches it against the option's choice values only for an enum left unset. Writing the resolved
  value into params was rejected: a rerun would pin it and lose "left unset".
- (2026-10-08) **A row says which END is missing, not which value.** Ends stay exact when both ends
  hold the same text and match `LeftOutEdge.source/target`; the app maps an end to its column with
  `draft.resolve(loadChoices(...))` (grid) or `leftOut.endColumns` (inspector). The ingest test is
  the one `isUnmatched` uses (`unmatchedValues` or not held), so the mark and the count agree.
  Rejected: missing values (ambiguous), column names (a `LeftOutEdge` end may be an expression).
- (2026-10-08) **A label's draw order is a style field, not an element switch.** `onTop` lives on
  the label style so a layer can lift some names and not others; the default stays depth sorted
  (another consumer may want the depth cue). Wired by one row in `StylePainter.RICH_TEXT_KEYS`:
  Node and Edge spread the resolved block into `RichTextLabel`, which already honored `onTop`.
  Rejected: always on top (an opinion as a default), a depth offset (still cut by nearer nodes).
- (2026-10-08) **A route is told apart by color, not by a second cue.** Searched the color space
  under the shading model against the default node, the measurement ramp, edge grey, background
  and the selection band (normal, protan, deutan): black wins by far (min Delta E 22 vs 14 for
  indigo). Size was rejected (flattens a size encoding beneath, e.g. PageRank size), outline too
  (one thin width for all, a full-screen pass). Changes a default -> owner-decisions "for the owner".
- (2026-10-08) **View insets are margins for the next fit, never a reason to move the drawing.**
  The consumer that covered the canvas decides, by the shape it knows (`nodesInRect`), whether to
  ask for a fit. Rejected: re-frame when a node is under the bands (moved T18B), a second switch.
- (2026-10-08) **Find moves the camera only to show a pick that is off screen.** Reason: turning to
  every pick (`zoomToSelection`) swings the far side of the drawing off the canvas for good.

- (2026-10-08) **Made with states the weight once, as what the run read** (`caveats.weight.assumed`,
  not `data.loadedWeight()`, which is wrong after a Replace); a rerun with another weight starts
  from Analyze.
- (2026-10-08) **A visible label stays exactly "From"; only the accessible name grows** (the study
  tool matches exact names first; "From node" would collide with "from PageRank").

- (2026-10-08) **After a surface comes up, focus goes to the open place's rail button**, never a
  tree row (type-to-find eats every single-key shortcut) or the find box (takes them as text).

- (2026-10-08) **The app states its label look on every label line it adds** (body font, 72 on the
  label canvas): the element's default Verdana is missing on Linux. One `session.transaction`, one
  undo step. Rejected: an app-wide base layer, changing the element default.
- (2026-10-08) **What a rule tested is an element fact, not parsed from the rule text.** The query
  engine already keeps a rule's paths; `selection.originPaths` publishes them as attribute paths.
  Rejected: the app matching column names in the typed text (a second parser), paths on the
  change delta (a panel that did not make the call never sees it).
- (2026-10-08) **Facts are rows, not chips** (a badge looks clickable); a header's right-click opens
  its menu.

- (2026-10-08) **A filter step row: sentence, then its outcome on a second line.** Replaces "only its
  sentence and checkbox" (the outcome was hidden and readers could not tell on from off). A
  second line, not the count slot: in 240 px the condition alone fills the row.
- (2026-10-08) **Saving a step turns it on.** A save with no visible effect read as a failed edit
  (dry run); the reader edited it to use it, and Undo restores the old rule and state.

- (2026-10-08) **A stat's reading and a list row's second line wrap; never cut** (a tooltip is not
  reading).
- (2026-10-08) A canned outcome (project open) carries every field a live one does, or it vanishes
  from `run.record` after a reopen. Watch the next field added to `RunOutcome`.
- (2026-10-08) **A selected edge gets its own flat settings** (`edgeColor`, `edgeScale`,
  `edgeOpacity`): no one value serves a ring and a band; flat because `setSelectionStyle` merges
  one level deep.
- (2026-10-07, condensed) **Tier 2 element work (owner doors, hold + needs-decision):** edge pick
  5a2b3b605; filter steps `setSteps` with counts only in `plan` (8966b0888; rejected live counts,
  OR/NOT); stale runs ce34f31f3 (Replace reads `run.stale`, never reruns; Rerun passes
  `stale.scopeSpec`); every load a source f141b1283; runs read the loaded weight through one
  resolver, "is it read?" answered by `plan()` only; edge-attribute filter 559f5dcb2 (`halvesOf`,
  `nodes: "ends"`); coded selector refusals 3d89d43c3; focus after a control goes (element
  `delegatesFocus`; open: WebGPU canvas swap may drop a focused canvas); force publishes ngraph's
  defaults, `depthIndependentSize`, `fitToGraph keepAngle`, `viewInsets`; a covered legend block is
  dropped by `styles.legend()`. Next: run results typed per field; several node types last.
- (2026-10-07, condensed) **App-only (no door):** edge click opens the edge inspector (e666ae17d);
  "the selection" frames edge ends at the camera door only (not `resolve.ts`, which would widen
  scoped runs); Direction row "Undirected, from the file"; Export warnings worded by the app
  (`export/lossWords.ts`); notes are one command (`notes.add`); a run's Values view comes from its
  shape (`viewOf()`). Element English still on screen (estimate reasons, layout descriptions,
  partition labels): codes from the element are an owner door.
- (2026-09-13 to 10-07) Older standing decisions: no default layout seed in the element (the app
  seeds, `LAYOUT_SEED`); any new site showing a run calls `runName`; test the element before the
  app; a run paints when it finishes; group-row color fallback in `graph-place/rows.ts` stays until
  #1099; study APIs `nodeScreenPosition`, `elementAt`, `labelOf` merged.

## Tried: worked / did not work

- (2026-10-08) Did not work: a tree row's count slot for a filter outcome. The slot yields to the
  name but keeps a 2.5em stub, so "weight is at least 4" + "20 to 19 nodes" became "weight is at
  least..." + "20 to ...". An old test passed because `textContent` includes a `hidden` span:
  assert `checkVisibility()` on visible words.
- (2026-10-08) Did not work: `focus({ focusVisible: false })` (HTML standard) -- Chrome 143
  ignores it, still draws the ring. Worked: a plain probe page (`fv-probe3.mjs`: input, key,
  click a canvas in a delegatesFocus shadow root) showed every script focus inherits the
  keyboard modality there, with or without preventDefault; `real.mjs --sr` "focus:" lines and a
  computed-style probe (`title-ring-probe.mjs`) told "not focused" from "focused, no ring"
  (Mantine's `mantine-focus-never` erases outlines; `cm-focus-outside` restores one).
- (2026-10-08) Worked: logging the node box's x/y/z extents and calling `zoomToFit()` in a probe
  (`tmp/r1-dry2-import-page-sources/probe-replace.mjs`) split "framed wrong" from "laid out
  differently" in one run. Did not work: `graph.waitForSettled()` right after a second load -- it
  resolves on the OLD settlement; poll `isSettled && !running`. A column label click already opened
  its role list on this build (the pilot's miss did not reproduce at 728,205 or 662,201); a test pins it.
- (2026-10-08) Did not work: expecting `data.name()` to read a
  `name` field -- it returns the id until `knownFields.nodeLabelPath` is set (an import sets it);
  a headless test sets it. Did not work: `max-height` from row bottoms alone; border-box counts
  the list's 1 px border, so the list ended 1 px above the row.

- (2026-10-08) Did not work: piloting on `graphty/dist` while others rebuild (their `vite build`
  empties it: "no production build"). Worked: copy dist into the task's tmp folder after the
  build, grep its JS for the new words, serve the copy. Run prettier on an index-built blob.


- (2026-10-08) A test must fail without the fix: a contrast check passed on the old gray (compare
  to the chosen label instead); unnested rows fit at 240 px and proved nothing.
- (2026-10-08) Did not work: a browser test asserting explicit Dijkstra over a negative weight --
  the page froze (no test timeout fires on a synchronous loop); the vitest run sat at "RUN" 12 min.
  A hung browser test with no output means a sync infinite loop: rerun with `-t` to bisect. Another
  agent's `nx run graphty:build` emptied `graphty/dist` mid-start: copy dist to `tmp/<task>/dist`.
- (2026-10-08, condensed) A fact at the END of a narrow inspector row is cut: lead with it.
  `while pgrep -f` matches its own shell: wait by PID. Session-entry public types are listed in
  `graphty-element/session.ts`. `getByText` misses text split across a glyph span.
- (2026-10-08) Worked: re-walking the pilots with a copy of `tier2/pilot/rewalk.sh` whose `SET`
  is overridable and setup files rebuilt from each pilot's `session.json` "setup" list (the r1d1
  T18 pilots started with PageRank run and sized, not the plain friends setup). Did not work:
  flat-swatch Delta E as a proxy for what a reader sees on a 20 px shaded sphere.
- (2026-10-06 to 10-08, condensed) Small facts: `--hover` rests on a row's center; a mesh toggled
  outside an update pass needs `meshesShownOrHidden()`, an edge rebuilt outside a style pass
  `forceEdgeWalk()`; a layer `set` channel can add a legend block (`keyBlocks` decides).
- (2026-10-08) Worked: a probe script (`tmp/r1-dry1-view-stays-put/probe.mjs`, own static server,
  through `with-browser.sh`) logging `getCameraState()`, canvas rect and `viewInsets` per step
  named all three camera mechanisms in two runs. A real-element app test cannot measure the
  legend (element 0 px wide there); a stand-in element with spies can.

- (2026-10-08) Worked: a find option the caller fills with its own words (`edgeNameJoiner`).
  Untraced: toolbar real test "frames a selected edge's two ends" lands at x 13.92/14.46 vs 14.07
  with or without that change; TableDock's export preview fails only inside the full real run.

- (2026-10-08) Did not work: landing focus on the left panel's tree after open -- Tree typeahead
  claims every one-character key, so the study's single-key shortcuts typed nothing. Worked: a
  plain button (rail). A project that opens ON the Data page (New from data...) must not take
  focus from that page: the open effect runs only when `page === "panels"`.

- (2026-10-08, condensed) Shared worktree: snapshot a file another agent has dirty BEFORE editing
  (`tmp/<task>/base/`); stage only my hunks (`git apply --cached --unidiff-zero`, or
  `hash-object -w` + `update-index --cacheinfo`). Their half-saved files can break `tsc` and the build
  for minutes: wait for a clean `tsc` before building. A setup's Shift+A missed in a WIP build;
  `--click Analyze` works the same.

- (2026-10-08, condensed) Flex: `flex-basis: auto` to split by content. "Fails without" with no
  stash: `git diff > p.patch`, `git apply -R`, run, `git apply`. Canvas `measureText` sizes a column
  once weight and `letterSpacing` match. Mantine Tooltip never opens in jsdom. Same-depth line:
  `zOffsetUnits`. real.mjs: `--key Shift+A` after a setup ending on a tree row types nothing; check
  a dry-run finding on the frozen build first; a Tree child row is not inside its parent treeitem.

- (2026-10-07, condensed) Contrast in a browser test: blend alpha over the first opaque ancestor
  (`contrastOnPage`). Prove a tool fix with a copy of `real.mjs` with the fix undone (beside it in
  `tool/`, so its relative paths hold; delete after); concurrent `--prove` runs need `REAL_PROVE_DIR`. "New from data..." opens no file chooser: click
  "Add a table" > "File..." first.
- (2026-10-06 to 10-07, condensed) Shared worktree: commit from an empty `git diff --cached`; for a
  file others have dirty use a private index (`GIT_INDEX_FILE`, `read-tree HEAD`, `apply --cached`
  my hunks); never commit `api:report` output wholesale (it reads `dist/` types). Builds: `nx run
graphty:build` can OOM and empty `graphty/dist` (`NODE_OPTIONS=--max-old-space-size=8192 npx vite
build --outDir <dir>`); the app reads compact-mantine from its `dist/`. Tests: a `Run` is thenable;
  pixel checks via `waitForStableFrame()` + `engine.readPixels`; never call a failure a flake; a
  run's per-node values via `session.data.nodePage({ columns: [runId] })`; queries are JMESPath.
  `selection.apply` throws synchronously on a bad selector (element defect, unfiled).

- (2026-10-06 to 10-08) Grep every route of a value before calling a change done. Untraced: header
  "Untitled" after New from data; `notReadSentence` words only `E_PARSE_FAILED`.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
