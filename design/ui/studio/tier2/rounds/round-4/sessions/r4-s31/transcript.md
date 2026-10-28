# Session r4-s31 -- Jordan, returning user

Task: load bus-stops.csv so more minutes means a longer trip, find the quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says it used the minutes.

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s31 (all commands run from the studio worktree, with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/).

## Steps

1. `real.mjs --start <session> empty` -> 01.png. Start screen. "Files are read on this computer and never uploaded" -- good, that answers my laptop question before I even ask. Usage-data banner at the bottom; I'll say no.
2. `--step --click "No thanks" --click "Open project or file..." --upload bus-stops.csv` -> 02.png. An "Open as a new graph" preview: 10 nodes, 17 edges, from/to read right. But it says "Weight: none (each edge counts 1)" and the minutes column is set to "Attribute". That's the thing the task warns about. I'll open the minutes dropdown and see if I can make it the weight.
3. `--step --click "minutes"` -> 03.png. Refused as ambiguous (a column button and a "Role of minutes" box). Nothing changed.
4. `--step --click "Role of minutes"` -> 04.png. A list opens: From, To, Weight, Date or time, Edge id, Attribute (ticked). "Weight" -- that's what I want. Picking it.
5. `--step --click "role=option:Weight"` -> 05.png. Now "Weight: minutes" with "Higher means: Not set / Closer / Farther / Capacity", and a line saying until I choose, a path counts every edge as one step. Clear enough. More minutes is a longer trip, so "Farther".
6. `--step --click "Farther"` -> 06.png. "Weight: minutes (farther)" and "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." That's exactly the sentence I'd want. Leaving Direction as the file says. Load.
7. `--step --click "Load"` -> 07.png. Graph is up, directed, 10 nodes and 17 edges. Overview on the right says "Loaded weight: minutes (farther)" -- good, that's one place it says it took the minutes. No names on the dots, which is annoying (same old hairball-without-labels problem, though it's small). I'll go to the analysis button in the toolbar like I usually do.
8. `--step --click-at 615,864` (Analyze) -> 08.png. The analysis list with a "Filter analyses" box focused. It's a long list of algorithm names (Degree, Betweenness, PageRank...). I want a route, so I'll type "path" in the filter.
9. `--step --type "path"` -> 09.png. "Find paths and edge sets": Shortest path (Start here) -- "the fewest steps, or the shortest path by weight, between two nodes" -- and Guided route (needs 2 nodes selected). Shortest path it is.
10. `--step --click "Shortest path"` -> 10.png. A form: From, To, Follow (Out / All, All picked), Weight already says "minutes (farther, loaded)". Nice, it carried over. The colleague said a link "between two stops", so I'll leave Follow on All. Typing Depot in From.
11. `--step --type "Depot"` -> 11.png. A suggestion "Depot" drops down. Picking it.
12. `--step --click "role=option:Depot"` -> 12.png. From = Depot, and the cursor jumped to To on its own. Good. Typing Harbor.
13. `--step --type "Harbor" --click "role=option:Harbor"` -> 13.png. From Depot, To Harbor, weight minutes (farther, loaded). Find path now has focus. Clicking it.
14. `--step --click "Find path"` -> 14.png. Done in one go. Summary: Path 5 nodes, 4 edges, Total minutes 14. Nodes in order: Depot, Market, Park, Clinic, Harbor. "Made with" lists Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes (farther)". The run also shows in the left list as "Shortest path -- minutes 14". I sanity-checked against the preview table I saw on load: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 = 14; the obvious alternative through Library is 4+6+5 = 15 and through School is 21. So I believe it. That's my answer; ending.
15. `real.mjs --end <session>` -> session ended.

## In my own words (Jordan)

**Did I finish?** Yes. Quickest way from Depot to Harbor: Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all. The program says it used the minutes in three places: the load screen ("Weight: minutes (farther)" with the sentence "a higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total"), the graph Overview ("Loaded weight: minutes (farther)"), and the result's "Made with" block ("Weight: minutes (farther)"), plus "Total minutes 14" in the summary.

**Ease: 6 of 7.** Nothing I had to guess at except one thing.

**What confused me or slowed me down:**
- On load the minutes column was quietly set to "Attribute" with "Weight: none (each edge counts 1)". If I hadn't been told to care about minutes I'd have clicked Load and got a hop-count answer. The line is there, but it's small grey text, not a question the program puts to me.
- I had to know that "Role of minutes" was the dropdown and that "Weight" was in it -- fine for me because I was looking, but nothing points at it.
- Once Weight was picked, the "Higher means: Not set / Closer / Farther / Capacity" choice was clear, and the explanation under "Farther" is exactly the wording I'd put on a slide.
- No stop names on the map, so I couldn't eyeball the route on the picture -- I relied on the Nodes in order list. For a deck I'd want the names drawn on the highlighted path.
- Follow "Out / All" -- I left it on All because the colleague said "between two stops". I'm not sure whether buses here only go one way; the program didn't make me think about it, which is either good or a trap.
- Off-topic: this is the kind of thing our transit-partner deck needs, and last quarter I did it by hand in a spreadsheet because the listening suite has no notion of a route at all.
