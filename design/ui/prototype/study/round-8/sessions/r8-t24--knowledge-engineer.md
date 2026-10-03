# Session: building-access network, one tie per person and building, plus unmatched swipes

Participant: Dr. Min-ji Kim, knowledge graph engineer (simulated persona).
Task given: "Three spreadsheets are open on the program's import page: a list of people, a list
of buildings, and a log of badge swipes saying which person entered which building and when.
Make one network in which each person is tied to each building they entered -- however often
the same person went into the same building, they should be tied once -- and work out which
swipes name a person or a building that is not on the lists."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t24--knowledge-engineer/.

## 01 -- start screen (shots/tasks/r8-t24/01.png)

Import page, three tables on the left: people 412, buildings 9, entries 4,212. The people
table is selected. Up top there is a line that reads like a schema: "person (411) --entries
(4,180 edges from 4,212 rows)--> building (9)". Good. That is the first thing I want: what the
tool thinks my data IS, as a domain-range statement, before it draws anything. 412 rows but
411 persons -- and the match report explains it: "1 repeated key (kept the first)". Priya Nair,
1188, twice, with two badge numbers. I would not have silently kept the first -- that is a
second badge, not a duplicate person -- but at least it told me.

But "4,180 edges from 4,212 rows" -- that is one edge per swipe. That is not what I was asked
for. I want one edge per person-building pair. Let me look at the swipe table.

## 02 -- click the swipe table

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24 --click "entries"

Now the toolbar says "Each row is: a node / an edge" (edge selected), "person to building",
"One edge per: Row | Pair". There it is. Pair is what I want.

The match report already answers the second half of the question, more or less:
- 4,212 rows; 4,180 have both ends.
- 25 person_id values (25 rows) are not in people, for example 7 and 1530.
- 7 building_id values (7 rows) are not in buildings, for example B12.
- "Show the 32 rows."
- And then the one that matters: "person_id is Number here and Category in people: matched as
  text. 3 keys have leading zeros (such as 0007): ids match as written, so 0007 and 7 stay two
  keys."

So "7" in the swipe log is almost certainly 0007, Wei Chen, with the zeros eaten by whoever
exported the log to a spreadsheet. The tool is right not to guess -- I would rather it refused
to coerce than silently merged two identifiers -- but it means some of those 25 "unknown
people" are not unknown at all; they are a datatype problem. I note that for the answer.

## 03 -- one edge per pair

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t24 --click "entries" --click "Pair"

The header now reads "person (411) --entries (1,306 edges from 4,180 of 4,212 rows)-->
building (9)". A toast explains: rows with the same two ends make one edge, the other columns
combine, and count -- the number of rows per pair -- becomes the weight. Time splits into
"time (earliest)" and "time (latest)", marked derived, count marked derived. That is honest: it
tells me which columns it invented. 1001 to B1 has count 22. The rows with a missing end show
"left out" in the count column. Good -- they did not quietly become nodes. The "Leave out"
choice is the default for both the unknown people and the unknown buildings; "Add as people"
would have invented 25 persons from bare ids, which is exactly what I do not want.

## 04 -- show the 32 rows

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows"

It filters the grid, but the banner says "Showing the rows with an end not matched: 3 of the 7
sample rows." Three rows: 7 / B4, 1530 / B2, 1214 / B12. So it filters the preview, not the
file. I asked for 32 and got 3. "Show all rows" next to it is the way back to the unfiltered
preview, not "show me all 32".

## 05 -- the person ids not in people

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t24 --click "entries" --click "Pair" --click "25 person_id values (25 rows)"

Same thing: "2 of the 7 sample rows." 7 and 1530. I still do not have the 25 values.

## 06 -- the leading-zero keys

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t24 --click "entries" --click "Pair" --click "3 keys"

"1 of the 7 sample rows": the 7 / B4 row. Confirms my suspicion about 7 versus 0007, but not
which of the 25 are the other two leading-zero cases. I cannot find a control that says "match
ignoring leading zeros" or "treat person_id as text with padding". I would fix that upstream in
the export anyway, so I do not go hunting.

## 07 -- load

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

Graph view. Right panel summary: Nodes 420 (person 411, building 9), Edges 1,306, Directed,
Weight "count, stronger", Isolated nodes 14 -- the 14 people with no swipes, which the people
report mentioned earlier. 411 + 9 = 420. 1,306 matches what the import promised. Numbers
reconcile with each other, which is my known-answer check here. The picture itself is a
hairball of 420 gray dots with nine hubs; I ignore it.

## 08 -- back to the sources

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "from 3 tables"

"from 3 tables" in the graph panel takes me back to the same import screen, now titled "Edit:
entries", with the match report intact. Good: the report about what was dropped survives the
load, it is not a one-shot dialog. Still the same 7-row preview, though.

## 09 -- the edges table

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "Edges"

(The tool warned "Edges" matched two controls and clicked the first; it opened the table.)
"1,306 edges from entries.csv, one per person and building", with person_id, building_id,
count, earliest and latest time. That is the deduplicated edge list I wanted, stated in words.
The rows with unknown ends are not here, as expected, so this is not where I find them either.

## Where I stopped

The network: done. 420 nodes, 1,306 person-to-building edges, one per pair, with the number of
swipes kept as a count. I trust that part.

The bad swipes: partially. I know there are 32 rows -- 25 rows naming 25 person ids not in the
people list (examples 7 and 1530), 7 rows naming building ids not in the building list (example
B12) -- and that at least some of the "unknown people" are leading-zero casualties (7 is very
likely 0007). What I could not get is the full list of 32 rows. Every "show" link filters a
7-row preview and says "N of the 7 sample rows". If my manager asked me "which swipes?" I would
have to say "32, here are three, the rest are in the file somewhere", and then open the CSV in a
spreadsheet and do the anti-join myself. That is the thing I came to the tool to not do.

## Verdict

- Succeeded? Half. The network yes, fully. "Which swipes" -- I have the counts and three
  examples, not the list. I would call that not done.
- Single Ease Question: 5 of 7. Getting one edge per pair was one click and clearly labeled.
  The match report is the best import report I have seen in a graph viewer: it names what it
  dropped, why, and the datatype mismatch, and it does not invent nodes. It loses points because
  the "show the 32 rows" link does not show 32 rows.
- Would I use this instead of my current tool? For a quick look at a join between three tables,
  yes, over Gephi -- it told me what it did with every row, which Gephi never does. But my
  current tool for this question is SPARQL or pandas, and an anti-join there gives me all 32
  rows with one query. Until the unmatched rows can be listed or exported in full, I would load
  here and still check the orphans in a notebook. And it is still a CSV path; nothing here
  changes my "not for RDF" note.

## Problems noted

1. "Show the 32 rows", "25 person_id values (25 rows)" and "3 keys" filter only the 7-row
   preview ("3 of the 7 sample rows"). There is no way to see or export the full set of
   unmatched rows, which is the second half of the task.
2. A leading-zero mismatch (7 versus 0007) is reported, but there is no offered way to match
   those keys, and no list of which of the 25 unknown ids are leading-zero cases versus truly
   unknown people.
3. "1 repeated key (kept the first)" in people silently picks one of Priya Nair's two badge rows;
   keeping the first is a merge decision I was not asked about.
4. Minor: the label "Edges" is on two controls in the graph view.

## Things that worked

- One click from "One edge per Row" to "Pair", with a plain toast saying what it does and that
  count becomes the weight.
- Derived columns (earliest time, latest time, count) are labeled "derived".
- Unmatched ends default to "Leave out", not to inventing nodes, and the report says so.
- The schema line at the top ("person (411) --entries (1,306 edges ...)--> building (9)") and the
  graph summary reconcile exactly: 411 + 9 = 420 nodes, 1,306 edges, 14 isolated.
