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

- (2026-10-29) Re-walk of the five fixes (source row chips, Add data doors, column kind, Data
  source filter card, export scope) on dist stamp 9eb2d0d4d89d (built after every source edit):
  nothing worse, each acceptance holds. Walks: `design/ui/studio/tmp/r1-dry1-recheck-U1/`
  (crops in `crops/`). Pilot walks to `--replay` live in the main checkout's
  `tmp/design-studio/tier4/r1/pilot/<task>/<walk>`, not in `rounds/r1/pilot/` (reports only).
  Seen, not caused by these fixes: (a) at the narrowest left panel a joined row's name shrinks to
  one letter ("d..", "f..") -- chips whole, tooltip kept, but two loads starting with the same
  letter would look alike; (b) unticking EVERY load in a Filters Data source card leaves the last
  rule in force (11 of 12 still hidden, `ruleOfCards` returns null for an unfinished card and the
  old rule stays) -- T66B-success-2/16.png; (c) gauges' auto-detected Time on text `installed`
  shows no Time pill in the table header (pill comes from `column.role`, which the auto time
  field does not set), so nothing in the table marks it -- T60A-empty-doors/04.png.

0.  (2026-10-29) Export opens on the whole graph every time (`ExportDialog`'s open effect sets
    `scope` on EVERY opening, Image openings too: "all", or `source:<key>` only for a source row's own
    Export... with two or more loads). Before, a source row's scope stuck in the Data choices and
    Control+E wrote 11 nodes, 0 edges. The Scope list and its chips count the rows of what the file
    holds (`scopeLabel` in `DataOutput.tsx`): edges for CSV Edges ("Shown 17 of 18"), nodes for
    CSV Nodes, "All 12 nodes, 14 edges" and two chips for a network format; `session.scope.count`
    already gave both halves, so no element change. Tests: `export-doors.real-element.test.tsx`
    "Export's scope says what it writes..." (both fail without the fix). Re-walk:
    `design/ui/studio/tmp/r1-dry1-U7/` (T68B 06-08: GraphML 12 nodes, 14 edges; T68A 04-07: All 18,
    Shown 17 of 18, 17 edge rows written). A source scope for GraphML now reads
    "gauges.csv 11 of 12 nodes, 0 of 14 edges" -- the zero is said, but the label truncates in the
    select at 1440 wide.
1.  (2026-10-29) A Filters Data source card writes `{ kind: "source", sources, side: "nodes" }`
    (`filterLeaf` in `data-place/filterCards.ts`, used by `ruleOfCards`): it keeps the nodes the
    ticked loads supplied and every edge between them, whichever load supplied the edge. The Style
    Data source card (`leafOf` in `style/cards.ts`) is untouched and still speaks both halves. With
    `side: "nodes"` the element counts no edge half (`conditionCounts().edges` is null), so the card
    shows one chip; the header Filter chip now also names edges whenever the filter left any out
    (`summary.visibleEdges < totalEdges`), not only when a card speaks of edges. Test:
    `SourceCondition.real-element.test.tsx` "keeps the edges between the kept nodes". Re-walk:
    `design/ui/studio/tmp/r1-dry1-U6/` (T66 A 12/13 + 17/18, B 11/12 + 13/14; T68 starts same).
2.  (2026-10-29) A column's kind alone draws it: cells (`timeValue` in `time/timeActions.ts` formats
    only a column typed date, to the day), the sort caption (`sortCaption`, by `descriptor.type`) and
    every glyph (`typeOf` in `data-place/words.ts` maps a non-date column whose measurement is "time"
    -- the Time role -- back to number or text). The Time role shows only as the header's Time chip.
    Test: `table/__tests__/TableDates.real-element.test.tsx` "draws a text column with the Time role".
    STILL OPEN: a mixed column (families, depth_cm) draws the mixed glyph in the table header but Aa in
    Fields' lists; `TypeGlyph` has no "mixed".
3.  (2026-10-29) Every door that adds a data file to an open project goes through
    `addSource` in `start/open.ts` (join screen onto a graph with data): Sources + File..., Open
    project or file..., a window or canvas drop, Quick actions > Add data... (now
    `chooseAndOpenFile`), and a Recent entry that is a data file (`openedData` in
    `project/actions.ts`). The older "Add to <project>" Data page is reachable from no door; only
    New from data... (a new graph) and Replace still open the Data page. Test:
    `join/__tests__/JoinScreen.real-element.test.tsx` "opens from Quick actions > Add data...".
4.  (2026-10-29) A re-walk after a rebuild must run with `REAL_WARM_POOL=0`: a warm browser of the
    same build stamp (the stamp is HEAD, not the dist's content) keeps the app it loaded BEFORE the
    rebuild, so the replay shows the old code pixel for pixel. `session.log` says "took over warm
    browser"; pixel-diff an old and new screenshot to catch it.
5.  (2026-10-29) OPEN DEFECT in the date card (`DateCard` in `style/WhichPicker.tsx`): changing its
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

- 2026-10-29: The Time role no longer changes how a column is drawn. `timeValue(session, value,
date)` lost its kind and column arguments: a text or number time field shows its raw values, and a
  date column is written to the day whatever the timeline's unit (a date column's unit is ms anyway).
  `typeOf` reads measurement "time" on a type other than "time" as the type's own measurement. Why:
  setting the Time on a text column of ISO days drew dates and a calendar glyph in Fields while the
  header said Aa and the caption A to Z (decided.md, "A column's kind is drawn one way everywhere").
  The element's sort was never by date for a text column: ISO days sort the same as text.
  Evidence: re-walk `design/ui/studio/tmp/r1-dry1-U4/T62A-w2-inspector/02.png` (2015-03-02, Aa + Time
  chip), `T62A-w3-fields/07.png` (Aa in the Time list), `10.png` and `11.png` (after Type > date:
  calendar glyph, dates, "Sorted by opened, newest first"), `T62B-w2-detours/05.png`.
- 2026-10-29: A Sources row's name and join ratio sit in `.dp-source-label` (`flex: 1 1 0; width: 0`),
  and the row button lost its `min-width: 0`. Why: with `min-width: 0` the button shrank below its
  icon and count chips, so the chips spilled under the issue chip after it ("3611" for 331 / 361).
  The button now keeps room for its chips; the label counts as no width when the row is sized, so
  the name gives way (keeps its tooltip). `min-width: 4em` on the name alone was not enough: a
  nowrap name's min-content still counted in the button's min-content and pushed the chips off the
  panel. Known ceiling: at 240 px with 4-digit counts ("1,001", "1,000") plus an issue chip the
  row's resting "..." slot runs about 9 px past the row's background; still drawn, not clipped.
  Re-walk (cold, `design/ui/studio/tmp/r1-dry1-U1/cold/`): deliveries reads 13 / 18 beside its
  issue chip (T61A/12.png), flows 12 / 14 (T61B/13.png); the name shrinks to "d.." / "f...".
  Yeast now loads with no issue, so its row has no chip to cover anything.
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

- 2026-10-29 worked: a `--replay` without `--end-on-diverge` stays open on the diverged
  screen; carry on by hand with `--step`, then `--end`. `--end-on-diverge` when only the first
  changed screen matters.
- 2026-10-29 worked: a real-element test that loads a 1,000-edge chain CSV with one padded value at
  the default (= narrowest, `PANEL_MIN` 240) left panel and compares the chips' boxes
  (`SourceIssues.real-element.test.tsx`); it failed on the old CSS (edge chip right 267 > issue
  chip left 215). Did not work: first fix (name `min-width: 0` + button min-width auto) -- the
  name's full text width moved into the button's min size and the chips left the panel.
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

- Entries dated 2026-10-21 and earlier (bars.mjs sizes, real.mjs keys and starts, builds while
  other agents rebuild, Escape and focus traces, live regions, disabled-state proofs), in full:
  `git show 51d0e57509:design/ui/studio/notes/engineer.md`.

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

## 2026-10-29 -- Add data... opens the join screen

- Decision: Quick actions > Add data... runs `chooseAndOpenFile`, the same as Sources + File....
  Why: it opened the older "Add to <project>" Data page, whose default dropped an edge to an unknown
  node and reported nothing (decided.md, "Every door that adds a data file to an open graph opens
  the join screen").
- Same root, two more doors found by grepping `openDataPage(... "add")` and `openProjectFile`
  callers: the canvas drop (`canvas/useCanvasDrop.ts`) called `openProjectFile` with no `onData`,
  so a data file dropped on the canvas also reached the old page; it now calls `openFiles`, as the
  window drop does. A Recent entry that is a data file, opened inside a project, now goes through
  `addSource` instead of the page.
- Tried: removed the DataPage test of the old Add data... door (the page itself keeps its tests
  through `openDataPage`). New test fails on HEAD's commands.ts (times out waiting for the join
  screen), passes with the change. Walk on a fresh build: gauges.csv, then Add data... flows.csv
  shows "14 edges added, 1 new node, 1 not in graph, 1 repeated key"; Join gives 12 nodes, 14
  edges, and an issue chip on the flows row (design/ui/studio/tmp/r1-dry1-U3/walk/04-06.png).

## 2026-10-29 -- A Data source filter card keeps the edges whose two ends it keeps

- Decision: the side is written by the Filters only (`filterLeaf` around `leafOf` in
  `data-place/filterCards.ts`), not by an option on `leafOf`: the Style card's reading is approved
  and the Filters are `ruleOfCards`' only caller, so no option was needed. An old condition with no
  side is rewritten with `side: "nodes"` on its next edit.
- Decision: the header Filter chip counts edges when the filter hid any. Why: with the node-only
  rule the chip dropped to "12 of 13 nodes" and the 17 of 18 edges were readable only in the
  inspector; a node card that hides edges at the nodes it hides now says so too.
- Tried, worked: replaying T66 A s1-path and B success-2 with `REAL_WARM_POOL=0` (they diverge at a
  hover only because the card moved); `--start` of a setup needs the setup file's full path
  (`rounds/tier-4/setups/...`), a bare name looks in tier2.
