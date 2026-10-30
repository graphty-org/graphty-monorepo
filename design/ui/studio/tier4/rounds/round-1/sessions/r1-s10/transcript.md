# Session r1-s10 transcript (Tom, returning user)

Start command:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start <session folder> setup:gauges-tidy.txt
-> 01.png

## Step 1 (01.png)
The gauge project is open, the one she set up: 12 dots, a table of gauges below with depth_cm and installed. Good, it looks like it always does. I need "sends readings by themselves" -- I don't see that column yet; there's an eighth column off to the right. There's a "Filters" with a plus on the left. I'll try that plus, since I want to leave gauges out of the picture.
Command: --step --click-at 276,420 (button "Add filter") -> 02.png

## Step 2 (02.png)
A list of the gauge columns popped up. At the bottom there's "telemetry, 2 values". Telemetry is what sends readings by itself, I think. I'll pick that one.
Command: --step --click "telemetry" -> ambiguous, nothing happened (03.png). Retrying on the list item.
Command: --step --click "role=option:telemetry" -> 04.png

## Step 3 (04.png)
A small box appeared under Filters: telemetry, "Is any of", with yes 7, no 4, (no value) 1. Small grey text, but I can read it. I want the ones that send by themselves, so I tick "yes".
Command: --step --click-at 85,500 (input "yes, 7 nodes") -> 05.png

## Step 4 (05.png)
Top bar now says "7 of 12 nodes, 3 of 14 edges" and the table lists 7 gauges, all "yes". The others are gone from the picture but the card says "Hide", so I take it they're not deleted. Now the depth. There's "Add a condition" in the same box; I'll use that for 70 cm or deeper.
Command: --step --click "Add a condition" -> 06.png

## Step 5 (06.png)
The same column list again, telemetry marked "already a condition". I pick depth_cm.
Command: --step --click-at 145,444 (option "depth_cm, 48 to 210") -> 07.png

## Step 6 (07.png)
depth_cm came in as "Between 48 to 210". Already 6 of 12 because one gauge with no depth dropped out ("2 nodes have no value and are left out" - fine, no depth means I can't say it's deep). I'll change the 48 to 70.
Command: --step --click-at 125,684 --key Control+a --type "70" --key Enter -> 08.png

## Step 7 (08.png)
Now "5 of 12 nodes" up top, and the table lists G01, G02, G04, G09, G11, all yes and 72 or deeper. That's the first half. Now I have to mark the ones put in before 2005, without taking any others away. The card has "Select" and "Hide" at the top. I don't want to change this card, so I'll make a second filter with the plus next to Filters and see if that one can "Select" instead of hide.
Command: --step --click "Add filter" -> 09.png

## Step 8 (09.png)
The column list again. I pick "installed".
Command: --step --click-at 327,678 (option "installed") -> 10.png

## Step 9 (10.png)
A second box: "installed", "Before", and a field "A date or a year". The first box folded up and reads "telemetry is yes and depth_cm is between 70 and 210" - good, plain words. This second box doesn't show Select or Hide yet. I'll type 2005 first and see.
Command: --step --click-at 180,604 --type "2005" --key Enter -> 11.png

## Step 10 (11.png)
Now it says 3 of 12 nodes - it took the 2006 and 2010 gauges out of the picture, which is exactly what I was told not to do. This box also has Select / Hide, with Hide on. I'll press "Select" on this second box so it marks them instead.
Command: --step --click-at 208,586 (label "Select") -> 12.png

## Step 11 (12.png)
That's it. Top bar back to "5 of 12 nodes", the table shows the five again, and three rows are shaded green: G01 Upper Falls (1998), G02 Mill Pond (2003), G09 Lake Inlet (1999). The right side says "3 nodes selected" and the second box says "3 of 5". In the picture three dots have a yellow ring. G04 (2010) and G11 (2006) are still there, not marked. I'm done; I'm not touching anything else. The bottom says "Local only", so nothing went anywhere.

## End of session (in character)
- Finished: yes. 5 gauges are still in the picture (send by themselves, 70 cm or deeper), and 3 of them are marked (put in before 2005: G01, G02, G09).
- Ease: 5 of 7.
- What confused me:
  - When I typed 2005 in the second box, it took two of my five gauges out of the picture straight away. I hadn't asked for that; I had to notice the count drop to 3 and find the small "Select / Hide" switch, which is pale grey and tiny. If I hadn't been counting I'd have told the council 3.
  - The second box showed "5 of 12" while it was hiding things down to 3, then "3 of 5" after I switched to Select. I wasn't sure which number to believe until I looked at the top bar and the table.
  - Clicking the word "telemetry" was ambiguous at first; I just wanted the one in the list.
  - "2 nodes have no value and are left out" under depth - fine, but I had to read it twice. One gauge had no depth (Stone Weir); I assume it's correct that it's out, but I'd probably ask her about that bit.
  - "Hide" made me a bit nervous at first, until the bar at the top said "7 of 12" - so the rest weren't deleted. Nothing on screen said in plain words "not deleted", though.

## Follow-up
Facilitator: "Would it have made any difference if you had done those the other way round? How can you tell?"

Tom: I think the end result would be the same, but I can't say I know it -- I'd want to try it before I'd swear to it. What I can see: the marking box says "3 of 5", not "3 of 12", so it is counting among the five that are left after the first box, and the three marked rows (G01, G02, G09) are all ones that send by themselves and are 70 cm or deeper. The top bar still says 5 of 12. So the marking sits on top of what the first box left. If I'd done the marking first, it would have been counting all 12 -- the old gauges that don't send by themselves or are shallow would have been marked too, and then the first box would take some of them out. Whether the marks on those hidden ones would linger somewhere, or whether "3 nodes selected" on the right would then say a bigger number, I can't tell from this screen. And what nearly bit me was order inside the second box: typing 2005 before switching it to Select hid two of my gauges straight away. If I'd found the Select switch first, I'd never have seen it drop to 3. So the order of the clicks mattered more to my nerves than to the answer. The way I'd check is the same as I did: the top bar should say 5 of 12, the table should list the five, and exactly the three pre-2005 ones should be shaded.
