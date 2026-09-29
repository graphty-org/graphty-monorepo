# Getting back after a wrong step -- Explorer Elena

**Participant.** Elena, a product manager with no graph training, used to Google Sheets and a
product-analytics dashboard (persona: study/personas/explorer-elena.md).
**Screens.** Undo and ways back, participant view, version A (undo shows no message while the
filter chip is visible), then the filter steps list that opens from the chip.
**Task, as given.** "After your last few actions the numbers changed in a way you did not expect.
Get back to where you were, without losing work you meant to keep."
**Set-up the participant did not know.** Three filter steps are applied (keep the largest
connected piece, keep characters with at least 5 connections, leave out group 8). The middle one
is the mistake. A stray click has also cleared a 19-character selection.

## Session, thinking aloud

**Start (28 of 77 nodes, 3 steps).** "OK. Les Miserables, dots, lines. The thing up top says
'Filtered: 28 of 77 nodes, 3 steps'. So I did three things and now I have 28. The table says
'Selected: none, showing the previous selection' -- I have no idea what that means. Selected
none? I thought I had a bunch selected. Whatever. The moderator says the numbers went weird, so
my instinct is the same as in Sheets: Ctrl+Z."

**Ctrl+Z once (41 of 77, 2 steps).** "Something happened. A whole blue clump came back at the
bottom -- Marius, Gavroche, those guys. Top says 41 now, 2 steps. Did it undo the right thing? It
didn't tell me what it undid. In Sheets at least I see the cell flash. Here I just have to squint
at the number. 41 feels like more than I had... but the moderator said the numbers were wrong,
so maybe 41 is right? I honestly can't tell. I'll press it again, I think the mess was earlier."

**Ctrl+Z again (76 of 77, 1 step).** "Whoa. Now everything's back, it's a hairball again. 76. OK
that's too far, I definitely didn't want this. I just threw away two things, and I don't even
know which two. This is the moment I'd normally close the tab."

**Looking for a way to see what I did.** "There's that pill up top with the funnel, 'Filtered: 76
of 77 nodes, 1 step'. It's the only thing that talks about steps, so I click it." A box drops
down: "Filter steps", one row, "Filter to Largest component 76", and "Add step". "So... my other
two steps are just gone? There's no list of what I undid. Great."

**Ctrl+Y twice.** "Sheets has Ctrl+Y for redo, let me try." After the first press the list shows
a second row, "Filter to degree >= 5, 41". After the second, a third row, "Filter out group 8,
28", and we're back at 28 of 77. "Oh thank god, they came back. And now I can actually SEE them.
That list is what I wanted from the start -- it's like the applied-filters bar in our dashboard.
Why did I have to find it by accident?"

**Deciding which step is wrong.** "Three rows, each with a number: 76, 41, 28. The 76 to 41 drop
is the big one -- half my characters vanish in one go. 'degree >= 5'. I don't really know what
'degree' is. Five of something. Connections, I guess? And 'group 8' -- I don't know what group 8
is either, it's just a colour in the legend. I remember I meant to hide one group, so group 8 was
on purpose. The degree one must be the weird one. It's a guess, though." She unticks the middle
row. It turns grey and reads "--". The chip reads "63 of 77 nodes, 2 of 3 steps". "OK, it kept the
step, just switched it off. I like that I can tick it back if I'm wrong. Nice that the others
didn't move."

**The selection.** "Now the table still says 'Selected: none, showing the previous selection'
with 'Previous selection' next to it. 'Back to where you were' -- I did have a group picked out,
Valjean and his crowd. I'll click 'Previous selection'." The 19 characters light up on the
canvas, the table reads "Selected: 19 of 63 nodes", and the right side lists them by group.
"There they are. I would never have found that on my own if I hadn't been hunting for the word
'previous'. It looks like a label, not a button."

**End state.** 63 of 77 nodes, 2 of 3 steps (the degree step off, group 8 still out), the 19
characters selected again. This matches the intended finish.

## After the task

**Single Ease Question: 4 of 7.** "I got there, but only because I know Ctrl+Y from Sheets. If I
hadn't, my two steps would just be gone and I'd have started over. Undo doesn't say what it
undid, so I undid one thing I wanted to keep and then another. Once I found the steps list it was
actually easy -- tick boxes, and a number next to each so I can see where things drop."

**Would she use this instead of her current tool?** "For this kind of 'why did my numbers
change' thing, the steps list is better than anything I have -- our dashboard just shows the
filters, it doesn't tell you how much each one cut. But I'd want it to show me that list the
moment I press undo, or put the steps somewhere I can see without clicking. And 'degree' and
'group 8' mean nothing to me; I'd have guessed wrong if I hadn't remembered hiding a group. So:
maybe, for the picture. I would not trust myself to fix a filter in front of my boss."

## What the designers should take from this

- Undo with no message cost a step she wanted: she could not tell which step the first press
  reversed, so she pressed again and lost the good work too. She recovered only through Redo,
  which she knew from Sheets. A first-time user without that habit would have started over.
- After undoing, the filter steps list shows only the steps still applied. The undone steps
  disappear from view, so she believed they were gone for good.
- The steps list, once found, worked well: tick boxes, a count after each step, an off step kept
  and greyed. The per-step counts were how she spotted the wrong step.
- She found the list only because the chip was the one thing that said "steps"; nothing pointed
  her there after an undo.
- The step names "degree >= 5" and "group 8" are jargon and bare ids to her; she found the step to turn off
  by memory and elimination, not by reading its name.
- "Previous selection" in the table's status line reads as a label, not a control. "Selected:
  none, showing the previous selection" confused her at the start.
