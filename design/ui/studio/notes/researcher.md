# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-21 (older entries folded; full text in git history).

## Top of mind

- (2026-10-30) Round 1 plan rechecked after the prompt rewording: roster unchanged, T65's
  follow-up now "done those the other way round"; plan table unchanged, all 28 rows brief on
  79ed770292. The plan script now keeps plan.md's "Gate evidence" section on a rerun.
- (2026-10-30) Brief every row before a round: tier 4's answer key listed T65 B's counts as bare
  `5` and `3`, which match every briefing's own text, so `--brief` refused all 28 sessions. A fact
  in "Facts no briefing may hold" must be a phrase no persona or README holds (now `5 gauges`,
  `3 gauges`). Round 1's plan: 28 rows from roster.md, script `tmp/researcher/plan-t4r1.py`.
- (2026-10-30) A prompt word that is a detour control's label steers into that control: T66's
  "Leave it out" echoed the issue list's "Leave out", which deletes G12 and leaves the success
  number (11). Prompt now "Take it out"; key grades on "11 of 12", not the number. Grep prompts
  against detour controls too, not only the success path; any route whose deletion yields the
  success count needs a Not-success line.
- (2026-10-30) First check of any pilot finding: the build in its walk's session.json. Of four
  findings on 79ed770292's round, only T66 A walked that build (all matched); T60 A was a53beb7179,
  T67 A 0ffeae2ef5, T66 B walked nothing. Stale walks and decided.md wording are not key changes.
- (2026-10-29) Earlier key named bccf8fe47f. On it T65's Select card chip counts the whole graph
  (A 5 of 24, B 5 of 12) while 4 / 3 are selected: a key line written ahead of a fix (42ce7201c7)
  outlived its revert (5b25463780). Before trusting a key line, check that the commit behind it is
  in the frozen build (`git merge-base --is-ancestor`). A 5 read off that chip is graded on the act.
- (2026-10-29) Pilot subagents cannot write report.md files (the harness refuses); their returned
  findings are the record. A finding's names can steer a report the wrong way even with right
  counts: T61's Edges table marks P05 (Source) for P13's unknown end, so the key tells graders to
  note the steer rather than credit or excuse it silently.
- (2026-10-29) Build defects that change a reported count get a grading line while they stand:
  T61 deliveries-first keeps the repeat (19), T61 Replace looks like a join (13 / 18). Grade the
  act, not the build's number.
- (2026-10-29) Tier 4 echoes found by grepping graphty/src strings: "Picked" is the Style card
  kind for hand-picked nodes (T65 "picked" steers to the P route); "farther apart" is the weight
  option's own text (T64 B); "Web address" is the box label (T60). Grep the app's strings for
  every prompt word, not only the avoided list.
- (2026-10-29) A task part the program already did (T63's place, auto-designated) and an export
  from an unfiltered network (T68) cannot fail: both are false-pass routes.
- (2026-10-29) decided.md's fixes R6, R7, R8 (in-project door), R11, R12 have no task route, and
  R4/R6 re-test wordings use "hide"/"show". Every fix needs a route or an "unreached" line.

- (2026-10-21) A round at its ceiling (55 of 56 succeeded) cannot meet "no severity 3" bars on
  backlog items it never reaches. Next tier: tasks that route through every open severity 3, or
  bars that count only what the round can observe.
- (2026-10-21) Graders over-rate on one half: every single-half or single-persona "3" came down to
  2 under skeptic check. Count a 3 only with its behavioral cost (blocked, misread).
- (2026-10-21) Leading risk: the answer key describes most problems graders cite, and every
  participant is one model. Read tasks and key for leading before spending sessions.
- (2026-10-20) Pilot "mismatches" are often the key right and decided.md wrong-way: the key counts
  the screen and names the contradiction; never rewrite the key toward decided.md.
- Expert counts are not user evidence; an expert-only severity 3 needs a repro under `repro/`.
- (tier 2 lessons) Step counts must match the key's counting; histories, setups, prompt words and
  the tool's own text all steer behavior -- grep all four before "unprompted".

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

- **Each task >= 80% success, each dataset half at a floor** -- the half floor stops a one-domain
  fix passing on combined counts. At 4 sessions 80% means 4 of 4; at 6, 5 of 6.
- **No confirmed severity-4 (tier 3: 3 or 4) problem.** Nielsen 0-4; confirmed = 2 participants,
  or a scripted repro for a build defect.
- **A time bar measured in steps, not minutes** (the clock holds model thinking), on pointer
  sessions of newcomers; keyboard and expert-tool personas reported apart.
- **A bar that only a route under study can meet** (T47 and, proposed, T48 `Route:` lines): a
  pass around the feature is recorded but does not hold the bar.
- **Every committed step visible on canvas and legend at once; every count from live state.**

## Decisions and reasons

- **2026-10-30 (round 1 plan recheck):** Kept plan.md as committed and regenerated only the
  session list the workflow reads, so T65's follow-up is the reworded tasks.md text. Reason:
  roster.md did not change since the plan, so a rewrite would only risk the gate evidence that
  `--gate` appended; the follow-up is read from tasks.md, which did change. Evidence: all 28
  `--brief` runs printed a briefing.md path, 28 of 28 name the frozen build, setup tally matches
  the table, no follow-up words in any briefing.

- **2026-10-30 (tier 4 round 1 plan):** 28 sessions, exactly roster.md's "Who takes which task"
  (under the cap of 30; adding two would change the bar arithmetic the criteria froze). Order:
  core tasks first (T61, T62, T65, T67), A and B alternating, then the other five, then Sam's two
  (`--keys`). Starts from roster.md's "Where each session starts" (T60 and T61 `empty`, the rest
  `setup:` files). Follow-ups for T61 and T65 come from tasks.md through the tool. Changed one
  answer-key line: T65 B's facts from bare `5`/`3` to `5 gauges`/`3 gauges`. Reason: the bare
  digits made `--brief` refuse every session (whole-word match on any "5" or "3"); the noun keeps
  the leak check on the phrase an answer would take. Evidence: all 28 rows briefed, one
  `REAL_DIST` (79ed770292) on every briefing, setup tally matches the roster table, no follow-up
  words in any briefing.

- **2026-10-30 (key checked against T60A, T66A, T66B, T67A pilots):** Only change: T66's
  build list for the Data source card behavior now names 79ed770292 (r1d3 T66A r/p1-path/05, 13:
  12 of 13 / 17 of 18; both ticked, top bar "13 of 13 nodes" with no edge count, inspector 18 of
  18). Left alone: T60A (walked on a53beb7179, already logged), T67A (0ffeae2ef5, settled), T66B
  (no walk), "Select | Hide" (screen's words). Reason: the key writes the screen of the frozen build;
  findings from other builds or none change nothing. Not key matters: T60 focus to body, F6
  order, double status announcement, raw paste error -- design defects for the fix list.

- **2026-10-30 (T66 prompt and Leave out route):** Changed T66's prompts from "Leave it out of the
  picture" to "Take it out of the picture" and added "leave out" to the avoided words; named the
  issue list's Leave out under T66 Not success. Reason: the button deletes G12 and its stretch and
  leaves 11, the success count, so the prompt's echo steered to a false pass a number-only grader
  would miss. Evidence: r1d2 pilot T66B w2-chip-leave/03-05.png. Also widened the key's build
  ranges (T61 deliveries-first 19 edges, T65 raw date number) and confirmed T60's Server dead end on
  a53beb7179. No bar or step count changed. T67A's points came from 0ffeae2ef5 and were already in
  the key.

- **2026-10-30 (key matched to a53beb7179):** Changed only the header and T65's card-count line
  (A's chip has no accessible name, so a screen-reader participant hears 4 only from the live
  message). Left T60's "no Open button" and Server dead end and T66's "Select | Hide" alone. Reason:
  each pilot mismatch was either the screen agreeing with the key or decided.md wording the build
  does not have; the key writes the screen. Evidence: r1d3 pilot T60A/T60B/T65A/T66A/T66B walks.

- **2026-10-29 (keys matched to 037e96e9bb, ff17391bb1, bccf8fe47f; folded):** Rewrote only
  notes a re-pilot contradicted; earlier-build notes kept beside the new ones; build lists extended
  only where a walk confirmed them; a count the build gets wrong (T65's chip 5 of 24 / 5 of 12)
  became a grading line, never the key's number; no step count, bar or prompt changed; mismatches
  citing decided.md wording stay out (the key writes the screen).

- **2026-10-29 (tier 4 key from pilots):** Read every pilot finding into answers.md without
  changing a bar; the key counts the screen. Removed the T66 id-card route (cannot be built: no
  negative match, Hide keeps matches) instead of keeping a success no session can reach; kept T62's
  existing P rule for time-without-kind (pilots confirmed the build does not change kind). Wrote
  grading lines for count-changing build defects (T65 selected 5) so graders do not fail a person
  for the build's number. Added the three pilot-written setups to `rounds/tier-4/setups/` since the
  key names them and they started clean. Changed no prompt: T65 B is blocked by the build, not its
  words. Reason: the gate needs a key with no placeholders, and every changed line has a pilot
  screenshot behind it. Evidence: route.jsonl step lists per walk, exported file row counts
  (A 13/18, B 12/14), work.json holding no role or kind.

- **2026-10-29 (tier 4 criteria review):** Proposed eight changes, applied none (the Director
  freezes): fill the frozen build line and the pilot-to-confirm values; grade from recorded end
  state plus an end-state script (chip counts vs element, export rows); let an expert finding be
  confirmed by a scripted repro and bar 6 by repro, not by screenshot; reword T65 "picked", T64
  "stronger/farther", T60 "web address"; map every decided fix to a route; count Sam apart and add
  one pointer A session to T62 and T65 (28); move T65 B off a people network; give T63 a place
  that is not preset and T68 a filtered start. Reason: each is a false pass or an unmeasured bar.
  Evidence: grep of graphty/src strings, roster counts, answers.md's own "leaving them is right".

- **2026-10-21 (round 1 insights):** Applied the two skeptics mechanically (two drops = dropped,
  one = weakened) and settled the only factual disagreement at its source: r1-s15's grade says she
  left the node's Style tab without a change, and r1-s35 rated the one-node layer 2, so only r1-s53
  rated it 3 (skeptic 1 was right). Checked the wheel mechanism in `OrbitInputController` (one
  event clamped to one notch, 0.75% per notch) before writing it: weakened, not dropped, since a
  notch that small may still be a defect. Viewed every screenshot cited to the owner. Reported
  bar 1's F as rule-caused, not reader failure, and left the frozen rule alone.

- **2026-10-21 (tier 3 round 1 scoring, folded):** Scored by hand where `score.mjs` was wrong
  and said so in scores.md instead of editing other roles' files mid-scoring; kept frozen rules;
  counted expert-only severity 3s as candidates until repro'd; ran the key-and-drawing check myself.

- **2026-10-21 (tier 3 round 1 plan, folded):** Generated from roster.md with an asserting
  script (56 rows); rechecked after rewording rather than rewritten (gate evidence).
- **2026-10-20 to 10-21 (pilots into the key, folded):** Kept every step count and bar where the
  walked path matched; wrote older-build facts as "(on <build> ...)" instead of deleting; a grading
  rule for a build defect leaves with the defect; the key counts the screen where decided.md
  contradicts it; no prompt was wrong on any build.
- **2026-10-17 to 10-20 (criteria reviews, folded):** Proposed, never applied (the Director
  freezes): refreeze on golden, a round 1 verdict, phrase-level echo checks, named planted cases
  per self-test, T50 B's summary reading as S with `Read from:`, a core half needs newcomers, a
  design problem confirmed only across halves. Bar 4 judged on T39 only; T49 graded by the drawing.
- **2026-10-10 to 10-11 (tier 2, folded):** Two skeptic drops = dropped, one = weakened unless
  answered with evidence; disputed claims settled at their source; VOIDs re-run as `<id>b`; change
  the prompt, not the key, when a prompt leads.
- **2026-10-02 to 10-09 (tier 1, folded):** Real app only; criteria frozen before a round; every
  task walked first; task words never echo the screen; personas validate, never generate features.

- (2026-10-21) Decision: stop tier 3 at round 1 rather than spend sessions on a ceiling. Reason:
  the remaining bar failures come from the grading rule (gold) and from backlog items no task
  reaches; more sessions cannot move either.

## Tried: worked / did not work

- 2026-10-30 (plan recheck) -- Worked: diffing roster.md and tasks.md since the plan commit before
  regenerating. Did not work at first: the plan script rewrote plan.md whole and would have dropped
  the gate evidence; it now keeps everything from "## Gate evidence" on.

- 2026-10-30 (tier 4 round 1 plan) -- Worked: generating the plan from roster.md's table with
  asserts (28 rows, n per half, no persona on both halves of a task), then briefing all 28 and
  tallying `REAL_DIST` and `setup:` lines. Did not work at first: `--brief` on r1-s01 refused for
  the answer key's bare-digit facts; no earlier pass had briefed a tier 4 row (pilots do not brief).

- 2026-10-30 (T66 Leave out) -- Worked: grepping graphty/src for the prompt's verb found it is a
  control label ("leave-out": "Leave out" in table/columns.ts and DataPage.tsx). The avoided-word
  search had covered only success-path controls; detour controls echo too.

- 2026-10-30 (key to a53b) -- Worked: reading each mismatch against the key text before editing;
  three of four "mismatches" needed no change.

- 2026-10-29 (key to bccf) -- Worked: `git log -S'4 of 14'` on the key found which commit wrote the
  stale line, and `merge-base --is-ancestor` on the revert proved the build lacks it.

- 2026-10-29 (second ff re-pilot) -- Worked: one script of exact-match replacements with asserts;
  did not work at first: I appended "Path steps: 4" to T60 and took it out (not a core task).
- 2026-10-29 (key to ff) -- Worked again: the exact-match edit script; one assert caught a header
  phrase ("On 0ffeae2ef5 and 037e96e9bb") already reworded, so no unverified build claim was added.

- 2026-10-29 (key to 037) -- Worked: one Python edit script with exact-match asserts per
  replacement (caught a wrapped-line miss before any write). Did not work: matching a sentence
  across a line wrap; match a short unique fragment instead.

- 2026-10-29 (tier 4 key from pilots) -- Worked: counting path steps from each walk's
  `route.jsonl` `steps` lists (skip hovers and inspection clicks); `wc -l` and `grep -c '<node '`
  on the pilots' downloads to confirm export counts; grepping `work.json` before trusting a
  "graded from data.json" line. Did not work: pilots' report.md files (the harness refuses
  subagent report writes), so findings arrive only as returned text and the key is the record.

- 2026-10-29 (tier 4 review) -- Worked: grepping quoted strings in graphty/src for each prompt
  word (found Picked, Farther, Web address); counting the roster per task and half against the
  criteria's plan (found Sam inside the core counts, 26 not 28). Did not work: trusting the
  tasks' "avoided words" list as the echo check -- the echoes were words it does not list.

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

- (2026-10-21) A synthetic input event is not a real one (`--wheel 3000` = one clamped notch).
  Repro gesture defects with real-sized events before they count.
- 2026-10-29 -- A pilot's "mismatch" splits three ways: the key described a door the build lacks
  (rewrite the path), the build gives a different number for the same act (grading line while the
  defect stands), or the act cannot be done (blocked; the orchestrator decides). Never fold the
  second into the first: rewriting the number would grade the defect as right.
- 2026-10-29 -- For returning users, the false pass hides in the starting state: a setup that
  already holds the answer (an auto-set role, an unfiltered export) passes whoever does nothing.
  Check every task's start for the part of the success definition it already satisfies.

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
- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: audit prompt, history,
  setup and step count first in any round where success is at 100%. A bar can hold because nobody
  visited its screen; give each fixed screen a reader route.
- 2026-10-11 -- Priming has four sources: the prompt, the history, the persona's playing rules and
  the tool's own text. A leak check over participant logs sees none of the last three.
- 2026-10-10 -- A reworded prompt can close one route and open another; re-read the key's S line
  against new words, and pilot it.
- 2026-10-09 -- A leaked facilitator file can only make routes look easier: a leak voids passes,
  not problems. Participants choose the route nobody walked: seed dry runs with last round's
  detours. Histories steer first moves; the second place looked is the real signal.
- **What can produce a false pass on the real app.** Task words that echo controls; a goal that
  states the control's meaning; graders accepting "I think it worked"; setups that pre-do part of a
  task; tests that assert element reports a person never sees; a fix judged on the easier dataset;
  a route around the feature counted as success.
- **What can produce a false fail.** Build defects that decide the task, tool limits, headless
  timing (name the mechanism, never "flaky"), and the runner (time limits, slot waits).
- **Stopping simulation.** When rounds stop moving the core tasks, go to real users (graphty.app
  with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- Tier 4: `tier4/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` (R1-R15),
  `design/data/filter-cards.md`, `design/data/data-management-requirements.md`.
- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md` (2026-10-16
  section), `bulk-edit-plan.md`, `pilot-materials/README.md`; tool: `tool/score.mjs`
  (ROUTE_TASKS), `tool/wording.mjs`, `tool/bars.mjs`; vocabulary `tmp/style-study/bars3/`.
- App words: `graphty/src/workspace/style/words.ts`, `PropertyRow.tsx`, `Groups.tsx`,
  `BindingPopover.tsx`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, `report.md`, round folders,
  `tmp/researcher/` scripts.
