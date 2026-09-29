# Session: "Get back to where you were" -- Alex, operations data analyst

Participant: Alex, 31, data analyst at a logistics company. Windows laptop, Chrome. Computes in
NetworkX, draws in Gephi. Presses Ctrl+Z and Ctrl+Y the way he does in Excel, without looking.

Task as given by the moderator: "After your last few actions the numbers changed in a way you did
not expect. Get back to where you were, without losing work you meant to keep."

Set-up the participant was not told: the Les Miserables co-appearance graph (77 characters) has
been narrowed in three filter steps -- keep characters with at least 2 connections, keep those
with at least 5, leave out group 8 (the students at the barricade). The middle step is the
mistake. A hand-picked selection (Valjean and his neighbours, 18 nodes) was also lost to a stray
click on the canvas.

Screens used: the undo mock, participant view (no annotations), starting on the main window after
the three steps; the filter chip mock for comparison afterwards. Renders of what he saw:
`shots/r3-alex-getback-s3.png`, `-s2.png`, `-s1.png`, `-list.png`, `-tick.png`, `-fix.png`,
`-s3-menu-hist.png`, `-filterchip.png`.

## Think-aloud transcript

**The main window, first look (r3-alex-getback-s3.png).**

"OK. Les Mis. Top left: '27 of 77 nodes, 3 steps'. 27. That's -- no. I had forty-something. I
remember forty-something because I was going to say 'about half the cast' in the write-up. So
something in my last few steps ate a bunch of people."

"Stats on the right say 27 of 77, 104 edges, one component. Table's sorted, Valjean 17 on the
filtered degree, 36 full graph. Fine, those columns I get. And the table says 'Selected: none,
showing the previous selection'. ... What? I'm not selecting anything. Park that."

"First thing I do is what I do everywhere. Ctrl+Z."

**One Ctrl+Z (r3-alex-getback-s2.png).**

"Black bar by the toolbar: 'Undone: Filter out group 8'. And -- yeah, the students are back, the
blue lump with Marius and Enjolras. 40 of 77. OK, 40, that's closer to my number, but that's not
the step I wanted gone. I wanted the students out. That one was on purpose."

(He had already pressed Ctrl+Z a second time while reading; the bar changed under him.)

**Two Ctrl+Z (r3-alex-getback-s1.png).**

"'Undone: Filter to degree >= 5'. 60 of 77. OK, >= 5 -- yeah. That's the one. I meant to bump
the threshold, not to five, five is way too aggressive on this graph. So that's the wrong one.
It was the middle one. But now I've undone both and the students are back in, and I only wanted
one of them gone."

"Note the bar only tells me the last thing. If I'd looked away I'd have no idea the group 8 one
went too -- well, the chip says '1 of 3 steps', and the blue lot are back on the picture. So you
can work it out. But I had to work it out."

"Right. Redo the group one. Ctrl+Y."

**Ctrl+Y (Redo).**

"'Redone: Filter to degree >= 5.' No! 40 again. That's the wrong one. It redid the one I don't
want. ... Of course it did, it's a stack, it gives back the last thing I undid. Same as Excel.
I knew that. I just didn't think about it. So Redo can't give me group 8 without giving me the
bad step first. Ctrl+Z again."

(Back to 60 of 77, 'Undone: Filter to degree >= 5'.)

"I'm going to stop hammering keys. What's that button on the bar -- 'Show in steps'. OK."

**Show in steps (r3-alex-getback-list.png, after his clicks the same list as below).**

"A list drops out of the chip. 'Filter steps'. Three rows, each with a tick box. Degree >= 2,
ticked, 'took out 17, 60 left'. Degree >= 5, not ticked, 'off'. Filter out group 8, not
ticked, 'off'. Oh -- so undo doesn't delete them. They're just unticked. That's good, actually.
That's the thing Gephi never did: in Gephi's filter panel if you undo you've lost the filter
and you rebuild it."

"So: tick group 8, leave >= 5 off."

**Group 8 ticked back on (r3-alex-getback-tick.png).**

"47 of 77. 'took out 13, 47 left' on the group row, and the middle row says 'off'. Chip says
'47 of 77 nodes, 2 of 3 steps'. ... '2 of 3 steps' read to me for a second like it's a wizard
and I'm on step two. It means two of the three are on. Fine, I get it now, but the first read
was wrong."

"47. Forty-something. That's my number. Stats: 142 edges, 3 components. Three components --
hm, the three grey ones floating off to the right, they're cut off because the students were
their link. OK, that's real, that's not the tool, I'd have that in Python too."

"Table: Valjean 27 filtered, 36 full graph. Javert 15, 17. Fantine 15, and -- nothing in 'full
graph'. Mme.Thenardier, nothing. Why is that blank? Is the number missing? ... Oh, maybe blank
means it's the same as the filtered one. Fantine is 15 on the full graph, I think. If that's
what blank means, write the number. Blank in a column that goes into a spreadsheet means
missing, and somebody will ask me why it's missing."

"Betweenness column hasn't moved the whole time, 0.570 on Valjean. Header says 'betweenness,
full graph'. OK, so it didn't rerun on the filter. Good -- that's what I'd want, and it says so
in the header, so I'm not going to accidentally quote the wrong one."

**The selection.**

"Now, 'Selected: none, showing the previous selection', with 'Previous selection' and 'Show
filtered graph' after it. ... Right. I had Valjean's neighbours picked out before all this. I
must have clicked on empty canvas. I didn't even notice I'd lost that. The table is still
showing those rows, so that's why it didn't look different."

"Click 'Previous selection'."

**Selection back (r3-alex-getback-fix.png).**

"'Selected: 18 of 47 nodes.' Right side flips to '18 nodes', with the group counts -- group 2
seven, group 4 seven, five three, three one. Rings on the picture. Yes. That's my 18. And
'Previous selection' didn't go in the undo pile, it seems -- the steps list still shows what it
showed. Good. I don't want my selection mixed into my filter undo."

"Done, I think. 47 of 77, the students out, the >= 5 off, my 18 selected. And the >= 5 row is
still there, unticked, if I change my mind. I didn't lose anything."

**Afterwards, asked about the menu (r3-alex-getback-s3-menu-hist.png).**

Moderator: "Did you look for any other way back?"

"No. I'd never go into the hamburger for undo. ... OK, now you show me: Edit, Undo history,
three lines, 'Undo back to here (2 steps)'. That's fine, but it does the same thing as two
Ctrl+Zs, it'd have put the students back in too. The tick boxes are the thing that fixed it,
not undo."

**The filter chip page, for comparison (r3-alex-getback-filterchip.png).**

"This version of the list has an extra line under the >= 5 row: 'keeps only nodes with at least
5 neighbors among the 60 it reads'. That line would have told me straight away that five was
wrong for this graph. The other list didn't have it. And there's no tick-box story on this one,
it's the same list. Which one is the real one? I'd want the sentence."

## Single Ease Question

4 of 7. "I got there. But I got there on the third try, and the first two things I did -- Undo
twice, then Redo -- are the things everybody does, and both of them made it worse before it got
better. The tick boxes saved it. If I hadn't clicked 'Show in steps' in six seconds I'd have
been hunting for that chip."

## Would I use this instead of what I use now?

"For this bit, yes, over Gephi. In Gephi if I undo a filter it's gone and I rebuild it; here the
step stays in the list with a tick box and the counts on each row, 'took out 20, 40 left'. That
per-step count is the thing I'd actually check against SQL. And getting my selection back with
one button, without it messing with the filter undo -- Gephi can't do that at all. But I'd want
the bar to tell me what the second undo took with it, and I'd want Redo to not hand me back the
step I just said was wrong without warning me. I'd still do the numbers in Python. For the
picture and the 'which filter did this' question, this is better than what I have."

## Observed problems

1. **Redo returns the wrong step first.** After undoing the last two steps to reach the bad
   middle one, Ctrl+Y re-applied the bad step (degree >= 5), not the good one (group 8). A
   linear redo cannot skip, so Redo is never a way to keep the last step and drop the middle
   one; only the tick boxes are. Nothing on screen says so. Severity 3.
   > "It redid the one I don't want. ... So Redo can't give me group 8 without giving me the bad
   > step first."
2. **The undo bar names only the last undo.** Two quick Ctrl+Zs left one bar, "Undone: Filter to
   degree >= 5"; the group 8 undo was replaced before he read it. The only other clues were "1
   of 3 steps" on the chip and the students reappearing. Severity 2.
   > "If I'd looked away I'd have no idea the group 8 one went too."
3. **The way to the steps list is a 6-second bar or a chip he did not think of.** He reached the
   fix only through "Show in steps"; he did not think of the chip as a button. Severity 2.
   > "If I hadn't clicked 'Show in steps' in six seconds I'd have been hunting for that chip."
4. **A blank "full graph" cell reads as missing data.** Where the filtered and full-graph degree
   are equal, the cell is empty. Severity 2.
   > "Blank in a column that goes into a spreadsheet means missing, and somebody will ask me why."
5. **"2 of 3 steps" first reads as progress through a wizard.** Severity 1.
   > "'2 of 3 steps' read to me for a second like it's a wizard and I'm on step two."
6. **"Selected: none, showing the previous selection" did not register as a lost selection.**
   The table kept the old rows, so he did not notice the loss until the numbers were fixed.
   Severity 2.
   > "I didn't even notice I'd lost that. The table is still showing those rows."
7. **The two mocks of the steps list differ.** The filter chip page explains each step in a
   sentence ("keeps only nodes with at least 5 neighbors among the 60 it reads"); the undo page
   does not. That sentence would have told him which step was wrong. Severity 2.
   > "That line would have told me straight away that five was wrong for this graph."

## What went well

- Undo unticks a step and keeps its row; nothing is lost. "That's the thing Gephi never did."
- Per-step counts, "took out 17, 60 left", are numbers he can check against SQL.
- "betweenness, full graph" in the column header stopped him quoting the wrong scope.
- "Previous selection" gave back the 18 nodes in one click and did not disturb the filter undo.
