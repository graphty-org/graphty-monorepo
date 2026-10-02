# Session: keep only transfers of 1,000 or more -- Chris, ML engineer (recommendation systems)

Task as given: "From now on you only care about transfers of 1,000 or more. Make every count,
drawing and later calculation describe only those, then say how many accounts are left and
whether the summary numbers on screen describe what is left."

Start screen: shots/tasks/t07/01.png. Renders: tmp/round-7-sessions/t07--ml-engineer-recsys/01-09.png.
All commands were run from design/ui/prototype; D=tmp/round-7-sessions/t07--ml-engineer-recsys.

## Start screen

Think-aloud: "OK, a 3,000-node hairball drawn as gray hexes. At least the summary on the right
gives me numbers first: 3,000 nodes, 9,113 edges, directed, weight = amount. My task is a filter
on an edge attribute. Top bar has a funnel that says 'Full graph'. That is the filter, I assume."

## Step 1 -- the funnel in the top bar

    timeout 120 node app-b/study.mjs --try $PWD/$D/01.png task:t07 --click "Full graph"

Saw: the left panel switched to Data, and a filter "amount is at least 1,000 -- 812 of 3,000
nodes" was already there and checked. The top chip now reads "812 of 3,000 nodes". The right
panel has a banner: "5 readings are for all 3,000 nodes [Compute on 812]". Summary: Nodes "812 of
3,000", but Edges still 9,113, density 0.00101, average degree 6.08, highest degree 907.

Think-aloud: "Wait, I clicked a funnel and the exact filter I wanted just exists? Either someone
set it up earlier or the funnel suggested it. Whatever, fine. 812 accounts. But the denominator
problem is right there: nodes say 812, edges say 9,113. Those cannot both describe the same
subgraph. At least the banner admits five readings are stale. Let me hit Compute on 812."

## Step 2 -- "Compute on 812"

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t07 --click "Full graph" --click "Compute on 812"

Saw: a menu opened over the right panel (Select all visible, Invert selection, Fit, Re-run
layout, Compute the overview, Add node..., Add note, Clear graph data). No recompute happened.

Think-aloud: "That's the graph's '...' menu, not a compute. Did I miss the button?"

## Step 3 -- retry the button

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t07 --click "Full graph" --click "Compute on"

Saw: the same menu.

Think-aloud: "Same thing. The button is broken, or it's hidden under the menu trigger. There's a
'Compute the overview' item; that sounds like what I want."

## Step 4 -- "Compute the overview" in that menu

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t07 --click "Full graph" --click "Compute on" --click "Compute the overview"

Saw: the right panel now says "Co-appearances -- Graph from miserables.gexf": 77 nodes, 254
edges, undirected, average clustering 0.573, diameter 5. The left panel and canvas still show
my transfers with the 812 filter.

Think-aloud: "That's Les Miserables. That is the sample dataset from every graph tutorial ever.
I asked to recompute my filtered transfers, and the summary panel is now describing a different
graph while the left side still says Transfers. If I hadn't recognized the numbers I'd have
written down diameter 5 for a payments graph. This is the moment I stop trusting the summary
panel."

## Step 5 -- open the filter step itself

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t07 --click "Full graph" --click "amount is at least 1,000"

Saw: right panel shows "amount >= 1,000, Filter step, step 1 in Filters". Condition: amount / is
at least / 1,000. Scope: "amount on the full graph: no step runs before this one". Text: "amount
is on edges: this step keeps the transfers that pass and the accounts at their ends." Apply this
step (checked). This step: 812 of 3,000 nodes. Full graph: 812 nodes would pass.

Think-aloud: "OK, this is the good bit. That sentence is exactly the semantics I need: an edge
filter, and the nodes are the endpoints of surviving edges. That also tells me isolated accounts
drop out. But it gives me a node count and no edge count. How many transfers survive? That is
the first number I'd want. And the canvas did not change at all -- same hairball."

## Step 6 -- the Edges table

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:t07 --click "Full graph" --click "Edges"

Saw: the table header says "9,113 edges (before the filter)". Rows show amounts 5.04, 8.97,
44.6, 38.0, 14.8. Footer: "Sum of amount, all 9,113 rows: 14,156,522".

Think-aloud: "So the table is unfiltered too, and at least it says so. But that contradicts the
filter description. If the filter 'keeps the transfers that pass', the table should have a few
hundred or so rows, not 9,113 with a 5-dollar transfer at the top. Either the table ignores
filters, or the filter only really removes nodes. And an edge of 5.04 between two accounts that
each have some other transfer over 1,000 -- is that kept or dropped? I can't tell, and that is
the whole question for any degree or PageRank number I compute next."

## Step 7 -- hover the compute button for an explanation

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:t07 --click "Full graph" --hover "Compute on 812"

Saw: no tooltip. The same summary with Nodes 812 of 3,000 and Edges 9,113.

Think-aloud: "Nothing. Fine."

## Step 8 -- click the "812 of 3,000 nodes" chip

    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:t07 --click "Full graph" --click "812 of 3,000 nodes"

Saw: Filters now says "2 steps, 2 on". A second step "kind is not merchant -- Kept all 812
nodes" is present and checked. My step now has a comment badge "1". The right panel shows my
step's details again.

Think-aloud: "Where did 'kind is not merchant' come from? I did not add that. I clicked a status
chip and my pipeline gained a step I never asked for. It happens to keep all 812, so the count
did not move, but if I were exporting this I would now be exporting with a filter I didn't
write. Same with the comment badge. I'd uncheck it if I trusted that unchecking does what it
says."

## Step 9 -- would a later calculation use the filter?

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:t07 --click "Full graph" --click "Graph" --click "Analyze"

Saw: the canvas now draws an edge-and-node view colored by a Louvain run "from Louvain, Sep 28":
35 communities, sizes 297, 182, 147, 141, 139, 123, 120 and "Other 1,851". The Analyze dialog
lists Louvain, PageRank, Shortest path, Links (count), Links in, Links out, Total amount, Total
amount in.

Think-aloud: "297+182+147+141+139+123+120 = 1,149, plus 1,851 = 3,000. So that Louvain result
is on the full graph, not my 812, and the legend gives no hint it's stale. The Analyze list
doesn't say whether PageRank would run on 812 nodes or 3,000, or on 9,113 edges or the filtered
ones. And the drawing is still all 3,000 nodes. I'm done; I can't make the app guarantee the
drawing and the next calculation use only the big transfers."

## Answer as Chris

- Accounts left: 812 (of 3,000). That is the one number I'd stand behind.
- Do the summary numbers describe what is left? No. Only the node count does. Edges (9,113),
  density, average degree (6.08) and highest degree (907) are still full-graph values. The banner
  "5 readings are for all 3,000 nodes" admits it, which I give credit for. But the button that
  should fix it opened a menu, and the menu's recompute put Les Miserables numbers in the panel.
- Drawing: unchanged, still all 3,000 nodes as far as I can see.
- Later calculation: the existing Louvain result is on 3,000 nodes. Nothing tells me a new run
  would use the filtered graph.
- Number of surviving transfers: never shown anywhere.

## Did I succeed?

Partly. I got the account count and could tell that the summary is stale. I did not get the
drawing or the calculations restricted to the big transfers, and I never saw how many transfers
survive.

## Single Ease Question

2 / 7.

## Would I use this instead of my current tool?

No. In pandas this is `df[df.amount >= 1000]` and then `nx.from_pandas_edgelist`: one line, and
I know exactly which edges went in. Here the filter step itself is well explained -- "keeps the
transfers that pass and the accounts at their ends" is the right sentence -- but everything
around it disagrees. Node count filtered, edge count not, the table says "before the filter",
the canvas never changes, a step appears that I didn't add, and the recompute showed me a
different dataset. For a correctness-first job I need every number on screen to have the same
denominator, or to tell me which one it uses. Until then I would still use the notebook and
treat this as a picture.

## Problems seen (severity 1 = cosmetic, 4 = blocks the task)

1. (4) "Compute on 812" opens the graph's "..." menu instead of recomputing (renders 02, 03).
2. (4) "Compute the overview" from that menu fills the summary with a different graph
   (Co-appearances from miserables.gexf, 77 nodes) while the rest of the screen still shows
   Transfers (render 04).
3. (3) After the filter, the summary shows Nodes "812 of 3,000" next to Edges "9,113": one panel,
   two denominators (render 01).
4. (3) The filter step reports only nodes passing, never how many transfers pass, even though it
   is an edge filter (render 05).
5. (3) The Edges table ignores the filter ("9,113 edges (before the filter)") and gives no way to
   switch it to the filtered edges (render 06).
6. (3) The canvas does not change when the filter is applied (renders 01, 05, 06).
7. (3) A second step "kind is not merchant" and a comment badge appeared after clicking the
   header chip; I did not add either (render 08).
8. (3) The Louvain legend and panel show results from the full 3,000 nodes with no stale marker,
   and Analyze does not say which graph a new run would use (render 09).
9. (2) Clicking the funnel created the exact filter without my choosing the column, operator or
   value. That's convenient, but I don't know where it came from (render 01).
10. (1) No tooltip on "Compute on 812" (render 07).

## What I liked

- The filter step's sentence "amount is on edges: this step keeps the transfers that pass and the
  accounts at their ends" states the edge-to-node semantics precisely.
- The banner "5 readings are for all 3,000 nodes" and the table's "(before the filter)" are
  honest about staleness, instead of quietly showing full-graph numbers.
- "Local only" in the top bar.
