# Session: "Get back to where you were" -- Dana, supply chain risk analyst

Participant: Dana, 41, supply chain risk analyst at an industrial equipment maker. Ten years in
plant logistics before that. Lives in Excel, Power Query and Power BI; tried Gephi once and gave
up. Reading glasses she forgets; browser at 110%. Keyboard habits are Excel habits: Ctrl+Z first,
think second.

Task as given by the moderator: "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were, without losing work you meant to keep."

Screens used: the undo mock in participant view, starting just after the mistake (27 of 77
nodes, three filter steps on, a hand-picked selection cleared by a stray click); the undo line
after one Ctrl+Z; the steps list opened from that line; the same list after her two ticks; the
table's Previous selection. The filter chip mock was looked at afterwards for comparison. Data
is the Les Miserables sample; she was told to read the characters as suppliers.

What she saw, in order:
`shots/r3-dana-getback-s3.png`, `shots/r3-dana-getback-s2.png`, `shots/r3-dana-getback-list.png`,
`shots/r3-dana-getback-off.png`, `shots/r3-dana-getback-fix.png`; for comparison afterwards,
`shots/r3-dana-getback-s3-menu-hist.png` and `shots/screens__filter-chip.png`.

## Think-aloud transcript

**The starting screen.**

"OK, this is a novel, not my suppliers. Fine, pretend. Top left, 'Les Miserables', then a box,
'27 of 77 nodes, 3 steps'. So I'm filtered down to 27. The picture's got maybe thirty dots.
Table at the bottom, Valjean 17, full graph 36. Right side, edges 104."

"And the table says -- 'Selected: none, showing the previous selection.' Hang on. I had
something selected? I don't remember losing anything. There are two little words after it,
'Previous selection' and 'Show filtered graph'. Are those buttons? They look like more text.
Park that. The moderator said numbers changed. Numbers first."

"First thing I do in any program when something goes weird: Ctrl+Z."

**One Ctrl+Z.**

"Right, black bar in the middle of the picture: 'Undone: Filter out group 8'. And a button,
'Show in steps'. Numbers jumped -- 40 of 77 now, '2 of 3 steps'. A whole blue blob came back at
the bottom, Marius, Gavroche, that lot."

"Group 8. Did I want that gone? ... I think I did, actually, that was the last thing I did, the
student lot. So Ctrl+Z just took back something I meant. That's the Excel problem: undo goes
backwards through everything, it doesn't know which one was the dumb one. And in Excel if I undo
twice and then type anything, the redo's gone and I'm rebuilding it. I'm not pressing it again
blind."

"The bar says 'Show in steps'. Steps. Like Applied Steps in Power Query? Let me click that
before it goes away."

**The steps list (opened from the undo line).**

"Oh -- yes, it IS Applied Steps. Good. Three rows. 'Filter to degree >= 2, took out 17, 60
left.' 'Filter to degree >= 5, took out 20, 40 left.' 'Filter out group 8' -- unticked, says
'off'. So Ctrl+Z didn't delete it, it just unticked it. OK, that I like. Nothing's gone."

"'Degree'. I don't know that word here. I'm guessing it's how many links a thing has, because
the table has a 'degree' column and Valjean's the biggest dot. It doesn't say. If this were my
data I'd want 'at least 5 connections', in words."

"Now which one's the mistake. Greater-or-equal 2, then greater-or-equal 5 straight after? The
second one makes the first one pointless. And it took out 20, the most of any. That's the one I
fat-fingered. In Power Query I'd delete that step. Here -- I'll just untick it, I don't trust
delete yet."

"First, put group 8 back, because I wanted that." Ticks it. "27 of 77, 3 steps again. Good.
Now untick the middle one." Unticks degree >= 5.

**After the two ticks.**

"47 of 77, '2 of 3 steps'. Middle row greyed, 'off'. Group 8 says 'took out 13, 47 left'. That
adds up: 60 left after the first, 13 out, 47. I can check the arithmetic off the rows, which is
more than Power BI's filter pane ever gave me."

"Three grey dots floating off on the right on their own. Components says 3 now. Whatever, that's
what the data is once the cut-off's lower. Not my problem today."

"Did ticking group 8 back count as a change? Nothing told me. If I press Ctrl+Z now, what does it
undo -- my untick, or something from before? I'd want to know that before I trust the keyboard
again. I'm leaving the keyboard alone."

**The selection.**

"Now the other thing. Table still says 'Selected: none, showing the previous selection.' So
something was selected and I lost it, and nobody told me how. I didn't click anything that I
know of. That's the bit that would actually worry me on my own data -- I pick my fifteen
single-source suppliers by hand, and it just goes."

"'Previous selection'. I'll try it as a button." Clicks. "Oh. 'Selected: 18 of 47 nodes.' The
right side changed to '18 nodes', groups 2, 4, 5, 3. Dots on the picture got dark rings. OK,
that's my selection back, I assume. Is it MY selection, the one I made, or some guess? It says
18. I didn't count them when I made it. I'll believe it because the table's the same names."

"The rows are all light blue now, selected or not I can't really tell at this size -- everything
in the table is the same pale blue. I'd want a tick box per row like Excel filter."

"Am I where I was? 47 with the good steps on, selection back. I think so. Is it saved anywhere?
If I close the tab, is this still here Monday? Nothing says."

**Afterwards: the Edit menu and the other filter screen.**

Shown the Edit menu with Undo history for comparison: "Oh, there's a history. 'Undo back to here
(2 steps)'. That would have taken me back past group 8 too -- same Excel problem, just with a
menu. The steps list is the better way. I'd never have opened a hamburger menu for this, I don't
open menus in a web page."

Shown the filter chip screen: "This one has a sentence under the middle step -- 'keeps only nodes
with at least 5 neighbors among the 60 it reads'. That's what I wanted in the other one. Why
does one screen have it and the other not? Put it on the one I actually used. And the 'x' to
close it, the other one had no close."

## After the task

**Single Ease Question: 5 of 7.** "Once I was in the steps list, easy, that's Power Query and I
know Power Query. Getting there was luck -- the bar told me what Ctrl+Z did and I happened to
read it before it went. If I'd pressed Ctrl+Z three times fast I'd have been in a mess. And the
selection thing, I only fixed because I'm nosey."

**Would she use it instead of her current tool?** "For this, the steps list is better than
anything I've got. Power BI filters don't tell you 'took out 20, 40 left', you just see the
total move and guess. But instead of? No. This is the undo, it's not the reason I'd pick it. I'd
still want to know where my supplier list goes, whether IT will sign off, and whether I can get
the table into Power BI. If those are yes, the steps list is a reason I'd keep using it. If
they're no, a nice undo doesn't matter."

## Problems observed

1. **The selection was lost without her knowing how, and the recovery reads as prose.** The
   stray click that cleared her hand-built selection left only the table line "Selected: none,
   showing the previous selection". "Previous selection" and "Show filtered graph" look like more
   words, not buttons; she found them only by clicking on a guess. The canvas and the chip say
   nothing. Severity 3.
   "I pick my fifteen single-source suppliers by hand, and it just goes."
2. **Ctrl+Z reversed the step she meant to keep.** The undo line saved her by naming it, but it
   is small, in the middle of the picture, and times out; pressed quickly, three undos would
   have taken her past the good step with no warning. Severity 2.
   "Undo goes backwards through everything, it doesn't know which one was the dumb one."
3. **"Degree" is unexplained in the steps list on the undo screen.** The filter chip screen has
   a plain sentence under the step ("keeps only nodes with at least 5 neighbors..."); the undo
   screen's list does not. She had to guess the word from the table. Severity 2.
   "If this were my data I'd want 'at least 5 connections', in words."
4. **No sign whether ticking a step is itself undoable, or what Ctrl+Z would undo next.** After
   ticking group 8 back and unticking degree >= 5, nothing told her what the keyboard would do
   now, so she stopped using it. Severity 2.
   "I'm leaving the keyboard alone."
5. **Selected rows are hard to tell apart.** After Previous selection, every table row is the
   same pale blue; she could not tell selected from not at her zoom. Severity 1.
6. **Nothing says whether the recovered state is kept.** No saved or autosaved cue; she asked
   whether it would still be there next week. Severity 1.

## What worked

- The undo line named the step it reversed ("Undone: Filter out group 8"), and "Show in steps"
  opened the list at that row. She read the first line and followed it.
- Undo unticked the step instead of deleting it. "Nothing's gone" was the moment she relaxed.
- "took out 20 -- 40 left" on every row let her pick the wrong step by arithmetic and check the
  fix. She compared it favourably with Power BI's filter pane and with Power Query's Applied
  Steps, which she already knows.
- Ticking a step back on is a checkbox, not a hunt through history.
