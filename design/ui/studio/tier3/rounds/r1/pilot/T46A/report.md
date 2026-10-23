# T46 A pilot on build e3c5bca8e6: Les Miserables, Javert's circle in red

Frozen build: `.study-builds/tier3-r1-e3c5bca8e6` (graphty 0.8.68). Every route started from the
empty app. All three sessions end with the same drawing: the six Louvain groups, Group 3 drawn
`FF0000` and the other five groups unchanged. Every session has the same 77 characters and 254
ties as the sample. No session lost any work (`work.json`: nothing gone), and the browser
reported no script errors.

| Route | Folder | Reached |
| --- | --- | --- |
| Success path by pointer | `f-pointer/` (20 screenshots) | yes, 11 characters, Group 3 red |
| Detours | `f-detours/` (50 screenshots) | yes, after each detour was undone |
| Keyboard only, screen-reader output | `f-keyboard/` (87 screenshots, `--sr`) | yes |

## 1. Success path by pointer (`f-pointer/`)

1. "No thanks" (02). 2. Les Miserables (03): 77 nodes, 254 edges. 3. Analyze (04).
4. Typed `louvain` (05): one match under "Find groups", Louvain with a "Start here" badge.
5. Enter (06): the Louvain form, with Run in focus. 6. Run (07): a "Louvain" folder appears and the
"Color: Louvain" key (Group 1 to 6) opens at the top left. The drawing moves and shrinks: in
03 it spans about x 520-1015, y 85-730, and in 07 about x 690-1120, y 150-680.
7-8. Find box, `Javert`, Enter (08-10). The list shows Nodes 1 and Edges 17. The inspector is
titled "Javert" with Memberships Louvain, Group 3.
9. The folder caret (hover 11: tooltip "Expand Louvain", default cursor; 12): the rows read
20, 17, 11, 11, 10, 8.
10. Group 3 (14). Clicking it by name is ambiguous, because the Memberships button is also called
"Louvain Group 3". The row shows 11, and the Style tab shows "Louvain: Group 3, 11 nodes".
11. Color box (15): it selects `009E73`.
12. Typed `red`, then Enter (17): `FF0000`. Group 3 is red in the drawing and in the key.
The field checks: Escape keeps `FF0000` and keeps focus (18). Tab goes to "Node color by
attribute" (19). The Undo tooltip reads "Undo changing node color on Group 3 Ctrl+Z" (20).

Steps: 12, as in the answer key. The answer, 11, is on screen at steps 9 and 10.

## 2. Detours (`f-detours/`)

- **The prompt's own words in the analysis filter.** `circles` gives "No analysis matches
  "circles"" (04). Enter does nothing (05). Escape clears the filter (06), and a second Escape
  closes the popover with focus back on Analyze (07). `together` gives only Edge betweenness, a
  ranking and so a wrong turn (09). `community` gives no match (10), although the Les Miserables
  sample card on the start screen says "Good for a first look at communities". `group` lists
  Louvain ("Start here"), Leiden, Label propagation, Markov, Spectral, Hierarchical,
  Girvan-Newman, Connected components and Steps away (11).
- **The key over the drawing.** Hovering (14), clicking (15) or right-clicking (16) "Group 3" in
  the "Color: Louvain" key does nothing: no tooltip, no menu, no sizes.
- **Javert's node on the canvas.** Hovering gives no tooltip and no name (17); only the Hovered
  count shows 1. Right-clicking (18) opens Neighborhood, Path between..., Frame selection,
  New layer from selection and Add note. Nothing there reaches the node's group.
- **Styling from where the reader is (the node's own Style tab).** Fill "+" (21) shows `009E73`
  in italics with "Not set yet: the first color you pick makes the layer". `red` and Enter (22)
  make a one-node layer "Javert" ("Made layer Javert for 1 node"). The key then adds "Color:
  Javert, 1 of 77 nodes", and only Javert is red. This is the F trap. Control+Z in the field (24)
  undoes it, with the notice "Undid adding the layer Javert." and focus on Fill "+".
- **"Why this look" > "Open layer Louvain / Group 3"** (25-26) opens Group 3's layer and expands
  the folder. This is a correct route.
- **The folder.** Clicking "Louvain" (27) shows Color «Layer» with a strip of six swatches.
  Hovering a swatch shows "Group 3" (29), but clicking it does nothing (30). Clicking the «Layer»
  field (31) opens "Color from each layer". Group 3's swatch (32) opens a picker that covers the
  middle of the drawing. `red` and Enter (33) paint Group 3 red, with "Color: 1 changed" and Undo.
  The picker closes and the table stays open. Escape twice (34-35) closes the table.
- **The folder's chain icon** ("Give all 6 layers one node color", tooltip "One value for all:
  use orange for all 6 layers", default cursor; 36). One click paints every group orange, the red
  one included (37), with "Color: 5 changed". The inline Undo restores the six colors (38).
- **Right-clicking the Group 3 row** (39) gives Rename, Duplicate, Move to folder, Pin, "Select
  what it paints", Hide, Lock and Delete. Escape closes the menu (40).
- **The Data place** (41) lists only `id` and `name` as node attributes. The run's groups are not
  there, so a reader who goes to Data to count the circle finds nothing.
- **The toolbar's magnifier ("Quick actions", Ctrl+K)** (42-50). `Javert` gives "No results"
  (44), `color` gives "No results" (46) and `louvain` gives "No results" (49). Empty, it lists
  Go to, Graph tree and similar commands (48). Escape closes it, with focus on the button (47, 50).

## 3. Keyboard only, with screen-reader output (`f-keyboard/`, `--sr`)

These are the focus names in order. Nothing fell to the page body during the walk.

- Start screen Tab order: "Main menu", "Local only", "Settings...", "Open project or file...",
  "New from data...", "Open the Les Miserables sample", then the karate club, College football
  and Florentine families samples. Shift+Tab three times returns to Les Miserables, and Enter
  opens it. Focus goes to heading "Graph, Les Miserables: 77 nodes, 254 edges", with the live
  status "Les Miserables: 77 nodes, 254 edges".
- The Tab cycle from there: "From Les Miserables", "Graph actions", tab "Values", "About
  Direction", "About Degree", separator "Resize inspector" (value "240 pixels (min)"), "Main
  menu", "Project: Les Miserables", "Local only", "Graph", "Graph Les Miserables", combobox
  "Find", "Add a layer or a folder", treeitem "Everything, node and edge layer, 77 nodes, 254
  edges", "Graph settings", separator "Resize left panel", Canvas "Graph drawing", "Analyze".
  That is 18 Tabs from the opened graph to Analyze.
- Analyze, Enter: combobox "Filter analyses". Typing `louvain` highlights option "Louvain".
  Enter: focus on "Run Louvain". `--read` gives the form "Louvain" with Resolution, Weight,
  Advanced and "Under a second". Enter runs it. Focus returns to "Analyze", and the live status
  reads "Louvain added, running", then "Louvain finished: 6 groups, each a layer in the Louvain
  folder of Style layers".
- `/` focuses "Find". Typing `Javert` highlights option "Javert", and Enter moves focus to
  heading "Javert" with "1 node selected". `--read` gives Summary id, name, "Degree 17", then
  Memberships button "Louvain Group 3".
- Shift+Tab: "Analyze", Canvas, "Resize left panel", "Graph settings", then the tree on
  "Everything". In the tree, ArrowUp, ArrowDown and ArrowRight expand "Louvain, folder, 6 layers"
  and move to "Group 3, node layer, 11 nodes". Enter selects it and opens it in the inspector,
  with focus kept in the tree.
- Tab: "Graph settings", "Resize left panel", Canvas, "Analyze", "Select what it paints",
  "Layer actions", tab "Style", tab "Node", "Which nodes, 11 of 77 nodes, Louvain: Group 3, 11
  nodes", "Add to node shape", "Add to node visibility", "Add to node text", "Pick node color",
  then textbox "Node color, set here, green" with value "009E73". That is 14 Tabs.
- Typing `red` replaces the value. Enter gives "Node color, set here, red" with value "FF0000"
  and the live status "Node color now red, on 11 nodes". Escape keeps focus and the value. Tab
  goes to "Node color by attribute", and Shift+Tab comes back. "Pick node color" with Enter puts
  focus on textbox "Color value" "FF0000", and Escape returns focus to "Pick node color".
- The shorter route: from Javert's inspector, Tab four times to button "Louvain Group 3". Enter
  opens Group 3's layer with focus on heading "Group 3".
- Final screen: 87.png. Group 3 is red and the other groups keep their colors.

## Answer key against the screen

- After Run, the drawing moves right and shrinks to clear the key (07 against 03). The key says
  "the drawing keeps its size and place".
- On keyboard, the Memberships button now leaves focus on heading "Group 3". The key says focus
  falls to the "Resize inspector" separator, with the color box 6 Shift+Tabs back.
- After the color table's picker takes `red` and Enter, the picker closes and the table stays
  open (f-detours/33). The key says the picker "stays open after Enter".
- The `group` filter also lists Girvan-Newman and Connected components, which are not in the
  key's list of community analyses.
- Everything else matched: the group sizes 20, 17, 11, 11, 10, 8; Javert in Group 3, 11; the
  `009E73` start color; the Undo tooltip; the caret tooltip; Escape and Tab in the field; the
  one-node-layer trap; the chain-icon trap with its inline Undo; and the dead key over the drawing.

## Defects

1. Neither of the prompt's words, "circles" and "community", finds an analysis, and "together"
   finds only Edge betweenness. The start screen's sample card itself says "communities".
   (f-detours/04, 09, 10)
2. The "Color: Louvain" key over the drawing does nothing on hover, click or right-click, and
   shows no sizes. It looks like a list of the groups. (f-detours/14-16)
3. A node on the canvas shows no name or tooltip on hover, so a reader cannot find Javert by
   looking at the drawing. (f-detours/17)
4. The node's own Style tab, Fill "+", then a color makes a one-node layer. The notice says
   "Made layer Javert for 1 node" and gives no pointer to the node's group layer. A reader can
   believe the circle is done. (f-detours/22)
5. The folder's chain icon paints every group one color with one click, the group already
   changed included, and its pointer is the default arrow. Undo is offered inline.
   (f-detours/36-37)
6. The folder's swatch strip shows a group name on hover but does nothing on click.
   (f-detours/29-30)
7. The Data place does not list the run's groups among the node attributes. (f-detours/41)
8. The magnifier "Quick actions" in the toolbar looks like search but finds no node ("Javert"),
   no analysis ("louvain") and no styling command ("color"). It answers "No results".
   (f-detours/44, 46, 49)
9. By keyboard the layer tree is entered at "Everything", the last row, not at its first item.
   (f-keyboard: the first Tab into the tree, and the Shift+Tab return)
10. By keyboard, the drawing to Analyze takes 18 Tabs, and the open layer to its color field
    takes 14 Tabs (through "Select what it paints", "Layer actions", the tabs and four "+"
    buttons). (f-keyboard)
11. After Run, the drawing moves and shrinks without being asked. (f-pointer/07 against 03)

## Not walked

Nothing on this task.
