# Grade: session r2-s34 -- Alex (intermediate graph analyst), T9 Prompt B (Florentine families)

**Grade: SD** (success with difficulty). Build commit 4a7a1a7fb, graphty 0.8.53 (session.json).
Not build-decided, not void. Graded from the last screenshot (14.png), the transcript and a scripted
re-run on the same build. No files were saved (the task asks for none). The participant's
self-rating (6 of 7) was not used.

## Against the success definition

| Part                     | Required                                                     | On screen                                                                                                | Held |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---- |
| A ranking run            | a ranking (PageRank on the success path; any ranking counts) | Betweenness run, shown as row "Bridges 15" in the left panel; "Made with: Analysis Betweenness" (14.png) | yes  |
| Size bound to the result | a Size line bound to the result                              | Size line reads "1 to 3", bound to Bridges (12.png)                                                      | yes  |
| Dots visibly differ      | yes                                                          | Medici large and dark brown, peripheral families small and light orange (12.png, 14.png)                 | yes  |
| Legend shows size        | a "Size:" row in the legend                                  | "Size: Bridges 0 -- 47.5" above "Color: Bridges 0 -- 47.5" (12.png, 14.png)                              | yes  |
| Meaning of size          | bigger = more of the ranked score                            | "the bigger its dot ... the Bridges (betweenness) score, 0 to 47.5"                                      | yes  |
| Meaning of color         | the same ramp as size                                        | "both stand for the same thing -- the Bridges (betweenness) score"; color added automatically by the run | yes  |

Every value named (the legend range 0 -- 47.5, Medici 47.5, Guadagni 23.17, Albizzi 19.33, "made
with Betweenness") was on a screenshot (12.png, 14.png) before it was stated.

**Why SD, not S:** the participant needed the hover tooltip on the unlabeled chain icon to learn
that it binds size to a value (step 10), and needed the Values tab (step 14) both to name the big
dot and to confirm that "Bridges" is the betweenness run. The help used puts it at SD.

**Failure codes:** none.

**Usage card:** declined ("No thanks", step 2). No wrong belief about what is sent.

## Steps and wrong turns

|                                   | This session | Success path          |
| --------------------------------- | ------------ | --------------------- |
| Steps (real.mjs, after the start) | 13           | about 9 (11 commands) |
| Wrong turns                       | 1            | --                    |

1. Step 13 (13.png): hovered the biggest dot to learn its name; nothing appeared. Step 14 (the
   Values tab and its Top 10 list) was the correction.

Not wrong turns: picking Betweenness instead of PageRank (a valid ranking, and the better fit for
"depends on most"); step 10 (hovering the chain icon) was a check before a correct click.

## False "done"

None. "Sizing part done" (step 12) and "Done" (step 14) both match the screen: size and color are
bound to Bridges and the legend shows both.

## Silent commits, counts, tool notes

- Silent commits on the path: none. The run recolored the dots (05.png to 06.png); the size
  binding resized them and added the legend row (11.png to 12.png). Adding the Size line with its
  default "1" (step 9) changed nothing on the canvas, but it is not a binding.
- Counts or legend sentences disagreeing with the drawing: none.
- Tool prints: no `ambiguous`, script errors or failed requests.

## Problems

| #   | Severity | Kind         | What                                                                                                                                                                                                                             | Evidence                                                                                                                                                                                                                                                                                                                                                           |
| --- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | build-defect | The legend box drawn after the run covers the Pazzi node: the dot cannot be seen or clicked, so a 15-family picture shows 14.                                                                                                    | 06.png, 12.png, 14.png (top left, compare 02.png). Repro `rounds/round-2/repro/r2-s34/repro.sh`: before the run 531,83 is node "Pazzi" (repro 02.png); after the Betweenness run and size binding the same point is the legend `div` and the click selects nothing, the panel stays on Bridges (repro 09.png). Same defect as session r2-s32 on the PageRank path. |
| 2   | 2        | behavior     | Hovering a dot shows nothing, not even the family's name; the participant could name the big dot only from the result's Top 10 list. For a task about which families matter, the drawing alone cannot say which family is which. | step 13, 13.png (tool print: node "Medici", tooltip null)                                                                                                                                                                                                                                                                                                          |
| 3   | 2        | behavior     | Size lives under Shape's "+", starts as a plain number box, and the binding control is an icon-only chain whose meaning shows only on hover.                                                                                     | steps 7-11, 07.png, 08.png, 09.png, 11.png                                                                                                                                                                                                                                                                                                                         |
| 4   | 1        | wording      | The Betweenness run is named "Bridges" on the canvas, in the left panel and in the legend; the participant had to open the Values tab to be sure it was betweenness and would rename it for a deck.                              | steps 6, 14; 06.png, 14.png                                                                                                                                                                                                                                                                                                                                        |
| 5   | 1        | behavior     | The run sets color only; for a ranking the participant expected size and had to find it.                                                                                                                                         | step 6, 06.png                                                                                                                                                                                                                                                                                                                                                     |
| 6   | 1        | opinion      | PageRank carries a "Start here" badge in the Analyze list; for "who does the network depend on" the participant judged it would steer a newcomer away from the broker measure.                                                   | step 3, 03.png                                                                                                                                                                                                                                                                                                                                                     |

Problem 1 is confirmed by its repro (a build defect, one participant) and was also seen in session
r2-s32. Problems 2 and 3 were also met in sessions r2-s33 (hover shows no name) and r2-s32 and
r2-s33 (size behind Shape's "+" and the chain icon), so they are confirmed by two or more
participants. Problems 4 and 5 match the run-naming and color-only findings of r2-s32; problem 6
rests on this session alone.
