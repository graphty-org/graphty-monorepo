# Grade: session r3-s13 -- Dev, T10 A (names on every dot, Les Miserables)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, screen-reader mode off. No downloads
(the task saves no file).

## Result

- **Grade: S** (success, round 3 "switch on" scoring).
- **Every name reached:** yes.
- **Steps:** 9 real.mjs commands (the start plus 8 steps) against the round 3 route of 5 after
  the start (open the sample, Everything, Add label line, name, Show all labels) plus the usage
  card. The extras are one wrong turn (the Graph Style tab) and one check zoom at the end.
- **Wrong turns:** 1. Step 4 opened the Style tab of the whole graph (03.png to 04.png), which has
  background and layout settings only; the participant backed off to "Everything" on the next
  step. The step 9 zoom was a check of a finished state, not a wrong turn. Wrong turns spent
  hunting for the hidden names: 0 (the "Show all labels" box was found at once beside the count).
- **False "done":** none. The final claim ("every dot has its name, and the panel says 77 labels
  with none hidden") matches 08.png and 09.png: the line reads "77 labels" with no hidden part and
  the "Show all labels" box is ticked. Names overlap in the dense middle; answers.md counts that as
  the switch working, not as a missing name.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Failure codes:** none.
- **Build-decided:** no.

## Success definition, checked on screen

1. **Label line bound to `name` on a row covering every node.** 07.png, 08.png, 09.png: the
   Everything row's Style tab, Label line "Aa Above | Abc name".
2. **Names drawn.** 07.png: names on most dots (Blacheville, Fameuil, Myriel, Napoleon...).
3. **Count read and acted on.** 07.png reads "77 labels, 7 hidden"; the participant read it, said
   the task needs every character, and ticked "Show all labels" (step 8). 08.png: "77 labels", no
   hidden part; names newly drawn include Gillenormand, Mother Innocent, Mlle Gillenormand. The
   participant said every name is now written, which matches the screen.

## Other measures

- **Silent commits:** none. Picking `name` (06 to 07) drew names; ticking "Show all labels" (07 to 08) changed the statement and drew more names.
- **Counts that disagree with the drawing:** none seen. "77 labels" equals the 77 nodes in Values
  (03.png).
- **Usage card:** declined ("No thanks", step 2); no detour.

## Problems

| #   | Sev | Kind     | What                                                                                                                                                                                                                                                                                                                                | Evidence                                            |
| --- | --- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | 2   | behavior | With the sample open, nothing on screen says "label" or "name"; the right panel opens on the whole graph, whose Style tab has only canvas and layout settings. The participant reached the Label line only by guessing at "Everything", whose meaning they did not know, and said a failed second guess would have left them stuck. | Steps 3-5; 03.png, 04.png, 05.png; debrief          |
| 2   | 1   | behavior | In the crowded middle the names are tiny and drawn on top of one another; zooming in helped only a little, so the participant could not read them all, though every name was drawn.                                                                                                                                                 | Steps 8-9; 08.png, 09.png around (640-800, 340-460) |
| 3   | 1   | wording  | "Label" with only a "+" beside it did not say whether it turns names on or adds something extra; the participant guessed correctly.                                                                                                                                                                                                 | Steps 5-6; 05.png, 06.png; debrief                  |
| 4   | 1   | behavior | Names are hidden for overlap by default, so a first pick of `name` leaves 7 characters unnamed; the participant asked why. The statement made it visible, so no wrong belief resulted.                                                                                                                                              | Step 7; 07.png ("77 labels, 7 hidden")              |
| 5   | 0   | wording  | "Aa Above" beside the line was not understood (guessed as the name's position); not touched.                                                                                                                                                                                                                                        | Step 7; 07.png; debrief                             |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written.
