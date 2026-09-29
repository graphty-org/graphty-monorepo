# Fix the wrong middle filter step -- Analyst Alex

**Task as given:** "You narrowed the graph in three steps and the middle one was wrong. Fix it
without losing the third."

**Participant:** Analyst Alex, operations data analyst (NetworkX in Jupyter, pictures in Gephi).

**Dataset:** Les Miserables co-appearances, 77 characters. The three steps already applied:
keep degree >= 2, keep degree >= 5, drop group 8.

**Screens he saw** (rendered as a participant sees them, design notes hidden):

- `shots/tasks/fix-wrong-middle-step/01-undo.png`: the app with three steps on and a "Selection
  cleared" notice
- `shots/tasks/fix-wrong-middle-step/02-filter-chip.png`: the filter chip opened, three steps
- `shots/r6-alex-fixmid-chip-off.png`: the middle step unticked
- `shots/r6-alex-fixmid-chip-edit.png`: the middle step open for editing
- `shots/r6-alex-fixmid-undo-off.png` and `shots/r6-alex-fixmid-undo-list.png`: Edit menu, Undo
  history, after the fix and after two plain undos
- `shots/r6-alex-fixmid-steps-undo.png`: the filter steps and undo page
- `shots/r6-alex-fixmid-recovery-full.png`: the "three ways back" page, a different three-step
  example

**Outcome:** success. He turned the middle step off, checked that the third was still on, and then
went looking for "edit" rather than "off". About two minutes, mostly spent checking numbers.

**Single Ease Question:** 6 of 7.

---

## Think-aloud

### 1. First look

> OK. Three steps, the middle one is wrong. First thing -- where are my steps? Top left there's a
> box that says "27 of 77 nodes, 3 steps", with a little funnel. That's the filter. Good, it's
> where the project name is, so I can't miss that it's on. In Gephi half the time I forget a filter
> is on and quote the wrong number.
>
> There's a black toast in the middle, "Selection cleared (18 nodes) -- Bring it back". I didn't
> clear anything. Well, whatever, not my problem right now. Ignoring it.
>
> The right-hand panel says "On: filtered graph, 27 of 77 nodes", edges 104. Fine. Density 0.296.
> Someone else can care about density.

### 2. Opening the steps

> Clicking the chip. It drops open a little "Filter steps" panel:
>
> - Filter to degree >= 2 -- took out 17, 60 left
> - Filter to degree >= 5 -- took out 20, 40 left, "keeps only nodes with at least 5 neighbors
>   among the 60 it reads"
> - Filter out group 8 -- took out 13, 27 left
>
> OK, this I like. It's a waterfall. 77, minus 17 is 60, minus 20 is 40, minus 13 is 27. The
> numbers add up, I checked. That's the bit I'd have to write in a notebook cell otherwise.
>
> Hang on, "at least 5 neighbors among the 60 it reads". So degree here isn't the degree from my
> data, it's degree after step one threw people out? That's... actually I'm not sure that's what I'd
> expect. In NetworkX I'd compute degree once on the whole graph and filter the dataframe. Here
> "degree >= 5" means something different depending on what's above it. I'd want to know that
> before I put "characters with degree 5 or more" in a slide. At least it tells me, in grey, under
> the step. I nearly skimmed past it.
>
> And the chip said "nodes" on the first screen and now it says "27 of 77 characters". Same thing?
> I assume the same thing. Pick one.

### 3. Fixing it -- first try, the checkbox

> Each step has a tick box. I'll untick the middle one. That's the obvious move.
>
> Now:
>
> - degree >= 2 -- took out 17, 60 left
> - degree >= 5 -- greyed out, "off, takes nothing out"
> - Filter out group 8 -- still ticked, "took out 13, 47 left"
>
> Chip says "47 of 77, 2 of 3 steps". Good -- it says two of three are on, so if I send this to
> someone they can see a step is parked, not gone.
>
> The third step is still there and still ticked, so I haven't lost it. It recounted: 60 in, 13
> out, 47 left. Wait, it took out 13 both times? Before it was 40 minus 13 and now it's 60 minus 13.
> Let me check... the legend earlier had group 8 at 13 people. So all of group 8 had degree 5 or
> more anyway. OK, that checks out. I'd have been suspicious if it hadn't.
>
> The right panel now says components 3, "up from 1 when 'Filter to degree >= 5' was turned off",
> largest component 44 "up from 27". That's actually useful. Gephi just changes the number and
> you go "was it this before?" Here it tells me what moved it. Though the panel is very wordy --
> every single line says "of the filtered graph (47 of 77 characters)". I got it the first time.
>
> The picture has a couple of loose grey nodes and a little black pair floating off now. Fine, that
> matches "3 components".

### 4. But was "off" the fix?

> Thing is, "the middle one was wrong" -- does wrong mean I shouldn't have done it at all, or I
> used the wrong number? Honestly, usually it's the number. I put 5 and meant 3.
>
> So I want to edit it, not kill it. Clicking the words "degree >= 5"... single click just
> highlights the row. Hm. I'd expect a pencil or something. There's no visible edit button. If I
> hover the row a "..." appears on the right, I'm told -- I didn't see it until the mouse was on
> it. In the menu: "Edit step...", "Turn off step", "Move up", "Move down", "Create rule set from
> step", "Delete step". Double-click also opens it, apparently. I wouldn't have tried
> double-click on a list row in a browser. "Create rule set" -- no idea what that is, not
> touching it.
>
> The edit view: "Step 2: Filter to degree >= 5". Filter to / Filter out buttons, then a dropdown
> "degree", ">=", and a box with 5. "Scope: After step 1: 60 characters." "Result: took out 20, 40
> left." Nice that it tells me what it's working on. I change 5 to 3.
>
> There's no Apply or OK button. So... is it applied? I assume it's live, because the result line
> is right there. I'd type 3 and watch "took out" change. If it changes, I trust it. If I have to
> hunt for a Save I'll be annoyed. Then back arrow to the list, and step 3 should still be there
> below it. It is.

### 5. What if I'd just hit Ctrl+Z

> My reflex, honestly, would have been Ctrl+Z. Let me see what that does. Edit menu, Undo history:
> "Turn off step Filter to degree >= 5", "Filter out group 8", "Filter to degree >= 5", "Filter to
> degree >= 2". So the untick is in the undo list -- good, I can take it back.
>
> And if I'd undone twice instead, the list shows "Redo Filter out group 8" -- so undoing my way
> back to the middle step pops the third step off the top. That's exactly the "losing the third"
> thing. At least it's in Redo and not gone. But the steps panel is clearly the right way, and the
> undo list sort of shows me why.
>
> The other page, the "three ways back" one, has a different example -- "not Valjean, largest
> component, not Javert". When the middle step goes, the betweenness column header says "on 60 of
> 77" with a Re-run button. OK -- that's the thing I actually worry about. My numbers were computed
> on the old filter and it tells me they're stale instead of quietly keeping them. That's the kind
> of thing that ends up in a report wrong. Good.
>
> But that page's steps panel looks different from the one I just used -- it shows "76, 61, 60" as
> bare numbers on the right, no "took out". And the filter-and-undo page has "60, 40, 27" plus a
> "Create rule set" link in the header. Three versions of the same panel. Which one is the real
> one? The "took out 17, 60 left" one is the best -- keep that.

### 6. Where the table confused me

> In the undo screen the table has "degree, filtered" and "full graph" columns, and some of the
> full-graph cells are just blank -- Fantine has 15 filtered and nothing under full graph. I read
> that as missing data. I guess blank means "same as filtered"? Don't do that. In a table I'm
> going to paste into Excel, a blank is a blank. The filter-chip screen fills both columns in,
> which is what I want.

---

## Single Ease Question

**6 of 7.**

> The actual fix was one click on a tick box, and it told me the third step was still on and what
> it took out now. That's easier than Gephi, where the filters are nested and taking one out of the
> middle means dragging the query apart. I'm not giving it 7 because editing the step was hidden
> behind a hover menu or a double-click, there's no Apply so I'm not sure when it's committed, and
> "degree" quietly means "degree after the steps above" -- which I'd have got wrong in a slide.

## Would he use this instead of his current tool?

> For this bit -- building up a filter and fixing one step -- yes, I'd rather do it here than in
> Gephi. The running "took out X, Y left" is basically the sanity check I do in pandas anyway, and
> the stale-betweenness warning is the thing that saves me. Instead of Python for the maths, no, not
> on this alone; I'd still compute the numbers in NetworkX and compare. And the "Nothing has been
> sent from this project" line is the first thing I'd have to screenshot for my manager before
> any of this matters.

---

## Problems he hit

1. **Degree in a later step is counted on the already-filtered graph, and it is easy to miss.**
   The grey note under step 2 ("at least 5 neighbors among the 60 it reads") is the only place
   this is said. He expected degree to come from the full data, as in NetworkX. Severity 3.
   > "So degree here isn't the degree from my data, it's degree after step one threw people out?"
2. **No visible way to edit a step.** A single click only highlights the row; the "..." appears
   only on hover and the editor also opens on a double-click he would not try. Severity 3.
   > "I'd expect a pencil or something. There's no visible edit button."
3. **The step editor has no Apply or Done button**, so he is not sure when a change is committed.
   Severity 2.
   > "There's no Apply or OK button. So... is it applied?"
4. **The filter steps panel looks different on three screens:** "took out 17, 60 left" on the
   filter chip screen, bare "60 / 40 / 27" with "Create rule set" on the steps-and-undo screen,
   bare "76 / 61 / 60" on the three-ways-back screen. Severity 2.
   > "Three versions of the same panel. Which one is the real one?"
5. **Blank cells in the "full graph" column** of the undo screen's table, where the value equals
   the filtered one, read as missing data. Severity 2.
   > "In a table I'm going to paste into Excel, a blank is a blank."
6. **"nodes" and "characters" used for the same count** on the chip of two screens. Severity 1.
   > "Same thing? I assume the same thing. Pick one."
7. **The Statistics panel repeats "of the filtered graph (47 of 77 characters)" on every line.**
   Severity 1.
   > "I got it the first time."
8. **"Create rule set from step" is jargon he would not click.** Severity 1.
9. **An unrelated "Selection cleared (18 nodes)" notice** was on screen when the task started.
   Severity 1.
   > "I didn't clear anything."

## What he liked

- The running waterfall under each step ("took out 17, 60 left"): he checked the arithmetic and
  it matched.
- After the untick, the chip said "2 of 3 steps", and step 3 stayed ticked and recounted itself.
- The Statistics panel said what moved a number ("up from 1 when 'Filter to degree >= 5' was turned
  off").
- The untick is an entry in Undo history, and the two-undo path shows "Redo Filter out group 8",
  so he could see why plain undo would have lost the third step.
- A measure computed before the change is marked "on 60 of 77" with a Re-run button, not silently
  kept.
