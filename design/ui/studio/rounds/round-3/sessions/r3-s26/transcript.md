# Session r3-s26 -- Morgan Reyes (screen-reader analyst), task T9 A (Les Miserables)

Task as given: "You have never used this program before. You will practice on the ready-made network of characters from the novel Les Miserables that comes with the program, not on your own data. Make the drawing show which characters the network depends on most: the more it depends on a character, the bigger that character's dot. Then tell us what the sizes and the colors on the drawing now stand for."

Start: empty app, screen-reader mode (keyboard only; what a screen reader would say is printed after every step).

### Start

```
node tool/real.mjs --start rounds/round-3/sessions/r3-s26 empty --sr
focus: nothing (the page itself)
```

Morgan: The page loaded. Nothing has focus. Before tabbing, I read the page in browse mode to learn its title and headings.

### Step (screenshot 2)

Morgan: Focus is on the page itself. I read what is there in browse mode before pressing anything.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 3)

Morgan: Headings exist: graphty, Start, Recent projects, Samples. It says files stay on this computer -- good. There is a usage-data question at the bottom; I will decline it. First I press Tab to learn the order.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step (screenshot 4)

Morgan: Main menu first. The consent buttons are last on the page, so I try Shift+Tab to wrap backward to them.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

### Step (screenshot 5)

Morgan: Back to the page; fine, that is normal browser behavior. Shift+Tab again should land on the last control, likely No thanks.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab
focus: button "No thanks"
(a screenshot was kept for the graders)
```

### Step (screenshot 6)

Morgan: On No thanks. Pressing Enter to decline usage data.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter
focus: nothing (the page itself)
live: status (polite): "Usage data stays off. Change this in Settings > Privacy" -- unconfirmed: the region arrived with this text already in it, which many screen readers do not read
(a screenshot was kept for the graders)
```

### Step (screenshot 7)

Morgan: Focus fell back to the page after I pressed the button -- I lost my place, noted. The status message may not be spoken. Now I Tab forward toward the Samples buttons; from the browse read, Les Miserables should be about five Tabs in.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Change this in Settings > Privacy"
focus: nothing (the page itself)
focus: button "Main menu"
focus: button "Local only"
focus: button "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
```

### Step (screenshot 8)

Morgan: Odd: first Tab hit a 'Change this in Settings > Privacy' button, then the page, then the top. Now on Open project. Two more Tabs should reach the Les Miserables sample.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab
focus: button "New from data..."
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```

### Step (screenshot 9)

Morgan: On 'Open the Les Miserables sample'. Enter, and I want to hear how big it is.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter --wait 3000
focus: nothing (the page itself)
live: status (polite): "Les Miserables: 77 nodes, 254 edges"
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

### Step (screenshot 10)

Morgan: It said 77 nodes, 254 edges -- good, the counts first. But focus is on the page again. I read the page to learn what is here now.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 11)

Morgan: An overview with nodes, edges, direction, density, one component -- that is what I want first. No headings on this screen though, only buttons and a tree. There is a hint: 'Analyze ... Shift+A to add results'. 'Which characters the network depends on most' sounds like betweenness to me. I press Shift+A.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+A
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step (screenshot 12)

Morgan: A 'Filter analyses' box, expanded. I read what it offers before typing.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 13)

Morgan: A real list of options with one-line descriptions, grouped. PageRank is marked 'Start here', but 'depends on' means: if this character were gone, paths would break. That is betweenness. I type 'betw' to filter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --type betw
focus: combobox "Filter analyses" value "betw" expanded; highlighted: option "Betweenness Which nodes sit on the most shortest paths between others." selected
(a screenshot was kept for the graders)
```

### Step (screenshot 14)

Morgan: Betweenness is highlighted. Enter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter --wait 2000
focus: button "Run"
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step (screenshot 15)

Morgan: Focus is on a Run button. Before I run anything I want to know the settings -- normalized or not, directed or not. I read around it.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
read: form "Betweenness":
read: button "Back to analyses"
read: Betweenness Which nodes sit on the most shortest paths between others.
read: button "Expand Advanced"
read: Under a second
read: button "Run"
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step (screenshot 16)

Morgan: Settings are hidden under 'Advanced'. I go back one control with Shift+Tab to expand it and check normalization.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab --key Enter
focus: button "Expand Advanced"
focus: button "Collapse Advanced" expanded
(a screenshot was kept for the graders)
```

### Step (screenshot 17)

Morgan: Expanded. Reading the form again.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 18)

Morgan: The only setting is 'Sample size', value 1, with no unit and no explanation. Sample of what -- one source node? That would make betweenness an estimate from a single node, which worries me. Nothing about normalization. I leave it and run, then judge the numbers. Tab to Run, Enter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab --key Enter --wait 3000
focus: spinbutton "Sample size" value "1"
focus: button "Run"
focus: button "Analyze"
live: status (polite): "Betweenness added, running"
live: status (polite): "Betweenness finished"
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step (screenshot 19)

Morgan: 'Betweenness finished', said once, and focus came back to the Analyze button -- good, I know where I am. Now: did the dots change size, and where is the result? I read around focus.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 20)

Morgan: The drawing now has a legend: 'Color: Betweenness, 0 to 1624'. So color is betweenness, raw counts not normalized (NetworkX would say 0 to 1 by default) -- it does not say so, though. Nothing about size yet. The task wants size. I go back to the left-hand tree where results were said to appear: Shift+Tab.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab
focus: Canvas "Graph drawing"
(a screenshot was kept for the graders)
```

### Step (screenshot 21)

Morgan: On the 'Graph drawing' canvas. Not where I want. Shift+Tab again toward the left tree.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step (screenshot 22)

Morgan: A panel resize handle. One more Shift+Tab into the tree.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab
focus: button "Hide Betweenness"
(a screenshot was kept for the graders)
```

### Step (screenshot 23)

Morgan: 'Hide Betweenness' button. I read this region to see the result entry.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
read: region "Graph place":
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Betweenness"
read: treeitem "Everything"
focus: button "Hide Betweenness"
(a screenshot was kept for the graders)
```

### Step (screenshot 24)

Morgan: There is a 'Betweenness' item in the tree. Shift+Tab to it and Enter to open it.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+Tab --key Enter --wait 1000
focus: treeitem "Selection"
focus: treeitem "Selection" selected
focus: treeitem "Selection" selected
(a screenshot was kept for the graders)
```

### Step (screenshot 25)

Morgan: It landed on 'Selection', and I opened Selection by accident. The tree is one tab stop, so I use Down Arrow to Betweenness, then Enter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key ArrowDown --key Enter --wait 1000
focus: treeitem "Betweenness"
focus: treeitem "Betweenness" selected
focus: treeitem "Betweenness" selected
(a screenshot was kept for the graders)
```

### Step (screenshot 26)

Morgan: Betweenness is selected in the tree. Nothing was announced about what changed. The details are probably in the right-hand panel; I Tab forward and listen.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Hide Betweenness"
focus: separator "Resize left panel" value "240"
focus: Canvas "Graph drawing"
focus: button "Analyze"
focus: button "from Betweenness, Oct 7"
focus: button "Measure actions"
focus: tab "Style" selected
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```

### Step (screenshot 27)

Morgan: I passed 'from Betweenness, Oct 7' and 'Measure actions' and am now in a 'Style' tab, on a radio 'Nodes, set'. Style is where size should be. I read this panel.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```

### Step (screenshot 28)

Morgan: Sections Fill, Color (Betweenness), Shape, Effects, Label, Tooltip. There is no 'Size' by name. Size is probably under Shape -- 'Add to Shape'. I Tab toward it.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Add Opacity"
focus: button "Betweenness, Color"
focus: button "Detach Color"
focus: button "Remove Color"
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```

### Step (screenshot 29)

Morgan: On 'Add to Shape'. Enter, and hope Size is in there.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter
focus: menuitem "Size"
(a screenshot was kept for the graders)
```

### Step (screenshot 30)

Morgan: A menu opened and the first item is 'Size'. Enter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter --wait 1000
focus: combobox "Find an attribute" expanded; highlighted: option "Fixed size" selected
focus: combobox "Find an attribute" expanded; highlighted: option "Fixed size" selected
(a screenshot was kept for the graders)
```

### Step (screenshot 31)

Morgan: 'Find an attribute', with 'Fixed size' highlighted. I want size from betweenness, so I type 'betw'.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --type betw
focus: combobox "Find an attribute" value "betw" expanded; highlighted: option "Betweenness" selected
(a screenshot was kept for the graders)
```

### Step (screenshot 32)

Morgan: Betweenness highlighted. Enter.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Enter --wait 2000
focus: button "1 to 3, variable Betweenness"
focus: button "1 to 3, variable Betweenness"
(a screenshot was kept for the graders)
```

### Step (screenshot 33)

Morgan: Focus is on a button '1 to 3, variable Betweenness'. Nothing was announced; I infer size now runs 1 to 3 by betweenness. I read the panel to confirm.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

### Step (screenshot 34)

Morgan: The panel now lists Size: '1 to 3, variable Betweenness', under Shape. So the dots are sized by betweenness. 1 to 3 of what unit, it does not say. I want to hear the legend on the drawing again to check it mentions size. Shortcut back: Shift+A opens Analyze, Escape should drop me on the Analyze button next to the legend.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Shift+A --key Escape
focus: combobox "Filter analyses" expanded
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step (screenshot 35)

Morgan: Back on Analyze. Reading the drawing region for the legend.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
read: main "Graph":
read: Size: Betweenness
read: image "Size: Betweenness 0 1624"
read: Color: Betweenness
read: image "Color: Betweenness 0 1624"
read: button "Analyze"
read: button "Layout"
read: button "View"
read: button "Quick actions"
read: Betweenness finished
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step (screenshot 36)

Morgan: The legend now says 'Size: Betweenness 0 to 1624' and 'Color: Betweenness 0 to 1624'. Before I answer, I want to hear who the biggest dots are, in text. The 'Values' tab next to Style should have them. Tab three times to the Style tab, then Right Arrow to Values.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --key Tab --key Tab --key Tab --key ArrowRight --wait 1000
focus: button "from Betweenness, Oct 7"
focus: button "Measure actions"
focus: tab "Style" selected
focus: tab "Values" selected
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step (screenshot 37)

Morgan: On Values. Reading it.

```
node tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-3/sessions/r3-s26 --read
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
```

```
node tool/real.mjs --end rounds/round-3/sessions/r3-s26
```

Morgan (on the last read): The Values tab has a top 10 as text: Valjean 1,624, Myriel 504, Gavroche 470.6, Marius 376.3, Fantine 369.5, Thenardier 213.5, Javert 154.8, MlleGillenormand 135.7, Enjolras 121.3, Tholomyes 115.8. "77 of 77 have a value, 0 to 1,624, median 0." Those match what NetworkX gives with normalized=False (Valjean is about 0.570 normalized, times 2,850 pairs, is about 1,624), so the numbers are right -- but I only know that because I did the arithmetic. Above the top 10 there are twenty rows read as "row (no name)", which I cannot use. I am done; ending the session.

## Debrief (in character)

**Did I finish?** Yes. The dots are now sized by betweenness, and the drawing's legend says so in text.

**My answer to the question:** Size and color now both stand for the same thing: betweenness -- how many shortest paths between other characters run through each character. The legend reads "Size: Betweenness, 0 to 1624" and "Color: Betweenness, 0 to 1624". Bigger and (in whatever color ramp it uses) further along the color scale means more of the network's shortest routes go through that character. Valjean is at the top with 1,624, then Myriel, Gavroche, Marius, Fantine. The values are raw counts of paths, not the 0-to-1 normalized form NetworkX gives by default -- the tool does not say which; I worked it out.

**Ease: 5 out of 7.** Shorter than I expected and every control I needed had a real name. It lost a point for focus dropping to the page twice, and another for leaving me to guess at the meaning of the numbers.

**What worked:**
- The start page has headings and says files are read on this computer and never uploaded.
- Opening the sample announced "77 nodes, 254 edges" and the overview gave nodes, edges, direction, density and components as text without running anything.
- Shift+A opened a filterable list of analyses with a one-line description each; typing "betw" found it.
- After Run, "Betweenness finished" was said once and focus came back to the Analyze button.
- The legend on the drawing is text ("Size: Betweenness 0 1624"), and the Values tab has a top-10 list I can read.

**What confused or bothered me:**
- Focus went to "the page itself" after I declined usage data and again after opening the sample. Both times I had to find my way back from the top.
- The usage-data confirmation arrived already filled in, so my screen reader may never have spoken it. Then a stray "Change this in Settings > Privacy" button turned up as the first Tab stop.
- After the sample opened, the screen had no headings at all, only buttons, a tree and tabs. I found things by Tab and by reading regions.
- The only advanced setting for betweenness is "Sample size", value 1, with no unit or explanation. Sample of what? To me that reads as "estimated from one node", which would make the result a rumour. The numbers turned out exact, so the label is wrong or misleading for this graph.
- Nothing says whether betweenness is normalized or raw, or whether the graph was treated as directed. The overview said "Undirected, from the file: directed 0", which helped, but the result itself should say it.
- Size is filed under "Shape", behind a button called "Add to Shape". I would not have looked there if Shape had not been the only plausible heading. There is no "Size" in the panel until you add one.
- Picking an attribute for size announced nothing. I had to read the panel to learn it became "1 to 3, variable Betweenness". 1 to 3 of what?
- The Values tab reads twenty "row (no name)" entries before the useful text. It is a picture of a histogram dressed up as rows.
- The tree is one Tab stop and Enter on it selects. My first Enter opened "Selection" by accident, because Shift+Tab landed on the first item, not on the one I had just left.
- I could not tell from text what the colors are -- which color is high and which is low. The legend gives the range but not the ramp.

**Would I use this instead of my scripts?** Not for the numbers; NetworkX already gives me those. I might use it to hand a sighted colleague a drawing that I know is sized and colored by the same measure as my table, and to check the caption matches.
