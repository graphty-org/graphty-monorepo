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
Trimmed again 2026-11-02: the 2026-10-30 study tool facts (scripted bars, the gate's walk
folders, the wording check, the matcher's role names, data panel selectors, `REAL_WARM_POOL=0`,
one background script per re-walk): `git show 42601df9bf:design/ui/studio/notes/engineer.md`.
Trimmed again 2026-11-02 (file at 31 KB): the tier 4 round 1 close, its cheapest bar fixes, two
lessons, the round 1 screenshot audit and the open date-card and mixed-glyph defects:
`git show 0ec56d2f3b:design/ui/studio/notes/engineer.md`.

- (2026-11-02) RE-WALK, main-table and test-mode fixes (1c02b8a883, a6257fe0c7) on a rebuilt
  `graphty/dist` (stamp a6257fe0c7), `design/ui/studio/tmp/r1-dry1-recheck-main-table/`: no
  regression, every acceptance holds. Method that worked: `sweep.sh` replays the pilot routes 4 at a
  time with `REAL_REPLAY_TOLERANCE=1000` (the hidden data table changes every screen's control
  list, so only printed output and names count) and `--end-on-diverge`; a step that only did
  nothing in the pilot is dropped with `drop.py` and the route replayed again; the fix walks in
  `tmp/r1-dry1-test-mode/` replay with `--keep` and serve as the continuation. After Done the data
  table lists what the canvas draws (T75A 112 of 549, T71B 6 and 3, T70B 7, T77B 9, T70A d3 15 of
  24); under an open workspace F6 cycles workspace, preview, inspector, status, top bar, rail and
  never the table; Tab never reaches it; after Done it is back as it was. T74A/B By position 5 and
  3 (5 of 24, 3 of 11 G02 G03 G04) reopen as By position; By position by keys puts focus in "how
  many". Dates: Between to After keeps 1990, After to Between, Between 1990 to 1999 is 3 of 11 and
  reopens so. Observations, not regressions: (a) By position 7, By value, By position again comes
  back empty (`top: undefined` on the switch, as before the fix); (b) Between "to 1999" to Before
  gives "before 1999", dropping 1999 itself (the same text, a different bound, as decided.md says
  the date moves); (c) By value after a brush shows the min at full precision
  (0.0279617489842932) once focus moves into it; (d) F6 into the data table now lands on the column
  header last used (the setup's "installed"), not on the Nodes tab: `panelTarget` restores the
  control that last had focus, which now survives because the table no longer re-renders under an
  editor (likely mechanism, not proven); (e) "5 of 24 nodes" is announced twice on Enter.
  The fix itself: the element keys a measure step's run without its test (`stepRuns.ts`), and
  `UnionStep.mode?: string` (additive, opaque) holds the mode; details `git show a6257fe0c7`.

- (2026-11-02) A 50,000-node edit shows "Drawing" before it blocks (decided.md "Dry run pass 1").
  App only: `SelectionEditor.tsx` hands every edit, Done, Cancel and Escape on one painted frame
  later, opens the workspace from local state and names it in the store after the paint, and holds
  the preview, strip, editing selection and canvas framing until that first frame (`warm`). Test:
  `LargeGraph.real-element.test.tsx` "an edit says Drawing in the frame of its input" (fails
  without the change: the first frame after a tick already held the new count). Re-walked on a
  fresh build into `design/ui/studio/tmp/r1-dry1-busy-sign/` with `REAL_GLANCE_MS=300`: every route
  matched its pilot; first frame after a tick 33 to 65 ms, Done 18 to 21 ms, a new filter card
  216 ms, each glance showing "Drawing" with the old count; settled headers 1,050 of 50,000.
  STILL OPEN: opening Which nodes right after adding a layer paints its first frame 1.4 to 2.3 s
  after the press. The block is not the editor's: a default-priority React render of `RowStyle`
  (`session.styles.agreement`, ~0.9 s, uncached, read in render through `row.ts`
  `paintedOverOf`/`beneathOf`) and `StyleTree` counts (~0.26 s) runs between pointerdown and click,
  most likely started by the press closing the new layer's name field (`renamingRow`). Fix where
  it lives: graphty-element caches `agreement` per style and input revision (as a reading over an
  unchanged stack), or the app stops re-reading it on renders that change nothing it reads.
  `REAL_PROFILE=1` + `tmp/busy-sign/prof.mjs` in the studio worktree found it.

- (2026-11-02) REGRESSION in the cancel-new-card fix (0ec56d2f3b), re-walked on `graphty/dist`
  (stamps 92a64cffe5 and 0ec56d2f3b, both hold it) in
  `design/ui/studio/tmp/r1-dry1-recheck-cancel-new-card/`: a new filter card opened from Quick
  actions (Ctrl+K, "filter", Enter), then Cancel (or Escape on its empty picker), sends focus to
  "Main menu" (or the toolbar's "Quick actions"), not "Add filter" as the frozen build did
  (`keyboard-sr/16.png`; frozen: `keyboard-sr-frozen/`). Mechanism: `FiltersSection.open` records
  `document.activeElement` when the card is made; from the palette that is the body or the control
  the palette hands focus back to, never a filter control, and `backToOpener` focuses any connected
  element outside `.dp-filter` (body.focus() does nothing, so focus falls to the first stop).
  Fix: remember the opener only when it is a control that opens filters (toolbar Filters, Add
  filter, an attribute's Filter to...), or fall back to Add filter when it is the body or inside a
  closed popup. Everything else held: T79A d3 and T70B d5 end with no card and no top-bar mark,
  Enter on the returned focus opens a new card (focus was on Add filter); T77B d2 Cancel on an
  existing card restores "telemetry yes" 7 of 11 and keeps it, Undo then reads "Undo editing the
  filter"; a once-new card reopened and Cancelled restores its rule (the born flag resets on close);
  T77B d3 toolbar Filters, Escape keeps focus on toolbar Filters; layer editor Done unchanged.

- (2026-11-02) The data table never takes an editor's selection (decided.md, "Dry run pass 1").
  Cause: `TableDock` read the store's `editingSelection` (Group column, "Matches only", whole-graph
  matches), and an editor at rest keeps holding that slot after Done, so the table kept the last
  card's matches (T75 A 549 listed, 112 drawn). Fix in the app (no element change): `TableDock`
  no longer reads `editingSelection` at all (Matches only and its Group column are gone from it;
  the strip owns them); `Frame` keeps the dock's box while a selection workspace is open but marks
  it `inert` and `data-covered` (CSS `visibility: hidden`), so the canvas is not resized and the
  strip is the one table under the preview; the Table command's focus-the-grid step now keys on
  `selectionWorkspace`, not `editingSelection` (which outlives Done). `editingSelection` still
  feeds the canvas key's preview, the strip's group chip and Filters. Test:
  `graphty/src/workspace/table/__tests__/TableEditorSelection.real-element.test.tsx` (fails on the
  pre-fix sources at the inert check; with only the old TableDock its after-Done rows wait never
  settles, so it fails only at the 15-minute wait guard -- stop such a run rather than sit on it).

- (2026-11-02) The reference search ("Within N hops of", `nodePage({ matching: { names: true } })`)
  found nobody by name on a graph FILE with no label column: every graph-file load sets
  `knownFields.nodeLabelPath` to `label` "whether or not this file has one" (`loadLabel` in
  `draft.ts`, `data.import` in `data.ts`), so `names` read only a column no node holds, and only
  ids matched. Fix in graphty-element `query.ts` `textTest`: when none of the `only` paths is a
  column the graph answers (bare or `data.` spelling), read every searchable value, as a graph
  with no label column already did. Test `graphty-element/test/session/page-matching-file-names.test.ts`
  (import and draft routes; fails on baac78342b). Re-walked on a fresh build
  (`design/ui/studio/tmp/r1-dry1-reference-names/`): "James", "Carter", "James Carter" each list
  v02 James Carter first, Layer 1 reads 16; gauges "Cedar" lists Cedar Bend first (7); 50,000
  nodes list "8 of 50,000" / "8 of 1,076". Still open, same root: on such a graph a node's NAME
  (`nameOf`, the inspector, the Which row "Within 2 hops of v02") reads the absent `label` and
  falls back to the id; the clean fix is for a load to set `label` only when the file holds it.

- (2026-11-02) Tier 5: every style count reads over the graph the filter leaves. graphty-element
  added `StyleCounts.visible { matched, of }` and legend `scope.visible` (additive; `matched` and
  `scope.of` unchanged). The app reads them in the tree rows, Everything's "styles all N", the
  "no condition is left" notice and the key's "N of M" (no key line once a layer holds every node
  drawn). Re-walked T72A d2, T72B d3, T77A d1, T70A success on a fresh build: 7 / "all 7", 5 / "5 of
  5", 10 beside "10 of 10", key "4 of 15". Still over the whole graph: the collapsed Which row's
  `useHead`, MultiRowPanel, LayerValues "on N of M", PropertyRow "on N" -- check them if a reader
  meets two bases again.

- (2026-11-02) The false "Covered by <lower layer>" (tier 5 dry run, 8 pilots) was a reading
  taken in the window between `view.end()` of a branches view and the view's end repaint landing:
  a layer whose selector was written during the view had no prepared bindings yet, so agreement,
  counts and the legend read the layer below as deciding. `style:branches-shown-changed` fires in
  that window and no event follows the repaint, so the app kept the stale reading until any
  unrelated re-render. Fix in graphty-element `StylesApi.ts` (`viewPending`): until that repaint
  lands, the stack's readings read what the layer last painted, as they already did during the
  view. Also the legend's value reach now reads the stack's own layers, never the view's
  suspended stand-ins. Tests: `graphty-element/test/session/scope/covered-claim.test.ts` (fails
  without the fix), `graphty/src/workspace/style/__tests__/CoveredClaim.real-element.test.tsx`.
  Residual: a CHANNEL added to a layer while a view is drawn reads from the old bindings until
  the next style event; no pilot route does that.
  Re-walked all eight routes on a fresh build (`design/ui/studio/tmp/r1-dry1-covered-claim/`):
  no Fill "Covered by" and no key "covered by" for the edited layer on any; the key's count equals
  Which nodes. Where the key still says "covered by", it is under the LOWER layer, which the edited
  layer truly paints over (T70A, T73A) -- correct.

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

- 2026-11-02: An edit in the selection editor is handed on one painted frame after its input
  (`afterPaint` in `SelectionEditor.tsx`: `requestAnimationFrame` then `setTimeout`, the handover
  inside `flushSync` so no queued input runs between it and the host's write). The edit waits as
  the editor's own rule (`waiting`), so the outline shows it and a second edit before the handover
  builds on it, never on the rule before it (a stale second tick would drop the first). Opening
  draws the workspace from local state (`opening`) and names it in the store only after the paint,
  because the panels that follow the store (`RowStyle`'s `agreement`, the style tree's counts) cost
  the opening ~0.6 s before its first frame. The preview, the strip, the store's editing
  selection and the canvas framing wait for `warm` (the workspace's first frame painted); Done,
  Cancel and Escape go through `closeAfterPaint`. Why: decided.md "Dry run pass 1", an edit that
  blocks shows that it is working first; app-only, no element change (the element is not slow to
  answer; the app called it before painting).
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

- 2026-11-02 did not work: a CPU profile (CDP `Profiler`) of opening, a tick and Done inside the
  `real-element` test on 50,000 nodes: the force layout and SwiftShader frames swamp it (React's
  share under 1 s of 100 s), so it cannot say what blocks the real app. What blocks is not needed
  to fix the sign: deferring everything an input starts by one painted frame covers it whatever it is.
- 2026-11-02 worked: timing the first animation frame after an input, armed by a capture
  `pointerdown`/`keydown` listener, both in a test (`firstFrameAfter` in
  `LargeGraph.real-element.test.tsx`, asserts what that frame drew, never how long) and in the
  study tool (`ms.firstFrame`, `ms.input`, `ms.glance` in route.jsonl).

- 2026-11-02 worked: probing a reading at each moment (in the event listener, right after
  `view.end()`, after `settled()`) in a happy-dom session test found the stale window in one
  run; a reading only after `settled()` (the earlier fix's test) can never see it.
- 2026-11-02 did not work: `git diff <path> | git apply -R` to test without a fix in a shared
  worktree also reverts other agents' uncommitted hunks; build a patch from `git show HEAD:<file>`
  with only your own edits and `git apply --cached` it to commit just those.

- Entries dated 2026-10-29 and 2026-10-30 (screenshot audit with bars.mjs, names in audit walks,
  the browser gate check, replay with --keep and --end-on-diverge, background re-walk scripts, the
  date Autocomplete, the 1,000-node real-element test): `git show 0ec56d2f3b:design/ui/studio/notes/engineer.md`.
- 2026-11-02 worked: comparing a keyboard path in two `--sr` sessions, the fixed `graphty/dist`
  and the frozen build, side by side: the `focus:` lines show a focus-return regression that a
  pointer walk (no focus ring after a click) cannot.
- Entries dated 2026-10-21 and earlier (bars.mjs sizes, real.mjs keys and starts, builds while
  other agents rebuild, Escape and focus traces, live regions, disabled-state proofs), in full:
  `git show 51d0e57509:design/ui/studio/notes/engineer.md`.

- (2026-11-02) Worked: one helper (`amongDrawn` in StylesApi) serves both `counts().visible` and
  the legend's `selects`, so the key and the rows cannot drift. Did not work: a real-element test
  whose `waitFor` callback awaited `findByRole` sat with no output for 13 minutes; a synchronous
  `getByRole` inside `waitFor` is the shape the other tests use.

- (2026-11-02) Worked: reproducing a reading bug by loading the study's own fixture shape through
  `data.import` and `data.prepare(...).load()` in a happy-dom test; a test that builds nodes with
  `addNodes` skips the load's label default and passed while the app failed.

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

## Round 1 close (2026-10-30)

- Decided: when work resumes, fix in this order -- join preview truthful (sev 2, most severe),
  joined source row layout (bar 6), table Tabs aria-controls (bar 5), the time column's kind glyph,
  the study tool's popover reporting. Reason: bars 5 and 6 are single mechanical fixes; the join
  preview is the costliest core task (about 12 inputs against a path of 7).
- Learned: bars 2 and 3 failed partly on the answer key's definition and on the tool's
  `tooltip: null`, not on the design. Check a failing bar's evidence before building a fix for it.
- Learned: every participant is the same model, so a failure is strong evidence and a pass weak.

## 2026-11-02 Busy-sign re-walk on the committed build (f6ab091f47)

- `graphty/dist` was older than f6ab091f47 and still held the reverted cancel-new-card fix (stamp
  0ec56d2f3b), so the earlier busy-sign re-walk ran on a build with that fix. Rebuilt (stamp
  f6ab091f476b; it also carries another agent's uncommitted, additive `UnionStep.mode` element
  change). Replayed T79B success into `design/ui/studio/tmp/r1-dry1-recheck-busy-sign/`: steps 1 to 7
  matched the pilot. In the glance 300 ms after ticking Otter Creek (`08-glance.png`), the header
  reads "Drawing" with the old count, 50,000. Ending the session stopped the replay at Done (step 8).
  That stop came from the end, not from the build.
  Still to re-walk: T79B success from Done on, T79B detour-3, T79A success, and both keyboard walks
  (Enter, Escape, Tab and Shift+Tab). Script: `tmp/busy-sign-recheck/run.sh` (`--end-on-diverge`,
  `REAL_GLANCE_MS=300`).
