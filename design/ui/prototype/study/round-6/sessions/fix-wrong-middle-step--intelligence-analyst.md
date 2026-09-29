# Fix the wrong middle step -- Marcus, criminal intelligence analyst

Task as the moderator gave it: "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

Participant: Marcus, criminal intelligence analyst at a state fusion center (i2 Analyst's
Notebook and Excel every day). Screens shown: the filter chip and its step list
(screens/filter-chip.html), the filter steps and undo walk-through
(screens/filter-steps-and-undo.html), the recovery walk-through
(screens/filter-step-recovery.html) and the undo screen (screens/undo.html), all in the
participant view.

Renders he looked at, in order:

- shots/screens__filter-chip-task-fix-wrong-middle-step--study.png (step list open, three steps)
- tmp/r6-marcus-fixmid/m1-rowmenu.png (right-click on the middle step)
- tmp/r6-marcus-fixmid/fc-off.png (middle step unticked)
- tmp/r6-marcus-fixmid/fc-edit.png, m2-edited.png, m3-back.png (the middle step's editor, the
  number changed from 5 to 3, back to the list)
- shots/screens__filter-steps-and-undo-task-fix-wrong-middle-step--study.png and
  tmp/r6-marcus-fixmid/fsu-0.png, fsu-1.png (the Edit menu, Undo history, two undos)
- tmp/r6-marcus-fixmid/undo-hist.png, undo-s2.png, undo-list.png, undo-fix.png (the undo screen)
- shots/screens__filter-step-recovery-task-fix-wrong-middle-step--study.png and
  tmp/r6-marcus-fixmid/fsr-0.png, fsr-1.png (the recovery page)

## Think-aloud

**1. First look.** "Same book as last time. Fine. Top left, the box: '27 of 77 characters, 3
steps'. That's the first thing I check -- am I looking at all of it or a cut. It says a cut.
Good. The list is already open: three lines, each with a checkbox."

"Line one, 'Filter to degree >= 2, took out 17, 60 left'. Line two, 'Filter to degree >= 5, took
out 20, 40 left, keeps only nodes with at least 5 neighbors among the 60 it reads'. Line three,
'Filter out group 8, took out 13, 27 left'."

"'Filter to' -- I'd say 'keep only'. 'Filter out' I get, that's remove. Degree I know, that's
how many people he's linked to. And that grey line under step two is the useful one: it's
counting links among the 60 that are left, not the whole chart. So a guy who had six contacts
in the full return might only have four here because step one already cut two of his. That's
the kind of thing I'd get asked about on the stand, and it's written right there. I'll take it."

"So the middle one's wrong. Five was too hard a cut -- it threw out twenty people. I meant three.
That's what 'wrong' means to me: wrong number, not wrong idea. Group 8 is the third step and it
stays."

**2. How do I fix it.** "Two options in my head. Untick it like an Excel autofilter, or change
the five to a three. Undo is the last thing I'd touch -- undo is how you lose the third step."

"Right-click the middle line, because that's what I do in i2." (m1-rowmenu.png) "Menu: Edit
rule, Turn off step, Move up, Move down, Create rule set from step, Delete step. 'Edit rule' is
on top with Enter next to it. That's the one."

"There's also a little '...' on the line, but only when I'm on it. I wouldn't have seen it. The
right-click is what got me there."

**3. Unticking first, just to see** (fc-off.png). "Before I edit, let me see what it looks like
without it. Untick. Box says '47 of 77, 2 of 3 steps'. Middle line greys out, 'off, takes nothing
out'. Third line now says 'took out 13, 47 left'. Sixty minus thirteen is forty-seven. Numbers
add up. The group-8 step is still ticked and still doing its job."

"Side panel even says 'Components 3, up from 1 when Filter to degree >= 5 was turned off'. And
the little grey ones out on the right -- those are the loners that came back. That's a sentence
I can paste into my notes. People who were already on the chart stayed where they were. Nothing
jumped around."

"But off isn't what I want. I don't want no threshold, I want three. Tick it back on."

**4. The editor** (fc-edit.png, m2-edited.png). "Right-click, Edit rule. Now the box turns into
'Step 2: Filter to degree >= 5'. Outcome: Filter to or Filter out. Rule: degree, >=, 5. 'Scope:
After step 1: 60 characters.' Result: took out 20, 40 left."

"Last time I asked for exactly this -- let me change the number right there. There it is. Five
to three."

"Soon as I type the three, Result says 'took out 10, 50 left', and the header says 'Filter to
degree >= 3'. The picture fills back in. Box at the top goes to '37 of 77 characters, 3 steps'.
Side panel: 'Largest component 37, up from 27 when step 2 was edited'."

**5. Back to the list** (m3-back.png). "Hit the arrow back. Three lines, all ticked:
degree >= 2, 60 left. Degree >= 3, took out 10, 50 left. Group 8, took out 13, 37 left. Fifty
minus thirteen, thirty-seven. Checks. Third step is there, still ticked, still taking out the
same thirteen. That's done. Middle one fixed, third one kept, and I didn't touch undo."

"One thing. It says 'up from 27 when step 2 was edited'. Edited from what to what? If the ADA
asks 'did you first run it at five', the line on the list just says three now. The five is gone
unless I remember. There's an 'Add note' in the editor -- I'd use it, type 'was 5, too
aggressive, dropped known associates'. But I shouldn't have to. i2 doesn't do this either, so
I'm not docking it much. For court I want the tool to remember the old value, not me."

**6. Checking the undo way anyway** (fsu-0.png, undo-hist.png). "Edit menu, Undo history. It
lists 'Filter out group 8', 'Filter to degree >= 5', 'Filter to degree >= 2'. Nothing else on
those lines. If I'm in a hurry and I think 'the bad one is degree >= 5, click it' -- what does
that do? Does it undo just that one, or everything back to it? It doesn't say. My bet is it
takes group 8 with it. That menu is the one that looks most like 'fix the middle one' and it's
the one I trust least. Same complaint as before; it hasn't changed."

"On the other undo screen (undo-s2.png, undo-list.png) one Ctrl+Z says 'Undone: Filter out group
8 -- Show in steps', and the group-8 line is still in the list, just unticked. OK, so undo
unticks, it doesn't delete. That's recoverable. But I only know that because the black bar told
me, and it goes away."

"And on that screen the first Ctrl+Z doesn't even undo a filter -- the menu says 'Undo Restore
selection (18 nodes)'. I didn't ask about a selection. If I'm pounding Ctrl+Z to back out a
filter and the first press does something else, I'm counting presses and not knowing where I
am. For this job I'd stay out of undo entirely."

**7. The recovery page** (the task view of screens/filter-step-recovery.html, fsr-0.png,
fsr-1.png). "Wait. This one says '60 of 77 nodes, 3 steps' and the steps are 'Filter out label =
Valjean', 'Largest component', 'Filter out label = Javert'. That's last round's chart, not
mine. Different steps, and the Results panel is open instead of the list. I spent a minute
thinking my edit hadn't stuck. If this were a real case file I'd be calling IT."

"And this screen says 'nodes', the list screen says 'characters'. Pick one. On my data it
should say 'people' or 'entities', and it should say the same thing everywhere."

**8. The rest.** "Table under the chart shows 'Degree (filtered)' and 'Degree (full graph)' side
by side. Valjean 17 here, 36 in the full chart. That's the right thing to show -- somebody's
going to ask why his number dropped. There's the answer."

"Left panel still has 'The barricade, rule, 0 of 13' with a funnel on it. I don't know what that
is and I didn't need it. Left it alone."

## Where he stumbled

- The row's "..." button only appears on hover; he found Edit through right-click, an i2 habit.
  Someone who does not right-click has only the double-click, which nothing on the row hints at.
- After an edit, nothing on the step keeps the old value. "Up from 27 when step 2 was edited"
  says a change happened but not that the threshold was 5 before it was 3. He would have to
  write that down himself for discovery.
- Undo history still lists steps with no hint of whether clicking one undoes only that step or
  everything after it too. He read it as the likeliest way to lose the third step.
- On the undo screen the first Ctrl+Z restores a cleared selection instead of undoing a filter;
  with a filter to back out, that first press was a surprise.
- The recovery page, opened for this task, showed a different chart and different steps
  (Valjean, largest component, Javert) with the Results panel open, and he briefly thought his
  edit had been lost.
- The unit word changes between screens: "characters" on the list screen, "nodes" on the undo
  and recovery screens; step text also says "nodes" and "neighbors" while the chip says
  "characters".
- "Filter to" reads oddly to him; he would say "keep only".

## Single Ease Question

**6 out of 7.** "Right-click, Edit rule, change the number, done, and the third step is still
there doing the same thing. The 'took out' counts let me check the arithmetic at every line. It
did what I asked for last time. Not a 7, because the undo history is still the obvious-looking
wrong way, because it forgot the old value the second I changed it, and because one of the
screens showed me somebody else's chart."

## Would he use this instead of his current tool?

"For this -- cutting a chart down in steps and fixing one step in the middle -- yes, over what I
have. In i2 I'd be deleting people off the chart by hand and if I got the order wrong I'd start
over from the import. Excel can filter but I can't see the picture. Here every step says what it
did, I can switch one off, or change its number, and the ones after it just re-run."

"But the step list has to remember what I changed, with the old value and when, because that's
discovery. And I still haven't loaded a phone return into it, and it's still dots on a book.
Icons on the phones and the cars, a source on every line, and a straight answer about where my
file goes. Then I'd try it on a live case."
