# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-03 twice (older entries folded; full text in git
history).

## Top of mind

- (2026-11-03) Tier 5 round 1 (30 valid sessions, build 1e123d7d33) fails bars 1 (T73 0/4, T75 1/2),
  3 (T75), 4 (four severity 3, before skeptics), 8 (T70, T74, T78 by half) and 9 (4 editor elements
  named on different halves + 1 calm-first); bars 2 and 5 hold; 6 and 7 not measured (content and
  interaction walks did not run; bar 7 already at 5 of 5). `rounds/round-1/scores.md`.
- (2026-11-03) T73's four P's are one route: canvas Neighborhood > New layer from selection keeps
  ids, not the rule. The editor's Within hops was never opened, so it is untested, not refuted. The
  door people use must write the rule.
- (2026-11-03) Bar 8's T70 overage is mostly outside the editor (layer name box in rename mode,
  Fill box, hiding a drowning color layer, filter-first order). Decompose cost before blaming the
  editor; tag Fill-box steps as the criteria say.
- (2026-11-03) Score per half, not pooled: `steps.mjs` pools halves (T71 B fails by half by 0.5).
- (2026-11-03) Tool fixes before round 2 scoring: `endstate.mjs` must skip `hidden: true` layers
  (4 false mismatches); `score.mjs` misreads graders' layouts (5 grades, 19 overwhelm lines) --
  score bars 1-3 and 9 by hand until fixed; graders' return form needs a P value.
- (2026-11-03) Bar 9's named-element rule fires easily once people use the editor: count by
  element and say what the fault-by-fault reading gives, so skeptics can rule.
- (2026-11-03) A participant "no key does X" claim needs the decided keys checked: Sam never tried
  Escape, which decided.md makes Done; a long route is cost, not a block.
- (2026-11-03) Check the briefing against the setup before a round: T73 A's briefing promised a
  saved project the setup never wrote (r1-s09 discarded its start).
- (2026-11-03) Before launch: `grep -c "Gate evidence" plan.md` is 1; move a void round's tmp
  folders aside before briefing a rerun; the runner stops at the first refusal all sessions share.
- (2026-11-03) Expert walks find what is wrong, not how often it hurts; an expert-only round can
  fail bar 4 but pass no session bar.
- (2026-11-03) Check decided.md before scoring a defect; colliding decided rules need a ruling.
- (2026-11-03) A second build of a shared control breeds defects; look for duplicated controls.
- (2026-11-02) The overwhelm rating does not discriminate; use the named "least sure" element.
- (2026-10-30) One round cannot both find and confirm fixes: plan a fix round and a re-test round.
- (2026-10-30) Simulated participants trust the tool's text over the picture: check tool lines
  against the screenshot.

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
- **Cost measured in steps, not minutes** (the clock holds model thinking), per task half, on
  pointer sessions; keyboard personas reported apart.
- **An end-state script** for what a picture cannot show (filter and export counts).
- **A bar only a route under study can meet**; a pass around the feature does not hold it.

## Decisions and reasons

- 2026-11-03 -- Scored tier 5 round 1 (`rounds/round-1/scores.md`). Used `grade.md`'s P where the
  graders' form wrote F or G (7 sessions). Bar 8 per half (criteria's letter) over `steps.mjs`'s
  pooled verdict. Bar 4: four severity 3 confirmed before skeptics -- the covered inspector's
  speech (kept by both skeptics in the void round, unfixed on this build), Results entries binding
  a whole-graph run (r1-s23 + repro), how-to-match stuck on Contains (r1-s18 + repro, with the
  counter-argument written beside it), Clear then Escape deleting a saved card (accessibility walk
    - repro). Bar 9 by element (Or group, Condition.../Or..., By position box, value picker) plus the
      outline's Except column; fails at 4 even without the value picker. Bar 7: 5 confirmed severity 2
      = allowance, reported "not measured" because the interaction walk did not run. Counted a replay
      of an expert's walk as a scripted repro, as in the void round. Endstate's four mismatches called
      a tool defect after reading `hidden: true` in each `styles.json`. Reason: every verdict by the
      criteria's letter, with the reading a skeptic might prefer written beside it. Evidence: viewed
      `repro/r1-s23/run/09.png`, `repro/r1-s18/05.png`, `expert/engineer/thanks-1200x900/04.png`;
      `waits.mjs` (0 over 10 s); bars.json (0 serious axe).
- 2026-11-03 -- Planned the round 1 rerun: the void round's 30 rows unchanged plus "no session
  starts before `real.mjs --gate` writes Gate evidence". Moved the void tmp folders aside.
- 2026-11-03 -- Void round insights (`rounds/round-1-void/insights.md`): kept at 3 only the covered
  panel's speech; Clear then Escape on a new card to 2 as a decided-rule collision; bar 9 "not
  measured" (scripted word counts confirm nothing). Reason: a claim stands only where a screen or
  log backs it and no decided rule settles it.
- 2026-11-03 -- Void round scored: every session bar "not measured"; recommended a full restart not
  counted toward the round cap. A bar held by 0 sessions is a false pass.
- 2026-11-03 -- Escape in a just-added color line taking the line back is build behavior (decided
  reversal of a line with no value), not a defect.
- 2026-11-02 -- Answer key matched to each dry-run build (0c163f54bf to 1e123d7d33): only the key
  and the change log, a "Build notes (<build>)" section per build, T74's path count 12 -> 13 (an
  addition slip), Shortest path's "On the route" added to Not success. Graders must not meet a
  screen the key does not describe.
- 2026-11-02 -- Two criteria reviews proposed (not applied; the Director freezes): calm-first must
  walk every listed screen; "two counts of one result" only when they can never differ; an
  editor-scoped "least sure" question; fix rates against the placement baselines; reword echoing
  prompts (T74 B "routes"); one-domain features reported as such; count each defect once.
- 2026-10-30 -- Tier 4: stopped at round 1 as findings, not a verdict; two skeptics per insight cut
  all four severity 3s to 2 or below; scored by hand where scripts were wrong, and said so.
- 2026-10-02 to 10-21 (tiers 1 to 3, folded) -- Real app only; criteria frozen before a round;
  every task walked first; task words never echo the screen; VOIDs re-run as `<id>b`; change the
  prompt, not the key, when a prompt leads; two skeptics per insight.

## Tried: worked / did not work

- 2026-11-03 (round 1 scoring) -- Worked: running steps, endstate, keydraw, waits and score first,
  then reading every grade's head lines in one loop; printing each route's first three actions to
  get first doors; reading `hidden` in `styles.json` before trusting an endstate mismatch; viewing
  the repro screenshots that carry a severity 3. Did not work: `score.mjs` on these grades (layout
  drift), `steps.mjs`'s pooled verdict, grepping routes for "Delete" (the screen lists match).
- 2026-11-03 (rerun plan) -- Did not work: briefing into the void round's tmp folders (an old
  `grade.md` reads as facilitator words). Worked: moving them aside, then briefing all 30 in a loop.
- 2026-11-03 (void insights) -- Worked: printing cited route.jsonl steps and viewing each cited
  screenshot; when skeptics split, a repro I verify myself settles it, saying who disagreed.
- 2026-11-03 (void scoring) -- Worked: reading the tool's code before calling 60 leak lines false;
  mapping expert findings across walks and the audit by screen. Did not work: graders labeling a
  study-tool failure `build-defect`.
- 2026-11-02 (keys, criteria, plan) -- Worked: per-build key notes; recounting path actions from
  route.jsonl; grepping prompts against catalog keywords and option labels; diffing roster and
  tasks since the plan commit. Did not work: pilots writing report.md (harness refuses subagent
  report writes; the caller saves the text); trusting a pilot's own step count.
- 2026-10-29 to 10-30 (tier 4) -- Worked: `steps.mjs` and `endstate.mjs` first, one asserted script
  per tally, viewing the reference image beside a session screenshot. Did not work: trusting the
  tool's `tooltip: null` and wrong-turn counts that included post-success checks.
- 2026-09-28 to 10-21 (tiers 1 to 3) -- Worked: two skeptics per insight; a browser gate. Did not
  work: launching every agent at once; editing a running script; counting one defect in several
  lists.
- 2026-11-03 (tier 5 void) -- Did not work: launching without the gate evidence (60 of 60 void).

## Thinking

- 2026-11-03 -- When a task's every session takes one door around the feature, the result is a
  finding about the door, not about the feature: route the fix to where people already go
  (Neighborhood writes the rule) rather than teaching them the editor.
- 2026-11-03 -- Preview-then-color order means no one ever sees the final look while choosing;
  people asked for it 5 of 5. The decided group colors answer "who is picked", not "how will it
  look", and a lower layer can swallow the new color with only a small key line saying so.
- 2026-11-03 -- A count that waits for Enter beside one that applies as typed reads as "nothing
  happened". Mixed commit rules in one workspace cost more than either rule alone.
- 2026-11-03 -- Expert-only rounds over-call severity; plan for the skeptics before calling a bar.
- 2026-11-02 -- A self-rating that does not move between designs the owner rates very
  differently cannot stand in for the owner. Prove a measure discriminates before it gates.
- 2026-10-30 -- A trap that a task's order guarantees measures the task as much as the default;
  vary the order before calling the default the cause. Ask of every fix what a half-done state
  now looks like.
- 2026-10-30 -- A count with no rows behind it turns every task into a checking task; it shows up
  as cost, not failure.
- 2026-10-29 -- A pilot "mismatch" splits three ways: the key described a door the build lacks, the
  build gives a different number for the same act (grading line), or the act cannot be done.
- **What can produce a false pass.** Task words that echo controls; a goal that states the control's
  meaning; graders accepting "I think it worked"; setups that pre-do part of a task; a fix judged on
  the easier dataset; a route around the feature counted as success; pooled halves.
- **What can produce a false fail.** Build defects that decide the task, tool limits, a briefing
  the setup does not match, headless timing (name the mechanism), and the runner.
- **Stopping simulation.** When rounds stop moving the core tasks, go to real users (graphty.app
  with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- Tier 5: `tier5/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md`,
  `rounds/round-1/scores.md`, `plan.md`, `expert/*.md`, `repro/`, `rounds/round-1-void/`; tools
  `tool/steps.mjs`, `endstate.mjs`, `keydraw.mjs`, `waits.mjs`, `score.mjs`, `bars.mjs`, `real.mjs`.
- Tier 4: `tier4/criteria.md`, `answers.md`, `decided.md`, `words-at-rest.md`,
  `rounds/round-1/scores.md`; reference images in the main checkout's `tmp/design-studio/tier4/`.
- Earlier: `tier3/`, `design/ui/studio/digests/`, `tier2/report.md`, `tmp/researcher/`.
