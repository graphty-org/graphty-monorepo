# Session: fix the wrong middle step without losing the third -- Nadia, level-1 alert reviewer

Participant: Nadia, transaction monitoring analyst, fourteen months in (persona:
study/personas/alert-reviewer.md). Works the alert queue in the bank's case system; has never
used a graph tool; clicks what is in front of her; measures everything in minutes per alert and
in what QA will say. She did this task last round too, on the same example.

Task as the moderator gave it, and nothing more: "You narrowed the graph in three steps and the
middle one was wrong. Fix it without losing the third."

Screens used, as a participant sees them (design notes hidden, study view):
- the undo screen -- screens/undo.html;
- the filter chip in its "wrong middle step" state (filter out Valjean, filter to largest
  component, filter out Javert), then the same state with the middle step unticked and then
  Ctrl+Z pressed -- screens/filter-chip.html;
- the filter steps and undo walk-through, a different example (degree >= 2, degree >= 5,
  filter out group 8) -- screens/filter-steps-and-undo.html;
- the wrong-middle-step walk-through on the Valjean example -- screens/filter-step-recovery.html.

Captures: tmp/nadia-fixmid-r6/undo.png, fc-wrong.png, fc-wrong-untick.png,
fc-wrong-untick-undo.png, filter-steps-and-undo-full-00.png to -06.png,
filter-step-recovery-full-00.png to -08.png.

## Step 1 -- Ctrl+Z first, because that's what I do

> Something's wrong, so Ctrl+Z. That's the reflex. Let me look at what undo is here.
>
> (Undo screen.) "27 of 77 nodes - 3 steps" up top. A black bar in the middle: "Selection
> cleared (18 nodes) - Bring it back". And the table says "Selected: none, showing the
> selection just cleared". That's about a selection. I didn't clear a selection, I had a wrong
> filter. Nothing here is my three steps. I don't see the steps anywhere on this screen, just
> the "3 steps" in the box.
>
> Same as last time. I'm not learning anything from this one. Moving on.

Moderator note: she left the undo screen in under a minute, as in the previous round.

## Step 2 -- open the steps, find the bad one

> (Filter chip, wrong-middle-step state. The list is open.) Okay, this I remember.
>
> - Filter out label = Valjean. Took out 1, 76 left.
> - Filter to Largest component. Took out 15, 61 left. "Keeps only the largest of the 7
>   connected pieces it reads."
> - Filter out label = Javert. Took out 1, 60 left.
>
> Fifteen. That's the one. Took out one, took out fifteen, took out one. I don't need to know
> what a "connected piece" is to see which number is off. That part is still good. It reads
> like what I'd write in the file.
>
> One thing. Over on the right, Statistics: "Components 3, of the filtered graph". I just said
> "keep only the largest piece", so why are there three pieces? (Looks again.) Oh -- because
> Javert came out after, and taking him out broke a couple off. I think. That's me guessing.
> If QA asked me "you filtered to the largest piece, why does it say three", I'd have to think
> about it on the spot. Not a blocker. Just one more thing I'd have to explain.

## Step 3 -- the other walk-through: what undo does now

> (Filter steps and undo walk-through. Different example again, degree steps, 27 of 77.)
> Edit menu: "Undo Filter out group 8, Ctrl+Z". Okay, so it tells me what the next Ctrl+Z
> takes back. And the Undo history list: "Filter out group 8, Filter to degree >= 5, Filter to
> degree >= 2, Add style layer Group color". Just names this time. Last time it said
> "undo back to here (3 steps)" and I read that as "filter step 3". That's gone, good.
>
> But now I don't know what clicking "Filter to degree >= 5" in that list does. Does it take
> out just that one? Or everything above it too? It's a list, newest on top, so I'd guess
> everything above it. It doesn't say. I wouldn't click it. If I'm guessing, I don't click.
>
> (Next picture.) One Ctrl+Z: the box says "40 of 77 nodes - 2 of 3 steps", and a black bar
> says "Undone: Filter out group 8 - Show in steps". "2 of 3." So it didn't throw the step
> away, it switched it off. Huh.
>
> (Next picture.) Second Ctrl+Z: "60 of 77 nodes - 1 of 3 steps". "Undone: Filter out group 8
> and Filter to degree >= 5". So now two are off, and it still says "of 3". So the third one
> is still in there, just off. Then I'd click "Show in steps" and tick group 8 back on.
>
> (Next picture: the list with the middle one unticked, "47 of 77 - 2 of 3 steps".) Yes, that's
> where I'd end up. So undo works here, it's just the long way round: press twice, then tick
> one back. And I only trust it because "of 3" didn't drop to "of 1". If I hadn't looked at the
> box I'd think group 8 was gone.
>
> Honestly, if I'm going to end up in the list ticking a box anyway, I'll start in the list.

Moderator note: she worked out from the chip ("1 of 3 steps") that undo turns steps off
rather than removing them. The words "nothing is lost" are in a heading the study view hides;
she did not see them and did not need them.

## Step 4 -- the Valjean walk-through's undo list

> (Filter step recovery, Edit, Undo history.) "Re-run betweenness, Filter out label = Javert,
> Filter to Largest component (highlighted), Filter out label = Valjean." No step counts this
> time. The highlighted one is the bad one, and it's the one my mouse would land on.
>
> On the other walk-through two presses of undo just switched steps off. Is it the same here?
> Would clicking the highlighted row switch off Javert and the re-run too, or delete them? This
> page doesn't show me what happens after. I'm not clicking a thing I can't see the result of,
> not on bank data. Back to the list.

## Step 5 -- untick the middle one

> (Filter chip, wrong state. Clicks the tick on "Filter to Largest component".)
>
> Box on top: "75 of 77 - 2 of 3 steps". Javert's row: "took out 1 - 75 left". So Javert is
> still ticked and still doing its job, on the bigger set. That's the third step kept. Done.
>
> The middle row went grey. There's a little black label "Turn on step" sitting right on top
> of the row's second line, so I can see "...takes nothing out" but not the start of it. Last
> time I liked that it said "off" in words. Now the tooltip is covering it. It goes away when
> I move the mouse, I assume.
>
> And the box says "75 of 77". Of 77 what? Before I clicked it said "60 of 77 characters". Now
> the word's gone. I said this last time. If I copy that into a file, "75 of 77" means nothing.
>
> Right side: "Components 9 ... up from 3 when 'Filter to Largest component' was turned off."
> "Isolated characters 6 ... up from 1 when ..." That's good. It tells me what my click did, in
> a sentence. I'd paste that.
>
> The table: "Filtered graph: 75 of 77 characters". Still says the 77. And there's a "Degree
> (full graph)" column. So nothing got deleted, it's just what I'm looking at. I think. Nothing
> says "your data is unchanged" in so many words, but I'm less nervous than last time because
> the other walk-through showed me undo only switches things off.

## Step 6 -- did I mess it up? Ctrl+Z

> (Presses Ctrl+Z.) Back to "60 of 77 characters - 3 steps", middle one ticked again. Okay, so
> the tick is undoable. Good. I didn't see a black bar here saying what was undone, like on the
> other page. The box just changed. I'd have to compare numbers to know. Fine, I'd untick it
> again.

## Step 7 -- or delete it, and the scores

> (Filter step recovery, the pictures further down.) The row's menu has Delete. Deleted: "75 of
> 77 nodes - 2 steps", two rows. Then the Edit menu: "Undo Delete step Filter to Largest
> component". And after Ctrl+Z, a bar: "Undone: Delete step Filter to Largest component - Show
> in steps". So delete comes back too. Same result as unticking, just tidier. I'd still untick.
> Unticked I can see it's there.
>
> Now the scores. Left side, under Runs: "Betweenness - on 60 of 77 - Re-run", with a button.
> And the table's betweenness column header says "on 60 of 77" while the table itself says 75
> of 77. So the scores are from before. The button helps -- last time it was all grey text and
> I'd have missed it. It's still small. If I'm screenshotting for the file I'd probably catch it
> now because there's a button asking to be pressed.
>
> (Re-run.) "0 to 0.307". Marius went from 0.485 to 0.307. Big drop. Good thing.
>
> Then there's an Export box: "From: 2 filter steps, through Filter out label = Javert", "202
> of 254 rows, filtered", "Methods: always written beside it". That's the first thing I've seen
> that's about the file. The steps get written down with the export. That's what QA wants.

## Step 8 -- the two pages don't agree with each other

> Small stuff, but it adds up. On the filter chip the rows say "took out 15 - 61 left". On both
> walk-throughs they're bare numbers: 76, 61, 60, or 60, 40, 27, and a dash when off. I read a
> bare number next to a step as "how many it took out", because that's what I care about. It's
> the opposite. And a dash to me is "no data", not "switched off".
>
> Also "characters" on one, "nodes" on the other two, same 77 people.
>
> And undo: on one page I watched undo switch steps off. On the other I just see a list and
> have to guess. If it works the same, show it the same.

## Single Ease Question

"Overall, how easy or difficult was this task?" (1 = very difficult, 7 = very easy)

> 6. The fix itself is one click and the third step obviously stays -- the "2 of 3" and Javert's
> "75 left" prove it. Better than last time: the undo list doesn't say "3 steps" any more, and
> it turns out undo only switches steps off, so even if I'd pressed Ctrl+Z twice I wouldn't
> have lost Javert. Not a 7 because I still spent time making sure: the undo list doesn't say
> what clicking a row does, the unit fell off the box, the tooltip covered the "off" text, and
> the walk-throughs show bare numbers I read backwards.

## Would you use this instead of your current tool?

> No, not for alerts. Most of mine are one account and one transfer, cleared in five to ten
> minutes with no picture. I never narrow anything in three steps. If I did, this list beats
> the grid filters I have: it tells me what each step took out, I can switch one off without
> redoing the others, and the export writes the steps down for QA. That's a level-2 thing
> though. Sarah would use it; I'd see it in her escalation notes.

## What she did, in order

1. Opened the undo screen by reflex; it showed a cleared selection, not filter steps; left it.
2. Opened the step list on the Valjean example; found the wrong step from "took out 15"
   without reading the explanation. Queried "Components 3" beside a "largest component" step.
3. On the degree example, read the Edit menu and the Undo history (names only, no step counts)
   and did not know what clicking a history row would do; watched two Ctrl+Z presses and
   inferred from "1 of 3 steps" that undo turns steps off rather than removing them.
4. Looked at the Valjean example's Undo history; could not see the result of clicking a row
   there; declined to use it.
5. Unticked the middle step: 75 of 77, 2 of 3 steps, Javert still on (75 left). Correct
   outcome, one click.
6. Pressed Ctrl+Z to check the untick was reversible; it was, with no line naming what was
   undone on that screen.
7. Saw delete and its undo on the walk-through; preferred unticking. Noticed the stale
   betweenness from the Re-run button and re-ran it. Noticed the export writes the steps down.

## Observations for the design team

- Finding the wrong step from "took out N - M left" is still instant for a first-time user.
- The Undo history no longer says "(3 steps)", and she no longer misread it as a filter step
  number. It now says nothing about how far a row goes: she did not know whether clicking a
  history row reverses one step or everything above it, and would not click it. The
  walk-through's own notes say each entry states how far it goes; the render shows no such text.
- Undo turning filter steps off instead of removing them saved the task on the degree example:
  after two presses, "60 of 77 nodes - 1 of 3 steps" told her the third step was still there.
  She read it from the chip's "of 3", not from any words. The Valjean walk-through shows no undo
  result, so she could not tell whether undo behaves the same there.
- After unticking, the chip reads "75 of 77 - 2 of 3 steps": the unit is dropped exactly as in
  the previous round, while the same screen said "60 of 77 characters" a moment earlier and the
  walk-throughs say "nodes".
- The "Turn on step" tooltip sits over the unticked row's "off - takes nothing out" line, so
  the words she liked last round are hidden right after the click.
- The two walk-throughs still show bare counts (76, 61, 60; a dash when off) where the chip
  shows "took out 1 - 76 left" and "off - takes nothing out". She reads a bare count as "took
  out", the opposite of what it is.
- "Components 3" beside a "Filter to Largest component" step made her stop and reason about
  step order; she could explain it only as a guess.
- "up from 3 when 'Filter to Largest component' was turned off" is the sentence she would
  paste into the alert file.
- On the filter chip, Ctrl+Z after unticking reversed it with no line naming what was undone;
  on the walk-throughs every undo showed such a line. She noticed the difference.
- The stale betweenness is easier to catch than last round because of the Re-run button beside
  "on 60 of 77"; still small.
- The export dialog stating "From: 2 filter steps, through Filter out label = Javert" and
  "Methods: always written beside it" was the first thing that answered her QA test.
- The undo screen for this task still shows a cleared selection on a different example; she
  left it without connecting it to filter steps.
