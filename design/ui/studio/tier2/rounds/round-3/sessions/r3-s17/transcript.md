# Session r3-s17 -- Grace, returning: put friends-v2.csv in place of friends.csv and redo the ranking

Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/

Every command was run from the studio worktree with REAL_DIST set as above, using
`T=design/ui/studio/tool` and `S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s17`
(the briefing's session folder; `--end` copied it here).

## Start

    node $T/real.mjs --start $S setup:friends-ranked.txt

The start waited several minutes for a free browser slot (all four machine-wide slots were in
use), then opened.

## Step 1 (01.png)
My friends map is open, colored and sized by PageRank, from friends.csv. Before I touch anything I
want to write down who is first. Next to Style is a Values tab.

    node $T/real.mjs --step $S --click "Values"

## Step 2 (02.png)
Top 10 list: Farah 0.06394 first, Hana 0.05941 second, Milo 0.05648 third. "20 of 20 have a
value" -- 20 people, matches. Written down: before = Farah. Now I need to bring in friends-v2.csv
in place of the old one. I remember the Data place listed my file, so I'll start there.

    node $T/real.mjs --step $S --click "Data"

## Step 3 (03.png)
Data shows Sources: friends.csv, 20 nodes, 41 edges. That matches my 41 rows and 20 people. No
visible "replace" button; I'll right-click the file row to see if it has options.

    node $T/real.mjs --step $S --rclick-at 160,141

## Step 4 (04.png)
A small menu: "Edit source..." and "Replace with file...". Those are exactly my words. Clicking
Replace with file and picking friends-v2.csv.

    node $T/real.mjs --step $S --click "Replace with file..." --upload friends-v2.csv

## Step 5 (05.png)
A "Replace: friends-v2.csv" screen. Top line: "Was 20 nodes, 41 edges; now 20, 41". Bottom: "41
edge rows read; the load makes 20 nodes and 41 edges." Everyone arrived, all 41 rows. The weight's
"Higher means" is "Not set", and the note says PageRank then reads a higher weight as closer --
the same as last time's run said ("read as closer"), so I leave it alone to compare like with
like. Pressing Replace.

    node $T/real.mjs --step $S --click "Replace"

## Step 6 (06.png)
Back on the map; the header now says friends-v2.csv. My PageRank row, colors and sizes are all
still there. The panel says "Data changed since this run" with a blue Rerun button, and the key
says "PageRank, out of date". Good -- it told me instead of quietly keeping old numbers. Pressing
Rerun.

    node $T/real.mjs --step $S --click "Rerun"

## Step 7 (07.png)
The run time changed (5:26 to 5:27 PM), the "out of date" warning is gone, and the key now reads
0.02872 to 0.08012. Top 10: Ava 0.08012 first, Farah 0.06556 second, Hana 0.06428 third, then
Ivan. Still "20 of 20 have a value". My colors and sizes followed the new numbers on their own --
the big dark dot moved. Nothing to rebuild. Done.

    node $T/real.mjs --end $S

`--end` ended the session with no further request.

## In my own words, at the end

- **Did I finish?** Yes. Before: Farah was first (0.06394). Now: Ava is first (0.08012); Farah
  is second (0.06556).
- **Ease: 6 of 7.** Seven steps, no wrong turns once I was in Data.
- **What confused me or slowed me down:**
  - Replacing the file is hidden behind a right-click on the source row. I guessed it, but a
    colleague who doesn't right-click would look for a button and not find one. "Edit source..."
    and "Replace with file..." are clear words once you see them.
  - On the replace screen, "Higher means: Not set" made me stop and think. The note under it
    explained that PageRank would read higher as closer, the same as last time, so I could leave
    it -- but I had to read it twice to be sure my ranking would be comparable.
  - Liked: the "Was 20 nodes, 41 edges; now 20, 41" line (exactly the count check I do by hand),
    the "Data changed since this run" warning with one Rerun button, and that my colors and
    sizes stayed and updated themselves. This is the "next quarter shouldn't be as much work as
    the first" I wanted.
