# T76 A pilot (sources): targeted re-walk on build c3100058ab

Build: c3100058ab, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d3-c3100058ab.
Start: the sources setup (sources.graphml, 24 nodes, 59 edges). Walks are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T76A.

## Scope

The fixes in this build touched filter cards (Cancel and Done on new and existing cards, Undo after
Cancel, focus and announcements when a card goes, cards on a 50,000-node graph) and nothing on the
style layers' add menu. T76 A is the add menu's Hover highlight folder: no filter card is on its
success path or its usual detours, so none of the touched routes in the list belongs to this task
(each belongs to the task its name starts with and is walked by that task's pilot). This pass walked
the success path by pointer.

## Success path by pointer (success)

Replayed from the previous walk; all 7 steps matched the earlier screens.

1. Style layers "+" (Add a layer or a folder), hovered: tooltip "Add a layer or a folder" (02.png).
2. Clicked it: the add menu (03.png).
3. Hover highlight: a folder of 4 layers in the list, the inspector on the folder (04.png).
4. Pointer on node s20: a green halo on it, its 6 ties dark and strong, its neighbors at full color,
   every other node and tie pale (05.png).
5. Pointer on empty canvas: the drawing as at rest, nothing pale (06.png).
6. Pointer on node s02: the same effect around s02, 5 ties (07.png).
7. Pointer on the inspector: the drawing at rest again (08.png).

The data stayed the task's own the whole way: 24 of 24 nodes and 59 of 59 edges visible, from
sources.graphml (data.json). Two steps, as the answer key says; no mismatch with the key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T76A/success/02.png
to 08.png.

## Defects

None that crashes, blocks the task or spoils its grading.
