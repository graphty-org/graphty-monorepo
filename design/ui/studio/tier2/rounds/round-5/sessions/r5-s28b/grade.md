# Grade: session r5-s28b (task T24 B, Jordan, regular analyst)

**Grade: S** -- the number (4 minutes) was read from the screen, and exactly Station and Stadium
are selected at the end. No detour.

Build 8c015b806 (graphty@0.8.65), as the criteria name; `session.json` shows no uncommitted
changes and the setup ran to the expected start (the setup log only answers the file chooser).
`leaks.json` lists no leaks; `work.json` shows nothing gone (start and end hold the same run,
layers and source).

## Against the success definition (answers.md, T24 B)

- **The number.** Step 1 (`02.png`): a click at 763,150 hit the Station-Stadium line on the first
  try (the tool printed "edge with id 15"). The inspector reads "Station -> Stadium", subtitle
  "Edge", Summary From Station, To Stadium, minutes 4; the left panel's Selection row reads 1 and
  the line carries the blue band. The participant answered 4, read from that screen. Correct.
- **The two ends selected.** Steps 2 and 3: a click on Station (`03.png`: Station ringed,
  inspector "Station / Node", Selection 1), then a Shift-click on Stadium, a route the key accepts
  from 5277e2cbe. The last screenshot (`04.png`) shows the inspector "2 nodes selected" (subtitle
  "Selection"), Summary Nodes 2, "Edges joining these nodes 1", the left panel's Selection row 2,
  and yellow rings on Station and Stadium only. The same end state as Select endpoints. Correct.

## Claims

- "Done" after step 3, and the debrief's "4 minutes; Station and Stadium are the only two stops
  selected": both true on the last screenshot. No false "done".

## Wrong turns: 0

Three steps after the start (line click, Station, Shift on Stadium); every click landed on its
target on the first try.

## Measures

- Clicked the line itself: yes, on the first try (1 attempt).
- How the participant got from "the two on this tie" to a selection of the two: not through the
  edge menu. The "Edge actions" button and "Select endpoints" were never opened; the participant
  chose Click then Shift-click by habit ("that's what every tool I've used does for
  multi-select"). The ends command's discoverability is untested here.

## Problems

| # | Problem | Severity | Evidence |
|---|---------|----------|----------|
| 1 | The line is a thin target with no sign that it can be clicked; the participant had to aim at the short visible stretch between Station and its label box and said closer stops would make him hit a node instead. He hit it first try here. | 1 | `01.png` (Station-Stadium line about 2 px wide, partly behind the "Stadium" label box); debrief: "Clicking a thin line is fiddly ... Nothing on the map tells you lines are clickable." |
| 2 | The tie's value is labeled only by the file's lowercase column name, "minutes"; the participant accepted it without trouble. | 0 | `02.png` Summary "minutes 4"; debrief: "The column is called 'minutes' in lowercase straight from the file, fine." |
| 3 | After the Shift-click, nothing marks the tie itself (the blue band is gone, as after Select endpoints); only the "Edges joining these nodes 1" row says the two are tied. Not raised by the participant. | 0 | `04.png`: the Station-Stadium line drawn plain gray. |

The "Station" and "Stadium" label boxes drawn over the top of their yellow rings (known on this
build) are visible in `04.png`; the participant confirmed the selection from the "2 nodes
selected" header instead and did not mention them, so they are not counted.
