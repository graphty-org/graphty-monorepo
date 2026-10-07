# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, and I say what the code and the element's API can and cannot do today. I keep
fixes small and in the right package. I read this file at the start of every session and update it
as I decide and learn.

Words used below: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a
first-time user's core path from an empty app (open a sample or a file, read it, run an analysis,
color or size by a result, put names on, find a node and its neighbors, export a picture and the
numbers, save and reopen). "The walk" is the whole first session chained end to end, the build's
acceptance test. "The studio worktree" is
`/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1` on branch
`design/studio-tier1`.

## Top of mind

1. (2026-10-07) Round 2 closed; all ten of its build changes landed on design/studio-tier1
   (895e5fab3..b7590f8de, build b7590f8de, graphty 0.8.53) and the re-pilots of T6, T7, T9-T13,
   T15, T16 all reach their end state with no blocker. Round 3 measures THOSE changes: do not land
   another change on a path a round 3 task measures until round 3 has run (two changes on one
   path confound the measure; decisions rule).
2. (2026-10-07) Watch in round 3, by change: menu-to-dialog focus (re-run r2-s07 first); key
   drops a covered layer; 2D Fit; group layouts after Louvain; load/run announcements (tool
   blind spot 3: a region inserted already filled is "unconfirmed"); canvas name and focus ring;
   Size "+" opens its list (credit any T9 ease change to it alone); trailing chevron in the row;
   run named by method; "Show all labels". A regression there is mine to trace first.
3. (2026-10-07) Biggest remaining element defect class: element English reaching the screen.
   Re-pilots found it in layout refusals (`session/planning.ts` planar/bipartite: "G is not
   planar", "results.louvain.group names 6"), layout descriptions (`catalog/layouts.ts`, British
   "centre"), graph-io's CSV export warnings, and `run.label`. Fix = `{ code, params }` from the
   element, words in the app; never an app rename or string match.
4. (2026-10-07) 3D size misreading FIXED (owner door, hold + needs-decision): element
   `layoutBehavior.node.depthIndependentSize` (off by default) scales each node mesh by its view
   depth over the orbit pivot's in `UpdateManager.sizeNodesForDepth`; the app turns it on while a
   `node.size` legend block reads a field (`ElementHost.useSizeBound`). Trace rerun: 0 of 190
   pairs inverted at both angles, Farah 54 px vs Ava 51 px. Anything that sets a node mesh's
   `scaling` now fights this pass; `Node.roundRadius` is cached per mesh AND scale.
5. (2026-10-07) Key covering nodes FIXED (fa260f20d, owner door, hold + needs-decision): element
   `viewInsets` (CSS px per side), honored by every fit; the app's LegendCard reports its box.
   Open: the toolbar is reserved only while the card takes the top; "Current view" exports rely
   on the screen's insets; a reader's own camera is refit when the card resizes (autoFrame on).
6. (2026-10-07) Exports at 2x/4x are now drawn at that size, not stretched (6783ba895). A
   new pixel-sized mesh must read `engine.getRenderWidth()` inside the render and honor
   `CustomLineRenderer.setPixelScale`, or it shrinks in a 4x export. Still deferred: name behind
   a dot counted as shown, refusal parity for "New from data...".
6a. (2026-10-07) Force re-apply cloud TRACED and fixed at its cause (b6011c01d): the catalog
   published ngraph v1 defaults (spring 30, gravity -1.2...) the engine never ran (ngraph ran
   10, 0.8, -12, 0.9, 0.5). Form now reads 10 and -12. Spring 20 (2x) settles in groups; 80
   (8x) is still a cloud -- that is ngraph's physics (fixed repulsion), not a stuck engine.
   Bounding the app's Spring length field is an app choice, open.
7. (2026-10-07) Small open defects from the re-pilots (not on a measured path, safe after round
   3): Columns by group ignores group order (6,1,5,3,4,2); Circle draws a sphere in 3D; group
   named three ways ("Louvain", "Group N", "Communities" in Group by); Overview direction row
   shows raw "from the file: directed 0" and overflows; truncated "Node t..." labels; Id/id;
   Florentine histogram of 15 equal bars; Everything's Style shows base Size 1/blue after sizing.
8. (2026-10-07) Study tool: `ambiguous` on a label plus its input (Show all labels, Format,
   Table) is a tool defect, not a participant wrong turn. Fix in `tool/real.mjs` (treat a label
   and the control it labels as one match) before round 3 grading, or graders over-count.
9. (2026-10-06) Graph logic goes in graphty-element, never the app; an app comment explaining why
   the element could not be used is an element bug report. Element returns neutral facts; app owns
   words. Style only through layers. Public element API or behavior change = owner door:
   `owner-decisions.md` + `npm run api:report`.
10. (2026-10-06) No default layout seed in the element (owner). The app seeds itself
   (`LAYOUT_SEED`, `takesSeed()` in `layout/methods.ts`); any new layout path passes it. Fixed
   seed = overlay overlaps are one event per dataset, not per session.
11. (2026-10-07) A decision's file list is a start, not the set: grep every route of the value
   (run-name change missed Why this look). Any NEW site showing a run calls `runName`, never
   `run.label`. Tests assert literal method names, not `run.label`.
12. (2026-10-07) Bars baseline on 4a7a1a7fb: 42 app words at rest (no fix may push it above);
   axe fails on one cause, `#8c8c8c` on `#2c2c2c` (compact-mantine `compactDarkColors[2]`).
   Re-measure with `tool/bars.mjs`. Trust a scripted repro or a cause in code over a participant
   count (one model plays every persona).
13. (2026-10-06) Iterate locally: element build, then `pnpm exec nx run graphty:build`, re-run
   with `tool/real.mjs`. Others rebuild `graphty/dist` often: copy the build and use
   `REAL_DIST=<copy>`; check `pgrep -af "real.mjs --prove"` before trusting a FAIL. Never push.
   (2026-10-07) The app's vite build now runs out of Node's default 4 GB heap ("rendering
   chunks", core dumps in `graphty/`): build with `NODE_OPTIONS=--max-old-space-size=12288`.
   Other agents rebuild the element mid-build; wait until no element build runs first.
14. (2026-10-07) Focus: the compact-mantine Menu theme returns focus only from inside the menu;
   never add `returnFocus={false}` again. The canvas is named by the host's `aria-label`, has no
   autofocus; focus stays on the body after an open (re-record keys that expected otherwise).
15. (2026-10-07) The element FREEZES Babylon's active-mesh list on a still frame
   (`UpdateManager.settleActiveMeshFreeze`). A mesh enabled or disabled outside an update pass is
   ignored until something unfreezes it: call `getUpdateManager().meshesShownOrHidden()`. Suspect
   this first when "I hid it and it is still drawn" (or the reverse). Also untraced (2026-10-06):
   live Selection row blank after the neighbor route; reopened run row has no count; Effects
   Outline black blobs; header "Untitled" after New from data.

## Priorities and values

- The first-time user's core path works end to end on real wiring, before anything else
  (owner, 2026-10-02 and 2026-10-03). A step that looks right but changes nothing visible is worse
  than a missing step: the mock rounds' dominant failure was "the right control is found; what it
  does next fails."
- Fixes land in the package every consumer gets. The app is today the only consumer of the
  element, so it is the only thing that can discover element defects; a workaround throws that
  information away (repository `CLAUDE.md`, "The app MUST NOT work around graphty-element").
- Small diffs, root causes. One guard in the shared function rather than a patch per caller.
- Evidence over taste: I assert on element reports (`runs.painting()`, `styles.explain()`,
  `labelOf`, `nodeScreenPosition`), not on pixels or on what a panel claims.
- The studio's time and the owner's attention are expensive. I tell designers early when a
  decision would need new element API (a public contract, so a one-way door for the owner), and
  when it is cheap app chrome (a two-way door I can just build).
- Never blame timing or load for a failure; find the mechanism first.

## Design criteria

- **Visible effect at commit.** Every step's change shows on the canvas and the legend the moment
  it commits (tier 1 design, the walk). Reason: round 8's walk failed 21 of 21, mostly on actions
  that changed panel text but not the drawing.
- **Live counts only.** Any number in a message is read from the element at render time. Reason:
  repeated "numbers disagree between screens" findings in rounds 2-7.
- **No promises.** An unbuilt item is not drawn: no "Coming" tags, no disabled stand-ins for work
  that does not exist (tier 1 design, section 3). Reason: dead-end menu items ("not available
  yet") turned every second route into a failure in round 8.
- **One door, one command.** A command is registered once and every door (key, menu, Quick
  actions, selection bar) uses its words verbatim; no two reachable controls share an accessible
  name. Reason: "Data" and "Louvain" on several controls confused sighted users and broke the
  screen-reader persona; it also breaks the study tool's click-by-name.
- **Element owns facts, app owns words.** The element returns codes, values and descriptors; the
  app writes every sentence (owner, 2026-10-03). Reason: a third-party consumer must be able to
  present the same facts its own way.
- **Easy things easy.** A new element API has a simple path whose first example fits in about 15
  lines and names no internal concept; it is checked by a docs-only author (repository
  `CLAUDE.md`).
- **Style layers only; suggested layers scoped to the result** (repository `CLAUDE.md`). Reason:
  styling outside layers is invisible to the layer list and lost at a dataset boundary; an
  unscoped suggested layer erases every algorithm beneath it.
- **Exact by default.** The method named is the method run; a sampled variant is offered, never
  swapped in; cost estimates come from the element (framework principle 2).
- **The app never starts work unasked.** Samples open with nothing run (round 8 decision).
- **Accessible by default.** WCAG 2.2 AA; the table and inspector are the canvas's text
  equivalent; Esc closes the innermost thing first; focus never falls to the page body.

## Decisions and reasons

- (2026-10-07) **Force publishes the defaults ngraph runs (b6011c01d, element, no API change).**
  Trace: the re-applied engine DID step (instrumented `NGraphEngine.step`); it settled at ~190
  steps as a cloud because `springLength: 80` was 8x ngraph's real 10, not 2.7x the shown 30.
  `resolveLayoutOptions` fills defaults only for classes with a `static descriptor`; ngraph has
  none, so the zod defaults were documentation only (since 4fb076175). Fix: schema defaults =
  ngraph's own (same as Spring Electrical's), constructor starts from `getDefaults(schema)`.
  No default drawing changes. Rejected: honoring the old declared values (moves every force
  baseline, jitters to the 1000-step cap, breaks parity with the GPU twin); scaling repulsion
  with spring length (changes what ngraph's options mean: owner door); a stricter settle rule
  (moves default drawings, and L=80 converges to ratio 0.56 anyway). Proof:
  `test/browser/force-reapplied-settles.test.ts` (2x the published default; 0.72 old, passes
  new); app `tmp/r3fix-force-reapply-cloud/run20/` groups, `run80/` still a cloud.
  Ratio check scripts: `tmp/r3fix-force-reapply-cloud/exp*.mjs` (ngraph in Node, no browser).

- (2026-10-07) **A size bound to data compares at any depth (element option, owner door).**
  Cause (traced): perspective divides world size by depth; style and world sizes were right.
  `node.depthIndependentSize` in `config/GraphBehavior.ts` (optional, not `.default(false)`: a
  default makes the field required in the parsed output type and broke tests that build the
  full config). `UpdateManager.update()` runs `sizeNodesForDepth()` after the pass: mesh scale =
  depth / pivot depth (orbit + perspective only; 2D and XR reset to 1), and when any scale
  changes it invalidates every edge's position cache and walks the edges in the same frame.
  `pictureIsFinished()` is false until the switch reaches the meshes, so `waitForStableFrame`
  does not return early (the on-then-off test failed until this). Labels and halos are children
  of the node mesh, so they scale too. Proof: `test/browser/camera/depth-independent-size.test.ts`
  (fails on the old UpdateManager), the T9 test in `StyleTab.real-element.test.tsx` (fails on the
  old ElementHost), `tmp/r3fix-fix-3d-size/trace/` and `repro/` (export: Farah ~106 px, Ava ~100).
  Rejected: on by default, the element deciding when to turn it on, camera distance, app warning.

- (2026-10-07) **A capture of another size is drawn at that size (6783ba895, element only, no
  API change).** Cause: Babylon's `CreateScreenshotAsync` copies the canvas (device pixels) and
  `drawImage`-scales it to the requested size, so "For print, 4x" was the canvas stretched (no
  browser clamp; `precision` was being fed the JPEG quality, shrinking JPEGs). Now a size other
  than the canvas with the canvas's shape goes through `CreateScreenshotUsingRenderTargetAsync`
  (MSAA 4 when the engine antialiases); a different shape keeps the old fitted copy (ponytail:
  sharp letterboxing not built). Label textures did NOT need re-rendering: they are drawn at
  48 px per line, which covers a 4x export of a normal view (measured 10-90% glyph rise 1 px at
  1x and at 4x). What did break: line width is in pixels (`resolution` uniform), so 4x edges came
  out a quarter as thick; `CustomLineRenderer.setPixelScale(scene, k)` divides the resolution for
  the capture and resets in `finally`. Proof: `test/browser/screenshot/screenshot-sharp-names.test.ts`
  (rise 6 px stretched vs 1 px; edge 5 px at both sizes without the line scale vs 15-25 wanted);
  app `tmp/r3fix-export-sharp-names-4x/run/` (Florentine, name on every node, Show all labels,
  For print 4x: `medici-1to1.png`, rise 1 px). The study browser renders labels in a serif
  fallback font; that is the tool, not the export.

- (2026-10-07) **"Whole graph" export keeps the on-screen angle (6f1cf692b, owner door).**
  `fitToGraph` `keepAngle` (default false) keeps direction and roll, fits every padded corner of
  the bounds box; `ScreenshotOptions.camera` takes `{ preset, params }`; app `cameraOf()` asks for
  it. Rejected: a new view id, a new default, app camera math. Proof:
  `test/cameras/fit-to-graph-keep-angle.test.ts`, `tmp/r3fix-export-whole-graph-angle/`. Ceiling:
  boxing, not nodes, leaves ~20% margin; tighter needs node positions in `CameraViewInput`.

- (2026-10-07) **Export leaves the selection ring out (4c087d8bc, element + app; owner door).**
  `ScreenshotOptions.showSelection` (default true); `false` disables every enabled
  `graphty-selection-halo` mesh (`SELECTION_HALO_MESH`, now exported from `Node.ts`) for that
  capture, tells `UpdateManager.meshesShownOrHidden()` (new, public via the main entry), draws a
  frame, captures, and re-enables in the outer `finally` (success and failure). Selection state
  and events untouched. App: `screenshotOptions()` always passes `showSelection: false` (export
  and preview); no dialog control. Rejected: deselect/reselect in the app (fires events, loses a
  multi-selection), default false (moves every caller's picture), `selection: false` (reads as "no
  selection"). Did not work first: disabling the halo alone -- the frozen active-mesh list kept
  drawing it (Top of mind 15). Proof: `test/browser/screenshot/screenshot-selection.test.ts`
  (real Babylon capture via `vi.importActual`; fails on the old capture with 18214 differing
  pixels); app run `design/ui/studio/tmp/r3fix-export-no-selection/run/` (06 Medici ringed,
  08 preview no ring, downloads/florentine_current-view.png no ring, 09 still ringed and
  "Selection 1"). `owner-decisions.md` entry; PR needs hold + needs-decision.

- (2026-10-07) **The key never covers a node: view insets (fa260f20d, owner door).** Element
  `viewInsets` (`setViewInsets`/`getViewInsets`, `CameraViewInput.insets`, device px);
  `camera/insets.ts freeArea()`; 2D and `fitToGraph` size into the free area, orbit uses a lens
  shift so the graph still turns about its center. A framed capture insets by the key it draws
  (`legendBox()`), not the screen's. App `LegendCard` `useReservedMargin`. Proof:
  `test/browser/camera/view-insets.test.ts`, `tmp/r3fix-key-view-insets/`.

- (2026-10-07) **Show all labels (b7590f8de, app only).** Checkbox beside the label count in
  `LabelSection.tsx` ("N labels, M hidden"); store `allLabelsShown` (reader preference, not saved);
  `ElementHost.tsx` writes `layoutBehavior={{ labels: { declutter: !allLabelsShown } }}` on the tag
  (assigning `element.layoutBehavior` is refused by the `no-element-mutation` lint rule). Proof:
  T10 test in `StyleTab.real-element.test.tsx`; `tmp/check-r2-show-all-labels-switch/`.

- (2026-10-07) **A clickable DataRow's trailing glyph is part of the row (compact-mantine).** The
  `trailing` slot sits in a `display: contents` wrapper whose click activates the row unless it
  lands on a control inside the slot (`closest()` bounded by the slot). Proof: two tests in
  `compact-mantine/tests/components/rows/DataRow.test.tsx`; `tmp/check-r2-datarow-trailing-hit-area/`.
- (2026-10-07) **Menu-to-dialog focus (b7db5da7d, compact-mantine).** Mantine's
  `useFocusReturn` refocused the menu button 10 ms after close. The Menu theme now remembers the
  opener and returns focus only when focus is inside the dropdown or on body (`overlayBehavior.ts`).
  Finding the button by `aria-labelledby` failed (Tooltip drops the id). Gate:
  `MenuFocusReturn.browser.test.tsx`; proof `tmp/check-r2-menu-dialog-focus/run/`. Open: Export
  dialog Copy fails headless and drops focus to body; compact-mantine `figma/tree.browser.test.tsx`
  is order-dependent on old code too.

- (2026-10-07) Size "+" opens its list (18 of 18 round-2 sizers named the fixed "1"): node Size
  writes the fixed 1, then opens its own bind list with "Fixed size" first. Rejected a separate
  picker (second bind route) and component state (lost on remount). Re-record T9's answer key.

- (2026-10-07) Load and run announced on one status line (store `announcement`, toolbar polite
  region); `StateCard` lost `role="status"`. Gaps: no line at load start; repeated text is not
  re-announced.

- (2026-10-07) Canvas name, focus ring, no autofocus (element, owner door): `aria-label` copied
  to the shadow canvas, ring inset (`outline-offset: -2px`). Proof: `element-canvas-a11y.test.ts`.
  Grouping columns come from `catalog.optionsFor` partition `values` (async; a hook in the app).

- (2026-10-07) A covered legend block is dropped, not flagged (`styles.legend()` omits it; the
  English `painted over by` departure deleted). Rejected a `coveredBy` field and the app parsing
  the sentence. Lesson: when the element "already detects" something, check whether it says so
  only in words -- that is the neutrality defect and often the whole bug.

- (2026-10-06) Focus after a Style pick moves to the new line's first control (e82708488). Study
  runner: idle sessions close after 15 minutes, `--end` after every attempt. Focus rings for
  plain controls are compact-mantine's (28bcb71a0); app code never draws its own.

- 2026-10-06 -- "No crossings" refusal: the element already refused; the app now shows the
  Method select's `error` line (`LayoutRefusal.real-element.test.tsx`). Lesson: test the element first.

- 2026-09-13 to 10-05 -- Standing owner decisions (see Top of mind 6): a run paints as soon as
  it finishes; tier 1 is the real app under `graphty/src/workspace/` at `/?next`. The group-row
  color fallback in `graph-place/rows.ts` stays until #1099 removes it.
- 2026-10-06 -- Study tooling element APIs `nodeScreenPosition(id)`, `elementAt({x, y})`,
  `labelOf(id) -> { text, drawn }`: held PRs merged into the studio worktree; owner to confirm
  names. The element's default layout seed was undone (owner; `owner-decisions.md`); the app seeds
  on the tag and on Method picks (`LayoutSeed.real-element.test.tsx`).
- 2026-10-06 -- Studies run on a local production build of the studio worktree, not on graphty.app
  and not after the release. Owner (this run's brief).

- 2026-10-06 -- Smaller fixes, all proven (`tmp/check-r0-*`): truncated GraphML/GEXF refused
  whole; camera keys ignore chords; Modal always has an overlay; failed open returns to start;
  exported images carry the legend (public `ScreenshotOptions.legend`, owner to confirm); exports
  write a group as its size rank (`owner-decisions.md`).

- (2026-10-07) **Round 2 changes, built and re-piloted (detail folded from Top of mind).**
  Key: `buildLegend()` skips a block `coveredBy()` finds; partial cover keeps its block
  (`legend-covered-layer.test.ts`). Run name: `runName()` in `analyze/words.ts` keeps the scope
  qualifier, passes through labels not starting with the plain name. Grouping: `catalog.optionsFor`
  fills partition `values` with categorical node columns incl. run results; app `groupings()`
  deleted. Size "+": `openListNext()` in `useFocusLine.ts`, "Fixed size" first. 2D Fit: built-in
  view used pixels per unit with aspect inverted; `FLAT_HALF_WIDTH_AT_ZOOM_ONE` in
  `camera/builtins.ts` (also fixes Frame selection, `zoomToNodes` in 2D). Re-pilots confirm each
  on screen. Why it worked: every change traced the cause first and named a test failing on the
  old build.
- (2026-10-07) **Lesson: trace before fixing** (key cover was already proved by the element, only
  in English; 2D Fit was the view's zoom units). Again on 2026-10-07: the halo "hidden but drawn"
  was the frozen mesh list.

## Tried: worked / did not work

- **(2026-10-07) Per-node depth scaling on instanced node meshes: worked.** Setting
  `mesh.scaling` on the instance is enough; edges only follow if their position cache is
  invalidated (their dirty check reads positions, not sizes). Edge ends and arrowheads looked
  right in the repro export.

- **(2026-10-07) Reading the element in a trace script: worked.** A standalone Playwright script
  against :9366 (via `with-browser.sh`), driving the app by role names, then reading
  `nodeScreenPosition(id).radius`, `node.size`, the mesh bounding box and the view matrix.
  A run's per-node values are NOT on `node.data` nor in `session.results.get(run).nodes` (empty
  for a node metric); read them with `session.data.nodePage({ limit: Infinity, columns: [runId] })`.
  The view menu button is found by `getByRole("toolbar", { name: "Canvas tools" })` then name /^View/.

- **(2026-10-06) Screen-reader mode in `real.mjs`: worked** (CDP AX tree on the deep
  `activeElement`; init-script MutationObserver for live regions).

- **(2026-10-06) Open: the live Selection row is blank after the neighbor route**
  (`tmp/check-r1-summary-cleanup/06-08.png`); renders in a headless test. Suspect `useAsyncValue`
  reset on every session version bump; not traced.
- (2026-10-06 to 10-07) **Shared worktree and testing lessons (condensed).** Wait on another
  agent's build by PID, never `pgrep -f "<cmd>"` (their wait loops match). Stage shared files
  as HEAD + only my hunks (`tmp/r3fix-key-view-insets/stage_blob.py <file> <regex>`); never copy
  files over others' edits. Prove "fails without" against HEAD only for a file nobody else has
  edited (`git diff HEAD` first), else a scratch test against a HEAD build. Nx may restore a
  partial element dist (no `.d.ts`): `npm run build` in graphty-element. Copy a good app build to
  the session folder and use `REAL_DIST`. Vitest browser runs go through `with-browser.sh`. The
  Bash safety check refuses `rm -rf $VAR/...`. Probe focus with `--type` before blaming a dead
  key; real-element popover tests need `page.viewport(1366, 768)` and must wait for
  `aria-disabled` to clear; "0 labels" was motion keeping the view unsettled. Never call an
  unexplained failure a flake; two `--prove` runs clobber `tmp/prove/`.

- 2026-10-06 -- Analyze keyboard pick as the ARIA combobox pattern (focus stays in the filter,
  `aria-activedescendant`, first match active): worked; `tmp/check-r0-analyze-keyboard-pick/`.
  The `AnalyzeFiltered` story's baseline changed (owner review).
- (2026-10-06) **Layout and load checks (folded from Top of mind).** Check a layout against a
  reference before a study offers it (Spectral was wrong until matched against numpy). A load the
  counts say worked can still draw nothing (store and render half fed separately in `ingest.ts`):
  assert on `element.graph.getNodes()` too.

## Thinking

- **(2026-10-07) The files a decision lists are a start, not the set.** The run-name decision
  listed ten files; Why this look printed the run's layer name too. Grep every route of the value
  (`run.label`, the name of a run-owned layer) before calling it done.

- **(2026-10-06) Untraced, small.** Header still "Untitled" after "New from data..." Load
  (`tmp/check-r0-new-from-data-empty-canvas/04.png`). `notReadSentence` words only
  `E_PARSE_FAILED`; another open refusal shows element English: map it there from `refusalFor`.

- **Open project or file... reopening a project.** #913 closed in the element with "one intake
  verb"; the app still imports a `.graphty.json` as data. A tier 1 task (save, close, reopen) only
  passes today through Recent projects. Adoption should be a small app change.
## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments that cite element issues (2026-10-06): `export/ImageOutput.tsx` #133;
  `inspector/Inspector.tsx`, `NodeValues.tsx`, `RunValues.tsx` #895; `canvas/LegendCard.tsx`,
  `legendWords.ts` #912; `inspector/GraphValues.tsx` #903/#900; `graphty/src/data/sampleManifest.ts` #796.
- Transcript `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` (2026-10-03 to 10-06);
  owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes;
  visual capture is the whole canvas).
