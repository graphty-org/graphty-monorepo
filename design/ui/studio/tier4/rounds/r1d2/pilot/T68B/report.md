# Pilot: T68 B (a GraphML file of the whole river network), targeted re-walk after the fix pass

Build: bccf8fe47f (frozen, .study-builds/tier4-r1d2-bccf8fe47f). Screenshots, step files and saved files
are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B (not in git).

Each route was replayed from the newest earlier walk of the same route on this build (the T68B
r5-* walks, and the z01 to z17 walks under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A).

## Routes walked

| Route | Session | Result |
| --- | --- | --- |
| T68B success path by pointer | r6-success | 16 of 16 steps matched; ended |
| T68A/T68B starts: the narrowed Hide card's count (T68B start) | r6-start | 3 of 3 matched; ended |
| T65A success path | r6-T65A-path | 24 of 24 matched; ended |
| T65A, the other card order | r6-T65A-order | 11 of 11 matched; ended |
| T65B success path | r7-T65B-path | 15 of 15 matched; ended |
| T65B, the other card order | r7-T65B-order | 7 of 7 matched; ended |
| T65A keyboard walk, T65B Which nodes detour, T66A/T66B Data source card and source-row chip, T68A start, T61A path, T61B path, T61A deliveries.csv first, T61A keyboard, T67A/T67B header marks | r7-* | still replaying when this report was written; not confirmed in this pass |

## Success path by pointer -- reached (r6-success)

- Start: "11 of 12 nodes, 13 of 14 edges"; one Data source card on Hide (gauges.csv ticked, flows.csv
  not), chip "11 of 12"; nothing selected (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r6-start/02.png).
- Main menu > Export..., GraphML, Scope "All 12 nodes, 14 edges", Export, Save anyway: "Exported
  gauges_graph.graphml" (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r6-success/10.png). The file holds 12 nodes (G12 included) and 14 edges
  (/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r6-success/downloads/gauges_graph.graphml). The filter card and the task's gauges data stayed as
  they were the whole way.

## Other routes

Every replayed route matched its earlier walk on this build step for step, so what those walks showed
stands: the Select card's chip on T65 counts over the whole graph ("5 of 24" with 4 selected in A, "5 of
12" with 3 selected in B), in both card orders (r6-T65A-path/25.png, r6-T65A-order/12.png,
r7-T65B-path/16.png, r7-T65B-order/08.png).

## Mismatches between the answer key and the screen

None on the T68B success path. (On the T65 routes, the answer key's card counts "4 of 14" and "3 of 5"
read "5 of 24" and "5 of 12" on screen.)

## Defects

Nothing crashed or blocked on the routes walked. The defects that would spoil grading:

1. The T65 Select card's count chip counts over the whole graph, not what it marks. T65A and T65B
   success paths and other orders. /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r6-T65A-path/25.png, /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T68B/r7-T65B-path/16.png

## Skipped

Not confirmed in this pass (their replays were still running): T65A keyboard walk, T65B detour (a
style layer's Which nodes), T66A/T66B Data source card count and source-row issue chip, T68A start, T61A
success path, T61B success path, T61A deliveries.csv first, T61A keyboard walk, T67A/T67B header marks.
Their results on this build are in the walks under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/r1d2/pilot/T65A (z03, z06 to z09, z12 to z17).
