# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-06 -- Round 1 is fully graded (43 sessions). Bar 1 FAILS on T12 (Les Miserables half
  1 of 3); bar 3 FAILS (neighbor list severity 4: r1-s17b F and r1-s18 left with a stated
  reason; 0 of 6 mouse users clicked Degree); bar 2 HOLDS (31 of 34); bar 7 cannot pass. T15, T3,
  T7, T8, T11 pass bar 1. `scores.md` and `insights.md` now agree (addenda at their tops).
- 2026-10-06 -- T12 must be reported per dataset in round 2: Florentine (6 neighbors) passes by
  clicking dots one at a time; Les Miserables (17) breaks. A Neighborhood-to-list fix judged on
  Florentine alone would look done. Re-test both halves with fresh personas.
- 2026-10-06 -- Round 2 process (criteria.md change log): no step cap (end on done, gave up, or
  repeating without progress; graders flag a cap ending -- none in round 1); one or two sentences
  per step; at most 4 participants alive at once; rating asked as 7 = very easy. tasks.md changed,
  so round 2's preflight re-records the frozen files' hashes.
- 2026-10-06 -- Before any round 2 session: prove the runner (at most 4 alive, `--end` always)
  with a dry run of 8 and a planted stop. Without it round 2 voids the same way (r1-s14 waited
  about an hour for a slot).
- 2026-10-06 -- Sizing chain is the main ease cost: named in all 12 SD sessions of T15 and T9;
  empty "Open list" in 6. Severity 2 for the chain (graders), 3 for the empty list. If round 2
  only removes the empty list, expect T9/T15 still SD.
- 2026-10-06 -- Round 2 tests one change per problem: Neighborhood opens the neighbor list (no
  Degree-row cue, so the effect is attributable); Summary drops "Babet (1)"; Selection row and
  Sources tables stop dead-ending; empty "Open list" gone; "No crossings" refusal line; wheel zoom;
  focus ring and focus after "+" pick; runs named by method.
- 2026-10-06 -- 7 round 1 voids (r1-s08b, s16b, s26b, s27b, s34b, s46b, s48b) move into round 2's
  roster; Morgan's 7 wait for the tool's screen-reader mode.
- 2026-10-06 -- Still owed for round 1: the stale-legend repro (r1-s49b, decides bar 5); bars 8
  and 9 by script on round 1's build as the baseline. Add to bar 8: the search box is not
  reachable by its visible text "Find nodes, edges, values" (3 sessions).
- 2026-10-06 -- Watch T11: "Force, flat" lays nothing out and Spectral clumps; a "did not help"
  there is the build. Confirm in graphty-element before round 2; report T11 with and without.
- 2026-10-06 -- Watch overlays: legend, Layout popover and toolbar cover nodes. Log every session
  where it bites.
- 2026-10-06 -- All participants are one model: N alike is not independent. Count a finding solid
  only with a `run.sh` repro or a cause in the code. Failure strong, pass weak.
- 2026-10-06 -- Before counting a finding against a bar: is the count false (not just confusing),
  is the step on the path, is the session valid (cut-off = void)? Before downgrading a severity,
  ask what one more failure would do; r1-s18 reversed a downgrade that rested on n = 1.
- 2026-10-06 -- Grade from the last screenshot and the transcript, never self-ratings; a truncated
  transcript is graded from screenshots or void.
- 2026-10-06 -- Simulated participants never hover: hover cues (DataRow tint, tooltips) are
  untested either way; do not count them as passes.
- 2026-10-06 -- Task wording never reuses a control's word (`tmp/researcher/wording-check.py`).

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

- 2026-10-06 (researcher, round 1 re-score with all 43 grades) -- Bar 3 back to fails: r1-s18 is
  a second failure on the neighbor list, a participant who left with a stated reason ("I'm not
  clicking 17 dots one at a time"), which is severity 4 by definition; the earlier downgrade
  rested on one thin failure. Bar 1 decided as failing on T12's Les Miserables half; bar 2 decided
  as holding. Pooled the 14 first-run sessions (full think-aloud prompt) with the re-runs (short
  prompt): same build, no grade pattern differs by prompt. Evidence: `rounds/round-1/scores.md`
  addendum; `tmp/researcher/r1-score.py` (rows for all 43).
- 2026-10-06 (researcher, round 2 process) -- No step cap; one or two sentences per step; at most
  4 participants alive; rating asked as 7 = very easy. Reasons and evidence in `criteria.md`'s
  change log. Checked every round 1 session for a cap ending: none (longest 33 of 60, 28 of 40),
  so no round 1 grade changes. Alternative rejected: a higher cap (still ends a slow success on
  the study's terms, not the participant's).
- 2026-10-06 (round 1 close, Design Director with my input) -- The 14 valid first runs are graded,
  not restarted; the 7 timed-out re-runs move into round 2 (rebuilding round 1's build for 7 cells
  costs more than it tells); Morgan's wait for screen-reader mode. Rejected for round 2: the Degree
  row cue (two changes at once), Size moves, Style-tab signpost, toolbar words, "show all labels"
  (wheel zoom first). Reason: round 2 must be able to tell which change helped.
- 2026-10-06 (researcher, round 2 critique) -- Smallest fixes for verified, reproduced core-path
  problems only; held back severity 1-2 items that rest on one model's shared first guess
  (Style-tab signpost, run names, toolbar words, "Start here"). The multi-node summary's
  commonest value is a computation over a column: a neutral fact (distinct count) belongs in
  graphty-element, the words in the app.
- 2026-10-06 (researcher, round 1 skeptic verdicts) -- Two skeptic drops drop an item, one drop
  weakens it. Dropped from bar 5: "18 nodes, 0 edges" beside "Edges among them 61" (both true) and
  "Babet (1)" (commonest value). Lesson: check the count is false, not just confusing.
- 2026-10-06 (researcher, round 1 scoring and re-runs) -- A session stopped by the provider's
  filter, by the run being stopped, by the runner's time limit, or that never got a browser is
  void and re-run with the same persona and task (`b` suffix); numbers are reported both as graded
  and with cut-offs void. Sessions on 9d6598eea and 452285142 are pooled (one header word apart).
- 2026-10-06 (researcher, answer key) -- Round 2: run names list the method first, the round 1
  result word accepted too; T12 gains a Neighborhood-command path (not a success on round 1's
  build); T11's refusal line is a correct reading, not `false-done` and not a success. Graders
  accept a run's on-screen name as naming the measure; the key copies the screen's spellings;
  Core depth, How tightly knit and How far are not answers to "depends on them"; a tie is right in
  either order. I did not loosen T13 for CSV group numbers that differ from the screen.
- 2026-10-06 (researcher, round 1 plan and allocation) -- 56 sessions: core four at full size
  (4 per half tolerates one failure), the rest at 2-3 with all-must-pass. 38 first-time sessions
  (68%); thinner persona files carry fewer sessions; each session a fresh agent.
- 2026-10-06 (researcher, criteria critique) -- Claims graded apart from tasks; per-dataset
  floors; T16 as an open first look; a second dataset for ranking (the model knows Les
  Miserables); a scripted echo check of task words against the build's text.
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
  `full_at.py`, `sessions.py`).
