# Get back to where you were, the Ctrl+Z-restores version -- Expert Emma

**Participant:** Emma, network scientist and consultant. Lives in Jupyter (networkx, igraph),
uses Gephi for the final figure and resents it. Keyboard first. Checks every count after every
step, and says so.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says
"Selection cleared (18 nodes)" and offers "Bring it back". In this version the first Ctrl+Z
brings the cleared selection back (the line then reads "Selection restored (18 nodes)") without
touching Redo; the next Ctrl+Z undoes the last filter step as usual.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/record/r6-emma-getback-restore-01-start.png` -- the starting screen
- `../../../shots/record/r6-emma-getback-restore-02-ctrlz1.png` -- after the first Ctrl+Z
- `../../../shots/record/r6-emma-getback-restore-03-ctrlz2.png` -- after the second Ctrl+Z
- `../../../shots/record/r6-emma-getback-restore-09-redo.png` -- after Ctrl+Shift+Z
- `../../../shots/record/r6-emma-getback-restore-10-steps-after-restore.png` -- the filter chip's steps list
- `../../../shots/record/r6-emma-getback-restore-11-degree5-off.png` -- after unticking degree at least 5
- `../../../shots/record/r6-emma-getback-restore-12-closed.png` -- after Esc (the mock left the participant view)
- `../../../shots/record/r6-emma-getback-restore-05-editmenu.png` -- main menu, Edit, on the second attempt
- `../../../shots/record/r6-emma-getback-restore-06-history.png` -- Edit, Undo history

## Think-aloud

**The starting screen.** "Counts first. 27 of 77 nodes, three steps. Right panel: 'On: filtered
graph, 27 of 77 nodes', 104 edges, one component, density 0.296. Fine, at least it tells me what
the denominator is. I hate a density with no graph attached to it."

"The table header: 'Selected: none, showing the selection just cleared.' And the black bar,
'Selection cleared, 18 nodes', 'Bring it back'. So I clicked on the background. I do that in Gephi
twenty times a day. OK, that is one thing. But you said the numbers changed, and 'selection
cleared' does not change a degree."

"Valjean, degree filtered 17, full graph 36. Seventeen out of thirty-six. That is a big cut. I
would not have cut him by half with the filters I think I set. Something in the steps is eating
more than I meant."

"Last thing first, though. Ctrl+Z." *(She does not touch Bring it back. Keyboard, straight away.)*

**After the first Ctrl+Z.** "'Selection restored, 18 nodes.' Good. The rows are shaded again, 18
of 27, and the right side flipped to the selection: group 2 seven, group 4 seven, group 5 three,
group 3 one. That adds to 18. Fine."

"Huh. So Ctrl+Z undid a selection. Most tools do not count selection as an undoable thing. Gephi
certainly does not. I am not complaining, I just did not expect it. Is that in the undo history
now? Never mind."

"Still 27 of 77, still Valjean at 17. So the selection was not the numbers. 'Your last few
actions.' Plural. Ctrl+Z again." *(Second press comes quickly; she is treating Ctrl+Z as walking
back in time.)*

**After the second Ctrl+Z.** "'Undone: Filter out group 8.' 40 of 77, 2 of 3 steps. Valjean went to
21. The whole Marius, Enjolras, Gavroche lot is back in blue. No. Dropping group 8 was on purpose,
the barricade students are a different story, I do not want them in this. That is not the step
that is wrong."

"Selection is still there, 18 of 40. OK, good, it did not throw that away again."

"Redo. Ctrl+Shift+Z, or Ctrl+Y, let us see which it takes." *(Ctrl+Shift+Z.)*

**After Ctrl+Shift+Z.** "'Redone: Filter out group 8.' 27 of 77, 3 steps, 18 selected. Back to
square one, minus the stray click. Good, Redo was still there after all that. I half expected the
selection trick to have eaten it."

"So undo is the wrong tool for this. Walking backwards takes out the good step before it gets to
the bad one. I want to see the steps, not the history. The chip at the top, '27 of 77 nodes, 3
steps', has a caret." *(Clicks it.)*

**The steps list.** "There we are. 'Filter to degree >= 2, took out 17, 60 left.' Fine. 'Filter to
degree >= 5, took out 20, 40 left. Keeps only nodes with at least 5 neighbors among the 60 it
reads.' There. That is the one. That is a degree cut computed on the already filtered graph, so it
depends on what went before it. It is not a 5-core and it is not a cut on the original degree.
I would not have written that on purpose. At least it says 'among the 60 it reads' -- most tools
would not tell me that, and then I would spend an hour reconciling it against networkx."

"'Filter out group 8, took out 13, 27 left.' Keep."

"Untick degree >= 5." *(Clicks the checkbox.)*

**After unticking.** "47 of 77, 2 of 3 steps. Row reads 'off, takes nothing out' -- good, it is
still there if I want it back, not deleted. Group 8 still says 'took out 13, 47 left'. 60 minus 13
is 47. Checks."

"Selection: 18 of 47. Valjean degree 27 on the filtered graph now, 36 on the full. Javert 15 of 17.
That is more like the graph I was looking at. Legend moved: group 4 is 11, group 3 is 10, and a new
'4 more'. Fine. There are black and grey nodes now, bottom right, unlabelled. Those are the
disconnected stragglers the degree 5 cut was hiding. I would want a component count here, but the
right panel is showing the selection, not the graph."

"Done, I think. Esc to close the list." *(Presses Esc.)*

**After Esc.** "What. Everything went back: 27 of 77, three steps, selection cleared, and now there
are pink annotation boxes all over it and tabs along the top. Did Esc just revert my work?"
*(Moderator explains that Esc in the prototype also leaves the participant view and resets the
page; this is the prototype, not the design. The moderator reloads the participant view at the
starting screen and asks her to do it again.)*

"Fine. Second time, and I am going to look at the menu before I press anything, because I do not
trust keys in this thing any more." *(Opens the main menu, Edit.)*

**Edit menu, second attempt.** "'Undo Restore selection (18 nodes), Ctrl+Z.' OK, so the menu
tells you what Ctrl+Z will do next. That is actually what I wanted the first time. If I had seen
that, I would have known the first press is the selection and the second is the filter."

*(Opens Undo history.)* "'Filter out group 8, Filter to degree >= 5, Filter to degree >= 2.' The
selection is not in the history, but the Undo line above it says the next undo is the selection.
So the list and the Undo item disagree about what the next step back is. Minor. Tells me the
selection thing is a special case bolted on the side, which is fine, as long as it behaves."

*(Closes the menu with a click on the menu button. Ctrl+Z, sees "Selection restored (18 nodes)".
Opens the chip, unticks degree >= 5, then closes the list with the X, not Esc.)* "47 of 77, 2 of 3,
18 selected. Same as before. Same action twice, same answer. That is the only thing I really
check."

## Single Ease Question

**5 of 7.** "The selection coming back on Ctrl+Z was easy -- one key, and it said what it did. The
actual problem, the filter, I found by looking at the steps, not by undoing, and undo would have
cost me the group 8 step if I had kept going. The steps list is the good part: every step says
what it took out and what is left, so I can check the arithmetic. The second press of Ctrl+Z
surprised me, and Esc throwing my work away -- I know, the prototype -- would have been a 2 if that
were the product."

## Would she use this instead of her current tool?

"Instead of the notebook, no. The filtering I would do in pandas and I would have the exact
expression in a cell, which is better than any steps list. For a view I hand to an investigator,
maybe. This list is the first filter UI I have seen that states a denominator on every step and
says what graph a degree is computed on. If they tick something off by mistake they can see it
and tick it back, and the row stays. I would want the steps exportable as an expression, so I can
put the same filter in my notebook. And honestly? I do not care much about undo. I care that the
numbers are right after it, and here they were."

## Moderator notes

- She reached the target (47 of 77, 2 of 3 steps, degree 5 off, group 8 out, 18 selected) on the
  first attempt, then again after the prototype reset. Route: Ctrl+Z (selection back), Ctrl+Z
  (overshoot: group 8 undone), Ctrl+Shift+Z (redo), filter chip, untick degree >= 5.
- The first Ctrl+Z restoring the selection worked as designed and she read the line correctly.
  She did not use Bring it back. She was mildly surprised that selection counts as undoable.
- The second, reflexive Ctrl+Z undid a good step (group 8). Redo was intact after the restore,
  which she noticed and valued. The undo line naming the step is what told her it was the wrong
  one.
- She identified the wrong step from the steps list text, not from undo: "keeps only nodes with
  at least 5 neighbors among the 60 it reads" was the clue. Undo was never going to reach the
  middle step without taking the last one with it.
- Edit > Undo names "Restore selection (18 nodes)" but Edit > Undo history lists only the three
  filter steps, so the two disagree about what the next step back is. She called it minor.
- Prototype defect: in the participant view, Esc pressed to close the steps list also leaves the
  participant view and resets the page to the starting state (the page's own Esc handling does
  not stop the kit's exit shortcut). Any keyboard participant who closes a list with Esc will hit
  it, and it reads as the product throwing work away.
- After unticking, grey and black unlabelled nodes appear; she wanted the graph's component count
  but the right panel shows the selection while one is held.
