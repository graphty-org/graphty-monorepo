# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-30 (older entries folded; full text in git history).

## Top of mind

- (2026-10-30) Tier 4 round 1 settled (`tier4/rounds/round-1/insights.md`): bar 4 HOLDS after the
  skeptics (no severity 3 survives); bars 2, 3, 5, 6, 7 fail as frozen, but bar 2 rests on the
  key's definition and bar 3 on post-success checks plus a tool defect. Bar 6 is real (ratio clipped).
- (2026-10-30) Fix `tool/real.mjs` before round 2: a hover that opens a popover prints
  `tooltip: null`, and simulated participants believe the line over the screenshot (s13, s15, s21,
  s22 reported "nothing appears" while 03.png shows the fix list). Check tool lines against images.
- (2026-10-30) Top open problem: the join preview mismarks rows (one skeptic 3, one 2; held at 2).
  Readers recover from the counts after Join; cost is steps (T61 about 12 vs path 7).
- (2026-10-30) A severity 3 needs a reader who drew a wrong conclusion and left it standing. A
  "false done" defined only by the answer key (a type the product itself blurs) is contestable.
- (2026-10-30) Count wrong turns before the success state only, and decide whether a hover is a
  turn before grading; graders split on it this round.
- (2026-10-30) Bar 3 on a 2-session task is the mean of two: say so whenever it decides a bar.
- (2026-10-30) Owner decision item 1 (Select | Filter to | Filter out, new card on Filter out)
  keeps the default behind 5 of 5 "card hid the picture first" detours; but the task order forces
  that trap, so test the default on a task that does not start with filtering.
- (2026-10-30) Approved-surface checks: reference image beside a session screenshot, and the
  route's text, to tell "removed" from "clipped" (the ratio was clipped, not removed).
- (2026-10-30) An A/B split with 2 sessions per half is confounded with dataset and persona; never
  report "people go where they are" from it.
- (2026-10-30) Brief every row before a round; a fact in "Facts no briefing may hold" must be a
  phrase no persona or README holds.
- (2026-10-30) A prompt word that is a detour control's label steers into it; grep prompts
  against detour controls too.
- (2026-10-30) First check of any pilot finding: the build in its walk's session.json.
- (2026-10-29) Grep the app's strings for every prompt word, not only the avoided list.
- (2026-10-21) Graders over-rate on one half: count a 3 only with its behavioral cost. Expert
  counts are not user evidence; an expert-only 3 needs a repro under `repro/`.
- (2026-10-21) Leading risk: every participant is one model; read tasks and key for leading.

## Priorities and values

- **Findings that are real.** A study that flatters the design is worse than no study: it ships
  the defect with a pass stamped on it. Every method choice is judged by whether it can produce a
  false pass.
- **The first-time user's core path first** (owner, 2026-10-02): load or pick a sample, read what
  loaded, rank, find groups, color or size by a result, labels from an attribute, a readable
  layout, find a node and its neighbors, export a picture and the numbers, save and reopen.
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. An opinion-only finding is held one severity level down.
- **Studies are expensive; validate before launch** (owner, 2026-09-29). Preflight, rehearsal,
  dry run and a snapshot before any paid round. A check that inspects zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
  No persona-specific fix, no one-domain wording.
- **Honest reporting.** Every number with its denominator, with and without deciding defects and
  cut-off sessions, and successes alongside failures.

## Design criteria

The bars live in each tier's `criteria.md` (frozen before a round; changes only between rounds,
logged). Their reasons, in short:

- **Each task >= 75-80% success, each dataset half at a floor** -- the half floor stops a
  one-domain fix passing on combined counts.
- **No confirmed severity 3 or 4.** Nielsen 0-4; confirmed = 2 sessions on different halves, a
  session or an expert plus a scripted repro, or an expert screenshot finding the audit also shows.
- **Cost measured in steps, not minutes** (the clock holds model thinking), on pointer sessions;
  keyboard personas reported apart.
- **An end-state script** for what a picture cannot show (filter and export counts).
- **A bar only a route under study can meet**; a pass around the feature does not hold it.

## Decisions and reasons

- **2026-10-30 (tier 4 round 1 insights, skeptics applied):** Two drops = dropped, one drop or
  weaken = weakened. All four severity 3 candidates fell to 2 or below (join preview 2, time vs
  kind 2, "With issues 11" 1, Export focus a candidate), so bar 4 holds. Bar 2 counted but flagged
  (false done only under the key's definition). Bar 3 reported as "fails as frozen, not shown as a
  design failure" (1 wrong turn before success per T64 session). Bar 6 kept with the mechanism
  corrected to clipping. Insights "a fix created a trap" dropped, "issue home depends on where
  people are" confounded; the other four weakened. Added the tool's `tooltip: null` defect as a
  must-fix. Reason: a claim stands only where both a screen and a reader's cost back it. Evidence:
  `rounds/round-1/insights.md`; viewed repro/r1-s03/02.png, sessions/r1-s08/05.png,
  r1-s09/16.png, r1-s03/20.png, r1-s13/03.png myself.

- **2026-10-30 (tier 4 round 1 scoring):** Scored by hand from grade.md lines plus the two scripts
  (`steps.mjs`, `endstate.mjs`), and wrote r1-s08 as P (grade.md and the criteria) where the
  collected form said F. Proposed four severity 3s, each a confirmed defect with a 3 from a grader
  or expert: the join preview mismarks rows (4 sessions both halves + repros), "Set in Data" leaves
  the column text (5 sessions both halves + repro, one false done), "With issues 11" counts
  suggestions and hides G12 (session + repro, a misread count), Export's warning drops focus
  (accessibility walk; held as candidate until replayed). Held Figma's "Hide keeps matches" at 2
  (the one session recovered) and left the raw-millisecond date card unconfirmed (no session
  collapsed one). Called bar 6's ratio removal a violation after comparing the reference image with
  r1-s01/14.png myself. Reported bar 7 as frozen and, beside it, the graders' to-success counts.
  Reason: each claim must stand on a screen or a script, and the frozen rules stay frozen.
  Evidence: `rounds/round-1/scores.md`, `steps.json`, each session's `endstate.json`.

- **2026-10-30 (round 1 plan and recheck, folded):** 28 sessions exactly as roster.md (core tasks
  first, A and B alternating, Sam last with `--keys`); follow-ups from tasks.md through the tool.
  Changed T65 B's key facts to `5 gauges`/`3 gauges` so `--brief` stops refusing; kept plan.md on
  recheck (the plan script now keeps "## Gate evidence" on a rerun).

- **2026-10-29 to 10-30 (tier 4 key matched to each frozen build, folded):** The key writes the
  screen of the frozen build; earlier-build notes kept beside new ones; a count the build gets
  wrong becomes a grading line, never the key's number; T66's prompt changed to "Take it out" and
  "Leave out" named under Not success; findings from stale walks or decided.md wording change
  nothing. Removed the T66 id-card route (cannot be built).

- **2026-10-29 (tier 4 criteria review):** Proposed eight changes, applied none (the Director
  freezes): grade from end-state records plus a script, confirm expert findings by repro, reword
  echoing prompts, map every decided fix to a route, count Sam apart, move T65 B to a second domain,
  give T63 a place not preset and T68 a filtered start. Most were adopted into the criteria.

- **2026-10-21 (tier 3, folded):** Two skeptics per insight (two drops = dropped, one = weakened);
  disputed claims settled at their source; scored by hand where `score.mjs` was wrong and said so;
  stopped tier 3 at round 1 (remaining failures came from the grading rule and unreached backlog).
- **2026-10-02 to 10-20 (tiers 1 and 2, folded):** Real app only; criteria frozen before a round;
  every task walked first; task words never echo the screen; VOIDs re-run as `<id>b`; change the
  prompt, not the key, when a prompt leads.

## Tried: worked / did not work

- 2026-10-30 (insights) -- Worked: viewing each owner screenshot before citing it (r1-s03/20.png
  showed "deliveri...", not one letter: wording corrected). Did not work: my scoring trusted the
  tool's `tooltip: null` and grader wrong-turn counts that included post-success checks.
- 2026-10-30 (round 1 scoring) -- Worked: running `steps.mjs` and `endstate.mjs` on the round
  first, then one script (`tmp/researcher/score-t4r1/doors.py`) for grade, wrong turns, first door
  and build per session with an assert on the build; parsing grade.md problem tables for kind and
  severity (`kinds.py`, assert > 100 rows) and checking the two that did not parse (r1-s16, r1-s19:
  another table form) against the collected grades; viewing the reference image beside a session
  screenshot before calling a bar 6 violation. Did not work: a multi-line `old` string in an
  asserted Python replace (match a fragment on one line).
- 2026-10-30 (plan) -- Worked: diffing roster.md and tasks.md since the plan commit before
  regenerating; briefing all 28 and tallying `REAL_DIST` and `setup:` lines.
- 2026-10-29 to 10-30 (key edits) -- Worked: one Python edit script with exact-match asserts per
  replacement; `git log -S` to find which commit wrote a stale key line; counting path steps from
  each walk's `route.jsonl`; `wc -l` on pilots' downloads. Did not work: pilot report.md files (the
  harness refuses subagent report writes); trusting the avoided-words list as the echo check.
- 2026-10-21 (tier 3) -- Worked: two skeptics per insight; re-tallying every grade from plan.md and
  each `^Grade:` line; a key-and-drawing script over last states; one screenshot per owner insight.
  Did not work: bars requiring "no open severity 3" while no task reaches the backlog 3s; counting
  one defect in three lists (count each once, at its highest list).
- 2026-09-28 to 10-11 (tiers 1 and 2) -- Worked: `git status`, `git log` and round listings after
  any stop; viewing every cited screenshot; a browser gate. Did not work: launching every agent at
  once; editing a script while it runs.

## Thinking

- 2026-10-30 -- Simulated participants trust the tool's text over the picture. Every tool line
  that says "nothing" is a claim to verify against the screenshot, before it becomes a finding.
- 2026-10-30 -- A trap that a task's order guarantees (filter first, then mark) measures the task
  as much as the default; vary the order before calling the default the cause.
- 2026-10-30 -- A fix can create the trap the next round finds: R15 made the first header click
  sort A to Z, which on ISO-day text looks exactly like a date column. Ask of every fix what a
  half-done state now looks like.
- 2026-10-30 -- A count with no rows behind it turns every task into a checking task; that shows up
  as cost (bar 7), not failure. When cost fails and success holds, look for results the screen does
  not confirm.
- 2026-10-30 -- Where people go first depends on where they stand: T67 A went to the table, T67 B
  to the source row. A decided "one home" has to carry everything the other door has.
- 2026-10-29 -- A pilot "mismatch" splits three ways: the key described a door the build lacks
  (rewrite the path), the build gives a different number for the same act (grading line while the
  defect stands), or the act cannot be done (blocked). Never fold the second into the first.
- 2026-10-21 -- A tool that measures "change from the start" must know where the start is.
- 2026-10-21 -- When every task passes, the bars that still move are cost, route share and
  confirmed problems. A design whose traps never fire may be avoided rather than understood.
- 2026-10-20 -- Echo checks need phrases, not word lists; the spoken layer is where echoes live.
- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: audit prompt, history,
  setup and step count first. Priming has four sources: prompt, history, persona rules, tool text.
- **What can produce a false pass.** Task words that echo controls; a goal that states the control's
  meaning; graders accepting "I think it worked"; setups that pre-do part of a task; a fix judged on
  the easier dataset; a route around the feature counted as success.
- **What can produce a false fail.** Build defects that decide the task, tool limits, headless
  timing (name the mechanism), and the runner (time limits, slot waits).
- **Stopping simulation.** When rounds stop moving the core tasks, go to real users (graphty.app
  with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- Tier 4: `tier4/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` (R1-R15, owner
  data rules, approved surfaces), `words-at-rest.md`, `owner-decisions.md`,
  `rounds/round-1/scores.md`, `design/data/filter-cards.md`; tools `tool/steps.mjs`,
  `tool/endstate.mjs`, `tool/bars.mjs`; reference images in the main checkout's
  `tmp/design-studio/tier4/reference/`.
- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `rounds/round-1/scores.md`; tool
  `tool/score.mjs`, `tool/wording.mjs`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, round folders, `tmp/researcher/`.
