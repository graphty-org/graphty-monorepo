# Session: "How is this account connected to that one?" -- Chris, ML engineer (recommendations)

- **Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
  study/personas/ml-engineer-recsys.md). Lives in notebooks; opens a graph viewer to explain one
  bad recommendation at a time.
- **Task as given by the moderator:** "How is this account connected to that one?"
- **Material:** the inspector mock (screens/inspector.html, all nine states and its renders) and the
  Find mock (screens/find.html, nine states). Static mocks: the renders were looked at; the HTML
  was read only to see what a control would do if clicked.
- **Outcome:** success with difficulty. He found what a connecting path looks like once it exists
  and liked it, but he never found how to ask for one. He got there by clicking the page's state
  numbers, which a real user would not have.
- **Single Ease Question:** 3 of 7.

## Think-aloud transcript

**1. First look (inspector, "One node: TP53, at rest").**

> "OK, proteins. Human protein interactions, 300 nodes. The task said accounts, so either this is
> the wrong dataset or 'account' means a node. In my world an account is a user, so I'm reading
> every node as a user and the question as 'how is user A connected to user B'. Fine."

He skips the paragraph at the top of the page ("I don't read the manual before I've clicked
something") and goes to the right column.

> "Right panel is about TP53. Degree 32, '#2 of 300' -- good, that's the denominator, I like that.
> Betweenness 0.1139, #2 of 300. Neighbors 32, edges 32. There's a 'Select neighbors, 1 hop: 33
> nodes' tooltip -- 33 because it includes TP53 itself, I assume. That's the ego graph button. That
> I get."

> "But I need two nodes. Where do I put the second one? There's no 'to' field anywhere. I'm
> looking for something like 'path to...' on this panel. Neighbors, Edges, Memberships,
> Appearance, Export. Nothing about another node."

**2. Try the keyboard.** His VS Code habit: Cmd+K or Cmd+P, type what he wants.

> "Is there a command palette? The lightning bolt at the bottom, maybe. Let me look at Find."

He opens the Find mock. State 8 ("Quick actions by question") shows a palette with "who matters
most" typed and a list of centrality measures.

> "OK, so this thing takes questions. 'who matters most' gets me betweenness, closeness,
> PageRank. Each with a one-liner -- 'who sits between groups', fine. So if I type 'how is X
> connected to Y' or just 'path' or 'shortest path', I'd expect Dijkstra or BFS in this list."

> "Not shown. I can't tell if 'path' would match anything. State 9 says if I type a name like
> 'marius' it hands me off to Find. So if I type 'ACC-1 to ACC-2' it probably tries to find the
> literal string and gets zero results. That's my guess."

**3. Find one account by id.** Find state 2 ("Hits inside the filter"), searching "thenard".

> "Search works the way I'd want: '2 results in all 77 nodes', each hit with its group and degree,
> and the table at the bottom highlights the row. That's step 3 of my five minutes, and it passes.
> If I can type my user id and land on it, good. It's the second one I can't do. Search takes one
> term. There's no 'and', no 'from/to'."

**4. Select both and hope.** Back in the inspector, state 5 ("A mixed selection: two nodes and the
edge between them").

> "Shift-click two nodes, that's the universal move. '3 selected', statistics for the pair, 2
> nodes 1 edge. Toolbar on the selection: a funnel, which is 'Filter to', and a scan-looking icon,
> which is 'Create set'. The ellipsis menu -- I'd open that. In every other tool I've used,
> selecting two nodes is exactly when 'shortest path between' shows up. It's not here. And these
> two happen to be adjacent, so the answer is 'one edge', but if they weren't I'd be stuck."

He reads the HTML for the ellipsis: it is labelled "More actions" and the mock does not say what
is in it.

> "So I don't know. I'd click it and probably find nothing and leave."

**5. The bottom toolbar.** Pointer, a squiggly route icon, a sticky note, the lightning bolt.

> "The second one looks like a route. Route, path. That might be it. No tooltip, no label. If I
> hover it and nothing tells me, I give it the 30 seconds and then go back to the notebook, where
> it's `nx.shortest_path(G, a, b)`. One line."

In the HTML the route button has no label and no action. It does nothing.

**6. The found path (inspector state 7).** He gets here by clicking "7" in the page's state bar,
not through the app.

> "Oh, OK, this is what I wanted. 'Found path, 3 hops, 1 of 12.' From TP53, to SMAD3, 'weighted
> by: hops, no weight', 'equal paths: 12'. Right, that's honest, I respect that. It tells me
> there are 12 equally short routes and it's showing one, and it tells me it ignored weights.
> Most tools would just draw one path and let me think it's THE path."

> "Members in walk order: TP53, MSH2, UBB, SMAD3, with the node value and the edge's
> 'confidence' between each hop. And a line saying confidence is shown, not used. Good -- I'd
> have asked."

> "What I'd want next, and don't see: (a) weight by my column. In my graph a 'purchase' edge and a
> 'view' edge are not the same distance. 'weighted by' looks like a value, not a dropdown, so I
> can't tell if I can change it. (b) Each hop's event type and timestamp -- here it's confidence,
> so I assume it shows whatever edge columns I have, but I'd want to pick which. (c) the 12
> alternatives at once, not paging with the little arrows one at a time. For explaining a
> recommendation I care about all the short paths, because that's literally what the model
> aggregated. 12 paths through co-interacting users is the explanation."

> "Also UBB in the middle. Ubiquitin, that's the hub everything touches -- in my world that's the
> bestseller item every user bought. A shortest path through the most popular node tells me
> nothing. I'd want 'exclude nodes above degree N' or a weighting that penalises hubs, like
> Adamic-Adar does. Otherwise every path is user -> bestseller -> user."

He checks the degree ring on UBB in the canvas -- it is one of the biggest nodes.

**7. Keep it (state 8).**

> "'Create path' keeps it as a row in 'Sets and paths'. Fine, I don't care much about keeping
> it, I care about exporting it. There's an Export row with copy and plus icons. Copy as PNG, it
> says. I'd want the path as rows -- node ids and edges -- not a PNG."

**8. The accounts graph (state 9).**

> "Oh, here are actual accounts. Transfers, March 2026, ACC-393859. 1,863 accounts, 5,632
> transfers selected, drawn as a density blob with one outline and a count. OK, that's the right
> call at that size -- I'd rather see the count than the hairball. But it's a fraud dataset, not
> mine, and there's no path here either."

## After the task

**Single Ease Question:** 3 of 7.

> "Once the path is on screen it's good -- better than good, the 'hops, no weight, 12 equal
> paths' line is the kind of honesty I never get from these tools. But I couldn't find how to ask
> for it. Two nodes selected and no 'path between' is the thing I'd hit first and it isn't there.
> I found the answer by clicking the prototype's state numbers, which is cheating."

**Would he use it instead of his current tool?**

> "Not instead of the notebook. Next to it, maybe, for the explain-one-recommendation job, IF
> three things: shift-click two nodes gives me 'shortest paths between' right in that panel; I
> can weight by my own edge column and exclude or down-weight hubs; and I can export the paths
> as a table with my ids. Today my notebook does all three in about fifteen lines and gives me
> all 12 paths at once. The inspector layout -- denominators, ranks, the '1 of 12' -- is better
> than anything I'd draw with matplotlib, so the reading side is already there. It's the asking
> side that's missing."

## Problems observed

1. **No way to start a path from two selected nodes** (inspector, mixed selection). Two nodes
   selected offers Filter to and Create set, nothing about paths. The move every graph user tries
   first leads nowhere. Severity 4.
2. **The Path tool is an unlabelled icon** (canvas toolbar). The route icon has no label or
   tooltip in any state, and no state shows it in use: how to choose the start and end is never
   shown. Severity 3.
3. **Quick actions shows no path command** (Find, Quick actions). Typing a question works for
   measures ("who matters most"); nothing shows that "path", "shortest path" or "how is X
   connected to Y" would match anything. A two-id query would probably fall through to Find as
   literal text. Severity 3.
4. **Find takes one term** (Find). There is no from/to form. Finding the first account is easy,
   but pairing it with the second is not supported. Severity 2.
5. **The weighting is read-only as far as he can tell** (inspector, found path). "weighted by: hops,
   no weight" is honest but gives no way to switch to an edge column or to penalise hubs. Shortest
   paths through the highest-degree node are uninformative. Severity 3.
6. **Equal paths can only be paged one at a time** (inspector, found path). "1 of 12" with arrows.
   He wants all 12 drawn or listed together, because the set of short paths is the explanation.
   Severity 2.
7. **Path export is only visible as a PNG** (inspector, found and kept path). The Export row offers
   Copy as PNG. He wants the members and hops as a table with the original ids. Severity 2.
