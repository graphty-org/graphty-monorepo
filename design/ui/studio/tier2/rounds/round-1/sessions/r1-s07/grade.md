# Grade: session r1-s07 -- Dana, a regular supply-chain analyst, finds the quickest bus route by minutes (bus-stops.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Depot, Market, Park,
Clinic, Harbor, 14 minutes. The last screen shows a run made on the load-time weight, and Dana
pointed to the places the answer key accepts: the Overview's "Loaded weight minutes (farther)"
and Made with's Weight row "minutes (farther)". She reached the load-time route only after a
detour: she first opened the file with "Open project or file...", which loads it with no weight,
searched the Data place, the source panel, the table menu and the main menu for a way to say what
minutes mean, then went back to the start screen (dropping the open graph without a prompt) and
re-imported through "New from data...". The answer key grades "the load-time route found after a
detour" SD.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step's screenshot matches its command; no
tool fault, no API error. The session is not void.

## What the last screen shows (`25.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 14" (no unit).
- Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. This is the answer key's route A.
- Made with: Analysis Shortest path, Ran Oct 8, 11:14:09 PM, From Depot, To Harbor, Follow All,
  Weight "minutes (farther)"; Advanced run settings closed.
- The Graph tree lists Selection, Shortest path (4 hops), Everything; the legend reads "Shortest
  path / On the path"; the route is drawn in black. The edge table has a "Shortest path" Yes/No
  column.
- The load-time weight is shown two screens earlier: the Overview reads "Loaded weight minutes
  (farther)" (`17.png`), and the Shortest path form's Weight starts on "minutes (farther,
  loaded)" without being touched (`20.png`). Before the role was set, the import page read
  "Weight: none (each edge counts 1)" (`13.png`).

## Measures

- **Steps:** 24 after the start (`02.png` to `25.png`). The load-time success path is about 11
  steps, so this is a little over 2x.
- **First move:** to a place her history names ("Open project or file...", then the Data place).
  It led nowhere for this task: the file loaded with no weight and no place there sets one.
- **Wrong turns: 6.**
    1. Step 3 (`03.png`): opened the file with "Open project or file...", the route that loads no
       weight. Her history names it as how she opens the supplier export; everything up to step 11
       follows from it. The Overview shows no "Loaded weight" row, and nothing says minutes were
       ignored.
    2. Step 6 (`06.png`): clicked the minutes column's kind, "Amount", expecting a choice. It is
       only a label.
    3. Step 7 (`07.png`): the minutes "Attribute actions" menu offers only "Filter to..." and "Show
       in table".
    4. Step 8 (`08.png`): the bus-stops.csv source panel shows only what was added (10 nodes, 17
       edges), no reading settings.
    5. Step 9 (`09.png`): the edge table's "Table options" menu offers only "Export...".
    6. Step 10 (`10.png`): looked for "New from data" in the main menu; it is not there, so she took
       "Back to start", which dropped the graph with no prompt (`11.png`).
       Steps 4 and 5 (Data, then the minutes column) were her history's habit of checking what loaded
       and are counted with the first wrong turn, not separately.
- **Recovery:** yes, from the start screen's "New from data...", which she had never used.
- **False "done": none.** She claimed done only at the end, and every claim is on screen: the
  route and 14 (`25.png`), "Weight: minutes (farther)" in Made with (`25.png`), "Loaded weight
  minutes (farther)" (`17.png`), the load page's "Weight: minutes (farther)" (`16.png`). Her side
  arithmetic is right: 4 + 3 + 4 + 3 = 14; Depot, Market, Library, Harbor = 4 + 6 + 5 = 15;
  Depot, School, Harbor = 21. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she never ran with no weight (`weight-not-read`), never chose "Date
  or time" or "Closer", chose "Farther" (not Capacity), and did not give 4 as the total
  (`read-wrong`).
- **Door used for the path:** the Analyze button, filtered with "route" (`18.png`, `19.png`), not
  the P key.
- **Bar 4 (silent commit):** none. Choosing Weight and Farther changed the summary line at once
  (`15.png`, `16.png`); Load showed the "Loaded weight" row (`17.png`); Find path drew the route
  and opened the run (`25.png`).
- **Bar 5:** "Total distance 14" agrees with the data; the tree row "4 hops" is the edge count,
  not minutes, and she did not misread it.
- **Self-rating** (4 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: r1-s01 and this session, same task, same place) -- "Open project or
   file..." loads a CSV with no import step and no sign that the weight column was ignored, and
   nothing on that route lets the user say what a column means.** Dana found out only on the
   import page, which read "Weight: none (each edge counts 1)". In her words: "If I had not been
   asked to make minutes count, I would have trusted a route that ignored them." Evidence:
   `03.png`, `04.png`, `05.png`, `13.png`, debrief.
2. **Severity 3 (confirmed with r1-s01) -- once a graph is open, the import page that asks what a
   weight means is reached only by going back to the start screen, and "Back to start" drops the
   open graph without asking.** The main menu has no "New from data". Evidence: `10.png`,
   `11.png`, debrief ("It did not matter today, but it would with real work").
3. **Severity 2 (confirmed with r1-s01) -- the minutes column's kind "Amount" looks like a setting
   but is plain text**, and the column's menu, the source panel and the table menu offer nothing
   about how a number is read. Four dead ends in a row on the places a returning user checks.
   Evidence: `05.png` to `09.png`.
4. **Severity 2 (confirmed with r1-s01) -- "Total distance 14" has no unit.** She had to know it
   was her minutes column. Evidence: `25.png`, debrief.
5. **Severity 1 (confirmed with r1-s01) -- "Follow: Out / All" is not explained for a directed bus
   network.** She left it on All without knowing whether the route went against a bus's
   direction; the answer is the same here. Evidence: `20.png`, debrief.
6. **Severity 1 -- "Weight" as a role name was a guess** ("like a weighting in Excel"); the
   "Higher means" row then made it clear. Evidence: `14.png`, `15.png`.
7. **Severity 1 -- no stop names are drawn on the picture**, so the route is read from Nodes in
   order and the tables, not from the drawing (known on this build, answer key T20). Evidence:
   `25.png`, debrief.

What worked: the import page's summary line ("Weight: none (each edge counts 1)", then "Weight:
minutes", then "Weight: minutes (farther)") and the Higher means sentence told her what the first
load had done and confirmed her choice (`13.png`, `15.png`, `16.png`). The Analyze filter found
Shortest path on "route", and its description ("the shortest route by weight") matched her goal
(`19.png`). The Path form's Weight started on "minutes (farther, loaded)" (`20.png`), and Made
with's Weight row let her check the run used it.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and no step was
spent on a broken control, a script error or a misbehaving widget. The time went to design
problems: the returning habit (open the file the usual way, then look in Data) never reaches the
load-time setting and gives no sign that the weight was ignored.
