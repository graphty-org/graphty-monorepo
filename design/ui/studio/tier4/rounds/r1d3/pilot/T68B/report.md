# Pilot: T68 B (a GraphML file of the whole river network), targeted re-walk after the fix pass

Build: 79ed770292 (frozen, .study-builds/tier4-r1d3-79ed770292). Screenshots, step files and saved files
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B (not in git);
every session below is a folder there.

Every route was replayed, each in its own session, from its newest walk on the build before this one
(the x01 to x21 walks in the same folder). A route that matched its earlier walk at every check point
shows what that walk showed; the three that differed were looked at and carried on by hand.

## Routes walked

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | z01-success | 16 of 16 matched; ended |
| Detours: Control+S, Save local copy, the Image and Project tabs, flows.csv back on, the gauges.csv row's Export..., the Graph panel's menu | z02-detours | 15 of 15 matched; ended |
| Detours, second set (adds Control+S then Tab and Escape, the Quick actions search for "graphml" and "export") | z03-detours-2 | 24 of 24 matched; ended |
| Detours, third set (adds the table options' Export... and the flows.csv row's Export...) | z04-detours-3 | 48 of 48 matched; ended |
| Keyboard and screen reader, success path | z05-keyboard | 94 of 94 matched; ended |
| T65A success path | z06-T65A-path | 24 of 24 matched; ended |
| T65A success path, the other card order | z07-T65A-order | 11 of 11 matched; ended |
| T65A keyboard walk (the card's count; the live message "4 nodes selected") | z08-T65A-keys | 127 of 127 matched; ended |
| T65A redo route (undo and redo of the keep card's edit) | z09-T65A-redo | 28 of 28 matched; ended |
| T65B success path | z10-T65B-path, z10b-T65B-path | 8 of 15 matched, then the card's new count; finished by hand; ended |
| T65B success path, the other card order (Undo and Redo of the depth edit) | z11-T65B-order | 7 of 7 matched; ended |
| T65B keyboard and screen-reader walk (the card's spoken count) | z12-T65B-keys-sr | 11 of 12 matched; the last step reads the new count; ended |
| T65B detour: a style layer's Which nodes | z13-T65B-which-nodes | 7 of 7 matched; ended |
| T66A success path: the Data source card's count | z14-T66A-sourcecard | 15 of 15 matched; ended |
| T66B success path: the Data source card's count | z15-T66B-sourcecard | 17 of 17 matched; ended |
| T68A start: the narrowed Hide card's count | z16-T68A-start | 4 of 4 matched; ended |
| T68B start: the narrowed Hide card's count | z17-T68B-start, z17b-T68B-start | 1 of 4, then 4 of 4 on a second load; ended |
| T64A success path | z18-T64A-path | 21 of 21 matched; ended |
| T64A table role re-run | z19-T64A-table-role | 31 of 31 matched; ended |
| T64B table role re-run | z20-T64B-table-role | 14 of 14 matched; ended |
| T64B Analyze's weight | z21-T64B-analyze-weight | 7 of 7 matched; ended |

## Start

"11 of 12 nodes, 13 of 14 edges"; one Data source card on Hide, gauges.csv ticked, flows.csv not, chip
"11 of 12"; the Edges table reads "13 of 14 edges" with the routes drawn. Matches the answer key.
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z01-success/01.png
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z17-T68B-start/03.png

The first T68B start replay stopped at a click on the canvas: at 697,274 it took node G03 this time
where the earlier walk found empty canvas. The force layout is unseeded, so a node's place differs
between loads; the counts, the card and the Edges table matched. A second load matched all four steps
(z17b-T68B-start). Not a defect.

## Success path by pointer -- reached (z01-success)

Main menu > Export... opens on Data, Format CSV. Format > GraphML; Scope lists "All 12 nodes, 14 edges"
(chosen), "Shown 11 of 12 nodes, 13 of 14 edges", "gauges.csv 11 of 12 nodes, 0 of 14 edges", "flows.csv
12 nodes, 14 edges", and the line under Format reads "Lost in GraphML: node visible not written"
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z01-success/06.png).
Export shows "Styles lost in GraphML" with Save anyway; Save anyway shows "Exported
gauges_graph.graphml"
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z01-success/10.png).
The file holds 12 nodes and 14 edges
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z01-success/downloads/gauges_graph.graphml).
The filter card and the gauges data stayed the task's own the whole way.

## Detours (z02-detours, z03-detours-2, z04-detours-3)

- Control+S with a .graphml name saves the project in the browser, no file; Save local copy... writes
  gauges.graphml.graphty.json. Not success, as graded.
- Turning flows.csv back on: 12 of 12, Control+E > GraphML exports 12 nodes and 14 edges; T66's
  narrowing is undone.
- The gauges.csv row's Export... opens on scope "gauges.csv 11 of 12 nodes, 0 of 14 edg...", chips
  "11 of 12" and "0 of 14"
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z02-detours/13.png),
  and Export writes 11 nodes and 0 edges at once with no Save anyway step. The scope and chips say what
  is left out, as the answer key records.
- After that, Control+E opens on "All 12 nodes, 14 edges" again; the table options' Export... and the
  flows.csv row's Export... write 12 nodes and 14 edges after Save anyway
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z04-detours-3/downloads/).
- Quick actions finds Export... (Ctrl+E) and Save local copy... for "export".

## Keyboard (z05-keyboard) -- reached

Tab reaches Main menu, Enter opens it, arrows reach Export..., Enter opens the dialog on Close. Format is
a combobox; Enter, arrows and Enter pick GraphML. Scope is announced "combobox Scope value All 12 nodes,
14 edges". Export, then Shift+Tab back to Save anyway and Enter writes gauges_graph.graphml (12 nodes, 14
edges,
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/downloads/gauges_graph.graphml)
and announces "Exported gauges_graph.graphml".

## The routes the fixes touched

- T65B success path: the second card (installed before 2005, on Select) now counts within what the
  first card's Hide leaves: "3 of 5", where the build before read "5 of 12"; 3 nodes are selected and
  the inspector says so
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z10b-T65B-path/10.png).
  Turning the Hide card off makes it "5 of 12" with 5 selected (13.png); on again, "3 of 5" (14.png);
  Undo and Redo of that toggle restore each state with a notice (15.png, 16.png).
- T65B keyboard and screen reader: the card is now read "Node 3 of 5"
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z12-T65B-keys-sr/13.png).
- T65A: every route matched, including the live message "4 nodes selected" and the cards' counts.
- T66A/T66B Data source card counts, T68A start (12 of 13 nodes, 17 of 18 edges,
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z16-T68A-start/01.png),
  T64A/T64B table role re-run and Analyze's weight: unchanged, every check point matched.

## Mismatches between the answer key and the screen

None.

## Defects

Nothing crashed, blocked the task, or would spoil its grading. Carried defects still on screen:

1. Enter on Export shows "Styles lost in GraphML" and drops focus to the page body; the next Tab goes to
   Main menu behind the dialog (keyboard).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/53.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/88.png
2. Tab and Shift+Tab do nothing while the Format or Scope list is open; decided.md says Tab with nothing
   typed closes the list (keyboard).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/43.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/44.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/83.png
3. The dialog's kind list (Image, Data, ...) is announced as gridcells and rows, not tabs (keyboard).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z05-keyboard/13.png
4. The gauges.csv row's Export... writes 11 nodes and 0 edges with no Save anyway step, while every other
   door adds one; the scope line does say "0 of 14 edges" (detours).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z02-detours/14.png
5. On the touched T65B route, the before-a-date card's summary and its Remove and Apply names read
   "installed is at most 1104537599999" (a raw time number, not 2005).
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/z10b-T65B-path/14.png

## Skipped

Nothing.
