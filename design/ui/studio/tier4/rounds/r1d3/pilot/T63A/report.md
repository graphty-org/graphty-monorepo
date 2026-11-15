# T63A pilot, targeted re-pilot (build 79ed770292)

Task: pantries + deliveries joined (setup pantries-joined.txt); set the program up so it knows
where each site is and when each one opened, and say what in the list it goes by.

## Routes walked

### Success path by pointer -- reached

Replayed from the previous pass's success walk on the frozen build 79ed770292; all 8 steps
matched the screen and the session ended. Screenshots under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T63A/success-4
(01.png to 09.png).

- 01.png: the joined graph, 13 nodes and 18 edges; the inspector's Overview shows "Time: opened"
  with "Set in Data". The table lists P01 to P10 with their lat, lon and opened values.
- 03.png: "Set in Data" sets the time in place: the table's opened header gains the "Time" chip,
  the Time row leaves the Overview and the canvas toolbar gains the clock button. The drawing does
  not move.
- 05.png: Fields > pantries.csv expanded shows Time = opened, Latitude = lat, Longitude = lon (the
  place was set at load); the Time list is open with opened checked.
- 06.png to 09.png: Escape, Enter, Tab and Escape on the Time field; the field ends on opened, the
  list closes and the graph still reads 13 nodes.
- Data stays the task's own data throughout: 13 nodes, 18 edges, the same rows and values.

Mismatches with the answer key: none. The path matches answers.md T63 (the inspector's "Set in
Data" sets Time = opened in place; lat and lon are designated at load).

## Routes not walked

The fix pass touched routes of T64, T65, T66 and T68 only (the Select and Hide cards' counts, the
undo and redo of a card's edit, the Data source card's count, the table role re-run and Analyze's
weight); none of them belongs to T63A, so this targeted re-pilot walks only the success path. The
detour and keyboard walks are not repeated this pass.

## Crashes, blocks, wrong results

None.
