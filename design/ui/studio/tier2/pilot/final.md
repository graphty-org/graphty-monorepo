# Pilot on the study build: every tier 2 task

Build e2ccec0e9304 (graphty@0.8.56), served from the frozen copy named in `../criteria.md`,
2026-10-08. Every task's success path from `../answers.md`, both datasets, walked with
`tool/real.mjs` by `rewalk.sh all` (`REAL_DIST=<the copy> FINAL=1`). Screenshots are in
`<task>-final/A/` and `<task>-final/B/`, the printed steps in `<task>-final/A.steps.log` and
`B.steps.log`. No step printed a script error, a console error, a failed request, a miss or "the
drawing is still moving". Every screenshot was looked at.

| Task | A                                                                                                                         | B                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| T4   | Reached: 12 nodes, 22 edges; line 24 `p11, p13, 6`; the source's inspector lists the row after Load (`A/11.png`)          | Reached: 10, 17; line 17 `s04, s11, 3`; listed on the source (`B/11.png`)                                                |
| T17  | Reached: chip "19 of 20 nodes", "Edges showing 12 of 41"; unticked, all 20 back (`A/09.png`)                              | Reached: "26 of 77 nodes", "51 of 254"; all 77 back (`B/09.png`)                                                         |
| T18  | Reached: Chloe, Ava, Ivan, Kofi, Milo; opens on Values; Weight box None with the reason (`A/02.png`, `A/07.png`)          | Reached: Strozzi, Ridolfi, Medici, Salviati, Pazzi; Enter moves From to To (`B/04.png`, `B/07.png`)                      |
| T19  | Reached: both notes listed after reopening from Recent projects (`A/14.png`)                                              | Reached: both notes after reopening "Florentine families" (`B/14.png`)                                                   |
| T20  | Reached: Higher means starts on Not set (`A/06.png`); Depot, Market, Park, Clinic, Harbor, Total distance 14 (`A/14.png`) | Reached: Trailhead, Creek, Meadow, Ridge, Summit, 7.5 (`B/14.png`)                                                       |
| T21  | Reached: Farah first before; after Replace and Rerun, Ava 0.08012 first (`A/07.png`)                                      | Reached: "now 14, 21"; Hal before, Di 0.1339 after Rerun (`B/07.png`)                                                    |
| T22  | Reached: the bare number refused while typing (`A/03.png`); "3 edges selected" (`A/06.png`)                               | Reached: "=" lists the columns (`B/03.png`); "13 edges selected" (`B/05.png`)                                            |
| T23  | Reached: "14 nodes within 2 hops of Ava", chip "15 of 20 nodes" (`A/05.png`)                                              | Reached: "11 nodes within 2 hops of Medici", "12 of 15 nodes" (`B/05.png`)                                               |
| T24  | Reached: "Gus -> Ivan", weight 1; "2 nodes selected" (`A/04.png`)                                                         | Reached: "Station -> Stadium", From, To, minutes 4 and no raw from/to rows (`B/02.png`); "2 nodes selected" (`B/04.png`) |

Still on screen, recorded in the answer key as watch items rather than defects: the replacement in
T21 lays the drawing out again; Find frames part of the graph off the canvas (T19, T23); the
Hops 1 and Hops 2 lists differ in shape (T23); thin gold bands on the dense Les Miserables drawing
(T22 B); the legend's layer names say "Shortest route" (T18, T20); a cut Sources quiet line (T4).
