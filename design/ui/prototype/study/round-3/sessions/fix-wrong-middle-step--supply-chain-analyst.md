# Session: fix the wrong middle filter step -- Dana Okafor, supply chain risk analyst

**Task as given aloud:** "Of three filter steps, the second removed the wrong group. Fix it without
losing the third."

**Screens used:** the undo and ways-back mock in its participant view (screens/undo.html#study),
then the filter chip mock (screens/filter-chip.html). What she saw is recorded in these renders:

- shots/record/r3-dana-fixmid-undo-start.png -- where she started
- shots/record/r3-dana-fixmid-undo-pop.png -- the filter steps list opened from the chip
- shots/record/r3-dana-fixmid-undo-off.png -- after she unticked the second step
- shots/record/r3-dana-fixmid-chip-three.png -- the same list in the filter chip mock, with notes under a step
- shots/record/r3-dana-fixmid-chip-edit.png -- the step editor she reached from a row's menu

**Outcome:** done, with hesitation. She turned the second step off; the third stayed on. She went
looking for a way to change the step instead of switching it off, found it on the second screen,
and decided switching off was the honest fix because she did not know what the right value was.

**Single Ease Question:** 5 of 7.

## Transcript (thinking aloud)

**Start screen.** "OK, so it's a network picture, a table at the bottom, stuff on the right. Les
Miserables -- fine, it's a demo. First thing I notice is the red dashed boxes around half the
buttons. Are those errors? Did something fail validation? ... You're telling me ignore them. OK."

"Up top left: a little funnel, '27 of 77 nodes, 3 steps'. Funnel means filter to me, that's the
Excel filter icon. And 'steps' -- that's like Applied Steps in Power Query. That's where I'd go."

"Before I touch that -- the table says 'Selected: none, showing the previous selection', and then
'Previous selection' and 'Show filtered graph'. I don't know what that's telling me. I didn't
select anything. Is that part of the problem? ... Not my task, skip it."

"I am not pressing Ctrl+Z. In Excel Ctrl+Z takes the last thing off first, and the last thing is
the step I'm supposed to keep. I've lost afternoons that way."

**Clicks the chip.** "Right, there's the list. Three rows, each with a tick box. 'Filter to degree
>= 2, took out 17, 60 left.' 'Filter to degree >= 5, took out 20, 40 left.' 'Filter out group 8,
took out 13, 27 left.' I like the 'took out, left' bit. That's a waterfall. I can check that in my
head: 77, minus 17 is 60, minus 20 is 40, minus 13 is 27. Good, it adds up."

"But hang on. You said the second one removed the wrong group. The second one doesn't say group,
it says 'degree'. The group one is the third. So which one is wrong? You said second, I'll go with
second. But in real life I'd be stuck here, because the step says what rule it ran, not who it
threw out. I want to see the names it took out. If I'd built this last week I would not remember
what 'degree >= 5' was for."

"What's 'degree'? I don't use that word." (On the filter chip mock she later reads the grey line
under the step: "keeps only nodes with at least 5 neighbors among the 60 it reads".) "Neighbors --
OK, so connections. Five connections or more. 'Among the 60 it reads' -- I think that means it
only counts what's left after step one? I'd have to trust that."

**Hovers the 'took out 20'.** (Filter chip mock; the tooltip lists the 20 characters.) "Oh, there
are the names. That's what I wanted. Why is that hidden in a hover? That should be a click that
gives me a table I can copy. That's the thing I'd paste into the Thursday deck: these twenty
dropped out, and here's why."

**Looks for a way to fix, not delete.** "'Fix it' -- do I change it or turn it off? In Power Query
I'd click the gear on the step and change the number. There's no gear. There's a dot-dot-dot."
(On the undo mock the dot-dot-dot does nothing.) "Dead button. ... On the other screen it gives me a
menu: Edit step, Turn off step, Move up, Move down, Delete step. OK, 'Edit step'."

**In the editor.** "'Step 2: Filter to degree >= 5.' Filter to or Filter out, then degree, greater
or equal, 5. 'Scope: after step 1: 60 nodes.' 'Result: took out 20, 40 left.' It's a form, I can
read it. I could make it 'group equals' something. But I don't know which group was the right one
-- you only told me this one was wrong. If I guess I'm making up a number. Back."

"The little back arrow at the top, 'Filter steps'. Fine."

**Unticks the second step.** "Tick box off on the second row. ... It went grey, says 'off'. The
third one now says 'took out 13, 47 left'. Top says '47 of 77 nodes, 2 of 3 steps'. So the third
is still doing its thing -- still took out 13 -- and the second is parked, not gone. That's
actually better than Power Query; there I'd have to delete it and retype it if I changed my mind."

"More stuff showed up in the picture, some little grey dots off on their own, and the numbers in
the table jumped -- Valjean went from 17 to 27. I guess because more of his connections are back.
The one next to it didn't change, 36. Two columns of almost the same number, I'd have to ask
someone which one to quote."

"Will it remember that step two is off when I open this next week? And will someone else looking at
my file see there's a switched-off step, or just the 47? If I send the VP a picture that says 47 I
want the note to say one step's switched off."

"Done. I think. Nothing told me 'you fixed it', but the counts say it."

## After the task

**Single Ease Question:** 5. "Turning it off was easy once I found the list, and it didn't touch
the third one. I lost time working out what 'degree' meant and whether 'fix' meant change or turn
off. And the names of what got taken out were in a hover."

**Would you use this instead of your current tool?** "For this bit, it's nicer than what I have.
It's Power Query's applied steps with an off switch and a running count, and I'd take that. But I
don't filter a network in anything today -- I filter a table in Excel, and in Excel I can see the
rows that went. Show me the rows that dropped out, in my words -- 'suppliers', not 'nodes' -- and
let me copy them. And the same questions as always: will IT sign off, where does my supplier list
go when I load it, and can I get this into Power BI. Until someone answers those, it's a side tool."

## Problems observed

1. **The step names the rule, not what it removed.** The task spoke of a wrong group; the list
   shows "degree >= 5". She could not tell from the list which step dropped which people. The
   names only appear in a hover on the count. Frustration: 3.
2. **"degree" is a word she does not know.** It is on the step and on two table columns. The grey
   explanatory line under the step helped, but it appears on only one of the two mocks, and "among
   the 60 it reads" was a guess. Frustration: 2.
3. **Changing a step is hidden.** No visible edit control; the row menu opens only from the
   "..." (which does nothing on the undo mock) or a double-click she would never try. She reached
   the editor only on the second mock. Frustration: 2.
4. **The selection line on the table is noise for this task.** "Selected: none, showing the
   previous selection" with two buttons, when she had selected nothing; it made her wonder whether
   it was part of the problem. Frustration: 1.
5. **No confirmation that the fix is the fix.** She read success from the counts; she wanted a
   short line such as "Step 2 off. Step 3 still takes out 13." Frustration: 1.
6. **Two near-identical number columns.** After the change "degree, filtered" and "full graph"
   diverged; she could not say which to quote. Frustration: 1.
7. **Prototype only:** the dashed red outlines on unbuilt controls in the participant view looked
   like validation errors to her. Frustration: 1.
