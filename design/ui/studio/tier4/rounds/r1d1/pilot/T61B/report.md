# T61 B pilot, targeted re-walk on build 037e96e9bb

Task: put gauges.csv and flows.csv together as one network, report gauges and stretches and what
did not fit; the follow-up asks how many stretches came from the second file and where that was
read. Build: 037e96e9bb (frozen, served from .study-builds/tier4-r1d1-037e96e9bb). Every walk starts
from the empty start screen and reaches the app by clicks, typing and keys only. Each walk was
replayed from the newest walk of the same route on this build; every route matched its recorded
screens to the end. Screenshots are under the main checkout's
tmp/design-studio/tier4/r1d1/pilot/T61B/.

Result: reached on every route. The data stays gauges' and flows' own the whole way. Nothing
crashes, blocks the task or gives a wrong count.

## 1. Success path by pointer, and the follow-up (z1-success)

Start screen > Open a file > gauges.csv (11 nodes) > Data > Add source > File... > flows.csv > the
join screen "Join flows.csv -> gauges.csv": Edges, from = Id, to = Id, chips "14 edges added",
"1 new node", "1 not in graph", "1 repeated key" with a warning glyph (z1-success/05.png) > Join.

- After Join (z1-success/14.png): Overview Nodes 12, Edges 14, "From 2 files". Matches the answer
  key.
- The flows.csv row reads 12 and 14 whole, with the issue chip (warning glyph and 1) in its own slot
  after them (z1-success/14.png). The follow-up's answer, 14, is readable on the row; hovering the
  counts gives "12 nodes, 14 edges" (16.png).
- The issue chip opens "Issues in flows.csv": 1 unknown end, with Add nodes, Leave out, Ignore
  (18.png). The repeat is shown only on the join screen, as the answer key says.
- Edges table: 14 edges (19.png).

No mismatch with the answer key.

## 2. Detours

### Main menu Open project or file..., Replace, Cancel on the join screen and again, a second project, then Quick actions > Add data... (z2-detours)

All 61 steps matched. The main menu's Open project or file... opens the same join screen; Replace
gives 12 / 14 but leaves only flows.csv in Sources (08.png); Cancel, Undo and a second join behave
as before; Back to start and opening flows.csv alone gives a separate project. Quick actions >
"file" > Add data... opens the file chooser (58.png); flows.csv opens the same join screen with 14
edges added, 1 new node, 1 not in graph, 1 repeated key (59.png); Join gives Nodes 12, Edges 14 and
the flows.csv row reads 12, 14 and 1 issue (60.png). Add data... again by keyboard (Control+K, "add
data", Enter), then Escape in the file chooser, closes it with no change (62.png).

### Quick actions > Add data... from a fresh start (z5-quick-actions)

All 5 steps matched: Quick actions > "add data" > Add data... > flows.csv opens the join screen
(04.png); Enter joins; Data shows Nodes 12, Edges 14, From 2 files, and both files in Sources
(06.png).

### Dropping flows.csv on the open network (z3-drop)

All 10 steps matched: the drop opens the join screen; the Source column box takes ArrowDown, Escape,
Enter, Tab and Space; Join gives Nodes 12, Edges 14 and the flows.csv row reads 12, 14 and 1 issue
(11.png).

## 3. Success path by keyboard only, with screen-reader names (z4-keys)

All 95 steps matched. Tab from the top reaches "Open a file CSV, GraphML, GEXF, Cytoscape, or a
saved project"; Enter > gauges.csv; Data by arrow and Enter; "Add source" collapsed > Enter >
menuitem "File..." > flows.csv; focus lands on "Join". Join > focus on "flows.csv 13 of 15 rows
joined 12 nodes, 14 edges" (71.png), so the follow-up's 14 is in the row's name; "1 issue in
flows.csv" opens dialog "Issues in flows.csv" and Escape returns focus to the chip; "flows.csv menu"
> Edit join reopens the join screen, and Escape there after a changed value leaves the graph at 12
and 14 with focus on the row's menu button (88.png). Adding flows.csv a second time replaces it in
place ("Replaced flows.csv with flows.csv", Undo), counts unchanged (96.png). Focus fell to the page
body only on the freshly loaded start screen, before the first key.

Enter, Tab and Escape in the join screen's boxes: Enter takes the highlighted choice, Escape closes a
list, Tab moves on.

## Defects

None that crashes, blocks the task or spoils its grading.

Already known and unchanged: tabbing into any of the four join column boxes opens its list
("expanded" on focus, z4-keys/42.png to 45.png); the issue still offers Add nodes for G12 after the
join put G12 in the graph (z1-success/18.png); Replace with a different file removes gauges.csv from
Sources (z2-detours/08.png).
