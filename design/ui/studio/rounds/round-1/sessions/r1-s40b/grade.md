# Grade: session r1-s40b -- Dev, circles of characters in Les Miserables

**Grade: S** (success). Dev ran a grouping method (Louvain, shown on screen as "Communities"),
read the number of groups and the largest group's size from the screen, and named three members
of the largest group only after the screen listed them. No wrong turns, no help needed beyond
the app's own hint and filter.

## What the task asks, and what the screen shows

1. **A grouping run.** `07.png`: the Louvain card; `08.png`: after Run, the dots are recolored
   in six colors, the key reads "Color: Communities" with Group 1 to Group 6, and the left panel
   gains "Communities 6".
2. **Number of groups and the largest group's size.** `08.png`: Communities 6; Group 1 20,
   Group 2 17, Group 3 11, Group 4 11, Group 5 10, Group 6 8. Dev's answer: 6 groups, the
   largest is Group 1 with 20. Both match the screen, and the sizes add up to 77, the node
   count in Overview.
3. **Three members of the largest group, each on screen before stated.** `09.png`: the Group 1
   panel reads Size 20, Made by Communities, and Members (first 10): MlleBaptistine,
   MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent,
   Bamatabois. Dev named Valjean, Fauchelevent and MlleBaptistine -- all three are in that list.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`): decline the usage card,
  open the sample, one hover to check the flask icon, open Analyze, type "modularity", pick
  Louvain, Run, pick Group 1. The success path is 7; the usage card and the hover are outside
  it, so Dev was on the path the whole time (about 1.1x).
- **Wrong turns:** 0. The hover (`04.png`) was a check of the icon's name, not a step away. Dev
  went straight from the run to "Group 1" in the left panel without first selecting the
  Communities row, which the path allows.
- **False "done":** none. "Six circles, the biggest is Group 1 with 20" (`08.png`) and the three
  names (`09.png`) are each true on the screen at the moment they were said. truth_on_screen:
  not applicable.
- **Activation:** yes. Dev found the grouping method by typing the tutorial word "modularity"
  into the Analyze filter, which returned Louvain marked "Start here" (`06.png`).
- **Usage card:** declined with "No thanks" at step 2, no detour.
- **Setup:** the start waited about 20 minutes for a free browser slot. This is the study's
  queue, not the app, and not a tool fault (no action the person could not do, no action that
  failed).
- **Build-decided:** no. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Picking a group in the left panel lists its members on the right but changes nothing on the canvas: the 20 Group 1 dots are not set apart from the rest, and no names are drawn on them. Dev could not tell which dots were the 20 except by matching the orange swatch. For an essay about "circles" the picture is the point. | step 9, `08.png` vs `09.png` (canvas identical) |
| 2 | 1 | behavior | Members shows only the "First 10" of 20, with no visible way to see the other 10 from that panel. | step 9, `09.png` |
| 3 | 1 | wording | The word a student is taught ("Modularity", "Statistics") is not on screen. The filter maps "modularity" to Louvain, which saved the step, but a reader scrolling the list would not know Louvain is the one. | step 5 `05.png`, step 6 `06.png` |
| 4 | 1 | wording | "Resolution: 1" on the Louvain card has no explanation of what raising or lowering it does. Dev left the default and "hoped". | step 7, `07.png` |
| 5 | 1 | behavior | The color key box sits over the top-left of the drawing; several dots near the top of the graph are partly hidden behind or crowded against it. | `08.png`, `09.png` (top left of the canvas) |
| 6 | 1 | wording | Overview truncates a row label to "Edges per ..." and shows an unclear line "Undirected, from the file: directed 0". Not on the task's path, but on screen through the whole session. | `03.png`, `06.png`, `08.png` (right panel) |

No problem here is a build defect under the criteria (no crash, dead control, wrong count or
keyboard block): picking a group does do something (it opens the group's panel), so there is no
repro directory for this session. Problem 1 counts toward confirmation as behavior if another
participant meets it.
