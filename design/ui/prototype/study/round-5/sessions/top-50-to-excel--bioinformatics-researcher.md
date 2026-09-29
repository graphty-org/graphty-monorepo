# Top 50 by betweenness into Excel or pandas -- Dr. Chen (computational biologist)

Task as given by the moderator: "Get the top 50 nodes by betweenness into Excel or pandas with their
original ids, and say how sure you are of the order."

Dataset: the human protein interaction network (300 proteins). Screens seen, in order, in the
participant view: the Results panel with betweenness finished, the same panel with its table open
at the bottom, the table dock ranked by several measures, and the Export dialog (Table and the
project-name menu). Renders: shots/tasks/top-50-to-excel/01-03, shots/r4-chen-top50-export-table.png,
shots/r4-chen-top50-export-ways-in-menu.png.

## Think-aloud

### 1. Results panel, betweenness finished

"OK, right side says Betweenness, Result. 'On: full graph, 300 nodes, 3 components.' Three
components -- fine, but betweenness across disconnected components, is it normalised per component
or over the whole thing? It doesn't say here. 'Exact. Undirected. WebGPU.' Exact is good, I don't
want sampled betweenness on 300 nodes. I don't care that it's WebGPU."

"'Weight: confidence, not used yet. Change...' Good that it tells me. For betweenness I actually
don't want the STRING score used as a distance unless someone has inverted it, so unweighted is
what I'd do in igraph anyway. But 'not used yet' reads like it's nagging me to turn it on. If I
click Change, does it know that a confidence is a similarity and a shortest path wants a distance?
I'm not clicking it for this task."

"Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ, CDK1, AKT1. Five. I asked for fifty. What scale is
0.1379? Normalised by (n-1)(n-2)/2? igraph gives me raw counts unless I ask. If I join this to my
igraph output the numbers won't match and I need to know why before I do. There's a 'Details'
link -- I'd have to open that to find out. It should be on the number."

"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' Hm.
What's a tie line? This is exact betweenness -- it's deterministic, two values are either equal or
they're not. Is 1% a rounding tolerance? A noise model? Somebody's rule of thumb? I read it as:
YWHAZ and CDK1 are 1.2% apart, so don't make a story out of 3 versus 4. That's actually a sensible
thing to tell a student. But it covers five rows and I need fifty, and nothing tells me where the
1% comes from."

"'295 more in the table.' OK, that's where I go."

### 2. Panel with the table opened at the bottom

"There it is, a node table, sorted by betweenness, highest first. Columns: id, module 'from the
file', degree, betweenness 'exact, full graph', betweenness rank 'of 300, ties share', PageRank,
PageRank rank. I like that the rank is its own column and that ties share a rank -- that's
rank(method='min'), I can live with that."

"The id column says MAPK1. Is that my original id? If I loaded STRING's own file the node ids are
9606.ENSP..., and MAPK1 is the preferred name. The task says original ids. I can't tell from this
whether 'id' is the identifier in my file or a display label. If it's the label and I lose the
Ensembl protein id, the join onto my DE table in R is by symbol, and symbols are exactly what goes
wrong."

"Reading down: 0.0579, 0.0561, 0.0539, 0.0530, 0.0515 for ranks 6 to 10. So 3%, 4%, 1.7%, 3% apart.
I'm doing the tie-line arithmetic myself now, which is what the panel did for five and stopped."

"Top right of the table: 'Export table...'. That's the button."

### 3. Table dock, ranked view

"Wait, this one's sorted by pagerank -- the little arrow is on pagerank, not betweenness. So if I
came here some other way I'd have to click the betweenness header first, and the export would
follow whatever sort I left it in? I'd want to be sure the file order is betweenness, or better,
not rely on order at all -- I'll sort in pandas anyway."

"And the button's called 'Export table as CSV...' here and 'Export table...' on the last screen.
Same button? Probably. Doesn't inspire confidence."

"The header groups are good: 'Betweenness exact, unweighted, full graph' over the score and rank.
Unweighted is written here, that's what I'd put in a methods section. Still no word on
normalisation."

"There's a line: 'MAPK1 and TP53 are the top 2 on all three measures. At #3 they part: CDK1 by
degree, YWHAZ by betweenness and pagerank. Compare rankings...' That is the first thing on this
screen that addresses my actual worry: is my betweenness list just the degree list again, i.e. the
most-studied proteins? MAPK1 and TP53 at the top of everything is exactly the study-bias pattern.
I'd click Compare rankings to see where they diverge further down. It doesn't answer the question,
but at least it asks it."

"Degree rank shows '#4=' for YWHAZ and AKT1 -- so ties get an equals sign. Good. None in the
betweenness top ten."

### 4. Export dialog, Table

"Export, Table (.csv), Nodes. Rows: '14 of 3,000 rows, filtered'. From: 'in Mule ring suspects'.
The preview is ACC-233575, riskScore, country... this is not my network. These are bank accounts.
I'm looking at somebody else's project. OK -- it's a mock, but if I saw this in a real tool I'd
close it and check I hadn't loaded the wrong file. I can only guess at what my file would look
like."

"Taking the shape of it: the CSV holds only the header and the rows, first column is 'the file's
own id, written as it came in'. That sentence is what I wanted on the table screen. If it holds
for my STRING file, I get ENSP ids out, and I'm happy."

"There's no 'top N rows' option -- it exports every row in scope. Fine. I'd rather have all 300 and
do df.nlargest(50, 'betweenness') myself than trust a cut. What I need is the rank column in the
file, with the ties; the preview header here has score columns but no rank column, so I can't tell
if 'betweenness rank' goes out. I'll recompute rank in pandas if it doesn't."

"The header text is the full description: 'pagerank (exact, unweighted, normalized to sum 1, full
graph)'. Long column names in pandas are ugly but honest; I'll rename them. Better than 'bc'."

"'Beside it: ..._nodes-methods.txt'. Rows, filter, order, data file, load, weight not used, each
measure with its method and normalisation, the element version. That -- that's the thing. That is
my supplementary table legend, written for me. If the betweenness line in it says the
normalisation, that answers my question from step 1, one step too late."

"Excel. If a postdoc opens this in Excel, SEPT7, MARCH1, DEC1 become dates. Everyone in this field
has been bitten by it; there are papers about it. Nothing here says whether the CSV protects gene
symbols, or offers a TSV or an .xlsx with text-typed columns. For pandas it's fine. For Excel I'd
tell them to import as text, as always."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good. That's what I want to read."

### 5. Export from the project-name menu

"There's also Export... in the menu under the project name, Ctrl+Shift+E. Different project name
again -- 'Stress response study'. The left side lists 'Sent and saved: ..._nodes.csv and its methods
file, 2026-09-24, to Downloads'. A record of what I exported and when -- useful when a reviewer
asks which version of the table went into the supplement."

"Where's the R or Python route? I'd still want to do this from a script next time. Nothing here
suggests one."

## Answer to the task

"I'd export the whole node table as CSV and take the top 50 in pandas:
df.sort_values('betweenness', ascending=False).head(50), plus the methods file next to it. Ids:
the export says it writes the ids as they came in, so I'd trust that, but I'd check the first
row against my input before joining."

"How sure of the order: of the arithmetic, completely -- it's exact betweenness on a fixed graph,
nothing stochastic, and ties share a rank. The top two are far apart and I'd stand behind them.
3 versus 4 is 1.2%, and from 6 to 10 the gaps are 2 to 4%, so anything past the top two I'd report
as a set, not as an order. Of the biology, not very: it's unweighted, it's one STRING cut-off, and
the top of this list is the top of the degree list, which is the study-bias problem. The tool told
me the first half of that for five rows. For the other forty-five I worked it out myself, and it
never told me how stable the order would be if I changed the cut-off to 0.4."

## Single Ease Question

5 out of 7. "Getting the table out is easy and the methods file is better than anything Cytoscape
gives me. I lost points on not knowing the betweenness normalisation, not knowing whether 'id' is
my original identifier, the 1% line that only covers five rows, and an export preview that showed
me somebody else's data."

## Would I use this instead of my current tool?

"Not instead. For this task I'd do it in igraph in four lines and get the same numbers with the
normalisation I chose. I'd use this beside it: to look, to catch that MAPK1 and TP53 top every
measure, and for the methods file, which I'd copy straight into a supplementary legend. If there
were an R or Python way to run the same measures and pull this same table, it would go in the
pipeline. Without one it's a viewer with a very good export."

## Problems noted (her words, then what happened)

- "What scale is 0.1379?" -- betweenness normalisation is not stated on the panel or in the table
  header; only behind Details or in the exported methods file.
- "What's a tie line?" -- the 1% rule has no stated origin, and the sentence covers the top 5 only,
  not the rows the reader asked for.
- "Is that my original id?" -- the table's id column shows gene symbols; nothing on the table says
  whether this is the file's identifier or a display name.
- "This is not my network." -- the Export dialog preview shows a bank-account project, and the
  project name changes between screens (Human protein interactions, Stress response study).
- "Sorted by pagerank?" -- the ranked table arrives sorted by a different measure than the one she
  came from; unclear whether the CSV follows the on-screen sort.
- "Export table..." and "Export table as CSV..." -- two labels for what seems to be one button.
- "SEPT7 becomes a date." -- no word on Excel's gene-symbol mangling; no TSV or text-typed option.
- "Does the rank column go out?" -- the CSV preview shows score columns but no rank column.
- "Where's the R route?" -- no scripting path visible.
- "10 nodes, all 291=" in the distribution block reads as a code, not a sentence.

## What she liked

- The methods file written beside every table: measure, method, normalisation, weight, filter,
  data file, version.
- "Exact, unweighted, full graph" in the column header, and rank columns where ties share a rank.
- The rankings-agree line that names where degree and betweenness part.
- "Nothing is uploaded" and the record of what was exported and when.
