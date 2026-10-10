# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-10 -- Tier 2 round 2 is CLOSED (`rounds/round-2/insights.md`, `decisions.md`). 55 of 55
  valid sessions passed, but participants read `tasks.md`, so passes are weak and the three new
  routes (T20 weight meaning at load, T21 Replace in "...", T22 rule hint) are NOT credited.
- 2026-10-10 -- Round 3 does not start until the three study-tool changes pass a planted failure:
  (1) session folders outside the studio tree, `--start` refuses otherwise, a transcript check
  voids any read of a facilitator file; (2) the dry run starts from two throwaway pilots per task on
  the candidate build, every walked fault fixed before freeze, two-match clicks refused; (3) every
  script a bar names exists (bar 10's clipped-text and raw-string counts in `bars.mjs`).
- 2026-10-10 -- Round 3 re-run list (criteria.md "Round plan"): r2-s05; the T20, T21, T22 routes;
  the T17/T18 follow-ups for the second-time measure. Compare T22/T24 with round 2 on grade and
  count only (prompts changed to "point out on the drawing").
- 2026-10-10 -- Watch in round 3, by change: T22 -- does the example line after "No match" plus
  Enter-runs-the-rule get 3+ of 8 past the dead end (else "Select where..." comes next); does the
  rule-named layer ("minutes >= `10`") read in the key. T21 -- does anyone see the repeat-count line
  and use Replace from the Add page. Styling a selection -- does the highlight-look start draw a
  visible mark after clearing. T18 -- paths cost at or under 8 with the new aliases; weighted run
  row shows the total. T23 -- does "Filter to neighbors" as a plain command stop the hide-or-delete
  doubt. Bar 9 (b) -- words at rest back at or under round 1 on all four screens.
- 2026-10-10 -- Still open, not fixed by the app: drawn names cover each other (element label
  placement, owner), bare numbers in rules and edge width units (breaking, owner). Do not score
  their recurrence as a new finding; cite them as known.
- 2026-10-10 -- Answer key matched to 26f3bb968e43 (`rounds/r3d2/`) for T12R, T18, T20, T21,
  T22 A; still on 897d9aed9ffe's notes: T4, T17, T19, T22 B, T23, T24. Traps: T18 A's Ivan-Kofi
  tie runs through Jada; after a tie is picked "/" no longer types into the find box; T12R's
  keyboard route from the title is 4 Tabs.
- 2026-10-09 -- Dana's persona intro says "Facilitator notes", so `real.mjs --brief` refused her
  briefings. Confirm it is fixed before round 3 or every Dana session fails to start.
- 2026-10-09 -- Run `tmp/researcher/t2r3/avoided-in-briefings.py <dir>` on every round's
  briefings (avoided words plus "stand out", "show").
- 2026-10-09 -- A leak voids passes, not problems: a problem found anyway is robust.
- 2026-10-09 -- Prompt words make findings ("stand out", "who was first before", "make sure both
  will still be there"); check every candidate insight against the prompt first.
- 2026-10-09 -- Hold opinion-only problems one level down at SCORING time, not at the verdicts.
- 2026-10-09 -- Grep the tool for each check a bar names before trusting a preflight's "built".
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

- 2026-10-10 (researcher, tier 2 round 2 closed) -- Read `insights.md` and `decisions.md`.
  Taught: the dry run worked where it walked (about 30 build faults of 355 problems, none above
  sev 2, none decided a grade), but the walk list is always one round behind -- 12 of the 30 faults
  sat on styling a selection, which nobody walked; and the study's own leak hurt more than the
  build. Decided (director): study tool first (leak, pilot-seeded dry run, every named script
  real, each sev 4), then one change per confirmed problem in its owning package: find box hint
  plus Enter (T22), element repeat-edge count plus Replace on the Add page (T21), three keyboard
  focus faults, selection styles start at the element's `highlightStyle()`, rule-named layers,
  words at rest cut, compact-mantine 24 px checkbox target, path aliases, weighted path totals,
  "Filter to neighbors" as a command, repeated status announced. Held: label placement, bare
  numbers, edge width units (owner); "Select where..." unless 3+ of 8 still stall; neighbor
  distance grouping (needs the element fact). My part done: T22/T24 prompts reworded, re-run list
  in criteria.md. Nothing new for the owner from me.

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

- 2026-10-07 to 10-09 (tier 2 preparation through round 2 verdicts, folded) -- Worked: one
  scratch python of asserted (old, new) pairs matching the file's own line breaks; one dump of all
  grades read once; screenshot mtimes against follow-ups (found the leak); `session.json` build
  stamps before claiming a build was walked; a full 20-half pilot per frozen build (caught a broken
  key path); viewing every screenshot I cite; grepping the persona FILE, not the roster, to settle
  a split; long scripts (`bars.mjs`, detours, `--prove` x5) in the background while writing. Did
  not work: trusting preflight's "built"; reading prompt-made or persona-scripted behavior as user
  need or as a screen failure; anchors from memory; a walk's FAIL taken as a defect without
  checking the walk; a setup edited after one half's pilot; a dry run's fixes left in its report.

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
