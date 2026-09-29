# Session: "How is this account connected to that one?" -- Chris, ML engineer (recommendations)

Participant: Chris, senior ML engineer who owns candidate retrieval at an online retailer
(persona: study/personas/ml-engineer-recsys.md). Laptop size, 1440 by 900.

Task, as given by the moderator: "How is this account connected to that one?"

Screens used: the inspector mock (screens/inspector.html, renders in shots/) and the find mock
(screens/find.html). Renders read: screens__inspector.png, inspector-path-to.png,
r2-flagged-ia--inspector-two.png, inspector-path.png, screens__find.png, screens__find-s10.png.

Outcome: success with difficulty. Found the "Paths between..." button and the path result;
got a shortest path with its hops and edge values. Did not get what he actually wanted: all the
connections between the two, counted, with the common-neighbour numbers beside them.

Single Ease Question: 4 of 7.

---

## Transcript (think-aloud, lightly cleaned)

**Opening the first screen (inspector, one node selected).**

"OK, which account? There's no account here. This is... 'Human protein interactions', 300
nodes. TP53. Fine, I'll pretend TP53 is my user and some other protein is the item or the other
user. In my world 'account' is a user_id, and 'that one' is probably another user or the item
the model recommended."

"Right panel. TP53, degree 32, '#2 of 300'. I like that it gives me the rank with a
denominator. Betweenness 0.1139 -- normalized or not? Doesn't say. Moving on."

"There's a 'Path to...' button right under the name. That's literally the question. Good, I
don't have to go hunting. Tooltip on Neighbors says '1 hop: 33 nodes. Ctrl+Z undoes it.' --
that's actually the kind of tooltip I read, it has a number in it."

**Pressing Path to... (inspector-path-to render).**

"It armed something. Black bar at the top: 'Pick the end node: click, or find it by name
(Ctrl+K). Esc cancels.' And down at the bottom a From / To strip, From is TP53, To is empty.
Good. I'm not clicking on a 300-node blob to find one dot -- I'd type it. Ctrl+K, type the id.
On my data that's 'u_48213377' or whatever; I assume the To box takes a typed id since it says
'Pick the end node' in the placeholder. If it only accepts a click I'm stuck at 4 million users."

"What I don't see yet: is it going to be shortest path? All paths? Up to k hops? Nothing tells
me the algorithm before I commit. The toolbar also switched to the path tool -- the second
icon, the squiggle. Wouldn't have known that icon meant 'path' without the bar."

**Trying the other route: select both, then Paths between... (two-selected render).**

"Different way in: two selected, and there's a 'Paths between...' button. How did I get two
selected? Shift-click I guess, or Ctrl+K twice? Nothing on this screen says how to add a second
node to the selection. I'd try shift-click, that's what every tool does."

"This form I actually like. First line: 'On: full graph, 300 nodes. Undirected.' That's the
denominator and the direction up front, which is the first thing I'd ask. From TP53, To SMAD3,
a swap button. 'Weight by: None: count hops.'"

"Question: if I set weight to my interaction weight, is that treated as a distance or a
strength? In my graph a higher weight means MORE connected -- five purchases beats one view.
Shortest path with that as cost would route through the weakest edges. That's the classic
mistake and there's no hint here about which way it reads. I'd have to look at the docs or
just not trust the weighted version."

"'Every shortest path is found and drawn together.' OK, press Run."

"Left side, the 2-selected inspector: 'edges between 0'. Fine, no direct edge. But this is
where I want common neighbours. Two nodes selected -- tell me how many neighbours they share,
Jaccard, Adamic-Adar. That's three numbers and it's the whole reason I'd select a pair. Instead
there's '5 differ: module, degree, betweenn...' which, sure, but that's not how they're
connected."

**The result (found-path render).**

"Here we go. 'Found path, 3 hops, 1 of 12.' TP53 -> MSH2 -> UBB -> SMAD3. Each hop has the
edge's confidence between the nodes: 0.82, 0.53, 0.82. That's nice -- that's the 'edge value one
hover away' thing I wanted, except it's not even a hover, it's in the list. And the node values
in a column. That part I couldn't do in the notebook without twenty lines of matplotlib."

"But wait. The form said every shortest path is 'drawn together'. The canvas draws ONE path and
there's a '1 of 12' stepper. So which is it? I want all 12 at once -- the union is the answer
to 'how are they connected'. Twelve equal-length paths through different middle nodes is the
signal; stepping through them one at a time with arrows is how I lose count. In my graph
between two heavy users it'd be 12 thousand, and a stepper is useless."

"UBB in the middle -- that's a hub. In recsys land that's the bestseller everyone bought. Every
shortest path goes through the popular item and tells me nothing. I'd want to either exclude
hubs or weight by 1/log(degree) -- i.e., Adamic-Adar thinking. There's no 'avoid nodes with
degree over N' here, so I'd be filtering the graph first and then re-running."

"'Create path to style'. What? I didn't create it, it found it. Oh -- is this 'save it so I
can style it'? The icon row also has a 'Create path' icon, per the hover. I'd call it Save or
Keep. Took me a second to get that it's the difference between a scratch result and a saved
one."

"Export at the bottom: copy icon and a plus. Copy is 'Copy as PNG'. I don't want a PNG, I want
the path as rows: from, to, hop, edge value, with my ids. If this is only a picture it's a
screenshot for the VP, which is fine for that use, but not for me."

**The find screen, for the 'account' part.**

"Let me check the find screen since the moderator said account. OK, there's an account dataset:
'Transfers, April 2026', 3,093 accounts, ids like ACC-393859, directed, weight: amount. Type
ACC-705989: '0 matches in Transfers, April 2026 (3,093 accounts).' And a 'Search recent
projects' button. Honest message -- it tells me where it looked and how big it was. I like that
it didn't fuzzy-match an id; for user ids a near miss is a different person."

"Now that's a DIRECTED graph with amounts. The path form I saw said 'Undirected' on the
protein graph. On transfers, would it follow direction? Would 'weight: amount' be used as
distance? Big transfer = short distance or long? Same question as before, and it matters more
here."

"And the hairball on that one... 3,093 accounts drawn as a blob. Doesn't matter for this task
because I'd just type both ids, but it's the thing I always complain about."

---

## After the task

**SEQ: 4 / 7.** "Finding the button was easy -- it's right under the name, and the Ctrl+K hint
is right there. Getting the answer I actually wanted was not. It answered 'what's one shortest
path', and the question was 'how are they connected'."

**Would he use it instead of his current tool (networkx in a notebook)?**

"For this question? Not yet. In a notebook it's `nx.all_shortest_paths(G, u, v)` plus
`len(list(nx.common_neighbors(G, u, v)))` and I get all of them as a list I can join back to my
tables. What this has that the notebook doesn't is the per-hop edge value laid out next to
the path, and the 'On: full graph, 300 nodes, undirected' honesty line. If the pair view
showed common neighbours / Jaccard / Adamic-Adar, drew all the shortest paths at once with a
count, let me say 'skip hubs', and exported the path as rows with my ids, I'd open it for the
'why did the model recommend this' tickets. Right now it's a nice picture of one route."

---

## Problems observed

1. **Result contradicts its own form (severity 3).** The Paths between form says every shortest
   path is found and drawn together; the result draws one path with a "1 of 12" stepper.
   "Which is it? I want all 12 at once, that's the answer."
2. **No pair statistics when two nodes are selected (severity 3).** The two-node inspector
   shows "edges between 0" and attribute differences but no common neighbours, Jaccard or
   Adamic-Adar -- the numbers that actually describe how two nodes are connected.
3. **Weight direction unexplained (severity 3).** "Weight by" never says whether a bigger
   weight means closer or farther. On an interaction or transfer-amount weight, shortest path
   by cost routes through the weakest ties. Direction handling on a directed graph (the
   transfers dataset) is not shown in the path mock.
4. **Hubs dominate and cannot be excluded (severity 2).** The path runs through UBB, a hub;
   there is no option to avoid high-degree nodes or cap path length other than shortest.
5. **How to select a second node is not shown (severity 2).** "Paths between..." only appears
   with exactly two selected; nothing on screen says shift-click or Ctrl+K adds to a selection.
6. **"Create path" wording (severity 2).** The path was found, not created; "Create path to
   style" reads as nonsense until you work out it means keep or save.
7. **Path export is a PNG (severity 2).** The Export row offers "Copy as PNG"; no rows of
   from/to/hop/edge value with the original ids.
8. **Task data mismatch (severity 1, study note).** The moderator said "account", the path
   screens are on a protein graph; the account dataset appears only in Find. He mapped TP53 to
   "my user" and carried on.

## Delights

- "Path to..." sits directly under the selected node's name; no hunting.
- The armed-tool bar says in words what to do next and names Ctrl+K and Esc.
- The path form's first line states scope, size and direction: "On: full graph, 300 nodes.
  Undirected."
- Each hop in the found path shows the edge value between the two nodes, in the list, no hover.
- Degree and centralities carry their rank "#2 of 300"; the Neighbors tooltip carries a count.
- Find's empty result names the project and its size and refuses to fuzzy-match an id.
