# Pilot: T39 A (one color for the whole drawing, Les Miserables)

Build: e3c5bca8e6 (`.study-builds/tier3-r1-e3c5bca8e6`). Every session started empty, and the data
stayed the Les Miserables sample (77 nodes, 254 edges) throughout. Screenshot paths are relative to
this folder.

Result: reached on all three walks. The success path matches the answer key step for step (5 key
steps). The keyboard walk reached the end with no focus lost to the page.

## 1. Success path by pointer (`f-pointer/`)

| Step | Action | What happened | Screenshot |
| ---- | ------ | ------------- | ---------- |
| 1 | "No thanks" | Notice closes | f-pointer/02.png |
| 2 | Les Miserables | Graph opens, inspector on Values | f-pointer/03.png |
| 3 | Everything in the layer list | Everything opens on Style, Node; Color 6366F1 | f-pointer/04.png |
| 4 | Click the color box | Named "Node color, set here, indigo"; value selected | f-pointer/05.png |
| 5 | Type `darkgreen`, Enter | Box reads 006400, all 77 nodes dark green, ties gray | f-pointer/06.png, 07.png |

Field keys checked in the color box:

- Escape after typing `ff0000` (not committed): the typed text is dropped, 006400 stays, focus
  stays in the box (as settled). f-pointer/08.png
- Tab: moves to "Node color by attribute". f-pointer/09.png
- Typing `red` then Tab: commits FF0000 (all nodes red). f-pointer/10.png
- Control+Z: back to 006400, notice "Undid changing node color on Everything." f-pointer/11.png

`styles.json`: `everything_2` holds `node.color: #006400`; edge layers unchanged.

## 2. Detours (`f-detours/`)

All in one session, from an empty start with the usage notice left open.

- **Sample from the main menu** (notice left open): Main menu > Open sample > Les Miserables opens
  the graph; the unanswered notice is gone once the graph opens. f-detours/02.png to 04.png
- **Graph inspector's Style tab (the likely false finish)**: shows only Canvas (Background color,
  Lighting, Outline width) and Labels; nothing there points to where node color is set. Typing
  `darkgreen` into Background color paints the canvas dark green and leaves the nodes blue-violet.
  Control+Z undoes it, but the notice says only "Undid changing settings." f-detours/05.png to 07.png
- **Graph settings** (bottom left): opens the same Graph Style tab. f-detours/08.png
- **Right-click on empty canvas**: Fit, Frame selection, New layer from selection, Clear selection
  (the last three disabled). No select-all and nothing about color. f-detours/09.png
- **A node's inspector**: clicking Valjean, Style shows Shape/Visibility/Text/Fill "+" and "Why
  this look" (Selected; Everything: Color, Size, Shape). Clicking "Everything" there opens
  Everything's Style, Node tab, but focus lands on the heading "Everything" and the Color line is
  neither marked nor focused. f-detours/11.png to 14.png
- **Edge tab first**: Everything > Edge > Line Color, `darkgreen` Enter paints every tie green.
  "Remove edge color" (the dash) takes it off; the Width line slides up under the pointer and its
  own dash takes focus. f-detours/15.png to 18.png
- **New layer with no condition**: "+" > Layer > Fill "+" > `dark green` (with a space) > Enter:
  accepted as 006400, all 77 nodes dark green, key "Color: Layer 1" appears. At the same moment
  the whole drawing shifts right and down (the camera reframes) although the layout did not change.
  f-detours/19.png to 23.png
- **Find box**: `all` gives 'No match for "all". Still selected: 1 node.' with a rule hint.
  Escape, Escape leaves the box with focus on the canvas (as settled). f-detours/24.png to 26.png
- **Control+A on the canvas**: selects nothing (Selected stays 0); there is no select-all.
  f-detours/27.png
- **Fill "+" in one node's inspector**: `orange` Enter makes a one-node layer "Valjean" ("Picked by
  hand: 1 node", notice "Made layer Valjean for 1 node"), key "Color: Valjean, 1 of 77 nodes".
  Matches the answer key; not a success. f-detours/28.png, 29.png

## 3. Success path by keyboard only (`f-keys/`, screen-reader mode)

1. Start: nothing focused. Tab: "Main menu", "Local only", "Settings...", "Open project or
   file...", "New from data...", the four "Open the ... sample" buttons, "What is collected",
   "Share usage data", "No thanks" (the usage notice last, as settled). f-keys/02.png to 13.png
2. Enter on "No thanks": focus goes to "Open project or file...", live "Usage data stays off.
   Change this in Settings > Privacy". f-keys/14.png
3. Tab, Tab, Enter on "Open the Les Miserables sample": focus on heading "Graph, Les Miserables: 77
   nodes, 254 edges", live "Les Miserables: 77 nodes, 254 edges". f-keys/15.png, 16.png
4. Tab from there goes into the right inspector ("From Les Miserables", "Graph actions", tab
   "Values", "About Direction"); the layer list is behind it. Shift+Tab x8: "Analyze" (toolbar),
   canvas "Graph drawing", "Resize left panel", "Graph settings", treeitem "Everything, node and
   edge layer, 77 nodes, 254 edges". f-keys/17.png, 18.png
5. Enter: Everything selected and its inspector opens; focus stays on the treeitem. f-keys/19.png
6. Tab x20: Graph settings, Resize left panel, canvas, Analyze, "Select what it paints", "Layer
   actions", tab "Style", tab "Node", "Style nodes", "Node shape, Icosphere", its attribute and
   remove buttons, "Node size", its two buttons, "Add to node visibility", "Add to node text",
   "Pick node color", textbox "Node color, set here, indigo". f-keys/20.png, 21.png
7. Type `darkgreen`, Enter: textbox "Node color, set here, dark green" value 006400, live "Node
   color now dark green, on 77 nodes". All nodes dark green. f-keys/22.png, 23.png
8. Escape keeps focus in the box; Control+Z undoes (live "Undid changing node color on
   Everything."), Control+Y redoes. f-keys/24.png, 25.png
9. "Pick node color", Enter: picker opens with focus in "Color value"; Tab reaches the swatches
   ("indigo 6366F1", "dark gray A9A9A9"); Escape closes it and returns focus to "Pick node color".
   f-keys/26.png to 28.png

Focus never fell to the page body. No missing or duplicate names met.

## Mismatches with the answer key

- "A node's Style > Why this look > Everything opens Everything on its Color line": it opens
  Everything on Style, Node, but focus goes to the heading "Everything" and nothing marks the Color
  line. f-detours/13.png, 14.png

## Defects

1. New layer route: the drawing jumps (camera reframes, the whole graph shifts right and down) the
   moment the key "Color: Layer 1" appears. f-detours/21.png against f-detours/22.png
2. Graph inspector Style tab: nothing tells a reader that node color lives in the layer list; the
   color typed into Background color paints the canvas. f-detours/05.png, 06.png
3. Undo after the background change says only "Undid changing settings.", where the node color
   undo names the property and the layer. f-detours/07.png
4. "Why this look" > Everything: focus lands on the heading, not on the Color line it explains.
   f-detours/14.png
5. Removing the edge Color line slides the Width line up under the pointer and its dash takes
   focus; a second click or Enter removes Width too. f-detours/18.png
6. Keyboard: after a sample opens, focus is on the inspector's heading, so Tab goes away from the
   layer list; the Everything row is reached only by Shift+Tab through the toolbar, canvas,
   splitter and Graph settings (8 presses). f-keys/17.png, 18.png
7. Enter on a layer row opens its inspector but leaves focus on the row: the color box is 20 Tabs
   away, through Graph settings, the splitter, the canvas and the toolbar first. f-keys/19.png to
   21.png
8. Control+A on the canvas does nothing, and neither the canvas menu nor the find box offers a way
   to select every node (`all` finds nothing). f-detours/09.png, 24.png, 27.png

## Not walked

Nothing was skipped.
