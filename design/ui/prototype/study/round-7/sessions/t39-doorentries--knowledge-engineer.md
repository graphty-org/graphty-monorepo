# Session: leave a note on the Ana Ruiz to Priya Nair chain -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).

Task as given: "Someone already worked out how Ana Ruiz and Priya Nair could have met through a
building they both use, as a chain from one to the other. Leave a reminder on that chain as a
whole -- not on either person or the building -- saying it needs checking against the badge logs."

Start screen: shots/tasks/t39-doorentries/01.png

## Step 1 -- the start screen

Think-aloud: "Door entries, 421 nodes, 412 person, 9 building, 1,306 edges, directed. Fine, the
counts are labelled by class, which is more than most tools do. The orange thing on the canvas is
what someone 'worked out'. Left tree: Selection, Notes (3), Shortest paths, and under it 'Ana Ruiz
to Pr...' -- truncated, but that is obviously the chain. So it is a shortest path. Which shortest
path -- weighted by that 'count, stronger' weight or by hop count? I will come back to that. The
right panel is about the whole graph, and its Add note would be a note on the graph. Not what I
want. I click the path row so the right panel describes the path."

## Step 2 -- select the path

    timeout 120 node app-b/study.mjs --try .../t39-doorentries--knowledge-engineer/02.png task:t39-doorentries --click "Ana Ruiz to Priya Nair"

Result (02.png): the row is highlighted; the right panel now heads "Ana Ruiz to Priya Nair --
Path from Shortest paths". Summary: 3 nodes, 2 edges, From Ana Ruiz, To Priya Nair, Via B1.
Members in path order: Ana Ruiz (start), B1 (hop 1), Priya Nair (end). "Made with: All at their
defaults." And a Notes section: "No notes. Add note (N)".

Think-aloud: "Good. This is the chain as an object in its own right, with its members listed in
order and a notes section of its own. That is what I want -- a statement about the path, not about
Ana or B1. Reification, more or less. 'All at their defaults' does not tell me whether it was
weighted; I would have to open 'All options' to know. Not my task today. Add note."

## Step 3 -- Add note

    timeout 120 node app-b/study.mjs --try .../03.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note"

Result (03.png): the left panel switched to Notes. At the top a draft with a chip "Ana Ruiz to
Priya Nair" (orange dot, removable x), an empty "Write a note" box, Save (Ctrl+Enter) and Cancel.
Below it the three existing notes: one on "Ana Ruiz . person" and "B1 . building", one on the edge
"Ana Ruiz -> B1 . entries", one on a struck-through "B12 . building".

Think-aloud: "The draft is attached to the path, and only the path -- one chip, not three. The
existing notes show the difference nicely: that first one is attached to Ana and B1 separately,
which is exactly what I was told not to do. So the chip tells me what the note is about. Good.

But: the canvas lost my orange path. The badge now says 'Nothing is colored or sized by a row'.
I opened a note on the path and the path disappeared from the picture. Did adding a note turn off
the highlight? Is the path still there? The right panel still shows it, so I assume it is only the
coloring, but I should not have to assume. That is the kind of silent change I distrust."

## Step 4 -- type the reminder and save

    timeout 120 node app-b/study.mjs --try .../04.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --type "Needs checking against the badge logs." --click "Save"
    -> nothing on screen is called "Save"

    timeout 120 node app-b/study.mjs --try .../05.png task:t39-doorentries --click "Ana Ruiz to Priya Nair" --click "Add note" --click "Write a note" --type "Needs checking against the badge logs."
    -> nothing on screen is called "Write a note"

Result (04.png, 05.png): the same as 03.png -- the text did not go into the box, and Save stays
grayed out because the box is empty.

Think-aloud: "This prototype will not take my typing. In the real thing I would type 'Check this
path against the badge logs before using it' and press Ctrl+Enter. Everything up to the text box
worked, and the box is anchored to the right thing. I stop here."

## Outcome

- Succeeded? Yes, as far as the prototype allows: the note draft is attached to the path as a
  whole (one chip, "Ana Ruiz to Priya Nair"), not to either person or the building. I could not
  enter the text or save, so I did not see the saved note or where it shows up afterwards.
- Single Ease Question: 6 of 7. Three clicks, no wrong turns. One point off because the path
  highlight vanished from the canvas the moment I opened the note.
- Would I use this instead of my current tool? For this job, yes, over what I do today, which is a
  comment in a Jira ticket that pastes the SPARQL property-path query and its result. Here the
  annotation sits on the derived path itself, next to the members in order. Two conditions before
  I trust it: (1) the note has to be exportable with the path (which three resources, which
  algorithm, which options), not trapped in the tool; (2) I need to know what happens to the note
  when the data is reloaded or the path is recomputed and comes out different -- does it stay on
  a stale path, move, or get orphaned like that struck-through B12 one?

## Problems seen

1. Opening a note on the path cleared the canvas coloring ("Nothing is colored or sized by a row");
   the chain I was annotating vanished from the picture while I wrote about it. (03.png)
2. "Made with: All at their defaults" does not say whether the shortest path was weighted or by hop
   count; for a "could have met" claim that matters, and it should be visible without a click. (02.png)
3. The path row in the tree is truncated ("Ana Ruiz to Pr..."); fine with one path, ambiguous with
   several paths from Ana Ruiz. (01.png)

## What worked

- Selecting the path gives it its own inspector: members in order with roles (start, hop 1, end),
  From/To/Via, and its own Notes section.
- The note draft's chip names exactly one target, the path, and the older notes beside it show
  per-entity anchors, which made the difference obvious.
