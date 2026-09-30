# Get back to where you were -- Dana Okafor, supply chain risk analyst (Ctrl+Z restores the selection)

**Task as given:** "After your last few actions the numbers changed in a way you did not expect.
Get back to where you were."

**Condition:** in this version, when a click on empty canvas clears a selection, the line above the
toolbar says "Selection cleared (18 nodes)" with Bring it back, and the first Ctrl+Z brings the
selection back before it undoes any filter step. Redo is left as it was, and the line then reads
"Selection restored (18 nodes)".

**Page:** screens/undo.html, participant view. Sample data: Les Miserables co-appearances, 77
characters, narrowed by three filter steps. Dana had built the filters and a highlighted group of
18 characters around Valjean, then clicked on empty space.

**Result:** success, in five actions: Ctrl+Z, Ctrl+Z, Ctrl+Y, open the filter button, untick one
step. End state: 47 of 77 nodes, 2 of 3 steps on (the "at least 5" step off, the group 8 step on),
18 characters still highlighted. The selection came back first, before any filter change, so it
was never at risk.

## Transcript

**1. Where I start.** (shots/record/r6-dana-restorearm-s3.png)

> OK. The table still has Valjean, Fantine, Thenardier at the top, but the highlight is gone off
> the picture. There's a black box in the middle: "Selection cleared (18 nodes)", and a button,
> "Bring it back". Right, I clicked on the white space, that's on me. Every tool does that to you.
>
> And the numbers. Top left, "27 of 77 nodes, 3 steps". Twenty-seven? That's way fewer than I
> was working with. Something I did in the filter went too far.
>
> I'm not clicking a button in a pop-up, I'm doing what I do in Excel. Ctrl+Z.

**2. First Ctrl+Z.** (shots/record/r6-dana-restorearm-restore.png)

> Huh. The circles came back round the characters, the right side says "18 nodes" and the black
> box says "Selection restored (18 nodes)". The table says "Selected: 18 of 27 nodes".
>
> But 27 is still 27. So undo gave me the highlight, not the filter. For a second I thought it
> hadn't done anything to the thing I cared about. Then I read the box. Fine -- I did want those
> 18 back, and I'd have been annoyed if I'd lost them. It's one press. Again.

**3. Second Ctrl+Z.** (shots/record/r6-dana-restorearm-s2.png)

> Now 40 of 77, "2 of 3 steps". A whole blue clump just appeared at the bottom -- Marius,
> Gavroche, Enjolras. The box says "Undone: Filter out group 8".
>
> No, no. Group 8 out was on purpose, those are the students, I didn't want them in. That's not
> the one that went wrong. Good that it told me what it undid, I'd have just kept pressing
> otherwise and not known which one I'd thrown away.
>
> Put it back. Ctrl+Y, same as Excel.

**4. Ctrl+Y.**

> Back to 27 of 77, 3 steps, the blue clump gone. The box says "Redone: Filter out group 8" with
> "Show in steps". The highlight is still on. OK, so I'm where I was two minutes ago, which is
> not where I want to be. Undo is going to keep peeling things off the top, and the bad one is
> in the middle. I need to see the list.

**5. Opening the filter.** (shots/record/r6-dana-restorearm-restore-pop.png)

> That "27 of 77 nodes, 3 steps" thing at the top left has a little funnel and an arrow, it's
> the filter. Click.
>
> "Filter steps". Three rows with tick boxes:
> - Filter to degree >= 2, took out 17, 60 left
> - Filter to degree >= 5, took out 20, 40 left, "keeps only nodes with at least 5 neighbors
>   among the 60 it reads"
> - Filter out group 8, took out 13, 27 left
>
> "Degree". I don't use that word. The grey line under the second one says "at least 5
> neighbors", so degree is how many things it's connected to. Fine. The 5 is the problem -- I
> wanted at least 2, and then I went and added a second one at 5. That took out 20. That's my
> surprise.
>
> Can I take out just that one? There's a tick box. Untick it and see.

**6. Untick "degree >= 5".** (shots/record/r6-dana-restorearm-fix.png)

> 47 of 77, "2 of 3 steps". The row is still there, greyed, "off, takes nothing out". Good, I
> can put it back if I'm wrong, I don't have to rebuild it. Group 8 is still ticked, 13 out, 47
> left. The table says "Selected: 18 of 47 nodes", the highlight's still round Valjean's lot.
>
> That's where I was. Done.

**7. Checking the numbers before I trust them.**

> One thing. Valjean's number in the "degree, filtered" column was 17, then 21 when the students
> came back, now 27. The "full graph" column says 36 the whole time. So which one goes on my
> slide? I get it -- it's counting inside whatever's filtered -- but if I paste this table into a
> deck and someone re-runs it with a different filter, the number moves and I look like I don't
> know my own data. The grey header "full graph" is what tells me the 36 is the stable one, and
> it's the lightest text on the row.

## Afterwards

**Single Ease Question:** 6 of 7.

> It did what undo should do. The first Ctrl+Z giving me the highlight instead of the filter
> threw me for a second, but it said so, and it saved me something I'd have lost. What made it
> easy was the box naming the step it undid -- that's how I knew to stop and put it back. What
> made it not a 7: I had to work out that undo can't reach the one in the middle and go find the
> list myself, and "degree" means nothing to me without the grey line under it, which I nearly
> didn't read.

**Would you use this instead of your current tool?**

> Not because of this. Undo is table stakes, Excel has had it forever. But I'll give it this:
> in Power BI, if I mess up a filter in the filter pane my options are fix it by hand or hit
> "reset to default" and lose everything, including what I'd set up on purpose. Here I could
> switch off the one bad step and keep the rest, and it kept my highlighted group through all
> of it. That's better than what I have. It's still a side tool until IT signs it off and I can
> get the table into Power BI -- and this was a book about French revolutionaries, not my
> supplier list.

## What the moderator saw

- First reach: Ctrl+Z, by Excel habit, before reading past the first line of the notice. She never
  clicked Bring it back and never opened the menu.
- The first Ctrl+Z restoring the selection instead of a filter step was a brief surprise ("undo
  gave me the highlight, not the filter"); she resolved it by reading the line, and in hindsight
  counted it as a save.
- She read the line after the second Ctrl+Z, saw it named Filter out group 8, recognised that as
  work to keep, and redid it with Ctrl+Y.
- She found the steps list through the filter chip, not through Show in steps, and fixed the
  wrong step by unticking it. The selection survived the tick.
- End state matched the target exactly: 47 of 77 nodes, 2 of 3 steps, 18 selected.
- Vocabulary: "degree" in the step names and the table header was unknown to her; the grey
  explanatory line under the step rescued it. She flagged the low-contrast grey text more than
  once (presbyopia).
- Trust: the filtered degree column changing value (17, 21, 27) while "full graph" stays at 36
  made her ask which number is safe to put on a slide.
