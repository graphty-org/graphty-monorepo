# Grade: session r1-s10 (task T73B, Maren, returning)

Grade: P
False done: no
Wrong turns: 1
Steps: 12 (counted in `tool/steps.mjs` units from `route.jsonl`; the answer key's path for T73 B is 12, so 0 over)
Overwhelm: 2 -- the Fill color box -- after "+" on Fill, an empty Color text box with a link icon and a minus; a click in it opened no picker or swatches, and "orange" was typed as a guess
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 30 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)

## The last screen and the records

Screenshot 12 and the end-state records show the right seven gauges in orange, held by a layer
whose selection is a fixed list, not a rule:

- Style layers: a new layer "7 nodes", count 7, between Pinned and Everything. Selected is 0.
- Canvas key: "Color: 7 nodes", "7 of 11 nodes", swatch orange.
- `key.json`: drawn nodes `#ffa500` 7, `#6366f1` 4. `work.json`: one layer added, `nodes_1 7
  nodes`; no runs, no filters.
- Screenshot 08 (the layer right after it was made): Which nodes "Picked by hand: 7 nodes", "7 of
  11 nodes".
- The seven, from the Neighborhood list in screenshot 06: Cedar Bend, Fox Creek, Heron Marsh, Mill
  Pond, Old Bridge, Quarry Pool, Upper Falls -- the key's G01, G02, G03, G04, G05, G08, G11, with
  Follow on All (the river's direction ignored), as the task asks.
- Reported: "7 gauges in orange", the key's B value.

Why P and not S: the answer key's success is a style layer whose selection is within 2 hops of
Cedar Bend. It names this route by name under "Not success": "a layer made from a canvas selection
(New layer from selection: 'Picked by hand: 7 nodes'; P if the set is right)", and "The node's
right-click Neighborhood ... reaches 7 at 2 hops; a layer made from that selection is the same P".
The set and the color are right; the layer holds no hops rule.

False "done": no. The participant claimed seven orange gauges held by a layer, and the screen and
the records show exactly that. The participant also read "Picked by hand" off the screen and said
it would not follow a change to the network, so nothing was claimed that the screen contradicts.

## Path and wrong turns

The session left the answer key's path (+ > Layer; Which nodes; Within hops of; Cedar Bend; Done;
Fill; hex; Enter) at the start and never returned to it: select Cedar Bend in the table, Node
actions, Neighborhood, Hops 2, Neighborhood actions, New layer from selection, Fill "+", a click in
the color box, "orange", Enter, then a click on empty canvas to clear the selection. The success
state was never reached, so every step counts toward wrong turns.

- 1 wrong turn: step 1, a right-click on Cedar Bend's table cell looking for a neighbors menu
  (screenshot 01 to 02). Nothing opened and the participant abandoned it.
- Not counted: the Neighborhood route itself (taken through, never undone or abandoned; it is the
  route that ends at P), and the canvas click at step 11 (a check after the participant's own end
  state).

## Follow-up

Present in the transcript. Rating 2. Least sure: after "+" on Fill (screenshots 09 and 10), the
Color row was an empty text box with a green focus outline, a link icon and a minus; a click in the
box showed only a cursor, no picker or swatches, and the participant did not know whether it wanted
a hex code, a name, or the link icon, so typed "orange" as a guess (it became FFA500). Close second:
the right-click on the table row gave nothing, and Neighborhood was found only in the small "..."
at the top of the side panel.

## Problems

1. Severity 2, behavior. The route a returning user finds first -- select the center,
   Neighborhood, Hops 2, then "New layer from selection" in the same panel's "..." menu -- turns a
   2-hop neighborhood into a fixed list ("Picked by hand: 7 nodes"), so the layer forgets that it
   meant "within 2 hops of Cedar Bend"; the selection editor's Within hops of step, which keeps the
   rule, was never offered on this route. The task's set is right today and wrong after any change
   to the network. Evidence: steps 4 to 7, screenshots 05 to 08.
2. Severity 2, build-defect. With a label column designated (station), the Neighborhood panel's
   header names the node by its id ("G03", subtitle "Neighborhood") while the line under it reads
   "Back to Cedar Bend" and "Cedar Bend and 6 connections"; the participant double-checked the
   gauge. Evidence: steps 4 and 5, screenshots 05 and 06. Reproduced:
   `repro/r1-s10/` (setup gauges-clean, a click on Cedar Bend's table row, Node actions,
   Neighborhood, Hops 2; screenshot 04 shows "G03").
3. Severity 2, behavior. The Fill color box opens empty, and a click in it opens no picker or
   swatches, only a text cursor; nothing says it takes a hex code or a color name. The participant
   got orange only by guessing that a name would work. This is the element named in the follow-up's
   least-sure answer. Evidence: steps 8 to 10, screenshots 09 and 10.
4. Severity 1, behavior. A right-click on a node's row in the data table opens nothing, though the
   same node's right-click on the canvas has Neighborhood; the participant then had to find the
   small "..." at the top of the side panel. Evidence: step 1, screenshots 01 and 02.
5. Severity 1, wording. A layer made from a selection is named by its count ("7 nodes"), and the
   canvas key repeats it ("Color: 7 nodes"), which says nothing to the crew reading the picture;
   no rename was visible on the path. Evidence: steps 7 and 11, screenshots 08 and 12.

The study tool refused nothing: every step in `route.jsonl` returned code 0 with nothing missed.
