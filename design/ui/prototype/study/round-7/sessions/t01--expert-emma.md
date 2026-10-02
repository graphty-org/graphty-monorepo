# Session: t01, Expert Emma (network scientist)

Task as given: "A colleague handed you this network and you are about to build on it. Before you
trust anything in it, work out what you actually have: how many characters and connections,
whether it all hangs together as one piece, and whether anything about how it came in looks
wrong."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t01--expert-emma/.

## Start screen (shots/tasks/t01/01.png)

"'Local only' in the top bar. Good, that is my first question, or at least it is claimed. Left
rail has Graph, Data, Views, Notes, Assistant. I am not touching Assistant. Counts and an import
summary should live under Data."

## Step 1 -- Data

    timeout 120 node app-b/study.mjs --try .../t01--expert-emma/01.png task:t01 --click "Data"

"There it is, on one click. Source: miserables.gexf, 77 nodes, 254 edges. Summary on the right:
undirected, weight 'value, stronger', density 0.0868, connected components 1, average degree 6.6,
highest degree 36. I check that in my head: 2*254/(77*76) = 0.0868, 508/77 = 6.6, Valjean at 36.
That is Les Mis. One component, so yes, it hangs together.

The attribute list worries me a bit: 'degree' and 'betweenness' are listed as node attributes
next to 'label' and 'group'. If those came in with the file, I do not trust them. There is also a
degree distribution, log-log CCDF, which I like, but its readout says '0 / degree 0' with nothing
under my pointer. Meaningless default."

## Step 2 -- open the source

    ... --click "Data" --click "miserables.gexf"

"An import editor. Nodes table: id (key), label (name), group. Match report: 77 rows, every id
unique. So the file has only id, label, group; degree and betweenness were computed, not
imported. Fine, but the attribute list did not tell me that. Group is typed as text, which is
right for a category."

## Step 3 -- edges table of the import

    ... --click "Data" --click "miserables.gexf" --click "edges"

"Edges: source, target, value. Match report: 254 rows, every edge has both ends. And then the
header says 'Weight: none (each edge counts 1)' and value is marked 'Attribute'. The summary said
'Weight: value, stronger'. Those cannot both be true. This is the thing that looks wrong."

## Step 4 -- follow the summary's weight link

    ... --click "Data" --click "value, stronger"

"It took me into the import editor on the NODES table. Not to the weight setting, not to edges.
The link explains nothing."

## Step 5 -- click the weight text in the import

    ... --click "Data" --click "miserables.gexf" --click "edges" --click "Weight: none (each edge counts 1)"

"Nothing happens. It is just a label."

## Step 6 -- the role tag under value

    ... --click "Data" --click "miserables.gexf" --click "edges" --click "Attribute"

"A role menu: From, To, Subtype, Name, Time, Weight, Edge id, Position, Attribute (checked). So
the import really has value as a plain attribute and Weight is a choice right here. Either the
weight is assigned somewhere after the import, or one of the two panels is stale. I am not going
to 'fix' an audit target blindly. I am writing it down."

## Step 7 -- the readings that were not computed

    ... --click "Data" --click "4 more readings not computed"

"That flipped the left panel to Graph and opened a context menu with 'Add node...' highlighted. I
did not ask to add a node. One Enter and I have edited the data I am auditing. The item I want is
'Compute the overview'."

## Step 8 -- compute the overview

    ... --click "Data" --click "4 more readings not computed" --click "Compute the overview"

"Average clustering 0.573, transitivity 0.499, diameter 5, degree assortativity -0.165. Those
are networkx's values for the unweighted Les Mis graph. Good. It does not say whether clustering
used weights. It evidently did not, which matches the import ('weight none') and contradicts the
summary ('value, stronger')."

## Step 9 -- the edge table

    ... --click "Edges"

"254 edges, value sorted descending from 31 (Cosette-Valjean), 21, 19. The weights are in the
data. What I cannot tell is whether anything downstream uses them. And there is no check I can
see for self-loops, duplicate or parallel edges. 'Every edge has both ends' is not that check.
I will stop."

## Verdict

Did I succeed? Mostly. Counts (77 / 254), one connected component, undirected: found in one
click and correct. "Anything wrong with how it came in": I found a real contradiction about edge
weights (summary says weighted by value; import says no weight, value is a plain attribute), but
the app did not let me resolve which is true, and the summary's own link sent me to the wrong
table. I also could not confirm there are no self-loops or duplicate edges.

Single Ease Question: 5 of 7. The numbers were fast and right. The weight story cost me five
steps and I still do not know the answer.

Would I use this instead of my current tool? Not for this. In a notebook, `G.number_of_nodes()`,
`nx.number_connected_components(G)`, `nx.is_weighted(G)` and a self-loop count take thirty
seconds and do not disagree with each other. What I liked: the summary panel on one click,
density and components up front, a log-log CCDF instead of a pie chart, a match report on import,
and the overview numbers matching networkx. What would stop me: two panels that disagree about
weight, a link that lands on the wrong table, a menu that pre-highlights "Add node..." while I am
auditing, and computed columns (degree, betweenness) listed as if they were file attributes. As
a hand-off view for someone who does not code, possibly; as the place I validate an import, not
until the weight question has one answer.

## Problems noted, in her words

1. Weight contradiction: summary "Weight: value, stronger" vs import "Weight: none (each edge
   counts 1)" with value as Attribute. Severity: high for her -- she writes off tools whose
   numbers she cannot reconcile.
2. "value, stronger" link opens the import on the nodes table, not the edge weight setting.
3. "4 more readings not computed" opens a context menu with "Add node..." highlighted.
4. Computed columns (degree, betweenness) appear in the attribute list without saying they were
   computed, not imported.
5. No self-loop, duplicate-edge or parallel-edge report on import.
6. Overview does not say whether clustering, diameter or assortativity used weights.
7. Degree distribution readout shows "0 / degree 0" with no pointer over it.
