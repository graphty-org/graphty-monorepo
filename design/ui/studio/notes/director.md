# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-08 (fourth dry run before tier 2 round 1 triaged).

## Top of mind

- 2026-10-08: FOURTH DRY RUN (`tier2/dry-run-r1-4.md`) on frozen build 8c4eef472: 97 items, 25
  fix, 39 left, 33 no change. Three would have shaped sessions: "Edit source..." doubling every
  tie, a tooltip hiding names being counted, one Escape discarding a whole import. Two fixes undo
  third-run fixes that made new defects (menu highlight, title underline); one is a decided
  feature never built (path Follow). Round 1 still needs a new frozen build and a re-pilot that
  finds no (a) item on a task path.
- 2026-10-08: Every dry run has found a decided-but-unbuilt item or a fix that made a new defect.
  Before freezing, list each tier 2 design decision as built or not on the build (the round 2
  lesson), and re-pilot the exact screens each fix touched.
- 2026-10-08: The open questions are unchanged after four dry runs and are NOT polish: names not
  drawn by default; nodes and labels overlap in the 3D drawing; how a stale run is marked; where
  the path form lives. Watch them in round 1; bring the owner the evidence, not a guess.
- 2026-10-08: The discarded sessions show the real T20 question: 4 of 5 opened with "Open project
  or file", found no place to set the weight's meaning after load, and went back to "New from
  data". Left for the sessions on purpose (dry-run items 58, 60, S10, S16).
- 2026-10-08: TIER 2 CRITERIA FROZEN (`tier2/criteria.md`). 11 bars: 1 success per task (8/8 size
  7 of 8, T4 6 of 6, 4-session tasks 4 of 4, T12R 2 of 2); 2 work kept (scripted open-work list);
  3 sev-4; 4 silent commit; 5 numbers vs drawing; 6 false done; 7 weight read as loaded (EVERY
  algorithm x every meaning + no-column check); 8 axe/focus; 9 words (tier 1 screen <= 50; tier 2
  screens never above round 1); 10 expert walkthrough + screenshot audit (0 confirmed sev 3-4,
  count never rises); 11 core-four median steps <= 2x. "Not scored" never holds.
- 2026-10-08: Before round 1 the preflight still owes: re-pilot every task whose start changed and
  T12R and the T17/T18 follow-ups; re-record answers; `--prove` 5 in a row (it went 3 of 4,
  first-save fault untraced); bars.mjs for bars 8-10 with planted cases; bar 7 (a) script; the
  open-work lister for bar 2; the wording check incl. follow-ups.
- 2026-10-08: Starts are ranked + colored + sized by PageRank (`*-ranked*.txt`, all 7 run clean on
  the study build); only T4 and T20 start empty (new files). No round cap; stall = no progress
  (< 3 more core-four successes of 32, no core sev 3-4 closed, no failing bar newly held).
- 2026-10-07: TIER 2 DESIGN DECIDED: `next-steps/tier2-design.md`. In: filters (element-owned
  steps), Path popover, Notes place, Sources listing every load, weight meaning at load + every run
  on the loaded weight (REQUIRED, owner rule), neighborhood hops/Follow in the list header,
  Replace with file + stale by content, edge picking + selected-edge mark, Find rule errors.
- 2026-10-07: Tier 2 WAITS (with reasons in the doc): several node types / Links to (no task needs
  it; biggest format door -- owner design first), node weight (no reader), Select where dialog
  (Find "=" is the one home), multi-query path rows, Add as steps, selection bar, OR/NOT.
- 2026-10-07: Distance readers given a similarity/unset weight count hops and say so with a code;
  never read strength as distance. Similarity readers read unset as similarity (glossary 11).
- 2026-10-07: Words: glossary wins over refined B. "Follow: Out | In | All" (path: Out | All, directed
  only); weight "Higher means: Closer | Farther | Capacity" (no "strength"/"Stronger" on screen);
  never "route". Filter chip only while a step is on.
- 2026-10-07: Owner one-way doors still open in `owner-decisions.md` (screenshot legend, undirected
  arrowheads, export group rank, legend covered layer -> recommend master's `legend.painted-over`,
  `optionsFor`, canvas `aria-label`, 2D zoom doc) plus the round 3 and tier 2 doors; also
  usage-data card wording, tooltip delay (500 vs 1000 ms), a run's style above a reader's layer.
- 2026-10-07: Severity 4 needs a wrong conclusion a reader would act on, from what the participant
  could perceive. Never prime graders with the outcome to look for.
- Before a new element API, grow an existing method (`CodedFact`, `CameraViewInput.current`,
  `WeightMeaning`, `ElementAtResult` already exist). Remove before adding; words at rest never rise.

## Priorities and values

- **A newcomer finishes the core path.** The average first-time user before specialized features;
  the owner's 2026-10-02 instruction and the reason tiers exist. At least 60% of sessions go to
  tier 1, first-time personas take tier 1 first.
- **Small and coherent over complete.** One home per feature, one word per meaning, one pattern
  per job. The owner's v1 failed by growing novice features and verbose text; personas validate
  the design, they never generate features (owner, 2026-09-26).
- **Evidence over taste.** "Ours is clearer" is taste. A departure from Figma's conventions needs
  a graph fact, a WCAG criterion, a named failing workflow, or a field convention. I break ties
  with the observed behavior of two or more participants, not opinions.
- **Truthful screens.** A value never misstates what it describes; every count is computed from
  live state or removed; a result the user cannot see is a fatal flaw ("this is graph
  visualization software", owner 2026-09-30).
- **The element owns the graph.** graphty-element owns all graph logic and returns neutral facts;
  the app writes the words and arranges them. A missing capability becomes a high-priority element
  issue, not an app workaround.
- **Honest measurement.** Simulated participants share one model's blind spots: a failure is a
  strong signal, a pass is weak. Compare rounds to each other, not to published norms.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- the canvas and the legend change
  the moment the step commits. Reason: round 8's top trust-killer was "the panel said one thing
  and the drawing showed another".
- **The obvious first choice does the thing.** The item whose words match the user's goal must
  produce the goal. Reason: "Show labels" matched the task words and did nothing visible; 12 of
  21 picked it.
- **Every count names its unit and its whole, and is live.** Reason: hand-typed counts disagreed
  between screens in rounds 2-7; fixed strings like "64 hidden" read as the program hiding things.
- **A count that hides something offers the way out beside it.** Reason: round 2's honest "N
  hidden" sent 8 of 8 hunting; the switch beside it made the task quick (2026-10-07).
- **A list answers with names, not counts.** Reason: "Covers: Javert and 17 neighbors" named no
  one; 0 of 12 could answer who he is tied to.
- **Nothing pre-done in a first session.** A sample opens bare; the user's own results are the
  only results. Reason: 21 of 21 could not tell the sample's pre-run work from their own.
- **No unbuilt item is drawn.** No "Coming" tags, no disabled promises, no "not available yet".
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Reason: "Data" on two controls dropped the
  selection 12 of 12 times.
- **Screen at rest with a graph loaded: about 50 words of app text** (framework principle 5).
- **No first-run interface** (no tours, coach marks, suggestion cards). Help is (i) icons,
  tooltips that wait, samples, undo. Owner ruled out wizards and suggestion cards (2026-09-26).
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead.** Reason: round 3's canvas fix dropped
  focus to the page after a sample opened (2026-10-07).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- 2026-09-26..10-07 (summarized; full text in git history of this file) -- Owner: Figma is the
  paved path for chrome; refined structure B; a run paints as soon as it finishes; tiers, tier 1
  first; build the real app and study it; element neutral about presentation. Me: real-app criteria
  (9 bars, ease a target not a gate, build-decided sessions count, tool faults void); pilot triage
  and round 2-3 changes, each fix in its owning package; reversed "no Show all labels" after round 2
  (names task 0/8 -> 7/8); round 3 closed tier 1; skeptics' regrades accepted; recommend master's
  `legend.painted-over` over the element dropping covered blocks; round 3 units in
  `next-steps/round3-units.md`; tier 2 design in `next-steps/tier2-design.md` (filter steps are
  element state, no step reorder, standard undo, neighborhood controls in the list header, several
  node types and Select where deferred, Replace only on a single-source graph, no auto rerun,
  glossary 11 weight words, element keeps `"strength"` and grows `"capacity"`).

- 2026-10-07 -- Tier 2 pilot fixes (me). Shared row truncation (Filters condition, Sources name)
  is one compact-mantine fix in `EllipsizedName`, not two app tooltips: both rows already use it,
  so the defect is the component's (first hover). The Overview's runaway Direction value is two
  fixes: compact-mantine `DataRow` lets a long stat value run over its name, and the app quotes the
  file's raw statement ("directed 0"). Overview under a filter: the app names the whole-graph
  counts and adds the element's visible counts; no filtered statistics API (no task needs
  components of the filtered graph). "Higher means" left unselected on purpose: it is the trap T20
  measures; only its hint's contrast is checked.

- 2026-10-08 -- Tier 2 criteria freeze (me), from the researcher, user advocate and red team
  reviews. Adopted: carry-forward scoring; "not scored" fails; bar 10 (all three asked); bar 11
  core-four cost as a GATE (researcher; steps are behavior, cost is the returning persona's quit
  reason); bar 7 (a) over every algorithm (a wrong catalog mark is the defect that started tier
  2); bar 9 (b) with round 1's own count as the limit (no count existed to set a number; red
  team's 40-word limits rejected as guesses); broken-habit finding; door removal after 8 chances;
  T22 dialog rule fixed now; stop rules from the launch prompt (no cap). Second-time follow-ups on
  T17/T18 as a TARGET, not a gate: new, unpiloted prompts (round 6 lesson). Spare 2 slots to T12
  as T12R (Ruth, Jordan), not T15: no returning persona can honestly play a first session.
  Rejected: red team's 5-of-6 T4 floor (inconsistent with 3 of 3 per half), raising ease to 5.5,
  rewording original prompts, a T21 second updated file (needs a v3 file and re-pilot for little).
- 2026-10-08 -- Returning starts (me): the routine every history shares is ranking; most also size
  or color by it. So every start is file + PageRank + Size bound to PageRank; names drawn for T24.
  Per-persona setups rejected (9 x 18 variants; a history is a briefing, the open work is
  per-task). Old setups kept for pilot reproducibility, used by no task. Added
  `tool/files/long-names.csv` for the truncation audit.

- 2026-10-08 -- Dry runs one to three (summarized; full text in `tier2/dry-run-r1-{1,2,3}.md` and
  git history of this file). Rule: fix any defect a participant could hit, in its owning package;
  leave what the task asks. Fixed across the three: clipped rows (one compact-mantine fix, then
  `descriptionVisible`), Escape consumed by the list or menu it closes, pointer-opened menus with no
  highlight, tooltips only after the pointer moves onto the target, focus to the inspector title
  after an action and to a saved note, run method recorded (element, additive), left-out rows with
  line and end columns, labels `onTop` (element option, app sets it), path color off the default
  blue, find list counts and scrollbar, one run kind in tree and inspector, Save on an off step
  turns it on. Left every time: names by default, 3D overlap, where the path form lives, stale
  marks, weight meaning after load, saved-state mark, Recent row, units on a total.

- 2026-10-08 -- Fourth dry run triage (me, `tier2/dry-run-r1-4.md`, pilots in
  `tier2/rounds/r1d3/pilot/`), on the frozen build 8c4eef472: 97 items, 25 fix, 39 sessions, 33 no
  change. Fix now: a click keeps its target's tooltip closed until the pointer leaves (a toggle's
  new label remounted the tooltip over the names being counted: one pilot counted 12 for 14), and
  "Filter to neighbors" tooltips open to the right; a pointer-opened menu highlights nothing even
  when its first row is disabled (regression of the third run's fix); left-out inspector with
  "Added" and "Left out" sections, left-out first on its own row; the path form's Follow (Out | All)
  that the tier 2 design decided and nobody built -- element gains `direction` on shortest path,
  default "all" (additive, team, `owner-decisions.md`); "Edit source..." replaces its source instead
  of adding a copy (41 ties became 82), and is not offered where a source cannot be replaced; Escape
  on the import page leaves only while nothing is chosen; Replace summary drops a zero count; Undo
  and Redo name their step from `HistoryStep.fact`, and Escape that clears a selection says what it
  cleared; the inspector title takes no visible focus mark (a focused heading, not a control; the
  box read as a field, the underline as a link); focus after Rerun to the title and after "Back to"
  to Degree; the "farther" example fits any data; the find hint's example wraps whole; reopen
  framing traced; damping factor's single-precision value traced. Reversed my own third-run (n) on
  the neighbors tooltip: here the covered row is the answer. Kept (n): default cursor on the chip,
  a tooltip over the rail. Reason: each fix is a seam a participant trips on; each left item is the
  question its task asks.

## Tried: worked / did not work

- 2026-09-27..10-03 (summarized) -- Eight rounds on mocks: places right, behavior after the click
  wrong; a check that read 0 pages passed (every check fails on zero items: plant a failure);
  overfitting from task words (two-domain and wording rules); my hybrid lost to the owner's
  refined B (bring the owner's proposal to working first); 23 browsers filled swap (4-slot gate);
  a pre-run sample contaminated first-time tasks; stopped mocking because the mock was the noise.
- 2026-10-06 (pilot) -- Piloting every task on the build before a round found four task-deciding
  defects for 16 sessions. Pilots that named a source file and line were the useful ones. Keep:
  pilot every round whose build changed (done before rounds 2 and 3; worked both times).
- 2026-10-06 (round 1) -- Did not work: a session clock that ran while queued for a browser voided
  14 sessions. A clock starts when the participant can act; every session ends in a finally.
- 2026-10-06 (round 1) -- Worked: proposals root-caused in source. Fix the route people take
  before marking the one they miss (neighbors 1 of 3 -> 8 of 8 with no cue).
- 2026-10-07 (round 2) -- Did not work: a decided rename was not built and nothing caught it.
  Preflight now lists every carried decision as built or not on the served build; it held in
  round 3.
- 2026-10-07 (round 2) -- The screen-reader tool's blind spots were scored as findings until the
  skeptics withdrew them. A new tool mode gets a pilot against a known-good widget first.
- 2026-10-07 (round 3 triage) -- Worked: the red team checking proposals in source found two "new
  APIs" already half-built in the element and that the cheap focus fix broke Escape.
- 2026-10-07 (round 3) -- Worked: one change per path made credit clean (names switch, Size list,
  menu focus each credited on its own route). Did not work: briefing graders on a risk by name
  (Ava/Farah) primed bar 3; one keyboard-only session was played with the pointer and voided
  bar 7 -- a persona's input mode needs a check in the runner, not trust.
- 2026-10-07 (round 3) -- Did not work: removing the canvas autofocus without asking where focus
  goes when the activating button unmounts; it became the round's one regression.
- 2026-10-07 (report) -- The harness refused a subagent's Write of `report.md` as a "report file".
  The orchestrator must write it, or the director's task must say the file is a deliverable input.

- 2026-10-07 (units) -- Worked: reading the code before writing units found two things already
  half-built (`LossNote` codes; `CameraViewInput.current`), which turned one would-be element API
  into an app-only unit and narrowed another to an option.

- 2026-10-07 (tier 2 design) -- Worked again: reading the element before deciding. Found the
  path-crash fix needs no API (shape contract), `ElementAtResult` already types edges, notes are
  already in the project file, selector refusals already carry a code, and `WeightMeaning` exists
  -- five would-be doors became zero or a field. Also found T4 needs no multi-type load.

- 2026-10-07 (tier 2 pilots) -- Worked: pilots naming the screenshot and the test line made every
  finding a unit without a re-walk. Two answer-key claims were wrong about the build (Everything
  does not replace the selection; bare-number refusal shows only after Enter): pilot the key, not
  only the app.

- 2026-10-08 (setups) -- Worked: walking a setup by hand once in a live session before writing
  seven of them. The tier 1 key path ("Add to Shape", then "Size") failed as a blind script:
  after Run the inspector shows the Graph, the run row must be clicked first, and "Size" is
  ambiguous with the resize separators (use `role=menuitem:Size`). All seven then ran clean.
- 2026-10-08 -- A `rm -rf $VAR/...` was refused by the safety check; use new folder names or
  `"${VAR:?}"` instead of clearing scratch folders.

- 2026-10-08 (dry run) -- Did not work: starting round 1 before a dry run; the first five
  sessions spent most of their steps on defects (same-named From/To boxes, a tool crash on EPIPE,
  a helper script shared between sessions sending clicks into another session). Worked: piloting
  every task on both datasets and triaging by "could a participant hit it" against "is it the
  question the study asks".

- 2026-10-08 (second dry run) -- Worked: a second pilot pass on the fixed build found 65 new
  defects, many made by the first fixes (focus moved onto value rows; a row description passed
  but hidden by the shared row; the path color moved out of the ramp and onto the default blue).
  Lesson: a fix batch is not done until a re-pilot on the built result shows it. Did not work:
  checking the path color's distance against flat swatches only; shaded spheres at small size
  read differently, so check on a screenshot of both a ranked and an unranked start.

- 2026-10-08 (third dry run) -- Worked: reading the code behind each pilot finding before
  classing it. Three "new features" were already there (`descriptionVisible` for the Sources
  counts, the element's selection `edgeColor` for the Style tab, `onTop` for labels), and two
  defects shared one root cause (a path run's kind differs between tree and inspector: wrong icon
  and unmarked row). Did not work: the second run's "end the find list on a whole row" fix; it
  hid the cut instead of showing it. A fix for a cut must show that more exists, not hide the cut.

- 2026-10-08 (fourth dry run) -- Worked: checking each "known on this build" item in source
  before keeping it. The path direction note led to an unbuilt decision (no Follow, and the
  element's search ignores direction); the "Edit source" trap turned out to be a mislabeled
  command (an "add" request) rather than a design question; "row (no name)" was the tool printing
  a table row's name, not the app. Did not work: the third run's fixes for a disabled first menu
  row and a boxed title focus each made the next defect. Lesson: a focus or highlight fix needs
  both a keyboard and a pointer walk on the exact screen before it is called done.

## Thinking

- **What tier 2 needs before its first round:** tasks and answers for filter, shortest chain,
  notes, two tables (old T4), weight at load used by every run, rerun on new data (needs a
  `friends-v2.csv` with the same nodes and changed weights); returning-user personas; the same
  frozen bars, pilot-per-build, skeptic check. No keyboard-only persona (owner, 2026-10-07).
- **Real-user study design:** recruit 5-8 analysts plus one screen-reader user; tasks from tier 1
  core four; measure what simulation could not: whether Size and labels are found, whether 3D
  sizes mislead, ease calibration against our simulated numbers.
- **Discovery is the remaining cost** (Size under "+", labels on Everything, group layouts behind a
  community run). Do not redesign from simulated evidence alone; it is one shared guess.
- **Where fixes go.** Graph logic (element), a word or arrangement (app), a shared control
  (compact-mantine). A fix in the wrong package is a second bug.
- **Open tension:** "a run paints as soon as it finishes" vs a reader's Everything color
  suppressing it. Owner item.

## Sources

- Tier 2 (2026-10-08): `tier2/dry-run-r1-4.md` (pilots in `tier2/rounds/r1d3/pilot/`), `tier2/dry-run-r1-1.md`, `tier2/dry-run-r1-2.md` (pilots in `tier2/rounds/r1d1/pilot/`), `tier2/dry-run-r1-3.md` (pilots in `tier2/rounds/r1d2/pilot/`), `tier2/criteria.md` (frozen), `tier2/tasks.md`, `tier2/roster.md` ("Where each
  session starts"), `rounds/tier-2/setups/*-ranked*.txt`; reviews in `notes/researcher.md`,
  `notes/user.md`, `notes/redteam.md`.
- Studio: `criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `owner-decisions.md`,
  `rounds/pilot/triage.md`, `rounds/round-{1,2,3}/{plan,preflight,scores,insights}.md`,
  `rounds/round-{1,2}/decisions.md`, `tool/README.md`.
- Digests (2026-10-06): `digests/decisions.md`, `owner-voice.md`, `study-rounds.md`, `tier1.md`,
  `framework.md`.
- Earlier work: `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/` (owner feedback,
  decision log, round 8 insights, structure B); `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/`.
- Director transcripts: `.claudehistory/3a19ea55-.../subagents/workflows/`; scripts `tmp/director/`.
- Builds: round 1 9d6598eea, round 2 4a7a1a7fb, round 3 b7590f8de; served at
  `https://dev.ato.ms:9366/?next`.
