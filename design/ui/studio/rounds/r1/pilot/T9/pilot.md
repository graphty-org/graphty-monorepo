# Pilot: T9, bigger dots for the ones that matter

Build under study: graphty@0.8.53, commit e82708488eea. Both datasets were walked on the success
path in the answer key with `real.mjs`, from an empty start. Les Miserables is in this folder
(01.png to 15.png); Florentine families is in `B/` (01.png to 05.png, several steps per shot).

**End state reached on both datasets.** No blockers. On this build the run is named "Influence"
(the round 1 name), so the path's "PageRank" run row and option are "Influence", as the answer key
allows. No script errors, console errors or failed requests were reported at any step.

## Les Miserables

| Shot   | Step                                   | What the screen shows                                                                                                                                                                             |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01.png | empty start                            | Start screen with the usage card; Les Miserables under Samples.                                                                                                                                   |
| 02.png | "No thanks"                            | Card replaced by "Usage data stays off. Change this in Settings > Privacy".                                                                                                                       |
| 03.png | "Les Miserables"                       | 77 blue dots, all one size; outline has Selection and Everything; inspector shows the graph overview (77 nodes, 254 edges).                                                                       |
| 04.png | Shift+A                                | Analyze list opens under "Rank nodes and edges"; PageRank carries a "Start here" badge.                                                                                                           |
| 05.png | type "PageRank"                        | List filtered to PageRank alone.                                                                                                                                                                  |
| 06.png | "PageRank"                             | PageRank card: description, Damping factor 0.85, "Under a second", Run.                                                                                                                           |
| 07.png | "Run"                                  | Dots turn orange (darker = higher); legend "Color: Influence 0.003299 to 0.07543"; outline gains an "Influence 77" row. Sizes unchanged.                                                          |
| 08.png | "Influence" (the run row)              | Inspector on Values: histogram, Top 10 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 ..., matching the answer key.                                                                            |
| 09.png | tab "Style"                            | Nodes: Fill / Color "Influence", then Shape, Effects, Label, Tooltip, each with "+".                                                                                                              |
| 10.png | "Add to Shape"                         | Menu: Size, Shape.                                                                                                                                                                                |
| 11.png | "Size"                                 | A Size line with a number field "1" (focused) and a link icon.                                                                                                                                    |
| 12.png | hover the link icon                    | Tooltip "Size by attribute".                                                                                                                                                                      |
| 13.png | "Size by attribute"                    | Attribute picker: Influence, Influence rank, Influence percentile; id and name greyed under "Cannot be used: Holds groups, not amounts".                                                          |
| 14.png | option "Influence"                     | Dots now sized: Valjean's dot in the center is by far the largest, others visibly larger or smaller. Size reads "1 to 3"; legend adds "Size: Influence 0.003299 to 0.07543" above the color ramp. |
| 15.png | `--expect` "Size: Influence", "1 to 3" | Both found; the drawing is unchanged.                                                                                                                                                             |

## Florentine families

| Shot     | Step                                                                                      | What the screen shows                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| B/01.png | empty start                                                                               | Same start screen.                                                                                                            |
| B/02.png | "No thanks", "Florentine families"                                                        | 15 blue dots. They are not all drawn the same size: the top-left and far-right dots look larger (nearer the camera).          |
| B/03.png | Shift+A, type "PageRank", "PageRank", "Run"                                               | Orange ramp; legend "Color: Influence 0.03066 to 0.1458", the answer key's range. The legend box now covers the top-left dot. |
| B/04.png | "Influence", tab "Style", "Add to Shape", "Size", "Size by attribute", option "Influence" | Medici's dot (center) is the largest and darkest; Size "1 to 3"; legend "Size: Influence" and "Color: Influence".             |
| B/05.png | `--expect` "Size: Influence", "1 to 3"                                                    | Both found.                                                                                                                   |

## What the screen says the sizes and colors mean

The legend in the top-left corner reads "Size: Influence" and "Color: Influence", each with the
same range, so a participant can answer "bigger and darker both mean more Influence" from the
screen alone. The Size line itself shows only "1 to 3", not what it is bound to; the legend is the
only place that names it.

## Observations (not blockers)

- The legend box sits over the drawing and hides any dot under it. On Florentine families the
  top-left family is covered from the run onward (B/03.png, B/04.png). A participant asked what the
  sizes stand for still sees every other dot, so the task is met, but a covered node is an app
  layout defect worth reporting.
- Before any sizing the dots already differ in apparent size, because the drawing is 3D and nearer
  dots are drawn larger (B/02.png). A participant could take that for "already sized", and a grader
  checking "dots visibly differ" should compare against the start shot, not just look for
  variation.
- The orange color ramp lands on its own after Run (07.png). Its light-to-dark difference is subtle
  on Les Miserables, so the "only the automatic color changed" false-done path in the answer key is
  likely to be seen.
- "Add to Shape" opens a menu (Size, Shape) and then a plain number field; the way to bind it to a
  result is an unlabeled link icon whose only name is its tooltip. A participant who does not hover
  it may stop at the number field ("stopped-at-toggle" in the answer key).
- With 3x size the largest spheres show visible flat facets (B/04.png). Cosmetic.
- Not part of this task: the graph overview line "Undirected, from the file: directed 0" runs past
  the inspector's right edge, and "Edges per ..." is cut off (03.png).
