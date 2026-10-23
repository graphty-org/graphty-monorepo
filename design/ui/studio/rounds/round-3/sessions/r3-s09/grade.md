# Grade: session r3-s09 -- Ruth (reporter), a whole first session, her own file friends.csv

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Graded from the last
screenshot (16.png), the saved image `downloads/friends_current-view.png` (1806 x 1720) and the
transcript, plus one scripted re-run on the same build. Not from the participant's rating (6 of 7).

## Grade: S (success)

All five parts hold in one sitting, and no later step undid an earlier one:

1. **Own file drawn.** Step 2 (03.png): friends.csv, 20 nodes, 41 edges, matching the reference.
2. **Ranking run from Analyze, finished.** Steps 3-5 (04.png-06.png): Analyze (the flask),
   PageRank, Run. The outline gained "PageRank 20" and the key "Color: PageRank 0.04382 to
   0.06608", the reference range.
3. **Sizes bound to the result, visibly different, meaning stated.** Steps 6-9 (10.png): PageRank
   row, "Add to Shape", Size, PageRank. The Size line reads "1 to 3" and the key gained "Size:
   PageRank 0.04382 to 0.06608". In the debrief she said both size and color are the PageRank
   score, "bigger and darker dot means a higher score". Correct.
4. **Label line bound to the name attribute on a row covering every node, names drawn.** Steps
   10-11 (12.png): the line is on the PageRank row ("PageRank 20", every node), bound to `id`,
   which holds the names on this file. Twenty names are drawn; the panel reads "20 labels, 0
   hidden", the reference statement. Not `ids-not-names`. "Show all labels" was not used and is
   not needed (nothing is hidden).
5. **Image downloaded that passes the picture checklist.** Steps 12-15: Main menu, Export...,
   Export. Checklist against 16.png:
    - same nodes and arrangement as the final screen: yes;
    - sizes visibly different: yes;
    - the names drawn on screen are drawn in the image: yes, all 20, soft (problem 3);
    - a key naming every channel in use: yes, "Size: PageRank" and "Color: PageRank", each with its
      range.

- **Activation measure:** yes. She weighed Degree against PageRank and took PageRank because of
  its "Start here" tag, with no tooltip, help or detour.
- **Watch on B (3D size):** on screen and in the image Ava's dot is drawn larger than Farah's,
  although Farah has the top score (problem 1). She named "Ava and Farah" together as highest and
  did not put Ava first, so this is not `meaning-wrong`. Her "then Ivan and Hana" was read from dot
  size; she never opened Values. The reference third is Hana.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no. The "Export#2" click (step 14) took a second control named
  Export, as the tool is told to; the tool did what was asked.
- **Partial:** 5 of 5 parts reached.

## Counts

|                                   | This session | Reference                                                                                           |
| --------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Steps (real.mjs, after the start) | 15           | 13 on the round 3 route for the own file (the usage card and the menu route to Export add one each) |
| Wrong turns                       | 0            | --                                                                                                  |

- Step 14 ("Export#2") saved nothing and the dialog stayed open (15.png); step 15 clicked the blue
  Export button and saved the file. This was a mis-addressed click on the right control, not a
  choice of the wrong place, so it is counted as an extra step, not a wrong turn.
- Main menu > Export... is a documented route (one click more than Control+E).
- Hesitations that cost no steps: Degree or PageRank (step 4), "Size" under "Shape" (step 7),
  `id` as the name field (step 11).

## False "done"

None. Each "PART n DONE" matches its screenshot: 03.png shows the file drawn; 06.png the finished
run; 10.png the Size line and key; 12.png all 20 names and "20 labels, 0 hidden"; 16.png and the
saved file the exported picture with its key. At step 5 she said "PART 2 DONE, I think" and the
run had finished.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects were
reproduced by `rounds/round-3/repro/r3-s09/repro.sh`, which runs her exact route as a script on
the same build. Its output is in `run/` and `run.log`; the re-run gave a pixel-identical drawing
and the same exported image (`run/downloads/friends_current-view.png`).

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                   |
| --- | --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | In the default 3D view, dot size on screen and in the exported image does not follow the score: Ava (0.06423) is drawn clearly larger than Farah (0.06608, the top score), because nearer dots look bigger. Farah's dot is also half behind Chloe's. A reader of the shared picture, whose key says "bigger = higher PageRank", will name Ava as the top person. Ruth read her ranking from dot sizes and never checked values; she avoided the wrong claim only by naming the two together. | Step 9, 10.png; step 15, 16.png and `downloads/friends_current-view.png`. Repro: `run/10.png`, `run/16.png`, `run/downloads/friends_current-view.png`, the same every run. |
| 2   | 2   | behavior     | Names collide at the bottom of the drawing while the panel reads "20 labels, 0 hidden": "Chloe" is drawn over Farah's dot and Farah's label, "Dev" and "Eli" touch, and edges run through "Sana", "Theo" and "Kofi". She said she would have to tidy it before sending it on.                                                                                                                                                                                                                | Step 11, 12.png; 16.png; the saved image. Same in `run/`.                                                                                                                  |
| 3   | 2   | build-defect | In the 2x export, node names are soft and blurred while the key's text is sharp, as if names were drawn at screen resolution and scaled up. Also seen in session r3-s02 on the same build.                                                                                                                                                                                                                                                                                                   | Step 15, `downloads/friends_current-view.png`. Repro: `run/downloads/friends_current-view.png`.                                                                            |
| 4   | 2   | behavior     | "Size" has no line of its own; it sits under "Shape" ("Add to Shape" opens Size / Shape). She looked for "Size", did not find it, and guessed. Also seen in r3-s02, so confirmed.                                                                                                                                                                                                                                                                                                            | Steps 6-7, 07.png, 08.png.                                                                                                                                                 |
| 5   | 1   | wording      | The key's range (0.04382 to 0.06608) has no unit and no "higher means more"; she worked out from the colors that darker means more and "could not tell an editor what 0.066 means".                                                                                                                                                                                                                                                                                                          | Steps 5 and 9, 06.png, 10.png.                                                                                                                                             |
| 6   | 1   | wording      | The label list offers only "id" for the names; "id sounds like a number" made her hesitate before picking it. It comes from the file's own column, so the word is the data's, but nothing says the column holds names.                                                                                                                                                                                                                                                                       | Step 10, 11.png.                                                                                                                                                           |
| 7   | 1   | opinion      | The Analyze list is jargon (Betweenness, Eigenvector, Katz, HITS); only "Start here" settled the choice.                                                                                                                                                                                                                                                                                                                                                                                     | Step 3, 04.png.                                                                                                                                                            |
| 8   | 1   | opinion      | PageRank's "Weight: None" setting does not say whether her file's `weight` column should be used; she left it, unsure.                                                                                                                                                                                                                                                                                                                                                                       | Step 4, 05.png.                                                                                                                                                            |
| 9   | 0   | opinion      | The key is small in the corner of the exported picture and easy to miss, though readable.                                                                                                                                                                                                                                                                                                                                                                                                    | `downloads/friends_current-view.png`.                                                                                                                                      |

What worked: "Open project or file" took the CSV in one step, and the 20 / 41 counts let her check
nothing was dropped. The empty outline's hint pointed at the flask. Clicking the run row opened its
Style tab, and Size opened its attribute list at once. "Show all labels" was not needed. The
privacy lines ("Local only", "never uploaded", "Saved to this computer only") answered a reporter's
first worry each time it came up.
