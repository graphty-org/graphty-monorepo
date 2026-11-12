# Grade: session r3-s07 -- Tom, T15 B (a whole first session on his own file, friends.csv)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, sighted mouse participant.

## Result

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 15 real.mjs commands (the start plus 14 steps) against the round 3 success path of
  13 commands on B (ratio about 1.15). The extra commands are the two-click export route (Main
  menu, then Export...) and the PageRank row click before Style, neither of which was undone.
- **Wrong turns:** 0. The "+" beside Shape (step 8) was a guess but the right control; nothing
  was undone or abandoned.
- **False "done":** none. Each "done" claim matches its screenshot: "Bigger dots: done" with
  "Size 1 to 3" and "Size: PageRank" on 10.png; "Names: done, mostly" with "20 labels, 0 hidden"
  and every name drawn on 12.png, where he named the bottom pile-up himself; "Picture with key:
  done" with the saved file holding both key lines.
- **Ease (from the transcript):** 5 of 7.
- **Failure codes:** none. Not `ids-not-names`: the `id` column holds the names (Omar, Pia, ...),
  which is the right binding on B.
- **Build-decided:** no. **Void:** no.

## The five parts, checked on screen

1. **File drawn.** 03.png: "Graph, From friends.csv", Nodes 20, Edges 41, opened at the first try
   by "Open project or file...".
2. **A ranking run finished.** PageRank (the "Start here" choice) from Analyze, defaults kept.
   06.png: the outline row "PageRank 20" and the key "Color: PageRank, 0.04382 to 0.06608".
3. **Sizes bound to that result, visibly different.** 10.png and 15.png: "Size 1 to 3" on the
   PageRank row's Style tab, the key reads "Size: PageRank 0.04382 to 0.06608", and the dots
   differ visibly (Ava and Farah largest, Ivan and Hana next). Meaning stated: both size and color
   stand for PageRank, bigger and darker means "more connected to other well-connected people" --
   correct, taken from the key and the method's own description line.
4. **Names drawn.** 12.png: a label line "Above, id" on the PageRank row, which covers all 20
   nodes; every name drawn ("20 labels, 0 hidden"). "Show all labels" was not used (not needed:
   nothing was hidden).
5. **Image downloaded, picture checklist passed.** `downloads/friends_current-view.png`
   (1806 x 1720):
    - same nodes and arrangement as 15.png: yes;
    - sizes visibly different: yes;
    - names drawn on screen drawn in the image: yes, all 20, though "Chloe" sits on Farah's dot
      and Eli and Dev overlap (see problems);
    - key names every channel in use: "Size: PageRank" and "Color: PageRank", both 0.04382 to
      0.06608.

## Other measures

- **Usage card:** declined ("No thanks", step 2) after reading "Files are read on this computer
  and never uploaded" and "Local only"; no detour, no wrong belief stated.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes, by
  the on-screen "Start here" tag; he said the list was otherwise unreadable to him.
- **Watch on B (Ava drawn larger than Farah in 3D):** he named "Ava and Farah" together as the top
  two, never Ava alone as first, so not `meaning-wrong`. He did not read the node values; the
  order between the two was never claimed.
- **Silent commits:** none. Run (05 to 06), size binding (09 to 10) and label attribute (11 to 12)
  each changed the canvas and the key or label count.
- **Counts that disagree with the drawing:** none. "20 labels, 0 hidden" counts labels the overlap
  rule hid; every label is drawn, and the half-covered "Chloe" is occlusion by a dot, not hiding.
- **Tool prints:** "Export" matched the dialog title and the button at step 15; the tool took the
  button, as a person would. Not a tool fault.

## Problems

| #   | Sev | Kind     | What                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Evidence                                                        |
| --- | --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | 2   | behavior | Labels pile up where dots sit close: "Chloe" is drawn on top of Farah's big dot and half hidden, Eli and Dev overlap, on screen and in the exported picture. Farah, the top PageRank person, is partly behind Chloe's dot. The participant said someone will ask "who's under Farah". The label count says 0 hidden, which is true of the overlap rule but gives no hint of the collision. Rests on this participant; check the other two T15 B sessions. | Steps 12, 15; 12.png, 15.png; downloaded PNG around (840, 1380) |
| 2   | 2   | behavior | "Size" is reachable only through "+" beside Shape; there is no Size row. The participant found it by guessing that size belongs to shape. Also seen in the T15 A sessions, so confirmed.                                                                                                                                                                                                                                                                  | Steps 7-8; 07.png, 08.png                                       |
| 3   | 2   | behavior | The automatic orange-to-brown color ramp is hard to tell apart; the participant could pick out about three dark dots and said size, not color, told him who mattered. Also seen in the T15 A sessions, so confirmed.                                                                                                                                                                                                                                      | Step 6; 06.png                                                  |
| 4   | 2   | wording  | The label picker lists only "id" under Attributes; the participant expected "name" and picked "id" hoping it was not a number. On this file the column is named id in the data, so the word is the data's, but the picker gives no sample value to show what the attribute holds.                                                                                                                                                                         | Steps 11-12; 11.png                                             |
| 5   | 1   | behavior | The Export dialog's preview is too small to read the key; the participant believed the key was included only after opening the file. Also seen in the T15 A sessions, so confirmed.                                                                                                                                                                                                                                                                       | Step 14; 14.png                                                 |
| 6   | 1   | opinion  | The key gives raw PageRank scores (0.04382 to 0.06608); the participant could not explain to anyone what 0.06 means.                                                                                                                                                                                                                                                                                                                                      | Steps 10, 15; 10.png, downloaded PNG                            |
| 7   | 1   | opinion  | Analyze's list is jargon (Katz, HITS, Eigenvector, Damping factor); the "Start here" tag carried the choice.                                                                                                                                                                                                                                                                                                                                              | Steps 4-5; 04.png, 05.png                                       |
| 8   | 1   | opinion  | Three saves in the main menu (Save, Save as..., Save local copy...); the participant did not know which, if any, keeps the work for next week, and saved none.                                                                                                                                                                                                                                                                                            | Step 13; 13.png                                                 |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written for this session.
