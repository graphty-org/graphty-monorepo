# Session r3-s24 -- Nadia, returning user

Task: replace team.csv with team-v2.csv without losing the ranking work, redo the ranking, report
team size, who was first before and who is first now.

Every command ran from the studio worktree as
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs <args> <session folder>`;
the screenshots are in this folder.

## Step 1 -- `--start <session> setup:team-ranked.txt` -> 01.png
The team project is open, with a PageRank run in the left list (12). The big brown balls are the
important people. Before I swap anything, I want the old number one written down. The right panel
has a "Values" tab, so I'll try that.

## Step 2 -- `--step <session> --click "Values"` -> 02.png
Top 10 list: Hal is first at 0.1293, then Ida, Di, Jo and Ed. So "before" is Hal, with 12 people.
Written down. Now to swap the file. The left rail has a "Data" button, which sounds like where
the file lives. Clicking it.

## Step 3 -- `--step <session> --click "Data"` -> 03.png
Data panel: Sources > team.csv, 12 nodes, 16 edges. That's the file I need to swap. There's no
button next to it, so I'll right-click it like I would in Windows to see if there's a replace.

## Step 4 -- `--step <session> --rclick "team.csv"` -> 04.png
Menu: "Edit source..." and "Replace with file...". Replace with file is exactly what I want.
Clicking it and picking team-v2.csv from Downloads.

## Step 5 -- `--step <session> --click "Replace with file..." --upload team-v2.csv` -> 05.png
A full-screen "Replace: team-v2.csv" page. The top says "Was 12 nodes, 16 edges; now 14, 21".
Good, that's the two new people. The weight's "Higher means" is set to "Not set". The old run said
it assumed higher means closer, and the line here says PageRank reads higher as closer until I
choose, so leaving it alone keeps it the same as last time. I don't want to change the method
between before and after, because QA would ask why. Clicking Replace.

## Step 6 -- `--step <session> --click "Replace"` -> 06.png
The header now says team-v2.csv. Two blue balls are the new people, with no score yet. The key
says "PageRank, out of date", and the right panel says "Data changed since this run" with a blue
Rerun button. The PageRank layer is still there, so my work survived. Clicking Rerun.

## Step 7 -- `--step <session> --click "Rerun"` -> 07.png
It ran at 5:37:31 PM. The PageRank count is 14, "14 of 14 have a value". Top 10: Di is first at
0.1339 and Hal second at 0.1305, then Ed, Ida and Jo. Same weight setting as before (read as
closer) and same damping (0.85). The blue balls are colored now. That's my answer.

## Step 8 -- `--end <session>`
Session ended.

## In character, at the end

- **Did I finish?** Yes. The team has 14 people now (was 12). Hal was first before (0.1293). Di is
  first now (0.1339), and Hal dropped to second (0.1305).
- **Ease:** 6 of 7. Six clicks, about one alert's worth of time.
- **What confused me:**
  - Nothing outright stopped me. "Replace with file..." only shows on a right-click; I found it
    because I right-click by habit. A plain button by the source would have saved the guess.
  - On the replace page, "Higher means: Not set" made me stop. I had to read the small line to be
    sure that leaving it alone ranks the same way as last time. If I'd clicked "Closer" just to be
    safe, I wouldn't have known whether that changed the method.
  - I didn't save. The task said "without losing your work", and the ranking layer was still there
    after the swap, so I took that as kept. I'm not sure whether the project on disk still points
    at the old file until I Save.
