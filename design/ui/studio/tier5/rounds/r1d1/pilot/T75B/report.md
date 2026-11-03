# T75 B pilot (targeted re-pilot): the yeast network made readable

Build 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`), setup `yeast.txt`, 1440 x 900.
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75B/
(not in git). The earlier walk of this folder's name, on build f0a9a014cb, was moved to
build-f0a9a014cb/ there.

Result: **reached**. The success path ends on "24 of 331 nodes, 4 of 361 edges", the answer key's
count, with the graph's own 331 nodes and 361 edges unchanged (nothing deleted; data.json: total 331
nodes and 361 edges, visible 24 and 4).

This was a targeted re-pilot: only the pointer success path and the routes the fixes touched that
belong to this task were to be walked. Every touched route in the list is a T70, T72, T73, T74 or
T79 route (the Fill + control of a style layer and the selection workspace's Done); none belongs to
T75 B, so only the success path was walked. Detours and the keyboard walk were not asked for in
this pass; their last walks are in the earlier report of this folder's history.

## Success path, pointer (success/)

Replayed from the pointer success walk on build d3fda9f2b6
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T75B/success); all 15
steps matched their recorded screens. Data; Add filter; type "largest"; Enter (Largest component,
249 of 331); Condition...; "degree"; Enter; 2; Enter (170 of 331, success/10.png); Condition...;
"gal80"; Enter; 0.5; Enter (24 of 331, success/14.png); Tab; Done. The card "Largest component"
lists its three steps and the top bar reads "24 of 331 nodes, 4 of 361 edges" (success/16.png).

Matches the answer key at every count (249, 170, 24); no mismatch. After Done the card shows Edit
in place of its count while the pointer is near it (success/16.png), as the answer key already
records; the top bar and the Values tab ("Nodes showing 24 of 331") give the count.

## Defects

None new on the walked route.
