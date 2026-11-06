# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/feat-tanstack-ai` (branch `feat/tanstack-ai`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier6/criteria.md`.

Summarized 2026-11-05 at the tier 6 round 1 close, dry run 1 fixes and older Top of mind items: `git show 22d9aa4f3a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB), tier 4 round 1 close, the shard-death note, test traps, the ScriptedAssistant probe and older decision pointers: `git show 899ecf2f6a:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (26 KB), long working facts 0 to 2 shortened: `git show 4c7676a1dd:design/ui/studio/notes/engineer.md`.
Summarized again 2026-11-05 (29 KB), tier 6 dry run 1 decisions shortened and old open defects moved under Working facts: `git show 48879618c4:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB); every tier 3 and 4 Top of mind item, decision and tried entry: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Older: 2026-10-17 dry-run fixes `git show 54c009f84:design/ui/studio/notes/engineer.md`; 2026-10-06 to 10-17 `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-11-05) Tier 6 round 1 closed with no session run and the studio stopped: the Gemini count is
   3,000 of 3,000, and only the owner can raise the cap (about 680 requests for walks and 12 sessions;
   4,000 covers it). Fixes and the 400% reproduction need no model. Never pass the cap with a private
   count; a filled private file is only for a refusal with no paid call.
2. (2026-11-05) Next work is the fix list under "Tier 6 round 1 insights". First the 400% `repro/`,
   since finding 1 is the only open severity 3 and is not counted until `repro/` holds it.
3. (2026-11-05) Round 1 says what is on screen, never what a reader paid: no reader has seen the
   Assistant. Do not treat a finding as reader evidence; T90 and T92 decide Done, chips and small text.
4. (2026-11-05) In an audit, read the cause in the code before naming it, and cite the screenshot of
   the step itself. The skeptics caught me on two: the starters' cause (`justify` was already set) and
   07.png cited for what 08.png shows. The 400% owner was also misnamed: `frame.css`, not the modal.
5. (2026-11-05) A severity 3 needs a reader who acts on a wrong belief that does not correct itself.
   Done and Talk both came down to 2 on that test. Count sightings honestly: a second walk that
   shows half a defect is not a second sighting.
6. (2026-11-05) Trace a symptom to the turn's real calls before fixing the layer that shows it
   (chip-row: the app fix was rejected, bfeb7ef81c in the element held). The route log settles who
   made a state: when the x first appears tells whose selection it is.
7. (2026-11-05) Walk the exact route a fix's acceptance names, with its state carried in, and read
   acceptance from the walked result, not the tests. export-scope passed every test and gave a
   one-row file.
8. (2026-11-05) `--replay` matches pre-model steps and diverges at the first model reply: use it for
   setup and keyboard stretches, then `--step` by hand and judge the screenshots. A "match" can hit a
   same-named control. route.jsonl line N+1 is replay step N.
9. (2026-11-05) During a run, poll `--read` for "Stop Esc" gone before the next message (allow 75 s
   under a selection); a fixed `--wait` garbles the composer. Long steps: nohup into a log and
   `tmp/agent-wait.sh` on a grep of it. `tail -f`, sleep loops and Monitor loops are refused, and the
   hook refuses a Bash heredoc that merely holds those words: use Write.
10. (2026-11-05) Trust a dist only by grepping the bundle for a string literal from the commit. Copy
    the dist into the walk's tmp folder: a neighbor's rebuild 404s lazy chunks. A tier 6 walk outside
    tier6/ needs REAL_TIER=6 as well as REAL_DIST; real.mjs takes its own browser slot.
11. (2026-11-05) Shared worktree: check `git status` and `git diff` first, commit a tested fix before
    the long walk, commit by path. See "Committing beside a sibling" below. commitlint: lowercase
    subject, body lines of 100 characters or fewer, and use -F. The safety check refuses `rm -rf` on a
    variable path: use a fresh folder or a literal path.
12. (2026-11-05) A live model's optional arguments vary per run, so a default that makes a reply false
    belongs in the tool, not in description wording. Force a question by wording ("Select the top five").
13. (2026-11-05) Element assistant facts: the element reopens a conversation on load, matches typed
    answers, forgets keys and clears history with no assistant up, moves keys between storages,
    reports `undone`, and names a call's algorithm (`calledAlgorithm`). Regenerate the saved-format
    schema with `GRAPHTY_WRITE_FORMAT_SCHEMA=1` on `test/ai/conversation/formats.test.ts`. A raw
    `style.encode` layer with `by` paints nothing: encode through `styles.encode`, then narrow. Only
    the newest facts block is sent, so earlier turns' scope lines never reach the model.
14. (2026-11-05) `main.tsx` is StrictMode: an effect cleanup that clears store state must check the
    state really left, because the dev double effect runs cleanups on mount.
15. (2026-10-30) Show a choice before the act. Every participant is the same model: a failure is
    strong evidence, a pass weak. A tool line is a claim; check the screenshot before fixing.

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

Decisions and reasons, per fix.

- approved-count: restart the totals on any approval (`approved !== undefined`), not only a large
  hold. After an approved delete_all or replacing import the graph is tiny, so a leftover total
  passes the share limit and holds a read, the same bug again. A failed approved batch rolls back
  before the restart, so its totals stay. Known ceiling: a slow approval also clears earlier
  removals, so 40 + slow approval + 40 passes unheld. That matches decided.md; revisit only if a
  slow run and removals ever share a message.
- scope-change: the controller works out afterSelection from the saved scope and passes a boolean, so
  prompt.ts stays a pure text builder and delegate.ts and live sessions are unaffected. The line stays
  on every later whole-graph message, because the earlier narrowed answers stay in what is sent.
- chip-row: the holder is shared, not a field, because MessageState is copied in at least four places
  (same pattern as undo.calls). A batch the reader approved stays bound even if the selection emptied
  while the card was open, or "Remove 42 nodes?" would remove everything. End the binding at batch
  start and inside select, never after an arbitrary call in a transaction: a removal there empties the
  selection and a rollback may discard it ("the selection as sent still binds a held change after a
  reload" caught this: 0 nodes left instead of 18).
- export-scope: "exportProject ignores scope" was wrong: resolveOptionValues([], options) refuses it,
  so a test was enough. It counts Object.keys, so leave the key out on the whole-graph path, never
  `scope: undefined`. RuleTree leaves carry optional `nodes`, so test `kind` to tell a rule from a
  list. settleTarget with required = (boundIds(args, "node") !== undefined) gives "bound: the
  selection; unbound: optional target". { nodes: ["1", 2] } matches integer ids through the
  resolver's other-spelling lookup, so idsOf's string ids need no mapping back.
- last-read: the line goes in the shared lines array, so a helper with an `only` tool list gets it
  too; harmless, and a branch would be code for nothing. It held 3 of 3 on T91 A and on T92 A's
  acceptance routes, against 1 of 2 wrong before.

Committing beside a sibling editing the same file: save the patch before the sibling touches the
file; `GIT_INDEX_FILE=tmp/<task>/index`, `read-tree HEAD`, `git apply --cached <patch>`,
`update-index --cacheinfo` for whole files, commit with the real hooks. Then run `update-index
--cacheinfo` (--add for new files) on the shared index for those paths, or a neighbor's commit undoes
yours. A commit by path after a sibling's commit may be enough when the file then holds only my hunks.

Walk craft:

- `--key Control+i` opens the Assistant and focuses the composer. Keyboard route: Tabs to the
  composer, Shift+Tab until focus reads "Remove". Shift+Tab then Enter on the x leaves focus in the
  composer, so --type works next. In --keys mode Shift+Tab goes x, a disabled Answer, then the last
  radio, and Enter there presses the x: step one key at a time.
- Hand walks: --wait 20000 under timeout 28, then a --wait --read step. Chain --start, --step and --end
  in one Bash call, with --read at the end, for reply and row as text with no screenshot read.
- A route's click on a question's answer may not exist on a rerun, a run may need one more --wait
  step, and a fixed-point edge right-click misses when the layout differs (check the scope line).
  Delete a route's Jump to newest step in advance: it shows only on overflow, and a miss stops the step.
- Walks live in the main checkout: tmp/design-studio/tier6/r1d1/pilot (dry runs, latest) and r1/pilot
  (older, same folder names; check the numbering). Worktree round folders hold only report.md.
- A two-removal message proves a second large removal is still held; a "those" message proves the
  widening line keeps references to earlier turns.

Seen on the re-walks, not caused by these fixes, not yet acted on:

1. Keep them on a second card: closing prose says the 79 are "held for your approval" with no card on
   screen (t93b-sr3/16.png). Look again if T93 participants reach it.
2. A step's chip reads "Not in this graph" and stays so after Undo restores the nodes (t93b-sr3/08.png).
3. Chip beside a different count: 6 beside "There are 7" (t92a-t13/03.png), 3 beside "7 out of 12"
   (t92a-keys/25.png). These predate the last-read build; check them on the next dist.
4. Fact 1 answers Victor Szabo (s10) or Ines Moreau (s11) in the selection-scoped message, not the
   key's Silverline s20 (t92a-keys/19.png, t92a-success/04.png): the model narrows to people or to
   the selection, before any widening.
5. Escape on a focused scope x clears the selection (polite "Selection cleared: 1 node").
6. After Undo a model-made selection of 82 survives and binds the next message (t93b-sr3/08.png). The
   answer key keeps this.

## Tier 6 study tool fixes (2026-11-05)

None of these was rejected by the re-walk. Decisions and reasons:

- The 4-versus-8 browser disagreement is settled per tier, not by changing the default. The default of
  8 is a measured decision and the warm pool needs slots above 4, so tier 6 sets BROWSER_SLOTS=4.
- A tier 6 start closes warm browsers by asking on their socket, not by a signal: a signal during a
  claim would kill the session the warm browser became. Warming ones are killed by process group.
- The gate reads the criteria sentence, so rewording that sentence fails closed.
- The cap check lives in the gate, so a shortfall shows before a session, not as a void mid-round.
- The setup was renamed, not given an alias: the name also sits in route.jsonl and a rename covers
  every place. Old route heads had to be updated so replays still find the file.

Traps:

- warmKey includes real.mjs's mtime, so do not reformat real.mjs while --prove runs.
- graphty's src tests run in the vitest project "browser", not "node".
- To plant a failure without touching shared source, copy words.ts and the test to *.tmp files beside
  them, run, delete.
- A private REAL_GEMINI_COUNT at the cap lets a replay cross pre-model steps with zero paid calls.
- The tool folder is not under the repo's eslint config (270 pre-existing errors); prettier is its
  check.

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

## Tier 6 round 1 screenshot audit (2026-11-05)

Report: `tier6/rounds/round-1/expert/engineer.md`; nothing is fixed yet. I rated Done 3; the check
held it at 2. At the cap I stopped live messages and listed what was not reached.

Worked:

- `REAL_VIEWPORT=<w>x<h>` with REAL_TIER and REAL_DIST in one wrapper script (tmp/tier6-audit/r.sh).
  `--start` works in `expert/` folders with the gate unmet. A PIL side-by-side crop of the panel and a
  three-across contact sheet read many screens at once.
- At the cap, a message still reaches every failure state free: 429 mid-message after an approved
  Remove gave the "failed during a change" screen.
- An abs-positioned hidden span escapes an `overflow: auto` box with no `position`: suspect this for
  any scrollbar on an outer box (`.cm-visually-hidden` in EntityChip, `.ws-assistant-log`). Unproven
  in the page; check it first when fixing.
- The hairline rows of a screenshot (dark pixels at the same y in three columns) measure a frame shift.

Did not work: `--click "Open run"` is ambiguous once two turns have one; use `#n`. Six messages cost
17 calls at 1200 x 900, about three per message.

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
