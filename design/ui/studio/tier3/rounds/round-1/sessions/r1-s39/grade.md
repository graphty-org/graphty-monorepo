Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s39 (task T45 A, persona Grace)

Participant model: claude-opus-5-5 (the participant log records Opus in all 92 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (39 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T45 A asks for `neighbors.csv` brought in, exactly the 8 family ties drawn thick (wider than the
default 8) and red, and every person and every other tie left as they were.

- File in: "Open a file" with neighbors.csv, then Load; the graph reads 16 nodes and 30 edges
  (`03.png`).
- The stack that counts: a new layer, renamed "Family ties", whose Edge tab holds a category card
  `kind` = family. `styles.json`: edge part `layer-1_1`, selector `data.kind` in [family], matched
  8, sets `edge.color` `#FF0000` and `edge.width` 20, painted 8 each. Its node part `layer-1_2`
  sets nothing (painted {}), so no node value: the people are untouched.
- Everything else unchanged: Everything's edge part still sets darkgrey at width 8 and paints the
  other 22 ties; its node part still sets `#6366F1` on all 16 nodes. `key.json` draws 16 nodes
  `#6366f1`, 8 edges `#ff0000` and 22 edges `#a9a9a9`.
- Final screen (`18.png`): eight red ties visibly thicker than the gray ones, the key "Edge color:
  Family ties, 8 of 30 edges", the layer panel "Edge layer", "kind: family, 8 edges", Color
  FF0000, Width 20, "Nodes: not styled". The participant's "done" matches the screen.

## Steps

17 steps from `01.png` against the key's 16 (steps 2-18): Open a file with the file (2), Load
(3), "+" (4), Layer (5), rename to "Family ties" (6, an extra step, not a wrong turn), Edge tab
(7), Which edges (8), Add a condition (9), `kind` (10), tick family (11), Done (12), Line "+" (13),
Color (14), type FF0000 and Enter (15), Line "+" (16), Width (17), type 20 and Enter (18). Color
before Width only swaps the key's order. No wrong turns.

## Problems

1. Severity 2, behavior. The Width box opens with `8` selected, no unit and no word that 8 is
   what every tie already draws at, and the red ties look no thicker than before; the participant
   could not tell whether 8 was today's width or had not applied, and guessed 20 (step 17,
   `17.png`). The key records this default as known; nothing on screen explains it.
2. Severity 1, wording. A just-made layer reads "Node and edge layer" and opens on its Node tab
   with "Style nodes" ticked and "16 of 16 nodes", which made a participant who wanted only ties
   worry that the people would change; it reads "Edge layer" and "Node not styled" only after an
   edge condition is added (step 6, `06.png`; step 11, `11.png`).
3. Severity 1, wording. The way to start a rule for some ties is the item "Layer" behind a small
   "+" beside "Style layers"; the participant would not have guessed that word for "a rule for
   some lines" and found it only by trying (steps 4-5, `04.png`, `05.png`).

No build defect: everything seen matches what the answer key says this build does, so no repro
was scripted.
