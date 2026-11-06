# Grade: session r1-s14 (task T74B, Maren)

Grade: P
False done: no
Wrong turns: 0
Steps: 11 (from `route.jsonl`; the answer key's path for T74 B is 13, so 2 under)
Overwhelm: 3 (least sure: screenshot 11, right after the hex was typed -- the key showed "Color: 3 nodes" above "Color: Betweenness" 0-25, the canvas still read as all orange-to-brown, and nothing said the Betweenness layer was also coloring nodes; this is the Fill color and the drawing, not the selection editor. Second: the Fill color box gave a text cursor and no swatches)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 33 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 12 and the end-state records hold the right three gauges, made the way the answer key
grades as not success:

- Style layer "3 nodes", above Betweenness, count 3. `styles.json`: selector `match: "ids"` with
  G02, G03, G04 (Mill Pond, Cedar Bend, Fox Creek -- the key's three) and `node.color` #FFA500
  (orange). The layer's source is the person's hand pick ("Picked by hand: 3 nodes", screenshot
  11), not a "Betweenness top 3" step.
- The Betweenness run is kept (`work.json`: run "betweenness"), and its suggested layer is hidden,
  not removed (`styles.json`: `hidden: true`, painting 0).
- The canvas key reads "Color: 3 nodes, 3 of 11 nodes"; `key.json` counts 3 nodes drawn #ffa500
  and the other 8 in the default #6366f1. No filter; 11 of 11 nodes visible.
- Reported: Cedar Bend (25), Fox Creek (24), Mill Pond (21), with Upper Falls (16) next. All
  right, and the screen shows exactly those three in orange, so the claim is not a false "done".

Why P and not S: the answer key's "Not success" list names this exact route for T74 -- "the table
sorted and nodes selected by hand (no layer selection)". The layer is a fixed list of ids; it does
not say or follow "the top 3 by Betweenness" if the data or the run changes. The colors and the
names are right, so this is part of the task (criteria "P"), not a failure or a give-up.

## Path and wrong turns

Analyze (step 1), Betweenness (2), Run (3: the suggested layer colors all 11 on a 0-25 ramp),
drag the table's scrollbar right to the new column (4), sort by Betweenness (5), click Cedar Bend
and shift-click Mill Pond in the table (6: "3 nodes selected"), the Style tab (7), Add to node
fill (8), click the color box (9), type #FFA500 and Enter (10: "Made a layer for the 3 selected
nodes"), hide Betweenness with its eye and click empty canvas (11).

- Wrong turns: 0. Every step moved forward; nothing was closed empty, undone or removed. The
  route left the key's path at step 4 (the table rather than + > Layer > Which nodes), but it was
  never taken back, so by the definition it is not a wrong turn; it is why the grade is P.
- One `--step` was refused by the tool before it ran (a step name the tool does not have,
  `--shift-click-at`); the participant retried by name. No app step, no wrong turn.

## Follow-up

Present in the transcript. Rating 3. Least sure: screenshot 11, after typing FFA500. The toast and
the panel said the layer was made, but the network still looked all orange and brown because the
Betweenness ramp painted every gauge; the key showed "Color: 3 nodes" and "Color: Betweenness"
0-25, the layer list showed "3 nodes" above "Betweenness", both with eyes. The participant could
not tell whether the color had worked or been swallowed, and worked out from the layer list to
hide Betweenness. A smaller wobble: the color box gave only a text cursor, no swatches.

## Problems

1. Severity 2, behavior. The selection-first route (table sort, select rows, Style tab, Fill)
   makes a layer of fixed ids with nothing on the way pointing at a measure-based "which nodes"
   ("Betweenness top 3"). A reader asked for "the top three by a measure" ends with a hand pick
   that will not follow the data. Evidence: steps 5 to 10, screenshots 06 to 11 ("Picked by
   hand: 3 nodes"); `styles.json` `match: "ids"`. Same route graded P in r1-s11 (T73 A).
2. Severity 2, behavior. A new layer's color inside the color range of a lower encoding layer
   leaves the canvas looking unchanged: #FFA500 on 3 nodes sits inside Betweenness's
   orange-to-brown ramp, and only hiding Betweenness showed the result. Evidence: step 10,
   screenshot 11 (key "3 nodes covered by 3 nodes"), step 11, screenshot 12; the follow-up's
   least-sure moment. Also r1-s01 (T70 A, PageRank ramp).
3. Severity 2, behavior. Clicking the empty Fill color box gives only a text cursor, no swatches
   or picker, so a reader who does not know hex has no way forward from the box itself. Evidence:
   step 9, screenshot 10. Also r1-s11. The Fill color box, not the selection editor.
4. Severity 1, wording. The Betweenness card does not say whether the run followed edge direction
   on a directed network, and its only control is an icon-only gear (named "Advanced" for
   assistive tech, unlabeled on screen). Evidence: step 2, screenshot 03; the header reads
   "Directed" (screenshot 06).
5. Severity 1, wording. The Betweenness value has no stated meaning or unit in the table or the
   card (is 25 a count of pairs?), so the reader can rank but not describe the number. Evidence:
   screenshots 05 and 06.
6. Severity 1, behavior. With the node table open at 1440 x 900 only 10 of 11 rows fit, so the
   reader sorted to be sure the top one was in view. Evidence: step 4, screenshot 05.
