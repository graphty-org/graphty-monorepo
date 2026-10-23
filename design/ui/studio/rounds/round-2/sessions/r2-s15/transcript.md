# Session r2-s15 -- Morgan (screen-reader analyst), T10 Prompt A (Les Miserables)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now no names are written on the drawing. Get every character's name written next to
its dot."

Mode: screen reader (keyboard only; no screenshots read).

## Step 0 -- start

Command: `node tool/real.mjs --start rounds/round-2/sessions/r2-s15 empty --sr`

Heard: `focus: nothing (the page itself)`. No title read out by the tool, no live text.

Morgan: "Nothing focused. Fine, that's normal for a fresh page. I'll Tab and learn the tab order."

## Step 1

Command: `--step --key Tab`

Heard:

```
focus: button "Main menu"
```

Morgan: "First stop is a Main menu button. Named, good. Keep tabbing to learn what else is here."

## Step 2

Command: `--step --key Tab`

Heard:

```
focus: button "Local only"
```

Morgan: "A button called Local only. Probably tells me my data stays here -- that is the first thing I want to know. Keep going."

## Step 3

Command: `--step --key Tab`

Heard:

```
focus: button "Open project or file... Ctrl+O"
```

Morgan: "Open project or file, with its shortcut. Not what I want -- I need the sample. Tab on."

## Step 4

Command: `--step --key Tab`

Heard:

```
focus: button "New from data..."
```

Morgan: "New from data. Still no samples. Tab."

## Step 5

Command: `--step --key Tab`

Heard:

```
focus: button "Open the Les Miserables sample"
```

Morgan: "There it is: Open the Les Miserables sample. Clear name, verb first. Pressing Enter."

## Step 6

Command: `--step --key Enter`

Heard:

```
focus: Canvas (no name)
live: status (polite): "No nodes to draw"
live: status (polite): "Reading Les Miserables"
```

Morgan: "Focus jumped on its own to something that just says Canvas, no name. And it told me No nodes to draw before Reading Les Miserables -- in that order that sounds like a failure. I will wait a moment and listen for done."

## Step 7

Command: `--step --wait 3000`

Heard:

```
focus: Canvas (no name)
```

Morgan: "Silence. Nobody told me it finished loading or how big it is. I am on an unnamed canvas. Let me press an arrow key and see if the drawing talks."

## Step 8

Command: `--step --key ArrowRight`

Heard:

```
focus: Canvas (no name)
```

Morgan: "Arrow says nothing. Trying Enter, as I always do before calling the drawing dead."

## Step 9

Command: `--step --key Enter`

Heard:

```
focus: Canvas (no name)
```

Morgan: "Still nothing. The drawing is dead to me: Canvas, no name, no keys. I do not need the drawing to talk for this task anyway -- I need a setting that writes names on it. Tab out and look for one."

## Step 10

Command: `--step --key Tab`

Heard:

```
focus: button "Analyze"
```

Morgan: "Analyze button. Not labels. Tab on."

## Step 11

Command: `--step --key Tab`

Heard:

```
focus: button "From Les Miserables"
```

Morgan: "From Les Miserables -- a button. Not sure what it does; sounds like a source chip. Moving on."

## Step 12

Command: `--step --key Tab`

Heard:

```
focus: button "Graph actions"
```

Morgan: "Graph actions. Could be a menu with labels in it. Note it; keep learning the tab order first."

## Step 13

Command: `--step --key Tab`

Heard:

```
focus: tab "Values" selected
```

Morgan: "A tab list, Values selected. Arrow right to hear the other tabs -- I am hoping for one about style or appearance."

## Step 14

Command: `--step --key ArrowRight`

Heard:

```
focus: tab "Style" selected
```

Morgan: "Style tab, selected on arrow. Labels on a drawing are style, so I will Tab into this panel and listen."

## Step 15

Command: `--step --key Tab`

Heard:

```
focus: button "Collapse Canvas" expanded
```

Morgan: "Collapse Canvas, expanded. So Canvas is a section heading-ish button in the Style panel. Tab further."

## Step 16

Command: `--step --key Tab`

Heard:

```
focus: button "Color swatch"
```

Morgan: "Color swatch. Color of what? Probably the background. A name that does not say what it colors. Tab."

## Step 17

Command: `--step --key Tab`

Heard:

```
focus: textbox "Color hex value" value "F5F5F5"
```

Morgan: "Hex value F5F5F5, light grey; background, I assume. Tab."

## Step 18

Command: `--step --key Tab`

Heard:

```
focus: button "Reset Background to default"
```

Morgan: "Reset Background -- confirms the swatch was background. Tab."

## Step 19

Command: `--step --key Tab`

Heard:

```
focus: combobox "Method" value "Force - Recommended"
```

Morgan: "Method combobox, Force - Recommended. Layout, I guess. Not labels. Tab."

## Step 20

Command: `--step --key Tab`

Heard:

```
focus: radio "3D" checked
```

Morgan: "3D radio, checked. Tab past the group."

## Step 21

Command: `--step --key Tab`

Heard:

```
focus: spinbutton "Spring length" value "30"
```

Morgan: "Layout parameters. Tab."

## Step 22

Command: `--step --key Tab`

Heard:

```
focus: spinbutton "Gravity" value "-1.2000000476837158"
```

Morgan: "Gravity, minus one point two zero zero zero zero zero zero four seven six eight... -- my braille display just filled with a floating-point artifact. Enthusiastic. Tab."

## Step 23

Command: `--step --key Tab`

Heard:

```
focus: button "Expand Advanced"
```

Morgan: "Expand Advanced -- for the layout, I assume. Skip. Tab."

## Step 24

Command: `--step --key Tab`

Heard:

```
focus: separator "Resize inspector" value "240"
```

Morgan: "Resize inspector separator. So the Style tab only held a Canvas section: background, layout method, dimensions, layout forces. Nothing about labels or names. Hmm. Keep tabbing to see what is after the inspector."

## Step 25

Command: `--step --key Tab`

Heard:

```
focus: nothing (the page itself)
```

Morgan: "End of the tab order, back on the page. So: no Labels control in the Style tab. Two places left I know of: the Graph actions button and the Values tab. Graph actions first -- Tab around to it."

## Step 26

Command: `--step --key Tab x7`

Heard:

```
focus: button "Main menu"
focus: button "Project: Les Miserables"
focus: button "Undo"
focus: button "Redo" disabled
focus: button "Local only"
focus: button "Graph"
focus: combobox "Find"
```

Morgan: "Now the top bar has more: Project: Les Miserables, Undo (enabled -- what did I do that can be undone? I only pressed arrow and Enter on the canvas), Redo, Local only, Graph, and a Find box. The Find box searches nodes, probably. Not what I need. Keep tabbing to Graph actions."

## Step 27

Command: `--step --key Tab x4`

Heard:

```
focus: treeitem "Selection"
focus: separator "Resize left panel" value "240"
focus: Canvas (no name)
focus: button "Analyze"
```

Morgan: "A tree, first item Selection, in a left panel. I will come back to it. Two more Tabs to Graph actions, then Enter."

## Step 28

Command: `--step --key Tab --key Tab --key Enter`

Heard:

```
focus: button "From Les Miserables"
focus: button "Graph actions"
focus: menuitem "Re-run layout"
```

Morgan: "A menu opened, focus on Re-run layout. Good, focus went into it. Arrow down through the items."

## Step 29

Command: `--step --key ArrowDown x6`

Heard:

```
menuitem "Reshuffle layout seed" / "Re-run layout", alternating
```

Morgan: "Two items only: Re-run layout and Reshuffle layout seed. At least there is a seed -- that is the reproducibility thing I care about. But no labels here. Dead end one. Escape, and I expect focus back on Graph actions."

## Step 30

Command: `--step --key Escape`

Heard:

```
focus: button "Graph actions"
```

Morgan: "Focus came back to Graph actions -- good, my place is kept. Now the left panel tree, the one that started with Selection. Shift+Tab back to it; also checks that Shift+Tab reverses cleanly."

## Step 31

Command: `--step --key Shift+Tab x5`

Heard:

```
focus: button "From Les Miserables" / "Analyze" / Canvas (no name) / separator "Resize left panel" / treeitem "Selection"
```

Morgan: "Shift+Tab reverses cleanly. On the tree item Selection. Arrow down through the tree to hear what else it holds."

## Step 32

Command: `--step --key ArrowDown x6`

Heard:

```
focus: treeitem "Everything" (x6)
```

Morgan: "Only two items: Selection and Everything. No level, no count, no "1 of 2", no hint what kind of list this is. Everything might mean all the dots. If I pick it, maybe the side panel shows settings for all dots, labels among them. Enter, then I will Tab over to that panel."

## Step 33

Command: `--step --key Enter`

Heard:

```
focus: treeitem "Everything" selected
```

Morgan: "Everything is now selected. Nothing announced about what changed elsewhere. Tab forward to the right-hand panel and listen for new controls."

## Step 34

Command: `--step --key Tab x6`

Heard:

```
focus: separator "Resize left panel" / Canvas (no name) / button "Analyze" / tab "Style" selected / radio "Nodes" checked / button "Add Opacity"
```

Morgan: "The right panel changed: now a Nodes radio (checked) and Add Opacity. So picking Everything gave me settings for all nodes. Promising. Keep tabbing for something about labels."

## Step 35

Command: `--step --key Tab x8`

Heard:

```
Color swatch / "Color hex value" 6366F1 / "Opacity" 100 / "Color by attribute" / combobox "Size" 1 / "Size by attribute" / "Shape Icosphere" / "Add to Effects"
```

Morgan: "Color, opacity, size, shape, effects. All for dots. Still no label. Tab on."

## Step 36

Command: `--step --key Tab x8`

Heard:

```
button "Label" / button "Add label line" / button "Add Tooltip" / separator "Resize inspector" / nothing (the page itself) / "Main menu" / "Project: Les Miserables" / "Undo"
```

Morgan: "Overshot, but I heard it: a button called Label, then Add label line, then Add Tooltip. Label alone does not say if it is on or off -- no pressed, no expanded. Shift+Tab back to it."

## Step 37

Command: `--step --key Shift+Tab x7`

Heard:

```
... button "Add label line" / button "Label"
```

Morgan: "On Label. I cannot tell Label from Add label line by name: one may be a section header, the other an action. I will try Label first and see what it says."

## Step 38

Command: `--step --key Enter`

Heard:

```
focus: combobox "Find an attribute" expanded
```

Morgan: "Label opened a search box: Find an attribute, expanded. So it wants to know which field to write as the label. Arrow down to hear the choices before I type anything."

## Step 39

Command: `--step --key ArrowDown x4`

Heard:

```
focus: combobox "Find an attribute" expanded (x4, nothing else)
```

Morgan: "Arrow down says nothing -- no option read, no count of results. Either the list is empty or the options do not talk. I will type what I would expect the field to be called: name."

## Step 40

Command: `--step --type "name"`

Heard:

```
focus: combobox "Find an attribute" value "name" expanded
```

Morgan: "Typed name. No live count, no "no match", nothing. Arrow down once more to see if a match is read now."

## Step 41

Command: `--step --key ArrowDown`

Heard:

```
focus: combobox "Find an attribute" value "name" expanded
```

Morgan: "Still silent. I have no idea whether name exists. One last try here: Enter, which picks the highlighted option in most comboboxes, if there is one."

## Step 42

Command: `--step --key Enter`

Heard:

```
focus: button "Label position"
live: region (polite): "0 labels, 0 hidden to avoid overlap"
live: region (polite): "77 labels, 7 hidden to avoid overlap"
```

Morgan: "Now it talks. "77 labels, 7 hidden to avoid overlap." So 77 characters have labels and 7 are hidden. Two things bother me: I never heard which attribute it picked -- did name match, or did it take whatever was first? And "every name" is not done while 7 are hidden. The 0 labels line first was noise. Focus is on Label position. Shift+Tab back to hear what the label is set to."

## Step 43

Command: `--step --key Shift+Tab`

Heard:

```
focus: button "Add label line" disabled
```

Morgan: "Add label line, disabled. Shift+Tab again for the label line itself."

## Step 44

Command: `--step --key Shift+Tab x2`

Heard:

```
focus: button "Label" disabled
focus: button "Add to Effects"
```

Morgan: "Label is now disabled, Add label line disabled -- and between Effects and Label there is no control that tells me which attribute became the label. Whatever line was added is not in the tab order or is not named. Tab forward past Label position to see what follows."

## Step 45

Command: `--step --key Tab x7`

Heard:

```
button "Label" disabled / "Add label line" disabled / "Label position" / "Label, Above: name" / "Remove label line" / "Add Tooltip" / separator "Resize inspector"
```

Morgan: "There it is: "Label, Above: name". So the label is the name attribute, written above the dot. Confirmed by text, good. Now the 7 hidden ones. Overlap hiding might be under Label position. Shift+Tab back to Label position and open it."

## Step 46

Command: `--step --key Shift+Tab x4 --key Enter`

Heard:

```
focus: dialog "Label position"
```

Morgan: "A dialog named Label position. Focus is on the dialog itself. Tab through it."

## Step 47

Command: `--step --key Tab x6`

Heard:

```
button "Close panel" / radio "Align top center" checked / separator "Resize inspector" / nothing (the page itself) / "Main menu" / "Project: Les Miserables"
```

Morgan: "The Label position dialog holds Close panel and a group of alignment radios (Align top center). Nothing about overlap. Then Tab walked straight out of the "dialog" to the page -- it is a dialog in name only. Not the place for hidden labels. Go back to the label line itself, "Label, Above: name", and open it."

## Step 48

Command: `--step --key Shift+Tab x6`

Heard:

```
"Main menu" / page / separator / radio "Align top center" / "Close panel" / "Add Tooltip"
```

Morgan: "The position panel sits after Add Tooltip in the order, not next to the button that opened it. I will close it first so it does not get in the way: Tab to Close panel, Enter, and listen for where focus lands."

## Step 49

Command: `--step --key Tab --key Enter`

Heard:

```
focus: button "Close panel"
focus: button "Label position"
```

Morgan: "Closed, and focus went back to Label position. Good, that is correct. Tab once to the label line, Enter."

## Step 50

Command: `--step --key Tab --key Enter`

Heard:

```
focus: button "Label, Above: name"
focus: combobox "Find an attribute" expanded
```

Morgan: "The label line just reopens the attribute search. Nothing about overlap. Escape out of it without changing anything, and listen that the label stays on name."

## Step 51

Command: `--step --key Escape`

Heard:

```
focus: button "Label, Above: name"
```

Morgan: "Escape put me back on the label line, still name. Good. For the 7 hidden names I have nothing obvious left in this panel. Try the question mark for help or shortcuts -- maybe it lists a way to show all labels."

## Step 52

Command: `--step --key "?"`

Heard:

```
focus: button "Close"
```

Morgan: "Question mark did something: focus is on a Close button, so a dialog opened, but nobody told me what the dialog is called. Tab through it."

## Step 53

Command: `--step --key Tab x4`

Heard:

```
gridcell "All" / region "All" / button "Done" / button "Close"
```

Morgan: "A grid cell called All, a region called All, Done, Close, and it wraps -- a proper trapped dialog, Escape presumably closes it. Grid cell All sounds like a category filter of a shortcut list. Tab to it and arrow down to read the grid."

## Step 54

Command: `--step --key Tab --key ArrowDown x2 --key ArrowRight --key ArrowDown`

Heard:

```
gridcell "All" / "Project" / "Selection" / "Selection" / "Settings and help"
```

Morgan: "Categories of shortcuts: All, Project, Selection, Settings and help. No category for labels or appearance. Back to All and into the region to hear the shortcuts themselves."

## Step 55

Command: `--step --key ArrowUp x4 --key Tab --key ArrowDown x2`

Heard:

```
gridcell ... "All" / region "All" (x3)
```

Morgan: "The region All takes focus but arrows read nothing from it here. In NVDA I would drop into browse mode and read it line by line; through this session I only get focus, so I cannot read the shortcut list. A keyboard shortcut list will not have a "show hidden labels" anyway. Escape and check that focus comes back."

## Step 56

Command: `--step --key Escape`

Heard:

```
focus: button "Label, Above: name"
```

Morgan: "Escape closed help and put me back exactly where I was. That is right. One last place for the 7 hidden names: the Canvas section had an Expand Advanced button. To get the Canvas settings back I need to un-pick Everything in the left tree. Tab around to the tree."

## Step 57

Command: `--step --key Tab x12`

Heard:

```
... combobox "Find" / treeitem "Everything" selected
```

Morgan: "On Everything, selected. Try Escape to un-pick it."

## Step 58

Command: `--step --key Escape`

Heard:

```
focus: treeitem "Everything" selected
```

Morgan: "Escape does not un-pick it. Another dead end. That is three in a row on the hidden-labels part (Label position, the help list I cannot read, and now no way back to the Canvas settings). I stop here. Names are on: the app said 77 labels, 7 hidden to avoid overlap, and the label line says name, above the dot."

## End

Command: `node tool/real.mjs --end rounds/round-2/sessions/r2-s15`

## Debrief, in character (Morgan)

**Did I finish?** Mostly. Names are written on the drawing: after I picked the name attribute,
the app said "77 labels, 7 hidden to avoid overlap", and the label line reads "Label, Above:
name". But the task said every character, and seven of them are hidden by the app's own choice. I
looked in three places for a way to show those seven and found none I could use, so I stopped.
Call it done except for seven names.

**Ease: 3 out of 7.** The part that worked was quick once found; finding it was not.

**What worked**

- The welcome buttons are real, named buttons: "Open the Les Miserables sample" is exactly what it
  says, verb first.
- Shift+Tab reversed cleanly. Menus and the help dialog returned focus to the control that opened
  them. The help dialog traps focus and Escape closes it.
- After choosing the attribute, the count came in one sentence with the number first. The label
  line says in text which attribute it uses and where. That is a fact I can find again later.

**What confused me or failed**

- Loading the sample threw focus onto something called "Canvas" with no name, and it was silent to
  arrows and Enter. Before the sample loaded I heard "No nodes to draw", which sounds like a
  failure, then "Reading Les Miserables", then nothing: no "done", no node or edge count.
- The Style tab, with nothing picked, holds only the Canvas section (background, layout). Labels
  only appeared after I picked "Everything" in a two-item tree (Selection, Everything) that does not
  say what kind of list it is. I found it by elimination, not because anything pointed me there.
- "Label" and "Add label line" are two buttons I could not tell apart by name. Neither said on or
  off.
- The attribute search ("Find an attribute") was silent: arrows read no option and typing gave no
  match count. I pressed Enter on "name" blind and it happened to work. If my attribute had been
  called something else I would have had no way to know the choices.
- "Label position" is announced as a dialog, but its controls sit after "Add Tooltip" in the tab
  order and Tab walks straight out of it to the page.
- "7 hidden to avoid overlap" tells me there is a problem but gives me nothing to do about it, and
  does not say which seven characters are missing.
- Picking "Everything" in the tree could not be undone with Escape, so I could not get back to the
  Canvas settings to look for an overlap option.
- Smaller: "Color swatch" does not say what it colors; Gravity reads "-1.2000000476837158"; Undo
  became enabled when I had changed nothing I knew of.
- The keyboard help groups shortcuts by category, but its list region gave me nothing in this
  session except its name.

**Would I use this instead of my scripts?** For this, no. NetworkX does not draw names, so in fairness
the tool does something my scripts do not -- but a sighted colleague would still have to tell me
which seven names are missing from the picture.
