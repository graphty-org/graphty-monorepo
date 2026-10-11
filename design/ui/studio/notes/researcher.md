# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-11 -- **Round 5 is void, 0 of 56 valid** (`tier2/rounds/round-5/scores.md`). The gate
  (bars.mjs into `bars/`, then `real.mjs --gate`) never ran after the usage-limit restart, yet 56
  sessions were launched; `--start` refused 51, 5 stopped after the briefing. Re-run all 56 as
  `<id>b` on 8c015b806 after the gate exits 0; the plan, pilots and briefings stand.
- 2026-10-11 -- A void round is incomplete, not stalled: never apply the stall rule to a round
  whose every session was voided for a run reason.
- 2026-10-11 -- After any usage-limit stop, check the round folder for `bars/bars.json` and the
  plan's "## Gate evidence" heading BEFORE anything else; the runner must resume at the gate.
- 2026-10-11 -- Round 5 experts (same build, they stand): bar 10 fails on 2 confirmed sev 3 --
  drawn names over names and ties (owner item), "or more" row under the fold on friends. Fixed on
  8c015b806 by specialist checks: unfiltered table, field-path layer name, bare "10" refusal, off
  step turning on, New project > Discard, note Cancel focus. Credit only when readers meet them.
- 2026-10-11 -- New confirmed sev 2: the out-of-date note counts nodes only, so an edge-only step
  says "Ran on 20 nodes; 20 shown now" (audit 5, visual 3). Element fact needs edge counts.
- 2026-10-11 -- Claim a (unknown column) now sev 2 by three specialists; claim b reproduces by keys
  only; claim c (name takes the tie click) did not reproduce at the tie's midpoint.
- 2026-10-11 -- Round 5 watch, when it re-runs: T22 A credit by "10" reaching the 3 stops with no
  refusal, not an "or more" pick (prompt echo); T17 table counts under a step; T18 bar 11 at 8 of 8.
- 2026-10-11 -- Priming has four sources: prompt, history, persona playing rules, briefing. Grep
  all four before "unprompted".
- 2026-10-11 -- Habit-matching fixes land at once; a rule written down fails; a refusal in the tool
  works for a session but must also stop the runner.
- 2026-10-11 -- Raising a severity because participants "named a risk" breaks the opinion rule;
  near-identical lines across sessions are one template, not N people.

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

- 2026-10-11 (researcher, round 5 scored) -- Wrote `round-5/scores.md` from 56 VOID grades and four
  expert reports; `tmp/researcher/t2r5/score.py` asserts 56 planned, every grade VOID, no
  screenshot anywhere, no gate section, no bars.json. Every session bar "not scored" (does not
  hold); 7 (a), 8, 9 not scored (no bars run); bar 10 fails on two confirmed sev 3. Did NOT apply
  the stall rule: criteria void and re-run run faults, so a fully void round measured nothing.
  Kept "or more under the fold" at sev 3 on a 3/2 split, as round 4 did. Expert findings stand
  for the re-run (same build). Recommended: gate, then 56 `b` re-runs, runner stops on the first
  refusal and resumes at the gate after a usage limit.

- 2026-10-11 (researcher, round 5 plan) -- Sized by the frozen rule, not by the director's "what
  round 5 re-runs" list where they differ: the core four at 8 always (decisions listed only T22 and
  T17), T19 at 4 because a fix touched it (decisions said script only). No task missed bar 1, so
  the weight follows the failing bars: T22 at 8 (bar 10 severity 3 on its natural route), T24 at
  4 (names over its tie, claim c). T4 and T12R at 2 to cover every task. Kept the claims section as
  the plan's last part, marked not fixed on this build. Briefed all 56 in scratch: only the kept
  avoided words; no answer facts (the one "s11" hit was the session id r5-s11).

- 2026-10-11 (researcher, round 4 closed) -- Read `round-4/insights.md` and `decisions.md`.
  Taught: a fix that matches a habit lands at once (Shift-click T24 2/4 to 7/7; toolbar Filters
  first door 7/7 T17), and a rule written down fails twice while a refusal in the tool works --
  the gate skipped two rounds running and briefings leaked answers. Decided (director): study
  first (sev 4: `--start` refuses without gate and runs on a free slot; briefings name file and
  kind only, leak check reads briefings; `--shift-click` stays), then one fix per problem in its
  owning package: backtick suggestion only if selection accepts it; "or more" row inside a
  column's range; off step stays off on leave; New project > Discard scripted then fixed; table
  uses scope "visible"; `rulePath` export (team-decided, additive); note Cancel focuses "+"; T17
  histories say what, not where; bar 9 (b) diff words before cutting, scope words stay. Held:
  one warning look for load problems (1 session), "out of date" accessible name, second-path
  notice. Watch in round 5: T22 A picks of the "or more" row are prompt-matching, not discovery;
  gate evidence in plan.md; leak check on briefings; persona habits not scored as unprompted.

- 2026-10-11 (researcher, round 4 critique) -- Proposed the smallest fix per verified problem,
  traced to source first. Find box: `ruleFromText` offers the element's `number-needs-backticks`
  suggestion; `suggestBackticks` (graphty-element `session/styles/predicate.ts`) checks only that
  the rewrite parses, and a bare literal parses, so the fix is one guard there (the rewrite must
  be a condition), every consumer gets it. The "or more" row comes only from `valueRowOf` over
  values present (`session/query.ts`); additive element change to offer it for any in-range
  number. Table: element already has scope "visible"; the app hard-codes "graph" at
  `TableDock.tsx:349`. Overlaps: element owner item stands; script first whether the label or the
  dot takes the tie click. Said NOT to change: Shift-click, Filters button, the find hint, the
  "Settings" rail label, the second-path replace (no cost shown). Reason: fix in the one shared
  place; do not reword to game a word count.
- 2026-10-11 (researcher, round 4 skeptic verdicts) -- Wrote `round-4/insights.md`. Rule: two
  drops = dropped, one drop or weaken = weakened unless the other answers with evidence. Verified
  the disputed priming claims myself before applying: the file table is in every briefing (4
  answer lines in each T21 one), r4-s38's transcript names Mo and Nia at the Replace page, the
  nonprofit persona file says "Checks counts before and after", 6 of 7 T17 briefings say "toolbar".
  Kept bar 10 failing on two sev 3s; bar 5 holds by its words; dropped the "Shortest path"
  shared name (same command). Cited only screenshots I viewed. Top five for the owner: overlaps,
  bare-number refusal, study faults, unfiltered table, Shift-click.

- 2026-10-11 (round 4 plan, scoring and key matches, folded) -- Sizes from the frozen rule (T24
  at 8, core four 32, changed tasks 4, T12R 2, last 2 to T19; personas swapped vs round 3). Missing
  T24 prompt pilots recorded NOT MET with a mitigation rather than failing the gate. Scored from 53
  grades, 3 voids beside, my own after-the-fact bars.mjs run; bar 5 scored failing on a reader's own
  check (skeptics then held it to the bar's words). Voids traced in the participants' own logs. Key
  edits per build as a build section plus in-place notes; the screen wins over a change note
  (pixels sampled first); drawn-names sev 3 measured with declutter off.

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

- 2026-10-11 (round 5 scoring, after a token-limit stop) -- Worked: `git status`, `git log` and
  the round listing first showed 56 grades, no `bars/`, no gate section, no scores.md; one asserted
  script over grades, both transcript locations and screenshots; matching expert findings across
  the four reports by screen and mechanism. Did not work: the round's own recovery -- the restart
  launched sessions past an unpassed gate, and nobody looked for `bars/` first.

- 2026-10-11 (round 5 plan, after a token-limit stop) -- Worked: `git log`, `git status` and the
  round folder listing first: plan.md held only the claims section (committed), pilots complete on
  8c015b806, no session folders; reusing round 4's `sessions.py` with new asserts (Dana off T17,
  swap vs round 4) and `brief-all.py` pointed at round 5. Did not work: a grep for answer facts
  that matched the session id in a path.

- 2026-10-11 (round 5 key match, after a token-limit stop) -- Worked: `git status`, `git log`
  and a pilot-folder listing with mtimes first (nothing half-done; T12R A and B still being
  written by other agents); asserted (old, new) pairs in `tmp/researcher/r5/edit-answers.py`;
  fixing a stale note in place with the old wording as a parenthetical. Did not work: trusting a
  pilot's word about its sibling folders.

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
