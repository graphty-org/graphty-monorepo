# T70 A pilot on build c3100058ab (targeted re-walk)

The study build is c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). Every walk starts from the
task's real start (`rounds/tier-5/setups/volunteers.txt`: volunteers.graphml open, PageRank run).
Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d3/pilot/T70A/<walk>/`.

This pass walks only the pointer success path and the T70 A route the last fixes touched (the
success path's Done on a small graph, against the change that keeps "Drawing" on screen until a
large graph's result is painted). The other touched routes in this pass's list belong to other
tasks (T70 B, T72 B, T79 A, T79 B) and their own pilots. The keyboard walk and the detours were not
asked for this pass; their last reading stands.

## Result

Reached. The answer key's values hold: top bar "15 of 24 nodes, 25 of 63 edges", the staff
layer's Which nodes "4 of 15", the key "Color: Layer 1, 4 of 15 nodes", "4 nodes covered by Layer
1", the filter card "trained Yes". No crash, no script error, nothing that blocks the task or
spoils its grade.

## Walks

### success -- the pointer success path

Replayed the previous pass's 15 steps; every check point matched (Add a layer or a folder, Layer,
Which nodes, role, staff, Done, Add to node fill, E4572E Enter, Data, Add filter, trained,
Value..., Yes, Done). 15 steps, as the answer key counts.

- After the fill, before the filter: Which nodes "5 of 24", key "5 of 24 nodes"
  (tmp/design-studio/tier5/r1d3/pilot/T70A/success/10.png).
- The filter workspace before Done: "trained Yes -- Filters 15 of 24", "No match 9"
  (success/15.png).
- End: "15 of 24 nodes, 25 of 63 edges"; Which nodes "4 of 15"; key "Color: Layer 1, 4 of 15
  nodes" (success/16.png).
- No mismatch with the answer key.

### touched-14 -- Done on a small graph (regression check)

The same 15 steps, replayed with a frame saved 300 ms after each input to see what a person sees
while each step works. Every check point matched.

- The layer's Done: 300 ms after the click the workspace is already closed and the layer drawn
  with its result (Layer 1 row "5", Which nodes "Edit" with "role staff"); no "Drawing" and no
  preview look (picks marked, the rest dimmed) left on the canvas
  (tmp/design-studio/tier5/r1d3/pilot/T70A/touched-14/08-glance.png).
- The filter's Done: 300 ms after the click the workspace is closed and the final picture is
  painted: "15 of 24 nodes", "4 of 15", the card "trained Yes"
  (touched-14/16-glance.png, the same as touched-14/16.png).
- Every step answered its input within 100 ms and drew its first frame within 100 ms
  (route.jsonl). On a graph this size the workspace closes as before the change, as the binding
  decision says.

## Defects

None that crash, block or spoil the grade on these routes.
