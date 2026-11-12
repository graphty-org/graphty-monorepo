# Grade: session r5-s27b (task T24 A, Dana, regular analyst)

**Grade: S** -- the number (1) was read from the screen, and exactly Gus and Ivan are selected at
the end. No detour. This session re-runs r5-s27, which never started (void).

Build 8c015b806 (graphty@0.8.65), as the criteria name; `session.json` shows no uncommitted
changes and the setup ran to the expected start (the setup log only answers the file chooser).
`leaks.json` lists no leaks; `work.json` shows nothing gone (start and end hold the same run,
layers and source).

## Against the success definition (answers.md, T24 A)

- **The number.** Step 02 (`02.png`): a click at 752,585 hit the Gus-Ivan line on the first try
  (the tool printed "edge with id 13"). The inspector reads "Gus -> Ivan", subtitle "Edge", Summary
  From Gus, To Ivan, weight 1; the left panel's Selection row reads 1 and the line carries the blue
  band. The participant answered 1, read from that screen. Correct.
- **The two ends selected.** Steps 03 and 04: a click on Gus, then a Shift-click on Ivan (a route
  the key accepts from 5277e2cbe). The last screenshot (`04.png`) shows the inspector "2 nodes
  selected" (subtitle "Selection"), Summary Nodes 2, "Edges joining these nodes 1", the left
  panel's Selection row 2, and yellow halos on Gus and Ivan only. This is the same end state as
  Select endpoints. Correct.

## Claims

- "Done" after step 04, and the debrief's "1 time ... only those two glowing": both true on the
  last screenshot. No false "done".

## Wrong turns: 0

Four steps (start, line click, Gus, Shift on Ivan); every click landed on its target on the first
try.

## Measures

- Clicked the line itself: yes, on the first try (1 attempt).
- How the participant got from "the two on this tie" to a selection of the two: not through the
  edge menu. The "Edge actions" button and "Select endpoints" were never opened or seen; the
  participant chose Click then Shift-click by analogy with a spreadsheet ("that's how Excel adds to
  a pick"). The route worked, so the ends command's discoverability is untested here.

## Problems

| # | Problem | Severity | Evidence |
|---|---------|----------|----------|
| 1 | The tie's value is labeled only by the file's column name, "weight"; nothing says what it counts, so the participant had to assume weight means runs. She assumed right here, but the reading rests on a guess. | 2 | `02.png` Summary "weight 1"; debrief: "the number is labeled 'weight', not 'runs'. I'm assuming weight means how many runs, because the file doesn't say." |
| 2 | The title's arrow "Gus -> Ivan" reads as something one did to the other, for a tie that is mutual in the task's terms (the arrow is the file's column order, a known note on this build). | 1 | `02.png` title "Gus -> Ivan"; debrief: "makes it look like Gus did something to Ivan." |
| 3 | The "Hana" label box is drawn over the lower half of Ivan's sphere (and, at the end, over part of his ring), so clicking Ivan by eye felt risky. She did not read the tie as Gus to Hana. Known on this build. | 1 | `01.png`, `04.png` (Ivan at about 821,547, Hana's label just below); debrief: "Ivan's ball sits half behind Hana's, so clicking him by eye felt risky." |
| 4 | The side panel's labels ("weight", "From", "Edges joining these nodes") are small, dim gray text; the participant said she would need reading glasses. | 1 | `02.png`, `04.png` Summary rows; debrief: "The gray labels in the side panel ... are small and faint." |
| 5 | After the Shift-click, nothing marks the tie itself (the blue band is gone, as after Select endpoints); only the "Edges joining these nodes 1" row says the two are tied. Not raised by the participant. | 0 | `04.png`: the Gus-Ivan line drawn plain gray. |

Labels drawn over other labels elsewhere ("Chloe" over "Farah", "Eli" mostly under "Dev") are
visible on every screenshot but played no part in this task and are not counted.
