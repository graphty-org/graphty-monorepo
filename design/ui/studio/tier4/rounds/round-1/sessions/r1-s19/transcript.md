# Session r1-s19 -- Dana Okafor (returning user), helping a friend's food bank

Task: get the program ready so it knows where each site is and when each one opened, and say what in the list it goes by.

## Step 0 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../real.mjs --start <session> setup:pantries-joined.txt
Screenshot 01.png. Dana: "OK, the food bank project is open on the Data place. 13 sites, a table with lat, lon, families, site, zip, opened. On the right it says 'Time: opened' with a 'Set in Data' button -- so maybe it already guessed the date column? The 'opened' column has the little 'Aa' mark though, same as the site names, so I'm not sure it knows it's a date. Lat and lon have a '#'. Nothing says 'location' anywhere yet. I'll click the 'opened' column header and see what it offers."

## Step 1
Command: --step <session> --click-at 1040,509   (the "opened" column header)
Screenshot 02.png. Dana: "That just sorted the table by opened, oldest first. Fine, that's what Excel does. There's a little '...' next to the column name now. That's probably where column settings live. Clicking it."

## Step 2
Command: --step <session> --click-at 1112,509   ("Options for opened")
Screenshot 03.png. Dana: "A menu: Type, Role, Rename, Hide... 'Type' is probably text vs number vs date. 'Role' -- not sure, maybe that's where you say 'this is the date it opened'. Let me look at Role first."

## Step 3
Command: --step <session> --click Role
Screenshot 04.png. Dana: "There it is. Role: None, Id, Label, Kind, Weight, Time, Latitude, Longitude, Coordinates, Country, Region, City. Funny -- the panel on the right already says 'Time: opened' but here the tick is on 'None'. Which one do I believe? I'll just set it myself: Time."

## Step 4
Command: --step <session> --click Time
Screenshot 05.png. Dana: "Good: the 'opened' header now has a green 'Time' tag, and a clock button showed up in the toolbar. The 'Time: opened / Set in Data' line on the right went away -- so I guess before it was only a suggestion. Now the lat column. I'll open its options menu the same way and pick Latitude."

## Step 5
Command: --step <session> --click "Options for lat" --click Role
Screenshot 06.png. Dana: "Huh -- lat already has the tick on 'Latitude'. So it worked that one out by itself. But the header doesn't show a tag like 'Time' got, so I'd never have known without opening the menu. Leave it. Close this and check lon the same way."

## Step 6
Command: --step <session> --key Escape --key Escape --click "Options for lon" --click Role
Screenshot 07.png. Dana: "lon is ticked as Longitude already. Good, both location columns are set. But 'opened' still shows the 'Aa' text mark, not a date. In Excel a date stored as text bites you every time. Let me look at its Type."

## Step 7
Command: --step <session> --key Escape --key Escape --click "Options for opened" --click Type
Screenshot 08.png. Dana: "Type is 'text'. 'date' is there, and unlike number and yes/no it doesn't say anything 'will not convert', so all the dates should take. Picking date."

## Step 8
Command: --step <session> --click date
Screenshot 09.png. Dana: "Now the column has a calendar mark and reads 'Mar 2, 2015', 'Feb 22, 2016'... and the sort line says 'oldest first'. That's a real date now. But the sites list says 12 and the drawing says 13 -- one site came only from the deliveries sheet. Let me scroll down the table to see the last rows and whether any have no date or no lat/lon."

## Step 9
Command: --step <session> --wheel 740,750,600
Screenshot 10.png. Dana: "Twelve sites all have lat, lon and an opened date. The last row, P13, is blank all the way across -- it's only in the deliveries sheet, not in her site list. That's a data gap for my friend, not something I can fix here. Before I call it ready I want to see it on a map. The '3D' button in the toolbar has a little arrow; maybe the map is in there."

## Step 10
Command: --step <session> --click-at 683,391   ("View, 3D")
Screenshot 11.png. Dana: "2D, 3D, VR, camera angles. No map. Not what I want. The button next to it with the little chart-and-dots picture might be where the arrangement lives. One look there, then I'll call it."

## Step 11
Command: --step <session> --key Escape --click-at 643,391   ("Layout")
Screenshot 12.png. Dana: "'Layout' -- Force, D3 Force, ForceAtlas2, Kamada-Kawai, Fruchterman-Reingold... this is the Gephi word salad. I'm not clicking any of that. The map is for next month anyway; the job today was to get the program to know where and when. I'm stopping here."

## Wrap-up (in character)

**Did I finish?** Yes, I think so. The program is ready:
- **Where each site is:** it goes by the **lat** column (role Latitude) and the **lon** column (role Longitude). It had already set both of those itself -- I only found out by opening each column's Options > Role menu, where the tick was on Latitude / Longitude.
- **When each site opened:** it goes by the **opened** column. I set its Role to **Time** and its Type to **date** (it was stored as text). The column now shows a calendar mark, a green "Time" tag and dates like "Mar 2, 2015", and sorting says "oldest first".
- Caveat for my friend: site **P13** appears only in the deliveries sheet, so it has no lat, lon or opened date -- it won't be placed or dated until she adds it to her site list. Autosave said "saved", and the bottom bar says "Local only", which is what I'd want IT to hear.

**Ease: 5 out of 7.** Once I found the column's "..." menu, Role had exactly the words I needed (Time, Latitude, Longitude). Two clicks per column.

**What confused me:**
- The right panel said "Time: opened" with a "Set in Data" button, but the column's Role menu had the tick on "None". I couldn't tell whether time was already set or only suggested.
- lat and lon were already set as Latitude/Longitude, but the headers showed nothing -- no tag like the "Time" tag. I had to open each menu to check. A tag on those headers would have saved me two trips.
- Setting Role to Time did not change the column from text to date; I had to find Type separately. I'm not sure the Time role would have worked on text, and nothing told me either way.
- Clicking the column name sorts the table; the settings hide behind a small "..." that only appears after that. Easy to miss with my eyes.
- I went looking for a map to double-check the locations and found 3D/VR and a "Layout" list of algorithm names, no map. I still don't know where I'd show the board the sites on a map.
