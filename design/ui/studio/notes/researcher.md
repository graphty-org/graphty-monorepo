# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in.

## Top of mind

- (2026-10-17, review applied to the first-use styling study) Round 1 is now 13 tasks: T37 and T42
  out, T51 "each kind its own color" in at 2, T48 a core task at 6 (core: T39, T40, T47, T48).
  score.mjs: a task under 4 sessions does NOT hold bar 1; T47 holds only when half its successes
  carry `Route:` folder/several/one by one (grade.md line; a T47 success without it is a problem);
  bar 4 stops at every node in ONE new color, read from the new `colors` field real.mjs writes
  per screenshot (graphty-element `styles.explain(...).merged["node.color"].hex`, piloted), and a
  session that never gets there counts as Infinity. bars.mjs: new `folder-picker` walk (its
  control names are UNWALKED: `role=button:Which nodes` -- read its MISS lines at preflight 6) and
  `--record-limits` keeps the lower count. wording.mjs: ten common words removed, and a kept line's
  second line is now read (`$` under /m had ended it at the first line end). Still owed at
  preflight: what the from box does with `10,000` and `$10,000`; T51's step count and the key's
  three colors; T42 at 4 in round 2.
- (2026-10-17, first-use styling study written) Tier 3 is now FIRST USE + STYLING: 14 tasks
  T37-T50, 56 sessions, 9 first-time personas, every start `empty` (Sam `empty --keys`). The tool
  is tier-aware (folder under tier3/ -> tier 3 files; REAL_TIER in the briefing command), has a
  keyboard-only mode, dumps the whole style tree (styles-start/styles/styles-steps), and new
  scripts score.mjs, wording.mjs, tier3.test.mjs, bars.mjs --tier 3 each catch planted failures.
  Before round 1: fix the two axe serious hits and the focus-goes-nowhere defects listed in
  tier3/pilot-materials/README.md, re-record bar 8 limits on the frozen build, run Louvain twice.
- (2026-10-17) Study data traps to remember: football names have no spaces ("Florida State" finds
  nothing, "Florida" finds Florida); Les Mis nodes have only id and name (no number card until a
  run); Maren's file had a "Design hypotheses" section reaching briefings (now team-only); the
  tool README's "A session" named "style layers" and answers.md (moved out). Brief every planned
  row and read one briefing per persona before calling a first move unprompted.
- (2026-10-17, first-use styling study prep) The study tool is still wired to tier 2: real.mjs
  reads tasks, answers ("Facts no briefing may hold"), roster histories, the frozen-build line and
  setups only from `tier2/` and `rounds/tier-2/setups/`; the gate and `--start` check tier 2's
  criteria build; bars.mjs measures tier 2 screens. A tier 3 round as is would brief tier 2 prompts
  or refuse every session (the round 5 void again). Make the tier a parameter and plant-test it
  before any pilot. First-time sessions have no history, but `--brief` refuses a persona with no
  roster section: give each a Files line and a "first time" line, or teach `--brief` empty starts.
  Two copies of design-studio.js differ (main checkout and studio worktree): launch the one meant.

- (2026-10-16, bulk iteration 7 frozen) Frozen as `tier3-bulk7-457aa9f0f2`, served by servherd
  design-studio-tier3 at https://dev.ato.ms:9373/?next. Bulk field whose layers differ now draws
  BoundValue (SpreadValues deleted): strip in the pill, <<Layer>> in the component purple where the
  source name goes, detail "N layers", the same line of chits under it as one layer bound to data.
  Color sets: strip of up to 4 hard stops or a gradient for a ramp; line shows every chit up to 6,
  else 5 and "+N" (never "+1"), gray Other last and uncounted; ramp ends under the strip; the count
  is in the pill's spoken name. Study questions from this build: token misread as a column; chit
  clicks attempted; whether "+N" reads as more groups. Pilot first per the dry-run rule.

- 2026-10-13 -- **Tier 3 build paused for the owner's review after iteration 3** (served
  `tier3-i3-617b43b270`, app 0.8.68; review `tier3/iterations/3/review.md`). Built: one 28 px line
  per property, Clear that names what comes back plus announced Undo, effect and category rows as
  Figma draws them, one name per value, kind change keeps the layer, generic picking. 107 expert
  findings, 9 sev 3; iteration 4 is planned, not built. Reason to pause: owner approves the panel
  before any study runs.
- 2026-10-13 -- **Owner's three questions, as answered:** (1) unset = an empty field writes
  nothing; the minus clears and names what comes back; covering something beneath is a separate
  act ("Hide label from Key people" adds an entry set to nothing). (2) No "split parent": two row
  kinds only (layer, folder); per-group colors are entries of an ordinary binding, reused for
  College football's conference. (3) Figma grammar taken and listed; vary glyph at rest and the
  painted-over mark kept as graphty's own, with reasons.
- 2026-10-13 -- **Watch at the owner review:** names cut to "Sh..."/"Co..." (sev 3, first thing
  seen; fixed only in iteration 4); kind change dropping settings while announcing success (sev 3);
  whether a dimmed painted-over value reads as "not drawn"; whether a reader looks in the "+" menu
  to cover a lower layer. These are the studio's untested assumptions -- the owner's read is
  expert opinion, not evidence.
- 2026-10-13 -- **Watch in the study:** "unset" vs "cover" is the core risk -- write one task that
  needs each, in reader words (never "clear", "unset", "override", "layer"), and score which
  control is used first. Probe reuse of category rows on a second dataset to test question 2.
  Do not let a Figma-fluent persona stand in for the population; include non-Figma readers and
  grep histories for "Figma" before claiming transfer.
- 2026-10-13 -- Expert counts are not user evidence: 107 findings merged to ~55; severities are
  walkthrough judgments. Before reporting "fixed", rerun on the frozen build, not the dev server.
- (2026-10-11, tier 2 round 5 lessons, folded) Step counts must match the key's counting; histories, setups and prompt words steer behavior -- grep all four priming sources before "unprompted"; a tool refusal is not reader confusion; read leak-check and bars MISS lines, not only verdicts; habit-matching fixes land, written rules fail.

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

- **2026-10-17 (review of the tier 3 materials):** Where reviewers differed I applied the
  Director's call: T37's slots to T48, not T42; T50 keeps its project file and question 5 is
  reported per half (A's names give the rule away) rather than re-making the file with a new
  column. T51 took T42's slots as the user advocate asked, so number cards on people are not in
  round 1 at all; the red team's "no unjudged task" rule forces T42 into round 2 at 4. The
  Director added Grace to T48 A, but the user advocate's Tom swap gave Grace T48 B, so Ruth took
  the A slot (no persona on both halves). T41 A says "finished the training", not "trained": the
  column is `trained`. T48 says "the way they did", not "goes back": "Back" is on the run's screen.
  T48's counts (15, 12) are not in "Facts no briefing may hold": a bare number matches unrelated
  persona text.
- **2026-10-17 (first-use styling study):** Bar 4 (time to first styled graph) is judged on T39 only,
  in STEPS from 01.png (key 6, limit 12); minutes are a trend, since the clock holds model thinking.
  Tasks at fewer than 4 sessions are reported, not judged. No setups: brought files come in by the
  participant's own --upload; colleague projects (T50) are saved .graphty.json files made by a
  scripted walk. Kept Sam with a tool mode that refuses pointer steps rather than leaving him out.
  Left the other roles' uncommitted notes alone (stage only my own files); the prepare step's
  clean-branch wait needs them committed by their owners.

- **2026-10-14, round 6:** Round 6 watch items for the next build: does anyone expect the layer icon to say where a layer came from; does an empty Layer 1 read as broken; do readers find per-group settings from the group list and still use New layer for; do readers find "+" > Analyze before the toolbar.

- 2026-10-11 (tier 2 rounds 4-5: plans, scoring and verdicts, folded) -- Verdict rule: two drops =
  dropped, one = weakened unless answered with evidence; every disputed claim settled at its source
  (roster lines, the key's step line, grade files, screenshots, code at the build commit). Voided
  runs re-run as `<id>b`; the round 5 first run was void because its runner skipped the gate. Fixes
  one per problem in its owning package; habit-matching fixes landed, written rules did not.

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

- 2026-10-02 to 10-09 (tier 1, tier 2 preparation and rounds 1-2, folded) -- Real app only
  (owner 2026-10-03); criteria frozen before a round; every task walked first; voids re-run with a
  `b` suffix; scored on valid sessions with voids beside; keys kept from participants; task words
  never echo the screen; keys get a build section plus scoped edits per build; deleted notes for
  screens no longer drawn; skeptic rule: two drops = dropped, one drop or weaken = weakened unless
  answered with evidence; "not scored" fails; bars 10 and 11 added at the freeze; personas
  validate, never generate features.

- 2026-10-11 -- **T17 histories say what was done, not where.** Seven T17 histories said earlier
  rankings ran "from the analysis button in the toolbar", the same place narrowing starts, so the
  history pointed at the route. Reworded in `tier2/roster.md`; logged in `tier2/tasks.md` (T17
  words-changed) and `tier2/criteria.md`. Persona habits (counts) stay but are not scored as
  unprompted checks. No bar or key route changed. Dana's history (not given T17) still names the
  toolbar; reword it if Dana is ever given a task that starts there.

## Tried: worked / did not work

- 2026-10-17 (review applied) -- Worked: asserted (old, new) edit scripts per file in
  `tmp/style-study/researcher/`, a roster script that asserts 56 and no persona on both halves,
  the wording check after every prompt edit (it caught "trained", "Back" and the kept-line bug),
  and a 4-step pilot to confirm a new field before scoring on it. Did not work: trusting the
  wording tool's kept-line regex; my first T47 fixture (5 sessions, 1 of 2 in a half).
- 2026-10-17 -- Worked: writing the bars walk first and letting its MISS lines name each wrong
  control name (placeholders are not text: `--expect role=option:...`); briefing all 56 planned
  rows in a test, which surfaced Maren's hypotheses and the README leak. Did not work: chaining
  `eval`'d real.mjs steps in one shell call (quoting split names; a pilot typed into the empty
  app); `--expect` on a placeholder.

- 2026-10-11 (round 5 verdicts) -- Worked: settling each disputed claim at its source in one or
  two greps (roster lines for the Style histories, the key's step line, the grade's problem table)
  before applying either skeptic; viewing all six cited screenshots. Did not work: my own scores'
  candidate insights, written without grepping histories (insight 2 failed its own refutation
  test) and without checking how the key counts steps (insight 3).

- 2026-10-11 (round 5 b scoring) -- Worked: a 20-line call dump of each flagged participant log
  (`t2r5/calls.py`) settled both leak flags and the void's mechanism in minutes; reading the bars
  log's MISS lines found two dead moves round 4 never reported; viewing the screenshots behind a
  sev 3 claim (r5-s38b `04.png`, `expert/visual/replace/13.png`). Did not work: trusting grade.md
  ease lines alone (seven grades lacked one; the transcript had it).

- 2026-10-11 (round 5 re-plan) -- Worked: running `real.mjs --gate` on a SCRATCH COPY of the round
  folder (no bars there) to prove the gate reads all 20 halves from the renamed rows: its only
  problem was the missing bars, and it wrote no evidence. Cheap, no browser, no round-folder writes.

- 2026-10-11 (round 5 verdicts) -- Worked: reading the workflow journal (event types, step labels,
  each participant's result) and the script the run executes, instead of the round folder alone;
  it overturned my own scores' "cut off" and "restart skipped the gate". Did not work: inferring
  the run mechanism from the round folder and the main script's text in `scores.md`.

- 2026-10-11 (round 5 plan, key match and scoring, after token-limit stops, folded) -- Worked:
  `git status`, `git log` and round listings first; asserted (old, new) edit scripts; one asserted
  score script; matching expert findings by screen and mechanism. Did not work: trusting a pilot's
  word about its siblings; a grep matching the session id in a path; not checking the runner.

- 2026-10-11 -- Worked: diffing per-round bars.json word lists showed the edge-inspector rise is
  the rail's "Settings" label plus data names moving to "left"; scores.md had blamed scope words.
- 2026-10-11 (round 4 verdicts, after a token-limit stop) -- Worked: `git status` and a listing
  first (no insights.md, nothing half-done); grepping briefings for the skeptics' priming claims
  instead of trusting either skeptic; viewing each screenshot before citing it. Did not work: my
  scores' "Priming: none/low" lines, written from prompts alone.

- 2026-10-10 to 10-11 (rounds 3 and 4 plans, keys, scoring and verdicts, after token-limit stops,
  folded) -- Worked: `git status`, `git log` and the round listing first every time; asserted (old,
  new) edit scripts; `score.py` asserting voids and one log per leak check; reading each disputed
  code claim at the build commit and each session claim in its `grade.md`; viewing every cited
  screenshot; finding void participants' logs by grepping agent logs for the session path. Did not
  work: matching logs by first lines; trusting graders' "no leaks"; a gate nobody enforced.

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

- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: when every task passes,
  what is left to find is how the prompt, history, setup and step count shaped behavior. Audit those
  four first in any round where success is at 100%.

- 2026-10-11 -- When every task passes, the stall rule can only be met by bars, and a bar can hold
  because nobody visited its screen. Next rounds need a reader route that reaches each fixed screen
  (a prompt or follow-up that opens the table), or the fix stays specialist-only.
- 2026-10-11 -- A by-hand SD answer can carry a cost bar: score cost with and without routes that
  skip the feature under study.

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
