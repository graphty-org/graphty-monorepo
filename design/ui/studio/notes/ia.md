# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

1. (2026-10-11) Round 4: 53 of 53 succeeded; bars 9 (b) and 10 fail. My two items: the find box
   offers "=`10`" for a bare number not in the column, then refuses it (sev 3); with a filter step
   on, the table lists everything under "41 edges" while every other count says "12 of 41" (sev 2).
2. (2026-10-11) Proposed for round 5, IA: (a) never offer a rule the element refuses -- check the
   rewrite before showing it, else the example-rule line; (b) element find offers an "or more" row
   for any number inside a numeric column's range (additive `FindResult.atLeast`); (c) the table
   lists what the steps keep and its count reads like the top bar ("12 of 41 edges").
3. (2026-10-11) Do NOT change for round 5: the toolbar Filters door (7 of 7 first and only door),
   Shift-click, Filters' and Replace's homes, find's hint and Enter, Analyze search (typing found
   Shortest path first 15 of 15), Neighborhood in "...", the second path run replacing the first,
   the key's scope words ("full graph" is a true fact only shown while a step is on).
4. (2026-10-11) Overlapping labels, dots and ties are graphty-element's (label placement, spacing
   by drawn size). No app hints, no app hover workarounds.
5. (2026-10-11) Two "same number, two answers" places in one round (find's suggestion, the table)
   share one cause: the app shows a thing the element was never asked about. Ask the element
   first, show second.
6. (2026-10-11) Study evidence is weaker than it looks: the briefing's file table named Mo and Nia
   and the unmatched row; personas script count-checking. Discount "noticed unprompted".
7. (2026-10-10) Readers type the prompt's most prominent data word first: a column name OR a bare
   number. The find box must turn both into a working rule -- including a number no row holds.
8. (2026-10-10) A description match is a weak signal; a name or alias match is a strong one.
9. (2026-10-10) Rule of the round: no feature moves, no second door where one is being measured,
   words at rest go down. Words shown only while typing are not "at rest".
10. (2026-10-10) A command that makes a run should make a new row, never overwrite a sibling
    (second Find path) -- interaction designer's call; not this round.
11. (2026-10-09) The column is every user's second place: a door to existing homes, never a home.
12. (2026-10-09) Element-first: repeat-edge count, highlight look, hop distance, numbers in rules.
    The app never parses rules, counts duplicates or measures distance.
13. (2026-10-09) A number names its unit and whole; a count under a filter names whose numbers.
14. (2026-10-07) One popover per job, every door opens it; a working door nobody sees is not a door.
15. (2026-10-06) Rejected, do not re-propose without new evidence: results in Size's list; names
    in the Summary; a Style-tab pointer to Label; Size pre-bound to the row's result.

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
- **Every top task has a starting place and a place where its answer is read** (refined B 15).

## Decisions and reasons

- 2026-09-28 to 2026-10-02 (owner and mock rounds 3-8, summarized 2026-10-09): structure from
  the ontology, Figma for controls only; a Data place for all data management; results live where
  they paint (refined B: every run a row in the paint tree, owner 2026-09-30); rail for places,
  toolbar icons only; one File list shown from the main and project-name menus (tree 19% -> 90%);
  intake "Open project or file..."; Layout its own group; the bind icon is the one door to
  "color/size by"; find over rows, elements and notes with "Select where"; one home for a node's
  neighbors; Export > Data opens on the showing table. Details: the mock decision log.
- 2026-10-03 (studio, tier 1 design): rail draws only Graph and Data; inspector tab renamed
  Values; selection bar holds only Neighborhood; recipe and style files refused with one problem
  block; Notes row not drawn. All reversible.
- 2026-10-03 (owner): graphty-element is neutral about presentation; the app owns every word,
  heading, grouping and order. Consequence for me: Analyze's headings, the Style tab's section
  order and the find list's groups are app IA decisions, not element ones.
- 2026-10-03 (owner): stop the mock rounds and build tier 1 as the real app; study the real app.

- 2026-10-06 to 2026-10-07 (tier 1 rounds 1-3, summarized 2026-10-10): adopted from my proposals
  -- G opens the neighbor list for one node, no dead-end doors (Selection row, Sources tables,
  empty combo), the chevron inside the Degree row (a compact-mantine DataRow fix), partition
  candidates from the element's `optionsFor`. Replaced -- bound Size by "Size + opens its picker",
  hidden-label words by a "Show all labels" switch, subtitle method word by the method name
  everywhere. Rejected -- "N connections" plus chevron at once, a Style-tab link to Everything,
  "Size and shape" heading, "Javert and his 17 connections". Reason throughout: one variable per
  path, and graph facts over taste.

- 2026-10-07 (IA proposal for tier 2, from the tier 2 audit): build each gap where refined B
  already put it (Data > Filters plus the header chip; Path popover; Notes place; Sources row
  "Replace with file..."; main menu "Select where..."; Neighborhood popover); the element first
  provides the facts the app would otherwise guess (output kind, weight meaning, rule errors as
  codes, edge pick, filter on edge attributes). Not decided by refined B and decided here: the
  doors live on the canvas menu until a selection bar exists; "Grow by one hop" leaves "...";
  a stale run row gets a mark, and rerun stays per row (no "Rerun all" yet). Reason: one home per
  job; every guess the app makes about a run or a rule is an element defect hidden.

- 2026-10-09 to 2026-10-10 (tier 2 rounds 1-3 proposals and decisions, summarized 2026-10-11):
  adopted -- start-screen Open of a data file through the Data page; the source's "..." with
  Replace and Edit source; find's hint to the rule start decided by the element (`scope.count`);
  ", out of date" on the key title; path aliases; rule-made layers named by the rule; Filter to
  neighbors as a plain command; the element's repeat-edge count with "Replace <source>" beside
  Load; the example-rule line after a miss plus Enter running a shown rule. Rejected -- "Select
  where..." on the column; visible Replace buttons; file-name matching (guess vs element fact).
  Not taken -- Edit source retitle; Hops grouped by step. Reason throughout: one variable per
  path, each change a door or a word for an existing home, facts in the element.

- 2026-10-10 (IA proposal for tier 2 round 4, after round 3): four door and word fixes, no new
  places, no moves. (1) Analyze search shows only name or alias matches when any exist (a
  description-only match shows only when nothing else does); evidence: "path" and "shortest path"
  ranked Betweenness first in 7 sessions plus 2 experts, "linked" marked Louvain
  (`visual/path/02.png`); file `analyze/words.ts` `matches`/`groupAlgorithms`. (2) A bare number in
  find: the Values row reads "<column> is 10" and, for a numeric column, "<column> is at least 10",
  each with the element's count at the right; drops "Select where" (cut at the panel edge,
  `r3-s10/02.png`; 4 of 4 typed "10" first, 2 took "is 10"). Shown only while typing, so no words
  at rest. File `graph-place/FindBox.tsx`. (3) A Filters icon in the canvas toolbar that opens Data
    > Filters (5 of 8 T17 looked on the Graph place first: toolbar Layout and Everything's style,
    > `r3-s33/03.png`). A door, not a home. (4) At Hops 2 or 3 the neighbor list's value column is the
    > step count (1, 2, 3) from the element (an additive fact on the neighborhood selection); evidence
    > r3-s48, figma 18, visual 16 (`visual/path/10.png`). Reason for all: each is a door or a word for an
    > existing home, and each puts the fact in the element.

- 2026-10-11 (IA proposal for tier 2 round 5, after round 4): three fixes, no new places, no
  moves. (1) FindBox never shows a rule the element refuses: `ruleFromText`'s backtick rewrite is
  checked with `scope.count` before it is offered; on refusal the example-rule line shows instead.
  Evidence: `expert/figma/find/04.png` offers "=`10`", `find/08.png` refuses it; T22 A's prompt
  number (10) is in no bus-stops row. (2) Element (additive): `FindResult.atLeast`, one row per
  numeric column whose range holds a typed number that is not itself a value
  ({ kind, path, value, count, target }, the same shape as `FindValueRow.atLeast`); the app renders
  it with the existing "<column> is N or more (count)" words. Reason: the threshold is a fact over
  the data; the app must not parse numbers or scan columns. (3) The table's scope follows the
  filter steps ("visible", not "graph", `TableDock.tsx`), its count "12 of 41 edges" while a step
  is on. Evidence: `sessions/r4-s27/09.png`, r4-s21. Reason: one number per fact; the step's
  checkbox stays the one home for on/off. Kept away: the key's scope words, overlaps (element).

## Tried: worked / did not work

- 2026-09-28 to 10-02 (mock rounds, summarized 2026-10-09) -- tree tests rank where people look
  but hit the ceiling on correctness (only directness discriminates); frozen rules before a round
  work; a round must not run until its decisions are drawn; Results in the inspector, Analyze
  headings by outcome, main-menu Select where and the filter chip as status all failed; the File
  list, "Remove from list view" and Analyze's own search box worked.

- 2026-10-06 (round 1 real app) -- Degree row as the only door to neighbor names: did not work
  (0 of 4 clicked it; r1-s17b `07.png` shows it drawn exactly like the id and name rows).
- 2026-10-06 -- Label "+" and the honest "N hidden to avoid overlap": worked for the first step
  (no false "done" in 29); the count names no one and offers no way to show them (severity 2).
- 2026-10-06 -- Rail with only Graph and Data, File list, sample intake: no failures traced.

- 2026-10-06 (re-pilot on graphty@0.8.53) -- every tier 1 success path reaches its end state; G
  from a selected node opens "Javert's 17 connections" with focus on it (T12 13.png); the refusal
  under Method names the method (T11 07.png). Doors work for the scripted path; round 2 tests
  whether people take them.

- 2026-10-07 (round 2) -- Degree-row chevron: worked (T12 8 of 8, 0.9x; round 1 0 of 4), but its
  hit area was outside the row button (4 of 6 clicked dead space first). Neighborhood (G) fixed
  but unused (0 of 8): a working door nobody sees is not a door.
- 2026-10-07 (round 2) -- Size under a "Shape" heading with "+" and a chain-icon bind: did not
  work as a findable path (18 of 18 named it; all succeeded by guessing).
- 2026-10-07 (round 2) -- "N hidden to avoid overlap": honest (no false done), but every T10
  session spent its extra steps hunting a door that does not exist (r2-s12: 5 wrong turns).
- 2026-10-07 (round 2) -- One name per run did not ship as the method word: rows and key say the
  result ("Influence"), the method appears nowhere after the run.

- 2026-10-07 (re-pilot, build b7590f8de, graphty@0.8.53) -- every round 3 change reaches its
  end state on the scripted path: Size picker (T9, T15), Show all labels (T10, both datasets),
  group layouts after Louvain (T11), method names (T7, T16), export (T13). Scripted success says
  the doors exist; round 3 says whether people take them.

- 2026-10-09 (tier 2 round 1) -- Filters under Data: worked once found (7 of 8, median 7 = the
  success path) but nothing on Graph points there; keep the home, watch the doors.
- 2026-10-09 -- Replace only on the row's right-click: did not work at rest (8 of 8 hunted; 7
  recovered by habit). Path run, Replace page and load-time "Higher means": read right every
  time once reached -- the homes hold, the doors fail.
- 2026-10-09 -- Find box as the one home for rules: half worked. Users start there (4 of 4) but
  the refusal does not lead on; the "=" start is invisible.

- 2026-10-09 -- Dry run of success paths only: worked for the paths (empty session logs) but did
  not catch detour defects (style to Everything, selection tint, focus drops) or tool faults. Next
  dry run walks detours and keys.
- 2026-10-09 -- Load-time weight meaning: the home works (everyone who reached "Higher means"
  chose right) but the habitual door (Open) skipped it, and "Back to start" dropped the graph.

- 2026-10-09 (tier 2 round 2, weak evidence: facilitator text leaked) -- Open through the Data
  page: T20 7 of 7 set Higher means at load; the habit carried. The source "..." with Replace:
  8 of 8 found it, by guessing. Find's rule hint: worked only after the exact column and a
  condition; the column word alone dead-ends. The detour dry run worked for the walked detours
  (30 of 30) and missed the unwalked one (styling a selection).

- 2026-10-10 (round 2 close) -- Study isolation by a clean briefing alone: did not work; a
  participant can read upward from a folder inside the studio tree. Fix is location plus a
  transcript check, not a prompt rule.
- 2026-10-10 -- Adding words to fix doors: did not work for bar 9 (b); every tier 2 screen's
  count rose. Fixes must replace words.

- 2026-10-10 (tier 2 round 3, first clean round) -- find's example-rule hint plus Enter running a
  shown rule: worked (T22 8 of 8, steps 16 to 5, no dead end). Load-time Higher means through the
  Data page: worked (T20 8 of 8). "Replace <source>" beside Load: not reached (no session met the
  Add page). Path aliases: found Shortest path but ranked it last. Rule-named layer: worked.
- 2026-10-10 -- Hiding a capability's door only in "..." menus: costs one guess each (Replace 8 of
  8, Neighborhood 4 of 4), but everyone found them. Leave them; the measured cost is small.
- 2026-10-10 -- A task word ("point out") that differs from the key's measure: did not work as a
  study; readers reached another valid answer (path). Check prompt and key together.

- 2026-10-11 (tier 2 round 4) -- Toolbar Filters icon as a door to Data > Filters: worked (T17
  7 of 7 first and only door, wrong turns 0). Analyze search name/alias first: worked (Shortest
  path found by typing 15 of 15). Bare-number "or more" row: worked only when the number is a
  value (r4-s10 on Les Miserables); on bus-stops the app's own suggestion is refused. Hops step
  distance: not reached in a way that measured it.
- 2026-10-11 -- A count drawn in three places and a list in a fourth: did not hold. Two readers
  doubted a right answer because the table disagreed with the chip, the step and the Overview.

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
