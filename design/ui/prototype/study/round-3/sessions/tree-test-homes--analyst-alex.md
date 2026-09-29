# Tree test: where things live -- Analyst Alex

Participant: Alex, operations data analyst at a logistics company. Uses NetworkX for the maths and
Gephi for the picture; checks every tool against the counts SQL gave him.

Task, as the moderator gave it: "Where would you go to: update with new data, open the table, keep
only one date range, see each node's degree, see neighbors past the drawing limit?"

Screens used: the start screen, the bottom table, the filter chip and its steps, the styles list.
Renders read: the start screen (first run, with recent projects, a recipe waiting for data), the
table (small graph, collapsed, past the drawing limit), the filter chip (three steps, and the time
window part), the styles list.

## 1. Update with new data

**Start screen, first run.** "OK, 'Open a graph'. 'Files stay on this computer ... uploads
nothing.' Good, that's the line I look for. Samples, Open..., Connect to data source."

"Update with new data -- so for me that's next month's supplier CSVs going into the thing I built
last month. There's no project here yet, so, Open... I guess? But that's a new graph, not an
update."

**Start screen, with recents.** "Right, now there's Recent projects. 'March transfers, 3,000
accounts.' So I'd click that to get my project back. Then... where do I put the April file in? I
don't see anything on this page that says 'update' or 'replace'. There's 'Open... or drop a file
here'. If I drop April's file on it, does it update March, or does it make me a brand new project
with none of my colours? That's literally the Gephi thing. I'm not dropping it until I know."

**Start screen, recipe waiting.** "Oh, 'Recipe waiting for data -- It carries no data. To use it,
add a protein network...', 'Add data...', 'Nothing changes until you choose Apply.' OK, that's the
idea I want: my steps, new data. But I only see this when someone sends me a recipe? I don't know
how I'd get here from my own March project. Is a recipe the same thing as my project?"

**Inside a project (table screen).** "Top left there's a hamburger and 'Les Miserables' with a
little arrow. I'd try the arrow on the name first -- that's usually where rename, save, 'replace
data' lives. Then the hamburger. Neither one tells me anything until I click it, and in this
prototype nothing opens. So my answer is: the project name's dropdown, maybe. That's a guess."

Result: guessed. Open... is findable but reads as "new". The recipe card shows the idea but not
how my own project becomes one.

## 2. Open the table

**Table screen, small graph.** "That one's easy, the table's already there under the picture.
Nodes, Edges tabs, 'Full graph: 77 nodes'. Export table as CSV... right there. Good."

**Table screen, collapsed.** "If it's closed there's this strip at the bottom: 'Table 77 nodes, 254
edges', and 'View > Table' on the right. It's small and grey, I'd miss it on the laptop screen
maybe, but the counts caught my eye. I'd click 'Table'."

Result: found, both ways. Took no time.

## 3. Keep only one date range

**Filter chip screen.** "Under the project name there's a button that says '27 of 77 nodes . 3
steps' with a funnel. Funnel means filter, so that's it. It opens 'Filter steps' -- 'Filter to
degree >= 2, took out 17, 60 left'. Oh, I like that it tells me how many it took out. Then 'Add
step'. I'd add a step for the date."

"On a fresh project it just says 'Full graph', which... I wouldn't read 'Full graph' as the filter
button. The funnel icon saves it."

**Time window part.** "There's a slider with 'Filter to this window', and a histogram of transfers
per day where you drag across the bars, 'Filter to Mar 8 to Mar 14'. And the step editor has
'timestamp between Mar 8, 2026 and Mar 14, 2026'. Three ways -- fine, I'd use the date boxes,
because I'd type the exact dates from my SQL. 'Took out 1,148, 1,852 left' -- I can check that
against a count query. That's good."

"Where's the slider in the real app though? It's floating here on its own. I don't know where it
lives."

Result: found via the funnel button, then Add step. The histogram and slider were nice but I could
not tell where they sit in the app.

## 4. See each node's degree

**Table screen.** "Degree column's right there: 'degree (full graph)', 1 to 36, with a rank next to
it. Valjean 36, #1. And on the right side, click a node, it says degree 36 under Attributes. I like
that it says 'full graph' on the column -- in Gephi I've had the filtered degree and the full one
get mixed up."

"'Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness.' Huh.
That's the sentence I'd put in the deck, honestly."

**Styles list.** "Here there's 'Size by degree' on the left, and 'Hubs, degree 17 to 34'. If I
wanted degree without running anything, I think the table is where I'd go, not here."

Result: found immediately, two places.

## 5. See neighbors past the drawing limit

**Table screen, patent citations.** "OK, the picture is empty and it says '124,318 nodes not drawn.
Narrow the graph...'. Fine, fair, it told me instead of freezing. That alone beats Gephi on the big
one."

"Now neighbors of one node. The table shows patents -- id, grantYear, category, citationsReceived.
There's no neighbors column. I'd click a row and hope the right panel shows its neighbors, but the
right panel just says 'Citations, Graph' with the totals. Maybe the Edges tab, then search for the
id with the magnifier? That would give me the edges, which is sort of the neighbors, but I'd have
to read both ends."

"Or 'Narrow the graph...' -- maybe that lets me pick one patent and its neighbors, and then it's
small enough to draw? I don't know. It doesn't say."

"In Python this is `G.neighbors(n)`. Here I'm stuck. I'd go Edges tab, search, and export it to
Excel, honestly."

Result: did not find a clear home. Best guess Edges tab plus search, or "Narrow the graph...".

## After the task

**Single Ease Question: 4 out of 7.**

"Table and degree, dead easy. The date filter, fine once I saw the funnel. The two I actually care
about every month are the ones I couldn't find: updating my project with new data, and looking at
one node on the big graph. For the update one I'm scared of dropping a file and losing my colours,
because that's exactly what happened in Gephi Lite."

**Would he use this instead of his current tool?**

"For the Gephi half, maybe. The counts are everywhere, the 'took out 1,148' thing, the 'degree
(full graph)' header, the sentence about who's #2 -- that's stuff I'd trust. The 'files stay on
this computer' line is right where I load, so I could at least try it with the sanitised extract.
But the reason I'd switch is not redoing the picture every month, and I couldn't find where I put
next month's data into last month's project. Show me that and I'd move. Until then I'm still in
Python for the big graph and Gephi for the slides."
