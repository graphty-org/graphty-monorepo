# Pilot T60A: from a web address (sources.graphml), targeted re-pilot

Build: bccf8fe47f (frozen, `.study-builds/tier4-r1d2-bccf8fe47f`). Start: empty. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/ (not in git).

Result: reached on every route. The network opened from the address with 24 nodes and 59 edges,
matching the answer key, and the data stayed sources.graphml the whole way. Nothing crashed,
blocked the task or gave a wrong count.

None of the routes listed as touched by the fixes belongs to this task (they are T61, T65, T66,
T67 and T68 routes), so none was walked here.

## Routes replayed with no change

Every earlier walk of this task was replayed on this build. These matched every step to the end,
so their earlier findings stand unchanged: success, success-b, success-c (the success path by
pointer), detour-open-file (-b, -c), detour-menu-paste (-b, -c), detour-server (-c),
detour-add-data, keyboard, keyboard-b, keyboard-nosr. Their folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/.

## Keyboard walk with a screen reader, walked again (keyboard-c/)

Replayed from the earlier keyboard-c walk: steps 1 to 31 matched (Tab through the start screen,
Enter on "Open network data", Tab to the address box, type, Escape closes the dialog, reopen, type,
Tab to "Choose file", Enter opens the file chooser, Escape, Shift+Tab). The route diverged at
step 32, Enter in the address box, and was carried on by hand from there.

- 33 Enter opens the graph (24 nodes, 59 edges). Focus now lands on the inspector's heading
  "Graph, sources: 24 nodes, 59 edges" instead of falling to the page body. Announced once:
  "sources: 24 nodes, 59 edges", then "24 nodes, 59 edges" (no longer twice).
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/keyboard-c/33.png
- 34-35 Tab from the heading: "From sources.graphml", "Graph actions". 36-38 Shift+Tab goes back
  "From sources.graphml", toolbar "Analyze", canvas "Graph drawing".
- 39-44 F6 cycles toolbar "Analyze", left panel "Graph sources.graphml", inspector
  "From sources.graphml", canvas "Graph drawing", toolbar, left panel. The top bar is not in the
  cycle, and the inspector still comes before the canvas and toolbar (unchanged from the earlier
  pass).
- 45 read of the left panel: "Graph sources.graphml", Find, Style layers, four layers (Everything
  24 nodes, 59 edges), "Graph settings".
- 46-53 F6 to the inspector, then Tab: "Graph actions", tab "Values", "About Direction",
  "About Degree", "Resize inspector" (240 pixels, min), "Local only", then wraps to "Main menu".
- 54 read of the top bar: "graphty", "Main menu", "Project: sources", Undo (disabled).

The keyboard walk reached the end.

## Answer key against the screen

No new mismatch. The earlier pass's mismatches stand (their routes matched unchanged): the dialog
box has no Open button, so Enter is the only way to open the address; and Sources + > Server...
has no kind that loads a file from an address, so the key's "also success" Server route cannot work
on this build.

## Defects

Fixed since the earlier pass (keyboard-c 33): focus no longer falls to the page body after the
load, and "24 nodes, 59 edges" is no longer announced twice.

Still present (seen again on this walk):

1. F6 does not stop on the top bar, and goes left panel, inspector, canvas, toolbar; decided is top
   bar, left panel, canvas, toolbar, inspector (keyboard-c 39-44).

The earlier pass's other defects stand unchanged, since their routes replayed with no difference:
no Open button and Tab-then-Enter opening the file chooser, "Choose file" with no tooltip, the
Server form (Web API kind) unable to take a file address with Load and Test dimmed and no reason,
the Server form's dialog name being all of its text, no web-address door on the main menu or the
empty canvas card, Paste showing the browser's raw "Read permission denied" text, the source row's
repeated counts in its name and its hand pointer, the cut-short source name, 12 Tab stops before
"Open a file", focus starting on "Close" in the dialog, and the find box answering an address
with only "No match".

## Second pass on the same build (pass2/)

Walked again in fresh sessions on bccf8fe47f, each replayed from the earlier walk on this build.
Folders are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/pass2/.

- success (pointer): all 8 steps matched. Sources row has the link glyph, "24 nodes, 59 edges";
  the inspector shows Nodes 24, Edges 59. The data stayed sources.graphml throughout.
  pass2/success/09.png
- Detours, the same set the first round walked: detour-open-file, detour-menu-paste,
  detour-server, detour-add-data all matched every step to the end, so their earlier findings
  stand unchanged.
- keyboard-c (keys only, with a screen reader): steps 1 to 31 matched; step 32 (Enter in the
  address box) diverged. The graph opened with 24 nodes and 59 edges, but focus fell to the page
  body this time ("focus: nothing (the page itself)"), where the earlier walk of the same keys on
  the same build put it on the heading "Graph, sources: 24 nodes, 59 edges".
  pass2/keyboard-c/33.png. Carried on by hand: Tab from the body goes to "Main menu", then
  "Project: sources"; Shift+Tab goes back "Main menu", "Local only", "Resize inspector".
  F6 cycles canvas "Graph drawing", toolbar "Analyze", left panel "Graph sources.graphml",
  inspector "Resize inspector", canvas again (the top bar is never in the cycle). In the
  inspector, Shift+Tab goes "About Degree", "About Direction", tab "Values", "Graph actions",
  "From sources.graphml". The keyboard walk reached the end.

New on this pass:

2. Focus after opening the address with Enter does not land in the same place every time: on the
   same build and the same keys it went to the inspector heading in one walk and to the page body
   in this one (pass2/keyboard-c/33.png). A keyboard or screen-reader participant who lands on
   the body must Tab from the top bar to get back. The mechanism is not visible from a walk; the
   move of focus to the heading is not guaranteed to run after the load.
3. F6 entering the inspector lands on its "Resize inspector" separator, not on its first control
   (pass2/keyboard-c, the F6 steps after 38).

## Not walked

- The routes listed as touched by the fixes (T61A, T61B, T65A, T65B, T66A/T66B, T67A/T67B,
  T68A/T68B): they belong to other tasks, not T60A.

## Pass on the frozen build a53beb7179 (a53beb7179/)

Walked in fresh sessions on a53beb7179 (`.study-builds/tier4-r1d3-a53beb7179`), each replayed from
this folder's walk on bccf8fe47f. Folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/a53beb7179/.

Result: reached. The network opened from the address with 24 nodes and 59 edges, matching the
answer key; the data stayed sources.graphml the whole way. Nothing crashed, blocked the task or
gave a wrong count. None of the routes listed as touched by the fixes (T61, T65, T66, T67, T68)
belongs to this task, so none was walked here.

- success (pointer): all 8 steps matched to the end. Sources row has the link glyph, "24" and
  "59" (tooltip "24 nodes, 59 edges"); the inspector's Overview reads Nodes 24, Edges 59.
  a53beb7179/success/09.png
- keyboard-c (keys only, with a screen reader): steps 1 to 31 matched; step 32 (Enter in the
  address box) diverged. The graph opened with 24 nodes and 59 edges, but focus fell to the page
  body ("focus: nothing (the page itself)"), where the walk on bccf8fe47f put it on the heading
  "Graph, sources: 24 nodes, 59 edges"; and "24 nodes, 59 edges" was announced twice again after
  "sources: 24 nodes, 59 edges". a53beb7179/keyboard-c/33.png. Carried on by hand: Tab from the
  body goes "Main menu", "Project: sources"; Shift+Tab goes back "Main menu", "Local only",
  "Resize inspector". F6 cycles canvas "Graph drawing", toolbar "Analyze", left panel
  "Graph sources.graphml", inspector "Resize inspector", canvas again; the top bar is never in the
  cycle. Read of the canvas region lists the toolbar's seven buttons. Shift+Tab from the canvas
  goes "Resize left panel", "Graph settings", the "Everything" layer row, "Add a layer or a
  folder", "Find". The keyboard walk reached the end. a53beb7179/keyboard-c/34.png to 49.png

Defects on this build (all seen before, none new):

1. Focus after opening the address with Enter falls to the page body, and the count is announced
   twice (keyboard-c/33.png). Across passes the same keys put focus on the inspector heading in
   one walk and on the body in others, so the move of focus to the heading does not reliably run
   after the load.
2. F6 does not stop on the top bar, and enters the inspector on its "Resize inspector" separator
   rather than its first control (keyboard-c, the F6 steps).

Answer key against the screen: no new mismatch. The earlier mismatches stand: the address box has
no Open button (Enter is the only way to open the address), and the Server route the key lists as
"also success" cannot load a file address.

Not walked on this build: the detours (detour-open-file, detour-menu-paste, detour-server,
detour-add-data) and the keyboard, keyboard-b and keyboard-nosr walks, which matched every check
point when replayed earlier; their findings stand.

## Detours replayed on the frozen build a53beb7179 (full-a53/)

Each walk was replayed in its own session on a53beb7179 from the newest earlier walk of the same
route. Folders are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/full-a53/.

- detour-open-file, -b, -c: all 18 steps matched to the end.
- detour-menu-paste, -b, -c: all 6 steps matched to the end.
- detour-server: all 15 steps matched to the end.
- detour-add-data: both steps matched to the end.

These routes showed the same screens as before, so their earlier findings still hold: the Server
form cannot load a file address, Paste shows the browser's raw "Read permission denied" text, the
main menu has no way to open a web address, and the find box answers an address with only "No match".

Not finished when this section was written: detour-server-c, the keyboard walks (keyboard,
keyboard-b, keyboard-c, keyboard-nosr) and the success walks (success, -b, -c). They were still
waiting for a free browser slot, because all eight shared slots were held by other sessions.
For this build, see the pointer walk and the screen-reader keyboard walk above (a53beb7179/success,
a53beb7179/keyboard-c).

## Every route walked on the frozen build a53beb7179 (pass4/)

Each route was replayed in its own fresh session on a53beb7179 (`.study-builds/tier4-r1d3-a53beb7179`),
from the empty start screen, by clicks, typing and keys only. Folders are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60A/pass4/. This pass
finishes the routes the section above left waiting for a browser slot.

Result: reached on every route. The network opened from the address with 24 nodes and 59 edges,
matching the answer key, and the data stayed sources.graphml the whole way. Nothing crashed,
blocked the task or gave a wrong count. None of the routes listed as touched by the fixes (T61,
T65, T66, T67, T68 routes) belongs to this task, so none was walked here.

- success (pointer): all 8 steps matched to the end. Open network data, the "Web address" box,
  the address typed, Enter: project "sources", inspector Overview Nodes 24, Edges 59; Data > Sources
  row with the link glyph, 24 and 59, tooltip "24 nodes, 59 edges".
  pass4/success/04.png, pass4/success/09.png
- detour-open-file: all 18 steps matched. The file chooser takes no address; the Web API card's
  Server form cannot load a file address (Enter does nothing, Test and Load stay dimmed); from
  inside the project, Sources + > Network data... opens the address and loads 24 / 59 (18.png).
- detour-menu-paste: all 6 steps matched. The main menu has no door to an address; the find box
  answers "No match"; Control+V shows "Paste failed: Failed to execute 'readText' on 'Clipboard':
  Read permission denied." (07.png).
- detour-server and detour-server-c: all 15 steps matched in each. Sources + > Server..., Kind
  Web API, the address in Endpoint: Load and Test stay dimmed with no reason (detour-server/09.png).
- detour-add-data: both steps matched.
- keyboard-c (keys only, with a screen reader): all 48 steps matched to the end. In the address
  box Escape closes the dialog, Tab moves to "Choose file" (Enter there opens the file chooser,
  Escape closes it), Shift+Tab back and Enter opens the address. After the load focus falls to
  the page body (33.png); Tab goes "Main menu", "Project: sources"; F6 cycles canvas "Graph
  drawing", toolbar "Analyze", left panel "Graph sources.graphml", inspector "Resize inspector",
  canvas again (39-43.png). The keyboard walk reached the end.
- keyboard-b (keys only, with a screen reader): all 46 steps matched to the end.
- keyboard (keys only, with a screen reader): steps 1 to 31 matched; step 32 (Enter in the
  address box) printed "24 nodes, 59 edges" once where the recorded walk printed it twice; focus
  fell to the page body in both. The rest of that route is the same keys as keyboard-b, which
  matched to the end.
- keyboard-nosr (keys only, no screen reader): all 12 steps matched.

Answer key against the screen: no new mismatch. The earlier ones stand: the address box has no
Open button (the key says so too), and the key's "also success" Server route cannot load a file
address on this build.

Defects on this pass (all seen before, none new):

1. After Enter opens the address, focus falls to the page body (keyboard-c/33.png), so a keyboard
   participant must Tab from the top bar to reach the graph.
2. The load's count is announced once on one run and twice on another for the same keys on the
   same build (keyboard/33 against keyboard-b/33 and keyboard-c/33): the polite status region is
   written a second time on some runs.
3. F6 does not stop on the top bar, and enters the inspector on its "Resize inspector" separator
   rather than its first control (keyboard-c/42.png).
4. Paste on the canvas or Sources + shows the browser's raw error text (detour-menu-paste/07.png).
5. The Server form (Kind Web API) takes the address but Load and Test stay dimmed with no reason
   (detour-server/09.png).
