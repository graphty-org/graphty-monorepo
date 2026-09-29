# Session: "How is this account connected to that one?" -- Chris, ML engineer (recommendations)

Participant: Chris, senior ML engineer on a retail recommendations team (persona:
../../personas/ml-engineer-recsys.md). Screens used: the inspector mock (twelve selection states
on a 300-protein interaction graph) and the Find and Quick actions mock (ten states on the Les
Miserables co-appearance graph). Renders read at 1440x900.

Moderator task, as given: "How is this account connected to that one?"

## Think-aloud

**1. First look at the inspector page.** "OK, so it's proteins, not accounts. Fine, I'll pretend
TP53 is my user and SMAD3 is the item the model recommended. That's literally my question: why
did retrieval reach this item from this user." He skims past the paragraph at the top without
reading it. "Left rail is graphs, sets, styles; right column is the thing I clicked. Standard."

**2. State 1, one node selected.** He reads the right column numbers first. "Degree 32, rank 2 of
300 -- good, it gives me the denominator. Betweenness 0.113, is that normalized? I assume
normalized. Tooltip says 'Select neighbors, 1 hop: 33 nodes' before I press it. I like that, it
tells me the cost before I blow up the view." He notes 33 vs "32 neighbors" lower down. "33 is the
node plus 32 neighbours, I guess. Took me a second."

**3. Where is the second account?** "I need two things selected. How did she get SMAD3 in there?"
He looks for a "path to..." or "connect to..." command on the single-node row and there is none;
only neighbours, filter, pin, and a "..." menu. "In Neo4j I'd type a MATCH. Here I guess I
shift-click the second node. In my real graph I'm not going to see my second account on the
canvas, it's one of four million."

**4. Tries Find.** He opens the Find mock. "Search box, prefix matching, results say 'group 4,
degree 11'. Good -- it shows me degree right in the list." He looks at the 'An id with no match'
state: "0 matches for ACC-365386. My ids are all like that. Does it search the id column or only
the label? It doesn't say. If this is what I get for a real user id I'm done." He then looks for a
way to add a second Find result to the selection. "Clicking a result selects it. Is there
Cmd-click to add? Nothing on screen says so. Quick actions has 'Find marius' but nothing like 'path
from A to B'. I'd type 'path' into the command palette first thing, and I don't see that it would
understand it."

**5. Back to the inspector, state 6, two nodes selected.** "There it is -- 'Paths between...' as a
button when exactly two are selected. OK, that's the thing I wanted. Would have been nice to find
it without already having two selected." He reads the form. "'On: full graph, 300 nodes.
Undirected.' Good, it tells me what it's running over. From TP53, To SMAD3, swap button. Weight by:
'None: count hops'. Fine for a first pass. 'Every shortest path is found and drawn together.' Run."

He checks the statistics block beside it: "nodes 2, edges between 0. So they're not directly
connected. What I actually want here is common neighbours, Jaccard, Adamic-Adar for this pair.
That's the first number I'd compute in the notebook. Not here."

**6. State 9, found path.** "3 hops, 1 of 12. Wait. The form said every shortest path is drawn
together. The canvas shows one path and a stepper '1 of 12'. So which is it? If there are 12
equal paths I want the union -- that's the neighbourhood that explains the recommendation. Clicking
through 12 one at a time is not how I'd read it." He does like the side panel: "weighted by: hops,
no weight; equal paths 12. That's honest. Members in walk order with the edge attribute between
each hop -- confidence 0.82, 0.53, 0.82. That's exactly the 'edge attribute one hover away' thing,
except it's not even a hover, it's right there. For me that'd be event type and timestamp per
edge." He notices the confidence column but no option on the form to cap hops or to find paths
through a particular node type. "In a bipartite graph user-to-item paths are odd length. I'd want
'within 3 hops' not just 'shortest'. And I'd want to weight by my edge weight, which there's a
dropdown for, fine."

**7. What does 'Create path' do?** He reads state 10. "It becomes a kept row in Sets and paths.
OK. Export row has copy and plus icons, no labels. I'd want the path edges as CSV with my ids.
I'd guess the copy icon copies... something. Not sure what."

**8. Wrap-up.** "I got there, but I got there because the page already had SMAD3 selected. On my
data the hard parts are: find the user by id, find the item by id, get both selected. The path
answer itself is decent."

## Result

- Outcome: completed with difficulty. He found Paths between... and read a correct answer, but only
  because the mock arrived with both nodes already selected; he could not see how to put a second
  node found by Find into the selection, and was not sure Find searches the id column.
- Single Ease Question: 4 of 7.
- Would he use it instead of his current tool (networkx in a notebook, Neo4j Browser before that)?
  "For this one question, maybe, if it reads my Parquet and the id search works. The walk-order
  panel with the edge values is nicer than printing nx.all_shortest_paths. But I'd still go back to
  the notebook for common neighbours and Adamic-Adar, and if I have to go back anyway I'd probably
  just stay there. Show me the pair scores next to the path and I'd switch for this job."

## Problems seen

1. No way from one selected node to "path to another node". Paths between... exists only once
   exactly two are selected, and nothing on the one-node inspector, in Find or in Quick actions
   leads to it. On a graph too big to see the second node, the user is stuck. (severity 3)
2. Find gives no visible way to add a second result to the selection (no Cmd/Shift-click hint, no
   "add to selection" action on a hit). (severity 3)
3. The path form says "Every shortest path is found and drawn together", but the result draws one
   path with a "1 of 12" stepper. The promise and the result disagree, and the union of all equal
   paths is what an analyst wants. (severity 3)
4. Find's no-match state for an id ("0 matches for ACC-365386") does not say which fields were
   searched, so the user cannot tell a missing account from an unsearched id column. (severity 2)
5. The two-node statistics show "edges between 0" but no pair measures (common neighbours, Jaccard,
   Adamic-Adar) that would say how strongly the two are connected. (severity 2)
6. The path form offers only shortest paths; no maximum hop count or "all paths up to k hops".
   (severity 2)
7. The Export row on a path has two unlabeled icons; unclear whether it copies ids, a table or an
   image. (severity 1)
8. "Select neighbors, 1 hop: 33 nodes" beside "32 neighbors" reads as an off-by-one until you
   realize the count includes the node itself. (severity 1)
