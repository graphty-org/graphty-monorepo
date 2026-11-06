# Grade: session r1-s29 (task T70A, Sam, keyboard only)

Grade: S
False done: no
Wrong turns: 2
Steps: 89 (in `tool/steps.mjs` units from `route.jsonl`; keyboard-only, so reported apart from the pointer path of 15 in the answer key; the success state was reached at input 82, the last 7 inputs hid the PageRank layer)
Overwhelm: 3 (least sure: after picking Yes in the filter, with focus in the Yes box and Done somewhere unknown in the Tab order)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 110 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`), keyboard-only mode

## The last screen and the records

Screenshot 51 and the end-state records agree with the answer key's A values:

- Top bar: "15 of 24 nodes, 25 of 63 edges" with the filter mark; the table reads "15 of 24 nodes".
- Inspector: layer "Staff", Which nodes "4 of 15", outline row "role staff"; Fill Color FF8000.
- Canvas key: "Color: Staff, 4 of 15 nodes". Four orange nodes on the canvas, eleven blue.
- `work.json`: one filter card, keep `data.trained` = true (the trained stay); no node deleted.
- `styles.json`: node layer `layer-1_2` "Staff", rule keep `data.role` in [staff] within the
  visible graph, set `node.color` #FF8000, matched 4 of 15. The PageRank layer is still there,
  hidden by its eye (not deleted).
- Reported: "15 people are still in the picture ... 4 of those 15 are in orange: James Carter,
  Hannah Weiss, Ken Ito and Ben Adler." Both counts right, and the screen shows both.

`endstate.mjs` reports one item for this session: the PageRank layer "says it selects 24 nodes ...
but the element paints 0". That layer is hidden by the reader's eye (`hidden: true` in the end
tree), so painting nothing is correct; the check does not yet skip a hidden layer. It is not a
product defect and does not change the grade.

## Path and wrong turns

The participant did the filter first (an equal route in the key), then the layer:
toolbar Filters > `trained` > Value... > Yes > Done; Graph > Style layers + > Layer > rename
"Staff" > Which nodes > `role` > tick staff > Done > Fill + > type #ff8000 > Enter. Then, by
choice, hid the colleague's PageRank layer so the orange would stand out.

- Wrong turn 1 (step 39, screenshot 39): ArrowDown did not move between the role checkboxes, so
  Space ticked "volunteer" (9 of 15). Caught from the preview and the count; fixed in step 40.
- Wrong turn 2 (step 21, screenshot 21): Tab from the filter's Yes box jumped to "Local only" in
  the page footer; the way back to Done was 11 Shift+Tabs through the editor and the preview
  table's headers (steps 22-24).
- The rest of the excess is keyboard travel, not detours: 11 inputs to reach the toolbar and read
  the table (steps 1-10), 7 Shift+Tabs from the table back to the toolbar (steps 11-14), 11
  Shift+Tabs again from the role boxes to Done (step 41), and the 7 inputs hiding PageRank.

## Follow-up

Present in the transcript. Rating 3. Least sure: the filter editor after picking Yes (screenshot
20), focus in the Yes box and no idea which way Done lay in the Tab order. On the drawing: while
choosing who goes in orange, the preview lit the ticked people dark green and faded the rest; the
participant took it for "the nodes this layer will paint" and used it to catch the wrong tick. He
would rather it showed the layer's own color against what the other layers paint, so he would have
seen the orange drowning among PageRank's orange-browns before Done.

## Problems

1. Severity 2, accessibility. In the filter and Which nodes workspace, Done sits at the top right
   but comes before the editor in the Tab order; Tab from a value control leaves for the page
   footer ("Local only") and Done is 11 to 12 Shift+Tabs back, through the conditions and the
   preview table's column headers. It happened twice and cost about 23 presses. Evidence: steps
   21-24 (screenshots 21-24), step 41 (screenshot 41).
2. Severity 2, accessibility. In the role checkbox list, ArrowDown does not move focus between the
   boxes, so Space ticked the wrong value. Evidence: steps 38-39, screenshots 38-39.
3. Severity 2, behavior. The colleague's PageRank layer already paints every node orange to brown,
   so a layer filled orange did not stand out, and nothing in the layer or its preview showed the
   new color against the layers it competes with; the participant found out only after Done and
   hid PageRank himself. Evidence: step 44, screenshot 45; the follow-up.
4. Severity 1, opinion. The selection preview draws the picked nodes green while the reader is
   building an orange layer; he paused on it, then read it as a selection highlight. He asked for
   the layer's own color. Evidence: screenshot 39; the follow-up.
5. Severity 1, behavior. After typing in the attribute picker, the picker popover sits over the
   workspace header and covers Done and Cancel. Evidence: step 17, screenshot 17 (also screenshot
   37).
6. Severity 1, accessibility. A layer row's lock and eye buttons are not in the Tab order; they
   are reached by ArrowRight inside the row, which nothing announces. Evidence: steps 47-49,
   screenshots 48-50.
7. Severity 1, accessibility. F6 does not stop at the canvas toolbar (it reaches the canvas, then
   Tab), and the Filters button's tooltip shows no shortcut while Table shows Shift+T. Evidence:
   steps 2-8, screenshots 03-09 and 15.

No build defect needed a scripted repro: every problem is visible in the screenshots. The study
tool refused nothing (every route line has code 0 and no missed input).
