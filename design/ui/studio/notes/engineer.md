# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/feat-tanstack-ai` (branch `feat/tanstack-ai`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier6/criteria.md`.

Summarized 2026-11-06 at the round 2 close (44 KB): the round 2 critique, round 1 insights, dry run 1 and 2 fixes and the pre-tier-6 tried list: `git show 564d726ce3:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 after round 2 (26 KB): tier 6 study tool fixes, round 1 audit detail and old Top of mind 1 to 3: `git show bf3ca180c3:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 at the tier 6 round 1 close, dry run 1 fixes and older Top of mind items: `git show 22d9aa4f3a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB), tier 4 round 1 close, the shard-death note, test traps, the ScriptedAssistant probe and older decision pointers: `git show 899ecf2f6a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (26 KB), long working facts 0 to 2 shortened: `git show 4c7676a1dd:design/ui/studio/notes/engineer.md`.
Summarized again 2026-11-05 (29 KB), tier 6 dry run 1 decisions shortened and old open defects moved under Working facts: `git show 48879618c4:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB); every tier 3 and 4 Top of mind item, decision and tried entry: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Older: 2026-10-17 dry-run fixes `git show 54c009f84:design/ui/studio/notes/engineer.md`; 2026-10-06 to 10-17 `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-11-06) Round 3 runs on build a80da6d62e. Watch first: does a painting run's line ("..., colored
   by it") reach readers and stop the model denying the repaint; does the placeholder under
   "Selection N" stop the planted wrong answer; do Settings at 400%, focus after a press, reply end in
   view and Show in table hold now that the refixes landed.
2. (2026-11-06) Round 2's one shape: the screen says less than the graph did, or says it where the
   reader is not looking. Fix by joining an existing line, never by adding rows at rest.
3. (2026-11-06) One change per problem so a round can credit it; the refused second forms (scope word
   "Only selection", a Colored row, "Autosave: no changes") are the next step only if the first fails.
4. (2026-11-06) Rulings settled: a painting run says so on its existing line; a rollback leaves no
   selection or Redo; closing the panel does not end the scope x (design 5.2).
5. (2026-11-06) 11 round 2 fixes were rejected on the re-walk, all for what only a walk sees: walk
   each fix's acceptance route, read the HEAD file, zoom focus rings and dialog edges, read generated
   phrases as words.
6. (2026-11-06) The study tool hovers only on command, so "nobody hovered" measures the tool, not the
   design. Never rest a fix on a tooltip alone, and never count hover data as evidence.
7. (2026-11-06) Check a claim at its source before building on it: "a different door gives a handle"
   was false (both Opens are one `pickFiles` command; only Save and Locate get a handle).
8. (2026-11-05) Before accepting "that was the model", read what the tool told the model.
9. (2026-11-05) A severity 3 needs a reader who acts on a wrong belief that does not correct itself.
10. (2026-11-05) Trace a symptom to the turn's real calls before fixing the layer that shows it.
11. (2026-11-05) Walks: `--replay` for setup only, then `--step` by hand; poll `--read` for "Stop Esc"
    gone; trust a dist only by grepping the bundle; copy the dist into the walk folder.
12. (2026-11-05) Shared worktree: `git status` first, commit tested fixes by path before long walks;
    commitlint lowercase subject, body lines of 100 or fewer, `-F`.
13. (2026-11-05) A default that makes a model reply false belongs in the tool, not description wording.
14. (2026-11-05) StrictMode double effects: a cleanup that clears store state must check it really left.
15. (2026-10-30) Every participant is the same model: a failure is strong evidence, a pass weak.

## Tier 6 round 2 close (2026-11-06)

Taught: 11 of 12 finished, no false done, Undo 2 of 2, every count held, no confirmed severity 3.
What is left is the screen saying less than the graph did (repaint with only "Computed", "Ask about
this graph" under "Selection 14", focus lost after a press, a reply foot below the fold).

Decided, with reasons (tier6/rounds/round-2/decisions.md):

- Keep the run's `style ?? true` default and the catalog `plainName`: changing either is breaking and
  not needed; the painted fact comes from the element's own decision instead.
- Refused key: the app cannot tell a 401 from a drop (no CORS header on OpenAI's 401), so the words
  say the key "may be" at fault, offer the provider, and keep Send again.
- Autosave: tooltip made true; label branch refused (flips on every Save and Undo).
- `showOpenFilePicker` on Open refused for now: a new door with a permission prompt on reopen.
- Opened-step plain words, Group 1 to N, start page wheel: refused, each needs a concept or a design.

Watch in round 3: whether the 400% repro settles bar 9; whether bar 5 moves after units 3 and 7
(re-run T92 A and T90 for credit); "Changed the graph" rows left after T93 B and T94 A detours (name
the write behind each); the 193-screen audit for bars 10 and 11; whether the conversation returns
with a key after a reopen.

## Tier 6 round 2 fixes (2026-11-06)

Rejected and reverted by the re-walk (tier6/rejected-fixes.md): panel-names-say-what,
settings-at-400, focus-after-a-press, one-name-per-measure, autosave-tooltip-is-true,
enter-saves-the-key, show-in-table-lists-its-rows, no-raw-text-on-app-rows, spoken-once,
disabled-looks-disabled, assistant-door. Their lessons stay below; the refix goes in the shared part.

Decided (standing fixes):

- open-run-and-layer: run ids come from the run's identity, so a rerun reuses the id; each run's LAST
  effect in a turn decides its link (Map by run id; the effect carries `run`). Unpainted rule only for
  measure-row and run-row kinds, skips queued and running runs. Status line "Opened {name}" (the
  glossary keeps "inspector" a Docs word).
- run-says-it-painted: painted = suggestions added minus runs.layers(id).missing, since painting() is a
  first-completion snapshot. apply_suggestion reports suggestions.length. Turn-level truth lives in
  changeLines (used by Checks and the connection).
- rollback-leaves-nothing: drop the whole redo side on a take-back (history is linear). Reuse "evict";
  it is outside GRAPH_CHANGES, so a held request is not made stale. Restore selection through public
  session.selection.apply after the undos.
- model-stops-at-a-no: name the outcome code in the instruction ("AI_APPROVAL_DENIED is over") and the
  substitute seen (a filter for a removal); give the selection rule a reason, no domain words.
- end-rows: count what the revert undid (`revertMessage` returns `taken`), not the redo side; leave
  `steps` out at 0, the app branches on presence.
- top-with-select: selection effect before the found effect, so existing TurnEffects draw both; moved
  selectionEffects into effects.ts with a tx parameter.
- failed-step-says-why: reasons in one table beside `causeWords`, "X: reason."; AI_UNKNOWN_ENTRY words
  must hold for every kind.
- typed-answer: the option says how the answer was given (typed); a text naming a choice picks it.
  Removed the 1,500-character result cap that dropped long answers whole. An element option goes in 4
  places: graphty-element.ts, Graph.ts, AiManager, AiController.
- reply-end-in-view: ResizeObserver on turns AND the log box (the composer shrinks the log); only an
  upward scroll stops following.
- composer-says-its-scope: words from scope.kind; Chromium hides a labelled textarea's placeholder, so
  set aria-description too.
- question-at-body-size: ink var(--cm-text), one label element for radio and checkbox cards.
- undo-notice: undoOrRedo posts its words, covering Redo and the keys; the turn's own Undo does NOT go
  through undoOrRedo.
- failure-with-no-status, key-page-keeps-what-was-typed (Done commits through a page ref; skip the
  blur check when focus goes to the button that checks anyway), a-dialog-holds-the-keys (one rule in
  useCommandKeys; judge Esc by the press's target, Mantine closes in capture phase),
  scope-x-survives-closing (watch selection in Workspace.tsx), change-lines-read-once (fold in
  changeLines; keep only the last selection; "and N more" focuses the first revealed line).

Lessons from the rejected ones:

- A name built from a list's first item is only as good as its order: name the line that changed the
  graph, or every line. Unit tests used a removal-first turn and hid it.
- `overflow: visible` inside a modal paints past its edge; crop a short dialog's bottom 50 px.
- A focus fix must be committed as walked: HEAD's Waiting.tsx had JSX-text goToComposer while the
  walked working tree was fine. Read the HEAD file, not the diff, before calling a fix done.
- data-disabled on a compact-mantine Button drops the focus ring (disabled rule 0,3,0 outranks focus
  0,2,0; ActionIcon has the exception, Button does not). Zoom a Tab onto any newly grayed button.
- A native title tooltip is invisible to real.mjs (tooltip: null): prove it by bundle grep + unit test.
- Generated phrases ("No matches for X is above 50") need a grammar read on real rule text.
- spoken-once: set the "just sent" flag at message start, not end; keep buttons outside a live region.

Craft:

- Build only after checking the worktree's uncommitted edits; prove the dist by grepping a literal from
  the newest commit, and the stamp can lie. Copy dist into the walk folder.
- Prove "fails without the change" with vi.spyOn/vi.mock or a scratch copy, never by overwriting
  shared source; a failing findBy waits for the 15-minute guard, so run new tests narrowly with -t,
  in the background, with no local deadline (a queued run gets killed).
- Commit right after tests pass; a neighbor's commit by path takes my half-done hunks. `git commit --
<paths>` commits the disk file, siblings' edits included: use the private index for shared files.
- `git apply --unidiff-zero` with dropped hunks misplaces the rest; rebuild from HEAD with anchored
  replacements. commitlint body lines <= 100 chars; prettier in the hook can reflow tables and returns.
- real.mjs: REAL_TIER=6 outside tier6/; --sr refuses --click (use Control+i, type the choice) but
  prints focus and live: lines; `--click "Open run#2"` for repeated names; --replay diverges at the
  first model reply and ignores end-row text, so read screenshots; Jump to newest needs a reply
  landing while scrolled up.
- Forcing states: failure on demand = private REAL_GEMINI_COUNT file filled to 5000+ bytes mid-run; a
  question = "Before doing anything, ask me which ... offering the choices"; a removal = "Please remove
  that run again"; a stop with changes taken back = Escape about 5.5 to 7 s into a painting request; a
  failed end row = "Make one call only, look nothing up first, and if the call fails stop and say so";
  a free CORS failure = a bad OpenAI key.
- Ask the model to quote each call's args, code and params in the SAME message; later it forgets.
- ScriptedAssistant's callsTurn reuses call ids across messages; check only the newest effect.
- pgrep -f in agent-wait matches its own bash -c: wait on a log grep instead.

## Tier 6 walk and test craft (2026-11-05)

Worked:

- Proving a test fails without a change, with the shared tree untouched: a copy of `src` and `test`
  in `graphty-element/tmp/<x>` holding `git show HEAD:` versions and a tiny vitest config; a scratch
  test that `vi.mock`s the module (createQueryEngine without `answers`); or a copied file behind
  `vi.mock` (ConversationOld.tmp.tsx). In-place copy-aside with a `git diff --stat` compare worked
  once, but `cp` and `mv` of shared source is unsafe with other agents running. `findBy*` has no
  local deadline, so a proof needs a synchronous `queryBy` after a settled condition (`finished()`).
- A temporary index (`GIT_INDEX_FILE`, read-tree HEAD, hash-object and update-index per file) commits
  only my hunks of a file another agent also edited. format-staged skips it, so run prettier by hand.
- Failure on demand: start with `REAL_GEMINI_COUNT=<private file>` holding 3000 bytes, send, empty the
  file, press Send again (the count is read per request). The "cap is reached" line keeps printing
  and means nothing; those calls do not count toward the tier's shared cap. A failed message's text
  stays in the composer until Send again clears it.
- To see a model's rule, ask it in the same conversation to quote its steps' rules. Word a message
  explicitly to force a path ("Use your tools: first count ... then clear the selection"). For
  scoped calls, asking for the selected people as their own network reliably sent one.
- `--replay ... --keep`, then `--step`, for a route that diverges only on a timestamp or count.
  Grepping `route.jsonl` old against new for "finished:" shows a status line change at once.
- A saved conversation's undone mark needs all four paths walked: undo with another showing, redo
  with another showing, a later edit dropping the steps (hide a layer, Redo empties), reopening.
- real.mjs prints "a file was saved: ..." on the step. A spy on `URL.createObjectURL` and
  `HTMLAnchorElement.prototype.click` in a real-element test captures blob and name.
- Reading panels: a PIL montage (crop 0,40 to 336,900) reads four or five steps in one image.
- A `--replay` stays open after a divergence so a route can be finished by hand; pass
  `--end-on-diverge` when that is not wanted.
- A surprising "No matches.": ask the model to quote its rules, then compare the pilot's same step.
  One such read traced to a message bound to a stray one-edge selection, not to an edge-half
  regression, and the query engine was fine.

Did not work, or traps:

- `--reopen` forgets the provider key: Restore and re-enter it (AI provider..., API key, Save); until
  then the panel has no conversation list. The most recently updated conversation opens, not the
  last one open. OpenAI's key check refuses the placeholder, so only Google can be saved in a walk.
- Focus lines print only in `--sr` sessions; otherwise read rings from a crop strip. Never Enter
  blind: mine hit Close. A Tab from "What is collected" goes to Done, so step one key at a time.
- `--hover` and `--click` by name stop a batch on a miss: read the tail before trusting a later shot.
- A `--step` with a fixed `--wait` can end while the model runs; the next `--type` lands in the
  composer. `--wait 45000` under `timeout 150` printed nothing and took no screenshot (cause not
  confirmed): use shorter waits. After expanding steps focus sits on that button and `--type`
  refuses; click "Message the assistant" first.
- Study walks record no tool arguments, so a failed step's call cannot be recovered afterwards.
- Words beside a failure, once the failure is fixed, have no natural route: Stop, a connection
  failure and "Not run" are reachable; the rest needs the unit test.
- A failed-setup replay leaves its session running; deleting its folder makes `--end` fail with
  ENOENT, so recreate the empty folder and `--end`. `kill` is denied; TaskStop stops a background run.
- Do not chain a queued low-lane test with temporary source files: they sit there during the queue.
  Start builds outside the test-slot queue. Foreground waits of 30 s or more are refused.
- A Bash heredoc holding a timed polling loop is refused even when it only writes a file: use Write.
- `git -C ../..` from design/ui/studio points at design/, so path-limited diffs come back empty.
- Settings' section list is a PageList: its items are role gridcell, not button. Start-page node
  clicks miss while the drawing turns: pause it or take the node by label.
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

Earlier copies: `git show b14af76f0e:design/ui/studio/notes/engineer.md`, `git show c413f93c4f:design/ui/studio/notes/engineer.md`.

0. (2026-10-29) Runs read weight from `data.loadedWeight()`, which follows the weight role; a
   designated column that is not the stored one is read as a column, and a role taken away reads
   unweighted. Tests: `test/session/loaded-weight.test.ts`, `test/browser/runs-loaded-weight.test.ts`.
1. (2026-10-29) A date column is a `date` card field when the descriptor says `measurement: "time"`;
   bounds are in `spanOf` (`style/cards.ts`). A bare number under 4 digits is not a date.
2. (2026-10-29) An issue must name what happened to the file: a graph-io error with a line is not a
   refused row (`SKIPPED_VALUE`, `loadFactsOf` in `session/issues.ts`). Before trusting an issue count,
   compare it to `report.counts.skippedNodes/skippedEdges`.
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
9. Prove a test fails without the change: either run it on HEAD's file copy, or show the probe's
   output on the unfixed build (as for the yeast issue: 6 `E_COLUMN_TYPE` rows before, none after).
10. Rebuild before a walk: `pnpm exec nx run-many -t build -p graph-io graphty-element graphty`
    (low-priority), then `real.mjs --replay <old walk> <new folder> --keep`, `--step`, `--end`.
11. API changes: additive ones go in `owner-decisions.md` under "decided by the team"; a changed
    default or a renamed or removed member goes "for the owner". A new element member needs
    `doors.ts`, `test/cost-coverage/method-classes.ts` and `npm run api:report`.
12. Element facts worth citing: layers paint one kind; `styles.addRow` takes an empty row;
    `data.histogram` takes data columns only; a bound label size wins over a label style's size.
13. Study tool: `--click "role=<role>:<name>"` for shared names, `--click-at x,y` when a name
    will not match; step N lands in screenshot N+1; always `--end`.

Older open defects, from Top of mind:

- (2026-10-30) Open from tier 4: the join preview tags the wrong rows (sev 2; it must show exactly
  what Join will do), table dock header overflow at 900 px, Nodes tab `aria-controls` names an
  unrendered panel, one glyph map (`TypeGlyph` has no "mixed"), export column count.
- (2026-10-29) Open: changing a `DateCard` match clears the box but keeps the old bounds (a card
  with no bound must write no condition); unticking every load in a Data source card leaves the
  last rule.
- (2026-10-21) Open from tier 3: the node's own Fill "+" makes a one-node layer and starts at the
  value nodes already have; the folder chain icon paints every cluster one color; the F6 stop
  has no focus ring. Full earlier list: the git pointer at the top of this file.
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

- (2026-10-17) Any per-frame input needs a "pressed since the last frame" record: polling hid taps.
- (2026-10-10) A finding that traces to the prompt's own words is fixed in the prompt.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`;
  `design/ui/studio/owner-decisions.md`; `design/ui/studio/tier6/`.
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
