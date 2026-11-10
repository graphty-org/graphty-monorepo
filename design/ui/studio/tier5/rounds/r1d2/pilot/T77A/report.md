# T77 A pilot, dry run 2 (targeted re-pilot)

Build d3fda9f2b6 (`.study-builds/tier5-r1d2-d3fda9f2b6`), start `setup:volunteers-thanks.txt`
(the volunteers project: filter card "trained Yes / hours min 10", layer Staff "role staff" in
E4572E). Walks under the main checkout's `tmp/design-studio/tier5/r1d2/pilot/T77A/`; the walks
of the earlier build 47c95a09fc in that folder were moved to `success-old-47c95a09fc` and
`touched-8-old-47c95a09fc`.

This pass walks only the pointer success path and the routes the fix pass touched that belong to
this task: "T77 A detour: new card, Cancel, Undo" (`touched-1`), "T77 A success path (own steps
still undo)" (`touched-3`) and "every setup start" (`touched-8`: the T77 A start in every walk
here, and the study tool's own check of setup starts). The other routes in the touched list
belong to other tasks and datasets. No detour or keyboard walk was asked for in this pass.

## Routes walked

### success (pointer)

Replayed from the previous pass's success walk; all 11 steps matched the screen.

- Start (`success/01.png`): 14 of 24 nodes, Staff 4 of 14 in orange, Undo drawn off.
- Data; the card's row "trained Yes"; the row "hours min 10"; double-click the "hours from" box,
  type 20, Enter; Done (`success/06.png`): one filter card, "trained Yes 10 of 24", outline
  "trained Yes / hours min 20"; top bar "10 of 24 nodes, 13 of 63 edges".
- Graph; the Staff layer's row "role staff"; Or...; hours; type 30, Enter; Done
  (`success/12.png`): Which nodes "6 of 10", A role staff 4, or B hours min 30 6; Staff row 6;
  canvas key "6 of 10 nodes"; six drawn nodes in orange.
- Counts match the answer key: 10 in the picture, 6 in orange. The data stays the volunteers
  project throughout; one filter card the whole way.

### touched-1: new card, Cancel, then Undo

- Replayed the earlier walk of this route: Data, Add filter, role, staff, Cancel; again Add
  filter, role, staff, Cancel (`touched-1/07.png`): the new card is gone both times, the sidebar
  holds only "trained Yes 14 of 24", top bar 14 of 24, Staff 4 of 14.
- The replay stopped where the build was fixed: the Undo button reads "Undo" with the tooltip
  "Nothing to undo" (`touched-1/08.png`); on the earlier build it offered "Undo changing node color
  on Staff" and took the colleague's orange away.
- A click on Undo and then Ctrl+Z (`touched-1/09.png`, `10.png`): nothing changes; the orange on
  Staff stays (4 of 14), the filter card stays. Redo reads "Nothing to redo" (`touched-1/11.png`):
  the cancelled card never comes back.
- Carried on to the task's end from there (`touched-1/12.png`, `13.png`): 10 of 24, Which nodes 6
  of 10, the same answer as the success path.

### touched-3: the success path, then Undo of the person's own steps

- Replayed the success path (all 11 steps matched), then Ctrl+Z one press at a time.
- First press: "Undid changing the conditions on Staff." (`touched-3/13.png`): B loses its 30, 4 of
  10. Second and third: the B step's attribute, then the Or group, go (`14.png`, `15.png`): Staff
  "role staff" 4 of 10. Fourth: "Undid editing the filter "trained Yes, hours 20 or more"."
  (`16.png`): 14 of 24, Staff 4 of 14, Undo now "Nothing to undo".
- A fifth press changes nothing (`18.png`): the colleague's filter card and the orange on Staff
  stay as the project started.
- Ctrl+Shift+Z four times brings every step back (`19.png`): 10 of 24, 6 of 10.

### touched-8: every setup start

- Each walk above starts on the T77 A setup with Undo drawn off and its tooltip "Nothing to undo"
  (`success/01.png`, `touched-1/01.png`, `touched-3/01.png`, `touched-1/08.png`).
- The study tool's own check of setup starts (`real.mjs --prove`, log
  `tmp/design-studio/tier5/r1d2/pilot/T77A/touched-8-prove.log`) on this build: a setup start runs
  its steps before 01.png, leaves no control lit, leaves Undo disabled with "Nothing to undo", lists
  the setup's work at the start; a setup step that misses and a setup click on a control that never
  becomes clickable both fail the start loudly. Every one of its 99 checks passed ("every check
  passed", exit 0).

## Mismatches with the answer key

None.

## Defects that can spoil the task or its grade

None seen on these routes.
