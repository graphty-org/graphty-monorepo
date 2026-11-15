# Pilot T60A: from a web address (sources.graphml), targeted re-pilot

Build: 037e96e9bb (frozen, `.study-builds/tier4-r1d1-037e96e9bb`). Start: empty. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T60A/ (not in git).

Result: reached on every route walked. The network opened from the address with 24 nodes and 59
edges, matching the answer key, and the data stayed sources.graphml the whole way. Nothing crashed,
blocked the task or gave a wrong count.

Of the routes listed for this re-pilot, two belong to this task (the success path with
sources.graphml, and the empty canvas card detour); the rest belong to other tasks and were not
walked here.

## 1. Success path by pointer (success-r3/, replayed from success-r2/, all 9 steps matched)

- 02 start screen > "Open network data": NDEx, Neo4j and Web API cards, then the labeled
  "Web address" box with the "Choose file" icon at its end.
- 04 the address typed; 05 hovering the icon: button "Choose file", no tooltip.
- 06 Enter opens the graph: project "sources", inspector "From sources.graphml", Overview Nodes 24,
  Edges 59, Undirected, 1 component.
- 07 Data: one Sources row with the link glyph, "sources....", 24 nodes, 59 edges. No issue chip on
  the row: the source stays clean. 08 the name's tooltip is "sources.graphml"; 09 the chips'
  tooltip is "24 nodes, 59 edges".
- 10 clicking the row: inspector shows "sources.graphml", "Source", Loaded Nodes 24, Edges 59.

## 2. Detour: empty canvas card, then Data (detour-card-add-data-r3/, replayed from detour-card-add-data-r2/, all 8 steps matched)

- 02 New project: the empty canvas card "No nodes to draw" offers only "File..." and
  "Samples...". There is no "Add data..." on the card and no door to a web address there.
- 03-04 File... opens the system file chooser; Escape closes it.
- 05-06 Samples... opens the samples dialog (no web address in it); Escape closes it.
- 07 Data > Sources "+" (Add source): File... Ctrl+O, Samples..., Server..., Network data...,
  Paste Ctrl+V.
- 08-09 Network data... > the address > Enter: the graph opens, 24 nodes and 59 edges, the Sources
  row with the link glyph and no issue chip, focus ring on the new source row. The project stays
  "Untitled", as the answer key says for this route.

## 3. Keys in the address box (field-keys-r3/)

- 02 Tab from the filled box moves to "Choose file".
- 03 Shift+Tab back, Escape: the dialog closes. 04 reopened: the box is empty again (the typed
  address is not kept). Enter opens the address (success-r3 06).

## Answer key against the screen

- No mismatch on the path: the box has no Open button, Enter opens the address, the counts are
  24 and 59, the Sources row has the link glyph, and the source's inspector shows a file glyph and
  "Source", as the key says.

## Defects (none blocks the task or spoils grading)

1. The empty canvas card offers only File... and Samples...; a person who starts from the card
   finds no door to a web address there and must find Data > Sources "+" > Network data...
   (detour-card-add-data-r3/02.png).
2. The address box has no Open button beside it; Tab from the box lands on "Choose file", which
   opens the file chooser (field-keys-r3/02.png, success-r3/05.png).
3. "Choose file" has no tooltip (success-r3/05.png).

## Not walked

- The other listed routes (T60B, T61A, T61B, T62A, T62B, T63A, T63B, T64A, T64B, T65A, T65B,
  T66A, T66B, T67A, T67B, T68A, T68B): they belong to other tasks, not T60A.
