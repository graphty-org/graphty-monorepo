# T78 A pilot (volunteers, strong ties): re-walk on build d3fda9f2b6

Task: on the volunteers network with `shifts` on each tie, put in orange everyone who has worked
together (more than one shared shift) with more than two different people, and report the count.
Answer key: 11 of 24.

Every walk started from the task's real start (`rounds/tier-5/setups/volunteers-shifts.txt`:
volunteers-shifts.graphml opened) on the frozen build
/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d2-d3fda9f2b6, driven by clicks,
typing and keys only. The data stayed the task's own file the whole way (volunteers-shifts.graphml,
24 nodes, 63 edges). Nothing crashed, blocked or gave a wrong count.

Walked here: the success path by pointer, and the one route in the touched list that belongs to
this task: every setup start (the list's eighth route). The other routes in the touched list are
detours and starts of other tasks (T71, T72 B, T75, T76, T77, T79). The keyboard walk and the
detours were not part of this targeted re-walk; their last reading stands.

Walks from an earlier build that sat in this folder were moved to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T78A/old-47c95a09fc.

## Success path by pointer

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T78A/success

Replayed from the walk on build c3100058ab
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T78A/success); all 15
steps matched. + > Layer; Which nodes; type "degree"; Enter; 3 Enter; Advanced; Edges where ...;
Edge value...; shifts; 2 Enter; Done; Fill; the color box; orange Enter.

- 12.png: the workspace header reads "Which nodes -- Layer 1 11 of 24"; the row reads "Degree min
  3 Edges"; Advanced's right reads "Edges: shifts min 2"; "No match 13". Matches the answer key.
- 16.png: the layer row reads "Layer 1 11", the key "Color: Layer 1, 11 of 24 nodes", the
  inspector "Which nodes 11 of 24" and Fill FFA500; 11 nodes drawn orange. Matches the answer key.

## Every setup start (touched route 8)

Folder: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T78A/touched-8

Started from the volunteers-shifts setup, then a click on Undo, Ctrl+Z, and a hover on Undo.

- 01.png to 03.png: the graph arrives as the setup left it (24 nodes, 63 edges, Everything 24);
  Undo is disabled (the click reports "element is not enabled"), and Ctrl+Z changes nothing.
- 04.png: the Undo tooltip reads "Nothing to undo". The setup's own steps cannot be undone.

The tool's self-test (`real.mjs --prove`) was started on the same build, written to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T78A/touched-8-prove
(log: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T78A/touched-8-prove.log);
its result is in that log (no check had failed when this report was written).

## Mismatches with the answer key

None.

## Defects

None found on these walks.
