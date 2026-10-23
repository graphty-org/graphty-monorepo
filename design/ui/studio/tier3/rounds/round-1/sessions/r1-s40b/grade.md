Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s40b (task T45 B, persona Dev)

Participant model: claude-opus-5-5. The participant log has 100 model entries, and every one is Opus, not Sonnet.
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (43 tool calls) and found no file opened
outside the session's own folder. No downloads or saved files.

## Against the success definition

T45 B asks for the Les Miserables sample with exactly the 51 ties that have 5 or more shared
chapters drawn thick and blue. Every character and every other tie must stay as it was.

- Sample in: Samples, then the card "Who holds the novel together" (Les Miserables, 77 nodes,
  254 edges) (`03.png`, `04.png`).
- The layer that counts is a new layer named "Strong ties". Its edge part `layer-1_1` has the
  selector range `data.shared_chapters` from 5 to 31, matched 51. It sets `edge.color` `#0077BB`
  and `edge.width` 20, and each is painted on 51 ties. Its node part `layer-1_2` sets nothing
  (painted {}), so it holds no node value.
- `#0077BB` is the swatch the app itself names "blue 0077BB" (tooltip at step 18), so the color
  is blue. The width of 20 is above the default 8.
- Everything else is unchanged. `key.json` draws all 77 nodes `#6366f1`, 51 edges `#0077bb`
  and 203 edges `#a9a9a9`.
- Final screen (`22.png`): the blue ties are drawn over the gray ones. The key reads "Edge
  color: Strong ties, 51 of 254 edges". The inspector reads "Edge layer", the chip
  "shared_chapters 5 to 31, 51 edges", Color 0077BB, Width 20 and "Nodes: not styled". The
  layer row shows 51. The participant said done, and the screen shows the same.

## Steps

The session took 18 steps from `01.png` against the key's 16. Hovers and the tool's refusal
are not counted. The steps were: Samples (1), the card (2), "+" (3), Layer (4), renaming the
layer "Strong ties" (5, an extra step but not a wrong turn), the Edge tab (6), Which edges
(7), Add a condition (8), `shared_chapters` (9), typing 5 and Tab (10, "51 of 254"), Done
(11), Line "+" (12), Color (13), the swatch to open the picker (14), the blue swatch (15), Line
"+" (16), Width (17), and typing 20 and Enter (18). Picking blue from the picker instead of
typing `blue` cost one extra step. Doing Color before Width only swaps the key's order.

There were no wrong turns. At step 2 the tool refused `--click "Samples#2"` because the top-bar
link and the button share the name "Samples". That is a tool event, not reader confusion.

## Problems

1. Severity 2, behavior. The Width line is added with `8` in its box. It has no unit, and
   nothing says that 8 is what every tie already draws at. The blue ties looked no thicker, so
   the participant could not tell whether the width had applied, and guessed 20. Even at 20
   the ties draw only a little thicker at the default framing (step 21 in `21.png`; step 22 in
   `22.png`). The answer key records this default. Nothing on screen explains it.
2. Severity 1, wording. A number condition is a "Between" range (1 to 31). It has no "at
   least" choice, so the participant had to reason that 5 to 31 means "5 or more" and was not
   sure that 31 is the true maximum (step 12 in `12.png`; step 13 in `13.png`).
3. Severity 1, wording. The Color line opens on a hex code ("A9A9A9") with the code selected.
   The color names appear only as tooltips on the picker's swatches, which the participant
   found by opening the picker and hovering (steps 16-18, `16.png` to `18.png`).
4. Severity 1, wording. The start page has two controls named "Samples", the top-bar link and
   the button (step 2, `02.png`). The answer key already records this.
5. Severity 1, opinion. "Style layers" was not a word the participant expected for "a rule for
   some ties". The "+" tooltip, "Add a layer or a folder", carried them to it (steps 5-6,
   `05.png`, `06.png`).

No build defect: everything seen matches what the answer key says this build does, so no repro
was scripted.
