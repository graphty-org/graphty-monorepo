# Grade: session r1-s05 -- Elena (returning product manager), T20 half A (bus-stops.csv)

**Grade: SD** (success with difficulty). The route, the total and the weight's meaning are all
right and set at load, but the load-time route was found only after a detour through the plain
file open, which loads the file with no weight and offers no way to add one.

## Evidence for the outcome

- Last screenshot, `23.png`: the Shortest path run open on Values. Summary "Path 5 nodes, 4
  edges", "Total distance 14"; Nodes in order Depot, Market, Park, Clinic, Harbor; Made with
  Analysis "Shortest path", From "Depot", To "Harbor", Follow "All", Weight "minutes (farther)".
  The Graph tree row reads "Shortest path 4 hops". This matches the answer key's route and total
  for half A exactly.
- The weight was set at load: `16.png`, right after Load from "New from data...", shows the
  Overview row "Loaded weight minutes (farther)", Direction "Directed". `19.png` shows the Path
  form's Weight starting on "minutes (farther, loaded)".
- The participant reported Depot, Market, Park, Clinic, Harbor, 14 minutes, and pointed to
  "Loaded weight: minutes (farther)", the form's "minutes (farther, loaded)" and Made with's
  "Weight: minutes (farther)" -- all three on screen as claimed.
- "Higher means" was set to Farther (`15.png`), not Closer, Capacity or Date or time.
- Why not S: the answer key grades "the load-time route found after a detour" as SD. Steps 3 to 9
  were that detour: "Open project or file..." loaded the file with no weight (`03.png`), the Data
  place offered no way to give the column a meaning (`05.png`, `06.png`), and the participant
  went back to the start screen to try "New from data..." (`09.png`, `10.png`).
- No saved files; none were needed.

## Claims

- False "done" claims: 0. Every claim in the result matches `16.png`, `19.png` and `23.png`.
- The participant's sum (4 + 3 + 4 + 3 = 14) checks against the table in `23.png`.

## Wrong turns: 2

1. **First move, "Open project or file..." (step 3).** The plain open loads the file at once,
   with no question about columns and no weight (`03.png`: Nodes 10, Edges 17, Directed; no
   "Loaded weight" row). Nothing on the loaded graph says the minutes are unused.
2. **The Data place as the way to say what minutes mean (steps 4 to 8).** "minutes" under
   Attributes shows facts only (Kind Amount, From the file, Range 2 to 15, `05.png`); its actions
   menu holds only "Filter to..." and "Show in table" (`06.png`); the source file's panel shows
   only "Added: 10 nodes, 17 edges" (`07.png`); the main menu has no "New from data..."
   (`08.png`). A dead end: the only way on was Back to start (`09.png`).

Not counted as a wrong turn: step 12, a click on the word "minutes" in the import preview, sorted
the preview by that column instead of opening the role box above it (`12.png`); corrected on the
next step. The tool resolved the text "minutes" to the column header, which is what a person
clicking that word hits, so this is not a tool fault.

Recovery: yes (wrong turns, then success).

## Problems

| Severity | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 3        | A file opened with "Open project or file..." loads with no weight, and nothing on the loaded graph points to where a column's meaning is set. The Data place's attribute panel and its actions menu offer no way to make a column the weight, and the main menu has no "New from data...". The participant got through only by remembering a second button from the start screen ("If I hadn't remembered that second button, I would have been stuck"). Habit leading nowhere: one session so far; confirm with a second. | `03.png`, `05.png`, `06.png`, `07.png`, `08.png`; transcript steps 3 to 9 |
| 2        | "Total distance 14" has no unit; the participant added the table by hand to learn it was minutes. The tree row beside it says "4 hops", a second number for the same run in different units. Not misread here (no `read-wrong`), but it is the trap the answer key names.                                                                                                                                                                                                                                                  | `23.png`; transcript step 23 and result                                   |
| 2        | In the import preview, the column header and the role box above it both say "minutes" (the box shows "Attribute"); a click on the word sorts the preview instead of opening the role list.                                                                                                                                                                                                                                                                                                                                 | `11.png`, `12.png`; transcript step 12                                    |
| 2        | "Follow: Out / All" is not understood; the participant left it on All and could not tell whether the route used one-way links backwards. No effect on this graph's answer, but the meaning is unclear on screen.                                                                                                                                                                                                                                                                                                           | `19.png`, `23.png`; transcript result                                     |
| 1        | "Back to start" discarded the open graph without asking. No loss here (nothing done yet), but an open project with work in it would be lost the same way unless undo or a prompt covers it; not tested in this session.                                                                                                                                                                                                                                                                                                    | `08.png`, `09.png`; transcript step 9                                     |
| 1        | No stop names are drawn on the picture; the participant could not tell which dot was Depot or Harbor and read the route only from Nodes in order. Known on this build (answer key).                                                                                                                                                                                                                                                                                                                                        | `16.png`, `23.png`                                                        |

## Notes for scoring

- Task T20, half A, persona Elena (tier 1 graduate). Start: empty. Build 946256efb876
  (`session.json`), the frozen build named in `criteria.md`.
- Steps to the answer: 23 (success path is about 11). Ease self-rating 5 of 7 (not used for the
  grade).
- First move into a place the history names: no (the plain open is not named in Elena's history);
  the second wrong turn went into the Data place, which the criteria list as a history-named place
  for the broken-habit bar.
- "Capacity" not chosen. "Date or time" not chosen.
