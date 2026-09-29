# Session: too big to draw -- Expert Emma

Participant: Expert Emma, a network scientist. She works in Python notebooks (networkx, igraph,
graph-tool) and uses Gephi for the final figure. Persona: [../../personas/expert-emma.md](../../personas/expert-emma.md).

Task as read to her: "This citation data is too big to draw. Is anything here worth a look?"

Data: a patent citation sample, 124,318 patents granted 1999 to 2001 and 1,480,221 citations,
from patent-citations-sample.csv. This task last ran three rounds ago, when she rated it 5 of 7.

Screens she saw, in the study view (design notes hidden), in this order:

| Step | Screen | Render |
|---|---|---|
| 1 | Opened, nothing drawn | [shot](../../../shots/r6-emma-tbd-not-drawn.png) |
| 2 | Isolates count clicked | [shot](../../../shots/r6-emma-tbd-isolates.png) |
| 3 | "Narrow the graph..." list | [shot](../../../shots/r6-emma-tbd-narrow.png) |
| 4 | Keep top rows, 200 typed | [shot](../../../shots/r6-emma-tbd-keep.png) |
| 5 | The 200 kept and drawn | [shot](../../../shots/r6-emma-tbd-kept.png) |
| 6 | Undo, then a new rule | [shot](../../../shots/r6-emma-tbd-rule.png) |
| 7 | Rule applied, 612 drawn | [shot](../../../shots/r6-emma-tbd-drawn.png) |
| 8 | Top 3 and their neighbors, two steps | [shot](../../../shots/r6-emma-tbd-sample.png) |
| 9 | Find, three patent numbers pasted | [shot](../../../shots/r6-emma-tbd-find-s7.png) |
| 10 | The table with the rule kept as a set | [shot](../../../shots/r6-emma-tbd-table-dock-limit.png) |
| 11 | The large-selection screen | [shot](../../../shots/r6-emma-tbd-selection-over-cap.png) |

Outcome: success, with difficulty. She came away with four things worth a look. She again lost
time on why the most-cited patent has 779 citations in the table and at most 236 in the chart.

## Think-aloud

### 1. The file opens and nothing is drawn

"'124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted
in Statistics and listed in the table.' Good. Same sentence as last time and it is still the
right one. I do not want 124k dots."

"Where did my file go? Left rail: 'Assistant Off. Nothing is sent.' That is still about the
assistant, not about the CSV. On this screen I do not see anything about the file. I have seen a
'Nothing has been sent from this project' line on other screens of this thing, so it exists
somewhere. Why is it not here, on the very first screen, where I am deciding whether I am allowed
to keep going? I will assume it is local because it has been every other time. That is not how I
am supposed to work with client data, but fine."

"Numbers. Density 0.0000958. 1,480,221 over 124,318 times 124,317 is 9.58e-5. Directed density,
correct. Average total degree 23.8, that is 2m over n, and it says 'total'. Weak components 3,912,
giant one 94.0 percent. Isolates 2,406. Bottom right, partly cut off: 'Edges: directed, weight
not set.' Good, it read direction, and it tells me there is no weight instead of inventing one."

"Degree distribution, In selected, complementary cumulative, log-log, zeros counted separately:
41,873 with in-degree 0, 'never cited by a patent in this sample; the 2,406 isolates are among
them.' That is how I would plot it. Nice."

"And here we go again. The chart says 'max 236'. The table is sorted by citationsReceived and
the top row, 6117075, has 779. Header says '0 to 779'. So either the chart is wrong or those are
two different quantities. I know from last time it is the second. But nothing on this screen
says so. The column header says 'citationsReceived', the chart says 'in-degree', and a reader who
has not been here before will think the tool is dropping edges. I would. Nothing changed here."

### 2. The isolates link

"Clicking 2,406. Selection, 2,406 nodes, edges between them 0, in 0, out 0, and: 'Their
citationsReceived counts citations from patents outside it.' Right. There it is. The one sentence
that explains the whole table, and it lives on the isolates panel. Move it to the column header.
Or put an in-degree column next to citationsReceived so the two sit side by side."

"First thing worth a look, then: 5997071 has 46 citations on record and is an isolate here. The
three-year window cuts off most of the citation structure. Anything I compute on this sample is
about the window, not about the patents."

### 3. "Narrow the graph..."

"Popover: 'No filter steps. Every number reads the full graph: 124,318 nodes, more than this
browser draws at once.' Suggested: 'Keep top rows by citationsReceived... the table's first rows,
in its order; you set how many.' And 'Neighbors of a node... a row you pick in the table, or find
by name.' And 'Add step'."

"Last time the suggestion was top 3 with neighbors and did not say which neighbors. Now it is
split into two things. Fine. Top rows first, I want to see how many it would keep."

### 4. Keep top rows

"'Keep the first 200 rows. In the table's order: citationsReceived, Highest first.' And: 'Row 200
has citationsReceived 358; 1 more patent also has 358 and is left out.' Huh. It told me about the
tie. Nobody tells you about the tie. Good."

"But which one got left out, and why that one? Ties broken by id? By file order? If the answer is
file order, then the set depends on how the file was sorted, and that is the Gephi import-order
bug in a different hat. I would rather it said 'ties broken by id' or offered me 201. Not fatal.
It is one patent. But I want the rule written down."

"'200 nodes, 288 edges, will draw.' Before I commit. Yes. Keep these 200 rows."

### 5. The 200 drawn

"Chip: '200 of 124K nodes, 1 step'. Toast with Undo. Statistics box on top: 'Describes the 200
most cited patents, not a random sample. Density reads high: highly cited patents cite each
other.' And a 'reads high' tag on density. I said last time this was the most honest thing a
graph tool has said to me about a sample, and I still mean it."

"'Most cited', though. Most cited by what count? By citationsReceived, which is the outside
number. Inside these 200 the in-degree tops out at 17, and 72 of the 200 have in-degree 0 inside
the set. So 'highly cited patents cite each other' is only half true: a third of the top 200 are
not cited by any other top-200 patent. That is my second thing worth a look."

"16 isolates, 21 weak components, giant one 87 percent. The picture: ForceAtlas2, 'Engine:
WebGPU', a play button. Settings? Gravity, scaling, iterations, seed? I do not see them. There is
no chevron on that row. If I run it twice do I get the same layout? Still cannot tell. I will not
put this in a deck until I can."

### 6. Undo, and a rule instead

"Undo. Narrow again, 'Add step'. New rule: Keep Nodes, Where category is Drugs and medical, AND,
Where citationsReceived >= 25. Three dropdowns and a text box for one line I would type in five
seconds: `category == "Drugs and medical" and citationsReceived >= 25`. Still no text mode that I
can see."

"And the Where list: can I pick in-degree, or a PageRank I ran, or only the file's four columns?
The dropdown is closed, so I do not know. If it is only file columns, this is a spreadsheet
filter, not a graph filter."

"'612 nodes, 1,843 edges, will draw.' Good. Filter to."

### 7. 612 drug patents drawn

"612, '1,843 of 1,480,221' edges. Density 1,843 over 612 times 611 is 0.00493. Correct. Average
total degree 6.0, correct. 31 isolates, 44 weak components, giant one 89.1 percent. No 'reads
high' note this time, even though I picked the most-cited drug patents. Why does top-200 get a
warning and a rule on the same column does not? Same bias."

"In-degree chart: max 158, and 326 of the 612 have in-degree 0 inside the rule. Same as last
time: most well-cited drug patents are not cited by each other inside the window. That is still
the third thing worth a look."

"Picture: a hairball on the left, a grid of small pieces on the right. Labels in the core sit on
top of each other. It is soup, as I expected. The numbers are more useful than the drawing."

### 8. Top 3 and their neighbors

"The two-step version: keep top 3, then add their neighbors. 586 nodes, 2 steps. Side note:
'Describes the 3 most cited patents and all their neighbors, not a random sample. It favors hubs,
so density and clustering read high.' The design notes say the neighbor step is 1 hop, both
directions, and the popover shows those as controls. So it is citers and cited. Good, that was
my question last time."

"Three stars. 6117075 has about 240 spokes in the drawing and 779 in the table. I know why now.
A client would not."

"Patents sitting between the stars: 6018952, 5907468, 6112268, 6228917, 5882034. Things that
cite into both the drug hub and the communications hub. That is the fourth thing: I would pull
those and read the claims."

### 9. Find, three patent numbers

"Pasted '6117075 6231106 6287586' into Find. '3 results in all 124,318 nodes.' Works on an
undrawn graph. Good."

"Inspector for 6117075: 'Not drawn: the graph is past the drawing limit. Counted everywhere.'
Attributes: grantYear 2000, category Drugs and medical, citationsReceived 779. Where is its
in-degree and out-degree in this graph? This is the exact place that would settle 779 versus 236
in one glance, and it is not there. Same as last time."

"There are three icons at the top of the inspector with no labels. The funnel is probably 'filter
to neighbors'. The arrow thing with a chevron, no idea. I would hover. I am not going to guess."

### 10. The table, with the rule kept as a set

"Now the rule is a set on the left: 'Drug patents cited 25+, rule, 612', and a column in the
table that says 'member'. And a style layer 'highlight'. So this is the paint version instead of
the filter version. Fine, both exist. 'Export table...' in the corner. Good, that is what I
actually need: the rows out, with the membership column, into pandas."

"'Nothing has been sent from this project' under the title. There it is. So it exists, it is
just not on every screen."

"Column headers have little dashed empty boxes under grantYear and citationsReceived. Is that a
histogram that did not load? A drop target? It does not say. And the Statistics on the right is
down to four rows: nodes, edges, components, largest component. Where did density and the degree
distribution go? It is the same graph, same full scope. On the first screen I had all of it."

### 11. The large-selection screen

"This is a different dataset, 'Transfers, March 2026', 3,000 accounts. Not my patents. Fourteen
flagged accounts drawn over a density background, with a legend: 'Flagged accounts: true 14,
false, as density 2,986'. That legend is the right idea, it says what the grey is. But it has
nothing to do with my question. I skip it."

## What she found worth a look

1. The three-year window truncates the citation structure. The top patent has 779 citations on
   record and at most 236 citers inside the sample; 41,873 patents are never cited inside it, and
   2,406 are isolates even though some have up to 46 citations on record.
2. Inside the 200 most cited patents, 72 are not cited by any other of the 200 (in-degree 0
   within the set), so the note "highly cited patents cite each other" only holds for part of it.
3. Of 612 drug patents with 25 or more citations on record, 326 have in-degree 0 inside that
   set.
4. Patents between the drug hub and the communications hubs (6018952, 5907468, 6112268, 6228917,
   5882034) cite into both fields and are worth reading.

## Single Ease Question

**5 of 7.**

"Same as last time. The counts, the distribution, 'will draw' before I commit, and the tie note
on top rows carried me. I again spent the first few minutes on 779 versus 236, and that is the
tool not saying where a number comes from. It is fixable with one sentence on the column header,
and it is still not fixed."

## Would she use this instead of her current tool?

"Instead of the notebook: no. I would compute all of this in igraph and trust it more. Instead of
Gephi, for handing this to a patent attorney who wants to type a patent number and look at its
neighborhood without me on the call: yes, probably. It opens a file Gephi would choke on, it
tells the truth about what it did not draw, and it exports the table. What stops me from saying
yes today: the file-stays-local line has to be on the first screen, the node needs its in-degree
next to citationsReceived, and the layout needs its settings and seed visible so the picture I
hand over is one I can make again. And let me type the filter."

## Problems she raised

| Screen | What happened | Severity (1-4) |
|---|---|---|
| Opened, nothing drawn | The table's citationsReceived (max 779) and the in-degree chart (max 236) disagree with no explanation on the screen; the one sentence saying the column counts citations from outside the sample is on the isolates panel. She again suspected the statistics for several minutes. Unchanged since three rounds ago. | 3 |
| Find, node inspector | The inspector shows only the file's attributes, not the node's in-degree and out-degree in this graph, the one place that would settle the mismatch. Unchanged. | 2 |
| Opened, nothing drawn | The statement that the file stays local ("Nothing has been sent from this project") appears on the table screen but not on the first screen she sees, where she decides whether she may continue. | 2 |
| The 200 drawn, 612 drawn | ForceAtlas2 shows "Engine: WebGPU" and a play button but no parameters or seed, so she cannot tell whether a rerun gives the same picture. Labels overlap in the dense core. Unchanged. | 2 |
| New rule | Still dropdowns only, no typed expression; she cannot tell whether computed measures (in-degree, a run's result) are offered in "Where". | 2 |
| Keep top rows | The tie note says one patent tied at 358 "is left out" but not which one or by what rule ties are broken; if it is file order, the kept set depends on how the file was sorted. | 2 |
| 612 drawn | The "reads high" warning appears for Keep top rows and for top 3 with neighbors, but not for a rule that also selects the most-cited patents, though the bias is the same. | 1 |
| The table with the rule as a set | Dashed empty boxes under two column headers with no label; she could not tell whether they were loading histograms or something to click. The Statistics panel shrank to four rows, losing density and the degree distribution for the same full-graph scope. | 2 |
| Find, node inspector | Three unlabelled icons at the top of the inspector; she guessed one and would not click the others without hovering. | 1 |
| Large-selection screen | It shows a different dataset (Transfers, March 2026), which broke her context mid-task. | 1 |

## What she liked

- "124,318 nodes not drawn ... Every node is counted in Statistics and listed in the table": an
  honest limit message that names the limit.
- Directed density, "average total degree", weak components, and a log-log complementary
  cumulative degree distribution with the zero count shown separately.
- "Edges: directed, weight not set" in plain words.
- "will draw" with node and edge counts before any filter commits.
- The tie note on Keep top rows.
- "Describes the 200 most cited patents, not a random sample" and the "reads high" tag on density.
- The neighbor step now states hops and direction.
- Find works on the undrawn graph.
