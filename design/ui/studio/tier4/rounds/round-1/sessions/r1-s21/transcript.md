# Session r1-s21 -- Analyst Alex (returning user)

Task: use the site's own name everywhere instead of its code; make routes the van drove more often count more when the program measures the network; report what the program calls site P05.

## Step 01 (start)
Command: `REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> setup:pantries-joined.txt`
Screenshot 01.png. The food bank project is open: pantries.csv (12 nodes) plus deliveries (13 nodes, 18 edges, 1 warning). Table shows id P01..P10 with a "site" column -- P05 is "Harbor Market". Data panel has sections Fields, deliveries.csv (Direction: Auto) and a collapsed pantries.csv. Hm, 12 sites in my list but 13 nodes in the graph -- noting that. Plan: open the pantries.csv section, look for where it picks the name.

## Step 02
Said: "Sites list has its own collapsed section, opening it to find where the name comes from."
Command: `--step <session> --click-at 105,366` -> button "Expand pantries.csv". Screenshot 02.png.
Saw: Rows are: nodes; 12; Id = id; Latitude = lat; Longitude = lon; a "+" next to the 12. No name/label row yet. Next: try the "+" to add one.

## Step 03
Said: "There's a plus next to the 12, try it."
Command: `--step <session> --click-at 276,436` -> button "Add to node fields". Screenshot 03.png.
Saw a menu: Label, Kind, Weight, Time, Coordinates, Country, Region, City. "Label" is what I want.

## Step 04
Said: "Label -- that's it."
Command: `--step <session> --click-at 166,472` -> menuitem "Label". Screenshot 04.png.
Saw a new Label row with an empty dropdown already open listing the columns: lat, lon, families, id, site, zip, opened, volunteer_run. Picking "site".

## Step 05
Said: "site, obviously."
Command: `--step <session> --click-at 234,628` -> option "site". Screenshot 05.png.
Saw: Label = site; the table's site column now has a green "Label" tag. The site column still has a warning triangle -- something's off in it, will look later. Canvas has no names drawn. Now weight: deliveries.csv also has a "+", trying that.

## Step 06
Said: "Same trick on the deliveries list for weight."
Command: `--step <session> --click-at 276,287` -> button "Add to edge fields". Screenshot 06.png.
Saw a menu: Weight, Time. Picking Weight.

## Step 07
Said: "Weight -- the only number column is trips. That's how often the van drove it."
Command: `--step <session> --click-at 170,323` -> menuitem "Weight". Screenshot 07.png.
Saw a Weight row with its list open: only "trips". Picking it. (Nagging thought from NetworkX: in betweenness the weight is a distance, so more trips would make a route look LONGER. Want to see if the program asks which way round.)

## Step 08
Said: "trips it is."
Command: `--step <session> --click-at 235,383` -> option "trips". Screenshot 08.png.
Saw: Weight = trips, and a new empty row "Higher means" appeared under it. Overview now shows "Loaded weight: trips". Good -- that's exactly the which-way-round question. Opening it.

## Step 09
Command: `--step <session> --click "Higher means"`. Screenshot 09.png.
Saw: nothing visibly opened. Clicking the box itself.

## Step 10
Command: `--step <session> --click-at 212,381` -> combobox "Higher weight means". Screenshot 10.png.
Saw options: closer, farther, capacity. More trips = a stronger, more-used link, so for the measures it should count as "closer" (the opposite of the NetworkX distance default). "capacity" made me hesitate a second -- sounds like flow -- but closer is the one that makes busy routes matter more for rankings. Picking closer.

## Step 11
Command: `--step <session> --click "role=option:closer"`. Screenshot 11.png.
Saw: Higher means = closer; Overview says "Loaded weight: trips (closer)". Both settings done. But the site column still has a warning triangle -- before I quote P05's name I want to know what's wrong with it. Hovering the triangle.

## Step 12
Command: `--step <session> --hover-at 903,509` -> img "Issues in site", no tooltip. Screenshot 12.png.
Nothing tells me what the issue is on hover. Trying the "With issues 2" chip above the table.

## Step 13
Command: `--step <session> --click-at 508,448` -> "With issues 2". Screenshot 13.png.
Saw only two rows with issues: P06 (site "Northgate Center" in orange) and P07 (families "n/a"). Not P05, so P05's name isn't the problem row. Still, I want to see what the program itself calls P05 now, not just the table cell. Turning the issue filter off and using the search button on the toolbar.

## Step 14
Command: `--step <session> --click-at 508,448 --click-at 881,391` -> filter off; "Quick actions". Screenshot 14.png.
Saw: that magnifier is a command list, not a node search. Closing it and just clicking the P05 row to see what the side panel calls it.

## Step 15
Command: `--step <session> --key Escape --click-at 325,674` -> rowheader "P05". Screenshot 15.png.
Saw: the row highlights, the camera flies to the node, and the right panel's header now reads "Harbor Market" (Node), with id P05, site Harbor Market, degree 4. So the program itself names it by the site name now. Done.

## End of session (in character)

**Finished?** Yes. Label = site on the sites list, Weight = trips on the deliveries list with "Higher means: closer". The program now calls P05 **Harbor Market** (header of the node panel).

**Ease: 6 / 7.** Ten-ish clicks, all in one panel. The "+" next to each list's count giving a short menu (Label / Weight) was quick to find.

**What confused me / what took longest:**
- "Higher means" was the one I had to think about: closer / farther / capacity, with no one-line hint on what each does to betweenness. I picked closer because more trips should pull sites together, but "capacity" made me wonder. A hover line would settle it -- that's the bit I'd have to defend to my director.
- Clicking the "Higher means" label did nothing; only the box opened.
- The warning triangle on the site column has no hover text; I had to filter "With issues" to learn it's P06's name (and P07's families "n/a"), not P05.
- The magnifier on the toolbar is a command list, not a node search -- I expected to type P05 there.
- Still 12 sites in my list but 13 nodes in the graph (deliveries mentions one site not in the list). Didn't chase it for this task, but I'd want to know which before a deck.
- Canvas doesn't draw the names on the dots, so "everywhere" I could only check in the table and the node panel.
