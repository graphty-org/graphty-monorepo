# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

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
- (2026-10-09) **Round 1 critique: the dry runs walked only success paths, so build defects
  reached participants on detours.** Four dry runs plus a walk of the study build left every
  success path clean (all `session.log` empty, no grade decided by a defect), but participants took
  styling and selection detours no walk covered. Verified in code: a run row's Style tab offers
  Edges, and with no edge layer in the row `writeLine` (`style/row.ts`) falls back to its default
  `fresh = EVERYTHING_LAYER` (StyleTab.tsx line 112 passes none), so "Edge color" lands on
  Everything and the open panel stays empty (`r1-s46/05.png`). Smallest fix: a run row offers only
  the sides its own layers cover. Next dry run must walk each task's commonest detours. Other
  round 2 proposals: a find-box hint offering the "=" rule when "="+text passes the element's rule
  check (`FindBox.tsx` ~355); "Replace with file..." as a button in the source's inspector; an
  out-of-date mark on the legend key from `run.stale`. Do not fix edge width until a script
  measures the element's units (`EdgeMesh.ts` *20 and /40); do not move Filters.
- (2026-10-09) **Tier 2 screenshot audit (round 1): the app breaks on long names and narrow
  windows, not at the study's size** (`tier2/rounds/round-1/expert/engineer.md`, 24 findings:
  canvas labels cut at the edge, "Back to ..." clipped, popovers over the left panel at 900 wide).
- (2026-10-09) **`REAL_VIEWPORT=<w>x<h>` on `real.mjs --start`** sets the window (default 1440x900,
  recorded in `session.json`). A private walk script (one `walk` per screen, like
  `tier2/pilot/rewalk.sh`) run at two sizes in parallel took two browser slots and ~25 min.

- (2026-10-09) **Four word fixes on the path and Replace screens.** The path total is named by the
  weight column it read ("Total minutes 14", `RunValues.tsx` `PathValues`); a weight the path left
  unread says "Each edge counts as 1. weight's meaning is not set." (`weightRead`, `analyze/words.ts`;
  a set but wrong meaning keeps its reason: "Each edge counts as 1. emails means closer, and a path
  needs a distance."); the Replace page's button says "Replace" (`Footer` takes `action`); Shortest
  path answers chain, quickest, link and between and says "shortest path by weight". Tests:
  analyze `words.test.ts`, `PathRun.real-element.test.tsx` "names the total by the weight column",
  `Replace.real-element.test.tsx`. Real app: `design/ui/studio/tmp/t2r1-14/s1/13.png`, `16-19.png`,
  `s2/10.png`, `s2/14.png`.

## Decisions and reasons

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

- (2026-10-09) **A run row's Style tab offers only the sides the run's own layers cover.** Reason:
  `writeLine` adds `EVERYTHING_LAYER` when the row has no layer for the target, so Edges on a
  node-only run wrote to the whole graph. A node-only result has nothing to say about edges (the
  algorithm-styles rule), so the segment should not be there; a path run keeps both sides because
  its layers cover edges. Rejected: a run-named edge layer with an empty selector (paints every edge,
  breaks the rule).
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
- (2026-10-09) Worked: a 1-second poll of `/proc/*/fd` for holders of each slot file shows which
  pool every browser is in (`tmp/t2r1-1/holders.sh`). Did not work: `fuser` on the lock files
  (prints nothing useful). Editing real.mjs in the shared worktree changes every agent's NEXT
  session at once (the session process loads the file at start); another agent edited real.mjs in
  the same hour, so stage only your own hunks (build the staged copy from HEAD plus yours,
  `git update-index --cacheinfo`).

- (2026-10-09) Worked: `real.mjs --sr` with the two-tables setup, then `--key Tab` from Cancel to
  Load and `--key Enter`: the live line printed once with no "unconfirmed" mark. Typing a refused
  rule printed the refusal once; a further digit kept the same words and printed nothing. Did not
  work first: a `findByText` on the refusal once its words were in two places (visible line and
  status region); pick the line by `role !== "status"`. TableDock's export preview test failed in
  the full real-element run and passed alone: its `waitFor` keeps the 1 s default while the export
  preview is written asynchronously under 168 parallel files (not touched by this change).

- (2026-10-09) Worked: finding a layout defect's cause in Mantine's own CSS before touching the row.
- (2026-10-09) Worked: reading `scores.md` beside `insights.md` (skeptics can lower a severity).
- (2026-10-09) Worked: `long-names.csv` (with PageRank, Size and every label drawn, setup in the
  audit's own file) is what surfaced every severity 3 truncation; the study datasets hide them.
  Did not work: `--click "Add to Shape"` on Everything's Style tab (Shape has fields there, no
  "+"); `--click Graph` is ambiguous with the inspector heading (the tool takes the rail button).
  Crop and zoom (PIL, 4x) to judge small text and swatch contrast; `friends .csv` in a 10 px
  subtitle was font hinting, not a space.
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
