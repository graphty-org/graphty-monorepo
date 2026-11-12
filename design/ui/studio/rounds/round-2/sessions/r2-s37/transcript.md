# Session r2-s37 -- Morgan (screen-reader analyst), task T14: Stop for the day and come back

Screen-reader mode: blind, keyboard only, reading only the focus: and live: lines.

**Before:** Arriving at the app with yesterday's work set up. I will listen to what has focus.

```
node real.mjs --start /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 setup:/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/setups/T14.txt --sr
focus: button "Analyze"
commit 4a7a1a7fbdbad448bc9125d8423b71b57d87ad06, build 4a7a1a7fbdba graphty@0.8.53
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Focus is on an Analyze button; I hear nothing about the PageRank result. Before saving I want the keyboard shortcuts, so I press the question mark.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Slash
--key takes a key name such as Enter, Escape, ArrowDown, F2, a, or a chord such as Control+f; not "Shift+Slash"
(exit 2)
```

**Before:** Retrying the question mark key with its own name.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ?
focus: button "Close"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Something opened and focus is on a Close button, but nobody told me what this dialog is. I Tab to hear what is in it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: gridcell "All"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A grid cell called All -- probably a shortcut table with a category filter. I arrow down to read rows.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: gridcell "Project"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A category called Project -- that is where saving should be. I press Enter to pick it, then Tab to the list.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: gridcell "Project"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Tab onward to reach the shortcut rows.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Done"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Tab jumped straight to Done -- the shortcut rows are not in the tab order. Back with Shift+Tab and try ArrowRight in the grid.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: gridcell "Project"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** ArrowRight to move from the category column into the shortcut list.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowRight
focus: gridcell "Project"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** ArrowRight says nothing new; I cannot read the actual shortcuts in this list. Dead end. Escape out.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Escape
focus: button "Analyze"
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Focus came back to Analyze, good. I try the usual save key, Control+S.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Control+s
focus: textbox "Name" value "Les Miserables"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Control+S put me in a text box called Name, holding Les Miserables. I want my own name, so I select all first.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Control+a
focus: textbox "Name" value "Les Miserables"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Typing my name for the project.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --type Les Mis PageRank Morgan
focus: textbox "Name" value "Les Mis PageRank Morgan"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Name is right. Before committing I Tab to hear what else this dialog offers and where the file goes.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Cancel"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Cancel. One more Tab for the confirm button.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Save"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Save button. Nothing told me where the file will go, but Save it is. Enter.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: button "Analyze"
live: alert (assertive): "Saved Les Mis PageRank Morgan in this browser."
the drawing is still moving (the canvas kept changing for a second with no input)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** An alert: Saved Les Mis PageRank Morgan in this browser. Good -- it says where. Saving part done. Now to close it for the day; I Shift+Tab backward from Analyze to find a menu.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Canvas, no name. That is the drawing, and it tells me nothing. Keep going backward.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A panel resize handle. Not mine. Backward again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: treeitem "Everything" selected
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A tree with Everything selected -- the layer list I guess. Backward more to reach the top bar.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Hide Influence"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Hide Influence -- so yesterday's PageRank lives as a row called Influence. Noted for checking later. Backward again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: combobox "Find"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A Find box. Backward again for the main menu.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Graph"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A button called Graph. Still looking for the project menu; backward once more.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Local only"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Local only -- a reassuring name, probably the data-stays-here status. Backward once more.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Redo" disabled
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Redo, disabled. Undo will be next; the menu should be near the start. Backward again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Undo"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Undo. Backward again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Project: Les Mis PageRank Morgan"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Project: Les Mis PageRank Morgan -- my name is there, and this is likely the project menu. Enter.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: textbox "Project name" value "Les Mis PageRank Morgan"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** That only made the name editable -- a rename box, not a menu. Escape to leave it unchanged.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Escape
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Escape dropped my focus onto the page itself -- I am nowhere. Tab to find my feet from the top.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Project: Les Mis PageRank Morgan"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Back on the project name button; the name is unchanged. Something before it? Shift+Tab.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Main menu, first thing on the page. Open it with Enter.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: menuitem "Back to start"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** First item: Back to start. Before choosing I arrow down to hear the rest of the menu.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "New project"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** New project. Keep listening.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Open project or file, Control+O -- a shortcut I will want tomorrow. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Open sample"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Open sample. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Open recent"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Open recent -- that is how I will come back. I keep going to see if there is a Close.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Save Ctrl+S"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Save, Control+S. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Save as... Shift+Ctrl+S"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Save as. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Save local copy..."
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Save local copy -- I wonder how that differs from Save, which said it saved in this browser. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Export... Ctrl+E"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Export, Control+E. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Rename F2"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Rename, F2. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Settings... Ctrl+,"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Settings. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Keyboard shortcuts ?"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Keyboard shortcuts. Next.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Help"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Help. One more to see if it wraps.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: menuitem "Back to start"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** It wrapped. There is no Close; Back to start is the nearest thing to putting the project away. I saved already, so Enter.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Silence, and focus is on the page itself. Nothing told me the project closed. Tab to find out where I am.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Main menu again. Tab once more: does the project button still carry my name?

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** The Project button with my name is gone, so I infer the project closed -- inferred, not told. Putting-away part done. Now I close the tab for the night and open the app again as tomorrow.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --reopen
closed the tab and opened the app again in a new tab (the same browser storage)
focus: nothing (the page itself)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Tomorrow. The page loaded with focus nowhere and nothing spoken. I Tab to learn what the start screen offers.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Main menu. I keep tabbing to see if the start page lists my recent work directly.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Local only"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Local only. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Open project or file... Ctrl+O"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Open project or file. Tab on, hoping for a recent list on this page.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "New from data..."
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** New from data. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: gridcell "Les Mis PageRank Morgan In this browser - 77 nodes - Oct 7, 2026, 12:11 AM"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** There it is, name first: Les Mis PageRank Morgan, in this browser, 77 nodes, with the time. Good wording. Enter to open it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: alert (assertive): "Opened Les Mis PageRank Morgan"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Two messages: No nodes to draw, then Opened Les Mis PageRank Morgan. The first one worries me -- are my 77 nodes there? Focus is on the nameless canvas again. Shift+Tab to the side panel to check for my Influence row.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Resize handle. Backward again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: button "Hide Influence"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Backward again, looking for Hide Influence.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab
focus: treeitem "Selection"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Hide Influence is back, so the PageRank row survived. Now a tree item called Selection, where yesterday it said Everything, selected. I arrow down the tree to hear what is in it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: treeitem "Influence"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Influence. Down again.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowDown
focus: treeitem "Everything"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Everything, no longer marked selected. My name labels were on Everything's Style tab, so I press Enter to select it and then go look for the label line.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Enter
focus: treeitem "Everything" selected
live: region (polite): "77 labels, 7 hidden to avoid overlap"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** It said 77 labels, 7 hidden to avoid overlap -- so the names are drawn again. I still want to hear that the label is the name. Tab forward to the details panel.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: separator "Resize left panel" value "240"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Resize handle. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: Canvas (no name)
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Nameless canvas. Tab on to the panel past it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Analyze"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Analyze. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: tab "Style" selected
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Style tab, selected -- same tab I used yesterday. Tab into its contents to find the label line.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: radio "Nodes, set" checked
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Nodes, set, checked. Not sure what set means here. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Add Opacity"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Add Opacity. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Color swatch"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Color swatch -- which color, it does not say. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: textbox "Color hex value" value "6366F1"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Hex 6366F1. Fine. Tab on toward the labels.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: textbox "Opacity" value "100"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Opacity 100. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Color by attribute"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Color by attribute. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: combobox "Size" value "1"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Size 1. Tab on; labels should be soon.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Size by attribute"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Size by attribute. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Shape Icosphere"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Shape Icosphere. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Add to Effects"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Add to Effects. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Label" disabled
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A button Label, disabled. Odd -- does disabled mean my label is gone? Tab on to see.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Add label line" disabled
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Add label line, also disabled. Tab on for the line itself.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Label position"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Label position. Tab on.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Label, Above: name"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Label, Above: name -- my name labels are back, bound to name. Labels checked. Last: the PageRank numbers themselves. I want to get to the Influence row; I try F6 to jump between panels rather than tabbing back seventeen times.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key F6
focus: button "Label, Above: name"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** F6 does nothing. I hold Shift+Tab back through the panel (18 presses) to the layer tree.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: button "Label position"
focus: button "Add label line" disabled
focus: button "Label" disabled
focus: button "Add to Effects"
focus: button "Shape Icosphere"
focus: button "Size by attribute"
focus: combobox "Size" value "1"
focus: button "Color by attribute"
focus: textbox "Opacity" value "100"
focus: textbox "Color hex value" value "6366F1"
focus: button "Color swatch"
focus: button "Add Opacity"
focus: radio "Nodes, set" checked
focus: tab "Style" selected
focus: button "Analyze"
focus: Canvas (no name)
focus: separator "Resize left panel" value "240"
focus: treeitem "Everything" selected
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** On Everything. Up one to Influence and Enter, to see if it shows me the PageRank values.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key ArrowUp --key Enter
focus: treeitem "Influence"
focus: treeitem "Influence" selected
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Influence selected, silently. I Tab past the handle, canvas and Analyze into the panel to hear what Influence holds.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Hide Influence"
focus: separator "Resize left panel" value "240"
focus: Canvas (no name)
focus: button "Analyze"
focus: button "from Influence, Oct 7"
focus: button "Measure actions"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A button from Influence, Oct 7, then Measure actions. Still no numbers. Tab a few more for a results table.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab --key Tab --key Tab --key Tab
focus: tab "Style" selected
focus: radio "Nodes, set" checked
focus: button "Add Opacity"
focus: button "Influence, Color"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Influence, Color -- so the PageRank is painted as color. Color is no use to me. Back to the Style tab and arrow to the other tabs for a table.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key ArrowRight
focus: button "Add Opacity"
focus: radio "Nodes, set" checked
focus: tab "Style" selected
focus: tab "Values" selected
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** A Values tab -- that sounds right. Tab into it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Collapse Values" expanded
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Collapse Values, expanded. Tab on to the values.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Collapse Top 10" expanded
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Top 10, expanded. Tab in to read it.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab
focus: button "Valjean 0.07543"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Valjean 0.07543 -- name first, then the number. That is the PageRank top entry and it plausibly matches what NetworkX gives for Les Miserables. Two more Tabs to hear the next ranks.

```
node real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37 --key Tab --key Tab
focus: button "Myriel 0.04278"
focus: button "Gavroche 0.03577"
(a screenshot was kept for the graders)
(exit 0)
```

**Before:** Myriel 0.04278, Gavroche 0.03577. The ranking is there. All three parts of yesterday are back: the PageRank result, the name labels, and the project under my name. I am done; ending the session.

```
node real.mjs --end /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37
session ended: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/rounds/round-2/sessions/r2-s37
(exit 0)
```

## Where I hesitated

- The question mark opened something with focus on a Close button and no title spoken. Inside was a grid whose cells said only "All" and "Project"; Tab skipped the rows, ArrowRight said nothing new. I never heard a single shortcut from it. Dead end, so I left with Escape.
- Saving: Control+S worked. The dialog never told me where the file would go until after I pressed Save, when an alert said "Saved Les Mis PageRank Morgan in this browser."
- Closing: I went looking for a menu by tabbing backward. The project-name button looked like a menu but opened a rename box; Escape from it dropped focus onto the page itself. The real Main menu has no "Close"; "Back to start" was the nearest. After choosing it, nothing was announced and focus went to the page itself. I only worked out that the project was closed because the project-name button was gone.
- Reopening: the page loaded with focus nowhere. The recent list was five Tabs in and read well, name first. On opening I heard "No nodes to draw" and then "Opened Les Mis PageRank Morgan" -- the first message made me doubt the nodes were there.
- Checking the work: the drawing is a canvas with no name every time I pass it. The labels I confirmed from a live message ("77 labels, 7 hidden to avoid overlap") and the Style tab ("Label, Above: name"). The PageRank result is called "Influence" and on the Style tab is only a color, which tells me nothing; I found the numbers on a Values tab, Top 10, "Valjean 0.07543" and so on. Getting there from the label line took 18 Shift+Tabs; F6 did nothing. Everything was no longer the selected layer when I returned.
- Smaller: "Color swatch" does not say which color; "Label" and "Add label line" were announced as disabled with no reason given; "Nodes, set" means nothing to me.

## Verdict (in character)

Did I finish? Yes. I saved under my own name ("Les Mis PageRank Morgan"), put it away with Back to start, closed the tab, came back, opened it from the recent list, and all of my work was there: the PageRank ranking (Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577), the name labels, and the project name. The only thing not as I left it was which layer was selected, which I do not count as work.

Ease: 4 of 7. Saving and reopening were fine -- Control+S, a plain dialog, a clear "saved in this browser", and a recent list that says name, place, node count and time. What cost me was everything around it: a shortcut list I could not read, a closing step that said nothing and left me on the page itself, an opening message that said "No nodes to draw", a drawing with no name, and a ranking I could only find by tabbing through a style panel.

What confused me: whether "Back to start" closed my project or just moved me somewhere; why "No nodes to draw" was spoken when the project opened fine; what "Influence" is (I assumed PageRank, nothing said so); the difference between Save and "Save local copy" when Save already said "in this browser".

Would I use this instead of my scripts? For keeping a session between days, maybe. The save and reopen held. For anything else, not yet.
