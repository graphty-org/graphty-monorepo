# Session: fix the wrong middle step without losing the third -- Nadia, level-1 alert reviewer

Participant: Nadia, transaction monitoring analyst, fourteen months in (persona:
study/personas/alert-reviewer.md). Works the alert queue in the bank's case system; has never
used a graph tool; clicks what is in front of her; measures everything in minutes per alert
and in what QA will say.

Task as the moderator gave it, and nothing more: "You narrowed the graph in three steps and the
middle one was wrong. Fix it without losing the third."

Screens used, as a participant sees them (design notes hidden):
- the filter chip with its steps open, in the state where the middle step is wrong (filter out
  Valjean, filter to largest component, filter out Javert) -- screens/filter-chip.html, the
  "Wrong middle step" state;
- the same chip with a step turned off, and the step editor -- screens/filter-chip.html;
- the wrong-middle-step walk-through: the hover over a step's count, the Edit menu's undo
  history, a step turned off, a step deleted, the re-run -- screens/filter-step-recovery.html;
- the undo screen -- screens/undo.html.

Captures: tmp/nadia-fixmid/fc-wrong.png, fc-off.png, fc-edit.png, fsr-0.png to fsr-5.png;
shots/tasks/fix-wrong-middle-step/01-undo.png and 02-filter-chip.png.

## Step 1 -- which one is the middle one

> Okay. It's the Les Miserables thing again, not accounts. Fine, pretend they're accounts.
>
> Top left, the outlined box: "60 of 77 characters - 3 steps". And a list is already open next
> to it, "Filter steps". Three rows with ticks:
>
> - Filter out label = Valjean. Took out 1, 76 left.
> - Filter to Largest component. Took out 15, 61 left. "Keeps only the largest of the 7
>   connected pieces it reads."
> - Filter out label = Javert. Took out 1, 60 left.
>
> So this is like the filter bar on the case system's transaction grid, except it's a list and
> it keeps score. I like the "took out / left". That's what I'd write in the file: started with
> 77, took out Valjean, and so on.
>
> The middle one took out fifteen. That's the jump. Why fifteen? "Largest of the 7 connected
> pieces." Connected pieces of what -- I took out one person and now there are seven pieces? I
> guess because Valjean was holding everybody together and when he's gone the people who only
> knew him fall off in little islands, and "largest" throws the islands away. That's the same
> question I always have with hops: from what? Here it's "largest compared to what". I'd get
> it wrong the first time. But I don't have to understand it to see it's the one that did the
> damage. Fifteen is the number that's off.

Moderator note: she found the wrong step from the counts alone, without reading the grey
explanation closely. She read the explanation as "islands" after a second pass.

## Step 2 -- who are the fifteen

> Before I fix anything I want to know who it threw out, because if I'm clearing an alert and
> one of the fifteen is the counterparty, that's the whole alert.
>
> (Hovers the count on the middle row in the walk-through page.) "61 left. Took out 15: Myriel,
> Mlle.Baptistine, Mme.Magloire, Champtercier, Count and 10 more." Okay, names. Good. "And 10
> more" -- where are the ten? I can't click that. If this were accounts I'd want all fifteen,
> copyable, because the next thing I do is paste them into the case system.
>
> Also, on this page the counts on the right are just numbers, 76, 61, 60. On the other page
> it said "took out 15 - 61 left" in words. Here I had to hover to find out 61 means "left" and
> not "took out". I'd have guessed "took out", honestly, because that's the thing I care about.

## Step 3 -- the first thing I'd try: Ctrl+Z (and why I stopped)

> My reflex for "I did something wrong" is Ctrl+Z. But I did the wrong thing two things ago.
>
> (Opens the undo screen. Nothing looks different: "27 of 77 nodes - 3 steps", a table,
> "Selected: none, showing the previous selection". Different example entirely -- degree steps,
> not Valjean.) I don't know what I'm supposed to do on this one. It says "previous selection"
> and "show filtered graph" -- is that about the steps? I don't think so. I'm leaving it.
>
> (Back on the walk-through, the menu open: Edit, Undo history.) Here's the list:
>
> - Re-run betweenness -- undo back to here (1 step)
> - Filter out label = Javert -- undo back to here (2 steps)
> - Filter to Largest component -- undo back to here (3 steps)
> - Filter out label = Valjean -- undo back to here (4 steps)
>
> "3 steps." Wait -- which steps? The filter has three steps. Is "3 steps" the three filter
> steps? If I click the highlighted one, the Largest component row, I'd think I'm undoing that
> step. But it says "back to here", so it undoes Javert too, and the re-run. So undo fixes the
> middle by throwing away the third. That's exactly what I was told not to do.
>
> I only know that because I read the "back to here" part twice. On a normal day I click the
> highlighted row, lose Javert, and don't notice until QA asks why Javert's in the picture. The
> word "steps" means two different things on this screen and they're right next to each other.

Moderator note: she did not use undo. She read "Undo back to here (3 steps)" first as "undo
filter step 3", then corrected herself. Had she clicked, she would have lost the Javert step.

## Step 4 -- untick the middle one

> Back to the list. The tick is the obvious thing. It's a checkbox, it's on the left, it's what
> I'd click in any grid.
>
> (Unticks "Filter to Largest component".) The box on top changes: "75 of 77 nodes - 2 of 3
> steps". The middle row goes grey with a dash where the number was. Javert's row now says 75.
> So the Javert step is still there and still ticked, and it's now working on the bigger set.
> That's what "without losing the third" means. Done, I think.
>
> On the other page the turned-off row said "off - takes nothing out" in words, which I like
> better than a dash. A dash in my world means "no data", not "switched off".
>
> The right side says "up from 1 when Filter to degree >= 5 was turned off" on the other
> example -- that's nice, it tells me what my click did. I'd put that sentence in the file.
>
> The thing I'm not sure of, and I'd ask someone: did unticking change the data, or only what
> I see? I think only what I see, because the table still has a "full graph" column and it
> says "Filtered graph: 75 of 77". The 77 is still there. So nothing's deleted. But nothing
> tells me that in plain words, and "filter out" sounds like it removes things. If this were
> the bank's data I'd be nervous clicking anything called "delete".

## Step 5 -- or delete it

> The row has a menu (right-click): Edit rule, Turn off step, Move up, Move down, Create rule
> set from step, Delete step. If I'm sure it's wrong, delete. (Walk-through, deleted state.)
> Now it's "75 of 77 nodes - 2 steps", two rows, Valjean and Javert, same 75. Same as
> unticking, just tidier.
>
> And the Edit menu says "Undo Delete step Filter to Largest component". Okay, so if I deleted
> the wrong one I can get it back, and the undo is about the thing I just did, not the chain.
> That one's fine.
>
> I'd untick, not delete. Unticking I can see. Delete, I have to trust the menu.

## Step 6 -- the other numbers didn't follow

> The panel on the right: Betweenness, "on: 60 nodes", and a Re-run button. And the table's
> betweenness column says "on: 60 nodes" under the header while the table says 75 of 77. So the
> scores in the table are the old ones, from before I fixed the filter. It does say so, in
> grey, small. I'd miss it. If I took a screenshot for the file right now, the picture would
> have 75 people and scores for 60, and QA would catch that before I did.
>
> (Re-run.) Now it says 0 to 0.307, and the grey note is gone. Marius went from 0.485 to
> 0.307. Okay, that's a big change -- good thing I re-ran. But I wouldn't have known to, if I
> hadn't been told "fix it" and gone looking.

## Step 7 -- could this go in the file

> What I'd need for QA: the three lines -- out Valjean, largest piece (off), out Javert -- with
> their counts, and one picture. The list reads almost like a sentence, except "label =
> Valjean" is computer. "Filter out Valjean" is what I'd write. I don't see a way to copy the
> list as text. I'd screenshot the popover and paste it.
>
> One more thing: the same screen says "characters" in one place and "nodes" in another. On
> the chip in one version it's "27 of 77 characters", in the walk-through it's "60 of 77
> nodes", and in the one-step-off state the word just disappears: "47 of 77 - 2 of 3 steps".
> Of 77 what? If I'm writing counts in a file, the unit matters.

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 = very difficult, 7 = very easy)

> 5. Unticking was easy -- one click, and the third step obviously stayed. What took time was
> being sure: the undo list almost made me throw away the third step, the numbers on the
> walk-through mean "left" and I read them as "took out", and the scores went stale without
> shouting about it. If I'd started from the list instead of from Ctrl+Z it's a 6.

## Would you use this instead of your current tool?

> No. Not for alerts. My case system doesn't have "three steps of narrowing", it has one
> account and six months of transfers, and I clear most of them in five to ten minutes without
> a picture. If I ever did narrow a counterparty network in three steps, I'd rather have this
> list than the grid filters I have now -- at least it shows me what each step took out, and I
> can switch one off without redoing the others. That part is better than anything I've got.
> But that's a level-2 thing. Sarah would use it. I'd see it in her escalation notes.

## What she did, in order

1. Read the step list; found the wrong step from the jump in "took out" (15) without reading
   the explanation.
2. Hovered the middle step's count for names; wanted all fifteen, copyable.
3. Reached for undo; abandoned the undo screen as unrelated; read "Undo back to here (3 steps)"
   first as "undo filter step 3", then realised it would also discard the third filter step.
   Did not use undo.
4. Unticked the middle step. Correct outcome: 75 of 77, third step intact, 2 of 3 steps on.
5. Looked at delete as an alternative; preferred unticking because she could see it.
6. Noticed the stale betweenness only after being in "checking" mode; re-ran it.
7. Wanted to copy the step list as text for the alert file; would screenshot instead.

## Observations for the design team

- The step list with "took out N - M left" let a first-time user find the wrong step in
  seconds. The counts, not the grey explanation, carried it.
- "Steps" means filter steps on the chip and undo steps in the Undo history ("Undo back to
  here (3 steps)"). She read the undo count as "filter step 3", which on a less careful day
  would have removed the third filter step -- the exact loss the task forbids.
- The walk-through page's step list shows bare numbers on the right (76, 61, 60, a dash for
  off); the filter-chip screen shows "took out 1 - 76 left" and "off - takes nothing out". She
  read the bare number as "took out", the opposite of what it is. The two screens disagree.
- "Took out 15: ... and 10 more" in the hover gives names but not all of them, and nothing to
  copy.
- The unit changes between "characters" and "nodes" across screens, and is dropped entirely in
  the one-step-off chip ("47 of 77 - 2 of 3 steps").
- Nothing states in plain words that turning off or deleting a step leaves the data itself
  untouched; she inferred it from "of 77" and the "full graph" column, and "Delete step" still
  made her nervous.
- The stale betweenness ("on: 60 nodes", small and grey in the column header and the results
  panel) is honest but quiet; she would have screenshotted a picture with mismatched counts.
- The undo screen, as she saw it, showed a different example with no visible step list and
  selection wording she could not connect to the task; she left it without learning anything.
