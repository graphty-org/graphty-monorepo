# Pilot: T68 B (a GraphML file of the whole river network), targeted re-walk after the fix pass

Build: a53beb7179 (frozen, .study-builds/tier4-r1d3-a53beb7179). Screenshots, step files and saved files
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B (not in git).

Each route was replayed from the newest earlier walk of the same route (the T68B r5 and r6 walks under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B). Every one matched its
earlier walk at every check point to the end, so nothing had to be carried on by hand.

## Routes walked

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | success | 16 of 16 steps matched; ended |
| T68B start: the narrowed Hide card's count | start | 3 of 3 matched; ended |
| Detours: Control+S, Save local copy, the Image and Project tabs, turning flows.csv back on, the source row's Export..., the table options' Export..., Quick actions | detours-3 | 48 of 48 matched; ended |
| Keyboard and screen reader, success path | keyboard | 94 of 94 matched; ended |
| Detours (Control+S; Image tab first) | detours, detours-2 | matched on this build in the earlier replay (rewalk.json); not walked again |

## Start (start)

"11 of 12 nodes, 13 of 14 edges"; one Data source card on Hide, gauges.csv ticked, flows.csv not, chip
"11 of 12"; the Edges table reads "13 of 14 edges" with the routes drawn. Matches the answer key.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/start/02.png

## Success path by pointer -- reached (success)

Main menu > Export... opens on Data, Format CSV. Format > GraphML; Scope offers "All 12 nodes, 14 edges"
(chosen), "Shown 11 of 12 nodes, 13 of 14 edges", "gauges.csv 11 of 12 nodes, 0 of 14 edges", "flows.csv
12 nodes, 14 edges" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/success/06.png). Export shows "Styles lost in GraphML" with Save anyway
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/success/09.png); Save anyway writes gauges_graph.graphml and shows "Exported gauges_graph.graphml"
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/success/10.png). The file holds 12 nodes and 14 edges
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/success/downloads/gauges_graph.graphml). The filter card and the gauges data stayed the task's own
the whole way.

## Detours (detours-3)

- Control+S with a .graphml name saves the project in the browser, no file; Save local copy... writes
  gauges.graphml.graphty.json with no notice (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/detours-3/03.png, 04.png). Not success, as graded.
- Turning flows.csv back on: 12 of 12, Control+E > GraphML exports 12 nodes and 14 edges at once
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/detours-3/11.png); T66's narrowing is undone.
- The gauges.csv row's Export... opens on scope "gauges.csv 11 of 12 nodes, 0 of 14 edg...", chips
  "11 of 12" and "0 of 14", and Export writes 11 nodes and 0 edges at once, with no Save anyway step
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/detours-3/13.png, 14.png). The scope and chips say what is left out, as the answer key records.
- After that, Control+E opens on "All 12 nodes, 14 edges" again and Save anyway writes 12 nodes and 14
  edges (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/detours-3/41.png, 42.png): the source row's scope no longer sticks.
- The table options' Export... and the flows.csv row's Export... both write 12 nodes and 14 edges after
  Save anyway (downloads (3) and (6)).

## Keyboard (keyboard) -- reached

Tab reaches Main menu, Enter opens it, arrows reach Export..., Enter opens the dialog on Close. Format is
a combobox; Enter, arrows and Enter pick GraphML. Scope is announced "combobox Scope value All 12 nodes,
14 edges". Export, then Shift+Tab back to Save anyway and Enter writes gauges_graph.graphml (12 nodes, 14
edges, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/downloads/gauges_graph.graphml) and announces "Exported gauges_graph.graphml".

## Mismatches between the answer key and the screen

None.

## Defects

Nothing crashed, blocked the task, or would spoil its grading. Carried defects still on screen (each
already a backlog row):

1. Enter on Export shows "Styles lost in GraphML" and drops focus to the page body; the next Tab goes to
   Main menu behind the dialog (keyboard). /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/53.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/88.png
2. Tab and Shift+Tab do nothing while the Format or Scope list is open; decided.md says Tab with nothing
   typed closes the list (keyboard). /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/43.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/44.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/83.png
3. The dialog's kind list (Image, Data, ...) is announced as gridcells and rows, not tabs (keyboard).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/keyboard/13.png
4. The gauges.csv row's Export... writes 11 nodes and 0 edges with no Save anyway step, while every other
   door adds one; the scope line does say "0 of 14 edges" (detours-3). /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/detours-3/14.png

## Skipped

- success-2, success-3, keyboard-2 and keyboard-3: repeat walks of the same routes as success and
  keyboard, which matched in full.
- T65A, T65B, T66A/T66B, T64A/T64B and T68A routes in the touched list: walked in the full re-walk below.

## Full targeted re-walk (same build a53beb7179)

Every route of this task and every route the fix pass touched was replayed from its newest walk on
this build, each in its own session, under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x01 to x21. The earlier passes above left the touched
routes unwalked; all are walked here.

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | x01-success | 16 of 16 matched; ended |
| Detours: Control+S, Save local copy, Image and Project tabs, flows.csv back on, the gauges.csv row's Export..., the Graph panel's menu | x02-detours | 15 of 15 matched; ended |
| Detours, second set (adds Control+S then Tab and Escape, the Quick actions search for "graphml" and "export") | x03-detours-2 | 24 of 24 matched; ended |
| Detours, third set (adds the table options' Export... and the flows.csv row's Export...) | x04-detours-3 | 48 of 48 matched; ended |
| Keyboard and screen reader, success path | x05-keyboard | 94 of 94 matched; ended |
| T65A success path | x06-T65A-path | 24 of 24 matched; ended |
| T65A success path, the other card order | x07-T65A-order | 11 of 11 matched; ended |
| T65A keyboard walk (the chip's spoken count) | x08-T65A-keys | 127 of 127 matched; ended |
| T65A redo route (undo and redo of the keep card's edit) | x09-T65A-redo | 28 of 28 matched; ended |
| T65B success path | x10-T65B-path | 15 of 15 matched; ended |
| T65B success path, the other card order | x11-T65B-order | 7 of 7 matched; ended |
| T65B keyboard and screen-reader walk | x12-T65B-keys-sr | 12 of 12 matched; ended |
| T65B detour: a style layer's Which nodes | x13-T65B-which-nodes | 7 of 7 matched; ended |
| T66A success path: the Data source card's count | x14-T66A-sourcecard | 15 of 15 matched; ended |
| T66B success path: the Data source card's count | x15-T66B-sourcecard | 17 of 17 matched; ended |
| T68A start: the narrowed Hide card's count | x16-T68A-start | 4 of 4 matched; ended |
| T68B start: the narrowed Hide card's count | x17-T68B-start | 1 of 3 matched, then finished by hand; ended |
| T64A success path | x18-T64A-path | 21 of 21 matched; ended |
| T64A table role re-run | x19-T64A-table-role | 31 of 31 matched; ended |
| T64B table role re-run | x20-T64B-table-role | 14 of 14 matched; ended |
| T64B Analyze's weight | x21-T64B-analyze-weight | 7 of 7 matched; ended |

Success path: the start reads "11 of 12 nodes, 13 of 14 edges", Data source card on Hide with
gauges.csv ticked and chip "11 of 12" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x01-success/01.png). Export opens on Data; Format GraphML;
Scope lists "All 12 nodes, 14 edges" (chosen), "Shown 11 of 12 nodes, 13 of 14 edges", "gauges.csv 11
of 12 nodes, 0 of 14 edges", "flows.csv 12 nodes, 14 edges" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x01-success/06.png). Save anyway
shows "Exported gauges_graph.graphml" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x01-success/10.png); the file holds 12 nodes and 14 edges
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x01-success/downloads/gauges_graph.graphml). The keyboard walk writes the same 12-node, 14-edge
file (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x05-keyboard/downloads/gauges_graph.graphml). The data stayed the task's own throughout.

Detours: the gauges.csv row's Export... again writes 11 nodes and 0 edges with no Save anyway step
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x02-detours/13.png); every other door writes 12 nodes and 14 edges
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x04-detours-3/downloads/). Quick actions finds Export... (Ctrl+E) and Save local copy... for
"export" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x03-detours-2/24.png).

T68B start divergence: the click at 697,274 that took node G03 in the earlier walk landed on empty
canvas, because the drawing lay about 35 pixels further left this time (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x17-T68B-start/03.png).
The force layout is unseeded by design, so a node's place differs between loads; the counts, the card
and the Edges table ("13 of 14 edges") matched. Clicking G03 where it now is (662,274) selected it and
Escape cleared the selection (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x17-T68B-start/04.png, 05.png). Not a defect.

No new mismatch or defect on any route. The carried defects listed above are unchanged (the keyboard
walk matched the earlier one step for step, including focus dropping to the page body after Export,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x05-keyboard/53.png, and Shift+Tab leaving the open Scope list open, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x05-keyboard/44.png).
On the touched T65B route, the before-a-date card still reads "installed is at most 1104537599999"
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/x10-T65B-path/14.png); that belongs to T65B and is already in its reports.

Nothing was skipped in this pass.
