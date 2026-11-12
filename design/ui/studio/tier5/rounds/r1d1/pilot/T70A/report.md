# T70 A pilot on build 797a4f6b47 (targeted re-walk)

The study build is 797a4f6b47 (`.study-builds/tier5-r1d1-797a4f6b47`). Every walk starts from the
task's real start (`rounds/tier-5/setups/volunteers.txt`: volunteers.graphml open, PageRank run).
Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d1/pilot/T70A/<walk>/`.

This pass walks only the pointer success path and the T70 A routes the last fixes touched. The
keyboard walk and the untouched detours were not asked for this pass; their last reading stands.

## Result

Reached. The answer key's values hold on every route: top bar "15 of 24 nodes, 25 of 63 edges",
the staff layer's Which nodes "4 of 15", the key "Color: Layer 1, 4 of 15 nodes". No crash, no
script error, nothing that blocks the task or spoils its grade.

## Walks

### success -- the pointer success path

Replayed the earlier pass's 15 steps; every check point matched (Add a layer or a folder, Layer,
Which nodes, role, staff, Done, Add to node fill, E4572E Enter, Data, Add filter, trained,
Value..., Yes, Done). 15 steps, as the answer key counts.

- After the fill: "5 of 24" and key "5 of 24 nodes" before the filter (success/10.png).
- End: "15 of 24 nodes, 25 of 63 edges"; Which nodes "4 of 15"; key "Color: Layer 1, 4 of 15
  nodes", "4 nodes covered by Layer 1"; the card reads "trained Yes" (success/16.png).
- No mismatch with the answer key.

### touched-1 -- column header Filter to..., then Done

Table, the trained column's Options, Filter to... The workspace opens titled "trained pick yes or
no -- Filters 24 of 24" with the main table below the preview and no second table (the duplicate
table the earlier pass showed is gone: touched-1/05.png). Value..., Yes: "trained Yes -- Filters
15 of 24", "No match 9" (touched-1/06.png). Done: top bar "15 of 24 nodes, 25 of 63 edges", the
table "15 of 24 nodes", Shown, the card "trained Yes" (touched-1/07.png). The element counts 15 of
24 for the card. Works.

- Seen, not a grade risk: after the column's Filter to..., the Value... field is not opened for the
  person (the Add filter route opens its picker); one more click. Between the preview and the table
  there is a blank band of about 200 px (touched-1/05.png, 06.png).

### touched-12 -- fill added while the layer matched every node

New layer, Which nodes, role, staff, Cancel (the layer stays All nodes); Fill E4572E Enter: every
node orange, Which nodes "24 of 24", the PageRank row shows the covered mark, the Fill row says
nothing about being covered (touched-12/03.png). Then Which nodes, Condition..., role, staff,
Escape, Escape: "role staff", "5 of 24", key "5 of 24 nodes", "5 nodes covered by Layer 1", and the
Fill row no longer claims "Covered by PageRank on 5 of 5" (touched-12/09.png). The false covered
warning the earlier pass met is gone: a hover on "Covered by" now finds only the key's line.

### touched-38 -- the filter first, then the layer

Data, Add filter, trained, Value..., Yes ("15 of 24", touched-38/03.png), Done (touched-38/04.png);
Graph, Add a layer or a folder, Layer, Which nodes, role, staff: the workspace header reads "Which
nodes -- Layer 1 4 of 15", the value list counts over the drawn graph (volunteer 9, staff 4, board
2), the strip lists v02, v09, v17, v21 (touched-38/07.png). Done, Fill E4572E Enter: Which nodes
"4 of 15", the layer row "4", Everything "15", key "4 of 15 nodes" (touched-38/09.png). Tab then
Escape from the color box leaves focus on the link button beside it, nothing lost
(touched-38/10.png). The answer key's "Also success" holds: staff 4.

## Defects

None that crash, block or spoil the grade on these routes. Small, for the record:

- The column header route's Value... is not opened for the person, unlike Add filter's picker
  (touched-1/05.png).
- A blank band between the preview and the table in the filter workspace opened from the table
  (touched-1/05.png).
- E4572E sits inside the PageRank gradient's orange range, so the 4 staff nodes are hard to tell
  from the PageRank nodes by eye; the counts ("4 of 15") answer the question (success/16.png).
