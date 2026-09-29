# Session: "Find Javert and walk his neighbours, keyboard only" -- Emma, network scientist

Participant: Emma, 41, network scientist and consultant. Lives in Jupyter (networkx, igraph),
uses Gephi for the final figure. Keyboard-first by habit; presses Tab, "?" and Ctrl+K within the
first minute of any new tool. Second time she has seen the keyboard walk.

Task as given by the moderator: "Using only the keyboard, find Javert, walk to his most connected
neighbour and back, and select two of his neighbours."

Screens used: the keyboard walk (a live mock; every step below is a real key press on it), the
Find screen (a set of still states), and the inspector as the walk shows it. The pictures named
below are what was on screen at that moment, in `shots/`.

## Think-aloud transcript

**Arriving.** (r3-emma-shiftarrow-01-arrive.png)

"Javert. Les Miserables, the co-appearance network. Fine, everybody's first graph. ... Except
this is not Les Mis. 'Protein interactions, 33 of 300.' TP53 in the middle, UBC, BRCA1. There is
no Javert on this screen. Let me not assume, I will search for him."

"Ctrl+K. ... Nothing. Nothing has focus yet, so the page ate it -- in real Firefox that would
have opened the browser's own search bar. OK, Tab."

**Tabbing in.** (r3-emma-shiftarrow-02-canvas.png)

"Tab: the prototype's own links at the top, ignore. Then 'Skip to the graph drawing. F6 moves
between regions.' Good, I remember that from last time. I was curious, so I kept pressing Tab
instead of taking the skip link: main menu, five rail buttons, the filter chip, Find, Add, the
graph, three more Adds, a style, the toolbar -- seventeen Tabs to reach the drawing. Nobody will
do that; the skip link is doing the real work. Still, it tells me the skip link cannot be
optional."

"Canvas has a blue border. The strip at the bottom says 'The walk starts at TP53. Shift+Arrow:
next neighbor. Space: select. Question mark: keys.' Again it starts on the biggest hub without
telling me that is why."

**Ctrl+K "Javert".** (r3-emma-shiftarrow-03-quick-javert.png)

"Ctrl+K works now. Type 'Javert'. 'No commands or nodes match Javert. This mock lists the
selection and set commands only.' So: Javert is not in this graph, which I knew, and the search
only matches an exact node name, which I did not know. If I had typed 'tp5' would it find TP53?
The Find screen suggests partial matching; this box looks like exact name only. For a
command palette that is acceptable. For finding a node, typing the whole id is a bit much."

"The moderator also listed a Find screen, let me look there." (screens__find.png)

"There he is. Les Miserables, 27 of 77 nodes, Javert in the table: degree 10 in the filtered
graph, 17 in the full graph. Nice -- that is exactly the two-column degree I asked for last time.
But this screen is pictures. There is no walk here; I cannot press Shift+Down on it. And the walk
screen, which does have the keys, has the protein graph and a single 'degree' column with no
word about which graph it counts. Two screens of the same product disagree about how to label
degree. Somebody should pick the Find screen's way."

"So I cannot do the task as asked. I'll do the same thing on TP53, which is the protein graph's
Javert as far as the keys are concerned: find it, go to its most connected neighbour, come back,
select two neighbours. Tell me if that is not what you want." (Moderator: no reply, as
instructed.) "Right."

**"?" first.** (r3-emma-shiftarrow-04-keys.png)

"Same sheet as before. Arrows move the view. Shift+Down starts the walk; Shift+Right and Left
step through neighbours; Shift+Down again goes into this node's neighbours; Shift+Enter back one
step, Shift+Up too; Shift+Home back to the start; O cycles the order. Space selects. Esc ends the
walk. That is all I need and it fits in one read. Esc."

**Shift+Down.** (r3-emma-shiftarrow-05-first-step.png)

"PALB2, 1 of 32 from TP53, weight 0.98, degree 5. Ordered by weight, the confidence. Right, I
remember -- default order is edge weight. Not what I want. O."

**O: by degree.** (r3-emma-shiftarrow-06-by-degree.png)

"UBC, 1 of 32, degree 21, rank 7 of 300. The segmented control under the card now says Degree.
One key, and the most connected neighbour is on top. That is the right design: I do not have to
hunt, I reorder. Ubiquitin, of course -- the sticky hub. It answers the question as asked."

**Shift+Down: a step too far, by accident.** (r3-emma-shiftarrow-07-into-ubc.png)

"Now 'walk to' him. I thought I was already on UBC -- the ring is on UBC -- but my fingers
pressed Shift+Down again, the way you would go into a folder. And the ring jumped back to TP53.
'TP53, 1 of 3 from UBC, in filtered graph.' Wait. Did I go back or forward?"

"... Forward. I am now among UBC's neighbours, and the first one, by degree, is TP53 itself,
because TP53 is the biggest thing UBC touches. The screen reader line says 'where you came from';
the card on screen does not. On screen, going one step deeper looks exactly like going back.
That is the one moment in this session where I was actually lost for a few seconds. The card
needs 'where you came from' printed, or the edge I walked in on drawn."

"And '1 of 3 from UBC, in filtered graph' while UBC's degree is 21. Three here, twenty-one in the
whole graph. It says 'in filtered graph', good, it is honest. But look at the card for TP53 now:
'Degree 32, rank 2 of 300' -- that 32 is whole-graph, and the '3' two words earlier is
filtered. Two different degrees in one line and only one of them labelled."

**Shift+Enter, twice: back.** (r3-emma-shiftarrow-08-back-at-start.png)

"Shift+Enter. 'Back to UBC, neighbor 1 of 32 of TP53.' Shift+Enter. 'Start, TP53.' That is 'and
back' done. Shift+Enter is an odd key for back -- in every file tree I have used it is Left or
Backspace -- but Shift+Up also works and that is what I would reach for. Fine."

"One thing I like: when I came back, it remembered I had the order on degree. It did not reset
to weight."

**Select two neighbours.** (r3-emma-shiftarrow-09-two-selected.png)

"Shift+Down: UBC. Space: 'UBC added. 1 selected on canvas. ] and [ step through the selection.'
Shift+Right: RPS8, 2 of 32, degree 17. Space: 'RPS8 added. 2 selected on canvas.'"

"Right panel: '2 selected', module Mixed, degree Mixed, and a list, 'UBC 21, RPS8 17'. The
numbers are unlabelled. I know they are degree because I just read them in the card, but a list
of names with a bare number next to them is exactly the kind of thing a junior copies into a
slide without knowing what the number is. Put the column name on it."

"On the drawing: UBC has a heavy black ring, RPS8 has a double ring because it is selected and
also where I am. Distinguishable, just. The table rows for both are tinted. Good -- same
selection everywhere."

**Esc.** (r3-emma-shiftarrow-10-ended.png)

"'Walk ended at RPS8. 2 selected on canvas.' Selection kept. The second Esc would clear it; the
sheet said so. Done."

## After the task

**Single Ease Question: 5 of 7.**

"The walking itself is a 6. Once I was on the canvas it took nine key presses, and the only
real stumble was that going deeper and going back look the same on screen. I took a point off
because I could not do the task you gave me: Javert is on one screen and the keys are on another.
If that happens in the real product -- if Find and the walk are not the same thing -- that is a
much bigger problem than a label."

**Would she use it instead of her current tool?**

"For this job, yes -- there is no current tool. Gephi has no keyboard walk at all; in networkx I
would type `sorted(G['TP53'], key=G.degree, reverse=True)[:2]` and never see anything. This is
the first time a GUI has done something my notebook cannot do quickly, which is let me look
around a node and pick things with my hands on the keys. The reorder key is the good idea."

"But I would not hand this to a biologist yet. The degree on screen is sometimes the filtered
graph and sometimes the whole graph, and only one of them is labelled. Fix the labels, make
Ctrl+K find a node by partial name, and show me where I came from on the drawing, and I would
use it for real."

## Problems observed

1. The task named a node (Javert, Les Miserables) that exists only on the Find screen; the keyboard
   walk runs on the protein interaction graph. The task could not be done as asked. (Severity 3;
   partly the study set-up, but it also shows Find and the walk are separate in the mocks.)
2. Shift+Down from a neighbour steps into that neighbour's neighbours, and the first one (by
   degree) is the node you came from, so on screen it looks like going back. The screen reader
   says "where you came from"; the card does not. (Severity 3)
3. Degree is whole-graph in one place and filtered in another on the same card ("1 of 3 from
   UBC, in filtered graph" next to "Degree 32"), and the walk screen's table has one unlabelled
   degree column while the Find screen already shows filtered and full degree side by side.
   (Severity 2)
4. The inspector's selection list shows a bare number beside each node (UBC 21, RPS8 17) with no
   column name. (Severity 2)
5. Ctrl+K matches a node only by its exact full name. (Severity 2)
6. Ctrl+K does nothing until something on the page has focus; in a real browser it would open
   the browser's own search. (Severity 1)
7. The walk starts on the highest-degree node without saying why. (Severity 1)
