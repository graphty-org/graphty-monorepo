# Grade: session r3-s02 -- Elena (first-time graph user), a whole first session, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Graded from the last
screenshot (15.png), the saved image `downloads/les-miserables_current-view.png` (1806 x 1720) and
the transcript, plus one scripted re-run on the same build. Not from the participant's rating (5 of
7).

## Grade: S (success)

All five parts hold in one sitting, and no later step undid an earlier one:

1. **Sample drawn.** Step 2 (02.png): Les Miserables, 77 nodes, 254 edges.
2. **Ranking run from Analyze, finished.** Steps 4-6 (04.png-06.png): Analyze, PageRank, Run. The
   outline gained "PageRank 77" and the key "Color: PageRank 0.003299 to 0.07543".
3. **Sizes bound to the result, visibly different, meaning stated.** Steps 7-10 (10.png): PageRank
   row, "Add to Shape", Size, PageRank. The Size line reads "1 to 3" and the key gained "Size:
   PageRank". In the wrap-up she said both size and color are PageRank and "bigger and darker means
   more important". Correct.
4. **Label line bound to `name` on a row that covers every node, names drawn.** Steps 11-12
   (12.png): the line is on the PageRank row, which holds all 77 nodes ("PageRank 77"). Names are
   drawn. The panel reads "77 labels, 6 hidden". "Show all labels" was not used, and the task does
   not require it.
5. **Image downloaded that passes the picture checklist.** Steps 13-15: Main menu, Export...,
   Export. Checklist against 15.png:
   - same nodes and arrangement as the final screen: yes;
   - sizes visibly different: yes;
   - the names drawn on screen are drawn in the image: yes, small and soft (problem 2);
   - a key naming every channel in use: yes, "Size: PageRank" and "Color: PageRank", each with its
     range.

- **Activation measure:** yes. She picked PageRank and ran it with no help, no tooltip and no
  detour. The "Start here" tag on the list decided it ("the only reason I didn't close it").
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (the two `ambiguous` prints, at steps 7 and 15, are the
  known ones and took the intended control).
- **Partial:** 5 of 5 parts reached.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 14 | 13 on the round 3 route without "Show all labels" (15 with it and the usage card) |
| Wrong turns | 0 | -- |

- One step off the route: step 3 selected Valjean to look at him. It was exploration, not an
  attempt at a task part, so it is not counted as a wrong turn. It left Valjean selected, and the
  selection went into the exported picture (problem 1).
- The image was reached by Main menu > Export... (one click more than Control+E). This is a
  documented route.
- The only hesitation that cost time was at step 7: she looked for "Size" and found it under
  "Shape" on her first guess.

## False "done"

None. Each "part done" claim matches its screenshot. At step 12 she said the names were "tiny, but
there", not that every name was on. The "6 hidden" she missed is not part of this task's success
condition. Her ranking in the wrap-up (Valjean biggest, Myriel next) matches the drawing and the
values.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects below
were reproduced by `rounds/round-3/repro/r3-s02/repro.sh`, which runs her route as a script. The
output is in `run/` and `run.log`, and the image is in `run/downloads/`. The re-run gave the same
result as the session.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | A node selected before the export keeps its yellow selection ring in the exported picture. The Export dialog offers no way to leave it out, and its preview is too small to show it. In the picture the ring tints the top-ranked node (Valjean) olive instead of the darkest brown the key gives 0.07543. So the color of the one node that matters most disagrees with the picture's own key. The ring also covers his name. She noticed the glow and said it "looks like I'm highlighting him on purpose". A reader of the shared picture cannot tell that it was not meant. | Step 3 (03.png) selects; step 14 (14.png) preview; step 15 (15.png) and `downloads/les-miserables_current-view.png`. Repro: `run/03.png` selects Valjean; `run/downloads/les-miserables_current-view.png` has the same ring and tint, every run. |
| 2 | 2 | build-defect | In the 2x export, node names are soft and blurred while the key's text is sharp. The names look as if they were drawn at screen resolution and scaled up. Names in the middle run together. The pilot already recorded this. | Step 15, `downloads/les-miserables_current-view.png`. Repro: `run/downloads/les-miserables_current-view.png`. |
| 3 | 2 | behavior | "Size" has no line of its own. It sits under "Shape" ("Add to Shape" opens Size / Shape). She looked for the word "Size", did not find it, and guessed. | Steps 7-8, 07.png, 08.png. Seen in one participant; behavior problems need a second participant to be confirmed. |
| 4 | 2 | behavior | Names are tiny at the default framing and overlap in the middle of the drawing. "77 labels, 6 hidden" and "Show all labels" are small gray text in the side panel, and she did not notice them until afterwards. | Step 12, 12.png. |
| 5 | 1 | opinion | After Run, the light-to-dark orange scale hardly separates the nodes. She "couldn't see who was important until I made the sizes change". | Step 6, 06.png. |
| 6 | 1 | opinion | The Analyze list reads as a wall of unfamiliar method names (Betweenness, Eigenvector, Katz, HITS). Only the "Start here" tag kept her from closing it. | Step 4, 04.png. |
| 7 | 1 | wording | The size choices "PageRank", "PageRank rank" and "PageRank percentile" give no hint of how they differ. She took the plain one, the same word as the color. | Step 9, 09.png. |
| 8 | 1 | opinion | The key's raw range (0.003299 to 0.07543) means nothing to a first-time reader ("Is 0.07 a lot?"). | Steps 6 and 10, 06.png, 10.png. |
| 9 | 1 | wording | "Degree 36" in a node's Summary is not explained ("36 of what?"). | Step 3, 03.png. |

What worked: the sample was one click from the start page. The hint in the empty outline pointed
at the flask. "Start here" on PageRank made the choice for her. Clicking the run row opened its
Style tab. Size "+" opened the attribute list at once. `name` was the obvious label choice.
Main menu > Export... was where she expected it, and the exported key carries both channels with
their ranges.
