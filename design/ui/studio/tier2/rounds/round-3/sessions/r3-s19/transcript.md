# Session r3-s19 -- Analyst Alex, returning user

Task: replace friends.csv with friends-v2.csv without losing work, redo the ranking, report who was first before and who is first now.

All commands ran from the studio worktree with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/`, on the session folder `tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s19` (copied here by `--end`).

## Steps

### Start
`node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt` -> 01.png

Last month's project is open: "friends", graph friends.csv, a PageRank run in the left list (20), size and color by PageRank, legend 0.03779 to 0.06394. Before I swap anything I want the old number one written down. The run panel has a Values tab, so I'll look there.

### Step 1
`--step <session> --click "Values"` -> 02.png

The Values tab shows a Top 10: Farah 0.06394 first, then Hana 0.05941 and Milo 0.05648. So the old number one is Farah. The weight was "read as closer" by assumption, damping 0.85. Now to swap the file. I'll try the Data icon in the left rail, which is where I'd expect sources.

### Step 2
`--step <session> --click "Data"` -> 03.png

Data panel: Sources > friends.csv, 20 nodes, 41 edges. There's no visible "replace" button. I'll right-click the source row and see if a menu comes up.

### Step 3
`--step <session> --rclick-at 160,141` (treeitem "friends.csv") -> 04.png

The context menu has "Edit source..." and "Replace with file...", which is exactly what I want. Clicking "Replace with file..." and giving it friends-v2.csv.

### Step 4
`--step <session> --click "Replace with file..." --upload friends-v2.csv` -> 05.png

A "Replace: friends-v2.csv" page says "Was 20 nodes, 41 edges; now 20, 41". The counts match. Columns are mapped source/target/weight. The weight meaning is "Not set", same as last month's run (which assumed closer), so I leave it alone to compare like for like. Clicking Replace.

### Step 5
`--step <session> --click "Replace"` -> 06.png

The graph header now says friends-v2.csv. My PageRank run and its styling are still there. The panel says "Data changed since this run" with a Rerun button, and the legend titles say "out of date". That's honest: it didn't silently keep stale numbers. The Top 10 still shows the old values (Farah first). Clicking Rerun.

### Step 6
`--step <session> --click "Rerun"` -> 07.png

The rerun finished at 5:26:36 PM. The stale notice is gone, and the legend now runs 0.02872 to 0.08012 without "out of date". Same settings (weight read as closer, damping 0.85). New Top 10: Ava 0.08012 first, then Farah 0.06556 and Hana 0.06428. So the first before was Farah and the first now is Ava. Sizes and colors were kept and repainted. As usual I'll save the project from the Main menu.

### Step 7
`--step <session> --click "Main menu"` -> 08.png

The menu has Save (Ctrl+S), Save as..., Save local copy... and Export... Clicking Save.

### Step 8
`--step <session> --click "Save"` -> 09.png

Save opened a "Save friends as" dialog with the name "friends". It's a little odd that plain Save asks for a name on a project I've saved before, but fine. Keeping the name and clicking Save in the dialog.

### Step 9
`--step <session> --click "Save"` (in the dialog) -> 10.png

Notice: "Saved friends in this browser." The run, the styling and the new numbers are all kept. Done, so I'm ending.

### End
`--end <session>` -> session ended.

## Wrap-up (in character)

- **Finished?** Yes. First before: **Farah** (PageRank 0.06394). First now: **Ava** (0.08012); Farah dropped to second (0.06556).
- **Ease:** 6 of 7. Nine clicks, no dead ends.
- **What worked:** "Replace with file..." on the source's right-click menu kept my run and my size and color styling. The replace screen showed the old and new counts side by side (20/41 both), so I could check them against my numbers. After the swap the run said "Data changed since this run" and the legend said "out of date" until I pressed Rerun, so I was never looking at stale numbers without being told.
- **What confused me:**
  - The replace option is only on a right-click menu. Nothing in the Data panel shows it's there, and I found it because I right-clicked on a hunch.
  - After the rerun, the old ranking is gone from the screen. I only know Farah was first because I wrote it down before swapping. A "previous run" or a before/after comparison would save me copying numbers by hand every week.
  - The weight meaning is still "Not set" and the run "assumed" higher means closer. That's fine for this comparison, but I'd want to settle it once and not be asked every time.
  - Plain Save opened a "Save as" naming dialog on a project I had already saved.
