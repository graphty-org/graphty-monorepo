# T63B pilot (targeted re-walk) -- gauges + flows, "where and when"

Build a53beb7179 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-a53beb7179).
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d3/pilot/T63B/ (not in git).

None of the routes the fix pass touched (T64, T65, T66, T68 routes) belong to this task, so the
success path by pointer was the new work owed.

## Why the earlier walks diverged

On this build the `installed` column keeps its text kind after it is designated the time, so its
cells stay ISO text ("1998-05-12") under a "Time" chip, where the earlier build drew them as dates
("May 12, 1998"). That is the decided behavior: a text-kind column reads as text whatever its role,
with the role's chip on its header (decided.md). It is not a defect. The walks were therefore
replayed with a screen tolerance wide enough to pass over the eleven re-worded table rows
(REAL_REPLAY_TOLERANCE=25); every other check point (names, printed lines, the rest of the screen)
was still compared.

## Success path (pointer) -- reached

All 14 steps matched and the session ended. The task starts on the gauges data (12 nodes, 14 edges,
G01-G12 with their own values, success/01.png). The inspector's "Set in Data" sets Time = installed
at once; Fields shows Time = installed, Latitude = lat, Longitude = lon, and the table's `installed`
header carries the "Time" chip (success/05.png). A header click sorts "installed, A to Z", in date
order because the values are ISO days (success/12.png, 15.png). In the Time list, Escape keeps
`installed`, Enter reopens it, ArrowDown then Escape keeps it. The data stays the task's own the
whole way (success/15.png). Nothing differs from the answer key.

## Defects still present (none blocks the task or spoils grading)

- The table marks the place only after the reader re-picks it: `lat` and `lon` show no Latitude /
  Longitude chip while `installed` shows "Time", though Fields says they are the place
  (success/05.png, success/15.png).
- Fields' Time list: Enter then Tab, and a second Tab, leave the list open (success/12.png,
  success/13.png); only Escape closes it. The decided behavior is that Tab closes the list and
  takes nothing.

## Not walked

success-direct (pointer, 7 steps: "Set in Data" first, then the Latitude list re-picked) was
replayed in full and matched every check point (exit 0), so its earlier findings stand.

The re-walks of success-2, success-3, detours, detours-2, detours-3, keyboard,
keyboard-2 and keyboard-3 were started but were
still waiting for a free browser slot when this pass had to report, so they were not finished.
Their earlier findings, on the previous build, are in rounds/r1d1/pilot/T63B/report.md.
keyboard-f6 matched in full on this build in the earlier replay.
