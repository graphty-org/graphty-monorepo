# T61 A pilot: targeted re-walk after the fix pass

Build: a53beb7179 (served from .study-builds/tier4-r1d3-a53beb7179). One route walked: the success
path by pointer, from the task's real start (the empty app), replayed step by step from the earlier
walk of the same route on this build. Every one of its 18 steps drew the same screen as before, and
the session was ended.

## Routes in scope

The fix pass touched the filter cards' counts, the depth card's Undo and Redo, the Data source
card's count, the narrowed Hide card, and the table role re-run with Analyze's weight. Those are
the routes of the filter, hide, remove-source and weight tasks; none of them is on this task's
route (open one spreadsheet, add the second as a source, join). So the only route this task owes
the re-walk is its own success path. The task's detours (the second file from the main menu or the
start screen, Replace, a separate graph, Cancel on the join screen) and its keyboard walk were
walked on this build earlier and were not re-walked.

## Success path by pointer

Screenshots under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T61A/z1-success/.

- 02.png: Open a file > pantries.csv opens 12 nodes.
- 03.png, 04.png: Data > Add source > File... > deliveries.csv opens the join screen, headed
  "Join deliveries.csv -> pantries.csv", Edges, from = Id, to = Id, with chips "18 edges added",
  "1 new node", "1 not in graph" and "1 repeated key" (a warning glyph and a menu). As the answer key
  says.
- 05.png to 09.png: each chip opens and closes; Escape closes the repeated-key menu.
- 11.png: Join. Overview reads Nodes 13, Edges 18, "From 2 files"; Sources lists pantries.csv (12)
  and the second file's row with 13 nodes, 18 edges and an issue chip "1". The data is the task's
  own the whole way (P01 to P12 with their sites, then P13 added by the join).
- 12.png to 17.png: the second row's tooltips read "deliveries.csv" over the name and "13 nodes,
  18 edges" over the counts; the first row's reads "12 nodes". The follow-up's answer (18 routes,
  on the second file's Sources row) reads whole on the row.
- 18.png: the issue chip opens "Issues in deliveries.csv" with "1 unknown end" and Add nodes, Leave
  out, Ignore. The repeat is not listed after Join; decided.md settles that ("What the join screen
  resolved is not an issue after Join").
- 19.png: the Edges table shows 18 edges, "With issues 1", and the warning on the Target column.

Result: reached. No crash, no block, no wrong count.

## Mismatches with the answer key

None. The second file's name on its Sources row is cut to "d.." (11.png), which the answer key
already records; the name is readable in the row's tooltip (13.png).

## Defects

None that crash, block the task or spoil its grading.
