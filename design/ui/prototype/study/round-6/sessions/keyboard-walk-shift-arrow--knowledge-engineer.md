# Keyboard walk with Shift+Arrow -- Knowledge Engineer Min-ji

**Participant:** Dr. Min-ji Kim, knowledge graph engineer at a financial-services company. Owns a
40-million-triple corporate knowledge graph (OWL, SHACL, SPARQL in GraphDB). Mild red-green
colour weakness; reads on screen at 110 percent. Lives in the SPARQL workbench and Protege, mostly
from the keyboard.

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he
is connected to, and select two of them."

**Screens seen:** Find in the Les Miserables project (a name typed; the key sheet opened from
Find); the keyboard walk page on the protein network (canvas focused, go to a node with Quick
actions, walking, two selected, three selected, the key sheet, the inspector visit, back on the
drawing after the table); the keyboard-only storyboard (the frame strips read, not every note).

Renders the participant looked at:
- `../../../tmp/kw-minji-r6/find-s2.png` (Find with a name typed, Les Miserables)
- `../../../tmp/kw-minji-r6/find-s15.png` (key sheet opened from Find)
- `../../../tmp/kw-minji-r6/kw-s1.png`, `../../../tmp/kw-minji-r6/kw-s12.png` (canvas focused; go to TP53)
- `../../../tmp/kw-minji-r6/kw-s2.png` (first step of the walk)
- `../../../tmp/kw-minji-r6/kw-s9.png`, `../../../tmp/kw-minji-r6/kw-s3.png` (two selected; three selected)
- `../../../tmp/kw-minji-r6/kw-s10.png`, `../../../tmp/kw-minji-r6/kw-s11.png` (key sheet; inspector visit)
- `../../../tmp/kw-minji-r6/kw-s13.png` (back on the drawing, walk kept)
- `../../../shots/storyboards__keyboard-only.png` (the storyboard)

## Think-aloud

**Before starting.** "Same task as last time, word for word. I will say what I said then: Les
Miserables is a co-appearance graph, one kind of edge, no predicate, no direction. Whatever I
learn here I have to translate to a graph where one entity has five kinds of edge to its
neighbours."

"And -- let me check before I start -- is Javert on the walk page this time?" *Moderator: the walk
page is still the protein network.* "So no. I find Javert in one graph and walk a different one.
Again. Fine. I will do the Les Mis part where Les Mis exists and pretend TP53 is Javert after
that. But I am writing down that I am pretending."

**Find.** *Ctrl+F.* "Box on the left. I type 'javert'." *Moderator shows the Find render; the
typed example on it is 'thenard', two hits.* "OK, the render has a different name in it, same
mechanism. Two results 'in all 77 nodes'. Thenardier, group 4, degree 11. Inspector on the right:
'degree 11, 16 in the full graph'. Good. Two numbers, both labelled. That is still the best thing
on this page. For Javert the table says 10 filtered, 17 full graph. So seven of his neighbours are
hidden by the filter chip at the top, '27 of 77 nodes, 3 steps'. The task says 'the characters he
is connected to'. Seventeen exist; ten are on screen. I will walk the ten and say so."

"Footer: 'Enter Select. Esc Close. F6 Next region.' So Enter selects Javert. That means Javert is
in my selection before I have taken a single step. Remember that; it bit me last time."

"I can see him in the drawing now, actually. Javert, green, next to Thenardier. Group 4. The
legend has group 4 green and group 3 orange-red. I would not bet on telling those two apart on my
screen, but the table says '4' in text next to the swatch, so I do not have to."

**Is there a way from Find to the walk?** *Presses ? inside Find.* "Key sheet. 'Everywhere: Ctrl+F,
Ctrl+K, F6, question mark. In Find: Enter, Esc.' That is all. Nothing about the drawing, nothing
about walking. Same as last round. If the moderator had not said 'move through', I would not know
a walk exists. I would do what I would do in Neo4j Browser: select Javert and look for an 'expand'
or 'neighbours' command. Which here is probably Quick actions, 'Select neighbors' -- I saw that
name in the storyboard. That would select all ten at once, not two. Not what I was asked."

"Footer says F6 is next region. How many regions to the drawing? It does not say. Last time it
was four presses. I will assume four again."

**Canvas focused.** *F6 until the drawing has the blue frame.* "Card above the toolbar: 'Graph
drawing. Start: TP53, the walk starts here. Degree 32, rank 2 of 300. Nothing selected.'" *Stops.*
"'Nothing selected.' But I came in through Find and pressed Enter. Find says Enter selects. So on
my path this card would say 'TP53 selected' -- sorry, 'Javert selected'. The mock shows the other
path. Which one is true? I open the storyboard: frame 1 says 'TP53 is selected from an earlier
Find', and its strip says 'Selected: TP53'. The screen says nothing selected. The storyboard and the
screen disagree about the one fact that decides whether I end with two or three."

"The card also has 'Neighbors by: Confidence, Degree, Name' and an O key. Confidence is this
graph's declared edge weight, it says so in the inspector: 'edge weight: confidence'. Les Mis
says 'Edges: undirected; value, not used yet'. So what does the walk order by for Javert?
Confidence does not exist there. I would guess it falls back to degree. It does not say. I would
like it to say."

**The Ctrl+K route.** *Looks at the 'go to TP53' render.* "Quick actions, go to a node by name.
Card: 'Walking the drawing. TP53, start of the walk. Nothing selected.' So Ctrl+K puts me on the
node and selects nothing. Find puts me on nothing and selects the node. Two ways to find a node
and they leave opposite states. If I had known, I would have used Ctrl+K for this task. I only
know because I have done this task before."

**First step.** *Shift+Down.* "'Walking the drawing. PALB2, 1 of 32 from TP53. Confidence 0.98,
degree 5, rank 247 of 300.' Double ring on PALB2. Good."

*Pauses, hand over Shift+Down, does not press it.* "Last time I pressed Down again here and went
one hop deeper, into PALB2's neighbours. I remember that, so I will press Right. But I remember
it because it cost me. A new person will press Down, because a list of neighbours is vertical in
everybody's head. The key sheet still says 'Shift+Down: walk into this node's neighbors, Shift+
Right: next neighbor'. Nothing changed. In Protege, right expands and down is the next sibling. It
is the exact opposite here."

*Shift+Right, Shift+Right, Shift+Right.* "RPA1, RAD51, RPA2, '4 of 32 from TP53, confidence 0.86'.
Each step names position, the edge's value, degree. On the card, as text. Fine."

"Still no relationship. It tells me the neighbour and one number on the edge. In my graph the
first thing I need on a step is which predicate and which direction: 'hasParent, outgoing'. 'Four
of 32 from' flattens incoming and outgoing into one list. I said this last round and it is still
the thing that would stop me using this on real data."

**Selecting the first one.** *Enter on RPA2.* "Key sheet now says 'Enter: Add this node to the
selection'. That is new, or new to me, and it is the right wording. It says add. Good. So on my
path: Javert, plus RPA2. Two selected, one of them the wrong one."

**Selecting the second one.** "Now I want another of TP53's neighbours. I look at the 'selection of
two' render to see what the designers expect." *Reads the card.* "'53BP1, 1 of 6 from RPA2, in
filtered graph. Selected. 2 selected.' From RPA2." *Leans in.* "That is not a neighbour of TP53
in this walk. That is a neighbour of RPA2. They pressed Down on RPA2 and took the first thing in
RPA2's list. The inspector says '2 selected: RPA2 11, 53BP1 7'. If the task were 'select two of
TP53's neighbours', this mock shows it done wrong. Maybe 53BP1 is also directly connected to TP53
-- I cannot tell from the drawing, the lines are a fan -- but the card says it reached it through
RPA2. For entity resolution that is the difference between 'directly linked' and 'two hops away',
and it is exactly the mistake I made last round by accident."

"So I will not do what the mock does. From RPA2 I stay in TP53's list: Shift+Right to 5 of 32,
Enter. On my path that is Javert plus two neighbours: three selected. The task said two."

**Getting rid of the start.** "The key sheet: 'Shift+Home: back to the start'. Then Space, 'Add or
remove this node'. So Shift+Home, Space, and Javert is out. Two left. It works. Three keys I would
only press because I was counting. The 'three selected' render shows the counter at the top right
of the card, '3 selected', and the inspector list. If I read counts, I catch it. Most people do
not read counts."

"And there is '] [ next or previous selected node'. That is new to me and useful -- I could check
what is actually in my selection without leaving the drawing. The storyboard shows it saying
'TP53, selected 1 of 3'. That is how I would have caught the extra member if I had not been
counting. Nobody tells you to press it, though."

**Checking.** *Alt+Enter.* "Inspector visit: '53BP1, selected, module DNA repair, degree 7, number
172 of 300'. Esc comes back. It does not change my selection to look at one node. I liked that last
time, I still like it."

**Leaving and coming back.** *Looks at the 'walk kept' render.* "Card: 'Walk kept: on MSH2, from
TP53'. But the three-selected render just before it said 'MSH2, 2 of 6 from RPA2'. Which is it --
from TP53 or from RPA2? One of those is the start of the walk and the other is the node I stepped
from, and the card uses the same word, 'from', for both. I rely on that word. Last round 'from
PALB2' was the thing that saved me. If 'from' can mean the start or the parent depending on the
state, I cannot rely on it."

**Scale.** "One more, for the record. A hub in our graph has forty thousand instruments. '1 of
40,000' and Shift+Right. O changes the order to name, fine, but there is still no 'type a few
letters to jump inside the list', and no way to walk only one predicate. That is not a walk at
that size, that is a scroll."

## Outcome

Completed with difficulty, and partly by imagination. She found Javert with Find and read his
degree correctly (10 on screen, 17 in the full graph) and walked on the protein network standing
in for him, because the walk page still does not contain Javert. She avoided the Down-goes-deeper
trap only because it had caught her in the previous round. She noticed that the studio's own
"two selected" render selects a node reached through RPA2 rather than a direct neighbour of the
start, and that the screen ("nothing selected") and the storyboard ("TP53 selected from an earlier
Find") disagree about whether the start is selected. On her own path she ended with three
selected (Javert plus two), removed Javert with Shift+Home and Space, and ended with two. About 17
key presses, plus one render she read to settle a contradiction.

## Single Ease Question

**4 of 7.** "The walk itself is honest: every step says where I am, what I came from, and the
filtered versus full counts. But it is one point worse than last time, not better. Nothing I
tripped on was fixed -- Down still goes deeper, Find still selects the start and says nothing
about the walk, and I still cannot do this on Javert. And the mock now shows two selected where
one of the two is not his neighbour, and says 'from TP53' and 'from RPA2' for the same node. I
only got it right because I had done it before."

## Would she use this instead of her current tool?

"No. For 'who is this entity connected to' I run a SPARQL query and get the predicate, the
direction and the count in one result. This walk gives me the count and a number on the edge,
nothing about the predicate or the direction, and I cannot get my graph in without flattening it
to CSV. What would make me use it next to my queries: the step names the predicate and direction,
I can restrict the walk to one of them, and I can type to jump in a long neighbour list. The
keyboard-first design and the labelled counts are better than anything I have used in a graph
viewer, and that is why I keep coming back to the session. It is not enough on its own."

## Findings (for the studio)

1. **The walk mock still does not contain Javert.** The task names a Les Miserables character;
   the walk exists only on the protein network, so the participant finds a node in one graph and
   walks another. Second round in a row.
2. **The "selection of two" state shows a two-hop node.** 53BP1 is shown as "1 of 6 from RPA2",
   reached by stepping into RPA2's neighbours, not as a neighbour of the start. As a picture of
   "select two of the start's neighbours" it demonstrates the wrong result, and it is the same
   Down-goes-deeper mistake a participant made by accident last round.
3. **Screen and storyboard disagree on whether the start is selected.** The screen's first state
   reads "nothing selected"; the storyboard's first frame says TP53 is selected from an earlier
   Find and keeps it selected throughout. That fact decides whether the task ends with two or three.
4. **"from" means two things on the card.** "MSH2, 2 of 6 from RPA2" while walking, "Walk kept: on
   MSH2, from TP53" after leaving. One names the node stepped from, the other the start. The word
   is the participant's main safeguard against walking too deep.
5. **Unchanged from last round:** Shift+Down goes deeper rather than to the next neighbour (opposite
   of Protege's tree keys); Find selects the hit while Quick actions "Go to" does not, so Find users
   get an extra member; Find's key sheet and footer say nothing about the walk or how many F6
   presses reach the drawing; the order is undefined on a graph with no declared weight (Les Mis
   "value, not used yet"); no predicate or direction on a step; no type-to-jump in a long list.

What worked for her: counts labelled filtered versus full ("10 filtered, 17 full graph"), Enter
now described as "Add this node to the selection", "] [ next or previous selected node" as a way to
audit the selection from the drawing, the inspector visit that leaves the selection alone,
"Mixed" instead of an invented average, and focus versus selection shown by ring shape, not colour.
