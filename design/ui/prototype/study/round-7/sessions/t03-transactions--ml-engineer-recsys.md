# Session: transfer rings -- Chris, ML engineer (recommendations)

Task as given: "Do the accounts fall into rings that send money mostly among themselves? Get graphty
to pick them out, then say how many there are and how big the largest few are. The data on screen
is a sample: one month of card and bank transfers between accounts."

Outcome: failure. I found the right algorithm and its settings in under a minute, pressed Run, and
never saw a result. I cannot say how many rings there are or how big they are.

All commands were run from design/ui/prototype. D = tmp/round-7-sessions/t03-transactions--ml-engineer-recsys

## Start screen (shots/tasks/t03-transactions/01.png)

Think-aloud: OK, a hexbin blob. At least it is not pretending 9k edges as a hairball. Right panel
is what I actually read: 3,000 nodes, 9,113 edges, directed, weight = amount. Density 0.001.
Weak components 1 -- so connectivity alone will not split this, it is one blob. Reciprocity 0,
interesting, nobody sends money straight back. Degree distribution on log-log with the max at 907
-- some hub, probably a payment processor. Good, these are the numbers I want first.
"Rings that send money among themselves" is community detection, weighted by amount. I want
Louvain or Leiden. There is an "Analyze" link with Shift+A. Clicking that.

## 01 -- Analyze

    timeout 120 node app-b/study.mjs --try $PWD/$D/01.png task:t03-transactions --click "Analyze"

Think-aloud: command palette, nice, I like that. Search box "say what to find". Louvain is under
Recent, "Which nodes form densely connected groups." That is my thing. Odd that the main list
opens with "Rank nodes and edges" and I have to scroll for groups, but Recent saved me.

## 02 -- Louvain settings

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t03-transactions --click "Analyze" --click "Louvain"

Think-aloud: This is actually good. Weight = amount (loaded weight), "Higher means: Stronger"
(so it treats big transfers as stronger ties, not as distance -- correct for this), Direction:
Follow, Resolution 1.0, "Under a second". It tells me what goes in. That is the denominator
question answered before I ask. One gripe: what does "Follow" direction do in Louvain? Directed
modularity? A one-line tooltip would help. Leaving defaults. Run.

## 03 -- Run

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run"

Think-aloud: A dark toast: "Would add Louvain at the top of the list, running". Would? Is it
running or not? The panel is still open, the canvas has not changed, the left list still says
"Analyze to add results here". No count of communities, no modularity, no progress. It said
"under a second". Nothing.

## 04 -- "4 more readings not computed"

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t03-transactions --click "4 more readings not computed"

Think-aloud: Maybe the summary can give me a community count. Clicked the blue link... and I got
a context menu for the graph (Select all, Re-run layout, Compute the overview, Clear graph data).
Not what the link said. "Compute the overview" sounds like it.

## 05 -- Compute the overview

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t03-transactions --click "4 more readings not computed" --click "Compute the overview"

Think-aloud: Wait. The right panel now says "Co-appearances, from miserables.gexf", 77 nodes,
254 edges, undirected. That is Les Miserables. My title bar still says "Transfers, March 2026" and
the canvas is the same blob. Which graph am I looking at? This is exactly the thing that makes me
stop trusting a tool: the summary numbers swapped datasets under me with no warning.

## 06 -- Views

    timeout 120 node app-b/study.mjs --try $PWD/$D/06.png task:t03-transactions --click "Views"

Think-aloud: Maybe the result lands in saved views. "No saved views." Nope.

## 07 -- Strongly connected components

    timeout 120 node app-b/study.mjs --try $PWD/$D/07.png task:t03-transactions --click "Analyze" --click "Strongly connected components"

Think-aloud: Alternative reading of "ring": a cycle of transfers. SCC exists, "Groups in which
every node reaches every other", Direction Follow, "Nothing to set". Fine, but with reciprocity 0
and money flowing one way, SCC is a narrower question than "mostly among themselves". Louvain is
still the right first cut. Not running this one, I expect the same toast.

## 08 -- Louvain again, then Escape

    timeout 120 node app-b/study.mjs --try $PWD/$D/08.png task:t03-transactions --click "Analyze" --click "Louvain" --click "Run" --key Escape

Think-aloud: Escape just took me back to the Analyze list, toast still saying "Would add Louvain".
The left list is still empty. Nothing was added.

## 09 -- Assistant

    timeout 120 node app-b/study.mjs --try $PWD/$D/09.png task:t03-transactions --click "Assistant"

Think-aloud: "Off. Nothing is sent." Good -- local only, privacy review would love that. But it
does not help me here, and I would not turn on an AI to do a Louvain run anyway.

## 10 -- Table

    timeout 120 node app-b/study.mjs --try $PWD/$D/10.png task:t03-transactions --click "Table"

Think-aloud: Table of nodes with real ids (ACC-633005), links in/out/total, kind, country. Says
"3,000 nodes from the node file accounts-2026-03.csv" and "Rows 381 to 420 of 3,000". Ids are
intact, that matters to me. No community column, so Louvain really did not run.

## 11 -- Data

    timeout 120 node app-b/study.mjs --try $PWD/$D/11.png task:t03-transactions --click "Data"

Think-aloud: Hold on. I only opened the Data tab, and now the top bar says "812 of 3,000 nodes"
and there is a filter "amount is at least 1,000" switched on. A minute ago the top bar said
"Full graph". Did I apply that? I did not. The summary now says 812 of 3,000 but Edges still
9,113 and "5 readings are for all 3,000 nodes -- Compute on 812". Which population would my
Louvain have run on? Also the attributes list says kind is "Color (kind)" in use, while the
canvas badge says "Nothing is colored or sized by a row". The two contradict each other.

That is it for me. I would give up here.

## Verdict

- Succeeded? No. I picked the right algorithm with the right weight and direction, but Run did not
  produce anything I could read: no community count, no sizes, no modularity, no new column.
- Answer to the task: I cannot say how many rings there are or how big the largest are.
- Single Ease Question: 2 of 7. Finding Louvain was a 6. Getting a result out was impossible, and
  two things changed my denominator without me asking (the Les Miserables summary, the filter that
  appeared on its own).
- Would I use this instead of my notebook? Not today. In networkx this is
  `louvain_communities(G, weight="amount")` plus `sorted(map(len, comms))[-5:]` -- three lines and
  I trust the numbers. What would win me over: the Louvain settings panel is honestly better than
  the notebook at telling me what goes in (weight, meaning, direction, resolution, time estimate),
  local-only processing, ids kept intact. If Run then gave me "N communities, modularity Q, sizes
  of the top 10, on M of 3,000 nodes" and a column I can export with the original ids, I would
  use it for the first look.

## What I would tell the designers

1. Run must produce a visible result: a count, the sizes of the largest groups, and what it ran
   on (nodes, edges, weight, filter). A toast that says "would add" reads as "did not".
2. The summary panel switched to a different dataset (Les Miserables, 77 nodes) after "Compute
   the overview" while the title kept saying Transfers. That is a trust killer.
3. The "4 more readings not computed" link opens a generic graph menu instead of computing or
   listing those readings.
4. Opening the Data tab showed a filter switched on (812 of 3,000) that I never set; the top bar
   had said Full graph. If it was on all along, the top bar lied; if not, something applied it.
5. "Color (kind)" listed as in use while the canvas badge says nothing is colored.
6. Community detection is reachable only through Recent; the default list opens on ranking.
   Someone without the Recent entry would need to scroll or search.
