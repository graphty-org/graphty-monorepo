# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/feat-tanstack-ai` (branch `feat/tanstack-ai`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier6/criteria.md`.

Summarized 2026-11-05 (26 KB), long working facts 0 to 2 shortened: `git show 4c7676a1dd:design/ui/studio/notes/engineer.md`.
Summarized again 2026-11-05 (29 KB), tier 6 dry run 1 decisions shortened and old open defects moved under Working facts: `git show 48879618c4:design/ui/studio/notes/engineer.md`.
Summarized 2026-11-05 (27 KB); every tier 3 and 4 Top of mind item, decision and tried entry: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Older: 2026-10-17 dry-run fixes `git show 54c009f84:design/ui/studio/notes/engineer.md`; 2026-10-06 to 10-17 `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-11-05) chip-row is refixed in graphty-element (bfeb7ef81c: a message's scope ends when its
   selection empties) and its re-walk was not rejected. The first fix, in the app, was rejected;
   its lesson stands: trace a symptom to the turn's real calls before fixing the layer that shows it.
2. (2026-11-05) Walk the exact route a fix's acceptance names, with its state carried in, and read
   acceptance from the walked result, not the tests. Skipping T92 A's s20 click before the x leaves
   the 14 selected and changes the reads; export-scope passed every test and gave a one-row file.
3. (2026-11-05) `--replay` matches pre-model steps and diverges at the first model reply: use it for
   setup and keyboard stretches and to show where a fix bites, then `--step` by hand and judge the
   screenshots. A "match" can hit a same-named control. route.jsonl line N+1 is replay step N.
4. (2026-11-05) A fixed `--wait` is not enough: a `--type` then Enter during a run leaves text in the
   composer and the next `--type` garbles it. Poll `--read` for "Stop Esc" gone before the next
   message; allow 75 s for a message under a selection.
5. (2026-11-05) Long steps: start with nohup into a log and use `tmp/agent-wait.sh` on a grep of it.
   A client killed by `timeout` does not lose the step. `tail -f`, sleep loops and Monitor loops are
   refused. Slow tests (test/ai/tools/coverage, actions.contract) also go in a log.
6. (2026-11-05) Trust a dist only by grepping the bundle for a string literal from the commit (a tool
   description; minified code can miss). Stamps can lag or lead what a build holds. Copy the dist
   into the walk's tmp folder: a neighbor's rebuild 404s lazy chunks mid-session.
7. (2026-11-05) Shared worktree: check `git status` and `git diff` first, commit a tested fix before
   the long walk, commit by path. See "Committing beside a sibling" below. commitlint: lowercase
   subject, every body line 100 characters or fewer, and a -m paragraph is one line, so use -F.
8. (2026-11-05) A live model's optional arguments vary per run, so a default that makes a reply false
   belongs in the tool, not in description wording. Models often answer instead of asking: force a
   question by wording ("Select the top five", "Ask me which file type I want").
9. (2026-11-05) A tier 6 walk on a folder outside tier6/ needs REAL_TIER=6 as well as REAL_DIST;
   without it the setup fails with 'nothing on screen is called "Assistant"'. real.mjs takes its
   own browser slot, so with-browser.sh is not needed around it.
10. (2026-11-05) Element assistant facts: the element reopens a conversation on load, matches typed
    answers, forgets keys and clears history with no assistant up, moves keys between storages,
    reports `undone`, and names a call's algorithm (`calledAlgorithm`). The app holds none of that.
    Regenerate the saved-format schema with `GRAPHTY_WRITE_FORMAT_SCHEMA=1` on
    `test/ai/conversation/formats.test.ts`. A raw `style.encode` layer with `by` paints nothing: a
    bound message encodes through `styles.encode`, then narrows the selector.
11. (2026-11-05) Only the newest facts block is sent (test/ai/AiController.history.test.ts), so the
    model cannot know earlier turns were scoped: their scope lines never reach it.
12. (2026-11-05) `main.tsx` is StrictMode: an effect cleanup that clears store state must check the
    state really left, because the dev double effect runs cleanups on mount.
13. (2026-11-05) Under heavy load, browser test shards died with no failed assertion ("error when
    mocking a module", then "rpc is closed"). Suspected mechanism, not proven: `test/setup.ts`'s
    `@babylonjs/core` factory runs on a dead connection and vitest's route handler rejects unhandled.
14. (2026-10-30) Show a choice before the act; one fact drawn two ways sends readers to a second
    menu. Every participant is the same model: a failure is strong evidence, a pass weak. A tool line
    is a claim; check the screenshot and a failing bar's evidence before fixing.
15. (2026-11-05) Study tool: tier 6 sets BROWSER_SLOTS=4 itself; the default of 8 stands. Count
    sessions with '^[^ ]*node [^ ]*real\.mjs --(serve|warm)', never `pgrep -f 'real.mjs --serve'`.
    See "Tier 6 study tool fixes".

## Tier 6 dry run 1 fixes (2026-11-05)

Full reasons per fix: the git pointer at the top of this file. All stand except chip-row.

- undone-reopen: the mark is written at change time on saved conversations and at open time on the
  one opening. It must not bump updatedAt. `mergeRecords` keeps stored messages, so a save at a stale
  revision loses a mark: always save the copy just listed or loaded.
- lone-words: fixed at the tokenizer. `batch.writes` is false for undo failures and denials too, so
  it does not mean "a read": check the failure code and each result's writes flag.
- edge-half: the gate is `answers(path, kind)` or some element of that kind having the value, because
  a run need not declare its fields (test/session/sets/cache-inputs.test.ts).
- run-scope: reuse `requireTarget` with `{ ...args, where }`. Bound scopes become `{ nodes: ids }`,
  since a message's scope is what was selected when it was sent.
- words-stay: `saveInto` is append-only by id, so the held reply is its own message, folded into the
  calls message for the model: a request must end in tool results.
- group-count: optional, readers keep `summary.groupCount ?? groups.length`.
- chip-row (REJECTED, reverted by baeb532d60): the selection-of-nothing rule went in `isChange`. The
  re-walk failed on T92B fact 2: the turn had no found result, so the diagnosis was wrong. Before
  accepting "X hides Y", look at the pilot's opened steps: if no chip appears there, nothing was
  hidden. A bare "No matches." with no "for ..." means an ids target, which on a bound message means
  the selection. Noted, not settled: Escape on a focused chip clears the selection and flips the
  next scope to Whole graph silently.
- send-again: the x lives in the store and Send again reads it at click time; `send()` clears it.
- export: listen in `link`, not `useAssistantView`, or a run finishing with the panel closed loses
  its file. `link` can run twice on one element, so it needs the WeakSet guard.
- privacy: no line may be false. Words shared with the lazy assistant chunk go in
  assistant-door/provider.ts, or the main chunk pulls the catalog and "off means no chunk" breaks.

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

Test traps:

- After a held batch the message spends one more model turn on closing text: let `say` end at the
  hold, then `engine.push` the later turns. Passing all to `say` swallows the second batch.
- A question's leftover scripted text turn is consumed by the answer, so push no closing turn after a
  question. A rollback test must assert `rolledBack` on the first result: an invalid call fails at
  prepare, nothing runs, and the test is vacuous. selection.size counts nodes plus edges.

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

- `pgrep -f 'real.mjs --serve'` also counts the with-browser.sh bash wrappers, doubling the count and
  adding queued starts (it read 10). Match only the node process:
  '^[^ ]*node [^ ]*real\.mjs --(serve|warm)'.
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
- A small ScriptedAssistant test or probe (with `session.data.prepare`, config `{ data, format }`)
  settles a question in seconds; a call per turn reproduces a failure, and `lastResults()` shows the
  code the model read. `run.scope` is resolved: assert on `scope.spec` and `scope.nodeCount`.
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

## Decisions and reasons

- Decisions dated 2026-10-29 (time role drawing, Sources row layout, date conditions, typed cards,
  dropped values marked in graph-io): `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
- Decisions dated 2026-10-19 to 10-21 (screenshot audit bars, Escape and tooltips, focus after a
  redraw, select all, layer kinds, replacing loads, renamed channels): in full in
  `git show d3302b379c:design/ui/studio/notes/engineer.md` (trimmed 2026-10-29 for size).

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

## Round 1 close (2026-10-30)

- Fix order when work resumes: join preview truthful (sev 2, about 12 inputs against a path of 7), joined
  source row layout, table Tabs aria-controls, the time column's kind glyph, the tool's popover reporting.
- Bars 2 and 3 failed partly on the answer key and on the tool's `tooltip: null`.
