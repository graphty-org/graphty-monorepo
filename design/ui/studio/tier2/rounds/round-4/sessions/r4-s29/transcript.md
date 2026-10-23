# Session r4-s29 transcript (Grace, returning)

Session folder (screenshots, logs): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s29
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

Task: bring in bus-stops.csv so every calculation treats more minutes as a longer trip, find the
quickest way from Depot to Harbor (stops in order, total minutes), and show where the program says
it used the minutes.

## Steps

1. `real.mjs --start <session> empty` -> 01.png. The start screen: Open project or file, New from
   data, a line saying files are read on this computer and never uploaded (good). A usage-data
   question at the bottom.
2. `--click "No thanks"` -> 02.png. Declined the usage question.
3. `--click "Open project or file" --upload bus-stops.csv` -> 03.png. An "Open as a new graph" page:
   "bus-stops: 10 nodes, 17 edges", 17 rows. 17 rows is what the file has, 10 stops is what my
   colleague said. Good. Each row is "an edge", from = From, to = To, and minutes = "Attribute".
   Right under it: "Weight: none (each edge counts 1)". That is exactly what I do NOT want; the
   minutes need to count. I'll open the dropdown under "minutes".
4. `--click "minutes"` -> 04.png. Refused as ambiguous (a column header button and the "Role of
   minutes" box share the name). Nothing happened.
5. `--click "Role of minutes"` -> 05.png. The list: From, To, Weight, Date or time, Edge id,
   Attribute (checked). "Weight" is the one. I'll pick it.
6. `--click "role=option:Weight"` -> 06.png. Now "Weight: minutes" and a new row "Higher means: Not
   set / Closer / Farther / Capacity", with a sentence: until I choose, a path counts every edge as
   one step. Plain enough. More minutes is a longer trip, so "Farther".
7. `--click "Farther"` -> 07.png. "Weight: minutes (farther)" and "A higher weight means farther
   apart, such as a longer distance or travel time; a path takes the smallest total." That is
   exactly my sentence. Footer still says 17 edge rows, 10 nodes, 17 edges. Direction is "As the
   file says"; I'll leave it. Load.
8. `--click "Load"` -> 08.png. The map is up. Right panel, Values: Nodes 10, Edges 17, Direction
   Directed, "Loaded weight: minutes (farther)". Counts match the file (10 stops, 17 rows), and it
   says it kept my minutes. No names on the dots, but that's fine for now. Like last time I'll go
   to the analysis button (the flask) in the toolbar to find a quickest-route option.
9. `--click-at 615,864` (the Analyze button) -> 09.png. A long list with a "Filter analyses" box:
   Degree, Betweenness, Closeness, PageRank, Eigenvector... none is a route. I'll type "quickest"
   in the filter and see if it understands me.
10. `--type "quickest"` -> 10.png. It found "Shortest path -- The fewest steps, or the shortest path
    by weight, between two nodes." It understood "quickest". Clicking it.
11. `--click "Shortest path"` -> 11.png. A small form: From, To, Follow (Out / All, All picked),
    Weight already "minutes (farther, loaded)" -- good, it carried my choice from the import.
    "Follow Out / All" I don't fully get; I'll leave the default for now. The From box has the
    cursor; typing Depot.
12. `--type "Depot"` -> 12.png. A suggestion "Depot" drops down. Choosing it.
13. `--click "role=option:Depot"` -> 13.png. From = Depot; the cursor jumped to To on its own. Nice.
    Typing Harbor.
14. `--type "Harbor"` -> 14.png. "Harbor" suggested. Picking it, then I'll press Find path.
15. `--click "role=option:Harbor"` -> 15.png. From Depot, To Harbor, Weight minutes (farther,
    loaded). Find path is highlighted. Before I press it: "Follow: Out / All" -- I'll hover "Out"
    to see what it means.
16. `--hover "Out"` -> 16.png. No tooltip. Nothing tells me what Out or All does. I'll guess "All"
    means both ways and leave the default. Find path.
17. `--click "Find path"` -> 17.png. The route is drawn in black on the map, and the right panel
    says it plainly:
    - Summary: Path 5 nodes, 4 edges; **Total minutes 14**.
    - Nodes in order: **Depot 1, Market 2, Park 3, Clinic 4, Harbor 5**.
    - Made with: Analysis Shortest path, From Depot, To Harbor, Follow All, **Weight minutes
      (farther)** -- that is where it says it used the minutes.
    The left list also shows "Shortest path  minutes 14".
    Checking against the rows like I would in Excel: Depot-Market 4 (line 2), Market-Park 3
    (line 7), Park-Clinic 4 (line 8), Clinic-Harbor 3 (line 9): 4+3+4+3 = 14. Correct. The other
    obvious ways are longer: Depot-Market-Library-Harbor is 4+6+5 = 15, Depot-School-Harbor is
    9+12 = 21. And every hop of my route goes the way the file's rows point, so "Follow All" did
    not change the answer. Done.
18. `--end`.

## At the end (in character)

- **Did I finish?** Yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in
  all. The program says it used the minutes in two places: "Loaded weight: minutes (farther)" in
  the graph overview right after loading, and "Weight: minutes (farther)" under "Made with" on the
  result, plus the total is labeled "Total minutes", not some unit-less number.
- **Ease: 6 out of 7.**
- **What went well:** the import page told me straight away that, without a weight, every edge
  counts 1, and "Higher means: Farther" had a sentence in my words ("longer distance or travel
  time; a path takes the smallest total"). Typing "quickest" in the analysis filter found
  Shortest path. The weight carried over to the path form by itself. The result lists the stops
  in order with numbers, which I can paste into a list for someone.
- **What confused me:**
  - On the import page, the minutes column starts as "Attribute", and the screen says "Weight:
    none". I only knew to change it because I was told the minutes had to count; a hurried person
    would press Load and get a path counted in hops.
  - "Follow: Out / All" on the path form has no explanation and no tooltip. I guessed All means
    both directions. For a bus file that matters: if the buses only run one way, I would want Out,
    and nothing told me which one I had.
  - The dots have no names on the map, so the black route is only readable through the right
    panel. For a slide I would have to put names on.
  - The "minutes" column header and the "Role of minutes" box share a name, which is a small
    stumble if you go by the word you see.
