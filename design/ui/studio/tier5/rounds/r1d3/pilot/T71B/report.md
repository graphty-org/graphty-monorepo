# T71 B pilot on build c3100058ab (targeted re-walk)

The study build is c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). Every walk starts from the
task's real start (`rounds/tier-5/setups/gauges-clean.txt`: gauges.csv joined with flows.csv,
station as the label). Screenshots stay out of git, under the main checkout's
`tmp/design-studio/tier5/r1d3/pilot/T71B/<walk>/`.

This pass walks only the pointer success path and the routes the last fixes touched that belong to
T71 B. None of the touched routes asked for this pass belongs to T71 B: each names another task
(T70, T72 or T79) and is walked in that task's own pilot. The detours and the full keyboard walk
were not asked for this pass; their last reading stands.

## Result

Reached. The answer key's values hold: top bar "6 of 11 nodes, 2 of 13 edges", one filter card,
G01, G03, G05, G08, G09 and G10 in the picture. No crash, no script error, nothing that blocks the
task or spoils its grade. The data stayed the task's own the whole way: the end record reads 11
nodes and 13 edges in all, 6 nodes and 2 edges showing, both sources' counts and recounts equal.

## Walks

### success -- the pointer success path

Replayed the earlier pass's 10 steps (Data, Add filter, telemetry, no, Or..., installed, type 2000,
Enter, Done, hover Shown); every check point matched. 9 path steps, as the answer key counts.

- Before Done: workspace "telemetry no -- Filters 6 of 11"; outline "A 4 / telemetry no / or B 3 /
  installed before 20..."; No match 5; the matches table lists G01 (B), G03, G05, G08 (A), G09 (B),
  G10 (A) (success/09.png).
- End: one card in Filters, "telemetry no", outline "A 4 / telemetry no / or B 3 / installed before
  2000"; top bar "6 of 11 nodes, 2 of 13 edges"; Values "Nodes showing 6 of 11"; the node table
  "6 of 11 nodes" lists G01, G03, G05, G08, G09, G10; six nodes drawn (success/11.png).
- No mismatch with the answer key.

Screenshots: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d3/pilot/T71B/success/01.png
to 11.png.

## Defects

None found on this walk.
