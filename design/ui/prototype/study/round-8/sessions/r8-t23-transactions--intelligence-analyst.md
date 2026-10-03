# Session: leave a reminder on a whole money trace -- Marcus, criminal intelligence analyst

Task as given by the moderator: "A month of card transfers is open, and the program has just
traced how money went from one account to another (if you do not work in banking, this is
example data). Leave a reminder on that whole trace, not on one account, and check that the
reminder says what it is about."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/.

## Start screen (shots/tasks/r8-t23-transactions/01.png)

Marcus: "Okay. Big hairball, as usual -- that's the whole month, nobody reads that. But the
right side is actually useful: ACC-271813 to ACC-233575, four accounts, three transfers, 4 Mar
to 9 Mar, dates in order. That's a money trail I could put in a report. On the left the same
trace is highlighted under 'Shortest paths'. A reminder -- that's a note. I want it on the
trail, not on one account. There's a three-dot thing next to the highlighted row. That's
usually where the stuff for that row lives."

## Step 1 -- what is the three-dot button

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/01.png task:r8-t23-transactions --hover "More"

Tooltip: "More actions Shift+F10". "Fine, it's a menu."

## Step 2 -- open it

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/02.png task:r8-t23-transactions --click "More actions"

Menu headed "ACC-271813 to ACC-233575" -- good, it says which thing it's for, the whole trail.
Long menu (rename, select members, analyze, create set, lock...), but near the bottom: "Add
note  N", "Open notes". "There it is."

## Step 3 -- click Add note

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/03.png task:r8-t23-transactions --click "More actions" --click "Add note"
    -> ambiguous: matches button "Add note" and menuitem "Add note N"; clicked the first; could not click (timeout)
    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/03.png task:r8-t23-transactions --click "More actions" --click "Add note N"
    -> nothing on screen is called "Add note N"
    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/03.png task:r8-t23-transactions --click "More actions" --key n

Marcus: "Clicked it, nothing happened. Hit N like the menu says -- menu is still sitting there
with Rename outlined. Great." (The click not landing is probably the test harness rather than
the app: a second, hidden "Add note" control shares the name. Pressing N with the menu open
only moved focus to the first item, which is what a menu does with a letter key that matches
no item's start... but "N" is printed right next to Add note, so he expected it to work.)

"Menu says N is the shortcut. Close the menu, pick the row, press N."

## Step 4 -- select the trail row, press N

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/04.png task:r8-t23-transactions --click "ACC-271813 to ACC-233575" --key n

Left panel switched to Notes. A box: "Note on: [orange dot] ACC-271813 to ACC-233575 (x)",
"Write a note", and "Notes are saved without a name. Add your name in Settings." Save / Cancel.

Marcus: "Okay, it's pinned to the trail, it says so before I write anything. The orange dot
matches the trace color. 'Saved without a name' -- that I don't like. Every entry in a case
file has who and when. I'd go put my name in, but not for a test."

## Step 5 -- write and save

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t23-transactions--intelligence-analyst/05.png task:r8-t23-transactions --click "ACC-271813 to ACC-233575" --key n --type "Pull bank returns for all 3 transfers, 4-9 Mar. Request subpoena." --click "Save"

Notes list: "1 note in this graph", my text, the chip "ACC-271813 to ACC-233575", "Oct 2,
2026, 19:31". The right panel for the trace grew a Notes section: "Note on: Path ACC-271813
to ACC-2335...", "1 note -- Open in Notes", "Add note (N)".

Marcus: "That's it. It's on the trail -- the side panel even calls it 'Path', and the note
shows up under the trail's own details, so next time I click the trail I see the reminder.
In the notes list the chip just says 'ACC-271813 to ACC-233575' -- out of context that reads
like a single transfer between two accounts, not a three-hop trail. The side panel saying
'Path' is the clearer one; the list should say it too. And there's an 'Add note' right in
the trail's side panel -- I'd have used that if I'd scrolled down; I didn't see it at the
start because it was below the fold."

## Wrap-up

- Succeeded? Yes. The reminder is attached to the whole trace and both the notes list and the
  trace's side panel say what it is attached to.
- Single Ease Question: 5 of 7. Getting the note on the trail and confirming it was easy; the
  menu item did not respond to a click or its printed shortcut while open, and I had to back
  out and use N on the selected row.
- Would I use this instead of my current tool? For this, maybe. i2 lets me put a note on a
  chart item, but not on a whole traced route as one thing; here the trail is one object with
  its own note, its own amounts and dates in order, and that's a real step up for a money
  trail. But notes without an author and a source and grade are not case notes yet, and the
  hairball and the website question (where does the data go -- it says "Local only", which
  helps) still decide whether IT lets me near it.

## Problems seen

1. The "Add note" item in the trace's More actions menu did not respond to a click in the
   session (another hidden control shares its name), and pressing its printed shortcut N with
   the menu open did nothing. Severity 2 (may be a harness artifact; worked around via the row
   plus N).
2. The note's chip in the Notes list shows "ACC-271813 to ACC-233575" with no "Path" label,
   so it can read as one transfer between two accounts; the side panel does say "Path".
   Severity 2.
3. "Notes are saved without a name" -- for an analyst, an unattributed note is not usable in a
   case file. Severity 2.
4. The trace's own "Add note" in the right panel sits below the fold at start, so the first
   route a user finds is the three-dot menu. Severity 1.
