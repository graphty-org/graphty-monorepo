# Session r1-s03 transcript -- Analyst Alex (returning user)

Task: combine pantries.csv (sites) and deliveries.csv (routes with trips) into one network; report site count, route count, and whether any route did not fit the site list.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> empty`
Screenshot 01.png: the usual start screen. "Open a file" button, "Open network data", "Samples", "New project". The line "It never leaves your computer" is there, good -- that's why I'm allowed to use this.
Plan: I usually open the main list with "Open a file". I'll open pantries.csv first and see if it lets me add the routes file.

## Step 2 -- open pantries.csv
Command: `--step <session> --click "Open a file" --upload pantries.csv`
Screenshot 02.png: 12 dots, Nodes 12, Edges 0, 12 components. Table shows P01..P10 etc with families, site, zip. "With issues 2" chip and warning triangles on families and site columns (P07 families "n/a"). Fine, sites are in. Now I need the routes. There's a "Data" item on the left rail -- that's probably where I add the second list.
Next: click "Data".

## Step 3 -- Data panel
Command: `--step <session> --click "Data"`
Screenshot 03.png: Data panel shows "Sources" with pantries... (12, 2 warnings), a pantries.csv section with "Rows are: nodes", Id: id, Latitude/Longitude. There's a "+" next to Sources -- that must be how I add the second file.
Next: click the + beside Sources.

## Step 4 -- Add source menu
Command: `--step <session> --click-at 276,100` (button "Add source")
Screenshot 04.png: a menu: File..., Samples..., Server..., Network data..., Paste.
Next: File... and pick deliveries.csv.

## Step 5 -- add deliveries.csv
Command: `--step <session> --click "File..." --upload deliveries.csv`
Screenshot 05.png: a "Join deliveries.csv -> pantries.csv" bar with Join / Cancel. Rows as Edges, Source from = Id, Target to = Id. Chips: "18 edges added", "1 new node", "1 not in graph", warning "1 repeated key". deliveries.csv has 19 rows. Pantries side still 12 nodes. So 19 rows, 18 edges -- one row didn't make it, plus one new node. I want to see which.
Next: click "1 not in graph".

## Step 6 -- "1 not in graph"
Command: `--step <session> --click "1 not in graph"`
Screenshot 06.png: filtered to one row: P05 -> P13, 4 trips. There's no P13 in the site list (it stops at P12). So that's the misfit route. "1 new node" is probably P13 being made up. I'm not sure if that row counts in the 18 or not.
Next: click "1 repeated key" to see the other warning.

## Step 7 -- "1 repeated key"
Command: `--step <session> --click "1 repeated key"`
Screenshot 07.png: it opened a little menu: Keep first / Keep both / Ignore. It doesn't show me WHICH route is repeated before asking me to decide. I don't want to pick blind -- in the deck that's a trip count that could be double counted.
Next: Escape, turn off the "not in graph" filter, and scroll the route list to find the duplicate myself.

## Step 8 -- scroll the route list
Command: `--step <session> --key Escape --click "1 not in graph" --wheel 975,600,800`
Screenshot 08.png: bottom of the 19 routes. The last row is P03 - P10, 6 trips -- exactly the same as an earlier row (P03 - P10, 6). That's the repeated one; looks like a copy-paste dupe in their spreadsheet. The P05 -> P13 row has no edge chip, so it isn't becoming a route. But the "1 new node" chip makes me unsure whether P13 is about to be made into a site anyway. And "18 edges added" seems to count the duplicate twice.
Next: set the repeated key to "Keep first" (one P03-P10 route, not two) and see if the counts change.

## Step 9 -- Keep first
Command: `--step <session> --click "1 repeated key" --click "Keep first"`
Screenshot 09.png: nothing visibly changed. Still "18 edges added", the duplicate P03 - P10 at the bottom still has its edge chip. I can't tell if my choice took. Maybe "repeated key" means something other than the duplicate route.
Next: hover the "1 repeated key" chip to see what it says.

## Step 10 -- hover repeated key
Command: `--step <session> --hover "1 repeated key"`
Result: no tooltip at all. 
Next: click "1 new node" to see which node it wants to create.

## Step 11 -- "1 new node"
Command: `--step <session> --click "1 new node"`
Screenshot 11.png: nothing changed. It's not a filter like "not in graph" was. Still don't know what the new node is (I'm guessing P13).
Next: just press Join and check the counts in the Overview afterwards.

## Step 12 -- Join
Command: `--step <session> --click "Join"`
Screenshot 12.png: joined. Overview now says Nodes 13, Edges 18, 1 component. Sources shows pantries.csv 12 and d.. (deliveries) 13 nodes / 18 edges / 1 warning. Hold on -- 13 nodes. The food bank has 12 sites. So it went ahead and made P13 a site even though it's not in their list. That's the kind of thing that ends up wrong in a report. And 19 route rows became 18 edges, so either the duplicate was merged or the P13 row was dropped -- the numbers alone don't tell me which.
Next: open the Edges tab in the table to see what routes are actually in.

## Step 13 -- Edges tab
Command: `--step <session> --click "Edges"`
Screenshot 13.png: 18 edges, Source / Target / trips. "With issues 1" chip, warning triangle on Target column.
Next: click "With issues 1".

## Step 14 -- edge issues
Command: `--step <session> --click "With issues 1"`
Screenshot 14.png: one edge: P05 -> P13, 4 trips, P13 in orange. So the misfit route IS in the network and P13 got made into a 13th node. That means 19 rows - 1 duplicate (P03-P10 merged by "Keep first", I think) = 18 edges. That squares with the numbers now.
Next: hover the warning on Target to see what it says about P13.

## Step 15 -- hover Target warning
Command: `--step <session> --hover-at 532,509`
Result: "Issues in Target" icon, no tooltip text.
Next: hover the orange P13 cell itself.

## Step 16 -- hover P13
Command: `--step <session> --hover-at 446,542`
Result: nothing, no tooltip. Orange text with no explanation.
Next: click the warning "1" next to deliveries in Sources, hoping it spells the problem out.

## Step 17 -- issues in deliveries.csv
Command: `--step <session> --click-at 230,162` (button "1 issue in deliveries.csv")
Screenshot 17.png: finally a plain list: "edges -- 1 unknown end" with Add nodes (highlighted, seems to be what it did by default) / Leave out / Ignore. OK so by default it invented P13. The food bank says their site list is every site, so I don't want a made-up 13th site in the counts.
Next: click "Leave out" and check the Overview counts.

## Step 18 -- Leave out
Command: `--step <session> --click "Leave out"`
Screenshot 18.png: "Resolved 1". Overview now Nodes 12, Edges 17, 1 component. Sources: deliveries 12 nodes / 17 edges / 0 issues. That matches the site list. 19 rows - 1 (P05->P13, unknown site) - 1 (duplicate P03->P10) = 17. Good, the arithmetic closes.
Next: close the popup, turn off the issues filter and scroll the edge list once to make sure P03 -> P10 is in there only once.

## Step 19 -- check the edge list
Command: `--step <session> --key Escape --click "With issues 0" --wheel 750,700,800`
Screenshot 19.png: 17 edges, the list now ends at P02 -> P06; the trailing duplicate P03 -> P10 is gone and P05 -> P13 is gone. Sources: pantries.csv 12, deliveries 12 nodes / 17 edges, no warnings. I'm done.

## Wrap-up (in character)

**Did I finish?** Yes. The food bank network is 12 sites and 17 routes, all in one connected piece. Two things in deliveries.csv did not fit:
- one route, P05 -> P13 (4 trips), goes to a site P13 that is not in pantries.csv. I left it out so the network matches their site list -- they should tell me whether P13 is a real site that's missing from their list.
- one route, P03 -> P10 (6 trips), is in the route list twice, identical. I kept one copy. (Their file has 19 rows; 19 - 1 - 1 = 17.)
Separately the site list itself shows 2 issues (P07 families "n/a" and something flagged in the site column) but that wasn't the question.

**Ease: 4 out of 7.** Getting the second file in was quick -- Data, + next to Sources, File..., and the join screen guessed from/to against id on its own. What took longest was working out what the chips meant.

**What confused me:**
- The join preview said "18 edges added" and "1 new node" and I couldn't tell from that whether P13 was going to be made into a site. After Join it was: 13 nodes. Making up a site by default without asking is exactly the kind of thing that ends up wrong in a deck; I only caught it because I know they have 12.
- In the preview, the P05 -> P13 row had no edge chip, so I thought it was being dropped -- but after Join it was in. The preview and the result disagreed.
- "1 repeated key" opened Keep first / Keep both / Ignore without ever showing me which row was repeated. I had to scroll and spot the duplicate myself. After picking "Keep first" nothing on screen changed, so I didn't know it took until the final counts.
- Clicking "1 new node" did nothing. Hovering the warning icons and the orange P13 gave no tooltip.
- The real explanation ("1 unknown end" with Add nodes / Leave out / Ignore) only showed up after the join, behind the little warning count next to the source. That should be on the join screen where I make the decision.
- Compared to my usual: in Gephi I'd have done this in Python first with a merge and an anti-join and had the answer in two lines. Here I got there, but by counting rows in my head.

## Follow-up

**Facilitator:** How many of the routes came from the second spreadsheet, and where did you read that?

**Alex:** 17. I looked at the screen again to be sure (20.png). In the Data panel, under Sources, the deliveries line shows "12" nodes and "17" for the edge count, and the deliveries.csv section underneath shows "17" too. The Overview on the right agrees: Edges 17. The table's Edges tab header also says "17 edges". Since pantries.csv brought no edges at all (it had Edges 0 when I opened it alone), all 17 routes come from deliveries.csv. That is 19 rows in their spreadsheet, minus the P05 -> P13 route I left out because P13 is not on the site list, minus the second identical P03 -> P10 row. One caveat: the source line is abbreviated "deliveri..." and the numbers are just a dot and a slash icon, so I am reading "edges" off the icon, not off a word.
