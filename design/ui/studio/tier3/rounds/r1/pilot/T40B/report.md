# T40 B pilot on build 7d87760756 (yeast genes, "name begins with GAL")

Every walk started `empty` on the frozen build named on the first line of `../../../../criteria.md`
(`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-7d87760756`; each
`session.json` records commit 7d87760756, graphty 0.8.91). Folders without the `7d8-` prefix are
pilots of earlier builds and were not touched. The data stayed the task's own file the whole way:
331 nodes, 361 edges, and the same eight GAL names (GAL1, GAL2, GAL3, GAL4, GAL7, GAL10, GAL11,
GAL80) on every screen that listed them.

## What the first screen is on this build

The app opens on a landing page ("Analyze any network. Free and open source.") with a turning
demo drawing on the right and four buttons: "Open a file", "Open network data", "Samples",
"New project" (`7d8-pointer/01.png`). The usage-data notice is not on the first screen; the
tool's "No thanks" found it below the fold and the page scrolled 26 pixels (`7d8-pointer/02.png`).
Every start logs 34 failed requests for sample thumbnails
(`https://graphty.app/data/graph-samples/v1/generator-*.webp`, `net::ERR_BLOCKED_BY_ORB`).

## 1. Success path by pointer -- `7d8-pointer/` -- reached

| Step | What I did | What the screen showed | Screenshot |
| ---- | ---------- | ---------------------- | ---------- |
| 1 | "Open a file", yeast-galactose.graphml | "Open as a new graph": 331 nodes, 361 edges | 04.png |
| 2 | Load | the drawing; Style layers Hovered / Selected / Everything; focus on the inspector heading | 05.png |
| 3 | "+" beside Style layers | menu: Layer, Folder, Select layers..., Analyze... | 06.png |
| 4 | Layer | Layer 1, name selected for renaming; "All 331 nodes: add a condition to narrow" | 07.png |
| 5 | Which nodes | only expands ("Nodes that pass every condition", "+ Add a condition", Done); no list | 08.png |
| 6 | Add a condition | attribute list: name, gal1RGexp, gal4RGexp, gal80Rexp, Node id | 09.png |
| 7 | name | Contains card, focus in "Type the text to match" | 10.png |
| 8 | match menu ("name: how to match") | Contains, Starts with, Ends with, Is exactly, Has a value, Has no value | 11.png |
| 9 | Starts with | menu closes, focus moves into the text box | 12.png |
| 10 | typed `GAL` | card "8 nodes", "8 of 331 nodes", list of the eight names under the box | 13.png |
| 11 | Enter | picker closes: "name starts with GAL, 8 nodes", layer row 8 | 14.png |
| 12 | Fill "+" (tooltip "Add to node fill") | Color line, focus in box, `6366F1` unset in italics | 16.png |
| 13 | typed `purple`, Enter | `800080`; key "Color: Layer 1, 8 of 331 nodes" top left; drawing stays put; eight purple dots in the middle | 17.png |

Field checks: Escape in the color box keeps focus there (18.png); Tab moves to "Node color by
attribute" (19.png). Reopening the card ("name starts with GAL, 8 nodes", 20.png), Escape in
its text box keeps `GAL` and the picker open (21.png); Tab moves to Match case (22.png); Done
closes it (23.png).

`styles.json`: layer `layer-1_2`, selector `{kind: text, reads: data.name, mode: starts-with,
text: GAL}`, `set: node.color #800080`, matched 8, painted 8; Everything paints the other 323
unchanged (`#6366F1`). Count readable as "8 of 331" and "name starts with GAL, 8 nodes".
Route length: 13 steps with Starts with, 11 with Contains.

## 2. Detours

### 2a. The find box -- `7d8-detour-find/` -- ends on the eight (SD)

- `GAL` in "Find nodes, edges, values": "Nodes 8", rows titled by id with "name: GALn" under
  each, then Values rows "name is GAL10 (1)" ... (04.png).
- Enter selects only the first row (YBR019C, GAL10) and empties the box; the camera glides to it
  (decided 2026-10-20); the selected node is a tiny yellow dot hard to find at this zoom (05.png).
- Typed again, Shift+click on all eight option rows: each row checked, list stays open, inspector
  "8 nodes selected" with a summary (08.png).
- Style tab: "The first style you set makes a layer for the 8 selected nodes." (09.png). Fill
  "+" shows "Not set yet: the first color you pick makes the layer" (10.png).
- `purple`, Enter: layer "8 nodes", "Picked by hand: 8 nodes", key "Color: 8 nodes, 8 of 331
  nodes", notice "Made a layer for the 8 selected nodes" (11.png). At that moment the drawing
  moved about 110 pixels right and turned, with no request from the reader (10.png against
  11.png). The eight keep yellow selection rings over purple. `styles.json`: `nodes_1` ids of
  the eight, `#800080`, painted 8.

### 2b. Filters -- `7d8-detour-filter/` -- hides, then Everything colors all (F, as the key says)

- Toolbar Filters opens Data with "New filter step" (04.png). Attribute > name gives a Contains
  box with focus in it; `GAL` lists the eight with GAL1 highlighted (07.png).
- Enter adds "name contains GAL, 331 to 8 nodes" (keeps the typed `GAL`, not the highlighted
  GAL1); top bar "8 of 331 nodes"; the eight drawn small in the middle, no reframe (08.png).
- Graph > Everything: inspector says "Everything styles all 331 nodes" (14.png). Color box,
  Control+A, `purple`, Enter: the eight visible dots turn purple (15.png).
- Top bar filter button: name "Filter: 8 of 331 nodes", tooltip 'Showing only: "name contains
  GAL". Click to open Filters, where you can turn it off.' (16.png).
- Turning the step off shows all 331 purple (17.png): F.
- Control+Z: 'Undid turning off the filter step "name contains GAL".' (18.png), then 'Undid
  changing node color on Everything.' (19.png).

### 2c. Other starts and menus -- `7d8-detour-other/` -- dead ends, nothing changed

- Start screen "Open network data": NDEx, Neo4j, Web API cards and a web-address box; "Connecting
  to these sources is on the way" (02.png). NDEx only adds "NDEx is on the way. For now, paste the
  web address of a graph file." (03.png). Nothing in it opens a file on this computer. Escape
  closes it with focus back on its button (04.png).
- After "Open a file" and Load: right-click on empty canvas gives Fit, Frame selection, New layer
  from selection, Select all, Clear selection -- nothing to pick by name (07.png).
- Data > Attributes > name, right-click: Add label line, Filter to..., Show in table (11.png).
  Show in table opens the node grid in the lower half; the drawing shrinks into the upper half;
  the name column is not marked (12.png).

## 3. Success path by keyboard -- `7d8-keyboard/` (keyboard-only, screen-reader output on) -- reached

| Keys | Focus (screen-reader name) |
| ---- | -------------------------- |
| Tab x7 | Main menu, Samples, Docs, For developers, GitHub, Switch to dark mode, Settings... |
| Tab x6 | Canvas "A network drawn as a 3D graph...", Communities (pressed), Key players, Shortest path, 2D, Pause the turning |
| Tab | button "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project" (14th stop) |
| Enter, file chosen | button "Load" (live: "The first 50 rows of 331") |
| Enter | heading "Graph, yeast-galactose: 331 nodes, 361 edges" (live: "yeast-galactose: 331 nodes, 361 edges"); no visible focus ring (25.png) |
| Tab x16 | From yeast-galactose.graphml, Graph actions, tab Values, About Direction, Largest component 249 nodes, About Degree, separator Resize inspector, Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Local only, Graph, Graph yeast-galactose.graphml, combobox Find, button "Add a layer or a folder" |
| Enter | menuitem "Layer" |
| Enter | textbox "Layer name" value "Layer 1" |
| Enter | treeitem "Layer 1, node and edge layer, 331 nodes, 361 edges" selected |
| Tab x10 | Graph settings, Resize left panel, Canvas "Graph drawing", Analyze, Select what it paints, Layer actions, tab Style, tab Node, checkbox Style nodes, button "Which nodes, 331 of 331 nodes, ..." |
| Enter | button "Add a condition" collapsed -- the attribute list does not open (63.png) |
| Enter | combobox "Find an attribute" expanded |
| type `na` | highlighted: option "name" |
| Enter | combobox "name: text to match" |
| Shift+Tab | combobox "name: how to match" value "Contains" |
| Enter, ArrowDown, Enter | "Starts with" taken; focus back in "name: text to match" |
| type `GAL` | live: "8 of 331 nodes" |
| Escape | text kept, list closed, picker open |
| Enter | button "Which nodes, 8 of 331 nodes, name starts with GAL, 8 nodes" |
| Tab x4 | Add to node shape, visibility, text, fill |
| Enter | textbox "Node color, not set, drawn #6366F1 indigo" (live: "Node color added: pick a value") |
| type `purple`, Escape | line taken back (live: "Node color not added"), focus on "Add to node fill" (as decided for a just-added line) |
| Enter, type `purple`, Enter | textbox "Node color, set here, purple" value "800080" (live: "Node color now purple, on 8 nodes") (84.png) |
| Escape | focus stays in the box |
| Tab | button "Node color by attribute" |

No step dropped focus to the page body.

## Skipped

Nothing. All three routes and three detours were walked to their end.
