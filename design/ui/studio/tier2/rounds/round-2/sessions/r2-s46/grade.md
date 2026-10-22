# Grade: session r2-s46 -- Jordan (returning marketing analyst), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`), taken after the project was saved, closed and
reopened from Recent projects, shows the Notes place with both reminders: "Marriages only;
business ties are a separate list" with the chip "Graph", and "Check the 1434 return from exile"
with the chip "Medici". The inspector for the Medici, opened from the note's chip, reads "Node 1
note". Each note is on the right target, both came back after the reopen, and Jordan showed where
to read them (the Notes place, and the "1 note" link). This matches the key's success state for B.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `florentine-ranked` (PageRank run, sized and colored, with the run's
Style tab open in the inspector).

## The answer against the key

- **Medici note (right).** Saved with "About Medici" (`09.png` to `11.png`), chip "Medici" in
  `19.png` and `20.png`.
- **Network note (right).** Saved with "About Graph" after a click on empty canvas made the graph
  the selection (`12.png`, `13.png`), chip "Graph" in `19.png` and `20.png`.
- **Saved (right).** Control+S, "Save Florentine families as", Save; toast "Saved Florentine
  families in this browser." (`15.png`, `16.png`). Recent projects lists "Florentine families --
  In this browser - 15 nodes - Oct 9, 8:59 PM" (`17.png`).
- **Kept after reopening (right).** Opened from the Recent projects row, not the sample of the same
  name (`17.png`, `18.png`); both notes listed in the Notes place (`19.png`). `work.json` agrees:
  two notes at the end, the run, the three style layers and the source unchanged, nothing gone.
- **Not a failure.** Not `not-kept`, not `wrong-row` (one note on the Medici, one on the graph),
  no note typed into another field.

## Why S and not SD

The key gives SD for "one note on the wrong target fixed after a detour". No note was ever saved
on a wrong target here: Jordan opened the note form while the PageRank run filled the inspector,
read "About PageRank" (`03.png`) and pressed Cancel before typing anything. That is a wrong turn
(counted below), not a misplaced note, so the SD condition does not apply.

## Measures

- **Steps:** 20 screenshots; 19 `real.mjs` steps after the start. The key's keyboard route is
  about 12. The extra steps: the Notes rail button and the "+" in place of `n` (twice), the
  aborted "About PageRank" form and its Cancel (2 steps), Find by click and type, and a final click
  on the Medici chip to check it. About 1.6x.
- **Wrong turns:** 1. Opening a note while the PageRank run was in the inspector (`02.png`,
  `03.png`), undone with Cancel (`04.png`).
- **False "done":** none. "I'm done" (`20.png`) is true: both notes, right targets, after a
  reopen. truth_on_screen: holds.
- **Unverified belief (not a false "done"):** in the wrap-up Jordan says "Save note" alone does not
  keep a note past closing until the project is saved. Jordan never tested that; the session
  cannot confirm or refute it. Recorded as a belief about the save model (problem 4), not a claim
  that a step was done.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Earlier work kept (bar 2):** yes. Start and end lists in `work.json` differ only by the two new
  notes; `gone` is empty. The reopened drawing sits lower than before the save (top node about
  569,157 in `16.png`, about 590,216 in `19.png`), with the same colors, sizes and key: the framing
  difference the key records, not `work-lost`. Jordan did not remark on it.
- **Broken habit:** none. Jordan's habits from the history (Find to reach one item, Control+S,
  reopen to check a save) all led forward.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; the tool named each
  element it clicked.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | mental-model    | A new note attaches to whatever the inspector shows, and nothing in the Notes place says so or offers a way to choose. With the setup's PageRank run in the inspector, the Notes "+" offered "About PageRank", a run, not the Medici or the network. Jordan caught it only from the small "About" line and backed out; a less careful user would save it there. | `03.png` ("About PageRank" over an empty box); transcript step 3; wrap-up: "nothing in the Notes panel told me how to choose what a note is about" |
| 2   | 2        | discoverability | Making a note "about the whole network" required guessing that a click on empty canvas selects the graph. It worked, but it was a guess, and the Notes place gives no "about the graph" choice.                                                                                                                                                                  | `11.png`, `12.png` (inspector "Graph -- From Florentine families"), `13.png` ("About Graph"); transcript step 11 |
| 3   | 2        | status          | The header's "Local only" reads the same before and after the save, and the only sign of a save is a toast that fades. Jordan could not tell from the screen whether there was unsaved work, and the start screen's warning that the browser can clear projects made a browser save feel unsafe for work kept for months.                                        | `14.png`, `16.png` ("Local only" both times; toast in `16.png`); `17.png` (warning); wrap-up                   |
| 4   | 1        | mental-model    | "Save note" puts the note in the list, but whether the note lasts without saving the project is not shown anywhere. Jordan believed it does not, and saved because of a personal habit; a user without that habit could assume "Save note" was enough, or the reverse.                                                                                          | `11.png` (note listed, header unchanged); wrap-up: "someone else might assume 'Save note' was enough"         |
| 5   | 1        | wording         | The start screen lists "Florentine families" twice, under Recent projects (the saved work) and under Samples. Jordan noticed and chose the right one; nothing on the Recent row says it holds the notes.                                                                                                                                                         | `17.png`; transcript step 17                                                                                   |

No severity 3 or 4: the task was done with each note on its target, nothing was lost, and Jordan
left with a correct picture of where the reminders live. Problems 1 and 2 are the same design
question seen twice in one session (how a note's target is chosen); each counts toward
confirmation only with another participant.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
