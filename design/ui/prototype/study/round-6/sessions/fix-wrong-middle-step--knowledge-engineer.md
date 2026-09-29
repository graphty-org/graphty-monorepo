# Fix the wrong middle step -- Dr. Min-ji Kim, knowledge graph engineer

Task as read by the moderator: "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

Screens used: the filter chip (its three-steps, editing-a-step, one-step-off and
wrong-middle-step states), the wrong-middle-step recovery page, filter steps and the ways back,
and undo. Renders seen, as the participant sees them:

- shots/r6-minji-fixmid-filter-chip.png (three steps, list open)
- shots/r6-minji-fixmid-chip-edit.png (the middle step's editor)
- tmp/fixmid-knowledge-engineer/edit3.png and edit3-list.png (after changing 5 to 3; captured
  from a file URL, so the icon sprite is missing in these two)
- shots/r6-minji-fixmid-chip-off.png (middle step turned off)
- shots/r6-minji-fixmid-chip-after-removal.png, shots/r6-minji-fixmid-rec-c2.png,
  shots/r6-minji-fixmid-rec-c4.png, shots/r6-minji-fixmid-rec-c5u.png (Largest component as the
  wrong step)
- shots/r6-minji-fixmid-filter-steps-and-undo.png, shots/r6-minji-fixmid-undo.png

## Think-aloud

**1. Where are my steps.** "Top left, under the project name: '27 of 77 characters, 3 steps',
with a funnel. That is the thing I built, so that is where I go. It is open already. Three rows:
Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out 20, 40 left. Filter
out group 8, took out 13, 27 left. Good. That is three SELECTs with three COUNTs, and I did not
have to write them. I trust a pipeline more when each stage says what it removed."

"The middle row has a second line: 'keeps only nodes with at least 5 neighbors among the 60 it
reads.' Thank you. That is the question I would have asked -- degree in what graph? It is
degree in the step's input, not in the source graph. Most tools never say."

**2. Deciding what 'fix' means.** "The middle step is wrong. Either the threshold is wrong -- I
meant 3, not 5 -- or the step should not be there. Wrong threshold is the more common case for
me, so I edit, I do not delete. And I am not touching Undo. Undo walks back from the newest
change, which is the step I want to keep. Every tool works that way; I would lose group 8."

**3. Getting into the step.** "How do I edit a row? There is no pencil. A single click on the
row just highlights it. I double-click, the way I would on a class in Protege." (The editor
opens.) "Fine, that worked, but only because I guessed. Right-click also gives a menu -- Edit
rule, Turn off step, Move up, Move down, Create rule set from step, Delete step -- and I see
now there is a small '...' on the row when the pointer is over it. None of that is visible
when I am not hovering. A person who does not double-click by reflex would sit there."

**4. The editor.** "Step 2: Filter to degree >= 5. Outcome, Filter to or Filter out. Rule:
degree, >=, 5. Scope: after step 1, 60 characters. Result: took out 20, 40 left. The scope row
is the important one: it says what this step reads. I change 5 to 3." (Result now reads took
out 10, 50 left; the chip reads 37 of 77 characters, 3 steps.) "It applied while I typed. I
would rather that than an Apply button for a filter."

**5. Checking the third step survived.** "Back to the list. Three rows. Step 3, Filter out
group 8, is still there, still ticked, and it recounted against the new input: took out 13,
37 left. That is exactly what I needed to see -- the downstream step was re-evaluated, not
frozen with its old count. Task done."

"Now the known-answer check. 60, then 50, then 37. 50 minus 13 is 37. Consistent. Statistics
on the right: Characters 37 of 77, 128 of 254 'character pairs', one component. The largest
component line says 'up from 27 when step 2 was edited.' Why does only that line say what
changed? Characters also went up from 27, and it does not say so. Either every changed number
says why, or none does."

**6. The table's degree.** "The table has 'Degree (filtered)' and 'Degree (full graph)'.
Valjean: 24 and 36. So there are three degrees in play: 36 in the source, whatever it was in
the 60 that step 2 read, and 24 in the final 37. The step note told me step 2 uses the 60. The
column header says only 'filtered'. Filtered by which step? It is the last one, I infer, but I
had to infer it. If I am auditing why a node survived step 2, the number I need is the one
the step used, and it is not in the table."

**7. The other way: turning it off.** "The checkbox. Untick the middle step: it goes grey,
'off, takes nothing out', and group 8 below it recounts to took out 13, 47 left. Chip: 47 of
77, 2 of 3 steps. The statistics say 'up from 1 when Filter to degree >= 5 was turned off.'
That is a provenance line. I like it. And the step is kept, so I can compare with and without.
This is how I would test whether the step matters before I decide to edit it."

**8. The Largest component version.** (Moderator shows the wrong-middle-step state.) "Filter
out label = Valjean. Label? Labels are not unique. In my graph two legal entities share an
rdfs:label every week. I want that rule on the identifier, or at least the rule should say
which Valjean if there are two. In a novel it is fine. In my data it is a bug waiting to
happen."

"The middle step: Filter to Largest component, took out 15, 61 left, 'keeps the largest of the
7 connected pieces it reads.' Good -- it tells me the removal of Valjean split the graph into
7, which is why the component step took more than I meant. The tooltip on the count names
them: Myriel, Mlle.Baptistine, Mme.Magloire, Champtercier, Count 'and 10 more'. Ten more is not
an audit. I want the fifteen, in a list I can copy, because that is the list I would check
against SPARQL."

"Turn it off: 75 of 77, the step stays in the list with two dashes for its count, the steps
below recount. Betweenness in the Results panel now says 'on 60 of 77' with a Re-run button. It
did not silently recompute and it did not silently keep a stale number without saying so. That
is the honest behaviour. I re-run when I choose to."

"Delete from the row, then Ctrl+Z: the step comes back and a line says 'Undone: Delete step
Filter to Largest component, Show in steps.' Fine. Edit menu names what Undo will do. I did not
need any of this for the task, but it is reassuring that a delete is not final."

**9. Terms.** "One screen says 27 of 77 nodes, another says 27 of 77 characters. The edges are
'character pairs' in Statistics and 'Edges' on the table tab. Pick one. I know 'characters' is
the domain word for this dataset, and I would want my own class name there -- 'legal entities'
-- but then call the edge by its predicate, not 'pairs'. And in the steps list the counts are
'took out 20, 40 left' on one screen and a bare '40' on another. The bare number made me
wonder whether it was taken or left."

## Answers

**Single Ease Question: 6 of 7.** The fix itself was easy: open the chip, double-click the
middle row, change one number, check the third step recounted. One point off because the row
gives no visible sign that it can be edited; I found the editor by habit, not by the screen
telling me.

**Would I use this instead of my current tool?** Not instead. For this exact job my current
tool is a SPARQL query with three FILTER clauses in the GraphDB workbench; editing the middle
clause is one line and Git shows me the diff. What this does that my query does not is give me
the count after every stage and re-evaluate the later stages in place, without three extra
COUNT queries -- that part I would use, alongside SPARQL, for exploring before I write the
query properly. It will not replace anything until the steps can be exported as data (the rule
list, or a query) and until my graph can get in without flattening it to CSV, which is still
the first question I ask of any viewer.

## Problems

1. The step rows show no edit affordance. Single click only highlights; editing is double-click,
   Enter, right-click or a '...' that appears only on hover. (Filter chip, list open.)
   Severity 2.
2. The table's "Degree (filtered)" does not say which step's graph it is measured on, while the
   step itself measured degree on its own input (60). Three different degrees, one labelled.
   (Filter chip, table.) Severity 2.
3. "Took out 15" names five and "10 more" in a tooltip; no way to see or copy the full list of
   what a step removed. (Wrong middle step, Largest component.) Severity 2.
4. A rule on label (label = Valjean) with no word about uniqueness or identifiers; in real data
   labels collide. (Wrong middle step.) Severity 2.
5. Vocabulary drifts between screens: nodes vs characters, character pairs vs edges; step counts
   shown as "took out 20, 40 left" on one screen and a bare number on another. Severity 1.
6. After an edit, only the Largest component statistic carries an "up from 27 when step 2 was
   edited" line; Characters changed too and does not say so. Severity 1.

## What worked

- Every step says what it removed and what is left, and the steps below recount at once after an
  edit or a toggle: the third step was kept and visibly re-evaluated.
- The step's scope is stated ("among the 60 it reads", "After step 1: 60 characters").
- Turning a step off keeps it, marks it off, and the statistics name the change that moved them.
- A measure computed before the change says "on 60 of 77" and offers Re-run instead of silently
  recomputing or silently going stale.
- Undo labels name the change, so it is plain that Undo would not have been the way to fix a
  middle step.
