# Session: check what came in (transfers) -- Chris, ML engineer, recommendation systems

Task as given: "Someone on your team brought this month's transfers into a project and has started
on them; you were just looking at one account. Before anyone works the month, check what came in
overall: how many accounts and transfers, whether the transfers run one way, whether everything
hangs together or falls into separate pieces, and whether anything looks off."

Renders: design/ui/prototype/tmp/round-7-sessions/t01-transactions--ml-engineer-recsys/
All commands run from design/ui/prototype. `PFX` below stands for that renders folder.

## Start screen (shots/tasks/t01-transactions/01.png)

One account, ACC-633005, is selected; the right panel shows its row (kind business, GB, riskScore
3, degree 15, pagerank 0.000764). Canvas is a gray hex density blob. Left panel is "Graph" with
Louvain 35 groups and "Links in (count)". Top bar says "Full graph".

> "OK, I'm on one account. I want the whole-graph numbers: node count, edge count, directed or
> not, components. Nothing on the canvas gives me a count, and a hex blob is a hairball with
> better manners. The left rail has 'Data'. That's where I'd expect a summary."

## Step 1 -- open Data (01.png)

    timeout 120 node app-b/study.mjs --try PFX/01.png task:t01-transactions --click "Data"

Left: two sources, accounts-2026-03.csv (3,000 nodes) and transfers-2026-03.csv (9,113 rows, 9,113
edges); a filter "amount is at least 1,000", on, "812 of 3,000 nodes". Right: a graph summary card:
Nodes 812 of 3,000, Edges 9,113, Directed, Weight amount, Density 0.00101, Weak components 1,
Reciprocity 0, Average total degree 6.08, Highest total degree 907, "4 more readings not computed",
and a log-log degree CCDF, degree 0: 0. A banner "5 readings are for all 3,000 nodes" with a
"Compute on 812" button.

> "There it is. This is the bit I'd normally write in a notebook. 3,000 accounts, 9,113 transfers,
> 9,113 rows in and 9,113 edges out, so nothing got dropped on import. Directed, reciprocity zero:
> nobody sent money back to someone who sent them money. One weak component, so it hangs together.
> Zero isolated nodes.
>
> But hold on. The top bar now says '812 of 3,000 nodes' and there's a filter on, amount at least
> 1,000. Two minutes ago in the Graph tab that same spot said 'Full graph'. Which is it? Somebody
> left a filter on and the Graph view didn't tell me. The banner says the readings are on all 3,000,
> and 9,113 edges matches the file, so I believe these are unfiltered. Good that it says so. I had
> to work it out from the edge count, though.
>
> And the thing that's off: highest total degree 907 when the average is 6. One account touches
> close to a third of the graph. In my world that's the bestseller everyone co-bought, here it's
> either a payment processor or a problem. The CCDF has a hard tail out to 907, so it's not a
> rounding thing."

## Step 2 -- "4 more readings not computed" (02.png)

    timeout 120 node app-b/study.mjs --try PFX/02.png task:t01-transactions --click "Data" --click "4 more readings not computed"

It opened the graph's overflow menu (select all, fit, re-run layout, "Compute the overview",
add node, add note, clear graph data) instead of expanding the list.

> "That's not what I clicked. I asked for four readings and got a context menu. 'Compute the
> overview' is in there, fine, try it."

## Step 3 -- "Compute the overview" (03.png)

    timeout 120 node app-b/study.mjs --try PFX/03.png task:t01-transactions --click "Data" --click "4 more readings not computed" --click "Compute the overview"

The right panel switched to "Co-appearances, Graph from miserables.gexf": 77 nodes, 254 edges,
undirected, clustering 0.573, diameter 5. The left panel and the top bar still said Transfers.

> "Wait. Les Miserables? 77 nodes, undirected? That's the networkx toy graph. My sources on the left
> still say transfers. So the app just showed me stats for a different dataset under my project's
> name. If this were real I'd close the tab right here. You get exactly one of these before I stop
> trusting every number on the page, including the ones I already read."

## Step 4 -- "Compute on 812" instead (04.png)

    timeout 120 node app-b/study.mjs --try PFX/04.png task:t01-transactions --click "Data" --click "Compute on 812"

Same overflow menu again.

> "Same menu. Both 'compute' entry points lead to the same menu, and the only compute item in it
> gave me Les Mis. I'm done with the compute buttons. The first card already answered most of the
> question."

## Step 5 -- try to find the 907 hub (05.png)

    timeout 120 node app-b/study.mjs --try PFX/05.png task:t01-transactions --click "Data" --click "907"

Nothing happened.

> "907 isn't a link. I want 'show me that node'. The obvious next click after an outlier is the
> outlier."

## Step 6 -- open the table (06.png)

    timeout 120 node app-b/study.mjs --try PFX/06.png task:t01-transactions --click "Data" --click "Table"

Node table: "3,000 nodes (before the filter)", columns id, Links in / out / total (count, full
graph), kind, country. Sorted by links total, descending, but showing rows 381 to 420 (around the
selected account). The business accounts visible have 0 links in, all out.

> "Now this I like. Ids intact, and it tells me the denominator: before the filter, full graph.
> That's what I check first in anything. Business accounts with zero in-links, all out. Smells
> like two sides, senders and receivers, like users and items. But it parked me at row 381 because
> of the selected account, so I'm not looking at the top of the sort."

## Step 7 -- sort by links in (07.png)

    timeout 120 node app-b/study.mjs --try PFX/07.png task:t01-transactions --click "Data" --click "Table" --click "Links in (count, full graph)"

Sorted by links in, descending; still rows 381 to 420; personal accounts with both in and out links.

> "Personal accounts send and receive, so it's not cleanly bipartite. Still stuck at row 381."

## Step 8 -- the left arrow (08.png, 09.png)

    timeout 120 node app-b/study.mjs --try PFX/08.png task:t01-transactions --click "Data" --click "Table" --click "Links in (count, full graph)" --hover "Previous"
    timeout 180 node app-b/study.mjs --try PFX/09.png task:t01-transactions --click "Data" --click "Table" --click "Links in (count, full graph)" --click "Previous rows" (x10)

Tooltip "Previous rows". Ten clicks later still rows 381 to 420; a tooltip says the skeleton
holds one page.

> "Forty rows a page and a manual ten-click trip back to row 1 would already be bad. There should
> be a 'top' or the sort should jump to row 1. Anyway, I can't get to the hub from here."

## Step 9 -- edges table (10.png)

    timeout 120 node app-b/study.mjs --try PFX/10.png task:t01-transactions --click "Data" --click "Table" --click "Edges"

from_account, to_account, timestamp, amount; 9,113 edges (before the filter); sum of amount
14,156,522. ACC-393859 appears as the receiver twice in the first five rows.

> "Edge list with timestamps and amounts, and a total at the bottom. That's my interaction table.
> ACC-393859 shows up twice as receiver in five rows, so my bet is that's the 907 hub, but I can't
> sort to confirm. I'm stopping."

## What I would report to the team

- 3,000 accounts, 9,113 transfers, all rows became edges; about 14.16M total amount.
- Directed, reciprocity 0: transfers run one way, nothing comes back.
- One weak component, no isolated accounts: it all hangs together. (Strong components not
  computed; with reciprocity 0 there can't be any two-way pairs.)
- Off: one account has total degree 907 against an average of 6.08. Probably ACC-393859, not
  confirmed. Also: someone left a filter on (amount at least 1,000, 812 of 3,000 accounts), and the
  Graph view's top bar said "Full graph" while it was on.

## Verdict

- Succeeded? Mostly. Counts, direction and connectedness: yes, off the first summary card. "Anything
  off": I spotted the 907 hub but could not identify it, and the compute step showed me a
  different dataset, which shakes my confidence in the rest.
- Single Ease Question: 4 / 7. The first click got me 80% of the answer, which is great. Every
  click after it fought me.
- Would I use this instead of my notebook? Not yet. The summary card is genuinely what I'd write
  in 15 lines of networkx, with the denominators labeled, and that's a nice starting point. But a
  stats panel that silently switches to Les Miserables, a "4 more readings" link that opens a
  menu, an outlier I can't click through to, and a table I can't get to row 1 of: in the notebook
  `G.degree` sorted and `.head()` takes me ten seconds and is never wrong about which graph it is.
