# T76 A pilot (sources): targeted re-walk on build f0a9a014cb

Build: f0a9a014cb, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-f0a9a014cb.
Start: the sources setup (sources.graphml, 24 nodes, 59 edges). Walks are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76A. Walks there from an
earlier build (797a4f6b47) were kept as success-build797a4f6b, detour-2-build797a4f6b and
crops-build797a4f6b.

## Scope

The fixes in this build touched filter cards (new and existing cards, Cancel and Done, focus
return), the table's column-header filter, By position and date bounds in layers, references typed
by name, and the 50,000-node reference list. None of that is on T76 A's route: T76 A is the add
menu's Hover highlight folder, with no filter card and no layer edited. Every touched route in the
list belongs to the task its name starts with (the one T76 route listed is T76 B's hand-built
hover layers) and is walked by that task's pilot. This pass walked the success path by pointer.

## Success path by pointer (success)

Replayed from the previous pass's walk; all 7 steps matched the earlier screens.

1. Style layers "+" (Add a layer or a folder), hovered: tooltip "Add a layer or a folder" (02.png).
2. Clicked it: the add menu -- Layer, Folder, Hover highlight, Analyze... (03.png).
3. Hover highlight: a folder of 4 layers in the list, the inspector on the folder (04.png).
4. Pointer on a node in the top-left cluster: a green halo on it, its 6 edges dark and strong, its
   neighbors at full color, every other node and edge pale (05.png).
5. Pointer on empty canvas: the drawing as at rest, nothing pale (06.png).
6. Pointer on a node in the bottom cluster: the same effect around it, 5 edges (07.png).
7. Pointer on the inspector: the drawing at rest again (08.png).

The data stayed the task's own the whole way: 24 of 24 nodes and 59 of 59 edges visible, from
sources.graphml (data.json). Two steps, as the answer key says; no mismatch with the key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T76A/success/02.png to 08.png.

## Defects

None that crashes, blocks the task or spoils its grading.
