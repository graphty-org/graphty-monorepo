# Design Engineer -- designer's notes

Role: I build what the studio decides, in the graphty app (`graphty/src/workspace/`) and in
graphty-element, small and in the right package, and say what the element's API can do today. I
read this file first every session and update it as I decide and learn.

Words: "the app" is the graphty app; "the element" is graphty-element; "the studio worktree" is
`.worktrees/feat-tanstack-ai` (branch `feat/tanstack-ai`). "Frozen build" is a copy of
`graphty/dist` under `.study-builds/`, named on the first line of `tier6/criteria.md`.

Summarized 2026-11-05 (27 KB); every tier 3 and 4 Top of mind item, decision and tried entry: `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
Top of mind trimmed 2026-10-19 (30 KB); full prior copy: `git show 393580a87:design/ui/studio/notes/engineer.md`.
Summarized 2026-10-17 from 44 KB. Every dated entry of today's dry-run fixes (table, Analyze run,
filter steps, style panel polish, page and selection, undo, inspector targets, condition lists,
yes and no, find box, names and words, focus, number card, spoken messages, color box, drawing and
camera) is in full in git: `git show 54c009f84:design/ui/studio/notes/engineer.md`. Older entries
(2026-10-06 to 10-17): `git show 6b160deb5:design/ui/studio/notes/engineer.md`.

## Top of mind

1. (2026-11-05) chip-row is OPEN: the fix was rejected and reverted (`tier6/rejected-fixes.md`). Refix
   it in graphty-element, not in Conversation.tsx: a message's bound selection lasts the whole turn,
   so `all` and every where stay inside it after the model clears the selection, and reads come
   back as a bare "No matches." (`src/ai/tools/fields.ts` settleTarget, `effects.ts` searchedIn).
2. (2026-11-05) Walk the exact route a fix's acceptance names, with its state carried in. The
   chip-row author's walk had no selection on, so only the replayed route showed the failure.
3. (2026-11-05) Live-model `--replay` proves little. It diverges at the first reply or step count, a
   "match" can hit a same-named control, and a clean replay can be luck. Use it for setup and
   non-model steps, carry on by hand with `--step`, and judge the screenshots.
4. (2026-11-05) A tier 6 walk on a folder outside tier6/ needs REAL_TIER=6 as well as REAL_DIST;
   without it the setup fails with 'nothing on screen is called "Assistant"'.
5. (2026-11-05) Trust a dist only after checking it: copy it into the walk's tmp folder, grep the
   bundle for a string from the commit, and run `git status`. Stamps name HEAD even with
   uncommitted code in the build, can lag a build, and sibling agents rebuild mid-walk. Tool
   checkouts move with HEAD too, so the replay header's "tool checkout" can differ from the build.
6. (2026-11-05) Shared worktree: check `git status` and `git diff` before committing or re-walking (a
   unit with no commit may exist only as edits), commit by path, and never leave temporary or
   swapped source files in the tree. commitlint wants a lowercase subject and body lines of 100
   characters or fewer; a failed hook leaves files staged, so recommit at once.
7. (2026-11-05) Waiting: `tmp/agent-wait.sh` is the way. `tail -f`, `tail --pid`, sleep loops and
   Monitor loops are refused, so start tests and builds early and do the fix meanwhile. Test slots
   can stay full for many minutes.
8. (2026-11-05) Element assistant facts: the element reopens a conversation on load, matches typed
   answers, forgets keys and clears history with no assistant up, moves keys between storages,
   reports `undone`, and names a call's algorithm (`calledAlgorithm`). The app holds none of that.
   Regenerate the saved-format schema with `GRAPHTY_WRITE_FORMAT_SCHEMA=1` on
   `test/ai/conversation/formats.test.ts`. A raw `style.encode` layer with `by` paints nothing: a
   bound message encodes through `styles.encode`, then narrows the selector.
9. (2026-11-05) `main.tsx` is StrictMode: an effect cleanup that clears store state must check the
   state really left, because the dev double effect runs cleanups on mount.
10. (2026-11-05) Under heavy load, browser test shards died with no failed assertion ("error when
    mocking a module", then "rpc is closed"). Suspected mechanism, not proven: `test/setup.ts`'s
    `@babylonjs/core` factory runs on a dead connection and vitest's route handler rejects unhandled.
11. (2026-10-30) Choices that act before the reader decides cost the most; show the choice before
    the act. One fact drawn two ways sends readers to a second menu.
12. (2026-10-30) Every participant is the same model: a failure is strong evidence, a pass weak.
    A tool line is a claim; check the screenshot. Check a failing bar's evidence before fixing.
13. (2026-10-30) Open from tier 4: the join preview tags the wrong rows (sev 2; it must show exactly
    what Join will do), table dock header overflow at 900 px, Nodes tab `aria-controls` names an
    unrendered panel, one glyph map (`TypeGlyph` has no "mixed"), export column count.
14. (2026-10-29) Open: changing a `DateCard` match clears the box but keeps the old bounds (a card
    with no bound must write no condition); unticking every load in a Data source card leaves the
    last rule.
15. (2026-10-21) Open from tier 3: the node's own Fill "+" makes a one-node layer and starts at the
    value nodes already have; the folder chain icon paints every cluster one color; the F6 stop
    has no focus ring. Full earlier list: the git pointer at the top of this file.

## Tier 6 dry run 1 fixes (2026-11-05)

Decisions and reasons, per fix. All stand except chip-row.

- undone-reopen: the undone mark is written at two moments. At change time on saved conversations,
  because a later edit erases the evidence; at open time on the conversation opening, which also
  clears the mark of a message redone meanwhile. The saved pass runs only while
  position < steps.length, so an ordinary edit lists no store. A mark on a closed conversation must
  not bump updatedAt: newestFirst decides which one reopens. `mergeRecords` keeps stored messages, so
  a save at a stale revision silently loses a mark: always save the copy just listed or loaded.
- lone-words: fixed at the tokenizer, so parsePath, renamePaths, checkRule and rule leaves all see
  the literal from one place. The value words stay out of isUnquotedName: that would change
  quotePath's output and break the column rename's unquoted match; only rulePath's bare form needs
  the guard. `batch.writes` is false for undo failures and policy denials too, so it does not mean
  "a read": check the failure code and each result's writes flag.
- edge-half: `answers` alone cannot decide a half; the gate is `answers(path, kind)` or some element
  of that kind having the value. My first version (`answers` plus a `data.` retry) emptied
  `results.pr.score > 0`, because a run need not declare its fields
  (test/session/sets/cache-inputs.test.ts caught it). The `has` scan runs only for unanswered paths
  and stops at the first hit.
- run-scope: reuse `requireTarget` with `{ ...args, where }`; the spread carries BOUND_SELECTION, so
  no helper was needed. `scopeOf` maps target to Scope; the type is `Scope`, not `ScopeInput`,
  since algo.run takes the canonical form. Bound scopes become `{ nodes: ids }`, not the live
  "selection" keyword, because a message's scope is what was selected when it was sent.
- words-stay: the held reply is a separate message after the calls, because `saveInto` is append-only
  by id and text added to a saved message is silently lost. It is folded into the calls message for
  the model: a request ending in an assistant message broke seven tests that need it to end in tool
  results. A failed message's words stay in the record but are dropped in `sentMessage`. A running
  answer has neither a pending entry (`endPending` removes it at once) nor a result, so the
  snapshot treats "no result, no entry" as shown and marks unasked questions not run explicitly.
- group-count: `groupCount` is optional like `groups`, since a required field breaks anyone building
  a `ResultSummary`; readers keep `summary.groupCount ?? groups.length`. Read it everywhere that
  counted the capped list. Changing `reading.groups` params is a fix: the contract is "how many
  groups". The Largest heading tests `groups.length < groupCount`; the old `> TOP` could never hold.
- chip-row (REJECTED, reverted by baeb532d60): the selection-of-nothing rule went in `isChange`
  rather than TurnEffects, so connection.ts's announcement and notice and EndRow's "Nothing changed"
  follow one guard; that forced a separate `isResult`. The re-walk failed on T92B fact 2: the
  turn had no found result, so the diagnosis was wrong. Before accepting "X hides Y", look at the
  pilot's opened steps: if no chip appears there, nothing was hidden. A bare "No matches." with no
  "for ..." means an ids target, which on a bound message means the selection. Noted, not settled:
  Escape on a focused chip clears the selection and flips the next scope to Whole graph silently.
- send-again: the x lives in the store, not a lifted prop: Send again reads it at click time, so
  Conversation needs no subscription. Clearing it sits in `send()`, one place for both callers. The
  effect cleanup clears it on unmount; StrictMode's double effect is harmless as it is off at mount.
- export: listen in `link`, not `useAssistantView`: that hook is mounted only with the panel, and a
  run finishing while the reader is away would lose its file (same reason as `watchWaiting`). `link`
  can run twice on one element, so it needs the WeakSet guard. Picture and video formats are not
  catalog entries, so the format id doubles as the extension.
- privacy: went past the two named lines because no line may be false: "Nothing is sent" and "No
  file contents ever leave" contradicted the provider line. "We will never see the data you
  analyze" stays: Google sees it, we do not. Words shared with the lazy assistant chunk go in
  assistant-door/provider.ts, never imported from assistant/words.ts into Settings, or the main
  chunk pulls the catalog and "off means no chunk" breaks. The hook has its own file because
  assistant-door/commands.ts already imports provider.ts.

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
- One background script chaining lint, tsc, tests and build, then a second walking after it.
  A short hand walk beats replaying an old detour route full of unrelated steps.
- Reading dist for a minified gate when nx reports a local-cache hit.

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
- A console line with a per-run count (OpenAI CORS errors) reports a divergence with nothing wrong.
- Study walks record no tool arguments, so a failed step's call cannot be recovered afterwards.
- Words beside a failure, once the failure is fixed, have no natural route: Stop, a connection
  failure and "Not run" are reachable; the rest needs the unit test.
- Restarting a walk script while the first is alive: use new folder names and check it is gone.
- A failed-setup replay leaves its session running; deleting its folder makes `--end` fail with
  ENOENT, so recreate the empty folder and `--end`. `kill` is denied; TaskStop stops a background run.
- Do not chain a queued low-lane test with temporary source files: they sit there during the queue.
  Start builds outside the test-slot queue. Foreground waits of 30 s or more are refused.
- A Bash heredoc holding a timed polling loop is refused even when it only writes a file: use Write.
- `git -C ../..` from design/ui/studio points at design/, so path-limited diffs come back empty.
- Settings' section list is a PageList: its items are role gridcell, not button. Start-page node
  clicks miss while the drawing turns: pause it or take the node by label.

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

- Decisions dated 2026-10-29 (time role drawing, Sources row layout, date conditions, typed cards,
  dropped values marked in graph-io): `git show a9bb2a7d4a:design/ui/studio/notes/engineer.md`.
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
