# Session: first sitting with the Les Miserables sample -- Joaquin (Gene Ontology Cytoscape user)

Task as given: get the Les Miserables network on screen, have the program work out something
about the characters, make the drawing show that result in colors or sizes, get the names on the
drawing, finish with a picture file for a document. Say when each part is done.

All commands were run from `design/ui/prototype`. `D` stands for
`$PWD/tmp/round-8-sessions/r8-t01--gene-ontology-cytoscape-user`. Every `--try` replays from the
start screen.

## 01 -- start screen (shots/tasks/r8-t01/01.png)

Start, Recent projects, Samples. Les Miserables, 77 characters, "opens with worked examples:
measures, groups, paths and notes already added". A usage-data banner at the bottom. I don't share
usage data from my work machine by reflex.

## 02 -- open the sample

    node app-b/study.mjs --try $D/02.png task:r8-t01 --click "No thanks" --click "Les Miserables"

Network is on screen, colored orange to brown, a legend in the corner says "Color: PageRank
0.00330 to 0.0754", some names written on it. **Part 1 done.**

But it's already crowded: on the left there's a long list -- PageRank, Louvain 6 groups, Shortest
paths, Density, Link prediction, Top 9 by degree, Watchlist, a "For the report" folder, a hidden
Betweenness. I didn't do any of that. The task says *I* should have the program work something
out, so I'm going to run something myself rather than claim somebody else's PageRank.

## 03-04 -- find where analysis lives

    node app-b/study.mjs --try $D/03.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    node app-b/study.mjs --try $D/04.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze"

The flask icon at the bottom is "Analyze Shift+A". A searchable list: Recent (Louvain, PageRank,
Shortest path), then "Rank nodes and edges": PageRank ("Start here"), Degree, Total value,
Betweenness, Closeness, Eigenvector. One-line descriptions of each. That's a better entry point than
NetworkAnalyzer in Cytoscape. I'll do Betweenness -- that's what I'd normally report as "who
bridges the groups".

## 05 -- Betweenness settings

    node app-b/study.mjs --try $D/05.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Betweenness Which nodes sit on the most"

(First try with just "Betweenness" hit the hidden row in the list behind the dialog and timed out.)

Weight: value (loaded weight). "Higher means: Stronger / Farther / Capacity" with an explanation,
and "Betweenness reads a weight as distance: it uses 1/value." Good. That's a sentence I can paste
into a methods section, and most tools never tell you. "Under a second", Run.

## 06-08 -- run it; it never finishes

    node app-b/study.mjs --try $D/06.png ... --click "Run"
    node app-b/study.mjs --try $D/07.png ... --click "Run" --click "Betweenness 2"
    node app-b/study.mjs --try $D/08.png ... --click "Run" --hover "Betweenness 2"

A row "Betweenness 2" appears near the top with a spinner and a thin progress bar. Drawing
unchanged, legend still PageRank. I click the row: still spinning, the right panel doesn't even
switch to it. Hovering gives me "This name cannot be changed: a run is named by its algorithm..."
I didn't ask about the name. I asked "is it done?". It said under a second. This is exactly the
Cytoscape "is it hung?" feeling.

## 09 -- Escape makes it vanish

    node app-b/study.mjs --try $D/09.png ... --click "Run" --key Escape --key Escape

I pressed Escape to get out of whatever I was in. The Betweenness 2 row is *gone*, and a toast
says "Selection cleared (PageRank)". So did Escape cancel my run? Nothing says so. That's alarming
-- an Escape shouldn't silently throw away a computation.

## 10 -- run again, wait

    node app-b/study.mjs --try $D/10.png ... --click "Run" --hover "Analyze" --hover "Graph"

Same spinner, progress bar in the same place. I give up on my own run. **Part 2: not done by me.**

## 11-15 -- try the Betweenness that was already there

    node app-b/study.mjs --try $D/11.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Betweenness"
    node app-b/study.mjs --try $D/12.png ... --click "Betweenness" --click "Move above"
    node app-b/study.mjs --try $D/13.png ... --click "Move above" --hover "Show"
    node app-b/study.mjs --try $D/14.png ... --click "Move above" --click "Show Betweenness"
    node app-b/study.mjs --try $D/15.png ... --click "Show Betweenness" --click "PageRank" --click "Hide PageRank"

The old Betweenness row says "Covered by PageRank for Color" with a "Move above" button. That's a
clear explanation -- like ordering mappings. I click it: toast "Moved Betweenness above PageRank",
but in the list Betweenness is still at the bottom, below PageRank. The eye is crossed out, so I
"Show Betweenness". Panel now says it "Covers PageRank for Color", yellow to orange. The drawing:
the same orange-brown dots. Legend: still "Color: PageRank". I hide PageRank outright. Still the
same picture, same legend.

So the panel says one thing and the drawing shows another. At this point I stop trusting the panel.
**Part 3: I'm calling it done only because the drawing was already colored by PageRank when I
opened it.** Not what I'd call "I made it show my result".

## 16-22 -- names on the drawing

    node app-b/study.mjs --try $D/16.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Label"
    node app-b/study.mjs --try $D/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --hover "Add label"
    node app-b/study.mjs --try $D/17.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Labels shown anyway"
    node app-b/study.mjs --try $D/18.png task:r8-t01 --click "No thanks" --click "Les Miserables" --click "Everything"
    node app-b/study.mjs --try $D/19.png ... --click "Everything" --click "Label"
    node app-b/study.mjs --try $D/20.png ... --click "Everything" --hover "Add"   (and --hover "+")
    node app-b/study.mjs --try $D/20.png ... --click "Everything" --click "Add to Label"
    node app-b/study.mjs --try $D/21.png ... --click "Add to Label" --click "Show labels"
    node app-b/study.mjs --try $D/22.png ... --click "Show labels" --click "Show labels"

Clicking the word "Label" in the right panel does nothing. "Labels shown anyway (this file) 1 node"
in the left list just toasts "Valjean. Opens in the inspector (not available yet)". "Everything" at
the bottom is the default style (gray 808080, faceted sphere) -- that's where Cytoscape would put a
label mapping. The little plus next to Label has no tooltip when I rest on it; only by poking did I
learn it's "Add to Label". Its menu: "Label line", "Show labels". Picking "Show labels" adds an
*unticked* checkbox, which I then tick. Two steps for one wish.

After ticking: the drawing shows the same dozen names it showed before. Again no visible change.
**Part 4: done, I think.**

## 23-26 -- picture file

    node app-b/study.mjs --try $D/23.png ... --click "Show labels" --click "Show labels" --click "Main menu"
    node app-b/study.mjs --try $D/24.png ... --click "Main menu" --click "Export..."
    node app-b/study.mjs --try $D/25.png ... --click "Export..." --click "Print"
    node app-b/study.mjs --try $D/26.png ... --click "Print" --click "Export"

Main menu (top left) has Export... Ctrl+E. The export dialog finally explains my labels: "64 labels
hidden to avoid overlap: show list". So the checkbox worked; it just hides 64 of 77 names to stop
them colliding. I'd rather know that on the canvas than find out here, but I like that it says so --
Cytoscape just stacks them on top of each other. For a paper I'd want a way to say which names
win.

"Print" look shows the drawing side by side in gray "as a black-and-white print shows it", and
prints the legend's value at each gray step. That's genuinely useful; I check every figure in
grayscale by hand. It also confirms the colors are PageRank, not my Betweenness.

Export -> toast "Exported les-miserables.png to Downloads". **Part 5 done.**

## Verdict

**Did I succeed?** Partly. I have a PNG with the network colored by a centrality measure, a legend,
and some names. But the measure is the PageRank that came pre-loaded. My own Betweenness run spun
forever, vanished when I pressed Escape, and showing the old Betweenness changed nothing in the
drawing even though the panel said it was painting. If a student showed me this figure and said
"I computed betweenness", it would be wrong.

**Single Ease Question:** 3 of 7.

**Would I use this instead of Cytoscape?** Not yet. Things I'd take tomorrow: the Analyze list with
one-line descriptions, the stated weight convention ("uses 1/value"), "covered by X for Color", the
honest "64 labels hidden" count, and the grayscale print preview. What stops me: the drawing didn't
respond to anything I changed, so I can't tell which of the panel's claims are true; a run that
promises under a second and never ends; Escape that silently drops a run; an icon-only plus with no
tooltip for something as basic as labels. And a sample that opens with nine analyses already stacked
on it is confusing when I want to learn by doing one -- I couldn't tell my work from the worked
examples.
