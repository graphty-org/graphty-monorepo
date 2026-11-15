# Session r1-s08 -- Analyst Alex, returning user

Task: keep in the picture only gauges that do not send readings by themselves, plus any gauge installed in the 1990s; hide the rest without deleting; report how many are left.

## Step 0 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:gauges-clean.txt
Screenshot 01.png. The gauges project is open, 11 nodes, 13 edges. The table underneath shows a "telemetry" column (yes/no) and an "installed" date column. "Doesn't send readings by itself" = telemetry no. 1990s = installed 1990-1999. That's an OR of two conditions. Last time I used a filter card in the Data place; there's also a filter-looking icon on the toolbar. I'll try that first.

## Step 1 -- toolbar Filters
Command: --step <folder> --hover-at 832,391 --click-at 832,391
Tooltip said "Filters". Screenshot 02.png: it jumped me to the Data place with a "New filter" editor, 11 of 11, and an open list of columns (Node id, lat, lon, depth_cm, station, code, installed, telemetry "2 values"). Good, that's the filter card I used once. I'll start with telemetry.

## Step 2 -- pick telemetry
Command: --step <folder> --click-at 1195,388
Screenshot 03.png: checkboxes yes (7) and no (4). Top has "Condition..." and "Or..." -- an "Or" is what I need for the second half. Tick "no" first.

## Step 3 -- tick "no"
Command: --step <folder> --click-at 1143,209
Screenshot 04.png: 4 of 11 nodes (Cedar Bend, Old Bridge, Heron Marsh, Birch Hollow). Others greyed. Now "Or..." to add the 1990s part.

## Step 4 -- "Or..."
Command: --step <folder> --click "Or..."
Screenshot 05.png: group A (telemetry no, 4) and "or B" (0), with the column list open again. Pick "installed".

## Step 5 -- installed
Command: --step <folder> --click-at 1193,340
Screenshot 06.png: installed, an operator box "Before" and "A date or a year". I want 1990 to 1999 -- looking for a "Between" in that operator list.

## Step 6 -- operator list
Command: --step <folder> --click-at 1280,160
Screenshot 07.png: Before / After / Between / Has a value / Has no value. Between it is.

## Step 7 -- Between
Command: --step <folder> --click "role=option:Between"
Screenshot 08.png: two boxes, "A date or a year" to "A date or a year". I'll type 1990 and 1999. Not sure whether "1999" means the start of 1999 or all of it -- I'll check the count.

## Step 8 -- 1990 to 1999
Command: --step <folder> --click-at 1204,186 --type "1990" --click-at 1355,186 --type "1999" --key Tab
Screenshot 09.png: B = 3 (Upper Falls 1998, Old Bridge 1995, Lake Inlet Oct 1999 -- so "1999" takes the whole year, good). Header says 6 of 11 nodes, 2 of 13 edges. That matches what I worked out from the table by hand: 4 non-telemetry plus Upper Falls and Lake Inlet (Old Bridge is in both). Now Done to apply it.

## Step 9 -- Done
Command: --step <folder> --click "Done"
Screenshot 10.png: Back on the graph. Only 6 dots drawn. Right panel: "Nodes showing 6 of 11", "Edges showing 2 of 13", and "Full graph: Nodes 11" -- so nothing was deleted. Table "Shown" lists G01 Upper Falls, G03 Cedar Bend, G05 Old Bridge, G08 Heron Marsh, G09 Lake Inlet, G10 Birch Hollow. Filter card on the left keeps A (telemetry no, 4) or B (installed 1990 to 1999, 3). I'm done.

## End (in character)
- Finished: yes. 6 gauges are still in the picture (Upper Falls, Cedar Bend, Old Bridge, Heron Marsh, Lake Inlet, Birch Hollow); the other 5 are hidden, not deleted -- the panel says Full graph 11.
- Ease: 6 out of 7. Toolbar Filters -> telemetry -> tick "no" -> Or... -> installed -> Between 1990 to 1999 -> Done. About eight clicks, and the running count ("6 of 11") at every step meant I could check it against my own count from the table before committing. That's what I want.
- What slowed or confused me:
  - The date "Between" boxes don't say whether "1999" is the start of 1999 or the whole year. I only knew it was inclusive because Lake Inlet (Oct 1999) showed up in B's count. If I hadn't had the table to check, I'd have worried.
  - B's count says 3 but only adds 2 to the total, because Old Bridge is in both A and B. Fine once you notice, but someone could add 4 + 3 and say 7.
  - The filter card's name is still just "telemetry no" even though it now also includes the 1990s gauges. When I come back next week that name will mislead me; it should say both halves, or let me rename it.
  - "Group colors" / "Styled" / "Table" buttons in the filter editor -- not sure what Group colors does to my picture; I left it alone.
  - "Except" toggle and "Condition..." vs "Or..." -- worked out "Or..." from the word, "Condition..." I guess is AND. Short tooltips would help.

## Follow-up
Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: while you were deciding which gauges stay in the picture, what on the screen besides the drawing did you look at, and did it help or get in the way?"

Answer: 2. Mostly calm -- every click had a count next to it, so I always knew if I was on track.

The moment I was least sure was right after I ticked "no" under telemetry (screenshot 04, going into 05). The editor showed my checkbox list with "4 of 11", and at the top of the right side just two bare words, "Condition..." and "Or...", plus an "Except" toggle and a "..." menu. Nothing said which one means "and" and which one means "add another group". I picked "Or..." because the word matched my sentence, but I was guessing at "Condition...". A close second: the two date boxes for Between (screenshot 08), "A date or a year" to "A date or a year", with no hint whether 1999 meant the whole year.

Besides the drawing I looked at three things, and two of them did the real work:
- The A / B / No match list on the left of the editor with its counts (A 4, B 3, No match 5). That helped the most -- I could check each half against my own count.
- The header "6 of 11 nodes, 2 of 13 edges". Helped: it caught the overlap (4 + 3 is not 7, Old Bridge is in both). Without it I might have reported 7.
- The table under the drawing with the Group column (A/B) next to station and installed date. Helped -- that is where I actually confirmed Lake Inlet Oct 1999 was in, and it is where I trust numbers more than dots.
What got in the way a little: the "Group colors / Styled / Table" buttons up top -- I didn't know if touching them would change my picture, so I avoided them and they cost me a second look each time. And the Filters card in the left sidebar still read "telemetry no -- Editing" while it was really telemetry-no OR the 1990s; that mislabel made me double-check I hadn't lost the B half. The drawing itself was the least useful: small, and the greyed dots are hard to tell apart from the kept ones.
