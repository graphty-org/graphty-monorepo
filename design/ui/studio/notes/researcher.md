# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-08 -- DRY RUN DONE on the study build 3dfe7daf9e45 (`tier2/rounds/r1d1/pilot/`, every
  half but T21 A): every success path landed first try, no script, console or request errors, every
  reference value held. So participants should NOT hit implementation faults on the success paths.
  What they WILL meet are UX defects the pilots named (below) -- those are study findings to watch,
  not blockers. The key now matches this build (criteria change log, same date).
- 2026-10-08 -- Real defects the dry run found, worth fixing between rounds, not mid-round: Path
  Method select blank after a run (T18, T20); Escape in the Weight list closes the whole Path
  popover and clears From/To (T18 A); an off filter step edited and saved stays off with no sign
  (T17); a green check on a table with a left-out row (T4); stray space "read ;" (T4 B, node table
  only); "Add note N" tooltip covers the note just saved (T19); accepted rule and its "press Enter"
  hint stay in the find box (T22); "Filter to neighbors" looks like plain text (T23, T12R); Hops 2
  in discovery order on B; "Total distance" with no unit (T20 B); legend says "route" while
  everything else says "path".
- 2026-10-08 -- Tool defect: `real.mjs` setups leave the pointer where the last click landed, so
  the first screen can show a hover the participant never made (T23 A, Sana row). The setup should
  move the pointer off the page as it clears focus. The key tells graders to ignore it.
- 2026-10-08 -- Watch items for graders on this build: T4's left-out row is now visible in the Data
  page list ("1 row left out"), so its `false-done` trap is weaker; T17's Filters row carries no
  count and no "off"; T20's "Capacity" choice is ungraded by rule (graded by end state); T20's
  helper "such as a longer trail" may echo prompt B; T22 B's example 16 sits near the task's 10;
  layout overlaps in the friends and Florentine drawings hide dots and labels.
- 2026-10-08 -- ROUND 1 PLAN: `tier2/rounds/round-1/plan.md`, 56 sessions, roster's allocation
  (checked by `sessions.py`). T21 last of the core four, T19 after T4 (save-and-reopen waits on
  `--prove`). No saved-project starts. Grades record first move, doors, follow-up cost, T20 route,
  T21 moved nodes, T22 rule use, open-work diff.
- 2026-10-08 -- CRITERIA REVIEW (before freeze): 8 changes proposed to the director (bar 10 for the
  expert audit; "not scored" fails a round; bar 7 runs every algorithm and meaning; preflight 2 not
  met). Detail in the decision entry below.
- 2026-10-08 -- Two tool faults to rule out before blaming a participant: a 3000 ms click timeout
  with no screen change (cause untraced), and a printed tooltip left from the previous hover
  (fixed in the study build's tool; still trust screenshots over printed tooltips).
- 2026-10-08 -- Tier 2 has 11 bars (frozen): bar 2 earlier work kept, bar 7 weight read as
  loaded, bar 10 expert audit, bar 11 core-four cost. Nine tasks plus T12R; no keyboard-only,
  screen-reader or touch sessions (owner).
- 2026-10-07 -- The biggest validity threat in tier 2 is the briefing: a returning user is a fresh
  agent told a history. A history names only tier 1 places, never a tier 2 control; graders record
  when a first move came straight from it.
- 2026-10-07 -- Tier 1 report: bars 1-6 and 9 hold in round 3; 7 fails on missing data, 8 on one
  contrast color. A sev 4 needs a wrong conclusion a reader would act on.
- 2026-10-07 -- Do not override a grader without new evidence; one skeptic's weakening stands
  unless the other answers its reason with evidence. Every focus change needs a "where does focus
  go instead" check.
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

- 2026-10-08 (researcher, key matched to the dry-run pilots on 3dfe7daf9e45) -- Edited
  `tier2/answers.md` from 19 pilot reports, logged in `criteria.md`, one note in `tasks.md` T20;
  no bar, no prompt. Choices: (1) a header section for this build stating the cross-task changes
  once (blue bands, From/To, focus moves on) instead of repeating them per task. (2) Out-of-date
  watch notes deleted, not kept, when the screen no longer shows them (T19's three; T18's orange
  path nodes): a stale watch note primes graders to see a problem. (3) T20 S: Made with has no
  Weight select now, so pointing to the Path popover's "(farther, loaded)" box before the run
  also counts -- it states the loaded meaning on screen; this widens where evidence may be found,
  not what is required. (4) "Capacity" left ungraded by rule (graded by the end state) because no
  pilot walked it; inventing an outcome would be guessing. (5) T12R's find-box list of ties graded
  SD, the same as tier 1's "neighbors read from the ties". (6) T17's layout overlaps recorded as
  the cause of a short dot count without changing the grade. (7) Defects that are not
  key-relevant (stray space, Bellman Ford spelling, duplicate a11y names) stay in the pilot
  reports and these notes, not in the key. Rejected: changing prompt B of T20 for the "longer
  trail" echo -- the line appears only after the choice, so it cannot lead to it; recorded as a
  possible echo instead.

- 2026-10-08 (researcher, key matched to round 1 pilots) -- Edited `tier2/answers.md` (and one
  description line of T12R in `tasks.md`) from 20 pilot reports on 16dcf3494700; no bar, no
  prompt. Choices: (1) a header section names the round 1 build, the pilot folder, that `final/`
  walks started unranked, and that screenshot numbers follow step grouping -- one rule instead of
  re-citing every number. (2) T4's "Sources row says 1 row left out" rewritten: the row is on the
  Data page and its text is cut before the count, so only the inspector shows it; a key claiming
  a visible count would let graders mark a participant who missed it as careless. (3) The Made
  with Weight select counts as pointing to Made with (T20): it is inside that section and states
  the loaded meaning. (4) PageRank's missing count after a reopen is explicitly not `work-lost`:
  run, colors, key and values return. (5) T23's off-canvas note deleted, not kept: the screens
  show the drawing on the canvas, and a stale watch note primes graders. (6) T24 B point moved to
  753,258 and the "find lists ties by name" route replaced by what exists (ties by value). (7)
  T12R gets its own section in the tier 2 key rather than an edit to tier 1's key, which tier 1
  rounds still grade with. Rejected: re-numbering every `final/` citation to round 1 screens (the
  values agree; numbers drift with grouping).

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

- 2026-10-08 (key vs dry-run pilots) -- Worked: one python replace per entry with an assert on
  each anchor, then a grep for `rounds/r1/pilot` to find citations still pointing at the old
  build; checking `git diff` after an "edited on disk" notice confirmed only my edits were there.
  Did not walk: T20's "Capacity", T18 A's Ben-to-Nora chain, T21 A on this build -- the key says
  so.

- 2026-10-08 (round 1 plan) -- Worked: one script (`tier2/rounds/round-1/sessions.py`) holding the
  run order, asserting it against the roster's per-half sets, and printing both the plan's table
  and the session JSON, so the two cannot drift. Checked every persona file path exists before
  listing it. Not done here: preflight items (prove, open-work lister, bars.mjs, bar 7 script);
  the plan states them as gates, not as met.

- 2026-10-08 (key vs round 1 pilots) -- Worked: one edit script with an exact-count assert per
  anchor and an ASCII assert on the result (`tmp/researcher/r1-pilot-key/edit.py`); checking each
  pilot's setup line against `roster.md` showed every `final/` walk started unranked, which
  explains T24 B's dead click point. Did not check: T18 A's Weight list and Ben-to-Nora chain (no
  pilot opened or walked them) -- the key says so.

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
