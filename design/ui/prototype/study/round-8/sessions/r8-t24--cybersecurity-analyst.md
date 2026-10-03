# Session: tie people to buildings once, find swipes naming unknown people or buildings

Participant: Priya, threat hunter in a corporate SOC (persona: study/personas/cybersecurity-analyst.md)

Task as given: "Three spreadsheets are open on the program's import page: a list of people, a list of
buildings, and a log of badge swipes saying which person entered which building and when. ... Make one
network in which each person is tied to each building they entered -- however often the same person went
into the same building, they should be tied once -- and work out which swipes name a person or a building
that is not on the lists."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t24--cybersecurity-analyst/.

## Step 1 -- start screen (shots/tasks/r8-t24/01.png)

Think-aloud: "OK, first thing I look for: 'Local only' chip up top. Good, that answers where it runs, if
I believe it. Doesn't say whether it calls out, but fine, it's a study. Badge data is physical access
logs -- same deal as auth logs, I'd only bring a scrubbed copy.

There's a line across the top in monospace, almost like a query: 'person (411) --entries (4,180 edges
from 4,212 rows)--> building (9)'. I like that. That's the shape of the thing in one line. But wait --
the people table says 412 rows and the graph says 411 people. Match report explains it: '1 repeated key
(kept the first)'. Priya Nair, 1188, twice, two different badge numbers. That's a real finding, not
noise -- one person with two badges is something I'd ask physical security about. It kept the first and
moved on. Fine for the graph, but I want to know which badge it threw away.

4,180 edges from 4,212 rows. So 32 rows got dropped. And 4,180 edges means it's one edge per swipe right
now. That's not what I asked for. The swipes are on the entries table, so I go there."

## Step 2 -- open the swipe log

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24 --click "entries"

Think-aloud: "Now this is the good part. Rows with bad ids are flagged right in the grid, yellow: '7 Not
in people', '1530 Not in people', 'B12 Not in buildings'. Match report: 25 person_id values not in
people, 7 building_id values not in buildings, 'Show the 32 rows'. 25 plus 7 is 32, and 4,212 minus 4,180
is 32. Counts add up. That's rare enough that I'll say it out loud.

There's a control 'One edge per  Row | Pair'. Row is selected. Pair is obviously what I want -- one tie
per person-building pair."

## Step 3 -- one edge per pair

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t24 --click "entries" --click "Pair"

Think-aloud: "Top line now: '1,306 edges from 4,180 of 4,212 rows'. Time column split into earliest and
latest, and a count column that becomes the weight. 1001 to B1, 22 times, first 03-02 07:58, last 03-27
17:12. That's exactly what I'd have done with a stats count by person,building in Splunk. First seen /
last seen per pair for free -- I didn't even ask for that and it's the right thing. Toast explains it and
gives me Undo. Good.

Not sure I want the count to be 'Stronger' weight, but I don't care for this task."

## Step 4 -- look at the bad swipes

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows"

Think-aloud: "'Showing the rows with an end not matched: 3 of the 7 sample rows.' Three rows. I clicked
'Show the 32 rows' and got three. It says 'sample rows' -- so it's only filtering the preview it has
loaded, not the whole file? That's misleading. The link promised 32. If I'm writing this up I need all 32,
with timestamps, as a list. 'Show all rows' next to it -- does that mean all 32 bad rows, or turn the
filter off? I can't tell, and I'm not going to gamble."

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t24 --click "entries" --click "Pair" --click "25 person_id values (25 rows)"

Think-aloud: "Same thing: '2 of the 7 sample rows'. The counts in the report are what I trust here: 25
swipes with an unknown person, 7 swipes with an unknown building, examples 7, 1530 and B12. I can name the
three I can see but not the other 29."

## Step 5 -- that '7' bothers me

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t24 --click "entries" --click "Pair" --click "3 keys"

Think-aloud: "Person 0007 is Wei Chen in the people list. The swipe log says 7. The tool says 'ids match
as written, so 0007 and 7 stay two keys' and flags 7 as not in people. It's honest about it, which I
respect -- it didn't silently pad. But that's almost certainly Excel eating leading zeros, not an
unknown person. So of the 25 'unknown people', some are probably not unknown at all. I'd want a 'match
ignoring leading zeros' switch right there. I don't see one. 'Add as people' would be wrong -- that would
make a second Wei Chen. So I leave it, and in the write-up I'd mark 7 as 'probably 0007, check'."

## Step 6 -- load it

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

Think-aloud: "Loaded fast. Summary on the right: 420 nodes, 411 person, 9 building, 1,306 edges, weight
count, 14 isolated nodes -- that's the 14 people with no swipes, matches what the people report said.
Hairball in the middle, nine hubs, which are obviously the buildings. Don't care about the picture.
Network: done."

## Step 7 -- can I still get the bad swipes after loading?

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "from 3 tables"

Think-aloud: "'from 3 tables' takes me back into the import with the match report intact. Good, the
evidence didn't vanish on load. Still no way to get the 32 rows out."

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t24 --click "entries" --click "Pair" --click "Show the 32 rows" --click "Export"
    -> nothing on screen is called "Export"

Think-aloud: "No export. I can't get these out as a CSV. For the case I'd go back to the raw file and do
a lookup in Excel or pandas -- which is exactly the work I hoped the tool would save me. Stopping here."

## Outcome

Did I succeed? Partly. The network is right: one tie per person-building pair, 1,306 of them, with first
and last swipe and a count -- that part was easy and I'd trust it. The bad swipes: I know how many there
are (25 with an unknown person, 7 with an unknown building, 32 total, and the arithmetic checks out) and
three examples (7 at B4, 1530 at B2, 1214 at B12). I could not see or export the full list of 32, and
'Show the 32 rows' showed me three. I also think some of the 25 are a leading-zero problem (7 vs 0007),
not strangers, and the tool flagged that but gave me no way to fix it.

Single Ease Question: 5 of 7. The network was a 6. Getting the actual list of bad swipes was a 3.

Would I use this instead of my current tool? For this kind of join-and-reconcile, not yet. The match
report is better than what I get from a lookup in Excel -- counts that add up, bad ids flagged in place,
the duplicate person and the leading-zero trap called out before I hit them. But the whole point of the
second half of the task is a list I can hand to physical security, and I couldn't get that list out. If
'Show the 32 rows' showed 32 rows and I could export them as a CSV, I'd use this for the reconciliation
step and keep pandas for the rest.

## Problems noted

- 'Show the 32 rows' shows only the bad rows inside the preview sample (3 of 7), not the 32. The link
  promises something the screen does not deliver; severity high for this task.
- No way to export the unmatched rows (or the match report) as a CSV.
- Leading-zero mismatch (7 vs 0007) is explained but not fixable from the report; 'Add as people' would
  create a duplicate person. No 'match ignoring leading zeros' option visible.
- The repeated person key (Priya Nair, two badges) is resolved by 'kept the first' -- I cannot see which
  badge was dropped from the summary line alone.
- 'Show all rows' next to a filter is ambiguous: all rows of the file, or all bad rows?

## What worked

- The one-line summary 'person (411) --entries (1,306 edges from 4,180 of 4,212 rows)--> building (9)':
  reads like a query, updates as I change settings, and the counts reconcile.
- Bad ids flagged inline in the grid, in the same place I'm looking.
- 'One edge per Pair' gave count plus earliest and latest time per pair, with an Undo.
- The match report survives Load and is one click away from the graph's summary.
