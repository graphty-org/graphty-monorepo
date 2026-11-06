# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/feat-tanstack-ai` (branch `feat/tanstack-ai`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier6/criteria.md`.

Summarized 2026-11-05 after round 2 (26 KB): tier 6 study tool fixes, round 1 audit detail and old Top of mind 1 to 3: `git show bf3ca180c3:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 at the tier 6 round 1 close, dry run 1 fixes and older Top of mind items: `git show 22d9aa4f3a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB), tier 4 round 1 close, the shard-death note, test traps, the ScriptedAssistant probe and older decision pointers: `git show 899ecf2f6a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (26 KB), long working facts 0 to 2 shortened: `git show 4c7676a1dd:design/ui/studio/notes/engineer.md`.
Summarized again 2026-11-05 (29 KB), tier 6 dry run 1 decisions shortened and old open defects moved under Working facts: `git show 48879618c4:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB); every tier 3 and 4 Top of mind item, decision and tried entry: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Older: 2026-10-17 dry-run fixes `git show 54c009f84:design/ui/studio/notes/engineer.md`; 2026-10-06 to 10-17 `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

0. (2026-11-06) Round 2 fixes are done; 11 were rejected and reverted (see "Tier 6 round 2 fixes").
   Every rejection was something the walk saw and no unit test did: walk each fix's acceptance route,
   read the HEAD file, zoom focus rings and dialog edges, and read generated phrases as words.
1. (2026-11-05) Before accepting "that was the model", read what the tool told the model. The repaint
   is the tool's default (`style ?? true`) with no effect and no word in its result.
2. (2026-11-05) A fix must reach the surface the reader met: no reader hovered, so a tooltip fix
   alone would not have reached Ruth; the label did the harm.
3. (2026-11-05) In an audit, read the cause in the code before naming it, and cite the screenshot of
   the step itself. The skeptics caught me on two: the starters' cause (`justify` was already set) and
   07.png cited for what 08.png shows. The 400% owner was also misnamed: `frame.css`, not the modal.
4. (2026-11-05) A severity 3 needs a reader who acts on a wrong belief that does not correct itself.
   Done and Talk both came down to 2 on that test. Count sightings honestly: a second walk that
   shows half a defect is not a second sighting.
5. (2026-11-05) Trace a symptom to the turn's real calls before fixing the layer that shows it
   (chip-row: the app fix was rejected, bfeb7ef81c in the element held). The route log settles who
   made a state: when the x first appears tells whose selection it is.
6. (2026-11-05) Walk the exact route a fix's acceptance names, with its state carried in, and read
   acceptance from the walked result, not the tests. export-scope passed every test and gave a
   one-row file.
7. (2026-11-05) `--replay` matches pre-model steps and diverges at the first model reply: use it for
   setup and keyboard stretches, then `--step` by hand and judge the screenshots. A "match" can hit a
   same-named control. route.jsonl line N+1 is replay step N.
8. (2026-11-05) During a run, poll `--read` for "Stop Esc" gone before the next message (allow 75 s
   under a selection); a fixed `--wait` garbles the composer. Long steps: nohup into a log and
   `tmp/agent-wait.sh` on a grep of it. `tail -f`, sleep loops and Monitor loops are refused, and the
   hook refuses a Bash heredoc that merely holds those words: use Write.
9. (2026-11-05) Trust a dist only by grepping the bundle for a string literal from the commit. Copy
   the dist into the walk's tmp folder: a neighbor's rebuild 404s lazy chunks. A tier 6 walk outside
   tier6/ needs REAL_TIER=6 as well as REAL_DIST; real.mjs takes its own browser slot.
10. (2026-11-05) Shared worktree: check `git status` and `git diff` first, commit a tested fix before
    the long walk, commit by path. See "Committing beside a sibling" below. commitlint: lowercase
    subject, body lines of 100 characters or fewer, and use -F. The safety check refuses `rm -rf` on a
    variable path: use a fresh folder or a literal path.
11. (2026-11-05) A live model's optional arguments vary per run, so a default that makes a reply false
    belongs in the tool, not in description wording. Force a question by wording ("Select the top five").
12. (2026-11-05) Element assistant facts: the element reopens a conversation on load, matches typed
    answers, forgets keys and clears history with no assistant up, moves keys between storages,
    reports `undone`, and names a call's algorithm (`calledAlgorithm`). Regenerate the saved-format
    schema with `GRAPHTY_WRITE_FORMAT_SCHEMA=1` on `test/ai/conversation/formats.test.ts`. A raw
    `style.encode` layer with `by` paints nothing: encode through `styles.encode`, then narrow. Only
    the newest facts block is sent, so earlier turns' scope lines never reach the model.
13. (2026-11-05) `main.tsx` is StrictMode: an effect cleanup that clears store state must check the
    state really left, because the dev double effect runs cleanups on mount.
14. (2026-10-30) Show a choice before the act. Every participant is the same model: a failure is
    strong evidence, a pass weak. A tool line is a claim; check the screenshot before fixing.

## Tier 6 round 2 critique (2026-11-05)

Read in source, not run, on HEAD bf3ca180c3. Screens viewed: r2-s01/18, r2-s02/29, r2-s05/05,
r2-s07/05, r2-s10/05, repro r2-s06/04.

Proposed, in order:

- Painting run: `runEffects` (`ai/tools/families/algorithms.ts`) adds style effects for the run's
  layers, `summarizeRun` says it painted; `apply_suggestion` (`families/style.ts`) has the same hole.
  Why: `RunsApi` line 1398 paints by default and only AI_EFFECT_RUN comes back. Which runs passed
  `style: false` is inferred: walks record no arguments.
- Autosave: `status.unexported` already tells a change from none. Branch label and tooltip in
  `autosave/words.ts`; the tooltip alone reaches nobody.
- Long reply: Conversation's follow effect has no dependency on the saved messages, so the rows
  that land after the status settles may not scroll. Hypothesis; prove it on a walk first.
- Composer placeholder says "this graph" under "Selection N"; scope word becomes "Only selection".
- Names: `wordsFor` at the three `plainName` uses in `assistant/words.ts`, as style and history do.
- Status-less AI_PROVIDER_ERROR: say the key may be at fault, offer both buttons. AI_KEY_REJECTED
  already has its door, so no element work; skip the key words for a provider needing no key.
- Show in table: follow the `dockColumn` pattern, call DataTable's `scrollToRow`.
- Small: question label as a nested Text, `<form>` for Enter, strip the trailing period at
  `historyWords.ts` line 359, composer focus after Undo, Remove and Answer, 400% repro and rule.

Decided: not changing the `style` default, the catalog's `plainName`, Open run, Group names, the
start page wheel (approved surface), or Recent projects for opened files (`locateFile`'s picker is
JSON only, and `chooseAndOpenFile` opens every format).

Worked: reading the tool's description and result beside the insight's "model's" verdict; a 2x crop
of the panel foot showed the cut line and the placeholder together.

## Tier 6 round 1 insights (2026-11-05)

Source: `tier6/rounds/round-1/insights.md`, on frozen build 3b2a7f0649. All 24 sessions were refused,
so it rests on four expert walks and reading the source. Mechanisms are read, not run, unless stated.

Fix list, with the owner the check settled on (none is a breaking change, none is started):

- 400% Settings: `.ws-dialog-columns` in `graphty/src/workspace/frame/frame.css` leaves
  `.ws-dialog-page` 0 px under 720 px wide and about 330 px tall, in every section. Write `repro/`.
- Missing selection line: `results` `top` in `graphty-element/src/ai/tools/families/algorithms.ts`
  calls `selection.apply` and returns only `foundEffects`. Add a selection effect (additive); the app
  words it with design 6.6's "Selected {N} nodes".
- Focus after Undo, Remove, Answer: one rule, composer gets focus. `Waiting.tsx` raises
  `composerCalls` only for Change this. Settings is out: returning to the opener is correct.
- Two names for one result (Influence, PageRank, Degree, Connections): the app replaces the name by
  id. Changing the catalog's `plainName` changes what an API returns, so do not.
- Done drops a typed key: it is local state and only Save writes it. Severity 2.
- Talk: `VoiceSession.ts` line 530 emits `ai-voice-start` before `startSpeechInput`, an element
  ordering defect; `Talk.tsx` lines 89 and 90 announce nothing on end. Severity 2.
- Question text smallest on its card: `Radio.Group label` takes `cm-field-label`; fix in `Waiting.tsx`,
  never the locked theme.
- Starters centered: `justify` at `AssistantPanel.tsx` line 78 is inert, since compact-mantine applies
  `--button-justify` only to a full-width button. Likely `fullWidth`, not run.
- Still open from my audit, at 2: second scrollbar around the panel (mechanism unproven), no Declined
  line after Keep them, the log losing the reader's place (Undo half's mechanism not found).

Do not build until ruled (none is a one-way door): whether the kept "selection surviving Undo" covers a
rollback, whether `decided.md`'s x entry reaches closing the panel, whether a painting run also gets a
Colored row. Chip inside a change line stays a question for the sessions. Only a rollback's lit Redo is
new, and "Redo removes with no card" was never run: run it before claiming it.

Held up: approval card, peek, rail dot and notice, dark theme, axe on every state measured, and every
count on a chip, card or line. Do not spend fixes there.

## Tier 6 dry run 1 fixes (2026-11-05)

Full reasons per fix: the git pointer at the top of this file. All stand except chip-row's first fix.

- undone-reopen: the mark must not bump updatedAt; always save the copy just listed or loaded.
- `batch.writes` is false for undo failures and denials too, so it does not mean "a read".
- run-scope: bound scopes become `{ nodes: ids }`; a message's scope is what was selected when sent.
- words-stay: `saveInto` is append-only by id; a request must end in tool results.
- export: listen in `link`, not `useAssistantView`; `link` can run twice, so it needs the WeakSet guard.
- privacy: words shared with the lazy assistant chunk go in assistant-door/provider.ts, or the main
  chunk pulls the catalog and "off means no chunk" breaks.

## Tier 6 dry run 2 fixes (2026-11-05)

Per-fix decisions, walk craft and the six unacted sightings moved out 2026-11-06:
`git show 51923a5411:design/ui/studio/notes/engineer.md`.

Committing beside a sibling editing the same file (still the rule; refined in the round 2 section):
`GIT_INDEX_FILE=tmp/<task>/index`, `read-tree HEAD` right before committing, put my hunks on the
`git show HEAD:<file>` text, `hash-object -w` + `update-index --cacheinfo`, commit with the real
hooks, then `update-index --cacheinfo` the same blobs on the shared index, or a neighbor's commit
reverts mine. Check `git show --stat` for paths that are not mine.

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

## Thinking

- (2026-10-17) Any per-frame input needs a "pressed since the last frame" record: polling hid taps.
- (2026-10-10) A finding that traces to the prompt's own words is fixed in the prompt.

## Tried: worked / did not work (before tier 6)

- 2026-10-30: design-studio screenshots never go into git (`tools/check-committed-images.mjs`);
  commit only the .md, naming screenshots by path.
- 2026-10-30: `--expect` text does not read accessible names; use `--expect role=button:<name>`.
- 2026-10-29: `--replay` "matches" ignore a combobox value and a card body: look at the screenshots.
- 2026-10-29: a wait loop on `pgrep -f` matches its own command line; wait on a file the job writes.
- 2026-10-29: `npm run build` in graph-io breaks the element's tests (writes `dist/src`).
- Entries dated 2026-10-29 to 10-30 in full: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
- Entries dated 2026-10-21 and earlier (bars.mjs sizes, real.mjs keys and starts, builds while
  other agents rebuild, Escape and focus traces, live regions, disabled-state proofs), in full:
  `git show 51d0e57509:design/ui/studio/notes/engineer.md`.

## Sources

- Digests in `design/ui/studio/digests/`; repository `CLAUDE.md`; `design/ui/studio/tool/README.md`;
  `design/ui/studio/owner-decisions.md`; `design/ui/studio/tier6/`.
