# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-08 (second dry run before tier 2 round 1 triaged).

## Top of mind

- 2026-10-08: SECOND DRY RUN (`tier2/dry-run-r1-2.md`) on build 3dfe7daf9e45, after the first
  dry run's 100 fixes: 98 items, 65 fixed, 19 left, 13 no change, 1 split. Fewer blockers, but
  the first round of fixes left visible seams (focus on value rows, hidden row descriptions, a
  green check over a left-out row, the key's "Shortest route"). Round 1 needs ANOTHER frozen build
  and re-pilot. Rule holds: no round starts until a dry run on its exact build is triaged and
  built; re-pilot after every fix batch, because fixes make defects too.
- 2026-10-08: Two open questions dominate both dry runs and are NOT polish: names are not drawn by
  default, and nodes overlap in the 3D drawing (size-aware spacing is deferred: layout `nodeSize`
  "not used yet"). Both decide whether a reader can check a list against the drawing. Watch them
  in round 1; bring the owner the evidence, not a guess.
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
- 2026-10-07: Tier 2 element doors are recorded in `owner-decisions.md` (filter steps, weight
  meaning at load, `E_BAD_SELECTOR` reason, `data.sources()`, StaleNote reason).
- 2026-10-07: Distance readers given a similarity/unset weight count hops and say so with a code;
  never read strength as distance. Similarity readers read unset as similarity (glossary 11).
- 2026-10-07: Words: glossary wins over refined B. "Follow: Out | In | All" (path: Out | All, directed
  only); weight "Higher means: Closer | Farther | Capacity" (no "strength"/"Stronger" on screen);
  never "route". Filter chip only while a step is on.
- 2026-10-07: Owner one-way doors still open in `owner-decisions.md` (screenshot legend, undirected
  arrowheads, export group rank, legend covered layer -> recommend master's `legend.painted-over`,
  `optionsFor`, canvas `aria-label`, 2D zoom doc) plus the round 3 and tier 2 doors.
- 2026-10-07: Severity 4 needs a wrong conclusion a reader would act on, from what the participant
  could perceive. Never prime graders with the outcome to look for.
- Before a new element API, grow an existing method (`CodedFact`, `CameraViewInput.current`,
  `WeightMeaning`, `ElementAtResult` already exist). Remove before adding; words at rest never rise.
- Open owner items: usage-data card wording, tooltip delay (500 vs 1000 ms), whether a run's
  suggested style lands above a reader's color-everything layer.

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

- 2026-09-26..30 -- Owner: Figma is the paved path for chrome, structure from graphty's own
  ontology; refined structure B (one tree of paint rows, runs as rows, inspector with Style and
  Values, built-in Everything and Selection); a run paints as soon as it finishes; weight defined
  at load and used by every run (the build does not yet -- a tier 2 gap).
- 2026-10-02 -- Owner: tasks tiered; tier 1 first; >= 60% of sessions to tier 1.
- 2026-10-03 -- Owner: stop mocking, build tier 1 as the real app and study that; graphty-element
  is neutral about presentation. Tier 1 merged as #942 (2026-10-06).
- 2026-10-06 -- Criteria for the real-app study (me): the 9 bars in `criteria.md`, frozen after
  four critiques. Ease a target, not a gate. Build-decided sessions count; tool faults void.
  Per-dataset floors; one-participant confirmation for scripted build defects; screen-reader mode;
  a second keyboard-only persona; words-at-rest gate. Rejected: 85% first-time gate, core-set bar.
- 2026-10-06 -- Pilot triage (me, `rounds/pilot/triage.md`): fixed the camera spin, the image key
  (#133), failed-open state, "New from data" drawing nothing, arrowheads on undirected graphs, CSV
  group numbers, Spectral, truncated GraphML, Analyze keyboard pick, Export dialog modality, the
  duplicate Everything row, focus stuck in find, legend lines that lied; seed out of the element
  (owner rule). Deferred: show-all labels, "Influence" naming, weight, 3D perspective.
- 2026-10-06 -- Round 2 changes (me, `rounds/round-1/decisions.md`): the study runner; screen-reader
  mode; Neighborhood opens the neighbor list; Summary and Selection dead ends; no empty "Open list"
  arrow; layout refusal under Method; wheel zoom; default focus ring; focus to the new style line.
  Rejected: a Degree-row cue (two variables at once), Summary listing names, Show all labels.
- 2026-10-07 -- Round 3 changes (me, `rounds/round-2/decisions.md`): menu-to-dialog focus in
  compact-mantine; legend drops covered layers; 2D Fit; `optionsFor` partition values (app deletes
  its own `groupings()`); load/run announcements; canvas named from `aria-label`; Size "+" opens
  its list; row glyph in the row; runs named by method; "Show all labels" writing the element's
  existing declutter flag. Rejected: `returnFocus={false}` on MainMenu (breaks Escape), a new
  groupings API, app filtering run fields, key placement (new API; later).
- 2026-10-07 -- Reversed my 2026-10-06 "no Show all labels": round 2 answered the question it
  waited on. Round 3 confirmed the reversal (names task 0 of 8 S -> 7 of 8 S).
- 2026-10-07 -- Round 3 closes the studio (me): stop rule "round 3 finished"; no round 4. Reason:
  the two failing bars are a color fix and one void session, and every remaining question needs
  real people. Evidence: `rounds/round-3/scores.md`, `insights.md`.
- 2026-10-07 -- Accept the skeptics' regrades for round 3 (me): bar 3 holds (3D size misdrawing is
  severity 3: 2.8% gap no reader ranks by eye, ranking task answered right by all, graders
  primed); bar 5 holds (label count true); bar 6 holds (Whole graph picture complete and truthful;
  r3-s01 regraded SD). Report both the scored and the checked status.
- 2026-10-07 -- Recommend withdrawing the element's "legend drops covered blocks" in favor of
  master's `legend.painted-over` fact (#1364) plus an app filter (me). Reason: the fact now exists
  on master, filtering on a neutral fact is consuming, not computing, and it avoids changing what
  an existing method returns. Alternative kept open for the owner: keep the drop.
- 2026-10-07 -- Round 3 problems are not fixed on the studio branch (me): the round was the last,
  and each needs a trace or an owner decision first. They lead the next-steps list.

- 2026-10-07 -- Round 3 fixes as units (me, `next-steps/round3-units.md`). Selection in export:
  element option, app leaves it out by default, no dialog choice (one session does not justify a
  control). Whole graph angle: an option on `fitToGraph`, not a change to its numbers (its file
  promises no saved picture moves). Key: view insets every fit honors, and a capture reserves its
  own drawn key's box. 3D size: trace first (world sizes, 2D vs two 3D angles); camera push-back,
  hiding sizes in 3D, or an app warning are rejected as symptom fixes. Sources row: a childless
  source opens the one table it produced. Reason: each fix in its owning package, one door each.

- 2026-10-07 -- Tier 2 design (me, `next-steps/tier2-design.md`), from five designers' proposals and
  a code read. Filter steps are ELEMENT state (an unticked step must survive in the project file;
  app-held steps would be app-owned graph state). No step reorder: steps AND together, so order
  changes nothing. Standard undo for steps, not "undo unticks" (one undo rule; the sev-4 claim was
  not verified). Neighborhood controls in the list header, not a popover in front (keeps the 8/8
  route). Several node types deferred: T4 is one node + one edge table, already loadable. Select
  where dialog deferred: Find "=" is the one home. Replace offered only on a single-source,
  single-table graph (per-source replace needs row provenance; known ceiling). No auto rerun,
  no "Rerun all". Weight words from glossary 11 (similarity/distance/capacity/unknown); the
  element keeps its published `"strength"` spelling and grows `"capacity"`.

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

- 2026-10-08 -- Dry run triage (me, `tier2/dry-run-r1-1.md`). Fix now: any defect a participant
  could hit (clipped text with room, dead or always-enabled controls, focus left on the canvas or
  a container, raw notation, wrong values, the equal-bar histogram, a path color lost in the
  PageRank ramp, unnamed or same-named controls, tool faults). Leave: where the weight meaning is
  set after load, where the path form lives, several path rows, how stale values are marked,
  labels by default, selection over color, hover linking. Two element changes go to the owner as
  possibly breaking (histogram per-value binning only for counts; path node color) but are built
  now so the study does not run on them; left-out rows gain `line` and `endColumns` (additive,
  team). Reason: the sessions must spend their time on what returning users need.

- 2026-10-08 -- Second dry run triage (me, `tier2/dry-run-r1-2.md`). Fix now, in the owning
  package: the shared row lets its count yield before the name (one compact-mantine fix for every
  Sources and Filters row); a shared list consumes the Escape that closes it; a pointer-opened
  menu highlights nothing; the run records which method it used and the catalog can spell
  "Bellman-Ford" (element, additive); a left-out row says which end is missing (element,
  additive); labels may draw on top (element option, neutral default off, the app sets it); the
  path color must stand out from the default node color too (element default, owner list). App
  decisions: saving a filter step turns it on; after an action fills the inspector, focus goes
  to the inspector's title, not a value row; after a saved note, to that note; one neighborhood
  heading, "<name>'s N connections", at every hop count (restores the tested words); a selection
  of several edges lists them; the single main landmark loses its name. Leave: names by default,
  3D overlap, where the filter action and the path form live, stale marks, the weight after load,
  "Hops" as a word. Reason: each fixed item is a seam a participant would trip on; each left item
  is the question its task asks.

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

- Tier 2 (2026-10-08): `tier2/dry-run-r1-1.md`, `tier2/dry-run-r1-2.md` (pilots in `tier2/rounds/r1d1/pilot/`), `tier2/criteria.md` (frozen), `tier2/tasks.md`, `tier2/roster.md` ("Where each
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
