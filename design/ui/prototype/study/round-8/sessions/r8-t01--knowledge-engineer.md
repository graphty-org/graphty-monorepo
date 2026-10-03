# Session: first sitting on the Les Miserables sample -- Dr. Min-ji Kim, knowledge graph engineer

Task as given by the moderator: get the ready-made Les Miserables network on screen, have the
program work out something about the characters, make the drawing show that result in its colors
or sizes, get the characters' names written on the drawing, and finish with a picture file for a
document. Say when each part is done.

All commands were run from `design/ui/prototype`. `D` is
`tmp/round-8-sessions/r8-t01--knowledge-engineer` (absolute path used in the real commands).
Every run replays from the start screen.

## Start screen (shots/tasks/r8-t01/01.png)

"Start, Recent projects, Samples. No Turtle, no endpoint, but I was told today is practice on
their sample, so fine. 'Files are read on this computer and never uploaded' -- good, that is the
first thing I look for. There is a banner asking to collect usage data. I do not share telemetry
from a work machine. No thanks."

"Les Miserables, 77 characters. It says it 'opens with worked examples already added'. So someone
has already done the homework for me. We will see."

## Step 1 -- open the sample

```
timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t01 --click "No thanks" --click "Les Miserables"
```

"OK, a drawing. The left list already has PageRank, Louvain with 6 groups, shortest paths,
density, link prediction, a watchlist, a folder 'For the report', and a hidden Betweenness. The
nodes are already orange-to-brown with a legend top left: 'Color: PageRank 0.00330 to 0.0754'. At
least it names the measure and gives the range. Some names are on the drawing already -- Valjean,
Javert, Marius, about a dozen."

**Part 1 done: the network is on screen.** "Though I did nothing to get here except click a
sample."

"The legend is an orange-to-brown ramp. That I can read; it is lightness, not red against green."

## Step 2 -- click the PageRank row

```
timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "PageRank"
```

"Right panel: 'PageRank, Measure from Analyze. Paints 77 nodes (every node with a value). Covers
Louvain for Color.' That is a clear sentence about what this row does to the picture. But it was
already done for me. The task says have the program work something out. I want to run one myself
so I know what it actually did."

## Step 3 -- find where measures come from

```
timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"
```

"Flask icon, tooltip 'Analyze, Shift+A'. Opening it: a searchable list, Recent, then 'Rank nodes
and edges' with PageRank, Degree, Total value, Betweenness, Closeness, Eigenvector, each with one
line of what it means. Good: it says WHICH centrality, it does not just say 'importance'."

"And the right panel now shows the graph summary: 77 nodes, 254 edges, 'each a distinct pair',
undirected, weight is 'value, stronger', density 0.0868, 1 connected component, average degree
6.60, highest degree 36, and a degree distribution on log-log axes. That is the panel I would
check first on my own data. Nodes and edges are labelled as nodes and edges. I like that it
says 'each a distinct pair' -- so it did not quietly merge parallel edges, or it is telling me
there were none."

## Step 4 -- choose Betweenness

```
timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths"
```

"Betweenness form: weight = value (loaded weight), higher means Stronger / Farther / Capacity,
each explained. 'All 254 edges have value set; none is left out.' 'Betweenness reads a weight as
distance: it uses 1/value.' That is exactly the thing most tools hide and then I get the wrong
ranking. Credit for that. 'Under a second.' Run."

## Step 5 -- run it

```
timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run"
timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run" --click "Betweenness 2"
```

"A row 'Betweenness 2' appears at the top of the list with a spinner and a progress line. It
said under a second. I click it -- still spinning, and the right panel does not change to it,
it still shows the graph summary. The drawing is still PageRank. So it is running, or it is
stuck; nothing tells me which. On 77 nodes this should be instant. First thing that did not
behave."

## Step 6 -- try the Betweenness that was already there

```
timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Which nodes sit on the most shortest paths" --click "Run" --key Escape --click "Betweenness"
```

"There is an older Betweenness row with the eye crossed out. Its panel says 'Covered by PageRank
for Color' with a 'Move above' button, and 'Paints 77 nodes, none visible'. Good: it explains why
I would not see it. Two centralities fighting over the same color channel is a bad idea anyway.
I would rather put betweenness on size and leave PageRank on color."

## Step 7 -- betweenness on size

```
timeout 120 node app-b/study.mjs --try $D/09.png ... --click "Betweenness" --click "Shape"
timeout 120 node app-b/study.mjs --try $D/10.png ... --click "Betweenness" --click "Add Shape"
  -> nothing on screen is called "Add Shape"
timeout 120 node app-b/study.mjs --try $D/10.png ... --click "Betweenness" --click "Add"
  -> menu with Shape, Size
timeout 120 node app-b/study.mjs --try $D/11.png ... --click "Betweenness" --click "Add to Shape" --click "Size"
timeout 120 node app-b/study.mjs --try $D/12.png ... --click "Size" (and hovers on "Use data", "from", "column", "value", "Bind", "Map", "Link", "Remove", "Size from data", "From a column", "Use a column", "Set from data")
```

("..." is the same opening steps as step 6.)

"Clicking the word Shape does nothing; the plus next to it gives Shape or Size. Size gives me a
row 'Size 1' with a small database icon and a minus. So size is a constant, 1. On a measure row
I expected size to come FROM the measure -- that is the whole point of putting it on this row.
The database icon presumably means 'take it from a column', but I could not find out what it is
called; hovering gave me nothing useful. I am not going to guess at an unlabeled icon. Giving up
on size."

## Step 8 -- fine, let betweenness take the color

```
timeout 120 node app-b/study.mjs --try $D/13.png ... --click "Betweenness" --click "Move above"
timeout 120 node app-b/study.mjs --try $D/14.png ... --click "Betweenness" --click "Move above" --click "Show"
```

"'Moved Betweenness above PageRank', with Undo. The panel now says it covers PageRank for Color.
But the list did not move -- Betweenness is still at the bottom -- and the drawing and the legend
still say PageRank. I unhide it with the eye: still PageRank colors, still the PageRank legend.
So the panel tells me one thing and the picture shows another. That is the kind of thing that
makes me stop trusting a tool: a message that says it did something I cannot see."

"That is two unexplained failures: the run that never finishes, and the reorder that the drawing
ignores. Normally I would stop here. I will finish the task with what is on screen, which is
PageRank, because the legend names it and I can defend 'PageRank, damping 0.85, weighted by
value' -- the Analyze list showed me those settings under Recent."

**Part 2 and 3, partly:** "The drawing shows a computed result in its colors -- PageRank, with a
legend. But I did not make that happen; it was preloaded. My own run did nothing visible."

## Step 9 -- names on every character

```
timeout 120 node app-b/study.mjs --try $D/15.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything"
timeout 120 node app-b/study.mjs --try $D/16.png ... --click "Everything" --click "Add to Label"
timeout 120 node app-b/study.mjs --try $D/17.png ... --click "Everything" --click "Add to Label" --click "Show labels"
timeout 120 node app-b/study.mjs --try $D/18.png ... --click "Everything" --click "Add to Label" --click "Show labels" --click "Show labels"
```

"There is a 'Labels shown anyway, 1 node' row -- I do not know what that means and skip it. The
bottom row 'Everything, Built-in row' looks like the default style for all nodes: gray 808080,
faceted sphere, size 1. Label plus, 'Show labels', tick the box. The checkbox is ticked. The
drawing has the same dozen names it had before. Nothing changed and nothing told me why."

## Step 10 -- export

```
timeout 120 node app-b/study.mjs --try $D/19.png ... --hover "Menu"
timeout 120 node app-b/study.mjs --try $D/20.png ... --click "Main menu"
timeout 120 node app-b/study.mjs --try $D/21.png ... --click "Main menu" --click "Export..."
timeout 120 node app-b/study.mjs --try $D/22.png ... --click "Export..." --click "show list"
timeout 120 node app-b/study.mjs --try $D/23.png ... --click "Export..." --click "Format"
timeout 120 node app-b/study.mjs --try $D/24.png ... --click "Export..." --click "Export"
```

"Main menu: Export, Ctrl+E. The export dialog: Image, Video, Report, Recipe, Data. Image .png,
'Full graph, with the legend', and a preview. And here, finally: '64 labels hidden to avoid
overlap: show list.' So that is why ticking the box did nothing on screen -- 13 of 77 names fit,
the rest are suppressed. The list shows Thenardier degree 16, Joly degree 12, Mabeuf degree 11 --
those are not minor characters. I would want 'label all anyway' or 'label the top N', and I want
this sentence ON THE CANVAS when I tick the box, not hidden in the export dialog."

"Format says PNG. I tried to open it to look for SVG; it did not open for me. For a stakeholder
slide I would rather have SVG. PNG at 2x, 1,802 x 1,638, 'saved to this computer only, nothing is
uploaded'. Export."

"'Exported les-miserables.png to Downloads.'"

**Part 5 done: a PNG file exists.** **Part 4 not done:** "only 13 names are on it."

## Verdict

**Did I succeed?** "Partly. I have a picture file with the network colored by PageRank, a legend
that names the measure and its range, and thirteen names. But the measure was put there before I
arrived; the one I ran myself never finished; moving it above PageRank said it worked and changed
nothing; I could not tie size to it; and most of the names are missing, which I only learned in
the export dialog. If my manager asked 'which measure is this and did you compute it', I could
answer the first half."

**Single Ease Question:** 3 of 7.

**Would I use this instead of my current tool?** "Not for my work. There is still no way to give
it Turtle or point it at an endpoint, so for the knowledge graph it is 'not for RDF' until it
can. For a quick stakeholder picture from a small CSV, maybe -- the summary panel is honest
(nodes versus edges labelled, 'each a distinct pair', components counted) and the Betweenness
form telling me it uses 1/value as distance is better than Gephi. But a tool that tells me it
did something and then shows me something else loses me faster than one that just says no. I
would go back to SPARQL and diagrams.net for anything I have to defend."

## Problems seen (in her words, ranked)

1. Ran Betweenness: a new row spins forever, its panel never opens, nothing says whether it is
   stuck or finished.
2. "Moved Betweenness above PageRank" toast and panel text, but the list order, the drawing and
   the legend all stay on PageRank, even after unhiding it.
3. "Show labels" checkbox ticked with no visible change; the reason (64 labels hidden for
   overlap) appears only inside the export dialog, and there is no way to force all names.
4. Size on a measure row starts as a constant "1"; the icon that presumably binds it to the
   measure has no discoverable name.
5. The sample arrives with every step already done, so the task's "have the program work it
   out" step is answered before the user acts -- it hides whether the user can do it.
6. Format dropdown in export did not open; could not check for SVG.
7. After export the right panel jumped from "Everything" to "PageRank" without being asked.
8. "Labels shown anyway, 1 node" row means nothing to a newcomer.

## What she credited

- "Files are read on this computer and never uploaded" on the start screen and in export.
- The graph summary: nodes and edges labelled as such, "each a distinct pair", connected
  components, degree distribution on log-log axes.
- The Analyze list names each centrality and says in one line what it means.
- The Betweenness form states "reads a weight as distance: it uses 1/value" and that all 254
  edges carry the weight.
- "Covered by PageRank for Color ... none visible" explains why a layer is not seen.
- Export states exactly how many labels it dropped and lists them with their degree.
