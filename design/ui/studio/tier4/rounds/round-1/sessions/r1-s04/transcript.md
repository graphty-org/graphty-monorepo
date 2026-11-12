# Session r1-s04 -- Tom, lab manager, returning user

Task: put gauges.csv and flows.csv together into one network; report how many gauges, how many stretches, and whether anything in the stretch list did not fit the gauge list.

## Step 0 -- start
Command: `REAL_DIST=... REAL_TIER=4 node .../real.mjs --start .../r1-s04 empty`
Screenshot: 01.png
Notes (Tom): The start screen I know. Big green "Open a file" button. Small grey line under it says "Or drop a file anywhere. It never leaves your computer." Good, that's the river data staying here. I have never put two files together. I'll start the way I always do: Open a file, with the gauge list.

## Step 1 -- open gauges.csv
Command: `--step .../r1-s04 --click "Open a file" --upload gauges.csv`
Screenshot: 02.png
Notes (Tom): That's the gauge list, as usual. 11 dots, the table says 11 nodes, Edges 0. That makes sense, the gauge list has no stretches in it. Bottom right says "Local only", fine. There's a grey chip "With issues 11" by the table which I don't understand, but I'm not here for that. Now I need to bring flows.csv in. I've never done this. On the left there's "Data" with a database picture. I'll try that.

## Step 2 -- Data panel
Command: `--step .../r1-s04 --click "Data"`
Screenshot: 03.png
Notes (Tom): Now there's a list on the left. "Sources" with my gauges file, a blue 11 and a warning triangle with 3 (no idea what the 3 is; I'd probably ask her). "Rows are: nodes". Next to "Sources" there's a plus. A source is a file, so plus should mean add another file. I'll click that plus.

## Step 3 -- Add source menu
Command: `--step .../r1-s04 --click-at 276,100` (button "Add source")
Screenshot: 04.png
Notes (Tom): A small menu: File..., Samples..., Server..., Network data..., Paste. "File..." is the one I know. I'll pick File and give it flows.csv.

## Step 4 -- File..., flows.csv
Command: `--step .../r1-s04 --click "File..." --upload flows.csv`
Screenshot: 05.png
Notes (Tom): A new screen across the top: "Join flows.csv -> gauges.csv", a green Join button and Cancel. Nothing changed yet, it seems, since the right side still says Edges 0. Good, it's asking first. Counts I can read: "14 edges added", "1 new node", "1 not in graph", "1 repeated key". The stretch list says 15 rows. I count the right-hand table: one row, G09 to G12, has no orange tag. There's no G12 in my gauge list (G01 to G11). And G03 - G04 shows up twice. So 15 rows, 14 stretches, one doesn't fit. But "1 new node" worries me: is it going to invent a gauge G12 that doesn't exist? And "not in graph" -- is that the same thing as the new node or another one? I'll click "1 not in graph" to see which one it means.

## Step 5 -- "1 not in graph"
Command: `--step .../r1-s04 --click "1 not in graph"`
Screenshot: 06.png
Notes (Tom): Good, it narrowed the stretch list to the one row: G09 to G12, 4 km. That's the one that doesn't fit, G12 isn't a gauge we have. There's a ticked box on the right of that row; I don't know what ticking means here. Now "1 new node": I want to know if that is G12 too, because I don't want a made-up gauge. Click it.

## Step 6 -- "1 new node"
Command: `--step .../r1-s04 --click "1 new node"`
Screenshot: 07.png
Notes (Tom): Nothing changed. Still the one G09 - G12 row. So I still don't know what the "new node" is. My guess is it's G12, which it would add as a gauge that isn't real. That bothers me but the task is to put them together, and it showed me the odd row. I'll press the green Join and look at the numbers it gives.

## Step 7 -- Join
Command: `--step .../r1-s04 --click-at 1083,60` (button "Join")
Screenshot: 08.png
Notes (Tom): Now there's a drawing with lines, joined up. Right side: Nodes 12, Edges 14, Components 1. Sources list shows gauges.csv 11 and the flows file with 12, 14 and a warning 1. So it did make 12 dots from 11 gauges. That's the G12 it was talking about, I'm fairly sure. I want to see it in the table before I tell anyone. I'll scroll the table down to the bottom.

## Step 8 -- scroll the node table
Command: `--step .../r1-s04 --wheel 740,700,500`
Screenshot: 09.png
Notes (Tom): There it is: G12 at the bottom, every other box empty. No station name, no position. So the 12th dot is a gauge we don't have; it came from the stretch list. I'd want to tell them "11 gauges plus one, G12, that only the stretch list mentions". Now the stretches: Edges 14, but the file had 15 rows. One was that G03 - G04 twice, I think. I'll click the "Edges" tab of the table to count.

## Step 9 -- Edges tab
Command: `--step .../r1-s04 --click "Edges"`
Screenshot: 10.png
Notes (Tom): 14 edges listed. G03 - G04 appears once here, not twice, so the repeated row was folded into one. And G09 - G12, 4 km, IS in there, even though the preview showed it as not fitting. So the bad stretch went in, with a made-up G12 at the end. There's a chip "With issues 1" next to the count, and a warning sign on Target. Let me click "With issues 1" to see what it calls the issue.

## Step 10 -- "With issues 1" on edges
Command: `--step .../r1-s04 --click "With issues 1"`
Screenshot: 11.png
Notes (Tom): One row: G09 -> G12, 4 km, with G12 in orange. That matches what the preview showed me. The bottom-left says "Autosave: saved" and bottom-right "Local only". I have what I need. I'm stopping here; I'm not going to try to remove G12 myself, that's a change I've never made and I'd ask her first.

## End of session (in character)

**Did I finish?** Yes, I think so. The two files are one network now. What I'd tell the river team:
- The network shows 12 gauges, but only 11 are real gauges from gauges.csv (G01 to G11). The 12th, G12, has no name or position; it only exists because the stretch list mentions it.
- 14 stretches. flows.csv has 15 rows; G03 to G04 is in there twice and was counted once.
- One stretch does not fit the gauge list: G09 to G12, 4 km. G12 is not in the gauge list.

**How easy, 1 (very difficult) to 7 (very easy):** 5.

**What confused me:**
- Finding where to add the second file was fine once I clicked Data; the plus next to "Sources" and then "File..." was the same file picker I know.
- The preview with the counts was the best part: "14 edges added", "1 not in graph", "1 repeated key". Clicking "1 not in graph" showed me the actual row. That's what I wanted.
- "1 new node" did nothing when I clicked it, so I had to guess it meant G12. I only found out for sure after pressing Join, when the count went to 12 and an empty G12 row was at the bottom of the table.
- The preview said G09 - G12 was "not in graph", and that row had no orange tag like the others, so I thought it would be left out. After Join it was in, as edge 14, with a made-up G12 gauge. I'm not sure if that's right or if the river team now has a gauge that doesn't exist on their map. I'd probably ask her about this bit.
- "With issues 11" on the node table and the warning triangle with "3" next to the gauge file: I never found out what those were. They were there before I did anything, so I left them alone.
- "Join" as a word: it did what I wanted, but I wasn't sure beforehand if it would change the gauge file itself. Nothing told me the original files stayed as they were.
- Things like Density, Transitivity, Direction "Directed": not my job, I skipped them.

## Follow-up

Command: `--step .../r1-s04` (look only)
Screenshot: 12.png

**Facilitator:** "How many of the stretches came from the second spreadsheet, and where did you read that?"

**Tom:** All of them, 14. The gauge list had none -- before I added flows.csv the right side said Edges 0. I read the 14 in a few places that agree: on the left under "Sources", the second line (the flows file, its name cut off to "f...") has an orange line-mark with 14 next to it; just below, under the "flows.csv" heading, the same orange 14 again; and before I joined, the preview said "14 edges added". The right side says Edges 14 and the Edges table says "14 edges". The file itself had 15 rows; the repeated G03 - G04 row was counted once, so 14. One of those 14 is the odd one, G09 to G12. The blue 12 on that same flows line I take to be the gauges it touches, including the made-up G12, but I'm guessing on that.
