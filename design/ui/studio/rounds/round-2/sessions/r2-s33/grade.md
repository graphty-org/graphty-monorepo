# Grade: session r2-s33 -- Nadia (level-1 alert reviewer), T9 Prompt B (Florentine families)

**Grade: SD** (success with difficulty). Build commit 4a7a1a7fb, graphty 0.8.53 (session.json).
Not build-decided, not void. Graded from the last screenshot (15.png), the transcript and a scripted
re-run of her path on the same build. No files were saved (the task asks for none). Her
self-rating (5 of 7) was not used.

## Against the success definition

| Part                     | Required                                  | On screen at the end (15.png)                                               | Held |
| ------------------------ | ----------------------------------------- | --------------------------------------------------------------------------- | ---- |
| A ranking run            | PageRank (or another ranking)             | "Influence 15" row in the left panel; Medici "Influence 0.1458, #1 of 15"   | yes  |
| Size bound to the result | a Size line bound to the result           | Size line reads "1 to 3", bound to Influence (13.png, 14.png)               | yes  |
| Dots visibly differ      | yes                                       | Medici large and dark, edge families small                                  | yes  |
| Legend shows size        | "Size: Influence"                         | "Size: Influence 0.03066 -- 0.1458" above "Color: Influence"                | yes  |
| Meaning of size          | bigger = more Influence / higher PageRank | "The bigger the dot, the more influence the program gives that family"      | yes  |
| Meaning of color         | the same PageRank ramp                    | "the darker the color (light orange to dark brown), the more influence too" | yes  |

Every value she named (the legend range, Medici 0.1458, #1 of 15, "1 to 3") was on a screenshot
before she stated it.

**Why SD, not S:** she reached the binding control only through tooltips (the main-menu hover at
step 4, the chain icon's "Size by attribute" tooltip at step 11), and she chose PageRank from its
"Start here" tag, not from knowing it answers "depends on most". Two wrong turns, within the S
limit, but the help she needed puts it at SD.

**Failure codes:** none.

## Steps and wrong turns

|                                   | This session | Success path          |
| --------------------------------- | ------------ | --------------------- |
| Steps (real.mjs, after the start) | 14           | about 9 (11 commands) |
| Wrong turns                       | 2            | --                    |

1. Step 4 (04.png): hovered toolbar icon 1 looking for Analyze; it is the main menu.
2. Step 14 (14.png): hovered the biggest dot to learn its name; nothing appeared. Step 15 (click)
   was the correction.

Not wrong turns: step 9 "Add to Shape" is the success path's own control; step 11 (hovering the
chain icon) is the tooltip help counted above.

## False "done"

None. "Sizing part done" (step 13) and "Did I finish? Yes" (debrief) match the screen: sizes and
colors are bound to Influence and the legend shows both. Her step 7 note "Part 1 done; part 2
(sizes) not yet" correctly recognized that the automatic color was not the sizing.

## Problems

Severity 0-4 (Nielsen). The build defect was reproduced by
`rounds/round-2/repro/r2-s33/repro.sh` (her path, output `run.log` and `01.png`-`10.png`); it
behaved the same as the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                             | Evidence                                                                                                                                                   |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | The legend box drawn after the run covers a family at the top left: before the run the point 531,83 is node "Pazzi", after sizing it is the legend. The picture of 15 families shows 14 whole dots plus a sliver. Nadia did not notice; a reviewer counting families would miscount. Same defect as session r2-s32. | 15.png (a dot edge peeks out at the legend's right side). Repro `run.log`: step 03 "at 531,83: node with id Pazzi", step 09 "at 531,83: div"; repro 09.png |
| 2   | 2   | behavior     | Size is not offered by name: the Style tab lists Fill, Shape, Effects, Label, Tooltip, and Size is only inside Shape's "+"; the binding is an icon-only chain whose meaning ("Size by attribute") shows only on hover. Seen also in r2-s32, so confirmed.                                                           | steps 8-12, 08.png-12.png                                                                                                                                  |
| 3   | 2   | behavior     | Hovering a dot shows nothing and no dot carries a name; she learned the biggest dot is Medici only by clicking it. For her job ("which family is the big one") the name is the point.                                                                                                                               | step 14, 14.png (identical to 13.png); repro `run.log` step 10 "node with id Medici, tooltip: null"                                                        |
| 4   | 2   | wording      | No method in Analyze speaks to "depends on most"; she picked PageRank only for its "Start here" tag and said Betweenness might be the better answer, and she wants someone to tell her which one is accepted. Seen also in r2-s32.                                                                                  | steps 5-6, 05.png, 06.png; debrief                                                                                                                         |
| 5   | 1   | wording      | She clicked "PageRank", but the run, the legend and the node panel all say "Influence"; she had to assume they are the same. Seen also in r2-s32.                                                                                                                                                                   | steps 7-8, 07.png, 08.png                                                                                                                                  |
| 6   | 1   | behavior     | The run sets color only; size, which the task and her own reading of "matters most" ask for, has to be found and bound by hand. Seen also in r2-s32.                                                                                                                                                                | step 7, 07.png                                                                                                                                             |
| 7   | 1   | wording      | "Size by attribute": "attribute" is not her word; and "Influence rank" gives no hint whether rank 1 draws big or small, so she avoided it.                                                                                                                                                                          | steps 11-12, 11.png, 12.png                                                                                                                                |
| 8   | 0   | opinion      | Color and size now repeat the same measure; she did not choose the color, it "just happened".                                                                                                                                                                                                                       | 13.png; debrief                                                                                                                                            |

What worked, for the record: the hint "Analyze (flask) in the toolbar (Shift+A)" pointed her to
Analyze; the attribute list greys out id and name with "Holds groups, not amounts"; the legend
gains a "Size: Influence" row with its range; the node panel gives "0.1458, #1 of 15".
