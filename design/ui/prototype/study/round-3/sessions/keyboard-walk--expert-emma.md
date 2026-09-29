# Session: "Walk the graph without the mouse" -- Emma, network scientist

Participant: Emma, 41, network scientist and consultant. Lives in Jupyter (networkx, igraph),
uses Gephi for the final figure and resents it. Keyboard-first by habit; tries "?" and Ctrl-K in
any new tool within the first five minutes.

Task as given by the moderator: "Without the mouse, start at TP53, find its best-connected
neighbour, tell me that neighbour's score, and select two of its neighbours."

Screens used: the keyboard walk on the protein interaction network (33 of 300 nodes shown, the
TP53 neighbourhood), the inspector as it appears when Enter visits a node from the walk, and the
Nodes table docked under the drawing. Every step below was done with key presses on the live
mock; the pictures are what was on screen at that moment.

## Think-aloud transcript

**Arriving. Hands off the trackpad.**

"Right, no mouse. Tab. ... The first few Tabs are the prototype's own bar at the top, that is not
the product, ignore it. Next Tab -- 'Skip to the graph drawing. F6 moves between regions.' Good.
That is the first thing I would want, and it names F6, which is the key I would have guessed
anyway. Enter."

**Canvas focused.** (shots/r3-emma-keyboard-canvas-focused.png)

"Blue border round the drawing, so it has focus. And a little card sitting over the bottom:
'Start: TP53, the walk starts here, nothing selected. Degree 32, rank 2 of 300. Neighbors by
Weight / Degree / Name, O.' Then 'Shift+Arrow: next neighbor. Space: select. ?: keys.'"

"OK, so I did not even have to find TP53 -- it starts on the highest-degree node, which happens
to be TP53. Convenient for the task, but I want to know why it picked TP53 and not something
else. ... The screen-reader strip says 'the walk starts at TP53', no reason given. I am guessing
highest degree, because the table below is sorted by degree and TP53 is the top row. Fine."

"Before I do anything, '?'."

**Key sheet.**

"Proper list. On the canvas: arrows move the view, Shift+Down starts the walk, Enter opens the
inspector. Walking: Shift+Right next neighbour, Shift+Left previous, Shift+Down into this node's
neighbours, Shift+Enter back one step, Shift+Home back to the start, O cycles the order. Space
selects. Esc ends the walk, Tab to the table. 'graphty-element's default keys. Read only.'"

"That is actually a decent sheet. Short, grouped, and it says what order means. I can learn this
in one read. Read-only is fine; I do not rebind keys in a tool I use twice a month. Esc."

**Shift+Down: the first step.** (shots/r3-emma-keyboard-first-step.png)

"Shift+Down. It went to PALB2. 'PALB2, 1 of 32 from TP53. Weight 0.98. Degree 5, rank 247 of
300.' Degree 5 -- that is obviously not the best-connected one. Ah, the order is 'Weight', it is
highlighted. So it is ranking TP53's neighbours by edge confidence, highest first. That is a
defensible default for a PPI network, honestly -- the 0.98 edge is the one a biologist trusts
most. But it is not what I asked for."

"I do not want to press Shift+Right thirty-one times. The card says O. O."

**O: neighbours by degree.** (shots/r3-emma-keyboard-by-degree.png)

"'Neighbors by degree, highest first. UBC, neighbor 1 of 32 of TP53, weight 0.80, degree 21,
rank 7 of 300.' The Degree segment is now the highlighted one. Ring moved to UBC on the left.
Good. One key."

"Ubiquitin. Of course it is UBC. Everything in a PPI network touches ubiquitin. If a biologist
asked me for TP53's 'best-connected' partner and I said UBC, they would roll their eyes -- it is
a hub because it is sticky, not because it tells you anything about p53. But the question was
best-connected, and by degree that is UBC."

"Now -- 'score'. What score? There is no score on this screen. There is a degree, 21, a rank, 7
of 300, and a weight, 0.80, which is the confidence on the TP53-UBC edge, not a property of UBC.
If you mean degree, it is 21. If you mean the edge, 0.80. If you mean betweenness or PageRank,
nothing has been run, and the tool is right not to make one up."

"And which degree is 21? Rank 'of 300', so it is degree in the full 300-node graph, not in this
33-node slice. I only know that because of the denominator. The label just says 'Degree'. In a
filtered view that is the first thing I would want written out: degree in the whole graph, or in
what I am looking at. Those differ a lot for UBC, as I am about to find out."

**Enter: checking it in the inspector.** (shots/r3-emma-keyboard-inspector-visit.png)

"Enter, to see if the inspector agrees. Right panel: 'UBC, not selected, Node.' Attributes:
module Unassigned, degree 21, '#7 of 300'. Same number. Good, consistent. It did not select it,
it says 'not selected' in a little badge, which is what I want -- I was only looking."

"That is thin, though. Module and degree. No weighted degree, no list of its neighbours, not the
edge I came in on. For a hub node I would want strength next to degree. Esc."

"Esc put me back on UBC in the walk, '1 of 32'. It did not throw away where I was. Good."

**Shift+Down into UBC's neighbours.** (shots/r3-emma-keyboard-back-at-hub.png)

"Shift+Down. ... The ring jumped back to the middle. 'TP53, 1 of 3 from UBC, in filtered graph.'
Of course -- sorted by degree, UBC's best-connected neighbour is TP53, where I just came from."

"Two things. One: '1 of 3'. UBC has degree 21 and I can walk to three of them. 'In filtered
graph' -- so eighteen of its partners are not drawn. That is correct and honest, and it is
written down, which is more than Gephi does. But it confirms what I said: the 'Degree 21' on the
card is not a count of anything I can see here."

"Two: I pressed Space before I thought about it."

**Space, then undoing it.**

"'TP53 added. 1 selected on canvas.' Hm. Technically TP53 is a neighbour of UBC, so it counts.
But that is a cheat and the moderator knows it. The strip at the top -- the screen-reader
transcript -- says 'where you came from' on TP53. The card on the canvas does not. If I were not
reading the magenta strip I would not know the walk was pointing me back at my start node,
except that the ring is visibly on the big node in the centre again."

"Space again. 'TP53 removed. Nothing selected on canvas.' Fine, toggle works. Shift+Right."

**Picking two real neighbours.** (shots/r3-emma-keyboard-two-selected.png)

"'NDUFS7, 2 of 3, weight 0.73, degree 9.' Space. 'NDUFS7 added. 1 selected.' Shift+Right.
'RPL14, 3 of 3, weight 0.79, degree 7.' Space. '2 selected on canvas.' Right panel says 2
selected. Done. Shift+Right once more for curiosity -- 'Last neighbor.' It does not wrap. Good,
I prefer that; I know I have seen them all."

"A Complex I subunit and a ribosomal protein, via ubiquitin. That is the hairball problem in two
nodes -- nothing biological connects those except that UBC tags half the proteome. But that is
not the tool's fault."

**Tab out, to see what the table does.**

"Tab. 'Nodes table, filtered graph, 33 rows, sorted by degree.' It landed on the first selected
row. The table and the canvas are the same selection. That is what I would hand to a biologist:
walk, select, Tab, and the rows are there."

**Answer to the moderator.**

"TP53's best-connected neighbour by degree is UBC: degree 21 in the full 300-node network, rank
7. The TP53-UBC edge confidence is 0.80. There is no other score for UBC on the screen. I
selected NDUFS7 and RPL14, two of UBC's three neighbours in this view. The third is TP53 itself,
and I did not count that."

## After the task

**Single Ease Question: 5 of 7.**

"It was easy once I knew O existed, and the card told me about O, so I did not have to go
looking. It loses points for three things. The first step goes by edge weight, so 'best-
connected' is one extra key away and you have to notice the order. 'Degree' does not say which
graph it is counted in, and in a filtered view that matters -- UBC is 21 on the card and 3 on
the canvas. And the walk happily offers me the node I came from as a 'neighbour' without saying
so on screen. None of those stopped me. The keys themselves are fine; the sheet is better than
Gephi's, which is to say it exists."

**Would you use this instead of what you use now?**

"For this job -- poking round a neighbourhood -- I would do it in two lines of networkx:
`sorted(G["TP53"], key=G.degree, reverse=True)[0]`. I will not switch for that. But the
hand-off case is real: I could send this to the biologist and they could walk from their gene
without a mouse, without Python, and see weight and degree at every step. That is a yes for the
hand-off view, with conditions: degree labelled as whole-graph or in-view, a weighted degree
option in the order switch, and the back-edge marked on screen, not only for the screen reader.
And I still want the API."

## Problems seen

1. **"Degree" does not say which graph.** In a filtered view the card, the inspector and the
   table show whole-graph degree (UBC 21) while the walk can reach three of UBC's neighbours. The
   only hint is "rank of 300" and "in filtered graph" on the position line. Severity 2.
2. **The node you came from is not marked on screen.** Sorted by degree, UBC's first neighbour
   is TP53, the start node; the screen-reader line says "where you came from", the visible card
   does not. She selected it by reflex and had to undo. Severity 2.
3. **The first step follows edge weight.** Shift+Down lands on PALB2 (degree 5), because the
   default order is confidence. The order switch is visible and one key (O) away, so she
   recovered at once, but a "best-connected" question needs a second key. Severity 1.
4. **No weighted degree in the order switch.** On a confidence-weighted network she expected
   "best-connected" to be arguable between degree and strength; the switch offers weight of the
   single edge, degree, and name. Severity 1.
5. **The inspector visit is thin for a hub.** Enter on UBC shows module and degree only -- the
   same as the card -- with no neighbours, no incoming edge, no weighted degree. Severity 1.
6. **"Score" has no home.** The task's word matched nothing on screen; she answered with degree
   and edge weight and said so. Correct behaviour (nothing invented), noted for the moderator
   script as much as the design. Severity 1.

## What worked

- The skip link as the first product Tab stop, naming F6.
- The walk starting on TP53 without a search, and saying where it starts.
- "?" giving a short, grouped key sheet that names the order key.
- The visible order switch in the focus card, and O cycling it in one key.
- "1 of 3 ... in filtered graph": the walk admits the view hides neighbours.
- Enter visiting a node in the inspector without selecting it, and Esc returning to the same
  place in the walk.
- "Last neighbor." instead of wrapping.
- Tab from the walk landing on the first selected row of the table.
