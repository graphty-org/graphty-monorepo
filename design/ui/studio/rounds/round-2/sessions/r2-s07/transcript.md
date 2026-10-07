# Session r2-s07 -- Morgan (screen-reader analyst), Les Miserables, whole first session

Participant: Morgan Reyes, blind analyst, screen reader and keyboard only. Screen-reader mode: no screenshots read, only keys, typing and uploads; the focus: and live: lines are what I "hear".

Task (Prompt A): get the ready-made Les Miserables network on screen, have the program work out which characters matter most, make the dots bigger for those that matter more, get names written on the drawing, finish with a picture file with its key. Say when each part is done and what sizes and colors stand for.

### Start

```
node design/ui/studio/tool/real.mjs --start design/ui/studio/rounds/round-2/sessions/r2-s07 empty --sr
focus: nothing (the page itself)
```

Heard: nothing. No title spoken by the tool, focus is on the page itself. I will press Tab to find the first control.

### Step: --key Tab

Before: Focus is on the page itself, nothing said. Tab to learn the first control.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 1 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 2 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 3 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "New from data..."
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 4 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 5 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Learning tab order, Tab press 6 after Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Open the College football sample"
(a screenshot was kept for the graders)
```

Morgan: Tab order is sane and every control has a real name: Main menu, "Local only" (good -- that answers my first question about where data goes, at least by name), Open project or file with its Ctrl+O shortcut, New from data, then three samples by name. "Open the Les Miserables sample" is exactly what I want. Shift+Tab twice to get back to it, then Enter. Checking Shift+Tab reverses cleanly too.

### Step: --key Shift+Tab

Before: Shift+Tab back toward the Les Miserables sample.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: One more Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Shift+Tab reversed cleanly. On 'Open the Les Miserables sample'; pressing Enter and listening for what it says about size.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: status (polite): "Reading Les Miserables"
(a screenshot was kept for the graders)
```

Morgan: Focus jumped by itself to something called "Canvas" with no name -- I hear just "canvas". It said "No nodes to draw", then "Reading Les Miserables". The first message is alarming out of context; the second never said it finished. I'll wait a moment and see if it tells me when it is done.

### Step: --wait 3000

Before: Waiting to hear whether loading finishes and how big the graph is.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --wait 3000
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

Morgan: Silence. Never told me it was done, never told me how big. I'm on an unnamed canvas. Arrow key to see if the drawing talks.

### Step: --key ArrowRight

Before: Press an arrow key on the canvas and listen.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowRight
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

Morgan: Nothing. Per my habit, Enter next, then I go looking for a table.

### Step: --key Enter

Before: Enter on the canvas.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Shift+?

Before: Question mark for keyboard help.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+?
focus: button "Close"
(a screenshot was kept for the graders)
```

Morgan: Canvas silent on arrows and Enter -- I call the drawing dead. Question mark did something: focus is on a "Close" button, but nobody told me what opened or its title. I'll Tab through it to find out.

### Step: --key Tab

Before: Tab inside whatever the question mark opened (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: gridcell "All"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab inside whatever the question mark opened (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: region "All"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab inside whatever the question mark opened (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Done"
(a screenshot was kept for the graders)
```

Morgan: A grid cell called "All", then a region called "All", then "Done". Still no dialog title. Maybe it's a list of shortcut categories. Back to the grid cell and arrow down it.

### Step: --key Shift+Tab

Before: Back to the grid.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: region "All"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Back to the grid cell.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: gridcell "All"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the grid.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Project"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Selection"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the category list (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Settings and help"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the category list (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "View"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the category list (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Analyze"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the category list (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Graph tree"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the category list (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: gridcell "Data"
(a screenshot was kept for the graders)
```

Morgan: Categories: All, Project, Selection, Settings and help, View, Analyze, Graph tree, Data. "Graph tree" sounds like a text way through the graph. "Analyze" is my second part. Up to Graph tree, then Tab into the region and see whether I can read it.

### Step: --key ArrowUp

Before: Up to Graph tree.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: gridcell "Graph tree"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab into the region.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: region "All"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down inside the region.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: region "All"
(a screenshot was kept for the graders)
```

Morgan: The region still says "All" -- moving to a category didn't select it, apparently. The shortcut text itself has no focusable rows, so in this session I cannot read it line by line (in NVDA I'd switch to browse mode; here I only get focus). I'll try Enter on the category once, then give up on the help and go find the graph tree in the page itself.

### Step: --key Shift+Tab

Before: Back to the category.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: gridcell "Graph tree"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter on Graph tree.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: gridcell "Graph tree"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab to the region again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Done"
(a screenshot was kept for the graders)
```

Morgan: Now Tab skipped the region and went to Done. Inconsistent. I'm leaving the help. Enter on Done, and I want to land back where I was.

### Step: --key Enter

Before: Close the help with Done.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

Morgan: Focus dropped to the page itself, not back to the canvas. I've lost my place. Tab from the top to learn the layout with the graph loaded.

### Step: --key Tab

Before: Tab through the loaded workspace (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Graph"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the loaded workspace (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: treeitem "Selection"
(a screenshot was kept for the graders)
```

Morgan: Main menu, Project: Les Miserables (good, the name is first), Undo -- enabled, which worries me: what did I do that can be undone? Maybe the arrow or Enter on the canvas. Redo disabled, Local only, Graph, Find, then a tree item "Selection". A tree -- that may be the graph tree. Keep tabbing a few more to learn the rest before I dive in.

### Step: --key Tab

Before: Tab further (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Graph actions"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

Morgan: Resize left panel, the unnamed canvas again, "Analyze" (my next part), "From Les Miserables", "Graph actions", a "Values" tab, "Collapse Overview" -- so there is an Overview, which is where I'd expect counts, but its text is not something focus lands on, so here I can't hear it. Then Resize inspector. Before analyzing, I go back to the tree item "Selection" and arrow down it to see what the graph tree holds -- I want a size in words.

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Graph actions"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back toward the tree (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: One more Shift+Tab to the tree.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: treeitem "Selection"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

Morgan: The tree has two items: "Selection" and "Everything". No count in either name, no expanded or collapsed state said. Right arrow to open "Everything".

### Step: --key ArrowRight

Before: Right arrow to open Everything.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowRight
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Down.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Down.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

Morgan: "Everything" doesn't open. Two items, nothing below. Second dead end after the canvas. I still don't know how big the network is. Part one -- getting it on screen -- I believe is done because the project is named Les Miserables, but nothing told me in words. On to Analyze.

### Step: --key Tab

Before: Tab toward Analyze (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab toward Analyze (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab toward Analyze (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: On Analyze. Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

Morgan: "Filter analyses, combobox, expanded". A searchable list -- that I know how to use. Arrow down to hear the first options.

### Step: --key ArrowDown

Before: Arrow down the analyses list (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the analyses list (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the analyses list (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the analyses list (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the analyses list (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

Morgan: Five arrow presses and all I hear is "Filter analyses, combobox, expanded" each time. No option name. Either the list does not tell the screen reader which option is active, or nothing moved. I'll type what I want instead: "betweenness" is my usual measure for who holds a network together.

### Step: --type betweenness

Before: Type betweenness into the filter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type betweenness
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```

Morgan: It took my text, but said nothing about how many analyses match. Tab to find what's listed after the filter.

### Step: --key Tab

Before: Tab past the filter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Clear search"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```

Morgan: Tab goes to "Clear search" and then straight back to the filter -- the list items aren't in the tab order. It's a combobox, so the list is meant for arrows plus Enter. Arrow down once and Enter, and hope it picks the betweenness option.

### Step: --key ArrowDown

Before: Arrow down once in the filtered list.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter to choose.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Run"
(a screenshot was kept for the graders)
```

Morgan: Enter put me on a "Run" button. Run what? It never told me which analysis I picked. Before running anything I want to know what it is and its settings -- normalized or not. Shift+Tab back to hear what's above Run.

### Step: --key Shift+Tab

Before: Shift+Tab above Run (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab above Run (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Back to analyses"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab above Run (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab above Run (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```

Morgan: Three controls in a loop: Back to analyses, Expand Advanced, Run. The name of the analysis is presumably a heading I'd hear in browse mode, but in this session nothing focusable names it. Expand Advanced to hear the settings -- that might name it.

### Step: --key Enter

Before: Open Advanced.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Collapse Advanced" expanded
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the advanced settings (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: spinbutton "Sample size" value "1"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the advanced settings (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the advanced settings (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Back to analyses"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through the advanced settings (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Collapse Advanced" expanded
(a screenshot was kept for the graders)
```

Morgan: One advanced setting: "Sample size, spin button, 1". Sample size of what? If this is betweenness estimated from one sampled source, the numbers are noise. If 1 means "all of it", say so. No word about normalization or directedness. I'm suspicious, but I'll run it with the default and judge what comes back. Shift+Tab to Run... actually Run is the next Tab after Sample size.

### Step: --key Tab

Before: Tab to Sample size.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: spinbutton "Sample size" value "1"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab to Run.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Press Run.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Analyze"
live: status (polite): "Edge betweenness added, running"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

Morgan: "Edge betweenness added, running." Edge betweenness -- that's about links, not characters. The list never read me the options, so I picked the first match blind. That's the cost of a silent list. Focus went back to the Analyze button, which is at least a known place. Let me wait to hear it finish, then go back and find node betweenness or degree.

### Step: --wait 3000

Before: Wait for the run to finish.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --wait 3000
focus: button "Analyze"
(a screenshot was kept for the graders)
```

Morgan: No "done". Told me it was running, never told me it finished. Back into Analyze; this time I'll type a longer phrase, "betweenness centrality", hoping it narrows to the node measure.

### Step: --key Enter

Before: Open Analyze again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```

### Step: --type betweenness centrality

Before: Type the longer phrase.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type betweenness centrality
focus: combobox "Filter analyses" value "betweenness centrality" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down and Enter on the first match.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" value "betweenness centrality" expanded
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Update Edge betweenness row"
(a screenshot was kept for the graders)
```

Morgan: "Update Edge betweenness row." Same edge measure again. Whatever matches "betweenness centrality" first is still the edge one. I'll stop fighting for betweenness and ask for degree -- number of connections, the plainest "who matters". Back to analyses, then type "degree".

### Step: --key Shift+Tab

Before: Shift+Tab to find Back to analyses.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab again.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Back to analyses"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Back to analyses.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Filter analyses" value "betweenness centrality" expanded
(a screenshot was kept for the graders)
```

### Step: --key Control+a

Before: Select all the filter text.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Control+a
focus: combobox "Filter analyses" value "betweenness centrality" expanded
(a screenshot was kept for the graders)
```

### Step: --type degree

Before: Type degree over it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type degree
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down to the first degree match.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

Morgan: This time Enter did nothing at all. Same keys as before, different result. I don't know which option is active because it never tells me. Try ArrowUp and Enter, in case my Down landed on a header or wrapped.

### Step: --key ArrowUp

Before: Arrow up.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Run"
(a screenshot was kept for the graders)
```

Morgan: On "Run" again, again without knowing what. Look at Advanced to get any hint of which analysis this is.

### Step: --key Shift+Tab

Before: Shift+Tab to Advanced.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Back to analyses"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Open it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Clear search"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Filter analyses" value "degree" expanded
(a screenshot was kept for the graders)
```

Morgan: That analysis has no Advanced -- Shift+Tab went to "Back to analyses" and my Enter took me back to the list. My own fault, but I could not know the layout was different. Try plain Enter on the filter this time, no arrows.

### Step: --key Enter

Before: Enter with no arrow.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Run"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Run whatever the first degree match is, and listen to the name it reports.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Analyze"
live: status (polite): "Degree added, running"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

Morgan: "Degree added, running." Plain Enter on the filter picks the first match -- that's the rule I'll write in my keystroke file. Part two, having it work out who matters, is running at least. Now: where's the answer? Earlier I heard "Update Edge betweenness row", so there are rows somewhere. Tab forward from Analyze.

### Step: --key Tab

Before: Tab looking for results (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab looking for results (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Graph actions"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab looking for results (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab looking for results (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab looking for results (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab looking for results (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

Morgan: Same tab order as before; no result rows anywhere in it. Then focus fell off the end onto the page. The "Values" tab is a tab list -- there may be sibling tabs. Back to it and arrow right.

### Step: --key Shift+Tab

Before: Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab to Values.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step: --key ArrowRight

Before: Arrow right in the tabs.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowRight
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

Morgan: A "Style" tab, now selected. Style is where dot sizes should live. Tab into it to learn what's there.

### Step: --key Tab

Before: Tab through Style (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Collapse Canvas" expanded
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Color swatch"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: textbox "Color hex value" value "F5F5F5"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Reset Background to default"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Method" value "Force - Recommended"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: radio "3D" checked
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: spinbutton "Spring length" value "30"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Style (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: spinbutton "Gravity" value "-1.2000000476837158"
(a screenshot was kept for the graders)
```

Morgan: Canvas section: background color, layout Method "Force - Recommended", 3D, Spring length 30, and "Gravity minus 1.2000000476837158" -- my braille display shows that whole float. Sloppy. Nothing about node size yet. Keep going.

### Step: --key Tab

Before: Tab further through Style (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (9).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Graph"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab further through Style (10).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
```

Morgan: Style for the graph is only background and layout. Wrapped around to the top. The results must be somewhere I've been. The tree might have grown since I ran two analyses. Tab once to the tree and arrow down.

### Step: --key Tab

Before: Tab to the tree.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the tree (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

Morgan: The tree changed -- Tab now lands on a "Hide Connections" button, which arrows don't move. Shift+Tab to hear what's around it.

### Step: --key Shift+Tab

Before: Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```

Morgan: "Hide Connections", "Hide Bridge edges", then tree item "Everything". So my two runs became things called "Connections" (degree, I guess) and "Bridge edges" (the edge betweenness), but I only meet them as Hide buttons -- the items themselves aren't in my path. Arrow up from Everything to reach them as tree items.

### Step: --key ArrowUp

Before: Arrow up from Everything.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: treeitem "Bridge edges"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: treeitem "Connections"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: treeitem "Selection"
(a screenshot was kept for the graders)
```

Morgan: Tree is now Selection, Connections, Bridge edges, Everything. Down to Connections, Enter, and then I'll look in the inspector on the right for its values and style.

### Step: --key ArrowDown

Before: Down to Connections.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: treeitem "Connections"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter on Connections.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: treeitem "Connections" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "from Connections, Oct 6"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Measure actions"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (9).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab from Connections toward the inspector (10).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add Opacity"
(a screenshot was kept for the graders)
```

Morgan: With Connections chosen the inspector changed: "from Connections, Oct 6", "Measure actions", Style tab, a radio "Nodes, set", "Add Opacity". Promising -- an "Add ..." list might include size. Keep tabbing.

### Step: --key Tab

Before: Tab through Connections style (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Connections, Color"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Detach Color"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Remove Color"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Label"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add label line"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab through Connections style (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add Tooltip"
(a screenshot was kept for the graders)
```

Morgan: "Connections, Color" -- so the degree result is already painting color, which I didn't ask for and only learn here. Then Detach/Remove Color, "Add to Shape", "Add to Effects", "Label", "Add label line", "Add Tooltip". Size is probably under Shape. Back four to "Add to Shape" and Enter.

### Step: --key Shift+Tab

Before: Shift+Tab back to Add to Shape (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Add label line"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Add to Shape (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Label"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Add to Shape (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Add to Shape (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Open Add to Shape.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: menuitem "Size"
(a screenshot was kept for the graders)
```

Morgan: A menu, first item "Size". A real menu. Enter on it.

### Step: --key Enter

Before: Choose Size.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Size" value "1"
(a screenshot was kept for the graders)
```

Morgan: "Size, combobox, 1". One size for everyone isn't what I want; I want size to follow the number. A combobox may offer "by Connections". Alt+Down to open it, then arrows.

### Step: --key Alt+ArrowDown

Before: Open the Size list.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Alt+ArrowDown
focus: combobox "Size" value "0"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Size" value "0"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: combobox "Size" value "0"
(a screenshot was kept for the graders)
```

Morgan: Uh oh. The value went from 1 to 0. It says combobox but behaves like a number box -- my "open the list" key lowered the size. Size zero may have just made the dots vanish, and I would never know. I'll type 1 back, then Tab to see what else is next to it.

### Step: --key Control+a

Before: Select all.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Control+a
focus: combobox "Size" value "0"
(a screenshot was kept for the graders)
```

### Step: --type 1

Before: Type 1.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type 1
focus: combobox "Size" value "1"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab past Size (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Size by attribute"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab past Size (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Remove Size"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab past Size (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab past Size (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Label"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab past Size (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add label line"
(a screenshot was kept for the graders)
```

Morgan: Back at 1. Right after it: "Size by attribute". That's what I want. Back to it and Enter.

### Step: --key Shift+Tab

Before: Shift+Tab back to Size by attribute (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Label"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Size by attribute (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Size by attribute (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Remove Size"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Size by attribute (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Size by attribute"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter on Size by attribute.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Find an attribute" expanded
(a screenshot was kept for the graders)
```

Morgan: "Find an attribute, combobox, expanded." Same kind of silent list as the analyses. I'll type "degree" and use the Enter rule I learned.

### Step: --type degree

Before: Type degree.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type degree
focus: combobox "Find an attribute" value "degree" expanded
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "1 to 3, variable Connections in degree"
(a screenshot was kept for the graders)
```

Morgan: "1 to 3, variable Connections in degree." I parse that as: sizes run from 1 to 3, driven by the value "Connections" from the Degree result. But "in degree" also sounds like in-degree, a directed measure, and that's exactly the trap I've been burned by. I can't tell which it means. Important word is not first, either -- I hear "1 to 3" before I hear what it's about. I'll take it as: size now follows number of connections. Part three, bigger dots, I believe is done -- with no spoken confirmation from the drawing. Now names on the drawing: "Label" is just a few Tabs on.

### Step: --key Tab

Before: Tab toward Label (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Detach Size"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab toward Label (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Remove Size"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab toward Label (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab toward Label (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Label"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter on Label.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: combobox "Find an attribute" expanded
(a screenshot was kept for the graders)
```

Morgan: Label opens "Find an attribute" again. I don't know what the name column is called in this dataset -- nobody has told me what attributes exist. I'll guess "name".

### Step: --type name

Before: Type name.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --type name
focus: combobox "Find an attribute" value "name" expanded
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Label position"
live: region (polite): "0 labels, 0 hidden to avoid overlap"
live: region (polite): "77 labels, 7 hidden to avoid overlap"
(a screenshot was kept for the graders)
```

Morgan: "77 labels, 7 hidden to avoid overlap." The first number this program has told me -- and it's how many labels, so I infer 77 characters. 7 hidden; acceptable, at least it says so. Which attribute did "name" match, though? Shift+Tab to hear the label setting.

### Step: --key Shift+Tab

Before: Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Add label line" disabled
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Label" disabled
(a screenshot was kept for the graders)
```

Morgan: "Label, disabled" and "Add label line, disabled". So the Label button is used up -- I assume because a label exists now -- but nothing says what the label shows. Tab forward past Label position to look for it.

### Step: --key Tab

Before: Tab forward (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add label line" disabled
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab forward (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Label position"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab forward (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Label, Above: name"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab forward (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Remove label line"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab forward (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Add Tooltip"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab forward (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```

Morgan: "Label, Above: name". Names written above the dots. Part four done -- on the program's word, since I can't see it. Last: a picture file with its key. That's an export, which I'd expect in the main menu. Tab around to Main menu and open it.

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab to Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Open Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: menuitem "Back to start"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "New project"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Open sample"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Save Ctrl+S"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Save as... Shift+Ctrl+S"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Save local copy..."
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Export... Ctrl+E"
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Arrow down the main menu (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Rename F2"
(a screenshot was kept for the graders)
```

Morgan: A proper menu with shortcuts read after each name: Back to start, New project, Open, Open sample, Save, Save as, Save local copy, "Export... Ctrl+E", Rename. Up one to Export and Enter. Writing Ctrl+E into my keystroke file.

### Step: --key ArrowUp

Before: Up to Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Export... Ctrl+E"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Enter on Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: button "Main menu"
(a screenshot was kept for the graders)
```

Morgan: Enter on Export put me back on the "Main menu" button. Did anything open? Nothing said so. Tab to find out.

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Tab.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

Morgan: Normal tab order, no export dialog in sight. Either it opened somewhere focus didn't go, or it did nothing. Try the shortcut it advertised: Ctrl+E. (I'm wary -- in some browsers Ctrl+E is the address bar search -- but the app claimed it.)

### Step: --key Control+e

Before: Ctrl+E for Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Control+e
focus: button "Undo"
(a screenshot was kept for the graders)
```

Morgan: Ctrl+E: silence, focus unchanged. Maybe an export panel opened somewhere without taking focus. One full pass with Tab to look for it; if it's not there, that's my second dead end on this part.

### Step: --key Tab

Before: Full Tab pass looking for an export panel (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Graph"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: treeitem "Connections" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (9).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (10).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (11).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "from Connections, Oct 6"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (12).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: button "Measure actions"
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (13).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

### Step: --key Tab

Before: Full Tab pass looking for an export panel (14).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Tab
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```

Morgan: Whole page, no export panel, no dialog. That's two dead ends in a row on export (menu item, then shortcut). One last honest try before I write it off: the menu again, and this time Space instead of Enter on Export, in case Enter got eaten.

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Measure actions"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "from Connections, Oct 6"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Analyze"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (8).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Hide Connections"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab back to Main menu (9).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: treeitem "Connections" selected
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Graph"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Local only"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Undo"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (6).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```

### Step: --key Shift+Tab

Before: Shift+Tab toward Main menu (7).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Shift+Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --key Enter

Before: Open Main menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key Enter
focus: menuitem "Back to start"
(a screenshot was kept for the graders)
```

### Step: --key End

Before: End key to jump to the bottom of the menu, then I'll walk up to Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key End
focus: menuitem "Help"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up (1).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Keyboard shortcuts ?"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up (2).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Settings... Ctrl+,"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up (3).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Rename F2"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up (4).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Export... Ctrl+E"
(a screenshot was kept for the graders)
```

### Step: --key ArrowUp

Before: Arrow up (5).

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowUp
focus: menuitem "Save local copy..."
(a screenshot was kept for the graders)
```

### Step: --key ArrowDown

Before: Down to Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key ArrowDown
focus: menuitem "Export... Ctrl+E"
(a screenshot was kept for the graders)
```

### Step: --key  

Before: Space on Export.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --key  
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step: --wait 2000

Before: Wait a moment for anything to open.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-2/sessions/r2-s07 --wait 2000
focus: button "Main menu"
(a screenshot was kept for the graders)
```

Morgan: Same again: Export closes the menu, focus lands on "Main menu", nothing opens, nothing is said. Three tries at export, three silences. I'm giving up on the picture. Ending the session.

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/rounds/round-2/sessions/r2-s07
session ended
```

## Debrief (in character)

**Did I finish?** No. Four of five parts, as far as the program's words tell me:

1. On screen: yes, the "Open the Les Miserables sample" button on the start page is named well and is fourth in the tab order. But it never said "loaded" or how big the network is. Focus jumped by itself to an unnamed "Canvas", and the only messages were "No nodes to draw" and "Reading Les Miserables" -- no "done". I first learned there are 77 characters from a label counter, much later.
2. Who matters most: yes, eventually -- Degree, which the program calls "Connections". It took two wrong turns: the analysis list never reads its options aloud (arrows say only "Filter analyses, combobox, expanded"), so my first pick ran Edge betweenness by accident. Then Down plus Enter did nothing once and worked another time. Plain Enter on the typed filter is what finally worked. No "finished" announcement for any run, and no place I found where I could read the ranking itself as a table.
3. Bigger dots: yes, via the result's Style tab, Add to Shape, Size, Size by attribute, typed "degree". The control reads back "1 to 3, variable Connections in degree". Along the way the Size field, which calls itself a combobox, dropped from 1 to 0 when I pressed Alt+Down to open it -- a combobox that is really a number box.
4. Names on the drawing: yes. Label, typed "name", and it said "77 labels, 7 hidden to avoid overlap" and the control reads "Label, Above: name". That counter was the best thing I heard all session.
5. Picture file with its key: no. "Export... Ctrl+E" is in the main menu, but choosing it with Enter or Space, and pressing Ctrl+E, all left me on the Main menu button with no dialog, no message and nothing new anywhere in the tab order. Three silences.

**What the sizes and colors stand for:** sizes stand for each character's number of connections (degree), running from size 1 to 3, if I read "1 to 3, variable Connections in degree" right. Colors: the Degree result colored the nodes on its own ("Connections, Color"), so color also stands for number of connections -- I never asked for it and was never told the scale or which color means what. I could not tell a colleague "the red ones are..." because no color names were ever said.

**Rating: 2 out of 7** (very difficult).

**What confused me or failed:**
- No spoken "loaded", no node or edge count up front, and focus moved by itself to an unnamed "Canvas" that says nothing on arrows or Enter.
- The Overview section exists ("Collapse Overview") but its content is not reachable by focus; the help dialog's shortcut text, likewise.
- The graph tree had only "Selection" and "Everything" at first; "Everything" would not open. After running analyses it grew items, but Tab lands on their "Hide ..." buttons, not on the items.
- Searchable lists (analyses, attributes) never say which option is active or how many match. I ran the wrong analysis because of it.
- Closing the help dialog dropped focus on the page itself, not back where I was.
- "Undo" was enabled before I had knowingly changed anything.
- "Sample size 1" on edge betweenness with no explanation of what is sampled; no word on normalization or directedness anywhere. "in degree" reads like in-degree.
- "Gravity minus 1.2000000476837158" on my braille display.
- Export does nothing that I can detect.

**Would I use this instead of my scripts?** Not today. NetworkX gives me the degree table in two lines and prints it. Here I never heard a single character's score. The labels counter and the clearly named menu show somebody is trying; the export and the silent lists are where it stops being usable for me.
