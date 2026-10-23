# Pilot: T38 B (sources.graphml, companies and agencies blue)

Build 3ef9e6c1ec (frozen, served from `.study-builds/tier3-r1d1-3ef9e6c1ec`). Three sessions, each
from the empty app. The folders `success/`, `detours/`, `keyboard/` and `old-build-ed4351b258/` in
this folder were walked on earlier builds (5bd16cd and ed4351b258) and are not part of this pass.

Result: reached on all three walks. The data stayed the task's own file throughout (24 nodes, 59
edges; kind person 14, company 6, agency 4); every session's `work.json` lists nothing gone.

## 1. Success path by pointer -- `b3ef-pointer/`

| Step | Action | What the screen did | Shot |
| ---- | ------ | ------------------- | ---- |
| 1 | No thanks | Notice closes | 02 |
| 2 | Open project or file..., sources.graphml | Read-the-file page: "sources: 24 nodes, 59 edges" | 03 |
| 3 | Load | Graph opens; Values: Nodes 24, Edges 59 | 04 |
| 4 | "+" beside Style layers (tooltip "Add a layer or a folder") | Menu: Layer, Folder, Select layers..., Analyze... | 05-06 |
| 5 | Layer | Layer 1 added, selected, its name opened for renaming (text selected in the row); inspector on Style, Node | 07 |
| 6 | Which nodes | Section expands with "Add a condition" and Done; no attribute list | 08 |
| 7 | Add a condition | Attribute list: name, kind (3 values), donations, on_record, email, Node id | 09 |
| 8 | kind | Card "Is any of": person 14, company 6, agency 4 | 10 |
| 9-10 | Tick company, agency | "10 of 24 nodes"; card "10 nodes"; subtitle "Node layer" | 11-12 |
| 11 | Done | Summary "kind: company, agency, 10 nodes" | 13 |
| 12 | Fill "+" ("Add to node fill") | Color line, 6366F1 selected in the box | 15-16 |
| 13 | Type blue, Enter | 0000FF; 10 nodes blue; key "Color: Layer 1, 10 of 24 nodes"; the drawing did not move | 17 |

(Shot 14 is a missed click of the pilot's own, on empty inspector space; no effect.)

Field checks in the color box: Enter commits and keeps focus (17); typing "red" then Escape reverts
and says "Edit discarded; this stays 0000FF." with focus kept (18); Tab moves to "Node color by
attribute" (20). All as the settled behaviors say.

## 2. Detours -- `b3ef-detours/`

The earlier pass left no report for this task, so the detours walked are the commonest ones the
task list names for a brought file, plus this task's two answer-key dead ends:

- **"New from data..." instead of "Open project or file"** (03-04): an empty "Open as a new graph"
  page with "Choose a file..."; choosing sources.graphml gives the same read-the-file page as the
  success path. Converges, one extra click.
- **Cancel on the read-the-file page, then a second try** (05-07): Cancel returns to the start
  screen cleanly, nothing loaded; Control+O, the file, Load opens it as on the success path.
- **Find box** (08-19): typing "company" lists "Nodes 6" (rows titled s01, s04, s07, s17, s20, s24
  with "kind: company" under each) and "Values: kind is company (6)". Enter takes the highlighted
  first row and selects only s01 (09). Escape clears it. Clicking "kind is company (6)" selects 6
  (12); typing "agency" and Shift+clicking "kind is agency (4)" adds them, 10 selected (14). Escape
  twice: the box empties, then focus leaves to the canvas with the 10 kept (15-16). Style tab says
  "The first style you set makes a layer for the 10 selected nodes." (17); Fill "+", blue, Enter makes
  layer "10 nodes", "Picked by hand: 10 nodes", notice "Made a layer for the 10 selected nodes" (19).
  A hand-picked selection, graded SD by the answer key. Control+Z takes the whole layer back in one
  step ("Undid adding the layer 10 nodes.") with focus on Fill "+" (20).
- **Data place** (21-26): attribute kind lists person 14, company 6, agency 4. A click or right-click
  on the value row "company" does nothing (23-24). "Attribute actions" offers Add label line,
  Filter to..., Show in table, no color (25). Dead end, as the answer key says.

## 3. Success path by keyboard only -- `b3ef-keys/` (screen-reader names)

Start screen Tab order (02-08): Main menu, Local only, Settings..., Open project or file..., New from
data..., Open the Les Miserables sample, Open the Zachary's karate club sample. Shift+Tab x3 back to
"Open project or file...", Enter, the file (09-13): focus lands on Load; the region is named
"sources: 24 nodes, 59 edges" (14). Enter (15): focus on heading "Graph, sources: 24 nodes, 59 edges",
announced "sources: 24 nodes, 59 edges".

Shift+Tab from the heading: Analyze, Canvas "Graph drawing", separator "Resize left panel", Graph
settings, treeitem "Everything, node and edge layer, 24 nodes, 59 edges", button "Add a layer or a
folder" (16-21). Enter: menuitem Layer (22). Enter: focus in textbox "Layer name" value "Layer 1"
(23). Tab x10 from there: Graph settings, Resize left panel, Graph drawing, Analyze, Select what it
paints, Layer actions, tab Style, tab Node, checkbox Style nodes, button "Which nodes, 24 of 24
nodes, All 24 nodes: add a condition to narrow" (24-33). Enter (34): focus on "Add a condition",
list closed. Tab goes to Done (35); Shift+Tab, Enter (36-37): combobox "Find an attribute" expanded.
Typing "ki" highlights "kind, 3 values" (38); Enter (39): focus on "kind: how to match". Shift+Tab is
"Remove kind" (40), in the header before the values. Tab to the checkboxes, Space on company ("6 of
24 nodes") and agency ("10 of 24 nodes") (41-46). Escape (47): picker closes, edits kept, focus on
"Which nodes, 10 of 24 nodes, kind: company, agency, 10 nodes".

Tab x4 to "Add to node fill" (48-51; one Tab too many by the pilot opened the Effects menu, Escape
returned focus to "Add to node effects", 52-53). Shift+Tab, Enter (54-55): textbox "Node color, not
set, drawn #6366F1 indigo", announced "Node color added: pick a value". Type blue, Enter (56-57):
"Node color, set here, blue" value 0000FF, announced "Node color now blue, on 10 nodes". Tab (58-59):
"Node color by attribute". End screen matches the pointer walk.

Focus never fell to the page body on this walk. 32 keys from the graph opening to the color set.

## Mismatches between the answer key and the screen

- Step 5: Layer opens the new layer's name for renaming (pointer and keyboard, shots 07 and keys
  23); the key says focus stays in the tree, and counts "Which nodes is 10 Tabs on" from the tree.
  The 10 Tabs hold, counted from the name box.
- Step 13: the drawing does not jump right when the key appears (shot 17); the key says it does. The
  screen follows the settled rule "The drawing moves only when the reader asks".
- The key over the drawing reads "Color: Layer 1" with "10 of 24 nodes" on a second line, not one
  line.
- Find box: node rows show the id and then "kind: company", not the name a row below (detours 08).

## Defects

1. **"Which nodes" on a layer with no condition does not open the attribute list.** Pointer: it
   only expands, so every walk needs a second click on "Add a condition" (pointer 08). Keyboard:
   Enter puts focus on "Add a condition" with the list closed (keys 34). The settled behavior
   (2026-10-19) is that it opens the list with focus in its search. The answer key describes the
   build, not the rule.
2. **A new layer starts in rename mode** (pointer 07, keys 23). A pointer user who does not notice
   and starts typing renames the layer; a keyboard user lands in a text box inside the tree, and Tab
   leaves the tree for Graph settings rather than continuing in the layer list.
3. **Find-box node rows are titled by id only** (s01, s04, ...) with no name anywhere in the row
   (detours 08); a reader looking for "Harlan Development" cannot tell which row is which, and
   Enter selects only the first row (s01) rather than everything listed (09). Which column becomes
   the label is an open question for the sessions; the missing name in the row is not.
