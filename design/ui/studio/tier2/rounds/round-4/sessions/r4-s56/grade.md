# Grade: session r4-s56 -- Jordan (regular analyst), Florentine families (T19 B), reminders that stay with the work

**Grade: S** (success). The last screenshot (`18.png`), taken after closing the app, reopening the
saved project from Recent projects and opening the Notes place, lists both notes with the right
text on the right target: "Check the 1434 return from exile" with the chip "Medici", and
"Marriages only; business ties are a separate list" with the chip "Graph", both timestamped Oct 11,
3:46 AM. The project was saved under its own name ("Saved Florentine families in this browser.",
`14.png`), and the start screen listed it under Recent projects as "Florentine families -- In this
browser - 15 nodes - Oct 11, 3:47 AM" (`15.png`). Jordan named the Notes place and Medici's "1
note" link as the places to read them. This is the answer key's S: both notes, each on the right
target, there after reopening, and the Notes place shown.

It is not SD. No note was ever saved on a wrong target: the first note form read "About PageRank"
(`03.png`), Jordan saw that before typing and cancelled, so nothing had to be fixed afterwards.
That is recorded as a wrong turn below, not as a note on the wrong target.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, sized and colored by
it; the PageRank run is the open inspector, `01.png`). Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Medici note (right).** Found Medici with the find box (`08.png`), selected its row (`09.png`:
  inspector Medici, PageRank 0.1458, #1 of 15), Notes, Add note: the form read "About Medici"
  (`10.png`). Saved; chip "Medici" (`11.png`). Medici's inspector header reads "Node 1 note".
- **Network note (right).** After cancelling the PageRank form, Jordan picked "Everything" in the
  Graph place and added the note there; the form read "About Graph" (`05.png`), saved with the
  chip "Graph" (`06.png`).
- **Kept.** Main menu, Save, the dialog "Save Florentine families as" with the name prefilled,
  Save (`12.png` to `14.png`). `--reopen` showed the start screen with the Recent projects row and
  the warning "This browser can clear projects kept here. Save a local copy of any project you
  need to keep." (`15.png`). Opening the row showed the toast "Opened Florentine families", Medici
  still selected, "1 note" on its header (`16.png`). Notes place: both notes (`17.png`, `18.png`).
- **Local copy.** Jordan also chose "Save local copy...", which downloaded
  `downloads/Florentine families.graphty.json` (7,561 bytes). The key says a participant who also
  saves a local copy took no detour.
- **Work kept.** `work.json`: start and end both hold one PageRank run (label Influence), the
  same three style layers and one source; the end adds the two notes; nothing gone.
- **Known screens.** The reopened drawing is framed lower and slightly smaller (top-left node about
  569,157 in `14.png`, 590,216 in `16.png`), as the key's watch list records; colors, sizes and key
  are unchanged. Jordan did not read it as lost work. The Samples list also shows "Florentine
  families" (`15.png`); Jordan opened the Recent projects row, not the sample.

## Measures

- **Steps:** 17 `real.mjs` steps after the start (`02.png` to `18.png`). The key's success path is
  about 11 actions (find, select, n, type, save, Escape Escape, n, type, save, Ctrl+S, Save,
  reopen, open, Notes); the extra steps are the cancelled PageRank form, the ambiguous click, the
  menu route to Save and the optional local copy.
- **Wrong turns: 1.** Step 03: the "+" in the Notes place opened a form about the PageRank run,
  because the setup left the PageRank run open in the inspector and Add note takes whatever the
  inspector shows (`03.png`, "About PageRank"). Jordan cancelled and went to Graph > Everything to
  get a network note. Recovered.
- **Not counted as a wrong turn:** step 07, `--click "Graph"` matched two controls (the rail's
  "Graph" button and the new note's "Graph" chip), so the tool refused it and nothing changed
  (`07.png` is byte-identical to `06.png`). Jordan meant the rail button and clicked it by
  position next. No move into a wrong place was made. It is recorded as a problem below because
  the two controls share one name.
- **False "done":** none. The end claims (two notes, the right tags, saved in the browser, came
  back after reopening, a local copy saved) are all true on `14.png` to `18.png` and in
  `downloads/`. truth-on-screen holds.
- **Silent commit:** none in the app's work. "Save local copy..." gave no in-app sign (below), but
  it did what it says.
- **Numbers that disagree:** none. PageRank 0.1458, #1 of 15 and the 15-node count match the key.
- **Broken habit:** none. The find box (a habit the history names) led straight to Medici.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the one refused click
  was the tool correctly refusing an ambiguous name, and `leaks.json` shows no leaks over 42
  calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | wrong-target    | Add note silently attaches the note to whatever the inspector shows. With the PageRank run open, the Notes place "+" opened a form "About PageRank" for a note meant for the whole network, and the form offers no way to change the target. Cost one wrong turn and three clicks to recover. | `01.png` (PageRank inspector), `03.png` ("About PageRank"); transcript step 03 and "What confused me" item 1                   |
| 2   | 2        | trust           | Nothing lasting says whether the project is saved. The header reads "Local only" before and after Save; only the Save dialog (by asking for a name) and a fading toast said anything. Jordan opened the main menu to check, and then closed and reopened the app to believe it.               | `11.png` and `14.png` (same header); `13.png` (Save dialog); `14.png` (toast); transcript steps 11 to 14                      |
| 3   | 1        | feedback        | "Save local copy..." downloads the file with no sign inside the app: no toast, no change on screen. Jordan knew only from the browser's own downloads.                                                                                                                                        | `18.png` is byte-identical to `17.png`; `downloads/Florentine families.graphty.json`; transcript step 18                      |
| 4   | 1        | naming          | The whole network has three names: "Everything" in the Graph place and its inspector, "About Graph" in the note form, "Graph" on the note's chip, which is also the name of the rail's "Graph" button. A click on "Graph" matched both and did nothing.                                        | `04.png`/`05.png` (Everything inspector, "About Graph"); `06.png` (chip "Graph"); `07.png` identical to `06.png`; step 07      |
| 5   | 1        | discoverability | After the network note was saved, the Everything inspector (where Jordan created it) shows no "1 note" link, unlike Medici's header, so the network note can be found only in the Notes place. Jordan did not look for it there, so it did not cost anything here.                           | `06.png`, `07.png` (Everything inspector header, no note link) against `11.png` (Medici "Node 1 note")                        |
| 6   | 1        | trust           | The start screen warns that the browser can clear projects kept there, so the in-app save is not a safe keep on its own. Jordan read it as a reason to also save a local copy (allowed by the key, not a detour).                                                                             | `15.png`; transcript step 15                                                                                                  |

All problems rest on this one participant and are not confirmed by this session alone. Problem 2
matches the key's own note that only the fading toast says the project is saved.
