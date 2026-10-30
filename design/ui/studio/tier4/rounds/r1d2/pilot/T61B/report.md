# T61 B pilot, targeted re-walk on build ff17391bb1

Task: put gauges.csv and flows.csv together as one network, report gauges and stretches and what
did not fit; the follow-up asks how many stretches came from the second file and where that was
read. Build: ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1). Every walk starts
from the empty start screen and reaches the app by clicks, typing and keys only. Screenshots are
under the main checkout's tmp/design-studio/tier4/r1d2/pilot/T61B/.

Result: reached on every route. The data stays the gauges' and flows' own the whole way. Nothing
crashes, blocks the task or gives a wrong count.

None of the routes the fix pass touched belongs to this task (they are routes of T64, T65 and T68),
so this re-walk covers only this task's own walks.

## Walks that matched the earlier pass to the end

Replayed on this build, every check point matched, so the earlier findings stand: d2-drop (dropping
flows.csv on the open network), p3-drop and w3-drop (the same), k1-keys, p4-keys and w4-keys (the
success path by keyboard only), w5-keys-sr (the keyboard walk in screen-reader mode). The keyboard
walks reach the end: Join, 12 gauges and 14 stretches, with the follow-up's 14 in the source row's
name ("flows.csv 13 of 15 rows joined ... 12 nodes, 14 edges").

## 1. Success path by pointer (p1-success; s1-success and w1-success are the same route)

Start screen > Open a file > gauges.csv (11 nodes) > Data > Add source > File... > flows.csv > the
join screen "Join flows.csv -> gauges.csv": Edges, from = Id, to = Id, chips "14 edges added",
"1 new node", "1 not in graph", "1 repeated key" with a warning glyph (p1-success/05.png) > Join.

- After Join (p1-success/14.png): Overview Nodes 12, Edges 14, "From 2 files". Matches the answer
  key.
- Where the replay stopped: the flows.csv row now draws its counts as chips (12, 14) and its issue
  chip (warning glyph, 1), so the file name is cut to "f..." and the earlier hover point now lands
  on the counts. Hovering the name gives "flows.csv" (15.png); hovering the counts gives "12 nodes,
  14 edges" (16.png, 17.png). The follow-up's 14 reads whole on the row.
- The issue chip opens "Issues in flows.csv": edges, 1 unknown end, with Add nodes, Leave out,
  Ignore (20.png). The repeat is shown only on the join screen, as the answer key says.
- Edges table: 14 edges, G09 -> G12 among them (22.png).

s1-success and w1-success stopped at the same hover and ended on the same screen
(s1-success/16.png, w1-success/16.png).

No mismatch with the answer key.

## 2. Detours

### Main menu > Open project or file..., Replace, Cancel and the notice's Undo, the Source box, a separate graph, the reverse order (d1-menu-open)

- Main menu > Open project or file... > flows.csv opens the same join screen; Join choices >
  Replace gauges.csv gives 12 / 14 but leaves only flows.csv in Sources, issue chip 3 (08.png), as
  the answer key says; Control+Z brings gauges.csv back.
- Add source > File... > flows.csv > Cancel: notice "Join canceled" with Undo (15.png). Where the
  replay stopped: that notice's Undo and the dimmed header Undo now share the name "Undo" (two
  controls), where the earlier build had one. The notice's Undo reopens the join screen with the
  same choices (16.png).
- Clicking the Source label, then Escape, closes the join screen ("Join canceled", 18.png):
  Escape in a dialog closes it (settled). Clicking the Source column box opens its list (21.png);
  Escape closes the list and keeps "from" (23.png); Enter on the closed box does nothing (24.png,
  25.png); Tab moves to the Id box and opens its list (26.png); Escape closes it (27.png).
- Join choices > Open as a separate graph switches the split button to "Open as a separate graph"
  (33.png); pressing it opens a second project "flows" with 12 nodes, 15 edges and "1 repeated
  edge" (35.png): two separate projects, not success, as the key says.
- Main menu > Back to start > Open a file > flows.csv > Data > Add source > File... > gauges.csv >
  Join: Nodes 12, Edges 15, "1 repeated edge", both files in Sources (40.png). The reverse order's
  own counts; graded right by the key.

### The same opening, then a canceled join and the reverse order (w2-menu-open)

Stopped where d1-menu-open did (the second "Undo"). By the next step the notice had gone, so only
the header Undo was left (15.png). The reverse order then gives 12 / 15 with both sources
(18.png).

### Replace, Cancel, the join boxes, a second project, then Quick actions > Add data... (p2-menu)

Steps 1 to 56 matched. Where the replay stopped: Quick actions > "file" > Add data... now opens the
file chooser at once (the earlier build first showed a page with Choose file). flows.csv opens the
same join screen with 14 edges added, 1 new node, 1 not in graph, 1 repeated key (59.png); Join
gives Nodes 12, Edges 14 and both sources (60.png). Graded as the path.

## 3. Success path by keyboard only

Not walked by hand again: k1-keys, p4-keys, w4-keys and w5-keys-sr matched every check point to
the end on this build (see above), so the earlier keyboard findings stand.

## Defects

None crashes, blocks the task or spoils its grading.

- Two controls are named "Undo" while the "Join canceled" notice shows: the notice's Undo and the
  dimmed header Undo (d1-menu-open/15.png). A screen-reader user hears two "Undo"s that do
  different things.
- "Open as a separate graph" shows the notice "Join canceled" with Undo, though the reader opened
  a new project (d1-menu-open/35.png; the same on the earlier build).
- Back to start logs a failed request for the start screen's sample image venice-transit.webp
  (net::ERR_BLOCKED_BY_ORB) (d1-menu-open/36.png; the same on the earlier build).

Already known and unchanged: tabbing into a join column box opens its list (d1-menu-open/26.png);
the issue still offers Add nodes for G12 after the join put G12 in the graph
(p1-success/20.png); Replace removes gauges.csv from Sources (d1-menu-open/08.png); the second
source's file name is cut to "f..." on its row, readable in its tooltip (p1-success/15.png).
