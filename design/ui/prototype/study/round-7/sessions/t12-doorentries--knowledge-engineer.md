# Session: door entries, shortest chain between two people -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (study/personas/knowledge-engineer.md).
Task as given: "Could Ana Ruiz and Priya Nair have run into each other through the buildings they
use? Work out the chain that links them with as few go-betweens as possible, and say through which
building. The data on screen is a sample: a company's door swipes, people and buildings. If that is
not your line of work, treat it as your own records of who touched what."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t12-doorentries--knowledge-engineer/.

## Start screen (shots/tasks/t12-doorentries/01.png)

"Door entries, March 2026. 421 nodes: 412 person, 9 building. 1,306 edges, Directed. Fine, it
shows me the two classes and their instance counts, that is the first thing I check. Directed
person-to-building, so if this does a directed path search it will find nothing, because nobody
has an edge coming out of a building. Weight 'count, stronger' -- so the swipe count. For 'fewest
go-betweens' I want hops, not weight. In SPARQL this is a property path, ?a :entered/^:entered ?b,
and I would be done in one line. Let us see where the path search is. 'Analyze (Shift+A)'."

## 01 -- open Analyze

    timeout 120 node app-b/study.mjs --try .../01.png task:t12-doorentries --click "Analyze"

"A command list. 'Shortest path: the fewest steps, or the lightest route, between two nodes.' Good,
it says both readings out loud. Clicking it."

## 02 -- Shortest path

    ... --try .../02.png task:t12-doorentries --click "Analyze" --click "Shortest path"

"'Path between' dialog. From, To. Direction defaults to 'Either way' -- correct for this graph, and
I am glad I did not have to discover the directed trap myself. Weight defaults to count with
'Stronger' and the note 'uses 1/count'. That is a sensible note but the wrong default for my
question: I asked for fewest go-betweens, not the most-swiped route. I will have to change it.
From says 'Type a name'."

## 03, 04, 05 -- trying to fill From

    ... --try .../03.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name"
    ... --try .../04.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name" --type "Ana Ruiz"
    ... --try .../05.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Type a name" --click "Ana Ruiz"
      -> nothing on screen is called "Ana Ruiz"

"Clicked the From field, nothing visible happened. Typed 'Ana Ruiz', nothing: no suggestion list, the
field still reads 'Type a name'. The tooltip says 'Click a node on the canvas, or type a name'.
Clicking a node in a 421-dot hairball with no labels is not an option -- I cannot tell which dot is
Ana. So typing does nothing and clicking is impossible. That is my first failure."

## 06 -- the node table instead

    ... --try .../06.png task:t12-doorentries --click "Nodes"

"The table. 'from people.csv and buildings.csv'. id, type, name, dept, site, floors. Ana Ruiz is 1001,
Facilities. Priya Nair is 1188, Legal. Good, they exist. Now I want to hand these to the path dialog."

## 07, 08, 09 -- path dialog over the table

    ... --try .../07.png task:t12-doorentries --click "Nodes" --click "Analyze" --click "Shortest path" --click "Ana Ruiz"
      -> nothing on screen is called "Ana Ruiz"
    ... --try .../08.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Nodes" --click "Ana Ruiz"
      -> nothing on screen is called "Nodes"; nothing on screen is called "Ana Ruiz"
    ... --try .../09.png task:t12-doorentries --click "Analyze" --click "Shortest path" --click "Click a node or set for From"
      -> nothing on screen is called "Click a node or set for From"

"Opening the dialog flipped the table from Nodes to Edges on its own. I did not ask for that. And
while the dialog is up I cannot click the Nodes tab or a row, and the 'Click a node or set for From'
banner is not clickable either. 'Set' -- which set? There is no set anywhere.

But wait. The edges table, sorted by count, now shows me the raw rows: 1001 -> B1, count 22;
1188 -> B1, count 6. That is Ana and Priya, both swiping into building B1. So the answer is already
sitting in the edge list, no algorithm needed. Still, I only see four rows of a stated 1,306, and I
do not know why only four. I want the tool to confirm it."

## 10, 11, 12 -- select Ana first, then Path between

    ... --try .../10.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz"
    ... --try .../11.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --hover "Path"
    ... --try .../12.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between"

"Clicking her row selects her: the inspector shows type person, id 1001 marked Key, name marked
Name/Label, dept, badge. That is honest and I like the Key and Label tags. Canvas says 'Ana Ruiz, 1
connection'. One connection -- so Ana only ever entered one building. A small toolbar appeared; the
second icon is 'Path between (P)'.

Opened it with Ana selected and From is STILL empty. I selected the node, I pressed 'path from the
selection', and it did not use my selection. That is the second time the From field ignored me."

## 13, 14, 15 -- weight to None, try To

    ... --try .../13.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "count (loaded weight)"
    ... --try .../14.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "count (loaded weight)" --click "None" --click "Click to pick"
    ... --try .../15.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Path between" --click "count (loaded weight)" --click "None" --click "Type a name" --type "Priya"
      -> nothing on screen is called "Type a name"

"The weight list: None; entries; In use (1): count; Not a number (1). Picked None -- 'This path only.
Loaded weight: count, stronger'. Fine, hop count now.

Then I clicked 'Click to pick' on To and the placeholders swapped: now To says 'Type a name' and
From says 'Click to pick'. So the placeholder text follows focus instead of describing the field.
That is confusing; I could not tell which field was active. Then typing went nowhere again. Find
path stays disabled."

## 16 -- try putting both people in the selection

    ... --try .../16.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "Nodes" --click "Priya Nair"

"Priya's row highlights and a tooltip says 'Selects 1188', but the inspector still says Ana Ruiz and
the selection count is 1. So did I select Priya or not? I cannot tell."

## 17 -- Ana's note

    ... --try .../17.png task:t12-doorentries --click "Nodes" --click "Ana Ruiz" --click "1 note"

"Ana has one note; maybe somebody already wrote this down. I click '1 note' and -- the whole app
changes to 'Les Miserables', 77 nodes, Valjean and Javert, a PageRank legend. That is a different
graph. I clicked a note on a person in my door-swipe data and it threw me into another dataset
without asking. If this were my real data I would now be worried about what else it mixes up.
That is two unexplained failures. I stop here."

## Result

Answer given: "Yes. Ana Ruiz (1001) and Priya Nair (1188) both swiped into building B1 in March 2026
-- Ana 22 times, latest Mar 27; Priya 6 times, latest Mar 19, earliest Mar 2 for both. So the chain
is Ana -> B1 <- Priya, no other person in between. I got that from the raw edge rows, not from the
path tool, and I have not checked that their times in B1 actually overlapped -- 'could have' is all
I can say. The path tool never accepted a From or a To."

Did I succeed? "Probably yes on the answer, no on the tool. I read it off the edge list the way I
would read it off a SPARQL result. The feature that was meant to answer it I could not operate."

Single Ease Question: 2 of 7.

Would I use this instead of my current tool? "No. In SPARQL this is one property path and it
answers in a second. Here the path dialog would not take a name, would not take my selection, and
the placeholders swap between fields. Some things were right: Either way as the default direction
for a person-to-building graph, the 1/count note on the weight, the Key and Label tags in the
inspector, and the class counts in the summary. But a note link that drops me into an unrelated
dataset is the kind of thing that ends my trust in a tool."
