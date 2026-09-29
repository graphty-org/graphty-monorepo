# Session: getting back after a wrong step -- supply chain analyst (Dana)

Participant: Dana Okafor (composite persona), supply chain risk analyst. Excel and Power BI user.
Screens used: "Undo and ways back" (participant view, starting after the wrong step with the
selection cleared), then "Filter chip and its steps".

Task as given by the moderator: "After your last few actions the numbers changed in a way you did
not expect. Get back to where you were, without losing work you meant to keep." The moderator added
that it was the middle one of the three things she did that was wrong.

## Transcript (think-aloud)

**1. First look.** "OK. Les Miserables -- this isn't my data, so I'll just pretend these are
suppliers. Numbers changed in a way I didn't expect... The table at the bottom says degree
filtered, full graph, betweenness. Valjean 18, then 36 in the next column. So something got
narrowed. Where's the thing that says what I did? I'm looking for a history, like the applied
steps pane in Power Query."

She reads the table header line out loud: "'Selected: none, showing the previous selection.'
Previous selection? I had something selected? ... Oh, I did pick a bunch. They're gone. OK, two
problems then."

She misses the small grey line under "Les Miserables" at first. "I'm looking at the middle of the
screen. The top-left is where the file name goes; I don't read that."

**2. Reaches for Ctrl+Z.** "Excel habit. Ctrl+Z." One press. The picture gets bigger, the table
numbers change, Valjean goes to 22. "Something happened. What did it undo? Nothing told me." She
presses again, because the middle step was the wrong one, so "two back". Now the picture is much
bigger, and Valjean reads 36.

"Hang on. Now I've probably undone the good one too. That's what Excel does -- it undoes
everything back to the mistake. I knew that, I did it anyway."

**3. Finds the grey line.** Leans in to the top-left: "'Filtered: 76 of 77 nodes, 1 step.' That
is tiny. I need my glasses for that. So I had three steps and now I have one. I've thrown away the
last one, which I wanted."

**4. Tries the menu.** Opens the three-lines menu, Edit. "'Undo Filter to Largest component',
'Redo Filter to degree >= 5'. OK, at least it names them. Redo gives me back the WRONG one first.
So to get my good last step back I have to redo the bad one on the way. That's backwards for what I
want." Opens "Undo history": one row, "Filter to Largest component". "That's the history? It only
shows what I can undo, not what I undid. I want to see all three and pick."

She presses Ctrl+Shift+Z twice. "76, 41, 28. Right, I'm back where I started. Wasted two minutes,
but nothing lost. Good that redo held."

**5. Gets the selection back.** "Now the picked rows." The table line still says 'showing the
previous selection' with 'Previous selection' next to it. Clicks it. "19 selected. Good -- that
one I like, it told me in the table, which is where I look. I'd never have found a keyboard shortcut
for that. Ctrl+Alt+Z? No."

**6. Tries to take out only the middle step.** Clicks the grey filter line at top-left. A small box
lists the three steps with counts: 76, 41, 28. "That's what I wanted from the start. The middle
one. How do I get rid of it?" Hovers the row. No delete, no tick box on this screen. "It's a list
I can look at but not touch?"

(Moderator moves her to the second screen, where the same box has tick boxes.)

**7. Second screen.** "Now there are tick boxes. Much better -- that's a slicer, basically."
Unticks "Filter to degree >= 5". Top-left now says "63 of 77 nodes, 2 of 3 steps"; the middle row
shows "--" instead of a number. "63. So the middle step was taking out 22-odd, and now the other
two do their thing. And it's still there if I want it back -- I just unticked it. That's what I
wanted: switch off one, keep the others."

"I don't know what 'degree' means, or 'largest component'. I only knew which one to kill because
you told me it was the middle one. In real life I'd be guessing from the numbers in the right
column."

**8. Checking the selection survived.** "Are my 19 still picked after I unticked it? I can't tell
from here, the table says 'Filtered graph: 63 of 77'. I'd want it to say. If a filter change drops
my selection again every time, that's going to annoy me."

"The right-hand panel changed too -- 'edges 157 of 254'. Fine. I'm not reading that."

## After the task

**Single Ease Question: 4 of 7.**

"I got there, but I made it worse first. Ctrl+Z is the first thing anyone presses, and it can only
go backwards in a line, so taking out the middle step with it is impossible -- you lose the last
step too. The box with the tick boxes is the right answer, but I had to be moved to it, and on the
first screen the same box didn't let me do anything. And the line that tells you how many steps
you've got is the smallest, greyest text on the page."

**Would she use it instead of her current tool?** "For this part, it beats Power BI -- Power BI
slicers don't remember an order of steps, and Power Query's applied steps are in a different
window. The tick boxes are genuinely good. But this is Les Mis, not my supplier list, and none of
this answers where my data goes or whether my VP can see it in Power BI. So: side tool at best,
until someone answers the IT question."

## Problems observed

1. Undo is linear, so the natural first move (Ctrl+Z twice) throws away the good last step when
   the middle one is wrong. Nothing warns her before the second press. Severity 3.
2. After Ctrl+Z there is no visible confirmation of what was undone while the left panel is open;
   only the grey chip count changed, which she did not look at. Severity 3.
3. The filter chip ("Filtered: 28 of 77 nodes - 3 steps") is small, low-contrast grey text in a
   spot she does not scan; she found it only after the damage. Severity 3.
4. In the undo screen, the steps box opened from the chip lists the steps but offers no way to turn
   one off or delete it; the tick boxes exist only in the other screen. Severity 3.
5. Redo order: to get the wanted last step back she must redo the unwanted middle one first.
   "Undo history" shows only undoable steps, not the undone ones. Severity 2.
6. Step names use terms she does not know ("degree", "Largest component"); she could not have
   picked the wrong step on her own. Severity 2.
7. After turning a step off, nothing says whether her hand-picked selection survived. Severity 2.

## What worked

- The table's own line "Selected: none, showing the previous selection" with a "Previous selection"
  button right there -- she found and used it without help.
- Edit menu names the step Undo and Redo will act on.
- Tick boxes on each step, with the chip reading "2 of 3 steps" and the turned-off step kept in the
  list: "that's a slicer".
- Per-step counts (76, 41, 28) let her see which step did the most cutting.
