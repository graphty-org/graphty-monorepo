# Session: r8-t22, data journalist ("Ruth")

Task as given: "The Les Miserables network is open (example data, not your own). Leave yourself
two reminders for later: one on Valjean (why he matters to your reading) and one on the tie
between Javert and Valjean. Then check that each reminder sits with the right thing and say when
it was written."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t22--data-journalist/ (D below).

## 01 - start screen (shots/tasks/r8-t22/01.png)

"OK, the book network. Lots of stuff on the left I don't need -- PageRank, Louvain, shortest
paths. There's a Notes thing in the left list and a Notes icon on the far left. But I want the
note ON Valjean, so I'll start with him. His name is right there in the middle of the picture."

## 02 - click Valjean

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t22 --click "Valjean"

"He's picked: the right side says Valjean, Node, and a little label says '36 connections'. A
small bar of icons popped up under him. The last one looks like a speech bubble with a plus.
That's probably a note."

## 03 - rest the pointer on the speech-bubble icon

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t22 --click "Valjean" --hover "Add note"

"Tooltip says 'Add note' with a key, N. Good, that's what I wanted."

## 04 - click Add note

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t22 --click "Valjean" --click "Add note"

"The left side turned into a Notes list, and at the top there's a box that says 'Note on:
Valjean' with a little x. That's exactly what I want to see -- it tells me what it's attached
to before I write anything. It also says notes are saved without a name unless I put mine in
Settings. Fine; I just need the date. There are already a bunch of notes from someone else --
it's example data."

## 05 - try typing (my first attempt also tried clicking the empty box first)

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t22 --click "Valjean" --click "Add note" --click "Write a note" --type "Center of the book: 36 ties, top PageRank. Every chain runs through him."

Tool said: nothing on screen is called "Write a note". The text still went in -- the cursor was
already in the box.

"Oh, I didn't even have to click in it, it was ready. Text is in, Save is blue now."

## 06 - save the Valjean note

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t22 --click "Valjean" --click "Add note" --type "Center of the book: 36 ties, top PageRank. Every chain runs through him." --click "Save"

"Saved. It's at the top of the list now: my text, a chip that says Valjean, and 'Oct 2, 2026,
19:26'. Count went from 7 to 8 notes. Good. Now the tie. How do I pick a tie, not a person? In
the picture the lines are a hairball around Valjean and Javert, I am not going to hit the right
one with a mouse. There's 'Edges' at the bottom -- that's a table of the ties, I think."

## 07 - open the Edges table

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t22 [same steps] --click "Edges"

"A spreadsheet. Now I'm comfortable. source, target, Notes, value. Fifth row: Javert, Valjean,
17, and there's already a note bubble with a 1 on it. I'll click that row."

## 08 - click Javert (meant the row; got the wrong thing)

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t22 [same steps] --click "Edges" --click "Javert"

Tool: "Javert" matched 2 controls (a Javert chip in a note in the Notes list, and the table row);
clicked the first.

"Hm. Now the right side says Javert, Node, and the table flipped back to Nodes. I got the
person, not the tie. I think I hit the Javert tag in one of the old notes on the left instead of
the row. Annoying -- the same name is clickable in three places and they do different things.
Also my note's time now reads 19:27, not 19:26? Odd -- I guess that's just the clock since each
try is fresh. I'll go back to the table."

## 09 - clicking the row a few ways (all missed)

    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t22 [same steps] --click "Edges" --click "Javert Valjean 1 17"
    -> nothing on screen is called "Javert Valjean 1 17"
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t22 [same steps] --click "Edges" --click "Javert Valjean"
    -> nothing on screen is called "Javert Valjean"
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t22 [same steps] --click "Edges" --click "17"
    -> ambiguous, clicked the Courfeyrac / Enjolras row (also 17)

"Clicked the 17 and got Courfeyrac and Enjolras, which also have 17. Ugh. Two rows with the same
number. OK, close the notes list so I stop hitting the old note's tag, and click Javert in the
table."

(The repeated misses here are partly the click tool, not the app: a real pointer on the row would
have selected it. The real-app part is that the name "Javert" is a clickable tag in the notes
list right next to the table, and clicking it selects the person.)

## 10 - back to the Graph list, Edges, click the Javert row

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t22 --click "Valjean" --click "Add note" --type "Center of the book: 36 ties, top PageRank. Every chain runs through him." --click "Save" --click "Graph" --click "Edges" --click "Javert"

"There. Row is highlighted, right side says 'Javert -- Valjean, Edge', and at the bottom 'Sum
of value, 1 row: 17'. The little icon bar is back over the picture, with the same speech
bubble. That's the tie."

## 11 - note on the tie, save

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t22 [as 10] --click "Add note" --type "The pursuit: 17 shared scenes. Source: chapter list, check before using." --click "Save"

"Saved. Top of the list: my text, chip 'Javert -- Valjean' with a line icon, not a person icon,
'Oct 2, 2026, 19:29'. Under it my Valjean note with the Valjean chip, same date and time. Count
is 9. And the Notes column in the table for the Javert-Valjean row went from 1 to 2. That's the
check I trust: the tie itself now carries two notes, mine and the old one."

## Checking

- Valjean note: chip "Valjean" (person icon). Written Oct 2, 2026, 19:29 in the final run (19:26
  in my first save; each try is a fresh start).
- Tie note: chip "Javert -- Valjean" (line icon), table row count 1 -> 2. Written Oct 2, 2026,
  19:29.
- No name on either note, which is fine for me; the date is what I need for sourcing.

One thing that confused me looking at the old example notes: "Javert follows Valjean through the
whole book" has two separate tags, Valjean and Javert -- that's on the two people, not on the
tie, while another old note ("They share 17 chapters...") is on the tie. They look nearly the
same in the list. If I were skimming my own notes later I would not notice the difference
between "on both people" and "on the tie between them" unless I looked at the little icon.

## Verdict

- Succeeded: yes. Both notes are attached to the right thing and dated.
- Single Ease Question: 5 of 7. Valjean was easy and pleasant. The tie took several tries: you
  can't realistically click a line in that hairball, and in the table the name "Javert" is also a
  clickable tag in the notes list beside it, which grabbed the person instead.
- Would I use this instead of what I do now (notes in a separate doc next to a spreadsheet)?
  Probably yes, for this part. "Note on: Valjean" before I type, the date on each note, the
  note count right in the table row, and "Local only" at the top all speak to how I work. I'd
  want to see the notes come out in the export for the fact-checker before I commit to it.
