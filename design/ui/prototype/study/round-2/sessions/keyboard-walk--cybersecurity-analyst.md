# Session: keyboard walk -- Priya, threat hunter

**Participant.** Priya, a senior threat hunter in a bank's security operations centre. She lives in
Splunk and a Jupyter notebook, has used BloodHound and the Sentinel investigation graph, and leans
on the keyboard late in a shift.

**Task, as the moderator gave it.** "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

**Screens.** The keyboard walk mock (protein interactions, 33 of 300 proteins shown), driven with
real key presses from a fresh load. The inspector and bottom-table mocks were glanced at for what
"score" might mean. The pink strip above the frame is marked "screen reader says, not part of the
screen"; she was told to treat it as the moderator's aside and mostly worked from the pill on the
canvas.

**Result.** Success, with difficulty. She reached UBC (degree 21, rank 7 of 300) and selected
NDUFS7 and RPL14. It took about 20 key presses, most of them Tab, and two wrong turns.

**Single Ease Question:** 4 of 7.

---

## Transcript

**Before starting.** "Protein data. Not my world, fine, a node's a node. Before anything: does this
thing phone home?" She spots the line under the rail icon, "Assistant: Off. Nothing is sent."
"OK. That's the first time a tool has said that without me asking. I'd still want to know where it
runs, but that's a start."

**Getting focus.** "No mouse. Search first." She presses `/`. Nothing. "Ctrl+F." In a real browser
that opens the browser's own find bar. "That's Edge's find, not yours. So there's no search
shortcut. Or there is and it's not `/`."

She starts tabbing. The focus ring goes to the menu button, then down the icon rail: Graph,
Assistant, Results, Notes. Then the "33 of 300" chip, the magnifier and plus beside Graphs, the
graph row, the plus beside Sets and paths, the plus beside Styles, the first style. "I'm eleven
Tabs in and I'm still in the sidebar. Where's the graph?" Next Tab lands on the toolbar ("Tools,
toolbar. Select"). "Close enough, it's on the canvas."

She presses Shift+Down. Nothing happens. Nothing moves, nothing highlights, no message. "...Did
that do anything? No." She presses Tab once more and the whole drawing gets a blue outline. "Ah.
The toolbar floats on the canvas, but it isn't the canvas. That cost me a keypress and some
trust." A pill appears above the toolbar: "Start: TP53, the walk starts here."

"OK, good, it already knows TP53. It picked the biggest node, which is where I'd start anyway."

**Finding the best-connected neighbour.** Shift+Down. The pill now reads "PALB2, 1 of 32 from
TP53. Weight 0.98. Degree 5, rank 247 of 300. Neighbors by: Weight / Degree / Name, O."

"PALB2, degree 5. That's not best-connected, that's the first one by weight. Edge weight is
'confidence', says the right panel. So it's sorted by how sure the edge is, not how connected the
neighbour is. Fine, there's a switch right there with a key on it." She presses O. The pill says
"UBC, 1 of 32 from TP53. Weight 0.80. Degree 21, rank 7 of 300", and the Degree segment is
pressed.

"UBC. Degree 21. That matches the table down there, second row, 21, rank 7. Good, the two agree.
I'm checking that because if the pill and the table disagree I'm done."

Shift+Right once to confirm: "RPS8, 2 of 32, degree 17." Shift+Left back to UBC. "Yeah, UBC is the
top."

**The score.** "Score. What score? There's no column called score. I've got degree and 'degree
rank'. If you mean a centrality score, nothing's been run here, or it isn't shown. I'm answering
degree 21, seventh of 300. If the moderator meant betweenness, this screen can't tell me and I'd
have to go run something." She glances at the separate inspector mock, which shows betweenness and
pagerank for TP53. "That one has betweenness. This one doesn't. So 'score' depends on what someone
ran before me. I'd want the pill to say which measure it's sorting and ranking by. It says
'degree', so, fine, degree."

**Selecting two of UBC's neighbours.** "Pivot into UBC." Shift+Down. The pill reads "TP53, 1 of 3
from UBC, in filtered graph".

"Three? UBC has degree 21. Where are the other eighteen?" Reads the pill again. "'In filtered
graph'. Right, the chip up top says 33 of 300. So 18 of UBC's neighbours are filtered out and I
can't walk to them from here. That's honest, but it's the kind of count mismatch that makes me stop
and do arithmetic. In a hunt I'd want it to say '3 of 21 shown' so I know the other 18 exist."

"And the first neighbour of UBC is TP53. Where I came from. Obviously TP53 is a neighbour of UBC,
but that's not a pivot, that's a round trip. I nearly hit Space on it." (The screen-reader line
says "where you came from"; the pill on screen does not.) "The screen reader gets told it's where I
came from and I don't? Put that on the pill."

Shift+Right: "NDUFS7, 2 of 3, degree 9." Space. A "selected" badge appears in the pill and the
right panel switches from the graph summary to NDUFS7. Shift+Right: "RPL14, 3 of 3, degree 7." Space. The pill says "2 selected on canvas"; the
right panel says "2 selected" and lists NDUFS7 9 and RPL14 7.

"Done. Two selected." She looks at the canvas. "Which ring is 'selected' and which is 'where I
am'? RPL14 has the fat ring, NDUFS7 has a thinner one. I wouldn't bet on it at 2 a.m. The pill and
the panel say it, so I trust those, not the dots."

"And 9 and 7 in that list. Degree, I assume, because they match. No heading on them."

Shift+Right once more: nothing changes on the pill. "Last one, I guess." Esc: the walk ends,
selection kept. Tab goes to the table, which lands on the NDUFS7 row, highlighted, "1 of 2
selected". "Good, it went straight to my selection in the table. That's where I'd want to be next,
to get them out as rows."

**Moderator: "What was the score?"** "UBC, degree 21, rank 7 of 300. If you meant something else
by score, it isn't on this screen."

---

## After the task

**Single Ease Question: 4.** "The walk itself is good. Once I was on the canvas it was fast and it
told me what I was looking at every step, with numbers. Getting there was eleven Tabs of sidebar
plus a dead keypress on the toolbar, and there's no search key. And I had to work out two things
the pill could just say: that TP53 is where I came from, and that UBC has 18 neighbours I can't
see."

**Would she use it instead of her current tool?** "Instead of Splunk and my notebook, no. That's
where the data and the record of what I did live. Instead of the Sentinel investigation graph for
pivoting, maybe. That thing expands one node into two hundred entities in random order. This gives
me one neighbour at a time, sorted by something I chose, with the count and the rank. That's the
first graph pivot I've used that I could do half-asleep without a mouse. But give me a search key
to jump to an entity by name, and let me see which of the neighbours are hidden by the filter,
otherwise I'm going to assume it's hiding things from me."

---

## Problems observed

1. **No fast way to the drawing.** `/` did nothing and Ctrl+F opened the browser's find bar. Eleven
   Tabs through the rail and the left panel before reaching the canvas; nothing on screen mentions
   F6 or any other way to jump between regions until the canvas already has focus. (Severity 3)
2. **Shift+Down on the floating toolbar is silent.** The toolbar sits on the canvas, so focus there
   looks like "on the canvas", but the walk key does nothing and says nothing. (Severity 2)
3. **Default neighbour order is by edge weight, not by connectedness.** The first neighbour was
   PALB2 (degree 5). She found the order switch and the O key on the pill at once, so this cost
   only a moment. (Severity 1)
4. **"Score" has no answer on this screen.** Only degree and rank are shown; nothing says which
   measure "rank" is by beyond the column name, and no computed measure is present. (Severity 2)
5. **"1 of 3 from UBC, in filtered graph" next to degree 21.** The pill does not say how many
   neighbours the filter hides, so the counts look inconsistent until she works it out from the
   "33 of 300" chip. (Severity 2)
6. **The first neighbour after a pivot is the node just left.** The pill does not mark TP53 as
   "where you came from" (only the screen-reader text does), and she nearly selected it.
   (Severity 2)
7. **Selected and focused rings are hard to tell apart on the drawing.** She relied on the pill's
   "selected" badge and the right panel. (Severity 2)
8. **Unlabelled numbers in the right panel's Selection list** (9 and 7, which are degrees).
   (Severity 1)
9. **Nothing visible at the end of the neighbour list.** Shift+Right on the last neighbour left the
   pill unchanged; she guessed it was the end. (Severity 1)

## What worked

- "Assistant: Off. Nothing is sent." on the rail answered a question she always asks first.
- The walk starts at TP53 without being told, and the pill gives name, position ("1 of 32 from
  TP53"), degree, rank and module at every step.
- The order switch with its key is on the pill itself; one press re-sorted by degree.
- The pill, the right panel and the table agreed on every number she checked.
- Tab out of the walk lands on the selected row in the table.
