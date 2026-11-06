# Session r1-s24 -- Maren (returning user), gauges task

Task: one gauge appears only in the stretch list (flows), not among the team's own gauges. Hide it from the picture without deleting it from the network, and say how many gauges remain in the picture.

## Step 1 (start)
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../real.mjs --start .../r1-s24 setup:gauges-joined.txt
Screenshot: 01.png
Notes: Colleague's project is open. Sources: gauges.csv with 11, flows with 12 nodes / 14 edges and a warning "1". Graph panel says 12 nodes. So 12 - 11 = one gauge that only appears in flows. Good -- at least it gives me counts. Table shows G01..G10; I need to scroll to find the odd one.

## Step 2
Command: --step --click-at 233,162   (warning "1 issue in flows.csv")
Screenshot: 02.png
Notes: Popover "Issues in flows.csv": edges, 1 unknown end, with Add nodes / Leave out / Ignore. That's my stray gauge. But "Leave out" sounds like it removes it from the data, and the task says don't delete it. And the network already shows 12 nodes, so it seems to be in. I'd rather not touch an import option on someone else's project. I'll close this and find which id it is in the table first.

## Step 3
Command: --step --key Escape --wheel 740,750,600
Screenshot: 03.png
Notes: There it is: G12, last row, every column blank -- it only exists because a flow row points at it. So the team's own gauges are G01-G11. Now to hide G12 without deleting it. In Cytoscape I'd select and hide, or use a filter. There's a "Filters +" in the left panel. Trying that.

## Step 4
Command: --step --click-at 275,420  (Add filter)
Screenshot: 04.png
Notes: A list of attributes: Node id, lat, lon, depth_cm, station ("91% have a value"), code, installed... 91% = 11 of 12, the one without is G12. Filtering on station having a value should keep the team's gauges only. Picking station.

## Step 5
Command: --step --click-at 322,634  (option station)
Screenshot: 05.png
Notes: Filter card "station" with "Contains" and a text box. Nothing changed in the picture yet. I want "has a value" / "is not empty". Opening the Contains dropdown.

## Step 6
Command: --step --click-at 180,476  (combobox "station: how to match")
Screenshot: 06.png
Notes: Options: Contains, Starts with, Ends with, Is exactly, Has a value, Has no value. "Has a value" is exactly what I want.

## Step 7
Command: --step --click "role=option:Has a value"
Screenshot: 07.png
Notes: Done. Top bar now says "11 of 12 nodes, 13 of 14 edges" with a filter icon; the right panel splits "Nodes showing 11 of 12 / Edges showing 13 of 14" from "Full graph: Nodes 12, Edges 14". The filter card says "11 of 12" with Select / Hide, and Hide is the one switched on. The dangling node at the right end of the lower branch is gone from the drawing, and the network still holds 12. Oh -- it kept the full graph counts next to the shown ones. Good. That's what I'd want in Cytoscape and usually have to work out myself.

## Wrap-up (in character)
- Finished: yes. The stray gauge is G12 (blank in every gauges.csv column; it only exists because a flow row names it). Hidden with a filter "station: Has a value" in Hide mode, not deleted. Gauges still in the picture: 11 (of 12 in the network; 13 of 14 stretches shown).
- Ease: 6 out of 7.
- What confused me / notes:
  - The flows warning "1 unknown end" offered Add nodes / Leave out / Ignore. I didn't know whether "Leave out" deletes the gauge from the network or just hides it, and since it already showed 12 nodes it was unclear which of those was currently in effect. I avoided it because the task said not to delete.
  - The filter used my station column rather than "where the node came from"; it worked because G12 has no station, but a "came only from flows.csv" condition would be more honest. I'd have to say "filtered on station present" in my notes.
  - The filter started in "Contains" with an empty text box and nothing changed on the picture until I picked "Has a value" -- fine, but I briefly wondered if it was live.
  - The canvas was still in 3D (the 3D toggle); for a figure I'd want to switch to flat, but that wasn't the task.
