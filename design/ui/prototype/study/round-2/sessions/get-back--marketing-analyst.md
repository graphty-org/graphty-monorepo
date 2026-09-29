# Getting back after an unexpected change -- Jordan, marketing network analyst

**Participant:** Jordan, growth-marketing analyst who does "the network stuff" one or two days a
week; Gephi, NodeXL and a colleague's notebook today. MacBook, laptop width (1440 by 900).

**Task as given:** "After your last few actions the numbers changed in a way you did not expect.
Get back to where you were, without losing work you meant to keep."

**What was on screen at the start:** the Les Miserables graph filtered in three steps (keep the
largest connected piece, keep characters with at least 5 connections, leave out group 8). The
middle step was the mistake. A click on empty canvas had also just cleared a selection of 19
characters. Undo version A: no message when an undo reverses a filter step while the left panel
is open.

**Pages used:** the undo mock in participant view (screens/undo.html#study), and the filter chip
mock (screens/filter-chip.html) for comparison. Renders read: shots/getback-ma-*.png and
shots/screens__filter-chip.png.

**Result:** reached the right end state -- 63 of 77 nodes, "2 of 3 steps", the degree step off,
group 8 still out, the 19 characters selected again -- but only after undoing the good step, then
the bad one, then redoing both. Success with difficulty. Single Ease Question: 4 of 7.

---

## Transcript (thinking aloud)

**1. Looking at the start screen.**

> "OK. Les Mis, the demo one. Where are the numbers... top left says 'Filtered: 28 of 77 nodes,
> 3 steps'. Right side, edges 106, one component. The table says 'Selected: none, showing the
> previous selection'. Hm. 'Showing the previous selection' -- showing it where? Nothing's
> highlighted on the map. So something got unselected. And 28 out of 77, that feels low, I don't
> remember cutting it down to a third."

She does not remember exactly what the three steps were. She reads the table first, as she always
does: Valjean 18, then a grey 36 in a column called "full graph".

> "Valjean 18. Why 18? I'm pretty sure he had way more connections than that. Oh -- 'degree,
> filtered' and then 'full graph' 36. OK, so it's counting only what's left. That's the thing that
> changed, probably."

**2. First reflex: Cmd+Z.**

> "Whatever I did last, undo it. Cmd+Z."

The chip goes to 41 of 77, 2 steps. A light-blue clump comes back at the bottom -- Marius,
Enjolras, Gavroche, Courfeyrac. Valjean's filtered degree goes 18 to 22. No message anywhere.

> "OK, more nodes, that's... better? I think? The blue group came back. Wait, I didn't want the
> blue group, those are the students, I took them out on purpose because they're their own little
> world and they wreck the ranking. Did it just undo the wrong thing?"

She looks at the canvas, not the chip, to see what happened. The chip changed from "28" to "41"
and "3 steps" to "2 steps" in small grey text in the corner; she only noticed it on the second look.

> "It would have been nice if it just told me what it undid. Excel doesn't either, to be fair. But
> Excel I can see the cell change. Here I'm eyeballing a hairball."

**3. Second Cmd+Z, because the numbers are still "wrong".**

> "It's still not what I had. Maybe one more."

The chip goes to 76 of 77, 1 step. The full hairball is back: little black and blue satellites all
over the place, Valjean at 36.

> "Nope. No. That's everything. I've gone too far. This is exactly the hairball I was filtering
> away."

**4. Clicking the chip to see what's going on.**

She clicks "Filtered: 76 of 77 nodes, 1 step" because it is the only thing that mentions filters.
A small panel opens: "Filter steps -- Filter to Largest component, 76", and "Add step".

> "Where are the other two? There's only one step in here. Did undo delete them? Great. So my
> filters are just gone."

This is the worst moment of the session. She does not know undo steps can come back.

**5. The Edit menu.**

> "Is there an edit menu? The three lines, top left." She opens the menu, goes to Edit.

The menu reads "Undo Filter to Largest component" and "Redo Filter to degree >= 5".

> "Oh -- Redo. Degree greater or equal to 5. Wait. That's the one. I didn't mean to keep only
> characters with 5-plus connections. That's what knocked Valjean down to 18 and threw out half the
> minor characters. That was the mistake, not the students."

> "OK so how do I get the students-out thing back but not the degree thing? Redo only shows me the
> next one. Is the group 8 one still in there somewhere or did I lose it when I undid twice?"

She hovers "Undo history". It only lists undo entries ("Filter to Largest component, Undo back to
here (1 step)"), nothing about what redo holds.

> "History only goes backwards. It doesn't tell me what's waiting to redo. I'm going to trust it and
> redo twice and hope."

**6. Redo twice.**

She clicks Redo in the Edit menu, then presses Cmd+Shift+Z for the second one, after reading the
shortcut next to Redo. The chip goes back to 28 of 77, 3 steps. The students are gone again.

> "OK, phew. Back to the broken version, but at least nothing's lost. That's where I started, and
> I've just wasted four clicks."

**7. Turning off the wrong step.**

She clicks the chip again. Now three rows, each with a checkbox and a number: Largest component
76, degree >= 5 41, group 8 28.

> "Oh, this is nice actually. Each one says how many are left after it. 76, 41, 28. So the degree
> one is what took me from 76 to 41 -- that's the big drop. Can I just untick it?"

She unticks "Filter to degree >= 5". Its count turns into "--", the group 8 row changes to 63, the
chip reads "63 of 77 nodes, 2 of 3 steps". The map gets the small outlying characters back, the
students stay out. Statistics now say 4 components.

> "63. That's more like it. The students are still out. Four components -- fine, those are the
> little pairs floating on their own, I'd probably cut those anyway. And the step's still there,
> unticked, so if my manager asks 'what about only well-connected people' I can flip it back on.
> That's better than Gephi, where I'd be rebuilding the query from the filter tree."

> "Why didn't I just do this first? Because I didn't know the little chip opens anything. It looks
> like a label. It's the size of a tag on a price."

**8. The selection.**

> "Now the other thing: 'Selected: none, showing the previous selection'. I had Valjean and his
> people selected -- I remember doing that one by one, that took ages. There's a 'Previous
> selection' button right there. That sounds like exactly what I want."

She clicks "Previous selection". Nineteen rows highlight, the ring outlines come back on the map,
the table line changes to "Selected: 19 of 63 nodes. Sorted by degree." The right panel shows
"19 nodes" with a breakdown by group.

> "Good. 19, that's the Valjean bunch. And it didn't mess with the filters. Honestly that one I'd
> never have found by the keyboard -- the menu says Ctrl+Alt+Z, I'm not remembering that."

**9. The sanity check.**

She does what she always does: looks for a number she knows.

> "Valjean 32 filtered, 36 full graph. OK, makes sense, four of his people are students. Javert 15
> and 17. Fantine 15 and... blank? Why is Fantine's 'full graph' empty? Myriel's too. Is that zero?
> Is it missing? If I copy this into a sheet, is that a blank cell?"

The blank means "same as filtered", but nothing says so.

> "I don't like blanks in a number column. My VP sees a blank and asks if the data's broken."

**10. Comparing with the other filter chip page.**

She is shown the filter chip page with the same three steps on.

> "Same 28 nodes. This one says edges '105 of 254', density 0.278. The other one said edges 106,
> density 0.280. Which is it? This is my whole problem with Talkwalker -- the dashboard says one
> thing and the download says another. If two screens in the same tool disagree by one edge, I'm
> going to spend a morning figuring out which one to put in the deck."

> "And this line under the degree step, '3 dropped below degree 5 by Filter out group = 8' --
> I read it three times. The degree step is before the group step. How does a later step drop
> people in an earlier one? I'd just skip that line."

> "This one also has the column called 'degree on: full graph' with every number filled in. That
> I like better than the blanks."

**Aside (off-topic):**

> "The honest truth is half of this is me being scared of losing a selection I built by hand,
> because Brandwatch doesn't let you save one either, and the VP only reads the first slide anyway.
> If this thing just remembered my selections and my filters by name, I wouldn't need undo half as
> much."

---

## After the task

**Single Ease Question (1 very hard -- 7 very easy):** 4.

> "I got there, but I got there by breaking it more first. The undo took out the thing I wanted to
> keep, then the thing I wanted to lose, and then I had to redo both and go into the little
> filter list anyway. The list is the actual answer -- the ticks and the counts per step are good.
> I just didn't know it was there, and undo didn't point me at it."

**Would she use this instead of her current tool?**

> "For filtering, over Gephi? Probably, yes -- the step list with the count after each step is
> clearer than Gephi's filter tree, and being able to switch one step off without deleting it is
> the thing I actually want. Would I switch my whole workflow for it? Not on this. Undo that quietly
> eats my good step is the kind of thing that makes me distrust the numbers, and if the edge count
> doesn't even match between two screens I'm going straight back to checking everything in Excel.
> Fix the numbers and tell me what undo just did, and I'd give it a real afternoon."

---

## Problems observed

1. **Undo reversed the step she wanted to keep, and said nothing.** The first Cmd+Z took out
   "Filter out group 8"; the only feedback was the small chip changing 28 to 41 and a cluster
   reappearing. She pressed undo again before understanding what had happened. Severity 3.
2. **After two undos the filter list shows one step; the others look deleted.** Opening the chip at
   "76 of 77, 1 step" showed a single row, with no hint the other two could be redone. This was the
   moment she thought she had lost work. Severity 3.
3. **Redo shows only the next step.** The Edit menu names one redo, and Undo history lists only
   the undo side, so she could not tell whether "Filter out group 8" was still recoverable; she
   redid twice on faith. Severity 2.
4. **The filter chip does not look clickable.** It reads as a status label; she found the steps
   list only after going through undo and the menu. Once open, the list solved the task in one
   click. Severity 3.
5. **Blank cells in the "full graph" column.** Rows where the full-graph degree equals the filtered
   one are blank, with no explanation; she read them as missing data. Severity 2.
6. **Two screens give different numbers for the same filter.** At 28 of 77 nodes the undo page
   says 106 edges, density 0.280; the filter chip page says 105 of 254, density 0.278. For a user
   who already distrusts vendor numbers, this is enough to stop trusting both. Severity 3.
7. **"3 dropped below degree 5 by Filter out group = 8" is unreadable to her.** A later step
   explained as affecting an earlier one; she skipped it. Severity 1.
8. **"Selected: none, showing the previous selection" is confusing wording,** though the "Previous
   selection" button next to it worked first time. Severity 1.
