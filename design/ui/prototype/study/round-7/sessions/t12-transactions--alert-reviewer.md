# Session: money trail from ACC-271813 to ACC-233575 -- Nadia, level-1 alert reviewer

Task as given: "Money left account ACC-271813 and ended up in ACC-233575, which the monitoring
system marked as suspicious. Through which accounts did it travel, counting only transfers in the
way the money actually moved, and how much passed along the way?"

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t12-transactions--alert-reviewer/.

## Start screen (shots/tasks/t12-transactions/01.png)

"OK. A big gray blob of hexagons, 3,000 nodes, 9,113 edges. Right side is numbers I don't need --
density, reciprocity. Fine. What I always do first: paste the account number into the first search
box. There's one top left, 'Find rows and notes'."

## Step 1 -- click the search box

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/01.png task:t12-transactions --click "Find rows and notes"

"Box is focused. Pasting ACC-271813."

## Step 2 -- type the account number

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/02.png task:t12-transactions --click "Find rows and notes" --type "ACC-271813"

"Nothing. The box is still empty, no results, no 'no match'. Either it didn't take my paste or it
doesn't search accounts. I don't know which. That's the first thing I'd do on every alert, and it
just ignored me. Moving on -- there's an 'Analyze' link under the list."

## Step 3 -- Analyze

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/03.png task:t12-transactions --click "Analyze"

"A list of things. Louvain, PageRank -- no idea. But 'Shortest path: the fewest steps, or the
lightest route, between two nodes.' Money from A to B, that's a route between two. Trying that.
I'd have hoped 'Total amount' meant something useful too but that's per account, not a trail."

## Step 4 -- Shortest path

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/04.png task:t12-transactions --click "Analyze" --click "Shortest path"

"Oh -- From is ACC-271813 and To is ACC-233575 already. Good, I didn't have to copy them. (I don't
know how it knew. Probably from the alert.) Direction: 'Follow edges' or 'Either way'. The task says
only the way the money moved, so I want following the transfers, I think 'Follow edges' is that.
'Edges' is not a word I use, but it's already picked. Weight: 'amount (loaded weight)', 'Stronger',
'Farther', 'Capacity', '1/amount'... I'm not touching that. I don't know what it changes and I'd
have to explain it to QA. Scope whole graph. Find path."

## Step 5 -- Find path

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/05.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path"

"Right panel is what I wanted:

- ACC-271813 (business, risk score 1), start -- out 3,530.28 on 4 Mar
- ACC-946224 -- in 3,530.28, out 9,468.23 on 7 Mar
- ACC-670564 -- in 9,468.23, out 9,399.31 on 9 Mar
- ACC-233575 (personal, risk score 98, flagged), end -- in 9,399.31

'Dates in order: Yes' on every hop. That's actually the thing I'd check by hand -- that it isn't
money going backwards in time. Good.

But: the panel says Total amount 22,397.82. The little bar at the bottom says '3 edges, total
amount 22,929.05'. Those are different numbers for the same thing. I added it up myself:
3,530.28 + 9,468.23 + 9,399.31 = 22,397.82. So the panel is right and the bottom bar is wrong, or
it's counting something else. Which one do I write down? QA will ask.

And honestly a total of the three transfers is not 'how much passed along'. Only 3,530.28 left the
first account. The second account sent on 9,468 -- more than it got from this trail -- so it's
mixing in other money. What actually could have traveled the whole way is at most 3,530.28. The tool
doesn't say that; I worked it out from the in/out lines.

Also: the whole graph is now colored in communities -- 'Louvain, 35 groups', and 'Links in (count)'
appeared in the list. I didn't ask for those. Did I do that? Did clicking Find path also run them?
And I can't see my path on the picture at all. It's a hairball with orange dots everywhere, and the
path is orange too. If I screenshot this for the alert file, nobody can see the route."

## Step 6 -- click the bottom bar to see what 22,929.05 is

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/06.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "3 edges, total amount 22,929.05"

"Nothing happened. Still two totals."

## Step 7 -- 'All options...' under Made with

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/07.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "All options..."

"Direction 'Follow it' -- OK, so it did follow the transfers. Good. Weight 'amount, farther'. But the
form said 'Stronger' was picked. So either it ran with something other than what I saw, or the words
mean the same thing. I can't tell. Data version transfers-2026-03.csv -- that one's useful for the
file."

## Step 8 -- the three-dot menu, looking for export

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-transactions--alert-reviewer/08.png task:t12-transactions --click "Analyze" --click "Shortest path" --click "Find path" --click "More"

"There's an Export... in there, but the menu is titled 'Community 3'. I wanted the menu for my path,
not some community I've never heard of. I'm not exporting the wrong thing into an alert file. I
stop here."

## Answer I would write down

ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, transfers in date order:
3,530.28 (4 Mar), 9,468.23 (7 Mar), 9,399.31 (9 Mar). Sum of the three transfers 22,397.82 (the app
also shows 22,929.05 elsewhere; I can't reconcile it). At most 3,530.28 of the original money can
have made the full trip, because the middle accounts paid out more than they received from this
trail. I'd escalate: business account to a flagged personal account in three hops in five days.

## Debrief

- Succeeded? Mostly. I'm fairly sure of the route and the three amounts. I'm not sure which total
  is right, and I'm not sure this is the only route -- it found the "shortest" one, and that is not
  the same as "the way the money went".
- Single Ease Question: 4 of 7. Getting the route was three clicks and quick. Then I spent longer
  doubting it than finding it: two totals, a weight setting that changed name, coloring I didn't
  ask for, and a menu for the wrong thing.
- Would I use it instead of my current tool? Not for a normal alert -- most of mine clear on one
  transfer, and the search box didn't take an account number. For one like this, where the
  counterparties matter, the member list with in/out amounts and "dates in order" is better than
  my spreadsheet. But I couldn't get a picture that shows the route, and I couldn't export it
  cleanly, so it wouldn't go in the alert file. I'd hand it to level 2 and tell them where to look.
