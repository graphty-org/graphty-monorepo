# Fix the wrong middle step -- Marcus, criminal intelligence analyst

Task as the moderator gave it: "You narrowed the graph in three steps and the middle one was
wrong. Fix it without losing the third."

Participant: Marcus, criminal intelligence analyst at a state fusion center (i2 Analyst's
Notebook and Excel every day). Screens shown: the filter chip and its step list
(screens/filter-chip.html, "Wrong middle step" state), the recovery walk-through
(screens/filter-step-recovery.html), and the undo screen (screens/undo.html).

Renders he looked at, in order:

- shots/record/r4-marcus-fixmid-filter-step-recovery.png (the recovery page, participant view, all states)
- shots/record/r4-marcus-fixmid-chip-after.png (the step list open, three steps, middle one wrong)
- shots/record/r4-marcus-fixmid-chip-menu.png (the "..." menu on the middle step)
- shots/record/r4-marcus-fixmid-chip-off.png (middle step unticked)
- shots/record/r4-marcus-fixmid-chip-deleted.png (middle step deleted)
- shots/record/r4-marcus-fixmid-chip-edit-lcc.png (the middle step's editor)
- shots/record/r4-marcus-fixmid-undo.png, shots/screens__undo-s2.png, shots/screens__undo-s1.png (undo)

## Think-aloud

**1. First look.** "Les Miserables. OK, it's a book. Fine, pretend these are my subjects.
Where are my filters... top left, that box: '60 of 77 nodes, 3 steps'. That's the thing that
tells me I'm not looking at everything. Good, I like that it's up there and not buried. That's
the first thing a sergeant asks: is this all of it or did you cut something."

"Graph on the right side says Nodes 60, Components 3, Isolated nodes 1. Hang on. One of my
steps is 'largest component' -- I'm guessing that means the biggest connected blob -- and it
still says three components and a loner? Either the step didn't work or something after it
broke it up. I'm going to have to open the list to figure out which."

"And the legend in the corner says group 1, ten of them. I don't see ten dark-blue dots
anywhere on this chart. Side panel says one thing, picture says another. Which one's lying?"

**2. Opening the chip.** "Click the box. There's the list. Three lines:
Filter out label = Valjean, took out 1, 76 left.
Filter to Largest component, took out 15, 61 left -- 'keeps only the largest of the 7
connected pieces it reads'.
Filter out label = Javert, took out 1, 60 left."

"OK now I get it. The middle one threw away fifteen people. That's the wrong one -- I pulled
Valjean first, which broke off his little crew, and then 'largest component' dumped the whole
crew because they were only hooked in through him. That's exactly the thing that would burn me:
I take out the main guy to see who else holds it together and the tool quietly throws out
everybody who only knew him. The 'took out 15' is the line that saved me. i2 doesn't tell you
that. Excel doesn't either unless you count the rows yourself."

"'Connected pieces' -- fine, islands. I can say that out loud. I wouldn't have known what
'component' meant in a meeting."

"Javert step is the third one. That's the one I want to keep. Also -- when Javert came out,
that's what made it three pieces again. Now the Components number makes sense. Would have been
nice if the side panel said that instead of me doing the math."

**3. Deciding how to fix it.** "Two ways I'd think of. Ctrl+Z, because that's what I'd do
anywhere, or just kill the middle line. In Excel I'd uncheck the one column filter and the
others stay. Let me look at the line first before I start hitting undo -- undo scares me,
undo is how I lose the third step."

"There's a checkbox at the front of every line. That's an Excel autofilter to me. Untick
the middle one."

**4. Unticking the middle step** (shots/record/r4-marcus-fixmid-chip-off.png). "Box now says
'75 of 77, 2 of 3 steps'. Middle line's greyed, says 'off, takes nothing out' -- the little
'Turn on step' tooltip is sitting right on top of those words, I had to squint. Javert line
now says took out 1, 75 left. So the Javert step's still there and still working. Valjean's
crew came back -- there's the Myriel bunch up top right. Everybody else stayed where they were.
Good. I dragged one guy in a vendor demo once and the whole thing rearranged; this didn't."

"Side panel even tells me why the numbers moved: 'Components 9, up from 3 when Filter to
Largest component was turned off'. That's the kind of sentence I can paste into a report.
Honestly, that's done. Task's done. Middle one fixed, third one kept."

"And the box says '75 of 77' -- lost the word 'characters'. Other screen said 'nodes'. Pick
one. On my data it had better say 'people' or 'entities'."

**5. Checking the menu anyway** (shots/record/r4-marcus-fixmid-chip-menu.png). "There's a '...' on
the line when I hover. Edit step, Turn off step, Move up, Move down, Create rule set from
step, Delete step. I don't know what a rule set is and I'm not clicking it. Delete step --
fine, it's plain."

"If I delete it (shots/record/r4-marcus-fixmid-chip-deleted.png) the list goes to two lines and the
box says '2 steps'. Same picture. I'd rather untick than delete, honestly. If the ADA asks
'did you ever try it the other way', the unticked line is my note that I did. Delete throws
that away."

**6. The editor** (shots/record/r4-marcus-fixmid-chip-edit-lcc.png). "Double-click the line. 'Step 2:
Filter to Largest component. Scope: After step 1: 76 characters. Result: took out 15, 61
left.' That Scope line is the best thing on this screen. It tells me the step read 76 people,
not 77, because Valjean was already gone. That's the order thing, spelled out. But there's
nothing to change in here -- Filter to, Filter out greyed. So 'fixing' it means turning it off
or deleting it, not editing it. Fine for this one. If my middle step was 'called at least 3
times' and I meant 5, I'd expect to edit the number right here."

**7. The undo path** (the recovery page's Edit menu, and the undo screen). "Now the Edit menu.
'Undo history' opens a list: Re-run betweenness, 1 step. Filter out label = Javert, 2 steps.
Filter to Largest component, 3 steps. Filter out Valjean, 4 steps."

"This is the trap. If I think 'go back to the bad step' and click 'Filter to Largest
component, undo back to here' -- that says 3 steps. That takes Javert with it. That's exactly
what the moderator told me not to do, and that menu is the one that looks most like 'fix the
middle one'. I'd have clicked it on a busy day. Whether Javert is really gone or just unticked
I can't tell from that menu -- it just says 'Undo back to here'."

"On the other undo screen (shots/screens__undo-s2.png and screens__undo-s1.png) -- different
filters, group 8 and degree 5, which threw me for a second, these aren't the same chart -- the
black bar at the bottom says 'Undone: Filter out group 8 and Filter to degree >= 5. Show in
steps.' So two Ctrl+Z's unticked both, and the box says '1 of 3 steps'. OK, so undo doesn't
delete the step, it just unticks it. Then I tick the good one back on. That's recoverable. But
I only know that because the bar told me, and I had to read it before it went away. If I'd
hit Ctrl+Z three times fast I'd be counting on that bar."

"So undo works, but it's the long way: undo twice, then re-tick the third. Unticking the middle
one is one click. Nobody tells you the one-click way exists -- I found it because it looks
like Excel."

**8. Betweenness.** "On the recovery page, after I turned the step off, Results says
'Betweenness, on: 60 nodes, Re-run'. And the table header says 'on: 60 nodes'. I like that a
lot. It's telling me the middleman numbers are from the old cut and I shouldn't read them to
the sergeant yet. After Re-run Marius goes from 0.485 to 0.307, same order. Still don't know
what point three oh seven is out of -- there's a '0 to 0.307' under the header, so it's the
top of this list, I guess. 'Middleman score' in the header would have saved me asking."

## Where he stumbled

- The chart's Components 3 / Isolated 1 contradicted his reading of "largest component" until
  he opened the list and worked out the third step split it again.
- The legend counts (group 1: 10) on the recovery page did not match what was on the canvas.
- The "Turn on step" tooltip covered the "off, takes nothing out" text on the unticked row.
- Undo history's "Filter to Largest component -- Undo back to here (3 steps)" reads like "fix
  the middle step" and would roll back the Javert step too; the menu does not say whether
  later steps are deleted or unticked.
- The chip's unit word changes: "nodes", "characters", and none at all when the step count
  gets longer.
- The step editor for this step has nothing to edit, so "fix" can only mean off or delete.

## Single Ease Question

**6 out of 7.** "The checkbox is Excel. I had it in one click once I opened the box, and the
'took out 15' told me which step was the bad one before I had to guess. I'm not giving it a 7
because the undo menu is the obvious-looking way and it's the wrong way, and because the side
panel made me do arithmetic about components."

## Would he use this instead of his current tool?

"For this part -- narrowing a chart and backing one step out -- yes, over what I do now. In i2
I'd be deleting entities off the chart by hand and if I got the order wrong I'd start over from
the import. In Excel I can do the filters but I can't see the picture. This keeps the steps in
order, tells me how many each one threw out, and lets me switch one off without losing the
rest. That's real."

"But I wouldn't move a case into it on this. It's still dots on a book. Put an icon on the
phones and the cars, show me which record each line came from, and tell me the data stays on
our server. Then I'd try it on a live case. Until then it's the thing I'd show the new analyst
to explain why filter order matters."
