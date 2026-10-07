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

1. (2026-10-07) Re-measured for tier 2 on build b40f264a9 (`next-steps/verify/results.md`):
   every unit's tests, bars dark + light (axe 0/13 both, 41 words at rest), `--prove` and the
   app checks pass, except Force at spring length 80, still an even cloud (ngraph physics, not a
   frozen engine; bounding the field is an open app choice). Round 3 repro scripts count Tabs
   from the page body, so their leftover "page itself" lines are Tab overruns, not focus loss:
   re-count Tabs before reusing them. A regression on a fixed path is mine to trace first.
1a. (2026-10-07) A committed file can differ from what was built: 2538731dc committed
   `camera/builtins.ts` mid-edit (did not compile) while every build used the working copy
   (fixed ebb2cfcba). Before trusting a build stamp, `git status` for modified source; a stamp
   says nothing about uncommitted files.
2. (2026-10-07) Focus after close FIXED (element + app + compact-mantine). Targets: a graph opens
   (sample, file, recent, New project, Data page Load) -> the drawing; start screen comes back,
   usage card answered, file refused, last Recent row removed -> "Open project or file...";
   Recent row removed -> the row now in its place; style line removed -> its section's first
   control; tree row deleted -> the row now in its place (Tree); table or notice closed -> the
   drawing; members chip x -> Nodes tab; New from data... -> "choose a file...". Dialogs and
   menus return to their opener (the drawing too, via `delegatesFocus`). Keyboard repro scripts
   written before this count Tabs from the page body: re-count them from the new focus.
3. (2026-10-07) Element English on screen: layout refusals FIXED (481c6715a, owner door, hold +
   needs-decision): `CostEstimate.refusal` = `{ code, params }`, 16 codes (`layout.*`,
   `algorithm.*`, `estimate.*`); app words in `layout/refusalWords.ts`. Still English: Analyze's
   algorithm refusals (codes exist, app words not written -- `AnalyzePopover.tsx` `estimate.reason`),
   `MetricAvailability.reason`, layout descriptions (`catalog/layouts.ts`, "with `dim: 2`",
   "centre"), `run.label`, partition choice labels (`root.label`).
   Fix = codes from the element, words in the app; never an app rename or string match.
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
12. (2026-10-07) Bars: 41 app words at rest (limit 50); axe 0 on all 13 screens in both schemes
   (`tool/bars.mjs <out> --scheme light`). New `c="dimmed"` text sits on panel/field/menu, never
   on default-hover. Trust a scripted repro or a cause in code over a participant count.
13. (2026-10-06) Iterate locally: element build, then `pnpm exec nx run graphty:build`, re-run
   with `tool/real.mjs`. Others rebuild `graphty/dist` often: copy the build and use
   `REAL_DIST=<copy>`; check `pgrep -af "real.mjs --prove"` before trusting a FAIL. Never push.
   (2026-10-07) The app's vite build now runs out of Node's default 4 GB heap ("rendering
   chunks", core dumps in `graphty/`): build with `NODE_OPTIONS=--max-old-space-size=12288`.
   Other agents rebuild the element mid-build; wait until no element build runs first.
14. (2026-10-07) Focus: the compact-mantine Menu theme returns focus only from inside the menu;
   never add `returnFocus={false}` again. The canvas has no autofocus; the app hands focus to the
   drawing with `element.focus()` (host `delegatesFocus`). A control that removes itself must
   name where focus goes (`frame/focus.ts focusIsLost()` before handing it on); never leave it.
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

- (2026-10-07) **Export Data warnings worded by the app (eef118341, no door).** `export/lossWords.ts`:
  one sentence per loss code from `code`, `column`, `count`, never `message`; unknown codes get a
  generic sentence. This branch reads `lossNotes`; after merging master switch `DataOutput` to
  `result.losses` (`{ code, params: { columns[], count } }`, 8a2450863).
- (2026-10-07) **CSV adjacency export fixed (2143deaae).** The catalog's `header` default true
  made every adjacency CSV export fail; `writerFor` drops an unasked `header` for adjacency.
- (2026-10-07) **Focus after a control goes (element + app + compact-mantine; owner door).**
  Element: `delegatesFocus`, `render()` returns `nothing` (Lit moved the container and dropped a
  focus given at mount). App: new project's drawing focused when its element comes up; per-control
  targets (UsageDataCard, RecentProjects, NoticeSlot, DataPage, TableDock, Style removes). Tree: a
  deleted focused row hands focus on. Rejected: autofocus on load, reaching into the shadow root.
  Proof: `FocusAfterClose.real-element.test.tsx`, `element-canvas-a11y.test.ts`, Tree test.
  Open: the WebGPU canvas swap still drops a focused canvas (unmeasured; the app runs WebGL).

- (2026-10-07) **Force publishes the defaults ngraph runs (b6011c01d, element, no API change).**
  ngraph has no `static descriptor`, so its zod defaults (spring 30...) were documentation only;
  the engine ran ngraph's own (10, 0.8, -12...). Schema defaults now = ngraph's; constructor uses
  `getDefaults(schema)`. Rejected: honoring old values, scaling repulsion (owner door), stricter
  settle. Proof: `test/browser/force-reapplied-settles.test.ts`, `tmp/r3fix-force-reapply-cloud/`.

- (2026-10-07) **A size bound to data compares at any depth (element option, owner door).**
  `node.depthIndependentSize` (optional, not `.default(false)`: a default makes the parsed field
  required). `UpdateManager.sizeNodesForDepth()` scales meshes by depth over pivot depth (orbit +
  perspective only), invalidates edge caches; `pictureIsFinished()` false until applied. Proof:
  `test/browser/camera/depth-independent-size.test.ts`, T9 test in `StyleTab.real-element.test.tsx`,
  `tmp/r3fix-fix-3d-size/`. Rejected: on by default, element deciding, app warning.

- (2026-10-07) **A capture of another size is drawn at that size (6783ba895, element only).**
  Babylon's `CreateScreenshotAsync` stretched the canvas; a same-shape other size now uses
  `CreateScreenshotUsingRenderTargetAsync`. Line width is in pixels, so
  `CustomLineRenderer.setPixelScale(scene, k)` during the capture. Labels (48 px/line) did not
  need re-rendering. Proof: `test/browser/screenshot/screenshot-sharp-names.test.ts`,
  `tmp/r3fix-export-sharp-names-4x/run/`.

- (2026-10-07) **"Whole graph" export keeps the on-screen angle (6f1cf692b, owner door).**
  `fitToGraph` `keepAngle` (default false) keeps direction and roll, fits every padded corner of
  the bounds box; `ScreenshotOptions.camera` takes `{ preset, params }`; app `cameraOf()` asks for
  it. Rejected: a new view id, a new default, app camera math. Proof:
  `test/cameras/fit-to-graph-keep-angle.test.ts`, `tmp/r3fix-export-whole-graph-angle/`. Ceiling:
  boxing, not nodes, leaves ~20% margin; tighter needs node positions in `CameraViewInput`.

- (2026-10-07) **Layout refusals as codes (481c6715a, owner door).** `refused(reason, code,
  params)` in `cost/estimate.ts` builds sentence and code together; union `EstimateRefusalCode`;
  a grouping refusal names its run (`PlanningContext.runOf`) so the app uses `runName()`. App
  deleted its partition pre-check. Proof: `test/session/estimate-refusal-codes.test.ts`,
  `LayoutPopover.real-element.test.tsx`, `tmp/r3fix-layout-refusal-codes/`. Gap: the inspector's
  Method select disables a refused layout with no reason shown.

- (2026-10-07) **Export leaves the selection ring out (4c087d8bc, owner door).**
  `ScreenshotOptions.showSelection` (default true); false hides halo meshes and calls
  `meshesShownOrHidden()`. Proof: `test/browser/screenshot/screenshot-selection.test.ts`.

- (2026-10-07) **The key never covers a node: view insets (fa260f20d, owner door).** Element
  `viewInsets` (`setViewInsets`/`getViewInsets`, `CameraViewInput.insets`, device px);
  `camera/insets.ts freeArea()`; 2D and `fitToGraph` size into the free area, orbit uses a lens
  shift so the graph still turns about its center. A framed capture insets by the key it draws
  (`legendBox()`), not the screen's. App `LegendCard` `useReservedMargin`. Proof:
  `test/browser/camera/view-insets.test.ts`, `tmp/r3fix-key-view-insets/`.

- (2026-10-07) **Show all labels (b7590f8de, app only).** Checkbox by the label count; store
  `allLabelsShown` (not saved) -> `layoutBehavior.labels.declutter` on the tag.

- (2026-10-07) **A DataRow's trailing glyph clicks the row (compact-mantine)** unless the click is
  on a control in the slot. Tests in `DataRow.test.tsx`.
- (2026-10-07) **Menu-to-dialog focus (b7db5da7d, compact-mantine).** Mantine's
  `useFocusReturn` refocused the menu button 10 ms after close. The Menu theme now remembers the
  opener and returns focus only when focus is inside the dropdown or on body (`overlayBehavior.ts`).
  Finding the button by `aria-labelledby` failed (Tooltip drops the id). Gate:
  `MenuFocusReturn.browser.test.tsx`; proof `tmp/check-r2-menu-dialog-focus/run/`. Open: Export
  dialog Copy fails headless and drops focus to body.

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

- 2026-10-06 -- Smaller fixes proven in `tmp/check-r0-*`: truncated GraphML/GEXF refused whole;
  camera keys ignore chords; failed open returns to start; exports carry the legend.

- (2026-10-07) **Gray helper text contrast (3680c6698, compact-mantine).** Dark dimmed text
  #a3a3a3, light gray-6 #6e6e6e, light `--cm-text-secondary` #0000008c; export preview moved off
  default-hover. Test `tests/theme/text-contrast.test.ts`. Left: placeholders (40%) under 4.5.

## Tried: worked / did not work

- **(2026-10-07) compact-mantine figma tree test failing only in a mixed run: traced, fixed
  (b40f264a9).** Not hover (pointer parked), not focus: the `touchDrag` command left CDP touch
  emulation on, so `(hover: none)` matched in every later file and the tree toggles showed.
  Debugged with one temporary `console.log` of `:hover`, `:focus-within` and computed opacity.
  Lesson: an order-dependent browser test means leaked page state (emulation, media, pointer).

- **(2026-10-07) Sources row of a single-table file opens its table: FIXED (71be6d4fb).**
  `DataPlace.openSource` now finds the clicked row (top level or child) and opens the table dock
  on its `kind` unless it is a `file` row; before, only the ids `source:nodes`/`source:edges`
  opened, so an edge list's lone row (id `source`, kind `edges`) did nothing. Test: the
  real-element test opens the file with `session.project.open(file)` then `draft.load()` -- the
  app's route. `data.import({ config: { file } })` or `{ type: "csv", config: { data } }` gives
  `nodeRecords > 0` and so a two-table row: use the open route to reproduce a single-table
  source. Checked on the app: click and keyboard-only Enter (dock closed first) both open Edges,
  41 edges (`tmp/r3fix-sources-row-opens-table/`). `real.mjs --read` reads only the focused
  region, so the dock shows in the PNG, not in the read text.

- **(2026-10-07) Probing every export's loss codes with a throwaway real-element test: worked.**
  Import the four samples with `?raw`, run Louvain, loop `formatRows(session.catalog.formats())`
  through `element.exportGraph`, print the notes: ~33 codes in practice, plus the adjacency bug.
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

- (2026-10-06) Worked: screen-reader mode in `real.mjs` (CDP AX tree, live-region observer);
  Analyze keyboard pick as the ARIA combobox pattern (`tmp/check-r0-analyze-keyboard-pick/`).
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
