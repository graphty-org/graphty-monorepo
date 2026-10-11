# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-11) **The table lists what the filter steps keep.** `TableDock.tsx` reads scope
  `"visible"` (a group keeps its member scope) and re-renders on `useVisibilityVersion`; the count
  reads "12 of 41 edges" while a step hides some, "41 edges" when not, in the top bar's words. No
  notice line. Export summaries now say "One row for every edge/node": Export writes every record
  (the element's export cannot be limited to what is showing, #875, #820; left alone). Fresh build:
  `tmp/t2r4-8/fresh/04-07.png`; real-element test in `TableDock.real-element.test.tsx`.
- (2026-10-11) **Cancel in the note editor puts focus on "+"** (`NotesPlace.tsx`: the editor's
  `close()` calls `onClosed`, which focuses "+" as Delete of the last note does; Esc on an empty
  note too). Frozen 5277e2cbe: `focus: nothing (the page itself)`; fresh build: `focus: button
  "Add note"` (`tmp/t2r4-10/sr-old`, `sr-new`, 04.png). bars.mjs move "Cancel in the note editor".
- (2026-10-11) **A briefing never holds what a task asks the participant to find.** The README's
  file table now names each file and its kind only; the answer key's "Facts no briefing may hold"
  lists the facts (`Mo`, `Nia`, `6 - w`, `p13`, `s11`), and `--brief` refuses, `--leaks` voids,
  a briefing holding one. The round's leak check prints, per session, the briefing and every log it
  read. All 56 round 4 plan rows re-briefed clean (`tmp/t2r4-2/rounds/round-5/leaks.out`).
- (2026-10-11) **The gate is checked by `real.mjs --start` itself.** A session of a round
  (`rounds/<round>/sessions/<id>`, or its participant folder) exits 1 with one `FAIL:` line unless
  the round's `plan.md` holds the "Gate evidence" section `--gate` wrote for the frozen build. Round
  4 ran all 53 sessions with no gate evidence and no `bars/bars.json`: the runner's gate step was
  skipped, and nothing else checked. Planted in `--prove` (`tmp/t2r4-1/prove.txt`).
- (2026-10-11) **The round runner starts each session before the participant's turn**
  (`workflow-tier2.js` `startSession`), with `REAL_SLOT_WAIT_SECONDS=540`: no slot means exit 4,
  nothing started, the same start again. A start that never gives `01.png` re-runs as `<id>b` and
  the scorer is told which. Planted: a full one-slot pool (`BROWSER_SLOT_DIR`), exit 4, then a
  start that takes the slot once it frees (`tmp/t2r4-1/.../r9-s04/01.png`).
- (2026-10-11) **Owed: r4-s05b, r4-s20b, r4-s28b.** They need fresh participant agents (never seen
  the key or plan); an implement step has no way to start one. Round 4 needs its gate evidence
  first (bars on 5277e2cbe, then `--gate`), or `--start` now refuses them.
- (2026-10-11) **Bar 9 (b), edge inspector: fails honestly, 29 against 27.** Added "Settings",
  ", full graph", "on 20 nodes"; removed "On the path"; no repeat to cut
  (`tier2/rounds/round-4/bars/edge-inspector-words.md`).
- (2026-10-11) **Round 4 closed: 53 of 53 valid sessions succeeded; bars 9 (b) and 10 fail.**
  Bar 10: drawn names covering ties and dots (element, owner's list) and the find box's "=`10`"
  (fixed since). Shift-click carried T24 to 7 of 7. Three sessions void (full browser slot).
- (2026-10-11) **Round 4 critique, six changes:** (1) DONE: element `suggestBackticks` suggests
  only a rewrite that parses and reads an attribute. (2) DONE: `FindResult.atLeast` rows; bus stops
  "10" offers "minutes is 10 or more (3)". (3) open: app `FindBox.tsx` puts Values first for a
  number. (4) open: element `atLeastOf` writes `data.minutes`; write the bare name (unreleased,
  not breaking). (5) DONE: table lists what the steps keep. (6) DONE: leaving an off step's
  editor unedited leaves it off.
- (2026-10-11) **Not to change after round 4:** Shift-click, toolbar Filters door, Replace place,
  scope words, names off in setups, T18 (8 against 8: no new step there), second path replacing
  the first (no task needs both; decided), any label placement in the app.
- (2026-10-11) **All three single-source claims reproduced on 5277e2cbe; fix them in round 5**
  (`tier2/rounds/round-5/plan.md`, screenshots in `round-5/claims/`): (a) "weight >= 10" on Les Mis
  runs and says only "Nothing matches this rule" -> element refuses with `E_UNKNOWN_ATTRIBUTE`,
  app names the column; (b) Escape on a focused Color swatch reaches `useCommandKeys` (a button is
  neither typing nor overlay) -> `selection.clear`, inspector swaps, focus to page -> app keeps a
  panel's Escape; (c) a click on the "Stadium" chip over the tie selects Stadium (app sets
  `label.pickable`; an unset label plane still stops the ray, `Node.ts`) -> element question.
- (2026-10-11) **Held, first in line:** distance per name at Hops 2/3 (element `depth` option and
  `hops` per `Neighbor`, additive); "4 hops" vs "5 nodes, 4 edges" (sev 1); `nodesInRect(..., {
  labels: true })`; a second Find path replacing the first.
- (2026-10-10) **Not mine to fix in the app, ever:** drawn names covering names and ties, sized
  nodes inside each other (element label placement and layout spacing, owner's list); bare
  numbers in rules, backticks, what an edge width measures (breaking, owner's list).
- (2026-10-11) **A one-specialist claim is scripted on the frozen build before any fix;** not
  reproduced means closed as not shown. Reading the mechanism in source does not replace the script.
- (2026-10-10) **Still open from audits:** Escape does nothing on the Data pages; two-table source
  has no actions and no reason; "Edit source..." lands on "Replace: ..."; neighbor Back row scrolls
  the inspector sideways; path popover covers the nodes it asks for; 900 x 700 canvas is 363 px;
  Delete does nothing on a step; Analyze box jumps as the list narrows.

## Decisions and reasons

- (2026-10-11) **The table's count names the whole only while they differ.** "12 of 41 edges"
  matches the top bar's filter chip word for word, so a reader sees one phrase for one fact; with
  nothing hidden it stays "41 edges", so the unfiltered screen gains no words. Bar 9's screens never
  show the table or the Export dialog, so their counts cannot move. The Export words changed
  "per" to "for every" (same word count + 1, on a screen no bar counts) because the table now
  shows less than Export writes.
- (2026-10-11) **A closed note editor hands focus to "+", where a note is opened.** Same target
  Delete uses when no note is left, so the Notes place has one rule: focus never falls to the page.
  No words change. The real-element test (`NoteDraftFocus.real-element.test.tsx`) failed on the old
  file and passes now.
- (2026-10-11) **A component mounted with a new element reads that element's session, never the
  workspace's.** The workspace hands the session up through state, so for one commit after an
  element is replaced it still holds the disposed one; anything that mounts in that commit (keyed by
  project) and reads it at once throws. Root cause is the app's hand-up, not the element: the
  element is right to refuse a disposed session. Other workspace readers re-run only when the
  session changes, so they never see the gap.

- (2026-10-11) **Answer-key facts live in `answers.md`, never in `real.mjs`.** A participant may
  read `real.mjs` (the leak check allows it), so the self-test plants the first two listed facts
  read from the answer key instead of writing them out. Facts match as whole words outside
  hyphenated names: the first try matched session `r5-s11` as the row `s11` and refused that
  briefing; a regression check now covers it.

- (2026-10-11) **A word count is diffed by word against the limit's own build before any word is
  cut.** The roles' three diagnoses of the edge inspector's +2 were partly wrong ("of nodes" was
  in round 1's count too); `bars.mjs <out> --dist <build>` on both frozen builds named the real
  change in one run each (about 10 minutes). Scope words stay; only a repeat on the same screen
  may go.
- (2026-10-11) **A study rule lives where every caller passes through it.** The gate moved from
  the runner's prompt into `--start`, because the runner is only one caller: continuation scripts
  after a stopped run and hand starts skipped it (round 4). Same for the slot: the wait is bounded
  in `--start` (`REAL_SLOT_WAIT_SECONDS`) so any caller can retry in the foreground, and the runner
  starts the session in its own step so a participant's turn never holds a wait.
- (2026-10-11) `BROWSER_SLOT_DIR` (with-browser.sh) points the slot pool elsewhere, only so the
  self-test can fill every slot without holding the machine's real ones.
- (2026-10-11) **A rule names a column through the element's `rulePath(path)`** (new `./session`
  export beside `quotePath`): the bare name for a `data.` column whose name is one unquoted
  identifier, else `quotePath(path)`. The find box's own `columnText` is deleted and calls it, and
  `atLeastOf` uses it, so the "or more" layer reads "minutes >= `5`". Reason: the app was the only
  place that knew the short spelling, and the element's own rule text disagreed with it. Additive
  (`atLeast` is unreleased); recorded in `owner-decisions.md`. A dotted name ("a.b") stays
  `data.a.b`: the grammar joins segments into one key, so `quotePath` never quotes a dot.

- (2026-10-11, condensed) Built for round 4, walked on fresh builds (`tmp/t2r3-r4-*/`): Shift-click
  adds, Made with after Undo, two focus drops, find "or more" (9b69ca650), Analyze name matches
  first, toolbar Filters (`filters.open`), repeated-ties warning in Load's description, filter step
  counts edges (element `plan`), disabled submit says what is missing, "Distribution" heading.
- (2026-10-11) **The table follows the drawing, by the element's own scope.** Reason: under a filter
  step the table listed 41 edges beside "12 of 41" everywhere else (r4-s27, s21); the element
  already has `scope: "visible"`, so the app needs no computing, only the scope it asks for.

- (2026-10-11) **Round 3 decisions I build to:** study fixed first (gate and T24 key before any
  session); one variant per problem; every fix in its owning package; words at rest do not rise;
  a claim only one specialist made is scripted before it is fixed. Not changed: Replace's place
  and out-of-date marks (8 of 8), the weight's meaning at load, Recent in Analyze, the find box's
  example rule, names not drawn by default (the app's consumer choice), "PageRank, full graph"
  under a filter. Reason: each was read right by every session that met it.
- (2026-10-11) Heading a histogram and its range "Distribution": a heading that repeats its tab's
  name tells the reader nothing, and "distribution" is the standard word for that pair.
- (2026-10-11) Still open from the round 3 critique: element `depth` on `data.neighbors` and `hops`
  on each `Neighbor`, then the app shows each name's hops (Shift-click, "or more", Analyze name
  matches and the toolbar Filters tool are built).
- (2026-10-10) **Owner decision: the chosen segment keeps Figma's face, never an inverse fill.**
  Dark #2c2c2c face, 1px #444 edge on #383838; light white face, 1px #e6e6e6 edge on #f5f5f5;
  `highContrast` gives a 3:1 edge. See `owner-decisions.md`.
- (2026-10-09) Script before calling it a defect (two round 2 "app faults" were the study tool's
  click by name landing on a same-named control); every study-tool change gets a planted-failure
  check.
- (2026-10-10, condensed 2026-10-11) **Typed filter: the badge stays on a marked entry**, never on
  an unmarked first result (it would invent a recommendation); description-only matches stay listed.
  **Bar 9 matches data names as written; ids and values case-blind** (ceiling: an app word spelled
  exactly like a data name). The axe exception is code, excused only while the scroll check holds.
- (2026-10-10) **A warning that changes what Load does is part of Load's description**
  (`aria-describedby` from the ids that show); the glyph is `aria-hidden`. Replace not promoted.
- (2026-10-10, condensed 2026-10-11) **"Or more" counts both kinds of a column, because the rule
  does.** The target is rule text, so it reads every node and edge with that column; a value row
  stays one kind. Number as a JSON literal in backticks; non-finite numbers get no `atLeast`;
  `SearchRequest.scopeInput` keeps a scoped find's rule scoped. Column written with `rulePath`.
- (2026-10-10, condensed 2026-10-11) **Element calls, round 4.** A run's `params`/`seed` read the
  held record history put back, and `rerun()` adopts them (not breaking: documented as "the
  current execution's"). Shift-click on a node adds through a new `SelectionManager.add(node)`
  (additive; edge clicks already did; Shift only; XR `select()` still replaces). A distance per
  neighbor is the element's fact: additive `depth` option and `hops` field, never split in the app.

- (2026-10-10, condensed 2026-10-11) **Round 2 calls I build to.** One change per confirmed
  problem, in its owning package; no feature moves; no second door where one is measured; words
  at rest only go down (rejected: opt-in `bareNumbers`, guessing repeat Adds by file name). A
  scope change gets a `ControlSection`, never a lone `DataRowHeader` (reads as a row missing its
  value). A command with nothing to do is disabled (`data-disabled`/`aria-disabled`, tooltip says
  why); Filter to neighbors is a command, one step per center, its checkbox turns it off. A
  selection notice ends with the selection by a flag; scrolling panes reserve their gutter; one
  focus request per find pick. Repeated announcements keyed by a counter; scope words follow
  `stale.ranOn` against `visibility.summary`. A rule selection's row is the rule's text without
  "=". Path search words go in aliases. Keep `selection.count`. **Leaving the step editor saves**
  a whole rule that differs from the step's (on or off: an unedited off step stays off, 2026-10-11);
  an incomplete rule waits as the "+" draft. Hops/Follow refocus the checked radio after remount.
  Path length words come from one `pathLengthWords`.
- (2026-10-08 to 10-09, condensed 2026-10-11) **Older standing calls.** Only participant folders
  are refused in the studio (pilots, experts, `--prove` start there). 24 px checkbox target is the
  input. Find list scrolls by option id. Read the report type before adding a field. Audits walk
  screens by script at both sizes; no new words at rest. Label picks resolve in `pickNodeId`. Path
  Weight starts on the loaded weight; live regions exist before their words; neighbor list opens at
  the ON step's depth; arrow cursor on every control but a link; a start-screen data file goes
  through the Data page; one neighborhood filter per center; a tool that hides what a person saw is
  fixed in the tool; camera unsaved; reopen is a fresh fit; a resolved option is a caveat, never
  written into params; what a rule tested is `selection.originPaths`. OPEN: Columns after "=" omit
  run results; edge-only `edgePage` selection (owner door); dijkstra over a negative undirected
  weight freezes the page; a reopen once drew no "Opened friends" (not reproduced).

## Thinking

- (2026-10-11) **Watch in round 5:** T22 A on bus stops typing "10"; T17 with the table open
  under a step.
- (2026-10-10) The dry run must walk what participants do, not last round's list: 12 of about 30
  build faults sat on the one detour nobody walked (styling a selection). Pilot each task on the
  candidate build, script the routes, keyboard-press every control, and fix before freeze.
- (2026-10-10) Round 2's study leak biases one way: a problem found anyway is solid, a route that
  worked proves little. So treat every round 2 "pass" on a new route as unmeasured, and every
  confirmed failure as real.
- (2026-10-10) Prompts shape behavior: "stand out" produced the whole styling detour. When a
  finding traces to the prompt's own words, fix the prompt, not the app.
- (2026-10-10) The simulation understates costs a person pays (typing a backtick, guessing Replace
  is "replace"); weigh those findings up, not down.

## Tried: worked / did not work

- (2026-10-11) Worked: the new table test failed on the old scope ("6 of 13 edges" never
  appeared) by a one-line sed back to `"graph"` and forward again, no stash. In real.mjs, `--click
  weight` hit the table's weight header, not the attribute row; `--click "role=treeitem:weight,
  edge attribute"` reaches the row.
- (2026-10-11) Did not work as a check on the frozen build: the bars.mjs Cancel move. The
  "returning" walk stops earlier there, at "leaving an off step's editor unedited" (the off-step
  bug fixed in 8f6426ab6), so every later move is MISS. Checked the frozen build directly instead
  with `real.mjs --sr` (keyboard: n, type, Tab, Enter), which prints `focus:` after each step.
  Plain `--step` prints no focus line; only `--sr` does.
- (2026-10-11) Did not work: running bars.mjs on two builds at once. The two runs want more than
  the 4 browser slots, so three tier 2 sessions of the second run never got one ("the session did
  not start"). Run bars one build at a time. "a node's Values with its neighbors" (tier 1) misses
  on both builds alike: a click timeout, not from the note change.
- (2026-10-11) Claim scripts by pointer, not `--sr`: a pointer route to the same focus (click
  `role=menuitem:Color`) plus `--read` after the Escape showed focus on the page (whole page read).
  Worked, and far shorter than a keys-only walk. For a label-vs-edge pick, hover/click three
  points (centers' midpoint, on the tie inside the chip, on the tie outside it): the third is the
  control that proves the tie itself is clickable.

- (2026-10-11) Worked, built: `rulePath` (element, `./session`); the find box and "or more" both use it.
  On a fresh build, bus stops "5" -> "minutes is 5 or more (10)" -> Style, Width: the layer is
  "minutes >= `5`" (`tmp/t2r4-9/s1/08.png`).
- (2026-10-11) Worked: the real-element test of New project then Discard failed with the same
  `E_DISPOSED` stack (`ElementHost.tsx` `useSizeBound` -> `styles.legend()` -> `data.attributes()`)
  before the change and passes after; it also cleared the follow-on unhandled rejection from the
  old element's Lit update. `real.mjs` cuts a console error at 300 characters, so the full stack
  came from the test, not the study tool.

- (2026-10-11) WORKED: proving an app fix fails without it by copying the fixed file aside,
  writing `git show HEAD:<file>` over it, running the one test (`-t`), and copying the fix back --
  no stash, no checkout. The off-step leave test failed on HEAD (`on: true`) and passed fixed.
  The same moves through real.mjs: 5277e2cbe shows "19 of 20 nodes" after clicking Graph
  (`tmp/t2r4-5/old/05.png`); the fresh build keeps the step off (`tmp/t2r4-5/new/05-06.png`).
- (2026-10-11) WORKED: a mock round (round 4's plan rows renamed `r5-sNN` in
  `tmp/t2r4-2/rounds/round-5/`, `--brief` each, then `--leaks` the round) checks every real
  briefing without touching round 4's records; `--leaks <round dir>` writes `leaks.json` into each
  session copy, so never run it on a closed round's folder to test the tool.

- (2026-10-11) WORKED: `bars.mjs` already targets any build with `--dist`; its word lists are in
  the printed log (`bar 9 (b)` lines) and in `bars.json` under `tier2.words`. The edge inspector is
  screenshot 20 of `sessions/returning-1440x900/`. Round 1's build exits 1 (later moves miss on its
  older screens); that does not touch the screens measured before the miss. A bars run on
  5277e2cbe is in `tmp/t2r4-12/r4-5277e2cbe/bars.json` (not the round's gate run).
- (2026-10-11) DID NOT WORK at first: a planted slot holder `flock <file> sleep 600` killed with
  `.kill()`. flock hands the lock fd to the sleep it forks, so killing flock left the lock held and
  the test's start waited. Spawn it `detached` and kill the process group (`process.kill(-pid)`);
  `--start`'s own give-up kills its session process the same way.
- (2026-10-11) Another agent edited `real.mjs` (answer-key facts in briefings) while I did; their
  two in-progress leak checks failed in my `--prove` run. Not mine: read `git diff` before blaming
  a run, and stage only my hunks.
- (2026-10-11) WORKED: the "or more" row for a number no value equals, all in the element. A
  number column is one whose every indexed value is a number (id column skipped); its row is
  offered when some value lies below N, some above, none equal, deduplicated by path across
  kinds, at most VALUE_ROWS, only when the whole trimmed text is a decimal (`minutes:10` gets
  none: I first tested the prefix-stripped text, and the test caught it). The app maps each row
  to `{ type: "value", row: { ...row, atLeast: row }, orMore: true }` and counts it in
  `foundNothing`, so "No match" no longer shows beside it. No app parsing or counting.
- (2026-10-11) DID NOT WORK: writing test data from memory. I wrote bus-stops rows that matched
  the file's value counts but not its rows; real.mjs's load preview showed the difference. Copy
  fixture rows from the file (`tail -n +2 ... | tr '\n' '|'`), never reconstruct them.
- (2026-10-11) real.mjs `--expect selected=N` counts selected TABLE rows, not graph selection;
  with no table open it says "0 rows are selected" while the inspector says "3 edges selected".

- (2026-10-11) DID NOT WORK at first: another agent rewrote `predicate.ts` from its own read while
  I edited it, and my `rulePath` vanished ("rulePath is not a function"). Re-applied as a
  targeted insert. In the shared worktree, re-check `git diff` on a shared file before building.
  A one-off "failed to resolve" in vitest was a dependency `dist` mid-rebuild; reran clean.

- (2026-10-11) WORKED: the bare-number suggestion fix belonged in the element, not the app. The
  selector's acceptance test is "parses and reads at least one attribute" (compileExpressionPredicate);
  `suggestBackticks` now applies the same test via `collectPaths`. Unit test in
  `test/session/styles/selector.test.ts` fails without it. On a fresh build, typing "10" on bus
  stops shows "No match ... type a rule such as =minutes > `9`"; "=minutes > 9" still offers
  "=minutes > `9`" (`tmp/t2r4-3/bus10/02.png`, `03.png`). No app guard needed.

- (2026-10-11) Worked: reading each round 4 finding's mechanism in source before proposing a fix
  (grep the refusal reason, the leave handler's `unchanged`, the table's scope). Two of six fixes
  turned out to be one word or one condition because the element already had the capability.

- (2026-10-11) **Audit without a wrapper script worked:** one Bash call per walk, each line a
  direct `node real.mjs --step <own folder> ...` with output to `<walk>.log`, run in the background
  (four machine slots were mostly taken by other experts; each start waited, none failed); a later
  batch chained behind the earlier with `until grep -q "session ended" <log>`. Names that changed
  since round 3: "Save and turn on" is "Save step"; "Graph" and "Data" need `role=button:`; the find
  list's lower rows need `--wheel x,y,800` before a screenshot shows them; `--hover-at` on a tree
  row's icon prints its accessible name and tooltip (how the "out of date" name was found).

- (2026-10-11) Worked: wrapping the Tree description in compact-mantine (`overflow-wrap:
anywhere`, row `height: auto; min-height: 44px; padding-block: 6px`, pill and ring `bottom:
4px`). One-line rows look the same (44). Did not do: no-break spaces inside each count phrase so
  "41 to 12" and "edges" stay together; the wrap puts "edges" alone on a third line, which reads
  fine and the acceptance allows.

- (2026-10-11) **Shared files in a shared worktree.** Stage only my hunks (HEAD plus my edits as a
  blob, `git update-index --cacheinfo`). Another agent's commit can sweep up my uncommitted edits
  to a shared file: a test in 115bc0aa4, answer key lines in c9f2ceed3. Commit shared edits
  (`answers.md`, shared tests) as soon as they are made.

- (2026-10-06 to 10-10, condensed 2026-10-11) **Older lessons.** Focus after a pointer click
  draws no ring; `--key ArrowDown` opens a focused Select. real.mjs cannot click aria-disabled
  buttons (prove with `--key Enter` or a real-element test). Descriptions: `--expect
  "described=<text>"`. Pilot on a copied `graphty/dist`. Another agent's rebuild breaks tsc,
  vitest and `bars.mjs` mid-run: copy the dist or rerun. Prove a test fails without the change.
  Read output, not exit codes; step N lands in screenshot N+1; read `setup.log` after `--start`.
  Builds need `NODE_OPTIONS=--max-old-space-size=8192`. Subagent logs under
  `~/.claude/projects/<proj>/<session>/subagents/`. Resuming after an interruption: check `git
  log`, the round folder and `tmp/<task>/` first.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
