# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-09) **A chosen segment is filled, and every control shows the arrow.** compact-mantine's
  panel track fills its chosen option with `--cm-bg-inverse` / `--cm-text-oninverse` (dark in
  light, white in dark; 13:1 and 11:1 against the track) instead of Figma's white face and 1px
  edge, so "Add" / "Leave out" and "a node" / "an edge" read without hovering. One cursor rule in
  `00-foundation.css.ts`: `.mantine-UnstyledButton-root` (doubled class) gets `cursor: default`,
  so the rail, the toolbar and app buttons match Button, Checkbox and segments; only Anchor
  (text drawn as a link) keeps the hand. The filter chip was already the shared Button: no change
  in `Filters.tsx`. Tests: `SegmentedControl.browser.test.tsx` (3:1 fill in both schemes),
  `shared-controls.browser.test.tsx` (one pointer); both fail on the old CSS. Real app:
  `tmp/r2-dry1-shared-chosen-segment-and-cursor/b/03.png`, `04-crop.png`. Visual baselines of the
  segmented stories change; the owner reviews them on the pull request.
- (2026-10-09, condensed) **A data file opened from the start screen goes through the Data page**
  (`openInSession`, `project/actions.ts`); Control+O while the page is open lands as a drop
  (`whileDataPageOpen`). Test `StartScreen.real-element.test.tsx`; evidence `tmp/t2r1-6/a/`.
- (2026-10-09, condensed) **The source's inspector "..." holds the Sources row menu's verbs** through
  one hook, `useSourceActions`; on two loads neither offers anything (Edit source would drop the
  other load). Test `DataPlace.real-element.test.tsx`; evidence `tmp/t2r1-5/a/`.
- (2026-10-09, condensed) **Find answers a condition typed without "=" with how to write it**
  (`readsAsRule` in `FindBox.tsx`, asked of `session.scope.count`), as the field's description.
  Test `GraphPlace.test.tsx`; evidence `tmp/t2r1-4/a/`.
- (2026-10-09, condensed) **The dry run walks the detours as a script: `tier2/pilot/detours.sh all`**
  (30 walks: success paths, `--sr` keyboard walks, round 1's wrong turns, each with `--expect`;
  report `tier2/dry-run-r2-1.md`). Its fixes: pointerdown no longer canceled (2a236410c), short
  Select lists open whole (ca3f10515), note focus and Control+Enter (55e71f98e, 0e9e329c6).
- (2026-10-09, condensed) **The path's Weight list already starts on the loaded weight**; "starts on
  None" came from sessions that loaded none (evidence `tmp/t2r1-13/a/09.png`). No app change.
- (2026-10-09) **A style line goes only to a layer its row names; nothing falls back to
  Everything.** `writeLine(..., fresh)` in `style/row.ts` takes the layer to add as a required
  argument and throws when there is none; `RowStyle` offers a side only when the row has a layer
  on it or one to add (PageRank: no Nodes | Edges switch). Test `StyleTab.real-element.test.tsx`;
  evidence `tmp/t2r1-11/`.

- (2026-10-09) **Words true in every case they appear in.** The canvas key says ", out of date"
  only when `run.stale.reason` is `data-changed` (Replace); under a filter step (`scope-changed`)
  the values still hold for the nodes the run covered, so it reads "Size: PageRank on 20 nodes"
  (`rowName`, `canvas/legendWords.ts`). The unused-weight note reads 'Each edge counts as 1. A path
  needs a distance, and "weight" has no meaning set.' (`weightRead`, `analyze/words.ts`: column
  quoted, every sentence capitalized, reason kept; no one-word last line at 1440). The source
  inspector heads its counts "Loaded", not "Added" (true after Replace). The neighbor heading names
  the center beside the count, "Ava and 14 connections within 2 hops", so it adds up to Selection 15
  (`neighborhoodWords`, `inspector/words.ts`). Tests `legendWords.test.ts`, `words.test.ts`,
  `neighborhoodWords.test.ts`; evidence `tmp/r2-dry1-words-that-misstate/{filter/07,path/04,path/09,
replace/05,replace/07,hood/05}.png`.

- (2026-10-09) **Focus and keys in the Filters section, the step editor and the Notes place.**
  The step editor is a `<form>` (Enter saves, Escape closes to the step's row or "+"); focus after
  Add/Save/Delete is placed by `focusNext`/`focusStep` in `data-place/Filters.tsx`; note chips and
  delete buttons carry the note's first line so no two share a name. Test
  `FilterFocus.real-element.test.tsx`; evidence `tmp/t2r1-7/bars.log`.

- (2026-10-09, summarized) **Bars 2, 7, 8 and 9 are scored by script, each check proven on a
  planted failure** (80fb33e68): `real.mjs` writes `work-start.json`/`work.json` (bar 2);
  `bars.mjs` with `tool/measure.mjs` scores 7, 8, 9; limits in `tool/bars-limits.json`; `--prove`
  passed 5 runs in a row. Evidence `tmp/t2r1-2/`.

- (2026-10-09, summarized) **Round 1's tool faults, fixed in the tool:** one machine-wide 4-browser
  pool (the studio's own `/tmp` pool never saw pre-push gates; load ~158 broke click timing); a
  shared name is refused with `"<name>#n"` candidates; `--drop` delivers real files over CDP; a
  `--brief` folder holds only participant files; T17/T18 `--end` gives the follow-up first (exit 3).
  Evidence `tmp/t2r1-1/`.

- (2026-10-09, summarized) **A live region is in the page, visible, before its words arrive, and
  holds words only.** The status line lives in `Frame.tsx` outside hidden surfaces; `DataPage.load()`
  writes `loadedWords(...)` after the rename ("people and messages: 12 nodes, 22 edges, 1 row left
  out", heard once); run state bar and find refusal follow the same rule. Evidence `tmp/t2r1-8/`.

- (2026-10-09) **The selection halo draws only its back faces, so a selected node keeps its own
  color** (`createOverlaySource` in `Node.ts`; test
  `graphty-element/test/browser/selection-halo-rings-without-tinting.test.ts`). Selection story
  baselines change and go to visual review.

## Decisions and reasons

- (2026-10-09) **A count in a heading is the count the reader can check beside it.** "Ava's 14
  connections" next to "Selection 15" read as a disagreement; naming the center in the heading
  ("Ava and 14 ...") keeps the one-hop count equal to Degree and makes the sum match Selection.
  Chosen over "15 nodes: Ava and 14 ..." as the shorter form. A key under a filter names the run's
  own node count rather than nothing, so a reader comparing 19 shown with 20 ranked sees why.
- (2026-10-09) **Chosen segment fill: the inverse color, not the brand blue.** Measured: brand
  #0d99ff against the light track #f5f5f5 is 2.7:1 (fails 1.4.11) and white 11px text on dark
  brand #0c8ce9 is 3.5:1 (fails 1.4.3); inverse passes both in every palette, accent-independent.
  `--cm-segment-edge` is no longer drawn but stays (removing a published CSS variable would be
  breaking). Mantine marks no option active in a disabled control, so no disabled variant needed.
- (2026-10-09) **Cursor rule: arrow on every control, hand only on links.** The pilots' "other
  controls show the hand" was Mantine's UnstyledButton default (`cursor: pointer`), under the rail
  and the canvas toolbar; the theme's `cursorType: "default"` covered only inputs. The rule goes
  to the arrow (the theme's stated convention), not the hand. The VariablePill keeps Figma's
  pointer: its Figma capture asserts it, and it is not in the app's study paths.

- (2026-10-09, summarized) **A list that scrolls only up and down passes `scrollbars="y"`;**
  compact-mantine then makes its content as wide as the area (Mantine's Autosize used
  `min-content`), and `ResultRow` ellipsizes through `EllipsizedName`. Do the same for any other
  vertical list over long text. Evidence `tmp/t2r1-9/s1/`.
- (2026-10-09) **Tier 2 screenshot audit (round 1): the app breaks on long names and narrow
  windows, not at the study's size** (`tier2/rounds/round-1/expert/engineer.md`, 24 findings).
  `REAL_VIEWPORT=<w>x<h>` on `real.mjs --start` sets the window (default 1440x900).

- (2026-10-09, summarized) **Four word fixes on the path and Replace screens:** the path total
  named by its weight column (`PathValues`), an unread weight says why (`weightRead`), Replace's
  button says "Replace", Shortest path answers chain/quickest/link/between. Evidence `tmp/t2r1-14/`.

- (2026-10-09) **"Accepted" alone is not enough to call plain text a condition.** The element
  reads a bare word ("zzz", a name) as a column reference and accepts it, so the hint would have
  shown for every unmatched name. The app adds one neutral fact the element already returns: the
  accepted rule must match at least one node or edge. No rule syntax is read in the app. Rejected:
  passing `aria-describedby` to SearchInput -- Mantine's Input spreads its own `aria-describedby`
  after the consumer's props and clobbers it; Mantine's `description` prop links it natively.
  Side effect: the line now sits under the box, above the list, where the refusal error already
  sat (a rule with column suggestions shows its line above the Columns list).
- (2026-10-09) **The element no longer cancels pointerdown on its canvas.** A canceled pointerdown
  suppresses the page's mousedown, which Mantine's click-outside listens for. Fixed in the element
  so every consumer gets it; a compact-mantine `clickOutsideEvents` default would have hidden the
  element defect. `user-select: none` on the canvas keeps drags from selecting page text.
  Interactions project: 239 pass.
- (2026-10-09) **A Select list that fits the window opens whole** (shift moves it); only a list
  taller than the window keeps the macOS cut with the chosen row on the field. ponytail: a long
  list near the edge can still be cut to a few rows. Escape in a written note keeps it open; saving
  a project with a note still open is left as a design question (0 of 4 in round 1).
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

- (2026-10-09) **A skipped weight's note leads with what the run did, then why** ("Each edge counts
  as 1." first). Dropping "a path needs a distance" when the meaning was unset (an earlier call)
  left a sentence that began with a lowercase column name and gave no reason; the reason is back,
  before the column, which is quoted.
- (2026-10-09, condensed) **The page that names the graph announces its load** (no timer, no
  canvas read of the header). An Add counts what it adds ("adds 0 nodes, 41 edges"); Replace says
  "runs out of date".

- (2026-10-09, condensed) **The bar scripts measure in the participant's own `real.mjs` session**
  (ops `measure`, `work`; checks in `measure.mjs`), each move with an `--expect`. Focus fell = body
  or null (shadow-root focus is kept); shared names count reachable controls, not list items; bar
  7 seeds 42; bar 9 limits are round 1's counts on round 1's frozen build.
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

- (2026-10-09) Seen, not mine: T7 in `inspector/__tests__/tasks.real-element.test.tsx` failed once
  in a five-file run ("expected '0.5' to equal '0.85'") and passed alone. Mechanism: after Revert
  it waits for the status bar to empty, then reads the Damping field's `value` attribute outside
  the wait; the bar clears in one commit and the number field re-syncs in a later one, so a busy
  browser reads the old value. Fix: read the field inside the `waitFor`.
- (2026-10-09) Worked: proving a CSS fix's test fails without it by writing `git show HEAD:<file>`
  over the edited CSS files (backups in the scratchpad), running the tests, copying the backups
  back -- no stash, no checkout. Worked: `--hover-at` over every control class in one session to
  find which ones disagree before choosing the rule.

- (2026-10-09) Worked: checking a door change by re-walking the dry-run walks of every task whose
  path or setup uses that door (`HERE=... LANES=1 tool/with-browser.sh bash tier2/pilot/detours.sh
T3 T4 T20 T21 T17-P`). It found the silent Control+O loss on the Data page and the 11 setups
  that opened a data file, neither of which the unit tests saw.

- (2026-10-09) Did not work: adding a second load in a test with a bare `session.data.import`:
  its default mode is "replace", so Sources still lists one. Pass `{ mode: "merge" }`. In the real
  app, the Sources "+" is not drawn on this build and a canvas drop lands on an edge and is not
  taken; Control+O with a project open reaches "Add to <project>".
- (2026-10-09) Worked: proving "no hint follows" without a sleep (the test-timing rule) by
  spying `session.scope.count`, waiting until it was called with the typed text, then settling its
  promises inside `act` before asserting.
- (2026-10-09) Worked: `--sr` sessions as keyboard walks; their focus lines give the Tab order to
  script. Did not work: `--expect-not "Filter analyses"` (a placeholder is not on-screen text; it
  passed on the broken build). Prove every check on the broken build first. A miss ("nothing on
  screen is called") exits 0, so only `--expect` fails a walk. A build from the shared tree carries
  other agents' unfinished edits (change 11's style files were in 5ac7ca8f7058): never call it
  frozen. `montage <dir>/*.png -tile 5x -geometry 576x360` gives one sheet per walk to look at.
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
- (2026-10-09, condensed) The first-save fault: one cause is gone with the picker save; the other
  (ECONNREFUSED, session process gone) is unproven. Two `--prove` runs on the default `tmp/prove`
  end each other's sessions: always set `REAL_PROVE_DIR`.

- (2026-10-09, condensed) Did not work: leaving edits uncommitted while others commit in the same
  files (`17bf87085` swept my hunks); commit as soon as hunks pass. Did not work:
  `open(p, "w").write(f(open(p).read()))` empties the file before the read; read first, then write.
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

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
