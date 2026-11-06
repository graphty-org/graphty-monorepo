# T70 B (gauges) -- targeted re-pilot on build c3100058ab

Build: c3100058ab, served from `.study-builds/tier5-r1d3-c3100058ab`. Start: `setup:gauges-clean.txt`
for every walk. Screenshots are under the main checkout's
`tmp/design-studio/tier5/r1d3/pilot/T70B/<walk>/` (kept out of git).

Walked: the success path by pointer, and the two routes of this round's list that belong to this
task: touched-2 (Cancel on a new filter card, then Ctrl+Z) and touched-4 (a new card from Quick
actions by keyboard, Cancel, with screen-reader announcements). The other routes in the list belong
to other tasks and were not walked here.

## Result

Reached. Nothing crashes, blocks the task, or gives a wrong result that would spoil its grading.
Every walk that adds a card ends with exactly one filter card, `telemetry yes`, 7 of 11; a cancelled
new card leaves no card, no filter mark and no undo step.

## success (pointer)

Replayed the earlier pass's 14 steps; every step matched. + > Layer; Which nodes; `installed`;
2000, Enter; Done; Fill +; E4572E, Enter; Data; Add filter; `telemetry`; yes; Done; Graph.

- Top bar "7 of 11 nodes, 3 of 13 edges"; Which nodes "2 of 7"; key "Color: Layer 1, 2 of 7 nodes";
  Layer 1's row 2, Everything 7; the end-state records hold one card, telemetry yes, 7 of 11.
  Matches the answer key (7 in the picture, 2 in orange).
  tmp/design-studio/tier5/r1d3/pilot/T70B/success/15.png

## touched-2 (Cancel on a new card, then Ctrl+Z)

Replay matched through the new layer's Cancel, the Ctrl+Z that brings back "installed before 2000"
(3 of 11), and Data, Add filter, `telemetry`, yes, Cancel (no card left, no filter mark:
tmp/design-studio/tier5/r1d3/pilot/T70B/touched-2/04.png). It then diverged as the fix intends: the
Undo button is no longer "Undo deleting a filter condition"; it is "Undo changing the conditions on
Layer 1" (tooltip, tmp/design-studio/tier5/r1d3/pilot/T70B/touched-2/07.png). The cancelled card
left no undo step.

- Ctrl+Z then undoes the layer's last condition edit: Which nodes reads "installed", 11 of 11, notice
  "Undid changing the conditions on Layer 1."; Filters stays empty and no card comes back
  (tmp/design-studio/tier5/r1d3/pilot/T70B/touched-2/08.png). That is the step before the
  cancelled card, as a person expects.
- Ctrl+Shift+Z redoes it: "installed before 2000", 3 of 11, notice "Redid changing the conditions on
  Layer 1." (tmp/design-studio/tier5/r1d3/pilot/T70B/touched-2/09.png). The end-state records hold
  no filter card.

## touched-4 (keyboard: Quick actions card, Cancel, announcements)

Started `--keys --sr`; replay matched 34 of 40 steps (Control+K, "filter", Enter, `telemetry`,
Enter, Space, the Shift+Tab order through the workspace, Tab to Cancel). It diverged at Enter on
Cancel as the fix intends: focus on "Add filter", heard only "Filter not added"; the extra "Filter
off" for a card that never existed is gone
(tmp/design-studio/tier5/r1d3/pilot/T70B/touched-4/36.png).

Carried on by hand with the rest of the earlier route, every line as before:

- Control+K, "filter", Enter, then Escape on the empty picker: focus on "Add filter", heard "Filter
  not added". As decided.
- Control+K, "filter", Enter, `telemetry`, Enter, Space: checkbox "yes, 7 nodes" checked, heard
  "7 of 11 nodes". Escape goes to treeitem "telemetry yes, 7 of 11 nodes"; Escape again: heard
  "Done, 7 of 11" ("Esc is Done", as decided). One card, telemetry yes, top bar "7 of 11 nodes, 3 of
  13 edges" (tmp/design-studio/tier5/r1d3/pilot/T70B/touched-4/41.png).
- Focus never fell to the page body on this route.

## Mismatches with the answer key

None. The success path takes the key's 15 steps and the screens read as the key says on this build.
