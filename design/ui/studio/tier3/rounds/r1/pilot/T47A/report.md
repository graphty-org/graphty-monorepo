# Pilot: T47 A (every circle as cubes, colors kept, Les Miserables)

Build e3c5bca8e6 (frozen, `.study-builds/tier3-r1-e3c5bca8e6`). Four sessions, each from the empty
start screen, each ended. Screenshot paths are relative to this folder. The folders `pointer/`,
`detours/` and `keys/` are walks of an earlier build and are not part of this pilot.

## 1. Success path by pointer (`e3c-pointer/`) -- reached in 11 steps

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | start screen | e3c-pointer/02.png |
| 2 | Les Miserables | 77 nodes, 254 edges, all indigo balls | e3c-pointer/03.png |
| 3-5 | Analyze, type `louvain`, Enter | Louvain "Start here"; settings with Run | e3c-pointer/05.png, 06.png |
| 6 | Run | Louvain folder (6 groups), "Color: Louvain" key top left | e3c-pointer/07.png |
| 7 | Louvain folder row | "6 layers in Louvain. Layers added later are not changed."; Color shows the purple "Layer" token with six swatches; Which nodes "Louvain: <<Layer>>" | e3c-pointer/08.png |
| 8 | Shape "+" ("Add to node shape") | menu Shape, Size | e3c-pointer/10.png |
| 9 | Shape | Shape line, "Icosphere" in italics | e3c-pointer/11.png |
| 10 | click the box ("Node shape, default Icosphere") | grid of 25 shapes, Icosphere highlighted | e3c-pointer/13.png |
| 11 | Box | cubes in six colors; "Shape: 6 changed" and Undo; key gains "Shape: Louvain / Box" | e3c-pointer/14.png |

Field checks: Escape in the open list closes it and keeps Box and focus (e3c-pointer/16.png); Tab
in the open list closes it and moves to "Node shape by attribute" (e3c-pointer/17.png).

Data check: the same 77 people and 254 ties throughout. End state (`e3c-pointer/styles.json`):
group-1 to group-6 each keep their own `node.color` (e69f00, 56b4e9, 009e73, 0072b2, d55e00,
cc79a7) and carry `node.shape: box`; counts 20, 17, 11, 11, 10, 8. Grade on this route: S,
`Route: folder`, `Token: not touched`.

## 2. Detours (`e3c-detours/`)

**a. Styling from where they are (the graph's own Style tab).** It holds only Canvas and Labels:
no node look at all (e3c-detours/05.png). Dead end.

**b. The color key.** Clicking "Group 1" in the key does nothing (e3c-detours/06.png).

**c. Right-click a node** (Myriel): Neighborhood, Path between..., Frame selection, New layer from
selection, Add note -- nothing about the cluster (e3c-detours/07.png). Escape closes the menu;
Myriel stays selected.

**d. The node's own Style tab, Shape "+" > Shape.** An unset italic Icosphere line with "Not set
yet: the first shape you pick makes the layer" (e3c-detours/11.png). Typing the prompt's word
`cube` into the open list highlights nothing and shows no message; the typed word appears only in
a small footer line, and Enter does nothing (e3c-detours/13.png, 14.png). Escape closes the list
(e3c-detours/15.png). Typing `box` highlights Box (e3c-detours/16.png) and Enter makes a one-node
layer "Myriel" ("Made layer Myriel for 1 node"); the one cube is hidden under the selection glow
(e3c-detours/17.png): F if left. Control+Z removes it ("Undid adding the layer Myriel."), focus
back on Shape "+" (e3c-detours/18.png).

**e. "Why this look" > Everything (route around).** The link opens Everything; its Shape set to
Box makes every node a cube in its own color, with no "changed" line and no shape entry in the key
(e3c-detours/20.png, 22.png): S, `Route: around`. Control+Z restores (e3c-detours/23.png).

**f. The folder's color field (the purple token).** Opens "Color from each layer": palette, a
table of the six groups with counts, No value. Nothing about shape (e3c-detours/26.png). Escape
closes it and keeps focus on the token (e3c-detours/27.png).

**g. The find box and Quick actions.** `cube` in the find box: "No match for "cube"" with a rule
hint (e3c-detours/28.png); Enter does nothing; two Escapes leave the box and keep the selection
(e3c-detours/31.png). Control+K, `cube`: "No results" (e3c-detours/57.png); Escape closes it
(e3c-detours/58.png).

**h. The group layers.** The folder's caret (tooltip "Expand Louvain", default cursor) expands
it (e3c-detours/33.png). Group 1, Shift+click Group 6 picks all six; Shape "+" > Shape > Box gives
"Shape: 6 changed" (e3c-detours/35.png, 38.png): S, `Route: several`. Group 3 alone: Shape "+" >
Shape adds an unset line, Box applies to its 11 (e3c-detours/43.png, 44.png): `one by one` works.

**i. Undo from the inline Undo, then Box again (a defect).** After the inline "Undo" on the six
picked layers the drawing goes back to balls but the open inspector's Shape line still reads Box
as set (e3c-detours/39.png). The same on the folder (e3c-detours/50.png): the box shows "Box", the
list shows Box with a check (e3c-detours/52.png), and clicking Box does nothing
(e3c-detours/51.png, 53.png). Only picking another shape (Sphere) and then Box brings the cubes
back (e3c-detours/55.png). Reopening the layers shows the true unset state (e3c-detours/43.png,
46.png).

**j. Opening a file from the start screen** (`e3c-detours2/`). "Open project or file..." opens the
browser's file chooser (e3c-detours2/03.png); with no file to pick, the participant goes back to
the samples and Les Miserables opens normally (e3c-detours2/05.png).

**k. Main menu.** Back to start, New project, Open project or file..., Open sample, Save, Save as...,
Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help: nothing about looks or
clusters (e3c-detours2/06.png). Escape closes it (e3c-detours2/07.png).

**l. The canvas toolbar.** Hovering each button gives Analyze (Shift+A), Layout, View, 3D, Legend
(L), Table (Shift+T), Filters, Quick actions (Ctrl+K), each with the default arrow pointer
(e3c-detours2/08.png to 14.png). The View menu (2D, 3D, VR / AR, Fit, Frame selection, Front, Side,
Top, Isometric) has nothing about node shape (e3c-detours2/18.png).

**m. The Data place.** Sources, Filters and Attributes (id, name, shared_chapters): no look
(e3c-detours2/38.png).

**n. Undo past the run, then Redo.** With the folder's unset Shape line added and no value picked,
one Control+Z undoes the run itself ("Undid running Louvain.", folder and key gone, Undo dimmed;
e3c-detours2/23.png, 24.png). Control+Shift+Z brings back the folder, the six colors and the key
("Redid running Louvain."; e3c-detours2/25.png). The redone folder takes Shape > Box normally:
cubes in six colors, "Shape: 6 changed", key "Shape: Louvain / Box" (e3c-detours2/30.png,
31.png). Control+Z then gives "Undid changing node shape on 6 layers." with balls drawn while the
inspector's Shape box still shows "Box" as set (e3c-detours2/32.png, defect 1 again). A second
Control+Z undoes the run; Analyze then offers Louvain afresh ("Start here", Run), not "Update
Louvain layer", and the new run colors six groups with the key back (e3c-detours2/34.png to
37.png).

## 3. Success path by keyboard only (`e3c-keyboard/`, `--keys --sr`) -- reached

| Shots | Keys | Focus (screen-reader name) |
| ----- | ---- | -------------------------- |
| 01-08 | Tab x7 | nothing (the page itself) at start; Main menu; Local only; Settings...; Open project or file...; New from data...; Open the Les Miserables sample; Open the Zachary's karate club sample |
| 09-10 | Shift+Tab, Enter | Open the Les Miserables sample; heading "Graph, Les Miserables: 77 nodes, 254 edges" (live: "Les Miserables: 77 nodes, 254 edges") |
| 11-16 | Tab x6 | From Les Miserables; Graph actions; tab Values; About Direction; About Degree; separator Resize inspector |
| 17-20 | Tab x4 | Main menu; Project: Les Miserables; Local only; Graph |
| 21-27 | Tab x7 | Graph Les Miserables; combobox Find; Add a layer or a folder; treeitem Everything; Graph settings; separator Resize left panel; Canvas "Graph drawing" |
| 28 | Tab | button Analyze (collapsed) |
| 29-30 | Tab, Shift+Tab | From Les Miserables (the toolbar is one stop); back to Analyze |
| 31-33 | Enter, type `louvain`, Enter | combobox "Filter analyses" (Louvain highlighted); button "Run Louvain" |
| 34-35 | Tab, Shift+Tab | Back to analyses; Run Louvain |
| 36 | Enter | Analyze (live: "Louvain added, running", "Louvain finished: 6 groups, each a layer in the Louvain folder of Style layers") |
| 37-38 | F6, F6 | separator Resize left panel; From Les Miserables |
| 39-41 | Shift+F6, Shift+Tab x2 | Resize left panel; Graph settings; treeitem Everything |
| 42-43 | ArrowUp, Enter | treeitem "Louvain, folder, 6 layers" collapsed; then selected |
| 44-52 | F6, Tab x8 | Select what it paints; Folder actions; tab Style; tab Node; checkbox Style nodes; "Which nodes, 77 of 77 nodes, Louvain: each layer's own value"; Add to node shape; Add to node visibility; Add to node text |
| 53-55 | Shift+Tab x2, Enter | Add to node shape; menuitem Shape |
| 56 | Enter | combobox "Node shape, default Icosphere" (live: "Node shape added: pick a value for every layer") |
| 57-60 | Enter, ArrowUp, ArrowLeft, Home | list open, Icosphere highlighted; arrows move in two dimensions; Home goes to Box |
| 61-62 | Escape, Enter | list closed, focus kept; reopened |
| 63-64 | type `box`, Enter | Box highlighted; "Node shape, Box" (live: "Shape: 6 changed") |
| 65-68 | Enter, Tab x3 | list open with Box selected; Tab closes it to "Node shape by attribute"; "Remove node shape from every layer"; "Undo the shape change" |
| 69-71 | Enter, Tab, Control+Shift+Z | Undo: focus to combobox "Node shape, default Icosphere" value "Box" (the stale state of 2i, spoken); Node shape by attribute; Redo ("Redid changing node shape on 6 layers.") |

Focus never fell to the page body after an action. End state: six colors, cubes (e3c-keyboard/68.png).

## Answer key against the screen

- Step 6: the key says the run keeps the drawing's size and place. On this build the drawing
  moves right and is drawn slightly smaller after Run (e3c-pointer/06.png against 07.png).
- Step 10: the key says the list shows a check on Icosphere though no value is set. On this build
  Icosphere is highlighted (filled), with no check; a check shows only on a set value
  (e3c-pointer/13.png, e3c-detours/52.png).
- Shape list notes: the key says typing `cube` highlights Cylinder and Enter applies cylinders.
  On this build `cube` highlights nothing and Enter does nothing (e3c-detours/13.png, 14.png).
- Undo past the run, then Redo: the key says the folder comes back with every group matching 0
  nodes and that a new run offers "Update Louvain layer". On this build Redo restores the six
  colored groups and the key, the folder takes a shape normally, and a run after undoing offers
  plain Louvain (e3c-detours2/25.png, 31.png, 34.png).
- Everything else on the success path matches: the folder's text and token, the Shape menu, the
  italic Icosphere, the accessible names, "Shape: 6 changed", the key's "Shape: Louvain / Box",
  Escape and Tab in the list, typing `box` and Enter, ArrowUp from Everything to the folder.

## Defects

1. After Undo (inline Undo or by keyboard) of a shape set on the folder or on several picked
   layers, the open inspector keeps showing "Box" as set while the drawing shows balls; the
   combobox's spoken name says "default Icosphere" with value "Box"; picking Box again does
   nothing; only another shape and then Box recovers. (detours: e3c-detours/39.png, 50-55.png;
   keyboard: e3c-keyboard/69.png)
2. Typing a word that names no shape (`cube`, the everyday word) in the shape list gives no
   message and no highlight, and Enter does nothing; the typed text shows only in a small footer.
   (detours: e3c-detours/13.png, 14.png)
3. Tab from the Shape box puts the "Node shape by attribute" tooltip over the "Shape: 6 changed /
   Undo" line. (pointer: e3c-pointer/17.png)
4. The Shape section's group has the doubled accessible name "Shape Shape". (pointer:
   e3c-pointer/12.png)
5. The pointer shows the default arrow, not a hand, over "Add to node shape" and over the
   folder's expand caret, and over every canvas toolbar button. (pointer: e3c-pointer/09.png;
   detours: e3c-detours/32.png, e3c-detours2/08.png to 14.png)
6. Undo and Redo, dimmed after the sample opens, are not Tab stops (Project: Les Miserables goes
   straight to Local only), against the settled rule that a dimmed Undo stays reachable.
   (keyboard: e3c-keyboard/18.png, 19.png)
7. F6 and Shift+F6 land on the "Resize left panel" separator rather than the panel's first
   control. (keyboard: e3c-keyboard/37.png, 39.png)
8. After the sample opens, Analyze is 18 Tabs away: the order runs inspector, header, left panel,
   canvas, then the toolbar. (keyboard: e3c-keyboard/10.png to 28.png)
9. The color key's rows look like a list of the clusters but do nothing on click. (detours:
   e3c-detours/06.png)
10. The graph's own Style tab offers no node look, so a reader styling "the whole drawing" from
    there finds nothing. (detours: e3c-detours/05.png)

## Not walked

Nothing. Every route above was walked on the frozen build, including the trap "Undo past the run,
then Redo" (detour n).
