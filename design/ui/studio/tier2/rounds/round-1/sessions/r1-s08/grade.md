# Grade: session r1-s08 -- Tom, the lab manager, finds the shortest hiking route by km (trails.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Trailhead, Creek,
Meadow, Ridge, Summit, 7.5 km in all. He pointed to Made with's Weight row, "km (farther)", as the
place the program says it used the kilometers, which the answer key accepts. But he took the
per-run route. He opened the file with "Open project or file...", which loads it with no weight,
and then picked "km (farther)" in the Shortest path form's own Weight list. That makes only this
one run read the kilometers. The task asked that every calculation treat more kilometers as a
longer walk, and the next calculation would not. The answer key grades this route SD. The "New
from data..." import page, where the meaning is set at load, never came up.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The tool ran every step and every screenshot
matches its command, so the session is not void.

## What the last screen shows (`15.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 7.5" (no unit).
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. This is the answer key's
  route B.
- Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight "km (farther)",
  and a collapsed "Advanced run settings".
- The Data panel lists trails.csv (9 nodes, 13 edges) and the km edge attribute, and no weight.
  The file was loaded through "Open project or file..." (`03.png`), so no "Loaded weight" row
  exists. The path form's Weight list (`14.png`) starts on "None" and offers "km (farther)", not
  "km (farther, loaded)". That is the per-run state the answer key describes.
- The edges table shows a "Shortest path" column added by the run (Trailhead to Creek, Creek to
  Meadow "Yes"; Trailhead to Pine Fork, Pine Fork to Summit "No").

## Measures

- **Steps:** 14 after the start (`02.png` to `15.png`); the answer is on screen at step 15, the
  last. The load-time success path is about 12 steps.
- **Wrong turns: 3**, all spent looking for a place to say what km means, on a route that has
  none:
    1. Step 6 (`06.png`): km's "Attribute actions" menu offers only "Filter to..." and "Show in
       table".
    2. Step 7 (`07.png`): he clicked km's kind, "Amount", expecting a choice. It is only a label.
    3. Step 8 (`08.png`): he opened the trails.csv source. Its panel shows only "Added: Nodes 9,
       Edges 13", no reading settings.
       His first move after loading, the Data place and the km column (steps 4 and 5), is counted with
       the dead ends above, not separately. His history names only "Open project or file..." and the
       analysis button, so the open route is the habit the history gives him.
- **False "done": none.** He stopped with the route, the total and the Made with row on screen,
  and said plainly, at step 15 and in the debrief, that he had not done the "every calculation"
  half. His side claims agree with the screen: Trailhead to Creek 1.5 and Creek to Meadow 2 marked
  "Yes" in the table (`15.png`), and the Pine Fork route 3 + 6 = 9 km matches the answer key's
  9.0 km. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** he did not run with Weight "None" (`weight-not-read`); he opened the
  list because "None" worried him. He did not give 4 as the total (`read-wrong`).
- **Self-rating** (4 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session and r1-s02 on the same task, same place) -- "Open
   project or file..." loads a CSV with no import step, and nothing on that route lets the user
   say what a column means for every calculation.** The only way is the "New from data..." import
   page, and nothing he reached leads there. The Data place lists km but offers no meaning, role or
   weight setting. Evidence: `03.png` ("It opened straight away, no questions"), `04.png` to
   `08.png`, debrief.
2. **Severity 3 -- the path's Weight list starts on "None" although it already offers "km
   (farther)", and nothing says whether other calculations will use it.** Pressing Find path
   without opening the list gives the fewest-links route (Trailhead, Pine Fork, Summit, 9.0 km), a
   wrong answer a reader would act on. He opened it and avoided the trap, but called it "odd that
   it knows 'farther' but still started on None". Evidence: `11.png`, `14.png`, step 14 remark,
   debrief.
3. **Severity 2 -- km's kind "Amount" looks like a setting but is not interactive, and km's menu
   holds no meaning or role setting.** Evidence: `05.png` to `07.png`.
4. **Severity 2 -- "Total distance 7.5" has no unit.** He trusted it was km only because of the
   Made with row further down. Evidence: `15.png`, debrief.
5. **Severity 1 -- "Weight" is not the user's word.** He chose the box only because "km" was
   inside it. Evidence: step 10 and step 14 remarks, debrief.
6. **Severity 1 -- no junction names are drawn on the drawing.** He could not find the Trailhead by
   looking and read the route from Nodes in order. Evidence: `03.png`, `15.png`, debrief.
7. **Severity 1 -- the Analyze list opens on a long list of terms he does not know (Betweenness,
   Katz, HITS); typing "shortest" was his only way in.** Prompt B's "shortest walk" shares
   "shortest" with the analysis name, so this find is a possible wording echo. Evidence:
   `09.png`, `10.png`.

## What this says about the round

None of the problems above is a build defect: every control did what the answer key says it does.
They are design findings on the route a returning user actually takes. The per-run route works
end to end; what fails is reaching the load-time setting from the habit a returning user brings.
