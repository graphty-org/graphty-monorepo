# T70 A pilot on build d3fda9f2b6 (targeted re-walk)

The study build is d3fda9f2b6 (`.study-builds/tier5-r1d2-d3fda9f2b6`). Every walk starts from the
task's real start (`rounds/tier-5/setups/volunteers.txt`: volunteers.graphml open, PageRank run).
Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d2/pilot/T70A/<walk>/`. The walks an earlier pass of the same name took on
build 47c95a09fc were moved to `tmp/design-studio/tier5/r1d2/pilot/T70A/build-47c95a09fc/`.

This pass walks the pointer success path and the one route in this pass's list that reaches T70 A:
every setup start, which now ends with an empty undo history. The other routes in the list belong
to T71, T72, T75, T76, T77 and T79 and their own pilots. The keyboard walk and the detours were not
asked for this pass; their last reading stands.

## Result

Reached. The answer key's values hold: top bar "15 of 24 nodes, 25 of 63 edges", the staff layer's
Which nodes "4 of 15", the key "Color: Layer 1, 4 of 15 nodes", "4 nodes covered by Layer 1", the
filter card "trained Yes". The data stays the task's own the whole way (`data.json`: 24 nodes, 63
edges, one source volunteers.graphml, 15 visible). No crash, no script error, nothing that blocks
the task or spoils its grade.

## Walks

### success -- the pointer success path

Replayed the previous pass's 15 steps; every check point matched (Add a layer or a folder, Layer,
Which nodes, role, staff, Done, Add to node fill, E4572E Enter, Data, Add filter, trained,
Value..., Yes, Done). 15 steps, as the answer key counts.

- After the fill, before the filter: Which nodes "5 of 24", key "5 of 24 nodes", Layer 1 row "5"
  (tmp/design-studio/tier5/r1d2/pilot/T70A/success/10.png).
- The filter workspace before Done: "trained Yes -- Filters 15 of 24", "No match 9"
  (success/15.png).
- End: "15 of 24 nodes, 25 of 63 edges"; Which nodes "4 of 15"; key "Color: Layer 1, 4 of 15
  nodes" (success/16.png).
- The Undo button names each own step ("Undo adding Layer 1", "Undo changing node color on Layer
  1", "Undo adding the filter ..."), so the person's own steps still undo.
- No mismatch with the answer key.

### touched-8 -- the setup start has no undo history

- Start: volunteers.graphml with the PageRank layer, Undo and Redo dimmed
  (tmp/design-studio/tier5/r1d2/pilot/T70A/touched-8/01.png).
- Hover on Undo: tooltip "Nothing to undo" (touched-8/02.png).
- Click on Undo: the button is disabled, the click does nothing (touched-8/03.png).
- Ctrl+Z: nothing changes; the PageRank layer and its gradient key stay, 24 nodes
  (touched-8/04.png). The setup's own steps cannot be undone, as the binding decision says.
- The tool's self-check (`real.mjs --prove`, log in touched-8/prove.log, sessions in
  touched-8/prove/) passes every check, among them "after a setup start Undo is disabled, with the
  tooltip Nothing to undo".

## Defects

None that crash, block or spoil the grade on these routes.
