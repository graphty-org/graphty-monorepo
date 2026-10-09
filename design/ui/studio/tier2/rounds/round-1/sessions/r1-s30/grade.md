# Grade: session r1-s30 -- Ruth, the returning reporter, swaps her team list for its newer version and reranks it (team.csv to team-v2.csv)

**Grade: S** (success). The old file was replaced, not added to: the Replace page read "Replace:
team-v2.csv. Was 12 nodes, 16 edges; now 14, 21" (`06.png`), and after Load the Graph overview
read Nodes 14, Edges 21, Components 1 (`07.png`). She reran PageRank from the "Data changed since
this run" bar, and the last screen shows the new run. All three answers match the answer key: 14
people now (and 21 ties, up from 12 and 16), first before Hal (0.1293), first now Di (0.1339),
with Hal second at 0.1305 and Ed third at 0.1245.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `team-ranked.txt` ran to its end state
(`01.png`: the PageRank run's inspector, the drawing sized and colored by PageRank). The tool ran
every step and every screenshot matches its command. At step 4 the tool noted that "team.csv"
matched both the Sources row and the right panel's heading and took the row, which is what the
participant meant. The session is not void.

## What the last screen shows (`11.png`)

- The left tree: "Graph team-v2.csv", the PageRank row with "14" and no out-of-date icon.
- The PageRank inspector, Values tab: "Measure ran Oct 8, 11:38:09 PM"; histogram "14 of 14 have a
  value, 0.02333 to 0.1339, median 0.04819".
- Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141, Gil 0.06981, Flo 0.06953,
  Kit 0.04819, Abe 0.03959, Cy 0.03836.
- The key: Size and Color PageRank, 0.02333 to 0.1339.
- Made with: Analysis PageRank, Ran Oct 8, 11:38:09 PM, Weight "weight (read as closer)" with the
  note "Its meaning was not set, so this run assumed a higher weight means closer", Damping factor
  0.85.
- The Nodes table scrolled to its end: Kit 0.048, Lu 0.027, Mo 0.024, Nia 0.035. Mo and Nia are
  the two new people.

The "before" name was read from the run's Values before any change (`02.png`: Top 10 starts
"Hal 0.1293", "12 of 12 have a value", key 0.03273 to 0.1293).

## Measures

- **Steps:** 10 after the start (`02.png` to `11.png`). The answer is complete on screen at step 8
  (`09.png`); steps 9 and 10 were her check of the two new names in the Nodes table. The answer
  key's success path is 6 steps.
- **Wrong turns: 1.**
  1. Step 3 (`04.png`): clicked the team.csv row under Sources, expecting it to offer a newer file.
     The right panel showed only "team.csv, Source; Added: Nodes 12, Edges 16", with no action. She
     recovered on the next step by right-clicking the row (`05.png`), a guess from spreadsheet
     habit, not from anything on screen.
  Step 7 (clicking the PageRank row after Load) is on the success path: the run's inspector was
  not open at Load, so the answer key lists this click as expected.
- **False "done": none.** She claimed done only at step 10, after the rerun, with every claim on
  screen. truth-on-screen: her claims that the project, its colors, sizes and ranking row stayed
  and that the rerun used the same settings are supported (`09.png` Made with matches `02.png`:
  weight read as closer, damping 0.85).
- **Traps avoided:** no `stale-read` (after Load she called the ranking "stale" and did not read a
  name from it, `07.png`); she chose "Replace with file...", not "Edit source..." (`05.png`); not
  `added-not-replaced` (the page title says Replace and the counts were checked); no new project,
  so no `work-lost`. She did not read the two blue dots as a highlight or a selection (she guessed,
  correctly, that they were the two new people). She did not stop on "Weight: weight auto" and did
  not click the "Reset Damping factor to default" button.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session, r1-s25, r1-s26, r1-s27 and r1-s29, same task) -- the only
   way to replace a source with its newer file is a right-click menu (or a "..." button that shows
   only on hover) on the Data page's Sources row; nothing at rest says it exists.** Clicking the row
   opens a source panel with counts and no action. She found the menu by guessing, and said that
   another day she might have opened the new file as a new project and lost her styling. Evidence:
   `03.png`, `04.png`, `05.png`, debrief ("I only found 'Replace with file...' by right-clicking
   the row ... In a web page I do not right-click first").
2. **Severity 3 (confirmed: this session, r1-s25, r1-s26 and r1-s27) -- between Load and Rerun,
   the old ranking stays on screen with almost nothing saying it is old.** The PageRank row still
   said "12" with only a small wordless history icon; the key kept the old range 0.03273 to 0.1293;
   the "Data changed since this run" bar appeared only after she opened the run, and beneath it the
   old Top 10 (Hal first) stayed at full contrast. She was not misled, but a reader who looked at
   the drawing or the key at that moment would read the old order as the new one. Evidence:
   `07.png`, `08.png`, step 6 and 7 remarks, debrief ("Nothing on the drawing or the key said
   'these numbers are from the old list' until I clicked the row").
3. **Severity 2 (confirmed with r1-s26) -- the two new people are drawn as small saturated-blue
   dots that the key does not explain.** She guessed they were the new people with no ranking; the
   screen never says so. Evidence: `07.png`, debrief ("two dots were a different blue with no
   explanation").
4. **Severity 1 -- the Nodes table shows only four rows at this window size, in load order,** so
   checking who joined took a scroll to the end. Evidence: `10.png`, `11.png`.

What worked: the Replace page said "Was 12 nodes, 16 edges; now 14, 21" before anything changed,
which she used as her check, and its "Not set" sentence told her the weight would be read the same
way as last time (`06.png`). The run's new time, "14 of 14 have a value" and the Made with rows let
her confirm the rerun was like for like (`09.png`). The project, its style layers and the run row
survived the replacement.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and the session
spent no time on a broken control. The findings are design findings about finding the replace
action and about how clearly an out-of-date run is marked, the same two seen across the other
sessions of this task.
