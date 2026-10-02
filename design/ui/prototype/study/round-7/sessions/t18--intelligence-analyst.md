# Session: door swipes into one chart -- Marcus, criminal intelligence analyst

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes point
at a person or a building that is not on those lists."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t18--intelligence-analyst/.

## 01 -- start screen (shots/tasks/t18/01.png)

Marcus: "OK, it's already got all three files in, on the left: people 412, buildings 9, entries
4,212. Good, that's the import screen I'd want. Top line says person, 412, entries 4,180 edges from
4,212 rows, to building, 9. So that's my chart in one line -- people swiped into buildings. And
straight off, 4,212 rows but 4,180 links. Thirty-two went somewhere.

People table: id is the key, name is the name. Hang on -- 0007 Wei Chen. Somebody's ID has
leading zeros. And 1188 Priya Nair is in there twice with two badge numbers. Bottom says '1 repeated
key (kept the first)'. Kept the first. So the second badge just disappears? In my world that's two
badges for one person, which is something I'd want to know, not something you throw out quietly.
'Local only' up top -- good. I read that as nothing leaves the machine."

## 02 -- click the swipes table

    timeout 120 node app-b/study.mjs --try .../02.png task:t18 --click "entries"

Marcus: "There it is. person_id is From, building_id is To, time is time. It worked that out by
itself; fine. It's flagging rows in yellow: '7 Not in people', '1530 Not in people', 'B12 Not in
buildings'. Match report: 4,212 rows, 4,180 have both ends. 25 person IDs not in people, 25 rows.
7 building IDs not in buildings, 7 rows. 'Show the 32 rows.' 25 plus 7 is 32, and 4,212 minus
4,180 is 32. The numbers agree with each other. That's my answer, at least the raw one: 32.

But look -- '7 Not in people'. The people list has 0007. That's Wei Chen. That's not an unknown
person, that's somebody's spreadsheet eating the zeros. And the report says it too: '3 keys differ
only by leading zeros (not merged)'. Not merged. So it knows they're probably the same person and
it's still counting them as strangers."

## 03 -- open the leading-zeros detail

    timeout 120 node app-b/study.mjs --try .../03.png task:t18 --click "entries" --click "3 keys"

Marcus: "It filters down to the one row in the sample: 7, B4. 'Show all rows' to see the rest.
Fine, it showed me. Now how do I tell it 7 is 0007? That's the first thing I do with any phone
dump -- fix the numbers."

## 04 -- try the person_id column menu

    timeout 120 node app-b/study.mjs --try .../04.png task:t18 --click "entries" --click "From -> person"

Marcus: "From, To, Subtype, Name, Time, Weight, Edge id, Position, Attribute. That's what the column
IS. Nothing about trimming zeros or matching 7 to 0007. Is there a way to just... pad it?"

## 05 -- try the '#' type marker next to person_id

    timeout 120 node app-b/study.mjs --try .../05.png task:t18 --click "entries" --click "#"

Marcus: "Nothing happened. Thought the little number sign was the type, maybe I could flip it to
text. No. OK, I'm not going to fight it -- I'd fix the CSV in Excel before I'd hunt for this. I'll
take the tool's count and footnote it."

## 06 -- Load

    timeout 120 node app-b/study.mjs --try .../06.png task:t18 --click "entries" --click "Load"

Marcus: "Reading 3 tables: 421 nodes, 4,180 edges. Wait. 412 people plus 9 buildings is 421. But it
told me Priya Nair's duplicate got dropped, so that's 411 real people, 420 nodes. Either the
duplicate is a node or the 412 is rows, not people. Side panel says one thing, the count says
another -- which one's lying? Small thing, but it's the kind of thing a defense attorney asks.
It's still loading, chart isn't up in this shot, but 4,180 links is what I asked for."

## Answer given to the moderator

"32 swipes don't match: 25 name a person ID that isn't on the people list, 7 name a building that
isn't on the buildings list. But some of those 25 are not really unknown people -- at least one is
ID 7, which is 0007 Wei Chen with the zeros stripped, and the tool says there are 3 IDs like that.
So the real count of swipes from people we genuinely can't identify is lower than 25 and I couldn't
fix it inside the tool to get the exact number. The chart is 4,180 swipe links, person to building."

## Debrief

- Succeeded? Mostly. The 32 is clear, consistent and I'd repeat it. I could not reconcile the
  leading-zero IDs in the tool, so the "really unknown" number is open.
- Single Ease Question: 6 of 7. The count was right there before I clicked anything; I lost a point
  on the zeros and on the 412-versus-421 count.
- Would I use it instead of my current tool? For this job, yes, over Excel VLOOKUPs. It told me
  which rows didn't match and why, without me building a lookup. It's a lot faster than i2's import
  wizard. What would keep me from trusting it on a case: it saw the 7/0007 problem and wouldn't let
  me fix it, it dropped a duplicate badge silently ("kept the first"), and its node count did not
  add up the way I added it. Give me a "treat 7 and 0007 as the same" switch and tell me what
  happened to the second badge, and I'd use it.
