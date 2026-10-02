# Grades: leave a note on the Valjean-to-Javert chain as a whole

The task: "Your team already worked out the chain of characters linking Valjean to Javert with as
few go-betweens as possible. Leave a reminder attached to that chain as a whole -- not to either
man -- saying it should be checked against the book. You have never typed your name into this
program."

The intended path: in the graph list on the left, under Shortest paths, click the row "Valjean to
Javert". Its panel opens on the right; in that panel's Notes section press Add note (or N). The
left panel switches to Notes and opens a writing box already tagged with one chip, "Valjean to
Javert" (the path, not the two men). Type the reminder and press Save or Ctrl+Enter.

Grading rule: success means the path row was selected, Add note on its panel opened the writing
box with the "Valjean to Javert" chip, and the note was saved. Success with difficulty means the
same end state after first writing about Valjean or Javert and then correcting the subject, or
after reaching the row only by way of the Notes place. Failure means the note ended up about one
character, about both characters as two separate nodes, or about the graph. Grades go by what was
on screen at the end and what the participant concluded, not by how they rated themselves.

## Headline: three of four could not type, and that is the prototype's fault, not the design's

The click-through tool takes clicks, hovers and single key presses. It has no way to type a
string: a `--type "..."` argument is not an option it knows, and it skips unknown arguments
without a word. So three participants "typed" their reminder into nothing, saw an empty box and a
gray Save, and stopped. The fourth worked around it by pressing one key per letter, and his note
saved normally (his 06.png): the writing box, Save and Ctrl+Enter all work.

Every one of the four reached the part of the task the design is responsible for -- a writing box
tied to the path as one thing -- in two clicks, with no wrong turn. Only the saving step is
missing for three of them. They are graded "gave up" because the note was not saved and they
stopped; that grade must not be counted as a design failure. The task should be rerun for them
once the click-through tool can type, or with one key per letter.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Criminal intelligence analyst | success | success | Path row, then Add note on its panel; the box opened with the single "Valjean to Javert" chip and the cursor already in it. After two attempts that the tool could not type, he entered the text key by key and pressed Ctrl+Enter. 06.png: the note "Check this chain against the book" heads the Notes list with the path chip, "Just now"; the path's panel reads "1 note". No name was asked for. The fumbling was with the study tool, not the screen, so it does not lower the grade. |
| Gephi user | success with difficulty | gave up (prototype-blocked) | Same two clicks, same box with the one path chip (03.png); she noticed the path icon on the chip differs from the person icon on an older note tagged Valjean and Javert. Her text never entered (04-06.png: empty box, gray Save) and she stopped. Concluded correctly that the box was attached to the path; nothing was saved. |
| First-time explorer | success with difficulty | gave up (prototype-blocked) | Same two clicks, the box with one chip (03.png). Typing did not land (04-06.png) and she stopped. Concluded correctly that the box was on the chain, not on either man, but only by counting chips: one chip versus two on the older note. |
| Screen-reader analyst | success with difficulty | gave up (prototype-blocked) | Same two clicks, the box with one chip (02.png). Typing did not land (03-06.png) and he stopped. Concluded correctly that he was on the path's own Notes, but by where he came from, not by what the chip says. |

Totals: 1 success, 0 success with difficulty, 0 failure, 3 gave up. All three "gave up" grades
are caused by the prototype. Read as a test of the design, the finding is 4 of 4 reached the
correctly tagged writing box directly; 1 of 4 could be observed saving. Ease scores 6, 6, 5, 5.

## Design findings

Severity is Nielsen's 0 to 4. Counts are participants out of 4 who hit or remarked on it.

1. **A path chip reads almost like two person chips** -- severity 2, 3 of 4. The chip "Valjean to
   Javert" and an older note tagged "Valjean" and "Javert" differ only by the chip's small icon
   and by chip count. The explorer told them apart only by counting; the screen-reader analyst
   said spoken aloud they are nearly the same and asked for the word "path" in the chip's name;
   the Gephi user caught it from the icon. This is exactly the mistake the task warns against,
   and the design relies on an icon to prevent it.
2. **Add note on the right panel replaces the left panel with Notes** -- severity 2, 4 of 4
   remarked. The graph list the participant started from disappears ("a bit of a jump"; "a panel
   changed somewhere other than where I acted"). The chip kept the context, so nobody got lost,
   but for a screen-reader user it matters where focus lands, and nothing on screen says so. The
   intelligence analyst's keystrokes show focus does land in the box.
3. **A two-member path is called a chain with no go-betweens, and nothing says so plainly** --
   severity 2, 4 of 4 remarked. "2 nodes, 1 edge" with members Valjean and Javert made the
   explorer doubt the team's work ("there's nobody in the middle?") and does not explain itself to
   someone without graph words; the intelligence analyst asked for "direct link, no
   intermediaries". The "2" on the list row has no unit (screen-reader analyst). Not in the task's
   way, but it undermines trust in the result being annotated.
4. **No author on a saved note** -- severity 1, 3 of 4 remarked. Nobody wanted a name prompt, but
   the saved note shows only "Just now", and two participants said they would want "who wrote
   this" before sharing it.
5. **The right panel kept saying "No notes" while a draft was open** -- severity 1, 2 of 4.
   Cosmetic; it changes to "1 note" on save.
6. **"Made with: All at their defaults" does not say whether edge weights were used** --
   severity 1, 1 of 4 (Gephi user). For a fewest-go-betweens path that is the one setting she
   would check before citing it.
7. **The Notes count in the graph list (4) differs from the notes listed in Notes (5)** --
   severity 1, 1 of 4 (Gephi user). Possibly the pinned older-run note; she could not tell why.

## Prototype fidelity, not design findings

- The click-through tool has no way to type text and silently ignores the argument the
  participants used for it. It should either support typing or report an unknown argument, the
  way it reports "nothing on screen is called ...".
- "Nothing on screen is called Write a note" is also the tool: it finds controls by name, label
  or visible text, not by placeholder. The writing box does have a name ("Note text"), so the
  screen-reader analyst's fear of an unnamed box is not borne out. A smaller point stands: the
  name heard ("Note text") differs from the words seen ("Write a note"); keeping them the same
  helps voice-control users. Severity 1.
- "Nothing on screen is called Save" was a disabled Save on an empty box, which is correct
  behavior. The screen-reader analyst's request to hear "Save, unavailable" rather than have it
  skipped is worth checking in the real build.
- The explorer read the darkest, largest dot as "most important" without reading the legend; off
  the task's path and noted only.
