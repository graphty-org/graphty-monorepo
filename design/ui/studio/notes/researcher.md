# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-30 (older entries folded; full text in git history).

## Top of mind

- (2026-11-05) Tier 6 criteria review, 8 changes proposed, none applied (the Director freezes). The
  main risk is false passes: a bar counted over sessions where its trap never fired (bar 5), a
  recovery the prompt itself supplied (bar 4), a report that can be right after a reflex (bar 6).
- (2026-11-05) Ask the doubt question after the first answer, never in the prompt. "How far can she
  rely on it" asks for the caveat the bar measures. Grade trust on the first report; `Follow-up`
  blocks work on any task (`real.mjs` line 293, the regex needs no change).
- (2026-11-05) Tier 6 (the Assistant) is one quick user group: 6 tasks (T90 to T95), 12 sessions, 5
  personas, one round, then fixes. With one session per task half the bars count across the round;
  every bar comes from grades and expert findings, none from a script. Materials in `tier6/`.
- (2026-11-05) A live model is a second participant: replies vary between runs, so the key states
  what the reader must conclude, never the model's words. Grades carry `Model decided: yes` where
  the model made a task impossible, and a wrong reply is graded by what the reader did with it.
- (2026-11-05) A prompt's openness sets the bill: "a bolder look" cost 9 model calls and changed
  nothing, a concrete recolor cost 2. Prompts ask for concrete things.
- (2026-11-05) A failure can be real and free: the study tool swaps only Google's key, so a made-up
  OpenAI key fails for real, at no cost, with no tool change. T90 gives that key first.
- (2026-10-21) Tier 3 closed after round 1 at the 1-round safety cap without meeting the bars.
  Bar 5 fails only on the two backlog 3s (node Fill "+" one-node layer; folder chain icon, 0
  sessions reached it); bar 1 fails only on T49 B's "gold" F. Neither is new evidence about the
  reader: before another round, fix the measures, not the sessions.
- (2026-10-21) A round at its ceiling (55 of 56 succeeded) cannot meet "no severity 3" bars on
  backlog items it never reaches. Next tier: tasks that route through every open severity 3, or
  bars that count only what the round can observe.
- (2026-10-21) Graders over-rate on one half: every single-half or single-persona "3" came down to
  2 under skeptic check. Count a 3 only with its behavioral cost (blocked, misread).
- (2026-10-21) A synthetic input event is not a real one (`--wheel 3000` = one clamped notch).
  Repro gesture defects with real-sized events before they count.
- (2026-10-21) Avoidance is not comprehension: 0 of 10 sprang the `<<Layer>>` token trap, 6 called
  it jargon. Question 3 needs a measure that separates the two.
- (2026-10-21) Leading risk: the answer key describes most problems graders cite, and every
  participant is one model. Read tasks and key for leading before spending sessions.
- (2026-10-20) Pilot "mismatches" are often the key right and decided.md wrong-way: the key counts
  the screen and names the contradiction; never rewrite the key toward decided.md.
- Expert counts are not user evidence; an expert-only severity 3 needs a repro under `repro/`.
- (tier 2 lessons) Step counts must match the key's counting; histories, setups, prompt words and
  the tool's own text all steer behavior -- grep all four before "unprompted".
- (2026-10-30) The studio stopped at its 1-round cap with bars 2, 3, 5, 6 and 7 failing as frozen.
  One round cannot both find and confirm fixes: plan the cap so a fix round and a re-test round
  fit, and fix the study tool (popover-on-hover) and the bar definitions (bar 2 key, bar 3 hover
  rule) before the next tier spends sessions.
- (2026-10-30) Real design work left, most severe first: join preview mismarks rows (sev 2), choices
  come after the act with a default applied (sev 2), one fact drawn two ways (time vs kind, sev 2),
  clipped approved ratio on the joined source row (bar 6), table tab names an unrendered panel
  (bar 5, axe critical on 14 of 16 screens).
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

- **2026-11-05 (tier 6 criteria review):** Proposed changes rather than editing `criteria.md`, as in
  earlier tiers: the Director freezes. Checked before writing: every reference count recomputed from
  the files (all match); all 14 prompts and follow-ups carry none of the avoided words; two- and
  three-word overlap with the design's section 6 strings is function words only. Chose a three-way
  persona move (T95 A to Grace, T95 B to Dev, T94 B to Maren) because it puts non-doubters on the
  only task whose trap reliably fires and keeps every persona's count and the no-both-halves rule.
  Asked for returning readers on T91 A and T94 A, because someone who has never seen the layer list
  cannot miss it, so questions 1 and 3 had no possible answer. Kept T90 and T94 on people data and
  asked only that the "two domains" sentence be made true: neither task's wording depends on domain.

- **2026-11-05 (tier 6 materials):** Kept to 6 tasks by 2 halves, which is exactly the 12-session
  limit, rather than a seventh task on one half: every task then reaches two domains. Put the
  failed-message path inside T90 instead of a task of its own, because the expired key is what a
  first-time reader really meets. T93 grades reading, not obedience: a wrong remembered number
  ("about three") beside the true count, and either decision passes if the report is right, so the
  prompt never says to stop. No planted wrong count: it needs the tool to falsify a reply, so T95
  asks what the file cannot answer, which makes the model's own reading the trap. Put the message
  limit in each persona's history as money, since the product's reader does pay. Left the
  screen-reader persona to the accessibility expert, since a sixth persona would not fit.

- **2026-10-21 (round 1 insights):** Applied the two skeptics mechanically (two drops = dropped,
  one = weakened) and settled the only factual disagreement at its source: r1-s15's grade says she
  left the node's Style tab without a change, and r1-s35 rated the one-node layer 2, so only r1-s53
  rated it 3 (skeptic 1 was right). Checked the wheel mechanism in `OrbitInputController` (one
  event clamped to one notch, 0.75% per notch) before writing it: weakened, not dropped, since a
  notch that small may still be a defect. Viewed every screenshot cited to the owner. Reported
  bar 1's F as rule-caused, not reader failure, and left the frozen rule alone.
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

- 2026-11-05 (tier 6 criteria review) -- Worked: one script over tasks, roster and design
  (`tmp/tier6-criteria-review/check.py`) for avoided words, phrase overlap and the reference counts;
  it also caught the histories' send, stop, message and talk, which no earlier check read. Reading
  `work.json` in the walk of T94: run list and layers matched start and end, so `look` plus
  `work.json` covers "exactly as she made it". Asking of each bar "can it hold if the design failed?"
  found more than asking if it is measurable. Did not work: a word list for leaks: "expired" sat in
  the key string, outside every prompt-word check, so read literals too.
- (2026-10-21, folded from Top of mind) `score.mjs` bar 4 took the start page's demo as the start; a
  grade.md without the three header lines is silently dropped; `--start` inside a participant's turn
  dies with the turn; backlog.md rows carry no severity; `colorWord` returns "gold" before the hue
  band. Top tier 3 insight: Graph inspector looked at first for node color (9 sessions).

- 2026-11-05 (tier 6 materials) -- Worked: walking each kind of task on the real build before writing
  its key (about 40 model calls), which found the approval's own words and the `look` hash that
  grades T94 with no script; computing every reference value from the files; `--brief` for all 12
  rows to prove the roster, prompts and facts parse. Did not work: a setup clicking Graph right
  after Save (the Settings dialog can still be open; `--expect-not` on its text settles it) or
  plain `--click Graph` (it also matches a heading).

- (2026-10-21) Worked: two independent skeptics per insight -- every single-half 3 came down to 2,
  two build defects were restated or weakened to tool artifacts. Did not work: bars that require
  "no open severity 3" while no task reaches the backlog 3s; a frozen color rule using CSS keywords.

- 2026-10-21 (round 1 insights) -- Worked: grepping the three grades behind a disputed evidence
  claim instead of picking a skeptic; grepping source for the mechanism a skeptic named; one
  screenshot per owner insight, each viewed. Did not work: `scores.md` counting the same defect
  in three lists (bar 5, build defects, design problems) -- count each once, at its highest list.

- 2026-10-21 (round 1 scoring) -- Worked: re-tallying every grade from plan.md plus each
  grade.md's `^Grade:` line anywhere (caught r1-s06b, which `score.mjs` dropped); recomputing bar 4
  from `styles-steps.jsonl` with the sample's own starting color as the baseline; a key-and-drawing
  script over every last state (`keycheck.py`); naming palette colors with `colorWord` from
  compact-mantine's dist after checking `color-utils.ts` is unchanged since the build; reading
  styles.json selectors to report card types (`cards.py`); checking a "every B session typed a
  word" claim against the transcripts before writing it (it was false: two typed hex). Did not
  work: trusting `score.mjs`'s bar 4 median; grepping grades for measure lines (`First move`,
  `Edges looked for`) -- graders rarely write them, so those measures come from problem lists or
  transcripts; ugrep with long `{0,60}` ranges ("exceeds complexity limits").

- 2026-10-21 (round 1 plan) -- Worked: briefing all 56 rows and tallying each `^REAL_DIST=` line
  (caught the wrong build); grepping briefings for the follow-up's words. Did not work: grepping
  `--start` across briefings (README parts carry example lines).
- 2026-10-17 to 10-21 (key edits, folded) -- Worked: one asserted edit script per pass with
  `\s+`-joined old strings; prettier on the edited file (`--ignore-path /dev/null --check`);
  checking a pilot's claim against session.log and one screenshot; grepping the key for stale
  phrases and old build ids after edits; `git merge-base --is-ancestor` for change-log claims;
  `grep buildStamp` over session.json per half. Did not work: trusting pilot step totals or "the
  key already records" lines; copying files into tmp/ to preview prettier; `--no-ignore`.
- 2026-09-28 to 10-11 (tiers 1 and 2, folded) -- Worked: `git status`, `git log` and round
  listings after any stop; viewing every cited screenshot; one row per session with an assert; a
  4-slot browser gate. Did not work: launching every agent at once; editing a script while it
  runs; helper files at the scratchpad root; "Priming: none" lines written from prompts alone.

## Thinking

- 2026-11-05 -- A bar's denominator should be the sessions where the thing could go wrong, not the
  sessions that ran. A trap that never fires counts as a pass under "at most 1 of 4".
- 2026-11-05 -- Reflex approval comes from repetition (research: catch rate falls after 50+ prompts).
  A single card seen by an attentive simulated reader cannot show it; say so rather than score it.

- 2026-10-21 -- A tool that measures "change from the start" must know where the start is: the
  start page's demo, the sample's defaults and the participant's first edit are three different
  starts, and each tier-3 tool so far picked the wrong one once (T49's rule, then bar 4).
- 2026-10-21 -- When every task passes, a bar that counts success says little; the bars that
  still move are cost (steps over key), route share and confirmed problems. A design whose traps
  never fire may be avoided rather than understood.

- 2026-10-20 -- A word list cannot catch an echo made of common words: "keeps its own color"
  vs "each layer's own value" shares only stop-words. Echo checks need phrases, and the spoken
  layer, where the bulk token's meaning is written out, is where the echo lives.
- 2026-10-20 -- A change log entry is a claim about the build; check it against the commit graph
  before trusting any decision that rests on it.

- 2026-10-17 -- A prompt must state the goal, and when the goal IS the meaning a new control is
  meant to convey ("every cluster keeps its own color" vs the bulk token), the session cannot
  show whether the control conveyed it. Test the control's meaning where it is a trap, not where
  it is beside the route (T46, not T47).
- 2026-10-17 -- A wording check is only as complete as the screens it walks. Every popover on a
  success path belongs in the walk, or its words are unchecked and its focus untested.
- 2026-10-17 -- "Focus never falls to the page" is too weak for creation flows: focus on the
  wrong control (a menu, a swatch) makes typing go nowhere and passes the bar. Test that typing
  lands.
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

- Tier 6: `tier6/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md`, `decided.md`,
  `connected-*.txt` setups; tool: `tool/tier6.mjs`, README "Tier 6 sessions". Pilot walks:
  main checkout `tmp/design-studio/tier6/prep/`.
- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md` (2026-10-16
  section), `bulk-edit-plan.md`, `pilot-materials/README.md`; tool: `tool/score.mjs`
  (ROUTE_TASKS), `tool/wording.mjs`, `tool/bars.mjs`; vocabulary `tmp/style-study/bars3/`.
- App words: `graphty/src/workspace/style/words.ts`, `PropertyRow.tsx`, `Groups.tsx`,
  `BindingPopover.tsx`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, `report.md`, round folders,
  `tmp/researcher/` scripts.
- Tier 4: `tier4/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` (R1-R15, owner
  data rules, approved surfaces), `words-at-rest.md`, `owner-decisions.md`,
  `rounds/round-1/scores.md`, `design/data/filter-cards.md`; tools `tool/steps.mjs`,
  `tool/endstate.mjs`, `tool/bars.mjs`; reference images in the main checkout's
  `tmp/design-studio/tier4/reference/`.
- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `rounds/round-1/scores.md`; tool
  `tool/score.mjs`, `tool/wording.mjs`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, round folders, `tmp/researcher/`.
