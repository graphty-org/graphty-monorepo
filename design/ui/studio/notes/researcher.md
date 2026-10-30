# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-21 (older entries folded; full text in git history).

## Top of mind

- (2026-10-29) Key now names ff17391bb1. On ff: T65 Select counts only what is in the picture (A 4,
  B 3: the old "5 not 4" grading line is gone); T64 Shortest path reads only "farther" weights, so
  A opens on None with "not read" (right for A; grade on Fields); re-runs recompute and paths list
  names. T68 B's gauges.csv row export (11 nodes, 0 edges) is F, the flows.csv row's is success.
  Still open: no `data.json` from `--end`; T67 not re-walked since 0ffeae2ef5 (its latest pilot
  still names that build: treat its mismatches as stale). T60 re-walked on ff: matches the key.
- (2026-10-29) Pilot subagents cannot write report.md files (the harness refuses); their returned
  findings are the record. A finding's names can steer a report the wrong way even with right
  counts: T61's Edges table marks P05 (Source) for P13's unknown end, so the key tells graders to
  note the steer rather than credit or excuse it silently.
- (2026-10-29) Pilot "mismatches" that are stale (T67A on 0ffeae2ef5, T64A on 037) or name
  decided.md wording ("Select | Hide" vs "Filter to | Filter out") are not key changes: the key
  writes the screen. Check the build each finding names before editing.
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
- (2026-10-21) A grade.md without the three header lines is silently dropped by `score.mjs`: tally
  by hand (`tmp/researcher/score-r1/tally.py`) before trusting its counts.
- (2026-10-21) `--start` run inside the participant's turn queued for a browser and died with the
  turn: 11 of 56 starts VOID. Starts run before the participant's turn.
- (2026-10-21) Avoidance is not comprehension: 0 of 10 sprang the `<<Layer>>` token trap, 6 called
  it jargon. Question 3 needs a measure that separates the two.
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

- **2026-10-29 (second ff re-pilot, T60/T61/T63/T66/T67):** Extended build lists ("037e96e9bb and
  ff17391bb1") only where the walk confirmed the note on ff. Did not add a T60 step count: T60 is
  not a bar-7 core task, and a new count would change a bar. T67A's "mismatches" came from a walk on
  0ffeae2ef5 against an older key; all were already settled in the key, so no change. Mismatches
  that cite decided.md (T60 Open button, T63 R10 Set in Data, T66 "Filter to | Filter out") stay
  out of the key: the key writes the screen.
- **2026-10-29 (key matched to ff17391bb1):** Changed only notes the r1d2 re-pilots contradicted
  or extended; earlier-build notes stay as history. T68 B's source-row export of 11 nodes / 0 edges
  graded F by the existing definition (neither the network nor the picture's 13 edges), not a bar
  change. T62's right-click written per half (A opens, B nothing) from the T62A/T62B reports.
  "Select | Hide" recorded as the screen's words, not rewritten toward decided.md.
- **2026-10-29 (key matched to 037e96e9bb):** Rewrote only notes the re-pilot contradicted, kept
  each 0ffeae2ef5 note as history beside its 037 note (graders may meet either reading in old
  reports). T64's table-weight line changed grade for B (was "the asked reading", now P): not a bar
  change, because the success definition already requires the reading set; the old line was an
  exception that rested on a default the build no longer has. Conflicting pilot reports (right-click
  on a header works in T63/T66, did nothing on T62 B's off-screen column; Shift+F10 vs ContextMenu
  key) are written as observed per route, not resolved by guess.

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

- **2026-10-21 (round 1 scoring):** Scored bars 1 to 4 by hand where `score.mjs` was wrong and
  said so in `scores.md` rather than editing the tool or a grader's file mid-scoring: the tool and
  the grades are other roles' files, and a silent fix would hide the defects from them. Kept T49
  B's F under the frozen asked-color rule (criteria change only between rounds) and gave the count
  without it beside. Counted bar 5 as failing on the two backlog items rated 3 before the round,
  and listed ten new severity 3 candidates for the skeptics instead of counting them, because the
  graders and the experts rated several of them differently (2 vs 3) and an expert-only finding
  needs a repro. Confirmed design problems only on two task halves, per the criteria, so the T47
  B-only key scroll stays "seen on one half". Ran the key-and-drawing check myself as a script
  (0 disagreements) because no one had and it feeds bar 5. Kept score.json (the tool's record)
  and explained its two wrong numbers in scores.md.

- **2026-10-21 (round 1 plan, recheck):** Kept the committed plan; re-checked the allocation and
  T49's follow-up against tasks.md and roster.md after the prompts were reworded. Rewriting would
  drop the gate evidence.
- **2026-10-21 (round 1 plan):** Generated from roster.md's table with an asserting script (56
  rows, halves equal names, no persona on both halves); core tasks first, A/B alternating; fixed
  `real.mjs --brief`'s build regex rather than criteria's first line.
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
