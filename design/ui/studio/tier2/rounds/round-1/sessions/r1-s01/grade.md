# Grade: session r1-s01 -- Dev, back for the class project, finds the quickest bus route by minutes (bus-stops.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Depot, Market, Park,
Clinic, Harbor, 14 minutes. The last screen shows a run made on the load-time weight, and Dev
pointed to both places the answer key accepts: the Overview's "Loaded weight minutes (farther)"
and Made with's Weight row "minutes (farther)". But he reached the load-time route only after a
detour. He first opened the file with "Open project or file...", which loads it with no weight,
found the answer through the per-run route (the Shortest path form's own Weight list), could not
tell whether other calculations used minutes, then went back to the start screen, discarded his
work, and re-imported through "New from data...". The answer key grades "the load-time route
found after a detour" SD.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The tool ran every step and every screenshot
matches its command; step 24 was a driver's wrong name for the rail button (the tool printed
`nothing on screen is called "Graph"` and the screen did not change), not a tool fault and not a
participant action. The session is not void.

## What the last screen shows (`40.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 14" (no unit).
- Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. This is the answer key's route A.
- Made with: Analysis Shortest path, Ran Oct 8, 11:12:25 PM, From Depot, To Harbor, Follow All,
  Weight "minutes (farther)"; Advanced run settings closed.
- The Graph tree lists Selection, Shortest path (4 hops), Everything: this is the second graph,
  loaded through the import page, with only the second run on it.
- The load-time weight is shown two screens earlier: the Overview reads "Loaded weight minutes
  (farther)" (`36.png`), and the Shortest path form's Weight starts on "minutes (farther,
  loaded)" without being touched (`38.png`). The import page had Weight set on the minutes column
  before Farther was chosen (`34.png`).

## Measures

- **Steps:** 39 after the start (`02.png` to `40.png`). The right answer first appears at step 18
  (`18.png`, per-run route); the graded end state at step 40. The load-time success path is about
  10 steps.
- **Wrong turns: 5.**
    1. Step 3 (`03.png`): opened the file with "Open project or file...", the route that loads no
       weight. His history names it as how he opened the class spreadsheet, so this is the returning
       habit the criteria score; everything up to step 30 follows from it.
    2. Step 6 (`06.png`): clicked the minutes column's kind, "Amount", expecting a choice. It is only
       a label.
    3. Step 7 (`07.png`): the minutes "Attribute actions" menu offers only "Filter to..." and "Show
       in table".
    4. Step 9 (`09.png`): typed "quickest" in the Analyze filter: `No analysis matches "quickest"`.
       Recovered on the next step with "route".
    5. Step 28 (`28.png`): looked for "New from data" in the main menu; it is not there, so he took
       "Back to start" and discarded the graph and its two runs (`29.png`, `30.png`).
       Steps 19 to 27 (Advanced run settings, then running Closeness and reading its Made with) were
       his check of the task's "every calculation" requirement, not detours.
- **False "done": none.** At step 18 he did not stop: he said he had only told one run and went
  on to check. At step 40 he claimed the setting is now on the file, and the screen supports it
  ("Loaded weight minutes (farther)", `36.png`; "minutes (farther, loaded)", `38.png`). His
  side arithmetic is right: 4 + 3 + 4 + 3 = 14 and Depot, Market, Library, Harbor = 4 + 6 + 5 = 15
  (the import preview, `34.png`, lines 2, 3, 4, 7, 8, 9). truth-on-screen: no wrong claim.
- **Wrong answers avoided:** he never ran with Weight "None" (`weight-not-read`), never chose
  "Date or time" or "Closer", and did not give 4 as the total (`read-wrong`).
- **Self-rating** (4 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session, r1-s02 and r1-s03, same task, same place) -- "Open
   project or file..." loads a CSV with no import step, and nothing on that route lets the user
   say what a column means for every calculation.** The Data place lists minutes as "Kind
   Amount", with no role or meaning setting; its menu holds only Filter and Show in table. Only
   the task's wording ("bring it in so that...") sent him to the other entry. Evidence: `03.png`,
   `05.png` to `07.png`, debrief ("If I hadn't been told 'every calculation', I would never have
   gone looking").
2. **Severity 3 -- once a graph is open, the import page that asks what a weight means is reached
   only by going back to the start screen, which discards the open graph.** The main menu has
   Open project or file, Open sample and New project, but no "New from data". He accepted losing
   two runs because he had written the route down. Evidence: `28.png`, `29.png`, `30.png`.
3. **Severity 3 (confirmed with r1-s02) -- the path's Weight list starts on "None" although it
   already offers "minutes (farther)", and nothing says where "farther" came from or whether other
   calculations use it.** Pressing Find path without opening the list gives the fewest-links
   route, a wrong answer the user would not know is wrong. He opened it and avoided the trap, but
   said he could not explain "farther" to his instructor. Evidence: `16.png`, `17.png`, step 16
   remark, debrief.
4. **Severity 2 (confirmed with r1-s02) -- Closeness shows no weight setting, even under Advanced,
   and its Made with says nothing about weight, so the user cannot tell whether it read minutes
   or counted hops.** This is exactly the check the task's "every calculation" asks for. (The
   values on screen, Harbor 0.07692 = 1/13, are hop counts, which nothing on screen says.)
   Evidence: `21.png`, `22.png`, `27.png`.
5. **Severity 2 -- "Total distance 14" has no unit.** He said he would have to explain that
   distance means minutes here. Evidence: `18.png`, `40.png`, debrief.
6. **Severity 2 -- the minutes column's kind "Amount" looks like a setting but is plain text.**
   Evidence: `05.png`, `06.png`.
7. **Severity 1 -- the Analyze filter does not match "quickest"**; "route" found Shortest path on
   the next try. Evidence: `09.png`, `10.png`.
8. **Severity 1 -- "Follow: Out / All" is not explained for a directed bus network.** He left it on
   All without knowing what Out does; the answer is the same either way on A. Evidence: `11.png`,
   step 17 remark.
9. **Severity 1 -- "Method: Dijkstra, chosen automatically" uses a term a student may not know.**
   He recognized it from a lecture; it did not block him. Evidence: `19.png`.

What worked: the import page's "Higher means" row and its "Not set" line, which says a path counts
every edge as one step and PageRank reads a higher weight as closer, told him exactly what was
wrong with the first load and what to choose (`34.png`, `35.png`). The "Loaded weight" Overview
row and the "(farther, loaded)" Weight label made the load-time setting visible afterward.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and nothing in the
session was spent on a broken control. The problems are design findings about reaching the
load-time setting from the habit a returning user brings (open the file the usual way, then look
in Data), and about the screens not saying whether a calculation other than the path read the
weight.
