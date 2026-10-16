# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-11 -- **Round 5 verdicts applied (`round-5/insights.md`).** 55 of 55 valid succeed; bars
  9 (b) and 10 fail (one sev 3: names and nodes over each other, graphty-element). Strictly read,
  the stall rule is met: core four +2, the sev 3 fix seen only by specialists, bar 5 by absence.
- 2026-10-11 -- **Step counts are not comparable.** The key counts type+pick as one step;
  participants send two calls; refused clicks and hovers counted. r5-s19b's 8 is about 5. Bar 11's
  T18 "on the limit" dropped. Recount participants and key the same way before any cost claim.
- 2026-10-11 -- The tasks have hit a ceiling: every task succeeds and no prompt routes a reader
  through a fixed screen (T17 asks a count the top bar shows). Next round needs routes that reach
  the fixes, or real people.
- 2026-10-11 -- Histories steer: all 3 who went to Style on T22 have histories naming the Style
  tab; none without it went. Grep history against every first move BEFORE writing an insight.
- 2026-10-11 -- Setups contradict histories: T21 and T19 setups never save while histories say
  "saved". Fix setups or histories before those tasks run again.
- 2026-10-11 -- Prompt words create what is scored: T22 "without taking anything off" made the
  funnel hesitation; T20 "more minutes = longer trip" hid the weight default. Read the prompt for
  the behavior before scoring it.
- 2026-10-11 -- New one-session sev 2 (r5-s38b `04.png`): the Add page leaves new people out by
  default ("adds 0 nodes", "Leave out") and blames "node rows" a file without node rows lacks.
- 2026-10-11 -- A tool refusal is not reader confusion: "Graph" ambiguous click (r5-s45b, s48b) is
  an accessible-name defect to script, not a sighted reader's wrong turn.
- 2026-10-11 -- Leak-check VOID lines are text matches: read the participant's own log before
  voiding (s03b's ".." was legend prose, s53b's path a heredoc variable).
- 2026-10-11 -- bars.mjs has two silent MISS lines in rounds 4 and 5 (Enter on Shortest path picks
  All-pairs distance; tier 1 Degree click). Read the bars log's MISS lines, not only the JSON.
- 2026-10-11 -- r5-s02bb (Ruth, T22 B) owed; no bar depends on it.
- 2026-10-11 -- Priming has four sources: prompt, history, persona playing rules, briefing. Grep
  all four before "unprompted".
- 2026-10-11 -- Raising a severity because participants "named a risk" breaks the opinion rule;
  debrief words ("almost copied") are opinion when the session shows the reader did the right thing.
- 2026-10-11 -- Habit-matching fixes land at once; a rule written down fails; only the runner's own
  gate step protects a round.

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

- 2026-10-11 (researcher, round 5 skeptic verdicts) -- Rewrote `round-5/insights.md` for the b
  re-runs (the old file described the void first run). Rule: two drops = dropped, one = weakened
  unless answered with evidence. Verified the disputed claims myself first: the roster's Style-tab
  lines (Grace, Dev, Elena, Alex, Jordan; the three Style visitors are all in it), the key's
  one-step type+pick (answers.md T18 A), r5-s38b's "Leave out" default in grade and transcript, and
  viewed every cited screenshot. Dropped: T18 cost as a design finding; the Style tab as the second
  place users look. Weakened to sev 1: funnel icon, Style threshold, T20 numeric default, old Top 10
  after Replace, second path, stale From, neighbor list behind a menu, Follow, "full graph", T17
  column name and who-dropped. Kept sev 2: no names drawn, Replace hidden, Load filled, backticks,
  note subject, Hops heading, Filter to neighbors. Added one-session sev 2: Add page leaves new
  people out. Reported "Not stalled" as lenient only; strict reading meets the stall rule. Top five
  for the owner: overlaps, study artifacts (counting, histories, setups, prompts), stall, Add page,
  Replace.

- 2026-10-11 (researcher, round 5 scored from the b re-runs) -- Rewrote `round-5/scores.md` from
  55 valid grades, the gate's `bars/bars.json`, four expert reports and the leak check;
  `tmp/researcher/t2r5/score-b.py` asserts every row. Kept r5-s03b and s53b after reading their
  logs (no outside file opened). Voided r5-s02b as a run fault (a model-side classifier stopped its
  first transcript write) and named r5-s02bb owed. Applied the skeptics' round 5 severities to the
  expert findings (same build). Held the Add page's Load-primary trap at sev 2 (one session at 3,
  no one pressed Load). Read the borderline broken habit (T18 B by hand from the find box) as not a
  dead end, with the stricter reading written out. Called bar 5 a hold by absence and the stall
  test "not stalled" only with that caveat. Reported the bars script's two MISS moves.

- 2026-10-11 (round 5 plan, void run, re-plan, folded) -- Sized by the frozen rule (core four at 8,
  T22 at 8, T24/T19/T23 at 4, T4/T12R at 2). The first run was void: 56 refusals at `--start`
  because the running continuation script had no gate step. Verdicts: dropped "restart skipped the
  gate"; bar 10 on one sev 3; "or more" under the fold to sev 2. Re-planned as `<id>b` rows with the
  void folders kept as record.

- 2026-10-11 (round 4 closed, critique and verdicts, folded) -- Fixes chosen one per problem in
  its owning package, traced to source first (backtick suggestion guard in graphty-element
  `predicate.ts`; "or more" row for any in-range number; table scope "visible"; off step stays off;
  New project > Discard; note Cancel focus; `rulePath` export, team-decided). Held: second-path
  notice, Shift-click, Filters button. Verdicts verified by grepping briefings and viewing each cited
  screenshot; bar 10 failed on two sev 3s. Lesson: habit-matching fixes land at once; written rules
  fail; only a refusal in the tool or the runner's gate protects a round.

- 2026-10-11 (round 4 plan, scoring and key matches, folded) -- Sizes from the frozen rule; missing
  pilots recorded NOT MET with a mitigation; scored on valid grades with voids beside; key edits per
  build as a build section; the screen wins over a change note.

- 2026-10-10 (researcher, T24 wording before round 4) -- Changed the prompt, not the key: both
  halves end "so that whatever you do next applies only to those two"; words-changed log in
  `tasks.md`; criteria log entry. Removed the key's Shift route rather than leaving it: on
  26f3bb968e43 Shift-click on a node replaces, so the key named a route that fails (a grader
  would credit an attempt the app cannot finish). Pilots not run: no round 4 build is frozen yet
  (latest is tier2-r3d2-26f3bb968), and piloting the new words on the round 3 build would not
  meet the acceptance; recorded as owed in criteria.md instead of claimed. No bar changed.
- 2026-10-10 (round 3 critique and skeptic verdicts, folded) -- Six changes, each the smallest
  in its owning package: element Shift-click on a node adds (as an edge does; real-input test);
  T24 prompt reworded to an outcome; bare number gets an "at least" rule option; name matches lead
  the Analyze list; filter icon on the canvas toolbar; study tool fixes. Deferred: Hops 2
  distances, second path, PathForm focus drop. Verdicts in `rounds/round-3/insights.md`: two drops
  = dropped, one drop or weaken = weakened unless answered with evidence; every disputed claim
  checked in code at the build commit or in the grade file; "no names drawn" weakened, not dropped.

- 2026-10-10 (researcher, tier 2 round 3 scored, folded) -- `rounds/round-3/scores.md` from 56
  grades, four expert reports and my own `bars.mjs` run; leak check re-run per participant log
  (tool's copy read none); kept round 2's readings so rounds compare; steps by screenshot mtimes
  in the participant's own folder.

- 2026-10-09 to 10-10 (round 2 and round 3 plans, prompts, critiques and verdicts, folded) --
  Plans at the 56-session cap with asserted `sessions.py`; prompt pilots left "reported, not done"
  in round 3, which T24 paid for. Prompts: "point out on the drawing" (T22, T24), never "show" (a
  View menu word); briefings checked by `real.mjs --brief`. Critiques: smallest change per
  confirmed sev 3 in its owning package, reusing what exists (`exampleRule`, rule options).
  Verdicts: two drops = dropped, one drop or weaken = weakened unless answered with evidence; every
  disputed claim checked in the screenshot, the grade file or the code at the build commit.

- 2026-10-10 (researcher, keys for 26f3bb968e43, 897d9aed9ffe and b6d932823642, folded) -- Each a
  build section plus in-place fixes with the old wording as a parenthetical; a missed overlap (Jada
  on T18 A) added as a grader instruction; tier 1's frozen key untouched. T24's key was NOT
  re-walked on 26f3bb968e43, which round 3 paid for (its Shift route does not exist).

- 2026-10-02 to 10-09 (tier 1, tier 2 preparation and rounds 1-2, folded) -- Real app only
  (owner 2026-10-03); criteria frozen before a round; every task walked first; voids re-run with a
  `b` suffix; scored on valid sessions with voids beside; keys kept from participants; task words
  never echo the screen; keys get a build section plus scoped edits per build; deleted notes for
  screens no longer drawn; skeptic rule: two drops = dropped, one drop or weaken = weakened unless
  answered with evidence; "not scored" fails; bars 10 and 11 added at the freeze; personas
  validate, never generate features.

- 2026-10-11 -- **T17 histories say what was done, not where.** Seven T17 histories said earlier
  rankings ran "from the analysis button in the toolbar", the same place narrowing starts, so the
  history pointed at the route. Reworded in `tier2/roster.md`; logged in `tier2/tasks.md` (T17
  words-changed) and `tier2/criteria.md`. Persona habits (counts) stay but are not scored as
  unprompted checks. No bar or key route changed. Dana's history (not given T17) still names the
  toolbar; reword it if Dana is ever given a task that starts there.

## Tried: worked / did not work

- 2026-10-11 (round 5 verdicts) -- Worked: settling each disputed claim at its source in one or
  two greps (roster lines for the Style histories, the key's step line, the grade's problem table)
  before applying either skeptic; viewing all six cited screenshots. Did not work: my own scores'
  candidate insights, written without grepping histories (insight 2 failed its own refutation
  test) and without checking how the key counts steps (insight 3).

- 2026-10-11 (round 5 b scoring) -- Worked: a 20-line call dump of each flagged participant log
  (`t2r5/calls.py`) settled both leak flags and the void's mechanism in minutes; reading the bars
  log's MISS lines found two dead moves round 4 never reported; viewing the screenshots behind a
  sev 3 claim (r5-s38b `04.png`, `expert/visual/replace/13.png`). Did not work: trusting grade.md
  ease lines alone (seven grades lacked one; the transcript had it).

- 2026-10-11 (round 5 re-plan) -- Worked: running `real.mjs --gate` on a SCRATCH COPY of the round
  folder (no bars there) to prove the gate reads all 20 halves from the renamed rows: its only
  problem was the missing bars, and it wrote no evidence. Cheap, no browser, no round-folder writes.

- 2026-10-11 (round 5 verdicts) -- Worked: reading the workflow journal (event types, step labels,
  each participant's result) and the script the run executes, instead of the round folder alone;
  it overturned my own scores' "cut off" and "restart skipped the gate". Did not work: inferring
  the run mechanism from the round folder and the main script's text in `scores.md`.

- 2026-10-11 (round 5 plan, key match and scoring, after token-limit stops, folded) -- Worked:
  `git status`, `git log` and round listings first; asserted (old, new) edit scripts; one asserted
  score script; matching expert findings by screen and mechanism. Did not work: trusting a pilot's
  word about its siblings; a grep matching the session id in a path; not checking the runner.

- 2026-10-11 -- Worked: diffing per-round bars.json word lists showed the edge-inspector rise is
  the rail's "Settings" label plus data names moving to "left"; scores.md had blamed scope words.
- 2026-10-11 (round 4 verdicts, after a token-limit stop) -- Worked: `git status` and a listing
  first (no insights.md, nothing half-done); grepping briefings for the skeptics' priming claims
  instead of trusting either skeptic; viewing each screenshot before citing it. Did not work: my
  scores' "Priming: none/low" lines, written from prompts alone.

- 2026-10-10 to 10-11 (rounds 3 and 4 plans, keys, scoring and verdicts, after token-limit stops,
  folded) -- Worked: `git status`, `git log` and the round listing first every time; asserted (old,
  new) edit scripts; `score.py` asserting voids and one log per leak check; reading each disputed
  code claim at the build commit and each session claim in its `grade.md`; viewing every cited
  screenshot; finding void participants' logs by grepping agent logs for the session path. Did not
  work: matching logs by first lines; trusting graders' "no leaks"; a gate nobody enforced.

- 2026-10-10 (round 3 plan and keys, after token-limit stops, folded) -- Worked: `git status`
  and listings first; briefing EVERY planned row in scratch before writing a plan (found Dana's
  refusal); asserted (old, new) edit scripts; listing pilot folders instead of trusting a pilot
  report about its siblings. Did not work: assuming the r3 dry runs were briefed pilots.

- 2026-10-09 (round 3 prompts) -- Worked: writing each half's real briefing with `real.mjs
--brief <scratch dir> --task T22A --persona <name>` and checking the prompt text the participant
  gets, not `tasks.md`; it found the old "where" and Dana's refused briefing. Worked: dropping the
  "kept on purpose" words (data words like minutes, tie) from the avoided list by sentence. Did
  not work: assuming the unchanged sentences were clean because round 1 wrote them.
- 2026-10-09 (round 3 prompts) -- Another agent was mid-merge in the shared worktree; a commit
  then would have taken its whole merge. Waited for MERGE_HEAD to clear before committing.

- 2026-10-07 to 10-09 (tier 2 preparation through round 2 verdicts, folded) -- Worked: one
  scratch python of asserted (old, new) pairs matching the file's own line breaks; one dump of all
  grades read once; screenshot mtimes against follow-ups (found the leak); `session.json` build
  stamps before claiming a build was walked; a full 20-half pilot per frozen build (caught a broken
  key path); viewing every screenshot I cite; grepping the persona FILE, not the roster, to settle
  a split; long scripts (`bars.mjs`, detours, `--prove` x5) in the background while writing. Did
  not work: trusting preflight's "built"; reading prompt-made or persona-scripted behavior as user
  need or as a screen failure; anchors from memory; a walk's FAIL taken as a defect without
  checking the walk; a setup edited after one half's pilot; a dry run's fixes left in its report.

- 2026-09-28 to 10-07 (earlier rounds, folded) -- Worked: one row per session with an assert;
  grader JSON plus `grade.md` greps; repro scripts; two skeptics reading the tool's code; the
  4-slot browser gate; rehearsal by participant actions. Did not work: launching every agent at
  once; editing a script while it runs; a harness that exits 0 printing nothing; mocks.

## Thinking

- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: when every task passes,
  what is left to find is how the prompt, history, setup and step count shaped behavior. Audit those
  four first in any round where success is at 100%.

- 2026-10-11 -- When every task passes, the stall rule can only be met by bars, and a bar can hold
  because nobody visited its screen. Next rounds need a reader route that reaches each fixed screen
  (a prompt or follow-up that opens the table), or the fix stays specialist-only.
- 2026-10-11 -- A by-hand SD answer can carry a cost bar: score cost with and without routes that
  skip the feature under study.

- 2026-10-11 -- Priming has four sources, not one: the prompt, the history, the persona's playing
  rules, and the tool's own reference table in the briefing. A leak check over participant logs
  sees none of the last three. Every "unprompted" claim needs all four grepped.
- 2026-10-11 -- A sev 3 that no session met can still be the task's most likely route (bare "10"
  on bus stops). Check the task's data for whether the prompt's own number is a value.

- 2026-10-10 -- A reworded prompt can stop one unwanted route and open another: "point out"
  ended the styling detour on T22 (5 of 8 to 1 of 8) and let T24 participants mark two people with
  a path. When a prompt changes, re-read the key's S line against the new words, and pilot it.
- 2026-10-10 -- Recent is the only place the app remembers what a user did, and the follow-ups
  used it 6 of 7. Cheap repeat work may come from memory in the UI more than from new doors.

- 2026-10-09 -- A leaked facilitator file biases one way: it can only make routes look easier. So
  a leak does not void problems, it voids passes. Score with that asymmetry instead of voiding all.

- 2026-10-09 -- Participants choose the route nobody walked, and they style what they select:
  seed every dry run with the last round's detours AND with "make it last" (style a selection,
  rename it, clear it). A triage call of "works as designed" needs a reader's view, not a unit's.
- 2026-10-09 -- Isolation is a run property, not a tool property: the tool had `--brief`, the
  runner never called it. Every protection must be enforced where the session starts.

- 2026-10-09 -- Histories steer first moves; the SECOND place looked is the real signal. The
  unseeded layout makes overlap instances non-deterministic; report the class. Experts find how a
  reached screen behaves; sessions find whether a user reaches it.

- **Dry runs must walk detours, and the tool must be dry-run too (2026-10-09).** The answer key's
  route is the one route participants are least likely to stray from; round 1's defects and tool
  faults sat on the routes they chose. Seed each dry run with the previous round's wrong turns.

- **Bar 1 can pass a task whose point was missed (2026-10-09).** T20's per-run route is SD by the
  key, so 7 of 7 passed while 0 did it the way the owner's rule needs. Consider reporting S-only
  rates beside S+SD for any task whose SD route skips the requirement.
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
  `full_at.py`, `sessions.py`); tier 2 round 3 scoring: `tmp/researcher/t2r3/` (`score.py`,
  `leaks.py`, `work.py`, `concurrency.py`, `bars/`); round 3 preflight: `tmp/researcher/r3/` (`walk.sh`, `keypaths.mjs`,
  `ranks.mjs`, `wording-dump.mjs`, `wording-check.py`, `edit-answers.py`).
