# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-03 (older entries folded; full text in git history).

## Top of mind

- (2026-11-03) Tier 5 round 1 measured nothing from sessions: 60 of 60 VOID because `--gate` never
  ran (plan.md has no "Gate evidence"), and the re-runs hit the same refusal. Bars 1, 2, 3, 8, Sam's
  part of 5 and bar 9's follow-ups are "not measured", never "held". Before any launch, check
  `grep -c "Gate evidence" plan.md` is 1; a refusal every session shares stops the round at once.
- (2026-11-03) The leak check voids clean sessions: `leaksIn` (tool/real.mjs ~518) matches
  facilitator file names in Write bodies and heredocs. Fix before round 1 restarts.
- (2026-11-03) Round 1 after skeptics (`rounds/round-1/insights.md`): bar 4 fails on ONE severity
  3 (speech from the covered inspector, `WhichPicker.tsx:435`); Clear then Escape and the 900 x 700
  sliver fell to 2; bar 9 is "not measured", not failing (1 confirmed severity 2 of 3).
- (2026-11-03) A scripted words-at-rest count confirms nothing: it counts chrome, allowed
  statistics and the user's own names. Only the content designer's hand count decides.
- (2026-11-03) Before scoring a finding as a defect, check decided.md: two of round 1's "defects"
  were decided rules colliding (Escape drops a new card vs Clear has an undo), or decided behavior.
- (2026-11-03) Bar 7 sits on 7 unconfirmed Figma candidates; the audit must look at the typed
  picker, a yes-or-no step and a two-step card at rest, or the bar cannot be called.
- (2026-11-03) Key matched to 1e123d7d33: only the Fill line's description moved. When a fix
  changes a control's first state, grep the key for the old state ("6366F1", "text selected").
- (2026-11-02) Bar 9 cannot hold while a calm-first screen is unwalked: the check has not run on
  1e123d7d33 and skipped the reference picker and the 50,000-node screens on d3fda9f2b6.
- (2026-11-02) The overwhelm rating is dead as an instrument this tier (1.5-point gap); use the
  named "least sure" reason, scoped to the editor.
- (2026-11-02) "Kept on purpose" can hide an echo: a catalog keyword must never be overridable by
  the kept list (T74 B "routes").
- (2026-11-02) Grader rulings live in the key: equal routes through Analyze's own layer are S; a
  route that recolors everyone else is P when the prompt says to leave them.
- (2026-11-02) A task whose success path never opens the feature measures nothing about it.
- (2026-10-30) One round cannot both find and confirm fixes: plan a fix round and a re-test round.
- (2026-10-30) Simulated participants trust the tool's text over the picture: check tool lines
  against the screenshot.
- (2026-10-30) A severity 3 needs a reader who drew a wrong conclusion and left it standing.

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

- 2026-11-03 -- Applied the two skeptics to round 1 and wrote `rounds/round-1/insights.md`. Kept
  at 3 only the count spoken from the covered panel (the filter-host case speaks a count nothing on
  screen shows; the style-host case alone is a 2). Clear then Escape to 2 as a collision of decided
  rules (436/740/773 against 599/601) that needs a decided.md entry. Promoted "Clear renames a card
  'a selection'" to a confirmed bar 7 severity 2 although one skeptic weakened it: the other found
  a scripted repro and I checked it in `k2/route.jsonl` step 7 and `k2/07.png`; said so beside it.
  Bar 9 to "not measured" (words counts unconfirmed). Dropped "Edit after Done" and the
  "many counts" pattern. Reason: a claim stands only where a screen or a log backs it and no
  decided rule already settles it. Evidence: viewed k1/43, k1/88, k2/07, k2/08,
  engineer/style-900x700/03 and style-1200x900/10; decided.md 436, 599-601, 631-632, 694, 729-740, 773.

- 2026-11-03 -- Scored tier 5 round 1 (`rounds/round-1/scores.md`): every session-read bar "not
  measured", bar 4 "failing, pending skeptics", bar 9 "failing on confirmed findings; main check not
  run", bars 5 to 7 "not measured" with their parts listed. Recommended a full restart of round 1
  that does not count toward the 3-round cap or the no-progress stop. Reason: a round where no
  participant saw the app is no evidence about the editor, and a bar held by 0 sessions is a false
  pass. Counted the three over-budget outlines as three severity 2 by the criteria's letter ("a
  screen over the budget") and said beside it that by mechanism bar 9 is at its limit. Severity 2
  experts and the audit disagree on (strip column, 900 x 700) left to the skeptics, not averaged.
  Evidence: the 60 grades, expert/*.md, tool-dry-run-2.md section 6, plan.md (0 "Gate evidence").

- 2026-11-03 -- Round 1 plan moved to the refrozen build 1e123d7d33: only the build line and the
  follow-up sentence (the rating now asks for the "least sure" moment) changed; the 30 rows
  stand, because roster.md is unchanged since the plan was written and tasks.md's changes since
  (T74 B "journeys", T75 "one big tangle", the new follow-up) are read by the tool, not the row.
  Evidence: `git diff 0910cffb53 HEAD` on roster.md (empty) and tasks.md; `--brief` on all 30
  printed briefings with REAL_DIST tier5-r1d1-1e123d7d33 and the expected `setup:` lines.

- 2026-11-03 -- Escape in a just-added color line that takes the whole line back (typed text and
  all) is recorded as build behavior, not a defect: decided.md's reversal entry takes back a
  just-added line that holds no value, and the typed hex was never committed. Escape leaving focus
  in a box with a committed color is noted as a candidate against the shared text-field rule
  ("Escape reverts the typed text and leaves"), not a grade spoiler.

- **2026-11-02 (answer key vs the 0c163f54bf pilots):** Corrected T74's path count 12 -> 13 (an
  addition slip; the key's own listed steps and the walk give 13; the bar's rule unchanged, logged
  in criteria.md). Added Shortest path "On the route" to T74's Not success (right count, wrong
  gauges). Noted T76's by-hand route as P on this build rather than changing its success
  definition (a build limit, not a grading rule). Fixed tasks.md T78: "count" finds nothing,
  "pair" finds All-pairs distance and Bipartite matching. Reason: graders must not meet a screen
  the key does not describe. Evidence: the pilots' walks under tmp/design-studio/tier5/r1/pilot/.

- **2026-11-02 (second tier 5 criteria review, before any session):** Proposed eight changes,
  applied none (the Director freezes): (1) bar 9 cannot hold while a calm-first screen is unwalked
  or a finding unaudited; walk the reference picker at 11 and 50,000, the 50,000 checklist and
  words at rest as a start gate; (2) "two counts of one result" only when the two can never differ
  in any state the tasks reach (else the bar drives deleting a needed count); (3) replace the 1-7
  rating's role with an editor-scoped "where were you least sure" question coded by screen;
  (4) a re-test rate per placement-study fix against its 9-person baseline (6/9 wrong tick, 4/9
  wrong delete, 5/9 Escape, 3/9 guessed words, T4 1/3), not just "reached"; (5) T74 B "routes"
  echoes Shortest route's keyword: reword, walk it as a detour, and make wording.mjs refuse a kept
  word that is a catalog keyword; (6) one-half features (run-on-pick T74 B, So far T75 A, names
  T73, directed Degree T78 B) reported as one-domain evidence; (7) start gate adds 0 serious axe
  (14 per theme now) and the 50,000 table search; (8) count each defect once at its highest bar,
  and 50,000-node waits over 10 s (15 to 22 s now) count in bar 9's severity 2 allowance.
  Reason: each lets bar 9 or bar 5 pass or fail for a reason that is not the design, or leaves a
  re-tested fix unmeasured. Evidence: criteria.md, tasks.md, rounds/round-1/rating-check.md,
  calm-first-frozen.md, report.md summary, decided.md 585-601, graphty-element/src/catalog/
  algorithms.ts line 703 (keywords route, distance, path between), tool/wording.mjs (kept word
  passes).

- **2026-11-02 (tier 5 round 1 plan):** Wrote `tier5/rounds/round-1/plan.md`: 30 rows, the
  roster's assignments unchanged (core tasks T70, T71, T73, T74, T78 at 2 per half; T72, T75, T77,
  T79 at 1 per half; T76 none; Sam's T70 A and T71 A last with `setup:volunteers.txt --keys`).
  Starts are the roster's "Where each session starts" cells, written into each row so the plan
  alone says what a session opens. Follow-ups come from tasks.md through the tool. Reason: the
  criteria and roster are frozen; the plan only orders them. Evidence: `--brief` on all 30 printed
  a briefing on REAL_DIST tier5-r1d2-d3fda9f2b6 with the expected setup.
- **2026-11-02 (answer key matched to baac78342b, 797a4f6b47, c3100058ab, f0a9a014cb and
  d3fda9f2b6, folded):** Each pass changed only `answers.md` and the change log, never a bar or a
  prompt, and added a "Build notes (<build>)" section. Rulings kept: a blocked path is marked
  blocked with its fallbacks and cut values (T74 By position on baac78342b); equal routes through
  Analyze's own layer are S (T73 Steps away), a route recoloring the rest against the prompt is P
  (T74 A); graders get notes for counts that are not the picture's. Why: the key writes the frozen
  build's screen, and a grader without a ruling invents one. Worked: every edit cites a walk's
  screenshot. Did not work: subagents cannot write report.md, so reports arrive only as text.

- **2026-11-02 (first tier 5 criteria review, folded):** Proposed eight changes, applied none (the
  Director freezes): calibrate the bar 9 rating, cap calm-first clutter, walk the reference picker
  at 50,000, close severity 3 candidates in the dry run, "no task blocked" as a start gate, move
  T76's sessions to T78, reword three echoing prompts, count wrong turns before success only.
  Reason: each let a bar pass or fail for a reason that is not the design.
- **2026-10-30 (studio stopped after tier 4 round 1):** Record the round as findings, not a
  verdict on the design: two failing bars (2, 3) are partly study artifacts (key definition, tool
  hover line, inconsistent hover counting). Reason: a stop at the cap leaves no re-test, so the
  notes must say which failures are the product's (5, 6, 7, join preview) and which are the
  study's. Tried: two independent skeptics per insight -- worked; they caught the tool defect and
  the contestable false done. Did not work: grading hovers without a rule decided in advance.
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

- 2026-11-03 (round 1 insights) -- Worked: printing the cited route.jsonl steps (line N holds
  shot N.png) and viewing each cited screenshot before keeping a claim; reading decided.md at the
  lines the skeptics cited. Learned: when skeptics split on a finding, a repro I verify myself
  can settle it, but say which skeptic disagreed.

- 2026-11-03 (round 1 scoring) -- Worked: reading the tool's code for the leak check before
  calling the 60 leak lines false (the regex runs on written content); mapping each expert finding
  to the others' and the audit's by screen to apply "confirmed". Did not work: graders labeling a
  study-tool failure `build-defect`, and graders calling the scratch folder a defect (it is
  `real.mjs`'s design; `--end` copies back).

- 2026-11-03 (plan re-point) -- Worked: diffing roster.md and tasks.md against the plan's commit
  before touching rows, then one script (`tmp/researcher-plan-r1/sessions.py`) that parses the
  plan's rows and each half's follow-up from tasks.md (asserts 30) for the workflow's return.

- 2026-11-03 (key vs 1e123d7d33) -- Worked: editing only the sentences a pilot named, adding a new
  build-notes section rather than rewriting older builds' notes (they stay the record), and
  checking pathSteps before and after (counts identical). Did not work: pilots writing their own
  report.md from a subagent (the harness refuses it); the caller must save the returned text.

- 2026-11-02 (key vs 0c163f54bf) -- Worked: recounting each path's listed actions against the
  walk's route.jsonl and parsing the key with steps.mjs pathSteps after the edit. Did not work:
  trusting the pilot's "matches the key's 12" (it counted "+ > Layer" as one).

- 2026-11-02 (second criteria review) -- Worked: reading the dry run's own outputs
  (rating-check.md, calm-first-frozen.md "Not walked") against each bar to see which bars could
  hold by omission; mapping every catalog keyword to its plainName before reading prompts.
  Did not work: relying on wording.mjs for echoes in "Kept on purpose" words (it passes them).

- 2026-11-02 (round 1 plan) -- Worked: copying tier 4's plan layout (the parser reads columns
  id, task, half, persona, start) and briefing every row in one loop, tallying REAL_DIST and the
  start. Note: `--brief` writes to the worktree's `tmp/studio-sessions/`, not the round folder.
- 2026-11-02 (key matches, folded) -- Worked: per-build "Build notes"; moving older walks to
  `_<oldbuild>/`; viewing the screenshots that change a number before editing; one asserted Python
  edit script. Did not work: pilots writing report.md (harness refuses; caller saves the text).
- 2026-11-02 (tier 5 criteria) -- Worked: grepping prompts against catalog `keywords` and value
  labels. Did not work: grepping whole source trees for common words.
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
- 2026-09-28 to 10-21 (tiers 1 to 3, folded) -- Worked: two skeptics per insight; re-tallying
  grades from the plan; viewing every cited screenshot; a browser gate. Did not work: launching
  every agent at once; editing a running script; counting one defect in several lists.

## Thinking

- 2026-11-03 -- Expert-only rounds over-call severity: without a reader who drew a wrong
  conclusion, most 3s fall to 2 under the skeptics. Plan for that before calling a bar failed.

- 2026-11-02 -- A self-rating that does not move between designs the owner rates very
  differently cannot stand in for the owner. Prove a measure discriminates before it gates.
- 2026-11-02 -- When a bar's severity scale puts the owner's actual complaint (clutter) at 2 and
  only 3s gate, the bar can hold while the complaint stands.
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
