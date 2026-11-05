# Pilot: T60 B (yeast gene network from a web address), targeted re-walk

Build: 037e96e9bb (frozen, .study-builds/tier4-r1d1-037e96e9bb). Start: empty. Every session ended.
Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T60B.

Result: reached on every walk. The loaded network is the task's own file the whole way: 331 nodes,
361 edges, node columns id, name, gal1RGexp, gal4RGexp, gal80Rexp; the Edges table lists 361 edges.

Walks that matched the earlier pass to the end (detours-3, detours-5, detours-6) were not walked
again; the earlier report stands for them. Every other earlier walk was replayed on this build and
carried on by hand from where it differed.

## Success path, by pointer (success, success-2, success-3)

All three replays match the earlier walk up to Enter in the web address box (02.png to 05.png):
Open network data, the dialog with NDEx, Neo4j, Web API cards and the "Web address" box; the one
button beside the box is still "Choose file" (upload glyph).

- Enter in the box: the graph opens as project "yeast-galactose"; the inspector's Overview shows
  Nodes 331, Edges 361 (success/06.png). The table no longer opens on its own after the load; this
  is where the replays differ from the earlier build.
- Data: the Sources row has the link glyph, "yeast-...", a 331 node chip and a 361 edge chip, both
  drawn whole. No issue chip: the false "6 rows refused" issue is gone (success/07.png). The row's
  tooltip is the full file name (success/08.png).
- Table (toolbar, Shift+T) > Edges: 361 edges, no warning mark on any column (success-2/09.png;
  success-3/07.png). Clicking the Sources row opens the source's inspector: file glyph, "Source",
  Loaded Nodes 331, Edges 361 (success-2/10.png).

Answer key against the screen: the path matches (Open network data > web address box > Enter >
Overview 331 / 361; the Sources row carries the link glyph; the box has no Open button and Enter is
the only way to open the address; the source's inspector shows a file glyph and "Source", not the
address). No mismatch.

## Detours (detours, detours-2, detours-4)

Steps 1 to 21 match the earlier walk: Open a file and cancel; Web API card with the address in
Endpoint (Test and Load stay disabled); Sources "+" > Server... (no kind takes a file address);
Sources "+" > Network data...; Choose file beside the box ignores the typed address.

- Enter in the box inside the Untitled project: loads 331 / 361; focus on the Sources row, which
  shows both counts whole and no issue chip (detours/23.png). The table stays closed; opened by
  hand it shows the same data (detours/24.png).
- Main menu: no door to a web address; Open project or file... opens the file chooser, Escape
  closes it (detours-2/24.png to 26.png; detours-4/24.png).
- The address typed into Find nodes, edges, values and Enter: "No match for ..." with a hint about
  rules; nothing loads; Escape clears the box (detours-2/27.png to 29.png; detours-4/25.png).
- Right-click on empty canvas: the canvas menu (Fit, Select all, Motion off ...), nothing about
  data; Escape closes it (detours-2/30.png, 31.png; detours-4/26.png, 27.png).

## Keyboard only (keyboard, keyboard-2, keyboard-3; --keys --sr)

Steps 1 to 29 match the earlier walk: the start screen's tab order, Enter on Open network data
(focus on Close), the dialog's Tab order (cards, textbox "Web address of a graph file", button
"Choose file", Close, wrapping), Escape in the box closes the dialog and returns focus to Open
network data.

- Enter in the box with the address typed: the graph loads, but focus falls to the page body
  ("focus: nothing (the page itself)") on all three walks; the earlier build put it on the canvas
  "Graph drawing" (keyboard/31.png, keyboard-2/31.png, keyboard-3/31.png). The live region says
  "yeast-galactose: 331 nodes, 361 edges", then "331 nodes, 361 edges" once more.
- Tab from there: Main menu, "Project: yeast-galactose", Undo (disabled), Redo (disabled), Graph,
  "Graph yeast-galactose.graphml", Find, Add a layer or a folder, treeitem "Everything, node and
  edge layer, 331 nodes, 361 edges", Graph settings, Resize left panel, Canvas "Graph drawing",
  Analyze, "From yeast-galactose.graphml", Graph actions, tab Values, About Direction. The counts
  are reachable by keyboard and spoken by the layer row.

## Defects

1. Focus falls to the page body after the address opens by Enter (keyboard/31.png,
   keyboard-2/31.png, keyboard-3/31.png). A keyboard user's next Tab starts again at Main menu.
   New on this build; it does not block the task (the live region speaks the counts).
2. The load's live status is spoken twice ("yeast-galactose: 331 nodes, 361 edges", then "331
   nodes, 361 edges") (keyboard/31.png).
3. The Sources row's accessible name repeats its counts: "yeast-galactose.graphml Node 331 Edge
   361 331 nodes, 361 edges" (success/08.png).
4. Unchanged from the earlier pass: the only button beside the web address box is "Choose file",
   which opens the file chooser and ignores the typed address; there is no Open button
   (success/05.png, detours/20.png).

Fixed on this build: the false "6 rows refused" issue and the issue chip drawn over the edge count
(success/07.png).
