# Grade: session r2-s33 -- Dev (returning student), running club (T21 A), the list was updated

**Grade: SD** (success after a detour). The last screen (`15.png`) shows the task done right: the
left panel reads "Graph friends-v2.csv", the PageRank row has no out-of-date mark, the run's
subtitle and Made with read "Ran Oct 9, 8:26:06 PM" (it was 8:23:52 PM before, `02.png`), the key
reads 0.02872 to 0.08012 with no "out of date", and the Top 10 starts Ava 0.08012, Farah 0.06556,
Hana 0.06428, Ivan 0.06141 -- every value the answer key gives. Dev's answer, "Before, Farah was
first (PageRank 0.06394). Now ... Ava is first (0.08012) and Farah is second (0.06556)", matches
the key on both names. The grade is SD, not S, because the first route was a detour: Dev opened
friends-v2.csv from the main menu's "Open project or file...", which led to the "Add to friends"
page, and he cancelled it there (`05.png`, `06.png`) before finding "Replace with file..." in the
source inspector's "..." menu. Nothing was added, so no work had to be undone.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup friends-ranked.txt (friends.csv, PageRank run, Size and Color by it).

## The answer against the key

- **First before (right).** Read from the Values' Top 10 before anything changed: "Farah 0.06394"
  (`02.png`).
- **Replaced, not added (right).** "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41",
  footer "the load makes 20 nodes and 41 edges" (`10.png`). After Replace the Overview shows Nodes
  20, Edges 41, "From friends-v2.csv" (`11.png`). `work.json`: sources end as friends-v2.csv, with
  friends.csv under "gone"; the run and all three layers are kept. That is the replacement the task
  asks for, not `work-lost`.
- **Rerun (right).** `13.png` and `15.png`: new run time, key and Top 10 as above.
- **Not a wrong answer.** Not `stale-read`: between Replace and Rerun Dev saw the old Top 10
  (Farah first, `12.png`) and said the table had not been redone yet. Not `added-not-replaced`:
  he read "82 edges" on the Add to page and cancelled.
- **Weight line.** Dev quoted the Replace page's line ("PageRank reads higher as closer") as his
  reason to leave "Higher means" at Not set, and pointed to Made with's "weight (read as closer)"
  as showing both runs used the same rule. Recorded as the key asks; nothing there needed choosing.

## Measures

- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`); 12 up to the Rerun
  (`02.png` to `13.png`), the last 2 a save the task did not ask for. The success path for the
  route he took (the source inspector's "..." menu) is 8 steps; 12 is 1.5x. The 4 extra steps are
  the detour: the menu icon hovered, the main menu opened, "Open project or file..." with the file,
  Cancel (`03.png` to `06.png`).
- **Wrong turns:** 1 -- "Open project or file..." from the main menu (`04.png`, `05.png`). It is
  the place Dev's history used to open the class spreadsheet, and here it offered no way on to the
  task: only Cancel and Load (which adds). Recorded as a broken habit on that door; it becomes a
  confirmed finding only if a second T21 session makes the same first move.
- **First move:** the Values tab (to note the first name), then the main menu.
- **Recovery:** yes; the wrong turn was cancelled and the session succeeded.
- **False "done":** none. "Done!" after Rerun (`13.png`) and "Saved. I'm done." (`15.png`, toast
  "Saved friends in this browser.") are both true on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace changed the title to friends-v2.csv, marked the key
  "out of date" and put a history icon on the run row (`11.png`).
- **Numbers that disagree (bar 5):** none.
- **Positions after Replace:** the people are the same, and the drawing kept its shape; the camera
  zoomed out a little (`08.png` against `11.png`). Dev did not read it as lost work.
- **Implementation defects hit:** none. Every step did what the build is documented to do, with no
  tool refusal, error or failed load. Every problem below is about where things are and what the
  screen says, not a broken feature.
- **Build-decided:** no. **Void:** no.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                         |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | trap            | Opening a newer copy of the loaded file through "Open project or file..." goes to "Add to friends", which offers only Cancel and Load. Load would put both lists of ties on top of each other (82 edges). The only sign is "adds 0 nodes, 41 edges" and "the load makes 20 nodes and 82 edges" in small text; nothing offers to use the file instead of the old one. Dev caught it only by reading the 82 and said he would otherwise have pressed Load, which leads to a doubled network and a wrong ranking. | `05.png` header and footer; transcript step 05 and end: "If I hadn't read the 82 I would have pressed Load"      |
| 2   | 2        | discoverability | "Replace with file..." is reachable only from the source's right-click menu, the row's hover-only "...", or the source inspector's "..." menu after a left click on the row. At rest the Data page shows the source row with no control on it. Dev found it on his second try "only because I poke at '...' menus".                                                                                                           | `07.png` (row with no button), `08.png`, `09.png`; transcript end                                                |
| 3   | 2        | feedback        | Between Replace and Rerun the inspector's histogram, "20 of 20 have a value, 0.03779 to 0.06394" and the old Top 10 (Farah first) stay at full contrast with nothing on them marking them old; only the bar "Data changed since this run" and the key titles say so. Dev "had to look twice to make sure the table wasn't the new result".                                                                                   | `12.png`; transcript end                                                                                         |
| 4   | 1        | flow            | A replacement made from the source inspector returns to the Graph page with the Graph's Overview open, not the run, so Rerun is not on screen; the run row's only sign is a history icon with no words. Dev clicked PageRank himself and found Rerun at once.                                                                                                                                                              | `11.png`, `12.png`                                                                                               |
| 5   | 1        | layout          | The left click on the source row opens an edge table drawer along the bottom of the canvas that stays open through Replace, Rerun and Save, pushing the drawing and its toolbar up.                                                                                                                                                                                                                                         | `08.png` to `15.png`                                                                                             |

No severity 4: the answer was right and nothing was lost. Problem 1 is severity 3 for one
participant (not yet confirmed): the participant named a wrong result he nearly reported, and the
door that led there is the one his history taught him.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence, and the main-menu habit
is likely stronger in a real returning user than in a simulated one.
