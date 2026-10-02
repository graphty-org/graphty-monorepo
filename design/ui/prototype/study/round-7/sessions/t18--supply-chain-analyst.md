# Session: three security spreadsheets into one picture -- Dana Okafor (supply chain risk analyst)

Task as given: "You have three spreadsheets from building security: one with people, one with
buildings, and one row for every door swipe, which names a person and a building by number. Make
one picture in which each swipe connects the person to the building, and say how many swipes
point at a person or a building that is not on those lists."

Renders are in design/ui/prototype/tmp/round-7-sessions/t18--supply-chain-analyst/.
All commands were run from design/ui/prototype.

## Start screen (shots/tasks/t18/01.png)

"OK, so it's already got my three files in. People, buildings, entries, with row counts and green
ticks. That's more than Gephi ever did for me. The strip on top says person 412, entries 4,180
edges from 4,212 rows, building 9. So 4,212 minus 4,180 -- 32 rows it isn't using. That's
probably my answer already, but I don't trust a subtraction I did in my head. I'm on the people
table; it's telling me 1 repeated key -- Priya Nair is in there twice with two badge numbers --
and 14 people with no swipes. Fine. Also I notice Wei Chen's id is 0007. Leading zeros. I've been
burned by that in SAP more times than I can count. Let me look at the swipes table."

## Step 1 -- open the swipes table

    timeout 120 node app-b/study.mjs --try .../01.png task:t18 --click "entries"

"This is good. It worked out person_id goes to person and building_id goes to building on its
own, and it says so in blue under each column. The bottom box is what I wanted: 4,212 rows, 4,180
have both ends. 25 person_id values, 25 rows, not in people. 7 building_id values, 7 rows, not in
buildings. 'Show the 32 rows.' Leave out is already picked. 25 + 7 = 32, matches the strip.

But look at row three: '7 -- Not in people'. Wei Chen is 0007 in the people file. And the last
warning says person_id is a number here and text in people, matched as text, '3 keys differ only
by leading zeros (not merged)'. So at least some of my 25 'strangers' are real employees whose id
lost its zeros on the way out of the badge system. It TOLD me, which I appreciate -- most tools
just quietly drop them. But it says 'not merged' and doesn't say how many rows those 3 keys are."

## Step 2 -- the leading-zero link

    timeout 120 node app-b/study.mjs --try .../02.png task:t18 --click "entries" --click "3 keys"

"It filtered the sample down to the one row with id 7. '1 of the 8 sample rows.' That's the sample,
not the file -- I still don't know how many of the 4,212 rows those 3 keys cover. And there's no
button that says 'treat 7 and 0007 as the same'. Next to the not-in-people line there's 'Add as
people' or 'Leave out', but nothing for 'match ignoring zeros'."

## Step 3 -- show the 32 rows

    timeout 120 node app-b/study.mjs --try .../03.png task:t18 --click "entries" --click "Show the 32 rows"

"Again: 3 of the 8 sample rows. I wanted the 32. There's a 'Show all rows' link but I'm not going
to page through four thousand rows to find them. In Excel I'd have a filter and a count in ten
seconds. Still, the count itself is on screen, so I'll take it."

## Step 4 -- look for a fix for the zeros

    timeout 120 node app-b/study.mjs --try .../04.png task:t18 --click "entries" --click "From -> person"

"Menu on the person column: From, To, Subtype, Name, Time, Weight, Edge id, Position, Attribute.
Nothing about leading zeros or matching. OK, I'm not fixing it here. I'll report 32 and flag the
zeros."

## Step 5 -- load (first try, my mistake)

    timeout 120 node app-b/study.mjs --try .../05.png task:t18 --click "entries" --key Escape --click "Load"

"I hit Escape to close that menu and -- it threw the whole import away. I'm looking at some Les
Miserables picture now and a message 'Load cancelled: nothing was loaded', with Undo. The menu
wasn't even open in this go, so Escape went straight to 'leave'. It does say 'Esc to leave' up top
in small grey type, but I didn't read that. At least there's an Undo. I'll just do it again."

## Step 6 -- load again

    timeout 120 node app-b/study.mjs --try .../06.png task:t18 --click "entries" --click "Load"

"'Reading 3 tables: 421 nodes, 4,180 edges...' with a progress bar. 421 is 412 people plus 9
buildings -- so it did NOT add the 25 unknown ids or the 7 unknown buildings as dots, which is
what 'Leave out' meant. 4,180 lines, one per good swipe. That's the picture I was asked for. The
title says 'Door entries, March 2026'. Says Local only up top, which is the first thing my IT
people would ask."

## Step 7 -- wait for the picture

    timeout 120 node app-b/study.mjs --try .../07.png task:t18 --click "entries" --click "Load" --click "Everything"

"Clicked the 'Everything' row to see something. The right panel now says 'Paints 421 nodes, 4,180
edges', but the middle is still the 'Reading 3 tables' box, about 60 percent. I never actually saw
the picture draw. I'll call it done -- the numbers say it's built -- but I'd want to see it before
I put it on a slide."

## My answer

- One picture: 421 points (412 people, 9 buildings) and 4,180 swipe lines, person to building.
- Swipes pointing at something not on the lists: **32** -- 25 with a person id not in the people
  file, 7 with a building id not in the buildings file. They were left out of the picture.
- Caveat I'd put in the email: 3 of those person ids differ only by leading zeros (7 vs 0007,
  Wei Chen), so some of the 25 are probably real people with a formatting problem, not strangers.
  The tool told me, but would not merge them or tell me how many rows that is.

## Wrap-up

Did I succeed? Mostly. I'm confident about 32 because the report said it two ways (4,212 - 4,180
and 25 + 7). I'm less confident about the picture, which I never saw finish drawing.

Single Ease Question: 5 out of 7. Getting the count was easy -- it was on the screen before I did
anything. Losing the whole import to the Escape key, the "sample rows" filters that don't show the
real rows, and no way to fix the zeros knocked it down.

Would I use this instead of my current tool? For this kind of job -- three exports that are
supposed to join and never quite do -- the match report is genuinely better than my
XLOOKUP-and-ISNA routine, because it does both ends at once and catches the leading-zero thing
I'd usually find a week later. But I'd still need to get those 32 rows out into a table I can send
someone, and I'd need it to fix the zeros instead of just telling me. And then: will IT approve
it, and can the result go to Power BI? Until I know those, it's a side tool.
