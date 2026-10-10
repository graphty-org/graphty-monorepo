# Session r1-s05 -- Elena, returning, bus stops (prompt A)

Participant: Elena, a product manager who used the program twice about a month ago (opened a
sample, clicked dots, used the find box, ranked who matters most once, made dots bigger, exported a
picture). Build: 946256efb876, served from the frozen copy. Start: empty.

Task as read: bring bus-stops.csv (each row a bus link between two stops and the minutes it takes)
into the program so every calculation treats more minutes as a longer trip; then find the quickest
way from Depot to Harbor -- which stops in order, how many minutes in all -- and show where the
program says it used the minutes.

## Steps

### 1. Start
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ with-browser.sh node real.mjs --start <session> empty` -> 01.png

I see the start screen I half remember: Open project or file on the left, samples on the right,
and a data-sharing box at the bottom. I'll say No thanks to the box first so it's out of the way.

### 2. No thanks
`--step --click "No thanks"` -> 02.png

The box is gone. Now "Open project or file..." -- that's how I got files in before. I'll click it
and pick bus-stops.csv from Downloads.

### 3. Open the file
`--step --click "Open project or file" --upload bus-stops.csv` -> 03.png

It just opened -- no questions asked. 10 dots, 17 lines with arrows, but no names on the dots. The
right side says Nodes 10, Edges 17, Directed. Nothing mentions my minutes. I need to tell it that
the minutes column is how long a trip is. Last time "Data" on the left rail showed the table; maybe
the minutes column is there. I'll try Data.

### 4. Data
`--step --click "Data"` -> 04.png

There it is: under Attributes, Edges, "minutes" with a # next to it. That's my column. I'll click
on "minutes" and hope it lets me say what it means.

### 5. minutes
`--step --click "minutes"` -> 05.png

The right side now describes "minutes": Edges, Kind Amount, From the file, range 2 to 15. Facts,
but nothing I can change -- no "this is time" or "more is longer". There's a little "..." in the top
right corner of that panel. I'll try it.

### 6. Attribute actions
`--step --click-at 1420,73` (button "Attribute actions") -> 06.png

Only "Filter to..." and "Show in table". Neither is what I want. The task said "bring it in" so
that calculations use the minutes -- so maybe it's about how the file was brought in. I'll close
this and click the file itself under Sources.

### 7. The source file
`--step --key Escape --click "bus-stops.csv"` -> 07.png

A table opened at the bottom: From, To, minutes -- Depot to Market 4, Market to Library 6, Library
to Harbor 5, Depot to School 9. Good, the stop names are there. The right side for the file only
says "Added: 10 nodes, 17 edges" -- nothing to change. The program never asked me anything when I
opened the file. On the start screen there was "New from data..." -- maybe that one asks
questions. I'll look in the menu at the top left to see what's there.

### 8. Main menu
`--step --click-at 24,20` (button "Main menu") -> 08.png

Back to start, New project, Open project or file, Open sample, Save, Export, Settings... No "New
from data" here. I'll go Back to start and try "New from data..." -- maybe that's where it asks me
what the columns mean.

### 9. Back to start
`--step --click "Back to start"` -> 09.png

Back on the start screen; it didn't ask whether to keep the bus project (fine, I hadn't done
anything yet). Now "New from data...".

### 10. New from data
`--step --click "New from data"` -> 10.png

"Open as a new graph" -- Tables, "Drop a file here, or choose a file...", a Direction choice, and
a Load button. This looks like it will ask me things. I'll choose the file.

### 11. Choose the file
`--step --click "choose a file" --upload bus-stops.csv` -> 11.png

Now it shows my table with a dropdown over each column: from = From, to = To, minutes =
"Attribute". And a line underneath: "Weight: none (each edge counts 1)". So right now every link
counts the same -- that's exactly what I don't want. I'll open the dropdown over "minutes" and see
what else it can be.

### 12. (missed) minutes
`--step --click "minutes"` -> 12.png (tool: ambiguous, took the column header button, not the
"Role of minutes" box)

That sorted the preview by minutes instead of opening the box -- my click landed on the column
header. I meant the "Attribute" box above it. I'll click right on it.

### 13. Role of minutes
`--step --click-at 728,203` (combobox "Role of minutes") -> 13.png

Choices: From, To, Weight, Date or time, Edge id, Attribute. The line below said "Weight: none (each
edge counts 1)", so "Weight" must be how a link counts for more. Minutes isn't a date or time of
day, it's how long. I'll pick Weight.

### 14. Weight
`--step --click "Weight"` -> 14.png

Now it says "Weight: minutes" and a new row "Higher means: Not set / Closer / Farther / Capacity",
with a note that until I choose, a path counts every link as one step. More minutes means the stops
are farther apart in time, so "Farther". Not "Closer". I'll click Farther.

### 15. Farther
`--step --click "Farther"` -> 15.png

"Weight: minutes (farther)" and "A higher weight means farther apart, such as a longer distance or
travel time; a path takes the smallest total." That's what I meant -- travel time. Direction says
"As the file says"; I'll leave it, the colleague wrote the rows from-to. Load.

### 16. Load
`--step --click "Load"` -> 16.png

Loaded. On the right, under Overview, there's now a line "Loaded weight: minutes (farther)" -- the
other time it wasn't there, so this is the program saying it took my minutes. Now the quickest way
from Depot to Harbor. Last time I ranked people with the little flask button in the toolbar at the
bottom; I'll try that for a route.

### 17. Analyze
`--step --click-at 680,624` (button "Analyze") -> 17.png

A long list: Degree, Betweenness, Closeness, PageRank... all ranking things. "Depth-first order --
Select a node first" is greyed. I want a route between two stops. There's a filter box at the top
with the cursor in it; I'll type "route".

### 18. Type "route"
`--step --type "route"` -> 18.png

Two hits: "Shortest path -- The fewest steps, or the shortest route by weight, between two nodes"
and "Guided route -- Select 2 nodes first" (greyed). Shortest path by weight is what I want. Click it.

### 19. Shortest path
`--step --click "Shortest path"` -> 19.png

A small form: From "Where the path starts", To "Where the path ends", Follow Out / All (All is
picked), and Weight already says "minutes (farther, loaded)" -- nice, it remembered what I told it.
I'm not sure what "Follow" means; I'll leave it. I'll type Depot in From.

### 20. From: Depot
`--step --click "Where the path starts" --type "Depot"` -> 20.png

A suggestion "Depot" drops down. I'll click it.

### 21. Pick Depot
`--step --click-at 555,387` (option "Depot") -> 21.png

Depot is in From and the cursor jumped to To on its own. I'll type Harbor.

### 22. To: Harbor
`--step --type "Harbor"` -> 22.png

Harbor suggested. Pick it, then Find path.

### 23. Harbor, Find path
`--step --click-at 557,441 --click "Find path"` -> 23.png

The route is drawn in thick black. The right side reads: Path 5 nodes, 4 edges; Total distance 14;
Nodes in order: Depot, Market, Park, Clinic, Harbor. Under "Made with": Analysis Shortest path,
From Depot, To Harbor, Follow All, Weight "minutes (farther)". So it says it used my minutes, right
there. Checking against the table: Depot-Market 4, Market-Park 3, Park-Clinic 4, Clinic-Harbor 3 =
14. The one that looks shorter on the map, Depot-Market-Library-Harbor, is 4+6+5 = 15, so it
really did add up the minutes rather than count stops. That's my answer; I'm done.

### 24. End
`node real.mjs --end <session>`

## Result (in Elena's words)

- **Finished:** yes. Quickest way Depot -> Market -> Park -> Clinic -> Harbor, 14 minutes in all.
  Where it says it used the minutes: the Overview's "Loaded weight: minutes (farther)" after
  loading, the Shortest path form's Weight box "minutes (farther, loaded)", and the result's
  "Made with -- Weight: minutes (farther)".
- **Ease:** 5 of 7.
- **What confused me:**
  - Opening the file with "Open project or file..." just loaded it and never asked about my
    minutes. Clicking "minutes" under Data showed facts (Kind: Amount, range 2 to 15) but nothing I
    could change, and its "..." menu only had Filter and Show in table. I only found the place to
    say what the minutes mean by going Back to start and trying "New from data...". If I hadn't
    remembered that second button, I would have been stuck -- nothing on the loaded graph points
    to it.
  - Going Back to start threw away the first graph without asking (didn't matter this time).
  - In the import page, clicking the word "minutes" sorted the preview instead of opening the box
    just above it; the box is labeled "minutes" too.
  - "Weight" is not my word, but the line "Weight: none (each edge counts 1)" told me what it was
    for, and the "Farther" explanation ("such as a longer distance or travel time") confirmed it.
  - The answer says "Total distance 14", not "14 minutes", and the left list says "4 hops". I
    worked out that 14 is minutes by adding up the table myself. I'd want it to say minutes.
  - "Follow: Out / All" -- no idea what it meant; I left it on All. I don't know if that means it
    let the bus go backwards along a one-way link.
  - The dots never show stop names on the picture, so I couldn't see which dot is Depot until the
    route was drawn, and even then only from the list on the right.
