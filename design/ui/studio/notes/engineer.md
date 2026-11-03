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
Trimmed again 2026-11-02 (file at 27 KB): the cancel-new-card focus regression and the reference
search by name on a file with no label column: `git show 50626246ff:design/ui/studio/notes/engineer.md`.
Trimmed again 2026-11-02 (file at 28 KB): the main-table and test-mode re-walk, "Drawing" before a
50,000-node edit blocks, and the data table never taking an editor's selection:
`git show 64cd59e285:design/ui/studio/notes/engineer.md`.

- (2026-11-02) A walk's defect may already be fixed: check the walk's `session.json` commit against
  the fix before building anything. The round 1 pilot's reference search "Nodes 0" for a person's
  name ran on baac78342b, before 92a64cffe5; on HEAD the search lists "v02 name James Carter"
  first (fresh walk in `design/ui/studio/tmp/r1-dry1-reference-names/`), and the element test
  `page-matching-file-names.test.ts` fails with the old line. No code change was needed.

- (2026-11-02) Cancel on a new filter card now leaves the history as it was before the card. Mechanism
  on 47c95a09fc: Cancel called `removeCondition`, a third step, so Undo read "Undo deleting a filter
  condition" and put the card back; the removal landed after the workspace closed, so the status
  line said "Filter off" after "Filter not added". Fix: additive element option
  `history.restoreTo(step, { redo: "drop" })` (History.dropRedo; owner-decisions "decided by the
  team"). `FilterCard` keeps the newest step id at the card's birth; `takeBack` restores to it when
  every step since touches only `visibility`, else falls back to `removeCondition`. A module counter
  `takingBack` keeps FilterChip from announcing the take-back. Rejected: a transaction around the
  card (Undo inside the card would cancel the whole card); `restoreTo` alone (Redo brings it back).
  Tests: element `styles/undo.test.ts` "restores to a step and leaves nothing to redo"; app
  `FilterCardKinds` "leaves the history as it was" (hangs on the old code: its waitFor never
  settles). Re-walks on a fresh `graphty/dist` (`design/ui/studio/tmp/r1-dry3-cancel-no-undo/walk.sh`):
  T79A staff-50k new card, Grants, Cancel: Undo names "changing the layout" (the step before),
  Ctrl+Z / Ctrl+Shift+Z undo and redo that step, no card, no top-bar mark; T72B gauges the same with
  "changing a column's role"; T70B keyboard and T72B touched-7 say only "Filter not added"; T79B
  touched-6 (existing card Cancel) and touched-3/4 (focus) replay unchanged. Limit: a redo tail the
  reader had before the card is still lost at its first tick, as any edit loses it.
  Lesson: a negative check that patches a source file must not run in the background past the
  turn; the hang guard holds the patched file for 15 minutes.

- (2026-11-02) Cancel on a new filter card takes the card away, focus back to its opener (toolbar
  Filters or Add filter; `OPENS_FILTERS`, `takeDraftOpener`, focus moved once `selectionWorkspace`
  is null). Full entry with its tests, re-walks and the 15-minute hang-guard lesson:
  `git show 4d9a4d4643:design/ui/studio/notes/engineer.md`.

- (2026-11-02) RE-CHECK of the open-busy-sign fix (e13e34f007, 64cd59e285): `graphty/dist` was built
  at 14:15 from the uncommitted fix, before both commits; rebuilt from the committed tree (15:21).
  Re-walk script `design/ui/studio/tmp/r1-dry2-recheck-open-busy-sign/rewalk.sh` (8 pilot replays,
  4 at a time, incl. T79B keyboard for Enter/Escape/Tab/Shift+Tab) was started but stopped before
  any route finished; sessions ended. Still to walk: all 8 routes, by running that script.
  Acceptance to check (decided.md "Dry run pass 2"): firstFrame of "--click Which nodes" under 1 s
  (pilot 1,187 to 1,273 ms), its glance shows the workspace or "Drawing", the Otter Creek tick glance
  shows the box ticked beside "Drawing".

- (2026-11-02) Opening Which nodes right after adding a layer on 50,000 nodes now shows the
  workspace with "Drawing" in its first frame, 345 to 374 ms after the click (was 1.3 to 2.3 s),
  and a tick shows the box ticked beside "Drawing" (was an empty box for the 13 to 20 s of work).
  Two mechanisms, two fixes:
  (1) graphty-element: `styles.agreement` walked every element of its scope on every call, and the
  style row reads it in render (`row.ts` `paintedOverOf`/`beneathOf`), so any re-render of the row
  (the press that closes the new layer's name field) cost ~0.9 s. `StylesApi.ts` now keeps the
  answer over `"graph"` and `"selection"` per question (`kept`, keyed by scope, channel, below,
  over) while a token holds: the compiled stack array, the branches view, `viewPending`,
  `styleRevision`, `inputRevision`, a new internal `stateRevision` source, `editableBase`,
  `liftDrawn`. `GraphSession.ts` bumps `stateRevision` on every selection change and in
  `repaintStates` (hover, ghosts, pins), because a selection change advances no input tick and a
  `{match:"state"}` selector reads it. Without the source (bare `createStylesApi`) nothing is kept.
  The "costs nothing" claim in StylesApi's header is corrected. No public API change (`StylesSources`
  is not in the API report). `counts()` is NOT kept yet (~0.26 s per layer on 50,000; it reads
  `"visible"`, which also moves with ghosts and time windows): the next step if the first frame
  must get under ~350 ms.
  (2) app: the box was not stale state. `CategoryCard` already read the waiting edit ("Uncheck 1"
  showed); Mantine's Checkbox fills and grows its tick by a 100 ms CSS transition, and the work
  started one frame after the click, so the transition froze at its start for the whole block.
  `afterPaint` in `SelectionEditor.tsx` now waits for every running `CSSTransition` to finish
  (never `CSSAnimation`: a spinner may never end) before handing the edit on. Every control the
  editor holds gets it, not only the checkbox.
  Tests: `agreement.test.ts` "keeps its answer over the graph until the stack, the data or an
  element state moves" (identity and resolve counts; fails uncached); `LargeGraph.real-element.test.tsx`
  "opening Which nodes right after adding a layer walks no style agreement before its first frame"
  (wraps `styles.agreement`, counts answers not given before; 6 fresh walks without the cache) and
  the tick in "an edit says Drawing..." asserts no transition on the box is running when
  `scope.watchSteps` is first called (fails without the wait: [true, true, true]).
  Re-walk on a fresh `graphty/dist` into `design/ui/studio/tmp/r1-dry2-open-busy-sign/`: T79B
  touched-40 and success, T79A success, detour-3 and touched-30, T74A and T70A success all matched
  their pilots; settled 1,050 of 50,000.

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

- 2026-11-02 worked: before fixing a walk's defect, read the walk's `session.json` `commit` and ask
  `git merge-base --is-ancestor <fix> <that commit>`. The round 1 pilot's "Nodes 0" for "James" on
  volunteers.graphml ran on baac78342b, which predates the fix 92a64cffe5 (a graph file's load names
  `label` as the label column even when the file has none; `query.textTest` now reads every value
  when no name path is a held column). Nothing had regressed: the test
  `test/session/page-matching-file-names.test.ts` passes on HEAD and fails with the old line put
  back, and a fresh walk lists "v02 name James Carter" first for James, Carter and James Carter.

- 2026-11-02 did not work: asserting "the frame before the longest pause between frames shows the
  box ticked" (or "the last frame with the old count") in the 50,000-node test: in the test the
  tick's work does not block at once, so frames keep coming through the transition and the test
  passed without the fix. Worked: assert at the moment the work starts (wrap `scope.watchSteps`)
  that the control has no running animation -- deterministic however long the block is.
- 2026-11-02 worked: a cache test that wraps the reading and counts answers it has not given
  before (object identity), from the app side, needs no hook in the element.

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

## Older sections

- The dated decision records of 2026-10-29, the round 1 close of 2026-10-30 and the busy-sign
  re-walk on f6ab091f47 (superseded by the 2026-11-02 re-walk in `tmp/r1-dry2-open-busy-sign/`):
  `git show 50626246ff:design/ui/studio/notes/engineer.md`.
