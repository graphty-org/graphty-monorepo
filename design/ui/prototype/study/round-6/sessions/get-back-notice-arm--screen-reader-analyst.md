# Get back to where you were, the line-only version -- Morgan, screen-reader analyst

**Participant:** Morgan, senior analyst on a public-health research team, blind, works with NVDA
in Chrome and a 40-cell braille display, keyboard only, screen curtain on. Uses Python and
NetworkX for network work and knows networks from numbers, never from pictures.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** the line-only version of undo. When a selection is cleared, the one-line
notice above the toolbar says so and offers Bring it back; Ctrl+Z always undoes the last filter
step and never touches the selection. (The other version, where Ctrl+Z brings the selection back
first, is a separate session.)

**Where Morgan was, in their own memory (the moderator's setup):** the Les Miserables sample,
narrowed with "at least 2 connections" and "leave out group 8, the students at the barricade",
with Valjean and the 17 characters beside him selected and being read in the table. Morgan did
not knowingly add a third filter. Done means: 47 of 77 nodes, 2 of 3 steps (the stray "degree at
least 5" step off, group 8 on), and the same 18 characters selected again.

**Screens used:** the undo screen in participant view, line-only version
(`screens/undo.html#study&notice`), driven by keyboard only; the steps list it opens (the filter
chip's own list, as in `screens/filter-chip.html` and `screens/filter-steps-and-undo.html`). The
flow page `flows/undo-and-ways-back.html` was read afterwards by the moderator to check what each
key is meant to do.

Renders looked at by the moderator (Morgan had the screen curtain on):
- `../../../shots/screens__undo-notice-arm.png` (the start: "Selection cleared (18 nodes)" with Bring it back)
- `../../../shots/record/round-6-fc-undo-notice.png`, `../../../shots/record/round-6-fc-undo-restore.png`
- `../../../shots/screens__undo-s2.png` (after one Undo: 40 of 77, 2 of 3 steps)
- `../../../shots/screens__undo-list.png` (the steps list opened from the line)
- `../../../shots/screens__undo-fix.png` (the intended end state)
- `../../../shots/flows__undo-and-ways-back.png`

## Think-aloud

**The moment it happened.** "I was on the drawing, I pressed something, and it said 'Selection
cleared, 18 nodes. Ctrl+Z brings it back.' Fine. Short, and it gave me a key. The important word
was first. I like that more than I expected to."

"NVDA+Tab. 'Les Miserables, 27 of 77 characters drawn after 3 steps, application.' Twenty-seven.
Three steps. I made two filters, and I'm fairly sure I was reading forty-something. So two things
went wrong: my selection's gone, and there's a step I don't know about. Selection first. I was
reading it, and the thing just told me how to get it back."

**First reach: Ctrl+Z, because it told me to.** *Presses Ctrl+Z.*

"'Undone: Filter out group 8. Show in steps.' ... No. No, no. You said Ctrl+Z brings it back. I
pressed Ctrl+Z. You took my group 8 filter instead. That's not a guess on my part, that's your
own sentence from four seconds ago."

"And focus. NVDA+Tab: document. I was on the drawing and now I'm nowhere. Again."

*Moderator's note: in this version Ctrl+Z always undoes the last filter step, as designed. But
the spoken announcement at the moment of loss is the same as in the other version: "Selection
cleared (18 nodes). Ctrl+Z brings it back." Morgan did exactly what the announcement said.*

"Put it back. Ctrl+Y." *Presses Ctrl+Y.* "'Redone: Filter out group 8. Show in steps.' OK, the
filter's back. Now the selection. The line said... it doesn't say anything about the selection
any more. The selection sentence is gone. Where did it go?"

*Arrows through the page, looking for it.* "Down at the table: 'Selected: none, showing the
selection just cleared. Show filtered graph, button.' 'Just cleared.' So it knows. The rows are
the ones I had, Valjean first. But there's no button to select them. 'Show filtered graph' is the
opposite of what I want. Tab to the line above the toolbar: 'Redone: Filter out group 8. Show in
steps.' Nothing about my 18."

"Main menu, Edit. 'Undo Filter out group 8, Control Z. Redo, Control Shift Z. Undo history.'
Undo history: three filter steps, newest first. No selection in it. No 'previous selection'. So
it's gone. The one time the tool gave me a key, the key destroyed the thing it said it would
restore. That's dead end number one, and it's the worst kind: not silence, a wrong instruction."

**The numbers.** "Fine. I'll get the filters right and rebuild the selection by hand afterwards,
the way I would in Python. 'Show in steps' is on that line. Tab from the drawing... one Tab and
I'm on it. Good, it's close. Enter."

"'Step 3 of 3: Filter out group 8, took out 13, 27 left.' Focus on a row, and it's the row the
line was talking about. Up arrow."

"'Step 2 of 3: Filter to degree at least 5, took out 20, 40 left. Keeps only nodes with at least
5 neighbors among the 60 it reads.' There. Degree at least 5. I didn't make that. It took out 20.
First four words are the ones I need. The sentence is long, but I can stop listening after 'at
least 5'."

"Up: 'Step 1 of 3: Filter to degree at least 2, took out 17, 60 left.' Mine. Down, Space on the
bad one." *Presses Space.* "'Step 2 of 3: Filter to degree at least 5, off.' Stayed on the row.
Good. 'Off' at the end again, but I can live with that when I'm the one who just pressed it."

"Down: 'Step 3 of 3: Filter out group 8, took out 13, 47 left.' Forty-seven. That's my number.
That's where I was, minus the selection."

"Escape to close it." *Presses Escape.*

"... What. It's reading me the start again. 'Selection cleared, 18 nodes, Bring it back.' The
drawing says 27 of 77, 3 steps. Everything I just did is gone."

*Moderator's note: in the participant view, Esc also leaves the participant view, and the page
reloaded to its starting state. This is the test page, not the design: the design says Esc
closes the list and puts focus back on the filter chip. The moderator told Morgan so and put the
page back to where Morgan had got to (47 of 77, 2 of 3 steps, nothing selected). That used
Morgan's one question to the moderator for this task.*

"All right. I'll take your word that the product doesn't do that. I'm still counting it. That's
twice something went back on its own in five minutes, and I'm the one who has to trust it with a
quarter's worth of steps."

**The selection, first time through.** "So I'm at 47, two of three, correct. My 18 are listed in
the table as 'the selection just cleared', but I can't select them from there. In NetworkX I'd
just rebuild the list: Valjean and his neighbours. I'm not asking you whether there's a 'select
neighbours' here; that would be my second question, and a second question is a fail. The menu's
Selection item goes nowhere in this page. So I'm not getting my selection back. Task half done.
Numbers right, selection lost."

**Checking twice.** "Reset it. Let me do it again, because once is a rumour. This time I know the
key lies." *The moderator resets.*

"'Selection cleared, 18 nodes. Ctrl+Z brings it back.' I am not pressing Ctrl+Z. Tab from the
drawing: 'Bring it back, button.' One Tab. Enter."

"'Selection restored, 18 nodes.' Good. It said it once, and the line still says it if I go and
look. NVDA+Tab: document. Focus fell again. Every single button on this line drops me on the
floor. The table: 'Selected: 18 of 27 nodes. Sorted by degree.' That's my 18."

"Now the filters. Ctrl+Z: 'Undone: Filter out group 8. Show in steps.' Table: 'Selected: 18 of
40.' The selection survived an undo. Good; that's how it should be. I don't want group 8 undone,
though, so into the list. Focus is on the document again, so from the top: Tab, Tab, Tab..."
*Thirteen Tabs to reach the line's action.* "'Show in steps, button.' Enter. 'Step 3 of 3: Filter
out group 8, off.' Space: 'took out 13, 27 left.' Up, Space: 'Step 2 of 3: Filter to degree at
least 5, off.'"

"Table: 'Selected: 18 of 47 nodes.' There. That's exactly where I was. And I'm not pressing Escape
this time; I'll Tab out."

"Second time: fine. First time: I lost the selection by obeying the tool. Your second time only
worked because the first one burned me."

**Things Morgan tried that did not work.** "The chip, the '27 of 77 nodes, 3 steps' button. I
tried it before the line, out of habit. Enter: nothing said, focus on the document. Something
opened, probably. I don't know. I only found the list through the line."

## Where Morgan ended

First attempt: 47 of 77 nodes, 2 of 3 steps (degree at least 5 off, group 8 on), which is right,
but with the selection permanently lost. Morgan pressed Ctrl+Z because the announcement at the
moment of loss said "Ctrl+Z brings it back"; in this version Ctrl+Z undid the group 8 filter
instead and emptied the slot the selection was held in, so Bring it back disappeared and nothing
else could bring the 18 back. One further reset came from Esc leaving the participant view (a
test-page defect, not the design).

Second attempt, with what the first taught: Bring it back first, then the steps list. Reached the
intended end state: 47 of 77, 2 of 3 steps, Valjean and 17 others selected.

## Single Ease Question

**2 of 7.** "The line itself is decent. It's short, it keeps what it said until something else
happens, and Bring it back is one Tab from the drawing. The steps list is still the best part:
'took out 20, 40 left' is my print statement. But the tool told me which key to press, and that
key did something else and threw my selection away where I couldn't reach it. I don't give a
four to a tool whose instructions are wrong. And focus dropped after every single thing I
pressed, same as before."

## Would Morgan use this instead of their current tool?

"No. My scripts don't tell me one thing and do another. If the sentence matched the key, and
focus stayed where I left it, I'd look at it again for handing a filtered subgraph to a colleague,
because the steps list is a readable record of what I did. Between the two versions I'd want the
one where the key the tool tells me is the key that works. I don't much care which key it is. I
care that I only have to hear it once."

## What Morgan would still take away

- The spoken line at the moment of loss says "Ctrl+Z brings it back" in a version where Ctrl+Z
  undoes a filter step instead. Following it loses the selection for good: the undo empties the
  slot, the line is replaced by "Undone: Filter out group 8", and no control, menu item or history
  entry brings the 18 back.
- Once the undo line replaces the selection line, the fact "Selection cleared (18 nodes)" is gone
  from the page. The table's scope line still says "showing the selection just cleared", with no
  way to select those rows.
- Focus lands on the page body after Ctrl+Z, Ctrl+Y, Bring it back, and Enter on the filter chip.
  Only Show in steps puts focus somewhere useful.
- Enter on the filter chip opens the steps list silently, with focus nowhere.
- In a step row, the word that changed ("off", or "47 left") still comes last.
- Esc in the participant view reloads the page to its start (test page, not the design; counted
  anyway).

What worked twice: Bring it back is one Tab after the drawing and does what it says; the
selection survives a later Undo; Show in steps lands on the named row; the step rows say what
each step took out and what is left; Show filtered graph is now reachable by Tab.

## Moderator's notes (not heard by the participant)

- Checked by driving the page with the keyboard in a browser and logging the focused element, the
  line's text, the chip and the table's scope line after each key.
- The version comparison is confounded. The spoken text at the moment of loss is built by the same
  function in both versions and always names Ctrl+Z ("Selection cleared (18 nodes). Ctrl+Z brings
  it back."), while the page's own design note for this version says that Ctrl+Z still
  undoes the last filter step here and only Bring it back restores the selection. A participant who hears
  the announcement is told the other version's key. Until the spoken text names Bring it back (or
  no key) in this version, a low ease score here measures the wrong instruction, not the design
  of the version.
- Even with a correct announcement, Morgan's first reach in the previous round was Ctrl+Z before
  anything was said; in this version that path also loses the selection with no way back, because
  any undo empties the slot. That is the version's own cost, separate from the wording defect.
- Esc: the page closes the steps list on Esc but does not mark the key as handled, so the
  participant view's own Esc exit also fires and reloads the page to its starting state. Any
  participant who closes the list with Esc in participant view loses their work.
- The line is a live region rebuilt from scratch on every change; a real screen reader may not
  announce a region that appears already filled, so the "heard" lines above are what the design
  says will be spoken.
- Morgan reached the end state only on the second run, using knowledge from the first. Scored as a
  failure on first attempt.
