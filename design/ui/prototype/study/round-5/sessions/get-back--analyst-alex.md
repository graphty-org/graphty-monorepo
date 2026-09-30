# Get back to where you were -- Analyst Alex

**Participant:** Alex, operations data analyst at a logistics company. Computes metrics in NetworkX,
draws in Gephi, pastes into PowerPoint. Company Windows laptop, Chrome, Excel habits (Ctrl+Z,
Ctrl+Y). Mild red-green colour vision deficiency.

**Task as given by the moderator:** "Something on the screen just changed that you did not expect.
Get back to where you were."

**Starting point:** the Les Miserables sample, 77 characters, narrowed by three filter steps to 27
characters. A moment before, a click on empty canvas had cleared a selection of 18 characters
around Valjean. The participant was not told any of this.

**Screens seen** (renders the participant looked at, in order):
- `../../../shots/record/screens__undo--study.png` -- the starting screen
- `../../../shots/record/r4-alex-getback-02-ctrlz.png` -- after pressing Ctrl+Z once (same state as
  `../../../shots/screens__undo-s2--study.png`)
- `../../../shots/record/r4-alex-getback-03-ctrly.png` -- after Ctrl+Y
- `../../../shots/record/r4-alex-getback-04-prevsel.png` -- after clicking "Previous selection" in the table
- `../../../shots/record/r4-alex-getback-05-chip.png` -- the filter chip opened to double-check
- `../../../shots/record/r4-alex-getback-01-edit-menu.png` -- the Edit menu, opened afterwards when asked
  where he would have looked for undo

## Think-aloud

**The starting screen.** "OK, something changed. What changed. ...I honestly can't tell from
looking at it. Picture looks like a picture. 27 of 77 nodes, three steps. Right side, 104 edges,
one component. Table's still there, Valjean at the top."

"Nothing is flashing at me, nothing says 'hey, this just happened'. So I'm doing what I do in
Excel."

**Ctrl+Z.** "Ctrl+Z." *(The picture grows: the light-blue cluster at the bottom -- Marius,
Gavroche, Enjolras -- comes back. The chip now reads 40 of 77, 2 of 3 steps. A black line above the
toolbar: "Undone: Filter out group 8", with a "Show in steps" button.)*

"Whoa. OK, that's a lot of nodes back. 'Undone: Filter out group 8.' ...Hang on. I didn't want
that undone. Group 8 is the students, I took them out on purpose -- that's the barricade lot, it's
right there on the left, 'The barricade, 13'. So that wasn't the thing that changed. Undo went
past whatever it was and took my filter."

"I'll say this, though: at least it told me what it undid, by name. In Gephi I'd be staring at the
picture trying to work out which of my filters just vanished. That line is good."

"Redo. Ctrl+Y." *(Back to 27 of 77, three steps. The line now reads "Redone: Filter out group
8".)* "OK, good, Ctrl+Y works. Back where I started. Which is still not where I was, apparently."

**Looking for what actually changed.** "So what's different. Numbers are the same as before I
touched anything. Chip says three steps. Let me actually read the table header... 'Selected: none,
showing the previous selection.' Huh."

"Selected none, but showing the previous selection? That's a strange sentence. Is it selected or
isn't it? ...Oh. I had stuff selected. I'd picked Valjean and his lot. And the rows are still in the
table, but they're not selected any more. That's the thing that changed. I must have clicked on the
white bit."

"And there's a button right after it -- 'Previous selection'. Well, that's literally what I want."

**Previous selection.** *(Click. The table line reads "Selected: 18 of 27 nodes. Sorted by
degree." Rows are tinted, nodes on the canvas get a dark ring, the right panel switches to "18
nodes".)* "There we go. 18 of 27. The rows go blue. Right side says 18 nodes. Valjean, Fantine,
Thenardier, Javert -- same list as a second ago, just selected again. OK. I think I'm back."

"On the picture it's... subtle. There's a thin dark ring around the selected ones. If I hadn't been
looking at the table I'm not sure I'd have noticed it was selected. The table's what told me."

"'Selection colors: group 2, group 4, group 5, group 3.' Did selecting them change the colours?
...No, they're the same colours. I think it's telling me what's in my selection, by group. Call it
'what's selected' or something, 'colors' made me think it recoloured stuff. And group 2 and group 3
-- the orange and the darker orange -- I'd want to check that twice. Not terrible though, not the
red-green mud I usually get."

**Double-checking the filters.** "Let me just make sure the filters are what I think." *(Opens the
chip.)* "Three steps, all ticked. Degree at least 2, took out 17, 60 left. Degree at least 5, took
out 20, 40 left. Group 8 out, took out 13, 27 left. That adds up: 77, 60, 40, 27. I like that it
tells me what each one took out. That's the thing I'd want to put in a footnote."

"The middle one has a grey note: 'keeps only nodes with at least 5 neighbors among the 60 it reads.'
...Fine. At least five neighbours. That's what I asked for, I assume." *(He does not stop on "among
the 60 it reads"; he reads the numbers and moves on.)*

"Close it. 27 of 77, three steps, 18 selected. That's where I was. Done."

**Moderator asked afterwards: where else would you have looked for undo?** "Honestly Ctrl+Z is it.
If that failed I'd look for an Edit menu. There's no Edit menu across the top, so... the three
lines, top left?" *(Opens it: File, Edit, View... Edit shows "Undo Filter out group 8, Ctrl+Z",
"Redo", "Undo history", and further down "Previous selection, Ctrl+Alt+Z".)* "So if I'd opened that
first, it would have told me Ctrl+Z was going to undo the group 8 filter, and I wouldn't have
pressed it. But I'm not opening a menu to check what Ctrl+Z does. Nobody does that."

"And the Previous selection thing is sitting under Edit next to Select all, not under Undo. So
getting my selection back isn't an undo. OK... but it was the last thing that happened to me. In my
head the stray click is the thing Ctrl+Z should have brought back. Ctrl+Alt+Z I will never remember.
The button in the table I'd find again."

## Single Ease Question

**4 out of 7.** "The getting-back part was easy once I knew what I'd lost. The hard part was that
nothing told me what had changed, and the first thing I tried took away a filter I wanted. If I
hadn't read that black line I could easily have carried on with the students back in and not
noticed until the numbers were in a slide."

## Would he use this instead of his current tool?

"For this bit -- undoing filters -- yes, this is better than Gephi. Gephi's undo is basically
nothing, and its filters don't tell you what each one took out. Here each step has its count and
Undo tells you what it undid. That I'd use."

"But I wouldn't switch for it. What would worry me is the stray click: one click on the white and
my hand-picked selection is gone, and Ctrl+Z doesn't bring it back, it eats a filter instead. If
that happens right before I export a table, I'm exporting the wrong thing. I'd want the selection
thing to be on Ctrl+Z, or the click on empty space to not wipe it."

## Moderator notes

- Alex did not reach the scenario's designed end state (47 of 77, the degree >= 5 step turned off,
  group 8 kept on, selection restored). He ended at 27 of 77 with all three steps on and the
  selection restored, and was confident he was "back". Nothing on the starting screen marks the
  degree >= 5 step as a mistake, and the moderator's wording ("something just changed") pointed him
  at the most recent change, which was the cleared selection, not the filter. By his own reading
  of the task, he succeeded; by the scenario's end state, he did not.
- His first action was Ctrl+Z, as predicted. It skipped the cleared selection (not an undo step)
  and turned off the group 8 step, the one worth keeping. He read the undo line at once and
  recognised the mistake by name. He used Ctrl+Y, not Ctrl+Shift+Z.
- He found "Previous selection" through the table's scope line, not the Edit menu and not the key.
- He never used "Show in steps"; he opened the chip himself later.
- He skimmed past "among the 60 it reads" in the middle step's note.
