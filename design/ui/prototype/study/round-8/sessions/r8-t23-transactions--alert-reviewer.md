# Session: leave a reminder on a whole money trace -- Nadia, level-1 alert reviewer

Task as given: "A month of card transfers is open, and the program has just traced how money went
from one account to another (if you do not work in banking, this is example data). Leave a
reminder on that whole trace, not on one account, and check that the reminder says what it is
about."

Start screen: shots/tasks/r8-t23-transactions/01.png. Renders are in
tmp/round-8-sessions/r8-t23-transactions--alert-reviewer/.
All commands were run from design/ui/prototype; the prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t23-transactions` is shortened to `try NN`.

## Think-aloud

**01 (start).** "OK, a hairball, I ignore that. Right side is what I read: ACC-271813 to
ACC-233575, Path, 4 accounts, 3 transfers, sum 22,397.82, the end account is flagged with
riskScore 98. Four to nine March. That's the trace. Left side has the same thing highlighted
under Shortest paths. I need a note on all of that. There's a little three-dot thing at the top
right next to the name. I'll try that."

**02** `try 02 --hover "More"` -- the tooltip says "More actions Shift+F10". "Fine, more actions."

**03** `try 03 --click "More actions"` -- a dark menu opens next to the highlighted row on the
left, not on the right where I was looking. Its heading is "ACC-271813 to ACC-233575", so it's
the trace. "Rename, Analyze, Create set... Add note, N. That's it."

**04** `try 04 --click "More actions" --click "Add note"` -- the click didn't land; the menu is
still open. But the right panel scrolled down to a Notes box: "Note on: Path ACC-271813 to
ACC-2335...", "No notes. Add note (N)". "So it does know it's the path. Good, it says Path."

**05** `try 05 --click "More actions" --click "Add note N"` -- "nothing on screen is called Add
note N". "Fine."

**06** `try 06 --click "More actions" --key n` -- with the menu open, N only moved the highlight
to Rename. "That's not what the N next to it said it would do."

**07** `try 07 --key n` -- with no menu, N opens a Notes panel on the left: "Note on:" with a
chip "ACC-271813 to ACC-233575", an empty box "Write a note", Save (Ctrl+Enter), Cancel. Also:
"Notes are saved without a name. Add your name in Settings." "QA will want to know who wrote it.
I'm not going into Settings right now, but that's a problem in an alert file."

**08** `try 08 --key n --click "Write a note" --type "Check with L2: 3 hops in 5 days, 22,397.82
into flagged ACC-233575" --click "Save"` -- the tool said nothing is called "Write a note"
(that's the box's grey placeholder), but the cursor was already in the box, so the text went in
and Save worked. The left list: "1 note in this graph", my text, a chip "ACC-271813 to
ACC-233575", "Oct 2, 2026, 19:31". The right panel: "Note on: Path ACC-271813 to ACC-2335...",
"1 note -- Open in Notes".

"Does it say what it's about? Yes, the chip says the two end accounts. On the right it says
'Path', which is what I want. On the left, in the note itself, it just says 'ACC-271813 to
ACC-233575'. In my world that reads like ONE transfer from one account to the other, not a
three-hop trace. If QA opens the note list and not the trace, they could read it wrong. I'd want
'Path' or '3 transfers' on the chip there too."

## Outcome

- Succeeded? Yes, I think so. The note is on the trace (the right panel says "Path" and counts it),
  not on one account, and the note shows what it is attached to.
- Single Ease Question: 5 of 7. The menu's Add note didn't work for me the first time and N inside
  the menu did something else; pressing N on its own was what worked, and I only tried it because
  the menu printed the letter.
- Would I use it instead of my current tool? Not for my queue. Leaving a reminder here takes a
  minute, but the reminder lives in this program, not in the case system where QA looks, and it has
  no name on it unless I go set one. If I could copy the note plus a picture of the trace into the
  alert file, then maybe for the few alerts where the counterparties matter.

## Problems noticed

1. The menu item "Add note" did not respond to a click; the menu stayed open (03-04). Severity 3.
2. Pressing N while the menu was open moved the highlight to Rename instead of adding a note, even
   though the menu shows N as Add note's key (06). Severity 2.
3. The chip on the saved note reads "ACC-271813 to ACC-233575" with no "Path" or step count; to a
   banking reader "A to B" is one transfer. The right panel does say "Path" (08). Severity 2.
4. Notes are saved with no author unless a name is set in Settings; an alert file needs who wrote
   it (07). Severity 2.
5. The three-dot button at top right opened its menu over the left list, away from where I
   clicked (03). Severity 1.
