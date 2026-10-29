# Pilot T60A: from a web address (sources.graphml)

Build: 0ffeae2ef5 (frozen, `.study-builds/tier4-r1-0ffeae2ef5`). Start: empty. Screenshots are under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1/pilot/T60A/` (not in git).

Result: reached on all three routes. The network opened from the address with 24 nodes and 59
edges, matching the answer key, and the data stayed sources.graphml the whole way.

## 1. Success path by pointer (`success/`)

- 01 start screen. 02 "Open network data" opens the dialog: NDEx, Neo4j, Web API cards, then a
  "Web address" label over a box "Web address of a graph file" with an icon button at its end.
- 05 hovering that icon: button "Choose file", no tooltip. There is no visible Open button.
- 04/05 the address typed; 06 Enter opens the graph. The project is named "sources", the inspector
  Overview reads Nodes 24, Edges 59.
- 07 Data: the Sources row has the link glyph, "sources...." (cut short), 24 nodes, 59 edges.
  08 the name's tooltip is "sources.graphml"; 09 the chips' tooltip is "24 nodes, 59 edges".
- The row's accessible name is "sources.graphml Node 24 Edge 59 24 nodes, 59 edges" (the counts
  twice), and the pointer turns into a hand over it.

## 2. Detours

### a. Open a file, then Web API, then from inside the project (`detour-open-file/`)

- 02 "Open a file" opens the system file chooser. Pasting an address into it could not be
  tried: the tool can only answer the chooser with a local file. 03 Escape closes it.
- 04 "Open network data" > "Web API" makes an empty "Untitled" project and opens the Server form
  with Kind "Web API". The form covers part of the "No nodes to draw" card.
- 05 the form's dialog name is all of its text ("Server Kind Example Endpoint Sign in ...").
- 06-07 the address typed into Endpoint; Enter does nothing. Test and Load stay dimmed
  (08, 09: no tooltip with a reason). 11 the Kind list (NDEx, Cypher database, Neo4j, Web API,
  OpenAlex, SPARQL endpoint) has nothing for a file at an address: a dead end.
- 12-13 Escape closes the list, then the form; the typed address is gone.
- 15 Sources "+" lists File... Ctrl+O, Samples..., Server..., Network data..., Paste Ctrl+V.
  16 "Network data..." opens the same dialog as the start screen. 17 after typing the address,
  Tab moves to "Choose file"; 18 Shift+Tab, Enter: the graph opens (24, 59), focus on the new
  source row. This door works.
- 19 Sources "+" > "Server..." opens the form on Kind "Neo4j". No kind takes a file's address, so
  the answer key's "Server... with the same address" route cannot work on this build.

### b. Main menu, find box, paste (`detour-menu-paste/`)

- 02-03 New project, then Main menu: Back to start, New project, Open project or file... Ctrl+O,
  Open sample, Save, Save as..., Save local copy..., Export... Ctrl+E, Rename, Settings...,
  Keyboard shortcuts, Help. Nothing takes a web address. The empty canvas card offers only
  File... and Samples....
- 04-05 the address typed into "Find nodes, edges, values" with Enter: "No match for ..."; nothing
  points to where an address goes.
- 06-07 the address cut from the find box, Control+V on the canvas: a notice reads
  "Paste failed: Failed to execute 'readText' on 'Clipboard': Read permission denied." The
  headless browser denies clipboard reads, so whether a pasted address would load was not tried.
  But the notice shows the browser's raw error text, which a person who blocks clipboard access
  would see too.

## 3. Keyboard only (`keyboard/`, started with --keys --sr)

- 02-17 from the start screen, Tab goes through 12 stops (top links, theme, Settings, the demo
  canvas, the demo's Communities / Key players / Shortest path / 2D / Pause) before
  "Open a file" (14), "Open network data" (15).
- 19 Enter opens the dialog with focus on "Close". 20-23 four Tabs reach the textbox
  "Web address of a graph file".
- 26-27 typing, then Escape closes the dialog and returns focus to "Open network data" (as
  decided: Escape in a dialog closes it). The address is not kept when it is reopened (28).
- 29-30 after typing, Tab goes to "Choose file", and Enter there opens the file chooser instead
  of opening the address. 31 Escape, 32 Shift+Tab, 33 Enter: the graph opens. Announced:
  "sources: 24 nodes, 59 edges", then "24 nodes, 59 edges" twice. Focus falls to the page body.
- 34 Tab: "Main menu". 35-38 F6 goes left panel ("Graph sources.graphml"), inspector
  ("From sources.graphml"), canvas ("Graph drawing"), canvas toolbar ("Analyze"). The decided
  order puts the canvas and toolbar before the inspector.
- 39-47 Tab into the inspector: "From sources.graphml", "Graph actions", tab "Values",
  "About Direction", "About Degree", the resize separator, "Local only". Browse mode reads
  "Graph, sources: 24 nodes, 59 edges" and "Nodes 24 Edges 59". The keyboard walk reached the end.

## Answer key against the screen

- "Also success: Data > Sources + > Server... with the same address": Server... has no kind that
  loads a file from an address (Load stays dimmed). Inside a project, the door that works is
  Sources + > "Network data...".
- The path's dialog box has no Open button. Enter is the only way to open the address.

## Defects

1. After the network opens from the address, focus falls to the page body (keyboard 33).
2. The only button after the address box is "Choose file". Tab then Enter opens the file chooser
   instead of the address, and there is no Open button (success 05, keyboard 29-30).
3. "Choose file" has no tooltip (success 05).
4. The Web API card opens a Server form that cannot take a file address. Its Load and Test
   stay dimmed with no reason given, and Enter does nothing (detour-open-file 07-11).
5. Server... from Sources + opens on Neo4j. It cannot load a file address either, so the
   answer key's "also success" route fails (detour-open-file 19).
6. The Server form's dialog name is all of its text, not "Server" (detour-open-file 05).
7. The Main menu and the empty canvas card have no door to a web address
   (detour-menu-paste 03, 05).
8. Paste on the canvas shows the browser's raw error text "Failed to execute 'readText' on
   'Clipboard': Read permission denied." (detour-menu-paste 07).
9. The source row's accessible name repeats its counts: "sources.graphml Node 24 Edge 59 24
   nodes, 59 edges" (success 08).
10. The pointer turns into a hand over the source row. Decided: the cursor stays an arrow over
    buttons (success 08).
11. The source row cuts the name to "sources...." with room to spare. Neither the row nor the
    inspector ("From sources.graphml") shows the address it came from (success 07).
12. F6 goes left panel, inspector, canvas, toolbar. Decided: top bar, left panel, canvas,
    toolbar, inspector (keyboard 35-38).
13. "24 nodes, 59 edges" is announced twice after the load (keyboard 33).
14. From the start screen, it takes 12 Tab stops through the demo graph's controls to reach
    "Open a file", and 13 to reach "Open network data" (keyboard 02-15).
15. The dialog opens with focus on "Close", not on the address box, so it takes 4 Tabs to get
    there (keyboard 19-23).
16. An address typed into the find box only says "No match" (detour-menu-paste 05).

## Not walked

- Pasting the address into the system file chooser: the tool can answer the chooser only with a
  local file.
- Whether Control+V with an address loads it: the headless browser denies clipboard reads.
