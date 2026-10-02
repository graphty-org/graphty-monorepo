# Session: transfers path, fraud analyst

Participant: Sarah, complex-case fraud investigator (persona: study/personas/fraud-analyst.md).
Mode: own initiative, about five minutes of patience; not mandated.

Task as given: "Money left account ACC-271813 and ended up in ACC-233575, which the monitoring
system marked as suspicious. Through which accounts did it travel, counting only transfers in
the way the money actually moved, and how much passed along the way? The data on screen is a
sample: one month of card and bank transfers between accounts."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t12-transactions--fraud-analyst/.

## Start screen (shots/tasks/t12-transactions/01.png)

"Transfers, March 2026. 3,000 accounts, 9,113 transfers, one gray blob of hexagons. Great, a
hairball. Says 'Local only' up top -- good, I like that it says it. Right side is a stats sheet:
density, reciprocity, a log-log chart. None of that is for me. First thing I do is what I always
do: paste the account number into the search box."

## Step 1 -- search for the source account

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/01.png task:t12-transactions --click "Find rows and notes" --type "ACC-271813"

Render 01.png: the search box got a blue outline, but it is empty and nothing changed. "I clicked
in, I typed the account, nothing. No result list, no 'no match'. Either it didn't take my typing
or it searches something else -- 'rows and notes', whatever rows means. Moving on."

(Moderator note: the --try runner may not support typing; from the participant's seat the box
simply showed nothing.)

## Step 2 -- Analyze

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/02.png task:t12-transactions --click "Analyze"

Render 02.png: an Analyze picker. Recent: Louvain, PageRank, Shortest path. Then "Rank nodes and
edges": PageRank (Start here), Links (count), Links in, Links out, Total amount, Total amount in.
"Louvain, PageRank -- no. And it tells me to 'start here' on PageRank, which is exactly the thing
I'd never click. But 'Shortest path -- the fewest steps, or the lightest route, between two
nodes'. Between two accounts. That's my question. Source to destination."

## Step 3 -- Shortest path

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/03.png task:t12-transactions --click "Analyze" --click "Shortest path"

Render 03.png: a "Path between" card. From ACC-271813, To ACC-233575 already filled in.
Direction: "Follow edges" (selected) or "Either way". Weight: "amount (loaded weight)" with
Stronger / Farther / Capacity, and a note that it reads weight as distance, 1/amount. Scope:
whole graph, 3,000 accounts. Button: Find path.

"Oh, it already knows my two accounts. Fine. 'Follow edges' -- I'm guessing that means follow the
direction the money went, which is what I want; 'either way' would let it walk a payment
backwards, which is useless for a flow of funds. 'Follow edges' is a developer phrase though.
Say 'only the way money moved'. The weight business -- stronger, farther, capacity, 1/amount --
I don't know what that does to my answer and I'm not going to learn it today. Leave it. Find
path."

## Step 4 -- Find path

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/04.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path"

Render 04.png: the blob turns into a colored network. A legend appears: "Shortest paths
ACC-271813 to ACC-233575" and then "Louvain, Community 1 ... 7, 28 more communities". Left list
now shows Shortest paths, Louvain (35 groups), Links in (count). Right panel:

- From ACC-271813, business, riskScore 1. To ACC-233575, personal, riskScore 98, flagged.
- Size: 4 accounts, 3 transfers. Total amount 22,397.82.
- Members, in path order, "dates in order":
  - ACC-271813 start -- out 3,530.28 this trace -- hop 1, 3,530.28, 4 Mar, Yes
  - ACC-946224 via -- in 3,530.28 / out 9,468.23 -- hop 2, 9,468.23, 7 Mar, Yes
  - ACC-670564 via -- in 9,468.23 / out 9,399.31 -- hop 3, 9,399.31, 9 Mar, Yes
  - ACC-233575 end -- in 9,399.31
- Made with: Weight amount, farther.
- Pill under the canvas: "3 edges, total amount 22,929.05".

"Now that's the part I came for. Three hops, four accounts, dates on every hop, and it checks
the dates run forward -- 4th, 7th, 9th March. That's a chronology I can put in a narrative.
Somebody thought about that.

But. Three problems.

One: two totals. The panel says 22,397.82, the pill at the bottom says 22,929.05. I added the
hops myself: 3,530.28 plus 9,468.23 plus 9,399.31 is 22,397.82. So the pill is wrong, or it's
counting something I can't see. A number I can't trace is a number I can't put in a SAR.

Two: adding the hops up is meaningless anyway. That's the same money counted three times. And
it isn't even the same money: 3,530 leaves the source, and 946224 sends on 9,468 three days
later. Nearly six thousand of that came from somewhere else. That's the interesting bit --
946224 is pooling -- and the tool's headline number buries it. What actually passed from
271813 to 233575 is at most 3,530.28. The 9,4xx onward is a bigger pot.

Three: where did Louvain come from? I didn't ask for communities. Now my picture is thirty-five
colors with a legend that says 'Community 5' and my path is one orange dot lost in the middle. I
cannot see the path on the chart at all. If I print this in grayscale for the file it's noise."

## Step 5 -- try the "4 accounts, 3 transfers" link

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/05.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "4 accounts, 3 transfers"

Render 05.png: a tooltip "Selects the path's accounts and transfers"; otherwise the screen looks
the same. "OK, it selected them, I think. Nothing visibly changed on the chart. I wanted it to
zoom to those four and hide the rest."

## Step 6 -- check how it was run

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--fraud-analyst/06.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "All options..."

Render 06.png: a "Made with" card: Weight amount, farther; Direction Follow it; Scope Full graph,
3,000 accounts; Data version transfers-2026-03.csv, current.

"Good: direction 'Follow it', and it names the file and version. That's an audit trail, my
reviewer can rerun it. But the dialog had 'Stronger' selected and this says 'farther'. Which one
did it actually use? If the setting I picked isn't the one it ran, I don't trust either. And I
still don't know whether this is the only route or just the 'lightest' one -- there could be a
second route through other accounts and it would never tell me."

I stopped here.

## Answer given

Path, in the direction the money moved:
ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, three transfers:
3,530.28 on 4 Mar, 9,468.23 on 7 Mar, 9,399.31 on 9 Mar.
Amount traceable from the source all the way through: at most 3,530.28; the later hops carry
about 9.4-9.5k, so ACC-946224 pooled other money in before forwarding. The tool's sum of the hops
is 22,397.82 in the side panel and 22,929.05 in the pill; I would not use either.

## Debrief

Succeeded? "Mostly. I have the accounts, the hop order, the dates and the amounts per hop. I do
not have a 'how much passed' figure I'd defend -- I worked that out myself and the tool gave me
two different wrong ones."

Single Ease Question: 5 of 7. "Getting to the path was quick once I found Shortest path in the
Analyze list. The search box did nothing, PageRank was the 'start here', and the result came
wrapped in communities I never asked for."

Would she use it instead of her current tool? "Not instead of. For a quick 'is there a route
from A to B and are the dates in order' check, it's faster than me chaining VLOOKUPs, and the
'dates in order: Yes' column is genuinely useful. But I can't see the path on the picture, the
totals disagree, and I didn't find an export of those three transfers or a clean picture for the
file. Until I can get a CSV of the hops and a chart of just these four accounts out, I'm
rebuilding it in Excel and i2 for the reviewer anyway."

## Observed problems (for the studio)

1. Two different path totals on one screen: 22,397.82 (side panel, matches the hops) and
   22,929.05 (pill under the canvas).
2. "Total amount" sums every hop, which double counts money moving along a chain; the useful
   figure for a flow of funds is the smallest hop or the amount traceable from the source, and
   the in-greater-than-out pooling at ACC-946224 is not called out.
3. Weight shown as "Stronger" in the setup card but "amount, farther" in the result's settings.
4. Running the path also turned on Louvain community coloring (35 colors) and a Links-in layer;
   the path itself is not visible on the chart.
5. Search box: typing an account ID gave no visible result or "no match".
6. Analyze list badges PageRank as "Start here"; "Follow edges" and the weight options use
   developer vocabulary.
7. "4 accounts, 3 transfers" only selects; it does not focus or isolate the path on the chart.
8. No sign of an export (CSV of the hops, picture for the case file) on the result.
9. No indication whether other routes exist between the two accounts.
