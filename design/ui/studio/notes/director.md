# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-30 (tier 4 round 1 closed at the round cap; insights settled).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-29 (three times) and 2026-10-30 (four times);
the full earlier text is in this file's git history.

## Top of mind

- (2026-10-30) TIER 4 ROUND 1 CLOSED; the studio stopped at its 1-round cap without meeting the bars on
  build 79ed770292. Holds: bar 1 success (25 of 26 S/SD), bar 4 (0 severity 3-4 after the skeptic check).
  Fails: bar 5 keyboard (axe `aria-valid-attr-value`, table tab names a missing panel), bar 6 (joined
  source row clips the approved "17/19" ratio), bar 7 cost (T61 ~12 inputs vs path 7). Bars 2 and 3 fail
  only as frozen and are contested. Source: `tier4/rounds/round-1/insights.md`.
- (2026-10-30) FIRST fix before any next round is the study tool: `real.mjs` prints `tooltip: null` when
  hover opens a popover; 4 participants believed it over the screenshot, producing false findings and two
  T64 wrong turns. A tool line that contradicts the screen is worse than no line.
- (2026-10-30) Most severe product problem (sev 2): the join preview does not show what Join will do --
  the unknown-end row is untagged and the repeated key tagged as added. Preview must equal result.
- (2026-10-30) Pattern: choices come after the act with a default already applied (unknown end -> "Add
  nodes" after Join; new filter card starts on Hide; "Leave out" does not say it deletes). Ask before, or
  default to the non-destructive choice.
- (2026-10-30) Pattern: one fact drawn two ways (time set but header glyph says text; place roles unmarked
  on headers; filter chip counts on two bases) makes people open a second menu to check. Costs steps.
- (2026-10-30) Bar 6 fix and problem 8 are one layout fix on the joined source row (name and ratio both
  clipped); also fix "17 of 19 joined" beside 18 edges.
- (2026-10-30) Bar 5's axe failure was known before the round and backlogged under the frozen rule; that
  guaranteed a failed bar. Next tier: fix known bar-failing defects before freezing, not after.
- (2026-10-30) Answer-key definitions can manufacture failures (r1-s08's "false done" was a right answer
  against a column-type definition). Review the key against the product's model before the round.
- (2026-10-30) Grading counted hovers inconsistently; define wrong turn as an input before success only.
- (2026-10-30) Post-round fix pass owns: tool popover report, join preview, row layout (bar 6), axe tab
  panel, time-sets-column-kind, the six decided-not-built team decisions. None needs the owner.
- (2026-10-30) A walk on an earlier build stands when `git diff <earlier> <frozen>` over source is code the
  route never reaches. Run that diff FIRST in any triage.
- (2026-10-29) A fix that gives an answer a new input must move every count and cache derived from it.
- (2026-10-29) Bars: 1 success (pointer only); 2 false done 0; 3 wrong turns median <= 2; 4 severity 3-4
  open 0; 5 keyboard (Sam S/SD + axe); 6 owner's data rules 0; 7 core median steps <= key path + 3.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak; two skeptics
  weaken more than they confirm, so settle every score through them.

## Priorities and values

- **A newcomer finishes the core path.** The average first-time user before specialized features;
  the owner's 2026-10-02 instruction and the reason tiers exist.
- **Small and coherent over complete.** One home per feature, one word per meaning, one pattern
  per job. Personas validate the design, they never generate features (owner, 2026-09-26).
- **Evidence over taste.** A departure from Figma's conventions needs a graph fact, a WCAG
  criterion, a named failing workflow, or a field convention. I break ties with the observed
  behavior of two or more participants, not opinions.
- **Truthful screens.** A value never misstates what it describes; every count is computed from
  live state or removed; a result the user cannot see is a fatal flaw (owner 2026-09-30).
- **The element owns the graph.** graphty-element returns neutral facts; the app writes the words
  and arranges them. A missing capability becomes an element change, not an app workaround.
- **Honest measurement.** Simulated participants share one model's blind spots: a failure is a
  strong signal, a pass is weak. Compare rounds to each other, not to published norms.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- canvas and legend change the
  moment the step commits.
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.** A count that hides something offers
  the way out beside it. A list answers with names, not counts.
- **Nothing pre-done in a first session; no first-run interface; no unbuilt item drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Screen at rest with a graph loaded: about 50
  words of app text.
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead; after adding a field, focus is where the
  next keystroke belongs** (2026-10-17: three adds failed this on one build).
- **The key and the drawing never disagree** (2026-10-17: now an audit check on every last
  screenshot).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- **2026-10-30, tier 4 round 1 closed.** Stopped at the 1-round cap with bars 5, 6, 7 failing (2, 3 contested).
  Reason to stop rather than extend: the cap is the rule, and the top blocker (study tool misreporting popovers)
  must be fixed before more sessions are worth running. Evidence: `tier4/rounds/round-1/insights.md`.

- **2026-10-30, tier 4 report** (returned as text; to be committed as `tier4/report.md`). Written with no
  session results: the round has not run. Reported the dry run pass by pass (318, 144, 103, 106, 93, 83, 81, 96
  rows; 23, 4, 1, 3, 3, 7, 5, 0 fix-now), the five data screens that misstated the data (Data source card dropped
  every edge, export scope counted nodes on the edge table, Data weight never read by runs, "6 rows refused" with
  all 361 edges loaded, unknown-end mark on the wrong site), all fixed in element or graph-io. Decided: the axe
  tab defect stays backlog under the frozen rule (changing a frozen rule or build after measuring starts makes
  the bar meaningless); the six unbuilt team decisions wait for the post-round pass; no owner decision from tier
  4; the fix-pass cap overrun is told as a fact, not asked. Next steps in order: two tool defects, wording check,
  path recounts, words budget and bar 6 references, T66 A walk, round 1, post-round fix pass.
- **2026-10-30, tier 4 dry run pass 8 on 79ed770292** (`tier4/dry-run-r1-4.md`; summarized 2026-10-30): 96 rows,
  0 fix-now, session-ready; the Select card count held (T65 A 4 of 14 with 4 selected). (b): Replace that looks
  like a join. New decided entry: an earlier build's walk stands when the source diff is code the route never
  reaches (T63 B's keyboard walk on a53beb7179).
- **2026-10-29..30, tier 4 dry runs passes 1-7** (summarized 2026-10-30; full text in git history and
  `tier4/dry-run-r1-1.md`, `-r1-2.md` at 028483e572 and 8f1aa15875, `-r1-3.md` at cc562d52cd, aa8763fc28 and
  b37f90161a, `-r1-4.md` at 6ac9f2eb57). Pass 1 (0ffeae2ef5): 8 units (source-row chips, a false refused-row
  issue, Add data... to the join screen, one kind drawing, a date condition card, the Data source card's
  `side: "nodes"`, Export scope, a weight given after the load). Pass 2 (037e96e9bb): 3 units (Select within the
  picture, run reuse reads the Data weight, result rows named by `nodeName`) and the reversal of pass 1's Select
  entry. Pass 3 (ff17391bb1): U1, the Select card's count (a regression of pass 2's fix). Pass 4: U1 again plus U2,
  an unknown end's warning on the end that is unknown (`params.ends`, additive). Pass 5 (bccf8fe47f): U1 refixed on
  `selectsOverGraph` (355022569a), reverted unfinished. Pass 6 (a53beb7179): U1 as `git revert 0b1175dabc`, plus
  "a unit is taken back only for a regression its re-walk shows". Pass 7 (a53beb7179 again, nothing built): U1
  unchanged; decided entries: an issue fix that removes data says so and is not a filter (T66 B Leave out), an
  earlier build's evidence is judged on the frozen build's walk, no re-pilot while units are unbuilt. U1 then built
  as 71230abff1, re-walked to the end, frozen as 79ed770292. Not (a) across them: answer-key-graded cosmetic and
  keyboard-only rows, decided-but-not-built team entries, T61's repeat resolved on the join screen (b), Replace of
  the same file, T63 B's place chips, T68 B's source-row Export, PASS INCOMPLETE notes whose routes were walked.
- **2026-10-29, tier 4 criteria reviewed and frozen** (three reviews: researcher, user advocate,
  red team; they agreed on most points). Taken: grade from step log and end-state records
  (`data.json`), not the last screenshot alone; end-state check in bar 4; audit confirms only what a
  screenshot shows, expert + repro counts; bar 1 pointer-only with stated arithmetic; axe in bar 5;
  new bar 7 (core median steps <= key path + 3, fixed before data); gate refuses "pilot to
  confirm"; fix coverage reported. Tasks: T60/T64/T65 echoes removed; T65 B moved to the gauges
  (yes/no, number, date) on a tidied start; T63 must name the place columns; T62 needs a changed
  kind; T68 starts narrowed; Sam takes T61 A (file chooser, join screen) instead of T62 A; histories
  rewritten so each start is the person's or a colleague's saved project; 28 sessions. Not taken:
  a new single "lat, lon" data file for T63 (re-walks every gauge setup; the report requirement
  gives the half a fail mode at no cost); starting T60 B from an open project for the Sources "+"
  door (it would merge two networks and muddy the counts; reported as not re-tested). Build:
  rebuilt `graphty/dist` at 7de2dc4e23 (the dist on disk was 90e0f8470c, before the SonarQube
  refactor) and copied read-only.
- **2026-10-23, Layout and Analyze section pattern (issue #3315)** (summarized 2026-10-29; full
  spec in git history). Headings for both lists, every row under one, no indentation; Layout's
  sections come from the catalog's `family` fact (Force-directed, Shapes, Hierarchy, Other), the
  app owning words and order. Rejected: indentation, flat lists, an expanding Force row.
- **2026-10-21, tier 3 round 1, its report and dry run pass 3** (summarized 2026-10-29; full text in
  git history, `tier3/dry-run-r1-3.md` and the tier 3 report). Round 1 closed on the skeptic-settled
  insights; bar 1's F stood under the frozen rule (a frozen rule changed after results makes the grade
  mean nothing); the report put instrument work ahead of product fixes and recounted the owner list
  entry by entry. Dry run pass 3 (758b8e8081): 141 lines, 0 (a); a held selection asks for nothing
  after the pick (narrows the glide).
- **2026-10-20, dry run passes 1 and 2 on 7d87760756 and 6de5f95d12** (summarized 2026-10-21; full
  text in git history and `tier3/dry-run-r1-1.md`, `-r1-2.md`). Five units, all fixed and held: a
  project opens with its look across a channel rename; the table names community groups as the key
  does; Replace with the same file keeps hand-picked layers; a layer from a selection takes its
  conditions before a look (`addRow` admitted what `update` refused); Undo across Replace redraws
  from the layers. Each settled in `decided.md` 2026-10-20.
- **2026-09-26..10-20, earlier tier 2 and tier 3 decisions** (summarized 2026-10-29; full text in
  git history, `tier3/decided.md`, `tier3/design.md`, `tier3/bulk-edit-plan.md`,
  `tier3/decisions-round-6.md`, the tier 3 criteria change log and `tier2/rounds/*/decisions.md`).
  Kept from them: the round 1 build must hold golden; design problems confirmed across two halves;
  docs-only commits never refreeze; bar 4 pointer sessions only; key-and-drawing on every last
  screenshot; Style rows are layers and folders only, per-group colors are value-table entries;
  unset and cover are two acts; the app sets `startingRows` and `runPlacement` (consumer choices);
  before naming an element addition, read the API report; the owner judges by interaction
  consistency; Figma is the paved path for chrome; tiers, tier 1 first; the element is neutral
  about presentation.

## Tried: worked / did not work

- 2026-10-30 Did not work: freezing with a known bar-failing defect (axe tab panel) backlogged -- the bar failed by construction. Worked: two independent skeptics on scores -- they dropped or weakened all four severity 3 candidates and found the tool defect.

- 2026-10-30 (tier 4 report) -- Worked: reading `rounds/round-1/tool-dry-run-2.md` and the engineer's and
  researcher's Top of mind before writing; they held the open pre-session items the triages did not. Worked:
  `git log origin/master..HEAD` minus docs commits plus `git diff --stat` per package to list what changed by
  package; grepping the source for each team decision's words to tell built from unbuilt; counting pilot
  `session.json` files per pass folder for the size of the dry run. Did not work: Write of `tier4/report.md` from
  a subagent (the harness refuses report files; known since tier 3, still tried). Return the text.
- 2026-10-30 (dry run passes 7 and 8; summarized) -- Worked: `git diff --stat <previous build> <frozen build>`
  over the source first; `git log` first; a per-task `session.json` buildStamp loop; re-reading route.jsonl `out`
  lines on the frozen build's walk; looking at one fix screenshot myself. Did not work: grep -o with long
  `.{0,N}` spans (ugrep limit; use -F and cut); the workflow reusing file names and pass numbers.
- 2026-10-29..30 (dry runs passes 1-6; summarized 2026-10-30, full text in git history) -- Worked: `git log`
  on rejected-fixes.md and the reverts before reading rows; `git diff <revert> HEAD` on a fix's files to justify
  a revert-the-revert; grepping every earlier triage for each row's key words (most backlog rows are repeats);
  `session.json` buildStamp per walk folder; reading the element before classing (`selectedBy`, the source
  leaf's `side`, `loadedWeight()`, `countsNow`'s cache key); checking a claim against the data file; reading
  the answer key's newest commit; `git merge-tree` before a refix. Did not work: the pilots' "BLOCKS keyboard"
  label (friction once checked); claiming repeats "word for word" unchecked; numbering units before the last
  demotion; copying a table header by line number; the workflow reusing `dry-run-r1-3.md`.
- 2026-10-29 (tier 4 freeze) -- Worked: searching `graphty/src` strings for each prompt word; it
  found four echoes the hand-written avoid list missed. Worked: starting the changed
  `volunteers.txt` setup on the frozen build before committing it (a PageRank layer coloring 24
  people, no SETUP FAILED). Did not work (found by review): a roster whose per-task starts were
  right but whose persona histories never mentioned those files.
- 2026-10-21 (round 1, its report, dry run pass 3; summarized 2026-10-29) -- Worked: two
  independent skeptic checks with a drop/weaken rule; re-reading every owner heading instead of
  copying a list; checking pre-round claims against the round's measurement; reading the element's
  camera code before classing a jump; `session.json` commits to prove an "unwalked" route was walked.
  Did not work: leading task wording and a success bar the model always meets (55 of 56); writing a
  report file from a subagent (the harness refuses it; return the text).
- 2026-10-19..20 (summarized 2026-10-29; full text in git history) -- Worked: a Node repro against the
  built element before writing a unit; walking an unjudged (a) candidate myself; reading `answers.md`
  grading before classing spoils; one rows file plus a generator with asserts; reading each fix commit's
  message before classing origin; grepping for a decided rule's code before calling a regression;
  reading `gateCheck` before taking a red-team claim. Did not work: a reused pass file name; prose counts
  copied from an earlier pass; "does not pass until" sentences in preflights; a new build for a
  docs-only commit.
- 2026-09-27..10-18 (summarized 2026-10-29; full text in git history) -- Worked: root-causing in
  source; grepping on-screen strings to find the owning file; reading `owner-decisions.md` before
  classing; triaging by mechanism; lists, not tables, for long triages; checking reviewer claims
  against the tool. Did not work: judging a focus fix alone; a fix nobody grepped for siblings;
  counting steps differently for key and participants; launching more pilots than browser slots.

## Thinking

- **2026-10-30, tier 4 report:** for the second tier running, the report goes to the owner with the round not
  run and the instrument as the thing holding it back (tier 3 ended the same way). The product work was real:
  five screens that misstated data are fixed where the facts are computed. But the tool's own readiness (matcher,
  replay wording, path units, word budget) was checked only after the product dry run had finished, so it lands
  last on the critical path. Next tier: run the tool dry run FIRST, in parallel with the expert walkthroughs,
  before any product pilot.
- **2026-10-30, dry run pass 8:** the dry run ended clean once the one real unit was built and its re-walk
  finished; four of the seven passes after pass 3 were spent on process, not product (reverts for unfinished
  re-walks, a re-pilot of an unchanged build, evidence on the wrong build). Next tier: the dry-run loop needs
  three machine checks before any pilot runs -- the build changed, every unit landed, and the diff from the
  last judged build -- and the evidence rule should key on that diff, which is what pass 8's entry does by hand.
  The 77 repeat backlog rows are the decide-and-fix loop's first list; most are keyboard and screen-reader rows
  (F6, Tab in lists, dialog focus), which Sam's sessions will meet first.

- **2026-10-29..30, dry runs passes 1-6 (summarized 2026-10-30; full text in git history):** two stages with
  no shared rule (fix reverts an unfinished re-walk, triage treats it as nothing found) cost a pass each time;
  a rule binds only the stage that reads it, so it goes in decided.md. The answer key drifted into a list of
  workarounds: grading notes written for wrong screens; key-matching should not run before the triage, or its
  new notes come to me as untriaged defects. Both regressions shared one shape: a fix gave an answer a new
  input and the numbers and caches derived from it kept reading the old one; list every derived number and
  cache key in acceptance. A team entry written after a freeze is an untriaged fix request.
- **2026-10-29:** six of 23 fix-now rows came from two review fixes meeting on one row (R9's chip,
  R11's counts) or opening a new door (R14's source-row Export). A review fix that adds a control to a
  shared row or a new door to a shared dialog needs its neighbors walked before the freeze.

- **2026-10-21, after round 1:** the cheapest next round is one where the instrument moves first.
  Every pre-round claim I carried as a measurement (contrast on every screen, the private-window
  notice gone with a disk profile) was narrower or different once the round measured it. Report
  pre-round numbers as previews, and expect the round to restate them.
- **2026-10-21, round 1:** success is saturated with same-model participants, so the next tier's
  bars should score cost (steps over key, wrong turns, routes) and named problems, not completion.
  The cheapest high-value fixes are shared ones where the product's words disagree with its
  drawing (`colorWord`) and where an action gives no visible result (default-valued new lines).
- **2026-10-21, tier 3 report:** a whole tier of work reached the owner with no round run, and
  the thing holding it back is the instrument again, as at tier 2's end. The tool has now had two
  readiness checks, and each found a bar it claimed to read and did not. Before the next tier,
  build the tool's planted cases from the criteria table row by row (each bar x each size x each
  theme), so a missing cell is a failing test, not a reviewer's find.
- **2026-10-21, dry run pass 3:** the most-walked defect came from two settled rules meeting (the
  owner's glide to a pick, the drawing staying put when a key arrives). Neither rule was wrong; the
  element had no rule for the moment after the pick. When two decided behaviors both own the
  camera, write down which one wins in the overlap before anyone fixes either.

- **2026-10-20 (summarized 2026-10-21):** two halves of one verb disagreeing (`addRow` vs
  `update`, Undo restoring layers but not the drawing) is the element's recurring defect shape;
  pilot the next verb on any newly accepted state. A merge from upstream is an untriaged fix pass:
  walk one file saved by the previous build. A frozen document naming a build needs a
  script-checkable rule.
- **2026-10-19, r1-5:** the regressions are not spread out; they come from a fix that answered one
  complaint by flipping a single switch the complaint's neighbors also depend on (when to frame,
  whether the list starts open, where focus goes after a write). Before a fix group lands, list
  the routes that cross the switch it flips and re-walk those, not the task that reported it.
- **2026-10-19, criteria review:** a rule the tool does not enforce is a wish. Three of this
  review's findings were rules already written (three walks, keyboard walk, five walk screens)
  that the gate or the walk never checked. When I write a preflight rule, name the script line
  that refuses it and the planted case that proves it, or list it as owed.
- **2026-10-17..18 (summarized 2026-10-21; full text in git history):** criteria reviews and
  readiness passes r1-2 to r1-4 kept finding instrument gaps before product gaps; build planted
  cases from the criteria table, and walk unwalked screens before trusting a bar.
- **2026-10-11, tier 2 end:** the instrument, not the product, limited what we learned. Simulated
  readers succeed where tasks send them; fixes sat where tasks did not go.
- **2026-10-12, owner review 1:** the owner judges by interaction consistency, not model fidelity.
  Ask of every new row or control: does a reader learn a rule that applies nowhere else?
- **When three lenses land on one defect,** the cause is usually one gate in one file. Every
  `ponytail:` note in the app saying "the element has no X" was a finding three experts later
  reported; read those notes at review time.
- **When a fix adds a column in 240 px,** count what each column holds before building.
- **Truth and loss outrank polish.**

## Sources

- Tier 4: `tier4/{criteria,tasks,answers,roster,decided,backlog,rejected-fixes}.md`; round 1 plan and tool dry
  runs `tier4/rounds/round-1/{plan,tool-dry-run-1,tool-dry-run-2}.md`; reviews `tier4/review/*.md`. Dry run triages
  (summarized 2026-10-30; each file header names the earlier triages it replaced): pass 8 `dry-run-r1-4.md`
  (79ed770292), pass 7 `-r1-3.md` (a53beb7179), pass 6 `-r1-4.md` at 6ac9f2eb57, pass 5 `-r1-3.md` at aa8763fc28,
  pass 4 `-r1-2.md` (ff17391bb1), pass 3 `-r1-3.md` at cc562d52cd, pass 2 `-r1-2.md` at 8f1aa15875, pass 1
  `-r1-1.md` (0ffeae2ef5). Pilots under the main checkout's `tmp/design-studio/tier4/{r1,r1d1,r1d2,r1d3}/pilot/`;
  generators `tmp/director-dryrun*/` in the studio worktree.
- Tier 3 study: `tier3/{criteria,tasks,answers,roster,decided}.md`; dry runs `tier3/dry-run-r1-3.md` (build 758b8e8081, 2026-10-21, pilots in `tier3/rounds/r1d2/pilot/`; the 2026-10-18 pass on 5bd16cda6e is at b296635060), `tier3/dry-run-r1-1.md` (build 7d87760756, 2026-10-20; the 2026-10-17 pass on 58556989e8 is at 7c241de4b), `tier3/dry-run-r1-2.md` (build 6de5f95d12, 2026-10-20, pilots in `tier3/rounds/r1d1/pilot/`; the 2026-10-17 pass on ed4351b258 is at 98b7f9a4df), `tier3/dry-run-r1-4.md` (build 6dd0b00bd7, pilots in `tier3/rounds/r1d2/pilot/<task>/<route>/`); tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews: `notes/{researcher,user,redteam}.md` (2026-10-17: 05f4ee91a, 863ebb9a8,
  de16901f7; 2026-10-19: c1ebeeff4, 34b1e3ce0, 881ad2550; 2026-10-20: 16b22cb0d, 70575b0cf, 3bdcc279b); stopped pass 5 in `tier3/rounds/r1/pilot/`; my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
