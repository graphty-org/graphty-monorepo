# Session: three spreadsheets into one person-building network -- Explorer Elena

Task given by the moderator: "Three spreadsheets are open on the program's import page: a list of
people, a list of buildings, and a log of badge swipes saying which person entered which building
and when. If you do not work with building access, treat this as example data. Make one network in
which each person is tied to each building they entered -- however often the same person went into
the same building, they should be tied once -- and work out which swipes name a person or a
building that is not on the lists."

Participant: Explorer Elena (product manager, no graph training). Variant: curious afternoon.

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-8-sessions/r8-t24--explorer-elena/`.

## Step 1 -- the start screen (shots/tasks/r8-t24/01.png)

On screen: an import page with a "Tables" list on the left (people 412, buildings 9, entries
4,212), the people sheet showing in the middle, and a gray strip at the top that says
"person (411) --entries (4,180 edges from 4,212 rows)--> building (9)". A "Match report" at the
bottom, a blue "Load" button bottom right.

Elena: "OK, so it already found my three sheets. People, buildings, entries -- entries is the swipe
log, I guess. That line at the top is kind of code-looking, but I get it: people, arrow, buildings.
411 people? The list says 412. Oh, '1 repeated key (kept the first)' -- Priya Nair is in there twice,
fine, same person. The people one looks fine. The swipes are what I care about, so let me click
entries."

## Step 2 -- open the swipe log

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/02.png task:r8-t24 --click "entries"

On screen: the swipe log with person_id, building_id and time columns. Some cells have yellow
boxes saying "Not in people" (7, 1530) and "Not in buildings" (B12). The report says "25 person_id
values (25 rows) are not in people" and "7 building_id values (7 rows) are not in buildings", and
"Show the 32 rows". Up top there is "One edge per Row | Pair", with Row picked.

Elena: "Oh nice, it's already flagging them in yellow. That's the second half of my job, kind of
done for me -- 25 people it doesn't know and 7 buildings it doesn't know. 32 bad swipes. Good, it's
not just silently dropping them.

Hmm, '7 -- not in people'. Is that a real badge? Probably someone typed it wrong at the door.
(She does not connect it with Wei Chen's id 0007 on the people sheet. The line about '0007 and 7
stay two keys' is the eighth line of the report, with a warning icon and the word 'Category'; she
skims past it.)

Let me see all 32."

## Step 3 -- try to see the bad swipes

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/03.png task:r8-t24 --click "entries" --click "Show the 32 rows"

On screen: a blue strip "Showing the rows with an end not matched: 3 of the 8 sample rows. Show all
rows", and three rows.

Elena: "Three? It said 32. '3 of the 8 sample rows' -- so it only looked at a sample? I wanted the
32. Is that all I can get here? Let me try the 25 one."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/05.png task:r8-t24 --click "entries" --click "25 person_id values (25 rows)"

On screen: "Showing the rows whose person_id is not in people: 2 of the 8 sample rows." Two rows,
7 and 1530.

Elena: "Two. Same thing. OK, so it knows there are 25 but it'll only show me the couple that are in
its little preview. I can't copy these out into Slack for the facilities person. I have the
numbers -- 25 unknown people, 7 unknown buildings, 32 swipes -- and a few examples, 7, 1530, B12.
I guess that's enough to say 'there are 32 bad swipes', but I couldn't hand someone the list."

## Step 4 -- tie each person to a building once

Elena: "Now the 'once' part. 'One edge per Row' -- right now it's one line per swipe, which is the
4,180. I want one per person-and-building. 'Pair' sounds like that. Let me try it; there was an
undo up top anyway."

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/04.png task:r8-t24 --click "entries" --click "Pair"

On screen: the top line now says "1,306 edges from 4,180 of 4,212 rows". New columns appear:
"time (earliest)", "time (latest)" and "count", with 22, 9, 6, 4 and "left out" for the bad rows. A
black message at the bottom: "rows with the same two ends make one edge ... the number of rows per
pair, count, is the Weight", with an Undo button.

Elena: "Ooh, 4,180 down to 1,306. That's it -- 1001 went into B1 twenty-two times and now it's one
line with a 22 on it. And it kept the first and last time, which I didn't even ask for, nice. The
bad ones say 'left out', which matches the yellow ones. 'Weight' and 'Stronger, Farther, Capacity'
-- no idea, not touching that. There's an Undo right there so I'm not scared."

## Step 5 -- load it

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/06.png task:r8-t24 --click "entries" --click "Pair" --click "Load"

On screen: a big round cloud of gray dots and faint lines. On the right: Nodes 420 (person 411,
building 9), Edges 1,306, Isolated nodes 14.

Elena: "Ooh, there it is. OK, those darker dots in the middle with all the lines going into them --
those are the buildings, nine of them, and everyone is hanging off them. I'd guess the one with the
most lines is the main office. (Nothing on screen says which dots are buildings; the summary only
counts them, and the label at the top says nothing is colored.) 1,306 lines, same number as before,
good, nothing went missing between the two screens. 14 'isolated' -- that's the 14 people who never
swiped, the report said that earlier."

## Step 6 -- can I get back to the bad swipes?

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t24--explorer-elena/07.png task:r8-t24 --click "entries" --click "Pair" --click "Load" --click "from 3 tables"

On screen: the same import page again, titled "Edit: entries", with the match report and the yellow
rows, Apply grayed out.

Elena: "Good, the report is still there after loading, so if someone asks me 'which swipes were bad'
next week I can come back here. Still only the 25 and 7 and a few examples though."

She stops here.

## Wrap-up

Did she succeed? "Mostly. The network is done -- one line per person and building, 1,306 of them.
The bad swipes: I can tell you there are 32, 25 with a person it doesn't know and 7 with a building
it doesn't know, and give you a couple of examples. I couldn't get the actual list of all 32 out of
it. I'd say I did half of the second part."

Single Ease Question: 5 of 7. "The 'once' part was one click and the yellow warnings were already
there. The list of bad ones is what took me in circles: it said 32 and showed me 3."

Would she use this instead of her current tool? "For this, yes, over a pivot table. In Sheets I'd
need a pivot to dedupe and a VLOOKUP to find the bad IDs and I'd probably mess up the VLOOKUP. Here
it just told me. But I'd still export the bad swipes to Sheets if I could -- which I couldn't."

## What the session showed

- One click on "Pair" did the once-per-person-per-building job; the count of rows it merged and
  the earliest and latest time came along for free, and the Undo in the message made it feel safe.
- The unmatched swipes were flagged without asking: yellow cells, counts, examples, and "left out"
  in the merged view. The counts carried through to the loaded graph (1,306 edges) and the report
  was still there after loading.
- "Show the 32 rows" and "25 person_id values (25 rows)" each showed only the 2 or 3 bad rows that
  happened to be among the first 8 sample rows. The link promises 32 and delivers 3; there is no
  way to see or copy the full list of bad swipes.
- The person id 7 is almost certainly Wei Chen (0007). The report says so in its eighth line, but
  next to "Number", "Category" and "keys"; Elena read 7 as a typo at the door and counted it among
  the unknown people.
- On the loaded graph nothing marks which dots are buildings; Elena guessed from the busy hubs, and
  guessed the busiest is "the main office" with nothing to check that against.
- "Weight", "Stronger / Farther / Capacity" and "Node weight: floors (building)" were words she
  skipped.
