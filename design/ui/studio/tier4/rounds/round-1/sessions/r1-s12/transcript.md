# Session r1-s12 -- Analyst Alex (returning user)

Task: show only gauges that report by themselves AND are 70 cm deep or deeper (hide the rest, no deleting); then among those, mark the ones installed before 2005 as the current working set without removing others. Report how many are in the picture and how many are marked.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../real.mjs --start .../r1-s12 setup:gauges-tidy.txt
Screenshot 01.png. The river project is open: 12 nodes, 14 edges, table below with id, lat, lon, depth_cm, station, code, installed. G07 has a blank depth. There is a "Filters +" in the left panel. I don't yet see a column for "sends readings by itself" -- columns says 8 of 8, so one more is off to the right. I'll scroll the table right.

## Step 2 -- scroll table right
Command: --drag 700,868 1100,868
Screenshot 02.png. There it is: "telemetry" yes/no -- that's "sends readings by itself". It has a warning triangle on the header, so something's messy in it. Two rows (G11, G12) are below the fold. I'll scroll down to see all 12 before I filter, so I know what the right answer should be.

## Step 3 -- scroll rows, hover telemetry warning
Command: --wheel 740,700,400 --hover-at 1144,509
Screenshot 03.png. A little box popped: "11 values could be yes/no -- Read as yes/no / Ignore / Show rows". There's a 12th, blank row at the bottom (a gauge that only shows up in the flows file, I guess). By eye from the table: telemetry yes and depth >= 70 are G01 (118), G02 (96), G04 (72), G09 (210), G11 Quarry Pool (88) -- 5. G07 says yes but has no depth, so it's out. Of those five, before 2005: G01 1998, G02 2003, G09 1999 -- 3. That's my check number. I'll take "Read as yes/no" so the filter can treat it as a real yes/no.

## Step 4 -- Read as yes/no
Command: --click "Read as yes/no"
Screenshot 04.png. Telemetry is now Yes/No with a toggle icon, issue count down from 11 to 1. Fine. Now the filter. Left panel has "Filters +". Clicking the plus.

## Step 5 -- Add filter
Command: --click-at 275,420 (button "Add filter")
Screenshot 05.png. A picker of attributes with ranges: depth_cm 48 to 210, telemetry "2 values" at the bottom. Picking telemetry first.
(Ambiguous with the table header; picking the option in the list.)
Command: --click "role=option:telemetry"
Screenshot 07.png. A "telemetry" filter card appeared with an empty dropdown, no label. Opening the dropdown.
## Step 6 -- open telemetry dropdown
Command: --click-at 178,476
Screenshot 08.png. Options: Yes, No, Has a value, Has no value. Picking Yes.
## Step 7 -- Yes
Command: --click "role=option:Yes"
Screenshot 09.png. Good: 7 of 12 showing, the top bar says "7 of 12 nodes, 3 of 14 edges", table shows the 7 Yes rows. The card has a Select / Hide switch (Hide is on -- that's what I want for this part) and "Add a condition". I'll add depth to this same card.
## Step 8 -- Add a condition
Command: --click "Add a condition"
Screenshot 10.png. Attribute list again; depth_cm 48 to 210. Picking depth_cm.
## Step 9 -- depth_cm
Command: --click "role=option:depth_cm"
Screenshot 11.png. Card now "telemetry, depth_cm", 6 of 12. Depth is Between 48 and 210, "2 nodes have no value and are left out" -- good, that's Stone Weir and the blank one gone, said out loud. Setting the low box to 70.
## Step 10 -- low bound 70
Command: --click-at 125,610 --key Control+a --type "70" --key Enter
Screenshot 12.png. 5 of 12 nodes, 2 of 14 edges: G01, G02, G04, G09, G11. That matches my count by eye. First half done.
Now the marking. The card has a "Select" option next to "Hide", but this card is my hide filter. I'll add a second filter for installed and set that one to Select. Worry: will it also select the hidden old gauges (Cedar Bend 2001, Old Bridge 1995)? We'll see.
## Step 11 -- second filter
Command: --click "Add filter"
Screenshot 13.png. Attribute list. Picking installed.
## Step 12 -- installed
Command: --click "role=option:installed"
Screenshot 14.png. New "installed" card, already set to "Before", cursor in "A date or a year". The first card collapsed into a sentence: "telemetry is Yes and depth_cm is between 70 and 210" -- nice, readable. The new card has no Select/Hide switch yet. Typing 2005.
## Step 13 -- 2005
Command: --type "2005" --key Enter
Screenshot 15.png. Hm -- this one defaulted to Hide too, so now only 3 of 12 are on the picture (G01, G02, G09). That's not what I want: Fox Creek and Quarry Pool got taken away. Also the card's own badge says "5 of 12", which confuses me -- 5 what? I guess it counts all gauges before 2005 including the hidden ones. Switching this card to Select.
## Step 14 -- Select on the installed card
Command: --click-at 208,586
Screenshot 16.png. That's it. Top bar back to "5 of 12 nodes, 2 of 14 edges", right panel says "3 nodes selected", the card badge now says "3 of 5" (so it only counts what's in the picture -- good, the hidden old gauges Cedar Bend and Old Bridge did not get marked). Rows G01 Upper Falls, G02 Mill Pond, G09 Lake Inlet are highlighted in the table and ringed on the canvas; Fox Creek and Quarry Pool still showing, not marked. Matches what I worked out by eye at step 3. Stopping here.

## Wrap-up (in character)

Answer: 5 gauges still in the picture (G01 Upper Falls, G02 Mill Pond, G04 Fox Creek, G09 Lake Inlet, G11 Quarry Pool), 3 of them marked (G01, G02, G09 -- the ones put in before 2005). Nothing deleted; the full graph still says 12 nodes.

Did I finish? Yes.

Ease: 6 of 7. About 14 clicks, numbers matched what I counted by hand, and it told me out loud which gauges with no depth / no date it was leaving out -- that's the kind of thing I'd otherwise get burned by.

What slowed me down or confused me:
- The "reports by itself" column (telemetry) was off-screen to the right; I had to scroll the table to find it. Columns "8 of 8" made me think everything was visible.
- telemetry came in as text with a warning; I had to hover the triangle and pick "Read as yes/no" before it would act like a yes/no. Not hard, but I wouldn't have known to if I hadn't hovered.
- The second filter card defaulted to Hide, so for a moment I'd thrown away two gauges I wanted to keep. The Select/Hide switch is small and grey; I only knew to look for it because I'd noticed it on the first card. Would be easy to miss and report "3" as the answer.
- The second card's badge said "5 of 12" while it was hiding and "3 of 5" once it was selecting. The first number made no sense to me in context (5 out of the whole graph, counting gauges I'd already hidden). Once on Select it read right.
- The first filter's empty value dropdown had no label or hint -- I clicked it on faith.
- In Gephi I'd do this with a filter chain and then a manual selection; this was quicker. I'd still want to know whether these two filter cards save with the project so I don't redo them next week.

## Follow-up

Q (facilitator): "Would it have made any difference if you had done those the other way round? How can you tell?"

Looked at the screen again (17.png, nothing clicked): still 5 of 12 nodes, 3 nodes selected, installed card "3 of 5", telemetry/depth card "5 of 12".

A (Alex): For the final answer, I think not -- but I can only half prove it. What I can see: both filters are still sitting there as live cards, not one-off actions. The marking card's badge says "3 of 5", so it is counting against what the hide card left in the picture, and the selection panel says 3 nodes, all three of them Yes and 96 to 210 deep. Cedar Bend and Old Bridge -- old, but shallow or not reporting -- are not selected. If the order mattered in a lasting way I'd expect them to be stuck in the selection, and they aren't. Also, when the installed card was briefly on Hide, its badge said "5 of 12", which tells me each card works out its own matches across the whole graph and then the screen combines them; that sounds like order doesn't matter.
What I can't tell: if I had marked first, the installed card would have selected 5 of 12, including Cedar Bend and Old Bridge, and I don't know whether adding the hide afterwards drops them from the selection or just hides them while they stay "marked" underneath. Nothing on screen says which. If they stay marked, the right panel would have said 5 selected and I'd have reported the wrong number. To actually know, I'd switch the hide card off with its check box and see whether "3 nodes selected" jumps to 5 -- and I'd want the app to say "3 selected (2 more hidden)" so I don't have to test it. So: same result the way I did it; the other way round I'd be guessing.
