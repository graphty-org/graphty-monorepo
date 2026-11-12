# T64 B pilot: the gauge's name and the river distance (targeted re-pilot)

Build ff17391bb1 (frozen, served from .study-builds/tier4-r1d2-ff17391bb1), start `gauges-joined.txt`.

**Reached: yes**, on the walks already taken on this same build (screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T64B, folders r3-*).
With Label station and Weight km, Higher means farther set in Data > Fields, the inspector names
G05 **Old Bridge**; Shortest path opens on "km (farther, loaded)" and lists Old Bridge, Heron
Marsh, Lake Inlet with Total km 5.3 (r3-pointer-sp/21.png). No mismatch with the answer key. The
data stayed the task's own (12 nodes, 14 edges) on every walk.

## Routes on this build

- Success path by pointer, then Shortest path (r3-pointer-sp): reached.
- Success path with Enter, Tab and Escape in every field (r3-success): matched.
- Table header Role > Weight, then Shortest path again (r3-detour-table-role, -rerun): a new run
  after Higher means > farther, path listed by name (r3-detour-table-role/15.png).
- Analyze list for a weight (r3-detour-analyze-weight): matched; names by code on this route
  because no label is set there, which is right.
- Style text, Analyze list, table header Role menu (r3-detour-style-table): reached Total km 5.3.
- The inspector and the canvas menu (r3-detour-inspector): matched.
- Keyboard only (r3-keyboard, 128 steps): reached; every control named, focus never fell to the
  page body.

A fresh replay of each of these into
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d1/pilot/T64B/r4-<walk> was
started but was still queued for a browser slot when this report was written.

## Defects

- Escape on the path form's "Pick To on the canvas" goes back to the list of analyses, and
  reopening Shortest path shows From empty: the chosen Old Bridge is dropped
  (r3-detour-style-table/26.png, 27.png). Does not change the answer.
- The status region's first message ("Queued, 1st") may not be spoken by a screen reader (keyboard
  walk, Find path step). Minor.

Nothing crashed, blocked the task or gave a wrong result.
