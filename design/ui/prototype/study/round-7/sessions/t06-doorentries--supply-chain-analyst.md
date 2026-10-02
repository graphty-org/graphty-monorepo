# Session: door entries remark -- Dana Okafor (supply chain risk analyst)

Task given: "Your security lead wants a remark kept on Ana Ruiz's visits to building B1 -- that
connection, not her or the building alone -- saying the visits need checking against her badge
record. Nobody has typed a name into this program. The data on screen is a sample: a company's
door swipes, people and buildings. If that is not your line of work, treat it as your own records
of who touched what."

Renders are in tmp/round-7-sessions/t06-doorentries--supply-chain-analyst/. Every command was run
from design/ui/prototype; the screenshot path is shortened to NN.png below.

## Start screen (shots/tasks/t06-doorentries/01.png)

"OK. Door entries, March 2026. A hairball, like every network picture I've ever been shown. 412
people, 9 buildings. 'Local only' up top -- good, I'd ask that first, does this go to a server.
Right side has 'Add note' but it says 'No notes about the graph itself' -- I don't want the whole
file, I want her and B1. First thing I do in any tool: type the name in the search box."

## Step 1 -- search box

    timeout 120 node app-b/study.mjs --try .../01.png task:t06-doorentries --click "Find rows and notes"

"Box is highlighted. Fine."

    timeout 120 node app-b/study.mjs --try .../02.png task:t06-doorentries --click "Find rows and notes" --type "Ana Ruiz"

"I typed her name and... nothing. The box is still empty, no list. Either it's broken or it's not
where I think. I'm not going to fight it. There's a 'Table' at the bottom -- tables I trust."

## Step 2 -- the table

    timeout 120 node app-b/study.mjs --try .../03.png task:t06-doorentries --click "Table"

"Edges tab. person_id, building_id, count, earliest, latest, Notes. That's basically my swipe log
rolled up -- 1001 to B1, 22 times. But it's ids, not names. Which one is Ana? I need the people
list. That's 'Nodes', I suppose -- their word, not mine."

    timeout 120 node app-b/study.mjs --try .../04.png task:t06-doorentries --click "Table" --click "Nodes"

"There she is: 1001, Ana Ruiz, Facilities. And she already has a note on her. So 1001 to B1 is
the top row of the other tab. Why can't the edges tab just show the name next to the id? That's
an XLOOKUP I shouldn't have to do in my head."

## Step 3 -- pick the 1001 / B1 row and add a note

    timeout 120 node app-b/study.mjs --try .../05.png task:t06-doorentries --click "Table" --click "Edges" --click "1001"

"Row goes blue, a tooltip says 'Selects the edge 1001 - B1'. Good. But the right side still says
'Door entries', the whole graph. Hmm. It said N for note, I'll press N."

    timeout 120 node app-b/study.mjs --try .../06.png task:t06-doorentries --click "Table" --click "Edges" --click "1001" --key n

"A note box opened on the left -- but the tag on it says 'Door entries'. That's the whole file,
not her visits. And my row isn't blue any more. If I'd been in a hurry I would have typed my
remark here and it would have landed on the whole data set. I only caught it because the note
underneath shows a different tag, 'Ana Ruiz -> B1 . entries'. Cancel that in my head."

    timeout 120 node app-b/study.mjs --try .../07.png task:t06-doorentries --click "Table" --click "Edges" --click "1001" --click "Selection"

"Clicked 'Selection' to see what I've picked. 'Paints 0 nodes', and a color, size and opacity.
So clicking the row selected nothing? Then what was 'Selects the edge' about? Don't know what
'paints' means here. Not what I want."

    timeout 120 node app-b/study.mjs --try .../08.png task:t06-doorentries --click "Table" --click "Edges" --click "1"

"I clicked the little note count '1' on her row to see that note... and now I'm in something
called 'Les Miserables' with Valjean and PageRank. What? That's a different file entirely. If
that happened with my supplier list open I'd be worried I'd lost it. Back out."

## Step 4 -- go in through the existing note

    timeout 120 node app-b/study.mjs --try .../09.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries"

"Notes list on the left rail. One already says 'The busiest pair: 22 entries' with a tag 'Ana
Ruiz -> B1 . entries'. I clicked the tag. NOW the right side says 'Ana Ruiz -> B1, Edge,
entries', count 22, March 2 to 27, and 'Add note'. That's the thing I want -- her trips to that
building. Took me the long way round."

    timeout 120 node app-b/study.mjs --try .../10.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note"

"Note box, tagged 'Ana Ruiz -> B1'. That's the connection, not her and not the building. Right."

    timeout 120 node app-b/study.mjs --try .../11.png task:t06-doorentries --click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note" --click "Write a note" --type "Check these visits against her badge record." --click "Save"

Tool output: nothing on screen is called "Write a note"; nothing on screen is called "Save".

"The box takes no typing here either, same as the search box, and Save stays gray. The box is in
the right place with the right tag, so I'd type 'Check these visits against her badge record'
and hit Save. I'll call that done -- the program wouldn't let me finish the typing."

## Outcome

- Succeeded? Mostly. I found the right place to put the remark -- a note box tagged 'Ana Ruiz ->
  B1' -- but only on my second route, by going through somebody else's note. I could not actually
  type and save it.
- Single Ease Question: 3 out of 7.
- Would I use this instead of my current tool? Not for this. In Excel I'd add a column called
  "remark" to the swipe sheet next to row 1001/B1 and be done in thirty seconds. Here: the search
  box didn't take a name, the connections table shows ids instead of names, clicking a row said it
  selected the connection but the side panel and the note shortcut both stayed on the whole file,
  and clicking a note count dropped me into a different data set altogether. What I did like: once
  I got there, the remark is clearly pinned to the pair, not the person, and the side panel shows
  the 22 swipes and the date range right next to it -- that's better than a loose cell comment.
  And 'Local only' answers my IT question before I ask it. But I'm not putting a security remark
  somewhere I nearly attached it to the whole file by accident.

## What went wrong, in my words

1. Search box ignored the name I typed.
2. The connections table lists person and building ids only; I had to cross-reference the people
   tab to know 1001 is Ana Ruiz.
3. Clicking her row showed "Selects the edge 1001 - B1", but the right panel stayed on the whole
   graph, and N opened a note tagged to the whole file. Easy to file the remark in the wrong place.
4. "Selection" then said it paints 0 nodes -- so my row click had selected nothing after all.
5. Clicking the note count on the row took me to a different data set (Les Miserables).
6. The only route that worked was clicking the tag on an existing note -- I'd never have found it
   if nobody had written a note on that pair before.
