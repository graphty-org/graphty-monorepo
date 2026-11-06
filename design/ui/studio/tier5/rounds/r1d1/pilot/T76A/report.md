# T76 A pilot (sources): targeted re-walk on build 1e123d7d33

Build: 1e123d7d33, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33.
Start: the sources setup (sources.graphml, 24 nodes, 59 edges). Walks are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76A. The walk there
from the earlier build f0a9a014cb was kept as success-buildf0a9a014.

## Scope

The fixes in this build touched the Fill section's "+" in layer workspaces (adding a fill line, Enter
with nothing typed, Done followed at once by Fill +, Escape as Done returning focus to the Which nodes
row) on the routes of other tasks. T76 A's route is the add menu's Hover highlight folder: no layer
workspace is opened and Fill's "+" is not used. Every touched route in the list belongs to the task
its name starts with (T70, T72, T73, T74, T79) and is walked by that task's pilot; none is a T76
route. This pass walked the success path by pointer.

## Success path by pointer (success)

Replayed from the previous pass's walk; all 7 steps matched the earlier screens.

1. Style layers "+" (Add a layer or a folder), hovered: tooltip "Add a layer or a folder" (02.png).
2. Clicked it: the add menu -- Layer, Folder, Hover highlight, Analyze... (03.png).
3. Hover highlight: a folder of 4 layers between Pinned and Everything, the inspector on the folder
   (04.png).
4. Pointer on a node in the top-left cluster: a green halo on it, its 6 edges dark and strong, its
   neighbors at full color, every other node and edge pale; the key card opens over the canvas's
   top left (Halo 1 of 24 nodes, Its edges 6 of 59 edges, Fade edges 53 of 59, Fade nodes 17 of 24)
   (05.png).
5. Pointer on empty canvas: the drawing as at rest, nothing pale, the key card closed (06.png).
6. Pointer on a node in the bottom cluster: the same effect around it, 5 edges (07.png).
7. Pointer on the inspector: the drawing at rest again (08.png).

The data stayed the task's own the whole way: 24 of 24 nodes and 59 of 59 edges visible, from
sources.graphml (data.json). Two steps, as the answer key says; no mismatch with the key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76A/success/02.png
to 08.png.

## Defects

None that crashes, blocks the task or spoils its grading.
