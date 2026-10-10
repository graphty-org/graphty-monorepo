# Grade: session r1-s25 -- Grace, back for the quarter, puts the updated running club list in place of the old one and reranks (friends.csv to friends-v2.csv)

**Grade: S** (success). Grace replaced friends.csv with friends-v2.csv through the Data page's
"Replace with file...", kept the PageRank run with its size and color layers, reran it, and gave
both names right: Farah first before (0.06394), Ava first now (0.08012), still 20 people and 41
ties. The last screen shows exactly the answer key's end state. Her detours (a look in the main
menu, a left click on the source row) were looks that she closed or moved on from at once; none of
them is a detour the answer key grades SD (no addition undone, no new project, no stale read).

Build seen: `946256efb876 graphty@0.8.56` (session.json "buildStamp"), at 1440 x 900, no
uncommitted changes. This is the frozen build named in the criteria. The setup ran to its end
(`setup.log`: the file chooser was answered with friends.csv), the session log is empty, and every
screenshot matches its command. The session is not void.

## What the last screen shows (`13.png`)

- The graph panel reads "Graph friends-v2.csv", with Selection, PageRank 20 and Everything in the
  tree; the PageRank row carries the bar-chart icon again, not the out-of-date mark.
- The run's inspector: "PageRank, Measure, ran Oct 8, 11:33:48 PM"; Values "20 of 20 have a value,
  0.02872 to 0.08012"; Top 10 starting Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141 --
  the answer key's new top four exactly.
- Made with: Analysis PageRank, Ran Oct 8, 11:33:48 PM, Weight "weight (read as closer)" with
  "Its meaning was not set, so this run assumed a higher weight means closer."
- The drawing's key reads 0.02872 to 0.08012 for both Size and Color: the layers were kept and now
  read the new run.
- The Edges table shows the new weights (Ava to Chloe 1, was 5 in friends.csv).
- A toast, "Saved friends in this browser."
- "First before" was read from the open run before any change: Top 10 "Farah 0.06394"
  (`02.png`). The replace page said "Was 20 nodes, 41 edges; now 20, 41" (`07.png`).

## Measures

- **Steps:** 12 after the start (`02.png` to `13.png`); the answer reached at step 11. The key's
  success path is 6 steps; the extra ones are the two looks below, the hover on the row's icon,
  the click on the run row, and the save.
- **Wrong turns: 2.**
  1. Step 2 (`03.png`): opened the main menu looking for "a new version of my file". It holds
     only "Open project or file...", which she rightly feared would start a new map; she closed
     it with Escape and went to Data.
  2. Step 4 (`05.png`): clicked the friends.csv row in Data -> Sources. It shows the source's
     counts and its rows, but no way to swap the file. She then tried a right-click (`06.png`),
     which held "Replace with file...".
  The hover on the PageRank row's icon (`09.png`) was a check that paid off ("Data changed since
  this run"), not a wrong turn.
- **False "done": none.** At step 8 (`08.png`), after Load, she did not report a name: she saw that
  the key still read the old range (0.03779 to 0.06394) and concluded the ranking had not been
  redone. Her final claims all hold on screen: the names and values (`13.png`), "same 20 people and
  41 links" (`07.png`, `08.png`), "colors, sizes and legend were kept" (`13.png`). truth-on-screen:
  no wrong claim.
- **Traps avoided:** no `stale-read` (she caught the old key after Load); she did not pick "Edit
  source..." (listed first in the right-click menu); she did not open friends-v2.csv as a new
  project; she left "Higher means" on "Not set", which this task does not need; she did not click
  the "Reset Damping factor to default" button.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session and r1-s26, same task, same path) -- the only way to put a
   newer file in place of the old one is hidden behind a right-click (or a "..." that appears only
   on hover) on the source's row in Data.** The main menu has no such entry, and a plain click on
   the row shows the source's counts and rows but no replace action. Both participants reached it
   only because they chose to try a right-click; one who does not would be left with "Open project
   or file...", which starts a new map and loses the run and its styling. Evidence: `03.png`,
   `05.png`, `06.png`; debrief ("A colleague who doesn't right-click would probably not find
   it"). r1-s26 steps 2 to 5 follow the same route (main menu, Data, click, right-click).
2. **Severity 3 -- between Load and Rerun, the screen shows last month's ranking as if it were
   current.** The drawing keeps the old sizes and colors, the key keeps the old range (0.03779 to
   0.06394), while the table already shows the new weights. The only marks are an unlabeled history
   icon on the PageRank row (its meaning is in a hover tooltip) and the "Data changed since this
   run" bar, which appears only in the run's inspector, which is not open after Load (the Graph
   overview is). A reader who reads the top person from the drawing or the old Top 10 at this point
   reports the old name. Grace caught it from the key's numbers; that is the answer key's
   `stale-read` trap. Evidence: `08.png`, `09.png`, `10.png`; debrief ("The only sign was a tiny
   icon change ... I had to hover it").
3. **Severity 1 -- the replace page's "Higher means: Not set / Closer / Farther / Capacity" names
   "Capacity" with no explanation.** She understood Closer, not Capacity, and left it on Not set
   because the sentence below said the ranking reads higher as closer; nothing on the task path
   needed it. Evidence: `07.png`, debrief.
4. **Severity 1 -- Control+S on a project she believed was saved opened "Save friends as".** The
   start state is a project that was never saved (the setup does not save it, and Grace's history
   names a project saved as "board map", not "friends"), so the prompt is right for the state the
   setup made; the finding is that nothing on screen before it said the project was unsaved (the
   header shows "friends" and "Local only"). Partly a mismatch between the setup and the briefing,
   not a build defect. Evidence: `12.png`, `13.png`.

What worked: the replace page's "Was 20 nodes, 41 edges; now 20, 41" told her at once that nobody
was lost (`07.png`); the run, its layers and its legend survived the replacement; one press of
Rerun redid the ranking, cleared the out-of-date mark and changed the run's time (11:32:18 PM to
11:33:48 PM), which let her tell the new run from the old (`02.png`, `11.png`).

## Did the build get in the way?

No. Every control did what the answer key says it does on this build: the right-click menu, the
replace page, Load, the out-of-date mark and its tooltip, Rerun and Save. No step failed, no
console error was logged, and no screen differs from the pilot screens the key cites, except that
after Load the inspector showed the Graph overview rather than the run (the key allows this: the
run's inspector stays open only when it was open before, and here Grace had moved to the source).
The session's time went to finding where replacing lives and to telling the old ranking from the
new, which are the questions the task asks about, not to broken controls.
