# Grade: r1-s03b (task T39 A, persona Tom)

Grade: SD
False done: no
Wrong turns: 1

Participant model: claude-opus-5-5 (the participant log records Opus, not Sonnet).

## Result

- Last screenshot (12.png): Les Miserables, every one of the 77 nodes dark green, ties gray,
  the Everything layer open with Fill Color `0B4A05` and "Everything styles all 77 nodes",
  top bar "Autosave: saved".
- Style tree (`styles.json`, end): Everything's node row `everything_2` sets
  `node.color: #0B4A05`, matched 77, painted 77. Everything's edge row `everything_1` still
  sets `edge.color: darkgrey`, width 8, solid, on 254 ties. No other layer paints node color.
  `key.json` draws nodes `#0b4a05` x 77 and edges `#a9a9a9` x 254.
- Drawn hex `0B4A05`; `colorWord("#0B4A05")` = "dark green" (hue about 115, lightness 0.15),
  so the asked hue word "green" holds. The ties are unchanged.
- Stack: the Everything layer's node color changed, which counts. Graded SD, not S: the
  participant first opened the Graph inspector's Style tab (Canvas, Background color), left it,
  and then reached the color through the hue bar and the shade square of the picker instead of
  typing in the color box. 9 steps against the key's 5 (bar 4 is 12).
- The participant's claim ("all 77 characters are dark green") matches the screen and the tree:
  no false done.
- Merged: no (no file was opened; a sample only).

## Leak check

`leaks.json` (written at `--end`) found the participant's transcript, 25 tool calls, and lists no
leak. Not VOID.

## Steps against the success path

The two refused clicks on "Samples" (steps 2 and 3: two controls carry that name) are tool
refusals, not steps.

| # | Participant | Key |
|---|---|---|
| 1 | Samples (button), 04.png | 1. Samples |
| 2 | Card "Who holds the novel together", 05.png | 2. The card |
| 3 | Graph inspector's Style tab: Canvas and Background color only, 06.png -- WRONG TURN, abandoned | -- |
| 4 | Everything in the layer list, 07.png | 3. Everything |
| 5 | "Pick node color" swatch opens the picker, 08.png | 4. Color box |
| 6 | Hue bar: `D0F163` (lime / yellow-green), 09.png | -- |
| 7 | Hue bar again: `6FF163` (light green), 10.png | -- |
| 8 | Shade square: `0B4A05`, 11.png | 5. Type `darkgreen`, Enter |
| 9 | Close the picker; color kept, 12.png | -- |

## Problems

1. **Severity 2, design (behavior). The Graph inspector's Style tab holds only the canvas.**
   After the sample opened (05.png), the reader looked for the dots' color under Style and found
   Canvas, Background color and lighting (06.png). He recognized it was not the dots and left,
   but the key records this as the likely false finish (typing a color there paints the
   background). He found node color only because "Everything 77" in the layer list matched the
   card's 77; the words "Style layers" meant nothing to him. Evidence: step 6 and step 7 notes,
   06.png, 07.png.
2. **Severity 2, design (wording). The color picker offers no way to name a color.** The picker
   (08.png) shows a shade square, a hue bar, a "Hex" field and five swatches (indigo, gray, blue,
   yellow, black). Nothing says the color box takes a word such as `darkgreen`, so the reader
   dragged the hue bar and his first pick was `D0F163`, a pale lime he says he could have printed
   by mistake (09.png). He wished he could "just say dark green". The key's path types the word
   into the color box; the picker itself is where he went. Evidence: steps 8 to 11, 08.png to
   11.png, wrap-up.
3. **Severity 1, design (wording). Whose copy is being changed is unclear.** "Autosave: saved"
   appeared without the reader saving anything, and he could not tell whether the Everything
   layer was the lab's file or his own copy. Evidence: 12.png, wrap-up.
4. **Severity 1, accessibility (known). Two controls are named "Samples"** (the top bar link and
   the start page button), so a click by name was refused twice as ambiguous before
   `role=button:Samples` worked. Recorded in the answer key; a tool event, not reader confusion,
   but a screen-reader user meets the same two names. Evidence: steps 2 to 3, 02.png, 03.png.

No build defect was seen: every control did what it showed, and the color, the counts and the
key agree with the drawing.
