# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-07 -- Round 3 after the skeptic check (`rounds/round-3/insights.md`): bars 1-6 and 9
  hold; 7 fails only on missing data (keyboard-only T15 void; screen reader 7 of 7); 8 fails on
  contrast (#8c8c8c on #2c2c2c, 4.15:1). Tier 1 53 of 53 valid. No confirmed severity 4.
- 2026-10-07 -- My scoring over-read two headlines: a near-tie remark outside the graded question
  scored as sev 4 (bar 3), and a truthful export failed on a checklist line (bar 6). Rule now: a
  sev 4 needs a wrong conclusion a reader would act on, from what the participant could perceive.
- 2026-10-07 -- Do not override a grader without new evidence (bar 5: graders wrote "none"; I
  raised it to a failure). And never name the expected outcome to graders: the perspective watch
  item primed them.
- 2026-10-07 -- Top open problems (sev 3): 3D size misdrawn on a near tie (cause untraced: run one
  2D/orthographic export first); focus to the page after a sample opens or "No thanks" (the one
  regression this round caused); Escape from shortcuts dialog; soft export names (4x is an
  upscale); key box covers Pazzi.
- 2026-10-07 -- Cleanest credit: the names switch (T10 every name 8 of 8, 3.5x to 1.5x). Ease,
  SD share, wrong turns and pause counts are pattern only: one model, graders and tool changed.
- 2026-10-07 -- Spectral clumping is the algorithm, not a bug: the fix is its description.
- 2026-10-07 -- Tool facts for every SR finding: `--read` prints more than a screen reader;
  `watchLive` "unconfirmed" is its own guess; SR_STATES lacks `aria-current` and toolbar
  container. Absence of live text in a log is observed; "never spoken" is not.
- 2026-10-07 -- Round 3 was the last round. Next: the final report, recommending real users
  (graphty.app with opt-in usage data, 5-8 analysts, a real screen-reader user).
- 2026-10-07 -- Every focus change needs a "where does focus go instead" check.
- 2026-10-06 -- All participants are one model: N alike is not independent. Solid = a scripted
  repro or a cause in code. Failure strong, pass weak. Check the count is false, the step is on the
  path, the session valid, the evidence not the tool's. Count deterministic events once per dataset.

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

- 2026-10-07 (researcher, round 2 close) -- Took from round 2's decisions: twelve changes, one per
  problem, in the owning package (compact-mantine menu focus; element key, 2D Fit, group options,
  canvas name; app announcements, Size picker, run names, Show all labels; tool SR mode; key).
  Agreed with the Director's departures: the key already reads the live stack (the element's
  `coveredBy()` found the cover but said it only in English), so the fix is leaving the covered
  block out; grouping needs no new element call (`optionsFor` fills "partition" values). Held:
  Force spring cloud (trace first), 4x print, key placement/fit inset (new element API, owner).
  Lesson: my "missing effective-layer fact" was half right -- the fact existed, the English
  sentence hid it. Read the element before calling a fact missing.
- 2026-10-07 (researcher, re-pilot review) -- Accepted the nine re-pilots as proof the round 3
  routes exist on b7590f8de; not as evidence the fixes work for users. Did not add the
  perspective-size risk to any bar ahead of sessions: it is one pilot's observation on one
  dataset; graders note `meaning-wrong` if it happens.

- 2026-10-07 (researcher, round 3 answer key) -- Wrote round 3 entries beside the round 2 ones
  for T7, T9, T10, T11, T15 and the run-name notes, each with round 2 and round 3 scoring side by
  side; no bar and no prompt changed. Reasons: a stale key grades a pass as a failure; keeping the
  round 2 entries lets an unlanded change be graded fairly. Choices: (1) either run word still
  names the measure -- "influence" describes PageRank correctly whether printed or not, and
  failing it would grade the participant on the build's vocabulary; (2) T9's chain-link route
  becomes SD on round 3 when it follows closing the list or picking "Fixed size" (a detour then a
  correction, the standing SD rule), so the grade moves with the design, reported both ways;
  (3) T10 keeps S for "hidden count read and explained" so the bar is not raised mid-study, and
  "every name reached" is recorded apart to credit the switch; (4) T15 step 4 needs names drawn,
  not every name, so the switch is not required there. Wording: no prompt says "show all labels"
  or "picker"; T9 "show" and T3/T14 "all" can only lure; T10 B's `label` was already an echo
  covered by the per-dataset rule. Rejected: rewording T10 (would stamp a pass on a gap); walking
  the routes now (the build does not have them; a walk of the old build proves nothing).

- 2026-10-07 (researcher, round 3 critique, folded) -- Proposed seven fixes, each a reproduced
  defect in one place; held the Force spring cloud (untraced), 4x print (no task failed), more
  sizing changes (one change per problem, so ease can be attributed); rejected moving the key by a
  new seed (owner's call; moves the overlap). Superseded skeptic note: "do not reword a real goal to
  fit the build; grade the gap".

- 2026-10-07 (researcher, round 2 skeptic verdicts) -- Applied two skeptics' verdicts
  (`rounds/round-2/insights.md`). Dropped (both): the Analyze/attribute filter "announces no
  option" (tool cannot read `aria-activedescendant`; `AnalyzePopover.tsx` ~264 is built right),
  r2-s47's T6 failure as an app finding, "Overview has nothing focusable". Bar 3 sev 4 lowered to
  a confirmed sev 3: one participant gave up, his give-up also needs the missing browse mode, and
  the keyboard-only persona exported by Control+E (r2-s11). Bar 5 kept failing on the stale key
  only; the label count (true: the name is drawn, behind a dot) and the export selection ring (UI
  state, shown in the preview) moved out of bar 5 at sev 2. Stall rule worded "no decline" (scale
  reversal). T10 and T11 measures marked wording-inflated. Chevron, "New from data" refusal,
  refusal notice, silent panel switch, browser-storage warning lowered to 2; zoom-hidden-count,
  tiny names, hover, 3D perspective to 1. Alternative rejected: keeping bar 3 failing on the
  strength of sev 4 being "defensible" (Control+E stranded) -- the deciding give-up is confounded.

- 2026-10-07 (researcher, round 2 scoring, folded) -- Bar 5 counted the label count, the export
  selection color and the stale key (the skeptics later moved the selection ring out). Sev 4 only
  for the menu-dialog focus. Steps-to-path on pointer sessions only. Evidence: round 2 scores.

- 2026-10-06 (researcher, round 2 plan) -- 56 sessions: core four full (T15 10, T10/T12/T9 4+4),
  every other tier 1 task at 1-3 with all-must-pass, T2 once, T16 twice; the 7 round 1 voids
  carried in; first-time personas 6 sessions each (36, 64%), mostly on the half of each core task
  they did not take in round 1; Morgan 7, Sam 3. Reason: the cap of 56 against 81 at full size;
  every task's path changed, so every task runs; the core four decide the stall rule. Logged in
  `criteria.md`. Rejected: dropping reduced tasks to fund full T5/T3 sizes (leaves six changed
  paths unseen).
- 2026-10-06 (researcher, round 2 preflight) -- Made the screen-reader mode meet preflight item 2
  myself (pointer steps refused, no screenshot path, a planted-click proof check) instead of
  blocking Morgan's 7 sessions again: a 20-line change with its own proof, and bar 7 cannot pass
  without it. Rebuilt the app because the served build predated the merge. Reworded T14 ("bring
  it back" echoed the new "Back to start"). Kept "data" in the sample preamble (same as round 1,
  comparability) with graders told to note T6 participants who go to Data straight from the word.
- 2026-10-06 (researcher, round 2 answer key) -- Round 2 paths rewritten from walks on the build
  (T7, T8, T11, T12, T13, T14); round 1 paths kept for round 1's grades. The method-name change
  never landed, so the key's "from round 2 runs are named by method" was false and is corrected.
  T11's refusal is now a greyed list item, not a line under Method.

- 2026-10-06 (round 1, folded) -- Re-score with all 43 grades moved bars 1 and 3 to failing
  (a reasoned give-up is sev 4); first runs pooled with re-runs. Process: no step cap, short
  per-step prompt, at most 4 participants, 7 = very easy. Voids (filter, stop, time limit, no
  browser) re-run with a `b` suffix. Keys: copy the screen's spellings, accept the on-screen run
  name, a tie either order. Fixes: smallest, verified, one per problem; neutral facts in the
  element, words in the app. Skeptic drops: check the count is false, not just confusing.
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

- 2026-10-07 (round 2 skeptic check) -- Worked: two skeptics reading the tool's own code
  (`real.mjs` `srReport`, `watchLive`) found that the screen-reader mode, not the app, produced
  the round's headline SR failure. Lesson: before scoring any finding from a simulated access
  mode, list what the tool can and cannot perceive and check the finding against that list. Did
  not work: scoring "reproduced twice" when the second repro was a different dialog at a lower
  severity that did not cause the stop.

- 2026-10-07 (round 2 scoring) -- Worked: one row per session in `r2-score.py` (task, half,
  persona, grade, ease, steps, wrong turns, build-decided) with an assert on 56/54 rows; ease
  read by grepping transcripts for the rating line, then by hand for the two that missed
  (r2-s47, s56 in the grade). Grader JSON plus `grade.md` greps for route, activation and usage
  card covered every per-session measure without reading 316 KB of grades.

- 2026-10-06 (round 2 preflight) -- Worked: re-walking every success path with one script
  (`r2/walk.sh` via `lanes.sh`, at most 3 browsers) caught six changed paths in about 20 minutes;
  `keypaths.mjs` and `ranks.mjs` copies needed only small fixes (row opens on Style; Export rows).
  Did not work: editing `walk.sh` while lanes ran it (bash reads as it goes: three sessions left
  open, a waiter hung on their missing "### end"); `pkill` is denied, so stop a background job by
  letting it finish. A harness that reads "Top 10" from body text silently returned nothing when
  the default tab changed: check a harness prints values, not just exit 0.

- 2026-10-06 (round 1 re-score) -- Worked: one row per graded session in `r1-score.py`, printed
  as graded and with cut-offs void, plus a scan of every session's screenshot count for cap
  endings. The 14 late grades changed three conclusions (bars 1, 2, 3); a partial score must say
  which bars are undecided, as round 1's first scoring did.
- 2026-10-06 (round 1 skeptic check) -- Worked: two independent skeptics against transcripts,
  repros and source caught overcounts ("9 of 9" sizing was 3 with the empty list; a voided session
  used as a failure). Did not work: counting a cut-off session's dead end as evidence; treating
  the tool's "ambiguous" prints as accessibility defects. Still owed: `run.sh` for r1-s43b and
  r1-s09b.
- 2026-10-06 (round 1 runs) -- Did not work: launching every agent at once against 4 browser slots
  under a 40-minute limit (9 never started, 7 re-runs cut off, waits up to an hour; agents killed
  before `--end` held slots); the full think-aloud prompt (14 of 41 filter stops). Worked: the
  short per-step prompt (0 stops in 35); graders with `repro/<session>/run.sh` (15 build defects
  confirmed at one participant each).
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

- **Returning users (open).** Every simulated session is a first visit; repeat-use speed has
  never been measured. Briefed returning-user sessions are a tier 2 question.
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
