# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-10 -- Answer key matched to 26f3bb968e43 (round 3's current build, `rounds/r3d2/`)
  for T12R A/B, T18 A/B, T20 A/B, T21 A/B, T22 A. Still on 897d9aed9ffe's notes: T4, T17, T19,
  T22 B, T23, T24 (pilot folders exist in `r3d2/`, no findings handed over yet). Grading traps that
  moved: T18 A's Ivan-Kofi tie runs through Jada (record anyone naming her); after a tie is picked
  the find box loses focus, so "/" no longer types into it (T12R); T12R's keyboard route from the
  title is 4 Tabs, not tier 1's 1.
- 2026-10-09 -- T22 and T24 now say "point out on the drawing", not "stand out" (and not "show", a
  View menu word); T22's "see where" became "how ... lie across" ("where" is avoided). Key
  unchanged: T22 credits a selection or a color, T24 only the two ends selected. Compare with
  round 2 on grade and count only.
- 2026-10-09 -- STILL OWED before round 3 freezes: two throwaway pilots per reworded half (T22 A/B,
  T24 A/B) on the round 3 candidate build, which does not exist yet. Round 3's plan.md must carry
  the re-run list in criteria.md "Round plan" (r2-s05 again; T20, T21, T22 routes; T17/T18
  follow-ups with the leak closed).
- 2026-10-09 -- Dana's persona file says "Facilitator notes" in its intro paragraph, so
  `real.mjs --brief` REFUSES every Dana briefing. Fix the persona file (or the tool's
  team-only filter) before round 3, or every Dana session fails to start.
- 2026-10-09 -- Briefing check: `tmp/researcher/t2r3/avoided-in-briefings.py <dir>` reads each
  `<dir>/<T22A>/briefing.md` prompt against that task's avoided words plus "stand out" and "show";
  it caught a planted "stand out" and "where". Run it on every round's briefings.
- 2026-10-09 -- Answer to "did we dry run?": yes; about 30 implementation faults of 355 problems,
  none above sev 2; 12 on the unwalked detour (styling a selection). The bigger fault was the
  study's: participants read `tasks.md`, so round 2's route credits (T20, T21, T22) are unproven.
- 2026-10-09 -- Prompt words make findings: "stand out" invited a style; "who was first before"
  makes the before/after need; "make sure both will still be there" makes the saved-state need.
  Never read a prompt-made behavior as user need; check every insight against the prompt first.
- 2026-10-09 -- A leak voids passes, not problems. Score with that asymmetry.
- 2026-10-09 -- Hold opinion-only problems one level down at SCORING time.
- 2026-10-09 -- Apply one rule the same way everywhere (T18 vs T22 find box).
- 2026-10-09 -- Run `tool/bars.mjs` on every frozen build in PREFLIGHT; grep the tool for each
  check a bar names before trusting "built".
- 2026-10-09 -- Voids must be re-run by the runner, not by hope (r2-s05, r1-s04).
- 2026-10-09 -- Click by name lands on same-named controls; confirm misclick-started faults by script.
- 2026-10-09 -- Histories steer first moves; the SECOND place looked is the real signal.
- 2026-10-06 -- All participants are one model: failure strong, pass weak.

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

- 2026-10-10 (researcher, 26f3bb968e43 key) -- Same shape as before: a build section listing only
  what changed, each stale claim fixed in its task entry with the old build's screen kept as a
  parenthetical. Added a missed overlap (Jada on T18 A's main chain) as a grader instruction, not a
  defect claim, after viewing `r3d2/pilot/T18A/10.png` myself. Kept tier 1's frozen key untouched
  and recorded T12R's 4-Tab count in tier 2's entry instead. Wrote "an earlier note said" where a
  pilot contradicted the key but no older screenshot was re-checked (T18 B, T20 To lists). No
  prompt, bar or step count changed; `tasks.md` untouched.

- 2026-10-10 (researcher, b6d932823642 and 897d9aed9ffe keys, folded) -- A build section plus
  in-place fixes, old wording as a parenthetical, because graders read the task entry. Bar 11 step
  counts never moved. Took a pilot claim on its measurement, not its echo of the key; checked the
  T18 arrow fix against friends.csv. The T19 A missing toast recorded as untraced.

- 2026-10-09 (researcher, round 3 prompts and re-runs) -- Reworded the second half of T22 and
  T24 to "point out on the drawing" (T24: "point out Gus and Ivan, and nobody else, on the
  drawing"). Reasons: "stand out" asked for a style that neither task measures (5 of 8 T22, 4 of
  4 T24 styled in round 2); "point out" asks for a visible mark with no word for how; "show" is the
  View menu's own word, so not used. The briefing check also found "where" (an avoided word, the
  find list's "Select where ...") in T22's unchanged first sentence since round 1; reworded it to
  "how the slow links lie across the whole map" because the acceptance asks for no avoided word in
  the briefing. Kept T24's key as written (two ends selected only), although the decision text
  said "a selection or a style, as now": T22's key accepts a color, T24's never did; changing it
  would change a grade rule, so it is reported, not done. Put the re-run list in criteria.md
  "Round plan" because round 3 has no plan.md yet. Pilots not run: the round 3 candidate build is
  not built (HEAD holds only the decision), and piloting on the round 2 build would measure the
  wrong screens.

- 2026-10-09 (researcher, tier 2 round 2 critique, folded) -- Five smallest changes, one per
  confirmed sev 3, each reusing what exists (find box `exampleRule`/`ruleFromText`, the element's
  `number-needs-backticks` suggestion as a neutral fact; a "+" line's starting value is the app's
  choice). Rejected: element bare-number parsing (unsure = breaking), label placement (element),
  moving the path tool (find box led 8 of 8 to a right answer).
- 2026-10-09 (researcher, round 2 skeptic verdicts) -- Wrote `rounds/round-2/insights.md`.
  Applied: both drop = dropped (insight 6, routes carried habits); one drop or weaken = weakened
  (T24 halo, the "All 13 rows" caption, insights 1 to 5) unless the other answered with evidence.
  Resolved the skeptic's T18-vs-T22 consistency question: T18 find box stays sev 2 (the rule counts
  a place offering no way on; T18's led all 8 to a right answer, 2 by hand), T22's is sev 3 ("No
  match" only). Rated the "Open project or file..." doubling sev 3, not 4: both who met it caught
  the 82. Checked myself: `r2-s14/15.png` (width 8 red ties barely visible), `r2-s33/05.png` ("Add
  to friends", 82 edges, only Cancel/Load), `r2-s52/02.png` ("Stadium" label over the tie), r2-s12
  "chapters 10" on the Les Mis half (answers half of skeptic 1's priming objection to insight 2).
  Rejected: reopening bar statuses (no skeptic changed one); calling the discarded filter step an
  app user problem (both cases started by the tool's misclick).

- 2026-10-09 (round 1 critique, round 2 key, plan and scoring, folded) -- Round 2: 56 sessions
  at the cap, core four and T22 at full size with halves swapped; route credits graded like the
  success path with bar 11 kept on old counts; scored with asserted scripts (`tmp/researcher/t2r2/`),
  the 13 early follow-ups kept but every pass called weak; bar 10 failed on drawn names and
  backticks. Round 1 critique: smallest change per sev 3, reusing a working route (find hint,
  Replace in "...", meaning at the column).

- 2026-10-09 (researcher, round 1 closed) -- Read `rounds/round-1/insights.md` and
  `decisions.md`. Taught: a dry run removes faults only where it walks; the commonest detours and
  the tool itself must be walked too, else sessions spend time on build and tool faults instead of
  on what returning users need. Decided (director): measurement first (tool, scripts, detour dry
  run, all sev 4), then 11 app/element changes, one door per confirmed problem, no feature moves,
  words at rest do not rise; "Select where" waits unless the hint fails for 3+ in one place;
  drawn-name overlap filed against the element. Nothing new for the owner.

- 2026-10-09 (key matched to builds 8f0d5a6f7791 and four before, folded) -- Each time a build
  section plus scoped edits; delete notes for screens no longer drawn (they prime graders);
  re-point citations a newer pilot overwrote; read the build's own change list first.

- 2026-10-09 (researcher, tier 2 round 1 skeptic verdicts) -- Wrote `rounds/round-1/insights.md`.
  Applied: two weakens = weakened; one drop + one weaken = weakened; a split resolved by checking
  the evidence myself. Checked: Tom's persona file does script the exit (skeptic 2 read only the
  roster briefing) -- so bar 3 holds; `r1-s45/26.png` shows width 30 thick after deselect --
  "thick only while selected" refuted; T18 B pilot screenshots exist with no report; no "..."
  drawn at rest or after a left click (`r1-s29/08.png`). Kept the defects but not the habits in
  T20; demoted fill tint / selection mark to one sev 2 design finding. Rejected: calling the
  popover a build defect from one session at load 158 without a script.

- 2026-10-09 (researcher, tier 2 round 1 scoring, folded) -- One asserted row per session
  (`tmp/researcher/t2r1/score.py`); steps = screenshots after the start; success-path steps from the
  key's commands; bar 3 strict (2+ participants confirm, severity = worst outcome) with the lenient
  reading beside it; "not scored" bars do not hold, per the frozen rule.

- 2026-10-08 (round 1 plan and key vs dry runs, folded) -- No saved-project starts (frozen
  tasks.md wins); key edits by asserted (old, new) pairs; checked cited screenshots myself.

- 2026-10-07 to 10-08 (tier 2 preparation, criteria review, round 1 plan and round 3 skeptics,
  folded) -- Wrote `tier2/` (T22 bus >= 10 min = 3, Les Mis >= 10 = 13; T23 Ava 14, Medici 11;
  T24 Gus-Ivan 1, Station-Stadium 4), each piloted and hand-counted; bars 10 and 11 added, "not
  scored" fails, bar 7 (a) over every algorithm and meaning; 56 sessions with halves alternating;
  key sentences name the build they are true on. Split skeptic rule: one weakening stands unless
  the other answers its reason with evidence. Rejected: raising ease to 5.5, changing prompts.

- 2026-10-02 to 10-07 (tier 1 rounds and the owner's rules, folded) -- Real app only (owner
  2026-10-03); criteria frozen before a round; every task walked first; voids re-run with a `b`
  suffix; scored on valid sessions with voids beside; a change credited only on its route; keys
  kept from participants; task words never echo the screen; neutral facts in the element, words in
  the app; personas validate, never generate features.

## Tried: worked / did not work

- 2026-10-10 (26f3bb968e43 key, after a token-limit stop) -- Worked: `git status` and a grep of
  the key for the new build id (none), and of `r3d2/pilot/` for which folders hold screenshots,
  before editing; nothing was half-applied. Worked: one asserted (old, new) script in the
  scratchpad. Noted: `answers.md` at HEAD is not prettier-clean; the pre-commit hook formats it.
  Noted: a pilot report can be stale about its siblings (T21 B said T21 A had no screenshots; it
  had 7 by the time I looked) -- list the folders, do not trust the report.

- 2026-10-10 (round 3 and 897d9aed9ffe keys, folded) -- Worked: exact-match (old, new) scripts,
  spot-checking cited screenshots, and checking `git status` first after a token-limit stop.

- 2026-10-09 (round 3 prompts) -- Worked: writing each half's real briefing with `real.mjs
--brief <scratch dir> --task T22A --persona <name>` and checking the prompt text the participant
  gets, not `tasks.md`; it found the old "where" and Dana's refused briefing. Worked: dropping the
  "kept on purpose" words (data words like minutes, tie) from the avoided list by sentence. Did
  not work: assuming the unchanged sentences were clean because round 1 wrote them.
- 2026-10-09 (round 3 prompts) -- Another agent was mid-merge in the shared worktree; a commit
  then would have taken its whole merge. Waited for MERGE_HEAD to clear before committing.

- 2026-10-09 (round 2 verdicts) -- Worked: a verdict table per item from both skeptics, then
  grepping transcripts for the one sentence that settles a split (r2-s12 "chapters 10", r2-s33 "82
  is double"); viewing the three screenshots I cite before citing them. Did not work: my scoring
  listing prompt-made behavior (styling after "stand out", writing down "who was first before") as
  user need -- check each candidate insight against the prompt's own words first.

- 2026-10-09 (round 2 scoring) -- Worked: one Measures dump of all grades (103 KB, two reads);
  timestamp check of follow-ups against screenshot mtimes (found the leak no grader tallied);
  `ls` for `briefing.md` in every folder (none); running `bars.mjs` in the background while
  scoring (about 25 minutes); looking at `r2-s14/15.png` and `r2-s07/06.png` before classing.
  Did not work: trusting preflight's "built" for bar 10 -- grep the tool for the check first.

- 2026-10-09 (round 2 plan) -- Worked: checking the detour walks' `session.json` build stamps
  before claiming the frozen build was walked (they read 5ac7ca8f7058, a working-tree build).
  Worked: running `pilot/detours.sh all` (LANES=2) and `real.mjs --prove` x5 in the background
  while writing the plan; about 40 minutes. Worked: `sessions.py` copied from round 1 with extra
  asserts (sizes, the half swap, no Ruth on T19). Did not work: trusting a walk's FAIL as a
  defect -- T20-D1's expectation was out of date; fixed the walk's order of checks.

- 2026-10-09 -- Full pilot of all 20 halves on each new frozen build before a round: WORKED again
  (8f0d5a6f7791). It caught a key path that a build fix silently broke (T12R ArrowDown) -- exactly
  the failure a round would otherwise spend sessions finding. Keep it per build, not per round.

- 2026-10-09 (key matches, folded) -- Worked: one scratch python of (section, old, new) edits,
  each asserted, then an ASCII grep; reading the build's change-log entry first. Did not work: a
  dry run's fixes left in its own report and not in `answers.md`, so the next pilot re-found them.

- 2026-10-09 (round 2 key, folded) -- Worked: (old, new) pairs scoped per task with asserts;
  viewing disputed screenshots; `work.json` before calling an entry gone; checking a build exists
  before "measured on it". Did not work: anchors from memory; pilots with no steps log.

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

- 2026-09-28 to 10-07 (earlier rounds, folded) -- Worked: one row per session with an assert;
  grader JSON plus `grade.md` greps; repro scripts; two skeptics reading the tool's code; the
  4-slot browser gate; rehearsal by participant actions. Did not work: launching every agent at
  once; editing a script while it runs; a harness that exits 0 printing nothing; mocks.

## Thinking

- 2026-10-09 -- A leaked facilitator file biases one way: it can only make routes look easier. So
  a leak does not void problems, it voids passes. Score with that asymmetry instead of voiding all.

- 2026-10-09 -- Participants choose the route nobody walked, and they style what they select:
  seed every dry run with the last round's detours AND with "make it last" (style a selection,
  rename it, clear it). A triage call of "works as designed" needs a reader's view, not a unit's.
- 2026-10-09 -- Isolation is a run property, not a tool property: the tool had `--brief`, the
  runner never called it. Every protection must be enforced where the session starts.

- 2026-10-09 -- Histories steer first moves; the SECOND place looked is the real signal. The
  unseeded layout makes overlap instances non-deterministic; report the class. Experts find how a
  reached screen behaves; sessions find whether a user reaches it.

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
