# Session: door entries path task -- Expert Emma (network scientist)

Task as given: "Could Ana Ruiz and Priya Nair have run into each other through the buildings
they use? Work out the chain that links them with as few go-betweens as possible, and say through
which building."

Start screen: shots/tasks/t12-doorentries/01.png. Renders: tmp/round-7-sessions/t12-doorentries--expert-emma/NN.png.
All commands were run from design/ui/prototype.

## Think-aloud

**Start screen.** "Bipartite person-building graph: 412 people, 9 buildings, 1,306 edges,
directed, weight = count. 'Local only' in the top bar -- good, that is the first thing I look for.
This is an unweighted shortest path between two person nodes, ignoring direction, because
person->building edges never lead back to a person. Let's see if the tool knows that."

**01** `timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t12-doorentries--expert-emma/01.png task:t12-doorentries --click "Analyze"`
"A command palette. Under Recent: 'Shortest path -- The fewest steps, or the lightest route,
between two nodes.' That is it."

**02** `... 02.png task:t12-doorentries --click "Analyze" --click "Shortest path"`
"'Path between' dialog. Direction defaults to 'Either way'. Good, that is the right default for
this question and many tools get it wrong. Weight defaults to count, with the note 'Shortest
path reads a weight as distance: it uses 1/count.' Honest, I like that it states the
transform. But it is the wrong default for 'fewest go-betweens' -- I want hops. From says 'Type
a name'."

**03** `... 03.png ... --click "Analyze" --click "Shortest path" --click "Type a name"`
"Clicked into From. No dropdown of names, no suggestions."

**04** `... 04.png ... --click "Type a name" --click "Ana Ruiz"`
Tool said: nothing on screen is called "Ana Ruiz".
"No list to pick her from. I would have to type and hope for autocomplete."

**05** `... 05.png task:t12-doorentries --click "Nodes"`
"The node table, from people.csv and buildings.csv. Ana Ruiz is 1001, Facilities, with a
note on her. Priya Nair is 1188, Legal. Both near the top -- convenient."

**06** `... 06.png ... --click "Nodes" --click "Analyze" --click "Shortest path" --click "Ana Ruiz" --click "Priya Nair"`
Tool said: nothing on screen is called "Ana Ruiz" / "Priya Nair".
"Opening the path dialog switched the bottom table from Nodes to Edges without my asking, so
the names I wanted to click were gone. But the edge table answers the question anyway:
- 1001 -> B1, count 22, Mar 2 07:58 to Mar 27 17:12 (Ana)
- 1188 -> B1, count 6, Mar 2 08:12 to Mar 19 12:44 (Priya)
Both swiped into B1, and their date ranges overlap. Their first entries on Mar 2 are 14 minutes
apart. Ana - B1 - Priya: two hops, and B1 is the only go-between. In a bipartite graph two
people cannot be closer than that, so this is the minimum.
Caveat: the table shows only four of the 1,306 edges. I did not filter it, so somebody chose
those rows for me. I would like the algorithm to confirm it."

**07** `... 07.png ... --click "Nodes" --click "Analyze" --click "Shortest path" --click "1001" --click "1188"`
Tool said: nothing on screen is called "1001" / "1188".
"Table cells can't be used to set the endpoints."

**08** `... 08.png ... --click "Analyze" --click "Shortest path" --click "Click to pick"`
"Clicking 'To' only moves the 'type a name' focus over to it. The banner says 'Click a node or
set for To'. Click a node, in a 421-dot hairball, with no labels. No."

**09** `... 09.png ... --click "Analyze" --click "Shortest path" --click "count (loaded weight)"`
"The weight menu has 'None' at the top. Good, so hop count is one click away. It also files
count under 'In use' and something under 'Not a number'. Fine."

**10** `... 10.png task:t12-doorentries --click "Find rows and notes"`
"The left search box takes focus, but nothing comes up. I am stopping here."

## Answer

Yes. Ana Ruiz (1001) and Priya Nair (1188) both badged into building B1, during overlapping
date ranges in March 2026. The chain is Ana Ruiz - B1 - Priya Nair: one go-between, the
building B1, which is the shortest chain possible in a person-building graph. For the record,
door data only shows that both of them used B1 in the same period. It does not show that they
actually met.

## Debrief

- **Succeeded?** Probably. I am confident in the answer because the edge rows show it directly
  and two hops is the bipartite minimum. I did not get the shortest-path algorithm to confirm
  it, because I could not set From and To.
- **Single Ease Question:** 4 of 7. The table got me there quickly. The tool built for the job
  did not.
- **Would I use it instead of my current tool?** Not for this. In networkx it is one line:
  `nx.shortest_path(G.to_undirected(), 1001, 1188)`. What I liked: 'Local only' is stated,
  direction defaults to 'Either way', the 1/count transform is written out, and 'None' is offered
  as a weight. If an investigator could type two names and get the path highlighted with the
  building named, I would hand them this instead of doing the lookup myself.

## Problems observed

1. The From and To fields could not be filled by picking from a list or from the table. The
   only routes offered were typing (no suggestions appeared) or clicking a dot in an unlabeled
   421-node layout.
2. Opening Shortest path switched the bottom table from Nodes to Edges, so the rows I had
   just found disappeared.
3. Weight defaults to count, which gives the lightest route rather than the fewest hops this
   question asks for. Nothing points out that 'None' gives fewest steps.
4. The edge table showed 4 rows out of 1,306 with no filter visible, so I could not tell
   whether I was seeing everything relevant.
