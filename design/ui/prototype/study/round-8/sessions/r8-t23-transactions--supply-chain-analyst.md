# Session: leave a note on a whole money trace -- Dana Okafor (supply chain risk analyst)

Task as given: "A month of card transfers is open, and the program has just traced how money
went from one account to another (if you do not work in banking, this is example data). Leave a
reminder on that whole trace, not on one account, and check that the reminder says what it is
about."

All commands run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/.

## Start (shots/tasks/r8-t23-transactions/01.png)

Dana: "Not my world, but fine -- swap 'account' for 'supplier' and a trace is a route from one
supplier to another. Big colored hairball in the middle, I ignore that. Left list has 'Shortest
paths' and under it a row 'ACC-271813 t...' already highlighted. Right side says
'ACC-271813 to ACC-233575, Path', four accounts, three transfers. That's the trace. So I want
a note on THAT row, not on one of the four accounts. There's a little three-dot thing on the
row. That's usually where the 'more stuff' lives."

## Step 1 -- what is the three-dot button?

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/02.png task:r8-t23-transactions --hover "More"

Tool output: tooltip "More actions Shift+F10".

Dana: "More actions. OK, open it."

## Step 2 -- open the menu (03.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/03.png task:r8-t23-transactions --click "More actions"

Dana: "Good, the menu is headed 'ACC-271813 to ACC-233575', so it is about the whole trace, not
one account. Long menu -- Rename, Analyze, Create set, Lock... and down near the bottom 'Add
note' with N next to it. Plus 'Open notes'. That's it."

## Step 3 -- click Add note (04.png, 05.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/04.png task:r8-t23-transactions --click "More actions" --click "Add note"

Tool output: two controls are called "Add note" (a button and the menu item); it went for the
button, which could not be clicked (timed out).

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/05.png task:r8-t23-transactions --click "More actions" --click "Add note N"

Tool output: nothing on screen is called "Add note N".

Dana: "I clicked Add note and nothing happened. Clicked again, nothing. Annoying. It says N is
the shortcut, so let me just press N."

(Moderator note: the miss is at least partly the click-through tool -- a second, hidden "Add
note" control elsewhere on the page shadows the menu item. To a real user it would look like
a dead menu item only if the hidden button really sits on top; record it as a possible
problem, not a confirmed one.)

## Step 4 -- press N with the menu open (06.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/06.png task:r8-t23-transactions --click "More actions" --key n

Dana: "Pressed N with the menu up -- it just put a blue box round 'Rename'. Nothing else.
So the N shortcut doesn't work inside its own menu? Close the menu, the row's still selected,
try N on its own."

## Step 5 -- press N with the trace row selected (07.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/07.png task:r8-t23-transactions --key n

Dana: "There we go. Left side switched to 'Notes', with a box: 'Note on:' and a chip
'ACC-271813 to ACC-233575' -- that's the trace name, both ends, not one account. There's a text
box 'Write a note', Save and Cancel. Small gray line about adding my name in Settings -- don't
care, and it's tiny gray text again, I can barely read that on the laptop."

## Step 6 -- type the reminder and save (08.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t23-transactions--supply-chain-analyst/08.png task:r8-t23-transactions --key n --click "Write a note" --type "Check with compliance: 3 hops in 5 days, ends at flagged account" --click "Save"

Tool output: nothing on screen is called "Write a note" (the cursor was already in the box, so
the text went in anyway and Save worked).

Dana: "Cursor was already in the box, good, I just typed. Saved. Left list: '1 note in this
graph', my text, the chip 'ACC-271813 to ACC-233575' under it, date and time. And on the right
the trace's own panel grew a 'Notes' section: 'Note on: Path ACC-271813 to ACC-2335...', '1
note', 'Open in Notes'. So both places agree it is on the path, the whole thing. The right one
even says 'Path'. The left chip doesn't say 'Path' -- if I had a note on account 271813 alone,
would that chip look different? Probably just 'ACC-271813'. Fine, I can tell. The right-side
label gets cut off at '2335...', which is the end account -- the bit you'd want to see."

Done.

## Wrap-up

Succeeded? Yes. The note is on the trace (the chip names both ends, and the trace panel says
"Path ... 1 note"), and I checked it says what it is about.

Single Ease Question: 5 of 7. Finding the place was easy -- the row was already selected and
the menu was titled with the trace. What cost me was the menu: "Add note" did nothing when I
clicked it, and pressing the N it advertises did nothing while the menu was open. I only got
there because I tried N again with the menu closed. A less stubborn person would have gone to
the Notes tab on the left and wondered how to attach it to the trace from there.

Would I use this instead of my current tool? Not for this. Notes on a route are nice -- in
Excel I'd put a comment in a cell, and nobody finds it again. But the notes live in this app; my
VP reads Power BI, compliance reads email. If I can't get the notes out with the list they
belong to, they're a scratchpad for me alone. And "Local only" at the top is the first thing
I'd point IT at -- good if it really means the data never leaves my laptop, but I'd want that in
writing before loading a supplier list.

## Problems seen

1. Menu item "Add note" did not respond to a click (may be the click-through tool picking a
   hidden duplicate "Add note" button; check whether a real pointer hits the menu item). Sev 3.
2. The advertised shortcut N does nothing while the row's menu is open; it only works after
   the menu is closed. Sev 2.
3. The trace panel's "Note on: Path ACC-271813 to ACC-2335..." truncates the end account, the
   part that tells two traces from the same start apart. Sev 2.
4. The note list chip says "ACC-271813 to ACC-233575" with no "Path" word, unlike the trace
   panel's chip; whether a note is on a trace or on an account is inferred from the "to". Sev 1.
5. Small gray helper text in the note form ("Notes are saved without a name...") is hard to
   read at laptop size. Sev 1.
