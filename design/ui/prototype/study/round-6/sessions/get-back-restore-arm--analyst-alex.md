# Get back to where you were, the version where Ctrl+Z restores the selection -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes metrics in NetworkX,
draws in Gephi, pastes into PowerPoint. Company Windows laptop, Chrome, Excel habits (Ctrl+Z,
Ctrl+Y). Mild red-green colour vision deficiency.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says so and
offers "Bring it back". In this version the first Ctrl+Z also brings the cleared selection back
(without touching the filter steps or Redo), and the line then reads "Selection restored (18
nodes)". The next Ctrl+Z undoes the last filter step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/record/r6-alex-getback-restore-01-start.png` -- the starting screen
- `../../../shots/record/r6-alex-getback-restore-02-ctrlz-restored.png` -- after the first Ctrl+Z
- `../../../shots/record/r6-alex-getback-restore-03-ctrlz-group8.png` -- after the second Ctrl+Z
- `../../../shots/record/r6-alex-getback-restore-04-ctrlz-degree5.png` -- after the third Ctrl+Z
- `../../../shots/record/r6-alex-getback-restore-05-show-in-steps.png` -- after clicking "Show in steps"
- `../../../shots/record/r6-alex-getback-restore-06-group8-on.png` -- after ticking group 8 back on

## Think-aloud

**The starting screen.** "Right. Counts first. 27 of 77 nodes, three steps. Statistics on the
right: 104 edges, one component, density 0.296. Table: Valjean, degree filtered 17, full graph 36.
Huh. 17 versus 36, that's a big gap. That's probably the 'numbers changed' bit -- I've filtered
away half his neighbours."

"And there's a black bar. 'Selection cleared (18 nodes).' 'Bring it back.' OK, so I had 18 selected
and I lost them. Probably clicked on the white. The table says 'Selected: none, showing the selection
just cleared.' Fine, at least it's honest about it."

"I'm not clicking a button in a pop-up I don't know. Ctrl+Z. That's what I'd do in Excel."
*(He does not click Bring it back. He goes straight for the key.)*

**First Ctrl+Z.** "OK -- 'Selection restored (18 nodes).' The circles are outlined again, table says
'Selected: 18 of 27 nodes.' Good. That's the thing I just lost, back."

"But hang on. The counts didn't move. Still 27 of 77, still three steps. So undo did the selection,
not the filter. I guess that makes sense -- that was the last thing. It's what Word would do."

"And my statistics are gone. The right side was showing edges, components, density. Now it's
'18 nodes', Appearance, Selection colours. I didn't ask for that. The numbers I was watching just
left the screen." *(He scans the right panel for a few seconds looking for the edge count.)*
"Whatever. The chip up top still says 27."

"Still -- Valjean 17 filtered versus 36. That's the weird bit. Something I filtered went too hard.
Undo again."

**Second Ctrl+Z.** "40 of 77, 2 of 3 steps. 'Undone: Filter out group 8.' Oh. No, no -- I wanted
that. Group 8 is the barricade lot, I took them out on purpose. That wasn't the problem."
*(He looks at the table: Valjean now 21 filtered, 36 full. Still low.)* "And Valjean's still only
21. So the thing that's hurting me is further back. It's the degree one. The 'at least 5'. Right,
I remember that -- I bumped the threshold and everything collapsed."

"So what do I do. If I Ctrl+Y now I get group 8 back but I'm back where I started. The degree one
is under it. Undo is a stack, I know that much. I have to go past group 8 to get to it."
*(He does not open the Edit menu or the undo history. He knows the stack model from Excel and just
keeps going.)*

**Third Ctrl+Z.** "60 of 77, 1 of 3 steps. 'Undone: Filter out group 8 and Filter to degree >= 5.'
OK, good, that line tells me both. Valjean 31 filtered, 36 full. Much more like it. The black
nodes and the grey ones are back, the barricade blues are back too -- which I don't want."

"And my 18 are still selected. Good. I half expected that to go when I undid stuff."

"Now I need group 8 out again without the degree thing. 'Show in steps' -- that's right there, I'll
take it."

**Show in steps.** "Filter steps. Degree at least 2, ticked, 'took out 17, 60 left'. Degree at
least 5, unticked. Group 8, unticked. Both of the ones I undid are highlighted. So undo just
unticks them. It didn't delete them. OK -- that's actually what I'd want. In Gephi the filter
would be gone from the tree and I'd be rebuilding it."

"Tick group 8."

**Group 8 ticked.** "47 of 77, 2 of 3 steps. 'Took out 13, 47 left.' Group 8 gone from the legend.
Valjean 27 filtered, 36 full. Selected: 18 of 47. That's where I was, minus the mistake."
*(He checks the counts twice, the chip and the table's scope line, and they agree.)* "Done.
Four keystrokes-ish and two clicks."

**Moderator: "Anything you'd change?"** "The first Ctrl+Z. I pressed it for the numbers and got the
selection. It was the right thing to bring back, I'd have been annoyed later without it, but for a
second I thought undo was broken because the counts didn't budge. The bar did say 'Selection
restored', I just wasn't reading it, I was reading the 27."

"And don't swap my statistics out for a selection panel. When I'm checking whether I'm back where I
was, the edge count is one of the things I check. It vanished the moment the selection came back."

"The 'full graph' column has blanks in it. Fantine, full graph, nothing. I'm guessing that means
'same as filtered', but a blank in a number column in Excel means missing. I'd rather see the
number."

"The undo taking group 8 off on the way to the degree one -- that's just how undo works, I get it.
Ticking it back on was easy because the row was still there. If undo had deleted the step I'd have
had to remember the exact rule. That part's good."

## Single Ease Question

**5 out of 7.** "I got there, and I didn't lose anything. But I undid something I wanted to keep,
had to notice it from a bar that goes by in the middle of the screen, and had to go and fix it by
hand. And the first undo didn't do what I thought it would do. Not hard. Not obvious either."

## Would he use this instead of his current tool?

"For this bit? It's better than Gephi. In Gephi if I mess up a filter I'm dragging things around the
filter tree and hoping, and there's no Ctrl+Z for most of it. Here undo works like undo, and nothing
got deleted on me."

"But I wouldn't switch for undo. I'd switch if it saves me the Gephi half every month. This just
means it wouldn't embarrass me when I fat-finger something in front of my manager. That counts for
something."

## Observations for the study (moderator notes)

- **Took Ctrl+Z, never Bring it back.** He read the line as a status message and went for the key.
  In this version that key brought the selection back first, which is what the design intends; he
  accepted it but it cost him a moment of "is undo broken?" because the counts he was watching did
  not change.
- **The restore did not cost him the selection later.** Because the selection came back before any
  filter change, it survived all three filter undos and the tick. He noticed and approved.
- **Right panel swap hid the statistics.** When the selection came back, the right panel switched
  from graph statistics (edges, components, density) to the selection's appearance panel. He was
  using those numbers to judge "where I was" and lost them without asking.
- **Undid the good step on the way to the bad one.** He read "Undone: Filter out group 8" and
  recognised it as work to keep, then deliberately undid once more to reach the degree step, relying
  on the undo stack model. The combined line after the third undo ("... and Filter to degree >= 5")
  confirmed both for him.
- **Show in steps was the route to the list.** He did not use the filter chip or the Edit menu. The
  line's action opened the steps list with both undone rows highlighted, and he ticked group 8 back.
- **Blank cells in "full graph".** He read them as missing data, in his Excel register.
- **End state reached:** 47 of 77 nodes, 2 of 3 steps (degree 5 off, group 8 on), 18 selected.
  Actions: three Ctrl+Z, one click on Show in steps, one tick.
