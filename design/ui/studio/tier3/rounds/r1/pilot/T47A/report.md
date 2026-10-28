# Pilot: T47 A (every circle as cubes, colors kept, Les Miserables)

Build 7d87760756 (frozen, `.study-builds/tier3-r1-7d87760756`, graphty 0.8.91). Four sessions on
this build, each from the empty start, each ended: `7d8-pointer/`, `7d8-detours/`, `7d8-detours2/`
(the routes the first detour walk left out), `7d8-keyboard/`.
Screenshot paths below are relative to this folder. The other folders (`pointer/`, `detours/`,
`keys/`, `e3c-*`) are walks of earlier builds and are not part of this pilot.

The empty start on this build is a new page: a landing screen ("Analyze any network. Free and open
source.") with Open a file, Open network data, Samples and New project, beside a turning demo drawing
of Les Miserables already colored by community. The sample list is a "Sample library" section further
down the same page.

Data check: every session kept the sample's 77 characters and 254 ties throughout. End state of the
pointer and keyboard walks (`styles.json`): group-1 to group-6 keep their own `node.color` (e69f00,
56b4e9, 009e73, 0072b2, d55e00, cc79a7) and carry `node.shape: box`; counts 20, 17, 11, 11, 10, 8.
Grade on this route: S, `Route: folder`, `Token: not touched`.

## 1. Success path by pointer (`7d8-pointer/`) -- reached in 12 steps

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | "No thanks" | no consent notice is visible on the landing page; the click lands on something below the fold and the page scrolls 26 px | 01.png, 02.png |
| 2 | Samples (the button; a header link has the same name) | the page scrolls to "Sample library": 19 real networks, every thumbnail a broken image | 04.png |
| 3 | "Who holds the novel together" (the Les Miserables card) | 77 nodes, 254 edges, indigo balls; a "private window" notice | 05.png |
| 4-6 | Analyze, `louvain`, Enter | one match under "Find groups"; the Louvain form with Resolution, Weight, Run | 07.png, 08.png |
| 7 | Run | Louvain folder, "Color: Louvain" key top left (Group 1 to 6); the drawing stays where it was | 09.png |
| 8 | Louvain folder row | "6 layers in Louvain. Layers added later are not changed."; Color shows the purple «Layer» token with six swatches; Which nodes "Louvain: «Layer»" | 10.png |
| 9 | Shape "+" (tooltip "Add to node shape", arrow cursor) | menu Shape, Size | 11.png, 12.png |
| 10 | Shape | Shape line, "Icosphere" in gray | 13.png |
| 11 | click the box | a one-column list of 36 shapes opens over the whole inspector, covering the box itself; the row under the pointer (Pentagonal prism) is highlighted | 14.png |
| 12 | Box | cubes in six colors; "Shape: 6 changed" and Undo; the key gains "Shape: Louvain / Box" | 15.png |

Field checks: reopening the list shows Box checked and highlighted, the list now dropped below the
box (16.png); Escape closes it and keeps Box and focus (17.png); Enter reopens it (18.png); Tab closes
it and moves to "Node shape by attribute", whose tooltip covers the "Shape: 6 changed / Undo" line
(19.png).

## 2. Detours (`7d8-detours/`)

**a. The landing page's own drawing.** "Communities" toggles the demo's community colors off and on
(03.png, 04.png); hovering it gives no tooltip (02.png). The demo keeps turning, so "Click a node for
details" missed twice: both clicks landed on empty canvas (05.png, 06.png). Nothing there changes
shape. Dead end; the reader must open the sample.

**b. A sample from the main menu.** Main menu > Open sample > Les Miserables (77 characters) opens the
same graph as the card (07.png to 09.png).

**c. The prompt's words in Analyze.** `circles`: "No analysis matches "circles"", and Enter does
nothing (10.png, 11.png). Escape clears the filter (12.png). `group` lists Louvain, Leiden, Label
propagation, Markov, Spectral, Hierarchical, Girvan-Newman, Connected components and Steps away
(13.png). Enter, Run gives the six groups (14.png).

**d. Styling from where they are: a node's own Style tab.** No label is drawn, so a node is reached
only by pointing (15.png: "nothing on screen is called Myriel"). Clicking Myriel selects it and the
camera glides it to the center, pushing the top of the drawing off screen (16.png). Style > Shape "+"
> Shape: an unset Icosphere line with "Not set yet: the first shape you pick makes the layer"
(19.png). Opening the list and typing `cube`: the footer says "No option starts with "cube"", but
Octahedron, the row under the pointer, stays highlighted (21.png); Enter does nothing (22.png). Escape
closes the list (23.png). Typing `box` reopens the list with Octahedron still highlighted and "box" in
the footer (24.png); Enter applies Box, not Octahedron, and makes the one-node layer "Myriel" ("Made
layer Myriel for 1 node"), the one cube hidden under the selection glow (25.png): F if left.
Control+Z: "Undid adding the layer Myriel.", focus on Shape "+" (26.png).

**e. "Why this look" > Everything (route around).** The "Everything / Size, Shape" link opens
Everything with focus and a selection in the Size box (27.png). Shape > Box makes every node a cube in
its own color, with no "changed" line and no shape entry in the key (28.png, 29.png): S,
`Route: around`. Control+Z: "Undid changing node shape on Everything." (30.png).

**f. The folder's color field (the purple token).** It opens "Color from each layer": Source
«Layer», Change source, Palette "Eight distinct colors", a table of the six groups with counts, No
value "Leave as is". Nothing about shape (33.png). Escape closes it, focus on the token (34.png).

**g. Several group layers picked together.** The folder's caret expands it (35.png); Group 1, then
Shift+click Group 6, picks all six ("6 layers", 37.png). Shape "+" > Shape adds an unset line
(39.png); Box gives "Shape: 6 changed" and cubes in six colors (41.png): S, `Route: several`.

**h. Inline Undo, then Box again.** The inline Undo ("Undo the shape change") returns the drawing to
balls and the inspector to an unset Icosphere (43.png); Box applies again at once (44.png, 45.png).
The stale "Box" after Undo, seen on the earlier build, is gone.

**i. The find box.** `cube`, Enter: "No match for "cube". Still selected: 1 node. To select by a
value, type a rule such as name == 'Napoleon'" (47.png). Two Escapes leave the box (48.png).

**j. Right-click a node** (Cravatte): Neighborhood, Path between..., Frame selection, New layer from
selection, Add note; nothing about shape or clusters. The camera glides the node to the center while
the menu stays where the click was, so the menu no longer sits beside its node (49.png). Escape closes
it (50.png).

**k. Undo past the run, then Redo.** Control+Z: "Undid changing node shape on 6 layers." (51.png). A
second Control+Z: "Undid running Louvain.", folder and key gone, and the whole drawing jumps about
130 px left (52.png against 51.png). Control+Y: "Redid running Louvain.", folder, six colors and key
back, and the drawing jumps back right (53.png).

**l. Quick actions.** Control+K, `shape`: "No results" (54.png); Escape closes it (55.png).

**m. A new tab, then the file routes on the landing page.** Reopening shows "Unsaved work from your
last visit -- An untitled project (77 nodes)" with Restore and Discard, although the app titled it
"Les Miserables" (56.png). "Open a file" opens the browser's file chooser (57.png). "Open network data"
opens a dialog of NDEx, Neo4j and Web API cards, "Connecting to these sources is on the way"; NDEx
only says "NDEx is on the way. For now, paste the web address of a graph file." (58.png, 59.png).
Escape closes it (60.png). No route here reaches the sample.

## 2b. More detours (`7d8-detours2/`)

**n. The landing page's sample search.** Samples, then the "Search 78 samples" box: `miserables`
leaves one card, "Who holds the novel together" (03.png). Enter with that one match does nothing
(04.png). Escape clears the box and shows every card again, keeping focus in the box (05.png). Typing
`les mis`, then Tab, moves focus to the Grid toggle and keeps the one card (06.png). The usage-data
notice ("Your data is yours, but please help us", Share usage data / No thanks) sits at the very foot
of the page, under the library (03.png). The card opens the sample: 77 nodes, 254 edges (07.png).

**o. The Data place.** Sources (Les Miserables, Node table 77 rows, Edge table 254 rows), Filters
"+", and Attributes: node `id` and `name`, edge `shared_chapters` (08.png). Nothing about circles,
clusters or shape. After Louvain runs from here, the Data place still lists only those three
attributes: the group each character was put in shows nowhere in it (23.png).

**p. The canvas toolbar.** Tooltips, all with the arrow cursor: "Analyze Shift+A", "Layout", "View,
3D", "Legend L", "Table Shift+T", "Filters", "Quick actions Ctrl+K" (09.png to 15.png). Layout lists
Force (checked, Recommended), Circle, Grid, Spiral, Spectral, Random, Keep positions and, dimmed with
their reason, "Rings by group / Needs groups: run Louvain in Analyze first", "Two columns" and
"Columns by group" with the same reason (16.png): the one place before a run that names Louvain.
Escape closes it (17.png). View lists 2D, 3D (checked), VR / AR (dimmed, "This device has no VR or
AR"), Fit, Frame selection (dimmed), Front, Side, Top, Isometric; nothing about shape (18.png); Escape
closes it (19.png). Legend opens an empty key, "Nothing is styled yet" (20.png).

**q. The graph inspector's Style tab.** Canvas (Background Color / Image, F5F5F5, Lighting Studio,
Same size at any depth, Outline width 1) and Labels; nothing about node shape and no pointer to the
style layers (21.png). Dead end.

**r. Louvain from the Data place, then the key.** Analyze, `louvain`, Enter, Run: six colors and the
"Color: Louvain" key, Group 1 to 6 (22.png, 23.png). Clicking, double-clicking or hovering a key row
does nothing: the rows are plain text with no tooltip (24.png to 26.png).

**s. Each group layer one by one (`Route: one by one`).** Graph place (28.png); the Louvain caret
expands the folder without selecting it (29.png). Group 1: inspector "Group 1 / Node layer", Which
nodes "Louvain: Group 1, 20 nodes", Fill Color E69F00 (30.png). Shape "+" gives the Shape / Size menu
(31.png); Shape adds an unset gray "Icosphere" line with no hint (32.png). Clicking the box opens the
36-shape list over the inspector with the row under the pointer (Rhombicuboctahedron) highlighted
(33.png); Escape closes it and keeps focus on the box (34.png); reopening and clicking Box makes Group
1's 20 nodes cubes in their own orange, and the key gains "Shape: Group 1 / Box / 20 of 77 nodes"
(35.png). Group 2: typing `cube` into the open list shows "No option starts with "cube"" while
Rhombicuboctahedron stays highlighted (38.png); Tab closes the list, takes nothing and puts the "Node
shape by attribute" tooltip up (39.png); Shift+Tab, `box`: the footer reads "box" and
Rhombicuboctahedron is still the highlighted row (40.png); Enter takes Box, and the key's two shape
entries merge into "Shape: Louvain / Box / 37 of 77 nodes" (41.png). Groups 3 to 6 the same way
(42.png to 45.png): every node a cube, six colors kept, the key "Shape: Louvain / Box". The folder
then shows Shape "Box" beside the purple "Layer" color token (47.png). Folder actions lists Rename,
Run settings, Move to folder, Pin to top / bottom, Select what it paints, Hide, Lock, Ungroup, Delete;
nothing for applying a look to every layer (46.png); Escape closes it onto its button (47.png).
End state (`7d8-detours2/styles.json`): group-1 to group-6 keep e69f00, 56b4e9, 009e73, 0072b2,
d55e00, cc79a7 and each carries `node.shape: box`; counts 20, 17, 11, 11, 10, 8; 77 nodes throughout.
S, `Route: one by one`, 30 pointer actions after the run against 5 for the folder route.

## 3. Success path by keyboard only (`7d8-keyboard/`, `--keys --sr`) -- reached

| Shots | Keys | Focus (screen-reader name) |
| ----- | ---- | -------------------------- |
| 01 | (start) | nothing (the page itself); live "Colored by community: 6 groups, each more linked inside than out." marked unconfirmed |
| 02-11 | Tab x10 | Main menu; link Samples; Docs; For developers; GitHub; Switch to dark mode; Settings...; Canvas "A network drawn as a 3D graph. Drag or use the arrow keys to turn it; ..."; Communities (pressed); Key players |
| 12-19 | Tab x8 | Shortest path; 2D; Pause the turning; "Open a file CSV, GraphML, GEXF, Cytoscape, or a saved project"; Open network data; Samples; New project; MIT licensed on GitHub |
| 20-22 | Shift+Tab x2, Enter | Samples; the page scrolls to the Sample library but focus stays on the Samples button |
| 23-25 | Tab x3 | New project; MIT licensed on GitHub; Put it on your own site -- the page scrolls back up to the landing controls (25.png) |
| 26-38 | Tab x13 | searchbox "Search samples"; Grid (pressed); List; Any (pressed); Social; Sports; Politics; Animals; Places; Biology; Ontology; Generated; "Open the Les Miserables sample" |
| 39 | Enter | heading "Graph, Les Miserables: 77 nodes, 254 edges" (live "Les Miserables: 77 nodes, 254 edges", then the private-window notice) |
| 40-47 | Tab x8 | From Les Miserables; Graph actions; tab Values; About Direction; About Degree; separator "Resize inspector" "240 pixels (min)"; Main menu; Project: Les Miserables |
| 48-58 | Tab x11 | Undo (disabled); Redo (disabled); Local only; Graph; Graph Les Miserables; combobox Find; Add a layer or a folder; treeitem Everything; Graph settings; separator Resize left panel; Canvas "Graph drawing" |
| 59-62 | Tab, Enter, type `louvain`, Enter | Analyze; combobox "Filter analyses" (Louvain highlighted); button "Run Louvain" |
| 63-71 | Shift+Tab x4, Tab x4, Enter | Advanced; Weight "None"; Resolution "1"; Back to analyses; and forward again; Run: focus to Analyze; live "Louvain added, running", "Louvain finished: 6 groups, each a layer in the Louvain folder of Style layers" |
| 72-76 | F6 x5 | separator Resize left panel; separator Resize inspector; Canvas; Analyze; Resize left panel |
| 77-83 | Shift+Tab x2, ArrowUp x2, Enter, ArrowDown, Enter | Graph settings; Everything; Louvain folder; one row too far (Selected); Louvain "folder, 6 layers" collapsed, selected |
| 84-92 | F6, Tab x8 | separator Resize inspector, then Tab leaves the inspector: Main menu, Project, "Undo running Louvain", Redo, Local only, Graph, Graph Les Miserables, Find |
| 93-107 | F6, Shift+Tab x14 | Resize inspector; Edit edges; Add to node rendering; Add to node effects; Remove node color from every layer; Give all 6 layers one node color; "Node color: from each layer, 6 layers, 6 colors: Group 1 orange, Group 2 blue, Group 3 green, Group 4 blue, Group 5 orange, Group 6 pink"; Add to node text; Add to node visibility; Add to node shape; "Which nodes, 77 of 77 nodes, Louvain: each layer's own value"; Style nodes; tab Node; tab Style; Folder actions |
| 108-116 | Tab x5, Enter, ArrowDown, ArrowUp, Enter | ... Add to node shape; menuitem Shape; Size; Shape; combobox "Node shape, default Icosphere" (live "Node shape added: pick a value for every layer") |
| 117-122 | Enter, ArrowDown, ArrowUp, Home, Escape, Enter | list open with nothing highlighted; Box; Vee (wraps to the end); Box; closed with focus kept; reopened with Box highlighted |
| 123-124 | type `cube`, Enter | live "No option starts with "cu"", "... "cub"", "... "cube""; Enter does nothing |
| 125-126 | type `box`, Enter | Box highlighted; "Node shape, Box" value Box; live "Shape: 6 changed" |
| 127-133 | Enter, Tab x3, Enter, Tab, Control+Y | list open, Box selected; Tab closes it to "Node shape by attribute"; "Remove node shape from every layer"; "Undo the shape change"; Enter: focus to "Node shape, default Icosphere" (live "Undid changing shape"); Node shape by attribute; Control+Y (live "Redid changing node shape on 6 layers.") |

Focus never fell to the page body after an action on this walk. End state: six colors, cubes
(126.png, `styles.json`). The sample takes 33 keys from the empty start (16 Tabs to Samples, Enter,
16 more), and Analyze is 20 Tabs from the opened graph.

## Answer key against the screen (success path)

- Steps 1-2: the key's "No thanks" then "Les Miserables" on a start screen. This build opens on a
  landing page with no visible consent notice ("No thanks" clicks something below the fold) and no
  sample cards; the sample is reached through Samples, then the "Who holds the novel together" card,
  one step more (12, not 11) (7d8-pointer/01.png to 05.png).
- Step 6: the key says the drawing moves right and is drawn slightly smaller after Run. On this build
  it stays put (7d8-pointer/08.png against 09.png).
- Step 10: the key describes Icosphere highlighted on opening and a grid (ArrowRight at a row's end).
  On this build it is a one-column list of 36 shapes that opens over the whole inspector, covering
  its own box; by pointer the row under the pointer is highlighted, by keyboard nothing is
  highlighted on opening and ArrowUp wraps to the last shape, Vee (7d8-pointer/14.png;
  7d8-keyboard/117.png to 119.png).
- Shape list notes: the key says typing `cube` gives no message and shows only "cube" at the foot.
  On this build the foot reads "No option starts with "cube"" and a screen reader hears it
  (7d8-detours/21.png; 7d8-keyboard/123.png).
- Undo of a shape set on the folder or on several layers: the key says the inspector keeps showing
  Box as set and picking Box again does nothing. On this build the inspector returns to an unset
  Icosphere and Box applies again at once (7d8-detours/43.png to 45.png; 7d8-keyboard/131.png).
- Keyboard: the key counts 18 to 20 Tabs from the opened graph to Analyze (20 here) and does not
  cover the landing page's 16 Tabs to Samples.
- Everything else on the success path matches: the folder's text and token, the Shape menu, the
  accessible names "Node shape, default Icosphere" and "Node shape, Box", the spoken "Node shape
  added: pick a value for every layer", "Shape: 6 changed", the key's "Shape: Louvain / Box", Escape
  and Tab in the list, typing `box` and Enter, ArrowUp from Everything to the folder.

## Defects

1. Enter on the landing page's Samples scrolls to the Sample library but leaves focus on the Samples
   button; the next Tabs walk the landing page's remaining controls and scroll the page back up
   before reaching the library. (keyboard: 7d8-keyboard/22.png, 25.png)
2. F6 lands on the "Resize left panel" and "Resize inspector" separators and skips the top bar, and
   from "Resize inspector" the next Tab leaves the inspector for Main menu, so F6 never reaches the
   inspector's content; against the settled rule that F6 cycles five regions and a resize handle is
   never a region. (keyboard: 7d8-keyboard/72.png to 76.png, 84.png, 85.png, 93.png)
3. The shape list opens over the whole inspector, covering its own box, and the row under the pointer
   is highlighted; with `cube` typed ("No option starts with cube") or `box` typed, Octahedron stays
   highlighted while Enter does nothing or takes Box, so the highlight and what Enter takes disagree.
   (pointer: 7d8-pointer/14.png; detours: 7d8-detours/21.png, 24.png, 25.png; 7d8-detours2/38.png,
   40.png, 41.png)
4. Undo of the run and Redo of it move the whole drawing about 130 px left and back (a node was
   selected), against the settled rule that Undo never re-frames the drawing.
   (detours: 7d8-detours/51.png to 53.png)
5. Every Sample library thumbnail is a broken image: the build fetches them from
   graphty.app/data/graph-samples/v1/*.webp and each request fails (net::ERR_BLOCKED_BY_ORB), about 34
   failed requests per load, reported as errors on every step on the landing page.
   (pointer: 7d8-pointer/04.png; keyboard: 7d8-keyboard/22.png)
6. "No thanks", the answer key's first step, names nothing visible on the landing page; the control
   it hits is below the fold. (pointer: 7d8-pointer/01.png, 02.png)
7. The landing page has two controls named "Samples" (a header link and a button).
   (pointer: 7d8-pointer/03.png)
8. Tab from the Shape box puts the "Node shape by attribute" tooltip over the "Shape: 6 changed /
   Undo" line. (pointer: 7d8-pointer/19.png)
9. The folder color's spoken name calls two groups "orange" (e69f00, d55e00) and two "blue" (56b4e9,
   0072b2), so a screen reader cannot tell them apart. (keyboard: 7d8-keyboard/99.png)
10. The landing demo keeps turning, so "Click a node for details" missed twice on empty canvas; the
    "Communities" toggle has no tooltip. (detours: 7d8-detours/02.png, 05.png, 06.png)
11. The "Everything / Size, Shape" link in "Why this look" puts focus in the Size box, not Shape.
    (detours: 7d8-detours/27.png)
12. Right-click selects the node and the camera glides it to the center while the menu stays at the
    click point, away from its node. (detours: 7d8-detours/49.png)
13. The restore card calls the work "An untitled project (77 nodes)" while the app titled it "Les
    Miserables". (detours: 7d8-detours/56.png)
14. "Open network data" offers NDEx, Neo4j and Web API cards that only say they are "on the way".
    (detours: 7d8-detours/58.png, 59.png)
15. The inline Undo's spoken message ("Undid changing shape") differs from the notice the same undo
    shows elsewhere ("Undid changing node shape on 6 layers."). (keyboard: 7d8-keyboard/131.png)
16. Study tool, not the app: on this landing page `real.mjs --start` prints "the app never drew its
    window" and records the landing demo's graph as the session's starting graph (`work-start.json`
    lists a Louvain run and nine demo layers; `styles-steps.jsonl` marks 01.png `graph: true` with six
    community colors), so `work.json` lists the demo's layers as gone and a time-to-first-styled
    reading from `score.mjs` would start from the demo. (7d8-pointer/work.json,
    7d8-pointer/styles-steps.jsonl)

17. Enter in the landing page's sample search does nothing even when one card is left; the reader
    must click or Tab to the card. (detours: 7d8-detours2/04.png)
18. The color key's rows are inert text: clicking, double-clicking or hovering "Group 1" does
    nothing, so the key offers no way to the group's layer. (detours: 7d8-detours2/24.png, 26.png)
19. After a Louvain run, the Data place's Attributes still list only id, name and shared_chapters;
    the group each node was put in appears nowhere there. (detours: 7d8-detours2/23.png)
20. The graph inspector's Style tab holds only canvas and label settings and says nothing about
    where node looks are set (the style layers). (detours: 7d8-detours2/21.png)

## Not walked

Nothing. Every detour on the task's list is walked on this build: the landing page and its sample
search, the main menu, the Data place, the toolbar's Analyze, Layout, View, Legend and Quick actions,
the find box, right-click, a node's own Style tab, "Why this look" (Everything), the folder's color
field, several layers together, each layer one by one, the folder's actions, Undo and Redo, and the
landing page's file routes (Open a file opens the chooser; no participant holds a Les Miserables
file, so none was uploaded).
