# T77 A pilot, dry run 2 (targeted re-pilot)

Build 47c95a09fc (`.study-builds/tier5-r1d2-47c95a09fc`), start `setup:volunteers-thanks.txt`
(the volunteers project: filter card "trained Yes / hours min 10", layer Staff "role staff" in
E4572E). Walks under the main checkout's `tmp/design-studio/tier5/r1d2/pilot/T77A/`.

This pass walks only the pointer success path and the routes the fix pass touched that belong to
this task: the T77 A success path (the same walk as `success`) and the keyboard route "a new
card from Quick actions, then Cancel and Escape" (`touched-8`). The other routes in the touched
list belong to other tasks and datasets.

## Routes walked

### success (pointer)

Replayed from the previous pass's success walk; all 11 steps matched the screen.

- Data; the card's row "trained Yes"; the row "hours min 10"; double-click the "hours from" box,
  type 20, Enter; Done (`success/06.png`): one filter card, "trained Yes 10 of 24", outline
  "trained Yes / hours min 20"; top bar "10 of 24 nodes, 13 of 63 edges".
- Graph; the Staff layer's row "role staff"; Or...; hours; type 30, Enter; Done
  (`success/12.png`): Which nodes "6 of 10", A role staff 4, or B hours min 30 6; Staff row 6;
  six nodes drawn orange.
- Counts match the answer key: 10 in the picture, 6 in orange. The data stays the volunteers
  project throughout; one filter card the whole way.

### touched-8: new card from Quick actions, then Escape and Cancel (keyboard only)

- Ctrl+K, type "filter": the palette lists "Filters" (`touched-8/02.png`). Enter opens a new
  card "New filter -- Filters 24 of 24" in the workspace with its value picker open
  (`touched-8/03.png`).
- Escape on the empty value picker: the new card is taken away, the sidebar holds only "trained
  Yes 14 of 24", the top bar keeps "14 of 24 nodes", focus on the Filters section's add button
  (`touched-8/04.png`). This is the decided behavior (Escape in a new card's picker takes the
  card back; focus goes to Add filter when the opener is gone).
- Again Ctrl+K, filter, Enter (`touched-8/05.png`); Shift+Tab closes the picker and walks back
  through the table header to the workspace header's Table (`touched-8/06.png` to `14.png`); Tab,
  Tab to Cancel (`touched-8/15.png`); Enter: the new card is gone, only "trained Yes 14 of 24"
  remains, the top bar "14 of 24 nodes", focus on the Filters add button (`touched-8/16.png`).
- The fix holds: neither Cancel nor Escape leaves an empty "a selection" card behind or a filter
  mark on the top bar.

## Mismatches with the answer key

None.

## Defects that can spoil the task or its grade

None seen on these routes.
