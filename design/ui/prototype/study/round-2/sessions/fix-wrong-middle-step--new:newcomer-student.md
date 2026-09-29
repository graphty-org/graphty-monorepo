# Session: "Fix the wrong middle step" -- newcomer student

**Task given by the moderator:** "Of three filter steps, the second removed the wrong group. Fix
it without losing the third."

**Screens used:** the graph window after three filter steps (the undo screen, participant view,
version A: no notice when the filter chip is in view), then the filter chip's steps list (the
filter chip screen).

**Facilitator note:** the persona file for this participant was not in the personas folder when
the session ran. The participant was played as a composite built from the study's own notes about
newcomers (legends and statistics use words newcomers cannot read; the first picture is a mess)
and from what students in introductory network-analysis courses write in course forums and
Gephi help threads (the filter panel "does nothing", Ctrl+Z "does not work in Gephi", "I lost my
whole filter and had to start over"). The composite: Sam, 20, a second-year sociology
undergraduate in an elective on social network analysis. Sam has used Gephi in two lab sessions
(it crashed once and lost the work), has run a NetworkX notebook the teaching assistant shared
without really reading it, and knows "node", "edge" and "degree" from lectures but has to think
about "component". Sam works on a Windows laptop with a trackpad, lives in Google Docs and Canva,
and presses Ctrl+Z for everything. Patience: moderate, but low confidence -- when something
changes unexpectedly Sam assumes Sam broke it.

---

## 1. The graph window, three steps in

> OK so this is the Les Mis one, we did this dataset in week three. Top left under "Les
> Miserables" there's a little grey pill thing, "Filtered: 28 of 77 nodes - 3 steps". So that's
> the three filters. 28 left. Cool.
>
> "The second removed the wrong group." Hmm. My first instinct is just Ctrl+Z, like in Docs. But
> if I Ctrl+Z it undoes the last thing, right? And the last thing is the third one, which I'm
> supposed to keep. I kind of know that. But honestly I'd still try it because it's what I always
> do, and in Gephi Ctrl+Z basically never worked, so I want to see if it works here.

Presses Ctrl+Z once.

## 2. After one Ctrl+Z

> Whoa, OK, a bunch of light blue dots appeared at the bottom right. Marius, Enjolras, Gavroche,
> Courfeyrac... that's the students, the barricade guys. The pill now says "41 of 77 nodes - 2
> steps". Two steps. So yeah, it undid the third one. Nothing popped up to tell me that, I only
> know because I literally watched the dots appear. If I'd been looking at the table I would not
> have noticed.
>
> So I lost the third step. That's exactly what I was told not to do. Great.
>
> Can I get it back? Ctrl+Y? That's redo in Word.

Presses Ctrl+Y.

> Blue dots went away, back to "28 of 77 - 3 steps". OK phew. That's good, that it worked. But I
> only knew to try Ctrl+Y because of Word -- there's no redo button anywhere I can see. There's no
> undo button either, actually. I looked at the toolbar at the bottom and it's like, arrow, some
> sliders, a square, a lightning bolt. None of those look like undo.

## 3. Looking for the actual steps

> OK so undo is a dead end, I need to see the steps themselves. The pill says "3 steps", so I'd
> click the pill. It's the only thing that says "steps".

Clicks the chip. The "Filter steps" list opens (the three-step state of the filter chip screen).

> Oh nice, there's a list. "Filter to Largest component - 76". "Filter to degree >= 5 - 41".
> "Filter out group = 8 - 28". Each one has a checkbox. That's clear, it's like layers in Canva
> kind of.
>
> Wait though. The task said the second one "removed the wrong group". But the one that says
> "group" is the third one, "group = 8". The second one is "degree >= 5". So... which one is
> wrong? Is the task saying group 8 is the wrong group and should be a different number? That
> would mean changing the third one. But then "without losing the third" doesn't make sense.
>
> I'm going to go with "second means the second row", because that's what it says. Degree at
> least 5 removes all the small characters, which is kind of "a group" I guess. Yeah. Second row.
>
> Also there's this grey line under the second row: "3 dropped below degree 5 by 'Filter out
> group = 8'". I read it twice. I think it means three people fell under 5 connections because
> we took out group 8? But that's the third step affecting the second step, which is backwards
> from how I thought a list works. It makes me nervous that if I touch the second one, the third
> one changes too. I don't really get it, so I'm ignoring it.
>
> The numbers on the right, 76, 41, 28 -- I'm guessing that's how many are left after each one.
> Nothing says that, but it goes down, so.

## 4. Turning off the second step

> I'll untick the second one. I'm not deleting it, just unticking, so if I'm wrong I can tick it
> back. That's how I'd do it in Canva with hide/show.

Unticks "Filter to degree >= 5". The list and graph update (the "one step off" state).

> OK. Pill says "63 of 77 nodes - 2 of 3 steps". The second row went grey and its number is now
> "--". The third row, group = 8, is still ticked and says 63. And the students are still gone --
> I don't see Marius or Enjolras. So I kept the third one. I think that's it?
>
> But now the graph looks... messier? There's little black dots floating off on their own at the
> bottom right, a pair of them on a line, one on its own at the bottom. What are the black ones?
> The legend says 2, 4, 3, 5, 1 and then "4 more". I guess black is one of the "4 more"? I would
> have to click that.
>
> And the first row now has a new grey line: "Split into 4 pieces by 'Filter out group = 8'". Did
> I break the first one? "Largest component" -- like, the biggest connected bit -- and now it's in
> 4 pieces? On the right it also says components 4 and there's a funnel icon next to everything.
> I didn't touch the first row. I think what it's saying is that removing group 8 cut some people
> off. Which, fine, the barricade students connect stuff. But it's written like an error and it
> makes me think I did something wrong.
>
> Would the professor count this as right? 63 characters, group 8 still out, degree filter off. I
> think so. I'd screenshot the list to prove it, honestly.

**End state:** 63 of 77 nodes, 2 of 3 steps; the degree step off, "Filter out group = 8" still on.
The earlier cleared selection of 19 characters was not noticed and not restored ("Selected: none,
showing the previous selection" above the table was never read).

## 5. After the task

**Moderator:** How easy was that, from 1 (very hard) to 7 (very easy)?

> Like a 4. Once I found the list it was easy, the checkboxes are obvious. But I wasted my first
> move on Ctrl+Z, which took out the step I was supposed to keep, and the app didn't say anything
> -- I only caught it because blue dots appeared. If I hadn't known Ctrl+Y from Word I'd have been
> stuck redoing the group 8 thing by hand, and I don't know how I'd even add it back. And the
> task said "wrong group" when the step that says "group" was the one to keep, so I had to guess.
> Then those grey sentences under the rows kind of scared me.

**Moderator:** Would you use this instead of what you use now?

> For the homework, probably yes over Gephi. In Gephi the filter thing is a drag-and-drop tree
> and I never knew which filter was actually on, and Ctrl+Z doesn't do anything. Here I can see
> the three steps in a list with checkboxes and the pill tells me how many are left, that's way
> better. But I'd want it to tell me when Ctrl+Z undoes a filter, and I'd want a redo button I can
> see, because not everyone knows Ctrl+Y. And explain what the black dots are.

---

## Problems observed

1. **Undo silently took out the good step.** The first Ctrl+Z reversed "Filter out group 8", the
   step to keep. The only signs were the chip's count and new dots on the canvas; nothing named
   what was undone. Recovered only through Ctrl+Y from Word habit. Severity 3.
2. **No visible undo or redo control.** Nothing on screen offers redo; a user without the Ctrl+Y
   habit would have had to rebuild the step. Severity 2.
3. **"Group" wording collides with the step names.** The only step whose rule says "group" is the
   one to keep; a newcomer has to guess whether "removed the wrong group" means the degree step.
   (Partly the task wording, but a real user describes the problem the same way.) Severity 2.
4. **The grey explanation lines under steps read as errors.** "3 dropped below degree 5 by
   'Filter out group = 8'" and "Split into 4 pieces by 'Filter out group = 8'" describe a later
   step changing an earlier one; the participant could not parse them and feared the fix broke
   the first step. Severity 2.
5. **The count per step is unlabeled.** 76 / 41 / 28 were guessed to be "left after this step".
   Severity 1.
6. **Black nodes after the fix are unexplained.** The legend hides their group under "4 more".
   Severity 1.
7. **The earlier lost selection went unnoticed.** "Selected: none, showing the previous
   selection" above the table was not read. Not part of the task as given, but the recovery
   offer did not reach this participant. Severity 1.
