# Grade: session r4-s06 -- Dana (regular analyst, returning), bus stops (T24 B), one tie on the drawing

**Grade: S** (success). Both halves of the task are met. The number: after a click on the
Station-Stadium line, the inspector reads "Station -> Stadium", subtitle "Edge", Summary From
Station, To Stadium, minutes 4 (`03.png`), and Dana answered "4 minutes", the key's value. The two
ends: the last screen (`05.png`) shows Station and Stadium with yellow rings, the inspector titled
"2 nodes selected" (subtitle "Selection") with Summary Nodes 2 and "Edges joining these nodes 1",
and the left panel's Selection row 2. No other stop has a ring. Dana selected the two one at a
time (a click on Station, then a Shift-click on Stadium) and never opened the tie's "Edge actions"
menu. The answer key lists that route as valid on this build, with the same end state as Select
endpoints (`rounds/round-4/pilot/T24B/06.png`, `07.png`), and grades other routes by the end
state. It is not the SD case ("selected one at a time after the ends command was not found"):
Dana did not look for an ends command; Shift-click was her first choice, from habit with Excel.
No detour: the first click aimed at the line hit it, and no wrong tie was opened. The hover before
it changed nothing and was a look, not a step off the path.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked-names.txt` (ranked, colored and sized by
PageRank, every stop named, the Everything inspector open on Style). Tool commit `71ed347b39a5`,
no uncommitted changes.

## The answer against the key

- **Number (right).** `03.png`: From Station, To Stadium, minutes 4. Read from the inspector, not
  from the line's look.
- **Ends (right).** `05.png`: exactly Station and Stadium selected, as above. Before that, the click
  on Station replaced the tie's selection with Station alone (`04.png`: Selection 1, the Station
  inspector with id Station, Degree 3, PageRank 0.05495, #7 of 10, the blue band gone), so nothing
  was left over from the tie.
- **The name-click trap** (a plain click on a stop's name after both are selected drops the
  selection to one): not met. Dana's last action was the Shift-click and she ended there.
- **Work kept.** `work.json`: the start and end lists are identical (one PageRank run, four style
  layers, no notes, no steps, one source bus-stops.csv); nothing gone.

## Measures

- **Clicked the line itself:** yes, on the first click (`--click-at 763,148`, 1 pixel right and 3
  down from the success path's 762,145), after one hover at 752,165 that the tool reported as over
  the Stadium node, with no tooltip (`02.png`, unchanged from `01.png`).
- **Route to the two ends:** click Station, Shift-click Stadium. "Select endpoints" was never seen;
  the "Edge actions" menu was not visited.
- **Steps:** 4 `real.mjs` steps after the start: the hover, the line click, the Station click and
  the Shift-click. The success path is 3 actions (click the line, Edge actions, Select endpoints).
- **Wrong turns:** 0. The hover changed nothing and was not undone or abandoned as a path; the
  line was then hit on the first click.
- **False "done":** none. "Done" (step 5) and the end claims ("4 minutes", "Station and Stadium
  are the only two stops picked", "2 nodes selected") are all true on `03.png` and `05.png`.
  truth-on-screen: holds.
- **Silent commit:** none. Each click changed the band or the rings, the inspector and the
  Selection row (`03.png` to `05.png`).
- **Numbers that disagree:** none. minutes 4 matches the key; Nodes 2 and "Edges joining these
  nodes 1" match the two rings and the one line between them.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, `leaks.json` shows no leaks over 19 calls, and `session.log` is empty,
  as it is for a run without errors. The session ended normally and freed the browser.
- **Scripted exit:** not applicable; Dana finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                             | Evidence                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | target size     | The Station-Stadium line is short and mostly covered by the Stadium sphere and its label box. A pointer aimed at the line near Stadium lands on the Stadium node instead; only a sliver above the label takes the line.                              | `02.png` (hover at 752,165 reported over the Stadium node); `03.png` (the hit at 763,148); transcript step 2    |
| 2   | 1        | feedback        | Hovering gives no tooltip, so the tie's minutes can only be read by clicking it. Dana expected the hover to show the number, as in Power BI.                                                                                                       | `02.png` identical in content to `01.png`; transcript steps 1 and 2, and "I would have liked hovering over a line to show its minutes" |
| 3   | 1        | discoverability | Nothing on screen says that Shift-click adds a node to the selection, and the tie's own "Select endpoints" is behind a three-dot menu. Dana tried Shift-click from Excel habit and it worked; a user without that habit has no hint.                  | `04.png` (no hint near the node inspector or the canvas); transcript step 3                                    |

Problem 1 matches the answer key's note that the earlier success point near the "Stadium" label
picks Stadium instead (the same miss is graded in r4-s04 and r4-s08). Problem 2 was also recorded
in r3-s42, r3-s43 and r3-s44, and problem 3 in r4-s07.
