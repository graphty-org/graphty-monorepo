# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/design-studio-tier4` (branch `design/studio-tier4`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier4/criteria.md`.

Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Summarized 2026-10-17 from 44 KB. Every dated entry of today's dry-run fixes (table, Analyze run,
filter steps, style panel polish, page and selection, undo, inspector targets, condition lists,
yes and no, find box, names and words, focus, number card, spoken messages, color box, drawing and
camera) is in full in git: `git show 54c009f84:design/ui/studio/notes/engineer.md`. Older entries
(2026-10-06 to 10-17): `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

Trimmed 2026-10-30 (the file passed 25 KB); the full earlier Top of mind (the Select-card count
fix 71230abff1, the unknown-end mark, inspector node names, the weight re-run, Select within the
picture, the r1 dry-run-1 fixes, each with tests and re-walks): `git show dc360dd57f:design/ui/studio/notes/engineer.md`.

- (2026-10-30) Round 1 screenshot audit on 79ed770292 at 1200x900 and 900x700:
  `tier4/rounds/round-1/expert/engineer.md`. No severity 3 or 4. Top severity 2s, all app: the
  table dock header overflows at 900 (issues chip drawn over the Edges tab, Edges tab gone with a
  Hide card on, "Columns:..." cut); source names cut to ONE letter after a join ("d..", "f...");
  kind glyphs differ between table header and Fields/Filters lists (still); Export Columns chip
  "1 of 1" for Edges while the table says 3 of 3; at 900 the canvas toolbar covers a third of the
  drawing. Fix order if a fix pass comes: header row overflow, source name truncating last, the
  export column count, the one glyph map.

- (2026-10-30) The study tool now checks tier 4's scripted bars itself. `real.mjs --end` writes
  `data.json` (`dataState` in `measure.mjs`: counts, sources with element counts, a `sourcesOf`
  recount and the row chips, load mappings, known fields, columns, filter cards with their chips),
  and every download adds a `downloads.jsonl` line with the network at that moment
  (`networkCounts`). `endstate.mjs` is bar 4's end-state check over them; `steps.mjs` is bar 7;
  `bars.mjs --tier 4 --scheme dark|light` is bar 5's axe walk of the nine data screens (BAR5_TIER4)
  and writes `vocabulary.json` / `spoken.json` for `wording.mjs`. Each has a `--self-test` or test
  (`tier4.test.mjs`) that fails on a planted case and fails on zero items.
- (2026-10-30) The gate (`--gate rounds/round-N`) now reads pilot walks from the dry run's passes
  `rN`, `rNd1`, ... as well as the round's own folder, and a walk is the success walk only when
  named success / path / pointer (anything else not keys/keyboard is a detour). Tier 4 needs
  `bars` (dark) and `bars-light` (light), each `--tier 4` with every bar 5 screen at both sizes and
  a non-empty `vocabulary.json`. On 2026-10-30 the gate on round 1 still refuses T66A (no success
  walk on 79ed770292); the bars runs exist and fail only on the axe finding below.
- (2026-10-30) OPEN DEFECT, bar 5 (app; severity is the accessibility specialist's): the table
  dock's Nodes tab (`#mantine-...-tab-nodes`) has `aria-controls` naming a panel that is not in the
  page; axe `aria-valid-attr-value` critical on every Data screen with the table open, both sizes
  and themes (`tier4/rounds/round-1/bars*/bars.json`). The fix belongs where the table's Tabs are
  built (a panel per tab, or no aria-controls while the panel is not rendered).
- (2026-10-30) The wording check on 79ed770292 lists 65 shared words and 1 phrase across 22
  prompts (most from the start screen's marketing text and its links); that is the researcher's
  "Kept on purpose" work, not a tool fault.
- (2026-10-30) The matcher's refusal of a name shared by different kinds now offers
  `"role=<kind>:<name>"` (with `#n` only within one kind): it used to offer "Samples#1", which it
  then refused. `--prove` checks both, and a planted page that blocks drag events proves "the
  drop was not delivered" is printed.
- (2026-10-30) Data panel facts the tool relies on: source rows are `.dp-source[data-source=key]`
  with chips in `.dp-source-chips`; filter cards are `.dp-filters > *` in condition order; both
  draw compact-mantine's `EntityChip` (`.cm-entity-chip[data-kind] .cm-entity-text`). Filter
  steps (`visibility.steps`) are the conditions seen another way, not another filter.
- (2026-10-30) A re-walk after a rebuild runs with `REAL_WARM_POOL=0`: a warm browser of the same
  build stamp keeps the app it loaded before the rebuild.
- (2026-10-30) Queue every route of a re-walk in one background script (one browser) and judge each
  as it lands; replays started by hand get stranded by a session end.
- (2026-10-29) OPEN DEFECT in the date card (`DateCard` in `style/WhichPicker.tsx`): changing its
  match (Before -> After) clears the box but the filter keeps the old bounds. Fix: a date card with
  no bound writes no condition; test by real input switching the match.
- (2026-10-29) Still open: a mixed column draws the mixed glyph in the table but Aa in Fields
  (`TypeGlyph` has no "mixed"); unticking every load in a Data source card leaves the last rule.
  Seen 2026-10-30: after a join the first file's row loses its issue chip while the table still
  says "With issues 2".

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

- 2026-10-30 worked (screenshot audit): `bars.mjs <out> --dist <frozen> --tier 4 --size <WxH>`
  walks the nine data screens at any size and adds the cut-text check (bar10 in bars.json) for
  free; then plain `real.mjs` walks with `REAL_VIEWPORT` for the states it skips (cards, header
  menu, export scopes), each walk in one background script, one browser at a time. Without
  `REAL_SCHEME` the sessions open light, the bars walk dark: both themes for nothing.
- 2026-10-30 did not work (names in audit walks): "Expand gauges.csv" is not there while the group
  is open; a column name with the Filters picker open is ambiguous (header button vs option): use
  `role=option:<name>`; "Add a condition" exists only once a value is ticked; with the picker open,
  a bare `--click installed` sorted the table instead.
- 2026-10-30: design-studio screenshots never go into git (`tools/check-committed-images.mjs`);
  commit only the audit's .md, naming screenshots by path.

- 2026-10-30 worked: verifying the browser gate with ten `--start`s in one background script, each
  holding its browser for two `--wait` steps, counting `node ... real.mjs --serve|--warm`
  processes once a second (count the node processes only; the gate's bash wrapper repeats the
  command line): at most 8, every session ended, `BROWSER_SLOTS=17` refused (exit 2).
- 2026-10-30 did not work: `--expect "Add source"` and `--expect "1 issue in ..."`: `--expect`
  text does not read accessible names; an icon button needs `--expect role=button:<name>`.
- 2026-10-30 did not work: a shell heredoc whose text holds a timed polling loop is refused by the
  foreground-wait hook even when it only writes a file; write the script with the Write tool.

- 2026-10-30 worked: one background script replaying every route in turn, plus a Monitor on its
  results file; a foreground wait loop is refused by the hook, so check the file between other work.
- 2026-10-30 worked: a strip of each screenshot's Filters column and selection header
  (`tmp/u1-select-count/strip.py`) reads chip counts and "N nodes selected" side by side.

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
