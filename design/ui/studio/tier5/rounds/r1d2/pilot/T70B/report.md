# T70 B (gauges) -- targeted re-pilot on build 47c95a09fc

Build: 47c95a09fc, served from `.study-builds/tier5-r1d2-47c95a09fc`. Start: `setup:gauges-clean.txt`
for every walk. Screenshots are under the main checkout's
`tmp/design-studio/tier5/r1d2/pilot/T70B/<walk>/` (kept out of git).

Walked: the success path by pointer, the two routes the fix pass touched for this task (Cancel on a
new filter card, as touched-35 and as detour-5 walked them before), and the keyboard route for a new
card from Quick actions (Ctrl+K, "filter", Enter), then Cancel and Escape. The routes in the list
that belong to other tasks were not walked here.

## Result

Reached. Nothing crashes, blocks the task, or gives a wrong result that would spoil its grading.
Cancel on a new filter card now takes the card away: no empty "a selection" card is left switched
on, and every walk ends with exactly one filter card, `telemetry yes`, 7 of 11 (the end-state
records agree).

## success (pointer)

Replayed the earlier pass's 14 steps: every step matched. + > Layer; Which nodes; `installed`;
2000, Enter; Done; Fill +; E4572E, Enter; Data; Add filter; `telemetry`; yes; Done; Graph.

- Top bar "7 of 11 nodes, 3 of 13 edges"; Which nodes "2 of 7"; key "Color: Layer 1, 2 of 7 nodes";
  Layer 1's row 2, Everything 7. Matches the answer key (7 in the picture, 2 in orange).
  `success/15.png`
- Before the filter, Which nodes reads "3 of 11" and the key "3 of 11 nodes" (G05 is counted):
  `success/09.png`. As the key expects.
- One orange node sits half under the canvas toolbar (already listed in the build notes); the panel
  counts hold the right number. `success/15.png`

## touched-1 (Cancel on a new filter card, the earlier touched-35 route)

Replay matched up to the Cancel on the new `telemetry yes` card, then diverged as intended: the
card is gone, the Filters section is empty and the top bar has no filter mark ("11 nodes").
`touched-1/05.png`. Carried on by hand: Add filter, `telemetry`, yes, Done gives one card, 7 of 11
(`touched-1/06.png`); Fill E4572E with Tab commits the color (`touched-1/07.png`); Which nodes
reopens on "installed before 2000", 2 of 7 (`touched-1/08.png`).

- Tab out of the date box still leaves the workspace for the status bar's "Local only" (page scrolls
  up about 1 px), and Escape there does nothing (`touched-1/09.png`, `touched-1/10.png`,
  `touched-1/11.png`). Already in the build notes; not new.
- Escape in the date box moves to the outline row; Escape again closes the workspace and keeps the
  edits (`touched-1/12.png`, `touched-1/13.png`), as decided ("Esc is Done").

## touched-2 (Cancel on a new filter card, the earlier detour-5 route)

Replay diverged at its first step only because the workspace's table no longer carries the Which
nodes group column (a fix from an earlier pass). Cancel on the new layer's Which nodes leaves Layer 1
as "All nodes", 11 (`touched-2/02.png`); Ctrl+Z brings back "installed before 2000", 3 of 11
(`touched-2/03.png`). Data, Add filter, `telemetry`, yes, Cancel: no card is left and the top bar
has no filter mark (`touched-2/04.png`).

- Undo after that Cancel is labeled "Undo deleting a filter condition" (tooltip, `touched-2/06.png`),
  and Ctrl+Z brings back the cancelled card with its tick, "telemetry yes", 7 of 11, notice "Undid
  deleting a filter condition." (`touched-2/07.png`). A person who cancelled never deleted anything;
  the label names an action they did not take. The result is still one card, so the grade is not
  spoiled.
- The notice "Undid changing the conditions on Layer 1." from the Ctrl+Z is still on screen after
  the whole next batch (`touched-2/04.png`, `touched-1/05.png`): the batch took less than the notice's
  6 seconds. Not a defect.

## keyboard (new card from Quick actions, then Cancel and Escape)

Started `--keys --sr`. Control+K opens Quick actions (combobox "Search commands"); "filter" leaves
one option, "Filters"; Enter opens a new card's workspace, focus on combobox "Find attributes,
results", heard "Editing New filter, Filters" (`keyboard/05.png`). `telemetry`, Enter: focus on
checkbox "yes, 7 nodes"; Space ticks it, heard "7 of 11 nodes".

- Shift+Tab order from the checkbox: "Value: telemetry", "Except", "More for telemetry yes",
  "Or...", "Condition...", "id", "Fit", treeitem "telemetry yes, 7 of 11 nodes", "Done", "Cancel",
  "Clear", "Table of matches". "id" is a header of the table drawn under the preview, in the tab
  order between the step's properties and the preview (the unnamed table controls are already in
  the build notes).
- Enter on Cancel: the card is gone, focus on "Add filter", heard "Filter not added" then
  "Filter off" (`keyboard/36.png`). Focus goes where decided (Add filter, the opener having closed).
  The second announcement, "Filter off", follows "Filter not added" for a card that never existed;
  a polite region may speak only the last, so a screen-reader user may hear "Filter off" alone.
- Control+K, "filter", Enter, then Escape on the empty picker: focus on "Add filter", heard
  "Filter not added" (`keyboard/38.png`). As decided.
- With a tick made, Escape goes to the card's title row, and Escape again commits it: "Done, 7 of
  11" (`keyboard/41.png`). As decided ("Esc is Done"). The project ends with one card, 7 of 11.
- Focus never fell to the page body on this route.

## Mismatches with the answer key

None. The success path takes the key's 15 steps, and the screens read
as the key says on this build.
