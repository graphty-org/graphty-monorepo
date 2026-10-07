# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-07 -- Round 3 build is b7590f8de (graphty 0.8.53). Re-pilots of T6, T7, T9, T10, T11,
  T12, T13, T15, T16 all reach their end state with no blocker. Landed and walked: Show all
  labels (a checkbox, not a switch), Size "+" opens its picker, runs named by method everywhere,
  group layouts enabled after Louvain ("Group by: Communities" preselected), Enter opens the only
  Analyze entry, no Size key row for a constant. The "not yet walked" marks in `answers.md` for
  T7, T9, T10, T11, T15 can now be cleared from these pilots (`rounds/r2/pilot/*/pilot.md`).
- 2026-10-07 -- Before launch, still owed on the served build: the screen-reader walks (none of
  the pilots ran `--sr`), the menu-to-dialog focus re-run of `repro/r2-s07`, the key-covered-layer
  repro (r2-s56), 2D Fit, the canvas name and ring, and axe plus words-at-rest baselines. Preflight
  lists each decided change as built or not built; the run rename slipped once this way.
- 2026-10-07 -- Answer-key fixes from the pilots: call the names control a "checkbox"; T7's round 3
  path keeps the Values-tab step (7 commands); T11 accept Rings and Columns by group, expect
  "helped" opinions to differ (concentric rings barely separate); Two columns refused on six groups
  is correct.
- 2026-10-07 -- Tool `ambiguous` prints are now false on labeled controls ("Show all labels",
  "Format", "Table", "PageRank"): a label and its input count as two. Graders must not count them
  as wrong turns; fix `real.mjs` to merge a label with its control before round 3, or tell graders.
- 2026-10-07 -- New risks the pilots surfaced, to watch, not pre-score: 3D perspective makes a
  smaller-ranked dot look bigger (friends: Ava drawn bigger than Farah, #1) -- a possible silent
  `meaning-wrong` on T9/T15; selection recenters the camera so nodes go under the toolbar; key card
  still hides a node (Florentine top-left, Pazzi); element English refusal reasons ("G is not
  planar", "results.louvain.group") and graph-io CSV warnings; Everything's Style shows base
  Color/Size the drawing does not show; Overview "directed 0" overflow; equal-bar histograms.
- 2026-10-07 -- Round 3 scoring: T10 success unchanged (count read) plus "every name reached"
  apart; T9 chain-link after closing the list is SD; T11 a greyed group layout after a community
  run is now a build regression, F `dead-end` build-decided; either run word still names the
  measure; record name pauses (17 in round 2). Compare ease with round 2 only (same scale).
- 2026-10-07 -- What round 3 must show to count the fixes: T10 wrong turns down from about 5,
  T9/T15 sizing named as a cost in fewer than 18 of 18, T11 ease up from 3.33. One change per
  problem was kept so each can be attributed; credit a change only on the route it changed.
- 2026-10-07 -- Pilots are walks of the success path by me, not participants: they prove the route
  exists, not that a first-time user finds it (T11's group route needs Analyze first, unprompted).
- 2026-10-07 -- Screen-reader findings stay "not shown" until the tool follows
  `aria-activedescendant`, has a reading mode, and marks pre-filled live regions unconfirmed
  (decided tool change). Bars 3 and 7 really need a real screen-reader user.
- 2026-10-07 -- Bars after round 2: 1, 2, 4, 6 hold; 3 not shown to fail (menu focus sev 3); 5
  fails on the stale key alone; 7 fails weakly on r2-s07; 8, 9 never run.
- 2026-10-07 -- Count deterministic events once per dataset (fixed seed: Pazzi, Blacheville and
  Farah/Chloe overlaps every load). Owner: the element imposes no seed; the app passes one.
- 2026-10-06 -- All participants are one model: N alike is not independent. Solid = `run.sh`
  repro or a cause in code. Failure strong, pass weak. Check the count is false, the step is on
  the path, the session valid, the evidence not the tool's.
- 2026-10-06 -- Stop rule: if round 3 does not move the core four over round 2, go to real users.

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

- 2026-10-07 (researcher, round 2 close) -- Took from round 2's decisions: twelve changes, one per
  problem, in the owning package (compact-mantine menu focus; element key, 2D Fit, group options,
  canvas name; app announcements, Size picker, run names, Show all labels; tool SR mode; key).
  Agreed with the Director's departures: the key already reads the live stack (the element's
  `coveredBy()` found the cover but said it only in English), so the fix is leaving the covered
  block out; grouping needs no new element call (`optionsFor` fills "partition" values). Held:
  Force spring cloud (trace first), 4x print, key placement/fit inset (new element API, owner).
  Lesson: my "missing effective-layer fact" was half right -- the fact existed, the English
  sentence hid it. Read the element before calling a fact missing.
- 2026-10-07 (researcher, re-pilot review) -- Accepted the nine re-pilots as proof the round 3
  routes exist on b7590f8de; not as evidence the fixes work for users. Did not add the
  perspective-size risk to any bar ahead of sessions: it is one pilot's observation on one
  dataset; graders note `meaning-wrong` if it happens.

- 2026-10-07 (researcher, round 3 answer key) -- Wrote round 3 entries beside the round 2 ones
  for T7, T9, T10, T11, T15 and the run-name notes, each with round 2 and round 3 scoring side by
  side; no bar and no prompt changed. Reasons: a stale key grades a pass as a failure; keeping the
  round 2 entries lets an unlanded change be graded fairly. Choices: (1) either run word still
  names the measure -- "influence" describes PageRank correctly whether printed or not, and
  failing it would grade the participant on the build's vocabulary; (2) T9's chain-link route
  becomes SD on round 3 when it follows closing the list or picking "Fixed size" (a detour then a
  correction, the standing SD rule), so the grade moves with the design, reported both ways;
  (3) T10 keeps S for "hidden count read and explained" so the bar is not raised mid-study, and
  "every name reached" is recorded apart to credit the switch; (4) T15 step 4 needs names drawn,
  not every name, so the switch is not required there. Wording: no prompt says "show all labels"
  or "picker"; T9 "show" and T3/T14 "all" can only lure; T10 B's `label` was already an echo
  covered by the per-dataset rule. Rejected: rewording T10 (would stamp a pass on a gap); walking
  the routes now (the build does not have them; a walk of the old build proves nothing).

- 2026-10-07 (researcher, round 3 critique) -- Proposed seven fixes for round 3 and held the
  rest (see Top of mind). Reasons: each fixes a reproduced defect on the core path or a bar, and
  each is one place. The names switch is app-only because the element already exposes the
  declutter option; the app only writes element config (allowed). Challenged in the insights:
  T10 rewording (keep the goal), T11 inflation (the prompt exposes the defect), the stale key as a
  key bug (it is a missing "effective layer" fact). Held: Force spring cloud (cause untraced; a
  blind fix risks a second bug), 4x print (sev 3 but no task failed), sizing chain beyond a
  visible word on the bind control (one change per problem, so round 3 can attribute ease).
  Rejected: changing the layout seed to move the key off Pazzi and Blacheville (owner decision;
  moves the overlap, does not fix it).
- 2026-10-07 (researcher, round 2 skeptic note) -- Superseded in part: "do not ask for what the
  build cannot do" now reads "do not reword a real goal to fit the build; grade the gap".

- 2026-10-07 (researcher, round 2 skeptic verdicts) -- Applied two skeptics' verdicts
  (`rounds/round-2/insights.md`). Dropped (both): the Analyze/attribute filter "announces no
  option" (tool cannot read `aria-activedescendant`; `AnalyzePopover.tsx` ~264 is built right),
  r2-s47's T6 failure as an app finding, "Overview has nothing focusable". Bar 3 sev 4 lowered to
  a confirmed sev 3: one participant gave up, his give-up also needs the missing browse mode, and
  the keyboard-only persona exported by Control+E (r2-s11). Bar 5 kept failing on the stale key
  only; the label count (true: the name is drawn, behind a dot) and the export selection ring (UI
  state, shown in the preview) moved out of bar 5 at sev 2. Stall rule worded "no decline" (scale
  reversal). T10 and T11 measures marked wording-inflated. Chevron, "New from data" refusal,
  refusal notice, silent panel switch, browser-storage warning lowered to 2; zoom-hidden-count,
  tiny names, hover, 3D perspective to 1. Alternative rejected: keeping bar 3 failing on the
  strength of sev 4 being "defensible" (Control+E stranded) -- the deciding give-up is confounded.

- 2026-10-07 (researcher, round 2 scoring) -- Counted for bar 5: the label count that treats a
  name under a dot as shown (false, not just confusing: the count says 0 hidden while a name is
  unreadable), the selection color in the exported picture (a color not on its own key), and the
  stale key (met in T16, which has no graded path; counted and flagged, bar 5 fails without it).
  Not counted: "Selection 18" beside "17 connections" (both true); the hidden count moving with
  zoom (live, not shown false). Not counted for bar 4: a new Size line at a fixed 1 (adding a line
  is not a listed commit). Sev 4 only for the menu-dialog focus: the screen-reader persona left
  there and it is reproduced twice. His T6 give-up stays sev 3 with a tool caveat (no browse mode).
  Run-name rename raised to sev 2 (17 sessions, graders' rating). Evidence: `rounds/round-2/scores.md`.
- 2026-10-07 (researcher, round 2 scoring) -- Steps-to-path computed on pointer sessions only;
  keyboard steps listed raw (no keyboard path length for most tasks).

- 2026-10-06 (researcher, round 2 plan) -- 56 sessions: core four full (T15 10, T10/T12/T9 4+4),
  every other tier 1 task at 1-3 with all-must-pass, T2 once, T16 twice; the 7 round 1 voids
  carried in; first-time personas 6 sessions each (36, 64%), mostly on the half of each core task
  they did not take in round 1; Morgan 7, Sam 3. Reason: the cap of 56 against 81 at full size;
  every task's path changed, so every task runs; the core four decide the stall rule. Logged in
  `criteria.md`. Rejected: dropping reduced tasks to fund full T5/T3 sizes (leaves six changed
  paths unseen).
- 2026-10-06 (researcher, round 2 preflight) -- Made the screen-reader mode meet preflight item 2
  myself (pointer steps refused, no screenshot path, a planted-click proof check) instead of
  blocking Morgan's 7 sessions again: a 20-line change with its own proof, and bar 7 cannot pass
  without it. Rebuilt the app because the served build predated the merge. Reworded T14 ("bring
  it back" echoed the new "Back to start"). Kept "data" in the sample preamble (same as round 1,
  comparability) with graders told to note T6 participants who go to Data straight from the word.
- 2026-10-06 (researcher, round 2 answer key) -- Round 2 paths rewritten from walks on the build
  (T7, T8, T11, T12, T13, T14); round 1 paths kept for round 1's grades. The method-name change
  never landed, so the key's "from round 2 runs are named by method" was false and is corrected.
  T11's refusal is now a greyed list item, not a line under Method.

- 2026-10-06 (round 1, folded) -- Re-score with all 43 grades moved bars 1 and 3 to failing
  (a reasoned give-up is sev 4); first runs pooled with re-runs. Process: no step cap, short
  per-step prompt, at most 4 participants, 7 = very easy. Voids (filter, stop, time limit, no
  browser) re-run with a `b` suffix. Keys: copy the screen's spellings, accept the on-screen run
  name, a tie either order. Fixes: smallest, verified, one per problem; neutral facts in the
  element, words in the app. Skeptic drops: check the count is false, not just confusing.
- 2026-10-03 (owner) -- Stop mocking; study the real app. 2026-10-06 (studio plan): a local
  production build, criteria frozen before the round, every task walked first, up to three rounds.
- 2026-10-02 (owner and studio) -- Tier the tasks, first-time users first, at least 60% of sessions
  on tier 1, every tier 1 task from the empty app; self-ratings and summaries never used for grades;
  rehearsal by participant actions only.
- 2026-09-29 (owner and studio) -- Answer keys kept from participants; task wording never reuses
  on-screen words; every label change tested on two domains; a generality gate on every change; a
  frozen core task set with a stop rule; decisions must be visible on the rendered screen.
- 2026-09-28 (owner) -- Simulated personas built from public sources, each checked by a skeptic.

## Tried: worked / did not work

- 2026-10-07 (re-pilots) -- Worked: piloting every task, not just changed ones, on the exact
  build stamp; each pilot named defects by kind (element, app, tool, key). It caught the checkbox
  wording, T7's missing Values step, and the tool's label double-match before graders met them.
  Did not cover: keyboard and SR paths (no `--sr` pilot) -- owed at preflight.

- 2026-10-07 (round 3 key) -- Worked: grepping the worktree source for each planned change
  (`runName`, the switch, `groupings()` in `layout/methods.ts`) before writing paths showed none
  had landed, so the key says "not yet walked" instead of claiming walks. Also read
  `layout/methods.ts` for the group-layout greying rule ("Needs a node attribute to group by"
  comes from `startingValues`/`unavailable`), so the T11 defect test is exact.

- 2026-10-07 (round 3 critique) -- Worked: grepping the element for an existing option before
  proposing element work (`declutter` already existed; the "hidden names" fix shrank from element
  plus app to one app switch). Looking at the cited screenshots changed one reading: r2-s56's key
  lists both color layers because both are in the stack.

- 2026-10-07 (round 2 skeptic check) -- Worked: two skeptics reading the tool's own code
  (`real.mjs` `srReport`, `watchLive`) found that the screen-reader mode, not the app, produced
  the round's headline SR failure. Lesson: before scoring any finding from a simulated access
  mode, list what the tool can and cannot perceive and check the finding against that list. Did
  not work: scoring "reproduced twice" when the second repro was a different dialog at a lower
  severity that did not cause the stop.

- 2026-10-07 (round 2 scoring) -- Worked: one row per session in `r2-score.py` (task, half,
  persona, grade, ease, steps, wrong turns, build-decided) with an assert on 56/54 rows; ease
  read by grepping transcripts for the rating line, then by hand for the two that missed
  (r2-s47, s56 in the grade). Grader JSON plus `grade.md` greps for route, activation and usage
  card covered every per-session measure without reading 316 KB of grades.

- 2026-10-06 (round 2 preflight) -- Worked: re-walking every success path with one script
  (`r2/walk.sh` via `lanes.sh`, at most 3 browsers) caught six changed paths in about 20 minutes;
  `keypaths.mjs` and `ranks.mjs` copies needed only small fixes (row opens on Style; Export rows).
  Did not work: editing `walk.sh` while lanes ran it (bash reads as it goes: three sessions left
  open, a waiter hung on their missing "### end"); `pkill` is denied, so stop a background job by
  letting it finish. A harness that reads "Top 10" from body text silently returned nothing when
  the default tab changed: check a harness prints values, not just exit 0.

- 2026-10-06 (round 1 re-score) -- Worked: one row per graded session in `r1-score.py`, printed
  as graded and with cut-offs void, plus a scan of every session's screenshot count for cap
  endings. The 14 late grades changed three conclusions (bars 1, 2, 3); a partial score must say
  which bars are undecided, as round 1's first scoring did.
- 2026-10-06 (round 1 skeptic check) -- Worked: two independent skeptics against transcripts,
  repros and source caught overcounts ("9 of 9" sizing was 3 with the empty list; a voided session
  used as a failure). Did not work: counting a cut-off session's dead end as evidence; treating
  the tool's "ambiguous" prints as accessibility defects. Still owed: `run.sh` for r1-s43b and
  r1-s09b.
- 2026-10-06 (round 1 runs) -- Did not work: launching every agent at once against 4 browser slots
  under a 40-minute limit (9 never started, 7 re-runs cut off, waits up to an hour; agents killed
  before `--end` held slots); the full think-aloud prompt (14 of 41 filter stops). Worked: the
  short per-step prompt (0 stops in 35); graders with `repro/<session>/run.sh` (15 build defects
  confirmed at one participant each).
- 2026-10-06 (preflight and pilots) -- Worked: my Playwright harness under the browser gate for
  text dumps, focus and rankings (`tmp/researcher/lib.mjs`, `ranks.mjs`, `wording-dump.mjs`,
  `wording-check.py`, `keypaths.mjs`); the re-pilots reached every task's end state with
  byte-identical drawings; T14's setup worked (check the screenshot, the log is empty on success).
  Did not work: my own file-picker stand-in (use `real.mjs` for any file open). Lesson: pilot
  every task, not just touched ones.
- 2026-10-06 (real-app study tool) -- `tool/real.mjs`: one live browser per session, numbered
  full-window screenshots, uploads and downloads, click by name, point or drawn label; never more
  than 4 browsers (`with-browser.sh`); always `--end`.
- 2026-10-02 (round 8) -- Worked: tiering, scripted rehearsal, grading from the last render (17 of
  21 self-ratings false). Did not work: pre-run sample results made T15 ambiguous; experts drew
  the hardest tasks; click-by-name picked the first of same-named controls. Tree test and first
  click measure where people look, not whether the next step works.
- 2026-10-01 (round 7) -- 23 concurrent browsers filled swap: the 4-slot gate. 18 of 61 tasks
  could not reach their end state: rehearsal by participant actions.
- 2026-09-28 to 09-30 (rounds 1-6, static mocks) -- Wording gains real but mocks hide what
  happens after a click; answer keys leaked; a failed precondition gate was ignored; summaries
  carried higher ease than transcripts. Kept: every check fails on zero items; ease from
  transcripts only.

## Thinking

- **Returning users (open).** Every simulated session is a first visit; repeat-use speed has
  never been measured. Briefed returning-user sessions are a tier 2 question.
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
  `full_at.py`, `sessions.py`).
