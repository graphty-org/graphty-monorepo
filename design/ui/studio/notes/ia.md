# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

1. (2026-10-07) Round 3 watch, sizing: Size "+" now opens its picker at once (pilot T9 and T15
   reach the end in one step fewer). The only sizing change, so round 3 credits it. Pass bar:
   fewer than half of sizing sessions name the path as a guess (round 2: 18 of 18). If it still
   costs, next candidate is the "Shape" heading: the menu still reads "Add to Shape: Size, Shape".
2. (2026-10-07) Round 3 watch, names: "Show all labels" beside "N labels, M hidden" (pilot T10
   both datasets, 5 steps). T10 keeps its prompt, so it now tests the switch. Watch whether people
   see it and whether the full-names drawing (overlapping names) reads as done or as a mess.
3. (2026-10-07) I was wrong that a show-all control had to wait for the element: the element
   already had `layoutBehavior.labels.declutter`. Before calling a door "blocked on the element",
   read the element's existing config and catalog.
4. (2026-10-07) A run is named by its method everywhere (pilot T7, T16: row, key, inspector,
   "Made with"). My subtitle-only proposal lost to "no third naming state" -- correct by one home.
   Watch for anyone missing the result word ("Influence") now that it is gone.
5. (2026-10-07) Grouping candidates come from the element (`optionsFor` "partition" values); the
   app's `groupings()` goes. Pilot T11: Rings and Columns by group open with "Group by:
   Communities". New IA watch: Spectral, Circle (a sphere in 3D) and concentric Rings did not
   untangle anything -- the Layout list may offer methods that do not answer the task.
6. (2026-10-07) The Degree-row chevron is now part of the row (shared compact-mantine fix). Pass
   bar: no dead first click on the chevron. Keep Neighborhood (G) for keyboard; add no doors.
7. (2026-10-07) Still open, deferred to after round 3: the key box covering nodes on every load
   (placement question; needs element API; the seed is the owner's); one refusal sentence for a
   damaged file from both intake doors; Overview "Undirected, from the file: directed 0" overflow
   and truncated "Edges per ...", "Les Mis..." (pilot T6, unfixed two builds running).
8. (2026-10-07) "Selection 18" vs "Javert's 17 connections": my "Javert and his 17" was rejected
   (the app cannot know gender). If the mismatch recurs, propose a neutral form ("Javert and 17
   connections") rather than re-sending the old one.
9. (2026-10-07) The first drawing shows no names (pilot T16): the likely reason a newcomer stops.
   A default, not a door; raise it only with evidence from the first-look task.
10. (2026-10-07) Lesson: propose one change per path. Two of my round 2 proposals (bound Size plus
    a heading rename) were cut to one so round 3 can credit it. Pick the stronger one myself.
11. (2026-10-06) Fix the door people reach for before marking the door they ignore; then mark it
    -- the chevron cue was what people used.
12. (2026-10-06) A refusal lives next to the control that caused it; one refusal per cause, same
    words from every door.
13. (2026-10-06) Rejected, do not re-propose without new evidence: filling Size's list with results
    (second bind door); names in the Summary (second neighbor list); a Style-tab pointer to Label;
    Size arriving pre-bound to the row's result (sizes by a group id on a community run).
14. (2026-10-07) Do not change: rail (Graph, Data), Analyze and "Start here", File list and intake,
    Values tab, save and reopen. No failure traced to them in rounds 1-2.
15. (2026-10-06) Simulated participants share one model: a pass is weak, a failure strong. Count a
    deterministic layout event once per dataset, but remember every user of that sample meets it.

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

- 2026-09-28 (owner): structure from graphty's ontology and IA; Figma for controls and gestures
  only. Export... lives in the project-name menu, not top right. No avatar slot.
- 2026-09-28 (studio, round 3-4): a Data place created so data management is one coherent area
  (in, versioned, refreshed, joined, filtered, exported). Reason: the owner called a top-right
  Export button a symptom of data management never having been designed.
- 2026-09-28 to 2026-09-30 (studio, then owner): where results live moved four times -- Results
  rail place, then an inspector section (round 3), kept despite missing its bar (round 4), back
  to a rail place after a two-arm tree test (round 5: inspector arm 25% direct), then the owner's
  refined B made every run a row in the paint tree with no Results place at all. Lesson: results
  belong where they paint; the run's own record opens from its row.
- 2026-09-30 (owner): refined structure B is THE structure: one tree of paint rows on the left
  (top to bottom is paint order, a higher row wins), Selection pinned on top, Everything at the
  bottom, every run a row with its paintable outputs as children, inspector with Style and Data
  (now Values) tabs, filters belong with the data, hiding is the eye.
- 2026-09-30 (owner): rail is for places; toolbar icons only; legend and camera via the toolbar,
  not floating on the canvas; rename by double-click.
- 2026-10-01 (studio, round 7): One File list (Save, Export..., Apply recipe or style file...,
  Version history, Open project or file...) defined once and shown from both the main menu and
  the project-name menu. Reason: without a File menu the save-and-reopen tree task fell from 100%
  to 19% direct; 13 of 16 opened the main menu first.
- 2026-10-01 (studio, round 7): the intake is "Open project or file..." with a hint saying what
  the file decides. Reason: 10 of 16 rejected "Open..." as replacing their project.
- 2026-10-01 (studio, round 7): Layout gets its own group, not under Style. Reason: tree 6% direct
  when Layout lived under the Style tab; "style means colors".
- 2026-10-01 (studio, round 7): the bind icon on Color and Size is the one door to "color/size
  by"; no second door on the attribute inspector. Vocabulary lives only in the framework glossary.
- 2026-10-02 (studio, round 8): the list's search box becomes one find over rows, elements
  (label, id, value) and notes, live as you type, with "Select where <attribute> is <value>".
  Reason: the box could not find a node (severity 4); select-by-rule tree 10% direct.
- 2026-10-02 (studio, round 8): a node's neighbors have one home -- the neighborhood list
  ("Javert's 17 connections") reached from Degree or Neighborhood (G). No table filter or
  second Connections list. Reason: 0 of 12 could name neighbors; one home for "who is this node
  tied to".
- 2026-10-02 (studio, round 8): Export > Data opens on the showing table (Nodes by default); the
  table's Export... opens the same dialog. Reason: first click 10%, tree 38% direct.
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

## Tried: worked / did not work

- 2026-09-28 to 10-02 -- Tree tests (text outline only). Worked as a ranking of where to look:
  they found the File menu loss, the Layout-under-Style miss and select-by-rule. Did not work as
  a pass/fail: correctness hit the ceiling (99.7%), only directness discriminates.
- Round 4 -- Results in the inspector: did not work (63%, 0%, 69% direct; every miss went to the
  table). Round 5 two-arm test with a frozen rule settled it; frozen rules before a round work.
- Round 5 -- decisions not drawn on the screens re-measured the old design. Taught: a round may
  not run until its decisions are drawn.
- Round 7 -- removing the File menu in refined B: did not work (19% direct). Restored.
- Round 7 -- renaming the owner's "hide"/"show hidden" for the list to "Remove from list view":
  worked; 4 of 5 read a "hidden" row that still paints as a bug.
- Round 8 -- one File list from two menus: worked (picture for slides 19% -> 90% direct; a
  colleague's style file 13% -> 95%; replace next month's file 63% -> 86%).
- Round 8 -- "Data" as rail place and inspector tab: did not work (12 of 12 lost their
  selection). Renamed the tab Values (untested).
- Round 8 -- Analyze headings by what a run adds ("Rank", "Find groups", "Measure the graph"):
  did not work for betweenness (29% direct). The search box inside Analyze ("brokers" finds
  Betweenness) did work.
- Round 8 -- Label as a section with a "+": first click fine (20 of 21 on the "+"); the menu
  behind it failed ("Show labels" trap). The place was right; the content of the door was wrong.
- Round 8 -- "Covers: Javert and 17 neighbors": did not work -- a count with no names behind it.
- Round 8 -- Main menu > Select where...: found only by guessing (2 of 21 direct). People look
  in a search box first (16 of 16 in round 7).
- Round 8 -- the "Full graph (filter)" chip read as a status label, not a control.
- Round 8 -- the legend: 13 of 21 expected clicking a legend entry to isolate a result.

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

## Thinking

- **The open tier 1 IA questions, in order of risk on the core path:**
  1. Does Open project or file... behave as its one-intake label promises? If a saved project
     re-imports as data, T14 (save and reopen) has a door that lies.
  2. Do the two homes-that-were-wrong now work on real wiring: names on every node (Label "+"),
     and a node's neighbors by name? These were the tier 1 failures.
  3. Is "Values" findable as the place a node's data lives, and does selecting a node land
     there? Do first-time users go to the Data rail place instead?
  4. Does a first-time user tell the Data place (rail), the Data page (full page) and the Values
     tab apart? Three surfaces for "data" is a known collision risk.
  5. Can a first-time user find a run by name (find box has no Rows group yet)?
  6. Is Analyze's search box enough, or do the headings still cost wrong turns on the real
     popover? Candidate: compare headings by what a run adds vs by question vs no headings
     (alphabetical with search), on two domains.
  7. Export of the numbers: does a first-time user find Export > Data, and does the table's
     own door land in the same dialog?
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
