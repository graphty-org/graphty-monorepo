# Session: door-entry import, screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "Three spreadsheets are open on the program's import page: a list
of people, a list of buildings, and a log of badge swipes saying which person entered which
building and when. If you do not work with building access, treat this as example data. Make one
network in which each person is tied to each building they entered -- however often the same
person went into the same building, they should be tied once -- and work out which swipes name a
person or a building that is not on the lists."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t24--screen-reader-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t24/01.png)

Title says "Door entries, March 2026". First thing I hear that matters: "Local only" near the top.
Good, that answers my first question -- the files are not going anywhere. I'd still want that said
in words somewhere a reviewer can quote, not just a chip, but fine.

There's a "Makes" line in monospace: "person (411) --entries (4,180 edges from 4,212 rows)-->
building (9)". That is the summary I always ask for, before I ask. I like it. Odd that people says
412 rows in the table list but 411 persons -- the match report explains it: "1 repeated key (kept
the first)". 1188 Priya Nair appears twice with two badges. Noted; not my task, but I would want to
know which row it kept. "Kept the first" is at least a stated rule.

Also in the people report: "3 keys have leading zeros (such as 0007). Ids match as written: nothing
is trimmed." That is going to bite on the swipes. Hold that thought.

The table list on the left: people 412, buildings 9, entries 4,212. Entries is the one I need.

## Step 2 -- open the swipe log

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/02.png task:r8-t24 --click "entries"

The entries table: person_id is "From -> person", building_id is "To -> building", time is "Time".
It already worked out the ends. Then a control: "One edge per: Row | Pair". Row is on. That's the
thing I need -- I want one tie per person-building pair, not one per swipe.

The match report is in plain sentences, which I appreciate -- I can arrow through it line by line:
- 4,212 rows; 4,180 have both ends.
- 4,187 of 4,212 person_id found in people. 4,205 of 4,212 building_id found in buildings.
- 25 person_id values (25 rows) are not in people, for example 7 and 1530. Add as people / Leave out.
- 7 building_id values (7 rows) are not in buildings, for example B12. Add as buildings / Leave out.
- Show the 32 rows.
- person_id is Number here and Category in people ... 0007 and 7 stay two keys.

So the warning cells say "Not in people" in words next to the icon. Words, not just yellow. Good.

But: row 3 is person 7, "Not in people". The people list has 0007, Wei Chen. The tool knows those
differ only by leading zeros -- it says so -- and then still calls 7 "not in people". Is swipe 7
really a stranger, or is it Wei Chen with the zeros stripped by whatever exported the log? In my
work that's exactly the "duplicate provider under two IDs" problem. I would bet on Wei Chen.

## Step 3 -- one tie per pair

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/03.png task:r8-t24 --click "entries" --click "Pair"

The Makes line now reads "1,306 edges from 4,180 of 4,212 rows". A note above the table: "One row
per pair: each is one edge, its count the rows it merged." Time splits into earliest and latest,
and a derived count column becomes the weight. A toast says the same thing at length and offers
Undo. That's the right behavior: it tells me once what changed and the change also stays written
on the page, so I'm not chasing the toast. The toast itself is long -- at my rate that is two or
three seconds of speech before "Undo" -- but it is said once.

Weight defaulting to the count is a decision I didn't ask for, but it's stated ("Weight: count,
the number of rows per pair"), so I can live with it. The task said tied once; it is tied once.

## Step 4 -- which swipes are bad

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/04.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows"

I expected the 32 rows. I got: "Showing the rows with an end not matched: 3 of the 7 sample rows."
Three rows. 7 at B4, 1530 at B2, 1214 at B12. So "Show the 32 rows" shows 3. The link says one
number and the result says another. That is the kind of thing I'd write in my keystroke file as
"lies".

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/05.png task:r8-t24 --click "entries" --click "Pair" --click "25 person_id values (25 rows)"

Same story: "2 of the 7 sample rows". Only 7 and 1530. I still can't read the 25 person ids, or the
7 building ids, as a list. The report gives me counts and "for example". For an audit I need every
one, as text I can paste into Excel and send to the facilities people.

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/06.png task:r8-t24 --click "entries" --click "Pair" --click "3 keys"

"Showing the rows whose key differs only by leading zeros: 1 of the 7 sample rows." Swipe 7. So the
tool itself pairs 7 with 0007, which strengthens my guess that it's Wei Chen.

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/07.png task:r8-t24 --click "entries" --click "Pair" --click "From -> person"

Looked in the person_id column menu for a way to treat 7 and 0007 as the same key. From, To,
Subtype, Name, Time, Weight (disabled, with a reason -- good, it says why), Edge id, Position,
Attribute. Nothing about matching or trimming. Dead end for that question. I'll leave the zeros
alone and report it as a likely data-entry issue instead.

## Step 5 -- load, and check the bad rows are still findable

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/08.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

The graph view. I can't use the picture, but the Summary panel on the right is text: Nodes 420
nodes (person 411, building 9), Edges 1,306 edges, Direction Directed, Weight count stronger,
Isolated nodes 14. Matches the import page: 14 people with no entries, kept unconnected, the
people report said so. Numbers agree across screens. That's the first thing I check and it holds.

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--screen-reader-analyst/09.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "from 3 tables"

"from 3 tables" takes me back to the entries table in an edit mode ("Edit: entries, Esc to leave"),
and the match report is still there with the same counts. So I can get back to the left-out swipes
after loading. That's my "can I get back to where I was" test, and it passes.

I stop here.

## Did I succeed?

Mostly. The network is built: 411 people and 9 buildings, 1,306 person-building ties, each pair
once, with the swipe count kept as the weight. The bad swipes: 32 rows left out -- 25 rows whose
person_id is not on the people list (examples 7 and 1530) and 7 rows whose building_id is not on
the buildings list (example B12). Of those, person 7 is very likely Wei Chen (0007) with the zeros
dropped.

What I could not do is name all 32. I have counts and three examples. If my manager asks "which
ones?", I don't have the list. I'd call that half of the second part of the task.

## Single Ease Question

5 out of 7. The pair-versus-row control was right where the decision lives and said what it did,
and the match report reads as sentences. Points off because "Show the 32 rows" showed 3, the
per-value links showed samples only, and there is no way to get the full list of unmatched ids out
as text.

## Would I use this instead of my current tool?

For this job -- checking a join before I trust it -- the match report is better than what I get
from pandas without writing it myself: it counts unmatched ends per column, notices the leading-
zero mismatch, notices the repeated key, and tells me what it did about each. That is the
validation pass I write by hand every quarter. If it let me copy the full list of unmatched rows
and let me decide that 7 and 0007 are the same person, I'd use it for the check and then still
export to Python for the analysis. As it stands, I'd use it to find out that something is wrong,
then go to pandas to find out exactly what. So: for the first look, not instead of my scripts.
