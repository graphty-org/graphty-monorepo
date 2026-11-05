# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-11-05 (older entries folded; full text in git history).

## Top of mind

- (2026-11-05) Tier 6 key matches build 3549e11129 for T90 B, T91 A, T92 A, T93 B and T95 A; no bar or
  prompt changed. The other halves and T94 were not in that batch: check them before the round.
- (2026-11-05) T92 A's chip row can read 5 or 9 under a right 7 of 12. True counts, so not bar 11, but
  no backing: a right fact with only that row is F, `Build decided: yes`. Expect it to move bar 1.
- (2026-11-05) Bar 5 may come up "not tested": T95 A's first reply was a plain refusal on 2 of 4
  walks, and T92's replies were often right. T92 A's scope plant holds and is the surest qualifier.
- (2026-11-05) The tool's key swap makes Google with the OpenAI key work, which real Google would
  refuse. That session shows no failure: graded as seen, reported as a tool artifact.
- (2026-11-05) A grade a known defect decides carries `Build decided: yes`, as the model's does.
- (2026-11-05) The main risk is false passes: a bar counted over sessions where its trap never fired,
  a recovery the prompt supplied, a report right after a reflex.
- (2026-11-05) Ask the doubt question after the first answer, never in the prompt. Grade trust on the
  first report.
- (2026-11-05) A live model is a second participant: the key states what the reader must conclude,
  never the model's words; `Model decided: yes` where it made a task impossible.
- (2026-11-05) A prompt's openness sets the bill: prompts ask for concrete things.
- (2026-10-30) A severity 3 needs a reader who drew a wrong conclusion and left it standing.
- (2026-10-30) First check of any pilot finding: the build in its walk's session.json. Then check tool
  lines against images: simulated participants believe a tool line over the screenshot.
- (2026-10-30) One round cannot both find and confirm fixes; plan the cap so a fix walk fits.
- (2026-10-21) Graders over-rate on one half: count a 3 only with its behavioral cost. Expert counts
  are not user evidence; an expert-only 3 needs a repro under `repro/`.
- (2026-10-21) Avoidance is not comprehension; a trap nobody springs proves nothing.
- (2026-10-21) Leading risk: the key describes most problems graders cite, and every participant is
  one model. Read tasks and key for leading before spending sessions.
- (2026-10-20) Pilot "mismatches" are often the key right and decided.md wrong-way: the key counts the
  screen and names the contradiction; never rewrite the key toward decided.md.

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

- **2026-11-05 (key matched to build 3549e11129):** Ruled T92 A's row of 5 or 9 no backing, the same way
  T91 A's chip of 63 was ruled: a count of something else is not "something behind" the fact. Kept 7 and
  12 as backing, since each is half of "7 of the 12". Kept all five as true counts for bar 11, which asks
  whether a count is true, not whether it matches the sentence. Graded six after the x on the report,
  not on the scope line: the reply's six is true of the people, and the bar is what the reader said.
  Left severity 3 defects out of the key unless they change a grade (the whole-file export under
  Selection 5 is off T95's path): those are the fixers'. Checked: all walks stamped 3549e1112913; 9
  cited screens viewed; `work.json` runs empty at the end of both T95 A walks.

- **2026-11-05 (tier 6 key matched to build 8fa33aa786):** Split each mismatch three ways. A door the
  key got wrong: rewritten (T90's ways out, T92's path, T95's shapes). A defect giving a different
  number: a grading line, never the key's number (T93's edge chip, T91 A's chip of 63). A session a
  defect decides: new `Build decided: yes`, since the criteria ask for numbers with and without one.
  Accepted a bare id as a right answer (s20, YMR043W, v09): it names the same node and the reply gave
  it, so failing it would grade the model's wording. Kept a right fact 2 with only prose behind it as
  F, marked build-decided: T92's success line needs something on screen behind it, and softening it
  would change the bar. Left `tasks.md` alone: no prompt was wrong. Checked: all 60 walks stamped
  8fa33aa78644; closeness and raw betweenness recomputed from the files; 12 cited screenshots viewed.

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

- 2026-11-05 (key match, 3549e11129) -- Worked: the asserted edit script, and reading `route.jsonl`
  to learn what the scope line read at a step: success/11 shows Selection 1 after the message, while
  success/10 shows Whole graph before it, so the pilot's claim held and one screen alone would have
  refuted it. Did not work: a key line naming a walk count I had not counted ("one of six").

- 2026-11-05 (key match) -- Worked: `facts.py` recomputing closeness and raw betweenness, which showed
  the app's closeness is 1 over total distance (0.02273 = 1/44) and its betweenness is unnormalized.
  Viewing cited screens before writing: 3 untrained removal gave 21 nodes, 47 edges, a number no report
  stated. Did not work: reading only the pilot's summary; the walks' reports held the replies' words.

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
- 2026-10-30 (round 1 scoring) -- Worked: running `steps.mjs` and `endstate.mjs` on the round
  first, then one script (`tmp/researcher/score-t4r1/doors.py`) for grade, wrong turns, first door
  and build per session with an assert on the build; parsing grade.md problem tables for kind and
  severity (`kinds.py`, assert > 100 rows) and checking the two that did not parse (r1-s16, r1-s19:
  another table form) against the collected grades; viewing the reference image beside a session
  screenshot before calling a bar 6 violation. Did not work: a multi-line `old` string in an
  asserted Python replace (match a fragment on one line).
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
