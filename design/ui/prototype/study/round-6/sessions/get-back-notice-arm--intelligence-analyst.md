# Get back to where you were -- Marcus, the line-only version

Participant: Marcus, criminal intelligence analyst at a state fusion center. Ten years of Army
all-source work, then i2 Analyst's Notebook and Excel every day. Windows laptop, Ctrl+Z and Ctrl+Y
by reflex.

Task as read to him, and nothing more: "After your last few actions the numbers changed in a way
you did not expect. Get back to where you were."

Version tested: a stray click has just cleared his selection. A dark line above the canvas
toolbar says so and offers Bring it back. In this version Ctrl+Z does NOT bring the selection
back: it always undoes the last filter step. He has done this task once before, in an earlier
session, on a version where the way back was in the table.

Screens he saw, in order:

- `../../../shots/r6-marcus-getback-notice-01-start.png` (the moment he sits down)
- `../../../shots/r6-marcus-getback-notice-02-restored.png` (after Bring it back)
- `../../../shots/r6-marcus-getback-notice-03-ctrlz.png` (after one Ctrl+Z)
- `../../../shots/r6-marcus-getback-notice-04-ctrly.png` (after Ctrl+Y)
- `../../../shots/r6-marcus-getback-notice-05-show-in-steps.png` (the line's Show in steps)
- `../../../shots/r6-marcus-getback-notice-06-untick.png` (the middle step unticked)
- `../../../shots/r6-marcus-getback-notice-07-done.png` (list closed; where he stopped)

## Think-aloud

**Looking at the screen.** "Okay. Les Miserables, fine, it's the practice data. The numbers
changed. Which numbers? Up top it says 27 of 77 nodes, 3 steps. Right side, 27 of 77, 104 edges.
Down in the table it says 'Selected: none, showing the selection just cleared.' And there's a
black box in the middle of the chart: 'Selection cleared (18 nodes)', 'Bring it back'."

"That black box is right where I'm looking, so I'm reading it. Eighteen nodes. That's my people --
Valjean and the ones around him. I picked those by hand. I didn't clear them on purpose. So that's
one thing that went wrong."

(Pause.)

"Last time I did this I hit Ctrl+Z and it undid a filter instead of my selection. I remember
that. So I'm not touching the keyboard for this one. It says Bring it back, I'm clicking Bring it
back."

**First move: Bring it back.** (Clicks it.)

"'Selection restored (18 nodes).' The right side switched over, 18 nodes, selection colors, group
2 seven, group 4 seven, group 5 three, group 3 one. Table says 'Selected: 18 of 27 nodes.' Good.
Rows are highlighted. That's what I had."

"That's the good part. It told me what happened at the moment it happened, and the fix was on the
same line. In i2 if I click off a selection, it's just gone, I redo it by hand. This is better than
i2 on that."

**The numbers.** "Now the other thing. 'Numbers changed in a way I didn't expect.' 27 of 77. That
feels low. I'd have expected more of the network than that. Something I did in the last few
steps knocked a bunch out."

"My hand wants Ctrl+Z. It's the last few actions, that's what Ctrl+Z is for. The selection's
already back, so Ctrl+Z can only mean the filter now. One press."

**Second move: Ctrl+Z.** (Presses Ctrl+Z.)

"'Undone: Filter out group 8.' Chip says 40 of 77, 2 of 3 steps. And there's a whole blue cluster
on the chart now -- Marius, Gavroche, Enjolras, Bossuet, Courfeyrac. Legend says group 8,
thirteen."

"No. That's the students. I took them out on purpose, that was the point, I didn't want the
barricade crowd in this. That wasn't the mistake. The mistake is further back."

"My selection's still there, at least. 18 of 40. It didn't eat my selection this time. Okay."

**Third move: Ctrl+Y.** "Put that one back." (Presses Ctrl+Y.)

"'Redone: Filter out group 8.' Back to 27 of 77, 3 steps. Blue gone. So I'm where I was two
seconds ago. Ctrl+Y worked the way I expected, I'll give it that."

"Now I could hit Ctrl+Z twice and redo the last one, which is what I'd do in Excel, and I'd
probably get it wrong. Or I look at what the steps actually are. It says 'Show in steps' on the
line. Let's look."

**Fourth move: Show in steps.** (Clicks it.)

"A list. Filter steps.
1 -- Filter to degree >= 2. Took out 17, 60 left.
2 -- Filter to degree >= 5. Took out 20, 40 left. Keeps only nodes with at least 5 neighbors among
the 60 it reads.
3 -- Filter out group 8. Took out 13, 27 left."

"It put the highlight on group 8, which is the one I just redid, not the one I care about. Fine.
I can read."

"Degree two and degree five. Why would I do both? Two is to drop the loners, the one-call guys.
Five on top of it -- that's the one that took out twenty. That's the big hit. That's where the
numbers went. I don't remember meaning to go to five. If I'm cutting everyone who's connected to
fewer than five people, I'm cutting exactly the quiet ones. The coordinator who keeps his footprint
small is a degree-three guy. I would never want that filter on a real case."

"I like that it tells me 'took out 20'. That's the kind of thing I'd write in my notes. I can say
on the stand: I filtered to two or more associates, which removed seventeen; I removed group 8,
which removed thirteen. Every number accounted for."

**Fifth move: untick the middle step.** (Clicks the checkbox on degree >= 5.)

"Unticked. It says 'off, takes nothing out.' It's still in the list, greyed, so I can turn it back
on if I'm wrong. Good -- I don't want it deleted, I want it off. Chip says 47 of 77, 2 of 3 steps.
Group 8 step now 'took out 13, 47 left'."

"47. That's more like it. Selection is still 18, highlighted. Valjean's filtered degree went to
27."

(Closes the list.)

**Looking at where he ended up.** "So that's where I was, I think. 2 of 3 steps, my 18 people. The
chart has more people on it now. What are the grey dots out on the right by themselves? Three of
them, not connected to anything I can see. And the legend says '4 more' -- there are groups I
can't see the key for. Black ones up top too. I'd want to know what those are before I put this
in front of anybody."

"And in the table -- Fantine, filtered 15, full graph is blank. Mme. Thenardier blank too. Javert
has 17. Why are two of them empty? If that goes on a slide and a defense attorney asks me 'why is
the full count blank for this person', I don't have an answer. I'm guessing it's blank because
it's the same number. Just put the number."

"Also -- nothing tells me 'this is where you were.' I decided it's right because I reasoned about
which filter was wrong. If I'd gotten that wrong, the screen would look just as confident. There's
no before-and-after, no 'you were at 47 before step 2'. Actually, wait, there kind of is -- step 1
says 60 left, and the step list tells me what each one did. That's close enough. I'd still like
the time on each step. When did I add degree five? Was it before or after lunch?"

**Asked by the moderator whether he is done.** "Yes. Selection back, the bad filter off, the good
ones on."

## Single Ease Question

"Five. The selection part was a one, trivially easy, it was right in front of me. The filter part
I went the wrong way first -- Ctrl+Z undid the step I wanted to keep -- and I only figured out
which step was wrong by reading the list and thinking about it. The list is good. But I had to
already know that Ctrl+Z wasn't going to do what I wanted, and I only knew that because it bit me
last time."

"If I'd hit Ctrl+Z before I clicked Bring it back -- which is what I'd do on a bad day -- I'm pretty
sure I'd have lost the 18 again. That box would have turned into 'Undone: filter out group 8' and
my button would be gone. So in this version the button is the only way back for the selection and
the keyboard is a trap for it. The box doesn't tell you that. Five for me today; somebody who
doesn't read the box first gets a three."

## Would he use this instead of his current tool?

"Instead of i2? No. Same as last time: I don't know where the file goes, there are no entity types,
no phones or accounts, no source and date on a link. That's not this screen's fault, but it's the
answer."

"This part, though -- the step list with 'took out 20, 40 left' -- i2 doesn't give me that. In i2
I'd be squinting at a chart that got smaller and trying to remember what I hid. And the box that
says what I just lost, with the button on it, is better than i2 and better than Excel. If Ctrl+Z
brought the selection back first -- because that's the last thing that happened to me, the stray
click -- I wouldn't have had to think at all. Right now the box and the key disagree about what
'the last thing' was."

## Observer notes (outside the participant's voice)

- **Path:** Bring it back, Ctrl+Z (undid the good last step), Ctrl+Y, Show in steps, untick the
  middle step, close. Six moves, one wrong turn, reached the intended state (selection of 18 back,
  degree >= 5 off, the other two steps on, 47 of 77).
- **He read the line before touching the keyboard, but only because Ctrl+Z hurt him in the earlier
  session.** He said so. A first-time participant with the same habits would likely have pressed
  Ctrl+Z first. Rendered separately
  (`../../../shots/r6-marcus-getback-notice-x1-ctrlz-first.png`): in this version, Ctrl+Z before
  Bring it back replaces the line with "Undone: Filter out group 8", Bring it back is gone, and the
  selection cannot be recovered -- while the table scope line still reads "Selected: none, showing
  the selection just cleared" with no action on it.
- **Mock inconsistency:** the page's spoken text for the cleared line says "Ctrl+Z brings it back"
  in this version too, where Ctrl+Z does not; a screen reader user would be told to press the key
  that loses the selection.
- **Show in steps after a Redo marks the step just redone** (group 8), not a step the user is
  hunting for. He did not mind; he read the whole list.
- **He picked the wrong step by reasoning, not by being shown.** The "took out 20" count and the
  "keeps only nodes with at least 5 neighbors" line are what let him decide; he tied the choice to
  a domain reason (a degree-5 cut removes the low-footprint coordinator).
- **Blank "full graph" cells** (shown blank when the full count equals the filtered count) read to
  him as missing data he could not defend.
- **Unlabelled nodes after the fix:** three grey isolated-looking nodes and a legend collapsed to
  "4 more" left him unsure what was now on the chart.
- **Wording differs between the two pages of this task:** the undo page says "nodes" and "full
  graph"; the filter-chip page says "characters" and "Degree (full graph)". He did not reach the
  second page in this session.
- **Asked for a time on each filter step**, to reconstruct the order of his own work.
