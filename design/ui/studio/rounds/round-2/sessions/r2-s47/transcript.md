# Session r2-s47 -- Morgan (screen-reader analyst), task T6 "What did I get?"

Screen-reader mode: keyboard only, reading the focus: and live: lines.

## Step 1 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s47 empty --sr`
Heard: `focus: nothing (the page itself)`.
Morgan: Page loaded and the screen reader says nothing at all -- no title, no heading announced. Typical. I will press Tab to find the first control.

## Step 2

Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard: `focus: button "Main menu"`
Morgan: First stop is a "Main menu" button. Fine. I will keep tabbing to map the page before opening anything.

## Step 3

Morgan, before: Mapping the page: Tab again past Main menu.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Local only"
```

## Step 4

Morgan, before: A button called 'Local only' -- that is the question I always ask, where does my data go. I will come back to it; Tab on to see the rest.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Open project or file... Ctrl+O"
```

## Step 5

Morgan, before: Open project or file. Not what I want -- I need the sample that comes with the program. Tab on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "New from data..."
```

## Step 6

Morgan, before: 'New from data...' -- probably my own files. Still looking for samples. Tab.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Open the Les Miserables sample"
```

## Step 7

Morgan, before: There it is: 'Open the Les Miserables sample'. Clear name. Pressing Enter.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: status (polite): "Reading Les Miserables"
```

## Step 8

Morgan, before: Focus landed on 'Canvas' with no name -- that is the 'image, image' black box I dread. It said 'No nodes to draw' then 'Reading Les Miserables'. I will wait a moment to hear whether it finishes loading.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --wait 3000`
Heard:

```
focus: Canvas (no name)
```

## Step 9

Morgan, before: Silence. No 'loaded, 77 nodes' or anything. I do not know if it worked. Focus is on an unnamed canvas. I will Tab forward to see what is around it.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Analyze"
```

## Step 10

Morgan, before: An 'Analyze' button. Maybe. First I want an overview. Keep tabbing to map what exists.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "From Les Miserables"
```

## Step 11

Morgan, before: 'From Les Miserables' -- a button, so the sample is presumably loaded. Not sure what it does. Tab on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Graph actions"
```

## Step 12

Morgan, before: 'Graph actions'. Tab on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: tab "Values" selected
```

## Step 13

Morgan, before: A tab list, 'Values' selected. Values sounds like data. Let me Tab into its panel to hear what it holds.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Collapse Overview" expanded
```

## Step 14

Morgan, before: 'Collapse Overview, expanded' -- an Overview section is open. That is exactly what I want. In NVDA I would arrow down to read it; here I can only Tab, so Tab and hope the facts are reachable.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: separator "Resize inspector" value "240"
```

## Step 15

Morgan, before: Tab jumped straight from the Overview toggle to a 'Resize inspector' separator, so the overview contents are plain text with nothing focusable. With NVDA I would arrow through it in browse mode; I cannot here. Go back to the Overview button and try ArrowDown in case it reads on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key ArrowDown`
Heard:

```
focus: button "Collapse Overview" expanded
focus: button "Collapse Overview" expanded
```

## Step 16

Morgan, before: ArrowDown does nothing from the button. Let me look at the other tabs in that tab list: Shift+Tab back to 'Values', then ArrowRight.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key ArrowRight`
Heard:

```
focus: tab "Values" selected
focus: tab "Style" selected
```

## Step 17

Morgan, before: Second tab is 'Style' -- that is appearance, not what I need. ArrowRight again to hear the rest of the tabs.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowRight`
Heard:

```
focus: tab "Values" selected
```

## Step 18

Morgan, before: Only two tabs, Values and Style. The overview text is out of my reach by keyboard focus. I will try the 'Graph actions' button (Shift+Tab twice from the tab) in case it offers a summary or a table.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Enter`
Heard:

```
focus: button "Graph actions"
focus: menuitem "Re-run layout"
```

## Step 19

Morgan, before: A menu opened at 'Re-run layout'. ArrowDown through the items to hear them all.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "Reshuffle layout seed"
```

## Step 20

Morgan, before: 'Reshuffle layout seed' -- good to know a seed exists. Down again.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "Re-run layout"
```

## Step 21

Morgan, before: Only two layout items in Graph actions. Escape, then Shift+Tab to the 'From Les Miserables' button and open it.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key Shift+Tab --key Enter`
Heard:

```
focus: button "Graph actions"
focus: button "From Les Miserables"
focus: button "From Les Miserables"
```

## Step 22

Morgan, before: Enter on 'From Les Miserables' said nothing -- no expanded state, nothing new. Maybe something opened without taking focus. Tab to check.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Graph actions"
```

## Step 23

Morgan, before: Nothing happened that I can hear. Try 'Analyze' (two Shift+Tabs back) -- maybe it reports counts and components.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Shift+Tab --key Enter`
Heard:

```
focus: button "From Les Miserables"
focus: button "Analyze"
focus: combobox "Filter analyses" expanded
```

## Step 24

Morgan, before: A 'Filter analyses' combobox, expanded. I want to know about reachability, so I will type 'component'.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --type component`
Heard:

```
focus: combobox "Filter analyses" value "component" expanded
```

## Step 25

Morgan, before: No word about how many matches. ArrowDown to hear the first option.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: combobox "Filter analyses" value "component" expanded
```

## Step 26

Morgan, before: Still only the combobox read back; no option spoken. Either there are no matches or the options are not announced. Clear it and try 'connected' instead.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Control+a --type connected --key ArrowDown`
Heard:

```
focus: combobox "Filter analyses" value "component" expanded
focus: combobox "Filter analyses" value "connected" expanded
focus: combobox "Filter analyses" value "connected" expanded
```

## Step 27

Morgan, before: Silence again. Arrow keys give me nothing in this list. I will press Enter and see whether something gets chosen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: button "Run"
```

## Step 28

Morgan, before: Enter picked something and dropped me on a 'Run' button, but I was never told what I picked. Shift+Tab to hear what is above the Run button.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab`
Heard:

```
focus: button "Expand Advanced"
```

## Step 29

Morgan, before: 'Expand Advanced'. Shift+Tab more to find the name of the chosen analysis.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab`
Heard:

```
focus: button "Back to analyses"
```

## Step 30

Morgan, before: 'Back to analyses' -- so I am inside one analysis but its name is plain text I cannot reach. I will gamble: Tab twice to Run, press Enter, and listen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Enter`
Heard:

```
focus: button "Expand Advanced"
focus: button "Run"
live: status (polite): "Eigenvector added, running"
focus: button "Analyze"
```

## Step 31

Morgan, before: 'Eigenvector added, running.' I asked for 'connected' and got eigenvector centrality -- so my filter matched nothing and Enter took the first item, or something like that. Not what I wanted. Wait to hear if it finishes.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --wait 3000`
Heard:

```
focus: button "Analyze"
```

## Step 32

Morgan, before: No 'done' message. Open Analyze again, and this time Tab out of the filter box instead of arrowing, to see whether the list items are reachable as buttons.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter --key Tab`
Heard:

```
focus: combobox "Filter analyses" expanded
focus: combobox "Filter analyses" expanded
```

## Step 33

Morgan, before: Tab kept me in the filter box. Empty filter now; try ArrowDown three times and listen for any option names.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown --key ArrowDown --key ArrowDown`
Heard:

```
focus: combobox "Filter analyses" expanded
focus: combobox "Filter analyses" expanded
focus: combobox "Filter analyses" expanded
```

## Step 34

Morgan, before: The list is mute to me. Last resort here: type 'component' and press Enter, then Tab to Run and listen to what gets added.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --type component --key Enter`
Heard:

```
focus: combobox "Filter analyses" value "component" expanded
focus: button "Run"
```

## Step 35

Morgan, before: Again on Run with no name for what I picked. Press Enter and listen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: button "Analyze"
live: status (polite): "Connected components added, running"
```

## Step 36

Morgan, before: 'Connected components added, running.' That is the one. But again no result spoken. Wait, then Tab forward through the page to find where results land.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --wait 2000 --key Tab`
Heard:

```
focus: button "Analyze"
focus: button "From Les Miserables"
```

## Step 37

Morgan, before: Same row of buttons as before. Tab further, past Graph actions and the tabs, into the Values panel; maybe the results added focusable entries.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Graph actions"
focus: tab "Values" selected
focus: button "Collapse Overview" expanded
focus: separator "Resize inspector" value "240"
```

## Step 38

Morgan, before: Same as before: Overview toggle, then the resize separator. Keep tabbing past it to see what else the page has.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: nothing (the page itself)
focus: button "Main menu"
focus: button "Project: Les Miserables"
focus: button "Undo"
```

## Step 39

Morgan, before: Wrapped round to the top: Main menu, 'Project: Les Miserables', Undo. So the whole page is about ten stops and none holds a number. Tab on to reach the canvas and try arrow keys on it, in case nodes can be walked.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Redo" disabled
focus: button "Local only"
focus: button "Graph"
```

## Step 40

Morgan, before: A 'Graph' button. Maybe that opens a text view of the graph. Enter.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: button "Graph"
```

## Step 41

Morgan, before: Enter on 'Graph' did nothing audible, no pressed or selected state. Perhaps a view switcher with siblings; Tab on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: combobox "Find"
```

## Step 42

Morgan, before: A 'Find' combobox -- I missed that earlier. Type 'Valjean' to see if it reports a character and its facts.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --type Valjean`
Heard:

```
focus: combobox "Find" value "Valjean" expanded
```

## Step 43

Morgan, before: Expanded but silent, no match count. Press Enter to pick the match and listen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: group "Summary values"
```

## Step 44

Morgan, before: Focus moved to a group called 'Summary values'. No confirmation that Valjean is selected. Tab to see what is inside the group.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Degree 36"
```

## Step 45

Morgan, before: 'Degree 36' -- a real number, finally. That is Valjean's degree presumably. Keep tabbing for the rest of his facts.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Collapse Memberships" expanded
```

## Step 46

Morgan, before: 'Memberships' section, open. Tab on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Separate pieces Group 1"
```

## Step 47

Morgan, before: 'Separate pieces, Group 1' -- that must be the connected-components result: Valjean is in piece 1. It does not say how many pieces there are, which is what I actually need. Press Enter on it in case it explains.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: nothing (the page itself)
```

## Step 48

Morgan, before: Focus vanished to the page itself, no announcement. I do not know what happened -- maybe it selected the whole group. Tab to find my bearings.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: separator "Resize inspector" value "240"
```

## Step 49

Morgan, before: Landed on the resize separator, so I am at the bottom of the inspector. Shift+Tab backwards to hear what the inspector shows now.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab`
Heard:

```
focus: button "Reset Color to default"
focus: textbox "Color hex value" value "E69F00"
focus: button "Color swatch"
focus: tab "Style" selected
```

## Step 50

Morgan, before: Pressing the group sent me to the Style tab with a color E69F00 -- it is about coloring, not counting. Not what I wanted, and it never told me. Switch back to the Values tab with ArrowLeft and Tab into it.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowLeft --key Tab --key Tab --key Tab`
Heard:

```
focus: tab "Values" selected
focus: button "Collapse Summary" expanded
focus: button "Size 77"
focus: button "Collapse Members" expanded
```

## Step 51

Morgan, before: Values now says 'Summary', 'Size 77', then 'Members'. I think the inspector is describing Group 1 now, and it holds 77 characters. If the whole network is 77 then everyone is in one piece -- but nothing has told me the total yet. Tab into Members.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Napoleon"
focus: button "Myriel"
focus: button "MlleBaptistine"
```

## Step 52

Morgan, before: A list of character names as buttons: Napoleon, Myriel, MlleBaptistine. Good, but I want the whole-network count. Escape to clear the selection, then go to the Values tab and see whether the Overview now has anything focusable.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key Shift+Tab`
Heard:

```
focus: nothing (the page itself)
focus: tab "Values" selected
```

## Step 53

Morgan, before: Escape dropped focus to the page again (no word about selection being cleared), and Shift+Tab put me on the Values tab. Tab into it.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Collapse Overview" expanded
focus: separator "Resize inspector" value "240"
focus: nothing (the page itself)
focus: button "Main menu"
```

## Step 54

Morgan, before: The Overview is still unreachable by Tab. A trick from other tools: select everything and read the selection summary. Escape to the page and press Control+A.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key Control+a`
Heard:

```
focus: button "Main menu"
focus: button "Main menu"
```

## Step 55

Morgan, before: Control+A said nothing. I will walk to the canvas (past Find) and try Control+A and the arrow keys there.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Project: Les Miserables"
focus: button "Undo"
focus: button "Redo" disabled
focus: button "Local only"
focus: button "Graph"
focus: combobox "Find"
focus: treeitem "Selection"
```

## Step 56

Morgan, before: A tree item called 'Selection' -- new to me; a tree I can walk. ArrowDown to hear its siblings.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: treeitem "Separate pieces" expanded
```

## Step 57

Morgan, before: 'Separate pieces', expanded. Its children should be the pieces. ArrowDown.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: treeitem "Group 1"
```

## Step 58

Morgan, before: 'Group 1', no count spoken and no 'one of N' position. ArrowDown to see if there is a Group 2.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: treeitem "Influence by association"
```

## Step 59

Morgan, before: After Group 1 comes 'Influence by association' -- the eigenvector run, renamed. So 'Separate pieces' has only Group 1: the network is one piece, everyone reachable from everyone, if I trust that, and Group 1 had size 77. ArrowDown to hear the rest of this tree.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: treeitem "Everything"
```

## Step 60

Morgan, before: 'Everything'. That sounds like the whole graph. Press Enter, then Tab into the inspector to hear its summary.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: treeitem "Everything" selected
```

## Step 61

Morgan, before: 'Everything, selected.' ArrowDown first to hear whether the tree goes on.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: treeitem "Everything" selected
```

## Step 62

Morgan, before: End of the tree. Tab onward into the inspector to read what it says about Everything.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: separator "Resize left panel" value "240"
focus: Canvas (no name)
focus: button "Analyze"
focus: tab "Style" selected
focus: radio "Nodes" checked
focus: button "Add Opacity"
```

## Step 63

Morgan, before: The inspector is on Style (radio Nodes, Add Opacity) -- the Analyze and From-Les-Miserables row has changed too. Shift+Tab back to the tab list, switch to Values, Tab in.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Shift+Tab --key ArrowLeft --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: radio "Nodes" checked
focus: tab "Style" selected
focus: tab "Values" selected
focus: button "Collapse Summary" expanded
focus: separator "Resize inspector" value "240"
focus: nothing (the page itself)
focus: button "Main menu"
```

## Step 64

Morgan, before: The 'Everything' summary has nothing focusable in it -- the numbers, if any, are plain text again. I am on Main menu now; open it and listen for anything like a data table or a description.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: menuitem "Back to start"
```

## Step 65

Morgan, before: 'Back to start'. ArrowDown through the menu.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "New project"
```

## Step 66

Morgan, before: 'New project'. Down.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "Open project or file... Ctrl+O"
```

## Step 67

Morgan, before: Down.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "Open sample"
```

## Step 68

Morgan, before: Down.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown`
Heard:

```
focus: menuitem "Save Ctrl+S"
```

## Step 69

Morgan, before: Down, several times, listening for export or table.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown --key ArrowDown`
Heard:

```
focus: menuitem "Save as... Shift+Ctrl+S"
focus: menuitem "Save local copy..."
focus: menuitem "Export... Ctrl+E"
focus: menuitem "Rename F2"
focus: menuitem "Settings... Ctrl+,"
focus: menuitem "Keyboard shortcuts ?"
```

## Step 70

Morgan, before: 'Keyboard shortcuts' -- for my keystroke file, and maybe there is a key for a summary. Enter.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter`
Heard:

```
focus: button "Main menu"
```

## Step 71

Morgan, before: Focus went straight back to 'Main menu'. Did a shortcut list open? Nothing said so. Press Tab to find out.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: button "Project: Les Miserables"
```

## Step 72

Morgan, before: No shortcut list that I can find. The menu said its key is '?'; press Escape to leave the button and try '?'.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key Shift+Slash`
Heard:

```
--key takes a key name such as Enter, Escape, ArrowDown, F2, a, or a chord such as Control+f; not "Shift+Slash"
```

## Step 73

Morgan, before: (Tool refused my key name; retry with '?' itself.)
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key \?`
Heard:

```
focus: button "Project: Les Miserables"
focus: button "Close"
```

## Step 74

Morgan, before: '?' opened something -- focus is on a 'Close' button, but the dialog's title was not spoken. Tab to see what is in it.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab`
Heard:

```
focus: gridcell "All"
```

## Step 75

Morgan, before: A grid, cell 'All'. Probably a category filter. ArrowDown through the grid to hear shortcuts.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown --key ArrowDown --key ArrowDown`
Heard:

```
focus: gridcell "Project"
focus: gridcell "Selection"
focus: gridcell "Settings and help"
```

## Step 76

Morgan, before: Categories: All, Project, Selection, Settings and help. Go back up to 'All' and Tab into the list of shortcuts.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowUp --key ArrowUp --key ArrowUp --key Tab`
Heard:

```
focus: gridcell "Selection"
focus: gridcell "Project"
focus: gridcell "All"
focus: region "All"
```

## Step 77

Morgan, before: A region 'All' got focus -- the shortcut list itself, but it is a region of text; Tab and ArrowDown may not read rows. Try ArrowDown then Tab.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key ArrowDown --key Tab`
Heard:

```
focus: region "All"
focus: button "Done"
```

## Step 78

Morgan, before: The shortcut list is a scrollable region whose rows I cannot reach by Tab. Done. Now the per-character facts: go back to Find (Control+f, the usual key), find Valjean again, and this time Tab through the whole inspector.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter --key Control+f`
Heard:

```
focus: button "Project: Les Miserables"
focus: button "Project: Les Miserables"
```

## Step 79

Morgan, before: Control+F did not take me to the app's Find. Tab my way there (five stops) and search Valjean.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab --key Tab --type Valjean --key Enter`
Heard:

```
focus: button "Undo"
focus: button "Redo" disabled
focus: button "Local only"
focus: button "Graph"
focus: combobox "Find"
focus: combobox "Find" value "Valjean" expanded
focus: group "Summary values"
```

## Step 80

Morgan, before: Back in 'Summary values' for Valjean. Tab through the whole inspector this time, many stops, listening for recorded facts.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Degree 36"
focus: button "Collapse Memberships" expanded
focus: button "Separate pieces Group 1"
focus: separator "Resize inspector" value "240"
focus: nothing (the page itself)
focus: button "Main menu"
focus: button "Project: Les Miserables"
focus: button "Undo"
focus: button "Redo" disabled
focus: button "Local only"
```

## Step 81

Morgan, before: Valjean's inspector holds only 'Degree 36' and 'Group 1' that I can reach. No facts from the data itself. The 'Graph' button nags me -- maybe it is one of a pair, like Graph / Table. Tab to it and try ArrowRight.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key ArrowRight`
Heard:

```
focus: button "Graph"
focus: button "Graph"
```

## Step 82

Morgan, before: Nothing. Last idea for the data: the canvas itself. Tab to it (past Find, the tree, the separator) and press ArrowRight to see if it walks nodes or edges.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab --key ArrowRight`
Heard:

```
focus: combobox "Find"
focus: button "Hide Separate pieces"
focus: button "Hide Group 1"
focus: button "Hide Influence by association"
focus: button "Hide Influence by association"
```

## Step 83

Morgan, before: Tab now walks 'Hide' buttons for each tree row. Keep tabbing until the canvas.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: treeitem "Everything"
focus: separator "Resize left panel" value "240"
focus: Canvas (no name)
focus: button "Analyze"
```

## Step 84

Morgan, before: Overshot. Shift+Tab back to the unnamed canvas, then ArrowRight, then Tab, to find out if the canvas does anything by keyboard.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key ArrowRight --key ArrowDown --key Enter`
Heard:

```
focus: Canvas (no name)
focus: Canvas (no name)
focus: Canvas (no name)
focus: Canvas (no name)
the drawing is still moving (the canvas kept changing for a second with no input)
```

## Step 85

Morgan, before: The canvas is mute; arrows apparently just set the picture moving. I still have nothing on connections. One more idea: the 'Degree 36' button on Valjean may open his connections. Find Valjean again and press Enter on Degree.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab`
Heard:

```
focus: separator "Resize left panel" value "240"
focus: treeitem "Everything"
focus: button "Hide Influence by association"
focus: button "Hide Group 1"
focus: button "Hide Separate pieces"
focus: combobox "Find"
focus: button "Graph"
focus: button "Local only"
```

## Step 86

Morgan, before: One too far. Tab twice to Find, search Valjean, Tab to 'Degree 36', Enter.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Control+a --type Valjean --key Enter --key Tab --key Enter`
Heard:

```
focus: button "Graph"
focus: combobox "Find"
focus: combobox "Find"
focus: combobox "Find" value "Valjean" expanded
focus: group "Summary values"
focus: button "Degree 36"
focus: region "Valjean's 36 connections"
```

## Step 87

Morgan, before: Now we are talking: a region called "Valjean's 36 connections". Tab into it to hear the connections and whatever is recorded on them.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Babet"
focus: button "Bamatabois"
focus: button "Bossuet"
focus: button "Brevet"
```

## Step 88

Morgan, before: Neighbor names in alphabetical order, as buttons: Babet, Bamatabois, Bossuet, Brevet. No weight or anything else per connection is spoken. Shift+Tab back past the first name to see if there are column headers or a sort control.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Shift+Tab --key Shift+Tab --key Shift+Tab --key Shift+Tab`
Heard:

```
focus: button "Bossuet"
focus: button "Bamatabois"
focus: button "Babet"
focus: button "Neighborhood actions"
```

## Step 89

Morgan, before: 'Neighborhood actions' -- open it and listen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Enter --key ArrowDown --key ArrowDown --key ArrowDown`
Heard:

```
focus: menuitem "Grow by one hop"
focus: menuitem "Frame selection F"
focus: menuitem "Grow by one hop"
focus: menuitem "Frame selection F"
```

## Step 90

Morgan, before: Grow by one hop, Frame selection -- nothing about the connection itself. Escape, Tab to 'Babet' and press Enter, hoping it opens the Valjean-Babet connection, not just Babet.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Escape --key Tab --key Enter`
Heard:

```
focus: button "Graph actions"
focus: tab "Values" selected
focus: tab "Values" selected
```

## Step 91

Morgan, before: Escape closed the whole connections list and threw me to 'Graph actions' -- I lost my place. Last try for a connection's facts: Tab into Values now that something may be selected, and listen.
Command: `node tool/real.mjs --step rounds/round-2/sessions/r2-s47 --key Tab --key Tab --key Tab --key Tab`
Heard:

```
focus: button "Collapse Overview" expanded
focus: separator "Resize inspector" value "240"
focus: nothing (the page itself)
focus: button "Main menu"
```

Morgan, after the last step: Back to the empty Overview with nothing focusable. I am repeating myself without progress. I stop here.

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s47`

## In character -- Morgan's debrief

**Did I finish?** No. Part by part:

- **Get it on screen:** done, easily. "Open the Les Miserables sample" was the fifth Tab stop and plainly named. But after Enter the only things said were "No nodes to draw" and "Reading Les Miserables" -- never "loaded" or "77 characters, 254 connections". I had to guess it worked.
- **How many characters:** half done, by accident. I never heard a total. I only heard "Size 77" for a group called "Group 1" after selecting it, and I am inferring that is everyone.
- **How many connections:** not done. I heard no edge count anywhere.
- **Can every character reach every other:** probably yes, by inference. I had to run "connected components" myself (typed "component" into Filter analyses; the first time, with "connected", Enter silently ran eigenvector centrality instead). Its result shows up as a tree item "Separate pieces" with a single child "Group 1" -- no sentence saying "1 piece" or "everyone is connected". I am taking "only one group, size 77" as the answer, which is a guess stacked on a guess.
- **What is recorded about each character:** not done. Valjean's inspector gave me only "Degree 36" and "Separate pieces Group 1", both things computed by the program, not anything from the data. If the file has other columns I never found them.
- **What is recorded about each connection:** not done. "Degree 36" opens "Valjean's 36 connections", a list of neighbor names only. Nothing per connection, no weight, and Escape threw the whole list away and moved me somewhere else.

**Rating: 2 out of 7 (difficult).** Loading was easy. Everything after it was "enthusiastic" in the bad way.

**What confused me:**

1. The Overview section is open but holds nothing I can reach by keyboard focus -- the very panel that should answer this task. Same for the "Everything" summary. In NVDA I would try browse mode, but a summary of a graph should not depend on that.
2. Nothing announces completion: not the load, not "Connected components added, running", not "Eigenvector added, running". I never learned whether either finished.
3. The analysis picker: arrowing through the list spoke nothing, there is no match count, and Enter ran an analysis whose name I was never told until it was already added.
4. Results are renamed into words I had to decode: connected components became "Separate pieces", eigenvector became "Influence by association". I worked it out, but I would want the textbook name and the settings next to it.
5. Pressing "Separate pieces Group 1" in Valjean's inspector silently switched the right panel to Style and a color value, and dropped my focus to the page.
6. Focus drops to "nothing" after Escape, after picking a group, and Control+A and Control+F did nothing in the app.
7. The canvas is an unnamed "Canvas"; arrow keys on it just set the picture moving.
8. The keyboard shortcuts dialog (opened with "?"; the menu item did nothing I could hear) has no spoken title and its list is a region whose rows I could not step through.

What I liked: plain button names ("Open the Les Miserables sample", "Local only"), the left-hand tree is walkable with arrows, and "Valjean's 36 connections" is exactly the kind of label I want. If the Overview said "77 characters, 254 connections, 1 piece; characters have: ...; connections have: ..." as text I could reach, this task would take me one minute. Today I would go back to NetworkX.
