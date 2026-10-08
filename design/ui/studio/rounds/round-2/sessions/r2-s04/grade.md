# Grade: session r2-s04 -- Tom, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Tom needed a tooltip
("Size by attribute", `09.png`) to learn how to size the dots by a value, after guessing that
size lived under "+" beside Shape.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: opened from Samples; the panel reads 77 nodes, 254 edges,
   matching the reference values.
2. **A ranking run finished.** `05.png`: PageRank (shown on screen as "Influence") colored all 77
   nodes, with a key "Color: Influence 0.003299 -- 0.07543" and a row "Influence 77".
3. **Sizes bound to the result and visibly different.** `11.png` and `16.png`: a Size line
   ("1 to 3") bound to Influence and "Size: Influence" in the key; the dots clearly differ, the
   largest in the middle and at the bottom of the fan. Meaning, at the end: both size and color
   stand for "Influence -- the PageRank score"; bigger and darker orange means more influential.
   Correct. Naming Valjean and Myriel as the two biggest rests on the labels drawn on those dots
   (`13.png`, `16.png`), so it was on screen before he said it.
4. **Names drawn.** `13.png` and `16.png`: a label line bound to `name` on the Influence row,
   which covers all 77 nodes, reads "77 labels, 6 hidden to avoid overlap" (the reference value
   for a sized Les Miserables). Real names are drawn, not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `16.png`; sizes are visibly different; the names drawn on screen are drawn in
   the image (soft, and illegible in the dense middle, but present); the key names both channels
   in use ("Size: Influence" and "Color: Influence", each 0.003299 to 0.07543). `16.png` shows the
   toast "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`), one of them a hover. The
  success path for this route (card, open, Analyze, PageRank, Run, select row, add to Shape, Size,
  size by attribute, pick, add label line, pick name, menu, Export, Export) is about 15 to 18, so
  at or under the path length.
- **Wrong turns:** 0. The tooltip hover (`09.png`) is counted as help (the reason for SD), not a
  wrong turn. Opening "+" beside Shape (`07.png`) was a guess, but it is the success path.
- **False "done":** none. "Part 1 done" (`02.png`), "Part 2 done (I think)" (`05.png`), "Part 3
  done" (`11.png`), "Part 4 done" with the hidden six acknowledged (`13.png`) and "Part 5 done"
  (download present, passes the checklist) are all true. He reported the blurry names in the
  file himself rather than claiming they were readable. truth_on_screen: not applicable.
- **Activation:** yes. He picked PageRank from the Analyze list on its "Start here" tag and
  one-line description and ran it with no tooltip and no detour (`03.png` to `05.png`).
- **Usage card:** declined ("No thanks", `02.png`).
- **Silent commits:** one. Adding Size (`08.png`) put a line with the fixed value 1 and left
  every dot unchanged. He did not take it for done; binding by attribute (`11.png`) then changed
  the drawing.
- **Counts against the drawing:** none disagree.
- **Tool prints:** step 16, `--click "Export"` matched both the button and the dialog and took
  the button, as a person would. No script error, no failed request (session.log is empty). Not
  a tool fault; the session is not void.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                               | Evidence                                                                                    |
| --- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | 2        | behavior | Names in the exported PNG are soft and smudged; in the dense middle they cannot be read, including Valjean, the most important node. Fit for screen, not for a slide. | Step 16, `downloads/les-miserables_current-view.png`; on screen `13.png`, `16.png`          |
| 2   | 2        | behavior | Size has no row of its own; it is reached only through "+" beside Shape, and he found it by guessing ("a ball's size isn't its shape").                               | Steps 6-7, `06.png` (rows Fill, Color, Shape, Effects, Label, Tooltip; no "Size"), `07.png` |
| 3   | 2        | behavior | Adding Size gives a fixed "1" and no visible change; binding it to a value needs a small chain-link icon with no words, learned only from its tooltip.                | Steps 8-10, `08.png`, `09.png` (tooltip "Size by attribute"), `10.png`                      |
| 4   | 1        | opinion  | The key's numbers (0.003299 to 0.07543) mean nothing to a reader; he could not say them aloud in a meeting. A rank or low/high would be sayable.                      | Steps 5 and 16, `05.png`, `16.png`, exported PNG                                            |
| 5   | 1        | opinion  | The orange ramp's shades are hard to tell apart for a reader with red-green color weakness; size did the real work.                                                   | Step 5, `05.png`                                                                            |
| 6   | 1        | behavior | On screen the key box sits over the drawing and covers names near its top edge (Blacheville); the exported file does not have this overlap.                           | `16.png` against the downloaded PNG                                                         |
| 7   | 1        | behavior | Export is reached only through the main menu (or Control+E); nothing on the working screen says "picture" or "export".                                                | Steps 13-14, `13.png`, `14.png`                                                             |
| 8   | 1        | behavior | Names on screen are very small in a thin serif font and collide in the dense middle.                                                                                  | Step 13, `13.png`                                                                           |
| 9   | 1        | opinion  | It is not clear that the "Influence" row in the outline is where its styling lives; he clicked it hoping, and found Size and Label there by luck.                     | Step 6, `06.png`                                                                            |
| 10  | 0        | opinion  | Nothing says why PageRank is the suggested start over Degree, the one measure he understood, so he could not justify the choice.                                      | Step 3, `03.png`                                                                            |

No problem in this session is a build defect under the criteria (no crash, no control that does
nothing, no wrong count, keyboard not in scope for this participant), so none needed a scripted
reproduction. Problems 1, 2, 3, 5, 6 and 7 were also seen in session r2-s03 on the same build,
so they are confirmed (two participants); the rest rest on this participant alone.
