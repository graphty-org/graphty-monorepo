# Session: turning off the wrong middle filter step -- Analyst Alex

Participant: Analyst Alex (operations data analyst, uses NetworkX and Gephi weekly).
Task as given by the moderator: "You filtered transfers in three steps and the middle one was
wrong. Get back to the result you had with only the right steps on."

Screens used, in order: Undo and ways back (the participant view, opening on three filter steps
already applied), then a look at the filter chip screen for comparison. Renders:
`shots/record/r3-alex-undomid-s3.png` (start), `shots/record/r3-alex-undomid-s3-pop.png` (steps list open),
`shots/record/r3-alex-undomid-off.png` (end state), `shots/record/screens__filter-chip-three--study.png`.

Outcome: success. One click to open the list of steps, one click to untick the middle step. The end
state reads 47 of 77 nodes, "2 of 3 steps". Nobody pressed Undo.

## Think-aloud transcript

**Start screen.**

> OK. This is Les Mis, not transfers, but whatever, I get the idea. So I've got... top left, under
> the name, "27 of 77 nodes, 3 steps". That's the thing. Three steps, the task says three steps.
> Good, I don't have to hunt.

> My first instinct is Ctrl+Z, honestly, because that's what I'd do in Excel. But no -- undo takes
> off the last thing I did, and the last thing is the one I wanted to keep. I'd have to undo two and
> redo one, and I never trust redo. So, no. I want to see the list of what I did.

> Before I click -- the table down here says "Selected: none, showing the previous selection". What
> selection? I didn't select anything. The task didn't say anything about selecting. So the table
> isn't showing me my filtered result? It's showing... a previous something. That's a bit off-putting.
> I'll leave it for now.

**Clicks the chip "27 of 77 nodes - 3 steps".**

> OK, a little dropdown, "Filter steps". Three rows with checkboxes. "Filter to degree >= 2, took
> out 17, 60 left." "Filter to degree >= 5, took out 20, 40 left." "Filter out group 8, took out 13,
> 27 left." Oh, that's nice actually. It tells me what each one cost. That's exactly the thing Gephi
> doesn't do -- in Gephi's filter tree you just get the final count and you're guessing which
> filter ate what.

> So the middle one, degree 5, is the wrong one. It took out 20, that's a lot. I'm just going to
> untick it. I'm not going to touch the three-dot menu, I don't know what's in there and it might
> be delete.

**Unticks "Filter to degree >= 5".**

> The chip now says "47 of 77 nodes, 2 of 3 steps". The row's greyed out and says "off". Group 8
> now says "took out 13, 47 left". So 60 minus 13 is 47. OK, that adds up. Good.

> Is that "the result I had"? I mean, I never had exactly this, I had it with the middle step in.
> But this is the first and the last step on, which is what was asked. I'm pretty confident that's
> it. The row is still there too, so if I'm wrong I just tick it back. That's the right way to do
> it.

**Looks at the canvas and the side panel.**

> More stuff on the picture now, makes sense, I loosened a filter. Statistics on the right: edges
> 142, components 3. Three? I had one before. There's a little pair of grey dots floating off on the
> right and one on its own. OK, I guess those are pieces that only hang together through the nodes
> the degree filter was keeping out... no, wait, turning a filter off should only add nodes. Adding
> nodes shouldn't split things. Hmm. Oh, no -- they're new nodes that aren't connected to the main
> blob. Fine. But I had to think about it, and I'd want to know who they are before this goes near a
> slide.

> And what colour are they? The legend says 4, 3, 2, 5 and "4 more". There are black ones up top and
> dark grey ones on the right. Which groups are those? "4 more" doesn't help me. I'd have to click
> it, I assume.

**Looks at the table.**

> Table: Valjean, degree filtered 27, full graph 36. Javert 15, 17. Fantine 15 and then -- nothing
> in the full graph column. Is that missing? Mme.Thenardier same, blank. I'm guessing blank means
> "same as filtered" but I'm guessing. In a spreadsheet a blank cell is a missing value. If I export
> this and send it, somebody's going to ask me why Fantine has no full-graph degree.

> And it still says "Selected: none, showing the previous selection" up top. So is this list the 47
> or not? There's a "Show filtered graph" button. I suppose I'd click that to actually see my 47. Why
> isn't that the default when nothing's selected?

**Opens the filter chip screen for comparison.**

> This version of the dropdown has an X to close it, and under the degree 5 step it says "keeps only
> nodes with at least 5 neighbors among the 60 it reads". That's useful -- that tells me it's counted
> on what's left, not on the whole graph, which is exactly the kind of thing that bites me. The other
> screen didn't say that. The table here says "Filtered graph: 27 of 77 nodes" and the column is
> "degree on: full graph", filled in for every row. This one's clearer. The side panel has "isolated
> nodes" and "largest component" too, that's what I check against SQL. Also the left rail says
> "Assistant: Off. Nothing is sent." -- I like seeing that.

> Also, a small thing, there are pink dashed boxes around a bunch of buttons on the first screen. Is
> that a bug? It looks like something's selected or broken.

## After the task

**Single Ease Question: 6 of 7.**

> The actual fix was two clicks and the numbers told me it worked. I'd give it a 7 if the table had
> shown my filtered result instead of some "previous selection", and if the blank cells weren't
> blank. What took longest was me staring at the table trying to work out what it was showing me,
> not the filtering.

**Would he use this instead of his current tool?**

> For the filtering part, yes, over Gephi. Being able to switch one step off in the middle without
> rebuilding the whole filter chain, and seeing what each step took out -- that's better than Gephi's
> filter panel, where I've literally rebuilt the whole query because I dragged something in the wrong
> order. I'd still compute the metrics in Python until I've checked the numbers match. And I'd need
> the blank cells gone before I'd export anything from that table.

## Problems observed

1. The table opens on "Selected: none, showing the previous selection" when the participant has
   selected nothing; he could not tell whether the table showed his filtered result. (Severity 2)
2. The "full graph" degree column is blank where it equals the filtered degree; he read blank as
   missing data and worried about exporting it. (Severity 2)
3. After turning the step off, the legend hides four groups behind "4 more" while black and dark
   grey nodes appear on the canvas, and the component count jumps from 1 to 3 with no word about the
   new stray nodes; he had to reason it out. (Severity 2)
4. The steps list on this screen gives no plain description of what a step keeps; the filter chip
   screen does ("keeps only nodes with at least 5 neighbors among the 60 it reads"), and he found
   that clearer. (Severity 1)
5. Dashed pink outlines are visible in the participant view around several controls; he asked
   whether something was broken. (Severity 1)
6. He avoided Undo on purpose, reasoning that it would remove the last (good) step first. The
   design's undo behaviour was never exercised; a less wary user who pressed Undo twice would still
   need the list to recover. (Observation, Severity 1)

## What worked

- The chip reads "3 steps", which matched the task's wording, so he found the entry point at once.
- "took out N - M left" on every row let him check the arithmetic (60 - 13 = 47) and trust the fix.
- Unticking keeps the row, so he felt safe: "if I'm wrong I just tick it back".
