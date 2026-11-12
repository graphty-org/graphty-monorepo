# Session r3-s14 -- Morgan Reyes (screen-reader analyst), task T10 prompt A (Les Miserables)

Task: "You have never used this program before. You will practice on the ready-made network of
characters from the novel Les Miserables that comes with the program, not on your own data. Right
now no names are written on the drawing. Get every character's name written next to its dot."

Start: empty, screen-reader mode (keyboard only; the tool reports focus, live regions and browse-mode reads).

### Start

```
node design/ui/studio/tool/real.mjs --start design/ui/studio/rounds/round-3/sessions/r3-s14 empty --sr
focus: nothing (the page itself)
commit f108a235091e81cd23687ecc4c0b2370490a6498, build b7590f8de22b graphty@0.8.53
```

Morgan: Page loaded. Nothing is focused and nothing was announced -- not even a title I can hear
from the tool. I'll read around the page first, then Tab.

### Step 1

Morgan: Nothing focused. Let me read the page in browse mode to hear what is there.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
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

### Step 2

Morgan: Headings are there: graphty, Start, Recent projects, Samples. It says files stay on this computer -- good. A usage-data question at the bottom. I'll Tab to learn the order.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab
focus: button "Main menu"
(a screenshot was kept for the graders)
```

### Step 3

Morgan: Main menu. Keep tabbing toward the Samples.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Local only"
focus: button "Open project or file... Ctrl+O"
focus: button "New from data..."
focus: button "Open the Les Miserables sample"
focus: button "Open the Zachary's karate club sample"
(a screenshot was kept for the graders)
```

### Step 4

Morgan: Went one past. Shift+Tab back to Les Miserables and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Shift+Tab --key Enter
focus: button "Open the Les Miserables sample"
focus: nothing (the page itself)
live: status (polite): "Les Miserables: 77 nodes, 254 edges"
(a screenshot was kept for the graders)
```

### Step 5

Morgan: It said 77 nodes, 254 edges -- good, the size first. But focus dropped to nothing. I'll read the page to find where I am.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
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

### Step 6

Morgan: Overview has counts, components, direction -- nice. No headings in this view though. Names on the dots sounds like a View or Style setting. Tabbing to find View.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Main menu"
focus: button "Project: Les Miserables"
focus: button "Undo"
focus: button "Redo" disabled
focus: button "Local only"
focus: button "Graph"
focus: combobox "Find"
focus: treeitem "Selection"
(a screenshot was kept for the graders)
```

### Step 7

Morgan: A tree with Selection. Keep tabbing past it toward Layout and View.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Tab
focus: separator "Resize left panel" value "240"
focus: Canvas "Graph drawing"
focus: button "Analyze"
focus: button "From Les Miserables"
(a screenshot was kept for the graders)
```

### Step 8

Morgan: Tab went Analyze then jumped past Layout and View. Probably a toolbar with arrow keys. Shift+Tab back to Analyze, then Right arrow twice to View.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Shift+Tab --key ArrowRight --key ArrowRight
focus: button "Analyze"
focus: button "Layout"
focus: button "View"
(a screenshot was kept for the graders)
```

### Step 9

Morgan: On View. Press Enter and see what it offers.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Enter
focus: menuitemradio "2D 5"
(a screenshot was kept for the graders)
```

### Step 10

Morgan: A menu: '2D 5' -- the 5 is presumably a shortcut key. Read the whole menu.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
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
read: button "View" expanded
read: button "Quick actions"
read: Les Miserables: 77 nodes, 254 edges Graph
read: button "From Les Miserables"
read: button "Graph actions"
read: tab "Style"
read: tab "Values" selected
read: button "Collapse Overview" expanded
read: Nodes 77 Edges 254 Direction Undirected, from the file: directed 0 Density 0.08681 Components 1 Edges per node 1 to 36, mean 6.597
read: menuitemradio "2D 5"
read: menuitemradio "3D" checked
read: menuitemradio "VR / AR This device has no VR or AR" disabled
read: menuitem "Fit 0"
read: menuitem "Frame selection Select a node first F" disabled
read: menuitem "Front 1"
read: menuitem "Side 3"
read: menuitem "Top 7"
read: menuitem "Isometric"
read: Show
read: menuitemcheckbox "Legend L" checked
read: menuitemcheckbox "Table Shift+T"
focus: menuitemradio "2D 5"
(a screenshot was kept for the graders)
```

### Step 11

Morgan: View has cameras, Legend and Table, but nothing about names or labels. Escape out. Next I'll try Quick actions -- sounds like a command search.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Escape
focus: button "View"
(a screenshot was kept for the graders)
```

### Step 12

Morgan: Focus came back to View -- good. Right arrow to Quick actions and Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key ArrowRight --key Enter
focus: button "Quick actions"
focus: combobox "Search commands" expanded; highlighted: option "Graph" selected
(a screenshot was kept for the graders)
```

### Step 13

Morgan: A command search box. I'll type 'names' -- that's what I want on the dots.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --type names
focus: combobox "Search commands" value "names" expanded
(a screenshot was kept for the graders)
```

### Step 14

Morgan: Silence after typing. No count, no highlighted option. Read the dialog to see if anything matched.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: dialog "Quick actions":
read: combobox "Search commands" value "names" expanded
read: button "Clear search"
read: No results
focus: combobox "Search commands" value "names" expanded
(a screenshot was kept for the graders)
```

### Step 15

Morgan: No results, and it never told me so -- I had to go read it. Try the jargon word instead: clear and type 'label'.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Control+a --type label
focus: combobox "Search commands" value "names" expanded
focus: combobox "Search commands" value "label" expanded
(a screenshot was kept for the graders)
```

### Step 16

Morgan: Silent again. Read it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: dialog "Quick actions":
read: combobox "Search commands" value "label" expanded
read: button "Clear search"
read: option "Add label line" disabled
focus: combobox "Search commands" value "label" expanded
(a screenshot was kept for the graders)
```

### Step 17

Morgan: One option, 'Add label line', and it's disabled with no reason given. That's half a dead end. Escape and try the Style tab next to Values.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Escape
focus: button "Quick actions"
(a screenshot was kept for the graders)
```

### Step 18

Morgan: Tab forward to the tabs.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab
focus: button "From Les Miserables"
focus: button "Graph actions"
focus: tab "Values" selected
(a screenshot was kept for the graders)
```

### Step 19

Morgan: Values tab. Left arrow to Style.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key ArrowLeft
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

### Step 20

Morgan: Style is selected. Read what's in it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: complementary "Inspector":
read: Graph
read: button "From Les Miserables"
read: button "Graph actions"
read: tab "Style" selected
read: tab "Values"
read: button "Collapse Canvas" expanded
read: Background
read: button "Color swatch"
read: textbox "Color hex value" value "F5F5F5"
read: button "Reset Background to default"
read: Method
read: combobox "Method" value "Force - Recommended"
read: Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving, in three dimensions or, with `dim: 2`, flat. Shape
read: radio "3D" checked
read: 3D
read: radio "2D"
read: 2D Spring length
read: spinbutton "Spring length" value "30"
read: Gravity
read: spinbutton "Gravity" value "-1.2000000476837158"
read: button "Expand Advanced"
read: Under a second
read: button "Applied" disabled
focus: tab "Style" selected
(a screenshot was kept for the graders)
```

### Step 21

Morgan: This Style is for the whole canvas: background and layout. 'Gravity minus 1.2000000476837158' -- enthusiastic precision. Nothing about names. The disabled 'Add label line' makes me think I need something selected first. There was a tree with 'Everything'. One more try: go there and press Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab
focus: button "Graph actions"
focus: button "From Les Miserables"
focus: button "Quick actions"
focus: Canvas "Graph drawing"
focus: separator "Resize left panel" value "240"
focus: treeitem "Selection"
focus: combobox "Find"
(a screenshot was kept for the graders)
```

### Step 22

Morgan: Overshot to Find. Tab back to the tree, Down arrow to Everything, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key ArrowDown --key Enter
focus: treeitem "Selection"
focus: treeitem "Everything"
focus: treeitem "Everything" selected
(a screenshot was kept for the graders)
```

### Step 23

Morgan: 'Everything selected'. Nothing announced about what that did. Read around here.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: region "Graph place":
read: Graph Les Miserables
read: combobox "Find"
read: treeitem "Selection"
read: treeitem "Everything" selected
read: Analyze in the toolbar ( Shift+A ) to add results here
focus: treeitem "Everything" selected
(a screenshot was kept for the graders)
```

### Step 24

Morgan: Tab over to the Inspector to see if it now talks about nodes.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: separator "Resize left panel" value "240"
focus: Canvas "Graph drawing"
focus: button "Quick actions"
focus: tab "Style" selected
focus: radio "Nodes" checked
focus: button "Add Opacity"
(a screenshot was kept for the graders)
```

### Step 25

Morgan: Now the Style tab has a 'Nodes' radio and 'Add Opacity'. Different panel. Read it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: complementary "Inspector":
read: Everything
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes" checked
read: Nodes
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Color swatch"
read: textbox "Color hex value" value "6366F1"
read: textbox "Opacity" value "100"
read: button "Color by attribute"
read: Shape Size
read: combobox "Size" value "1"
read: button "Size by attribute"
read: Shape
read: button "Shape Icosphere"
read: Effects
read: button "Add to Effects"
read: button "Label"
read: button "Add label line"
read: Tooltip
read: button "Add Tooltip"
focus: button "Add Opacity"
(a screenshot was kept for the graders)
```

### Step 26

Morgan: There it is: a 'Label' section with 'Add label line', enabled now. No headings to jump to, so I Tab down to it.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab
focus: button "Color swatch"
focus: textbox "Color hex value" value "6366F1"
focus: textbox "Opacity" value "100"
focus: button "Color by attribute"
focus: combobox "Size" value "1"
focus: button "Size by attribute"
focus: button "Shape Icosphere"
focus: button "Add to Effects"
focus: button "Label"
focus: button "Add label line"
(a screenshot was kept for the graders)
```

### Step 27

Morgan: On 'Add label line'. Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Enter
focus: combobox "Find an attribute" expanded; highlighted: option "id" selected
(a screenshot was kept for the graders)
```

### Step 28

Morgan: It asks which attribute, 'id' highlighted. I want the character names -- read the list to see if there is a name attribute separate from id.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: dialog "From data":
read: combobox "Find an attribute" expanded
read: option "id" selected
read: option "name"
focus: combobox "Find an attribute" expanded; highlighted: option "id" selected
(a screenshot was kept for the graders)
```

### Step 29

Morgan: Two options: id and name. 'name' is what I want. Down arrow, Enter.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key ArrowDown --key Enter
focus: combobox "Find an attribute" expanded; highlighted: option "name" selected
focus: button "Label position"
live: region (polite): "0 labels, 0 hidden" -- unconfirmed: the region arrived with this text already in it, which many screen readers do not read
live: region (polite): "77 labels, 7 hidden"
(a screenshot was kept for the graders)
```

### Step 30

Morgan: It said '77 labels, 7 hidden'. 77 is every character -- but 7 hidden? Hidden how, and which ones? Read around to find out.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --read
read: complementary "Inspector":
read: Everything
read: tab "Style" selected
read: tab "Values"
read: radio "Nodes, set" checked
read: Nodes , set
read: radio "Edges"
read: Edges Fill
read: button "Add Opacity"
read: Color
read: button "Color swatch"
read: textbox "Color hex value" value "6366F1"
read: textbox "Opacity" value "100"
read: button "Color by attribute"
read: Shape Size
read: combobox "Size" value "1"
read: button "Size by attribute"
read: Shape
read: button "Shape Icosphere"
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
```

### Step 31

Morgan: Label line 'Above: name' was added. '77 labels, 7 hidden' and a 'Show all labels' checkbox. The task says every name, so tick it: three Tabs, then Space.

```
node design/ui/studio/tool/real.mjs --step design/ui/studio/rounds/round-3/sessions/r3-s14 --key Tab --key Tab --key Tab --key Space
focus: button "Label, Above: name"
focus: button "Remove label line"
focus: checkbox "Show all labels"
focus: checkbox "Show all labels" checked
live: region (polite): "77 labels"
(a screenshot was kept for the graders)
```

Morgan: "77 labels". No "hidden" any more. That's every character. I'm done.

### End

```
node design/ui/studio/tool/real.mjs --end design/ui/studio/rounds/round-3/sessions/r3-s14
session ended
```

## Debrief, in character (Morgan)

**Did I finish?** Yes. The panel says "77 labels" with no hidden count, and the file has 77
characters, so every character has its name on its dot. I'm taking the tool's word for it,
because I can't see the drawing. I would ask a sighted colleague to confirm, which is exactly the
thing I want to stop doing.

**Ease: 4 of 7.** It worked, and every step worked from the keyboard, but I took two wrong turns
before I found the right place.

**What worked**

- The start page has real headings (Start, Recent projects, Samples), and it tells me files stay
  on this computer. That's the first thing I ask about a tool.
- Opening the sample said "Les Miserables: 77 nodes, 254 edges" once. The Overview had node,
  edge and component counts, plus direction, in text, without my having to run anything.
- Menus return focus to the button that opened them. The toolbar and tabs use arrow keys the
  way they should.
- The attribute picker offered "id" and "name". Those are clearly different, so I picked the
  right one.
- After I added the label it said "77 labels, 7 hidden" once, and "77 labels" once after I ticked
  Show all labels. Those counts are also written in the panel, so I can go back and read them.

**What confused me or cost me time**

- Nothing tells me where label settings live. The View menu has cameras, Legend and Table, but
  no names. The Style tab first showed me canvas settings (background and layout), because
  nothing was selected. I had to guess that I needed to select "Everything" in the tree before
  node styling would appear. Nothing told me that.
- Quick actions: "names" found nothing, and it never said "No results". I had to read the
  dialog to find out. "label" found "Add label line", but it was disabled, with no reason given.
  The View menu tells me why "Frame selection" is disabled ("Select a node first"). This option
  did not.
- After I opened the sample, focus fell to nothing on the page. I had to start tabbing again
  from the top.
- Selecting "Everything" made no announcement. I only learned the Inspector had changed by
  tabbing over to it.
- The Inspector has no headings. Fill, Shape, Effects, Label and Tooltip are plain text, so I
  had to tab through ten controls to reach the label.
- "7 hidden": hidden how, and which seven? It didn't say. I ticked "Show all labels" because the
  task said every name. Without that instruction I wouldn't have known which characters were
  missing.
- Small things: "Gravity" reads "-1.2000000476837158". The "Redo" button is disabled but still
  takes Tab focus. The first count, "0 labels, 0 hidden", was already on the page when the region
  appeared, so many screen readers wouldn't speak it.

**Would I use this instead of my scripts?** Not for this. Labels are for the sighted people I
work with. I'd use it to make a labeled picture a colleague asked for, now that I know the path:
select Everything, then Style, then Label, then name, then Show all labels.
