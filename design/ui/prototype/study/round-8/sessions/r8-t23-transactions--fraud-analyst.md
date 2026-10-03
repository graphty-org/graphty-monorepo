# Session: leave a note on a whole money trace -- Sarah, fraud analyst

Task as given: "A month of card transfers is open, and the program has just traced how money
went from one account to another. Leave a reminder on that whole trace, not on one account, and
check that the reminder says what it is about."

Mode: first impression (not mandated). Renders are in
tmp/round-8-sessions/r8-t23-transactions--fraud-analyst/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <png> task:r8-t23-transactions`
followed by the steps listed.

## Start screen (shots/tasks/r8-t23-transactions/01.png)

"Okay, the usual hairball in the middle, I'm ignoring it. The useful part is on the right: from
271813 to 233575, three transfers, 22,397.82, 4 to 9 March, dates in order. That's a
pass-through and I can read it, good. The trace has a row on the left, 'ACC-271813 t...', and it
is highlighted. If I want to tag the whole thing, I go to that row, not to an account. There's a
'...' on the row. Let's try it."

## Step 1 -- open the row menu (01.png)

Steps: `--click "More actions"`

"Big menu. Rename, Analyze, Create set... way down: 'Add note', N. Fine, that's what I want. The
menu header says 'ACC-271813 to ACC-233575', so it's the trace, not one account."

## Step 2 -- click Add note (02.png)

Steps: `--click "More actions" --click "Add note"`

Tool output: two things are called "Add note"; it clicked the first, then timed out. The menu
stayed open; behind it the right-hand panel scrolled down to a Notes section ("Note on: Path
ACC-271813 to ACC-2335...", "No notes. Add note (N)").

"I clicked Add note and the menu's still sitting there. Something moved on the right, a Notes
box I hadn't seen, but no place to type. Did it do anything? Not obviously."

## Step 3 -- the menu item again (03.png)

Steps: `--click "More actions" --click "Add note N"`

Tool output: nothing on screen is called "Add note N". No change.

"Clicking it again does nothing. Annoying."

## Step 4 -- press N with the menu open (04.png)

Steps: `--click "More actions" --key n`

"The menu says N is the shortcut. I press N... it only highlighted Rename. So the shortcut
printed in the menu doesn't work while that menu is open. Escape and try N on its own."

## Step 5 -- press N with the trace row selected (05.png)

Steps: `--key n`

"That worked. The left side switched to Notes and there's a form: 'Note on:
ACC-271813 to ACC-233575', with an x to remove it, and a box 'Write a note'. That's the trace,
from-to, not one account. It also tells me notes are saved without a name unless I add one in
Settings. For a case file that matters -- my reviewer needs to know who wrote it -- but not
today's problem."

## Step 6 -- type and save (06.png)

Steps: `--key n --click "Write a note" --type "Pull KYC on 946224 and 670564 - rapid
pass-through 4-9 Mar, check for SAR" --click "Save"`

Tool output: nothing on screen is called "Write a note" (the box was already focused, so the
text went in anyway).

"Saved. The Notes list says '1 note in this graph', my text, and under it a tag 'ACC-271813 to
ACC-233575' with the orange dot, dated Oct 2, 2026, 19:30. On the right, under the trace, the
Notes section now says 'Note on: Path ACC-271813 to ACC-2335...', '1 note -- Open in Notes'. So
both sides agree it's on the path."

## Step 7 -- check what the tag means (07.png)

Steps: `--key n --type "..." --click "Save" --hover "ACC-271813 to ACC-233575"`

Tooltip: "Select ACC-271813 to ACC-233575".

"The tag on the note just says the two account numbers. In the notes list it does not say
'path' or 'trace' -- only the right panel does. Someone reading the list later could take it
for a note about the transfer between those two accounts, not the three-hop route through
946224 and 670564. The colored dot matches the trace color, but I paste this into a
grayscale case file, so the dot tells me nothing. I'd want it to say 'Path' or 'trace, 3
transfers' in the list too. Good enough to say it's attached to the trace, though."

## Wrap-up

- Succeeded? Yes. The note is attached to the trace (from-to), not a single account, and both
  the note list and the trace's panel show the link.
- Single Ease Question: 5 of 7. Finding "Add note" was quick; the clicks that did nothing, and
  the N shortcut that doesn't work while the menu is open, cost me a minute and some trust.
- Would I use this instead of my current tool? "For notes, not yet instead -- alongside. My case
  system is where notes have to live for audit, and these are saved without my name unless I go
  set it. If I could export the trace with the note on it for the case file, it beats writing
  'see hops 1 to 3' in a Word doc. The trace panel itself is the best thing here: amounts, dates,
  in order, in words. That's half a pivot table I didn't have to build."

## Problems seen

1. Clicking "Add note" in the row menu did not open the note form; the menu stayed open (two
   controls share the name; the menu item could not be reached by its label).
2. The N shortcut shown in the menu does not work while the menu is open; it moves the menu
   highlight instead.
3. In the notes list, the note's tag reads only "ACC-271813 to ACC-233575" with a color dot;
   only the right panel says "Path". Ambiguous in print or grayscale.
4. Notes saved without an author unless a name is set in Settings -- weak for an audit trail.
