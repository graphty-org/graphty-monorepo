# Grade: session r1-s31 -- Jordan, back with the running club list, swaps in the updated file and reranks it (friends-v2.csv)

**Grade: S** (success). Both names are right and the work was kept. Before the swap, Farah was
first (0.06394). After replacing the source with friends-v2.csv and rerunning, Ava is first
(0.08012), then Farah 0.06556, Hana 0.06428, Ivan 0.06141, all as in the answer key. The graph
still has 20 people and 41 ties. The PageRank layer, its size and color styling, and its settings
(weight read as closer, damping factor 0.85) carried through the replacement. There was one small
wrong turn before the replace command was found: a left click on the source row. The answer key
does not count that as a detour that lowers the grade.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, with no uncommitted
changes. This is the frozen build named in the criteria. The setup (friends.csv opened, PageRank
run, Size mapped to PageRank) landed as scripted (`01.png`). Every step's screenshot matches its
command. The empty session.log holds no errors. The session is not void.

## What the last screen shows (`09.png`)

- Header "Graph friends-v2.csv". The left list shows Selection, PageRank 20 (with the chart icon,
  not the out-of-date icon) and Everything.
- The inspector reads PageRank, "ran Oct 8, 11:38:54 PM". Values: "20 of 20 have a value, 0.02872 to
  0.08012". The Top 10 is Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi 0.05308, and
  so on.
- Made with: Ran Oct 8, 11:38:54 PM (the first run was 11:37:26 PM, `02.png`). Weight is "weight
  (read as closer)" with the note "Its meaning was not set, so this run assumed a higher weight
  means closer". Damping factor 0.85.
- The key reads 0.02872 to 0.08012 for both size and color. The edge table shows the new weights
  (Ava to Chloe 1, which was 5 before, as in `05.png`) and 41 edges.
- Before the swap (`02.png`), the Top 10 starts with "Farah 0.06394" and the key reads 0.03779 to
  0.06394.

## Measures

- **Steps:** 8 after the start (`02.png` to `09.png`). The answer key's success path is 6 steps
  (Values, Data, right-click, Replace with upload, Load, Rerun), plus a click on PageRank when the
  run's inspector was not open.
- **Wrong turns: 1.**
    1. Step 3 (`04.png`): a left click on "friends.csv" under Sources, expecting a replace option.
       It opened the source's inspector (Added: Nodes 20, Edges 41) and the edge table, with no
       replace command. The next step, a right-click, found "Replace with file..." (`05.png`).
       The click on PageRank at step 7 (`08.png`) is not a wrong turn. The run's inspector was not open
       when Load returned to the Graph page (the source's inspector was), and the answer key allows
       this step.
- **False "done": none.** After Load (`07.png`), Jordan saw that the key still read 0.03779 to
  0.06394, said this was probably last month's ranking, and opened the run instead of reading a
  name. Jordan claimed done only after Rerun, and the claim matches the screen (`09.png`). The
  claims that the work was kept and that the counts are unchanged ("same 20 people and 41 pairs")
  are also right: see the layer row and the table in `09.png`, and "Was 20 nodes, 41 edges; now
  20, 41" in `06.png`. truth-on-screen: no wrong claim.
- **Traps avoided:** no stale read (Farah was not reported as the new leader after Load), "Edit
  source..." was not chosen, no new project was opened, and the "Reset Damping factor" button was
  not clicked.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 -- after Load, the drawing and its key go on showing the old run's values, with no
   out-of-date mark on the canvas or the key.** The only signs are a history icon with no words
   on the PageRank row and the "Data changed since this run" bar, which shows only after the run
   is opened. After Load, the key still read 0.03779 to 0.06394 under the new file's name
   (`07.png`). Jordan caught it, but only by reasoning that the numbers had not changed. Jordan
   said that a picture exported at that moment would have put last month's ranking under this
   month's file name. That would be a wrong conclusion a reader acts on, but it did not happen in
   this session, so the severity stays at 3. The answer key lists this as a known trap on this
   build. Evidence: `07.png`, `08.png`, debrief.
2. **Severity 2 -- the replace command is hidden.** "Replace with file..." is only in the Sources
   row's right-click menu and in a "..." button that appears only on hover. A left click on the
   row offers nothing. Jordan made one wrong turn here and said that many people on the team
   would never right-click. Evidence: `03.png`, `04.png`, `05.png`, debrief.
3. **Severity 1 -- in the Replace screen, the "Higher means: Not set / Closer / Farther /
   Capacity" choice made Jordan stop and think.** The note under it was enough for Jordan to
   leave "Not set". Evidence: `06.png`, step 6 remark, debrief.

What worked: the Replace screen's "Was 20 nodes, 41 edges; now 20, 41" line was the check Jordan
would otherwise have done in a spreadsheet. The "Data changed since this run" bar with "Rerun"
was there once the run was open. The rerun kept the earlier run's settings, so the two rankings
can be compared. The "Ran" time changed after Rerun, which showed that the run was redone.

## What this says about the round

The session spent no time on a broken control. Every control did what the answer key says, and
there were no tool faults. The findings are design findings: where the replace command lives, and
the old run's values staying on the drawing between Load and Rerun. The participant's off-topic
remark is a question for later study, not for this task: what Replace does when the new file's
column names differ from the old file's.
