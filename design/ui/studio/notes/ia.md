# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

1. (2026-11-05, tier 6 round 1 closed) No reader has met the Assistant: all 24 sessions were
   refused at the start, so every finding comes from four expert walks and reading the frozen
   source. It says what is on screen, never what a reader paid. Claim nothing yet about whether
   readers find, read or trust the panel; the sessions wait on the owner's Gemini cap decision.
2. (2026-11-05) Scope is the Assistant's most important structure: the line at the composer
   decides what a message is about, and selection is shared with the whole app. A model's
   selection survived an Undo, narrowed "Color the nodes by role" to 5 nodes, and a later removal
   took 1 of 16. Held at severity 2 because the reply and the scope line said so; a true label did
   not stop the surprise. Watch whether readers read that line, set 2 px below body text.
3. (2026-11-05) The change line is the one home for what a turn did, so every effect needs a line.
   "Selected these five nodes" has none: the element's `results` `top` action emits no selection
   effect, so the app has nothing to word. Fix in graphty-element, additive, then the app words it.
4. (2026-11-05) One result, one name. Influence and PageRank, Degree and Connections sit on one
   screen. Glossary line 481 retires "influence"; the app replaces the name by id, which breaks no
   API. Any new surface inherits catalog names, so check it against the glossary at entry.
5. (2026-11-05) After an act, the reader's place is the composer. Undo, Remove and Answer leave
   focus elsewhere and letters go astray. The rule covers those three only: Settings rightly
   returns to its opener. Do not stretch a rule past the cases it was shown on.
6. (2026-11-05) Words that read as finishing must finish. Done drops a typed key because only Save
   writes it, with no warning. Same family as item 8: the commit point sits away from the act.
   Whether readers press Done is what the key task will show.
7. (2026-11-05) A fact shown only on a passing surface has no home: the question lives only on the
   approval card (the log's turn says "2 steps"), and it is the palest text there. Keep Declined
   and asked-question facts in the log, the place that lasts.
8. (2026-10-30) Decide before the act, not after. The join preview tags the wrong rows; the unknown
   end is chosen after Join with "Add nodes" already applied; "Leave out" does not say it deletes.
   A choice whose effect is already in place is a door hidden behind its own consequence.
9. (2026-10-30) One fact, one drawing. Column kind glyphs, filter-card count bases and place roles
   each disagree or go unmarked. Every place showing a fact reads the same element fact.
10. (2026-10-30) The table header is where readers go for column work; a door must land on the
    control the reader came for, not near it. New filter cards starting on Hide: watch.
11. (2026-10-30) Approved surfaces are a structural floor: the joined source row keeps both names
    and "N of M joined" at every width, and a count states what it counts.
12. (2026-10-21) Still open: the Graph inspector points to the layer list for appearance (a door,
    not a second home); a layer's members read in the table scoped to the layer; a new style line
    at the current value must show it is set; a door that looks like a rule must make a rule.
13. (2026-11-05) Study lessons: settle a disputed fact at its source (the route log named who made
    the selection); read from code is not run; a bar's wording can fail correct behavior (Settings
    focus); check screenshots over the tool's lines, and read keys against what the product shows.
14. Every participant is one model: a fail is strong evidence, a pass weak; n of 2 per half shows
    nothing about where people go.
15. Standing rules: one home per capability; "+" only adds to lists; unset is the minus and says
    what comes back; two row kinds only; check proposals at their edges (keyboard, edges,
    non-community data) and round trip (made, then read back).

## Priorities and values

- **Structure from the ontology, conventions from Figma.** The owner (2026-09-28): Figma supplies
  conventions for controls and gestures; graphty's structure comes from its own object model and
  information architecture. I place things by: the object map, the glossary, top-task rank, then
  Figma's placements -- in that order.
- **One home, many doors.** A capability that lives in two places drifts into two versions
  (the owner's own complaint, 2026-09-12: "why the duplicate locations for functionality?").
- **Findability over discoverability theater.** No wizards, tours, suggestion cards or first-run
  interface (owner 2026-09-26: those are not key functionality). A first-time user is served by
  a place whose name says what it holds, a working find, Quick actions with friendly aliases,
  samples, tooltips and undo.
- **The intermediate weekly analyst is the design target**; novices get only aids everyone gets.
  No persona-specific places or panels.
- **Every count is a link and names its unit and whole.** Navigation by numbers ("17
  connections" selects them) is the cheapest route between objects.
- **Places answer one question each.** Graph: what paints the graph, and in what order? Data:
  what is the data and how is it read? Inspector: what is this? Canvas: where is it, and what is
  it next to? Start screen: how do I start?
- **Evidence beats taste.** "Ours is clearer" is not a reason. A departure needs a graph fact, a
  failing task, a WCAG criterion or a platform fact.

## Design criteria

- **One home test** (refined B 17): every object and piece of state is read and changed in one
  place; a second place that shows or edits the same value is a defect. Reason: duplicates drift
  and confuse which one is "real".
- **Door fidelity**: every door to a command uses the command's one label word for word, and
  lands where its label says. Reason: round 7 found "Add data to this graph" opening a page headed
  "Open as a new graph" (severity 4).
- **Unique accessible names**: no two reachable controls share a name; a pair carries a
  qualifier. Reason: the Data/Data collision; worst for screen-reader users.
- **No promise without a place**: an unbuilt item is not drawn (no "Coming" tags, no disabled
  rail places). Reason: a disabled place promises something that does not exist.
- **Tree-test bar**: every tier 1 location task at 70% direct success or better. Reason: the
  bar the studio froze in rounds 7-8; success alone sits at the ceiling and separates nothing.
- **First-click bar**: 80% or better per tier 1 prompt (rounds 4-6 used 70%). Reason: a correct
  first click predicts about 87% task success, a wrong one about 46% (Bailey and Wolfson).
- **The step after the right click must change something visible or name what it found.**
  Reason: rounds 7 and 8 both failed there, not at the first click.
- **After any front door** (open a sample, a file, a project) the reader can answer without
  navigating: what graph is this, what is it computed on, what has been done. Reason: framework
  IA section 6.
- **Find finds nouns, Quick actions finds verbs**, each hands off to the other; friendly words
  ("brokers", "field", "column", "hops") live only as search aliases. Reason: industry terms on
  screen (owner 2026-09-26), friendly words still findable.
- **A rail button names a collection, never an activity.** Present and Export get no rail
  button. Reason: refined B section 4.
- **Every effect has a line**: whatever a turn changed, including selection, appears in the
  change line, from an effect the element reports. Reason: tier 6 round 1, a selection moved the
  next message's scope with no line.
- **Lasting facts live on lasting surfaces**: what was asked and declined stays in the log after
  its card goes. Reason: same round, the question exists only on the card.
- **Every top task has a starting place and a place where its answer is read** (refined B 15).

## Decisions and reasons

- **2026-11-05, tier 6 round 1 (no fixes built yet; studio stopped on the Gemini cap).** Positions:
  (a) a selection made by the model reports as its own change line, from an additive element
  effect; (b) app names results by id to match the glossary, leaving catalog `plainName` alone;
  (c) focus returns to the composer after Undo, Remove and Answer only; (d) a declined approval
  gets a line in the log, since "Keep them" left none and the model then called the removal
  irreversible; (e) on the three open rulings I lean: the kept undo reselect should not cover a
  rollback whose reader never made that selection, because the turn says "Nothing changed" while
  scope has changed; the x's lasting rule should not be stretched without its dated line; a painting
  run's Colored row stays a design question for sessions. None is a one-way door. Reason: each
  puts a fact in the one place readers check it. Evidence: tier 6 round 1 insights 2 to 4, 7, 9.
- **2026-10-30, tier 4 round 1 (no fixes built; studio stopped at its cap).** Positions to carry
  into the next tier: (a) the join screen previews every row's outcome with the same words Join
  will use, and the unknown-end choice is made on that screen before Join, with no pre-applied
  default; "Leave out" says it removes the row; (b) a column's kind, role and time designation
  show on its header in one place, read from the element's column facts; (c) filter-card counts
  use one stated base; (d) the joined source row keeps both names and its ratio (layout fix in
  the shared row). Reason: each round-1 cost came from a choice or fact shown somewhere other
  than where the reader acts. Evidence: insights.md of tier 4 round 1, items 1 to 5.
- **2026-10-23, menu sections (issue #3315, director ruled).** I argued for headings on both:
  a reader scans for the kind of picture first (spread out, a tree, a shape), then the engine,
  and only a heading names the kind; one level of indent named nothing and left Graphviz's
  engines orphaned. Layout headings come from the element's `family` fact: Force-directed,
  Shapes, Hierarchy, Other (plugins land in Other). Every row under one heading, empty ones
  hidden. Open for a tree test: whether "Shapes" and "Other" are the words readers look under.
- **2026-10-16, color sets 2 to dozens (proposed, bulk via BoundValue):** the field's strip is a
  kind signal only (at most 4 hard stops, 5 px each, or a gradient); identity lives in the line
  under it: 2-3 values as named rows, 4-10 as chits, then "+N", cut at the first repeated color
  and never past 10; the gray Other chit is drawn when the paint folds groups; a note line says
  "Colors repeat after 8" or "22 groups in Other"; the pill's accessible name says the count and
  its description lists the names in order. Bulk source name: "<<Layer>>" in the brand
  text color, detail "8 values"; a data column named Layer stays plain. Reason: today's strip
  shows the first 6 at 3.3 px with no "+N", the line drops the gray Other its canvas paints, and
  chit names live only in a mouse title, so no reader can tie a color to a group at rest.

- 2026-09-28 to 2026-10-14 (summarized 2026-10-30): structure follows the ontology; Data place
  for all data management; results live where they paint; rail for places; one File list; bind
  icon the one door to "color/size by"; one home for a node's neighbors; G opens neighbors; the
  element supplies facts the app would guess (`optionsFor`, `scope.count`, `FindResult.atLeast`,
  `rulePath`, `suggestBackticks`); app-side guards for element defects are overruled; "+" only
  for lists; unset is the minus; split parent removed (two row kinds); attribute-first
  conditions; View and Layout live in the toolbar. Details: git history of this file.

### Archived top of mind (summarized 2026-10-30)

- 2026-10-11 to 10-16: bulk <<Layer>> token with chits; Node/Edge tab switch; owner answers on
  unset and split parent; round 5 element facts.
- 2026-10-30 (tier 4 round 1): task success held (25 of 26), no severity 3 or 4; bars failed on
  keyboard, the joined row's ratio and cost (joining a file: about 12 inputs against 7).
- 2026-10-21 (tier 3 round 1): 55 of 56 succeeded; judge by cost and wrong first places;
  Location split into six Fields kinds (#3315); color names by hue family first in
  compact-mantine; <<Layer>> avoidance is not understanding; keyboard route costs 30+ Tabs and
  chip groups should be one stop; do not build around one task's wording.

## Tried: worked / did not work

- (2026-11-05) Tier 6 round 1, the Assistant: expert walks WORKED for what is on screen (scope
  chain on one screen, naming clashes) and did NOT stand in for readers: of 4 candidate insights,
  all were weakened, and the 6 scope routes in scoring shrank to about 3 mechanisms once a
  reader's own acts were removed. A true scope label did NOT prevent a surprise. Approval card,
  peek, rail dot and lasting notice HELD, and no count disagreed on the walks' turns.
- (2026-10-30) Tier 4 round 1, returning users managing data: the table header as the home for
  column work WORKED (T62 3 of 4, T63 2 of 2 used the Role menu). The join preview did NOT work as
  a preview (wrong rows tagged; the result was learned from counts afterward). Choices placed
  after the act with a default applied did NOT work (unknown end, Hide-first card). Joined source
  row layout did NOT hold the approved ratio. Trusting the study tool's hover line did NOT work:
  check screenshots.
- (2026-10-21) Tier 3 round 1 on the real app: the layer list as the one home for appearance WORKED (every reader got there) but its door did NOT -- found by count matching, not by a pointer. Rule-free "+" lines starting at the current value did NOT read as a change. Bulk <<Layer>> token: no one trapped, legibility unproven.
- 2026-09-28 to 2026-10-13 (summarized 2026-10-30): homes hold, doors fail -- a home found by
  guessing or habit needs a door on the reader's path (Degree chevron 0 of 4 to 8 of 8; toolbar
  Filters icon 7 of 7; find's example-rule line plus Enter 8 of 8). A working door nobody sees is
  not a door (Neighborhood 0 of 8). Adding words to fix doors raised word counts; replace words.
  A count drawn in several places that disagree makes readers doubt right answers. Methods that
  paid off: coverage scripts diffed against the element's channel list; reading the app for the
  element field a plan names; walking the reader's app, not the review scene; dry runs must walk
  detours and keys; read briefings and keys before crediting a door.

## Thinking

- **Tier 1 IA questions (2026-10-06)** were answered by rounds 1-3: the intake, names and
  neighbors, Values, Analyze search and export all hold; the Data place / Data page / Values
  collision has not shown up in sessions. Keep watching it in tier 2.
- **Things I saw in a smoke render of the real build (2026-10-06, unverified with users):**
  the nothing-selected inspector opens on Values with an Overview; long labels truncate
  ("Edges per ...", "Undirected, from the file: the GML def..."); the Legend toolbar button is on
  while nothing is bound and no legend card shows -- a control whose state has no visible home
  is exactly the "next step shows nothing" pattern; the Karate club is "Undirected, from the
  file" yet edges draw with arrows -- a dataviz question, but it breaks "a value never misstates
  what it describes".
- **Framework vs refined B:** the framework's frozen outline (rail Graph, Assistant, Results,
  Notes; no layer tree; Sets and paths, Styles, Views in the Graph panel) is superseded by the
  owner's refined B. The framework docs should get a dated note pointing at refined B and the
  tier 1 design, rather than a silent rewrite, so a stranger is not misled.
- **Not my fight but on my path:** the legend in exported images (element #133) blocks T13 and
  T15; the adoption backlog of closed element issues (node names, degree histogram, selecting
  isolates, Show all labels door) is the cheapest way to make existing homes hold what they
  promise.
- **Method for the real-app round:** use the tree outline of the BUILT app (labels exactly as
  drawn), plus first-click on real screenshots, plus live sessions through the real-app tool.
  Report every rate with and without build defects. Tree tasks for tier 1 only: open a sample,
  own file, rank nodes, find groups, names on every node, a node's neighbors, layout, export a
  picture, export the numbers, save and reopen.

## Sources

- (2026-11-05) `tier6/rounds/round-1/insights.md`; screenshots `expert/a11y/k1/99.png`,
  `expert/engineer/setup-1200x900/29.png`, `38.png`; graphty-element
  `src/ai/tools/families/algorithms.ts`; app `Waiting.tsx`, `Composer.tsx`, `Checks.tsx`.

- (2026-10-13) `tier3/iterations/2/review.md` "Decided for iteration 3"; graphty-element
  `catalog/types.ts` (`ReadableValue.end`, `valueCount`, `valuesAreColors`), `session/query.ts`
  (`namedRows`), `session/styles/legend.ts` (`kindOf`); app `rules/conditions.ts`
  (`readableFields`), `style/ValuePicker.tsx` (`entriesOf`, `emptyWords`), `style/BindingPopover.tsx`
  (`SCALE_WORDS`, category `defaultValue`), `style/words.ts` (`refusalWords`), `style/coverage.ts`.

- (2026-10-12) `tier3/owner-feedback-1.md`; `tier3/design.md` 1.1, 1.7, 2.1-2.2, 7; main
  checkout `design/ui/figma/right-sidebar-selection/README.md` (gitignored capture) sections 5,
  15, 17, 22, follow-up 5 and 8; `design/ui/framework/figma-crosswalk.md`; compact-mantine
  `tree/Tree.tsx` (`multiselect`), `inputs/VariablePill.tsx`.

- (2026-10-12) `.worktrees/mock-style-panel/design/ui/style-panel-organization.md`, the mock
  stories; `design/ui/unified-style-layers.md` (branch `docs/unified-style-layers-design`);
  `tmp/style-catalog/catalog.md` sections 5, 8.3, 9, 12; graphty-element `catalog/types.ts`
  (Selector, Scope, RuleTree, SetDefinition, AttributeDescriptor), `session/styles/StylesApi.ts`
  (`proposeEncoding`, `explain`), `session/results/types.ts` (HistogramOptions); compact-mantine
  `ControlSection.tsx` (`summary`), `GradientEditor.tsx`; app `data-place/Filters.tsx`; Figma help
  articles on effects, strokes, variables, text properties.

- `tier2/rounds/round-4/insights.md`, `decisions.md` (changes 3, 4, 5, 8, 9, 12) (2026-10-11)

- `tier2/rounds/round-4/insights.md`, `scores.md` (bars 9 (b), 10; T17, T22, T23), `expert/figma.md`;
  screenshots `expert/figma/find/04.png`, `08.png`, `sessions/r4-s27/09.png`;
  `graph-place/FindBox.tsx` (`ruleFromText`, value rows), `table/TableDock.tsx` (scope),
  `canvas/legendWords.ts` (`rowName`), graphty-element `session/query.ts` (`atLeastOf`) (2026-10-11)

- `tier2/rounds/round-3/insights.md`, `scores.md`, `expert/figma.md`, `expert/visual.md`,
  `expert/a11y.md`; screenshots `r3-s10/02.png`, `r3-s33/03.png`, `r3-s43/13.png`,
  `expert/visual/path/02.png`, `10.png`; `graphty/src/workspace/analyze/words.ts`,
  `graph-place/FindBox.tsx`, `inspector/NodeValues.tsx` (2026-10-10)

- `tier2/rounds/round-2/decisions.md` (changes 1-15, "Not changed") (2026-10-10)

- `tier2/rounds/round-2/insights.md`, `scores.md`, `expert/figma.md`, `expert/engineer.md`;
  screenshots `r2-s33/05.png`, `r2-s12/03.png`; `graphty/src/workspace/graph-place/FindBox.tsx`
  (`columnOptions`) (2026-10-09)

- `tier2/rounds/round-1/insights.md`, `decisions.md` (2026-10-09)

- `tier2/rounds/round-1/insights.md`, `scores.md`, `expert/figma.md`; screenshots
  `r1-s46/12.png`, `r1-s29/08.png`, `r1-s05/09.png`; `graphty/src/workspace/project/actions.ts`
  (openInSession), `data-place/DataPlace.tsx` (row menu), `graph-place/FindBox.tsx` (2026-10-09)

- refined B sections 2.1, 2.3 (selection bar, Path popover), 7, 8, 10.1 (Select where), 11.3
  (weight, several tables); tier1-design.md section 7; the tier 2 audit list (2026-10-07)
- `design/ui/studio/rounds/round-2/decisions.md`, `insights.md`; `rounds/r2/pilot/T6`-`T16/pilot.md`
  (2026-10-07)

- `design/ui/studio/rounds/round-2/insights.md`, `scores.md`; screenshots `repro/r2-s19/run1/04.png`,
  `repro/r2-s56/run/07.png`, `sessions/r2-s29/09.png`, `sessions/r2-s12/10.png`;
  `graphty/src/workspace/layout/methods.ts` `groupings()` (2026-10-07)

- `design/ui/studio/rounds/round-1/insights.md`, `scores.md`, sessions r1-s17b, s29b, s10b
  screenshots (2026-10-06)

- `design/ui/studio/digests/decisions.md`, `framework.md`, `tier1.md`, `study-rounds.md`,
  `owner-voice.md` (this worktree, 2026-10-06)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/structure-comparison/structure-b-refined.md`
  (sections 2.5 "One pattern per job", 4 "The rail", 15 "Every top task has a home",
  17 "One home per feature")
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/structure-comparison/ia-owner-structure.md`
  (the IA's specification of the owner's structure, 2026-09-30)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/decision-log.md`
  (rounds 3-8: Data place, Results placement, File list, Layout group, find, neighbors)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/round-8/tree-test/grades.md`
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (sections 2.1-2.7,
  4, 9 "Calls made on this page", "Adversarial review changes")
- `design/ui/framework/information-architecture.md`, `principles.md`, `top-tasks.md`
  (via the framework digest)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/workflows/scripts/graphty-structure-comparison-wf_94d61710-fbb.js`
  and `graphty-design-study-rounds-4-onward-wf_6818e34f-76d.js` (the IA role's charter,
  2026-09-30 and 2026-09-28)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/agent-a53a98e32cd016a86.jsonl`
  (IA canon research: Rosenfeld/Morville/Arango; tree test vs first click, 2026-09-27)
- `design/ui/studio/tmp/explore-02.png` (smoke render of the real build, 2026-10-06)
- Extraction script: `design/ui/studio/tmp/ia/agents.py`
