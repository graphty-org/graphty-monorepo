# Grade: session r1-s06 -- Nadia, back for a hiking task, finds the shortest route by km (trails.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Trailhead, Creek,
Meadow, Ridge, Summit, 7.5 km. She took the load-time route, so km is the weight for every
calculation: the Overview read "Loaded weight km (farther)" after the load (`17.png`), and she
pointed to that row and to Made with's Weight row "km (farther)" as the places the program says it
used the kilometers. That alone would be S. But she reached the load-time route only after a
detour. She first opened the file with "Open project or file...", which loads it with no weight.
She then spent seven steps looking for a place to say what km means. In the end she went back to
the start screen and tried "New from data...". The answer key grades "the load-time route found
after a detour" SD.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The tool ran every step and each screenshot matches
its command, so the session is not void.

## What the last screen shows (`24.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 7.5" (no unit).
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. This is the answer key's
  route B.
- Made with: Analysis Shortest path, From Trailhead, To Summit, Follow All, Weight "km (farther)".
- The Graph tree row reads "Shortest path 4 hops". She did not give 4 as the distance.
- The edges table is open, sorted by km, highest first, with a "Shortest path" Yes / No column
  added by the run.
- `17.png`, just after Load, shows the Overview with "Loaded weight km (farther)" and "Direction
  Directed", so this graph is the load-time one, not the per-run one.

## Measures

- **Steps:** 23 after the start (`02.png` to `24.png`). The answer is on screen at the last step.
  The load-time success path is about 12 steps; from "New from data..." (`11.png`) on she took 13
  steps, one of them the Direction look (`16.png`).
- **Wrong turns: 7**, all spent looking for a place to say what km means on the "Open project or
  file..." route, which has none:
    1. Step 3 (`03.png`): the Data place. It lists km under Edges with no meaning or role.
    2. Step 4 (`04.png`): km's panel shows only facts (Kind Amount, Range 1 to 6).
    3. Step 5 (`05.png`): km's "Attribute actions" menu offers only "Filter to..." and "Show in
       table".
    4. Step 6 (`06.png`): the trails.csv source panel shows only "Added: Nodes 9, Edges 13", no
       settings for how the file was read.
    5. Step 7 (`07.png`): clicking the table's km heading sorted the table.
    6. Step 8 (`08.png`): the km column's options offer only "Move left" and "Move right", both
       disabled.
    7. Step 9 (`09.png`): the main menu, which has no "New from data..." entry.
       Step 10 ("Back to start") was her way out of the dead end, not a wrong turn.
- **False "done": none.** She said "Done" at step 24 with the right route, the right total and
  Made with's "Weight km (farther)" on screen. Her hand sums agree with the rows on screen: 1.5 +
  2 + 2.5 + 1.5 = 7.5, and via Pine Fork 3 + 1 + 2.5 + 1.5 = 8 (rows Trailhead-Pine Fork 3, Pine
  Fork-Meadow 1, Meadow-Ridge 2.5, Ridge-Summit 1.5 in `16.png`). truth-on-screen: no wrong claim.
- **Wrong answers avoided:** she did not run with no weight (`weight-not-read`), did not choose
  Closer or "Date or time", and did not give 4 as the total (`read-wrong`).
- **Choices recorded:** Higher means "Farther" (not Capacity); Direction left on "As the file
  says"; Follow left on All.
- **Self-rating** (4 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: r1-s02, r1-s03 and this session, both halves of this task, same place) -- "Open
   project or file..." loads a CSV with no import step and no weight, nothing on screen says the
   km column is being ignored, and nothing after the load lets the user set what a column means
   or points to "New from data...".** She found the load-time setting only by guessing that the
   start screen's other entry might be "the careful way". Evidence: `02.png` (Overview with no
   "Loaded weight" row), `03.png` to `08.png`, step 12 remark ("So when I opened it the first time
   every trail counted the same"), debrief.
2. **Severity 2 -- the main menu has no "New from data..." entry, so with a graph open the only
   way to the import page is "Back to start".** Evidence: `09.png`.
3. **Severity 2 -- "Back to start" drops the open graph at once, with no question.** No work was
   lost here (nothing had been done), and the debrief names the risk for a real file. Held at 2
   because no loss happened. Evidence: `10.png` (Recent projects empty), debrief.
4. **Severity 2 -- the Direction list on the "Open as a new graph" page opens below its box at the
   bottom edge of the window and shows only a thin blue strip with a small down arrow; none of its
   choices can be read.** The box sits at about y 876 of 900, so the list has no room below it
   and does not open upward. She gave up on Direction because of it; the answer was unaffected
   because Follow defaults to All and every trail points toward the Summit. This looks like a build
   defect (it would do the same on every run at this window size) but is not yet confirmed: it
   needs a scripted repro on the frozen build. Evidence: `16.png`, step 16 remark.
5. **Severity 2 (confirmed with r1-s02) -- "Total distance 7.5" has no unit.** Evidence: `24.png`,
   debrief ("For the alert file I'd want the unit next to the number").
6. **Severity 1 -- the tree row's "4 hops" beside "Total distance 7.5" on the right left her
   unsure what was counted.** She did not misread it. Evidence: `24.png`, debrief.
7. **Severity 1 -- "Follow: Out / All" is not explained; she guessed All means both ways.**
   Evidence: `20.png`, step 20 remark, debrief.
8. **Severity 1 -- the file loads as Directed with arrows on a trail map.** No effect on the answer
   (Follow All). Evidence: `02.png`, `17.png`, step 2 remark.

What worked: on the import page the summary "Weight: none (each edge counts 1)" (`12.png`) told her
at once what had gone wrong on the first load, and the Higher means sentence ("Until you do, a path
counts every edge as one step") stopped her from pressing Load too early (`14.png`, debrief). The
Path form's Weight started on "km (farther, loaded)" (`20.png`), and the Analyze filter found
"Shortest path" from the word "shortest" (`19.png`).

## What this says about the round

The task's question (a weight that means farther, read by every calculation) was understood and
answered correctly. The difficulty was not understanding the need but reaching the one page where
the meaning can be set: three of three sessions on this task opened the file the usual way and met
a load that silently ignores km. The Direction list that cannot be read is the one finding that
looks like an implementation defect rather than a design gap; it did not change this session's
result.
