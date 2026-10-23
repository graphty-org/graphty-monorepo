# Grade: session r2-s08 -- Elena, a whole first session on her own file (friends.csv)

**Grade: S** (success). All five parts of the task were reached in one sitting, and no later
step undid any of them. She used no tooltip or help and made one wrong turn: she clicked a node
before ranking and never cleared that selection. The selection is still in the exported picture
(problem 1). That does not fail the picture checklist, but it does make the picture misleading.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **friends.csv drawn.** `03.png`: she dropped the file on the window and it opened. The panel
   reads Nodes 20 and Edges 41, which matches the reference values.
2. **A ranking run finished.** `07.png`: she ran PageRank, which the screen shows as "Influence".
   All 20 dots are colored, the key reads "Color: Influence 0.04382 -- 0.06608" and the outline
   has a row "Influence 20".
3. **Sizes bound to the result and visibly different.** `12.png`: the Size line reads "1 to 3",
   is bound to Influence, and the key reads "Size: Influence". The dots clearly differ in size,
   with Farah the largest. When asked what the sizes and colors mean, she said both stand for
   "Influence", and that bigger and darker means more influence. That is correct. She named Farah
   as the most influential and Ava as second. Farah's dot is the largest on screen, and Ava's
   panel reads "#2 of 20" (`07.png`), so both claims were on screen before she made them.
4. **Names drawn.** `14.png`: she added a label line on the Influence row, which covers all 20
   nodes, and bound it to `id`. For this file `id` holds the names, so that is the right choice
   here and not `ids-not-names`. All 20 names are drawn, and the panel reads "20 labels, 0 hidden
   to avoid overlap".
5. **Image downloaded and passes the picture checklist.** The file is
   `downloads/friends_current-view.png` (1806 x 1720).
    - It shows the same 20 nodes in the same arrangement as `17.png`.
    - The sizes are visibly different.
    - All 20 names drawn on screen are drawn in the image.
    - The key names both channels in use: "Size: Influence" and "Color: Influence", each from
      0.04382 to 0.06608.

    `17.png` shows the toast "Exported friends_current-view.png".

## Measures

- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`). The success path is about
  18 steps, so she finished at or under the path length.
- **Wrong turns:** 1. In step 4 (`04.png`) she clicked Ava to see who the middle dot was. That is
  not on the success path, and she never cleared the selection, so it ended up in the picture.
  Her other guesses were all on the success path: "+" beside Shape (`09.png`), the chain icon
  (`11.png`) and choosing `id` (`14.png`).
- **False "done":** none. Every "PART n DONE" was true on screen when she said it: step 3, step 7,
  step 12, step 14 ("all 20, it even says so") and step 17 (the file exists and passes the
  checklist). At step 4 she guessed that Ava mattered most, but she called it a guess and did not
  claim a step was done. The ranking later corrected her. truth_on_screen: not applicable.
- **Activation:** yes. She chose PageRank from the Analyze list because of its "Start here" tag,
  and ran it with no tooltip and no detour (`05.png` to `07.png`).
- **Usage card:** declined ("No thanks", `02.png`).
- **Silent commits:** one. Adding Size (`10.png`) created a line with the fixed value 1 and left
  every dot unchanged. She did not take that for done, and binding the size to Influence
  (`12.png`) then changed the drawing.
- **Counts against the drawing:** none disagree. "20 labels, 0 hidden" is literally true, but see
  problem 2.
- **Tool prints:** in step 8, `--click "Influence"` matched more than one control and took the
  outline row. In step 17, `--click "Export"` matched both the dialog and its button and took the
  button. Both are what a person would have clicked. session.log is empty. This is not a tool
  fault, and the session is not void.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Evidence                                                                                                                                                                                                                                                                                                                                               |
| --- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 3        | build-defect | A node that was selected before export keeps its yellow selection ring in the exported "To share" picture. Its dot is also drawn olive, a color that is not on the key's orange-to-brown scale. In this session that node was Ava, the second most influential person. Anyone reading the picture will think the ring means something, and cannot read Ava's influence from her color. Nothing in the Export dialog warns about the selection or offers to leave it out. The preview shows the ring, but Elena could not tell whether it mattered. | Step 4 (`04.png`) is the click. Steps 16 and 17 (`16.png`, `17.png`) and `downloads/friends_current-view.png` show the result. Reproduced: `rounds/round-2/repro/r2-s08/repro.sh` drops friends.csv, clicks Ava, runs PageRank and exports with the defaults. Its `run/downloads/friends_current-view.png` shows the same ring and the same olive dot. |
| 2   | 2        | behavior     | Two labels are hard to read even though the panel says "0 hidden to avoid overlap". After sizing, Chloe's dot sits on Farah's dot, so the name "Chloe" is printed across the dot of the most influential person. "Eli" and "Dev" crowd each other. The hiding step checks for labels that overlap but not for a label that lands on a dot, so the count gives a false sense that every name can be read. A similar case (Valjean's name on his own dot) was recorded in r2-s02 and r2-s05.                                                         | Step 14 (`14.png`), `17.png`, `downloads/friends_current-view.png`                                                                                                                                                                                                                                                                                     |
| 3   | 2        | behavior     | Size has no row of its own. It can only be reached from the "+" beside Shape, and she found it by guessing. Also recorded in r2-s04.                                                                                                                                                                                                                                                                                                                                                                                                               | Steps 8 and 9 (`08.png`, `09.png`)                                                                                                                                                                                                                                                                                                                     |
| 4   | 2        | behavior     | Adding Size creates a fixed "1" and changes nothing on screen. Binding the size to a value needs a small chain-link icon that has no text. She tried it only because the Color box already showed "Influence". Also recorded in r2-s04.                                                                                                                                                                                                                                                                                                            | Steps 10 to 12 (`10.png`, `11.png`, `12.png`)                                                                                                                                                                                                                                                                                                          |
| 5   | 2        | behavior     | The label picker lists "id", not "name". She expected an id to be a number, and chose it only because Ava's panel had shown "id Ava" earlier. A reader who never opened a node's panel has nothing to tell them that `id` holds the names. Seen in this session only.                                                                                                                                                                                                                                                                              | Step 13 (`13.png`); step 4 (`04.png`) is where she learned it                                                                                                                                                                                                                                                                                          |
| 6   | 1        | opinion      | The Analyze list is full of terms she did not know (Betweenness, Eigenvector, Katz, HITS). She got through only because of the "Start here" tag. The result is named "Influence" while the method she picked was "PageRank", and nothing on screen tells her that the two are the same thing.                                                                                                                                                                                                                                                      | Steps 5 to 7 (`05.png`, `07.png`)                                                                                                                                                                                                                                                                                                                      |
| 7   | 1        | opinion      | The run form shows "Damping factor" and "Weight" with no explanation. She left both at their defaults without knowing what they do.                                                                                                                                                                                                                                                                                                                                                                                                                | Step 6 (`06.png`)                                                                                                                                                                                                                                                                                                                                      |
| 8   | 1        | opinion      | The key's numbers (0.04382 to 0.06608) mean nothing to her, and she cannot tell whether the spread between them is large. Also recorded in r2-s04.                                                                                                                                                                                                                                                                                                                                                                                                 | Step 7 (`07.png`), the exported PNG                                                                                                                                                                                                                                                                                                                    |
| 9   | 1        | behavior     | Export can only be reached from the main menu or with Control+E. Nothing on the working screen mentions a picture or exporting. Also recorded in r2-s04.                                                                                                                                                                                                                                                                                                                                                                                           | Steps 14 and 15 (`14.png`, `15.png`)                                                                                                                                                                                                                                                                                                                   |

Problem 1 is a build defect. The scripted path above does the same thing on every run, so under
the criteria it is confirmed even though only one participant met it. Problems 2, 3, 4, 8 and 9
were also seen in other sessions on the same build, so they are confirmed by the two-participant
rule. Problems 5, 6 and 7 come from this participant only.
