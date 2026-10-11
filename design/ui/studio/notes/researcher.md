# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-11 -- Round 4 critique: four app/element changes, each one place. (1) the element's
  backtick suggestion must be a rule selection accepts, not just one that parses (`=\`10\`` parses,
  then is refused); (2) "or more" row for any number inside a column's range; (3) the data table
  passes scope "visible", not "graph" (`TableDock.tsx`); (4) a path run's key drops ", full graph".
- 2026-10-11 -- Bar 9 (b) edge inspector: round 3 to 4 rose by ONE word, the rail's "Settings"
  label (word lists in `tmp/researcher/t2r{3,4}/bars/bars.json`), not scope words. Diff the word
  lists before blaming a wording.
- 2026-10-11 -- Round 4 closed (`tier2/rounds/round-4/insights.md`): 53 of 53 valid; bars 9 (b)
  and 10 fail; bar 5 holds by its words (table problem open at sev 2). Bar 10 rests on two sev 3s:
  drawn names over ties and dots (element), and the find box suggesting "=`10`" then refusing it
  (app + element), which sits on T22 A's natural route (no 10 in bus-stops minutes).
- 2026-10-11 -- STUDY FIX FIRST: every briefing carries `tool/README.md`'s data-file table, which
  states answers (Mo and Nia, `6 - w`, `s11`) and lists `--shift-click`. Replace with name + kind
  only. r4-s38 named Mo and Nia before the screen did. The leak check cannot see briefings.
- 2026-10-11 -- OWED before round 5: r4-s05b, r4-s20b, r4-s28b; runner starts a participant only
  on a free slot, and refuses to run without gate exit 0 and "Gate evidence" in plan.md.
- 2026-10-11 -- Priming lives in personas and histories too: the nonprofit analyst "checks counts",
  the student "counts the rows", 6 of 7 T17 histories name "the toolbar". Grep persona, history AND
  briefing before writing "Priming: none/low".
- 2026-10-11 -- T24 7 of 7 by Shift-click (round 3: 2 of 4). Habit-matching controls get used;
  "menu commands are never used" is NOT shown (round 3: 2 of 4 found Select endpoints).
- 2026-10-11 -- Data table ignores a filter step: sev 2, app, out of bar 10 (no specialist).
  "Or more" layer named by field path and "or more" row under the fold: both sev 2 now.
- 2026-10-11 -- Still to script before fixing: off step turns itself on (`Filters.tsx`), New
  project > Discard crash, rule on a missing column says only "Nothing matches" (r4-s12).
- 2026-10-11 -- Click-by-name refusals added a step in ~15 sessions (7 of 8 T20): step medians run
  about one high; T18 sits on bar 11's limit.
- 2026-10-11 -- Raising a severity because participants "named a risk" breaks the opinion rule
  (held one level down); and near-identical lines across sessions are one template, not N people.
- 2026-10-11 -- Drawn-name overlaps that cost clicks are label-over-tie and label-over-dot;
  declutter would not remove them. Element owner item stands.

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

- 2026-10-11 (researcher, round 4 critique) -- Proposed the smallest fix per verified problem,
  traced to source first. Find box: `ruleFromText` offers the element's `number-needs-backticks`
  suggestion; `suggestBackticks` (graphty-element `session/styles/predicate.ts`) checks only that
  the rewrite parses, and a bare literal parses, so the fix is one guard there (the rewrite must
  be a condition), every consumer gets it. The "or more" row comes only from `valueRowOf` over
  values present (`session/query.ts`); additive element change to offer it for any in-range
  number. Table: element already has scope "visible"; the app hard-codes "graph" at
  `TableDock.tsx:349`. Overlaps: element owner item stands; script first whether the label or the
  dot takes the tie click. Said NOT to change: Shift-click, Filters button, the find hint, the
  "Settings" rail label, the second-path replace (no cost shown). Reason: fix in the one shared
  place; do not reword to game a word count.
- 2026-10-11 (researcher, round 4 skeptic verdicts) -- Wrote `round-4/insights.md`. Rule: two
  drops = dropped, one drop or weaken = weakened unless the other answers with evidence. Verified
  the disputed priming claims myself before applying: the file table is in every briefing (4
  answer lines in each T21 one), r4-s38's transcript names Mo and Nia at the Replace page, the
  nonprofit persona file says "Checks counts before and after", 6 of 7 T17 briefings say "toolbar".
  Kept bar 10 failing on two sev 3s; bar 5 holds by its words; dropped the "Shortest path"
  shared name (same command). Cited only screenshots I viewed. Top five for the owner: overlaps,
  bare-number refusal, study faults, unfiltered table, Shift-click.

- 2026-10-11 (round 4 plan, scoring and key matches, folded) -- Sizes from the frozen rule (T24
  at 8, core four 32, changed tasks 4, T12R 2, last 2 to T19; personas swapped vs round 3). Missing
  T24 prompt pilots recorded NOT MET with a mitigation rather than failing the gate. Scored from 53
  grades, 3 voids beside, my own after-the-fact bars.mjs run; bar 5 scored failing on a reader's own
  check (skeptics then held it to the bar's words). Voids traced in the participants' own logs. Key
  edits per build as a build section plus in-place notes; the screen wins over a change note
  (pixels sampled first); drawn-names sev 3 measured with declutter off.

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

- 2026-10-11 -- Worked: diffing per-round bars.json word lists showed the edge-inspector rise is
  the rail's "Settings" label plus data names moving to "left"; scores.md had blamed scope words.
- 2026-10-11 (round 4 verdicts, after a token-limit stop) -- Worked: `git status` and a listing
  first (no insights.md, nothing half-done); grepping briefings for the skeptics' priming claims
  instead of trusting either skeptic; viewing each screenshot before citing it. Did not work: my
  scores' "Priming: none/low" lines, written from prompts alone.

- 2026-10-11 (round 4 plan, key matches and scoring, after token-limit stops, folded) -- Worked:
  `git status`, `git log` and the round listing first every time; asserted (old, new) scripts
  (`tmp/researcher/r4/edit-answers.py`); `score.py` asserting voids and one log per leak check;
  one grep of every grade's "## Measures"; finding void participants' logs by grepping agent logs
  in the round's window for the session path; briefing all rows in scratch; sampling pixels before
  contradicting a change note; explicit pathspec commits. Did not work: matching participant logs
  by first lines (the harness prefix hides the path).

- 2026-10-10 (T24 wording, round 3 critique, verdicts and scoring, after token-limit stops,
  folded) -- Worked: `git status`, `git log` and a listing of the round folder first, every time
  (nothing was half-done); grepping for copies of an old prompt; reading each fix's and each
  skeptic's code claim at the build commit (`git show 26f3bb968:<file>`) and each disputed
  session claim in its `grade.md`; viewing every screenshot cited to the owner; reading
  `leaks.json` for its counts, not its verdict (all 56 read zero logs); feeding participants'
  own logs to `real.mjs --leaks`. Did not work: trusting graders' "no leaks", and a plan's gate
  that nobody enforced.

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

- 2026-10-11 -- Priming has four sources, not one: the prompt, the history, the persona's playing
  rules, and the tool's own reference table in the briefing. A leak check over participant logs
  sees none of the last three. Every "unprompted" claim needs all four grepped.
- 2026-10-11 -- A sev 3 that no session met can still be the task's most likely route (bare "10"
  on bus stops). Check the task's data for whether the prompt's own number is a value.

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
