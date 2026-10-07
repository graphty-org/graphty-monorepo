# Session r2-s30 -- Morgan (screen-reader analyst), task T9 Prompt A (Les Miserables)

Screen-reader mode: keyboard only, reading the focus: and live: lines. No screenshots read.

## Step 0 -- start
Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s30 empty --sr`
Output: `focus: nothing (the page itself)`
Morgan: Page loaded. Nothing is focused and nothing was announced -- no title or status line spoken to me. I'll press Tab to learn the tab order.

## Step 1
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Main menu"
(a screenshot was kept for the graders)
```
Morgan: First stop is a Main menu button. Labelled, good. Keep tabbing to learn the order.
## Step 2
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Local only"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 3
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 4
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "New from data..."
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 5
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 6
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 7
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Open the College football sample"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
## Step 8
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Open the Florentine families sample"
(a screenshot was kept for the graders)
```
Morgan: (tabbing through to learn the order)
Morgan: Tab order: Main menu, Local only (a button -- I'd guess it tells me data stays on my machine, nice that it is right up front), Open project or file Ctrl+O, New from data, then four sample buttons: Les Miserables, Karate club, College football, Florentine families. All named. I want Les Miserables; I'll Shift+Tab back to check the order reverses.
## Step 9
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Open the College football sample"
(a screenshot was kept for the graders)
```
Morgan: Reverses cleanly. Two more Shift+Tabs to Les Miserables.
## Step 10
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```
## Step 11
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Open the Les Miserables sample"
(a screenshot was kept for the graders)
```
Morgan: On 'Open the Les Miserables sample'. Pressing Enter; I want to hear how big it is.
## Step 12
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: status (polite): "Reading Les Miserables"
(a screenshot was kept for the graders)
```
Morgan: Focus jumped onto an unnamed Canvas -- that's 'image' territory. It said 'No nodes to draw' then 'Reading Les Miserables', but nothing to say it finished or how big it is. I'll wait a moment and see if a done message comes.
## Step 13
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --wait 3000`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
Morgan: Silence. Never told me it finished or how many nodes. Persona rule: on the drawing press an arrow key and listen.
## Step 14
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowRight`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
Morgan: Arrow says nothing. Try Enter on the canvas.
## Step 15
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
Morgan: Enter: nothing. Canvas is dead to me. Tab out and look for a panel or a table, and something that computes importance.
## Step 16
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Analyze"
(a screenshot was kept for the graders)
```
Morgan: An 'Analyze' button right after the canvas. That's the most promising word for 'which characters matter most'. Enter.
## Step 17
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```
Morgan: A 'Filter analyses' combobox, open. 'Depends on most' is betweenness to me -- who sits on the paths between everyone else. I'll type it.
## Step 18
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --type betweenness`
```
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```
Morgan: No word on how many matched. ArrowDown to hear what is in the list.
## Step 19
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```
Morgan: ArrowDown said nothing -- no option read out. I don't know what's highlighted. I'll risk Enter; worst case it picks the one match.
## Step 20
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: button "Run"
(a screenshot was kept for the graders)
```
Morgan: Focus landed on a 'Run' button. Run what? It never told me which analysis I picked. Shift+Tab to read what's above it before I run anything.
## Step 21
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```
Morgan: 'Expand Advanced'. Keep going back.
## Step 22
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Back to analyses"
(a screenshot was kept for the graders)
```
Morgan: 'Back to analyses' -- so I'm inside one analysis, but its name has never been spoken to me. Once more back.
## Step 23
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Run"
(a screenshot was kept for the graders)
```
Morgan: Another 'Run' -- before 'Back to analyses'? Two Run buttons that sound the same; I can't tell them apart. Shift+Tab once more to see what's before this one.
## Step 24
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```
Morgan: It loops: Run, Back to analyses, Expand Advanced, Run. Three controls in a ring, and the analysis name is not among them. It's the same Run each time, I think. Running is not destructive, so I'll Tab to Run and press it, and listen for what it says it computed.
## Step 25
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Run"
(a screenshot was kept for the graders)
```
## Step 26
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: button "Analyze"
live: status (polite): "Edge betweenness added, running"
(a screenshot was kept for the graders)
```
Morgan: 'Edge betweenness added, running.' Damn -- Enter picked edge betweenness, which scores the links, not the characters. That is the first time I heard which analysis I'd picked, after it was already running. Focus jumped back to Analyze on its own. Let me wait to hear it finish, then go back and find node betweenness.
## Step 27
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --wait 3000`
```
focus: button "Analyze"
(a screenshot was kept for the graders)
```
Morgan: No 'done' message. Told me it started, never that it finished. Back into Analyze; this time I'll filter and then Tab instead of Enter, to hear the list items.
## Step 28
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```
## Step 29
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --type betweenness`
```
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```
## Step 30
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Clear search"
(a screenshot was kept for the graders)
```
Morgan: 'Clear search'. Tab again for the results.
## Step 31
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Filter analyses" value "betweenness" expanded
(a screenshot was kept for the graders)
```
Morgan: Tab just rings between the filter and Clear search. The results are not reachable by Tab, and arrows don't read them. I'm searching blind. I'll narrow the search so only one thing can match: add the word 'centrality'.
## Step 32
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --type  centrality`
```
focus: combobox "Filter analyses" value "betweenness centrality" expanded
(a screenshot was kept for the graders)
```
Morgan: Still no match count. Enter, and I'll check the name it announces when it runs.
## Step 33
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: button "Run"
(a screenshot was kept for the graders)
```
Morgan: On Run again, still unnamed. Pressing it; the announcement is my only way to find out what I chose.
## Step 34
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: button "Analyze"
live: status (polite): "Betweenness added, running"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```
Morgan: 'Betweenness added, running.' That's the one I wanted, I think -- plain betweenness, presumably of characters. Whether it changed dot sizes, I can't tell. Tab onward to find a results list or a description of the drawing.
## Step 35
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```
Morgan: 'From Les Miserables' -- a button whose name doesn't say what it does. Keep tabbing.
## Step 36
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Graph actions"
(a screenshot was kept for the graders)
```
Morgan: 'Graph actions'. Keep going.
## Step 37
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: tab "Values" selected
(a screenshot was kept for the graders)
```
Morgan: A tab called 'Values', selected. Maybe a table. Tab into its panel.
## Step 38
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```
Morgan: 'Collapse Overview, expanded'. An overview section is open; its text isn't focusable, so I only hear the button. Tab on.
## Step 39
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```
Morgan: A resize handle, 'Resize inspector 240'. Not for me. Tab.
## Step 40
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```
Morgan: Fell off the end of the page. The inspector's content had nothing to land on. Back to the 'Values' tab and arrow across to hear the other tabs.
## Step 41
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```
## Step 42
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Collapse Overview" expanded
(a screenshot was kept for the graders)
```
## Step 43
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: tab "Values" selected
(a screenshot was kept for the graders)
```
## Step 44
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowRight`
```
focus: tab "Style" selected
(a screenshot was kept for the graders)
```
Morgan: Second tab is 'Style', now selected. Sizes and colors live here, surely. Tab into it.
## Step 45
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Canvas" expanded
(a screenshot was kept for the graders)
```
Morgan: 'Collapse Canvas'. Tab.
## Step 46
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Color swatch"
(a screenshot was kept for the graders)
```
## Step 47
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: textbox "Color hex value" value "F5F5F5"
(a screenshot was kept for the graders)
```
## Step 48
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Reset Background to default"
(a screenshot was kept for the graders)
```
Morgan: Background color controls: 'Color swatch' (unhelpful name), hex F5F5F5, reset. Not about the dots. Keep tabbing.
## Step 49
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Method" value "Force - Recommended"
(a screenshot was kept for the graders)
```
## Step 50
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: radio "3D" checked
(a screenshot was kept for the graders)
```
## Step 51
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: spinbutton "Spring length" value "30"
(a screenshot was kept for the graders)
```
## Step 52
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: spinbutton "Gravity" value "-1.2000000476837158"
(a screenshot was kept for the graders)
```
Morgan: Layout controls: Method Force, 3D, Spring length 30, and Gravity read as minus one point two zero zero zero zero zero zero four seven six eight... -- a floating-point leak read out digit by digit. Keep tabbing for node size.
## Step 53
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Expand Advanced"
(a screenshot was kept for the graders)
```
## Step 54
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: separator "Resize inspector" value "240"
(a screenshot was kept for the graders)
```
## Step 55
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```
## Step 56
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Main menu"
(a screenshot was kept for the graders)
```
## Step 57
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Project: Les Miserables"
(a screenshot was kept for the graders)
```
Morgan: The Style tab is only background and layout -- nothing about dot size or color. Wrapped round to the top: Main menu, then 'Project: Les Miserables'. Tab on to map the rest.
## Step 58
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Undo"
(a screenshot was kept for the graders)
```
## Step 59
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Redo" disabled
(a screenshot was kept for the graders)
```
## Step 60
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Local only"
(a screenshot was kept for the graders)
```
Morgan: Undo, Redo (disabled), Local only. Tab.
## Step 61
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Graph"
(a screenshot was kept for the graders)
```
## Step 62
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Find"
(a screenshot was kept for the graders)
```
## Step 63
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: treeitem "Selection"
(a screenshot was kept for the graders)
```
Morgan: 'Graph' button, a 'Find' combobox, then a tree, first item 'Selection'. A tree I can arrow through -- this may be where the results live. ArrowDown.
## Step 64
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: treeitem "Bridges"
(a screenshot was kept for the graders)
```
## Step 65
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: treeitem "Bridge edges"
(a screenshot was kept for the graders)
```
## Step 66
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```
## Step 67
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: treeitem "Everything"
(a screenshot was kept for the graders)
```
Morgan: Tree is: Selection, Bridges, Bridge edges, Everything. So 'Bridges' must be the betweenness of characters and 'Bridge edges' the edge one I ran by mistake. Nobody told me the tool renamed betweenness to 'Bridges'; I'm inferring. No expanded/collapsed state is read, so I don't know if they open. Up to Bridges and try ArrowRight.
## Step 68
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowUp`
```
focus: treeitem "Bridge edges"
(a screenshot was kept for the graders)
```
## Step 69
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowUp`
```
focus: treeitem "Bridges"
(a screenshot was kept for the graders)
```
## Step 70
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowRight`
```
focus: treeitem "Bridges"
(a screenshot was kept for the graders)
```
Morgan: ArrowRight did nothing on Bridges. Try Enter -- maybe it shows its result in the inspector.
## Step 71
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: treeitem "Bridges" selected
(a screenshot was kept for the graders)
```
Morgan: 'Bridges, selected.' No announcement of what that did. I'll Tab forward to see if the inspector now has something about it.
## Step 72
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Hide Bridges"
(a screenshot was kept for the graders)
```
Morgan: 'Hide Bridges' -- a per-row control. Tab on.
## Step 73
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```
## Step 74
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```
## Step 75
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
Morgan: Hide Bridge edges, left panel resize, the silent canvas. Continue past Analyze to the inspector and see whether it changed now that Bridges is selected.
## Step 76
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```
## Step 77
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "from Bridges, Oct 7"
(a screenshot was kept for the graders)
```
## Step 78
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
## Step 79
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: tab "Style" selected
(a screenshot was kept for the graders)
```
## Step 80
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```
Morgan: The inspector changed: 'from Bridges, Oct 7', 'Measure actions', a Style tab, and a radio 'Nodes, set' checked. So Bridges is a 'measure'. Tab on to find size and color.
## Step 81
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add Opacity"
(a screenshot was kept for the graders)
```
## Step 82
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Bridges, Color"
(a screenshot was kept for the graders)
```
## Step 83
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Detach Color"
(a screenshot was kept for the graders)
```
## Step 84
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Remove Color"
(a screenshot was kept for the graders)
```
Morgan: 'Add Opacity', then 'Bridges, Color' with Detach and Remove. So right now Bridges drives the color of the dots, not the size. I need size. Tab on looking for 'Add Size'.
## Step 85
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```
## Step 86
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```
## Step 87
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Label"
(a screenshot was kept for the graders)
```
## Step 88
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add label line"
(a screenshot was kept for the graders)
```
Morgan: 'Add to Shape', 'Add to Effects', 'Label', 'Add label line'. No 'Size' by name. Size is probably part of Shape. Back two and press 'Add to Shape'.
## Step 89
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Label"
(a screenshot was kept for the graders)
```
## Step 90
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```
## Step 91
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: menuitem "Outline"
(a screenshot was kept for the graders)
```
Morgan: My miscount -- I opened 'Add to Effects', a menu starting at 'Outline'. Escape, back one to 'Add to Shape', Enter.
## Step 92
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Escape`
```
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```
Morgan: Escape returned focus to the button. Good.
## Step 93
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```
## Step 94
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: menuitem "Size"
(a screenshot was kept for the graders)
```
Morgan: Menu opens on 'Size'. Exactly what I want. Enter.
## Step 95
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: combobox "Size" value "1"
(a screenshot was kept for the graders)
```
Morgan: A 'Size' combobox with value 1. That sounds like one fixed size for all, not size by Bridges. It's a combobox, so open it with Alt+ArrowDown and hear the choices.
## Step 96
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Alt+ArrowDown`
```
focus: combobox "Size" value "0"
(a screenshot was kept for the graders)
```
Morgan: Alt+ArrowDown didn't open anything -- it changed the value from 1 to 0. So it's announced as a combobox but behaves like a number field. Zero size can't be good. ArrowUp to put it back to 1.
## Step 97
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowUp`
```
focus: combobox "Size" value "1"
(a screenshot was kept for the graders)
```
Morgan: Back to 1. The Color row said 'Bridges, Color', meaning it's tied to Bridges. This Size row is just a number. Tab around it to see if there's a control that ties it to Bridges.
## Step 98
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Size by attribute"
(a screenshot was kept for the graders)
```
## Step 99
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Remove Size"
(a screenshot was kept for the graders)
```
Morgan: 'Size by attribute', then 'Remove Size'. 'Size by attribute' is the one. Back and Enter.
## Step 100
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Size by attribute"
(a screenshot was kept for the graders)
```
## Step 101
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: combobox "Find an attribute" expanded
(a screenshot was kept for the graders)
```
Morgan: 'Find an attribute', open. Same kind of list I couldn't hear before. ArrowDown first, in case this one reads its options.
## Step 102
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: combobox "Find an attribute" expanded
(a screenshot was kept for the graders)
```
Morgan: ArrowDown again reads nothing -- same silent list as the analyses filter. I'll type the name I expect, 'Bridges', to narrow it.
## Step 103
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --type Bridges`
```
focus: combobox "Find an attribute" value "Bridges" expanded
(a screenshot was kept for the graders)
```
Morgan: No match count again. Enter and see what it says.
## Step 104
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: button "1 to 3, variable Bridges"
(a screenshot was kept for the graders)
```
Morgan: 'Size: 1 to 3, variable Bridges.' That is the sentence I wanted: size now goes from 1 to 3 by Bridges. The sizing part is done, if Bridges really is betweenness. Now the colors: go back up to 'Bridges, Color' and open it to hear what it maps to.
## Step 105
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add Shape"
(a screenshot was kept for the graders)
```
Morgan: 'Add Shape'. Further back.
## Step 106
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Remove Color"
(a screenshot was kept for the graders)
```
## Step 107
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Detach Color"
(a screenshot was kept for the graders)
```
## Step 108
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Bridges, Color"
(a screenshot was kept for the graders)
```
Morgan: On 'Bridges, Color'. It doesn't say what colors -- a ramp from what to what. Enter to open it.
## Step 109
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: dialog "Color from data"
(a screenshot was kept for the graders)
```
Morgan: A dialog, 'Color from data'. Tab through it.
## Step 110
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Close panel"
(a screenshot was kept for the graders)
```
## Step 111
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Change source"
(a screenshot was kept for the graders)
```
## Step 112
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Scale" value "Linear"
(a screenshot was kept for the graders)
```
## Step 113
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Palette"
(a screenshot was kept for the graders)
```
Morgan: Close panel, Change source, Scale Linear, and 'Palette' with no value read -- I can't tell which colors. Tab on.
## Step 114
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: checkbox "Reverse"
(a screenshot was kept for the graders)
```
## Step 115
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: checkbox "Values from the data" checked
(a screenshot was kept for the graders)
```
## Step 116
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "No value" value "Leave as is"
(a screenshot was kept for the graders)
```
## Step 117
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Detach"
(a screenshot was kept for the graders)
```
Morgan: Reverse (unchecked), 'Values from the data' (checked), 'No value: Leave as is', Detach. So color is a linear ramp over Bridges values, but the palette's colors are never named. I know color stands for Bridges; I cannot say which end is which color. Escape out, then check what 'Bridges' actually is.
## Step 118
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Escape`
```
focus: nothing (the page itself)
(a screenshot was kept for the graders)
```
Morgan: Escape closed the dialog and dropped my focus on nothing. Lost my place -- exactly what I hate. Shift+Tab from the end of the page to climb back into the inspector.
## Step 119
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add Tooltip"
(a screenshot was kept for the graders)
```
Morgan: 'Add Tooltip' -- somewhere below the size row. Climb up to 'Measure actions'.
## Step 120
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add label line"
(a screenshot was kept for the graders)
```
## Step 121
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Label"
(a screenshot was kept for the graders)
```
## Step 122
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Effects"
(a screenshot was kept for the graders)
```
## Step 123
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Remove Size"
(a screenshot was kept for the graders)
```
## Step 124
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Detach Size"
(a screenshot was kept for the graders)
```
## Step 125
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "1 to 3, variable Bridges"
(a screenshot was kept for the graders)
```
Morgan: Passing the size row again: '1 to 3, variable Bridges', Detach Size, Remove Size -- it held. Note this button's name doesn't start with the word 'Size'; the color one starts 'Bridges, Color'. Two different word orders. Keep climbing.
## Step 126
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add Shape"
(a screenshot was kept for the graders)
```
## Step 127
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Remove Color"
(a screenshot was kept for the graders)
```
## Step 128
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Detach Color"
(a screenshot was kept for the graders)
```
## Step 129
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Bridges, Color"
(a screenshot was kept for the graders)
```
## Step 130
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add Opacity"
(a screenshot was kept for the graders)
```
## Step 131
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
```
## Step 132
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: tab "Style" selected
(a screenshot was kept for the graders)
```
## Step 133
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
Morgan: On 'Measure actions'. Open it -- maybe it has an 'about' or a definition of Bridges.
## Step 134
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: menuitem "Move up Already at the top Alt+ArrowUp" disabled
(a screenshot was kept for the graders)
```
Morgan: First item 'Move up, Already at the top, Alt+ArrowUp', disabled. Arrow through the rest.
## Step 135
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: menuitem "Move down Alt+ArrowDown"
(a screenshot was kept for the graders)
```
## Step 136
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: menuitem "Delete Delete"
(a screenshot was kept for the graders)
```
## Step 137
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: menuitem "Move down Alt+ArrowDown"
(a screenshot was kept for the graders)
```
## Step 138
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: menuitem "Delete Delete"
(a screenshot was kept for the graders)
```
## Step 139
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: menuitem "Move down Alt+ArrowDown"
(a screenshot was kept for the graders)
```
Morgan: Only Move up, Move down, Delete ('Delete Delete' -- the key name read after the label). Nothing that explains Bridges. Escape, then try the 'from Bridges, Oct 7' button just above.
## Step 140
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Escape`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
## Step 141
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "from Bridges, Oct 7"
(a screenshot was kept for the graders)
```
Morgan: Enter on 'from Bridges, Oct 7'.
## Step 142
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```
Morgan: It opened the analyses search again, 'Filter analyses'. Tab to see if it's showing the Bridges analysis and its settings.
## Step 143
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```
## Step 144
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: combobox "Filter analyses" expanded
(a screenshot was kept for the graders)
```
Morgan: Tab stays on the filter -- a one-control loop. Escape to get out.
## Step 145
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Escape`
```
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```
Morgan: Escape put me on Analyze. Fine. I also ran edge betweenness by mistake ('Bridge edges'); I need to know if it is painting the links. Back to the tree.
## Step 146
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
## Step 147
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```
## Step 148
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```
## Step 149
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Hide Bridges"
(a screenshot was kept for the graders)
```
## Step 150
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: treeitem "Bridges" selected
(a screenshot was kept for the graders)
```
Morgan: Back on 'Bridges, selected'. Down to 'Bridge edges', Enter, then Tab to its style.
## Step 151
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowDown`
```
focus: treeitem "Bridge edges"
(a screenshot was kept for the graders)
```
## Step 152
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: treeitem "Bridge edges" selected
(a screenshot was kept for the graders)
```
Morgan: Selected. Tab past the canvas into the inspector.
## Step 153
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```
## Step 154
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```
## Step 155
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
## Step 156
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Analyze"
(a screenshot was kept for the graders)
```
## Step 157
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "from Bridge edges, Oct 7"
(a screenshot was kept for the graders)
```
## Step 158
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
## Step 159
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: tab "Style" selected
(a screenshot was kept for the graders)
```
## Step 160
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: radio "Edges, set" checked
(a screenshot was kept for the graders)
```
## Step 161
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Line"
(a screenshot was kept for the graders)
```
Morgan: Bridge edges applies to 'Edges, set', then 'Add to Line'. Tab on to hear whether it paints anything.
## Step 162
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Bridge edges, Color"
(a screenshot was kept for the graders)
```
## Step 163
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Detach Color"
(a screenshot was kept for the graders)
```
## Step 164
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Remove Color"
(a screenshot was kept for the graders)
```
## Step 165
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Arrows"
(a screenshot was kept for the graders)
```
Morgan: 'Bridge edges, Color' -- so my mistaken run colors the links by edge betweenness. I'll leave it and report it rather than press Delete. One last check: the Values tab, to see if it defines these numbers. Back to the tab and ArrowLeft.
## Step 166
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Remove Color"
(a screenshot was kept for the graders)
```
## Step 167
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Detach Color"
(a screenshot was kept for the graders)
```
## Step 168
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Bridge edges, Color"
(a screenshot was kept for the graders)
```
## Step 169
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Line"
(a screenshot was kept for the graders)
```
## Step 170
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: radio "Edges, set" checked
(a screenshot was kept for the graders)
```
## Step 171
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowLeft`
```
focus: radio "Nodes" checked
(a screenshot was kept for the graders)
```
## Step 172
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Fill"
(a screenshot was kept for the graders)
```
## Step 173
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Shape"
(a screenshot was kept for the graders)
```
Morgan: Miscounted -- I was on the radio, not the tab, and ArrowLeft flipped it from 'Edges, set' to 'Nodes'. A radio that changes what a style applies to the instant I arrow over it. Now the rows say 'Add to Fill', 'Add to Shape'; the edge color row is gone from view. Put it back: Shift+Tab to the radio, ArrowRight.
## Step 174
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Fill"
(a screenshot was kept for the graders)
```
## Step 175
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: radio "Nodes" checked
(a screenshot was kept for the graders)
```
## Step 176
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowRight`
```
focus: radio "Edges, set" checked
(a screenshot was kept for the graders)
```
## Step 177
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Add to Line"
(a screenshot was kept for the graders)
```
## Step 178
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Bridge edges, Color"
(a screenshot was kept for the graders)
```
Morgan: Restored: 'Edges, set' and 'Bridge edges, Color' are back. Now carefully to the Style tab (three back) and ArrowLeft to Values.
## Step 179
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Add to Line"
(a screenshot was kept for the graders)
```
## Step 180
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: radio "Edges, set" checked
(a screenshot was kept for the graders)
```
## Step 181
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: tab "Style" selected
(a screenshot was kept for the graders)
```
## Step 182
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowLeft`
```
focus: tab "Values" selected
(a screenshot was kept for the graders)
```
## Step 183
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Values" expanded
(a screenshot was kept for the graders)
```
## Step 184
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Top 10" expanded
(a screenshot was kept for the graders)
```
## Step 185
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "13 536"
(a screenshot was kept for the graders)
```
Morgan: Values tab: 'Values' section, a 'Top 10' section, and a first row that is a button called '13 536'. Thirteen and 536? Rank 13? Edge 13 with score 536? No column headers, no names. Tab a couple more.
## Step 186
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "112 242.8"
(a screenshot was kept for the graders)
```
## Step 187
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "47 223"
(a screenshot was kept for the graders)
```
Morgan: '112 242.8', '47 223'. Bare number pairs, no words -- links have no names so I guess these are link numbers and scores, but it never says. Let me look at the same list for Bridges, the characters: back to the tree, select Bridges, then the inspector.
## Step 188
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "112 242.8"
(a screenshot was kept for the graders)
```
## Step 189
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "13 536"
(a screenshot was kept for the graders)
```
## Step 190
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Collapse Top 10" expanded
(a screenshot was kept for the graders)
```
## Step 191
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Collapse Values" expanded
(a screenshot was kept for the graders)
```
## Step 192
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: tab "Values" selected
(a screenshot was kept for the graders)
```
## Step 193
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
## Step 194
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "from Bridge edges, Oct 7"
(a screenshot was kept for the graders)
```
## Step 195
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Analyze"
(a screenshot was kept for the graders)
```
## Step 196
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
## Step 197
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```
## Step 198
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```
## Step 199
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Shift+Tab`
```
focus: treeitem "Bridge edges" selected
(a screenshot was kept for the graders)
```
Morgan: In the tree. Up to Bridges, Enter, then Tab my way to its Values tab -- eight tabs, I counted the order earlier.
## Step 200
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key ArrowUp`
```
focus: treeitem "Bridges"
(a screenshot was kept for the graders)
```
## Step 201
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Enter`
```
focus: treeitem "Bridges" selected
(a screenshot was kept for the graders)
```
## Step 202
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Hide Bridges"
(a screenshot was kept for the graders)
```
## Step 203
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Hide Bridge edges"
(a screenshot was kept for the graders)
```
## Step 204
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
```
## Step 205
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: Canvas (no name)
(a screenshot was kept for the graders)
```
## Step 206
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
```
## Step 207
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "from Bridges, Oct 7"
(a screenshot was kept for the graders)
```
## Step 208
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Measure actions"
(a screenshot was kept for the graders)
```
## Step 209
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: tab "Values" selected
(a screenshot was kept for the graders)
```
Morgan: Values tab, remembered. Tab into Top 10.
## Step 210
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Values" expanded
(a screenshot was kept for the graders)
```
## Step 211
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Collapse Top 10" expanded
(a screenshot was kept for the graders)
```
## Step 212
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Valjean 1,624"
(a screenshot was kept for the graders)
```
## Step 213
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Myriel 504"
(a screenshot was kept for the graders)
```
## Step 214
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s30 --key Tab`
```
focus: button "Gavroche 470.6"
(a screenshot was kept for the graders)
```
Morgan: Now that's readable: 'Valjean 1,624', 'Myriel 504', 'Gavroche 470.6'. Name first, then the score. Valjean at 1,624 looks like raw (unnormalised) betweenness -- NetworkX's default would say about 0.57 -- but nowhere has the tool told me it's raw, or that 'Bridges' means betweenness. I have what I need. Ending.

## End
Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s30`
Output: `session ended`

## Debrief (Morgan, in character)

**Did I finish?** Yes, mostly. The character dots are now sized by "Bridges" (the size row reads
"1 to 3, variable Bridges"), and I'm fairly sure Bridges is betweenness: it showed up in the list
right after the tool said "Betweenness added, running". Its top three are Valjean 1,624, Myriel 504
and Gavroche 470.6. Valjean has the biggest dot.

**What the sizes and colors stand for, as far as I can tell:**
- Dot size: Bridges (betweenness, the raw count by the look of it), from size 1 to size 3.
- Dot color: also Bridges, a linear color ramp. The tool never said which colors, so I can't
  tell you which end is which. I'd have to ask a sighted colleague.
- Link color: "Bridge edges" (edge betweenness). That's there because my first pick ran the wrong
  analysis, and I left it rather than press Delete.

**Rating:** 3 of 7. I got there, but by inference and by counting Tab presses, not because the
tool told me.

**What confused me or failed:**
1. On load, focus went onto an unnamed "Canvas". Arrows and Enter on it said nothing. It said
   "Reading Les Miserables" but never said it had finished, and never said how big the graph is.
2. The analysis list doesn't read its options. Typed "betweenness", pressed ArrowDown: silence.
   Enter picked "Edge betweenness". I only learned what I'd picked from the "added, running"
   message, after it was already running. Same silent list under "Size by attribute".
3. Inside an analysis, Tab loops through Run, Back to analyses and Expand Advanced. The
   analysis's own name is never spoken, so "Run" doesn't tell me what it will run.
4. "Betweenness" came back as "Bridges" and "Edge betweenness" as "Bridge edges". Nothing told me
   about the rename. Nothing says whether the numbers are normalized; 1,624 is clearly raw.
5. Runs announce "running" and never "done".
6. The "Size" field is announced as a combobox but behaves like a number field. Alt+ArrowDown
   changed it from 1 to 0 instead of opening it.
7. The Palette combobox reads with no value, so the colors are never named.
8. Closing the "Color from data" dialog with Escape dropped focus onto nothing. I lost my place.
9. The "Nodes / Edges" radio applies the moment I arrow onto it. One stray ArrowLeft moved the
   edge style onto nodes. I caught it and moved it back, but it was silent about what it did.
10. The Top 10 for links reads as bare numbers ("13 536"), with no words.
11. Gravity reads as "-1.2000000476837158".
12. "from Bridges, Oct 7" is a button whose name doesn't say what it does. It took me to an
    analyses search that Tab couldn't leave.

**Good:** Every control I reached had a name. Tab and Shift+Tab reversed cleanly. "Local only"
was right up front. Escape closed menus and returned focus to their buttons. The characters' Top
10 reads name first, then score, which is what I want.

**Would I use it instead of my scripts?** Not for this. `nx.betweenness_centrality` gives me the
same ranking with its definition stated. The only use I'd have for it is handing a sighted
colleague a drawing that's already sized, and I couldn't check that drawing's colors myself.
