# Session: badge swipes to a person-building network -- Marcus, criminal intelligence analyst

Task as given: "Three spreadsheets are open on the program's import page: a list of people, a
list of buildings, and a log of badge swipes saying which person entered which building and when.
If you do not work with building access, treat this as example data. Make one network in which
each person is tied to each building they entered -- however often the same person went into the
same building, they should be tied once -- and work out which swipes name a person or a building
that is not on the lists."

All commands run from design/ui/prototype. Renders in
tmp/round-8-sessions/r8-t24--intelligence-analyst/.

## 01 -- start screen (shots/tasks/r8-t24/01.png)

Think-aloud: "OK, import page, three tables on the left: people 412, buildings 9, entries 4,212.
It's showing me people. id is the Key, name is the Name, dept and badge are attributes. Fine.
Up top it already says person (411) --entries (4,180 edges from 4,212 rows)--> building (9).
So it's already dropped 32 swipes somewhere and it's going to make 4,180 lines. That's one line
per swipe -- that's the hairball I don't want. 412 rows but 411 people -- the report says one
repeated key, Priya Nair is in there twice with two badge numbers. Kept the first. Hm, which
badge did it keep? Not my question today, but I'd want to know. 'Local only' up top -- good,
that's the first thing I look for. The swipes table is where the work is. Clicking entries."

## 02 -- entries table

Command: `timeout 120 node app-b/study.mjs --try .../02.png task:r8-t24 --click "entries"`

Think-aloud: "There we go. person_id is From -> person, building_id is To -> building, time is
Time. It figured all that out on its own, which saves me the column-mapping dance. Bad rows are
boxed in yellow right in the table: 7 'Not in people', 1530 'Not in people', B12 'Not in
buildings'. The report at the bottom: 25 person ids in 25 rows aren't in people, 7 building ids
in 7 rows aren't in buildings, 'Show the 32 rows'. That's the second half of my task, right
there, before I did anything.

Now the 'tied once' part. 'One edge per: Row | Pair'. Row is lit. Pair -- one line per person and
building pair. That's what I want. It's the pivot table I'd build in Excel."

Aside: "Wait -- 7 'Not in people', and the people list has a 0007, Wei Chen. And it says 'ids
match as written, so 0007 and 7 stay two keys.' Somebody dropped the leading zeros in Excel. I
bet 7 IS Wei Chen. That's exactly the kind of thing I fix first in a phone dump. It tells me, I'll
give it that, but I don't see a button to say 'treat these as the same'."

## 03 -- one edge per pair

Command: `... --click "entries" --click "Pair"`

Think-aloud: "Top line now reads 1,306 edges from 4,180 of 4,212 rows. The banner says one row
per pair, each is one edge, its count the rows it merged. And I get a time (earliest) and
time (latest) and a count column as the weight -- 1001 into B1, 22 times, first on the 2nd, last
on the 27th. That's better than I asked for: one line, and I don't lose how often. Good. The
toast at the bottom explains what just happened and gives me Undo. 'Higher means Stronger /
Farther / Capacity' -- don't know what Farther or Capacity would mean for a door swipe, leaving it
on Stronger. Report at the bottom now says '4,180 entries became 1,306 person-building edges --
32 rows with an end not in people or buildings are left out.' Clear."

## 04 -- show the 32 rows

Command: `... --click "entries" --click "Pair" --click "Show the 32 rows"`

Think-aloud: "Filters the table to the bad rows. But it says '3 of the 7 sample rows' -- so I'm
looking at a sample, not all 32. There's 'Show all rows'. I'd want the whole 32 in a list I can
send to the facilities guy, or export to Excel. I don't see an export on this screen."

## 05 -- unknown person ids

Command: `... --click "entries" --click "Pair" --click "25 person_id values (25 rows)"`

Think-aloud: "Same thing, just the person side: 7 into B4, 1530 into B2. Each is one swipe.
Fine. There's 'Add as people' or 'Leave out' -- Leave out is already on. I'm not adding unknown
badges as people; they're not on the roster, that's the finding. Leave out."

## 06 -- leading zeros

Command: `... --click "entries" --click "Pair" --click "3 keys"`

Think-aloud: "Shows me the one sample row, 7 into B4. So it knows these differ only by zeros and
still calls them 'not in people'. I'll write it in my notes as 'probably Wei Chen, 0007, check the
badge'. I'd rather it gave me a 'match ignoring leading zeros' switch. It says 'nothing is
trimmed' like that's a feature. For court, fine, I don't want it guessing silently -- but give me
the option."

## 07 -- load

Command: `... --click "entries" --click "Pair" --click "Load"`

Think-aloud: "Network's up. 420 nodes -- 411 person, 9 building -- 1,306 edges, directed, weight
'count, stronger'. 14 isolated nodes, the 14 people with no swipes the report warned about.
Picture is a gray hairball with nine hubs, every dot the same. I can't tell a building from a
person without clicking. That's not a link chart to me -- give the buildings a building icon. But
the task was to make the network, and the numbers match what the import said."

## 08 -- did the bad-swipe list survive?

Command: `... --click "entries" --click "Pair" --click "Load" --click "from 3 tables"`

Think-aloud: "'from 3 tables' takes me back to the entries table in edit mode, and the match
report is still there: 25 person ids, 7 building ids, show the 32 rows. Good -- I didn't lose the
exception list by loading. Still no export of those 32 that I can see."

Stopped here.

## Wrap-up

Did I succeed? Yes. One network, one line per person-building pair (1,306), and the bad swipes
identified: 32 of them -- 25 naming a person not on the roster (for example 7 and 1530) and 7
naming a building not on the list (for example B12). I'd flag that 7 is very likely 0007 Wei Chen
with the zeros stripped.

Single Ease Question: 6 of 7. The Row/Pair switch was the whole job and it was right there; the
bad rows were flagged before I asked. Docked one point because I could only see samples of the
32 rows, not export the list, and there's no way to match 7 to 0007.

Would I use this instead of my current tool? For this step, yes over Excel: the pivot and the
VLOOKUP-for-orphans are what I'd do by hand, and here it was one click, with a count and first
and last dates kept on the line, and 'Local only' on the screen. For the chart I hand a sergeant,
not yet: every dot looks the same, no person or building icons, and I need that exceptions list
out of the program as a file.

## Problems noted

- Only a sample of the 32 unmatched rows is visible ("3 of the 7 sample rows"); no visible way
  to export or copy the full exceptions list.
- An id stripped of leading zeros (7 vs 0007) is reported but cannot be matched; no option to
  match ignoring leading zeros.
- "Number here and Category in people: matched as text" -- type jargon a non-programmer has to
  decode.
- "Higher means Stronger / Farther / Capacity" on a swipe count is unexplained.
- Loaded graph draws people and buildings as identical gray dots.
- The duplicate person key (Priya Nair, two badges) keeps "the first" without saying which badge.
