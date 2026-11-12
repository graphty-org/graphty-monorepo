# Session r3-s01 -- Morgan Reyes (screen-reader analyst), task T15 prompt A (Les Miserables)

Started in screen-reader mode from an empty app: pointer steps are refused, only keys, typing, reading and uploads.

```
node design/ui/studio/tool/real.mjs --start design/ui/studio/rounds/round-3/sessions/r3-s01 empty --sr
focus: nothing (the page itself)
commit f108a235091e81cd23687ecc4c0b2370490a6498, build b7590f8de22b graphty@0.8.53
```

Morgan: Page loaded and the reader says nothing focused. I don't know the title yet. First I tab to learn what is here.

### Step (screenshot 02.png)

Morgan: Nothing has focus. Before tabbing, I read the page in browse mode to hear the headings and what the page offers.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: button "Main menu"
read: heading level 1 "graphty"
read: button "Local only"
read: heading level 2 "Start"
read: button "Open project or file... Ctrl+O"
read: button "New from data..."
read: or drop a file anywhere in this window Files are read on this computer and never uploaded.
read: heading level 2 "Recent projects"
read: Projects you save appear here. They are kept in this browser.
read: heading level 2 "Samples"
read: button "Open the Les Miserables sample"
read: button "Open the Zachary's karate club sample"
read: button "Open the College football sample"
read: button "Open the Florentine families sample"
read: Your data is yours, but please help us. We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions. What is collected Nothing is collected until you answer.
read: button "Share usage data"
read: button "No thanks"
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 03.png)

Morgan: Headings, named buttons, and it says files stay on this computer. Good start. There is a usage-data question; I will decline it. I press Tab to learn where focus starts.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 04.png)

Morgan: Main menu first. I keep tabbing toward the samples, listening to each stop.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab
focus: button "Local only"
focus: button "Open project or file... Ctrl+O"
focus: button "New from data..."
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 05.png)

Morgan: Tab order matches reading order. Before opening anything I want the usage question answered, so I tab on to No thanks and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Open the Zachary's karate club sample"
focus: button "Open the College football sample"
focus: button "Open the Florentine families sample"
focus: DisclosureTriangle "What is collected"
focus: button "Share usage data"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 06.png)

Morgan: One more Tab to No thanks, then Enter. I want to hear where focus lands afterward.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Enter
focus: button "No thanks"
focus: nothing (the page itself)
live: status (polite): "Usage data stays off. Change this in Settings > Privacy" -- unconfirmed: the region arrived with this text already in it, which many screen readers do not read
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 07.png)

Morgan: Focus fell to nothing after No thanks -- I lost my place, and the confirmation may not even be spoken. Annoying. I Tab again from the top to reach the Les Miserables sample.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab
focus: button "Change this in Settings > Privacy"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 08.png)

Morgan: Focus restarted somewhere at the bottom. Shift+Tab back up to the Les Miserables sample button and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: button "Open the Florentine families sample"
focus: button "Open the College football sample"
focus: button "Open the Zachary's karate club sample"
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 09.png)

Morgan: Shift+Tab reverses cleanly. On the Les Miserables sample now; pressing Enter and listening for how big it is.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Enter --wait 3000
focus: nothing (the page itself)
live: status (polite): "Les Miserables: 77 nodes, 254 edges"
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 10.png)

Morgan: It told me once: 77 nodes, 254 edges. Good. Focus dropped to nothing again though. I read the page to learn its new structure.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: button "Main menu"
read: button "Project: Les Miserables"
read: button "Undo"
read: button "Redo" disabled
read: button "Local only"
read: button "Graph"
read: button "Data"
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Everything"
read: Analyze in the toolbar ( Shift+A ) to add results here
read: button "Analyze"
read: button "Layout"
read: button "View"
read: button "Quick actions"
read: Les Miserables: 77 nodes, 254 edges Graph
read: button "From Les Miserables"
read: button "Graph actions"
read: tab "Style"
read: tab "Values" selected
read: button "Collapse Overview" expanded
read: Nodes 77 Edges 254 Direction Undirected, from the file: directed 0 Density 0.08681 Components 1 Edges per node 1 to 36, mean 6.597
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 11.png)

Morgan: An overview: 77 nodes, 254 edges, undirected, one component, density. That is the summary I wanted first. No headings in this view, though -- H would find nothing. Graph part done. The page hints Analyze is Shift+A; I'll use that to find which characters matter most.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+A
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 12.png)

Morgan: A filter box for analyses, expanded. I read what it offers before typing.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: dialog "Analyze":
read: combobox "Filter analyses" expanded
read: Rank nodes and edges
read: option "Degree How many edges each node has."
read: option "Betweenness Which nodes sit on the most shortest paths between others."
read: option "Edge betweenness Which edges carry the most shortest paths between nodes."
read: option "Closeness Which nodes are, on average, nearest to all the others."
read: option "PageRank Start here Which nodes are connected to other well-connected nodes."
read: option "Eigenvector Which nodes are tied to other central nodes."
read: option "Katz Which nodes reach many others by short walks."
read: option "HITS Which nodes point to good sources, and which are pointed to."
read: option "All-pairs distance How far each node is from all the others."
read: option "Depth-first order Select a node first" disabled
read: option "Most flow Select 2 nodes first" disabled
read: option "Core number How deep in the dense core of the graph each node sits."
read: option "Clustering coefficient How many of each node's neighbors are tied to each other."
read: Find groups
read: option "Louvain Start here Which nodes form densely linked groups."
read: option "Leiden Densely linked groups, each kept in one connected piece."
read: option "Label propagation Groups found by letting neighbors vote on a label."
read: option "Girvan-Newman The groups left after removing the busiest edges."
read: option "Markov clustering Groups where flow along the edges gets trapped."
read: option "Spectral clustering The nodes split into a chosen number of groups."
read: option "Hierarchical clustering Groups built by merging the closest nodes until a chosen number remain."
read: option "Connected components Which parts of the graph are cut off from each other."
read: option "Steps away Select a node first" disabled
read: Find paths and edge sets
read: option "Shortest path Start here Select 2 nodes first" disabled
read: option "Guided route Select 2 nodes first" disabled
read: option "Minimum spanning tree The lightest set of edges that still joins every node."
read: option "Spanning tree from a node Select a node first" disabled
read: option "Bipartite matching The most edges pairing one side with the other."
read: option "Weakest cut Select 2 nodes first" disabled
read: option "Link prediction Which missing edges the shared neighbors suggest."
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 13.png)

Morgan: A real list with groups and one-line definitions, important word first. For 'who matters most' in a character network I want betweenness -- who holds the story together. I type to filter, then arrow down to it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --type betw --key ArrowDown
focus: combobox "Filter analyses" value "betw" expanded; highlighted: option "Betweenness Which nodes sit on the most shortest paths between others." selected
focus: combobox "Filter analyses" value "betw" expanded; highlighted: option "Edge betweenness Which edges carry the most shortest paths between nodes." selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 14.png)

Morgan: ArrowDown went past Betweenness to Edge betweenness -- the first match was already highlighted. I go back up one and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowUp --key Enter --wait 2000
focus: combobox "Filter analyses" value "betw" expanded; highlighted: option "Betweenness Which nodes sit on the most shortest paths between others." selected
focus: button "Run"
focus: button "Run"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 15.png)

Morgan: Focus is on Run. Before running, I read the dialog: I want the settings -- normalized or not, weighted or not.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: form "Betweenness":
read: button "Back to analyses"
read: Betweenness Which nodes sit on the most shortest paths between others.
read: button "Expand Advanced"
read: Under a second
read: button "Run"
focus: button "Run"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 16.png)

Morgan: Settings hidden under Advanced. I Shift+Tab to Expand Advanced, open it and read.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Enter --read
focus: button "Expand Advanced"
focus: button "Collapse Advanced" expanded
read: form "Betweenness":
read: button "Back to analyses"
read: Betweenness Which nodes sit on the most shortest paths between others.
read: button "Collapse Advanced" expanded
read: Sample size
read: spinbutton "Sample size" value "1"
read: Under a second
read: button "Run"
focus: button "Collapse Advanced" expanded
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 17.png)

Morgan: Only one setting: 'Sample size', value 1, with no explanation. Sample of what? One sampled source would make betweenness close to meaningless. Nothing about normalization or weights. Suspicious, but I'll run it and judge the numbers. Tab to Run, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Enter --wait 3000
focus: spinbutton "Sample size" value "1"
focus: button "Run"
focus: button "Analyze"
live: status (polite): "Betweenness added, running"
live: status (polite): "Betweenness finished"
focus: button "Analyze"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 18.png)

Morgan: Two short announcements, added then finished, and focus came back to Analyze. Good. Now where is the answer? I read around here.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: main "Graph":
read: Color: Betweenness
read: image "Color: Betweenness 0 1624"
read: button "Analyze"
read: button "Layout"
read: button "View"
read: button "Quick actions"
read: Betweenness finished
focus: button "Analyze"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 19.png)

Morgan: The drawing is now colored by betweenness, 0 to 1624. NetworkX gives Valjean 0.570 normalized; 0.570 times 2850 pairs is about 1624, so these are raw counts -- matches, but the tool never said 'raw'. The color legend is told to me in words, which is good. I need the ranked list. Shift+Tab back toward the panel that said results go there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: Canvas "Graph drawing"
focus: separator "Resize left panel" value "240"
focus: button "Hide Betweenness"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 20.png)

Morgan: There is a Betweenness entry in the left panel now. Shift+Tab once more onto the entry itself and read the panel.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --read
focus: treeitem "Selection"
read: region "Graph place":
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Betweenness"
read: treeitem "Everything"
focus: treeitem "Selection"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 21.png)

Morgan: A tree: Selection, Betweenness, Everything. ArrowDown to Betweenness and Enter to open it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowDown --key Enter --wait 1000
focus: treeitem "Betweenness"
focus: treeitem "Betweenness" selected
focus: treeitem "Betweenness" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 22.png)

Morgan: Selected, but nothing told me what changed. I Tab forward to find out where the result opened.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab
focus: button "Hide Betweenness"
focus: separator "Resize left panel" value "240"
focus: Canvas "Graph drawing"
focus: button "Analyze"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 23.png)

Morgan: Back in the toolbar. The right side had Style and Values tabs earlier. I keep tabbing toward it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "from Betweenness, Oct 7"
focus: button "Measure actions"
focus: tab "Style" selected
focus: radio "Nodes, set" checked
focus: button "Add Opacity"
focus: button "Betweenness, Color"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 24.png)

Morgan: Now in a Style tab for Betweenness, with a 'Betweenness, Color' item and 'Add Opacity'. This looks like where sizes would go. I read the whole panel.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: complementary "Inspector":
read: Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Betweenness, Color"
read: button "Detach Color"
read: button "Remove Color"
read: Shape
read: button "Add to Shape"
read: Effects
read: button "Add to Effects"
read: button "Label"
read: button "Add label line"
read: Tooltip
read: button "Add Tooltip"
focus: button "Betweenness, Color"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 25.png)

Morgan: Color, Shape, Effects, Label, Tooltip. Size is probably under Shape. But first I want the ranked numbers: back to the tab list, ArrowRight to Values.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key ArrowRight --wait 500
focus: button "Add Opacity"
focus: radio "Nodes, set" checked
focus: tab "Style" selected
focus: button "Measure actions"
focus: button "Measure actions"
focus: button "Measure actions"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 26.png)

Morgan: Overshot by one onto Measure actions. Tab forward to the Style tab, then ArrowRight to Values.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key ArrowRight --wait 500 --read
focus: tab "Style" selected
focus: tab "Values" selected
focus: tab "Values" selected
read: complementary "Inspector":
read: Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style"
read: tab "Values" selected
read: button "Collapse Values" expanded
read: image "Betweenness"
read: 0 1,624 Betweenness
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: row (no name)
read: 77 of 77 have a value, 0 to 1,624, median 0
read: button "Collapse Top 10" expanded
read: button "Valjean 1,624"
read: button "Myriel 504"
read: button "Gavroche 470.6"
read: button "Marius 376.3"
read: button "Fantine 369.5"
read: button "Thenardier 213.5"
read: button "Javert 154.8"
read: button "MlleGillenormand 135.7"
read: button "Enjolras 121.3"
read: button "Tholomyes 115.8"
read: button "Collapse Made with" expanded
read: Analysis Betweenness Ran Oct 7
read: button "Expand Advanced"
focus: tab "Values" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 27.png)

Morgan: Twenty 'row, no name' items -- a picture that talks to me as noise. But then real text: 77 of 77 have a value, 0 to 1,624, median 0, and a Top 10: Valjean 1,624, Myriel 504, Gavroche 470.6, Marius 376.3, Fantine 369.5. Those match NetworkX's normalized values times 2850, so raw betweenness. The 'who matters most' part is done -- but nothing on screen says unnormalized. Now sizes: back to Style, then Add to Shape.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowLeft --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: tab "Style" selected
focus: radio "Nodes, set" checked
focus: button "Add Opacity"
focus: button "Betweenness, Color"
focus: button "Detach Color"
focus: button "Remove Color"
focus: button "Add to Shape"
focus: button "Add to Effects"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 28.png)

Morgan: One too far. Shift+Tab to Add to Shape and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Enter --wait 500 --read
focus: button "Add to Shape"
focus: menuitem "Size"
focus: menuitem "Size"
read: button "Main menu"
read: button "Project: Les Miserables"
read: button "Undo"
read: button "Redo" disabled
read: button "Local only"
read: button "Graph"
read: button "Data"
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Betweenness" selected
read: treeitem "Everything"
read: Color: Betweenness
read: image "Color: Betweenness 0 1624"
read: button "Analyze"
read: button "Layout"
read: button "View"
read: button "Quick actions"
read: Betweenness finished Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Betweenness, Color"
read: button "Detach Color"
read: button "Remove Color"
read: Shape
read: button "Add to Shape"
read: Effects
read: button "Add to Effects"
read: button "Label"
read: button "Add label line"
read: Tooltip
read: button "Add Tooltip"
read: menuitem "Size"
read: menuitem "Shape"
focus: menuitem "Size"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 29.png)

Morgan: A menu: Size, Shape. Focus is on Size. Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Enter --wait 1000
focus: combobox "Find an attribute" expanded; highlighted: option "Fixed size" selected
focus: combobox "Find an attribute" expanded; highlighted: option "Fixed size" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 30.png)

Morgan: It asks which attribute drives the size; Fixed size is highlighted. I type betw to find Betweenness.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --type betw
focus: combobox "Find an attribute" value "betw" expanded; highlighted: option "Betweenness" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 31.png)

Morgan: Betweenness highlighted. Enter, and listen for what happens to focus.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Enter --wait 1500
focus: button "1 to 3, variable Betweenness"
focus: button "1 to 3, variable Betweenness"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 32.png)

Morgan: Focus landed on '1 to 3, variable Betweenness'. Odd order -- I'd want Betweenness first -- but I think it means sizes now run 1 to 3 by betweenness. No announcement that anything changed. I read the Style panel to check.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: complementary "Inspector":
read: Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Betweenness, Color"
read: button "Detach Color"
read: button "Remove Color"
read: Shape
read: button "Add Shape"
read: Size
read: button "1 to 3, variable Betweenness"
read: button "Detach Size"
read: button "Remove Size"
read: Effects
read: button "Add to Effects"
read: button "Label"
read: button "Add label line"
read: Tooltip
read: button "Add Tooltip"
focus: button "1 to 3, variable Betweenness"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 33.png)

Morgan: Size is listed under Shape: 1 to 3 by Betweenness. Sizes part done, as far as text tells me. Next: names on the drawing. There is a 'Label' button and 'Add label line'. I tab to Label to hear what it is.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab
focus: button "Detach Size"
focus: button "Remove Size"
focus: button "Add to Effects"
focus: button "Label"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 34.png)

Morgan: Just 'Label, button' -- no state, so I can't tell if it is a toggle, a heading or a menu. The next one, 'Add label line', sounds like what I need. Tab, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Enter --wait 1000
focus: button "Add label line"
focus: combobox "Find an attribute" expanded; highlighted: option "id" selected
focus: combobox "Find an attribute" expanded; highlighted: option "id" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 35.png)

Morgan: It asks which attribute to write; 'id' is first. Is there a name attribute? I arrow down to hear the options.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowDown --key ArrowDown --key ArrowDown
focus: combobox "Find an attribute" expanded; highlighted: option "name" selected
focus: combobox "Find an attribute" expanded; highlighted: option "Betweenness" selected
focus: combobox "Find an attribute" expanded; highlighted: option "Betweenness rank" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 36.png)

Morgan: id, name, Betweenness, Betweenness rank. I want 'name'. Up two, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowUp --key ArrowUp --key Enter --wait 1500 --read
focus: combobox "Find an attribute" expanded; highlighted: option "Betweenness" selected
focus: combobox "Find an attribute" expanded; highlighted: option "name" selected
focus: button "Label position"
live: region (polite): "0 labels, 0 hidden" -- unconfirmed: the region arrived with this text already in it, which many screen readers do not read
focus: button "Label position"
live: region (polite): "77 labels, 7 hidden"
read: complementary "Inspector":
read: Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Betweenness, Color"
read: button "Detach Color"
read: button "Remove Color"
read: Shape
read: button "Add Shape"
read: Size
read: button "1 to 3, variable Betweenness"
read: button "Detach Size"
read: button "Remove Size"
read: Effects
read: button "Add to Effects"
read: button "Label" disabled
read: button "Add label line" disabled
read: button "Label position"
read: Above
read: button "Label, Above: name"
read: button "Remove label line"
read: 77 labels, 7 hidden
read: checkbox "Show all labels"
read: Tooltip
read: button "Add Tooltip"
focus: button "Label position"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 37.png)

Morgan: Labels are on: name, above the dots. It says 77 labels, 7 hidden -- I'd guess hidden because they overlap; it doesn't say which 7. There's a 'Show all labels' checkbox. For a picture I hand over, I want every name, so I tab to it and press Space.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Space --wait 1500
focus: button "Label, Above: name"
focus: button "Remove label line"
focus: checkbox "Show all labels"
focus: checkbox "Show all labels" checked
live: region (polite): "77 labels"
focus: checkbox "Show all labels" checked
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 37.png)

Morgan: '77 labels', checked. Names part done. Last part: a picture file with its key. I don't know where export lives. I press question mark to see if there is a keyboard shortcuts list.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Slash --wait 500
--key takes a key name such as Enter, Escape, ArrowDown, F2, a, or a chord such as Control+f; not "Shift+Slash"
(exit 2)
```

### Step (screenshot 38.png)

Morgan: Retrying the question mark key (the tool wanted it spelled differently).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ? --wait 500
focus: checkbox "Show all labels" checked
focus: checkbox "Show all labels" checked
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 39.png)

Morgan: Question mark did nothing from here, maybe because I'm on a checkbox. I'll walk back to the Main menu at the top with Shift+Tab -- export is usually in a file menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: button "Remove label line"
focus: button "Label, Above: name"
focus: button "Label position"
focus: button "Add label line" disabled
focus: button "Label" disabled
focus: button "Add to Effects"
focus: button "Remove Size"
focus: button "Detach Size"
focus: button "1 to 3, variable Betweenness"
focus: button "Add Shape"
focus: button "Remove Color"
focus: button "Detach Color"
focus: button "Betweenness, Color"
focus: button "Add Opacity"
focus: radio "Nodes, set" checked
focus: tab "Style" selected
focus: button "Measure actions"
focus: button "from Betweenness, Oct 7"
focus: button "Analyze"
focus: Canvas "Graph drawing"
focus: separator "Resize left panel" value "240"
focus: button "Hide Betweenness"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 40.png)

Morgan: Disabled 'Label' and 'Add label line' still take focus -- stops that do nothing. Continuing up to Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: treeitem "Betweenness" selected
focus: combobox "Find"
focus: button "Graph"
focus: button "Local only"
focus: button "Redo" disabled
focus: button "Undo"
focus: button "Project: Les Miserables"
focus: button "Main menu"
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 41.png)

Morgan: One too far, off the page's controls. Tab once to Main menu and open it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Enter --wait 500 --read
focus: button "Main menu"
focus: menuitem "Back to start"
focus: menuitem "Back to start"
read: button "Main menu"
read: button "Project: Les Miserables"
read: button "Undo"
read: button "Redo" disabled
read: button "Local only"
read: button "Graph"
read: button "Data"
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Betweenness" selected
read: treeitem "Everything"
read: Size: Betweenness
read: image "Size: Betweenness 0 1624"
read: Color: Betweenness
read: image "Color: Betweenness 0 1624"
read: button "Analyze"
read: button "Layout"
read: button "View"
read: button "Quick actions"
read: Betweenness finished Betweenness Measure
read: button "from Betweenness, Oct 7"
read: button "Measure actions"
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Betweenness, Color"
read: button "Detach Color"
read: button "Remove Color"
read: Shape
read: button "Add Shape"
read: Size
read: button "1 to 3, variable Betweenness"
read: button "Detach Size"
read: button "Remove Size"
read: Effects
read: button "Add to Effects"
read: button "Label" disabled
read: button "Add label line" disabled
read: button "Label position"
read: Above
read: button "Label, Above: name"
read: button "Remove label line"
read: 77 labels
read: checkbox "Show all labels" checked
read: Tooltip
read: button "Add Tooltip"
read: menuitem "Back to start"
read: menuitem "New project"
read: menuitem "Open project or file... Ctrl+O"
read: menuitem "Open sample"
read: menuitem "Save Ctrl+S"
read: menuitem "Save as... Shift+Ctrl+S"
read: menuitem "Save local copy..."
read: menuitem "Export... Ctrl+E"
read: menuitem "Rename F2"
read: menuitem "Settings... Ctrl+,"
read: menuitem "Keyboard shortcuts ?"
read: menuitem "Help"
focus: menuitem "Back to start"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 42.png)

Morgan: The menu reads cleanly with shortcuts: Export is Ctrl+E. Also the drawing now has a 'Size: Betweenness 0 to 1624' key next to the color key -- confirms sizes are applied. I arrow down to Export and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key Enter --wait 1000
focus: menuitem "New project"
focus: menuitem "Open project or file... Ctrl+O"
focus: menuitem "Open sample"
focus: menuitem "Save Ctrl+S"
focus: menuitem "Save as... Shift+Ctrl+S"
focus: menuitem "Save local copy..."
focus: menuitem "Export... Ctrl+E"
focus: button "Close"
focus: button "Close"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 43.png)

Morgan: A dialog opened with focus on Close. I read the dialog.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: dialog "Export":
read: heading level 2 "Export"
read: button "Close"
read: row "Image"
read: row "Data"
read: heading level 3 "Image"
read: A picture of the drawing, 2x , PNG Preset
read: combobox "Preset" value "To share -- PNG, 2x"
read: View
read: combobox "View" value "Current view"
read: Size
read: radio "1x"
read: 1x
read: radio "2x" checked
read: 2x
read: radio "4x"
read: 4x
read: radio "400 x 300"
read: 400 x 300 Format
read: radio "PNG" checked
read: PNG
read: radio "JPEG"
read: JPEG
read: radio "WebP"
read: WebP Background
read: radio "Canvas color" checked
read: Canvas color
read: radio "Transparent"
read: Transparent
read: image "Preview of les-miserables_current-view.png"
read: Saved to this computer only; nothing is uploaded.
read: button "Cancel"
read: button "Copy"
read: button "Export"
focus: button "Close"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 44.png)

Morgan: Image export, PNG, 2x, saved locally. Nothing in it says whether the key -- the size and color legends -- goes into the picture. I check the View choices in case 'with key' is one of them.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: gridcell "Image"
focus: combobox "Preset" value "To share -- PNG, 2x"
focus: combobox "View" value "Current view"
focus: radio "2x" checked
focus: radio "PNG" checked
focus: radio "Canvas color" checked
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 45.png)

Morgan: Back to View and open it with Alt+Down to hear its options.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Alt+ArrowDown --wait 300 --read
focus: radio "PNG" checked
focus: radio "2x" checked
focus: combobox "View" value "Current view"
focus: combobox "View" value "Current view" expanded; highlighted: option "Current view" selected
focus: combobox "View" value "Current view" expanded; highlighted: option "Current view" selected
read: dialog "Export":
read: heading level 2 "Export"
read: button "Close"
read: row "Image"
read: row "Data"
read: heading level 3 "Image"
read: A picture of the drawing, 2x , PNG Preset
read: combobox "Preset" value "To share -- PNG, 2x"
read: View
read: combobox "View" value "Current view" expanded
read: Size
read: radio "1x"
read: 1x
read: radio "2x" checked
read: 2x
read: radio "4x"
read: 4x
read: radio "400 x 300"
read: 400 x 300 Format
read: radio "PNG" checked
read: PNG
read: radio "JPEG"
read: JPEG
read: radio "WebP"
read: WebP Background
read: radio "Canvas color" checked
read: Canvas color
read: radio "Transparent"
read: Transparent
read: image "Preview of les-miserables_current-view.png"
read: Saved to this computer only; nothing is uploaded.
read: button "Cancel"
read: button "Copy"
read: button "Export"
focus: combobox "View" value "Current view" expanded; highlighted: option "Current view" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 46.png)

Morgan: The list is open but browse mode doesn't read the options. I arrow down to hear them.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowDown --key ArrowDown --key ArrowDown
focus: combobox "View" value "Current view" expanded; highlighted: option "Whole graph" selected
focus: combobox "View" value "Current view" expanded; highlighted: option "Top" selected
focus: combobox "View" value "Current view" expanded; highlighted: option "Side" selected
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 47.png)

Morgan: Current view, Whole graph, Top, Side -- camera choices, nothing about a key. I pick Whole graph so no one is cut off, then go to Export. Whether the key is in the file, I'll have to find out from the file.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key ArrowUp --key ArrowUp --key Enter --wait 500
focus: combobox "View" value "Current view" expanded; highlighted: option "Top" selected
focus: combobox "View" value "Current view" expanded; highlighted: option "Whole graph" selected
focus: combobox "View" value "Whole graph"
focus: combobox "View" value "Whole graph"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 48.png)

Morgan: Whole graph set. I read the dialog once more for any mention of the key, then tab to Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --read
read: dialog "Export":
read: heading level 2 "Export"
read: button "Close"
read: row "Image"
read: row "Data"
read: heading level 3 "Image"
read: A picture of the drawing, 2x , PNG ; your own camera does not move Preset
read: combobox "Preset" value "To share -- PNG, 2x"
read: View
read: combobox "View" value "Whole graph"
read: Size
read: radio "1x"
read: 1x
read: radio "2x" checked
read: 2x
read: radio "4x"
read: 4x
read: radio "400 x 300"
read: 400 x 300 Format
read: radio "PNG" checked
read: PNG
read: radio "JPEG"
read: JPEG
read: radio "WebP"
read: WebP Background
read: radio "Canvas color" checked
read: Canvas color
read: radio "Transparent"
read: Transparent
read: image "Preview of les-miserables_whole-graph.png"
read: Saved to this computer only; nothing is uploaded.
read: button "Cancel"
read: button "Copy"
read: button "Export"
focus: combobox "View" value "Whole graph"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 49.png)

Morgan: No word about the key anywhere. Tab to Export and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: radio "2x" checked
focus: radio "PNG" checked
focus: radio "Canvas color" checked
focus: button "Cancel"
focus: button "Copy"
focus: button "Export"
focus: button "Close"
(a screenshot was kept for the graders)
(exit 0)
```

### Step (screenshot 50.png)

Morgan: Wrapped around to Close. Shift+Tab to Export, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s01 --key Shift+Tab --key Enter --wait 3000
focus: button "Export"
focus: nothing (the page itself)
focus: button "Main menu"
live: alert (assertive): "Exported les-miserables_whole-graph.png"
a file was saved: les-miserables_whole-graph.png, 1806 x 1720 (/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s01/downloads/les-miserables_whole-graph.png)
(a screenshot was kept for the graders)
(exit 0)
```

Morgan: "Exported les-miserables_whole-graph.png", said once, assertively, and focus went back to Main menu instead of falling off the page. I can't see the file. I use my one question to the moderator for this task: "Is the key in the picture, and are the names readable?"

Moderator (describing downloads/les-miserables_whole-graph.png, 1806 x 1720): a box at top left reads "Size: Betweenness, 0 to 1624" with a wedge, and "Color: Betweenness, 0 to 1624" with a light-orange-to-dark-brown bar. Every dot has a name above it, but the names are very small next to the dots, and in the crowded middle several overlap (Valjean's own label sits under his large dark dot, and a few pairs such as two names near the bottom right print on top of each other).

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/rounds/round-3/sessions/r3-s01
```

## Debrief, in character

**Did I finish?** Yes, all five parts, by keyboard only, with one question to a sighted person at the end.

- On screen: Les Miserables sample, announced as "77 nodes, 254 edges"; the overview read nodes, edges, undirected, 1 component, density.
- Which characters matter most: Betweenness. Top 10 read as text: Valjean 1,624, Myriel 504, Gavroche 470.6, Marius 376.3, Fantine 369.5, Thenardier 213.5, Javert 154.8, MlleGillenormand 135.7, Enjolras 121.3, Tholomyes 115.8. These agree with NetworkX once I multiply its normalized numbers by 2,850 (the number of pairs among 76 others), so they are raw, unnormalized counts.
- Bigger dots: size runs from 1 to 3 by betweenness.
- Names: the name attribute, above each dot; I turned on "Show all labels" so none of the 77 were hidden.
- Picture: les-miserables_whole-graph.png, PNG at 2x, whole graph, saved locally.
- What size and color stand for: both stand for betweenness -- how often a character sits on the shortest path between two others, from 0 (median, most characters) to 1,624 (Valjean). Bigger and darker brown means more of a go-between; small light orange means none.

**Rating: 5 out of 7.** It was faster than I expected, and most controls said what they were. It loses points for these:

1. Focus fell off the page twice: after "No thanks" on the usage question and after opening the sample. Each time I had to find my place again. The usage confirmation arrived in a region that may never be spoken.
2. The betweenness numbers never say "raw" or "unnormalized". I worked it out by arithmetic. NetworkX normalizes by default, so a colleague comparing figures would be off by a factor of 2,850 with no warning.
3. The only setting for Betweenness is "Sample size", value 1, with no explanation. Sample of what? One sampled source would make betweenness close to meaningless, yet the numbers match the exact answer. Either the setting is mislabeled or I don't understand it, and the tool doesn't help.
4. The Values tab reads as twenty "row, no name" items before the useful text -- a chart that speaks only as noise.
5. Choosing the Betweenness entry in the left tree selected it silently; nothing said what opened or where.
6. "1 to 3, variable Betweenness" puts the numbers before the thing that matters. At my speed I hear "1 to 3" and don't know what it's about.
7. "Label" is a bare button with no state, and once a label line exists, "Label" and "Add label line" stay in the Tab order as disabled stops.
8. The export dialog never says whether the key goes into the picture. It did, but I had to ask someone to find that out. The View choices (Current view, Whole graph, Top, Side) are about the camera, and nothing mentions the key.
9. "77 labels, 7 hidden" didn't say which 7. Even with all shown, a sighted reader says the names are tiny and overlap in the middle, so the picture isn't really ready to paste into a document without someone checking it.
10. The question-mark key did nothing from inside the panel; I found "Keyboard shortcuts ?" only later, in the Main menu.

**What worked:** real headings on the start page; "Files are read on this computer and never uploaded" and "Saved to this computer only; nothing is uploaded"; the size announced once on load; Shift+A to a filterable list of analyses with one-line definitions; short "added, running" and "finished" announcements, with focus returned to Analyze; the color and size keys exposed as text; a ranked Top 10 I can read again later; the Main menu listing its shortcuts; Tab order matching reading order, with a clean Shift+Tab.

**Would I use it instead of my scripts?** Not for the numbers -- NetworkX already gives me those, and it says what it normalized. For handing a sighted colleague a labeled, keyed figure without describing it myself: maybe, once the export tells me what is in the file.
