# Grade: session r2-s28 -- Dev (class-project student), bigger dots for the ones that matter, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (12.png),
the transcript and the screenshots before it. The task asks for no file, and none was downloaded.

## Grade: SD (success with difficulty)

- **Success definition met.** 12.png shows a ranking run ("Bridges", the on-screen name of
  Betweenness, 77 nodes) with a Size line on its row bound to it ("1 to 3"), dots that visibly
  differ (one large dark dot in the middle, a medium one at the bottom left, the rest small), and
  a legend reading "Size: Bridges 0 -- 1624" above "Color: Bridges 0 -- 1624". Betweenness is one
  of the ranking measures the answer key accepts, and "Bridges" counts as naming the measure.
- **Meaning stated from the screen.** Dev said the bigger the dot, the higher its Bridges
  (betweenness) score, and that the colors show the same score (light orange 0 to dark brown
  1624), read from the legend. Both match the answer key's meaning for this task.
- **Why SD, not S:** Dev found "Size by attribute" only by hovering its icon-only button and
  reading the tooltip (step 9, 09.png). The grading rules place a tooltip under SD.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no. No tool errors, `ambiguous` prints or failed requests.
- **Usage card:** declined ("No thanks", step 2).

## Counts

|                                       | This session                        | Reference                  |
| ------------------------------------- | ----------------------------------- | -------------------------- |
| Steps (real.mjs, after the start)     | 11 (12 with the closing node hover) | about 9 steps, 11 commands |
| Commands                              | 12                                  | 11                         |
| Wrong turns                           | 0                                   | --                         |
| Ease (self-rating, not used to grade) | 6 of 7                              | --                         |

Dev picked Betweenness instead of the PageRank the success path uses. That is a different
accepted measure, not a wrong turn: every later step follows the success path with "Bridges" in
place of "Influence". The hover on the "Size by attribute" button (step 9) and the hover on the
big dot (step 12) are looks, not wrong turns.

## Silent commits

None. Running Betweenness (04.png to 05.png) recolored every dot and added the legend. Binding
Size to Bridges (10.png to 11.png) changed the dot sizes and added "Size: Bridges" to the
legend. Adding the plain Size line at "1" (07.png to 08.png) is not a binding, so it does not
count, though it changed nothing Dev could see (problem 3).

## False "done"

None. Dev's claim "the sizing part is done" is true on 11.png and 12.png. He did not name the
largest character: the tool printed "Valjean" under his hover, but nothing on screen showed it,
and he said he could not name him without labels.

## Counts and legend sentences that disagree with the drawing

None. The legend's range 0 -- 1624 matches the reference top value for Betweenness on Les
Miserables (1,624), and the largest dot is the darkest.

## Problems

Severity 0-4 (Nielsen). All are single-participant observations of behavior or wording, so they
are unconfirmed until a second participant meets them. No build defect was found, so there is no
repro script.

| #   | Sev | Kind     | Problem                                                                                                                                                                                                                                                             | Evidence                  |
| --- | --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | 2   | behavior | A Size line starts as a plain number ("1") that changes nothing, and the way to tie it to a result is an icon-only chain-link button whose name shows only on hover. Color was bound to the result on its own, so Dev expected Size to offer "Bridges" at once.     | Steps 8-9, 08.png, 09.png |
| 2   | 2   | wording  | The measure is listed as "Betweenness" but every place after the run (outline row, legend, Color field, row header) calls it "Bridges". Dev had to guess they were the same thing; a student writing up "betweenness centrality" cannot confirm it from the screen. | Steps 3-5, 03.png, 05.png |
| 3   | 1   | behavior | There is no Size line in the Style tab until one is added from the "+" beside Shape. Dev found it on his first guess, but only because "size felt shape-ish".                                                                                                       | Steps 6-7, 06.png, 07.png |
| 4   | 1   | wording  | The size picker offers "Bridges", "Bridges rank" and "Bridges percentile" with nothing saying how they differ; Dev took plain "Bridges" by default.                                                                                                                 | Step 10, 10.png           |
| 5   | 1   | behavior | Hovering the largest dot shows no name, so Dev could not say who the key character is without going to labels. Outside this task's success definition, but it blocked the sentence he wanted to write.                                                              | Step 12, 12.png           |
| 6   | 0   | opinion  | The "Start here" tag on PageRank made Dev second-guess the Betweenness his course taught; he kept Betweenness and succeeded.                                                                                                                                        | Step 3, 03.png            |
