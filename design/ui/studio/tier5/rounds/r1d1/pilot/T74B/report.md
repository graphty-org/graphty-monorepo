# T74 B pilot -- targeted re-pilot on build f0a9a014cb

Build: f0a9a014cb (served from `.study-builds/tier5-r1d1-f0a9a014cb`). Start: setup `gauges-clean.txt`
(the gauges project, 11 gauges, 13 routes, no layer of the participant's own). Every walk started from
that start and was replayed from the newest earlier walk of the same route; every step of every walk
matched its earlier screen, and the new screenshots were looked at. The data stayed the gauges' own
throughout (11 nodes, 13 edges, the same stations).

Walks of the previous build 797a4f6b47 that sat in the same folder were moved to
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/old-797a4f6b47`.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/success (15 steps).

1. + > Layer; Which nodes; type "between"; Enter: Betweenness: Bridging, By value, 11 of 11 (05.png).
2. The mode box (clicked at 1040,190); By position; type 3; Enter: "Betweenness: Bridging top 3",
   3 of 11; the matches table lists G02 Mill Pond, G03 Cedar Bend, G04 Fox Creek (09.png).
3. Done; Fill +; type FF8C00; Enter: the three gauges drawn orange, the others keep their color, key
   card "Color: Layer 1, 3 of 11 nodes" (12.png).
4. Field checks: in the hex box Ctrl+A, 00FF00, Escape puts FF8C00 back (13.png); Tab moves on
   (14.png); reopening Which nodes and Escape leaves it at 3 of 11 (16.png).

Result: reached, by the answer key's route.

## Touched routes that belong to this task

- touched-7 (T74 B success path) and touched-22 (T74 B success path: Betweenness By position 3): the
  pointer success path above, each replayed in its own session, all 15 steps matched.
  Folders: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/touched-7,
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/touched-22
- touched-17 (T74 B detour-1: Analyze's Betweenness layer narrowed to top 3): detour-1 below, replayed
  in its own session, all 12 steps matched.
  Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/touched-17

Every other route on the touched list belongs to another task.

## Detours

- detour-1, Analyze first (12 steps): Analyze > Betweenness > Run makes a "Betweenness" layer that colors
  every gauge; its Which nodes step By position 3 gives "Betweenness top 3", 3 of 11, the same three
  gauges (09.png); Done; "Stop varying node color by data"; FF8C00; Enter: the three drawn orange, key
  card "Color: Betweenness, 3 of 11 nodes" (13.png). Reaches success.
  Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/detour-1
- detour-2, the prompt's words in the attribute search (8 steps): "routes" and "pass through" find
  nothing (02.png, 03.png); "path" + Enter takes "Shortest path: On the route", which wants a value and
  needs no reference here (06.png); Advanced; "central" in the value list finds nothing (08.png);
  Escape, Cancel (09.png). After Cancel the new Layer 1 stays in the list, "All nodes", 11, with nothing
  styled; it changes no color. A participant then starts again with "between" as on the success path.
  Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/detour-2
- detour-3, the graph search and the canvas menu (5 steps): "most routes" in Find nodes, edges, values
  says no match and suggests typing a rule (02.png, 03.png); a right-click on Cedar Bend opens the
  node menu (Neighborhood, Path between..., Frame selection, New layer from selection, Add note,
  Motion off), with no ranking (05.png); Escape closes it (06.png). Nothing on this route answers the
  question; nothing is changed.
  Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/detour-3

## Keyboard (screen-reader mode, keys only)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T74B/keyboard (63 steps;
reached the end).

Focus order and names: Main menu; Project: gauges; Undo changing a column's role; Redo (disabled);
Graph; Graph gauges.csv; Find; Add a layer or a folder > Enter > menu item "Layer" > Enter > "Layer
name" box (Layer 1) > Enter > tree item "Layer 1, node and edge layer, 11 nodes, 13 edges". Tab then
crosses Graph settings, Resize left panel, Graph drawing, Analyze, Resize table, the table's Nodes tab,
With issues 11, Columns, Table options, Maximize table, Close table and "date installed" before the
layer's panel: Select what it paints, Layer actions, Style, Node, Style nodes, "Which nodes, 11 of 11
nodes", Edit Which nodes (21 Tabs from the new layer to Edit Which nodes). Enter on Edit Which nodes
focuses "Find attributes, results"; "between" highlights Betweenness; Enter focuses "Betweenness from,
number" and announces "Betweenness finished: Cedar Bend ranks first, 25". Four Shift+Tabs reach
"Betweenness test" (value "By value"); Enter, ArrowDown, Enter picks By position and focuses
"Betweenness: how many"; 3, Enter announces "3 of 11 nodes" twice. Escape goes to the step "Betweenness:
Bridging top 3, 3 of 11 nodes so far"; a second Escape closes the workspace ("Done, 3 of 11") with focus
on Edit Which nodes. Tab to "Add to node fill", Enter focuses "Node color, not set, drawn #6366F1
indigo"; FF8C00, Enter: "Node color now dark orange, on 3 nodes"; Tab goes to "Node color by
attribute" (64.png: three orange, the rest unchanged). Focus never fell to the page body.

## Mismatches with the answer key

None. As the key already says, the mode select is named "Betweenness test", not by what it shows, so a
pointer opens it by clicking the box; the third orange gauge sits partly under the canvas toolbar
(success 12.png).

## Defects

None that crashes, blocks the task or spoils its grading. Seen again and already recorded: "3 of 11
nodes" announced twice on Enter in the "how many" box (keyboard, step 49); and Cancel on a new layer's
Which nodes leaves the empty layer in the list (detour-2 09.png), which paints nothing.
