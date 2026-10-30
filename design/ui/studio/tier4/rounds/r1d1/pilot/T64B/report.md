# T64 B pilot: the gauge's name and the river distance

Build 037e96e9bb (frozen tier 4 build), start `gauges-joined.txt` (gauges.csv with flows.csv joined).
Every walk replayed the previous walk of the same route and matched it screen for screen; each was
looked at screenshot by screenshot. Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp.

**Reached: yes.** The program calls G05 **Old Bridge**: the inspector heading, the find box's
result ("Old Bridge, Node id: G05") and the edge table's Source and Target all use the station
name. The weight is km with "Higher means" farther, and Shortest path opens on "km (farther,
loaded)" and reports Total km.

## Success path, by pointer

/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp/pointer (18 steps) and /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp/success-keys (the same path plus Enter, Tab and Escape in every field
it opens, 37 steps).

- Data > Fields: Expand gauges.csv, "+" Add to node fields > Label > station (07.png); flows.csv
  "+" Add to edge fields > Weight > km; Higher means > farther (12.png: the Graph overview reads
  "Loaded weight km (farther)").
- Clicking the G05 row: the inspector names it Old Bridge (pointer/15.png).
- The canvas toolbar's Quick actions answers "No results" for "Old" and "G05" (pointer/14.png), as
  the answer key says. The Graph place's find box finds it (success-keys/27.png); Enter selects it,
  Escape clears the box and keeps the selection (28.png); Tab leaves the box.
- Higher means: Escape closes the list, Enter opens it, ArrowDown + Enter picks, Tab moves on
  (success-keys/32-37.png). Picking capacity shows "Loaded weight km (capacity)" (36.png); setting
  farther again restores it (38.png).

No mismatch with the answer key's path or result.

## Detours

Held to the detours the first pilot walked.

- **Style text, then the Analyze list for a weight, then the table header Role menu**
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp/detour-style-table, 26 steps). Graph > Everything > Text "+" > Label > station draws the
  names (09.png). Analyze, typed "weight", lists Shortest path (09.png); its Weight list offers
  None and km (farther) and opens on None while Data has no weight (11.png). Table header station
  > Role > Label, then km > Role > Weight sets the weight and leaves Higher means empty (20.png), as
  the answer key says. With farther set in Data, Shortest path opens on "km (farther, loaded)"
  (22.png) and the run reports Total km 5.3 from Old Bridge to Lake Inlet (27.png).
- **The inspector and the canvas menu** (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp/detour-inspector, 7 steps): Node actions, the
  row's context menu, a node's context menu > Path between... (opens Shortest path from G02,
  06.png), Settings and Escape. Nothing broke.

## Keyboard only

/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/rp/keyboard (116 steps, keyboard-only session). Reached the end: Fields Label station and Weight
km farther set from the keyboard, F6 cycles the regions, the find box finds "Old Bridge Node id:
G05" and Enter moves focus to the inspector heading "Old Bridge", Analyze > Shortest path from
Old Bridge to Lake Inlet with Weight "km (farther, loaded)", Find path. Focus never fell to the
page body. Every control had a name.

## Defects

- **The path result names gauges by code after the label is set.** Shortest path's "Nodes in
  order" lists G05, G08, G09 while From and To read Old Bridge and Lake Inlet, and the screen
  reader reads the rows as "G05 1", "G08 2". Seen with the label set in Fields (keyboard/114.png,
  117.png) and from the table header (detour-style-table/27.png). It does not change the answer
  (Old Bridge), but the prompt asks that the program use the station name everywhere, so a
  participant checking the result can think the label did not take.

## Not walked

The other routes in this re-pilot's list belong to other tasks (T60 to T63, T65 to T68, T64 A)
and to their own pilots.
