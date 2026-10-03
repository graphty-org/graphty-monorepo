# Session: leave a note on a whole money trace -- the reporter with a contacts sheet (Ruth)

Task given by the moderator: "A month of card transfers is open, and the program has just traced
how money went from one account to another (if you do not work in banking, this is example data).
Leave a reminder on that whole trace, not on one account, and check that the reminder says what it
is about."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t23-transactions--data-journalist/.

## Start screen (shots/tasks/r8-t23-transactions/01.png)

Ruth: "OK, a hairball of dots, and a panel on the right that says ACC-271813 to ACC-233575, 'Path
from Shortest paths'. That is the trace, I think: four accounts, three transfers, 22,397.82. It
starts at a business and ends at a personal account flagged with risk 98. That's a story lead,
I want a note on it. There's a little speech-bubble 'Notes' on the far left. I'll try that rather
than poke at the three-dot menus."

## Step 1 -- open Notes

    timeout 120 node app-b/study.mjs --try .../01.png task:r8-t23-transactions --click "Notes"

(The tool reported three things called Notes and clicked the first, the left rail button.)

Ruth: "A Notes panel. 'No notes. Add note (N).' Fine. The right side still shows the trace, so I
hope 'Add note' knows what I'm looking at."

## Step 2 -- Add note

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t23-transactions --click "Notes" --click "Add note"

Ruth: "Good -- 'Note on:' and a chip already filled in: ACC-271813 to ACC-233575. That's the trace,
not one account; it uses the same name as the panel header. There's an x on it, so I could take it
off. It also tells me notes are saved without a name unless I set one in Settings. Fine, as long as
it keeps the date."

## Step 3 -- write and save

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t23-transactions --click "Notes" --click "Add note" --click "Write a note" --type "Check with bank: three hops in five days, ends at flagged account" --click "Save"

(The tool said "nothing on screen is called 'Write a note'" -- that is only the grey placeholder
text, not a label -- but the cursor was already in the box, so the typing landed and Save worked.)

Ruth: "Saved. Left list: '1 note in this graph', my text, the chip ACC-271813 to ACC-233575, and a
date and time, Oct 2, 2026, 19:30. Good, it kept the date. And on the right, under the trace,
there's now a Notes section: 'Note on: Path ACC-271813 to ACC-2335...', '1 note -- Open in Notes'.
That one says Path in words, which is what I wanted to check."

## Step 4 -- check what the chip points at

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t23-transactions --click "Notes" --click "Add note" --type "Check with bank: three hops in five days, ends at flagged account" --click "Save" --hover "ACC-271813 to ACC-233575"

Ruth: "Tooltip: 'Select ACC-271813 to ACC-233575'. So the chip takes me back to it. My worry: in the
notes list the chip just says 'ACC-271813 to ACC-233575' with no word 'path' or 'trace'. A
fact-checker reading that cold could think it's one transfer straight from the first account to the
last -- and there isn't one. The right panel says 'Path', the list doesn't. The orange dot matches
the path color in the legend, but I wouldn't rely on a dot. I'd also have liked to see the four
accounts listed in the note itself, so the note stands on its own if I export it."

## Outcome

- Did I succeed? Yes. The note is on the trace, not one account, and the right panel says
  "Path ACC-271813 to ACC-233575".
- Single Ease Question: 6 of 7. Two clicks and it guessed the right thing to attach to. One point
  off because the note list does not say the chip is a path, and because I only knew it was
  attached to the trace (and not an account) by reading the right panel.
- Would I use this instead of my current tool (a spreadsheet plus a notes app)? For notes, yes --
  this is the first time a note stuck to the thing I was looking at, with a date, without me copying
  IDs around. I'd still want to export the notes with the accounts and amounts they are about before
  I'd trust it as my source record.
