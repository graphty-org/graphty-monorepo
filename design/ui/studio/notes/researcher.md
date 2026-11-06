# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-03 twice (older entries folded; full text in git
history).

## Top of mind

- (2026-11-03) Tier 5 stopped at the 1-round safety cap with bars 1, 3, 4, 8, 9 failing and 6, 7
  unmeasured. A one-round cap cannot meet bars that need a fix round plus a re-test round: ask
  for a cap of at least 2 (find, then confirm) before the next tier launches.
- (2026-11-03) Open work handed on (`rounds/round-1/insights.md` "What the round needs next"):
  fix the Results-pick run binding, By position's box and false error, the empty Fill box, "Is
  exactly" on an empty step, Clear-then-Escape deleting a saved card; re-walk each by its repro.
- (2026-11-03) Bars 6 and 7 went unmeasured because two expert walks never ran: make every bar's
  feed a launch precondition, not a best effort.
- (2026-11-03) Tier 5 round 1 after the skeptics (`rounds/round-1/insights.md`): bar 4 fails on 2
  severity 3 (covered panel's speech, fixed after freeze; a Results pick binding another run); bar 9
  fails 4 of 3 (Or group, Condition.../Or..., By position box, header Tab order); bar 1 fails on
  T75 A only (one session, several causes); bars 3 and 8 fail; 6 and 7 not measured.
- (2026-11-03) T73 as worded cannot measure the editor: it asks for a colored set and a count, the
  key wants a rule. Reword the task (no control words) or change the key before T73 runs again.
- (2026-11-03) Check the task words against the key's success line before calling a bar failure:
  a P that the words never asked to avoid is a study defect.
- (2026-11-03) Follow-up questions must not invite a wish ("would you rather...?"): same-model
  participants all say yes.
- (2026-11-03) Fixtures that pre-color in the task's color manufacture "drowned color" findings.
- (2026-11-03) "Each finding counts once, in the smaller allowance": a keyboard-named element that
  is also a bar 7 item counts in bar 9. Apply it when scoring, not after.
- (2026-11-03) Code "least sure" answers from the grade's quote, not a summary: two of four value
  picker citations were miscoded (r1-s18, r1-s06).
- (2026-11-03) Bar 8's T70 overage is mostly outside the editor (Fill box, layer name box, hiding
  a ramp layer, filter-first order). Decompose cost before blaming the editor.
- (2026-11-03) Score per half, not pooled; tool fixes before round 2 scoring (`endstate.mjs`
  hidden layers, `score.mjs` layouts, P in the graders' form).
- (2026-11-03) A severity 3 from one session on a route the key does not use survives only with a
  repro; say so beside it.
- (2026-11-03) Check the briefing against the setup before a round (T73 A's missing saved project).
- (2026-11-03) Check decided.md before scoring a defect; colliding decided rules need a ruling.

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

- 2026-11-03 -- Applied round 1 skeptics (`rounds/round-1/insights.md`). Kept at 3: covered-panel
  speech, the Results pick binding another run. To 2: "Is exactly" (empty step only), Clear then
  Escape. Bar 9: value picker weakened out (one drop), Except to 1, header Tab order moved in from
  bar 7 by the counts-once rule -> 4 of 3, fails. T73 reclassified as not measured (wording vs
  key). Reason: the rule (two drops drop, one weakens) plus the criteria's counts-once line, which
  scoring had missed. Evidence: viewed `repro/r1-s13/06.png`, `sessions/r1-s08/05.png`,
  `sessions/r1-s04/17.png`; criteria.md lines 66 and 78-81.
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

- 2026-11-03 (tier 5 close) -- Did not work: a 1-round cap with fix-and-confirm bars; the round
  could only find. Worked: two independent skeptics cut study defects (T73 key, leading
  follow-up, pre-colored fixtures) before they reached the build's fix list.
- 2026-11-03 (round 1 insights) -- Worked: a verdict table per item before writing, then the
  drop/weaken rule mechanically; grepping criteria for the allowance and counts-once text. Did not
  work: scoring's "least sure" coding from summaries (miscited sessions found by both skeptics).
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

- 2026-11-03 -- Skeptics this round cut more from the study than from the build: the T73 key, a
  leading follow-up, a fixture ramp. A pre-round check of words vs key vs fixture would have saved
  four sessions' worth of findings.
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
