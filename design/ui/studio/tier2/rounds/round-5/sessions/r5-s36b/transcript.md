# Session r5-s36b -- Jordan, marketing network analyst (returning user)

Task: load trails.csv so calculations treat more kilometers as a longer walk, find the shortest walk from Trailhead to Summit (junctions in order, total km), and show where the program says it used the kilometers.

## Step 1 (01.png, already started)
Start screen. Open project or file, New from data, a note that files are read on this computer and never uploaded -- good, that answers my first question. Usage-data banner at the bottom; I'll say no thanks.

Command: `real.mjs --step <session> --click "No thanks"`

## Step 2 (02.png)
Banner gone. I usually open files from here, so: Open project or file, and give it trails.csv.
Command: `real.mjs --step <session> --click "Open project or file" --upload trails.csv`

## Step 3 (03.png)
"Open as a new graph" preview: 9 nodes, 13 edges, from/to/km columns. Right under them it says "Weight: none (each edge counts 1)" -- that's exactly what I don't want. The km column is set to "Attribute". I'll open that dropdown and look for a weight option.
Command: `real.mjs --step <session> --click "km"`
(ambiguous: a "km" column header button and the "Role of km" dropdown; I meant the dropdown.)

## Step 4
Clicking the dropdown under km itself.
Command: `real.mjs --step <session> --click "Role of km"`

## Step 5 (05.png)
List opened: From, To, Weight, Date or time, Edge id, Attribute (checked). "Weight" -- that's the one. Picking it.
Command: `real.mjs --step <session> --click "role=option:Weight"`

## Step 6 (06.png)
Now "Weight: km" and a "Higher means" choice: Not set, Closer, Farther, Capacity. The line under it is honest: until I choose, a path counts every edge as one step. More kilometers = farther apart, so "Farther".
Command: `real.mjs --step <session> --click "Farther"`

## Step 7 (07.png)
"Weight: km (farther)" -- "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Clear. Direction is "As the file says"; trails you can walk both ways, but I'm not going to fiddle with it unless the answer looks off. Load.
Command: `real.mjs --step <session> --click "Load"`

## Step 8 (08.png)
Loaded. 9 nodes, 13 edges, Directed, and the overview says "Loaded weight: km (farther)" -- good, that's one place it admits using kilometers. No names on the dots though, so I can't tell which is the Trailhead. Usual move: Analyze in the toolbar (the flask), look for a path / route thing.
Command: `real.mjs --step <session> --click "Analyze"`

## Step 9 (09.png)
Analyze list with a filter box at the top: Degree, Betweenness, Closeness, PageRank... long list, all ranking stuff. I want a route. Typing "shortest" into the filter.
Command: `real.mjs --step <session> --type "shortest"`

## Step 10 (10.png)
"Shortest path -- the fewest steps, or the shortest path by weight, between two nodes." Exactly. Clicking it.
Command: `real.mjs --step <session> --click "Shortest path"`

## Step 11 (11.png)
Shortest path form: From, To, Follow (Out / All -- All is on, fine, you can walk a trail either way), and Weight already reads "km (farther, loaded)". Nice, it carried over what I set on import. The From box has focus; typing Trailhead.
Command: `real.mjs --step <session> --type "Trailhead"`

## Step 12 (12.png)
A suggestion "Trailhead" dropped down. Pick it.
Command: `real.mjs --step <session> --click "role=option:Trailhead"`

## Step 13 (13.png)
From = Trailhead, and the cursor jumped to To on its own. Typing Summit.
Command: `real.mjs --step <session> --type "Summit"`

## Step 14 (14.png)
Summit suggestion. Pick it, then Find path.
Command: `real.mjs --step <session> --click "role=option:Summit" --click "Find path"`

## Step 15 (15.png)
Result. Left list has a run "Shortest path km 7.5". Right panel: Summary -- Path 5 nodes, 4 edges, Total km 7.5. Nodes in order: Trailhead, Creek, Meadow, Ridge, Summit. "Made with": Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther). The path is drawn in black on the map.
Sanity check against the file like I'd check a known account: 1.5 + 2 + 2.5 + 1.5 = 7.5. The Pine Fork way is 3 + 1 to Meadow already 4, worse than 3.5 via Creek; Pine Fork straight to Summit is 9; Lake way is 9. So the answer holds. I believe it. Done.
Command: `real.mjs --end <session>`
Session ended normally.

## In my own words, at the end

**Did I finish?** Yes. Shortest walk from Trailhead to Summit: Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all.

**Where the program says it used the kilometers:** three places. On import, "Weight: km (farther)" with the line "a higher weight means farther apart ... a path takes the smallest total". After loading, the graph overview shows "Loaded weight: km (farther)". In the path result, the summary says "Total km 7.5", and under "Made with" it says "Weight: km (farther)". The run in the left list is labeled "km 7.5" too.

**Ease: 6 out of 7.** Fifteen steps, no dead ends. The import screen told me straight out that the weight was "none (each edge counts 1)", which is what sent me to the column's dropdown. The "Higher means: Closer / Farther / Capacity" choice made me think for a second, but the sentence under each option settled it. The path form already had my km weight filled in, so I didn't have to set it twice.

**What confused me or slowed me down:**
- The column dropdown is labeled "Attribute" by default, and the word "Weight" only shows once you open it. If the "Weight: none" line hadn't been there, I'd have loaded without setting it.
- "Capacity" as a meaning of a higher weight -- no idea when I'd pick that. I skipped it.
- The map has no names on the dots. The path is drawn in black, but I can't tell which dot is the Trailhead without the list on the right. For a slide I'd need labels, and a legend that says black = shortest route.
- Direction: it loaded as "Directed" from "As the file says". Trails go both ways. The path form's "Follow: All" was already on, so it didn't matter this time, but I only noticed after the fact. On a file where that changes the answer, I'd have missed it.
- Fine, it works. Whether I'd use it over the notebook my colleague set up for routes is another question. For this, yes, it was quicker.
