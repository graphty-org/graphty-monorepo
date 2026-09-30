# Get back to where you were, the Ctrl+Z-restores version -- Marcus, intelligence analyst

**Participant:** Marcus, criminal intelligence analyst at a state fusion center. Builds link charts
in i2 Analyst's Notebook, does the counting in Excel. Agency Windows laptop, Edge or Chrome, Ctrl+Z
and Ctrl+Y by reflex. Distrusts any number he cannot trace.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says
"Selection cleared (18 nodes)" and offers "Bring it back". In this version Ctrl+Z also brings the
selection back first, before it undoes any filter step, and leaves Redo as it was; the line then
reads "Selection restored (18 nodes)".

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/record/r6-marcus-getback-restore-01-start.png` -- the starting screen
- `../../../shots/record/r6-marcus-getback-restore-02-ctrlz1.png` -- after the first Ctrl+Z
- `../../../shots/record/r6-marcus-getback-restore-03-ctrlz2.png` -- after the second Ctrl+Z
- `../../../shots/record/r6-marcus-getback-restore-04-ctrly.png` -- after Ctrl+Y
- `../../../shots/record/r6-marcus-getback-restore-05-steps.png` -- the filter chip's steps list
- `../../../shots/record/r6-marcus-getback-restore-06-degree5-off.png` -- after unticking degree at least 5
- `../../../shots/record/r6-marcus-getback-restore-07-esc.png` -- after pressing Esc to close the list
  (the mock left the participant view and reset; see the moderator notes)

## Think-aloud

**The starting screen.** "Right. Top left: 27 of 77 nodes, three steps. Right side, statistics:
'On: filtered graph, 27 of 77.' 104 edges, one component, density 0.296. Table at the bottom,
Valjean top, degree 17 filtered, 36 full graph. So it's telling me which graph each number comes
off. Good. That's the first thing a defense attorney asks."

"Black bar in the middle. 'Selection cleared, 18 nodes. Bring it back.' And the table says
'Selected: none, showing the selection just cleared.' OK, so I had eighteen people picked and I
clicked off them. That happens to me ten times a day in i2."

"Last thing I did, I undo. Ctrl+Z." *(He reads "Bring it back" and does not click it. His hand is
already on the key.)*

**First Ctrl+Z.** *(The eighteen get their dark rings back. The bar reads "Selection restored (18
nodes)". The table reads "Selected: 18 of 27 nodes". The right panel changes: "18 nodes", an
Appearance block, "Selection colors": group 2, 7; group 4, 7; group 5, 3; group 3, 1.)*

"There they are. Eighteen. Seven, seven, three, one -- that's eighteen, it adds up. Good. The bar
said what happened, I pressed undo, it undid what the bar said. That's how it should work."

"But -- hang on. Where's my statistics? I had 104 edges and a density on the right. Now it's all
about the selection. Colors, 'Export'. I didn't ask to swap panels. If I'm the guy watching the
numbers, the numbers just left the room." *(He looks for a while.)* "The chip still says 27 of 77
up top, I guess that's the one number that stayed."

"Anyway. The selection didn't change the numbers, it was 27 before and 27 after. The task said the
numbers changed. So something else I did is the problem. Undo again and see what comes off."

**Second Ctrl+Z.** *(A light-blue cluster comes back at the bottom: Marius, Gavroche, Enjolras,
Bahorel, Bossuet, Courfeyrac. The chip reads 40 of 77, 2 of 3 steps. The bar: "Undone: Filter out
group 8", with "Show in steps". The table: "Selected: 18 of 40 nodes". Valjean's filtered degree
goes to 21.)*

"No. Group 8 -- that's the barricade crowd. There's a saved thing on the left, 'The barricade,
rule, 13'. I took those out on purpose, that was a deliberate cut. That's not my mistake."

"It did keep the eighteen selected through that, I'll give it that. In i2, you undo, you're never
sure what you get."

"Couple of the full-graph numbers are blank. Gueulemer, Babet, Claquesous -- degree 10, full graph
nothing. Blank means what? Zero? Not computed? I'd have to ask." *(He moves on.)*

**Ctrl+Y.** "Put it back." *(27 of 77, 3 steps. Bar: "Redone: Filter out group 8". The blue
cluster goes. Selection still 18.)* "OK. Students gone, my eighteen still there. So undo walks
back one thing at a time and tells me the name. Fine. But I'm not going to walk back blind through
everything I did this afternoon. Show me the list."

"'Show in steps', or the thing at the top that says three steps. Same thing, I figure. I'll click
the one that doesn't disappear." *(Clicks the chip, "27 of 77 nodes, 3 steps".)*

**The steps list.** "'Filter to degree at least 2, took out 17, 60 left. Filter to degree at least
5, took out 20, 40 left -- keeps only nodes with at least 5 neighbors among the 60 it reads.
Filter out group 8, took out 13, 27 left.' 77, 60, 40, 27. The arithmetic works. That's the kind of
thing I can put in a footnote -- what I cut and how many it cost me."

"And there it is. Degree at least 5. Twenty people gone because they had fewer than five contacts.
I would never do that on a case. The guy with three contacts is the guy I'm looking for -- the
quiet one, the coordinator who keeps his phone clean. Cutting by contact count throws away the
exact person I get paid to find. At least 2, sure, that knocks out the one-off wrong numbers. At
least 5 is a mistake. Mine, probably, I meant to edit the 2 and added a step instead."

*(Unticks degree at least 5.)* *(Chip: 47 of 77, 2 of 3 steps. The row stays in the list, greyed:
"off, takes nothing out". Myriel's bunch appears top right, a few grey ones float off by
themselves on the right. The table: "Selected: 18 of 47 nodes". Valjean's filtered degree 27.)*

"47. And the step's still in the list, just off. Good -- I don't want it deleted, I want a record
that I tried it and backed it out. That's my audit trail."

"My eighteen are still picked. Top of the right panel, 18 nodes. So: filters back where they
should be, selection back. I think that's it."

"Blanks again in the full-graph column. Fantine, Mme. Thenardier. Fantine said 15 full graph a
minute ago. Now blank, and her filtered degree is 15. So blank means 'same as filtered'? Tell me
that somewhere. If I print this in black and white and hand it to an ADA, a blank cell is a
question I have to answer."

"And I'd still like my edge count and density back to see what that did to the picture. They're
not on the screen while anything is selected. I'd have to click off the selection to see them --
which is exactly what got me here in the first place."

**Closing the list.** *(Presses Esc to close the steps list.)* *(The mock jumps out of the
participant view: annotations appear, the page is back at 27 of 77, 3 steps, selection cleared.)*

"Whoa. What did I just do? Everything's back to the start and there's pink notes all over it.
If the real thing did that, I'd be done. Losing my work on the Escape key is the end of the
demo." *(The moderator explains that this is the mock page, not the product, and that Esc in the
product closes the list. He accepts it, grudgingly.)* "Fine. But I pressed Esc to close a
pop-up. Everybody does."

**Moderator asked afterwards: did you see "Bring it back" before you pressed Ctrl+Z?** "Yes. I read
it. I didn't need it, I had the key. It's nice that it's there for someone who uses the mouse. The
point is they both did the same thing. That's the right answer."

**Moderator asked: did you expect the second Ctrl+Z to undo a filter?** "Yeah. That's undo. Once
the selection was back, the next thing back was the last filter. I just didn't know which of my
filters was the bad one, so undo wasn't really the tool for finding it. The list was."

## Single Ease Question

**5 out of 7.** "The part the bar told me about, Ctrl+Z fixed, first try. The filter list found the
real problem in about thirty seconds -- it tells you what each step cost you in people, which I
can explain. I'm knocking off for the numbers disappearing off the right side the moment I had a
selection, and the blank cells that I have to guess at. And the Escape thing, if that's real."

## Would he use this instead of his current tool?

"Not instead of i2 -- I can't bring my .anb charts in and I can't send one to the guy down the
hall, and nobody's approved this for case data yet. But for the narrowing part, yes, I'd rather do
it here than in i2 and Excel. i2 lets me undo, but it doesn't tell me 'this cut took out 20
people, 40 left'. That list is a thing I'd actually paste into my notes. And 'Nothing has been sent
from this project' up top -- that's the first line I'd show IT."

## Moderator notes

- **End state reached.** Marcus ended at 47 of 77, 2 of 3 steps (degree 5 off, group 8 still out),
  with the 18 characters selected. Six moves: Ctrl+Z, Ctrl+Z, Ctrl+Y, open the chip, untick one
  step, close.
- **First move was Ctrl+Z, with the notice read,** exactly as in the other version. Here it brought
  the selection back, and he called that "the right answer": the line and the key agreed. He never
  clicked "Bring it back"; he read it as the mouse route to the same thing.
- **The second Ctrl+Z was an exploratory undo, not a mistake.** He expected it to undo a filter
  and used it to probe which step was wrong. It undid the step he wanted to keep; Ctrl+Y put it
  back, with the selection intact throughout. Undo named each step, which he trusted.
- **He found the wrong step by reading the steps list,** on domain grounds: a minimum-contacts cut
  discards the low-footprint coordinator he looks for. The took-out counts (77, 60, 40, 27) were
  what let him judge it, and the kept, greyed row read to him as an audit trail.
- **Restoring the selection took the graph statistics off screen.** When the selection came back
  the right panel switched from Statistics (edges, components, density) to the selection's
  panel, so the numbers the task is about were no longer visible, and seeing them again means
  clearing the selection -- the action that caused the problem. He raised this twice.
- **Blank "full graph" cells read as missing data.** The column is left blank where the full-graph
  degree equals the filtered one (Fantine, 15 and 15). Nothing on screen says so; he asked
  whether blank meant zero or not computed, and noted it will not survive a black-and-white
  printout.
- **Mock defect, not a design finding:** pressing Esc while the steps list is open closes the list
  and also exits the participant view, which reloads the page at its starting state and loses
  the participant's work. The page's Esc handler for the open list does not stop the key from
  reaching the kit's "leave study view" handler. He reacted as he would to real data loss.
