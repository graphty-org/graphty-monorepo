# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-07 -- The tier 2 answer key is corrected for build ca8b3b916c22 only. The seven app
  fixes it was meant to follow (report wording, left-out row kept in Sources, Enter moving From to
  To, the path's weight truth, live rule check, selection summary words, Overview under a filter)
  had NOT landed when it was edited. Once they land: re-walk T4, T17, T18, T20, T22 and replace
  every "on build ca8b3b916c22" sentence in `tier2/answers.md`.
- 2026-10-07 -- TIER 2 IS READY FOR THE OWNER TO START: `tier2/criteria.md` (frozen), `tasks.md`,
  `answers.md`, `roster.md`. Nine tasks on two datasets each (T4, T17-T24); 54 sessions in round 1;
  core four T20, T21, T17, T18 at 4+4. Owner: no keyboard-only, screen-reader or touch sessions.
- 2026-10-07 -- Tier 2 bars differ from tier 1 in two places: bar 2 is "earlier work kept" (0
  `work-lost`/`not-kept`) instead of first-time share; bar 7 is "the loaded weight is read as
  loaded" (a catalog-wide script plus sessions) instead of keyboard and screen reader.
- 2026-10-07 -- The biggest validity threat in tier 2 is the briefing: a returning user is a fresh
  agent told a history. A history may name only tier 1 places, never a tier 2 control; graders
  record when a first move came straight from it. Persona files echo too: Ruth's says "notes", so
  she does not take T19 (and her "shortest chain" became "fewest people in between").
- 2026-10-07 -- Before round 1 (preflight in `tier2/criteria.md`): re-pilot all 18 halves on the
  frozen fixed build (fixes in flight change From-to-To, Edit source, the path row number), re-
  record values, wording check over prompts AND histories, extend `bars.mjs` to tier 2 screens,
  write the bar 7 weight script and prove it on a planted wrong reading, run tier 1 paths too.
- 2026-10-07 -- Known gaps the new tasks will meet (in the key, graded by end state): a selection
  of several edges lists no members and cannot select their ends; clicking Everything replaces the
  selection; the bus-stops edge inspector repeats "from"/"to" rows; Find frames off center.
- 2026-10-07 -- Tier 1 report: bars 1-6 and 9 hold in round 3; 7 fails on missing data, 8 on one
  contrast color. A sev 4 needs a wrong conclusion a reader would act on, from what the
  participant could perceive. Never name the expected outcome to graders.
- 2026-10-07 -- Do not override a grader without new evidence; one skeptic's weakening stands
  unless the other answers its reason with evidence.
- 2026-10-07 -- Every focus change needs a "where does focus go instead" check.
- 2026-10-06 -- All participants are one model: N alike is not independent. Solid = a scripted
  repro or a cause in code. Failure strong, pass weak. Check the count is false, the step is on the
  path, the session valid, the evidence not the tool's. Count deterministic events once per dataset.
- 2026-10-07 -- Real users next after tier 2 (graphty.app with opt-in usage data, 5-8 analysts, a
  real screen-reader user): ease calibration, finding Size and labels, 3D size reading.

## Priorities and values

- **Findings that are real.** A study that flatters the design is worse than no study: it ships
  the defect with a pass stamped on it. Every method choice is judged by whether it can produce a
  false pass.
- **The first-time user's core path first** (owner, 2026-10-02): load or pick a sample, read what
  loaded, rank, find groups, color or size by a result, labels from an attribute, a readable
  layout, find a node and its neighbors, export a picture and the numbers, save and reopen, and the
  whole chain in one sitting. Until tier 1 meets its bars, studio changes go to tier 1 problems.
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. An opinion-only finding is held one severity level down.
- **Studies are expensive; validate before launch** (owner, 2026-09-29). Preflight, rehearsal,
  dry run and a snapshot before any paid round. A check that inspects zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
  No persona-specific fix, no one-domain wording.
- **Honest reporting.** Every number with its denominator, with and without deciding defects and
  cut-off sessions, and successes alongside failures.

## Design criteria

The bars live in `criteria.md` (frozen 2026-10-06; changes only between rounds, logged). Their
reasons, in short:

- **Each tier 1 task >= 80% success, each dataset half >= 75%** -- the studio's bar since round 7;
  the half floor stops a one-domain fix passing on combined counts (T12 shows why).
- **The whole first session (T15) passes** -- the acceptance walk; 0 of 21 in round 8, 8 of 8 in
  round 1.
- **No confirmed severity-4 problem.** Severity is Nielsen 0-4; 4 = cannot be done, the user
  leaves, or reports a wrong answer unknowingly. Confirmed = 2 participants, or a scripted repro
  for a build defect.
- **Mean ease >= 5.5 of 7** (median also reported) -- never met; the trend is the signal. Round 1:
  4.50, core four 4.07.
- **Every committed step visible on canvas and legend at once; every count from live state** --
  the top trust-killers of rounds 2-8.
- **Candidate first-use bars** (unchosen): first drawing under 2 minutes; runs an analysis
  unprompted; can say what loaded; sample one step, file two; at most 50 words at rest.

## Decisions and reasons

- 2026-10-07 (researcher, tier 2 key corrected) -- Edited `tier2/answers.md` from the re-pilots
  (`tier2/pilot/`) and one walk of my own: T4 "Add a table" by name, line 17 for B, left-out row
  recorded nowhere after Load; T17 Overview 20/77 under a filter is `read-wrong`; T18 adds
  "Shortest path 35" (B) and the preset Weight box detour; T20 adds 27 and 24 as `read-wrong`,
  Style-first, and the Time role (walked: Weight none, Depot-Station-Harbor, `weight-not-read`);
  T22 Everything keeps the selection, refusal shows only after Enter; T24 drops Escape. Reason:
  the dependent app fixes were not in the tree (no commit after 6eba30d4e, no graphty/src edits
  after 20 minutes of watching), so every sentence names the build it is true on rather than
  describing a fix nobody could check. `tasks.md` needed no change. Bars untouched.
- 2026-10-07 (researcher, tier 2 study prepared) -- Wrote `tier2/` (criteria frozen, tasks, answers,
  roster) and moved the tier 2 sections out of `tasks.md` and `answers.md` (one copy; pointers left).
  Kept the six tasks the engineer had piloted (T4, T17-T21) and added T22 (make the ones meeting a
  condition stand out: bus links >= 10 minutes = 3; Les Mis ties >= 10 chapters = 13), T23 (a step
  or two away: Ava 14, chip 15 of 20; Medici 11, chip 12 of 15) and T24 (one tie: Gus-Ivan 1,
  Station-Stadium 4, then select its ends), each piloted on a frozen copy of ca8b3b916c22 and
  checked against a count from the files. Reasons: the owner's list asks for rule queries,
  neighborhood distance and edge selection; T22's "without taking anything off the drawing"
  separates selecting from T17's filtering and tests whether "=" in Find is found, which is the
  design's stated condition for a separate dialog. Bars: tier 1's nine, with bar 2 replaced by
  earlier work kept (the returning persona's stated reason to quit) and bar 7 by the weight read as
  loaded (owner rule; a script covers the catalog, sessions cover what a reader meets). Round 1 at
  54: core four at 8, T4 at 6, the rest at 4 with all-must-pass. Personas: six tier 1 graduates
  (67%) plus Alex, Jordan, Dana; 6 sessions each; no one takes both halves of a task. No saved-
  project starts: reopening was measured in tier 1 and the project file format moves with the
  build. Rejected: node-attribute rules for T22 (no single-file dataset has a numeric node
  attribute; two-table setups need click-at); asking "which stops" in T22 (a several-edge
  selection lists no members, so the task would grade a known gap twice); keeping Mara (expert
  workflows are not common repeat work).

- 2026-10-07 (researcher, round 3 skeptic verdicts) -- Applied two skeptics' verdicts
  (`rounds/round-3/insights.md`). Rule added for split verdicts: one skeptic's weakening stands
  unless the other gives evidence answering its reason (kept: no live text on outline/size/Find,
  two DOM alert regions; lowered: selection ring 2 since only r3-s02 exported, group-layout
  pointer 2 since T11 5 of 5, hover/ramp/wording to 1). Bar 3 holds (both: sev 3; 2.8% tie,
  outside the graded question, primed graders, T7 named Farah from Values). Bar 5 holds (graders
  ruled "none"; Chloe drawn in front of Farah). Bar 6 holds, r3-s01 SD (both dropped the F).
  Spectral moved to words. "Live regions already holding text" to not shown. Rejected: keeping
  bar 3 failing because "the picture names the wrong person" -- the picture's key names nobody.

- 2026-10-07 (researcher, round 3 scoring) -- Scored on valid sessions with the void shown
  "as graded" beside it (r3-s10 S, r3-s55 measured). Counted for bar 3 the 3D size misreading
  (reproduced drawing, r3-s08 wrong answer, r3-s06 and void r3-s10 alike) with the strict reading
  written beside it; reason: the exported picture names the wrong person for every reader, which
  is the severity-4 outcome. Counted bar 6 for r3-s01 (build-decided, cause reproduced), not
  `truth-on-screen`. Bar 5: only the label count (the export selection ring stays out, as the
  round 2 skeptics held). Bar 4: none. Credited each change only on its route; "not tested" for
  2D Fit, the painted-over key layer and the chevron (pointer users clicked the word). Sizing
  share counted on 17 valid sizing sessions. Path lengths from the key's round 3 numbers (T10 5,
  T9 8, T7 7, T15 18), with T10 also on round 2's 4 for comparison. Rejected: crediting the
  autofocus removal (it created a severity 3); treating T11's 4.00 as below the floor.

- 2026-10-07 (researcher, round 3 plan and preflight) -- Sized round 3 at 56: full size for the
  tasks whose path changed most or whose round 2 numbers missed a target (T15 10, T10 8, T9 8, T11
  5) and for the one task below its bar by the scores (T6 5, though the skeptics held its failure
  not shown); regression checks at 4 for T12 (2 and 2; 8 of 8 in round 2, one small fix) and T7 B;
  the rest at 1 to 3 so every tier 1 task is seen. Reasons: the full rule needs about 70; the
  round's questions (names checkbox, Size list, group layouts, reading mode) sit on T10, T9, T15,
  T11, T6. Rejected: T12 at full size (spends 4 sessions re-measuring a 0.9x, 8 of 8 task);
  dropping T3, T2, T5 (the criteria allow it, but the brief is to see every tier 1 task, and T5 is
  Morgan's bar 7 task). Personas: no first-time persona meets T15 twice; first-time 66%, at most 7
  each, because the four studio persona files still lack a skeptic review.
- 2026-10-07 (researcher, round 3 preflight) -- Fixed the study, not the app: `bars.mjs` skips
  clipped text (else bar 9 rose 42 to 46 on hidden words and would have failed a correct fix),
  `real.mjs` merges a label with its control, `ranks.mjs` exports the nodes CSV it meant to read
  (round 2's read no groups and the key cited a pilot instead). Served the round from a frozen copy
  of the build so a mid-round rebuild cannot change the app under a session. Did not touch the
  contrast color: it is a product fix the studio has not decided; flagged as the one known bar
  failure.

- 2026-10-06 to 10-07 (rounds 1-2 and round 3 setup, folded) -- One change per problem in the
  owning package; read the element before calling a fact missing (the key's cover fact existed,
  hidden by an English sentence). Accept re-pilots as proof a route exists, never that a fix works.
  Keys: write the new round's entries beside the old so an unlanded change is graded fairly; a
  detour then a correction is SD; do not raise a bar mid-study; copy the screen's spellings; accept
  the on-screen run name; a tie either order. Round 2 skeptics: drop findings the tool produced
  (SR mode could not read `aria-activedescendant`); a give-up confounded by a tool gap is sev 3,
  not 4. Sizing: the core four at full size, the rest at 1-3 with all-must-pass; first-time >= 60%.
  A reasoned give-up is sev 4; voids re-run with a `b` suffix; neutral facts in the element,
  words in the app.
- 2026-10-03 (owner) -- Stop mocking; study the real app. 2026-10-06 (studio plan): a local
  production build, criteria frozen before the round, every task walked first, up to three rounds.
- 2026-10-02 (owner and studio) -- Tier the tasks, first-time users first, at least 60% of sessions
  on tier 1, every tier 1 task from the empty app; self-ratings and summaries never used for grades;
  rehearsal by participant actions only.
- 2026-09-29 (owner and studio) -- Answer keys kept from participants; task wording never reuses
  on-screen words; every label change tested on two domains; a generality gate on every change; a
  frozen core task set with a stop rule; decisions must be visible on the rendered screen.
- 2026-09-28 (owner) -- Simulated personas built from public sources, each checked by a skeptic.

## Tried: worked / did not work

- 2026-10-07 (tier 2 key correction) -- Worked: checking `git log` and `git status graphty` for
  the dependency fixes before writing "the fixed build" -- they were absent. Worked: a one-file walk
  script (`tmp/researcher/t2key/time.sh`) through `with-browser.sh` for the untested Time role.
  Did not work: python replace anchors copied from a wrapped view -- match the file's own line
  breaks (grep -n first).
- 2026-10-07 (tier 2 preparation) -- Worked: freezing a copy of `graphty/dist` (`REAL_DIST`) for
  the pilots while other agents rebuild; piloting each new task on both halves (7 sessions, about
  15 minutes) found three gaps the key now names (several-edge selection has no member list,
  Everything clears the selection, raw from/to rows). Worked: a hand count from the files
  (`rounds/tier-2/preflight/reference/hand.py`) agreeing with every screen value. Worked: grepping
  histories AND persona files for tier 2 control words: Ruth's file said "notes" and "shortest".
  Did not work: a setup edited after one half's pilot (T24A ran without "Show all labels"); pilot
  again whenever a setup changes.

- 2026-10-07 (round 3 skeptic check) -- Worked: skeptics measuring the exported picture (dot
  diameters, label offsets, crops) and checking which sessions actually reached an export; this
  caught two overcounts (selection ring, r3-s06). Did not work: my scoring treated a grader
  checklist line and a pre-announced watch item as evidence.

- 2026-10-07 (round 3 scoring) -- Worked: the graders' JSON tally plus greps of `grade.md`
  for fixed record lines ("Every name reached", "Sizing record"/"size list", "Community run made",
  "Activation", "Usage card", "Run name") and the transcripts' rating line; one row per session in
  `tmp/researcher/r3-score.py` with asserts on 56/54/53. Ease regex caught "1 of 77" as "1 of 7"
  in three transcripts: match the "7 (very easy)" line, then by hand. Did not work: trusting the
  tally's grade alone -- r3-s10's S hid a void, r3-s49 a non-voiding tool fault; read every
  grade's Void line.

- 2026-10-07 (round 3 preflight) -- Worked: re-using the round 2 scripts as r3 copies (walk,
  keypaths, ranks, wording dump and check), with a deep focus reader that enters shadow roots and
  prints the highlighted option; 14 of 14 keyboard paths and every walk in about 20 minutes on 2-4
  browsers. Worked: re-measuring the previous build with the corrected bars script, so the "never
  goes up" comparison is like for like. Worked: looking at every check screenshot (2D Fit, the
  legend, the chevron, the canvas ring) instead of trusting exit codes. Did not work: guessing Tab
  counts in a `--sr` real.mjs session (one Enter landed on "New from data..."); count focus lines
  first, or use the keypaths harness's tabTo.

- 2026-10-07 (re-pilots) -- Worked: piloting every task, not just changed ones, on the exact
  build stamp; each pilot named defects by kind (element, app, tool, key). It caught the checkbox
  wording, T7's missing Values step, and the tool's label double-match before graders met them.
  Did not cover: keyboard and SR paths (no `--sr` pilot) -- owed at preflight.

- 2026-10-07 (round 3 key) -- Worked: grepping the worktree source for each planned change
  (`runName`, the switch, `groupings()` in `layout/methods.ts`) before writing paths showed none
  had landed, so the key says "not yet walked" instead of claiming walks. Also read
  `layout/methods.ts` for the group-layout greying rule ("Needs a node attribute to group by"
  comes from `startingValues`/`unavailable`), so the T11 defect test is exact.

- 2026-10-07 (round 3 critique) -- Worked: grepping the element for an existing option before
  proposing element work (`declutter` already existed; the "hidden names" fix shrank from element
  plus app to one app switch). Looking at the cited screenshots changed one reading: r2-s56's key
  lists both color layers because both are in the stack.

- 2026-10-06 to 10-07 (rounds 1-2, folded) -- Worked: one row per session in an `rN-score.py`
  with an assert on the count; grader JSON plus `grade.md` greps; re-walking every success path by
  one script through `lanes.sh` (at most 3 browsers); the short per-step prompt (0 filter stops in
  35); graders with `repro/<session>/run.sh`; two skeptics reading the tool's own code. Did not
  work: launching every agent at once against 4 slots (9 never started, cut-offs); editing a script
  while lanes ran it; scoring a second "repro" that was a different dialog; a harness that exits 0
  while printing nothing (check it prints values). `pkill` is denied: let a job finish.
- 2026-10-06 (preflight and pilots) -- Worked: my Playwright harness under the browser gate for
  text dumps, focus and rankings (`tmp/researcher/lib.mjs`, `ranks.mjs`, `wording-dump.mjs`,
  `wording-check.py`, `keypaths.mjs`); the re-pilots reached every task's end state with
  byte-identical drawings; T14's setup worked (check the screenshot, the log is empty on success).
  Did not work: my own file-picker stand-in (use `real.mjs` for any file open). Lesson: pilot
  every task, not just touched ones.
- 2026-10-06 (real-app study tool) -- `tool/real.mjs`: one live browser per session, numbered
  full-window screenshots, uploads and downloads, click by name, point or drawn label; never more
  than 4 browsers (`with-browser.sh`); always `--end`.
- 2026-10-02 (round 8) -- Worked: tiering, scripted rehearsal, grading from the last render (17 of
  21 self-ratings false). Did not work: pre-run sample results made T15 ambiguous; experts drew
  the hardest tasks; click-by-name picked the first of same-named controls. Tree test and first
  click measure where people look, not whether the next step works.
- 2026-10-01 (round 7) -- 23 concurrent browsers filled swap: the 4-slot gate. 18 of 61 tasks
  could not reach their end state: rehearsal by participant actions.
- 2026-09-28 to 09-30 (rounds 1-6, static mocks) -- Wording gains real but mocks hide what
  happens after a click; answer keys leaked; a failed precondition gate was ignored; summaries
  carried higher ease than transcripts. Kept: every check fails on zero items; ease from
  transcripts only.

## Thinking

- **Returning users (2026-10-07).** A simulated returning user is a fresh agent plus a history, so
  it remembers exactly what the history names: expect it faster than a real one on named places,
  no faster elsewhere. The first-move measure separates passes the briefing gave from passes the
  screen gave. Only real weekly users can show forgetting between visits.
- **What can still produce a false pass on the real app.** Task words that echo controls; graders
  accepting "I think it worked"; setups that pre-do part of a task; the click-by-name tool
  resolving same-named controls; tests that assert element reports a person never sees; a fix
  judged on the easier dataset (T12's Florentine half).
- **What can produce a false fail.** Build defects that decide the task, tool limits (a node with
  no drawn label cannot be clicked by name; click by point), headless timing, and the runner
  (time limits, slot waits, step caps). Rehearsal and the round 2 process changes address these.
- **Stopping simulation.** If round 2 does not move the core four (success and mean ease) over
  round 1, the remaining problems are probably beyond simulated participants; go to real users
  (graphty.app with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- `design/ui/studio/digests/` (`study-rounds.md`, `tier1.md`, `decisions.md`, `owner-voice.md`,
  `framework.md`), `tool/README.md`, `criteria.md`, `tasks.md`, `answers.md`, `roster.md`.
- Round 1: `rounds/round-1/plan.md`, `preflight.md`, `scores.md`, `insights.md`, `decisions.md`,
  `sessions/*/grade.md`, `repro/`.
- Earlier rounds: `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/`.
- Tier 1 spec: `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/`.
- Scripts: `design/ui/studio/tmp/researcher/` (`r1-score.py`, `r1-ease.py`, `scan.py`,
  `full_at.py`, `sessions.py`); round 3 preflight: `tmp/researcher/r3/` (`walk.sh`, `keypaths.mjs`,
  `ranks.mjs`, `wording-dump.mjs`, `wording-check.py`, `edit-answers.py`).
