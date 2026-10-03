# Session: badge swipes into one person-building network -- Analyst Alex

Task as given by the moderator: "Three spreadsheets are open on the program's import page: a list
of people, a list of buildings, and a log of badge swipes saying which person entered which
building and when. If you do not work with building access, treat this as example data. Make one
network in which each person is tied to each building they entered -- however often the same
person went into the same building, they should be tied once -- and work out which swipes name a
person or a building that is not on the lists."

All commands were run from design/ui/prototype. D = tmp/round-8-sessions/r8-t24--analyst-alex
(absolute path used in the real runs).

## Step 1 -- the start screen (shots/tasks/r8-t24/01.png)

Okay, import page, three tables on the left: people 412, buildings 9, entries 4,212. Good, those
are counts I can check. "Local only" up top -- I'll take that as "this stays on my machine",
which is the first thing I'd want to know. The people table is open. Match report says 412 rows,
1 repeated key, 14 people with no entries. Priya Nair is in there twice, 1188, two badge numbers.
Fine, it kept the first.

The strip across the top: "person (411) --entries (4,180 edges from 4,212 rows)--> building (9)".
4,180 edges. Hmm. 411 people times 9 buildings is 3,699 pairs at most, so 4,180 can't be "one
per pair". It's one per swipe, minus the ones that didn't match. So it's not doing what I want
yet. Need to find where to change that -- probably on the entries table.

## Step 2 -- open the entries table

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t24 --click "entries"

There it is. "Each row is: a node / an edge", and next to it "One edge per: Row | Pair". Row is
selected. Pair is what I want. Also the bad rows are already flagged in yellow: person 7 "Not in
people", 1530 "Not in people", B12 "Not in buildings". And the report at the bottom spells it
out: 25 person_id values (25 rows) not in people, 7 building_id values (7 rows) not in buildings,
"Show the 32 rows". So 32 bad swipes. That's the second half of the task basically handed to me.

One thing bugs me: "person_id is Number here and Category in people... 3 keys have leading
zeros (such as 0007)... 0007 and 7 stay two keys." So swipe "7" is flagged as not a person, but
Wei Chen in the people list is 0007. That's almost certainly the same guy and the badge system
dropped the zeros. It's telling me, which is honest, but it's not giving me a button to treat
them as the same. I'd fix that in pandas.

## Step 3 -- one edge per pair

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t24 --click "entries" --click "Pair"

Strip now says "1,306 edges from 4,180 of 4,212 rows". That's more like it -- under the
3,699 ceiling. It added a count column ("the number of rows per pair") as the weight, and a
"time (earliest)" and "time (latest)". 1001 into B1 22 times. That's actually nice, I didn't
have to do a groupby. The bottom line reads "4,180 entries became 1,306 person-building edges --
32 rows with an end not in people or buildings are left out." That's a sentence I can paste.
The popup at the bottom covers the end of the report, but it has an Undo, fine.

"Higher means Stronger / Farther / Capacity" -- no idea why I'd care, ignored it.

## Step 4 -- see the bad swipes

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows"

It says "Showing the rows with an end not matched: 3 of the 7 sample rows." So it filtered the
little preview, not the whole file. I asked for 32 rows and got 3. I wanted the list of 32 so I
can hand it to whoever runs the badge system. Is there an export? I don't see one here.

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t24 --click "entries" --click "Pair" --click "25 person_id values (25 rows)"

Same deal -- "2 of the 7 sample rows". Okay so I know the counts (25 bad people ids, 7 bad
building ids, 32 rows) and examples (7, 1530, B12) but not the full list.

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t24 --click "entries" --click "Pair" --click "3 keys"

Leading zeros: the swipe with "7" is the one. Confirms my guess. Still no "match ignoring leading
zeros" option that I can see. I'd write that in my notes: 1 of the 25 "unknown people" is
probably Wei Chen.

## Step 5 -- load it

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

Graph. Summary on the right: 420 nodes (411 person, 9 building), 1,306 edges, directed, weight
"count, stronger", isolated nodes 14. 411 + 9 = 420, and the 14 isolated are the 14 people with
no swipes from step 1. Counts line up with what the import said. Good. It's a hairball, but
that's not what I was asked for. "Node weight: floors (building)" -- I didn't ask for that,
whatever.

## Step 6 -- can I get back to the bad rows after loading?

    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "from 3 tables"

Yes, "from 3 tables" takes me back to the entries table with the same match report. So the
"32 rows left out" doesn't vanish once I load. That matters -- in Gephi the import report is a
dialog you close and it's gone.

## Done

Did I succeed? Mostly. The network is built with one tie per person-building pair (1,306 edges,
with a swipe count on each). For the bad swipes I can say: 32 swipes left out, 25 naming a
person id not on the people list (for example 7 and 1530) and 7 naming a building not on the
buildings list (for example B12). What I could not do is see or export all 32 rows -- "Show the
32 rows" showed me 3. And I would flag that "7" is likely 0007 Wei Chen.

Single Ease Question: 6 out of 7. The dedupe was one click once I spotted "Pair", and the match
report did the checking for me. Lost a point because "show the 32 rows" doesn't show 32 rows,
and because the strip first said "4,180 edges" which I had to do arithmetic on to realize it was
per swipe, not per pair.

Would I use this instead of my current tool? For this job -- yes, probably. Right now this is
pandas: read three CSVs, merge with indicator=True, drop_duplicates, groupby for the count, then
export to Gephi. Here the merge check, the dedupe and the count happened on one screen and it
told me in a sentence what it left out. But I'd still want the 32 unmatched rows as a CSV I can
open in Excel; until I can get that I'd still run the anti-join in Python for the list.
