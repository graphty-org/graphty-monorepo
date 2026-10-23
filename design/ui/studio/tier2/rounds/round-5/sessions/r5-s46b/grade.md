# Grade: session r5-s46b -- Elena (tier 1 graduate), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screen (`16.png`) is the answer key's B success state after a
reopen: the Notes place lists "Marriages only; business ties are a separate list" with the chip
"Graph" (Oct 11, 10:41 AM) above "Check the 1434 return from exile" with the chip "Medici" (Oct 11,
10:40 AM). The inspector header reads "From Florentine families 1 note". The project was saved as
"Florentine families" ("Saved Florentine families in this browser.", `13.png`), and the reopen went
through the Recent projects row ("In this browser - 15 nodes - Oct 11, 10:41 AM", `14.png`), not the
sample of the same name. Elena named the Notes button on the left rail as the place to read them,
and the inspector's "1 note" link as a second sign.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, with no uncommitted changes. Start: the Florentine families sample with
PageRank run and nodes sized and colored by it; no notes (`work-start.json`).

## The answer against the key

- **Medici note (right target).** Selected the Medici by clicking the largest node (`02.png`:
  Medici, degree 6, PageRank #1 of 15), then the inspector "..." menu, "Add note" (`03.png`,
  `04.png` "About Medici"), typed and saved (`06.png`, chip "Medici", inspector "1 note").
- **Graph note (right target).** The Notes "+" first opened another "About Medici" form (`07.png`)
  because the Medici was still selected. She saw the label before typing, pressed Cancel
  (`08.png`), which also cleared the selection (the inspector switched to "Graph"), and the next "+"
  opened "About Graph" (`09.png`). The note was saved with the chip "Graph" (`10.png`). No note was
  ever saved on the wrong target, so this is S, not SD.
- **Kept.** Main menu, Save, the "Save Florentine families as" dialog, Save (`11.png` to `13.png`).
  After `--reopen`, she opened the Recent row by clicking at 624,108 (`14.png`, `15.png` "Opened
  Florentine families"), then Notes (`16.png`): both notes, each on its target.
- **Work kept.** `work.json`: runs, layers, steps and sources are the same at start and end; the
  two notes were added; nothing gone.

## Measures

- **Route:** the inspector "..." menu "Add note" for the Medici, the Notes "+" for the graph, the
  main menu's Save, Recent projects, the Notes rail button. No keyboard shortcuts (`n`, Control+S)
  were used or looked for.
- **Steps:** 15 `real.mjs` steps after the start (step 9 holds both the typing and the Save note
  click). The key's success path is about 13. The two extra steps are the wrong turn below.
- **Wrong turns:** 1. Step 6: the Notes "+" while the Medici was still selected opened a second
  "About Medici" form (`07.png`); undone by Cancel at step 7. She predicted it in her own words
  before clicking ("will it stick to Medici again?").
- **False "done":** none. Every claim in the wrap-up holds on screen: both notes listed after the
  reopen (`16.png`), "1 note" on the graph header with nothing selected (`15.png`, `16.png`), "1
  note" on the Medici header (`06.png`, `07.png`, before the reopen; the Medici was not selected
  again after it, so that part is checked only before the save). truth-on-screen holds.
- **Silent commit:** Cancel on the note form also cleared the node selection (`07.png` Medici
  selected with a halo, `08.png` inspector "Graph", no halo). It happened to be what she wanted, but
  nothing on the Cancel button says it deselects; she had planned a separate click on the
  background and did not need it.
- **Misreadings the key asks graders to record:** none. She picked the Recent row, not the sample
  ("Not the sample one -- the recent one"); she noticed the reopened drawing had moved ("The dots
  shifted a little") and did not read it as lost work; she did not read the graph's "1 note" as the
  Medici note missing; no undo attempt after the reopen.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Sixteen screenshots for 15 steps plus the start;
  `leaks.json` shows no leaks over 34 calls.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                                       |
| --- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback | Nothing lasting says the project is saved or what "in this browser" means for the next visit. The header's "Local only" reads the same before and after the save, the confirmation is a toast, and the start screen says "This browser can clear projects kept here." Elena saved but was unsure it would last a week; she trusted it only because the reopen worked. | `10.png`, `13.png` (header "Local only" before and after); `14.png` (warning line); wrap-up "Does 'Save' keep it or not?" |
| 2   | 2        | control  | The Notes "+" always targets the current selection, and the form has no way to change the target ("About Medici" is a label, not a choice). To write a note about the whole graph after a node note, the reader must find a way to clear the selection first. Elena caught it only by reading the small "About Medici" label; a reader who types straight away saves the graph note on the Medici. | `07.png` ("About Medici" again after the Medici note was saved); steps 6-7; wrap-up "I'd have liked to just pick 'whole graph' right there" |
| 3   | 1        | feedback | Cancel on the note form also clears the node selection, a side effect nothing on the button announces. It helped here, but a reader who cancels to rewrite a node's note loses the node.                                                                                                                                           | `07.png` (Medici selected) against `08.png` (inspector "Graph", no halo) after only Cancel                     |
| 4   | 1        | layout   | The reopened drawing is framed smaller and lower than before the save (the open camera question the key names). Elena noticed and dismissed it; colors, sizes and the key are unchanged.                                                                                                                                         | `13.png` against `15.png`; wrap-up "The dots shifted a little"                                                 |

Problem 1 repeats earlier T19 and save findings by other participants (round 1's r1-s40 and r1-s42,
round 2's r2-s46 and r2-s47, all at severity 2 on the same "Local only" label and fading toast), so
it is confirmed. Problem 4 is the known framing difference the key records on every build.
