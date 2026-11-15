# T78 B pilot on build f0a9a014cb (targeted re-walk)

The study build is f0a9a014cb (`.study-builds/tier5-r1d1-f0a9a014cb`). Every walk starts from the
task's real start (`rounds/tier-5/setups/gauges-clean.txt`: gauges.csv joined with flows.csv,
station as the label, the node table open). Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T78B/<walk>/ (below,
`<walk>/NN.png`). Walks of an older build that sat in the same folder were moved, unchanged, to
`old-797a4f6b/` beside them.

This pass walks the pointer success path and the routes the last fixes touched that belong to
T78 B: the success path, detour 1 and detour 3 (the tenth route in the pass's list). The keyboard
walk was walked again too. The data stayed the task's own on every walk: 11 nodes and 13 edges at
the start and the end (data.json of each walk); the only filter is the one detour 1 builds on
purpose (10 of 13 edges).

## Result

Reached, by pointer and by keyboard: 7 of 11 gauges in orange (G02, G03, G04, G05, G07, G08, G11),
as the answer key says. No crash, no script error, nothing that blocks the task or spoils its
grade.

## Walks

### success -- the pointer success path (also the tenth touched route)

Replayed the previous pass's 18 steps; every check point matched. + > Layer; Which nodes; type
"degree"; Enter; 2; Enter; Advanced; Edges where ...; Edge value...; `km`; the "km to" box, Ctrl+A,
2.9, Enter; Done; Add to node fill; FF8C00, Enter.

- Before Done: 7 of 11, "Degree min 2 Edges", Advanced's right "Edges: km max 2.9" (success/10.png).
- After the fill: key "Color: Layer 1, 7 of 11 nodes"; Layer 1's row 7; Which nodes 7 of 11
  (success/16.png).
- Field keys, km to box: Enter takes the value; Tab keeps it (success/11.png); Escape keeps the
  typed 2.5 and closes Advanced (success/12.png), as decided.md settles. Hex box: a new value then
  Escape puts back FF8C00; Tab keeps it (success/17.png to 19.png).

### detour-1 -- the Data place's filter on the stretches (also the tenth touched route)

Replayed the previous pass's 11 steps; every check point matched. Data > Filters + > Edges >
Value... > km > km to 2.9: "km max 2.9 -- Filters 10 of 13", top bar "11 of 11 nodes, 10 of 13
edges" (detour-1/09.png). Done; Graph; + > Layer; Which nodes; degree; 2; Done; Fill FF8C00: seven
orange, key "7 of 11 nodes" (detour-1/12.png). The answer key's "also success": an equal count with
the three long stretches hidden from every reader.

### detour-3 -- coloring the walkable stretches first, then the gauges (also the tenth touched route)

Replayed the previous pass's 8 steps; every check point matched. Which edges km max 2.9, 10 of 13
(detour-3/04.png); Line color FF8C00; Edit nodes; Which nodes Degree min 2: 9 of 11; Advanced
"Edges where ..." left empty; Done; Fill FF8C00: nine orange gauges joined by ten orange stretches,
key "9 of 11 nodes" and "Edge color 10 of 13 edges" (detour-3/09.png). The near miss, unchanged from
earlier passes: the layer's own edge selection does not feed the node step's Degree, and nothing on
screen says so. A participant would answer 9.

### keyboard -- the success path by keys only (started `--keys --sr`)

The replay of the first round's keyboard route stopped at step 12 because the screen changed for the
better: adding a layer no longer switches the open node table to Matches only with a Group column
(keyboard/13.png). Carried on by hand from there.

- Enter on the name: treeitem "Layer 1, node and edge layer, 11 nodes, 13 edges".
- 18 Tabs to treeitem "Which nodes, 11 of 11 nodes" (Graph settings, Resize left panel, Canvas
  "Graph drawing", Analyze, Resize table, tab Nodes, With issues 11, Columns, Table options,
  Maximize table, Close table, column header "date installed", Select what it paints, Layer actions,
  Style, Node, Style nodes).
- Enter: combobox "Find attributes, results", said "Editing Which nodes, Layer 1"; degree (option
  Degree highlighted), Enter: textbox "Degree from, number"; 2, Enter: "9 of 11 nodes" said twice
  (keyboard/39.png).
- Tab "Degree to"; Tab "Advanced" collapsed; Enter expanded; Tab radio "All edges"; ArrowRight:
  button "Edge value: none"; Enter: combobox "Find edge attributes"; km (option "km, 1.6 to 3.6"),
  Enter: "km from"; Tab "km to"; Ctrl+A, 2.9, Enter: "7 of 11 nodes" said twice (keyboard/49.png).
- Tab from "km to": button "Local only" in the status bar, then Main menu, Project, Undo, Redo
  (disabled), Graph, the preview canvas, the inspector's controls, Resize inspector, and only then
  Group colors, Table of matches, Clear, Cancel, Done: 24 Tabs from the last field to Done.
- Enter on Done: treeitem "Which nodes, 7 of 11 nodes", said "Done, 7 of 11".
- Tab x5 to "Add to node fill", Enter: textbox "Node color, not set, drawn #6366F1 indigo", said
  "Node color added: pick a value"; FF8C00, Enter: "Node color now dark orange, on 7 nodes"
  (keyboard/83.png).
- Edit Which nodes, Enter: treeitem "Degree min 2, Edges: km max 2.9, 7 of 11 nodes so far";
  Escape: closed as Done, focus back to Edit Which nodes, said "Done, 7 of 11" (keyboard/91.png).
- Focus never fell to the page body.

## Mismatches with the answer key

None. The answer key's row "Degree min 3 Edges" is written for A; B reads "Degree min 2 Edges" and
"Edges: km max 2.9", as expected.

## Defects

Nothing new that crashes, blocks or spoils the grade. Still standing from earlier passes:

1. Tab from the workspace's last field goes to the status bar; Done is 24 Tabs away, after the
   inspector (keyboard/49.png onward).
2. The near miss on detour 3: a layer's Which edges does not narrow its node step's Degree, with
   nothing said, and the drawing seems to agree with 9 (detour-3/09.png).
3. Each count change is announced twice ("9 of 11 nodes", "7 of 11 nodes"; keyboard steps after
   39.png and 49.png).
