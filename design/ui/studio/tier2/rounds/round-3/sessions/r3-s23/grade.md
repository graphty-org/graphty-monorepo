# Grade: session r3-s23 -- Tom (returning), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`09.png`) shows the friends project on the new file and
the PageRank run redone on it: the left panel reads "Graph friends-v2.csv" with the PageRank row
at 20 and no out-of-date icon; the inspector's subtitle and Made with "Ran" read "Oct 10, 5:36:33
PM" (was 5:34:51 PM in `02.png` and `08.png`); the Values' Top 10 starts "Ava 0.08012", then
Farah 0.06556, Hana 0.06428, Ivan 0.06141; the histogram reads "20 of 20 have a value, 0.02872 to
0.08012"; the drawing's key reads "Size: PageRank" and "Color: PageRank", 0.02872 to 0.08012, with
no "out of date". The edge table below shows the new weights (Ava-Chloe 1). Tom's answer, "before,
Farah first (0.06394); now Ava first (0.08012), Farah second (0.06556)", matches the key on both
names and values. He read "first before" from the Values before replacing (`02.png`), replaced
rather than added, and reran. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, size
by PageRank). Tool commit `acf3894e2c56`, no uncommitted changes.

## The answer against the key

- **First before (right).** `02.png`: Top 10 starts "Farah 0.06394", Ran 5:34:51 PM, key 0.03779
  to 0.06394.
- **Replaced, not added (right).** `06.png`: "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41", confirm button "Replace". `work.json`: sources go from friends.csv to
  friends-v2.csv, with friends.csv under "gone"; the run (PageRank, label Influence) and all three
  layers are kept at the end. That is the replacement the task asks for, not `work-lost`.
- **First now (right).** `09.png`, as above: Ava 0.08012, the rest of the top four as the key
  gives them. Still 20 people and 41 ties (`06.png`, `07.png` Overview Nodes 20, Edges 41).
- **Not a trap.** Not `stale-read`: Tom did not read the top name between Replace and Rerun; he
  saw the old Top 10 in `08.png`, said it was the old list, and pressed Rerun. Not
  `added-not-replaced`, not "Edit source..." on the old file, not a new project.
- **Route.** The round 2 menu route the key lists: Values, Data, a left click on the source row,
  the inspector's "Source actions" "...", "Replace with file..." with the upload, Replace, a click
  on the PageRank row (after a replacement made from here the app opens the Graph inspector,
  `07.png`, as the key records), Rerun. The key grades this route as the success path.

## Measures

- **Steps:** 8 `real.mjs` steps after the start (`02.png` to `09.png`), every one doing something.
  The same as the key's walked 8 for this route; two more than the right-click route's 6.
- **Wrong turns:** 0. Every move went forward on a route the key accepts. The left click on the
  source row was a guess (transcript, step 3) but it led on.
- **False "done":** none. "Done" (`09.png`) is true: both names and the redone run are on screen.
  truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit:** none. Replace returned to the Graph page with the new file named in the left
  panel and the run row marked; Rerun changed the time, the Top 10 and the key.
- **Numbers that disagree:** none on the final screen. Between Replace and Rerun (`07.png`,
  `08.png`) the key and the run's Values still show the old range and the old Top 10, as the key
  records; Tom did not report them as the new result.
- **Wrong weight reading without a sign:** no. Made with reads "weight (read as closer)" with the
  line "Its meaning was not set, so this run assumed a higher weight means closer", before and
  after.
- **Broken habit:** none. His first move into the Data place offered a way on (the source row).
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; leaks.json shows no
  leaks, setup.log shows the setup's file chooser answered.
- **Scripted exit:** not applicable; he finished.
- **Quoted "closer" as a reason (the key asks to record it):** yes. On the Replace page (step 5)
  Tom left "Higher means: Not set" because the line under it says PageRank reads a higher weight as
  closer, "which matched last time".
- **Moved drawing read as lost work:** no. On A the drawing kept its shape (`07.png` against
  `02.png`), and Tom said his colors and sizes were still there.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                                       |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replacing a file is hidden: the Data page's source row shows no button at rest, and Tom reached "Replace with file..." only by guessing that a left click on the file would offer choices, then opening a "..." at the far right of the inspector.                                                       | `03.png`, `04.png`, `05.png`; transcript step 2: "I cannot see a button next to it"; "In my own words": "Finding 'Replace' took a guess"                        |
| 2   | 2        | feedback        | After Replace, nothing says in words that the PageRank run is now out of date. The app opens the Graph inspector, not the run, so the "Data changed since this run" bar and Rerun are off screen; the only signs are the row's wordless history icon and "out of date" in the drawing key's titles. | `07.png`; transcript step 6; "In my own words": "I only noticed the small clock icon and 'out of date' in the legend"                                          |
| 3   | 1        | feedback        | With the run open before Rerun, the old Top 10 (Farah first), histogram and range stay at full contrast with nothing on them marking them stale; only the bar above says the data changed. Tom caught it, a less careful reader could read Farah as the new top.                                        | `08.png`                                                                                                                                                       |
| 4   | 1        | comprehension   | The Replace page's "Higher means: Not set" choice worried Tom; he left it only because the explanatory line said PageRank reads higher as closer, and said he "would not know what to pick if it mattered".                                                                                            | `06.png`; transcript step 5; "In my own words", second point                                                                                                   |
| 5   | 1        | layout          | The left click on the source row also opens a table drawer along the bottom of the canvas that stays open through Replace and Rerun, pushing the drawing and its toolbar up.                                                                                                                            | `04.png` to `09.png`                                                                                                                                           |
| 6   | 1        | naming          | After Replace the left panel's title changes to "Graph friends-v2.csv" while the top bar still says "friends", and nothing says how the two names relate. Tom noted the new name without confusion.                                                                                                   | `07.png`, `09.png`; transcript step 6                                                                                                                          |
