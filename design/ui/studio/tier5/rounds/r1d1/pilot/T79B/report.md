# T79 B pilot: one kind in a network of 50,000 (state sensors)

Build 1e123d7d33 (served from `.study-builds/tier5-r1d1-1e123d7d33`), start `setup:sensors-50k.txt`,
1440 x 900. A targeted re-pilot after a fix pass: the pointer success path, and the three routes the
fixes touched that belong to this task. Every walk started from the task's real start and ended.
Walk folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/ (earlier builds'
walks moved to build-f0a9a014cb/ and build-797a4f6b47/ there).

**Result**: reached on every walk. Layer 1 selects basin Otter Creek, filled FFA500 orange; Which
nodes reads "1,050 of 50k", the layer row 1,050, the key "Color: Layer 1, 1,050 of 50,000 nodes".
The data stayed the task's own sensors file (50,000 nodes) throughout. Nothing crashed, blocked
the task or gave a wrong count.

## Walks

### success -- pointer success path

Replayed the previous round's pointer route: all 13 steps matched. + > Layer; Which nodes; basin;
type Otter Creek; tick Otter Creek (1,050); Done; Fill +; type FFA500, Enter; then 00FF00 and
Escape (discarded, stays FFA500); Tab.

- The Fill + now opens an empty color box (no indigo swatch, no 6366F1 text) until a color is
  typed: success/11.png. Enter commits FFA500: success/12.png.
- Waits: opening Which nodes about 6.8 s, the tick about 5.5 s, Done about 6 s; Fill and the color
  under 3 s.
- Right after Done, Which nodes' title row shows Edit in place of the count (known, answer key):
  success/09.png; the count shows once focus moves (success/12.png).

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/success/08.png
(ticked, 1,050 of 50,000), .../success/09.png, .../success/11.png, .../success/12.png, .../success/14.png.

### touched-8 -- success path and keyboard (Fill +)

Keyboard-only, screen-reader mode: replayed the previous keyboard route; 39 of 45 steps matched,
and it diverged where the fix landed: Enter on "Add to node fill" now focuses `textbox "Node color,
not set"` with no value (was "Node color, not set, drawn #6366F1 indigo" value 6366F1), with
"Node color added: pick a value" (touched-8/41.png). Carried on by hand:

- type FFA500, Enter: name becomes "Node color, set here, orange", announced "Node color now
  orange, on 1,050 nodes" (42.png).
- Tab: "Node color by attribute"; Shift+Tab back to the color box.
- type 00FF00, Escape: "Edit discarded; this stays FFA500 orange." Value back to FFA500.
- A second Escape in the color box does nothing (focus stays in the box). Same as earlier builds.
- `--read`: Fill shows "Add to node fill" disabled, "Pick node color", the box, "Node color by
  attribute", "Remove node color"; no duplicate or missing names.

Focus never fell to the page body. Path names on the way (unchanged from the previous round):
Main menu, Project, Undo/Redo (disabled), Graph, Find, "Add a layer or a folder" > Layer, Layer
name, the outline row, ... "Which nodes, 50000 of 50000 nodes", Find attributes, "Search basin",
"Check 1", "Otter Creek, 1050 nodes" (Space ticks it).

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/touched-8/41.png,
.../touched-8/42.png, .../touched-8/46.png.

### touched-11 -- success path (Done, then Fill)

Replayed the pointer success route again in its own session: all 13 steps matched. Fill + right
after Done opens the empty color box (touched-11/11.png); typing FFA500 and Enter paints the 1,050
nodes orange (touched-11/12.png). No key typed after Done was lost.

### touched-13 -- keyboard: Escape as Done returns focus to the Which nodes row

Keyboard-only, screen-reader mode, the keyboard route up to the tick (32 steps, all matched),
then on by hand.

- Escape in the value search leaves it for the workspace's outline row "basin Otter Creek, 1,050
  of 50,000 nodes so far" (31.png).
- Escape again acts as Done: "Done, 1,050 of 50,000" is announced, the workspace closes after about
  6 s, and focus lands on the inspector's Which nodes row, "Which nodes, 1050 of 50000 nodes"
  (32.png shows the ring on it; `--read` confirms focus). The step's first focus report still
  names the outline row, because the workspace stays open while the result paints.
- Tab goes to "Edit Which nodes"; Shift+Tab returns to the Which nodes row.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T79B/touched-13/31.png,
.../touched-13/32.png, .../touched-13/35.png.

## Mismatches with the answer key

- The build notes say "A new Fill shows 6366F1 before its color is committed" and the color box
  is named "Node color, not set, drawn #6366F1 indigo". On this build a new Fill shows an empty box
  named "Node color, not set". The path itself (Fill; hex; Enter) and the value 1,050 match.

## Defects

None that crash, block the task or spoil its grade. Seen and already known (answer key): Edit in
place of the count on the focused Which nodes row right after Done; spoken counts drop the
thousands separators ("1050 of 50000 nodes"); the single-step row is named "... so far"; a second
Escape in a color box does nothing.
