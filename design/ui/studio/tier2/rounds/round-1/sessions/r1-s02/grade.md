# Grade: session r1-s02 -- Grace, back for the quarter, finds the shortest hiking route by km (trails.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Trailhead, Creek,
Meadow, Ridge, Summit, 7.5 km in all. She pointed to Made with's Weight row, "km (farther)", as
the place the program says it used the kilometers, which the answer key accepts. But she took the
per-run route. She opened the file with "Open project or file...", which loads it with no weight,
and then picked "km (farther)" in the Shortest path form's own Weight list. That makes only this
one run read the kilometers. The task asked that every calculation treat more kilometers as a
longer walk, and the next calculation would not. The answer key grades this route SD. The "New
from data..." import page, where the meaning is set at load, never came up.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The tool ran every step and every screenshot
matches its command, so the session is not void.

## What the last screen shows (`26.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 7.5" (no unit).
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. This is the answer key's
  route B.
- Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight "km (farther)";
  Advanced run settings open on "Method: Dijkstra, chosen automatically".
- The Closeness form is open over the drawing with its Advanced section showing only "Sample size:
  Every node". It was not run.
- The Data panel lists trails.csv (9 nodes, 13 edges) and the km edge attribute, and no weight.
  The file was loaded through "Open project or file..." (`03.png`), so no "Loaded weight" row
  exists. The path form's Weight list (`20.png`) starts on "None" and offers "km (farther)", not
  "km (farther, loaded)". That is the per-run state the answer key describes.
- The edges table is sorted by km, highest first, with a "Shortest path" column added by the run.

## Measures

- **Steps:** 25 after the start (`02.png` to `26.png`); the answer is on screen at step 22
  (`22.png`), 21 steps in. The load-time success path is about 12 steps. Steps 23 to 26 were her
  check of whether other calculations would read km, which is part of the task, not a detour.
- **Wrong turns: 5**, all spent looking for a place to say what km means, on a route that has
  none:
    1. Step 6 (`06.png`): she clicked km's kind, "Amount", expecting a choice. It is only a label.
    2. Step 7 (`07.png`): km's "Attribute actions" menu offers only "Filter to..." and "Show in
       table".
    3. Step 9 (`09.png`): she opened the trails.csv source. Its panel shows only "Added: Nodes 9,
       Edges 13", no reading settings.
    4. Step 10 (`10.png`): she clicked the table's km header, which sorted the table.
    5. Step 11 (`11.png`): the km column's options offer only "Move left" and "Move right", both
       disabled.
       Her first move after loading, the Data place and the km column (steps 4 and 5), is the
       returning habit her history names ("Data listed the columns of your file"). It is counted with
       the dead ends above, not separately; it is the broken habit the criteria score.
- **False "done": none.** At step 26 she stopped with the route, the total and the Made with row
  on screen. In the debrief she said plainly she could not do the "every calculation" half and
  did not know whether the meaning held beyond that one form. Her side claims (the other routes
  total 8, 8.5 and 9 km) agree with the table rows on screen (`09.png`, `10.png`) and the answer
  key's 9.0 km for Trailhead, Pine Fork, Summit. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not run with Weight "None" (`weight-not-read`; she said "if I
  leave that it'll just count hops"). She did not give 4 as the total (`read-wrong`).
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session and r1-s03, same task, same place) -- "Open project or
   file..." loads a CSV with no import step, and nothing on that route lets the user say what a
   column means for every calculation.** The only way is the "New from data..." import page, and
   nothing she reached leads there. Her history sends her to the Data place, which lists km but
   offers no meaning, role or weight setting (`04.png` to `11.png`). Evidence: `03.png` ("It
   opened straight away, no questions"), `05.png` to `11.png`, debrief ("nothing on the Data side
   let me say what km means").
2. **Severity 3 -- the path's Weight list starts on "None" although it already offers "km
   (farther)", and nothing says where "farther" came from or whether other calculations use
   it.** Pressing Find path without opening the list gives the fewest-links route (Trailhead, Pine
   Fork, Summit, 9.0 km), a wrong answer she would act on. She opened it and avoided the trap,
   but called "(farther)" a guess she never confirmed. Evidence: `19.png`, `20.png`, step 20
   remark, debrief.
3. **Severity 2 -- Closeness shows no weight setting, even under Advanced, so a user cannot tell
   whether it reads km or counts hops.** This is the check the task's "every calculation" asks for,
   and the screen cannot answer it. Evidence: `25.png`, `26.png`.
4. **Severity 2 -- km's kind "Amount" looks like a setting but is not interactive, and neither
   km's menu nor the table column's options hold a meaning or role setting.** Evidence: `05.png`
   to `07.png`, `11.png`.
5. **Severity 2 -- "Total distance 7.5" has no unit.** She would not put it on a board slide
   without "km". Evidence: `22.png`, debrief.
6. **Severity 1 -- the file loads as Directed with arrows on a trail map, where trails run both
   ways.** Follow defaulted to All, so the answer was unaffected (the answer key confirms the same
   route either way on B). Evidence: `03.png`, `15.png`, debrief.
7. **Severity 1 -- "Method: Dijkstra, chosen automatically" uses a term she would never use.** It
   did not block her. Evidence: `23.png`.
8. **Severity 1 -- no junction names are drawn, and the open Path and Closeness forms cover the
   lower half of the drawing, where both ends of the route sit.** She read the route from Nodes in
   order. Evidence: `20.png`, `22.png`, `26.png`.

## What this says about the round

None of the problems above is a build defect: every control did what the answer key says it does.
They are design findings on the route a returning user actually takes. The per-run route works
end to end; what fails is reaching the load-time setting from the habit a returning user brings.
