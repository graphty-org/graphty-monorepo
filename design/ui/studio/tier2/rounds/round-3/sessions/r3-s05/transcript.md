# Session r3-s05 -- Analyst Alex, returning user

Task: bring bus-stops.csv in so every calculation treats more minutes as a longer trip, then find the quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it used the minutes.

Every command runs from the worktree root with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and $S = this session's folder. Screenshots 01.png to 13.png sit beside this file.

## Steps

1. `node design/ui/studio/tool/real.mjs --start $S empty` -> 01.png. Start page. "Files are read on this computer and never uploaded" and "Local only" up top -- good, I know that already. Usage-data card at the bottom. I'll say No thanks, then Open project or file with the CSV.
2. `--step $S --click "No thanks" --click "Open project or file..." --upload bus-stops.csv` -> 02.png. Import screen: "bus-stops: 10 nodes, 17 edges" -- 10 stops, 17 links, matches what I was told. But it says "Weight: none (each edge counts 1)" and the minutes column is set to "Attribute". That's exactly what I need to change. Opening the minutes dropdown.
3. `--step $S --click "minutes"` -> 03.png. Ambiguous (the table header button and the dropdown). Nothing happened. Clicking the dropdown by its label instead.
4. `--step $S --click "Role of minutes"` -> 04.png. List: From, To, Weight, Date or time, Edge id, Attribute. Picking Weight.
5. `--step $S --click "role=option:Weight"` -> 05.png. Now "Weight: minutes" and a new row "Higher means: Not set / Closer / Farther / Capacity", with a line saying until I choose, a path counts every edge as one step. Good that it warns me -- that's the trap I'd have walked into. More minutes = farther. Clicking Farther.
6. `--step $S --click "Farther"` -> 06.png. "Weight: minutes (farther)" and "a path takes the smallest total." That's what I want. Direction says "As the file says" -- I'll leave it. Load.
7. `--step $S --click "Load"` -> 07.png. Graph is up, 10 nodes, 17 edges, Directed, and the overview says "Loaded weight: minutes (farther)". Counts match. No stop names on the dots, which is annoying for a route question. Opening Analyze (flask button) like every week, looking for shortest path.
8. `--step $S --click-at 679,864` -> 08.png. Analyze list open with a filter box focused. Typing "shortest path".
9. `--step $S --type "shortest path"` -> 09.png. "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." Clicking it.
10. `--step $S --click-at 565,806` -> 10.png. Shortest path form: From, To, Follow (Out / All, All picked), Weight already says "minutes (farther, loaded)". Nice, it carried over. Typing Depot into From.
11. `--step $S --click "Where the path starts" --type "Depot"` -> 11.png. Suggestion "Depot" drops down. Picking it, then typing Harbor into To.
12. `--step $S --click-at 555,627 --click "Where the path ends" --type "Harbor"` -> 12.png. From = Depot. Harbor suggested. Picking it, then Find path.
13. `--step $S --click-at 557,681 --click "Find path"` -> 13.png. Path drawn in black. Right panel: "Path 5 nodes, 4 edges", "Total minutes 14", "Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5". Under "Made with": Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". Left list shows the run as "Shortest path -- minutes 14". I checked it against the rows I saw on the import screen: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14; Depot-Market-Library-Harbor would be 15, Depot-School-Harbor 21. It matches. Done.
14. `node design/ui/studio/tool/real.mjs --end $S` -> session ended.

## Wrap-up (in character)

- Finished: yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all.
- Where it says it used the minutes: three places. The import screen ("Weight: minutes (farther)", "a path takes the smallest total"), the graph overview ("Loaded weight: minutes (farther)"), and on the path result itself, "Weight: minutes (farther)" under "Made with", plus "Total minutes 14" in the summary.
- Ease: 6 of 7.
- What took longest / confused me:
  - The import screen set my minutes column to "Attribute" and said "Weight: none (each edge counts 1)". If I hadn't read that line I'd have loaded it and got a fewest-stops answer. It did warn me, and once I picked Weight the "Higher means" choice with "Farther" was clear. I'd still rather it guessed that a column called minutes is a weight.
  - Two things on that screen are both called "minutes" (the table header and the dropdown), so my first click went nowhere.
  - No stop names on the dots, so the picture alone can't tell me the route; I relied on the "Nodes in order" list.
  - "Follow: Out / All" -- I left it on All. Not sure whether one-way bus links should count backwards; for a director I'd want to know which it used, and at least it shows "Follow All" on the result.
