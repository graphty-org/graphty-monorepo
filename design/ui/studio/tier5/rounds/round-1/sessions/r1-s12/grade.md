# Grade: session r1-s12 (task T73B, Alex, returning)

Grade: P
False done: no
Wrong turns: 1
Steps: 10 (from `route.jsonl`; the answer key's path for T73 B is 12, so 2 under)
Overwhelm: 3 -- none (the node table) -- "right after I right-clicked the Cedar Bend row in the node table and nothing happened (screenshot 02) ... No menu, no hint of where a 'neighbors within N steps' option might live"; a smaller wobble when the Neighborhood panel header read "G03" instead of "Cedar Bend"
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 28 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean

## The last screen and the records

Screenshot 11 and the end-state records hold the right set, made the way the answer key grades as
part of the task:

- Style layer "7 nodes", count 7. `styles.json`: selector `match: "ids"` with G01, G02, G03, G04,
  G05, G08 and G11 -- exactly the key's 7 of 11, both directions -- and `node.color` #FF8C00
  (orange).
- The canvas key reads "Color: 7 nodes, 7 of 11 nodes"; `key.json` counts 7 nodes drawn #ff8c00
  and 4 in the default #6366f1.
- Reported: 7 gauges in orange, named (Cedar Bend, Fox Creek, Heron Marsh, Mill Pond, Old Bridge,
  Quarry Pool, Upper Falls). The count is right and the screen shows it, so the claim is not a
  false "done".

Why P and not S: the answer key's "Not success" list for T73 names this route -- Neighborhood at 2
hops, then New layer from selection ("Picked by hand: 7 nodes") -- as P. The layer is a fixed list
of ids; it does not hold "within 2 hops of Cedar Bend" as a rule, and the participant noticed it
himself in the wrap-up ("if the river data changes next month it won't redo the two-hop pick").

## Path and wrong turns

Right-click the Cedar Bend row in the node table (step 2, nothing opened), click the row (3), Node
actions "..." (4), Neighborhood (5, "Cedar Bend and 3 connections", Follow All), Hops 2 (6, "Cedar
Bend and 6 connections"), Neighborhood actions "..." (7), New layer from selection (8), Add to
node fill (9), click the color box, type #FF8C00, Enter (10). Step 11 (click empty canvas to clear
the selection) is a check after the end state and is not counted.

- Wrong turns: 1. Step 2's right-click on a table row opened nothing and was abandoned for a
  left-click: a place the task does not need, taken back.
- The route never touched the answer key's path (+ > Layer > Which nodes > "within"); it was never
  taken back, so it is not a wrong turn; it is why the grade is P.

## Follow-up

Present in the transcript. Rating 3. Least sure: after the right-click on the Cedar Bend table row
did nothing (screenshot 02) -- the plain graph, the node table, the style layer list and the right
panel, with no hint where a "neighbors within N steps" option lives; the Neighborhood command was
then found only behind the small "..." in the right panel. The element named is the node table and
the inspector's actions menu, not the selection editor, so it goes to the backlog, not bar 9.

## Problems

1. Severity 2, behavior. The route a person finds first for "within N hops of X" (the node's
   Neighborhood, then New layer from selection) makes a hand-picked id list, not a hops rule, and
   nothing on the way points to the layer editor's "Within hops of" step. The participant reached
   the right count and still ended at P; he noted the layer would not follow data changes.
   Evidence: steps 5-8, screenshots 05-08 and 11; the answer key names the same route as P (also
   r1-s11, T73 A).
2. Severity 2, behavior. Right-clicking a node's row in the node table opens nothing, while a
   right-click on the node in the canvas opens the node menu with Neighborhood; the person who
   starts from the table has no menu and no hint. Evidence: step 2, screenshot 02 (route.jsonl:
   the target was `gridcell "Cedar Bend"`, no menu in the screen list); the follow-up's least-sure
   moment.
3. Severity 1, wording. The Neighborhood panel's header shows the node's raw id "G03" instead of
   its label "Cedar Bend", while the line under it says "Back to Cedar Bend" and "Cedar Bend and 6
   connections"; the participant had to check it was the same gauge. Evidence: steps 5-6,
   screenshots 05 and 06.
4. Severity 1, wording. A layer made from a selection is named "7 nodes", which says nothing of
   what it is for a week later; the participant wanted to name it. Evidence: step 8, screenshot 08;
   the wrap-up.
5. Severity 1, wording. Follow "Out / In / All" on a directed graph gives no hint which way is
   upstream; the participant guessed All covers both. Evidence: step 5, screenshot 05; the wrap-up.

No build defect needed a scripted repro: each problem is visible in the screenshots and
`route.jsonl`. The study tool refused nothing (no FAIL or refusal line in `route.jsonl` or
`session.log`).
