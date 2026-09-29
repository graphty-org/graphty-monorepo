# Session: the 200 most in-between patents on a graph too big to draw

Participant: Dr. Min-ji Kim, knowledge graph engineer (study persona, played in character).
Task as the moderator gave it: "On a very large citation network, list the 200 most in-between
patents and look around one of them."
Screens used: the frame past the drawing limit (first), then the table dock.
Outcome: failure on the listing; partial on "look around one".
Single Ease Question: 2 of 7.

## Transcript

**First look, the not-drawn frame.**
"OK. 'In-between' -- I take that to mean betweenness centrality. I will want to know which
betweenness before I believe a number, because this is a citation graph, it is directed, and it
is close to acyclic. Directed betweenness on a DAG and undirected betweenness are very different
lists."

"The canvas says '124,318 nodes not drawn. More than this browser draws at once (50,000).
Every node is counted in Statistics and listed in the table.' Good. That is the first graph
viewer that has told me before the tab froze instead of after. That is the Neo4j Browser
problem, answered. I will say that once and move on."

"Statistics on the right: 124,318 nodes, 1,480,221 edges, density, average total degree 23.8,
2,406 isolates, 3,912 weak components, the big one is 94.0 percent. 'Weak components' --
correct word for a directed graph, thank you. The in-degree plot on log-log, and a line that
says 41,873 patents are never cited, and the 2,406 isolates are among them. That is a
known-answer check I could actually run in SPARQL. I like that the zero bucket is stated instead
of silently dropped off a log axis."

**Looking for betweenness.**
"The table has id, grantYear, category, citationsReceived. Sorted by citationsReceived.
That is in-degree -- not what I asked for. Where do I compute betweenness? No column for it.
Nothing in the Statistics panel. 'Change overview...' -- probably another summary set, not a
measure. The left rail has 'Results', a flask. I click it."

(Moderator: on this mock Results does nothing.)

"Nothing. The lightning bolt in the toolbar says 'Quick actions'. I click it. Also nothing.
I will try the obvious one, the big blue button, 'Narrow the graph...'."

**The filter-steps popover.**
"'No filter steps. Every number reads the full graph.' Then 'Suggested for this graph': 'Top 3
by citationsReceived, with neighbors -- follows the table's sort; favors hubs', 586. And
'Around a node...'. So the tool's own idea of 'most important' is most cited. That is fine,
but it is a different question. I open the Top N step to see if I can change the column."

"Top [3] by [citationsReceived]. The column is a dropdown, so presumably I could pick
something else -- but only a column the graph already has. Betweenness does not exist yet.
And 'with every neighbor, both directions, 1 hop' is part of the step's title. I do not want
the neighbors of 200 patents; with an average degree of 23.8 that is thousands of nodes and it
would not draw. I want a LIST. Can I switch the neighbors off? I do not see a control for it.
And 'graphty chose 3, the most that reads at the fitted zoom' -- it chose my N for me. I asked
for 200. I would type 200 and I expect it to refuse or to fall past the limit."

"'Favors hubs, so density and clustering read high.' That sentence is honest and I appreciate
it. Most tools would not tell me the sample is biased."

**Trying the table dock.**
"Maybe the table is where measures live. The table dock mock opens on Les Miserables, but it
has a 'Past the drawing limit' state with the patent graph. Here the header strip is there --
id, grantYear, category, citationsReceived -- and a membership column for a highlight someone
made earlier. And at the bottom, a tag: 'rows blocked: paged listing'. So in this version the
rows past the limit are not even there yet? On the other screen I could read fifteen rows. Which
one is true? If the table cannot list rows past the limit, the entire 'the table is the way to
read the graph' promise is a picture of a table."

"In the 'Three measures ranked' state, on a 300-protein toy, I see what I wanted: a column
group 'Betweenness -- exact, unweighted, full graph', a score column, a rank column '#2 of 300'.
That header is exactly right. It names the method and the scope before I quote the number. I
want that for my patents. But it came from 'four runs' -- runs of what, started where? The
screen never shows me starting one. And 'exact' on 124,318 nodes and 1.48 million edges is
Brandes at O(nm) -- that is not a click, that is an overnight job, maybe longer in a browser.
Will it tell me the cost first? Will it offer a sampled estimate and label it 'estimated, k
samples'? Nothing here says. 'Unweighted' is stated; 'directed' is not. For a citation graph that
is the one word I need."

**Look around one patent.**
"The second half I can at least approximate. 'Around a node...': around [6117075], [1 hop],
[Both directions], 242 nodes, 348 edges, will draw. It says it is the same as Filter to
neighbors on the inspector. Good -- one concept, one name. The count before the commit is the
thing I want from every tool. But I picked 6117075 because it is the most cited, not because it
is the most in-between. I have not done the task, I have done a different task."

"After a filter the chip says '612 of 124K nodes -- 1 step'. 124K. Rounded. Everywhere else
it says 124,318. Put the exact number in the chip or at least in the tooltip."

**Ends.** "I stop here. I cannot produce the list the moderator asked for."

## After the task

**Single Ease Question: 2.** "The honest parts are very good. The task itself was not possible:
there is no way I could find to compute betweenness on this graph, and no way to list the top
200 of anything without dragging their neighbors along."

**Would she use this instead of her current tool?** "Not for this. Today I would compute
betweenness in a notebook -- networkx or igraph with sampling, or a graph data science library
next to the store -- sort, take LIMIT 200, and join back to the patents. That takes me twenty
minutes and I know exactly which betweenness I got. This tool would earn a place as the thing I
look at AFTER that, because the not-drawn message, the counts-before-commit and the column
header that names the method are the right instincts. But it has to show me how to start the
measure on a big graph, what it will cost, and whether it is directed, or I will not trust the
number it gives me."

## Problems observed

1. No visible way to compute betweenness (or any measure) from either screen past the drawing
   limit: Results and Quick actions do nothing, the table has no "add a measure" entry, and
   the suggested step is by citationsReceived. Severity 4 -- the task could not be done.
2. The only ranking step is "Top N, with neighbors": neighbors are baked into its title and there
   is no visible way to turn them off, and graphty picks N (3). Listing a top 200 without
   neighbors has no path. Severity 3.
3. The two screens disagree about rows past the limit: the not-drawn frame lists rows; the table
   dock's past-the-limit state shows headers only and marks the rows blocked. Severity 3 for
   trust.
4. The betweenness column header (seen only on the 300-node example) names "exact, unweighted"
   but not directed or undirected, and nothing warns what exact betweenness costs at 124,318
   nodes or offers a labelled estimate. Severity 3.
5. The filter chip rounds to "124K" while everything else shows 124,318. Severity 1.

## What worked

- Being told before anything freezes that 124,318 nodes will not be drawn, and that nothing was
  lost.
- Counts before committing a filter step ("242 nodes, 348 edges, will draw"; "58,316 nodes ...
  will not draw").
- "Weak components" for a directed graph, and the never-cited count stated instead of hidden
  off the log axis.
- "Favors hubs, so density and clustering read high" -- a sample that admits its bias.
- A measure column header that names the method and scope.
