# Grade: session r3-s05 -- Mara, T15 A (a whole first session on Les Miserables)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, sighted mouse participant.

## Result

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 18 real.mjs actions (the start plus 17 step commands). The round 3 success path is
  15 commands on A with "Show all labels" and about 17 without; this session did not use "Show
  all labels", so the path is about 14 to 15 commands. The 3 extra commands were chosen looks,
  not mistakes: opening Betweenness's "Advanced" to read its parameters (step 6), and opening the
  Preset list and picking "For print" in the Export dialog (steps 16 and 17).
- **Wrong turns:** 0. Every click moved toward the goal or was a deliberate inspection that the
  participant closed out on the next step. The size control was found on the first guess (Shape
  "+", step 9).
- **False "done":** none. Each "part done" claim matches the screenshot of its step: part 2 at
  07.png (key "Color: Betweenness 0 to 1624", outline row "Betweenness 77"), part 3 at 11.png
  (key "Size: Betweenness", "Size 1 to 3"), part 4 at 13.png ("77 labels, 7 hidden", which she
  read and stated correctly), part 5 at 18.png ("Exported les-miserables_current-view.png").
- **Ease (from the transcript):** 6 of 7.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (no tool fault; at step 18 "Export" matched both the dialog
  and its button and real.mjs took the button, which is what a person would click).

## The five parts, checked on screen

1. **Sample drawn.** 03.png: Les Miserables, Nodes 77, Edges 254.
2. **A ranking run from Analyze, finished.** Betweenness, chosen from the "Rank nodes and edges"
   list over the "Start here" PageRank, defaults kept. 07.png: outline row "Betweenness 77" and
   the key "Color: Betweenness, 0 to 1624". The top value is correct: Valjean's unnormalized
   betweenness is 0.5699 x 2850 pairs = 1624.
3. **Sizes bound to that result, visibly different, meaning stated.** 11.png and 18.png: a
   "Size 1 to 3" line on the Betweenness row's Style tab, the key reads "Size: Betweenness 0 to
   1624", and Valjean and Myriel are visibly the largest dots. Meaning: bigger and darker means
   more shortest paths between other characters pass through that character; both channels
   stand for betweenness. Correct for the measure she ran. The answer key names "Influence" or
   "PageRank" because that is the expected run; another ranking from Analyze, correctly named and
   explained, meets the step.
4. **Names drawn.** 13.png: label line "Above, name" on the Betweenness row, which covers all 77
   nodes; names drawn; "77 labels, 7 hidden". "Show all labels" was not used (not required).
5. **Image downloaded, picture checklist passed.** `downloads/les-miserables_current-view.png`
   (3612 x 3440, the "For print" 4x preset):
    - same nodes and arrangement as 18.png: yes;
    - sizes visibly different: yes (Valjean, Myriel, Fantine largest);
    - names drawn on screen drawn in the image: yes, the same names, but soft (see problem 1);
    - key names every channel in use: "Size: Betweenness" and "Color: Betweenness", both 0 to 1624. Pass.

## Other measures

- **Usage card:** declined ("No thanks", step 2), no detour.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes. She
  read the one-line definitions, deliberately passed over "Start here" and ran Betweenness.
- **Pause over the run's name:** none; "Betweenness" in the list, the row and the key.
- **Silent commits:** none. The run (06 to 07), size binding (10 to 11) and label binding (12 to 13) each changed the canvas or the key.
- **Counts that disagree with the drawing:** none seen.
- **Tool prints:** none in session.log.

## Problems

| #   | Sev | Kind     | What                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                              |
| --- | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | 3   | behavior | Labels in the exported image are blurry while dots and the key are sharp, as if the label text were drawn at screen size and scaled up. The "For print -- PNG, 4x, sharper" preset promises a sharper picture and does not deliver it for the names. Also seen in the other T15 A session at 2x, so confirmed. Held at 3 here: the participant judged the figure unusable for a paper. | Step 18; downloaded PNG, any label (e.g. "Gervais" near (1100, 950) at display scale) |
| 2   | 2   | behavior | Running a statistic recolors every node with a pale orange-to-brown ramp; only two or three characters stand out, and the participant did not expect a paint step from computing a number. Seen in both T15 A sessions, so confirmed.                                                                                                                                                  | Step 7; 07.png                                                                        |
| 3   | 2   | behavior | Size is reachable only through the "+" beside Shape; there is no Size heading until one is added. Found by a guess. Seen in both T15 A sessions, so confirmed.                                                                                                                                                                                                                         | Steps 8-9; 08.png, 09.png                                                             |
| 4   | 2   | behavior | Valjean's name, the most important character, sits on top of his own dot and is half hidden among edges and neighboring labels, on screen and in the image. Seen in both T15 A sessions, so confirmed.                                                                                                                                                                                 | Steps 13, 18; 13.png, downloaded PNG around (1030, 835) at display scale              |
| 5   | 2   | opinion  | Export offers PNG, JPEG and WebP only; no SVG or PDF. For this participant that rules the tool out for paper figures. Held one level down from 3 as an opinion; one participant.                                                                                                                                                                                                       | Steps 15-16; 15.png, 16.png                                                           |
| 6   | 1   | wording  | Betweenness's Advanced shows "Sample size 0" without saying 0 means exact (all pairs), and nothing says whether the result is normalized or weighted; she worked it out by checking the maximum against NetworkX. One participant.                                                                                                                                                     | Step 6; 06.png                                                                        |
| 7   | 1   | wording  | The toolbar's "3D" label left her unsure whether the drawing she was exporting is flat. One participant.                                                                                                                                                                                                                                                                               | Steps 3, 18; 03.png, 18.png                                                           |
| 8   | 1   | opinion  | The drawing sits left of center with empty space on the right, in the image as on screen. One participant.                                                                                                                                                                                                                                                                             | Step 18; 18.png, downloaded PNG                                                       |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written for this session.
Problems 1 to 4 are confirmed by this session and the other T15 A session on the same build;
5 to 8 rest on this participant alone.
