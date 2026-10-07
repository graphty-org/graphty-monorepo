# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-07 (round 3 closed; studio "done" by the stop rule; final report written).

## Top of mind

- 2026-10-07: The tier 1 studio is DONE by the stop rule "round 3 finished", not by passing. After
  the skeptic check round 3 holds bars 1-6 and 9; bar 7 fails only on missing data (the
  keyboard-only whole first session was void, r3-s10), bar 8 fails on one color (`#8c8c8c` on
  `#2c2c2c`, 4.15:1, compact-mantine dark ramp). No fourth simulated round: both are a fix plus one
  session. Report: `report.md` (the Write of `report.md` was refused by the harness for a
  subagent on 2026-10-07; content returned to the orchestrator instead -- check it exists).
- 2026-10-07: Next is real people, not simulation: graphty.app with opt-in usage data, 5-8 real
  analysts on the core path, one real screen-reader user. What remains (finding Size and labels,
  3D size misreading, real speech, whether ease gains are real) is beyond one model's personas.
- 2026-10-07: Fix first, in the owning package: focus falls to the page after a sample opens by
  keyboard, after "No thanks" on the usage card, after Escape from shortcuts (app; regression from
  the canvas no longer autofocusing); then the gray-text contrast (compact-mantine).
- 2026-10-07: Element issues to file (high priority, no app workaround): English refusals in
  `session/planning.ts` and graph-io CSV export warnings (return codes); export quality (names
  rendered at target size, real 4x, "Whole graph" camera turns the drawing, selection ring drawn
  into the file); key placement so the key never covers a node (new API, owner); trace the 3D size
  misreading with one 2D/orthographic export of the running club before choosing a fix.
- 2026-10-07: The studio branch no longer merges cleanly with master (Graph.ts, LayoutManager.ts,
  legend.ts, session API report, layouts guide, LegendCard, ColorPickerPanel). Master's #1364 adds
  neutral legend facts including `legend.painted-over`: my recommendation is to withdraw the
  studio's "legend() drops covered blocks" element change and have the app drop blocks carrying
  that fact (no change to an existing method). Owner decides.
- 2026-10-07: PR order to master: #1267 (elementAt, open) alone; the 54-commit interface branch
  `fix/ipad-review-2026-10-06` (local only, not studio work) by its owner; element fixes without
  API change; one PR per public-API door after the owner's yes; compact-mantine fixes; app fixes
  grouped by path; studio docs and tool last. Every visual package needs owner-approved screenshots.
- 2026-10-07: Owner one-way doors listed in `owner-decisions.md`: screenshot legend (#133),
  undirected without arrowheads + `DataManager.directed`, export group rank, legend covered layer,
  `optionsFor` partition values, canvas `aria-label`, 2D zoom unit doc. Seed default is back to
  null (master agrees; #1271 landed tests and docs only).
- 2026-10-07: Verified round 3 credits: "Show all labels" (names task 7 of 8 S, 1.5x path; round
  2 0 of 8 S, 3.5x); menu-to-dialog focus (export by keyboard and screen reader); announcements.
  Partly: Size "+" opens its list (chain fixed, finding Size unchanged 16 of 17); group layouts
  work when found (2 of 5). Not exercised: legend covered layer, 2D Fit, row glyph.
- 2026-10-07: Ease 4.50 -> 4.98 -> 5.28 and wrong turns 1 -> 0 are a pattern, not proof (one
  model's ratings; the tool changed between rounds). Never report them as "above target".
- 2026-10-07: Severity 4 needs a wrong conclusion a reader would act on, judged from what the
  participant could perceive. Round 3's "false done" (Whole graph angle) and 3D-size sev 4 were
  both checklist-literal readings the skeptics overturned.
- 2026-10-07: Never prime graders with the outcome to look for (round 3 named Ava and Farah in the
  grader brief). Name risks to the scorer only.
- Gates (frozen 2026-10-06): each task >= 80%, each dataset half >= 75%; first-time >= 80%; 0
  confirmed sev-4, silent commits, count/drawing mismatches, false "done"; keyboard and screen
  reader; automated a11y; app words at rest <= 50.
- Build defects confirm at one scripted participant; behavior and opinion need two. Simulated
  passes weak, failures strong. A tool mode gets a pilot against a known-good widget first.
- Before a new element API, grow an existing method. Remove before adding; words at rest never
  rise. Graph logic in the element, shared controls in compact-mantine, words in the app.
- Open owner items: usage-data card wording, tooltip delay (500 vs 1000 ms), whether a run's
  suggested style lands above a reader's color-everything layer, whether to start real users.

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

## Tried: worked / did not work

- 2026-09-27..10-02 -- Eight simulated rounds on mocks and a clickable skeleton. Places were right;
  behavior after the click failed. Ease bar 5.5 never met. Round 5 re-measured round 4 because its
  decisions were not drawn (preflight rule); round 6 ran on a check that read 0 pages (every check
  fails on zero items; prove checks by planting a failure); owner caught overfitting from task
  words (two-domain and wording rules).
- 2026-09-30 -- My hybrid structure lost to the owner's refined B. Lesson: bring the owner's own
  proposal to a working state before arguing for an alternative.
- 2026-10-01 -- 23 browsers at once filled swap. Every browser goes through the 4-slot gate.
- 2026-10-02 (round 8) -- Tiering worked: it concentrated failures in tier 1. A pre-run sample
  contaminated every first-time task; removed.
- 2026-10-03 -- Stopped mocking. The mock had become the main source of noise.
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

## Thinking

- **What tier 2 needs before its first round:** tasks and answers for filter, shortest chain,
  notes, more than one table (old T4), weight at load used by every run, rerun on new data;
  returning-user personas; the same frozen bars, pilot-per-build, skeptic check; a runner check
  that keyboard-only personas never click.
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

- Studio: `criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `owner-decisions.md`,
  `rounds/pilot/triage.md`, `rounds/round-{1,2,3}/{plan,preflight,scores,insights}.md`,
  `rounds/round-{1,2}/decisions.md`, `tool/README.md`.
- Digests (2026-10-06): `digests/decisions.md`, `owner-voice.md`, `study-rounds.md`, `tier1.md`,
  `framework.md`.
- Earlier work: `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/` (owner feedback,
  decision log, round 8 insights, structure B); `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/`.
- Director transcripts: `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/`
  (framework synthesis 2026-09-27; round 4 and 6 positions; structure A vs B 2026-09-30; round 8
  triage 2026-10-03). Extraction scripts in `tmp/director/`.
- Builds: round 1 9d6598eea, round 2 4a7a1a7fb, round 3 b7590f8de; served at
  `https://dev.ato.ms:9366/?next`.
