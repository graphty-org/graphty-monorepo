# Grade: session r1-s22 (task T72B, Tom, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 18 actions in 15 counted commands (`route.jsonl`; one more command, a click on "telemetry", matched two controls and did nothing, so it is not counted); the answer key's path B is 14, so 4 over
Overwhelm: 3 (least sure: right after Done on Which nodes -- every dot still blue, and under the layer's outline a stack of empty headings, Shape, Visibility, Text, Fill, Shaders, each with a "+", and nothing saying to pick a color)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 41 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusal: none

## The last screen and the records

Screenshot 17 and the end-state records agree with the answer key's B values:

- Style layer "Layer 1": Which nodes "telemetry yes / Except installed 1990 to 1999", "5 of 11";
  the layer list shows Layer 1 with 5.
- Fill F18463. `key.json`: the canvas key reads "Color: Layer 1, 5 of 11 nodes"; 5 nodes drawn
  #f18463 and 6 in the default #6366f1. No filter card; all 11 nodes and 13 edges visible
  (`data.json`).
- Members, read by the participant off the matches strip at step 12: Mill Pond, Fox Creek, Willow
  Run, Stone Weir, Quarry Pool -- the key's G02, G04, G06, G07, G11. Upper Falls (1998) and Lake
  Inlet (1999) are out.
- Reported: "Five gauges are orange", with the two 1990s gauges named as left out. Right.

The color: F18463 has a hue of 14 degrees, the same hue family as the setups' E4572E (13.5
degrees), lighter. On the screen it reads as a light red-orange, which the key's color rule ("any
visibly orange or red-orange hue") accepts. The participant called it "more of a salmon than a
proper orange" but did not claim otherwise.

## Path and wrong turns

The participant took the key's "also success" route for B: telemetry yes, then Condition...,
installed, the mode select set to Between, 1990 to 1999, and the Except switch (on 1e123d7d33 and
earlier builds read as 5 of 11, `answers.md` T72). The color came from the picker's hue strip
instead of a typed hex, which the key accepts. Success state reached at step 15 (17.png).

- Wrong turns (0): no place outside the path, no menu or picker closed empty, no undo or removal.
  Opening the date step's mode select and choosing Between is the equivalent route, not a detour.
- The 4 extra actions: opening the mode select and choosing Between (2, in place of typing 2000
  and Enter), the second date box (click and type, 1 net), and the swatch plus a hue click in
  place of typing a hex and Enter (net 1).
- The ambiguous "telemetry" command (05.png) is the participant naming a control two controls
  share; the tool said so and the step did nothing. Not a wrong turn and not a tool defect.

False done 0: the claim of done at step 16 matches the screen and the records.

## Follow-up

Present in the transcript. Rating 3. Least sure: after Done on the Which nodes workspace (14.png),
back at the map with every dot still blue; the layer list said 5 and the inspector repeated
"telemetry yes" and "Except installed 1990 to 1999", but below them were empty headings (Shape,
Visibility, Text, Fill, Shaders) with "+" each, the node table still listed all eleven gauges, and
nothing said "now pick a color"; the participant guessed Fill meant color and left Shaders alone.
A smaller wobble: not knowing whether the Except switch would flip both steps or only the date
step until the count went from 2 to 5.

## Problems

1. **The node color picker closes itself on the first click on the Hue strip when the Fill color
   box is empty** (severity 2, build-defect). Step 15 (16.png to 17.png): one click on the hue
   strip committed F18463 and the picker vanished, so the participant could not nudge the color
   toward a truer orange and settled for "salmon". Reproduced by script:
   `design/ui/studio/tier5/rounds/round-1/repro/r1-s22/repro.sh` (`picker/05.png` picker open on
   6366F1; `picker/06.png` picker gone after one hue click, Fill box F18963, all 11 nodes painted).
   The same defect as session r1-s02's repro.
2. **No orange among the picker's preset squares** (severity 2, behavior). 16.png: indigo, two
   grays, blue, yellow, black. A person who does not know a hex code, and here one who says he
   cannot tell red from orange well, has to aim at the hue strip. Step 15.
3. **After Done on Which nodes, nothing leads to the color** (severity 2, behavior). 14.png: the
   layer holds the 5 gauges but paints nothing, and the inspector shows five empty headings with
   "+" each; the participant had expected choosing the gauges to be the coloring and had to guess
   that Fill meant color. This is the participant's least-sure moment. Step 13.
4. **Except's reach is not said** (severity 1, wording). 13.png: before switching it, the
   participant could not tell whether Except would apply to the date step alone or to the whole
   rule; only the count changing from 2 to 5 told him. Step 11.
5. **Condition... does not say it means "and also"** (severity 1, wording). 08.png: next to
   "Or...", the participant picked Condition... by elimination and confirmed it from the count.
   Step 6.
6. **The chosen color is shown only as a hex code** (severity 1, wording). 17.png: the Fill box
   and the key show F18463 and a swatch, with no color name, so the participant could not tell
   whether "orange" was met. Step 16.
7. **"telemetry" had to be read as "sends its readings by itself"** (severity 0, opinion). 01.png:
   the column name is the fixture's own data; the product has no way to know the plain meaning.
   Step 1.
