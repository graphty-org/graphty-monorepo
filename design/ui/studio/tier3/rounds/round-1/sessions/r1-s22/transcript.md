# Session r1-s22 -- Grace (nonprofit operations analyst), first-time user

Task: bring in sources.graphml, find clusters of sources that deal with one another (each cluster its own color), then keep the cluster color only on sources who agreed to speak on the record; everyone else looks as when the file first opened. Report how many sources still have a cluster color.

## Step 0 -- start

Command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../design/ui/studio/tool/real.mjs --start .../r1-s22 empty

Note: the start command took more than two minutes before the first screenshot appeared.

01.png: landing page. Big green "Open a file", and "It never leaves your computer" -- good, that is what I look for with names.

## Step 1
Thought: Okay, what do I click. "Open a file" it is.
Command: --step --click "Open a file" --upload sources.graphml
Result 02.png: an "Open as a new graph" preview. "sources: 24 nodes, 59 edges". 24 rows -- matches the 24 people and organizations. Columns: id, name, kind, donations, on_record (Yes/No), email. on_record is the column I need later. Load button bottom right.

## Step 2
Thought: 24 rows, 59 links -- that's everyone. Load.
Command: --step --click "Load"
Result 03.png: the graph, all dots the same blue-purple, no names on them. Right panel: Nodes 24, Edges 59 -- matches my count. I can already see three groups by eye. Left: "Style layers" (Hovered, Selected, Everything). Bottom toolbar of icons with no words; the first looks like a lab flask. A notice says the browser may clear what it keeps -- save a copy.

## Step 3
Thought: the flask probably means analyze.
Command: --step --click-at 615,863  (it was the "Analyze" button)
Result 04.png: a list "Rank nodes and edges" -- Degree, Betweenness, Eigenvector, Katz... Nice: each has one plain line under it ("How many edges each node has: the most connected rank highest"). There is a "Filter analyses" box on top.

## Step 4
Thought: type "cluster" in the filter.
Command: --step --type "cluster"
Result 05.png: "Clustering coefficient" (a ranking, not what I want) and a section "Find groups": Louvain, Leiden, Label propagation, Markov clustering, Spectral, Hierarchical. Names are jargon but the lines under them are plain. Louvain: "Which nodes form densely linked groups." That is "who deals with one another".

## Step 5
Command: --step --click "Louvain"
Result 06.png: Louvain settings: Resolution 1, Weight None, "Under a second", Run. I don't know what Resolution is; leaving defaults.

## Step 6
Command: --step --click "Run"
Result 07.png: three groups colored (orange Group 1, light blue Group 2, green Group 3), legend top left "Color: Louvain". A new "Louvain" folder in Style layers between Selected and Everything. First half done. Now I need only on_record = Yes to keep the color.

## Step 7
Command: --step --click-at 118,216  (the "Louvain, folder, 3 layers" row)
Result 08.png: right panel shows the Louvain folder: "3 layers in Louvain", Node tab, "Style nodes" checked, "Which nodes  24 of 24 nodes" collapsed with a chip "Louvain: <<Layer>>", Fill Color "<<Layer>>". "<<Layer>>" is a strange word. "Which nodes" is the plain thing I want to narrow.

## Step 8
Command: --step --click "Which nodes"
Result 09.png: "Which nodes: Nodes that pass every condition", one condition box "Louvain <<Layer>> 3 layers, Group 1, Group 2, Group 3", then "+ Add a condition" and Done. Plain enough -- like a filter in Excel.

## Step 9
Command: --step --click "Add a condition"
Result 10.png: a list of my columns: name, kind (3 values), donations (0 to 250,000), on_record (2 values), email; and Results: Louvain (already a condition). Good, these are my spreadsheet headers.

## Step 10
Command: --step --click "on_record"
Result 11.png: a second condition "on_record = Yes  12 nodes" (it chose Yes for me, which is what I wanted). Which nodes now "12 of 24 nodes"; the legend also says "12 of 24 nodes". The others went back to the original blue-purple. I count 11 colored dots on screen (3 green, 4 light blue, 4 orange); one green spot is probably under the legend box, which covers the top of the green group.

## Step 11
Command: --step --click "Done"
Result 12.png: the conditions fold into two chips: "Louvain: <<Layer>>" and "on_record: yes, 12 nodes"; "Which nodes 12 of 24 nodes". Legend says "12 of 24 nodes". Everyone not on the record is back to the blue-purple they had when the file opened. That's the job.

## End (in character, Grace)

Did I finish? Yes. 12 sources still have a cluster color (the 12 with on_record = Yes), out of 24. The program said "12 of 24 nodes" in two places, and the on_record column in the preview had Yes/No, so I believe it.

Ease: 6 out of 7.

What went well: "Open a file" was the obvious door, and "It never leaves your computer" was right there -- that matters with names. The preview counted my rows (24 and 59) before I loaded. In the analysis list every jargon name (Louvain, Leiden, Eigenvector) had a plain line under it, and typing "cluster" in the filter found a "Find groups" section. "Which nodes" with "Add a condition" felt like an Excel filter, and it showed my own column names and picked "Yes" for me.

What confused me:
- The bottom toolbar is icons with no words; I guessed the flask meant analyze.
- "Louvain" and "Resolution" mean nothing to me; I just trusted the defaults. I would not put "Louvain" on a slide -- the legend title says "Color: Louvain"; "Groups" would be plainer.
- "<<Layer>>" in the color box and the chip is a word I don't understand.
- I had to know to click the "Louvain" folder in Style layers to find where to narrow it down; nothing after Run pointed me there.
- The legend box sits over the top of the green group, so I could only count 11 colored dots on the picture, not 12; I had to trust the "12 of 24" number.
- No names on the dots, so I can't tell who is who from the picture alone (not needed for this task, but it would be for a slide).
- Starting took a couple of minutes before the first screen appeared.
