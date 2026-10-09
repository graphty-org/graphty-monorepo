# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-09) **The path's Weight list already starts on the loaded weight; the round's "starts on
  None" came from sessions that never loaded one.** The four sessions opened the file with "Open
  project or file...", so no weight was loaded and None is right by the item's own rule. Fresh
  build d3d11342a: trails.csv through "New from data...", km as Weight, Farther, Load, P: Weight
  reads "km (farther, loaded)" (`tmp/t2r1-13/a/09.png`). Existing test "the Weight box reads a
  loaded distance as used" covers it, so no app change. The real defect is the route (no way to
  set a meaning from an opened file), which is a different item. Fixed the one stale assertion
  that broke when the weight note was reworded.

- (2026-10-09) **A style line goes only to a layer its row names; nothing falls back to
  Everything.** `writeLine(..., fresh)` in `style/row.ts` takes the layer to add as a required
  argument (`EVERYTHING_LAYER` is exported for the Everything row, `selectionLayer` for a
  selection, `undefined` for a run's or a layer's row) and throws when the row has no layer the
  reader may edit and no layer to add. `RowStyle` offers a side only when the row has a layer on it
  or a layer to add, so a PageRank run shows no Nodes | Edges switch, a path run keeps both, and a
  node-only reader layer no longer offers Edges. `SetLine` and `CompoundSetLine` pass `fresh` too
  (editing a base line on Everything still adds the Everything layer). Test:
  `StyleTab.real-element.test.tsx`, "a PageRank run paints only nodes..." (fails without the fix)
  and "Everything's edge Color goes to the Everything layer...". Real app: `tmp/t2r1-11/a/02.png`
  (PageRank, no switch), `04.png` (Everything edges red, key "Edge color: Everything"),
  `c/03.png` (path run, both sides).

- (2026-10-09) **The canvas key names a stale run as the run list does: "Size: PageRank, out of
  date".** `rowName` in `canvas/legendWords.ts` appends ", out of date" when the block's run has
  `status === "succeeded"` and `run.stale !== null` (the paint tree's own test), so the key, its
  section's accessible name and the exported image's key all carry it. One mark only: no color, no
  dimming of the drawing. The legend re-reads on `run:changed`, so Replace adds it and Rerun drops
  it with no extra wiring. Checked on a fresh build: `tmp/t2r1-10/a/06.png` (after Replace, both
  sections marked), `07.png` (after Rerun, plain). Test: `legendWords.test.ts`, "marks a section
  whose run is out of date".

- (2026-10-09) **Focus and keys in the Filters section, the step editor and the Notes place.**
  The step editor is a `<form>`: Enter adds or saves, Escape (`isPanelEscape`) closes it to the
  step's row, or to "+" for a new step. After Add/Save focus goes to the step's row, after a
  delete to the next row, the one above for the last, or "+" (`focusNext`/`focusStep` in
  `data-place/Filters.tsx`, run on the visibility version). Note chips are named
  "<target>, in note: <first line>" and delete buttons "Delete note: <first line>" (cut at 40), so
  no two controls share a name. The find box needed nothing: compact-mantine `SearchInput` already
  refocuses after the clearing Escape (GraphPlace.test.tsx asserts it; bars "kept"). Test:
  `data-place/__tests__/FilterFocus.real-element.test.tsx`; Notes test asserts the unique names.
  Evidence `tmp/t2r1-7/bars.log`.

- (2026-10-09) **Bars 2, 7, 8 and 9 are scored by script, each check proven on a planted failure**
  (commit 80fb33e68). Bar 2: `real.mjs` writes `work-start.json` after setup and `work.json` at
  `--end` (start, end, `gone` by id; sources by name); `--prove` clears the table and checks it is
  listed gone. Bars 7, 8, 9: `bars.mjs` (page checks shared with real.mjs in `tool/measure.mjs`).
  Bar 7 (a): 29 catalog algorithms x {closer, farther, capacity, unset, no column} x {directed,
  undirected} = 290 runs, 0 wrong readings on builds 946256efb and 1fc173a12. Bar 8 on build
  1fc173a12: focus FALLS to the page after Add step and after Delete (step), axe serious on the
  Filters row (target-size) and the find list (scrollable-region-focusable), and the Notes place's
  target chips are three buttons named "Graph" plus two "Delete note". Bar 9 (b) limits are round
  1's counts on 946256efb (`tool/bars-limits.json`: rest 53, path 66, neighbors 36, edge 30).
  `--prove` passed 5 runs in a row on 1fc173a12 (59 checks each, `REAL_PROVE_DIR` private;
  first-save history under "Tried"). Evidence `tmp/t2r1-2/` (bars-final2/, final-prove-*.log).

- (2026-10-09) **The study tool reached participants more than the build; fixed in the tool.**
  (1) Round 1's overrun: `with-browser.sh` kept its own 4-slot pool in `/tmp` while pre-push gates
  took theirs from the main checkout's `tmp/browser-slots`, so studio sessions (never more than 4:
  only 4 studio lock files ever existed; a session's Chromium dies with its session process, tested
  by SIGKILL) ran beside ~6 more test browsers, load ~158, clicks missed the 3 s limit. The gate now
  takes the machine pool and refuses `BROWSER_SLOTS` > 4; real.mjs --step/--end/--brief pass straight
  through it (r1-s04 waited for a second slot). (2) A shared name is refused with `"<name>#n"`
  candidates (r1-s44's "Enjolras" row). (3) `--drop` uses CDP `Input.dispatchDragEvent` with real
  files; it says "the page took it" or "the drop was not delivered" (no drop event = nothing took
  it); a start-screen drop opens the file. (4) `--brief <dir>` writes briefing.md (persona minus
  team-only sections, history, prompt, start command, tool sections) from the round's plan.md row;
  `--start` refuses a folder holding facilitator files. (5) T17/T18: the first `--end` returns exit
  3 with the follow-up word for word, the second ends. The checked-in runner copy
  (`tier2/rounds/workflow-tier2.js`) now briefs participants; a run started from the older copy
  still sends them to tasks.md. Evidence `tmp/t2r1-1/` (prove.log, six.log, x1/03.png).

- (2026-10-09) **A live region must be in the page, visible, before its words arrive; and it
  holds words only.** The app status line sat in the toolbar under `<main hidden>` while the Data
  page showed, so after Load it reappeared already filled (not spoken), and the canvas wrote it at
  the element's load-end event, before the page renamed the project ("Untitled: ..."). Now the
  region lives in `Frame.tsx` outside every hidden surface; the canvas skips a load while
  `page === "data-page"`, and `DataPage.load()` writes `loadedWords(header name, size, leftOut of
the last source)` after the rename: `--sr` T4 hears "people and messages: 12 nodes, 22 edges, 1
  row left out" once. Same rule for the run state bar (status on its words, buttons outside, kept
  mounted empty) and the find box refusal (a persistent `VisuallyHidden role="status"` that keeps
  its words across keystrokes; no `role="alert"`). Add page summary: "friends: 20 nodes, 41
  edges; friends-v2 adds 0 nodes, 41 edges" (`addWords`, counts = report total minus the graph at
  page open). Evidence `tmp/t2r1-8/sr-t4/14.png`, `tmp/t2r1-8/s29-add/03.png`.

- (2026-10-09) **A list that scrolls only up and down says so: `scrollbars="y"`, and
  compact-mantine makes such content as wide as the area.** Mantine's ScrollArea.Autosize sizes
  its content to `min-content` (the widest row), so a long find result widened the list and it
  scrolled sideways with no "..." (`.cm-result-name` already ellipsized; it was never narrower
  than its text). Fix: `.cm-scroll-viewport[data-scrollbars="y"] > div { min-width: 0 }` in
  compact-mantine `overlays.css.ts`, `scrollbars="y"` on the find list, and `ResultRow` now draws
  its name through `EllipsizedName` (themed tooltip only while cut, carrying the path line too)
  instead of a native `title`. Tests: compact-mantine `Tree.browser.test.tsx` "ends a long name
  in ..." (fails without the CSS: content 383 px in a 200 px area) and graphty
  `GraphPlace.test.tsx` "never scrolls the list sideways" (fails without `scrollbars="y"`:
  3957 px in 414). Real app, long-names.csv: `design/ui/studio/tmp/t2r1-9/s1/04-06.png`. Any
  other vertical list over long text should pass `scrollbars="y"` too.
- (2026-10-09) **The selection halo draws only its back faces, so a selected node keeps its own
  color** (`createOverlaySource` in `Node.ts`; test
  `graphty-element/test/browser/selection-halo-rings-without-tinting.test.ts`). Selection story
  baselines change and go to visual review.
- (2026-10-09, summarized) **Round 1 critique: the dry runs walked only success paths, so build
  defects reached participants on detours** (styling and selection detours no walk covered; e.g. a
  run row's Edges side wrote "Edge color" to Everything via `writeLine`'s default, `r1-s46/05.png`).
  Next dry run must walk each task's commonest detours. Done since: the legend's out-of-date mark,
  the run row's Edges side.
  Still open: find-box "=" hint, "Replace with file..." button in the source inspector. Do not fix
  edge width until a script measures the element's units; do not move Filters.
- (2026-10-09) **Tier 2 screenshot audit (round 1): the app breaks on long names and narrow
  windows, not at the study's size** (`tier2/rounds/round-1/expert/engineer.md`, 24 findings:
  canvas labels cut at the edge, "Back to ..." clipped, popovers over the left panel at 900 wide).
- (2026-10-09) **`REAL_VIEWPORT=<w>x<h>` on `real.mjs --start`** sets the window (default 1440x900).

- (2026-10-09, summarized) **Four word fixes on the path and Replace screens:** the path total
  named by its weight column (`PathValues`), an unread weight says why (`weightRead`), Replace's
  button says "Replace", Shortest path answers chain/quickest/link/between. Evidence `tmp/t2r1-14/`.

## Decisions and reasons

- (2026-10-09) No code change for "the path's Weight list starts on the loaded weight": the
  behavior exists (`WeightField` in `options/OptionsForm.tsx` shows LOADED when the element's plan
  reads it, None when the meaning is unset because the plan skips it). Reason: showing an unread
  weight as chosen would misstate what the run reads. Evidence above.

- (2026-10-08, summarized 2026-10-09) **Dry-run 4 fixes, still standing:** a reopen is framed as
  a fresh fit (`useReservedMargin` waits for `graph-frame-stable`; OPEN owner door: Florentine
  reopens ~60 px lower, camera not saved); Undo/Redo/Escape say what they did
  (`frame/historyWords.ts`); Edit source is a replace, offered only where Replace is; a tooltip's
  side is a request the theme flips; the inspector title takes focus with no mark and Rerun/Back
  keep focus off the page; a click keeps its trigger's tooltips closed until the pointer leaves
  (compact-mantine `overlayBehavior.ts`); check what a finding measured before fixing the code it
  names (Damping 0.85 was Chromium's 32-bit value; `--read` prints `valuetext`).

- (2026-10-09) **A skipped weight's note leads with what the run did.** "Not read -- w's meaning is
  not set, and a path needs a distance" read as gibberish to a participant; the note now opens with
  the unweighted line ("Each edge counts as 1.") and then the one fact that explains it. When the
  meaning is unset, the "needs a distance" clause is dropped: the reader cannot act on it until a
  meaning is set, and the Data page's Higher means row says that already.
- (2026-10-09) **The page that names the graph announces its load.** Rejected: having the canvas
  read the header name at load end (the rename comes after `page.load()` resolves), and writing
  the line on a timer after the place mounts (a timer is a guess; a region that is always present
  needs none). An Add counts the file by what it adds (report total minus the graph at page open),
  so an edge list that names only known people reads "adds 0 nodes, 41 edges": true, where the
  file's own row count would hide repeated edges. Replace says "runs out of date".

- (2026-10-09) **The bar scripts measure in the session the participant would use.** Tier 2's
  screens are walked as `real.mjs` sessions (bars.mjs talks to a session's socket: ops `measure`,
  `work`), not by a second Playwright driver, so name resolution, settling and file pickers are the
  study's own; one `measure.mjs` holds the page checks for both. Each move carries an `--expect`
  for the screen it should reach: on 1fc173a12 `--click Load` on the Replace page silently matched
  other text (the button is now "Replace") and the walk measured the wrong screen until it did.
- (2026-10-09) **What each check counts.** Focus fell = `document.activeElement` is the body or
  null (focus inside graphty-element's shadow root counts as kept). Shared names: reachable,
  not-disabled controls in Chromium's AX tree (button, link, checkbox, radio, switch, tab, menu
  items, combobox, textbox, searchbox, slider, spinbutton); list items (option, treeitem, row) are
  the data's and left out. Bar 7: a run reads the loaded column in its own sense, or reads none
  and answers as on the table with no weight column (max-flow reads its own default `capacity`
  attribute, which is not the loaded column, so it counts as "read none"); seeds fixed at 42 so a
  random start cannot differ between tables. Bar 9 (b): the four screens' words, the limit being
  round 1's count measured on the round 1 frozen build, never a later build's.
- (2026-10-08, summarized 2026-10-09) **Older dry-run fixes, still standing:** study tool `--read`
  prints table rows by cell, takes a visible `labels[0]` for a role target, records the served
  build in `session.json`; sources show counts and "Added"/"Left out" sections
  (`SourceValues.tsx`); compact-mantine `Tree childBand?`, letter/digit type-ahead, capture-phase
  menu Escape, disabled rows skipped, hover tooltips open only after a pointer move (open delay
  1000 ms, so tests wait longer); focus after an action goes to the inspector title. OPEN: Columns
  after "=" omit run results; `edgePage({ scope: "selection" })` empty for edge-only selections
  (owner door); legend loses "Size: PageRank" after Replace; explicit dijkstra over a negative
  undirected weight freezes the page.

- (2026-10-09) **A run row's Style tab offers only the sides the run's own layers cover** (built,
  see Top of mind). A node-only result has nothing to say about edges (the algorithm-styles rule).
  Rejected: a run-named edge layer with an empty selector (paints every edge, breaks the rule).
- (2026-10-09) **Audit findings name the owning package; the canvas label clipping is the
  element's.** The fit frames spheres only, so any app fix (smaller font, padding) would hide an
  element defect. The legend card's label overlap waits on the same element fact (label bounds).
- (2026-10-08, summarized 2026-10-09) **Dry-run 3 and 4 calls, with reasons kept short.** The
  camera stays unsaved (moving the drawing when the legend grows would undo "insets never move the
  drawing"). A step is named by what changed ("changing Size on PageRank"), not a guessed intent. A
  reopened load replaces itself, never adds (an add doubled every edge); where it cannot replace,
  the verb is withheld; Esc exits only an empty import page (no "discard?" dialog). No script focus
  ring after a pointer action (spec 2.7). Tooltip dismissal follows the pressed control, not a
  timer. A one-way path searches the transpose. UI: one label style (`Text xs`); scroll lists snap
  to whole rows; a state-changing button says so before the click ("Save and turn on"); a follow-up
  choice goes below its cause; a script-focused heading gets an underline. A left-out row opens its
  load's whole account, what it names first. A shared control's defect is fixed in
  compact-mantine, an app-specific look is an option. Small: pointer leaves the page after setup; a
  saved note takes focus; a run's time shows seconds; a label's ground is the app's white chip; a
  pointer-opened menu has no keyboard position (row 1 read as the suggestion).
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

- (2026-10-09) Worked: reading the graders' state lines before coding. Each "starts on None"
  session says "no Loaded weight row exists", which turned an implementation task into a
  verification. Did not work: the PathForm suite had one test failing on master of the branch
  since the weight note was reworded (`Each edge counts as 1. weight's meaning is not set.`);
  nobody ran the real-element project after that change.

- (2026-10-09) Seen, not fixed: after Everything's edge color was set, a new path run showed
  "Hidden by your layer Everything" and its Style tab was blank (no sections, no words):
  `defaultRow` returns null when `session.runs.bindings(run)` is empty, and the tab says nothing
  about why (`tmp/t2r1-11/a/06.png`). Without the Everything edit the same run lists both sides
  (`c/03.png`). An empty Style tab should say what the run paints and why it is hidden.
- (2026-10-09) Worked: proving a test fails without the fix with `git diff -- <my files> > patch`,
  `git apply -R`, run, `git apply` (no stash in a shared worktree).

- (2026-10-09) Worked: a module-level "focus next" request taken in an effect keyed on the
  element's change version (the Notes place's pattern) -- focus after the row exists, whatever
  order the editor unmount and the step write land in. For Escape nothing changes in the
  element, so the handler focuses the row directly before closing. Watch out: other agents in the
  worktree commit with broad adds; my Filters/Notes source changes landed inside their
  "repair what merging master broke" commit (9ca8e79c3). Stage and commit own files promptly.
- (2026-10-09) Did not work: planting a bar 2 removal by `styles.remove()` of the last layer (a
  locked default layer stays; nothing went). Worked: `session.data.clear()`, listed gone as the
  source. Did not work: `const WALKS` below a top-level `await outer()` (temporal dead zone); run
  the entry point last. Did not work: `cp -p .husky/_/*` into a temp hooks dir alone -- the shim
  runs `$(dirname $(dirname $0))/<hook>`, so without the top-level hook copies beside `_/` every
  hook silently exits 0; copy both. Commit scope `studio` is refused by commitlint; `tools` passes.
- (2026-10-09) The first-save fault: its two recorded failures were (1) the old picker-save check
  ("a first save is answered and its file copied to the session folder") printing only the
  screenshot path -- that check and the picker save are gone (a first save now stays in the
  browser), so its cause cannot be traced on today's tool; (2) a run where every step after
  "labels are turned on" failed with ECONNREFUSED on the session socket: the session process was
  gone. Mechanism not proven; two `--prove` runs on the default `tmp/prove` folder end each
  other's sessions (`finish()` ends every session folder it knows), so always set
  `REAL_PROVE_DIR`. Five runs in a row on 1fc173a12 with a private folder all passed.

- (2026-10-09) Did not work: leaving my edits uncommitted while another agent committed in the
  same files. Their commit (`17bf87085`) swept my `RunValues.tsx`, `DataPage.tsx` and Replace test
  hunks into its own message. Commit a file's hunks as soon as they pass, or at least before another
  agent's commit window.
- (2026-10-09) Did not work: `open(p, "w").write(f(open(p).read()))` in Python. The write-mode open
  runs first and empties the file, so the read sees nothing; it wiped another agent's uncommitted
  notes. Recovered by replaying that agent's edit scripts from its transcript onto HEAD (byte count
  matched). Always read into a variable, then open for writing.
- (2026-10-09, condensed) Worked: polling `/proc/*/fd` for slot-file holders (`tmp/t2r1-1/holders.sh`;
  `fuser` prints nothing useful); staging only my hunks of shared files (`git update-index
  --cacheinfo`), since real.mjs edits reach every agent's next session; `real.mjs --sr` with Tab and
  Enter to check a live line prints once (pick the visible line by `role !== "status"`); finding a
  layout cause in Mantine's CSS first; reading `scores.md` beside `insights.md`; `long-names.csv`
  for truncation audits, with PIL 4x crops for small text. `--click Graph` takes the rail button.
- (2026-10-08, summarized 2026-10-09) **Older study-tool and test lessons.** Pilot and `--prove`
  on a `cp -r graphty/dist` copy with `REAL_DIST` (others' rebuilds empty the live dist). A test
  must fail without the fix (the Florentine reopen test passed without it; the friends graph in a
  `Workspace` at 1440 x 900 did not). A setup miss can show only in `setup.log`: read it after
  every `--start`. Format only my own files. Prove "fails without" with no stash: copy my files
  aside, write `git show HEAD:<file>` over them, run, copy back. Tool idioms: `role=combobox:Role
of <col>`; an import page needs "New from data..."; step N lands in screenshot N+1; `--sr` focus
  lines tell "not focused" from "focused, no ring". Probes under `with-browser.sh` split "value
  wrong" from "reading wrong". Tests: hover tooltips need `{ timeout: 3000 }`; assert
  `checkVisibility()`; a silent hung browser test is a sync loop (bisect with `-t`); never call a
  failure a flake. `pgrep -f` matches itself (wait by PID); anchor script edits on a unique line.
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
