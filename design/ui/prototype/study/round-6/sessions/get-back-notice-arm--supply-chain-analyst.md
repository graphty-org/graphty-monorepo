# Session: "The numbers changed -- get back to where you were" -- Dana Okafor, supply chain risk analyst

Participant: Dana Okafor (composite persona, study/personas/supply-chain-analyst.md). Excel and
Power BI every day; not a network scientist. She did a version of this task last round.

Task as given by the moderator, and nothing more: "After your last few actions the numbers changed
in a way you did not expect. Get back to where you were."

Version tested: the one-line notice at the bottom of the canvas reports a cleared selection and
offers "Bring it back"; Ctrl+Z still undoes the last filter step.

Pages: screens/undo.html (participant view, this version), screens/filter-chip.html,
screens/filter-steps-and-undo.html, flows/undo-and-ways-back.html. The renders of her own path are
in shots/ as r6-dana-getback-notice-*.png and are named at each step.

Outcome: failure on the half she could not see coming. She ended with the filter the way she
wanted it (47 of 77, the step she did not recognise switched off) but with her 18 hand-picked rows
gone for good. Her first move, Ctrl+Z, replaced the "Bring it back" line with a line about a
filter, and nothing on screen offered the selection again after that. The moderator reset the page
and she took the two-click path in under a minute, so the pieces work. The trouble is the order she
used them in.

---

## Think-aloud

**Opening screen** (shots/record/r6-dana-getback-notice-01-open.png)

> Same Les Miserables thing as last time. Characters as suppliers, groups as regions, fine.
>
> "The numbers changed." OK, numbers. Where are my numbers. Top left: "27 of 77 nodes, 3 steps."
> Right side: edges 104, density 0.296 -- I don't use those. Table: Valjean 17, and a grey 36 next
> to it. So 17 is on what I filtered and 36 is everything. I remember that from last time.
>
> There's the black bar again. "Selection cleared (18 nodes)". I read that as -- the numbers
> changed, so it threw my selection away. Like when you refresh a pivot and your highlighting
> goes. That's a side effect. The moderator said numbers, so I want the numbers back first.
>
> Last time Ctrl+Z skipped my selection and did a filter. I remember that. But the problem this
> time *is* the numbers, so a filter being undone is maybe exactly what I want. Ctrl+Z.

**Step 1: Ctrl+Z** (shots/record/r6-dana-getback-notice-02-undo1.png)

> A big blue cluster just came back at the bottom. Marius, Gavroche, Enjolras. 40 of 77, "2 of 3
> steps". Bar says "Undone: Filter out group 8."
>
> No. Group 8 was out on purpose, I know that one. That's not the step that surprised me. Same
> thing as last time, it takes the last filter, not the thing I'm worried about.
>
> ... And wait. Where's "Bring it back"? It was on the bar. The bar now only says "Undone: Filter
> out group 8" and "Show in steps". The selection button is gone. I didn't agree to that. I pressed
> undo, I didn't press "forget my selection".

**Step 2: Ctrl+Y** (shots/record/r6-dana-getback-notice-03-redo.png)

> Ctrl+Y, redo, like Excel. "Redone: Filter out group 8." 27 of 77 again, Valjean 17 again. Good,
> filter's back where it was.
>
> But the bar still has no "Bring it back". I was hoping redo would put everything back the way it
> was a second ago, including that button. It didn't.
>
> Table line: "Selected: none, showing the selection just cleared." So the table still *knows*
> which 18 they were -- the rows are sitting right there, Valjean, Fantine, Thenardier, Javert.
> And there's no button next to it that says "select these again". There's "Show filtered graph",
> which is the opposite of what I want.
>
> Could I shift-click the rows? (Moderator: not drawn in this mock.) In Excel I would. That would
> be 18 clicks, or a shift-click if they're in a block, which they are here only because it's the
> old selection sorted. If it were my supplier list I'd have picked those by hand over twenty
> minutes. I'd be rebuilding it from memory.

**Step 3: the menu** (shots/record/r6-dana-getback-notice-07-hist.png)

> Three lines top left, Edit. "Undo Filter out group 8, Ctrl+Z." Undo history: three filters.
> Nothing about the selection. Same as last time -- this is a filter history, not a history of
> what happened to me. There's a "Selection" menu up there too; I'd try it, it's not drawn.
>
> So the selection is gone. I'll note that and fix the numbers, which is what I was asked.

**Step 4: the filter button** (shots/record/r6-dana-getback-notice-04-chip.png)

> Click "27 of 77 nodes, 3 steps". List of steps. This part I like, still.
>
> "Filter to degree >= 2, took out 17, 60 left." That's my cutoff for one-off suppliers,
> I'd set 2. "Filter to degree >= 5, took out 20, 40 left, keeps only nodes with at least 5
> neighbours among the 60 it reads." Five? I don't remember five. That's the one that took out the
> most. And it says it's reading the 60 that were left, not everybody -- that's why Valjean shows
> 17 and not 36. That's the "numbers changed in a way I didn't expect". "Filter out group 8, took
> out 13, 27 left" -- that one I meant.
>
> "Degree" -- connections, I assume. "Neighbours" in the grey line helps. I'd still rather it just
> said connections.

**Step 5: untick the five** (shots/record/r6-dana-getback-notice-05-off.png)

> Untick. Row goes grey, "off, takes nothing out", and it's still in the list if I change my mind.
> Top says "47 of 77 nodes, 2 of 3 steps". Valjean 27 now. A few grey dots floating off on their
> own on the right, and a couple of black ones -- no idea what black means, the legend says "4
> more". Not my problem today.
>
> Bar's gone completely now. Table still says "showing the selection just cleared" and still lists
> the old rows. It keeps reminding me what I lost without giving it back. That's almost worse.
>
> Done, as far as I can get. Numbers are right. My 18 are gone.

**Moderator reset: the same page, read the bar first** (shots/record/r6-dana-getback-notice-08-bringback.png,
r6-dana-getback-notice-09-fixed.png)

> "Bring it back" first. ... There, 18 rows highlighted, rings on the dots, right side says "18
> nodes", colours 7, 7, 3, 1. Then the filter button, untick the five. "47 of 77, 2 of 3 steps",
> and -- the selection is still on. "Selected: 18 of 47 nodes." Two clicks. That's where I was.
>
> So it works if you read the bar before you touch the keyboard. I didn't. The bar said the
> selection was gone and I thought "yes, because the numbers changed" -- I didn't read it as
> "here's your undo for it". And "Bring it back" is a small grey button inside a black bar, I
> looked at the words on the left and not the button.
>
> The real problem: I pressed Ctrl+Z, which in every program I own is the safe key. Here it quietly
> threw away the only way back to my selection. If Ctrl+Z is going to wipe that, the bar should at
> least stay, or say "selection can't come back now". I'd rather Ctrl+Z just gave me the selection
> back first -- that's the last thing that happened to me.

---

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 3**

> Numbers I fixed, and the step list made that easy, I'll give it that. The selection I lost for
> good by pressing the key everybody presses. When the moderator reset it, it was two clicks, but I
> only found that out because someone reset it for me. In real life I'd have rebuilt the 18 by hand
> and been annoyed for the rest of the afternoon. Worse than last time, actually -- last time the
> table line could still bring it back after I'd messed about with undo.

**Would you use this instead of your current tool?**

> Not for this, no. Excel's undo gives me back the last thing that happened, every time; I've
> never lost a selection in Excel by pressing Ctrl+Z. Here the safe key isn't safe.
>
> What I'd still take away: the steps list, "took out 20, 40 left", and the grey line that says
> what a step is actually counting. That's an audit trail I could put in front of my VP -- "this is
> how 1,400 suppliers became the 27 I'm worried about" -- and neither Resilinc nor my pivot tables
> give me that without a separate tab I keep by hand. And "Nothing has been sent from this
> project" at the top is the first line IT will look for.
>
> Still a side tool until I know it reads my SAP export without me fixing column names and gives
> me something Power BI can load.

---

## Problems observed

Ranked most serious first. Severity: 4 = would stop her or make her distrust results, 3 = serious
slowdown or a wrong result she might not notice, 2 = friction she noticed, 1 = cosmetic.

1. (4) **Ctrl+Z silently destroys the way back to a cleared selection.** In this version, pressing
   Ctrl+Z while "Selection cleared (18 nodes) / Bring it back" is showing undoes a filter step and
   replaces the line; "Bring it back" disappears and nothing else on screen, in the Edit menu or in
   Undo history offers the selection again. Redo does not bring the button back either. She pressed
   Ctrl+Z because it is the key she trusts to be harmless. Screen: screens/undo.html (the line
   only).
2. (3) **The cleared-selection line reads as a consequence, not an offer.** "Selection cleared (18
   nodes)" appeared in the same moment as the changed numbers, and she read it as a side effect of
   the numbers changing, like a pivot refresh dropping highlighting. The action "Bring it back"
   sits as a small grey button at the right of the bar and she read only the words on the left.
   Screen: screens/undo.html.
3. (3) **The table keeps showing the lost rows with no way to reselect them.** After the slot is
   gone, the table still says "Selected: none, showing the selection just cleared" and lists the
   18 rows, but offers only "Show filtered graph". She read this as a reminder of what she had lost.
   Screen: screens/undo.html, table scope line.
4. (2) **Ctrl+Z still takes the last filter step, not the thing that surprised her.** Second round
   running she pressed Ctrl+Z expecting the last thing that happened to her and got "Undone: Filter
   out group 8", a step she wanted. The line naming the step is what stopped her pressing it again.
   Screen: screens/undo.html.
5. (2) **Undo history does not include the selection.** She looked for the lost selection in Edit >
   Undo history and found only the three filter steps; she calls it "a filter history". Screen:
   screens/undo.html, Edit menu.
6. (1) **"Degree" in the step names.** She reads it as "connections"; the grey line "at least 5
   neighbours among the 60 it reads" is what told her why Valjean showed 17 instead of 36. Screen:
   screens/filter-chip.html, the steps list.
7. (1) **Unexplained black and grey dots after the fix.** With the degree step off, a few grey
   dots float apart and two black ones appear; the legend's "4 more" does not say what they are.
   Screen: screens/undo.html, 47-of-77 drawing.

## What worked for her

- The undo line names the step it took ("Undone: Filter out group 8"), which is why she caught the
  wrong undo at once and used Ctrl+Y instead of pressing Ctrl+Z again.
- Ctrl+Y redoes, as in Excel.
- The steps list: "took out 17, 60 left", and the grey line under the degree step saying it reads
  the 60 left, not everybody. That line is how she found the step that surprised her.
- Unticking a step keeps the row in the list ("off, takes nothing out"), so nothing felt deleted.
- After "Bring it back", turning a step off kept the selection on ("Selected: 18 of 47 nodes").
- "Nothing has been sent from this project" and "Assistant: Off. Nothing is sent."
