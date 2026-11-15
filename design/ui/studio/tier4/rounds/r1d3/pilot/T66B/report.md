# T66 B targeted re-pilot: leave out the gauge that only the stretch list names

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: `gauges-joined.txt`
(gauges.csv with flows.csv joined onto it; 12 nodes, 14 edges). Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T66B/ (not in git).

## Result

Reached, with the answer key's counts. A Data source filter card with gauges.csv ticked leaves G12
out of the picture and keeps every other stretch: top bar "11 of 12 nodes, 13 of 14 edges", card
chip "11 of 12", inspector "Nodes showing 11 of 12, Edges showing 13 of 14". The Nodes table on All
still lists G12, so the network still holds it. The data stayed the task's own (G01 to G12, the
gauge names and dates of gauges.csv) on every walk. Nothing crashed, blocked the task or gave a
wrong count.

## Routes walked

### 1. Success path by pointer (p1-success/)

Replayed from this pass's earlier walk; all 11 steps matched and the session ended.

- p1-success/01.png: the start. Sources: gauges.csv (11), flows.csv (12 nodes, 14 edges, 1 issue);
  Overview 12 nodes, 14 edges.
- p1-success/06.png: Filters "+" > Data source > tick gauges.csv: "11 of 12 nodes, 13 of 14 edges";
  G12 and its G09 -> G12 stretch are gone from the drawing, every other stretch stays drawn; the
  card chip reads "11 of 12".
- p1-success/08.png: the effect control reads "Select | Hide", Hide on; tooltip "Hide nodes that do
  not match".
- p1-success/09.png: Edges table on Shown: "13 of 14 edges".
- p1-success/10.png: flows.csv ticked as well: top bar "12 of 12 nodes" (no edge count), card chip
  "12 of 12", inspector 12 of 12 and 14 of 14, as the answer key says.
- p1-success/12.png: flows.csv unticked again (11 of 12, 13 of 14); Nodes table on All lists G12.

### 2. The Data source card's count, by keyboard with a screen reader (p2-keys-card/)

The listed route of this task ("T66A/T66B success path: the Data source card's count"). Started
`--keys --sr`, replayed from the previous build's keyboard walk; all 46 steps matched. No step
left focus on the page body.

- p2-keys-card/02.png to 19.png: Tab runs Main menu, Project, Undo, Redo, Data, Sources, the two
  source rows, Fields, flows.csv's controls, gauges.csv, then Filters "+" ("Add filter").
- p2-keys-card/20.png to 22.png: Enter opens "Find an attribute"; typing "sou" highlights Data
  source; Enter makes the card and puts focus on checkbox "gauges.csv, 11 nodes".
- p2-keys-card/31.png: Space ticks it and announces "Filter on: 11 of 12 nodes, 13 edges"; the card
  chip reads "11 of 12".
- p2-keys-card/32.png to 39.png: the card's own controls are named "Apply from gauges.csv", radio
  "Hide nodes that do not match", "Remove from gauges.csv"; arrows on the on box do nothing; Enter
  and Escape in the attribute finder open and close it with focus back on "Add filter".
- p2-keys-card/40.png to 42.png: Control+Z announces "Filter off" and "Undid adding the filter
  "from gauges.csv"."; Control+Y brings it back with the same count announced.
- p2-keys-card/43.png to 47.png: F6 cycles the regions and comes back to "Add filter".

### 3. Detours (p3-detours/, p4-detours-2/)

The same detour set as the first pass, replayed: p3-detours matched all 36 steps; p4-detours-2
matched 54 of 55.

- Source row menu > Select nodes, and Remove of flows.csv (deletes all 14 edges; Undo brings them
  back): p3-detours/04.png, 06.png, 07.png.
- A card on Node id "G12" with Hide keeps only G12: "1 of 12 nodes, 0 of 14 edges"
  (p3-detours/18.png), as the answer key says; not success.
- A card on station "Has a value" with Hide gives "11 of 12 nodes, 13 of 14 edges", chip "11 of
  12" (p4-detours-2/43.png): the answer key's other right answer.
- A style layer with Visibility Hidden on Node id contains G12 hides G12's sphere but leaves its
  stretch from G09 drawn to nothing; the key reads "Show: Layer 1, 1 of 12 nodes"
  (p3-detours/37.png), as the answer key says; not success.
- Delete on G12's table row does nothing (p4-detours-2/53.png).
- Main menu > Open project or file... > gauges.csv replaces gauges.csv with itself; the notice
  "Replaced gauges.csv with gauges.csv" with Undo now stays on screen long enough that the recorded
  click on the canvas landed on its Undo (p4-detours-2/55.png, 56.png). This is where the replay
  differed; the data was unchanged (12 nodes, 14 edges) and the walk ended (57.png).

## Mismatch with the binding decisions

- The card's effects read "Select | Hide" (radio "Hide", tooltip "Hide nodes that do not match"),
  where the team decision of 2026-10-29 says "Select | Filter to | Filter out" with a new card on
  Filter out (p1-success/08.png, p2-keys-card/34.png). It does not spoil grading: the counts are
  right and the answer key's T66 text still names Hide.

## Not walked

The other routes on this pass's list belong to T64, T65 and T68 (shortest path and weights, select
and filter cards with dates and depths, a style layer's Which nodes, the narrowed start), not to
T66 B. They were not walked here.
