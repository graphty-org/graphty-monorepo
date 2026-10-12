# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "tier 1" is a first-time
user's core path (open, read, analyze, color or size by a result, names, find a node and its
neighbors, export, save and reopen); "the walk" chains it end to end as the build's acceptance
test. "The studio worktree" is `.worktrees/design-studio-tier1` (branch `design/studio-tier1`).

## Top of mind

- (2026-10-12) **The style tree is built in graphty-element** (`src/session/styles/tree.ts`):
  `styles.tree()` plus addFolder, renameRow, moveRow, pinRow, lockRow, hideRow, deleteRow; error
  `E_LOCKED`; saved as `StyleDocument.tree`. The app's panel reads rows from it and never orders
  layers itself. Not yet exercised in a browser or by the renderer twin of the history fixtures.
- (2026-10-12) **Rows on both kinds are built in the element** (`styles.addRow`, `writeRow`,
  `parts`; `session/styles/rows.ts`): a "both" row is a node part and an edge part right under it,
  sharing a selector, tied by `Layer.row` (the node part's id). Writes route by channel kind
  (`color` both, `width` edges); remove and move on a part move the row; the tree keys the pair by
  `row`. New edge reading `incident` (touching) beside `induced` (between), rules only. Why two
  parts: one layer painting both kinds changes `target`, which is breaking. Limits: a write's
  history step lists no channels; `Valjean` and `Javert` are neighbors in Les Miserables, so their
  shortest path is one edge -- the 5-node, 4-edge test route is Napoleon to Tholomyes.
- (2026-10-12) **Never `open(p, "w").write(f(open(p).read()))` in a script**: the write opens and
  truncates before the read, and it emptied `owner-decisions.md` (restored from HEAD and the
  entries read before). Read into a variable first. Shared files here change under you: build a
  unit's commit from HEAD plus its own edits (a replay script and a scratch worktree), never
  `git add` a file another agent is editing.
- (2026-10-12) **Panel facts built in the element**: `styles.agreement(scope, channel, { below })`
  cuts the painted stack beneath a tree row (rows met before it in the tree walk are exactly the
  consumer layers beneath, since tree order is paint order); `styles.preview(binding, { channel,
  bins })` runs the repaint's own `prepareBinding` plus `previewBinding` (`encoding.ts`): numeric
  bins are equal stretches of the scale's position (bin edges found by bisection, so plugin scales
  work), stepped scales bin in data units and report `steps` (new `PreparedBinding.steps`);
  binding `stops` is an inline palette (`palettes.ts` `inlinePalette`, legend id `custom`). Why:
  reuse the one preparation so a preview cannot disagree with the paint. Limit: a continuous bin's
  `paints` is its middle's color, so only a value at the middle matches it exactly; the ramp
  editor should draw the ramp, not one color per bar, if that ever reads wrong.
  (2026-10-12, re-checked) Kept as is: Clear's tooltip needs only `agreement(..., { below })`,
  which already names the value beneath and its `layerId` (or a per-layer breakdown when mixed),
  so no `from` field was added. 9 preview tests pass.
- (2026-10-12) **The style tree is built in graphty-element** (`src/session/styles/tree.ts`):
  `styles.tree()` plus addFolder, renameRow, moveRow, pinRow, lockRow, hideRow, deleteRow; error
  `E_LOCKED`; saved as `StyleDocument.tree`. The app's panel reads rows from it and never orders
  layers itself. Not yet exercised in a browser or by the renderer twin of the history fixtures.
  (2026-10-12, rechecked) Only two row kinds, layer and folder; split children are ordinary
  layers under a folder, so no "split parent" row exists. `styles-tree.test.ts` stays green (7)
  with the split-to-values rename in flight; a run mid-rename fails on a missing `./split`
  import, which is the other agent's half-built state, not a tree defect -- wait and rerun.
- (2026-10-12) **Split by value is built in the element** (`styles.split`, `unsplit`,
  `setSplitOverride`, `splitChildren`; `session/styles/split.ts`). A child's override is the
  parent binding's `map` entry, so palettes reach every other child and unsplit is free; a re-run of
  a partition run matches groups by shared members inside the run's own step (`RunsApi.commit`).
  Limit: a child overrides only channels the parent paints by the split value; overriding a fixed
  property needs generated child layers in the stack. The tree must still show split rows from
  `layer.split` and `splitChildren` (the tree unit was in flight beside this one).
- (2026-10-12) **Generic rules built in the element** (commit "generic layer rules"): selector
  `{ match: "rule", where, edges? }` (a member of the inline rule set, so live scopes and data
  dependencies come free); `RuleTree` leaf `{ kind: "text", reads: "id" | path, mode, text,
caseSensitive? }` on one matcher `textMatcher` (`session/text.ts`) that selection's `textTest`
  also runs; `FindValueRow.rule` (exact, case-sensitive leaf); top N by a data column is the existing
  `threshold` leaf. Why: reuse beat new machinery; the member path already watches and repaints.
  Not done: `{ match: "top" }` still refuses `data.*` (use the rule); `stabiliseEdgeRefs` does not
  walk a rule selector's member leaves (a session edge id inside one is not made stable).
- (2026-10-12) **Worked: staging my hunks when another agent's half-built work breaks the build.**
  `git apply --cached --unidiff-zero` of a FILTERED -U0 patch misplaces hunks; instead build each
  mixed file's blob as HEAD plus my -U0 hunks applied bottom-up by old line number
  (`git hash-object -w` + `update-index --cacheinfo`). Then `git archive $(git write-tree)` into
  `tmp/<task>/iso`, symlink the rest of the repo and `node_modules`, `tsc -p tsconfig.build.json`,
  and run `tools/api-report.mjs` by its REAL path (a symlinked path skips its main guard silently).
- (2026-10-12) **Split by value is built in the element** (`styles.split`, `unsplit`,
  `setSplitOverride`, `splitChildren`; `session/styles/split.ts`). A child's override is the
  parent binding's `map` entry, so palettes reach every other child and unsplit is free; a re-run of
  a partition run matches groups by shared members inside the run's own step (`RunsApi.commit`).
  Limit: a child overrides only channels the parent paints by the split value; overriding a fixed
  property needs generated child layers in the stack. The tree must still show split rows from
  `layer.split` and `splitChildren` (the tree unit was in flight beside this one).
- (2026-10-12) **Tier 3 (unified styles) started; my answers to the owner's 12 questions are in
  `tier3/decide/engineer.md`.** The studio worktree is now `.worktrees/design-studio-tier3`
  (branch `design/studio-tier3`). The owner approves the built UI before any study.
- (2026-10-12) **Element facts the tier 3 build leans on** (cite, do not re-derive): layers still
  paint one kind (`Layer.ts:112`, a breaking change to widen); selectors are everything, expression,
  has, ids, top, member (`selector.ts:98`); a member selector takes `{ define: rule }`, so a
  `RuleTree` (range, categories, degree, neighborhood, threshold, all, any) reaches a layer; no
  rule has a text test or functions, while selection has substring, exact and regex
  (`selection/targets.ts:68`); `styles.proposeEncoding` answers fit per column cheaply; lighting
  (`config/Lighting.ts`) is on this branch and absent from the mock; `LabelStyle` has `onTop` and
  `pickable` here (49 fields).
- (2026-10-11) **Round 5 audit on 8c015b806 done** (`tier2/rounds/round-5/expert/engineer.md`): five
  round 4 fixes hold; new: an edge-only filter step marks runs "out of date" with "Ran on 20 nodes;
  20 shown now" (needs edge counts in `run.stale`, element, additive); table count cut at 900.
  "Or more" row still below the find list's fold (sev 3, app). Edge-only walk added at 900 x 700
  the same day (same words); every walk now exists at both sizes.
- (2026-10-11) **Round 5 runs on frozen build 8c015b806** (graphty@0.8.65, `.study-builds/tier2-r5-8c015b806/`);
  the first dry run is triaged with no fixes (d2440153c). Never touch that build; fixes go to round 6.
- (2026-10-11) **Owed before round 5's sessions: r4-s05b, r4-s20b, r4-s28b** on 5277e2cbe, new
  folders, fresh participant agents, scored into round 4. Not run yet (no folders). Gate evidence
  for round 4 is in place (c256dc839), so `--start` accepts them.
- (2026-10-11) **Round 4 taught: a study rule lives where every caller passes.** The gate and the
  bounded slot wait are in `real.mjs --start` (571a15488); briefings name file and kind only and
  `--leaks` reads briefings (2d085d627). Watch in round 5: both refusals fire on their own, no void.
- (2026-10-11) **Round 4: 53 of 53 succeeded; bars 9 (b) and 10 failed.** Bar 10 on drawn names
  covering ties and dots (element, owner's list) and the find box's "=`10`" refusal. Shift-click
  took T24 to 7 of 7, discounted for priming (briefing lists `--shift-click`).
- (2026-10-11) **Watch T22 in round 5:** credit "10" reaching the right stops with no refusal, not
  a pick of the "or more" row (the prompt and the row share the words).
- (2026-10-11) **Watch T17:** the table count ("12 of 41 edges") agrees with the top bar; histories
  no longer name the toolbar's analysis button, so a toolbar-first door is less primed now.
- (2026-10-11) **Bar 9 (b), edge inspector 29 against 27,** fails honestly: added scope words stay;
  only a repeat on the same screen may go. Diff words by build (`bars.mjs --dist`) before cutting.
- (2026-10-11) **Three claims reproduced on 5277e2cbe, fix in round 6 build** (`round-5/claims/`):
  "weight >= 10" on Les Mis says only "Nothing matches" (element `E_UNKNOWN_ATTRIBUTE`); Escape on a
  focused Color swatch clears the selection (app keeps a panel's Escape); a click on the "Stadium"
  chip over the tie picks Stadium (element pick question).
- (2026-10-11) **Open from round 4 critique:** `FindBox.tsx` Values first for a number (held: no
  task met the row below the fold).
- (2026-10-11) **Held, first in line:** hops per name at Hops 2/3 (element `depth` and `hops`,
  additive); "4 hops" vs "5 nodes, 4 edges" (sev 1); `nodesInRect(..., { labels: true })`.
- (2026-10-11) **Not to change:** Shift-click, toolbar Filters door, Replace place, scope words,
  names off in setups, T18 (8 against 8), second path replacing the first, label placement in the app.
- (2026-10-10) **Never mine in the app:** names covering names and ties, sized nodes overlapping
  (element label placement, layout spacing); bare numbers in rules, edge width meaning (breaking).
- (2026-10-11) **A one-specialist claim is scripted on the frozen build before any fix;** reading
  source does not replace the script.
- (2026-10-10) **Still open from audits:** Escape on Data pages; two-table source has no actions;
  "Edit source..." lands on Replace; neighbor Back row scrolls sideways; path popover covers nodes;
  Delete does nothing on a step; Analyze box jumps as the list narrows.

## Decisions and reasons

- (2026-10-12) **The style tree rides on the stack array, not in a new project slice.** The
  `styles` slice is the stack, and undo keeps it by reference, so a tree carried as a property of
  that frozen array comes back with every undo, redo and rollback with no new slice, draft writer
  or project-file member. The draft's no-op test and the state digest read it too (a tree-only
  change is a step). A plain tree (no folder, pin, lock or hidden row) is not carried, so existing
  stacks, digests and saved documents are byte for byte what they were.
- (2026-10-12) **Order lives in the tree; other verbs' placements are reconciled into it.** A layer
  another verb adds goes into the deepest folder holding both its stack neighbors, just above the
  one beneath it; a legacy `move` re-places its row the same way. Then pin bands are restored, so
  the stack always equals the flattened tree. Reason: one source of truth for paint order, and no
  verb can leave the panel showing an order the canvas does not paint.
- (2026-10-12) **A hidden row reads as disabled only where painting is decided** (repaint,
  `compiled()`, legend, `explain`), never in `list()`. Reason: the eye is the reader's view, not
  the author's `enabled`, and showing the row again must restore exactly what was written.
- (2026-10-12) **The reader's lock refuses content edits only** (`update` and what goes through
  it), not rename, move, pin, hide or delete, as Figma's lock does; a new code `E_LOCKED` because
  `E_PROTECTED` means "the element owns this".
- (2026-10-12) **Tier 3 recommendations, and why** (full text in `tier3/decide/engineer.md`):
  a 0-or-1 property is an always-present row whose empty field means off, because "+" promised
  many where one fits and a switch has no "not set" position; yes-or-no properties are two-word
  selects. Rows pair on the 88 | 88 grid so a layer at rest fits at 1440 x 900, rather than tabs
  or folding, which hide what a layer does. An empty kind group folds to one line with the
  element's reason. The degree ramp becomes a histogram-plus-ramp editor in compact-mantine,
  because Figma's stop editor has a color axis, not a data axis. Category layers arrive unsplit.
  "Which elements" starts with Nodes / Edges / Both. Additive element asks: `reach` on
  validation, `scalePreview`, inline palettes, `addPair` until the major, a text leaf in
  `RuleTree`, `contains`/`starts_with` in the expression subset, label looks, shape schemes,
  bindable label size and colors. None is built yet; record each in `owner-decisions.md` when it is.

- (2026-10-11) **Round 4 closed; what it decided and why:** study fixed first (a refusal in the
  command every session runs, because a written rule failed twice); one change per problem; fix in
  the owning package (no app guard around `suggestBackticks`); words at rest never rise; Values-first
  in the find box held as a second change on one problem. `--shift-click` stays in briefings: removing
  it would make T24 measure the tool, not the app.

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

- (2026-10-11) WORKED: completing a committed audit instead of redoing it: list both size folders
  side by side, run only the missing walk, take its commands from the earlier transcript.
  `--hover "role=treeitem:PageRank"` prints `tooltip: null` (the tooltip lives on the row's icon; use
  `--hover-at` on the icon), but the inspector bar shows the same words, so no hover is needed.
- (2026-10-11) WORKED: re-running last round's audit walks by pulling their exact commands out of
  the earlier subagent transcript (`~/.claude/projects/<proj>/<session>/subagents/workflows/*/agent-*.jsonl`,
  Bash inputs containing `real.mjs --start`); session folders do not record steps. Four chains (two
  groups x two sizes) in the background finished in about 25 minutes with other experts holding
  slots. Two-up montages (`montage -tile 2x1`) read well; 4-wide contact sheets only for spotting.
  Screenshots are 1x, so crops use 1x coordinates. `--click "Add to Edge"` does not exist on an
  edge selection's Style tab (Line, Arrows, Label sections).

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

- (2026-10-12) **A plan item marked "built and kept" needs only a check.** The row that paints
  nodes and edges (`styles.addRow` with target both, commit 262b846095) was re-listed in a later
  plan; I confirmed the commit is on the branch and its 7 tests pass, and changed no code. Check
  `git branch --contains <sha>` and run the named test before rebuilding anything.

## Sources

- Digests in `design/ui/studio/digests/` (`tier1.md`, `decisions.md`, `study-rounds.md`,
  `owner-voice.md`, `framework.md`); repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 1 design and plan on branch `feat/tier1-real-app` under `design/ui/tier1-real-app/`.
- App comments citing element issues: grep `#[0-9]{3,4}` under `graphty/src/`.
- Owner memory notes (do not blame timing; cap workflow browsers; the image model only transcribes).
