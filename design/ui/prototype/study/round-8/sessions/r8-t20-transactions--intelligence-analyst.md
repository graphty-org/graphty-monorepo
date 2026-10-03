# Session: keep only transfers of 1,000 or more -- Marcus, criminal intelligence analyst

Task as given: "A month of card transfers between accounts is open. If you do not work in
banking, this is example data, not your own. You want every count and every drawing from now on
to include only transfers of 1,000 or more. Set that up, then say how many accounts are left."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t20-transactions--intelligence-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t20-transactions/01.png)

Think-aloud: "Transfers, March 2026. 3,000 nodes, 9,113 transfers. Big gray honeycomb in the
middle -- that's not a link chart, that's a heat map of a beehive. Fine, whatever. I need to cut
it down to the big transfers. Up top there's a little funnel that says 'Full graph'. Funnel means
filter. Start there."

## Step 2 -- click the funnel

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t20-transactions --click "Full graph"

Result: the left side switched to a Data page: Sources (accounts and transfers CSVs), Filters,
Attributes. Filters says "No filters. Filters change what is computed; the eye in the Graph tree
only hides. Add filter step."

Think-aloud: "It threw me to a different page instead of dropping a menu. Okay. But that one line
is useful -- 'filters change what is computed, the eye only hides.' That's exactly the
difference I care about. Hiding something and then having the count still include it is how you
end up wrong on the stand. Add filter step."

## Step 3 -- add a filter step

    ... --click "Full graph" --click "Add filter step"

(The tool said two controls are called "Add filter step"; it took the first, the link in the
Filters box.)

Result: a "New step" appears in Filters, checked on. On the right, "Condition: Keep [Pick one]"
with a menu: By an attribute or computed value / Top of a computed value / Largest component /
k-core / Neighbors of the selection (grayed, "select nodes first").

Think-aloud: "Keep by an attribute. Amount's an attribute on the transfers. k-core I don't know
and don't need."

## Step 4 -- by an attribute

    ... --click "By an attribute or computed value"

Result: a list grouped by table: accounts (id, alertRule, alertTime, country, flagged, kind,
riskScore), transfers (amount -- marked Weight, timestamp), computed values (degree).

Think-aloud: "Good, it splits accounts from transfers so I'm not guessing which amount. Amount."

## Step 5 -- first try at amount (went to the wrong place)

    ... --click "amount"

Result: I landed on a page about the amount column itself -- read as Number, role Weight, a
histogram from 0.50 to 98,400, average 1,553.44. The filter step was still "New step".

Think-aloud: "That's not what I clicked for. Same word sits in the list on the left and in the
dropdown. Nice histogram, though -- average 1,553, so cutting at 1,000 isn't going to leave a
handful." (The click went to the left-hand Attributes list, not the open dropdown. I aimed at the
dropdown option by its full name next.)

## Step 6 -- amount, from the dropdown

    ... --click "By an attribute or computed value" --click "amount, in use: Weight, transfers"

Result: the step became "amount is at least [ ]", with the comparison already set to "is at
least". Under it: "amount is on edges: this step keeps the edges that pass and the nodes at their
ends." "Apply this step" checked. "This step: 3,000 of 3,000 nodes."

Think-aloud: "'At least' already picked. And it tells me in plain words what happens to the
accounts -- you keep the transfers that pass and the accounts at either end. That's the rule I'd
have assumed, but it's nice to see it written down, because I'll have to say it to an ADA."

## Step 7 -- type 1000

    ... --click "amount, in use: Weight, transfers" --type "1000" --key Enter

Result: step reads "amount is at least 1000 -- 812 of 3,000 nodes (the full graph)". The top bar
funnel changed from "Full graph" to "812 of 3,000 nodes". The amount attribute on the left grew a
little funnel next to it.

Think-aloud: "812 of 3,000. Top bar says it too, so I'll know it's on when I come back. But the
picture didn't change. At all. Same honeycomb, same shading. Panel says 812, screen looks like
3,000. Which one's lying?"

## Step 8 -- back to the graph to check the numbers

    ... --key Enter --click "Graph"

Result: Summary says Nodes "812 of 3,000 nodes" but Edges still "9,113 transfers". A bar above
the tabs: "5 readings are for all 3,000 nodes [Compute on 812]".

Think-aloud: "So the numbers under that bar are from before the filter. At least it says so
instead of passing them off. But the Edges line says 9,113 -- that's every transfer in the
month. That can't be right if I just threw out everything under a thousand. Hit compute."

## Step 9 -- compute on 812

    ... --click "Graph" --click "Compute on 812"

Result: the bar went away. Readings changed: density 0.00214, weak components 4 (was 1), average
total degree 3.47 (was 6.08), highest total degree 211 (was 907), plus clustering, transitivity,
diameter 12, assortativity. Nodes still "812 of 3,000 nodes". Edges still "9,113 transfers, each
a distinct pair". The drawing still unchanged.

Think-aloud: "The readings moved, so those are on the filtered set. Highest degree went from 907
to 211 -- one account was doing a ton of small transfers. That's interesting by itself. But
Edges: 812 accounts times 3.47 links, halved, is about 1,400 transfers, not 9,113. The edge
line didn't follow the filter. And the drawing is the same blob it was when I opened it. You
asked for every count AND every drawing. I can vouch for one of those."

Stopped here.

## Answer

812 accounts are left (of 3,000).

## Did I succeed?

Mostly. The filter is set, it is on, it shows in the top bar, and the account count and the
readings follow it. What I can't vouch for: the Edges line still says 9,113 transfers, which is
the whole month, and the picture did not visibly change. If I'd stopped at step 7 I'd also have
had stale readings sitting under a correct node count; the "Compute on 812" bar caught that, but
I had to go find it on another page and press a button I didn't expect to need after being told
filters "change what is computed".

## Single Ease Question

5 of 7. The path to the filter was short and the words were plain. Lost points for landing on the
column page instead of the filter (same word in two places), for having to press a separate
compute button, and for two things on screen that disagree with the filter.

## Would I use this instead of my current tool?

Not yet. In Excel this is a filter on one column and a COUNTUNIQUE -- two minutes, and I trust
the number. Here I got the number about as fast, and the "keeps the transfers that pass and the
accounts at their ends" line is the kind of thing I'd want printed on the chart. But a summary
that says 812 accounts and 9,113 transfers in the same box, over a picture that never changed,
is the "side panel says 212, I count forty" problem. Until every number and the drawing agree
with the filter without me hunting for a button, I'd do the counts in Excel and use this only to
look.

## Problems noticed

- The drawing did not visibly change after filtering to 812 of 3,000 accounts.
- The Edges count stayed at 9,113 (the whole month) after the filter and after "Compute on 812".
- Readings stayed computed on the full graph until a separate "Compute on 812" was pressed, on a
  different page from where the filter was set; the filter page itself said filters "change what
  is computed".
- "amount" appears both in the left Attributes list and in the open attribute dropdown; my first
  click opened the column's own page instead of picking it for the filter.
- Clicking the "Full graph" funnel moved the whole left panel to another page rather than opening
  a menu.

## What worked

- "Filters change what is computed; the eye only hides" -- exactly the distinction that matters.
- "amount is on edges: this step keeps the edges that pass and the nodes at their ends" -- the
  rule in one sentence.
- The dropdown grouped attributes by table (accounts vs transfers).
- The top-bar funnel showing "812 of 3,000 nodes", so a filter can't be left on by accident.
- The stale-readings bar named the problem instead of showing old numbers as current.
