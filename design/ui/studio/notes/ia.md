# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

1. (2026-10-09) Round 1 verdict: the homes hold, the doors fail. Path run, Replace page, Filters
   and load-time "Higher means" were read right every time once reached; every non-success stopped
   on WHERE a feature lives, on controls that work.
2. (2026-10-09) The dry run walked only the answer key's routes. Before round 2 it also walks each
   task's two commonest round 1 detours, by pointer and by keyboard; my job is to name those
   detours per task (they are IA facts: where people look first and second).
3. (2026-10-09) Round 2 doors, decided: start-screen Open of a data file goes through the Data page;
   the source inspector gets a "..." menu (Replace, Edit source, shared verbs with the row menu);
   find's empty line offers the rule start when the element says the text is a rule; the key says
   ", out of date". One door per confirmed problem; no feature moves.
4. (2026-10-09) Rejected for round 2 (my proposal): "Select where..." on the column menu. Reason:
   it would confound the find-hint test; it comes only if the hint fails with 3+ participants
   looking in the same place. Watch the column as second place in T22.
5. (2026-10-09) Watch in round 2: T22 success via the hint; T21 median steps via "..."; T20 under
   22 steps and whether the Data page step costs tier 1's open-your-own-file task; that nobody
   hunts Filters from Graph more than once (Filters' home stays under Data).
6. (2026-10-09) The column is every user's second place (T20 6 of 7, T22 4 of 4). Treat it as a
   door to existing homes, never a new home.
7. (2026-10-09) Style lines must go only to the layer the row names: a run's Style tab with no
   edge layer shows no Edges segment (fixes the silent write to Everything). One home per layer.
8. (2026-10-09) Do NOT change in round 2: Filters under Data, the rail, Analyze order, Hops, the
   path popover, Leave-out preselect, note subject. One variable per path.
9. (2026-10-09) Simulated returning users go first where their history says; a matching first move
   is weak evidence. Graders now mark scripted persona exits (Tom decided 2 of 3 non-successes).
10. (2026-10-09) Units are structure too: "Total distance 14" became "Total minutes 14"; a number
    names its unit and whole.
11. (2026-10-07) Element-first, still open: label placement and frame-to-fit ignoring label extents
    (confirmed class, filed on graphty-element, bar 10 will keep failing); bare numbers in rules is
    an owner question.
12. (2026-10-07) One popover per job, every door opens it; a working door nobody sees is not a door.
13. (2026-10-06) A refusal lives next to the control that caused it; same words from every door.
14. (2026-10-06) Rejected, do not re-propose without new evidence: results in Size's list; names
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

- 2026-10-06 (IA proposal for round 2, after round 1): fix the doors to the neighbor list (G
  opens it for one node; clickable rows carry a chevron; Degree value "N connections"), fix or
  remove the three dead-end doors (Selection row, Sources tables, empty Size list), add a link
  from the whole graph's Style tab to Everything. Leave the rail, Analyze, export and intake
  alone. Reason: these are the only round 1 failures or severity-3 costs on tier 1 that trace to
  structure; everything else passed.

- 2026-10-06 (Design Director, round 1 decisions): adopted from my proposal -- Neighborhood (G)
  opens the list for one node; Selection row and Sources tables stop dead-ending; empty combo has
  no "Open list"; one name per run (method word). Rejected for round 2 -- the Degree-row chevron and
  "N connections" (two changes at once would hide which one helped) and the Style-tab link to
  Everything (one model's shared guess, recovered in 1 step). I accept both: a clean single-variable
  test of the door fix is worth more than shipping my cue now.

- 2026-10-07 (IA proposal for round 3, after round 2): bind a Size line added on a result row
  to that result; "Size and shape" section heading; the Degree row's chevron inside the button;
  partition candidates from the element; hidden-label words that say what brings names back;
  method word in the run's inspector subtitle; neighborhood heading that includes the node.
  Reason: these are the round 2 costs on the first-time core path that trace to structure or
  words; everything else passed or belongs to other roles (focus return, export fidelity).

- 2026-10-07 (Design Director, round 2 decisions, on my proposal): adopted -- chevron inside the
  row (as a shared compact-mantine DataRow fix, not app-only); partition candidates from the
  element's existing `optionsFor` (no new export). Replaced -- bound Size by "Size + opens its
  picker" (bound Size would size by a group id on a community run); hidden-label words by a "Show
  all labels" switch (the element already had the setting); subtitle method word by the method
  name everywhere (no third naming state). Rejected -- "Size and shape" heading (confounds the
  sizing change), "Javert and his 17 connections" (gender unknowable). I accept all: each reason
  is a graph fact or a one-home argument, not taste.

- 2026-10-07 (IA proposal for tier 2, from the tier 2 audit): build each gap where refined B
  already put it (Data > Filters plus the header chip; Path popover; Notes place; Sources row
  "Replace with file..."; main menu "Select where..."; Neighborhood popover); the element first
  provides the facts the app would otherwise guess (output kind, weight meaning, rule errors as
  codes, edge pick, filter on edge attributes). Not decided by refined B and decided here: the
  doors live on the canvas menu until a selection bar exists; "Grow by one hop" leaves "...";
  a stale run row gets a mark, and rerun stays per row (no "Rerun all" yet). Reason: one home per
  job; every guess the app makes about a run or a rule is an element defect hidden.

- 2026-10-09 (IA proposal for tier 2 round 2, after round 1): five door fixes, no new places.
  (1) Start-screen Open of a data file goes to the Data page (intent new), matching the same
  label inside a project and request.ts's own list of doors. Evidence: T20 7 of 7 took Open;
  nothing on that route sets a weight's meaning; median 23 vs 22 steps. (2) Replace and Edit
  source drawn in the source's inspector. Evidence: T21 8 of 8 hunted; left click shows only
  counts (r1-s29/08.png). (3) Find refusal for condition-shaped text names the rule start.
  Evidence: T22 4 of 4 typed `col >= 10` and got "No match" (r1-s46/12.png). (4) "Select
  where..." on the column menu, as a door to the find box. Evidence: the column was every T22
  user's second place. (5) Out-of-date mark on the key entry. Evidence: two experts, bar 5.
  Reason for all: each is a door to an existing home; none adds a home or moves one.

- 2026-10-09 (Design Director, tier 2 round 1 decisions, on my proposal): adopted -- start-screen
  Open of a data file through the Data page (with the risk that opening one's own file gains one
  step, re-walked in the dry run); the source's "..." menu with Replace and Edit source sharing the
  row menu's verbs; find's hint to the rule start, decided by the element (`scope.count`), not by
  app parsing; ", out of date" on the key title only. Rejected -- "Select where..." on the column
  (confounds the hint; only if the hint fails with 3+ in one place); visible Replace buttons in the
  inspector body (words at rest). I accept: each reason keeps one variable per path.

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
