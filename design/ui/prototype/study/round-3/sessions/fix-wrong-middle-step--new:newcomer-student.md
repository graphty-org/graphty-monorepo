# Session: "Fix the wrong middle step" -- newcomer student (round 3)

**Task given by the moderator:** "Of three filter steps, the second removed the wrong group. Fix
it without losing the third."

**Screens used, in order:** the graph window after three filter steps (the undo screen, participant
view), then the filter chip's steps list (the filter chip screen). Both were driven as a clickable
prototype: keys and clicks did what the page does, nothing more.

**Facilitator note:** there is still no persona file for this participant in the personas folder.
The participant is played as the same composite as in round 2, so the two sessions compare: Sam,
20, a second-year sociology undergraduate in an elective on social network analysis. Sam has used
Gephi in two lab sessions (it crashed once and lost the work), has run a NetworkX notebook the
teaching assistant shared without really reading it, knows "node", "edge" and "degree" from
lectures but has to think about "component", works on a Windows laptop with a trackpad, lives in
Google Docs and Canva, and presses Ctrl+Z for everything. Patience moderate, confidence low: when
something changes unexpectedly Sam assumes Sam broke it. Sam has not seen this app before (a new
session, no memory of round 2).

---

## 1. The graph window, three steps in

> OK, Les Mis, we had this one in week three. Top left, under "Les Miserables", there's a box that
> says "27 of 77 nodes - 3 steps" with a little arrow. So three filters, 27 left.
>
> "The second removed the wrong group." Hmm, wait. Which one is the group one? I can't see the
> steps yet, so I'll just trust that "second" means second.
>
> There are these pink dotted outlines around a bunch of buttons -- the plus buttons, "Export
> files", the table search. Is that a bug? Or is that like... "you can click here"? I'm going to
> ignore them.
>
> Also the table says "Selected: none, showing the previous selection" and then "Previous
> selection" and "Show filtered graph". I didn't select anything? That's confusing but it's not my
> task. Moving on.
>
> First instinct: Ctrl+Z. It's what I do in Docs. I sort of know it'll undo the last thing, which
> is the third one, the one I'm meant to keep. But in Gephi Ctrl+Z basically never did anything, so
> I want to see what happens here.

Presses Ctrl+Z.

## 2. After one Ctrl+Z

> Oh, OK -- a bunch of light blue dots came in at the bottom: Marius, Gavroche, Enjolras,
> Courfeyrac. The barricade boys. And a black bar popped up above the toolbar: "Undone: Filter out
> group 8" with "Show in steps".
>
> So it undid the THIRD one. The group one. Wait -- "filter out group 8" is the group step. So is
> that the "wrong group"? The moderator said the second one removed the wrong group... but the one
> with "group" in its name is number three. Now I'm confused about which one I'm supposed to fix.
>
> (Moderator repeats: "the second step is the wrong one; keep the third.")
>
> OK, the second, whatever it is. So I just lost the one I'm keeping. At least the black bar told me
> which one I lost -- I didn't have to guess. The box also says "40 of 77 - 2 of 3 steps" now.
>
> Ctrl+Y to get it back, like Word.

Presses Ctrl+Y.

> Blue dots gone, bar says "Redone: Filter out group 8". Good, phew. That's nicer than Gephi. But I
> only knew Ctrl+Y from Word; I don't see an undo or redo button anywhere on the screen.

## 3. Opening the steps

> Undo is the wrong tool here, I need to get at the steps themselves. I could click "Show in steps"
> on the black bar -- but it's about to disappear, I think? I'll click the "3 steps" box, since
> that's the thing that says steps.

Clicks the filter box. A tooltip "Filtered: 27 of 77 nodes - 3 steps" shows on hover, then the
"Filter steps" list opens.

> Right, here we go. Three rows with checkboxes:
> - Filter to degree >= 2 -- took out 17, 60 left
> - Filter to degree >= 5 -- took out 20, 40 left
> - Filter out group 8 -- took out 13, 27 left
>
> I like the "took out / left" bit, I can actually follow the maths: 77, 60, 40, 27. The ">=" is
> in that code-looking font, it's a bit programmer-y but I know it means "at least".
>
> So the second one is "degree >= 5". It doesn't remove a group at all, it removes everyone with
> fewer than 5 connections. So "wrong group" I guess means "the wrong bunch of characters". Fine.
>
> Everything has a checkbox, so I'd just untick the second one. Like hiding a layer in Canva. I'm a
> bit nervous that unticking the middle one messes up the third one, because they're in order.

Clicks the checkbox on "Filter to degree >= 5".

## 4. After unticking the middle step

> OK. The row went grey and says "off". Third row still ticked, and now it says "took out 13 - 47
> left". The box at the top says "47 of 77 nodes - 2 of 3 steps". So the third step is still
> there and still doing its thing. Barricade guys are still gone -- I don't see Marius or any blue
> ones at the bottom. Good, that's the "without losing the third" part.
>
> But the picture got messier. There's Myriel now, some black dots I have no idea about, and three
> grey dots floating off on their own on the right, two of them joined. On the right it says
> "components 3". Is that bad? Did I break it into pieces? I think components means separate
> chunks, so... I guess those little ones are people who only know each other. I'd probably ask the
> TA. The legend says "4 more" so I can't even tell what group the black dots are.
>
> Also, is the second step gone or just switched off? It's still in the list, greyed out. It says
> "2 of 3 steps", so I think it's just off. Honestly I'd leave it there in case I need it. If I
> wanted it gone there's a "..." on the row, probably delete is in there.

## 5. On the steps list screen

The moderator moves Sam to the second screen, the steps list already open.

> Same list, but this one's nicer: under the degree >= 5 row it says "keeps only nodes with at
> least 5 neighbors among the 60 it reads". Oh, that actually explains it -- it's counting
> neighbours AFTER the first step. I didn't get that on the first screen. Why doesn't the other one
> say that?

Unticks the second row again.

> Same result, 47 of 77, 2 of 3 steps. But a black "Turn on step" tooltip popped up right on top of
> the row, so I couldn't read what the row changed to until I moved the mouse. Minor.
>
> I tried Ctrl+Z here just to check and it ticked the row back on, and the explanation came back.
> OK, so undo undoes my tick. Makes sense. Ticking it off again, done.

## 6. After the task

**Moderator: how easy was that, 1 to 7?**

> Five. Once I opened the list it was easy -- untick, done, the numbers tell you what happened. The
> hard bits were: my first move, Ctrl+Z, is exactly the wrong move, and I only got out because the
> black bar told me what it undid and I happened to know Ctrl+Y. And the task said "group" and the
> step I had to fix wasn't a group, which threw me for a minute. Also, the messy picture after
> made me think I'd broken something.

**Moderator: would you use this instead of what you use now?**

> For the class, yes, over Gephi. In Gephi I lost my whole filter setup once and had to start over.
> Here the steps are a list with ticks and numbers, and Ctrl+Z actually works and says what it did.
> I'd still want an undo button I can see, and I'd want that explanation line on every step, not
> just sometimes. And those pink dotted boxes everywhere made it look unfinished.

---

## What happened

- First action: Ctrl+Z. It undid the third step (the one to keep). The notice line above the
  toolbar named it ("Undone: Filter out group 8"), so Sam knew what was lost; Sam recovered with
  Ctrl+Y from Word habit. No visible Undo or Redo control.
- Sam found the steps by clicking the filter box ("3 steps"), not by the notice's "Show in steps".
- Sam unticked "Filter to degree >= 5". End state: 47 of 77 nodes, 2 of 3 steps, group 8 still
  filtered out. Task complete.
- The task's wording ("removed the wrong group") did not match the middle step (a degree
  threshold); the only step with "group" in its name was the third one, the one to keep. Sam
  briefly suspected the third step was the one to fix and needed the moderator to repeat the task.
- After the fix the drawing showed a few small detached pieces, unlabeled black dots and
  "components 3"; Sam read this as possibly having broken the graph.
- The explanation line on the middle step ("keeps only nodes with at least 5 neighbors among the
  60 it reads") appeared only on the second screen and was the moment the step made sense.
