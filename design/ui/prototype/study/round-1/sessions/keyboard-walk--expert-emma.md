# Keyboard walk -- Expert Emma (network scientist, keyboard-first, sighted)

**Task as given by the moderator:** "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

**Screens used:** the keyboard walk mock (protein interactions, 33 of 300 nodes shown), with the
inspector and the nodes table that sit inside it. The inspector and bottom-table mocks were
opened for reference only; they show other datasets.

**Outcome:** finished, with difficulty. Answered "UBC, degree 21 (rank 7 of 300)", with an
objection about which score and which degree. Ended with RPL14 and NDUFS7 selected, after
replacing the selection twice by accident.

**Single Ease Question:** 3 of 7.

---

## Think-aloud transcript

**Moderator:** Without the mouse, start at TP53, find its best-connected neighbour, tell me
that neighbour's score, and select two of its neighbours.

**Emma:** "Best-connected" -- I am going to read that as highest degree, because that is what it
means to everyone I work with. If you meant strongest edge, you should have said strongest edge.
And "score" -- which score? I will tell you what I find.

*(Looks at the page with nothing focused.)*

**Emma:** OK. Left panel, a drawing, an inspector on the right, and a table under the drawing.
The table is the first thing I trust. "Filtered graph: 33 of 300 nodes. Sorted by degree." TP53
at the top, degree 32. 33 nodes, TP53 has degree 32 -- so this slice is TP53 and its
neighbours. Its ego network, presumably. UBC is second, 21. So I already know the answer,
honestly. But you said start at TP53 and do it with the keyboard, so let me do it your way.

*(Presses Ctrl+K.)*

**Emma:** Ctrl-K, command palette, good, it exists. Typing "TP53"...
"No commands match." Hm. "This mock lists the selection and set commands only." Fine, I will
take that as a prototype gap, but in the real thing Ctrl-K has to find a node by name. That is
the first thing I would type in it. *(Esc.)*

*(Presses "/" -- nothing happens. Presses "?" -- nothing happens.)*

**Emma:** No slash for search, no question mark for a shortcut sheet. OK. Tab, then.

*(Tabs: rail, graphs list, styles list, Export, inspector, the help button, the toolbar...
the eighth Tab puts a blue ring round the whole drawing.)*

**Emma:** Eight Tabs to get to the graph. In a graph app. The graph should be one or two away,
not behind the style list. The strip at the top says "Graph drawing, application... Shift+Arrow
walks the graph" -- but you told me that strip is what a screen reader says, not the screen. On
the actual screen there is a blue border and nothing else. No hint. If the strip were not here
I would be pressing random keys now.

*(Presses the Down arrow.)*

**Emma:** The drawing moved up. Arrows pan. Fine, reasonable, but nothing on screen told me
that either. The strip says "View moved. Shift+Arrow walks the graph." So Shift-Down.

*(Presses Shift+Down. A pill appears above the toolbar: "PALB2 1 of 32 from TP53, Shift+Up
back". PALB2 gets a black and white ring.)*

**Emma:** PALB2? PALB2 is not the best-connected thing here, it is a small node. "1 of 32 from
TP53" -- 1 of 32 by what? The pill does not say. The strip says "by confidence 0.98". So the
walk orders neighbours by edge weight. That is defensible -- strongest interaction first -- but
it is not written anywhere a sighted person can see it, and it is not what I asked for. I want
to sort that list by degree, or at least see what it is sorted by.

**Emma:** And where is PALB2's degree? The pill has the name and the position. The inspector on
the right still says "Protein interactions, Graph, 33 of 300". So the inspector does not follow
the node I am on. Only the screen reader gets the degree. As a sighted keyboard user I get less
information than a blind one. That is backwards.

*(Presses Shift+Right several times, reading the strip each time: RPA1 0.95, RAD51 0.87, RPA2
0.86, FANCD2 0.84, LTBP1 0.83, MSH2 0.82, then "UBC, 8 of 32, 0.80. Degree 21, rank 7 of 300.")*

**Emma:** There, UBC, 8 of 32, and the strip says degree 21. I only know that because I am
reading the screen-reader line. To find the maximum degree this way I would have to visit all 32
and remember them. Nobody does that. That is what a sorted table is for. I am going to the
table.

*(Presses Tab. The walk ends; focus lands in the table on the TP53 row, not UBC.)*

**Emma:** It dropped me on TP53, not on UBC, the node I was standing on. I was on UBC a second
ago. Down arrow... UBC row. Fine. UBC, Unassigned, degree 21, degree rank 7.

*(Presses Enter. UBC is selected; the inspector now shows UBC, degree 21, "#7 of 300".)*

**Emma:** Good, Enter selects, the inspector shows it with a rank. That is the kind of thing I
like -- a rank with a denominator.

**Emma:** Now, the "score". Two problems. First, "score" does not appear anywhere. The only
numbers on UBC are degree 21 and, in the screen-reader line only, the edge confidence 0.80 to
TP53. Degree is a count, not a score. If you want a score, run PageRank and give me a column.
Second, and this matters more: the drawing shows UBC with three edges -- TP53, RPL14, NDUFS7.
The table heading says "Filtered graph", and the degree column says 21. So 21 is the degree in
the full 300-node graph, not in the filtered one. The rank "of 300" hints at that, but the
header "Filtered graph: 33 of 300" right above it says the opposite. Which graph was this
computed on? That needs to be written on the column. I would put "degree (full graph)" or give
me both. If a junior copied 21 into a report as the degree in this subnetwork, that is wrong.

**Moderator:** So what is your answer?

**Emma:** UBC. Degree 21 in the full graph, rank 7 of 300, and 3 in this slice. Edge confidence
to TP53 is 0.80, if that is your "score". Now two of its neighbours.

*(Presses Shift+Tab; back on the drawing, blue ring. Presses Shift+Down.)*

**Emma:** Oh -- it started from UBC, the one I selected, not from TP53. "TP53, 1 of 3 from
UBC". Good. That is actually right: walk from what I have selected. Neighbours of UBC: TP53,
then...

*(Shift+Right: "RPL14, 2 of 3 from UBC". Presses Enter.)*

**Emma:** Enter to pick it. Inspector says RPL14. Hm, and UBC is no longer selected. OK, Enter
replaces. Fine, I did not want UBC in the selection anyway. Next one.

*(Shift+Right: "NDUFS7, 3 of 3 from UBC". Presses Enter.)*

**Emma:** ...and now the inspector says NDUFS7 alone. RPL14 is gone. Right, Enter replaces,
I just learned that and did it again anyway. How do I add? In a file manager it is Ctrl or
Shift plus the thing. Shift-Enter.

*(Presses Shift+Enter. The pill now says "UBC, start of the walk"; focus jumps back to UBC.)*

**Emma:** No. Shift-Enter took me back up to UBC. That is the "go back" key? Shift-Up is go
back, the pill says so. Why does Shift-Enter also mean go back? That is a trap. OK. Shift-Down
again...

*(Shift+Down: "NDUFS7, 3 of 3 from UBC" -- it remembered where she was. Shift+Left: RPL14.)*

**Emma:** At least it remembered my place. Now -- Space. Space is the toggle in every list I
have ever used.

*(Presses Space. The strip says "RPL14 added. 2 selected on canvas. ] and [ step through the
selection." The inspector says "2 selected", Selection 2: NDUFS7 9, RPL14 7.)*

**Emma:** There. Two selected, NDUFS7 and RPL14, degrees 9 and 7, and the inspector lists them.
Done. Space adds, Enter replaces. That is a fine convention -- once you know it. Nothing on the
screen told me. The first time the product mentions Space is after I have already pressed it.

*(Checks the table: both rows are marked selected.)*

**Emma:** And the table agrees with the drawing. Good. That I care about.

---

## Debrief

**Moderator:** On a scale of 1 to 7, how easy was that?

**Emma:** Three. The ending was fine. The middle was guessing. I got there because I read the
screen-reader line, which you told me is not part of the screen. Take that line away and I
would have panned the view around, pressed Enter on everything and asked you what the keys are.

**Moderator:** Would you use this instead of what you use now?

**Emma:** For this task? What I use now is `max(G['TP53'], key=G.degree)` in the notebook, one line, and it tells me which degree it used
because I built the graph. So no, not instead. But that is not the fair comparison. The fair one
is: can I hand this to a biologist who does not code and have them walk out from a protein with
the keyboard and pick things. Nearly. What I would need: the walk pill shows the focused node's
degree and what the neighbours are sorted by, and lets me sort by degree; Ctrl-K finds a node by
name; a visible key sheet on "?"; and the degree column says which graph it was computed on. The
table next to the drawing, the rank with a denominator, the selection staying in step between
table, drawing and inspector, and the walk starting from my selection -- those are right. I
would not have bet on a web tool getting those right.

---

## Problems observed

| Where | What happened | Frustration (1-4) |
|---|---|---|
| Walk position pill | Neighbours are ordered by edge confidence, but nothing visible says so; "1 of 32" has no "by what". "Best-connected" (highest degree) cannot be found by walking without visiting all 32. | 3 |
| Walk position pill and inspector | While walking, the focused node's degree and edge weight are only spoken to a screen reader. The pill shows name and position; the inspector stays on the selection. A sighted keyboard user sees less than a screen-reader user. | 3 |
| Nodes table, degree column | Heading says "Filtered graph: 33 of 300", but degree is the full-graph degree (UBC shows 21 with 3 edges drawn). The column does not say which graph it was computed on. | 3 |
| Drawing, first focus | No visible key hint on the focused drawing; arrows pan silently; the Shift+Arrow walk is discoverable only from the screen-reader line. No "?" shortcut sheet, no "/" search. | 3 |
| Walk keys | Enter replaces the selection, Space adds; Space is never shown until after first use. Shift+Enter is a second "go back" key and threw her out to the start of the walk when she guessed it meant "add". | 3 |
| Quick actions (Ctrl+K) | Cannot find a node by name ("TP53": no commands match). Marked as a mock limit, but it was her first move. | 2 |
| Tab order | Eight Tab presses to reach the drawing; F6 exists but is not shown anywhere. | 2 |
| Tab from walk to table | Focus lands on the first row (TP53), not on the node the walk was on (UBC). | 2 |
| Task wording vs product | "Score" matches nothing on screen; the only candidates are degree (a count) and edge confidence (spoken only). | 2 |

## What worked for her

- The table beside the drawing, sorted by degree, answered the question in one glance.
- Rank with a denominator ("#7 of 300") in the inspector and table.
- The walk starts from the current selection, and Shift+Down returns to the last position.
- Table, drawing and inspector show the same selection at all times.
