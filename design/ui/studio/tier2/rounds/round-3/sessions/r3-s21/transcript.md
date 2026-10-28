# Session r3-s21 -- Jordan, marketing network analyst (returning user)

Task: replace friends.csv with friends-v2.csv without losing work, redo the ranking, and say who was first before and who is first now.

Every command ran with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/` and `node design/ui/studio/tool/real.mjs`, on the session folder `<session>` = tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s21 (copied here at the end).

## Step 1 -- start

    real.mjs --start <session> setup:friends-ranked.txt

01.png: my friends project is open. Left panel: Selection, PageRank (20), Everything. Right panel shows the PageRank run with Style and Values tabs. The legend says size and color are by PageRank. Fine. Before I swap anything I want last month's winner written down, so I'll open Values.

## Step 2 -- read last month's ranking

    real.mjs --step <session> --click "Values"

02.png: Top 10 under the PageRank run. Farah 0.06394 is first, then Hana 0.05941, Milo 0.05648. Made with: PageRank, weight read as closer. Noting "before: Farah". Now I need to swap the file. Last time I opened files from the start screen, but I don't want a new project, I want to replace the data in this one. The left rail has a "Data" icon, so I'm trying that.

## Step 3 -- Data panel

    real.mjs --step <session> --click "Data"

03.png: Data panel. Sources: friends.csv, 20 nodes, 41 edges. Filters, Attributes (id; weight on edges). No obvious "replace" button. I'll right-click the friends.csv source row and see if there's a menu.

## Step 4 -- source menu

    real.mjs --step <session> --rclick-at 160,141

04.png: a menu with "Edit source..." and "Replace with file...". Those are exactly the words I wanted. Clicking "Replace with file..." and giving it friends-v2.csv. (I only found it because I right-clicked on a hunch; nothing on the row says it has a menu.)

## Step 5 -- replace preview

    real.mjs --step <session> --click "Replace with file..." --upload friends-v2.csv

05.png: full-screen "Replace: friends-v2.csv -- Was 20 nodes, 41 edges; now 20, 41". Good, same people, which is the sanity check I wanted. Columns source/target/weight are mapped. Weight "Higher means: Not set". Last month's run also had it not set, so I'm leaving it the same so the two rankings are comparable. Hitting Replace.

## Step 6 -- after replace

    real.mjs --step <session> --click "Replace"

06.png: Graph now says friends-v2.csv. My PageRank run is still in the list (good, nothing lost), with a "Data changed since this run" banner and a blue Rerun button; the legend says "PageRank, out of date". That's honest: it didn't pretend the old numbers are new. Clicking Rerun.

## Step 7 -- rerun result

    real.mjs --step <session> --click "Rerun"

07.png: the run is re-dated Oct 10, 5:31:26 PM, the banner is gone, the legend no longer says out of date, and the range is now 0.02872 to 0.08012. Top 10: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi 0.05308 ... Same settings as before (weight read as closer, damping 0.85), so it's apples to apples. I have both answers. Ending.

    real.mjs --end <session>

Ended cleanly; no further request.

## Debrief (in character)

- **Did I finish?** Yes. Before: Farah was first (PageRank 0.06394). Now: Ava is first (0.08012); Farah dropped to second (0.06556).
- **Ease:** 6 out of 7.
- **What worked:** "Replace with file..." said exactly what I meant. The preview told me "was 20 nodes, 41 edges; now 20, 41" before I committed. My run, its colors and its sizes survived the swap. The "Data changed since this run" banner with Rerun right next to it meant I never had to rebuild the analysis or guess whether the numbers were stale.
- **What confused me:** the replace option is hidden behind a right-click on the source row. There is no visible button or "..." on that row, so a less stubborn colleague could easily think the only way is to open a new project and redo everything. The "Higher means: Not set" choice in the replace screen made me stop and think. I left it alone to match last month, but the screen doesn't tell me what the old source was set to, so I had to work that out from the run's "Made with" note.
- **Gripe:** this is exactly the "the vendor sent a new export" problem I have every month with the listening suite, except there I re-import and lose my whole dashboard. Here at least the work stayed put.
