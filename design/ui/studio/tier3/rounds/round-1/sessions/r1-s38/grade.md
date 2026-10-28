Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s38 (task T45 B, persona Tom)

Participant model: claude-opus-5-5 (the participant log records Opus in all 105 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (44 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T45 B asks for Les Miserables opened from the samples, exactly the 51 ties with 5 or more shared
chapters drawn thick and blue, and every character and every other tie unchanged.

- The stack that counts: `styles.json` holds one new layer, "Layer 1". Its edge part
  (`layer-1_1`) selects `data.shared_chapters` in the range 5 to 31 (the column's top), matched 51,
  and sets `edge.color` `#0077BB` and `edge.width` 20, each painted on 51 ties. Its node part
  (`layer-1_2`) sets nothing ("Nodes: not styled" on screen), so no character is touched.
- Thick: 20 is above the default 8 that Everything sets; the blue ties draw visibly thicker than
  the gray ones in `19.png`.
- Blue: `#0077BB` is the swatch the color picker names "blue 0077BB"; a reader calls it blue.
- Everything else unchanged: Everything still sets the edges `darkgrey` at width 8 and the nodes
  `#6366F1`; `key.json` draws all 77 nodes `#6366f1`, 203 ties `#a9a9a9` and 51 ties `#0077bb`.
- Final screen (`19.png`): the layer row "Layer 1 51", the inspector "shared_chapters 5 to 31, 51
  edges" with Color 0077BB and Width 20, and the key "Edge color: Layer 1, 51 of 254 edges". The
  participant's closing claim (51 ties thick and blue, characters and the other ties as before)
  matches the screen and the style tree.

## Steps

17 steps against the key's 16. A first click on "Samples" was refused by the tool as ambiguous
(two controls share the name) and did nothing, so it is no step. Then: Samples (1), the Les
Miserables card (2), "Add a layer or a folder" (3), Layer (4), Edge tab (5), Which edges (6), Add
a condition (7), `shared_chapters` (8), 5 typed in the from box with Tab, "51 of 254 edges" (9),
Done (10), Line "+" (11), Color (12), the "Pick edge color" square (13), the blue swatch (14), Line
"+" (15), Width (16), 20 typed with Enter (17). The one extra step is choosing the color from the
picker's swatch instead of typing a name in the box: a route as short in kind, not a detour. No
wrong turns.

## Problems

1. Severity 2, behavior. Adding Width puts in 8, which is the width every tie already has, so the
   drawing does not change and nothing says the value equals the current width; the participant
   could not tell whether the line had done anything and raised it to 20 by trial ("8 of what?").
   A width typed above 8 then draws only a little thicker at the default framing. Known on this
   build (`answers.md`, T45, "Width on this build") (step 16-17, `18.png`, `19.png`).
2. Severity 2, wording. The key over the drawing reads "Edge color: Layer 1, 51 of 254 edges": it
   names neither the rule (5 or more shared chapters) nor the width the layer also sets, so the
   slide cannot be read without someone explaining it; the layer keeps its default name "Layer 1"
   (step 16 onward, `16.png`, `19.png`).
3. Severity 1, behavior. The Color line arrives showing the hex code `A9A9A9` in a text box; the
   named swatches are found only by clicking the small square beside it. The participant guessed
   the square, and said they would have been stuck otherwise (steps 12-13, `14.png`, `15.png`).
4. Severity 1, wording. The number card reads "Between 1 to 31" and, after the edit, "5 to 31": the
   participant wanted "at least 5" and had to reason that 31 was the top of the column before
   trusting it (steps 8-10, `10.png`, `12.png`).
5. Severity 1, accessibility. Two controls on the start page share the accessible name "Samples"
   (the top bar's link and the start box's button); known on this build (`answers.md`, "The start
   page") (step 2, `02.png`).
6. Severity 1, opinion. Nothing on the graph's first screen points to where ties are styled; the
   participant guessed the "+" beside Style layers, then Layer, then the Edge tab, and got each
   right (steps 3-5, `04.png` to `07.png`).

No build defect: everything the participant met matches what the key says this build does, so no
repro was scripted.
