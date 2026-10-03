# Session: badge swipes to a person-building network (Grace, nonprofit operations analyst)

Task as given: "Three spreadsheets are open on the program's import page: a list of people, a list
of buildings, and a log of badge swipes saying which person entered which building and when. If you
do not work with building access, treat this as example data. Make one network in which each person
is tied to each building they entered -- however often the same person went into the same
building, they should be tied once -- and work out which swipes name a person or a building that
is not on the lists."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t24--nonprofit-operations-analyst/.
Every command was run from design/ui/prototype.

## 01 -- the start screen

Screen: shots/tasks/r8-t24/01.png. The "people" table is selected, with a list of tables on the
left (people 412, buildings 9, entries 4,212), a preview of the first 8 people, and a "Match
report" underneath.

Thinking aloud: OK, first thing, counts. people says 412 but the line across the top says
"person (411)". Why one less? The report tells me: "1 repeated key (kept the first)". I can see it
in the preview -- Priya Nair is in there twice, 1188, with two badge numbers. Fine, that is a real
thing in our data too, people get a replacement badge. Good that it told me.

The line at the top -- "person (411) --entries (4,180 edges from 4,212 rows)--> building (9)" --
looks like code. I can sort of read it: people go to buildings through entries. But 4,180 edges
from 4,212 rows already tells me something is off with the swipes. I want to see the swipes.

## 02 -- the swipe log

Command:
    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24 --click "entries"

Screen: the entries table, person_id, building_id, time. Some cells have a yellow outline and
"Not in people" or "Not in buildings". At the top: "Each row is a node / an edge", then "One edge
per Row | Pair".

Thinking aloud: this is the part I care about. Rows with problems are marked right in the cell,
like conditional formatting in Excel -- I get that immediately. "7 Not in people", "1530 Not in
people", "B12 Not in buildings". And the report says "25 person_id values (25 rows) are not in
people" and "7 building_id values (7 rows) are not in buildings", total "Show the 32 rows". That
answers half my task already.

Now "tied once". I see "One edge per Row" and "Pair". Row is selected. If each row is a swipe,
then Row means every swipe is its own line, and 1001 into B1 twice would be two lines. Pair must
be "one line per person-and-building pair". I will try Pair.

## 03 -- one edge per pair

Command:
    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t24 --click "entries" --click "Pair"

Screen: the top line now says "1,306 edges from 4,180 of 4,212 rows". The table gets "time
(earliest)", "time (latest)" and a "count" column; 1001 to B1 shows 22. A message at the bottom
explains: rows with the same two ends make one edge, count is the number of rows per pair. The
report says "4,180 entries became 1,306 person-building edges -- 32 rows with an end not in people
or buildings are left out."

Thinking aloud: this is exactly it. 1,306 ties, and I even get how many times and first and last
time, which I did not ask for but my director would. 4,180 plus 32 is 4,212 -- that matches the
row count Excel would give me. I like that the sums are spelled out in a sentence.

The "Weight / Higher means Stronger / Farther / Capacity" bit I do not understand and I will leave
it alone.

## 04 -- show the bad rows

Command:
    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows"

Screen: the table filters to three rows: 7 / B4, 1530 / B2, 1214 / B12. The blue strip says
"Showing the rows with an end not matched: 3 of the 7 sample rows."

Thinking aloud: hang on. I asked for 32 rows and I see 3. "3 of the 7 sample rows" -- so it is
only filtering the little preview, not all 4,212? That is not what "Show the 32 rows" says. I need
all 32 to send back to whoever runs the badge system. Where is the full list?

## 05 -- the unmatched people link

Command:
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t24 --click "entries" --click "Pair" --click "25 person_id values (25 rows)"

Screen: the same kind of filter, "2 of the 7 sample rows": 7 and 1530.

Thinking aloud: same thing, only the ones in the preview. I still only know three of the 32 by
name: person 7, person 1530, building B12. The report says "for example 7 and 1530" -- for
example. I cannot hand my manager "for example".

## 06 -- the leading zeros line

Command:
    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t24 --click "entries" --click "Pair" --click "3 keys"

Screen: filters to the one sample row with person 7. The report line reads "person_id is Number
here and Category in people: matched as text. 3 keys have leading zeros (such as 0007): ids match
as written, so 0007 and 7 stay two keys."

Thinking aloud: oh, I know this one. Wei Chen is 0007 in the people list. Excel eats leading zeros
all the time -- somebody opened the swipe log in Excel and 0007 became 7. So person "7" is almost
certainly Wei Chen, not a stranger. The app noticed it and then... just did nothing? It tells me
they "stay two keys" and offers no button to say "treat 7 as 0007". So some of my "25 people not
on the list" are probably not real problems, they are Excel problems. I cannot tell how many.

## 07 -- look for a matching option on the column

Command:
    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t24 --click "entries" --click "Pair" --click "From -> person"

Screen: a menu: From ->, To ->, Subtype, Name, Time, Weight (grayed), Edge id, Position,
Attribute.

Thinking aloud: nothing here about zeros or matching. I give up on that and will note it for the
person who sends the file. Escape.

## 08, 09 -- look for a way to copy or export the bad rows

Commands:
    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows" --click "Copy"
    -> nothing on screen is called "Copy"
    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows" --click "Export"
    -> nothing on screen is called "Export"

Thinking aloud: no copy, no export, no download on the problem rows. In Excel I would just filter
and copy. Here I can see that 32 rows are bad but I cannot get the list out.

## 10 -- load it

Command:
    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

Screen: the graph view, a big hairball of gray dots. On the right: Nodes 420 (person 411, building
9), Edges 1,306 edges, Direction Directed, Weight "count, stronger", Isolated nodes 14.

Thinking aloud: 411 plus 9 is 420, 1,306 ties, same as before I pressed Load. 14 isolated -- those
are the 14 people from the first screen with no swipes. Good, the numbers carried through. That
is the network done. The 32 bad swipes were left out, which is what I wanted, but I still only know
three of them by name. I stop here.

## Outcome

- Did I succeed? Partly. The network is right: 420 people and buildings, 1,306 ties, one per
  person-building pair, and the count of swipes on each tie is a nice bonus. For the bad swipes I
  know there are 32 (25 with an unknown person, 7 with an unknown building) and the totals add up,
  but I can only name three of them (person 7, person 1530, building B12), because "Show the 32
  rows" only filtered the 7-row preview. And I suspect at least one of the "unknown people" is
  really Wei Chen with the zeros chopped off, and the app would not let me fix that.
- Single Ease Question: 5 of 7. Making the network was easy -- one click on "Pair". Getting the
  actual list of bad swipes was not possible.
- Would I use this instead of what I do now (Excel with VLOOKUP and a pivot table)? For the
  picture and the counts, maybe yes -- it did in two clicks what takes me a pivot table and a
  remove-duplicates, and it told me plainly what it dropped and why. For the data-quality check,
  no, not yet: until I can copy or download the 32 problem rows, I would still do the VLOOKUP in
  Excel to get the list, so I would end up doing the job twice.

## Problems noticed

1. "Show the 32 rows" and "25 person_id values (25 rows)" filter only the 7-row preview ("3 of the
   7 sample rows"). The label promises 32 rows and delivers 3. The full list is never shown.
2. No way to copy or export the unmatched rows to hand back to the data owner.
3. The leading-zero warning ("0007 and 7 stay two keys") spots a classic Excel problem and offers
   no fix; it also does not say how many of the 25 unknown people are really zero-stripped ids.
4. The top "Makes" line is written like code (arrows, parentheses, monospace); readable, but it
   looks like a formula, not a sentence.
5. "Higher means Stronger / Farther / Capacity" under count means nothing to me.
6. The network came out "Directed" without my choosing; I did not care here, but I did not know
   whether a person-building tie needs a direction at all.
