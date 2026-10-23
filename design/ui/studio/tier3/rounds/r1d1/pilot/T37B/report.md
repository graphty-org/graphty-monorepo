# T37 B pilot: a first look at Zachary's karate club

Build 6de5f95d12 (graphty@0.8.91), frozen copy `.study-builds/tier3-r1d1-6de5f95d12`. Four sessions,
each from the empty app and each ended: `f-success/` (pointer), `f-detours/` (pointer, the same
detour set as the round 1 pilot), `f-keyboard/` (keyboard only, screen-reader mode) and
`f-fixroutes/` (the routes the latest fixes touched that can be walked on this task's own data).
An earlier success-only pass on this build is kept as `report-6de5-success-only.md` (`success-6de5/`).

The data stayed the karate club's own on every walk: 34 nodes, 78 edges, ids 1 to 34, `id` the
only column before a run. Nothing the participant made was lost: in `f-fixroutes/` the Louvain
groups and the find-box layer were still there after Control+O, a refused file and Cancel.

Result: reached on the pointer and the keyboard walks. Nodes 34 and Edges 78 on the Values tab;
member 34 has the most ties: Degree 17 = "Highest 17", "17, #1 of 34" after a run, and the top row
of the table sorted on Degree.

## 1. Success path by pointer (`f-success/`)

| Step | Action | Screen | Shot |
| --- | --- | --- | --- |
| 1 | No thanks | Start page "Analyze any network", turning demo graph (6 communities) | 02 |
| 2 | Samples (two controls share the name: the top bar link and the start card's button) | Sample library; karate card "A club that split in two, Zachary's karate club -- 34 nodes, 78 edges"; every thumbnail is a broken image | 05 |
| 3 | The karate card | Graph opens; Values: Nodes 34, Edges 78, Degree Highest 17; notice "This looks like a private window..." | 06 |
| 4 | Click the hub (871,312) | Inspector 34: id 34, Degree 17; camera glides it to center (decided) | 07 |
| 5 | Analyze, Degree | Card "How many edges each node has...", Run | 09 |
| 6 | Run | Degree layer (34), key 1-17, Legend on, inspector adds "Results Degree 17, #1 of 34"; drawing moves right about 130 px | 10 |
| 7 | Table | Nodes tab, "34 nodes", "In the order loaded", Id and Degree, "Columns: 2 of 2" | 11 |
| 8 | Degree header | "Sorted by Degree, highest first": 34/17, 1/16, 33/12 | 12 |

## 2. Detours by pointer (`f-detours/`)

- Hover a node (05): pointer cursor, no tooltip, no name; Hovered counts 1, the drawing shows nothing.
- Values tab (06-09): clicking "Highest 17" and the histogram does nothing; "About Degree" opens
  its definition popover, which covers Lowest. No name anywhere.
- Find box (10-19): `most` "No match for "most"", Enter does nothing (11, 12); `degree` offers
  "Degree, Select the 34 nodes" (13); `=degree > 16` shows "Did you mean Degree?" and
  "Degree > 16, Select the 1 node" (14); Tab, Shift+Tab, Enter selects node 34, Degree 17, keeps
  the text selected in the box and says "34 selected" under it (16); Escape empties the box (17),
  a second Escape leaves it with the node still selected (18), a third clears it, "Selection
  cleared: 1 node" (19). All as the key and decided.md say.
- Data place and table before a run (20-26): Node table 34 rows, Edge table 78 rows, Attributes
  only `id`; the table shows only Id, "Columns: 1 of 1" dimmed with tooltip "No other columns to
  show or hide"; Table options holds only Export.
- Right-click the biggest-looking sphere (29-32): node 25, Degree 3; menu Neighborhood, Path
  between, Frame selection, New layer from selection, Add note, left at the pointer while the node
  glides to center; Escape closes only the menu (decided). "Degree 3" opens "25 and 3
  connections" (4 selected); Escape returns to node 25 with focus on its Degree row.
- Analysis filter (33-38): `ties` lists HITS and the group finders, no Degree; `most` lists Most
  flow dimmed ("Select 2 nodes first") with Degree highlighted; Enter opens the Degree card;
  Escape back to the list with `most` kept (36), a second Escape empties the box (37), a third
  closes it (38).
- Quick actions (39-43): tooltip "Quick actions Ctrl+K"; `most connected` and `degree` both "No
  results"; Escape closes, focus on its button.
- Main menu (44): nothing about counts or the most connected node.
- Legend (46): now says "Nothing is styled yet". Filters (47-50): opens Data and "New filter
  step"; Attribute list offers only "Node id"; Escape closes the list, a second Escape the step,
  focus on the Filters "+".

## 3. Success path by keyboard only (`f-keyboard/`, screen-reader mode)

Start: nothing focused; a polite region already holding "Colored by community: 6 groups..." is
marked unconfirmed. Tab order on the start page (02-34): Main menu, Samples, Docs, For
developers, GitHub, Switch to dark mode, Settings..., the demo canvas (named), Communities
(pressed), Key players, Shortest path, 2D, Pause the turning, "Open a file CSV, GraphML, GEXF,
Cytoscape, or a saved project", Open network data, Samples, New project, MIT licensed on GitHub,
Put it on your own site, searchbox "Search samples", Grid (pressed), List, Any (pressed), Social
... Generated, "Open the Les Miserables sample", "Open the Zachary's karate club sample": 33 Tabs
to the card. Enter (35): focus on heading "Graph, Zachary's karate club: 34 nodes, 78 edges", live
"Zachary's karate club: 34 nodes, 78 edges", then the private-window notice.

Shift+A: combobox "Filter analyses" expanded; ArrowDown highlights option "Degree"; Enter: button
"Run Degree"; Tab: "Back to analyses"; Shift+Tab, Enter: live "Degree added, running", "Degree
finished", focus back on "Analyze" collapsed. ArrowRight x4 on the toolbar: Layout, "View, 3D",
"Legend" pressed, "Table"; Enter: button "Id"; ArrowRight: "Degree"; Enter: "Degree, sorted
descending", live "Sorted by Degree, highest first"; ArrowDown: gridcell "17"; ArrowLeft:
rowheader "34"; Enter: "34" selected, live "34 of 34 rows, 1 selected", "34 selected". Tab: Node
actions, tab Values, button "Degree 17", separator "Resize inspector", Main menu. `--read` of the
inspector: heading "34", "Degree 17", Results "Degree 17, #1 of 34". Escape on "Degree 17" (58):
focus stays, selection stays.

Focus never fell to the page body on this walk.

## 4. Fix routes on this task's data (`f-fixroutes/`)

The listed fix routes are other tasks' (T45A, T46A/B, T47, T48, T50A/B, T38/T41/T51). Their
mechanisms that a T37 participant can meet were walked on the karate club:

- Table after a community run (07-10): Louvain gives Group 1 to 4 (12, 11, 6, 5); the key, the
  layer tree, the table's Nodes tab ("Group 1", "Group 4", ...) and its Louvain tab all use the
  same names and sizes; node 34's inspector reads "Memberships Louvain Group 2", matching its
  light-blue color and the key. The fix holds here.
- A layer from a find-box selection (11-15): `=degree > 16`, Enter, Escape twice, Control+K "New
  layer from selection", Enter: the layer is made at once, selected, Style tab open, notice "Made
  layer Rule: graphty.degree > 16 for 1 node".
- Control+O with the graph open (17-21): opens the file chooser at once. A truncated file
  (`club-members.graphml`, 400 bytes) is refused with "club-members could not be added: the file
  is incomplete or damaged near line 9", nothing changed (18). A good file (`volunteers.graphml`)
  opens "Add to Zachary's karate club" with Cancel and Load only (20); Cancel returns with every
  layer and the run kept (21).
- Main menu > Open project or file... (22) opens the same chooser at once.

## Answer key against the screen

- The start page is a landing page: the karate sample is reached through Samples (the library),
  whose card gives "34 nodes, 78 edges" before opening (`f-success/05.png`). The key's "start
  page gives A's answer first ... Key players says Valjean is the biggest" is no longer what B
  meets first: the demo opens on Communities, "6 groups" (`f-success/02.png`).
- The key's keyboard walk ("20 Tabs to Search samples") is now 20 Tabs to "Search samples" and 33
  to the karate card (`f-keyboard/`).
- Find box: the screen also writes "34 selected" under the box after the rule selection
  (`f-detours/16.png`); the key records only the spoken "34 selected".
- Legend before any styling now reads "Nothing is styled yet", as the key says
  (`f-detours/46.png`).
- Everything else matched: the counts, Highest 17, Degree 17 on node 34, the Degree card's text,
  "17, #1 of 34", the sorted table, the find-box option, the routes that do not reach the name.

## Defects

Nothing crashed, blocked the task, or gave a wrong count or a wrong member.

1. Escape on a node's inspector (focus on "Degree 17") does not clear the selection: focus stays,
   Selected stays 1, nothing announced. decided.md (2026-10-19) says it clears from any control
   that is not a field (keyboard, `f-keyboard/58.png`).
2. "34 selected" under the find box and in the live region after selecting node 34 reads as a
   count of 34 while one node is selected (detours `f-detours/16.png`; keyboard, after Enter on
   rowheader 34).
3. The inspector heading that takes focus after the graph opens shows no visible focus ring;
   decided.md says it draws one (keyboard, `f-keyboard/35.png`).
4. Every sample thumbnail in the library is a broken image: each
   `https://graphty.app/data/graph-samples/v1/<name>.webp` fails (ERR_BLOCKED_BY_ORB) (success,
   `f-success/05.png`).
5. "Samples" names two controls on the start page (the top bar link and the start card's button)
   that do different things (scroll versus navigate) (success, `f-success/03.png`).
6. A layer made from a find-box rule is named "Rule: graphty.degree > 16", an internal field path,
   where the find box said "Degree > 16" (fix routes, `f-fixroutes/15.png`).
7. After Cancel on "Add to Zachary's karate club", the earlier refusal notice for a different
   file ("club-members could not be added ...") shows again (fix routes, `f-fixroutes/21.png`).
8. Control+O (and Main menu > Open project or file) with a graph open offers only "Add to <graph>"
   for a different file, no Replace; a reader who wants to look at the new file alone has no
   choice on that page (fix routes, `f-fixroutes/20.png`). Not settled in decided.md, which covers
   only the same file.
9. "This looks like a private window: your work is gone when it closes" shows on every opening in
   the study browser (success `f-success/06.png`, keyboard live line at 35).
10. Hovering a node shows no name or highlight; Hovered counts 1 (detours, `f-detours/05.png`).
11. Highest 17 and the histogram name nobody and do nothing on click (detours,
    `f-detours/06.png`, `07.png`).
12. The biggest-looking sphere is a near node in 3D (node 25, Degree 3) (detours,
    `f-detours/29.png`).
13. Degree is shown on a node's inspector and offered in the find box before a run, but the table,
    Attributes and the filter step's Attribute list do not offer it; the filter list calls the
    column "Node id" where the rest says "id"/"Id" (detours, `f-detours/22.png`, `48.png`).
14. The find box answers `=degree` with "Did you mean Degree?", a question about letter case
    only; `most` gives "No match" with no hint (detours, `f-detours/14.png`, `11.png`).
15. The analysis filter does not list Degree for `ties`; Quick actions finds nothing for `degree`
    or `most connected` (detours, `f-detours/33.png`, `42.png`).
16. After the Degree run the three best-connected nodes (17, 16, 12) are drawn in nearly the
    same dark brown (success, `f-success/10.png`).

Tool records: `work.json` of the pointer sessions lists the start page's demo graph (Les
Miserables, its Louvain run and layers) as the work the participant arrived to, so its "gone"
names them although the participant never had them (`f-success/work.json`). The fixture
`tool/files/club-members.graphml` is 400 bytes and ends mid-tag at line 9.

## Not walked

- Drop a file on the start page, T50A's Poster layer and T50B's Thank-you cards layer, a project
  saved before the golden merge, Control+O > Replace with the same file: they need another task's
  file or project, which would replace this task's data; walked in those tasks' pilots.
