# Pilot T60A: from a web address (sources.graphml), targeted re-pilot

Build: a53beb7179 (frozen, `.study-builds/tier4-r1d3-a53beb7179`). Start: empty. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T60A/pass3/ (not in git).

Result: reached on every route. The network opened from the address with 24 nodes and 59 edges,
matching the answer key, and the data stayed sources.graphml the whole way. Nothing crashed,
blocked the task or gave a wrong count.

None of the routes listed as touched by the fixes belongs to this task (they are T64, T65, T66 and
T68 routes), so none was walked here.

## Routes walked

Every walk of the first round's T60A pilot was replayed on this build, each in its own session:

- Success path by pointer: success, success-b, success-c. All 8 steps matched. Start screen > Open
  network data > "Web address of a graph file" > type the address > Enter; Data shows the Sources
  row with the link glyph, "24" and "59" (tooltip "24 nodes, 59 edges"), and the inspector's
  Overview reads Nodes 24, Edges 59.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T60A/pass3/success/09.png
- Detours (the same set every pass walks): detour-open-file (-b, -c), detour-menu-paste (-b, -c),
  detour-server (-c), detour-add-data. All matched every step to the end, so their earlier
  findings stand unchanged.
- Keyboard: keyboard-b, keyboard-c, keyboard-nosr matched every step. keyboard diverged at step 32
  and was carried on by hand (below).

## Keyboard walk, carried on by hand (pass3/keyboard/)

Steps 1 to 31 matched (Tab through the start screen, Enter on "Open network data", Tab to the
address box, type, Escape closes the dialog, reopen, type, Tab to "Choose file", Enter opens the
file chooser, Escape, Shift+Tab back to the box).

- 33 Enter in the address box opens the graph (24 nodes, 59 edges). Focus falls to the page body
  ("focus: nothing (the page itself)"); the recorded walk of the same keys put it on the heading
  "Graph, sources: 24 nodes, 59 edges". Announced: "sources: 24 nodes, 59 edges", then
  "24 nodes, 59 edges" twice (the second unconfirmed).
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T60A/pass3/keyboard/33.png
- 34-36 Tab from the body: "Main menu", "Project: sources"; Shift+Tab back to "Main menu".
- 37-41 F6: left panel "Graph sources.graphml", inspector "From sources.graphml", canvas
  "Graph drawing", toolbar "Analyze", left panel again. The top bar is never in the cycle.
- 42 F6 to the inspector, then Tab: "Graph actions", tab "Values", "About Direction".

The keyboard walk reached the end.

## Answer key against the screen

No new mismatch. Standing ones (their routes matched unchanged): the answer key says the box has
no Open button, while decided R8 asks for one -- the screen has none, Enter is the only way to open
the address; and Sources + > Server... has no kind that loads a file from an address.

## Defects

1. Focus after Enter in the address box still lands in different places for the same keys on the
   same build: the page body on this walk and on keyboard-b's earlier replay, the inspector heading
   on the recorded keyboard and keyboard-c walks. The mechanism is not visible from a walk: the
   move of focus to the heading does not reliably run after the load. The "24 nodes, 59 edges"
   announcement also comes once or twice between runs (keyboard here twice, keyboard-b earlier
   once). pass3/keyboard/33.png
2. F6 does not stop on the top bar and goes left panel, inspector, canvas, toolbar; decided is top
   bar, left panel, canvas, toolbar, inspector. pass3/keyboard/37.png to 41.png

The earlier passes' other defects stand unchanged, since their routes replayed with no difference:
no Open button beside the address box and Tab-then-Enter opening the file chooser, "Choose file"
with no tooltip, the Server form (Web API kind) unable to take a file address with Load and Test
dimmed and no reason, the Server form's dialog name being all of its text, no web-address door on
the main menu or the empty canvas card, Paste showing the browser's raw "Read permission denied"
text, the source row's repeated counts in its name and its hand pointer, the cut-short source name,
12 Tab stops before "Open a file", focus starting on "Close" in the dialog, and the find box
answering an address with only "No match".

## Not walked

- The routes listed as touched by the fixes (T64A/T64B, T65A, T65B, T66A/T66B, T68A/T68B): they
  belong to other tasks, not T60A.
