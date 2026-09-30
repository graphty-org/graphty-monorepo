# Get back, notice-line arm -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor of computational social
science. Gephi since 0.8, teaches it every year, NetworkX for anything that has to be reproducible.
Has wanted undo in Gephi for a decade. Works on a MacBook, so her hands say Cmd+Z. See
../../personas/gephi-holdout.md.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** the arm in which a cleared selection is reported on the one-line notice above
the toolbar with a Bring it back action, and Cmd+Z always undoes the last filter step (it does not
bring the selection back).

**Screens seen** (participant view, Les Miserables sample, 27 of 77 nodes, three filter steps, a
hand-built selection of 18 characters just cleared):
- `../../../shots/record/r6-mara-getback-notice-01-start.png` (the starting screen: "Selection cleared (18 nodes)" with Bring it back)
- `../../../shots/record/r6-mara-getback-notice-02-undo1.png` (after one Cmd+Z: 40 of 77, "Undone: Filter out group 8")
- `../../../shots/record/r6-mara-getback-notice-03-undo2.png` (after a second Cmd+Z: 60 of 77, "Undone: Filter out group 8 and Filter to degree >= 5")
- `../../../shots/record/r6-mara-getback-notice-04-steps.png` (Show in steps: the steps list, both later steps off)
- `../../../shots/record/r6-mara-getback-notice-05-group8-on.png` (group 8 step ticked back on: 47 of 77)
- `../../../shots/record/r6-mara-getback-notice-08-edit.png` (main menu, Edit, at the end)

## Think-aloud

**The starting screen.** "Numbers changed. Fine. Which numbers. Chip top left: 27 of 77 nodes, 3
steps. Statistics on the right: 'On: filtered graph, 27 of 77 nodes', 104 edges, density 0.296. I
like that line, it answers the question I ask every student. Les Mis again -- Valjean in the middle,
Fantine's cluster up top, the Thenardier gang in green on the right."

"There's a black bar over the toolbar: 'Selection cleared (18 nodes)', and 'Bring it back'. OK, so
I had 18 selected and I lost them. Noted. But you told me numbers, and a selection isn't a number.
27 of 77 is a number. That's small. I'd have expected more than a third of Les Mis to survive a
couple of degree filters. So something in the filter chain went further than I meant."

"Table underneath: 'Selected: none, showing the selection just cleared', 'Show filtered graph'.
Degree filtered 17 against full graph 36 for Valjean. Half his neighbours gone. Yes, the filtering is
what I want to look at."

**First move: Cmd+Z.** "Last thing I did to the filter, take it back. Cmd+Z."

(After the undo.) "40 of 77, '2 of 3 steps'. The bar now says 'Undone: Filter out group 8', Show
in steps. The barricade is back -- the light blue cluster, Marius, Gavroche, Enjolras. Edges 193,
density 0.247. Legend has group 8, 13. All the numbers moved together, good, I can check that."

"But I didn't mind removing the barricade. There's a set called 'The barricade' in the left panel
with 13 in it, which says I built that on purpose. So that wasn't the mistake. One more."

(Second Cmd+Z.) "60 of 77, 1 of 3 steps. The bar says 'Undone: Filter out group 8 and Filter to
degree >= 5'. Good, it kept the first one in the sentence instead of throwing it away. Edges 237,
density 0.134. So the degree-5 step took 20 nodes out. 60 down to 40 on degree five -- that's a lot
for Les Mis. Oh. Of course. It's degree five on what was left after degree two. In Gephi that's how a
filter chain works too, each filter eats the output of the one above, and the degrees are recomputed
on the survivors. That's the step I didn't mean. I wanted degree at least five on the full graph, or I
didn't want it at all."

**Fixing the chain.** "Now I want group 8 out again but not the degree step. Redo would give me
back... which one? Redo gives the last thing undone, and the last thing undone was degree five. So
Redo is exactly wrong here. I'm not touching Redo."

"'Show in steps' on the bar. Click." (The steps list opens.) "Filter to degree >= 2, took out 17,
60 left. Filter to degree >= 5, off, takes nothing out. Filter out group 8, off, takes nothing out.
So undo unticked them instead of deleting them. That's right -- in Gephi if I drag a filter out of the
chain I rebuild it by hand."

"What I'd like is for the unticked row to tell me what it WOULD take out. 'Off, takes nothing out'
is true and useless. I'm deciding which one to switch back on and I'm doing arithmetic in my head from
three screens ago."

(Ticks Filter out group 8.) "47 of 77, 2 of 3 steps. 'Took out 13, 47 left.' Edges 142. And --
components 3. Three components. There are three grey nodes floating at the bottom right, not
attached to anything. Those passed 'degree at least 2' on the whole graph, and then their neighbours
were in group 8, and group 8 went. So now I have nodes with degree zero in a graph I filtered to
degree two. That is also how Gephi behaves and I have also never liked it. At least here the
statistics told me components 3 right away. In a figure I'd take those out. But that isn't what you
asked me; for 'get back to where I was', that's it for the numbers."

**Now the selection.** "Right. The 18. Where's the bar." (Looks at the canvas.) "There's no bar.
The bar with Bring it back went away the moment I pressed Cmd+Z the first time, and I didn't notice
because it turned into the Undone line in the same spot. Same box, different words."

"Cmd+Z again? No -- that'll undo my tick. Edit menu. Three lines top left, Edit: 'Undo Turn on step
Filter out group 8', Redo greyed out, Undo history, Select all, Copy ids greyed. Nothing about a
selection. Undo history is filter steps. Nothing."

"The table still says 'Selected: none, showing the selection just cleared', and the rows are there.
Valjean, Javert, Fantine, Thenardier, Mme. Thenardier, Cosette. So the program knows exactly which 18
they were -- it's showing them to me -- and it won't give them back. In Gephi's Data Laboratory I'd
select the rows and do 'select on graph'. Let me click Valjean's row." (Clicks a row. Nothing
happens.) "Nothing. Shift-click? Nothing."

"So the order mattered. If I'd clicked Bring it back first, then fixed the filter, I'd have both.
I did the filter first, which is the thing you told me was wrong, and pressing the undo key threw the
selection away without saying so. The bar said 'Selection cleared, Bring it back', I pressed Cmd+Z,
and the bar said 'Undone: Filter out group 8'. Nowhere did it say 'and your selection is gone for
good'."

"I'd rebuild it by hand -- Valjean and his neighbours is a right-click in Gephi, 'select neighbours',
and I'd assume there's something similar here. But that's rebuilding, not getting back. I'm stopping
there."

## Single Ease Question

**3 of 7.** "The filter part was fine -- two undos, a tick, done, and it told me in words what every
undo did. The selection I lost, and I lost it by pressing the undo key, which is the one key that is
supposed to make you safe. The bar offered me the selection and then quietly withdrew the offer. Worse
than Gephi, in one way: Gephi never pretends it can give it back."

## Would she use this instead of her current tool?

"Not on this. The filter chain is honestly better than Gephi's -- steps that switch off instead of
vanishing, an undo line that names what it undid, statistics that say what they ran on. Those are
real. But I haven't seen my GEXF open or ForceAtlas2 with my parameters, and today it lost something
from me after telling me it was keeping it. If my students hit that in a lab, I spend the next ten
minutes explaining why the undo key ate their selection. Make Cmd+Z give it back, or at least keep
Bring it back on the screen until I pick something else, and I'll try it on real data."

## Findings

- **Cmd+Z silently threw away the held selection.** She saw "Selection cleared (18 nodes), Bring it
  back", judged it less urgent than the filter, and pressed Cmd+Z. The line was replaced by "Undone:
  Filter out group 8" in the same place, and the selection could no longer be brought back. Nothing
  on screen said so; she noticed only when she went back for it.
  > "The bar offered me the selection and then quietly withdrew the offer."
- **The task's framing pushed her to the filter first, which is the order that loses the
  selection.** The loss happened without any mistake she could see herself making.
  > "I did the filter first, which is the thing you told me was wrong, and pressing the undo key threw the selection away."
- **The table keeps showing the 18 rows after the selection can no longer be restored.** "Showing
  the selection just cleared" stayed on the scope line with the rows listed, but there was no way to
  turn them back into a selection. It read as a taunt.
  > "The program knows exactly which 18 they were -- it's showing them to me -- and it won't give them back."
- **Redo would have brought back the wrong step.** After two undos Redo restores degree >= 5, the
  mistake. She worked this out and avoided Redo; a less careful user would press it and be back where
  she started.
- **An unticked step says "off, takes nothing out" instead of what it would take out.** She had to
  choose which step to re-enable from remembered numbers.
  > "'Off, takes nothing out' is true and useless."
- **After the fix, three isolated nodes remain in a graph filtered to degree at least 2.**
  Components 3; three grey nodes with no edges. She recognised it as chained-filter behaviour she
  also dislikes in Gephi, and credited the statistics for surfacing it.
- **Edit menu has no route back to a lost selection.** Undo history lists filter steps only; nothing
  under Edit mentions selection.

## What worked

- Every undo named what it undid, and consecutive undos named both steps in one sentence, so she
  could identify the bad step from the line alone.
- Chip, statistics, legend and table all moved together on each undo and tick; she checked them
  against each other.
- Undo unticked steps rather than deleting them, so switching the good step back on was one click.
- "Show in steps" on the line took her straight to the list.
- Edit > Undo named the exact next action ("Undo Turn on step Filter out group 8").
- The statistics line "On: filtered graph, 47 of 77 nodes" and "components 3" answered her standing
  Gephi complaint and exposed the orphan nodes immediately.
