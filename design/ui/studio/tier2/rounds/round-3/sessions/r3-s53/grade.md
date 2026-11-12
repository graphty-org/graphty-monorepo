# Grade: session r3-s53 -- Dev (tier 1 graduate, returning), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screen (`17.png`) was taken after the project was saved, closed,
reopened from Recent projects and saved again as a local copy. It shows the Notes place with both
reminders: "Marriages only; business ties are a separate list" with the chip "Graph" (Oct 10,
6:32 PM), and "Check the 1434 return from exile" with the chip "Medici" (Oct 10, 6:31 PM). The
inspector reads "Graph, From Florentine families 1 note". Each note is on the right target, both
came back after the reopen, and Dev named where to read them (the Notes place on the left rail,
and the "1 note" link by Medici or the graph). This matches the key's success state for B.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked` (Florentine families sample, PageRank
run, sized and colored by it). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **Medici note (right).** Medici found with the find box (`05.png`), picked (`06.png`: yellow
  halo, inspector "Medici, Node", PageRank 0.1458, #1 of 15), form "About Medici" (`07.png`),
  saved with the chip "Medici"; the inspector then reads "Medici, Node 1 note" (`08.png`).
- **Network note (right).** A click on empty canvas made the graph the selection; the form read
  "About Graph" and the inspector showed 15 nodes, 20 edges (`09.png`); saved with the chip
  "Graph", newest on top (`10.png`).
- **Saved (right).** Main menu, Save (`11.png`); the dialog "Save Florentine families as"
  (`12.png`); saved under the same name, toast "Saved Florentine families in this browser."
  (`13.png`). The project is saved as "Florentine families", as the key asks.
- **Kept after reopening (right).** Recent projects lists "Florentine families, In this browser -
  15 nodes - Oct 10, 6:32 PM" (`14.png`); Dev opened the Recent projects row, not the sample of
  the same name (`15.png`, "Opened Florentine families", PageRank still on); the Notes place lists
  both notes (`16.png`, `17.png`). `work.json` agrees: two notes at the end, the PageRank run, the
  three style layers and the source unchanged, nothing gone.
- **Local copy (extra, allowed).** "Save local copy..." downloaded `Florentine families.graphty.json`
  (7,553 bytes), which holds both note texts. The key says a participant who also saves a local
  copy took no detour.
- **Not a failure.** Not `not-kept`, not `wrong-row` (one note on Medici, one on the graph), no
  note typed into another field.

## Why S and not SD

The key gives SD for "one note on the wrong target fixed after a detour". No note was ever saved
on a wrong target: Dev opened the note form while the PageRank run filled the inspector, read
"About PageRank" (`03.png`) and pressed Cancel before typing anything (`04.png`). That is a wrong
turn (counted below), not a misplaced note.

## Measures

- **Steps:** 17 screenshots; 16 `real.mjs` steps after the start (`02.png` to `17.png`). The key's
  route is about 12. The extra steps: the aborted "About PageRank" form and its Cancel (2), the
  Notes rail button and "+" by click in place of `n`, and the optional local copy (1). About 1.3x.
- **Wrong turns:** 1. Opening a note while the PageRank run was in the inspector (`03.png`),
  undone with Cancel (`04.png`).
- **False "done":** none. "Yes. Both reminders are in ... I saved, closed and reopened, and both
  came back" is true on `16.png` and `17.png`. "I think it worked? The download says so" about the
  local copy is hedged and true (the file holds both notes). truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** "Save local copy..." showed nothing in the app, only the browser's download
  (`17.png`), where Save shows a toast (`13.png`). Dev noticed and was unsure.
- **Numbers that disagree:** none. "From Florentine families 1 note" counts only the graph's own
  note; Dev read it correctly as the graph's note.
- **Lost-data readings:** none. The start screen lists "Florentine families" twice (Recent
  projects and Samples, `14.png`); Dev picked the right row.
- **Broken habit:** none. The history's save from the main menu led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks and no calls.
- **Scripted exit:** not applicable; Dev finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                  | Evidence                                          |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1   | 2        | mental-model    | A new note attaches to whatever the inspector shows. With the setup's PageRank run in the inspector, the Notes "+" opened a form "About PageRank". Nothing on the Notes place says to pick the target first; Dev learned the rule only because the label changed. Cost a wrong turn and 2 steps. | `03.png`, `04.png`, `07.png`; transcript steps 2-3, wrap-up |
| 2   | 2        | status          | Nothing lasting says whether the project is safe: the header's "Local only" reads the same before and after Save, the save shows only a fading toast, and the start screen then warns "This browser can clear projects kept here." Dev asked "is Save actually safe for the deadline or not?" and saved a local copy as well. | `10.png`, `13.png`, `14.png`; transcript steps 12-13, wrap-up |
| 3   | 1        | feedback        | "Save local copy..." gives no message in the app; only the browser's download shows it happened, while Save shows a toast. Dev: "I think it worked? The download says so."                                                                                         | `17.png`; transcript step 16, wrap-up             |
| 4   | 1        | discoverability | The reopened project lands on the Graph place, not Notes; the only sign of notes there is the inspector's small "1 note" link, which counts only the graph's own note.                                                                                              | `15.png`                                          |
| 5   | 1        | legibility      | No names are drawn on the nodes, so Medici could not be picked on the drawing; Dev used the find box.                                                                                                                                                                  | `01.png`, `05.png`; transcript start, step 4      |

No severity 3 or 4: both notes landed on the right targets and survived the reopen, and the one
risk a reader would act on (leaving without saving) did not happen here because the history named
the save.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
