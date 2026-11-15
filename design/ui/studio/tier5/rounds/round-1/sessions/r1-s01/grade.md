# Grade: session r1-s01 (task T70A, Grace, returning)

Grade: S
False done: no
Wrong turns: 1
Steps: 23 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T70 A is 15, so 8 over)
Overwhelm: 3 (least sure: the drawing right after the Fill color was typed -- the key said the color was on 4 nodes, the canvas showed no change; this is the Fill color box and the drawing, not the selection editor)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 45 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 19 and the end-state records agree with the answer key's A values:

- Top bar: "15 of 24 nodes, 25 of 63 edges". `data.json`: one filter card, on, keeping
  `data.trained` true, count 15 of 24; total nodes 24, so nobody was deleted.
- Style layer "Staff": Which nodes "role staff", "4 of 15"; fill #FF8000 (a visible orange).
  `styles.json`: the node layer matches 4, visible 4 of 15. The canvas key reads "Color: Staff,
  4 of 15 nodes"; `key.json` counts 4 nodes drawn #ff8000.
- The members, read from the matches strip at step 14: James Carter, Hannah Weiss, Ken Ito, Ben
  Adler (v02, v09, v17, v21) -- the key's four. Zara Ahmed (staff, untrained) is out of the picture.
- Reported: "15 people are still in the picture; 4 of them are orange", with the 9 untrained
  filtered out and 24 still in the full graph. Both counts are right and the screen shows them.

The participant also hid the PageRank layer with its eye (step 19) so the orange would stand out.
That leaves the earlier layer in place, hidden, not deleted; the task's result does not depend
on it.

## Path and wrong turns

The participant took the answer key's "also success" order (the filter first, then the layer),
with the same controls: Data, Add filter, `trained`, Value, Yes, Done; Graph, Add a layer or a
folder, Layer, Which nodes, `role`, staff, Done, Add to node fill, color. Success state reached at
step 18 (the color committed).

- Wrong turn (1): step 3 opened the node table to read the column names, a place the task does
  not need; it was left behind once the columns were known.
- Not wrong turns: typing a layer name (an equivalent extra step), opening the color picker and
  typing the hex in its box (the key accepts a color from the picker), and hiding PageRank (after
  the success state).

The 8 extra steps: the table (1), the Graph tab after Data (1), naming the layer and Enter (2),
the swatch, a click in the picker's hex box and Control+A before typing (3), hiding PageRank (1).

## Follow-up

Present in the transcript. Rating 3. Least sure: after typing FF8000, the key confirmed "Color:
Staff, 4 of 15 nodes" while the drawing stayed "a sea of orange-to-brown dots" from PageRank; the
participant could not tell whether the color had taken, whether the wrong people were picked, or
whether something needed saving. On the preview: while picking, the four staff stayed solid green
and the other eleven faded, read as "these four are the ones your layer will touch -- a preview
of the pick, not the final colors", which was clear. The participant would rather have seen the
four in the color they would end up, or a warning that another layer already colors the same
nodes; the "Group colors / Styled" switch was never touched and nothing said what "Styled" would
show.

## Problems

1. Severity 2, behavior. A new layer's color that falls inside a lower layer's color range is
   invisible in the drawing, with no sign in the drawing that it is covered or blends in. FF8000
   sits inside PageRank's orange-to-brown scale, so after step 18 the four staff could not be
   picked out; the participant recovered only by guessing to hide PageRank. The key did say "4
   nodes covered by Staff" under the PageRank entry (screenshot 18), but the participant did not
   read it as the cause. Evidence: steps 18-19, screenshots 18 and 19; the build notes already
   list this for E4572E (T70 A). Same element as the follow-up's least-sure moment (the Fill color
   and the drawing, not the selection editor), so it goes to the backlog, not bar 9.
2. Severity 2, behavior. The selection workspace's preview opens in "Group colors" (the picked
   nodes green, the rest faded), so while choosing it gives no hint how the result will look in
   the real drawing; nothing on screen says the "Styled" switch would show that. Evidence: step 14,
   screenshot 14; the follow-up answer.
3. Severity 1, behavior. The color picker's swatches (screenshot 17: violet, two grays, blue,
   yellow, black) hold no orange or red, so a person who does not know a hex code has to drag the
   hue bar. Evidence: step 17, screenshot 17.
4. Severity 1, wording. While the new filter card waits for a value, it and the workspace header
   are titled "trained pick yes or no" (the participant called it "a bit odd"). Evidence: step 5,
   screenshot 05; known in the answer key.

No build defect needed a scripted repro: problem 1 is a known build note and the rest are
screenshot-visible. The study tool refused nothing (no FAIL or refusal line in `route.jsonl`).
