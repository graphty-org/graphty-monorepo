# Session: filter to transfers of 1,000 or more -- Analyst Alex

Task as given by the moderator: "From now on you only care about transfers of 1,000 or more. Make
every count, drawing and later calculation describe only those, then say how many accounts are
left and whether the summary numbers on screen describe what is left."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t07--analyst-alex/`.

## Start screen (shots/tasks/t07/01.png)

"OK, Transfers, March 2026. Summary on the right: 3,000 nodes, 9,113 edges, one weak component.
'Local only' up top -- good, that's the first thing I look for. Gray hexagon blob in the middle,
so it's binned, fine. I want to filter out the small stuff. In Gephi that's the Filters tab. Up
top there's a funnel that says 'Full graph'. That's the closest thing to a filter I can see, so
I'll click it."

## Step 1 -- the funnel

    timeout 120 node app-b/study.mjs --try .../01.png task:t07 --click "Full graph"

"Huh. It jumped me to a Data panel, and there's already a filter: 'amount is at least 1,000',
ticked, '812 of 3,000 nodes'. I didn't type 1,000. Either somebody set this up before me or the
funnel button just did it. Either way, that's what I want, so I'll take it. The top bar now says
'812 of 3,000 nodes'.

But look at the summary on the right: Nodes '812 of 3,000' -- OK -- and Edges 9,113. That's the
unfiltered edge count. If I've thrown away every transfer under 1,000 there is no way the edge
count is still 9,113. Density 0.00101, average degree 6.08, highest degree 907 -- those are all the
same as before. And there's a strip at the top: '5 readings are for all 3,000 nodes' with a
'Compute on 812' button. So it knows the numbers are stale. Fine, I'll press it."

## Step 2 -- 'Compute on 812'

    timeout 120 node app-b/study.mjs --try .../02.png task:t07 --click "Full graph" --click "Compute on 812"

"That didn't compute anything. A menu dropped down over the button -- 'Transfers', Select all
visible, Invert selection, Fit, Re-run layout, Compute the overview, Clear graph data. I clicked
the button, I got a menu. Let me close it and click again."

    timeout 120 node app-b/study.mjs --try .../03.png task:t07 --click "Full graph" --click "Compute on 812" --key Escape --click "Compute on 812"

"Same menu, again. OK, 'Compute the overview' is in there. That sounds like the same thing."

    timeout 120 node app-b/study.mjs --try .../04.png task:t07 --click "Full graph" --click "Compute on 812" --click "Compute the overview"

"Wait. Now the right side says 'Co-appearances, from miserables.gexf', 77 nodes, 254 edges,
undirected. That's not my data. That's the Les Miserables demo. The left side still says my
accounts file. So I clicked 'compute' and it showed me the summary for a different graph. If I had
copied that into a slide I'd be in trouble. I'm not trusting that button."

## Step 3 -- what does the filter actually do

    timeout 120 node app-b/study.mjs --try .../05.png task:t07 --click "Full graph" --click "amount is at least 1,000"

"Clicking the filter row opens its settings: amount, is at least, 1,000. And a line that says
'amount is on edges: this step keeps the transfers that pass and the accounts at their ends'.
Good -- that's exactly what I meant, and I'm glad it says it, because 'amount' is on the transfers,
not the accounts. 812 accounts left. But it never tells me how many transfers are left. That's
the number I'd actually check against SQL."

## Step 4 -- is the drawing filtered, and the earlier calculations

    timeout 120 node app-b/study.mjs --try .../06.png task:t07 --click "Full graph" --click "Graph"

"Back on the Graph panel it's now drawing nodes colored by Louvain, 35 groups -- I don't remember
running that, but there it is, 'from Louvain, Sep 28'. Sizes: 297, 182, 147, 141, 139, 123, 120,
and 'Other' 1,851. Add those up: 3,000. So the communities are for all 3,000 accounts, not my 812.
Nothing on it says 'computed before the filter'. The modularity, 0.688, is for the full graph too,
then. The picture still looks like the full hairball to me."

    timeout 120 node app-b/study.mjs --try .../07.png task:t07 --click "Full graph" --click "Graph" --click "Everything"

"'Everything -- Paints 3,000 nodes, 9,113 edges.' While the top bar says 812 of 3,000. So is the
drawing 812 or 3,000? It's telling me both."

## Step 5 -- the table

    timeout 120 node app-b/study.mjs --try .../08.png task:t07 --click "Full graph" --click "Table"
    timeout 120 node app-b/study.mjs --try .../09.png task:t07 --click "Full graph" --click "Table" --click "Edges"
    timeout 120 node app-b/study.mjs --try .../10.png task:t07 --click "Full graph" --click "Table" --click "Edges" --click "Columns: 4 of 4"

"Nodes table: '3,000 nodes (before the filter)', columns say 'count, full graph'. Edges table:
'9,113 edges (before the filter)', and the first rows are 5.04, 8.97, 44.6 -- exactly the
transfers I said I don't care about. At least it's honest that it's before the filter. But I can't
find a switch to show only what's left. The Columns popup just picks columns. Sum of amount on
all 9,113 rows is 14,156,522 -- again the full set."

## Step 6 -- the top-bar count

    timeout 120 node app-b/study.mjs --try .../11.png task:t07 --click "Full graph" --click "812 of 3,000 nodes"

"Clicking the '812 of 3,000' chip opened the filter again -- but now there are '2 steps, 2 on':
my amount filter and 'kind is not merchant, kept all 812 nodes'. I didn't add that. Where did it
come from? The count didn't change, but I don't like filters showing up that I didn't put there."

    timeout 120 node app-b/study.mjs --try .../12.png task:t07 --click "Full graph" --hover "Compute on 812"

"Hovering the 'Compute on 812' button: no tooltip, nothing. I've tried it three ways. I'm done."

## Outcome

- How many accounts are left: **812 of 3,000.** That number I believe -- the filter row, the
  top bar and the summary all agree on it.
- Do the summary numbers describe what is left: **No.** Edges still says 9,113, and density,
  average degree, highest degree and components are the full-graph values; the panel itself says
  "5 readings are for all 3,000 nodes". The Louvain communities add up to 3,000, so they are the
  full graph as well, with nothing on them saying so. The "Everything" row says it paints 3,000
  nodes and 9,113 edges.
- Did I get every count, drawing and calculation onto the 1,000-plus transfers: **No.** The one
  button meant to do that, "Compute on 812", opened a menu every time, and the menu's "Compute
  the overview" showed me a summary for a different dataset (Les Miserables, 77 nodes).

**Did I succeed?** Half. I know 812 accounts are left and I know the numbers on screen are mostly
not about them. I could not make them be about them, and I never found how many transfers survive
the filter.

**Single Ease Question: 3 / 7.** Getting the filter was easy -- too easy, it was already there.
Everything after that fought me.

**Would I use this instead of what I use now?** Not for this. In pandas this is one line,
`df[df.amount >= 1000]`, and every number after it is about the filtered frame -- I'd never have to
wonder. Here the app knows its numbers are stale (it says so, which I'll give it credit for -- Gephi
just doesn't tell you), but the fix button didn't work and the one thing it did compute was for the
wrong graph. A filter I didn't add appearing on its own, and a community result I didn't run, make
me unsure what state I'm in. If the "Compute on 812" button worked and the edge count followed the
filter, I'd use it for the picture part -- the 'amount is on edges' explanation was genuinely
helpful.
