# Tier 3 answer key: first use and styling -- GRADERS ONLY

Participants never see this file. Tasks: `tasks.md`. Bars: `criteria.md`. Participants: `roster.md`.

## How a session is graded

- **Grades:** S (succeeded on the success path or a route as short), SD (succeeded by a detour or
  with help the screen gave after a wrong turn), F (did not reach the success state, or reached it
  and said something wrong about it), G (gave up). Success = S or SD. VOID only when the tool or
  the run failed, or the participant opened a file outside its own folder (`leaks.json`). A
  give-up the persona file scripts ("scripted exit") is graded G with the line `Scripted exit: yes`
  after the first three; it is never VOID and stays in bar 1's denominator.
- **From what:** the last screenshot, the files in `downloads/` and `saved/`, the transcript, and
  the style tree `real.mjs` writes: `styles-start.json` and `styles.json` (the whole tree at the
  start and the end, every layer's conditions, values and counts, and `changes`: layers gone,
  added and changed) and `styles-steps.jsonl` (whether each screenshot's looks differ from the
  first graph the session drew). Never from the participant's own rating.
- **The start page's turning sample is a graph to the tool** (build 7d87760756): every session
  opens on a start page that draws Les Miserables in six community colors, so `styles-start.json`,
  the `start` and `changes` of `styles.json` and the first `graph: true` lines of
  `styles-steps.jsonl` record that demo, not the task's graph (`changes` then lists the demo's nine
  layers as gone and every layer of the task's graph as added). Read the task's start from the
  first `styles-steps.jsonl` line after the task's sample or file opened, and grade layers from
  the layers in `styles.json` themselves, never from `changes`. The tool's line "the app never
  drew its window" at every start is the tool misreading the start page: not a VOID.
- **An answer counts only when it was on screen first** (a count, a name, a rule) at or before the
  step where the participant gave it. A right answer the screen never showed is F.
- **False "done":** the participant says the task is done while the last screen or the style tree
  shows it is not. Recorded apart from the grade (bar 2).
- **Wrong turns:** a move that leads away from the success state and is later undone or abandoned
  (opening the wrong place, a look put on the wrong layer, a card on the wrong field). Counted per
  session (bar 3).
- **Steps are counted the same way for the participant and the key:** one step is one thing a
  person does -- a click, a typed entry with its Enter, one key, picking one option. Typing and
  picking the offered match is one step. A click the tool refused (keyboard-only mode) is none.
- **`grade.md` starts with three lines**, which `../tool/score.mjs` reads:
  `Grade: S|SD|F|G|VOID`, `False done: yes|no`, `Wrong turns: <n>`. A T47 or T48 success adds
  `Route: folder|several|one by one|around|cover` (T47 and T48 below); every T46 and T47 session
  adds `Token: touched|not touched, <what followed>` (did the reader open or change a field
  showing the purple "Layer" token, and what came of it); a scripted exit adds `Scripted exit: yes`.
- **Severity** 0-4 (Nielsen) for every problem, with the step and screenshot. Not new findings:
  a new name drawn too small at the default framing, and the default label font naming no fallback
  (open owner decisions, `../owner-decisions.md`).

## Rules settled before round 1 (2026-10-18)

These override any line below that says otherwise.

- **T46 to T48, any community analysis counts.** The prompts ask the program to work out circles
  or clusters and never name one method, so a run of any community analysis the analysis list
  offers (Louvain, Leiden, Label propagation, Markov, Spectral, Hierarchical) is the clusters the
  task means. Where a task below says "Louvain", read "the community analysis the participant
  ran"; each method's group sizes and target count are read twice on the frozen build
  (`criteria.md`, preflight 5) and graded against. A per-node ranking (Clustering coefficient) is
  not a clustering: F.
- **T48 B, a run while a filter step is on**, then the step turned off: `Route: around`. It ends on
  the target look and count but is not the bulk edit, so it never counts toward the bulk route
  bar.
- **T44 A, `id` as the name:** accepted (S), as below; it is the name with its spaces dropped
  (`MlleVaubois`), and the reader reads who each node is.
- **T49 is graded by the drawing.** Success: the change was made (as below), and the last
  `colors` in `styles-steps.jsonl` with `graph: true` equal those of the first line after the
  sample opened (not the start page's demo, above; corrected 2026-10-20 on build 7d87760756); S or
  SD by the usual rule. A last line whose `colors` is `["none"]` (the Color line removed, the
  default drawn) matches the drawing too. A style tree that then differs from the start (the Color line removed, a `revision`
  changed) is recorded as a finding about the design, never as an F or a false "done": the screen
  cannot show the difference.
- **T46 to T48, a method whose two runs differ** (preflight 5 marks it in Reference values): the
  session is graded against its own run. The target group and its count are read from that
  session's `styles.json`, never from a fixed number.
- **T50 B, a reading from "Select what it paints"** ("31 or more hours and trained", from the
  summary's "hours 31 to 52" and "trained Yes (6)"): S. No volunteer has exactly 30 hours, so the
  summary and the card's rule (30 to 52) name the same six people. Every T50 grade adds
  `Read from: rule|selection|other` for question 5 (2026-10-20).
- **An asked color** (A of T39 "any dark green", "bright red" on T41 and T46, and every other color
  a prompt names) is judged by `colorWord` in compact-mantine's `color-utils.ts` on the drawn
  value: it holds when that name contains the asked hue word (green, orange, purple, red, blue,
  yellow); "dark" and "bright" are recorded, not graded. Graders write the drawn hex and its
  `colorWord` in grade.md (2026-10-20).
- **The camera and framing** follow `decided.md` (2026-10-20, golden): the camera glides to center
  every pick. A line below that says the drawing moves right and shrinks describes an older build;
  no grade turns on the framing.
- **A styled node left selected** (the find-box detours on T40 A, T40 B and T50 A) is graded by
  its color in the style tree, not by how its selection ring tints it. A tint that makes it read
  as a color the key does not say is recorded for the audit as a key-and-drawing disagreement.

## Rules settled before round 1 (2026-10-21)

- **A participant's file merged into an open sample** (any task whose file is brought in while a
  sample is open; seen on T43 B and T51 A). On 758b8e8081, Control+O and the
  Main menu's "Open project or file..." over a sample offer "Add to <sample>" with Cancel and Load
  only, no Replace, so Load merges the file into the sample (T43 B: 58 nodes, 137 edges, 2
  components; T51 A over Florentine: 39 nodes). Graders read each task's success definition over
  the nodes and ties that came from the participant's file: they carry the file's ids (`v01` to
  `v24`, `s01` to `s24`) and its columns. The sample's nodes and ties, which carry none of the
  file's columns, are left out of "every node", of every count and of "everything else unchanged";
  a sample node drawn in a task's look, or a size or color scale they leave unmeasured ("15 carry
  no value the scale can read", a key line missing for them), changes no grade. A count, a name or
  a color the participant gives for the sample's nodes, or for the merged whole, is graded as given
  against the file's answer: Harlan Development read as the biggest donor is S, a sample node named
  or a merged total said as the file's is F. Graders add `Merged: yes` to grade.md, and the merge
  is recorded as a finding about the open-a-file route, never as a wrong turn by itself. Undo
  (one Control+Z: "Undid changing settings and importing data.") or New project > Add data leaves
  the file alone, and is graded as usual.

## Facts no briefing may hold

What a task asks a participant to find. `real.mjs --brief` refuses a briefing that holds one;
`--leaks` voids a session whose briefing does.

- `Valjean` -- T37 A's most connected character
- `Aisha Bello`, `Diego Ruiz`, `Nora Lindqvist`, `Julia Rossi` -- T41 A's answer
- `Della Whitfield`, `Ines Moreau`, `Friends of the Waterfront`, `Tomas Varga` -- T41 B's answer
- `Hannah Weiss` -- T43 A's answer
- `Harlan Development` -- T43 B's answer
- `Mlle Baptistine`, `Mlle Gillenormand`, `Mlle Vaubois` -- T50 A's answer
- `GAL80` -- part of T40 B's answer

## Reference values

Read from the study files and the samples, and checked on build `31e8c2387` (app 0.8.68) by the
pilots in `pilot-materials/` and by the scripted walk of `../tool/bars.mjs --tier 3`. Values that
depend on a run's output are marked; each is read again on the frozen build before round 1, and a
difference is a finding. Read again on 58556989e8 by the pilots in `rounds/r1/pilot/`, and on the
frozen build ed4351b258 by the pilots in `rounds/r1d1/pilot/`, and on the frozen build
5bd16cda6e by the same pilots again, and on the frozen build 6dd0b00bd7 by the pilots in
`rounds/r1d2/pilot/`: every value below held, and the run outputs repeated (Les Miserables'
Louvain sizes not read again on 6dd0b00bd7, where T46 A was not walked; the run gave 6 groups).
Read again on the frozen build e3c5bca8e6 by the pilots in `rounds/r1/pilot/` (T37 A to T51 B):
every value held, Les Miserables' Louvain run gave 6 groups with Javert in Group 3 of 11, and
the T49 looks repeated. Read again on the frozen build 7d87760756 by the same pilots (session
folders named in each task below): every data value held; Les Miserables' Louvain run gave 20,
17, 11, 11, 10 and 8 in all three walks, Javert in Group 3 of 11; College football's gave 16, 15,
14, 12, 11, 10, 10, 9, 9, 9, Nebraska in Group 4 of 12; volunteers' and sources' runs left 15 and
12 in cluster colors; the T49 looks have new hashes (T49 below). The two project files' layers did not load on that build. Read again on the frozen build 6de5f95d12 by the pilots in `rounds/r1d1/pilot/`: every data value held; Les Miserables' Louvain run gave 20, 17, 11, 11, 10 and 8, Javert in Group 3 of 11; College football's gave 16, 15, 14, 12, 11, 10, 10, 9, 9, 9, Nebraska in Group 4 of 12; the karate club's gave 12, 11, 6 and 5; and both project files open with their layers again (T50 below).

| What                                                | Value                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les Miserables                                      | 77 characters, 254 ties; node columns `id`, `name` only (`id` is the name with its spaces dropped: `MlleVaubois`); tie column `shared_chapters`                                         |
| Les Miserables, most connected                      | Valjean, 36 ties (next Gavroche 22)                                                                                                                                                     |
| Les Miserables, names holding "Mme"                 | 6: Mme Magloire, Mme de R, Mme Thenardier, Mme Burgon, Mme Pontmercy, Mme Hucheloup                                                                                                     |
| Les Miserables, names holding "Mlle"                | 3: Mlle Baptistine, Mlle Gillenormand, Mlle Vaubois                                                                                                                                     |
| Les Miserables, ties with 5 or more shared chapters | 51 of 254                                                                                                                                                                               |
| Les Miserables, Louvain circles (run output)        | 6 circles: Group 1 to 6 of 20, 17, 11, 11, 10, 8 characters; Javert in Group 3, 11 characters (two runs on 31e8c2387 agreed; the same on 58556989e8 and ed4351b258)                     |
| Zachary's karate club                               | 34 members (ids 1 to 34), 78 ties; no columns but `id`                                                                                                                                  |
| Karate, most connected                              | member 34, 17 ties (next member 1, 16)                                                                                                                                                  |
| College football                                    | 115 teams, 613 ties; team names as one word (`FloridaState`, `Nebraska`); conference in `value`                                                                                         |
| Football, Louvain clusters (run output)             | 10 clusters, Group 1 to 10 of 16, 15, 14, 12, 11, 10, 10, 9, 9, 9 teams; Nebraska in Group 4, 12 teams (one run on 31e8c2387; the same in two runs on 58556989e8 and on ed4351b258)     |
| volunteers.graphml                                  | 24 people, 63 ties; columns `name` (text), `role` (category: volunteer 16, staff 5, board 3), `hours` (whole number 2 to 52), `trained` (yes/no, 15 yes), `phone` (text, missing for 7) |
| volunteers, Louvain circles (run output)            | 3 circles of 8; 5 trained in each, 15 in all (ed4351b258)                                                                                                                               |
| volunteers, board or staff                          | 8                                                                                                                                                                                       |
| volunteers, trained and no phone                    | 4: Aisha Bello, Diego Ruiz, Nora Lindqvist, Julia Rossi                                                                                                                                 |
| volunteers, 20 or more hours                        | 11                                                                                                                                                                                      |
| volunteers, most hours                              | Hannah Weiss, 52                                                                                                                                                                        |
| volunteers, 30 or more hours and trained (T50 B)    | 6: James Carter, Priya Nair, Hannah Weiss, Lucy Grant, Ken Ito, Ben Adler (Zara Ahmed, 38 hours, not trained)                                                                           |
| sources.graphml                                     | 24 sources, 59 ties; `name`, `kind` (person 14, company 6, agency 4), `donations` (0 to 250,000), `on_record` (12 yes), `email` (missing for 9)                                         |
| sources, Louvain clusters (run output)              | 3 clusters; 4 on the record in each, 12 in all (ed4351b258)                                                                                                                             |
| sources, company or agency                          | 10                                                                                                                                                                                      |
| sources, on the record and no email                 | 4: Della Whitfield, Ines Moreau, Friends of the Waterfront, Tomas Varga                                                                                                                 |
| sources, 10,000 or more in donations                | 9                                                                                                                                                                                       |
| sources, most donations                             | Harlan Development, 250,000                                                                                                                                                             |
| neighbors.csv                                       | 16 people, 30 ties; tie columns `kind` (neighbors 16, family 8, coworkers 6), `years_known`, `close`                                                                                    |
| yeast-galactose.graphml                             | 331 genes, 361 ties; names beginning with GAL: 8 (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11, GAL80); no other name holds GAL                                                           |
| The starting look                                   | every node color `#6366F1`, size 1, shape icosphere; every tie dark gray (`A9A9A9`), width 8                                                                                            |
| lesmis-poster.graphty.json                          | Les Miserables with one layer "Poster": name contains "Mlle", node color `#FFA500` (orange), 3 characters                                                                               |
| volunteers-thanks.graphty.json                      | volunteers with one layer "Thank-you cards": hours 30 to 52 and trained yes, node color `#008000` (green), 6 people                                                                     |

## Success paths on build 758b8e8081

Every success path below was walked on build 7d87760756 by the round 1 pilots in
`rounds/r1/pilot/<task><half>/`, by pointer, by detours and by keyboard, and walked again on the
frozen build 6de5f95d12 by the pilots in `rounds/r1d1/pilot/<task><half>/`: 21 of the 30 halves,
each success path by pointer and most by keyboard, with the detours that build's changes touch
(opening a file again over the graph, the table after a community run, the two project files).
T38 A, T40 B, T42 B, T46 B, T47 A, T48 B, T49 A and T51 were not walked again (T46 B's table
route was walked from T43 B's sessions). Each task names its session folders (the other folders
there belong to older builds or earlier walks). Where 6de5f95d12 differs from 7d87760756 the text
says what 6de5f95d12 shows. Walked again on the frozen build 758b8e8081 by the pilots in `rounds/r1d2/pilot/<task><half>/`: 15 halves (T37 B, T38 B, T39 A, T40 B, T41 A and B, T42 A, T43 A and B, T44 A and B, T45 A and B, T46 B, T49 A), each success path by pointer, most by keyboard, with the routes this build's fixes touch (a layer made from a find-box selection whose condition is edited before its first look; a layer colored or labeled, then Control+O > Replace with the same file and two undos; the first find-box pick after Replace). Every success path walked matched its count. Where 758b8e8081 differs from 6de5f95d12 the text says what 758b8e8081 shows. Most halves' `report.md` was not rewritten for this build (the walk agents could not write
it); the screenshots in the named folders are the record. Steps are counted one thing a person
does each: a click, a typed entry with its Enter, one key, one option picked. "Open a file" with
the file chosen in the chooser is one step (the tool's `--upload` does both). Against the key on
e3c5bca8e6 a sample still takes two steps (Samples and its card, where "No thanks" and the sample
were two) and a file takes one fewer ("Open a file" and Load, where "No thanks", "Open project or
file" and Load were three). Things every path meets on this build:

- **The start page.** The app opens on a scrolling page headed "Analyze any network." with the
  buttons "Open a file" (subtitle "CSV, GraphML, GEXF, Cytoscape, or a saved project"), "Open
  network data", "Samples" and "New project", beside a turning demo drawing of Les Miserables
  colored by community, with its own buttons Communities (pressed), Key players, Shortest path,
  2D and "Pause the turning" (no tooltip) and the live line "Colored by community: 6 groups, each
  more linked inside than out." (filled before it is read). "Key players" says "Valjean is the
  biggest", and a demo node's card reads "Valjean, 36 connections" or "Babet, Community 3 of 6"
  (its numbering is not a workspace run's); a wheel over the demo zooms it instead of scrolling
  the page. The demo cannot be styled and leads nowhere: nothing done there is on the task's
  graph. The top bar holds Main menu, a "Samples" link (two controls named Samples), Docs, For
  developers, GitHub, "Switch to dark mode" and "Settings...". **Samples** (the button or the
  link) scrolls to the "Sample library": a "Search samples" box, Grid, List, "Any" and eight
  category chips, and cards titled by a question, the dataset in a smaller line: Les Miserables is "Who holds the novel together" (its smaller line "Les Miserables -- 77 nodes, 254 edges"), Zachary's karate club "A club that split in two" ("34 nodes,
  78 edges"), College football "Conferences fall out of who played whom"; each card's accessible
  name is "Open the <sample> sample". On 758b8e8081 the card pictures load (on 6de5f95d12 every card's picture was a broken image, blocked by the browser as ERR_BLOCKED_BY_ORB). The search
  filters with no spoken count, and Enter with one card left does nothing. **The usage-data
  notice** ("No thanks") sits at the foot of the page, below the library, out of view at 1440 x
  900; no path needs it and it is no step (the tool's click on it only scrolls the page). **"Open
  network data"** offers NDEx, Neo4j and Web API cards that say they are "on the way" and a
  web-address box (a file name there gets the browser's "Please enter a URL."): no local file and
  no samples. **"New project"** opens an empty Untitled project; its "Add data..." > "Choose a
  file..." and Load open the file, but the project stays "Untitled" (Open a file names it after
  the file). A file dropped on the start page opens the read-the-file page. By keyboard, "Open a
  file" is the 14th to 16th Tab stop (after the top bar, the demo canvas and its five buttons) and
  Samples the 16th; Enter on Samples scrolls to the library but leaves focus on the button, out of
  view, and the next Tabs pass New project, "MIT licensed" and "Put it on your own site" before
  the search box; a sample card is 16 to 18 Tabs after Samples (Les Miserables 16, the karate club 17, College football 18; 32 to 34 from the top). Enter on the top bar's Samples link also leaves focus at the top: College football's card is then 30 Tabs on (T46 B).
- **After a sample or file opens**, a notice "This browser may clear what it keeps for this site.
  Save a copy to a file to be sure." sits at the bottom of the canvas above the toolbar, with Dismiss and Save buttons (by Shift+Tab they come before the layer list), covering the bottom of the drawing (with the table open, its bottom cluster); it went at the first click on some walks and stayed until dismissed on others, and on 758b8e8081 it did not show on any T45 A walk. It is announced as soon as the graph opens, while the top bar reads "Autosave: saved". It is the
  notice a first-time visitor's own browser gets: the site's storage is not marked persistent.
  Until 2026-10-21 study sessions ran in an incognito browser context, and the notice read "This
  looks like a private window: your work is gone when it closes. Save a copy to a file to keep
  it."; since then each session runs on a browser profile on disk. Pilot screenshots taken before
  that show the old wording.
- **A new layer's name box** opens with "Layer 1" selected. Enter, Escape or the next click all
  keep the name, so it is no step of its own (by keyboard, focus is in the "Layer name" box after
  Layer, and Enter puts it on the tree row). A new layer reads "Node and edge layer". It becomes
  "Node layer" (its Edge tab "not styled") as soon as a node column is picked or a value ticked in
  its Which nodes, and "Edge layer" as soon as a condition is added on its Edge tab; the row's
  count follows at once (254, then 51 on T45 B; 8 on T45 A). The name stays "Layer 1".
- **A new layer's "Which nodes"** ("Which edges" on the Edge tab) arrives collapsed, reading "All
  24 nodes: add a condition to narrow". A click on that line only expands the section, showing
  "+ Add a condition" and Done; a second click, on "Add a condition", opens the attribute list.
  The key counts both: "Which nodes" and "Add a condition" are two steps. By keyboard, Enter on
  the button "Which nodes, 24 of 24 nodes, All 24 nodes: add a condition to narrow" puts focus on
  "Add a condition", and Enter there opens the list. While the list is open it covers Done. This
  contradicts `decided.md` (2026-10-19: with no condition yet, opening Which nodes opens the
  attribute list with focus in its search): the key counts the screen. On T45 by keyboard the new
  layer's Edge tab arrived with Which edges already open, and Tab from "Style edges" went straight
  to "Add a condition". A just-added number card with no value typed shows a count of its own (`shared_chapters`, "254 edges", T45 B), against `decided.md` (2026-10-19: a card with no value yet shows no count of its own).
- **Selecting a layer** (Everything, a folder, a group) opens its inspector already on the Style
  tab. Clicking Style is no step. A new layer always opens on the Node tab; an existing one on the
  tab last shown.
- **A sample or file just opened** shows the Graph inspector on its Values tab. By keyboard, focus
  lands on the inspector's heading "Graph, volunteers: 24 nodes, 63 edges" (no focus ring is drawn
  on it) and the counts are announced ("Les Miserables: 77 nodes, 254 edges"); the layer list is 5
  or 6 Shift+Tabs back (Everything is 5; with the storage notice showing, its Dismiss and Save come first, so Everything is 7 and "Add a layer or a folder" 8), or about 15 Tabs forward through the inspector and the
  top bar (the inspector's rows, "Resize inspector", Main menu, Project, Undo, Redo, Local only,
  Graph, "Graph <name>", Find, then the layer "+"). Tab into the layer tree lands on Everything,
  its last row, not its first (Hovered). F6 cycles four stops and never the top bar: the
  inspector, the canvas "Graph drawing", the toolbar (Analyze) and the left panel, in an order that
  depends on where it starts; it re-enters a region at its last focused control, so it can land on
  the separators "Resize left panel" or "Resize inspector" or on the table grid, and the left panel
  is entered at "Graph <name>", the find box or a tree row. `decided.md` (2026-10-19) says five
  regions, top bar first, never a resize handle: a defect, and the key counts the screen. A dimmed
  Undo and Redo are Tab stops (as `decided.md` says); on hover Undo shows "Nothing to undo". On the
  read-the-file page, Load announces only "All 24 rows"; the sentence with the node and edge counts
  is outside that region.
- **The toolbar** is one Tab stop (Analyze); Layout, View, Legend, Table, Filters and Quick actions
  are reached with the arrow keys, and nothing says so. Filters switches the left panel to Data.
- **A run** (Degree, Louvain) recolors at once, and its key ("Color: Louvain") opens over the top
  left of the drawing, where it can cover a node (on T48 A one Group 3 node, so a count of colored
  dots gives one too few; Fit clears it). With nothing selected the drawing stays put when a key
  first appears, after a run, a committed color or a binding, as `decided.md` (2026-10-19) says.
  With a node or a selection held, a run, and the first color or size of a layer made from a
  selection, move the whole drawing about 110 to 155 px right (Valjean 748,433 to 880,433), often
  pushing a cluster under the inspector, and Undo of a run moves it back and forth: a defect
  against the same rule. Selecting every node (Control+A, or the canvas's "Select all") shrinks and shifts the drawing before anything is styled, and opening the table shrinks it into the canvas's top half (both against it). On 758b8e8081 the move put painted nodes off screen on the last screenshot (7 of T38 B's 10 blue on an edited find-box layer, 3 of T41 B's 4 red): the layer is graded from `styles.json`, and a count or a name the participant gives by the rule above (only what was on screen counts). The camera glides to center every pick (`decided.md`, 2026-10-20), which leaves
  parts of the drawing under the inspector or off the edges; Fit (right-click on the canvas, or
  `0`) brings it all back. The analysis card's button is named "Run <analysis>" ("Run Degree", "Run Louvain"). After a run
  the analysis list holds the analysis twice (under Recent and under its group). The analysis
  filter's `most` highlights Degree first, with Most flow dimmed ("Select 2 nodes first").
- **A selected node's inspector** opens on its Values tab, titled by the node's id (`v20`, `74`
  for Nebraska) with the name a row below. Its look is under Style > "Why this look"; the layer
  link there ("Open layer Poster") opens that layer on the tab last shown. Escape on a node's
  heading clears the selection ("Selection cleared: 1 node"), but Escape on its Degree row
  ("Degree 17") does not and says nothing; Escape on a layer's inspector (its size link icon; its Which nodes summary on the karate club, T37 B) and
  on the "Resize table" separator cleared a selection, and Escape in the "Discard unsaved
  changes?" dialog clears the selection behind it. `decided.md` (2026-10-19) settles Escape in
  the inspector the other way in each of these: defects, recorded, never graded.
- **Fill "+"** ("Add to node fill", also its tooltip) opens no menu: it adds the Color line at
  once, with focus in the color box and its value (`6366F1`) selected. The key over the drawing
  ("Color: Layer 1", "8 of 24 nodes" on a second line) and the toolbar's Legend come only once a
  color is typed and committed. Line "+" ("Add to edge line") still opens a menu (Color, Width,
  Pattern, Pattern count, Curved); after its Color or Width (and after Size), focus is in the new
  box with its value selected. Typing a word (`blue` gives `0000FF`) or a hex and Enter works at
  once. The key can cover a node at its top left; a square's tooltip in it covers its neighbors.
- **Enter in a just-added color box** keeps focus in the box with the new value selected
  ("Node color, set here, blue", `0000FF`), on every kind of layer; Tab then goes to "Node color
  by attribute". After a Line "+" > Color, Enter leaves the Color row below Width and focus in the
  box. Escape in a just-added box removes the whole line, even with typed text in it, and moves focus to the section's "+", with no notice on screen (on 6de5f95d12 a screen reader hears "Node color not added"; a selection's just-added Size line too;
  only a Label line says "Label not added: no value was picked"); in a set box it only discards
  the edit.
- **An unset Color line** (Fill "+" on a new layer that will cover others, or Color added back
  after its line was removed) shows `6366F1` in italics with the name "Node color, not set, drawn
  #6366F1 indigo". It takes the value it shows: Enter on it, or `6366F1` typed and Enter, sets
  `6366F1` and repaints. Tab leaves it unset, and Escape removes the line.
- **The color box's accessible name** reads "Node color, set here, indigo" for the starting
  `6366F1` on Everything, "Node color, not set, drawn #6366F1 indigo" on a just-added line (the
  edge's "Edge color, not set, drawn #A9A9A9 dark gray"), and names a typed color by a nearby name
  (`purple` is "purple", "Node color now purple, on 6 nodes"; Group 5's crimson `BE0032` is
  "pink"). Grade a color on the hex in the style tree, never on the spoken name. A "Pick node
  color" swatch button comes just before the box in Tab order.
- **A color word with a space** (`dark green`) is read as that color (`006400`).
- **Escape in a style box** (color, width, size, label size) after typing puts the old value back
  and keeps focus in the box, value selected, and says "Edit discarded; this stays 0000FF." on
  screen (a line under or beside the box, which can wrap into a narrow column and push the box's
  icons out of line) and to a screen reader. With nothing typed it does nothing. Escape in the color picker's hex box and in a size dialog's boxes ("Values from") reverts silently, against `decided.md` (2026-10-19). A click into the picker's hex box can leave the caret after the value, so typed text is added on (`0000FF00FF00`, T49 A).
- **Control+A** on the canvas, or with focus on an inspector button or tab, selects every node
  and edge ("77 nodes, 254 edges") and moves the inspector to the selection; the canvas's
  right-click menu (Fit, Frame selection, New layer from selection, Select all, Clear selection)
  offers "Select all" too.
- **Control+Z with focus in a color box** undoes the last change at once ("Undid changing node
  color on Everything."); so does the Undo arrow (tooltip "Undo changing node color on Everything
  Ctrl+Z"; once enabled the button's name is "Undo changing node color on Everything"). Undo is
  dimmed when a sample or file opens (dimmed it is a Tab stop); an extra Control+Z does
  nothing. Control+Shift+Z and Control+Y redo ("Redid changing node color on Everything."). With
  focus in the find box, Control+Z undoes the box's typing, not a style change.
- **Picking a column for a condition** ("Find an attribute": the file's columns under Data, then
  "Node id" under Structure; nothing is highlighted when the list opens, so the first ArrowDown
  highlights the first row) puts focus in the card's text box (text column; named "name: text to
  match") or its from box (number column; "hours from, number") with the value selected, so typing
  replaces it. Tab in the list closes it and picks nothing, even with letters typed and an option
  highlighted (`decided.md` says Tab takes it: a defect); only Enter or a click picks. The list's
  search matches column names only (`family` or `missing`: "Nothing found"). The match
  menu is named "<column>: how to match" ("phone: how to match", value "Contains"; on a yes/no card
  the same name is on the value select, Yes / No / Has a value / Has no value). A category card
  lists "volunteer, 16 nodes" and so on; its "Remove role" button comes before the values in Tab
  order, as drawn at the card's top, and Tab from the last value goes to "Add a condition". By
  keyboard, Enter on a ticked value closes the card as Done does. A text card's count follows each
  keystroke on screen and is announced once, when typing pauses ("8 of 331 nodes"), and typing opens
  a list of the matching names under the box, over Match case and Done; ArrowDown on a name
  announces "GAL1", not as selected; Enter keeps the typed text, Tab closes the list and goes to
  Match case. Escape in a card's text or number box keeps what was typed and leaves the picker open (but Escape in a category card's value search, "Search Louvain", closes the whole picker with the edits kept, T46 B, against `decided.md`)
  (with the list of names open, the first Escape closes only the list), and a second Escape does
  nothing; a number the card cannot take stays, with its red reason, through Escape. Escape with
  focus on a value checkbox or a yes/no card's value select closes the picker, ticks kept, focus
  on Which nodes (against `decided.md`); Escape in a just-added empty text card drops it and closes
  the picker the same way. Done, a click on the canvas or focus leaving closes the picker. A
  number card's count and the drawing change only on Enter or Tab; by keyboard Tab out of the from
  box announces the count ("11 of 24 nodes"). Enter in the text box or the from box closes the
  picker as Done does. Picking a match ("Starts with", "Between", "Highest") puts focus in the
  card's value box, so typing goes there. A card left with no value is dropped with a notice
  ("Dropped the name condition: it was not finished", no Undo) after Enter, Escape in its empty box,
  or a click on the drawing, which also deselects the layer. A click in either side panel leaves the
  picker open and drops nothing once focus has left the card's box; while focus is still in a new
  text card's empty box, a click in the left panel's layer tree drops the card and closes the
  picker, with the same notice (round 1 pilot T41 B, `rounds/round-1/pilot/T41B/detours/11.png`,
  again at `18.png`; with focus elsewhere it dropped nothing, `16.png`, `17.png`).
- **Chips** carry the word: "role: board, staff, 8 nodes", "name contains Mme, 6 nodes", "hours 20
  to 52, 11 nodes". Each chip counts its own card over the whole file. With two cards where one alone leaves none (`hours` Has no value: 0), the warning still reads "Each condition leaves some; together none" (T43 A).
- **The find box:** a word with no match gives 'No match for "most". To select by a value, type
  a rule such as name == 'Napoleon'' (on a file, a number column of it: "hours >= 27",
  "donations >= 130000", whatever was typed, `missing phone` included; on the karate club, which
  has only `id`, no hint); Enter there does nothing. A column name offers "Select the 15 nodes
  (trained: yes)" or "(email: has a value)", and Enter selects them; the box keeps the typed text
  (no `=` is added). A rule typed plain (`hours >= 20`) offers "Select the 11 nodes (hours 20 or
  more)". `=degree > 30` shows "Did you mean Degree?" and the option "Degree > 30, Select the 1
  node" ("(Degree above 30)" after a Degree run; a screen reader hears "Did you mean Degree >
  30?"); Enter selects that node, announces it by its name or id ("34 selected" on the karate club, which reads like a count, and on 758b8e8081 is also drawn under the box) and keeps `=degree > 30` in the box. Node rows are titled by id
  with the name under them (on College football the announcement says "Nebraska selected" while
  the inspector is titled `74`); a value row ("role is board (3)", "kind is company (6)") is in
  view and selects every node with that value. A plain click on a value row selects and empties the box, while a plain click on a column row ("email", "Select the 15 nodes") selects and keeps the typed text; a right-click on any find-box row does nothing (no menu, nothing selected); Shift+click on a second value row (or on node rows) adds to the selection, marks each
  picked row with a check and keeps the list open (the typed text then stays in the box). Enter on
  a list of nodes selects only the first and empties the box, and the camera glides and zooms to
  it. Escape clears the text and keeps the selection and focus; a second Escape moves focus to the
  drawing, and a third clears the selection ("Selection cleared: 1 node"). The clear button
  ("Clear") empties the text and keeps the selection. After the selection clears, a "Select by a value:" heading can stay under the box with nothing below it. A list heading can count rows it does not show: `Kansas` reads "Nodes 4" over two rows (Kansas, KansasState); Arkansas and ArkansasState show only for `nsas` (T46 B).
- **A layer made from a selection.** From the selection's Style tab it is not made until a value
  is committed: the tab first says "The first style you set makes a layer for the 8 selected
  nodes", and an unset Size or Shape line says "Not set yet: the first size you pick makes the
  layer"; Enter on that unset Size line (showing 1) does nothing and makes no layer, against
  `decided.md` ("an unset line takes the value it shows"). Right-click > "New layer from
  selection" makes the layer at once ("Made a layer for the 6 selected nodes"; from a find-box
  rule it is named for the rule at once, "phone: has a value"), and on 6de5f95d12 it opens on the Node tab, even right after Everything's Edge tab (on 7d87760756 it opened on the tab last shown, the Edge tab included). In such a layer "Style nodes" ("Style edges" on an edge layer) shows dimmed. It is named after the
  one node (`Valjean`, `v16`, `74`; "Made layer 74 for 1 node"), "8 nodes" ("Picked by hand: 8
  nodes"), after everything selected by Select all or Control+A ("77 nodes, 254 edges", and its
  key line "Color: 77 nodes, 254 edges" though it paints nodes only), or, from a find-box rule,
  after its rule ("hours 20 or more", "donations above 10000", "email: has a value", "Rule: trained && !phone"; after a Degree run, `=degree > 16` makes "Rule: graphty.degree > 16", an internal field path, where the find box said "Degree > 16"; its card shows the raw "graphty.degree > `16`", and its attribute list offers only "Node id", no Degree). Its cards can be edited and it renames itself to follow them ("Picked and
  name" while a hand-picked card and a rule card are both there; cards combine with AND), On 758b8e8081 such a layer takes every condition edit before its first look: "email: has a value" switched to "Has no value" is accepted (9, renamed "email: no value"), a second card can be added, and Done keeps both (on 6de5f95d12 the switch was refused on T41 B, "That rule could not be used for this layer", and Done dropped it). Two cards name it "email and 1 more" on sources but "phone and trained" on volunteers. A hand-picked card offers no Add a condition; removing it leaves the layer covering everything ("All nodes", "All edges", with a notice and Undo) until a condition is added. A layer from a rule with `>` (`hours > 20`) opens a card showing the raw rule text (`{"kind":"threshold","path":"data.hours","above":20}`) that takes no edit and does nothing on click: only Remove changes it, which makes the layer "All nodes" (T42 A); the `>=` form opens an ordinary Between card. A right-click aimed at empty canvas can land on a tie after the camera has glided to the selection, and then replaces the selection with that tie (T38 B). The first color or size on
  such a layer moves the drawing right (above).
- **Hovering a node shows nothing**: no name, no tooltip, though the cursor becomes a hand; only
  the Hovered layer's count goes to 1. A
  node's name is read by clicking it or from the table. The key over the drawing ("Color: Poster")
  has no tooltip, does nothing when clicked and is not in the Tab order. On the drawing, the
  keyboard turns the camera (and `=` zooms) but reaches no node; a keyboard reader gets names
  from the table. The table opens with focus on its "Id" header; headers are buttons ("Degree,
  sorted descending"), cells are named by their value only, arrows move inside the grid, Tab
  leaves it, and Escape moves focus to the toolbar's Table button. A third click on a header
  returns to "In the order loaded"; sorting keeps the old scroll position. Selecting a row
  announces the node by id ("v23 selected"). A right-click on a node selects it and glides it to
  the center while its menu (Neighborhood, Path between..., Frame selection, New layer from
  selection, Add note) stays at the pointer, away from the node; Escape closes only the menu. A
  click on a red dot behind another can select the one in front.
- **Control+O with a graph open** offers the page "Add to <graph>" with a warning that its edges
  would be added again ("the load makes 24 nodes and 118 edges"), and Cancel, "Replace <file>"
  (the main button) and Load (which adds the file a second time); Escape does nothing there, and
  Cancel leaves the graph as it was. "Replace <file>" leads to a second page, "Replace: <file>",
  whose Replace replaces it. On 6de5f95d12 a replace with the same file keeps every layer, hand-picked and rule layers alike, on the same nodes or edges (on 7d87760756 it emptied every hand-picked layer); the reopened drawing is framed small and right of the canvas's middle, and Undo leaves it there. On 758b8e8081 Undo after such a Replace redraws from the layers: the first Control+Z undoes the import ("Undid changing settings and importing data."), the second the last style change, and the drawing matches the tree each time (on 6de5f95d12 a deleted label layer's name stayed drawn); the first find-box pick after Replace draws its selection ring (on 6de5f95d12 it drew none). With a sample open (no file), Control+O opens the system file chooser at once. A GraphML file exported from the open graph and opened with Replace adds layers named "A group from the file on ...", one with internal names in its rule ("graphty.style.graphml..."), and a notice that runs off both edges of the canvas; the export writes style fields (width, color, position, layer members) as data columns, which the read-the-file page offers as attributes, and its text ids do not match the karate club's number ids ("the load makes 68 nodes and 156 edges"). After such a Replace on College football the run reads "Louvain, out of date" ("Data changed since this run"), and one Control+Z drops the Louvain section from the key while all 10 groups stay drawn in their colors (the next Control+Z brings it back), against `decided.md` (the key and the drawing never disagree; T46 B). With a saved project open, Control+O with the same project replaces it at once; after a change it first asks "Discard unsaved changes?" (Escape closes the dialog with focus back where it was).
- **Main menu > Open sample and Back to start** ask "Discard unsaved changes? <graph> has changes
  that are not saved" even over a sample nobody changed, while the top bar reads "Autosave:
  saved"; Escape keeps the work, Discard goes on. Back to start lands on the start page scrolled to
  the Sample library; after it or a Discard, focus is on "New project", and Enter there makes an
  empty Untitled project.

## T37. A first look

- **Not run in round 1.** Walked on 7d87760756 by `rounds/r1/pilot/T37A/` (`g-pointer/`,
  `g-detours/`, `g-keyboard/`) and `T37B/` (`p4-success/`, `p4-detours/`, `p4-keyboard/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T37A/6de-r2/` and `T37B/` (`g-success/`, `g-community/`, `g-findlayer/`, `g-handpicked/`). B walked again on 758b8e8081 by `rounds/r1d2/pilot/T37B/` (`p-success/`, `p-findlayer/`, `p-keyboard/`).
- **The start page gives A's answer first:** its demo is Les Miserables, unnamed, and "Key
  players" says "Valjean is the biggest", a click on it "Valjean, 36 connections", with no node or
  tie counts and no way into the workspace. A participant on B sees another network's answer
  first. Recorded; how a name read from the demo alone is graded is left to the round that runs
  T37 (round 1 does not).
- **Success (S):** names 77 characters (A) or 34 members (B) and 254 (A) or 78 (B) ties, both read
  from the screen, and names Valjean (A) or member 34 (B) as the one with the most ties, read from
  the screen: a node's inspector showing a Degree equal to the Values tab's "Highest" (36 on A,
  17 on B), a node's inspector after a Degree run ("Degree 36, #1 of 77"), the table sorted on
  its Degree column, or the find box's rule leaving that one node. SD: the most connected named
  after one wrong pick corrected from the screen (on B the color ramp draws 17, 16 and 12 in
  nearly the same dark brown, so a first click may land on member 1, "#2 of 34", or 33, "#3").
- **Where the counts are:** the sample opens on the Graph's Values tab, which already shows Nodes,
  Edges and "Degree, Highest 36" (B: 17) with no name; the library cards already say "77 nodes, 254 edges" (A, on 6de5f95d12; on 7d87760756 A's card gave no counts) and "34 nodes, 78 edges" (B), and Main menu > Open sample marks the open sample "Open now" with no count. One
  fact goes by three names: "36 connections" on the demo, "nodes"/"edges" on the cards, "Degree"
  in the inspector. The Data place shows them too (B: Node table 34 rows, Edge
  table 78 rows), and a keyboard opening announces "Zachary's karate club: 34 nodes, 78 edges".
  Clicking the Highest row or the histogram shows no name.
- **A node's degree before any run:** a node's inspector (left- or right-click) already shows its
  Degree ("Degree 36", B "Degree 3" on a small node) with no rank. Clicking that Degree row opens
  the node's neighborhood ("Valjean and 36 connections") and replaces the selection with its
  neighbors; Escape or Back returns.
- **Shortest path (A, 3 steps):** 1. Samples. 2. The card "Who holds the novel together" (Values:
  Nodes 77, Edges 254, Highest 36). 3. Click the central node: the inspector reads Valjean, Degree 36, which matches
  Highest 36. B: Zachary's karate club, member 34, Degree 17.
- **Run path (A, 6 steps):** 1. Samples. 2. The card. 3. Analyze. 4. Degree (a card with
  a Run button opens; "How many edges each node has: the most connected rank highest."; the button
  is named "Run Degree"). 5. Run (every node colored by degree, a Degree layer added, the color
  key 1 to 36 opens and the toolbar's Legend turns on; with Valjean still selected from a click
  before, the drawing moves about 130 px right, as above). 6.
  Click the darkest node: Valjean, Degree 36, "#1 of 77". By keyboard, Shift+A opens "Filter
  analyses", ArrowDown highlights Degree, Enter focuses "Run Degree", and Enter announces "Degree
  added, running", then "Degree finished" (no name), with focus back on Analyze; Enter with
  nothing highlighted does nothing. A node
  selected before the run stays selected, and its inspector adds "Results: Degree 36, #1 of 77" by
  itself, so step 6 is then not needed. Or, for 6 to 7: Table, then the Degree header (sorts
  highest first, Valjean 36 on top). By keyboard (B): the table's headers are buttons ("Id",
  "Degree, sorted descending", live "Sorted by Degree, highest first"); ArrowDown reads gridcell
  "17" and ArrowLeft rowheader "34"; Enter selects it, "17, #1 of 34" (A: Enter on rowheader
  Valjean announces only "Valjean selected", no rank). "Degree 17, #1 of 34" is not a Tab stop
  and is found only by reading the page. The keyboard walk on A: 20 Tabs to "Search samples",
  the card, Enter (announced "Les Miserables: 77 nodes, 254 edges"), Shift+A, ArrowDown, Enter,
  Enter, the toolbar arrows to Table, sort by Degree, rowheader Valjean. On B (758b8e8081): Samples, Enter, 17 Tabs to "Open the Zachary's karate club sample", Enter (announced "Zachary's karate club: 34 nodes, 78 edges"), then as A.
- **Find-box route (an expert route that reaches the name):** `=degree > 30` (B `=degree > 16`)
  shows "Did you mean Degree?" and the option "Degree > 30, Select the 1 node" (B "Degree > 16");
  Enter selects Valjean, Degree 36 (B member 34, Degree 17), announces "Valjean selected" (B "34
  selected", which reads as a count, and "34 of 34 rows, 1 selected" with the table open), and
  keeps the typed text in the box; a screen reader hears "Did you mean Degree > 16?" where the
  screen shows "Did you mean Degree?". After a Degree run the option adds "(Degree above 30)" (B
  "(Degree above 16)"), and the box still keeps what was typed; the stale "Did you mean Degree?"
  line can reappear under the unfocused box after a run, and is spoken again. Graded by its
  length like any route. `degree` alone offers "Degree, Select the 77 nodes" (B 34), and Enter
  selects every node and keeps `degree` in the box, which names no one.
- **Routes that do not reach the name on this build:** hovering a node (shows nothing); a word in
  the find box (`most`: "No match", with the hint rule `name == 'Napoleon'` on A, which leads
  nowhere near degree); the table before a run (A: only Id and name, "Columns: 2 of 2"; B: only
  Id, and "Columns: 1 of 1" is dimmed with the tooltip "No other columns to show or hide"); the
  Data place (A: attributes id, name, shared_chapters; B: only id; its selection summary reads
  "Degree 1 to 17" and "id mean 17.5"); the filter step's Attribute list (Node id, name,
  shared_chapters: no Degree; it calls the key column "Node id" where the table says "Id"); the
  Values tab's "Highest" row and histogram (no name on click; hovering "About Degree" opens an
  explanation popover, which covers Lowest); the
  biggest-looking sphere (in 3D a near node looks biggest: on B node 25, Degree 3); the analysis
  filter's `ties` (A and B: HITS and the group analyses, no Degree; `connected` lists Degree;
  `most` highlights Degree first and Enter opens its card, with Most flow dimmed); a right-click
  on the central node (it selects Valjean and the inspector shows Degree 36: this reaches the
  answer like a click; its menu stays at the pointer while the node glides to the center); Quick
  actions (`most connected`: "No results"; Enter does nothing, Escape returns focus to the
  button); the Legend ("Nothing is styled yet"); the start page's library search (Enter on the
  one card left does nothing); "Open network data" (no samples); PageRank
  (its "Start here" badge) gives a score and a rank ("0.02108, #19 of 34"), not a count of ties.
- **Keys in the find box after a rule selection:** the first Escape empties the box, the second
  moves focus to the drawing with the node still selected, the third clears the selection
  ("Selection cleared: 1 node"). Tab from the box goes to its clear button. On B, Escape on a
  node's inspector (focus on its "Degree 17" or "Degree 3" row) does not clear the selection and
  announces nothing. The inspector button "Degree 36" opens the neighborhood, which its name does
  not say.
- **Final screen:** the counts and the name on screen. The Degree layer the run adds recolors every
  node; it comes with the run and is not held against the participant.

## T38. Your own file, then one kind of person

- **Walked on 7d87760756** by `rounds/r1/pilot/T38A/` (`v-success/`, `v-detour-newdata/`,
  `v-detour-data/`, `v-keyboard/`) and `T38B/` (`g-pointer/`, `g-detour-open-find/`,
  `g-detour-data-rclick/`, `g-keys/`). B walked again on 6de5f95d12 by `rounds/r1d1/pilot/T38B/` (`r3-pointer/`, `r3-find-replace/`, `r3-keys/`). B walked again on 758b8e8081 by `rounds/r1d2/pilot/T38B/` (`e-pointer/`, `e-edit-cond/`, `e-keys/` and the routes of other tasks on their own files: `e-email/`, `e-phone/`, `e-plus-both/`, `e-label-replace/`, `e-color-replace/`, `e-edge-replace/`, `e-replace-pick/`).
- **Success (S):** the file loaded as a new graph (24 nodes; 63 ties A, 59 ties B, both said from
  the screen), and exactly the board and staff (A, 8) or companies and agencies (B, 10) drawn blue
  (any color a reader calls blue), everyone else unchanged.
- **Stacks that count:** a layer whose conditions are one category card on `role` (A) or `kind`
  (B) with two values ticked, and a blue color. Two layers (one per value) is also S. A layer that
  colors a hand-picked selection is SD (it holds node ids, not the rule): the find box's row "role
  is board (3)" (B: "kind is company (6)", in view without scrolling) selects them; Shift+click on
  "role is staff (5)" adds to the selection (8 selected; the selection's summary reads role "staff
  (5), board (3)"); styling it makes one layer "8 nodes" ("Picked by hand: 8 nodes", notice "Made
  a layer for the 8 selected nodes"), and the drawing jumps about 135 to 140 px right as its first
  color lands, a cluster ending under the inspector. A plain click on a value row selects and
  empties the box, so the second value must be typed again; Shift+click keeps the list. Find-box
  node rows are titled by id (`v01`, `s01`), not name. On 758b8e8081 the find box's "kind is company (6)", right-click > "New layer from selection" ("Picked by hand: 6 nodes"), that card removed, a `kind` card with company and agency added, Done and Fill blue ends "kind: company, agency, 10 nodes" (SD); the first blue moved the drawing so that only 7 of the 10 showed on the last screen.
  The table route is SD the same way: sorted on `role` (`kind`), a click on the first row and
  Shift+click on the eighth (tenth) select them, and Style, Fill "+", blue makes "8 nodes" ("10
  nodes"), "Picked by hand".
- **The starting color** `6366F1` is a blue-violet; a screen reader calls it "indigo". A participant
  may still call everyone blue already, or doubt that `0000FF` beside it changed anything. Grade on
  the style tree and the last screen.
- **Success path (A, 12 steps):** 1. "Open a file", volunteers.graphml. 2. Load (the
  read-the-file page shows "volunteers: 24 nodes, 63 edges"; then Values: Nodes 24, Edges 63). 3.
  "+" beside Style layers ("Add a layer or a folder"; its menu is Layer, Folder, "Select
  layers...", Analyze..., and "Select layers..." checks layers, not nodes). 4. Layer. 5. Which
  nodes (the collapsed line "add a condition to narrow"; it only expands). 6. "Add a condition". 7.
  `role` (a card "Is any of": "volunteer, 16 nodes", "staff, 5 nodes", "board, 3 nodes"). 8.
  Tick board (the subtitle becomes "Node layer"). 9. Tick staff ("8 of 24"; the drawing does not
  change yet). 10. Done. 11. Fill "+" (the Color line, focus in its box). 12. Type `blue`, Enter
  (`0000FF`; focus stays in the box; the key "Color: Layer 1, 8 of 24 nodes" appears and the
  drawing stays put). By keyboard, "Open a file" is the 14th Tab, Enter and the upload put focus
  on Load, and Enter on the heading "Graph, volunteers: 24 nodes, 63 edges"; after Layer focus is
  in the "Layer name" box, Enter puts it on the tree row, and Which nodes is 10 Tabs on (or F6 to
  the inspector and 5 Tabs: "Select what it paints", "Layer actions", the Style tab, the Node tab,
  "Style nodes", then Which nodes).
- **B:** the same with sources.graphml ("sources: 24 nodes, 59 edges"), `kind` (person 14,
  company 6, agency 4), company and agency ("10 of 24"), 12 steps. Nodes are titled by id in the inspector and the find box (`v23`, `s12`), the name only a row below. By keyboard on 6de5f95d12, "Add a layer or a folder" is 8 Shift+Tabs from the graph heading (the storage notice's Dismiss and Save come first). A layer made from the find box's company and agency rows ("10 nodes", "Picked by hand: 10 nodes") still paints the same 10 after Control+O > Replace with the same file (two pages, two Replace clicks).
- **Dead ends on this build:** right-clicking a node offers no way to pick everyone like it;
  right-clicking a table cell does nothing; a column's "Options" offers only Move left and Move
  right; the inspector's value cannot be clicked. The Data place's attribute lists its values with
  counts (volunteer 16, staff 5, board 3), but a value row does nothing on click or right-click,
  and its menu (Add label line, Filter to..., Show in table) has no color. Its "Filter to..." offers
  "Is any of" with a checkbox per value ("24 to 8 nodes") and hides the rest instead of coloring
  once "Add step" is pressed (F); left without "Add step" it is dropped with the notice 'Filter
  step not added: "role is staff or board". Press Add step to use a step.' and hides nothing.
  "Open network data" opens no local file (the file name typed as an address gets "Please enter a
  URL."); Cancel on the read-the-file page returns to the start page, and a second "Open a file"
  loads. Opening the table re-frames the drawing small in the canvas's top half.
- **Final screen:** 8 (A) or 10 (B) blue dots; the picker reads "role: board, staff, 8 nodes" (B: "kind: company, agency, 10 nodes", values in the order ticked). The key over the drawing names the layer ("Color: Layer 1", "8 of 24 nodes" on a second line), not the values.

## T39. One color for the whole drawing

- **Walked on 7d87760756** by `rounds/r1/pilot/T39A/` (`r-pointer/`, `r-detours1/` to
  `r-detours3/`, `r-keys/`) and `T39B/` (`7d8c-pointer/`, `7d8c-detours/`, `7d8c-detours2/`,
  `7d8c-keys/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T39A/` (`i-pointer/`, `i-detours/`, `i-keys/`) and `T39B/` (`v2-pointer/`, `v2-detours/`, `v2-keys/`). A walked again on 758b8e8081 by `rounds/r1d2/pilot/T39A/` (`m-pointer/`, `m-detours1/`, `m-detours2/`, `m-keys/`).
- **Success (S):** every node drawn in the asked color (A: any dark green; B: any orange), the ties
  unchanged.
- **Stacks that count:** the Everything layer's node color changed (S); a new layer with no
  condition (S; Samples, the card, "+", Layer, Fill "+", the color and Enter: 6 steps on A and B;
  `dark green` with a space gives `006400`; it adds "Color: Layer 1" to the key, and the drawing
  stays put); every node selected and colored (SD: a selection, not the whole drawing): Control+A,
  or the canvas's right-click "Select all", selects all 77 (115) nodes and 254 (613) edges, and
  the selection's Fill "+" and the color make the layer "77 nodes, 254 edges" (key "Color: 77
  nodes, 254 edges", though it paints nodes only), the drawing jumping about 130 px right (150 on B; against `decided.md` 2026-10-19, which says an arriving key never re-frames the drawing: a defect, recorded, not graded); "Select all" then "New layer from selection" opens the new layer on the Node tab on 6de5f95d12 (on 7d87760756 on the Edge tab last shown, whose first "+" is Line). The find box's `all` gives "No match" with a rule hint.
  Coloring one node from its own inspector (Fill "+") makes a one-node layer named after the node
  ("Javert", "Valjean"): not a success.
- **Success path (A, 5 steps, the key steps of bar 4):** 1. Samples. 2. The card "Who holds the
  novel together". 3. Everything in the layer list (its inspector opens on Style, Node). 4. Click the color box ("Node
  color, set here, indigo"; the first click selects its value). 5. Type `darkgreen` (or a hex),
  Enter (`006400`). The first styled graph is step 5. B: College football, `orange` gives
  `FFA500` (card "Conferences fall out of who played whom"). The Everything route adds nothing to
  the key. A node's Style > "Why this look" (which lists "Selected: Glow, Halo" and Everything) >
  "Everything" opens Everything with focus in the color box and its value selected. By keyboard
  (A and B), Samples is 16 Tabs from the top and the card 16 more on A, 18 on B; after the open,
  Everything is 5 Shift+Tabs from the graph heading (7 on 758b8e8081 with the storage notice's Dismiss and Save first), Enter on its row keeps focus there, F6 goes
  to the heading "Everything", and the color box is 15 Tabs on; `darkgreen` and Enter announce
  "Node color now dark green, on 77 nodes". Focus never fell to the page.
- **Bar 4:** frozen at 12 steps as "twice the answer key's 6"; the key counts 5 on this build
  (7d87760756, as on e3c5bca8e6).
  The bar is not changed here (`criteria.md` change log).
- **Likely false finish:** Graph settings, and the Graph inspector's Style tab (the sample opens on
  Values, one click away), offer only the canvas's Background color (two controls share that
  name); typing the color there paints the background and leaves the nodes blue-violet; the
  rail's Settings dialog has nothing about node color, and Graph settings opens the same Style
  tab. Its reset is a dash ("Reset Background
  color to default"); Control+Z undoes it with "Undid changing settings.".
- **Detour on the Edge tab:** Everything's Edge tab already holds Line Color `A9A9A9`, Width 8 and
  Pattern Solid. Line Color set to the asked color paints every tie (F unless removed; "Remove edge
  color" takes it off, and Control+Z with focus in the box undoes it; two Control+Z restore
  `A9A9A9`). After "Remove edge color" focus goes to Line's "+" (Enter opens its menu), but the
  Width line slides up under the pointer, so a second click removes Width.
- **Other detours on this build:** Main menu > Open sample opens the same graph; a node's own Style
  tab, Fill "+" and the color makes a one-node layer ("Valjean"); the Data panel has nothing about
  color; a color word the box does not know (`burnt orange`) gives a clear error and Escape
  reverts; "Pick node color" opens the picker, and Escape there closes it keeping the value.
- **Final screen:** all 77 (A) or 115 (B) nodes in the color; `styles.json` shows Everything's (or
  the new layer's) `node.color`.

## T40. Picked out by letters in a name

- **Walked on 7d87760756** by `rounds/r1/pilot/T40A/` (`h-pointer/`, `h-detour-find/`,
  `h-detour-filter/`, `h-detour-useselected/`, `h-keyboard/`) and `T40B/` (`7d8-pointer/`,
  `7d8-detour-find/`, `7d8-detour-filter/`, `7d8-detour-other/`, `7d8-keyboard/`). A walked again on 6de5f95d12 by `rounds/r1d1/pilot/T40A/` (`rp-pointer/`, `rp-detour-find/`, `rp-detour-filter/`, `rp-detour-useselected/`, `rp-keyboard/`). B walked again on 758b8e8081 by `rounds/r1d2/pilot/T40B/` (`s3-pointer/`, `s3-keyboard/`, `s3-find-layer-edit/`, `s3-find-replace-undo/`, `s3-replace-first-pick/`, `s3-label-replace-undo/`, `s3-edge-layer-replace-undo/`).
- **Success (S):** exactly the 6 (A) or 8 (B) drawn purple, everyone else unchanged, and the count
  said from the screen (the picker's "6 of 77", the find list's "Nodes 6", or counted on screen).
  Grade the hex (`800080`; a screen reader says "purple").
- **Stacks that count:** a layer with a text card on `name` -- contains "Mme" (A); starts with or
  contains "GAL" (B) -- and a purple color. In the find box, `Mme` lists "Nodes 6" and "Edges 26"
  (B: `GAL` "Nodes 8" and value rows "name is GAL10 (1)"); Enter selects only the first node and
  empties the box, and a click on a row selects that one node, so styling then makes a one-node
  layer ("MmeMagloire", B "YBR019C", "Picked by hand: 1 node"). Shift+click on rows adds to the
  selection and keeps the list open (each picked row shows a check); clicking the inspector's
  Style tab then clears the typed text; styled, the 6 make the layer "6 nodes", "Picked by hand: 6
  nodes" (SD), and while still selected they keep a thick yellow ring that makes them read yellow
  (graded on the tree); that first color moves the drawing about 110 to 155 px right (against `decided.md` 2026-10-19: a defect, recorded, not graded). Right-click >
  "New layer from selection" on the six makes the layer "6 nodes" at once ("Made a layer for the
  6 selected nodes"). With the six selected, "+" > Layer starts at 77 of 77 and neither Which
  nodes nor the attribute list mentions the selection, so a participant who then finds "New layer
  from selection" is left with an empty extra "Layer 1". Adding a `name` contains card to a one-node layer gives
  1 of 77 (AND) and renames it "Picked and name" as the text is typed; removing the hand-picked
  card gives 6 of 77 (8 of 331) and the name "name contains Mme" (SD). On B, removing that card
  puts focus in the next card's box and opens its list of names over Done, and a click on Done
  lands on the option GAL3 and does nothing until the list is closed. Removing a layer's last card
  makes it match every node at once (no notice). The find list names nodes by id
  (`MmeMagloire`), the card's suggestions by name ("Mme Magloire").
- **Filters detours:** a step on `name` offers Contains and a text box. After the attribute is
  picked, focus moves into the text box, so `Mme` typed right away lands there and lists the six
  names; Enter adds "name contains Mme, 77 to 6 nodes" (B "name contains GAL, 331 to 8 nodes"),
  hiding the rest without reframing (B keeps the typed `GAL`, not the highlighted GAL1; the open
  list covers "Add step"). It hides, never colors: F. Control+Z undoes it ('Undid adding
  the filter step "name contains Mme".'; undoing the step's switch reads 'Undid turning off the
  filter step ...'). Everything colored with the step on (A and B) colors every node once the
  step is off, while only the six (eight) show and Everything's line says it "styles all 77
  nodes": F. The top bar's button then reads "Filter: 8 of 331 nodes" with a different tooltip.
- **Success path (A, 11 steps):** 1. Samples. 2. The card "Who holds the novel together". 3. "+" beside Style layers. 4. Layer. 5. Which nodes (only expands). 6. "Add a condition". 7. `name` (a Contains card, focus in "Type the text to match"). 8. Type `Mme` ("6 of 77"; a list of the six full names opens under the box, over Match case and
  Done). 9. Enter (keeps `Mme` even if a name in the list is highlighted, and closes the picker as
  Done does: "name contains Mme, 6 nodes"; a suggestion under the resting pointer can look
  highlighted). 10. Fill "+" (the Color line, focus in its box; no key yet). 11. Type `purple`,
  Enter (writes `800080`; the key "Color: Layer 1, 6 of 77 nodes" appears, the drawing stays put,
  and focus stays in the box, "Node color now purple, on 6 nodes"). `800080` on small dots reads
  as darker dots beside the default indigo. By keyboard the Style layers "+" is 15 Tabs from the
  graph heading (B 16), and Which nodes 10 Tabs from the new layer's row once its name is
  committed with Enter.
- **B** brings the file in first: "Open a file" with yeast-galactose.graphml, then Load (2 steps,
  as A's sample), then as A from step 3 with `GAL` ("8 of 331"): 11 steps with "Contains"; with
  "Starts with", 2 more (the match menu, then "Starts with", which puts focus in the text box, so
  `GAL` typed at once lands there): 13. Other ways in: "Open network data" offers only remote
  sources; right-click on empty canvas and the Data place's name attribute offer no pick by name. The 8 purple
  dots are small dark dots in the middle of the drawing and two overlap, so counting the drawing
  gives 7: the count is read from "8 of 331".
- **Final screen:** the picker's line reads "name contains Mme, 6 nodes" (B: "name starts with GAL,
  8 nodes" or "name contains GAL, 8 nodes").

## T41. Two facts at once

- **Walked on 7d87760756** by `rounds/r1/pilot/T41A/` (`r1-pointer/`, `r1-detour-start/`,
  `r1-detour-picker/`, `r1-keys/`) and `T41B/` (`i-pointer/`, `i-detours/`, `i-keys/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T41A/` (`r1d1-pointer/`, `r1d1-detour-start/`, `r1d1-detour-picker/`, `r1d1-find-rule-replace/`, `r1d1-keys/`) and `T41B/` (`w3-pointer/`, `w3-findlayer-replace/`, `w3-keys/`). Walked again on 758b8e8081 by `rounds/r1d2/pilot/T41A/` (`p3-pointer/`, `p3-detour-find-phone/`, `p3-detour-rule-replace/`, `p3-keys/`) and `T41B/` (`q4-pointer/`, `q4-email-layer/`, `q4-findlayer-replace/` and the other `q4-` routes; no keyboard walk).
- **Success (S):** exactly the 4 drawn red, the names said match the answer and were on screen
  (the inspector after a click, or the table), everyone else unchanged.
- **Stacks that count:** one layer with two cards: `trained` (A) or `on_record` (B) set to Yes,
  and `phone` (A) or `email` (B) set to "Has no value". Cards combine with AND. Routes through the
  find box that end on the 4 are SD: `=trained && !phone` selects exactly the 4, and right-click >
  "New layer from selection", then Fill "+" > red, paints them (layer "Rule: trained && !phone");
  or `phone` ("Select the 17 nodes (phone: has a value)"), then right-click on empty canvas (the
  selection stays) > "New layer from selection", which makes the layer "phone: has a value" at
  once; Fill red paints the wrong 17 until its card is switched to "Has no value" and trained Yes
  is added (4 of 24, SD). On B the same switch on "email: has a value" is accepted on 758b8e8081 (9, the layer renamed "email: no value"); on_record Yes then gives 4 of 24, Done keeps both cards, and red paints the four (SD). On 6de5f95d12 it was refused ("That rule could not be used for this layer") and Done dropped it. The first red on such a layer, set while the find-box selection is still held, moves the drawing right far enough to put a red dot under the inspector (B: 3 of 4 on screen, `q4-findlayer-replace/09.png`): names count only as read from the screen. A layer made from the find-box rule keeps its four after Control+O > Replace with the same file. In
  that second route the 15 with an email keep their selection rings while the layer paints four
  others: grade the layer. A column name alone (`=phone` 17, `=email` 15) selects those who HAVE
  a value: a layer made from it and left so paints the wrong set. An unreadable rule
  (`=email missing`) says "Not a rule Find can read (at character 8). Still selected: 15 nodes."
- **Where "Has no value" is:** only in a card's match menu (a text card's, and a yes/no card's,
  which offers Yes, No, Has a value and Has no value). The attribute list answers `missing` and
  `no value` with "Nothing found"; a text card with `missing` typed reads "0 of 24" and "phone
  leaves none", and Enter there closes the picker keeping "phone contains missing, 0 nodes", so
  the layer paints nobody with no warning; the find box answers `missing phone` and `no phone`
  with a number rule ("hours >= 27", B "donations >= 130000"). Neither "Nothing found" nor "phone
  leaves none" points to the card's own match menu. Filters' phone (email) step has a match menu
  (with no visible label) holding Has a value and Has no value, and Add step hides the other 17 (B 15)
  instead of coloring the four: F (Undo restores); with a selection hidden, the inspector
  still reads "15 nodes selected". A click on the drawing that drops an unfinished card also
  moves the inspector off the layer to the Graph overview.
- **Success path (A, 18 steps):** 1. "Open a file", volunteers.graphml. 2. Load (the storage notice sits above the toolbar until the first click). 3. "+". 4. Layer. 5. Which nodes (only
  expands). 6. "Add a condition" (phone reads "70% have a value"). 7. `trained` (the card starts
  on Yes: "15 of 24"). 8. "Add a condition". 9. `phone` (focus in its text box, past the match
  menu: by keyboard one Shift+Tab back). 10. Its match menu ("phone: how to match", value
  "Contains"). 11. "Has no value" ("4 of 24"). 12. Done. 13. Fill "+" (focus in the color box). 14.
  Type `red`, Enter. 15-18. Click each of the four red dots and read the name row in the
  inspector: each click glides and zooms the camera to that dot, carrying the other red dots
  toward the edges, under the inspector and the toolbar; on B the fourth needed right-click > Fit
  (`f` changed nothing a reader could see), and a red dot behind a blue one gave the blue one's
  click (s04 for s05). Or open the table and find the four by their trained and phone cells: the table does
  not mark which rows the layer paints, and a missing value is a blank cell there ("No value" in
  the inspector and to a screen reader). Sorted on phone, the blank rows come last; Enter on a row
  selects that node; by keyboard the table opens on its Id header, Tab leaves it, and Escape in
  the grid moves focus to Table. The selection's summary gives counts only ("phone 0 of 4 have a value",
  "name 4 of 4 have a value") and names no one. The inspector is titled by id (`v20`), the name a
  row below. After step 15 focus stays in the color box ("Node color, set here, red", `FF0000`).
  By keyboard, the layer "+" is 15 Tabs from the graph heading (Undo and Redo are stops), Which
  nodes 9 to 10 Tabs from the new layer's row, and Enter on Which nodes with a card in it goes
  straight to the first card's value; selecting a table row announces the id ("v23 selected").
  Escape in an empty new text card drops it and closes the picker, focus on Which nodes. Escape in the just-added Color line with `red` typed and not committed removes the whole line; nothing on screen says so, and on 6de5f95d12 a screen reader hears "Node color not added" with focus back on "Add to node fill".
- **B:** the same with sources.graphml, `on_record` ("12") and `email` ("4 of 24"). The four are
  s19 Tomas Varga, s17 Friends of the Waterfront, s11 Ines Moreau and s05 Della Whitfield, 18
  steps. The find box's `=on_record && !email`, then right-click > "New layer from selection" and
  Fill red, makes the layer "Rule: on_record && !email" (SD). Other ways in on A and B: "Open
  network data" (no local file); New project > "Add data..." > Cancel, then again (the project
  stays "Untitled"); Control+O with the graph open ("Add to volunteers", Replace first; Escape
  does nothing there, Cancel leaves). The table and the inspector never mark which people the
  layer paints.
- **Final screen:** four red dots; the picker reads "trained: yes, 15 nodes" and "phone: no value, 7
  nodes" (B: "on_record: yes, 12 nodes" and "email: no value, 9 nodes"), "4 of 24".

## T42. At or over a line

- **Not run in round 1.** Walked on 7d87760756 by `rounds/r1/pilot/T42A/` (`7d8c-success-pointer/`,
  `7d8c-detour-start/`, `7d8c-detour-card/`, `7d8c-keyboard/`) and `T42B/` (`w4-pointer/`,
  `w4-detour-card/`, `w4-detour-find/`, `w4-keys/`). A walked again on 6de5f95d12 by `rounds/r1d1/pilot/T42A/` (`6de2-success-pointer/`, `6de2-detour-start/`, `6de2-detour-card/`, `6de2-keyboard/`). A walked again on 758b8e8081 by `rounds/r1d2/pilot/T42A/` (`r3-success-pointer/`, `r3-detour-start/`, `r3-detour-card/`, `r3-keyboard/`, `r3-fix-*`).
- **Success (S):** exactly the 11 (A) or 9 (B) drawn orange and the count said from the screen.
- **Stacks that count:** a number card on `hours` (A) or `donations` (B) with its low end at 20
  (A) or 10,000 (B) and its high end at the maximum (52, 250,000) or above. The card's match menu
  offers Between, Highest, Has a value and Has no value (nothing reads "at least" or "or more");
  "at or over" is Between with the high end left at the maximum. "Highest" is a top-N count,
  applied the moment it is picked (top 10, which picks one source too many on B); focus goes to its
  count box with `10` selected. In its count box, 20 on A gives "top 20 by hours, 20 nodes", 20 of
  24, with nothing saying it counts people, not a line on hours (F unless the participant checked
  the line on screen; SD then); a count over the node count (30 on A, 10000 on B) is refused,
  'There are only 24 nodes. Type 24 to keep all 24, or fewer. The count and drawing still use the
  highest 20.', and the refused text and its message stay through Escape; switching back to
  Between restores the old range. The
  find box's `hours >= 20` ("Select the 11 nodes (hours 20 or more)") or `donations >= 10000`
  selects the same people, and the box keeps the typed text; a layer from that selection ("hours
  20 or more") is SD, and so is `donations > 10000` (9, layer "donations above 10000"). The
  no-match hint teaches `>=` ("hours >= 27", "donations >= 130000"); `hours > 20` gives 10 and misses the person at exactly 20 (F if left), and a layer made from that selection opens a card showing the raw rule text, which takes no edit ("A layer made from a selection" above), so its line cannot be moved to 20 there: only Remove, then a new `hours` card (20, Fill orange: 11, SD). The find box's selection rings are gold-yellow,
  close to the asked orange: grade on the tree. The first color on a layer made from the
  find-box selection moves the drawing about 120 to 140 px right, its right edge behind the
  inspector.
- **The from box on this build:** it starts at the column's lowest value (A `2`, B `0`), with
  focus in it and the value selected, so typing replaces it. The count and the drawing do not
  follow typing: they change on Enter (which closes the picker as Done does) or Tab (which moves
  to the "to" box, and by keyboard announces "11 of 24 nodes"). Escape in an edited box keeps what
  was typed and applies it (20000 typed, then Escape: 5 nodes) and leaves the picker open; a
  second Escape does nothing, and only Done, a click on the drawing or Tab or Shift+Tab out closes
  it. Dragging the low handle moves the line too (22 gives 10); Control+Z undoes it. By keyboard
  the reopened card reads: Remove donations, how to match, range start slider, range end slider,
  from, to, Add a condition, Done.
- **Bad values on this build:** `10,000` is taken as 10000 (9 of 24). `$10,000` and `>=20` are
  refused inline: '"$10,000" is not a number. Type a number, like 130,000. The count and drawing
  still use 0 to 250000.' (A: "Type a number, like 27"), the picker stays open, and Escape changes
  nothing: the refused text and its message stay until a good value is typed or the match is
  changed. A low end above the high end (300000) is refused inline: "From is above to: 300000 is
  more than 10000...". With both ends at 10000 the card says "donations leaves none". The high end
  set instead gives 2 to 20, 14 of 24 (A) or "donations 0 to 10000, 15 nodes" (B): F. Grade on
  the line the card ends with.
- **Success path (A, 10 steps):** 1-2. File in ("Open a file" with volunteers.graphml, Load). 3.
  "+". 4. Layer ("All 24 nodes: add a condition to narrow"). 5. Which nodes (only expands). 6.
  "Add a condition". 7. `hours` (Between 2 to 52, focus in the from box, `2` selected; the
  subtitle already "Node layer"). 8. Type `20`, Enter ("11 of 24"; the picker closes, "hours 20
  to 52, 11 nodes"). 9. Fill "+" (tooltip "Add to node fill"; focus in the color box; no key, no
  Legend). 10. Type `orange`, Enter (the key "Color: Layer 1" with "11 of 24 nodes" on a second
  line, Legend on, the drawing staying put; focus stays in the box, `FFA500` selected; "Node color
  now orange, on 11 nodes"). B: the same with `donations` and `10000` ("9 of 24"), 10 steps. By
  keyboard "Open a file" is the 14th to 15th Tab, and after Load Tab from the heading runs on
  through the inspector: the layer "+" is reached by F6 three times (the canvas, the toolbar, then the left panel) and two Tabs.
- **Dead ends:** the Data place's attribute menu and right-click offer only Add label line, Filter
  to... and Show in table; "Filter to..." with 20 and Enter adds the step at once, without Add
  step, and hides the other 13 (F; its line reads "24 to 24 nodes" before and "24 to 11 nodes"
  after; "Filter to..." leaves focus on the attribute's tree row, on B and on A on 758b8e8081, so a number typed at once goes nowhere and the next Enter drops the unfinished step). With the step on, orange on Everything shows exactly the 11 orange and "11 of 24
  nodes" in the top bar while all 24 are orange: F, a likely false "done". A node's right-click
  replaces the current selection with that node. Styling a find-box selection and pressing Tab
  out of the color box makes the layer ("donations 10000 or more", 9 of 24) and moves focus to
  "Node color by attribute". Control+A with focus on a layer row selects every node and edge and
  moves the camera.
- **Final screen:** the picker reads "hours 20 to 52, 11 nodes" (B: "donations 10000 to 250000, 9
  nodes"); the key "Color: Layer 1", "11 of 24 nodes".

## T43. Bigger for more

- **Walked on 7d87760756** by `rounds/r1/pilot/T43A/` (`f-success/`, `f-detours/`, `f-keys/`) and
  `T43B/` (`r1-pointer/`, `r1-detour-node/`, `r1-detour-find/`, `r1-detour-data/`, `r1-tooltip/`,
  `r1-keys/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T43A/6de5f95d12/` (`r3-pointer/`, `r3-detours/`, `r3-file-in/`, `r3-keyboard/`) and `T43B/6de5f95d12/` (`rp-pointer/`, `rp-find-replace/` and earlier `keyboard/`, `detours/`, `detour-drop/`, `detour-picked-replace/`). Walked again on 758b8e8081 by `rounds/r1d2/pilot/T43A/758b8e8081/` (`w3-success/`, `w3-keyboard/` and the `w3-` routes) and `T43B/` (`z-pointer/` and the `z-` routes; no keyboard walk).
- **Success (S):** node size follows `hours` (A) or `donations` (B) for every node, larger for more,
  and the person named as giving the most is Hannah Weiss (A) or Harlan Development (B), read from
  the screen.
- **Stacks that count:** a size bound to the column (the link icon beside Size, "Node size by
  attribute", a column picked) on Everything (S) or on a layer covering every node, such as the
  "hours: has a value" ("donations: has a value") layer the find box's `hours` (all 24 selected;
  the box keeps `hours`) and the selection's Shape "+" > Size make (SD). That Size line arrives at
  1 with focus in its box and the line "Not set yet: the first size you pick makes the layer"; it
  makes no layer until a typed value is committed with Enter (3 makes the layer "hours: has a
  value", all dots equal: F) or the size is bound (notice "Made layer hours: has a value for 24
  nodes"); Enter on the unset 1 does nothing; Escape in it removes the line with focus on Shape
  "+" and no notice; binding there moved the drawing about 130 to 135 px right on 7d87760756 and on B on 6de5f95d12 (Undo moves it back), and not at all on A on 6de5f95d12, where binding on the one-node v09 layer moved it about 130 px instead;
  then the layer covers an earlier binding on Everything until it is bound itself. Sizes typed by hand for a few people: F (the drawing does not follow the number). A
  size bound on a one-node or hand-picked layer covers only those nodes: F; the key over the
  drawing then adds a line naming them ("v09: 1 of 24 nodes") under "Size: hours". A fixed size on
  a hand-picked layer above the binding ("3 nodes" at 4) leaves the key reading only "Size:
  donations" and names nothing covered. A dot's own Style tab, Shape "+" > Size and a value, makes
  a one-node layer named by id ("Made layer v09 for 1 node"); bound there (B: s15 by
  `donations`), it adds "s15: 1 of 24 nodes" to the key, which shows the whole 0 to 250,000 though
  s15 holds 0: F. Once another layer reads the column, the size popover lists it under an "In
  use" heading.
- **Success path (A, 6 steps):** 1-2. File in ("Open a file", Load). 3. Everything (Style open; its Size line is already
  there at 1, Shape "+" is disabled, and the tab ends with "Edges: 4 styles / Edit edges"). 4. The
  link icon beside Size (tooltip and accessible name "Node size by attribute"; a popover with the
  same title opens, its close button named "Close panel", with a "Find an attribute" search box
  at the top (Enter with nothing typed takes nothing; `ho` and Enter takes hours; `ho` and Tab,
  with hours highlighted, closes it and takes nothing, against `decided.md`) and nothing
  highlighted, listing "Fixed size", a "Data" heading over the
  number columns, and "Does not fit: 5 attributes, Show why"; a screen reader hears that row as
  option "5 attributes, hidden, holds text, not groups or amounts (3), holds groups, not amounts
  (2), Show why", and the headings are not exposed). 5. `hours` (the popover closes by itself;
  the Size box then shows a chip "hours" with "From 1 to 3", a key "Size: hours" with a wedge from
  2 to 52 appears over the drawing, the drawing stays put, and a screen reader hears "Node size
  varies by hours, on 24 nodes", which nothing on screen shows). 6. Click the biggest dot: the
  inspector, titled by id (`v09`), shows Hannah Weiss, hours 52 (B: Harlan Development, donations
  250,000). By keyboard: "Open a file" is the 14th Tab; after Load, F6 three times (the canvas first, the left panel third), Tabs to Everything (three on B), Enter, F6 (which lands on "Select what it paints" on 6de5f95d12; on 7d87760756 on the unselected Values tab), nine Tabs to "Node size by attribute" (on 758b8e8081 F6 lands on the inspector heading "Everything", 10 Tabs before it, and on A Everything is three Tabs from the left panel's first F6 stop), Enter, ArrowDown twice, Enter: chip
  "Node size: hours, 1 to 3"; the answer comes from the table (the toolbar's arrows to Table, the
  hours header sorted highest first, top row "Hannah Weiss"). Enter on the Size chip opens the
  dialog "Size by hours" (focus on the dialog itself), and Escape returns to the chip; it reads 20
  histogram rows, each count twice, before its first control; its last box is labeled and named
  "How size meets the layers beneath" with the value "Replace". In the dialog Escape in "Values
  from" reverts silently; a typed "Size from" and Tab commits it but keeps focus there (a second
  Tab moves on); "Size from" 8 above "Size to" 4 is taken silently and the chip reads "From 4 to
  8"; "Edit discarded; this stays 6." under "Size to" pushes "Size from" out of line. The bound
  size link is named "Stop varying node size by data", its tooltip "Stop varying by data: use one
  value for all".
- **Reading "the most" on this build:** on A, in 3D a dot's size also depends on its distance from
  the camera, and v09 (52) and v02 (48) draw about the same size, so the biggest is not clear at a
  glance; with all 24 selected, the selection rings grow with each dot too (v24, 38 hours, looks
  as big as v09). On B it is plain (250,000 against 90,000 next; the big blue dot near the camera
  is s15 Zoning Board, 0). On the drawing the keyboard reaches no dot. With "Values to" lowered to
  100,000 and "Clamp outliers" off, 250,000 and 90,000 draw about the same size. The table sorted on the hours (donations) header puts the answer first
  (Table, then the header: 2 more steps); the attribute's actions menu in the Data place (Add label
  line, Filter to..., Show in table) has "Show in table", which opens it unsorted, and its summary
  shows "Highest 52" with no name and no size action; a column's options in the table offer only
  Move left and Move right, and neither right-click menu offers size. "Open network data" opens no
  local file; a file dropped on the start page opens the read-the-file page; Control+O with the graph open titles its page "Add to volunteers" while its main button reads "Replace volunteers.graphml"; its second page's Replace keeps both hand-made layers (v09 and "hours: has a value"), with sizes still following hours. A click on the size link icon while an "Edit discarded" line shows can open
  nothing (the line goes and the row moves up before the release); a second click works. Making every dot bigger
  by hand can push a dot under the inspector's edge (the drawing is not re-framed). The
  read-the-file page already lists Hannah Weiss with 52 before Load. A name read only from a dot
  that looked biggest and was wrong is F.
- **Final screen:** dot sizes vary; `styles.json` shows a `node.size` binding reading `data.hours`
  (B: `data.donations`).

## T44. Names on the drawing

- **Not run in round 1.** Walked on 7d87760756 by `rounds/r1/pilot/T44A/` (`g-pointer/`,
  `g-detours/`, `g-keyboard/`) and `T44B/` (`h-pointer/`, `h-detours/`, `h-keys/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T44A/` (`r2-pointer/`, `r2-detours/`, `r2-keyboard/`) and `T44B/` (`walk-pointer/`, `walk-detours/`, `walk-detours-start/`, `walk-isolate-undo/`, `walk-isolate-replace/`, `walk-keys/`). Walked again on 758b8e8081 by `rounds/r1d2/pilot/T44A/` (`s3-pointer/`, `s3-detours/`, `s3-replace-undo/`, `s3-keyboard/`) and `T44B/758b8e8081/` (`p2-pointer/` and the `p2-` routes; no keyboard walk).
- **Success (S):** every node carries its name as a label (A: `name`, or `id`, which holds the
  name with its spaces dropped, `MlleVaubois`, both accepted; B: `name`, not `id`), and Cosette
  (A) or Lucy Grant (B) is readable on the last screenshot at the participant's own framing.
- **Labels hidden by overlap:** after the column is picked the screen reads "77 labels, 0 hidden"
  (B: "24 labels, 0 hidden"), although labels in the dense middle visibly touch. On A it reads
  "14 hidden" at size 96, with Cosette readable; on B it stays 0 at size 96, while labels of nodes
  past the left edge are cut by the side panel. Nothing shows which names are hidden; with "Show all labels" ticked the line reads "24 labels", with no hidden part. The app leaves out labels that would overlap,
  and "Show all labels" draws them all, over each other; even with "Hide overlapping labels" on,
  some names are drawn over others, and the selection ring covers the top of a selected node's
  name. "Every node carries its name" is judged on the style tree (`node.label` by `data.name`
  painted on every node), so a participant who stops at "N hidden" can still be S when the named
  person is readable on the last screenshot; enlarging the labels can hide that person's name, and
  the grade follows the last screenshot. Whether they noticed is recorded.
- **Success path (A, 8 steps):** 1. Samples. 2. The card "Who holds the novel together". 3.
  Everything (Style open). 4. Text "+" ("Add to node text"; a menu of Label, Card and Tooltip,
  opening with Label highlighted). 5. Label (the column picker opens by
  itself with nothing highlighted: Find an attribute, Fixed text, then Data (`name`), then
  Structure ("Node id"; once picked the source box reads "id"); the first ArrowDown highlights
  Fixed text; reopened from "Fixed text" it shows Fixed text highlighted). 6. `name` (live "Node label added", spoken only; "77 labels, 0 hidden", on screen and, on 6de5f95d12, spoken too; focus on "Label source: name"). 7. Label
  settings (the gear, tooltip "Label settings", spoken "Node label settings"; its close button is
  "Close panel"). 8. Size (48, "Size in: Scene units"; at the default it has a link icon and no
  reset): type 96, Enter, which doubles every label, keeps focus and (on 6de5f95d12) announces the count, "77 labels, 14 hidden"; Cosette
  then reads at the default framing on the walks. The wheel barely zooms on this build (15
  notches grew the drawing about 15% on A, 10 turns about 10% on B, and `=` on the focused canvas
  about 1% a press), so it does not make a name readable on its own. In the Size box, Escape after
  typing reverts with "Edit discarded; this stays 96." squeezed into a narrow column beside it;
  Tab goes to "Reset Size to default" (a bare minus, no tooltip); Escape on a committed value
  closes the popover onto the gear. With a label in place, Text "+" offers Label look, Label size, Label
  position and Tooltip; Label size adds "Size 48" with focus in the box (80 and Tab commits it
  and moves to "Node label size by attribute", whose tooltip then covers the hidden count). By
  keyboard: `/` or Control+F to the find box, `Cosette`, Enter (Cosette selected, focus out of
  the box), then `f` (Frame selection, announced "Framed Cosette"), which makes the name large; a
  clicked find box behaves the same. `=` zooms the view when the drawing itself has focus, and
  does nothing elsewhere. By keyboard on A on 6de5f95d12, F6 from the layer tree landed on "Resize inspector", the inspector's last stop; Tab from there leaves for Main menu, and Text "+" is 9 Shift+Tabs back from "Edit edges".
- **B:** brings the file in first ("Open a file", Load: 2 steps, as A's sample), then as A: 8
  steps, or 9 with "Show all labels". The keyboard route the same with `Lucy Grant` (the find row
  reads "v16 name: Lucy Grant"; the inspector heading is "v16", the announcement "v16 selected"
  and `f` "Framed v16": the name the drawing shows is never spoken). By keyboard, "Open a file" is the 14th Tab; Everything is reached from the graph heading by Tab, F6 three times and three
  Tabs; Enter on its row keeps focus in the tree, F6 goes to the inspector ("Select what it
  paints"), and Text "+" is 12 Tabs on; Label, then ArrowDown twice (Fixed text, then `name`) and
  Enter. Escape on a node's heading clears the selection. `f` frames the selection, can turn the
  view, and is announced.
- **Detours that do not succeed:** the Graph inspector's Style tab has a Labels section with
  overlap options only ("Hide overlapping labels", "Move labels off nodes and edges"); a selected
  node's own Text "+" makes a one-node layer (named "Cosette", B "v16"; "Made layer Cosette for 1
  node", B "Made layer v16 for 1 node") that labels only that node, under its selection ring;
  "Fixed text" with `name` typed puts the word "name" on every node (recovered by picking the name
  column from the "Label source: Fixed text" button, drawn truncated as "Fixed t..." with no
  tooltip); Escape
  in a new Label line's picker removes the line ("Label not added: no value was picked"; for
  Fixed text with nothing typed, "no words were typed"). With a one-node layer labeling by name,
  Everything's picker lists `name` under "Used elsewhere" though its own line shows Fixed text.
  Turning "Hide overlapping labels" off and on changes nothing visible, and "Show all labels" is
  not on the undo stack (Control+Z after it undoes the label size or source; the box stays
  ticked). Quick actions: `names` gives "No results"; `label` offers "Add label line", not dimmed
  and with no description, which with a label already on Everything only moves focus to that
  line and adds nothing; with no label yet it was not walked on this build (on e3c5bca8e6, with a
  node attribute open in Data > Attributes, it made a new layer "name", "name: has a value, 77
  nodes", Look Card, Size 72, every node labeled: a success by the usual rule, S or SD by its
  length and wrong turns). The find box answers `label` with "No match" and a rule hint, and names
  nodes by id (`MmeThenardier`, edge row "Cosette -- MmeThenardier") while the drawing labels
  "Mme Thenardier". The right-click menu has nothing about names; the main menu no labeling command; "Open network data" (B) no local file. On 758b8e8081 (B), a one-node label layer made from a find-box selection, then Control+O > Replace with the same file, then Control+Z twice ("Undid changing settings and importing data.", then "Undid adding the layer v16.") removes the layer and its "Lucy Grant" label from the drawing, and labeling Everything by name then draws all 24 ("24 labels, 0 hidden"): the tree and the drawing agree, so it is graded from the tree as usual. (On 6de5f95d12 the label stayed drawn and Everything's label drew only that name while the tree said 24.) On A, with no file, the same route is a one-node layer, Main menu > Open sample > Discard, then a new layer and two undos: clean. With a node selected, two controls are named "Everything" (the tree row and the node's "Why this look" link).
- **Not a new finding:** the label drawn small at the default framing; the font with no fallback;
  ties drawn across label text.

## T45. Ties apart from the people

- **Walked on 7d87760756** by `rounds/r1/pilot/T45A/` (`f-pointer/`, `f-detour-nodetab/`,
  `f-detour-find/`, `f-detour-start/`, `f-detour-tie/`, `f-keyboard/`) and `T45B/` (`g-pointer/`,
  `g-detour-find/`, `g-detour-nodetab/`, `g-detour-everything/`, `g-keyboard/`). Walked again on 6de5f95d12 by `rounds/r1d1/pilot/T45A/` (`fin-pointer/`, `fin-ctrlo-replace/`; no keyboard walk) and `T45B/` (`w-pointer/`, `w-detour-find/`, `w-detour-nodetab/`, `w-detour-everything/`, `w-keyboard/`). Walked again on 758b8e8081 by `rounds/r1d2/pilot/T45A/` (`d2-success-pointer/`, `d2-replace-undo/`, `d2-find-layer-condition/` and the other `d2-` routes; no keyboard walk) and `T45B/` (`y-pointer/`, `y-detour-find-newlayer/`, `y-detour-find/`, `y-detour-nodetab/`, `y-detour-everything/`, `y-keyboard/`).
- **Success (S):** A: exactly the 8 family ties drawn thick (wider than the 8 they start at) and
  red, every person and every other tie unchanged. B: exactly the 51 ties with 5 or more shared
  chapters thick and blue (any color a reader calls blue), every character and every other tie
  unchanged.
- **Stacks that count:** a layer whose Edge tab has a category card on `kind` = family (A) or a
  number card on `shared_chapters` from 5 (B), with width and color on its Edge tab, and no node
  value. A layer that also writes a node look is F (people changed). B's find-box rule
  (`=shared_chapters >= 5`) selects the 51, and the selection's Line "+" > Width makes an edge
  layer "shared_chapters 5 or more" (SD; `chapters` alone gives No match, and `5` lists 17 ties
  each showing "shared_chapters: 5"; `chapters >= 5` gives No match with a node-only rule
  example). A's find box row "kind is family (8)", last in the list, selects the 8 ("8 edges
  selected"; `family` and Enter selects only the first tie, Agnes -> Bruno, and empties the box),
  and Line "+" > Color or Width makes the layer "8 edges", "Picked by hand: 8 edges" (SD; its key
  line "Edge color: 8 edges" never says family). A clicked tie's own Style tab, Line "+" > Color,
  makes a one-tie layer ("Agnes -> Bruno", "Picked by hand: 1 edge", with no Add a condition);
  removing its card paints all 30 ties and renames it "All edges", with a notice and Undo, and a
  kind = family card then brings it to 8: with Width added, that route ends on the 8 (SD). A
  selected styled tie draws a blue band over its color that widens with its width (at 24 it hides
  the red); its From and To read in light gray.
- **Everything's Edge tab on this build:** it reads "Everything styles all 30 edges: it is the base
  layer, under every other layer." (B: 254) with no Add a condition, so no condition can be added
  there. Its Color's link icon colors every tie by `kind` (B: its "Edge width by attribute" offers
  `shared_chapters`, which would vary every tie's width: F), and Escape closes the list onto the
  link. The family row's "Set properties for family" > Width opens a box with `8` selected, so
  typing 24 gives 24; once one group has a width, the key "Edge width: kind" lists every group at 8. Control+Z inside the "Color by kind" popover undoes ("Undid changing edge color on
  Everything."). The other ties keep their new colors until "Remove edge color" on Everything,
  which removes the whole base Color line (F unless the other ties end as they started). The family
  row's actions also offer "New layer for family", which makes a correct `kind: family` layer
  carrying the group's width; with red set there and Everything's edge color removed, the route
  ends on the 8 (SD), though Everything keeps a width-by-kind override and the key still shows
  "Edge width: kind". The new layer is named "kind family" (no colon). The family swatch opens a
  color picker, and red there sets family red on Everything; the swatch strip under the kind box
  then reads red, orange, green while the table and the key list neighbors orange, family red,
  coworkers green. The "Color by kind" button's name lists two of the three groups, and the family
  menu's "Clear color: back to the layer's" is cut off. Its Color by attribute recolors every tie
  at once, and getting the others back to gray means removing Everything's whole Color line (SD
  once that is done).
- **Width on this build:** a width typed over the default 8 (20, 24) draws only a little thicker at
  the default framing (selected ties draw far thicker, and a blue band covers their color, until
  the selection clears). Graded on `edge.width` above 8. The subtitle changes to "Edge layer" and
  the layer row's count from the node count (16, B 77) to the ties' (8, B 51) as soon as the edge
  condition is added and its value ticked or typed; the name stays. On A, Tab after a typed width
  commits it but keeps focus in the box with the value selected; a second Tab moves on.
- **Success path (A, 16 steps):** 1-2. File in ("Open a file" with neighbors.csv, Load). 3. "+". 4.
  Layer. 5. Edge tab (a new layer always opens on Node). 6. Which edges (the collapsed line "All
  30 edges: add a condition to narrow"; only expands). 7. "Add a condition" (years_known, close,
  kind). 8. `kind`. 9. Tick family ("8 of 30"). 10. Done ("kind: family, 8 edges"). 11. Line "+"
  (a menu: Color, Width, Pattern, Pattern count, Curved). 12. Width (focus in its box, 8
  selected). 13. Type a width over 8, Enter. 14. Line "+". 15. Color (focus in "Edge color, not
  set, drawn #A9A9A9 dark gray", `A9A9A9` selected). 16. Type `red`, Enter (the key "Edge color:
  Layer 1, 8 of 30 edges" appears; the Color row stays below Width and focus stays in the box).
  By keyboard, the new layer's Edge tab arrived with Which edges already open, so that stop does
  not exist there; Enter on a ticked value closes the card as Done does; Escape in the just-added
  Width box after typing removes the line; Escape in a committed width box restores the value and
  says "Edit discarded; this stays 24." on screen and to a screen reader, as the color box does.
- **B (16 steps):** 1. Samples. 2. The card "Who holds the novel together" (the dataset's name only
  in its small line). 3. "+". 4. Layer. 5. Edge tab. 6. Which edges
  (only expands; on the B keyboard walk one Enter on Which edges opened the list). 7. "Add a
  condition". 8. `shared_chapters` (Between 1 to 31, focus in the from box with `1` selected). 9.
  Type `5`, Tab ("51 of 254"). 10. Done ("shared_chapters 5 to 31, 51 edges"). 11. Line "+". 12.
  Width. 13. Type `24`, Enter. 14. Line "+". 15. Color. 16. Type `blue`, Enter (the key "Edge color:
  Layer 1, 51 of 254 edges"; focus stays in the box, `0000FF` selected, the Color row below Width).
  The drawing stays put when the key appears. Escape in the width box after typing restores 24,
  keeps focus and says "Edit discarded; this stays 24."; Tab goes to "Edge width by attribute"
  (whose tooltip covers the Arrowheads "+"); Escape in the color box after typing says "Edit
  discarded; this stays 0000FF." on screen and spoken; Escape in the color picker closes it onto
  "Pick edge color". A new layer's foot reads "Edges: nothing set, Edit edges" and, on 6de5f95d12, "Nodes: nothing set" until a condition is added, then "Nodes: not styled, Edit nodes". By keyboard the sample is 32 to 33 Tabs from the top (16 to Samples, then
  the library's search, view toggles and chips); after the open, "Add a layer or a folder" is 6 Shift+Tabs back (8 on 758b8e8081, the storage notice's Dismiss and Save first); Enter, Layer, Enter (name), then F6 to "Select what it paints", Tab to Layer
  actions, the Style tab, the Node tab, ArrowRight to the Edge tab, "Style edges", then "Add a
  condition" directly (no Which edges stop); Escape in the from box with `5` typed keeps `5` ("51
  of 254 edges") and the picker open, and Enter closes it; three Tabs to "Add to edge line".
- **Detour to watch:** conditions added on the Node tab do not pick the layer's ties; an edge
  column typed in the Node tab's list offers the action "Add kind on the Edge tab" ("Add
  shared_chapters on the Edge tab", in full), and Enter takes it: the Edge tab opens with the card
  added; going back to the Node tab before a value is ticked drops that card ("Dropped the kind condition: it was not finished"; on B on 6de5f95d12 the untouched `shared_chapters` card, 1 to 31, was kept with no notice and the layer stayed "Edge layer", 254). Fill "+" there adds a Color line at `6366F1` at once, and a color
  typed in it paints every person (F); Control+Z with focus in the box undoes the color, and a
  second Control+Z removes the whole new layer. A layer with only an edge condition reads "Edge layer"; one node look then makes it "Node and edge layer" on 6de5f95d12 (on 7d87760756 it flipped to "Node layer" with "Edge not styled" and its key line lost its count). On a new layer's Node tab, the attribute list shows only the node columns
  (`family` typed: "Nothing found"). Everything's Edge tab (B): "Edge width by attribute" >
  `shared_chapters` sets every tie 8 to 16 (F; Control+Z undoes; its popover is about 340 px tall
  for one row); a Filters step on `shared_chapters` "Keeps edges that pass and the nodes at their
  ends" (hides: F). Hovering a tie shows nothing. A right-click on a tie selects it and offers Select
  endpoints, Frame selection, New layer from selection and Add note; Escape closes the menu and the
  tie stays selected; "New layer from selection" on one family tie never reaches the other 7. The
  Data place's tie attribute shows its values and counts but offers only "Filter to..." and "Show
  in table" (a filter hides ties: F). On A, "Open network data" opens no local file, and New
  project > "Add data..." with the file dropped loads 16/30 but leaves the project "Untitled"
  with Undo enabled. Control+O with the graph open, then "Replace neighbors.csv" and the second page's Replace ("Was 16 nodes, 30 edges; now 16, 30"), keeps the hand-picked "8 edges" layer on the same 8 family ties, red at width 24, on 6de5f95d12 (on 7d87760756 it emptied the layer, 0 matched, with no notice).
- **Final screen:** thick red (blue) ties; `styles.json` shows the edge part's selector and
  `edge.width`, `edge.color`; no `node.` value on the new layer.

## T46. One cluster in red

- **Walked on 7d87760756 by `rounds/r1/pilot/T46A/`** (`7d8c-pointer/`, `7d8c-detours/`,
  `7d8c-keyboard/`) **and `T46B/`** (`x4-pointer/`, `x4-detours/`, `x4-keyboard/`), all three ways
  on both halves. A walked again on 6de5f95d12 by `rounds/r1d1/pilot/T46A/` (`r2-pointer/`, `r2-table/`, `r2-detours/`, `r2-keyboard/`); B's table route by `rounds/r1d1/pilot/T43B/6de5f95d12/rp-t46b-table/`. B walked again on 758b8e8081 by `rounds/r1d2/pilot/T46B/` (`t3-pointer/`, `t3-keyboard/` and the `t3-` routes).
- **The start page's demo** already draws Les Miserables in six community colors, one of them
  red, and a demo node's card reads "Babet, Community 3 of 6": its numbering is not the
  workspace's (Javert's workspace Group 3 is green), it gives no sizes, and it cannot be styled.
  Nothing there is the task's run; a participant may take it for the task done (recorded as a
  false "done" when they say so).
- **Success (S):** a community run's clusters drawn in their colors, the cluster holding Javert (A)
  or Nebraska (B) bright red, every other cluster keeping its own distinct color, and its size said
  from the screen (A: 11; B: 12; both read again on e3c5bca8e6 and on 7d87760756). Which methods count: "Rules
  settled before round 1" above.
- **Stacks that count:** the group's own layer in the run's folder with its color changed (S); the
  folder's "Color from each layer" table with that group's swatch set (S; its picker takes `red`
  and the drawing changes at once, with "Color: 1 changed" and Undo; the picker covers much of the
  drawing and closes on Enter, leaving the table open; Escape twice leaves focus on the folder's
  Color field; clicking the folder's name selects it and does not expand it; the folder's swatch
  strip names a group on hover and does nothing on click); a
  new layer above whose condition picks that cluster (S); a layer of a hand selection (SD). The
  table lists the groups and their counts but not which one holds Javert (Nebraska), and shows
  "Source: <<Layer>>" beside "Change source".
- **Shorter routes on this build:** a node's Memberships button (accessible name "Louvain Group
  3", B "Louvain Group 4", drawn as two columns) opens the group's own layer, expands the folder and
  marks the row in Style layers: red there paints that group (S). By pointer no focus ring shows on
  the Color field and the button looks like plain text (default cursor, no tooltip); by keyboard
  focus lands on the group's heading ("Group 3"). A node's Style > "Why this look" > "Open layer
  Louvain / Group 4" opens the same layer (S).
- **Traps on this build:** the folder's chain icon (accessible name "Give all 6 layers one node
  color", tooltip "One value for all: use orange for all 6 layers"; B "Give all 10 layers one node
  color", "use yellow", then "Color: 9 changed") paints every group one color, a color already
  changed included (F; its inline "Undo the color change" restores them). The "Color: Louvain" key
  over the drawing looks like a list of groups but does nothing on hover or click and shows no
  sizes. A node's own Style tab, Fill "+", adds a Color line showing the group's color in italics
  (inherited) and makes no layer; typing that same color and Enter does nothing; a different color
  and Enter makes a one-node layer ("Javert", B "74"; "Made layer 74 for 1 node") and adds "Color:
  74" to the key: one node, not the cluster (F if left). Group 5's crimson `BE0032` (B) sits next
  to the new red on the drawing and in the key. On B, `cluster` in the
  analysis filter highlights Clustering coefficient (a ranking) first, and Enter opens it; its run
  paints an orange 0.1111 to 0.6667 scale (F); Louvain is second, with no "Start here" badge under
  that filter; Tab there with an option highlighted closes the popover and takes nothing. On A,
  `circles` and `community` give "No analysis matches" (though the start page's demo says
  "Communities" and "Colored by community"), with a tall empty popover over the drawing,
  `together` lists only Edge betweenness, and `group` lists Louvain, the other community methods,
  Girvan-Newman and Connected components; Louvain shows no "Start here" badge under any filter.
  **The table's Nodes tab** has a "Louvain" column that reads the group names the tree, the key, the inspector's Memberships and the table's own Louvain tab use (Javert's row "Group 3", B Nebraska's "Group 4"; on 7d87760756 it held 0-based numbers). The Louvain tab lists the groups largest first (A 20, 17, 11, 11, 10, 8), and a group's "Show members in table" lists its members (11 rows for Group 3). With the table open, a node picked from the find box is highlighted but the table does not scroll to it (B, 115 rows). Opening the table also shrinks the drawing into
  the top half and cuts the key to three rows ("3 more below").
  A one-node layer from a node's Style is named by id on B ("74"), and the key then scrolls ("3
  more below"). The Data place does not list the run's groups. Quick actions answers `Javert`,
  `color` and `louvain` with "No results"; the find box answers `cluster` with "No match". The
  folder shows the token as "<<Layer>>" in Which nodes ("Louvain: <<Layer>>"), in its Color field and
  as "Source: <<Layer>>" in its table, whose palette is named "Eight distinct colors" on A (B: "Nineteen contrasting colors").
  A node's right-click menu reaches nothing about its group. On B, Main menu > Open sample over
  an untouched sample asks "Discard unsaved changes?" while "Autosave: saved" shows.
- **Success path (A, 12 steps; walked on A and B):** 1. Samples. 2. The card "Who holds the novel
  together" (B: "Conferences fall out of who played whom"). 3. Analyze. 4. Type `louvain` (the
  popover is about 460 px tall around one row). 5. Enter. 6. Run (a "Louvain" folder of Group 1
  to 6 appears and a "Color: Louvain" key opens over the top left, over the drawing's left edge
  and half a node; the drawing does not move). 7. Click the find box. 8. Type `Javert`, Enter
  (the inspector, titled by the id; Values, Memberships: Louvain Group 3; the camera glides to the
  node, cutting the drawing off at the top and right on B). 9. The Louvain folder's expand caret (the small chevron left of the folder icon, default
  cursor, tooltip "Expand Louvain" over the folder's name; the folder row need not be clicked
  first, and clicking the name does not expand it). 10. Group 3 (its row shows 11; Style open). 11. Click the color box (selects `009E73`). 12. Type `red`, Enter (`FF0000`). The Undo tooltip
  then reads "Undo changing node color on Group 3 Ctrl+Z". In the box, Escape after typing
  restores `FF0000` and keeps focus; Tab goes to "Node color by attribute".
- **B:** the same on College football with `Nebraska` (the inspector is titled `74`): Group 4, 12
  teams, starting color `A1CAF1` (10 groups; palette "Nineteen contrasting colors": Group 1
  yellow, 3 orange, 5 crimson, 9 dark blue, 10 salmon). The answer shows on the Group 4 row, as
  "12 of 115" and as "Louvain: Group 4, 12 nodes". By keyboard the folder row reads "Louvain,
  folder, 10 layers"; ArrowRight expands it. Groups 3 and 4 on A both hold 11, so a count read off
  the wrong row still reads 11. By keyboard (A), Analyze is 20 Tabs from the opened graph, the
  layer tree is entered at Everything, and the opened group layer's color box is 10 Tabs on (14 on 7d87760756);
  Escape in the Louvain card's Resolution box leaves the card for the analysis filter. By keyboard
  (B), F6 reaches Analyze in two presses (canvas, then Analyze); the find pick puts focus on the
  heading "74" while the status says "Nebraska selected"; Enter on Memberships "Louvain Group 4"
  moves focus to the heading "Group 4" (no focus ring), and the color box is 10 Tabs on; Shift+F6 from Analyze took three presses on 758b8e8081 (the canvas, the inspector heading, then "Graph College football"), the find box one Tab further (on 6de5f95d12 one Shift+F6 entered at the find box).
- **Final screen:** Group 3 (B: 4) red, the others in their colors; the answer 11 (B: 12).

## T47. Every cluster at once, colors kept

- **Walked on 7d87760756** by `rounds/r1/pilot/T47A/` (`7d8-pointer/`, `7d8-detours/`,
  `7d8-detours2/`, `7d8-keyboard/`) and `T47B/` (`p4-pointer/`, `p4-detours/`,
  `p4-detour-landing/`, `p4-keyboard/`). B walked again on 6de5f95d12 by `rounds/r1d1/pilot/T47B/` (`rp3-pointer/`, `rp3-table/`; no keyboard walk).
- **Success (S):** every node drawn as Box (A and B), every cluster's color unchanged.
- **Stacks that count:** the run's folder edited once (its Shape line, written to every group
  layer: S, `Route: folder`); two or more group layers picked together and edited once (S,
  `Route: several`; Group 1, Shift+click Group 10, Shape "+" > Shape, `box`, Enter gives "Shape:
  10 changed"); each group layer edited one by one (S, steps counted, `Route: one by one`); the
  Everything layer's shape (S, `Route: around`: the group layers write only color, so it shows,
  but the bulk edit was not used). Any cluster's color changed, or all clusters given one color
  through the folder's color field: F. A route on the file's conference column (`value`) instead
  of a run: F (not the program's clusters). Bar 1 holds for T47 only when at least half its S and
  SD sessions are `folder` or `several`; the stall rule and question 3 count the same. A node's
  own Style tab, Shape "+" > Shape, makes a one-node layer named by the node's id (A "Valjean", B
  "37" for GeorgiaTech): the Shape line appears with no layer, and the layer ("Made layer Myriel
  for 1 node", "Made layer 37 for 1 node") is made only when a value is picked; the one cube is
  hidden under the selection glow: not a success.
- **Success path (A, 11 steps):** 1. Samples. 2. The card "Who holds the novel together" (B:
  "Conferences fall out of who played whom"). 3. Analyze. 4. `louvain`. 5. Enter. 6. Run (six
  groups in a Louvain folder; a color key opens over the top left, hiding the nodes near its
  edge; the drawing stays put). 7. The Louvain folder (Style shows "6 layers in Louvain. Layers added later
  are not changed."; the Color line shows the purple "Layer" token with the groups' swatches, and
  Which nodes reads "Louvain: <<Layer>>", drawn with guillemets). 8. Shape "+" (a menu of Shape
  and Size). 9. Shape (the Shape line is added, showing "Icosphere" in italics; by keyboard focus
  is on it, by pointer no focus ring shows; a screen reader hears "Node shape added: pick a value
  for every layer", which nothing on screen shows). 10. Open the list (visible label "Shape",
  accessible name "Node shape, default Icosphere" until a value is picked, then "Node shape,
  Box"; Enter also opens it; it opens a one-column list of 36 shapes over the whole inspector,
  covering its own box, with the row under the pointer drawn highlighted and nothing highlighted
  by keyboard). 11. Box ("Shape: 6 changed", Undo; the key gains "Shape: Louvain, Box"). Or by
  keys at step 10: type `box` (Enter takes Box, though by pointer the row under the pointer, such
  as Dodecahedron, stays drawn highlighted and Box is not), Enter. B: the same on College football: "10 layers in Louvain", "Shape: 10 changed";
  the key, which shows all ten groups after the run, scrolls ("3 more below") once Box adds the "Shape: Louvain" entry, hiding Groups 8 to 10. With the table open after the run (B, 6de5f95d12), the Nodes tab's Louvain column uses the key's group names, the Louvain tab lists the 10 groups largest first (16, 15, 14, 12, 11, 10, 10, 9, 9, 9), "Show members in table" filters to a group, and Box on the folder works as without the table; closing the table puts focus on the drawing. By keyboard, Tab into the layer
  tree lands on Everything (the bottom row); ArrowUp reaches the folder; from the start page
  Samples is 16 Tabs and the card about 17 to 18 more; from the opened graph, Analyze is 20 Tabs
  away, and on B Enter in the Louvain card's Resolution box runs it. F6 lands on the "Resize left
  panel" and "Resize inspector" separators, and Tab from "Resize inspector" leaves for Main menu.
  The inline Undo speaks "Undid changing shape" where the same undo elsewhere says "Undid
  changing node shape on 6 layers.".
- **The shape list:** the first click on Box took on every pilot walk. Escape closes the list and
  keeps the value and focus; Tab closes it and moves focus to "Node shape by attribute" (whose
  tooltip then covers the "Shape: 6 changed" line). Typing the prompt's own word `cube` shows and
  speaks 'No option starts with "cube"' at the list's foot while the row under the pointer stays
  highlighted, and Enter does nothing; the reader must find Box. By keyboard ArrowUp from the top
  wraps to Vee. Quick actions finds nothing for `shape` or `cube`, and the find box answers `cube`
  with "No match".
- **Undo past the run, then Redo,** brings back the folder with every group, its count and color
  and the key; Box then applies normally, and a run after undoing offers plain Louvain. The Undo
  and the Redo each move the whole drawing about 130 px (against `decided.md`).
- **The folder's Shape field when one group layer already sets a shape** (a detour of A and B:
  one group made a Box on its own first). On 758b8e8081 the field shows "Box" with "1 layer sets
  shape; not set: ...". Picking Box there changes nothing and raises "Shape could not be changed:
  that value is outside what the property accepts.", a notice that stays until it is dismissed,
  even after a later change works; no "Also set those 5" (B: those 9) is offered (A
  `rounds/round-1/pilot/T47A/p3-detours/22.png`, `24.png`; B `T47B/p3-detours/16.png`). The route
  that works: pick another shape in the field first (Cylinder), then Box; Box then offers "Also set
  those 5", which sets every group's shape; Dismiss the notice (A `p3-detours/26.png` to `28.png`:
  all six groups `box`, colors kept). Undo of the one group's Box, then Box on the folder, works
  too, as does picking the other groups together (`several`). Graded as usual (S, `Route: folder`
  or `several`); a participant who stops at the notice with five groups still balls is F, and the
  notice is recorded as a finding of the folder route.
- **Undo of a shape set on the folder or on several layers** turns the drawing back to balls and
  the open inspector back to an unset "Icosphere"; Box picked again applies at once (the trap of
  older builds is gone).
- **A group layer's own Shape "+" > Shape** adds an italic, unset "Icosphere" line, with no "Not
  set yet" hint; nothing changes and nothing is added to the key until a value is picked, and "-"
  removes the line (a node's own unset Shape line shows that hint). The folder's Color field
  opens "Color from each layer", with nothing about shape; on B one Escape closes that table onto
  the field. The folder's actions menu has nothing that applies a look to every layer.
- **Other detours on this build:** the start page's demo (its Communities toggle turns its colors
  off; a click on the turning demo can hit a link, which stays blue) cannot be styled; a node's
  Style > "Why this look" > "Everything / Size, Shape" opens Everything with focus in the Size box,
  not Shape; the analysis filter's `circles` gives no match and `group` lists Louvain (B:
  `cluster` highlights Clustering coefficient first, Enter opens it, and "Back to analyses" keeps
  the filter); the Data place lists no run result and calls the conference column `value`; the
  color key's rows are inert; the Layout menu names "run Louvain in Analyze first"; a node's right-click menu has no shape or cluster item; a new tab's restore card calls
  the work "An untitled project (77 nodes)".
- **Route: around** gives no "changed" line and no shape entry in the key; the folder route adds a
  "Shape: Louvain" entry with a "Box" row to the key.
- **Final screen:** cubes in six (A) or ten (B) colors; `styles.json` shows each group layer with
  its own `node.color` and `node.shape` `box`.

## T48. Cluster colors on only some people

- **Walked on 7d87760756** by `rounds/r1/pilot/T48A/` (`7d8c-pointer/`, `7d8c-detour-start/`,
  `7d8c-detour-cards/`, `7d8c-keys/`) and `T48B/` (`r4-pointer/`, `r4-detours/`, `r4-keyboard/`). A walked again on 6de5f95d12 by `rounds/r1d1/pilot/T48A/` (`6de5c-pointer/`, `6de5c-detour-start/`, `6de5c-detour-newproject/`, `6de5c-detour-cards/`, `6de5c-table/`, `6de5c-keys/`); the table route on B's file by `rounds/r1d1/pilot/T43B/6de5f95d12/rp-t48-table/`.
- **Success (S):** the clusters' colors drawn only on trained people (A, 15) or sources on the
  record (B, 12); every other node in the starting color; no cluster's color changed; and the
  count said from the screen: 15 (A) or 12 (B). A number read off one cluster's line is F. The
  card's chip ("trained: yes, 15 nodes") counts the whole file, on the folder and on a single cluster
  layer alike (Group 1 alone paints 5 and its chip still reads 15), and on these files it equals
  the answer because every node is in a cluster, so a count read from it is accepted; so is the
  key's "15 of 24 nodes" under "Color: Louvain". (The two counts are not added to "Facts no
  briefing may hold": a bare 15 or 12 matches unrelated text in persona files, and no briefing
  names T48.)
- **Stacks that count:** a `trained` (A) or `on_record` (B) card set to Yes on every cluster layer,
  added once on the folder's picker (S, `Route: folder`), on two or more cluster layers picked
  together (S, `Route: several`) or on each layer (S, `Route: one by one`; after one layer the key
  reads "21 of 24 nodes", B "20 of 24"); a new layer above that paints the others back to
  `#6366F1` (SD, `Route: cover`: it covers, it does not pick). Fill "+" there adds an unset line
  showing `6366F1` in italics that paints nothing until Enter, which sets it and repaints the
  others (typing another color and then `6366F1` over it also sets it). Made while one cluster
  layer or the folder is selected, the new layer lands inside the Louvain folder, where it still
  covers; on a new layer with no conditions Which nodes opens with the attribute list closed (against `decided.md` 2026-10-19), and one click on "Add a condition" opens it. A single cluster layer's Which nodes reads "8 of 24
  nodes". Its Fill "+" line: Escape takes it back; Enter sets `6366F1` and the key reads "Color:
  Layer 1, 9 of 24". The cover route never shows the answer: the key reads "Color: Layer 1, 9 of 24 nodes"
  (B 12) and the group rows carry no count, so 15 must be worked out; the cover layer's row has no
  swatch.
- **A Filters step "on_record is Yes", then the run while it is on, then the step turned off:**
  `Route: around` ("Rules settled before round 1"). While the step is on the key reads "Color:
  Louvain" with "12 of 24 nodes"; "Color: Louvain on 12 nodes" shows once the step is off. Turning
  the step off, or undoing it, does not re-frame the drawing, and a cluster stays cut off at the
  canvas's right edge. After a run started from the Data panel the left panel stays on Data, so
  the folder is out of sight until the Graph rail button is pressed.
- **False finishes on this build:** a Filters step "trained is Yes" ("on_record is Yes") left on
  keeps 15 (12) of 24 and hides the others instead of leaving them in the starting color: the right
  count with the wrong look (F). Removing the folder's Louvain card ("Remove Louvain from every
  layer") makes every cluster layer paint everyone in one color (F). The find box's `trained` (`on_record`) selects the 15 (12), and nothing there restores the others; right-click > "New layer from selection" on them makes a rule layer "trained: yes, 15 nodes" (not a hand-picked one), which keeps its 15 after Control+O > Replace with the same file. Everything has no
  Which nodes: "Everything styles all 24 nodes: it is the base layer, under every other layer."
  Clicking a group in the color key does nothing. The Filters button switches the left panel from
  Style layers to Data. The find box's clear button and Escape empty the text but keep the 15 (12)
  selected, and their rings stay on the drawing through later steps; Escape with focus in a layer's
  inspector clears that selection, with no Undo. The find box's `not trained` and `trained no`
  find nothing; `no` offers "trained is No (9)"; styling the 9 selected (Fill "+", Enter) makes a
  hand-picked layer "9 nodes" in indigo, a cover that never shows 15. A Filters step that hides
  every selected node leaves the inspector reading "9 nodes selected" and offering Style. The
  filter step's Attribute list calls the key column "Node id" and lists Louvain and Community
  size, which the Data panel beside it does not. A find-box pick glides the camera so the
  right-hand cluster is cut off at the canvas edge for the rest of the session (with the step on,
  14 of the 15 dots show). A run started with a selection held moves the drawing about 135 px
  right and cuts off the right cluster.
- **A card on one cluster only** (Group 1's own Which nodes): its chip reads 15 (B 12) while the
  layer paints 5 (B 4) and the key reads "21 of 24 nodes" (B "20 of 24"): a reader can take the
  answer from a wrong state (graded F if left, as above). On A, ticking Group 2 on Group 1's
  Louvain card paints Group 2's trained members in Group 1's orange while the key still shows
  Group 2 blue and loses its count line (a cluster's color changed: F if left). Escape right after
  picking the column (focus on the card's value select) closes the whole picker, edits kept. After
  the folder's card edits, three Undo presses carry the same label, "Undo changing the conditions
  on 3 layers", and the first lands on an in-between "Has no value, 0 nodes" state with every node
  indigo and the key gone, which looks as if the run was undone.
- **Success path (A, 11 steps):** 1-2. File in ("Open a file", Load). 3. Analyze. 4. `louvain`. 5.
  Enter. 6. Run (3 clusters; the inspector stays on the Graph; a "Color: Louvain" key with
  Group 1 to 3 opens over the drawing, which stays put; the key covers a node at the top left (on
  B one Group 3 node, so counting colored dots gives 11; Fit clears it), and a screen reader hears
  "Louvain finished: 3 groups, each a layer in the Louvain folder of Style layers"). 7. The
  Louvain folder ("3 layers in Louvain. Layers added later are not changed."; "Which nodes ... 24
  of 24 nodes", chip "Louvain: <<Layer>>"). 8. Which nodes (a collapsed line; the click opens the
  picker; its card reads "<<Layer>> 3 layers"). 9. "Add a condition" (its results list the run as
  "Louvain (already a condition)"; the open list covers Done). 10. `trained` (the card starts on
  Yes: "15 of 24 nodes"; the drawing changes at once, and the key adds "15 of 24 nodes"). 11. Done
  (chips
  "Louvain: <<Layer>>" and "trained: yes, 15 nodes"). B: the same with `on_record` ("12 of 24
  nodes", "on_record: yes, 12 nodes"). No node moves when the card is added. A new layer's
  attribute list also lists a "Community size 8 to 8" entry under Results. The answer also shows
  on Everything's Fill line: "Covered by Group 1, Group 2 and Group 3 on 15 of 24". By keyboard,
  "Open a file" is the 14th to 15th Tab; after Load, Analyze is 20 Tabs from the graph heading;
  Enter on Louvain in the analysis list puts focus on "Run Louvain" (Enter in the Resolution box,
  when reached, runs the analysis at once); Enter on the folder's
  Which nodes focuses the Louvain card; the card's value box is named "trained: how to match"
  while it holds "Yes"; "Remove trained" comes before the card's value
  (Shift+Tab), and Tab from the value goes to "Add a condition"; from the folder row, Which nodes is 10 Tabs on (on 758b8e8081, round 1 pilot T48 A
  `rounds/round-1/pilot/T48A/keys/15.png` and `16.png`; 9 was counted on 6de5f95d12, 10 on 7d87760756); Which nodes is named "Louvain: each layer's own value" while the screen shows
  "Louvain: <<Layer>>". The "Select layers..." route (the `several` route) works; its checkboxes
  have no accessible name, checking the folder's box checks none of its layers, the folder's own
  checkbox shows partly checked with all three layers checked, and with the picker open two
  buttons are named "Done". Other ways in: "Open network data" (no local file); New project >
  "Add data..." (Cancel returns cleanly; the project stays "Untitled"); a file dropped on the
  empty project's canvas is not taken, though the start page says "Or drop a file anywhere";
  Control+O with the graph open ("Add to Untitled", Replace first; Cancel). The table opened after the run: its Nodes tab's Louvain column reads Group 1 to 3, as the key and Memberships do; Escape in the grid goes to the Table button.
- **Final screen:** 15 (B: 12) dots in cluster colors, 9 (B: 12) in the starting color. The color
  key still lists every group.

## T49. Put it back

- **Walked on 7d87760756** by `rounds/r1/pilot/T49A/` (`h-pointer/`, `h-detours-a/`,
  `h-detours-b/`, `h-keyboard/`, `h-keyboard-samples/`; `h-detours-a-misstep/` opened the wrong
  sample and is set aside) and `T49B/` (`k-pointer/`, `k-detours-a/`, `k-detours-b/`,
  `k-detours-c/`, `k-keys/`), all three ways on both halves. B walked again on 6de5f95d12 by `rounds/r1d1/pilot/T49B/` (`n-pointer/`, `n-detour-color/`, `n-detour-menus/`, `n-detour-remove/`, `n-keys/`): the same look hashes, names, notices and Tab counts. A walked again on 758b8e8081 by `rounds/r1d2/pilot/T49A/` (`s-pointer/`, `k-keys/`, `d-a-typeback/`, `d-b-reopen/`).
- **Success (S):** after the follow-up, the drawing and the style tree are as they were when the
  sample opened: the last line of `styles-steps.jsonl` has the same `look` as its first line after
  the sample opened (not its first line with `graph: true`, which on this build is the start
  page's demo, look `9e7e49b0439e`), and the red (A) or yellow (B) is gone.
- **The change must have been made:** S requires a line of `styles-steps.jsonl` before the
  follow-up whose look has every node red (A) or yellow (B) (its `colors` holds that one color);
  without it, F, whatever the last look.
- **The look on this build:** `look` (`styleContent` in `../tool/measure.mjs`) keeps each layer's
  `revision`. Undo and reopening the sample give the start's look exactly (`76f16b7d52f0` on A
  and B; all red `dadecee7d3de`, all yellow `01fe52ff5dda`). The picker's indigo swatch ("indigo
  6366F1"), and typing `6366F1` back over a set color give a tree that matches the start in every value but its revision (`587e9be416e2`). Deleting one's own layer gives the start's look exactly on 758b8e8081 (`76f16b7d52f0`; `587e9be416e2` on 6de5f95d12). From an empty start,
  `styles-start.json` and the `start` field of `styles.json` hold the start page's demo, so the
  start is the first line of `styles-steps.jsonl` after the sample opened; the grade is by its
  `colors` ("Rules settled before round 1").
- **Routes:** the Undo arrow (tooltip "Undo changing node color on Everything Ctrl+Z"), or
  Control+Z, which works with focus still in the color box: S. After the one undo Undo is dimmed
  (hover shows "Nothing to undo"; dimmed it is a Tab stop), and an extra press does nothing.
  Control+Z with focus in the find box removes one typed letter per press, not the color; after
  Escape it undoes the color. Typing the old
  color back (`6366F1`) or the picker's first swatch ("indigo 6366F1", `54ae8c137668`): S, the
  drawing matching; a near color (`blue` gives `0000FF`, also typed over the hex in the picker;
  `purple` `800080`) is F. The picker marks the color it was opened on as "<name> <hex>, the color
  before this edit" ("yellow FFFF00, the color before this edit" once yellow was set), which is
  not the color the sample opened with: picking it is F. Enter in the picker's hex box applies
  the color and closes the picker (`blue` there gives `0000FF`, a near miss); Escape there
  discards a typed value silently, with no "Edit discarded" line. A click into the hex box
  selected the whole value on A's walk on 7d87760756 (typed text replaces it) and left the caret after it on B's (`FFFF006366F1`) and on A's on 758b8e8081 (`0000FF00FF00`). Removing the Color line with its minus ("Remove node color"; by keyboard
  focus goes to Fill's "+", and on the pointer walks of B and of A on 758b8e8081 to Effects' "+") and adding it again is S
  when the line is then set to `6366F1`: Fill "+" brings it back unset, with `6366F1` in italics;
  Enter on it, or `6366F1` typed and Enter, sets it (`587e9be416e2`); Tab leaves it unset, and
  Escape removes the line again with nothing on screen saying so. Removing the line alone draws
  the default blue-violet, so the screen looks as it opened, while the tree holds no color
  (`43cd506d2038`, `colors` `["none"]`): graded by the drawing, which matches ("Rules settled
  before round 1"), and recorded as a finding about the design.
  Reopening the sample (Main menu > Open sample, the open sample marked "Open now", then the
  dialog "Discard unsaved changes?" and its button "Discard"; it clears the undo history): S. So is
  Main menu > Back to start > Discard (it lands on the start page scrolled to the Sample
  library), then the sample's card. Both dialogs appear while the top bar says "Autosave: saved",
  and Escape keeps the work. Removing a layer the participant made ("+" > Layer, Fill red, then
  Layer actions > Delete, with a notice and Undo): S when the look matches. Hiding Everything with
  its eye (named "Hide Everything", tooltip "Turn this layer off") blanks the whole drawing, ties
  included; Control+Z brings it back. The Main menu, Layer actions (Rename, Duplicate, Pin, Select
  what it paints, Hide, Lock, Delete dimmed on Everything) and the canvas's right-click menu hold
  no undo; the find box answers `undo` and `reset` with "No match".
- **Success path (A, 5 + 1 steps):** 1. Samples. 2. The card "Who holds the novel together" (B: "A
  club that split in two"; the storage notice, "This browser may clear what it keeps for this
  site.", with a Save button). 3.
  Everything (Style open). 4. Click the color box ("Node color, set here, indigo"; selects the hex; no picker opens). 5. Type `red`, Enter (focus stays in the box). `--end` gives the follow-up. 6. The Undo arrow, or
  Control+Z (one key, focus still in the box): the color reads `6366F1` again ("Undid changing
  node color on Everything."). Control+Shift+Z and Control+Y redo. B: Zachary's karate club,
  `yellow` (`FFFF00`). By keyboard (A and B) the sample is about 32 to 33 Tabs from the start
  (16 to Samples, Enter, 16 to 17 to the card; 16 on A on 758b8e8081), Everything 16 Tabs from the opened sample's
  heading, the color box 19 more, and the Undo button 26 Shift+Tabs back from the color box,
  named "Undo changing node color on Everything"; Control+Z is the quick route (B: 74 keys in
  all). In the picker, Close panel, the saturation and brightness slider, "Sample color", the hue
  slider, the color format list and the hex box are Tab stops with the six swatches, and Tab never
  leaves the picker (against `decided.md`, which says Tab closes a pop-out). The picker's
  swatches read "indigo 6366F1" and "<color> <hex>, the color before this edit"; nothing marks
  indigo as the color the sample opened with.
- **Final screen:** blue-violet dots; Everything's `node.color` is `#6366F1`.

## T50. What a colleague's color picks out

- **Walked on 6de5f95d12** by `rounds/r1d1/pilot/T50A/` (`w1-pointer/`, `w2-detours/`,
  `w3-drop/`, `w4-keyboard/`) and `T50B/` (`g1-pointer/`, `g2-detours/`, `g2b-drop/`,
  `g3-keyboard/`), and on the same build from `T37A/6de-r2/t50a-success/`, `T37B/` (`g-t50a/`,
  `g-t50a-detours/`, `g-t50a-keys/`, `g-t50b/`) and `T43B/6de5f95d12/` (`rp-t50a-*`, `rp-t50b-*`,
  `rp-old-project/`). Both project files were saved by an earlier build and open with their look
  on every way in: "Open a file", Main menu > "Open project or file...", a drop on the start page,
  New project > "Add data...", and Control+O with the project open (which replaces it at once,
  with no Replace or Load page; after a change it first asks "Discard unsaved changes?", saying
  the changes are lost while the top bar reads "Autosave: saved"; Escape closes it with focus back
  on Which nodes, and Discard reopens the project as sent). A opens with three orange dots, the
  key "Color: Poster" with "3 of 77 nodes", and the layers Hovered, Selected, Poster (3) and
  Everything (77); B with six green dots, the key "Color: Thank-you cards" with "6 of 24 nodes",
  and the layer "Thank-you cards" (6). `changes.changed` stays empty on every route that only
  reads. (On 7d87760756 both opened without their look, "1 part did not come back".) The find box
  answers `orange` and `green` with "No match" and a rule hint; the key over the drawing has no
  tooltip and does nothing on click. By keyboard, "Open a file" is the 14th Tab; after the open,
  focus is on the heading "Graph, lesmis-poster: 77 nodes, 254 edges" (on B "Opened
  volunteers-thanks" is spoken), the tree is reached by Shift+Tab (or F6 to the left panel), and the rule is spoken on
  the button "Which nodes, 3 of 77 nodes, name contains Mlle, 3 nodes" (B "Which nodes, 6 of 24
  nodes, hours 30 to 52, 7 nodes, trained: yes, 15 nodes").
- **Success (S):** A: names the 3 orange characters (Mlle Baptistine, Mlle Gillenormand, Mlle
  Vaubois) and says what they share: "Mlle" in their name, read from the layer's conditions. B: says
  6 people are green and that they gave 30 or more hours and finished training, read from the
  layer's conditions. Both read from the screen.
- **SD:** the right rule after a wrong first reading corrected on screen. **F:** a rule guessed from
  the names alone (A) with no look at the conditions is F only if it is wrong; a right reading from
  the names alone (all three start "Mlle") is SD under bar 1, recorded as "rule not read", and counts
  as not read (F) for question 5, which is reported per half: A's names give the rule away. On B a
  green count of 7 or 15 read off a single card's chip is F.
- **Success path (A, 3 steps; 4 on e3c5bca8e6, whose start screen added "No thanks"):** 1. "Open a file", lesmis-poster.graphty.json (the project opens with three orange dots and the key "Color: Poster", "3 of 77 nodes"). 2. The "Poster" layer (Style open: "Which
  nodes 3 of 77", the chip "name contains Mlle, 3 nodes"). 3. Values: the
  members, by id (`MlleBaptistine`), or click each orange dot (3 more steps; hover shows nothing).
  B: volunteers-thanks.graphty.json, "Thank-you cards": "Which nodes 6 of 24" with the chips "hours
  30 to 52, 7 nodes" and "trained: yes, 15 nodes" (each card's own count, not 6; nothing on the
  collapsed line, or in its spoken name, says both must hold, and "Nodes that pass every
  condition" shows only once it is opened); opened, the hours card shows the match menu "Between"
  and two boxes, 30 and 52. Its Values tab: "Matched nodes 6", "Node color on 6 of 6 nodes",
  members v02, v05, v09, v16, v17, v21. The rule as the screen states it, "hours 30 to 52" (or
  "between 30 and 52") and trained, is the layer's rule (52 is the file's highest), so it is read
  as the key's "30 or more hours and finished training": S.
- **Another route:** a colored node's Style > "Why this look" > "Open layer Poster" opens the
  layer on the tab last shown (usually Style, with the rule); that node's own Style tab shows Fill
  with "+" and no Color line. Opening the rule (a click on the chip) opens the card with its
  suggestion list closed and focus in its first box; Escape keeps the card open with focus in its box (as `decided.md` 2026-10-19 settles), and Enter or Done closes it; none of them changes the rule. On A, one ArrowDown opens the list of the three
  names with nothing highlighted (Enter then changes nothing); a second ArrowDown and Enter
  rewrites the rule (`Mlle Baptistine`, 1 of 77): a change to the colleague's project, which
  `changes.changed` shows; Control+Z undoes it, and the open card shows the restored text at once.
  Grade the reading; a rule left rewritten is recorded as a wrong turn. On B, Tab goes from the from box to the to box, and Enter in either closes the card with focus on Which nodes; the trained value select opens Yes / No / Has a
  value / Has no value over Add a condition and Done.
  Right-click > "Select what it paints" on the layer selects its nodes, but the selection names
  none of them. On B its summary reads "hours 31 to 52, mean 41.67", "trained Yes (6)" and "role
  staff (4), volunteer (2)": the selection's range, not the layer's rule. A reading of "31 or
  more hours and trained" taken from that summary alone is S ("Rules settled before round 1"). Everything's Color line on B
  reads "Covered by Thank-you cards on 6 of 24", the layer's name a link to it (A: "Covered by
  Poster on 3 of 77"). Members on the Values tab are listed by id; Enter or a click on one selects
  it and replaces the layer's inspector with the node's (titled by id), and Escape there clears the selection and leaves focus on the Graph heading with the layer closed (against `decided.md` 2026-10-19, which returns to the layer with focus on that member's row: a defect, the key counts the screen). The "Why this look" row "Poster Color" (named "Open layer Poster") has no tooltip. The find box answers
  `orange` and `green` with "No match"; the table has no color column and cannot show only the
  selection.
- **Final screen:** the layer's Style with its conditions shown; nothing changed
  (`changes.changed` empty).

## T51. Each kind its own color

- **Walked on 7d87760756** by `rounds/r1/pilot/T51A/` (`7d8c-1-pointer/`, `7d8c-2-detours/`,
  `7d8c-3-keys/`) and `T51B/` (`v3-success/`, `v3-detours/`, `v3-keyboard/`).
- **Success (S):** three distinct colors on `role` (A) or `kind` (B), every node of a value in its
  value's color; the color named for the board (A) or the companies (B) read from the key or the
  panel at or before the step it is said; the ties and every other look unchanged. A color named
  from the drawing alone, with no look at the key or the panel, is SD if right and F if wrong.
- **Stacks that count:** a color bound to `role` (A) or `kind` (B), one color per value, on
  Everything or a new layer (S); three layers, each a category card on one value with its own
  color (S); hand-picked selections colored (SD: they hold node ids, not the rule; the layer is
  named "3 nodes", "Picked by hand", and its key line reads "Color: 3 nodes"). Two values in one
  color, or one value left in the starting color: F. Two hand-made layers leave the third value in
  the starting color with no line in the key: F, though the drawing shows three colors. A
  hand-made layer over a binding on Everything (B: an "Agencies" layer in red, then Everything
  bound to `kind`) draws the agencies red; the key lists "Color: Agencies" red and, under "kind",
  "agency ... covered by Agencies", and the Color line says "Covered by Agencies on 4 of 24":
  grade the color named against the drawing.
- **Success path (A, 5 steps):** 1. "Open a file", volunteers.graphml. 2. Load (the inspector opens
  on the graph's Values). 3. Everything (Style open). 4. The link icon beside Color (tooltip "Node color by
  attribute"; a popover with the same title opens with nothing highlighted, listing the file's
  columns under Data -- name, role, hours, trained, phone -- and "Node id" under Structure; the
  "Data" and "Structure" headings are not exposed to a screen reader). 5. `role` (three colors;
  the key over the drawing opens, reading "Color: role" with volunteer, staff and board; the
  drawing stays put and the key covers its top-left node, so a count of colors on screen can miss
  one (the dialog counts 14 orange on B, the screen shows 13); three small squares appear under
  the Color line, a square's tooltip covering the squares beside it; a screen reader hears "Node
  color varies by role, on 24 nodes", which is not shown on screen). The board's color is read from the key, from a
  square's tooltip (hovering one shows its value, "board"), or from the "Color by role" dialog the
  Color line opens (palette shown as "Eight distinct colors"; Escape returns focus to the Color
  line). After the binding the Color line is a button named "Node color: role, 3 groups, Eight
  distinct colors: volunteer orange, staff blue, board green", which already speaks the answer.
  The link icon is then named "Stop varying node color by data", its tooltip "Stop varying by
  data: use one color for all": clicking it again removes the binding (by keyboard it is one Tab
  after the Color line, with no confirmation; Shift+Tab from the bound line goes to "Add to node
  text", "Pick node color" being no stop once bound). In the attribute list, Tab closes it and
  picks nothing; the squares are not Tab stops, so by keyboard the colors are read in the dialog
  ("company , 6 nodes", with a stray space), from the Color line's name, or from the key. In the
  dialog the grid is one Tab stop walked by arrows (its last cell named "Hide role board role
  board actions"), and Tab after it goes to "No value"; "Reset Palette to default" is drawn
  dimmed but is a Tab stop. Enter on a row's actions cell opens a group view ("Back to the
  groups", "Name of role board", its color, "Select these 3 nodes", "New layer for board"),
  Escape there returns to the grid (Escape in its name box leaves the box and closes the view),
  and Escape elsewhere in the dialog closes it onto the Color line (`decided.md`: Escape closes a
  dialog from any control). By keyboard, "Open a file" is the 14th to 15th Tab; after Load focus
  is on the graph heading (no focus ring); Everything is 5 Shift+Tabs to the tree, Enter, then the
  Color line is reached by F6 and Tabs (about 19 Tabs in all). Tab inside the Text "+" menu does
  nothing.
- **Reference values (7d87760756, the same as e3c5bca8e6, 6dd0b00bd7 and ed4351b258):** A: volunteer orange, staff sky blue
  (the screen reader says "blue"), board green (`#009E73`; the screen reader says "green"). B:
  person orange, company sky blue (`#56B4E9`; the screen reader says "blue"), agency green
  (`#009E73`, "green"). B's key reads "Color: kind". The key shows three lines in three distinct
  colors on both. Accept green or teal on A; sky blue, light blue or blue on B.
- **Detours on this build:** a color typed on Everything makes every node one color with no key
  line (Escape after typing says "Edit discarded; this stays 6366F1."); the find box's "role is
  board (3)" selects the 3 (rows by id), and styling them makes the hand-picked layer above (its
  name and key line, "3 nodes", never say board, and a color typed on Everything first has no key
  line at all; after Enter on its color focus stays in the box, as on every layer; the first such
  layer moves the drawing about 125 to 150 px right, a cluster ending under the inspector;
  `blue` typed there, `0000FF`, is hard to tell from the default indigo); a node's own Style tab
  bound to `role` makes a one-node layer ("v12", "v18") whose key lists only its node's value,
  while its Color line's three squares and spoken name still list all three: F; "Open network
  data" opens no local file (its cards say "on the way"); New project > "Add data..." leaves the
  project "Untitled"; a file dropped on the start page opens the read-the-file page; Control+O
  with the graph open shows "Add to ...", Replace first; three hand-made layers with a category card each (S once all three are made; after
  two, the third value stays indigo with no key line: F); the Data place's attribute (its menu
  and "Attribute actions": Add label line, Filter to..., Show in table), a node's right-click
  menu and Analyze (`color`: "No analysis matches") offer no color by value.
- **Final screen:** three colors on the drawing; `styles.json` shows a `node.color` binding
  reading `data.role` (or `data.kind`), palette okabe-ito.

## Change log

- 2026-10-21 (round 1 entry walks on 758b8e8081, `rounds/round-1/pilot/`): no step count, no
  success definition and no bar changed. Added a settled rule for a participant's file merged into
  an open sample (Control+O over a sample offers no Replace): graded over the file's own nodes,
  `Merged: yes`. T47: the folder's Shape field over a group that already sets a shape refuses Box
  with a notice that does not time out; the route that works is recorded. T41: a click in the left
  panel drops a new text card while focus is still in its empty box. T48 A: Which nodes is 10 Tabs
  from the folder row. The notice after a sample or file opens is the storage notice ("This
  browser may clear what it keeps for this site."), now that sessions run on a disk profile.

- 2026-10-21 (round 1 pilots on 758b8e8081): the key reads the frozen build 758b8e8081 as the pilots in `rounds/r1d2/pilot/` saw it (15 halves; each task names its folders). No step count, no success definition and no bar changed: every success path walked matched its count. Changed to match the screen: a layer made from a find-box selection takes condition edits before its first look (T41 B's "Has no value" switch is accepted, Done keeps both cards; T38, T41); Undo after Control+O > Replace with the same file redraws from the layers, so T44 B's deleted-label state is gone and its grading line from the last screenshot is withdrawn; the first find-box pick after Replace draws its ring; deleting one's own layer gives T49's start look exactly; the sample pictures load. Recorded: a `>` rule layer's card shows raw rule text and takes no edit (T42); Escape in a category card's value search closes the picker (T46); the key drops a run's section after Replace and one undo (T46); a count of its own on a just-added number card (T45); the private-window notice adds two Shift+Tab stops (T39, T45); the drawing's move with a selection held can hide painted nodes on the last screen (T38, T41); keyboard counts (T37, T43, T46, T49).

- 2026-10-20 (round 1 pilots on 6de5f95d12): the key reads the frozen build 6de5f95d12 as the
  pilots in `rounds/r1d1/pilot/` saw it (21 halves; each task names its folders). No step count,
  no success definition and no bar changed: every success path walked matched its count. Changed
  to match the screen: T50 is walkable again (both projects open with their look on every way in;
  Escape keeps a rule card open, Enter or Done closes it); Control+O > Replace with the same file
  keeps hand-picked and rule layers on the same nodes or edges (T38, T41, T43, T45, T48), and an
  exported-then-reopened GraphML adds extra "A group from the file" layers; the table's Louvain
  column reads "Group N" (T46, T47, T48); Les Miserables' library card gives its counts and the
  in-app sample menu says "Open now" (T37); "New layer from selection" opens on the Node tab (T39);
  the label count is spoken (T44); keyboard counts (T38, T39, T42, T43, T44, T45, T46, T48) and
  T45 B's foot and layer-kind lines; the drawing moving with a selection held is marked a defect
  where the key had called it expected (T39, T40). T44 B: after Replace and two undos a deleted
  label layer's name stays drawn and the style tree over-reports `node.label`; such a session's
  "every node carries its name" is graded from the last screenshot.

- 2026-10-20 (round 1 pilots on 7d87760756): the success paths and their notes match the frozen
  build 7d87760756 as the pilots in `rounds/r1/pilot/` saw it, every half walked by pointer,
  detours and keyboard (the session folders are named in each task). The app opens on a start
  page: a sample is Samples and its card (titled by a question, "Who holds the novel together"),
  so sample paths keep their counts; a file is "Open a file" and Load, one step fewer: T38 12, T40
  B 11 (13 with Starts with, which now puts focus in the text box), T41 18, T42 10, T43 6, T45 A
  16, T48 11, T51 5. T44 needs Label settings' Size, since the wheel barely zooms (8 steps). The
  start page's demo, the usage notice at its foot, the broken sample pictures and the
  private-window notice are recorded. With nothing selected the drawing stays put when a key
  appears; with a selection held, runs and selection layers still move it, and the table shrinks
  it. Escape in a style box says "Edit discarded" on screen; Escape keeps a card's edits and
  refused values; Control+A selects all; "New layer from selection" makes the layer at once; a
  dimmed Undo is a Tab stop; F6 has four stops and lands on resize handles. T46's table column
  numbers groups from 0. T47's shape list is a one-column list whose pointer row looks active,
  `cube` says so, and the Undo trap is gone. T49's look hashes changed and its start is read after
  the sample opens (the start page's demo is the first graph the tool sees); `changes` in
  `styles.json` is measured from that demo on every task. T50 cannot be walked: the projects open
  without their layer, a regression of the build, so T50 sessions are build-decided until it is
  fixed. Where the screen contradicts `decided.md`, the key says so and counts the screen. No
  success definition's target changed and no bar changed.

- 2026-10-20 (fifth criteria review): T50 B's summary reading is S with a `Read from:` line; an
  asked color is judged by `colorWord`; framing lines from older builds no longer grade anything.
  The success paths are read again on the build that holds golden (`criteria.md`, preflight 1).

- 2026-10-19 (round 1 pilots on e3c5bca8e6): the success paths and their notes match the frozen
  build e3c5bca8e6 as the pilots in `rounds/r1/pilot/` saw it. A new layer's collapsed Which
  nodes (Which edges) only expands on its first click, so "Add a condition" is a step of its own:
  T38 13 steps, T40 A 11, T40 B 12 (15 with Starts with, which also needs a click in the text box
  because focus stays on the match menu), T41 19, T42 11 on both halves, T45 A 17 and B 16; T39's
  new-layer route is 6. The subtitle and the row's count follow a condition as soon as it is
  added. Enter in a just-added color box keeps focus in the box on every layer, and after Line "+"

    > Color the Color row stays below Width. An unset line takes the value it shows (T48's cover is
    > no longer 2 steps longer; T49's remove-and-re-add ends S with Enter). Runs and the first key
    > re-frame the drawing (it moves right and shrinks). The find box answers `=degree` with "Did you
    > mean Degree?" and keeps the typed text; its no-match hints teach `>=`; picked rows show a check.
    > The analysis card's button is "Run Degree", and `most` highlights Degree. A dimmed Undo is no Tab
    > stop, shows "Nothing to undo" on hover, and Control+Y redoes. T43's selection Size line says
    > "Not set yet"; T44's hidden count starts at 0 on both halves and Quick actions' "Add label line"
    > works once an attribute is open in Data; T45's "New layer for family" route reaches the 8 (SD);
    > T46 A is now walked; T47's `cube` highlights nothing (no Cylinder false finish), and Redo after
    > undoing the run brings the groups back; T48's filtered run is graded `Route: around`, as already
    > settled; T49's picker Enter closes the picker and its swatch reads "the color before this edit";
    > T50's opened card keeps its list closed and B's "hours 30 to 52" reading is S; T51's link icon is
    > one Tab after the Color line. Owed: T46 B and T49 B by keyboard. No success definition's target
    > changed and no bar changed.

- 2026-10-18 (round 1 pilots on 6dd0b00bd7): the success paths and their notes match the frozen
  build 6dd0b00bd7 as the pilots in `rounds/r1d2/pilot/` saw it. Every chip now ends in "nodes"
  ("name contains Mme, 6 nodes"). Fill "+" opens no key until a color is committed, and Enter in a
  new layer's new color box moves focus to the disabled Fill "+". A new layer's Which nodes arrives
  collapsed, and its "add a condition to narrow" line is the Add a condition step. A new cover
  line, or Color added back after removal, is unset with `6366F1` in italics and cannot be set to
  that value directly (T48's cover is 2 steps longer; T49's remove-and-re-add is no longer S unless
  it ends set to `6366F1`). The keyboard lands on the inspector's graph heading after an open. The
  find box keeps the typed text (no `=`), its no-match hint on Les Miserables is a name rule, a
  plain `degree > 30` is mapped without a message, and Shift+click adds node rows too (T40's find
  route can end on the six, SD). Filter steps are "Is any of" or Contains cards, hide on "Add
  step" and are dropped without it. Layers from a selection appear only when a value is committed
  ("Made a layer for the 8 selected nodes"). Runs keep the drawing's size and place, and T48's card
  moves no node. T42's Highest refuses a count over the node count on B. T44's hidden counts
  changed (A 7 at the start, B 1, never 0). T45 B walks in 15 steps; a new layer always opens on
  the Node tab; the Node tab offers "Add kind on the Edge tab". T46's caret alone expands the folder
  (12 steps, walked on B only); the node's own Fill makes no layer at once. T47's Tab closes the
  shape list, and `cube` picks Cylinder. T49's Undo button is 27 Shift+Tabs away and the start
  color is named "indigo". T51's drawing does not re-frame and its status is spoken only. Owed
  before round 1: T46 A all three ways, T37 A and T43 B by keyboard. No success definition's target
  changed and no bar changed.

- 2026-10-18 (round 1 pilots on 5bd16cda6e): the success paths and their notes match the frozen
  build 5bd16cda6e as the pilots in `rounds/r1d1/pilot/` saw it. Fill "+" now adds the Color line
  at once with focus in its box (no Color menu step): T38 12 steps, T39's new-layer route 7, T40 A
  10 and B 11 (13 with Starts with), T41 18. The from box arrives with its value selected and its
  count changes on Enter or Tab, not while typing: T42 10 steps on both halves. Control+Z works
  with focus in a color box (T39, T45, T49: the undo is one key). The color box's spoken name
  ("blue" for `6366F1`, "dark pink" for `800080`) is not used to grade. The find box now reaches
  answers by rule: T37's `=degree > 30` (via "Did you mean") names Valjean; T41's `=trained &&
!phone` and T41 B's edited "email: has a value" layer reach the four (SD); a column name says
  what it selects. Layers made from a selection are named for their rule and rename themselves as
  cards change (T40, T41, T43, T45). Shift+click on a second find-box value row adds to the
  selection: T38's hand-picked route ends as one layer "8 nodes". T37 B's analysis filter lists
  Degree for `connected` and `most`; its layout drew the same on both walks. T43's popover reads
  "5 attributes", and a hand-picked binding's key line names its layer. T44's picker opens with
  nothing highlighted, lists "Node id" under Structure, and `=` zooms by keyboard. T45's Node-tab
  detour points to the Edge tab; T45 B was not walked on this build. T46's Memberships button
  expands the folder and marks the group, and the run redraws the drawing smaller. T47's first
  shape click is not swallowed; a Redo of the run brings back an empty folder. T48's Run opens a
  color key and the Everything layer has no Which nodes; a filtered-run route is left for the
  Director. T50's "Why this look" link opens the layer on Values. T51's popover has no `id`
  highlighted, and a covered value's key line says "covered by". No success definition's target
  changed and no bar changed.

- 2026-10-17 (round 1 pilots on ed4351b258): the success paths and their notes match the frozen
  build as the pilots in `rounds/r1d1/pilot/` saw it. Every path meets: focus in the color box
  after Fill or Line "+" > Color (no click in the box: T38 13 steps, T40 A 11 and B 12, T41 19,
  T42 A 12 and B 11, T45 A 16); focus in a card's text or from box after its column is picked, and
  Enter there closing the picker (T40); the color box's message for an unreadable word; Escape
  keeping focus in a color box; Undo dimmed when a file opens; Control+Z doing nothing while focus
  is in a text box; a new layer opening on the last-shown Node or Edge tab. T37 accepts a node's
  Degree matched against the Values tab's Highest (both on screen before any run; a 3-step route),
  and B's table and Data place hold only id. T38 and T51 read "Picked by hand: N nodes", not "A
  rule set elsewhere". T40's Filters detour leaves 1 of 77 (A) or adds nothing (B), not 0. T41's
  match menu is named by its column. T42's from box no longer crashes, takes `10,000`, and refuses
  `$10,000` with a message. T43's popover is titled "Node size by attribute"; the find box's "Rule:
  hours" route is SD. T44 accepts `id` on A though it drops the spaces; labels can be sized; the
  wheel zooms toward the pointer; the keyboard route needs `/` or Control+F. T45's Everything Edge
  tab offers no condition (its "removes ties" detour cannot happen; its color-by-kind detour is
  recorded). T46's Memberships button and "Why this look" now open the right group layer (shorter
  routes, S); the run opens a key instead of zooming; B's palette is "Nineteen contrasting colors".
  T47's Shape box takes typing, and its first option click is swallowed. T48's lines read "24 of
  24 nodes" with no "3 layers"; its Filters false finish keeps 15 (12), not 0. T49's Undo route
  matches the start exactly; the extra undo does nothing; removing the line alone looks done. T50's
  path walks (its build defect is fixed). T51's popover is titled "Node color by attribute", the
  key reads "Color: role" ("Color: kind"), and the squares name their value on hover. Reference
  values add the volunteers' and sources' Louvain outputs. No success definition's target changed
  and no bar changed.

- 2026-10-17 (round 1 pilots on 58556989e8): every success path rewritten as the frozen build
  shows it, counted one click or entry per step (the old paths grouped "Fill +, Color" and "Layer,
  Enter"); a new section names what every path meets on this build. The Color line needs a click
  in its box before typing (T38, T40 to T42, T45); Style is no step (T39, T43, T44, T46, T47, T49,
  T51); hovering shows no name, so names come from a click or the table (T37, T41, T43, T50); T37
  reads the most connected from a Degree run's rank or the sorted table, and its run's Degree layer
  is not held against the participant; T43's popover closes itself and its Size line is already
  there; T44 is judged on the style tree when labels are hidden by overlap; T47's path is 11
  steps, not 13; T48 accepts a count read from the card's chip (it equals the answer on these
  files); T49 compares style trees with `revision` ignored and adds reopening the sample and
  removing then re-adding the color as routes; T50's path cannot be walked on this build (the
  project's layer is not joined to its row) and is recorded as build-decided; T51's colors are
  recorded. T42 records that `10,000` and `$10,000` become `0` and that a low end above the high
  end crashes the inspector. No success definition's target changed and no bar changed.

- 2026-10-17 (second review, before the freeze): T47 A is cubes, as B (its "clearly bigger" had
  no threshold a grader could apply, and its "the same for all" was never asked). T48 grades carry
  `Route:` (folder, several, one by one, cover), and both T47 and T48 hold bar 1 only when most
  successes went by the folder or several route. T46 and T47 grades carry a `Token:` line for
  question 3.

- 2026-10-17 (after the review of the tier 3 materials): T51 added. T45 B blue, not black. T47 A's
  success is "bigger than the start, the same for all", not "twice" (the starting size is never on
  screen); T47 grades carry a `Route:` line and bar 1 holds only when most successes went through
  the clusters; a route on the file's conferences is F. T48 needs the count. T49 needs the change
  to have been made. T50 A's names-only reading counts as not read for question 5. A scripted exit
  is G, never VOID. T42 records what the box does with `10,000` and `$10,000`. Not taken: giving
  lesmis-poster a rule its names do not show (the file holds names only; a new column means
  re-making and re-reading the project), so question 5 is reported per half instead.
- 2026-10-17: Written for the first-use styling study; replaces the returning-user key of the
  earlier tier 3 drafts (git history only). Values checked on build `31e8c2387` by the pilots
  T41A, T46A, T47B and T49A in `pilot-materials/` and by `../tool/bars.mjs --tier 3`. T46 B names
  Nebraska, not Florida State: the file spells it `FloridaState`, so the find box finds nothing for
  "Florida State" and finds the University of Florida for "Florida".
