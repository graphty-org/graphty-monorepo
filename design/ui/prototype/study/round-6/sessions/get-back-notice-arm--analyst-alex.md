# Get back to where you were, the one-line notice version -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes metrics in NetworkX,
draws in Gephi, pastes into PowerPoint. Company Windows laptop, Chrome, Excel habits (Ctrl+Z,
Ctrl+Y). Mild red-green colour vision deficiency.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says so and
offers "Bring it back". Ctrl+Z does not bring the selection back in this version; it undoes the
last filter step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/record/r6-alex-getback-notice-01-start.png` -- the starting screen
- `../../../shots/record/r6-alex-getback-notice-02-ctrlz.png` -- after Ctrl+Z
- `../../../shots/record/r6-alex-getback-notice-03-ctrly.png` -- after Ctrl+Y
- `../../../shots/record/r6-alex-getback-notice-04-undo-history.png` -- main menu, Edit, Undo history
- `../../../shots/record/r6-alex-getback-notice-05-steps.png` -- the filter chip's steps list
- `../../../shots/record/r6-alex-getback-notice-06-degree5-off.png` -- after unticking degree at least 5

## Think-aloud

**The starting screen.** "OK. Numbers first. 27 of 77 nodes, three steps. 104 edges, one
component, density 0.296. Table's there, Valjean at the top, degree 17, full graph 36."

"And there's a black bar in the middle. 'Selection cleared, 18 nodes.' 'Bring it back.' Right, so
that's the last thing that happened. I had stuff selected and now I don't. I must have clicked on
the white."

"Well, the last thing that happened is the thing I undo. Ctrl+Z." *(He does not click the button in
the bar. He reads the bar as "here is what just happened" and reaches for the key he uses for that
in every program.)*

**Ctrl+Z.** *(The picture grows: a light-blue cluster comes back at the bottom -- Marius, Gavroche,
Enjolras. The chip reads 40 of 77, 2 of 3 steps; edges 193. The bar now reads "Undone: Filter out
group 8", with "Show in steps".)*

"No -- no no. That's not what I asked for. It literally just told me the last thing was the
selection. I pressed undo, and it undid a filter instead. The group 8 lot are back. That's the
barricade, I took those out on purpose, there's even a saved thing on the left, 'The barricade,
13'."

"And where's the 'Bring it back' button? Gone. The bar's been replaced. OK."

"I'll give it this: it tells me by name what it undid. In Gephi I'd be guessing. But the bar said
one thing and the key did another thing, and I'd call that a trap, honestly."

**Ctrl+Y.** "Redo." *(Back to 27 of 77, three steps, 104 edges. Bar: "Redone: Filter out group 8,
Show in steps".)* "Right, the students are gone again. Good. Now the selection -- the bar doesn't
offer it any more. The table still says 'Selected: none, showing the selection just cleared'. So it
knows what the selection was. It's showing me the rows. There's a 'Show filtered graph' next to it,
which is the opposite of what I want."

"Can I click the rows back? ...Nothing here says how. I'd shift-click eighteen rows, I suppose. In
Excel that's fine, in a tool that just told me it had the selection saved, that's annoying."

**Looking for it in the menu.** "Three lines, top left, that's probably the menu." *(Main menu,
Edit.)* "'Undo Filter out group 8, Ctrl+Z.' 'Redo', greyed. 'Undo history'." *(Opens it: "Filter out
group 8", "Filter to degree >= 5", "Filter to degree >= 2".)* "No selection in here. So the
selection was never an undo thing. It was only that button in the black bar, and I lost it by
pressing the one key everybody presses."

"There's a 'Selection' menu up there too... I'm not going to dig. Close."

**The filters.** "The task said the numbers changed. The selection doesn't change numbers, the
counts were 27 before and after. So maybe it's also the filters. Let me look at the steps." *(Opens
the chip.)*

"Filter to degree at least 2, took out 17, 60 left. Filter to degree at least 5, took out 20, 40
left -- 'keeps only nodes with at least 5 neighbours among the 60 it reads'. Filter out group 8,
took out 13, 27 left. 77, 60, 40, 27, that adds up. I like the took-out numbers, that's my
footnote."

"But why have I got two degree filters? At least 2 and then at least 5 -- the second one makes the
first one pointless. That looks like me meaning to change 2 to something and adding a step instead.
Or maybe I wanted 5. I genuinely don't know. It's cheap to look, the row stays there."

*(Unticks degree at least 5. Chip: 47 of 77, 2 of 3 steps. Edges 142, components 3, density 0.131.
The bar above the toolbar disappears. The degree 5 row stays in the list, greyed, "off, takes
nothing out".)*

"47. Components went from 1 to 3 -- those grey ones floating on the right, and Myriel's bunch. That
feels more like the graph I'd actually work on; 27 was a bit thin to say anything about. Valjean's
degree is 27 now on the filtered graph. I'll take this. If I'm wrong the tick is right there."

"So -- filters, I think I'm back. Selection, I'm not. The table still says 'showing the selection
just cleared' and there is no way to un-clear it. I'd have to pick those eighteen again by hand, and
I don't remember exactly which eighteen, so I'd be copying names off this table."

**Moderator asked afterwards: did you see "Bring it back" before you pressed Ctrl+Z?** "Yes. I read
it. I just didn't think I needed a button when I've got a key. Bar says 'this happened', Ctrl+Z
un-does 'this happened'. That's how every program on my laptop works. If the button is the only
way, then the key shouldn't be pointing somewhere else while the bar is up -- or at least the bar
should stay until I've actually done something else, not vanish the second I hit undo."

## Single Ease Question

**3 out of 7.** "Filters, fine, the list is good and nothing I turn off disappears. But the one
thing the screen told me had happened, I couldn't undo with undo, and the moment I tried, the offer
to fix it was gone for good. That's worse than no bar at all, because it told me it was
recoverable."

## Would he use this instead of his current tool?

"For filters, over Gephi, yes -- each step says what it took out and turning one off doesn't delete
it. That's genuinely better than what I have. But I wouldn't switch on this bit. A hand-picked
selection is usually the thing I'm about to export. If one stray click plus Ctrl+Z loses it for
good, that's the kind of thing that ends up in a report wrong. Put the selection on Ctrl+Z, like
the bar made me think it was, and I'd be much happier."

## Moderator notes

- **End state not reached.** Alex ended at 47 of 77, 2 of 3 steps (degree 5 off, group 8 out),
  which matches the target, but with no selection. The selection could not be recovered: pressing
  Ctrl+Z emptied the held selection, and nothing afterwards offered it back.
- **First move was Ctrl+Z, with the notice read.** He read "Selection cleared (18 nodes) / Bring it
  back" and still pressed Ctrl+Z, because the notice read to him as a description of the last
  action, and Ctrl+Z is how he reverses the last action. In this version that undid Filter out
  group 8 and replaced the notice, so the only way back to the selection vanished on the reflex
  keypress. He called it "a trap".
- **The table's scope line outlives the way back.** After the held selection is gone, the table
  still reads "Selected: none, showing the selection just cleared", offering only Show filtered
  graph. Alex read that as "it still knows the selection" and was more annoyed, not less, that
  nothing brought it back.
- **Undo history has no selection entry**, so the Edit menu was no help; he found the list of
  filter steps there and nothing else.
- **Spoken text contradicts this version.** The announcement heard when the selection is cleared
  is "Selection cleared (18 nodes). Ctrl+Z brings it back." in both versions, but in this version
  Ctrl+Z undoes a filter step. A screen-reader user would be told to press the key that loses the
  selection.
- **He did find the filter fix on his own** by reading the steps list: two stacked degree filters
  looked redundant to him, and the kept-in-place row made it cheap to try. The took-out counts were
  praised again ("that's my footnote").
- **Redo worked as expected** with Ctrl+Y, and the line naming the undone step by name was praised
  even while he was annoyed with what it undid.
