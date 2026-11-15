# Session r1-s18 transcript (Tom, returning user)

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 REAL_TIER=5 node .../real.mjs --start <session> setup:gauges-clean.txt
Screenshot: 01.png
Seen: the gauge map is open, 11 gauges and 13 links, a table of gauges below with station names. "Local only" at the bottom right -- good, nothing leaves. No lengths shown yet. I need the stretch lengths, those are probably on the links. I'll look at the Edges tab.

## Step 2
Command: --step <session> --click "Edges"
Screenshot: 02.png
Seen: the links table with Source, Target and km. Good, the lengths are there. 13 links but I only see 11 rows; I'll scroll the table down to see the last ones.

## Step 3
Command: --step <session> --wheel 740,750,400
Screenshot: 03.png
Seen: all 13 links now. Under 3 km (crew walks): Birch Hollow-Willow Run 2.8, Upper Falls-Mill Pond 1.9, Mill Pond-Cedar Bend 2.4, Quarry Pool-Mill Pond 1.6, Cedar Bend-Fox Creek 2.1, Fox Creek-Old Bridge 1.7, Old Bridge-Stone Weir 2.5, Stone Weir-Heron Marsh 1.9, Heron Marsh-Lake Inlet 2.2, Quarry Pool-Cedar Bend 2. Too long: Willow Run-Upper Falls 3.2, Fox Creek-Heron Marsh 3.6, Old Bridge-Heron Marsh 3.1.
Counting by hand on paper: gauges with two or more walkable neighbours are Mill Pond (3), Cedar Bend (3), Quarry Pool, Fox Creek, Old Bridge, Stone Weir, Heron Marsh (2 each) = 7. I'd rather the program did this, but I don't know where. Now I need to make them orange. I'll try the + next to Style layers, it's the only "add" I see.

## Step 4
Command: --step <session> --click-at 276,122
Screenshot: 04.png
Seen: a small menu: Layer, Folder, Hover highlight, Analyze. "Layer" sounds like the thing that paints. I'll click Layer.

## Step 5
Command: --step <session> --click "Layer"
Screenshot: 05.png
Seen: a "Layer 1" appeared with its name ready to type, and on the right "Which nodes 11 of 11 - All nodes" and Fill. I'll name it so I can find it again, then choose which nodes.

## Step 6
Command: --step <session> --type "Crew walks" --key Enter --click "Which nodes"
Screenshot: 06.png
Seen: a "Which nodes -- Crew walks" screen with a list: Node id, lat, lon, depth_cm, station, code... Nothing about neighbours or km here. I worked the seven out myself, so I'll pick by station name.

## Step 7
Command: --step <session> --click "station"  (ambiguous, nothing happened; 07.png)
Retrying the one in the open list.

## Step 8
Command: --step <session> --click "role=option:station"
Screenshot: 08.png
Seen: "station" "Contains" and a Text box. One text box -- I have seven names. I'll look at what else is under "Contains", maybe there's a pick-from-list.

## Step 9
Command: --step <session> --click-at 1040,190
Screenshot: 09.png
Seen: Contains, Starts with, Ends with, Is exactly, Has a value, Has no value. No list to tick. I'll take "Is exactly", type Mill Pond, and use the "Or..." at the top for the others.

## Step 10
Command: --step <session> --click "Is exactly" --click-at 1040,218 --type "Mill Pond"
Screenshot: 10.png
Seen: Mill Pond typed and offered below, but the box still says "Contains", not "Is exactly" -- did my pick not take? And the top still says 11 of 11. I'll take the suggestion Mill Pond and see if the count changes.

## Step 11
Command: --step <session> --click-at 954,254
Screenshot: 11.png
Seen: Mill Pond is in the box but the top still says 11 of 11 and the table still shows all of them. Did it do anything? I'll press Enter in the box and give it a second.

## Step 12
Command: --step <session> --click-at 1040,218 --key Enter --wait 1500
Screenshot: 12.png
Seen: now it says 1 of 11 and "station contains Mill Pond", only Mill Pond in the table. "Contains" is fine, the names are all different. Now "Or..." for the next one, Cedar Bend.

## Step 13
Command: --step <session> --click "Or..."
Screenshot: 13.png
Seen: it made "A" (green, Mill Pond) and "or B" (orange) with the attribute list open again. Groups with their own colours -- I just want them all one colour, but I'll go on. station, then Cedar Bend.

## Step 14
Command: --step <session> --click "role=option:station" --click-at 1040,218 --type "Cedar Bend" --key Enter --wait 1500
Screenshot: 14.png
Seen: the boxes moved up this time, so I clicked "Advanced" by mistake (it opened a "Match case" box). Nothing typed. The Text box is now just above. I'll click it and type Cedar Bend.

## Step 15
Command: --step <session> --click-at 1040,188 --type "Cedar Bend" --key Enter --wait 1500
Screenshot: 15.png
Seen: 2 of 11, Mill Pond (A) and Cedar Bend (B). Next: Or..., station, Quarry Pool.

## Step 16
Command: --step <session> --click "Or..." --click "role=option:station" --click "station: text to match" --type "Quarry Pool" --key Enter --wait 1500
Screenshot: 16.png
Seen: 3 of 11, Quarry Pool is group C in purple. Each one gets its own colour, which I don't want, but the count is right. Adding Fox Creek, Old Bridge, Stone Weir, Heron Marsh the same way.

## Step 17
Command: --step <session> (Or/station/type x4 for Fox Creek, Old Bridge, Stone Weir, Heron Marsh)
Screenshot: 17.png
Seen: 6 of 11 -- Fox Creek, Old Bridge, Stone Weir went in, but then "Or..." went grey and would not click, so Heron Marsh is missing. Why can't I add a seventh? I'll hold the pointer on the grey "Or..." to see if it says why.

## Step 18
Command: --step <session> --hover-at 998,100
Screenshot: 18.png
Seen: tooltip "No more: 6 is the most". So six names per layer. I'll finish this layer with Done, make these six orange, and do Heron Marsh separately afterwards.

## Step 19
Command: --step <session> --click "Done"
Screenshot: 19.png
Seen: back on the map, "Crew walks 6" in the layer list, the six groups listed on the right, all still blue on the map. Now Fill, to make them orange. I'll click the + next to Fill.

## Step 20
Command: --step <session> --click-at 1404,753
Screenshot: 20.png
Seen: Fill now has a "Color" box, empty. I'll click into it.

## Step 21
Command: --step <session> --click-at 1312,787
Screenshot: 21.png
Seen: a cursor in the colour box, no colour chart opened. I'll just type "orange" and Enter and see if it takes it.

## Step 22
Command: --step <session> --type "orange" --key Enter --wait 1500
Screenshot: 22.png
Seen: it turned "orange" into FFA500 and six gauges are orange on the map; a key says "Color: Crew walks, 6 of 11 nodes". Still need Heron Marsh. I'll make a second layer the same way just for it.

## Step 23
Command: --step <session> --click-at 276,122 --click "Layer" --type "Crew walks 2" --key Enter --click "Which nodes" --click "role=option:station" --click "station: text to match" --type "Heron Marsh" --key Enter --wait 1500
Screenshot: 23.png
Seen: "Crew walks 2", 1 of 11, Heron Marsh. Done, then Fill orange.

## Step 24
Command: --step <session> --click "Done" --click "Add to node fill" --click "Node color, not set" --type "orange" --key Enter --wait 1500
Screenshot: 24.png
Seen: the key now shows "Color: Crew walks 2, 1 of 11 nodes" and "Color: Crew walks, 6 of 11 nodes", both orange. On the map 7 gauges are orange and 4 are still blue (Upper Falls, Willow Run, Birch Hollow, Lake Inlet -- each has only one walkable neighbour). Autosave says saved. I'm stopping here.

## End of session (in character)
Did I finish? Yes. Seven gauges are orange: Mill Pond, Cedar Bend, Quarry Pool, Fox Creek, Old Bridge, Stone Weir, Heron Marsh. Answer: 7.

How easy: 3 out of 7.

What confused me:
- The program never worked out which gauges have more than one short stretch next to them. I read the km column in the links table and counted on paper. If I'd miscounted, nothing would have told me.
- The "Which nodes" screen gave every name I added its own colour (A green, B orange, C purple...). I only wanted one colour, and it wasn't clear whether those colours would end up on the map. They didn't -- the Fill I picked did -- but I didn't know that until the end.
- After the 6th name, "Or..." went grey. Only by holding the pointer on it did I learn "6 is the most". So I had to make a second layer just for Heron Marsh. Now the key has two entries, "Crew walks" and "Crew walks 2", for the same thing; the team will ask why.
- I picked "Is exactly" and the box still said "Contains". It worked anyway because the names are all different, but I'm not sure my choice took.
- After I typed the first name, the count stayed "11 of 11" until I pressed Enter in the box; I thought it had done nothing.
- The boxes on the right moved up between one name and the next, so the second time I clicked "Advanced" instead of the text box.
- The colour box had no colour chart. Typing "orange" worked, which was lucky.

## Follow-up
Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Tom: 4. Most of it I could push through one click at a time, but I was never sure the program agreed with me. The moment I was least sure was right after I had the links table scrolled down (step 3): all 13 links with Source, Target and km on the screen, the map above, and the Style layers list on the left with a small +. I had to find which gauges had two or more stretches under 3 km, and nothing on that screen offered to work that out -- no count of neighbours, no filter on km. I did it by hand on paper, and then picked the + next to Style layers only because it was the only "add" I could see. I didn't know whether I was in the right place until the menu said "Layer". A close second was when "Or..." went grey after the sixth name with the six coloured groups A to F on the right -- no message until I held the pointer on it and it said "6 is the most".
