# Session: three security spreadsheets into one picture -- Morgan Reyes (screen-reader analyst)

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes
point at a person or a building that is not on those lists."

Renders are in `tmp/round-7-sessions/t18--screen-reader-analyst/`. All commands ran from
`design/ui/prototype`, with D set to that render folder.

## Start screen (shots/tasks/t18/01.png)

Title "Door entries, March 2026". I'm already in some kind of import screen: "Open as a new
graph", "Esc to leave". There's a list called "Tables": people 412, buildings 9, entries 4,212.
Good, real words and counts, said up front. Then a line labeled "Makes": "person (412)
--entries (4,180 edges from 4,212 rows)--> building (9)". That's an edge list written as ASCII
art. At my speed that arrow will be read as "dash dash entries open paren..." -- I'd rather hear
"person to building, 4,180 edges". But the numbers are there before I asked for them, which is
more than Gephi ever did.

Already a gap: 4,212 rows, 4,180 edges. So 32 rows did not become edges. I bet that is my answer,
but I'm not reporting a number I inferred from a subtraction.

The people table is selected. "Match report: people. 412 rows, 1 repeated key (kept the first).
14 people have no entries (kept, unconnected)." Noted. A repeated key means 411 distinct people,
yet the Makes line says person (412). One of those is wrong, or "412" means rows, not people.

Also "Direction: As the file says / Directed / Undirected" at the bottom, Directed picked. Fine,
a swipe is person to building.

## Step 1: open the swipes table

    timeout 120 node app-b/study.mjs --try $D/01.png task:t18 --click "entries"

Now: "Each row is an edge, person to building. One edge per Row." Columns person_id "From ->
person", building_id "To -> building", time. It already linked the swipes to the other two
tables; I did not have to tell it. Some cells say "Not in people" or "Not in buildings" next to a
warning icon. Text, not just a yellow outline. Good -- if those are real words to the screen
reader and not just a tooltip.

The match report for entries is the part I came for:
- "4,212 rows; 4,180 have both ends."
- "25 person_id values (25 rows) are not in people." Choice: "Add as people" / "Leave out" (Leave
  out is on).
- "7 building_id values (7 rows) are not in buildings." Same choice.
- "Show the 32 rows."
- "No Edge id column: notes on entries may move if the row order changes."
- "person_id is Number here and Category in people: matched as text. 3 keys differ only by
  leading zeros (not merged)."
- "4,180 entries became 4,180 person-building edges."

25 plus 7 is 32, and 4,212 minus 32 is 4,180. The arithmetic closes. That's the answer to the
question as asked.

But the leading-zero line worries me. The sample shows a swipe by person "7" flagged "Not in
people", and the people table has "0007 Wei Chen". That is almost certainly the same badge
number, exported once as a number and once as text. So some of the 25 "missing people" are not
missing at all; they're a formatting accident.

## Step 2: the leading-zero keys

    timeout 120 node app-b/study.mjs --try $D/02.png task:t18 --click "entries" --click "3 keys"

It filtered the table: "Showing the rows whose key differs only by leading zeros: 1 of the 8 sample
rows. Show all rows." One row: 7, B4. So it knows about it, but it only shows me the sample.
"3 keys" -- three distinct values? How many swipes do those three keys account for? It does not
say. "25 person_id values (25 rows)" gave me both numbers; this line gives me only one. And there
is no "merge them" choice here, only "(not merged)". So I cannot fix it from this screen, and I
cannot say exactly how many of the 25 are false alarms.

## Step 3: the 32 rows

    timeout 120 node app-b/study.mjs --try $D/03.png task:t18 --click "entries" --click "Show the 32 rows"

The link said 32 rows. What I got: "Showing the rows with an end not matched: 3 of the 8 sample
rows." Three rows. The link promised 32 and delivered 3. I understand it is a sample, but the
words on the link and the words on the result disagree, and I'd hear both. If I want to paste the
32 bad rows into an email to the security team, I don't see how. No copy, no export here that I
found.

    timeout 120 node app-b/study.mjs --try $D/04.png task:t18 --click "entries" --click "Show all rows"

"Nothing on screen is called Show all rows." My mistake -- that link only exists after the
filter. Not counting that against it.

## Step 4: make the picture

    timeout 120 node app-b/study.mjs --try $D/05.png task:t18 --click "Load"

It went to the graph view. A box: "Reading 3 tables. people.csv, buildings.csv, entries.csv: 421
nodes, 4,180 edges..." with a progress bar and Cancel. Left side: Selection, Notes, Everything,
"Analyze (Shift+A) to add results here". Top bar still says "Local only" -- that's the one thing
I'd ask first, so good that it's always there; I'd still want to hear what "local only" covers.

421 nodes. 412 plus 9 is 421. But a minute ago it said one person key was repeated and it kept the
first. That should give 411 people and 420 nodes. So either the repeated key is counted twice in
the graph, or the "412" is rows and the node count is wrong. I'd stop here and ask, and I would
not put 421 in a report.

    timeout 120 node app-b/study.mjs --try $D/06.png task:t18 --click "Load" --click "Everything"

Everything: "Paints 421 nodes, 4,180 edges. Default look, under every other row." Style controls,
Nodes / Edges. At the bottom: "Table", "Nodes", "Edges". The picture itself is still "Reading 3
tables". I never heard "done". It may still be loading; I'll assume the picture is made, because
it told me the node and edge counts, but I didn't get the "it's finished" announcement I'd want.

## Stopping

I'll stop. The picture is the person-to-building graph with 4,180 swipe edges, and the tool did
that linking for me without my naming a single join column.

My answer: **32 swipes** point at something not on the lists: 25 swipes whose person is not in
people, and 7 whose building is not in buildings. Caveat I'd put in writing: at least one of the
25 (person 7 versus 0007) is the same badge written two ways, and the tool reports 3 such keys
without saying how many swipes they cover, so the real number of unknown people is 25 minus
something.

## Verdict

- **Succeeded?** Mostly. I have the 32 and the picture is built. I'm not confident in the 421
  node count, and I can't give the corrected number of truly unknown people.
- **Single Ease Question:** 5 of 7. The match report did the hard part and said it in sentences
  with counts. It lost points for "Show the 32 rows" showing 3, for "3 keys" without a row count
  and with no way to merge them, for the ASCII arrow line, and for a node count that does not
  agree with the "repeated key" message.
- **Would I use it instead of my current tool?** For this job, not instead of pandas -- a merge
  with `indicator=True` gives me the 32 rows as a frame I can save, and I'd catch the leading
  zeros by casting both sides to int. But I'd use this match report as a first look on a new
  extract: it told me about the unmatched rows, the leading zeros and the repeated person without
  my asking, which is exactly the check I usually write by hand. If I could copy those 32 rows out
  as CSV, I'd use it for that every quarter.
