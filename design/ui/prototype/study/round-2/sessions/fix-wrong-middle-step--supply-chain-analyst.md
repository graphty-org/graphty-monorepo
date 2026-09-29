# Session: fix the wrong middle filter step -- Dana, supply chain risk analyst

**Participant.** Dana, supply chain risk analyst at an industrial equipment maker (persona:
`study/personas/supply-chain-analyst.md`). Lives in Excel and Power BI; not a network person.

**Task as given by the moderator.** "Of three filter steps, the second removed the wrong group.
Fix it without losing the third."

**Screens used, in order.** Undo and ways back, participant view, starting at "three steps"
(`screens/undo.html#study`), then the filter chip and its steps with the middle step off
(`screens/filter-chip.html#off&bare`) to compare the step list.

**Outcome.** Succeeded with difficulty. She opened the steps list from the chip, unticked
"Filter to degree >= 5" and left "Filter out group 8" on: 63 of 77 nodes, 2 of 3 steps -- the
intended end state. She lost time on the task's word "group" (the second step is not a group) and
then stopped trusting the result for a minute because a ticked "Largest component" sat beside
"components 4" in Statistics. The filter chip version of the list explains that on the row; the
undo screen's list does not. She never pressed Ctrl+Z, on purpose.

**Single Ease Question.** 5 of 7.

---

## Transcript

*Moderator reads the task. Dana is looking at the Les Miserables graph with the left panel open.*

**Dana:** Okay, first -- this isn't suppliers, it's a book. Fine, I'll pretend. "Three filter
steps, the second removed the wrong group." So somewhere it has to show me the three steps. I'm
not doing Ctrl+Z. In Excel, if I want to fix the second thing I did and keep the third, Ctrl+Z eats
the third on the way. I've lost an afternoon that way. So: where's the list?

*She scans the left panel top to bottom.*

**Dana:** "Les Miserables", then this grey pill under it: "Filtered: 28 of 77 nodes - 3 steps". Three
steps. That's it, that's the only place that says three. It's small and grey, I'd have missed it
on my laptop. Is it a button? It's got a little funnel. Like the filter arrow on an Excel column
header. I'll click it.

*She clicks the chip. The "Filter steps" list opens over the canvas.*

**Dana:** Good, a list. Three rows with checkboxes. "Filter to Largest component, 76." "Filter to
degree >= 5, 41." "Filter out group = 8, 28." ... Hang on. The task said the second one removed
the wrong *group*. The second one isn't a group, it's "degree". The one that says group is the
third one. So which is it?

*Pause.*

**Dana:** Okay, the moderator said "second". Second row is "degree >= 5". And "keep the third",
the third is group 8. If I read "group" as the third, I'd be told to fix the third *and* keep it,
which makes no sense. So it's the degree row. I don't really know what "degree" means here --
"degree" to me is a temperature. Number of connections? Sure. Whatever it is, it took us from 76
to 41, that's the big cut. Thirty-five gone. That's the one I'd suspect anyway.

**Dana:** The numbers on the right -- 76, 41, 28 -- that's a running total, right? What's left after
each line. Like a waterfall. I like that, that's how I'd build it in a pivot. Nobody labelled the
column, though. I'm guessing.

*She looks for a delete or edit on the second row. There is no visible menu on the row.*

**Dana:** No little trash can, no three dots. Just the checkbox. Unticking it -- is that
"remove" or "hide"? In Power BI unticking a filter value just hides it, it doesn't delete the
filter. I'll take hide. Hide is safer. I'll untick the second one.

*She unticks "Filter to degree >= 5".*

**Dana:** Okay. The row went grey, the count went to two dashes. The third row now says 63. The
pill at the top says "63 of 77 nodes - 2 of 3 steps". Good: two of three are on, and the group 8
line is still ticked. That's what I was asked. The picture filled back in, lots more dots.

*She glances at Statistics on the right.*

**Dana:** Wait. "Components: 4". My first step says keep the *largest component*. Singular. It's
still ticked. So why does it say four? Either the first step broke when I unticked the second, or
the number is wrong. This is exactly the moment I stop trusting a tool. ... And there are four
little stray dots floating off on their own at the right, and a couple of black dots that aren't in
the colour key at all. The key says "5 more". Five more what?

*Moderator says nothing. She stares for a while.*

**Dana:** My guess: the group 8 step runs *after* the big-piece step, so taking group 8 out
chopped the big piece into bits. That's logical if it goes top to bottom. But it doesn't tell me
that. I had to work it out, and I only half believe it. If I put this in front of my VP and he
says "you said largest component, why are there four", I've got nothing.

*Moderator shows the same step list from the filter chip screen, with the middle step off.*

**Dana:** Oh, that's better. Under "Largest component" it says "Split into 4 pieces by 'Filter out
group = 8'." That's the answer to my question, right on the row. Why wasn't that on the other
one? That line is the difference between me trusting this and me re-doing it in Excel. And here the
statistics say "Filtered graph: 63 of 77 nodes" at the top, so I know which numbers those are.

**Dana:** Also, on the first screen, the table at the bottom said "Selected: none, showing the
previous selection" with two buttons. I don't know what I selected. I didn't touch it. I ignored
it, but it's the sort of thing that makes me wonder whether the table is showing what the picture
is showing. Some rows have a blank in "full graph" and some don't. Blank means same? Put the
number in. Blank in my world means missing data.

**Dana:** And there are dashed red boxes around half the buttons. I assume that's your mock, not
the product.

**Moderator:** Are you done?

**Dana:** I'm done. Second step off, third still on, 63 of 77. If I'd pressed Ctrl+Z I'd have lost
the third one and wouldn't have known, because nothing popped up to say so. I didn't, so I don't
know how it would have behaved.

---

## After the task

**Single Ease Question: 5 of 7.** "The fix was one click once I found the list. Finding the list
meant noticing a small grey pill, and then the task's wording and the 'four components' thing cost
me more than the fix did."

**Would she use this instead of her current tool?** "For this bit -- stacking filters and turning
one off without redoing the rest -- yes, it beats Power BI, where the filter pane doesn't tell me
what's left after each filter. I'd want that running count in Power BI. But I'm not switching tools
for a filter list. Does it export the 63 rows to Excel? Where does my supplier list go when I load
it? Can my VP see it on Monday? Until I have answers, it's a side tool I open when Power BI can't
do something."

## What the session showed

- The steps list is found only through the chip under the graph name, which reads as a small grey
  label, not a control. She found it because the task said "three steps" and the chip was the only
  place that said three.
- She avoided Undo on purpose, on Excel experience. The checkbox was the right control and she used
  it on the first try, reading "untick" as "hide", which is what it does.
- The count column has no heading; she guessed "what's left after each step" correctly.
- The undo screen's list lacks the line the filter chip screen shows under "Largest component"
  ("Split into 4 pieces by ..."). Without it, a ticked "Largest component" beside "components 4"
  looked like a broken number, and she nearly lost trust. The two mocks of the same list should
  agree; the filter chip screen's version is the one to keep.
- On the undo screen, the Statistics block does not say which graph it describes (the filter chip
  screen says "Filtered graph: 63 of 77 nodes").
- Black nodes on the canvas have no row in the colour key ("5 more" hides them).
- A blank cell in the "full graph" column read as missing data, not as "same as filtered".
- "degree" is not her word; she understood the step only by its effect on the count.
- The mock's dashed outlines for controls that are not drawn are visible in the participant view.
