# T76 A pilot (sources): targeted re-walk on build 47c95a09fc

Build: 47c95a09fc, served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d2-47c95a09fc.
Start: the sources setup (sources.graphml, 24 nodes, 59 edges). Walks are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T76A.

## Scope

The fixes in this build touched filter cards (Cancel on a new or an existing card, Escape after the
toolbar's Filters button, a new card from Quick actions) and the Which nodes step of a new layer.
T76 A uses neither: it is the add menu's Hover highlight folder on the style layers, and neither a
filter card nor a layer's Which nodes step is on its success path or its usual detours. So none of
the touched routes in the list belongs to this task; the routes listed there belong to other tasks
and are walked by their own pilots. This pass walked the success path by pointer and, as a cheap
regression check, re-ran the earlier keyboard walk.

## Success path by pointer (success)

Replayed from the earlier walk; all 7 steps matched the earlier screens.

1. Style layers "+" (Add a layer or a folder), hovered: tooltip "Add a layer or a folder" (02.png).
2. Clicked it: the add menu (03.png).
3. Hover highlight: a folder of 4 layers (Halo, Its edges, Fade edges, Fade nodes) in the list
   (04.png).
4. Pointer on node s20: s20 gets a green halo, its 6 ties drawn dark and strong, its 5 neighbors at
   full color, every other node and tie pale (05.png).
5. Pointer on empty canvas: the drawing as at rest, nothing pale (06.png).
6. Pointer on node s02: the same effect around s02 (07.png).
7. Pointer on the inspector: the drawing at rest again (08.png).

The data stayed the task's own the whole way: 24 of 24 nodes and 59 of 59 edges visible, from
sources.graphml (data.json). Two steps, as the answer key says; no mismatch with the key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T76A/success/02.png
to 08.png.

## Keyboard (keyboard)

Replayed from the earlier keyboard walk. Steps 1 to 39 matched (find "Silverline", Enter selects
s20, Escape clears the selection). At step 40 the build differs: after Escape a toast "Selection
cleared: 1 node" with a Dismiss button is shown, and Shift+Tab from the panel heading now reaches
"Dismiss" first, then "Analyze" (41.png). That is a reachable, named control, not a defect.

Carried on by hand: Shift+Tab to "Add a layer or a folder"; Enter opens the menu on "Layer"; Escape
closes it and returns focus to the button. In the layer list, the arrows walk the rows, ArrowRight
opens "Hover highlight, folder, 4 layers", and Enter selects "Fade nodes, node layer, 0 nodes". Tab
then runs Graph settings, the panel's resize handle, the canvas ("Graph drawing"), Analyze, Select
what it paints, Layer actions, Style, Node, "Which nodes, 0 of 24 nodes", Edit Which nodes, the
Add to buttons and "Node opacity" (value 30). In "Node opacity": Ctrl+A, 40, Enter keeps 40 and
announces "Node opacity now 40 %, on 0 nodes"; Ctrl+A, 50, Escape puts back 40 and announces "Edit
discarded; this stays 40%."; Tab leaves the field; Ctrl+Z undoes the change ("Undid changing node
opacity on Fade nodes.", the field back at 30). Focus never fell to the page body; every control had
a name. The hover effect itself cannot be shown by keyboard (a hover needs a pointer), as before.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d2/pilot/T76A/keyboard/40.png
to 48.png.

## Defects

None that crashes, blocks the task or spoils its grading.
