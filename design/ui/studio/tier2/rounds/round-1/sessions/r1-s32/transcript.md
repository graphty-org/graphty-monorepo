# Session r1-s32 -- Nadia (returning), task T21 prompt B (team)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Tool commands run from
design/ui/studio/tool with REAL_DIST set to that copy; S = this session folder.

## Start

    node real.mjs --start $S setup:team-ranked.txt

01.png: the team project is open, "Graph team.csv" in the left panel, a PageRank row with 12 next
to it, the right panel shows PageRank with Style and Values tabs. Big brown balls and small orange
ones. First I need who is first right now, before I touch anything. I will open Values.

## Step 1

    node real.mjs --step $S --click "Values"

02.png: Top 10 list. Hal 0.1293 is first, then Ida 0.1224, Di 0.1177. Writing that down: first
before = Hal. "Made with" says weight read as closer. Now the new file. At the top left it says
"Graph team.csv" -- that's where the file is named, so I'll click the file name and see if it lets
me swap it.

## Step 2

    node real.mjs --step $S --click "team.csv"

03.png: nothing changed. The file name is just a label. OK -- the file lives under Data on the
left rail, that's where I looked at the rows before. Trying Data.

## Step 3

    node real.mjs --step $S --click "Data"

04.png: Data shows "Sources: team.csv, 12 nodes, 16 edges". So 12 people before. That's the file.
I'll click on it and see what it offers.

## Step 4

    node real.mjs --step $S --click-at 137,134

05.png: the source is selected. Right side says "team.csv Source, Added: Nodes 12, Edges 16" and a
table of rows opened at the bottom. No button to swap the file anywhere I can see. In Windows
you right-click a thing to get its options, so I'll right-click the file.

## Step 5

    node real.mjs --step $S --rclick-at 137,134

06.png: a little menu: "Edit source..." and "Replace with file...". That's it. Replace with file,
then pick team-v2.csv from Downloads.

## Step 6

    node real.mjs --step $S --click "Replace with file..." --upload team-v2.csv

07.png: a full page "Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21". Good, 14
people now, matches "two people joined". There is a "Higher means: Not set / Closer / Farther /
Capacity" row. Last time the ranking said weight was read as closer and this line says PageRank
reads higher as closer if I leave it, so I am not touching it -- same as before. Nothing else I
need to change. Load.

## Step 7

    node real.mjs --step $S --click "Load"

08.png: loaded. Top says "Graph team-v2.csv", right panel Nodes 14, Edges 21. Two small blue balls
-- I guess the two new people, they have no ranking color. The PageRank row on the left still
says 12 and has a little clock-ish icon now instead of the bar-chart icon. So the ranking is the
old one. I'll click the PageRank row to see if it offers to run again.

## Step 8

    node real.mjs --step $S --click "PageRank"

09.png: right panel says "Data changed since this run" with a blue "Rerun" button. The Top 10 is
still the old list, Hal first. Clear enough. Rerun.

## Step 9

    node real.mjs --step $S --click "Rerun"

10.png: PageRank row now says 14, ran 11:39:16 PM. Top 10: Di 0.1339, Hal 0.1305, Ed 0.1245, Ida
0.1217, Jo 0.1141. The two blue balls are orange now, so everyone has a value ("14 of 14 have a
value"). The coloring and sizing stayed on, so the work I had is still there. Done.

    node real.mjs --end $S

## Wrap-up (in character)

- **Finished:** yes. The team has 14 people now (was 12). First before: Hal (0.1293). First now:
  Di (0.1339); Hal dropped to second (0.1305).
- **Ease:** 6 of 7. About two minutes, nine clicks.
- **What slowed me down:**
    - Clicking the file name next to "Graph" at the top left did nothing. It looks like the place
      the file lives, but it is just a label. I found the swap only by going to Data and
      right-clicking the file -- I tried right-click because that's how Windows works. If I hadn't,
      I would not have seen "Replace with file..." anywhere; there is no button for it on the file's
      own panel on the right, which just says "Added: Nodes 12, Edges 16".
    - The replace page had a "Higher means" row set to "Not set". I left it because the note under
      it said PageRank reads higher as closer anyway, and the old run said the same. If that note
      weren't there I would have stopped and wondered whether I had to pick something to keep it
      "the same as last time".
    - After loading, the ranking quietly stayed the old one. The only hint on the left was the
      little icon changing next to PageRank (still "12"); the "Data changed since this run / Rerun"
      message only appeared once I clicked PageRank. Before that, the two new people showing up blue
      was the real clue. QA would want to know a ranking in the file was stale -- I'd want that said
      without clicking.
- **What worked:** "Was 12 nodes, 16 edges; now 14, 21" on the replace page told me in one line
  what changed. The Rerun button kept my coloring and sizing, so nothing was lost.
