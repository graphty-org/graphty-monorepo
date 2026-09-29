# Session: look only at the biggest connected piece -- knowledge graph engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (simulated; see ../../personas/knowledge-engineer.md).
Task as read by the moderator: "Look only at the biggest connected piece, and tell me its size and who matters most in it."
Screens used: the filter chip, the frame at rest, the Results panel. Graph on screen: Les Miserables co-appearances (77 characters).
Outcome: finished, with one unexplained count and the "who matters most" answer only by degree.

## Transcript (thinking aloud)

**00:00 -- the filter chip screen, as it loads.**
"It already says 'Filtered: 28 of 77 nodes, 3 steps' and a popover is open. I did not do that.
I'll ask the moderator to give me the unfiltered state; I do not start a task on someone else's
filter." (Moderator switches the page to its no-steps state.)

**00:40 -- no steps.**
"OK. Top left, under 'Les Miserables', a small pill: 'Full graph' with a funnel. Popover says
'No filter steps. Every number reads the full graph.' Good, that sentence is the thing I want
to know before I read any number.

Before I touch anything, the Statistics on the right: nodes 77, edges 254, components 2, largest
component 76, isolated nodes 1. So the size question is already answered: 76 nodes. 76 plus one
isolate is 77. That adds up. I note the edge count: 254."

"Components -- weakly or strongly? Nothing here says whether the edges are directed. On a
co-appearance graph I assume undirected, but the panel should say it. The frame at rest shows
'undirected, weight: value' under Edges; this screen does not."

**01:30 -- adding the step.**
"'Add step'. Menu: 'Filter to' -- Largest component, k-core..., Rule... ; 'Filter out' -- Rule...
Largest component is the first item. That is exactly the operation; I did not have to write a
rule for it. Click."

"The chip now reads 'Filtered: 76 of 77 nodes, 1 step'. Good: it says nodes, and it says 'of 77'.
The little dot on the far left of the canvas is gone -- that was the isolate. The rest of the
drawing did not move. Fine."

**02:10 -- the known-answer check.**
"Statistics now: 'Filtered graph: 76 of 77 nodes', edges '253 of 254', components 1, largest 76,
isolated 0.

Wait. I removed one node that has no edges, and I lost an edge. 254 to 253. Where did that edge
go? An isolate has degree zero. Either it was not isolated, or the 254 counts something the 253
does not. Let me check the average degree: before, 6.57. Two times 254 over 77 is 6.60, not 6.57.
Two times 253 over 77 is 6.57. So even the full-graph panel uses 253 for one number and 254 for
another. Probably a self-loop somewhere -- counted as an edge, not counted as degree. Nothing on
the screen says so. There is no tooltip, no note, nothing.

That is exactly the kind of thing I go and check in SPARQL, and then I stop believing the other
numbers until someone explains it. The node count I trust. The edge count, no."

(Moderator asks her to continue.)

**03:30 -- who matters most.**
"'Who matters most' -- by which measure? The table at the bottom says 'Filtered graph: 76 of 77
nodes. Sorted by degree.' At least it names the measure and the scope. Valjean, 36; Gavroche 22;
Marius 19; Javert 17; Thenardier 16.

Two degree columns: 'degree' and 'degree on: full graph'. Both say 36, 22, 19... Here they can
never differ, because the only thing I removed has no neighbours. It is honest that it names the
scope, but a second column of identical numbers is noise. Show it when it differs.

Degree is a count of neighbours, not importance. For 'who matters' in a co-appearance network I
would want betweenness -- who connects the groups -- and I would want it computed on the filtered
graph, not the full one."

**04:30 -- the Results panel.**
"Results in the left rail. There is a Catalog: Centrality -- Betweenness, Closeness 'WF-corrected',
Eigenvector with a warning '3 components', Harmonic, HITS, Katz, PageRank. Good, the algorithms are
named. Closeness names its variant, and the (i) explains Wasserman-Faust in two sentences. I like
that; most tools do not tell you which closeness they computed.

But these screens are on a protein network and a patent-citation graph, not my Les Miserables
graph, so I cannot finish the task here. I read what the editor would do instead.

Betweenness editor: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.'
That first line is what I want before any number -- scope, exactness, edge reading. Good.

Then a field 'Scope: Full graph' with a dropdown. And the chip at the top left also says 'Full
graph'. So which one decides? If I have the chip filtered to the largest component, does the
Scope field follow it, or do I have to set it again here? If they can disagree, which number is
the Top nodes list computed on? The dropdown does not open in this prototype, so I cannot see if
'Filtered graph' or 'Largest component' is even an option. That is the question the task depends
on, and I cannot answer it."

"Top nodes on the finished betweenness: MAPK1, TP53, with values. With a distribution and 'zero:
10 nodes'. That is a useful panel. If it ran on my filtered graph, it would answer the task."

**06:00 -- answer given to the moderator.**
"The largest component is 76 nodes; I believe that. Edges: the screen says 253, but it also says
the full graph has 254 and I cannot account for the difference, so I would not put 253 in a report.
Who matters most: by degree, Valjean, 36 neighbours. By betweenness, I could not run it on this
graph, and I cannot tell whether it would run on the filtered piece or the whole graph."

## Single Ease Question

5 of 7. "Getting to the largest component was easy -- one menu item, and it tells me 76 of 77.
The edge count that does not add up, and not knowing which scope the algorithm uses, took the
rest."

## Would she use this instead of her current tool?

"For this question, on a graph I already have as an edge list -- maybe, yes. SPARQL does not give
me 'largest component' at all without a lot of work, and the way this names the scope on every
number is better than Gephi, which just filters and lets you forget. But I will not use it for
anything I report until the edge count is explained on the screen, and until the algorithm panel
tells me plainly that it is running on the filtered piece. And it still does not read Turtle, so
it is not replacing anything for the knowledge graph itself."

## Problems observed

1. Edge count does not reconcile (severity 3). Removing one isolated node changes edges from 254
   to 253; the full graph's own average degree (6.57) is computed from 253, not 254. Nothing on the
   screen explains the difference (likely a self-loop counted as an edge but not as degree). For a
   participant who runs a known-answer check, this costs trust in every number.
   Quote: "I removed one node that has no edges, and I lost an edge. Where did that edge go?"
2. Two scope controls for one algorithm (severity 3). The chip says the filtered graph; the result
   editor has its own "Scope: Full graph" dropdown. The screen does not say whether the Scope field
   follows the chip, what its options are, or which one the Top nodes list uses. The dropdown does
   not open in the prototype.
   Quote: "So which one decides?"
3. The Results panel is not shown on the graph the task is about (severity 2, prototype gap). The
   centrality answer cannot be reached end to end: the flow from "filtered to the largest
   component" to "betweenness on that piece" is not mocked.
4. Redundant "degree on: full graph" column (severity 1). Shown whenever a filter is on, even
   when every value equals the filtered degree.
5. Edge direction not stated on the filter chip screen (severity 1). The Statistics there do not
   say undirected, so "components" is ambiguous (weakly or strongly) until she finds it elsewhere.
6. The prototype opens pre-filtered with three steps and an open popover (severity 1, prototype
   only). A real session would start from the full graph.

## What worked

- "Largest component" is a first-class step in the Add step menu; no rule to write.
- The chip and every panel name their scope in words: "Filtered: 76 of 77 nodes, 1 step",
  "Filtered graph: 76 of 77 nodes. Sorted by degree."
- The full-graph Statistics already answer the size question (largest component 76) before any
  filtering.
- The result editor's first line states scope, exactness and edge reading before any number, and
  Closeness names its variant with a two-sentence definition.
