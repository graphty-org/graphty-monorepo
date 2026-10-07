# Grade: session r3-s20 -- Morgan (screen-reader participant), T12 prompt A (Les Miserables)

## Grade: S (success)

- Javert selected: the Inspector reads "Javert Node" (step 10), and the last screenshot (14.png)
  shows Javert in the Inspector header with his neighbors highlighted on the canvas.
- One fact read: "Degree 17" (step 10), plus id and name.
- Neighbors listed on screen by name: the region "Javert's 17 connections" with 17 buttons
  (step 13, 14.png). The answer names all 17, spelled as on screen, and says 17. Every name
  matches the answer list in answers.md.
- Route: the Degree row, reached by Tab and pressed with Enter (keyboard; neither a click on the
  word nor on the chevron). Find was reached by Tab, not by the `/` shortcut.
- No downloads were expected or saved.

## Claims

- Morgan's "That is the answer. I am done" (step 13) is true: the list is on screen and
  complete. No false "done". truth_on_screen: not applicable.

## Steps and wrong turns

- 13 tool steps (4 of them reads) against a 6-step success path; by keys, about 27 keystrokes
  against the keyboard path's 27, because Tab walks stood in for `/`.
- Wrong turns: 2, both small and undone at once -- Tab one past the Les Miserables sample
  (step 3, Shift+Tab back) and Tab past Find (step 6, Shift+Tab back). Neither cost the task.
- The usage card was left unanswered; the sample opened from the start screen with it still
  showing, which did not block anything.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Opening a sample from the start screen by keyboard leaves focus on the page body. The pressed button is gone and nothing takes focus; a screen-reader user hears "nothing" and has to browse to find where they are. | Step 4 (04.png); reproduced: `rounds/round-3/repro/r3-s20/repro.sh`, step 03 prints "focus: nothing (the page itself)" after "Les Miserables: 77 nodes, 254 edges" |
| 2 | 2 | build-defect | Choosing a node from the Find list announces nothing: no live text says Javert is selected or "1 selected", and focus lands on a group named "Summary values" whose name does not say whose values they are. Bar 8 asks for one announcement of the selection count. | Step 9 (09.png); reproduced: repro step 07 prints only "focus: group Summary values", no "live:" line |
| 3 | 2 | accessibility | The loaded workspace has no headings (the start screen has them), so heading navigation finds nothing. | Step 5 read (05.png) |
| 4 | 2 | wording | The "Degree 17" button does not say it opens the list of connections; Morgan pressed it on a guess and said a newer user would not. The list's own name ("Javert's 17 connections") is clear once reached. | Steps 11-12 (11.png, 12.png); debrief |
| 5 | 1 | accessibility | Typing in Find expands the list but says nothing about how many match (a miss does say "No match for ..."), so the count is learned only by arrowing. | Step 7 (07.png); repro step 05 |
| 6 | 1 | accessibility | "Graph" and "Data" in the left rail are read as buttons, but only "Graph" is a Tab stop, so "Data" looks unreachable by keyboard. | Steps 5-6 (05.png, 06.png) |
| 7 | 1 | opinion | Nothing on screen says what an edge means in this sample (shared chapters) or whether it carries a count. | Debrief |

Problems 2 to 7 are seen in this one session; 1 and 2 are build defects confirmed by the
scripted repro, which gives the same result on every run.

## What worked

- The load announcement said the dataset name and both counts once.
- The Overview gives node and edge counts, direction, density, components and degree range as
  text with no run.
- Find took the name and offered one option; Enter selected Javert.
- The connections list is a named region whose name carries the count, and every name is a
  real button, in alphabetical order.
