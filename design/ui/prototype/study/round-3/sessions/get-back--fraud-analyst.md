# Session: "Get back to where you were" -- Sarah, fraud investigator

Participant: Sarah, eight years in financial crime, now works escalated cases (mule networks,
round-tripping) at a mid-size bank. Excel and pivot tables every day; i2 Analyst's Notebook a
few times a year. Keyboard-first; expects Ctrl+Z and Esc to work. Session mode: not mandated --
she gives it a fair go on one task.

Task as given by the moderator: "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were, without losing work you meant to keep."

Screens used: the undo mock in participant view (starting just after the mistake: 27 of 77
nodes, three filter steps on, her hand-picked selection cleared by a stray click), then the
steps list that opens from the undo line. The filter chip mock was looked at afterwards for
comparison. Data is the Les Miserables sample, not accounts; she was told to treat characters
as accounts.

## Think-aloud transcript

**The starting screen.**

"OK. Something moved and I didn't mean it to. What am I looking at. Top left, 'Les Miserables',
and a little box, '27 of 77 nodes, 3 steps'. So I'm filtered. 27 out of 77. Was it 27 before?
I don't know -- nothing on here tells me what it was a minute ago. Right side says edges 104,
components 1. Again, 104 compared to what?"

"And the table at the bottom -- 'Selected: none, showing the previous selection'. I had a bunch
of accounts picked out, I know that much, and now nothing's highlighted in the picture. So I've
lost my selection and something's wrong with the numbers. Two problems."

"Reflex: Ctrl+Z."

**Ctrl+Z, once.**

"Right, that changed a lot. Now it says 40 of 77, '2 of 3 steps'. A whole blue cluster came back
at the bottom of the chart -- Marius, Enjolras, Gavroche. And there's a black bar above the
toolbar: 'Undone: Filter out group 8'. ... Hang on. I didn't want that undone. Filtering out
group 8 was on purpose, that's the barricade lot, I took them out to look at everyone else.
And my selection is still gone. I pressed undo expecting the last thing I did to come back --
the last thing I did was lose my selection -- and instead it took a filter away."

"Fine. At least it TOLD me what it undid. In i2 I'd be pressing undo blind and counting. The bar
says 'Show in steps'. I want to see the steps before I press anything else, so I'm clicking
that instead of hitting Ctrl+Z again."

**Show in steps -- the list opens.**

"Oh, OK, this is better. A little list, 'Filter steps':
- Filter to degree >= 2 -- took out 17, 60 left
- Filter to degree >= 5 -- took out 20, 40 left
- Filter out group 8 -- off

"That's a pivot-table view of my own filtering. Took out, left. I can read that. So the group 8
one isn't gone, it's just unticked. Good -- undo didn't throw it away."

"Now what went wrong. Degree -- that's the number of links, I think? 'Degree >= 2' I remember,
that's dropping the one-off accounts. 'Degree >= 5' took out 20. That's the big drop. I didn't
mean to throw out everyone with fewer than five links; that's the step that ate my numbers.
So: that's the mistake, and group 8 was fine."

"It'd be nice if it said 'links' instead of 'degree', or said in words what >= 5 did. I had to
guess. I guessed right, I think."

**Ticking group 8 back on, unticking the middle step.**

"Tick group 8 back on." (Clicks the checkbox.) "27 of 77 again, three steps. Back to the broken
state, which is expected. Now untick the degree >= 5 one." (Clicks.) "47 of 77, '2 of 3 steps'.
Degree >= 5 now says 'off', group 8 says 'took out 13, 47 left'. Three little dots come apart
over on the right of the chart -- components 3 on the right side. Fine, that's what the data
does without the >= 5 cut."

"And the wrong step's still in the list, just off. I like that. If my reviewer asks 'did you
try five links?', it's sitting there. That's an audit trail, sort of."

"Could I have just pressed Ctrl+Z twice and then Redo? Probably. I wasn't going to find out by
experimenting on a live case."

**The selection.**

"Now my selection. Picture: nothing has a ring on it. Table header, small grey writing:
'Selected: none, showing the previous selection', then 'Previous selection', 'Show filtered
graph'. That wording's odd -- selected none, but it's showing a selection? Are these rows
selected or not? ... I think it means 'these are the ones you HAD'. OK, click 'Previous
selection'."

"There. 'Selected: 18 of 47 nodes.' The right panel says 18 nodes, rings back on the dots,
Valjean at the top. That's my 18. Done, I think: filters as I meant them, selection back."

"Honestly I nearly missed that button. I read numbers and IDs, I don't read grey helper text.
If I'd closed the laptop after the filters I'd have come back tomorrow wondering where my 18
went."

**Afterwards, the filter chip mock, for comparison.**

"This version of the list has a line under the degree >= 5 step: 'keeps only nodes with at
least 5 neighbors among the 60 it reads'. That's what I wanted on the other screen. Put that
everywhere."

"What I'd still want: click 'took out 20' and see the 20. Those are accounts I dropped from the
case. If an examiner asks why an account isn't in the chart, I need that list, not a count."

## After the task

**Single Ease Question: 5 of 7.** "Got there. Undo told me what it did, and the steps list is
genuinely good. But undo went for the wrong thing first, and the selection was a separate hunt
with a button I almost didn't see."

**Would you use this instead of your current tool?** "For this bit -- backing out a filter
without losing the others -- it beats i2, where undo is a blind stack, and it beats Excel, where
I'd be re-applying the filters from memory. The 'took out, left' counts are the first thing in
a demo that looked like my pivot table. Instead of my current tool? Not on this alone. I need
to see which accounts each step took out, and get the step list into the case file. And it has
to be approved before it touches customer data, which isn't my call."

## Problems observed

1. **Ctrl+Z skipped the most recent thing she did.** Losing the selection was her last action,
   but undo reversed a filter she meant to keep. The undo line made the surprise recoverable,
   but her expectation ("undo brings back what I just lost") was broken. Severity 3.
2. **No "before" number anywhere.** The chip and statistics show 27 of 77 and 104 edges with
   nothing to compare against, so she could not tell what "where I was" looked like without
   acting first. Severity 2.
3. **"Selected: none, showing the previous selection" reads as a contradiction** and the
   Previous selection button is small grey text she nearly missed; she found it only after
   fixing the filters. Severity 2.
4. **"degree >= 5" with no plain words** in the steps list opened from undo; she had to guess
   it meant number of links (the filter chip screen has the explanatory line; this one does
   not). Severity 2.
5. **"Took out 20" is a count, not a list.** She wants to see which accounts a step removed,
   for the case file. Severity 2.
6. **The undo line goes away after a few seconds** (per moderator); she reads slowly and would
   have lost the "Show in steps" way in if she had looked at the table first. Severity 2.
