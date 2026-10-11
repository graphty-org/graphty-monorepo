# Grade: session r3-s52 -- Grace (tier 1 graduate, returning), friends (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`17.png`), taken after the project was saved, closed and
reopened from Recent projects, shows the Notes place with both reminders: "Spring list, checked
against the sign-up sheet" with the chip "Graph", and "Moving away in May; ask who takes over the
Tuesday run" with the chip "Farah", both dated Oct 10, 6:28 PM. The inspector reads "Graph, From
friends.csv 1 note". Each note is on the right target, both came back after the reopen, and Grace
named where to read them (the Notes place on the left rail, and the "1 note" link when Farah is
picked). This matches the key's success state for A.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked` (friends.csv loaded, PageRank run, sized and
colored by it). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Farah note (right).** Farah found with the find box (`06.png`), picked (`07.png`), form
  "About Farah" (`08.png`), saved with the chip "Farah"; the inspector then reads "Farah, Node
  1 note", PageRank "0.06394, #1 of 20" (`09.png`).
- **Club note (right).** A click on empty canvas made the graph the selection; the form read
  "About Graph" and the inspector showed 20 nodes, 41 edges (`10.png`); saved with the chip
  "Graph" (`11.png`).
- **Saved (right).** Main menu, Save; the dialog "Save friends as" (`13.png`); named "running
  club" and saved; header "running club" and the toast "Saved running club in this browser."
  (`14.png`). Saving under a new name is allowed: the key asks only that the project be saved.
- **Kept after reopening (right).** Recent projects lists "running club, In this browser - 20
  nodes - Oct 10, 6:29 PM" (`15.png`); opening it shows "Opened running club" and the inspector's
  "From friends.csv 1 note" (`16.png`); the Notes place lists both notes (`17.png`). `work.json`
  agrees: two notes at the end, the PageRank run, the three style layers and the source unchanged,
  nothing gone.
- **Not a failure.** Not `not-kept`, not `wrong-row` (one note on Farah, one on the graph), no note
  typed into another field.

## Why S and not SD

The key gives SD for "one note on the wrong target fixed after a detour". No note was ever saved
on a wrong target: Grace opened the note form while the PageRank run filled the inspector, read
"About PageRank" (`04.png`) and pressed Cancel before typing anything (`05.png`). That is a wrong
turn (counted below), not a misplaced note.

## Measures

- **Steps:** 17 screenshots; 16 `real.mjs` steps after the start (`02.png` to `17.png`). The key's
  keyboard route is about 12. The extra steps: a hover on the Notes "+" to read its tooltip (1),
  the aborted "About PageRank" form and its Cancel (2), and the Notes rail button and "+" by click
  in place of `n`. About 1.3x.
- **Wrong turns:** 1. Opening a note while the PageRank run was in the inspector (`04.png`),
  undone with Cancel (`05.png`).
- **False "done":** none. "Done, so I'm ending" (`17.png`) is true: both notes, right targets,
  listed after a reopen. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Each Save note listed the card at once; Save showed a toast and renamed
  the header.
- **Numbers that disagree:** none. "From friends.csv 1 note" counts only the graph's own note;
  Grace did not read it as the Farah note missing.
- **Broken habit:** none. Her history's save from the main menu led on to the task (`12.png`).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks and no calls.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind          | Problem                                                                                                                                                                                                                                  | Evidence                                                                         |
| --- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | 2        | mental-model  | A new note attaches to whatever the inspector shows. With the setup's PageRank run in the inspector, the Notes "+" (tooltip only "Add note N") opened a form "About PageRank". Nothing says to pick the target first. Cost a wrong turn and 2 steps. | `03.png`, `04.png`, `05.png`; transcript steps 3-4                               |
| 2   | 2        | status        | Nothing lasting says whether the project is saved: the header's "Local only" reads the same before and after, the save shows only a fading toast, and the notes look kept as soon as Save note is pressed. Grace saved only from her history's habit and says she "would have walked away thinking the notes were kept". | `11.png`, `13.png`, `14.png`; transcript step 13 and wrap-up                     |
| 3   | 1        | trust         | The start screen's "This browser can clear projects kept here. Save a local copy of any project you need to keep." left her unsure the notes would last until next quarter; she says she would also save a local copy.            | `15.png`; transcript wrap-up                                                     |
| 4   | 1        | wording       | The whole network is called "Graph" in the form ("About Graph") and on the chip; Grace would call it "the whole map" or use the project's name.                                                                                       | `10.png`, `17.png`; transcript wrap-up                                           |
| 5   | 1        | legibility    | No names are drawn on the nodes, so Farah could not be picked on the drawing; Grace used the find box.                                                                                                                                | `02.png`, `06.png`; transcript step 2                                            |
| 6   | 1        | discoverability | The reopened project lands on the Graph place, not Notes; the only sign of notes there is the inspector's small "1 note" link, which counts only the graph's own note.                                                              | `16.png`                                                                         |
| 7   | 0        | legibility    | Farah, the largest node, is half-covered by a smaller node in front of her, and the yellow selection halo surrounds both. Grace confirmed the pick from the inspector and did not comment.                                         | `09.png`                                                                         |

No severity 3 or 4: both notes landed on the right targets and survived the reopen, and the one
risk a reader would act on (leaving without saving) did not happen here because her history named
the save.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
