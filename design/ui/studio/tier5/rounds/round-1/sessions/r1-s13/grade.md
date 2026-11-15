Grade: SD
False done: 0
Wrong turns: 1
Overwhelm: 3 -- the By position number box -- "one empty box with the cursor blinking and the words "___ of all nodes" after it. Nothing said whether it wanted a number or a percent, or whether it meant the top or the bottom, and the count at the top still said 24 of 24"

# r1-s13 grade (task T74A, persona Grace, participant model opus)

Build 1e123d7d33 (tier5-r1d1-1e123d7d33), 1440 x 900, pointer. Steps: 17 against the answer
key's 13 (+4). Tool refusal: none. Leaks: none (`leaks.json` read two transcripts, 43 calls, no
leak). The transcripts record the participant model as claude-opus-5-5.

## End state against the success definition

The last screenshot (18.png) and the end-state records match T74 A's success:

- Layer "Top five" in the Style layers list with count 5; the property pane reads "Which nodes
  5 of 24, PageRank: Influence top 5"; Fill color FFA500 (plain orange).
- `styles.json`: the layer's rule is a PageRank measure with test `{ top: 5, ties: "all" }`,
  `set: { node.color: "#FFA500" }`, matched 5, painted 5, visible 5 of 24.
- `key.json`: 5 nodes drawn #ffa500; the other 19 keep their PageRank ramp shades (14 distinct
  browns and oranges); the start's PageRank layer still covers 24. Everyone else is left as they
  were, as the prompt asks.
- Named in the transcript: Ben Adler, Seun Okoro, Priya Nair, Hannah Weiss, James Carter -- the
  key's five (v21, v13, v05, v09, v02), with the sixth (Paul Dubois, 0.05125) correctly left out.

Route: the key's path (+ > Layer; Which nodes; type the measure; Enter; the mode select; By
position; a number; Enter; Done; Fill; a color; Enter) plus four extra steps: opening the node
table and sorting it by PageRank (steps 2-3, used to read and later name the five), renaming the
layer (step 6), and the "top 5" try (steps 12-13). The hover on a node at step 18 came after the
success state and is not counted against the path.

Wrong turns 1: typing "top 5" into the By position box (step 12) and pressing Enter (step 13)
drew an error; the participant cleared the box and typed 5 (step 14). The table is not a wrong
turn: it stayed open and was used for the answer, not abandoned. One recovered detour makes the
grade SD.

False done 0: the claim of done at step 18 matches the screen and the records.

Follow-up: answered in the transcript (rating 3; least sure at step 11, the By position box with
"of all nodes" and no hint whether it means highest or lowest, a number or a percent).

## Problems

1. **The By position error contradicts the count and the drawing** (severity 2, build-defect).
   Step 13 (13.png): after "top 5" + Enter the red message says "The count and drawing still use
   the highest 10", while the workspace header reads "24 of 24" and all 24 nodes are drawn as
   matches. The participant "didn't know which one to believe". Reproduced by script:
   `design/ui/studio/tier5/rounds/round-1/repro/r1-s13/repro.sh` (06.png: the same message, header
   "Layer 1 24 of 24", all 24 nodes drawn green).
2. **The By position box does not say what it takes** (severity 2, behavior). Step 11 (11.png):
   one empty box followed by "of all nodes"; nothing on screen says highest (or lowest), or a count
   versus a percent. The participant learned it meant "the highest N" only from the error at step
   13. It is the moment she named as least sure, and it is part of the selection editor.
3. **The mode select is named "PageRank test" for assistive technology** (severity 1,
   accessibility). Steps 9-10: the participant's tool line names the combobox "PageRank test", not
   by what it shows ("By value"). Already noted in the answer key's walk on 797a4f6b47; still
   present on this build.
4. **One measure under three names** (severity 1, wording). The picker and the layer's rule say
   "PageRank: Influence" (09.png, 15.png); the table column and the start's layer say "PageRank"
   (03.png, 18.png). The participant listed it as a confusion.
5. **Hovering a node shows no name** (severity 1, behavior). Step 18 (18.png): no tooltip or
   label appears; the participant matched the id v13 against the table herself. Not part of the
   selection editor; backlog.
6. **Plain orange sits near the light end of the start's PageRank ramp** (severity 1, opinion).
   18.png: the five orange nodes are close in hue to the ramp's lighter nodes, so they stand out
   less than the participant wanted. The prompt asked for orange; this is the ramp's choice, not
   a defect of the layer.
