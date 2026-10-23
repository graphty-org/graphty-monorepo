# T45 A pilot on build 6dd0b00bd7

Task: open neighbors.csv, make the 8 family ties thick and red, leave the people and every other
tie as they are. Every walk started from the empty start screen, and the data stayed the file's own
the whole way (16 people, 30 ties; kind: neighbors 16, family 8, coworkers 6).

Result: reached by pointer (16 steps, as the answer key counts) and by keyboard. The end state of
both is one layer whose edge part reads `data.kind` in [family], with `edge.width` 24 and
`edge.color` #FF0000 on 8 ties, and nothing set on its node part.

## 1. Success path by pointer (`success/`)

1. No thanks (02). 2. Open project or file... and the file chosen (03: the read-the-file page). 3.
Load (04). 4. "+" "Add a layer or a folder" (06: Layer, Folder, Select layers..., Analyze...). 5.
Layer (07: "Layer 1", "Node and edge layer", Node tab). 6. Edge (08). 7. The hint "All 30 edges:
add a condition to narrow" under the closed "Which edges" (09: the section opens with the column
list: years_known, close, kind). 8. kind (10). 9. family, 8 edges (11: "8 of 30"). 10. Done (12:
"kind: family, 8 edges"). 11. Line "+" (14: Color, Width, Pattern, Pattern count, Curved). 12.
Width (15: focus in the box, 8 selected). 13. 24 and Enter (16: the layer becomes "Edge layer",
its row count 8). 14-15. Line "+", Color (17: focus in the box, A9A9A9 selected). 16. red and Enter
(18: 8 red, thicker ties; the key "Edge color: Layer 1, 8 of 30 edges").

Mismatches with the answer key:

- No "Add a condition" button shows on a new layer: "Which edges" is closed and the way in is the
  hint text "All 30 edges: add a condition to narrow" (08). It opens the list in one click (09),
  so the step count holds.
- Adding Width leaves the subtitle "Node and edge layer" and the layer row count 16 until a width
  is entered; only then does it read "Edge layer" and 8 (15, 16). The key says adding Width does it.
- The key over the drawing appears when a color is entered (18), not when the Color line is added
  (17).
- After Enter in the color box, the Color line moves above Width and focus goes to Line "+" (18),
  not into the box.
- By keyboard, a file just opened puts focus on the inspector heading "Graph, neighbors: 16 nodes,
  30 edges" and announces "neighbors: 16 nodes, 30 edges" (keyboard/15), not on the layer row
  "Hovered".
- The new color box is named "Edge color, not set, #A9A9A9, dark gray" (keyboard/79), not "Edge
  color, set here, gray".
- Typing an edge column on the Node tab now offers "Add kind on the Edge tab", and Enter takes it:
  it switches to the Edge tab and opens a kind card there (detours/51, 52). The key says Enter does
  nothing.
- After a color typed on the Node tab, the first Control+Z undoes the color and the second removes
  the whole new layer ("Undid adding Layer 1.", detours/57, 58), not only the Fill line.

## 2. Detours (`detours/`)

**a. Everything, Edge tab, color by kind (05-33).** Everything's Edge tab reads "Everything styles
all 30 edges: it is the base layer, under every other layer." with no condition (06). Its Color
link icon ("Edge color by attribute") opens a column list; typing `kind` and Enter colors every tie
by kind in three colors (09), so every other tie changes. Clicking the color box opens "Color by
kind" (10); the family swatch ("kind family color, blue") opens a picker with the hex selected, and
`red` Enter makes family red (12); Escape closes the picker and keeps it (13). The family row's
actions offer "Set properties for family", "Select these 8 edges", "New layer for family", Rename
(F2), "Clear color: back to the layer's" (14). "Set properties for family" > "Set another property
for family" > Width puts focus in a Width box with the caret after 8, value not selected (17);
typing 24 gives 824, and the family ties draw as huge red slabs (18). Escape after typing puts 824
back (19). With focus inside the Color by kind popover, four Control+Z did nothing (22-25); after
Escape closed it, Control+Z undid width, then the width line, then the colors, back to the start
(27-32). Where a participant ends: family red, but the other ties recolored unless they undo.

**b. Find box (34-44).** `family` lists the 8 ties and the value row "kind is family (8)" (34).
Enter selects only the first tie, Agnes -> Bruno, and empties the box (35). The value row selects
the 8 ("8 edges selected", 37). Style tab: "The first style you set makes a layer for the 8
selected edges." (38). Line "+" > Color, `red` Enter makes the layer "8 edges", "Picked by hand: 8
edges" (40; focus stayed in the box), Width 24 (42), Tab goes to "Edge width by attribute" (43).
While selected the ties draw blue-banded over the red; a click on the drawing clears it (44). This
route ends correct: 8 ties red, width 24, people untouched.

**c. Right-click a tie (45-47).** A right-click on Agnes -> Clara (kind neighbors) selects it and
offers Select endpoints, Frame selection, New layer from selection, Add note (45). Nothing there
reaches the other family ties. Escape closes the menu; a second Escape clears the selection
("Selection cleared: 1 edge", 47).

**d. Node tab of a new layer (48-58).** The Node tab's column list holds only "Node id" (50: the
file has no person columns). Typing `kind` shows "kind is an edge attribute; it is on the Edge tab"
and "Add kind on the Edge tab" (51); Enter switches to Edge with a kind card open (52); Escape drops
it ("Dropped the kind condition: it was not finished", 53). Fill "+" then `red` Enter paints all 16
people red (56) and focus moves to Fill "+" (tooltip "Everything in node fill is set"). Control+Z
twice brings everything back (58).

## 3. Keyboard only, screen-reader mode (`keyboard/`)

Start screen: Tab gives Main menu, Local only, Settings..., Open project or file..., New from
data..., then the four samples (02-09). Shift+Tab back to "Open project or file...", Enter opens
the chooser; after the file, focus is on Load and "All 30 rows" is announced. Enter on Load: focus
on heading "Graph, neighbors: 16 nodes, 30 edges" (15). Tab goes on into the inspector ("From
neighbors.csv", "Graph actions", tab "Values", "About Direction"), so the layer list is behind:
Shift+Tab through Values, Graph actions, From neighbors.csv, Analyze, Canvas "Graph drawing",
separator "Resize left panel", Graph settings, treeitem "Everything, node and edge layer, 16 nodes,
30 edges", "Add a layer or a folder" (16-29). Enter: menuitem "Layer"; Enter: textbox "Layer name"
"Layer 1" (32); Enter keeps the name and focus goes to treeitem "Layer 1, node and edge layer, 16
nodes, 30 edges". Tab reaches the inspector only through Graph settings, the separator, the canvas
and Analyze, then "Select what it paints", "Layer actions", tab "Style", tab "Node", checkbox
"Style nodes", button "Which nodes, 16 of 16, All 16 nodes: add a condition to narrow". Shift+Tab
twice to tab "Node", ArrowRight to tab "Edge". Tab, Tab: checkbox "Style edges", button "Add a
condition". Enter: combobox "Find an attribute"; ArrowDown three times (years_known, close, kind);
Enter: combobox "kind: how to match" "Is any of". Tab, Tab: checkbox "family, 8 edges"; Space
ticks it ("8 of 30" announced). Enter on the checkbox does nothing (57). Tab: "coworkers, 6
edges", "Remove kind", "Add a condition", "Done"; Enter on Done: focus on "Which edges, 8 of 30,
kind: family, 8 edges" (62). Tab x3: "Add to edge visibility", "Add to edge text", "Add to edge
line". Enter, ArrowDown, Enter: spinbutton "Edge width" 8, "Edge width added: pick a value". Typing
30 then Escape removed the Width line entirely ("Edge width not added", focus on Line "+", 70).
Again: 24 and Tab commits ("Edge width now 24, on 8 edges"). Shift+Tab x2, Enter, Enter: textbox
"Edge color, not set, #A9A9A9, dark gray" (79). `red` Enter: "Edge color now red, on 8 edges",
focus to "Add to edge line" (81). Tab: "Pick edge color", Tab: textbox "Edge color, set here, red";
typing then Escape: "Edit discarded; this stays FF0000." Focus never fell to the page body.

## Defects

1. The group Width box under "Set properties for family" opens with the caret after the old
   value, not the value selected: typing 24 makes 824, and the ties draw as huge slabs with no
   upper limit (detours/17, 18).
2. Control+Z does nothing while focus is inside the "Color by kind" popover (detours/22-25).
3. Enter in a color box sometimes moves focus out to the section's "+" (success/18,
   detours/56, keyboard/81) and sometimes keeps it in the box (detours/40). Where Width came
   first, the Color line also jumps above Width.
4. A new layer's row count and subtitle describe its node part (16, "Node and edge layer") while
   the participant is building an edge condition on the Edge tab ("8 of 30", success/11-15).
5. After Load, focus lands on the inspector heading, and the layer list is reachable only by
   Shift+Tab through the toolbar, canvas and separator. After naming a new layer, Tab from the tree
   again crosses Graph settings, the separator, the canvas and the toolbar before the inspector
   (keyboard/15-29, 33-42).
6. Escape in a just-added Width box removes the whole Width line ("Edge width not added",
   keyboard/70), where Escape in the color box only discards the edit. A person who Escapes a
   typo loses the line.
7. Enter on a ticked value checkbox does nothing; Done needs four more Tabs, past "Remove kind",
   which sits after the values though it is drawn at the card's top (keyboard/57-61).
8. The width legend "Edge width: kind" lists all three groups at 8 once one group gets a width
   (detours/17), and the key reorders its color lines (family first) after a group color changes,
   while the table keeps file order (detours/12).
9. Selected ties draw a blue band over their new red, so the red is hard to judge until the
   selection is cleared (detours/40-43).
