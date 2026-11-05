# Session r1-s01 transcript (Grace, returning)

Task: combine pantries.csv (sites) and deliveries.csv (routes) into one network; report site and route counts, and whether anything in the route list did not fit the site list.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> empty`
Screenshot: 01.png. The start screen I know: "Open a file" big green button, also "Open network data", "Samples", "New project". Note at the bottom says a dropped file never leaves my computer -- good. I'll do what I did last week: Open a file, pantries.csv first.

## Step 2 -- open pantries.csv
Command: `--step <session> --click "Open a file" --upload pantries.csv`
Screenshot: 02.png. Sites came in: Nodes 12, Edges 0 -- 12 dots, no lines yet. Table shows P01 Central Warehouse ... P10 Westgate Mosque, columns id, lat, lon, families, site, zip, opened. There's a "With issues 2" chip and warning triangles on families and site (P07 families says "n/a"). Twelve sites, that's what I'd expect from a site list. Now I need the routes on top of this. I never did that here. I'll look in Data on the left rail, since it's about bringing data in.

## Step 3 -- Data place
Command: `--step <session> --click "Data"`
Screenshot: 03.png. Data shows "Sources" with pantries... 12 and a warning 2, then the file's settings: Rows are nodes, Id = id, Latitude lat, Longitude lon. There's a + next to Sources -- that looks like "add another file". I'll click it.

## Step 4 -- Add source menu
Command: `--step <session> --click-at 276,100` (it was "Add source")
Screenshot: 04.png. A menu: File..., Samples..., Server..., Network data..., Paste. "File..." it is, then deliveries.csv.

## Step 5 -- add deliveries.csv
Command: `--step <session> --click "File..." --upload deliveries.csv`
Screenshot: 05.png. A "Join deliveries.csv -> pantries.csv" bar. It guessed Edges, Source "from" = Id, Target "to" = Id. Summary chips: "18 edges added", "1 new node", "1 not in graph", "1 repeated key". deliveries.csv has 19 rows -- Excel would say 19. So 19 rows but 18 edges, and 1 new node... I want to know which row is the odd one. I'll click "1 new node".

## Step 6 -- clicked "1 new node"
Command: `--step <session> --click "1 new node"`
Screenshot: 06.png. Nothing visibly changed. Hm. Let me hover "1 not in graph" to see if it explains itself.

## Step 7 -- hover "1 not in graph"
Command: `--step <session> --hover "1 not in graph"`
Screenshot: 07.png. No tooltip. I'll just click it.

## Step 8 -- clicked "1 not in graph"
Command: `--step <session> --click "1 not in graph"`
Screenshot: 08.png. Now the route list shows just one row: from P05 to P13, 4 trips. There is no P13 in my site list (it stops at P12). That's the row that doesn't fit -- I'd go check P13 in the export. The chip label "not in graph" is a bit odd, I'd say "site not in the site list", but I get it. Now "1 repeated key" -- let me see that one too.

## Step 9 -- clicked "1 repeated key"
Command: `--step <session> --click "1 repeated key"`
Screenshot: 09.png. It opened a little menu: Keep first, Keep both, Ignore. But it doesn't show me WHICH route is repeated, and I don't know which choice is set now. I won't pick blind. Escape, then turn off the "not in graph" filter and look through all 19 rows myself.

## Step 10 -- all 19 route rows
Command: `--step <session> --key Escape --click "1 not in graph" --wheel 975,600,800`
Screenshot: 10.png. Scrolled to the bottom of the route list. The last row is P03 -> P10, 6 trips -- the same as an earlier row (P03 -> P10, 6). That's the repeated one, a copy-paste double in the export. The P05 -> P13 row has no edge tag next to it, so it isn't becoming a route. So: 19 rows, 1 points at a site that doesn't exist (P13), 1 is a duplicate. "18 edges added" -- I'd expect 17 if the duplicate is dropped, so I guess it keeps both right now? And "1 new node" -- is it going to add P13 as a 13th site? Not clear. I'll press Join and count what actually lands.

## Step 11 -- pressed Join
Command: `--step <session> --click "Join"`
Screenshot: 11.png. Now Nodes 13, Edges 18, Components 1. Wait -- 13 sites? My site list has 12. So it made P13 into a site even though it's not in pantries.csv. That's a number that changed on me. Sources now: pantries.csv 12, and d.. (deliveries) 13 nodes / 18 edges / warning 1. I need to know whether the P05-P13 route is in the 18 and whether the duplicate got dropped. I'll look at the Edges tab in the table.

## Step 12 -- Edges tab
Command: `--step <session> --click "Edges"`
Screenshot: 12.png. 18 edges, "With issues 1", a warning on the Target column. Let me click "With issues 1" to see which route is flagged.

## Step 13 -- edges with issues
Command: `--step <session> --click "With issues 1"`
Screenshot: 13.png. One flagged route: P05 -> P13, 4 trips, with P13 in orange. So that route IS one of the 18, and the program made P13 into a 13th dot to hang it on. That means the 18 is 19 rows minus the duplicate P03 -> P10. Okay, I can put that together. I'm stopping here -- I have my answer and it's lunch hour.

## End of session (in character)

**Did I finish?** Yes. The two files are one network: the routes are drawn between the sites (one connected piece).

**My answer:**
- The program says 13 nodes and 18 edges. But pantries.csv only has 12 sites -- the 13th, "P13", isn't a real site in my list; the program made it up from a route row.
- So: 12 sites, and 18 routes as joined (17 between sites that are in my site list, plus 1 to the unknown P13).
- Two things in deliveries.csv (19 rows) didn't fit:
  1. P05 -> P13 (4 trips): P13 isn't in pantries.csv. I need to check the export -- a new site, or a typo.
  2. P03 -> P10 (6 trips) appears twice (the last row repeats an earlier one); it was only counted once.

**Ease: 5 out of 7.** Adding the second file was easy to find (Data, the + by Sources, File...), and the join screen guessed from/to correctly and told me right away there were problems. Clicking "1 not in graph" showed me the exact row, which is exactly what I want for fixing the export.

**What confused me:**
- "1 new node" did nothing when I clicked it, and it didn't say it was going to add P13 to my sites. After Join the count went from 12 to 13 with no warning -- I had to work out myself that a made-up site had been added. I'd rather it asked, or left that route out and listed it.
- "1 repeated key" opened Keep first / Keep both / Ignore, but didn't show which row was repeated, or which option was already chosen. I had to scroll the route list and spot the duplicate myself. "Key" is a database word; I'd say "duplicate route".
- "18 edges added" before Join: I couldn't tell if that was with or without the duplicate and the P13 row until after I'd joined and checked the table.
- "not in graph" -- I'd say "not in your site list".

## Follow-up

**Facilitator:** "How many of the routes came from the second spreadsheet, and where did you read that?"

**Grace:** All 18 of them came from deliveries.csv. pantries.csv brought in no routes at all. When I opened it on its own it said Nodes 12, Edges 0, so every line on the screen now came from the second file. I read the 18 in the Data place on the left, under Sources. The second row, the one with the link icon and the name cut short to "d..", has an orange chip with a slash that says 18. That's the routes. The blue 13 next to it is the sites those routes touch, P13 included, and the triangle with a 1 is the flagged P05 -> P13 row. Further down that panel, the deliveries.csv section has the same orange 18 chip again. I took another look just now (14.png) to check, and the Graph panel on the right says "From 2 files" with Edges 18, so the two places agree. The file had 19 rows, and 18 is what came out after the repeated P03 -> P10 was dropped. The name being cut to "d.." didn't help. I knew it was deliveries only because it was the second file I added, and because the section heading underneath spells out deliveries.csv.
