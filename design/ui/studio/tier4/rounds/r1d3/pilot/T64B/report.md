# T64 B pilot: the gauge's name and the river distance (targeted re-pilot)

Build a53beb7179 (frozen, served from .study-builds/tier4-r1d3-a53beb7179), start `gauges-joined.txt`.
Every walk started from the task's real start and was driven by clicks, typing and keys only.
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T64B.

**Reached: yes.** With Label station and Weight km, Higher means farther set in Data > Fields, the
inspector names G05 **Old Bridge**, and Shortest path from Old Bridge to Lake Inlet lists Old Bridge,
Heron Marsh, Lake Inlet with Total km 5.3 and Weight km (farther). No mismatch with the answer key.
The data stayed the task's own the whole way (12 nodes, 14 edges, gauges.csv and flows.csv).

## Routes that matched the earlier walks to the end

A replay of each of these earlier routes on this build matched every check point to the end, so
the earlier findings stand for them: the pointer success path (pointer, success, success-c), the
inspector detour (detour-inspector, detour-inspector-c), the style text detour (detour-style), the
style text plus table-role detour, other order (detour-style-table-c), and the field-key walks
(fields-keys-c, fields-keys-d).

## Detour: style text, then Weight from the table's Role menu, then Analyze (detour-style-table)

Replayed 24 steps unchanged. Style > Text > Label > station; the km header's Role > Weight; Data >
Higher means > farther; Analyze > Shortest path from G05.

- The earlier route's last step, Escape in the open path form, now steps back to the analyses list
  instead of leaving the form open (detour-style-table/26.png). That is one level back, as a person
  expects; not a defect.
- Reopening Shortest path starts a fresh form with From empty and Weight already on
  "km (farther, loaded)" (27.png, 28.png): the weight set in Data is read, as decided.
- From typed as the code G05 finds Old Bridge; Find path gives Old Bridge, Heron Marsh, Lake Inlet,
  Total km 5.3, Weight km (farther) (29.png).

## Keyboard only (keyboard, keyboard-c, keys)

The three routes replayed 104 steps unchanged and parted at the same step: Tab onto the path form's
Weight now reads `combobox "Weight" value "km (farther, loaded)"` where the earlier build read
"None". That is the decided fix (a weight given in Data is the weight the analyses read). Each was
carried on by hand to the result.

- Weight list: Enter and Space open it on "km (farther, loaded)"; ArrowDown moves to None; Escape
  closes it and keeps "km (farther, loaded)" (keyboard/107-109.png, keys/107.png).
- Advanced: Enter opens the Advanced dialog with focus in it (Method "Chosen automatically");
  Shift+Tab closes it and returns to the Advanced button (keys/108-109.png).
- Pick To on the canvas: Space presses it and announces "Click a node on the canvas"; Escape leaves
  it with focus kept on the button (keys/110-111.png).
- To node: Enter on an empty box marks it invalid with "Choose a node" under it (keyboard-c/108.png);
  typing "Lake" offers Lake Inlet and Enter picks it and moves focus to Find path.
- Find path (Enter or Space): focus moves to the result's heading "Shortest path"; the status region
  announces "Shortest path added: Old Bridge to Lake Inlet, km 5.3" (keyboard/115.png,
  keyboard-c/110.png, keys/113.png).
- Every focused control had a name; focus never fell to the page body.
- The status region's first message, "Queued, 1st", arrives with the region already holding it, so
  many screen readers will not read it. The later messages are read. Minor, unchanged from earlier
  passes.

## Not walked

The other routes in this re-pilot's list (the T65 A and T65 B paths, follow-ups, keyboard walks
and style-layer detour; the T66 A/B Data source card; the T68 A/B starts) belong to other tasks and
their own pilots: none uses this task's start or asks this task's question.

## Defects

None that crashes, blocks the task or gives a wrong result.
