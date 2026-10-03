# Session: supply chain analyst (Dana Okafor), weighting badge swipes and buildings before load

Task as given by the moderator: "The badge-swipe spreadsheets are open on the import page
(example data if you do not work with building access). In every analysis from now on, a person
and a building that appear together many times should count as more tightly tied than a pair seen
once, and a taller building should count for more than a small one. Set that up before you load,
then check it took."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t25--supply-chain-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t25/01.png)

Think-aloud: "OK, not my data, door entries. Fine, it's the same shape as a PO-lines file: one
row per swipe, person and building. Three tables on the left, the entries one is open. Top line
says 4,180 edges from 4,212 rows -- so every swipe is its own line. That's the problem: a person
who badged in 22 times would just be 22 lines, not one heavy one.

Up in the strip I see 'Weight: none (each edge counts 1)'. That's exactly what I don't want.
Next to it, 'One edge per  Row  Pair'. Row is picked. Pair sounds like 'roll the duplicates up',
like a pivot with a count. Let me try that."

## Step 2 -- click "Pair"

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t25--supply-chain-analyst/02.png task:r8-t25 --click "Pair"

Saw: top line now reads 1,306 edges from 4,180 of 4,212 rows. Blue banner "One row per pair:
each is one edge, its count the rows it merged." A new column "count" marked derived and
marked Weight, with "Higher means Stronger / Farther / Capacity", Stronger already picked. The
strip says "Weight: count, the number of rows per pair". Time column became earliest and
latest. A toast at the bottom says the same thing and has Undo.

Think-aloud: "That's a pivot with a count. 1001 to B1 is 22, 1002 to B7 is 9. And it already
picked 'Stronger', which is what 'more tightly tied' means to me. Good -- I didn't have to
build the count column myself, that's the ten minutes in Excel saved. 'Farther' and 'Capacity'
I'm leaving alone. The rows with the yellow 'Not in people' say 'left out' -- fine, that's 32
junk rows out of 4,212, it tells me so. Half the job done. Now the building height."

## Step 3 -- click "buildings" in the table list

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t25--supply-chain-analyst/03.png task:r8-t25 --click "Pair" --click "buildings"

Saw: buildings table, columns bldg (Key), site (Name), floors (marked Weight already). B9 has no
floors value: "its weight reads 1". Report at the bottom: "floors is each building's node
weight. 1 building has no floors value: its weight reads 1 | 0".

Think-aloud: "Floors -- that's 'taller'. And it's already tagged Weight. Did I do that? No, it
guessed. It guessed right, and it says so in the report, so I'll take it. B9 has no floors; it'll
count as 1. I'd rather that than 0 -- a building with no data shouldn't vanish. Leave it on 1.
Small thing: I didn't ask for floors to be the weight, it just was. If there had been two number
columns I'd want to know why it picked this one. Now load."

## Step 4 -- click "Load" and check the summary

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t25--supply-chain-analyst/04.png task:r8-t25 --click "Pair" --click "buildings" --click "Load"

Saw: the network (a hairball, 420 nodes), and on the right a Summary: 420 nodes, 411 person, 9
building, 1,306 edges, Directed, "Weight: count, stronger", "Node weight: floors (building)",
14 isolated nodes, "Readings not computed".

Think-aloud: "There's my check. Weight: count, stronger. Node weight: floors. 1,306 edges, same
number as the import screen. That's the kind of line I'd want on a slide footnote. 'Isolated
nodes 14' -- don't know what that means for me, probably people who never swiped in a known
building. Not my question today. The picture itself tells me nothing, as usual."

## Step 5 -- click "count, stronger" to see where it leads

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t25--supply-chain-analyst/05.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "count, stronger"

Saw: back on the entries table, now titled "Edit: entries", with Pair and the count weight still
set, and "Apply is off: Nothing has changed yet".

Think-aloud: "OK, so it remembered. Clicking the link takes me back to the setting, and it's
still Pair and Stronger. That's what I'd want -- I can see where it came from. Escape out."

## Step 6 -- open Analyze to see whether analyses use it

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t25--supply-chain-analyst/06.png task:r8-t25 --click "Pair" --click "buildings" --click "Load" --click "Analyze"

(The tool noted two controls are called Analyze and clicked the first.)

Saw: an Analyze list: Louvain, PageRank, Shortest path ("The fewest steps, or the lightest route
..."), Links total (count), Links in (count), Links out (count), Total count in and out ("The sum
of count over each node's edges"), Total count in.

Think-aloud: "The moderator said 'every analysis from now on'. Here I see 'Total count in and
out' -- so it knows about my count. Shortest path mentions 'lightest route', which suggests it'd
use the weight. But PageRank and Louvain don't say whether they use count or the floors. I'd have
to run one to find out, and I'm not going to run PageRank on badge data to prove a point. And
nothing here mentions floors at all -- where does 'a taller building counts for more' actually
get used? The summary says it's set; I'll have to trust that. I'm stopping here. As far as the
setup goes, it took."

## Verdict

- Succeeded? Yes, I think so. Repeated pairs are rolled up into one tie with a count that counts
  as stronger, and floors is the building weight. The summary after loading says both.
- Doubt: I can't see from the analysis list which analyses actually honor the floors weight. For
  the count weight, the "Total count" entries and "lightest route" hint that it is used; for floors,
  nothing tells me. "Every analysis" is a claim I can't verify from here.
- Doubt: floors was already set as the weight before I touched it. Right guess, but I didn't
  choose it.
- Single Ease Question: 6 of 7. Two clicks did the real work, and the check was right there on
  the summary.
- Would I use it instead of my current tool? For this kind of roll-up, I'd do it in Excel in ten
  minutes with a pivot, but Excel wouldn't then carry the weight into an analysis for me. So,
  maybe, for this narrow job, as a side tool. Not a replacement: it's not in Power BI, and IT
  would still ask where the file goes. "Local only" at the top is a good start for that question.
