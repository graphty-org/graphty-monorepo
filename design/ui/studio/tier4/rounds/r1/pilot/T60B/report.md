# Pilot: T60 B (yeast gene network from a web address)

Build: 0ffeae2ef5 (frozen, .study-builds/tier4-r1-0ffeae2ef5). Start: empty. All three walks
ended. Screenshots stay out of git, under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60B.

Result: reached on all three walks. The loaded network is the task's own file: 331 nodes and 361
edges (the file holds 331 node rows and 361 edge rows), table columns id, name, gal1RGexp,
gal4RGexp, gal80Rexp.

## Success path, by pointer (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60B/success)

1. Start screen (01.png) > Open network data: the dialog shows NDEx, Neo4j, Web API cards and a
   box labeled "Web address" (02.png).
2. Typed the address into the box (04.png); hovered the one button beside it: it is "Choose file"
   (upload glyph, no tooltip, default cursor) (05.png).
3. Enter: the graph opens as project "yeast-galactose"; the inspector's Overview shows Nodes 331,
   Edges 361; the table opens with the nodes (06.png).
4. Data: the Sources row has the link glyph, "yeast-..." truncated, a 331 node chip and an edge
   chip that the issue chip overlaps (07.png; crop /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60B/crops/07-source-row.png).
5. The issue chip ("1 issue in yeast-galactose.graphml") opens "Issues in yeast-galactose.graphml":
   edges, "6 rows refused" (09.png). The Edges table shows 361 edges and a warning mark on Node A
   (11.png); its popover says "6 rows refused" with Show rows (12.png); Show rows filters to
   "With issues 0" and "No rows" (13.png).

Answer key against the screen: the path matches (Open network data > web address box > Enter >
Overview 331 / 361; the Sources row carries the link glyph). The key's "also success" route,
Data > Sources "+" > Server... with the same address, does not exist on screen: no Server kind
takes a graph file's address (detours/14.png, 18.png). The route that works from inside a project
is Sources "+" > Network data... (detours/19.png to 23.png).

## Detours (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60B/detours)

- Open a file from the start screen, then cancel the chooser (02.png, 03.png): nothing happens and
  the start screen gives no hint that a web address goes under "Open network data".
- Open network data > Web API card, paste the address into Endpoint (04.png to 11.png): the card
  leaves the start screen for an Untitled project with the Server form on Web API. With the
  Endpoint filled, Test and Load stay disabled with no reason and no tooltip; Enter in Endpoint
  does nothing; Tab moves to Sign in. The Kind list (14.png) offers NDEx, Cypher database, Neo4j,
  Web API, OpenAlex, SPARQL endpoint: none takes a graph file's address. First Escape closes the
  list, second closes the form (15.png, 16.png).
- Inside the project: Sources "+" lists File..., Samples..., Server..., Network data..., Paste
  (17.png). Server... opens on Neo4j with the earlier endpoint gone (18.png); no kind loads the
  file. Network data... opens the same dialog as the start screen, focus on Close (19.png).
- In that dialog, typed the address and clicked the button beside the box: a file chooser opens
  and the address is ignored; Escape closes it and keeps the text (20.png, 21.png). Tab from the
  box goes to that button (22.png). Enter in the box loads 331 / 361 into the Untitled project;
  focus goes to the Sources row (23.png).

## Keyboard only (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60B/keyboard, started --keys --sr)

- Start screen tab order: Samples (link), Docs, For developers, GitHub, Switch to dark mode,
  Settings..., the demo canvas, Communities, Key players, Shortest path, 2D, Pause the turning,
  then Open a file (Tab 13), Open network data (Tab 14), Samples (button), New project, MIT
  licensed on GitHub.
- Enter on Open network data: focus on Close. Tab: NDEx, Neo4j, Web API cards, textbox "Web
  address of a graph file", button "Choose file", Close (wraps; focus stays in the dialog).
- Escape in the box with text typed: closes the dialog, focus back on Open network data; reopening
  shows an empty box.
- Typed the address, Enter: loads; focus on the canvas "Graph drawing"; live region "yeast-galactose:
  331 nodes, 361 edges". Shift+Tab reaches the Everything layer, "331 nodes, 361 edges". Focus never
  fell to the page body.

## Defects

1. The Sources row's issue chip draws over the edge count chip: the warning glyph sits on the edge
   glyph and the "3", and the issue count "1" runs on, so it reads "3611" (success/07.png,
   crops/07-source-row.png; also detours/23.png).
2. A false issue: "6 rows refused" on edges, while the file has 361 edges and all 361 are in the
   graph; Show rows finds "With issues 0", "No rows" (success/09.png, 12.png, 13.png). A person
   counting interactions is left asking whether the answer is 361, 355 or 367.
3. The only button beside the web address box is "Choose file" (upload glyph, no tooltip, default
   cursor): after typing an address, clicking it opens a file chooser and ignores the address
   (success/05.png, detours/20.png, 21.png). The box has no Open button; Enter is the only way to
   open the address. decided.md R8 calls for an Open button beside the box.
4. Web API with a filled Endpoint: Test and Load stay disabled with no reason given; Enter does
   nothing (detours/08.png, 10.png, 11.png).
5. The Server form's dialog has no name of its own: its accessible name is all its contents
   ("Server Kind Example Endpoint Sign in Show the password Mapping Limit Expand on d...")
   (detours/05.png, 13.png).
6. The Server form covers the canvas's "No nodes to draw" card and its File... button
   (detours/04.png, 18.png).
7. The start screen has two controls named "Samples" (the top link and the button), and the
   start buttons come only after 12 Tab stops through the header and the demo graph (keyboard walk).
8. The Sources row name is truncated to "yeast-..." with no wider space (success/07.png).
9. The Edges table's "Columns: 2 of 2" reads grayed as if disabled (success/11.png).

Already in the backlog, not counted again: Fields lists no columns for a GraphML file
(success/07.png).
