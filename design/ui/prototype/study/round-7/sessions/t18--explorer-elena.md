# Session: three security spreadsheets into one picture -- Explorer Elena

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes point
at a person or a building that is not on those lists."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t18--explorer-elena/.

## Step 1 -- the start screen (shots/tasks/t18/01.png)

What I see: a page with "Tables" on the left (people 412, buildings 9, entries 4,212) and the
people sheet open. A grey line on top says "person (412) --entries (4,180 edges from 4,212
rows)--> building (9)".

Thinking aloud: "OK, my three sheets are already in there. People, buildings, entries. The grey
line says 4,180 out of 4,212... so some swipes got lost? I don't know what 'edges' are, but the
numbers don't match, so that's probably my answer hiding. Let me click entries."

## Step 2 -- open the swipes sheet

    timeout 120 node app-b/study.mjs --try .../t18--explorer-elena/02.png task:t18 --click "entries"

What I see: the swipe rows, with yellow boxes saying "Not in people" and "Not in buildings". At the
bottom: "4,212 rows; 4,180 have both ends. 25 person_id values (25 rows) are not in people. 7
building_id values (7 rows) are not in buildings. Show the 32 rows."

Thinking aloud: "Oh nice, it actually tells me. 25 swipes by people who aren't on the people list,
7 at buildings that aren't on the building list. 32. That's my number. 'Leave out' is already
picked next to both -- fine, I don't want to add fake people. Let me look at the 32 before I
believe it."

## Step 3 -- "Show the 32 rows"

    timeout 120 node app-b/study.mjs --try .../03.png task:t18 --click "entries" --click "Show the 32 rows"

What I see: only 3 rows, and a note: "3 of the 8 sample rows. Show all rows."

Thinking aloud: "It said 32 and shows me 3. Oh -- 'of the 8 sample rows'. It's only showing a
preview. OK, whatever. Wait. Person 7. On the people sheet there was a 0007, Wei Chen. That's the
Excel thing where it eats the zeros off the front. And there's a line at the bottom, '3 keys differ
only by leading zeros (not merged)'. So some of my 25 aren't really missing people, they're just
zeros. Let me click that."

## Step 4 -- the leading-zeros link

    timeout 120 node app-b/study.mjs --try .../04.png task:t18 --click "entries" --click "3 keys"

What I see: one row, person 7, building B4, "Not in people". "1 of the 8 sample rows."

Thinking aloud: "Yep, 7 is Wei Chen. There are 3 of those. Is there a button that says 'these are
the same person'? I don't see one. It just says 'not merged'."

## Step 5 -- look for a fix in the column dropdown

    timeout 120 node app-b/study.mjs --try .../05.png task:t18 --click "entries" --click "From -> person"

What I see: a black menu: From, To, Subtype, Name, Time, Weight, Edge id, Position, Attribute.

Thinking aloud: "Subtype, edge id, position... no. Nothing here says 'fix the zeros'. I'm not going
to poke at this, I'll break it. The task only asks how many, so I'll say 32 and mention that 3 of
the people ones are probably just the zeros problem."

## Step 6 -- Load

    timeout 120 node app-b/study.mjs --try .../06.png task:t18 --click "entries" --click "Load"

What I see: the screen switches to an empty gray area with a box: "Reading 3 tables ... 421 nodes,
4,180 edges..." and a progress bar about two-thirds full.

Thinking aloud: "421 -- that's 412 people plus 9 buildings, OK, that adds up. And 4,180 lines, same
as it said. So the 32 bad ones are left out. Let's see the picture."

## Step 7 -- waiting, poking the left panel

    timeout 120 node app-b/study.mjs --try .../07.png task:t18 --click "entries" --click "Load" --click "Everything"

What I see: still "Reading 3 tables", same progress bar. A panel opened on the right: "Paints 421
nodes, 4,180 edges", color, shape, size.

Thinking aloud: "It's still loading. The right side says it's painting 421 of something, so I guess
the picture is in there, but I can't see it. ... Yeah. OK."

(Engagement dropped here: the picture never appeared on screen.)

## Ending

Answer I would give: "32 swipes point at someone or something not on the lists: 25 with a person
number that isn't on the people sheet, 7 with a building that isn't on the building sheet. But at
least 3 of the 25 look like the leading-zeros thing (7 vs 0007), so the real number of unknown
people is probably more like 22."

Did I succeed? Half. I got the number, and I trust it, because it showed me the rows and the
numbers added up. I never saw the picture -- it was still loading when I stopped -- and I couldn't
fix the zeros, so the picture would still have Wei Chen's swipe missing.

Single Ease Question: 5 of 7. The counting part was easy -- it just told me. The picture and the
zeros part were not.

Would I use this instead of what I do now? For this, probably yes. In Sheets I'd be doing three
VLOOKUPs and a COUNTIF of #N/A to get those 32, and this did it for me before I asked. But I'd want
to see the picture first, and I'd want a way to say "7 and 0007 are the same" without retyping my
sheet.

## Problems seen (in her words, with what was on screen)

- "It said 32 and shows me 3." -- "Show the 32 rows" lists only the bad rows among an 8-row
  preview; the count and the list disagree until the reader finds "of the 8 sample rows".
- "Is there a button that says 'these are the same person'?" -- the leading-zero line reports 3
  mismatches "(not merged)" and offers nowhere to merge them; the column menu has nothing for it.
- "I don't know what 'edges' are." -- the summary line, the report and the loading box all say
  nodes and edges; "keys", "Number", "Category" in the zeros line are also not her words.
- "It's still loading." -- after Load the canvas stayed empty behind a progress box; no picture was
  ever seen.
