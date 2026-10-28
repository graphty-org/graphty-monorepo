Grade: SD
False done: no
Wrong turns: 1

# Grade: r1-s01b (task T39 A, persona Elena)

Participant model: claude-opus-5-5 (every model line in the participant log says Opus; not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build
`criteria.md` names. Start: `empty`, pointer, 1440 x 900.
Saved files: none (no `downloads/` or `saved/` folder).

## Leak check

`leaks.json` found the participant's log (23 tool calls) and lists no leak: nothing was opened
outside the session folder. The run completed. No VOID.

## Final state against the success definition

T39 A succeeds when every node is drawn in a dark green and the ties are unchanged.

- Last screenshot `11.png`: Les Miserables, all 77 nodes dark green; the Everything layer's
  inspector shows Fill > Color `063D0C`; the ties are the same gray lines as in `04.png`; top bar
  "Autosave: saved".
- `key.json` (drawn values): nodes `#063d0c` x 77, edges `#a9a9a9` x 254.
- `styles.json` layers: the sample's own set (Node defaults, Edge defaults, Everything x2,
  Selected x2, Hovered); no layer added. The color was set on the Everything layer, a stack the
  answer key counts.
- Drawn value `#063D0C`; its `colorWord` (compact-mantine `color-utils.ts`) is "dark green" (hue
  about 126 degrees, in the green band; lightness about 0.13, under 0.3, so "dark"). It holds the
  asked hue word "green".
- `styles-steps.jsonl`: the task graph's look first changed at `08.png` (`#dcf163`, lime), then
  `09.png` (`#63f174`), then `10.png` (`#063d0c`), unchanged at `11.png`.

She said every character is dark green and the screen shows exactly that: no false done.

## Steps against the success path

The key's path for A is 5 steps: Samples, the card "Who holds the novel together", Everything,
the color box, `darkgreen` and Enter. She took 9 counted steps:

1. Samples (the start box button, by position) -- `03.png`. Her first try by name (`02.png`) was
   refused by the tool as ambiguous (two controls named Samples) and changed nothing: a tool
   event, not a step or a wrong turn.
2. The Les Miserables card -- `04.png`.
3. The Graph inspector's Style tab -- `05.png`. **Wrong turn**: it holds only the canvas and
   labels, no node color (the answer key's "likely false finish" place). She saw that and left
   it.
4. Everything in the layer list -- `06.png`. She chose it from its count (77), unaided.
5. The color swatch -- `07.png`: the picker, swatches purple, gray, blue, yellow, black.
6. The hue bar -- `08.png`: every node lime (`DCF163`).
7. The hue bar again -- `09.png`: every node mint (`63F174`).
8. The saturation square -- `10.png`: every node `063D0C`.
9. Closed the picker -- `11.png`.

Steps 6 to 8 are adjustments inside one control toward the asked color, not wrong turns. Why SD
and not S: the route went through a wrong place (the Graph Style tab) and is not as short as the
key's (9 against 5).

Bar 4 (steps from `01.png` to the first screenshot where every node shows one new color):
`08.png`, 6 counted steps (7 tool actions less the refused one). The asked color itself was
reached at `10.png`, 8 counted steps.

Unprompted moves: the prompt says "ready-made network", not "sample"; she inferred Samples.

## Problems

1. **The Graph inspector's Style tab has no node color** -- severity 2, design. Step 3, `05.png`:
   a first-time reader looking for "the dots' color" opens the Style tab beside the graph's
   counts and finds only canvas background, lighting, outline width and labels. She recovered by
   guessing that "Everything 77" was all the characters. The same expectation was predicted
   (not acted on) in r1-s04 (T39 B); acted on here. One acted session: needs a second task half
   or a repro to confirm.
2. **Nothing tells the reader the color box takes a color word, and the picker offers no common
   hues** -- severity 2, design. Steps 5-8, `07.png`-`10.png`: the field shows only a hex and a
   swatch, and the picker's five swatches hold no green, so she hunted on the hue bar and the
   square through lime and mint (3 steps where `darkgreen` and Enter is 1) and ended on an
   arbitrary dark green. r1-s04 (T39 B) met the same gap ("I had to know a hex code for
   orange"). Two sessions on two task halves: confirmed.
3. **Two controls named "Samples" on the start page** -- severity 1, accessibility. Step 1,
   `01.png`/`02.png`: the top-bar link and the start box button share the name; a name-based
   pick is ambiguous. Both lead to the same library, so no harm to a sighted pointer user; a
   screen-reader user hears two identical names. Already in the answer key's start-page notes;
   also met in r1-s04.

Good: every node changed the moment a color was picked, so she could judge the result live
(`08.png`-`10.png`).

No build defect was seen, so no repro was written.
