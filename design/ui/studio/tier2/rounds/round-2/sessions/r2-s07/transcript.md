# Session r2-s07 -- Tom (returning lab manager), task T20, dataset A (bus stops)

Build: frozen build named on the first line of criteria.md (8f0d5a6f7791). Tool: real.mjs.

## Start

`REAL_DIST=<frozen build> node real.mjs --start r2-s07 empty` -> 01.png

01: The start screen I know: Open project or file..., New from data..., Recent projects (empty --
this is a fresh browser), samples on the right, and the usage-data box at the bottom. Our data does
not leave the building, so I say No thanks first.

`--step --click "No thanks"` -> 02.png

02: The box is gone and it says usage data stays off. Good. I always open files with "Open project or
file...", so I will do what I always do and pick bus-stops.csv from Downloads.

`--step --click "Open project or file..." --upload bus-stops.csv` -> 03.png

03: This is new to me -- "Open as a new graph" with the table shown. It read 10 stops and 17 links,
and the from/to columns look right. Under the "minutes" column there is a box saying "Attribute",
and a line below says "Weight: none (each edge counts 1)". That sounds like it would ignore my
minutes, which is exactly what I was told not to let happen. I will open the box under "minutes" and
see what the choices are.

`--step --click-at 728,211` (the box under "minutes", "Role of minutes") -> 04.png

04: A list: From, To, Weight, Date or time, Edge id, Attribute (ticked). The line underneath said
"Weight: none", so "Weight" must be how the minutes get counted. I pick Weight and read what changes.

`--step --click "Weight"` -> 05.png

05: Now it says "Weight: minutes" and a new row "Higher means: Not set / Closer / Farther / Capacity",
with a sentence: until I choose, a path counts every edge as one step. So "Weight" alone is not
enough -- I am glad I read it. More minutes is a longer trip, so a higher number means farther
apart. I click "Farther".

`--step --click "Farther"` -> 06.png

06: "Weight: minutes (farther)" and "A higher weight means farther apart, such as a longer distance or
travel time; a path takes the smallest total." That is what I wanted. There is a "Direction: As the
file says" box at the bottom; I do not know what to make of it and I do not change settings I do
not understand, so I leave it and press Load.

`--step --click "Load"` -> 07.png

07: The map is up: 10 blue dots with arrows, no names on them. On the right the overview says
"Loaded weight: minutes (farther)" -- good, it kept my choice. Now the quickest way from Depot to
Harbor. I know the analysis button in the toolbar at the bottom (the flask); I open it.

`--step --click-at 680,864` (button "Analyze") -> 08.png

08: The long list of analyses, with a "Filter analyses" box at the top that already has the cursor.
These are all ranking words I do not use. I type what I am after: "quickest".

`--step --type "quickest"` -> 09.png

09: One match: "Shortest path -- Start here -- The fewest steps, or the shortest path by weight,
between two nodes." It understood "quickest". I click it.

`--step --click-at 600,812` (option "Shortest path") -> 10.png

10: A small form: From, To, Follow (Out / All, All is chosen), Weight already showing "minutes
(farther, loaded)", and Find path. The weight is already the minutes, which matches what I set when
loading. I do not touch Follow. I click the From box and type Depot.

`--step --click "Where the path starts" --type "Depot"` -> 11.png

11: A suggestion "Depot" drops down under the box. I click it.

`--step --click-at 556,627` (option "Depot") -> 12.png

12: From says Depot and the To box is highlighted, ready. I type Harbor.

`--step --type "Harbor"` -> 13.png

13: "Harbor" is suggested. I click it.

`--step --click-at 557,681` (option "Harbor") -> 14.png

14: From Depot, To Harbor, Weight minutes (farther, loaded). Follow is on "All"; I leave it as it
came. I press "Find path".

`--step --click "Find path"` -> 15.png

15: The path is drawn in thick black, with a little key "On the path" at the top left. On the right:
Summary "Path: 5 nodes, 4 edges", "Total minutes: 14". "Nodes in order": Depot 1, Market 2, Park 3,
Clinic 4, Harbor 5. Under "Made with" it lists Weight: minutes (farther), From Depot, To Harbor.
I check it against the table I saw while loading: Depot-Market 4, Market-Park 3, Park-Clinic 4,
Clinic-Harbor 3 -- that is 14. The straight-looking Depot-Market-Library-Harbor would be 4+6+5 = 15,
so it really did go by minutes, not by the fewest stops. The place it says it used the minutes is
"Weight: minutes (farther)" under "Made with" on the right (and "Total minutes" in the summary; the
overview before the run also said "Loaded weight: minutes (farther)"). That is my answer.

`--end r2-s07`

## At the end (Tom, in his own words)

**Did I finish?** Yes. Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all. The program
shows it used the minutes in the right-hand panel: "Weight: minutes (farther)" under "Made with",
and "Total minutes 14".

**Ease:** 6 out of 7.

**What confused me or slowed me down:**
- Opening the file showed a screen I had never seen ("Open as a new graph"). It was readable, but the
  minutes column started as "Attribute" and the line said "Weight: none (each edge counts 1)". If I
  had pressed Load straight away, as I usually do, the minutes would have been ignored. I only caught
  it because I read every line.
- Picking "Weight" was not enough on its own; a second row, "Higher means", appeared with "Not set"
  chosen. The sentence under it explained why it mattered, and "Farther" with its explanation was
  clear once I read it. Two choices for one idea, though.
- "Direction: As the file says" at the bottom of the loading screen, and "Follow: Out / All" in the
  path form -- I do not know what either does for a bus map, so I left both alone. I am trusting the
  answer is right for buses that run both ways; nothing told me which one to want.
- The dots have no names on the map, so I could not see which black dot was Depot or Harbor without
  the list on the right.
- The left panel calls the result "Shortest path, 4 hops". "Hops" made me wonder for a second whether
  it had counted stops after all; the 14 minutes on the right settled it.
