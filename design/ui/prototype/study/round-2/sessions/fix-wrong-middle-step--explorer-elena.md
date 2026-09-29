# Fixing the wrong middle filter step -- Explorer Elena

**Participant.** Elena, a product manager with no graph training, used to Google Sheets and a
product-analytics dashboard where she clicks a filter pill and gets a list (persona:
study/personas/explorer-elena.md).
**Screens.** Undo and ways back, participant view, version A (undo shows no message while the
filter chip is visible), then the filter chip and its steps list, clickable.
**Task, as given.** "Of three filter steps, the second removed the wrong group. Fix it without
losing the third."
**Set-up the participant did not know.** Les Miserables, 77 characters, narrowed by three steps:
keep the largest connected piece (76 left), keep characters with at least 5 connections (41 left),
leave out group 8, the students (28 left). The middle step is the mistake. The end state that
counts as done: the middle step off, the other two on, 63 of 77.

## Session, thinking aloud

**Start, undo screen (28 of 77 nodes, 3 steps).** "OK, same Les Mis dots. Three filter steps, the
second one is wrong, keep the third. My gut says Ctrl+Z, that's how I fix anything. But no -- undo
goes backwards, right? Last thing first. So the first press would kill the third one, the one I'm
supposed to keep. If you hadn't told me it was the second one I would have just hammered Ctrl+Z,
honestly. So, where are my steps... Up in the corner, small grey pill: 'Filtered: 28 of 77 nodes,
3 steps'. Three steps. That's the only place on this screen that says 'steps', so I'll click
that. It's tiny, though. On a screen share I'd never see it."

"Also, what are these pink dotted boxes around half the buttons? And the table says 'Selected:
none, showing the previous selection' -- I didn't select anything. Ignoring that."

**Clicked the chip. A little panel, 'Filter steps'.** "OK, this is what I wanted. Three rows, each
with a tick box:
- Filter to Largest component, 76
- Filter to degree >= 5, 41
- Filter out group 8, 28

"So the numbers go down as you go, 76, 41, 28. That makes sense, like a funnel in our analytics
tool. Now, 'the second removed the wrong group'. The second one says 'degree >= 5'. The third one
is the one that says 'group'. Hmm. So is the moderator talking about the second or the third? The
third literally says group. But they said second, and the second is the one that took the biggest
bite, 76 down to 41, that's 35 gone. That's a 'group' in my book -- a chunk of people. I'll go with
second. What is degree? Like degrees of separation? Something 5. I don't know what it filters on
and nothing here tells me."

"I hover the tick box: 'Turn off step'. OK, that's clear at least. I don't want to delete it, I
just want it to stop. Turning it off feels safe -- I can turn it back on."

**Unticked the second step (63 of 77, 2 of 3 steps).** "Big change. The pill says '63 of 77 nodes,
2 of 3 steps'. The second row went grey, its number is two dashes. Third one is still ticked,
still says 'Filter out group 8', number 63. Good, so the third survived. Loads of dots came back
-- pink ones on the left, blue ones up by Myriel. But also, down at the bottom right there are
little pairs of dots just floating on their own, not connected to anything. Those weren't there
before. Did I break it? The first step is supposed to keep 'the largest component', whatever that
is, and now I've got bits floating around. The side panel says components 4, it was 1. I have no
idea if 4 is bad."

"Is it fixed? I think so? Nothing says 'fixed'. It did what I asked. I'd call it done but I'd be a
little nervous showing this to anyone."

**Second screen, same starting point, steps list already open.** "Same three steps, but this one
has an extra line under the second one: '3 dropped below degree 5 by "Filter out group 8"'. Wait.
So the third step is messing with the second one? Now I'm less sure which one is the wrong one.
It sounds like it's telling me the third one is the problem. I don't understand 'dropped below
degree 5'. I'm going to trust what I was told and stick with the second."

"If I hover over the second row, a tooltip: '41 left. Took out 35:' and then five names and 'and
30 more'. Oh, that's actually nice -- that's what I wanted a minute ago, who did it take out. If
these were my accounts I'd recognise the names and know right away whether it's the wrong bunch.
Why didn't the other screen have that?"

"There's a '...' at the end of the row. Edit rule, Turn off step, Move up, Move down, Create rule
set from step, Delete step. 'Fix it' -- should I edit it instead? Let me look." (Double-clicks
the row.) "Step 2: Filter to degree >= 5. Outcome, Rule, three drop-downs: degree, >=, 5. 'Degree
counts neighbors in the graph this step reads.' OK so degree is how many connections. I don't know
what the right number would be, so editing is not for me. Back arrow." (Clicks 'Filter steps' with
the arrow.) "Back to the list. I'll untick it, same as before."

**Unticked the second step here (63 of 77, 2 of 3 steps).** "Same result, 63. Third one still
ticked. But now under the first step it says 'Split into 4 pieces by "Filter out group 8"'. Great,
so now it's telling me the third step split something. That reads like an error. I didn't touch the
third step! Is it saying I should turn that one off too? I'm not going to. The task said keep it.
But if I were on my own I might start clicking things off until the warning went away, and then
I'd have lost the thing I was supposed to keep."

"Done, I think. Both times I got 63 with the third one kept."

## After the task

**Single Ease Question: 5 of 7.** "The actual clicking was easy -- click the pill, untick a box.
What was hard was knowing which box and whether I'd broken something afterwards. The words
'degree' and 'component' mean nothing to me, and then it tells me things got 'split into 4
pieces', which sounds bad."

**Would she use this instead of her current tool?** "For this, there's nothing to compare it to --
in our analytics tool you can't turn off one filter in the middle and keep the rest, you just rip
them out and redo them. So being able to untick the middle one and keep the last one is genuinely
better. I'd use it if it spoke my language: show me who a step took out, by name, right there,
and don't warn me about 'pieces' unless I did something wrong. And that little pill needs to be
bigger. It's the most important button on the screen and it looks like a label."

## What the moderator saw

- Did not press Ctrl+Z, only because the task named the order of steps; said she would have
  pressed it otherwise. The undo-silently-removes-the-good-step trap was avoided, not tested.
- Found the steps list from the chip in about 20 seconds, by matching the word "steps".
- Hesitated over which step was meant: the task said "group", only the third step's words say
  "group". Chose the second by position and by the size of its count drop.
- Chose "Turn off" over "Delete" deliberately, because it can be undone by ticking again.
- Opened the rule editor on the second screen, understood "Degree counts neighbors", backed out
  because she could not say what the right value would be.
- Read both explanatory second lines (the order note on step 2, the split note on step 1) as
  warnings about something she had done wrong, and the split note as a hint to turn off the third
  step.
- End state on both screens: 63 of 77, 2 of 3 steps, middle step off. Task complete.
