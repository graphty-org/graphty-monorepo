# T70 B (gauges) -- targeted re-pilot on build f0a9a014cb

Build: f0a9a014cb, served from `.study-builds/tier5-r1d1-f0a9a014cb`. Start: `setup:gauges-clean.txt`
for every walk (the node table is open when the setup ends). Screenshots are under the main
checkout's `tmp/design-studio/tier5/r1d1/pilot/T70B/<walk>/` (kept out of git).

Walked: the success path by pointer; the four routes of this pass's list that belong to this task,
each its own session -- touched-2 (success path with the table open at start), touched-25 (the
success path with `installed` Before 2000), touched-31 (Cancel on a new filter card, then Ctrl+Z
and Ctrl+Shift+Z) and touched-39 (the success path); and the success path by keyboard. The other
routes in the list belong to other tasks and were not walked here.

## Result

Reached. Nothing crashes, blocks the task, or gives a wrong result on screen that would spoil its
grading. Every pointer walk ends with one filter card, `telemetry yes`, top bar "7 of 11 nodes, 3
of 13 edges", Layer 1's Which nodes "installed before 2000", "2 of 7", key "Color: Layer 1, 2 of 7
nodes", and the table showing the 7 rows the top bar counts.

## success (pointer)

Replayed the earlier pass's 14 steps; every step matched. + > Layer; Which nodes; `installed`;
2000, Enter; Done; Fill +; E4572E, Enter; Data; Add filter; `telemetry`; yes; Done; Graph.

- The table is open from the start (tmp/design-studio/tier5/r1d1/pilot/T70B/success/01.png). While
  picking, the workspace's table lists the 3 matches (G01, G05, G09) under "3 of 11"
  (tmp/design-studio/tier5/r1d1/pilot/T70B/success/06.png); the filter workspace's table lists the 7
  that send readings (tmp/design-studio/tier5/r1d1/pilot/T70B/success/13.png).
- End: tmp/design-studio/tier5/r1d1/pilot/T70B/success/15.png. Matches the answer key (7 in the
  picture, 2 in orange).

## touched-2 (success path, table open at start)

The same route in its own session; every step matched. The dock table reads "7 of 11 nodes", Shown,
and lists G01, G02, G04, G06, G07, G09, G11 -- the rows the top bar counts.
tmp/design-studio/tier5/r1d1/pilot/T70B/touched-2/15.png

## touched-25 (installed Before 2000)

Every step matched: picking `installed` opens on Before with the date box focused; 2000, Enter
gives "installed before 2000", 3 of 11 (before the filter); the end reads 2 of 7.
tmp/design-studio/tier5/r1d1/pilot/T70B/touched-25/06.png,
tmp/design-studio/tier5/r1d1/pilot/T70B/touched-25/15.png

## touched-31 (Cancel on a new filter card)

Replayed the earlier pass's route; every check point matched. A new layer's Cancel, Ctrl+Z (brings
back "installed before 2000", 3 of 11), then Data, Add filter, `telemetry`, yes, Cancel: no card
left, no filter mark, the table lists all 11
(tmp/design-studio/tier5/r1d1/pilot/T70B/touched-31/04.png). The Undo button names the layer's last
condition edit, not the cancelled card (07.png); Ctrl+Z undoes that edit (Which nodes "installed",
11 of 11, 08.png) and Ctrl+Shift+Z redoes it (09.png). No card comes back.

## touched-39 (success path)

The same route in its own session; every step matched, the same end screen.
tmp/design-studio/tier5/r1d1/pilot/T70B/touched-39/15.png

## keyboard (Tab, Shift+Tab, Enter, Space, Escape)

Filter first (an equal route), then the layer. Focus never fell to the page body after the start.

- Control+K, "filter", Enter: picker "Find attributes, results", heard "Editing New filter,
  Filters". The replayed earlier steps matched through the header's Tab order and Clear; Enter on
  Cancel diverged as intended: focus "Add filter", heard only "Filter not added" (the old extra
  "Filter off" is gone) (tmp/design-studio/tier5/r1d1/pilot/T70B/keyboard/36.png).
- Control+K, "filter", Enter, Escape on the empty picker: focus "Add filter", "Filter not added".
- Control+K, "filter", Enter, `telemetry`, Enter, Space: checkbox "yes, 7 nodes" checked, heard
  "7 of 11 nodes"; Escape to treeitem "telemetry yes, 7 of 11 nodes"; Escape: "Done, 7 of 11".
- Control+K, "layer": options "Add layer" and "New layer from selection, Select something first"
  (disabled). Enter: textbox "Layer name" value "Layer 1" (rename mode). Tab leaves it for "Graph
  settings", then "Resize left panel", Canvas "Graph drawing", "Quick actions", the table's
  controls, "Key id", "Select what it paints", "Layer actions", tab "Style", tab "Node", checkbox
  "Style nodes", treeitem "Which nodes, 7 of 7 nodes" (21 Tabs from the layer's name).
- Enter: picker focused, heard "Editing Which nodes, Layer 1"; `installed`, Enter: combobox
  "installed before, a date or a year" focused; 2000; Enter keeps focus there; Escape: treeitem
  "installed before 2000, 2 of 7 nodes so far"; Escape: "Done, 2 of 7".
- Tab x5 to "Add to node fill"; Enter: textbox "Node color, not set, drawn #6366F1 indigo", text
  selected, heard "Node color added: pick a value"; E4572E, Enter: "Node color, set here, red",
  heard "Node color now red, on 2 nodes". Escape in the color box does nothing (focus stays); Tab
  goes to "Node color by attribute".
- End: 7 of 11, Layer 1 2, Which nodes 2 of 7, key 2 of 7 nodes
  (tmp/design-studio/tier5/r1d1/pilot/T70B/keyboard/78.png).

## Defects

- **Which nodes announces counts over the whole graph while the screen counts the filtered graph**
  (keyboard, filter on first). After picking `installed` the screen reads "7 of 7" and the status
  says "7 of 11 nodes" (tmp/design-studio/tier5/r1d1/pilot/T70B/keyboard/65.png); typing 2000 is
  announced "2 of 7 nodes" and then "2 of 11 nodes" while the screen reads 2 of 7
  (tmp/design-studio/tier5/r1d1/pilot/T70B/keyboard/66.png). A screen-reader participant hears the
  last count, 2 of 11, which disagrees with the header, the step and the key. The orange count (2)
  is right; the denominator is not.
- **Escape in the node color box does nothing** (keyboard): focus stays in the box with the value
  kept (tmp/design-studio/tier5/r1d1/pilot/T70B/keyboard/77.png). Not blocking; Enter has already
  applied the value.
- **A layer from Quick actions is 21 Tabs from Which nodes** (keyboard): Tab from the new layer's
  name goes to "Graph settings" and then through the canvas, the toolbar and the whole table before
  reaching the layer's panel. Not blocking.

## Mismatches with the answer key

None. The success path takes the key's 15 steps and the screens read as the key says.
