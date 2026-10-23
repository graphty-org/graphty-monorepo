# Session r4-s35 -- Dana Okafor (returning user)

Task: load bus-stops.csv so calculations treat more minutes as a longer trip, find the quickest way Depot -> Harbor (stops in order, total minutes), and show where the program says it used the minutes.

## Step 1 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> empty`
Screenshot 01.png: start screen. Open project or file, New from data, samples, a usage-data banner at the bottom.
Thinking: Same as last month. I'll dismiss the banner and open the file the way I always do.

## Step 2 -- dismiss banner, open the file
Command: `--step <session> --click "No thanks" --click "Open project or file" --upload bus-stops.csv`
Screenshot 02.png: "Open as a new graph". From/To recognized, minutes column set to "Attribute", whole number. A line says "Weight: none (each edge counts 1)". That is exactly what I do NOT want -- the task says more minutes is a longer trip.
Thinking: I've never told it how to read a number before. The minutes dropdown says "Attribute" -- I'll open it and see if there is a weight choice.
Result: "minutes" was ambiguous (a column header button and the "Role of minutes" dropdown); nothing happened (03.png).

## Step 3 -- the dropdown under minutes
Command: `--step <session> --click "Role of minutes"`
Thinking: I meant the dropdown that says Attribute.
Screenshot 04.png: list opened: From, To, Weight, Date or time, Edge id, Attribute (checked).

## Step 4 -- choose Weight
Command: `--step <session> --click "role=option:Weight"`
Thinking: "Weight" is the only thing here that sounds like it changes the calculation. Picking it.
Screenshot 05.png: now "Weight: minutes", and a new row "Higher means: Not set / Closer / Farther / Capacity" with one line: until I choose, a path counts every edge as one step. Good that it says so plainly.

## Step 5 -- Higher means Farther
Command: `--step <session> --click "Farther"`
Thinking: More minutes is a longer trip, so higher = farther.
Screenshot 06.png: "Weight: minutes (farther)" -- "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That is my sentence. Direction stays "As the file says"; I'm not touching that.

## Step 6 -- Load
Command: `--step <session> --click "Load"`
Screenshot 07.png: graph drawn, 10 nodes, 17 edges, Directed. Panel on the right says "Loaded weight: minutes (farther)" -- one place it remembers the minutes. No stop names on the dots, which annoys me. 

## Step 7 -- analysis button
Command: `--step <session> --click "Analyze"`
Thinking: Same flask button I use for ranking suppliers. I'll look for a "quickest way" or path option there.
Screenshot 08.png: a list of analyses with a filter box: Degree, Betweenness, Closeness, PageRank... all ranking things. I need a route, not a ranking.

## Step 8 -- filter for "path"
Command: `--step <session> --type "path"`
Screenshot 09.png: "Shortest path -- the fewest steps, or the shortest path by weight, between two nodes." Also "Guided route -- select 2 nodes first".

## Step 9 -- Shortest path
Command: `--step <session> --click "Shortest path"`
Thinking: "Shortest path by weight" -- that's the one. It doesn't ask me to pick stops first, so I hope it asks after.
Screenshot 10.png: Shortest path form: From, To, Follow (Out / All -- All picked), Weight already says "minutes (farther, loaded)". Nice, I didn't have to pick it again. From box has the cursor.

## Step 10 -- From: Depot
Command: `--step <session> --type "Depot"`
Thinking: Leaving "Follow All" as it is -- a bus link goes both ways as far as I know.
Screenshot 11.png: suggestion "Depot" under the box.

## Step 11 -- pick Depot, then To: Harbor
Command: `--step <session> --click "role=option:Depot" --click "Where the path ends" --type "Harbor"`
Screenshot 12.png: From = Depot, To box shows suggestion Harbor.

## Step 12 -- pick Harbor, Find path
Command: `--step <session> --click "role=option:Harbor" --click "Find path"`
Screenshot 13.png: path drawn in thick black. Right panel: Summary "Path 5 nodes, 4 edges", "Total minutes 14". Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. "Made with" section: Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". Left list also says "Shortest path -- minutes 14".
Checked against the table I saw on load: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14. The obvious other one, Depot-Market-Library-Harbor, is 4+6+5 = 15. So 14 holds.
Thinking: That's the answer, and it tells me in two places it used the minutes. Done.

## Step 13 -- end
Command: `--end <session>`
Result: session ended.

## In character, at the end

**Did I finish?** Yes. Quickest way Depot to Harbor: Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all. The program says it used the minutes in three places: on the load screen ("Weight: minutes (farther)" with the sentence "a higher weight means farther apart ... a path takes the smallest total"), in the graph overview ("Loaded weight: minutes (farther)"), and on the result itself under "Made with" ("Weight: minutes (farther)"), plus "Total minutes 14" in the summary.

**Ease: 6 of 7.**

**What confused me:**
- On the load screen the minutes column came in as "Attribute" and the line said "Weight: none (each edge counts 1)". If I hadn't read that line I'd have loaded it unweighted and got a "fewest stops" answer without knowing. It would be nicer if a number column called minutes got asked about up front.
- "Higher means: Closer / Farther / Capacity" -- I got it from the sentence under it, but "Capacity" means nothing to me here.
- Clicking "minutes" hit two things (the column header and the dropdown); I had to aim for the dropdown.
- The dots on the map have no stop names, so the picture alone tells me nothing; the "Nodes in order" list is what I actually used. 
- "Follow: Out / All" -- I left it on All and don't really know what Out would have changed. For buses I assumed both directions.
- Still small grey text on the load screen ("whole number", "Higher means") -- hard on the laptop.
