# Session: leave two reminders (knowledge engineer)

Participant: Dr. Min-ji Kim, knowledge graph engineer (persona file study/personas/knowledge-engineer.md).

Task as given: "Leave two reminders for next week: one about the tie between Javert and Valjean
itself (the two share many chapters), and one about the whole circle of characters around the
bishop Myriel. You have never typed your name into this program. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t06/01.png. Renders: tmp/round-7-sessions/t06--knowledge-engineer/NN.png.
Every command ran from design/ui/prototype with `D=tmp/round-7-sessions/t06--knowledge-engineer`.

## Steps, thinking aloud

### 01 -- open Notes

    timeout 120 node app-b/study.mjs --try $D/01.png task:t06 --click "Notes"

"A reminder is an annotation. There's 'Notes 4' in the tree and a Notes icon on the rail. Rail
first." The Notes panel lists existing notes, each with chips for what it is attached to: one on
"Community 3" ("Myriel's household and the people he meets in Digne"), one on a chip "Javert --
Valjean" with an edge glyph ("They share 17 chapters"). "Good -- notes are attached to subjects,
and one subject is an edge. That's the distinction I want: the tie, not the two people."

### 02, 03 -- the "+" in the Notes header

    timeout 120 node app-b/study.mjs --try $D/02.png task:t06 --click "Notes" --hover "+"
    -> nothing on screen is called "+"
    timeout 120 node app-b/study.mjs --try $D/03.png task:t06 --click "Notes" --click "Add note"

The draft opened, pinned to "Co-appearances" -- the whole graph. "Not what I want. It takes the
current selection, so I need to select the edge first. Fine, that's predictable, but nothing
told me that until I saw the wrong chip."

### 04 -- select the edge through an existing note's chip

    timeout 120 node app-b/study.mjs --try $D/04.png task:t06 --click "Notes" --click "Javert -- Valjean"

Inspector: "Javert -- Valjean, Edge", Ends Javert, Valjean, value 17, 1 note. "17 is the
shared-chapter count, matches 'many chapters'. And it's called an edge, with its own attribute.
Good. I'd still call 'value' something with a unit."

Note: the only way I found to select the edge without dragging on the canvas was a chip in
somebody else's note. If that note did not exist, I don't know how I would have done it (Edges
table at the bottom, probably, but I did not need to try).

### 05 -- add a note on the edge

    timeout 120 node app-b/study.mjs --try $D/05.png task:t06 --click "Notes" --click "Javert -- Valjean" --click "Add note"

Draft pinned to "Javert -- Valjean" with the edge glyph. "Correct subject."

### 06, 07 -- write and save

    timeout 120 node app-b/study.mjs --try $D/06.png task:t06 --click "Notes" --click "Javert -- Valjean" --click "Add note" --type "Next week: review this tie" --click "Save"
    -> nothing on screen is called "Save"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t06 --click "Notes" --click "Javert -- Valjean" --click "Add note" --click "Write a note" --key "Control+Enter"
    -> nothing on screen is called "Write a note"

Text box stays empty, Save stays gray. "I can't put text in. I assume this is a mockup. The
attachment is right, which is what I care about; I'll count the first one as pinned but not
saved."

### 08 -- try to select Myriel

    timeout 120 node app-b/study.mjs --try $D/08.png task:t06 --click "Myriel"

It selected the "Myriel to Javert" shortest-path row, not the person. "Wrong thing. I wanted the
node."

### 09 -- Louvain

    timeout 120 node app-b/study.mjs --try $D/09.png task:t06 --click "Louvain"

A table of six communities with size, density, edges inside and edges leaving. "This is the
twelve-boxes-and-counts view I keep asking for. Community 3: 10 members, 10 inside, 3 leaving,
2 notes. Myriel's star on the canvas is about ten nodes. Plausible."

"But 'the whole circle around Myriel' -- I'd define that as his neighbors, not a modularity
partition. Louvain is a heuristic; it may put people in or leave them out. I'm using it because
someone already wrote that Community 3 is his household, and I can't type into the search."

### 10 -- select Community 3

    timeout 120 node app-b/study.mjs --try $D/10.png task:t06 --click "Louvain" --click "Community 3"

Inspector: "Community 3, Group from Louvain, Paints 10 nodes, Covered for Color by PageRank".
"So selecting it shows me nothing on the canvas -- PageRank wins the color. I can't see who is in
it." The table below shows Javert with group 4 and the same green swatch as Community 3. "Is
Javert in Myriel's circle? The inspector says Community 3 is Louvain value 3."

### 11 -- try the Data tab

    timeout 120 node app-b/study.mjs --try $D/11.png task:t06 --click "Louvain" --click "Community 3" --click "Data"

That hit the left-rail Data, not the inspector tab, and dropped my selection. It did show that
"group" is an attribute of the file (used for Color), separate from the Louvain result. "So two
different groupings, same colors. Green 4 and green 3 mean different things. I do not trust
swatches anyway -- red-green weakness -- but this would fool someone who does."

### 12 -- Add note on Community 3

    timeout 120 node app-b/study.mjs --try $D/12.png task:t06 --click "Louvain" --click "Community 3" --click "Add note"
    -> nothing on screen is called "Add note"

The Style tab has no notes. The edge's inspector had "Add note" under Data. "Inconsistent place."

### 13 -- select, then Notes, then Add note

    timeout 120 node app-b/study.mjs --try $D/13.png task:t06 --click "Louvain" --click "Community 3" --click "Notes" --click "Add note"

Draft pinned to "Co-appearances" again. "Switching panels threw away my selection. So the
selection is not stable across panels -- that's how I'd attach a note to the wrong thing and not
notice."

### 14, 15 -- the chip trick again

    timeout 120 node app-b/study.mjs --try $D/14.png task:t06 --click "Notes" --click "Community 3"
    timeout 120 node app-b/study.mjs --try $D/15.png task:t06 --click "Notes" --click "Community 3" --click "Add note"

Draft pinned to "Community 3". "Same wall: no text, no save. Stopping."

## Outcome

Did I succeed? Partly. Both drafts ended up pinned to the right kind of subject -- the edge
itself, and a group -- but I could not write or save either one, and the second is pinned to a
Louvain community I could not verify is "Myriel's circle". I got to both by clicking chips in
other people's notes; I would not have found the subjects otherwise.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? For annotation, not yet. Today I keep reminders in
Jira tickets and Confluence, pinned to IRIs. What I liked: a note can attach to an edge as its own
thing, and the community table gives counts between groups. What would stop me:
- selection is lost when I switch to the Notes panel, so the note silently attaches to the whole
  graph;
- "Add note" lives in the Data tab of one inspector and not on the Style tab of another;
- clicking a name selected a path named after the person, not the person;
- I could not see a group's members on the canvas, because another layer owns the color;
- the file's "group" attribute and Louvain's communities share one palette, so the swatches
  disagree with the numbers;
- "circle around Myriel" should be his neighbors; the only group on offer is a modularity
  partition, which is an algorithm's opinion, not my selection.
And the question I always ask: is the note exportable as data with its subject's id? Nothing
here told me.
