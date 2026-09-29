# Getting back after a wrong step -- Jordan, marketing network analyst

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were, without losing work you meant to keep."

**Set-up the participant did not see:** the graph (Les Miserables, 77 characters) had three filter
steps: keep the largest component, keep degree 5 and over, take out group 8. The middle step was the
mistake. A stray click had also cleared a hand-picked selection of 19 characters.

**Screens used:** the undo and ways-back mock (participant view), then the filter chip mock for
turning a single step off, because the checkboxes in the first mock do not respond.

**Renders read during the session** (all in `shots/`): `ses-getback-ma-study.png` (start),
`ses-getback-ma-study-s2.png` (one undo), `ses-getback-ma-study-s1-menu.png` (two undos, Edit menu
open), `ses-getback-ma-study-menu-hist.png` (Undo history open), `ses-getback-ma-study-pop.png`
(filter steps list), `ses-getback-ma-fc-three-bare.png` and `ses-getback-ma-fc-off-bare.png` (the
filter chip mock before and after turning the middle step off).

**Outcome:** reached the right end state (63 of 77 characters, the degree step off, the group 8
step still on, the 19 picked again), but only after throwing away the step she wanted to keep,
twice, and recovering with Redo.

---

## Think-aloud

**1. The start screen.**

> OK, so the numbers are off. Let me look. Top left says "Filtered: 28 of 77 nodes, 3 steps."
> 28? I thought I had way more than that. The statistics say 106 edges, density 0.280. I don't
> have those memorised, honestly. The table... Valjean 18, Fantine 12. And it says "Selected:
> none, showing the previous selection." Huh. Did I have something selected? Maybe. I don't
> really read the grey line.

She does not click the chip. Her first move is the keyboard.

> Whatever I did last, I'll just Cmd-Z it. That's what I do in everything.

**2. One undo** (Cmd+Z).

> Something happened -- the blue ones came back, down at the bottom. Marius, Gavroche. The chip
> says 41 now, 2 steps. No message, nothing saying what it undid. I think it undid the group
> thing? But I did want the group 8 people out, that was on purpose -- the barricade kids are
> noise for what I'm doing. So the thing I didn't want is further back. Again.

**3. Second undo** (Cmd+Z).

> Oh, no, no. Now everything's back. 76 of 77, "1 step." The hairball is back, the blue cluster is
> still there. So now I've lost the group one AND the one I didn't want. That's... that's worse
> than where I started.

She opens the menu at top left (three lines), goes to Edit.

> Edit. "Undo Filter to Largest component," "Redo Filter to degree >= 5." OK so it's a stack.
> It's one at a time, backwards. Fine, like Word. So I have to redo to get back. Cmd-Shift-Z,
> twice.

**4. Redo twice** (Cmd+Shift+Z, twice). Back at 28 of 77, 3 steps.

> OK, I'm back at square one. Which is the wrong place, but at least it's the wrong place I know.
> There's "Undo history" in that menu. That sounds like the thing. Let me look.

**5. Edit > Undo history.** It lists "Filter out group 8", "Filter to degree >= 5", "Filter to
Largest component".

> Right, there it is, degree >= 5, that's the one. I only ever do degree 2 or 3 on these, 5 is way
> too aggressive. Click it.

(Clicking an entry in this list reverses it and every newer entry.)

> ...And it's 76 again. It took the group one out too. That's the same thing as pressing undo
> twice! Then why is it a list? It looks like a list of my steps, you'd think you could pick one.
> That's two strikes for undo, I'm done with it.

She redoes twice again (Cmd+Shift+Z) to get back to 28.

> Honestly this is the stuff where I close it and redo it by hand in Gephi. Or I'd have just
> re-exported the file from Brandwatch -- well, if Brandwatch would give me the same export twice,
> which it won't, the counts change every time you pull it.

**6. The filter chip.** She clicks "Filtered: 28 of 77 nodes, 3 steps" by accident while moving
the mouse toward the panel.

> Oh. Oh, this is the list. "Filter to Largest component 76, Filter to degree >= 5 41, Filter out
> group 8 28." With checkboxes. And it tells me how many are left after each one -- that's actually
> useful, I can see the degree one is where I lost 35 people. Why didn't the undo stuff send me
> here? I just untick the middle one, surely.

In the undo mock the checkbox does nothing; she is moved to the filter chip mock at the same state.

> Untick "degree >= 5". It greys out with two dashes. Chip says "63 of 77 nodes, 2 of 3 steps."
> OK! Group 8 is still out, the degree one is off. That's what I wanted. And it kept the step so I
> can turn it back on at 3 or whatever. Good. That's the first thing today that did what I meant.

**7. Reading the result.**

> Wait. Statistics: components 4, isolated nodes 1. My first step literally says "Filter to Largest
> component", and it's ticked. How do I have four components? Is it broken? ... I guess it's
> because taking group 8 out after it breaks the thing apart again? It doesn't say that anywhere.
> I'd have to explain that to someone and I can't.

> Also -- hang on. Before I touched anything, on the other screen, with the same 28 people, the
> edges said 106 and density 0.280. This one, same 28, same three steps, says "105 of 254" and
> 0.278. And the barricade thing on the left said 13, here it says "0 of 13". Which one is right?
> This is exactly the dashboard-says-4,000-download-says-3,100 thing. If I put 106 on a slide and
> my colleague opens it and sees 105, I'm the one who looks wrong.

**8. The selection.** Back on the undo screen, she notices the grey line again.

> "Selected: none, showing the previous selection." And there's a "Previous selection" button next
> to it. So I did lose something. Click it.

(19 characters selected again; the table says "Selected: 19 of 28 nodes.")

> OK, 19 selected, Valjean and friends are back. That's nice, actually -- in Gephi if you
> click off it, it's gone, you start again. But I only found it because I was staring at the table
> for other reasons. If the table were collapsed I'd never have known it got cleared.

> (Aside) My VP reads the first slide and nothing else, so all of this is so I can put one number
> up there and not get asked where it came from. That's the whole job.

---

## After the task

**Single Ease Question: 4 of 7.**

> I got there, but I got there by accident. The keyboard way made it worse twice, and the thing
> that actually worked -- the list with the checkboxes -- I found by clicking the wrong thing.
> Middle of the road.

**Would she use this instead of her current tool?**

> Not for this reason, no. The step list with the counts after each step is genuinely better than
> what I have -- Gephi's filter panel doesn't show me where the people went. But undo is a trap if
> the mistake isn't the last thing you did, and "Undo history" looks like it'd fix that and it
> doesn't. And two screens gave me two different edge counts for the same thing, which is the one
> thing I can't have. If the numbers matched and undo pointed me at the list, maybe.

---

## Problems observed

1. **Undo is one step at a time from the end, and nothing says so until it is too late.** To reach
   the wrong middle step she pressed Undo twice and lost the step she meant to keep. The only
   feedback was the chip's count changing; no message named what was undone. Severity 3.
2. **Undo history looks like a step picker but is not one.** It lists the three filter steps by
   name; choosing the middle one also reversed the newer one. She expected it to remove only that
   step. This was her second failure and she gave up on undo. Severity 3.
3. **Nothing leads from undo to the filter steps list,** which is where a single step can be turned
   off. She found the list by accident. Severity 3.
4. **The same state shows different numbers on the two screens:** 106 edges and density 0.280 on
   one, "105 of 254" and 0.278 on the other; "The barricade" shows 13 on one and "0 of 13" on the
   other. For her this undermines every number. Severity 3.
5. **"Filter to Largest component" is ticked but the statistics show 4 components and 1 isolated
   node** once a later step splits the graph. Nothing explains that step order matters. Severity 2.
6. **The lost selection is announced only in a small grey line above the table.** The "Previous
   selection" button worked well once seen, but she noticed it late. Severity 2.
7. **The step checkboxes in the undo mock do not respond** (a mock gap, not a design fault; she was
   moved to the filter chip mock). Severity 1.
8. **Blank cells in the "full graph" column** where the value equals the filtered one read as
   missing data. Severity 1.
