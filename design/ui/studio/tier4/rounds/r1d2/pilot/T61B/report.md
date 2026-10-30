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

## Re-walk on build bccf8fe47f (the unknown end's mark moved to the end that is unknown)

Build bccf8fe47f (`.study-builds/tier4-r1d2-bccf8fe47f`), 1440 x 900, start `empty`. Screenshots are
under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T61B/ (e1 to e6).
Every walk starts from the empty start screen and reaches the app by clicks, typing and keys only.
The data stayed the task's own on every walk: gauges.csv (G01-G11, Upper Falls, Mill Pond, ...) and
flows.csv (15 rows, G09 -> G12 among them).

Of the routes the fix pass touched, two belong to this task: the success path on to Edges > With
issues, and the keyboard walk on to the Edges table's end header. Both were walked, with the
detours held from the earlier pass. The rest belong to T61 A, T65, T66, T67 and T68 and are walked by
those pilots.

| Walk | How | Result |
| ---- | --- | ------ |
| e1-success (pointer) | replay of p1-success, on to Edges > With issues 1 and the header mark | All 23 steps matched; reached |
| e2-menu-open (detour: main menu, Replace, Cancel and Undo, the join boxes, a separate graph, the reverse order) | replay of d1-menu-open | All 36 steps matched; the earlier findings stand |
| e3-flows-first (detour: Replace and Control+Z, a canceled join, then flows.csv first and gauges.csv second) | replay of w2-menu-open; stopped at step 14, finished by hand | Reached (12 nodes, 15 edges) |
| e4-quick-actions (detour: Quick actions > Add data..., then Edges > With issues 1) | replay of p2-menu | All 61 steps matched; reached |
| e5-keys (keyboard, screen-reader mode) | replay of k1-keys | All 95 steps matched |
| e6-keys-edges (keyboard, screen-reader mode) | replay of k1-keys kept open, then by keys to the Edges table's end header | Reached |

### Success path by pointer (e1-success): reached

- The join screen reads "Join flows.csv -> gauges.csv", Edges, from = Id, to = Id, "14 edges
  added", "1 new node", "1 not in graph", "1 repeated key" with its warning glyph (e1-success/05.png).
- After Join: Overview Nodes 12, Edges 14, "From 2 files"; Sources lists gauges.csv (11) and the
  flows.csv row (12, 14, issue chip 1) (e1-success/13.png).
- Edges, 14 edges, "With issues 1": the warning glyph is on the Target header and Source has none;
  the one row is G09 -> G12, 4 km, with G12 drawn in the warning color and G09 plain
  (e1-success/23.png); the glyph's name is "Issues in Target" (e1-success/24.png). The table now names
  the gauge that did not fit. The same screen after Quick actions > Add data...
  (e4-quick-actions/62.png).

### Detour: flows.csv first, then gauges.csv (e3-flows-first): reached

- Step 14 went another way: the "Join canceled" notice was still up, so "Undo#2" was its Undo, which
  reopens the join (e3-flows-first/15.png), as on d1-menu-open. Cancel, then Main menu > Back to
  start and the rest by hand.
- The join screen reads "Join gauges.csv -> flows.csv", Node values, id = Id, "11 matched", "1 no
  value" (e3-flows-first/19.png). After Join: 12 nodes, 15 edges, "1 repeated edge", "From 2 files",
  both sources, neither row carrying an issue chip (20.png). This order's counts are the ones the
  answer key accepts.
- Edges, "With issues 1": the glyph is on the "from" header ("Issues in from"), the one row is
  G03 -> G04, 2.1 km, with G03 tinted; its menu reads "1 repeated edge" with Keep, Merge, Ignore,
  Show rows (21.png, 22.png). Nothing after Join names G12 as not on the gauge list; the join
  screen's "1 no value" is the only place.

### Success path by keyboard (e6-keys-edges, keys only, screen-reader mode): reached

- Steps 1-95 matched the earlier walk (start screen, file load, Data, Add source, the join screen,
  the issue dialog, Edit join, a second Add source > File... > flows.csv, which replaces flows.csv in
  place: the header Undo reads "Undo replacing flows.csv", the network stays 12 nodes, 14 edges).
- Tab from the gauges.csv row: gauges.csv menu, "flows.csv 12 nodes, 14 edges" (pressed), "1 issue
  in flows.csv", flows.csv menu, Collapse Fields, Collapse flows.csv, Rows are, Add to edge fields,
  Source, Target, Direction, Expand gauges.csv, Add filter, Resize left panel, Canvas "Graph
  drawing", Analyze, Resize table, tab "Nodes", "With issues 11", Columns, Table options, Maximize
  table, Close table, "Key id", then out of the table to "From 2 files". No focus fell to the page
  body.
- Shift+Tab back to tab "Nodes", ArrowRight to "Edges", Tab to "With issues 1", Space checks it;
  Tab to "Key from", ArrowRight to "Key to". Browse mode reads the header row as "Key from Options
  for from Key to Issues in to Options for to number, joined km ..." and the row "G09 G12 4".
- On the "to" header the focused name is "Key to" and its description is empty (`--expect
  described=issue` failed): nothing spoken on focus says this column has an issue.
- Shift+F10 opens the header's menu: "1 unknown end", Add nodes (checked), Leave out, Ignore, Show
  rows, Hide, Hide others, Sort ascending, Sort descending (e6-keys-edges/103.png). Escape returns
  focus to "Key to"; ArrowDown goes to row header "G12" (105.png).
- In this walk the edge headers read "from" and "to" (the replaced flows.csv's own column names),
  where the pointer walk's read "Source" and "Target"; the mark is on the target end either way.

### Mismatches between the answer key and the screen

None new. The key's numbers hold: 12 gauges (11 and G12), 14 stretches, and 14 on the second file's
Sources row. As the key says, the repeated stretch can be read only on the join screen in this order;
flows.csv first gives 12 nodes and 15 edges with "1 repeated edge".

### Defects (crash, block, or a result that would spoil grading)

No crash and no block on any walk. The fix holds for B: the Target header carries the mark and G12 is
the tinted cell (e1-success/23.png). The earlier grading risks are unchanged (Replace gives the same
counts as a join; the repeat disappears after Join; the two orders give 14 and 15 edges).

Smaller, seen on this pass:

1. Keyboard: the end header's focused name does not say it has an issue ("Key to", empty
   description); only browse mode reads "Issues in to", and the fixes are reached only through
   Shift+F10 (e6-keys-edges/100.png, 102.png, 103.png).
2. Flows-first order: the "1 repeated edge" mark sits on the "from" header and tints only G03, the
   first end of the repeated stretch G03 -> G04, so the table reads as if G03 were the problem
   (e3-flows-first/21.png).
3. The Nodes table's "With issues 11" counts every gauge row, while the marks it shows are the
   station column's "1 value with padded spaces" (Willow Run) and the depth_cm column's G07 blank;
   the other rows show no tinted cell on screen. A participant asked "did anything not fit" may read
   11 there (e3-flows-first/23.png, 24.png; the same on the earlier build, x1-success/13.png).

## Second re-walk on build bccf8fe47f (every route, including the drop)

Build bccf8fe47f (`.study-builds/tier4-r1d2-bccf8fe47f`), 1440 x 900, start `empty`. Screenshots
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T61B/ (g1 to
g6). Every walk starts from the empty start screen and reaches the app by clicks, typing and keys
only. The data stayed the task's own on every walk: gauges.csv (G01-G11, Upper Falls, Mill Pond,
...) and flows.csv (15 rows, G09 -> G12 among them).

Of the routes the fix pass touched, the one that belongs to this task is the success path on to
Edges > With issues; the keyboard walk on to the Edges table's end header was walked with it. The
rest belong to T61 A, T65, T66, T67 and T68. The detour set is the one held from the earlier passes,
now with the drop walked on this build too.

| Walk | How | Result |
| ---- | --- | ------ |
| g1-success (pointer) | replay of e1-success | All 23 steps matched; reached |
| g2-menu-open (detour: main menu, Replace and Control+Z, Cancel and Undo, the join boxes, a separate graph, the reverse order) | replay of e2-menu-open | All 36 steps matched |
| g3-flows-first (detour: Replace, a canceled join, then flows.csv first and gauges.csv second, on to Edges > With issues) | replay of e3-flows-first | All 23 steps matched; reached (12 nodes, 15 edges) |
| g4-quick-actions (detour: Quick actions > Add data..., then Edges > With issues 1) | replay of e4-quick-actions | All 61 steps matched; reached |
| g5-drop (detour: flows.csv dropped on the open network; Enter, Tab, Escape, Space in the join boxes) | replay of d2-drop | All 10 steps matched; reached |
| g6-keys (keyboard only, screen-reader mode) | replay of e6-keys-edges; stopped at step 97, finished by hand | Reached |

### What the screens show

- Success path: the join screen reads "Join flows.csv -> gauges.csv", Edges, from = Id, to = Id,
  "14 edges added", "1 new node", "1 not in graph", "1 repeated key" (g1-success/05.png). After
  Join: Nodes 12, Edges 14, "From 2 files", the flows.csv row 12, 14 and issue chip 1
  (g1-success/13.png). Edges > "With issues 1": the warning glyph on the Target header, the one row
  G09 -> G12, 4 km, with G12 tinted (g1-success/23.png). The same after Quick actions > Add data...
  (g4-quick-actions/62.png) and after the drop (g5-drop/11.png: Nodes 12, Edges 14, both sources).
- Replace: 12 / 14 with only flows.csv in Sources and the notice "Replaced gauges.csv with
  flows.csv" (g2-menu-open/08.png), as the answer key says.
- Reverse order: 12 nodes, 15 edges, "1 repeated edge", both sources (g2-menu-open/36.png); the
  Edges "With issues 1" row is G03 -> G04 with its menu "1 repeated edge" Keep, Merge, Ignore, Show
  rows (g3-flows-first/22.png).
- Keyboard: step 97 went another way only because the "Replaced flows.csv with flows.csv" notice was
  still up, so the Tabs from the Sources row passed its "Undo" and "Dismiss" first (g6-keys/98.png);
  two more Tabs reached "Key id" and "From 2 files". Then Shift+Tab to tab "Nodes", ArrowRight to
  "Edges", Tab to "With issues 1", Space checks it, Tab on to "Key from", ArrowRight to "Key to".
  Browse mode reads the header row "Key from Options for from Key to Issues in to Options for to
  ..." and the row "G09 G12 4". Shift+F10 opens "1 unknown end" with Add nodes (checked), Leave out,
  Ignore, Show rows (g6-keys/104.png); Escape returns to "Key to", ArrowDown to row header "G12". No
  focus fell to the page body after the first key.

### Mismatches between the answer key and the screen

None. 12 gauges, 14 stretches and 14 on the second file's Sources row hold; the reverse order's 12
and 15 with "1 repeated edge" are that network's own counts.

### Defects (crash, block, or a result that would spoil grading)

None. Unchanged from the first re-walk on this build: the focused "Key to" header's description is
still empty (`--expect described=issue` failed again), so focus alone does not say the column has an
issue; browse mode reads "Issues in to" (g6-keys/101.png, 102.png).

## Re-walk on build a53beb7179 (every route of this task)

Build a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`), 1440 x 900, start `empty`. Screenshots are
under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T61B/ (m1 to m6). Every walk
starts from the empty start screen and reaches the app by clicks, typing and keys only. The data stayed the
task's own on every walk: gauges.csv (G01-G11, Upper Falls, Mill Pond, ...) and flows.csv (15 rows, G09 -> G12
among them).

Of the routes the fix pass touched, the one that belongs to this task is "T61B success path (Edges > With
issues)"; it is the success path below, which goes on to Edges > With issues. The rest belong to T61 A, T65, T66,
T67 and T68 and are walked by those pilots. The detour set is the one held from the earlier passes.

| Walk | How | Result |
| ---- | --- | ------ |
| m1-success (pointer, on to Edges > With issues) | replay of g1-success | All 23 steps matched; reached |
| m2-menu-open (detour: main menu, Replace and Control+Z, Cancel and Undo, Enter, Tab and Escape in the join boxes, a separate graph, the reverse order) | replay of g2-menu-open | All 36 steps matched |
| m3-flows-first (detour: Replace, a canceled join, then flows.csv first and gauges.csv second, on to Edges > With issues) | replay of g3-flows-first | All 23 steps matched; reached (12 nodes, 15 edges) |
| m4-quick-actions (detour: Quick actions > Add data..., then Edges > With issues 1) | replay of g4-quick-actions | All 61 steps matched; reached |
| m5-drop (detour: flows.csv dropped on the open network; Enter, Tab, Escape, Space in the join boxes) | replay of g5-drop | All 10 steps matched; reached |
| m6-keys (keyboard only, screen-reader mode, on to the Edges table's end header) | replay of g6-keys | All 104 steps matched; reached |

### What the screens show

- Success path: the join screen reads "Join flows.csv -> gauges.csv", Edges, Source from = Id, Target to = Id,
  "14 edges added", "1 new node", "1 not in graph", "1 repeated key" with its warning glyph; the repeat's menu
  offers Keep first, Keep both, Ignore (m1-success/05.png, 10.png). After Join: Nodes 12, Edges 14, "From 2
  files", the flows.csv row 12, 14 and issue chip 1 (m1-success/13.png). The chip opens "Issues in flows.csv":
  edges, 1 unknown end, Add nodes, Leave out, Ignore (19.png). Edges > "With issues 1": the warning glyph on the
  Target header, the one row G09 -> G12, 4 km, with G12 tinted (23.png). The same after Quick actions > Add
  data... (m4-quick-actions/62.png) and after the drop (m5-drop/11.png).
- Replace: 12 / 14 with only flows.csv in Sources and the notice "Replaced gauges.csv with flows.csv"
  (m2-menu-open/08.png), as the answer key says.
- Separate graph: a second project "flows", 12 nodes, 15 edges, "1 repeated edge", still showing "Join
  canceled" with Undo (m2-menu-open/32.png).
- Reverse order: 12 nodes, 15 edges, "1 repeated edge", both sources (m2-menu-open/37.png,
  m3-flows-first/24.png); Edges "With issues 1" is G03 -> G04 with the mark on "from" and G03 alone tinted
  (m3-flows-first/21.png), the backlog item of dry run pass 5.
- Keyboard: the whole route matched. Shift+F10 on the "to" header opens "1 unknown end" with Add nodes
  (checked), Leave out, Ignore, Show rows (m6-keys/104.png); Escape returns to "Key to", ArrowDown to row header
  "G12" (105.png). No focus fell to the page body. The focused "Key to" header's description is still empty
  (`--expect described=issue` failed as on the earlier build, m6-keys/103.png); browse mode reads "Issues in to"
  (102.png).

### Mismatches between the answer key and the screen

None. 12 gauges (11 and G12), 14 stretches and 14 on the second file's Sources row hold; the reverse order's 12
and 15 with "1 repeated edge" are that network's own counts.

### Defects (crash, block, or a result that would spoil grading)

None. Unchanged from the earlier builds and not grading risks: the focused end header does not say it has an
issue (m6-keys/103.png); "Open as a separate graph" shows "Join canceled" (m2-menu-open/32.png); in the reverse
order the repeated edge's mark sits on "from" only (m3-flows-first/21.png).
