# Session r1-s20 transcript (Tom, returning user)

## Step 0 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../design/ui/studio/tool/real.mjs --start <session folder> setup:gauges-joined.txt`
Screenshot: 01.png

Tom: Good, that's the gauge project, the one she set up. The dots are there, and the table underneath has lat, lon and installed. On the right it says "Time: installed" with a button "Set in Data". I don't see anything about where the gauges are. I'll try "Set in Data" first since that's the time bit.

## Step 1
Command: `--step <folder> --click "Set in Data"`
Screenshot: 02.png

Tom: The "Time: installed" line went away on the right, and now the "installed" column in the table has a little "Time" tag on it, and a clock button showed up on the toolbar. No message said anything, but the tag is there, so I'll take it the time part is done. Now where the gauges are: lat and lon are in the table but nothing says "location". I'll click the "lat" column heading and see what it offers.

## Step 2
Command: `--step <folder> --click-at 460,509` (the "lat" heading)
Screenshot: 03.png

Tom: It just sorted the table by lat, highest first. Not what I wanted, but harmless. There are three little dots next to "lat" now. I'll try those.

## Step 3
Command: `--step <folder> --click-at 482,509` ("Options for lat")
Screenshot: 04.png

Tom: A menu: Type, Role, Rename, Hide... "Role" sounds like where "Time" came from. I won't touch Type. I'll open Role.

## Step 4
Command: `--step <folder> --click "Role"`
Screenshot: 05.png

Tom: There's a list: None, Id, Label, Kind, Weight, Time, Latitude, Longitude, Coordinates... "Latitude" already has a tick next to it. But the lat heading doesn't have a tag on it the way "installed" has "Time". So is it set or isn't it? The green highlight is on "None", which worries me a bit. I'll click Latitude myself so I know it's set.

## Step 5
Command: `--step <folder> --click "Latitude"`
Screenshot: 06.png

Tom: I clicked it. Nothing changed. No tag on "lat", no message. "Did it do anything?" Maybe clicking a ticked item takes the tick off. I'll open the menu again and look.

## Step 6
Command: `--step <folder> --click "Options for lat" --click "Role"`
Screenshot: 07.png

Tom: Same as before, Latitude still ticked. So I suppose it was already set, maybe she did it. But why does "installed" get a little "Time" tag on the heading and "lat" gets nothing? I'll close this and check "lon" the same way.

## Step 7
Command: `--step <folder> --key Escape --key Escape --hover "lon" --click "Options for lon" --click "Role"`
Screenshot: 08.png (tooltip on lon: "92% filled 11 unique -73.24 to -73.13")

Tom: "lon" already has Longitude ticked. So both were set already, just not shown on the heading. The little popup said "92% filled", which means one of the twelve gauges has no longitude? And the table has a chip "With issues 11". That's a count, so I want to know what it means before I tell anyone it's ready. Closing the menu and clicking that chip.

## Step 8
Command: `--step <folder> --key Escape --key Escape --click "With issues 11"`
Screenshot: 09.png

Tom: The chip turned green with a tick, and a couple of cells went orange: "Willow Run", and the dash in depth for Stone Weir. Those aren't location or dates, so not my problem today. But there are 12 gauges and I only see 10 rows. I'll scroll down to see the rest, because something has an empty longitude.

## Step 9
Command: `--step <folder> --wheel 740,700,400`
Screenshot: 10.png

Tom: The table ends at G09. I count 11 rows, G01 to G11, all with a lat and a lon. But the top says 12 nodes. So there's a twelfth dot that isn't in my gauge list. On the left, the second file has a little warning sign with "1" next to it. That's a count, so I'll click it and see what the one is.

## Step 10
Command: `--step <folder> --click-at 232,162` ("1 issue in flows.csv")
Screenshot: 11.png

Tom: "Issues in flows.csv -- edges, 1 unknown end", with buttons "Add nodes", "Leave out", "Ignore". I don't know what an unknown end is, and it doesn't tell me which gauge it is. Those buttons sound like they change her project, so I'm not pressing any of them. I'll close this and stop here. I'd ask her about that one.

## Step 11
Command: `--step <folder> --click-at 596,170` ("Close panel")
Screenshot: 12.png

Tom: Closed. Bottom left still says "Autosave: saved", and bottom right "Local only", which is good to see. Nothing else I can check without pressing things I don't understand. I'm stopping here.

## End of session (in character)

**Did I finish?** I think so. It's ready as far as I can tell:
- For when each gauge was put in, it goes by the **"installed"** column (the dates like 1998-05-12). I set that with "Set in Data" on the right, and now the heading has a "Time" tag and a clock button appeared.
- For where each gauge is, it goes by **"lat"** and **"lon"**. When I opened Role on each, "Latitude" and "Longitude" were already ticked, so I guess she'd set those, or it worked them out. I clicked Latitude again to be sure; nothing changed on screen.

**Ease: 5 out of 7.** The time part was one button, easy. The location part I only found by digging into a menu on the column heading.

**What confused me:**
- After "Set in Data" nothing told me it worked; I only noticed the little "Time" tag later.
- "installed" shows a "Time" tag on its heading, but "lat" and "lon" show nothing even though Role says Latitude and Longitude are ticked. I couldn't tell at a glance whether location was set or just guessed. Clicking Latitude again did nothing visible either -- did it do anything?
- In the Role menu the green highlight sat on "None" while the tick was on "Latitude"; for a second I thought it was set to None.
- The top says 12 nodes but my gauge list has 11 rows. There's "1 issue in flows.csv: 1 unknown end" with Add nodes / Leave out / Ignore, and it doesn't say which gauge it is. So one dot on the map may have no location or date. I didn't press anything there; I'd ask her about it before the council meeting.
- I never saw the gauges on an actual map, so I'm trusting the ticks.
