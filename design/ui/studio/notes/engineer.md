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

- (2026-10-29) Re-walk of "an unknown end's warning marks the end that is unknown" (67de06e337) on
  `graphty/dist` stamp ac8586556932: nine pilot routes replayed with every check point matching
  (`design/ui/studio/tmp/r1-dry2-recheck-U2/`: T61A success, deliveries-first detour, keyboard;
  T61B success, detours; T67A table; T67B table marks; T66A path; T66B success). Nothing worse; the
  acceptance holds: T61A-success/20.png glyph on Target, P13 tinted, P05 plain; T61B-keys/23.png
  the same for G12 / G09; T66B-success/15.png the mark on Target with the Data source card on.
  Keys on the Edges header (T61B-keys/24-36.png): Tab reaches Source's header then leaves the
  grid, ArrowRight reaches Target, Enter sorts Target A to Z, Escape leaves the grid; `--read`
  names the header row "Key Target Issues in Target", nothing on Source. Seen, not caused: in the
  deliveries-first order (T61A-deliveries-first-edges/10.png) there is no unknown end at all, the
  one issue is the repeated edge, on From with P03 tinted, and the deliveries.csv row shows no
  issue chip while the table says "With issues 1" (the frozen route's 09.png shows the same row).
  Focus lines print only in an `--sr` session; in a plain one read focus from the screenshot.

- (2026-10-29) An unknown end's warning marks the end that is unknown. graphty-element: the
  `unknown-end` issue's params gain `ends` ("source", "target", "both"), from the touching edges
  (issues.ts loadIssues; additive, recorded in owner-decisions.md). The app's `issuePlace` now
  returns `columns` (plural): Target for "target", both end columns for "both", Source when absent
  (a project saved before `ends`). `issuesByColumn` (TableDock.tsx) puts the issue on each. Tests:
  element `data-issues.test.ts` "says which end...", app `columns.test.ts`, and
  `IssueRows.real-element.test.tsx` "marks the target column, and only the target cell" (fails
  without: the source cell tinted). The fraud fixture's 18 unknown ends are targets too, so
  `TableDockConfig.real-element.test.tsx` now expects the warning on "to". Known limit: "both" tints
  a row's source cell even when only its target is unknown (the tint is per row). Re-walk on
  `graphty/dist` (`design/ui/studio/tmp/r1-dry2-U2/`): T61A x1-success, T61B z1-success,
  z2-detours and T61A q3-keyboard replayed with every check point matching; T61A 20.png and
  T61B-z1-with-issues 20.png show the glyph on Target, P13 / G12 tinted, P05 / G09 plain; the
  Issues list still reads "1 unknown end" with Add nodes, Leave out; 13 / 18 (B 12 / 14). The
  replay tolerance did not flag the moved glyph: look at the screenshot, not only "matches". No
  keyboard route reaches the Edges header's spoken issue; the real-element test covers its name.

- (2026-10-29) Re-walk of "every inspector node row is called by its name" (d612c60665): ten
  routes matched every check point (`design/ui/studio/tmp/r1-dry2-recheck-U3/`); keys on the rows
  work (Tab order, Enter selects and opens Values). Not walked: a grouping run's Members, a run's
  Top list. The legend card does not open the run: reach a path's rows through its layer's Values.

- (2026-10-29) Every inspector node row is called by its name: path "Nodes in order", a set or
  group run's Members, a layer's Top list, Members and Selected (RunValues.tsx, LayerValues.tsx)
  now go through `nodeName` (inspector/words.ts, the element's `session.data.name`), as From/To
  and the run's Top list already did. Tests: `PathRun.real-element.test.tsx` "calls each node in
  order by its label" (station labels; fails without: b, c, d) and `tasks.real-element.test.tsx`
  group Members read "Node N" (fails without: n0...). Les Miserables cannot test this: its ids are
  the names. Re-walk `design/ui/studio/tmp/r1-dry2-U3/`: T64B detour 09.png Old Bridge, Heron
  Marsh, Lake Inlet (the only divergence, the fix); T64A-label-path 09.png Central Warehouse,
  Harbor Market; T64A success, table-role-rerun and T64B success match every check point.

- (2026-10-29) Re-walk of the Select-in-picture and default-weight re-run fixes on dist stamp
  9f9f23b3981e (`REAL_WARM_POOL=0`): all 11 routes replayed with every check point matching
  (`design/ui/studio/tmp/r1-dry2-recheck-U1/`); nothing worse, both acceptances hold (T65A path
  17.png 4 selected and 4 rings; T65B path 09.png 3 selected; T64B table-role-rerun 09.png new run,
  km (farther), Total km 5.3; T64A 11.png new run, "trips means closer"). Keys on the Select / Hide
  radio (`T65B-keys-toggle/`): Arrow keys switch and move the selection, Enter does nothing, Escape
  puts focus on the on box (by design), Tab / Shift+Tab move in order, undo and redo restore
  "3 nodes selected". Seen, not caused by these fixes: (a) a Select card's own chip still counts its
  matches over the whole graph ("5 of 12", "5 of 24") while the selection under a Hide card is 3 or
  4 -- a participant reading the chip may answer 5; (b) the date card's condition name reads in ms
  to the reader: "Apply installed is at most 1104537599999" (on box name, remove button) and the
  redo toast "Redid editing the filter "installed is at most 1104537599999"" (also in the r1d1
  pilot); (c) the live region says "1 edges".

- (2026-10-29) A run asked again after the default weight changed computes again. A run's
  identity (`RunsApi.resolve`) is explicit params + scope + seed + sample; the weight the Data role
  supplies is not in it, so the same From/To handed back the stored unweighted run after the
  previous weight-role fix. Fix: `RunsApiOptions.defaultWeight` (internal, GraphSession passes
  `JSON.stringify(data.loadedWeight())`), recorded per run id in `startRun`; `shouldReexecute`
  adds `weightMoved` -- only for an algorithm whose descriptor has a `weightMeaning` and a run with
  no `weight` param, so degree is not redone. `answered()` follows. Not in the identity: that
  would change derived run ids, which saved projects reference. Test:
  `test/browser/runs-loaded-weight.test.ts` "the same run asked again after the weight role or its
  meaning changed computes again" (fails without: answered() still returns the old run). Re-walk
  `design/ui/studio/tmp/r1-dry2-U2/`: T64B 09.png new Ran 5:54:40, Total km 5.3, Weight km
  (farther); T64A 11.png new Ran, "trips means closer" reason; success and Analyze routes match.

- (2026-10-29) A Select card selects only what is in the picture. graphty-element: optional
  `FilterCondition.within` (`FilterSelectWithin`, "graph" | "picture"; absent = graph, as before).
  With "picture", `selectedBy` (VisibilityApi.ts) intersects the select rule with a fresh pass of
  `combinedRule(null, conditions)` (keep and exclude only, NOT the single filter or the time
  window), and `selectKey` adds that rule, so a keep/exclude edit, its on box, undo and redo all
  move the selection through the existing select-history code. `conditionOf` (conditions.ts) is
  the one place a condition is rebuilt, so `within` survives admit, `updateCondition` and a saved
  project. App: the Select / Hide toggle writes `{ effect: "select", within: "picture" }`.
  Tests: element `conditions.test.ts` "a select condition within the picture..." (both orders,
  keep off/on, undo/redo, exclude, no within = whole graph, bad value refused); app
  `Filters.real-element.test.tsx` "a Select card selects only what the Hide cards leave..." (fails
  without the app change: 7 instead of 4). Re-walk `design/ui/studio/tmp/r1-dry2-U1/`: T65A path
  17.png and cards 19.png "4 nodes selected", 4 rings, 14 of 24; T65B path 09.png "3 nodes
  selected" (G01, G02, G09), screen reader "5 of 5 rows, 3 selected"; T65B style detour and T68A/B
  unchanged. The old routes now diverge where they narrowed hours to 40: the selection follows
  (one staff member left), which is the fix, not a regression.

- (2026-10-29) The five r1 dry-run-1 fixes (source row chips, Add data doors, column kind, Data
  source filter card, export scope) and their re-walk, in full: `git show 2b3b98a613:design/ui/studio/notes/engineer.md`.
  Still open from them: a mixed column draws the mixed glyph in the table but Aa in Fields
  (`TypeGlyph` has no "mixed"); unticking every load in a Data source card leaves the last rule.

4.  (2026-10-29) A re-walk after a rebuild must run with `REAL_WARM_POOL=0`: a warm browser of the
    same build stamp (the stamp is HEAD, not the dist's content) keeps the app it loaded BEFORE the
    rebuild, so the replay shows the old code pixel for pixel. `session.log` says "took over warm
    browser"; pixel-diff an old and new screenshot to catch it.
5.  (2026-10-29) OPEN DEFECT in the date card (`DateCard` in `style/WhichPicker.tsx`): changing its
    match (Before -> After, Between -> Before) clears the box but the filter keeps the old bounds,
    so the card reads "After [empty]" while its count and the marks still show Before 2005
    (re-walk T65B-path/17.png, 24.png). Fix: a date card with no bound must write no condition (or
    keep the bound it can carry over); test by real input switching the match.

## Working facts and open defects

Summarized again 2026-10-29 (27 KB): full copy `git show b14af76f0e:design/ui/studio/notes/engineer.md`. Earlier summary 2026-10-29 from 26 KB; the full prior Top of mind (tier 3 round 1 lessons, the screenshot
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

- Decisions dated 2026-10-19 to 10-21 (screenshot audit bars, Escape and tooltips, focus after a
  redraw, select all, layer kinds, replacing loads, renamed channels): in full in
  `git show d3302b379c:design/ui/studio/notes/engineer.md` (trimmed 2026-10-29 for size).

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

- 2026-10-29 worked: `--replay <route> <folder> --keep` on a route that ends just short of the
  changed screen, then hand `--step`s (With issues, Tab, ArrowRight, `--read`) to reach it; the
  pilot's own success routes stop one click before the fix shows.

- 2026-10-29 did not work: a background wait loop on `pgrep -f "<pattern>"` matches its own shell
  command line and never ends; wait on a file the job writes instead.

- 2026-10-29 worked: replaying the fix author's own re-walk folders (they carry the hand steps past
  the pilot's divergence) gives a full-length match check of the new screens in one pass.

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
- (2026-10-18) Re-asks after a restart (truthful counts, the key) were already landed: check
  `git log` for a task's title and a pilot folder's `session.json` `commit` before rebuilding.
  Details: `git show b14af76f0e:design/ui/studio/notes/engineer.md`.

## Dated decision records (2026-10-29)

Weight given in Data read by analyses (element only, `loadedWeight` follows the weight role);
Add data... and the canvas drop open the join screen (`chooseAndOpenFile`, `openFiles`); a Data
source filter card writes `side: "nodes"` and the Filter chip names edges when any are hidden.
Full reasons, tests and walks: `git show b14af76f0e:design/ui/studio/notes/engineer.md`.
