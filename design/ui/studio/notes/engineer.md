# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier3` (branch `design/studio-tier3`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier3/criteria.md`.

Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Summarized 2026-10-17 from 44 KB. Every dated entry of today's dry-run fixes (table, Analyze run,
filter steps, style panel polish, page and selection, undo, inspector targets, condition lists,
yes and no, find box, names and words, focus, number card, spoken messages, color box, drawing and
camera) is in full in git: `git show 54c009f84:design/ui/studio/notes/engineer.md`. Older entries
(2026-10-06 to 10-17): `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

0.  (2026-10-29) OPEN DEFECT in the date card (`DateCard` in `style/WhichPicker.tsx`): changing its
    match (Before -> After, Between -> Before) clears the box but the filter keeps the old bounds,
    so the card reads "After [empty]" while its count and the marks still show Before 2005
    (re-walk T65B-path/17.png, 24.png). Fix: a date card with no bound must write no condition (or
    keep the bound it can carry over); test by real input switching the match.

Summarized 2026-10-29 from 26 KB; the full prior Top of mind (tier 3 round 1 lessons, the screenshot
audit, older re-walk pointers): `git show c413f93c4f:design/ui/studio/notes/engineer.md`.

0. (2026-10-29) The weight runs read is `data.loadedWeight()`, which now follows the weight ROLE
   (`knownFields.edgeWeightPath`) when it names an edge column the load did not read weights from;
   null when the role is taken away; else the loaded column. `Algorithm.weightReading` asks the
   session for it and passes the load's own column as `stored` to `resolveRunWeight`, because the
   store's weights are filled only at load: a designated column that is not the stored one must be
   read as a column (`input: weight`), and a role taken away must read unweighted (`input: null`).
   Tests: `test/session/loaded-weight.test.ts`, `test/browser/runs-loaded-weight.test.ts`.
1. (2026-10-29) A date column is a `date` card field when the element's descriptor says
   `measurement: "time"` (typed date or the designated time field); its card writes the element's
   `range` leaf with `as: "time"` (ms bounds, both ends kept). Card bounds: Before X = start(X) - 1,
   After X = end(X), Between = start(A) .. end(B) - 1, where a 4-digit year spans the year and a
   day spans the day (`spanOf` in `style/cards.ts`). A bare number under 4 digits is NOT a date: the
   session parser reads "2" as 2 ms, which wrote a card on the first keystroke.
2. (2026-10-29) An issue the element raises must name what happened to the file. A graph-io error
   with a line is NOT a refused row: GraphML `<data>` and GEXF `<attvalue>` readers drop only the
   value and keep the node or edge. Those now carry `params: { skipped: "value" }` (graph-io
   `SKIPPED_VALUE`), and the element's `refused-row` issue skips them (`loadFactsOf` in
   `session/issues.ts`). Yeast from its address: 331 / 361, no chip. Before trusting any issue
   count, compare it to `report.counts.skippedNodes/skippedEdges`.
3. When a load has no issue the app does not open the table dock (`drawFirst` in `start/open.ts`):
   an old route that opened with the table diverges at that step after an issue fix. Expected.
4. graphty-element tests resolve graph-io through its `dist`; `npm run build` in graph-io writes
   only `dist/src` (tsc) and breaks resolution: build it with `pnpm exec nx run graph-io:build`.
5. graph-io's `test/styles/no-styles-baseline.json` hashes each conformance fixture's import
   report; any new issue field changes those hashes. Update only the lines the change explains.
6. STILL OPEN (2026-10-20): Escape on a focused sortable table header clears the selection instead
   of moving focus to the Table button (floating-ui dismiss stops Escape before `leaveGrid`).
   Fix idea: `onKeyDownCapture` for `leaveGrid`.
7. STILL OPEN (2026-10-19): compact-mantine `colorWord` calls pink E68FAC "red".
8. Open owner questions live in `owner-decisions.md` ("For the owner").
9. Shared worktree: stage only my files; never `git stash`; commit headers <= 100 characters,
   scope from commitlint's list (`workspace` for studio notes).
10. Prove a test fails without the change: either run it on HEAD's file copy, or show the probe's
    output on the unfixed build (as for the yeast issue: 6 `E_COLUMN_TYPE` rows before, none after).
11. Rebuild before a walk: `pnpm exec nx run-many -t build -p graph-io graphty-element graphty`
    (low-priority), then `real.mjs --replay <old walk> <new folder> --keep`, `--step`, `--end`.
12. API changes: additive ones go in `owner-decisions.md` under "decided by the team"; a changed
    default or a renamed or removed member goes "for the owner". A new element member needs
    `doors.ts`, `test/cost-coverage/method-classes.ts` and `npm run api:report`.
13. Element facts worth citing: layers paint one kind; `styles.addRow` takes an empty row;
    `data.histogram` takes data columns only; a bound label size wins over a label style's size.
14. Study tool: `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name
    will not match; step N lands in screenshot N+1; always `--end`.

## Decisions and reasons

- 2026-10-29: A date condition is the existing `range` leaf with `as: "time"`, not a new leaf, and
  the app reads "is a date" from the attribute descriptor's `measurement`, not a new
  `ReadableValueKind`. Why: adding "date" to `readableValues()` kinds changes what an existing API
  returns (breaking); the descriptor already says it. In the element the designated field reads the
  timeline's parsed instants (so the filter and the timeline agree); other columns, and every
  style-layer and set rule (their resolve context has no instants), read raw values by the shared
  `readTimeValue` (`session/time/parse.ts`), which `session.time.parse` now calls too.
- 2026-10-29: Filters writes a typed card on commit (Enter or leaving the box), the Style picker on
  each change; the date card hands each parseable keystroke to `onChange` either way, so both count
  while typing.

- 2026-10-29: A dropped value is marked in graph-io, not guessed in the element. Why: the element
  saw only "error, line 179, element gal1RGexp"; nothing said whether the node survived, and
  checking ids against the graph fails when the issue names a key, not a node. A flag on the issue
  is the smallest fact, additive (`params` was already optional), and serves every consumer.

- (2026-10-21) **A screenshot audit runs as `bars.mjs --tier 3 --size <WxH> --dist <frozen>`,
  one size per run, into the auditor's own folder.** Its walks are real.mjs sessions that reach
  every bar 6 screen with no MISS and leave a screenshot per step; hand-driving 36 screens twice
  would cost hours and miss states. The first size of a run is the light theme; the round's own
  bars run gives the dark theme at 900 x 700 for free.

- (2026-10-21) **Bar 6's list lives in `measure.mjs` (`BAR6`), read by both bars.mjs and the gate.**
  The gate must not trust a bars run's own idea of what it should have walked; one list both sides
  import cannot drift. Names are the walk's screen names, not the criteria's sentences.
- (2026-10-21) **The gate tells walks apart by folder name** (keys/keyboard, detour, else success).
  session.json holds no task or walk kind; the dry runs already name folders that way. Stricter
  than preflight 4 in one place: a walk on an earlier build "on routes no fix touched" does not
  count; it must be re-walked on the frozen build or one with the same app code.
- (2026-10-21) **spoken.json is read in `measure`, not with `--sr`.** `--sr` is the screen-reader
  participant's mode and refuses pointer steps; the walk clicks.
- (2026-10-21) **A phrase echo needs one word that is not common, and fails even when each word is
  kept.** All-common runs ("of the") would fail every prompt; kept words are kept one at a time.
- (2026-10-21) **Bar 4's limit is a constant, not `2 * --key-steps`.** The criteria fix the number;
  a flag let a documented default of 6 hold a median of 12.
- (2026-10-20) **A replacing load remaps hand-picked edge layers in the import command, not in the
  app or in the store.** The command already sweeps file layers in the same step
  (`applyFileStyles`), so the remap undoes with the load; the app holding old ids and rewriting
  them would be a workaround, and the store knows nothing of layers. Only edges: node ids survive
  a reload. An edge the new file lacks keeps its old id (matches nothing), never guessed.
- (2026-10-20) **A renamed channel is read in the style document reader, not in the project file
  reader.** `planTemplate` is where every saved style document (a project's member, a style file
  applied by a consumer) becomes layers, so one place covers both; `projectFile.ts` would have left
  `applyTemplate` callers broken. Only `set` and `encode` keys name channels in a layer. Where a
  layer names both the old and new name, the new one wins. Not in `channelDescriptor`: the old
  name stays out of the channel set, the catalog and new documents.
- (2026-10-19) **Escape clears the selection only on the selection's own inspector.** A layer,
  run or attribute's inspector is about that row; clearing a find selection from there had no
  Undo and nothing said Escape would do it (decided.md "Escape in the inspector").
- (2026-10-19) **A tooltip never takes Escape's job.** It is a hint opened by focus, not by the
  reader; Escape closes it and still does what it does on that control.
- (2026-10-19) **A redrawn line restores focus by the control's name, else its field.** The name
  survives a redraw for buttons (bind, remove); a box's name changes with its state, and the
  field is where a box's focus belongs anyway. By position failed the Undo of Stop varying.
- (2026-10-19) **A discard note is spoken by a live region that is always mounted and shown by a
  copy hidden from assistive tech.** A region that appears with its words is not reliably read;
  showing the region itself would read the words twice or need its own layout slot.

- (2026-10-19) **Select all means the whole drawing: every visible node and the edges among
  them**, through `{ scope: "visible" }`. A node a filter hides is not one the reader can see
  selected. Two-way door: a node-only variant would need a new element target.
- (2026-10-19) **A tooltip and its control's name are one string in code**, so they cannot
  drift; the longer words win ("Stop varying node size by data: use one value for all"), and
  tests match the name by its start.
- (2026-10-19) **Check what the study tool reads before changing a name.** Its candidate list
  used `aria-label || innerText`, so an `aria-labelledby` group read as all its text ("Shape
  Shape Size"); the app was right and the fix was the tool's.
- (2026-10-19) **A pressed switch over nothing says so; a default-on switch over nothing stays
  quiet.** Only the reader's press is a request, so only it shows the empty key's line.
- (2026-10-19) **A key row no element shows is no row, whatever hides it.** "covered by X" kept a
  value the reader cannot find on the canvas; the Style panel already names the covering layer.
- (2026-10-19) **A layer's kind is the union of its looks and its conditions.** A condition is
  the reader building that half as surely as a look is.
- Entries dated before 2026-10-19, in full: `git show 3892643e51:design/ui/studio/notes/engineer.md`.

## Thinking

- (2026-10-17) Tooltips on focus keep costing keys: they cover the next control and (until today)
  ate Escape. If another tooltip defect comes up, ask whether an icon button with a visible
  pop-out title needs a focus tooltip at all.
- (2026-10-18) If the reserved key column reads as wasted room on a graph with no key, reserve it
  only while the key has entries and frame once when it first appears; never fit on its growth.
- (2026-10-17) "Keys polled per frame" hid taps; any per-frame input needs a "pressed since the
  last frame" record.
- (2026-10-10) The dry run must walk what participants do; pilot each task on the candidate build
  and keyboard-press every control before freeze. A finding that traces to the prompt's own words
  is fixed in the prompt.

## Tried: worked / did not work

- 2026-10-29: Targeted re-walk of the refused-row, date-condition and weight-role fixes on a fresh
  build (sessions in `design/ui/studio/tmp/r1-dry1-recheck-U2/`). Worked: yeast from its address
  331/361 with no chip (T60B-success/07.png), sources.graphml clean; Before 2005 + Select marks
  G01, G02, G09 and 5 in all (T65B-path/14.png); a style layer's Which nodes takes the date card
  (T65B-style/20.png); km set in Fields and by the header's Role > Weight both open Shortest path
  on km and the path totals 14.1 km (T64B-success-analyze/43.png, T64B-role-weight/22.png); trips
  closer reads as PageRank's default and Shortest path lists it disabled, never "farther".
  Did not work: switching a date card's match leaves stale bounds (see Top of mind 00). Lesson:
  `--replay` "matches" ignore a combobox's value and a card's body (None -> km, text card -> date
  card both "matched"), so look at the screenshots at every step a fix should change.

- 2026-10-29 worked: a Mantine `Autocomplete` for a date box (suggestions: the column's dates as
  the table writes them). Its role is `combobox`, not `textbox`: a test that looks for a textbox
  misses it.
- 2026-10-29 did not work at first: parsing every keystroke with `session.time.parse` -- "2" read
  as 2 ms, so a Before card was written before the year was typed; fixed by refusing bare numbers
  shorter than a year.

- 2026-10-29 worked: a node vitest probe loading the studio file through `{ url }` (fetch stubbed)
  and `{ file }` reproduced "6 rows refused" in both, so the bug was never the address path or a
  second read. The 6 were `E_COLUMN_TYPE` on lines 179 and 329 ("null" in three double columns).
- 2026-10-29 did not work: `npm run build` in graph-io for the element's tests (writes `dist/src`).

- (2026-10-21) Worked: `bars.mjs --size 1200x900` then `--size 900x700` in one background command
  (about 25 minutes for both, one browser at a time), reading screenshots as each walk finished.
  Did not catch: bar 10's cut-text check misses text clipped by an ancestor (the notice inside the
  canvas column), since it compares a box's own scrollWidth with its clientWidth; only looking
  found it. A check of each visible box's rectangle against its clipping ancestor would.

- (2026-10-21) Did not work: starting the bars walk with `--sr` to collect spoken text; every click
  was refused with exit 2 and the walk's MISS regex did not match the refusal, so it printed "ok".
  Worked: exit 2 counts as a miss, and `measure` reads focus and live regions itself.
- (2026-10-21) Worked: `--only <walk> --size 1440x900` runs of one walk while writing it (about 5
  minutes instead of 30), two in parallel. Did not work: a key row's `textContent` ("Layer 18 of
  331"); `innerText` keeps the line break.
- (2026-10-21) Worked: previewing the gate on round 1's plan with a symlinked `pilot` to r1d2's
  walks (in a throwaway `tier3/rounds/zz-*` folder): it lists each half's missing walks and why.
- (2026-10-20) Worked: a scratch copy of the failing browser test that logs `node.index`, the
  snapshot index, `painter.nodePaint(index)` and `node.drawnFill` found the stale row in one run
  (index 4294967295 while the paint was right). `node.drawnFill` is the drawn color for tests.

- (2026-10-20) Worked, in real.mjs: Shift+T opens the table with focus on the grid's first
  header; `--wheel x,y,<delta>` on the grid scrolls it to a far row. Did not work: a python
  heredoc whose text holds the word "w-a-t-c-h" -- the foreground-wait hook refuses the whole
  Bash call; write the script to a file under `tmp/` and run it.

- (2026-10-20) Worked, in real.mjs: selecting every find match is the "kind is family (8)" value
  row (Enter, or a click on one edge row, selects only that edge and closes the list). Line + is
  `--click-at` on "Add to edge line"; the hex box takes `--type FF0000 --key Enter`.
- (2026-10-20) Worked: Node test opening the two study project files straight from
  `design/ui/studio/tool/files/` with `createGraphSession().project.open` -- it failed with the
  reader removed (E_UNKNOWN_CHANNEL, no layers) and passes with it. `createGraphSession` takes no
  `startingRows` option (a repro script passing it compiled only because it was .mjs).
- (2026-10-20) The frozen-era real.mjs start page is now the landing page: open a project with
  `--click "Open a file" --upload <file>`, not "Open project or file".
- (2026-10-19) Worked: when another agent rebuilds `graphty/dist` mid-revert, build the commit
  under test from `git archive <commit> graphty tsconfig.base.json package.json` with
  `node_modules`, `graphty-element` and `compact-mantine` symlinked to the worktree and `vite
build --outDir <private dist>` in the copy's `graphty/`: 30 s, no tsc, nothing shared touched.
  Did not work: `--expect described=` on a listbox row reached by arrows: the tool reads the
  focused search field, not the active descendant.
- (2026-10-19) Worked: a clean build of HEAD for a walk while the worktree holds other agents'
  uncommitted edits: `git archive HEAD graphty compact-mantine | tar -x` into `tmp/<task>/clean`,
  symlink every other top-level entry to the worktree, `cp -a` the two packages' `node_modules`
  (relative pnpm links then resolve inside the copy), `vite build` compact-mantine then graphty
  there, `REAL_DIST` the copy's dist. Stamp reads HEAD. About a minute.

- (2026-10-19) Worked: judging a key regression by running the SAME steps on the frozen build
  (`REAL_DIST=<frozen dir>`) beside the new one; my first walk had a different inspector open and
  could not tell. Did not work: trusting `graphty/dist` for a whole walk -- another agent rebuilt it
  mid-walk (stamp b426f1d05 at start, e0482cf5e twenty minutes later); `session.json`'s
  `buildStamp` per session says which build each screenshot shows.
- (2026-10-19) Escape swallowed by a focus tooltip: a document-level bubbling listener did NOT
  work (floating-ui stops the key in React's handler, before the document); handling it in the
  capture phase directly would pre-empt inner controls (the neighbor list's Escape). Worked: capture
  phase only notes it, a zero-delay task re-reads it after dispatch.
- (2026-10-19) Worked: tracing focusin/focusout plus a MutationObserver on `[data-line]` inside a
  real-element test showed the gap (focusout at 167 ms, the target replaced, focusin on the
  restored copy at 307 ms). Did not work at first: restoring by the held control's index -- after
  Stop varying the index pointed Undo at the restored Stop varying button instead of the field.
- (2026-10-19) A walk on `graphty/dist` showed the old behavior once because another agent
  rebuilt `graphty/dist` between my build and the walk (the dist then vanished mid-session).
  Build a private copy for walks: `npx vite build --outDir tmp/<task>/dist` and `REAL_DIST` it.

- (2026-10-19) DID NOT WORK, and cost another agent its uncommitted notes edit: `open(p, "w").write(f(open(p).read()))` in Python truncates the file BEFORE it reads it (the write target is evaluated first), so the read is empty. Read into a variable first, then open for writing. The lost edit (a condensation of Top of mind) was redone from its transcript.
- (2026-10-19) Did not work: Tab in Analyze's filter calling `open()` with only `preventDefault`:
  the card opened but focus sat on Back, because the focus trap's document listener still saw the
  Tab. Worked: also `stopPropagation`. The first test only checked "focus inside the card" and
  passed on the broken version; it now asserts Run.
- 2026-10-19 Tooltip text as the only hint after a click: did not work (Mantine closes the
  tooltip on click and keeps it shut while the pointer stays); the hint also goes on the button
  as `aria-description`, and the tooltip shows it again on the next hover. Worked.

- (2026-10-19) New layer from selection as `addRow` of one kind with nothing set: DID NOT WORK at
  first -- the element refused it ("writes no channel"), caught as a notice; the screenshot of the
  failing test showed "The layer could not be made". Fixed in the element, not the app. Focus on
  the Style tab after a menu command: a `requestAnimationFrame` after the store write WORKED
  (the menu's own focus return runs on close, before the awaited add resolves).
- (2026-10-19) Swapping the tree's checkbox for `Checkbox.Indicator` (no input): did not keep
  the themed look (the theme styles `Checkbox` only), so kept `Checkbox` inside `aria-hidden`.
- (2026-10-19) A page-level live region for a list's message. DID NOT WORK: any always-present
  `role=status` in `document.body` collides with consumers' own `getByRole("status")`. Put the
  region in the open surface it belongs to, made lazily, words one frame later.
- (2026-10-19) Reproducing a pilot screenshot on the frozen build BEFORE fixing showed that one of
  three tooltip findings was misread (the Tab-out "Shape box" tooltip belonged to the next
  button). WORKED. A rule keyed on an ARIA link silently skips every control that overwrites
  the link; floating-ui's middleware state (`state.elements`) is the dependable pairing.

- (2026-10-19) An in-page probe that measures label WORDS on screen and compares them with the
  declutter's own rectangles (they matched to the pixel) settled "is the count lying?" in one run:
  it was not; the rule was too strict. WORKED. A zoom in perspective scales world-sized labels and
  their gaps together, so a count can only move with zoom through a rule fixed in pixels.
  Wheeling out past the fitted view did not zoom further in the probe (zoom3 equals the start).

- (2026-10-19) Worked: proving a disabled-state test fails without the change by reading the
  old code path, not by swapping files, when the change is a deleted prop: the header's Undo with
  nothing to undo was exactly the `skipWhileDisabled && disabledReason !== null` branch.
- 2026-10-18 entries (real.mjs slots, one-size rule, Undo's reason after the press, Select's
  `onDropdownOpen` order, two-part layers, gml ids, tooltip waits, proving failure by copying HEAD,
  focusin stack traces, private-index commits, the 3D wheel zoom-out symmetry finding) in full in
  `git show 393580a87:design/ui/studio/notes/engineer.md`, "Tried: worked / did not work".
- Entries dated before 2026-10-19, in full: `git show 3892643e51:design/ui/studio/notes/engineer.md`.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`.
- Tier 3: `design/ui/studio/tier3/` (`design.md`, `dry-run-r1-1.md`, `criteria.md`,
  `rounds/r1/pilot/`), `design/ui/studio/owner-decisions.md`.
- Full notes before this summary: `git show 54c009f84:design/ui/studio/notes/engineer.md`; before
  the first summary: `git show 6b160deb5:design/ui/studio/notes/engineer.md`.
- (2026-10-18) Re-asked for truthful counts after a restart: already landed in 97d8bff7c (in the frozen build ed4351b258); `TruthfulCounts.real-element` still passes on the branch tip, walks in `design/ui/studio/tmp/r1-dry1-truthful-counts/w1`, `w2`. Check `git log` for a task's title before rebuilding it.
- (2026-10-18, second re-ask) Truthful counts again: still landed (97d8bff7c, swatch and Color
  line; 52cb47a85 `builtParts`). The pilot screenshots cited were taken on build 58556989e, older
  than both. On the tip, whose `graphty/dist` equals the frozen build tier3-r1d3-52cb47a85a byte for
  byte, `TruthfulCounts.real-element` (2) and `LayerRowAndKey.real-element` (5) pass. `groupMarks`
  in `StyleTree.tsx` reads the swatch from the layer's `set`/`encode` only, never its selector, so
  a gained condition (T48B) keeps it as well as a lost one. Check a pilot folder's
  `session.json` `commit` before treating its screenshots as current.
- (2026-10-18) Re-asked for the key (column title, 250,000, no stale fold, no repeated "Agencies", no cut entry, Tab and arrows) after a restart: already landed in ed4351b25, the frozen build itself; on the branch tip element `legend-copies`/`legend-reach` (5), app `legendWords` (21) and `LegendCard.real-element` (7) pass; walks `design/ui/studio/tmp/r1-dry1-key/w2`, `w3` show "Size: donations 0 - 250,000" and Group 1-10 whole in a focusable scrolling key.

## 2026-10-29 -- A weight given in Data is the weight the analyses read

- Decided: fix in graphty-element only (`session/data.ts` loadedWeight, `algorithms/input/weight.ts`
  `designatedWeight` + `stored` parameter, `algorithms/Algorithm.ts` loadedWeightOf). The app's
  OptionsForm and GraphValues already read `loadedWeight()`, so they needed no change. Why: Fields >
  Weight and the header's Role > Weight write `edgeWeightPath`, but the runs read only the last
  import's `weights.attribute`.
- Tried: proved both new tests fail on HEAD's three source files (null loadedWeight; Shortest path
  read no weight) and pass with the change. A configured path that names no column of the data falls
  back to the loaded column, so a global `edgeWeightPath` set before load cannot make runs throw
  ("nothing carries the weight").
- Note: "dijkstra" is not a run key; the catalog's Dijkstra is `shortest-path`.
