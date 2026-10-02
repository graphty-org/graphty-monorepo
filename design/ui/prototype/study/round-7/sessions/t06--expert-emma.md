# Session t06 -- Expert Emma

Task as given: "Leave two reminders for next week: one about the tie between Javert and Valjean
itself (the two share many chapters), and one about the whole circle of characters around the
bishop Myriel. You have never typed your name into this program. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

All commands were run from design/ui/prototype. T = tmp/round-7-sessions/t06--expert-emma.

## Start screen (shots/tasks/t06/01.png)

"Les Mis co-appearance graph, 77 nodes. PageRank on color, degree on size, legend with the range
and the scale named -- square root of area. Fine, someone did that right. 'Local only' at the top,
good, that is the first thing I look for. Left rail has a Notes entry and the tree has a Notes row
with 4 in it. A reminder is a note. Let me go there."

## Step 1 -- Notes panel

    timeout 120 node app-b/study.mjs --try $T/01.png task:t06 --click "Notes"

"There are already notes, and they are attached to things: a chip that says 'Javert -- Valjean'
with an edge icon, one on 'Community 3', one on a node. So notes attach to an object. There is
already a note on the Javert-Valjean edge -- 'They share 17 chapters'. I need my own one though.
Plus button at the top of the list."

    timeout 120 node app-b/study.mjs --try $T/02.png task:t06 --click "Notes" --hover "Add note"
    timeout 120 node app-b/study.mjs --try $T/03.png task:t06 --click "Notes" --click "Add note"

"'Add note', shortcut N. Good, a key. The composer opened with a chip 'Co-appearances' -- so it
attaches to whatever is selected, and nothing is, so it took the whole graph. Wrong target. I
need to select the edge first. I am not hunting for a hairline on the canvas; give me the edge
table."

## Step 2 -- the Javert-Valjean edge

    timeout 120 node app-b/study.mjs --try $T/04.png task:t06 --click "Edges"

"Edge table: source, target, value, sorted by value. Javert -- Valjean, 17, and a Notes column
with a 1 in it. That is the weight -- 17 shared chapters. Matches the Knuth data as I remember it.
Click the row."

    timeout 120 node app-b/study.mjs --try $T/05.png task:t06 --click "Edges" --click "Javert"

"Inspector says 'Javert -- Valjean, Edge'. A small action bar popped up over the canvas with a
speech-bubble icon, presumably a note. I will just press N."

    timeout 120 node app-b/study.mjs --try $T/06.png task:t06 --click "Edges" --click "Javert" --key n

"Composer opened with the chip 'Javert -- Valjean'. That is the right target. Odd: the bottom
table flipped back from Edges to Nodes when I pressed N. Not a problem for this, but I lost my
place."

    timeout 120 node app-b/study.mjs --try $T/07.png task:t06 --click "Edges" --click "Javert" --key n --type "Next week: re-check the Javert-Valjean tie, weight 17 shared chapters" --click "Save"
    timeout 120 node app-b/study.mjs --try $T/08.png task:t06 --click "Edges" --click "Javert" --key n --click "Write a note" --key Control+Enter

"I cannot get text into the box in this build, so Save stays gray. I will take the composer with
the right chip as the reminder being written: 'Next week: recheck the Javert-Valjean tie, 17
chapters.' Ctrl+Enter to save is the right shortcut. Nothing asked for my name, which is fine by
me -- I do not want an account for a sticky note. I do wonder who the note will say wrote it."

## Step 3 -- the circle around Myriel

"Now 'the whole circle around the bishop'. To me that is Myriel's ego network: Myriel plus his
neighbors, radius 1. Not a community -- a community is an algorithm's opinion. Select Myriel
first."

    timeout 120 node app-b/study.mjs --try $T/09.png task:t06 --click "Myriel"

"That selected the 'Myriel to Javert' shortest-path row in the tree, not the node. Not what I
meant."

    timeout 120 node app-b/study.mjs --try $T/10.png task:t06 --click "Notes" --click "Myriel"

"That hit the existing note 'Myriel's household and the people he meets in Digne' and selected
Community 3, 10 nodes. Interesting -- someone already pinned the household to a Louvain community.
Park that."

    timeout 120 node app-b/study.mjs --try $T/11.png task:t06 --click "Data"
    timeout 120 node app-b/study.mjs --try $T/12.png task:t06 --click "Data" --click "Myriel"

"The labels on the canvas do not respond. Node table then."

    timeout 120 node app-b/study.mjs --try $T/13.png task:t06 --click "Data" --click "Table" --click "Myriel"

"Myriel, degree 10, PageRank 0.0428, rank 2, betweenness 0.177. Those look like the networkx
numbers. The canvas says 'Myriel, 10 connections' and the action bar has a target-looking icon."

    timeout 120 node app-b/study.mjs --try $T/14.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Neighbors"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Select neighbors"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Ego network"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Focus"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Expand"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Neighbours"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Connections"
    timeout 120 node app-b/study.mjs --try $T/15.png task:t06 --click "Data" --click "Table" --click "Myriel" --hover "Neighborhood"

"Took me a few guesses at the word. It is 'Neighborhood'. Fine."

    timeout 120 node app-b/study.mjs --try $T/16.png task:t06 --click "Data" --click "Table" --click "Myriel" --click "Neighborhood"

"Hold on. I selected Myriel -- the inspector still says Myriel -- and the popover says
'Neighborhood of Valjean ... Valjean and his 36 neighbors'. That is the wrong node. The hops
control and 'Undirected graph' are what I wanted, but it is computing on someone else. That is
exactly the thing that makes me close a tool: I asked for one thing and got a different answer with
no explanation. I am not saving a reminder on that."

"Back to what I parked: Community 3."

    timeout 120 node app-b/study.mjs --try $T/17.png task:t06 --click "6 groups"
    timeout 120 node app-b/study.mjs --try $T/18.png task:t06 --click "6 groups" --click "Table"

"Louvain, run Sep 28, six communities, with a table: size, density, edges inside, edges leaving.
I like that table, honestly -- that is the first useful thing a GUI has shown me about a
partition. Community 3: 10 nodes, density 0.222, 10 inside, 3 leaving, already 2 notes on it. I
cannot see which 10 nodes from here, and on the canvas PageRank covers the color so the group is
invisible. I am trusting the earlier note that it is Myriel's people."

    timeout 120 node app-b/study.mjs --try $T/19.png task:t06 --click "6 groups" --click "Community 3" --key n

"That put the note on the whole Louvain run, not the community -- the tree had not expanded."

    timeout 120 node app-b/study.mjs --try $T/20.png task:t06 --click "6 groups" --click "Table" --click "Community 3" --key n

"Composer with the chip 'Community 3'. Inspector: 'Paints 10 nodes', and 'its color is saved for
the Louvain value 3, so a rerun that finds 3 again keeps it'. So the note is pinned to a label
number. If Louvain renumbers on a rerun -- and it will, it is not deterministic without a seed --
my reminder points at a different set of people. That is not 'the circle around Myriel', that is
'whatever is called 3 next time'. Second reminder: 'Next week: Myriel's circle -- check who is in
it and whether it is really just his ego network.' Stopping there."

## Debrief

- Succeeded? Partly. The Javert-Valjean reminder is on the right object (the edge) -- confident.
  The Myriel one is on Louvain Community 3, which is a proxy for what I meant. The proper route,
  Neighborhood on Myriel, showed Valjean's neighborhood instead, so I did not use it. I could not
  type text in either composer in this build.
- Single Ease Question: 4 of 7. The edge was easy once I used the table; the circle was not.
- Would I use this instead of my current tool? For handing a view with annotations to someone who
  does not code -- maybe, notes pinned to edges and groups are more than Gephi gives me. For this
  task specifically, no: a note pinned to a community number that a rerun can reassign is not a
  reminder I trust, and a Neighborhood action that answers for the wrong node is a write-off until
  it is fixed. In a notebook I would put a comment next to `nx.ego_graph(G, "Myriel")` and be done.
