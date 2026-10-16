# Grade: session r2-s05 -- Nadia, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because Nadia needed a tooltip
("Size by attribute", `09.png`) to learn how to tie the dots' size to a value, after guessing
that size lived under "+" beside Shape.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: opened from Samples; 77 nodes and 254 edges, matching the
   reference values.
2. **A ranking run finished.** `05.png`: PageRank (shown on screen as "Influence") colored all 77
   nodes, with a key "Color: Influence, 0.003299 to 0.07543" and a row "Influence 77". The range
   matches the reference.
3. **Sizes bound to the result and visibly different.** `11.png` and `16.png`: a Size line
   ("1 to 3") bound to Influence and "Size: Influence 0.003299 - 0.07543" in the key; the dots
   clearly differ, the largest and darkest in the middle. Meaning, in the debrief: "both stand for
   the same thing, the 'Influence' score PageRank worked out -- a bigger dot and a darker brown
   both mean a more influential character." Correct. "The biggest, darkest dot is Valjean" rests
   on the label drawn on that dot (`13.png`, `16.png`); "Myriel is the next most obvious" agrees
   with the reference (Myriel second at 0.04278). She could not say what the numbers mean in
   words, which the task does not ask.
4. **Names drawn.** `13.png` and `16.png`: a label line bound to `name` on the Influence row,
   which covers all 77 nodes, reads "77 labels, 6 hidden to avoid overlap" (the reference for a
   sized Les Miserables). Real names are drawn, not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `16.png`; sizes are visibly different; the names drawn on screen are drawn in
   the image (small and soft, but present); the key names both channels in use ("Size:
   Influence" and "Color: Influence", each 0.003299 to 0.07543). `16.png` shows the toast
   "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`), one of them a hover.
  The success path is about 18 (card and open counted apart; here one step did both), so she was
  at or under the path.
- **Wrong turns:** 0. Adding Size under Shape (`07.png`, `08.png`) was a guess, but it is the
  success path. The hover on the chain icon (`09.png`) is counted as help (the reason for SD), not
  a wrong turn.
- **False "done":** none. "Part one done" (`02.png`), "Part two done, I think" (`05.png`), "Part
  three done" (`11.png`), "Part four done -- though 6 are hidden" (`13.png`; she did not claim
  every name) and "Part five done" (`16.png`, download present and passing the checklist) are all
  true. truth_on_screen: not applicable.
- **Activation:** yes. She picked PageRank from the Analyze list and ran it with defaults, with no
  tooltip and no detour (`03.png` to `05.png`). Her choice rested on the "Start here" tag, which is
  on-screen guidance in the list itself, not help; she said Degree sounded just as right.
- **Usage card:** declined ("No thanks", step 1). Not discussed further.
- **Silent commits:** one. Adding Size (`08.png`) put a line with the fixed value 1 and left every
  dot unchanged. She did not take it for done; binding by attribute (`11.png`) changed the drawing.
- **Counts against the drawing:** none disagree.
- **Tool prints:** the last step printed `ambiguous: "Export" matches 2 controls ... took the
first`; the first was the dialog's Export button, the file was saved, and a person would have
  pressed the same button. Not a tool fault; the session is not void. session.log is empty.
- **Build-decided:** no. **Void:** no.

## Problems

"Confirmed" means the same finding was also seen in session r2-s03 (Ruth, same task).

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                | Evidence                                                                                   |
| --- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | 2        | behavior | Size has no row of its own; it is reached only through "+" beside Shape, and she found it by guessing ("Size is closest to Shape, I guess"). Confirmed.                                                                | Step 6-7, `06.png` (rows Fill, Color, Shape, Effects, Label, Tooltip; no "Size"), `07.png` |
| 2   | 2        | behavior | Adding Size gives a fixed "1" and no visible change; binding it to a value needs a small chain-link icon she understood only from its tooltip. "A new user could easily stop at '1'." Confirmed.                       | Steps 8-10, `08.png` (dots unchanged), `09.png` (tooltip "Size by attribute"), `10.png`    |
| 3   | 2        | behavior | Names are tiny and soft on screen and in the exported PNG; the crowded middle overlaps, and the most important name (Valjean) is printed across its own big dot. Confirmed.                                            | Step 13 `13.png`, step 16 `16.png`, `downloads/les-miserables_current-view.png`            |
| 4   | 2        | wording  | The key's numbers (0.003299 to 0.07543) mean nothing to a reader of her document; she could not say in words what a score of 0.07543 is, and planned to write a guess ("relative influence, larger = more central").   | Debrief; key in `16.png` and the downloaded PNG                                            |
| 5   | 2        | behavior | The Analyze list is nine method names she does not use; she chose PageRank only because of the "Start here" tag, and Degree ("how many edges each node has") seemed just as right.                                     | Step 3, `03.png`                                                                           |
| 6   | 1        | wording  | The run is called "PageRank" in the Analyze list and "Influence" everywhere afterward; for a moment she was not sure the Influence row was the run she had just made.                                                  | Steps 4-6, `04.png`, `05.png`, `06.png`                                                    |
| 7   | 1        | wording  | PageRank's form asks for "Damping factor 0.85" and "Weight" with no plain explanation; she left them alone without knowing what they do.                                                                               | Step 4, `04.png`                                                                           |
| 8   | 1        | opinion  | The orange color ramp's shades are hard to tell apart; size, not color, made the picture readable. Confirmed.                                                                                                          | Step 5, `05.png`                                                                           |
| 9   | 1        | opinion  | "77 labels, 6 hidden to avoid overlap" does not say which six, and the exported picture gives no sign that names are missing. Confirmed.                                                                               | Step 13, `13.png`; debrief                                                                 |
| 10  | 1        | behavior | On screen the key box sits over the drawing and covers names near its edge (Blacheville, top left); the exported file has no such overlap. Seen by the grader, not remarked on by Nadia. Confirmed (r2-s03 problem 5). | `16.png` against the downloaded PNG                                                        |
| 11  | 1        | opinion  | Nothing told her whether coloring and sizing changed the data or only the view; she assumed only the view.                                                                                                             | Debrief                                                                                    |

No problem in this session is a build defect under the criteria (no crash, no control that does
nothing, no wrong count, keyboard not in scope for this participant), so none needed a scripted
reproduction.
