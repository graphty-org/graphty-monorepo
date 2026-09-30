# Get back to where you were, the one-line notice version -- Jordan, marketing network analyst

**Participant:** Jordan, growth-marketing analyst, six years in, the person on her team who "does
the network stuff" one or two days a week. NodeXL in Excel first, then Gephi from YouTube
tutorials, a networkx notebook a colleague set up. Company MacBook Pro, Chrome with thirty tabs,
Cmd+Z by reflex from Excel and Google Sheets. Burned before by tools whose numbers did not match
between screen and download, so she checks numbers before she trusts them.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says so and
offers "Bring it back". Ctrl+Z (Cmd+Z on a Mac) does not bring the selection back in this version;
it undoes the last filter step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/record/r6-jordan-getback-notice-01-start.png` -- the starting screen
- `../../../shots/record/r6-jordan-getback-notice-02-bring-back.png` -- after Bring it back
- `../../../shots/record/r6-jordan-getback-notice-03-undo1.png` -- after the first Cmd+Z
- `../../../shots/record/r6-jordan-getback-notice-04-undo2.png` -- after the second Cmd+Z
- `../../../shots/record/r6-jordan-getback-notice-05-show-steps.png` -- Show in steps: the filter steps list
- `../../../shots/record/r6-jordan-getback-notice-06-tick-group8.png` -- after ticking "Filter out group 8" again

## Think-aloud

**The starting screen.** "OK, where am I. Les Miserables -- fine, the sample. Top left, '27 of 77
nodes, 3 steps.' So I've filtered this down three times. Stats on the right: 104 edges, one
component, density 0.296. I don't have a feel for whether that's right."

"The table says 'Selected: none, showing the selection just cleared.' Hm. And the black bar in the
middle: 'Selection cleared (18 nodes).' Bring it back. OK, so I had 18 people picked. That's my
list. That's the thing I actually care about -- the list is what goes in the deck. I did not mean
to clear that, I must have clicked on the white."

"My instinct is Cmd+Z. But the button is right there and it says exactly what I want, so I'm not
going to gamble with the keyboard. If I press Cmd+Z in some of these tools it undoes something
completely different." *(She clicks Bring it back. She reads the bar because it sits at eye level
over the toolbar, and because it names a count, 18, that she recognises as "her list".)*

**After Bring it back.** "'Selection restored (18 nodes).' Good. The rows in the table are blue
again, 'Selected: 18 of 27 nodes.' Right panel says 18 nodes, with a breakdown by group -- 7, 7,
3, 1. That adds up to 18. OK, I check that kind of thing."

"But the task said the numbers changed. The selection is back, but I'm still at 27 of 77. Is 27
right? I have no idea. Three steps -- what were they? I don't remember doing three."

"Let me just undo and see what the last thing was. Cmd+Z." *(She presses Cmd+Z once.)*

**After the first Cmd+Z.** "Whoa, a whole light-blue cluster just came back at the bottom.
Marius, Gavroche, Enjolras, Courfeyrac. Bar says 'Undone: Filter out group 8.' And top left is now
'40 of 77 nodes, 2 of 3 steps.' OK so the last thing I did was take out group 8."

"And my 18 are still selected -- 'Selected: 18 of 40.' Good, undo didn't wipe my list. That's the
thing I would have been scared of."

"Hang on. Valjean's degree went from 17 to 21. The 'full graph' column is still 36. So degree is
counted inside whatever I've filtered to. That's -- OK, that's actually useful, but it means every
time I touch a filter, the degree number I'd put on a slide changes. I'd want the full-graph one
for the deck. Also some cells in 'full graph' are just blank -- Gueulemer, Babet. Is that zero? Is
it missing? I'd have to ask." *(The blank cells are where the filtered and full-graph degree agree;
she does not work that out.)*

"Was taking out group 8 the mistake? Over on the left there's a set called 'The barricade', rule,
13. And that blue group is 13 in the legend. So I think I pulled the barricade people out on
purpose, and made a set of them. That feels deliberate, not a slip."

"But I don't actually know. Let me go back one more and look." *(Second Cmd+Z.)*

**After the second Cmd+Z.** "Now it's 60 of 77, 1 of 3 steps, and the bar says 'Undone: Filter out
group 8 and Filter to degree >= 5.' OK, I like that it lists both, I didn't have to remember what
the first one was. So the three steps were: degree at least 2, degree at least 5, take out group 8."

"Degree at least 2, then degree at least 5. Why would I do both? That's like filtering a report to
'spend over 100' and then 'spend over 500' -- the second one makes the first one pointless. That
looks like the slip. I bet I meant to edit the first one and added a new one instead. Or I was
trying something and forgot to take it off."

"So what I want is: degree 2 on, degree 5 off, group 8 on. Undo just took off both, in order. If I
press Cmd+Shift+Z I get group 8 back but also degree 5 first, I think -- redo goes in the same
order. I don't want that. Let me see the steps." *(She clicks Show in steps on the bar.)*

**The steps list.** "OK, this is a list with checkboxes. Filter to degree >= 2, ticked, 'took out
17, 60 left.' Filter to degree >= 5, unticked, 'off, takes nothing out.' Filter out group 8,
unticked. Both the ones I undid are highlighted. Good -- undo didn't delete them, it just unticked
them. That's what Gephi's filter panel sort of does, except Gephi never tells you in words."

"So I tick group 8 back on and leave degree 5 off." *(She clicks the checkbox on "Filter out
group 8".)*

**After ticking group 8.** "47 of 77 nodes, 2 of 3 steps. Group 8 row says 'took out 13, 47 left.'
Thirteen, same as the barricade set. The students are gone from the drawing, my 18 are still
selected, 'Selected: 18 of 47.' I think this is where I was supposed to be."

"Couple of things bug me. There are three grey dots floating off on their own on the right with no
labels. Who are they? Are they connected to anything? If I screenshot this for a VP the first
question is 'what are those'. And Valjean's degree is now 27 -- I've seen 17, 21, 31 and 27 for the
same guy in two minutes. I understand why, but I would not want to explain it."

"And I'm guessing, honestly. Nothing told me which step was the mistake -- I worked it out because
two degree thresholds in a row looked silly and because the set name matched. If the steps had
been less obvious I'd have been clicking checkboxes until the number looked familiar. Except I
don't remember the number either. It would help if it said 27 was what I had ten minutes ago, or
showed me the steps with a time on them."

"One more thing. I'm glad I clicked the button first. If I'd hit Cmd+Z straight away, would the
selection have come back? The bar said 'Bring it back', it didn't say anything about Cmd+Z. I
genuinely don't know, and I wouldn't want to find out on real data."

## Single Ease Question

**5 out of 7.** "The selection bit was easy, one click, and it said so. The filter bit I got, but I
had to think like a detective. Undo doing the steps one at a time and naming them saved me. The
list with checkboxes is the part I'd actually use."

## Would she use this instead of her current tool?

"For this bit, yes -- over Gephi, for sure. In Gephi if I mess up the filter stack I usually just
reload the file and redo it, and a hand-picked selection is gone for good. Here my list survived
everything I did, and I could see every step I'd applied in plain words. That's the thing I'd
actually tell my team about. But it doesn't replace the listening suite, that's where the data
comes from, and I'd still want the degree column to not move under me before I put any of these
numbers in a deck."

## What the moderator saw

- She read the notice before acting and chose Bring it back over Cmd+Z on purpose, saying the
  keyboard was "a gamble" because Cmd+Z does different things in different tools. The selection
  was restored before any filter change, so it was never lost.
- She then used Cmd+Z twice to find out what the last steps were, not to fix them. She read both
  notices. The second notice, naming both undone steps, is what told her what the three steps had
  been.
- She identified the wrong step by reasoning, not from anything on screen: two degree thresholds
  in a row looked redundant, and the removed group's count (13) matched the "The barricade" set.
  She said herself that with less obvious steps she would have been guessing.
- She avoided Redo because she expected it to bring back the wrong step first, and went to the
  steps list through the notice's Show in steps. She reached the target state (47 of 77, 2 of 3
  steps, 18 selected) in six actions.
- She asked, unprompted, whether Cmd+Z would have restored the selection; nothing on screen
  answers that in this version.
- Confusions unrelated to undo: blank cells in the "full graph" degree column read as missing
  data; three unlabelled grey nodes after the final state; the filtered degree changing on every
  step read as "numbers moving under me" and a risk for anything she puts in a deck.
