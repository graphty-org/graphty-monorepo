# T77 B pilot (gauges): targeted re-walk on build 1e123d7d33

Walked on the frozen build 1e123d7d33 (served from `.study-builds/tier5-r1d1-1e123d7d33`), from the
task's real start (setup `gauges-telemetry.txt`). This was a re-walk after a fix pass: the fixes
touched the Fill + control, Done and Escape in the style-layer workspace, and focus after Done, on
routes of tasks T70, T72, T73, T74 and T79. None of those routes is part of T77 B, whose path
edits an existing filter card and an existing layer's date bound and never adds a Fill. So the only
walk was the success path by pointer.

## Success path (pointer)

Replayed from the newest earlier walk of the same route (build 0c163f54bf); all 17 steps matched
their recorded screens, and the session ended.

Steps: Data; the card row "telemetry yes"; Edit; Or...; `depth_cm`, type 140; Enter; Done; Graph;
the Oldest layer's row "installed before 2000"; the date box, Ctrl+A, type 2005; Enter; Done; then
the row again, the date box, 2010, Tab (Escape, Escape) to check that Escape undoes the edit; the
date box, 2005, Escape; Escape.

What the screen showed:

- After Done on the filter: the card reads "telemetry yes / A 7 / or B 3 / depth_cm min 140" and the
  top bar "9 of 11 nodes, 8 of 13 edges"; the table lists G01, G02, G03, G04, G05, G06, G07, G09,
  G11 -- the answer key's 9 of 11 (the 7 plus G03 and G05).
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/08.png
- After Done on the layer: "Which nodes 5 of 9", "installed before 2005", the Oldest row reads 5, and
  the key reads "Color: Oldest, 5 of 9 nodes" -- the answer key's 5.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/13.png
- At the end: still 9 of 11 and 5 of 9, "installed before 2005"; the data is the task's own gauges
  data throughout.
  /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T77B/success/18.png

Result: reached. No mismatch with the answer key, and nothing that crashes, blocks the task or
spoils its grading.
