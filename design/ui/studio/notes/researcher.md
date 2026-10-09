# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-09 -- TIER 2 ROUND 1 INSIGHTS WRITTEN (`tier2/rounds/round-1/insights.md`) after two
  skeptics. Bar 3 now HOLDS (each give-up one participant; 2 of 3 were Tom's persona file's
  scripted two-attempt exit). Still failing: 1 (T22), 5 (stale key, sev 2-3), 10 (truncation,
  overlap class, stale run), 11 (T20); 2, 7, 8, 9 not scored.
- 2026-10-09 -- DRY RUN ANSWER (owner asked): yes -- 5 early sessions discarded, 4 dry runs on
  successive builds, a 5th walk on 946256efb876 (T18 B walked, report missing). Success paths
  clean (every session.log empty, 0 build-decided grades). But dry runs walk ONLY the key's
  routes; participants met defects on detours (Edges color landing on Everything, confirmed;
  selection display overriding fill/path color, now a sev 2 design finding; edge width split and
  partly refuted). Next dry run walks each task's commonest detours.
- 2026-10-09 -- The study TOOL reached participants more than the build: 5+ sessions alive (load
  158, click timeouts), wrong-row matches (r1-s44, s30), synthetic drop silent (r1-s29), void not
  re-run, T18 follow-up skipped twice, r1-s03 read facilitator notes, preflight scripts never
  built. Fix all before round 2.
- 2026-10-09 -- Confirmed sev 3 design problems after skeptics: find box answers a condition
  with only "No match" (T22, 4 of 4); Replace not visible at rest (T21, 8 of 8; hover "..." NOT
  shown); plain open ignores a weight's meaning and Back to start drops the graph (T20); drawn
  names overlap (class only; layout unseeded); filtering not reachable from Graph (T17).
- 2026-10-09 -- Weakened to sev 2: note subject follows inspector, Leave out preselected,
  left-out row after Load, backticks. T18 "connections lead nowhere" not confirmed (two places).
- 2026-10-09 -- Persona scripts can decide outcomes: read the persona FILE, not just the roster
  briefing, before calling a give-up the screen's fault (Tom: `recipe-recipient.md` 157-162).
- 2026-10-09 -- Histories steer first moves: "7 of 7 opened with Open" and "4 of 4 typed in the
  find box" are the briefings, not habits. Count the SECOND place looked as the real signal.
- 2026-10-09 -- The unseeded default layout makes overlap instances non-deterministic; report the
  class, never "once per dataset", unless the setup passes a seed.
- 2026-10-09 -- T22 failed: round 2 changes the find box's hint and refusal words first; the dialog
  only if T22 fails both halves again with 3+ looking in one place.
- 2026-10-09 -- Experts find how a reached screen behaves; sessions find whether a user reaches
  it. Bar 10's "specialist + session" rule was mine, not the criteria's -- state it as a deviation.
- 2026-10-07 -- Do not override a grader without new evidence; one skeptic's weakening stands
  unless the other answers its reason with evidence.
- 2026-10-06 -- All participants are one model: N alike is not independent. Failure strong, pass
  weak. Solid = a scripted repro or a cause in code.
- 2026-10-07 -- Real users next after tier 2 (graphty.app with opt-in usage data, 5-8 analysts, a
  real screen-reader user).

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

- 2026-10-09 (researcher, tier 2 round 1 skeptic verdicts) -- Wrote `rounds/round-1/insights.md`.
  Applied: two weakens = weakened; one drop + one weaken = weakened; a split resolved by checking
  the evidence myself. Checked: Tom's persona file does script the exit (skeptic 2 read only the
  roster briefing) -- so bar 3 holds; `r1-s45/26.png` shows width 30 thick after deselect --
  "thick only while selected" refuted; T18 B pilot screenshots exist with no report; no "..."
  drawn at rest or after a left click (`r1-s29/08.png`). Kept the defects but not the habits in
  T20; demoted fill tint / selection mark to one sev 2 design finding. Rejected: calling the
  popover a build defect from one session at load 158 without a script.

- 2026-10-09 (researcher, tier 2 round 1 scoring) -- Scored from 55 grades, the transcripts'
  ease lines and four expert reports; one row per session in `tmp/researcher/t2r1/score.py`
  (asserts 56 / 55). Choices: (1) steps = screenshots after the start, main prompt only on T17 and
  T18, because graders counted inconsistently (s36, s45 off by one). (2) Success-path steps from
  the key's commands (T18 = 4), not graders' "about 5"; T18 bar 11 fails at 4 and holds at 5 --
  stated both ways. (3) Bar 3 strict: a problem seen by 2+ participants is confirmed, and its
  severity is the worst outcome it caused (one give-up = 4); the lenient reading is written beside
  it. Reason: the others recovered only by guesses the screen did not offer. (4) Bar 2: the second
  path run replacing the first scored `not-kept` by the bar's wording (5 sessions), graders had
  only flagged it. (5) Bar 5 fails on the stale key after Replace (its value shown without its
  mark). "Components 1" under a filter left as a candidate (a note labels it). (6) Bar 10
  confirmations only by two specialists or specialist + session, since the scripted counts did
  not run; five sev 3 confirmed. (7) Bars 2, 7, 8, 9 "do not hold" for not being scored, per the
  frozen rule. Rejected: re-counting the void as a failure for T20 (holds either way, said so).

- 2026-10-08 (researcher, round 1 plan and key matched to dry runs one to four on 946256efb876,
  folded) -- Plan re-pointed with a dry-run table so readers see build faults were removed before
  sessions; no saved-project starts (frozen tasks.md wins). Key edits by one python file of
  (old, new) pairs asserted once each; stale watch notes deleted (they prime graders); citations
  moved only where the screen matches; untested choices (T20 "Capacity") graded by end state; a
  new place to read an answer is valid; T22 Escape route `not-marked`; checked cited screenshots
  myself. Rejected: retiring a screen defect as a `false-done` risk; changing T20 prompt B for the
  "longer trail" echo.

- 2026-10-08 (researcher, tier 2 criteria review, folded) -- Proposed 8 changes: bar 10 for the
  expert walkthrough and screenshot audit (two specialists or a measurement confirm; 0 sev 3+);
  "not scored" counts as not holding; bar 7 (a) over every algorithm and meaning; preflight 2 not
  met (trace Save as first; a save the tool lost voids); bar 2 by an inventory script; steps
  median <= 2x a gate on the core four; bar 9 on a "returning rest" screen; 2 spare slots to tier
  1 T15. Rejected: raising ease to 5.5; changing prompts.

- 2026-10-08 (researcher, tier 2 round 1 plan, folded) -- 56 sessions in run order, the roster's
  allocation verified by a script; T21 fourth and T19 after T4 (preflight 2); halves alternate and
  graduates mix so a one-dataset defect shows within 2 sessions; every T17/T18 "done" gets the
  follow-up; grade fields fixed in the plan; starts are setups or empty only.
- 2026-10-07 (researcher, tier 2 prepared and key corrected, folded) -- Wrote `tier2/` (tasks,
  answers, roster, criteria); kept T4, T17-T21 and added T22 (rule: bus >= 10 min = 3; Les Mis

    > = 10 chapters = 13), T23 (Ava 14; Medici 11), T24 (Gus-Ivan 1; Station-Stadium 4), each piloted
    > and checked against a hand count. Bars 2 and 7 replaced (work kept; weight read as loaded).
    > Personas: six graduates plus Alex, Jordan, Dana; no one on both halves. Key sentences name the
    > build they are true on, never an unlanded fix. Rejected: node-attribute rules for T22, "which
    > stops" in T22 (known gap graded twice), Mara (expert workflows).

- 2026-10-07 (researcher, round 3 skeptic verdicts) -- Applied two skeptics' verdicts
  (`rounds/round-3/insights.md`). Rule added for split verdicts: one skeptic's weakening stands
  unless the other gives evidence answering its reason (kept: no live text on outline/size/Find,
  two DOM alert regions; lowered: selection ring 2 since only r3-s02 exported, group-layout
  pointer 2 since T11 5 of 5, hover/ramp/wording to 1). Bar 3 holds (both: sev 3; 2.8% tie,
  outside the graded question, primed graders, T7 named Farah from Values). Bar 5 holds (graders
  ruled "none"; Chloe drawn in front of Farah). Bar 6 holds, r3-s01 SD (both dropped the F).
  Spectral moved to words. "Live regions already holding text" to not shown. Rejected: keeping
  bar 3 failing because "the picture names the wrong person" -- the picture's key names nobody.

- 2026-10-07 (round 3 plan, preflight and scoring, folded) -- Sized at 56: full size where the
  path changed or a target missed, regression checks at 4, the rest 1-3 so every task is seen.
  Fixed the study, not the app (`bars.mjs` skips clipped text, `real.mjs` label merge, `ranks.mjs`
  CSV); served a frozen build. Scored on valid sessions with voids shown beside; credited a change
  only on its route; "not tested" where no session met it.

- 2026-10-06 to 10-07 (rounds 1-2 and round 3 setup, folded) -- One change per problem in the
  owning package; read the element before calling a fact missing (the key's cover fact existed,
  hidden by an English sentence). Accept re-pilots as proof a route exists, never that a fix works.
  Keys: write the new round's entries beside the old so an unlanded change is graded fairly; a
  detour then a correction is SD; do not raise a bar mid-study; copy the screen's spellings; accept
  the on-screen run name; a tie either order. Round 2 skeptics: drop findings the tool produced
  (SR mode could not read `aria-activedescendant`); a give-up confounded by a tool gap is sev 3,
  not 4. Sizing: the core four at full size, the rest at 1-3 with all-must-pass; first-time >= 60%.
  A reasoned give-up is sev 4; voids re-run with a `b` suffix; neutral facts in the element,
  words in the app.
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

- 2026-10-09 (skeptic verdicts) -- Worked: grepping the persona FILE named in the roster (the `P/`
  path) to settle a skeptic split; viewing the two disputed screenshots myself. Did not work:
  my scoring read a persona-scripted give-up as a screen failure and took first moves the
  histories named as habits -- check persona files and briefings before calling a habit.

- 2026-10-09 (tier 2 round 1 scoring) -- Worked: dumping every grade's Measures section into one
  scratch file and reading it once (95 KB) instead of 56 opens; counting screenshots for steps and
  grepping the transcripts' "Ease" line (s24 and s55 needed a look by hand); grepping transcripts
  for door words. Worked: a whitespace-insensitive regex replace for edits (line breaks in my own
  file defeated exact anchors). Did not have: an open-work lister, first-move fields, T21 moved
  nodes -- reconstructed or reported as missing. Lesson: check `preflight.md` exists before scoring;
  its absence decided four bars.

- 2026-10-08 (key vs dry runs one to four and the round 1 plan, folded) -- Worked: one python file
  of (old, new) pairs, each asserted to match once; rewriting whole sections with a section-count
  assert; grep raw lines for anchors; grep for the old round's folder to find stale citations;
  `sessions.py` holding run order and asserting it against the roster. Never walked: T20
  "Capacity"; side routes (styling, selection) -- which is where round 1's build defects were.

- 2026-10-07 (tier 2 key correction) -- Worked: checking `git log` and `git status graphty` for
  the dependency fixes before writing "the fixed build" -- they were absent. Worked: a one-file walk
  script (`tmp/researcher/t2key/time.sh`) through `with-browser.sh` for the untested Time role.
  Did not work: python replace anchors copied from a wrapped view -- match the file's own line
  breaks (grep -n first).
- 2026-10-07 (tier 2 preparation) -- Worked: freezing a copy of `graphty/dist` (`REAL_DIST`) for
  the pilots while other agents rebuild; piloting each new task on both halves (7 sessions, about
  15 minutes) found three gaps the key now names (several-edge selection has no member list,
  Everything clears the selection, raw from/to rows). Worked: a hand count from the files
  (`rounds/tier-2/preflight/reference/hand.py`) agreeing with every screen value. Worked: grepping
  histories AND persona files for tier 2 control words: Ruth's file said "notes" and "shortest".
  Did not work: a setup edited after one half's pilot (T24A ran without "Show all labels"); pilot
  again whenever a setup changes.

- 2026-10-07 (round 3 skeptic check) -- Worked: skeptics measuring the exported picture (dot
  diameters, label offsets, crops) and checking which sessions actually reached an export; this
  caught two overcounts (selection ring, r3-s06). Did not work: my scoring treated a grader
  checklist line and a pre-announced watch item as evidence.

- 2026-10-07 (round 3 scoring) -- Worked: the graders' JSON tally plus greps of `grade.md`
  for fixed record lines ("Every name reached", "Sizing record"/"size list", "Community run made",
  "Activation", "Usage card", "Run name") and the transcripts' rating line; one row per session in
  `tmp/researcher/r3-score.py` with asserts on 56/54/53. Ease regex caught "1 of 77" as "1 of 7"
  in three transcripts: match the "7 (very easy)" line, then by hand. Did not work: trusting the
  tally's grade alone -- r3-s10's S hid a void, r3-s49 a non-voiding tool fault; read every
  grade's Void line.

- 2026-10-07 (round 3 preflight) -- Worked: re-using the round 2 scripts as r3 copies (walk,
  keypaths, ranks, wording dump and check), with a deep focus reader that enters shadow roots and
  prints the highlighted option; 14 of 14 keyboard paths and every walk in about 20 minutes on 2-4
  browsers. Worked: re-measuring the previous build with the corrected bars script, so the "never
  goes up" comparison is like for like. Worked: looking at every check screenshot (2D Fit, the
  legend, the chevron, the canvas ring) instead of trusting exit codes. Did not work: guessing Tab
  counts in a `--sr` real.mjs session (one Enter landed on "New from data..."); count focus lines
  first, or use the keypaths harness's tabTo.

- 2026-10-07 (re-pilots) -- Worked: piloting every task, not just changed ones, on the exact
  build stamp; each pilot named defects by kind (element, app, tool, key). It caught the checkbox
  wording, T7's missing Values step, and the tool's label double-match before graders met them.
  Did not cover: keyboard and SR paths (no `--sr` pilot) -- owed at preflight.

- 2026-10-07 (round 3 key and critique, folded) -- Worked: grepping the worktree source for each
  planned change before writing paths (none had landed, so the key said "not yet walked"), and
  grepping the element for an existing option before proposing element work (`declutter` existed).

- 2026-10-06 to 10-07 (rounds 1-2, folded) -- Worked: one row per session in an `rN-score.py`
  with an assert on the count; grader JSON plus `grade.md` greps; re-walking every success path by
  one script through `lanes.sh` (at most 3 browsers); the short per-step prompt (0 filter stops in
  35); graders with `repro/<session>/run.sh`; two skeptics reading the tool's own code. Did not
  work: launching every agent at once against 4 slots (9 never started, cut-offs); editing a script
  while lanes ran it; scoring a second "repro" that was a different dialog; a harness that exits 0
  while printing nothing (check it prints values). `pkill` is denied: let a job finish.
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

- **Dry runs must walk detours, and the tool must be dry-run too (2026-10-09).** The answer key's
  route is the one route participants are least likely to stray from; round 1's defects and tool
  faults sat on the routes they chose. Seed each dry run with the previous round's wrong turns.

- **Bar 1 can pass a task whose point was missed (2026-10-09).** T20's per-run route is SD by the
  key, so 7 of 7 passed while 0 did it the way the owner's rule needs. Consider reporting S-only
  rates beside S+SD for any task whose SD route skips the requirement.
- **Returning users (2026-10-07).** A simulated returning user is a fresh agent plus a history, so
  it remembers exactly what the history names: expect it faster than a real one on named places,
  no faster elsewhere. The first-move measure separates passes the briefing gave from passes the
  screen gave. Only real weekly users can show forgetting between visits.
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
  `full_at.py`, `sessions.py`); round 3 preflight: `tmp/researcher/r3/` (`walk.sh`, `keypaths.mjs`,
  `ranks.mjs`, `wording-dump.mjs`, `wording-check.py`, `edit-answers.py`).
