# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-08) **Check what a finding measured before fixing the code it names.** "Damping factor
  exposes 0.8500000238418579" was the study tool, not graphty-element: `run.params` holds 0.85
  exactly and the DOM has `aria-valuenow="0.85"`; Chromium keeps a range's value as a 32-bit float,
  so CDP's AX `value` is `Math.fround(0.85)`. The node's `valuetext` property is "0.85", which is
  what a screen reader speaks. `real.mjs --read` now prints `valuetext` when present (`axSays`),
  with a `--prove` check. Evidence `tmp/r1-dry4-option-precision/` (`probe.mjs` reads run.params,
  aria-valuenow and the AX node in the built app; `T21A/` is the re-pilot).
- (2026-10-08) **Shortest path can follow edges one way (element only).** Dijkstra and
  Bellman-Ford take `direction: "out" | "in" | "all"` (default "all" = today). "out" searches the
  declared snapshot, "in" its `transpose()` (shared helper `searchFollowing` in
  `algorithms/utils/routeEdges.ts`, which releases the transpose); `caveats.direction` says
  directed/undirected. The path catalog entry merges Dijkstra's options, so the app's Made with
  "Advanced run settings" already shows "Follow Edges: All" with no app code; the Path popover's
  Follow (Out | All) is still the app's to build. API report unchanged (options types are not
  exported). Evidence `tmp/r1-dry4-path-direction-element/` (T18A/05 = r1d3 T18A/10 route).
  Baselines that will change: any story showing a path run's Advanced run settings.
- (2026-10-08, condensed) **Style tab: one name style (app only).** Every line's name is `Text xs`
  in one column (`PaintLine` in SetLine.tsx); the paint field sits under it (fixed 156 px). The
  Selection row has Nodes (halo) and Edges (`edgeColor`/`edgeOpacity`/`edgeScale`) parts. Evidence
  `tmp/r1-dry3-app-style-tab/`. Baselines: StyleTab, Inspector selection stories.
- (2026-10-08, condensed) **Find list and filters.** Headings count each kind
  (`FindResult.totals`); list scroll-snaps to whole rows. Filter controls say what they do ("Save
  and turn on", "within N hop(s) of X"). Evidence `tmp/r1-dry3-app-find-list-graph-title/`,
  `tmp/r1-dry3-app-filters/`.
- (2026-10-08, condensed) **Study tool records the served build** (`session.json` `commit`; the
  checkout's HEAD is `toolCommit`) and finds `setup:<file>` in cwd, `tier2/`, then
  `rounds/tier-2/setups/`. Evidence `tmp/r1-dry3-studio-tool-records/`.

- (2026-10-08, condensed) **Import page (app only).** Data page text `sm`, captions `xs`; Add /
  Leave out tooltips (`UNMATCHED_HINTS`); WeightLine after RoleList so Weight moves no role box.
  Evidence `tmp/r1-dry3-app-import-page/`.

- (2026-10-08, condensed) **Sources and left-out rows (app only).** Sources counts are a visible
  second line (`description` + `descriptionVisible`); the left-out child wears `GLYPHS.warning` in
  danger ink and opens "Left out of <load>" with the whole load's counts; left-out lines wrap.
  Evidence `tmp/r1-dry3-app-sources-left-out/`.
- (2026-10-08, condensed) **Shared tree and menu fixes (compact-mantine).** `Tree childBand?`
  (default true; the app passes false); type-ahead takes letters and digits only; a menu's Escape
  is marked used in the capture phase; a disabled first focus moves to the first enabled row
  (`data-autofocus`); menu highlights skip disabled rows; chosen segment weight 600. Evidence
  `tmp/r1-dry3-cm-tree-menus/`.
- (2026-10-08, condensed) **A tooltip opens on hover only after the pointer moves onto its target**
  (compact-mantine `overlayBehavior.ts`, `data-cm-still`). The theme's open delay is 1000 ms, so a
  test waits with `findByText(hint, {}, { timeout })`, not the default 1 s. OPEN: an `opened`-prop
  tooltip under a resting pointer stays hidden until a move. Evidence `tmp/r1-dry3-cm-tooltip-pointer-move/`.
- (2026-10-08, condensed) Study tool blurs focus and moves the pointer off the page after setup;
  a saved note takes focus; a panel's Escape waits for inner controls (`isPanelEscape`); Made
  with's Weight is `weightRead(caveats)`; runs show time to the second. OPEN: Columns after "="
  omit run results.
- (2026-10-08, condensed) Earlier dry-run fixes: focus after an action goes to the inspector's
  title (`focusInspectorTitle`; element `data-pointer-focus` hides the click ring); a load that
  leaves rows out wears a warning, a Sources child opens what it names (`tableRows`); find keeps
  the rule and the live count, selections list members (`selection.originPaths`; OPEN:
  `edgePage({ scope: "selection" })` empty for edge-only selections, owner door); neighborhood
  lists by name at every hop count; key sections titled by the run; route color set by the app.
  OPEN: after Replace the legend loses "Size: PageRank" (T21A/06); explicit dijkstra over a
  negative undirected weight freezes the page.

## Decisions and reasons

- (2026-10-08) **A study tool reads a range as a screen reader speaks it, not as Chromium stores
  it.** ARIA has assistive technology prefer `aria-valuetext`; Chromium derives it from the
  spinbutton's text. Rejected: setting `aria-valuetext` in compact-mantine's `useNumberField`
  (Chromium already exposes the text; nothing a reader hears changes) and narrowing anything in
  PageRank (nothing there narrows: the dispatch gets a fresh options object).

- (2026-10-08) **A one-way path searches the transpose, not a swapped source and target.** Swapping
  ends would give the right route but wrong per-node distances (distance TO the source, not from
  it); the transpose keeps node and edge spaces, so the result loop and `edgeRemap` are unchanged.
  Same pattern Katz uses for "out". "all" keeps the exact old code path (undirected input).
- (2026-10-08, condensed) **UI polish calls from the third dry run:** one label style (`Text xs`
  in one column) beats a wider field, and the Selection row's parts are Nodes and Edges; a scroll
  list ends on a whole row at every rest (scroll-snap), per-kind counts are the element's fact; a
  button that changes state says so before the click ("Save and turn on"), never disabled when
  unchanged; a follow-up choice goes below the control that caused it (Higher above the roles moved
  them ~62 px under the pointer); a script-focused heading gets an underline, not a box (read as an
  editable name), shared in compact-mantine.
- (2026-10-08) **A left-out row opens its load's whole account, not a "Left out" section alone.**
  The task asks how many arrived AND what was dropped; the small inspector hid the counts (T4A/12).
- (2026-10-08) **A shared control's defect is fixed in compact-mantine, and an app-specific
  look is an option with today's look as default.** The child band is right where selecting a
  parent selects its children (Figma), wrong in this app; so an option, not a removal. Menu
  Escape is marked in the document's capture phase, not on Menu.Dropdown: React flushes the
  close after the capture handler, and the dropdown's bubble handler never ran (test proved it).
  Disabled first row: focus the first enabled row rather than nothing, matching Mantine's
  keyboard model for button menus (the context menu's "pointer opens with no position" stays).
  Chosen segment: 550 (the strong role) was invisible at 11 px in a crop compare; 600 reads.
- (2026-10-08) **A label's ground is the app's choice: a white chip.** Reason: on top keeps the
  letters but not their legibility over a saturated band; a ground separates them. White, not the
  canvas color, so no element constant is copied. No padding: the texture already has margins
  (grid5.png shows no difference), and padding 2 lifted the stacked-label test's giant labels
  fully above the viewport so declutter skipped them (`StyleTab.real-element` "picking binds it";
  the fixture frames four nodes on one point). Rejected: a halo (`outline`, gray fringe), an
  element default (a choice, not a capability).

- (2026-10-08, condensed) Small calls: the pointer leaves the page after setup ((-1,-1), not an
  in-page spot); a saved note takes focus, not "+" (its tooltip covered the note); Delete note has
  its own `delete` glyph (minus stays "take out of this list"); a run's time shows seconds (two
  runs in a minute must differ); the weight row holds a short fact, the why on a line under it;
  one Escape guard helper for every popover form.
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
  (one thin width for all, a full-screen pass). The owner kept the element default; the app sets it.
- (2026-10-08) **View insets are margins for the next fit, never a reason to move the drawing.**
  The consumer that covered the canvas decides, by the shape it knows (`nodesInRect`), whether to
  ask for a fit. Rejected: re-frame when a node is under the bands (moved T18B), a second switch.
- (2026-10-08, condensed) **Standing app decisions from the dry runs:** find moves the camera only
  to an off-screen pick (`zoomToSelection` swung the drawing away); Made with states the weight the
  run read (`caveats.weight.assumed`, not `data.loadedWeight()`); visible labels stay exact ("From"),
  only accessible names grow; after a surface comes up focus goes to the open place's rail button;
  the app states its label look (body font) on every label line it adds, in one transaction; what
  a rule tested is an element fact (`selection.originPaths`), never parsed from the text; facts are
  rows, not chips; a filter step's outcome is a second line and saving a step turns it on; a stat's
  reading wraps, never cut; a canned run outcome carries every field a live one does; a selected
  edge has flat settings (`edgeColor`, `edgeScale`, `edgeOpacity`).
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

- (2026-10-08) Worked: a standalone Playwright probe (`tmp/<task>/probe.mjs`, own static server on
  `graphty/dist`, under `with-browser.sh`) that wraps `session.runs.start`, reads `run.params`,
  the DOM attribute and `Accessibility.getFullAXTree` split "the value is wrong" from "the reading
  is wrong" in one run. An element or app test of params passed in every setup; it could not.
  `--read` in `--sr` mode refuses `--click`; read without `--sr`. graphty's real-element tests are
  project `real-element`, not `browser`.

- (2026-10-08) Did not work: a string-anchored script edit put the new descriptor inside the Zod
  `meta` (two `advanced: true` blocks matched); caught by the "defaults to all" test. Anchor on
  the closing `};` of `optionsSchema`. Worked: read `algo.result.graph.length` and
  `result.edge(id).onPath` directly in a test; the 1.x key helper has no `length` mapping.
- (2026-10-08, condensed) `CompactColorInput width="100%"` with no trailing control overflows the
  panel; a fixed 156 px fits. The ComboInput is `role="combobox"`. Inspector.test.tsx "names a
  selected edge by its ends" fails whole-file on HEAD too (1 s findBy vs 1000 ms tooltip delay).
- (2026-10-08) Worked: snap test scrolls the viewport by 7 px steps and asserts the bottom is an
  option's bottom; fails with `scroll-snap-type: none`. Scroll-area thumb needs `waitFor` (sized
  after its ResizeObserver). Did not work: measuring the title tooltip via `--hover "<name>"` --
  that matched the top bar's project name (Rename F2); `--hover-at 150,61` hits the Graph title.
- (2026-10-08) A tooltip assertion after `userEvent.hover` needs `{ timeout: 3000 }`: the theme's
  1000 ms open delay equals findBy's default timeout, so the chip-tooltip check failed until given room.
- (2026-10-08) Worked: one pilot script per task in `tmp/<task>/T*.sh`, run under
  `with-browser.sh`, on a dist copy. "New from data..." then "choose a file..." --upload; a second
  table via "Add a table" > "File...". A role select is `--click "role=combobox:Role of <col>"`
  (the bare column name also matches the grid's header button). Did not work: "Open project or
  file..." for an import -- it loads the CSV straight to the graph.
- (2026-10-08) Worked: "fails without" for a file only I had dirty: copy mine aside, write
  `git show HEAD:<file>` over it, run, copy back (both new assertions failed at 9px).
- (2026-10-08) Worked: a `--prove` case that spawns `real.mjs` with `cwd` set to a scratch folder
  proves a setup path is found from elsewhere; `git rev-parse --verify <short>^{commit}` turns a
  build stamp's 12-char sha into the full one.
- (2026-10-08, condensed) Tooltip tests: `findByText` then `closest('[role="tooltip"]')`, not
  `findByRole("tooltip")`. A row that looks highlighted after a click is the pointer's hover. Stage
  my hunks with `git apply --cached` of a filtered diff and commit at once (another agent's
  whole-file commit swept mine in). Re-pilot an `empty` start from answers.md's success path.
- (2026-10-08, condensed) Menus and tooltips: a theme `onKeyDown` on `MenuDropdown` never runs
  (capture-phase close unmounts first); a disabled first focus needs `data-autofocus` (Mantine's
  trap refocuses row 1); Tooltip `vars` run only when the tooltip renders; read "tooltip under X"
  with a probe of ancestors and z-index, never from a screenshot (`elementFromPoint` skips
  `pointer-events: none`). Never revert-and-restore a file another agent is editing to prove a
  test fails; comment my lines out in place instead.
- (2026-10-08) Worked: `pilot/rewalk.sh` with `HERE=<my tmp>` and `REAL_DIST=graphty/dist` re-pilots
  a task on a fresh build; step N lands in screenshot N+1 (01 is the start).
- (2026-10-08) Did not work: rerunning a path with the same From and To to show two times -- it
  returns the same run (same time is then the truth). Use a different pair (T18B: Peruzzi, Ginori).
- (2026-10-08) Did not work: a tree row's count slot for a filter outcome. The slot yields to the
  name but keeps a 2.5em stub, so "weight is at least 4" + "20 to 19 nodes" became "weight is at
  least..." + "20 to ...". An old test passed because `textContent` includes a `hidden` span:
  assert `checkVisibility()` on visible words.
- (2026-10-08, condensed) Did not work: `focus({ focusVisible: false })` (Chrome 143 ignores it).
  Worked: a probe page showing script focus inherits keyboard modality; `--sr` "focus:" lines plus
  a computed-style probe tell "not focused" from "focused, no ring".
- (2026-10-08, condensed) A probe logging node extents plus `zoomToFit()` splits "framed wrong"
  from "laid out differently"; after a second load poll `isSettled && !running`, not
  `waitForSettled()`; `data.name()` returns the id until `knownFields.nodeLabelPath` is set.
- (2026-10-08) Others' rebuilds empty `graphty/dist`: pilot on a copy in tmp. Prettier an index-built blob.

- (2026-10-08) A test must fail without the fix: a contrast check passed on the old gray (compare
  to the chosen label instead); unnested rows fit at 240 px and proved nothing.
- (2026-10-08) Did not work: a browser test asserting explicit Dijkstra over a negative weight --
  the page froze (no test timeout fires on a synchronous loop); the vitest run sat at "RUN" 12 min.
  A hung browser test with no output means a sync infinite loop: rerun with `-t` to bisect. Another
  agent's `nx run graphty:build` emptied `graphty/dist` mid-start: copy dist to `tmp/<task>/dist`.
- (2026-10-08, condensed) A fact at the END of a narrow inspector row is cut: lead with it.
  `while pgrep -f` matches its own shell: wait by PID. Session-entry public types are listed in
  `graphty-element/session.ts`. `getByText` misses text split across a glyph span.
- (2026-10-06 to 10-08, condensed) Re-walk pilots from their `session.json` setup lists, not the
  plain setups. Flat-swatch Delta E is no proxy for a shaded sphere. `--hover` rests on a row's
  center; toggled meshes need `meshesShownOrHidden()`, rebuilt edges `forceEdgeWalk()`. A camera
  probe logging `getCameraState()`, canvas rect and `viewInsets` per step names camera mechanisms;
  a real-element app test cannot measure the legend (element 0 px wide). Untraced: toolbar real
  test "frames a selected edge's two ends" lands off in x (13.8 to 14.5 vs 14.07) with or without
  unrelated changes; TableDock's export preview fails only inside the full real run.

- (2026-10-08) Did not work: focus on the left tree after open (typeahead eats single-key
  shortcuts); a plain rail button works. A project opened ON the Data page keeps that page's focus.

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

- (2026-10-06 to 10-08) Grep every route of a value before calling a change done.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
