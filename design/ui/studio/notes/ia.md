# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

1. (2026-11-06) Chat switcher decided (`tier6/decided.md`): "Chats {N}" only while open, "chat" as the
   reader's word, one door for New chat (the header "+"). My "+ New chat" list row was cut as a second
   home for one command; the element already keeps empty chats out of the list.
1. (2026-11-06, tier 6 round 2 decided) Round 3 credits one change per problem, and words at rest
   do not rise: a fix joins an existing line or replaces words, never adds a row. My "About 14
   selected nodes" turn mark was refused as a second count to keep true; the placeholder now
   follows the scope ("Ask about this selection"). Watch T92: does the placeholder stop Dev?
1. (2026-11-06) One name per measure: the Assistant's lines take `wordsFor(...).name`, as the
   legend does. Limit: the model still sees `plainName`, so a reply can say "Reach". Watch whether
   replies alone still split names in round 3.
1. (2026-11-06) A painting run says so on its existing line, not a Colored row (ruling in
   decided.md); the element reports `painted` from `runs.painting`. Default stays: changing it
   breaks. Check that the line reads true when `style: false`.
1. (2026-11-06) Show in table narrows to its rows with the members chip (reach all 7 of 331);
   `scrollToRow` and selected-first sort were refused. My door rule held: a door lands on what it names.
1. (2026-11-06) Autosave: only the tooltip changes ("Changes not yet in a file are kept...").
   Real gap stays open: no way of opening a file reaches Recent projects (`pickFiles` on every
   open door; only Save and Locate get a handle). `showOpenFilePicker` refused for now.
1. (2026-11-06) A refused key reads "connection failed" because the browser hides the 401; the
   app can only say the key "may be" at fault, offers the provider, and keeps Send again.
1. (2026-11-06) After a press that removes its own button, focus goes to the composer; Settings
   returns to its opener. One rule, not stretched.
1. (2026-11-06) Rulings: a rollback leaves no selection and no Redo (a failed message did not
   happen); closing the panel does not end the scope x (the build is wrong, not the entry).
1. (2026-11-06) Two scrollbars: measure `position: relative` on the log first, build step two
   only if it falls short. Read-only mechanisms are measured before they are built on.
1. (2026-11-06) Refused because the product lacks the concept: names for Group 1 to N; plain
   words for opened steps (a per-tool wording design). Do not re-raise without new evidence.
1. (2026-11-06) Watch in round 3: bar 9 rests on the 400% Settings fix; the 193-screen audit for
   bars 10 and 11; whether the conversation comes back with a key after a reopen; the backlog's
   "Open run lands on Style" and "Done drops a typed key" if they recur.
1. (2026-11-05) Lasting facts live on lasting surfaces; words that read as finishing must finish.
1. (2026-10-30) Decide before the act; one fact, one drawing; a door lands on its control.
1. Study lessons: settle a disputed fact at its source (my "a different door gets a handle" was
   false -- read the code before claiming a door exists); hover counts measure the tool; one model
   plays every participant, so a fail is strong and a pass weak; a planted session is one reader.
1. Standing rules: one home per capability; "+" only adds; unset is the minus; two row kinds;
   check proposals at their edges and round trip.

### Archived top of mind (2026-11-05 and tier 5, summarized 2026-11-06)

- Tier 6 round 2 first read: scope marks at the answer; one name per result; every effect a line;
  Recent projects never fills from opening; truth that varies with the fact; Show in table narrows.
- Tier 5: only the surface on screen speaks; a run's scope is a fact from the element; connectives
  are words; labels carry direction and unit; empty value boxes need a cue; Escape and Clear never
  delete saved work; names survive edits; one picker for "choose a thing"; no workspace layout
  below 1280 px; one editor and field picker for Which nodes and Filters.

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

- **2026-11-05, tier 6 round 2 (proposed; nothing built).** (a) The sent turn states its scope from
  the stored `AiMessageScope`, and the placeholder follows the scope, because a warning on the scope
  line sits where Dev already read and went on. (b) The Assistant's run, step and approval lines use
  `wordsFor`, so one result has one name. (c) A run that painted gets a Colored row, from an additive
  element effect; this answers the open ruling yes. (d) Autosave's tooltip and label branch on
  `unexported`, and Open uses the handle picker where one exists. (e) Show in table narrows to its
  rows with a removable chip; selecting them stays, as design 5.3 settles. (f) A failure with no
  status says the key may be at fault and offers AI provider... beside Send again. Not changed:
  apply at once, no preview, Group 1 to N, starters, Open run's landing. None is a one-way door.

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

- (2026-11-05) Tier 6 round 2, first readers: chat as a place WORKED (word found 2 of 2, approval read
  2 of 2, Undo restored 2 of 2). The scope line alone did NOT carry scope: one reader read it and was
  narrowed anyway. Show in table as a proof door did NOT land on its rows. Reading the tool's source
  beat the insights' "the model's" on repainting: the default is ours.

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

- (2026-11-05) `tier6/rounds/round-2/insights.md`, `scores.md`; screens `sessions/r2-s05/05.png`,
  `r2-s10/05.png`, `r2-s01/18.png`, `repro/r2-s06/walk/04.png`; app `assistant/words.ts`,
  `assistant/Composer.tsx`, `analyze/words.ts`, `runWords.ts`, `autosave/words.ts`, `start/open.ts`,
  `project/files.ts`, `table/TableDock.tsx`; element `ai/tools/families/algorithms.ts`,
  `ai/conversation/snapshot.ts`, `catalog/ai.ts`, `catalog/types.ts`, `autosave/types.ts`.

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

- Earlier sources (2026-10-06 to 2026-10-11): tier 1 and tier 2 round insights, scores and
  decisions; refined structure B; the framework digests; `.claudehistory` IA charter and canon research.

## 2026-11-03: tier 5 round 1 (closed, expert walks only)

- Decision: only the surface on screen announces; covered panels go quiet. Reason: the covered
  inspector row overwrote the workspace's count in the shared status region (severity 3, kept by
  both skeptic checks). Owner: graphty app (WhichPicker announces while the workspace is open).
- Decision: the reference picker becomes the shared searchable picker. Reason: its own build broke
  Tab, Escape, expanded state and result count, and grouped its list differently.
- Decision needed in decided.md: precedence between "Escape takes a new card back" and "Escape
  never discards work / Clear has an undo"; a workspace width rule below 1280 px.
- Tried: the 1-round cap with no start gate -- did not work; 60 sessions void, bars 1-3, 8 unmeasured.
- Insight: severity from expert walks alone tends to weaken under skeptic checks (3 of 4 severity
  claims fell to 2); IA findings that survive are departures from already decided rules.

### 2026-11-03 correction: round 1 insights (30 valid sessions, two skeptic checks)

The earlier "no valid session" entry above is superseded: insights.md scores 30 valid sessions.

- Learned: scope ambiguity between runs is an IA defect (two things named alike); the fix is a
  neutral scope fact from graphty-element worded by the app, not a rename in one picker.
- Learned: the editor's connective words carry its logic; doubt is resolved by the count, which
  costs steps (bar 8) and confidence (bar 9).
- Did not work: By position as one bare box; empty color box with no cue; Escape branch ignoring
  whether a card was newly opened.
- Study: T73 measured its key, not the build; reword before round 2.

## 2026-11-06: tier 6 round 2 (closed and decided)

- Decided: the composer placeholder follows the scope. Reason: the warning belongs where the reader
  types; a turn mark would add a second count. Evidence: r2-s05 read "Selection 14" and asked anyway.
- Decided: one name per measure through `wordsFor`; no catalog or default change (both breaking).
- Decided: a painting run's fact joins its Computed line; no separate Colored row (rows stack).
- Decided: Show in table narrows with the members chip. Reason: only it reaches every row.
- Decided: Autosave tooltip only; the open-with-handle gap and "Autosave: no changes" refused.
- Tried: claiming another open door gets a handle -- did not work; it was false at the source.
- Worked: "door lands on what it names" and "after an act, the composer" both carried into units.
- Insight: severity 3 claims keep falling to 2 under skeptics when the reader kept a true belief;
  the persona's own rule (close the tab to test) can drive a fail.
- Watch round 3: T92 placeholder, reply names vs line names, 400% Settings, key after reopen.
- Source: `tier6/rounds/round-2/insights.md`, `decisions.md`.
