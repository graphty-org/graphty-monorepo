# Grade: session r5-s48b -- Alex (regular analyst), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`) is the Notes place after a save, a close and a
reopen from Recent projects. It lists both reminders, each on the right target: "Check the 1434
return from exile" with the chip "Medici", and "Marriages only; business ties are a separate list"
with the chip "Graph". The inspector shows Medici with "Node 1 note". The drawing, the key and
the PageRank coloring and sizing are unchanged. Alex named the Notes place on the left rail as
where he would read them, and the "1 note" link beside a node's name as the sign that a node has
one. This matches the answer key's B success state.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no uncommitted changes in the tool. Start: the Florentine
families setup (sample open, PageRank run, nodes sized and colored by PageRank, the PageRank run
selected).

## The answer against the key

- **Medici note (right).** Saved with Medici selected; the form read "About Medici" (`11.png`),
  and the card shows the chip "Medici" (`12.png`, `18.png`, `20.png`).
- **Network note (right).** Saved with Everything selected; the form read "About Graph" (`06.png`),
  and the card shows the chip "Graph" (`07.png`, `20.png`).
- **Kept (right).** Main menu, Save, then Save in the "Save Florentine families as" dialog
  (`13.png` to `15.png`, toast "Saved Florentine families in this browser."). After the reopen,
  the start screen's Recent projects row read "Florentine families -- In this browser - 15 nodes -
  Oct 11, 10:43 AM" (`16.png`). Opening it showed "Opened Florentine families" (`17.png`), and
  the Notes place listed both notes with their original times (`18.png`).
- **Local copy (extra, not a detour).** Alex also used "Save local copy..." (step 19). The file
  `downloads/Florentine families.graphty.json` (7,561 bytes) holds both notes with the right
  targets (`{"graph": true}` and `{"node": "Medici"}`). The key says that saving a local copy as
  well is not a detour.
- **Work kept.** `work.json`: the runs, layers, steps and sources are the same at the start and
  the end. The two notes are the only addition. Nothing is gone.
- **Reopened drawing.** The drawing came back framed lower (top-left node at about 590,216 in
  `17.png` against 569,157 in `12.png`), as the key's watch list describes for B. The colors,
  sizes and key are unchanged. Alex did not remark on it.

## Measures

- **Route:** the Notes place's "+" (Add note), not the `n` shortcut. Alex selected Medici through
  the find box and selected the whole graph through the Graph place's "Everything" row (not by
  pressing Escape twice). He saved through the main menu's Save (not Control+S) and reopened from
  the Recent projects row by position.
- **Steps:** 19 `real.mjs` steps after the start (02 to 20), several of them chaining two or three
  clicks. The key's success path is about 13 commands. The extra steps are the cancelled first
  note (2), the refused "Graph" click (1), the hover on "+" (1), the local copy (1) and the
  "1 note" click (1).
- **Wrong turns:** 1. The first Add note (step 04) opened with the PageRank run as its target
  ("About PageRank", `04.png`) because the run was selected. Alex read the heading, pressed Cancel
  before typing anything, and selected Everything instead. The step 08 click on "Graph" did nothing
  (`07.png` and `08.png` are byte-identical): the tool refused it because two controls share that
  name. That is an aiming slip caused by a duplicate accessible name (problem 4), not a wrong
  place, so it is not counted.
- **Recovery:** yes. The wrong turn was undone before anything was saved on the wrong target.
- **False "done":** none. The wrap-up's claims match the screens: both notes are tagged correctly,
  both came back after the reopen (`18.png`), and the local file holds them. Alex said that he
  could not tell whether the "1 note" click did anything (`19.png` and `20.png` are
  byte-identical). He did not claim that it worked. truth-on-screen holds.
- **Read as lost data:** no. Alex read "In this browser" and the start screen's warning as a risk,
  not as a loss. He did not read the Recent row and the Sample row with the same name as two
  different projects, and did not try Undo after the reopen.
- **Broken habit:** none.
- **Ease (from the transcript):** 5 of 7. It is not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced a screenshot. `leaks.json` shows no
  leaks over 41 calls. The tool refused one click as ambiguous and did nothing for that step,
  which is the tool working as documented.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind        | Problem                                                                                                                                                                                                                                                                                                                                | Evidence                                                                                                                     |
| --- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | wrong-target risk | Add note silently attaches to whatever is selected, which can be a run. The "+" tooltip says only "Add note N". The only cue is the small "About PageRank" heading over the empty box. A reader who types without reading that heading saves a note about the whole network onto the PageRank run.                                   | `03.png` (tooltip), `04.png` ("About PageRank"); transcript step 04 and "What took longest", first bullet                    |
| 2   | 2        | trust       | Save confirms "Saved ... in this browser." in a fading toast. The warning that the browser can clear projects, and the advice to save a local copy, appear only later on the start screen. A reader whose browser data is cleared, as on Alex's company laptop, loses the notes without being warned when they saved.                   | `15.png` (toast), `16.png` (start-screen warning); transcript steps 15 and 16, and "What took longest", third bullet         |
| 3   | 1        | feedback    | The header's "Local only" label reads the same before and after the save, and nothing on screen stays to say that the project is saved. Alex was "not sure that means saved".                                                                                                                                                          | `12.png` against `17.png` (same header); transcript step 12                                                                  |
| 4   | 1        | naming      | The Graph place on the left rail and a note's "Graph" chip share the name "Graph", so "go back to Graph" hit an ambiguous target once.                                                                                                                                                                                                 | `07.png` and `08.png` byte-identical; transcript step 08                                                                     |
| 5   | 1        | feedback    | "Save local copy..." downloads the file with no message on screen saying where it went.                                                                                                                                                                                                                                               | `18.png` and `19.png` byte-identical; transcript step 19                                                                     |
| 6   | 1        | feedback    | Clicking the inspector's "1 note" link while the Notes place is already open changes nothing visible, so the reader cannot tell whether it did anything.                                                                                                                                                                             | `19.png` and `20.png` byte-identical; transcript step 20                                                                     |
| 7   | 1        | findability | The nodes carry no names in the start drawing, so Alex had to search to find the Medici. The search was quick (`09.png`).                                                                                                                                                                                                              | `01.png`, `09.png`; transcript step 07                                                                                       |
