# Session: nonprofit operations analyst ("Grace"), weighted import of badge-swipe data

Task as given: "The badge-swipe spreadsheets are open on the import page (example data if you do
not work with building access). In every analysis from now on, a person and a building that appear
together many times should count as more tightly tied than a pair seen once, and a taller building
should count for more than a small one. Set that up before you load, then check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25--nonprofit-operations-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t25/01.png)

"OK, three tables on the left: people 412, buildings 9, entries 4,212. Entries is selected. That's
my swipe log, one row per swipe. 1001 went into B1 twice already in the first five rows, so the
repeats are there.

Across the top there's a row of little words: 'Each row is a node / an edge', 'One edge per Row /
Pair', and then 'Weight: none (each edge counts 1)'. That last bit is exactly my problem -- right
now a pair seen 22 times counts the same as a pair seen once. I don't know what 'edge' means for
sure but I think it's a line between a person and a building.

'One edge per Row' or 'Pair'... Row is picked. If I pick Pair, I guess every person-building pair
becomes one line instead of one line per swipe. Whether that also counts the swipes I can't tell
from the word alone. I'll try it, there's an Undo up top."

Also noticed: 25 people and 7 building codes don't match. Not today's job; I'd go back for those.

## Step 2 -- click "Pair"

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--nonprofit-operations-analyst/02.png task:r8-t25 --click "Pair"

"Oh good. Now there's a 'count' column at the end with 22, 9, 6, 4 and it's marked 'Weight', and
the top line changed to 'Weight: count, the number of rows per pair'. The banner says each pair
is one edge and its count is how many rows it merged. That's exactly 'seen together many times'.
Edges went from 4,180 to 1,306, which makes sense, fewer lines, each one fatter.

Under the count it says 'Higher means Stronger / Farther / Capacity' and Stronger is already
picked. Stronger is what I want -- more swipes, tighter tie. I would not know what 'Capacity' means
here, and 'Farther' worried me for a second: if somebody clicked that by accident the whole thing
would flip and nothing would warn them. I left it on Stronger.

The pop-up at the bottom explains it in a sentence and has an Undo. Fine."

## Step 3 -- open the buildings table

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--nonprofit-operations-analyst/03.png task:r8-t25 --click "Pair" --click "buildings"

"Buildings: bldg, site, floors. Taller building -- floors is the only thing that says how tall.
And floors is ALREADY marked 'Weight'. The report at the bottom says 'floors is each building's
node weight'. So it guessed that for me. I didn't do anything, which is nice, but it also means I
have to trust that 'node weight' is what makes a taller building 'count for more' in an analysis.
Nothing here actually says 'analyses will use this'.

B9 has no floors. It says its weight reads 1, and there's a 1 / 0 choice. 1 is like a one-story
building, which is a fair guess for a blank. I left it.

The site column is the 'Name', so three buildings will all be labeled 'North campus'. That's going
to look bad on a slide, but it's not what I was asked to do today."

## Step 4 -- Load

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--nonprofit-operations-analyst/04.png task:r8-t25 --click "Pair" --click "buildings" --click "Load"

"There's the hairball. The panel on the right has a Summary:
- Nodes 420: person 411, building 9
- Edges 1,306 -- matches what the import page said
- Weight: count, stronger
- Node weight: floors (building)

That's the check. Both things I set show up by name. 1,306 lines is the pair count, not 4,212
swipes, so it really merged them.

Counting like I would against Excel: people sheet says 412 rows but it says person 411. Where did
one go? Nothing I can see tells me. Also 'Isolated nodes 14' -- I assume people with no matched
swipes, but it doesn't say.

There's a note on the picture, 'Nothing is colored or sized by a row'. So the tall buildings
don't look any bigger and the frequent pairs don't look any thicker. I understand that's drawing,
not analysis, but the only way I can 'see it took' is reading the summary words."

## Step 5 -- click "count, stronger" to double-check

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t25--nonprofit-operations-analyst/05.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "count, stronger"

"It takes me back to the entries table, now called 'Edit: entries', with Pair still on and count
still Weight, Stronger. Bottom says 'Apply is off: Nothing has changed yet'. So it stuck. Good,
and I know where to change it next quarter. I'll press Escape and leave it."

Stopped here.

## Wrap-up

Did I succeed? Yes, I think so. Repeated person-building pairs are merged into one line with the
swipe count as its weight (higher = stronger), and buildings carry floors as their weight. The
summary after loading names both.

Single Ease Question: 5 of 7. The pair-count part was one click once I guessed "Pair"; the floors
part was already done for me. What cost me: "One edge per Row / Pair" doesn't say "count the
repeats" until you click it; "Farther" and "Capacity" next to Stronger are jargon and one wrong
click would reverse the meaning; nothing says in plain words that "every analysis from now on"
will use these weights -- I'm trusting "Weight" and "Node weight"; and the 412 vs 411 people
mismatch is unexplained.

Would I use this instead of what I use now? For this kind of job, probably yes. In Excel I'd be
doing a pivot table to count swipes per person per building, then a lookup for floors, and I'd
still have no network. Here it was two clicks and it showed me the counts before I loaded. I'd want
a one-line "these weights will be used in your analyses" confirmation and an explanation for the
missing person before I put it in front of my director.

## Observations for the study team (in her words, condensed)

1. "Pair" is the right control but its label doesn't promise a count; she clicked it on a guess.
2. "Higher means Stronger / Farther / Capacity": Farther and Capacity are unexplained; a wrong
   click silently inverts the analysis.
3. Floors was pre-assigned as node weight; she never had to decide, so she had no moment where
   the app told her "taller buildings will count for more in analyses".
4. After loading, the only proof is the Summary's Weight and Node weight lines; useful and found
   immediately, but it is wording, not behavior.
5. Count check: people table 412 rows vs 411 person nodes, no explanation she could find.
6. Isolated nodes 14 with no hint who they are.
