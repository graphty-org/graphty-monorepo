# Getting back after a wrong step -- Jordan, marketing network analyst

**Task, as the moderator gave it:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were, without losing work you meant to keep."

**Screens:** the undo screen in its participant view (no design notes), then the filter chip
screen. The graph is Les Miserables, 77 characters, already narrowed by three filter steps. The
middle step (keep characters with at least 5 connections) is the mistake; the first (at least 2
connections) and the last (leave out group 8, the students) are work to keep. Jordan was not told
which was which.

**Renders of what she saw:** `shots/r3-jordan-getback-s3.png` (start),
`shots/r3-jordan-getback-s2.png` (after one Cmd+Z), `shots/r3-jordan-getback-list.png` (the steps
list opened from the undo line), `shots/r3-jordan-getback-off.png` (end state),
`shots/r3-jordan-getback-s3-hist.png` (the main menu, looked at afterwards),
`shots/r3-jordan-getback-chip.png` (the filter chip screen).

## Think-aloud

**Start.** Okay. Left side, under "Les Miserables", there's a little box: "27 of 77 nodes, 3
steps". Twenty-seven. That's a lot less than I'd expect -- I strip the leaves off, I don't usually
throw away two thirds of a network. Right panel says 104 edges, one component. Table at the bottom
is sorted by degree, Valjean 17. Fine.

There's a line above the table, "Selected: none, showing the previous selection", and two buttons,
"Previous selection" and "Show filtered graph". I didn't select anything. Or did I? I'm going to
ignore that; that's not the number that's bothering me.

"Get back to where you were" -- my hands do this before my head does. Cmd+Z.

**One Cmd+Z.** The graph grew a whole blue cluster at the bottom -- Marius, Gavroche, Enjolras,
Bossuet. Legend now has group 8 at the top with 13. Box says "40 of 77 nodes, 2 of 3 steps". And
there's a black bar over the toolbar: "Undone: Filter out group 8 -- Show in steps".

No. No no. Filtering out group 8 was on purpose, those are the students, they're their own little
world and they drown the rest. That's the one I wanted. Undo took the last thing, which, fine,
that's what undo does, that's on me. So the bad one is further back.

I'm glad the bar actually told me *what* it undid. In most tools I'd be squinting at the picture
trying to work out what just changed. Here it's in words. I'm clicking "Show in steps" before it
goes away -- I don't trust those bars to wait for me.

**The steps list.** A panel drops open under the box. Three rows:

- Filter to degree >= 2 -- took out 17, 60 left
- Filter to degree >= 5 -- took out 20, 40 left
- Filter out group 8 -- off

Oh, this is good. "Took out 20." *That's* my problem. Degree five is way too aggressive for a cast
this size; I think I meant to type 2 again, or I fat-fingered it. Twenty gone in one step, that's
the number I didn't expect.

And group 8 isn't gone, it's just unticked and says "off". I half expected undo to have deleted it
and I'd have to rebuild it. It's still there. Relief.

So I untick degree >= 5... the box says "60 of 77, 1 of 3 steps" for a second -- right, because
group 8 is still off -- and I tick group 8 back on. "47 of 77 nodes, 2 of 3 steps". Group 8 row
says "took out 13, 47 left". Degree >= 5 row says "off" and is greyed but still there.

**Checking.** Before I believe it, I check someone I know. Valjean is still at the top of the table,
degree 27 now against 36 on the full graph -- makes sense, the students were a lot of his
neighbours. Javert 15, Fantine 15. Those feel right. No blue in the legend. Good.

Two things make me pause. There are three grey dots floating off on their own at the right, not
connected to anything, and the right panel now says "components 3". A minute ago it said 1. Did I
break something? ... Probably those three only knew the students, so taking the students out
strands them. I *think* that's it. Nothing on screen says so; I'm guessing. If I put this on a
slide someone will ask "what are those three" and I'd better know.

Second: the "full graph" column in the table is blank on some rows -- Fantine, Mme. Thenardier.
Blank means what? Same as the filtered number? Missing? I'd assume missing, which would make me
distrust the whole column.

**Is this "where I was"?** I think so. Leaves off, students out, the silly degree-5 step parked.
But there's nothing that says "this is what it looked like before", so I'm trusting my own memory
and the "took out" numbers. The "took out" numbers are honestly what saved me.

**Afterwards, poking around.** Moderator asked if I'd noticed any other way back. I clicked the
three lines top left: a menu, Edit, and inside it "Undo Filter out group 8", "Redo", and "Undo
history" with each step listed -- "Undo back to here (2 steps)". Useful, but I'd never have gone in
there; it's a hamburger menu, I assume hamburger menus are settings and logout. And if I *had* used
"Undo back to here (2 steps)" I'd have lost the group 8 step on the way, or at least I'd have
thought I did.

There's no undo button anywhere I can see. I'm on a Mac so Cmd+Z is automatic, but my VP isn't
going to press Cmd+Z; she's going to click around looking for an arrow.

**The filter chip screen.** Same box, same list, but here the degree >= 5 row has a line under it:
"keeps only nodes with at least 5 neighbors among the 60 it reads". I like that -- that's exactly
the sentence I'd need to explain the step to someone. It wasn't on the other screen, where I
actually needed it. Also the table columns are named differently here ("degree" with a funnel and
"degree on: full graph") and the edges say "104 of 254". Is that the same app? It made me wonder
which one is real. And the tab strip along the top of this page literally says "Wrong middle step",
which, as a participant, is a bit of a giveaway.

## Single Ease Question

**5 out of 7.** The first Cmd+Z undid the wrong thing, which gave me a jolt, but the bar told me
what it undid and the list showed me why the number dropped. Two ticks and I was done. I lose points
for the floating dots and "components 3" that I had to explain to myself, the blank table cells,
and having to catch that bar before it vanished.

## Would I use this instead of what I use now?

For this part, yes, over Gephi. In Gephi the filter panel is a tree of queries you drag around, and
when the count drops I have no idea which query did it; I end up rebuilding from scratch. Here every
step says how many it took out and how many are left, and nothing gets thrown away when I undo. That
"took out 20" is the thing I'd screenshot for my manager. But I'd want to see it on one of my real
files -- 30,000 accounts, not 77 characters -- before I moved anything over, and I'd want it to tell
me *why* the component count jumped instead of leaving me to guess.

## What went wrong on the screens

| Where | What happened | How much it bothered her (1-4) |
| --- | --- | --- |
| Undo, first press | Cmd+Z reversed the step she meant to keep (group 8); she had to recognise that from the undo line and change course. The line naming the step is what saved her. | 2 |
| Undo line | It is the only route from the keyboard to the steps list, and she clicked it in a hurry because she expects such bars to disappear. A reader who looks at the graph first could miss it. | 2 |
| End state | After the fix, "components" jumped from 1 to 3 and three grey nodes float unconnected; nothing explains that removing group 8 stranded them. She guessed and was not sure. | 2 |
| Table | The "full graph" column is blank where the two degrees are equal; she read blank as missing data. | 2 |
| Table scope line | "Selected: none, showing the previous selection" with two buttons appeared though she had selected nothing; she ignored it but it added noise at the moment she was trying to find the bad number. | 1 |
| Main menu | Undo history is two levels inside a hamburger menu; she would never have found it; there is no visible undo control for someone who does not use Cmd+Z. | 2 |
| Steps list | The plain-words line under a step ("keeps only nodes with at least 5 neighbors among the 60 it reads") is on the filter chip screen but not in the list she used during recovery. | 1 |
| Two screens | The filter chip screen and the undo screen name the table columns and the edge count differently; she wondered which was the real app. The filter chip page also shows a tab named "Wrong middle step" to the participant. | 1 |
