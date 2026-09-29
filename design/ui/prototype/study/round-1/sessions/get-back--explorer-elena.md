# Getting back after a wrong filter -- Explorer Elena

**Participant.** Explorer Elena: a product manager with no graph training who opens relationship
data now and then because she is curious. She lives in Google Sheets, Slides and a product
analytics dashboard. She says "dots" and "lines", not nodes and edges.

**Task, as the moderator gave it.** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were, without losing work you meant to keep."

**What was planted, known to the moderator only.** The character graph from Les Miserables (77
characters) has been narrowed in three filter steps: keep the largest connected piece, keep
characters with at least 5 connections, remove group 8. The middle step (at least 5 connections)
is the mistake; the first and third steps are work to keep. A stray click on the canvas has also
cleared a hand-picked selection of 19 characters.

**Screens.** The undo screen in its participant view (no facilitator bar, no notes), then the
filter chip screen in its participant view. Where the undo screen does not respond to a click, it
is noted as a limit of the mock, not of the design.

---

## 1. The starting screen (undo screen)

> Okay. So this is my Les Mis thing. Top left says "Filtered: 28 of 77 nodes, 3 steps". Nodes --
> that's the dots, I think. So I'm looking at 28 of my 77 characters. That already feels low. I
> had more than that, I'm pretty sure.

> The table at the bottom says "Selected: none, showing the previous selection". Huh. I didn't
> un-select anything on purpose. And there are two little text buttons, "Previous selection" and
> "Show filtered graph". I'll come back to that. First the numbers.

> The moderator said the numbers changed in a way I didn't expect. Honestly, anything I do in a
> browser that goes wrong, I hit Ctrl+Z. That's what I'd do in Sheets.

**She presses Ctrl+Z once.**

> The chip now says 41 of 77, 2 steps. Okay, more dots came back -- this whole light blue clump
> at the bottom, Marius, Gavroche, Enjolras. Wait. Those are the barricade kids. I took those out
> on purpose, that was the whole point, I wanted to see the story without the student group. So
> undo took back the wrong thing.

> Nothing popped up to tell me what it undid. I only know because the blue clump came back and
> the number went from 28 to 41. I guess that's fine, it's obvious enough, but I had to compare
> in my head.

**Moderator note.** The undo screen as a participant sees it raises no notice when the left panel
is open; the chip count and the drawing are the only feedback. She did read the change from the
chip and the drawing.

> So the thing I actually got wrong must be further back. Do I press Ctrl+Z again? That would
> undo... the step before, which would also be wrong-ish? I don't know which one is wrong yet. I
> don't want to keep blindly undoing, I'll lose everything.

**She presses Ctrl+Y.**

> Ctrl+Y is redo in Sheets.

Nothing happens (the screen only knows Ctrl+Shift+Z).

> Nothing. Hm. Okay, Ctrl+Shift+Z, that's the Mac-ish one.

**She presses Ctrl+Shift+Z.** Back to 28 of 77, 3 steps; the blue clump is gone again.

> Good, at least I'm back where I started. That's a relief. I was worried redo wouldn't exist.

## 2. Looking for what the three steps are

> "3 steps". What steps? I click the chip.

**She clicks the chip.** A small panel titled "Filter steps" opens:

- Filter to Largest component -- 76
- Filter to degree >= 5 -- 41
- Filter out group 8 -- 28

> Oh, this is nice, it's like a little recipe. Each step and how many are left after it. So
> "largest component" took me from 77 to 76 -- one dot gone, fine, whatever that was. Then
> "degree >= 5" took me from 76 to 41. That's a big chop, 35 characters. Then group 8 took me
> to 28. Group 8 I meant. So "degree >= 5" is the one I didn't mean. I'm not totally sure what
> degree is -- connections? -- but that's the step that ate half my characters.

> Each one has a checkbox. So I'd just untick the middle one.

**She clicks the checkbox on "Filter to degree >= 5".** In the undo screen nothing happens (a limit
of this mock; the checkboxes are drawn but not wired).

> ...Nothing. Is it greyed out? It looks ticked, it looks clickable. Okay, that's annoying.

**Moderator note.** Recorded as a mock limitation. Had it not been, she would have been done at
this point; see section 4.

## 3. Trying the menus, because the checkbox did nothing

> Maybe there's an Edit menu. There's the three lines in the top left.

**She opens the main menu, then Edit.** She reads: "Undo Filter out group 8 -- Ctrl+Z", "Redo",
"Undo history >", "Select all", "Previous selection -- Ctrl+Alt+Z", "Copy ids".

> "Undo Filter out group 8". Okay, so that's what Ctrl+Z did before -- I like that it tells me
> the name. Would've been nice to see that before I pressed it.

> "Undo history". Let me look.

**She opens Undo history.** Three lines: Filter out group 8, Filter to degree >= 5, Filter to
Largest component.

> Oh, here's the degree one. So I just click "Filter to degree >= 5" and it undoes that?

She hovers, about to click.

> Wait. Does it undo only that one, or that one and everything after? It doesn't say. In Google
> Docs version history, when you go back, you go back to that point, everything after is gone.
> If that's how this works, it'll bring back the barricade kids again. I don't trust it.

**She does not click.** She closes the menu.

**Moderator note.** Her reading is correct: choosing a line in Undo history reverses it and every
newer step, so it would have removed "Filter out group 8" too. The menu gives no hint of this.
She guessed it from Google Docs, not from the screen.

> So undo can't do it. The only thing that looks like it can is that checkbox list, and it
> didn't work. If this were real I'd probably now just start over -- delete the steps, redo the
> group 8 one. Which is fine, it's three steps. But if it were ten steps I'd be annoyed.

## 4. The filter chip screen (the steps list working)

The moderator moves her to the second screen, the same graph with the same three steps and the
steps panel open.

> Same list. Let me try the checkbox again.

**She unticks "Filter to degree >= 5".** The chip now reads "63 of 77 nodes, 2 of 3 steps". The
middle row greys out and its count becomes "--". The group 8 row says 63.

> There we go. 63. And group 8 is still ticked, so the barricade kids are still out -- yep, no
> light blue in the legend. That's what I wanted. And the step is still there, just off, so if
> I change my mind I tick it again. I like that a lot. That's how a filter should work, it's like
> the filter dropdowns in Sheets where you tick and untick.

> "2 of 3 steps" -- that's clear. The chip being blue-ish and saying the number, yeah, I'd see
> that.

Then she looks at the drawing.

> Hm. But now there are a bunch of dots floating off on their own -- some little black ones up
> top, two little pairs on the right, one by itself near the bottom. The first step said
> "Largest component". I thought that meant "only the big connected bunch". So why are there
> loose bits? Did it break?

> And the black ones -- what are black dots? The legend says 2, 4, 3, 5, 1 and "4 more". So black
> is one of the "more"? I'd have to click to find out, and I wouldn't bother.

**Moderator note.** The largest-component step ran first, on the full graph; removing group 8
afterwards cut some characters loose from the main bunch. The right panel shows "components 4,
isolated nodes 1", which she did not read. No warning glyph appeared on the group 8 step, because
the warning only covers steps that read connections. From her seat, the first step's name now
describes something the picture does not show.

> I'm not going to worry about it. I got the number I expected-ish. But if I were showing this
> to my boss and she said "why is that dot floating there if you said largest", I'd have no idea.

> Also the table on the right, "degree" for Valjean went from 18 to 32 when I unticked. And the
> other column, "degree on: full graph", 36. So which is his real number? I think I get it --
> it's counting only who's on screen -- but a normal person would ask "why does Valjean have
> three different numbers today".

## 5. The lost selection

The moderator reminds her of the rest of the task ("without losing work you meant to keep") and
returns her to the first screen.

> Oh, right, the "Selected: none, showing the previous selection" thing. I did have some
> characters picked, I think. There's a "Previous selection" button right there. I'll click it.

**She clicks "Previous selection" in the table.** 19 characters are selected again; the table
says "Selected: 19 of 28 nodes".

> Oh good, they came back. That was easy -- but only because the button was sitting right under
> my nose. If the table had been on something else I would never have known I lost them. I didn't
> see anything happen when I lost them, I just noticed the words.

> I wouldn't have found Ctrl+Alt+Z in a million years. It's in the Edit menu, fine, but no one
> reads shortcuts.

---

## After the task

**Single Ease Question (1 = very hard, 7 = very easy): 4.**

> Middle. Once I found the ticked list it was a 6 -- untick, done, and it kept the rest. But
> my instinct was Ctrl+Z, and Ctrl+Z undid the wrong thing, and the undo history looked like it
> would undo the wrong thing too. And the floating dots after I fixed it made me doubt I fixed
> it.

**Would she use this instead of her current tool?**

> My current tool for this is nothing -- a pivot table and a lot of squinting, or asking someone
> in data. So, yes, I'd use it for poking around. The ticking-steps-on-and-off list is the part
> that would sell me; I'd tell people "you can switch filters on and off and see the count." But
> I'd want it to be the first thing I see when the numbers go weird, not something I find after
> undo bites me. And "Largest component" should either stay largest or tell me why it isn't. If
> I put this on a slide with loose dots and someone asks, I look like I don't know my own chart.

## Problems seen

1. **Undo only peels from the top.** With the wrong step in the middle, her first move (Ctrl+Z)
   reversed the step she wanted to keep. Frustration: moderate (3).
2. **Undo history does not say it takes every newer step with it.** She guessed it from Google
   Docs and backed off; a less wary user would have lost the group 8 step. Frustration: 3.
3. **The screen does not point from "numbers look wrong" to the steps list.** She reached the
   list only after undo failed. The chip is where the answer is, but nothing sends her there.
   Frustration: 2.
4. **After turning the middle step off, "Largest component" no longer describes the picture.**
   Loose dots appear with no explanation on the step that caused them. Frustration: 3.
5. **The same character shows several degree numbers.** "degree" and "degree on: full graph"
   read as two answers to one question. Frustration: 2.
6. **Losing a selection is silent.** She found "Previous selection" only because the table's
   scope line happened to show it. Frustration: 2.
7. **Ctrl+Y does nothing.** Her Sheets redo key is ignored; she found Ctrl+Shift+Z by guessing.
   Frustration: 2.
8. **Unexplained black dots in the legend's "4 more".** Frustration: 1.

Mock limitation, not a design problem: the steps list checkboxes on the undo screen are drawn but
do not respond.
