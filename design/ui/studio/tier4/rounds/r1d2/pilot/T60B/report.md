# Pilot: T60 B (yeast gene network from a web address), targeted re-walk

Build: ff17391bb1 (frozen, .study-builds/tier4-r1d2-ff17391bb1). Start: empty. Every session ended.
Screenshots stay out of git, under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B.

Result: reached on every walk. The loaded network is the task's own file the whole way: 331 nodes,
361 edges; the Sources row shows 331 and 361; the Edges table lists 361 edges.

The routes the latest fixes touched are routes of other tasks (shortest path, filters, selection,
table header roles); none of them is on this task's path, so none was walked here. Walks that
matched the first pass to the end (detours-3, detours-5, detours-6) were not walked again. Every
other walk was replayed from the previous re-walk's route on this build.

## Success path, by pointer (success, success-2, success-3)

All three replays matched every check point to the end.

- Start screen > Open network data > the box "Web address of a graph file" > type the address >
  Enter: the graph opens as project "yeast-galactose"; Overview shows Nodes 331, Edges 361
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success/06.png).
- Data: the Sources row has the link glyph, "yeast-...", a 331 node chip and a 361 edge chip, no
  issue chip (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success/07.png).
- Table > Edges: 361 edges (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success-2/09.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success-3/07.png); the source's inspector:
  file glyph, "Source", Nodes 331, Edges 361 (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success-2/10.png).

Answer key against the screen: no mismatch.

## Detours (detours, detours-2, detours-4)

All three replays matched every check point to the end: Open a file and cancel; the Web API card
with the address in Endpoint (Test and Load stay disabled); Sources "+" > Server... (no kind takes
a file address); Sources "+" > Network data... and Enter in the box loads 331 / 361
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/detours/23.png, 24.png); the main menu has no door to an address; the address typed into Find
gives "No match"; the canvas menu has nothing about data (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/detours-2/24.png to 31.png;
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/detours-4/24.png to 27.png).

## Keyboard only (keyboard, keyboard-2, keyboard-3; --keys --sr)

keyboard and keyboard-3 matched to the end. keyboard-2 differed only at Enter in the box: the
load's status is now spoken three times ("yeast-galactose: 331 nodes, 361 edges", then "331 nodes,
361 edges" twice) where the previous build spoke it twice; the rest was walked by hand and matched
the earlier walk (Shift+Tab to "Local only", Tab from Main menu through Project, Undo, Redo, Graph,
Find, Add a layer, the Everything layer "331 nodes, 361 edges", Graph settings, Resize left panel)
(/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/keyboard-2/31.png to 34.png).

## Defects

1. After Enter in the web address box the graph loads but focus falls to the page body ("focus:
   nothing (the page itself)"); the next Tab starts again at Main menu (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/keyboard/31.png,
   /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/keyboard-2/31.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/keyboard-3/31.png). Does not block the task.
2. The load's live status is spoken three times: "yeast-galactose: 331 nodes, 361 edges", then
   "331 nodes, 361 edges" twice (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/keyboard-2/31.png).
3. Unchanged: the Sources row's accessible name repeats its counts ("... Node 331 Edge 361 331
   nodes, 361 edges") (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success/08.png).
4. Unchanged: the only button beside the web address box is "Choose file", which opens the file
   chooser and ignores the typed address; Enter is the only way to open it (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T60B/success/05.png).
