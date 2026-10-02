# Session: overview of the month's transfers -- Nadia, level-1 alert reviewer

Task as given: "Someone on your team brought this month's transfers into a project and has
started on them; you were just looking at one account. Before anyone works the month, check what
came in overall: how many accounts and transfers, whether the transfers run one way, whether
everything hangs together or falls into separate pieces, and whether anything looks off."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t01-transactions--alert-reviewer/ (referred to below as $D).

## Start screen (shots/tasks/t01-transactions/01.png)

"OK. Big gray blob of hexagons in the middle. On the right is ACC-633005, a business account in
GB, risk score 3, not flagged, degree 15 -- that's the one I was looking at, I guess. I don't need
that account, I need the whole month. On the left there's a list: Selection, Notes, Louvain with
35 groups, Links in, Everything. 'Everything' sounds like the whole month. Let's try that."

## Step 1 -- Everything

    timeout 120 node app-b/study.mjs --try $D/01.png task:t01-transactions --click "Everything"

"Right side says 'Paints 3,000 nodes, 9,113 edges'. Then a color picker, shape, 'faceted
sphere'. So this is a styling thing, not a summary. But fine, I'll take the numbers: 3,000
accounts, 9,113 transfers. I'd write that down. I'm not sure 'paints' means 'has', though --
if something was hidden would it still say 3,000?"

## Step 2 -- the "Transfers" dropdown next to Graph

    timeout 120 node app-b/study.mjs --try $D/02.png task:t01-transactions --click "Transfers"

"Transfers, 3,000 nodes, and 'Compare graphs'. Same number. Nothing about direction. Close it."

## Step 3 -- Everything, then Data

    timeout 120 node app-b/study.mjs --try $D/03.png task:t01-transactions --click "Everything" --click "Data"

"I meant the Data tab on the right, but it took me to the Data page on the far left. Whatever --
this is better. Sources: accounts-2026-03.csv, 3,000 nodes; transfers-2026-03.csv, 9,113 rows,
9,113 edges. Good, rows match edges, nothing dropped on import. That's the first thing QA would
ask.

Right side, Summary: Nodes 812 of 3,000. Wait. Why 812? Top bar says '812 of 3,000 nodes' now.
On the first screen it said 'Full graph'. Did I just turn a filter on? There's a filter in the
left list, 'amount is at least 1,000', checked, 812 of 3,000 nodes. I didn't touch it. Somebody
on my team set it, maybe, but the Graph page said 'Full graph'... I don't know which one is true.
And edges still says 9,113 -- all of them -- next to 812 of 3,000 nodes. That doesn't add up.

There's a gray line '5 readings are for all 3,000 nodes', with a button 'Compute on 812'. OK so
the numbers under it are the whole month, I think. Reading them:
- Direction: Directed.
- Weak components: 1. I think that means it is all one piece. 'Weak' -- I don't know what weak
  means here, I'm guessing it's 'connected if you ignore the arrows'.
- Reciprocity: 0. I'd guess that means no one sends money back to someone who sent them money.
  So 'runs one way'? Maybe. I wouldn't put the word reciprocity in an alert file.
- Highest total degree: 907. Average 6.08. One account touching 907 transfers when the average
  is 6 -- that's what looks off. Could be a payment processor or payroll, could be a mule hub.
- Little chart says 0 at degree 0, so no account without transfers."

## Step 4 -- check the first screen's Data page directly

    timeout 120 node app-b/study.mjs --try $D/05.png task:t01-transactions --click "Data"

"Same thing straight from the start, so the filter was already on, it's just that the Graph page
said 'Full graph'. Confusing. Two pages, two answers about whether I'm looking at everything."

## Step 5 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try $D/06.png task:t01-transactions --click "Data" --click "4 more readings not computed"

"I wanted the four more readings. It opened a menu instead: Select all visible, Invert selection,
Fit, Re-run layout, ... 'Compute the overview', ... 'Clear graph data'. Clear graph data sitting
right there in the same menu makes me nervous. I'll try Compute the overview."

## Step 6 -- Compute the overview

    timeout 120 node app-b/study.mjs --try $D/07.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"What? Right panel now says 'Co-appearances, from miserables.gexf', 77 nodes, 254 edges,
Undirected. That is not my data. The left side still says transfers-2026-03.csv. So now I don't
trust any number on that panel. If this went into an alert file and QA saw 'Les Miserables' I'd
be explaining it for a week. I'm going back to the numbers from before and ignoring this."

## Step 7 -- try to find the 907 account

    timeout 120 node app-b/study.mjs --try $D/08.png task:t01-transactions --click "Data" --click "907"

"Clicking 907 does nothing. I want to know WHICH account that is. That's the whole point."

    timeout 120 node app-b/study.mjs --try $D/09.png task:t01-transactions --click "Data" --click "Weak components"

"Clicking the components line opened a table under the picture: 3,000 nodes (before the filter),
sorted by links total, down arrow. But it shows rows 381 to 420, not the top. My account
ACC-633005 is first in view with 15 -- so it jumped to where my account sits, not to the biggest.
These businesses all have 0 links in and only links out."

    timeout 120 node app-b/study.mjs --try $D/10.png task:t01-transactions --click "Data" --click "Weak components" --click "Links in (count, full graph)"

"Sorted by links in, still rows 381 to 420. Personal accounts here have some in and some out, so
it's not strictly one way per account -- businesses send, personal accounts send and receive.
I'd have to page back ten pages to get to the top. I'm not doing that. In Excel I'd sort and the
top row would be at the top."

## Step 8 -- anything flagged?

    timeout 120 node app-b/study.mjs --try $D/11.png task:t01-transactions --click "Data" --click "flagged"

"I clicked 'flagged' to see how many are flagged. It showed me 'amount' instead. Wrong thing --
but it's useful: 9,113 transfers, 14,156,522.28 in all, 1,553.44 on average, smallest 0.50,
biggest 98,400, every transfer has an amount. Most are small, long tail. Still no idea how many
accounts are flagged. I'm stopping here."

## What I'd write down

- 3,000 accounts, 9,113 transfers (both files load fully: 9,113 rows = 9,113 edges).
- Directed. Reciprocity 0 -- no pair sends both ways. Business accounts in view only send.
- One piece (1 weak component), no accounts with zero transfers.
- Looks off: one account with 907 transfers against an average of 6. Could not find which one.
- Amounts 0.50 to 98,400, 14.16M total.
- A filter 'amount is at least 1,000' is switched on (812 of 3,000 accounts) even though the
  graph page said 'Full graph'.

## Debrief

Did I succeed? Mostly. I got the counts, the direction, the one-piece answer and an odd hub. I
did not get which account the hub is, or how many accounts are flagged, and one screen showed me
a completely different dataset, which shakes my trust in the rest.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not for alerts -- I clear most alerts with one
transfer and a profile, and this would add minutes. For a month overview like this, maybe, if the
summary panel stayed on my data, the hub number was clickable to the account, the table sort put
the top row at the top, and I could export the summary as one picture and a few lines for the
file. Today I'd do it in a spreadsheet with a pivot table and trust it more.
