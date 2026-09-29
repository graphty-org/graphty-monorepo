# Session: fixing the wrong middle filter step -- Sarah, fraud analyst

**Participant.** Sarah, level-2 financial crime investigator at a mid-size bank (composite persona,
study/personas/fraud-analyst.md). Mode: first impression, not mandated.

**Task, as the moderator gave it.** "You filtered transfers in three steps and the middle one was
wrong. Get back to the result you had with only the right steps on."

**Pages used.** The undo screen in its participant view (screens/undo.html, study view, starting in
the three-steps state), then a look at the filter chip screen (screens/filter-chip.html) for
comparison. Renders the participant saw: shots/r3-sarah-undomid-s3.png (start),
shots/r3-sarah-undomid-s3-pop.png (steps list open), shots/r3-sarah-undomid-off.png (end state),
shots/r3-sarah-undomid-s2.png (what Ctrl+Z would have done), shots/screens__filter-chip-three--study.png.

**Outcome.** Success in two clicks, about a minute including the grumbling. End state: 47 of 77,
"2 of 3 steps", the wrong step unticked and still listed. SEQ 6.

## Transcript (think-aloud)

**Start screen.**

> "Transfers? This says Les Miserables. Valjean, Fantine, Javert. Okay, it's a demo set, I'll
> pretend these are accounts. Whatever."

> "Top left, under the name: a funnel, '27 of 77 nodes, 3 steps', with a little arrow. That's my
> filter. Same as the little arrow on an Excel column header. Nodes means accounts, I assume."

> "I'm not pressing Ctrl+Z. Ctrl+Z takes off the last thing I did, and the last thing was right.
> I'd lose the good step to get to the bad one. I want the list of steps."

Also noticed, and did not act on:

> "Down in the table: 'Selected: none, showing the previous selection.' I didn't select anything.
> What previous selection? ... Not my problem right now. Leaving it."

**Clicks the chip ("27 of 77 nodes, 3 steps").** The Filter steps list opens.

> "Good, that's what I wanted. Three rows, three checkboxes. 'Filter to degree >= 2, took out 17,
> 60 left. Filter to degree >= 5, took out 20, 40 left. Filter out group 8, took out 13, 27 left.'"

> "I like the 'took out, left' numbers. 77 minus 17 is 60, 60 minus 20 is 40, 40 minus 13 is 27.
> It adds up. That's the part I'd paste in my notes -- how I got from 77 to 27."

> "'Degree' -- I'd call that number of counterparties. I'm guessing that's what it means. On the
> other screen it spelled it out, here it doesn't."

> "The middle one is the wrong one. There's a checkbox. Excel logic: untick it."

**Unticks "Filter to degree >= 5".**

> "Chip says '47 of 77 nodes, 2 of 3 steps'. The row stays there, greyed, says 'off'. The last row
> now says 'took out 13, 47 left'. So 60 minus 13 is 47. Fine. That's the result I wanted: first
> and last step, not the middle."

> "And the row is still there, so if my reviewer asks 'did you try five or more?' I can show it
> was tried and switched off. That I actually like. Does 'off' show up in whatever I export? It
> better, or the audit trail has a hole in it."

> "The picture moved. Some new accounts came in, the islands at the bottom right, a couple of
> black dots with no colour on the legend -- legend says '4 more', which is useless if I'm
> printing this in grey. But the numbers are what matter, and they're right."

> "The dotted boxes around the three-dot buttons on each row -- I assume that's where delete and
> rename are. I'd want to rename 'degree >= 5' to something a reviewer understands. Couldn't
> click it here."

**Moderator asks: what would Ctrl+Z have done?** Shown the render after one Ctrl+Z from the start.

> "'Undone: Filter out group 8. Show in steps.' Right -- it took off the good one, like I
> thought. At least it tells you which one it took off instead of just changing the numbers
> under you. 40 of 77, 2 of 3 steps. If I'd done that by accident I'd see it in the chip."

> "Would I have noticed that message? Maybe. It's black, middle of the chart, near the buttons.
> I'd notice the numbers more than the message."

**Looks at the filter chip screen (same popover, different page).**

> "This one says 'keeps only nodes with at least 5 neighbors among the 60 it reads' under the
> middle step. That's better. The other screen didn't have it. And 'Assistant: Off. Nothing is
> sent.' on the left -- that line I want on every screen, my IT people would want it too."

> "Why do the two look different? Same list, one's got the numbers on the right, one's got them
> underneath. Pick one."

## After the task

**Single Ease Question: 6 of 7.** "Easy. Funnel, list, untick. That's Excel. It's not a 7 because
I had to guess what 'degree' means, and there's a 'previous selection' thing in the table I never
asked for."

**Would she use this instead of her current tool?**

> "For this part, yes, it's nicer than my pivot table. In Excel if I take a filter off in the
> middle I lose track of what I did; here the step stays, with the counts, and I can put it back.
> That's an audit trail I don't have to write by hand. But this is ten seconds of my case. It
> doesn't tell me about money -- no amounts, no dates, it's a book. I'd need to see the same list
> with 'amount over 9,000' and 'between 1 March and 15 March' as steps, and I'd need that list to
> come out in the export, word for word. Then I'd tell my manager it's worth an access request.
> Until then it's a nice filter."

## Problems observed

1. Table scope line "Selected: none, showing the previous selection" confused her; she had
   selected nothing in her own mind. Ignored it, but it cost trust. Severity 2.
2. Step rule reads "degree >= 5" with no plain-words explanation on this screen; the filter chip
   screen has the explanation line. She guessed "number of counterparties". Severity 2.
3. The same steps list is drawn two different ways on the two screens (numbers right vs.
   underneath; explanation present vs. absent). Severity 1.
4. She could not tell whether a step that is off will appear in an export or audit record.
   Severity 2 (she would ask before trusting it).
5. After unticking, new nodes appeared in grey/black with the legend saying only "4 more"; in
   grayscale print she could not tell groups apart. Severity 1 for this task.
6. Demo data is a novel's characters, not transfers; she played along, but it weakened her
   judgement of real value. Severity 1.
7. The undo notice sits over the canvas; she said she would watch the chip numbers, not the
   message. Not a failure, since she never used undo. Severity 1.

## What worked

- Funnel chip read as "my filter" at once, from the Excel analogy.
- "took out N, M left" per row, and the arithmetic adding up.
- Unticking keeps the row, so a tried-and-rejected step stays on the record.
- She predicted correctly that Ctrl+Z would remove the good last step, and the design did not
  trap her into it.
