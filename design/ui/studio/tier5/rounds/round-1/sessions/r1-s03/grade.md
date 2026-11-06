# Grade: session r1-s03 (task T70A, Dana, returning)

Grade: S
False done: no
Wrong turns: 0
Steps: 20 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T70 A is 15, so 5 over)
Overwhelm: 3 (least sure: right after typing "orange" in the Fill color box, screenshot 17 -- the key said "Color: Staff, 4 of 15 nodes" and the box said FFA500, but the drawing stayed a field of PageRank orange-brown; this is the Fill color and the drawing, not the selection editor)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 45 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 18 and the end-state records agree with the answer key's A values:

- Top bar: "15 of 24 nodes, 25 of 63 edges". `data.json`: one filter card, on, keeping
  `data.trained` true, count 15 of 24; total nodes 24, so nobody was deleted.
- Style layer "Staff": Which nodes "role staff", "4 of 15"; fill FFA500 (typed as "orange", a
  visible orange). The canvas key reads "Color: Staff, 4 of 15 nodes"; `key.json` counts 4 nodes
  drawn #ffa500.
- The members, read from the matches strip at step 13 (screenshot 13): James Carter, Hannah
  Weiss, Ken Ito, Ben Adler (v02, v09, v17, v21) -- the key's four. Zara Ahmed (staff, untrained)
  is out of the picture.
- Reported: 15 people still in the picture (of 24, the 9 untrained filtered out, not deleted) and
  4 in orange, named. Both counts are right and the screen shows them.

At step 18 the participant hid the PageRank layer with its eye so the orange would stand out. The
layer stays in place, hidden, not deleted; the task's result does not depend on it.

## Path and wrong turns

The participant took the answer key's "also success" order (the filter first, then the layer),
with the same controls: Data, Add filter, `trained`, Value, Yes, Done; Graph, Add a layer or a
folder, Layer, Which nodes, `role`, staff, Done, Add to node fill, color, Enter. Success state
reached at step 17 (the color committed with Enter).

- No wrong turns: every click before the success state stayed on the path or was an equivalent
  extra step.
- The 5 extra steps: the Graph tab after Data (1), naming the layer "Staff" and Enter (2), a click
  into the already-focused color box (1), hiding PageRank after the success state (1).

## Follow-up

Present in the transcript. Rating 3. Least sure: after committing "orange" (screenshot 17) the
four staff could not be told apart from PageRank's orange-brown; nothing on screen said another
layer was competing, so the participant guessed the eye on the PageRank row and was not sure it
would not also hide the people. On the preview (screenshots 12-13): when the picker opened every
dot turned the same green; ticking staff left four solid green and faded eleven to pale lilac,
with the table dropping to the same four names -- read as "these four are the ones this layer will
paint, a preview of who is picked, not the final color", which was clear. The participant would
rather have seen, while picking, how the picture will really look with the layer on top of what is
already there (or a warning that PageRank colors every node), found the green "a little odd" when
the goal was orange, and asked for names on hover over the solid dots.

## Problems

1. Severity 2, behavior. A new layer's color inside a lower layer's color range is lost in the
   drawing. FFA500 sits at the light end of PageRank's orange-to-brown scale, so after step 17 the
   four staff could not be picked out; the participant recovered by guessing to hide PageRank. The
   key did say "4 nodes covered by Staff" under the PageRank entry (screenshot 17), in small gray
   text the participant did not read as the cause. Evidence: steps 17-18, screenshots 17 and 18;
   the answer key's build notes already list this for E4572E (T70 A), and session r1-s01 met the
   same with FF8000. Same element as the least-sure answer (the Fill color and the drawing, not
   the selection editor), so it goes to the backlog, not bar 9.
2. Severity 2, behavior. The selection workspace's preview opens in "Group colors" (picked nodes
   green, the rest faded), so while choosing it does not show how the result will look in the
   real drawing, and after Done the four "sank back" into the orange-brown; the "Styled" switch
   beside it was never touched and nothing says what it would show. Evidence: steps 11-14,
   screenshots 11-14; the follow-up answer. Also reported by r1-s01 on the same half.
3. Severity 1, behavior. A click in the empty Fill color box gives only a text cursor (screenshot
   16); the palette opens only from the small swatch at its left, so the participant had to guess
   that typing a color name works. Evidence: steps 15-16, screenshot 16.
4. Severity 1, accessibility. The canvas key's count line ("4 of 15 nodes", "4 nodes covered by
   Staff") and "Edges: not styled" are drawn in small gray type the participant called hard to
   read; the one line that explained problem 1 is in that type. Evidence: screenshots 17 and 18;
   the wrap-up.
5. Severity 1, behavior. Nothing on screen says whether hiding a colleague's layer with its eye is
   saved into the shared project (Autosave: saved is the only sign); the participant was unsure
   whether the colleague would see PageRank hidden next time. Evidence: step 18, screenshot 18; the
   wrap-up.

No build defect needed a scripted repro: problem 1 is a known build note and the rest are
screenshot-visible. The study tool refused nothing (no FAIL or refusal line in `route.jsonl` or
`session.log`).
