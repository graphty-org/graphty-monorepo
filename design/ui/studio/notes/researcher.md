# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-05 (older entries folded; full text in git history).

## Top of mind

- (2026-11-05) Tier 6 round 1 is closed and the studio is stopped on one owner decision: raise the Gemini
  cap (3,000 of 3,000 spent; 4,000 covers about 680 requests, near $3.40) or drop sessions. The "145 left"
  in `owner-decisions.md` is stale. It holds sessions and model walks, not the fixes or the 400% repro.
- (2026-11-05) No reader has seen the Assistant: 24 of 24 VOID at `--start`. `insights.md` is the record,
  12 findings, all expert: what is on screen, never what a reader paid. Bars 1 to 7 and 11 nothing to
  count, 8 fails narrower, 10 did not hold on the state list only, 9 and 12 open. Not a verdict.
- (2026-11-05) Before a session counts: 26 walks, key matched, T92 A's plant checked, `leaksIn` fixed, a
  launch that checks `--gate`. I proposed fix first, then freeze: no walk exists, so nothing is lost.
- (2026-11-05) Every first prompt says "a RETURNING user" (24 of 24 sessions, 9 wrongly). A priming
  source: must go before any session counts. One grader saw it once; grep all logs, not one.
- (2026-11-05) A `False done: no` on a session that never opened is not a pass. Same for "no leak".
- (2026-11-05) Expert clean results cover only the screens that expert read: the audit's 0 of 88 missed
  "assistant node style", and whether that is element English or a layer's name is still a reading.
- (2026-11-05) One open 3: the Settings page gets 0 height in a short, narrow window (`frame.css`, every
  section, by estimate under about 330 CSS px tall). CSS arithmetic, not measured: `repro/` next, no
  Gemini needed. Talk came down to 2, Done stays 2: same test, the belief corrects itself.
- (2026-11-05) Scope moves on about three mechanisms: undo reselect (kept by `decided.md`), Esc clearing,
  the x lost on close. A chip click is the reader's act. The removal of 1 of 16 needed a walker's sequence.
- (2026-11-05) Three rulings open, the Director's, none a one-way door: does the kept "selection surviving
  Undo" cover a rollback; does the x entry reach closing the panel; does a painting run get a Colored row.
- (2026-11-05) Questions only sessions can answer: does a reader press Done on a typed key (T90, bar 3);
  does a line without a chip read as prose; does the small text decide anything (T90, T92).
- (2026-11-05) A chip that counts something else (T92 A's 5 or 9, T91 A's 15) is a true count, so not
  bar 11, but no backing: a right fact with only that row is F. Bar 5 may come up "not tested": T95 A's
  first reply was a plain refusal on 2 of 4 walks.
- (2026-11-05) The main risk is false passes: a bar counted over sessions where its trap never fired,
  a recovery the prompt supplied, a report right after a reflex.
- (2026-11-05) Ask the doubt question after the first answer, never in the prompt. A live model is a
  second participant: the key states what the reader must conclude, never the model's words.
- (2026-10-30) A severity 3 needs a reader who drew a wrong conclusion and left it standing. Graders
  over-rate on one half; expert counts are not user evidence; an expert-only 3 needs a repro.
- (2026-10-30) First check of any pilot finding: the build in its walk's session.json. Then check tool
  lines against images: simulated participants believe a tool line over the screenshot.

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

- **2026-11-05 (tier 6 round 1 closed):** Read `insights.md` as the round's last word and changed no
  bar or ruling. Carried forward only what a next round needs: the cap decision, the list before a session
  counts, the one open 3, the three rulings, the questions left for readers. Reason: the study stops on
  spending, not on the design, so the notes must not read as a result.

- **2026-11-05 (tier 6 round 1 insights, skeptics applied):** Two drops = dropped, one = weakened, as
  before. 0 of 9 problems dropped; 3 kept, 5 weakened, the 8-finding keyboard row split. Talk to 2, 400%
  stays 3 with the owner corrected to `frame.css`. Moved bar 11 to nothing to count: its words say "in
  every session", and `decided.md` says a selection is no graph change. Bar 10 now rests on the state
  list, not "assistant node style". Settled two disputes at source: `k1` route shows the x from step 50,
  so the model made the selection (skeptic 2 right, skeptic 1's step 84 was a later press); `07.png` is
  the Delete step. Found one thing neither saw: `k1/74.png` is a second walk with a selection and no
  line, so "one turn in one walk" was wrong. Left `decided.md` and `scores.md` alone: rulings are the
  Director's. Reason: a claim stands only on a screen or a trace. Viewed 29, 26, 37, 38, 07, 08, 17,
  `k1/74`, `k1/99`, `k1/100`, `k5/05`.

- **2026-11-05 (tier 6 round 1 scoring, no session ran):** Scored all 12 bars as frozen, in three kinds
  (nothing to count, fails on expert evidence, open) so "none holds" cannot read as a design failure.
  Ruled the 24 `False done: no` lines no pass. Scored bar 9 as open, not as held: 0 confirmed means
  nothing tested when both routes (participants, `repro/`) are empty. Used the wider confirmed rule
  (expert plus audit) for the problem list and said bar 9's is narrower. Failed bars 10 and 11 against
  the audit's clean line, after viewing `figma/w1/42.png`, `engineer/setup-1200x900/29.png`,
  `a11y/k1/99.png`. Held Done-drops-a-key at 2: the screen stays honest and retyping recovers, as the
  dry run ruled; kept Talk and 400% open at 3. Kept the x-forgotten removal at 2: the reply and line
  said 1 from the selection. Proposed, did not apply: restart with no re-run spent, and fix before
  freezing; both the Director's. Left `owner-decisions.md` alone: the cap item is already there.
  Checked: 24 grades, `--gate` (13 FAIL lines), count file 3,000 bytes, 108 = 20 + 21 + 29 + 38,
  `words.test.ts` 36 of 36, 42 participant logs for the prompt.

- **2026-11-05 (tier 6 round 1 plan):** Took the roster's table as written, in its order, T90 first:
  12 sessions fill the cap with one per half, so there was nothing to trade. Left the frozen pieces
  alone and put what still blocks the round in the plan's "Open before the first session". Did not write
  the gate's evidence by hand or walk the halves: the section exists so a round cannot start unwalked,
  and walking is the pilot's job. Checked: 12 briefings on 3b2a7f0649 with the right start, none holding
  a follow-up; every follow-up word for word and every row against `tasks.md` and `roster.md`; gate
  run, exit 1; `git log 48879618c4..3b2a7f0649` shows 125 commits over the app code.

- **2026-11-05 (key matched to 8fa33aa786, 3549e11129, 48879618c4, folded):** Split each mismatch three
  ways: a door the key got wrong is rewritten, a defect giving another number gets a grading line, a
  session a defect decides gets `Build decided: yes`. Ruled a chip counting something else no backing
  but a true count; a bare id a right answer; a right fact with only prose behind it F. Graded on the
  report, never the scope line. `tasks.md` untouched: no prompt was wrong.

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
- **2026-10-30 (tier 4 round 1, folded):** Recorded as findings, not a verdict: bars 2 and 3 were partly
  study artifacts (key definition, the tool's `tooltip: null`, hover counting); 5, 6, 7 and the join
  preview were the product's. All four 3 candidates fell to 2 or below under the skeptics.
- **2026-10-30 (tier 4 round 1 scoring, folded):** Scored by hand from grade.md lines plus `steps.mjs`
  and `endstate.mjs`; four severity 3s proposed, each a confirmed defect with a 3 from a grader or expert.
  The frozen rules stay frozen.

- **2026-10-29 to 10-30 (tier 4 plan and criteria review, folded):** 28 sessions exactly as roster.md;
  T65 B's key facts reworded so `--brief` stops refusing. Proposed eight criteria changes, applied none
  (the Director freezes); most were adopted.

- **2026-10-21 (tier 3, folded):** Two skeptics per insight (two drops = dropped, one = weakened);
  disputed claims settled at their source; scored by hand where `score.mjs` was wrong and said so;
  stopped tier 3 at round 1 (remaining failures came from the grading rule and unreached backlog).
- **2026-10-02 to 10-20 (tiers 1 and 2, folded):** Real app only; criteria frozen before a round;
  every task walked first; task words never echo the screen; VOIDs re-run as `<id>b`; change the
  prompt, not the key, when a prompt leads.

## Tried: worked / did not work

- 2026-11-05 (round closed) -- Worked: the skeptics' source checks: they moved a bar (11), corrected an
  owner (`frame.css`) and a cause (starters). Did not work: a launch with no gate check, which spent a
  whole round's agents to learn nothing about readers.

- 2026-11-05 (round 1 insights) -- Worked: a scan of one control's presence across every route step, which
  settled where a selection came from in one script; viewing a screenshot cited for another reason, which
  turned up a second sighting. Did not work: taking either skeptic's origin story from a single step.

- 2026-11-05 (round 1 scoring) -- Worked: running `--gate` myself instead of trusting the grades; one
  script over all 42 participant logs, which turned one grader's note into 24 of 24; reading routes and
  source behind each expert 3 before rating it; checking one expert's clean line against another's
  screens. Did not work: my first draft's sums ("seven other rows", "five focus findings") until I
  counted them against the reports; a route log as proof of absence (it holds names, not prose).

- 2026-11-05 (round 1 plan) -- Worked: running `--gate` as well as `--brief`: `--brief` alone passes
  while every `--start` would be refused; one script checking sessions against plan, tasks and roster.
  Did not work: a grep for follow-up words alone proves little; the script's exact match does.

- 2026-11-05 (key matches, folded) -- Worked: the `\s+`-joined asserted edit script; viewing the screen
  rather than the pilot's line; `route.jsonl` for what the scope line read at a step; `facts.py`
  recomputing closeness and betweenness. Did not work: a key line naming a walk count I had not counted;
  reading only the pilot's summary.

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

- 2026-10-17 to 10-21 (key edits, folded) -- Worked: one asserted edit script per pass with
  `\s+`-joined old strings; prettier on the edited file (`--ignore-path /dev/null --check`);
  checking a pilot's claim against session.log and one screenshot; grepping the key for stale
  phrases and old build ids after edits; `git merge-base --is-ancestor` for change-log claims;
  `grep buildStamp` over session.json per half. Did not work: trusting pilot step totals or "the
  key already records" lines; copying files into tmp/ to preview prettier; `--no-ignore`.

## Thinking

- 2026-11-05 -- A study's budget is part of its validity: a cap reached in preparation leaves findings
  with no reader behind them. Count walks and pilots against the cap before freezing the round's size.

- 2026-11-05 -- A bar worded "in every session" cannot fail on an audit with no sessions: expert evidence
  can break the design and leave the bar uncounted. Say which of the two a finding is.
- 2026-11-05 -- A bundled row ("eight findings") passes as one confirmed problem while its evidence is
  uneven. Split before scoring.
- 2026-11-05 -- A check placed at the last moment protects the data, not the budget: `--start` kept the
  round honest and still let 24 sessions and 24 graders spend themselves. Check at launch as well.
- 2026-11-05 -- A round that ran nothing tempts two false readings: "none holds, so it is broken" and
  "no false done, so that one is fine". State the denominator first.

- 2026-11-05 -- A bar's denominator should be the sessions where the thing could go wrong, not the
  sessions that ran. A trap that never fires counts as a pass under "at most 1 of 4".
- 2026-11-05 -- Reflex approval comes from repetition (research: catch rate falls after 50+ prompts).
  A single card seen by an attentive simulated reader cannot show it; say so rather than score it.

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
- 2026-10-30 (round 1 scoring, folded) -- Worked: running the scripts first; parsing grade tables with an
  assert on the row count. Did not work: a multi-line `old` string in an asserted replace.
- 2026-10-30 (plan) -- Worked: diffing roster.md and tasks.md since the plan commit before
  regenerating; briefing all 28 and tallying `REAL_DIST` and `setup:` lines.
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

- Tier 6 round 1: `tier6/rounds/round-1/scores.md`, `plan.md`, `expert/`; scripts in the worktree's
  `tmp/tier6-r1-score/`.
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
