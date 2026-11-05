# T66 B pilot: leave out the gauge that only the stretch list names

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Start: `gauges-joined.txt` (gauges.csv
with flows.csv joined onto it; 12 nodes, 14 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T66B/ (not in git). No earlier
route existed, so every walk was stepped by hand.

## Result

Reached on the answer key's route: a Data source filter card with gauges.csv ticked shows 11 of 12
nodes, and G12 stays in the network. But the same card also leaves out every edge (0 of 14): flows.csv
is the only file the edges came from, so keeping "what came from gauges.csv" removes the whole stretch
network from the picture. The screen and the spoken status both say so ("Filter on: 11 of 12 nodes, 0
edges"). A participant who reads the picture sees eleven loose dots, not their network minus one gauge.
The answer key's other accepted routes (a card on the id, or on a blank station, with Hide) cannot be
built on this build: a text card offers only Contains, Starts with, Ends with and Is exactly, and Hide
means "hide nodes that do not match".

## 1. Success path by pointer (success/)

1. 01.png: the start. Data place, Sources lists gauges.csv (11) and flows.csv (12 nodes, 14 edges, 1
   issue); the table is open on Nodes.
2. 03.png: Filters "+" ("Add filter") opens the attribute picker: Nodes, Edges, Structure groups.
   Data source is the first Structure item, below the fold; 04.png after scrolling.
3. 05.png: "Data source" adds a card with one box per source (gauges.csv 11, flows.csv 12) and no
   count yet.
4. 07.png: ticking gauges.csv: card count 11 of 12 nodes and 0 of 14 edges, top bar "11 of 12 nodes,
   0 of 14 edges", inspector "Nodes showing 11 of 12, Edges showing 0 of 14", Degree all 0. Every edge
   is gone from the drawing. 16.png: the Edges table reads "No rows".
5. 18.png: ticking flows.csv too brings back all 12 and 14 (the boxes are OR'ed); 20.png: unticked
   again, the success state.

Hover checks: the card's cut-off "Data so..." name has no tooltip (10.png); the issue chip "1 issue
in flows.csv" has no tooltip (02.png); the Hide segment's tooltip is "Hide nodes that do not match"
(17.png); the on box's is "Apply from gauges.csv" (12.png).

## 2. Detours (detours/)

- **The source row's menu** (right-click on flows.csv, 03.png): Edit join, Replace with file...,
  Select nodes, Export..., Rename, Remove. No way to leave anything out from here. "Select nodes"
  (04.png) selects all 12 nodes and 14 edges, and the drawing zooms in and moves with no request; it
  stays moved after Escape clears the selection (05.png). The source's inspector says "Loaded: Nodes
  1, Edges 14" while its row and the filter card say 12 nodes (03.png).
- **Removing the second file** (06.png): Remove deletes all 14 edges at once (Edges 0, Components
  11). No notice says what was removed; the only notice on screen is the earlier "Selection cleared".
  After the removal the gauges.csv row shows an issue chip "3" that it never showed while two files
  were loaded. Undo restores everything ("Undid removing flows.csv.", 07.png).
- **The toolbar magnifier** (08.png): it is "Quick actions", not a find box; typing G12 says "No
  results". Escape hands focus back to the button (09.png).
- **The table row** (10-12.png): right-click on G12's row does nothing. A left click selects G12, and
  the drawing jumps and zooms again. The node's "..." menu (13.png) and its right-click menu on the
  canvas (15.png) offer Neighborhood, Path between..., Frame selection, New layer from selection,
  Add note (and Motion off): nothing that leaves a node out.
- **A card on the id** (16-21.png): Filters "+" > Node id, type G12, Enter: the card writes with Hide
  on, and the picture keeps ONLY G12 ("1 of 12 nodes", 18.png). The operator list (19.png) has no
  "does not contain" or "is not". Select instead marks G12 and keeps all 12 (21.png). Neither leaves
  G12 out. Removing the card (22.png) also cleared the selection.
- **A card on station** (23-26.png): the picker's search finds station; the card has the same four
  text operators and no "has no value". Escape in its empty box takes the card back and puts focus on
  Filters "+" (26.png), but no notice appeared or was announced.
- **The Graph place's find box** (28.png): "Find nodes, edges, values" finds G12 and its edge G09 ->
  G12. Right-click on the result does nothing (29.png). The Graph place's header reads "Graph
  gauges.csv" though the inspector says "From 2 files" (27.png).
- **A style layer that hides it** (31-37.png): Style layers "+" > Layer > Add a condition > Node id
  "G12" > Visibility "+" > Hide. G12's sphere disappears but its edge from G09 is still drawn,
  ending in nothing (36.png). The key over the canvas reads "Show: Layer 1, 1 of 12 nodes" for a
  layer that hides. In the Style picker Node id sits under "Structure" (33.png); in the Filters
  picker it sits under "Nodes" (success/03.png).

## 3. Success path by keyboard only (keyboard/, started --keys --sr)

Reached. Tab order from the start: Main menu, Project: gauges, Undo joining flows.csv, Redo
(disabled), Data (rail), Collapse Sources, Add source, gauges.csv 11 nodes, gauges.csv menu,
flows.csv 13 of 15 rows joined 12 nodes, 14 edges (pressed), 1 issue in flows.csv, flows.csv menu,
Collapse Fields, Collapse flows.csv, Add to edge fields, Direction, Expand gauges.csv, Add filter (18
Tabs). Enter on Add filter focuses "Find an attribute"; typing "sou" highlights "Data source"; Enter
adds the card and focuses "gauges.csv, 11 nodes"; Space ticks it and announces "Filter on: 11 of 12
nodes, 0 edges". The card header then reads: Data source (expanded), Remove from gauges.csv, Hide
nodes that do not match (radio), Apply from gauges.csv. Enter on "Data source" collapses the card
to "from gauges.csv" and opens it again; Escape there moves focus to the on box. Escape in the
attribute picker returns focus to Add filter; Tab with nothing typed closes it and moves on. Focus
never fell to the page body. The resize handle "Resize left panel" is a Tab stop between the card
and the canvas.

## Defects, most severe first

1. Keeping one source with the Data source card also hides every edge that came only from the other
   source: the task's network loses all 14 stretches to leave out one gauge (success/07.png,
   success/16.png).
2. No text condition can leave out one named node: no negative operator, and Hide keeps the matches,
   so "Node id contains G12" + Hide shows only G12 (detours/18.png, detours/19.png).
3. The visible label "Hide" reads as "hide these"; it hides everything else (detours/18.png).
4. Selecting (a source's "Select nodes", a table row) moves and zooms the drawing unasked, and it
   stays moved (detours/04.png, detours/05.png, detours/12.png).
5. A style layer that hides a node leaves the node's edges drawn to nothing (detours/36.png); its key
   row says "Show: Layer 1" (detours/37.png).
6. Removing a source shows no notice of what was removed (detours/06.png).
7. Two node counts for one source: inspector "Loaded Nodes 1", row and card "12" (detours/03.png).
8. gauges.csv's issue chip is missing while two sources are loaded and appears ("3") once flows.csv
   is removed (success/01.png, detours/06.png).
9. The toolbar magnifier ("Quick actions") answers a node id with "No results" (detours/08.png).
10. flows.csv, a local file, carries the link glyph; its edge-count chip and issue chip overlap; the
    "13 of 15 rows joined" in its name is not on screen (success/01.png).
11. The card name "Data so..." is cut off with no tooltip; the issue chip has no tooltip
    (success/10.png, success/02.png).
12. Escape that takes back an empty card shows no notice (detours/26.png).
13. Node id is grouped under Structure in the Style picker and under Nodes in the Filters picker
    (detours/33.png, success/03.png).
14. Graph place header names only gauges.csv for a graph from two files (detours/27.png).
15. Right-click on a table row or on a find result does nothing (detours/11.png, detours/29.png).

## Not walked

Nothing on the task's detour list was skipped. Not tried: opening the second file again from the
start screen (it does not bear on leaving a node out).
