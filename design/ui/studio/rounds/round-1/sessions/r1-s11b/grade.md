# Grade: session r1-s11b -- Tom, names on every dot (Les Miserables)

- **Grade:** SD (success with difficulty)
- **Failure codes:** none
- **False "done":** no. Tom said "The names are on. Seven are hidden and I can't find how to bring
  them back", which matches the screen ("77 labels, 7 hidden to avoid overlap", 11.png).
- **Steps:** 7 to the success state (start, decline the usage card, open the sample, Style,
  Everything, Add label line, name), against a path of 4; 11 in all. The 4 after step 7 were
  searches for a way to show the hidden names, which the build does not have.
- **Wrong turns:** 4 -- 1 before success (step 4, the Graph's Style tab, corrected at step 5) and
  3 after it, each a dead end looking for a control that does not exist (step 8 wheel zoom, step 9
  Label position, step 10 the "Abc name" chip).
- **Ease (from the transcript):** 3 on a 1 = very easy, 7 = very hard scale, which is 5 of 7 on
  the Single Ease Question's 7 = very easy scale.
- **Usage card:** declined ("No thanks", step 2), no detour. Stated reason: "I don't want anything
  leaving the building"; no wrong belief about what is sent.
- **Silent commits:** none. Choosing `name` drew names at once (06.png to 07.png).
- **Tool prints:** no `ambiguous`, script errors or failed requests in the session log. The start
  waited about 40 minutes for a browser slot; that is queueing, not a tool fault, and the session
  is not void.
- **Build-decided:** no.

## Why SD

The final screenshot (11.png) shows Everything selected, its Style tab with the label line
"Aa Above / Abc name", names drawn beside most dots, and "77 labels, 7 hidden to avoid overlap"
under the line. That meets the success definition: a label line bound to `name` on the row that
covers every node, names on the canvas, and Tom read the hidden count aloud with its reason
("'77 labels, 7 hidden to avoid overlap.' So seven aren't showing", step 7). He got there after a
detour: the Graph's Style tab (04.png) holds only the background and the layout method, and he
found the node settings by guessing that "Everything" meant all the dots. A detour then a
correction, plus more than two wrong turns in all, is SD.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---------|----------|------|----------|
| 1 | Turning the mouse wheel over the drawing does not zoom. Tom tried to get closer to the crowded middle, where the hidden names sit. A drag on the same spot does move the view, so input reaches the canvas; only the wheel is ignored. | 3 | build-defect | Step 8; 07.png and 08.png are byte-identical. Reproduced as a scripted path in `rounds/round-1/repro/r1-s11b/`: start empty, `--click "No thanks"`, `--click "Les Miserables"`, then `--wheel 740,400,-600` twice and `--wheel 740,400,600` once. 03.png to 06.png are byte-identical on every wheel step; `--drag 740,400 900,500` (07.png) does change the view. |
| 2 | The hidden-for-overlap note says names are missing and offers no way to act on it: no "show all", no hint that zooming would reveal them. Tom ends knowing 7 names are missing and unable to show them. | 2 | behavior | Steps 7-11; 07.png, 11.png. Expected on this build per the task definition. |
| 3 | The Style tab on the opening Graph place holds only Background, Method and Seed; nothing points to Everything for how the dots look. A first-time user looking for "how it looks" lands there first. | 2 | behavior | Step 4, 04.png: "Background color and some 'Method' thing. Nothing about names." |
| 4 | The "Aa" (label position) and "Abc name" (attribute) boxes on the label line look like text settings but offer only position and the same attribute list; neither holds size or "show all". | 2 | behavior | Steps 9-10; 09.png (3x3 position grid), 10.png (attribute list again). |
| 5 | Names are drawn tiny, serif, dark on light grey; most of the crowded middle is unreadable at the default view for a reader with reading glasses. | 2 | opinion | Step 7, 07.png: "Small, but there. The middle is a mess though." |
| 6 | The plus that adds a label line is small and faint, and the Label row reads as a heading, not a button. | 1 | opinion | Step 5, 05.png: "The plus is tiny, I have to squint at it." |
| 7 | "77 labels, 7 hidden to avoid overlap" is small light-grey text, easy to miss; Tom had to lean in to read it. | 1 | accessibility | Step 7, 07.png. |
