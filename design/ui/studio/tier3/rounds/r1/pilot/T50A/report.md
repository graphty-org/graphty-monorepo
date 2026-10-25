# Pilot: T50 A (which characters are orange in lesmis-poster, and why)

Build e3c5bca8e6 (frozen, `.study-builds/tier3-r1-e3c5bca8e6`). Five sessions, each from the
empty start screen, each ended: `p2-pointer/` (success path by pointer), `p2-detours/` (the
commonest detours), `p2-keyboard/` (success path by keyboard only, in screen-reader mode),
`p3-detours/` and `p3-detours-selected/` (the detours section 4 lists: the consent notice left
open, the main menu, Control+O, the find box then styling, a new card typed into at once, "Use
the selected nodes", and the rewrite of the colleague's rule).
Screenshot paths are relative to this folder. Nothing in the project changed in any session
(`p2-*/styles.json`: `changed` and `gone` empty); the data stayed the project's 77 characters and
254 ties the whole way. No script error, console error or failed request was printed in any step.

Folders without the `p2-` prefix are earlier walks of older builds, kept for history.

## Summary

Reached by pointer and by keyboard. By pointer the success path is the answer key's 4 steps:
the project opens with three orange dots and the key "Color: Poster / 3 of 77 nodes"; the layer
row "Poster" opens on Style with "Which nodes 3 of 77 nodes" and the chip "name contains Mlle, 3
nodes"; Values lists the members by id (MlleBaptistine, MlleGillenormand, MlleVaubois). By
keyboard the rule is spoken on the layer's "Which nodes" button and the members are Tab stops on
Values. Focus never fell to the page body after the start. The answer key's description of
opening the rule is stale (see Mismatches). The defects are on the detours: the key line does
nothing when clicked, "Select what it paints" names nobody, and members are given only by id.

## 1. Success path by pointer (`p2-pointer/`) -- reached

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | start screen | p2-pointer/02.png |
| 2 | Open project or file..., lesmis-poster.graphty.json | 3 orange dots; key "Color: Poster / 3 of 77 nodes"; layers Hovered 0, Selected 0, Poster 3, Everything 77; notice "Opened lesmis-poster" | p2-pointer/03.png |
| 3 | layer row "Poster" | inspector "Poster / Node layer", Style: Which nodes 3 of 77 nodes, chip "name contains Mlle, 3 nodes", Fill Color FFA500 | p2-pointer/04.png |
| 4 | Values tab | Covers: Matched nodes 3; Where its look shows: Node color on 3 of 3 nodes; Members MlleBaptistine, MlleGillenormand, MlleVaubois | p2-pointer/05.png |
| 5 | click member MlleBaptistine | node selected; inspector "MlleBaptistine / Node", name "Mlle Baptistine", Degree 3 | p2-pointer/06.png |
| 6 | node's Style | "Why this look": Selected (Glow, Halo), Poster (Color), Everything (Size, Shape) | p2-pointer/07.png |
| 7 | "Open layer Poster" in Why this look | the layer opens on Style (the tab last shown) | p2-pointer/08.png, 09.png |
| 8 | click the chip | card: name / Contains / Mlle, Match case, Add a condition, Done; focus in the Mlle box; no list open | p2-pointer/10.png |
| 9 | Escape | card closes, rule unchanged, focus on the Which nodes header | p2-pointer/11.png |
| 10 | Escape again | nothing more | p2-pointer/12.png |
| 11 | chip, then Enter in the Mlle box | card closes, rule unchanged | p2-pointer/13.png |
| 12 | chip, Tab x3 | Mlle box -> Match case -> Add a condition -> Done; rule unchanged | p2-pointer/14.png - 16.png |
| 13 | Escape; click the key line "Color: Poster"; hover it | nothing happens; tooltip null | p2-pointer/17.png - 19.png |

## 2. Detours (`p2-detours/`)

**a. "New from data..." with the project file.** "Open as a new graph" with "Choose a file..."
(03.png); the project file opens exactly as through "Open project or file", same layers and key
(05.png). Matches the answer key.

**b. The key read without opening the layer.** Clicking "Color: Poster" in the key does nothing:
no layer opens, nothing is selected, no tooltip (06.png). The reader gets the layer's name and 3
of 77 nodes but no way from the key to the rule.

**c. Hovering, clicking and right-clicking an orange dot.** Hover shows no name and no tooltip on
either dot, only a hand pointer (07.png, 08.png). Right-click selects the node and offers
Neighborhood, Path between..., Frame selection, New layer from selection, Add note -- nothing about
its look (09.png). The inspector titles the node by its id (MlleBaptistine) and gives the name
only as a value.

**d. The find box.** "orange": "No match for "orange". Still selected: 1 node. To select by a value,
type a rule such as name == 'Napoleon'" (11.png); Enter keeps it (12.png); Escape clears the box,
focus stays (13.png). A color cannot be searched and nothing points to the key or the layer.
"Mlle" lists Nodes 3, Edges 10 and three "name is ..." values (14.png); Enter takes the first node
and closes the list (15.png). The three names and the shared word are readable here, but not that
this is what the project's color reads (graded "rule not read").

**e. Layer row right-click > Select what it paints.** The menu: Rename, Duplicate, Move to folder,
Pin to top, Pin to bottom, Select what it paints, Hide, Lock, Delete (16.png). Select what it
paints selects the 3 orange nodes; the inspector reads "3 nodes selected": Nodes 3, Edges joining
these nodes 1, Degree 1 to 7, id "3 of 3 have a value", name "3 of 3 have a value" -- it names none
of them (18.png). Matches the answer key.

**f. The table.** Toolbar Table: 77 rows "In the order loaded", id and name; the selected rows are
highlighted where they fall, so only MlleBaptistine is on screen and the other two need scrolling
(19.png). Table options holds only Export... (20.png). No column shows a node's color.

**g. Everything's Color line.** Fill Color 6366F1, "Covered by Poster on 3 of 77", Poster a link
(22.png); the link opens the Poster layer on Style (23.png).

**h. The color box and its picker opened and closed again.** The box (spoken "Node color, set
here, orange"): Escape keeps focus in the box with FFA500 selected, Enter keeps it, Tab moves to
"Node color by attribute" (24.png - 27.png). The swatch "Pick node color" opens the Color picker;
Escape closes it and focus returns to the box, FFA500 unchanged (28.png, 29.png). Nothing changed.

**i. The Data panel.** Sources: Les Miserables, 77 nodes, 254 edges; Filters; Attributes id, name
(nodes) and shared_chapters (edges). Nothing about color (30.png).

## 2b. Further detours (`p3-detours/`, `p3-detours-selected/`)

**j. Consent notice left open; project opened from the Main menu.** Main menu: New project, Open
project or file... (Ctrl+O), Open sample, Settings..., Keyboard shortcuts, Help (p3-detours/02.png).
"Open project or file..." opens the project as from the start screen. The usage-data notice goes
away when the graph opens, never answered, with nothing saying it was put aside (03.png).

**k. Control+O with the project open.** The file chooser opens; choosing lesmis-poster again
reopens it in place: same 77 nodes, 254 edges, same four layers and key, notice "Opened
lesmis-poster" (04.png, 05.png). Nothing is added to the open graph.

**l. The find box, then styling what it selected.** "Mlle" lists Nodes 3, Edges 10 and three
"name is ..." values (06.png). Clicking the "Nodes 3" heading does nothing: there is no way to
take all three matches at once (07.png). Picking MlleBaptistine selects it and clears the box
(08.png, 09.png). The "+" beside Style layers offers Layer, Folder, Select layers..., Analyze...
(10.png); Layer adds "Layer 1" (77 of 77) with its name box open; Enter keeps the name (11.png,
12.png). Which nodes > Add a condition lists only name and Node id; nothing offers the one
selected node (13.png, 14.png).

**m. Typing straight after adding a card.** "name" puts focus in the card's text box; typing
"Mlle" lands there: 3 of 77, with the list open (15.png, 16.png). The list shows "Mlle
Gillenormand" highlighted, because the pointer still rests where "name" was clicked; Enter keeps
"Mlle" all the same, closes the card and leaves focus on Which nodes (17.png). Control+Z three
times takes it all back: "Undid adding Layer 1." (18.png - 20.png).

**n. Right-click a selected orange dot > New layer from selection.** The canvas menu offers it
(21.png). Chosen, nothing visible changes: no layer, no notice, the inspector stays on the
node's Values tab (22.png); after 2 seconds still no layer (23.png). Again on MlleVaubois, the
same (24.png, 25.png). Only opening the node's Style tab by hand shows "The first style you set
makes a layer for the selected node." (26.png), which is where the item is meant to take the
reader.

**o. The colleague's rule rewritten (the answer key's wrong turn).** Why this look > Open layer
Poster, then the chip: card open, list closed (27.png, 28.png). One ArrowDown opens the list with
nothing highlighted; Enter closes the card, rule unchanged (29.png, 30.png). Opened again,
ArrowDown twice highlights "Mlle Baptistine"; Enter rewrites the rule: chip "1 node", Poster 1,
key "1 of 77 nodes", two dots turn blue, card stays open (31.png - 33.png). Control+Z: "Undid
changing the conditions on Poster.", 3 of 77, and the open card shows "Mlle" again at once
(34.png). Escape closes the card (35.png). `p3-detours/styles.json` ends with Poster as loaded.

**p. "Use the selected nodes".** With MlleBaptistine selected, a new layer's Add a condition >
Node id gives a card with "Use the selected nodes" (p3-detours-selected/09.png); it sets "Is one
of these, 1 node: MlleBaptistine", 1 of 77 (10.png). Escape closes the card as "Picked by hand: 1
node" (11.png). The button is on the Node id card only, not on the name card a reader reaches for
first (detour l). Control+Z x3 removes Layer 1 (12.png).

## 3. Success path by keyboard (`p2-keyboard/`, keyboard only, screen-reader mode) -- reached

Every focused control and its spoken name, in order (screenshots 02.png - 62.png, one per key):

1. Tab from the start: Main menu, Local only, Settings..., Open project or file..., New from
   data..., Open the Les Miserables sample, ... karate club ..., ... College football ..., ...
   Florentine families sample, DisclosureTriangle "What is collected" collapsed, Share usage data,
   No thanks; one more Tab wraps to Main menu. The usage-data notice is last, as settled.
2. Shift+Tab to "No thanks", Enter: focus moves to "Open project or file..."; live "Usage data
   stays off. Change this in Settings > Privacy".
3. Enter on "Open project or file...", the file chosen: focus on heading "Graph, lesmis-poster: 77
   nodes, 254 edges"; live "Opened lesmis-poster" (19.png).
4. Tab goes to "From Les Miserables" in the inspector; Shift+Tab walks back: Analyze (toolbar,
   collapsed), Canvas "Graph drawing", separator "Resize left panel", Graph settings, treeitem
   "Everything, node and edge layer, 77 nodes, 254 edges", Add a layer or a folder, combobox
   "Find". The key over the drawing is never a Tab stop.
5. Tab back into the tree lands on Everything (the last row); ArrowUp: treeitem "Poster, node
   layer, 3 nodes"; Enter opens it (31.png).
6. Tab: Graph settings, Resize left panel, Graph drawing, Analyze, then the inspector: "Select
   what it paints", "Layer actions", tab "Style" selected, tab "Node" selected, checkbox "Style
   nodes" checked, button "Which nodes, 3 of 77 nodes, name contains Mlle, 3 nodes" collapsed --
   the rule is read here (41.png). Then "Add to node shape", "Add to node visibility".
7. Enter on Which nodes: focus in combobox "name: text to match" value "Mlle" collapsed. Tab:
   Match case. Shift+Tab: Mlle box, combobox "name: how to match" value "Contains", button "Remove
   name" (in the header, before the values, as settled). Escape: back on Which nodes, rule
   unchanged (51.png).
8. Shift+Tab to tab "Style", ArrowRight: tab "Values" selected. Tab: buttons "MlleBaptistine",
   "MlleGillenormand", "MlleVaubois", then "Resize inspector" (59.png). Browse mode reads Covers,
   Matched nodes 3, Where its look shows, Node color on 3 of 3 nodes, Members and the three.
9. Enter on MlleVaubois: focus on heading "MlleVaubois", live "1 node selected". Escape: selection
   cleared (as settled), live "Selection cleared: 1 node", focus on heading "Graph, lesmis-poster:
   77 nodes, 254 edges" and the inspector shows the whole graph, not the Poster layer (62.png).

Focus never fell to the page body after the first key.

## Mismatches between the answer key and the screen

- The answer key's "Another route" says opening the rule chip "on A, opens a list of the three
  names under it, over Match case, Add a condition and Done; the first Escape closes the list and
  the second the card". On this build the card opens with no list (settled in `decided.md`,
  "Opening an existing card changes nothing") and the first Escape closes the card
  (p2-pointer/10.png, 11.png; keyboard p2-keyboard, step 7). The key's text is out of date.
- The key says "ArrowDown and Enter on a name in that list rewrites the rule". On this build one
  ArrowDown only opens the list (nothing highlighted) and Enter leaves the rule alone; it takes two
  ArrowDowns and Enter (p3-detours/29.png - 33.png).
- The key says after Control+Z "the open card shows the old text until Escape". On this build the
  open card shows the restored "Mlle" at once (p3-detours/34.png).
- Everything else on the success path matches the key: the key line "Color: Poster, 3 of 77
  nodes", "Which nodes 3 of 77" with the chip "name contains Mlle, 3 nodes", members by id,
  "New from data..." opening the project the same way, "Why this look" opening the layer on the
  tab last shown, "Covered by Poster on 3 of 77", Select what it paints naming none.

## Defects

1. **The key line does nothing.** Clicking "Color: Poster" in the key over the drawing opens
   nothing and selects nothing, and hovering it gives no tooltip; it is not a Tab stop either.
   A reader who starts from the legend has no way from it to the layer that sets the color.
   Detours b and pointer 13: p2-detours/06.png, p2-pointer/18.png, 19.png.
2. **"Select what it paints" names nobody.** It selects the 3 nodes, but the selection's summary
   gives only counts ("name 3 of 3 have a value"), so the reader still cannot say which
   characters. Detour e: p2-detours/18.png.
3. **Members are given only by id.** The layer's Values tab lists MlleBaptistine,
   MlleGillenormand, MlleVaubois, and a screen reader speaks the same run-together ids; the name
   column ("Mlle Baptistine") appears only after opening a member. The node inspector's title is
   the id as well. Pointer 4-5 and keyboard 8: p2-pointer/05.png, 06.png, p2-keyboard/59.png.
4. **Escape after looking at a member loses the layer.** Enter on a member selects it; Escape
   clears the selection (settled) but the inspector then shows the whole graph and focus lands on
   its heading, so a reader checking the members one by one must find and reopen the layer each
   time. Keyboard 9: p2-keyboard/62.png.
5. **Entering the layer tree lands on the last row.** Tab or Shift+Tab into the tree after the
   project opened lands on Everything, the last row, not the first (Hovered); `decided.md` says the
   tree is entered at its first item. Keyboard 4-5: p2-keyboard/25.png, 29.png.
6. **No hover name on a node.** Hovering an orange dot shows no name or tooltip; names come only
   from a click (the answer key records this). Detour c: p2-detours/07.png, 08.png.
7. **Color cannot be searched and the find box does not point anywhere useful.** "orange" gives
   no match and a hint about typing a rule over name, with nothing about the key or the layers.
   Detour d: p2-detours/11.png.
8. **The table cannot show only the selection or a color.** After Select what it paints, the
   table keeps all 77 rows in load order with the 3 highlighted in place, so two of the three are
   off screen. Detour f: p2-detours/19.png.
9. **After the project opens, focus is on the inspector's heading.** The next Tab goes into the
   inspector ("From Les Miserables"), and the layer list is reached only by going backwards
   through the toolbar, drawing and panel edge (6 keys). Keyboard 3-4: p2-keyboard/19.png - 27.png.
10. **"New layer from selection" shows nothing.** From the canvas menu on a selected node it
   adds no layer, posts no visible notice and leaves the inspector on the node's Values tab; the
   Style tab it means to open ("The first style you set makes a layer for the selected node")
   is reached only by clicking Style by hand. Walked after three undos in the same session, twice.
   Detour n: p3-detours/22.png, 23.png, 25.png, 26.png.
11. **The find box cannot take all its matches.** "Mlle" finds 3 nodes, but the "Nodes 3"
   heading does nothing and picking a match takes one and empties the box, so a reader cannot
   select (or style) the three together from there. Detour l: p3-detours/07.png, 09.png.
12. **"Use the selected nodes" is only on the Node id card.** A reader who reaches for the name
   card (the first attribute listed) never sees it. Detours l, p: p3-detours/14.png,
   p3-detours-selected/09.png.
13. **The usage-data notice disappears unanswered.** Left open while the project is opened from
   the Main menu, it is gone when the graph shows, with no word on where to answer it later.
   Detour j: p3-detours/02.png, 03.png.

## Not walked

Nothing. Every route the task's detour list names for T50 A was walked on this build.
