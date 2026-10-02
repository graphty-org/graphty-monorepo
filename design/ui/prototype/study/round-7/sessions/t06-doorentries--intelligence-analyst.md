# Session: keep a remark on Ana Ruiz's visits to B1 -- intelligence analyst (Marcus)

Task as given: "Your security lead wants a remark kept on Ana Ruiz's visits to building B1 --
that connection, not her or the building alone -- saying the visits need checking against her
badge record. Nobody has typed a name into this program. The data on screen is a sample: a
company's door swipes, people and buildings."

Start screen: shots/tasks/t06-doorentries/01.png. Renders are in
tmp/round-7-sessions/t06-doorentries--intelligence-analyst/. All commands were run from
design/ui/prototype with `D=tmp/round-7-sessions/t06-doorentries--intelligence-analyst`.

## Step 0 -- the start screen

Think-aloud: "Door entries, March 2026. Four hundred-odd dots in a ball, no names on any of
them, gray on gray. 412 people, 9 buildings, 1,306 links. Fine. I am not clicking around in that
hairball looking for one woman. There is a box at the top left, 'Find rows and notes'. That is
where I would type her name."

## Step 1 -- search for her by name

    timeout 120 node app-b/study.mjs --try $D/01.png task:t06-doorentries --click "Find rows and notes" --type "Ana Ruiz"

Result (01.png): the search box got a blue outline and that is it. Nothing typed, no results
list. "OK, search does not do anything for me. The box is lit up and empty. Either it did not
take my typing or it searches something else. Moving on -- I will go to the records."

## Step 2 -- open the table

    timeout 120 node app-b/study.mjs --try $D/02.png task:t06-doorentries --click "Table"

Result (02.png): a table slides up under the chart, on an Edges tab: "1,306 edges from
entries.csv, one per person and building". Columns person_id, building_id, count, time
(earliest), time (latest), Notes. Top row 1001 / B1 / 22 / Mar 2 to Mar 27, with a little
speech bubble "1" in Notes.

"Good, this is the swipe log rolled up -- one line per person and door, 22 swipes. That is the
kind of thing I want. But it gives me person_id, not a name. Which one is Ana Ruiz? I have to go
look her up like it is 1998."

## Step 3 -- find her id on the people tab

    timeout 120 node app-b/study.mjs --try $D/03.png task:t06-doorentries --click "Table" --click "Nodes"

Result (03.png): Nodes tab, "421 nodes from people.csv and buildings.csv". First row: 1001,
person, Ana Ruiz, Facilities. She has a note bubble too.

"There she is, 1001. So the top line on the other tab, 1001 to B1, is her and B1. Why the link
table can not just show me the name next to the number, I do not know. That is a cross-reference
I should not be doing by eye -- one wrong digit and I have papered the wrong person."

## Step 4 -- select her B1 line in the link table

    timeout 120 node app-b/study.mjs --try $D/04.png task:t06-doorentries --click "Table" --click "Edges" --click "22"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t06-doorentries --click "Table" --click "Edges" --click "1001"

Result (04.png, 05.png): the row goes blue and a black popup over the chart says "Selects the
edge 1001 - B1". But the panel on the right still says "Door entries" -- the whole graph. Nothing
on the chart lit up either.

"It says it selects it. Did it? The side panel did not change, the Selection line on the left
has no count, the chart did not light anything. I do not trust a message that says it did a
thing when nothing else on the screen agrees."

## Step 5 -- try the add-note shortcut with that row picked

    timeout 120 node app-b/study.mjs --try $D/06.png task:t06-doorentries --click "Table" --click "Edges" --click "1001" --key n

Result (06.png): the left side switched to a Notes list with a blank note at the top -- but the
tag on the blank note says "Door entries", the whole graph, not her and B1. The blue on the row
went gray. Under the blank note are three existing notes, one of them "The busiest pair: 22
entries, March 2 to March 27." tagged "Ana Ruiz -> B1 . entries".

"No. That remark would be filed against the entire dataset. That is exactly what my lead said
not to do. The table selection evidently did not count. But look -- somebody already hung a note
on 'Ana Ruiz -> B1'. So the program does know that connection as a thing. I will go in through
that."

## Step 6 -- click the note count on her row (detour)

    timeout 120 node app-b/study.mjs --try $D/07.png task:t06-doorentries --click "Table" --click "Edges" --click "1"

Result (07.png): the whole screen changed to a different file, "Les Miserables", a book
character network with PageRank colors. My door-entry data was gone from the screen.

"What did that just do? I clicked the little '1' bubble on Ana's row and it opened somebody
else's case. If this were real casework, that is how a chart gets lost. I am backing out of
that."

## Step 7 -- go in through the existing note's tag

    timeout 120 node app-b/study.mjs --try $D/08.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries"

Result (08.png): the right panel now reads "Ana Ruiz -> B1 -- Edge, entries", Ends Ana Ruiz ->
B1, count 22, 2026-03-02 to 2026-03-27, and under Notes "1 note . Add note (N)". A strip of four
unlabeled icons appeared above the chart toolbar.

"There. Now it is showing me the connection itself, with her name, the building, the count and
the dates. That is what I wanted from the start. And there is 'Add note' right on it."

## Step 8 -- add the note on that connection

    timeout 120 node app-b/study.mjs --try $D/09.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note"

Result (09.png): a blank note at the top of the Notes list, tagged "Ana Ruiz -> B1". Save is gray
until I write something; Ctrl+Enter also saves.

"Tag says Ana Ruiz -> B1, not her, not the building. Correct."

## Step 9 -- write it and save

    timeout 120 node app-b/study.mjs --try $D/10.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note" --click "Write a note" --type "Check these B1 visits against her badge record." --click "Save"

Tool output: `nothing on screen is called "Write a note"`, `nothing on screen is called "Save"`.
Result (10.png): same as 09 -- the box is there, empty, Save still gray.

"I can see the box and where it is filed. I would type 'Check these B1 visits against her badge
record' and hit Ctrl+Enter. The screen would not take my typing, so I could not watch it save.
I am stopping here."

## Outcome

Did I succeed? Mostly. I got a note box filed against the Ana Ruiz to B1 connection, which is
the right place. I could not see the note actually save, because the text would not go in. And I
only found the right place because someone had already left a note on that connection; if that
note had not been there I do not know how I would have got the program to treat the link as the
thing I had selected -- picking the row in the table did not do it, and the note I started from
there was filed against the whole dataset.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not yet. In i2 I click the link line and add a note
to it; done. Here the people search did nothing for me, the link table shows ids instead of
names, selecting a row said it worked when nothing else on screen agreed, the shortcut quietly
filed my note on the whole dataset, and one click on a note bubble threw me into a different
file. What I did like: once the connection was up, the side panel showed it properly -- names,
count, first and last date -- and the note was clearly tagged to that connection, not to her.
That part is better than a free-text note in i2. Fix the way in, and I would look again.

## Problems seen

1. Search box "Find rows and notes" took focus but produced nothing for a name (01.png).
2. The link table shows person_id only; I had to look up 1001 on the people tab to know which
   row was Ana Ruiz (02.png, 03.png).
3. Picking a link row in the table popped "Selects the edge 1001 - B1" but the side panel stayed
   on the whole graph and nothing lit on the chart (04.png, 05.png).
4. Pressing N after picking that row started a note filed against "Door entries" -- the whole
   graph -- not the connection (06.png). This would file the remark in the wrong place without
   warning.
5. Clicking the note bubble "1" on the row opened a different file entirely (Les Miserables)
   (07.png). Could be the bubble or something else named "1"; either way the case left the screen.
6. The only route that worked went through someone else's existing note on that link (08.png).
7. A strip of four unlabeled icons appeared above the chart toolbar when the link was selected
   (08.png); no idea what they do.
