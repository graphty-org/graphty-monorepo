# Grade: session r2-s45 -- Dev (returning student), running club (T19 A), reminders that stay with the work

**Grade: S** (success). The last screen (`20.png`, the same as `19.png`) shows the Notes place after
the project was saved, closed and reopened from Recent projects: "Spring list, checked against the
sign-up sheet" with the chip "Graph", and "Moving away in May; ask who takes over the Tuesday run"
with the chip "Farah", the graph's note listed first. The inspector header reads "From friends.csv
1 note". Both notes are on the right target, both survived the reopen, and Dev showed the Notes
place as where he would read them, which the answer key accepts. He also downloaded a local copy
(`downloads/friends.graphty.json`, 8,416 bytes), which the key counts as no detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, Size and Color
by PageRank, the PageRank run open in the inspector).

## The answer against the key

- **Farah's note (right).** Saved while Farah was selected (`09.png` "About Farah"; `10.png` the
  card with the chip "Farah", and "1 note" in Farah's inspector).
- **The club's note (right).** Saved with nothing selected (`11.png` "About Graph"; `12.png` the
  chip "Graph").
- **Kept (right).** Main menu, Save, "Save friends as" with the name "friends", Save (`15.png`,
  `16.png` "Saved friends in this browser."); `--reopen`; Recent projects "friends -- In this
  browser - 20 nodes - Oct 9, 8:55 PM" (`17.png`); opened with "Opened friends" (`18.png`); Notes
  (`19.png`) lists both.
- **`work.json`** agrees: at the end two notes with exactly the task's texts, the PageRank run and
  its layer unchanged, nothing gone.
- **Not a wrong answer.** Not `not-kept`, not `wrong-row` (no note was ever saved on PageRank or on
  the graph twice), and nothing was typed into Find or a label.

## Measures

- **Steps:** 19 `real.mjs` steps after the start (`02.png` to `20.png`). The key's keyboard route
  is about 13 moves; Dev used the pointer (rail, search box, menu) and added a hover or two, plus
  the optional local copy. About 1.5x.
- **Wrong turns:** 2.
  1. Steps 4 to 6: "Add note" with the PageRank run open made the form "About PageRank"
     (`04.png`). He hovered the label to see if it could be changed (`05.png`, it cannot), then
     cancelled and went to select Farah first. Nothing was saved on the wrong target, so this is a
     detour before the note, not a wrong note fixed afterward (the SD case).
  2. Step 13: he hovered "Local only" hoping it said whether the work was kept; its tooltip is
     about privacy ("Nothing is sent. Opens Settings > Privacy"). One step, no harm.
- **False "done":** none. "Done" at step 20 is true: both notes are listed after the reopen, on
  their right targets. truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Read as lost data:** no. After the reopen he read "From friends.csv, 1 note" (`18.png`) without
  taking it for the Farah note missing, and the drawing's slight reframing as "fine".
- **Broken habit:** none of consequence. His history says he saved the project in the first
  assignment; this project had never been saved, so Save asked for a name (`15.png`). He went on
  and saved (problem 4).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and did what was asked.
- **Scripted exit:** not applicable; he finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                   | Evidence                                                                                          |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The Notes place's "+" makes a note about whatever the inspector shows, and the "About PageRank" line in the form is a plain label with no way to change the target. Nothing says "select what the note is about first". Dev cancelled, found Farah, and came back; the club note's "About Graph" he reached by guessing that a click on empty background clears the selection. | `04.png`, `05.png` (hover shows nothing), `11.png`; transcript steps 4 to 6 and "I figured it out by trial" |
| 2   | 2        | trust           | Nothing lasting says the project is saved: "Local only" reads the same before and after, the save shows only a fading toast, and the start screen then warns "This browser can clear projects kept here. Save a local copy of any project you need to keep." Dev asked "So 'saved' isn't really saved?" and saved a second copy to be safe. | `14.png`, `16.png`, `17.png`; transcript steps 13, 17 and "That made me nervous"                  |
| 3   | 1        | legibility      | No names are drawn on the nodes, so Farah could not be picked on the drawing; Dev used the find box.                                                                                                                                                                                                    | `06.png`, `08.png`; transcript step 6                                                              |
| 4   | 1        | comprehension   | Save on a never-saved project opens "Save friends as" with a Name field; Dev, who remembered saving last time, read it as "like it was never saved" and wondered if it made a new copy.                                                                                                                  | `15.png`; transcript step 15                                                                      |
| 5   | 1        | feedback        | "Save local copy..." downloads the file with no message in the app; Dev knew it worked only because a download appeared.                                                                                                                                                                                | `20.png` (identical to `19.png`); `downloads/friends.graphty.json`; transcript step 20            |
| 6   | 1        | wording         | The header label "Local only" sits where a save status would be and was read as one; its tooltip is about privacy.                                                                                                                                                                                       | `13.png`; transcript step 13                                                                      |
| 7   | 0        | affordance      | The pointer stays an arrow over the Notes "+" button.                                                                                                                                                                                                                                                   | `03.png`; transcript step 3                                                                       |

No severity 3 or 4: both reminders landed on the right targets and survived the reopen, and every
doubt Dev raised was about finding the target control or trusting the save on a path he completed.
