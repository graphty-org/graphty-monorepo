# Session r1-s31 -- Jordan (returning marketing analyst), running club list updated

Build: the frozen study build named in criteria.md (946256efb876), served with REAL_DIST.

## Start

    cd design/ui/studio/tool
    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ ./with-browser.sh node real.mjs --start <session> setup:friends-ranked.txt

01.png: My running club file "friends" is open, with a PageRank layer in the left list (20), nodes sized and colored by PageRank, a legend top-left, and the right panel on PageRank with Style and Values tabs. Fine -- that is the work from last month. First I want to write down who was first before I touch anything, so I'll open Values.

## Steps
    node real.mjs --step <session> --click "Values"

02.png: Values shows Top 10. Farah is first at 0.06394, then Hana 0.05941, Milo 0.05648. Good, written down: before = Farah. "Made with" says PageRank, weight read as closer. Now I need to swap in friends-v2.csv. The left rail has "Data" -- that's where my file lives, I think. Trying that.
    node real.mjs --step <session> --click "Data"

03.png: Data shows "Sources: friends.csv, 20 nodes, 41 edges". That's the file I want to swap. No obvious button next to it, so I'll click the file name and see what it offers.
    node real.mjs --step <session> --click "friends.csv"

04.png: Clicking the file opened a table of edges at the bottom (nice, that's the table I always want) and the right panel says "friends.csv Source, Added: Nodes 20, Edges 41". But nothing says "swap this file". Maybe a right-click on the source gives me options.
    node real.mjs --step <session> --rclick "friends.csv"
(tool note: the name matched the tree item and the panel heading; it took the tree item.)

05.png: Right-click gives "Edit source..." and "Replace with file...". "Replace with file" is exactly what I want -- though a right-click is not where I'd look first. Clicking it and giving it friends-v2.csv.
    node real.mjs --step <session> --click "Replace with file..." --upload friends-v2.csv

06.png: A full-screen "Replace: friends-v2.csv -- Was 20 nodes, 41 edges; now 20, 41". Good, same people, same pairs, and I can see the new weights (Ava-Chloe went from 5 to 1). There's a "Higher means: Not set / Closer / Farther / Capacity" question. The note says PageRank reads higher as closer when it's not set, which is what last month's run said too, so I'll leave the default and hit Load.
    node real.mjs --step <session> --click "Load"

07.png: Back on Graph, header now says "friends-v2.csv", table shows the new weights (Ava-Chloe 1). My PageRank layer is still there -- good, didn't lose my work -- but its icon changed to a little clock-ish symbol, and the legend still says 0.03779 to 0.06394, the same numbers as before. I suspect it's showing last month's ranking. Clicking the PageRank layer to check.
    node real.mjs --step <session> --click "PageRank"

08.png: There it is: "Data changed since this run" with a blue "Rerun" button. Top 10 is still Farah, Hana, Milo -- last month's. Honest, I like that it says so instead of pretending. Clicking Rerun.
    node real.mjs --step <session> --click "Rerun"

09.png: Rerun done, "ran Oct 8, 11:38:54 PM". Banner gone, the layer icon is back to the chart. Legend now 0.02872 to 0.08012 and the drawing resized. New Top 10: Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141, Ravi... Ava jumped from nowhere in the old top 10 to first. Farah drops to second. That's my answer; I'm done.

    node real.mjs --end <session>

## Debrief (in character)

**Finished:** yes. Before: Farah was first (0.06394). Now: Ava is first (0.08012), Farah second. Same 20 people and 41 pairs; my PageRank layer and its styling survived the swap.

**Ease:** 6 of 7.

**What worked:** The replace screen told me "was 20 nodes, 41 edges; now 20, 41" before I committed -- that's the sanity check I'd otherwise do in Excel. And after the swap the ranking didn't pretend: "Data changed since this run" with a Rerun button right there. I'd rather that than a tool that silently shows last month's list. Also, my run kept the same settings (weight read as closer, damping 0.85), so the two lists are comparable.

**What confused me:**
- Finding the swap. Clicking the file in Data showed me its counts and a table but no "replace" anywhere; I only found "Replace with file..." on a right-click. Plenty of people on my team would never right-click. A visible button or a "..." menu next to the source would have saved me a guess.
- Right after Load, the drawing and the legend still showed last month's numbers with nothing on the canvas or legend saying they were old. The only hint was a tiny clock icon on the layer in the list; I only learned it was stale because I clicked the layer. If I'd exported the picture right then, the deck would have had last month's ranking under this month's file name.
- The "Higher means: Not set / Closer / Farther / Capacity" question in the replace screen made me stop for a second. I left it; the note under it said what it would do, which was enough.

**Off-topic:** This is a running club with 20 people. Our real community export is 40,000 accounts and the vendor changes the column names every quarter -- I'd want to know whether this replace screen copes when the new file's columns don't line up with the old one.
