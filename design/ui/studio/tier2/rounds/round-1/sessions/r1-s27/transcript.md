# Session r1-s27 -- Alex (operations analyst, weekly), task T21 prompt A (running club)

Build: tier2-r1d4-946256efb (commit 946256efb876). Tool: real.mjs, setup friends-ranked.txt.

Commands run from design/ui/studio/tier2 with T=../tool, S=rounds/round-1/sessions/r1-s27.

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ $T/with-browser.sh node $T/real.mjs --start $S setup:friends-ranked.txt

01.png: "OK, last month's friends project. PageRank is in the left list with 20 next to it, dots sized and
colored by PageRank, legend 0.03779 to 0.06394. Before I swap anything I need to write down who is
first now. The right panel has Style and Values -- Values sounds like the numbers. Trying that."

## Step 1

    node $T/real.mjs --step $S --click "Values"

02.png: "Good, a Top 10. Farah first at 0.06394, Hana 0.05941, Milo third. Noted: before = Farah.
It also says weight was read as 'closer' because I never set its meaning -- fine for now. Now the
new file. There is a 'Data' icon on the far left rail; that is where I would expect to swap the file."

## Step 2

    node $T/real.mjs --step $S --click "Data"

03.png: "Sources: friends.csv, 20 nodes, 41 edges. That is the file I want to swap. No visible button
on the row. In Gephi I would right-click it -- trying a right-click on friends.csv."

## Step 3

    node $T/real.mjs --step $S --rclick "friends.csv"

04.png: "There it is -- 'Edit source...' and 'Replace with file...'. Replace with file is exactly it.
Clicking it and giving it friends-v2.csv."

## Step 4

    node $T/real.mjs --step $S --click "Replace with file..." --upload friends-v2.csv

05.png: "A 'Replace: friends-v2.csv' screen. 'Was 20 nodes, 41 edges; now 20, 41' -- that is the
check I want, counts match. Weight is a whole number, 'Higher means: Not set'; the note says
PageRank reads higher as closer until I choose. Last month it ran the same way, so to compare like
with like I leave it. Direction 'As the file says'. Load."

## Step 5

    node $T/real.mjs --step $S --click "Load"

06.png: "Graph now says friends-v2.csv. The PageRank panel shows a bar: 'Data changed since this run'
with a blue Rerun button, and the PageRank row has a little history icon. Good -- it is not
pretending the old numbers are new. Top 10 still shows the old list. Clicking Rerun."

## Step 6

    node $T/real.mjs --step $S --click "Rerun"

07.png: "Reran in about a second; 'ran Oct 8, 11:35:20 PM', legend rescaled to 0.02872 to 0.08012.
Top 10 now: Ava 0.08012 first, then Farah 0.06556, Hana 0.06428. My colors and sizes stayed on --
I did not have to redo the Style tab. That is the bit I hate redoing every week. Saving the project
like I always do, Control+S."

## Step 7

    node $T/real.mjs --step $S --key Control+s

08.png: "'Save friends as', name friends. Keeping the name. Save."

## Step 8

    node $T/real.mjs --step $S --click "Save"

09.png: "'Saved friends in this browser.' Done."

    node $T/real.mjs --end $S

## Wrap-up (in character)

**Finished:** yes. Before the new list, Farah was first (PageRank 0.06394). On friends-v2.csv, Ava is
first (0.08012); Farah dropped to second (0.06556).

**Ease:** 6 of 7. Seven steps including the save, and the actual swap-and-rerun was four clicks
(Data, right-click the file, Replace with file, Load, Rerun). The colors, sizes and the PageRank
entry all carried over, and the 'Data changed since this run' bar with a Rerun button meant I did
not have to go hunting in the analysis button again. That is the Gephi half I hate redoing.

**What confused me / slowed me down:**

- Replacing the file is only on a right-click of the file name under Data > Sources. Nothing on the
  row says it has a menu; I only tried right-click because Gephi trained me to. Someone who does not
  right-click would be stuck there.
- After Load, the Top 10 kept showing last month's names and numbers under the 'Data changed' bar.
  The bar is clear enough, but if I had glanced at the list without reading the bar I could have
  reported the old ranking as the new one. I would rather the stale numbers looked stale (greyed or
  struck) as well.
- 'Higher means: Not set' on the weight. The note told me PageRank reads it as closer anyway, so I
  left it to match last month -- but I had to read a sentence to know that leaving it alone was safe.
- Nothing shows me before and after side by side. I had to write Farah down before replacing; if I
  had not, last month's top name would have been gone. For a weekly rerun I would want to see who
  moved.
