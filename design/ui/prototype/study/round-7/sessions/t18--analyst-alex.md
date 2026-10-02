# Session: door swipes into one picture -- Analyst Alex

Task as given by the moderator: "You have three spreadsheets from building security: one with
people, one with buildings, and one row for every door swipe, which names a person and a building
by number. Make one picture in which each swipe connects the person to the building, and say how
many swipes point at a person or a building that is not on those lists."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t18--analyst-alex/`.

## Step 1 -- the start screen (shots/tasks/t18/01.png)

Alex: "OK, so it's already got the three files in. Left side: people 412, buildings 9, entries
4,212, all with green ticks. Good, those are the counts I'd check against SQL first. Up top it
says 'Local only' -- I'm going to take that as 'my data is not going anywhere', which is the first
thing I'd want to know. I'd still want to hover it to be sure, but fine.

There's a line across the top: `person (412) --entries (4,180 edges from 4,212 rows)--> building
(9)`. Looks like code, but I can read it. 4,212 rows in, 4,180 edges out. So 32 swipes are going
missing somewhere. That's probably my answer already, but I'm not putting a number in a report
because a header said so.

The people table at the bottom says '1 repeated key (kept the first)' and '14 people have no
entries'. Priya Nair is there twice with two badges -- that's a real-world thing, someone got a
new badge. Kept the first, OK, noted. Also I see Wei Chen's id is 0007. Leading zeros. That's the
kind of thing that bites you."

## Step 2 -- open the swipes table

```
timeout 120 node app-b/study.mjs --try .../t18--analyst-alex/02.png task:t18 --click "entries"
```

Alex: "Right, this is the one I care about. person_id is 'From -> person', building_id is 'To ->
building', time is a time. It worked out 'each row is an edge, person to building' on its own. I
didn't have to wire that up, which in Gephi I would.

Match report: 4,212 rows; 4,180 have both ends. 25 person_id values, 25 rows, not in people. 7
building_id values, 7 rows, not in buildings. 'Show the 32 rows.' 25 plus 7 is 32, and 4,212
minus 4,180 is 32. So it adds up, which means no row is missing both ends. Good, it agrees with
itself.

But hold on. Row three: person_id `7`, 'Not in people'. And the people table has Wei Chen as
`0007`. Then there's this warning at the bottom: 'person_id is Number here and Category in
people: matched as text. 3 keys differ only by leading zeros (not merged).' So the swipes file
turned 0007 into 7 and now it doesn't match. That's not a stranger walking into a building -- that
is a known employee being dropped. Three of the 25 might be that."

## Step 3 -- check the leading-zero ones

```
timeout 120 node app-b/study.mjs --try .../t18--analyst-alex/03.png task:t18 --click "entries" --click "3 keys"
```

Alex: "It filters to the rows with that problem: 1 of the 8 sample rows, the `7` row. OK, so
'3 keys' is real and the 7 is one of them. 'Show all rows' would give me the whole list, I
assume. Now, how do I tell it to match 7 with 0007? It says 'not merged' like that's a choice
somebody made, but I don't see a 'merge' button next to it."

## Step 4 -- try to fix the column type

```
timeout 120 node app-b/study.mjs --try .../t18--analyst-alex/04.png task:t18 --click "entries" --click "#"
```

Alex: "The '#' next to person_id must mean number. I figured if I clicked it I'd get to change it
to text, or something. Nothing happened. Nothing opened. Fine. I'm not going to go digging in
dropdowns for this. In real life I'd fix the CSV in Python -- `dtype=str` -- and reload. I'd
still do this part in Python, honestly."

## Step 5 -- look at the 32 rows

```
timeout 120 node app-b/study.mjs --try .../t18--analyst-alex/05.png task:t18 --click "entries" --click "Show the 32 rows"
```

Alex: "Shows me the bad rows -- in the sample, three of them: `7` not in people, `1530` not in
people, `B12` not in buildings. Yellow outline on the bad cell, that's clear. I'd want this as a
CSV I can send to the security team, 'who are these 25 people'. I don't see an export right here,
but I'm not asked for that today."

## Step 6 -- load the picture

```
timeout 120 node app-b/study.mjs --try .../t18--analyst-alex/06.png task:t18 --click "Load"
```

Alex: "Leave out is already the default for both, which is what I want -- I don't want fake people
called '1530' showing up as nodes. Load. 'Reading 3 tables: people.csv, buildings.csv,
entries.csv: 421 nodes, 4,180 edges...' with a progress bar and a Cancel. Good, it tells me it's
doing something and I can kill it.

421 nodes. 412 plus 9 is 421. But wait -- it said one person key was repeated and it kept the
first. So shouldn't that be 411 people, 420 nodes? Either the 412 already counts unique people
and the table has 413 rows, or it double-counted. The people table literally says '412 rows, 1
repeated key'. So that's one off. Small, but this is exactly the kind of number my manager asks
about. I'd have to go check."

## Answer Alex gives

"One picture: people to buildings, one line per swipe, 4,180 lines. 32 swipes point at someone or
something not on the lists: 25 with a person_id not in the people sheet, 7 with a building_id not
in the buildings sheet. Caveat I'd put in the email: at least 3 of those 25 look like our own
people whose ids lost their leading zeros (7 vs 0007), so the real 'unknown person' count is
probably 22, and I'd fix the id column type and rerun before anybody acts on it."

## Debrief

- **Succeeded?** "Mostly. I got the number, and it was right there without me asking -- 32, split
  25 and 7. And the picture is loading. What I didn't manage was fixing the 0007 thing inside the
  tool; I'd do that in Python. And the 421 nodes doesn't sit right with the 'kept the first'
  duplicate, so I don't fully trust the node count yet."
- **Single Ease Question: 5 of 7.** "What took longest was the leading-zero thing: it warned me,
  which is great, Gephi would never, but then it gave me no way to fix it. The '#' did nothing.
  Telling me 'not merged' without a merge button is just telling me I have a problem."
- **Would I use this instead of my current tool?** "For this kind of job, the join-three-sheets
  and tell-me-what-didn't-match part, yes, over Gephi -- Gephi would just silently drop those 32
  or create ghost nodes and I'd find out in the meeting. The match report is the best part. But
  I'd still clean the ids in Python first, and I'd want that list of 32 rows as a CSV."

## Problems observed

1. The leading-zero warning ("3 keys differ only by leading zeros (not merged)") has no action to
   merge them or to change the column type; clicking the "#" type marker did nothing.
2. Loading reports 421 nodes, which equals 412 + 9, though the people table reports a repeated key
   that was dropped ("kept the first") -- Alex reads that as 420 expected and loses trust in the
   count.
3. The "Makes" line is written in arrow notation that reads like code.
4. No visible way to export the 32 unmatched rows from the match report.
5. "Local only" is reassuring but not explained at the point of loading.
