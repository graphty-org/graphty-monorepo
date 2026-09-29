# Session: restyle two groups -- Morgan Reyes, screen-reader analyst

- **Participant:** Morgan Reyes, blind senior analyst, NVDA and keyboard only, screen curtain on
  (simulated; see study/personas/screen-reader-analyst.md).
- **Task, as the moderator gave it:** "Two of the groups are drawn in colors you cannot tell
  apart. Fix that so a colleague can read the picture."
- **Screens used:** screens/frame-at-rest.html (Les Miserables, Group color),
  screens/colour-by-value.html (the legend with its color picker open; the "Module as color"
  editor; the color binding list), screens/styles-list.html (the Look menu; the Style stack's "+"
  menu; the picker's Libraries tab), screens/inspector.html (nothing selected; a Louvain group
  selected).
- **How the pages were read:** each page's accessibility tree (roles, names and text in reading
  order, what NVDA is given) was dumped in the participant view and walked as NVDA would read it
  with H, Tab, Shift+Tab and the arrow keys. The renders in shots/ (screens__colour-by-value-legend.png
  and the frame-at-rest render) were checked afterwards only to know what a sighted colleague sees;
  Morgan does not see them.
- **Outcome:** success with difficulty. Morgan found the colour of every group in words for the
  first time, found one pair the tool itself calls too close, and fixed it from the keyboard. For
  the pair the colleague most likely meant, Morgan had to infer it from colour names that sound
  alike, and added a shape layer as the fix; nothing in text confirmed the picture is now readable.
- **Single Ease Question:** 4 of 7.
- **Would use it instead of the current tool:** not yet; for this job, maybe, once it tells them
  which pairs clash and confirms a fix.

Severity scale used below: 1 cosmetic, 2 slows me down, 3 I needed a workaround or help,
4 stopped the task.

---

## Transcript (think-aloud, in Morgan's words)

### 0. Before touching anything

"Same task as last time, word for word. Last time I gave it a 2 and changed the whole project to
Print on faith. My keystroke file has one line for this tool under styling: 'legend says no
colours'. Let's see if that line is still true."

"What I need hasn't changed. One: which two groups, in words. Two: a fix I can do with the
keyboard. Three: something in text afterwards that says it worked, so I don't have to turn to my
colleague and ask 'better?'"

### 1. The frame at rest (Les Miserables)

Title: "Main frame at rest, Les Miserables." H: "Les Miserables, heading level 1", "Graphs",
"Sets and paths", "Views". Into the main region: "Les Miserables colored by group, nothing
selected, application." Then the legend, one line: "Group color 2 14 8 13 4 11 1 10 3 10 5 10 0 4
Other 5 Groups 6, 7 and 10."

"Well. Word for word the same as last time, except 'Other 5' now tells me it's groups 6, 7 and
10. That's one thing fixed and I'll take it. But the rest is still 'two fourteen eight thirteen'
with no colours, and it's still one run of text, so I'm back on the braille display pairing up
numbers. This is the first page anyone opens. If the colours are said somewhere, they're not said
here."

"The Style stack is a listbox: 'Group color', 'Base style'. No colours in there either. And the
Look is a button called 'Look: Default'. Remember that name."

**Problem (3):** on the frame at rest the legend still names no colours, and still reads as one
run of bare numbers; a reader who starts here cannot find out which groups share a hue.

### 2. The legend on the colour-by-value page -- this is new

On screens/colour-by-value.html (protein network, Module color): into the main region, "group,
Legend: Module color". Then Tab:

- "Ribosome color: Sky blue. Change color, button."
- "Ribosome, 56 proteins. Select them, button."
- "Proteasome color: Orange. Change color, button."
- "Proteasome, 40 proteins. Select them, button."
- "Complex I color: Bluish green. Change color, button."
- "Spliceosome color: Blue. Change color, button."
- "Other color: Light gray. Change color, button."
- "Other, 26 proteins: Unassigned. Select them, button."

"Stop. Say that again." (Shift+Tab, Tab.) "'Ribosome color: Sky blue.' That is a colour, next to a
group, in words, in the legend. Fifteen years, and I think this is the first graph tool that has
told me what colour anything is without me asking a person. Two stops per row, the swatch and the
name -- 'change color' and 'select them', important word first. Down arrow on a swatch goes to the
next swatch, so I can run down just the colours. Good. That's the right shape."

"Now, 'Sky blue' and 'Blue'. Ribosome and Spliceosome. At my speech rate those two are the same
sound with a syllable on the front. My own rule is: if two things sound alike I say I can't tell
them apart, and I don't guess. But here the tool is literally asking me to guess which colours
look alike, and two colour names that differ by one word is the best evidence I've been given. So
my working bet is Ribosome and Spliceosome. I'm writing down that it's a bet."

"Then 'text: 4 more'. Tab goes straight past it to Other. Enter on it -- nothing, it's text. So
four of the nine groups -- which four? -- have no colour I can reach from the legend. If the clash
is in those four, this legend can't tell me."

**Problem (3):** the legend never says which two groups are hard to tell apart; on the default
colours there is no flag at all, so the reader has to infer a clash from colour names that sound
alike.
**Problem (3):** "4 more" in the legend is plain text, not a control; four groups' colours cannot
be reached from the legend.

### 3. The picker -- and the list that answers the "4 more"

The page is drawn with a picker already open on Proteasome. Tab lands in "dialog, Proteasome
color". "Tablist, Custom selected, Libraries." "Hex." "4AA3DF 100 %." "Light blue, picked for
Proteasome." "Not used in this layer." "Orange, not used, button." "Used in this layer." Then
buttons: "Sky blue, used by Ribosome", "Bluish green, used by Complex I", "Blue, used by
Spliceosome", "Black, used by MAPK signaling", "Vermilion, used by DNA repair", "Reddish purple,
used by Cell cycle", "Yellow, used by TGF-beta", "Light gray, used by Other."

"Oh, that's handy. By accident, this is the complete legend. Every group and its colour, one
button each. So the '4 more' are MAPK signaling black, DNA repair vermilion, Cell cycle reddish
purple, TGF-beta yellow. None of those sound like each other. Black and light gray are far apart
by name. So the blues are still my best bet. I've written 'open any swatch's picker to hear the
whole palette' in my keystroke file, which is a workaround, and I don't like that the full list
lives in a popup and not in the legend."

"And last time these swatches were hex codes and I was doing colour science in my head. Now
they're names. Same data, a hundred times more usable."

"The big square is 'Saturation and brightness', image. 'Hue', image. Unlabeled sliders last time;
now they're named images I can't operate. Fine -- I'd type a hex before I'd drag anything, and
the Hex field is there."

**Problem (2):** the only place that lists every group with its colour is the picker's "Used in
this layer" list; the legend itself cuts off after four.
**Problem (1):** the picker's colour area and hue bar are announced as images; the Hex field is
the only keyboard route to a custom colour.

### 4. The flag the tool does raise

Back up to the legend. Between Proteasome and Complex I: "Proteasome color: Light blue, picked, too
close to Ribosome's Sky blue. Change color, button, expanded." Then "exclamation. Too close to
Ribosome's sky blue." "Fix..., button." And in the status area: "Proteasome is now light blue,
was orange. Too close to Ribosome. Undo, button."

"Now this is the thing I asked for last round, and it's here: two groups, named, 'too close', said
in the legend and said once when it happened, and it stays on the page so I can go back and read
it. That's exactly 'tell me once, then let me find it again'."

"So on this page there are two pairs in play. The one the tool flags: Proteasome light blue
against Ribosome sky blue. And the one I inferred: Ribosome sky blue against Spliceosome blue. If
my colleague's complaint was the flagged one, the tool has done the finding for me."

"Fixing the flagged one: in the picker, 'Orange, not used' is the first swatch, because it's the
only colour free in this layer. Enter on it. The page is drawn at one moment, so I can't hear what
it would say next; if it follows its own pattern it says 'Proteasome is now orange, was light
blue' and the flag goes. I'll assume that. Or the Undo button on the notice gets me there in one
key. Either way I can do it from the keyboard, which I could not last time."

"'Fix...' -- I pressed it. The page doesn't show what it does. I'd guess it offers a colour that
isn't too close. I'm not sure I'd trust a button called Fix that doesn't say what it will change,
but I'd at least listen to what it opens."

"Here's what bothers me. On the other drawing of this page -- Proteasome still orange, the default
colours -- there's no flag anywhere. Ribosome sky blue, Spliceosome blue, and silence. So the check
only runs on colours I picked? Then when the tool says nothing, I don't know if that means 'these
are fine' or 'I didn't look'. My colleague says two groups clash and the tool says nothing. One of
them is wrong and I can't tell which."

**Problem (3):** the too-close check only speaks about colours the reader picked; on the default
colours it is silent, and silence cannot be told apart from "checked, and fine".
**Problem (2):** "Fix..." does not say what it will change before it is pressed.

### 5. The fix that doesn't depend on colour at all

"If I can't be sure which two blues my colleague means, the fix I trust is the one I'd write in
Python: a marker per group as well as a colour. Last time the shape choices were text I couldn't
reach."

On screens/styles-list.html, H to "Style stack", Tab: "Look", "Screen, button", "Add a style
layer, button". Enter: "menu. Empty layer, Paints nothing until you set a property. From a recipe
or file..., Only a recipe's styles; your data stays here. Suggested for this graph. Mute
categories under this scale, Module color in grays on the other 216. Shape by kind: module, Top 5
modules get shapes; 4 share Other."

"There it is, as a real menu item. 'Shape by kind: module. Top 5 modules get shapes; 4 share
Other.' And it tells me the limit -- five shapes -- which is what I asked last round. Top 5 by
size is Ribosome, Proteasome, Complex I, Spliceosome and... the fifth, MAPK signaling, from the
counts. So both of my blues, Ribosome and Spliceosome, and the flagged pair, Ribosome and
Proteasome, all get their own shapes. That covers every candidate I have. I'll take it. Enter."

"The page stops there. I don't hear what it added. I'd expect a new layer at the top of the Style
stack and the legend to say which shape each group got. I can't check that it did."

"One more thing: this menu lives on a page where a fold-change colour is on top of the module
colours. It says 'Suggested for this graph'. I don't know if I'd get the same suggestion on my own
graph with only group colours, or whether I'd have to build a shape layer by hand from 'Empty
layer'. Last time that route was text I couldn't reach."

**Problem (3):** after choosing "Shape by kind", nothing in text confirms which group got which
shape, or that the two groups my colleague meant are now told apart.
**Problem (2):** the shape suggestion appears as "Suggested for this graph"; it is not clear it is
always offered when a category colour layer is present.

### 6. The Look menu, again

"For completeness, the big hammer. 'Screen, button, expanded.' Menu: 'Look for the whole project.
Screen, The palettes each layer chose, checked. Print, Reads in gray on white paper and for
color-blind readers. Where a color shows a direction, a shape shows it too. High contrast, Every
color clears 3:1 against the canvas it is drawn on. Colors you set by hand are kept.'"

"Identical to last time. Still doesn't say what Print does to groups -- groups aren't a
direction. And still nothing afterwards to say whether any two groups collide. I'm not using it
this time, because I have a narrower fix now."

"The button is called 'Screen' here with 'Look' as loose text before it. On the frame it was
'Look: Default'. On the inspector page it's text, 'Look Default', not a button at all. Three
names still. And the Style stack list's name is read as 'Style stack Look Screen', all run
together."

**Problem (3):** Print still does not say what it does to categories, and nothing reports whether
any two groups still collide after choosing it.
**Problem (2):** the Look is "Look: Default" (frame at rest), "Screen" (styles list) and plain
text "Look Default" (inspector); Default and Screen may or may not be the same.
**Problem (1):** the Style stack list's accessible name reads "Style stack Look Screen".

### 7. The inspector

On screens/inspector.html, nothing selected: H gives "Overview", "Style stack top wins",
"Results", "Notes", "Export". The legend on the canvas: "Module color module Ribosome 56
Proteasome 40 Complex I 35 Spliceosome 32 DNA repair 30 4 more." The Style stack tree, no name:
"Module color", "Ribosome, 56", "Proteasome, 40", "Complex I, 35", "6 more", "Size: degree",
"Base style". Then text "Look Default".

"So on this page -- the page that's supposed to be the whole stack with its legend -- no colours
again. The colour-by-value page says 'Sky blue'; this one says 'Ribosome, 56'. Same groups, same
layer, two legends, only one of them talks. That's the kind of inconsistency that makes me stop
trusting either."

With a Louvain group selected: "Louvain color community", listbox: "Community 1 62", "Community 2
43", "Community 3 36", "Community 4 36, selected", "6 more". "Same again: counts, no colours.
And 'Louvain color, paints this selection's color: Louvain color, Community 4, color.' It paints
a colour and won't tell me which."

**Problem (3):** the inspector's Style stack and its canvas legend, and the Louvain legend, still
name no colours; only the colour-by-value legend does. The same layer is described two ways.
**Problem (2):** the inspector's Style stack tree has no accessible name; "6 more" gives no hint
what Enter does.

### 8. Things I heard that I didn't ask for

"At the bottom of the colour-by-value page, after the last control, NVDA reads 'Select Ribosome
Select Proteasome Select Complex I Select Spliceosome Select Other Select Ribosome Select
Proteasome ...' then 'Select Community 1' through 8. Twice over for some of them. On the styles
list page, after the menu, a paragraph of definitions -- 'Pieces of the graph with no connection
between them. The share of the possible connections that exist.' -- repeated maybe thirty times.
I assume those are tooltips that are supposed to be hidden. To me they're a wall of noise at the
end of every page, and I read to the end of pages."

**Problem (2):** hidden tooltip text is exposed to the screen reader at the end of the page,
repeated many times ("Select Ribosome ..." on colour by value; definitions of components and
density on the styles list).

### 9. Where that leaves me

"I did two things: put Proteasome back on orange, which the tool itself said was too close, and
added shapes for the five biggest modules, which covers the blue pair I guessed at. I think the
picture is readable now. I *think*. The honest version is: the tool told me the colours, which it
never did before, and it caught the clash I made. It did not tell me which clash my colleague
saw, and it did not tell me the fix worked. So I'd still send my colleague a message -- but it
would say 'I've given the modules shapes, check Ribosome and Spliceosome', not 'what does it
show?'. That's a different message. A better one."

---

## Answers

**Single Ease Question (1 very difficult to 7 very easy): 4.**

"Up from 2. The legend on the colour-by-value page names every colour in words, the picker names
every swatch with the group that uses it, a clash I made is flagged in words and announced once,
and 'Shape by kind' is a real menu item with its limit stated. Every one of those is something I
asked for. It's not higher because the tool still won't tell me which two default colours clash
-- it only checks colours I picked -- so I had to guess from 'Sky blue' and 'Blue'; the '4 more'
in the legend is dead text; the frame and the inspector legends still say no colours at all; and
after the fix nothing in text says the problem is gone. A fix I can't check is still half a
rumour."

**Would you use this instead of your current tool, and why?**

"Not yet. Today my fix is matplotlib, a named palette and a marker per group, and I can read all of
it back. But this is the first time a graph tool has come close to letting me do this job without
a sighted person. If every legend said the colours the way the colour-by-value one does, if the
tool told me which pairs are too close on its own colours and not only on mine, and if after I
change something it said 'no two groups are too close now', I'd use it for exactly this: fixing a
figure for a colleague before they have to ask. That would be new. It's gone from enthusiastic to
nearly useful."

---

## Problems, ranked

| Sev | Where | What |
|---|---|---|
| 3 | colour by value, legend (default colours) | The legend never says which two groups are hard to tell apart; the too-close check runs only on colours the reader picked, so on the default colours it is silent and silence reads the same as "checked and fine". |
| 3 | frame at rest, legend | Still names no colours and still reads as one run of bare numbers ("2 14 8 13 ..."). |
| 3 | inspector, Style stack and canvas legend | Module and Louvain legends name no colours; only the colour-by-value legend does, so the same layer is described two ways. |
| 3 | colour by value, legend | "4 more" is plain text, not a control; four groups' colours cannot be reached from the legend. |
| 3 | styles list, "+" menu, Shape by kind | After choosing it, nothing in text says which group got which shape or that the clashing pair is now told apart. |
| 3 | styles list, Look menu | Print still does not say what it does to groups, and nothing afterwards reports whether any two groups still collide. |
| 2 | colour by value, picker | The only full list of groups and colours is the picker's "Used in this layer" list, inside a popup. |
| 2 | colour by value, legend | "Fix..." does not say what it will change before it is pressed. |
| 2 | styles list, "+" menu | "Shape by kind" is labelled "Suggested for this graph"; unclear whether it is always offered for a category colour layer. |
| 2 | frame at rest / styles list / inspector | The Look is "Look: Default", "Screen" and plain text "Look Default" on three pages. |
| 2 | colour by value, styles list | Hidden tooltip text is read at the end of the page, repeated many times. |
| 2 | inspector, Style stack | The tree has no accessible name; "6 more" gives no hint what Enter does. |
| 1 | colour by value, picker | Colour area and hue bar are announced as images; the Hex field is the only keyboard route to a custom colour. |
| 1 | styles list, Style stack | The list's accessible name reads "Style stack Look Screen" run together. |

## What worked

- The colour-by-value legend names each group's colour in words ("Ribosome color: Sky blue.
  Change color"), with the swatch and the name as two separate controls and Up and Down running
  down one kind.
- The picker names every swatch and the group that uses it ("Blue, used by Spliceosome"), with
  the unused colours first.
- A clash the reader creates is flagged in words on the legend entry, names both groups, and is
  announced once in a notice that stays on the page with Undo.
- "Shape by kind: module" is a real menu item and states its limit ("Top 5 modules get shapes;
  4 share Other").
- "Other" now says which groups it holds on the frame at rest ("Groups 6, 7 and 10").
- "Colors you set by hand are kept." still answers the next question before it is asked.
