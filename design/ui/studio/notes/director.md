# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-29 (tier 4 criteria reviewed and frozen on build 7de2dc4e23).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21 and 2026-10-29; the full
earlier text is in this file's git history.

## Top of mind

- (2026-10-29) TIER 4 (data management, returning users) FROZEN on 7de2dc4e23, served from the
  studio worktree's `tmp/study-builds/tier4-r1-7de2dc4e23` (read-only copy; the main checkout's
  `.study-builds` is off limits to studio agents). One round, 28 sessions (26 pointer + Sam's 2),
  seven bars. Next: the dry run.
- (2026-10-29) The round cannot start until the dry run delivers: every "pilot to confirm" read off
  the frozen build (`real.mjs --gate` now refuses it); three new setups (`gauges-tidy`,
  `pantries-narrowed`, `gauges-narrowed`); `--end` writing `data.json` plus the end-state check;
  a scripted tier 4 walk with wording and axe; path step counts; the words-at-rest budget.
  Engineer items are refusals in the gate where possible -- prose asks have failed three times.
- (2026-10-29) Bars: 1 success (pointer sessions only, 2 of 2 / 3 of 4); 2 false done 0; 3 wrong
  turns median <= 2; 4 severity 3-4 open 0 (end-state check counts); 5 keyboard (Sam S/SD + axe 0
  serious/critical on tier 4 screens); 6 owner's data rules 0; 7 core-task median steps <= key
  path + 3.
- (2026-10-29) Confirmation rule: the screenshot audit confirms only what a screenshot shows;
  hotkey and table-only violations need a scripted repro; expert finding + repro counts.
- (2026-10-29) Wording: search the app's own strings for every prompt word, not a hand list. Found
  "web address" (T60 box label), "stronger"/"farther apart" (T64's option), "picked" (Style card),
  "at least" (filter summary). The tier 4 walk must automate this.
- (2026-10-29) Every start must match the persona's history: a joined, tidied or narrowed project
  is "set up by a colleague or friend", so the person has still never done the act themselves.
- (2026-10-29) A task half the program does for you cannot fail (T63's place, set at load): ask
  the participant to report it, or change the data. T68 starts narrowed so a silent row drop shows.
- (2026-10-23) Location in Fields: one "+" pick per kind (Latitude, Longitude, Coordinates,
  Country, Region, City), each an ordinary entry; element `ColumnRole` gains them (additive).
  Menu sections: every catalog pick list (Layout, Analyze) uses headings, never indentation.
- (2026-10-22) Timeline and location map prototypes ruled in `timeline/decisions.md` and
  `location-map/decisions.md`; severity 1 items first (Rerun `E_DUPLICATE_ID`, no-times column
  accepted, Map that cannot run shows "Applied").
- (2026-10-22) Lesson: grep the existing coded-fact paths (`CostEstimate.refusal`,
  `layout.needs-grouping`) before naming a new element mechanism.
- (2026-10-21) Shaders redesign lesson: start a redesign from the user's questions, not the old
  structure (`design/rendering/shader-studio/decisions-v2.md`).
- (2026-10-21) Tier 3 closed after 1 round, 55 of 56 successes: signal is in cost, routes and
  problems, not success. Same-model participants: a failure is strong evidence, a pass is weak.
- (2026-10-21) Owed from tier 3: `colorWord` CSS keywords fix in compact-mantine; the four
  severity 2 Style problems; six repro'd defects (`tier3/rounds/round-1/insights.md`).
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk
  those. A docs-only commit never refreezes.
- Owner items open: eleven, all breaking, defaults or a saved-file format (`owner-decisions.md`).

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
- **2026-10-21, tier 3 report after round 1.** Rewrote the report around round 1 (bars table per
  round, per-task table, learnings in insight order, changes by package with whether round 1
  confirmed them). Reasons for the calls in it: bar 1's F is reported as the rule's, not the
  reader's, but stands (frozen rule); the earlier "contrast fails on every screen" is corrected to
  one chip because round 1 measured it; the owner list recounted entry by entry against owner
  rulings (eleven; fold region dropped as settled 2026-10-10); a Cube synonym listed as rejected
  (one task's word). Next steps put instrument work (bar 4 start, keyword-in-hue rule, token
  measure, leading check, start-before-turn) ahead of product fixes because it costs no sessions.
- **2026-10-21, round 1 closed, studio stops.** Accepted the skeptic-settled insights as the
  round's record: no new severity 3; bar 5 held open only by carried-in backlog items; bar 1's F
  stands under the frozen rule though the reader was right. Reason: changing a frozen rule after
  seeing results would make the grade mean nothing; the rule question goes to criteria between
  rounds instead. The next fix list leads with `colorWord` (shared, fixes grade and speech), then
  bars 6 and 8, then the four severity 2 design problems.
- **2026-10-21, tier 3 report with round 1 not run** (superseded the same day). Bars 6 and 8 not
  fixed before round 1 (round cannot pass by plan; a fix restarts the walks); the tool's 900 x 700
  gap did block the round.
- **2026-10-21, dry run pass 3 on 758b8e8081 (`tier3/dry-run-r1-3.md`).** 141 lines, 0 (a). Not
  (a), with reasons: the selection-held jump (layer graded from `styles.json`, names only as read
  from screen, Fit recovers, T41's success path already needs Fit after the owner's glide); the raw
  `>` threshold card (T42 only, `>=` or Remove reaches the line); T46 B's key dropping Louvain
  after Undo (only after reopening an app-exported GraphML; T48 B's plain-file Replace and Undo
  keep the key, `q-findlayer-replace-undo/10.png`); the unset Width Enter (a width over 8, the
  success step, works); T42 A's Filter-to focus (a click reaches the box). T48 A's PASS INCOMPLETE
  is covered by `758c-pointer` on the same build. Settled in `decided.md` 2026-10-21: a held
  selection asks for nothing after the pick (narrows the 2026-10-20 glide). Left (b): whether a
  different file offers Replace on Control+O (T50 B). No API change.
- **2026-10-20, dry run passes 1 and 2 on 7d87760756 and 6de5f95d12** (summarized 2026-10-21; full
  text in git history and `tier3/dry-run-r1-1.md`, `-r1-2.md`). Five units, all fixed and held: a
  project opens with its look across a channel rename; the table names community groups as the key
  does; Replace with the same file keeps hand-picked layers; a layer from a selection takes its
  conditions before a look (`addRow` admitted what `update` refused); Undo across Replace redraws
  from the layers. Each settled in `decided.md` 2026-10-20.
- **2026-10-20, fifth review of the tier 3 criteria, frozen** (summarized 2026-10-20; full text in
  git history). The round 1 build must hold golden (checkable by `--is-ancestor f9d8b44b9`); round 1
  verdict rule; design problems confirmed across two halves; colors by `colorWord`; core halves need
  2 S/SD without Alex and Maren; backlog severities; preflight 4 defines grading-spoiling and Sam's
  keyboard blocks; missing screens and `spoken.json` are gate refusals. Not taken: dropping T37 from
  the judged set; SD for T50 B. Which build counts is a rule, not an owner question.
- **2026-10-19, dry-run triage on e3c5bca8e6 (`tier3/dry-run-r1-5.md`)** (summarized
  2026-10-21; full text in git history). Settled in `tier3/decided.md`: the drawing moves only when
  the reader asks; Which nodes with no condition opens on its list; Escape keeps typed text and
  clears a selection only on its inspector; Tab and remove never pull focus back; F6 cycles five
  regions; a node is called by its label; Control+A selects all. No API change.
- **2026-10-19, fourth review of the tier 3 criteria, frozen on 1fa51e2b0b** (summarized
  2026-10-20; full text in git history). Bar 2 states T49's exception; bar 5 unscored when a walk
  skipped a success-path screen; bar 6 checks typing after "Starts with"; bar 7 confirmed by a
  `--keys` repro or two Sam sessions; `spoken.json`; docs-only commits never refreeze; the dry run
  walks only planned halves; gate keyed by half; T51 to 4, T44 to round 2.
- **2026-10-17..18, earlier tier 3 criteria reviews and dry-run triages r1-1 to r1-4**
  (summarized 2026-10-20; full text in git history, the dry-run files, the criteria change log and
  `tier3/decided.md`). The exit test and `decided.md` came from the third review; bar 4 fixed at
  10; bar 5 confirmed by repro or measurement only; five walk screens added; any community method
  on T46-T48; T47/T48 hold only on the folder or several route; bar 4 pointer sessions only; bar 6
  both themes; key-and-drawing on every last screenshot. Triage rulings (Tab takes a highlighted
  option, cards open with the list closed, "+" never changes the drawing, condition card for the
  filter step, color words by CSS keyword) are in `decided.md`.
- **2026-10-17, first review of the first-use styling drafts.** T48 core at 6; unjudged tasks
  never pass; the dry run has no pass cap (owner's "until clean"). Size stays 56.
- **2026-10-16, combined Style panel and bulk iteration 7.** See Top of mind. Frozen build
  `tier3-bulk7-457aa9f0f2` (servherd design-studio-tier3). BoundValue for single and bulk
  (SpreadValues deleted); the Layer token in guillemets, purple `--cm-text-component`, weight 600,
  via VariablePill `tone`; color sets: strip of up to 4 hard stops or a gradient, a line of chits up
  to 6, else 5 and "+N", gray Other last; count in the spoken name. Spec `tier3/bulk-edit-plan.md`.
  Element adds (team): `present` leaf, `data.valueCounts`. `realignRule` maps through `all`, so an
  added card survives a re-run.
- **2026-10-14, round 6 (owner review of build 5).** Decided in `tier3/decisions-round-6.md`; every
  element change additive, no new rule text syntax. Check `git log` against owner feedback first:
  eight notes were already fixed.
- **2026-10-12..13, tier 3 build iterations 1-3** (full text in `tier3/design.md` and
  `tier3/iterations/{1,2,3}/review.md`). Two row kinds only, layer and folder; per-group colors are
  value-table entries, "New layer for <value>" makes an ordinary layer. Unset (minus, Clear) and
  cover (an entry set to nothing) are two acts. Both-kinds layers are element style-tree rows; the
  app reads only `styles.tree()`. One settings button per kind section (Figma's Type settings), not
  per property. A layer lists only its own entries. Kind change keeps both parts. The app sets
  `startingRows: true` and `runPlacement: "top"` (consumer choice; element defaults neutral).
  Label size in screen pixels is an additive element option. Before naming an element addition,
  read the API report (`styles.agreement`, `session.transaction` already existed).
- **2026-10-11, tier 2 close.** Round 5 re-run valid (55 of 55 on 8c015b806); the tasks hit their
  ceiling; owner list cut to three (bare numbers in rules, edge width unit, camera in the project
  file). The report text goes back to the orchestrator: the Write tool refuses a subagent writing
  `tier2/report.md`.
- **2026-09-26..10-11, earlier (summarized; git history and `tier2/rounds/*/decisions.md`).** Owner:
  Figma is the paved path for chrome; tiers, tier 1 first; build the real app and study it; element
  neutral about presentation. Tier 2: gate inside `real.mjs --start`; briefings name file and kind
  only; one matcher for find and rules; Shift-click in the element; labels overlap is additive
  declutter, the team's call.

## Tried: worked / did not work

- 2026-10-29 (tier 4 freeze) -- Worked: searching `graphty/src` strings for each prompt word; it
  found four echoes the hand-written avoid list missed. Worked: starting the changed
  `volunteers.txt` setup on the frozen build before committing it (a PageRank layer coloring 24
  people, no SETUP FAILED). Did not work (found by review): a roster whose per-task starts were
  right but whose persona histories never mentioned those files.
- 2026-10-21 (round 1) -- Worked: two independent skeptic checks with a drop/weaken rule; they cut
  every new severity 3 to 2 and caught a tool artifact (wheel zoom from one synthetic event) and
  an automation artifact (storage notice). Did not work: tasks whose wording leads (the answer key
  describes the problems graders cite; "Cube", "clusters" in B prompts) and a success bar on tasks
  the model always finishes -- 55 of 56 told us little.
- 2026-10-21 (report after round 1) -- Worked: re-reading every "For the owner" heading in
  `owner-decisions.md` and the tier 2 report's owner section instead of copying the earlier list;
  it found two open items the earlier draft dropped and one it should have dropped. Worked:
  checking each pre-round claim against round 1's measurement (contrast was one chip). Did not
  work: the Write tool again refused `tier3/report.md` from a subagent; the text goes back in the
  return value. Do not retry it next time; write it straight into the return.
- 2026-10-21 (tier 3 report) -- Worked: checking the round folder and the briefing folders before
  writing (56 briefings, no `01.png` anywhere) so the report did not invent a round. Worked:
  reading `owner-decisions.md` entries for an owner answer before listing them (the number box
  one was answered on 2026-10-10; the fold-region one may be covered by it, so it is listed to confirm). Did not work: writing `tier3/report.md` from a subagent; the
  harness refuses report files from subagents. Return the text instead.
- 2026-10-21 (dry run pass 3) -- Worked: reading the element's camera code before classing the
  most-walked jump: `followSelection` plus `setViewInsets` explained "only with a selection held"
  and the 140 px (half the key's inset) in ten minutes, so the backlog item and the decided entry
  name a cause. Worked: checking an unjudged task's (a) candidate on round 1 data already on disk
  (T48 B's plain-file Replace and Undo kept the Louvain key) instead of a new walk. Worked:
  `session.json` commits showed T48 A's "unwalked" success path was walked on the same build by an
  earlier session. Worked: the rows file plus generator again (141 rows, per-task counts asserted).

- 2026-10-20 (dry run passes 1 and 2, criteria review; summarized 2026-10-21, full text in git
  history) -- Worked: a Node repro against the built element before writing a unit (the problem
  code led to the cause in minutes); walking an unjudged task's (a) candidate myself; reading
  `answers.md` grading before classing spoils; one rows file plus a generator with asserts for
  every triage; reading the design-studio skill before taking a red-team claim. Did not work: a
  pass file name reused (history in git); prose counts copied from an earlier pass; "does not pass
  until" sentences in preflights (gate refusals instead).
- 2026-10-19 (r1-5 and criteria review; summarized 2026-10-21) -- Worked: reading each fix
  commit's message before classing origin (two lines named 26 of 37 regressions); grepping for a
  decided rule's code before calling a defect a regression; reading `gateCheck` before taking a
  red-team claim; recounting the roster by script. Did not work: a new build for a docs-only
  commit (it reset the dry run's count).
- 2026-10-18 (summarized 2026-10-20) -- Worked: checking reviewer claims against the tool before
  writing a rule; counting input lines per task against the triage rows; reading `session.json`
  (`commit`, `uncommittedChanges`) before classing; grepping the on-screen string to find the
  owning file. Did not work: carrying a known wrong bar "between rounds" across four builds;
  launching more pilots than browser slots; judging a find-box Escape fix alone.
- 2026-10-17 (summarized 2026-10-20; full text in git history) -- Worked: reading
  `owner-decisions.md` before classing (six "defects" were decided behavior); triaging by mechanism
  (490 lines into 21 groups); grepping on-screen strings to find the owning file; lists, not tables,
  for long triages; walking reviewers' proposed screens by hand before adding them. Did not work:
  judging a focus fix alone; a recovery that pressed Escape and dropped a card; counting "one by
  one" toward T47's route bar.
- 2026-10-11..13 -- Worked: the gate inside `real.mjs --start`; reading the red team against source;
  measuring before classing. Did not work: counting steps differently for key and participants.
- 2026-09-27..10-10 -- Worked: root-causing in source; one change per path. Did not work: a fix
  nobody grepped for siblings.

## Thinking

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
