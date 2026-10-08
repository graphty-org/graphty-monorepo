# Grade: session r1-s03b -- Nadia, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Nadia needed a tooltip
("Size by attribute") to find how to size the dots by a value, and guessed that size lived under
"Shape".

This session re-runs r1-s03, which ended without a result after 40 minutes (the start waited
several minutes for a free browser slot). r1-s03 is not graded; this session stands in for it.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: Overview reads Nodes 77, Edges 254, Components 1, which
   matches the reference values. Opened from Samples on the start screen.
2. **A ranking run finished.** `05.png`: PageRank (shown on screen as "Influence") colored all 77
   nodes, with a key reading 0.003299 to 0.07543, the reference range. `06.png`: the Top 10 starts
   Valjean 0.07543, Myriel, Gavroche, matching the reference top three.
3. **Sizes bound to the result and visibly different.** `12.png`: a Size line ("1 to 3") on the
   Influence row and "Size: Influence" in the key; Valjean and Myriel are clearly the largest
   dots. Meaning, at the end: "both show Influence, the score from the PageRank ranking. Bigger
   and darker means more influence. Valjean is the biggest, then Myriel." Correct, and the order
   was on screen (`06.png`) before she said it.
4. **Names drawn.** `14.png`: a label line bound to `name` on the Influence row, which covers all
   77 nodes, reads "77 labels, 6 hidden to avoid overlap" -- the reference statement for a sized
   Les Miserables. Real names are drawn, not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `17.png`; sizes are visibly different; the names drawn on screen are drawn in
   the image (small and soft, but present); the key names both channels in use ("Size:
   Influence" and "Color: Influence", each 0.003299 to 0.07543). `17.png` shows the toast
   "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`, one hover included). The
  success path is about 18, so about 0.9x.
- **Wrong turns:** 0. The hover on the link icon at step 10 was a check, not a step off the path;
  opening the Top 10 (step 6) was on the way to the Style tab.
- **False "done":** none. "Part one done" (`02.png`, drawing and counts on screen), "Part two
  done" (`05.png`, run finished, key shown), "Part three done" (`12.png`, Size line and key),
  "Part four done -- names are on" (`14.png`; she did not claim every name, and noted they were
  tiny), and the closing "all five parts" (download present, passes the checklist) are all true.
  truth_on_screen: not applicable.
- **Activation:** yes. She picked PageRank from the "Start here" tag and ran it with no help, no
  tooltip and no detour (`03.png` to `05.png`).
- **Usage card:** declined with "No thanks" at step 2, no detour, no stated belief about what is
  sent.
- **Tool prints:** step 17 printed `ambiguous: "Export" matches 2 controls (button, dialog); took
the first`. The first match was the button, which is what she meant; the export ran. Not a tool
  fault.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                                                                      | Evidence                                                          |
| --- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1   | 2        | behavior | Labels are very small on screen and soft in the 2x export; Valjean's name, the picture's main point, sits on the rim of his own large dot and is crossed by his edges, so it is the hardest name to read. Nadia believed it was hidden under the dot. In the export the label is present but barely legible. | step 14 `14.png`, step 17 `17.png`, the download (around Valjean) |
| 2   | 2        | behavior | No "Size" line on the Style tab; size is reached through "+" beside Shape. She had to guess the section.                                                                                                                                                                                                     | step 7 `07.png`, step 8 `08.png`                                  |
| 3   | 2        | behavior | Adding Size gives a fixed size ("1"); sizing by a value is behind an unlabeled link icon whose purpose shows only on hover ("Size by attribute"). This is what made the session SD.                                                                                                                          | step 9 `09.png`, step 10 `10.png`, step 11 `11.png`               |
| 4   | 1        | wording  | The run is picked as "PageRank" and then named "Influence"; she was unsure they were the same until the key said so.                                                                                                                                                                                         | step 5 `05.png`                                                   |
| 5   | 1        | wording  | "Size by attribute": "attribute" is not her word; she clicked it only because of the tooltip.                                                                                                                                                                                                                | step 10 `10.png`                                                  |
| 6   | 1        | opinion  | The key gives raw decimals (0.003299 to 0.07543) with no words for what Influence means; a reader of her alert file would not know either.                                                                                                                                                                   | `12.png`, the download                                            |
| 7   | 1        | behavior | The export dialog's preview is too small to check that the key will be in the file.                                                                                                                                                                                                                          | step 16 `16.png`                                                  |
| 8   | 1        | behavior | The key box on the canvas covers the top of the drawing (Blacheville and Listolier's labels sit under it).                                                                                                                                                                                                   | `14.png`, `17.png`                                                |
| 9   | 0        | opinion  | Before sizing, the orange shades of the Influence colors barely differ, so color alone told her little.                                                                                                                                                                                                      | step 5 `05.png`                                                   |
| 10  | 0        | behavior | The Export dialog and its Export button share the accessible name "Export" (the tool reported the match as ambiguous). Harmless here; listed for the accessibility check.                                                                                                                                    | step 17                                                           |

No problem in this session is a build defect under the criteria (no crash, dead control, wrong
count or keyboard block), so there is no repro directory for it. The label legibility problem
(1) repeats the label-collision finding from r1-s06b and counts toward confirmation as behavior.
