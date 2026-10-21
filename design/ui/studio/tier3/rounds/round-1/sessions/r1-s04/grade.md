# Grade: r1-s04 (task T39 B, persona Nadia)

Grade: S
False done: no
Wrong turns: 0

Participant model: claude-opus-5-5 (every model line in the participant log says Opus; not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), viewport 1440 x 900, pointer.
Merged: no (a sample, no file).

## Leak check

`leaks.json` read the participant's log (24 tool calls) and lists no leak: nothing was opened
outside the session folder. No VOID.

## Final state against the success definition

T39 B succeeds when every node is drawn orange and the ties are unchanged.

- Last screenshot `07.png`: College football, all 115 nodes orange; the Everything layer's
  inspector shows Fill > Color `FFA500` with an orange swatch; the ties are the same gray lines
  as in `04.png`.
- `key.json` (drawn values): nodes `#ffa500` x 115, edges `#a9a9a9` x 613.
- `styles.json`: the Everything node layer (`everything_2`) sets `node.color: "#FFA500"` over
  115 matched nodes; the Everything edge layer (`everything_1`) still holds `edge.color:
  "darkgrey"`, width 8, solid. No layer was added beyond the sample's own.
- Drawn value `#FFA500`; its `colorWord` in compact-mantine's `color-utils.ts` is "orange"
  (named color "orange FFA500"), which contains the asked hue word.
- `styles-steps.jsonl`: the task graph's look first changed at `07.png` (colors `#ffa500`).

The participant said "every team orange" and the screen shows exactly that: no false done.

## Steps against the success path

The key's path for B is 5 steps: Samples, the card "Conferences fall out of who played whom",
Everything in the layer list, the color box, a color and Enter. The participant took the same 5:

1. Samples (button in the start box) -- `03.png`.
2. The College football card -- `04.png`.
3. Everything in the layer list -- `05.png` (inspector opens on Style, Node, Fill Color `6366F1`).
4. Click in the color box -- `06.png` (value selected).
5. Typed `FFA500`, Enter -- `07.png`, every node orange.

The first click on "Samples" was refused by the tool as ambiguous (the top-bar link and the
start-box button share the name) and changed nothing (`02.png`). That is a tool event, not a
step or a wrong turn. Wrong turns: 0. Unprompted route: the prompt says "ready-made network",
not "sample"; the participant inferred Samples itself.

## Problems

1. **Two controls named "Samples" on the start page** -- severity 1, accessibility. Step 2,
   `01.png`/`02.png`: the top-bar link and the start-box button carry the same name, so a
   name-based pick is ambiguous (the tool refused it). Both lead to the same library, so no
   harm to a sighted pointer user; a screen-reader user hears two identical names. Already
   recorded in the answer key's description of the start page.
2. **The color box gives no sign it takes a color word** -- severity 1, design. Steps 5-6,
   `05.png`/`06.png`: the field shows only a hex code and a swatch; the participant believed it
   had to know a hex code ("I had to know a hex code for orange") and asked for a named-color
   list. The box accepts `orange` (answer key: `orange` gives `FFA500`), but nothing on screen
   says so. Did not cost this participant a step; would stop a reader who knows no hex code.
   One session only: needs a second task half or a repro to confirm.
3. **Sample cards lead with a question, the dataset name small beneath** -- severity 1, opinion.
   Step 2, `03.png`: the participant scanned for "College football" and found it in the smaller
   gray line under "Conferences fall out of who played whom". Found fast here; not a failure.
4. **Nothing says outright that a style change leaves the data alone** -- severity 0, opinion.
   Wrap-up: the participant was briefly unsure whether recoloring changed the data or only the
   picture; "Style layers" suggested the picture. No step affected.
5. **Finding "Everything" relies on knowing the layer list** -- severity 1, opinion. Wrap-up:
   the participant guessed Everything from its count (115) and predicted a first-timer might
   look in the Graph inspector's Style tab (which shows only the background color, the key's
   likely false finish). Not experienced in this session; a prediction, recorded, not a finding.

No build defect was seen, so no repro was written.
