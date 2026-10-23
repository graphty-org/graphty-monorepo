# Session r4-s36 -- Elena, returning user

Task: bring trails.csv in so every calculation treats more km as a longer walk; find the shortest walk from Trailhead to Summit (junctions in order, total km); show where the program says it used the km.

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s36 in the studio worktree (the --brief command put it there).

Commands below use S=<that folder> and REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

## Steps

1. `real.mjs --start $S empty` -> 01.png. Start screen: Open project or file, New from data, samples on the right, a "help us" box at the bottom.
2. `--step $S --click "No thanks" --click "New from data..."` -> 02.png. "Open as a new graph" page: Tables on the left, "Drop a file here, or choose a file...", Direction "As the file says", Load greyed out. Elena: "OK, a place for my file. I'll pick it."
3. `--step $S --click "choose a file..." --upload trails.csv` -> 03.png. Preview: "trails: 9 nodes, 13 edges", columns from/to/km with drop-downs From / To / Attribute, and a line "Weight: none (each edge counts 1)". Elena: "There it is -- weight none. I want the km to count. The km box says Attribute; let me open it."
4. `--step $S --click "km"` -> 04.png. Refused as ambiguous (the column header button and the "Role of km" box share the name); nothing happened.
5. `--step $S --click "Role of km"` -> 05.png. A list opened: From, To, Weight, Date or time, Edge id, Attribute (checked). Elena: "Weight -- that's the one that sounds like it makes km count."
6. `--step $S --click "role=option:Weight"` -> 06.png. Now "Weight: km" and "Higher means: Not set / Closer / Farther / Capacity", with a line saying until I choose, a path counts every edge as one step. Elena: "More km is a longer walk, so higher means farther. Farther."
7. `--step $S --click "Farther"` -> 07.png. "Weight: km (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Elena: "Exactly what I want. Load." (Did not notice the Direction box at the bottom.)
8. `--step $S --click "Load"` -> 08.png. A 3D-looking picture of 9 blue balls with arrows, no names on them. Right panel, Values: Nodes 9, Edges 13, Direction Directed, "Loaded weight km (farther)". Elena: "Ooh, OK. That big one in the middle must be the Summit, everything goes there." (wrong guess -- nothing says so.) "Last time I ranked things with Analyze -- the little flask down there. Let me try that."
9. `--step $S --click-at 615,864` (the flask, "Analyze") -> 09.png. A list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank "Start here", ... with a "Filter analyses" box. Elena: "Lots of words. I want the shortest walk -- I'll type shortest."
10. `--step $S --type "shortest"` -> 10.png. Top: "Shortest path -- Start here -- The fewest steps, or the shortest path by weight, between two nodes." Elena: "That's it."
11. `--step $S --click-at 500,668` (Shortest path) -> 11.png. Form: From "Where the path starts" (focused), To "Where the path ends", Follow Out / All (All picked), Weight "km (farther, loaded)", Advanced, Find path. Elena: "Good, it already knows km. Type Trailhead."
12. `--step $S --type "Trailhead"` -> 12.png. A suggestion "Trailhead" drops down under From. Elena: "Pick it."
13. `--step $S --click-at 498,627` -> 13.png. From says Trailhead; the To box now has focus. Elena: "Now Summit."
14. `--step $S --type "Summit"` -> 14.png. Suggestion "Summit". Elena: "Pick it, then Find path."
15. `--step $S --click-at 494,681 --click "Find path"` -> 15.png. The path is drawn in black on the picture. Left list: "Shortest path km 7.5". Right panel: Summary -- Path 5 nodes, 4 edges; Total km 7.5. Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight km (farther). Elena: "There it is. Trailhead, Creek, Meadow, Ridge, Summit, 7.5 km. And it says Weight km (farther) right there under Made with, and Total km. Done." (Also: "oh, the big ball in the middle wasn't the Summit at all.")
16. `--end $S` -> session ended; the folder was copied to design/ui/studio/tier2/rounds/round-4/sessions/r4-s36.

## End of session (in character)

- **Finished?** Yes. The shortest walk is Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km in all. The program says it used the kilometers in three places: on the load page ("Weight: km (farther)" with the line "a higher weight means farther apart ... a path takes the smallest total"), in the graph's Values ("Loaded weight km (farther)"), and on the result ("Total km 7.5" and, under Made with, "Weight km (farther)"); the Shortest path form also had "km (farther, loaded)" filled in for me.
- **Ease:** 6 of 7.
- **What confused me:**
  - On the load page the km column said "Attribute", and right under it "Weight: none (each edge counts 1)". I only knew to change it because the task said kilometers had to count. If I had just pressed Load, I think the path would have counted trails, not km, and I would not have known.
  - "Higher means Closer / Farther / Capacity" made me stop for a second -- "Farther" was right for km, but "Capacity" meant nothing to me.
  - The dots have no names on them, so I guessed the big ball in the middle was the Summit. It wasn't; I only knew which dots were which once the path list told me.
  - The picture has arrows, and the right panel said "Directed". Trails go both ways. The path form had "Follow: All" already picked, so it worked, but I never noticed the "Direction" box on the load page and do not know if it mattered.
