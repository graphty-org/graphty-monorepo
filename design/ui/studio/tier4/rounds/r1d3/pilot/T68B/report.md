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
- T65A, T65B, T66A/T66B, T64A/T64B and T68A routes in the touched list: they belong to other tasks.

## Second targeted re-walk (same build a53beb7179)

Each route replayed from the newest walk of it on this build, one browser at a time.

| Route | Session | Result |
| --- | --- | --- |
| Success path by pointer | v01-success | 16 of 16 steps matched; ended |
| Detours: Control+S, Save local copy, Image and Project tabs, turning flows.csv back on, the gauges.csv row's Export..., the Graph panel's menu | v02-detours | 15 of 15 matched; ended |
| Detours, second set | v03-detours-2 | 18 of 24 matched, no divergence; the run was stopped before its end and the session ended by hand |

Success path: the start reads "11 of 12 nodes, 13 of 14 edges" with the Data source card on Hide
(gauges.csv ticked, chip "11 of 12") (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v01-success/01.png). Export opens on Data; Format GraphML;
Scope "All 12 nodes, 14 edges" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v01-success/06.png); Export shows "Styles lost in GraphML" with
Save anyway (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v01-success/09.png); Save anyway shows "Exported gauges_graph.graphml"
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v01-success/10.png). The file holds 12 nodes and 14 edges
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v01-success/downloads/gauges_graph.graphml). Matches the answer key; the data stayed the task's own.

Detours: Control+S with "gauges.graphml" saves the project in the browser only
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v02-detours/03.png). Turning flows.csv back on, then GraphML, writes 12 nodes and 14 edges at once.
The gauges.csv row's Export... opens on "gauges.csv 11 of 12 nodes, 0 of 14 edg..." with chips "11 of 12"
and "0 of 14" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T68B/v02-detours/13.png) and writes 11 nodes, 0 edges with no Save anyway step, as the answer
key records.

No new mismatch or defect. The carried defects listed above are unchanged.

Not walked in this pass: detours-3 and the keyboard route (both matched in full earlier on this build,
above), and the touched routes of other tasks (T65A path, order, keys, redo; T65B path, order, keys,
Which nodes; T66A/T66B Data source card; T68A and T68B starts; T64A path and table role, T64B table role
and Analyze weight). The run had to stop before reaching them. Another task's pilot replayed all of them
on this build with every route matching to the end (tmp/design-studio/tier4/r1d3/pilot/T62A/r-routes.status).
