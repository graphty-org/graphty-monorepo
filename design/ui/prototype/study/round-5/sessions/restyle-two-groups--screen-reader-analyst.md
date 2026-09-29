# Session: restyle two groups -- Morgan Reyes, screen-reader analyst

- **Participant:** Morgan Reyes, blind senior analyst, NVDA and keyboard only, screen curtain on
  (simulated; see study/personas/screen-reader-analyst.md).
- **Task, as the moderator gave it:** "Two of the groups are drawn in colors you cannot tell
  apart. Fix that so a colleague can read the picture."
- **Screens used:** screens/frame-at-rest.html (Les Miserables, Group color), screens/inspector.html
  (protein network, Module color, nothing selected and one node), screens/colour-by-value.html
  (the "Module as color" editor with its value list, the value menu, the Shape binding),
  screens/styles-list.html (the Look menu, the color picker, its Libraries tab).
- **How the pages were read:** each page's accessibility tree (what a screen reader is given:
  roles, names, text in reading order) was dumped and walked in order, as NVDA would read it with
  the arrow keys and H, Tab and Shift+Tab. The renders in shots/ (screens__frame-at-rest.png,
  screens__colour-by-value--categories.png, screens__styles-list-looks.png) were checked afterwards
  to know what a sighted colleague would see; Morgan does not see them.
- **Outcome:** failure. Morgan changed the project's Look to Print on faith, could not find out
  which two groups were the problem, and could not confirm the change fixed anything without
  asking a sighted person -- the thing the task was meant to spare them.
- **Single Ease Question:** 2 of 7.
- **Would use it instead of the current tool:** no, not for this.

Severity scale used below: 1 cosmetic, 2 slows me down, 3 I needed a workaround or help,
4 stopped the task.

---

## Transcript (think-aloud, in Morgan's words)

### 0. Before touching anything

"Right. So the task is about colour. I'll say the obvious thing first so it's on the record: I
can't tell *any* of the groups apart by colour. All of them are the same colour to me, which is
none. So what I actually need from the tool is: which two groups are the problem, in words, and
then a way to fix it that I can check without calling someone over. If I have to ask my colleague
'is it better now?' I haven't fixed anything, I've just moved the chair."

"I'll open my keystroke file for this one -- empty entry, never used this tool for styling."

### 1. The frame at rest (Les Miserables)

Title: "Main frame at rest, Les Miserables."

"Title's fine. H... 'Les Miserables, heading level 1.' Then 'Graphs', 'Sets and paths', 'Views' --
level 2. Inspector side: 'Graph', 'Statistics', 'Style stack', 'Results'. Good. Someone named the
parts. I'll give them that."

Arrowing into the drawing: "'Les Miserables colored by group, nothing selected', application."

"Application. My reading keys just went off. It told me it's coloured by group -- that's the first
time the word 'colored' has come up -- but not which colours. I'll arrow past it."

Next, the legend, as one line of text: "Group color 2 14 8 13 4 11 1 10 3 10 5 10 0 4 Other 5."

"Okay. That is a legend read by someone who hates me. 'Two fourteen eight thirteen four eleven.'
The groups are *named* with numbers and the counts are numbers and there is nothing between them.
I had to go to the braille display and read it cell by cell to work out it's pairs: group 2 has 14,
group 8 has 13, group 4 has 11, and so on. Fine, I got there. But it's the legend for a colour
coding and it contains no colours. Not one. So from here I can't even tell which two groups my
colleague is complaining about."

"There's 'Other 5'. Other what? Which groups are in Other? Doesn't say." (The render shows a
tooltip "Groups 6, 7 and 10" on that row; it is a title attribute and NVDA did not read it in
browse mode.)

**Problem (4):** the legend -- the one place a colour coding is explained -- says no colours, so
a screen-reader user cannot find out which groups share a hue.
**Problem (2):** the legend reads as one run of bare numbers, group names and counts
indistinguishable.

### 2. The one question I get

"I'm going to use my one question to the moderator. Which two groups?"

Moderator: "I can only give you the task as written."

"Right. So it's up to the tool, and the tool has just told me it doesn't know either. Noted:
that's my one question used, and the answer was the tool's job."

### 3. Style stack in the frame's inspector

"H to 'Style stack'. There's 'Add to Style stack', button. Then a list: 'Group color', 'Base
style'. Two options. Enter on 'Group color'..." (The mock does not say what Enter does on a row;
nothing is read.) "Silence. Either it opened something somewhere I'm not, or it did nothing. I
don't know which, and I'm not going to go hunting for a popup that didn't announce itself."

"Back up. Up in the 'Graph' section there was a button called 'Look: Default'. That's the only
control on this page that sounds like it's about appearance for the whole picture. I'll try it --
but this page doesn't show me what's in it, so I'll go to the page that does."

**Problem (2):** Enter on a style-layer row gives no feedback; nothing says an editor opened or
where focus went.

### 4. The Look menu (styles list page)

On screens/styles-list.html, H to "Style stack", then: "Look" (text), "Screen", button.

"Hang on. On the other page it was called 'Look: Default'. Here the button is called 'Screen' and
the word 'Look' is loose text in front of it. On the inspector page later it's just the text
'Look Default' and it isn't even a button. Three names for, I assume, one control. Default and
Screen -- are those the same thing? I'm going to assume yes, and I'm writing down that I assumed."

Opening it: "Menu. 'Look for the whole project.' 'Screen, the palettes each layer chose, checked.'
'Print, reads in gray on white paper and for color-blind readers. Where a color shows a direction,
a shape shows it too.' 'High contrast, every color clears 3 to 1 against the canvas it is drawn
on.' Then 'Colors you set by hand are kept.'"

"Now *that* is the first thing today that talks to me in my own terms. 'For color-blind readers.'
Somebody thought about this. And the last line -- 'colors you set by hand are kept' -- is exactly
the question I'd have asked next, answered before I asked it. Good."

"But I'm not sure it's the right fix. It says 'where a color shows a direction, a shape shows it
too.' Groups aren't a direction. So for my groups, does Print add shapes, or does it just make
everything gray? If it's gray, eight groups in gray is worse, not better. It doesn't say. And it's
'for the whole project' -- so I'm changing my own screen, my colleague's view, and presumably every
export, to fix two groups. That's a big hammer. I'd pick Print because it's the only thing that
mentions colour-blind readers, not because I know it works."

Choosing Print: "It's checked now, I assume. Nothing was announced. Nothing tells me what changed,
or that the two groups are now different. I'm back where I started: I have to ask someone to look."

**Problem (3):** Print is the one control that names the problem, but it does not say what it
does to categories (groups), and nothing afterwards reports whether any two groups still share a
colour. The fix cannot be checked in text.
**Problem (2):** the same Look control is named "Look: Default", "Screen" and plain text "Look
Default" on three pages; Default and Screen may or may not be the same.
**Problem (1):** the Style stack tree's accessible name is read as "Style stack Look Screen" run
together -- the tree picked up the Look label as part of its name.

### 5. Trying to fix just the two groups (colour by value page)

"Let's try the careful way instead: change one group's colour. I'll go to where the colouring is
defined." On screens/colour-by-value.html, the categories state: "Module as color, writes Module
color. Scale, one color per value. Palette, categorical, 8 colors, Eight distinct colors."

"'Eight distinct colors.' Distinct to whom? My colleague says two of them aren't. That name is a
promise I can't check."

"Then: 'Values, largest first Ribosome 56 Proteasome 40 Complex I 35 Spliceosome 32 MAPK signaling
31 DNA repair 30 Cell cycle 29 TGF-beta 21 Other: Unassigned moved 26 Past 8 colors fold into
Other.'"

"Same problem as the legend, as one paragraph. But at least the groups have names here, so I can
tell names from counts. Tab... Tab doesn't stop on any of them. They're not rows, they're text. So
I can't select 'Ribosome' and do anything to it."

"There's a menu in the page -- 'Change color...', 'Move to Other', 'Select nodes', 'Create set'.
Change color is what I want. But I didn't open it and I can't find what opens it; it's attached to
a value row I can't reach with Tab. Applications key on the text does nothing I can hear. I'm not
right-clicking at random."

**Problem (4):** the per-value rows in the colour editor are plain text; the value menu with
"Change color..." cannot be reached from the keyboard.
**Problem (2):** "Eight distinct colors" names the palette with a claim the reader has no way to
test, and the task shows it is not true for every reader.

### 6. The colour picker anyway (styles list page)

"Suppose I got there. The page has a picker open for TP53. 'Tablist, Custom selected, Libraries.'
'Hex', text. 'Pick a color 100 %'. Then buttons: '#E69F00', '#56B4E9', '#009E73', '#0072B2',
'#D55E00', '#CC79A7', '#000000', '#F0E442', '#808080'."

"Hex codes as button names. Honestly? That's more than most tools give me, and I'm a numbers
person. E6 9F 00 -- lots of red, some green, no blue: orange-ish. 56 B4 E9 -- blue highest, light:
a light blue. 00 72 B2 -- blue again, darker. So there are two blues in here. If I had to bet, the
two blues are my colleague's problem. But I'm doing colour science in my head off a hex string,
which is not a workflow, and I *still* don't know which group has which hex, because the legend and
the value list never say. So I know two blues exist and not which groups they belong to."

"And the big square -- 'Pick a color' -- is just text to me. No slider, no value. I'll stay out of
it."

"Libraries tab: 'Find a palette or layer'. 'Palettes, listbox Custom Libraries': 'Okabe-Ito
categories', 'Orange to brown ramp', 'Viridis ramp', 'Blue to red diverging'. The listbox is called
'Custom Libraries', which is the two tab names glued together, not a name. Okabe-Ito I actually
know -- it's the colour-blind-safe set. But nothing here says 'colour-blind safe', and if the
palette already *is* Okabe-Ito, which the hex codes suggest, then switching to it fixes nothing.
Which would mean the designers' own safe palette has two colours my colleague can't split. That's
worth someone knowing."

**Problem (3):** swatches are named only by hex; a group's colour is never said next to the
group, so the reader cannot connect "which two groups" to "which two colours".
**Problem (2):** the palettes list is named "Custom Libraries" (both tab names run together); the
picker's colour area is unlabeled text.
**Problem (2):** nothing says which palettes are safe for colour-blind readers; Okabe-Ito is only
recognisable to someone who already knows the name.

### 7. The shape route, which is what I'd actually want

"What I'd really do in Python is give each group a marker as well as a colour. Colour's fine; just
don't make it the only thing. Is there a shape?"

On the colour-by-value size state, the layer editor: "'Shape' text. 'Shape: sphere, toggle button,
pressed.' 'Remove.' ... 'Shape: apply a shape or a value.' 'From the data': 'module categories, 9',
'log2FoldChange numbers, Shape takes categories; bin log2FoldChange first, Computed', 'degree
numbers, Shape takes categories; bin degree first.'"

"Oh, now that's useful writing. 'Shape takes categories; bin degree first.' It tells me why I
can't, and what to do instead. Somebody wrote that for a reader. And 'module categories, 9' is
right there -- shape by group. That's the fix I'd want: my colleague sees two blues but also a
circle and a square."

"And... Tab doesn't land on 'module categories, 9'. It's text again. So the good option is
unreachable. And 'Shape: sphere' is a pressed toggle -- pressing it again does what, turns spheres
off? I don't know. Nine groups, how many shapes are there? It doesn't say whether nine is too
many, the way it said eight colours fold into Other."

"That's my second dead end in a row -- the value menu, now the shape list. By my own rule I stop
here and go to the fallback."

**Problem (4):** shape-by-group, the fix that does not depend on colour at all, is listed but not
reachable by keyboard (the binding choices are text, not options).
**Problem (2):** "Shape: sphere" is announced as a pressed toggle with no hint what un-pressing it
does, and there is no word on how many shapes exist for nine groups.

### 8. The inspector, for completeness

On screens/inspector.html, nothing selected: "H: 'Overview', 'Style stack top wins', 'Results
newest first', 'Notes', 'Export'. Good headings, and 'top wins' in the heading is a nice touch --
I know what order means before I read the list."

"The tree -- no name, just 'tree'. 'Module color'. 'Ribosome, 56'. 'Proteasome, 40'. 'Complex I,
35'. '6 more'. 'Size: degree'. 'Base style'. Then text 'Look Default'."

"This is the best version of the legend I've heard today. Each group is its own item, name then
count, with a comma. I can arrow through them. If each one said its colour -- 'Ribosome, 56, light
blue' -- and the tool told me 'Ribosome and Spliceosome are hard to tell apart', I'd have finished
this task in a minute. It doesn't. And 'Look Default' here is not even a button, so I can't change
the Look from the place that lists the groups."

With TP53 selected, Appearance: "'Module color, paints this selection's color: Module color, DNA
repair, color'. So I know TP53 is painted by Module color because it's DNA repair. Still no
colour. Consistent, at least."

**Problem (2):** the style-stack tree has no accessible name; "6 more" gives no hint what Enter
does.
**Problem (3):** the Look is plain text in the inspector, not a control, so the one appearance
fix that names colour-blind readers is not reachable where the groups are listed.

### 9. Fallback

"Fallback, then. I'd open the table -- 'Table: 77 nodes, 254 edges, open the table' is a proper
button, fine -- copy the group column out, and in Python I'd write the palette myself, by name,
with a marker per group, and send my colleague the script. Or I'd just ask them which two it is,
which is exactly what I didn't want to do."

---

## Answers

**Single Ease Question (1 very difficult to 7 very easy): 2.**

"Not a 1, because the Look menu actually says 'color-blind readers' in words, and 'Colors you set
by hand are kept' answered my next question before I asked it, and the shape list explains itself
beautifully. It's a 2 because I couldn't find out which two groups were the problem, the one place
that could fix just those two is out of keyboard reach, the shape fix is out of keyboard reach, and
after I did the only thing I could do I had no way to check it worked. A fix I can't check is a
rumour."

**Would you use this instead of your current tool, and why?**

"No. For this job my current tool is matplotlib and a named palette, plus a marker per group, and
every bit of it is text I can read back. What would change my mind isn't much, and none of it is an
accessibility mode: say each group's colour next to the group, wherever the groups are listed; tell
me when two groups in the picture are hard to tell apart and which two; make the value rows and the
shape choices real controls; and after I change something, tell me once what changed and whether
the problem is gone. Do those and this is the one tool where I could fix a figure for a sighted
colleague without asking them first. That would be new. Right now it's enthusiastic."

---

## Problems, ranked

| Sev | Where | What |
|---|---|---|
| 4 | legend on the canvas (frame at rest, inspector, colour by value) | The legend, and every list of groups, names no colours, so a screen-reader user cannot learn which groups share a hue. |
| 4 | colour by value, "Module as color" value list | The per-value rows are text; "Change color..." cannot be reached by keyboard. |
| 4 | colour by value, layer editor, Shape binding | Shape by group ("module categories, 9") is listed as text, not a choosable option; the colour-independent fix is unreachable. |
| 3 | styles list, Look menu | Print names colour-blind readers but does not say what it does to groups, and nothing reports afterwards whether any two groups still collide. |
| 3 | styles list, colour picker | Swatches are named by hex only, and no list ties a group to its colour, so "two blues" cannot be matched to "which two groups". |
| 3 | inspector, Style stack | The Look is plain text, not a control, where the groups are listed. |
| 2 | frame at rest, legend | Group names and counts read as one run of bare numbers ("2 14 8 13 ..."); "Other" hides its members in a tooltip that is not read. |
| 2 | frame at rest / styles list / inspector | The Look control is "Look: Default", "Screen" and text "Look Default" on three pages. |
| 2 | frame at rest, Style stack | Enter on a layer row gives no feedback about an editor opening or where focus went. |
| 2 | colour by value, palette field | "Eight distinct colors" is a claim the reader cannot test and the task shows is false for some readers. |
| 2 | styles list, picker Libraries tab | Palettes listbox named "Custom Libraries"; no palette is marked safe for colour-blind readers. |
| 2 | colour by value, Shape | "Shape: sphere" is a pressed toggle with no hint what un-pressing does; no word on shapes for nine groups. |
| 2 | inspector, Style stack | The tree has no accessible name. |
| 1 | styles list, Style stack | The tree's name reads "Style stack Look Screen" run together. |

## What worked

- The Look menu's Print entry says "for color-blind readers" in words, not by an icon.
- "Colors you set by hand are kept." answered the next question before it was asked.
- The shape binding's reasons ("Shape takes categories; bin degree first") explain a refusal and
  the way round it in one line.
- The inspector's style-stack tree gives each group as its own item, name then count, with the
  heading "Style stack top wins" saying what order means.
- Headings on every page name the parts; the table strip is a real, named button.
