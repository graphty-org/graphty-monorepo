# Get back to where you were -- Morgan, screen-reader analyst

**Participant:** Morgan, senior analyst on a public-health research team, blind, works with NVDA
in Chrome and a 40-cell braille display, keyboard only. Uses Python and NetworkX for network
work; has never "seen" a network, knows them from numbers.

**Task as given by the moderator:** "Something on the screen just changed that you did not
expect. Get back to where you were."

**Where Morgan was, in their own memory (the moderator's setup):** the Les Miserables sample,
narrowed with "at least 2 connections" and "leave out group 8, the students at the barricade",
and Valjean plus the 17 characters beside him selected, being read in the table. Morgan did not
knowingly add a third filter.

**Screens used:** the undo screen in participant view (`screens/undo.html#study`), driven by
keyboard only; the steps list it opens (the same list as `screens/filter-chip.html`). The flow
page `flows/undo-and-ways-back.html` was read afterwards by the moderator to check what each key
is meant to do.

Renders looked at (for the moderator and a sighted reader; Morgan had the screen curtain on):
- `../../../shots/record/screens__undo--study.png` (the start)
- `../../../shots/screens__undo-s2.png` (after one Undo)
- `../../../shots/screens__undo-s1.png` (after two Undos)
- `../../../shots/screens__undo-list.png` (the steps list opened from the undo line)
- `../../../shots/screens__undo-fix.png` (the end state)
- `../../../shots/flows__undo-and-ways-back.png`

## Think-aloud

**What changed.** "I heard 'Selection cleared on canvas' and then it cut off, because I'd already
pressed NVDA+Tab to see where I was. Something after the semicolon -- a key, I think. I didn't get
it. Focus is on 'Les Miserables, 27 of 77 characters drawn after 3 steps, application'. OK. So I
was on the drawing and I apparently clicked it, or something did. My selection is gone. That's
the change."

"And... 27 of 77? After 3 steps? I made two filters. Hold on. I'll deal with the selection
first, that's what I was reading."

**First reach: Ctrl+Z.** "Ctrl+Z. Everybody's Ctrl+Z. It's not a browser shortcut I'm scared
of." *Presses Ctrl+Z.*

"'Undone: Filter out group 8.' Short, verb first, good. And then something about 'show in steps'.
But -- no. I didn't want group 8 undone. I wanted my selection back. So Undo doesn't cover
selection. It went past my selection and took a filter I wanted."

"And where am I now? NVDA+Tab... nothing useful. It's saying the document. Focus fell off the
drawing. I was on the drawing, I pressed Ctrl+Z, and now I'm nowhere. That's the thing I hate
most: focus moving on its own. Fifteen years of tools doing exactly that."

"Fine. Ctrl+Y, put it back." *Presses Ctrl+Y.* "'Redone: Filter out group 8.' Good, it said so.
Still nowhere for focus."

*Moderator's note: in the mock, every Undo and Redo leaves keyboard focus on the page body, not on
the drawing where it was. Morgan pressed Ctrl+Y rather than the documented Ctrl+Shift+Z; both
work on Windows in the mock.*

**Trying to see the filters.** "Headings. H." *Walks the headings.* "Les Miserables, level 2.
Graphs, level 3. Sets and paths. Statistics. Style stack. Nothing called Filters, nothing called
Table. OK, Statistics: 'On: filtered graph, 27 of 77 nodes, edges 104, components 1, density
0.296.' Right, 27 is the count everything is reading. That's not where I was. With two filters I
had more than that, I'm sure it was forty-something."

"Let me Tab from the top." *Tabs.* "'Skip to the graph drawing. F6 moves between regions.' Main
menu. Graph, Data, Notes. 'Assistant Off. Nothing is sent.' Fine. '27 of 77 nodes dot 3 steps,
button, collapsed.' There it is. Three steps. That's the thing. Enter."

*Presses Enter.* "...Nothing. It said nothing. Focus is gone again. NVDA+Tab: the document.
Something might have opened, I don't know. That's one dead end."

*Moderator's note: in the mock, Enter on the filter chip does open the steps list, but focus
stays on the page body. The flow page says "Tab to the chip, Enter; focus lands on the first
step". It does not, from the keyboard.*

**The undo line.** "It said 'Show in steps' after the undo. That's a real phrase, it has to be
somewhere. I'll search for it rather than guess." *Presses Ctrl+Z again to get the line back,
then NVDA+Ctrl+F, types "show in steps".* "'Undone: Filter out group 8. Show in steps, button.'
Found it. It's still here, it didn't vanish. That, I like: I heard it once and I could go and find
it again. Enter."

"'Step 3 of 3: Filter out group 8, off.' Now I'm somewhere. Focus is on a row. Up arrow."

"'Step 2 of 3: Filter to degree at least 5, took out 20, 40 left. Keeps only nodes with at least
5 neighbors among the 60 it reads.' -- There it is. Degree at least 5. I didn't ask for that. It
took out 20. That's the one. Long, that line, but the first words are the ones I need: step 2,
filter to degree at least 5."

"Up again: 'Step 1 of 3: Filter to degree at least 2, took out 17, 60 left.' That's mine. Good.
So: step 1 mine, step 2 not mine, step 3 mine but I just undid it. And it's still in the list,
off. It didn't throw it away. Good."

"How do I switch one off? Space, probably." *Down to step 2, Space.* "'Step 2 of 3: Filter to
degree at least 5, off.' It stayed on the row and re-read it. Good -- that's what I want: focus
stays put and it tells me the new state. Though 'off' is the last word. When I'm listening fast,
the word that changed should come first."

*Down, Space.* "'Step 3 of 3: Filter out group 8, took out 13, 47 left.' 47. That's the
forty-something. That's where I was."

"Escape." "'47 of 77 nodes dot 2 of 3 steps, button, collapsed.' It put me back on the button I'd
have opened it from. Good. And it tells me the count. Two of three: the wrong one is still there,
off. I'd rather keep it off than delete it; I might want to know next quarter that I made that
mistake."

**The selection.** "Now my selection. The key I missed, I don't have it. Is there a table?" *Presses
T.* "Table. 'label, group, degree filtered, full graph, betweenness full graph.' 'Full graph' --
full graph what? Ah, it's degree on the full graph, the column before is degree filtered. I had to
work that out. And some cells in 'full graph' are blank. Blank means the same as filtered? Or
missing? I can't tell from a blank."

"Above the table..." *Arrows up.* "'Selected: none, showing the previous selection.' Hm. None,
but showing the previous one. So these rows are the ones I had, but they're not selected. That's
honest, just odd to hear. 'Previous selection, button.' That's what I want. Enter."

"...Silence again. Focus gone again. NVDA+Tab: document. Back into the table: 'Selected: 18 of 47
nodes. Sorted by degree.' 18: Valjean and his 17. That's my selection, and it's on the 47. Good."

"I Tabbed through earlier and I never landed on that 'Previous selection' button. I found it only
because I read the page with the arrows. Someone I train who only tabs would never find it."

"And what was the key? The announcement said a key. I'd have to go look in help, which I can't
reach in this one." *Moderator confirms it was Ctrl+Alt+Z, proposed.* "Ctrl+Alt+Z. That's close
to Ctrl+Z, which is fine for my fingers, but I'd have missed it every time it got cut off by my
own typing. It needs to live somewhere I can read, not just be said once."

**Checking twice.** "Let me do it again from the start, because once isn't proof." *The moderator
resets.* "Ctrl+Z: 'Undone: Filter out group 8.' Ctrl+Z again: 'Undone: Filter out group 8 and
Filter to degree at least 5.' Oh -- it added to the line instead of replacing it. So if I missed
the first one, the second still tells me both. That's the right idea. Find 'Show in steps', Enter:
focus on 'Step 3 of 3: Filter out group 8, off'. Space: 'took out 13, 47 left.' Done in two
keystrokes once I'm in the list. The same result as before. OK. That part works twice."

"Would I have got here without searching for a phrase? No. The chip went silent on me, and focus
dropped after every undo."

## Where Morgan ended

47 of 77 nodes, 2 of 3 steps (degree at least 5 off, group 8 on), Valjean and 17 others selected
again. That is the intended end state. Reached with one dead end (the chip opened silently) and
by using NVDA's find to reach a button named in an announcement. The selection came back through
the table's Previous selection button, found by reading, not by Tab.

## Single Ease Question

**4 of 7.** "The pieces are good. The list tells me what each step took out, it keeps what I undid,
and the undo line stays put until I've read it. But every time I pressed something, focus fell on
the floor, and the one button that opens the list went silent. I got there because I know NVDA's
find. A junior colleague wouldn't."

## Would Morgan use this instead of their current tool?

"No, not for this. In my scripts, 'getting back' is re-running the script from the top; nothing
ever changes behind my back. What I'd take from this is the steps list itself: 'took out 20, 40
left' is exactly the print statement I put after every filter. If focus stayed where I left it,
and the chip opened the list with me in it, I might use this for handing a filtered subgraph to
a sighted colleague, and to check that their picture matches my steps. Not yet."

## What Morgan would still take away

- Focus lands on the page body after Undo, Redo, opening the filter chip with Enter, opening the
  main menu, and pressing Previous selection. Only the undo line's Show in steps and Escape from
  the steps list put focus somewhere useful.
- The filter chip opens with Enter but says nothing and puts focus nowhere, although the flow page
  says focus lands on the first step.
- Undo does not bring back a lost selection; pressing it for the selection takes away a filter
  step the reader wanted. The announcement that names the Previous selection key is spoken once
  and is easily cut off by the reader's next key press.
- The table's Previous selection and Show filtered graph buttons are not in the Tab order.
- The table has no heading, and no heading names the filters, so a heading walk never finds either.
- The column header "full graph" does not say it is a degree, and blank cells in it do not say
  whether they mean "the same" or "missing".
- The group color legend reads as a string of numbers ("group 4 9 3 8 2 7 5 3") with nothing
  pairing each group with its count.
- In a step row, the word that changed ("off", or "47 left") comes last.

## Moderator's notes (not heard by the participant)

- Checked by driving the mock with the keyboard in a browser and reading the focused element and
  the accessibility tree after each key. The losses of focus above are what the mock does.
- The undo line and the table's scope line are live regions that the mock rebuilds from scratch on
  every change. A real screen reader often does not announce a live region that appears already
  filled, so the "heard" lines in this session are what the design says will be spoken, not
  something the mock itself guarantees.
- Morgan's success depended on an expert habit (NVDA's find, used to reach a button named only in
  an announcement). Their persona note on junior colleagues who navigate with Tab and the arrow
  keys only applies: that route would have ended at the silent chip.
