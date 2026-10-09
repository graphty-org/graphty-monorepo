# Grade: session r1-s03 -- Alex, a regular analyst, finds the quickest bus route by minutes (bus-stops.csv)

**Grade: SD** (success with difficulty). The route and the total are right: Depot, Market, Park,
Clinic, Harbor, 14 minutes in all. He also pointed to where the program says it used the minutes.
But he took the per-run route. He opened the file with "Open project or file...", which loads it
with no weight, and then picked "minutes (farther)" in the path's own Weight list. That makes only
this one run read the minutes. The task asked that every calculation treat more minutes as a longer
trip, and the next run would not. The answer key grades this route SD. He looked for a place to
set the meaning at load and never found one: the "New from data..." import page, where the meaning
is set, never came up.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria.

**Contamination.** The facilitator's transcript says that while finding the task, the participant
agent read the task's "Words avoided" list and the persona file's facilitator notes. Both name
parts of the intended route. His step 10 remark "Weight None is the trap" reads like that
knowledge. Any contamination would push him toward success, yet he still never found the
load-time setting. So the main finding, that the load-time setting cannot be found from the route
he took, holds. The ease of the per-run step (steps 9 to 14) is weaker evidence than usual. This
does not void the session: the tool ran every step, and every screenshot and the run match the
answer key.

## What the last screen shows (`15.png`)

- The run's Values: "Path 5 nodes, 4 edges", "Total distance 14".
- Nodes in order: Depot 1, Market 2, Park 3, Clinic 4, Harbor 5. This is the answer key's route A.
- Made with: Analysis Shortest path, From Depot, To Harbor, Follow All, Weight "minutes (farther)".
  The answer key accepts this row as the place the program says it used the minutes.
- The edges table is sorted by the "Shortest path" column. Its four "Yes" rows are Depot->Market
  4, Market->Park 3, Park->Clinic 4 and Clinic->Harbor 3, which add up to 14.
- The Data panel lists bus-stops.csv (10 nodes, 17 edges) and no weight. The file was loaded
  through "Open project or file..." (`02.png`), so no "Loaded weight" row exists anywhere. The
  path's Weight list (`13.png`) reads "minutes (farther)", not "minutes (farther, loaded)", and
  starts on "None". That is the per-run state the answer key describes.

## Measures

- **Steps:** 14 steps after the start (`02.png` to `15.png`). The load-time success path is about
  12 steps.
- **Wrong turns: 4**, all but the last spent looking for a load-time setting that this route does
  not have:
  1. Step 5 (`05.png`): he clicked the minutes column's kind, "Amount", expecting a choice. It is
     only a label.
  2. Step 6 (`06.png`): the column's "..." menu offers only "Filter to..." and "Show in table".
  3. Step 7 (`07.png`): he opened the bus-stops.csv source. Its panel shows only the counts.
  4. Step 15 (`15.png`): he meant to hover the Follow buttons. His `--click "Shortest path"`
     matched the edges table's column header first and sorted the table. This one came from how
     the command matched names, not from the app. It did give him a useful check.
  Steps 3 and 4, the Data tab and the minutes column, were part of the same search. They are
  counted with the dead ends above, not separately.
- **False "done": none.** At step 15 he said "I have my answer", and the route, the total and the
  Made with row were all on screen. In the debrief he said plainly that he never found a way to
  set how every calculation reads minutes, so he did not claim that part was done.
  He made one side claim: Depot, Market, Library, Harbor is 4 + 6 + 5 = 15 minutes. That is
  consistent with the rows shown in `07.png`. truth-on-screen: no wrong claim.
- **Wrong answers avoided:** he did not run with Weight "None" (`weight-not-read`). He did not give
  4 as the minutes (`read-wrong`).
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 -- "Open project or file..." loads a CSV with no import step and no way to say
   what a column means.** The only way to set the weight's meaning for every run is the "New from
   data..." import page, and nothing on the route he took leads there. He searched the Data page,
   the column, the column's menu and the source (`02.png` to `07.png`) and found nothing. The
   task's "every calculation" part cannot be done from this route. Evidence: `02.png` ("loaded
   straight away, no import screen"), `05.png` to `07.png`, and the debrief ("I never found a
   place to say that").
2. **Severity 3 -- the path's Weight list starts on "None" although it already offers "minutes
   (farther)", and nothing says where "farther" came from.** A user who presses Find path without
   opening the list gets the fewest-links route (Depot, Station, Harbor or Depot, School, Harbor)
   and a wrong answer they would act on. He opened the list and avoided it. He noticed the
   program had "guessed" farther without being told, and could not say whether other analyses
   would read minutes the same way or where to correct the guess. Evidence: `10.png`, `13.png`,
   the step 13 remark, and the debrief.
3. **Severity 2 -- the minutes column's kind, "Amount", looks like a setting but is not
   interactive, and its "..." menu has no meaning or role setting.** The Data page never shows
   how calculations will read a column. Evidence: `04.png` to `06.png`.
4. **Severity 2 -- "Total distance 14" has no unit, and the data is minutes.** He would not put it
   on a slide without "minutes" or the column name next to it. Evidence: `14.png`, `15.png`, and
   the debrief.
5. **Severity 2 -- Follow starts on "All" on a directed bus network, and nothing explains what All
   does.** He could tell the route follows the links forward only by checking the table himself.
   The answer key confirms that All ignores direction. Evidence: `10.png`, `15.png` (Made with
   "Follow All"), and the step 14 remark.
6. **Severity 1 -- no stop names are drawn and the route cannot be read from the drawing.** He
   read it from Nodes in order instead. Evidence: `02.png`, `15.png`.
7. **Severity 0 (study conduct, not the app) -- the participant agent saw the task's avoided
   words and the facilitator notes.** See "Contamination" above. The facilitation should keep
   the participant to the prompt and the history only.
