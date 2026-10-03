# Session: first sitting with Les Miserables -- Dr. Chen (computational biologist)

Task as given by the moderator: get the Les Miserables sample on screen, have the program work out
something about the characters, make the drawing show that result in color or size, get the
characters' names on the drawing, and finish with a picture file for a document.

Every command was run from design/ui/prototype. `S` below stands for
`timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t01--bioinformatics-researcher/NN.png task:r8-t01`.
Renders are in tmp/round-8-sessions/r8-t01--bioinformatics-researcher/.

## Start screen (shots/tasks/r8-t01/01.png)

"Start, Recent projects, Samples. Fine. A banner wants usage data -- No thanks. 'Files are read on
this computer and never uploaded' -- good, that is the first thing I would ask. Les Miserables, 77
characters. Click."

## 1. Getting the network on screen

    S 01.png --click "No thanks" --click "Les Miserables"

"It is on screen. 77 nodes, 254 edges, undirected, weight 'value, stronger' -- I can check that.
But it opened with everything already done: PageRank coloring, Louvain six groups, shortest paths,
a watchlist, 'For the report'. That is someone else's analysis. I came to do my own. I'll ignore
their rows and run something myself."

**Part one done** -- the network is on screen.

## 2. Having the program work something out

    S 02.png ... --hover "Analyze"        (tooltip: "Analyze Shift+A")
    S 03.png ... --click "Analyze"

"A flask icon, Analyze. The list: PageRank, Degree, Total value, Betweenness, Closeness,
Eigenvector, each with one line of description. Good. I don't trust degree; I'll take betweenness."

    S 04.png ... --click "Analyze" --click "Betweenness Which nodes sit on the most"

"This I like: weight = value, 'higher means stronger', and it tells me betweenness reads the weight
as a distance, 1/value. That is the sentence I would put in a methods section. 'Under a second.'
Run."

    S 05.png ... --click "Run"
    S 06.png ... --click "Run" --click "Betweenness 2"
    S 07.png ... --hover "Betweenness 2" --click "More actions"
    S 08.png ... --click "Run" --key Escape --click "Betweenness 2"

"A row 'Betweenness 2' with a spinner and a progress line. It said under a second. It is still
spinning. Clicking the row shows me nothing -- the right panel stays on the graph summary. The
tooltip only tells me I can't rename it. Then I opened a menu and the Betweenness 2 row was gone
from the list altogether. So did it run or not? I have no number. That is exactly the 'null' error
experience. I'll try something else."

    S 09.png ... --click "Analyze" --click "Louvain Last run"
    S 10.png ... --click "Update Louvain row"

"Louvain, resolution 1.0, same weight explanation. Update the existing row. 'Updated just now: 6
communities, the same as before.' Modularity 0.565, seed 7, data version miserables.gexf. That is
honest, and the seed is shown. Though the menu later admits there is no null-model or
seed-stability check -- at least it says so instead of hiding it."

**Part two done** (Louvain, rerun by me). Betweenness I could not confirm.

## 3. Making the drawing show it

"The drawing is still the orange-brown PageRank ramp. The legend says Color: PageRank."

    S 11.png ... --click "Style"

"'Covered by PageRank for Color on 77 of 77.' So the communities are painted, just underneath. Clear
enough. I need PageRank out of the way."

    S 12.png ... --hover "PageRank" --hover "Hide"
    S 13.png ... --click "PageRank" --click "Hide PageRank"
    S 15.png ... --click "Hide PageRank" --click "Louvain, 1 note"

"I hid PageRank -- the eye is struck through. The nodes are still orange. The legend still says
PageRank. The Louvain inspector still says covered by PageRank. And now it says 'Run from Louvain,
Sep 28' -- a minute ago it said 'just now'. Which is it? Either hiding does nothing or the panel is
stale."

    S 16/16b/18/18b.png  (looking for a row menu; found the command palette by accident)
    S 17.png ... --click "Louvain comm"
    S 19.png ... --click "Run as copy"     ("Would add Louvain as a copy..." -- nothing happened)
    S 21.png ... --click "Options for PageRank"
    S 22.png ... --click "Options for Louvain"
    S 23.png ... --click "Restore the suggested look"   ("not available yet")
    S 24.png ... --click "Options for Louvain" --click "Show only this row"

"There is no 'move up' or 'bring to front' anywhere. 'Show only this row' is the only thing that
worked: now the legend says Color: Louvain, six communities with counts, and the drawing is in six
colors. Done -- but wait. The panel says Community 2's hub is Valjean, light blue. Valjean's dot in
the middle is orange, the Community 1 color. Gavroche is listed as hub of Community 1, orange, and
his dot is light blue. The legend and the drawing disagree. If I put that in a figure, Reviewer 2
has me."

    S 38.png ... --click "Show only this row" --click "Main menu"

"And I opened the main menu to export, and the drawing went back to PageRank. The Show-only state
is gone."

**Part three: I got community colors for a moment, then lost them.** In the end I settled for PageRank
coloring, which I re-ran myself:

    S 42.png ... --click "Analyze" --click "PageRank Last run"
    S 43.png ... --click "Update PageRank row"

"Damping 0.85, weight value. Top 10 with values to four places: Valjean 0.0754, Myriel 0.0428 ...
That is fine. But 'Ran Sep 28' -- I just pressed Update. Louvain said 'just now'; PageRank says
Sep 28. I can't tell whether it ran."

## 4. Names on the drawing

    S 25.png ... --click "Labels show"      ("Labels shown anyway (this file): Valjean ... not available yet")
    S 26-29.png  (Louvain Style > Label; nothing reachable)
    S 30.png ... --click "Everything"
    S 32.png ... --hover "Add"               ("Add to Effects")
    S 33.png ... --click "Add to Label"     (menu: Label line, Show labels)
    S 34/35.png ... --click "Show labels" --click "Show labels"
    S 37.png ... --click "Show all"
    S 48.png --click "Add to Label" --click "Show labels" --click "Show labels"   (on the PageRank row)

"About thirteen names are on the drawing from the start. I found 'Show labels' under Label on the
Everything row and on the PageRank row, ticked it, and nothing changed -- the same thirteen. The
export dialog later told me why: '64 labels hidden to avoid overlap', with a list. That sentence
should be on the canvas, next to the checkbox I ticked. I never found how to say 'all of them,
overlap or not'."

**Part four: not done.** 13 of 77 names.

## 5. A picture file

    S 39.png ... --click "Main menu" --click "Export..."
    S 40.png ... --click "show list"
    S 41.png ... --click "Print"
    S 45.png ... --click "PNG"
    S 46.png ... --click "PNG" --click "SVG"
    S 47.png ... --click "SVG" --click "Export"

"Export: Image, full graph with the legend. 'Print' shows me the figure in gray next to the color
one and prints the gray steps in the legend -- that is the most useful thing I've seen today; nobody
does that. Format list has SVG: 'Vector, sharp at any size.' Export. 'Exported les-miserables.svg to
Downloads.'"

**Part five done** -- an SVG with legend, PageRank colors, 13 names.

## Verdict

Did I succeed? Partly. I have a file, a result I re-ran, and colors from a measure. I did not get the
communities into the final figure, and I did not get the names on. I also have one run
(betweenness) I can't account for.

Single Ease Question: 3 of 7.

Would I use this instead of my current tool? Not instead -- not yet. The parameter disclosure is
better than Cytoscape: weight direction, 1/value for distances, seed, modularity, data version, and
the grayscale print preview. Those I would show a student. But the drawing disagreed with its own
legend about who is in which community, a run showed a spinner and then vanished, 'Ran Sep 28'
after I pressed Update, and hiding a layer did not change the picture. Any one of those I can't
defend to a reviewer. And I still don't know whether I can drive it from R or get the node table
out as a TSV -- I saw an Export > Data entry but didn't get to it. For now: igraph for the numbers,
maybe this for a look.
