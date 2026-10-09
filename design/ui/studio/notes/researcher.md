# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-08 -- YES, A DRY RUN RAN BEFORE ROUND 1, three times (r1d1, r1d2, r1d3), each walking
  every task half and fixing what it found before any participant session. THIRD DRY RUN on the
  study build 8c4eef4722ac (`tier2/rounds/r1d3/pilot/`, all 20 halves): every success path landed
  first try, no script, console or request errors, every reference value held. Participants will
  not hit implementation faults on the success paths. Key matched to this build (criteria change
  log, same date).
- 2026-10-08 -- The r1d3 pilots found mostly that the key was out of date (fixes landed: T4 rows in
  full, T17 "Save and turn on", T22 menu Escape, T23 "within 2 hops", T12R "Edges 17"), not new
  blockers. Remaining defects a participant may meet, now watch items: T22 Escape outside the box
  clearing the selection (and Control+Z undoing a style instead); T20 Escape on the import page
  dropping the whole import; T4 left-out row filed under "Added"; T23 filter tooltip covering 2
  names; T18 A chain against drawn arrows; T24 Hana label hiding Ivan's tie end; T21 B new people
  in unexplained blue; stale T21 values at full contrast until Rerun.
- 2026-10-08 -- Fix between rounds, not mid-round: the defects above, plus T12R/T23 two lit controls
  in the Neighborhood view, focus drawn as underlined text, no focus after Rerun (unconfirmed),
  T22 menu opening on "Path between...", the "+" Add a table with no words.
- 2026-10-08 -- Tool defects (engineer's): `real.mjs` resolves `setup:<file>` from the cwd and
  throws an uncaught ENOENT instead of SETUP FAILED (tasks.md now says use an absolute path);
  `session.json` "commit" is the worktree HEAD, not the build (grade by "buildStamp").
- 2026-10-08 -- Watch items for graders on this build: T20's "Capacity" ungraded by rule; T20's
  "such as a longer trail" may echo prompt B; T22 B's example 16 near the task's 10; layout
  overlaps in friends, Florentine and trails drawings hide dots and labels.
- 2026-10-08 -- ROUND 1 PLAN: `tier2/rounds/round-1/plan.md`, 56 sessions, roster's allocation
  (checked by `sessions.py`). T21 last of the core four, T19 after T4 (save-and-reopen waits on
  `--prove`). No saved-project starts. Grades record first move, doors, follow-up cost, T20 route,
  T21 moved nodes, T22 rule use, open-work diff.
- 2026-10-08 -- CRITERIA REVIEW (before freeze): 8 changes proposed to the director (bar 10 for the
  expert audit; "not scored" fails a round; bar 7 runs every algorithm and meaning; preflight 2 not
  met). Detail in the decision entry below.
- 2026-10-08 -- Two tool faults to rule out before blaming a participant: a 3000 ms click timeout
  with no screen change (cause untraced), and a printed tooltip left from the previous hover
  (fixed in the study build's tool; still trust screenshots over printed tooltips).
- 2026-10-08 -- Tier 2 has 11 bars (frozen): bar 2 earlier work kept, bar 7 weight read as
  loaded, bar 10 expert audit, bar 11 core-four cost. Nine tasks plus T12R; no keyboard-only,
  screen-reader or touch sessions (owner).
- 2026-10-07 -- The biggest validity threat in tier 2 is the briefing: a returning user is a fresh
  agent told a history. A history names only tier 1 places, never a tier 2 control; graders record
  when a first move came straight from it.
- 2026-10-07 -- Tier 1 report: bars 1-6 and 9 hold in round 3; 7 fails on missing data, 8 on one
  contrast color. A sev 4 needs a wrong conclusion a reader would act on.
- 2026-10-07 -- Do not override a grader without new evidence; one skeptic's weakening stands
  unless the other answers its reason with evidence. Every focus change needs a "where does focus
  go instead" check.
- 2026-10-06 -- All participants are one model: N alike is not independent. Failure strong, pass
  weak. Solid = a scripted repro or a cause in code.
- 2026-10-07 -- Real users next after tier 2 (graphty.app with opt-in usage data, 5-8 analysts, a
  real screen-reader user).

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

- 2026-10-08 (researcher, key matched to the third dry run on 8c4eef4722ac) -- Edited
  `tier2/answers.md` from 20 pilot reports; logged in `criteria.md`; `tasks.md` unchanged (no
  prompt was wrong). No bar. Choices: (1) a build section listing only what differs across tasks
  from 909b19b578d4. (2) T12R: 17 read from the find list's "Edges 17" heading is the right count
  (the screen now states it); 6 from the visible rows stays wrong. Checked 03.png myself. (3) T22:
  the count now has four places (the Selection layer row is the only "Selection 3"). (4) T22's new
  Escape route to `not-marked` (focus outside the box) replaces the menu route, same grade. (5)
  T17's trap kept with "expect fewer" -- the button names the effect, but ticking still turns it
  off. (6) T4 left-out inspector under "Added": recorded as a misreading, not a grade change.
  Checked T4A 11.png myself. (7) Control+Z undoing a style in T22: "record", no grade assigned,
  since grading codes are frozen.

- 2026-10-08 (researcher, key matched to the second dry run on 909b19b578d4, folded) -- Build
  header section; a new place to read an answer is valid, not a detour; T17 trap rewritten not
  deleted; T22 menu Escape `not-marked`; T23 Hops 2 header a recorded misreading; T12R 6 from the
  find list wrong; Pucci removed (the key was wrong). Rejected: retiring a screen defect as a
  `false-done` risk -- it is the defect to measure.

- 2026-10-08 (researcher, key matched to pilots on 16dcf3494700 and 3dfe7daf9e45, folded) -- A
  header section per build states cross-task changes once; stale watch notes are deleted, not
  kept (they prime graders); a citation moves to the newest pilot only where its screen matches;
  untested choices (T20 "Capacity") graded by end state; T12R has its own section; the find
  box's list of ties is SD; non-key defects stay in pilot reports. Rejected: changing T20 prompt
  B for the "longer trail" echo (the line appears only after the choice).

- 2026-10-08 (researcher, tier 2 criteria review, folded) -- Proposed 8 changes: bar 10 for the
  expert walkthrough and screenshot audit (two specialists or a measurement confirm; 0 sev 3+);
  "not scored" counts as not holding; bar 7 (a) over every algorithm and meaning; preflight 2 not
  met (trace Save as first; a save the tool lost voids); bar 2 by an inventory script; steps
  median <= 2x a gate on the core four; bar 9 on a "returning rest" screen; 2 spare slots to tier
  1 T15. Rejected: raising ease to 5.5; changing prompts.

- 2026-10-08 (researcher, tier 2 round 1 plan, folded) -- 56 sessions in run order, the roster's
  allocation verified by a script; T21 fourth and T19 after T4 (preflight 2); halves alternate and
  graduates mix so a one-dataset defect shows within 2 sessions; every T17/T18 "done" gets the
  follow-up; grade fields fixed in the plan; starts are setups or empty only.
- 2026-10-07 (researcher, tier 2 prepared and key corrected, folded) -- Wrote `tier2/` (tasks,
  answers, roster, criteria); kept T4, T17-T21 and added T22 (rule: bus >= 10 min = 3; Les Mis

    > = 10 chapters = 13), T23 (Ava 14; Medici 11), T24 (Gus-Ivan 1; Station-Stadium 4), each piloted
    > and checked against a hand count. Bars 2 and 7 replaced (work kept; weight read as loaded).
    > Personas: six graduates plus Alex, Jordan, Dana; no one on both halves. Key sentences name the
    > build they are true on, never an unlanded fix. Rejected: node-attribute rules for T22, "which
    > stops" in T22 (known gap graded twice), Mara (expert workflows).

- 2026-10-07 (researcher, round 3 skeptic verdicts) -- Applied two skeptics' verdicts
  (`rounds/round-3/insights.md`). Rule added for split verdicts: one skeptic's weakening stands
  unless the other gives evidence answering its reason (kept: no live text on outline/size/Find,
  two DOM alert regions; lowered: selection ring 2 since only r3-s02 exported, group-layout
  pointer 2 since T11 5 of 5, hover/ramp/wording to 1). Bar 3 holds (both: sev 3; 2.8% tie,
  outside the graded question, primed graders, T7 named Farah from Values). Bar 5 holds (graders
  ruled "none"; Chloe drawn in front of Farah). Bar 6 holds, r3-s01 SD (both dropped the F).
  Spectral moved to words. "Live regions already holding text" to not shown. Rejected: keeping
  bar 3 failing because "the picture names the wrong person" -- the picture's key names nobody.

- 2026-10-07 (round 3 plan, preflight and scoring, folded) -- Sized at 56: full size where the
  path changed or a target missed, regression checks at 4, the rest 1-3 so every task is seen.
  Fixed the study, not the app (`bars.mjs` skips clipped text, `real.mjs` label merge, `ranks.mjs`
  CSV); served a frozen build. Scored on valid sessions with voids shown beside; credited a change
  only on its route; "not tested" where no session met it.

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

- 2026-10-08 (key vs third dry run) -- Worked: one python file of (old, new) pairs, each asserted
  to match once; one anchor failed on a paraphrase ("on the reopen" vs "after the reopen") and the
  assert caught it before any write. Then grep for the old round's folder to find citations left
  behind, keeping only those whose screen still matches. Not walked: T20's "Capacity", T17's "On"
  editor header, B's T17 follow-up trap, T21 focus with a screen reader.

- 2026-10-08 (key vs second dry run) -- Worked: rewriting whole task sections from drafts and
  splicing them with a script that asserts the section count, instead of 40 anchored edits;
  wrapped lines in the Read view hid the two-space indent, so anchors copied from it failed --
  grep the raw lines first. Looked at T17A 11.png and T4A 12.png myself before rewriting the two
  grading changes. Not walked: T18 A's Ben-to-Nora chain, T20's "Capacity".

- 2026-10-08 (key vs dry-run pilots) -- Worked: one python replace per entry with an assert on
  each anchor, then a grep for `rounds/r1/pilot` to find citations still pointing at the old
  build; checking `git diff` after an "edited on disk" notice confirmed only my edits were there.
  Did not walk: T20's "Capacity", T18 A's Ben-to-Nora chain, T21 A on this build -- the key says
  so.

- 2026-10-08 (round 1 plan) -- Worked: one script (`tier2/rounds/round-1/sessions.py`) holding the
  run order, asserting it against the roster's per-half sets, and printing both the plan's table
  and the session JSON, so the two cannot drift. Checked every persona file path exists before
  listing it. Not done here: preflight items (prove, open-work lister, bars.mjs, bar 7 script);
  the plan states them as gates, not as met.

- 2026-10-08 (key vs round 1 pilots) -- Worked: one edit script with an exact-count assert per
  anchor and an ASCII assert on the result (`tmp/researcher/r1-pilot-key/edit.py`); checking each
  pilot's setup line against `roster.md` showed every `final/` walk started unranked, which
  explains T24 B's dead click point. Did not check: T18 A's Weight list and Ben-to-Nora chain (no
  pilot opened or walked them) -- the key says so.

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

- 2026-10-07 (round 3 key and critique, folded) -- Worked: grepping the worktree source for each
  planned change before writing paths (none had landed, so the key said "not yet walked"), and
  grepping the element for an existing option before proposing element work (`declutter` existed).

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
