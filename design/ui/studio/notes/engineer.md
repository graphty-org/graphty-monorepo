# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-08) **A tooltip's position is a request; the theme flips it.** compact-mantine's
  Tooltip default is `bottom` with `flip`; `position="right"` on "Filter to neighbors" lands LEFT
  of the button in the real app, because the inspector sits at the window's right edge. Either side
  keeps the neighbor list clear, so the test asserts "not below the button" (tip top < button
  bottom), not "right of". A wrapped example in a hint: wrap the example in a `ws-nowrap` span
  (graph-place.css) so the sentence breaks before it. Re-pilot on a PRIVATE copy of graphty/dist:
  other agents rebuild graphty/dist in the shared worktree mid-session ("no production build").
  Evidence `tmp/r1-dry4-words-placement/` (T20A/07, T22B/02, T12RA/05, T12RB/05).

- (2026-10-08) **The inspector title takes focus with no mark; Rerun and Back keep focus off the
  page (app only).** The title (`INSPECTOR_TITLE_ID`, tabIndex -1 heading) has `outline: none` and
  no underline: a heading focused so a screen reader starts there is not a control (a box read as
  a field, an underline as a link). `cm-focus-underline` is deleted from compact-mantine. Both
  Rerun buttons in `RunStateBar` call `focusInspectorTitle()` on click (the title stays mounted
  through the run). Back/Esc to Degree now runs on every render of `NodeValues`, not only a mount.
  "After Back nothing shows focus" was mis-measured: focus WAS on Degree (Tab went on to Collapse
  Results); a pointer click on Back leaves Chromium in pointer modality, so the keyboard-only ring
  stays hidden, as spec 2.7 means; Esc shows it. Evidence `tmp/r1-dry4-inspector-focus/`
  (`probe.mjs`; T23B/03 clean title, T23B/05 Esc ring, T23B/07 Tab after Back; T12RA/02;
  T21A/06 `--read` starts at the inspector after Rerun).
- (2026-10-08) **A click keeps its trigger's tooltips closed until the pointer leaves; a
  pointer-opened menu highlights nothing** (compact-mantine `overlayBehavior.ts`). Mechanism, from
  a probe on the frozen build: the click on "Filter to neighbors" came before the 1000 ms open
  delay ran out, so no tooltip existed to dismiss; the tooltip mounted afterwards (same button
  element, new tooltip, the new label) under the resting pointer. Now a pointer-down records the
  control it landed on (`pressed`, `closest(button, a, input, ..., [role], [tabindex])`) and any
  tooltip that mounts for a trigger containing it is `data-cm-dismissed`, until a real move off it
  or the pointer leaving the window. Menus: `keyLast` (last key after last pointer-down) decides
  `skipDisabledFirstRow`: a key open goes to the first enabled row, a pointer open to the menu
  itself; ArrowDown then lands on the first enabled row. To check: a pointer-opened menu whose
  first row is ENABLED likely still highlights it (Mantine's focus trap focuses the first row; the
  theme turns the placeholder off for axe); not seen in a pilot yet. Evidence `tmp/r1-dry4-shared-tooltip-menu/` (`probe.mjs`,
  T23A/05-07, T23B/05, T22B/03-04, 07).
- (2026-10-08, condensed) **Check what a finding measured before fixing the code it names.**
  "Damping 0.8500000238418579" was the study tool reading Chromium's 32-bit range value; the DOM
  and `valuetext` say 0.85. `real.mjs --read` now prints `valuetext`. Evidence
  `tmp/r1-dry4-option-precision/`.
- (2026-10-08) **Path Follow: element option, app row.** Dijkstra and Bellman-Ford take
  `direction: "out" | "in" | "all"` (default "all" = undirected search; "in" uses `transpose()`).
  The app (PathForm.tsx) draws "Follow: Out | All" between To and Weight only when
  `session.status.directed`, starting on All, and always sends `direction` on a directed graph;
  Made with shows one "Follow All/Out" row (not again under Advanced run settings) on a directed
  graph and none on an undirected one. `isPathFollow()` in analyze/words.ts names the option for
  both. In stays off the form (From and To swapped asks the same). Note: a friends.csv loaded with
  no Direction choice is DIRECTED. Selection order is insertion order, not apply order. Evidence
  `tmp/r1-dry4-path-direction-app/` (T18A/02 Follow on All, 05 Made with "Follow All"; T18B no
  row). Baselines that will change: path popover and Made with stories on directed data.
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

- (2026-10-08, condensed) **Sources and left-out rows (app only).** Counts as a visible second
  line; the left-out child wears `GLYPHS.warning`; a load and its left-out child show "Added" and
  "Left out" sections (`SourceValues.tsx`). Evidence `tmp/r1-dry4-left-out-inspector/`.
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
  title; find keeps the rule and live count; selections list members (`selection.originPaths`;
  OPEN: `edgePage({ scope: "selection" })` empty for edge-only selections, owner door). OPEN:
  after Replace the legend loses "Size: PageRank"; explicit dijkstra over a negative undirected
  weight freezes the page.

## Decisions and reasons

- (2026-10-08) **No script ring after a pointer action.** Back to <name> returns focus to Degree
  but shows no ring after a click: the ring is keyboard-only everywhere (spec 2.7), and
  `focus({ focusVisible: true })` does nothing in Chrome 143 (probe: `optionSupported=false`).
  Forcing one would need a compact-mantine attribute ring, a second ring rule for one control.
- (2026-10-08) **Dismissal follows the pressed control, not the tooltip element.** A tooltip can
  mount after the click (open delay not over) or remount (a label change), so a mark on the
  element misses it. The pressed control is found with `closest(...)` so moving onto its padding
  from the label span is not leaving. A menu's open source is the last input (key vs pointer-down),
  not Mantine's `openedViaClick` (not exposed on the dropdown). Rejected: delaying the dismissal
  by time (an arbitrary timeout), and a per-app `opened` prop on the toggle (every caller would
  repeat it).

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
- (2026-10-08) **A left-out row opens its load's whole account, each part under its own heading,
  what it names first.** The task asks how many arrived AND what was dropped, so the counts stay
  (the small inspector hid them, T4A/12 of r1d2). But under one "Added" heading the counts read as
  describing the left-out row, and the two inspectors were identical (r1d3 T4A/11, T4B/12-13).
  Order is the only difference between them: it says which row was selected. Tried and kept:
  reorder whole `ControlSection`s by `child === "left-out"`; the test asserts DOM order with
  `compareDocumentPosition` and fails on the old component ("Unable to find ... Left out").
- (2026-10-08) **A shared control's defect is fixed in compact-mantine, and an app-specific
  look is an option with today's look as default.** The child band is right where selecting a
  parent selects its children (Figma), wrong in this app; so an option, not a removal. Menu
  Escape is marked in the document's capture phase, not on Menu.Dropdown: React flushes the
  close after the capture handler, and the dropdown's bubble handler never ran (test proved it).
  Disabled first row: focus the first enabled row rather than nothing, matching Mantine's
  keyboard model for button menus (the context menu's "pointer opens with no position" stays).
  Chosen segment: 550 (the strong role) was invisible at 11 px in a crop compare; 600 reads.
- (2026-10-08, condensed) Small calls: the pointer leaves the page after setup ((-1,-1), not an
  in-page spot); a saved note takes focus, not "+" (its tooltip covered the note); Delete note has
  its own `delete` glyph (minus stays "take out of this list"); a run's time shows seconds (two
  runs in a minute must differ); the weight row holds a short fact, the why on a line under it;
  one Escape guard helper for every popover form.
- (2026-10-08, condensed) **Dry-run app and element calls:** a label's ground is the app's white
  chip, no padding (a halo was gray, padding lifted stacked labels off screen); a Replace is laid
  out as an open is (only not-started jobs count as a waiting write); which file held nodes is the
  element's `tableRows`; `.cm-anchor` follows its size prop; neighbors list in name order at every
  hop count; one key section per highlight color, titled by the run; in a crowded row the name
  wins and the count yields.
- (2026-10-08) **A pointer-opened menu has no keyboard position.** Rejected: highlighting row 1 for
  every open (read as the suggested choice, "Edit source..." in T21B).
- (2026-10-08, condensed) **Element facts over new fields:** a resolved option is the caveat that
  names it (`caveats.method`), never written into params (a rerun would pin it); a left-out row
  says which END is missing (`LeftOutEdge.source/target`, mapped by `draft.resolve`); a label's
  draw order is the style field `onTop` (default depth sorted); a route is told apart by color
  (black, min Delta E 22; the app sets it); view insets are margins for the next fit, never a
  reason to move the drawing.
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

- (2026-10-08) Did not work: waiting for the shared build with `pgrep -f "graphty.*vite build"` in
  the same command line -- it matches itself and never ends (the background-chaining trap). Copy
  `graphty/dist` once it has `index.html` and serve the copy.

- (2026-10-08) Worked: path Follow row as `Input.Wrapper label="Follow" labelElement="div"` around
  the shared SegmentedControl (aria-labelledby the label id) -- reads like From/To/Weight with no
  bespoke control. Did not work at first: a test picked Lee and Ava expecting From=Lee; the form
  fills From with the earlier-inserted node, so pick a pair whose insertion order runs against the
  arrows (Lee, Dev).

- (2026-10-08) Did not work: `focus({ focusVisible: true })` to show a ring after a pointer click
  (Chrome 143 ignores it, and `false` too); the vitest browser test passed with or without it,
  because its page was already in keyboard modality, so a `:focus-visible` assertion there proves
  nothing (script focus inherits the modality). Worked: `--click X --key Tab` in real.mjs, or
  `--sr` "focus:" lines, to tell "not focused" from "focused, no ring".
- (2026-10-08) Worked: proving a test fails without a fix by copying the fixed file aside,
  writing `git show HEAD:<file>` over it, running, and copying back (no stash). graphty's tests
  read compact-mantine from its `dist`, so rebuild compact-mantine before an app test sees a
  change. Did not work: assuming "label change remounts the tooltip" from the finding's words; the
  probe showed the button and tooltip lifecycle (a late first mount). Inspector.test.tsx "names a
  selected edge by its ends" raced its 1 s `findByText` against the 1000 ms open delay again in a
  multi-file run; now waits 3 s.
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
