# Session: attach a note to Valjean -- Dr. Chen, computational biologist

Task as given: "You have just realized why Valjean matters to your argument. Write the thought down so
that next week you, or a colleague, can come back to it attached to him. You have never typed your name
into this program. The data on screen is a sample: characters of the novel Les Miserables, linked when
they appear in the same chapter."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t05--bioinformatics-researcher/. `$D` below is that folder; `$K` is the key presses
for "Bridge node" (`--key B --key r --key i --key d --key g --key e --key Space --key n --key o --key d --key e`).

## Start screen (shots/tasks/t05/01.png)

"Fine. Seventy-seven nodes, PageRank on color, degree on size. There is a Notes row in the left tree with
4 in it and a Notes icon on the left rail. In Cytoscape I would have added a 'comment' column to the node
table and typed into Valjean's cell -- which is ugly, but it lives on the node and it survives export. So
the first thing I do is what I do everywhere: select the node."

## Step 1 -- select Valjean

    timeout 120 node app-b/study.mjs --try $D/01.png task:t05 --click "Valjean"

"Selected. The right side is about Valjean now -- Style and Data tabs, a 'Why this look' list. And a
small floating bar appeared over the toolbar with five icons and 'Valjean, 36 connections'. The last icon
is a speech bubble. That is usually comment or annotate. Let me rest on it before I click it."

## Step 2 -- what is the speech bubble?

    timeout 120 node app-b/study.mjs --try $D/02.png task:t05 --click "Valjean" --hover "Add note"
    timeout 120 node app-b/study.mjs --try $D/03.png task:t05 --click "Valjean" --hover "Comment"
    (reply: nothing on screen is called "Comment")

"'Add note', shortcut N. Good, a one-line tooltip with a keyboard key. That is what I wanted."

## Step 3 -- Add note

    timeout 120 node app-b/study.mjs --try $D/04.png task:t05 --click "Valjean" --click "Add note"

"It opened a Notes panel on the left with a box already tagged 'Valjean' -- a little chip with an x, so I
could take him off or presumably add others. 'Write a note', Save with Ctrl+Enter, Cancel. Under it the
other notes in this file: some tagged with a community, some 'Cites Betweenness' or 'Cites PageRank'.
That 'Cites' thing is interesting -- a note that remembers which measure it was talking about is exactly
what a reviewer would want. Mine does not cite anything yet. I don't see how to make it cite PageRank
from here, and I am not going to go hunting for it today."

## Step 4 -- type and save

    timeout 120 node app-b/study.mjs --try $D/05.png task:t05 --click "Valjean" --click "Add note" --click "Write a note" --key B ...
    (reply: nothing on screen is called "Write a note" -- the cursor was already in the box)
    timeout 120 node app-b/study.mjs --try $D/06.png task:t05 --click "Valjean" --click "Add note" --key B --key r --key i --key d --key g --key e
    timeout 120 node app-b/study.mjs --try $D/07.png task:t05 --click "Valjean" --click "Add note" $K --click "Save"

"The cursor was already in the box, so I just typed. 'Bridge node' -- in my head it is: he is the one
node that ties the convent, the barricade and the Thenardier groups together, so if he drops out the
network falls into pieces. I would write more in real life. Save. It is at the top of the list: 'Bridge
node', chip 'Valjean', 'Just now'. Done, I think."

## Step 5 -- checking it actually stuck

    timeout 120 node app-b/study.mjs --try $D/08.png task:t05 --click "Valjean" --click "Add note" $K --click "Save" --click "Data"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t05 --click "Valjean" --click "Add note" $K --click "Save" --click "Data" --click "Valjean"
    timeout 120 node app-b/study.mjs --try $D/10.png task:t05 --click "Valjean" --click "Add note" $K --click "Save" --click "Graph"
    timeout 120 node app-b/study.mjs --try $D/11.png task:t05 --click "Valjean" --click "Add note" $K --click "Save" --click "Graph" --click "Notes"

"I don't trust a save until I see it from the other side. I wanted Valjean's own Data tab; I hit the
Data on the left rail instead, which took me to sources and attributes and dropped Valjean from the
selection -- my fault, two things called Data. The right side then showed the whole graph with 'Notes:
1 note'. One? There are six notes in the list. So 'graph notes' must mean something different from
'notes in this file'. Not explained.

Then I went back to the Graph tree. The Notes row still says 4. I just added one. Before, the list had
the Myriel, Napoleon, Valjean-and-Javert, betweenness and PageRank notes, plus the edge one -- I don't
know which four the 4 counted, but my new one did not change it. That is the kind of number I stop at.
I went back to the Notes panel and my note is still there at the top, so it was not lost. But the
count next to 'Notes' and the list disagree, and I could not tell you which one is right.

Also: re-selecting Valjean on the canvas after saving showed nothing on the node itself and nothing on
his Style tab that says he has a note. 'Why this look' lists a 'Notes' layer with 'Label below', so
maybe a note puts a label under him, but I could not see one."

## Two things I would want before a colleague reads this

- "No name on anything. Every note in that list just says 'Yesterday' or '2 h ago'. The task says a
  colleague comes back to it -- they will not know it is mine, and I will not know which of the other
  five are my postdoc's. The program never asked who I am, and it did not seem to care."
- "The top bar says 'Local only'. So how does the colleague read it at all? I am fine with that -- I
  prefer my unpublished data local -- but then the note is only for future me on this machine, unless
  there is a file I send. I did not go looking."

## Outcome

- Succeeded? Yes, I believe so: the note "Bridge node" is saved and tagged to Valjean, and it is still
  there after moving around the app. What I do not trust is the count next to Notes in the Graph tree,
  which stayed at 4.
- Single Ease Question: 6 of 7. Select node, speech bubble, type, save -- that is as short as it gets.
  The point off is for the stale count and for not being able to confirm the note from Valjean's side.
- Would I use this instead of my current tool? Not instead. My notes live in R Markdown next to the code
  that produced the number, with my initials and a date. This is nicer than a comment column in
  Cytoscape, and the 'Cites PageRank' idea is good if it records which run and parameters -- but a note
  with no author, that I cannot pull out as a table with the node ID, stays in this app and does not go
  in my methods. If I can export notes as a TSV keyed on node ID, with author and the cited measure,
  then I would use it for the figure work.
