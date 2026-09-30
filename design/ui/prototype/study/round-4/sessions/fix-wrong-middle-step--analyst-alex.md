# Fix a wrong middle filter step -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Does the metrics in
NetworkX, the picture in Gephi. Company Windows laptop, Chrome, no admin rights.

**Task as given by the moderator:** "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

**Screens seen:** the filter chip and its steps list (Les Miserables sample, three steps: degree
>= 2, degree >= 5, filter out group 8), the undo walkthrough on the same three steps, and the
recovery walkthrough on a different set of three steps (filter out Valjean, largest component,
filter out Javert).

Renders the participant looked at (all in the participant view):
- `../../../shots/record/r4-alex-fixmid-filter-chip.png`, `../../../shots/record/r4-alex-fixmid-fc-three.png`
- `../../../shots/record/r4-alex-fixmid-fc-edit.png` (the step editor)
- `../../../shots/record/r4-alex-fixmid-fc-editing.png`, `../../../shots/record/r4-alex-fixmid-fc-edited.png`
  (the middle step changed from 5 to 3, driven on the live mock)
- `../../../shots/record/r4-alex-fixmid-undo-s3.png`, `-undo-s2.png`, `-undo-list.png`, `-undo-s1.png`,
  `-undo-off.png`, `-undo-fix.png`
- `../../../shots/record/r4-alex-fixmid-recovery.png` (the whole recovery page, seven frames)
- `../../../shots/record/r4-alex-fixmid-fc-after-removal.png`

## Think-aloud

**The chip.** "OK, top left. '27 of 77 characters, 3 steps'. That's the filter, I assume. It's got
a little arrow so it opens. Good that it says 27 of 77 -- in Gephi I have to go look at the
Context panel to know how much I've thrown away."

"Opening it. Filter steps. 'Filter to degree >= 2, took out 17, 60 left.' 'Filter to degree >= 5,
took out 20, 40 left.' 'Filter out group 8, took out 13, 27 left.' Right, so this reads like a
cell-by-cell notebook. I can actually see what each line did. That's more than Gephi's filter
tree gives me -- there I get a count at the bottom and that's it."

"So the middle one's wrong. Say I meant 3, not 5. What I want is to change the 5 and leave the
group-8 line alone."

**Trying to edit it.** "I click on the row... it goes blue, highlighted, and nothing else. Hm.
I clicked the words 'degree >= 5' thinking it'd go into edit mode, like a cell. It didn't. There's
a three-dots thing that shows up on the right of the row when I'm on it. I'll try that." (Reads
the row menu in the HTML: Edit step, Move up, Move down, Delete step.) "'Edit step...' -- fine.
Would have been quicker if clicking the value just let me type. Double-click works too, apparently,
but I wouldn't have guessed double-click on a list row. In Excel, sure. Here I'd have clicked once
and waited."

"Editor. 'Step 2: Filter to degree >= 5'. Filter to or Filter out, then three boxes: degree,
>=, 5. 'Scope: After step 1: 60 characters.' Result: 'took out 20, 40 left.' And a line under
it: 'keeps only nodes with at least 5 neighbors among the 60 it reads.'"

"Wait. Among the 60 it reads. So degree here isn't the degree from the full graph -- it's the
degree after step 1 already chopped 17 out. That's... not what I'd have assumed. In NetworkX I'd
compute degree once on the whole graph and filter the dataframe. This counts neighbours inside
what's left. Honestly that might be the reason the middle step was 'wrong' in the first place. I'm
glad it says so; I'd have gotten a different 40 in Python and spent an hour on why."

**Changing it.** "Typing 3 instead of 5." (Driven on the live mock.) "Result updates as I type:
'took out 10, 50 left'. The chip up top already says 37 of 77. And -- this is the part I care
about -- going back to the list, the third step is still there, still ticked, 'Filter out group 8,
took out 13, 37 left'. So it just re-ran step 3 on the new 50. That's exactly what I wanted. That's
the notebook behaviour: change a cell, everything below re-runs."

"The table re-sorted, degree filtered 24 for Valjean now, full graph 36. Legend picked up a group
1 that wasn't there before. OK."

"Over on the right it says 'up from 27 when step 2 was edited'. Nice that it tells me why a number
jumped. But it's sitting under 'Largest component', not under 'Characters 37 of 77', which is the
one I'd actually look at. Took me a second to work out it wasn't only the component that moved.
And every one of those Statistics lines says 'of the filtered graph (37 of 77 characters)' again.
I get it. I read it the first time."

**Would undo have done it?** (The moderator had also put the undo screens in front of him.) "My
reflex is Ctrl+Z. Let's see what that does here." Looks at the undo frames. "One Ctrl+Z: 'Undone:
Filter out group 8', and the chip says '2 of 3 steps'. So undo doesn't delete the step, it
unticks it. The row's still in the list, greyed, 'off, takes nothing out'. OK, that's actually
reassuring -- I can't lose a step by mashing Ctrl+Z."

"Two Ctrl+Z's: 'Undone: Filter out group 8 and Filter to degree >= 5.' Now both off. Then I tick
the third one back on and I'm at 'middle off, third on', 47 left. That works. But it's the long
way round: undo twice, then find the list, then re-tick the one I wanted to keep. If I'm fixing the
middle step I'd rather just go to the middle step. Undo's for 'oops, I just clicked something'."

"The Edit menu has 'Undo history' with 'Undo back to here (3 steps)' against 'Filter to Largest
component'. I would not click that. 'Back to here' plus three steps means it takes the third one
and the re-run with it, which is the opposite of the task. At least it says how many steps. Good
that it says it."

**The other walkthrough.** "Different three steps on this one: out Valjean, largest component,
out Javert. Hovering the count on the middle row: '61 left. Took out 15: Myriel,
Mlle.Baptistine...' -- oh, that's handy, it names who went. I'd want that as a list I can copy,
but fine."

"Unticking the middle one. The count next to it goes to '--', chip says '75 of 77 nodes, 2 of 3
steps', third step still on, now 75. On the other screen an off step said 'off, takes nothing out'.
Here it's a dash. Same thing, two ways of saying it. Minor, but I noticed."

"Then the betweenness on the right says 'on: 60 nodes' with a Re-run button, and the table column
header says 'on: 60 nodes' too. So it knows my betweenness is from before I changed the filter.
That's the thing that would actually embarrass me -- pasting a betweenness from the wrong subgraph
into the deck. Good. Re-run, and Marius goes from 0.485 to 0.307. Big drop. I'd want to know if
that's the same normalisation NetworkX uses before I believed either number, but at least it isn't
silently stale."

"And before the re-run, the table is showing 75 rows with betweenness values that were computed on
60 of them. Which 15 have no betweenness? Are they blank or zero? I can't see from here. I'd scroll
and check."

"Delete the middle step: gone, list closes up, '75 of 77, 2 steps', and Edit says 'Undo Delete step
Filter to Largest component'. OK. So untick if I'm not sure, delete if I am, and there's an undo
for the delete. That's sane."

**Things that bugged me along the way.**
- "The two walkthroughs don't match. One says 'characters', the other says 'nodes'. One's degree
  steps, one's Valjean and Javert. Is 'characters' just because it's the Les Mis sample? With my
  data would it say 'suppliers'? Fine if so, but say nodes somewhere so I know it's the same
  thing."
- "On the recovery one, with 'Largest component' switched on, Statistics says Components 3. I asked
  for the largest component. Why three? ... Oh, because step 3 took Javert out after it and that
  split it again. Order matters. Makes sense once I think about it, but my first reaction was
  'it's broken'."
- "In the undo screens there are blank cells in the 'full graph' degree column -- Fantine,
  Mme.Thenardier, Gueulemer. Is that 'same as filtered' or 'missing'? A blank in a number column
  reads as missing to me. If it's 'same', print the number."
- "Black nodes on the canvas with no label. They're not in the legend's four rows; I guess they're
  in '6 more'. When I'm filtering I want to know if black means 'filtered out but still drawn' or
  just another group. Couldn't tell."

## Outcome

Completed. He changed the middle step's value in place through the row's menu (after a single
click did nothing), and the third step stayed and re-ran on the new result. He also understood
the untick and delete routes and correctly rejected "Undo back to here" because it would take the
third step with it.

**Single Ease Question (1-7):** 5.

"Five. The fix itself is easy once you're in the editor -- change the number, everything below
re-runs, it tells you the counts. What took longest was getting into the editor: I clicked the row
and nothing happened, and I only found Edit on the three dots. Double-click I'd never have tried.
Knock one off for that, and one for the stuff I had to stop and puzzle out -- the components count,
the blank cells."

**Would you use this instead of your current tool?** "For this, yes, over Gephi. Gephi's filter
panel is a tree of queries you drag into each other, and fixing the middle one usually means
pulling the tree apart and rebuilding it, and I lose the count at each level. This shows me what
each step took out and keeps the steps after it. That's what I do in a notebook anyway, change a
line and re-run -- this is the notebook with a picture on it. The 'betweenness on: 60 nodes, Re-run'
thing alone would save me from one bad slide a quarter. Where I'd still go to Python: if I need
the list of who a step removed as a table, and to check the betweenness matches NetworkX before I
trust the new number."
