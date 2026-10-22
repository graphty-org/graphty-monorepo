# Grade: session r1-s04b -- Jordan, returning marketing analyst, finds the shortest hiking route by km (trails.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Trailhead, Creek,
Meadow, Ridge, Summit, 7.5 km in all. Jordan pointed to Made with's Weight row, "km (farther)", as
the place the program says it used the kilometers, which the answer key accepts. But she took the
per-run route. She opened the file with "Open project or file...", which loads it with no weight,
and then picked "km (farther)" in the Shortest path form's own Weight list. That makes only this
one run read the kilometers. The task asked that every calculation treat more kilometers as a
longer walk, and the next calculation would not. The answer key grades this route SD. The "New
from data..." import page, where the meaning is set at load, never came up.

This session re-runs r1-s04, which was void (the tool deadlocked before the first step). The
participant model's first attempt at this re-run ended on a model API error after 14 steps; this
folder holds the second attempt, and every screenshot here matches its command in the transcript.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900. This is the frozen build
named in the criteria, served from the frozen build folder. session.json says "uncommittedChanges:
true": the studio worktree had uncommitted edits to the study tool's own files at the time, not to
the app build that was served. `session.log` is empty and `work-start.json` holds `null` (the
session started on the empty app, so there was no earlier work to list). Two of the participant's
commands missed (step 16's `role=tab:Graph`, which matched nothing, and step 19's ambiguous
"km"); the tool reported both and changed nothing, so they are the participant's typing, not a
tool fault. The session is not void.

## What the last screen shows (`23.png`)

- The km attribute's summary (Table Edges, Kind Amount, Origin From the file, Has a value 100%,
  Distinct values 9, Range 1 to 6) with its "Attribute actions" menu open: "Filter to...", "Show
  in table". Nothing about weight, length or meaning.
- The drawing still shows the path in black under the "Shortest path / On the path" key, and the
  edges table keeps the "Shortest path" Yes/No column the run added (Trailhead-Creek 1.5 Yes,
  Creek-Meadow 2 Yes, Trailhead-Pine Fork 3 No, Pine Fork-Summit 6 No).
- The run's Values are not on this last screen; they were on screen at `16.png` and again at
  `18.png` and `19.png`: "Path 5 nodes, 4 edges", "Total distance 7.5" (no unit), Nodes in order
  Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5, Made with Analysis Shortest path, From
  Trailhead, To Summit, Follow All, Weight "km (farther)". This is the answer key's route B.
  `work.json` confirms the run ("shortest_path Shortest route") is still open at the end.
- The Data panel lists trails.csv (9 nodes, 13 edges) and the km edge attribute. The file was
  loaded through "Open project or file..." (`03.png`), whose Overview shows Nodes, Edges,
  Direction "Directed", Density, Components and Edges per node, and no "Loaded weight" row. The
  path form's Weight list (`14.png`) starts on "None" and offers "km (farther)", not "km (farther,
  loaded)". That is the per-run state the answer key describes.

## Measures

- **Steps:** 22 after the start (`02.png` to `23.png`); the answer is on screen at step 15
  (`16.png`). The success path is 11 steps. Steps 16 to 22 were her search for a setting that makes
  every calculation read km, which is part of the task, not a detour. Two of those steps
  (`17.png`, and the first command of step 19 ending in `21.png`) were mistyped commands.
- **Wrong turns: 6**, all spent looking for a place to say what km means for every calculation, on
  a route that has none:
    1. Step 4 (`05.png`): km's summary in the Data place, "Kind Amount", no meaning or weight
       setting.
    2. Step 5 (`06.png`): the trails.csv source. Its panel shows only "Added: Nodes 9, Edges 13", no
       reading settings.
    3. Step 16 (`18.png`): the Graph place. Its list shows Selection, "Shortest path 4 hops",
       Everything; nothing about weight.
    4. Step 17 (`19.png`): clicking the graph's name, "trails.csv", at the top of the Graph panel.
       Nothing changed; the graph's Overview did not come back.
    5. Step 18 (`20.png`, `21.png`): Everything, a place her history names ("color by group from the
       Style tab of Everything"). It shows only Style (Fill, Shape, Effects, Label, Tooltip).
    6. Step 19 (`22.png`, `23.png`): km's "Attribute actions" menu offers only "Filter to..." and
       "Show in table".
- **First move:** "Open project or file..." on the start screen (`03.png`), the place her history
  names ("You open a file from the start screen"). It loaded the file at once with no questions,
  so the habit carried her straight past the only place on this build where the weight's meaning is
  set. It is the broken habit the criteria score; r1-s02 and r1-s03 took the same first move on
  the same task.
- **False "done": none.** She ended with "I'm stopping here" and in the debrief said "Mostly",
  that the "every calculation" part "is not done, or at least I can't show that it is". Her side
  claims agree with the screen: Trailhead, Pine Fork, Summit is 3 + 6 = 9 km (table rows in
  `06.png`, `16.png`; the answer key's 9.0 km), and the route is 4 trails (`16.png`, "4 edges").
  truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not run with Weight "None" (`weight-not-read`; "If I hadn't
  opened that dropdown, I'd have got the fewest-trails answer"). She did not give 4 as the total
  (`read-wrong`), and read "4 hops" as the number of trails.
- **Earlier work (bar 2):** nothing gone (`work.json` "gone": {}); at the end the run, its two
  style layers and the source are all open.
- **Silent commit (bar 4):** none. Find path changed the drawing, the key, the inspector and the
  table at once (`15.png` to `16.png`).
- **Weight read (bar 7b):** the run read km as farther, matching the data; no wrong-way reading.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: this session, r1-s02 and r1-s03, same task, same place) -- "Open
   project or file..." loads a CSV with no import step, and nothing on that route lets the user say
   what a column means for every calculation.** The only way is the "New from data..." import page,
   and nothing she reached leads there. Her history sends her to the start screen's open, which is
   exactly this route. Evidence: `03.png` ("It never asked me which column is what -- so does it
   even know km is the length?"), `05.png`, `06.png`, `18.png` to `23.png`, debrief ("I couldn't
   find anywhere to say 'km is the length for everything'").
2. **Severity 3 (confirmed with r1-s02) -- the path's Weight list starts on "None" although it
   already offers "km (farther)", and nothing says where "farther" came from or whether other
   calculations use it.** Pressing Find path without opening the list gives the fewest-links route
   (Trailhead, Pine Fork, Summit, 9.0 km), a wrong answer she would act on. She opened it and
   avoided the trap, but asked "Where did it decide that? I never told it." Evidence: `09.png`,
   `14.png`, step 13 remark, debrief ("If I hadn't opened that dropdown, I'd have got the
   fewest-trails answer and might not have noticed").
3. **Severity 2 -- once a run is open, clicking the graph's name at the top of the Graph panel does
   not bring back the graph's Overview.** The Overview is where a loaded weight is listed ("Loaded
   weight" on the load-time route), and she found no way back to it. Evidence: `18.png` to `19.png`
   (screen unchanged), debrief ("Clicking the graph's name at the top of the Graph panel did
   nothing").
4. **Severity 2 (confirmed with r1-s02) -- neither km's summary, its "Attribute actions" menu, the
   source's panel nor Everything holds a meaning, role or weight setting, so a returning user
   searching after load finds no sign of where the meaning is set or that it can be.** Evidence:
   `05.png`, `06.png`, `20.png`, `21.png`, `23.png`.
5. **Severity 2 (confirmed with r1-s02) -- "Total distance 7.5" has no unit.** She would expect a
   meeting to ask "7.5 what?" Evidence: `16.png`, debrief.
6. **Severity 1 (confirmed with r1-s02) -- the file loads as Directed with arrows on a trail map,
   where trails run both ways.** Follow defaulted to All, so the answer was unaffected (the answer
   key confirms the same route either way on B). Evidence: `03.png`, `16.png`, debrief ("the arrows
   made me nervous").
7. **Severity 1 -- the Graph list labels the run "Shortest path 4 hops" while its Values say "Total
   distance 7.5".** Both are right (4 trails, 7.5 km), but "hops" is a word she would have to
   explain to the club, and the two numbers sit side by side with different units unnamed.
   Evidence: `18.png`, debrief.
8. **Severity 1 (confirmed with r1-s02) -- no junction names are drawn, so the drawing alone does
   not show which dot is the Summit.** She read the route from Nodes in order. Evidence: `03.png`,
   `16.png`, debrief.

## What this says about the round

None of the problems above is a build defect: every control did what the answer key says it does.
They are design findings on the route a returning user actually takes. This persona's history
names the start screen's open as how she brings a file in, and on this build that habit skips the
only place the weight's meaning is set. The per-run route works end to end; what fails is reaching
the load-time setting, and finding any sign of it afterwards.
