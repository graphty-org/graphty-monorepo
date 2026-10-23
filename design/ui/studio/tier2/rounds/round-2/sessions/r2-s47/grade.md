# Grade: session r2-s47 -- Grace (returning), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screen (`16.png`) and the one before it (`15.png`), taken after
closing and reopening the project from Recent projects, show the Notes place listing both
reminders: "Marriages only; business ties are a separate list" with the chip "Graph" (Oct 9,
8:56 PM) above "Check the 1434 return from exile" with the chip "Medici" (Oct 9, 8:55 PM). Each
note is on the right target. The project was saved as "Florentine families" in this browser
(`11.png`, `12.png`), and the reopened copy came from the Recent projects row, not the sample of
the same name (`13.png`, `14.png`). Grace showed the Notes place, which the key accepts, and also
pointed at the inspector's "1 note" links (`16.png` Medici "Node 1 note"; `15.png` Graph "From
Florentine families 1 note"). No detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: Florentine families with PageRank run and sized and colored by it
(`florentine-ranked.txt`).

## The answer against the key

- **Both notes, right targets (right).** `10.png` and `15.png`. `work.json` agrees: two notes at
  the end, none at the start, nothing gone; runs, layers and sources unchanged.
- **Kept (right).** Control+S opened "Save Florentine families as" (`11.png`); Save showed "Saved
  Florentine families in this browser." (`12.png`); the start screen after the reopen lists
  "Florentine families -- In this browser - 15 nodes - Oct 9, 8:57 PM" (`13.png`).
- **Shown where she would read them (right).** `15.png` (Notes place after the reopen), then
  `16.png` (the Medici chip selects the Medici; inspector "Node 1 note").
- **Not a wrong answer.** Not `not-kept`, not `wrong-row` (the graph's note says "About Graph",
  `09.png`; the Medici note says "About Medici", `04.png`), and no note typed into another field.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `16.png`). The key's route for B is
  about 14 (find Medici, n, type, save, Escape Escape, n, type, save, Control+S, Save, reopen,
  click the row, Notes). Grace's extra moves are the hover over "+" (step 6) to learn what it would
  attach to, and the Medici chip click (step 15) after the task was already shown; clicking the
  dot instead of the find box and opening the "..." menu cost about one step more. About 1.1x.
- **Wrong turns:** 0. The hover and the click on empty space (steps 6 and 7) were a deliberate
  check before adding the graph's note, and both moved toward the goal.
- **False "done":** none. Her "Yes" is true: both notes, both targets, kept and shown after the
  reopen (`15.png`). truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Each Save note listed the note at once with its chip and date; the save
  showed its toast.
- **Numbers that disagree:** none. The Graph header's "1 note" counts only the graph's note, while
  the project holds two; Grace read it as the graph's own note, not as the Medici note missing.
- **Broken habit:** none. Her history's save habit (Control+S, Save as, Recent projects) worked
  as before.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; no refused click.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                      | Evidence                                                                                          |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback        | The Notes "+" tooltip reads only "Add note N" while the Medici is still selected; nothing says the new note would attach to the Medici. Grace cleared the selection first to be safe and learned the target ("About Graph") only after pressing it. A user who trusts "+" with a node selected files the whole-network note on that node. The tooltip also covers the first note's text. | `07.png`; transcript step 6-8 and end: "It didn't say whether it would go on the Medici"           |
| 2   | 2        | feedback        | Nothing says notes are kept only with a saved project, and nothing lasting says the project is saved: "Local only" reads the same before and after, and only a fading toast confirms. Grace saved only from habit and was unsure the notes would survive without it; the start screen's "This browser can clear projects kept here" made her doubt "next time" itself.            | `10.png`, `12.png` header "Local only"; `13.png` warning line; transcript end                       |
| 3   | 1        | naming          | Recent projects and Samples both show "Florentine families" on the start screen; the participant had to pick the Recent row on purpose, and opening the sample would show the network with no notes.                                                                                                       | `13.png`; transcript step 13                                                                        |
| 4   | 1        | discoverability | From a node's inspector the only way to add a note is the "..." menu; the panel has no note field or button. Grace found it on the first look, so no time was lost.                                                                                                                                        | `02.png`, `03.png`                                                                                  |
| 5   | 1        | legibility      | No names on the dots, so Grace had to guess the largest middle dot was the Medici and click to check.                                                                                                                                                                                                      | `01.png`, `02.png`; transcript step 1                                                               |
| 6   | 1        | wording         | "About Graph" for a note on the whole network; Grace understood it but called it "a computer word" she would not use with her board.                                                                                                                                                                      | `09.png`, `10.png` chip "Graph"; transcript end                                                     |
| 7   | 1        | discoverability | The reopened project lands on the Graph place, not Notes; the only sign of notes there is the inspector's small "1 note" link, which counts only the graph's own note.                                                                                                                                   | `14.png`                                                                                            |
| 8   | 0        | layout          | After the reopen the drawing is framed lower and a little smaller (top-left node about 569,157 before, 590,216 after) with the same shape, colors, sizes and key. Grace called it the "same map". Not work lost.                                                                                         | `07.png` against `14.png`                                                                           |

No severity 3 or 4: the notes landed on the right targets, survived the reopen, and nothing on
screen led Grace to a wrong conclusion. Problems 1 and 2 are severity 2 because each would put a
less careful user on the wrong path (a whole-network note on the Medici, or notes left unsaved).

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
