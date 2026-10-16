# Grade: session r5-s47b -- Grace (tier 1 graduate), friends (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`18.png`) is the Notes place after closing and reopening
the project: two notes, "Moving away in May; ask who takes over the Tuesday run" with the chip
"Farah" (Oct 11, 10:42 AM), and "Spring list, checked against the sign-up sheet" with the chip
"Graph" (Oct 11, 10:41 AM). That is the key's A success state, word for word and each on the right
target. The project was saved in this browser first ("Saved friends in this browser.", `14.png`),
the app was reopened (`15.png`, Recent projects "friends -- In this browser - 20 nodes - Oct 11,
10:42 AM"), the project opened from Recent projects ("Opened friends",
`16.png`, PageRank row 20, Farah still selected), and the Notes place shown with both notes (`17.png`, unchanged in `18.png`). The
inspector beside it shows Farah with "Node 1 note", PageRank 0.06394, #1 of 20.

It is not SD. No note was ever saved on a wrong target: the first form read "About PageRank"
(`03.png`) and Grace pressed Cancel before typing anything.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the friends setup (friends.csv loaded, PageRank run, nodes sized
and colored by PageRank, the PageRank run left open in the inspector). Tool commit `753bae997bc6`,
no uncommitted changes.

## The answer against the key

- **Club note (right).** `05.png` "About Graph" after picking Graph > Everything; saved with the
  chip "Graph" (`06.png`).
- **Farah note (right).** Found through the find box, picked from its list (`08.png`, `09.png`:
  inspector "Farah, Node", PageRank #1 of 20); the form read "About Farah" (`10.png`); saved with
  the chip "Farah", and her inspector header then read "1 note" (`11.png`).
- **Kept (right).** Main menu > Save opened "Save friends as" (`13.png`), Save gave "Saved friends
  in this browser." (`14.png`). After `--reopen` both notes are listed again (`17.png`, `18.png`).
- **Work kept.** `work.json`: start and end runs, layers and sources identical; end notes are
  exactly the two key notes; nothing gone.
- **Downloads.** `downloads/friends.graphty.json` (8,423 bytes) holds both notes' text. The local
  copy was extra; the key counts the browser save alone as kept and says a local copy as well is no
  detour.

## Measures

- **Route:** Notes place "+" (not the `n` key); Graph > Everything to make the graph the subject;
  find box for Farah; Main menu > Save; reopen; Recent projects row; Notes.
- **Steps:** 17 `real.mjs` steps after the start. The key's success path is about 13 (with the
  menu save and the Notes click). The extra steps: the aborted "About PageRank" form and the walk
  to Graph > Everything (2), the refused "Graph" click (1, see below), and the local copy (1,
  allowed by the key).
- **Wrong turns:** 1 -- pressing Add note while the PageRank run filled the inspector, which opened
  a form about the run (`03.png`); recovered by Cancel, Graph > Everything (`04.png`, `05.png`).
- **Not counted as a wrong turn:** step 06 `--click "Graph"` was refused by the tool as ambiguous
  (the rail's Graph button and the saved note's "Graph" chip share the name) and changed nothing;
  Grace then clicked the rail button by position (`07.png`, `08.png`). It is the tool refusing an
  ambiguous command, not an app action, and does not void the run.
- **False "done":** none. Every claim in "Did I finish?" -- both notes, their targets, the browser
  save, both notes after reopening, "1 note" under Farah, the laptop copy -- is on screen
  (`14.png`, `17.png`, `18.png`) or in `downloads/`. truth-on-screen holds.
- **Silent commit:** "Save local copy..." downloaded the file with no message in the app
  (`18.png`); the save itself was the intended action, so it is not a silent commit, but see
  problem 4.
- **Read as lost data:** no. Grace did not read the "1 note" header, the drawing's framing or the
  start screen as notes missing; she opened Notes and found both.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 18 screenshots for 18 steps; `leaks.json` shows no leaks
  over 36 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind          | Problem | Evidence |
| --- | -------- | ------------- | ------- | -------- |
| 1   | 2        | wrong-target  | A new note attaches to whatever the inspector shows. With the setup's PageRank run open, the Notes "+" opened a form "About PageRank" for a note meant for the whole club, and the form offers no way to change the target. Grace caught it only by reading the small "About ..." line; cost one wrong turn and two steps. | `03.png`; transcript step 03 and "What confused me" item 1 |
| 2   | 2        | trust         | Nothing on the title bar says the project is unsaved: the header read "friends -- Local only" before and after the save, and Grace learned it had never been saved only when Save asked for a name. | `11.png`, `13.png`, `14.png`, `18.png` (same header); transcript steps 11, 13 and item 3 |
| 3   | 2        | trust         | The start screen's "This browser can clear projects kept here. Save a local copy of any project you need to keep." made Grace doubt the browser save she had just made, for a reminder months away; she added a local copy to feel safe. | `15.png`; transcript steps 15, 17 and item 4 |
| 4   | 1        | feedback      | "Save local copy..." gives no message in the app (unlike "Saved friends in this browser."); the only sign is the browser's download. | `18.png` (no toast) against `14.png`; transcript step 18 and item 4 |
| 5   | 1        | naming        | Picking "Everything" in the Graph place makes the note form read "About Graph" and its chip "Graph": two names for one subject. | `04.png` (inspector "Everything"), `05.png` ("About Graph"); transcript item 2 |
| 6   | 1        | naming        | The rail's "Graph" button and a saved note's "Graph" chip share an accessible name, so a click by name is ambiguous. Seen only through the tool's refusal; a sighted mouse user would not meet it, but a voice-control or label-driven user would. | step 06 refusal; `06.png`, `07.png` |

Problem 1 has now been reported in round 3 (r3-s53, r3-s54), round 4 (r4-s55, r4-s56) and this
session, so it is confirmed. Problem 3 repeats r4-s55's doubt about the start screen's warning, so
it is confirmed at two participants. Problems 2, 4, 5 and 6 rest on this session alone.
