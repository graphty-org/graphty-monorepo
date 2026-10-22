# Grade: session r2-s36 -- Alex (regular analyst), team (T21 B), the list was updated

**Grade: SD** (success after a detour). The last screen (`15.png`) shows the PageRank run redone
on the new file: the left panel reads "Graph team-v2.csv", the PageRank row says 14 with no
out-of-date mark, the run's subtitle and Made with read "ran Oct 9, 8:40:49 PM", the key titles
carry no "out of date" and read 0.02333 to 0.1339, "14 of 14 have a value", and the Top 10 starts
Di 0.1339, Hal 0.1305, Ed 0.1245. Alex reported 14 people now, Hal first before (0.1293) and Di
first now (0.1339). All three match the key. The grade is SD, not S, because the route to the
swap began with a detour: Alex clicked the "team.csv" file name in the left panel's header, opened
the Graph overview's "..." menu (Re-run layout, Reshuffle layout seed, Add note), found nothing
about the file and closed it with Escape (`03.png` to `05.png`), before reaching the Data place
through the overview's "From team.csv" link. Nothing was changed by the detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `team-ranked.txt` (team.csv, one PageRank run, its Influence layer).

## The answer against the key

- **People now: 14 (right).** `09.png` "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now 14,
  21"; `10.png` Graph overview Nodes 14, Edges 21; `12.png` PageRank row 14 and "14 of 14 have a
  value".
- **First before: Hal (right).** `02.png`, Top 10 "Hal 0.1293", "12 of 12 have a value", read
  before anything was replaced.
- **First now: Di (right).** `12.png` and `15.png`, Top 10 "Di 0.1339", then Hal 0.1305 and Ed
  0.1245, as the key gives.
- **Replaced, not added (right).** `work.json` keeps the run and all three layers from start to
  end, with team.csv under "gone" and team-v2.csv in its place -- the replacement the task asks
  for, not `work-lost`.
- **Not a trap.** Not `stale-read`: the "before" was read at `02.png`, and the "now" only after
  Rerun (`12.png`). Not `added-not-replaced`: Alex chose "Replace with file...", not "Edit
  source..." (`08.png`).

## Measures

- **Steps:** 11 `real.mjs` steps after the start through the Rerun (`02.png` to `12.png`), against
  the 8-step inspector-menu route the key walks: Values, the header's "team.csv", the overview's
  "..." (Graph actions), Escape, "From team.csv" (lands on Data), the team.csv Sources row (left
  click), the source inspector's "..." (Source actions), Replace with file... with the upload,
  Replace, PageRank, Rerun. Three more steps (`13.png` to `15.png`) saved the project, which the
  task does not ask for.
- **Wrong turns:** 1 -- the Graph overview's "..." menu, opened and abandoned with Escape
  (`04.png`, `05.png`). The click on the header's "team.csv" is off the key's route but not a
  wrong turn: it was not undone, and its overview's "From team.csv" link carried Alex on to Data.
- **First move:** the run's Values, to read the top person before the swap. Worked. Alex's
  history names no Data place or file control, so the header click is not a broken habit.
- **False "done":** none. "Finished? Yes" is true: replaced, rerun, all three answers on screen and
  current. truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace returned to the map with key titles "PageRank, out of
  date", the run row's history icon and Nodes 14 / Edges 21 (`10.png`); Rerun changed the key
  range, the Top 10, the row count and the time (`12.png`).
- **Numbers that disagree (bar 5):** none on the final screen. Between Replace and Rerun the
  PageRank row still said 12 while the overview said 14 nodes (`10.png`); the key's "out of date"
  titles and the "Data changed since this run" bar (`11.png`) marked it, and Alex read it right.
- **Wrong weight reading without a sign (bar 7b):** no. The rerun's Made with says "weight (read
  as closer)" and "Its meaning was not set, so this run assumed a higher weight means closer"
  (`12.png`).
- **Quoted "closer" as a reason:** yes. At `09.png` Alex read the line under "Higher means" ("the
  note here says PageRank reads it as closer anyway") and left "Not set" to match the last run.
- **Blue dots read as a highlight or selection:** no. Alex read them as "the two new people ...
  because they have no score yet" (`10.png`) -- right, but a guess; the key does not explain them.
- **Moved drawing:** the replacement laid the drawing out again (`04.png` against `10.png`). Not
  remarked on; not read as lost work.
- **"Added" heading:** not seen; Alex did not return to the source's inspector after Replace.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; setup.log shows the file
  chooser answered; no error, dead control or tool failure was met.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | discoverability | The file name "team.csv" in the left panel's header looks like a file control but opens only the Graph overview, and that overview's "..." holds layout items and Add note, nothing about the file. The swap is reached only through Data, the source row, and a second unlabeled "..." -- found by poking. Alex: "about five clicks for something I'll do every month." | `03.png`, `04.png`, `07.png`, `08.png`; transcript end: "Finding where to swap the file took four tries"                                          |
| 2   | 2        | comprehension   | Between Replace and Rerun the two new people are drawn as small saturated blue dots unlike every other node, and the key does not explain them. Alex guessed "they have no score yet"; right, but nothing said so.                                                                                                             | `10.png`; transcript step 10                                                                                                                      |
| 3   | 1        | comprehension   | "Higher means: Not set" on the Replace page stopped Alex; he left it only because the old run said it assumed "closer". He asked that the page carry over what the last run used, or say so.                                                                                                                                    | `09.png`; transcript end: "The weight question on the replace screen ... made me stop"                                                           |
| 4   | 1        | navigation      | After a replacement made from the source's inspector, the app returns to the Graph overview with no Rerun on screen; the PageRank row's only sign is a history icon with no words, and it still says 12. Alex clicked the row on his own to find Rerun.                                                                             | `10.png`, `11.png`                                                                                                                               |
| 5   | 1        | comprehension   | Save opened "Save team as" with a Name field, and Alex could not tell whether it would copy or overwrite. The setup never saved the project, so the dialog is right for this build's state; the doubt comes from his history saying he saves every time. Recorded as a setup-and-history mismatch, not an app defect.          | `14.png`, `15.png`; transcript end: "I wasn't sure if it was making a copy or overwriting"                                                       |
| 6   | 0        | layout          | The left click on the Sources row opened the table drawer along the bottom, which pushed the drawing and its toolbar up and stayed open to the end. Not remarked on.                                                                                                                                                           | `07.png` to `15.png`                                                                                                                             |

No severity 3 or 4: all three answers were right, the earlier work was kept, and every stale value
Alex saw carried a mark he read. No implementation fault was met: no error, no dead control, no
tool failure. The problems are about how the swap is found and how the in-between state is
explained.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
