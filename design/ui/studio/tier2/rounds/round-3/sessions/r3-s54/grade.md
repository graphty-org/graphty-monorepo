# Grade: session r3-s54 -- Jordan (regular analyst, returning), friends (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`, the same image as `19.png`), taken after the
project was saved, closed and reopened from Recent projects, shows the Notes place with both
reminders: "Moving away in May; ask who takes over the Tuesday run" with the chip "Farah" (Oct 10,
6:32 PM), and "Spring list, checked against the sign-up sheet" with the chip "Graph" (Oct 10, 6:31
PM). Farah is still picked and the inspector reads "Farah, Node 1 note", PageRank "0.06394, #1 of
20". Each note is on the right target, both came back after the reopen, and Jordan named where to
read them (the Notes place on the left rail, the "1 note" link by Farah, and "1 note" on the graph's
overview). This matches the key's success state for A.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked` (friends.csv loaded, PageRank run, sized and
colored by it). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Club note (right).** After cancelling a form that read "About PageRank" (`04.png`), Jordan
  clicked the graph's row in the Graph place; the inspector showed "Graph, From friends.csv" with
  20 nodes, 41 edges (`06.png`); the form read "About Graph" (`07.png`); saved with the chip
  "Graph", and the inspector then read "From friends.csv 1 note" (`08.png`).
- **Farah note (right).** Found with the find box ("Nodes 1: Farah", `10.png`), picked from its
  list (`11.png`); form "About Farah" (`12.png`); saved with the chip "Farah", inspector "Node 1
  note" (`13.png`).
- **Saved (right).** Main menu, Save; dialog "Save friends as" (`15.png`); kept the name; toast
  "Saved friends in this browser." (`16.png`).
- **Kept after reopening (right).** Recent projects lists "friends, In this browser - 20 nodes -
  Oct 10, 6:32 PM" (`17.png`); opening it shows "Opened friends" with Farah still picked and "1
  note" (`18.png`); the Notes place lists both notes (`19.png`, `20.png`). `work.json` agrees: two
  notes at the end, the PageRank run, the three style layers and the source unchanged, nothing
  gone. The local copy `downloads/friends.graphty.json` (8,423 bytes) is an extra the key allows
  ("a participant who saves a local copy as well took no detour").
- **Not a failure.** Not `not-kept`, not `wrong-row` (one note on Farah, one on the graph), no note
  typed into another field.

## Why S and not SD

The key gives SD for "one note on the wrong target fixed after a detour". No note was ever saved
on a wrong target: Jordan opened the form while the PageRank run filled the inspector, read "About
PageRank" (`04.png`) and pressed Cancel before typing anything. That is a wrong turn (counted
below), not a misplaced note.

## Measures

- **Steps:** 20 screenshots; 19 `real.mjs` steps after the start (`02.png` to `20.png`). The key's
  keyboard route is about 12. The extra steps: a hover on the Notes "+" to read its tooltip (1),
  the aborted "About PageRank" form, its Cancel and the walk back to the graph's row (3), one click
  refused by the tool (1, below), the Notes rail button and "+" by click in place of `n`, and the
  optional local copy (1). About 1.6x.
- **Wrong turns:** 1. Opening a note while the PageRank run was in the inspector (`04.png`),
  undone with Cancel and a pick of the graph (`05.png`, `06.png`). Step 9 (`09.png`, byte for byte
  the same as `08.png`) was a click the tool refused because "Graph" matched the rail button, the
  inspector title and the new note's chip; nothing happened. That is an aiming slip caused by a
  shared name (problem 5), not a wrong place.
- **False "done":** none. "I'm done: two notes, saved in the browser, checked after reopening, and
  a file copy as backup" (`20.png`) is true on every count. truth-on-screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit:** none for the notes or the save (each Save note listed its card at once; Save
  showed a toast). "Save local copy..." changed nothing on screen (`19.png` and `20.png` are the
  same image): only the browser's download said a file was written (problem 4).
- **Numbers that disagree:** none. "From friends.csv 1 note" counts only the graph's own note;
  Jordan read it that way.
- **Broken habit:** none. His history's find box led straight to Farah.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused; leaks.json shows no leaks and no calls. The transcript notes that
  `--brief` exited 2 although it wrote the briefing; the briefing is in the folder and the session
  ran normally, so it does not void the run.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                                   | Evidence                                                                 |
| --- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 2        | mental-model  | A new note attaches to whatever the inspector shows. With the setup's PageRank run in the inspector, the Notes "+" (tooltip only "Add note N") opened a form "About PageRank", and the form has no way to change the target. Cost a wrong turn and 3 steps; Jordan says a fast typist would have filed the club note under the run. | `03.png`, `04.png`, `05.png`, `06.png`; transcript steps 3-6, debrief |
| 2   | 2        | status        | Nothing lasting says whether the project is saved: the header's "Local only" reads the same before and after, and Save note looks like keeping. Jordan assumed the project was already saved until Save opened a naming dialog; he calls it "two different meanings of saved". | `13.png`, `15.png`, `16.png`; transcript steps 13 and 15, debrief      |
| 3   | 1        | wording       | The save dialog "Save friends as" does not say where the project goes; only the fading toast afterwards says "in this browser". Three menu items (Save, Save as..., Save local copy...) left him guessing which one survives a browser wipe until the start screen's small print answered it. | `14.png`, `15.png`, `16.png`, `17.png`; transcript steps 14-17, debrief |
| 4   | 1        | feedback      | "Save local copy..." downloads the file with no message from the app; the screen before and after is identical.                                                                                                                                         | `19.png`, `20.png` (same image); `downloads/friends.graphty.json`; transcript step 20 |
| 5   | 1        | accessibility-name | "Graph" names the rail button, the inspector title and the note chip at once; the tool refused the click as ambiguous and nothing happened. Cost one step.                                                                                           | `08.png`, `09.png` (same image); transcript step 9                      |
| 6   | 1        | legibility    | No names are drawn on the nodes, so Farah could not be picked on the drawing; Jordan used the find box.                                                                                                                                                   | `08.png`, `10.png`; transcript step 8, debrief                          |
| 7   | 1        | trust         | "Files are read on this computer and never uploaded." appears only on the start screen, not when saving; Jordan says this is the sentence a customer list would need at save time. An opinion, held one level down.                                       | `17.png`; debrief                                                       |

No severity 3 or 4: both notes landed on the right targets and survived the reopen, and the risk
a reader would act on (a club note filed under the PageRank run) was caught before saving.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
