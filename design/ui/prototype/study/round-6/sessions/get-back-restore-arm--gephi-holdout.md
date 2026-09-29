# Get back to where you were, the version where Ctrl+Z restores the selection -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science, Gephi user since 0.8, teaches it every year. MacBook Pro; presses Cmd+Z the moment she
makes a mistake and deliberately tests what undo covers. Complains loudly that Gephi still has no
undo.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says so and
offers "Bring it back". While nothing undoable has happened since, Cmd+Z first brings the
selection back, leaves Redo as it was, and the line then reads "Selection restored (18 nodes)".
The next Cmd+Z undoes the last filter step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order (the mock draws the key as Ctrl; on her Mac it reads Cmd):
- `../../../shots/r6-mara-getback-restore-s3.png` -- the starting screen
- `../../../shots/r6-mara-getback-restore-restore.png` -- after Cmd+Z
- `../../../shots/r6-mara-getback-restore-restore-menu-hist.png` -- main menu, Edit, Undo history
- `../../../shots/r6-mara-getback-restore-restore-pop.png` -- the filter chip's steps list
- `../../../shots/r6-mara-getback-restore-fix.png` -- after unticking degree at least 5

## Think-aloud

**The starting screen.** "Right. Counts first. 27 of 77 nodes, three steps. Statistics on the
right: 'On: filtered graph, 27 of 77 nodes' -- good, it says what it computed on, Gephi never does.
104 edges, one component, density 0.296. Density point three on Les Mis is far too dense. That's
not the co-appearance network any more, that's a core."

"And a black bar: 'Selection cleared (18 nodes)', 'Bring it back'. Fine. The table underneath
says 'Selected: none, showing the selection just cleared'. So I clicked on the white and lost my
selection. That's the last thing. Undo."

*(She presses Cmd+Z without touching the button. She says afterwards she saw the button and
ignored it: "I want to know whether the key does it, not whether a button does.")*

**Cmd+Z.** *(The 18 nodes get their dark outlines back. The bar reads "Selection restored (18
nodes)". The chip still reads 27 of 77, 3 steps. The table reads "Selected: 18 of 27 nodes. Sorted
by degree." The right panel changes to "18 nodes", Appearance, Selection colors: group 2 7,
group 4 7, group 5 3, group 3 1.)*

"Oh. It actually did it. The selection. With undo." *(Pause.)* "Do you know how many times I have
told a room of students 'there is no undo, save a copy first'? OK. One point."

"But where did my statistics go? I had edges, components, density on the right. Now it's a
selection inspector. Selection colors, fine, but I didn't ask to swap panels. The task says the
numbers changed, and the one panel with the numbers just left. I suppose it comes back when I
deselect -- and deselecting is the thing that just cost me the selection. Hm."

"And the filter count didn't move. 27. So the selection was not the numbers. Something else is."

**Checking what the next undo would do.** "Before I press it again I want to know what it undoes.
In Gephi I'd have no idea, here there's a menu." *(Opens the three-line menu, Edit.)* "'Undo Filter
out group 8'. Redo greyed out. Undo history: 'Filter out group 8', 'Filter to degree >= 5', 'Filter
to degree >= 2'. No selection entry in there, so the restore didn't go into the history. Fine, I
don't want my clicks in my history anyway."

"If I press undo again I lose the group 8 filter, and that one I meant -- The barricade is even
saved as a set on the left, 13 nodes, that's the students. I'm not undoing past it. And I'm not
clicking 'Filter to degree >= 5' in this history list either; a history list goes back to that
point, so it would take group 8 with it. At least that's how every history panel I know works. I
won't test it." *(Closes the menu.)*

**The filters.** *(Clicks the chip "27 of 77 nodes, 3 steps".)* "So this is the filter stack.
Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out 20, 40 left, 'keeps
only nodes with at least 5 neighbors among the 60 it reads'. That line is correct and it's the
thing I have to explain to students in Gephi -- a degree filter under another filter reads the
subgraph, not the file. Good that it says so. Filter out group 8, took out 13, 27 left. 77, 60, 40,
27. Adds up."

"Degree 2 and then degree 5 on top of it. Nobody does that on purpose. Degree 2 is the pendant
trim, that's routine. Degree 5 on the already-trimmed graph is what made it a core and pushed the
density to point three. That's the step. I can't prove I didn't mean it -- nothing here says when I
added it -- but it's the one that doesn't belong."

*(Unticks "Filter to degree >= 5". The row stays, greyed: "off, takes nothing out". Group 8 now reads
"took out 13, 47 left". Chip: 47 of 77 nodes, 2 of 3 steps. The table: "Selected: 18 of 47 nodes";
Valjean 27 filtered, 36 full graph. The selection outlines are still there.)*

"47. And the selection survived the filter change. Good. Myriel's little group is back, three grey
isolates on the right -- those are degree-2 survivors whose neighbours were in group 8, that's
right."

"Now I want density and components on 47 to check it against what I remember, and I can't see
them, because I have a selection. I'd have to click off, read, and Cmd+Z the selection back again.
That works, apparently, but it's a silly dance."

**The table.** "What's this -- 'full graph' is blank for Fantine and Mme.Thenardier. Javert 15 and
17, Valjean 27 and 36, Fantine 15 and nothing. Is the blank 'the same as filtered' or 'not
computed'? A blank is not a number. If I export this column to R I get an NA and a regression that
drops two rows. Put the 15 in."

**Moderator asked afterwards: would you have used Bring it back?** "No. I saw it. If the key
works, I don't need the button; if the key doesn't work, the button is a trap for everyone who
reads it and presses the key anyway. In this version the key worked, so the button is just
decoration for people who use a mouse. Leave it."

**Moderator asked: are you back where you were?** "Filters, yes, if my guess about degree 5 is
right -- and it's easy to change my mind, the row is still there. Selection, yes, same 18. What I
haven't verified is the statistics, because they're hidden while the selection is on."

## Single Ease Question

**5 out of 7.** "Undo did the obvious thing for the selection, which is more than I expected, and
the steps list told me exactly which filter was eating the graph, with counts I can footnote. I
lose two points because I had to work out which step was the wrong one myself -- fine, that's my
job -- and because the statistics vanished the moment I got my selection back, which is precisely
when I wanted to check them. Oh, and the blanks in the table."

## Would she use this instead of her current tool?

"Not on the strength of this. Undo that covers selection and filters is the thing I have wanted
from Gephi for ten years, and this is better than anything Gephi does here -- the filter row that
turns off instead of vanishing is exactly right. But I don't switch tools because undo works. I
switch when it opens my GEXF with every attribute, runs ForceAtlas2 with my parameters and gives me
an SVG with labels. Show me that and this undo is a real reason to stay. Today: I'd stay on Gephi,
and I'd tell my students this is what undo should look like."

## Moderator notes

- **End state reached.** 47 of 77 nodes, 2 of 3 steps (degree 5 off, group 8 still out), with the
  same 18 characters selected. Selection first, by the undo key, then the filter fix in the steps
  list.
- **First move was Cmd+Z, with the notice read and its button ignored on purpose.** In this version
  that restored the selection, as the notice implied. She named it the thing Gephi has never done.
- **She read Edit before a second undo.** "Undo Filter out group 8" told her the next press would
  take the step she wanted to keep, and she stopped. She also refused to click the middle entry of
  Undo history, reasoning that it would undo back to that point and take group 8 with it. Undo was
  never used for the filter fix.
- **The statistics panel disappears when a selection exists.** Restoring the selection replaced
  edges, components, density and "On: filtered graph" with the selection inspector. On a task
  about numbers changing, the graph-level numbers were hidden at the moment she wanted to check
  them, and the only way she saw to get them back was to clear the selection again. She called it
  "a silly dance".
- **Blank cells in the "full graph" column** (where the full-graph degree equals the filtered one,
  e.g. Fantine, Mme.Thenardier) read to her as missing values. She raised the export consequence:
  an NA in R, dropped rows.
- **The steps list's subset line was praised** ("keeps only nodes with at least 5 neighbors among
  the 60 it reads") as the thing she otherwise has to teach about Gephi's filter stack.
- **She had to infer which step was the mistake** from the shape of the stack (two degree filters)
  and the density. Nothing records when a step was added; she said that was acceptable.
