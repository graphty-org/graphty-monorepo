# Grade: session r3-s04 -- Grace, T15 A (a whole first session on Les Miserables)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, sighted mouse participant.

## Result

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 16 real.mjs actions (15 step commands plus the start; step 2 held two clicks). The
  task was finished at step 15, which is 15 commands against the round 3 success path of 15
  commands on A with "Show all labels" (ratio 1.0). Step 16 (clicking Valjean's dot to read his
  name) came after the image was saved, changed nothing in the drawing and is not counted as a
  wrong turn.
- **Wrong turns:** 0.
- **False "done":** none. Every "part done" claim matches the screenshot taken at that step. At
  step 12 the participant said "all 77 names are on the drawing, though the middle is a jumble";
  12.png reads "77 labels" with "Show all labels" ticked, and she named the illegible middle
  herself, so the claim does not leave a wrong belief.
- **Ease (from the transcript):** 5 of 7.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## The five parts, checked on screen

1. **Sample drawn.** 02.png: Les Miserables, Nodes 77, Edges 254, matching "77 characters" on
   the start screen.
2. **A ranking run finished.** PageRank (the "Start here" choice) from Analyze, defaults kept.
   05.png: the outline row "PageRank 77" and the key "Color: PageRank, 0.003299 to 0.07543".
3. **Sizes bound to that result, visibly different.** 09.png and 12.png: a "Size 1 to 3" line on
   the PageRank row's Style tab, the key reads "Size: PageRank 0.003299 to 0.07543", and the dots
   differ visibly (Valjean largest, Myriel next). Meaning stated: bigger and darker dots mean a
   higher PageRank score, both channels stand for PageRank -- correct, read from the key on
   screen before it was said.
4. **Names drawn.** 11.png: a label line "Above, name" on the PageRank row, which covers all 77
   nodes; names drawn ("77 labels, 6 hidden"). "Show all labels" was used (12.png: "77 labels",
   box ticked).
5. **Image downloaded, picture checklist passed.** `downloads/les-miserables_current-view.png`
   (1806 x 1720):
   - same nodes and arrangement as 15.png and 16.png: yes;
   - sizes visibly different: yes;
   - names drawn on screen drawn in the image: yes, every name (Show all labels on), though
     several overlap in the dense middle and Valjean's is unreadable (see problems);
   - key names every channel in use: "Size: PageRank" and "Color: PageRank", both 0.003299 to
     0.07543.

## Other measures

- **Usage card:** declined ("No thanks" at step 2), no detour, no stated belief about what is sent.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes.
  The participant leaned on the on-screen "Start here" tag on PageRank and said without it she
  would have guessed; that tag is part of the screen, not outside help.
- **Pause over the run's name:** none; the run was PageRank in the list, the row and the key.
- **Silent commits:** none. Run (04 to 05), size binding (08 to 09), label attribute (10 to 11)
  and Show all labels (11 to 12) each changed the canvas or the key.
- **Counts that disagree with the drawing:** none seen. "77 labels" (12.png) counts Valjean's
  label, which is drawn but covered by edges and neighboring labels.
- **Tool prints:** none reported; no script or console errors in the transcript.

## Problems

| # | Sev | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 3 | behavior | With every name shown, labels are tiny and pile up in the middle; the most important character's name (Valjean) is covered by edges and neighboring labels, on screen and in the exported picture. The participant could learn who the biggest dot was only by clicking it, and said she would not put the picture on a slide. Also seen in the other T15 A session (Valjean's name unreadable), so confirmed. Held at 3: the task succeeded, but the picture fails its purpose for a reader. | Steps 12, 15, 16; 12.png, 15.png, 16.png; downloaded PNG around (940, 780) |
| 2 | 2 | behavior | Labels in the 2x export are soft and blurry, as if drawn below the export's resolution. Seen in both T15 A sessions, so confirmed. | Step 15; downloaded PNG |
| 3 | 2 | behavior | "Size" is reachable only through "+" beside Shape; there is no Size row until one is added. The participant guessed size belongs to shape. Seen in both T15 A sessions, so confirmed. | Steps 6-7; 06.png, 07.png |
| 4 | 2 | behavior | After the run, the automatic orange-to-brown ramp makes nearly every dot the same orange; the participant was "guessing dark = matters more" and said the size does most of the work. Seen in both T15 A sessions, so confirmed. | Step 5; 05.png |
| 5 | 1 | wording | The Export dialog does not say the key is included; the participant inferred it from the small preview and believed it only after opening the file. Seen in both T15 A sessions, so confirmed. | Step 14; 14.png |
| 6 | 1 | opinion | The key gives raw PageRank scores (0.003299 to 0.07543), which the participant could not explain to a board; she found "#1 of 77" in the node's Values far clearer. | Steps 9 and 16; 09.png, 16.png |
| 7 | 1 | opinion | Analyze's list is jargon (Eigenvector, Katz, HITS, Damping factor); the "Start here" tag carried the choice. | Steps 3-4; 03.png, 04.png |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written for this session.
Problems 1 to 5 are confirmed by this session and the other T15 A session on the same build;
6 and 7 rest on this participant alone.
