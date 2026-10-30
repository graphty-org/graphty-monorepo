# T63B pilot (targeted re-walk) -- gauges + flows, "where and when"

Build ff17391bb1 (frozen, /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d2-ff17391bb1).
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T63B/ (not in git).

None of the routes the fix pass touched (T64, T65, T68 routes) belong to this task, so only the
success path by pointer was owed as new work.

## Success path (pointer) -- reached

Replayed from the previous build's walk of the same route: all 11 steps matched and the session
ended. The task starts on the gauges data (12 nodes, 14 edges, G01-G11 with their own values,
success/01.png). The inspector's "Set in Data" sets Time = installed at once; Fields shows
Time = installed, Latitude = lat, Longitude = lon, and the table's `installed` header carries the
"Time" chip (success/05.png). In the Time list, Escape keeps `installed`, Enter reopens it, ArrowDown
then Escape keeps it, Enter then Tab commits and moves on (07-11.png). It ends with the same data
and the same settings (success/12.png). Nothing differs from the answer key.

## Defect still present (does not block the task or spoil grading)

- The table marks the place only after the reader re-picks it: `lat` and `lon` show no Latitude /
  Longitude chip while `installed` shows "Time", though Fields says they are the place
  (success/05.png, success/12.png).

## Not walked

The machine's browser slots were all held by other work for the whole of this pass, so the other
replays (success-direct, success-2, success-3, detours, detours-2, detours-3, keyboard, keyboard-2,
keyboard-3) never started. The earlier pass's findings for them, on the previous build, are in
rounds/r1d1/pilot/T63B/report.md; keyboard-f6 matched in full on this build.
