# Get back to where you were (the notice-only version) -- Expert Emma

**Participant:** Emma, network scientist and consultant. Lives in Jupyter (networkx, igraph),
uses Gephi for the final figure and resents it. Keyboard first; checks numbers against a
reference before she trusts a picture. Firefox, 14-inch laptop.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way
you did not expect. Get back to where you were."

**Version under test:** a cleared selection is reported on the one-line notice above the
toolbar ("Selection cleared (18 nodes)" with **Bring it back**), and Ctrl+Z always undoes the
last filter step. It does not bring the selection back.

**Starting point (not told to the participant):** Les Miserables, 77 characters, narrowed by
three filter steps to 27 (degree >= 2, degree >= 5, leave out group 8). The middle step is the
mistake. A click on empty canvas has just cleared a hand-built selection of Valjean and the 17
characters beside him. Done means 47 of 77 nodes, 2 of 3 steps, with the same 18 characters
selected again.

**Screens seen** (renders, in order):
- `../../../shots/r6-emma-getback-notice-01-start.png` -- the starting screen
- `../../../shots/r6-emma-getback-notice-02-ctrlz-reflex.png` -- after Ctrl+Z once
- `../../../shots/r6-emma-getback-notice-02b-edit-menu-after-ctrlz.png` -- the Edit menu after that press
- `../../../shots/r6-emma-getback-notice-03-redo.png` -- after Ctrl+Shift+Z
- `../../../shots/r6-emma-getback-notice-04-two-undos.png` -- after Ctrl+Z twice more
- `../../../shots/r6-emma-getback-notice-05-show-in-steps.png` -- the line's Show in steps
- `../../../shots/r6-emma-getback-notice-06-tick-group8.png` -- group 8 step ticked back on (her
  end state)
- Shown after the task, when the moderator asked about the other route:
  `../../../shots/r6-emma-getback-notice-07-B-edit-menu-at-start.png` (Edit menu before any
  press) and `../../../shots/r6-emma-getback-notice-12-B-tick8.png` (the end state had she
  pressed Bring it back first)

## Think-aloud

**The starting screen.** "Numbers first. Chip says 27 of 77 nodes, three steps. Stats panel:
104 edges, one component, density 0.296. That density is high for this graph -- Les Mis is
around 0.09 whole -- so something has been cut hard. 27 is fewer than I'd expect from a degree-2
cut. I don't remember three steps, I remember two, but fine."

"There's a black pill in the middle: 'Selection cleared (18 nodes)', 'Bring it back'. OK, I
clicked the canvas, I lost Valjean's neighbourhood. That's the last thing I did. The filter is
the thing I actually care about, but the order is: undo the last thing, then the thing before.
Ctrl+Z."

**After Ctrl+Z once.** "...That's not what I asked for. Chip went to 40 of 77, 'two of three
steps'. A blue cluster just appeared at the bottom -- Marius, Enjolras, Gavroche, the barricade
students. The pill now says 'Undone: Filter out group 8'. So it undid a filter, not the clear.
And my selection is -- nothing's ringed. Selection gone."

"Hold on. The pill said 'Selection cleared' as the last event. Undo skipped the last event and
went for the one before. In every editor I use, undo reverses the most recent thing. If the
selection clear was not an undoable action, why was it announced in the same box, in the same
voice, as the undoable ones? That box looks like the undo log. It's the same pill."

"And undoing group 8 is exactly the wrong way round: group 8 was a step I wanted. Valjean's
filtered degree went from 17 to 21 in the table. Numbers moving again."

**The Edit menu.** "Let me see what it thinks undo means now." (Opens the menu, Edit.) "Undo
'Filter to degree >= 5', Redo 'Filter out group 8', Undo history. No 'restore selection', no
selection anywhere in there. Under it, Select all, and Copy ids greyed out. Nothing that says
'previous selection'."

**Ctrl+Shift+Z.** "Redo, to put group 8 back and see if the pill comes back with it." (Presses
it.) "27 of 77, three steps, 104 edges -- I'm back at the start of the filter side. Pill says
'Redone: Filter out group 8', Show in steps. No Bring it back. So that offer was a one-shot and I
spent it on a keystroke. The 18 are gone."

"The table is the odd part. It still says 'Selected: none, showing the selection just cleared'
and the rows are still Valjean, Fantine, Thenardier, Javert. So the machine knows exactly which
18 they were -- it's showing them to me -- and there's no way to say 'select these'. In a
notebook this is `sel = set(G[valjean]) | {valjean}`, one line, and it doesn't evaporate. Here
it's a caption promising something it can't deliver any more."

"I'm not going to click 18 circles. Park the selection. Fix the numbers."

**Two more Ctrl+Z.** "Now I know Ctrl+Z walks the filter steps, so: Ctrl+Z, Ctrl+Z." (Presses
twice.) "60 of 77, 'one of three steps'. The pill now says 'Undone: Filter out group 8 and Filter
to degree >= 5' -- good, it accumulates, it doesn't just show me the latest one. Degree >= 5 was
the thing I didn't recognise. That's the culprit. But it's also taken group 8 again, which I want
on."

**Show in steps.** (Clicks it.) "A list. Three rows with checkboxes. 'Filter to degree >= 2 --
took out 17, 60 left'. 'Filter to degree >= 5 -- off, takes nothing out'. 'Filter out group 8 --
off'. Both undone rows are highlighted. This is what I wanted from the start: a pipeline with
the counts per stage. Gephi's filter panel never tells me what each stage removed."

"Tick group 8 back on." (Clicks the checkbox.) "47 of 77, 'two of three steps'. Group 8 row:
took out 13, 47 left. Edges 142, components 3, density 0.131."

**Checking the numbers.** "Three components. There are three grey dots floating on their own
on the right. Those are nodes that had degree two before I removed the students, and now they
hang off nothing. So 'degree >= 2' was computed on the graph before group 8 came out -- the step
order matters and the steps don't re-run against each other. That's correct if it's a pipeline,
and it's what I'd do in pandas. I'd want that written somewhere though: 'reads the graph as it
stood after the step above' -- the step row should say which graph it counted degree on."

"Table: 'degree, filtered' and 'full graph'. Fantine 15, full graph blank. Mme.Thenardier 11,
blank. I assume blank means 'the same'. Don't make me assume. Print the 15. A blank cell in a
numeric column means missing value to everyone who has ever loaded a CSV."

**Done?** "The filter is where I left it. The selection is not, and I have no way to get it back
except by hand. So: half done."

## After the task

**Moderator:** "What would have happened if you'd pressed Bring it back first?"

(Shown the end state from that route: 47 of 77, two of three steps, 18 nodes ringed, table
'Selected: 18 of 47 nodes'.)

"Right, so the button was the only door, and the keystroke I use a hundred times a day closed
it. I read the pill. I read it and I still pressed Ctrl+Z, because the pill told me what happened,
not what the key would do. If it had said 'Ctrl+Z won't bring this back' I'd have clicked the
button. It shouldn't need to say that, though. Either Ctrl+Z restores the thing the box just
reported, or the box shouldn't look like the undo box."

(Shown the Edit menu before any press: 'Undo Filter out group 8'.) "That menu would have told me.
Nobody opens the Edit menu before pressing Ctrl+Z. That's the whole point of Ctrl+Z."

"Second thing: once Bring it back is gone, the table is still displaying the exact set. Give me
'Select these rows' there, or keep the lost selection somewhere I can reach -- the Selection
menu, 'Previous selection'. One slot is fine. A slot that empties when I press undo is not a
slot, it's a trap."

## Single Ease Question

**3 out of 7.** "The filter half is a 6 -- steps with checkboxes and per-step counts are better
than anything in Gephi, and the undo pill that names what it undid is genuinely useful. The
selection half is a 1: the obvious key destroyed the one thing the screen had just offered to
save. Averaged with how annoyed I am: 3."

## Would you use this instead of your current tool?

"Not instead. Alongside, maybe, for handing a view to a client -- the step list with counts is
something I could show a fraud investigator and they'd understand what was cut. But for my own
work the notebook keeps my selections as variables and they don't vanish because I pressed
undo. If I can't trust Ctrl+Z to reverse the last thing on screen, I'll stop pressing it, and a
tool where I'm scared of undo is a tool I use slowly. Make Ctrl+Z bring the selection back, or
make the table able to reselect what it's showing, and ask me again."

## Observer notes

- Selection came back: **no**. She read the line, then pressed Ctrl+Z expecting it to reverse the
  most recent reported event (the clear). The press undid "Filter out group 8" and emptied the
  slot; Bring it back disappeared and was never offered again.
- First thing reached for: the undo key. Second: Edit menu, after the loss.
- Read the line after the first Undo: yes, and saw that it named Filter out group 8, the step
  worth keeping. Used Redo to put it back, then two Undos and Show in steps.
- Found the steps list via the line's Show in steps (not the chip). Ticked group 8 back on rather
  than pressing Redo.
- End state: 47 of 77 nodes, 2 of 3 steps (correct), no selection (incorrect). Task partly done.
- After the undo, the table's scope line still read "showing the selection just cleared" with
  the same rows, while no way back existed: she read this as a promise the page could not keep.
- Blank "full graph" cells where the value equals the filtered value were read as missing data.
- Three isolated nodes after re-enabling group 8 were read correctly as a step-order effect, but
  she wanted the step row to say which graph its degree was counted on.
