Grade: SD
False done: no
Wrong turns: 1

# Grade: r1-s09b (task T40 A, Les Miserables, persona Tom, setup `empty`)

Participant model: claude-opus-5-5 (the participant log records Opus in all 78 turns, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (32 tool calls) and lists no file opened
outside its own folder. No `downloads/` or `saved/` files.
Merged: no (a sample opened from the start page).

## Against the success definition

T40 A asks for every character whose name holds "Mme" drawn purple, everyone else unchanged, and
the count said from the screen.

- Last screenshot `15.png`: layer "Married women" (6), Which nodes "name contains Mme, 6 nodes",
  "6 of 77 nodes", Fill > Color `DC63F1`. The key reads "Color: Married women, 6 of 77 nodes".
  Six pink-purple dots; every other dot is the default indigo.
- `styles.json`: node layer "Married women" with the rule `data.name` substring `Mme`,
  `node.color` `#DC63F1`, matched 6, painted 6. Everything still sets `#6366F1` (painted 71,
  covered on 6 by "Married women"). The layer's edge half matches all 254 ties and paints nothing.
- `key.json` drawn: nodes `#dc63f1` 6, `#6366f1` 71; edges `#a9a9a9` 254.
- Asked color: `DC63F1` has hue 291 and lightness 0.67, which `colorWord` (frozen build's
  `color-utils.ts`, band 280-320) names "purple". The participant called it "pinky-purple" and
  "orchid"; the grade follows `colorWord`.
- Count: "6", given with the six names. On screen before it was said: the find list's "Nodes 6"
  (`05.png`) and the picker's "6 of 77 nodes" (`12.png`, `15.png`).
- MmeMagloire is still selected from the find-box Enter (`Selected` 1) and wears a yellow ring.
  Graded on the tree: it is in the layer and painted `#DC63F1`; in `15.png` it still reads purple
  inside the ring, so no key-and-drawing disagreement.

The success state was reached, with the right count from the screen, but after an abandoned
find-box detour that left a node selected, so SD rather than S.

## Steps and wrong turns

Participant: 16 steps from `01.png` to `15.png` (Samples, the Les Miserables card, a click in the
find box, `Mme`, Enter, the Style layers "+", Layer, the name "Married women" with Enter, Which
nodes, Add a condition, `name`, a click in the text box, `Mme`, Fill "+", the color swatch, the
hue bar). The first "Samples#2" click was refused by the tool as ambiguous and counts as none.
The key's path is 11 steps (`answers.md`, T40 A). The extra steps are the find-box detour (3),
the layer name (1), the redundant click in the text box (focus was already there) (1), and the
swatch-plus-hue route to a color instead of typing a word (1 more than the key); the key's Enter
to close the picker was not taken (1 fewer).

Wrong turns: 1.

1. The find box (steps 3-5, `05.png`, `06.png`): it listed the six and gave the count, but it
   colors nothing; Enter selected only MmeMagloire and emptied the box, and the route was left
   for "+" > Layer.

Naming the layer is not a wrong turn. The hue-bar click kept its result (a purple by
`colorWord`), so it is not a wrong turn either.

False done: no. The participant said done on `15.png`, and the screen, the key and the style tree
agree: six drawn purple, 71 unchanged, count 6.

## Problems

1. **One click on the color picker's hue bar sets the color and closes the picker.** Severity 2,
   kind: build-defect. Step 14 (`14.png` to `15.png`): one click on slider "Hue" wrote DC63F1 and
   closed the popup, so the reader could not move on to the saturation square and settled for "a
   pinkish purple, not the deep purple I had in mind". Confirmed: also r1-s10 (T40 B), and the
   scripted repro `rounds/round-1/repro/r1-s10/` (steps 8-9, `08.png` then `09.png`), walked on
   this build by the same path this session took (Fill "+", "Pick node color", a click on the hue
   bar at x 1146).
2. **A new layer's Fill starts at the color every node already has, and nothing offers a color
   word.** Severity 2, kind: behavior. Steps 12-13 (`13.png`, `14.png`): Fill "+" adds Color
   `6366F1`, the default indigo, so "if I'd left it, nothing would have changed and I wouldn't
   have known"; the picker's five swatches hold no purple and the box shows only "Hex". The
   participant never learned the box takes a word. Same finding as r1-s10 (T40 B) and r1-s02
   (T39 B): confirmed across task halves.
3. **The find box counts the matches but offers no way to style them, and Enter takes only the
   first.** Severity 2, kind: behavior. Steps 4-5 (`05.png`, `06.png`): "Nodes 6" listed the six
   with nothing lit in the drawing and no action on the list; Enter selected MmeMagloire alone,
   emptied the box, and left a yellow ring the participant was unsure about for the rest of the
   session. Also r1-s10 (T40 B): confirmed across halves.
4. **A new layer starts as "77 of 77 nodes".** Severity 1, kind: wording. Step 7 (`08.png`): the
   new layer applies to everyone until a condition is added; the participant was "nervous I was
   about to paint everybody". It paints nothing until a look is added, which the screen does not
   say. One session; not confirmed.
5. **"Layer" does not say "a group of dots you color".** Severity 1, kind: wording. Step 5-6
   (`06.png`, `07.png`): the participant chose "+" > Layer only because it was "the only add
   thing I see" and "would never have guessed" the word's meaning. Inside, "Which nodes", "Add a
   condition" and "name / Contains" read clearly. Similar to r1-s10's problem 5 (color under
   Fill only by guessing that a layer is a rule).

Not a program problem: the first "Samples" click was refused by the tool as ambiguous (the start
page has two controls named Samples); the participant then clicked the button by role.
