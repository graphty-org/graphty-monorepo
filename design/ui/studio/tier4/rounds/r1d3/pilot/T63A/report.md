# T63A pilot, targeted re-pilot (build a53beb7179)

Task: pantries + deliveries joined; set the program up so it knows where each site is and when
each one opened, and say what in the list it goes by.

## Routes walked

### Success path by pointer -- reached

Replayed from the earlier pass's success walk; every one of its 8 steps matched the screen and the
session ended. Screenshots under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T63A/success (01.png to 09.png).

- 01.png: the joined graph, 13 nodes and 18 edges; the inspector's Overview shows "Time: opened"
  with "Set in Data".
- 03.png: "Set in Data" sets the time in place: the "Time" chip appears on the table's opened
  header, the Time row leaves the Overview and the toolbar gains the clock button. The canvas
  keeps its size and the drawing does not move.
- 05.png: Fields > pantries.csv expanded shows Time = opened, Latitude = lat, Longitude = lon
  (the place was set at load); the Time list is open with opened checked.
- 06.png to 09.png: Escape, Enter, Tab and Escape on the Time field; the field ends on opened and
  the list closes.
- Data stays the task's own data throughout: 13 nodes, 18 edges, the same rows P01 to P10 with
  their lat, lon and opened values.

Mismatches with the answer key: none. The path matches answers.md T63 (the inspector's
"Set in Data" sets Time = opened in place; lat and lon are designated at load).

## Routes not walked

The fix pass touched routes of T64, T65, T66 and T68 only; none belongs to T63A, so this targeted
re-pilot walks only the success path. The detour and keyboard walks are not repeated this pass.

## Crashes, blocks, wrong results

None.
