# Session: money trail from ACC-271813 to ACC-233575 -- Dana Okafor, supply chain risk analyst

Task as given by the moderator: "Money left account ACC-271813 and ended up in ACC-233575, which
the monitoring system marked as suspicious. Through which accounts did it travel, counting only
transfers in the way the money actually moved, and how much passed along the way?" (Sample data:
one month of card and bank transfers. If not your line of work, treat accounts as your own things.)

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t12-transactions--supply-chain-analyst/.

## Start screen (shots/tasks/t12-transactions/01.png)

"OK, so for me: accounts are suppliers, transfers are shipments or payments, and I want the chain
from one to the other. Transfers, March 2026. 3,000 'nodes', 9,113 'edges' -- I don't use those
words, but fine, accounts and transfers. The picture is a gray honeycomb blob. Nice, tells me
nothing. 'Local only' at the top -- I hope that means my data is not going to a server, that is
the first thing IT will ask. First thing I do in any tool: type the name in the search box."

## Step 1 -- search for the account

    timeout 120 node app-b/study.mjs --try .../01.png task:t12-transactions --click "Find rows and notes" --type "ACC-271813"

Render 01: "The box got a blue outline but nothing came up. No
list, no 'did you mean'. Either it did not take my typing or it needs Enter. I am not going to
fight a search box. There's a blue link 'Analyze' under it -- try that."

## Step 2 -- Analyze

    timeout 120 node app-b/study.mjs --try .../02.png task:t12-transactions --click "Analyze"

Render 02: "A list. Louvain, PageRank -- no idea, not clicking those. 'Shortest path -- The fewest
steps, or the lightest route, between two nodes.' That's the closest thing to 'how did it get
from A to B'. Though 'fewest steps' is not the same as 'the way the money actually went'. Let's
see."

## Step 3 -- Shortest path

    timeout 120 node app-b/study.mjs --try .../03.png task:t12-transactions --click "Analyze" --click "Shortest path"

Render 03: "Path between. From ACC-271813, To ACC-233575 -- it already filled them in, good, saves
me the search I could not do. Direction: 'Follow edges' or 'Either way'. 'Follow edges' is
highlighted. I'm guessing that means 'only in the direction it was sent', which is what I was
asked. 'Either way' sounds like it would let money flow backwards, so no. Weight: amount,
'Stronger / Farther / Capacity' -- Stronger is selected. There is a gray sentence about 1/amount;
I skip it. I'll leave the defaults. Find path."

## Step 4 -- Find path

    timeout 120 node app-b/study.mjs --try .../04.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path"

Render 04: "Right side, that's what I want -- a list. ACC-271813 (start) -> ACC-946224 ->
ACC-670564 -> ACC-233575 (end). Three transfers: 3,530.28 on 4 Mar, 9,468.23 on 7 Mar, 9,399.31
on 9 Mar. 'Dates in order: Yes' on every hop -- that's actually smart, it tells me the money
could really have flowed that way and it's not just three random payments that happen to
connect. I like that column.

"But now the numbers. Summary says Total amount 22,397.82. The little bar at the bottom says
'3 edges, total amount 22,929.05'. Those are different. Which one do I believe? 3,530 + 9,468 +
9,399 is 22,397.82, so the bar at the bottom is wrong, or it is counting something I can't see.
That's exactly the thing that makes me stop trusting every number.

"And 22 thousand isn't 'how much passed' anyway -- adding three hops counts the same money three
times. Only 3,530 left ACC-271813 on this route, and then 9,468 goes out of the next account --
more than came in, so that account is mixing in other money. If my VP asked 'how much of it got
there', I'd say at most 3,530, not 22k. The tool doesn't say that; I worked it out.

"Also 'Made with: Weight amount, farther'. I left it on Stronger. Did it use something else?

"And the picture: it turned into a hairball colored by 'Community 1..7, 28 more communities' --
I didn't ask for communities. There's a 'Louvain' and a 'Links in (count)' in the left list
that I never ran. I can't find my four accounts in that picture at all. The bottom strip with
'Table / Nodes / Edges' is gone too."

## Step 5 -- click "4 accounts, 3 transfers"

    timeout 120 node app-b/study.mjs --try .../05.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "4 accounts, 3 transfers"

Render 05: "Tooltip 'Selects the path's accounts and transfers'. I can't see anything get
selected in the picture. Nothing I can see changed."

## Step 6 -- try to get the table

    timeout 120 node app-b/study.mjs --try .../06.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "Table" --click "Edges"

"Nothing on screen is called Table." "The table bar was there before I ran the path. Now it's
gone. I wanted the rows to paste into Excel."

## Step 7 -- All options... (why does it say 'farther'?)

    timeout 120 node app-b/study.mjs --try .../07.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "All options..."

Render 07: "Made with: Weight amount, farther. Direction 'Follow it'. Scope full graph, 3,000
accounts. Data version transfers-2026-03.csv. Good -- direction is 'follow it', so it only went
the way the money moved. But it still says 'farther' and I picked, or left, 'Stronger'. Either
the form showed me the wrong default, or it changed my setting. I don't know which. I'm stopping
here."

## Answer given

Route: ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, transfers in date order (4, 7, 9
March) of 3,530.28, 9,468.23 and 9,399.31. Total of the three transfers 22,397.82 (the tool
also shows 22,929.05 in another place). Money that can have come from ACC-271813 along this
route: at most 3,530.28.

## Debrief

- Succeeded? "Mostly. I have the route and the amounts. I'm not sure it's the only route or the
  one the money really took -- it says 'shortest', and fraud doesn't take the shortest route,
  it takes whatever route. And I have two totals that don't match."
- Single Ease Question: 5 of 7. "Getting there was easy because it filled in the two accounts
  for me. Search didn't work, the totals disagree and the settings summary says something I
  didn't pick."
- Would I use this instead of my current tool? "For this kind of 'how did it get from A to B'
  question -- for me, which Tier 2 or 3 supplier sits behind a Tier 1 -- yes, this beats
  Excel; I can't do a multi-hop trace with a pivot. The 'dates in order' check is something I'd
  never build myself. But only as a side tool: no Power BI route I could see, the table
  disappeared when I wanted to export, and I'd need IT to confirm 'Local only' really means the
  data stays on my laptop. And the usual question: where do I get the Tier 2 links from? This
  works because the sample has every transfer. My data doesn't."
