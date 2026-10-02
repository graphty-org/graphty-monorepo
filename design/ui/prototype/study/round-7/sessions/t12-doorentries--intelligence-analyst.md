# Door entries: link Ana Ruiz to Priya Nair -- intelligence analyst (Marcus)

Task as given: "Could Ana Ruiz and Priya Nair have run into each other through the buildings they
use? Work out the chain that links them with as few go-betweens as possible, and say through which
building."

Renders are in design/ui/prototype/tmp/round-7-sessions/t12-doorentries--intelligence-analyst/.
Every command was run from design/ui/prototype. D below is that renders folder.

## Start screen (shots/tasks/t12-doorentries/01.png)

"Door entries, March 2026. 412 people, 9 buildings, 1,306 links. A hairball of identical gray
dots, no names, no icons -- I can't tell a person from a building. Top bar says 'Local only', good,
that's the first thing I'd ask. This is a 'how is A connected to B' question; I want shortest path.
There's an 'Analyze' link on the left. Try that."

## 01 -- Analyze

    timeout 120 node app-b/study.mjs --try $D/01.png task:t12-doorentries --click "Analyze"

"A list. 'Shortest path -- the fewest steps, or the lightest route, between two nodes.' That's
what I want. It's even in 'Recent'. Fine."

## 02 -- Shortest path

    ... --click "Analyze" --click "Shortest path"

"'Path between' box. From, To, Direction, Weight, Scope. Weight defaults to 'count (loaded
weight), Stronger' and the small print says it uses 1/count as distance. I don't want that -- I
asked for fewest go-betweens, not who badged in most. I'd want weight off. Also a banner up top:
'Click a node or set for From'. From says 'Type a name'. OK, type Ana Ruiz."

## 03, 04 -- try to type / pick Ana in the From box

    ... --click "Analyze" --click "Shortest path" --click "Type a name"
    ... --click "Analyze" --click "Shortest path" --click "Ana Ruiz"

"Clicked the From box -- nothing happened. No dropdown, no list of names, no cursor I can see.
'Nothing on screen is called Ana Ruiz.' Of course not, the dots have no labels. How am I supposed
to click a node when I don't know which dot is Ana?"

## 05 -- weight dropdown

    ... --click "Analyze" --click "Shortest path" --click "count (loaded weight)"

"There's a 'None' at the top. Good, that's the one I'd pick for fewest hops. At least that's
there."

## 06 -- the To box

    ... --click "Analyze" --click "Shortest path" --click "Click to pick"

"Clicked To. Now To says 'Type a name' and From says 'Click to pick'. It just swaps which one is
'active'. Still no list. I can't type into it and I can't see who's who on the chart. Grumble one."

## 07 -- go find them in a table instead

    ... --click "Nodes" --click "Table"

"Bottom strip had 'Table' and 'Nodes'. Now a table: 421 nodes from people.csv and buildings.csv.
First rows: Ana Ruiz, 1001, Facilities, has a note. Priya Nair, 1188, Legal. Good -- they're both
here, and now I have their IDs."

## 08 -- path box with the table open

    ... --click "Nodes" --click "Table" --click "Analyze" --click "Shortest path" --click "Ana Ruiz" --click "Priya Nair"

"Opening the path box flipped the table to Edges on its own -- the names are gone, I can't click
them. But look at the edge table: 'from entries.csv, one per person and building'.
  1001 -> B1, count 22, Mar 2 07:58 to Mar 27 17:12
  1188 -> B1, count 6,  Mar 2 08:12 to Mar 19 12:44
That's Ana and Priya, same building, B1. Both on Mar 2 within fifteen minutes of each other at
the start. That's my answer right there, in the raw records, which is honestly where I'd trust it
most. Odd though: the header says 1,306 edges and the table shows four rows."

## 09 -- click the IDs in the edge table

    ... --click "1001" --click "1188"

"Can't click the cells to set From/To either. Nothing."

## 10, 11 -- select Ana from the node table first

    ... --click "Nodes" --click "Table" --click "Ana Ruiz" --click "Analyze" --click "Shortest path" --click "Nodes" --click "Priya Nair"
    ... --click "Nodes" --click "Table" --click "Ana Ruiz" --click "Priya Nair"

"Clicking Ana's row selects her: right panel says Ana Ruiz, person, badge B-20417, a ring on one
dot, and a label 'Ana Ruiz, 1 connection'. One connection -- so B1 is the only building she uses.
But the table jumped to Edges again the moment I selected her, so I can't get to Priya's row. And
the path box still says 'Type a name' for From even though Ana is selected. It should have taken
her. Grumble two: is there a way to just pick two people from a list?"

## 12, 13 -- the toolbar that appeared over the selection

    ... --click "Nodes" --click "Table" --click "Ana Ruiz" --hover "Path"
    ... --click "Nodes" --click "Table" --click "Ana Ruiz" --click "Path between"

"A row of little icons showed up. Hovered the second: 'Path between (P)'. Clicked it with Ana
selected -- and From is STILL empty. I started the path from her, and it didn't use her. That's
the third time."

## 14 -- Ana's note

    ... --click "Nodes" --click "Table" --click "Ana Ruiz" --click "1 note"

"Wanted to read the note on Ana -- maybe it's the source of something. Clicked '1 note' and the
whole thing changed to 'Les Miserables', co-appearances, Valjean, Javert. My door-entry case is
gone off the screen. I clicked a note on my subject and it dropped me into somebody else's
project. If that were real case data I'd be closing the tab. I'm stopping here."

## Answer

Ana Ruiz and Priya Nair are linked through one building: B1. Ana Ruiz -> B1 -> Priya Nair, one
go-between, which is the building itself. Ana badged into B1 22 times (Mar 2 to Mar 27), Priya 6
times (Mar 2 to Mar 19); both first entries were Mar 2, at 07:58 and 08:12. Ana's only building is
B1 ("1 connection"), so there can't be another route through a different building for her. Caveat
I'd put in the report: same building and overlapping dates is opportunity, not proof they met.
I never saw what B1 is called -- I only have the ID.

## Debrief

- Succeeded? Mostly. I got the answer from the edge table, not from the shortest path tool. The
  tool never ran: I could not get a name into From or To.
- Single Ease Question: 3 of 7.
- Use it instead of i2 and Excel? Not yet. The pieces I want are here -- local only, a shortest
  path with a 'None' weight, a raw records table with first and last swipe times. But a path box
  that won't take a name, ignores the person I already selected, a table that keeps flipping to
  Edges, and a note link that dropped me into a different project -- that's three strikes. In
  Excel I'd have filtered entries.csv on the two IDs and had B1 in a minute. And the chart is
  unlabeled gray dots; I can't tell a person from a building.
