Grade: S
False done: no
Wrong turns: 0

# Grade: r1-s37 (task T45 A, persona Alex)

Participant model: claude-opus-5-5 (the participant log records Opus in all 99 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (41 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Persona note: Alex knows Gephi; this session counts toward T45 but never stands in for the
newcomers.

## Against the success definition

T45 A asks for `neighbors.csv` opened and exactly the 8 family ties drawn thick (wider than the 8
they start at) and red, with every person and every other tie unchanged.

- File: opened from the start page's "Open a file", Load; 16 nodes, 30 edges (`03.png`).
- Layer "Family ties" (`styles.json`): its edge part (`layer-1_1`) has the selector `data.kind` in
  categories `["family"]`, matched 8, and sets `edge.color` `#FF0000` and `edge.width` 30, both
  painted on 8. Its node part (`layer-1_2`) matches everything but sets nothing (painted `{}`), so
  no person is changed. This is the stack that counts for S.
- Everything keeps its gray (`darkgrey`) and width 8, painting 22 ties; Everything's node part
  keeps `#6366F1` on all 16 nodes. `key.json` draws nodes `#6366f1` x16 and edges `#ff0000` x8,
  `#a9a9a9` x22.
- Final screen (`20.png`): the 8 family ties thick and red, the other 22 thin gray, the people
  unchanged; the panel reads "Edge layer", "kind: family, 8 edges", Color FF0000, Width 30,
  "Nodes: not styled"; the key reads "Edge color: Family ties, 8 of 30 edges". Key, picker count
  and drawing agree.

The participant's "done" matches the screen and the style tree.

## Steps

18 steps against the key's 16, by the success path with Color added before Width (the same count).
Not counted: the start (step 1) and step 7, a click the tool could not resolve (`role=radio:Edge`
matched nothing; a tool event, nothing changed). The two extras: step 6, typing the name "Family
ties" (the name box keeps "Layer 1" on its own, so naming is an extra step, not a wrong turn), and
step 19, Enter on the Width box's prefilled 8, which changed nothing (`19.png`). Neither leads away
from the success state, so no wrong turns.

Edges looked for on the Node tab first: no. The participant read "Style nodes" on the new layer's
Node tab and switched to Edge before adding any condition (steps 5-8). The picker was opened on the
single layer at step 9, unprompted (the prompt says "family ties"; the column `kind` was found in
the attribute list).

## Problems

1. Severity 2, behavior. A just-added Width line arrives holding 8, the width every tie already
   has, selected, with no unit and no sign that 8 is the inherited value; Enter commits it and
   nothing on the drawing changes. The participant could not tell whether the line had applied and
   had to guess a bigger number to see any effect (steps 18-20, `18.png`, `19.png`, `20.png`).
   Confirmed as a design problem by sessions on both T45 halves: r1-s39 (A, "8 of what? ... I'll
   type a bigger number, 20") and r1-s38 (B, "Width came in at 8 and nothing on the picture looked
   any different. 8 of what?").
2. Severity 1, behavior. The key names only the color ("Edge color: Family ties, 8 of 30 edges");
   nothing on it says the ties are also thicker (`20.png`). Also raised on T45 B (r1-s38).
3. Severity 1, wording. A new layer reads "Node and edge layer" and opens on the Node tab with
   "Style nodes" ticked, which made the participant worry it would restyle the people; it became
   "Edge layer" with "Nodes: not styled" only after the edge condition was set (steps 5, 12,
   `05.png`, `12.png`).
4. Severity 1, opinion. About ten clicks (layer, Edge tab, Which edges, Add a condition, column,
   value, Done, Line "+" > Color, Line "+" > Width) for "make these ties red and thick"; the
   participant compared it with Gephi's drag-to-thicken and said a weekly use would feel the
   count.

No build defect found: the behaviors above are what the answer key documents for this build, so no
scripted repro was made.

## What worked

- "It never leaves your computer" on the start page and "Local only" in the top bar answered the
  participant's data question before it was asked (`01.png`, `03.png`).
- The read-the-file preview's counts (16 nodes, 30 edges) matched the loaded graph (`02.png`,
  `03.png`).
- The category card's per-value counts ("family 8 edges") and the "8 of 30 edges" count gave the
  check the participant wanted (`11.png`, `12.png`).
- Typing a hex value in the Color box worked at once, and the key appeared with the layer's own
  name (`16.png`).
