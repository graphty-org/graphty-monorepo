# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-11 -- Key matched on 5277e2cbe for T4 A, T12R A/B, T17 A, T18 A, T24 A/B: every value
  held, only citations and finer descriptions changed. T12R B is no longer owed.
- 2026-10-11 -- Outlined-chosen segment (T4 Add/Leave out, T12R Hops) still on 5277e2cbe on both
  T12R halves; still the likely sev 3, fix in compact-mantine.
- 2026-10-11 -- T12R neighborhood group is named by its whole content (heading + Hops + every
  name): screen-reader finding for the app; also makes `--hover` by heading match two elements.
- 2026-10-11 -- New likely sev 3 on 38e180aac230: the chosen segment is dark/outlined and the
  unchosen one keeps the gray fill (T4 Add/Leave out, "a node"/"an edge", T12R Hops). Fix in
  compact-mantine; the build note says it was restored, the pixels say otherwise.
- 2026-10-11 -- T17 on 38e180aac230: chip and Filters row count edges; people count only in the
  Overview. Expect `read-wrong` answers of 12 (B 51); suggest both counts on chip and row.
- 2026-10-11 -- Drawn-names sev 3 was measured with declutter off (setups tick "Show all
  labels"). Re-score with the app's default; only label-over-dot and layout overlap remain.
- 2026-10-10 -- Round 3 critique done (returned, not filed). Six smallest changes: element
  Shift-click on a node adds (as an edge does); T24 prompt reworded to an outcome only a selection
  gives, key's Shift route walked; bare number gets an "at least" rule option and its row wraps;
  name matches lead the Analyze list; a filter button on the canvas toolbar; study tool fixes.
  Not changed: label placement, second path, Select endpoints' place, Replace, rule syntax.
- 2026-10-10 -- Round 3 CLOSED (`tier2/rounds/round-3/insights.md`). After the verdicts the one real
  app-caused failure is Shift/Ctrl-click on a node replacing the selection (graphty-element,
  `NodeBehavior.handleClick`; edges add). Fix it in the element with a real-input test.
- 2026-10-10 -- T24 prompt now ends "so that whatever you do next applies only to those
  two" (tasks, key, criteria log done). OWED before round 4's first session: 2 prompt pilots per
  half on the frozen round 4 build graded by the key, every key route walked there, results in
  the round 4 plan. Name the Shift route in the key only after it adds on that build.
- 2026-10-10 -- Bar 10 now fails on ONE confirmed sev 3 (drawn names, owner's list); second path
  and the Add page warning are sev 2. Bar 8's axe hit is likely a false positive (combobox with
  `aria-activedescendant`); bar 9 (b) fails by one word that is a data name the counter should skip.
- 2026-10-10 -- Study tool before round 4: an empty leak check must FAIL; `--end` must not delete
  in-session notes; the bar 9 counter must leave out data names; the runner must refuse to start
  without gate evidence (round 3 skipped prompt pilots and bars).
- 2026-10-10 -- Sev 2 app work left: bare number offers only "is equal to" (row cut); filtering not
  reachable from the Graph place (5 of 8); Shortest path ranked under Betweenness; Hops 2 list
  without distances; second path unannounced.
- 2026-10-10 -- "=" typed unprompted 0 of 16 across rounds 2 and 3: the rule language is copied,
  not discovered. Readers type the prompt's most prominent data word first (column or number).
- 2026-10-10 -- Follow-up "second time" measures are memory, not the app: only the Recent entry
  (6 of 7) is creditable. Seven identical asides are one model's template, not seven people.
- 2026-10-10 -- Briefing check: `tmp/researcher/t2r3/brief-all.py <scratch dir>`; words kept on
  purpose: T20 "longer", T18 "from"/"to", T21 "updated list", T23 "change the drawing so it has
  only".
- 2026-10-10 -- A check that inspects zero items must fail: grep every "no leaks"/"0 found" for its
  denominator before trusting it (preflight "built" in round 2, `leaks.json` in round 3).
- 2026-10-09 -- A leak voids passes, not problems: a problem found anyway is robust.

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

- 2026-10-11 (researcher, key matched to the first pilots on 5277e2cbe) -- T4 A, T12R A/B, T17 A,
  T18 A, T24 A/B. No value changed, so only citations and finer descriptions: T4's first summary
  line stays after "Show the 1 unmatched row" (the key said "only"); T18's follow-up tie through
  Quinn placed by coordinates, because "Ravi to Pia" cannot be confirmed without names on, and
  a grader must not be told more than the screen says; T24 A has B's curved-line icon, the
  Stadium label covers its ring too; T12R B tie inspector has no number (so no 6-from-the-tie
  misread on B). The tmp-folder citation for T17's new counts kept beside the pilot one: the
  pilot is the committed evidence. No prompt was wrong; tasks.md unchanged; no bar changed.

- 2026-10-11 (researcher, key matched to the first r4 pilots on 38e180aac230) -- T4 A/B, T12R A,
  T17 A/B, T19 B, T20 A, T21 A, T24 B. A build section plus in-place notes, old wording kept as
  "on earlier builds". Two real changes: (1) the chosen segment is now dark with a light outline
  and the unchosen part keeps the lighter gray fill (pixels: Leave out rgb 44,44,44 vs Add 56,56,56;
  white on 897d9aed9ffe), although the build note says "chosen segment's face restored" -- the
  screen wins; the inverted cue is a likely sev 3 for T4 (Add read as chosen), fix in
  compact-mantine. (2) T17's chip and Filters row count edges for an edge-column step, so the
  people count is only in Overview "Nodes showing"; the S line now says "read where it is shown"
  (same criterion, not a bar) and reporting the tie count as people is `read-wrong`. Also the
  toolbar Filters tool as a third door (opens with an empty Attribute). T12R B not walked (no
  browser slot): owed before round 4. No prompt was wrong; tasks.md unchanged.
- 2026-10-11 (researcher, drawn-names finding) -- graphty-element already declutters labels
  (`layoutBehavior.labels.declutter`) and the app turns it on; the `*-ranked-names.txt` setups
  tick "Show all labels", which turns it off, so round 3's sev 3 "names cover each other" measured
  the setup, not the app. Round 4: re-score with declutter on; tick "Show all labels" only where a
  task needs every name, with the reason in tasks.md. What may remain is separate: declutter avoids
  label-on-label only, not a label over a dot or an edge, and nodes can overlap in the layout
  (Chloe and Farah, r3-s43/01.png). Treating dots as obstacles would be an additive element option
  (the team's call). It is not one of the owner's open items.
- 2026-10-10 (researcher, T24 wording before round 4) -- Changed the prompt, not the key: both
  halves end "so that whatever you do next applies only to those two"; words-changed log in
  `tasks.md`; criteria log entry. Removed the key's Shift route rather than leaving it: on
  26f3bb968e43 Shift-click on a node replaces, so the key named a route that fails (a grader
  would credit an attempt the app cannot finish). Pilots not run: no round 4 build is frozen yet
  (latest is tier2-r3d2-26f3bb968), and piloting the new words on the round 3 build would not
  meet the acceptance; recorded as owed in criteria.md instead of claimed. No bar changed.
- 2026-10-10 (round 3 critique and skeptic verdicts, folded) -- Six changes, each the smallest
  in its owning package: element Shift-click on a node adds (as an edge does; real-input test);
  T24 prompt reworded to an outcome; bare number gets an "at least" rule option; name matches lead
  the Analyze list; filter icon on the canvas toolbar; study tool fixes. Deferred: Hops 2
  distances, second path, PathForm focus drop. Verdicts in `rounds/round-3/insights.md`: two drops
  = dropped, one drop or weaken = weakened unless answered with evidence; every disputed claim
  checked in code at the build commit or in the grade file; "no names drawn" weakened, not dropped.

- 2026-10-10 (researcher, tier 2 round 3 scored, folded) -- `rounds/round-3/scores.md` from 56
  grades, four expert reports and my own `bars.mjs` run; leak check re-run per participant log
  (tool's copy read none); kept round 2's readings so rounds compare; steps by screenshot mtimes
  in the participant's own folder.

- 2026-10-09 to 10-10 (round 2 and round 3 plans, prompts, critiques and verdicts, folded) --
  Plans at the 56-session cap with asserted `sessions.py`; prompt pilots left "reported, not done"
  in round 3, which T24 paid for. Prompts: "point out on the drawing" (T22, T24), never "show" (a
  View menu word); briefings checked by `real.mjs --brief`. Critiques: smallest change per
  confirmed sev 3 in its owning package, reusing what exists (`exampleRule`, rule options).
  Verdicts: two drops = dropped, one drop or weaken = weakened unless answered with evidence; every
  disputed claim checked in the screenshot, the grade file or the code at the build commit.

- 2026-10-10 (researcher, keys for 26f3bb968e43, 897d9aed9ffe and b6d932823642, folded) -- Each a
  build section plus in-place fixes with the old wording as a parenthetical; a missed overlap (Jada
  on T18 A) added as a grader instruction; tier 1's frozen key untouched. T24's key was NOT
  re-walked on 26f3bb968e43, which round 3 paid for (its Shift route does not exist).

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

- 2026-10-11 (5277e2cbe key match, after a token-limit stop) -- Worked: `git status`/`git log`
  first; answers.md clean and the r4d1 pilot folders untracked, so nothing had landed. Worked:
  one asserted (old, new) python run; committing with an explicit pathspec so other agents'
  uncommitted tool edits stay out.

- 2026-10-11 (r4 key match, after a token-limit stop) -- Worked: `git status` and `git log` on
  answers.md first; nothing of this batch had landed, so it was applied whole. Worked: sampling
  the toggle pixels in `r4/pilot/T4A/07.png` against `r3d1/pilot/T4B/07.png` before writing a
  claim that contradicts the build's own change note. Worked: one asserted (old, new) script
  (`tmp/researcher/r4/edit-answers.py`); one match failed on a wrapped line and nothing was
  written until it was fixed.
- 2026-10-10 (T24 wording, after a token-limit stop) -- Worked: checked `git status`/`git log`
  and grepped for the new wording first; nothing of the change had landed, so it was applied
  whole. Worked: grepping the studio for copies of the old prompt outside `rounds/` (none; the
  tool reads prompts from `tasks.md`).
- 2026-10-10 (round 3 critique, after a token-limit stop) -- Worked: `git status`, `git log`
  and a listing of `round-3/` first; insights were committed (465f688f7), no critique file or note
  entry existed, so nothing was half-done and the critique started clean. Worked: reading each fix's
  code at the build commit and on origin/master before proposing it (`groupAlgorithms`, FindBox
  value rows from `session.find`, `Neighbor` has no depth).
- 2026-10-10 (round 3 verdicts, after a token-limit stop) -- Worked: `git status`, `git log` and a
  listing of `round-3/` first; no `insights.md` and no uncommitted edits existed, so nothing was
  half-done. Worked: checking each skeptic's code claim at the build commit (`git show
26f3bb968:<file>`) and each disputed session claim in its `grade.md` before ruling a split.
  Worked: viewing every screenshot cited to the owner.

- 2026-10-10 (round 3 scoring, after a token-limit stop) -- Worked: `git status` and a listing
  of `round-3/` first; no `scores.md` and no scoring script in `t2r3/` existed, so nothing was half-done.
  Worked: reading `leaks.json` for its counts, not its verdict -- all 56 read zero logs. Worked:
  finding the participants' logs by the folder their prompt names and feeding them to `real.mjs
--leaks <own> <log>`. Worked: reading the code before calling Shift-click a defect
  (`NodeBehavior.handleClick` vs the edge branch in `Graph.ts`). Did not work: trusting graders'
  "leaks.json shows no leaks", and the plan's gate, which nobody enforced.

- 2026-10-10 (round 3 plan and keys, after token-limit stops, folded) -- Worked: `git status`
  and listings first; briefing EVERY planned row in scratch before writing a plan (found Dana's
  refusal); asserted (old, new) edit scripts; listing pilot folders instead of trusting a pilot
  report about its siblings. Did not work: assuming the r3 dry runs were briefed pilots.

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

- 2026-10-10 -- A reworded prompt can stop one unwanted route and open another: "point out"
  ended the styling detour on T22 (5 of 8 to 1 of 8) and let T24 participants mark two people with
  a path. When a prompt changes, re-read the key's S line against the new words, and pilot it.
- 2026-10-10 -- Recent is the only place the app remembers what a user did, and the follow-ups
  used it 6 of 7. Cheap repeat work may come from memory in the UI more than from new doors.

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
  `full_at.py`, `sessions.py`); tier 2 round 3 scoring: `tmp/researcher/t2r3/` (`score.py`,
  `leaks.py`, `work.py`, `concurrency.py`, `bars/`); round 3 preflight: `tmp/researcher/r3/` (`walk.sh`, `keypaths.mjs`,
  `ranks.mjs`, `wording-dump.mjs`, `wording-check.py`, `edit-answers.py`).
