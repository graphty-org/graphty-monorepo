# T40 B pilot on build 758b8e8081 (yeast genes, "name begins with GAL") -- targeted re-walk

Every walk started `empty` on the frozen build named on the first line of `../../../../criteria.md`
(`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081`; each
`session.json` records commit 758b8e8081). This pass's walks are the folders starting `s3-`; the
other folders are earlier walks and were not touched. The data stayed the task's own file the whole
way: 331 nodes, 361 edges, and the same eight GAL names (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10,
GAL11, GAL80) on every screen that listed them.

Routes that name another task were walked on this task's file where the same steps exist here
(a find-box layer, Control+O > Replace with the same file, Undo). The yes/no and "has no value"
columns of the T41 routes do not exist in yeast-galactose.graphml, so their find-box step was
walked with this file's own condition (name starts with GAL).

## 1. Success path by pointer -- `s3-pointer/` -- reached, matches the answer key

| Step | What I did | What the screen showed | Screenshot |
| ---- | ---------- | ---------------------- | ---------- |
| 1 | "Open a file", yeast-galactose.graphml | "Open as a new graph": 331 nodes, 361 edges | 02.png |
| 2 | Load | the drawing; Style layers Hovered / Selected / Everything | 03.png |
| 3-4 | "+" beside Style layers, Layer | Layer 1, "Node and edge layer", name selected for renaming, "All 331 nodes: add a condition to narrow" | 05.png |
| 5 | Which nodes | only expands ("Nodes that pass every condition", "+ Add a condition", Done) | 06.png |
| 6 | Add a condition | attribute list: name, gal1RGexp, gal4RGexp, gal80Rexp, Node id | 07.png |
| 7 | name | Contains card, focus in "Type the text to match" | 08.png |
| 8-9 | match menu, Starts with | focus back in the text box | 10.png |
| 10 | typed `GAL` | "8 nodes", "8 of 331 nodes", list of the eight names | 11.png |
| 11 | Enter | "name starts with GAL, 8 nodes", layer row 8 | 12.png |
| 12 | Fill "+" | Color line, focus in box, `6366F1` unset | 13.png |
| 13 | typed `purple`, Enter | `800080`; key "Color: Layer 1, 8 of 331 nodes"; drawing stays put; eight purple dots in the middle | 14.png |

Field checks: Escape in the color box keeps `800080` and focus (15.png); Tab moves to "Node color
by attribute" (16.png). `styles.json`: Layer 1's node part `{text, data.name, starts-with, GAL}`,
`node.color #800080`, matched 8, painted 8; its edge part (`layer-1_1`, everything, nothing set) is
still there, so the "+" layer keeps its both-kinds row unchanged. Once the condition is set the
inspector's subtitle reads "Node layer" and "Edge not styled" (11.png), while the tree row is the
same row.

## 2. Routes the fixes touched

### 2a. Find-box layer whose condition is edited before its look (the T41 A/B and T38 A / T51 A detour) -- `s3-find-layer-edit/` -- ends on the eight

- `GAL` in the find box: "Nodes 8", rows by id with "name: GALn", then Values rows (04.png).
- Shift+click on the eight rows: each checked, "8 nodes selected" (05.png).
- Right-click on empty canvas > "New layer from selection": layer "8 nodes", "Picked by hand: 8
  nodes", notice "Made a layer for the 8 selected nodes", Style tab open (07.png).
- Which nodes > Add a condition > name > Starts with > `GAL`: written at once, layer renamed
  "Picked and name", 8 of 331 (12.png). Removing the hand-picked card: "name starts with GAL",
  8 of 331, no list opened over Done (15.png). Done keeps it (16.png).
- Fill "+" > `purple`, Enter: key "Color: name starts with GAL, 8 of 331 nodes" (18.png).
  `styles.json`: `nodes_1` selector `{text, data.name, starts-with, GAL}`, `#800080`, painted 8.
  The edit before the look was kept, as `decided.md` (2026-10-20, pass 2) says.
- DEFECT (known, recorded in the answer key, not graded): the first color moved the whole drawing
  about 135 px right with the eight still selected (17.png against 18.png). `decided.md`
  (2026-10-19): the drawing moves only when the reader asks.

### 2b. Find-box layer colored, Control+O > Replace, Control+Z twice -- `s3-find-replace-undo/` -- correct

- Eight rows shift-clicked, Style tab, Fill "+" > `purple`, Enter: layer "8 nodes", eight purple
  (08.png; the same 135 px jump right as 2a).
- Control+O, yeast-galactose.graphml: "Add to yeast-galactose" with "Replace
  yeast-galactose.graphml" first and Load beside it with the duplicate-edges warning (09.png);
  Replace opens "Replace: yeast-galactose.graphml / Was 331 nodes, 361 edges; now 331, 361" with a
  second Replace button (10.png); after it the layer "8 nodes" still paints 8 purple (11.png).
- Control+Z: "Undid changing settings and importing data.", layer and purple kept (12.png).
  Control+Z: "Undid adding the layer 8 nodes.", layer, key and purple all gone; nothing drawn
  purple without a layer (13.png). Control+Y: "Redid adding the layer 8 nodes.", eight purple
  again (14.png); `styles.json` `nodes_1` ids of the eight, `#800080`, painted 8.

### 2c. First find-box pick after Replace (selection ring) -- `s3-replace-first-pick/` -- correct

- File opened, Control+O > Replace > Replace (06.png, 07.png).
- Find `GAL`, click YBR019C: inspector "YBR019C, Node", name GAL10; Selected 1; the camera glides
  to it and the yellow selection ring is drawn on it at the center (09.png).
- Style > Fill "+" > `purple`: layer "YBR019C", "Picked by hand: 1 node" (13.png), with the same
  jump right (09.png against 13.png).

### 2d. One-node label layer from a find-box pick, Replace, two undos, then label Everything (T44 B detour c) -- `s3-label-replace-undo/` -- correct

- Find `GAL`, Enter (selects YBR019C), Style > Text "+" > Label > name: layer "YBR019C", "1 label,
  0 hidden", notice "Made layer YBR019C for 1 node" (08.png; the label is drawn, tiny at this zoom).
- Control+O > Replace > Replace, Control+Z twice: "Undid adding the layer YBR019C."; tree back to
  Hovered / Selected / Everything (13.png).
- Everything > Text "+" > Label > name: "331 labels, 7 hidden", a label under every node (17.png).
  `styles.json` has no YBR019C layer left; nothing from the removed layer stays drawn.

### 2e. Hand-picked edge layer, Replace, Control+Z (T45 A detour, walked on this file) -- `s3-edge-layer-replace-undo/` -- correct

- Find `YBR019C` lists "Edges 3"; shift+click the three, Style > Line "+" > Color > `red`: layer
  "3 edges", "Picked by hand: 3 edges", key "Edge color: 3 edges, 3 of 361 edges" (09.png). The
  drawing did not move.
- Control+O > Replace > Replace: the layer still matches 3 (12.png). Control+Z: "Undid changing
  settings and importing data.", layer kept (13.png). `styles.json`: `edges_1` ids 103, 104, 113,
  `#FF0000`, matched 3.

### 2f. The "+" layer's both-kinds row (T41 A success path)

Walked as part of 1 (`s3-pointer/05.png`, 11.png) and 3 (treeitem "Layer 1, node and edge layer,
331 nodes, 361 edges"): unchanged.

## 3. Success path by keyboard -- `s3-keyboard/` (keyboard-only, screen-reader output on) -- reached

| Keys | Focus (screen-reader name) |
| ---- | -------------------------- |
| Tab x14 | Main menu, Samples, Docs, For developers, GitHub, Switch to dark mode, Settings..., Canvas "A network drawn as a 3D graph...", Communities (pressed), Key players, Shortest path, 2D, Pause the turning, button "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project" |
| Enter, file chosen | button "Load" (live: "The first 50 rows of 331") |
| Enter | heading "Graph, yeast-galactose: 331 nodes, 361 edges" (live: private-window notice, then "yeast-galactose: 331 nodes, 361 edges"); no visible focus ring (17.png) |
| Tab x16 | From yeast-galactose.graphml, Graph actions, tab Values, About Direction, Largest component 249 nodes, About Degree, separator Resize inspector, Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Local only, Graph, Graph yeast-galactose.graphml, combobox Find, button "Add a layer or a folder" |
| Enter, Enter, Enter | menuitem "Layer"; textbox "Layer name" "Layer 1"; treeitem "Layer 1, node and edge layer, 331 nodes, 361 edges" selected |
| Tab x10 | Graph settings, Resize left panel, Canvas "Graph drawing", Analyze, Select what it paints, Layer actions, tab Style, tab Node, checkbox Style nodes, button "Which nodes, 331 of 331 nodes, All 331 nodes: add a condition to narrow" |
| Enter | button "Add a condition" -- the attribute list does not open |
| Enter | combobox "Find an attribute" expanded |
| type `na`, Enter | highlighted option "name"; then combobox "name: text to match" |
| Shift+Tab, Enter, ArrowDown, Enter | "name: how to match" Contains -> Starts with; focus back in "name: text to match" |
| type `GAL` | live: "8 of 331 nodes" |
| Escape | text kept, list closed, picker open |
| Tab, Shift+Tab | checkbox "Match case", back to the text box |
| Enter | button "Which nodes, 8 of 331 nodes, name starts with GAL, 8 nodes" |
| Tab x4 | Add to node shape, visibility, text, fill |
| Enter | textbox "Node color, not set, drawn #6366F1 indigo" (live: "Node color added: pick a value") |
| type `purple`, Enter | textbox "Node color, set here, purple" value "800080" (live: "Node color now purple, on 8 nodes") |
| Escape | focus stays in the box |
| Tab | button "Node color by attribute" |

No step dropped focus to the page body. `styles.json`: `{starts-with GAL}`, `#800080`, painted 8.

## Mismatches between the answer key, `decided.md` and the screen

- None against the answer key's success path for B.
- `decided.md` (2026-10-19) says opening "Which nodes" with no condition opens the attribute list
  with focus in its search; the screen only expands it (pointer `s3-pointer/06.png`, keyboard:
  focus on "Add a condition" with the list closed). The answer key describes what the screen does.
- `decided.md` (2026-10-19) says the inspector heading draws a visible focus ring after a graph
  opens; none is drawn (`s3-keyboard/17.png`, `s3-pointer/03.png`).

## Defects (none crash, block the task or spoil its grading)

1. The first color set while nodes are selected (every find-box route) moves the drawing about 135
   px right with no request from the reader: `s3-find-layer-edit/17.png` -> `18.png`,
   `s3-replace-first-pick/09.png` -> `13.png`, `s3-find-replace-undo/08.png`. The success path
   (no selection) does not move it (`s3-pointer/13.png` -> `14.png`). Against `decided.md`
   2026-10-19. Graded on the tree, so it does not spoil the grade.
2. No visible focus ring on the inspector heading after Load (`s3-keyboard/17.png`), against
   `decided.md` 2026-10-19 (WCAG 2.4.7). A keyboard reader cannot see where focus is.
3. Opening the same file over itself takes two Replace clicks: "Replace yeast-galactose.graphml" on
   the "Add to" page, then "Replace" on a second "Replace: yeast-galactose.graphml" page
   (`s3-find-replace-undo/09.png`, `10.png`). Not on T40 B's success path.

## Skipped

Nothing. The success path by pointer and by keyboard and all eight listed routes were walked
(the two T41 find-box detours and the edit-before-look detour as one route, 2a; the T41 A "+" row
inside 1 and 3).
