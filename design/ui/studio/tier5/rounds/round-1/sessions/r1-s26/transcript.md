# Session r1-s26 transcript (participant: Tom, returning user, river gauge project)

Task: filter should also bring back gauges 140 cm deep or deeper (whether or not they self-report); orange should go to every gauge in the picture installed up to end of 2004. Report how many in picture and how many orange.

## Step 0 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <session> setup:gauges-telemetry.txt
Screenshot 01.png. Says "7 of 11 nodes, 3 of 13 edges" at the top. A layer "Oldest" colors 2 of 7 nodes, rule "installed before 2000". Table shows 7 gauges, depth_cm column. So there is a filter somewhere -- I'd guess the funnel icon at the top next to the counts.

## Step 1
Command: --step <session> --click-at 201,20 (the funnel; it was "Filter: 7 of 11 nodes ... showing only telemetry yes")
Screenshot 02.png. Opened the Data place, same as last month. Under Filters there is one card "telemetry yes 7 of 11". That is the "send readings by themselves" rule. I need to add the deep ones to it. I'll open that card.

## Step 2
Command: --step <session> --click-at 150,476 (the "telemetry yes" card)
Screenshot 03.png. Nothing opened; an "Edit" button appeared on the card. The count "7 of 11" disappeared in its place. I'll press Edit.

## Step 3
Command: --step <session> --click-at 259,476 (Edit telemetry yes)
Screenshot 04.png. An editor: on the right, "telemetry" with yes (7) ticked and no (4). At the top there is "Condition..." and "Or...". The task says deep ones should come back "whether they send readings or not" -- that sounds like "or". I'll click "Or...".

## Step 4
Command: --step <session> --click "Or..."
Screenshot 05.png. Left side now shows A (telemetry yes, 7) "or" B (0). A list opened on the right asking "Value..." with depth_cm (48 to 210) among them. I pick depth_cm.

## Step 5
Command: --step <session> --click-at 1196,268 (option depth_cm)
Screenshot 06.png. Now a slider 48 to 210 with two boxes "48 to 210" (looks like grey hints), "0 so far", and "Not measured: 1". I want 140 and up, so I'll type 140 in the first box.

## Step 6
Command: --step <session> --click-at 1203,274 --type "140" --key Tab
Screenshot 07.png. Now "depth_cm min 140", B has 3, header says 9 of 11. Cedar Bend at exactly 140 is in (B), good, "or deeper" includes it. Old Bridge 155 is in. Only 2 no match. The A 7 + B 3 = 10 but 9 total, so one is probably both -- fine. I'll press Done.

## Step 7
Command: --step <session> --click "Done"
Screenshot 08.png. Back to the picture: 9 of 11 nodes. The filter card now reads telemetry yes (A 7) or depth_cm min 140 (B 3). Table shows 9 gauges incl. Cedar Bend 140, Old Bridge 155, Lake Inlet 210. Now the orange: the "Oldest" layer on the right says "installed before 2000", 3 of 9. I need it to cover up to the end of 2004. I'll click that "installed before 2000" line.

## Step 8
Command: --step <session> --click-at 1282,238 (the "installed before 2000" line)
Screenshot 09.png. Editor: installed / Before / 2000. 3 match (Upper Falls 1998, Old Bridge 1995, Lake Inlet 1999). "Up to the end of 2004" means before 2005, so I'll replace 2000 with 2005.

## Step 9
Command: --step <session> --click-at 1040,216 --key Control+a --type "2005" --key Tab
Screenshot 10.png. "installed before 2005", 5 of 9: Upper Falls 1998, Mill Pond 2003, Cedar Bend 2001, Old Bridge 1995, Lake Inlet 1999. 4 no match. Pressing Done.

## Step 10
Command: --step <session> --click "Done"
Screenshot 11.png. Picture: 9 of 11 nodes, legend "Color: Oldest 5 of 9 nodes", rule "installed before 2005". Five orange dots visible. Bottom left says "Autosave: saved", so I take it the project is kept. I stop here.

## End (in character)
Finished: yes. 9 gauges are in the picture; 5 of them are orange (Upper Falls, Mill Pond, Cedar Bend, Old Bridge, Lake Inlet).

Ease: 5 of 7.

What confused me:
- Clicking the filter card the first time did nothing visible except swap the "7 of 11" count for an "Edit" button; I had to click again.
- In the filter, "A 7 or B 3" but the total is 9. I worked out one gauge must be in both, but nothing on screen says so; I'd want to be sure I didn't lose one.
- The depth boxes showed 48 and 210 in grey; I wasn't sure whether those were already set or just hints. Typing 140 worked.
- I wasn't sure if "140 cm or deeper" counted exactly 140; I only knew because Cedar Bend (140) showed up in the list.
- For the orange I had to translate "up to the end of 2004" into "before 2005" myself; I'd have been nervous if a gauge had been put in on a date in late 2004.
- There's a "With issues 9" chip and a warning sign by "station" in the table. Nobody told me what the issue is; I left it alone.
- I never pressed a Save; I'm trusting "Autosave: saved" at the bottom.

## Follow-up
Q: On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

A: 3. Mostly calm -- the funnel, the filter card, "Or..." and the "installed before 2000" line were all where I expected after last month. The moment I was least sure was right after I clicked the "telemetry yes" card under Filters in the Data place (screenshot 03). I expected the card to open, and instead nothing opened: the "7 of 11" count on the card disappeared and a small "Edit" button showed up in its place. For a second I thought I had changed something or lost the count, and I had to look around the panel before I saw I needed to press Edit. A close second was inside the editor, when it said A 7 or B 3 but the top said 9 of 11 -- I had to work out myself that one gauge was in both before I trusted it.
