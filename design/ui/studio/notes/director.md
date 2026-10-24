# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-23 (Location in the Fields list ruled: one "+" pick per kind; menu sections
ruled; both issue #3315; earlier: timeline prototype review ruled: `timeline/decisions.md`; location map
prototype reviews triaged into `location-map/decisions.md`).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20 and 2026-10-21; the full earlier text is in this file's git
history.

## Top of mind

- (2026-10-23) LOCATION IN THE FIELDS LIST (issue #3315, owner: the Location "+" does not follow
  the patterns; a gear for the kind, or one "+" per kind). RULED: one "+" pick per kind of
  location. The nodes' "+" offers Latitude, Longitude, Coordinates, Country, Region and City as
  ordinary Fields entries, each its kind's name, one column and a minus, exactly like Label, Weight
  and Time. Deleted: the "Read as" select, the Place type and Within sub-rows, and the "Auto"
  place type in the app. Reasons: every other entry's control is a column and Location's was a
  mode, which is the rule the owner tripped on; a gear fails the latitude and longitude pair (two
  columns cannot sit in one row's picker) and hides a choice that changes the row's shape; the
  kind is a fact of the column, so it belongs in the "+" pick, not a setting; "Within" stops being
  a control because a City entry beside a Country or Region entry already says it. Element work
  (additive, team's call): `ColumnRole` gains `latitude`, `longitude`, `coordinates`, `country`,
  `region`, `city`, set through `data.setRole` like the other entries; the element resolves the
  source (a full pair, else coordinates, else the finest place narrowed by the next coarser one
  listed), reports a detected column with its resolved role (never `auto`), and marks a listed
  role it is not reading with a code (`location.unused`, params naming the source in effect).
  Rejected: the gear (above); an in-row kind select like Figma's effect type (two selects in 240
  px, and no other Fields entry can change its kind in place); a "Location" heading or group in
  the "+" menu (the menu stays flat, so it never mixes grouped and ungrouped items).
- (2026-10-23, issue #3315) MENU SECTIONS RULED: every pick list of catalog choices (Layout,
  Analyze) uses section headings, never indentation, and every row sits under a heading; Layout
  gains four headings from the catalog's `family` fact and loses its indented engine rows.
  See the decision of the same date under "Decisions and reasons" for the build spec.
- (2026-10-22) TIMELINE PROTOTYPE REVIEWED (four lenses on `feat/timeline-prototype`); rulings in
  `timeline/decisions.md`, items TL-01 to TL-32, ten rejected. Severity 1 first: Rerun throws
  `E_DUPLICATE_ID` after any window move for a named run (TL-01); a no-times column is accepted as
  the field and a field change leaves a hidden window with no way to clear it (TL-04, TL-05); a
  stale result reads current when node counts match (TL-03, staleness must compare the window).
- (2026-10-22) Timeline architecture calls: Results, Mode and Step become field playback settings
  (`time.settings`, project key `visibility.playback`) so "Show all time" keeps them (TL-12);
  owner's three values and the `"stale"` default unchanged. One shared histogram brush in
  compact-mantine fixes alignment, body drag, value text and touch size for every caller (TL-16).
  Bins, Auto step, ends, jump-to-end and parsing typed dates are element facts; the dock computes
  no widths (TL-11, TL-18, TL-22, TL-23). Commit 530c136's app-side "Time" precedence is a
  workaround to delete once TL-06 lands.
- (2026-10-22) Held against earlier rulings: no pre-set time field on samples ("nothing pre-done in
  a first session"); no Time chip on the owner-approved Samples dialog; the selection line moves
  over the histogram because a new row breaks "the drawing moves only when the reader asks"; F6
  gains the dock as a sixth region only while it is shown.
- (2026-10-22) LOCATION MAP PROTOTYPE (branch feat/location-map-prototype, build 3137c48f2f):
  four reviews triaged into `location-map/decisions.md`. 23 items to do, 8 rejected or deferred,
  and the open one-way doors for the owner. The worst finding: Map that cannot run said nothing
  and showed "Applied" (three reviews). Fix order: false screens first (refusal, half-filled
  pair, undo), then lost data (detection, antimeridian, unplaced), then legibility (contrast,
  node scale, tiles).
- (2026-10-22) Decided myself: preset views follow the map's facing only while a map frame is
  active, which settles the Isometric item; wheel zoom centers on the pointer only on a map. The
  map picker keeps its home in Graph settings, renamed "Source", with one read-only row in the
  layout form that leads to it. Rejected: clicking a node no longer moving the map (owner's
  2026-10-20 glide), a combined pair picker, location roles at import.
- (2026-10-22) Lesson: the reviewers all asked for a refusal mechanism that already exists
  (`CostEstimate.refusal`, `layout.needs-grouping`). Grep the existing coded-fact paths before
  naming a new element mechanism.
- (2026-10-21) TIER 3 REPORT REWRITTEN with round 1's results; the subagent harness again refused
  `tier3/report.md`, so the text went back to the orchestrator to write. Next move is the owner's:
  whether to fund round 2. Owner list is ELEVEN, not nine: the earlier draft missed the edge
  line-width unit (2026-10-09) and the bare number in rules (2026-10-07); the fold region is
  settled by the owner's 2026-10-10 minor-release ruling (tier 2 report says so).
- (2026-10-21) TIER 3 ROUND 1 CLOSED; THE STUDIO STOPPED at the 1-round cap without meeting the
  bars. Read `tier3/rounds/round-1/insights.md` first. 55 of 56 sessions succeeded; the round is
  at its ceiling: signal is in cost, routes and problems, not success.
- (2026-10-21) Bar 5 fails only on the two severity 3 backlog items carried in (the node Fill "+"
  one-node layer; the folder chain icon painting every cluster one color, reached by 0 sessions).
  No new severity 3 survived the two skeptics. Bar 1's only F is the grading rule's: `#FFD700` is
  drawn yellow but `colorWord` names it "gold".
- (2026-10-21) Fix first, in compact-mantine: `colorWord` returns CSS keywords before hue, so the
  spoken name and the grade disagree with what is drawn. One shared fix serves grading and
  screen readers.
- (2026-10-21) Top design problems (all severity 2): with nothing picked, the Graph inspector's
  Style tab gives no route to node color (9 sessions); a new style line starts at the value
  everything already has (Fill `6366F1`, Width 8 with no unit), so it looks broken; nothing marks
  which rows or nodes a layer paints; color entry is hex first and never says words work.
- (2026-10-21) Keyboard: inspector F6 stop has no focus ring (WCAG 2.4.7); both "Samples"
  controls leave focus behind; 30+ Tabs to a sample card. One persona only; cost, not failure.
- (2026-10-21) Six build defects with repros (see insights): "+" click lost while find list open;
  one hue-bar click closes the picker; ~130 px move on first color with a selection held (same
  family as the backlog `followSelection` vs `setViewInsets` jump); "community" filter misses;
  swatch focus drawn as hex box focus. The wheel-zoom claim is a tool artifact until a 30-notch
  repro.
- (2026-10-21) Light-theme contrast is ONE element (the "Autosave: saved" chip, 2.17:1), not every
  screen as the pre-round draft said. Round 1's 11 voids were one runner mechanism (start inside
  the participant's turn); 0 Sonnet sessions.
- (2026-10-21) Owed before any next round: `score.mjs` bar 4 start from first steps line after
  open; criteria decision on CSS keywords inside the asked hue's band; a measure separating
  avoiding the `<<Layer>>` token from understanding it; read tasks for leading (the answer key
  names most problems graders cite).
- (2026-10-21) Fix order after the go: `colorWord`, bar 6, bar 8, the two carried-in 3s, the
  four severity 2 design problems, the six repro'd defects; raw `>` card before T42 runs.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak. Do not let a
  ceiling round read as "the product is easy".
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk
  those. A docs-only commit never refreezes.
- (2026-10-13) PUSH BLOCKED by SonarQube findings on the studio branch's lines; needs an engineer
  unit with the owner's leave. No bypass trailer.
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

- **2026-10-23, Layout and Analyze section pattern (owner question, issue #3315).** The owner:
  the two menus must share one pattern, indent or headings, and either every item is in a
  section or none is. Today Analyze uses headings (Recent, Rank nodes and edges, Find groups,
  Find paths and edge sets, Measure the graph) with every row under one; Layout uses neither
  for most rows and indents only Force's six engines, with the eight Graphviz engines flat
  among the rest (28 rows, one Tab stop each). Decision: headings for both, every row
  under one, no indentation in any pick list. Reasons: (1) indentation shows one level of
  "child of the row above" and cannot carry the Graphviz engines, which belong to three
  different arrangements, so it would stay partial, which is what the owner rejected; (2)
  Analyze's headings already passed tiers 1-3, and a 28-row list needs landmarks at least as
  much; (3) headings are a Figma-native pattern (layer and plugin menus) and the
  ARIA group-in-listbox pattern Analyze already ships, so this is one built-in, not a new
  control; (4) the element already declares `family` for every layout, so the grouping is the
  app reading an element fact, like Analyze reading result shapes -- no graph logic in the
  app, no element change. Rejected: indentation for both (Analyze has no parent rows to
  indent under, and invented parents become clickable-looking non-options); flat lists with
  no sections (Analyze would lose the landmarks its tree tests depend on); a Force parent row
  that expands (a disclosure inside a listbox, a second interaction rule only this list uses);
  moving engines into the Force form as an "Engine" select (worth considering, but it hides
  engines the owner asked to see in the list and is a separate question); a Filter box on
  Layout (28 rows fit; revisit if a plugin pushes it past about 40). Section words are mine
  to change after a tree test, the pattern is not.
  Spec for both lists: inside the listbox, one `role="group"` per section with `aria-label` =
  its heading, the heading drawn as Analyze draws it today (`Text size="xs" fw={600}
c="dimmed" className="ws-analyze-heading"`, not focusable, not an option); every option
  inside exactly one group; no `pl` or `data-nested` indent anywhere; an empty section is not
  drawn. Layout sections, in this order, from the catalog's `family` fact on each descriptor
  (the app owns the words and order, the element only the fact): `force` -> "Force-directed",
  `geometric` -> "Shapes", `hierarchical` -> "Hierarchy", `special` and any family the app does
  not know (a plugin's) -> "Other". Rows inside a section keep catalog order, so Force's
  default row comes first, then its engines (D3 Force, ForceAtlas2, Spring, Kamada-Kawai,
  Spring Electrical, ARF), then the Graphviz engines of that family with their "Graphviz"
  suffix (Stress, Spring embedder, Multilevel spring). Hierarchy: Tree, Two columns, Columns by
  group, Layered. Shapes: Circle, Rings around a node, Grid, Rings by group, Spiral, Spectral,
  No crossings, Random, Circles, Rings. Other: Keep positions, Map, Clusters, Treemap. Each
  row is unchanged otherwise (check, name, Graphviz suffix, Recommended, slow, dimmed line,
  reason). Analyze keeps Recent and its four headings exactly as they are. Keyboard in Layout:
  the list is one Tab stop (roving tabindex on the checked row, else the first enabled row);
  ArrowDown/ArrowUp move across sections and skip headings, Home/End go to the first/last
  row, Enter or Space opens a row, Esc steps back from the form and a second Esc closes (as
  now). Analyze's keyboard is unchanged; its arrows already skip headings. Command menus (the
  main menu, a row's menu) are not pick lists: they keep dividers between groups and no
  headings. The Style tab's "+ Set another property" and the table's Columns chooser already
  follow the rule (Menu.Label sections, every item in one) and stay. A test asserts every
  `family` in the element's layout catalog maps to a heading, as `words.ts` does for result
  shapes, and a real-input test walks the Layout list by arrows and reads the group names.
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
