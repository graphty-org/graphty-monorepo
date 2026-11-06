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

Refreshed 2026-11-03 after tier 5 round 1 closed; prior Top of mind (audit mechanisms, tool fixes,
void-round lesson): `git show 296294ddad:design/ui/studio/notes/engineer.md`.

- (2026-11-03) TIER 5 ROUND 1 CLOSED, studio stopped at the 1-round cap with bars 1, 3, 4, 8, 9
  failing (`tier5/rounds/round-1/insights.md`, 30 valid sessions on build 1e123d7d33). Next round
  starts with my fixes, each re-walked by its repro.
- (2026-11-03) SEV 3, app: a filter step picked from a run's results binds a different run (picker
  offers the 112-node run, card counts over a new whole-graph run). Fix where a run is named: the
  element gives each run's facts including scope, the app words them and binds by that identity.
  Trace first whether the binding defect is the app's or how the element identifies a run result.
- (2026-11-03) SEV 3, app: speech from a hidden panel (`WhichPicker.tsx` useAnnounceChange
  under an open workspace). Fixed after the freeze; re-walk only. Rule: speak only from the
  surface that is showing.
- (2026-11-03) By position box: add direction (top/bottom) and unit (number/percent); the error
  built from `card.top ?? 10` claims a limit an untouched step does not apply -- derive the
  sentence from what is applied, never from a default.
- (2026-11-03) Empty Fill color box: give it a visible cue and stop the picker committing and
  closing on the first click when empty. If that click is the shared color input's, fix it in
  compact-mantine, not the app. Swatches are Figma-locked: do not add colors.
- (2026-11-03) "Is exactly" on an empty text step reverts to Contains (`TextCard` sends
  `{...card, match}`; the empty card is dropped downstream). Keep the match on an empty card.
- (2026-11-03) Clear then Escape (and probably Clear then Done) deletes a REOPENED card:
  `SelectionEditor.tsx:812` and `close("done")` call `onEmptyCancel()` without the
  `openedNew` check. Gate on openedNew; test both paths.
- (2026-11-03) Bar 9 editor elements: a just-added Or group opens at "B 0" with the picker open and
  a full-drawn untouched range; "Condition..." / "Or..." never say "and" / "or else". Words are the
  content designer's; I build the first state and wire whatever words are decided.
- (2026-11-03) Workspace header deep in Tab order (Done 11-34 keys away, no F6 stop): make it an
  F6 region per interaction-patterns before adding anything bespoke.
- (2026-11-03) Bar 7 smaller fixes: value picker jumps over its field and Done (decided 734); Clear
  renames to "a selection" (631-632); two-step card rests as one row with no caret; bare reference
  id (694); card name stale after Or or a second step.
- (2026-11-03) Lesson: one session can fail a bar (T75 A was n=1); a held bar is weak evidence.
  Repro every finding myself before building, and cite the frozen source line, as the skeptics did.
- (2026-11-03) Lesson: rate against decided rules and task blockage, not looks; both skeptics cut
  my 900x700 rating and the "is exactly" and Clear-Escape items to 2 because no one met them or
  the screen announced them. Still fix data-loss paths: Undo cannot restore the card.
- (2026-11-03) Study design, not code: T73's key disagrees with its words; fixtures pre-colored in
  the asked color inflate "drowned color" findings. Do not build for either.
- (2026-11-03) Still open from the audit: reference picker is a second picker build (one shared
  searchable combobox), matches strip `min-width: 0`, element's selection `truncated` unread,
  width rule below 1280 needs decided.md first, `leakCheck` false positive in `tool/real.mjs`.

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

- 2026-11-03: Rated the 900 x 700 workspace collapse 2, not 3. Reason: the spec and decided.md set
  check widths only at 1440 x 900 and 1280 x 800, no task runs smaller, and the step pane keeps its
  width; both skeptics held my earlier 3 at 2. A width rule below 1280 needs a decided.md entry first.

- 2026-11-03: The warm-pool self-test holds its slot (queue, no quit on a queue) instead of the
  pool's try mode. Reason: in try mode the verdict followed machine load (8 studio browsers for 152
  of 167 s, no warm browser ready in 120 s, the next start cold); the check is about the takeover,
  and try mode's slot policy is covered by `with-browser.test.mjs`'s try-mode test. Real warm
  browsers keep try mode, so they never stand between a start and a slot.
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

- (2026-11-03) Worked: reusing the void round's walk scripts (`tmp/engineer-audit/walk.sh`,
  `big.sh`) unchanged for the rerun; the build and the canvas points (1200x900: 620,790; 900x700:
  480,575) were the same, and every step matched with no miss. Run them one after another from one
  script (`tmp/engineer-audit-r1/all.sh`) while a round runs: one browser per agent, and the start
  queues behind the round's sessions anyway. While waiting, arm a background `until` on the next
  log line and read the finished sessions' screenshots; the hook refuses a waiting loop in the
  foreground (and any command whose text looks like one).
- (2026-11-03) Worked: tracing each finding to a line before writing it (a CSS rule, a constant, a
  field nothing reads) turned three "to trace" owners into exact ones in minutes of grep.

- (2026-11-03) Re-check of the warm-hold fix (90e826175a): it changes only design/ui/studio/tool
  (real.mjs, README, with-browser.test), no app source and no route, so no walk and no rebuild.
  Worked: with-browser.test 7 pass (incl. the new "waits in the queue for a slot"), match.test and
  bar8-9.test 5 pass, `node --check real.mjs`, no leftover flock/sleep/warm processes. Did not
  work once: the first `node --test with-browser.test.mjs | tail` ran past a 300 s timeout; two
  reruns (to a file, and through a pipe) finished in 4 s. Mechanism not found; if it recurs, run
  with `--test-reporter=spec` to a file to see which test it stops in.
- (2026-11-03) Warm-hold fix, checked on the frozen build: 10 starts at once peaked at 8 studio
  browsers (count node processes only: `ps -eo comm,args | awk '$1=="node" && /real\.mjs --(serve|warm)/'`;
  `pgrep -f` also counts the bash gate wrappers and read 20); all 10 GPU, 2 took over warm browsers;
  a replay of T71B detour-1 matched all 13 steps. Did not work: reusing a gate folder from an
  earlier run (s10 refused: "already holds a session's screenshots"); use a fresh folder.
- (2026-11-03) Re-check of the study tool fix (2aa3ff3fad): it changes only design/ui/studio/tool, no app
  route, so no walk. Worked: with-browser.test (11 pass, incl. BROWSER_SLOT_ALSO), match.test (2),
  bar8-9.test (3), waits.mjs --self-test, and waits.mjs on round-1/bars/sessions (9 waits over 10 s on
  the 50k path, longest 33.7 s on Done). Did not work: waits.mjs on rounds/*/pilot reads 0 routes (the
  pilot folders hold none; routes live under rounds/round-1/bars/sessions). Slip: ran bar8-9.test
  without with-browser.sh; it starts a browser, so always wrap it as its header says.
- (2026-11-03) Did not work: a gate test holding only slot1 of a planted "machine" pool: a command
  not drawn on the GPU defaults to 4 slots and took slot2 at once. Hold 1 to 4. Worked: `exec 7>&9
9>&-` then `exec` the gate on the second pool keeps both locks and the pid.

- 2026-11-02 did not work: resolving the page's scope before reading the revision in `page()`
  (as `neighbors` does). The scope resolution cache is itself keyed on the tick, so it served the
  stale masks too. The defect was below every cache, in the mask that failed to move the tick.
- 2026-11-02 did not work: a page assertion in the app's `FilterCardKinds` "leaves the history as
  it was" test passed on the old element too (something else in the app moves the tick on that
  path), so it proves nothing; the element test is the one that fails. The app test resolves
  graphty-element through its dist: rebuild `graphty-element:build` to test an element change there.
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
