# Keyboard walk with Shift+Arrow -- Knowledge Engineer Min-ji

**Participant:** Dr. Min-ji Kim, knowledge graph engineer at a financial-services company. Owns a
40-million-triple corporate knowledge graph (OWL, SHACL, SPARQL in GraphDB). Mild red-green
colour weakness; reads on screen at 110 percent. Works mostly from the keyboard in the SPARQL
workbench and Protege.

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he
is connected to, and select two of them."

**Screens seen:** the Les Miserables project with Find open (empty, and with the key sheet), Quick
actions with a name typed, the keyboard walk page (a filtered protein network: canvas focused, go
to a node by name, walking, two selected, key sheet, inspector visit), and the keyboard-only
storyboard (read in part).

Renders the participant looked at:
- `../../../tmp/kw-minji/find-s1.png` (Find, empty, with its tooltip)
- `../../../tmp/kw-minji/find-s9.png` (Quick actions, a name typed)
- `../../../tmp/kw-minji/find-s15.png` (key sheet from Find)
- `../../../tmp/kw-minji/kw-s1.png`, `../../../tmp/kw-minji/kw-s12.png` (canvas focused; go to a node)
- `../../../tmp/kw-minji/kw-s2.png`, `../../../tmp/kw-minji/kw-s9.png` (walking; two selected)
- `../../../tmp/kw-minji/kw-s10.png`, `../../../tmp/kw-minji/kw-s11.png` (key sheet; inspector visit)
- `../../../shots/storyboards__keyboard-only.png` (the storyboard, top half read)

## Think-aloud

**Before starting.** "Les Miserables. Fine, it is the demo everybody ships. I will say now: this
is a co-appearance graph, the edges mean 'appeared in the same chapter'. There is no predicate.
So whatever I learn here about 'moving through connections' I have to translate to a graph where
Javert would have five different kinds of edge to Valjean. Keep that in mind."

"No mouse. Good, actually. I live in a query editor. First reflex is Ctrl+F."

**Find, empty.** *Presses Ctrl+F.* "Box on the left, 'Name, id or value'. Tooltip -- too long, I
read the first line. 'Finds nodes, edges, sets, paths...' OK. Second paragraph, 'Esc closes it;
the lists come back and the selection stays. F6 moves to the next region.' That is actually the
line I needed. Where does focus go after Esc -- it does not say."

"Header says '27 of 77 nodes, 3 steps'. So there is a filter on. Remember that. Whatever count I
get for Javert's neighbors is going to be of the filtered graph unless it tells me otherwise."

*Types "javert", Enter.* "Hit is selected, footer says 'Enter Select'. Fine. Javert, group 4,
degree 10. And in the table: degree 10 filtered, 17 full graph. Good -- two numbers, labelled.
That is exactly the thing Neo4j Browser never does. So seven of his neighbours are hidden by the
filter. The task says 'characters he is connected to'. Seventeen or ten? I will take the ten on
screen and say so."

**Getting from Find to the drawing.** "Now I need to be on the graph, not in the list. The footer
says F6, next region." *Presses F6.* "Inspector. F6 again -- something, the help button, I think.
F6 again, toolbar. F6 again, the drawing. Four presses. Tolerable; in a real session I would learn
it once. But it is not written anywhere on the Find panel how many regions sit between me and the
canvas, or in what order. I had to count."

*Moderator notes: she pressed ? inside Find first to see if there was a direct key.* "Key sheet
from Find: Everywhere -- Ctrl+F, Ctrl+K, F6, question mark. In Find -- Enter, Esc. Nothing about
the drawing here. So from inside Find I would not know the walk exists at all. I only know because
the moderator said 'move through'."

**Canvas focused.** "OK, blue frame round the drawing, and a card above the toolbar: 'Graph
drawing. Start: TP53, the walk starts here'." *Pause.* "The page I am on is proteins now, not Les
Mis. The moderator says to treat TP53 as Javert. Fine, but that is a gap in your materials: I found
Javert in one mock and I am walking a different graph in the next. I am going to assume that after
I chose Javert in Find, this card would say 'Start: Javert'. The storyboard says so -- 'a hit
chosen with Enter is selected and becomes the walk's start'. I read that; I would not have guessed
it."

"The card says 'Shift+Arrow: walk. Enter: select. ?: keys.' Short. I like short."

**The Ctrl+K alternative.** "There is also Ctrl+K, Quick actions, 'go to a node by name'. The
render shows 'Go to Marius, Filtered out by Filter out group 8' -- good, it tells me why he is not
there instead of pretending he does not exist. The note says Go to 'puts the walk on it and selects
nothing'. Find 'selects the hit'. So there are two ways to find Javert and they leave the selection
in different states." *Beat.* "That matters for this task. If I went in through Find, Javert is
already selected. Then I add two neighbours and I have three selected, not two. If I had used
Ctrl+K I would have two. Nobody told me that difference; I got it from a design note I would not
normally read. I am going to finish with Find, because that is what I did, and see if it bites."

**First step: Shift+Down.** *Presses Shift+Down.* "'Walking the drawing. PALB2, neighbor 1 of 32 of
TP53, by weight, highest first. Weight 0.98.' OK. The card changes: 'PALB2, 1 of 32 from TP53',
the node gets a double ring."

"'By weight.' Weight of what? In the Les Mis project the inspector said 'Edges: undirected; value,
not used yet'. So in Les Mis, is the walk ordered by 'value' or not? The protein page says 'edge
weight: confidence' in the inspector -- that graph declared it. Mine did not. I would expect Les
Mis to fall back to degree or name and say so. Cannot tell from here."

*Presses Shift+Down again, expecting the next neighbour.* "PALB2 ... now it says -- 'neighbor 1 of ... from
PALB2'." *Stops.* "No. That is not Javert's list any more. Shift+Down went one hop further, into
PALB2's neighbours. I thought down meant next in the list. It is a list, it is vertical in my head.
Right is next. Down is deeper." *Presses Shift+Up.* "'Back to PALB2, neighbor 1 of 32 of TP53.'
Good, it has a back, and it said where I landed. I recovered in one key, but I would have selected
a second-degree node if the card had not said 'from PALB2'. The 'from' is what saved me. I read
counts; a less suspicious person would not."

"Honestly, a depth-first descent on Down is a reasonable model -- it is a tree walk, like Protege's
class hierarchy where right expands. But in Protege right-arrow goes into children and down goes
to the next sibling. Here it is the other way round. That will catch every ontology person."

**Moving through the list.** *Shift+Right, Shift+Right, Shift+Right.* "RPS13, BRCA1, RPA2 -- '4 of
32 from TP53, weight 0.86, degree 11, rank 40 of 300'. Fine. Each step says position, weight,
degree. That is the right information, and it is on the card as text, not as a colour I have to
decode."

"What I do not get: the edge. It tells me the neighbour and the weight. It does not tell me the
relationship. In Les Mis there is only one kind so it does not matter. In my graph Javert --
sorry, a legal entity -- is connected to its parent by 'hasParent', to a fund by 'manages', to a
person by 'hasDirector'. If I walk to a neighbour, the first thing I need to hear is by which
predicate, and in which direction. 'Neighbor 4 of 32' flattens that. Incoming and outgoing are
the same list. That is exactly the property-graph-versus-semantic-graph flattening I complain
about."

"And what happens at ten thousand? One of our hub entities has forty thousand instruments. '1 of
40,000', Shift+Right forty thousand times? O switches to degree or name order, fine, but there is
no 'type a letter to jump' within the neighbours that I can see. I would want to type the start of
a name, or filter the list by predicate."

**Selecting.** *Presses Enter on RPA2.* "Key sheet said Enter 'Select this node'. Does that replace
the selection or add? In a table Enter usually replaces. Card now says 'selected' next to RPA2, and
the right side says -- if I came from Find -- 2 selected, Javert and RPA2. So it adds. OK, so
Enter in the walk adds. Noted."

*Shift+Right to another neighbour, Enter.* "Second one added. Card: '2 selected on canvas' on the
protein page because the studio's page started with nothing selected. On my path it would say 3:
Javert, plus the two. The task said select two of them."

"So I have to take Javert out. Shift+Home, 'Back to TP53, start of the walk' -- it says whether the
start is selected, good -- Space, deselect. Now two. It works, it is three extra keys, and I only
knew to do it because I was counting. If I had not been, the export or the set I made next would
have had the hub in it. For entity resolution that is exactly the kind of silent extra member that
causes a false merge."

**Checking the result.** *Alt+Enter.* "Inspector visit: '53BP1, selected. Module DNA repair, degree
7, rank 172 of 300'. Esc comes back to the walk. I like that it does not change the selection to
look at one node -- that is a real distinction and it respects it." *Esc, then looks at the
inspector with two selected.* "'2 selected', module DNA repair, degree 'Mixed', and the list, RPA2
11, 53BP1 7. Good. 'Mixed' rather than an average I did not ask for. Correct."

"Rings: the focused node has a double ring, selected ones a single ring. I can tell them apart
without colour. The legend on the Les Mis page -- group 4 green, group 3 orange-red -- I would not
trust myself on those two, but the walk never asks me to read colour, it reads the group out. Fine."

**One inconsistency.** *Tabs to the table, presses Enter on a row out of curiosity.* "Table: Enter
made that row the only selection. Canvas: Enter added. Same key, same selection, opposite
behaviour depending on which region I am in. I will get that wrong within a week."

**Key sheet, afterwards.** *Presses ? on the canvas.* "This is the page I should have read first.
'Shift+Down: into this node's neighbors. Shift+Right: next neighbor.' It says it. I did not read it
because I did not know there was a walk until I was in it. The Find key sheet should at least point
here: 'On the drawing: Shift+Arrow walks from the node you found'."

## Outcome

Completed with difficulty. She found Javert with Ctrl+F, reached the drawing with four F6 presses,
and walked his neighbours. Her first Shift+Down after the first step went one hop deeper instead
of to the next neighbour; she caught it only because the card said "from PALB2", and backed out
with Shift+Up. Because she entered through Find, Javert was already selected, so after adding two
neighbours she had three selected; she noticed from the count and removed him with Shift+Home and
Space. Ended with the two neighbours selected, about 18 key presses.

## Single Ease Question

**5 of 7.** "Every step said where I was and how to get back, and the counts were labelled filtered
versus full. It lost two points for Down meaning 'deeper' when I expected 'next', and for Find
quietly selecting Javert so I ended up with three when I was asked for two."

## Would she use this instead of her current tool?

"No -- not instead. For 'who is this entity connected to' I write a SPARQL query and I get the
predicate, the direction and a count in one go. This walk gives me none of the predicate and none
of the direction. But I have never seen a graph viewer I could drive entirely from the keyboard
and trust the counts on, and this is honest about the filter. If it showed which predicate each
step goes along, and let me restrict the walk to one predicate or one direction, I would use it
to look at merge candidates next to my queries. Without RDF import it does not matter, because I
cannot get my graph in."

## Findings (for the studio)

1. **Shift+Down is "deeper", not "next".** An ontology user reads the neighbour list as vertical
   and expects Down to be the next item (Protege uses Right to expand, Down for the next sibling).
   She stepped two hops without meaning to. Caught only by the "from PALB2" wording on the card.
2. **Find selects the hit; Quick actions "Go to" does not.** Entering the walk through Find leaves
   the start node selected, so "select two neighbours" yields three. Nothing on screen warns of
   this; the difference is only in a design note.
3. **Enter adds on the canvas, replaces in the table.** Same key, same selection, opposite effect
   by region.
4. **Find's key sheet does not mention the walk,** and the Find panel does not say how many F6
   presses reach the drawing. From Find she could not discover the walk.
5. **The walk step names no relationship and no direction.** For typed, directed graphs (RDF, or a
   property graph with several edge types) the step needs "via predicate, outgoing/incoming", and
   the walk needs a way to restrict to one predicate or direction.
6. **Order "by weight" is undefined when the graph has not declared a weight** (Les Mis: "value, not
   used yet"). The card should say what the order fell back to.
7. **No jump within a large neighbour list.** At tens of thousands of neighbours, Shift+Right one by
   one is not a walk; type-to-jump or a filter over the list is needed.
8. **Study materials:** the task names Javert, but the walk mock only exists on the protein
   network, so the participant finds a node in one graph and walks another.

What worked for her: counts always labelled filtered versus full ("10 filtered, 17 full graph"),
the card's "N of M from X" position, one-key back (Shift+Up) with a spoken landing point, the
inspector visit that does not change the selection, "Mixed" instead of an invented average, and
focus/selection shown by ring shape rather than colour.
