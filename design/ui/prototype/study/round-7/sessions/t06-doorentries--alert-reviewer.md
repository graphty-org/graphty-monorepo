# Session: note on Ana Ruiz's visits to B1 -- Nadia, level-1 alert reviewer

Task as given: "Your security lead wants a remark kept on Ana Ruiz's visits to building B1 --
that connection, not her or the building alone -- saying the visits need checking against her
badge record. Nobody has typed a name into this program. The data on screen is a sample: a
company's door swipes, people and buildings."

Start screen: shots/tasks/t06-doorentries/01.png (graph of people and buildings, left panel with
"Find rows and notes", right panel with the graph summary, Table/Nodes/Edges strip at the bottom).

All commands run from design/ui/prototype; renders in tmp/round-7-sessions/t06-doorentries--alert-reviewer/.

## Steps

**01** `timeout 120 node app-b/study.mjs --try .../01.png task:t06-doorentries --click "Find rows and notes" --type "Ana Ruiz"`
"First thing I do with any system: paste the name in the first search box." The box took focus
(blue outline) but my text never showed up. Nothing happened. "OK, search doesn't work, or I'm
doing it wrong."

**02** `--click "Table"`
The table opened on Edges: person_id, building_id, count, time (earliest), time (latest), Notes.
"It's IDs, not names. So I need her ID first. Same as the case system, copy a number from one
screen to another." Top row is 1001 -> B1, count 22, and it already has a note icon with a 1.

**03** `--click "Table" --click "Nodes"`
Nodes tab: 1001 is Ana Ruiz, Facilities, and she has one note on her too. "So 1001 to B1 is the
row. There's already a note on that row -- is that the remark, or something else?"

**04** `--click "Table" --click "22"`
The row turned blue and a dark tooltip said "Selects the edge 1001 - B1". But the right panel
still said "Door entries" with the whole-graph summary. "Did it select or not? The tooltip says
it does, the panel says it didn't."

**05** `--click "Table" --click "22" --click "1"`
I clicked the little "1" note count to read the existing note. The whole screen changed to a
different file -- "Les Miserables", Valjean, Javert, PageRank. "Where did my door data go? If
this happened at work I'd think I'd just lost the file. I'd close it and go back to the case
system." (Starting again, since every run starts fresh.)

**06** `--click "Table" --click "22" --key n`
The right panel said "Add note (N)", so I selected the row and pressed N. A note box opened on the
left -- but its tag said "Door entries", the whole graph, not the connection. Under it I could see
the existing notes, and one of them, "The busiest pair: 22 entries, March 2 to March 27", is
tagged "Ana Ruiz -> B1 . entries". "That's the tag I want. Mine would have gone on the whole
graph. Glad I looked before I typed."

**07** `--click "Table" --click "1001"`
Clicked the ID cell instead of the count. Same result: blue row, tooltip, right panel unchanged.
"Clicking the row isn't selecting it. Or it is and nothing tells me."

**08** `--click "Notes" --click "Ana Ruiz -> B1 . entries"`
Went to Notes in the left bar and clicked the chip on the existing note. Now the right panel
said "Ana Ruiz -> B1, Edge, entries", count 22, March 2 to March 27, and "1 note . Add note (N)".
"Finally. That's the connection. Annoying that I got here through somebody else's note -- if
there was no note on it already, how would I?"

**09** `--click "Notes" --click "Ana Ruiz -> B1 . entries" --click "Add note"`
Note box opened, tagged "Ana Ruiz -> B1". "Right thing. Not her, not the building. The two of
them."

**10** `... --click "Add note" --click "Write a note" --type "Check these B1 visits against her badge record." --click "Save"`
Tool said: nothing on screen is called "Write a note"; nothing on screen is called "Save". The box
stayed empty and Save stayed gray. "Fine, in real life I'd type the line and hit Ctrl+Enter. The
box is on the right thing; I'm calling it done."

## After the task

**Did I succeed?** Mostly. I got a note box attached to Ana Ruiz -> B1, which is what was asked.
I couldn't actually type the text in here, and I only found the connection because someone had
already written a note on it. Without that note I think I'd have saved my remark on the whole
graph by accident (step 06) and not noticed until QA did.

**Single Ease Question: 3 / 7.** Ten tries for one sentence of note. The search box did nothing,
clicking the row didn't change what the note would attach to, and clicking a note count dropped
me into a completely different file.

**Would I use this instead of my current tool?** No, not for this. In the case system I open the
alert and type in the comment box -- it's always on the thing I opened. Here the note box
attaches to whatever the right panel thinks is selected, and the table doesn't change that. If
clicking the 1001 -> B1 row had put "Ana Ruiz -> B1" in the right panel, this would have been two
clicks and a sentence and I'd say maybe. And I'd want to see that the note goes into the file as
a picture plus text before I trusted it.

## What tripped me up
- Search box: focus, but nothing typed appeared and no results (step 01).
- Table shows IDs only on edges; had to cross to Nodes to learn 1001 is Ana Ruiz (02-03).
- Clicking an edge row highlights it and shows "Selects the edge 1001 - B1", but the right panel
  and the note target stay on the whole graph (04, 07).
- Pressing N with that row "selected" opened a note on "Door entries", the whole graph (06).
  Easy to save in the wrong place.
- Clicking the "1" note count in the table switched to a different file entirely (05).
- The only way I found to the connection was the chip on an existing note (08).
