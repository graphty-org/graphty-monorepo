# Session r1-s06 transcript (Tom, returning user)

Task: keep in the picture only gauges that do not send readings by themselves, plus any gauge installed in the 1990s; everything else out of the picture, nothing deleted; say how many remain.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node design/ui/studio/tool/real.mjs --start tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s06 setup:gauges-clean.txt
Screenshot 01.png. The gauge project is open, 11 nodes, a table underneath with station, installed date and a "telemetry" column with yes/no. "Telemetry no" must be the ones that don't send readings by themselves. Installed in the 1990s: Upper Falls 1998, Old Bridge 1995, Lake Inlet 1999 from what I can see. Last month I narrowed the drawing from the Data place; there is a funnel-looking button on the toolbar, I'll try that.

## Step 2
Command: --step --click-at 832,391 (button "Filters")
Screenshot 02.png. It went over to the Data place and opened a "New filter" with a list of columns. "telemetry, 2 values" is there. I'll pick telemetry first, for the ones that don't send readings.

## Step 3
Command: --step --click-at 1195,388 (option "telemetry, 2 values")
Screenshot 03.png. Now it shows yes 7 and no 4 with tick boxes. I want the "no" ones. I'll tick "no".

## Step 4
Command: --step --click-at 1143,209 (input "no, 4 nodes")
Screenshot 04.png. Good: 4 of 11, Cedar Bend, Old Bridge, Heron Marsh, Birch Hollow. Now I also need the ones put in during the 1990s. There's an "Or..." up there next to "Condition...". "Or" sounds like "this or that", which is what I want. Trying it.

## Step 5
Command: --step --click-at 1238,100 (button "Or...")
Screenshot 05.png. Now there's an "A" (telemetry no, 4) and "or B" (0) with the column list open again. The A and B and the colours are new to me -- I'm not sure what they are for -- but "or" is what I asked for. Picking "installed" for B.

## Step 6
Command: --step --click-at 1193,340 (option "installed")
Screenshot 06.png. Now it says installed, "Before", and a box for "a date or a year". "Before" isn't right; I want the 1990s, 1990 through 1999. I'll open that "Before" list and see if there's something like "between".

## Step 7
Command: --step --click-at 1280,160 (combobox "installed: how to match")
Screenshot 07.png. Before, After, Between, Has a value, Has no value. "Between" it is.

## Step 8
Command: --step --click-at 1183,208 (option "Between")
Screenshot 08.png. Two boxes, "a date or a year" to "a date or a year". I'll put 1990 in the first and 1999 in the second.

## Step 9
Command: --step --click-at 1204,186 --type "1990" --click-at 1355,186 --type "1999"
Screenshot 09.png. Now it says 6 of 11 at the top. B has 3: Upper Falls (1998), Lake Inlet (Oct 1999) and, I suppose, Old Bridge (1995) which was already in A. By my own count from the table: 4 "no" plus Upper Falls and Lake Inlet = 6. That matches. Lake Inlet in October 1999 made it in, so 1999 counts as the whole year. A little list popped up under my 1999 saying "Oct 11, 1999" -- I didn't ask for that, I'll ignore it. Pressing Done.

## Step 10
Command: --step --click "Done"
Screenshot 10.png. Back to the picture. Top says "6 of 11 nodes, 2 of 13 edges"; on the right, "Nodes showing 6 of 11" and under "Full graph" still Nodes 11, so nothing was deleted. The table lists Upper Falls, Cedar Bend, Old Bridge, Heron Marsh, Lake Inlet, Birch Hollow -- the four that don't send readings plus the two 1990s ones that do. Autosave says saved. I'm done.

## End (in character)

Did I finish? Yes. Six gauges are still in the picture: Upper Falls, Cedar Bend, Old Bridge, Heron Marsh, Lake Inlet and Birch Hollow. The other five are out of the picture but still in the project (it says 11 in the full graph).

Ease: 6 out of 7. The funnel button took me straight to it, "no" had a count next to it, and "Or..." did what the word says. Every step showed me the count changing, and I could check it against the table myself.

What confused me:
- After "Or..." the screen suddenly had "A" and "B" with green and orange squares, and the table grew a "Group" column. I didn't ask for groups or colours; I wasn't sure if I'd just changed the lab's colours. Once I pressed Done the dots were all the same blue again, so I think it was only for the filter screen, but nothing told me that.
- The filter is still called "telemetry no" in the list on the left and at the top, even though it has the 1990s part too. If someone else looks at it next week they might think it's only the "no" gauges.
- B said 3 but only 2 new gauges appeared, because Old Bridge is in both. I worked that out from the dates; the screen didn't say so.
- "Between 1990 and 1999" -- I wasn't sure 1999 meant the whole of 1999 until I saw Lake Inlet (October 1999) made it in.
- A little "Oct 11, 1999" suggestion popped up under my typing that I didn't ask for.
- "Telemetry" is the column's word; I took "no" to mean "doesn't send its readings by itself". Nothing on screen said what telemetry meant, but I've seen the column before.

## Follow-up

Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: while you were deciding which gauges stay in the picture, what on the screen besides the drawing did you look at, and did it help or get in the way?"

Answer: 3. Mostly calm -- I always had a next thing to click and a number to check.

The moment I was least sure was right after I pressed "Or...". The screen suddenly had an "A" with a green square and a "B" with an orange square, B said 0, the column list was open on the right, the table at the bottom grew a "Group" column, and up at the top there were buttons I hadn't touched -- "Group colors", "Styled", "Table". The dots in the drawing had turned green. I didn't know whether I had just put new colours on the lab's file or whether that was only how the filter screen shows things. I went on because "or" was the word I wanted, but for a moment I didn't know if I was building a filter or making groups.

Besides the drawing I mostly looked at the table underneath and the counts. The table helped the most: I could read station names and the installed dates myself and add them up -- 4 "no" plus Upper Falls and Lake Inlet makes 6 -- and the "6 of 11" at the top agreed. The counts next to "no", A and B helped too. Two things got in the way a bit: B said 3 but only two new gauges turned up, because Old Bridge is in both, and nothing said so; and the "Oct 11, 1999" suggestion that popped up under my 1999 covered part of the box, and I had to decide to ignore it. The "No match 5" line was useful once I understood it was the ones going out of the picture. The left side, where the filter is still called "telemetry no", I glanced at and didn't trust -- it doesn't say the 1990s part is in there.
