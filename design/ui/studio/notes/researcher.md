# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- 2026-10-11 -- Round 4 scored (`tier2/rounds/round-4/scores.md`): 53 of 53 valid S/SD, 3 void
  (r4-s05, s20, s28) NOT re-run; bar 1 and bar 6 now hold (T24 7 of 7). Fails: 5 (unfiltered data
  table, conservative reading), 9 (b) (edge inspector 29 vs 27), 10 (5 confirmed sev 3). Bars
  7a and 8 hold on my after-the-fact bars.mjs run (`tmp/researcher/t2r4/bars/`).
- 2026-10-11 -- OWED before round 5: r4-s05b, r4-s20b, r4-s28b; and a runner fix. Mechanism: the
  runner started participants with no free slot; `--start` outlasted the shell limit, went to the
  background, the participant armed a monitor and ended its turn, which is a workflow agent's
  return. Logs: `wf_893310e3-28b/agent-a1b284d02fae1037a.jsonl`, `agent-a1bedbc37d9933b28.jsonl`.
- 2026-10-11 -- The gate did not pass and sessions ran anyway, two rounds running: no "Gate
  evidence" in plan.md, no `round-4/bars/`. I ran bars.mjs after the fact into
  `tmp/researcher/t2r4/bars/`. The runner must refuse to start without gate exit 0.
- 2026-10-11 -- T24: 7 of 7 by Shift-click from habit; Select endpoints 0 of 7; prompt-decided 0.
  T17: toolbar Filters 7 of 7, wrong turns 0. Habit-matching doors get used; menu commands do not.
- 2026-10-11 -- New confirmed sev 3s: data table ignores a filter (r4-s21, s27); "or more" layer
  named "data.minutes >= `5`" (visual 1, a11y 5); "or more" row under the fold (audit 1, visual 5);
  bare non-value number offers "=`10`" then refuses it (controls 2, visual 27).
- 2026-10-11 -- One-specialist sev 3s to script first: off step turns itself on when its editor
  closes (a11y 1, `Filters.tsx`); New project > Discard crash (controls 1); one-session sev 3:
  rule on a missing column says only "Nothing matches" (r4-s12).
- 2026-10-11 -- Segmented chosen face: 0 misreads of 4 on T4. Close the predicted sev 3.
- 2026-10-11 -- T22 steps median 8 vs 6 (route choice: table, Style); "=" typed unprompted 0 of 24
  over three rounds. Rule language is copied, never learned.
- 2026-10-11 -- Bar 5 read conservatively: a reader's own check counts, so the study cannot pass
  on "not on the key's path". Skeptics may weaken; record their reasons.
- 2026-10-11 -- Drawn-name overlaps that cost T24 clicks are label-over-tie and label-over-dot;
  declutter (label-on-label only) would not remove them. Element owner item stands.
- 2026-10-11 -- A check that inspects zero items must fail; leak check now reads 1 log per session.

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

- 2026-10-11 (researcher, tier 2 round 4 scored) -- `round-4/scores.md` from 53 graded sessions,
  3 voids, four expert reports, and my own bars.mjs run on 5277e2cbe (the gate's run never
  happened). Voids scored beside, not as failures; bar 1 checked worst case (all owed re-runs
  fail: still holds). Bar 5 scored FAILS on two participants' own table check under a filter,
  with the strict "key's path" reading (holds) given beside it, because a technicality must not
  pass the study. Bar 10 confirmed list: 4 two-specialist sev 3s plus the two-session table one,
  flagged as needing a specialist under bar 10's own rule. Ease and steps kept round 3's readings so
  rounds compare; T12R path 4 on this build. Mechanism of the voids traced in the participants'
  own logs before writing it, rather than repeating the graders' "agent ended".

- 2026-10-11 (researcher, round 4 plan) -- Sizes from the frozen rule: bar 1 says full size is
  8 for every task, so T24 (below its bar) runs at 8, not round 3's 4; core four 32; tasks a change
  touched at 4 (T22, T23, T4), T12R at its full 2: 54, and the last 2 to T19 (untouched, but the
  task list asks for every task). Every persona on the other half from round 3 (asserted against
  `round-3/sessions.json`). Starts are setups (tasks.md rules out saved projects). Walked T24's
  key routes on 5277e2cbe myself (scripted, not a participant) and named the Shift route in the
  key with a criteria log entry. Recorded the missing T24 prompt pilots as NOT MET in the plan,
  with the mitigation (T24 first, "prompt-decided" flag, reported with and without), rather than
  letting the gate fail, because a gate failure ends the tier and lands the branch.

- 2026-10-11 (researcher, round 3 closed) -- Read insights.md and decisions.md. Adopted: study
  fixed first (gate, T24 prompt/key) because round 3 skipped its pilots and a zero-read leak check
  said "no leaks"; one variant per problem so round 4 can credit each fix; one-specialist claims
  scripted before fixing. Not changed: label placement (element, owner list), rule syntax
  (breaking), Replace, weight at load, Recent, find-box example. Top of mind rewritten.

- 2026-10-11 (key matches to 5277e2cbe and 38e180aac230, drawn-names finding, folded) -- Build
  section plus in-place notes, old wording kept as "on earlier builds"; the screen wins over a
  build's change note (pixels sampled before contradicting it); T17 people count only in Overview
  for an edge step; drawn-names sev 3 in round 3 was measured with declutter off (setups tick "Show
  all labels"), so tick it only where a task reads every name; dots as label obstacles would be an
  additive element option.
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

- 2026-10-11 (round 4 scoring, after a token-limit stop) -- Worked: `git status` and a listing
  first (no scores.md, sessions untracked, so nothing half-done); `score.py` asserting voids have no
  session.json or screenshots and every leaks.json read exactly one log; grepping each grade's
  "## Measures" into one scratch file and reading it once; finding void participants' logs by
  grepping agent logs in the round's time window for the session path. Did not work: matching
  participant logs by their first lines (the harness prefix hides the session path).

- 2026-10-11 (round 4 plan, after a token-limit stop) -- Worked: `git status`, the round
  listing and `real.mjs` gateCheck read first; no round-4 folder existed, so nothing was half-done.
  Worked: reading what the runner does after a failed gate (it reports and lands) before choosing
  how to treat a missing gate item. Worked: `--gate` run before the plan returned, to see it
  finds all 20 pilots and lacks only the bars. Worked: briefing all 56 rows in scratch
  (`t2r4/brief-all.py`; only kept-on-purpose words hit).

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
