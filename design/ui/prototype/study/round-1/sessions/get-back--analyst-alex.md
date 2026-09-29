# Get back to where you were -- Analyst Alex

**Participant:** Analyst Alex, intermediate graph analyst (Python and Gephi user).
**Task as given:** "After your last few actions the numbers changed in a way you did not expect.
Get back to where you were, without losing work you meant to keep."
**What was set up:** Les Miserables, 77 characters, narrowed in three filter steps: Largest
component, then degree >= 5, then Filter out group 8. The middle step (degree >= 5) is the one
that should not be there. A stray click has also cleared a hand-picked selection of 19 characters.
**Screens:** Undo and ways back (participant view), then Filter chip and its steps (participant
view), 1440 x 900.
**Result:** done, with a detour. SEQ 4 of 7.

## Transcript (think-aloud)

**1. First look (Undo screen, start state).**
"OK. Top left says 'Filtered: 28 of 77 nodes, 3 steps'. Twenty-eight. That's way fewer than I
had in my head. And Valjean -- degree, filtered, 18? Full graph 36. So half his connections are
gone. That's the thing I didn't expect.

Table line says 'Selected: none, showing the previous selection'. Huh. I had a bunch of people
picked, Valjean and his crowd. So I lost that too. Fine, one thing at a time.

What were my three things... largest component, yes. Drop group 8, yes, that was on purpose. The
degree >= 5 one -- I don't think I meant that to stick. That's what's eating Valjean's count."

**2. Reflex: Ctrl+Z.**
"Ctrl+Z, because that's what you do."

The chip changes to "Filtered: 41 of 77 nodes, 2 steps". The blue cluster (Marius, Gavroche,
Enjolras) comes back on the canvas. Valjean's filtered degree goes to 22. No message appears.

"...Wait. The blue lot are back. That's group 8. It undid the group 8 filter, not the degree one.
Of course it did, it's the last thing I did. That's the one I wanted to keep.

Also -- nothing told me that. I only know because the picture changed and I happen to know who's
in group 8. If I'd been looking at the table I'd have seen the numbers jump and not known which
step went. In Gephi at least the filter panel is sitting there."

**3. Looking for what just happened: the main menu.**
"There's a menu button top left of the rail. Edit, probably."

Opens the menu, hovers Edit. Sees "Undo Filter to degree >= 5 (Ctrl+Z)", "Redo Filter out group 8
(Ctrl+Shift+Z)", "Undo history", "Select all", "Previous selection (Ctrl+Alt+Z)", "Copy ids".

"OK, this is actually useful. It says what the next undo does and what redo brings back. So
redo gets me group 8 back. And undo again would kill the degree step -- but then I'd have to redo
group 8 and redo brings degree back first... no. It's a stack. I can't pull the middle one out
with undo. I've been burned by that in Word, I'm not doing the undo-redo dance."

Presses Ctrl+Shift+Z. Chip back to "28 of 77 nodes, 3 steps".

"Right, back to the bad state. At least redo worked and didn't lose anything."

**4. The filter chip.**
"Where are the actual steps? The chip. It's got a little funnel, it's the obvious thing."

Clicks the chip. A popover "Filter steps" lists, with checkboxes and counts:
Filter to Largest component 76, Filter to degree >= 5 41, Filter out group 8 28, Add step.

"Oh, this is good. Counts after each step. 76, 41, 28. So the degree one takes me from 76 to 41,
that's the big hit. That's exactly what I wanted to see. There's a checkbox. Untick the middle
one."

Clicks the middle checkbox. Nothing happens.

"...Nothing. Clicked it again. Nothing. So the checkbox is decoration? That's annoying."

(Moderator note: the list is static on this page; the participant was moved to the second page,
which has the same list working, and told "same state, the list works here".)

**5. Filter chip page: turning the middle step off.**
Same popover open. Hovers the middle row: the count 41 is replaced by a "..." button.

"There's a three-dots thing when I hover. Where the number was -- bit weird, the number I was
reading just vanished. Clicking the dots."

Menu: Edit rule... (Enter), Turn off step (Space), Move up, Move down, Create rule set from step,
Delete step (Delete).

"Turn off, not delete. I don't trust delete until I've seen the numbers. Turn off step."

The checkbox clears, the row greys out. Chip now reads "63 of 77 nodes, 2 of 3 steps". Group 8
stays out. Valjean's degree is 32, full graph 36. Statistics: Filtered graph 63 of 77 nodes,
edges 157 of 254, components 4, largest component 58, isolated nodes 1.

"63. Group 8 still gone, degree filter off. That's what I wanted. Valjean at 32 of 36 makes sense
because group 8's people are out.

But -- components 4? Isolated nodes 1? My first step is 'Largest component'. That should mean
one component. So why four? ... Oh. Probably because dropping group 8 afterwards cut some people
off. Is that right? Nothing on screen tells me that, I'm guessing. If I put 'components: 4' on a
slide after saying I filtered to the largest component, somebody's going to ask. I'd go check it
in NetworkX before I believed it."

"The chip lost the word 'Filtered' and says '2 of 3 steps'. OK, I get it, two are on."

**6. Getting the selection back (Undo screen).**
"And my picked characters. The table line said 'showing the previous selection' with a
'Previous selection' button right next to it."

Clicks "Previous selection". Table: "Selected: 19 of 28 nodes. Sorted by degree." The 19 rows
highlight, rings appear on the canvas, the right panel shows "19 nodes" with group counts.

"There we go. Nineteen, that's the number I had. That's nice, honestly -- in Gephi a stray click
and your selection's just gone. I'd never have found the Ctrl+Alt+Z key, but the button was
where I was already looking."

"Couldn't see both fixes on one screen though -- the selection page still had the degree step
on. I'm assuming in the real thing I'd do both and they'd stick."

## After the task

**Single Ease Question: 4 of 7.**
"The pieces are there. What took longest was Ctrl+Z doing the wrong thing and nothing telling me
what it did, and then the checkbox not working. Once I had the steps list with the counts, it was
quick. Turning the step off instead of deleting it is exactly how I want it."

**Would I use this instead of Gephi?**
"For this bit -- the filters -- maybe, yes. Gephi's filter panel is a mess, you drag stuff into a
tree and hope. Here I can see each step and how many it leaves, and turn one off. That's better.
But Ctrl+Z has to tell me what it undid, every time, and I need it to explain things like 'four
components' after a largest-component filter, or I'm back in Python checking it. I'd try it on
the sanitised extract, not the real supplier file, until I know where the data goes."

## Problems seen

1. **Undo is silent when the left panel is open.** Ctrl+Z reversed Filter out group 8 and the
   only feedback was the chip count changing from 28 to 41. The participant only knew which step
   went because he recognised the characters who reappeared. Severity 3.
2. **The first, natural move removes the step worth keeping.** Undo is last-in-first-out, so when
   the mistake is the middle step, Ctrl+Z always takes the good third step first. The Edit menu's
   "Undo Filter to degree >= 5 / Redo Filter out group 8" labels saved him; nothing in the canvas
   points from undo to "turn one step off in the filter list". Severity 3.
3. **The steps list on the Undo screen has checkboxes that do nothing.** They look exactly like
   the working ones on the filter chip page. In a clickable prototype this reads as broken.
   Severity 2 (prototype consistency).
4. **"Components 4" after a "Largest component" step, with no explanation.** Turning off the
   middle step left four components and one isolated node, because the later group 8 step split
   the graph. No warning mark appeared on any step. He would not trust or present the number
   without checking it elsewhere. Severity 3.
5. **Hovering a step row hides its count behind the "..." button.** The count is the thing he is
   reading when he reaches for the row. Severity 1.
6. **The selection fix and the filter fix live on different pages,** so the finished state
   (63 nodes, 19 selected) was never visible. Severity 1 (prototype scope).

## What worked

- Counts after each filter step (76, 41, 28) showed at once which step caused the drop.
- The Edit menu names the step Undo and Redo will act on.
- "Turn off step" keeps the step, so he could reverse the mistake without deleting anything.
- "Previous selection" sits in the table's scope line, where he was already reading, and brought
  back all 19 characters.
- The degree column shows the filtered and full-graph values side by side.
