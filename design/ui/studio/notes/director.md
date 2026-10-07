# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-07 (round 2 closed; round 3 build re-piloted: `rounds/r2/pilot/`).

## Top of mind

- 2026-10-07: Round 3 build b7590f8de (graphty@0.8.53) re-piloted on 9 tasks: every end state
  reached, no blockers. Confirmed built: runs named "PageRank" everywhere, Size "+" opens its list
  (T15 one step shorter), "Show all labels" (count "77 labels, 7 hidden" -> "77 labels"), group
  layouts enabled after Louvain with "Group by: Communities" prefilled, Enter opens the only
  Analyze entry, no constant-size key entry, drawing no longer turns on its own.
- 2026-10-07: Still to confirm before launch: axe-core and words-at-rest count on the round 3
  build, and one `--sr` session for the new announcements (labels count, "Exported ...", run
  finished). The re-pilot ran no keyboard or screen-reader path.
- 2026-10-07: Element emits English where it should return a code plus parameters: layout
  refusals ('"planar" ... G is not planar', '"bipartite" needs exactly two groups') in
  `session/planning.ts`, and graph-io's CSV export warnings. Breaks "element returns neutral
  facts". High-priority element issue; app words them. Not a round 3 blocker.
- 2026-10-07: Study tool counts a label and its control as two ("Show all labels", "Format",
  "Table"): fix in `real.mjs` before round 3 so graders do not log false `ambiguous`.
- 2026-10-07: Watch in round 3, do not pre-fix: T16 friends.csv first drawing has no names (a
  newcomer's likely "not useful"); Everything's Style tab still shows blue / Size 1 under a
  PageRank-sized drawing (may read as "sizing lost"); Spectral and Circle-in-3D do not help T11,
  Columns by group does; selection recenters the camera under the toolbar.
- 2026-10-07: Owner one-way doors from round 3 (record each in `owner-decisions.md` when built):
  `legend()` drops covered blocks; `optionsFor` fills partition values; canvas takes the host's
  `aria-label`. Behavior changes to existing methods, no new exported name.
- 2026-10-07: A decision is done only when preflight confirms it on the served build (the round 2
  run rename slipped). The re-pilot is that check per task; keep it.
- 2026-10-07: Traces owed, not blocking: Force re-applied with a new spring length freezes as a
  cloud; 4x print is the 2x picture enlarged (element, no app hiding).
- Round 2 result: 52 of 54 sessions; first-time 34 of 34; neighbors 8 of 8 via the Degree row.
  Failing: bar 5 (stale key row), bar 7 (screen-reader menu focus). Bars 8 and 9 never ran.
- Sizing by a result was the largest ease cost (18 of 18). Round 3 has one sizing change only
  (Size "+" opens its picker) so the round can credit it.
- Gates: each task >= 80%, each dataset half >= 75%; first-time >= 80%; 0 confirmed sev-4, silent
  commits, count/drawing mismatches, false "done"; keyboard only; automated a11y; app words at rest
  <= 50. Done = all 9 bars in one round, or round 3 finished, or no gain on T15/T10/T12/T9.
- Build defects confirm at one scripted participant; behavior and opinion need two. Simulated
  passes weak, failures strong. Screen-reader tool blind spots make findings "not shown".
- Before a new element API, grow an existing method. Remove before adding; words at rest never
  rise. Graph logic in the element, shared controls in compact-mantine, words in the app.
- Owner rule: the element imposes no default seed; the app passes its own. Key over Pazzi /
  Blacheville and Farah behind Chloe are fixed-seed placements every user meets: revisit after
  round 3 as key placement / overlap, not seed.
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
- **A list answers with names, not counts.** Reason: "Covers: Javert and 17 neighbors" named no
  one; 0 of 12 could answer who he is tied to.
- **Nothing pre-done in a first session.** A sample opens bare; the user's own results are the
  only results. Reason: 21 of 21 could not tell the sample's pre-run work from their own.
- **No unbuilt item is drawn.** No "Coming" tags, no disabled promises, no "not available yet".
  Reason: every dead end in round 8's label task was a "not available yet" route.
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Reason: "Data" on two controls dropped the
  selection 12 of 12 times; duplicate names also inflate study-tool errors.
- **Screen at rest with a graph loaded: about 50 words of app text** (framework principle 5).
  Reason: the owner's repeated "too text-heavy" complaint about v1.
- **No first-run interface** (no tours, coach marks, suggestion cards). Help is (i) icons,
  tooltips that wait, samples, undo. Reason: framework principle 0; owner ruled out wizards and
  suggestion cards (2026-09-26).
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first, one thing
  per press.** Reason: Figma convention and the owner's safe-exploration rule.
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14). Reason: the only first-time success measures on
  record that predate the studio.

## Decisions and reasons

- 2026-09-26 -- Figma is the paved path for chrome; graphty's structure comes from its own
  ontology (qualified 2026-09-28). Owner.
- 2026-09-30 -- Refined structure B: one tree of paint rows on the left, runs as rows, inspector
  with Style and Values tabs, built-in Everything and Selection layers. Owner. My "two lists"
  hybrid was not taken.
- 2026-09-30 -- A run paints as soon as it finishes. Owner overruled "measures don't paint".
- 2026-09-30 -- Weight is defined when the data is loaded; every run uses it by default. Owner.
  (The real build does not yet; see 2026-10-06 triage.)
- 2026-10-02 -- Tasks tiered; tier 1 first; at least 60% of sessions to tier 1. Owner.
- 2026-10-03 -- Round 8 triage (me): fix prototype defects that decided tasks, then severity-4
  design problems, then small tier 1 changes, mostly removals. Delete "Show labels"; "Add label
  line"; live count line; neighbors listed by name; one live find box; sample opens bare.
- 2026-10-03 -- Stop round 9; build tier 1 as the real app and study that. Owner.
- 2026-10-03 -- graphty-element is neutral about presentation; the app writes every word. Owner.
- 2026-10-06 -- Tier 1 merged as #942. Known gaps: Open project or file... does not reopen a
  project file, legend switch not saved, stale name after undo, empty Selection Style tab.
- 2026-10-06 -- Criteria for the real-app study (me): the 9 bars in `criteria.md`. Ease is a target,
  not a gate (5.5 never met in eight rounds; simulated ease uncalibrated). One bar for every round.
  Build-decided sessions count against the bars ("without" figure is diagnosis only); tool faults
  void the session. Round 1 = 89 sessions, n >= 5 per task, 8 for split tasks, 10 for T15.
- 2026-10-06 -- Plan revised after four critiques, then frozen (me). Taken: per-dataset floors;
  claims graded apart from tasks (`truth-on-screen`); one-participant confirmation for scripted
  build defects; T16 first look (measured); T15 B and T7 B on `friends.csv`, T9 B on Florentine so
  answers cannot come from memory; screen-reader mode; Sam as second keyboard-only participant;
  repeatable a11y bar; app words gate; #133 a preflight blocker. Rejected: an 85% first-time gate,
  a core-set bar, inspector words as a gate, keeping T4, thin-persona rebalancing.
- 2026-10-06 -- T13 and T14 use setup starts with the prompt owning the prior work; T15 asks for
  bigger dots (color comes free); graders check every named answer against a screenshot.
- 2026-10-06 -- Pilot triage (me), `rounds/pilot/triage.md`. Fix now: the camera spin (element),
  the image key #133 (element + app), the tool's save picker and modal-scoped names, the answer
  key and setups, Analyze keyboard pick (app), failed open leaving a project and a vanishing
  reason (app), New from data > Load drawing nothing, the "0 labels" count, seed out of the element
  with the app passing its own (owner rule), arrowheads on undirected graphs (element), legend label
  and constant-size blocks plus the gray chip (app), the duplicate Everything row (app), focus
  stuck in find (app), export dialog not inert and grid-cell choices (app), CSV group numbers vs
  screen (element), Spectral and Force flat broken (layout, element), a truncated GraphML loading
  partially (element or graph-io), garbled app words, chrome tooltips/names/padding. Deferred with
  reasons: Show all labels, "Influence", weight unused, CSV directed default, 3D perspective, G
  summary, tie values in the neighbor list, label priority, histogram, fit insets, T4-only defects,
  usage card vanishing (owner's), measured design questions. Evidence: the 16 pilot reports.
- 2026-10-06 -- The PageRank-as-"Influence" naming is held, not fixed: T7 and T9 ask exactly what
  the order and sizes rest on, so round 1 measures it; graders accept either word. Reason: fixing
  before measuring would be taste; the owner's trade-words rule makes it a likely fix after round 1.
- 2026-10-06 -- No "Show all labels" control before round 1. Reason: remove-before-add and T10
  is the test of whether the live hidden count suffices; the key drops the show-all branch.

- 2026-10-06 -- Round 2 changes (me), `rounds/round-1/decisions.md`. Taken, severity first: the
  study runner (cap 4, clock from slot, always end, ease 7 = very easy); a screen-reader mode in
  `real.mjs`; the Neighborhood command opens the neighbor list on one selected node; the Summary
  drops "Babet (1)" (commonest value once) and "Edges 0"; the Selection row and Data > Sources
  tables stop dead-ending; compact-mantine `ComboInput` hides its arrow with no options (the Size
  field); "No crossings" refusal under Method via an element rejection, no new code; orbit-camera
  wheel zoom; a default focus ring for `mantine-focus-never` controls; focus to the new line after
  a Style "+" pick; runs named by method; the answer key for the new T12 route and method names.
  Evidence: code checked (`commands.ts` neighborhood only selects; `SetLine.tsx` passes
  `options={[]}`; `focusRing: "never"`; no wheel observer in `OrbitInputController.ts`) and the
  round 1 reproductions.
- 2026-10-06 -- Rejected for round 2 (me): a Degree-row cue (two variables at once; every
  clickable-row story changes), the Summary listing member names (a second neighbor list),
  "18 different names" (adds words, distribution completeness unchecked), moving the summary into
  the element (the app reads a fact), a public refusal code, notice-slot machinery, filling the
  Size list, moving Size, Show all labels, a Style-tab signpost, toolbar words, "Start here" and
  key decimals. Deferred with a trace: the legend over a node, hover with no name, layout
  descriptions, at-rest wording on the graph's Values (bar 9 decides).
- 2026-10-06 -- The 7 timed-out round 1 re-runs move into round 2's roster rather than a "c" run on
  round 1's build (me). Reason: the served build changes once fixes land; rebuilding the old one
  for 7 cells costs more than it tells. Sam's keyboard names session runs first, after the focus
  fixes.

- 2026-10-07 -- Round 3 changes (me), `rounds/round-2/decisions.md`. Taken, severity first: a
  menu that opened a dialog does not take focus back (compact-mantine Menu; remove the per-caller
  copies it covers); `styles.legend()` drops a block covered on every element and its English
  "painted over by" sentence (`legend.ts:730` already detects it); 2D Fit traced and fixed in the
  element; `catalog.optionsFor` fills a partition option's `values` with groupable columns,
  results included, and the app deletes `groupings()`; load and run-finished announcements in the
  existing status region; the canvas named from the host's `aria-label` with a visible ring;
  Size "+" opens its picker; DataRow's decorative trailing glyph joins the row's hit area; runs
  named by method through one `runName()`; a "Show all labels" switch writing the element's
  existing `layoutBehavior.labels.declutter`, the count shortened to "N labels, M hidden" so words
  do not rise; the study tool follows `aria-activedescendant` and gets a read-region command;
  answer key re-recorded. Evidence: code read for each (menus.tsx, StyleTab.tsx:355, legend.ts,
  methods.ts:83, optionsFor.ts, ElementHost.tsx:11, DataRow.tsx, Graph.ts:1389) and the round 2
  reproductions.
- 2026-10-07 -- Rejected for round 3 (me): `returnFocus={false}` on MainMenu (breaks Escape;
  third copy); a new element call listing groupable attributes (an existing method covers it);
  the app filtering `run.fields` itself (graph logic in the app); Size arriving bound to the row's
  result (sizes by a group id on a community run); a word on the chain-link icon or a tooltip
  rename (second change on one path); renaming only the inspector subtitle (third naming state);
  "Javert and his 17 connections" (gender unknown); a zoom hint under the count; rewording T10;
  removing the 4x choice in the app (hides an element defect); key placement or fit insets (new
  element API; later). Deferred: Force spring-length cloud and 4x print (trace first), damaged-file
  refusal on both routes, Overview deletions, export selection ring.
- 2026-10-07 -- Reversed my 2026-10-06 "No Show all labels": round 2 answered the question it
  waited on. The count alone did not suffice (every names session hunted for a way out), and the
  switch changes the drawing visibly, so it is not the round 8 "Show labels" trap.

- 2026-10-07 -- After the round 3 re-pilot (me): launch round 3 once axe, words-at-rest and one
  `--sr` session pass and the tool's label/control double count is fixed. Not changing before the
  round, to keep one variable per path: names on friends.csv by default, Everything showing
  inherited values, the Overview "directed 0" row (overflow and wording; fix as a trivial app
  defect only if it touches no task path), "Id" vs "id", equal-bar histograms, the self-naming
  inspector subtitle. Filed for the element, not the app: English refusal and export sentences.
  Evidence: `rounds/r2/pilot/T*/pilot.md`.

## Tried: worked / did not work

- 2026-09-27..10-02 -- Eight simulated study rounds (rounds 1-6 on static mocks, 7-8 on a
  clickable skeleton). Worked: steady ease gains on repeated tasks; tree tests and first-click
  tests located places well. Did not work: the 5.5 ease bar, the 70% tree-direct bar and the
  no-severity-4 bar were never met in any round. Lesson: places are right; behavior after the
  click is what fails.
- 2026-09-29 (round 5) -- Ran a round whose decisions were not drawn. It re-measured round 4.
  Lesson: a round may not start until its decisions are on screen (preflight).
- 2026-09-29 (round 6) -- Ran despite a failed gate; a check that read 0 pages passed. Lesson:
  every check fails when it inspects zero items, and a check is proven by planting a failure.
- 2026-09-29 -- Owner caught overfitting: "money in / money out" grew from one persona's task and
  task words echoed the fix. Lesson: two-domain rule, wording rule, no currency special case.
- 2026-09-30 -- My hybrid structure recommendation (sets and paint as two lists) lost to the
  owner's refined B. Lesson: bring the owner's own proposal to a working state and test it
  before arguing for an alternative; my recommendation also carried "measures paint nothing",
  which the owner called fatal.
- 2026-10-01 -- 23 study browsers at once filled swap. Lesson: every browser goes through the
  4-slot gate (`with-browser.sh`).
- 2026-10-02 (round 7) -- Moving to a clickable skeleton made the test harder and more honest:
  ease fell 4.78 to 3.54 because 18 of 61 tasks could not reach their end state. Lesson: fidelity
  defects decide tasks; prove fixes with a scripted click-through before re-running.
- 2026-10-02 (round 8) -- Tiering worked: it showed tier 1 at 75% (86% without the chained walk)
  and tier 2 at 96%, so the failures were concentrated and fixable. Clean wins: communities 45 to
  100%, the path picker 46 to 83%, layout ease 2.5 to 4.8, file actions in the main menu (tree 19
  to 90% direct). What consistently worked: loading and the match report, the broken-file refusal
  with line numbers, "Local only", the Privacy page.
- 2026-10-02 (round 8) -- The sample opened with PageRank pre-run; it contaminated every
  first-time task. Removed.
- 2026-10-03 -- Stopped mocking. The owner's question "isn't it just as easy to build real code
  as a mock?" was right; the mock had become the main source of noise.

- 2026-10-06 (pilot) -- Piloting every task once on the build before round 1 worked: it found
  four task-deciding defects (spin, image key, save picker, Enter in Analyze) and broken key paths
  in about half the tasks, at the cost of 16 sessions instead of 89 wasted ones. Keep doing it
  before every round whose build changed.
- 2026-10-06 (pilot) -- Pilots that root-caused in source (Spectral, ARF, AnalyzePopover, NoticeSlot)
  were far more useful than ones that only described the screen. Ask for a source file and line in
  every pilot report.

- 2026-10-06 (round 1) -- Did not work: a 40-minute agent clock that ran while queued for a
  browser slot voided 7 re-runs and left 14 first runs ungraded; two stopped agents kept slots.
  Lesson: a study clock starts when the participant can act, and every session ends in a finally.
- 2026-10-06 (round 1) -- Worked: role proposals that root-caused in source changed the fix. The
  insights said the Degree row was the only route and pointed at a cue; the code showed the
  Neighborhood command was a second route that only selects. Fix the route people take before
  marking the one they did not.
- 2026-10-06 (round 1) -- Worked: the red team withdrawing its own proposal (Summary listing names)
  once it conflicted with a standing decision. Ask every critic to check proposals against
  `Decisions and reasons` before sending them.

- 2026-10-06 (re-pilot) -- Worked: re-walking every task on the rebuilt app before round 2 found
  three stale answer-key entries and one likely element defect ("Force, flat" does nothing) at the
  cost of ~20 scripted sessions. Keep: pilot every round whose build changed.

- 2026-10-07 (round 2) -- Did not work: the run rename was decided for round 2 but not built, and
  nothing caught it until the scores. Lesson: preflight lists every carried decision as built or
  not built on the served build.
- 2026-10-07 (round 2) -- Worked: the screen-reader mode let Morgan's sessions run, but its blind
  spots (no active option, no browse mode) turned tool limits into scored "findings" until the
  skeptics withdrew them. Lesson: a new tool mode gets a pilot against a known-good widget first.
- 2026-10-07 (round 3 triage) -- Worked: the red team checking every proposal in source. It
  showed two "new API" proposals were already half-built in the element (`coveredBy()`,
  `optionsFor`) and that the cheapest-looking focus fix broke Escape. Keep asking for it.
- 2026-10-07 (round 2) -- Worked: one route fix for neighbors (round 1's Neighborhood command
  routing) plus no cue moved T12 from failing to 8 of 8; people used the Degree row. One variable
  at a time paid off.

- 2026-10-07 (re-pilot of round 3 build) -- Worked: every decided round 3 change I could check
  was on screen, and the pilots named source files for what remained (`planning.ts`). The
  preflight-per-decision lesson held. Gap: no keyboard or screen-reader walk, so bar 7 is
  unverified.

## Thinking

- **Round 3 must answer first:** does Size "+" opening its picker cut the sizing cost (it is the
  only sizing change); does "Show all labels" end the names hunt without adding words; does the
  key pass bar 5 once covered layers drop; do the group layouts and 2D Fit lift T11; does the
  focus fix let the screen-reader whole first session finish.
- **Watch in round 3:** T16 newcomers on friends.csv calling it "not useful" for lack of names;
  readers on Everything believing sizing was lost; Rings vs Columns by group splitting "helped"
  opinions; Escape on the Size list leaving a fixed "1" (honest, but a detour); a covered-layer rule that drops a partly visible layer (false key by
  omission); the runName change confusing T7/T9 graders; announcements spoken twice; the switch
  read as "Show labels" and left on, cluttering names.
- **Where fixes go.** Before each fix ask: graph logic (element), a word or arrangement (app), or
  a shared control (compact-mantine)? A fix in the wrong package is a second bug. Before a new
  element API, look for an existing method to grow.
- **Open tension:** "a run paints as soon as it finishes" vs a reader's Everything color
  suppressing it ("Hidden by your layer"). Watch it in sessions.
- **Ease is held down by a few places** (sizing, layouts, names). Round 3 targets exactly those.

## Sources

- `design/ui/studio/digests/decisions.md`, `owner-voice.md`, `study-rounds.md`, `tier1.md`,
  `framework.md` (this worktree; written 2026-10-06).
- `/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/`
  `owner-feedback.md`, `study/decision-log.md`, `study/round-8/insights.md`,
  `study/structure-comparison/structure-b-refined.md` (via the digests).
- `/home/apowers/Projects/graphty-monorepo/.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/`
  `tier1-design.md`, `plan.md` (via the tier 1 digest).
- `design/ui/studio/tool/README.md` (the real-app study tool).
- Director transcripts in `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/`:
  `wf_5285cd13-42b/agent-a1737aea5a26c7113.jsonl` (2026-09-27, framework synthesis);
  `wf_6818e34f-76d/agent-a93c299dcf9cddfe1.jsonl` (2026-09-29, round 4 triage);
  `wf_6959c5f6-35c/agent-a262a77092f6c4bf8.jsonl` (2026-09-29, round 6 position);
  `wf_94d61710-fbb/agent-ad532051e3c0cccbd.jsonl` (2026-09-30, structure A vs B, hybrid);
  `wf_93e7ffbb-6da/agent-affa3aab544229922.jsonl` and `agent-a410ceba8c45615db.jsonl`
  (2026-10-03, round 8 triage and decisions).
- Extraction scripts: `design/ui/studio/tmp/director/find_director.py`, `show.py`, `full.py`.
- Pilot reports: `design/ui/studio/rounds/pilot/T*/pilot.md`; triage `rounds/pilot/triage.md`
  (2026-10-06).
