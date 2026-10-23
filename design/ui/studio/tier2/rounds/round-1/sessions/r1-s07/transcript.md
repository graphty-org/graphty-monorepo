# Session r1-s07 -- Dana, task T20 (bus stops, bus-stops.csv)

Build: tier2-r1d4-946256efb (served with REAL_DIST). Participant: Dana, returning user.

Commands run from `design/ui/studio` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

## Steps

1. `tool/with-browser.sh node tool/real.mjs --start tier2/rounds/round-1/sessions/r1-s07 empty` -> 01.png
2. Dana: "Start screen I know. Dismiss the data-sharing box first." `--click "No thanks"` -> 02.png
3. Dana: "Open project or file, same as my supplier export." `--click "Open project or file..." --upload bus-stops.csv` -> 03.png. It loaded straight in: 10 nodes, 17 edges, directed. It never asked me anything about the minutes column. No stop names drawn on the picture.
4. Dana: "Look at what loaded, on Data." `--click "Data"` -> 04.png. Sources: bus-stops.csv 10 nodes 17 edges. Attributes: Nodes id; Edges minutes (with a # icon). Filters with a +.
5. Dana: "That is my column. Click it." `--click "minutes"` -> 05.png. Right panel: minutes, Attribute. Summary: Table Edges, Kind Amount, Origin From the file, Has a value 100%, Distinct 10, Range 2 to 15. Nothing about what a bigger number means.
6. Dana: "Maybe Amount is a dropdown." `--click "Amount"` -> 06.png. Nothing changed; it is just text.
7. Dana: "Try the ... in the corner." `--click-at 1419,74` (button "Attribute actions") -> 07.png. Menu: Filter to..., Show in table. Nothing about how to read the number.
8. Dana: "Maybe the file has settings for how it was read." `--key Escape --click "bus-stops.csv"` -> 08.png. Right panel: bus-stops.csv, Source, Added: 10 nodes 17 edges. An edge table also opened at the bottom (From, To, minutes; Depot->Market 4, Market->Library 6, Library->Harbor 5, Depot->School 9...). No reading settings.
9. Dana: "Try the table ... menu." `--click-at 1148,681` (button "Table options") -> 09.png. Only "Export...".
10. Dana: "Look for a different way to load it." `--key Escape --click-at 23,20` (Main menu) -> 10.png. Back to start, New project, Open project or file..., Open sample, Save, Save as..., Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help. No "New from data".
11. Dana: "Back to start; there was a New from data option." `--click "Back to start"` -> 11.png. Start screen. (Not saved, no prompt about losing it.) Next: New from data...
12. Dana: "New from data, never used it." `--click "New from data..."` -> 12.png. Page "Open as a new graph": Tables +, "Drop a file here, or choose a file...", Direction "As the file says", Cancel, Load (disabled, "Choose a file first").
13. Dana: "Choose my file here." `--click "choose a file..." --upload bus-stops.csv` -> 13.png. Now a setup: Each row is a node / an edge (an edge chosen) / CSV auto; from=From (text), to=To (text), minutes=Attribute (whole number). Line under them: "Weight: none (each edge counts 1)". Preview of all 17 rows. So the first load ignored my minutes and never told me.
14. Dana: "Open the minutes dropdown." `--click-at 728,203` (combobox "Role of minutes") -> 14.png. Choices: From, To, Weight, Date or time, Edge id, Attribute (checked).
15. Dana: "Weight, like a weighting in Excel; matches the line above." `--click "Weight"` -> 15.png. Line now "Weight: minutes". New row "Higher means: Not set / Closer / Farther / Capacity" with "Choose what a higher weight means. Until you do, a path counts every edge as one step, and PageRank and communities read a higher weight as closer." I skimmed the first half; skipped the PageRank part (do not know it).
16. Dana: "More minutes = farther away in time." `--click "Farther"` -> 16.png. Line: "Weight: minutes (farther)" and "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total." Good, that is what I want. (I did read "travel time" in that line, after choosing.)
17. Dana: "Load it." `--click "Load"` -> 17.png. Graph again; Overview now has "Loaded weight: minutes (farther)". The edge table stayed open at the bottom.
18. Dana: "Analysis button, as for rankings." `--click-at 679,624` (button "Analyze") -> 18.png. List "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (Start here), Eigenvector, Katz, HITS, All-pairs distance, Depth-first order (Select a node first), Most flow... and a "Filter analyses" box.
19. Dana: "Filter for route." `--type "route"` -> 19.png. "Find paths and edge sets": Shortest path (Start here) "The fewest steps, or the shortest route by weight, between two nodes."; Guided route (Select 2 nodes first, greyed).
20. Dana: "Shortest route by weight -- that is it." `--click "Shortest path"` -> 20.png. Popover Shortest path: From "Where the path starts", To "Where the path ends" (each with a pick button), Follow Out / All (All selected), Weight "minutes (farther, loaded)" already chosen, Advanced, Find path. Not sure what Follow means; leave it.
21. Dana: "Type Depot." `--click "Where the path starts" --type "Depot"` -> 21.png. A suggestion "Depot" drops down.
22. Dana: "Pick it." `--click-at 555,387` (option "Depot") -> 22.png.
23. Dana: "Harbor in To." `--click "Where the path ends" --type "Harbor"` -> 23.png. Suggestion "Harbor".
24. Dana: "Pick Harbor." `--click-at 557,441` (option "Harbor") -> 24.png.
25. Dana: "Run it." `--click "Find path"` -> 25.png. Path drawn in thick black. Right panel "Shortest path": Summary Path 5 nodes, 4 edges; Total distance 14. Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. "Made with": Analysis Shortest path, From Depot, To Harbor, Follow All, Weight minutes (farther). Left list gained "Shortest path 4 hops". Edge table gained a "Shortest path" Yes/No column. I checked it by hand against the rows: Depot-Market 4 + Market-Park 3 + Park-Clinic 4 + Clinic-Harbor 3 = 14; Depot-Market-Library-Harbor would be 15, Depot-School-Harbor 21. Matches.
26. `--end tier2/rounds/round-1/sessions/r1-s07`

## Debrief (Dana, in character)

- **Finished?** Yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes. The
  program says it used the minutes in the result panel under "Made with": "Weight: minutes
  (farther)"; the graph's Overview also says "Loaded weight: minutes (farther)", and the load
  screen said "Weight: minutes (farther)".
- **Ease: 4 of 7.** Once I found the right screen it was quick and clear. Getting there was not.
- **What confused me:**
    - I opened the file the way I always do ("Open project or file...") and it loaded straight in
      without a word about my minutes column. Only later, on the other screen, did I see it had
      read them as "Weight: none (each edge counts 1)". Nothing on the first load told me that. If
      I had not been asked to make minutes count, I would have trusted a route that ignored them.
    - After loading, I could not find any place to say what the minutes mean. Clicking "minutes"
      on Data shows "Kind: Amount" but nothing is changeable; its "..." only offers Filter and
      Show in table; the source file panel only shows counts; the table's "..." only offers
      Export. I went back to the start screen and tried "New from data..." on a hunch -- that is
      where the setting lives. The main menu has no "New from data", so from inside a graph I had
      to leave it to find it.
    - "Back to start" dropped my loaded graph without asking. It did not matter today, but it
      would with real work.
    - "Weight" was a guess from Excel weighting. "Higher means: Closer / Farther / Capacity" was
      clear once I saw it, and the line after choosing Farther confirmed it.
    - "Follow: Out / All" on the route box -- I did not know what it meant and left it. The
      answer came out right, but I am not sure whether it went against a bus's direction.
    - The result says "Total distance 14" with no unit. I would have liked "14 minutes"; I had to
      know it was my minutes column.
    - Stop names are not drawn on the picture; I only knew the stops from the tables.
