# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-08) **Undo, Redo and Escape say what they did (app, plus one element param).** One
  words table, `graphty/src/workspace/frame/historyWords.ts`, words every `HistoryCode` from its
  params (filter steps keep their rule words through `stepChange` in `filterSteps.ts`). Undo/Redo
  tooltips read `Command.tooltip` ("Undo changing Size on PageRank Ctrl+Z"); the accessible name
  stays "Undo"/"Redo". After running: "Undid changing Size on PageRank." Escape on a non-empty
  selection: "Selection cleared: 3 edges"; the find box keeps the rule and Enter restores it.
  The element's `style.update-layer` fact now carries `channels` (additive; a Size binding is a
  layer UPDATE, not `style.encode`, so the layer name alone said nothing). The fact names a layer
  by its element name ("Influence"); the app maps it to its run row name ("PageRank") through
  `runs.bindings`, first layer of that name (ponytail). Evidence `tmp/r1-dry4-undo-escape-words/`
  (T22A/04 Escape notice, 05 tooltip, 06 Undid, 07 Enter restores; T22B/04, 05, 06).
- (2026-10-08) **Edit source... is a replace, offered only where Replace with file... is; Esc
  keeps a chosen file; the match report leaves out a zero kind (app only).** `editSource` opens
  the Data page with intent "replace" on the load's remembered files and choices, so its Load
  swaps the source (41 ties stayed 41; the "add" intent made 82). Both source verbs share one
  `canReplace` guard in `useRowMenu`, so a graph of several loads or one load of two tables gets
  no source menu. The page's Esc leaves only while `page.source === null`; with a file chosen it
  is swallowed (still `preventDefault`, so the workspace's Clear selection does not run behind
  the page) and Cancel is the way out; an open list closes first as before. The match report
  writes "41 edge rows read; ..." on an edge list. Evidence `tmp/r1-dry4-loads/` (T21A/04 the
  Replace page and sentence, T21A/06 Sources "20 nodes, 41 edges"; T20B/07 and 11 Esc stays,
  T20B/12 Cancel leaves). OPEN: a two-table load can no longer be edited at all; it needs
  replace-of-several-tables (canReplace's limit) before Edit source returns there.
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
- (2026-10-08, condensed) Earlier dry-run fixes: the study tool blurs focus and moves the
  pointer off after setup; a panel's Escape waits for inner controls (`isPanelEscape`); Made
  with's Weight is `weightRead(caveats)`; OPEN: Columns after "=" omit run results. Focus after
  an action goes to the inspector's
  title; find keeps the rule and live count; selections list members (`selection.originPaths`;
  OPEN: `edgePage({ scope: "selection" })` empty for edge-only selections, owner door). OPEN:
  after Replace the legend loses "Size: PageRank"; explicit dijkstra over a negative undirected
  weight freezes the page.

## Decisions and reasons

- (2026-10-08) **A step is named by what changed, not by a guess at intent.** "Size by
  PageRank" (the dry run's wish) needs to know a binding was added, not removed; the update fact
  says only which channels changed, so the words are "changing Size on PageRank", true for both.
  Filter steps keep their gerund words ("turning off ..."), so every step reads "Undo <gerund>".
  Clear selection returns early on an empty selection, so a bare Escape posts nothing.
- (2026-10-08) **A reopened load replaces itself; it never adds.** "Edit source" names the same
  source, so the only reading a reader expects is a swap; "add" doubled every edge. Where the
  graph cannot be replaced (several loads or tables) the verb is withheld rather than offered as
  an add, since an add under that name is the defect. Esc on the import page: lost work with no
  undo outranks a one-key exit, so Esc exits only an empty page. Rejected: a "discard changes?"
  confirm (a dialog for a key press; Cancel already exists).

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

- (2026-10-08) Did not work first time: a T22B setup on the new build (Les Miserables sample)
  missed "Run" (Playwright: button visible, enabled and stable, click not done in 3 s), and the
  setup went on without PageRank; the next start of the same setup ran clean, as did the frozen
  build's. Mechanism not found; the miss is in the setup's Analyze popover, not in anything this
  change touched. OPEN (study tool): the start did not fail with SETUP FAILED as the tool README
  says; the miss showed only in `setup.log`. Check it after every `--start`.
- (2026-10-08) Did not work: running prettier over a whole app folder reformats other agents'
  committed files (DataPage.tsx); reverted with `git diff <file> | git apply -R`. Format only my
  own files.
- (2026-10-08) Worked: re-piloting T21A from its `session.json` setup list (written to
  `t21a-setup.txt` in the task folder, `setup:t21a-setup.txt`), then `--click Data`, `--rclick
  friends.csv`, `--click "Edit source..."`, `--click Load`, `--expect "20 nodes, 41 edges"`.
  T20B's import page: "New from data..." then "choose a file..." `--upload trails.csv`.
- (2026-10-08, condensed) Proving "fails without" with no stash: copy my fixed files aside, write
  `git show HEAD:<file>` over them, run, copy back; for a file another agent has dirty, comment my
  lines out in place instead. graphty's real-element tests are project `real-element`, not
  `browser`; graphty reads compact-mantine from its `dist` (rebuild it first).
- (2026-10-08, condensed) Study tool: pilot on a dist copy (others' rebuilds empty
  `graphty/dist`); a role select is `--click "role=combobox:Role of <col>"` (the bare column name
  also matches the grid header); "Open project or file..." loads a CSV straight to the graph, so
  an import page needs "New from data..."; `--read` refuses `--click` in `--sr`; step N lands in
  screenshot N+1. Telling "not focused" from "focused, no ring": `--click X --key Tab` or `--sr`
  focus lines; `focus({ focusVisible: true })` does nothing in Chrome 143.
- (2026-10-08, condensed) Probes: a standalone Playwright probe on `graphty/dist` under
  `with-browser.sh` (wrap `session.runs.start`, read `run.params`, the DOM and the AX tree) splits
  "value wrong" from "reading wrong"; a camera probe logging `getCameraState()`, canvas rect and
  `viewInsets` names camera mechanisms; tooltip-under-X needs a probe of ancestors and z-index.
- (2026-10-08, condensed) Tests: a tooltip after `userEvent.hover` needs `{ timeout: 3000 }` (the
  open delay equals findBy's default); `findByText` then `closest('[role="tooltip"]')`; a
  `textContent` assertion includes `hidden` spans (assert `checkVisibility()`); a hung browser test
  with no output is a sync infinite loop (bisect with `-t`); a contrast or fit test must fail on
  the old value; never call a failure a flake.
- (2026-10-08, condensed) Did not work: `pgrep -f` waits (match themselves; wait by PID); a tree
  row's count slot for a filter outcome (cut the words); focus on the left tree after open
  (typeahead eats shortcuts); a string-anchored script edit matching twice (anchor on a unique
  closing line); rerunning a path with the same ends to show two times (same run returned).
- (2026-10-06 to 10-08, condensed) Shared worktree: stage only my hunks (`git apply --cached`, or a
  private `GIT_INDEX_FILE`), commit from an empty `git diff --cached`; wait for a clean `tsc` before
  building over others' half-saved files; never commit `api:report` output wholesale. Builds:
  `NODE_OPTIONS=--max-old-space-size=8192`. Element facts: a `Run` is thenable; per-node values via
  `session.data.nodePage({ columns: [runId] })`; `selection.apply` throws synchronously on a bad
  selector (unfiled); `data.name()` returns the id until `knownFields.nodeLabelPath` is set.
- (2026-10-06 to 10-08) Grep every route of a value before calling a change done.
- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
