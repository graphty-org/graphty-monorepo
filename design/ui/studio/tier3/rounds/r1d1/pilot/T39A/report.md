# Pilot: T39 A (one color for the whole drawing, Les Miserables)

Build: 6de5f95d12 (`.study-builds/tier3-r1d1-6de5f95d12`). Every session started empty, from the
start page, and the data stayed the Les Miserables sample (77 nodes, 254 edges) throughout.
Screenshot paths are relative to this folder.

Result: reached on all three walks. The success path matches the answer key step for step (5 key
steps). The keyboard walk reached the end; focus never fell to the page body after the start.

None of the routes the latest fixes touched (the T50 projects, Control+O > Replace, the table
after a community run) is a route of this task: a participant on T39A opens a sample and never
opens a file or runs an analysis. So this pass walks the task's own three ways, with the detour
set held fixed from the round 1 pilot.

## 1. Success path by pointer (`i-pointer/`)

| Step | Action | What happened | Screenshot |
| ---- | ------ | ------------- | ---------- |
| 1 | Samples (the start page's button) | Sample library; card "Who holds the novel together" first | i-pointer/03.png |
| 2 | The card | Graph opens, inspector on Values; 77 nodes, 254 edges | i-pointer/04.png |
| 3 | Everything in the layer list | Everything opens on Style, Node; Color 6366F1 | i-pointer/05.png |
| 4 | Click the color box | "Node color, set here, indigo"; value selected | i-pointer/06.png |
| 5 | Type `darkgreen`, Enter | Box reads 006400, all 77 nodes dark green, ties gray, drawing stays put | i-pointer/07.png |

Field keys in the color box:

- Escape after typing `ff0000`: "Edit discarded; this stays 006400." on screen, focus stays in the
  box (as settled). i-pointer/08.png
- `red` then Tab: commits FF0000 and focus moves to "Node color by attribute". i-pointer/09.png
- Control+Z: back to 006400, notice "Undid changing node color on Everything." i-pointer/10.png

`styles.json` holds `#006400` for the Everything layer's node color; the edge color is unchanged.

## 2. Detours (`i-detours/`)

All in one session, from an empty start.

- **Sample from the main menu**: Main menu > Open sample > Les Miserables opens the same graph.
  i-detours/02.png to 04.png
- **Graph inspector's Style tab (the likely false finish)**: only Canvas (Background color,
  Lighting, Outline width) and Labels. `darkgreen` in Background color paints the canvas and leaves
  the nodes indigo. Control+Z undoes it with "Undid changing settings." i-detours/05.png to 08.png
- **Graph settings**: shows the same Graph Style tab. i-detours/09.png
- **Right-click on empty canvas**: Fit, Frame selection, New layer from selection, Select all
  (Ctrl+A), Clear selection. Select all selects 77 nodes and 254 edges. i-detours/10.png, 11.png
- **Selection's Fill "+" and `darkgreen`**: makes the layer "77 nodes, 254 edges", key "Color: 77
  nodes, 254 edges"; the whole drawing jumps about 140 px right as the key appears (defect 1).
  Undo restores it. i-detours/12.png to 15.png
- **A node's inspector, Why this look > Everything**: clicking Valjean, Style, then "Open layer
  Everything" opens Everything with focus in the color box and its value selected, as the answer
  key says. i-detours/17.png to 19.png
- **Edge tab first**: Line Color `darkgreen` Enter paints every tie green. "Remove edge color"
  removes it; the Width line slides up under the pointer, so a second click there would remove
  Width (defect 3). Two Undos restore A9A9A9. i-detours/20.png to 23.png
- **New layer with no condition**: "+" > Layer > Fill "+" > `dark green` > Enter: 006400, all 77
  nodes dark green, key "Color: Layer 1", and the drawing stays put. i-detours/25.png to 28.png
- **Find box**: `all` gives 'No match for "all". To select by a value, type a rule such as name ==
  'Napoleon''. Enter keeps the box; Escape, Escape leaves it with focus on the canvas (as
  settled). i-detours/30.png to 33.png
- **Control+A on the canvas**: selects all 77 nodes and 254 edges (as settled). i-detours/34.png
- **New layer from selection**: makes "77 nodes, 254 edges" at once and opens it on Style, Node.
  Fill "+" and `darkgreen`: the drawing jumps about 140 px right again as the key appears.
  i-detours/35.png to 38.png
- **Fill "+" in one node's inspector**: Valjean, `orange` Enter makes a one-node layer "Valjean"
  ("Picked by hand: 1 node", notice "Made layer Valjean for 1 node", key "Color: Valjean, 1 of 77
  nodes"). Not a success, as the answer key says. The drawing jumps about 130 px right as the key
  appears. i-detours/41.png to 44.png

## 3. Success path by keyboard only (`i-keys/`, screen-reader mode)

1. Start: nothing focused. Tab: "Main menu", link "Samples", "Docs", "For developers", "GitHub",
   "Switch to dark mode", "Settings...", the canvas ("A network drawn as a 3D graph. ..."),
   "Communities" (pressed), "Key players", "Shortest path", "2D", "Pause the turning", "Open a file
   CSV, GraphML, GEXF, Cytoscape, or a saved project", "Open network data", button "Samples" (16th
   Tab). i-keys/02.png to 17.png
2. Enter on "Samples": the page scrolls to the Sample library; focus stays on the Samples button.
   i-keys/21.png
3. Tab x16 (New project, MIT licensed on GitHub, Put it on your own site, "Search samples", Grid,
   List, the nine category buttons) to "Open the Les Miserables sample". i-keys/22.png to 37.png
4. Enter: focus on heading "Graph, Les Miserables: 77 nodes, 254 edges", live "Les Miserables: 77
   nodes, 254 edges". i-keys/43.png
5. Shift+Tab x5: "Analyze", canvas "Graph drawing", "Resize left panel", "Graph settings",
   treeitem "Everything, node and edge layer, 77 nodes, 254 edges". i-keys/44.png to 48.png
6. Enter: the row is selected and its inspector opens; focus stays on the row (as settled). F6:
   heading "Everything". i-keys/51.png, 52.png
7. Tab x15: "Select what it paints", "Layer actions", tab "Style", tab "Node", "Style nodes",
   "Node shape, Icosphere", its attribute and remove buttons, "Node size", its two buttons, "Add to
   node visibility", "Add to node text", "Pick node color", textbox "Node color, set here, indigo".
   i-keys/53.png to 67.png
8. Type `darkgreen`, Enter: "Node color, set here, dark green", value 006400, live "Node color
   now dark green, on 77 nodes". All nodes dark green. i-keys/70.png
9. Escape after typing: live "Edit discarded; this stays 006400.", focus kept. Tab after typing
   `red`: commits, focus to "Node color by attribute". Control+Z, Control+Y, Control+Z: "Undid /
   Redid changing node color on Everything." i-keys/71.png to 75.png
10. "Pick node color", Enter: picker opens with focus in "Color value"; Tab reaches the swatches
    ("indigo 6366F1", "dark gray A9A9A9", "dark green 006400, the color before this edit");
    Escape closes it and returns focus to "Pick node color". i-keys/77.png to 81.png
11. In the picker's "Color value" box, typing `123456` then Escape reverts to 006400 and keeps
    focus, but nothing says so (defect 2). i-keys/82.png

Focus never fell to the page body. No missing or duplicate names met.

## Mismatches with the answer key

- "Select all" then "New layer from selection" opens the new layer on the Node tab, not "the Edge
  tab last shown", so its first "+" is Shape, not Line. i-detours/36.png. (A detour; the success
  path matches the key.)

## Defects

1. Whenever a selection is held, the drawing jumps about 130 to 140 px right the moment the key
   appears: the selection's Fill (i-detours/12.png against 14.png), "New layer from selection" and
   Fill (36.png against 38.png), and one node's Fill (43.png against 44.png). The settled rule says
   a key that arrives never moves the drawing. With nothing selected (the Everything route and the
   new layer with no condition) the drawing stays put. Undo moves it back.
2. The color picker's "Color value" box: Escape reverts what was typed but says nothing, on screen
   or to a screen reader, where the settled rule asks for "Edit discarded; this stays X" in every
   style box, the picker's hex box included. i-keys/82.png
3. Removing the edge Color line slides the Width line up under the pointer, its remove button
   shown hovered; a second click removes Width too. i-detours/22.png
4. Graph inspector Style tab: nothing tells a reader that node color lives in the layer list; the
   color typed into Background color paints the canvas (likely false finish), and its undo says
   only "Undid changing settings." i-detours/07.png, 08.png
5. Sample library: every card shows a broken-image icon; each thumbnail request to graphty.app is
   refused (net::ERR_BLOCKED_BY_ORB). The cards still read and open. i-pointer/03.png

## Not walked

Nothing on this task was skipped. The re-pilot routes of other tasks (T50A, T50B, T45A, T46A,
T46B, T47, T48, T38, T41, T51, and a project saved before the golden merge) do not belong to T39A
and were not walked here.
