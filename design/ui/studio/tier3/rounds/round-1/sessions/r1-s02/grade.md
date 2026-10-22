Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s02 (task T39 B, persona Dev)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (27 tool calls) and lists no file opened
outside its own folder.

## Against the success definition

T39 B asks for every node of College football drawn orange with the ties unchanged.

- Last screenshot `07.png`: College football open, all 115 nodes drawn orange, the ties gray.
  Everything selected in the layer list, Node tab, Fill > Color `FFA500` with an orange swatch.
- `styles.json`: the Everything node layer sets `node.color` `#FFA500`, matched 115, painted
  `node.color` 115. The Everything edge layer still sets `edge.color` darkgrey on 613 ties; no
  layer was added.
- `key.json` drawn: nodes `#ffa500` 115, edges `#a9a9a9` 613.
- Asked color: drawn `#FFA500`, `colorWord` "orange" (a CSS keyword), which contains "orange".
- Stack: Everything's node color changed, which the key counts as S.

## Steps and wrong turns

Steps from `01.png` to the first screenshot where every node shows the new color: 5, the key's
5 (Samples, the College football card, Everything, the color box, `orange` and Enter).
`styles-steps.jsonl` first shows `#ffa500` alone at `07.png`.

The first command, `--click "Samples"`, was refused by the tool as ambiguous and did nothing.
That is a tool event, not a step and not a wrong turn. It does show two controls sharing the
name "Samples" (problem 2 below).

Wrong turns: 0. False done: no. The participant said it was done on `07.png`, and the screen and
the style tree agree.

## Problems

1. **Nothing says the color box takes a color name, and clicking it opens no picker.** Severity 2,
   kind: behavior. Step 4 (`06.png`): clicking the box only selects `6366F1`. The participant
   "didn't know the code for orange" and typed the word as a guess, which worked (`07.png`). A
   reader who doesn't guess this is stuck with hex codes or has to find the swatch button. The
   picker opens from the swatch ("Pick node color", per the key), but nothing on screen points to
   it or says names are accepted. One session; not confirmed as a design problem until a second
   task half or a repro shows a reader stuck.
2. **Two controls named "Samples" on the start page.** Severity 1, kind: accessibility. Step 1
   (`02.png`): the top bar link and the start box button share the accessible name, so a click
   by name is ambiguous. This is against bar 6 ("no two reachable controls share an accessible
   name"). The key already records it as "two controls named Samples".
3. **Sample cards are titled by a question, with the dataset name in the smaller line.** Severity
   1, kind: wording. Step 2 (`03.png`): College football is the card "Conferences fall out of who
   played whom"; the participant "had to read every card to find it". Found anyway in one click.
4. **The base layer is named "Everything", and nothing says it colors all nodes until it is
   opened.** Severity 1, kind: wording. Step 3 (`04.png`): the participant looked for
   "Appearance" or "color nodes" and guessed Everything from its count of 115. The panel line
   "Everything styles all 115 nodes: it is the base layer, under every other layer." (`05.png`)
   confirmed it only after the click.
5. **The storage notice is worrying next to "Autosave: saved".** Severity 1, kind: wording. Step 3
   (`04.png`): "This browser may clear what it keeps for this site. Save a copy to a file to be
   sure." made the participant "a little nervous about losing work" while the top bar said saved.

Not a program problem: the participant noted that the start took over 3 minutes before the first
screenshot. That time was spent waiting for a free browser slot on the machine, not in the app.

## Repro

None. A scripted walk was not run: all four browser slots were busy with the round's sessions.
No finding here is marked build-defect. The duplicate "Samples" name is already in the answer
key, and the participant's own step 1 shows it: the tool refused `--click "Samples"` as
ambiguous between two controls.
