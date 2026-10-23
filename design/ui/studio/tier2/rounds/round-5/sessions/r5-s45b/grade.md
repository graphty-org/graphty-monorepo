# Grade: session r5-s45b -- Jordan (regular analyst), running club (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`) is the Notes place after closing and reopening
the project: "Moving away in May; ask who takes over the Tuesday run" with the chip "Farah" (Oct 11,
10:41 AM) above "Spring list, checked against the sign-up sheet" with the chip "Graph" (Oct 11,
10:40 AM), newest first as the key says. The inspector shows Farah with "Node 1 note". The project
was saved in this browser as "friends" (`15.png`, toast "Saved friends in this browser."), the start
screen after `--reopen` lists it under Recent projects as "friends, In this browser - 20 nodes -
Oct 11, 10:42 AM" (`16.png`), and opening it showed "Opened friends" (`17.png`). Jordan named both
places to read the reminders: the Notes place on the left rail, and the "1 note" link in Farah's
header.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. Start: friends.csv
loaded, PageRank run and selected, nodes sized and colored by PageRank (`work-start.json`, `01.png`).

## The answer against the key

- **Farah's note (right target).** Saved with Farah selected; the form read "About Farah" before
  typing (transcript step 11) and the card carries the chip "Farah" (`12.png`, `20.png`).
- **The club note (right target).** Saved with the form reading "About Graph" (`06.png`); the card
  carries the chip "Graph" (`07.png`, `20.png`).
- **Kept.** `work.json` end state lists both notes and nothing under "gone"; both notes are listed
  again after the reopen (`20.png`). The extra local copy, `downloads/friends.graphty.json` (8 KB),
  also holds both texts; the key counts that as no detour.
- **Shown.** The Notes place is open on the last screen, and the inspector's "1 note" link is
  visible beside it.

## Measures

- **Route:** mouse route: Notes rail, "+" (Add note), Find on the Graph place to select Farah,
  Main menu > Save, `--reopen`, the Recent projects row, Notes; then Main menu > Save local copy...
  and a click on "1 note".
- **Steps:** 19 `real.mjs` steps after the start, against about 12 on the key's keyboard path.
- **Wrong turns:** 2.
  1. Step 04: the first "Add note" opened a form "About PageRank", because the setup left the
     PageRank run selected (`04.png`). Jordan read the label, cancelled before typing, selected
     "Everything" and opened the form again (steps 05 and 06). Caught before saving, so no note
     landed on the wrong target and this is not an SD detour.
  2. Step 08: `--click "Graph"` was refused because the rail button and the new note's "Graph" chip
     share that name; nothing happened, and Jordan retried with the rail's position (step 09).
- **False "done":** none. Every closing claim holds on screen: both notes with their chips after
  the reopen (`20.png`), the save toast (`15.png`), the Recent row (`16.png`), the local copy in
  `downloads/`, and "Farah's panel says 1 note" (`17.png`, `20.png`). Her claims that "Save local
  copy" showed nothing in the app and that clicking "1 note" changed nothing are also true: `18.png`,
  `19.png` and `20.png` are byte-identical. truth-on-screen holds.
- **Watch items from the key:** Jordan did not read the reopen's Graph place (no notes in view) as
  lost data; she opened Notes at once (`17.png`, `18.png`). She did not read "From friends.csv 1
  note" as the Farah note missing (she never looked at the graph's header). She read the start
  screen's line "This browser can clear projects kept here. Save a local copy..." as a risk and
  saved a local copy as well. She did not try Undo after the reopen. She did not remark on Farah
  being half-covered by a smaller node inside the yellow halo.
- **Silent commit:** none.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Twenty screenshots for twenty steps; `leaks.json` shows no
  leaks over 41 calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                           | Evidence                                                                                          |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | wrong target    | "Add note" attaches the note to whatever happens to be selected -- here a PageRank run -- and the form offers no way to change what it is about. Only the small "About PageRank" label warns; a fast typist would have pinned the club note to a measure. | `04.png` ("About PageRank" over an empty box); transcript step 04 and "What confused me", first item |
| 2   | 2        | trust           | What "saved" means is unclear. The toast "Saved friends in this browser." fades, "Local only" in the header reads the same before and after, and the start screen then says the browser can clear projects and to save a local copy. Jordan saved twice to be safe. | `15.png` (toast), `16.png` (start-screen warning under the Recent row); transcript "What confused me", third item |
| 3   | 1        | feedback        | "Save local copy..." gives no confirmation inside the app; Jordan knew it worked only because the browser's download appeared.                                                                                                                       | `19.png` identical to `18.png`; `downloads/friends.graphty.json`; transcript step 19                |
| 4   | 1        | feedback        | Clicking the inspector's "1 note" link while the Notes place is already open changes nothing visible and does not highlight Farah's note, so Jordan could not tell what the link does.                                                                 | `20.png` identical to `19.png`; transcript step 20                                                  |
| 5   | 1        | naming          | The Graph place's row is called "Everything", but a note made with it selected reads "About Graph" and carries the chip "Graph" -- two names for one target.                                                                                         | `05.png` ("Everything" selected), `06.png` ("About Graph"); transcript step 06                      |
| 6   | 1        | naming          | The note chip "Graph" and the rail button "Graph" share one name; a click by name was refused as ambiguous and cost a step. A pointer user would not hit the refusal, but a screen-reader user would meet two controls named "Graph".                 | Transcript step 08; `07.png` (chip and rail button both reading "Graph")                            |
