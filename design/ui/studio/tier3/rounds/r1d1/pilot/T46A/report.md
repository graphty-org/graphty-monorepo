# T46 A re-pilot on build 6de5f95d12: Les Miserables, Javert's circle in red

Frozen build: `.study-builds/tier3-r1d1-6de5f95d12` (graphty 0.8.91). Every route started from
the empty app and ended with the six Louvain groups drawn, Group 3 (Javert's, 11 characters)
`FF0000` and the other five groups in their own colors, on the sample's own 77 characters and
254 ties. No script error or console error was reported on any route; the only failed requests
are the Sample library's thumbnails (defect 1 below).

The folders `5bd16cda6e/`, `pointer/` and `6de5-*` here are from earlier passes; this report is
about the four `r2-*` sessions.

| Route | Folder | Reached |
| --- | --- | --- |
| Success path by pointer | `r2-pointer/` (23 screenshots) | yes, 11 characters, Group 3 red |
| Detour: open the table, read Javert's group from the Nodes tab | `r2-table/` (18) | yes, the table names Group 3 and the same group was painted |
| The earlier report's detours (held fixed) | `r2-detours/` (55) | yes, after each detour was undone |
| Keyboard only, screen-reader output | `r2-keyboard/` (122, `--sr`) | yes |

The other routes in this pass's list belong to T45A, T46B, T47, T48, T50A, T50B, T38, T41 and
T51 and are walked by those tasks' pilots.

## 1. Success path by pointer (`r2-pointer/`)

1. "No thanks" (02). The start page has a "Samples" button and a "Samples" link in the top bar
   (03); the button opens the Sample library (05).
2. "Who holds the novel together" (06): Les Miserables, 77 nodes, 254 edges.
3. Analyze (07). 4. `louvain` (08). 5. Enter (09): the Louvain card, Run in focus.
6. Run (10): the "Louvain" folder and the "Color: Louvain" key (Group 1 to 6); the drawing did
   not move.
7-8. Find box, `Javert`, Enter (11-13): inspector "Javert", Memberships Louvain Group 3; the
   camera glides to Javert (settled 2026-10-20).
9. Folder caret (hover 14: tooltip "Expand Louvain", default cursor; 15): rows 20, 17, 11, 11,
   10, 8.
10. Group 3 (16): "Louvain: Group 3, 11 nodes", "11 of 77 nodes", Color `009E73`.
11-12. Color box, `red`, Enter (17-19): `FF0000`; Group 3 red in the drawing, the key and the
    tree.

Field checks: Escape keeps `FF0000` and focus (20); Tab goes to "Node color by attribute" (21);
the Undo tooltip reads "Undo changing node color on Group 3 Ctrl+Z" (23). 12 steps, as in the
key; the answer, 11, is on screen at steps 9 and 10.

## 2. Detour: the table's Nodes tab (`r2-table/`)

Same start and Louvain run (02-08). The toolbar's Table button (tooltip "Table Shift+T", 09)
opens the table (10) with tabs Nodes, Edges, Louvain; the drawing shrinks into the top half and
the key shows three rows and "3 more below".

- The Nodes tab's Louvain column reads "Group 6", "Group 1", ... (10). Scrolled (11), Javert's
  row reads **Group 3**, the name the tree, key and inspector use.
- Clicking Javert's row (12) selects him; Memberships Louvain Group 3.
- The Louvain tab (13), "Largest group first": 20, 17, 11, 11, 10, 8.
- Group 3's "..." (14), "Show members in table" (15): 11 rows, Javert among them, under a
  "Louvain: Group 3" chip.
- Memberships "Louvain Group 3" (16) opens Group 3's layer; `red`, Enter (17) paints it
  `FF0000`. Close table (18) restores the full drawing and the key's six rows.

## 3. Detours (`r2-detours/`, the earlier report's set)

- **Analysis filter words.** `circles` (06): "No analysis matches", in a tall empty popover;
  Enter does nothing (07); Escape clears, a second Escape closes the popover (08-09).
  `together` (11): only Edge betweenness. `community` (13): no match. `group` (15): Louvain,
  Leiden, Label propagation, Markov, Spectral, Hierarchical, Girvan-Newman, Connected
  components, Steps away.
- **The key over the drawing** (18-20): hover gives no tooltip; click and right-click do nothing.
- **Javert's node on the canvas** (25-27): hover shows a pointer cursor and no name (the selected
  node's name is left off by design; the card names it); right-click gives Neighborhood, Path
  between..., Frame selection, New layer from selection, Add note; Escape closes it.
- **The node's own Style tab** (28-31): Fill "+", `red`, Enter makes a one-node layer "Javert"
  ("Made layer Javert for 1 node", key "Color: Javert, 1 of 77 nodes") -- the known F trap.
  Control+Z undoes it ("Undid adding the layer Javert."), focus on "Add to node fill".
- **"Why this look" > "Open layer Louvain / Group 3"** (32-33): opens Group 3's layer with its
  color box focused and selected. A correct route.
- **The folder** (34-41): Color "<<Layer>>" with six swatches; a swatch names "Group 3" on hover
  and does nothing on click (35-36). The field opens "Color from each layer" (37; palette now
  "Eight distinct colors"); Group 3's swatch opens the picker (38); `red`, Enter (39) paints
  Group 3 with "Color: 1 changed" and Undo; Escape twice closes picker then table (40-41).
- **The folder's chain icon** (42-44): tooltip "One value for all: use orange for all 6 layers",
  default cursor; one click paints all six groups `E69F00`, the red one included ("Color: 5
  changed"); the inline "Undo the color change" restores all six, Group 3 red again.
- **Right-click on the Group 3 row** (45-46): Rename, Duplicate, Move to folder, Pin to top /
  bottom, Select what it paints, Hide, Lock, Delete; Escape closes it.
- **The Data place** (47): node attributes `id` and `name` only; the run's groups are not there.
- **Quick actions** (48-55, tooltip "Quick actions Ctrl+K"): `Javert`, `color` and `louvain` all
  give "No results"; Escape closes it.

## 4. Keyboard only, with screen-reader output (`r2-keyboard/`, `--sr`)

Nothing fell to the page body after the start.

- Start page Tab order: "Main menu", link "Samples", "Docs", "For developers", "GitHub",
  "Switch to dark mode", "Settings...", the demo canvas, "Communities" (pressed), "Key players",
  "Shortest path", "2D", "Pause the turning", "Open a file ...", "Open network data", "Samples",
  "New project", "MIT licensed on GitHub".
- Enter on the "Samples" button (22) scrolls the page down to the Sample library but leaves focus
  on the button; the next Tabs walk "New project", "MIT licensed on GitHub", "Put it on your own
  site" and scroll the page back up (25). Then the library: "Search samples", "Grid", "List", nine
  category buttons, "Open the Les Miserables sample" (16 Tabs from the button). Enter opens it:
  focus on heading "Graph, Les Miserables: 77 nodes, 254 edges", status "Les Miserables: 77
  nodes, 254 edges".
- F6 from there: Canvas "Graph drawing", then "Analyze". Enter: combobox "Filter analyses";
  `louvain` highlights option "Louvain"; Enter: "Run Louvain" (`--read`: Resolution, Weight,
  Advanced, "Under a second"). Enter runs it: focus back on "Analyze", status "Louvain finished:
  6 groups, each a layer in the Louvain folder of Style layers".
- `/` focuses "Find"; `Javert`, Enter: heading "Javert", status "Javert selected"; `--read`
  gives Memberships button "Louvain Group 3".
- F6 cycle (mapped twice): Find -> heading (inspector) -> Canvas -> Analyze -> Find. Shift+F6
  runs the reverse. Four regions; the top bar is not one of them (defect 3).
- From Find, Tab: "Add a layer or a folder", tree at "Everything" (its resting row). ArrowUp to
  "Louvain, folder, 6 layers" collapsed, ArrowRight expands, ArrowDown three times to "Group 3,
  node layer, 11 nodes", Enter selects it with focus kept in the tree.
- F6: heading "Group 3". Tab: "Select what it paints", "Layer actions", tab "Style", tab "Node",
  "Which nodes, 11 of 77 nodes, Louvain: Group 3, 11 nodes", "Add to node shape", "... visibility",
  "... text", "Pick node color", textbox "Node color, set here, green" "009E73" (10 Tabs).
- `red`, Enter: "Node color, set here, red" "FF0000", status "Node color now red, on 11 nodes".
  Escape keeps focus and value; Tab to "Node color by attribute", Shift+Tab back. "Pick node
  color", Enter: textbox "Color value" "FF0000"; Escape returns focus to "Pick node color".
- Shorter route: Javert's inspector, Tab four times to "Louvain Group 3", Enter: focus on heading
  "Group 3" (122, no focus ring), Group 3's layer open.
- Final screen 122: Group 3 red, the others in their colors.

## Answer key against the screen

- The key's "Table's Nodes tab" paragraph (0-based numbers, Javert's row reading 2) no longer
  holds: the column reads "Group 3" for Javert (settled 2026-10-20). The key needs it rewritten.
- Step 1 "Samples" is now one of two controls of that name (button under "Open a file", link in
  the top bar); the start page's demo shows a "Communities" chip and "Colored by community: 6
  groups, each more linked inside than out."
- The folder's color table names its palette "Eight distinct colors", not "Nineteen contrasting
  c..." as the key says.
- By keyboard, the opened group layer's color box is 10 Tabs from the layer's heading (reached
  by F6), not "14 Tabs on" from the tree as the key says for A.
- Everything else on the success path matched: 12 steps, Group 3 of 11, `009E73`, the caret
  tooltip, Escape and Tab in the color box, the Undo tooltip.

## Defects

Nothing on any route crashed, blocked the task or gave a wrong group or count.

1. The Sample library shows a broken-image icon on every card: each thumbnail request to
   `https://graphty.app/data/graph-samples/v1/*.webp` fails with `net::ERR_BLOCKED_BY_ORB`
   (the browser refused the response as an image). Titles still read. (`r2-pointer/05.png`)
2. Keyboard: Enter on the start page's "Samples" button scrolls to the Sample library but leaves
   focus on the button, so the next three Tabs walk the start page and scroll it back up before
   reaching the library's search. (`r2-keyboard/22.png`, `25.png`)
3. Keyboard: F6 cycles four regions (left panel at Find, inspector, canvas, canvas toolbar); the
   top bar is never reached, where the settled behavior names five regions including the top bar.
   (`r2-keyboard/`, the F6 and Shift+F6 cycles before the tree)
4. Keyboard: a second Escape on Group 3's layer inspector (focus on "Pick node color", after the
   picker had closed) cleared the node selection ("Selection cleared: 1 node", Selected 1 to 0),
   where the settled behavior says a layer's inspector leaves the selection alone. It changes no
   color. (`r2-keyboard/111.png`)
5. Known and unchanged, recorded for the count: no prompt word ("circles", "community") finds an
   analysis and "together" finds only Edge betweenness (`r2-detours/06`, `11`, `13`); the key over
   the drawing is inert (`18-20`); the node's own Fill makes a one-node layer (`30`); the folder's
   chain icon repaints every group in one click (`43`); the swatch strip does nothing on click
   (`36`); the Data place does not list the run's groups (`47`); Quick actions finds no node,
   analysis or styling command (`50`, `52`, `54`); by keyboard the heading "Group 3" draws no
   focus ring after Memberships (`r2-keyboard/122.png`).

## Not walked

Nothing on this task was skipped.
