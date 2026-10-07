# Grade: session r2-s32 -- Elena, T9 (Florentine families)

**Grade: SD** (success with difficulty). Build commit 4a7a1a7fb. Not build-decided, not void.

## Against the success definition

| Part | Required | On screen at the end (18.png) | Held |
|---|---|---|---|
| A ranking run | PageRank run | "Influence 15" row in the left panel; Medici "Influence 0.1458, #1 of 15" | yes |
| Size bound to the result | a Size line bound to the result | Size line reads "1 to 3" bound to Influence (15.png) | yes |
| Dots visibly differ | yes | Medici large, edge families small | yes |
| Legend shows size | "Size: Influence" | "Size: Influence 0.03066 -- 0.1458" above "Color: Influence" | yes |
| Meaning of size | bigger = more Influence / higher PageRank | "Bigger and darker = more influential", the score from PageRank | yes |
| Meaning of color | same PageRank ramp | "Both the size and the color show the same thing, Influence" | yes |

No saved files (none required). The participant's self-rating (5 of 7) was not used.

## Path, steps and wrong turns

- Steps: 18 against a success path of about 9 (11 commands). She bound size through the chain
  icon beside Size (its tooltip is "Size by attribute"), the same control as the success path.
- Wrong turns: 3 -- clicked the Pazzi dot believing it the important one (step 3, 03.png); opened
  the node's Style tab (step 4, 04.png); opened the graph's Style tab, which holds only layout
  settings (step 6, 06.png). Step 5 was the correction. More than two wrong turns plus a detour
  makes it SD, not S.
- Steps 16-18 (select Medici, hover "Influence", hover the legend title) were checking, not
  wrong turns.

## False "done"

None. "PART 1 DONE" (step 15) and "Done" (step 18) both match the screen: sizes and colors are
bound to Influence and the legend shows both.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | The legend box drawn after the run covers the Pazzi node; the dot cannot be seen or clicked, so the picture of 15 families shows 14. | 09.png, 15.png, 18.png. Repro `rounds/round-2/repro/r2-s32/repro.sh`: before the run 531,83 is node "Pazzi"; after it the same point is the legend and a click selects nothing (repro 06.png) |
| 2 | 2 | behavior | In 3D, perspective makes an unimportant dot look bigger before any binding; she took Pazzi (degree 1) for the important family. On a task about what dot size means, perspective size competes with the bound size. | step 3, 02.png, 03.png |
| 3 | 2 | behavior | The graph's Style tab shows only canvas and layout settings; "size sounds like style" led to a dead end. | step 6, 06.png |
| 4 | 2 | behavior | Size lives under Shape's "+", and the binding is an icon-only chain whose meaning shows only on hover. | steps 10-13, 10.png, 11.png, 12.png, 13.png |
| 5 | 1 | behavior | The run sets color only; she expected size from a "which matter most" request and had to find size herself. | step 9, 09.png |
| 6 | 1 | wording | The run is named "Influence", not "PageRank"; she had to infer they are the same. | step 9-10, 09.png, 10.png |
| 7 | 1 | wording | No explanation of "Influence" or its values on hover in the node panel or the legend title. | steps 17-18, 17.png, 18.png |
| 8 | 1 | opinion | The Analyze list is a wall of unfamiliar method names; she chose PageRank only from its "Start here" tag and was unsure it matches "depends on most". | step 7, 07.png |

Problem 1 is confirmed by its repro (build defect, one participant). The others rest on this
session alone and need a second participant to be confirmed.
