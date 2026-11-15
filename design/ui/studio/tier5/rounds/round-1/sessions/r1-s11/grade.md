# Grade: session r1-s11 (task T73A, Dana, returning)

Grade: P
False done: no
Wrong turns: 0
Steps: 11 (from `route.jsonl`; the answer key's path for T73 A is 12, so 1 under)
Overwhelm: 3 (least sure: the empty Fill color box of the new layer, screenshot 10 -- clicking "Node color, not set" gave a text cursor and no swatches or hint of what to type; second, the start screen already colored orange to brown by PageRank)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 31 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 12 and the end-state records hold the right set, made the way the answer key grades as
part of the task:

- Style layer "16 nodes", above PageRank, count 16. `styles.json`: selector `match: "ids"` with
  v01-v10, v13-v17 and v21 -- exactly the key's 16 of 24 -- and `node.color` #FFA500 (orange).
  The layer's source is the person's hand pick ("Picked by hand: 16 nodes" at step 8), not a
  "Within 2 hops of v02" step.
- The canvas key reads "Color: 16 nodes, 16 of 24 nodes"; `key.json` counts 16 nodes drawn
  #ffa500 and the other 8 in PageRank's orange-brown shades.
- Reported: "16 people are in orange -- James Carter plus 15 within two shifts of him". The count
  is right and the screen shows it, so the claim is not a false "done".

Why P and not S: the answer key's "Not success" list names this exact route -- the node's
right-click Neighborhood, Hops 2, then New layer from selection -- as P ("a layer made from that
selection is the same P"). The layer is a fixed list of ids; it does not say or follow "within 2
hops of James Carter" if the data changes.

## Path and wrong turns

Find box "James Carter" (step 2), click him on the canvas (3), right-click him (4), Neighborhood
(5), Hops 2 (6, "v02 and 15 connections"), right-click a ringed node (7), New layer from selection
(8), Add to node fill (9), click the color box (10), type "orange" and Enter (11), click empty
canvas to clear the selection (12, a check after the end state).

- Wrong turns: 0. Every step moved forward; nothing was closed empty, undone or removed. The
  route left the key's path at step 4 (right-click rather than + > Layer > Which nodes), but it
  was never taken back, so by the definition it is not a wrong turn; it is why the grade is P.

## Problems

1. Severity 2, behavior -- the canvas route to "everyone within 2 hops" ends in a hand-picked id
   list, and nothing on screen offers to keep it as a rule. Step 8, screenshot 08: the toast "Made
   a layer for the 16 selected nodes" and the row "Picked by hand: 16 nodes". The Neighborhood
   panel (screenshot 06) already knows the center and the hop count, yet the layer it hands off
   to forgets both. A person who finds the set this natural way does not learn that "Within hops
   of" exists in Which nodes.
2. Severity 2, behavior -- a just-added Fill color box gives no cue of what it accepts. Step 10,
   screenshot 10: a click on "Node color, not set" shows only a text cursor; no swatch palette,
   no placeholder naming a hex or a color word. The participant guessed "orange" (step 11). Named
   as the least-sure moment in the follow-up.
3. Severity 2, wording -- the canvas key's line "16 nodes covered by 16 nodes" under "Color:
   PageRank" (screenshots 11 and 12) does not say which layer covers which; the participant could
   not read it.
4. Severity 1, wording -- the Neighborhood panel lists neighbors by id (v01, v03-v09), not by
   name, though the find box matched James by his name (screenshot 05). The file designates no
   label, so ids are the default; still the person whose name was searched expects names here.
5. Severity 1, behavior -- the start's PageRank colors already run orange to brown, so the 8
   nodes outside the new layer still look orange-brown (screenshots 01 and 12). The key's counts
   are right; the picture alone is ambiguous. Known in the answer key ("count from the key, not
   the picture").
6. Severity 1, behavior -- the canvas key box at the top left sits over part of the drawing
   (edges run under it in screenshot 12); the participant read it as covering nodes.

No build defect needed a scripted repro: each problem shows in the session's own screenshots.
